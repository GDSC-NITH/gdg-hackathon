// Page view (?plain, the default landing page, or when the 3D world can't
// start). site/pv/ builds a separate single-page site from the cards in
// #pages; the 3D view's markup is left as it is. See site/pv/build.js.
import { config } from '@engine/config.js';
import { build } from './pv/build.js';
import { split, reveal, tilt, magnetic, glow, ripple } from './pv/fx.js';
import { initHero } from './pv/hero.js';
import { initSections } from './pv/sections.js';
import { initEmbers } from './pv/embers.js';
import { measure, kick, reduced } from './pv/scroll.js';

export function initPageView() {
  if (document.getElementById('pv')) return;
  // As the landing page (?plain) the page sits under a loading screen until it is
  // ready; as the 3D view's fallback it shows at once.
  const booting = document.documentElement.classList.contains('pv-boot');
  if (booting) document.documentElement.classList.add('pv-loading');
  const { root } = build({ mail: config.mailbox?.email || '' });
  document.body.classList.add('pv-on');
  // pv.css styles <html> by this class; html:has(body.pv-on) made every DOM
  // change (even a counter's text) re-check the root's style.
  document.documentElement.classList.add('pv-page');
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
  // Section positions are measured once and reused while scrolling. Re-measure
  // when the page view changes height (web fonts arriving, images, the past-events
  // rail sizing itself) and once the fonts are in: <html> keeps a fixed height,
  // so a watcher on it alone never fires. The resize event also refreshes the
  // modules that cache sizes.
  new ResizeObserver(() => { measure(); kick(); }).observe(root);
  document.fonts?.ready.then(() => dispatchEvent(new Event('resize')));

  // The loading screen fades over the painted hero. Fonts and video may arrive
  // later, including when the browser requires a gesture before playing video.
  if (booting) {
    document.documentElement.style.setProperty('--pct', '100');
    document.documentElement.classList.remove('pv-loading');
    document.body.classList.add('pv-ready');
    setTimeout(() => document.body.classList.add('pv-done'), 400);
  }

  if (reduced) return;
  // On short hero layouts the first character is already on screen. Give the
  // title and buttons their entrance before starting the runner's GPU work.
  const introEnd = performance.now() + 800;
  const startRunner = () => import('./pv/mascot.js')
    .then(m => m.initMascot(root, { skin: config.skin }))
    .then(api => { window.__pv = { mascot: api }; })
    .catch(err => console.warn('Page view runner:', err));

  // Observe every station, including the one at a restored scroll position.
  const nearStage = new IntersectionObserver(entries => {
    if (!entries.some(entry => entry.isIntersecting)) return;
    nearStage.disconnect();
    const delay = scrollY === 0 ? Math.max(0, introEnd - performance.now()) : 0;
    setTimeout(startRunner, delay);
  }, { rootMargin: '64px 0px' });
  root.querySelectorAll('[data-slot]').forEach(slot => nearStage.observe(slot));
}
