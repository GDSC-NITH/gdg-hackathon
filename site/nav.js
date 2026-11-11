// Navigation: top bar links, dock slot clicks, tour buttons, URL hash routing, and flight autopilot.
import { PLAN, STATIONS } from '@world/layout.js';
import { hideHero } from './hero.js';
import { doneHint } from './hint.js';

const $ = s => document.querySelector(s);
const body = document.body;
const isPlain = () => body.classList.contains('plain');
const ids = PLAN.map(p => p.id);
const stationOf = id => STATIONS.find(s => s.id === id);

export function syncModeLinks() {
  const url = new URL(location.href);
  if (isPlain()) {
    url.searchParams.delete('plain');
    url.searchParams.set('3d', '');
  } else {
    url.searchParams.delete('3d');
    url.searchParams.set('plain', '');
  }
  url.hash = '';
  const searchStr = url.search.replace(/=(?=&|$)/g, '');
  for (const a of document.querySelectorAll('[data-mode]')) {
    a.href = url.pathname + searchStr;
    if (!('keepText' in a.dataset)) a.textContent = isPlain() ? '3D view' : 'Page view';
  }
}

export function setupNavLinks() {
  const nav = $('#siteBar .site-nav');
  const menu = $('#siteBar .site-menu');
  if (!nav || nav.children.length) return;

  // ---------- Top Bar Links ----------
  for (const p of PLAN) {
    if (p.id === 'register') continue; // Register button is separate
    const a = document.createElement('a');
    a.href = `#${p.id}`;
    a.dataset.go = p.id;
    a.textContent = p.en;
    nav.append(a);
  }

  const modeLink = document.createElement('a');
  modeLink.className = 'site-mode-link';
  modeLink.dataset.mode = '';
  nav.append(modeLink);
  syncModeLinks();

  function closeMenu() {
    nav.classList.remove('open');
    menu?.setAttribute('aria-expanded', 'false');
  }

  menu?.addEventListener('click', e => {
    e.stopPropagation();
    const open = !nav.classList.contains('open');
    nav.classList.toggle('open', open);
    menu.setAttribute('aria-expanded', String(open));
  });

  // Close mobile navigation drawer on outside click, Escape, or link selection
  document.addEventListener('click', e => {
    if (nav.classList.contains('open') && !e.target.closest('#siteBar .site-nav, #siteBar .site-menu')) {
      closeMenu();
    }
  });

  window.addEventListener('keydown', e => {
    if (e.key === 'Escape' && nav.classList.contains('open')) {
      closeMenu();
    }
  });

  nav.addEventListener('click', e => {
    if (e.target.closest('a')) {
      closeMenu();
    }
  });
}

export function initNav(h) {
  setupNavLinks();
  const panel = $('#panel');
  const nav = $('#siteBar .site-nav');
  const menu = $('#siteBar .site-menu');
  const panelTitle = $('#panelTitle');
  const typewriterStations = new Set(['welcome', 'tracks', 'schedule', 'prizes', 'sponsors', 'team', 'faq', 'venue', 'register']);
  const prefersReducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let typingTimer = null;

  function stopTyping() {
    clearInterval(typingTimer);
    typingTimer = null;
    panelTitle.classList.remove('welcome-typing');
    panelTitle.removeAttribute('aria-label');
  }

  const titleObserver = new MutationObserver(() => {
    if (!panel.open || !typewriterStations.has(panel.dataset.station)) {
      stopTyping();
      return;
    }
    const title = panelTitle.textContent;
    if (!title) return;

    stopTyping();
    if (prefersReducedMotion.matches && panel.dataset.station !== 'welcome') return;
    panelTitle.textContent = '';
    panelTitle.setAttribute('aria-label', title);
    panelTitle.classList.add('welcome-typing');
    let typed = 0;
    typingTimer = setInterval(() => {
      if (!panel.open || !typewriterStations.has(panel.dataset.station)) {
        stopTyping();
        return;
      }
      panelTitle.textContent = title.slice(0, ++typed);
      if (typed === title.length) stopTyping();
    }, 100);
  });
  titleObserver.observe(panel, { attributes: true, attributeFilter: ['data-station', 'open'] });

  // ---------- Flight Autopilot Navigation ----------
  let flyingTarget = null;
  let flightStartTime = 0;
  const nativeGo = h.go.bind(h);

  function landAndOpen(targetId) {
    flyingTarget = null;
    const s = stationOf(targetId);
    if (!s || !h.player) return;

    // Firmly touch down player on the ground facing the station
    h.player.teleport(s.at[0], s.at[1], s);
    h.rig.recenter(h.player, true);

    if (s.show) {
      h.rig.showcase(...(h.stage.camera.aspect < 0.8 && s.showPortrait ? s.showPortrait : s.show));
    }
    if (s.page !== false) {
      h.openPage(targetId);
    }
  }

  function flyToStation(id, instant = false) {
    if (isPlain()) return;
    hideHero();
    doneHint();

    const s = stationOf(id);
    if (!s || !h.player) {
      nativeGo(id);
      return;
    }

    const p = h.player.pos;
    const dist = Math.hypot(s.at[0] - p.x, s.at[1] - p.z);

    // If instant jump requested, or already standing right at station (< 2.2m)
    if (instant || dist < 2.2) {
      flyingTarget = null;
      nativeGo(id);
      return;
    }

    // Close any open card modal so user has clear flight view
    if (panel.open) {
      try { panel.close(); } catch { panel.removeAttribute('open'); }
      body.classList.remove('reading');
    }

    flyingTarget = id;
    flightStartTime = performance.now();

    // Trigger flight autopilot
    const ok = h.player.flyTo(s.at[0], s.at[1]);
    if (!ok) {
      flyingTarget = null;
      nativeGo(id);
      return;
    }

    h.rig.recenter(h.player, true);
  }

  // Intercept window.__home.go for all caller sources
  h.go = function(id, instant = false) {
    if (instant || navigator.webdriver) nativeGo(id);
    else flyToStation(id);
  };

  function arrive() {
    if (!flyingTarget) return;

    const s = stationOf(flyingTarget);
    if (!s || !h.player) {
      flyingTarget = null;
      return;
    }

    const p = h.player.pos;
    const dist = Math.hypot(s.at[0] - p.x, s.at[1] - p.z);
    const elapsed = performance.now() - flightStartTime;

    // Arrival conditions:
    // 1. Reached vicinity of station (dist <= 2.8m)
    // 2. Engine autopilot finished or timed out (!h.player.piloting after 400ms)
    // 3. Safety timeout exceeded (2.4s) to guarantee player never stays suspended mid-air
    const arrivedNear = dist <= 2.8;
    const autopilotDone = elapsed > 400 && !h.player.piloting;
    const timedOut = elapsed > 2400;

    if (arrivedNear || autopilotDone || timedOut) {
      landAndOpen(flyingTarget);
    }
  }

  function cancelFlight() {
    if (!flyingTarget) return;
    flyingTarget = null;
    if (h.player?.flying) {
      // Safely settle down if user manually takes over while flying
      const p = h.player.pos;
      h.player.teleport(p.x, p.z);
    }
  }

  // Manual keypress cancels autopilot flight immediately
  window.addEventListener('keydown', e => {
    if (flyingTarget && /^(Key[WASD]|Arrow|Space|Escape)/.test(e.code) && !e.target.closest?.('input, textarea')) {
      cancelFlight();
    }
  });

  // ---------- Dock / Hotbar Slot Capturing ----------
  $('#hotbar')?.addEventListener('click', e => {
    const slot = e.target.closest('[data-station]');
    if (!slot) return;
    const id = slot.dataset.station;
    if (!id || id === 'portal') return;
    e.preventDefault();
    e.stopPropagation();
    flyToStation(id);
  }, true);

  // ---------- Prev / Next Tour in Cards ----------
  const tour = document.createElement('nav');
  tour.className = 'tour';
  tour.setAttribute('aria-label', 'Stations');
  tour.innerHTML = '<button type="button" class="mc-button" data-step="-1"></button><span></span><button type="button" class="mc-button" data-step="1"></button>';
  panel.append(tour);

  const [prevB, label, nextB] = tour.children;
  tour.addEventListener('click', e => {
    const b = e.target.closest('[data-step]');
    if (!b) return;
    const at = ids.indexOf(panel.dataset.station);
    flyToStation(ids[(at + Number(b.dataset.step) + ids.length) % ids.length]);
  });

  // Card click outside protection
  panel.addEventListener('click', e => {
    if (e.target.closest('#panel .body, #panel .tour') && !e.target.closest('a, button, form, input, textarea, select, label, [data-open]')) {
      e.stopPropagation();
    }
  }, true);

  // Synchronize top-bar active states and address bar hash
  function onCard() {
    const id = panel.open ? panel.dataset.station : null;
    const at = ids.indexOf(id);
    tour.hidden = at < 0;
    if (at >= 0) {
      const prev = ids[(at - 1 + ids.length) % ids.length];
      const next = ids[(at + 1) % ids.length];
      prevB.textContent = `‹ ${PLAN[ids.indexOf(prev)].en}`;
      nextB.textContent = `${PLAN[ids.indexOf(next)].en} ›`;
      label.textContent = `${at + 1} / ${ids.length}`;
      doneHint();
    }
    for (const a of nav.querySelectorAll('a[data-go]')) {
      a.setAttribute('aria-current', String(a.dataset.go === id));
    }
    const url = new URL(location.href);
    url.hash = id && (at >= 0 || id === 'mailbox') ? id : '';
    if (url.href !== location.href) {
      history.replaceState(history.state, '', url.hash ? url : url.pathname + url.search);
    }
  }

  new MutationObserver(onCard).observe(panel, { attributes: true, attributeFilter: ['open', 'data-station'] });
  onCard();

  return {
    flyToStation,
    nativeGo,
    arrive,
    cancelFlight,
  };
}
