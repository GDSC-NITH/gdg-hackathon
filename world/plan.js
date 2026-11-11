// The map's picture of everything built from boxes: the sakura canopies,
// the station stages, the fence, the campus round the ground and the near
// mountains. It is read from the BoxBatch the world is built with, so the
// map always shows what the world shows, with nothing to keep in step.
//
// Each box's top face is painted in its top texture's average colour times
// its tint, lowest boxes first so the highest one at any spot wins (a roof
// over its walls, a canopy over its trunk), and a little lighter the higher
// it stands, as on a Minecraft map. It runs once, when the map is drawn.
import * as THREE from 'three';

const corner = new THREE.Vector3();

// Average colour of each 16×16 tile in the block texture array.
function tileAverages(texture) {
  const { data, width, height, depth } = texture.image, per = width * height, out = [];
  for (let i = 0; i < depth; i++) {
    let r = 0, g = 0, b = 0, n = 0;
    for (let p = i * per * 4, end = p + per * 4; p < end; p += 4) {
      if (data[p + 3] < 128) continue;
      r += data[p]; g += data[p + 1]; b += data[p + 2]; n++;
    }
    out.push(n ? [r / n, g / n, b / n] : [128, 128, 128]);
  }
  return out;
}

// Boxes no higher than this are ground covers (the campus lawn, the road,
// the court). The island's own blocks are already on the map, so ground
// covers are painted only outside it; anything taller is painted everywhere.
const GROUND = 0.1;

// bounds: the map's area in world metres; island: the block grid's area.
export function makePlan(batch, materials, bounds, island) {
  const avg = tileAverages(materials.uniforms.uTiles.value);
  const tops = [];
  for (const [kind, items] of Object.entries(batch.items)) {
    for (const item of items) {
      const e = item.matrix.elements;
      // The four corners of the top face (the unit box's +y face).
      const quad = [];
      let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity, y = -Infinity;
      for (const [sx, sz] of [[-0.5, -0.5], [0.5, -0.5], [0.5, 0.5], [-0.5, 0.5]]) {
        corner.set(sx, 0.5, sz).applyMatrix4(item.matrix);
        quad.push(corner.x, corner.z);
        x0 = Math.min(x0, corner.x); x1 = Math.max(x1, corner.x);
        z0 = Math.min(z0, corner.z); z1 = Math.max(z1, corner.z);
        y = Math.max(y, corner.y);
      }
      if (x1 < bounds.x0 || x0 > bounds.x1 || z1 < bounds.z0 || z0 > bounds.z1) continue;
      // Boxes tilted on their side (scree, braces) have no real top face.
      if (Math.abs(e[5]) < 0.5 * Math.hypot(e[4], e[5], e[6])) continue;
      const [tr, tg, tb] = avg[item.layers[0]] || [128, 128, 128], c = item.color;
      // THREE.Color holds linear values; the tile data is sRGB.
      const lin = THREE.ColorManagement.enabled ? c.clone().convertLinearToSRGB() : c;
      tops.push({ y, quad, glass: kind === 'glass', r: tr * lin.r, g: tg * lin.g, b: tb * lin.b });
    }
  }
  tops.sort((a, b) => a.y - b.y);

  return function drawPlan(ctx, X, Z) {
    // Ground covers: everywhere but the island.
    ctx.save();
    ctx.beginPath();
    ctx.rect(X(bounds.x0), Z(bounds.z0), X(bounds.x1) - X(bounds.x0), Z(bounds.z1) - Z(bounds.z0));
    ctx.rect(X(island.x0), Z(island.z0), X(island.x1) - X(island.x0), Z(island.z1) - Z(island.z0));
    ctx.clip('evenodd');
    let i = 0;
    for (; i < tops.length && tops[i].y <= GROUND; i++) paint(tops[i]);
    ctx.restore();
    for (; i < tops.length; i++) paint(tops[i]);

    function paint(t) {
      const k = 0.9 + Math.min(1, Math.max(0, t.y) / 30) * 0.22;
      const v = n => Math.max(0, Math.min(255, Math.round(n * k)));
      ctx.fillStyle = `rgba(${v(t.r)},${v(t.g)},${v(t.b)},${t.glass ? 0.45 : 1})`;
      const q = t.quad;
      ctx.beginPath();
      ctx.moveTo(X(q[0]), Z(q[1]));
      ctx.lineTo(X(q[2]), Z(q[3]));
      ctx.lineTo(X(q[4]), Z(q[5]));
      ctx.lineTo(X(q[6]), Z(q[7]));
      ctx.closePath();
      ctx.fill();
    }
  };
}
