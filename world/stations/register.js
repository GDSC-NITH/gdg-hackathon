// Register: an obsidian portal with a sign-up lectern in front of it.
// Local frame: (0, 0) is the centre, +z is the front (faces the path).
export default {
  size: [3.4, 3.6, 3.4],
  build({ box, solid, light, cornerLights, M }) {
    cornerLights(3.4, 3.4, 'purple');

    // Portal frame and its glow.
    box(0, 0, 0, 2.8, 0.6, 0.7, M.obsidian);
    box(-1.1, 0.6, 0, 0.6, 2.4, 0.7, M.obsidian);
    box(1.1, 0.6, 0, 0.6, 2.4, 0.7, M.obsidian);
    box(0, 3.0, 0, 2.8, 0.6, 0.7, M.obsidian);
    box(0, 0.6, 0, 1.6, 2.4, 0.18, M.purplePortal);
    // Lectern with the ledger.
    box(0, 0, 1.3, 0.65, 0.85, 0.5, M.deepslate);
    box(0, 0.85, 1.3, 0.7, 0.08, 0.55, M.wood);
    box(0, 0.93, 1.3, 0.45, 0.03, 0.35, M.paper);
    // Torch pillars.
    for (const px of [-1.6, 1.6]) {
      box(px, 0, 0.8, 0.3, 0.8, 0.3, M.stone);
      box(px, 0.8, 0.8, 0.12, 0.16, 0.12, M.fireGlow);
    }

    solid(0, 0, 2.8, 0.7);
    solid(0, 1.3, 0.7, 0.55);
    solid(-1.6, 0.8, 0.3, 0.3);
    solid(1.6, 0.8, 0.3, 0.3);
    light(0, 1.8, 0.3, 3.2, 12);
  },
};
