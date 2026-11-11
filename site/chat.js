// Labyrinth: a floating toggle (and, in the 3D world, Labyrinth himself — see
// world/build.js, which dispatches "open-labyrinth-chat" on click) opens a
// chat drawer that calls the api/chat.js serverless function. Stays hidden
// until home.config.js sets `agent.endpoint`.
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

// Questions offered as one-tap chips under the conversation.
const QUICK = [
  'When is check-in?',
  'What are the tracks?',
  'What can I win?',
  'Where is the venue?',
  'How do I register?',
];

// A question about one of these topics gets a "Show me" button under the
// answer that takes the visitor to the station: in 3D the player travels
// there (the dog follows), in the page view it opens that section. The
// first matching topic wins, so the more specific ones come first.
const TOPICS = [
  ['register', 'Register', /regist|\bsign ?up\b|\bapply\b|\benrol/i],
  ['prizes', 'Prizes', /prize|reward|\b(win|wins|winning|winners?|won)\b|\bcash\b|\bswag\b|troph/i],
  ['tracks', 'Tracks', /\btracks?\b|\btheme|\bdomains?\b|problem statement|categor/i],
  ['sponsors', 'Sponsors', /sponsor|\bpartners?\b/i],
  ['team', 'Team', /organi[sz]er|coordinator|core team|\bcontact\b/i],
  ['venue', 'Venue', /\bvenue|\bwhere\b|location|\breach\b|\bhall\b|campus|address|direction/i],
  ['schedule', 'Schedule', /schedule|\bwhen\b|\btimes?\b|check-?in|timeline|deadline|\bstarts?\b|\bends?\b|\bdates?\b|agenda/i],
  ['faq', 'FAQ', /\bfaq\b|\brules?\b|eligib|team size|\bcost|\bfees?\b|\bfree\b|\bbring\b|\bfood\b|\bstay\b|accommodation/i],
];
const topicOf = text => TOPICS.find(([, , re]) => re.test(text)) || null;

const $ = s => document.querySelector(s);

let wolfAudio = null;

function isSoundMuted() {
  if (window.__home?.sound) {
    return !window.__home.sound.on;
  }
  try {
    return localStorage.getItem('terryhome-sound') === 'off';
  } catch {
    return false;
  }
}

export function playWolfBark() {
  if (isSoundMuted()) return;
  try {
    if (!wolfAudio) {
      wolfAudio = new Audio('assets/sfx/wolf-bark.mp3');
      wolfAudio.volume = 0.75;
    }
    wolfAudio.currentTime = 0;
    wolfAudio.play().catch(() => {});
  } catch (err) {
    console.warn('Wolf bark sound error:', err);
  }
}

// Ensure wolf sound halts immediately if the visitor mutes sound
document.addEventListener('click', e => {
  if (e.target.closest('#soundButton')) {
    setTimeout(() => {
      if (isSoundMuted() && wolfAudio && !wolfAudio.paused) {
        wolfAudio.pause();
        wolfAudio.currentTime = 0;
      }
    }, 20);
  }
});

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
  let shuttingDown = false;

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

  // All configured API keys are exhausted (or none are configured) — this
  // isn't a per-visitor problem, so rather than show everyone a broken-looking
  // bot, say one last goodbye and disappear for the rest of this page load.
  // A fresh page load tries again from scratch, so it self-heals once fixed.
  function shutdown() {
    shuttingDown = true;
    bubble('assistant', "*flops over* I'm out of juice for right now — check back in a bit! 🐾");
    status.textContent = '';
    input.disabled = true;
    send.disabled = true;
    setTimeout(() => {
      close();
      root.hidden = true;
      panel.hidden = true;
    }, 2500);
  }

  toggle.addEventListener('click', () => {
    playWolfBark();
    (isOpen ? close() : open());
  });
  closeBtn.addEventListener('click', close);
  document.addEventListener('open-labyrinth-chat', () => {
    playWolfBark();
    open();
  });
  panel.querySelector('.agent-chat-title-row')?.addEventListener('click', playWolfBark);
  document.addEventListener('keydown', e => { if (isOpen && e.key === 'Escape') close(); });

  function bubble(role, text) {
    const p = document.createElement('p');
    p.className = `agent-chat-msg ${role}`;
    p.textContent = text;
    log.append(p);
    log.scrollTop = log.scrollHeight;
  }

  // "Show me" under an answer. A plain #link, so the page view's own link
  // handling opens the section; in 3D it travels to the station instead.
  function showMe([id, label]) {
    const a = document.createElement('a');
    a.className = 'agent-chat-go';
    a.href = `#${id}`;
    a.textContent = `🐾 Show me ${label}`;
    a.addEventListener('click', e => {
      const h = window.__home;
      if (h?.go && !document.body.classList.contains('plain')) {
        e.preventDefault();
        h.go(id);
      }
      close();
    });
    log.append(a);
    log.scrollTop = log.scrollHeight;
  }

  // One-tap questions: each sends its text exactly as if typed.
  const chips = document.createElement('div');
  chips.className = 'agent-chat-chips';
  chips.setAttribute('aria-label', 'Suggested questions');
  for (const q of QUICK) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = q;
    chips.append(b);
  }
  chips.addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b || pending || shuttingDown) return;
    input.value = b.textContent;
    form.requestSubmit();
  });
  form.before(chips);

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
      if (data?.unavailable) {
        shutdown();
        return;
      }
      // A reply string is shown as-is even on a non-200 (e.g. 429 rate limit) —
      // the backend still sends an in-character message for those.
      if (typeof data.reply !== 'string') {
        throw new Error(data.error || (res.status === 404 ? 'Assistant endpoint not found' : 'bad response'));
      }
      bubble('assistant', data.reply);
      if (res.ok) {
        const topic = topicOf(message);
        if (topic) showMe(topic);
      }
      history = [...history, { role: 'assistant', content: data.reply }].slice(-MAX_HISTORY);
      status.textContent = '';
    } catch (err) {
      status.textContent = err?.message && err.message !== 'bad response'
        ? err.message
        : "Couldn't reach the assistant. Try again in a moment.";
    } finally {
      pending = false;
      if (!shuttingDown) {
        input.disabled = false;
        send.disabled = false;
        input.focus({ preventScroll: true });
      }
    }
  }

  form.addEventListener('submit', submit);
  for (const icon of [$('#agentChatIcon'), $('#agentChatPanelIcon')]) {
    if (icon) icon.src = ICON;
  }
  root.hidden = false;
}
