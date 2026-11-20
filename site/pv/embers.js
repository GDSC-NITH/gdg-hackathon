// Drifting embers and ash over the whole page: one small 2D canvas, about
// 28 particles on desktop, redrawn at about 30 fps.
// Off when motion is reduced.
import { onFrame, onLite, state, reduced } from './scroll.js';

export function initEmbers(root) {
  // Off on phones: a full-screen layer redrawn every frame, and the hero video carries its own embers.
  if (reduced || matchMedia('(hover: none) and (max-width: 760px)').matches) return;
  const canvas = document.createElement('canvas');
  canvas.className = 'pv-embers';
  canvas.setAttribute('aria-hidden', 'true');
  root.append(canvas);
  const ctx = canvas.getContext('2d');
  const small = Math.min(innerWidth, innerHeight) < 700;
  const N = small ? 12 : 28;
  // Soft dots need no high-DPI canvas; 1x clears and composites about half the pixels of 1.5x each frame.
  const dpr = 1;
  let w = 0, h = 0;
  const size = () => {
    w = innerWidth; h = innerHeight;
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  size();
  addEventListener('resize', size);
  const COLORS = ['255,138,61', '255,200,97', '255,90,31', '79,209,197'];
  const P = Array.from({ length: N }, () => spawn({}, true));
  function spawn(p, anywhere = false) {
    p.x = Math.random() * w;
    p.y = anywhere ? Math.random() * h : h + 10;
    p.r = 0.6 + Math.random() * 1.8;
    p.v = 14 + Math.random() * 40;
    p.sway = Math.random() * Math.PI * 2;
    p.c = COLORS[Math.random() < 0.12 ? 3 : (Math.random() * 3) | 0];
    p.a = 0.25 + Math.random() * 0.55;
    p.ash = Math.random() < 0.25;
    return p;
  }
  let lastY = 0, acc = 0;
  const stop = onFrame(dt => {
    if (document.hidden) return;
    acc += dt;
    if (acc < 1 / 32) return;
    dt = acc; acc = 0;
    const scrollDy = state.y - lastY; lastY = state.y;
    ctx.clearRect(0, 0, w, h);
    for (const p of P) {
      p.sway += dt * 1.3;
      p.y -= p.v * dt + scrollDy * 0.15 * (p.r / 2);
      p.x += Math.sin(p.sway) * 12 * dt;
      if (p.y < -10 || p.y > h + 20) spawn(p);
      const flick = 0.75 + Math.sin(p.sway * 3) * 0.25;
      if (p.ash) {
        ctx.fillStyle = `rgba(170,160,150,${p.a * 0.35})`;
        ctx.fillRect(p.x, p.y, p.r * 1.4, p.r * 1.4);
      } else if (Math.abs(state.vy) > 700) {
        // Fast scrolling stretches embers into streaks.
        ctx.strokeStyle = `rgba(${p.c},${p.a * flick})`;
        ctx.lineWidth = p.r * 1.4;
        ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x, p.y + Math.max(-60, Math.min(60, state.vy * 0.025 * p.r))); ctx.stroke();
      } else {
        ctx.fillStyle = `rgba(${p.c},${p.a * flick})`;
        ctx.fillRect(Math.round(p.x), Math.round(p.y), p.r * 1.5, p.r * 1.5);
      }
    }
  });
  // Lite mode (scroll.js): a full-screen layer redrawn every frame is the first thing to go.
  onLite(() => { stop(); canvas.remove(); });
}
