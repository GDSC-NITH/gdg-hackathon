// Page-view hero: background loop, pixel wordmark, countdown, scroll parallax.
import { pixelText, textWidth } from '@engine/world/pixel-text.js';
import { onFrame, reduced, state } from './scroll.js';

const TALL = '(max-aspect-ratio: 4/5)';

// ---------- Background loop ----------
// The poster (CSS) shows first. The video is skipped for reduced motion and
// for visitors saving data or on 2G. Returns a promise that settles once the
// video plays, or straight away when it is skipped or refused (the loading
// screen waits on it). `now` starts it at once; otherwise after page load.
function startVideo(hero, now) {
  const video = hero.querySelector('video');
  const media = hero.querySelector('.pv-hero-media');
  let settle;
  const ready = new Promise(r => { settle = r; });
  if (!video) { settle(); return ready; }
  const conn = navigator.connection || {};
  if (reduced || conn.saveData || /(^|-)2g$/.test(conn.effectiveType || '')) { settle(); return ready; }

  const tall = matchMedia(TALL);
  let variant = '';
  const load = () => {
    const next = tall.matches ? 'tall' : 'wide';
    if (next === variant) return;
    variant = next;
    video.innerHTML = `<source src="assets/hero/bg-${next}.webm" type="video/webm"><source src="assets/hero/bg-${next}.mp4" type="video/mp4">`;
    video.load();
    play();
  };
  // A refused play() (autoplay blocked until a gesture) settles too: the poster stays.
  const play = () => { const p = video.play(); if (p) p.catch(() => settle()); };
  video.addEventListener('playing', () => { media.classList.add('is-playing'); settle(); }, { once: true });
  tall.addEventListener?.('change', load);

  // Pause off-screen and in background tabs.
  let visible = true;
  new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    if (visible && !document.hidden) play(); else video.pause();
  }).observe(hero);
  document.addEventListener('visibilitychange', () => { if (document.hidden) video.pause(); else if (visible) play(); });

  // Keep the loop running. Phones can stop a muted loop: power saving pauses it,
  // the jump back to the start stalls, or autoplay waits for a gesture. While the
  // hero is on screen, check once a second and restart it if it has stopped.
  let lastT = -1, still = 0;
  video.addEventListener('ended', () => { video.currentTime = 0; play(); });
  setInterval(() => {
    if (!variant || !visible || document.hidden || video.readyState < 2) return;
    if (video.paused) { play(); return; }
    if (video.currentTime === lastT) {
      if (++still >= 2) { still = 0; video.currentTime = (video.currentTime + 0.05) % (video.duration || 1); play(); }
    } else still = 0;
    lastT = video.currentTime;
  }, 1000);
  // Autoplay refused (iPhone Low Power Mode): the first touch or scroll starts it.
  for (const type of ['touchstart', 'pointerdown', 'scroll']) addEventListener(type, () => { if (variant && visible && video.paused) play(); }, { passive: true, once: true });

  if (now) load();
  else {
    const go = () => (window.requestIdleCallback || (f => setTimeout(f, 200)))(load, { timeout: 1500 });
    if (document.readyState === 'complete') go(); else addEventListener('load', go, { once: true });
  }
  return ready;
}

// ---------- Wordmark ----------
// Pixel letters with a lava gradient face and a dark extrusion. On load the
// pixels drop into place column by column; afterwards a heat shimmer passes
// across every few seconds.
function wordmark(canvas, text = 'LABYRINTH') {
  const S = 10, DEPTH = 3;
  const w = textWidth(text, 1) + 1, h = 8;
  const off = new OffscreenCanvasOr(w, h);
  pixelText(off.ctx, text, 0, 0, 1, '#000');
  const data = off.ctx.getImageData(0, 0, w, h).data;
  const cells = [];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (data[(y * w + x) * 4 + 3] > 0) cells.push({ x, y, d: x * 0.022 + Math.random() * 0.18 });

  canvas.width = (w + DEPTH) * S;
  canvas.height = (h + DEPTH + 1) * S;
  const ctx = canvas.getContext('2d');
  const faceGrad = ctx.createLinearGradient(0, 0, 0, h * S);
  faceGrad.addColorStop(0, '#fff1c9');
  faceGrad.addColorStop(0.35, '#ffc861');
  faceGrad.addColorStop(0.62, '#ff8a3d');
  faceGrad.addColorStop(1, '#e2401c');
  const sideGrad = ctx.createLinearGradient(0, 0, 0, (h + DEPTH) * S);
  sideGrad.addColorStop(0, '#5a1a0c');
  sideGrad.addColorStop(1, '#1d0905');

  function draw(t, shimmer = -1) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const c of cells) {
      const k = Math.min(1, Math.max(0, (t - c.d) / 0.45));
      if (k <= 0) continue;
      const e = 1 - Math.pow(1 - k, 3);
      const dy = (1 - e) * -6 * S;
      const px = c.x * S, py = c.y * S + dy;
      ctx.globalAlpha = Math.min(1, k * 2);
      // Extrusion: stacked darker copies down and to the right.
      ctx.fillStyle = sideGrad;
      for (let d = DEPTH; d >= 1; d--) ctx.fillRect(px + d * S * 0.5, py + d * S * 0.6, S, S);
      ctx.fillStyle = faceGrad;
      ctx.fillRect(px, py, S, S);
      // Lava seam: a thin bright line along the top of each pixel row.
      ctx.fillStyle = 'rgba(255,240,200,.55)';
      ctx.fillRect(px, py, S, 1.5);
      if (shimmer >= 0) {
        const near = 1 - Math.min(1, Math.abs(c.x - shimmer) / 5);
        if (near > 0) { ctx.fillStyle = `rgba(255,250,225,${near * 0.75})`; ctx.fillRect(px, py, S, S); }
      }
    }
    ctx.globalAlpha = 1;
  }

  if (reduced) { draw(99); return () => {}; }
  let start = 0;
  const intro = now => {
    const t = (now - start) / 1000;
    draw(t);
    if (t < 1.4) requestAnimationFrame(intro);
    else { draw(99); setTimeout(sweep, 2200); }
  };
  return () => { if (start) return; start = performance.now(); requestAnimationFrame(intro); };

  function sweep() {
    if (document.hidden || state.y > state.vh) { setTimeout(sweep, 3000); return; }
    const s0 = performance.now();
    const run = now => {
      const k = (now - s0) / 1100;
      draw(99, -6 + k * (w + 12));
      if (k < 1) requestAnimationFrame(run); else { draw(99); setTimeout(sweep, 4200); }
    };
    requestAnimationFrame(run);
  }
}

function OffscreenCanvasOr(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return { canvas: c, ctx: c.getContext('2d', { willReadFrequently: true }) };
}

// ---------- Countdown ----------
function countdown(el) {
  const starts = Date.parse(el.dataset.starts || ''), ends = Date.parse(el.dataset.ends || '');
  if (Number.isNaN(starts)) { el.remove(); return; }
  const units = [['days', 86400], ['hours', 3600], ['min', 60], ['sec', 1]];
  el.innerHTML = units.map(([l]) => `<div class="pv-unit"><b><span>00</span></b><small>${l}</small></div>`).join('');
  const spans = [...el.querySelectorAll('b span')];
  const tick = () => {
    const now = Date.now();
    if (now >= starts) {
      el.innerHTML = `<p class="pv-live">${!Number.isNaN(ends) && now >= ends ? 'That’s a wrap. Thanks for building with us!' : '● Hacking is live right now'}</p>`;
      return;
    }
    let s = Math.floor((starts - now) / 1000);
    units.forEach(([, size], i) => {
      const v = String(i === 0 ? Math.floor(s / size) : Math.floor(s / size) % (i === 1 ? 24 : 60)).padStart(2, '0');
      if (spans[i].textContent !== v) {
        spans[i].textContent = v;
        if (!reduced) { spans[i].classList.remove('flip'); void spans[i].offsetWidth; spans[i].classList.add('flip'); }
      }
    });
    setTimeout(tick, 1000 - (now % 1000));
  };
  tick();
}

// Returns { video, start }: video settles when the background loop plays (or is
// skipped); start() plays the hero's intro. With `now`, the video loads at once.
export function initHero(root, { now = false } = {}) {
  const hero = root.querySelector('.pv-hero');
  if (!hero) return { video: Promise.resolve(), start() {} };
  const video = startVideo(hero, now);
  const mark = wordmark(hero.querySelector('.pv-wordmark canvas'));
  const count = hero.querySelector('.pv-count');
  if (count) countdown(count);
  const start = () => { mark(); requestAnimationFrame(() => hero.classList.add('is-ready')); };
  initParallax(hero);
  return { video, start };
}

function initParallax(hero) {
  // Scrolling away flies the camera into the vanishing point.
  const media = hero.querySelector('.pv-hero-media');
  const inner = hero.querySelector('.pv-hero-inner');
  const cue = hero.querySelector('.pv-cue');
  if (reduced) return;
  // Pointer parallax (desktop): the layers move by depth, the wordmark tilts towards the cursor.
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const mark = hero.querySelector('.pv-wordmark canvas');
  const layers = [[hero.querySelector('.pv-eyebrow'), 10], [hero.querySelector('.pv-count'), 9], [hero.querySelector('.pv-hero-cta'), 6]];
  let px = 0, py = 0, tpx = 0, tpy = 0;
  // Scrolling away dims the clip with a black layer's opacity. Changing the
  // clip's own filter every frame re-filtered the full-screen video each time.
  const dim = document.createElement('i');
  dim.className = 'pv-hero-dim';
  dim.setAttribute('aria-hidden', 'true');
  media.append(dim);
  if (fine) hero.addEventListener('pointermove', e => { tpx = e.clientX / innerWidth - 0.5; tpy = e.clientY / innerHeight - 0.5; });
  hero.addEventListener('pointerleave', () => { tpx = tpy = 0; });
  let shown = -1, k = 0, spx = 9, spy = 9, heroH = hero.offsetHeight;
  addEventListener('resize', () => { heroH = hero.offsetHeight; });
  onFrame(dt => {
    if (state.y > heroH * 1.2 && shown > 0.99) return;
    const target = Math.min(1, Math.max(0, state.y / Math.max(1, heroH)));
    k += (target - k) * Math.min(1, dt * 10);
    px += (tpx - px) * Math.min(1, dt * 5); py += (tpy - py) * Math.min(1, dt * 5);
    const moved = Math.abs(k - shown) > 0.0005 || Math.abs(px - spx) + Math.abs(py - spy) > 0.0008;
    if (!moved || k > 1.01) return;
    shown = k; spx = px; spy = py;
    media.style.transform = `scale(${1.04 + k * 0.35}) translate3d(${(px * -16).toFixed(2)}px, ${(py * -10).toFixed(2)}px, 0)`;
    // brightness(1.06 - 0.6k) on top of the CSS filter, as a black overlay.
    dim.style.opacity = (k * 0.6 / 1.06).toFixed(3);
    inner.style.transform = `translate3d(0, ${k * -18}vh, 0) scale(${1 - k * 0.08})`;
    inner.style.opacity = String(Math.max(0, 1 - k * 1.6));
    if (mark) mark.style.transform = `perspective(900px) rotateX(${(py * -9).toFixed(2)}deg) rotateY(${(px * 12).toFixed(2)}deg) translate3d(${(px * 14).toFixed(1)}px, ${(py * 8).toFixed(1)}px, 0)`;
    for (const [el, d] of layers) if (el) el.style.translate = `${(px * d).toFixed(1)}px ${(py * d * 0.6).toFixed(1)}px`;
    if (cue) cue.style.opacity = String(Math.max(0, 1 - k * 5));
  });
}
