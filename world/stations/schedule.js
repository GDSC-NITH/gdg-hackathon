// Schedule: 3D Voxel GDG Hackathon Clock Tower & Timetable Pavilion.
// Local frame: (0, 0) is the centre, +z is the front (faces the path).
import * as THREE from 'three';
import { loadModel } from '../models.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { bakeStation } from '../bake.js';

// Enhanced PBR merger grouping by architectural feature to deliver
// authentic Minecraft voxel aesthetics with a distinct, beautiful clock dial,
// complete 12-hour markings, tapered hands, digital timetable, polished brass trims,
// and energy aura while strictly respecting draw call limits.
function mergeScheduleModel(root) {
  root.updateMatrixWorld(true);
  const byFeature = new Map();

  root.traverse((child) => {
    if (child.isMesh && child.geometry) {
      let geom = child.geometry.clone();
      geom.applyMatrix4(child.matrixWorld);
      if (geom.index) {
        geom = geom.toNonIndexed();
      }
      geom.computeVertexNormals();

      const name = child.name || '';
      let cat = 'stone';

      if (name.includes('cyan_aura')) {
        cat = 'cyanAura';
      } else if (name.includes('clock_face')) {
        cat = 'clockFace';
      } else if (name.includes('clock_bezel')) {
        cat = 'clockBezel';
      } else if (name.includes('clock_hand') || name.includes('geometry_27')) {
        cat = 'clockHands';
      } else if (name.includes('hour_mark')) {
        cat = 'clockMarks';
      } else if (name.includes('clock_pin')) {
        cat = 'clockPin';
      } else if (name.includes('roof_finial') || name.includes('tower_belt') ||
                 name.includes('base_gold') || name.includes('schedule_gold_trim') || name.includes('schedule_letter') ||
                 name.includes('agenda_frame') || name.includes('gear_ring') || name.includes('gear_tooth') ||
                 name.includes('banner_pole')) {
        cat = 'gold';
      } else if (name.includes('lantern')) {
        cat = 'lantern';
      } else if (name.includes('agenda_screen')) {
        cat = 'agendaScreen';
      } else if (name.includes('agenda_row')) {
        cat = 'agendaRow';
      } else if (name.includes('agenda_indicator')) {
        cat = 'agendaIndicator';
      } else if (name.includes('gear_hub') || name.includes('schedule_plaque') || name.includes('clock_panel')) {
        cat = 'darkTrim';
      } else if (name.includes('banner')) {
        cat = 'banner';
      } else if (name.includes('leaf')) {
        cat = 'leaf';
      } else if (name.includes('planter')) {
        cat = 'planter';
      } else if (name.includes('roof_tier') || name.includes('tower')) {
        cat = 'towerStone';
      } else if (name.includes('entry_step') || name.includes('corner_pillar') || name.includes('clock_house')) {
        cat = 'lightPillar';
      } else if (name.includes('base')) {
        cat = 'basePlinth';
      }

      if (!byFeature.has(cat)) byFeature.set(cat, []);
      byFeature.get(cat).push(geom);
    }
  });

  const group = new THREE.Group();
  for (const [cat, geoms] of byFeature.entries()) {
    const mergedGeom = mergeGeometries(geoms, false);
    if (!mergedGeom) continue;

    let mat;

    if (cat === 'cyanAura') {
      // Orbiting cyan holographic energy ring
      mat = new THREE.MeshPhysicalMaterial({
        color: 0x00f0ff,
        emissive: new THREE.Color(0x00c4d8),
        emissiveIntensity: 1.6,
        metalness: 0.15,
        roughness: 0.10,
        clearcoat: 0.95,
        transparent: true,
        opacity: 0.92,
        side: THREE.DoubleSide,
      });
    } else if (cat === 'clockFace') {
      // Luminous warm ivory enamel clock face - high contrast base
      mat = new THREE.MeshPhysicalMaterial({
        color: 0xfffaea,
        emissive: new THREE.Color(0xfff0d0),
        emissiveIntensity: 0.45,
        roughness: 0.18,
        metalness: 0.05,
        clearcoat: 0.85,
        side: THREE.DoubleSide,
      });
    } else if (cat === 'clockBezel') {
      // Polished gold outer ring framing the clock face
      mat = new THREE.MeshPhysicalMaterial({
        color: 0xf5b324,
        emissive: new THREE.Color(0xd48806),
        emissiveIntensity: 0.50,
        metalness: 0.55,
        roughness: 0.15,
        clearcoat: 0.90,
        side: THREE.DoubleSide,
      });
    } else if (cat === 'clockMarks') {
      // Crisp 12-hour tick marks: deep obsidian black with subtle contrast sheen
      mat = new THREE.MeshPhysicalMaterial({
        color: 0x111620,
        emissive: new THREE.Color(0x080b10),
        emissiveIntensity: 0.20,
        metalness: 0.35,
        roughness: 0.15,
        clearcoat: 0.90,
        side: THREE.DoubleSide,
      });
    } else if (cat === 'clockHands') {
      // Unmistakable clock hands: dark obsidian with a gold-edged center line
      mat = new THREE.MeshPhysicalMaterial({
        color: 0x0d1117,
        emissive: new THREE.Color(0x161b22),
        emissiveIntensity: 0.35,
        metalness: 0.40,
        roughness: 0.15,
        clearcoat: 0.95,
        side: THREE.DoubleSide,
      });
    } else if (cat === 'clockPin') {
      // Radiant gold center cap pivot holding the clock hands
      mat = new THREE.MeshPhysicalMaterial({
        color: 0xffd54f,
        emissive: new THREE.Color(0xffb300),
        emissiveIntensity: 0.80,
        metalness: 0.60,
        roughness: 0.12,
        clearcoat: 0.95,
        side: THREE.DoubleSide,
      });
    } else if (cat === 'gold') {
      // Polished clockwork brass, gears, finial, and lettering
      mat = new THREE.MeshPhysicalMaterial({
        color: 0xf5b324,
        emissive: new THREE.Color(0xd48806),
        emissiveIntensity: 0.45,
        metalness: 0.48,
        roughness: 0.18,
        clearcoat: 0.85,
        clearcoatRoughness: 0.10,
        side: THREE.DoubleSide,
      });
    } else if (cat === 'lantern') {
      // Warm glowing hanging lanterns
      mat = new THREE.MeshPhysicalMaterial({
        color: 0xffd066,
        emissive: new THREE.Color(0xffaa22),
        emissiveIntensity: 1.5,
        metalness: 0.1,
        roughness: 0.2,
        side: THREE.DoubleSide,
      });
    } else if (cat === 'agendaScreen') {
      // Sleek digital hackathon timetable screen
      mat = new THREE.MeshPhysicalMaterial({
        color: 0x0c1626,
        emissive: new THREE.Color(0x091e38),
        emissiveIntensity: 0.65,
        metalness: 0.30,
        roughness: 0.15,
        clearcoat: 0.85,
        side: THREE.DoubleSide,
      });
    } else if (cat === 'agendaRow') {
      // Glowing cyan timetable slot markers
      mat = new THREE.MeshPhysicalMaterial({
        color: 0x4fc3f7,
        emissive: new THREE.Color(0x0288d1),
        emissiveIntensity: 0.85,
        metalness: 0.10,
        roughness: 0.20,
        side: THREE.DoubleSide,
      });
    } else if (cat === 'agendaIndicator') {
      // Active "NOW HACKING" live pulse indicator
      mat = new THREE.MeshPhysicalMaterial({
        color: 0x00e676,
        emissive: new THREE.Color(0x00c853),
        emissiveIntensity: 1.5,
        metalness: 0.10,
        roughness: 0.15,
        side: THREE.DoubleSide,
      });
    } else if (cat === 'darkTrim') {
      // Backing sign plaque, gear hub, and clock housing panel
      mat = new THREE.MeshPhysicalMaterial({
        color: 0x181e28,
        emissive: new THREE.Color(0x0f141c),
        emissiveIntensity: 0.25,
        metalness: 0.25,
        roughness: 0.20,
        side: THREE.DoubleSide,
      });
    } else if (cat === 'banner') {
      // Google Developer Groups Royal Blue Banner
      mat = new THREE.MeshPhysicalMaterial({
        color: 0x4285f4,
        emissive: new THREE.Color(0x4285f4),
        emissiveIntensity: 0.55,
        metalness: 0.15,
        roughness: 0.35,
        side: THREE.DoubleSide,
      });
    } else if (cat === 'leaf') {
      // Lush botanical shrub foliage
      mat = new THREE.MeshPhysicalMaterial({
        color: 0x2e8540,
        emissive: new THREE.Color(0x1b5e20),
        emissiveIntensity: 0.30,
        metalness: 0.05,
        roughness: 0.35,
        side: THREE.DoubleSide,
      });
    } else if (cat === 'planter') {
      // Warm terracotta flower pot
      mat = new THREE.MeshStandardMaterial({
        color: 0x935133,
        roughness: 0.50,
        metalness: 0.05,
        side: THREE.DoubleSide,
      });
    } else if (cat === 'towerStone') {
      // Dark slate / chiseled cobblestone tower masonry
      mat = new THREE.MeshStandardMaterial({
        color: 0x5a6575,
        roughness: 0.42,
        metalness: 0.08,
        side: THREE.DoubleSide,
      });
    } else if (cat === 'lightPillar') {
      // Chiseled ivory cream limestone corner pillars and steps
      mat = new THREE.MeshStandardMaterial({
        color: 0x9399a3,
        roughness: 0.36,
        metalness: 0.08,
        side: THREE.DoubleSide,
      });
    } else {
      // Base plinth
      mat = new THREE.MeshStandardMaterial({
        color: 0x2d3340,
        roughness: 0.40,
        metalness: 0.12,
        side: THREE.DoubleSide,
      });
    }

    const mesh = new THREE.Mesh(mergedGeom, mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
  }
  return group;
}

export default {
  size: [4.4, 5.2, 4.0],
  build({ box, solid, light, plane, cornerLights, M }) {
    // Stepped Ceremonial Deepslate & Pavers Dais
    box(0, 0, 0, 4.4, 0.20, 4.0, M.deepslate);
    box(0, 0.20, 0, 4.0, 0.15, 3.6, M.pavers);

    // 4 small ground corner lights with warm golden glow
    cornerLights(4.4, 4.0, 'gold');

    // Polished gold corner bracket accents on the dais
    box(-1.85, 0.20, -1.65, 0.25, 0.05, 0.25, M.gold);
    box(1.85, 0.20, -1.65, 0.25, 0.05, 0.25, M.gold);
    box(-1.85, 0.20, 1.65, 0.25, 0.05, 0.25, M.gold);
    box(1.85, 0.20, 1.65, 0.25, 0.05, 0.25, M.gold);

    // Front ceremonial gold plaque
    box(0, 0.05, 2.01, 1.6, 0.12, 0.04, M.goldGlow);

    // 3D GLTF Clock Tower Group
    const group = new THREE.Group();
    plane(group, 0, 0.35, -0.22);

    loadModel('assets/models/gdg_schedule.glb', (gltf) => {
      const model = gltf.scene;
      model.scale.setScalar(0.48);
      const optimized = bakeStation(mergeScheduleModel(model));
      group.add(optimized);
    });

    solid(0, 0, 4.2, 3.8);

    // Focused architectural night illumination targeting the clock face and timetable
    light(0, 3.2, 1.6, 3.0, 10);
    light(0, 4.6, 0, 2.2, 8);
    light(-1.8, 2.0, 0, 2.0, 7);
    light(1.8, 2.0, 0, 2.0, 7);
  },
};
