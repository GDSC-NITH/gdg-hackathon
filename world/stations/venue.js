// Venue: the Neon Hacker HQ, a two-storey glass-front tech hub.
// Local frame: (0, 0) is the centre, +z is the front (faces the path).
//
// Built from boxes in the station batch, so it costs no draw calls of its
// own. Neon edges in the GDG colours, the LED sign, the glass and the rooftop
// logo are emissive: bright by day and glowing at night with no extra lights.
import { pixelText } from '@engine/world/pixel-text.js';
import { STATION_SCALE as S } from '../layout.js';
import { makePerson, prop, SKIN, HAIR, TEE } from '../people.js';

// Metres in the station's frame; B.box takes the bottom of the box.
const at = box => (x, y, z, w, h, d, look, opts) => box(x / S, y / S, z / S, w / S, h / S, d / S, look, opts);
const paint = tint => ({ tex: 'paint', tint }), neon = tint => ({ tex: 'paint', tint, emissive: 1 });
const W = 6.4, D = 4.6, PLINTH = 0.25, F1 = 2.6, SLAB = 0.3, F2 = 2.1, OVER = 0.4;
const Y1 = PLINTH, Y2 = Y1 + F1 + SLAB, ROOF = Y2 + F2;
export const VENUE_ROOF = ROOF + 0.2;
const GRAPHITE = paint(0x2b2f36), WHITE = paint(0xf1efe9), FRAME = { tex: 'black_metal' };

// Pixel lettering, one box per run of lit pixels, centred on x, facing +z.
function sign(b, text, cx, y, z, px, look) {
  const rows = new Map();
  const width = pixelText({ set fillStyle(v) {}, fillRect(x, py) { (rows.get(py) || rows.set(py, []).get(py)).push(x); } }, text, 0, 0, 1, '');
  for (const [py, xs] of rows) {
    xs.sort((m, n) => m - n);
    for (let i = 0; i < xs.length;) {
      let j = i;
      while (j + 1 < xs.length && xs[j + 1] === xs[j] + 1) j++;
      b(cx + (xs[i] + (j - i + 1) / 2 - width / 2) * px, y + (6 - py) * px, z, (j - i + 1) * px, px, 0.04, look);
      i = j + 1;
    }
  }
}

function hq(box) {
  const b = at(box), hw = W / 2, hd = D / 2;
  // Plinth and front steps.
  b(0, 0, 0, W + 0.5, PLINTH, D + 0.5, paint(0x3a3f47));
  for (const [i, z] of [[0, hd + 0.5], [1, hd + 0.3]]) b(0, 0, z, 2.8 - i * 0.2, PLINTH - i * 0.1 + 0.02, 0.4, paint(0x4a4f57));

  // Ground floor: graphite sides and back, a lit glass curtain wall in front.
  b(-hw + 0.1, Y1, 0, 0.2, F1, D, GRAPHITE);
  b(hw - 0.1, Y1, 0, 0.2, F1, D, GRAPHITE);
  b(0, Y1, -hd + 0.1, W, F1, 0.2, GRAPHITE);
  b(0, Y1, 0, W - 0.4, 0.04, D - 0.4, paint(0x8a6b4a));
  b(0, Y1 + 0.05, hd - 0.1, W - 0.4, F1 - 0.1, 0.06, { tex: 'paint', tint: 0x6fb7d9, emissive: 0.35 });
  for (let x = -hw + 0.2; x <= hw - 0.19; x += (W - 0.4) / 4) b(x, Y1, hd - 0.05, 0.1, F1, 0.12, FRAME);
  b(0, Y1 + F1 - 0.1, hd - 0.05, W - 0.4, 0.1, 0.12, FRAME);
  // Glass doors, darker, with steel handles.
  b(0, Y1, hd - 0.02, 1.9, 2.25, 0.06, { tex: 'paint', tint: 0x2c5d7a, emissive: 0.2 });
  b(0, Y1, hd + 0.01, 0.06, 2.25, 0.04, FRAME);
  for (const sx of [-0.18, 0.18]) b(sx, Y1 + 0.95, hd + 0.06, 0.04, 0.5, 0.04, { tex: 'steel' });

  // Floor slab, white, with a red neon line along its front and sides.
  b(0, Y1 + F1, OVER / 2, W + 0.3, SLAB, D + OVER + 0.3, WHITE);
  b(0, Y1 + F1 + 0.1, hd + OVER + 0.16, W + 0.3, 0.07, 0.03, neon(0xea4335));
  for (const sx of [-1, 1]) b(sx * (hw + 0.16), Y1 + F1 + 0.1, OVER / 2, 0.03, 0.07, D + OVER + 0.3, neon(0xea4335));

  // Upper floor, pushed out over the entrance, with a glowing ribbon window.
  const fz = hd + OVER;
  b(-hw + 0.1, Y2, OVER / 2, 0.2, F2, D + OVER, GRAPHITE);
  b(hw - 0.1, Y2, OVER / 2, 0.2, F2, D + OVER, GRAPHITE);
  b(0, Y2, -hd + 0.1, W, F2, 0.2, GRAPHITE);
  b(0, Y2, fz - 0.1, W, 0.5, 0.2, GRAPHITE);
  b(0, Y2 + 1.5, fz - 0.1, W, F2 - 1.5, 0.2, GRAPHITE);
  b(0, Y2 + 0.5, fz - 0.12, W - 0.4, 1.0, 0.06, { tex: 'paint', tint: 0x9fe3ff, emissive: 0.6 });
  for (let x = -hw + 0.2; x <= hw - 0.19; x += (W - 0.4) / 6) b(x, Y2 + 0.5, fz - 0.06, 0.08, 1.0, 0.1, FRAME);
  // The VENUE sign: white LEDs on a black band above the doors.
  b(0, Y1 + F1 - 0.75, hd + 0.02, 3.4, 0.6, 0.08, paint(0x111318));
  sign(b, 'VENUE', 0, Y1 + F1 - 0.68, hd + 0.08, 0.065, neon(0xffffff));

  // Roof slab, a blue neon line round its top, green and yellow neon corners.
  b(0, ROOF, OVER / 2, W + 0.3, 0.2, D + OVER + 0.3, WHITE);
  b(0, ROOF + 0.2, fz + 0.16, W + 0.3, 0.06, 0.03, neon(0x4285f4));
  for (const sx of [-1, 1]) b(sx * (hw + 0.16), ROOF + 0.2, OVER / 2, 0.03, 0.06, D + OVER + 0.3, neon(0x4285f4));
  for (const [sx, tint] of [[-1, 0x34a853], [1, 0xfbbc05]]) {
    b(sx * (hw + 0.02), Y1, hd + 0.02, 0.07, F1, 0.07, neon(tint));
    b(sx * (hw + 0.02), Y2, fz + 0.02, 0.07, F2, 0.07, neon(tint));
  }

  // Rooftop: railings, the giant GDG logo and an antenna with a red beacon.
  for (const [x, z, w, d] of [[0, fz + 0.05, W, 0.05], [-hw + 0.05, OVER / 2, 0.05, D + OVER], [hw - 0.05, OVER / 2, 0.05, D + OVER]]) {
    b(x, ROOF + 0.85, z, w, 0.05, d, FRAME);
  }
  for (let x = -hw + 0.1; x <= hw; x += 0.8) b(x, ROOF + 0.2, fz + 0.05, 0.05, 0.7, 0.05, FRAME);
  b(0, ROOF + 0.2, -0.3, 0.12, 0.5, 0.12, FRAME);
  b(0, ROOF + 0.7, -0.3, 2.4, 1.2, 0.12, paint(0x111318));
  // "<" and ">" apart, as in the GDG logo: each stroke 0.5 m, tips outward.
  for (const [x, y, rz, tint] of [
    [-0.55, 0.177, 0.785, 0xea4335], [-0.55, -0.177, -0.785, 0x4285f4],
    [0.55, 0.177, -0.785, 0x34a853], [0.55, -0.177, 0.785, 0xfbbc05],
  ]) b(x, ROOF + 1.3 + y - 0.07, -0.22, 0.5, 0.14, 0.04, neon(tint), { rz });
  b(hw - 0.6, ROOF + 0.2, -hd + 0.6, 0.08, 2.2, 0.08, { tex: 'steel' });
  b(hw - 0.6, ROOF + 2.4, -hd + 0.6, 0.16, 0.16, 0.16, neon(0xff3b2f));
}

// Hackers hanging out on the stage round the Venue, in GDG tees: a snack
// corner with pizza, two friends saying cheers, a fan with a flag and a
// keepy-uppy player. Metres in the station's frame, +z the front; the spot
// in front of the door, where visitors stand, stays clear.
function crowd(box, solid) {
  const person = makePerson(box);
  const P = tint => ({ tex: 'paint', tint }), glow = tint => ({ tex: 'paint', tint, emissive: 1 });
  const at = (who, i, [dx, dy, dz] = [0, 0, 0]) => { const [x, y, z] = who.place(who.hands[i]); return [x + dx, y + dy, z + dz]; };

  // Snack corner: a bar table with an open pizza box and two cans.
  const tx = -3.0, tz = 3.25;
  prop(box, [tx, 0.02, tz], 0.42, 0.04, 0.42, P(0x2b2b2b));
  prop(box, [tx, 0.52, tz], 0.07, 0.96, 0.07, P(0x2b2b2b));
  prop(box, [tx, 1.02, tz], 0.72, 0.05, 0.72, { tex: 'oak' });
  prop(box, [tx, 1.065, tz + 0.04], 0.44, 0.04, 0.44, P(0xc9a06a));
  prop(box, [tx, 1.27, tz - 0.17], 0.44, 0.4, 0.03, P(0xc9a06a));
  prop(box, [tx, 1.095, tz + 0.04], 0.38, 0.02, 0.38, P(0xe3a857));
  for (const [px, pz] of [[-0.09, -0.05], [0.1, 0.08], [-0.04, 0.13], [0.08, -0.1]]) prop(box, [tx + px, 1.11, tz + 0.04 + pz], 0.07, 0.015, 0.07, P(0xb33a2a));
  prop(box, [tx + 0.27, 1.11, tz + 0.24], 0.07, 0.13, 0.07, P(TEE.red));
  prop(box, [tx - 0.27, 1.11, tz + 0.25], 0.07, 0.13, 0.07, P(TEE.blue));
  // She takes a bite of a slice.
  const eater = person({ x: -3.75, z: 2.8, yaw: 0.55, skin: SKIN.light, hair: HAIR.brown, frock: 0xf48fb1, long: true, bow: TEE.red, arms: [-2.25, 0.05], spread: [0.32, -0.08] });
  prop(box, at(eater, 0, [0, 0.03, 0]), 0.13, 0.025, 0.2, P(0xe3a857), 0.4);
  prop(box, at(eater, 0, [0, 0.05, 0]), 0.06, 0.012, 0.06, P(0xb33a2a));
  // Her friend reaches for one, a can in the other hand.
  const friend = person({ x: -2.3, z: 3.85, yaw: -2.2, skin: SKIN.tan, hair: HAIR.black, frock: TEE.green, ponytail: true, bow: TEE.yellow, arms: [-0.55, -1.15], spread: [0.1, -0.12] });
  prop(box, at(friend, 0, [0, 0.03, 0]), 0.07, 0.13, 0.07, P(TEE.yellow));
  solid(tx / S, (tz + 0.05) / S, 2.0 / S, 1.6 / S);

  // Cheers: two friends knock their cans together.
  const a = person({ x: 2.4, z: 3.15, yaw: Math.PI / 2, skin: SKIN.wheat, hair: HAIR.black, tee: TEE.red, arms: [-2.1, 0.1], spread: [0.05, -0.08], mouth: 'open' });
  const b = person({ x: 3.55, z: 3.15, yaw: -Math.PI / 2, skin: SKIN.brown, hair: HAIR.auburn, frock: TEE.blue, long: true, bow: TEE.yellow, arms: [0.1, -2.1], spread: [0.08, -0.05], mouth: 'open' });
  prop(box, at(a, 0, [0, 0.04, 0]), 0.07, 0.13, 0.07, P(TEE.green));
  prop(box, at(b, 1, [0, 0.04, 0]), 0.07, 0.13, 0.07, P(TEE.blue));
  const [cx, cy, cz] = at(a, 0);
  for (const [dx, dy] of [[-0.05, 0.2], [0.06, 0.26], [0.0, 0.32]]) prop(box, [cx + 0.03 + dx, cy + dy, cz], 0.04, 0.04, 0.04, glow(0xffe08a));
  solid(2.98 / S, 3.15 / S, 1.7 / S, 0.8 / S);

  // A fan cheers with both arms up and a GDG flag.
  const fan = person({ x: -4.25, z: 0.45, yaw: -0.35, skin: SKIN.wheat, hair: HAIR.black, frock: TEE.yellow, ponytail: true, bow: TEE.blue, arms: [-2.85, -2.85], spread: [-0.35, 0.35], mouth: 'open' });
  const [fx, fy, fz] = at(fan, 1);
  prop(box, [fx, fy + 0.3, fz], 0.03, 0.75, 0.03, P(0xdedede));
  const stripes = [TEE.blue, TEE.red, TEE.yellow, TEE.green];
  stripes.forEach((tint, i) => prop(box, [fx + 0.08 + i * 0.075, fy + 0.55, fz], 0.075, 0.24, 0.02, P(tint), -0.35));
  solid(-4.25 / S, 0.45 / S, 0.8 / S, 0.7 / S);

  // Keepy-uppy: one foot up, the ball in the air.
  const player = person({ x: 4.25, z: 0.25, yaw: 0.35, skin: SKIN.tan, hair: HAIR.brown, tee: TEE.blue, arms: [-0.35, -0.35], spread: [-0.75, 0.75], legs: [-0.95, 0] });
  const [bx, by, bz] = player.place(player.feet[0]);
  prop(box, [bx, by + 0.42, bz], 0.22, 0.22, 0.22, P(0xf4f4f4), 0.4);
  for (const [dx, dy] of [[-0.05, 0.03], [0.06, -0.05]]) prop(box, [bx + dx, by + 0.42 + dy, bz + 0.112], 0.07, 0.07, 0.01, P(0x1d1d24), 0.4);
  solid(4.25 / S, 0.3 / S, 0.9 / S, 0.9 / S);

  // A selfie by the balloons: phone held up, screen lit.
  const selfie = person({ x: 4.1, z: -1.55, yaw: 0.6, skin: SKIN.brown, hair: HAIR.black, frock: TEE.red, long: true, bow: TEE.green, arms: [-2.45, 0.1], spread: [0.25, -0.08] });
  const [sx, sy, sz] = at(selfie, 0, [0, 0.06, 0]);
  prop(box, [sx, sy, sz], 0.1, 0.17, 0.02, P(0x1d1d24), 0.6);
  prop(box, [sx + 0.012 * Math.sin(0.6), sy, sz + 0.012 * Math.cos(0.6)], 0.08, 0.14, 0.008, glow(0x9fd3ff), 0.6);
  solid(4.1 / S, -1.55 / S, 0.7 / S, 0.7 / S);
}

export default {
  // Tall enough that the station's marker gem floats above the rooftop logo.
  size: [5.6, 5.4, 4.4],
  build({ box, solid, light, cornerLights }) {
    cornerLights(5.6, 4.4, 'warm');
    hq(box);
    solid(0, 0, 5.6, 4.4);
    crowd(box, solid);
    // Light spilling out of the glass front and the upper ribbon window.
    light(0, 1.4, 2.6, 2.6, 8);
    light(0, 3.9, 2.9, 2.2, 7);
    light(-2.4, 1.6, 2.4, 2.0, 7);
    light(2.4, 1.6, 2.4, 2.0, 7);
  },
};
