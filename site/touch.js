// On-screen controls for touch screens (issue #30): a thumbstick in the
// bottom-left corner to walk and a jump button on the right. They appear
// only where the main pointer is coarse (phones and tablets), and only while
// the island is free to explore: never over the hero, an open card, the
// phone, the big map, the chat or the flight pad.
//
// The engine reads walking from the keys (engine/input.js), so the stick
// holds W, A, S and D down through ordinary key events, snapped to eight
// directions like the engine's flight pad, plus Shift to run when pushed to
// the rim. Jump calls the player's own jump, so two quick taps never start
// flight the way two Spaces do. Both are DOM elements above the canvas: a
// finger on them never reaches the camera's drag, pinch or tap.
import { isHeroOn } from './hero.js';

const body = document.body;
const KEYS = { up: ['KeyW', 'w'], down: ['KeyS', 's'], left: ['KeyA', 'a'], right: ['KeyD', 'd'], run: ['ShiftLeft', 'Shift'] };
const DEAD = 0.25, RUN = 0.9;

export function initTouchControls(h, { onStart } = {}) {
  if (!matchMedia('(pointer: coarse)').matches) return null;

  const stick = document.createElement('div');
  stick.id = 'touchStick';
  stick.setAttribute('aria-hidden', 'true');
  stick.innerHTML = '<i></i>';
  const knob = stick.firstChild;
  const jump = document.createElement('button');
  jump.id = 'touchJump';
  jump.type = 'button';
  jump.setAttribute('aria-label', 'Jump');
  jump.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 14l7-7 7 7M5 20l7-7 7 7"/></svg>';
  body.append(stick, jump);

  // ---------- Keys held by the stick ----------
  const held = new Set();
  const key = (type, name) => {
    const [code, k] = KEYS[name];
    dispatchEvent(new KeyboardEvent(type, { code, key: k, bubbles: true }));
  };
  function hold(want) {
    for (const name of held) if (!want.has(name)) { held.delete(name); key('keyup', name); }
    for (const name of want) if (!held.has(name)) { held.add(name); key('keydown', name); }
  }
  const none = new Set();
  const want = new Set();

  // ---------- Stick ----------
  let finger = null;
  function aim(e) {
    const r = stick.getBoundingClientRect(), radius = r.width / 2;
    let dx = e.clientX - (r.left + radius), dy = e.clientY - (r.top + radius);
    const length = Math.hypot(dx, dy), reach = radius * 0.62;
    if (length > reach) { dx *= reach / length; dy *= reach / length; }
    knob.style.transform = `translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px)`;
    // Eight directions from the thumb's angle, like the flight pad.
    const push = Math.min(length / reach, 1);
    want.clear();
    if (push >= DEAD) {
      const a = Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) * (Math.PI / 4);
      const x = Math.round(Math.cos(a)), z = Math.round(Math.sin(a));
      if (z < 0) want.add('up'); else if (z > 0) want.add('down');
      if (x < 0) want.add('left'); else if (x > 0) want.add('right');
      if (push >= RUN) want.add('run');
    }
    hold(want);
  }
  function letGo() {
    if (finger !== null && stick.hasPointerCapture(finger)) stick.releasePointerCapture(finger);
    finger = null;
    stick.classList.remove('on');
    knob.style.transform = '';
    hold(none);
  }
  stick.addEventListener('pointerdown', e => {
    if (finger !== null) return;
    e.preventDefault();
    finger = e.pointerId;
    stick.setPointerCapture(e.pointerId);
    stick.classList.add('on');
    h.rig.skipIntro?.();
    onStart?.();
    aim(e);
  });
  stick.addEventListener('pointermove', e => { if (e.pointerId === finger) aim(e); });
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
    stick.addEventListener(type, e => { if (e.pointerId === finger) letGo(); });
  }

  // ---------- Jump ----------
  jump.addEventListener('pointerdown', e => {
    e.preventDefault();
    jump.classList.add('on');
    h.rig.skipIntro?.();
    onStart?.();
    h.player.jump();
  });
  for (const type of ['pointerup', 'pointercancel', 'pointerleave']) jump.addEventListener(type, () => jump.classList.remove('on'));
  for (const el of [stick, jump]) el.addEventListener('contextmenu', e => e.preventDefault());

  // ---------- When to show them ----------
  const bigMap = document.getElementById('bigmap');
  const chat = document.getElementById('agentChatPanel');
  const menu = document.querySelector('#siteBar .site-nav');
  let shown = null;
  function update() {
    const on = !isHeroOn() && !h.rig.introActive && !h.player.flying
      && !body.classList.contains('reading') && !body.classList.contains('phone-on') && !body.classList.contains('flight-pad')
      && !(bigMap && !bigMap.hidden) && !chat?.classList.contains('open') && !menu?.classList.contains('open');
    if (on === shown) return;
    shown = on;
    body.classList.toggle('touch-controls', on);
    if (!on) { letGo(); jump.classList.remove('on'); }
  }
  update();
  return { update };
}
