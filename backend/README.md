# Backend - Node.js (Express) Implementation

## Overview

This is an Express.js backend server that acts as a secure proxy between the frontend and Snowflake Cortex Agent APIs. It handles all communication with Snowflake, manages authentication tokens, automatically detects and executes SQL statements, and implements row-level security through Snowflake's Row Access Policies (RAP).

The backend streams responses from Snowflake to the frontend using Server-Sent Events (SSE), providing real-time feedback as the agent processes queries. When the agent generates SQL, the backend automatically executes it, retrieves results, redacts the SQL statement (for security), and chains a second agent call for data-to-analytics to generate charts and insights.

Built with modern JavaScript and async/await patterns, the backend is lightweight, fast, and easy to understand. It demonstrates best practices for API proxying, streaming data, and implementing secure multi-tenant access patterns.

## Prerequisites

- Node.js 20+
- npm or pnpm
- Snowflake account with Cortex Agent enabled

## Installation

Install dependencies:

```bash
cd backend
pnpm install
```

Or using npm:

```bash
cd backend
npm install
```

## Configuration

### 1. Environment Variables

Create a `.env` file in the `backend` directory:

```bash
# Backend server
BACKEND_PORT=4000

# Snowflake connection
SNOWFLAKE_URL=https://<ACCOUNT_LOCATOR>.snowflakecomputing.com
SNOWFLAKE_PAT=<YOUR_PERSONAL_ACCESS_TOKEN>
SNOWFLAKE_WAREHOUSE=<WAREHOUSE_NAME>
```

Copy the example file:
```bash
cp env.example .env
# Then edit .env with your actual values
```

### 2. Agent Model Configuration

Create an `agent_model.yaml` file in the `backend` directory with your Cortex Agent configuration:

```yaml
model: claude-4-sonnet
experimental:
  EnableRelatedQueries: true
tools:
  - tool_spec:
      type: cortex_search
      name: search1
  - tool_spec:
      type: cortex_analyst_text_to_sql
      name: analyst1
  - tool_spec:
      type: data_to_chart
      name: data_to_chart
  - tool_spec:
      type: sql_exec
      name: sql_exec
tool_resources:
  analyst1:
    semantic_model_file: "@MULTISALES.DATA.MODELS/MULTISALES.yaml"
  search1:
    name: "MULTISALES.DATA.ITEMS_SEARCH"
    max_results: 10
```

Copy the example file:
```bash
cp agent_model.yaml.example agent_model.yaml
# Then edit agent_model.yaml with your actual values
```

**Getting Configuration Values**: Run the `MULTISALES.ipynb` notebook in Snowflake to set up the required resources. The notebook will provide the configuration to copy into `agent_model.yaml`.

## Running the Backend

Start the server:

```bash
node server.js
```

Or with development auto-reload using nodemon:

```bash
npx nodemon server.js
```

The backend will be available at `http://localhost:4000`.

## API Endpoints

### Authentication
- `POST /auth/login` - Demo user login
- `POST /auth/logout` - Demo user logout
- `GET /api/jwt` - Generate JWT for Snowflake (optional, for key-pair auth)

### Snowflake Proxy
- `POST /api/agent/run` - Proxy to Cortex Agent with streaming, SQL execution, and data-to-analytics
- `POST /api/statements` - Proxy to Snowflake Statements API (for direct SQL execution)

## Key Features

- **Automatic SQL Execution**: Detects SQL in agent responses and executes automatically
- **SQL Redaction**: Removes SQL statements before forwarding to frontend
- **Row-Level Security**: Prepends `SET TENANT` to enforce user-specific data access
- **Streaming Responses**: Real-time SSE streaming from Snowflake to frontend
- **Data-to-Analytics Chaining**: Automatically calls agent API again after SQL execution for charts
- **Simple Demo Auth**: Cookie-based authentication for demonstration purposes

## Managing Users

Demo users are stored in `users.json` in the backend directory. The default users are:

```json
[
  {"username": "Alice", "password": "Alice"},
  {"username": "Bob", "password": "Bob"},
  {"username": "Charlie", "password": "Charlie"}
]
```

**To add or remove users**:
1. Edit `backend/users.json`
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

## Architecture

```
Frontend → Backend (Express) → Snowflake APIs
                ↓
          [SQL Detection]
                ↓
        [Auto Execution]
                ↓
      [Data-to-Analytics]
```

## Code Structure

The server is organized into clear sections:
- **Configuration**: Constants, tools, and parameters
- **Helper Functions**: Reusable utility functions for common operations
- **Authentication Routes**: Login, logout, and JWT generation
- **Agent Proxy**: Main streaming endpoint with SQL detection and execution
- **Statements Proxy**: Direct SQL execution endpoint

## Development Tips

The backend logs all Snowflake requests and responses, making it easy to debug issues:

```
[SNOWFLAKE REQUEST] /api/v2/cortex/agent:run
[SNOWFLAKE RESPONSE] /api/v2/cortex/agent:run status 200
[BACKEND] SQL detected, executing and streaming data-to-analytics
[SNOWFLAKE REQUEST] /api/v2/statements
```

## Troubleshooting

**Connection errors**
- Verify `SNOWFLAKE_URL` and `SNOWFLAKE_PAT` are correct
- Check that your PAT has necessary privileges
- Ensure warehouse is running

**Port already in use**
- Change `BACKEND_PORT` in `.env`
- Or stop the process using port 4000

**CORS errors**
- The backend uses `origin: true` which reflects the requesting origin
- Ensure frontend is making requests with `credentials: 'include'`

