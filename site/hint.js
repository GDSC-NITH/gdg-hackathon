// First-visit tutorial hint: teaches movement and persists completion.
const $ = s => document.querySelector(s);
const touch = matchMedia('(pointer: coarse)').matches;
const hint = $('#siteHint');

const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch {} },
};

export function showHint() {
  if (!hint || store.get('labyrinth-hint') || document.body.classList.contains('plain')) return;
  hint.querySelector('span').innerHTML = touch
    ? 'Tap a building or its name to open it. Drag to look around.'
    : 'Click a building or its name to open it. Drag to look around, <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> to walk.';
  hint.hidden = false;
}

export function doneHint() {
  if (hint && !hint.hidden) {
    hint.hidden = true;
    store.set('labyrinth-hint', '1');
  }
}

export function initHint() {
  hint?.querySelector('button')?.addEventListener('click', doneHint);
}
