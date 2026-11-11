// The website layer: makes the 3D island usable by someone who has never
// played a game. It talks to the engine only through window.__home (the API
// listed in AGENTS.md), so engine updates don't touch it.
import { PLAN, SPAWN } from '@world/layout.js';
import { showHero, hideHero, initHero, enableHeroExplore, updateHeroProgress } from './hero.js';
import { initHint, showHint } from './hint.js';
import { initNav, syncModeLinks, setupNavLinks } from './nav.js';
import { initTags } from './tags.js';
import { initTouchControls } from './touch.js';
import { initChat } from './chat.js';

const $ = s => document.querySelector(s);
const body = document.body;
const isPlain = () => body.classList.contains('plain');

// ---------- Initialize Navigation, Hero & Mode Links ----------
setupNavLinks();
syncModeLinks();
initHero({
  onDismiss: showHint,
});
initHint();
initChat();

if (!isPlain()) {
  // Clear any leftover hash (e.g. from previous card visits) so it doesn't trigger auto-flight on reload
  if (location.hash) {
    history.replaceState(history.state, '', location.pathname + location.search);
  }
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
    if (new URLSearchParams(location.search).has('plain')) {
      $('#startupNotice')?.setAttribute('hidden', '');
    }
    const go = $('#hero .hero-go');
    if (go) {
      go.disabled = false;
      go.textContent = '▶ Open the 3D island';
    }
    // Tabs, ground and motion for page view; it opens the tab named in the URL.
    import('./page.js').then(m => m.initPageView()).catch(err => console.error('Page view:', err));
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

  // Ensure player is kept at initial spawn position on load
  if (SPAWN && h.player) {
    h.player.teleport(SPAWN.x, SPAWN.z);
  }

  navInstance = initNav(h);

  // Thumbstick and jump button on touch screens (issue #30).
  const touchControls = initTouchControls(h, { onStart: () => navInstance.cancelFlight() });

  const tagsInstance = initTags({
    h,
    onVisit: id => navInstance.flyToStation(id),
    onUserInteract: () => navInstance.cancelFlight(),
  });

  if (queued) {
    navInstance.flyToStation(queued);
    showHint();
  }

  (function loop() {
    requestAnimationFrame(loop);
    if (document.hidden) return;
    navInstance.arrive();
    tagsInstance.placeTags();
    touchControls?.update();
  })();
}
