// One animation-frame loop for the whole page view.
//
// track(el, cb): cb(p, raw, info) every frame while `el` is near the screen.
// raw is 0 when the element's top reaches the top of the viewport and 1 when
// its bottom reaches the bottom (the pinned range of a sticky stage). p is raw
// eased towards on every frame, which gives scrubbed motion its smoothness
// without taking over the browser's own scrolling.
// onFrame(cb): cb(dt, state) every frame. state = { y, vy, vh, vw, dir }.

const state = { y: 0, vy: 0, vh: innerHeight, vw: innerWidth, dir: 0, docH: 1 };
const tracks = [];
const frames = new Set(), reads = new Set();
let last = performance.now(), lastY = scrollY, running = false, idle = 0;

export const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
export { state };

function measure() {
  state.vh = innerHeight; state.vw = innerWidth;
  state.docH = Math.max(1, document.documentElement.scrollHeight - state.vh);
  for (const t of tracks) {
    const r = t.el.getBoundingClientRect();
    t.top = r.top + scrollY; t.h = r.height;
  }
}

export function track(el, cb, { margin = 1 } = {}) {
  const t = { el, cb, top: 0, h: 1, p: 0, raw: 0, margin, init: false };
  tracks.push(t);
  const r = el.getBoundingClientRect();
  t.top = r.top + scrollY; t.h = r.height;
  kick();
  return t;
}

export function onFrame(cb) { frames.add(cb); kick(); return () => frames.delete(cb); }
// onRead(cb): cb() at the start of every frame, before tracks and onFrame callbacks write styles.
export function onRead(cb) { reads.add(cb); kick(); return () => reads.delete(cb); }

function tick(now) {
  const dt = Math.min(0.05, (now - last) / 1000 || 0.016);
  last = now;
  for (const f of reads) f();
  const y = scrollY;
  const dy = y - lastY; lastY = y;
  state.y = y;
  state.vy += ((dy / Math.max(dt, 0.001)) - state.vy) * Math.min(1, dt * 10);
  if (Math.abs(dy) > 0.5) state.dir = Math.sign(dy);
  const k = reduced ? 1 : 1 - Math.exp(-dt * 9);
  let busy = Math.abs(state.vy) > 2;
  for (const t of tracks) {
    const span = Math.max(1, t.h - state.vh);
    const raw = (y - t.top) / span;
    const near = y + state.vh * (1 + t.margin) > t.top && y - state.vh * t.margin < t.top + t.h;
    if (!near && t.init) continue;
    t.raw = Math.min(1, Math.max(0, raw));
    const before = t.p;
    t.p = t.init ? t.p + (t.raw - t.p) * k : t.raw;
    t.init = true;
    if (Math.abs(t.p - t.raw) > 0.0005) busy = true;
    if (Math.abs(t.p - before) > 0.00001 || !t.drawn) { t.cb(t.p, raw, t); t.drawn = true; }
  }
  for (const f of frames) if (f(dt, state) === true) busy = true;
  idle = busy ? 0 : idle + dt;
  if (idle < 0.5 || frames.size) requestAnimationFrame(tick); else running = false;
}

function kick() {
  if (running || document.hidden) return;
  running = true; last = performance.now();
  requestAnimationFrame(tick);
}

addEventListener('scroll', kick, { passive: true });
addEventListener('resize', () => { measure(); kick(); });
document.addEventListener('visibilitychange', () => { if (!document.hidden) kick(); });
new ResizeObserver(() => { measure(); kick(); }).observe(document.documentElement);
export { measure, kick };

// Smooth scroll to an element or the top; native smooth scrolling, offset for the bar.
export function goTo(target, { instant = false } = {}) {
  const el = typeof target === 'string' ? document.getElementById(target) : target;
  const top = !el || el.id === 'top' ? 0 : el.getBoundingClientRect().top + scrollY - (el.dataset.offset ? +el.dataset.offset : 72);
  scrollTo({ top: Math.max(0, top), behavior: instant || reduced ? 'auto' : 'smooth' });
}
