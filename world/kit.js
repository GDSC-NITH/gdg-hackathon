// Shared building kit for the Labyrinth world.
//
// M is the material palette every station uses, so the island keeps one look.
// placeStation() runs a station's build(k) in that station's own frame:
// local (0, 0) is the station centre and local +z is its FRONT (the side that
// faces the path and the visitor). The kit turns local footprints, lights and
// planes into world coordinates, so a station can be moved or turned in
// layout.js without touching its build file.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { yawOf, toWorld } from './frame.js';
import { STATION_SCALE } from './layout.js';

export { FACING, yawOf, toWorld } from './frame.js';

// Helper to merge GLTF model meshes sharing the same material to stay strictly within draw budget
export function mergeByMaterial(root) {
  root.updateMatrixWorld(true);
  const byMat = new Map();
  root.traverse((child) => {
    if (child.isMesh && child.geometry) {
      const geom = child.geometry.clone();
      geom.applyMatrix4(child.matrixWorld);
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
      mat.metalness = 0.15;
      mat.roughness = 0.35;
      const mesh = new THREE.Mesh(mergedGeom, mat);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mergedGroup.add(mesh);
    }
  }
  return mergedGroup;
}

export const M = {
  oak: { tex: 'oak' },
  wood: { tex: 'wood_panel' },
  deck: { tex: 'deck' },
  log: { tex: 'log', top: 'log_top' },
  stone: { tex: 'stone' },
  deepslate: { tex: 'deepslate' },
  concrete: { tex: 'concrete' },
  pavers: { tex: 'pavers' },
  travertine: { tex: 'travertine' },
  books: { tex: 'bookshelf', top: 'wood_panel' },
  steel: { tex: 'steel' },
  blackMetal: { tex: 'black_metal' },
  gold: { tex: 'paint', tint: 0xf1c40f },
  goldGlow: { tex: 'paint', tint: 0xf39c12, emissive: 0.6 },
  diamond: { tex: 'paint', tint: 0x00cec9, emissive: 0.5 },
  emerald: { tex: 'paint', tint: 0x2ecc71, emissive: 0.7 },
  lapis: { tex: 'paint', tint: 0x0984e3 },
  obsidian: { tex: 'paint', tint: 0x19142b },
  redVelvet: { tex: 'velvet', tint: 0xb71540 },
  paper: { tex: 'paint', tint: 0xfffbe6 },
  fireGlow: { tex: 'paint', tint: 0xff7700, emissive: 1 },
  lanternGlow: { tex: 'paint', tint: 0xffb142, emissive: 1 },
  beaconGlow: { tex: 'paint', tint: 0x74b9ff, emissive: 1 },
  purplePortal: { tex: 'paint', tint: 0x8e44ad, emissive: 0.95 },
  paint: tint => ({ tex: 'paint', tint }),
  light: (tint, emissive = 1) => ({ tex: 'paint', tint, emissive }),
};

// World-aligned bounds of a local rectangle centred on (lx, lz).
function bounds(x, z, yaw, lx, lz, w, d) {
  let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
  for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
    const [wx, wz] = toWorld(x, z, yaw, lx + sx * w / 2, lz + sz * d / 2);
    x0 = Math.min(x0, wx); x1 = Math.max(x1, wx); z0 = Math.min(z0, wz); z1 = Math.max(z1, wz);
  }
  return { x0, x1, z0, z1 };
}

// out = { B, obstacles, hotspots, bakes, planes }: the lists build.js returns.
// station = { id, x, z, face }, def = { size: [w, h, d], build(k) }.
// Every station is drawn STATION_SCALE times its build size (layout.js), so
// the stations stand out from the trees and lamps; builds stay in metres.
export function placeStation(out, station, def) {
  const { B, obstacles, hotspots, bakes, planes, grid, forest } = out;
  const { id, x, z } = station, yaw = yawOf(station.face), s = STATION_SCALE;
  const [sw, sh, sd] = def.size;
  const k = {
    M,
    mergeByMaterial,
    grid,
    // A box in station space; y is its bottom face (see BoxBatch.box).
    box: (...args) => B.box(...args),
    // Something the player can't walk through, padded 5 cm as AGENTS.md asks.
    solid(lx, lz, w, d, level = 0, height = sh) {
      const b = bounds(x, z, yaw, lx * s, lz * s, w * s + 0.1, d * s + 0.1);
      obstacles.push({ ...b, level });
      if (grid) {
        const x0 = Math.floor(b.x0), x1 = Math.ceil(b.x1);
        const z0 = Math.floor(b.z0), z1 = Math.ceil(b.z1);
        const y0 = Math.floor(level);
        const y1 = Math.ceil(level + height * s);
        grid.fill(x0, y0, z0, x1, y1, z1, 'stone', 'forestCollision');
        if (forest?.tops) {
          forest.tops.push({ x0, x1, z0, z1, y: y1, site: id });
        }
      }
    },
    // A lamp baked into the night lighting. dir is a local direction or null.
    light(lx, y, lz, power, radius, dir = null) {
      const [wx, wz] = toWorld(x, z, yaw, lx * s, lz * s);
      let direction = null;
      if (dir) {
        const [dx, dz] = toWorld(0, 0, yaw, dir[0], dir[2]);
        direction = [dx, dir[1], dz];
      }
      bakes.push({ id: `${id}-${bakes.length}`, position: [wx, y * s, wz], power, radius: radius * s, direction });
    },
    // A THREE.Mesh placed in station space (signs, posters). Each one is a draw call.
    plane(mesh, lx, y, lz, ry = 0) {
      const [wx, wz] = toWorld(x, z, yaw, lx * s, lz * s);
      mesh.position.set(wx, y * s, wz);
      mesh.rotation.y = yaw + ry;
      mesh.scale.multiplyScalar(s);
      planes.push(mesh);
      return mesh;
    },
    // 4 small stylish ground corner uplights around the station's base footprint
    cornerLights(w, d, style = 'warm') {
      const hx = w / 2 - 0.16, hz = d / 2 - 0.16;
      const corners = [
        [-hx, -hz],
        [hx, -hz],
        [-hx, hz],
        [hx, hz]
      ];
      const glow = style === 'emerald' ? M.emerald :
                   style === 'cyan' ? M.beaconGlow :
                   style === 'purple' ? M.purplePortal :
                   style === 'fire' ? M.fireGlow :
                   style === 'gold' ? M.goldGlow : M.lanternGlow;

      for (const [cx, cz] of corners) {
        // Low-profile square bezel (basalt black metal)
        B.box(cx, 0, cz, 0.30, 0.04, 0.30, M.blackMetal);
        // Recessed self-illuminated glowing lens
        B.box(cx, 0.03, cz, 0.20, 0.03, 0.20, glow);
        // Baked upward light volume cone
        const [wx, wz] = toWorld(x, z, yaw, cx * s, cz * s);
        bakes.push({ id: `${id}-c${bakes.length}`, position: [wx, 0.15, wz], power: 2.2, radius: 5.5, direction: [0, 1, 0] });
      }
    },
  };
  B.at(x, 0, z, yaw, () => {
    B.stack.push(B.stack[B.stack.length - 1].clone().scale(new THREE.Vector3(s, s, s)));
    def.build(k);
    B.stack.pop();
  });
  // Click and proximity box: the station's whole size.
  const [w, h, d] = def.size.map(v => v * s);
  const r = bounds(x, z, yaw, 0, 0, w, d);
  hotspots.push({ id, box: new THREE.Box3(new THREE.Vector3(r.x0, 0, r.z0), new THREE.Vector3(r.x1, h, r.z1)) });
}
