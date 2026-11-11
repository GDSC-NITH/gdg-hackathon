import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const MODEL_URL = new URL('../../assets/models/gdg_tracks%20(2).glb', import.meta.url).href;
const MODEL_SCALE = 0.42;
const modelMaterial = new THREE.MeshStandardMaterial({
  color: 0xffffff,
  vertexColors: true,
  metalness: 0.1,
  roughness: 0.48,
  emissive: 0x17100a,
  emissiveIntensity: 0.2,
});

function mergeTracksModel(root) {
  root.updateMatrixWorld(true);
  const geometries = [];

  root.traverse((child) => {
    if (!child.isMesh || !child.geometry) return;

    const sourceMaterial = Array.isArray(child.material) ? child.material[0] : child.material;
    const tint = sourceMaterial?.color || new THREE.Color(1, 1, 1);
    let geometry = child.geometry.clone();
    geometry.applyMatrix4(child.matrixWorld);
    if (geometry.index) geometry = geometry.toNonIndexed();

    for (const attribute of Object.keys(geometry.attributes)) {
      if (attribute !== 'position' && attribute !== 'normal') geometry.deleteAttribute(attribute);
    }
    if (!geometry.attributes.normal) geometry.computeVertexNormals();

    const positions = geometry.attributes.position;
    const colors = new Float32Array(positions.count * 3);
    for (let i = 0; i < positions.count; i++) {
      colors[i * 3] = tint.r;
      colors[i * 3 + 1] = tint.g;
      colors[i * 3 + 2] = tint.b;
    }
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometries.push(geometry);
  });

  const geometry = mergeGeometries(geometries, false);
  for (const source of geometries) source.dispose();
  if (!geometry) {
    console.error(`Unable to merge the tracks model geometry at ${MODEL_URL}`);
    return new THREE.Group();
  }

  const mesh = new THREE.Mesh(geometry, modelMaterial);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

export default {
  size: [4.6, 2.8, 4.6],
  build({ solid, light, plane }) {
    const group = new THREE.Group();
    plane(group, 0, 0, 0);

    const loader = new GLTFLoader();
    loader.load(MODEL_URL, (gltf) => {
      const model = gltf.scene;
      model.scale.setScalar(MODEL_SCALE);
      model.rotation.x = -Math.PI / 2;
      group.add(mergeTracksModel(model));
    }, undefined, (error) => {
      console.error(`Failed to load tracks model at ${MODEL_URL}`, error);
    });

    solid(0, 0, 4.6, 4.6);
    light(0, 2.0, -1.5, 2.8, 8, [0, -0.15, 1]);
    light(-1.25, 1.15, 0.5, 2.2, 7);
    light(1.25, 1.15, 0.5, 2.2, 7);
  },
};
