// Tracks: 3D Voxel GDG Hackathon Challenge Tracks Monument.
// Local frame: (0, 0) is the centre, +z is the front (faces the path).
import * as THREE from 'three';
import { loadModel } from '../models.js';
import { bakeStation } from '../bake.js';

const MODEL_SCALE = 0.42;

export default {
  size: [4.6, 2.8, 4.6],
  build({ solid, light, plane, cornerLights }) {
    cornerLights(4.6, 4.6, 'fire');

    const group = new THREE.Group();
    plane(group, 0, 0, 0);

    loadModel('assets/models/gdg_tracks.glb', (gltf) => {
      const model = gltf.scene;
      model.scale.setScalar(MODEL_SCALE);
      model.rotation.x = -Math.PI / 2;

      const emissiveColor = new THREE.Color(0x17100a);
      model.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
          const mat = Array.isArray(child.material) ? child.material[0] : child.material;
          if (mat) {
            mat.emissive = emissiveColor;
            mat.emissiveIntensity = 0.2;
          }
        }
      });

      const optimized = bakeStation(model);
      group.add(optimized);
    });

    solid(0, 0, 4.6, 4.6);
    light(0, 2.0, -1.5, 2.8, 8, [0, -0.15, 1]);
    light(-1.25, 1.15, 0.5, 2.2, 7);
    light(1.25, 1.15, 0.5, 2.2, 7);
  },
};
