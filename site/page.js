// Page view (?plain, or when the 3D world can't start): the island's cards laid
// out as a website. Each card becomes a tab under the hero, the ground is
// Minecraft dirt under a grass edge, and cards ease in as they scroll into
// view. site.js loads this module only in page view, so the 3D site never
// downloads it. The cards stay the same <article>s the 3D panel shows.
import { STATIONS } from '@world/layout.js';
import { icon } from '@engine/ui/icons.js';

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const body = document.body;
const motion = !matchMedia('(prefers-reduced-motion: reduce)').matches && 'IntersectionObserver' in window;
const smooth = motion ? 'smooth' : 'auto';

// Cards and rows that ease in when they come into view.
const REVEAL = [
  '.hack-stat', '.track-card', '.pv-day', '.schedule-item', '.prize-tier', '#prizes > h3', '#prizes > h3 + p',
  '.store > li', '.crew-role', '.faq-box', '.venue-address', '.travel-item', '.page > form',
].join(', ');
// Figures that count up from zero the first time they are shown.
const COUNT = '.hack-stat .val, .prize-amount, .hero-facts b';

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
  // Dirt, darkened like the background of Minecraft's option screens.
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
    // "₹1,50,000", "300+", "36h", "36 hours". Text that opens with a word ("Jan 17–18") is left alone.
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

// ---------- Small layout touches that need the DOM ----------
function decorate() {
  // Each track card takes the colour of its sponsor tag.
  for (const card of $$('.track-card')) {
    const tag = $('.track-tag', card);
    if (tag?.style.backgroundColor) card.style.setProperty('--tc', tag.style.backgroundColor);
  }
  // The schedule splits into one column per day; the date moves to the column heading.
  const schedule = $('#schedule');
  const items = schedule ? $$('.schedule-item', schedule) : [];
  if (items.length) {
    const days = Object.assign(document.createElement('div'), { className: 'pv-days' });
    
    // Top horizontal railway track spanning Day 1 and Day 2
    const topBar = Object.assign(document.createElement('div'), { className: 'pv-timeline-top' });
    topBar.setAttribute('aria-hidden', 'true');
    topBar.innerHTML = `
      <div class="pv-top-track-inner">
        <i class="pv-prop-torch" title="Redstone Torch"></i>
        <div class="pv-top-badge d1">DAY 1 - JAN 17</div>
        <div class="pv-rail-h"><i class="pv-minecart" title="Minecart"></i></div>
        <div class="pv-top-badge d2">DAY 2 - JAN 18</div>
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

      // Assign theme and props
      const isDay1 = (n === 1);
      const idx = dayItemIndex++;
      item.classList.add(isDay1 ? 'item-d1' : 'item-d2');
      item.classList.add(`row-${idx}`);

      const theme = isDay1
        ? ['theme-stone', 'theme-wood', 'theme-stone', 'theme-stone-wood', 'theme-wood'][idx] || 'theme-stone'
        : ['theme-wood', 'theme-stone', 'theme-wood', 'theme-stone', 'theme-wood'][idx] || 'theme-wood';
      item.classList.add(theme);

      // Prepend vertical rail track graphic behind/along time slot
      if (!item.querySelector('.rail-track')) {
        const rail = document.createElement('div');
        rail.className = 'rail-track';
        rail.setAttribute('aria-hidden', 'true');
        item.prepend(rail);
      }

      // Append decorative Minecraft props matching the reference image
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
}

// ---------- Tabs ----------
export function initPageView() {
  const pages = $('#pages');
  const panels = $$('#pages > .page[data-station][id]');
  if (!pages || !panels.length || pages.classList.contains('tabbed')) return;
  pages.classList.add('tabbed');
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
    panel.setAttribute('role', 'tabpanel');
    panel.setAttribute('aria-labelledby', tab.id);
    panel.tabIndex = 0;
    for (const el of $$(REVEAL, panel)) el.dataset.reveal = '';
  }
  pages.prepend(grass, bar);

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
  }, { rootMargin: '0px 0px -6% 0px', threshold: 0.12 });

  // Where the tab bar settles under the top bar: the top of the content.
  const settle = () => grass.getBoundingClientRect().bottom + scrollY - $('#siteBar').offsetHeight;

  let current = null;
  function select(id, { push = false, scroll = 'never', focus = false } = {}) {
    const panel = panels.find(p => p.id === id) || panels[0];
    if (panel !== current) {
      current = panel;
      for (const p of panels) {
        const on = p === panel, tab = tabs.get(p.id);
        p.hidden = !on;
        tab.setAttribute('aria-selected', String(on));
        tab.tabIndex = on ? 0 : -1;
      }
      const tab = tabs.get(panel.id);
      list.scrollTo({ left: tab.offsetLeft - (list.clientWidth - tab.offsetWidth) / 2, behavior: smooth });
      if (motion) {
        for (const el of [panel, tab]) { el.classList.remove('pv-enter'); void el.offsetWidth; el.classList.add('pv-enter'); }
        for (const el of $$('[data-reveal]', panel)) { el.classList.remove('is-in'); io.observe(el); }
      } else countUp(panel);
    }
    if (push && location.hash !== `#${panel.id}`) history.pushState(null, '', `#${panel.id}`);
    // A link always brings its section into view; a tab only lifts the page
    // back to the top of the content once the bar has stuck.
    const top = settle();
    if (scroll === 'always' || (scroll === 'stuck' && scrollY > top + 1)) scrollTo({ top, behavior: smooth });
    if (focus) tabs.get(panel.id).focus();
  }

  list.addEventListener('click', e => {
    const tab = e.target.closest('.pv-tab');
    if (tab) select(tab.getAttribute('aria-controls'), { push: true, scroll: 'stuck' });
  });
  list.addEventListener('keydown', e => {
    const order = [...tabs.keys()], at = order.indexOf(current.id);
    const next = { ArrowRight: at + 1, ArrowLeft: at - 1, Home: 0, End: order.length - 1 }[e.key];
    if (next === undefined) return;
    e.preventDefault();
    select(order[(next + order.length) % order.length], { push: true, scroll: 'stuck', focus: true });
  });

  // In-page links (#register, #tracks, the logo) switch tabs instead of jumping.
  document.addEventListener('click', e => {
    const link = e.target.closest('a[href^="#"]');
    if (!link || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;
    const id = link.getAttribute('href').slice(1);
    if (link.classList.contains('site-logo')) {
      e.preventDefault();
      select(panels[0].id, { push: true });
      scrollTo({ top: 0, behavior: smooth });
    } else if (tabs.has(id)) {
      e.preventDefault();
      select(id, { push: true, scroll: 'always' });
    }
  });
  // Back and Forward switch tabs; the tab bar, not the browser, decides the scroll.
  history.scrollRestoration = 'manual';
  addEventListener('popstate', () => select(location.hash.slice(1), { scroll: 'stuck' }));

  const start = location.hash.slice(1);
  select(start);
  if (tabs.has(start)) requestAnimationFrame(() => scrollTo({ top: settle() }));
  // The hero's figures count up as it rises in.
  const facts = $('#hero .hero-facts');
  if (facts) setTimeout(() => countUp(facts), motion ? 350 : 0);
}
