// Hero section: pixel font canvas rendering, event countdown timer, and show/hide state.
import { pixelText, textWidth } from '@engine/world/pixel-text.js';

const $ = s => document.querySelector(s);
const body = document.body;
const hero = $('#hero');
const logo = hero?.querySelector('.hero-logo');
const count = hero?.querySelector('.hero-count');
const go = hero?.querySelector('.hero-go');
const starts = Date.parse(hero?.dataset.starts || '');
const ends = Date.parse(hero?.dataset.ends || '');

let heroOn = false;

export function isHeroOn() {
  return heroOn;
}

export function showHero() {
  heroOn = true;
  body.classList.add('hero-on');
}

export function hideHero(onDismiss) {
  if (!heroOn) return;
  heroOn = false;
  body.classList.remove('hero-on');
  window.__home?.rig.skipIntro();
  onDismiss?.();
}

export function drawLogo(plain) {
  if (!logo) return;
  const text = logo.dataset.text || 'LABYRINTH';
  const scale = 8;
  const w = textWidth(text, scale) + scale;
  const h = 7 * scale + scale;
  logo.width = w;
  logo.height = h;
  const ctx = logo.getContext('2d');
  pixelText(ctx, text, scale, scale, scale, plain ? '#9fc28f' : '#1c140a');
  pixelText(ctx, text, 0, 0, scale, plain ? '#2f5b46' : '#f6e7b8');
}

export function initHero({ onExplore, onDismiss }) {
  drawLogo(false);

  function tick() {
    if (!count || Number.isNaN(starts)) return;
    const now = Date.now();
    if (now >= starts) {
      count.innerHTML = `<p>${!Number.isNaN(ends) && now >= ends ? 'That’s a wrap. Thanks for building with us!' : 'Hacking is live right now.'}</p>`;
      return;
    }
    const s = Math.floor((starts - now) / 1000);
    const parts = [
      [Math.floor(s / 86400), 'days'],
      [Math.floor(s / 3600) % 24, 'hours'],
      [Math.floor(s / 60) % 60, 'min'],
      [s % 60, 'sec'],
    ];
    count.innerHTML = parts.map(([n, l]) => `<div><b>${String(n).padStart(2, '0')}</b>${l}</div>`).join('');
  }
  tick();
  setInterval(tick, 1000);

  go?.addEventListener('click', () => {
    if (body.classList.contains('plain')) {
      location.href = $('[data-mode]').href;
    } else {
      hideHero(onDismiss);
      onExplore?.();
    }
  });

  addEventListener('keydown', e => {
    if (heroOn && window.__home && /^(Escape|Enter|Space|Key[WASD]|Arrow)/.test(e.code) && !e.target.closest?.('a, button, input, textarea')) {
      hideHero(onDismiss);
      onExplore?.();
    }
  });
}

export function updateHeroProgress(loadedPercent) {
  if (go) {
    go.textContent = `Loading the island… ${loadedPercent}%`;
  }
}

export function enableHeroExplore() {
  if (go) {
    go.disabled = false;
    go.textContent = '▶ Explore the island';
  }
}
