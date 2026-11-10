import { Router } from 'express';
import { z } from 'zod';
import { askAgent } from '../graph.js';

const Turn = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().trim().min(1).max(500),
});

const ChatRequest = z.object({
  message: z.string().trim().min(1).max(500),
  history: z.array(Turn).max(8).optional().default([]),
});

export const chatRouter = Router();

chatRouter.post('/chat', async (req, res) => {
  const parsed = ChatRequest.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Expected { message: string, history?: {role, content}[] }.' });
    return;
  }
  const { message, history } = parsed.data;
  const reply = await askAgent(message, history);
  res.json({ reply });
});
