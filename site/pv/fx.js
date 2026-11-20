// Reusable page-view effects: reveal on scroll, split headings, text
// scramble, count-ups, pointer tilt and magnetic buttons.
import { reduced } from './scroll.js';

const $$ = (s, r = document) => [...r.querySelectorAll(s)];
// Sets an element's text by editing its text node in place. textContent
// replaces the node, which is a tree change; counters do this every frame.
export function setText(el, text) {
  const t = el.firstChild;
  if (t && t === el.lastChild && t.nodeType === 3) { if (t.data !== text) t.data = text; }
  else el.textContent = text;
}
const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;

// Headings: words, then characters, each in a span the CSS can stagger.
export function split(root) {
  for (const h of $$('[data-split]', root)) {
    if (h.dataset.splitDone) continue;
    const text = h.textContent.trim();
    h.setAttribute('aria-label', text);
    let i = 0;
    h.innerHTML = text.split(/(\s+)/).map(w => /^\s+$/.test(w) ? ' ' :
      `<span class="pv-w" aria-hidden="true">${[...w].map(ch => `<span class="pv-ch" style="--c:${i++}">${ch.replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]))}</span>`).join('')}</span>`).join('');
    h.dataset.splitDone = '1';
    h.dataset.r = h.dataset.r || 'chars';
  }
}

// Text that decodes from random glyphs into its real value.
const GLYPHS = '▓▒░█<>/\\|=+*#%@$&ABCDEFGHJKLMNPQRSTUVWXYZ0123456789';
export function scramble(el, { duration = 600 } = {}) {
  const final = el.dataset.final || (el.dataset.final = el.textContent);
  if (reduced) { el.textContent = final; return; }
  const start = performance.now();
  const step = now => {
    const t = Math.min(1, (now - start) / duration);
    const shown = Math.floor(final.length * t);
    let out = final.slice(0, shown);
    const edge = Math.min(shown + 3, final.length);
    for (let i = shown; i < edge; i++) out += final[i] === ' ' ? ' ' : GLYPHS[(Math.random() * GLYPHS.length) | 0];
    setText(el, out + final.slice(edge));
    if (t < 1) setTimeout(() => requestAnimationFrame(step), 65); else setText(el, final);
  };
  requestAnimationFrame(step);
}

// Counts the digits inside a value up from zero, keeping its prefix, suffix
// and grouping style ("₹1,50,000", "300+", "24h").
export function countUp(el, { duration = 1400, onDone } = {}) {
  const final = el.dataset.final || (el.dataset.final = el.textContent.trim());
  const m = final.match(/^(\D*?)([\d,]+)(.*)$/);
  if (!m || reduced) { el.textContent = final; onDone?.(); return; }
  const [, pre, digits, post] = m;
  const target = +digits.replace(/,/g, '');
  const indian = /\d,\d{2},\d{3}/.test(digits);
  const fmt = n => !digits.includes(',') ? String(n) : n.toLocaleString(indian ? 'en-IN' : 'en-US');
  const start = performance.now();
  const step = now => {
    const t = Math.min(1, (now - start) / duration);
    const e = 1 - Math.pow(1 - t, 4);
    setText(el, pre + fmt(Math.round(target * e)) + post);
    if (t < 1) requestAnimationFrame(step); else onDone?.();
  };
  requestAnimationFrame(step);
}

// Adds .in when an element scrolls into view, once. Stagger index comes from
// --i, or from the element's position inside a [data-stagger] parent.
export function reveal(root) {
  for (const parent of $$('[data-stagger]', root)) {
    $$('[data-r]', parent).forEach((el, i) => { if (!el.style.getPropertyValue('--i')) el.style.setProperty('--i', i); });
  }
  const els = $$('[data-r], [data-count], [data-scramble], [data-in], .pv-sec', root);
  if (reduced || !('IntersectionObserver' in window)) {
    for (const el of els) { el.classList.add('in'); if (el.matches('[data-count]')) el.textContent = el.textContent; }
    return;
  }
  const io = new IntersectionObserver(entries => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      const el = e.target;
      el.classList.add('in');
      if (el.matches('[data-count]')) countUp(el, { onDone: () => el.classList.add('counted') });
      if (el.matches('[data-scramble]')) scramble(el);
      io.unobserve(el);
    }
  }, { rootMargin: '0px 0px -10% 0px', threshold: 0.12 });
  for (const el of els) io.observe(el);
}

// Pointer-driven 3D tilt with a spotlight (--mx/--my), desktop only.
export function tilt(root) {
  if (!fine || reduced) return;
  for (const el of $$('[data-tilt]', root)) {
    let raf = 0, px = 0.5, py = 0.5;
    const apply = () => {
      raf = 0;
      el.style.setProperty('--mx', `${px * 100}%`);
      el.style.setProperty('--my', `${py * 100}%`);
      el.style.setProperty('--rx', `${(0.5 - py) * 7}deg`);
      el.style.setProperty('--ry', `${(px - 0.5) * 9}deg`);
    };
    el.addEventListener('pointermove', e => {
      const r = el.getBoundingClientRect();
      px = (e.clientX - r.left) / r.width; py = (e.clientY - r.top) / r.height;
      if (!raf) raf = requestAnimationFrame(apply);
      el.classList.add('is-hover');
    });
    el.addEventListener('pointerleave', () => {
      el.classList.remove('is-hover');
      el.style.setProperty('--rx', '0deg'); el.style.setProperty('--ry', '0deg');
    });
  }
}

// A soft ember glow that trails the pointer (desktop). One composited layer,
// moved with a transform, so it never repaints the page.
export function glow(root) {
  if (!fine || reduced) return;
  const el = document.createElement('i');
  el.className = 'pv-cursor';
  el.setAttribute('aria-hidden', 'true');
  root.append(el);
  let x = innerWidth / 2, y = innerHeight / 2, tx = x, ty = y, raf = 0;
  const step = () => {
    x += (tx - x) * 0.14; y += (ty - y) * 0.14;
    el.style.transform = `translate3d(${x - 260}px, ${y - 260}px, 0)`;
    raf = Math.abs(tx - x) + Math.abs(ty - y) > 0.5 ? requestAnimationFrame(step) : 0;
  };
  addEventListener('pointermove', e => {
    tx = e.clientX; ty = e.clientY;
    el.classList.add('on');
    if (!raf) raf = requestAnimationFrame(step);
  }, { passive: true });
  document.addEventListener('pointerleave', () => el.classList.remove('on'));
}

// A light ripple from the point where a button is pressed (all pointers).
export function ripple(root) {
  if (reduced) return;
  root.addEventListener('pointerdown', e => {
    const btn = e.target.closest('.pv-btn, .pv-tabs button, .pv-top, #pv form .mc-button');
    if (!btn) return;
    const r = btn.getBoundingClientRect();
    const dot = document.createElement('span');
    dot.className = 'pv-ripple';
    dot.style.left = `${e.clientX - r.left}px`;
    dot.style.top = `${e.clientY - r.top}px`;
    btn.append(dot);
    dot.addEventListener('animationend', () => dot.remove(), { once: true });
  });
}

// Buttons lean towards the pointer.
export function magnetic(root) {
  if (!fine || reduced) return;
  for (const el of $$('.pv-btn', root)) {
    el.addEventListener('pointermove', e => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left - r.width / 2) / r.width, y = (e.clientY - r.top - r.height / 2) / r.height;
      el.style.transform = `translate(${x * 8}px, ${y * 8}px)`;
    });
    el.addEventListener('pointerleave', () => { el.style.transform = ''; });
  }
}

// An 8×8 pixel portrait from a name: hair, skin and eyes picked by hash.
const SKIN = ['#f6c9a2', '#e0ac85', '#c68863', '#9a6544', '#7a4b2f'];
const HAIR = ['#1f1611', '#3b2416', '#6b3b1c', '#14110f', '#8a4a1f', '#2a2a33'];
const HOOD = ['#ff5a1f', '#4fd1c5', '#6b2fd1', '#ffc861', '#e8461a', '#2c2c34'];
export function portrait(canvas, name) {
  let h = 2166136261;
  for (const ch of name) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
  const pick = (arr, s) => arr[(h >>> s) % arr.length];
  const skin = pick(SKIN, 3), hair = pick(HAIR, 7), hood = pick(HOOD, 11);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = skin; ctx.fillRect(0, 0, 8, 8);
  ctx.fillStyle = hair; ctx.fillRect(0, 0, 8, 2 + (h & 1)); ctx.fillRect(0, 2, 1, 3); ctx.fillRect(7, 2, 1, 3);
  if (h & 4) { ctx.fillRect(1, 2, 2, 1); }
  ctx.fillStyle = '#fff'; ctx.fillRect(1, 4, 2, 1); ctx.fillRect(5, 4, 2, 1);
  ctx.fillStyle = '#16120f'; ctx.fillRect(h & 8 ? 2 : 1, 4, 1, 1); ctx.fillRect(h & 8 ? 6 : 5, 4, 1, 1);
  ctx.fillStyle = '#b06a58'; ctx.fillRect(3, 6, 2, 1);
  ctx.fillStyle = hood; ctx.fillRect(0, 7, 2, 1); ctx.fillRect(6, 7, 2, 1);
}
