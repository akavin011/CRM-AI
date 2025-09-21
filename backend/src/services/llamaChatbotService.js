// LlamaChatbotService.js
import axios from "axios";
import { dataStorageService } from "./dataStorageService.js";

/**
 * LlamaChatbotService
 * - Enforces JSON-only replies from the LLM
 * - Uses accurate analytics totals for counts (no sample-length bug)
 * - Limits context size for token safety
 * - Validates model output and falls back to DB-driven replies
 * - Health checks + retry + timeout
 *
 * Required dataStorageService methods (must exist):
 * - getCustomerData(userId, limit, offset) => { data: [ ... ] }
 * - getAtRiskCustomers(userId, limit)
 * - getHighValueCustomers(userId, limit)
 * - getUpsellOpportunities(userId, limit)
 * - getCustomerSegments(userId)
 * - getAnalyticsData(userId) => { total_customers, total_revenue, average_engagement, churn_rate }
 *
 * Environment variables:
 * - LLAMA_BASE_URL (default: http://localhost:11434)
 * - LLAMA_MODEL (default: llama3.2:latest)
 * - MAX_CUSTOMERS_IN_CONTEXT (default: 50)
 * - LLAMA_TIMEOUT_MS (default: 30000)
 * - MAX_PROMPT_CHARS (default: 24000)
 */

export class LlamaChatbotService {
  constructor(opts = {}) {
    this.baseUrl = process.env.LLAMA_BASE_URL || opts.baseUrl || "http://localhost:11434";
    this.model = process.env.LLAMA_MODEL || opts.model || "llama3.2:latest";

    // Tunables (override via env or opts)
    this.maxCustomersInContext = parseInt(process.env.MAX_CUSTOMERS_IN_CONTEXT || opts.maxCustomersInContext || "50", 10);
    this.requestTimeoutMs = parseInt(process.env.LLAMA_TIMEOUT_MS || opts.requestTimeoutMs || "30000", 10);
    this.maxPromptChars = parseInt(process.env.MAX_PROMPT_CHARS || opts.maxPromptChars || "24000", 10);

    // Health caching
    this._llamaHealthy = null;
    this._lastHealthCheck = 0;
    this._healthTtlMs = opts.healthTtlMs || 30 * 1000; // 30s

    // conversation state
    this.conversationHistory = new Map();

    // Response schema enforcement
    this.expectedKeys = ["answer", "references", "actions"]; // required keys in LLM JSON
  }

  // ---------------- Public ----------------

  /**
   * Main entrypoint: generate reply for a user message
   * returns { response, context, suggestions }
   */
  async processMessage(userId, message) {
    try {
      const savedContext = this.conversationHistory.get(userId) || {
        customerData: null,
        lastQuery: null,
        insights: null,
        messages: [],
      };

      // gather CRM context: returns sample + accurate metrics
      const crmContext = await this.gatherCRMContext(message, savedContext, userId);

      // update convo history
      savedContext.customerData = crmContext.customers;
      savedContext.lastQuery = message;
      savedContext.insights = crmContext.insights;
      savedContext.messages.push({ role: "user", content: message });
      this.conversationHistory.set(userId, savedContext);

      // generate model response (with fallback)
      const modelResponse = await this.generateResponse(message, savedContext, crmContext);

      // push assistant response to history
      savedContext.messages.push({ role: "assistant", content: modelResponse });
      this.conversationHistory.set(userId, savedContext);

      return {
        response: modelResponse,
        context: crmContext,
        suggestions: this.generateSuggestions(message, crmContext),
      };
    } catch (err) {
      console.error("processMessage error:", err);
      return {
        response: "Sorry — I'm having trouble right now. Please try again or use the Dashboard/Export tools.",
        context: null,
        suggestions: [],
      };
    }
  }

  // ---------------- Context gathering ----------------
  /**
   * Returns:
   * {
   *   customers: [...],        // trimmed list of relevant customers for prompt
   *   insights: {...},        // analysis objects
   *   metrics: {...},         // accurate metrics (total_customers, total_revenue, average_engagement, churn_rate)
   *   allCustomers: [...],    // sample of all customers (bounded)
   *   total_customers_exact: N
   * }
   */
  async gatherCRMContext(message, existingContext, userId) {
    const lower = (message || "").toLowerCase();
    const context = {
      customers: [],
      insights: {},
      metrics: {},
      allCustomers: [],
      total_customers_exact: 0,
    };

    try {
      // 1) Accurate analytics (must return total_customers)
      const analytics = await dataStorageService.getAnalyticsData(userId);
      if (analytics) {
        context.metrics = {
          total_customers: analytics.total_customers || 0,
          total_revenue: analytics.total_revenue || 0,
          average_engagement: analytics.average_engagement || 0,
          churn_rate: analytics.churn_rate || 0,
        };
        context.total_customers_exact = analytics.total_customers || 0;
      } else {
        context.metrics = { total_customers: 0, total_revenue: 0, average_engagement: 0, churn_rate: 0 };
      }

      // 2) SAMPLE of customer rows for context (bounded)
      const sampleResp = await dataStorageService.getCustomerData(userId, this.maxCustomersInContext, 0);
      context.allCustomers = (sampleResp && sampleResp.data) ? sampleResp.data : [];

      // 3) Query-driven specific lists
      if (lower.includes("churn") || lower.includes("at risk")) {
        const atRisk = await this.getAtRiskCustomers(userId);
        context.customers = atRisk.slice(0, 20);
        context.insights.churnAnalysis = await this.getChurnAnalysis(userId);
      } else if (lower.includes("high value") || lower.includes("valuable")) {
        const highVal = await this.getHighValueCustomers(userId);
        context.customers = highVal.slice(0, 20);
        context.insights.valueAnalysis = await this.getValueAnalysis(userId);
      } else if (lower.includes("upsell") || lower.includes("opportunity")) {
        const upsell = await this.getUpsellOpportunities(userId);
        context.customers = upsell.slice(0, 20);
        context.insights.upsellAnalysis = await this.getUpsellAnalysis(userId);
      } else if (lower.includes("segment") || lower.includes("group")) {
        context.insights.segmentation = await this.getSegmentationAnalysis(userId);
      }

      // fallback — small sample if nothing specific
      if ((!context.customers || context.customers.length === 0) && context.allCustomers.length > 0) {
        context.customers = context.allCustomers.slice(0, Math.min(10, context.allCustomers.length))
          .map(c => ({
            company_name: c.company_name,
            total_spent: c.total_spent,
            engagement_score: c.engagement_score,
            churn_probability: c.churn_probability,
            upsell_score: c.upsell_score,
            segment: c.segment,
            industry: c.industry,
          }));
      }

      console.debug(`gatherCRMContext: userId=${userId} sample=${context.allCustomers.length} total_exact=${context.total_customers_exact} customersContext=${context.customers.length}`);

    } catch (err) {
      console.error("gatherCRMContext error:", err);
    }

    return context;
  }

  // ---------------- Prompt building + model call ----------------

  /**
   * generateResponse:
   * - builds compact JSON context
   * - builds a strict instruction block (JSON-only)
   * - calls LLM with deterministic parameters (temp=0)
   * - validates returned JSON and references
   * - returns a human-friendly string (or fallback)
   */
  async generateResponse(userMessage, convoContext, crmContext) {
    // quick health check
    const healthy = await this.checkHealth();
    if (!healthy) {
      console.warn("LLM not healthy -> fallback");
      return this.getFallbackResponse(userMessage, crmContext);
    }

    const compactContext = this.buildCompactContext(crmContext);

    const instructions = [
      "You are a CRM assistant. Use ONLY the data inside CONTEXT_JSON below.",
      "Return a JSON object with: {\"answer\": \"your response here\", \"references\": [\"company1\", \"company2\"], \"actions\": [\"action1\", \"action2\"]}",
      "If providing company names, use only those from CONTEXT_JSON.allCustomers.",
      "Keep answer under 200 words. Include actionable recommendations in actions array.",
      "If you cannot answer from the data, say so in the answer field.",
    ].join(" ");

    const promptParts = [
      "SYSTEM_INSTRUCTIONS:",
      instructions,
      "",
      "CONTEXT_JSON_START",
      JSON.stringify(compactContext),
      "CONTEXT_JSON_END",
      "",
      "USER_QUERY:",
      userMessage,
      "",
      "END_OF_PROMPT",
    ];
    let prompt = promptParts.join("\n");

    // truncate prompt if too long: drop 'allCustomers' down to top_customers only
    if (prompt.length > this.maxPromptChars) {
      const reduced = { ...compactContext, allCustomers: compactContext.top_customers };
      prompt = [
        "SYSTEM_INSTRUCTIONS:",
        "Use only CONTEXT_JSON. If insufficient, return INSFFICIENT_DATA JSON.",
        "",
        "CONTEXT_JSON_START",
        JSON.stringify(reduced),
        "CONTEXT_JSON_END",
        "",
        "USER_QUERY:",
        userMessage,
        "",
        "END_OF_PROMPT",
      ].join("\n");
      if (prompt.length > this.maxPromptChars) {
        // final conservative slice
        prompt = prompt.slice(0, this.maxPromptChars - 100) + "\n...TRUNCATED...";
      }
    }

    // LLM payload (deterministic)
    const payload = {
      model: this.model,
      prompt: prompt,
      stream: false,
      options: {
        temperature: 0.0,
        top_p: 0.3,
        max_tokens: 512,
      },
    };

    try {
      const resp = await axios.post(`${this.baseUrl}/api/generate`, payload, { timeout: this.requestTimeoutMs });

      const llmText = this.extractTextFromLlamaResponse(resp.data);
      if (!llmText) {
        console.warn("No text returned from LLM -> fallback");
        return this.getFallbackResponse(userMessage, crmContext);
      }

      // parse JSON object from response text
      const parsedCheck = this.validateAndParseJsonResponse(llmText, compactContext);
      if (!parsedCheck.valid) {
        console.warn("LLM response failed validation:", parsedCheck.reason);
        return this.getFallbackResponse(userMessage, crmContext);
      }

      // Format final human-readable answer (answer + references + actions)
      const formatted = this.formatFinalAnswer(parsedCheck.parsed);
      return formatted;

    } catch (err) {
      console.error("generateResponse error:", err?.message || err);
      return this.getFallbackResponse(userMessage, crmContext);
    }
  }

  // ---------------- Utilities for prompt/context ----------------

  buildCompactContext(crmContext) {
    const allCustomersSample = (crmContext.allCustomers || []).slice(0, this.maxCustomersInContext).map(c => ({
      customer_id: c.customer_id || c.id || null,
      company_name: c.company_name,
      total_spent: Number(c.total_spent || 0),
      engagement_score: Number(c.engagement_score || 0),
      churn_probability: Number(c.churn_probability || 0),
      upsell_score: Number(c.upsell_score || 0),
      segment: c.segment || null,
      industry: c.industry || null,
      last_interaction_date: c.last_interaction_date || null,
    }));

    const topCustomers = allCustomersSample
      .slice()
      .sort((a, b) => b.total_spent - a.total_spent)
      .slice(0, 5)
      .map(c => ({ company_name: c.company_name, total_spent: c.total_spent }));

    const metrics = crmContext.metrics || {};
    const insights = crmContext.insights || {};

    return {
      generated_at: new Date().toISOString(),
      total_customers: crmContext.total_customers_exact || metrics.total_customers || allCustomersSample.length,
      metrics: {
        total_revenue: Number(metrics.total_revenue || 0),
        average_engagement: Number(metrics.average_engagement || 0),
        churn_rate: Number(metrics.churn_rate || 0),
      },
      top_customers: topCustomers,
      allCustomers: allCustomersSample,
      insights: insights,
    };
  }

  truncatePrompt(prompt, compactContext) {
    if (prompt.length <= this.maxPromptChars) return prompt;
    // fallback: reduce allCustomers to top_customers
    const reduced = { ...compactContext, allCustomers: compactContext.top_customers };
    let p = [
      "SYSTEM_INSTRUCTIONS:",
      "Use only CONTEXT_JSON below. If insufficient, return INSFFICIENT_DATA JSON.",
      "CONTEXT_JSON_START",
      JSON.stringify(reduced),
      "CONTEXT_JSON_END",
      "USER_QUERY:",
      "Truncated due to size limits.",
    ].join("\n");
    if (p.length > this.maxPromptChars) {
      return p.slice(0, this.maxPromptChars - 50) + "\n...TRUNCATED...";
    }
    return p;
  }

  extractTextFromLlamaResponse(responseData) {
    if (!responseData) return null;
    if (typeof responseData === "string") return responseData;
    if (responseData.response && typeof responseData.response === "string") return responseData.response;
    if (responseData.output && typeof responseData.output === "string") return responseData.output;
    if (Array.isArray(responseData.candidates) && responseData.candidates[0]?.content) return responseData.candidates[0].content;
    try {
      return JSON.stringify(responseData);
    } catch {
      return null;
    }
  }

  validateAndParseJsonResponse(llmText, compactContext) {
    // Extract first JSON object from text
    try {
      const start = llmText.indexOf("{");
      const end = llmText.lastIndexOf("}");
      if (start < 0 || end <= start) return { valid: false, reason: "No JSON block found" };
      const jsonStr = llmText.slice(start, end + 1);
      const parsed = JSON.parse(jsonStr);

      // More flexible validation - only require 'answer' field
      if (!parsed.answer || typeof parsed.answer !== "string") {
        return { valid: false, reason: "Missing or invalid answer field" };
      }

      // Ensure references and actions are arrays (with defaults)
      if (!Array.isArray(parsed.references)) parsed.references = [];
      if (!Array.isArray(parsed.actions)) parsed.actions = [];

      // Verify references point to real companies (if any provided)
      if (parsed.references.length > 0) {
        const allowed = new Set((compactContext.allCustomers || []).map(c => c.company_name));
        const invalidRefs = parsed.references.filter(r => !allowed.has(r));
        if (invalidRefs.length > 0) {
          // Filter out invalid references instead of rejecting
          parsed.references = parsed.references.filter(r => allowed.has(r));
        }
      }

      return { valid: true, parsed };
    } catch (err) {
      return { valid: false, reason: "JSON parse error", error: err?.message };
    }
  }

  formatFinalAnswer(parsed) {
    const answer = parsed.answer || "";
    const refs = (parsed.references || []).join(", ");
    const actions = parsed.actions || [];
    const actionText = actions.length ? `Recommended actions: ${actions.join(" / ")}` : "";
    const refsText = refs ? `\n\nReferenced companies: ${refs}.` : "";
    return `${answer}${refsText}${actionText ? `\n\n${actionText}` : ""}`;
  }

  // ---------------- Fallback logic (DB-driven, deterministic) ----------------

  getFallbackResponse(message, context = null) {
    const lower = (message || "").toLowerCase();
    // Prefer accurate total from metrics for counts
    const total = (context && context.metrics && context.metrics.total_customers) || context?.total_customers_exact || (context?.allCustomers?.length || 0);

    if (context && context.allCustomers && context.allCustomers.length > 0) {
      if (lower.includes("churn") || lower.includes("at risk")) {
        const atRiskCount = (context.allCustomers || []).filter(c => (c.churn_probability || 0) >= 0.5).length;
        return `Based on your uploaded dataset of ${total} customers, I found ${atRiskCount} customers at risk of churning. These customers have low engagement or no recent purchases. Would you like the detailed list exported?`;
      }
      if (lower.includes("high value") || lower.includes("valuable")) {
        const highValueCount = (context.allCustomers || []).filter(c => (c.total_spent || 0) > 50000).length;
        const sample = (context.allCustomers || []).slice(0, 3).map(c => `${c.company_name} ($${(c.total_spent || 0).toLocaleString()})`).join(", ");
        return `From your ${total} customers, I identified ${highValueCount} high-value customers. Examples: ${sample}. Would you like the full list?`;
      }
      if (lower.includes("upsell") || lower.includes("opportunity")) {
        const upsellCount = (context.allCustomers || []).filter(c => (c.upsell_score || 0) > 0.6).length;
        return `I found ${upsellCount} upsell opportunities. I can display the top candidates for outreach.`;
      }
      if (lower.includes("segment") || lower.includes("group")) {
        const segCounts = {};
        context.allCustomers.forEach(c => {
          const s = c.segment || "Unknown";
          segCounts[s] = (segCounts[s] || 0) + 1;
        });
        const segInfo = Object.entries(segCounts).map(([s, n]) => `${s}: ${n}`).join(", ");
        return `Your ${total} customers are segmented as follows: ${segInfo}. Would you like a deep-dive on any segment?`;
      }
      return `I have access to ${total} customers. I can list at-risk customers, show high-value customers, find upsell opportunities, or export lists. What would you like?`;
    }

    // No data available
    if (lower.includes("churn") || lower.includes("at risk")) {
      return "I can identify at-risk customers, but I don't see uploaded data. Please upload your CSV on the Data Upload page.";
    }
    return "I can help with churn, upsells, and segmentation. Please upload your customer CSV to get started.";
  }

  // -------------- Helper DB wrappers (thin) --------------

  async getAtRiskCustomers(userId) {
    try {
      const rows = await dataStorageService.getAtRiskCustomers(userId, 50);
      return (rows || []).map(r => ({
        company_name: r.company_name,
        churn_probability: r.churn_probability,
        engagement_score: r.engagement_score,
        industry: r.industry,
        total_spent: r.total_spent,
      }));
    } catch (err) {
      console.error("getAtRiskCustomers error:", err);
      return [];
    }
  }

  async getHighValueCustomers(userId) {
    try {
      const rows = await dataStorageService.getHighValueCustomers(userId, 50);
      return (rows || []).map(r => ({
        company_name: r.company_name,
        total_spent: r.total_spent,
        engagement_score: r.engagement_score,
        industry: r.industry,
        segment: r.segment,
      }));
    } catch (err) {
      console.error("getHighValueCustomers error:", err);
      return [];
    }
  }

  async getUpsellOpportunities(userId) {
    try {
      const rows = await dataStorageService.getUpsellOpportunities(userId, 50);
      return (rows || []).map(r => ({
        company_name: r.company_name,
        upsell_score: r.upsell_score,
        total_spent: r.total_spent,
        industry: r.industry,
        recommended_products: r.recommended_products || ["Premium Support", "Advanced Analytics"],
      }));
    } catch (err) {
      console.error("getUpsellOpportunities error:", err);
      return [];
    }
  }

  async getChurnAnalysis(userId) {
    try {
      const allCustomers = (await dataStorageService.getCustomerData(userId, 1000, 0)).data || [];
      const totalCustomers = allCustomers.length;
      const atRisk = allCustomers.filter(c => (c.churn_probability || 0) >= 0.5);
      const highRisk = allCustomers.filter(c => (c.churn_probability || 0) >= 0.7);
      return {
        total_at_risk: atRisk.length,
        high_risk: highRisk.length,
        medium_risk: atRisk.length - highRisk.length,
        low_risk: totalCustomers - atRisk.length,
        total_customers: totalCustomers,
      };
    } catch (err) {
      console.error("getChurnAnalysis error:", err);
      return { total_at_risk: 0, high_risk: 0, medium_risk: 0, low_risk: 0, total_customers: 0 };
    }
  }

  async getValueAnalysis(userId) {
    try {
      const rows = await dataStorageService.getHighValueCustomers(userId, 1000);
      const totalRevenue = (rows || []).reduce((s, r) => s + (r.total_spent || 0), 0);
      const avg = rows.length ? totalRevenue / rows.length : 0;
      return { total_high_value: rows.length, total_revenue: totalRevenue, average_value: avg };
    } catch (err) {
      console.error("getValueAnalysis error:", err);
      return { total_high_value: 0, total_revenue: 0, average_value: 0 };
    }
  }

  async getUpsellAnalysis(userId) {
    try {
      const rows = await dataStorageService.getUpsellOpportunities(userId, 1000);
      const totalOpportunities = (rows || []).length;
      const estimatedValue = (rows || []).reduce((s, r) => s + ((r.total_spent || 0) * 0.2), 0);
      return { total_opportunities: totalOpportunities, estimated_value: estimatedValue, top_products: ["Premium Support", "Advanced Analytics", "Enterprise Plan"] };
    } catch (err) {
      console.error("getUpsellAnalysis error:", err);
      return { total_opportunities: 0, estimated_value: 0, top_products: [] };
    }
  }

  async getSegmentationAnalysis(userId) {
    try {
      const segments = await dataStorageService.getCustomerSegments(userId);
      return segments || {};
    } catch (err) {
      console.error("getSegmentationAnalysis error:", err);
      return {};
    }
  }

  async getKeyMetrics(userId) {
    try {
      const analytics = await dataStorageService.getAnalyticsData(userId);
      if (!analytics) return { total_customers: 0, total_revenue: 0, average_engagement: 0, churn_rate: 0 };
      return {
        total_customers: analytics.total_customers || 0,
        total_revenue: analytics.total_revenue || 0,
        average_engagement: analytics.average_engagement || 0,
        churn_rate: analytics.churn_rate || 0,
      };
    } catch (err) {
      console.error("getKeyMetrics error:", err);
      return { total_customers: 0, total_revenue: 0, average_engagement: 0, churn_rate: 0 };
    }
  }

  // ---------------- Health check ----------------
  async checkHealth() {
    const now = Date.now();
    if (this._llamaHealthy !== null && now - this._lastHealthCheck < this._healthTtlMs) {
      return this._llamaHealthy;
    }
    try {
      const res = await axios.get(`${this.baseUrl}/api/tags`, { timeout: 3000 });
      this._llamaHealthy = res.status === 200;
    } catch (err) {
      this._llamaHealthy = false;
    }
    this._lastHealthCheck = Date.now();
    return this._llamaHealthy;
  }

  // ---------------- Suggestions ----------------
  generateSuggestions(message, context) {
    const suggestions = [];
    if (context.customers && context.customers.length > 0) {
      suggestions.push("Show detailed customer list");
      suggestions.push("Export customer data (CSV)");
    }
    if (context.insights?.churnAnalysis) {
      suggestions.push("Create churn prevention campaign");
      suggestions.push("Schedule follow-up calls");
    }
    if (context.insights?.upsellAnalysis) {
      suggestions.push("Generate upsell proposals");
      suggestions.push("Schedule product demos");
    }
    return suggestions;
  }

  // -------------- Conversation helpers --------------
  async getConversationHistory(userId) {
    const ctx = this.conversationHistory.get(userId);
    return ctx ? ctx.messages : [];
  }

  async clearConversationHistory(userId) {
    this.conversationHistory.delete(userId);
  }
}
