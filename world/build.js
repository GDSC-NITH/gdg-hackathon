// Builds the Labyrinth island: terrain and paths, the stations from
// world/stations/, decoration, trees, and the invisible edge of the world.
import * as THREE from 'three';
import { BoxBatch } from '@engine/world/blocks.js';
import { buildIsland } from '@engine/world/terrain.js';
import { createDog } from '@engine/world/avatar.js';
import { buildSakuraForest, createSakuraPetals } from './sakura.js';
import { ISLAND, PLAN, TREES, SPAWN } from './layout.js';
import { placeStation } from './kit.js';
import { BUILDS } from './stations/index.js';
import { surfaceAt, buildDecor } from './grounds.js';
import { buildMountains } from './mountains.js';
import { buildCampus } from './campus.js';
import { defineStage, buildMarkers, markerPulse } from './markers.js';
import { venueUniforms } from './stations/venue.js';

let activePetals = null;

// Labyrinth (the mascot dog): built with the engine's own dog rig
// (@engine/world/avatar.js) but driven by our own follow/click logic instead of
// the engine's anchor-roam PETS system, which has no "follow the player" or
// "click opens a panel" behavior. Named `dog*` below (not `labyrinth*`) so it
// doesn't read as the island/event itself elsewhere in this file.
let dog = null;
const dogPos = { x: SPAWN.x + 1.4, z: SPAWN.z + 1.6 };
let dogHeading = SPAWN.heading;

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

  dog = createDog();
  dog.root.position.set(dogPos.x, 0, dogPos.z);
  dog.root.rotation.y = dogHeading;
  scene.add(dog.root);

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

export function setup({ stage, player, sound, world }) {
  const pulse = markerPulse(world);
  const minX = ISLAND.x0 + 0.5, maxX = ISLAND.x1 - 0.5, minZ = ISLAND.z0 + 0.5, maxZ = ISLAND.z1 - 0.5;
  let stepClock = 0;
  let lastX = player.pos.x, lastZ = player.pos.z;

  // Labyrinth follows a few metres behind wherever the player last walked,
  // catching up faster the further behind it falls, and teleports to their
  // side if it ever falls far behind (sleeping world, a flight, a long sprint).
  const BEHIND = 1.7, SIDE = 0.55, ARRIVE = 0.18, TELEPORT = 14;
  let dogWalk = dogHeading, lastPX = player.pos.x, lastPZ = player.pos.z;
  function updateDog(dt) {
    if (!dog) return;
    const px = player.pos.x, pz = player.pos.z;
    const moveX = px - lastPX, moveZ = pz - lastPZ;
    lastPX = px; lastPZ = pz;
    if (Math.hypot(moveX, moveZ) > 0.0006) dogWalk = Math.atan2(moveX, moveZ);

    const tx = px - Math.sin(dogWalk) * BEHIND + Math.cos(dogWalk) * SIDE;
    const tz = pz - Math.cos(dogWalk) * BEHIND - Math.sin(dogWalk) * SIDE;
    const dx = tx - dogPos.x, dz = tz - dogPos.z;
    const dist = Math.hypot(dx, dz);

    let moving = false;
    if (dist > TELEPORT) {
      dogPos.x = tx; dogPos.z = tz;
    } else if (dist > ARRIVE) {
      const speed = Math.min(dist * 3.2 + 1.1, 6.5);
      const step = Math.min(dist, speed * dt);
      dogPos.x += (dx / dist) * step;
      dogPos.z += (dz / dist) * step;
      dogHeading = Math.atan2(dx, dz);
      moving = true;
    }
    dog.root.position.set(dogPos.x, 0, dogPos.z);
    dog.root.rotation.y = dogHeading;
    const near = Math.hypot(px - dogPos.x, pz - dogPos.z) < 3;
    dog.update(dt, { moving, rest: 'sit', near });
  }

  // Clicking or tapping Labyrinth opens the chat (site/chat.js listens for this).
  const ray = new THREE.Raycaster();
  const canvas = stage.renderer.domElement;
  let downAt = null;
  function onPointerDown(e) { downAt = { x: e.clientX, y: e.clientY, t: performance.now() }; }
  function onPointerUp(e) {
    if (!downAt || !dog) return;
    const moved = Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y);
    const held = performance.now() - downAt.t;
    downAt = null;
    if (moved > 6 || held > 600) return;
    const rect = canvas.getBoundingClientRect();
    const ndc = { x: ((e.clientX - rect.left) / rect.width) * 2 - 1, y: -((e.clientY - rect.top) / rect.height) * 2 + 1 };
    ray.setFromCamera(ndc, stage.camera);
    if (ray.intersectObject(dog.mesh, false).length) document.dispatchEvent(new CustomEvent('open-labyrinth-chat'));
  }
  canvas.addEventListener('pointerdown', onPointerDown, { passive: true });
  canvas.addEventListener('pointerup', onPointerUp, { passive: true });

  return {
    update(dt) {
      updateDog(dt);
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
