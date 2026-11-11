// GDG balloons tied to the Venue's rooftop corners, bobbing on the breeze.
//
// The balloons are one small BoxBatch of their own (one draw call). Each
// frame only their instance matrices move, a few dozen numbers with no
// allocation, and only while the player is near enough to see them. The
// strings are static boxes in the main batch that end inside each balloon,
// so the bob never opens a gap. Balloons cast no shadow: the sun's shadow
// map is static and a moving shadow would stay behind.
import * as THREE from 'three';
import { BoxBatch } from '@engine/world/blocks.js';
import { STATION_SCALE as S } from './layout.js';
import { yawOf } from './frame.js';
import { TEE } from './people.js';

// Station-frame metres: +z is the front. One cluster on each front roof corner.
// The HQ's rooftop front corners (VENUE_ROOF in stations/venue.js).
const KNOTS = [[-3.1, 5.45, 2.7], [3.1, 5.45, 2.7]];
const CLUSTER = [
  [-0.3, 1.0, 0.12, TEE.blue], [0.24, 1.32, -0.1, TEE.red],
  [0.02, 1.62, 0.2, TEE.yellow], [-0.12, 0.82, -0.26, TEE.green],
];
const W = 0.42, H = 0.5, NEAR = 45;

const up = new THREE.Vector3(0, 1, 0), dir = new THREE.Vector3(), q = new THREE.Quaternion(), e = new THREE.Euler();

export function buildBalloons({ layer, materials, station, B }) {
  const anim = new BoxBatch(layer);
  const local = (...m) => m.map(v => v / S);
  const place = fn => {
    for (const batch of [anim, B]) {
      batch.at(station.x, 0, station.z, yawOf(station.face), () => {
        batch.stack.push(batch.stack[batch.stack.length - 1].clone().scale(new THREE.Vector3(S, S, S)));
        fn(batch);
        batch.stack.pop();
      });
    }
  };
  let n = 0;
  place(batch => {
    const moving = batch === anim;
    let k = 0;
    for (const [kx, ky, kz] of KNOTS) {
      for (const [ox, oy, oz, tint] of CLUSTER) {
        const bx = kx + ox, by = ky + oy, bz = kz + oz, tag = ++k; // from 1: BoxBatch stores `tag || null`
        if (moving) {
          const look = { tex: 'paint', tint }, no = { shadow: false, tag };
          anim.box(...local(bx, by, bz, W, H, W), look, no);
          anim.box(...local(bx, by + H, bz, W * 0.68, 0.1, W * 0.68), look, no);
          anim.box(...local(bx, by - 0.06, bz, 0.08, 0.07, 0.08), look, no);
          anim.box(...local(bx - 0.1, by + 0.32, bz + W / 2 + 0.005, 0.08, 0.1, 0.01), { tex: 'paint', tint: 0xffffff }, no);
        } else {
          // The string, from the roof corner to just inside the balloon.
          dir.set(bx - kx, by + 0.1 - ky, bz - kz);
          const len = dir.length();
          e.setFromQuaternion(q.setFromUnitVectors(up, dir.normalize()), 'XYZ');
          const [cx, cy, cz] = [(kx + bx) / 2, (ky + by + 0.1) / 2, (kz + bz) / 2];
          B.box(...local(cx, cy - len / 2, cz, 0.018, len, 0.018), { tex: 'paint', tint: 0xf4f4f4 },
            { rx: e.x, ry: e.y, rz: e.z, shadow: false });
        }
      }
    }
    n = k;
  });

  const meshes = anim.build(materials);
  // Each instance's resting matrix and which balloon it belongs to.
  const parts = meshes.flatMap(mesh => mesh.userData.tags.map((tag, i) => {
    const base = new THREE.Matrix4();
    mesh.getMatrixAt(i, base);
    return { mesh, i, tag, base };
  }));
  const phase = Array.from({ length: n }, (_, k) => [k * 1.7, k * 2.3 + 0.5]);
  const shift = new THREE.Matrix4(), m = new THREE.Matrix4();
  let t = 0;

  return {
    meshes,
    update(dt, px, pz) {
      if (Math.hypot(px - station.x, pz - station.z) > NEAR) return;
      t += dt;
      for (const p of parts) {
        const [a, b] = phase[p.tag - 1];
        shift.makeTranslation(0.05 * Math.sin(t * 0.9 + b), 0.08 * Math.sin(t * 1.4 + a), 0.04 * Math.cos(t * 0.8 + b));
        p.mesh.setMatrixAt(p.i, m.multiplyMatrices(shift, p.base));
      }
      for (const mesh of meshes) mesh.instanceMatrix.needsUpdate = true;
    },
  };
}
