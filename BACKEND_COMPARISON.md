# Backend Implementation Comparison

This document compares the Node.js (Express) and Python (FastAPI) backend implementations.

## Summary

Both backends provide **identical functionality** and expose the **same API** to the frontend. Choose based on your team's expertise, deployment requirements, or preference.

## Quick Comparison Table

| Feature | Node.js (backend/) | Python (backend_py/) |
|---------|-------------------|---------------------|
| **Framework** | Express.js | FastAPI |
| **Runtime** | Node.js | Python 3.9+ |
| **HTTP Client** | native fetch | httpx |
| **Async Model** | async/await | async/await |
| **JWT Library** | jsonwebtoken | pyjwt |
| **SSE Parsing** | fetch-event-stream | Custom implementation |
| **Type Safety** | TypeScript (optional) | Type hints + Pydantic |
| **Auto Docs** | No | Yes (OpenAPI/Swagger) |
| **Lines of Code** | ~342 | ~530 |
| **Startup Time** | Fast (~1s) | Fast (~2s) |
| **Memory Usage** | Low | Low-Medium |
| **Package Manager** | npm/pnpm | pip/poetry |

## Feature Parity

Both implementations support:

✅ Demo user authentication with cookies
✅ JWT generation for Snowflake key-pair auth
✅ Streaming SSE from Snowflake Agent API
✅ Automatic SQL detection and execution
✅ SQL redaction (frontend never sees SQL)
✅ Data-to-analytics chaining
✅ Row-level security via SET TENANT
✅ Event filtering (execution_trace, empty content)
✅ Error handling and logging
✅ CORS configuration
✅ Environment variable configuration

## Code Structure Comparison

### Node.js (Express)
```javascript
// Organized into sections with comments
// Configuration
const DEMO_USERS = [...];
const AGENT_TOOLS = [...];

// Helper Functions
function getSnowflakeAuthHeaders() { ... }
function createSSEWriter() { ... }

// Routes
app.post('/auth/login', ...);
app.post('/api/agent/run', ...);
```

### Python (FastAPI)
```python
# Organized into sections with docstrings
# Configuration
DEMO_USERS = [...]
AGENT_TOOLS = [...]

# Helper Functions
def get_snowflake_auth_headers() -> Dict[str, str]:
    """Create standard Snowflake API headers."""
    ...

# Routes
@app.post("/auth/login")
async def login(login_req: LoginRequest):
    """Demo user login."""
    ...
```

## Key Differences

### 1. Type Safety

**Node.js**:
```javascript
// No built-in validation
const { messages } = req.body || {};
if (!Array.isArray(messages)) { ... }
```

**Python**:
```python
# Automatic validation with Pydantic
class AgentRunRequest(BaseModel):
    messages: List[Dict[str, Any]]

@app.post("/api/agent/run")
async def agent_run(agent_req: AgentRunRequest):
    messages = agent_req.messages  # Already validated
```

### 2. SSE Parsing

**Node.js**:
```javascript
import { events } from 'fetch-event-stream';

const streamEvents = events(response);
for await (const event of streamEvents) {
    // Library handles parsing
}
```

**Python**:
```python
# Custom implementation for more control
async def parse_sse_stream(response: httpx.Response):
    event_name = None
    data_lines = []
    
    async for line in response.aiter_lines():
        if not line:
            yield event_name, "\n".join(data_lines)
            event_name = None
            data_lines = []
        # ... parsing logic
```

### 3. HTTP Client

**Node.js**:
```javascript
// Native fetch (Node 18+)
const response = await fetch(url, {
    method: 'POST',
    headers: { ... },
    body: JSON.stringify(data)
});
```

**Python**:
```python
# httpx for async support
async with httpx.AsyncClient(timeout=60.0) as client:
    response = await client.post(
        url,
        headers={...},
        json=data
    )
```

### 4. Cookie Handling

**Node.js**:
```javascript
// Using cookie-parser middleware
const username = decodeURIComponent(req.cookies?.demo_username || '');

res.cookie('demo_username', username, { ... });
```

**Python**:
```python
# Using FastAPI's Cookie dependency
async def agent_run(
    demo_username: Optional[str] = Cookie(None)
):
    username = demo_username or ""

response.set_cookie(key="demo_username", value=username, ...)
```

### 5. Error Handling

**Node.js**:
```javascript
try {
    // ... logic
} catch (e) {
    console.error('[BACKEND ERROR]', e);
    if (res.headersSent) {
        // SSE error event
    } else {
        res.status(500).json({ error: e?.message });
    }
}
```

**Python**:
```python
try:
    # ... logic
except Exception as e:
    print(f"[BACKEND ERROR] {str(e)}")
    raise HTTPException(
        status_code=500, 
        detail=str(e)
    )
```

## Performance Characteristics

### Node.js
- **Startup**: Very fast (~1 second)
- **Memory**: Low baseline (~30-50MB)
- **Concurrency**: Event loop, single-threaded
- **Streaming**: Native support with fetch
- **Best for**: High concurrency, I/O-bound operations

### Python
- **Startup**: Fast (~2 seconds)
- **Memory**: Low-medium baseline (~40-70MB)
- **Concurrency**: Async/await with uvicorn
- **Streaming**: Requires AsyncClient
- **Best for**: Data processing, ML integration, Python ecosystem

## Developer Experience

### Node.js Advantages
1. **Faster startup** for development
2. **Smaller codebase** (fewer lines)
3. **Native fetch** (no external HTTP library)
4. **JavaScript everywhere** (frontend + backend)
5. **Large ecosystem** (npm)

### Python Advantages
1. **Type safety** with Pydantic validation
2. **Auto-generated API docs** at `/docs`
3. **Better error messages** for validation
4. **Familiar to data teams**
5. **Easy integration** with data science libraries
6. **Explicit async** (clear async/await patterns)

## When to Choose Which?

### Choose Node.js if:
- ✅ Your team knows JavaScript/TypeScript
- ✅ You want the smallest possible footprint
- ✅ You're already using Node.js for other services
- ✅ You prefer minimal dependencies
- ✅ You want fastest startup times

### Choose Python if:
- ✅ Your team knows Python
- ✅ You want built-in API documentation
- ✅ You need strong type validation
- ✅ You might integrate with data science tools
- ✅ You prefer explicit over implicit
- ✅ You want Pydantic models for data validation

## Migration Between Backends

Switching between backends requires:

1. **Stop the current backend**
2. **Start the other backend** (same port 4000)
3. **No frontend changes** needed!

The frontend doesn't know or care which backend it's talking to - the API contract is identical.

## Deployment Considerations

### Node.js
```bash
# Production with PM2
pm2 start server.js --name cortex-backend

# Docker
FROM node:20-alpine
COPY . .
RUN npm install
CMD ["node", "server.js"]
```

### Python
```bash
# Production with Gunicorn + Uvicorn
gunicorn server:app \
  --workers 4 \
  --worker-class uvicorn.workers.UvicornWorker \
  --bind 0.0.0.0:4000

# Docker
FROM python:3.11-slim
COPY . .
RUN pip install -r requirements.txt
CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "4000"]
```

## Testing Both Backends

You can run both backends simultaneously on different ports:

```bash
# Terminal 1: Node.js backend
cd backend
PORT=4000 node server.js

# Terminal 2: Python backend
cd backend_py
BACKEND_PORT=4001 python server.py

# Terminal 3: Frontend (pointing to Node.js)
cd frontend
NEXT_PUBLIC_BACKEND_URL=http://localhost:4000 pnpm dev

# Terminal 4: Frontend (pointing to Python)
cd frontend
PORT=3001 NEXT_PUBLIC_BACKEND_URL=http://localhost:4001 pnpm dev
```

Now you can compare both implementations side-by-side!

## Conclusion

Both implementations are **production-ready** and provide identical functionality. The choice is yours:

- **Node.js**: Minimal, fast, JavaScript-native
- **Python**: Type-safe, auto-documented, Python-native

The 3-tier architecture proves its value by allowing backend flexibility without frontend changes. This is a great example of **separation of concerns** and **language-agnostic API design**! 🎉

