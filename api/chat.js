import { SYSTEM_PROMPT } from './knowledge.js';

const PRIMARY_MODEL = process.env.GROQ_MODEL || 'openai/gpt-oss-120b';
// A different model family than PRIMARY_MODEL, in case PRIMARY_MODEL itself gets
// retired or renamed (that happened once already — see graph.js history).
const FALLBACK_MODEL = 'openai/gpt-oss-20b';

// Primary key plus up to two backups. Tried in order; a key is only abandoned
// for the rest of this request (and the next one tries it again) on an
// auth/quota error (401/403/429) — a plain bad-request or 404 isn't the key's
// fault, so it doesn't burn a fallback.
const API_KEYS = [process.env.GROQ_API_KEY, process.env.GROQ_API_KEY_BACKUP_1, process.env.GROQ_API_KEY_BACKUP_2]
  .map(k => (k || '').trim())
  .filter(Boolean);

// Best-effort per-IP limit against spam/quota-draining, plus an off-topic
// strike count (see OFFTOPIC_STRIKE_LIMIT below). Both live in the same
// per-IP record. Serverless instances don't share memory, so under heavy
// traffic spread across many cold instances this under-counts rather than
// over-blocks — acceptable for a single event site; it is not an airtight
// distributed rate limit.
const RATE_LIMIT_MAX = Number(process.env.RATE_LIMIT_MAX) || 15;
const RATE_LIMIT_WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS) || 10 * 60 * 1000;
// Two off-topic replies in a row locks the IP out of further replies for a
// while — a much longer window than the rate limit, since it's a judgment
// call ("stop asking unrelated stuff") rather than plain request throttling.
const OFFTOPIC_STRIKE_LIMIT = Number(process.env.OFFTOPIC_STRIKE_LIMIT) || 2;
const OFFTOPIC_LOCKOUT_MS = Number(process.env.OFFTOPIC_LOCKOUT_MS) || 15 * 60 * 1000;
const sessions = new Map(); // ip -> { count, resetAt, offtopicStrikes, lockedUntil }

function getSession(ip) {
  const now = Date.now();
  if (sessions.size > 5000) {
    for (const [k, v] of sessions) if (now > v.resetAt && (!v.lockedUntil || now > v.lockedUntil)) sessions.delete(k);
  }
  let entry = sessions.get(ip);
  if (!entry) {
    entry = { count: 0, resetAt: now + RATE_LIMIT_WINDOW_MS, offtopicStrikes: 0, lockedUntil: 0 };
    sessions.set(ip, entry);
  } else if (now > entry.resetAt) {
    entry.count = 0;
    entry.resetAt = now + RATE_LIMIT_WINDOW_MS;
  }
  return entry;
}

function checkRateLimit(entry) {
  entry.count++;
  return { limited: entry.count > RATE_LIMIT_MAX, resetAt: entry.resetAt };
}

function getClientIp(req, isNode) {
  const raw = isNode ? req.headers?.['x-forwarded-for'] : req.headers?.get?.('x-forwarded-for');
  const first = (Array.isArray(raw) ? raw[0] : raw || '').split(',')[0].trim();
  if (first) return first;
  return (isNode && (req.socket?.remoteAddress || req.connection?.remoteAddress)) || 'unknown';
}

async function queryGroq(apiKey, model, messages) {
  return await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.35,
      max_tokens: 150,
    }),
  });
}

// Tries each key against each model (primary, then fallback) until one call
// succeeds. A 401/403/429 means the key itself is the problem, so the rest of
// that key's models are skipped and the next key is tried; anything else
// (e.g. a 404 on a retired model id) just moves on to the next model on the
// same key. Returns the last error info if every combination fails.
async function askGroq(messages) {
  const models = [PRIMARY_MODEL, FALLBACK_MODEL].filter((m, i, a) => a.indexOf(m) === i);
  let lastError = 'no Groq API key is configured';
  for (const apiKey of API_KEYS) {
    for (const model of models) {
      try {
        const res = await queryGroq(apiKey, model, messages);
        if (res.ok) {
          const data = await res.json().catch(() => ({}));
          const reply = data?.choices?.[0]?.message?.content?.trim();
          return { reply: reply || "Woof! I didn't catch that. Could you ask again?" };
        }
        const data = await res.json().catch(() => ({}));
        lastError = data?.error?.message || `Groq API responded with status ${res.status}`;
        console.error(`Groq error (model ${model}):`, lastError);
        if (res.status === 401 || res.status === 403 || res.status === 429) break; // next key
        // otherwise (e.g. 404 model not found): try the next model on this key
      } catch (err) {
        lastError = err.message || 'connection error';
        console.error('Labyrinth chat error:', err);
        break; // network-level failure — try the next key, not another model
      }
    }
  }
  return { error: lastError };
}

export default async function handler(req, res) {
  // Check whether this invocation is Node.js (req, res) or Web Standard (Request)
  const isNode = Boolean(res && typeof res.status === 'function');

  const sendResponse = (statusCode, payload, extraHeaders = {}) => {
    const headers = {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      ...extraHeaders,
    };
    if (isNode) {
      for (const [k, v] of Object.entries(headers)) {
        res.setHeader(k, v);
      }
      return res.status(statusCode).json(payload);
    }
    return new Response(JSON.stringify(payload), {
      status: statusCode,
      headers,
    });
  };

  // CORS preflight handling
  if (req.method === 'OPTIONS') {
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };
    if (isNode) {
      for (const [k, v] of Object.entries(corsHeaders)) {
        res.setHeader(k, v);
      }
      return res.status(204).end();
    }
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return sendResponse(405, { error: 'Method not allowed. Use POST.' });
  }

  const ip = getClientIp(req, isNode);
  const session = getSession(ip);

  // Locked out for spamming off-topic questions: no reply at all (the
  // frontend's generic "couldn't reach the assistant" fallback covers this),
  // so the chat genuinely stops responding to this IP until the lock expires.
  if (session.lockedUntil && Date.now() < session.lockedUntil) {
    // No `error` field either — the frontend's generic fallback message is the
    // point here, not an explanation; it should just look unresponsive.
    return sendResponse(403, {});
  }

  const { limited, resetAt } = checkRateLimit(session);
  if (limited) {
    const minutes = Math.max(1, Math.ceil((resetAt - Date.now()) / 60000));
    return sendResponse(429, {
      reply: `*pants* Slow down — even a good boy needs water breaks. Try again in about ${minutes} `
        + `minute${minutes === 1 ? '' : 's'}.`,
    });
  }

  // Parse JSON request body
  let body = req.body;
  if (!body && typeof req.json === 'function') {
    try {
      body = await req.json();
    } catch {
      body = {};
    }
  } else if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      body = {};
    }
  }

  const message = typeof body?.message === 'string' ? body.message.trim() : '';
  if (!message || message.length > 500) {
    return sendResponse(400, { error: 'Expected message between 1 and 500 characters.' });
  }

  const rawHistory = Array.isArray(body?.history) ? body.history : [];
  const history = rawHistory
    .filter(turn => turn && (turn.role === 'user' || turn.role === 'assistant') && typeof turn.content === 'string')
    .slice(-8)
    .map(turn => ({ role: turn.role, content: turn.content.trim().slice(0, 500) }));

  if (!API_KEYS.length) {
    // Same "hide the widget" signal as full exhaustion below — a visitor
    // doesn't need to see a message about missing Vercel env vars, and the
    // client never gets the detail either (server log only).
    console.error('No GROQ_API_KEY (or backups) configured.');
    return sendResponse(503, { unavailable: true });
  }

  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...history,
    { role: 'user', content: message },
  ];

  const result = await askGroq(messages);
  if (result.error) {
    // Every key and model combination failed — not a single user's problem,
    // the whole assistant is down. The frontend hides the widget on this
    // signal instead of showing a broken-looking bot to everyone. No `reply`
    // and no raw error detail in the response — that's server-log only, the
    // client never sees internals like status codes or provider error text.
    console.error('Labyrinth is fully unavailable:', result.error);
    return sendResponse(503, { unavailable: true });
  }

  let reply = result.reply;
  const isOfftopic = reply.startsWith('OFFTOPIC:');
  if (isOfftopic) {
    reply = reply.slice('OFFTOPIC:'.length).trim();
    session.offtopicStrikes++;
    if (session.offtopicStrikes >= OFFTOPIC_STRIKE_LIMIT) {
      session.lockedUntil = Date.now() + OFFTOPIC_LOCKOUT_MS;
      reply += ' (That\'s twice in a row now — I need a breather. Ask me something hackathon-related later!)';
    }
  } else {
    session.offtopicStrikes = 0;
  }
  return sendResponse(200, { reply });
}
