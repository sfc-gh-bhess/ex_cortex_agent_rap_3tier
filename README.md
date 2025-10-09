# Cortex Agents with Row Access Policies and React

This example demonstrates a **3-tier architecture** for using Snowflake Cortex Agents with multi-tenant data:
- **Frontend**: Next.js React application
- **Backend**: Express.js proxy server
- **Snowflake**: Cortex Agent API with Row Access Policies (RAP)

The backend acts as a secure proxy that:
- Handles all Snowflake API calls (agent and statements)
- Manages authentication tokens
- Automatically executes SQL and redacts it before sending to frontend
- Implements row-level security via `SET TENANT` session variable

## Architecture Overview

```
User → Frontend (Next.js) → Backend (Express) → Snowflake (Cortex Agent + RAP)
```

## Prerequisites

- Node.js 20+
- Snowflake account with Cortex Agent enabled
- Completed steps 1-2 from the [Getting Started with Cortex Agents Quickstart](https://quickstarts.snowflake.com/guide/getting_started_with_cortex_agents/index.html)

## Setup Instructions

### 1. Run the Snowflake Notebook

Import and run `CORTEXAGENT_RAP.ipynb` in Snowflake to:
- Create tables with Row Access Policies
- Set up semantic model and search service
- Generate environment variables

### 2. Install Dependencies

```bash
# Install pnpm (if not already installed)
npm install -g pnpm

# Install backend dependencies
cd backend
pnpm install

# Install frontend dependencies
cd ../frontend
pnpm install

cd ..
```

### 3. Configure Environment Variables

Create a `.env` file in the **backend** directory with values from the notebook:

```bash
# Backend server
BACKEND_PORT=4000

# Snowflake connection
SNOWFLAKE_URL=https://<ACCOUNT_LOCATOR>.snowflakecomputing.com
SNOWFLAKE_PAT=<YOUR_PERSONAL_ACCESS_TOKEN>
SNOWFLAKE_WAREHOUSE=<WAREHOUSE_NAME>

# Cortex Agent resources
SEMANTIC_MODEL_PATH=@SALES_INTELLIGENCE.DATA.MODELS/sales_metrics_model.yaml
SEARCH_SERVICE_PATH=SALES_INTELLIGENCE.DATA.SALES_CONVERSATION_SEARCH

# Optional: For JWT key-pair auth (instead of PAT)
# SNOWFLAKE_ACCOUNT=<ACCOUNT>
# SNOWFLAKE_USER=<USER>
# Place rsa_key.p8 file in backend directory
```

Create a `.env.local` file in the **frontend** directory:

```bash
NEXT_PUBLIC_BACKEND_URL=http://localhost:4000
```

### 4. Run the Application

In **separate terminals**:

```bash
# Terminal 1: Start backend
cd backend
pnpm dev

# Terminal 2: Start frontend
cd frontend
pnpm dev
```

The frontend will be available at `http://localhost:3000`.

## Demo Users

The application includes 6 demo users (password is the same as username):

| User | Access To |
|------|-----------|
| Alice | Rachel, Sarah |
| Bob | James, Mike |
| Charlie | All users |
| James | James only |
| Mike | Mike only |
| Rachel | Rachel only |
| Sarah | Sarah only |

Try logging in as different users and asking: **"What are the biggest deals won and lost?"**

Each user will see different results based on their row-level access.

## How It Works

1. **User sends a query** from the frontend
2. **Backend receives messages** and calls Snowflake Agent API
3. **Agent generates SQL** based on the semantic model
4. **Backend intercepts SQL**, redacts it, and:
   - Prepends `SET TENANT = '<username>'` to enforce row-level security
   - Executes SQL via Snowflake Statements API
   - Calls Agent API again for data-to-analytics (charts/tables)
5. **Frontend receives**:
   - Analyst text explanation
   - Table results (SQL hidden)
   - Charts and insights

## Key Features

- ✅ **Row-Level Security**: Users only see their authorized data
- ✅ **SQL Redaction**: SQL statements never reach the frontend
- ✅ **Automatic SQL Execution**: Backend handles SQL transparently
- ✅ **Streaming Responses**: Real-time SSE from Snowflake to frontend
- ✅ **Session Management**: Cookie-based demo authentication

## Project Structure

```
├── backend/
│   ├── server.js          # Express proxy server
│   └── package.json
├── frontend/
│   ├── app/               # Next.js pages and components
│   ├── lib/               # Frontend utilities and hooks
│   └── package.json
├── data/
│   ├── setup.sql          # Database setup script
│   └── customer_semantic_model.yaml
└── CORTEXAGENTS_RAP.ipynb # Setup notebook
```

## Development

To modify the application:

- **Backend logic**: Edit `backend/server.js`
- **Frontend UI**: Edit files in `frontend/app/components/`
- **Agent hook**: Edit `frontend/lib/agent-api/useAgentAPIQuery.ts`

## Troubleshooting

**Backend can't connect to Snowflake**
- Verify `SNOWFLAKE_URL` and `SNOWFLAKE_PAT` are correct
- Check that your PAT has the necessary privileges

**SQL not executing**
- Check backend logs for SQL detection messages
- Verify `SNOWFLAKE_WAREHOUSE` is set and running

**Row-level security not working**
- Ensure Row Access Policies are created (run the notebook)
- Verify `SET TENANT` is being prepended to SQL (check backend logs)

**Frontend can't reach backend**
- Verify backend is running on port 4000
- Check `NEXT_PUBLIC_BACKEND_URL` in frontend `.env.local`

## License

See LICENSE file for details.
