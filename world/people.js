// Blocky people for stations: a body in the player's Minecraft proportions
// (1.8 m tall), posed with simple joint angles, plus small props in hand.
// Everything is boxes in the station's batch, so a crowd costs no extra
// draw calls.
//
// Units are metres in the station's frame (before STATION_SCALE). A person's
// own +z is where they face; `yaw` turns them like a station's B.at frame.
import { STATION_SCALE as S } from './layout.js';

export const SKIN = { light: 0xf1c9a5, wheat: 0xe0ac69, tan: 0xc68642, brown: 0x8d5524 };
export const HAIR = { black: 0x1c1712, brown: 0x4a2c1a, auburn: 0x7a3418 };
// GDG hackathon T-shirts.
export const TEE = { blue: 0x4285f4, red: 0xea4335, green: 0x34a853, yellow: 0xfbbc05 };

const paint = tint => ({ tex: 'paint', tint });
const cloth = tint => ({ tex: 'linen', tint });
const denim = { tex: 'linen', tint: 0x34466e };

const LEG = 0.72, TORSO = 0.62, HEAD = 0.4, ARM = 0.62;
const HIP_Y = LEG, SHOULDER_Y = LEG + TORSO - 0.04;

// A point `d` along a limb hanging from its joint, swung forward/back by `a`
// (radians about x; negative swings forward, -π points straight up) and
// out to the side by `c` (about z), in the person's own frame.
const along = (d, a, c) => [d * Math.sin(c), -d * Math.cos(c) * Math.cos(a), -d * Math.cos(c) * Math.sin(a)];

export function makePerson(box) {
  // One box in the person's frame, placed into the station's frame.
  function part(p, [px, py, pz], w, h, d, look, rx = 0, rz = 0) {
    const cos = Math.cos(p.yaw), sin = Math.sin(p.yaw);
    const x = p.x + px * cos + pz * sin, z = p.z - px * sin + pz * cos;
    // B.box takes the bottom of the box; (px, py, pz) is its centre.
    box(x / S, (py - h / 2) / S, z / S, w / S, h / S, d / S, look,
      { ry: p.yaw, rx, rz, order: 'YXZ' });
  }

  // A limb from a joint: an upper part (sleeve, trouser) and a lower part.
  function limb(p, joint, a, c, w, d, segments) {
    let at = 0;
    for (const [len, look] of segments) {
      const [dx, dy, dz] = along(at + len / 2, a, c);
      part(p, [joint[0] + dx, joint[1] + dy, joint[2] + dz], w, len, d, look, a, c);
      at += len;
    }
    const [ex, ey, ez] = along(at, a, c);
    return [joint[0] + ex, joint[1] + ey, joint[2] + ez];
  }

  // Draws a person. Returns where each hand and foot ends, in their own frame.
  return function person({
    x, z, yaw = 0, skin = SKIN.wheat, hair = HAIR.black, tee = TEE.blue, pants = denim,
    long = false, ponytail = false, bow = null, skirt = null, frock = null,
    arms = [0, 0], spread = [0.08, -0.08], legs = [0, 0], mouth = 'smile',
  }) {
    const p = { x, z, yaw };
    // A frock is the top and a flared skirt in one colour.
    const top = frock ?? tee, dress = frock ?? skirt;
    const skinLook = paint(skin), hairLook = paint(hair), teeLook = cloth(top);
    // Below a skirt or frock the legs are bare, in white socks and shoes.
    const legLook = dress ? skinLook : typeof pants === 'number' ? cloth(pants) : pants;
    const legsAt = [-0.11, 0.11].map((hx, i) => limb(p, [hx, HIP_Y, 0], legs[i], 0, 0.2, 0.22,
      dress ? [[LEG - 0.22, legLook], [0.14, paint(0xf2f2f2)], [0.08, paint(0x2b2b2b)]] : [[LEG - 0.08, legLook], [0.08, paint(0xf2f2f2)]]));
    if (frock) {
      // Two tiers flaring out to the knee, and a white hem.
      part(p, [0, HIP_Y - 0.06, 0], 0.5, 0.26, 0.3, cloth(frock));
      part(p, [0, HIP_Y - 0.26, 0], 0.62, 0.18, 0.4, cloth(frock));
      part(p, [0, HIP_Y - 0.37, 0], 0.64, 0.04, 0.42, cloth(0xffffff));
    } else if (skirt) {
      part(p, [0, HIP_Y - 0.1, 0], 0.5, 0.34, 0.3, cloth(skirt));
      part(p, [0, HIP_Y - 0.25, 0], 0.56, 0.06, 0.36, cloth(skirt));
    }
    part(p, [0, LEG + TORSO / 2, 0], 0.44, TORSO, 0.24, teeLook);
    // The GDG logo on the chest: the four-colour < > on a white patch.
    const chestY = LEG + TORSO - 0.2, front = 0.125;
    part(p, [0, chestY, front], 0.26, 0.14, 0.01, paint(0xffffff));
    for (const [lx, ly, rz, tint] of [
      // "<" in red and blue on the viewer's left, ">" in green and yellow.
      [-0.055, 0.022, 0.785, TEE.red], [-0.055, -0.022, -0.785, TEE.blue],
      [0.055, 0.022, -0.785, TEE.green], [0.055, -0.022, 0.785, TEE.yellow],
    ]) part(p, [lx, chestY + ly, front + 0.008], 0.07, 0.025, 0.01, paint(tint), 0, rz);
    const hands = [-0.305, 0.305].map((sx, i) => limb(p, [sx, SHOULDER_Y, 0], arms[i], spread[i], 0.17, 0.17,
      [[0.26, teeLook], [ARM - 0.26, skinLook]]));
    // Head, hair, face.
    const headY = LEG + TORSO + 0.02 + HEAD / 2;
    part(p, [0, headY, 0], HEAD, HEAD, HEAD, skinLook);
    part(p, [0, headY + HEAD / 2 + 0.04, -0.01], HEAD + 0.04, 0.09, HEAD + 0.04, hairLook);
    part(p, [0, long ? headY - 0.12 : headY + 0.06, -HEAD / 2 - 0.03], HEAD + 0.04, long ? 0.72 : 0.3, 0.07, hairLook);
    if (long) for (const sx of [-1, 1]) part(p, [sx * (HEAD / 2 + 0.02), headY - 0.02, -0.08], 0.05, 0.5, 0.24, hairLook);
    // A ponytail from the back of the head, with a band in the bow colour.
    if (ponytail) {
      part(p, [0, headY + 0.04, -HEAD / 2 - 0.1], 0.14, 0.14, 0.12, hairLook);
      part(p, [0, headY - 0.22, -HEAD / 2 - 0.12], 0.13, 0.42, 0.11, hairLook);
      part(p, [0, headY + 0.04, -HEAD / 2 - 0.035], 0.16, 0.06, 0.03, paint(bow ?? 0xea4335));
    }
    // A bow on the side of the head.
    if (bow && !ponytail) {
      for (const dz of [-0.07, 0.07]) part(p, [HEAD / 2 - 0.02, headY + HEAD / 2 - 0.02, dz], 0.08, 0.1, 0.1, paint(bow));
      part(p, [HEAD / 2 - 0.02, headY + HEAD / 2 - 0.02, 0], 0.09, 0.06, 0.05, paint(bow));
    }
    for (const sx of [-0.09, 0.09]) part(p, [sx, headY + 0.03, HEAD / 2 + 0.01], 0.07, 0.07, 0.02, paint(0x1d1d24));
    part(p, [0, headY - 0.1, HEAD / 2 + 0.01], mouth === 'open' ? 0.1 : 0.13, mouth === 'open' ? 0.08 : 0.03, 0.02, paint(0x8a2a2a));
    return { hands, feet: legsAt, place: ([hx, hy, hz]) => {
      const cos = Math.cos(yaw), sin = Math.sin(yaw);
      return [x + hx * cos + hz * sin, hy, z - hx * sin + hz * cos];
    } };
  };
}

// A small box (a prop) centred at a station-frame point, in metres.
export function prop(box, [x, y, z], w, h, d, look, ry = 0) {
  box(x / S, (y - h / 2) / S, z / S, w / S, h / S, d / S, look, { ry });
}
