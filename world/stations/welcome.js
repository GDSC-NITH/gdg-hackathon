// Welcome pavilion: a GDG reception kiosk with a quest log and lanterns.
// Local frame: (0, 0) is the centre, +z is the front (faces the path).
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

function mergeWelcomeModel(root) {
  root.updateMatrixWorld(true);
  const byMaterial = new Map();
  root.traverse(child => {
    if (!child.isMesh || !child.geometry) return;
    let geometry = child.geometry.clone();
    geometry.applyMatrix4(child.matrixWorld);
    if (geometry.index) geometry = geometry.toNonIndexed();
    geometry.computeVertexNormals();
    const material = child.material;
    if (!byMaterial.has(material)) byMaterial.set(material, []);
    byMaterial.get(material).push(geometry);
  });

  const merged = new THREE.Group();
  for (const [material, geometries] of byMaterial) {
    const geometry = mergeGeometries(geometries, false);
    if (!geometry) continue;
    material.side = THREE.DoubleSide;
    material.roughness = 0.8;
    material.metalness = 0.05;
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    merged.add(mesh);
  }
  return merged;
}

export default {
  size: [5.6, 3.2, 4.4],
  build({ solid, light, plane, cornerLights }) {
    cornerLights(5.6, 4.4, 'warm');

    const pavilion = new THREE.Group();
    plane(pavilion, 0, 0, 0);
    const loader = new GLTFLoader();
    loader.load('assets/models/gdg_welcome.glb', gltf => {
      pavilion.add(mergeWelcomeModel(gltf.scene));
    }, undefined, error => console.error('Welcome pavilion model failed to load:', error));

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
