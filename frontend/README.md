# Frontend - Next.js Application

## Overview

This is a Next.js React application that provides a chat interface for interacting with Snowflake Cortex Agents. The frontend handles user authentication, displays streaming responses from the agent, and renders various content types including text, tables, charts, and citations. It communicates with a backend server (either Node.js or Python) that proxies requests to Snowflake.

The frontend is designed to work seamlessly with either backend implementation without any code changes. All Snowflake-specific logic, authentication, and SQL execution are handled by the backend, keeping the frontend focused purely on UI/UX concerns.

Built with modern React patterns including hooks, streaming Server-Sent Events (SSE), and a component-based architecture, the frontend provides real-time feedback as the agent processes queries and generates responses.

## Prerequisites

- Node.js 20+ (20.x or 22.x recommended)
- pnpm (preferred) or npm

## Installation

Install dependencies using pnpm:

```bash
cd frontend
pnpm install
```

Or using npm:

```bash
cd frontend
npm install
```

## Configuration

Create a `.env.local` file in the `frontend` directory:

```bash
# Backend API URL
NEXT_PUBLIC_BACKEND_URL=http://localhost:4000
```

You can copy the example:

```bash
cp env.local.example .env.local
```

**Note**: The `NEXT_PUBLIC_BACKEND_URL` should point to whichever backend you choose to run (Node.js or Python).

## Running the Frontend

Start the development server:

```bash
pnpm dev
```

Or with npm:

```bash
npm run dev
```

The frontend will be available at `http://localhost:3000`.

## Project Structure

```
frontend/
├── app/
│   ├── components/       # React components for chat UI
│   ├── functions/        # Utility functions
│   ├── login/           # Login page
│   └── page.tsx         # Main chat page
├── lib/
│   ├── agent-api/       # Agent API integration
│   └── auth/            # Authentication utilities
└── .env.local          # Environment configuration
```

## Key Features

- **Real-time Streaming**: Server-Sent Events (SSE) for live response streaming
- **Multi-format Rendering**: Text, tables, charts, SQL results, and citations
- **Demo Authentication**: Cookie-based login with demo users
- **Responsive Design**: Modern UI with Tailwind CSS
- **Type Safety**: TypeScript throughout for better development experience

## Demo Users

The default demo users are defined in the backend's `users.json` file:

- **Alice**, **Bob**, **Charlie**

Password for each user is the same as their username (e.g., username: `Alice`, password: `Alice`).

**To add or modify users**: Edit the `users.json` file in your chosen backend directory (`backend/users.json` or `backend_py/users.json`) and restart the backend server.

## Development

The frontend uses hot module replacement (HMR), so changes are reflected immediately without manual refresh. The application will automatically reconnect to the backend if the connection is lost.

For production builds:

```bash
pnpm build
pnpm start
```

## Troubleshooting

**Backend connection errors**
- Verify backend is running on port 4000
- Check `NEXT_PUBLIC_BACKEND_URL` in `.env.local`
- Ensure CORS is properly configured in backend

**Module not found errors**
- Delete `.next` folder and `node_modules`
- Run `pnpm install` again
- Restart development server

