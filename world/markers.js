// Station markers: what sets the nine stations apart from the trees, lamps
// and campus around them. Each station stands on a round paved stage with a
// glowing gold outline, and a gold gem floats over its roof, turning slowly,
// like a waypoint in a game. The stage is the island's own top blocks and
// every glowing box joins the lamps in the static batch, so the markers cost
// no draw calls; setup() makes the outline breathe and the gems bob and turn.
import * as THREE from 'three';
import { PLAN, STATION_SCALE } from './layout.js';
import { BUILDS } from './stations/index.js';

// One colour for "a place you can visit"; nothing else on the island glows gold.
export const MARK = 0xffc93c;
const RING = 'station-ring', GEM = 'station-gem';
// The gem floats this far over the roof; the name tag (site/tags.js) sits above it.
export const GEM_LIFT = 0.95;
const GEM_SIZE = 0.6;

// The stage reaches past each station's footprint to where a visitor
// stands to open it.
export const STAGES = PLAN.map(p => {
  const [w, h, d] = (BUILDS[p.id]?.size || [3, 3, 3]).map(v => v * STATION_SCALE);
  // At least 3.6 m, so the spot where a visitor stands (3.5 m out) is inside the ring.
  return { id: p.id, x: p.x, z: p.z, top: h, r: Math.max(Math.max(w, d) / 2 + 1.6, 3.6) };
});

// Whether the block at (x, z) belongs to a stage: its centre is inside the circle.
export const onStage = (x, z) => STAGES.some(s => Math.hypot(x + 0.5 - s.x, z + 0.5 - s.z) <= s.r);
const stageOf = (s, x, z) => Math.hypot(x + 0.5 - s.x, z + 0.5 - s.z) <= s.r;

export function defineStage(grid) {
  grid.define('stage', { tex: { top: 'travertine', side: 'stone', bottom: 'stone' }, tint: 0xf2cf6e, map: '#e9c46a' });
}

export function buildMarkers(B) {
  const glow = { tex: 'paint', tint: MARK, emissive: 1 };
  const gem = { tex: 'paint', tint: MARK, emissive: 0.55 };
  for (const s of STAGES) {
    // A pixel outline along the stage's edge: one strip on every block side
    // that faces out of the circle.
    const x0 = Math.floor(s.x - s.r - 1), x1 = Math.ceil(s.x + s.r + 1);
    const z0 = Math.floor(s.z - s.r - 1), z1 = Math.ceil(s.z + s.r + 1);
    for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) {
      if (!stageOf(s, x, z)) continue;
      const t = 0.26, y = 0, h = 0.05, o = { tag: RING };
      if (!stageOf(s, x, z - 1)) B.box(x + 0.5, y, z + t / 2, 1, h, t, glow, o);
      if (!stageOf(s, x, z + 1)) B.box(x + 0.5, y, z + 1 - t / 2, 1, h, t, glow, o);
      if (!stageOf(s, x - 1, z)) B.box(x + t / 2, y, z + 0.5, t, h, 1, glow, o);
      if (!stageOf(s, x + 1, z)) B.box(x + 1 - t / 2, y, z + 0.5, t, h, 1, glow, o);
    }
  }
  // The gems come last, so their instances sit together; setup() places them.
  for (const s of STAGES) B.box(s.x, s.top + GEM_LIFT, s.z, GEM_SIZE, GEM_SIZE, GEM_SIZE, gem, { tag: GEM });
}

// The outline breathes over about three seconds; each gem bobs and turns.
// Only the tagged instances are touched, and nothing is allocated per frame.
export function markerPulse(world) {
  let mesh = null;
  world.groups.static?.traverse(o => {
    if (!mesh && o.isInstancedMesh && o.userData.tags?.includes(RING)) mesh = o;
  });
  if (!mesh) return () => {};
  const tags = mesh.userData.tags, glow = mesh.geometry.getAttribute('iEmissive');
  const rings = [], gems = [];
  tags.forEach((t, i) => (t === RING ? rings : t === GEM ? gems : null)?.push(i));
  const r0 = rings[0], r1 = rings[rings.length - 1], g0 = gems[0], g1 = gems[gems.length - 1];
  // A gem stands on a corner, like a diamond: tip it 45° and then ~35°.
  const tilt = new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.atan(Math.SQRT1_2), 0, Math.PI / 4));
  const spin = new THREE.Quaternion(), turn = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0);
  const pos = new THREE.Vector3(), size = new THREE.Vector3().setScalar(GEM_SIZE), m = new THREE.Matrix4();
  let time = 0;
  return dt => {
    time += dt;
    const k = 0.7 + 0.3 * Math.sin(time * 2.1);
    for (let n = 0; n < rings.length; n++) glow.array[rings[n]] = k;
    glow.clearUpdateRanges();
    glow.addUpdateRange(r0, r1 - r0 + 1);
    glow.needsUpdate = true;
    for (let n = 0; n < gems.length; n++) {
      const s = STAGES[n];
      pos.set(s.x, s.top + GEM_LIFT + GEM_SIZE / 2 + 0.12 * Math.sin(time * 1.8 + n), s.z);
      spin.setFromAxisAngle(up, time * 0.9 + n);
      turn.multiplyQuaternions(spin, tilt);
      mesh.setMatrixAt(gems[n], m.compose(pos, turn, size));
    }
    mesh.instanceMatrix.clearUpdateRanges();
    mesh.instanceMatrix.addUpdateRange(g0 * 16, (g1 - g0 + 1) * 16);
    mesh.instanceMatrix.needsUpdate = true;
  };
}
