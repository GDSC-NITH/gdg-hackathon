// Sakura (Cherry Blossom) trees and falling petal animation.
// Features multi-tone pink canopies (blossom pink, pastel petal, rose-magenta,
// pale blush) with billowing cloud-like volumes, and a lightweight instanced
// particle system of falling petals that drift, sway and tumble in the wind.
import * as THREE from 'three';
import { BoxBatch } from '@engine/world/blocks.js';
import { rng } from '@engine/world/textures.js';

// Multi-tone sakura pink palette: mixed shades of cherry blossoms rather than plain flat pink
export const SAKURA_PALETTE = {
  light: 0xffd1dc,    // pale blossom blush / sunny highlight
  pastel: 0xffb7c5,   // classic cherry blossom petal
  medium: 0xff94b8,   // radiant mid-bloom pink
  vibrant: 0xfc8bad,  // rich floral rose pink
  deep: 0xe56b92,     // deep blossom heart / shadowed bough
  accent: 0xf472b6,   // warm spring cherry accent
};

const SHADES = [
  SAKURA_PALETTE.light,
  SAKURA_PALETTE.pastel,
  SAKURA_PALETTE.medium,
  SAKURA_PALETTE.vibrant,
  SAKURA_PALETTE.deep,
  SAKURA_PALETTE.accent,
];

// Builds blooming sakura trees at the given spots.
// Each tree features a dark trunk, graceful boughs, and a layered, billowing
// canopy of varied pink foliage blocks.
export function buildSakuraForest(grid, layer, spots = [], targetBatch = null) {
  const batch = targetBatch || new BoxBatch(layer);
  const r = rng(20260503);
  const treeBounds = [];
  const tops = [];
  const spawners = [];

  for (let i = 0; i < spots.length; i++) {
    let [gx, gz] = spots[i];
    while (!grid.get(gx, -1, gz)) {
      gx += Math.sign(-gx);
      gz += Math.sign(-gz);
    }
    const x = gx + 0.5, z = gz + 0.5;
    const trunkH = 4.4 + r() * 1.3;
    const spread = 5.2 + r() * 1.2;

    // Dark wood trunk
    batch.box(x, 0, z, 0.85, trunkH + 0.35, 0.85, { tex: 'log', top: 'log_top' });

    // Organic side branch reaching outward
    const branchAngle = (r() * 4 | 0) * (Math.PI / 2) + 0.3;
    const bx = x + Math.cos(branchAngle) * 0.9;
    const bz = z + Math.sin(branchAngle) * 0.9;
    const branchY = trunkH * 0.62;
    batch.box(bx, branchY, bz, 0.55, 0.55, 0.85, { tex: 'log', top: 'log_top' }, { ry: branchAngle });

    // Billowing sakura canopy: layered, overlapping boxes with varied pink tints
    // giving depth, highlights, and natural volume
    const cDeep = { tex: 'foliage', tint: SAKURA_PALETTE.deep };
    const cMid = { tex: 'foliage', tint: (i % 2 === 0) ? SAKURA_PALETTE.medium : SAKURA_PALETTE.vibrant };
    const cLight = { tex: 'foliage', tint: SAKURA_PALETTE.pastel };
    const cTop = { tex: 'foliage', tint: SAKURA_PALETTE.light };
    const cSide = { tex: 'foliage', tint: SAKURA_PALETTE.accent };

    const crowns = [
      // Lower broad boughs (shadowed deeper rose)
      { cx: x, y: trunkH - 0.25, cz: z, w: spread, h: 1.7, d: spread * 0.92, look: cDeep },
      // Main billowing canopy (radiant blossom pink)
      { cx: x + 0.35, y: trunkH + 1.2, cz: z - 0.25, w: spread * 0.85, h: 1.75, d: spread * 0.88, look: cMid },
      // Upper crown dome (pale highlight blossom)
      { cx: x - 0.22, y: trunkH + 2.65, cz: z + 0.2, w: spread * 0.54, h: 1.2, d: spread * 0.58, look: cTop },
      // Asymmetric side cluster 1
      { cx: x - spread * 0.32, y: trunkH + 0.6, cz: z + 0.55, w: spread * 0.44, h: 1.45, d: spread * 0.52, look: cLight },
      // Asymmetric side cluster 2 (hanging bough over the branch)
      { cx: bx + Math.cos(branchAngle) * 0.6, y: branchY + 0.3, cz: bz + Math.sin(branchAngle) * 0.6, w: 2.2, h: 1.3, d: 2.2, look: cSide },
    ];

    for (const { cx, y, cz, w, h, d, look } of crowns) {
      batch.box(cx, y, cz, w, h, d, look);
      grid.fill(
        Math.floor(cx - w / 2), Math.floor(y), Math.floor(cz - d / 2),
        Math.ceil(cx + w / 2), Math.round(y + h), Math.ceil(cz + d / 2),
        'hedge', 'forestCollision'
      );
      tops.push({
        x0: Math.floor(cx - w / 2), x1: Math.ceil(cx + w / 2),
        z0: Math.floor(cz - d / 2), z1: Math.ceil(cz + d / 2),
        y: Math.round(y + h), site: 'tree'
      });
    }

    // Trunk collision
    for (let y = 0; y < Math.ceil(trunkH); y++) {
      grid.set(gx, y, gz, 'log', 'forestCollision');
    }

    const totalHeight = trunkH + 3.85;
    treeBounds.push({ x, z, height: totalHeight });

    // Spawner parameters for falling petals
    spawners.push({
      x, z,
      topY: totalHeight,
      baseY: trunkH - 0.3,
      radius: spread * 0.58,
    });
  }

  return { batch: targetBatch ? new BoxBatch(layer) : batch, treeBounds, tops, spawners };
}

// Falling sakura petals animation system using a single InstancedMesh (1 draw call).
// Petals drift slowly downwards, swaying and tumbling gently in the breeze.
export function createSakuraPetals(scene, spawners = [], petalCount = 360) {
  if (!spawners.length) return { update() {} };

  // Stylized blossom petal quad (0.22m x 0.28m) - readable in Minecraft/voxel scale
  const geom = new THREE.PlaneGeometry(0.22, 0.28);

  // MeshBasicMaterial ensures vibrant pink cherry petals remain luminous in all lighting
  const mat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.92,
    depthWrite: false,
    side: THREE.DoubleSide,
  });

  const mesh = new THREE.InstancedMesh(geom, mat, petalCount);
  mesh.name = 'sakura-petals';
  mesh.frustumCulled = false;

  // Reusable math objects for zero allocations per frame
  const dummy = new THREE.Object3D();
  const color = new THREE.Color();
  const r = rng(20260505);

  // Per-petal particle state stored in typed arrays
  const px = new Float32Array(petalCount);
  const py = new Float32Array(petalCount);
  const pz = new Float32Array(petalCount);
  const vy = new Float32Array(petalCount);
  const swSpeed = new Float32Array(petalCount);
  const swRadius = new Float32Array(petalCount);
  const rotSpeedX = new Float32Array(petalCount);
  const rotSpeedY = new Float32Array(petalCount);
  const phase = new Float32Array(petalCount);
  const treeIdx = new Uint8Array(petalCount);

  // Initialize petals distributed naturally throughout the fall height
  for (let i = 0; i < petalCount; i++) {
    const ti = i % spawners.length;
    treeIdx[i] = ti;
    const sp = spawners[ti];

    const angle = r() * Math.PI * 2;
    const dist = Math.sqrt(r()) * sp.radius;
    px[i] = sp.x + Math.cos(angle) * dist;
    pz[i] = sp.z + Math.sin(angle) * dist;

    // Distribute y evenly so petals are already falling when world starts
    const spawnH = sp.topY - 0.2;
    py[i] = 0.1 + r() * spawnH;

    // Slow, serene downward drift (0.6 - 1.0 m/s)
    vy[i] = 0.65 + r() * 0.45;
    swSpeed[i] = 1.2 + r() * 1.0;
    swRadius[i] = 0.25 + r() * 0.35;
    rotSpeedX[i] = 1.4 + r() * 1.8;
    rotSpeedY[i] = 0.8 + r() * 1.2;
    phase[i] = r() * Math.PI * 2;

    // Assign varied sakura petal colors
    const shadeHex = SHADES[i % SHADES.length];
    color.setHex(shadeHex);
    mesh.setColorAt(i, color);

    // Initial matrix
    dummy.position.set(px[i], py[i], pz[i]);
    dummy.rotation.set(r() * Math.PI, r() * Math.PI, r() * Math.PI);
    dummy.scale.setScalar(0.85 + r() * 0.35);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
  }

  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.instanceMatrix.needsUpdate = true;
  scene.add(mesh);

  let time = 0;

  return {
    mesh,
    update(dt) {
      if (!mesh.visible) return;
      // Cap dt to prevent jumps on background tab resume
      const step = Math.min(dt, 0.1);
      time += step;

      // Island breeze direction
      const windX = Math.sin(time * 0.35) * 0.18 + 0.12;
      const windZ = Math.cos(time * 0.28) * 0.14 + 0.08;

      for (let i = 0; i < petalCount; i++) {
        const ti = treeIdx[i];
        const sp = spawners[ti];

        // Descend slowly
        py[i] -= vy[i] * step;

        // Respawn at the canopy when reaching ground
        if (py[i] <= 0.06) {
          const angle = Math.random() * Math.PI * 2;
          const dist = Math.sqrt(Math.random()) * sp.radius;
          px[i] = sp.x + Math.cos(angle) * dist;
          pz[i] = sp.z + Math.sin(angle) * dist;
          py[i] = sp.topY - Math.random() * 0.8;
          continue;
        }

        // Graceful fluttering sway
        const p = phase[i];
        const swayX = Math.sin(time * swSpeed[i] + p) * swRadius[i] * step + windX * step;
        const swayZ = Math.cos(time * swSpeed[i] * 0.85 + p * 1.2) * swRadius[i] * step + windZ * step;
        px[i] += swayX;
        pz[i] += swayZ;

        // Tumbling rotation
        const rx = Math.sin(time * rotSpeedX[i] + p) * 1.1;
        const ry = time * rotSpeedY[i] + p;
        const rz = Math.cos(time * rotSpeedX[i] * 0.9 + p) * 0.7;

        dummy.position.set(px[i], py[i], pz[i]);
        dummy.rotation.set(rx, ry, rz);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
      }

      mesh.instanceMatrix.needsUpdate = true;
    },
  };
}
