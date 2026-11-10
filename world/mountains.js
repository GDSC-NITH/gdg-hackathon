// Blocky Minecraft-style terrain outside the island: a rocky, snow-capped
// mountain range backs the north side and continues down the west (left)
// side; big green hills roll away to the east; the south stays open sea.
// Columns sit outside the block grid — the invisible wall in build.js
// already keeps visitors from ever
// reaching them, so there is no walkable surface, collision or pick target
// here, only boxes.
//
// Each column's height comes from layered noise. The mountain profile is
// banded by altitude into grass foothills, bare stone slopes and snowy
// peaks, the way a real range looks from a distance; the hill profile stays
// green and smooth, cresting well short of the snow line. Forest cover
// (trees, shrubs, grass tufts, the odd log cabin) follows its own band and
// climbs onto the mountain's stone slopes before thinning at the treeline;
// above that, loose boulders dot the bare rock up to the snow line.
import * as THREE from 'three';
import { BoxBatch } from '@engine/world/blocks.js';
import { buildTufts } from '@engine/world/landscape.js';
import { valueNoise } from '@engine/world/terrain.js';
import { rng } from '@engine/world/textures.js';
import { ISLAND } from './layout.js';

const DEPTH = 110, NEAR = 20, NEAR_CELL = 2.5, FAR_CELL = 6;
const STONE_LINE = 3, FOREST_LINE = 15, SNOW_LINE = 19, HILL_TOP = 16;

const GRASS = { top: 'grass_top', side: 'grass_side', bottom: 'dirt' };
const STONE = { top: 'stone', side: 'stone', bottom: 'deepslate' };
const SLATE = { top: 'deepslate', side: 'deepslate', bottom: 'deepslate' };
const SNOW = { top: 'white', side: 'stone', bottom: 'deepslate' };
const TUFT_TILES = ['tall_grass', 'tall_grass', 'tall_grass', 'flower_white', 'flower_violet'];

const rise = valueNoise(41), ridge = valueNoise(97), rough = valueNoise(13);

// Height at a point `d` metres out from the coast (0 at the shoreline) and
// `u` metres along it; `offset` keeps the belts from repeating. Sharp,
// noise-driven peaks for a real mountain.
function mountainHeightAt(u, d, offset) {
  const climb = Math.min(1, d / 78);
  const n = rise(u * 0.045 + offset, d * 0.06) * 0.6
    + ridge(u * 0.1 + offset * 2.3, d * 0.085) * 0.3
    + rough(u * 0.28 + offset, d * 0.28) * 0.1;
  const peak = Math.max(0, n - 0.42) * 2.3;
  return 1.4 + Math.pow(climb, 0.7) * (5 + n * 27) + peak * 24 * climb;
}

// Broad, rounded swells for rolling green hills — no sharp peak term, and
// capped well under the mountain's snow line.
function hillHeightAt(u, d, offset) {
  const climb = Math.min(1, d / 65);
  const n = rise(u * 0.022 + offset, d * 0.03) * 0.65 + ridge(u * 0.05 + offset * 1.7, d * 0.045) * 0.35;
  return 1.1 + Math.pow(climb, 0.55) * (3 + 13 * n);
}

function mountainLook(h, patchy) {
  if (h < STONE_LINE) return GRASS;
  if (h < SNOW_LINE) return patchy ? SLATE : STONE;
  return SNOW;
}

const hillLook = () => GRASS;

// ---------- Foothill planting ----------
function pine(B, x, z, groundY, s, seed) {
  const r = rng(seed), tone = 0x2c5a3b + ((r() * 5) | 0) * 0x030401;
  B.box(x, groundY, z, 0.3 * s, 1 * s, 0.3 * s, { tex: 'log', top: 'log_top' }, { shadow: false });
  let top = groundY + 0.7 * s;
  for (const [w, h] of [[1.9, 1.1], [1.35, 0.95], [0.8, 0.85]]) {
    B.box(x, top, z, w * s, h * s, w * s, { tex: 'foliage', tint: tone }, { shadow: false });
    top += h * s * 0.78;
  }
}

// A round-crowned deciduous tree: a trunk and two overlapping canopy boxes.
function broadleaf(B, x, z, groundY, s, seed) {
  const r = rng(seed), tone = 0x4d7a3a + ((r() * 4) | 0) * 0x040302;
  B.box(x, groundY, z, 0.32 * s, 1.3 * s, 0.32 * s, { tex: 'log', top: 'log_top' }, { shadow: false });
  const topY = groundY + 1.05 * s, jx = (r() - 0.5) * 0.5 * s, jz = (r() - 0.5) * 0.5 * s;
  B.box(x, topY, z, 1.6 * s, 1.1 * s, 1.6 * s, { tex: 'foliage', tint: tone }, { shadow: false });
  B.box(x + jx, topY + 0.65 * s, z + jz, 1.1 * s, 0.85 * s, 1.1 * s, { tex: 'foliage', tint: tone + 0x060604 }, { shadow: false });
}

function shrub(B, x, z, groundY, s, seed) {
  const r = rng(seed), tone = 0x3f6e3c + ((r() * 4) | 0) * 0x030502;
  B.box(x, groundY, z, 0.85 * s, 0.5 * s, 0.85 * s, { tex: 'foliage', tint: tone }, { shadow: false });
}

// A couple of loose stone slabs, rotated off-axis so the stone band reads
// as broken scree rather than a smooth ramp.
function boulder(B, x, z, groundY, s, seed) {
  const r = rng(seed), tint = 0xb9b3a4 + ((r() * 4) | 0) * 0x020202;
  B.box(x, groundY, z, 0.9 * s, 0.5 * s, 0.8 * s, { tex: 'stone', tint }, { ry: r() * 1.4, shadow: false });
  if (r() < 0.5) B.box(x + 0.4 * s, groundY, z + 0.2 * s, 0.5 * s, 0.3 * s, 0.4 * s, { tex: 'stone', tint }, { ry: r() * 1.4, shadow: false });
}

// A one-room log cabin with a stepped roof, a lit window and a stone
// chimney — a lone homestead tucked into the foothills.
function cabin(B, x, z, groundY, ry, seed) {
  const r = rng(seed), w = 2.6 + r() * 0.8, d = 2.3 + r() * 0.6, wallH = 2 + r() * 0.3;
  const roof = r() < 0.5 ? { tex: 'wood_panel' } : { tex: 'stone' };
  B.at(x, groundY, z, ry, () => {
    B.box(0, 0, 0, w, wallH, d, { tex: 'log', top: 'log_top' }, { shadow: false });
    B.box(0, wallH, 0, w + 0.5, 0.3, d + 0.5, roof, { shadow: false });
    B.box(0, wallH + 0.3, 0, w * 0.55, 0.3, d * 0.55, roof, { shadow: false });
    B.box(0, wallH + 0.6, 0, w * 0.22, 0.25, d * 0.22, roof, { shadow: false });
    B.box(0, 0, -d * 0.32, 0.4, wallH + 0.9, 0.4, { tex: 'stone' }, { shadow: false });
    B.box(0, 0, d / 2 + 0.02, 0.7, wallH * 0.65, 0.06, { tex: 'wood_floor' }, { shadow: false });
    B.box(w / 2 + 0.02, wallH * 0.55, 0, 0.06, 0.45, 0.45, { tex: 'glow', emissive: 1 }, { shadow: false });
  });
}

const MOUNTAIN = { heightAt: mountainHeightAt, look: mountainLook, forestLine: FOREST_LINE, boulders: true };
const HILL = { heightAt: hillHeightAt, look: hillLook, forestLine: HILL_TOP, boulders: false };

// One belt: `along` is the span (metres) running parallel to the coast;
// `point(u, d)` maps (along-coordinate, distance-out) to world (x, z);
// `profile` picks the mountain or hill height field and planting rules.
function paintBelt(B, r, tufts, belt) {
  const { along, offset, point, profile } = belt;
  const pass = (dFrom, dTo, size) => {
    for (let a = along.from; a < along.to; a += size) {
      const u = a + size / 2;
      for (let d = dFrom; d < dTo; d += size) {
        const dd = d + size / 2;
        const h = Math.round(profile.heightAt(u, dd, offset) * 2) / 2;
        const patchy = rough(u * 0.5 + offset, dd * 0.5) > 0.55;
        const [cx, cz] = point(u, dd);
        B.box(cx, -1.2, cz, size, h + 1.2, size, profile.look(h, patchy), { shadow: false });
        const jx = cx + (r() - 0.5) * size * 0.5, jz = cz + (r() - 0.5) * size * 0.5;
        // Forest cover thins out with altitude, regardless of whether the
        // ground under it is still grass or has turned to bare stone —
        // pines climb rocky slopes long before the real treeline.
        if (h < profile.forestLine) {
          const density = 1 - h / profile.forestLine, roll = r(), seed = Math.floor(r() * 1e6);
          if (roll < 0.18 * density) broadleaf(B, jx, jz, h, 0.85 + r() * 0.5, seed);
          else if (roll < 0.34 * density) pine(B, jx, jz, h, 0.8 + r() * 0.55, seed);
          else if (roll < 0.52 * density) shrub(B, jx, jz, h, 0.8 + r() * 0.5, seed);
          else if (roll < 0.52 * density + 0.3 * Math.max(density, 0.25)) tufts.push({ x: jx, y: h, z: jz, tile: TUFT_TILES[Math.floor(r() * TUFT_TILES.length)], s: 0.6 + r() * 0.4, ry: r() * Math.PI });
          if (h < STONE_LINE - 0.4 && dd > 8 && dd < 60 && r() < 0.012) cabin(B, cx, cz, h, Math.floor(r() * 4) * Math.PI / 2, Math.floor(r() * 1e6));
        } else if (profile.boulders && h < SNOW_LINE && r() < 0.08) boulder(B, jx, jz, h, 0.7 + r() * 0.6, Math.floor(r() * 1e6));
      }
    }
  };
  pass(0, NEAR, NEAR_CELL);
  pass(NEAR, DEPTH, FAR_CELL);
}

export function buildMountains(layer, materials) {
  const B = new BoxBatch(layer), r = rng(20260501), tufts = [];
  const belts = [
    // West (the left side, facing the spawn's north heading): rocky,
    // snow-capped mountain, same as the north range. Depth runs along -x
    // from the coast; u runs the full north-south span plus the belt's own
    // depth, so it wraps the NW and SW corners.
    { offset: 0, along: { from: ISLAND.z0 - DEPTH, to: ISLAND.z1 + DEPTH }, point: (u, d) => [ISLAND.x0 - d, u], profile: MOUNTAIN },
    // East: big green hills.
    { offset: 500, along: { from: ISLAND.z0 - DEPTH, to: ISLAND.z1 + DEPTH }, point: (u, d) => [ISLAND.x1 + d, u], profile: HILL },
    // North: the rocky, snow-capped mountain range, directly behind the
    // plaza. Only the island's own width — west and east already cover the
    // corners — leaving the south side open to the sea.
    { offset: 1000, along: { from: ISLAND.x0, to: ISLAND.x1 }, point: (u, d) => [u, ISLAND.z0 - d], profile: MOUNTAIN },
  ];
  for (const belt of belts) paintBelt(B, r, tufts, belt);

  const group = new THREE.Group(); group.name = 'mountains';
  for (const m of B.build(materials)) group.add(m);
  if (tufts.length) group.add(buildTufts(layer, materials, tufts, 'mountain-undergrowth'));
  return { group };
}
