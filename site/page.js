// Page view (?plain, or when the 3D world can't start): the island's cards laid
// out as an immersive, continuous single-page cyber-voxel experience.
// Motion graphics and parallax ease elements in as you scroll, with an interactive
// runner along the timeline and gamified hackathon loadout crafting.
import { STATIONS } from '@world/layout.js';
import { icon } from '@engine/ui/icons.js';
import { initTimelineRunner } from './timeline-runner.js';

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const body = document.body;
const motion = !matchMedia('(prefers-reduced-motion: reduce)').matches && 'IntersectionObserver' in window;
const smooth = motion ? 'smooth' : 'auto';

// Cards and rows that ease in when they come into view.
const REVEAL = [
  '.hack-stat', '.track-card', '.schedule-item', '.prize-tier', '#prizes > h3', '#prizes > h3 + p',
  '.store > li', '.crew-role', '.faq-box', '.venue-address', '.travel-item', '.page > form',
  '.swag-box'
].join(', ');

// Figures that count up from zero the first time they are shown.
const COUNT = '.hack-stat .val, .prize-amount, .hero-facts b';

// Stage badges for each section
const STAGE_LABELS = {
  welcome: 'MISSION 01 · BRIEFING',
  tracks: 'MISSION 02 · TRACKS',
  schedule: 'MISSION 03 · TIMELINE',
  prizes: 'MISSION 04 · BOUNTY VAULT',
  sponsors: 'MISSION 05 · ALLIES',
  team: 'MISSION 06 · COMMAND CREW',
  faq: 'MISSION 07 · PROTOCOLS & FAQ',
  venue: 'MISSION 08 · ARENA & TRAVEL',
  register: 'MISSION 09 · ENLISTMENT'
};

// ---------- Ground: the engine's dirt and grass-side palette ----------
function rng(seed) {
  let s = seed >>> 0;
  return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
}
const DIRT = [0x8c6239, 0x7d5632, 0x966a40, 0x84603a];
const GRASS = [0x6fa544, 0x78ae4b, 0x67993f];
const css = (c, k = 1) => `rgb(${[16, 8, 0].map(s => Math.round(((c >> s) & 255) * k)).join()})`;

function tile(seed, grass) {
  const canvas = Object.assign(document.createElement('canvas'), { width: 16, height: 16 });
  const g = canvas.getContext('2d'), r = rng(seed), pick = list => list[Math.floor(r() * list.length)];
  const set = (x, y, c, k) => { g.fillStyle = css(c, k); g.fillRect(x, y, 1, 1); };
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    const v = r();
    set(x, y, v < 0.07 ? 0x6b4629 : v < 0.12 ? 0xa57a4f : pick(DIRT), 0.42);
  }
  if (grass) for (let x = 0; x < 16; x++) {
    const depth = 3 + Math.floor(r() * 3);
    for (let y = 0; y < depth; y++) set(x, y, pick(GRASS), 1);
    if (r() < 0.4) set(x, depth, 0x5d8f37, 1);
  }
  return `url(${canvas.toDataURL()})`;
}

function paintGround() {
  body.style.setProperty('--pv-dirt', tile(1031, false));
  body.style.setProperty('--pv-grass', tile(1031, true));
}

// ---------- Count-up figures ----------
function countUp(root) {
  const els = root.matches(COUNT) ? [root] : $$(COUNT, root);
  for (const el of els) {
    if (el.dataset.counted) continue;
    el.dataset.counted = '';
    const m = el.textContent.match(/^([^\dA-Za-z]*)([\d,]+)(.*)$/s);
    if (!m || !motion) continue;
    const [, pre, digits, post] = m, target = Number(digits.replace(/,/g, ''));
    const grouped = digits.includes(','), start = performance.now(), length = 900;
    const show = n => { el.textContent = pre + (grouped ? n.toLocaleString('en-IN') : n) + post; };
    show(0);
    requestAnimationFrame(function step(now) {
      const k = Math.min(1, (now - start) / length);
      show(Math.round(target * (1 - (1 - k) ** 3)));
      if (k < 1) requestAnimationFrame(step);
    });
  }
}

// ---------- Hack-o-Matic 3000 Interactive Workbench ----------
function initCraftingStation() {
  const welcome = $('#welcome');
  if (!welcome || welcome.querySelector('.pv-crafting-station')) return;

  const station = document.createElement('div');
  station.className = 'pv-crafting-station';
  station.innerHTML = `
    <div class="pv-craft-header">
      <div class="pv-craft-title-wrap">
        <span class="pv-craft-badge">⚡ RECIPE FORGE</span>
        <h3 class="pv-craft-title">HACK-O-MATIC 3000</h3>
      </div>
      <span class="pv-craft-status"><span class="pv-dot"></span> SYSTEM READY</span>
    </div>
    <p class="pv-craft-subtitle">Select an ingredient to synthesize your hackathon loadout buff:</p>
    <div class="pv-craft-grid" role="group" aria-label="Hackathon Power-ups">
      <button type="button" class="pv-craft-slot active" data-item="redstone" aria-pressed="true">
        <span class="pv-slot-icon">⚡</span>
        <span class="pv-slot-name">Redstone Fuel</span>
        <span class="pv-slot-buff">+50% Velocity</span>
      </button>
      <button type="button" class="pv-craft-slot" data-item="coffee" aria-pressed="false">
        <span class="pv-slot-icon">☕</span>
        <span class="pv-slot-name">Ender Brew</span>
        <span class="pv-slot-buff">Night Vision</span>
      </button>
      <button type="button" class="pv-craft-slot" data-item="pizza" aria-pressed="false">
        <span class="pv-slot-icon">🍕</span>
        <span class="pv-slot-name">Pixel Pizza</span>
        <span class="pv-slot-buff">+100 Health</span>
      </button>
      <button type="button" class="pv-craft-slot" data-item="shield" aria-pressed="false">
        <span class="pv-slot-icon">🛡️</span>
        <span class="pv-slot-name">Bug Ward</span>
        <span class="pv-slot-buff">Zero Runtime Errors</span>
      </button>
    </div>
    <div class="pv-craft-output">
      <div class="pv-crafted-banner">
        <span class="pv-crafted-tag">ACTIVE SYNTHESIS</span>
        <div class="pv-crafted-name" id="craftActiveName">⚡ Redstone Fuel (Overclocked)</div>
        <p class="pv-crafted-desc" id="craftActiveStat">Supercharges your brain with instant algorithmic clarity and +50% coding velocity!</p>
      </div>
    </div>
  `;

  const foot = welcome.querySelector('.page-foot');
  if (foot) welcome.insertBefore(station, foot);
  else welcome.appendChild(station);

  const perks = {
    redstone: {
      name: '⚡ Redstone Fuel (Overclocked)',
      desc: 'Supercharges your brain with instant algorithmic clarity and +50% coding velocity!'
    },
    coffee: {
      name: '☕ Ender Brew (Midnight Roast)',
      desc: 'Infused with distilled void particles. Grants 100% resistance to 3:00 AM drowsiness.'
    },
    pizza: {
      name: '🍕 Pixel Pizza (Infinite Crust)',
      desc: 'Restores stamina to maximum and provides warm dining hall networking memories.'
    },
    shield: {
      name: '🛡️ Bug Ward (Enchanted)',
      desc: 'Deflects unexpected null-pointer crashes, unhandled promises, and merge conflicts.'
    }
  };

  const slots = station.querySelectorAll('.pv-craft-slot');
  const nameEl = station.querySelector('#craftActiveName');
  const descEl = station.querySelector('#craftActiveStat');
  const banner = station.querySelector('.pv-crafted-banner');

  slots.forEach(slot => {
    slot.addEventListener('click', () => {
      slots.forEach(s => {
        s.classList.remove('active');
        s.setAttribute('aria-pressed', 'false');
      });
      slot.classList.add('active');
      slot.setAttribute('aria-pressed', 'true');
      const itemKey = slot.dataset.item;
      const perk = perks[itemKey];
      if (perk && nameEl && descEl) {
        nameEl.textContent = perk.name;
        descEl.textContent = perk.desc;
        if (banner) {
          banner.classList.remove('pulse');
          void banner.offsetWidth;
          banner.classList.add('pulse');
        }
      }
    });
  });
}

// ---------- FAQ Interactive Filter Pills ----------
function initFaqFilters() {
  const faq = $('#faq');
  if (!faq || faq.querySelector('.pv-faq-filters')) return;

  const boxes = $$('.faq-box', faq);
  // Assign categories to FAQ boxes if not present
  const cats = ['rules', 'teams', 'teams', 'rules', 'logistics', 'logistics'];
  boxes.forEach((box, i) => {
    box.dataset.cat = cats[i % cats.length];
  });

  const filterWrap = document.createElement('div');
  filterWrap.className = 'pv-faq-filters';
  filterWrap.innerHTML = `
    <button type="button" class="pv-faq-filter active" data-filter="all">All Questions</button>
    <button type="button" class="pv-faq-filter" data-filter="rules">Rules & Fair Play</button>
    <button type="button" class="pv-faq-filter" data-filter="teams">Teams & Eligibility</button>
    <button type="button" class="pv-faq-filter" data-filter="logistics">Venue & Logistics</button>
  `;

  const grid = faq.querySelector('.faq-grid');
  if (grid) faq.insertBefore(filterWrap, grid);
  else faq.appendChild(filterWrap);

  const filterBtns = filterWrap.querySelectorAll('.pv-faq-filter');
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const target = btn.dataset.filter;
      boxes.forEach(box => {
        const matches = target === 'all' || box.dataset.cat === target;
        box.style.display = matches ? '' : 'none';
        if (matches) {
          box.classList.remove('is-in');
          void box.offsetWidth;
          box.classList.add('is-in');
        }
      });
    });
  });
}

// ---------- Layout Enhancements & Timeline Railway ----------
function decorate() {
  // Each track card takes the colour of its sponsor tag
  for (const card of $$('.track-card')) {
    const tag = $('.track-tag', card);
    if (tag?.style.backgroundColor) card.style.setProperty('--tc', tag.style.backgroundColor);
  }

  // Add stage badges to each section card header
  for (const [id, label] of Object.entries(STAGE_LABELS)) {
    const panel = $(`#${id}`);
    if (!panel) continue;
    const headerLeft = $('.page-card-header .header-left', panel);
    if (headerLeft && !headerLeft.querySelector('.pv-stage-badge')) {
      const stageBadge = document.createElement('span');
      stageBadge.className = 'pv-stage-badge';
      stageBadge.textContent = label;
      headerLeft.prepend(stageBadge);
    }
  }

  // The schedule splits into days and gets railway elements
  const schedule = $('#schedule');
  const items = schedule ? $$('.schedule-item', schedule) : [];
  if (items.length && !schedule.querySelector('.pv-days')) {
    const days = Object.assign(document.createElement('div'), { className: 'pv-days' });

    // Top horizontal railway track spanning Day 1 and Day 2
    const topBar = Object.assign(document.createElement('div'), { className: 'pv-timeline-top' });
    topBar.setAttribute('aria-hidden', 'true');
    topBar.innerHTML = `
      <div class="pv-top-track-inner">
        <i class="pv-prop-torch" title="Redstone Torch"></i>
        <div class="pv-top-badge d1">DAY 1 - JAN 16</div>
        <div class="pv-rail-h"><i class="pv-minecart" title="Minecart"></i></div>
        <div class="pv-top-badge d2">DAY 2 - JAN 17</div>
        <div class="pv-rail-h-end"><i class="pv-redstone-dot"></i></div>
      </div>
    `;
    days.append(topBar);

    const bodyGrid = Object.assign(document.createElement('div'), { className: 'pv-timeline-body' });

    // Left redstone wiring gutter
    const gutterLeft = Object.assign(document.createElement('div'), { className: 'pv-redstone-gutter left' });
    gutterLeft.setAttribute('aria-hidden', 'true');
    gutterLeft.innerHTML = `
      <i class="rs-torch top"></i>
      <i class="rs-lever"></i>
      <div class="rs-wire-v"></div>
      <i class="rs-torch mid"></i>
      <div class="rs-wire-v"></div>
      <i class="rs-dot bot"></i>
    `;
    bodyGrid.append(gutterLeft);

    let column = null, n = 0, dayItemIndex = 0;
    for (const item of items) {
      const time = $('.schedule-time', item), br = time?.querySelector('br');
      if (br || !column) {
        dayItemIndex = 0;
        let date = '';
        if (br) {
          date = time.firstChild.textContent.trim();
          while (time.firstChild !== br) time.firstChild.remove();
          br.remove();
        }
        column = Object.assign(document.createElement('section'), { className: `pv-day pv-day-${++n}` });
        const head = document.createElement('h3');
        head.className = 'sr';
        head.textContent = `Day ${n}${date ? ` · ${date}` : ''}`;
        column.append(head);
        bodyGrid.append(column);
      }

      const isDay1 = (n === 1);
      const idx = dayItemIndex++;
      item.classList.add(isDay1 ? 'item-d1' : 'item-d2');
      item.classList.add(`row-${idx}`);

      const theme = isDay1
        ? ['theme-stone', 'theme-wood', 'theme-stone', 'theme-stone-wood', 'theme-wood'][idx] || 'theme-stone'
        : ['theme-wood', 'theme-stone', 'theme-wood', 'theme-stone', 'theme-wood'][idx] || 'theme-wood';
      item.classList.add(theme);

      // Prepend vertical rail track graphic
      if (!item.querySelector('.rail-track')) {
        const rail = document.createElement('div');
        rail.className = 'rail-track';
        rail.setAttribute('aria-hidden', 'true');
        item.prepend(rail);
      }

      // Append decorative Minecraft props
      if (!item.querySelector('.mc-props')) {
        const props = document.createElement('div');
        props.className = 'mc-props';
        props.setAttribute('aria-hidden', 'true');

        if (isDay1) {
          if (idx === 0) props.innerHTML = '<i class="prop-furnace"></i>';
          else if (idx === 2) props.innerHTML = '<i class="prop-lamp-lit"></i><i class="prop-chest"></i>';
          else if (idx === 3) props.innerHTML = '<i class="prop-lamp-lit"></i>';
          else if (idx === 4) props.innerHTML = '<i class="prop-lamp-lit"></i>';
        } else {
          if (idx === 0) props.innerHTML = '<i class="prop-furnace"></i><i class="prop-hopper"></i>';
          else if (idx === 1) props.innerHTML = '<i class="prop-lamp-lit"></i>';
          else if (idx === 2) props.innerHTML = '<i class="prop-chest"></i><i class="prop-hopper"></i><i class="prop-lamp-lit"></i>';
          else if (idx === 3) props.innerHTML = '<i class="prop-repeater"></i>';
          else if (idx === 4) props.innerHTML = '<i class="prop-dispenser"></i>';
        }
        item.append(props);
      }

      column.append(item);
    }

    // Right redstone wiring gutter
    const gutterRight = Object.assign(document.createElement('div'), { className: 'pv-redstone-gutter right' });
    gutterRight.setAttribute('aria-hidden', 'true');
    gutterRight.innerHTML = `
      <i class="rs-repeater top"></i>
      <div class="rs-wire-v"></div>
      <i class="rs-repeater mid"></i>
      <div class="rs-wire-v"></div>
      <i class="rs-torch bot"></i>
    `;
    bodyGrid.append(gutterRight);

    days.append(bodyGrid);
    schedule.append(days);
  }

  // Mount Timeline Runner along schedule
  if (schedule) {
    initTimelineRunner(schedule);
  }

  // Mount Hack-o-Matic in #welcome
  initCraftingStation();

  // Mount FAQ filter pills
  initFaqFilters();
}

// ---------- Single-Page Continuous View & Sticky Scroll-Spy HUD ----------
export function initPageView() {
  const pages = $('#pages');
  const panels = $$('#pages > .page[data-station][id]');
  if (!pages || !panels.length || pages.classList.contains('tabbed')) return;
  pages.classList.add('tabbed', 'pv-continuous');
  if (motion) body.classList.add('pv-motion');
  paintGround();
  decorate();

  const grass = Object.assign(document.createElement('div'), { className: 'pv-grass' });
  grass.setAttribute('aria-hidden', 'true');
  const bar = Object.assign(document.createElement('nav'), { className: 'pv-tabbar' });
  bar.setAttribute('aria-label', 'Sections');
  const list = Object.assign(document.createElement('div'), { className: 'pv-tabs' });
  list.setAttribute('role', 'tablist');
  bar.append(list);

  const tabs = new Map();
  for (const panel of panels) {
    // Keep ALL panels visible in continuous sequence
    panel.hidden = false;

    const id = panel.id, station = STATIONS.find(s => s.id === panel.dataset.station);
    const url = `url(${icon(panel.dataset.icon || station?.icon || 'map').url})`;
    panel.style.setProperty('--icon', url);
    const tab = Object.assign(document.createElement('button'), { type: 'button', className: 'pv-tab', id: `tab-${id}` });
    tab.setAttribute('role', 'tab');
    tab.setAttribute('aria-controls', id);
    if (id === 'register') tab.classList.add('cta');
    const art = document.createElement('i');
    art.style.setProperty('--icon', url);
    const label = document.createElement('span');
    label.textContent = station?.en || $('h2', panel)?.textContent || id;
    tab.append(art, label);
    list.append(tab);
    tabs.set(id, tab);
    panel.setAttribute('aria-labelledby', tab.id);
    panel.tabIndex = 0;
    for (const el of $$(REVEAL, panel)) el.dataset.reveal = '';
  }
  pages.prepend(grass, bar);

  // Reveal elements on scroll with a generous 400px pre-trigger margin so they are smoothly revealed before entering view
  const io = motion && new IntersectionObserver(entries => {
    let i = 0;
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      const el = entry.target;
      io.unobserve(el);
      el.style.setProperty('--i', Math.min(i++, 8));
      el.classList.add('is-in');
      countUp(el);
    }
  }, { rootMargin: '400px 0px 200px 0px', threshold: 0.01 });

  if (motion) {
    for (const panel of panels) {
      for (const el of $$('[data-reveal]', panel)) io.observe(el);
    }
  } else {
    for (const panel of panels) countUp(panel);
  }

  // Active section tracking with Scroll-Spy
  let activeId = panels[0]?.id;
  function setActiveTab(id) {
    if (!id || activeId === id) return;
    activeId = id;
    for (const [tid, tab] of tabs) {
      const on = tid === id;
      tab.setAttribute('aria-selected', String(on));
      tab.tabIndex = on ? 0 : -1;
    }
    const activeTab = tabs.get(id);
    if (activeTab) {
      list.scrollTo({
        left: activeTab.offsetLeft - (list.clientWidth - activeTab.offsetWidth) / 2,
        behavior: smooth
      });
    }
  }

  // Initialize first tab as selected
  if (panels[0]) {
    tabs.get(panels[0].id)?.setAttribute('aria-selected', 'true');
  }

  // IntersectionObserver for scroll-spy section detection
  const spyObserver = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        setActiveTab(entry.target.id);
      }
    }
  }, {
    rootMargin: '-20% 0px -55% 0px',
    threshold: 0
  });

  for (const panel of panels) {
    spyObserver.observe(panel);
  }

  // Scroll smoothly to a section
  function scrollToSection(id, push = true) {
    const panel = panels.find(p => p.id === id);
    if (!panel) return;
    setActiveTab(id);
    for (const el of $$('[data-reveal]', panel)) {
      el.classList.add('is-in');
      countUp(el);
    }
    if (push && location.hash !== `#${id}`) {
      history.pushState(null, '', `#${id}`);
    }
    const navH = $('#siteBar')?.offsetHeight || 48;
    const tabH = bar.offsetHeight || 50;
    const top = panel.getBoundingClientRect().top + window.scrollY - (navH + tabH) - 10;
    window.scrollTo({ top: Math.max(0, top), behavior: smooth });
  }

  // Tab click handler
  list.addEventListener('click', e => {
    const tab = e.target.closest('.pv-tab');
    if (tab) {
      const id = tab.getAttribute('aria-controls');
      scrollToSection(id, true);
    }
  });

  // Tab keyboard navigation
  list.addEventListener('keydown', e => {
    const order = [...tabs.keys()], at = order.indexOf(activeId);
    const next = { ArrowRight: at + 1, ArrowLeft: at - 1, Home: 0, End: order.length - 1 }[e.key];
    if (next === undefined) return;
    e.preventDefault();
    const targetId = order[(next + order.length) % order.length];
    scrollToSection(targetId, true);
    tabs.get(targetId)?.focus();
  });

  // Delegated link handler for anchor jump links
  document.addEventListener('click', e => {
    const link = e.target.closest('a[href^="#"]');
    if (!link || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;
    const id = link.getAttribute('href').slice(1);
    if (link.classList.contains('site-logo')) {
      e.preventDefault();
      scrollToSection(panels[0].id, true);
      window.scrollTo({ top: 0, behavior: smooth });
    } else if (tabs.has(id)) {
      e.preventDefault();
      scrollToSection(id, true);
    }
  });

  // Handle URL hash on initial load or popstate
  history.scrollRestoration = 'manual';
  window.addEventListener('popstate', () => {
    const id = location.hash.slice(1);
    if (tabs.has(id)) scrollToSection(id, false);
  });

  const initialHash = location.hash.slice(1);
  if (tabs.has(initialHash)) {
    setTimeout(() => scrollToSection(initialHash, false), 150);
  }

  // Count up numbers in hero
  const facts = $('#hero .hero-facts');
  if (facts) setTimeout(() => countUp(facts), motion ? 350 : 0);
}
