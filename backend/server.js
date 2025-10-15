import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import { createHash, createPrivateKey, createPublicKey } from 'crypto';
import fs from 'fs';
import path from 'path';
import { events } from 'fetch-event-stream';
import yaml from 'js-yaml';

dotenv.config();

const app = express();
const port = process.env.BACKEND_PORT || 4000;

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(cookieParser());

// =============================================================================
// Configuration
// =============================================================================

// Load agent model configuration from YAML file
const AGENT_MODEL_CONFIG = yaml.load(fs.readFileSync(path.join(process.cwd(), 'agent_model.yaml'), 'utf-8'));

const STATEMENT_PARAMETERS = {
  BINARY_OUTPUT_FORMAT: 'HEX',
  DATE_OUTPUT_FORMAT: 'YYYY-Mon-DD',
  TIME_OUTPUT_FORMAT: 'HH24:MI:SS',
  TIMESTAMP_LTZ_OUTPUT_FORMAT: '',
  TIMESTAMP_NTZ_OUTPUT_FORMAT: 'YYYY-MM-DD HH24:MI:SS.FF3',
  TIMESTAMP_TZ_OUTPUT_FORMAT: '',
  TIMESTAMP_OUTPUT_FORMAT: 'YYYY-MM-DD HH24:MI:SS.FF3 TZHTZM',
  TIMEZONE: 'America/Los_Angeles',
};

// =============================================================================
// Helper Functions
// =============================================================================

function getSnowflakeAuthHeaders(authToken) {
  return {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'Authorization': `Bearer ${authToken}`
  };
}

function createSSEWriter(res) {
  return (eventName, dataObj) => {
    if (eventName) res.write(`event: ${eventName}\n`);
    const dataStr = dataObj === '[DONE]' ? dataObj : JSON.stringify(dataObj);
    res.write(`data: ${dataStr}\n\n`);
  };
}

function shouldSkipEvent(event, payload) {
  if (event.event === 'execution_trace') return true;
  if (payload?.delta?.content && Array.isArray(payload.delta.content) && payload.delta.content.length === 0) return true;
  return false;
}

function extractSQLFromPayload(payload) {
  return payload?.delta?.content?.[1]?.tool_results?.content?.[0]?.json;
}

async function executeSQL(snowflakeUrl, authToken, sql, username) {
  const tenantSql = username ? `SET TENANT = '${username}' ->> ${sql}` : sql;
  const stmtPayload = {
    statement: tenantSql,
    warehouse: process.env.SNOWFLAKE_WAREHOUSE || 'MULTISALES_WH',
    parameters: STATEMENT_PARAMETERS
  };

  console.log('[SNOWFLAKE REQUEST] /api/v2/statements');
  const stmtResp = await fetch(`${snowflakeUrl}/api/v2/statements`, {
    method: 'POST',
    headers: getSnowflakeAuthHeaders(authToken),
    body: JSON.stringify(stmtPayload),
  });
  console.log('[SNOWFLAKE RESPONSE] /api/v2/statements status', stmtResp.status);
  return await stmtResp.json();
}

async function getSQLResults(snowflakeUrl, authToken, statementHandle) {
  console.log(`[SNOWFLAKE REQUEST] /api/v2/statements/${statementHandle}`);
  const sqlResultsResp = await fetch(`${snowflakeUrl}/api/v2/statements/${statementHandle}`, {
    method: 'GET',
    headers: getSnowflakeAuthHeaders(authToken),
  });
  console.log(`[SNOWFLAKE RESPONSE] /api/v2/statements/${statementHandle} status`, sqlResultsResp.status);
  return await sqlResultsResp.json();
}

function createAgentRequestBody(messages) {
  // Clone the agent model config and add messages
  return {
    ...structuredClone(AGENT_MODEL_CONFIG),
    messages
  };
}

async function streamData2Analytics(snowflakeUrl, authToken, messages, assistantMessageContent, statementHandle, writeSSE) {
  const assistantMessage = { role: 'assistant', content: assistantMessageContent };
  const sqlExecMessage = {
    role: 'user',
    content: [{
      type: 'tool_results',
      tool_results: {
        name: 'sql_exec',
        content: [{ type: 'json', json: { query_id: statementHandle } }]
      }
    }]
  };

  const data2AnalyticsBody = createAgentRequestBody([...messages, assistantMessage, sqlExecMessage]);

  console.log('[SNOWFLAKE REQUEST] /api/v2/cortex/agent:run (data-to-analytics)');
  const data2AnalyticsResp = await fetch(`${snowflakeUrl}/api/v2/cortex/agent:run`, {
    method: 'POST',
    headers: { ...getSnowflakeAuthHeaders(authToken), 'Accept': 'text/event-stream' },
    body: JSON.stringify(data2AnalyticsBody),
  });
  console.log('[SNOWFLAKE RESPONSE] /api/v2/cortex/agent:run (data-to-analytics) status', data2AnalyticsResp.status);

  // Stream data-to-analytics events to frontend
  const data2AnalyticsEvents = events(data2AnalyticsResp);
  for await (const d2aEvent of data2AnalyticsEvents) {
    if (d2aEvent.data === '[DONE]') break;
    if (d2aEvent.event === 'execution_trace') continue;

    let d2aPayload;
    try { d2aPayload = JSON.parse(d2aEvent.data || '{}'); } catch { d2aPayload = d2aEvent.data; }

    if (d2aPayload?.delta?.content && Array.isArray(d2aPayload.delta.content) && d2aPayload.delta.content.length === 0) {
      continue;
    }
    
    writeSSE(d2aEvent.event, d2aPayload);
  }
}

// =============================================================================
// Authentication Routes
// =============================================================================

app.post('/auth/login', async (req, res) => {
  const { username, password } = req.body || {};
  
  if (!username || !password) {
    return res.status(401).json({ ok: false, error: 'Invalid credentials' });
  }
  
  try {
    const snowflakeUrl = process.env.SNOWFLAKE_URL;
    const authToken = process.env.SNOWFLAKE_PAT || '';
    const database = process.env.SNOWFLAKE_DATABASE || 'MULTISALES';
    const schema = process.env.SNOWFLAKE_SCHEMA || 'DATA';
    
    // Query Snowflake to validate user credentials
    const query = `SELECT userid FROM ${database}.${schema}.users WHERE userid = '${username}' AND password = '${password}'`;
    const response = await fetch(`${snowflakeUrl}/api/v2/statements`, {
      method: 'POST',
      headers: getSnowflakeAuthHeaders(authToken),
      body: JSON.stringify({
        statement: query,
        warehouse: process.env.SNOWFLAKE_WAREHOUSE || 'MULTISALES_WH',
      }),
    });
    
    const result = await response.json();
    
    // Check if user was found
    if (result.data && result.data.length === 1) {
      // Valid user found
      res.cookie('demo_username', encodeURIComponent(username), { httpOnly: false, sameSite: 'lax', maxAge: 7 * 24 * 60 * 60 * 1000, path: '/' });
      return res.json({ ok: true });
    } else {
      // No user found or multiple users (shouldn't happen)
      return res.status(401).json({ ok: false, error: 'Invalid credentials' });
    }
  } catch (e) {
    console.error('[LOGIN ERROR]', e);
    return res.status(500).json({ ok: false, error: 'Login failed' });
  }
});

app.post('/auth/logout', (_req, res) => {
  res.cookie('demo_username', '', { maxAge: 0, path: '/', httpOnly: false });
  res.json({ ok: true });
});

// JWT for Snowflake key-pair auth
app.get('/api/jwt', (_req, res) => {
  try {
    const rsaKey = process.env.SNOWFLAKE_RSA_KEY || fs.readFileSync(path.join(process.cwd(), 'rsa_key.p8'));
    const privateKey = createPrivateKey(rsaKey);
    const publicKey = createPublicKey(privateKey);
    const publicKeyRaw = publicKey.export({ type: 'spki', format: 'der' });
    const sha256Hash = createHash('sha256').update(publicKeyRaw).digest('base64');
    const publicKeyFp = 'SHA256:' + sha256Hash;

    const account = (process.env.SNOWFLAKE_ACCOUNT || '').toUpperCase();
    const user = (process.env.SNOWFLAKE_USER || '').toUpperCase();
    const qualifiedUsername = `${account}.${user}`;

    const now = Math.floor(Date.now() / 1000);
    const exp = now + 60 * 60; // 1 hour
    const payload = { iss: `${qualifiedUsername}.${publicKeyFp}`, sub: qualifiedUsername, iat: now, exp };
    const token = jwt.sign(payload, Buffer.isBuffer(rsaKey) ? rsaKey.toString() : rsaKey, { algorithm: 'RS256' });
    res.json({ token: { token, expiresAt: exp - 120 } });
  } catch (e) {
    res.status(500).json({ error: e?.message || 'Failed to generate JWT' });
  }
});

// =============================================================================
// Snowflake Agent Proxy
// =============================================================================

app.post('/api/agent/run', async (req, res) => {
  try {
    const snowflakeUrl = process.env.SNOWFLAKE_URL;
    if (!snowflakeUrl) return res.status(500).json({ error: 'Missing SNOWFLAKE_URL' });

    const { messages } = req.body || {};
    if (!Array.isArray(messages)) return res.status(400).json({ error: 'messages required' });

    const authToken = process.env.SNOWFLAKE_PAT || '';
    const username = decodeURIComponent(req.cookies?.demo_username || '');

    // Call Snowflake Agent API
    console.log('[SNOWFLAKE REQUEST] /api/v2/cortex/agent:run');
    const response = await fetch(`${snowflakeUrl}/api/v2/cortex/agent:run`, {
      method: 'POST',
      headers: { ...getSnowflakeAuthHeaders(authToken), 'Accept': 'text/event-stream' },
      body: JSON.stringify(createAgentRequestBody(messages)),
    });
    console.log('[SNOWFLAKE RESPONSE] /api/v2/cortex/agent:run status', response.status);

    // Setup SSE response
    res.status(response.status);
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const writeSSE = createSSEWriter(res);
    const streamEvents = events(response);
    let sqlDetected = false;
    const assistantMessageContent = [];

    // Process Snowflake agent stream
    for await (const event of streamEvents) {
      if (event.data === '[DONE]') {
        if (!sqlDetected) writeSSE('done', '[DONE]');
        break;
      }

      let payload;
      try { payload = JSON.parse(event.data || '{}'); } catch { payload = event.data; }

      if (shouldSkipEvent(event, payload)) continue;

      // Accumulate assistant message content for context (excluding sql_exec tool_use)
      if (payload?.delta?.content) {
        payload.delta.content.forEach(contentItem => {
          if (contentItem?.tool_use?.name !== 'sql_exec') {
            assistantMessageContent.push(contentItem);
          }
        });
      }

      // Check for SQL in tool_results
      const toolResultJson = extractSQLFromPayload(payload);
      const sql = toolResultJson?.sql;

      if (sql) {
        sqlDetected = true;
        console.log('[BACKEND] SQL detected, executing and streaming data-to-analytics');

        // Send analyst text if present
        if (toolResultJson?.text) {
          writeSSE('message.delta', {
            id: "msg_000",
            object: "message.delta",
            delta: { content: [{ type: 'text', text: toolResultJson.text + '\n\n---\n\n' }] }
          });
        }

        // Execute SQL and get results
        const stmtJson = await executeSQL(snowflakeUrl, authToken, sql, username);
        const statementHandle = stmtJson.statementHandles?.at(-1) || stmtJson.statementHandle;
        writeSSE('table_result', stmtJson);

        // Signal new assistant message and stream data-to-analytics
        writeSSE('new_assistant_message', { message: 'Starting data-to-analytics' });
        await streamData2Analytics(snowflakeUrl, authToken, messages, assistantMessageContent, statementHandle, writeSSE);

        // Redact SQL before forwarding
        try { if (payload?.delta?.content?.[1]?.tool_results?.content?.[0]?.json?.sql) { payload.delta.content[1].tool_results.content[0].json.sql = 'REDACTED'; } } catch {}
      } else {
        // Forward non-SQL events
        writeSSE(event.event, payload);
      }
    }

    // Send final DONE if SQL was executed
    if (sqlDetected) writeSSE('done', '[DONE]');
    res.end();
  } catch (e) {
    console.error('[BACKEND ERROR]', e);
    if (res.headersSent) {
      try {
        createSSEWriter(res)('error', { error: e?.message || 'Agent proxy failed' });
        res.end();
      } catch {}
    } else {
      res.status(500).json({ error: e?.message || 'Agent proxy failed' });
    }
  }
});

// =============================================================================
// Snowflake Statements Proxy (for direct SQL execution if needed)
// =============================================================================

app.post('/api/statements', async (req, res) => {
  try {
    const snowflakeUrl = process.env.SNOWFLAKE_URL;
    if (!snowflakeUrl) return res.status(500).json({ error: 'Missing SNOWFLAKE_URL' });
    const { statement } = req.body || {};
    if (typeof statement !== 'string' || !statement.trim()) return res.status(400).json({ error: 'statement required' });

    const authToken = process.env.SNOWFLAKE_PAT || '';
    const response = await fetch(`${snowflakeUrl}/api/v2/statements`, {
      method: 'POST',
      headers: getSnowflakeAuthHeaders(authToken),
      body: JSON.stringify({
        statement,
        warehouse: process.env.SNOWFLAKE_WAREHOUSE || 'MULTISALES_WH',
        parameters: STATEMENT_PARAMETERS
      }),
    });

    res.status(response.status);
    res.setHeader('Content-Type', response.headers.get('content-type') || 'application/json');
    if (response.body) {
      for await (const chunk of response.body) {
        res.write(chunk);
      }
    }
    res.end();
  } catch (e) {
    res.status(500).json({ error: e?.message || 'Statements proxy failed' });
  }
});

app.listen(port, () => {
  console.log(`Backend listening on http://localhost:${port}`);
});
