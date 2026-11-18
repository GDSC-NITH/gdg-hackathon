// Page-view hero: background loop, pixel wordmark, countdown, scroll parallax.
import { pixelText, textWidth } from '@engine/world/pixel-text.js';
import { onFrame, reduced, state } from './scroll.js';

const TALL = '(max-aspect-ratio: 4/5)';

// ---------- Background loop ----------
// The poster (CSS) shows first. The video is fetched after the page has
// loaded, only when it can autoplay without costing a slow or saving visitor.
function startVideo(hero) {
  const video = hero.querySelector('video');
  const media = hero.querySelector('.pv-hero-media');
  if (!video) return;
  const conn = navigator.connection || {};
  if (reduced || conn.saveData || /(^|-)2g$/.test(conn.effectiveType || '')) return;

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
  const play = () => video.play()?.catch(() => {});
  video.addEventListener('playing', () => media.classList.add('is-playing'), { once: true });
  tall.addEventListener?.('change', load);

  // Pause off-screen and in background tabs.
  let visible = true;
  new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    if (visible && !document.hidden) play(); else video.pause();
  }).observe(hero);
  document.addEventListener('visibilitychange', () => { if (document.hidden) video.pause(); else if (visible) play(); });

  const go = () => (window.requestIdleCallback || (f => setTimeout(f, 200)))(load, { timeout: 1500 });
  if (document.readyState === 'complete') go(); else addEventListener('load', go, { once: true });
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

  if (reduced) { draw(99); return; }
  const start = performance.now();
  const intro = now => {
    const t = (now - start) / 1000;
    draw(t);
    if (t < 1.4) requestAnimationFrame(intro);
    else { draw(99); setTimeout(sweep, 2200); }
  };
  requestAnimationFrame(intro);

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

export function initHero(root) {
  const hero = root.querySelector('.pv-hero');
  if (!hero) return;
  startVideo(hero);
  wordmark(hero.querySelector('.pv-wordmark canvas'));
  const count = hero.querySelector('.pv-count');
  if (count) countdown(count);
  requestAnimationFrame(() => hero.classList.add('is-ready'));

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
  if (fine) hero.addEventListener('pointermove', e => { tpx = e.clientX / innerWidth - 0.5; tpy = e.clientY / innerHeight - 0.5; });
  hero.addEventListener('pointerleave', () => { tpx = tpy = 0; });
  let shown = -1, k = 0, spx = 9, spy = 9;
  onFrame(dt => {
    const target = Math.min(1, Math.max(0, state.y / Math.max(1, hero.offsetHeight)));
    k += (target - k) * Math.min(1, dt * 10);
    px += (tpx - px) * Math.min(1, dt * 5); py += (tpy - py) * Math.min(1, dt * 5);
    const moved = Math.abs(k - shown) > 0.0005 || Math.abs(px - spx) + Math.abs(py - spy) > 0.0008;
    if (!moved || k > 1.01) return;
    shown = k; spx = px; spy = py;
    media.style.transform = `scale(${1.04 + k * 0.35}) translate3d(${(px * -16).toFixed(2)}px, ${(py * -10).toFixed(2)}px, 0)`;
    media.style.filter = k > 0.002 ? `saturate(1.22) contrast(1.08) brightness(${(1.06 - k * 0.6).toFixed(3)})` : '';
    inner.style.transform = `translate3d(0, ${k * -18}vh, 0) scale(${1 - k * 0.08})`;
    inner.style.opacity = String(Math.max(0, 1 - k * 1.6));
    if (mark) mark.style.transform = `perspective(900px) rotateX(${(py * -9).toFixed(2)}deg) rotateY(${(px * 12).toFixed(2)}deg) translate3d(${(px * 14).toFixed(1)}px, ${(py * 8).toFixed(1)}px, 0)`;
    for (const [el, d] of layers) if (el) el.style.translate = `${(px * d).toFixed(1)}px ${(py * d * 0.6).toFixed(1)}px`;
    if (cue) cue.style.opacity = String(Math.max(0, 1 - k * 5));
  });
}
