// The ground plan and everything on it that is not a station: paths, the
// plaza with its maze inlay, lamp posts, flowers and the GDG signboard.
// Paths are the island's own top blocks, so they cost no extra draw calls.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { inRect } from '@engine/world/terrain.js';
import { buildTufts } from '@engine/world/landscape.js';
import { rng, canvasTexture } from '@engine/world/textures.js';
import { M } from './kit.js';
import { FACING } from './frame.js';
import { PLAN, RING, AVENUE, MAZE, LAMPS, TREES, SIGNBOARD } from './layout.js';
import { onStage } from './markers.js';

// ---------- GDG Lawn Lettering ----------
// 17 columns (x from -8 to 8), 11 rows (z from -6 to 4).
// Replaces previous procedural maze with "GDG" stone block lettering on hedge grass.
// G1 (cols 1..4), space (col 5), D (cols 6..10), space (col 11), G2 (cols 12..15).
const GDG_PATTERN = [
  ".................", // z = -6: top green margin
  ".................", // z = -5: top green margin
  "..###.####...###.", // z = -4: row 0 (top chamfer: G1=.###, D=####., G2=.###)
  ".####.#####.####.", // z = -3: row 1 (top bar: G1=####, D=#####, G2=####)
  ".#....#..##.#....", // z = -2: row 2 (upper body: G1=#..., D=#..##, G2=#...)
  ".#.##.#..##.#.##.", // z = -1: row 3 (middle spur: G1=#.##, D=#..##, G2=#.##)
  ".#..#.#..##.#..#.", // z = 0:  row 4 (lower body: G1=#..#, D=#..##, G2=#..#)
  ".####.#####.####.", // z = 1:  row 5 (bottom bar: G1=####, D=#####, G2=####)
  "..##..####...##..", // z = 2:  row 6 (bottom chamfer: G1=.##., D=####., G2=.##.)
  ".................", // z = 3:  bottom green margin
  ".................", // z = 4:  bottom green margin
];

function isGDG(x, z) {
  const col = x - MAZE.x0;
  const row = z - MAZE.z0;
  if (row < 0 || row >= GDG_PATTERN.length) return false;
  const line = GDG_PATTERN[row];
  if (col < 0 || col >= line.length) return false;
  return line[col] === '#';
}

// ---------- Walkways from the ring to each station ----------
// A 2 m strip from just in front of the station out to the ring or avenue.
const walkways = PLAN.map(p => {
  const yaw = FACING[p.face], fx = Math.sin(yaw), fz = Math.cos(yaw);
  return (cx, cz) => {
    const dx = cx - p.x, dz = cz - p.z, along = dx * fx + dz * fz, across = Math.abs(dx * fz - dz * fx);
    return along > 1.0 && along < 4.6 && across < 1.0;
  };
});
const onWalkway = (x, z) => walkways.some(w => w(x + 0.5, z + 0.5));

// What the top block of the island is at (x, z): see buildIsland's surfaceAt.
export function surfaceAt(x, z) {
  if (inRect(MAZE, x, z)) return isGDG(x, z) ? 'travertine' : 'hedge';
  if (inRect(RING.inner, x, z)) return 'travertine';
  // Each station stands on a round stage (world/markers.js), filled to its
  // gold outline even where it reaches over the ring road.
  if (onStage(x, z)) return 'stage';
  if (inRect(RING.outer, x, z) || inRect(AVENUE, x, z) || onWalkway(x, z)) return 'pavers';
  return 'grass';
}

// ---------- Decoration ----------
export function buildDecor({ B, layer, materials, obstacles, bakes, planes, grid, forest }) {
  // Lamp posts: a black post with a lantern; their light is baked for the night.
  LAMPS.forEach(([x, z], i) => {
    B.box(x, 0, z, 0.3, 0.2, 0.3, M.stone);
    B.box(x, 0.2, z, 0.12, 2.5, 0.12, M.blackMetal);
    B.box(x, 2.7, z, 0.34, 0.06, 0.34, M.blackMetal);
    B.box(x, 2.76, z, 0.24, 0.3, 0.24, M.lanternGlow);
    B.box(x, 3.06, z, 0.34, 0.08, 0.34, M.blackMetal);
    obstacles.push({ x0: x - 0.2, x1: x + 0.2, z0: z - 0.2, z1: z + 0.2, level: 0 });
    bakes.push({ id: `lamp-${i}`, position: [x, 2.9, z], power: 2.2, radius: 8, direction: null });
  });

  // Grass and flowers on open lawn, away from paths, stations and trees.
  const r = rng(2026), tufts = [];
  const clear = (x, z) => surfaceAt(Math.floor(x), Math.floor(z)) === 'grass'
    && !PLAN.some(p => Math.hypot(x - p.x, z - p.z) < 3.2)
    && !TREES.some(([tx, tz]) => Math.hypot(x - tx, z - tz) < 3)
    && !LAMPS.some(([lx, lz]) => Math.hypot(x - lx, z - lz) < 0.8)
    && x > -22 && x < 22 && z > -23 && z < 26;
  const tiles = ['tall_grass', 'tall_grass', 'tall_grass', 'flower_red', 'flower_white', 'flower_violet'];
  for (let n = 0; n < 900 && tufts.length < 170; n++) {
    const x = -22 + r() * 44, z = -23 + r() * 49;
    if (!clear(x, z)) continue;
    const tile = tiles[Math.floor(r() * tiles.length)];
    tufts.push({ x, z, tile, s: tile === 'tall_grass' ? 0.4 + r() * 0.25 : 0.45 + r() * 0.15 });
  }
  planes.push(buildTufts(layer, materials, tufts));

  buildSignboard({ B, obstacles, bakes, planes, grid, forest }, SIGNBOARD.x, SIGNBOARD.z);
}

// The GDG signboard: a solid 3D cuboid monument featuring the GDG adventure art
// on front & back faces with solid timber log side pillars, top beam header,
// grass foundation, and solid voxel collision so it looks substantial from all angles.
function buildSignboard({ B, obstacles, bakes, planes, grid, forest }, x, z) {
  const texture = new THREE.TextureLoader().load('assets/branding/gdg-signboard.webp');
  texture.colorSpace = THREE.SRGBColorSpace;

  const boardW = 5.6;
  const boardH = 4.15;
  const depth = 0.62;
  const half = depth / 2;
  const frameH = 3.32; // height of the timber frame on sides

  // 1. Front & Back poster planes merged into 1 single draw call with self-illumination for night
  const posterMat = new THREE.MeshLambertMaterial({
    map: texture,
    emissive: new THREE.Color(0x555045),
    emissiveMap: texture,
    transparent: true,
    alphaTest: 0.25,
    side: THREE.DoubleSide
  });

  const frontGeom = new THREE.PlaneGeometry(boardW, boardH);
  frontGeom.translate(x, boardH / 2, z + half);

  const backGeom = new THREE.PlaneGeometry(boardW, boardH);
  backGeom.rotateY(Math.PI);
  backGeom.translate(x, boardH / 2, z - half);

  const posterGeom = mergeGeometries([frontGeom, backGeom], false);
  const posterMesh = new THREE.Mesh(posterGeom, posterMat);
  planes.push(posterMesh);

  // 2. Solid 3D Voxel Cuboid Structure (Batched into BoxBatch for 0 extra draw calls)
  // Left and right vertical timber log pillars (matching the side posts of the artwork)
  const postW = 0.42;
  const postX = boardW / 2 - postW / 2;
  B.box(x - postX, 0.35, z, postW, frameH - 0.35, depth - 0.04, { tex: 'log', top: 'log_top' });
  B.box(x + postX, 0.35, z, postW, frameH - 0.35, depth - 0.04, { tex: 'log', top: 'log_top' });

  // Top horizontal timber header beam connecting the posts
  B.box(x, frameH - 0.18, z, boardW - 0.1, 0.22, depth - 0.04, M.oak);

  // Bottom timber rail
  B.box(x, 0.38, z, boardW - 0.1, 0.20, depth - 0.06, M.wood);

  // Recessed inner backing board strictly behind the parchment area
  B.box(x, 0.58, z, 3.6, frameH - 0.85, depth - 0.12, M.oak);

  // Solid grass & dirt foundation footing
  B.box(x, 0, z, boardW + 0.1, 0.38, depth - 0.06, { tex: 'dirt', top: 'grass_top' });
  // Cobblestone boulder supports at the base corners
  B.box(x - postX - 0.08, 0, z, 0.48, 0.42, depth + 0.12, M.stone);
  B.box(x + postX + 0.08, 0, z, 0.48, 0.42, depth + 0.12, M.stone);

  // 3D Voxel Lanterns on the side posts
  // Left lantern (matches glowing lantern on left post in artwork)
  B.box(x - postX - 0.22, 2.05, z, 0.04, 0.32, 0.04, M.blackMetal);
  B.box(x - postX - 0.22, 1.82, z, 0.24, 0.26, 0.24, M.blackMetal);
  B.box(x - postX - 0.22, 1.84, z, 0.18, 0.20, 0.18, M.lanternGlow);

  // Right lantern (matches glowing lantern on right post in artwork)
  B.box(x + postX + 0.22, 1.95, z, 0.04, 0.32, 0.04, M.blackMetal);
  B.box(x + postX + 0.22, 1.72, z, 0.24, 0.26, 0.24, M.blackMetal);
  B.box(x + postX + 0.22, 1.74, z, 0.18, 0.20, 0.18, M.lanternGlow);

  // Full solid collision obstacle matching cuboid bounds
  obstacles.push({
    x0: x - boardW / 2 - 0.3,
    x1: x + boardW / 2 + 0.3,
    z0: z - depth / 2 - 0.25,
    z1: z + depth / 2 + 0.25,
    level: 0
  });

  if (grid) {
    grid.fill(
      Math.floor(x - boardW / 2 - 0.2), 0, Math.floor(z - depth / 2 - 0.1),
      Math.ceil(x + boardW / 2 + 0.2), 4, Math.ceil(z + depth / 2 + 0.1),
      'stone', 'forestCollision'
    );
    if (forest?.tops) {
      forest.tops.push({
        x0: Math.floor(x - boardW / 2 - 0.2), x1: Math.ceil(x + boardW / 2 + 0.2),
        z0: Math.floor(z - depth / 2 - 0.1), z1: Math.ceil(z + depth / 2 + 0.1),
        y: 4, site: 'signboard'
      });
    }
  }

  // 4 small ground corner uplights around the monument base
  for (const [cx, cz] of [[-2.6, -0.6], [2.6, -0.6], [-2.6, 0.6], [2.6, 0.6]]) {
    B.box(x + cx, 0, z + cz, 0.32, 0.04, 0.32, M.blackMetal);
    B.box(x + cx, 0.03, z + cz, 0.22, 0.03, 0.22, M.lanternGlow);
    bakes.push({ id: `board-c-${cx}-${cz}`, position: [x + cx, 0.2, z + cz], power: 2.2, radius: 5.5, direction: [0, 1, 0] });
  }

  // Warm night lighting for both front and back
  bakes.push(
    { id: 'board-sw', position: [x - 2.4, 2.0, z + 0.8], power: 2.2, radius: 7, direction: null },
    { id: 'board-se', position: [x + 2.4, 1.9, z + 0.8], power: 2.2, radius: 7, direction: null },
    { id: 'board-nw', position: [x - 2.4, 2.0, z - 0.8], power: 2.2, radius: 7, direction: null },
    { id: 'board-ne', position: [x + 2.4, 1.9, z - 0.8], power: 2.2, radius: 7, direction: null },
  );
}
