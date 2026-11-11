// Builds the Labyrinth island: terrain and paths, the stations from
// world/stations/, decoration, trees, and the invisible edge of the world.
import * as THREE from 'three';
import { BoxBatch } from '@engine/world/blocks.js';
import { buildIsland } from '@engine/world/terrain.js';
import { buildSakuraForest, createSakuraPetals } from './sakura.js';
import { ISLAND, PLAN, TREES } from './layout.js';
import { placeStation } from './kit.js';
import { BUILDS } from './stations/index.js';
import { surfaceAt, buildDecor } from './grounds.js';
import { buildMountains } from './mountains.js';
import { buildCampus } from './campus.js';
import { defineStage, buildMarkers, markerPulse } from './markers.js';
import { venueUniforms } from './stations/venue.js';

let activePetals = null;

// Keeps visitors on the island: a wall around its edge and a ceiling 50 m up.
const CEILING = 50;
const outside = (x, z) => x <= ISLAND.x0 + 0.3 || x >= ISLAND.x1 - 0.3 || z <= ISLAND.z0 + 0.3 || z >= ISLAND.z1 - 0.3;
const edge = {
  levels() {},
  collides: (x, feet, z) => feet + 1.8 >= CEILING || (feet < CEILING && feet >= -10 && outside(x, z)),
  obstructed: (x, z, y) => y < CEILING && y >= -10 && outside(x, z),
  pick: () => null,
  ladderAt: () => null,
  spots: () => [],
};

export function build({ grid, layer, materials, scene }) {
  defineStage(grid);
  buildIsland(grid, ISLAND, { surfaceAt, corner: 10, wobble: 0 });
  const out = { B: new BoxBatch(layer), obstacles: [], hotspots: [], bakes: [], planes: [], grid };
  const forest = buildSakuraForest(grid, layer, TREES, out.B);
  out.forest = forest;
  activePetals = createSakuraPetals(scene, forest.spawners);
  for (const station of PLAN) {
    const def = BUILDS[station.id];
    if (def) placeStation(out, station, def);
    else console.warn(`No build for station "${station.id}" in world/stations/index.js`);
  }
  buildDecor({ ...out, layer, materials });
  // A stage, a gold outline and a beacon beam for every station.
  buildMarkers(out.B);

  // Outside the wall: the NIT Hamirpur campus round the venue ground, then
  // mountains and hills beyond it. Pure backdrop — no sites, so none of it
  // is ever reachable.
  buildCampus(out.B);
  const mountains = buildMountains(layer, materials, grid, out.B);
  scene.add(mountains.group);

  return {
    batches: { static: out.B },
    planes: out.planes,
    obstacles: out.obstacles,
    hotspots: out.hotspots,
    bakes: out.bakes,
    forest,
    sites: [edge],
  };
}

export function setup({ stage, player, sound, world, avatar }) {
  const pulse = markerPulse(world);
  const minX = ISLAND.x0 + 0.5, maxX = ISLAND.x1 - 0.5, minZ = ISLAND.z0 + 0.5, maxZ = ISLAND.z1 - 0.5;
  let stepClock = 0;
  let lastX = player.pos.x, lastZ = player.pos.z;
  // A small voxel sword attached to the player's right hand.
  const bladeMat = new THREE.MeshLambertMaterial({ color: 0xc9d8e8 });
  const guardMat = new THREE.MeshLambertMaterial({ color: 0xf1c40f });
  const gripMat = new THREE.MeshLambertMaterial({ color: 0x68452d });
  const sword = new THREE.Group();
  const piece = (w, h, d, y, material) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    mesh.position.y = y;
    sword.add(mesh);
  };
  piece(0.09, 0.39, 0.09, -0.27, bladeMat);
  piece(0.27, 0.06, 0.12, -0.49, guardMat);
  piece(0.08, 0.19, 0.08, -0.61, gripMat);
  sword.position.set(0, -0.62, 0.025);
  sword.rotation.x = -0.2;
  avatar.armR.add(sword);
  let swingTime = 0;
  const canvas = stage.renderer.domElement;
  const swing = () => { swingTime = 0.38; sound?.play('click'); };
  canvas.addEventListener('click', swing);
  return {
    update(dt) {
      // Apply the attack after the avatar's regular pose update.
      if (swingTime > 0) {
        swingTime = Math.max(0, swingTime - dt);
        const progress = 1 - swingTime / 0.38;
        avatar.armR.rotation.x -= Math.sin(progress * Math.PI) * 1.75;
      }
      if (activePetals) activePetals.update(dt);
      pulse(dt);
      if (venueUniforms) {
        venueUniforms.uNight.value = stage ? stage.night : (world?.isNight?.() ? 1.0 : 0.0);
      }

      // A last guard in case flight or a zip slips past the edge.
      const p = player.pos;
      if (p.x < minX) p.x = minX; else if (p.x > maxX) p.x = maxX;
      if (p.z < minZ) p.z = minZ; else if (p.z > maxZ) p.z = maxZ;

      // Trigger footsteps by distance rather than by frame count. This keeps
      // the rhythm stable when the frame rate or movement speed changes.
      const moved = Math.hypot(p.x - lastX, p.z - lastZ);
      lastX = p.x;
      lastZ = p.z;
      if (player.mode === 'ground' && moved > 0.001) {
        stepClock -= dt;
        if (stepClock <= 0) {
          sound?.play('step', player.floorY > 0.1 ? 0.75 : 1);
          stepClock = 0.34;
        }
      } else if (player.mode !== 'ground') {
        stepClock = 0;
      }
    },
  };
}
