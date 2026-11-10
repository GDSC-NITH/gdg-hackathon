// Labyrinth: a floating toggle (and, in the 3D world, Labyrinth himself — see
// world/build.js, which dispatches "open-labyrinth-chat" on click) opens a
// chat drawer that calls backend/agent. Stays hidden until home.config.js
// sets `agent.endpoint`. See backend/README.md.
import { config } from '@engine/config.js';

const ENDPOINT = (config.agent?.endpoint || '').trim();
const ICON = config.agent?.icon || 'assets/labyrinth-icon.svg';
const ICEBREAKERS = [
  "Woof! I'm Labyrinth — yes, named after the maze, no, I didn't design it, I just patrol it now. Ask me "
    + "about tracks, schedule, prizes, venue, whatever — I've sniffed out the whole syllabus. 🐾",
  "Hey, I'm Labyrinth. Good boy, better mascot, mediocre maze architect. Got questions about the hackathon? "
    + "I'm basically a search engine that also wants belly rubs.",
  "*tail wag* Labyrinth here — I live on this island and I know every station. I'll even tell you when "
    + "hacking starts, if you ask nicely. Go on, ask.",
  "Woof woof — that's dog for \"hello, I'm Labyrinth.\" I've read the whole hackathon syllabus so you don't "
    + "have to. Ask away.",
  "I'm Labyrinth, resident Doberman and self-appointed hackathon concierge. I know the schedule, the prizes, "
    + "the tracks — basically everything except how to stop chasing my tail.",
  "Sniff sniff... you smell like someone with hackathon questions. I'm Labyrinth — ask me about tracks, "
    + "prizes, schedule, whatever's on your mind.",
];
const MAX_LEN = 500;
const MAX_HISTORY = 8;

const $ = s => document.querySelector(s);

export function initChat() {
  const root = $('#agentChat');
  const panel = $('#agentChatPanel');
  if (!root || !panel || !ENDPOINT) return;

  const toggle = $('#agentChatToggle');
  const closeBtn = panel.querySelector('.agent-chat-close');
  const log = panel.querySelector('.agent-chat-log');
  const form = panel.querySelector('.agent-chat-form');
  const input = form.elements.message;
  const send = form.querySelector('button');
  const status = panel.querySelector('.agent-chat-status');

  let history = [];
  let pending = false;
  let isOpen = false;
  let greeted = false;

  function open() {
    if (isOpen) return;
    isOpen = true;
    panel.classList.add('open');
    panel.setAttribute('aria-hidden', 'false');
    toggle.setAttribute('aria-expanded', 'true');
    if (!greeted) {
      greeted = true;
      bubble('assistant', ICEBREAKERS[Math.floor(Math.random() * ICEBREAKERS.length)]);
    }
    requestAnimationFrame(() => input.focus({ preventScroll: true }));
  }
  function close() {
    if (!isOpen) return;
    isOpen = false;
    panel.classList.remove('open');
    panel.setAttribute('aria-hidden', 'true');
    toggle.setAttribute('aria-expanded', 'false');
  }

  toggle.addEventListener('click', () => (isOpen ? close() : open()));
  closeBtn.addEventListener('click', close);
  document.addEventListener('open-labyrinth-chat', open);
  document.addEventListener('keydown', e => { if (isOpen && e.key === 'Escape') close(); });

  function bubble(role, text) {
    const p = document.createElement('p');
    p.className = `agent-chat-msg ${role}`;
    p.textContent = text;
    log.append(p);
    log.scrollTop = log.scrollHeight;
  }

  async function submit(e) {
    e.preventDefault();
    if (pending) return;
    const message = input.value.trim();
    if (!message || message.length > MAX_LEN) return;

    bubble('user', message);
    const turnsSoFar = history.slice(-MAX_HISTORY);
    history = [...turnsSoFar, { role: 'user', content: message }].slice(-MAX_HISTORY);
    input.value = '';
    input.disabled = true;
    send.disabled = true;
    pending = true;
    status.textContent = 'Thinking…';

    try {
      const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, history: turnsSoFar }),
        signal: AbortSignal.timeout(20000),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || typeof data.reply !== 'string') throw new Error(data.error || 'bad response');
      bubble('assistant', data.reply);
      history = [...history, { role: 'assistant', content: data.reply }].slice(-MAX_HISTORY);
      status.textContent = '';
    } catch {
      status.textContent = "Couldn't reach the assistant. Try again in a moment.";
    } finally {
      pending = false;
      input.disabled = false;
      send.disabled = false;
      input.focus({ preventScroll: true });
    }
  }

  form.addEventListener('submit', submit);
  for (const icon of [$('#agentChatIcon'), $('#agentChatPanelIcon')]) {
    if (icon) icon.src = ICON;
  }
  root.hidden = false;
}
