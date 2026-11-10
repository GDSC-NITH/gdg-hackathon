// NIT Hamirpur around the venue ground. Everything here is backdrop: it sits
// outside the island's invisible wall, so it needs no collision, nav or
// picking, and it is all added to the island's one BoxBatch, so it costs no
// extra draw calls (only triangles: about 2,500 boxes).
//
//   north   chir pine forest and the campus communication tower
//   east    basketball court with floodlights and a terraced gallery
//   west    the practice ground: worn patches, goals, a volleyball net
//   south   the campus road: Admin Block, Central Block, lamp posts,
//           hedges, and the New Lecture Hall at its end
//   all     a perimeter fence round the venue ground, with the main gate
//
// Reference photos: the ground at sunset, the court and gallery, and the
// road between the Admin and Central Blocks.
import { rng } from '@engine/world/textures.js';
import { pixelText } from '@engine/world/pixel-text.js';
import { valueNoise } from '@engine/world/terrain.js';
import { ISLAND } from './layout.js';

const NO_SHADOW = { shadow: false };
const GROUND_Y = -0.05; // top of the campus ground, just under the island's grass

// ---------- Palette (taken from the photos) ----------
const C = {
  grass: { top: 'grass_top', side: 'grass_side', bottom: 'dirt' },
  worn: { tex: 'sand', tint: 0xc9b38a },
  asphalt: { tex: 'concrete', tint: 0x4f5357 },
  roadLine: { tex: 'paint', tint: 0xf4f4f0 },
  kerbDark: { tex: 'paint', tint: 0x222426 },
  kerbLight: { tex: 'paint', tint: 0xeeeeea },
  footpath: { tex: 'pavers', tint: 0xd59a8e },
  hedge: { tex: 'hedge', tint: 0xb9cfa0 },
  brick: { tex: 'white_brick', tint: 0xc4c8cb },     // grey block masonry
  stoneWall: { tex: 'white_brick', tint: 0xd8c7a6 },  // Admin Block's sandstone
  orange: { tex: 'paint', tint: 0xd9823b },          // floor bands and trims
  roofGreen: { tex: 'paint', tint: 0x3f9257 },
  white: { tex: 'paint', tint: 0xf1efe9 },
  plinth: { tex: 'stone', tint: 0x9a9690 },
  window: { tex: 'paint', tint: 0x34475a, emissive: 0.35 },
  windowLit: { tex: 'paint', tint: 0xe6d6a8, emissive: 0.45 }, // rooms with the lights on
  signBlue: { tex: 'paint', tint: 0x1f5fa8 },
  signText: { tex: 'paint', tint: 0xffffff, emissive: 0.5 },
  metal: { tex: 'black_metal' },
  fence: { tex: 'paint', tint: 0x23402f },
  lantern: { tex: 'glow', emissive: 1 },
  court: { tex: 'paint', tint: 0x6d8ea3 },
  courtApron: { tex: 'concrete', tint: 0x9aa6ab },
  courtKey: { tex: 'paint', tint: 0xd59d8f },
  concrete: { tex: 'concrete', tint: 0xe9e8e3 },
  log: { tex: 'log', top: 'log_top' },
  pine: { tex: 'foliage', tint: 0x3c6a3f },
  pineDark: { tex: 'foliage', tint: 0x2e5634 },
  araucaria: { tex: 'foliage', tint: 0x2d5a37 },
  shade: { tex: 'foliage', tint: 0x4a8a3c },
  towerRed: { tex: 'paint', tint: 0xc8382e },
  towerWhite: { tex: 'paint', tint: 0xeeeeee },
  beacon: { tex: 'paint', tint: 0xff3b2f, emissive: 1 },
  flood: { tex: 'paint', tint: 0xfff4d6, emissive: 1 },
  net: { tex: 'paint', tint: 0x2a2a2a },
};

// ---------- Helpers ----------
// Lettering in the engine's 5×7 pixel font, one box per pixel, in the
// current B.at frame: centred on local x = 0, bottom at local y = 0, on the
// plane z = 0, read from the +z side.
function boxText(B, text, scale, look) {
  const rows = new Map();
  const width = pixelText({ set fillStyle(v) {}, fillRect(px, py) { (rows.get(py) || rows.set(py, []).get(py)).push(px); } }, text, 0, 0, 1, '');
  // One box per horizontal run of lit pixels.
  for (const [py, xs] of rows) {
    xs.sort((a, b) => a - b);
    for (let i = 0; i < xs.length;) {
      let j = i;
      while (j + 1 < xs.length && xs[j + 1] === xs[j] + 1) j++;
      const run = j - i + 1;
      B.box((xs[i] + run / 2 - width / 2) * scale, (6 - py) * scale, 0, run * scale, scale, 0.06, look, NO_SHADOW);
      i = j + 1;
    }
  }
  return width * scale;
}

// A blue name board with white lettering, facing local +z.
function nameBoard(B, text, scale, y, z) {
  const w = (text.length * 6 - 1) * scale + scale * 4, h = 11 * scale;
  B.box(0, y, z, w, h, 0.12, C.signBlue, NO_SHADOW);
  B.at(0, y + 2 * scale, z + 0.07, 0, () => boxText(B, text, scale, C.signText));
}

// A chir pine: a tall bare trunk with a flat, uneven crown, as on the hills round the ground.
function chirPine(B, x, z, r) {
  const h = 8 + r() * 5, s = 0.85 + r() * 0.35, look = r() < 0.5 ? C.pine : C.pineDark;
  B.box(x, GROUND_Y, z, 0.42, h, 0.42, C.log, NO_SHADOW);
  B.box(x + (r() - 0.5) * 0.6, h - 0.8, z + (r() - 0.5) * 0.6, 3.0 * s, 1.5, 2.6 * s, look, NO_SHADOW);
  B.box(x + (r() - 0.5) * 0.8, h + 0.4, z + (r() - 0.5) * 0.8, 2.1 * s, 1.2, 2.3 * s, look, NO_SHADOW);
  B.box(x, h + 1.4, z, 1.1 * s, 0.7, 1.1 * s, look, NO_SHADOW);
  if (r() < 0.6) B.box(x + (r() - 0.5) * 2, h * (0.55 + r() * 0.2), z + (r() - 0.5) * 2, 1.5 * s, 0.8, 1.3 * s, look, NO_SHADOW);
}

// A Norfolk Island pine: the tiered cone beside the Central Block.
function araucaria(B, x, z) {
  B.box(x, GROUND_Y, z, 0.35, 10, 0.35, C.log, NO_SHADOW);
  for (let i = 0; i < 7; i++) {
    const w = 3.4 - i * 0.42;
    B.box(x, 2.2 + i * 1.15, z, w, 0.45, w, C.araucaria, NO_SHADOW);
  }
  B.box(x, 10.2, z, 0.3, 0.8, 0.3, C.araucaria, NO_SHADOW);
}

// A round shade tree, like the one closing the end of the road.
function shadeTree(B, x, z, s = 1) {
  B.box(x, GROUND_Y, z, 0.6 * s, 3.2 * s, 0.6 * s, C.log, NO_SHADOW);
  B.box(x, 2.6 * s, z, 6 * s, 2.4 * s, 6 * s, C.shade, NO_SHADOW);
  B.box(x, 4.8 * s, z, 4.4 * s, 1.4 * s, 4.4 * s, C.shade, NO_SHADOW);
  B.box(x, 2.9 * s, z, 7 * s, 1.2 * s, 4.2 * s, C.shade, NO_SHADOW);
}

// The black twin-lantern lamp post along the road.
function heritageLamp(B, x, z) {
  B.box(x, GROUND_Y, z, 0.34, 0.5, 0.34, C.metal, NO_SHADOW);
  B.box(x, GROUND_Y, z, 0.14, 3.4, 0.14, C.metal, NO_SHADOW);
  B.box(x, 3.0, z, 1.2, 0.08, 0.08, C.metal, NO_SHADOW);
  for (const dx of [-0.55, 0.55]) {
    B.box(x + dx, 2.75, z, 0.24, 0.3, 0.24, C.lantern, NO_SHADOW);
    B.box(x + dx, 3.05, z, 0.3, 0.1, 0.3, C.metal, NO_SHADOW);
  }
  B.box(x, 3.35, z, 0.28, 0.32, 0.28, C.lantern, NO_SHADOW);
  B.box(x, 3.67, z, 0.34, 0.1, 0.34, C.metal, NO_SHADOW);
}

// A campus block in the NITH style: grey (or sandstone) masonry, orange
// floor bands, rows of windows, a green roof with gables along the front,
// and an entrance porch with a blue name board. Built in a local frame whose
// +z is the front; (x, z) is the centre and yaw turns the front.
function campusBlock(B, { x, z, yaw, w, d, floors, wall, name, porchAt = 0, roofSign = null }) {
  const FH = 3.6, H = floors * FH, lit = rng(Math.round(x * 31 + z * 7));
  const pane = () => (lit() < 0.3 ? C.windowLit : C.window);
  B.at(x, GROUND_Y, z, yaw, () => {
    B.box(0, 0, 0, w + 0.3, 0.6, d + 0.3, C.plinth, NO_SHADOW);
    B.box(0, 0.6, 0, w, H - 0.6, d, wall, NO_SHADOW);
    for (let f = 1; f <= floors; f++) B.box(0, f * FH - 0.4, 0, w + 0.14, 0.4, d + 0.14, C.orange, NO_SHADOW);
    // Windows on all four faces, one bay every 2.6 m, skipping the porch bay.
    for (let f = 0; f < floors; f++) {
      const y = f * FH + 1.05;
      for (let lx = -w / 2 + 1.8; lx <= w / 2 - 1.2; lx += 2.6) {
        if (!(Math.abs(lx - porchAt) < 3.2 && f === 0)) B.box(lx, y, d / 2 + 0.02, 1.3, 1.75, 0.08, pane(), NO_SHADOW);
        B.box(lx, y, -d / 2 - 0.02, 1.3, 1.75, 0.08, pane(), NO_SHADOW);
      }
      for (let lz = -d / 2 + 1.8; lz <= d / 2 - 1.2; lz += 2.6) {
        B.box(w / 2 + 0.02, y, lz, 0.08, 1.75, 1.3, pane(), NO_SHADOW);
        B.box(-w / 2 - 0.02, y, lz, 0.08, 1.75, 1.3, pane(), NO_SHADOW);
      }
    }
    // Stepped green roof.
    B.box(0, H, 0, w + 1.0, 0.5, d + 1.0, C.roofGreen, NO_SHADOW);
    B.box(0, H + 0.5, 0, w - 1.0, 0.6, d - 2.2, C.roofGreen, NO_SHADOW);
    B.box(0, H + 1.1, 0, w - 3.0, 0.6, d - 5.0, C.roofGreen, NO_SHADOW);
    B.box(0, H + 1.7, 0, w - 5.0, 0.4, Math.max(1, d - 8.0), C.roofGreen, NO_SHADOW);
    // Gables along the front: a white face with an orange edge under a green peak.
    const gables = roofSign ? 0 : Math.floor((w - 8) / 6) + 1;
    for (let g = 0; g < gables; g++) {
      const gx = (g - (gables - 1) / 2) * 6;
      B.box(gx, H + 0.4, d / 2 + 0.2, 3.6, 0.6, 1.4, C.roofGreen, NO_SHADOW);
      B.box(gx, H + 1.0, d / 2 + 0.2, 2.4, 0.6, 1.4, C.roofGreen, NO_SHADOW);
      B.box(gx, H + 1.6, d / 2 + 0.2, 1.2, 0.5, 1.4, C.roofGreen, NO_SHADOW);
      B.box(gx, H + 0.4, d / 2 + 0.92, 2.8, 0.9, 0.06, C.orange, NO_SHADOW);
      B.box(gx, H + 0.55, d / 2 + 0.95, 2.0, 0.6, 0.06, C.white, NO_SHADOW);
    }
    // A big name board along the roof's front edge, readable from the ground.
    if (roofSign) {
      const scale = 0.32, bw = (roofSign.length * 6 - 1) * scale + 1.2;
      for (const px of [-bw / 2 + 0.6, 0, bw / 2 - 0.6]) B.box(px, H + 0.5, d / 2 + 0.2, 0.25, 0.6, 0.25, C.metal, NO_SHADOW);
      B.box(0, H + 1.1, d / 2 + 0.2, bw, 7 * scale + 0.8, 0.2, C.signBlue, NO_SHADOW);
      B.at(0, H + 1.5, d / 2 + 0.31, 0, () => boxText(B, roofSign, scale, C.signText));
    }
    // Entrance porch: two columns, a slab, a green gable and the name board.
    B.at(porchAt, 0, d / 2, 0, () => {
      B.box(0, 0, 1.6, 7.2, 0.25, 3.2, C.plinth, NO_SHADOW);
      for (const cx of [-2.9, 2.9]) B.box(cx, 0.25, 2.8, 0.45, FH - 0.25, 0.45, C.white, NO_SHADOW);
      B.box(0, FH, 1.6, 7.4, 0.5, 3.4, C.white, NO_SHADOW);
      B.box(0, FH + 0.5, 1.6, 7.8, 0.6, 3.8, C.roofGreen, NO_SHADOW);
      B.box(0, FH + 1.1, 1.6, 5.2, 0.6, 3.8, C.roofGreen, NO_SHADOW);
      B.box(0, FH + 1.7, 1.6, 2.6, 0.5, 3.8, C.roofGreen, NO_SHADOW);
      B.box(0, 0.25, 0.05, 2.4, 2.6, 0.1, C.window, NO_SHADOW);
      if (name) nameBoard(B, name, Math.min(0.11, 6.6 / ((name.length * 6 + 3))), FH - 1.3, 3.32);
    });
  });
}

// ---------- The pieces ----------
// Flat campus ground out to the fog, so the venue no longer floats over the sea.
function ground(B) {
  B.box(0, GROUND_Y - 1.2, 40, 460, 1.2, 460, C.grass, NO_SHADOW);
}

// The fence round the venue ground: dark green posts and rails, with the
// main gate (pillars, an NIT HAMIRPUR board and a boom barrier) on the avenue.
function fence(B) {
  const x0 = ISLAND.x0 + 0.3, x1 = ISLAND.x1 - 0.3, z0 = ISLAND.z0 + 0.3, z1 = ISLAND.z1 - 0.3, gate = 3.4;
  const rails = (ax, az, bx, bz) => {
    const len = Math.hypot(bx - ax, bz - az), cx = (ax + bx) / 2, cz = (az + bz) / 2, alongX = Math.abs(bx - ax) > Math.abs(bz - az);
    for (const y of [0.15, 1.1, 2.05, 2.6]) B.box(cx, y, cz, alongX ? len : 0.06, 0.06, alongX ? 0.06 : len, C.fence, NO_SHADOW);
    const n = Math.max(1, Math.round(len / 2.5));
    for (let i = 0; i <= n; i++) B.box(ax + (bx - ax) * i / n, GROUND_Y, az + (bz - az) * i / n, 0.1, 2.75, 0.1, C.fence, NO_SHADOW);
  };
  rails(x0, z0, x1, z0);
  rails(x0, z0, x0, z1);
  rails(x1, z0, x1, z1);
  rails(x0, z1, -gate, z1);
  rails(gate, z1, x1, z1);
  // Main gate.
  for (const sx of [-1, 1]) {
    B.box(sx * (gate + 0.45), GROUND_Y, z1, 0.9, 4.6, 0.9, C.white, NO_SHADOW);
    B.box(sx * (gate + 0.45), 4.55, z1, 1.1, 0.25, 1.1, C.orange, NO_SHADOW);
  }
  B.box(0, 4.0, z1, 2 * gate + 1.8, 1.3, 1.0, C.signBlue, NO_SHADOW);
  for (const [face, yaw] of [[1, 0], [-1, Math.PI]]) {
    B.at(0, 4.22, z1 + face * 0.53, yaw, () => boxText(B, 'NIT HAMIRPUR', 0.11, C.signText));
  }
  // Boom barrier, red and white, across the gate.
  B.box(-gate + 0.2, GROUND_Y, z1 + 0.6, 0.3, 1.0, 0.3, C.metal, NO_SHADOW);
  for (let i = 0; i < 6; i++) B.box(-gate + 0.75 + i * 1.05, 0.85, z1 + 0.6, 1.05, 0.12, 0.12, i % 2 ? C.towerWhite : C.towerRed, NO_SHADOW);
}

// The road south from the gate between the Admin and Central Blocks, ending
// at the New Lecture Hall.
function campusRoad(B) {
  const z0 = ISLAND.z1, z1 = 94, len = z1 - z0, mid = (z0 + z1) / 2, half = 4;
  B.box(0, -0.12, mid, half * 2, 0.1, len, C.asphalt, NO_SHADOW);
  for (let z = z0 + 3; z < z1 - 2; z += 5) B.box(0, -0.03, z, 0.16, 0.03, 2.2, C.roadLine, NO_SHADOW);
  for (const sx of [-1, 1]) B.box(sx * (half - 0.25), -0.03, mid, 0.12, 0.03, len, C.roadLine, NO_SHADOW);
  // Zebra crossing between the two blocks.
  for (let x = -half + 0.8; x < half - 0.4; x += 1.1) B.box(x, -0.03, 52, 0.55, 0.03, 3, C.roadLine, NO_SHADOW);
  // Kerbs (black and white), red footpaths, hedges.
  for (const sx of [-1, 1]) {
    for (let z = z0; z < z1; z += 1) B.box(sx * (half + 0.15), GROUND_Y, z + 0.5, 0.3, 0.22, 1, (z & 1) ? C.kerbDark : C.kerbLight, NO_SHADOW);
    B.box(sx * (half + 1.3), GROUND_Y, mid, 2, 0.12, len, C.footpath, NO_SHADOW);
    for (const [a, b] of [[z0 + 1, 44], [56, z1 - 1]]) B.box(sx * (half + 2.7), GROUND_Y, (a + b) / 2, 0.7, 0.8, b - a, C.hedge, NO_SHADOW);
  }
  // Heritage lamps on the west kerb, bollards between them.
  for (let z = z0 + 4; z < z1; z += 9) heritageLamp(B, -half - 0.65, z);
  for (let z = z0 + 2; z < z1; z += 1.8) B.box(-half - 0.65, GROUND_Y, z, 0.16, 0.8, 0.16, C.metal, NO_SHADOW);
  // Forecourt in front of the New Lecture Hall.
  B.box(0, -0.1, z1 + 2.5, 26, 0.08, 5, { tex: 'pavers', tint: 0xd8d2c6 }, NO_SHADOW);

  campusBlock(B, { x: -17, z: 52, yaw: Math.PI / 2, w: 28, d: 14, floors: 2, wall: C.stoneWall, name: 'ADMIN BLOCK', porchAt: 0 });
  campusBlock(B, { x: 18, z: 60, yaw: -Math.PI / 2, w: 34, d: 16, floors: 3, wall: C.brick, name: 'CENTRAL BLOCK', porchAt: -8 });
  campusBlock(B, { x: 0, z: 107, yaw: Math.PI, w: 46, d: 18, floors: 4, wall: C.brick, name: 'NEW LECTURE HALL', porchAt: 0, roofSign: 'NEW LECTURE HALL' });
  araucaria(B, 7.6, 40);
  araucaria(B, -7.8, 70);
  shadeTree(B, -14, 90, 1.1);
  shadeTree(B, 15, 88, 1);
}

// East of the ground: the basketball court under floodlights, with the
// terraced gallery and its pavilion looking over it.
function sportsComplex(B) {
  const cx = 40, cz = 2, W = 15, L = 28;
  B.box(cx, -0.1, cz, W + 4, 0.08, L + 4, C.courtApron, NO_SHADOW);
  B.box(cx, -0.03, cz, W, 0.03, L, C.court, NO_SHADOW);
  const line = (x, z, w, d) => B.box(cx + x, 0.0, cz + z, w, 0.02, d, C.roadLine, NO_SHADOW);
  line(0, -L / 2, W, 0.08); line(0, L / 2, W, 0.08); line(-W / 2, 0, 0.08, L); line(W / 2, 0, 0.08, L); line(0, 0, W, 0.08);
  for (const s of [-1, 1]) {
    B.box(cx, -0.01, cz + s * (L / 2 - 2.9), 4.9, 0.02, 5.8, C.courtKey, NO_SHADOW);
    line(0, s * (L / 2 - 5.8), 4.9, 0.08);
    // Three-point arc, as short straight segments.
    for (let a = -1.25; a <= 1.25; a += 0.25) {
      const px = Math.sin(a) * 6.75, pz = s * (L / 2 - 1.6 - Math.cos(a) * 6.75);
      B.box(cx + px, 0.0, cz + pz, 1.7, 0.02, 0.08, C.roadLine, { ry: -s * a, shadow: false });
    }
    // Hoop: post, arm, white board, orange rim.
    const bz = cz + s * (L / 2 + 0.9);
    B.box(cx, GROUND_Y, bz, 0.2, 3.3, 0.2, C.metal, NO_SHADOW);
    B.box(cx, 3.1, bz - s * 0.6, 0.12, 0.12, 1.2, C.metal, NO_SHADOW);
    B.box(cx, 2.9, bz - s * 1.25, 1.8, 1.05, 0.06, C.white, NO_SHADOW);
    B.box(cx, 3.05, bz - s * 1.6, 0.46, 0.04, 0.46, C.orange, NO_SHADOW);
  }
  B.box(cx, -0.01, cz, 3.6, 0.02, 2.4, C.courtKey, NO_SHADOW);
  B.box(cx, -0.01, cz, 2.4, 0.02, 3.6, C.courtKey, NO_SHADOW);
  // Floodlights at the corners.
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    const x = cx + sx * (W / 2 + 1.6), z = cz + sz * (L / 2 + 1.6);
    B.box(x, GROUND_Y, z, 0.2, 7.2, 0.2, C.white, NO_SHADOW);
    B.box(x - sx * 0.3, 7.0, z - sz * 0.3, 0.9, 0.35, 0.5, C.flood, NO_SHADOW);
  }
  // Gallery: concrete terraces stepping up to the east, a railing in front.
  const gx = cx + W / 2 + 3;
  for (let i = 0; i < 6; i++) B.box(gx + 1 + i * 1.1 + (6 - i) * 0.55, GROUND_Y, cz, (6 - i) * 1.1, 0.45 * (i + 1), L + 6, C.concrete, NO_SHADOW);
  B.box(gx + 0.2, 0.9, cz, 0.06, 0.06, L + 6, C.metal, NO_SHADOW);
  for (let z = cz - (L + 6) / 2; z <= cz + (L + 6) / 2; z += 1.2) B.box(gx + 0.2, GROUND_Y, z, 0.06, 1.0, 0.06, C.metal, NO_SHADOW);
  // Pavilion at the north end of the gallery.
  B.box(gx + 4, GROUND_Y, cz - L / 2 - 6, 8, 3.6, 5, C.white, NO_SHADOW);
  B.box(gx + 4, 1.6, cz - L / 2 - 3.48, 8.04, 0.5, 0.04, { tex: 'paint', tint: 0xf0d27a }, NO_SHADOW);
  B.box(gx + 4, 3.55, cz - L / 2 - 6, 9, 0.3, 6, C.concrete, NO_SHADOW);
}

// West of the ground: the practice field, worn bare where games are played.
function practiceField(B, r) {
  const cx = -46, cz = 2, worn = valueNoise(77);
  for (let x = cx - 16; x < cx + 16; x += 2) for (let z = cz - 24; z < cz + 24; z += 2) {
    const goalMouth = Math.abs(x - cx) < 6 && Math.abs(Math.abs(z - cz) - 20) < 5;
    if (goalMouth || worn(x * 0.09, z * 0.09) > 0.62) B.box(x + 1, -0.06, z + 1, 2, 0.03, 2, C.worn, NO_SHADOW);
  }
  for (const s of [-1, 1]) {
    const gz = cz + s * 23;
    for (const gx of [-3.66, 3.66]) B.box(cx + gx, GROUND_Y, gz, 0.12, 2.44, 0.12, C.white, NO_SHADOW);
    B.box(cx, 2.38, gz, 7.44, 0.12, 0.12, C.white, NO_SHADOW);
    B.box(cx, 2.38, gz + s * 1.5, 7.44, 0.08, 0.08, C.white, NO_SHADOW);
  }
  // Volleyball net nearer the fence.
  for (const nz of [12, 21.5]) B.box(-32, GROUND_Y, nz, 0.1, 2.5, 0.1, C.metal, NO_SHADOW);
  B.box(-32, 1.55, 16.75, 0.04, 0.9, 9.5, C.net, NO_SHADOW);
}

// North of the ground: the campus communication tower over the pines.
function tower(B, x, z) {
  const segments = 8, segH = 5;
  for (let i = 0; i < segments; i++) {
    const half = 1.7 - i * 0.18, y = GROUND_Y + i * segH, look = i >= segments - 3 && i % 2 ? C.towerRed : i >= segments - 3 ? C.towerWhite : C.metal;
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) B.box(x + sx * half, y, z + sz * half, 0.16, segH, 0.16, look, NO_SHADOW);
    for (const s of [-1, 1]) {
      B.box(x, y + segH - 0.1, z + s * half, half * 2, 0.1, 0.1, look, NO_SHADOW);
      B.box(x + s * half, y + segH - 0.1, z, 0.1, 0.1, half * 2, look, NO_SHADOW);
      const brace = Math.hypot(half * 2, segH), tilt = Math.atan2(half * 2, segH);
      B.box(x, y, z + s * half, 0.08, brace, 0.08, look, { rz: tilt, shadow: false });
      B.box(x + s * half, y, z, 0.08, brace, 0.08, look, { rx: tilt, shadow: false });
    }
  }
  B.box(x, GROUND_Y + segments * segH, z, 0.12, 4, 0.12, C.metal, NO_SHADOW);
  B.box(x, GROUND_Y + segments * segH + 4, z, 0.3, 0.3, 0.3, C.beacon, NO_SHADOW);
}

// Pine woods round the campus, kept off the road, the court and the field.
function pineWoods(B, r) {
  const clear = (x, z) =>
    (x > ISLAND.x0 - 3 && x < ISLAND.x1 + 3 && z > ISLAND.z0 - 3 && z < ISLAND.z1 + 3) // venue ground
    || (Math.abs(x) < 32 && z > ISLAND.z1 - 2 && z < 120) // road and blocks
    || (x > 28 && x < 62 && z > -22 && z < 26) // court and gallery
    || (x > -66 && x < -26 && z > -26 && z < 30) // practice field
    || (Math.abs(x - 12) < 4 && Math.abs(z + 46) < 4); // tower
  let placed = 0;
  for (let n = 0; n < 900 && placed < 120; n++) {
    const x = -68 + r() * 136, z = -68 + r() * 190;
    if (clear(x, z)) continue;
    chirPine(B, x, z, r);
    placed++;
  }
}

export function buildCampus(B) {
  const r = rng(1986); // NIT Hamirpur's founding year
  ground(B);
  fence(B);
  campusRoad(B);
  sportsComplex(B);
  practiceField(B, r);
  tower(B, 12, -46);
  pineWoods(B, r);
}

// How far out the campus reaches on each side, so the mountain belts start beyond it.
export const CAMPUS_REACH = { west: 45, east: 42, north: 46, south: 96 };
