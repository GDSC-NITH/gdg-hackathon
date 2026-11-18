// The page view's runner: the site's avatar (engine/world/avatar.js, the
// skin from home.config.js) in one transparent WebGL canvas over the page.
//
// Every section holds an empty `.pv-slot` element; the director moves the
// runner between them as the page scrolls:
//   - while a slot is "held" (it sits in the middle of the screen, or its
//     pinned stage is on screen), the runner stands in it in that slot's pose;
//   - between two holds it travels from one slot to the next (data-travel:
//     run, fly or jump), following both slots as they move with the page.
// Slots with data-mode get scripted moves: orbit (around the trophy),
// treadmill (past events), hurdle (stats) and crater (the footer void).
//
// The trophy, the crater and the ember emblem live in the same scene, so the
// runner can pass behind the trophy and sink into the crater.
import * as THREE from 'three';
import { createAvatar } from '@engine/world/avatar.js';
import { onFrame, onRead, state, reduced } from './scroll.js';
import { signals } from './sections.js';

const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const ease = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
const angle = (a, b, t) => a + Math.atan2(Math.sin(b - a), Math.cos(b - a)) * t;

const FOV = 26, DIST = 16, AV_H = 1.8;
const YAW = { front: 0, left: -0.95, right: 0.95, 'side-left': -Math.PI / 2, 'side-right': Math.PI / 2 };

export async function initMascot(root, { skin = '' } = {}) {
  if (reduced) return null;
  const weak = (navigator.deviceMemory && navigator.deviceMemory <= 2) || (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2);
  if (weak) return null;

  const small = Math.min(innerWidth, innerHeight) < 700;
  const canvas = document.createElement('canvas');
  canvas.className = 'pv-mascot';
  canvas.setAttribute('aria-hidden', 'true');
  let renderer;
  try {
    // Ask for the context on this canvas first: without WebGL the page simply has no runner.
    const attrs = { alpha: true, antialias: !small, powerPreference: 'low-power', premultipliedAlpha: true };
    const context = canvas.getContext('webgl2', attrs);
    if (!context) return null;
    renderer = new THREE.WebGLRenderer({ canvas, context, ...attrs });
  } catch (err) {
    console.warn('Page view runner: WebGL unavailable', err);
    return null;
  }
  root.append(canvas);
  // Phones draw the full-screen runner layer at 1x pixels: the blocky model still reads cleanly.
  renderer.setPixelRatio(small ? 1 : Math.min(devicePixelRatio || 1, 1.6));
  renderer.localClippingEnabled = true;
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 100);
  camera.position.set(0, 0, DIST);
  // Neutral white light, so the skin shows its own colours: the front reads at
  // about full brightness, the sides and top a little darker for depth.
  scene.add(new THREE.HemisphereLight(0xffffff, 0x6e6a66, 2.3));
  const key = new THREE.DirectionalLight(0xffffff, 1.8);
  key.position.set(3, 4, 8);
  scene.add(key);

  // ---------- Runner ----------
  let face0 = null;
  const av = createAvatar(skin, { onFace: () => { face0 = null; captureFace(); } });
  const runner = new THREE.Group();
  runner.add(av.root);
  scene.add(runner);
  const mats = new Set([av.material]);

  // Expressions: the 8×8 face is repainted on the skin canvas.
  const skinCanvas = av.material.map.image;
  const sctx = skinCanvas.getContext('2d', { willReadFrequently: true });
  let expr = 'neutral';
  function captureFace() { try { face0 = sctx.getImageData(8, 8, 8, 8); } catch { face0 = null; } }
  captureFace();
  function setExpr(e, blink = false) {
    const key = e + (blink ? '-blink' : '');
    if (key === expr || !face0) return;
    expr = key;
    sctx.putImageData(face0, 8, 8);
    // The face stays exactly as the skin draws it; the only change is a blink,
    // where the eye row takes the skin's own cheek colour, a shade darker.
    if (blink) {
      const d = face0.data, i = (6 * 8 + 2) * 4;
      sctx.fillStyle = `rgb(${d[i] * 0.88 | 0},${d[i + 1] * 0.85 | 0},${d[i + 2] * 0.82 | 0})`;
      for (const x of [1, 2, 5, 6]) sctx.fillRect(8 + x, 8 + 5, 1, 1);
    }
    av.material.map.needsUpdate = true;
  }

  // Elytra-style wings, ember-tinted, hinged at the upper back.
  const PX = AV_H / 32;
  const wingTex = (() => {
    // Elytra: dark membrane with feather rows, an ember edge and a tapered tip.
    const c = document.createElement('canvas'); c.width = 8; c.height = 16;
    const g = c.getContext('2d');
    for (let y = 0; y < 16; y++) for (let x = 0; x < 8; x++) {
      const t = y / 15;
      if (y > 11 && x < y - 9) continue;
      const edge = x === 7 || (y > 11 && x === y - 9);
      const row = y % 3 === 0;
      g.fillStyle = edge ? '#ff8a3d' : row ? `rgb(${70 + t * 50},${40 + t * 12},${70 - t * 20})` : `rgb(${44 + t * 34 + (x % 2) * 6},${30 + t * 8},${52 - t * 14})`;
      g.fillRect(x, y, 1, 1);
    }
    const tex = new THREE.CanvasTexture(c);
    tex.magFilter = THREE.NearestFilter; tex.minFilter = THREE.NearestFilter; tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  })();
  const wingMat = new THREE.MeshLambertMaterial({ map: wingTex, emissive: 0x2a0b05, alphaTest: 0.5, side: THREE.DoubleSide });
  mats.add(wingMat);
  const wings = [-1, 1].map(side => {
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.8 * PX, 23.5 * PX, -2.3 * PX);
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(5 * PX, 18 * PX, 0.6 * PX), wingMat);
    mesh.position.set(side * 2.5 * PX, -9 * PX, 0);
    if (side < 0) mesh.scale.x = -1;
    pivot.add(mesh);
    av.body.add(pivot);
    pivot.userData.side = side;
    return pivot;
  });

  // Soft contact shadow.
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.5, 24), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.35, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2 + 0.35;
  av.root.add(shadow);

  // ---------- Trophy (loaded when the prizes come near) ----------
  const trophy = new THREE.Group();
  trophy.visible = false;
  scene.add(trophy);
  let trophyLoading = false;
  function loadTrophy() {
    if (trophyLoading) return;
    trophyLoading = true;
    import('three/addons/loaders/GLTFLoader.js').then(({ GLTFLoader }) => {
      new GLTFLoader().load('assets/models/gdg_labyrinth_trophy.glb', gltf => {
        const m = gltf.scene;
        m.rotation.x = -Math.PI / 2;
        const box = new THREE.Box3().setFromObject(m);
        const size = box.getSize(new THREE.Vector3()), center = box.getCenter(new THREE.Vector3());
        m.position.set(-center.x, -box.min.y, -center.z);
        const holder = new THREE.Group();
        holder.add(m);
        holder.scale.setScalar(1 / size.y);
        m.traverse(o => { if (o.isMesh) { o.material = o.material.clone(); if ('emissive' in o.material) o.material.emissive = new THREE.Color(0x2a1204); } });
        trophy.add(holder);
      }, undefined, err => console.warn('Trophy did not load', err));
    });
  }

  // ---------- Crater, embers and the emblem ----------
  const crater = new THREE.Group();
  crater.visible = false;
  scene.add(crater);
  const TILT = 0.62;
  const craterBody = new THREE.Group();
  craterBody.rotation.x = TILT;
  crater.add(craterBody);
  {
    const box = new THREE.BoxGeometry(1, 1, 1);
    const rocks = new THREE.InstancedMesh(box, new THREE.MeshLambertMaterial({ color: 0x2b2522 }), 46);
    const lava = new THREE.InstancedMesh(box, new THREE.MeshBasicMaterial({ color: 0xff7a2e }), 46);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3();
    let i = 0, j = 0;
    for (let k = 0; k < 46; k++) {
      const a = (k / 46) * Math.PI * 2 + Math.sin(k * 7.1) * 0.05;
      const r = 1.05 + (Math.sin(k * 3.7) * 0.5 + 0.5) * 0.45;
      const h = 0.06 + (Math.sin(k * 5.3) * 0.5 + 0.5) * 0.22;
      const w = 0.18 + (Math.sin(k * 2.9) * 0.5 + 0.5) * 0.18;
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), -a + Math.sin(k) * 0.3);
      p.set(Math.cos(a) * r, h / 2 - 0.02, Math.sin(a) * r); s.set(w, h, w);
      rocks.setMatrixAt(i++, m.compose(p, q, s));
      p.set(Math.cos(a) * (r - w * 0.55), 0.005, Math.sin(a) * (r - w * 0.55)); s.set(w * 0.9, 0.02, 0.05);
      lava.setMatrixAt(j++, m.compose(p, q, s));
    }
    rocks.count = i; lava.count = j;
    craterBody.add(rocks, lava);
    // The hole: painted depth, black at the rim falling to a violet glow far below.
    const pc = document.createElement('canvas'); pc.width = pc.height = 128;
    const pg = pc.getContext('2d');
    const grad = pg.createRadialGradient(64, 58, 4, 64, 64, 64);
    grad.addColorStop(0, '#6b2fd1'); grad.addColorStop(0.18, '#2c0f55'); grad.addColorStop(0.45, '#0b0408');
    grad.addColorStop(0.92, '#040203'); grad.addColorStop(1, 'rgba(4,2,3,0)');
    pg.fillStyle = grad; pg.fillRect(0, 0, 128, 128);
    const pitTex = new THREE.CanvasTexture(pc); pitTex.colorSpace = THREE.SRGBColorSpace;
    const pit = new THREE.Mesh(new THREE.CircleGeometry(1.12, 32), new THREE.MeshBasicMaterial({ map: pitTex, transparent: true }));
    pit.rotation.x = -Math.PI / 2; pit.position.y = 0.003;
    craterBody.add(pit);
  }
  // The crater floor plane in world space, for sinking the runner into it.
  const floorPlane = new THREE.Plane();
  const up = new THREE.Vector3();

  // Embers that burst out of the crater after the runner falls in.
  const NP = 90;
  const sparks = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: 0xffffff }), NP);
  sparks.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  const seeds = Array.from({ length: NP }, () => ({ a: Math.random() * Math.PI * 2, r: 0.4 + Math.random() * 1.6, h: 0.8 + Math.random() * 2.6, s: 0.5 + Math.random(), spin: Math.random() * 6 }));
  const cEmber = new THREE.Color(0xff8a3d), cAsh = new THREE.Color(0x5a524d), cGold = new THREE.Color(0xffc861), tmpC = new THREE.Color();
  for (let i = 0; i < NP; i++) sparks.setColorAt(i, cAsh);
  sparks.visible = false;
  scene.add(sparks);

  // ---------- Dust puffs and the ember trail (time based) ----------
  const NPUFF = 40;
  const puffs = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshLambertMaterial({ color: 0xffffff }), NPUFF);
  puffs.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  const puffState = Array.from({ length: NPUFF }, () => ({ life: 0, max: 1, p: new THREE.Vector3(), v: new THREE.Vector3(), s: 0.1 }));
  for (let i = 0; i < NPUFF; i++) puffs.setColorAt(i, cAsh);
  scene.add(puffs);
  let puffNext = 0;
  const puffAt = new THREE.Vector3();
  function puff(x, y, z, n, { color = cAsh, spread = 1, up = 0.6, size = 0.12, life = 0.7, dir = 0 } = {}) {
    if (small) { n = Math.ceil(n / 2); size *= 0.75; up *= 0.6; }
    for (let k = 0; k < n; k++) {
      const i = puffNext, s = puffState[i]; puffNext = (puffNext + 1) % NPUFF;
      s.life = s.max = life * (0.7 + Math.random() * 0.6);
      s.p.set(x + (Math.random() - 0.5) * 0.3 * spread, y + Math.random() * 0.1, z + (Math.random() - 0.5) * 0.3);
      s.v.set((Math.random() - 0.5) * 1.4 * spread - dir * 1.2, up * (0.4 + Math.random()), (Math.random() - 0.5) * 0.8);
      s.s = size * (0.6 + Math.random() * 0.8);
      puffs.setColorAt(i, color);
    }
    puffs.instanceColor.needsUpdate = true;
  }

  // ---------- Layout helpers ----------
  let vw = innerWidth, vh = innerHeight, ppu = 1;
  function resize() {
    vw = innerWidth; vh = innerHeight;
    renderer.setSize(vw, vh, false);
    camera.aspect = vw / vh;
    camera.updateProjectionMatrix();
    ppu = vh / (2 * DIST * Math.tan(THREE.MathUtils.degToRad(FOV / 2)));
  }
  resize();
  addEventListener('resize', resize);
  const toWorld = (px, py, out = new THREE.Vector3()) => out.set((px - vw / 2) / ppu, (vh / 2 - py) / ppu, 0);

  const slots = $$('[data-slot]').map(el => ({
    el, name: el.dataset.slot, pose: el.dataset.pose || 'idle', face: el.dataset.face || 'front',
    scale: +el.dataset.scale || 0.94, enter: el.dataset.enter || 'edge', pinned: false,
    travel: el.dataset.travel || 'run', mode: el.dataset.move || '', expr: el.dataset.expr || 'neutral',
    sticky: 'sticky' in el.dataset, pin: el.closest('.pv-pin, .pv-tl'), rect: null, hold: [0, 0],
  }));
  // Sizes come from CSS; read every frame (cheap: about a dozen rects).
  // Slots hidden at this screen size (display: none) are skipped.
  const act = [];
  function layout() {
    const y = scrollY;
    act.length = 0;
    for (const s of slots) {
      const r = s.el.getBoundingClientRect();
      s.rect = r;
      if (!r.width || !r.height) continue;
      act.push(s);
      if (s.sticky && s.pin) {
        const pr = s.pin.getBoundingClientRect();
        const top = pr.top + y;
        s.hold = [top - vh * 0.05, top + Math.max(vh * 0.3, pr.height - vh) * (+s.el.dataset.holdEnd || 1)];
        s.pinned = pr.top <= 1 && pr.bottom >= vh - 1;
      } else {
        const c = r.top + y + r.height / 2;
        const span = s.mode === 'hurdle' ? [0.95, 0.15] : [0.66, 0.4];
        s.hold = [c - vh * span[0], c - vh * span[1]];
        s.pinned = false;
      }
    }
  }
  // Feet position and height (world units) for a slot.
  const tmpA = new THREE.Vector3(), tmpB = new THREE.Vector3();
  function anchor(s, out) {
    const r = s.rect;
    toWorld(r.left + r.width / 2, r.bottom, out);
    return Math.max(0.6, (r.height * (s.mode === 'crater' ? 1.25 : s.scale)) / ppu);
  }
  // Where the runner is for a slot at `local` (0–1) through its hold. Travels
  // start at the previous slot's local = 1 and end at the next one's local = 0,
  // so scripted moves (orbit, hurdles) join the travels without a jump.
  let placeAir = 0, placeTh = 0;
  function place(s, local, out) {
    let h = anchor(s, out);
    out.z = 0; placeAir = 0;
    if (s.mode === 'orbit') {
      // Starts in front of the trophy, loops behind it, leaves from its right.
      // On narrow screens the runner is smaller and loops wider and higher, so
      // it circles the trophy instead of covering it.
      const narrow = vw < 700;
      if (narrow) h *= 0.62;
      const th = local * Math.PI * 2.5;
      placeTh = th;
      const R = narrow ? (vw / ppu) * 0.36 : Math.min(h * 1.05, (vw / ppu) * 0.34);
      out.x += Math.sin(th) * R;
      out.y += h * (narrow ? 0.75 : 0.32) + Math.sin(th * 2) * h * 0.06;
      out.z = Math.cos(th) * R * (narrow ? 0.6 : 0.9);
    } else if (s.mode === 'treadmill') {
      // Past events: runs the length of the ledge as the rail moves (left to right, back on the way up).
      const L = s.el.parentElement.getBoundingClientRect();
      out.x = (L.left + L.width * (0.06 + local * 0.84) - vw / 2) / ppu;
    } else if (s.mode === 'hurdle') {
      const r = s.rect;
      out.x = (r.left + r.width * (0.04 + local * 0.92) - vw / 2) / ppu;
      for (let c = 0; c < 4; c++) {
        const d = Math.abs(local - (c + 0.5) / 4), w = 0.085;
        if (d < w) placeAir = Math.max(placeAir, Math.sin(Math.PI * (1 - d / w) / 2));
      }
      out.y += placeAir * h * 0.6;
    }
    return h;
  }

  // ---------- Poses layered over avatar.update ----------
  const P = { armR: 0, armL: 0, armRz: 0, armLz: 0, legR: 0, legL: 0, legRz: 0, legLz: 0, lean: 0 };
  const custom = { ...P };
  let weight = 0, wingOpen = 0, wingShow = 0, t = 0;
  const POSES = {
    point: () => Object.assign(custom, { armR: -1.6, armRz: -0.05, armL: 0.15, armLz: 0.55, legR: -0.12, legL: 0.12, legRz: -0.06, legLz: 0.06, lean: -0.04 }),
    hover: () => Object.assign(custom, { armR: 0.25 + Math.sin(t * 3) * 0.08, armL: 0.25 - Math.sin(t * 3) * 0.08, armRz: -0.55, armLz: 0.55, legR: 0.22 + Math.sin(t * 2.2) * 0.06, legL: 0.1 - Math.sin(t * 2.2) * 0.06, legRz: -0.05, legLz: 0.05, lean: 0.06 }),
    superman: () => Object.assign(custom, { armR: -2.9, armL: -2.9, armRz: 0.12, armLz: -0.12, legR: 0.25, legL: 0.15, legRz: 0, legLz: 0, lean: 1.15 }),
    ride: () => Object.assign(custom, { armR: -0.25 + Math.sin(t * 2) * 0.1, armL: 0.25, armRz: -1.15, armLz: 1.05 + Math.sin(t * 2.3) * 0.1, legR: -0.25, legL: 0.3, legRz: -0.14, legLz: 0.14, lean: 0.06 }),
    jump: () => Object.assign(custom, { armR: -2.7, armL: -2.7, armRz: -0.35, armLz: 0.35, legR: -1.0, legL: -0.55, legRz: 0, legLz: 0, lean: 0.1 }),
    flail: () => Object.assign(custom, { armR: Math.PI + Math.sin(t * 22) * 0.5, armL: Math.PI + Math.cos(t * 19) * 0.5, armRz: -0.55, armLz: 0.55, legR: -1.0 + Math.sin(t * 17) * 0.35, legL: -0.75 - Math.sin(t * 15) * 0.35, legRz: -0.2, legLz: 0.2, lean: -0.35 }),
    hurdle: () => Object.assign(custom, { armR: -1.4, armL: 0.6, armRz: -0.1, armLz: 0.1, legR: -1.35, legL: 0.95, legRz: 0, legLz: 0, lean: 0.3 }),
  };

  // ---------- Director ----------
  // Each frame the slots give a target (where the runner should be). Springs
  // then move the runner there, so every change of course has weight and no
  // move ever jumps. The springs work in page coordinates (screen y + scroll),
  // which keeps the runner locked to a section as it scrolls, and switch to
  // screen coordinates while a pinned stage holds the runner still on screen.
  const pos = new THREE.Vector3(), lastPos = new THREE.Vector3(), tgt = new THREE.Vector3();
  let height = 1, yaw = 0, z = 0, visible = false, held = null, wasTravel = false, lastSide = 0;
  let flyAmt = 0, speedAmt = 0, stillT = 0, trailT = 0, lastAir = 0;
  const motion = { speed: 0, run: false, fly: -1, lookYaw: 0, lookPitch: 0 };
  let pointer = { x: 0.5, y: 0.5 };
  addEventListener('pointermove', e => { pointer = { x: e.clientX / vw, y: e.clientY / vh }; }, { passive: true });

  // Spring state, in px (x on screen, y in page coordinates, h tall) and world units (z).
  const S = { x: 0, y: 0, z: 0, h: 0, vx: 0, vy: 0, vz: 0, vh: 0, init: false, attach: null, scroll: 0, entering: false };
  const SPRING = { xy: [15, 0.8], h: [11, 1], z: [6, 0.82] };
  function spring(dt, key, vkey, target, [w, zeta]) {
    S[vkey] += (w * w * (target - S[key]) - 2 * zeta * w * S[vkey]) * dt;
    S[key] += S[vkey] * dt;
  }
  // Squash and stretch: a damped spring on the body's height/width ratio.
  let squash = 0, squashV = 0, roll = 0, blinkT = 2.5, blinking = 0;
  const kick = v => { squashV += v; };

  onRead(layout);
  function direct(dt) {
    const y = scrollY;
    let i = 0;
    while (i < act.length - 1 && y > act[i + 1].hold[0]) i++;
    const A = act[i], B = act[i + 1];
    if (!A) return { travel: null, A: slots[0], B: null, local: 0 };
    let travel = null, k = 0;
    if (B && y > A.hold[1]) {
      k = clamp((y - A.hold[1]) / Math.max(1, B.hold[0] - A.hold[1]));
      travel = B.travel;
    }
    let local = A.mode === 'crater' ? signals.voidP : clamp((y - A.hold[0]) / Math.max(1, A.hold[1] - A.hold[0]));
    let pose = A.pose, face = A.face, mode = A.mode, far = false, attach = A, tz = 0, h, air = 0;

    if (travel) {
      const hA = place(A, 1, tmpA), hB = place(B, 0, tmpB);
      const dx = tmpB.x - tmpA.x, dy = tmpB.y - tmpA.y;
      // Slots more than a screen apart: stay with the first section while it
      // is on screen, then come in with the next one from the edge it is on.
      far = Math.abs(dy) * ppu > vh * 1.15 && travel !== 'jump';
      if (far) {
        const feet = vh / 2 - tmpA.y * ppu;
        // Switch only once the runner itself (not just its target) is off screen.
        const aOn = ((feet > -hA * ppu * 0.05 && feet - hA * ppu < vh) || (S.attach === A && visible)) && k < 0.98;
        attach = aOn ? A : B;
        if (aOn) { tgt.copy(tmpA); h = hA; tz = tmpA.z; }
        else { tgt.copy(tmpB); h = hB; pose = travel === 'fly' ? 'fly' : 'run'; face = 'front'; }
        mode = aOn ? A.mode : '';
      } else {
        const e = ease(k);
        tgt.lerpVectors(tmpA, tmpB, e);
        h = lerp(hA, hB, e);
        const arc = Math.sin(Math.PI * k);
        if (travel === 'fly') {
          // A swoop: away from the camera first (smaller), then towards it (larger).
          tgt.y += arc * h * 0.45;
          tz = lerp(tmpA.z, tmpB.z, e) + (k < 0.5 ? -3.2 * Math.sin(Math.PI * 2 * k) : 2.4 * Math.sin(Math.PI * 2 * (k - 0.5)));
        } else if (travel === 'jump') {
          tgt.y += arc * h * 0.75; tz = arc * 3.6;
        } else tz = lerp(tmpA.z, tmpB.z, e);
        face = Math.abs(dx) * ppu > 40 && Math.abs(dx) > Math.abs(dy) * 0.5 ? (dx > 0 ? 'side-right' : 'side-left') : 'front';
        pose = travel === 'fly' ? 'fly' : travel === 'jump' ? (k < 0.55 ? 'jump' : 'flail') : 'run';
        mode = '';
      }
    } else {
      h = place(A, local, tgt);
      tz = tgt.z; air = placeAir;
      if (mode === 'orbit') { face = null; pose = 'fly'; yaw = angle(yaw, Math.atan2(Math.cos(placeTh), -Math.sin(placeTh)), 1 - Math.exp(-dt * 10)); }
      if (mode === 'hurdle') { pose = air > 0.15 ? 'hurdle' : 'run'; face = 'side-right'; }
      // On the ledge: face the way it is running, 3/4 so the face shows.
      if (mode === 'treadmill') { if (S.vx < -25) face = 'left'; else if (S.vx > 25) face = 'right'; else face = yaw < 0 ? 'left' : 'right'; }
    }

    // Crater: fall, then sink below the floor plane.
    let sink = 0;
    const inCrater = !travel && mode === 'crater';
    if (inCrater) {
      sink = smooth(0.02, 0.3, local);
      pose = 'flail';
      up.set(0, Math.cos(TILT), Math.sin(TILT));
      floorPlane.setFromNormalAndCoplanarPoint(up, crater.position);
      tgt.copy(crater.position).addScaledVector(up, -sink * h * 1.3);
      tgt.y -= 0.02;
      tz = tgt.z;
      for (const m of mats) m.clippingPlanes = [floorPlane];
    } else for (const m of mats) m.clippingPlanes = null;

    // ----- Springs -----
    const tx = tgt.x * ppu + vw / 2, ty = (vh / 2 - tgt.y * ppu) + y, th = h * ppu;
    const pinned = !travel ? A.pinned : far ? attach.pinned : (A.pinned && B.pinned);
    if (pinned) S.y += y - S.scroll;
    S.scroll = y;
    if (!S.init) { Object.assign(S, { x: tx, y: ty, z: tz, h: th, vx: 0, vy: 0, vz: 0, vh: 0, init: true, attach }); }
    if (attach !== S.attach) {
      // The runner changes section off screen: come in from the horizon (the
      // timeline's vanishing point) or from the screen edge nearest the target.
      const sy = ty - y;
      if (far && attach.enter === 'horizon') {
        // Out of a puff of embers at the vanishing point, growing as it runs at the camera.
        // Desktop: the floor's vanishing point. Phones: inside the runner's band at the top.
        const hx = small ? tx : vw / 2, hy = small ? ty - y - th * 0.45 : vh * 0.47;
        S.x = hx; S.y = hy + y; S.z = -70; S.h = 0; S.vz = 0; S.vh = 0;
        toWorld(hx, hy, tmpB);
        puff(tmpB.x, tmpB.y, -40, 8, { color: cEmber, spread: 4, size: 0.28, up: 2.4, life: 0.8 });
      }
      else if (far) { S.x = tx; S.y = (sy > vh / 2 ? vh + th * 1.08 : -th * 0.08) + y; S.z = -5; S.h = th * 0.9; S.vz = 0; }
      S.vx = S.vy = 0;
      S.entering = far;
      S.attach = attach;
    }
    // Off screen and not making an entrance: no need to fly across the page.
    if (!visible && !S.entering && Math.hypot(tx - S.x, ty - S.y) > vh * 0.6) { S.x = tx; S.y = ty; S.vx = S.vy = 0; }
    const steps = Math.max(1, Math.ceil(dt / (1 / 120))), sdt = dt / steps;
    for (let n = 0; n < steps; n++) {
      spring(sdt, 'x', 'vx', tx, SPRING.xy);
      spring(sdt, 'y', 'vy', ty, SPRING.xy);
      spring(sdt, 'h', 'vh', th, SPRING.h);
      spring(sdt, 'z', 'vz', tz, SPRING.z);
    }
    pos.set((S.x - vw / 2) / ppu, (vh / 2 - (S.y - y)) / ppu, S.z);
    z = S.z;
    h = Math.max(0.3, S.h / ppu);

    // Visibility from where the runner really is.
    const sx = S.x, syy = S.y - y, hp = S.h;
    visible = syy > -hp * 0.2 && syy - hp < vh * 1.15 && sx > -hp && sx < vw + hp;
    if (visible) S.entering = false;
    if (inCrater && local > 0.34) visible = false;

    // Facing.
    if (face) yaw = angle(yaw, YAW[face] ?? 0, 1 - Math.exp(-dt * 9));

    // Motion for avatar.update.
    const vel = pos.distanceTo(lastPos) / Math.max(dt, 0.001);
    lastPos.copy(pos);
    const scrolling = Math.abs(state.vy) > 25;
    stillT = scrolling ? 0 : stillT + dt;
    let wantSpeed = 0, run = false, fly = -1;
    if (pose === 'run') {
      run = true;
      wantSpeed = travel ? 1 : mode === 'treadmill' ? (scrolling ? clamp(0.5 + Math.abs(S.vx) / 500, 0, 1) : 0) : mode === 'hurdle' ? (scrolling ? 1 : 0) : (A.name === 'timeline' ? (stillT < 0.35 ? clamp(0.55 + Math.abs(state.vy) / 900, 0, 1) : 0) : 0);
      if (S.entering || Math.hypot(S.vx, S.vy) > 400) wantSpeed = 1;
    }
    if (pose === 'fly' || pose === 'glide') { fly = pose === 'fly' ? clamp(0.35 + vel / 6, 0, 1) : 0.25; }
    flyAmt += ((fly >= 0 ? 1 : 0) - flyAmt) * Math.min(1, dt * 6);
    speedAmt += (wantSpeed - speedAmt) * Math.min(1, dt * 8);
    motion.speed = speedAmt; motion.run = run; motion.fly = fly;

    // Head: towards the pointer when idle and facing out; towards the
    // active timeline card while running down the timeline.
    let ly = 0, lp = 0;
    if (!travel && (pose === 'idle' || pose === 'wave') && face === 'front') { ly = (pointer.x - 0.5) * 1.6; lp = (pointer.y - 0.45) * 0.8; }
    if (!travel && A.name === 'timeline') ly = signals.tlSide * 0.6;
    if (pose === 'point') lp = 0.12;
    motion.lookYaw = ly; motion.lookPitch = lp;

    // Arrivals land with a squash and a puff of dust; take-offs stretch.
    if (travel && !wasTravel && (travel === 'fly' || travel === 'jump')) kick(5);
    if (travel) wasTravel = true;
    else if (wasTravel) {
      wasTravel = false;
      if (visible && A.mode !== 'crater') { kick(-7); puff(pos.x, pos.y + 0.05, 0.2, 10, { spread: h, size: h * 0.06, up: h * 0.5 }); }
    }
    // Hurdles: stretch on take-off, squash and dust on landing.
    if (mode === 'hurdle' && visible) {
      if (lastAir < 0.05 && air >= 0.05) kick(4);
      if (lastAir >= 0.05 && air < 0.05) { kick(-6); puff(pos.x, pos.y + 0.04, 0.15, 6, { spread: h * 0.8, size: h * 0.05, up: h * 0.35 }); }
    }
    lastAir = air;
    // A skid when the runner changes direction sideways.
    const side = travel && !far ? Math.sign(tmpB.x - tmpA.x) : 0;
    if (side && side !== lastSide && visible && pose === 'run') { kick(-3); puff(pos.x, pos.y + 0.05, 0.2, 8, { spread: h, size: h * 0.06, up: h * 0.4, dir: side }); }
    lastSide = side;
    // Footstep dust while running.
    if (pose === 'run' && visible && speedAmt > 0.5 && Math.random() < dt * (travel ? 14 : 5)) puff(pos.x, pos.y + 0.04, 0.1, 1, { spread: h * 0.5, size: h * 0.045, up: h * 0.25, life: 0.45, dir: side });
    // Ember trail while flying.
    trailT += dt;
    if (flyAmt > 0.5 && visible && trailT > 0.05) { trailT = 0; puff(pos.x, pos.y + h * 0.5, z - 0.2, 1, { color: cEmber, spread: h * 0.3, size: h * 0.035, up: -h * 0.2, life: 0.6 }); }

    // Wings: out from the prizes until the tracks, folded otherwise.
    const winged = ['trophy', 'crew', 'quests'].includes(attach.name) || (travel && !far && ['trophy', 'crew', 'quests'].includes(B?.name)) || (travel && !far && A.name === 'quests');
    wingShow += ((winged ? 1 : 0) - wingShow) * Math.min(1, dt * 5);
    wingOpen += (((fly >= 0 ? 1 : 0.15) * wingShow) - wingOpen) * Math.min(1, dt * 5);

    // Custom pose and expression.
    // Flying sideways: arms out front like a superhero. Flying at the camera
    // or straight up: upright, so the face stays visible.
    const sideways = face === 'side-left' || face === 'side-right';
    const poseName = pose === 'fly' && travel && !far ? (sideways && k > 0.1 && k < 0.85 ? 'superman' : 'hover') : pose === 'fly' && face === 'front' ? 'hover' : pose;
    const poseFn = POSES[poseName];
    for (const key in custom) custom[key] = 0;
    if (poseFn) poseFn();
    weight += ((poseFn ? 1 : 0) - weight) * Math.min(1, dt * 10);
    let ex = 'neutral';
    if (!travel && A.expr) ex = A.expr;
    if (pose === 'flail' || pose === 'jump' && k > 0.35) ex = 'scared';
    if (travel && A.name === 'partners' && k < 0.2) ex = 'smile';
    blinkT -= dt;
    if (blinkT <= 0) { blinking = 0.13; blinkT = 2.4 + Math.random() * 3.6; }
    blinking -= dt;
    setExpr(ex, blinking > 0 && ex !== 'scared');
    if (!travel && pose === 'wave' && !held) av.wave();
    held = travel ? null : A;

    // Squash spring, and a lean into sideways movement.
    squashV += (-200 * squash - 16 * squashV) * dt;
    squash += squashV * dt;
    // Lean into sideways runs; barely when flying, so it never lies over.
    roll += (clamp(-S.vx / 3200, -0.14, 0.14) * (1 - flyAmt * 0.75) - roll) * Math.min(1, dt * 8);

    height = h;
    dbg.slot = attach.name; dbg.travel = travel ? `${A.name}>${B.name}:${travel}` : ''; dbg.far = far; dbg.k = k;
    return { travel, A, B, local };
  }
  const dbg = { slot: '', travel: '', far: false, k: 0 };

  // ---------- Frame ----------
  let lastVis = true, shaken = false;
  const pm = new THREE.Matrix4(), pq = new THREE.Quaternion(), ps = new THREE.Vector3(), pe = new THREE.Euler();
  onFrame(dt => {
    t += dt;
    const { A, B, travel } = direct(dt);

    // Trophy: in the prizes slot while that stage is on screen.
    const ts = slots.find(s => s.name === 'trophy');
    if (ts) {
      const r = ts.rect;
      const near = r.bottom > -vh && r.top < vh * 2;
      if (near) loadTrophy();
      trophy.visible = r.bottom > 0 && r.top < vh;
      if (trophy.visible) {
        toWorld(r.left + r.width / 2, r.bottom, trophy.position);
        const th = (r.height * 0.78) / ppu;
        trophy.scale.setScalar(th);
        trophy.rotation.y = t * 0.6;
        trophy.position.y += Math.sin(t * 1.6) * th * 0.03;
      }
    }
    // Crater and emblem.
    const cs = slots.find(s => s.name === 'crater');
    if (cs) {
      const r = cs.rect;
      crater.visible = r.bottom > 0 && r.top < vh;
      if (crater.visible) {
        toWorld(r.left + r.width / 2, r.top + r.height * 0.55, crater.position);
        const sc = (r.width / ppu) / 3.2;
        crater.scale.setScalar(sc);
        const vp = signals.voidP;
        crater.visible = vp > 0.02 || r.top < vh * 0.8;
        // Already formed as it scrolls in, then opens up a little as the runner lands.
        craterBody.scale.setScalar(0.82 + smooth(0, 0.14, vp) * 0.18);
        emblem(vp, sc);
      } else sparks.visible = false;
    }

    // Runner.
    runner.visible = visible;
    signals.runnerIn = visible; // The footer copy waits until the runner has gone into the crater.
    if (visible) {
      runner.position.set(pos.x, pos.y, z);
      // Squash/stretch keeps the volume roughly constant; a slow breath when idle.
      const s = height / AV_H, q = clamp(squash, -0.28, 0.28);
      const breath = motion.speed < 0.1 && motion.fly < 0 ? Math.sin(t * 2.3) * 0.012 : 0;
      runner.scale.set(s * (1 - q * 0.5), s * (1 + q + breath), s * (1 - q * 0.5));
      runner.rotation.z = roll;
      av.root.rotation.y = yaw;
      av.update(dt, motion);
      // Layer the custom pose over the built-in one.
      if (weight > 0.001) {
        const w = weight;
        av.armR.rotation.x = lerp(av.armR.rotation.x, custom.armR, w);
        av.armL.rotation.x = lerp(av.armL.rotation.x, custom.armL, w);
        av.armR.rotation.z = lerp(av.armR.rotation.z, custom.armRz, w);
        av.armL.rotation.z = lerp(av.armL.rotation.z, custom.armLz, w);
        av.legR.rotation.x = lerp(av.legR.rotation.x, custom.legR, w);
        av.legL.rotation.x = lerp(av.legL.rotation.x, custom.legL, w);
        av.legR.rotation.z = lerp(av.legR.rotation.z, custom.legRz, w);
        av.legL.rotation.z = lerp(av.legL.rotation.z, custom.legLz, w);
        av.body.rotation.x = lerp(av.body.rotation.x, custom.lean, w);
      }
      for (const wg of wings) {
        const s = wg.userData.side;
        wg.visible = wingShow > 0.02;
        wg.scale.setScalar(Math.max(0.001, wingShow));
        // Folded: flat down the back. Open: swept out and back like elytra in flight.
        const flap = flyAmt * Math.sin(t * 8) * 0.18;
        wg.rotation.set(0.1 + wingOpen * 0.55, s * wingOpen * 0.35, s * (0.08 + wingOpen * (0.62 + flap)));
      }
      shadow.visible = !travel && motion.fly < 0 && A.mode !== 'crater';
    }

    // Puffs.
    const m = pm, q = pq, sc = ps;
    let any = false;
    for (let i = 0; i < NPUFF; i++) {
      const s = puffState[i];
      if (s.life > 0) {
        s.life -= dt;
        s.p.addScaledVector(s.v, dt); s.v.multiplyScalar(1 - dt * 2.2);
        const k = Math.max(0, s.life / s.max);
        sc.setScalar(s.s * (0.4 + (1 - k) * 1.2) * Math.min(1, k * 3));
        q.setFromEuler(pe.set(k * 3, k * 2, 0));
        puffs.setMatrixAt(i, m.compose(s.p, q, sc));
        any = true;
      } else if (s.max) { s.max = 0; sc.setScalar(0); puffs.setMatrixAt(i, m.compose(s.p, q, sc)); any = true; }
    }
    puffs.instanceMatrix.needsUpdate = true;
    puffs.visible = any;

    // Shake with the crater's burst (sections.js sets signals.shake).
    const sh = signals.shake;
    if (sh > 0.02) { canvas.style.translate = `${((Math.random() - 0.5) * 10 * sh).toFixed(1)}px ${((Math.random() - 0.5) * 8 * sh).toFixed(1)}px`; shaken = true; }
    else if (shaken) { canvas.style.translate = ''; shaken = false; }
    const draw = visible || trophy.visible || crater.visible || any;
    if (draw || lastVis) renderer.render(scene, camera);
    lastVis = draw;
    return draw;
  });

  // Embers burst out of the crater as the runner disappears, then rise and fade.
  const em = new THREE.Matrix4(), eq = new THREE.Quaternion(), es = new THREE.Vector3(), ep = new THREE.Vector3(), eu = new THREE.Euler();
  function emblem(vp, sc) {
    const burst = smooth(0.26, 0.42, vp), fade = smooth(0.4, 0.62, vp);
    sparks.visible = burst > 0.001 && fade < 0.999;
    if (!sparks.visible) return;
    const c = crater.position;
    for (let i = 0; i < NP; i++) {
      const s = seeds[i];
      const x = Math.cos(s.a) * s.r * burst * (1 + fade * 0.4);
      const y = s.h * 0.6 * burst + 0.15 + fade * s.h * 0.9;
      const zz = Math.sin(s.a) * s.r * 0.5 * burst;
      const size = 0.08 * s.s * (1 - fade);
      eu.set(s.spin * vp * 6, s.spin, 0);
      eq.setFromEuler(eu);
      ep.set(c.x + x * sc, c.y + y * sc, c.z + zz * sc);
      es.setScalar(size * sc);
      sparks.setMatrixAt(i, em.compose(ep, eq, es));
      tmpC.copy(cAsh).lerp(cEmber, Math.min(1, burst * 1.3)).lerp(cGold, fade * 0.6);
      sparks.setColorAt(i, tmpC);
    }
    sparks.instanceMatrix.needsUpdate = true;
    sparks.instanceColor.needsUpdate = true;
  }

  // For checks: the runner's box on screen, and what the director is doing.
  const api = {
    state() {
      return { visible: runner.visible, h: Math.round(height * ppu), x: Math.round(pos.x * ppu + vw / 2), y: Math.round(vh / 2 - pos.y * ppu), z: +z.toFixed(2), slot: dbg.slot, travel: dbg.travel, far: dbg.far, k: +dbg.k.toFixed(3) };
    },
    rect() {
      if (!runner.visible) return null;
      const h = height * ppu, cx = pos.x * ppu + vw / 2, by = vh / 2 - pos.y * ppu;
      return { left: cx - h * 0.3, right: cx + h * 0.3, top: by - h, bottom: by };
    },
  };
  return api;
}
