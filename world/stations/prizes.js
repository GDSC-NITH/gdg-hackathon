// Prizes: 3D Voxel GDG Labyrinth Championship Trophy.
// Local frame: (0, 0) is the centre, +z is the front (faces the path).
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// Enhanced PBR merger with face normals and premium metallic luster
function mergePrizesModel(root) {
  root.updateMatrixWorld(true);
  const byCategory = new Map();

  root.traverse((child) => {
    if (child.isMesh && child.geometry) {
      let geom = child.geometry.clone();
      geom.applyMatrix4(child.matrixWorld);
      if (geom.index) {
        geom = geom.toNonIndexed();
      }
      geom.computeVertexNormals();

      const name = child.material?.name || '';
      let cat = name;
      if (name.includes('gold') || name.includes('Gold')) {
        cat = 'Gold';
      }
      if (!byCategory.has(cat)) byCategory.set(cat, { name, origMat: child.material, geoms: [] });
      byCategory.get(cat).geoms.push(geom);
    }
  });

  const group = new THREE.Group();
  for (const [cat, { name, origMat, geoms }] of byCategory.entries()) {
    const mergedGeom = mergeGeometries(geoms, false);
    if (!mergedGeom) continue;

    let mat;

    if (cat === 'Gold') {
      mat = new THREE.MeshPhysicalMaterial({
        color: 0xf7be16,
        metalness: 0.35,
        roughness: 0.22,
        clearcoat: 0.80,
        clearcoatRoughness: 0.12,
        emissive: new THREE.Color(0xf7be16),
        emissiveIntensity: 0.38,
        side: THREE.DoubleSide,
      });
    } else if (name.includes('Pedestal obsidian')) {
      mat = new THREE.MeshPhysicalMaterial({
        color: 0x181c24,
        metalness: 0.20,
        roughness: 0.12,
        clearcoat: 0.85,
        clearcoatRoughness: 0.10,
        emissive: new THREE.Color(0x181c24),
        emissiveIntensity: 0.35,
        side: THREE.DoubleSide,
      });
    } else if (name.includes('Pedestal dark walnut')) {
      mat = new THREE.MeshStandardMaterial({
        color: 0x382214,
        roughness: 0.45,
        metalness: 0.05,
        emissive: new THREE.Color(0x382214),
        emissiveIntensity: 0.30,
        side: THREE.DoubleSide,
      });
    } else if (name.includes('GDG red')) {
      mat = new THREE.MeshPhysicalMaterial({
        color: 0xea4335,
        metalness: 0.15,
        roughness: 0.16,
        clearcoat: 0.85,
        emissive: new THREE.Color(0xea4335),
        emissiveIntensity: 0.75,
        side: THREE.DoubleSide,
      });
    } else if (name.includes('GDG blue')) {
      mat = new THREE.MeshPhysicalMaterial({
        color: 0x4285f4,
        metalness: 0.15,
        roughness: 0.16,
        clearcoat: 0.85,
        emissive: new THREE.Color(0x4285f4),
        emissiveIntensity: 0.75,
        side: THREE.DoubleSide,
      });
    } else if (name.includes('GDG green')) {
      mat = new THREE.MeshPhysicalMaterial({
        color: 0x34a853,
        metalness: 0.15,
        roughness: 0.16,
        clearcoat: 0.85,
        emissive: new THREE.Color(0x34a853),
        emissiveIntensity: 0.75,
        side: THREE.DoubleSide,
      });
    } else if (name.includes('GDG yellow')) {
      mat = new THREE.MeshPhysicalMaterial({
        color: 0xfbbc05,
        metalness: 0.15,
        roughness: 0.16,
        clearcoat: 0.85,
        emissive: new THREE.Color(0xfbbc05),
        emissiveIntensity: 0.75,
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
  build({ box, solid, light, plane, cornerLights, M }) {
    // Stepped Ceremonial Dais
    box(0, 0, 0, 3.4, 0.2, 2.8, M.deepslate);
    box(0, 0.2, 0, 3.0, 0.15, 2.4, M.travertine);
    box(0, 0.35, 0, 2.6, 0.04, 2.0, M.redVelvet);

    // 4 small ground corner lights with gold glow
    cornerLights(3.4, 2.8, 'gold');

    // Polished gold corner bracket accents on the dais
    box(-1.4, 0.2, -1.1, 0.2, 0.05, 0.2, M.gold);
    box(1.4, 0.2, -1.1, 0.2, 0.05, 0.2, M.gold);
    box(-1.4, 0.2, 1.1, 0.2, 0.05, 0.2, M.gold);
    box(1.4, 0.2, 1.1, 0.2, 0.05, 0.2, M.gold);

    // Front ceremonial gold plaque
    box(0, 0.05, 1.41, 1.4, 0.12, 0.04, M.goldGlow);

    // 3D GLTF Trophy Group
    const group = new THREE.Group();
    plane(group, 0, 0.39, 0);

    const loader = new GLTFLoader();
    loader.load('assets/models/gdg_labyrinth_trophy.glb', (gltf) => {
      const model = gltf.scene;
      model.scale.setScalar(0.68);
      // In the GLB, Z is UP. Rotate around X by -90 deg so Z becomes +Y (UP)
      model.rotation.x = -Math.PI / 2;
      const optimized = mergePrizesModel(model);
      group.add(optimized);
    });

    solid(0, 0, 3.4, 2.8);
    // Warm golden championship lighting
    light(0, 2.2, 1.2, 2.8, 8);
    light(0, 2.2, -1.2, 2.2, 8);
    light(-1.4, 2.0, 0, 2.2, 7);
    light(1.4, 2.0, 0, 2.2, 7);
  },
};
