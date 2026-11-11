// Local stand-in for Vercel's serverless function runtime: loads .env and
// serves api/chat.js's real handler over plain HTTP, so `python3 tools/serve.py`
// (which proxies /api/chat here — see serve.py) exercises the exact same code
// that's deployed, not a separate reimplementation. Only run via serve.py;
// not part of the Vercel build.
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const envPath = path.join(root, '.env');
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2];
  }
}

const { default: handler } = await import(pathToFileURL(path.join(root, 'api', 'chat.js')).href);

const server = createServer(async (req, httpRes) => {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const rawBody = Buffer.concat(chunks).toString('utf8');

  let statusCode = 200;
  const headers = {};
  const res = {
    setHeader: (k, v) => { headers[k] = v; },
    status(code) { statusCode = code; return this; },
    json(payload) {
      httpRes.writeHead(statusCode, { ...headers, 'Content-Type': 'application/json' });
      httpRes.end(JSON.stringify(payload));
    },
    end() { httpRes.writeHead(statusCode, headers); httpRes.end(); },
  };
  const fakeReq = { method: req.method, headers: req.headers, body: rawBody };
  try {
    await handler(fakeReq, res);
  } catch (err) {
    console.error('dev-api error:', err);
    httpRes.writeHead(500, { 'Content-Type': 'application/json' });
    httpRes.end(JSON.stringify({ error: 'dev-api crash' }));
  }
});

const port = Number(process.env.DEV_API_PORT) || 8788;
server.listen(port, '127.0.0.1', () => console.log(`dev-api on :${port}`));
