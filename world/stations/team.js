// Team: 3D Voxel GDG Hackathon Team Meeting.
// Local frame: (0, 0) is the centre, +z is the front (faces the path).
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

function makeTransform(px, py, pz, tx, ty, tz, rotY) {
  return new THREE.Matrix4()
    .makeTranslation(tx, ty, tz)
    .multiply(new THREE.Matrix4().makeRotationY(rotY))
    .multiply(new THREE.Matrix4().makeTranslation(-px, -py, -pz));
}

// Reorient and position team members, laptops, and table props:
// - Two teammates on North side (Blue & Purple) facing South into table.
// - One teammate on South side (White) facing North into table.
// - One empty seat on South side facing North with seat cushion glow.
// - All laptops correctly oriented: keyboard under person's hands, screen tilted facing their eyes.
// - Props (notebook, mug, sticky notes) neatly placed in front of the empty seat.
function mergeTeamModel(root) {
  root.updateMatrixWorld(true);
  const byMat = new Map();

  root.traverse((child) => {
    if (child.isMesh && child.geometry) {
      let geom = child.geometry.clone();
      geom.applyMatrix4(child.matrixWorld);

      const name = child.name;
      let m = null;

      if (name.startsWith('TeammateBlue')) {
        m = makeTransform(-1.45, 0, -1.83, -1.15, 0, -1.83, 0);
      } else if (name.startsWith('TeammatePurple')) {
        m = makeTransform(1.45, 0, -1.83, 1.15, 0, -1.83, 0);
      } else if (name.startsWith('TeammateWhite')) {
        m = makeTransform(0, 0, -1.83, -1.15, 0, 1.83, Math.PI);
      } else if (name.startsWith('EmptySeat') || name === 'SeatGlow') {
        m = makeTransform(3.05, 0, 0, 1.15, 0, 1.83, Math.PI / 2);
      } else if (name.startsWith('LaptopBase0') || name.startsWith('LaptopScreen0') || name.startsWith('LaptopDisplay0')) {
        m = makeTransform(-1.45, 1.88, -0.65, -1.15, 1.88, -0.65, Math.PI);
      } else if (name.startsWith('LaptopBase2') || name.startsWith('LaptopScreen2') || name.startsWith('LaptopDisplay2')) {
        m = makeTransform(1.45, 1.88, -0.65, 1.15, 1.88, -0.65, Math.PI);
      } else if (name.startsWith('LaptopBase1') || name.startsWith('LaptopScreen1') || name.startsWith('LaptopDisplay1')) {
        m = makeTransform(0, 1.88, -0.65, -1.15, 1.88, 0.65, 0);
      } else if (name.startsWith('Notebook')) {
        m = makeTransform(0, 1.87, 0.30, 1.15, 1.87, 0.65, 0);
      } else if (name.startsWith('Mug')) {
        m = makeTransform(0.98, 1.90, 0.45, 1.65, 1.90, 0.65, 0);
      } else if (name.startsWith('StickyRight')) {
        m = makeTransform(0.75, 1.86, 0.45, 1.15, 1.86, 0.95, 0);
      }

      if (m) {
        geom.applyMatrix4(m);
      }

      if (geom.index) {
        geom = geom.toNonIndexed();
      }
      geom.computeVertexNormals();

      const mat = child.material;
      if (!byMat.has(mat)) byMat.set(mat, []);
      byMat.get(mat).push(geom);
    }
  });

  const mergedGroup = new THREE.Group();
  for (const [mat, geoms] of byMat.entries()) {
    const mergedGeom = mergeGeometries(geoms, false);
    if (mergedGeom) {
      mat.side = THREE.DoubleSide;
      mat.roughness = 0.32;
      mat.metalness = 0.15;
      const mesh = new THREE.Mesh(mergedGeom, mat);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mergedGroup.add(mesh);
    }
  }

  mergedGroup.scale.setScalar(0.70);
  return mergedGroup;
}

export default {
  size: [5.8, 3.2, 4.2],
  build({ box, solid, light, plane, M }) {
    // Stepped Ceremonial Deepslate & Stone Dais
    box(0, 0, 0, 5.8, 0.2, 4.1, M.deepslate);
    box(0, 0.2, 0, 5.5, 0.15, 3.8, M.stone);

    // 3D GLTF Team Meeting Group
    const group = new THREE.Group();
    plane(group, 0, 0.35, 0);

    const loader = new GLTFLoader();
    loader.load('assets/models/gdg_hackathon_team_meeting.glb', (gltf) => {
      const model = gltf.scene;
      const optimized = mergeTeamModel(model);
      group.add(optimized);
    });

    solid(0, 0, 5.5, 3.8);
    light(0, 2.0, 1.8, 2.2, 9);
    light(0, 2.0, -1.8, 2.2, 9);
    light(-2.4, 2.2, 0, 2.0, 8);
    light(2.4, 2.2, 0, 2.0, 8);
  },
};
