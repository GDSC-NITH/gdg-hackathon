// FAQ: 3D Voxel Knowledge Pavilion & Enchanted Library.
// Local frame: (0, 0) is the centre, +z is the front (faces the path).
import * as THREE from 'three';
import { loadModel } from '../models.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { bakeStation } from '../bake.js';

// Enhanced PBR merger grouping by architectural feature to deliver
// authentic Minecraft voxel aesthetics with an enchanted knowledge pavilion,
// open grimoire, floating crystal & glyphs, question-mark motif, and warm lanterns
// while strictly respecting draw call limits.
function mergeFAQModel(root) {
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
      let cat = 'basePlinth';

      if (name.includes('floating_crystal')) {
        cat = 'floatingCrystal';
      } else if (name.includes('floating_glyph')) {
        cat = 'floatingGlyph';
      } else if (name.includes('question_mark')) {
        cat = 'questionMark';
      } else if (name.includes('enchanted_book')) {
        cat = 'enchantedBook';
      } else if (name.includes('book_pages')) {
        cat = 'bookPages';
      } else if (name.includes('altar_stone')) {
        cat = 'altarStone';
      } else if (name.includes('bookshelf_wood')) {
        cat = 'bookshelfWood';
      } else if (name.includes('book_spines')) {
        cat = 'bookSpines';
      } else if (name.includes('pavilion_pillar')) {
        cat = 'pavilionPillar';
      } else if (name.includes('pavilion_roof')) {
        cat = 'pavilionRoof';
      } else if (name.includes('lantern_iron')) {
        cat = 'lanternIron';
      } else if (name.includes('lantern_glow')) {
        cat = 'lanternGlow';
      } else if (name.includes('gold_trim')) {
        cat = 'goldTrim';
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

    if (cat === 'floatingCrystal') {
      // Hovering diamond/cyan Knowledge Crystal
      mat = new THREE.MeshPhysicalMaterial({
        color: 0x00f0ff,
        emissive: new THREE.Color(0x00c4d8),
        emissiveIntensity: 1.8,
        metalness: 0.15,
        roughness: 0.10,
        clearcoat: 0.95,
        transparent: true,
        opacity: 0.92,
        side: THREE.DoubleSide,
      });
    } else if (cat === 'floatingGlyph') {
      // Levitating mystic golden/amber arcane glyphs
      mat = new THREE.MeshPhysicalMaterial({
        color: 0xffaa00,
        emissive: new THREE.Color(0xff8800),
        emissiveIntensity: 1.6,
        metalness: 0.10,
        roughness: 0.20,
        side: THREE.DoubleSide,
      });
    } else if (cat === 'questionMark') {
      // Radiant golden 3D voxel question mark on the facade pediment
      mat = new THREE.MeshPhysicalMaterial({
        color: 0xffd700,
        emissive: new THREE.Color(0xffb300),
        emissiveIntensity: 1.4,
        roughness: 0.18,
        metalness: 0.35,
        clearcoat: 0.90,
        side: THREE.DoubleSide,
      });
    } else if (cat === 'enchantedBook') {
      // Mystical leather grimoire cover & velvet altar cloth
      mat = new THREE.MeshStandardMaterial({
        color: 0x833471,
        roughness: 0.45,
        metalness: 0.10,
        side: THREE.DoubleSide,
      });
    } else if (cat === 'bookPages') {
      // Aged illuminated parchment leaves & lectern scrolls
      mat = new THREE.MeshStandardMaterial({
        color: 0xf5f0d8,
        roughness: 0.55,
        metalness: 0.05,
        side: THREE.DoubleSide,
      });
    } else if (cat === 'altarStone') {
      // Polished obsidian & dark foundation stone
      mat = new THREE.MeshPhysicalMaterial({
        color: 0x16161e,
        emissive: new THREE.Color(0x101018),
        emissiveIntensity: 0.30,
        roughness: 0.15,
        metalness: 0.20,
        clearcoat: 0.80,
        side: THREE.DoubleSide,
      });
    } else if (cat === 'bookshelfWood') {
      // Rich dark oak library shelves & reading lecterns
      mat = new THREE.MeshStandardMaterial({
        color: 0x4a3728,
        roughness: 0.55,
        metalness: 0.05,
        side: THREE.DoubleSide,
      });
    } else if (cat === 'bookSpines') {
      // Colorful archival leather book volumes
      mat = new THREE.MeshStandardMaterial({
        color: 0xb53434,
        roughness: 0.40,
        metalness: 0.10,
        side: THREE.DoubleSide,
      });
    } else if (cat === 'pavilionPillar') {
      // Chiseled quartz columns and arched vaults
      mat = new THREE.MeshStandardMaterial({
        color: 0xdedede,
        roughness: 0.35,
        metalness: 0.08,
        side: THREE.DoubleSide,
      });
    } else if (cat === 'pavilionRoof') {
      // Dark oxidized copper & prismarine teal roof shingles
      mat = new THREE.MeshStandardMaterial({
        color: 0x2d6a64,
        roughness: 0.38,
        metalness: 0.12,
        side: THREE.DoubleSide,
      });
    } else if (cat === 'lanternIron') {
      // Wrought-iron suspension chains and lantern housings
      mat = new THREE.MeshStandardMaterial({
        color: 0x222428,
        roughness: 0.50,
        metalness: 0.40,
        side: THREE.DoubleSide,
      });
    } else if (cat === 'lanternGlow') {
      // Warm incandescent lantern flame core
      mat = new THREE.MeshPhysicalMaterial({
        color: 0xffaa33,
        emissive: new THREE.Color(0xff8811),
        emissiveIntensity: 2.2,
        roughness: 0.15,
        metalness: 0.10,
        side: THREE.DoubleSide,
      });
    } else if (cat === 'goldTrim') {
      // Polished brass clasps, corner brackets, and finials
      mat = new THREE.MeshPhysicalMaterial({
        color: 0xf5b025,
        emissive: new THREE.Color(0xd49010),
        emissiveIntensity: 0.40,
        roughness: 0.20,
        metalness: 0.40,
        clearcoat: 0.70,
        side: THREE.DoubleSide,
      });
    } else {
      // Base plinth flagstones
      mat = new THREE.MeshStandardMaterial({
        color: 0x333742,
        roughness: 0.45,
        metalness: 0.10,
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
  size: [4.2, 3.5, 4.2],
  build({ box, solid, light, plane, cornerLights, M }) {
    // Stepped Ceremonial Deepslate & Pavers Dais
    box(0, 0, 0, 4.2, 0.20, 4.2, M.deepslate);
    box(0, 0.20, 0, 3.8, 0.15, 3.8, M.pavers);

    // 4 small ground corner lights with cyan mystical glow
    cornerLights(4.2, 4.2, 'cyan');

    // Polished gold corner bracket accents on the dais
    box(-1.75, 0.20, -1.75, 0.25, 0.05, 0.25, M.gold);
    box(1.75, 0.20, -1.75, 0.25, 0.05, 0.25, M.gold);
    box(-1.75, 0.20, 1.75, 0.25, 0.05, 0.25, M.gold);
    box(1.75, 0.20, 1.75, 0.25, 0.05, 0.25, M.gold);

    // Front ceremonial gold plaque
    box(0, 0.05, 2.11, 1.4, 0.12, 0.04, M.goldGlow);

    // 3D GLTF Knowledge Pavilion Group
    const group = new THREE.Group();
    plane(group, 0, 0.35, 0);

    loadModel('assets/models/gdg_faq.glb', (gltf) => {
      const model = gltf.scene;
      model.scale.setScalar(0.92);
      const optimized = bakeStation(mergeFAQModel(model));
      group.add(optimized);
    });

    solid(0, 0, 3.8, 3.8);

    // Architectural night illumination
    light(0, 3.2, 1.6, 3.0, 10);
    light(0, 1.8, 0.0, 2.6, 9);
    light(-1.5, 2.3, 1.5, 2.0, 7);
    light(1.5, 2.3, 1.5, 2.0, 7);
    light(-1.5, 2.3, -1.5, 2.0, 7);
    light(1.5, 2.3, -1.5, 2.0, 7);
  },
};
