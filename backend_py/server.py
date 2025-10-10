"""
FastAPI Backend Server for Cortex Agent with Row Access Policies
Provides the same functionality as the Node.js backend but implemented in Python.
"""

import os
import json
import time
import base64
import hashlib
import logging
import copy
from typing import Optional, Dict, Any, List
from datetime import datetime, timedelta

import jwt
import yaml
from fastapi import FastAPI, Request, Response, HTTPException, Cookie
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.backends import default_backend
from pydantic import BaseModel
import httpx
from dotenv import load_dotenv

load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='[%(asctime)s] %(levelname)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger(__name__)

app = FastAPI(title="Cortex Agent Backend")

# =============================================================================
# CORS Configuration
# =============================================================================

# When using credentials (cookies), we cannot use wildcard origins
# Specify exact origins that are allowed to access the API
# For production, add your production frontend URLs:
# Example: ["https://yourdomain.com", "https://app.yourdomain.com"]
ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3000",
]

# Optional: Load additional origins from environment variable
if os.getenv("ADDITIONAL_CORS_ORIGINS"):
    ALLOWED_ORIGINS.extend(os.getenv("ADDITIONAL_CORS_ORIGINS").split(","))

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =============================================================================
# Configuration
# =============================================================================

BACKEND_PORT = int(os.getenv("BACKEND_PORT", "4000"))
SNOWFLAKE_URL = os.getenv("SNOWFLAKE_URL", "")
SNOWFLAKE_PAT = os.getenv("SNOWFLAKE_PAT", "")
SNOWFLAKE_WAREHOUSE = os.getenv("SNOWFLAKE_WAREHOUSE", "SALES_INTELLIGENCE_WH")
SEMANTIC_MODEL_PATH = os.getenv("SEMANTIC_MODEL_PATH", "")
SEARCH_SERVICE_PATH = os.getenv("SEARCH_SERVICE_PATH", "")
SNOWFLAKE_ACCOUNT = os.getenv("SNOWFLAKE_ACCOUNT", "")
SNOWFLAKE_USER = os.getenv("SNOWFLAKE_USER", "")

# Load demo users from JSON file
with open(os.path.join(os.path.dirname(__file__), "users.json"), "r") as f:
    DEMO_USERS = json.load(f)

# Load agent model configuration from YAML file
with open(os.path.join(os.path.dirname(__file__), "agent_model.yaml"), "r") as f:
    AGENT_MODEL_CONFIG = yaml.safe_load(f)

def get_statement_parameters(statement_count: int = 1) -> Dict:
    return {
        "MULTI_STATEMENT_COUNT": f"{statement_count}",
        "BINARY_OUTPUT_FORMAT": "HEX",
        "DATE_OUTPUT_FORMAT": "YYYY-Mon-DD",
        "TIME_OUTPUT_FORMAT": "HH24:MI:SS",
        "TIMESTAMP_LTZ_OUTPUT_FORMAT": "",
        "TIMESTAMP_NTZ_OUTPUT_FORMAT": "YYYY-MM-DD HH24:MI:SS.FF3",
        "TIMESTAMP_TZ_OUTPUT_FORMAT": "",
        "TIMESTAMP_OUTPUT_FORMAT": "YYYY-MM-DD HH24:MI:SS.FF3 TZHTZM",
        "TIMEZONE": "America/Los_Angeles",
    }

# =============================================================================
# Request/Response Models
# =============================================================================

class LoginRequest(BaseModel):
    username: str
    password: str

class AgentRunRequest(BaseModel):
    messages: List[Dict[str, Any]]

class StatementRequest(BaseModel):
    statement: str

# =============================================================================
# Helper Functions
# =============================================================================

def get_snowflake_auth_headers(auth_token: str) -> Dict[str, str]:
    """Create standard Snowflake API headers."""
    return {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Authorization": f"Bearer {auth_token}"
    }

def create_agent_request_body(messages: List[Dict]) -> Dict:
    """Build agent API request body by cloning config and adding messages."""
    # Clone the agent model config and add messages
    body = copy.deepcopy(AGENT_MODEL_CONFIG)
    body["messages"] = messages
    return body

def write_sse(event_name: Optional[str], data_obj: Any) -> str:
    """Format data as Server-Sent Event."""
    lines = []
    if event_name:
        lines.append(f"event: {event_name}")
    
    # Handle [DONE] without quotes
    data_str = data_obj if data_obj == "[DONE]" else json.dumps(data_obj)
    lines.append(f"data: {data_str}")
    lines.append("")
    return "\n".join(lines) + "\n"

def should_skip_event(event_name: Optional[str], payload: Any) -> bool:
    """Check if event should be filtered out."""
    if event_name == "execution_trace":
        return True
    if isinstance(payload, dict):
        delta_content = payload.get("delta", {}).get("content")
        if isinstance(delta_content, list) and len(delta_content) == 0:
            return True
    return False

def extract_sql_from_payload(payload: Dict) -> Optional[Dict]:
    """Extract SQL and metadata from agent payload."""
    try:
        content = payload.get("delta", {}).get("content", [])
        if len(content) > 1:
            tool_results = content[1].get("tool_results", {})
            json_content = tool_results.get("content", [{}])[0].get("json", {})
            if "sql" in json_content:
                return json_content
    except (KeyError, IndexError, TypeError):
        pass
    return None

async def execute_sql(snowflake_url: str, auth_token: str, sql: str, username: Optional[str]) -> Dict:
    """Execute SQL statement via Snowflake API."""
    tenant_sql = sql
    statement_count = 1 
    if username:
        tenant_sql = f"SET TENANT = '{username}'; {sql}"
        statement_count = 2
    
    stmt_payload = {
        "statement": tenant_sql,
        "warehouse": SNOWFLAKE_WAREHOUSE,
        "parameters": get_statement_parameters(statement_count)
    }
    
    logger.info(f"[SQL] {sql}")
    logger.info("[SNOWFLAKE REQUEST] /api/v2/statements")
    
    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.post(
            f"{snowflake_url}/api/v2/statements",
            headers=get_snowflake_auth_headers(auth_token),
            json=stmt_payload
        )
        logger.info(f"[SNOWFLAKE RESPONSE] /api/v2/statements status {response.status_code}")
        if response.status_code != 200:
            logger.error(f"[SNOWFLAKE RESPONSE] /api/v2/statements error {response.text}")
            raise Exception(f"[SNOWFLAKE RESPONSE] /api/v2/statements error {response.text}")
        return response.json()

async def get_sql_results(snowflake_url: str, auth_token: str, statement_handle: str) -> Dict:
    """Fetch SQL execution results."""
    logger.info(f"[SNOWFLAKE REQUEST] /api/v2/statements/{statement_handle}")
    
    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.get(
            f"{snowflake_url}/api/v2/statements/{statement_handle}",
            headers=get_snowflake_auth_headers(auth_token)
        )
        logger.info(f"[SNOWFLAKE RESPONSE] /api/v2/statements/{statement_handle} status {response.status_code}")
        return response.json()

async def stream_agent_response(
    snowflake_url: str, 
    auth_token: str, 
    body: Dict
) -> httpx.Response:
    """Call Snowflake agent API and return streaming response."""
    logger.info("[SNOWFLAKE REQUEST] /api/v2/cortex/agent:run")
    
    client = httpx.AsyncClient(timeout=300.0)
    response = await client.post(
        f"{snowflake_url}/api/v2/cortex/agent:run",
        headers={
            "Content-Type": "application/json",
            "Accept": "text/event-stream",
            "Authorization": f"Bearer {auth_token}"
        },
        json=body
    )
    logger.info(f"[SNOWFLAKE RESPONSE] /api/v2/cortex/agent:run status {response.status_code}")
    
    return response

def parse_sse_line(line: str) -> tuple[Optional[str], Optional[str]]:
    """Parse a single SSE line into field and value."""
    if ":" in line:
        field, _, value = line.partition(":")
        return field.strip(), value.strip()
    return None, None

async def parse_sse_stream(response: httpx.Response):
    """Parse Server-Sent Events from response stream."""
    event_name = None
    data_lines = []
    
    async for line in response.aiter_lines():
        if not line:
            # Empty line indicates end of event
            if data_lines:
                data = "\n".join(data_lines)
                yield event_name, data
                event_name = None
                data_lines = []
            continue
        
        field, value = parse_sse_line(line)
        if field == "event":
            event_name = value
        elif field == "data":
            data_lines.append(value)

# =============================================================================
# Authentication Routes
# =============================================================================

@app.post("/auth/login")
async def login(login_req: LoginRequest, response: Response):
    """Demo user login."""
    username = login_req.username
    password = login_req.password
    
    # Check if user exists in users.json
    user = next((u for u in DEMO_USERS if u["username"] == username and u["password"] == password), None)
    
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Set cookie
    response.set_cookie(
        key="demo_username",
        value=username,
        httponly=False,
        samesite="lax",
        max_age=7 * 24 * 60 * 60  # 7 days
    )
    
    return {"ok": True}

@app.post("/auth/logout")
async def logout(response: Response):
    """Demo user logout."""
    response.delete_cookie("demo_username")
    return {"ok": True}

@app.get("/api/jwt")
async def get_jwt():
    """Generate JWT for Snowflake key-pair authentication."""
    try:
        # Read RSA private key
        rsa_key_path = os.getenv("SNOWFLAKE_RSA_KEY_PATH", "rsa_key.p8")
        
        with open(rsa_key_path, "rb") as key_file:
            private_key = serialization.load_pem_private_key(
                key_file.read(),
                password=None,
                backend=default_backend()
            )
        
        # Get public key fingerprint
        public_key = private_key.public_key()
        public_key_bytes = public_key.public_bytes(
            encoding=serialization.Encoding.DER,
            format=serialization.PublicFormat.SubjectPublicKeyInfo
        )
        
        sha256_hash = hashlib.sha256(public_key_bytes).digest()
        public_key_fp = f"SHA256:{base64.b64encode(sha256_hash).decode('utf-8')}"
        
        # Build JWT payload
        account = SNOWFLAKE_ACCOUNT.upper()
        user = SNOWFLAKE_USER.upper()
        qualified_username = f"{account}.{user}"
        
        now = int(time.time())
        exp = now + 3600  # 1 hour
        
        payload = {
            "iss": f"{qualified_username}.{public_key_fp}",
            "sub": qualified_username,
            "iat": now,
            "exp": exp
        }
        
        # Sign JWT
        private_pem = private_key.private_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PrivateFormat.PKCS8,
            encryption_algorithm=serialization.NoEncryption()
        )
        
        token = jwt.encode(payload, private_pem, algorithm="RS256")
        
        return {
            "token": {
                "token": token,
                "expiresAt": exp - 120
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate JWT: {str(e)}")

# =============================================================================
# Snowflake Agent Proxy
# =============================================================================

@app.post("/api/agent/run")
async def agent_run(
    request: Request,
    agent_req: AgentRunRequest,
    demo_username: Optional[str] = Cookie(None)
):
    """Proxy to Snowflake Agent with streaming, SQL execution, and data-to-analytics."""
    
    if not SNOWFLAKE_URL:
        raise HTTPException(status_code=500, detail="Missing SNOWFLAKE_URL")
    
    messages = agent_req.messages
    username = demo_username or ""
    
    async def generate():
        try:
            # Call Snowflake agent API
            body = create_agent_request_body(messages)
            response = await stream_agent_response(SNOWFLAKE_URL, SNOWFLAKE_PAT, body)
            
            sql_detected = False
            assistant_message_content = []
            
            # Process SSE stream
            async for event_name, data in parse_sse_stream(response):
                if data == "[DONE]":
                    if not sql_detected:
                        yield write_sse("done", "[DONE]")
                    break
                
                # Filter out execution_trace events
                if event_name == "execution_trace":
                    logger.info("[SNOWFLAKE STREAM EVENT] Skipping execution_trace event")
                    continue
                
                # Parse payload
                try:
                    payload = json.loads(data) if data else {}
                except json.JSONDecodeError:
                    payload = data
                
                # Filter out events with empty delta.content
                if should_skip_event(event_name, payload):
                    logger.info("[SNOWFLAKE STREAM EVENT] Skipping event with empty delta.content")
                    continue
                
                # Accumulate assistant message content (excluding sql_exec tool_use)
                if isinstance(payload, dict) and "delta" in payload:
                    content = payload.get("delta", {}).get("content", [])
                    for content_item in content:
                        if isinstance(content_item, dict):
                            tool_use = content_item.get("tool_use", {})
                            if tool_use.get("name") != "sql_exec":
                                assistant_message_content.append(content_item)
                
                # Check for SQL in tool_results
                tool_result_json = extract_sql_from_payload(payload)
                sql = tool_result_json.get("sql") if tool_result_json else None
                
                skip_forwarding = False
                
                if sql:
                    skip_forwarding = True
                    sql_detected = True
                    logger.info("[BACKEND] SQL detected, executing and streaming data-to-analytics")
                    
                    # Send analyst text if present
                    if tool_result_json.get("text"):
                        text_payload = {
                            "id": "msg_000",
                            "object": "message.delta",
                            "delta": {
                                "content": [{"type": "text", "text": tool_result_json["text"] + "\n\n---\n\n"}]
                            }
                        }
                        yield write_sse("message.delta", text_payload)
                    
                    # Execute SQL and get results
                    stmt_json = await execute_sql(SNOWFLAKE_URL, SNOWFLAKE_PAT, sql, username)
                    statement_handle = stmt_json.get("statementHandles", [None, None])[1] or stmt_json.get("statementHandle")
                    sql_results_json = await get_sql_results(SNOWFLAKE_URL, SNOWFLAKE_PAT, statement_handle)
                    yield write_sse("table_result", sql_results_json)
                    
                    # Signal new assistant message for data-to-analytics
                    yield write_sse("new_assistant_message", {"message": "Starting data-to-analytics"})
                    
                    # Call agent API again with sql_exec tool results
                    assistant_message = {
                        "role": "assistant",
                        "content": assistant_message_content
                    }
                    sql_exec_message = {
                        "role": "user",
                        "content": [{
                            "type": "tool_results",
                            "tool_results": {
                                "name": "sql_exec",
                                "content": [{"type": "json", "json": {"query_id": statement_handle}}]
                            }
                        }]
                    }
                    
                    data2analytics_body = create_agent_request_body(
                        [*messages, assistant_message, sql_exec_message]
                    )
                    
                    logger.info("[SNOWFLAKE REQUEST] /api/v2/cortex/agent:run (data-to-analytics)")
                    d2a_response = await stream_agent_response(SNOWFLAKE_URL, SNOWFLAKE_PAT, data2analytics_body)
                    logger.info(f"[SNOWFLAKE RESPONSE] /api/v2/cortex/agent:run (data-to-analytics) status {d2a_response.status_code}")
                    
                    # Stream data-to-analytics events
                    async for d2a_event_name, d2a_data in parse_sse_stream(d2a_response):
                        if d2a_data == "[DONE]":
                            break
                        if d2a_event_name == "execution_trace":
                            continue
                        
                        try:
                            d2a_payload = json.loads(d2a_data) if d2a_data else {}
                        except json.JSONDecodeError:
                            d2a_payload = d2a_data
                        
                        # Filter out events with empty delta.content
                        if should_skip_event(d2a_event_name, d2a_payload):
                            continue
                        
                        yield write_sse(d2a_event_name, d2a_payload)
                    
                    # Redact SQL in payload
                    try:
                        if "delta" in payload and "content" in payload["delta"]:
                            content = payload["delta"]["content"]
                            if len(content) > 1:
                                if "tool_results" in content[1]:
                                    tr_content = content[1]["tool_results"].get("content", [])
                                    if tr_content and "json" in tr_content[0]:
                                        if "sql" in tr_content[0]["json"]:
                                            tr_content[0]["json"]["sql"] = "REDACTED"
                    except (KeyError, IndexError, TypeError):
                        pass
                
                # Forward event if not SQL-related
                if not skip_forwarding:
                    yield write_sse(event_name, payload)
            
            # Send final DONE if SQL was executed
            if sql_detected:
                yield write_sse("done", "[DONE]")
                
        except Exception as e:
            logger.error(f"[BACKEND ERROR] {str(e)}")
            yield write_sse("error", {"error": str(e)})
    
    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        }
    )

# =============================================================================
# Snowflake Statements Proxy
# =============================================================================

@app.post("/api/statements")
async def statements_proxy(stmt_req: StatementRequest):
    """Proxy to Snowflake Statements API."""
    if not SNOWFLAKE_URL:
        raise HTTPException(status_code=500, detail="Missing SNOWFLAKE_URL")
    
    statement = stmt_req.statement
    if not statement or not statement.strip():
        raise HTTPException(status_code=400, detail="statement required")
    
    payload = {
        "statement": statement,
        "warehouse": SNOWFLAKE_WAREHOUSE,
        "parameters": get_statement_parameters()
    }
    
    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.post(
            f"{SNOWFLAKE_URL}/api/v2/statements",
            headers=get_snowflake_auth_headers(SNOWFLAKE_PAT),
            json=payload
        )
        
        return Response(
            content=response.content,
            status_code=response.status_code,
            headers=dict(response.headers)
        )

# =============================================================================
# Server Startup
# =============================================================================

if __name__ == "__main__":
    import uvicorn
    logger.info(f"Starting Python backend on http://0.0.0.0:{BACKEND_PORT}")
    logger.info(f"API documentation available at http://localhost:{BACKEND_PORT}/docs")
    uvicorn.run(app, host="0.0.0.0", port=BACKEND_PORT)

