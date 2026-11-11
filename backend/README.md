# Labyrinth AI Assistant Backend & API

Labyrinth is the Doberman mascot for the hackathon, providing real-time AI assistance regarding tracks, schedules, prizes, venue details, and FAQs.

## Architecture

1. **Vercel Serverless Function (`api/chat.js`)**:
   - Deployed automatically by Vercel when the site is hosted or previewed.
   - Listens on `/api/chat` on the same origin (no CORS or Mixed Content issues).
   - Uses native `fetch` to query Groq's OpenAI-compatible API without heavyweight runtime dependencies.
   - Grounded strictly on hackathon facts in `api/knowledge.js`.

2. **Local Express Server (`backend/server.js`)**:
   - For standalone backend development or running alongside the frontend.
   - Listens on `http://localhost:8787/api/chat`.

3. **Local Dev Server Proxy (`tools/serve.py`)**:
   - When running `python tools/serve.py`, requests to `/api/chat` are automatically handled:
     - Proxied to local Express server on `:8787` if active.
     - Direct query to Groq if `GROQ_API_KEY` is present in `backend/.env` or environment.
     - Returns helpful setup guidance if neither is configured.

## Setting Up GROQ_API_KEY

### On Vercel (Preview & Production):
1. Go to your project on the [Vercel Dashboard](https://vercel.com).
2. Navigate to **Settings** -> **Environment Variables**.
3. Add:
   - `GROQ_API_KEY`: Your Groq API key (starts with `gsk_...`).
   - *(Optional)* `GROQ_MODEL`: Default is `openai/gpt-oss-120b` (with automatic fallback to `llama-3.3-70b-versatile`).
4. Trigger a redeploy (or push a commit) to apply the variable.

### Locally:
1. Copy `.env.example` to `backend/.env`:
   ```bash
   cp backend/.env.example backend/.env
   ```
2. Add your Groq key:
   ```env
   GROQ_API_KEY=gsk_...
   ```
3. Run `python tools/serve.py` or start the Express server:
   ```bash
   cd backend
   npm install
   npm start
   ```
