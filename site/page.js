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
  // As the landing page (?plain) the page sits under a loading screen until it is
  // ready; as the 3D view's fallback it shows at once.
  const booting = document.documentElement.classList.contains('pv-boot');
  if (booting) document.documentElement.classList.add('pv-loading');
  const { root } = build({ mail: config.mailbox?.email || '' });
  document.body.classList.add('pv-on');
  document.documentElement.classList.add('pv-page');
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', '#0b0807');
  split(root);
  reveal(root);
  tilt(root);
  magnetic(root);
  glow(root);
  ripple(root);
  const hero = initHero(root, { now: booting });
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

  const startRunner = () => import('./pv/mascot.js')
    .then(m => m.initMascot(root, { skin: config.skin }))
    .then(api => { window.__pv = { mascot: api }; })
    .catch(err => console.warn('Page view runner:', err));
  const loaded = new Promise(r => { if (document.readyState === 'complete') r(); else addEventListener('load', r, { once: true }); });

  if (!booting) {
    // Fallback page: show it now; the runner loads last, as decoration.
    hero.start();
    loaded.then(() => setTimeout(startRunner, 300));
    return;
  }
  // Loading screen: wait for what is on screen first (the fonts, the hero video and
  // the runner), at most 6 seconds, then reveal the page and play the hero intro.
  // On a slow connection the video is not waited for: the poster shows and the
  // video fades in once it plays.
  const conn = navigator.connection || {};
  const slow = /(^|-)(2g|3g)$/.test(conn.effectiveType || '') || (conn.downlink && conn.downlink < 1.5);
  revealWhen([document.fonts?.ready, slow ? null : hero.video, startRunner()], 6000).then(() => {
    const html = document.documentElement;
    html.style.setProperty('--pct', '100');
    dispatchEvent(new Event('resize'));
    document.body.classList.add('pv-ready');
    html.classList.remove('pv-loading');
    hero.start();
    setTimeout(() => document.body.classList.add('pv-done'), 800);
  });
}

// Progress (--pct on <html>, shown by the loading screen) moves as each step settles.
function revealWhen(steps, cap) {
  const html = document.documentElement;
  let done = 0;
  const show = () => html.style.setProperty('--pct', String(Math.round(10 + (done / steps.length) * 88)));
  show();
  const each = steps.map(s => Promise.resolve(s).catch(() => {}).then(() => { done++; show(); }));
  return Promise.race([Promise.all(each), new Promise(r => setTimeout(r, cap))]);
}
