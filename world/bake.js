// Turns a station model (a group of merged meshes, one per material) into a
// single mesh: one draw call and one shared shader for every station.
//
// Each part's colour goes into a per-vertex `color` and its glow into a
// per-vertex `aEmissive`, so one MeshLambertMaterial reproduces them all.
// Lambert matches the rest of the world (blocks, furniture, campus) and is
// much cheaper per pixel than MeshStandard / MeshPhysical, which matters
// most on phones. Metal parts are darkened a little, as a metal surface
// with no environment map looks under the PBR materials.
//
// Parts that were slightly see-through (opacity ≥ 0.85) are drawn opaque:
// the difference is not visible, and transparent parts would need a second
// draw call plus depth sorting every frame.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const material = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide });
material.onBeforeCompile = shader => {
  shader.vertexShader = 'attribute vec3 aEmissive;\nvarying vec3 vEmissive;\n' + shader.vertexShader.replace(
    '#include <color_vertex>', '#include <color_vertex>\nvEmissive = aEmissive;');
  shader.fragmentShader = 'varying vec3 vEmissive;\n' + shader.fragmentShader.replace(
    'vec3 totalEmissiveRadiance = emissive;', 'vec3 totalEmissiveRadiance = emissive + vEmissive;');
};
material.customProgramCacheKey = () => 'station-bake-v1';

const diffuse = new THREE.Color(), glow = new THREE.Color();

export function bakeStation(root) {
  root.updateMatrixWorld(true);
  const parts = [];
  let castShadow = false;
  root.traverse(o => {
    if (!o.isMesh || !o.geometry) return;
    const m = Array.isArray(o.material) ? o.material[0] : o.material;
    let g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
    g.applyMatrix4(o.matrixWorld);
    for (const name of Object.keys(g.attributes)) if (name !== 'position' && name !== 'normal') g.deleteAttribute(name);
    if (!g.attributes.normal) g.computeVertexNormals();

    diffuse.copy(m?.color || diffuse.set(0xffffff)).multiplyScalar(1 - (m?.metalness || 0) * 0.5);
    glow.copy(m?.emissive || glow.set(0)).multiplyScalar(m?.emissiveIntensity ?? 1);
    const n = g.attributes.position.count, col = new Float32Array(n * 3), emi = new Float32Array(n * 3);
    for (let i = 0; i < n * 3; i += 3) {
      col[i] = diffuse.r; col[i + 1] = diffuse.g; col[i + 2] = diffuse.b;
      emi[i] = glow.r; emi[i + 1] = glow.g; emi[i + 2] = glow.b;
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    g.setAttribute('aEmissive', new THREE.BufferAttribute(emi, 3));
    parts.push(g);
    castShadow ||= o.castShadow;
    if (o.geometry !== g) o.geometry.dispose();
    m?.dispose?.();
  });
  const merged = mergeGeometries(parts, false);
  for (const g of parts) g.dispose();
  const mesh = new THREE.Mesh(merged, material);
  mesh.castShadow = castShadow;
  mesh.receiveShadow = true;
  return mesh;
}
