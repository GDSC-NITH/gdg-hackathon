// Footstep particle system for Homecraft / Minecraft style island.
// Emits tiny 3D voxel block particles under the player's feet when walking or running.
// The particles dynamically match the exact block type and color palette of the surface
// underfoot (grass, pavers, travertine plaza, stage gold, hedge, wood, stone, sand, etc.).
//
// Built with a single InstancedMesh (1 draw call, 0 object allocations per frame) to strictly
// adhere to the performance budget.
import * as THREE from 'three';
import { surfaceAt } from './grounds.js';

// Block color palettes based on engine/world/textures.js procedural texture colors
export const BLOCK_PALETTES = {
  // Vibrant emerald/lime grass shades with occasional rich loam dirt crumbs
  grass: [0x6fa544, 0x78ae4b, 0x67993f, 0x80b653, 0x73a847, 0x8c6239],
  // Cobblestone / pathway paver slate-grey tones
  pavers: [0x787570, 0x6b6863, 0x86827c, 0x5e5c57, 0x8a8680],
  // Ivory and cream travertine plaza stones
  travertine: [0xdcd3c2, 0xd5ccba, 0xe1d9c9, 0xc9bfab, 0xebd9b7],
  // Warm golden GDG station stage travertine
  stage: [0xf2cf6e, 0xe9c46a, 0xd4ad53, 0xf6db8d, 0xdfb75c],
  // Deep lush green hedge foliage
  hedge: [0x3f7a2d, 0x4a8834, 0x376b27, 0x52913a, 0x2c5a20],
  // Loamy earth brown
  dirt: [0x8c6239, 0x7d5632, 0x966a40, 0x84603a, 0x6d4928],
  // Stone blocks and steps
  stone: [0x8e8e8e, 0x868686, 0x969696, 0x8a8a8a, 0x767676],
  // Warm sandy gold
  sand: [0xe0cfa2, 0xd9c799, 0xe6d6ab, 0xd1bf8e],
  // Smooth architectural concrete
  concrete: [0xcdc9c1, 0xc9c5bd, 0xd1cdc6, 0xbab6ae],
  // Warm oak planks and timber decks
  planks: [0xa8744a, 0x9e6c43, 0xb07b50, 0xa47048, 0x8a5d38],
  deck: [0xa8744a, 0x9e6c43, 0xb07b50, 0xa47048, 0x8a5d38],
  // Dark tree trunk bark
  log: [0x675239, 0x58442e, 0x755e42, 0x4e3a23],
  // Slate grey deepslate
  deepslate: [0x46464f, 0x3e3e47, 0x4f4f58, 0x35353d],
  // Speckled gravel
  gravel: [0x797472, 0x6e6968, 0x86807e, 0x5f5a58],
  // Sakura cherry blossom leaves
  leaves: [0xffb7c5, 0xff94b8, 0xfc8bad, 0xe56b92],
  // Glass fragments
  glass: [0xdbeafe, 0xbfdbfe, 0x93c5fd, 0xe0f2fe],
};

const MAX_PARTICLES = 96;

export function createFootstepParticles(scene, grid) {
  // 6.5 cm cube: exactly 1 voxel pixel in 16x16 Minecraft scale
  const geom = new THREE.BoxGeometry(0.065, 0.065, 0.065);
  const material = new THREE.MeshLambertMaterial({
    transparent: false,
    depthWrite: true,
  });

  const mesh = new THREE.InstancedMesh(geom, material, MAX_PARTICLES);
  mesh.name = 'footstep-particles';
  mesh.frustumCulled = false;

  // Reusable math objects for zero allocations per frame
  const dummy = new THREE.Object3D();
  const color = new THREE.Color();

  // Particle state arrays
  const x = new Float32Array(MAX_PARTICLES);
  const y = new Float32Array(MAX_PARTICLES);
  const z = new Float32Array(MAX_PARTICLES);
  const vx = new Float32Array(MAX_PARTICLES);
  const vy = new Float32Array(MAX_PARTICLES);
  const vz = new Float32Array(MAX_PARTICLES);
  const rx = new Float32Array(MAX_PARTICLES);
  const ry = new Float32Array(MAX_PARTICLES);
  const rz = new Float32Array(MAX_PARTICLES);
  const vrx = new Float32Array(MAX_PARTICLES);
  const vry = new Float32Array(MAX_PARTICLES);
  const vrz = new Float32Array(MAX_PARTICLES);
  const age = new Float32Array(MAX_PARTICLES);
  const life = new Float32Array(MAX_PARTICLES);
  const baseScale = new Float32Array(MAX_PARTICLES);
  const groundY = new Float32Array(MAX_PARTICLES);
  const active = new Uint8Array(MAX_PARTICLES);

  let nextIdx = 0;

  // Initialize all instances off-screen and invisible
  dummy.position.set(0, -999, 0);
  dummy.scale.setScalar(0);
  dummy.updateMatrix();
  for (let i = 0; i < MAX_PARTICLES; i++) {
    mesh.setMatrixAt(i, dummy.matrix);
    color.setHex(0x6fa544);
    mesh.setColorAt(i, color);
  }
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;

  scene.add(mesh);

  function spawnParticle(px, py, pz, pvx, pvy, pvz, hex, gy, scale, duration) {
    const idx = nextIdx;
    nextIdx = (nextIdx + 1) % MAX_PARTICLES;

    x[idx] = px;
    y[idx] = py;
    z[idx] = pz;
    vx[idx] = pvx;
    vy[idx] = pvy;
    vz[idx] = pvz;
    rx[idx] = Math.random() * Math.PI * 2;
    ry[idx] = Math.random() * Math.PI * 2;
    rz[idx] = Math.random() * Math.PI * 2;
    vrx[idx] = (Math.random() - 0.5) * 14;
    vry[idx] = (Math.random() - 0.5) * 14;
    vrz[idx] = (Math.random() - 0.5) * 14;
    groundY[idx] = gy;
    baseScale[idx] = scale;
    age[idx] = 0;
    life[idx] = duration;
    active[idx] = 1;

    color.setHex(hex);
    mesh.setColorAt(idx, color);

    dummy.position.set(px, py, pz);
    dummy.rotation.set(rx[idx], ry[idx], rz[idx]);
    dummy.scale.setScalar(scale);
    dummy.updateMatrix();
    mesh.setMatrixAt(idx, dummy.matrix);
  }

  function getSurfaceColor(px, py, pz) {
    const gx = Math.floor(px);
    const gz = Math.floor(pz);

    if (grid) {
      // Check block underneath the feet:
      // At ground level (floorY = 0), island surface blocks are at y = -1.
      // At stairs or raised platforms, block is at floorY - 1.
      const topY = Math.floor(py - 0.02);
      for (let yy = topY; yy >= topY - 2; yy--) {
        const t = grid.type(gx, yy, gz);
        if (t && t.name) {
          const pal = BLOCK_PALETTES[t.name];
          if (pal) return pal[Math.floor(Math.random() * pal.length)];
          if (t.tint) return t.tint;
          if (t.map && typeof t.map === 'string' && t.map.startsWith('#')) {
            return parseInt(t.map.slice(1), 16);
          }
          break;
        }
      }
    }

    // Default island surface
    const name = surfaceAt(gx, gz);
    const palette = BLOCK_PALETTES[name] || BLOCK_PALETTES.grass;
    return palette[Math.floor(Math.random() * palette.length)];
  }

  // Player state tracking
  let playerRef = null;
  let lastPX = 0, lastPZ = 0;
  let distAccum = 0;
  let footSide = 1;
  let wasInAir = false;
  let airTimer = 0;

  return {
    mesh,
    attachPlayer(player) {
      playerRef = player;
      if (player) {
        lastPX = player.pos.x;
        lastPZ = player.pos.z;
      }
    },

    update(dt) {
      const step = Math.min(dt, 0.05);
      let matrixNeedsUpdate = false;
      let colorNeedsUpdate = false;

      // 1. Spawning from player movement
      if (playerRef) {
        const p = playerRef.pos;
        const moved = Math.hypot(p.x - lastPX, p.z - lastPZ);
        lastPX = p.x;
        lastPZ = p.z;

        const speed = step > 0 ? moved / step : 0;
        const isRunning = speed > 4.2;
        const isWalking = speed > 0.25 && !isRunning;
        const onGround = playerRef.mode === 'ground';

        // Landing impact burst after jump or fall
        if (wasInAir && onGround && airTimer > 0.22) {
          const impactCount = 10;
          const hex = getSurfaceColor(p.x, playerRef.floorY, p.z);
          for (let i = 0; i < impactCount; i++) {
            const angle = (i / impactCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
            const spread = 0.5 + Math.random() * 0.85;
            const bvx = Math.cos(angle) * spread;
            const bvz = Math.sin(angle) * spread;
            const bvy = 0.65 + Math.random() * 0.8;
            spawnParticle(
              p.x + Math.cos(angle) * (0.1 + Math.random() * 0.15),
              playerRef.floorY + 0.04,
              p.z + Math.sin(angle) * (0.1 + Math.random() * 0.15),
              bvx, bvy, bvz,
              hex,
              playerRef.floorY,
              0.8 + Math.random() * 0.45,
              0.38 + Math.random() * 0.16
            );
          }
          matrixNeedsUpdate = true;
          colorNeedsUpdate = true;
        }

        if (onGround) {
          wasInAir = false;
          airTimer = 0;

          if (isWalking || isRunning) {
            distAccum += moved;
            // Running emits tighter bursts more frequently, walking emits gentle occasional puffs
            const threshold = isRunning ? 0.22 : 0.42;

            if (distAccum >= threshold) {
              distAccum = 0;
              footSide = -footSide;

              const yaw = playerRef.heading;
              const fwdX = Math.sin(yaw);
              const fwdZ = Math.cos(yaw);
              const latX = Math.cos(yaw);
              const latZ = -Math.sin(yaw);

              // Position relative to current foot
              const footX = p.x + latX * (0.13 * footSide) - fwdX * 0.06;
              const footZ = p.z + latZ * (0.13 * footSide) - fwdZ * 0.06;
              const footY = playerRef.floorY + 0.04;

              const particleCount = isRunning ? (3 + (Math.random() > 0.35 ? 1 : 0)) : (1 + (Math.random() > 0.45 ? 1 : 0));

              for (let k = 0; k < particleCount; k++) {
                // 1. Footprint scatter: distribute spawn points across an organic elliptical foot area
                const scatterAngle = Math.random() * Math.PI * 2;
                const scatterDist = Math.pow(Math.random(), 0.6) * (isRunning ? 0.22 : 0.14);
                const ox = footX + Math.cos(scatterAngle) * scatterDist;
                const oz = footZ + Math.sin(scatterAngle) * scatterDist;
                const oy = footY + Math.random() * 0.03;

                const hex = getSurfaceColor(ox, playerRef.floorY, oz);

                // 2. Wide scattered spray velocity:
                // Combine backward motion kick with outward radial scatter and lateral puff
                const kick = isRunning ? (0.6 + Math.random() * 0.6) : (0.2 + Math.random() * 0.2);
                const backX = -fwdX * kick;
                const backZ = -fwdZ * kick;

                // 360-degree radial outward dispersion so dust puffs out all around the foot
                const radAngle = Math.random() * Math.PI * 2;
                const radSpeed = (isRunning ? 0.65 : 0.35) * (0.35 + Math.random() * 0.75);
                const radX = Math.cos(radAngle) * radSpeed;
                const radZ = Math.sin(radAngle) * radSpeed;

                // Lateral side-puff along the foot's width
                const latJitter = (Math.random() - 0.5) * (isRunning ? 0.45 : 0.25);
                const sideX = latX * latJitter;
                const sideZ = latZ * latJitter;

                const pvx = backX + radX + sideX;
                const pvz = backZ + radZ + sideZ;
                const pvy = (isRunning ? 0.65 : 0.4) + Math.random() * (isRunning ? 0.9 : 0.5);

                const duration = (isRunning ? 0.4 : 0.35) + Math.random() * 0.16;
                const scale = (isRunning ? 0.75 : 0.65) + Math.random() * 0.5;

                spawnParticle(ox, oy, oz, pvx, pvy, pvz, hex, playerRef.floorY, scale, duration);
              }

              matrixNeedsUpdate = true;
              colorNeedsUpdate = true;
            }
          }
        } else {
          wasInAir = true;
          airTimer += step;
          distAccum = 0;
        }
      }

      // 2. Physics & animation update for active particles
      for (let i = 0; i < MAX_PARTICLES; i++) {
        if (!active[i]) continue;

        age[i] += step;
        if (age[i] >= life[i]) {
          active[i] = 0;
          dummy.position.set(0, -999, 0);
          dummy.scale.setScalar(0);
          dummy.updateMatrix();
          mesh.setMatrixAt(i, dummy.matrix);
          matrixNeedsUpdate = true;
          continue;
        }

        // Gravity
        vy[i] -= 10.5 * step;

        // Air drag
        const drag = Math.pow(0.88, step * 60);
        vx[i] *= drag;
        vz[i] *= drag;

        x[i] += vx[i] * step;
        y[i] += vy[i] * step;
        z[i] += vz[i] * step;

        // Floor collision and soft bounce
        const floor = groundY[i] + 0.032;
        if (y[i] <= floor) {
          y[i] = floor;
          vy[i] = Math.max(0, -vy[i] * 0.22);
          vx[i] *= 0.65;
          vz[i] *= 0.65;
        }

        // 3D tumbling rotation
        rx[i] += vrx[i] * step;
        ry[i] += vry[i] * step;
        rz[i] += vrz[i] * step;

        // Shrink particle towards end of life (Minecraft block particle style)
        const progress = age[i] / life[i];
        const s = baseScale[i] * Math.max(0, 1.0 - progress * progress);

        dummy.position.set(x[i], y[i], z[i]);
        dummy.rotation.set(rx[i], ry[i], rz[i]);
        dummy.scale.setScalar(s);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
        matrixNeedsUpdate = true;
      }

      if (colorNeedsUpdate && mesh.instanceColor) {
        mesh.instanceColor.needsUpdate = true;
      }
      if (matrixNeedsUpdate) {
        mesh.instanceMatrix.needsUpdate = true;
      }
    },
  };
}
