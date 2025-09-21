# app_improved.py
"""
Improved AI CRM ML Engine with large-dataset support and performance optimizations.

Key improvements:
- MiniBatchKMeans for scalable clustering
- XGBoost (if available) for churn prediction, otherwise RandomForest with n_jobs=-1
- Sample-based silhouette selection & stratified sampling for training
- Batch scoring/prediction to avoid Python loops
- Joblib persistence of models
- Option to dispatch very large runs to BackgroundTasks (async job queue)
- Robust handling of single-class targets and fallback heuristics
"""

from fastapi import FastAPI, HTTPException, UploadFile, File, BackgroundTasks
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from contextlib import asynccontextmanager
import pandas as pd
import numpy as np
import logging
from datetime import datetime
import io
import os
import math
import time

# Logging
logger = logging.getLogger("ai-crm")
logging.basicConfig(level=logging.INFO)

# ML imports: prefer xgboost, then sklearn. Provide graceful fallbacks.
USE_XGBOOST = False
try:
    import xgboost as xgb
    USE_XGBOOST = True
    logger.info("xgboost available: using XGBoost for churn model")
except Exception:
    logger.info("xgboost not available; will use sklearn RandomForest if present")

SKLEARN_AVAILABLE = False
try:
    # clustering
    from sklearn.cluster import MiniBatchKMeans, KMeans
    from sklearn.ensemble import RandomForestClassifier
    from sklearn.preprocessing import StandardScaler
    from sklearn.metrics import silhouette_score, roc_auc_score
    from sklearn.model_selection import train_test_split
    SKLEARN_AVAILABLE = True
    logger.info("scikit-learn imported successfully")
except Exception as e:
    logger.warning(f"scikit-learn not available or partially available: {e}")
    # Some fallback minimal implementations could be provided but heavy ML requires sklearn/xgboost.
    SKLEARN_AVAILABLE = False

# joblib for persistence
try:
    import joblib
    JOBLIB_AVAILABLE = True
except Exception:
    import pickle as joblib
    JOBLIB_AVAILABLE = False
    logger.warning("joblib not available, using pickle fallback for persistence")

# FastAPI app lifecycle
@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting AI CRM ML Engine (improved) ...")
    load_models()
    yield
    logger.info("Shutting down - saving models ...")
    save_models()

app = FastAPI(title="AI CRM ML Engine (Improved)", version="2.0.0", lifespan=lifespan)

# model cache
_model_cache = {"scaler": None, "kmeans": None, "churn_model": None, "last_trained_at": None}

# persistence dir
MODEL_DIR = "./models"
os.makedirs(MODEL_DIR, exist_ok=True)

# configuration tunables (env or defaults)
MAX_CUSTOMERS_IN_CONTEXT = int(os.getenv("MAX_CUSTOMERS_IN_CONTEXT", "5000"))   # sample for clustering/prompt
TRAIN_SAMPLE_SIZE = int(os.getenv("TRAIN_SAMPLE_SIZE", "10000"))              # max rows used to train model
SILHOUETTE_SAMPLE = int(os.getenv("SILHOUETTE_SAMPLE", "2000"))              # sample for silhouette selection
RANDOM_STATE = int(os.getenv("RANDOM_STATE", "42"))
N_THREADS = int(os.getenv("N_THREADS", "0"))  # 0 -> let xgboost decide, -1 also accepted by sklearn as all cores

# ---- Pydantic request/response models ----
class CustomerDataIn(BaseModel):
    customer_id: str
    company_name: str
    industry: Optional[str] = "Unknown"
    total_spent: float
    engagement_score: float
    last_interaction_date: Optional[str] = None  # ISO date
    purchase_frequency: int = 0
    days_since_last_purchase: Optional[int] = None

class ProcessRequest(BaseModel):
    user_id: str
    customers: List[CustomerDataIn]

class MLResponse(BaseModel):
    success: bool
    message: str
    data: Optional[Dict[str, Any]] = None

# ---------------- Utilities / feature engineering ----------------
def parse_and_fill_dates(df: pd.DataFrame) -> pd.DataFrame:
    today = pd.Timestamp.now().normalize()
    if "last_interaction_date" in df.columns:
        df["last_interaction_date"] = pd.to_datetime(df["last_interaction_date"], errors="coerce")
    else:
        df["last_interaction_date"] = pd.NaT

    if "days_since_last_purchase" not in df.columns or df["days_since_last_purchase"].isnull().any():
        df["days_since_last_purchase"] = (today - df["last_interaction_date"]).dt.days.fillna(999).astype(int)
    else:
        df["days_since_last_purchase"] = df["days_since_last_purchase"].fillna(999).astype(int)
    return df

def create_advanced_features(df: pd.DataFrame) -> pd.DataFrame:
    # vectorized feature engineering, minimal copies
    df = parse_and_fill_dates(df)
    df["recency"] = df["days_since_last_purchase"].astype(int)
    df["frequency"] = df.get("purchase_frequency", 0).fillna(0).astype(int)
    df["monetary"] = df["total_spent"].fillna(0.0).astype(float)
    df["engagement_score"] = df["engagement_score"].fillna(0).astype(float)
    df["engagement_normalized"] = df["engagement_score"] / 100.0
    df["high_engagement"] = (df["engagement_score"] > 80).astype(int)
    df["low_engagement"] = (df["engagement_score"] < 40).astype(int)
    df["months_since_last_purchase"] = df["days_since_last_purchase"] / 30.0
    df["recent_activity"] = (df["days_since_last_purchase"] < 90).astype(int)
    # value score normalized
    min_v = df["total_spent"].min()
    max_v = df["total_spent"].max()
    if pd.isna(min_v) or pd.isna(max_v) or max_v == min_v:
        df["value_score"] = 0.0
    else:
        df["value_score"] = (df["total_spent"] - min_v) / (max_v - min_v)
    df["industry_encoded"] = pd.Categorical(df["industry"].fillna("Unknown")).codes
    return df

# ---------------- Segmentation (scalable) ----------------
def choose_k_sampled(X: np.ndarray, k_min: int = 2, k_max: int = 8, sample_limit: int = SILHOUETTE_SAMPLE) -> int:
    # sample X for silhouette selection to keep fast
    n = X.shape[0]
    if n <= k_min:
        return 1
    idx = np.random.RandomState(RANDOM_STATE).choice(n, size=min(n, sample_limit), replace=False)
    Xs = X[idx]
    best_k = max(2, k_min)
    best_score = -1.0
    for k in range(k_min, min(k_max, len(Xs)-1) + 1):
        try:
            km = MiniBatchKMeans(n_clusters=k, random_state=RANDOM_STATE, batch_size=256)
            labels = km.fit_predict(Xs)
            if len(set(labels)) < 2:
                continue
            score = silhouette_score(Xs, labels)
            if score > best_score:
                best_score = score
                best_k = k
        except Exception:
            continue
    logger.info(f"choose_k_sampled: chosen k={best_k} silhouette={best_score:.4f}")
    return best_k

def perform_customer_segmentation_large(df: pd.DataFrame, force_rule_based: bool = False) -> List[Dict[str, Any]]:
    logger.info("Performing scalable customer segmentation...")
    features = ["recency", "frequency", "monetary", "engagement_normalized", "value_score"]
    X = df[features].fillna(0.0).values
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    _model_cache["scaler"] = scaler

    # small data fallback
    if len(df) < 50 or force_rule_based or not SKLEARN_AVAILABLE:
        # rule-based segmentation
        df["segment"] = df.apply(get_rule_based_segment, axis=1)
        logger.info("Used rule-based segmentation due to small dataset or missing sklearn")
    else:
        # choose k with sampled silhouette
        k = choose_k_sampled(X_scaled, k_min=2, k_max=min(10, len(df)-1))
        # Use MiniBatchKMeans for speed & memory
        mbk = MiniBatchKMeans(n_clusters=k, random_state=RANDOM_STATE, batch_size=1024)
        labels = mbk.fit_predict(X_scaled)
        df["segment"] = labels
        _model_cache["kmeans"] = mbk
        logger.info(f"MiniBatchKMeans fitted: n_clusters={k}")

    # build summaries
    segments = []
    for seg_id in sorted(df["segment"].unique()):
        seg_df = df[df["segment"] == seg_id]
        name = get_segment_name(seg_id, seg_df)
        segments.append({
            "name": name,
            "count": int(len(seg_df)),
            "revenue": float(seg_df["total_spent"].sum()),
            "avgEngagement": float(seg_df["engagement_score"].mean()) if len(seg_df) else 0.0,
            "avgValue": float(seg_df["total_spent"].mean()) if len(seg_df) else 0.0,
            "customers": seg_df["customer_id"].tolist()
        })
    logger.info(f"Segmentation complete: {len(segments)} segments")
    return segments

# ---------------- Churn modeling (scalable & accurate) ----------------
def build_churn_model_scaled(X_train: pd.DataFrame, y_train: pd.Series):
    # Prefer XGBoost for speed & accuracy when available
    if USE_XGBOOST:
        params = {"objective":"binary:logistic", "eval_metric":"auc", "seed":RANDOM_STATE, "nthread": N_THREADS or None}
        dtrain = xgb.DMatrix(X_train, label=y_train)
        num_round = 200
        model = xgb.train(params, dtrain, num_boost_round=num_round)
        logger.info("Trained XGBoost churn model")
        return ("xgboost", model)
    else:
        # sklearn RandomForest with parallel jobs
        rf = RandomForestClassifier(n_estimators=300, random_state=RANDOM_STATE, max_depth=12, n_jobs=-1, class_weight="balanced")
        rf.fit(X_train, y_train)
        logger.info("Trained RandomForest churn model")
        return ("sklearn", rf)

def predict_churn_model(model_tuple, X):
    typ, model = model_tuple
    if typ == "xgboost":
        dmat = xgb.DMatrix(X)
        preds = model.predict(dmat)
        # preds are probabilities for binary:logistic
        return np.clip(preds, 0.0, 1.0)
    else:
        proba = model.predict_proba(X)
        # class 1 is churn prob
        if proba.shape[1] == 2:
            return proba[:,1]
        else:
            # fallback
            return np.zeros(X.shape[0])

def perform_churn_prediction_large(df: pd.DataFrame) -> List[Dict[str, Any]]:
    logger.info("Performing churn modeling (scalable)...")
    # Create a churn risk heuristic to generate labels (weak supervision)
    churn_score = (
        (df["days_since_last_purchase"] > 180).astype(int) * 0.4 +
        (df["engagement_score"] < 30).astype(int) * 0.3 +
        (df["purchase_frequency"] == 0).astype(int) * 0.2 +
        (df["total_spent"] < df["total_spent"].quantile(0.3)).astype(int) * 0.1
    )
    churn_threshold = churn_score.quantile(0.7)
    df["churn_label"] = (churn_score >= churn_threshold).astype(int)
    # ensure variety
    if df["churn_label"].sum() == 0:
        idx = churn_score.nlargest(max(1, len(df)//20)).index
        df.loc[idx, "churn_label"] = 1
    if df["churn_label"].sum() == len(df):
        idx = churn_score.nsmallest(max(1, len(df)//20)).index
        df.loc[idx, "churn_label"] = 0

    features = ["recency","frequency","monetary","engagement_normalized","high_engagement","low_engagement","recent_activity","value_score"]
    X = df[features].fillna(0.0)
    y = df["churn_label"]

    # If dataset is very large, sample for training to speed up
    n = len(df)
    if n > TRAIN_SAMPLE_SIZE:
        # stratified sample to preserve churn ratio
        logger.info(f"Large dataset ({n} rows): sampling {TRAIN_SAMPLE_SIZE} rows for training")
        try:
            X_train, X_rest, y_train, y_rest = train_test_split(X, y, train_size=TRAIN_SAMPLE_SIZE, stratify=y, random_state=RANDOM_STATE)
        except Exception:
            # fallback random sample
            idx = np.random.RandomState(RANDOM_STATE).choice(n, size=TRAIN_SAMPLE_SIZE, replace=False)
            X_train = X.iloc[idx]
            y_train = y.iloc[idx]
    else:
        X_train = X
        y_train = y

    # Build model
    model_tuple = build_churn_model_scaled(X_train, y_train)
    _model_cache["churn_model"] = model_tuple
    _model_cache["last_trained_at"] = datetime.utcnow().isoformat()

    # Predict in batches across full dataset to avoid memory spike
    batch_size = 50000
    probs = np.zeros(n, dtype=float)
    for start in range(0, n, batch_size):
        end = min(start + batch_size, n)
        X_batch = X.iloc[start:end]
        probs[start:end] = predict_churn_model(model_tuple, X_batch)

    df["churn_probability"] = probs

    # prepare output objects
    out = []
    for _, row in df.iterrows():
        prob = float(row["churn_probability"])
        out.append({
            "customer_id": row["customer_id"],
            "company_name": row["company_name"],
            "churn_probability": prob,
            "risk_level": get_risk_level(prob),
            "key_factors": get_key_factors(row, {}),  # feature importance optional
            "recommended_action": get_churn_action(prob)
        })
    logger.info("Churn modeling complete")
    return out

# ---------------- Upsell detection (vectorized) ----------------
def detect_upsell_opportunities_large(df: pd.DataFrame) -> List[Dict[str, Any]]:
    logger.info("Detecting upsell opportunities (vectorized)...")
    df["upsell_score"] = (
        (df["engagement_score"]/100.0)*0.3 + df["value_score"]*0.4 + df["recent_activity"]*0.2 + (1 - df["days_since_last_purchase"].clip(0,365)/365.0)*0.1
    )
    high_pot = df[df["upsell_score"] > 0.6].sort_values("upsell_score", ascending=False)
    out = []
    for _, row in high_pot.iterrows():
        out.append({
            "customer_id": row["customer_id"],
            "company_name": row["company_name"],
            "upsell_score": float(row["upsell_score"]),
            "current_value": float(row["total_spent"]),
            "potential_value": float(row["total_spent"] * 1.5),
            "recommended_products": get_recommended_products(row),
            "confidence": get_upsell_confidence(row["upsell_score"])
        })
    logger.info(f"Found {len(out)} upsell opportunities")
    return out

# ---------------- Helper functions (unchanged but efficient) ----------------
def get_segment_name(segment_id: int, segment_data: pd.DataFrame) -> str:
    if segment_data.empty:
        return f"Segment {segment_id}"
    avg_value = segment_data["total_spent"].mean()
    avg_engagement = segment_data["engagement_score"].mean()
    if avg_value > segment_data["total_spent"].quantile(0.7) and avg_engagement > 80:
        return "High Value Champions"
    if avg_value > segment_data["total_spent"].quantile(0.5) and avg_engagement > 60:
        return "Loyal Customers"
    if avg_engagement < 40 or segment_data["days_since_last_purchase"].mean() > 180:
        return "At Risk"
    return "Growth Potential"

def get_rule_based_segment(row: pd.Series) -> int:
    avg_value = row.get("total_spent", 0)
    avg_engagement = row.get("engagement_score", 0)
    days_since = int(row.get("days_since_last_purchase", 999))
    if avg_value > 150000 and avg_engagement > 80:
        return 0
    if avg_value > 75000 and avg_engagement > 60:
        return 1
    if avg_engagement < 40 or days_since > 180:
        return 2
    return 3

def get_rule_based_churn_prob(row: pd.Series) -> float:
    days_since = int(row.get("days_since_last_purchase", 999))
    engagement = float(row.get("engagement_score", 0))
    frequency = int(row.get("purchase_frequency", 0))
    prob = 0.1
    if days_since > 180: prob += 0.4
    elif days_since > 90: prob += 0.2
    if engagement < 30: prob += 0.3
    elif engagement < 50: prob += 0.15
    if frequency == 0: prob += 0.2
    elif frequency < 3: prob += 0.1
    return min(prob, 0.95)

def get_risk_level(probability: float) -> str:
    if probability >= 0.7: return "High Risk"
    if probability >= 0.4: return "Medium Risk"
    return "Low Risk"

def get_key_factors(row: pd.Series, feature_importance: Dict[str, float]) -> List[str]:
    factors = []
    if row["days_since_last_purchase"] > 180: factors.append("No recent activity")
    if row["engagement_score"] < 40: factors.append("Low engagement")
    if row["purchase_frequency"] == 0: factors.append("No purchase history")
    return factors[:3]

def get_churn_action(probability: float) -> str:
    if probability >= 0.7: return "Immediate intervention required - schedule call with account manager"
    if probability >= 0.4: return "Send re-engagement campaign and follow up"
    return "Monitor and maintain regular contact"

def get_recommended_products(row: pd.Series) -> List[str]:
    if row["total_spent"] > 100000: return ["Enterprise Plan","Premium Support","Advanced Analytics"]
    if row["total_spent"] > 50000: return ["Professional Plan","Priority Support","Custom Integration"]
    return ["Standard Plan","Basic Support","Training Package"]

def get_upsell_confidence(score: float) -> str:
    if score >= 0.8: return "High Confidence"
    if score >= 0.6: return "Medium Confidence"
    return "Low Confidence"

# ---------------- Insights ----------------
def generate_ai_insights(df: pd.DataFrame, segments: List[Dict[str, Any]], churn_predictions: List[Dict[str, Any]], upsell_opportunities: List[Dict[str, Any]]) -> Dict[str, Any]:
    total_customers = len(df)
    total_revenue = float(df["total_spent"].sum())
    avg_engagement = float(df["engagement_score"].mean())
    churn_rate = (len([p for p in churn_predictions if p["churn_probability"] > 0.5]) / total_customers * 100) if total_customers else 0.0
    potential_revenue = sum([u["potential_value"] - u["current_value"] for u in upsell_opportunities]) if upsell_opportunities else 0.0
    key_insights = [
        f"{len(segments)} distinct customer segments identified",
        f"{len([p for p in churn_predictions if p['churn_probability'] > 0.7])} high-risk customers need immediate attention",
        f"{len(upsell_opportunities)} upsell opportunities with potential revenue of ${potential_revenue:,.0f}",
        f"Average customer value: ${total_revenue/total_customers:,.0f}" if total_customers else "Average customer value: $0",
        f"Top performing segment: {max(segments, key=lambda x: x['revenue'])['name'] if segments else 'N/A'}"
    ]
    recommendations = [
        "Focus on high-risk customers to reduce churn",
        "Run targeted upsell campaigns for high potential customers",
        "Develop segment-specific engagement cadences"
    ]
    return {"summary": {"total_customers": total_customers, "total_revenue": total_revenue, "average_engagement": avg_engagement, "churn_rate": churn_rate, "upsell_opportunities": len(upsell_opportunities)}, "key_insights": key_insights, "recommendations": recommendations}

# ---------------- API endpoints ----------------

@app.get("/")
async def root():
    return {"message":"AI CRM ML Engine (Improved)", "status":"operational", "version": app.version}

@app.get("/health")
async def health_check():
    return {"status":"healthy", "sklearn_available": SKLEARN_AVAILABLE, "xgboost_available": USE_XGBOOST, "joblib_available": JOBLIB_AVAILABLE}

@app.post("/api/process-customers", response_model=MLResponse)
async def process_customers(request: ProcessRequest, background_tasks: BackgroundTasks):
    """
    Main processing endpoint. For extremely large datasets (e.g. > 200k rows) it's recommended to upload CSV and run as background job.
    This endpoint will attempt synchronous processing but switches to background dispatch for very large uploads to avoid timeouts.
    """
    try:
        user_id = request.user_id
        customers = [c.dict() for c in request.customers]
        n = len(customers)
        logger.info(f"Process request: user={user_id} rows={n}")

        df = pd.DataFrame(customers)
        if df.empty:
            return MLResponse(success=False, message="No customer rows supplied", data=None)

        # If very large, dispatch to background
        LARGE_THRESHOLD = int(os.getenv("LARGE_DATASET_THRESHOLD", "200000"))
        if n > LARGE_THRESHOLD:
            job_id = f"job_{int(time.time())}_{np.random.randint(1e6)}"
            # Persist file to temp and schedule background task
            tmp_path = f"/tmp/{job_id}.parquet"
            df.to_parquet(tmp_path)
            background_tasks.add_task(process_customers_background, tmp_path, user_id, job_id)
            logger.info(f"Dataset too large ({n}); dispatched to background job {job_id}")
            return MLResponse(success=True, message=f"Dispatched background job {job_id}", data={"job_id": job_id})

        # normal synchronous path
        df = create_advanced_features(df)
        segments = perform_customer_segmentation_large(df)
        churn_predictions = perform_churn_prediction_large(df)
        upsell_opportunities = detect_upsell_opportunities_large(df)
        insights = generate_ai_insights(df, segments, churn_predictions, upsell_opportunities)
        result = {"segments":segments, "churn_predictions": churn_predictions, "upsell_opportunities": upsell_opportunities, "insights": insights, "processed_count": len(df), "timestamp": datetime.utcnow().isoformat()}
        return MLResponse(success=True, message="Processed successfully", data=result)
    except Exception as e:
        logger.exception("Error in process_customers")
        raise HTTPException(status_code=500, detail=str(e))

# Background processing helper
def process_customers_background(parquet_path: str, user_id: str, job_id: str):
    """Background job: loads parquet, processes, and saves result to models/ or a results store."""
    try:
        logger.info(f"[BG] Starting background job {job_id} for user {user_id}")
        df = pd.read_parquet(parquet_path)
        df = create_advanced_features(df)
        segments = perform_customer_segmentation_large(df)
        churn_predictions = perform_churn_prediction_large(df)
        upsell_opportunities = detect_upsell_opportunities_large(df)
        insights = generate_ai_insights(df, segments, churn_predictions, upsell_opportunities)
        out_path = os.path.join(MODEL_DIR, f"{job_id}_results.json")
        import json
        with open(out_path, "w") as f:
            json.dump({"segments":segments, "churn_predictions":churn_predictions, "upsell_opportunities":upsell_opportunities, "insights":insights}, f)
        logger.info(f"[BG] Job {job_id} complete - results saved to {out_path}")
        # cleanup
        try:
            os.remove(parquet_path)
        except Exception:
            pass
    except Exception as e:
        logger.exception(f"[BG] Job {job_id} failed: {e}")

@app.post("/api/upload-csv", response_model=MLResponse)
async def upload_csv(file: UploadFile = File(...)):
    try:
        content = await file.read()
        df = pd.read_csv(io.BytesIO(content))
        df.columns = [c.lower() for c in df.columns]
        # mapping (same as before) - simplified for brevity
        mapping_candidates = {
            "customer_id": ["customerid","customer_id","id"],
            "company_name": ["companyname","company_name","company"],
            "industry": ["industry"],
            "total_spent": ["total_spent","purchasehistory","revenue","totalspent"],
            "engagement_score": ["engagementscore","engagement_score","engagement"],
            "last_interaction_date": ["lastinteractiondate","last_interaction_date","last_interaction"],
            "purchase_frequency": ["purchasefrequency","purchase_frequency","frequency"],
            "days_since_last_purchase": ["days_since_last_purchase","dayssincelastpurchase","days_since_last"]
        }
        col_map = {}
        for tgt,cands in mapping_candidates.items():
            for c in cands:
                if c in df.columns:
                    col_map[c] = tgt
                    break
        df = df.rename(columns=col_map)
        required = ["customer_id","company_name","total_spent","engagement_score"]
        for r in required:
            if r not in df.columns:
                raise HTTPException(status_code=400, detail=f"Missing required column: {r}")
        if "industry" not in df.columns:
            df["industry"] = "Unknown"
        if "purchase_frequency" not in df.columns:
            df["purchase_frequency"] = 0
        df = create_advanced_features(df)
        # For large CSVs prefer background; reuse process_customers logic
        n = len(df)
        if n > 200000:
            job_id = f"job_{int(time.time())}_{np.random.randint(1e6)}"
            tmp_path = f"/tmp/{job_id}.parquet"
            df.to_parquet(tmp_path)
            # trigger background processing via process_customers_background (here synchronous since no BackgroundTasks)
            process_customers_background(tmp_path, "csv_upload", job_id)
            return MLResponse(success=True, message=f"Large CSV dispatched as background job {job_id}", data={"job_id":job_id})
        # Synchronous
        segments = perform_customer_segmentation_large(df)
        churn_predictions = perform_churn_prediction_large(df)
        upsell_opportunities = detect_upsell_opportunities_large(df)
        insights = generate_ai_insights(df, segments, churn_predictions, upsell_opportunities)
        result = {"segments":segments, "churn_predictions": churn_predictions, "upsell_opportunities":upsell_opportunities, "insights":insights, "processed_count": n, "timestamp": datetime.utcnow().isoformat()}
        return MLResponse(success=True, message="CSV processed successfully", data=result)
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("upload_csv error")
        raise HTTPException(status_code=500, detail=str(e))

# ---------------- persistence ----------------
def save_models():
    try:
        if _model_cache.get("scaler") is not None:
            joblib.dump(_model_cache["scaler"], os.path.join(MODEL_DIR, "scaler.joblib"))
        if _model_cache.get("kmeans") is not None:
            joblib.dump(_model_cache["kmeans"], os.path.join(MODEL_DIR, "kmeans.joblib"))
        if _model_cache.get("churn_model") is not None:
            joblib.dump(_model_cache["churn_model"], os.path.join(MODEL_DIR, "churn_model.joblib"))
        logger.info("Models saved")
    except Exception:
        logger.exception("Failed to save models")

def load_models():
    try:
        s = os.path.join(MODEL_DIR, "scaler.joblib")
        k = os.path.join(MODEL_DIR, "kmeans.joblib")
        c = os.path.join(MODEL_DIR, "churn_model.joblib")
        if os.path.exists(s): _model_cache["scaler"] = joblib.load(s)
        if os.path.exists(k): _model_cache["kmeans"] = joblib.load(k)
        if os.path.exists(c): _model_cache["churn_model"] = joblib.load(c)
        logger.info("Models loaded if present")
    except Exception:
        logger.exception("Failed to load models")

# ---------------- debug/test endpoints ----------------
@app.post("/api/test")
async def test_endpoint(request: dict):
    logger.info(f"Test endpoint received: {request}")
    return {"status":"success","received": request}

@app.get("/api/analytics")
async def get_analytics():
    return {"status":"success","sklearn_available": SKLEARN_AVAILABLE, "xgboost_available": USE_XGBOOST}

# ---- Run with uvicorn as before ----
if __name__ == "__main__":
    try:
        import uvicorn
        uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=False)
    except ImportError as e:
        logger.error(f"uvicorn import failed: {e}")
        logger.info("Trying alternative server startup...")
        try:
            # Fallback: try to run the app directly
            import asyncio
            from fastapi import FastAPI
            
            async def run_server():
                import uvicorn
                config = uvicorn.Config(app, host="0.0.0.0", port=8000, log_level="info")
                server = uvicorn.Server(config)
                await server.serve()
            
            asyncio.run(run_server())
        except Exception as fallback_error:
            logger.error(f"Fallback server startup failed: {fallback_error}")
            logger.info("Starting basic HTTP server...")
            
            # Last resort: basic HTTP server
            from http.server import HTTPServer, BaseHTTPRequestHandler
            import json
            
            class MLHandler(BaseHTTPRequestHandler):
                def do_GET(self):
                    if self.path == "/health":
                        self.send_response(200)
                        self.send_header('Content-type', 'application/json')
                        self.end_headers()
                        response = {"status": "healthy", "sklearn_available": SKLEARN_AVAILABLE, "xgboost_available": USE_XGBOOST}
                        self.wfile.write(json.dumps(response).encode())
                    else:
                        self.send_response(404)
                        self.end_headers()
                
                def do_POST(self):
                    if self.path == "/api/process-customers":
                        self.send_response(200)
                        self.send_header('Content-type', 'application/json')
                        self.end_headers()
                        response = {"success": True, "message": "Basic server running - limited functionality"}
                        self.wfile.write(json.dumps(response).encode())
                    else:
                        self.send_response(404)
                        self.end_headers()
            
            server = HTTPServer(('0.0.0.0', 8000), MLHandler)
            logger.info("Starting basic HTTP server on port 8000...")
            server.serve_forever()
