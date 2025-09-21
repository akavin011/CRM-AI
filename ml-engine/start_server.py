#!/usr/bin/env python3
"""
Simple startup script for ML Engine that handles uvicorn compatibility issues
"""

import sys
import os
import logging

# Add current directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("ml-engine-startup")

def start_server():
    """Start the ML engine server with fallback options"""
    
    # Try uvicorn first
    try:
        import uvicorn
        from main import app
        
        logger.info("Starting ML Engine with uvicorn...")
        uvicorn.run(
            "main:app",
            host="0.0.0.0",
            port=8000,
            reload=False,
            log_level="info"
        )
        
    except ImportError as e:
        logger.error(f"uvicorn not available: {e}")
        logger.info("Trying alternative startup...")
        
        # Fallback: try hypercorn
        try:
            import hypercorn.asyncio
            from hypercorn.config import Config
            from main import app
            
            logger.info("Starting ML Engine with hypercorn...")
            config = Config()
            config.bind = ["0.0.0.0:8000"]
            config.use_reloader = False
            
            import asyncio
            asyncio.run(hypercorn.asyncio.serve(app, config))
            
        except ImportError:
            logger.error("Neither uvicorn nor hypercorn available")
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
                        response = {
                            "status": "healthy", 
                            "message": "Basic HTTP server running",
                            "note": "Limited functionality - install uvicorn for full features"
                        }
                        self.wfile.write(json.dumps(response).encode())
                    else:
                        self.send_response(404)
                        self.end_headers()
                
                def do_POST(self):
                    if self.path == "/api/process-customers":
                        self.send_response(200)
                        self.send_header('Content-type', 'application/json')
                        self.end_headers()
                        response = {
                            "success": True, 
                            "message": "Basic server running - limited functionality",
                            "note": "Install uvicorn for full ML processing"
                        }
                        self.wfile.write(json.dumps(response).encode())
                    else:
                        self.send_response(404)
                        self.end_headers()
            
            server = HTTPServer(('0.0.0.0', 8000), MLHandler)
            logger.info("Starting basic HTTP server on port 8000...")
            logger.info("Install uvicorn for full ML processing capabilities")
            server.serve_forever()

if __name__ == "__main__":
    start_server()
