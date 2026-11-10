// Name tags: floating 3D labels above stations and building click/hover raycasting.
import * as THREE from 'three';
import { PLAN } from '@world/layout.js';
import { icon } from '@engine/ui/icons.js';
import { isHeroOn, hideHero } from './hero.js';

const $ = s => document.querySelector(s);
const titleOf = id => document.querySelector(`#pages .page[data-station="${id}"] h2`)?.textContent.trim() || PLAN.find(p => p.id === id)?.en || id;

export function initTags({ h, onVisit, onUserInteract }) {
  const canvas = h.stage.renderer.domElement;
  const camera = h.stage.camera;
  const layer = $('#siteTags');

  // ---------- 3D Floating Name Tags ----------
  const tags = PLAN.map(p => {
    const hs = h.world.hotspots.find(x => x.id === p.id);
    if (!hs) return null;
    const b = document.createElement('button');
    b.className = 'site-tag';
    b.type = 'button';
    b.dataset.id = p.id;
    b.title = titleOf(p.id);
    b.innerHTML = `<i style="background-image:url(${icon(p.icon).url})"></i>${p.en}`;
    b.addEventListener('click', () => onVisit(p.id));
    layer.append(b);
    const c = hs.box.getCenter(new THREE.Vector3());
    return { id: p.id, el: b, at: new THREE.Vector3(c.x, hs.box.max.y + 0.45, c.z), shown: true, w: 0, h: 0 };
  }).filter(Boolean);

  const v = new THREE.Vector3();
  const lastPos = new THREE.Vector3(Infinity);
  const lastQ = new THREE.Quaternion();
  let W = innerWidth, H = innerHeight, force = true;

  addEventListener('resize', () => {
    W = innerWidth;
    H = innerHeight;
    force = true;
  });

  function placeTags() {
    const off = isHeroOn() || document.body.classList.contains('reading') || h.rig.introActive || h.rig.firstPerson;
    if (layer.hidden !== off) layer.hidden = off;
    if (off) { force = true; return; }
    if (!force && camera.position.equals(lastPos) && camera.quaternion.equals(lastQ)) return;
    lastPos.copy(camera.position);
    lastQ.copy(camera.quaternion);
    force = false;

    for (const t of tags) {
      const d = camera.position.distanceTo(t.at);
      v.copy(t.at).project(camera);
      const show = v.z < 1 && d < 48 && Math.abs(v.x) < 1.15 && Math.abs(v.y) < 1.15;
      if (show !== t.shown) {
        t.el.hidden = !show;
        t.shown = show;
      }
      if (!show) continue;
      if (!t.w) {
        t.w = t.el.offsetWidth;
        t.h = t.el.offsetHeight;
      }
      const x = ((v.x + 1) / 2) * W - t.w / 2;
      const y = ((1 - v.y) / 2) * H - t.h - 6;
      t.el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
      t.el.style.opacity = d < 18 ? '1' : Math.max(0.45, 1 - (d - 18) / 40).toFixed(2);
    }
  }

  // ---------- 3D Building Raycasting & Clicks ----------
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const hit = new THREE.Vector3();

  function stationAt(x, y) {
    ndc.set((x / W) * 2 - 1, -(y / H) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    let best = null;
    let bestT = Infinity;
    for (const hs of h.world.hotspots) {
      if (!ray.ray.intersectBox(hs.box, hit)) continue;
      const t = hit.distanceTo(ray.ray.origin);
      if (t < bestT) {
        bestT = t;
        best = hs.id;
      }
    }
    return best;
  }

  let down = null;
  canvas.addEventListener('pointerdown', e => {
    down = { x: e.clientX, y: e.clientY, button: e.button };
    if (isHeroOn()) hideHero();
    onUserInteract?.();
  });

  canvas.addEventListener('pointerup', e => {
    if (!down || down.button !== 0 || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 6) {
      down = null;
      return;
    }
    down = null;
    const id = !h.rig.firstPerson && stationAt(e.clientX, e.clientY);
    if (id) onVisit(id);
  });

  let hoverAt = 0;
  let hot = null;
  const world = $('#world');
  canvas.addEventListener('pointermove', e => {
    if (e.pointerType !== 'mouse' || performance.now() - hoverAt < 80) return;
    hoverAt = performance.now();
    const id = isHeroOn() || down ? null : stationAt(e.clientX, e.clientY);
    if (id === hot) return;
    hot = id;
    world.style.cursor = id ? 'pointer' : '';
    for (const t of tags) t.el.classList.toggle('hot', t.id === id);
  });

  return { placeTags };
}
