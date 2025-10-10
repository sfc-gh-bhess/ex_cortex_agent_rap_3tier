# Cortex Agents with Row Access Policies - 3-Tier Architecture

## Overview

This example demonstrates a **production-ready 3-tier architecture** for building multi-tenant applications with Snowflake Cortex Agents:

- **Frontend**: Next.js React application for the chat UI
- **Backend**: Node.js (Express) or Python (FastAPI) proxy server
- **Snowflake**: Cortex Agent API with Row Access Policies (RAP)

The architecture separates concerns cleanly: the frontend handles UI/UX, the backend manages Snowflake communication and security, and Snowflake provides the AI agent capabilities with built-in row-level security.

## Architecture

```
┌──────────┐      ┌──────────────────┐      ┌──────────────┐
│ Frontend │ ───▶ │  Backend Proxy   │ ───▶ │  Snowflake   │
│ Next.js  │ ◀─── │ Node.js or Python│ ◀─── │ Cortex Agent │
└──────────┘      └──────────────────┘      │     +RAP     │
                                             └──────────────┘
```

### How It Works

1. User sends a natural language query through the chat interface
2. Backend receives the query and calls Snowflake Cortex Agent API
3. Agent analyzes the query and generates SQL based on the semantic model
4. Backend detects the SQL, prepends `SET TENANT = '<username>'` for row-level security
5. Backend executes the SQL via Snowflake Statements API
6. Backend redacts the SQL statement and sends table results to frontend
7. Backend calls Agent API again with query results for data-to-analytics
8. Agent generates charts and insights, streamed back to frontend in real-time

**Key Security Feature**: The SQL statement is **never exposed to the frontend** - it's executed by the backend and only results are returned. Each user sees only their authorized data thanks to Row Access Policies.

## Prerequisites

- **Snowflake Account** with Cortex Agent enabled
- **Node.js 20+** for frontend and Node.js backend
- **Python 3.9+** for Python backend (if using that option)
- Completed **Snowflake setup** (run the `CORTEXAGENTS_RAP.ipynb` notebook)

## Quick Start

### 1. Set Up Snowflake

Import and run `CORTEXAGENTS_RAP.ipynb` in Snowflake to:
- Create tables with Row Access Policies
- Set up semantic model and search service
- Generate the `agent_model.yaml` configuration

The notebook will output the configuration you need to copy into your backend's `agent_model.yaml` file.

### 2. Choose Your Backend

This project provides **two backend implementations** with identical functionality:

#### Option A: Node.js Backend (Express)
- **Best for**: JavaScript/TypeScript teams, minimal dependencies, fastest startup
- **See**: [`backend/README.md`](backend/README.md) for setup instructions

#### Option B: Python Backend (FastAPI)
- **Best for**: Python teams, type safety, auto-generated API docs
- **See**: [`backend_py/README.md`](backend_py/README.md) for setup instructions

**Important**: Choose one backend - they provide the same API and cannot run simultaneously on the same port.

### 3. Set Up Frontend

The same frontend works with either backend choice.

**See**: [`frontend/README.md`](frontend/README.md) for setup instructions

### 4. Start the Application

**Terminal 1** - Start your chosen backend:
```bash
# Node.js backend
cd backend
node server.js

# OR Python backend
cd backend_py
python server.py
```

**Terminal 2** - Start the frontend:
```bash
cd frontend
pnpm dev
```

Open `http://localhost:3000` in your browser.

## Demo Users

The application includes three default demo users:

- **Alice**
- **Bob**
- **Charlie**

**Login**: The password for each user is the same as their username (e.g., username: `Alice`, password: `Alice`).

**Try asking**: "What are the biggest deals won and lost?"

Each user will see different results based on their row-level access permissions configured in Snowflake's Row Access Policies.

### Managing Users

Users are defined in the `users.json` file in your chosen backend directory:
- Node.js backend: `backend/users.json`
- Python backend: `backend_py/users.json`

**To add or remove users**:
1. Edit the `users.json` file in your backend directory
2. Add or remove user entries with `username` and `password` fields
3. Restart the backend server

Example `users.json`:
```json
[
  {"username": "Alice", "password": "Alice"},
  {"username": "Bob", "password": "Bob"},
  {"username": "Charlie", "password": "Charlie"},
  {"username": "Diana", "password": "SecurePass123"}
]
```

**Note**: You'll also need to configure corresponding Row Access Policies in Snowflake for new users to control their data access.

## Project Structure

```
ex_cortex_agent_rap_3tier/
├── frontend/              # Next.js React application
│   ├── app/              # Pages and components
│   ├── lib/              # Utilities and API client
│   └── README.md         # Frontend setup instructions
│
├── backend/              # Node.js (Express) backend
│   ├── server.js         # Main Express server
│   └── README.md         # Node.js backend setup instructions
│
├── backend_py/           # Python (FastAPI) backend
│   ├── server.py         # Main FastAPI server
│   └── README.md         # Python backend setup instructions
│
├── data/                 # Snowflake setup files
│   ├── setup.sql         # Database setup script
│   └── customer_semantic_model.yaml
│
├── CORTEXAGENTS_RAP.ipynb  # Snowflake notebook for setup
└── README.md             # This file
```

## Key Features

### Frontend
✅ Real-time streaming responses using Server-Sent Events (SSE)
✅ Multi-format rendering: text, tables, charts, citations
✅ Modern React with TypeScript
✅ Responsive design with Tailwind CSS

### Backend (Both Implementations)
✅ Automatic SQL detection and execution
✅ SQL redaction before sending to frontend
✅ Row-level security via `SET TENANT` session variable
✅ Streaming SSE proxy from Snowflake
✅ Data-to-analytics chaining for visualizations
✅ Demo authentication with cookies

### Snowflake
✅ Cortex Agent with semantic models
✅ Row Access Policies for multi-tenant data
✅ Cortex Search for document retrieval
✅ Text-to-SQL, data-to-chart, and SQL execution tools

## Architecture Benefits

### Separation of Concerns
- **Frontend**: Pure UI/UX, no business logic
- **Backend**: Security, authentication, API orchestration
- **Snowflake**: Data, AI, and access control

### Security
- SQL never reaches the frontend
- Row-level security enforced in Snowflake
- Backend validates and controls all Snowflake access

### Flexibility
- Swap backends without changing frontend
- Easy to add new features to either tier
- Can deploy frontend and backend independently

### Scalability
- Frontend can be served from CDN
- Backend can scale horizontally
- Snowflake handles compute scaling automatically

## Backend Comparison

Both backends provide identical functionality. Choose based on your preference:

| Feature | Node.js | Python |
|---------|---------|--------|
| Framework | Express | FastAPI |
| Lines of Code | ~342 | ~565 |
| Type Safety | Optional (TypeScript) | Built-in (Pydantic) |
| API Docs | Manual | Auto-generated |
| Startup Time | ~1s | ~2s |
| Best For | JS teams, minimal deps | Python teams, type safety |

See [`BACKEND_COMPARISON.md`](BACKEND_COMPARISON.md) for detailed comparison.

## Development Workflow

1. **Make changes** to frontend or backend
2. **Hot reload** automatically refreshes (both frontend and backend support this)
3. **Test** with different demo users to verify row-level access
4. **Check logs** in backend terminal for debugging

## Production Deployment

### Frontend
```bash
cd frontend
pnpm build
pnpm start
# Or deploy to Vercel, Netlify, etc.
```

### Backend (Node.js)
```bash
cd backend
NODE_ENV=production node server.js
# Or use PM2, Docker, etc.
```

### Backend (Python)
```bash
cd backend_py
gunicorn server:app --workers 4 --worker-class uvicorn.workers.UvicornWorker
# Or use Docker, Kubernetes, etc.
```

**Important for Production**:
- Use HTTPS for all connections
- Configure CORS with specific production URLs
- Use proper secret management (not `.env` files)
- Enable rate limiting and request validation
- Set up monitoring and logging aggregation

## Troubleshooting

### Backend won't start
- Check `.env` file exists with correct Snowflake credentials
- Verify port 4000 is not in use
- Ensure all dependencies are installed

### Frontend can't reach backend
- Verify backend is running on port 4000
- Check `NEXT_PUBLIC_BACKEND_URL` in frontend `.env.local`
- Look for CORS errors in browser console

### Snowflake connection errors
- Verify `SNOWFLAKE_URL` and `SNOWFLAKE_PAT` are correct
- Check that PAT has necessary privileges
- Ensure warehouse is running

### Row-level security not working
- Verify Row Access Policies are created (run notebook)
- Check backend logs for `SET TENANT` statements
- Ensure username cookie is being set/sent

## Learning Resources

- [Snowflake Cortex Agents Documentation](https://docs.snowflake.com/en/user-guide/snowflake-cortex/cortex-agents)
- [Row Access Policies Guide](https://docs.snowflake.com/en/user-guide/security-row-intro)
- [Next.js Documentation](https://nextjs.org/docs)
- [Express.js Guide](https://expressjs.com/) (for Node.js backend)
- [FastAPI Documentation](https://fastapi.tiangolo.com/) (for Python backend)

## License

See LICENSE file for details.

## Support

For questions or issues:
1. Check the individual component READMEs (frontend, backend, backend_py)
2. Review the troubleshooting sections
3. Check Snowflake Cortex Agent documentation
4. Verify your setup matches the notebook output

---

Built with ❤️ to demonstrate production-ready patterns for Snowflake Cortex Agents with multi-tenant security.
