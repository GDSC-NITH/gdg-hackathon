import { SYSTEM_PROMPT } from './knowledge.js';

const PRIMARY_MODEL = process.env.GROQ_MODEL || 'openai/gpt-oss-120b';
const FALLBACK_MODEL = 'llama-3.3-70b-versatile';

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
      temperature: 0.2,
      max_tokens: 150,
    }),
  });
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

  const apiKey = (process.env.GROQ_API_KEY || '').trim();
  if (!apiKey) {
    return sendResponse(200, {
      reply: "Woof! I'm Labyrinth 🐾 — I'm ready to answer your questions about the hackathon, but my GROQ_API_KEY hasn't been configured in Vercel's Environment Variables yet. Add GROQ_API_KEY in your Vercel Project Settings to activate my brain!",
    });
  }

  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...history,
    { role: 'user', content: message },
  ];

  try {
    let groqRes = await queryGroq(apiKey, PRIMARY_MODEL, messages);

    // If primary model returns 404, fallback to secondary model
    if (!groqRes.ok && groqRes.status === 404 && PRIMARY_MODEL !== FALLBACK_MODEL) {
      console.warn(`Primary model ${PRIMARY_MODEL} returned 404, trying ${FALLBACK_MODEL}`);
      groqRes = await queryGroq(apiKey, FALLBACK_MODEL, messages);
    }

    const data = await groqRes.json().catch(() => ({}));
    if (!groqRes.ok) {
      const errMsg = data?.error?.message || `Groq API responded with status ${groqRes.status}`;
      console.error('Groq API error:', errMsg);
      return sendResponse(200, {
        reply: `*whine* I had trouble reaching Groq: ${errMsg}. Please verify your API key and model quota.`,
      });
    }

    const reply = data?.choices?.[0]?.message?.content?.trim() || "Woof! I didn't catch that. Could you ask again?";
    return sendResponse(200, { reply });
  } catch (err) {
    console.error('Labyrinth chat error:', err);
    return sendResponse(200, {
      reply: `*whine* Something went wrong while thinking: ${err.message || 'connection error'}. Please try again!`,
    });
  }
}
