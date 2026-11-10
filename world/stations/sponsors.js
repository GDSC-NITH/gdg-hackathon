// Sponsors: 3D Voxel Green Dollar GDG Topper Monument.
// Local frame: (0, 0) is the centre, +z is the front (faces the path).
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// Enhanced PBR merger with face normals, crystal emerald luster and glowing energy aura
function mergeSponsorsModel(root) {
  root.updateMatrixWorld(true);
  const byMat = new Map();

  root.traverse((child) => {
    if (child.isMesh && child.geometry) {
      let geom = child.geometry.clone();
      geom.applyMatrix4(child.matrixWorld);
      if (geom.index) {
        geom = geom.toNonIndexed();
      }
      geom.computeVertexNormals();

      const origMat = child.material;
      if (!byMat.has(origMat)) byMat.set(origMat, []);
      byMat.get(origMat).push(geom);
    }
  });

  const group = new THREE.Group();
  for (const [origMat, geoms] of byMat.entries()) {
    const mergedGeom = mergeGeometries(geoms, false);
    if (!mergedGeom) continue;

    const c = origMat?.color || new THREE.Color(0xffffff);
    const e = origMat?.emissive || new THREE.Color(0x000000);
    let mat;

    if (e.g > 0.4) {
      // Orbiting holographic energy aura rings
      mat = new THREE.MeshPhysicalMaterial({
        color: 0x58ffaa,
        emissive: new THREE.Color(0x1aff68),
        emissiveIntensity: 1.6,
        metalness: 0.1,
        roughness: 0.15,
        clearcoat: 0.9,
        transparent: true,
        opacity: 0.90,
        side: THREE.DoubleSide,
      });
    } else if (c.g > c.r * 1.3 && c.g > c.b * 1.1) {
      // Deep polished Colombian emerald dollar sign body
      mat = new THREE.MeshPhysicalMaterial({
        color: 0x12d665,
        metalness: 0.28,
        roughness: 0.20,
        clearcoat: 0.85,
        clearcoatRoughness: 0.12,
        emissive: new THREE.Color(0x075020),
        emissiveIntensity: 0.55,
        side: THREE.DoubleSide,
      });
    } else if (c.r > 0.7 && c.g > 0.5 && c.b < 0.3) {
      // Polished gold accents and trim
      mat = new THREE.MeshPhysicalMaterial({
        color: 0xffcd38,
        metalness: 0.40,
        roughness: 0.22,
        clearcoat: 0.80,
        clearcoatRoughness: 0.12,
        emissive: new THREE.Color(0x483204),
        emissiveIntensity: 0.5,
        side: THREE.DoubleSide,
      });
    } else if (c.r < 0.25 && c.g < 0.25 && c.b < 0.25) {
      // Obsidian plinth mount
      mat = new THREE.MeshPhysicalMaterial({
        color: 0x141a18,
        metalness: 0.20,
        roughness: 0.12,
        clearcoat: 0.85,
        clearcoatRoughness: 0.10,
        emissive: new THREE.Color(0x040806),
        side: THREE.DoubleSide,
      });
    } else if (c.b > c.r * 1.5 && c.b > c.g * 1.2) {
      // GDG Blue
      mat = new THREE.MeshPhysicalMaterial({
        color: 0x4285f4,
        metalness: 0.15,
        roughness: 0.15,
        clearcoat: 0.85,
        emissive: new THREE.Color(0x061840),
        emissiveIntensity: 0.5,
        side: THREE.DoubleSide,
      });
    } else if (c.r > c.g * 1.5 && c.r > c.b * 1.5) {
      // GDG Red
      mat = new THREE.MeshPhysicalMaterial({
        color: 0xea4335,
        metalness: 0.15,
        roughness: 0.15,
        clearcoat: 0.85,
        emissive: new THREE.Color(0x3a0805),
        emissiveIntensity: 0.5,
        side: THREE.DoubleSide,
      });
    } else if (c.r > 0.7 && c.g > 0.6 && c.b < 0.3) {
      // GDG Yellow
      mat = new THREE.MeshPhysicalMaterial({
        color: 0xfbbc05,
        metalness: 0.15,
        roughness: 0.15,
        clearcoat: 0.85,
        emissive: new THREE.Color(0x3a2800),
        emissiveIntensity: 0.5,
        side: THREE.DoubleSide,
      });
    } else {
      mat = origMat.clone();
      mat.side = THREE.DoubleSide;
    }

    const mesh = new THREE.Mesh(mergedGeom, mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
  }
  return group;
}

export default {
  size: [3.4, 4.0, 3.4],
  build({ box, solid, light, plane, M }) {
    // Stepped Ceremonial Travertine & Emerald Dais
    box(0, 0, 0, 3.4, 0.2, 2.6, M.travertine);
    box(0, 0.2, 0, 3.0, 0.15, 2.2, M.deepslate);
    box(0, 0.35, 0, 2.6, 0.04, 1.8, M.emerald);

    // Polished gold corner bracket accents on the dais
    box(-1.4, 0.2, -1.0, 0.2, 0.05, 0.2, M.gold);
    box(1.4, 0.2, -1.0, 0.2, 0.05, 0.2, M.gold);
    box(-1.4, 0.2, 1.0, 0.2, 0.05, 0.2, M.gold);
    box(1.4, 0.2, 1.0, 0.2, 0.05, 0.2, M.gold);

    // Front ceremonial gold plaque
    box(0, 0.05, 1.31, 1.4, 0.12, 0.04, M.goldGlow);

    // 3D GLTF Dollar Topper Group
    const group = new THREE.Group();
    plane(group, 0, 0.39, 0);

    const loader = new GLTFLoader();
    loader.load('assets/models/gdg_green_dollar_gdg_topper.glb', (gltf) => {
      const model = gltf.scene;
      model.scale.setScalar(0.55);
      // Y is already UP in this model
      const optimized = mergeSponsorsModel(model);
      group.add(optimized);
    });

    solid(0, 0, 3.4, 2.6);
    // Vibrant emerald and gold lighting
    light(0, 2.2, 1.2, 2.6, 8);
    light(0, 2.2, -1.2, 2.2, 8);
    light(-1.5, 2.2, 0, 2.2, 7);
    light(1.5, 2.2, 0, 2.2, 7);
  },
};
