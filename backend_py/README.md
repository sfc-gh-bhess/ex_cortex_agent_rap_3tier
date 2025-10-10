# Backend - Python (FastAPI) Implementation

## Overview

This is a FastAPI backend server that provides identical functionality to the Node.js backend but implemented in Python. It acts as a secure proxy between the frontend and Snowflake Cortex Agent APIs, handling authentication, automatic SQL execution, and row-level security enforcement through Row Access Policies (RAP).

The backend uses modern Python async/await patterns with FastAPI's high-performance ASGI framework. It streams responses from Snowflake using Server-Sent Events (SSE), automatically detects and executes SQL statements, redacts sensitive SQL from responses, and chains data-to-analytics calls for visualization generation.

Built with type safety through Pydantic models and automatic API documentation, the Python backend is production-ready and demonstrates best practices for async web services. It includes structured logging for observability and flexible CORS configuration for development and production environments.

## Prerequisites

- Python 3.9+ (3.11+ recommended)
- pip or poetry for package management
- Snowflake account with Cortex Agent enabled

## Installation

Create a virtual environment and install dependencies:

```bash
cd backend_py

# Create virtual environment
python -m venv venv

# Activate virtual environment
# On macOS/Linux:
source venv/bin/activate
# On Windows:
# venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

## Configuration

Create a `.env` file in the `backend_py` directory with your Snowflake credentials:

```bash
# Backend server
BACKEND_PORT=4000

# CORS Configuration (optional)
# ADDITIONAL_CORS_ORIGINS=https://yourdomain.com,https://app.yourdomain.com

# Snowflake connection
SNOWFLAKE_URL=https://<ACCOUNT_LOCATOR>.snowflakecomputing.com
SNOWFLAKE_PAT=<YOUR_PERSONAL_ACCESS_TOKEN>
SNOWFLAKE_WAREHOUSE=<WAREHOUSE_NAME>

# Cortex Agent resources
SEMANTIC_MODEL_PATH=@SALES_INTELLIGENCE.DATA.MODELS/sales_metrics_model.yaml
SEARCH_SERVICE_PATH=SALES_INTELLIGENCE.DATA.SALES_CONVERSATION_SEARCH
```

Copy the example file to get started:

```bash
cp env.example .env
# Then edit .env with your actual values
```

**Getting Configuration Values**: Run the `CORTEXAGENTS_RAP.ipynb` notebook in Snowflake to set up the required resources and generate these values.

## Running the Backend

Start the server:

```bash
python server.py
```

Or use the convenience script:

```bash
./run_dev.sh
```

Or use uvicorn directly with auto-reload:

```bash
uvicorn server:app --host 0.0.0.0 --port 4000 --reload
```

The backend will be available at `http://localhost:4000`.

**Interactive API Documentation** is automatically available at:
- Swagger UI: `http://localhost:4000/docs`
- ReDoc: `http://localhost:4000/redoc`

## API Endpoints

### Authentication
- `POST /auth/login` - Demo user login
- `POST /auth/logout` - Demo user logout
- `GET /api/jwt` - Generate JWT for Snowflake (optional, for key-pair auth)

### Snowflake Proxy
- `POST /api/agent/run` - Proxy to Cortex Agent with streaming, SQL execution, and data-to-analytics
- `POST /api/statements` - Proxy to Snowflake Statements API (for direct SQL execution)

## Key Features

- **Type Safety**: Pydantic models for automatic request/response validation
- **Auto Documentation**: OpenAPI/Swagger docs generated automatically
- **Structured Logging**: Proper logging with timestamps and levels
- **Automatic SQL Execution**: Detects SQL in agent responses and executes automatically
- **SQL Redaction**: Removes SQL statements before forwarding to frontend
- **Row-Level Security**: Prepends `SET TENANT` to enforce user-specific data access
- **Streaming Responses**: Real-time SSE streaming from Snowflake to frontend
- **Flexible CORS**: Environment-configurable allowed origins for security

## Managing Users

Demo users are stored in `users.json` in the backend_py directory. The default users are:

```json
[
  {"username": "Alice", "password": "Alice"},
  {"username": "Bob", "password": "Bob"},
  {"username": "Charlie", "password": "Charlie"}
]
```

**To add or remove users**:
1. Edit `backend_py/users.json`
2. Add or remove user entries with `username` and `password` fields
3. Restart the backend server

Example - adding a new user:
```json
[
  {"username": "Alice", "password": "Alice"},
  {"username": "Bob", "password": "Bob"},
  {"username": "Charlie", "password": "Charlie"},
  {"username": "Diana", "password": "SecurePass123"}
]
```

## Key Python Libraries

- **fastapi** - Modern async web framework
- **uvicorn** - ASGI server for FastAPI
- **httpx** - Async HTTP client for Snowflake API calls
- **pyjwt** - JWT token generation
- **cryptography** - RSA key handling for JWT
- **pydantic** - Data validation and settings management

## Code Structure

The server is organized into clear sections:
- **Configuration**: Environment variables, constants, and CORS setup
- **Helper Functions**: Reusable utilities with type hints and docstrings
- **Authentication Routes**: Login, logout, and JWT generation endpoints
- **Agent Proxy**: Main streaming endpoint with SQL detection and execution
- **Statements Proxy**: Direct SQL execution endpoint

## Development Tips

The backend uses structured logging for better observability:

```
[2025-10-10 14:23:45] INFO - [SNOWFLAKE REQUEST] /api/v2/cortex/agent:run
[2025-10-10 14:23:46] INFO - [SNOWFLAKE RESPONSE] /api/v2/cortex/agent:run status 200
[2025-10-10 14:23:46] INFO - [BACKEND] SQL detected, executing and streaming data-to-analytics
```

FastAPI provides automatic interactive documentation at `/docs` for exploring and testing the API.

## Troubleshooting

**Import errors**
- Ensure virtual environment is activated
- Run `pip install -r requirements.txt`

**Connection errors**
- Verify `SNOWFLAKE_URL` and `SNOWFLAKE_PAT` are correct
- Check network connectivity and PAT privileges
- Ensure warehouse is running

**CORS errors**
- Frontend must be running on `localhost:3000` or `localhost:3001` (default allowed origins)
- For custom ports, add to `ALLOWED_ORIGINS` in `server.py`
- Or set `ADDITIONAL_CORS_ORIGINS` environment variable

**Port already in use**
- Change `BACKEND_PORT` in `.env`
- Or stop the process using port 4000

## Production Deployment

For production, use gunicorn with uvicorn workers:

```bash
gunicorn server:app \
  --workers 4 \
  --worker-class uvicorn.workers.UvicornWorker \
  --bind 0.0.0.0:4000
```

