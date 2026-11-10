// The website layer: makes the 3D island usable by someone who has never
// played a game. It talks to the engine only through window.__home (the API
// listed in AGENTS.md), so engine updates don't touch it.
import { PLAN } from '@world/layout.js';
import { isHeroOn, showHero, hideHero, drawLogo, initHero, enableHeroExplore, updateHeroProgress } from './hero.js';
import { initHint, showHint } from './hint.js';
import { initNav, syncModeLinks } from './nav.js';
import { initTags } from './tags.js';

const $ = s => document.querySelector(s);
const body = document.body;
const isPlain = () => body.classList.contains('plain');
const ids = PLAN.map(p => p.id);
const deepLink = ids.includes(location.hash.slice(1)) || location.hash === '#mailbox' ? location.hash.slice(1) : null;

// ---------- Initialize Hero & Mode Links ----------
syncModeLinks();
initHero({
  onDismiss: showHint,
});
initHint();

if (!deepLink && !isPlain()) {
  showHero();
}

// Global delegated handler for [data-go] navigation links
let queued = null;
let navInstance = null;

document.addEventListener('click', e => {
  const link = e.target.closest('[data-go]');
  if (!link || isPlain()) return;
  e.preventDefault();
  const navMenu = $('#siteBar .site-nav');
  const menuBtn = $('#siteBar .site-menu');
  navMenu?.classList.remove('open');
  menuBtn?.setAttribute('aria-expanded', 'false');

  const targetId = link.dataset.go;
  if (!window.__home?.player) {
    queued = targetId;
    hideHero(showHint);
    return;
  }
  hideHero(showHint);
  if (navInstance) navInstance.flyToStation(targetId);
  else window.__home.go(targetId);
});

// ---------- Wait for Engine Startup ----------
(function wait() {
  if (isPlain()) {
    body.classList.remove('hero-on');
    syncModeLinks();
    drawLogo(true);
    if (new URLSearchParams(location.search).has('plain')) {
      $('#startupNotice')?.setAttribute('hidden', '');
    }
    const go = $('#hero .hero-go');
    if (go) {
      go.disabled = false;
      go.textContent = '▶ Open the 3D island';
    }
    if (deepLink) document.getElementById(deepLink)?.scrollIntoView();
    return;
  }

  if (!window.__home?.player) {
    const bar = $('#loading .bar i');
    if (bar?.style.width) {
      updateHeroProgress(parseInt(bar.style.width, 10) || 0);
    }
    requestAnimationFrame(wait);
    return;
  }

  ready(window.__home);
})();

function ready(h) {
  enableHeroExplore();

  navInstance = initNav(h);

  const tagsInstance = initTags({
    h,
    onVisit: id => navInstance.flyToStation(id),
    onUserInteract: () => navInstance.cancelFlight(),
  });

  if (queued || deepLink) {
    navInstance.nativeGo(queued || deepLink);
    showHint();
  }

  (function loop() {
    requestAnimationFrame(loop);
    if (document.hidden) return;
    navInstance.arrive();
    tagsInstance.placeTags();
  })();
}
