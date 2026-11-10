
import { ChatGroq } from '@langchain/groq';
import { StateGraph, StateSchema, MessagesValue, START, END } from '@langchain/langgraph';
import { SYSTEM_PROMPT } from './knowledge.js';

const model = new ChatGroq({
  apiKey: process.env.GROQ_API_KEY,
  model: process.env.GROQ_MODEL || 'openai/gpt-oss-120b',
  temperature: 0.2,
  maxTokens: 150,
});

const State = new StateSchema({ messages: MessagesValue });

async function answer(state) {
  const response = await model.invoke([{ role: 'system', content: SYSTEM_PROMPT }, ...state.messages]);
  return { messages: [response] };
}

const agent = new StateGraph(State)
  .addNode('answer', answer)
  .addEdge(START, 'answer')
  .addEdge('answer', END)
  .compile();

export async function askAgent(message, history = []) {
  const result = await agent.invoke({ messages: [...history, { role: 'user', content: message }] });
  const reply = result.messages.at(-1);
  return reply?.text ?? String(reply?.content ?? '');
}
