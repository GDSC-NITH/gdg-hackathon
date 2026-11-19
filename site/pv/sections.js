// Scroll choreography for each page-view section, and the signals the mascot
// reads (which side the active timeline card is on, how fast the past-events
// rail moves, the void's progress).
import { track, onFrame, onRead, state, reduced, goTo, measure } from './scroll.js';
import { portrait, countUp } from './fx.js';
import { ALIASES } from './data.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
const wide = () => matchMedia('(min-width: 900px) and (min-height: 560px)').matches;
// Short landscape phones: pinned stages are switched off there (see pv.css).
const flat = () => matchMedia('(max-height: 500px) and (orientation: landscape)').matches;

export const signals = { tlSide: 0, railV: 0, voidP: 0, awardsP: 0, questP: 0, shake: 0, runnerIn: false };

// ---------- Bar, menu, progress, in-page links ----------
function bar(root) {
  const el = $('#pvBar', root), nav = $('.pv-nav', el), ink = $('.pv-nav-ink', el);
  const progress = $('.pv-progress i', root);
  const menu = $('#pvMenu', root), burger = $('.pv-burger', el);
  let top = true;

  onFrame(() => {
    const atTop = state.y < 40;
    if (atTop !== top) { top = atTop; el.classList.toggle('is-top', top); }
    progress.style.transform = `scaleX(${clamp(state.y / state.docH)})`;
  });

  // Active section: the one that holds the middle of the screen.
  const links = new Map($$('a[data-to]', nav).map(a => [a.dataset.to, a]));
  const moveInk = a => {
    if (!a) { ink.style.opacity = '0'; return; }
    ink.style.opacity = '1';
    ink.style.transform = `translateX(${a.offsetLeft}px) scaleX(${a.offsetWidth / 100})`;
  };
  let current = null;
  const io = new IntersectionObserver(entries => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      const id = e.target.id;
      const key = links.has(id) ? id : id === 'numbers' ? 'quests' : id === 'legacy' ? 'past' : id === 'void' ? 'contact' : null;
      const a = key ? links.get(key) : null;
      if (a === current) continue;
      current?.removeAttribute('aria-current');
      current = a;
      a?.setAttribute('aria-current', 'true');
      moveInk(a);
    }
  }, { rootMargin: '-45% 0px -50% 0px' });
  $$('[data-sect]', root).forEach(s => io.observe(s));

  const setMenu = open => {
    menu.hidden = false;
    requestAnimationFrame(() => menu.classList.toggle('open', open));
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    document.documentElement.classList.toggle('pv-lock', open);
    if (!open) setTimeout(() => { if (!menu.classList.contains('open')) menu.hidden = true; }, 500);
    else setTimeout(() => menu.querySelector('a')?.focus(), 80);
  };
  burger.addEventListener('click', () => setMenu(!menu.classList.contains('open')));
  addEventListener('keydown', e => { if (e.key === 'Escape' && menu.classList.contains('open')) { setMenu(false); burger.focus(); } });

  // In-page links scroll smoothly and keep the URL hash.
  document.addEventListener('click', e => {
    const a = e.target.closest('[data-to]');
    if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey) return;
    e.preventDefault();
    if (menu.classList.contains('open')) setMenu(false);
    const id = a.dataset.to;
    goTo(id);
    history.replaceState(null, '', id === 'top' ? location.pathname + location.search : `#${id}`);
  });

  // Links to old card ids (#register, #faq …) land on the right section.
  const land = () => {
    const id = location.hash.slice(1);
    if (!id) return;
    const target = document.getElementById(ALIASES[id] || id);
    if (target && target.closest('#pv')) setTimeout(() => goTo(target, { instant: true }), 60);
  };
  land();
  addEventListener('hashchange', land);
}

// ---------- Timeline: spine fill, active card, moving floor ----------
function timeline(root) {
  const sec = $('.pv-tl', root);
  if (!sec) return;
  const fill = $('.pv-tl-spine i', sec), tip = $('.pv-tl-spine b', sec), floor = $('.pv-tl-floor i', sec), now = $('.pv-tl-now b', sec);
  const items = $$('.pv-tl-item', sec);
  let active = null, secH = sec.offsetHeight;
  addEventListener('resize', () => { secH = sec.offsetHeight; });
  track(sec, p => {
    fill.style.transform = `scaleY(${p})`;
    // The glowing head of the lava rides the end of the fill.
    tip.style.transform = `translate3d(-50%, ${(p * secH).toFixed(1)}px, 0)`;
    floor.style.transform = `rotateX(74deg) translate3d(0, ${((p * 2400) % 90).toFixed(1)}px, 0)`;
  });
  // Rects are read at the start of the frame (onRead), before anything writes styles.
  const boxes = [];
  let onScreen = false;
  onRead(() => {
    const r = sec.getBoundingClientRect();
    onScreen = r.bottom > 0 && r.top < state.vh;
    if (onScreen) for (let i = 0; i < items.length; i++) boxes[i] = items[i].getBoundingClientRect();
  });
  onFrame(() => {
    if (!onScreen) { signals.tlSide = 0; return; }
    const mid = state.vh * (wide() ? 0.55 : 0.6);
    let best = null, bd = 1e9;
    for (let i = 0; i < items.length; i++) {
      const it = items[i], b = boxes[i];
      const c = b.top + b.height / 2;
      const d = Math.abs(c - mid);
      if (d < bd) { bd = d; best = it; }
      // Cards appear as they rise into view; the node lights once the runner reaches it.
      it.classList.toggle('is-past', b.top < state.vh * 0.82);
      it.classList.toggle('is-lit', c < mid + 10);
      // --prog: how far the runner is through this event (its progress bar).
      // --far: distance from the runner's line, for depth (dim and shrink a little).
      const prog = clamp((mid - b.top) / Math.max(1, b.height + 22));
      const far = clamp(d / (state.vh * 0.55));
      if (Math.abs((it._p ?? -1) - prog) > 0.004) { it._p = prog; it.style.setProperty('--prog', prog.toFixed(3)); }
      if (Math.abs((it._f ?? -1) - far) > 0.01) { it._f = far; it.style.setProperty('--far', far.toFixed(2)); }
    }
    if (best !== active) {
      active?.classList.remove('is-active');
      active = best;
      if (active) {
        active.classList.add('is-active');
        now.textContent = active.dataset.time;
        signals.tlSide = active.dataset.side === 'l' ? -1 : 1;
      }
    }
  });
}

// ---------- Prizes: the stage builds up while it is pinned ----------
function awards(root) {
  const sec = $('.pv-awards', root);
  if (!sec) return;
  const stage = $('.pv-stage', sec);
  const cards = $$('.pv-prize', sec);
  const counted = new Set();
  track($('.pv-awards-pin', sec), p => {
    signals.awardsP = p;
    stage.style.setProperty('--p', p.toFixed(4));
    cards.forEach((c, i) => {
      const on = p > 0.08 + i * 0.12 || reduced;
      c.classList.toggle('in', on);
      const amt = c.querySelector('[data-count]');
      if (on && !counted.has(c)) { counted.add(c); countUp(amt, { onDone: () => amt.classList.add('counted') }); }
    });
  });
}

// ---------- Team: film strip that drifts, speeds up with scrolling, and drags ----------
function crew(root) {
  const strip = $('.pv-film-strip', root), trackEl = $('.pv-film-track', root);
  if (!strip) return;
  for (const c of $$('canvas[data-face]', strip)) {
    portrait(c, c.dataset.face);
    const img = new Image(); // no width/height attributes: the card's CSS sizes it
    img.alt = ''; img.decoding = 'async'; img.src = c.toDataURL();
    c.replaceWith(img); // an image needs no layer of its own; a canvas does
  }
  let x = 0, drag = null, vx = 0, skew = 0, visible = false;
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(strip);
  const third = () => trackEl.scrollWidth / 3;
  // Cards curve round like a rolling drum: each turns and recedes by its
  // distance from the middle of the strip (positions cached, no layout reads).
  const cards = $$('.pv-player', trackEl);
  let offs = [], half = 1;
  const cache = () => { offs = cards.map(c => c.offsetLeft + c.offsetWidth / 2); half = strip.clientWidth / 2; };
  cache();
  addEventListener('resize', cache);
  addEventListener('load', cache);
  const curve = () => {
    if (reduced) return;
    for (let i = 0; i < cards.length; i++) {
      const d = clamp((x + offs[i] - half) / half, -1.4, 1.4);
      cards[i].style.setProperty('--ry', `${(-d * 26).toFixed(2)}deg`);
      cards[i].style.setProperty('--tz', `${(-Math.abs(d) * 70).toFixed(1)}px`);
    }
  };
  onFrame(dt => {
    if (!visible) return;
    const boost = clamp(state.vy / 1800, -2.5, 2.5);
    if (!drag) {
      vx += ((reduced ? 0 : -38 - Math.abs(boost) * 260) - vx) * Math.min(1, dt * 4);
      x += vx * dt;
    }
    const w = third();
    if (w > 0) { while (x <= -w) x += w; while (x > 0) x -= w; }
    skew += ((reduced ? 0 : -boost * 6) - skew) * Math.min(1, dt * 6);
    trackEl.style.transform = `translate3d(${x}px,0,0) skewX(${skew.toFixed(2)}deg)`;
    curve();
    signals.railV = drag ? 0 : vx;
  });
  strip.addEventListener('pointerdown', e => {
    drag = { x0: e.clientX, start: x, t: performance.now() };
    strip.setPointerCapture(e.pointerId);
    strip.classList.add('is-drag');
  });
  strip.addEventListener('pointermove', e => { if (drag) x = drag.start + (e.clientX - drag.x0); });
  const end = () => { if (!drag) return; drag = null; strip.classList.remove('is-drag'); };
  strip.addEventListener('pointerup', end);
  strip.addEventListener('pointercancel', end);
}

// ---------- Past events: vertical scroll drives a horizontal rail (wide screens) ----------
function past(root) {
  const sec = $('.pv-past', root);
  if (!sec) return;
  const rail = $('.pv-past-rail', sec), list = $('.pv-past-track', sec), count = $('.pv-past-count b', sec);
  const cards = $$('.pv-event', sec);
  const ledge = $('.pv-ledge', sec), runSlot = $('.pv-slot-past', sec);
  let dist = 0, lastX = 0;
  // The runner on the ledge gets the room between the cards and the ledge.
  const fit = () => {
    const room = ledge.getBoundingClientRect().top - rail.getBoundingClientRect().bottom - 12;
    runSlot?.style.setProperty('--run-h', `${Math.round(clamp(room, 64, 215))}px`);
  };
  // Card centres relative to the rail's left edge at translate 0 (no rect reads while scrolling).
  let centres = [], railX = 0, railOn = false;
  new IntersectionObserver(([e]) => { railOn = e.isIntersecting; }).observe(sec);
  const size = () => {
    const r0 = rail.getBoundingClientRect().left;
    centres = cards.map(c => r0 + c.offsetLeft + c.offsetWidth / 2);
    fit();
    if (flat() || reduced) { sec.style.height = ''; list.style.transform = ''; dist = 0; return; }
    dist = Math.max(0, list.scrollWidth - rail.clientWidth);
    sec.style.height = `${state.vh + dist * 1.15}px`;
    measure();
  };
  addEventListener('resize', size);
  addEventListener('load', size);
  setTimeout(size, 0);
  track(sec, p => {
    if (!dist) return;
    const tx = -dist * p;
    list.style.transform = `translate3d(${tx}px,0,0)`;
    railX = tx;
    cards.forEach((c, i) => {
      const mid = (centres[i] + tx) / state.vw - 0.5;
      if (Math.abs((c._d ?? 9) - mid) > 0.002) { c._d = mid; c.style.setProperty('--d', mid.toFixed(3)); }
    });
    const n = String(Math.min(cards.length, 1 + Math.round(p * (cards.length - 1)))).padStart(2, '0');
    if (count.textContent !== n) count.textContent = n; // only on change: a text write forces layout
  });
  onFrame(dt => {
    if (!railOn && Math.abs(signals.railV) < 1) return;
    const tx = dist ? railX : -rail.scrollLeft;
    const v = (tx - lastX) / Math.max(dt, 0.001);
    lastX = tx;
    signals.railV += (v - signals.railV) * Math.min(1, dt * 8);
  });
  rail.addEventListener('scroll', () => {
    const i = Math.round(rail.scrollLeft / Math.max(1, rail.scrollWidth - rail.clientWidth) * (cards.length - 1));
    const n = String(i + 1).padStart(2, '0');
    if (count.textContent !== n) count.textContent = n;
  }, { passive: true });
}

// ---------- Tracks: cards fan out of a stack, then flip face up ----------
function quests(root) {
  const sec = $('.pv-quests', root);
  if (!sec) return;
  const cards = $$('.pv-quest', sec);
  const dots = $$('.pv-quest-dots i', sec);
  const n = cards.length;
  const lay = p => {
    signals.questP = p;
    const isWide = wide() && !reduced;
    // Phones and tablets: a deck. Scrolling deals the cards: the top one turns
    // face up, then is thrown off to the left and the next rises from the stack.
    const isDeck = !isWide && !reduced && !flat();
    sec.classList.toggle('is-fan', isWide);
    sec.classList.toggle('is-deck', isDeck);
    if (isDeck) {
      // The first card turns over as the stage pins; the last one stays up at the end.
      const f = Math.min(n - 1, p * (n - 0.1) - 0.6);
      cards.forEach((c, i) => {
        const rel = i - f;
        let x = 0, y = 0, r = 0, s = 1, o = 1;
        if (rel < 0) {
          const k = Math.min(1, -rel);
          x = -k * 118; y = -k * 30; r = -k * 18; o = 1 - k * k;
        } else {
          y = Math.min(rel, 3) * 14; s = 1 - Math.min(rel, 3) * 0.055; r = (i % 2 ? 1 : -1) * Math.min(rel, 3) * 2.2;
        }
        c.style.transform = `translate3d(calc(-50% + ${x.toFixed(2)}vw), ${y.toFixed(1)}px, 0) rotate(${r.toFixed(2)}deg) scale(${s.toFixed(3)})`;
        c.style.opacity = o.toFixed(3);
        c.style.zIndex = String(100 - i);
        c.classList.toggle('is-flipped', rel < 0.55);
      });
      const cur = Math.min(n - 1, Math.max(0, Math.round(f)));
      dots.forEach((d, i) => d.classList.toggle('on', i === cur));
      return;
    }
    cards.forEach((c, i) => {
      c.style.opacity = ''; c.style.zIndex = '';
      if (!isWide) { c.style.transform = ''; c.classList.toggle('is-flipped', true); return; }
      const spread = smooth(0.05, 0.5, p);
      const o = i - (n - 1) / 2;
      const gap = Math.min(300, (state.vw - 160) / n);
      const x = o * gap * spread;
      const rot = (1 - spread) * (o * 6) + spread * o * 2;
      const y = (1 - spread) * (Math.abs(o) * -6) + spread * Math.abs(o) * 14;
      c.style.transform = `translate3d(calc(-50% + ${x}px), ${y}px, 0) rotate(${rot}deg)`;
      c.classList.toggle('is-flipped', p > 0.45 + i * 0.09);
    });
  };
  track(sec, lay);
  addEventListener('resize', () => lay(signals.questP));
}

// ---------- Contact: tabs ----------
function contact(root) {
  const tabs = $$('.pv-tabs [role=tab]', root), ink = $('.pv-tabs-ink', root);
  if (!tabs.length) return;
  const select = t => {
    for (const x of tabs) {
      const on = x === t;
      x.setAttribute('aria-selected', String(on));
      x.tabIndex = on ? 0 : -1;
      const panel = document.getElementById(x.getAttribute('aria-controls'));
      panel.hidden = !on;
      if (on) panel.classList.remove('in'), void panel.offsetWidth, panel.classList.add('in');
    }
    ink.style.transform = `translateX(${t.offsetLeft}px)`;
    ink.style.width = `${t.offsetWidth}px`;
  };
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => select(t));
    t.addEventListener('keydown', e => {
      if (!/Arrow(Left|Right)/.test(e.key)) return;
      const n = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
      n.focus(); select(n);
    });
  });
  requestAnimationFrame(() => select(tabs[0]));
  // "Become a partner" opens the message form.
  document.addEventListener("click", e => { if (e.target.closest("[data-msg]") && tabs[1]) select(tabs[1]); });
  addEventListener('resize', () => select(tabs.find(t => t.getAttribute('aria-selected') === 'true')));
}

// ---------- The void: rays and copy rise as the floor opens ----------
function voidFooter(root) {
  const sec = $('.pv-void', root);
  if (!sec) return;
  const stage = $('.pv-void-stage', sec);
  const over = $('.pv-void-over', sec);
  let shook = false;
  // The copy shows only once the runner has fallen into the crater and gone,
  // even when a fast scroll gets ahead of the fall.
  let want = false, shown = false;
  onFrame(() => {
    const show = want && (reduced || !signals.runnerIn);
    if (show !== shown) { shown = show; over?.classList.toggle('is-done', show); }
  });
  track($('.pv-void-pin', sec), p => {
    signals.voidP = p;
    stage.style.setProperty('--p', p.toFixed(4));
    // The moment the embers burst out of the crater: a flash and a short shake.
    const flash = reduced ? 0 : Math.max(0, 1 - Math.abs(p - 0.32) * 11);
    signals.shake = flash;
    stage.style.setProperty('--flash', flash.toFixed(3));
    if (flash > 0.02) { stage.style.translate = `${((Math.random() - 0.5) * 10 * flash).toFixed(1)}px ${((Math.random() - 0.5) * 8 * flash).toFixed(1)}px`; shook = true; }
    else if (shook) { stage.style.translate = ''; shook = false; }
    stage.classList.toggle('is-open', p > 0.12);
    stage.classList.toggle('is-done', p > 0.45 || reduced);
    want = p > 0.45 || reduced;
  });
}

// ---------- Sponsors: once a logo has settled, hand its transform back to the tilt ----------
function partners(root) {
  for (const logo of $$('.pv-logo, .pv-logo-join', root)) {
    logo.addEventListener('animationend', e => {
      if (e.animationName !== 'pv-settle') return;
      logo.classList.add('in-done');
      logo.style.animation = 'none';
    });
  }
  // The ticker of partner names drifts left, faster while the page scrolls.
  const tick = $('.pv-ticker-track', root);
  if (!tick || reduced) return;
  let tx = 0, v = 40, visible = false;
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(tick);
  onFrame(dt => {
    if (!visible) return;
    v += ((40 + Math.min(700, Math.abs(state.vy) * 0.6)) - v) * Math.min(1, dt * 4);
    tx -= v * dt;
    const w = tick.scrollWidth / 4;
    if (w > 0 && -tx >= w) tx += w;
    tick.style.transform = `translate3d(${tx.toFixed(1)}px,0,0)`;
  });
}

// ---------- Partner rows: drift in opposite directions, faster with scrolling ----------
function marquees(root) {
  if (reduced) return;
  for (const row of $$('.pv-marquee', root)) {
    const trackEl = $('.pv-marquee-track', row);
    const dir = +row.dataset.dir || -1;
    let x = dir > 0 ? -1 : 0, v = 34, visible = false, hover = false;
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(row);
    row.addEventListener('pointerenter', () => { hover = true; });
    row.addEventListener('pointerleave', () => { hover = false; });
    onFrame(dt => {
      if (!visible) return;
      const w = trackEl.scrollWidth / 3;
      if (x === -1) x = -w;
      v += (((hover ? 8 : 34) + Math.min(520, Math.abs(state.vy) * 0.45)) - v) * Math.min(1, dt * 4);
      x += dir * v * dt;
      if (w > 0) { while (x <= -w) x += w; while (x > 0) x -= w; }
      trackEl.style.transform = `translate3d(${x.toFixed(1)}px,0,0)`;
    });
  }
}

// ---------- Headings drift a little slower than the page (depth) ----------
function drift(root) {
  if (reduced) return;
  const heads = $$('.pv-head', root).filter(h => !h.closest('.pv-stage'));
  let tops = [];
  const cache = () => {
    for (const h of heads) h.style.translate = '';
    tops = heads.map(h => { const r = h.getBoundingClientRect(); return [r.top + scrollY, r.height]; });
  };
  cache();
  addEventListener('resize', cache);
  addEventListener('load', cache);
  setTimeout(cache, 1200);
  onFrame(() => {
    for (let i = 0; i < heads.length; i++) {
      const [top, h] = tops[i] || [0, 0];
      const c = top - state.y + h / 2 - state.vh / 2;
      if (Math.abs(c) > state.vh * 1.2) continue;
      heads[i].style.translate = `0 ${clamp(c * -0.09, -70, 70).toFixed(1)}px`;
    }
  });
}

// Looping decorations pause while their section is off screen (.pv-off in pv.css).
function pauseOffscreen(root) {
  const io = new IntersectionObserver(entries => {
    for (const e of entries) e.target.classList.toggle('pv-off', !e.isIntersecting);
  }, { rootMargin: '60% 0px' });
  for (const el of root.querySelectorAll('[data-sect]')) io.observe(el);
}

export function initSections(root) {
  pauseOffscreen(root);
  bar(root); timeline(root); partners(root); awards(root); crew(root); past(root); marquees(root); quests(root); contact(root); voidFooter(root); drift(root);
}
