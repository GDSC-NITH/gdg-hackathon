// Venue: 3D Voxel GDG Labyrinth Venue Pavilion Building.
// Local frame: (0, 0) is the centre, +z is the front (faces the path).
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// Color palette mapping to ensure clean, high-contrast, premium architectural visuals
// that look stunning from top-down aerial and eye-level, and never turn into a black shadow.
// Returns { diff: [r, g, b], emis: [r, g, b] } for daytime diffuse and nighttime self-illumination.
function getElementColor(name, origColor, origMat) {
  const n = name.toLowerCase();

  // Official Google GDG Brand Colors
  if (n.includes('gdg_red') || (n.includes('banner_logo') && (n.endsWith('1') || n.endsWith('5')))) {
    const col = [0.92, 0.26, 0.21]; // Red (#ea4335)
    return { diff: col, emis: [col[0] * 0.95, col[1] * 0.95, col[2] * 0.95] };
  }
  if (n.includes('gdg_blue') || (n.includes('banner_logo') && (n.endsWith('0') || n.endsWith('4')))) {
    const col = [0.26, 0.52, 0.96]; // Blue (#4285f4)
    return { diff: col, emis: [col[0] * 0.95, col[1] * 0.95, col[2] * 0.95] };
  }
  if (n.includes('gdg_green') || (n.includes('banner_logo') && (n.endsWith('2') || n.endsWith('6')))) {
    const col = [0.20, 0.66, 0.33]; // Green (#34a853)
    return { diff: col, emis: [col[0] * 0.95, col[1] * 0.95, col[2] * 0.95] };
  }
  if (n.includes('gdg_yellow') || (n.includes('banner_logo') && (n.endsWith('3') || n.endsWith('7')))) {
    const col = [0.98, 0.74, 0.02]; // Yellow (#fbbc05)
    return { diff: col, emis: [col[0] * 0.95, col[1] * 0.95, col[2] * 0.95] };
  }

  // Illuminated Sign Letters ("VENUE") - Brilliant Glowing White
  if (n.includes('venue_letter')) {
    return { diff: [1.0, 1.0, 1.0], emis: [1.0, 1.0, 1.0] };
  }

  // Lanterns & Glow elements - Warm Golden Radiance
  if (n.includes('lantern') && !n.includes('mount') || n.includes('lamp_glow') || n.includes('ceiling_light')) {
    return { diff: [1.0, 0.92, 0.50], emis: [1.0, 0.90, 0.45] };
  }

  // Facade Window Glass - Interior Lit Sky Blue Glass
  if (n.includes('window_glass')) {
    return { diff: [0.45, 0.75, 1.0], emis: [0.38, 0.68, 0.92] };
  }

  // Gold Trims, Eaves, Pillar Caps, and Stair Edges
  if (n.includes('eave') || n.includes('pillar_cap') || n.includes('stair_gold') || n.includes('banner_gold') || n.includes('counter_top') || n.includes('marker')) {
    const col = [0.95, 0.76, 0.22];
    return { diff: col, emis: [col[0] * 0.55, col[1] * 0.55, col[2] * 0.55] };
  }

  // Roof Structure - Warm Vibrant Terracotta Cedar Tile
  if (n.includes('roof_main_slab') || n.includes('roof_beam')) {
    const col = [0.78, 0.48, 0.32];
    return { diff: col, emis: [col[0] * 0.48, col[1] * 0.48, col[2] * 0.48] };
  }

  // Facade Pillars - Lit Ivory Cream Limestone
  if (n.includes('facade_pillar') || n.includes('entrance_header')) {
    const col = [0.92, 0.90, 0.85];
    return { diff: col, emis: [col[0] * 0.50, col[1] * 0.50, col[2] * 0.50] };
  }

  // Exterior & Interior Walls - Warm Sandstone
  if (n.includes('wall') || n.includes('gallery')) {
    const col = [0.84, 0.80, 0.74];
    return { diff: col, emis: [col[0] * 0.45, col[1] * 0.45, col[2] * 0.45] };
  }

  // Interior Floor & Reception Desk
  if (n.includes('interior_floor') || n.includes('reception_desk')) {
    const col = [0.75, 0.62, 0.48];
    return { diff: col, emis: [col[0] * 0.45, col[1] * 0.45, col[2] * 0.45] };
  }

  // Window & Door Frames - Warm Walnut Trim
  if (n.includes('window_frame') || n.includes('door_frame')) {
    const col = [0.52, 0.35, 0.20];
    return { diff: col, emis: [col[0] * 0.40, col[1] * 0.40, col[2] * 0.40] };
  }

  // Plinth, Steps & Path - Chiseled Basalt / Granite
  if (n.includes('plinth') || n.includes('approach') || n.includes('stair') || n.includes('pillar_base')) {
    const col = [0.55, 0.58, 0.62];
    return { diff: col, emis: [col[0] * 0.35, col[1] * 0.35, col[2] * 0.35] };
  }

  // Shrubbery / Planters
  if (n.includes('shrub')) {
    const col = [0.25, 0.65, 0.32];
    return { diff: col, emis: [col[0] * 0.30, col[1] * 0.30, col[2] * 0.30] };
  }
  if (n.includes('planter')) {
    const col = [0.35, 0.37, 0.40];
    return { diff: col, emis: [col[0] * 0.25, col[1] * 0.25, col[2] * 0.25] };
  }

  // Sign & Banner Backboards - Sleek Dark Slate (high contrast for bright letters)
  if (n.includes('backboard') || n.includes('crown_plaque') || n.includes('gdg_banner') || n.includes('reception_front_panel')) {
    const col = [0.15, 0.18, 0.22];
    return { diff: col, emis: [col[0] * 0.18, col[1] * 0.18, col[2] * 0.18] };
  }

  // Fallback to original material color with safe minimum brightness and night glow
  const c = origColor || new THREE.Color(0xffffff);
  const r = Math.max(0.2, c.r), g = Math.max(0.2, c.g), b = Math.max(0.2, c.b);
  return { diff: [r, g, b], emis: [r * 0.35, g * 0.35, b * 0.35] };
}

// Merges all GLTF meshes into a single vertex-colored, self-illuminated mesh
// to stay strictly within draw call budget (≤ 60) while looking gorgeous day and night.
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
      const emissive = new Float32Array(count * 3);
      const mat = child.material;
      const c = mat?.color;
      const { diff, emis } = getElementColor(child.name, c, mat);

      for (let i = 0; i < count; i++) {
        colors[i * 3] = diff[0];
        colors[i * 3 + 1] = diff[1];
        colors[i * 3 + 2] = diff[2];

        emissive[i * 3] = emis[0];
        emissive[i * 3 + 1] = emis[1];
        emissive[i * 3 + 2] = emis[2];
      }
      geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      geom.setAttribute('aEmissive', new THREE.BufferAttribute(emissive, 3));
      geoms.push(geom);
    }
  });

  const merged = mergeGeometries(geoms, false);
  const material = new THREE.MeshLambertMaterial({
    vertexColors: true,
    side: THREE.DoubleSide,
  });

  // Inject custom vertex-based emissive self-illumination into MeshLambertMaterial
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = `
      attribute vec3 aEmissive;
      varying vec3 vEmissive;
    ` + shader.vertexShader.replace(
      '#include <color_vertex>',
      `
      #include <color_vertex>
      vEmissive = aEmissive;
      `
    );

    shader.fragmentShader = `
      varying vec3 vEmissive;
    ` + shader.fragmentShader.replace(
      'vec3 totalEmissiveRadiance = emissive;',
      `
      vec3 totalEmissiveRadiance = emissive + vEmissive;
      `
    );
  };

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
