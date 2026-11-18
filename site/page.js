// Page view (?plain, the default landing page, or when the 3D world can't
// start). site/pv/ builds a separate single-page site from the cards in
// #pages; the 3D view's markup is left as it is. See site/pv/build.js.
import { config } from '@engine/config.js';
import { build } from './pv/build.js';
import { split, reveal, tilt, magnetic, glow, ripple } from './pv/fx.js';
import { initHero } from './pv/hero.js';
import { initSections } from './pv/sections.js';
import { initEmbers } from './pv/embers.js';
import { measure, kick } from './pv/scroll.js';

export function initPageView() {
  if (document.getElementById('pv')) return;
  const { root } = build({ mail: config.mailbox?.email || '' });
  document.body.classList.add('pv-on');
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', '#0b0807');
  split(root);
  reveal(root);
  tilt(root);
  magnetic(root);
  glow(root);
  ripple(root);
  initHero(root);
  initSections(root);
  initEmbers(root);
  measure(); kick();

  // The runner loads last: it is decoration, and the page works without it.
  const start = () => import('./pv/mascot.js')
    .then(m => m.initMascot(root, { skin: config.skin }))
    .then(api => { window.__pv = { mascot: api }; })
    .catch(err => console.warn('Page view runner:', err));
  if (document.readyState === 'complete') setTimeout(start, 300);
  else addEventListener('load', () => setTimeout(start, 300), { once: true });
}
