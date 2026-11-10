// Builds the Labyrinth island: terrain and paths, the stations from
// world/stations/, decoration, trees, and the invisible edge of the world.
import { BoxBatch } from '@engine/world/blocks.js';
import { buildIsland } from '@engine/world/terrain.js';
import { buildForest } from '@engine/world/landscape.js';
import { ISLAND, PLAN, TREES } from './layout.js';
import { placeStation } from './kit.js';
import { BUILDS } from './stations/index.js';
import { surfaceAt, buildDecor } from './grounds.js';
import { buildMountains } from './mountains.js';

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
  buildIsland(grid, ISLAND, { surfaceAt, corner: 10, wobble: 0 });
  const forest = buildForest(grid, layer, TREES);

  const out = { B: new BoxBatch(layer), obstacles: [], hotspots: [], bakes: [], planes: [], grid, forest };
  for (const station of PLAN) {
    const def = BUILDS[station.id];
    if (def) placeStation(out, station, def);
    else console.warn(`No build for station "${station.id}" in world/stations/index.js`);
  }
  buildDecor({ ...out, layer, materials });

  // Outside the wall: mountains on three sides, the sea open on the fourth.
  // Pure backdrop — no sites, so none of it is ever reachable.
  const mountains = buildMountains(layer, materials, grid);
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

export function setup({ player }) {
  const minX = ISLAND.x0 + 0.5, maxX = ISLAND.x1 - 0.5, minZ = ISLAND.z0 + 0.5, maxZ = ISLAND.z1 - 0.5;
  return {
    update() {
      // A last guard in case flight or a zip slips past the edge.
      const p = player.pos;
      if (p.x < minX) p.x = minX; else if (p.x > maxX) p.x = maxX;
      if (p.z < minZ) p.z = minZ; else if (p.z > maxZ) p.z = maxZ;
    },
  };
}
