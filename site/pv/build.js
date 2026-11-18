// Builds the page view (#pv) from the <article data-station> cards and data.js.
// The cards stay in #pages for the 3D view; the forms, FAQ items and the
// mailbox form are moved into the page view, since #pages is hidden here.
import { TEAM, PAST, COMMUNITY, BACKERS, SECTIONS } from './data.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const txt = el => (el?.textContent || '').replace(/\s+/g, ' ').trim();
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const noEmoji = s => s.replace(/^[^\p{L}\p{N}]+/u, '').trim();
const pad = n => String(n).padStart(2, '0');

export function threeDHref() {
  const url = new URL(location.href);
  url.searchParams.delete('plain');
  url.searchParams.set('3d', '');
  url.hash = '';
  return url.pathname + url.search.replace(/=(?=&|$)/g, '');
}

function read() {
  const hero = $('#hero');
  const facts = $$('.hero-facts li', hero).map(li => {
    const b = txt(li.querySelector('b'));
    return { b, t: txt(li).slice(b.length).trim() };
  });

  let day = '';
  const schedule = $$('#schedule .schedule-item').map(item => {
    const lines = (item.querySelector('.schedule-time')?.innerText || txt(item.querySelector('.schedule-time'))).split(/\n|(?=\d{2}:\d{2})/).map(s => s.trim()).filter(Boolean);
    const time = lines.pop() || '';
    if (lines.length) day = lines.join(' ');
    return { day, time, title: txt(item.querySelector('strong')), text: txt(item.querySelector('.aside')) };
  });

  const prizes = $$('#prizes .prize-tier').map(p => ({
    rank: ['gold', 'silver', 'bronze'].find(c => p.classList.contains(c)) || '',
    amount: txt(p.querySelector('.prize-amount')),
    title: noEmoji(txt(p.querySelector('h3'))),
    text: txt(p.querySelector('p')),
  }));
  const swag = { title: txt($('#prizes .swag-box h3')), text: txt($('#prizes .swag-box p')) };

  const sponsors = $$('#sponsors .listing').map(l => {
    const [tier, ...rest] = txt(l.querySelector('p')).split(/\s+—\s+/);
    return { name: txt(l.querySelector('h3')), tier, text: rest.join(' — '), href: l.querySelector('a')?.href || '' };
  });

  const tracks = $$('#tracks .track-card').map(c => ({
    tag: txt(c.querySelector('.track-tag')),
    color: c.querySelector('.track-tag')?.style.background || '#ff5a1f',
    title: txt(c.querySelector('h3')).replace(/^\d+\.\s*/, ''),
    text: txt(c.querySelector('p')),
  }));

  const roles = $$('#team .crew-role').map(r => ({ role: txt(r.querySelector('.crew-label')), name: txt(r.querySelector('h3')) }));
  const stats = $$('#welcome .hack-stat').map(s => ({ val: txt(s.querySelector('.val')), lbl: txt(s.querySelector('.lbl')) }));
  const welcome = $$('#welcome > p').map(p => txt(p));
  const venue = {
    place: txt($('#venue .venue-address strong')),
    address: txt($('#venue .venue-address p')).replace(txt($('#venue .venue-address strong')), '').trim(),
    map: $('#venue .venue-address a')?.href || '',
    travel: $$('#venue .travel-item').map(t => ({ title: noEmoji(txt(t.querySelector('h3'))), text: txt(t.querySelector('p')) })),
  };
  return {
    eyebrow: txt($('.hero-eyebrow', hero)), tag: txt($('.hero-tag', hero)), facts,
    starts: hero?.dataset.starts || '', ends: hero?.dataset.ends || '',
    schedule, prizes, swag, sponsors, tracks, roles, stats, welcome, venue,
  };
}

const head = (n, label, title, sub = '', cls = '') => `
  <header class="pv-head ${cls}">
    <p class="pv-kicker" data-r="fade"><span>${pad(n)}</span><i></i><b data-scramble>${esc(label)}</b></p>
    <h2 class="pv-h" data-split>${esc(title)}</h2>
    ${sub ? `<p class="pv-sub" data-r="up">${esc(sub)}</p>` : ''}
  </header>`;

const slot = (name, pose, face = 'front', extra = '') =>
  `<div class="pv-slot pv-slot-${name}" data-slot="${name}" data-pose="${pose}" data-face="${face}" ${extra} aria-hidden="true"><i class="pv-slot-glow"></i></div>`;

function heroHTML(c) {
  return `
  <section class="pv-hero" id="top" data-sect="top" aria-labelledby="pvTitle">
    <div class="pv-hero-media" aria-hidden="true"><video muted playsinline loop preload="none" disablepictureinpicture disableremoteplayback tabindex="-1"></video></div>
    <div class="pv-hero-shade" aria-hidden="true"></div>
    <div class="pv-hero-inner">
      <p class="pv-eyebrow pv-intro"><i class="pv-dot"></i><span data-scramble>${esc(c.eyebrow || 'GDG on Campus · NIT Hamirpur presents')}</span></p>
      <h1 class="pv-wordmark" id="pvTitle"><span class="sr">Labyrinth</span><canvas aria-hidden="true"></canvas></h1>
      <div class="pv-count pv-intro" role="timer" aria-label="Time until hacking starts" data-starts="${esc(c.starts)}" data-ends="${esc(c.ends)}"></div>
      <div class="pv-hero-cta pv-intro">
        <a class="pv-btn pv-btn-fire" href="#contact" data-to="contact"><span>Register now</span><b aria-hidden="true">→</b></a>
        <a class="pv-btn pv-btn-ghost" href="${esc(threeDHref())}" data-3d><span>Explore our world</span><b aria-hidden="true">◈</b></a>
      </div>
    </div>
    <a class="pv-cue" href="#about" data-to="about" aria-label="Scroll to About"><span class="pv-mouse"><i></i></span><span>Scroll to enter</span></a>
  </section>`;
}

function aboutHTML(c) {
  const [lead = '', body = ''] = c.welcome;
  const bits = [
    ['When', c.facts[0] ? `${c.facts[0].b}, ${c.facts[0].t}` : ''],
    ['Where', c.venue.place ? `${c.venue.place}, NIT Hamirpur` : ''],
    ['Teams', '2 to 4 builders'],
    ['Entry', 'Free, meals included'],
  ].filter(b => b[1]);
  return `
  <section class="pv-sec pv-about" id="about" data-sect="about">
    <div class="pv-wrap pv-about-grid">
      ${slot('about', 'wave', 'front', 'data-travel="run"')}
      <div class="pv-about-copy">
        ${head(1, 'About', 'Enter the Labyrinth')}
        <p class="pv-lead" data-r="up">${esc(lead)}</p>
        <p class="pv-body" data-r="up">${esc(body)}</p>
        <dl class="pv-facts" data-stagger>${bits.map(([k, v]) => `<div data-r="up"><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>
      </div>
    </div>
  </section>`;
}

// Line icons (24×24, stroked) chosen from an event's title.
const ICONS = [
  [/check-?in|breakfast|badge|welcome/i, '<path d="M4 8h16v3a2 2 0 0 0 0 4v3H4v-3a2 2 0 0 0 0-4z"/><path d="M14 8v10" stroke-dasharray="2 2"/>'],
  [/hacking|commence|coding|matching/i, '<path d="m8 8-4 4 4 4M16 8l4 4-4 4M13.5 5l-3 14"/>'],
  [/lunch|dinner|meal|food/i, '<path d="M7 3v8a2 2 0 0 0 2 2v8M7 3v5M11 3v5a2 2 0 0 1-2 2M17 21V3c-2 0-3 2-3 6s1 5 3 5"/>'],
  [/workshop/i, '<path d="m12 3 8 4.5v9L12 21l-8-4.5v-9z"/><path d="m4 7.5 8 4.5 8-4.5M12 12v9"/>'],
  [/midnight|games|energy/i, '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/><path d="m16 3 .7 1.6L18.3 5l-1.6.7L16 7.3l-.7-1.6L13.7 5l1.6-.4z"/>'],
  [/deadline|submission/i, '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2.5M9 2h6"/>'],
  [/demo|judging|expo/i, '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M12 16v4M8 20h8M8 9h5M8 12h8"/>'],
  [/closing|award|trophy/i, '<path d="M8 4h8v5a4 4 0 0 1-8 0zM8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M9 20h6l-1-3h-4z"/>'],
  [/ceremony|keynote|opening/i, '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>'],
  [/farewell|departure/i, '<path d="M4 18h16M6 18a6 6 0 0 1 12 0M12 8V5M5.6 10.6 3.8 8.8M18.4 10.6l1.8-1.8"/>'],
];
const icon = title => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${(ICONS.find(([re]) => re.test(title)) || [, '<circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 2"/>'])[1]}</svg>`;
const DAY_NOTES = ['The run begins', 'The final stretch', 'One more turn'];

function timelineHTML(c) {
  let lastDay = '', n = 0, side = 0, k = 0;
  const items = c.schedule.map(s => {
    let out = '';
    if (s.day && s.day !== lastDay) {
      lastDay = s.day;
      const dayN = ++n;
      out += `
      <li class="pv-tl-day">
        <span class="pv-tl-day-n" data-r="up">Day <b>${pad(dayN)}</b></span>
        <i class="pv-tl-day-node" aria-hidden="true"></i>
        <span class="pv-tl-day-d" data-r="up">${esc(s.day)}<small>${esc(DAY_NOTES[dayN - 1] || '')}</small></span>
      </li>`;
    }
    side ^= 1; k++;
    // "Main Atrium — Badge collection, coffee & light bites": the place, then the detail.
    const [place, ...rest] = s.text.split(/\s+—\s+/);
    const detail = rest.join(' — ');
    out += `
      <li class="pv-tl-item" data-side="${side ? 'l' : 'r'}" data-time="${esc((s.day ? s.day + ' · ' : '') + s.time)}">
        <i class="pv-tl-node"></i><i class="pv-tl-branch"></i>
        <article class="pv-card pv-tl-card" data-tilt>
          <i class="pv-tl-ring" aria-hidden="true"></i><i class="pv-tl-edge" aria-hidden="true"></i>
          <span class="pv-tl-big" aria-hidden="true">${pad(k)}</span>
          <span class="pv-tl-icon">${icon(s.title)}</span>
          <div class="pv-tl-body">
            <p class="pv-tl-meta"><span class="pv-num"></span><time>${esc(s.time)}</time><span class="pv-tl-dayl">${esc(lastDay)}</span></p>
            <h3>${esc(s.title)}</h3>
            ${detail ? `<p class="pv-tl-text">${esc(detail)}</p>` : ''}
            ${place ? `<p class="pv-tl-place"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 21s-6-5.3-6-11a6 6 0 0 1 12 0c0 5.7-6 11-6 11z"/><circle cx="12" cy="10" r="2.2"/></svg>${esc(detail ? place : s.text)}</p>` : ''}
          </div>
          <i class="pv-tl-prog" aria-hidden="true"><b></b></i>
        </article>
      </li>`;
    return out;
  }).join('');
  return `
  <section class="pv-sec pv-timeline" id="timeline" data-sect="timeline">
    <div class="pv-wrap">${head(2, 'Timeline', 'Run of the night', 'Twenty-four hours, one maze. All times in IST.', 'center')}</div>
    <div class="pv-tl">
      <div class="pv-tl-layer" aria-hidden="true"><div class="pv-tl-sticky">
        <div class="pv-tl-floor"><i></i></div>
        ${slot('timeline', 'run', 'front', 'data-travel="run" data-sticky data-enter="horizon"')}
        <p class="pv-tl-now"><span>Now</span><b>—</b></p>
      </div></div>
      <div class="pv-tl-spine" aria-hidden="true"><i></i><b></b></div>
      <ol class="pv-tl-list">${items}</ol>
    </div>
  </section>`;
}

const mono = name => (name.match(/\b\p{L}/gu) || ['?']).slice(0, 2).join('').toUpperCase();

// A gem for each sponsor tier's medal.
const GEM = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" aria-hidden="true"><path d="M7 4h10l4 5-9 11L3 9z"/><path d="M3 9h18M9.5 4 8 9l4 11 4-11-1.5-5" opacity=".6"/></svg>';

function partnersHTML(c) {
  const [title, ...rest] = c.sponsors;
  const tierKey = s => (s.tier.match(/^(\w+)/) || ['', 'partner'])[1].toLowerCase();
  const visit = `<span class="pv-logo-cta">Visit <b aria-hidden="true">↗</b></span>`;
  const big = s => `
    <a class="pv-card pv-logo is-title" data-tier="title" href="${esc(s.href)}" target="_blank" rel="noopener" style="--i:0" data-tilt>
      <i class="pv-logo-ring" aria-hidden="true"></i><i class="pv-streak" aria-hidden="true"></i><i class="pv-logo-rays" aria-hidden="true"></i>
      <span class="pv-logo-emblem" aria-hidden="true"><i></i><i></i><span class="pv-logo-mark">${esc(mono(s.name))}</span></span>
      <span class="pv-logo-txt">
        <span class="pv-tier"><span class="pv-medal">${GEM}</span>${esc(s.tier)}</span>
        <b>${esc(s.name)}</b><small>${esc(s.text)}</small>
        <span class="pv-logo-cta is-big">Visit site <b aria-hidden="true">↗</b></span>
      </span>
    </a>`;
  const tile = (s, i) => `
    <a class="pv-card pv-logo" data-tier="${esc(tierKey(s))}" href="${esc(s.href)}" target="_blank" rel="noopener" style="--i:${i}" data-tilt>
      <i class="pv-streak" aria-hidden="true"></i>
      <span class="pv-logo-head"><span class="pv-logo-mark" aria-hidden="true">${esc(mono(s.name))}</span><span class="pv-medal" title="${esc(s.tier)}">${GEM}</span></span>
      <span class="pv-logo-txt"><b>${esc(s.name)}</b><small>${esc(s.text)}</small></span>
      <span class="pv-logo-foot"><span class="pv-tier">${esc(s.tier.replace(/\s*partner$/i, ''))}</span>${visit}</span>
    </a>`;
  const names = c.sponsors.map(s => `<span>${esc(s.name)}</span><i aria-hidden="true">✦</i>`).join('');
  return `
  <section class="pv-sec pv-partners" id="partners" data-sect="partners" data-in>
    <div class="pv-wrap pv-partners-grid">
      <div class="pv-partners-main">
        ${head(3, 'Sponsors', 'Powered by', 'The partners who keep the torches lit.')}
        <div class="pv-logos">
          ${title ? big(title) : ''}${rest.map((s, i) => tile(s, i + 1)).join('')}
          <a class="pv-logo-join" href="#contact" data-to="contact" data-msg style="--i:${rest.length + 1}">
            <span class="pv-logo-plus" aria-hidden="true">+</span>
            <span><b>Become a partner</b><small>Put your name on the night. Write to the organisers.</small></span>
          </a>
        </div>
      </div>
      ${slot('partners', 'point', 'left', 'data-travel="run"')}
    </div>
    <div class="pv-ticker" aria-hidden="true"><div class="pv-ticker-track">${names.repeat(4)}</div></div>
  </section>`;
}

function awardsHTML(c) {
  const [p1, p2, p3, ...specials] = c.prizes;
  const card = (p, cls, label) => p ? `
    <div class="pv-prize ${cls}">
      <p class="pv-prize-rank">${label}</p>
      <p class="pv-prize-amt" data-count>${esc(p.amount)}</p>
      <p class="pv-prize-title">${esc(p.title)}</p>
    </div>` : '';
  const pool = c.stats.find(s => /prize/i.test(s.lbl))?.val || '';
  return `
  <section class="pv-sec pv-awards" id="awards" data-sect="awards">
    <div class="pv-pin pv-awards-pin"><div class="pv-stage">
      ${head(4, 'Prizes', 'The hoard', pool ? `${pool} prize pool, plus sponsor perks and swag.` : '', 'center')}
      <div class="pv-podium">
        <div class="pv-orbit" aria-hidden="true"><i></i><i></i><i></i></div>
        <div class="pv-floaters" aria-hidden="true">${Array.from({ length: 9 }, (_, i) => `<i class="pv-cube c${i % 4}" style="--i:${i}"></i>`).join('')}</div>
        ${slot('trophy', 'fly', 'front', 'data-travel="fly" data-sticky data-move="orbit" data-scale="0.78"')}
        ${card(p1, 'p1', '1st place')}${card(p2, 'p2', '2nd place')}${card(p3, 'p3', '3rd place')}
      </div>
    </div></div>
    <div class="pv-wrap pv-specials" data-stagger>
      ${specials.map(p => `<div class="pv-card pv-special" data-r="up" data-tilt><p class="pv-prize-amt" data-count>${esc(p.amount)}</p><h3>${esc(p.title)}</h3><p>${esc(p.text)}</p></div>`).join('')}
      ${c.swag.title ? `<div class="pv-card pv-special pv-swag" data-r="up" data-tilt><p class="pv-prize-amt">Swag</p><h3>${esc(c.swag.title)}</h3><p>${esc(c.swag.text)}</p></div>` : ''}
    </div>
  </section>`;
}

function crewHTML(c) {
  const people = [
    ...TEAM.map(p => ({ ...p })),
    ...c.roles.filter(r => !TEAM.some(t => t.role === r.role.replace(/s$/, ''))).map(r => ({ name: /^team$/i.test(r.name) ? 'Announcing soon' : r.name, role: r.role, tba: /^team$/i.test(r.name) })),
  ];
  const card = (p, i) => `
    <figure class="pv-player ${p.tba ? 'is-tba' : ''}" style="--i:${i}">
      <span class="pv-player-tag">${p.tba ? 'Loading…' : 'Player ready'}</span>
      ${p.photo ? `<img src="${esc(p.photo)}" alt="" loading="lazy" width="400" height="500">` : `<canvas data-face="${esc(p.name)}" width="8" height="8"></canvas>`}
      <figcaption><b>${esc(p.name)}</b><span>${esc(p.role)}</span></figcaption>
    </figure>`;
  const set = people.map(card).join('');
  return `
  <section class="pv-sec pv-crew" id="crew" data-sect="crew">
    <div class="pv-wrap">${head(5, 'Team', 'The crew', 'Organised by Google Developer Groups on Campus, NIT Hamirpur.')}</div>
    <div class="pv-film">
      ${slot('crew', 'ride', 'right', 'data-travel="fly"')}
      <div class="pv-film-strip" role="list" aria-label="Organising team"><div class="pv-film-track">${set}${set.replace(/<figure /g, '<figure aria-hidden="true" ')}${set.replace(/<figure /g, '<figure aria-hidden="true" ')}</div></div>
    </div>
  </section>`;
}

// Line icons for past events and community stats.
const LINE = {
  shield: '<path d="M12 3 4 6v6c0 4.5 3.4 8 8 9 4.6-1 8-4.5 8-9V6z"/><rect x="9" y="11" width="6" height="5" rx="1"/><path d="M10 11V9.5a2 2 0 0 1 4 0V11"/>',
  branch: '<circle cx="6" cy="5" r="2"/><circle cx="6" cy="19" r="2"/><circle cx="18" cy="8" r="2"/><path d="M6 7v10M18 10c0 4-6 3-11.2 7.5"/>',
  seed: '<path d="M12 21v-8M12 13c0-4 3-7 8-7 0 5-3 7-8 7zM12 15c0-3-2.5-5-6.5-5 0 4 2.5 5 6.5 5z"/>',
  flag: '<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>',
  terminal: '<rect x="3" y="4" width="18" height="16" rx="2.5"/><path d="m7 9 3 3-3 3M12.5 15H17"/>',
  calendar: '<rect x="3.5" y="5" width="17" height="15" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4M8 14h2M14 14h2M8 17h2"/>',
  users: '<circle cx="9" cy="8.5" r="3.2"/><path d="M3 20c.6-3.3 3-5 6-5s5.4 1.7 6 5"/><circle cx="17" cy="9.5" r="2.4"/><path d="M16.5 14.6c2.4.2 4 1.7 4.5 4.4"/>',
  code: '<path d="m8 8-4 4 4 4M16 8l4 4-4 4M13.5 5l-3 14"/>',
};
const line = (k, w = 1.7) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${LINE[k] || LINE.flag}</svg>`;

function pastHTML() {
  return `
  <section class="pv-sec pv-past pv-pin" id="past" data-sect="past">
    <div class="pv-stage pv-past-stage">
      <div class="pv-wrap">${head(6, 'Past events', 'Echoes in the maze', 'Events the chapter has run before Labyrinth.')}</div>
      <div class="pv-past-rail">
        <ol class="pv-past-track">
          ${PAST.map((e, i) => `
          <li class="pv-card pv-event ${e.boss ? 'is-boss' : ''}" data-tilt style="--i:${i}">
            <div class="pv-event-art" aria-hidden="true">
              <span>${pad(i + 1)}</span>
              <i class="pv-event-icon">${line(e.icon, 1.6)}</i>
              ${e.boss ? '<b class="pv-event-boss">Boss level</b>' : ''}
            </div>
            <p class="pv-tier">${esc(e.boss ? e.tag.replace(/^Boss level\s*·\s*/, '') : e.tag)}</p>
            <h3>${esc(e.title)}</h3>
            ${e.meta ? `<p class="pv-event-meta">${esc(e.meta)}</p>` : ''}
            <p class="pv-event-text">${esc(e.text)}</p>
            ${e.stats?.length ? `<ul class="pv-event-stats">${e.stats.map(s => `<li>${esc(s)}</li>`).join('')}</ul>` : ''}
          </li>`).join('')}
        </ol>
      </div>
      <div class="pv-ledge" aria-hidden="true">${slot('past', 'run', 'right', 'data-travel="run" data-sticky data-move="treadmill"')}</div>
      <p class="pv-past-count" aria-hidden="true"><b>01</b> / ${pad(PAST.length)}</p>
    </div>
  </section>`;
}

// The chapter in numbers, and the partners of past events (two rows that drift
// in opposite directions, faster while the page scrolls).
function legacyHTML() {
  const hue = name => { let h = 0; for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) % 360; return h; };
  const chip = n => `<span class="pv-backer" style="--h:${hue(n)}"><b aria-hidden="true">${esc(mono(n.replace(/^\./, '')) || n.slice(0, 2))}</b>${esc(n)}</span>`;
  const half = Math.ceil(BACKERS.length / 2);
  const rowA = BACKERS.slice(0, half).map(chip).join(''), rowB = BACKERS.slice(half).map(chip).join('');
  return `
  <section class="pv-sec pv-legacy" id="legacy" data-sect="legacy">
    <div class="pv-wrap">
      ${head(7, 'Community', 'Our community', 'The chapter over the past year.')}
      <ul class="pv-legacy-stats" data-stagger>
        ${COMMUNITY.map((s, i) => `
        <li class="pv-card" data-r="up" data-tilt style="--i:${i}">
          <span class="pv-legacy-icon">${line(s.icon)}</span>
          <span class="pv-legacy-val"><b data-count>${esc(s.val)}</b><small>${esc(s.lbl)}</small></span>
          <i class="pv-legacy-bars" aria-hidden="true">${'<i></i>'.repeat(12)}</i>
        </li>`).join('')}
      </ul>
      <div class="pv-legacy-backed">
        <p class="pv-kicker" data-r="fade"><span>✦</span><i></i><b data-scramble>Backed by</b></p>
        <p class="pv-sub" data-r="up">Sponsors and partners of our past events.</p>
      </div>
    </div>
    <div class="pv-marquee" data-dir="-1" aria-label="Past partners"><div class="pv-marquee-track">${rowA}${rowA.replace(/<span class/g, '<span aria-hidden="true" class')}${rowA.replace(/<span class/g, '<span aria-hidden="true" class')}</div></div>
    <div class="pv-marquee" data-dir="1" aria-hidden="true"><div class="pv-marquee-track">${rowB}${rowB}${rowB}</div></div>
  </section>`;
}

// A line icon for each track, from its title.
const TRACK_ICONS = [
  [/agent|ai\b|autonom/i, '<path d="M12 3v3M12 18v3M3 12h3M18 12h3"/><rect x="7" y="7" width="10" height="10" rx="3"/><circle cx="10.5" cy="11" r="1"/><circle cx="13.5" cy="11" r="1"/><path d="M10 14h4"/>'],
  [/decentral|chain|zero/i, '<rect x="3" y="9" width="8" height="6" rx="3"/><rect x="13" y="9" width="8" height="6" rx="3"/><path d="M9 12h6M7 5l1.5 2M17 5l-1.5 2M7 19l1.5-2M17 19l-1.5-2"/>'],
  [/3d|spatial|web/i, '<path d="m12 3 8 4.5v9L12 21l-8-4.5v-9z"/><path d="m4 7.5 8 4.5 8-4.5M12 12v9"/><path d="M8 5.3 16 9.8" opacity=".5"/>'],
  [/./, '<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z"/><path d="M12 7v3l2 1" opacity=".6"/>'],
];
const trackIcon = title => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${TRACK_ICONS.find(([re]) => re.test(title))[1]}</svg>`;

function questsHTML(c) {
  return `
  <section class="pv-sec pv-quests pv-pin" id="quests" data-sect="quests">
    <div class="pv-stage pv-quests-stage">
      <div class="pv-wrap pv-quests-head">${head(8, 'Tracks', 'Choose your path', `${c.tracks.length} tracks. Pick one and forge it in a night.`)}
        ${slot('quests', 'glide', 'left', 'data-travel="fly" data-sticky data-hold-end="0.72"')}</div>
      <div class="pv-fan">
        ${c.tracks.map((t, i) => `
        <article class="pv-quest" style="--i:${i};--c:${esc(t.color)}" tabindex="0">
          <div class="pv-quest-in">
            <div class="pv-quest-back" aria-hidden="true"><i></i><span>${pad(i + 1)}</span><small>Track</small></div>
            <div class="pv-quest-front">
              <i class="pv-quest-orb" aria-hidden="true"></i><i class="pv-quest-grid" aria-hidden="true"></i>
              <div class="pv-quest-top">
                <span class="pv-quest-icon">${trackIcon(t.title)}</span>
                <span class="pv-quest-n" aria-hidden="true">${pad(i + 1)}</span>
              </div>
              <p class="pv-quest-k">Track ${pad(i + 1)} <span>·</span> ${esc(t.tag)}</p>
              <h3>${esc(t.title)}</h3>
              <p class="pv-quest-d">${esc(t.text)}</p>
              <a class="pv-quest-go" href="#contact" data-to="contact">Pick this track <b aria-hidden="true">→</b></a>
            </div>
          </div>
        </article>`).join('')}
      </div>
      <div class="pv-quest-dots" aria-hidden="true">${c.tracks.map(() => '<i></i>').join('')}</div>
    </div>
  </section>`;
}

function numbersHTML(c) {
  return `
  <section class="pv-sec pv-numbers" id="numbers" data-sect="numbers" aria-label="Labyrinth in numbers">
    <div class="pv-wrap">
      ${slot('numbers', 'run', 'right', 'data-travel="fly" data-move="hurdle"')}
      <ul class="pv-stats" data-stagger>${c.stats.map((s, i) => `
        <li data-r="up" style="--i:${i}"><b data-count>${esc(s.val)}</b><span>${esc(s.lbl)}</span><i></i></li>`).join('')}
      </ul>
    </div>
  </section>`;
}

function contactHTML(c) {
  return `
  <section class="pv-sec pv-contact" id="contact" data-sect="contact">
    <div class="pv-wrap pv-contact-grid">
      <div class="pv-contact-main">
        ${head(9, 'Contact', 'Join the run', 'Register your team, or send the organisers a message.')}
        <div class="pv-card pv-forms" data-r="up">
          <div class="pv-tabs" role="tablist" aria-label="Contact">
            <button role="tab" id="pvTabReg" aria-controls="pvPanelReg" aria-selected="true">Register</button>
            <button role="tab" id="pvTabMsg" aria-controls="pvPanelMsg" aria-selected="false" tabindex="-1">Message us</button>
            <i class="pv-tabs-ink" aria-hidden="true"></i>
          </div>
          <div class="pv-panel" id="pvPanelReg" role="tabpanel" aria-labelledby="pvTabReg"></div>
          <div class="pv-panel" id="pvPanelMsg" role="tabpanel" aria-labelledby="pvTabMsg" hidden><p class="pv-muted">Loading the message form…</p></div>
        </div>
      </div>
      <aside class="pv-contact-side">
        <div class="pv-card pv-venue" data-r="up" data-tilt>
          <p class="pv-tier">Venue</p>
          <h3>${esc(c.venue.place)}</h3>
          <p>${esc(c.venue.address)}</p>
          ${c.venue.map ? `<a class="pv-btn pv-btn-ghost pv-btn-sm" href="${esc(c.venue.map)}" target="_blank" rel="noopener"><span>Open in Google Maps</span><b aria-hidden="true">↗</b></a>` : ''}
          <ul class="pv-travel">${c.venue.travel.map(t => `<li><b>${esc(t.title)}</b><span>${esc(t.text)}</span></li>`).join('')}</ul>
        </div>
        <div class="pv-faq" data-r="up"><p class="pv-tier">FAQ</p></div>
      </aside>
    </div>
    ${slot('contact', 'idle', 'front', 'data-travel="run"')}
  </section>`;
}

function voidHTML() {
  return `
  <footer class="pv-void" id="void" data-sect="void">
    <div class="pv-pin pv-void-pin"><div class="pv-stage pv-void-stage">
      <div class="pv-void-floor" aria-hidden="true"><i></i></div>
      <div class="pv-rays" aria-hidden="true">${'<i></i>'.repeat(6)}</div>
      <i class="pv-void-flash" aria-hidden="true"></i>
      ${slot('crater', 'flail', 'front', 'data-sticky data-move="crater" data-travel="jump"')}
      <div class="pv-void-copy">
        <p class="pv-kicker"><span>∞</span><i></i>The way in</p>
        <h2 class="pv-h">See you inside the Labyrinth</h2>
        <div class="pv-hero-cta">
          <a class="pv-btn pv-btn-fire" href="#contact" data-to="contact"><span>Register now</span><b aria-hidden="true">→</b></a>
          <a class="pv-btn pv-btn-ghost" href="${esc(threeDHref())}" data-3d><span>Explore our world</span><b aria-hidden="true">◈</b></a>
        </div>
      </div>
    </div></div>
    <div class="pv-foot">
      <div class="pv-wrap pv-foot-grid">
        <p class="pv-foot-brand"><img src="assets/favicon.png" alt="" width="28" height="28"><b>Labyrinth</b><span>Organised by Google Developer Groups on Campus, NIT Hamirpur.</span></p>
        <nav class="pv-foot-links" aria-label="Footer">${SECTIONS.map(s => `<a href="#${s.id}" data-to="${s.id}">${esc(s.label)}</a>`).join('')}<a href="${esc(threeDHref())}" data-3d>3D world</a></nav>
        <button class="pv-top" type="button" data-to="top"><span>Back to top</span><b aria-hidden="true">↑</b></button>
      </div>
    </div>
  </footer>`;
}

function barHTML() {
  const links = SECTIONS.map(s => `<a href="#${s.id}" data-to="${s.id}">${esc(s.label)}</a>`).join('');
  return `
  <header class="pv-bar is-top" id="pvBar">
    <a class="pv-brand" href="#top" data-to="top"><img src="assets/favicon.png" alt="" width="26" height="26"><span>Labyrinth</span></a>
    <nav class="pv-nav" aria-label="Sections">${links}<i class="pv-nav-ink" aria-hidden="true"></i></nav>
    <div class="pv-bar-end">
      <a class="pv-btn pv-btn-ghost pv-btn-sm pv-hide-sm" href="${esc(threeDHref())}" data-3d><span>Explore 3D</span></a>
      <a class="pv-btn pv-btn-fire pv-btn-sm" href="#contact" data-to="contact"><span>Register</span></a>
      <button class="pv-burger" type="button" aria-expanded="false" aria-controls="pvMenu" aria-label="Open menu"><i></i><i></i></button>
    </div>
  </header>
  <div class="pv-menu" id="pvMenu" hidden>
    <nav aria-label="Menu">${SECTIONS.map((s, i) => `<a href="#${s.id}" data-to="${s.id}" style="--i:${i}"><span>${pad(i + 1)}</span>${esc(s.label)}</a>`).join('')}</nav>
    <a class="pv-btn pv-btn-ghost" href="${esc(threeDHref())}" data-3d style="--i:${SECTIONS.length}"><span>Explore our world in 3D</span><b aria-hidden="true">◈</b></a>
  </div>
  <div class="pv-progress" aria-hidden="true"><i></i></div>`;
}

export function build({ mail = '' } = {}) {
  const c = read();
  const root = document.createElement('div');
  root.id = 'pv';
  root.innerHTML = barHTML() + `<main class="pv-main" id="pvMain">` +
    heroHTML(c) + aboutHTML(c) + timelineHTML(c) + partnersHTML(c) + awardsHTML(c) +
    crewHTML(c) + pastHTML() + legacyHTML() + questsHTML(c) + numbersHTML(c) + contactHTML(c) + `</main>` + voidHTML();
  ($('#appShift') || document.body).prepend(root);

  // Number the timeline cards.
  $$('.pv-tl-item .pv-num', root).forEach((el, i) => { el.textContent = pad(i + 1) + '.'; });

  // Move the live forms and FAQ items in: they keep their behaviour and ids.
  const form = $('#register form.signup');
  if (form) $('#pvPanelReg', root).append(form);
  const faq = $('.pv-faq', root);
  for (const d of $$('#faq details')) faq.append(d);
  messageForm($('#pvPanelMsg', root), mail);
  return { root, content: c };
}

// The guestbook opens the visitor's email app (AGENTS.md "Guestbook").
function messageForm(panel, email) {
  if (!email) { panel.innerHTML = `<p class="pv-muted">Use the Register tab to reach the organisers.</p>`; return; }
  panel.innerHTML = `
    <form class="signup pv-msg">
      <input name="name" maxlength="80" required placeholder="Your name" aria-label="Your name" autocomplete="name">
      <input name="email" type="email" maxlength="120" required placeholder="Your email" aria-label="Your email" autocomplete="email">
      <textarea name="message" rows="5" maxlength="1500" required placeholder="Your message" aria-label="Your message"></textarea>
      <div class="mailbox-foot"><button class="pv-btn pv-btn-fire" type="submit"><span>Send message</span><b aria-hidden="true">→</b></button></div>
    </form>`;
  panel.querySelector('form').addEventListener('submit', e => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const subject = `Labyrinth: message from ${f.get('name')}`;
    const body = `${f.get('message')}\n\n${f.get('name')} <${f.get('email')}>`;
    location.href = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  });
}
