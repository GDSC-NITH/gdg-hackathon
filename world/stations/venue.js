// Venue: 3D Voxel GDG Labyrinth Venue Pavilion Building.
// Local frame: (0, 0) is the centre, +z is the front (faces the path).
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// Color palette mapping to ensure clean, high-contrast, premium architectural visuals
// that look stunning from top-down aerial and eye-level, and never turn into a black shadow.
function getElementColor(name, origColor, origMat) {
  const n = name.toLowerCase();

  // Official Google GDG Brand Colors
  if (n.includes('gdg_red') || (n.includes('banner_logo') && (n.endsWith('1') || n.endsWith('5')))) {
    return [0.92, 0.26, 0.21, 1.4]; // Red (#ea4335)
  }
  if (n.includes('gdg_blue') || (n.includes('banner_logo') && (n.endsWith('0') || n.endsWith('4')))) {
    return [0.26, 0.52, 0.96, 1.4]; // Blue (#4285f4)
  }
  if (n.includes('gdg_green') || (n.includes('banner_logo') && (n.endsWith('2') || n.endsWith('6')))) {
    return [0.20, 0.66, 0.33, 1.4]; // Green (#34a853)
  }
  if (n.includes('gdg_yellow') || (n.includes('banner_logo') && (n.endsWith('3') || n.endsWith('7')))) {
    return [0.98, 0.74, 0.02, 1.4]; // Yellow (#fbbc05)
  }

  // Illuminated Sign Letters ("VENUE")
  if (n.includes('venue_letter')) {
    return [1.0, 0.98, 0.92, 1.6]; // Glowing ivory white
  }

  // Lanterns & Glow elements
  if (n.includes('lantern') && !n.includes('mount') || n.includes('lamp_glow') || n.includes('ceiling_light')) {
    return [1.0, 0.90, 0.45, 1.6]; // Warm golden glow
  }

  // Gold Trims, Eaves, Pillar Caps, and Stair Edges
  if (n.includes('eave') || n.includes('pillar_cap') || n.includes('stair_gold') || n.includes('banner_gold') || n.includes('counter_top') || n.includes('marker')) {
    return [0.95, 0.76, 0.22, 1.15]; // Polished brass/gold
  }

  // Roof Structure - Warm vibrant terracotta cedar tile
  if (n.includes('roof_main_slab') || n.includes('roof_beam')) {
    return [0.76, 0.46, 0.30, 1.15]; // Warm cedar terracotta
  }

  // Facade Pillars - Premium fluted cream limestone
  if (n.includes('facade_pillar')) {
    return [0.92, 0.90, 0.85, 1.0]; // Elegant ivory limestone
  }

  // Exterior & Interior Walls
  if (n.includes('wall') || n.includes('gallery') || n.includes('header')) {
    return [0.82, 0.78, 0.72, 1.0]; // Warm sandstone
  }

  // Facade Window Glass - Crystal sky blue tint
  if (n.includes('window_glass')) {
    return [0.42, 0.72, 0.98, 1.3]; // Sky blue reflective glass
  }

  // Window & Door Frames
  if (n.includes('window_frame') || n.includes('door_frame')) {
    return [0.48, 0.32, 0.18, 1.0]; // Warm walnut trim
  }

  // Plinth, Steps & Path
  if (n.includes('plinth') || n.includes('approach') || n.includes('stair') || n.includes('pillar_base')) {
    return [0.46, 0.48, 0.52, 1.0]; // Chiseled basalt / granite
  }

  // Shrubbery / Planters
  if (n.includes('shrub')) {
    return [0.22, 0.62, 0.28, 1.1]; // Fresh garden hedge
  }
  if (n.includes('planter')) {
    return [0.30, 0.32, 0.35, 1.0]; // Modern charcoal planter
  }

  // Sign & Banner Backboards
  if (n.includes('backboard') || n.includes('crown_plaque') || n.includes('gdg_banner') || n.includes('reception_front_panel')) {
    return [0.16, 0.19, 0.24, 1.0]; // Sleek dark slate backboard
  }

  // Fallback to original material color with safe minimum brightness
  const c = origColor || new THREE.Color(0xffffff);
  return [Math.max(0.2, c.r), Math.max(0.2, c.g), Math.max(0.2, c.b), 1.0];
}

// Merges all GLTF meshes into a single vertex-colored mesh to stay strictly within draw call budget (≤ 60).
function mergeVenueModel(root) {
  root.updateMatrixWorld(true);
  const geoms = [];

  root.traverse((child) => {
    if (child.isMesh && child.geometry) {
      let geom = child.geometry.clone();
      geom.applyMatrix4(child.matrixWorld);
      if (geom.index) {
        geom = geom.toNonIndexed();
      }
      geom.computeVertexNormals();

      const count = geom.attributes.position.count;
      const colors = new Float32Array(count * 3);
      const mat = child.material;
      const c = mat?.color;
      const [r, g, b, boost] = getElementColor(child.name, c, mat);

      for (let i = 0; i < count; i++) {
        colors[i * 3] = Math.min(1, r * boost);
        colors[i * 3 + 1] = Math.min(1, g * boost);
        colors[i * 3 + 2] = Math.min(1, b * boost);
      }
      geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      geoms.push(geom);
    }
  });

  const merged = mergeGeometries(geoms, false);
  const material = new THREE.MeshLambertMaterial({
    vertexColors: true,
    side: THREE.DoubleSide,
  });

  const mesh = new THREE.Mesh(merged, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

export default {
  size: [5.6, 2.8, 4.4],
  build({ box, solid, light, plane, cornerLights, M }) {
    // 4 small ground corner lights with warm golden glow
    cornerLights(5.6, 4.4, 'warm');

    // 3D GLTF Venue Building Group
    const group = new THREE.Group();
    plane(group, 0, 0, 0);

    const loader = new GLTFLoader();
    loader.load('assets/models/gdg_labyrinth_venue_building.glb', (gltf) => {
      const model = gltf.scene;
      model.scale.setScalar(0.28);
      const optimized = mergeVenueModel(model);
      group.add(optimized);
    });

    solid(0, 0, 5.6, 4.4);
    // Interior booth glow and exterior sign lights for night
    light(0, 1.3, 0.2, 2.5, 8);
    light(0, 2.2, 1.4, 2.2, 8);
    light(-1.8, 1.8, 0.8, 2.0, 7);
    light(1.8, 1.8, 0.8, 2.0, 7);
  },
};
