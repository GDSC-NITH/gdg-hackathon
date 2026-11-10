import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { chatRouter } from './agent/src/routes/chat.js';

if (!process.env.GROQ_API_KEY) {
  console.error('Missing GROQ_API_KEY. Copy .env.example to .env and set it.');
  process.exit(1);
}

const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

if (!allowedOrigins.length) {
  console.warn('ALLOWED_ORIGINS is unset — reflecting all origins. Set it before deploying.');
}

const app = express();
app.use(express.json({ limit: '32kb' }));
app.use(cors({ origin: allowedOrigins.length ? allowedOrigins : true }));

app.get('/api/health', (req, res) => res.json({ ok: true }));
app.use('/api', chatRouter);

app.use((req, res) => res.status(404).json({ error: 'Not found' }));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'The assistant is unavailable right now.' });
});

const port = Number(process.env.PORT) || 8787;
app.listen(port, () => console.log(`Labyrinth agent listening on :${port}`));
