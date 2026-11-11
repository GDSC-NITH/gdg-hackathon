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

function attendantModel(root) {
  root.updateMatrixWorld(true);
  const byMaterial = new Map();
  const shirtMaterials = new Set();
  root.traverse(child => {
    if (!child.isMesh || !child.geometry || !child.name.startsWith('TeammateWhite_')) return;
    const part = child.name.slice('TeammateWhite_'.length).toLowerCase();
    if (!/^(seat|back|chairleg|torso|neck|head|hair|hairback|fringe|eye|arm|hand|thigh|shoe|badge[0-3])$/.test(part)) return;
    if (/torso|arm/.test(part)) shirtMaterials.add(child.material);
    const geometry = child.geometry.clone();
    geometry.applyMatrix4(child.matrixWorld);
    geometry.applyMatrix4(moveAttendantPart(child.name));
    if (/^(seat|back|chairleg)$/.test(part)) {
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
  });

  const group = new THREE.Group();
  for (const [material, geometries] of byMaterial) {
    const geometry = mergeGeometries(geometries, false);
    if (!geometry) continue;
    const materialCopy = material.clone();
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

    // Keep the visitor lane open while blocking the counter, rear posts and side posts.
    solid(0, 1.25, 2.5, 0.9, 0, 1.1);
    solid(-2.35, 0, 0.35, 3.9);
    solid(2.35, 0, 0.35, 3.9);
    solid(0, -1.85, 4.7, 0.35, 0, 2.8);

    // Warm lantern illumination, with separate sources for the counter and sign.
    light(-1.35, 2.35, 0, 2.4, 7, [0, -1, 0]);
    light(1.35, 2.35, 0, 2.4, 7, [0, -1, 0]);
    light(0, 2.55, -1.55, 2.2, 7, [0, 0, 1]);
  },
};
