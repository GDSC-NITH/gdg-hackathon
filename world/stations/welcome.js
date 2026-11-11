// Welcome pavilion: a GDG reception kiosk with a quest log and lanterns.
// Local frame: (0, 0) is the centre, +z is the front (faces the path).
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { canvasTexture } from '@engine/world/textures.js';
import { pixelText, textWidth } from '@engine/world/pixel-text.js';

function moveAttendantPart(name) {
  const sourceZ = -1.83;
  const targetZ = -0.58;
  return new THREE.Matrix4()
    .makeTranslation(0, 0, targetZ)
    .multiply(new THREE.Matrix4().makeTranslation(0, 0, -sourceZ));
}

function createGdgLogoMeshes() {
  const pixelSize = 0.048;
  const depth = 0.018;
  const zPos = -0.446; // Front of torso (-0.46) + 0.014

  // 8 cols x 6 rows pattern from me.png
  // Left bracket < (Red top, Blue bottom)
  // Right bracket > (Green top, Yellow bottom)
  const xOffset = -3.5 * pixelSize; // Center horizontally
  const yBase = 2.22;

  const redBoxes = [];
  const blueBoxes = [];
  const greenBoxes = [];
  const yellowBoxes = [];

  const addPixel = (col, row, list) => {
    const x = xOffset + col * pixelSize;
    const y = yBase - row * pixelSize;
    const geom = new THREE.BoxGeometry(pixelSize * 0.95, pixelSize * 0.95, depth);
    geom.applyMatrix4(new THREE.Matrix4().makeTranslation(x, y, zPos));
    list.push(geom);
  };

  // Left bracket <
  addPixel(2, 0, redBoxes);
  addPixel(1, 1, redBoxes);
  addPixel(2, 1, redBoxes);
  addPixel(0, 2, redBoxes);
  addPixel(1, 2, redBoxes);

  addPixel(0, 3, blueBoxes);
  addPixel(1, 3, blueBoxes);
  addPixel(1, 4, blueBoxes);
  addPixel(2, 4, blueBoxes);
  addPixel(2, 5, blueBoxes);

  // Right bracket >
  addPixel(5, 0, greenBoxes);
  addPixel(5, 1, greenBoxes);
  addPixel(6, 1, greenBoxes);
  addPixel(6, 2, greenBoxes);
  addPixel(7, 2, greenBoxes);

  addPixel(6, 3, yellowBoxes);
  addPixel(7, 3, yellowBoxes);
  addPixel(5, 4, yellowBoxes);
  addPixel(6, 4, yellowBoxes);
  addPixel(5, 5, yellowBoxes);

  const group = new THREE.Group();

  const makeMesh = (boxes, color, emissive) => {
    const merged = mergeGeometries(boxes, false);
    if (!merged) return;
    const mat = new THREE.MeshPhysicalMaterial({
      color,
      emissive,
      emissiveIntensity: 0.55,
      roughness: 0.2,
      metalness: 0.1,
      clearcoat: 0.9,
    });
    const mesh = new THREE.Mesh(merged, mat);
    mesh.castShadow = true;
    group.add(mesh);
  };

  makeMesh(redBoxes, 0xea4335, 0xd93025);
  makeMesh(blueBoxes, 0x4285f4, 0x1a73e8);
  makeMesh(greenBoxes, 0x34a853, 0x1e8e3e);
  makeMesh(yellowBoxes, 0xfbbc05, 0xf9ab00);

  return group;
}

function createAttendantFaceMeshes() {
  const depth = 0.018;
  const zPos = -0.418; // Front of head (-0.425) + 0.007

  const whiteBoxes = [];
  const pupilBoxes = [];
  const browBoxes = [];
  const mouthBoxes = [];
  const blushBoxes = [];

  const addBox = (list, cx, cy, w, h, d = depth) => {
    const geom = new THREE.BoxGeometry(w, h, d);
    geom.applyMatrix4(new THREE.Matrix4().makeTranslation(cx, cy, zPos));
    list.push(geom);
  };

  // 1. Two Symmetrical Minecraft Eyes (Left and Right)
  // Eye height Y: [2.87, 2.97], centered at 2.92
  // White sclera
  addBox(whiteBoxes, -0.155, 2.92, 0.065, 0.09); // Left eye outer
  addBox(whiteBoxes, 0.155, 2.92, 0.065, 0.09);  // Right eye outer

  // Pupils (Inner)
  addBox(pupilBoxes, -0.095, 2.915, 0.055, 0.08); // Left eye inner pupil
  addBox(pupilBoxes, 0.095, 2.915, 0.055, 0.08);  // Right eye inner pupil

  // Tiny catchlight glint in each pupil
  const glintZ = zPos + 0.004;
  const addGlint = (cx, cy) => {
    const geom = new THREE.BoxGeometry(0.02, 0.025, depth * 0.5);
    geom.applyMatrix4(new THREE.Matrix4().makeTranslation(cx, cy, glintZ));
    whiteBoxes.push(geom);
  };
  addGlint(-0.11, 2.935);
  addGlint(0.08, 2.935);

  // 2. Eyebrows
  addBox(browBoxes, -0.125, 2.99, 0.12, 0.035);
  addBox(browBoxes, 0.125, 2.99, 0.12, 0.035);

  // 3. Cheerful smile mouth
  addBox(mouthBoxes, 0, 2.72, 0.13, 0.038);
  addBox(mouthBoxes, -0.07, 2.74, 0.03, 0.035);
  addBox(mouthBoxes, 0.07, 2.74, 0.03, 0.035);

  // 4. Subtle rosy blush
  addBox(blushBoxes, -0.175, 2.79, 0.07, 0.045);
  addBox(blushBoxes, 0.175, 2.79, 0.07, 0.045);

  const group = new THREE.Group();

  const makeMesh = (boxes, color, emissive = 0x000000, emissiveIntensity = 0) => {
    const merged = mergeGeometries(boxes, false);
    if (!merged) return;
    const mat = new THREE.MeshPhysicalMaterial({
      color,
      emissive,
      emissiveIntensity,
      roughness: 0.3,
      metalness: 0.05,
    });
    const mesh = new THREE.Mesh(merged, mat);
    mesh.castShadow = true;
    group.add(mesh);
  };

  makeMesh(whiteBoxes, 0xf8f9fa, 0xefefef, 0.15);
  makeMesh(pupilBoxes, 0x1a1e24, 0x0a0c0e, 0.1);
  makeMesh(browBoxes, 0x3d2516);
  makeMesh(mouthBoxes, 0xa3443b, 0x822e26, 0.15);
  makeMesh(blushBoxes, 0xdf8478, 0xcd6f63, 0.12);

  return group;
}

function flipWinding(geometry) {
  if (geometry.index) {
    const indices = geometry.index.array;
    for (let i = 0; i < indices.length; i += 3) {
      const tmp = indices[i];
      indices[i] = indices[i + 1];
      indices[i + 1] = tmp;
    }
    geometry.index.needsUpdate = true;
  }
}

function attendantModel(root) {
  root.updateMatrixWorld(true);
  const byMaterial = new Map();
  const shirtMaterials = new Set();
  root.traverse(child => {
    if (!child.isMesh || !child.geometry || !child.name.startsWith('TeammateWhite_')) return;
    const part = child.name.slice('TeammateWhite_'.length).toLowerCase();
    // Exclude old broken eye and misaligned badges; include both arms, hands, legs, and all chair legs
    if (!/^(seat|back|chairleg(?:_\d+)?|torso|neck|head|hair|hairback|fringe|arm(?:_\d+)?|hand(?:_\d+)?|thigh(?:_\d+)?|shoe(?:_\d+)?)$/.test(part)) return;
    if (/torso|arm/.test(part)) shirtMaterials.add(child.material);
    const geometry = child.geometry.clone();
    geometry.applyMatrix4(child.matrixWorld);
    geometry.applyMatrix4(moveAttendantPart(child.name));
    if (/^(seat|back|chairleg(?:_\d+)?)$/.test(part)) {
      geometry.computeBoundingBox();
      const center = geometry.boundingBox.getCenter(new THREE.Vector3());
      geometry.applyMatrix4(
        new THREE.Matrix4()
          .makeTranslation(center.x, center.y, center.z)
          .multiply(new THREE.Matrix4().makeScale(0.65, 0.82, 0.65))
          .multiply(new THREE.Matrix4().makeTranslation(-center.x, -center.y, -center.z)),
      );
    }
    if (!byMaterial.has(child.material)) byMaterial.set(child.material, []);
    byMaterial.get(child.material).push(geometry);

    // The GLTF exported orphan meshes without node references for the other arm, hand, and leg.
    // Mirror symmetrical parts across X to ensure both arms, both hands, and both legs are rendered.
    if (/^(arm|hand|thigh|shoe)$/.test(part)) {
      const mirrored = geometry.clone();
      mirrored.applyMatrix4(new THREE.Matrix4().makeScale(-1, 1, 1));
      flipWinding(mirrored);
      byMaterial.get(child.material).push(mirrored);
    }

    if (/^chairleg$/.test(part)) {
      // Mirror chair leg to all 4 corners of the chair
      geometry.computeBoundingBox();
      const zOffset = 0.44; // Front-to-back leg spacing
      for (const [sx, dz] of [[-1, 0], [1, -zOffset], [-1, -zOffset]]) {
        const leg = geometry.clone();
        leg.applyMatrix4(
          new THREE.Matrix4()
            .makeTranslation(0, 0, dz)
            .multiply(new THREE.Matrix4().makeScale(sx, 1, 1)),
        );
        if (sx < 0) flipWinding(leg);
        byMaterial.get(child.material).push(leg);
      }
    }
  });

  const group = new THREE.Group();
  for (const [material, geometries] of byMaterial) {
    const geometry = mergeGeometries(geometries, false);
    if (!geometry) continue;
    const materialCopy = material.clone();
    materialCopy.side = THREE.DoubleSide;
    if (shirtMaterials.has(material)) {
      materialCopy.color.setHex(0x17191d);
      materialCopy.emissive?.setHex(0x050505);
      materialCopy.emissiveIntensity = 0.12;
    }
    const mesh = new THREE.Mesh(geometry, materialCopy);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
  }

  // Add sharp, authentic Minecraft voxel face and GDG logo
  group.add(createAttendantFaceMeshes());
  group.add(createGdgLogoMeshes());

  group.scale.setScalar(0.7);
  group.position.set(0, 0.05, -0.18);
  return group;
}

function welcomeSign(label = 'WELCOME', width = 2.7, height = 0.68) {
  const texture = canvasTexture(256, 64, (ctx, w, h) => {
    ctx.fillStyle = '#4b2b18';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#8a552d';
    ctx.fillRect(5, 5, w - 10, h - 10);
    const text = label;
    const scale = label.length > 8 ? 3 : 4;
    pixelText(ctx, text, Math.round((w - textWidth(text, scale)) / 2), 14, scale, '#fff1c7');
  });
  const material = new THREE.MeshBasicMaterial({ map: texture });
  return new THREE.Mesh(new THREE.PlaneGeometry(width, height), material);
}

export default {
  size: [6.4, 3.2, 4.4],
  build({ box, solid, light, plane, cornerLights, M }) {
    cornerLights(5.6, 4.4, 'warm');
    const loader = new GLTFLoader();
    const attendant = new THREE.Group();
    plane(attendant, 0, 0, 0);
    loader.load('assets/models/gdg_hackathon_team_meeting.glb', gltf => {
      attendant.add(attendantModel(gltf.scene));
    }, undefined, error => console.error('Welcome attendant model failed to load:', error));
    // Broad timber canopy and four tall posts.
    for (const x of [-2.25, 2.25]) for (const z of [-1.45, 1.45]) {
      box(x, 0, z, 0.34, 2.8, 0.34, M.log);
    }
    box(0, 2.65, 0, 5.25, 0.22, 3.5, M.oak);
    box(0, 2.82, 0, 5.05, 0.16, 3.25, M.wood);
    box(0, 2.98, 0, 4.75, 0.12, 3.0, M.oak);
    box(0, 2.48, 1.58, 5.1, 0.2, 0.22, M.wood);
    box(0, 2.42, -1.52, 4.65, 0.14, 0.18, M.wood);

    // Back wall: sturdy timber paneling with oak framing and a display shelf.
    box(0, 0, -1.45, 4.10, 0.35, 0.24, M.log);
    box(0, 0.35, -1.45, 4.10, 2.05, 0.20, M.wood);
    box(0, 2.38, -1.45, 4.10, 0.16, 0.22, M.oak);
    for (const px of [-1.98, -0.72, 0.72, 1.98]) {
      box(px, 0.35, -1.34, 0.14, 2.03, 0.04, M.oak);
    }
    // Decorative back shelf with books, scrolls, and an event plaque behind the attendant.
    box(0, 1.32, -1.32, 1.32, 0.06, 0.20, M.oak);
    box(-0.52, 1.16, -1.33, 0.06, 0.16, 0.14, M.blackMetal);
    box(0.52, 1.16, -1.33, 0.06, 0.16, 0.14, M.blackMetal);
    box(-0.35, 1.38, -1.32, 0.38, 0.32, 0.14, M.books);
    box(0.08, 1.38, -1.32, 0.26, 0.14, 0.13, M.paper);
    box(0.42, 1.38, -1.32, 0.12, 0.22, 0.11, M.gold);
    box(0, 1.88, -1.33, 1.16, 0.36, 0.04, M.blackMetal);
    box(0, 1.90, -1.32, 1.08, 0.30, 0.03, M.paint(0x1a73e8));

    // Raised reception counter with a deep front apron.
    box(0, 0.42, 0.62, 2.85, 0.72, 0.62, M.oak);
    box(0, 0.22, 0.97, 3.72, 0.25, 0.16, M.wood);
    box(1.05, 1.23, 0.12, 0.18, 0.14, 0.18, M.blackMetal);
    // box(1.05, 1.37, 0.12, 0.04, 0.18, 0.04, M.paper);
    box(0.82, 1.2, 0.36, 0.7, 0.05, 0.5, M.blackMetal);
    box(0.82, 1.25, 0.36, 0.58, 0.03, 0.38, M.beaconGlow);
    box(1.42, 1.22, 0.48, 0.32, 0.08, 0.22, M.redVelvet);
    box(1.42, 1.3, 0.48, 0.32, 0.08, 0.22, M.paper);

    // Small counter plaque, facing visitors without blocking the attendant.
    box(0, 0.72, 0.97, 2.2, 0.42, 0.08, M.blackMetal);
    plane(welcomeSign('WELCOME', 2.02, 0.34), 0, 0.72, 1.02);

    // Hanging lanterns and leafy canopy accents from the reference.
    for (const x of [-2.05, 2.05]) {
      box(x, 2.23, 0.12, 0.06, 0.38, 0.06, M.blackMetal);
      box(x, 1.94, 0.12, 0.42, 0.38, 0.42, M.blackMetal);
      box(x, 1.98, 0.12, 0.28, 0.28, 0.28, M.lanternGlow);
      box(x + (x < 0 ? 0.22 : -0.22), 2.55, -0.95, 0.42, 0.34, 0.22, M.paint(0x4d8c32));
      box(x + (x < 0 ? 0.34 : -0.34), 2.34, -0.82, 0.28, 0.26, 0.2, M.paint(0x6da843));
    }

    // A freestanding information board beside the reception desk.
    box(2.82, 0.12, 0.15, 0.18, 0.24, 0.18, M.gold);
    box(2.82, 0.3, 0.15, 0.12, 1.9, 0.12, M.log);
    box(2.82, 1.15, 0.15, 0.72, 1.38, 0.12, M.blackMetal);
    plane(welcomeSign('WELCOME', 0.58, 0.98), 2.82, 1.15, 0.22, Math.PI / 2);
    solid(2.82, 0.15, 0.8, 0.22, 0, 2.0);

    // Red carpet and gold edging leading to the counter.
    box(0, 0.02, 2.18, 2.8, 0.04, 1.5, M.redVelvet);
    box(0, 0.01, 2.98, 3.1, 0.03, 0.42, M.redVelvet);
    box(-1.65, 0.02, 2.18, 0.14, 0.08, 1.7, M.gold);
    box(1.65, 0.02, 2.18, 0.14, 0.08, 1.7, M.gold);
    box(-1.88, 0.02, 2.98, 0.14, 0.08, 0.6, M.gold);
    box(1.88, 0.02, 2.98, 0.14, 0.08, 0.6, M.gold);

    // Low square planters framing the entrance.
    for (const x of [-1.82, 1.82]) {
      box(x, 0, 1.92, 0.92, 0.16, 0.92, M.gold);
      box(x, 0.16, 1.92, 0.72, 0.48, 0.72, M.paint(0x3f7a2d));
      box(x, 0.64, 1.92, 0.82, 0.12, 0.82, M.paint(0x5b9638));
    }

    // Hanging lanterns beneath the roof.
    for (const x of [-1.35, 1.35]) {
      box(x, 2.18, 0, 0.05, 0.38, 0.05, M.steel);
      box(x, 1.94, 0, 0.28, 0.28, 0.28, M.blackMetal);
      box(x, 1.96, 0, 0.18, 0.18, 0.18, M.lanternGlow);
    }

    // Solid collision: blocks the counter, back wall and side posts, keeping the visitor walkway completely clear.
    solid(0, 0.62, 2.85, 0.62, 0, 1.15);
    solid(0, -1.45, 4.4, 0.35, 0, 2.8);
    solid(-2.25, 0, 0.35, 3.1);
    solid(2.25, 0, 0.35, 3.1);

    // Warm lantern illumination, with separate sources for the counter, sign and back wall.
    light(-1.35, 2.35, 0, 2.4, 7, [0, -1, 0]);
    light(1.35, 2.35, 0, 2.4, 7, [0, -1, 0]);
    light(0, 2.55, -1.55, 2.2, 7, [0, 0, 1]);
    light(0, 2.1, -1.3, 1.8, 5, [0, -1, 1]);
  },
};
