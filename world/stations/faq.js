// FAQ: a small library with bookcases and an enchanting table.
// Local frame: (0, 0) is the centre, +z is the front (faces the path).
export default {
  size: [3.0, 2.5, 3.0],
  build({ box, solid, light, cornerLights, M }) {
    box(0, 0, 0, 2.8, 0.35, 2.8, M.pavers);
    cornerLights(2.8, 2.8, 'cyan');

    box(-0.85, 0.35, -0.9, 1.1, 2.0, 0.45, M.books);
    box(0.85, 0.35, -0.9, 1.1, 2.0, 0.45, M.books);
    // Enchanting table with a spellbook and floating glyphs.
    box(0, 0.35, 0.1, 1.05, 0.22, 1.05, M.obsidian);
    box(0, 0.57, 0.1, 0.9, 0.15, 0.9, M.diamond);
    box(0, 0.72, 0.1, 1.0, 0.05, 1.0, M.redVelvet);
    box(0, 0.92, 0.1, 0.42, 0.05, 0.32, M.paint(0x833471));
    box(-0.1, 0.96, 0.1, 0.18, 0.02, 0.3, M.paper);
    box(0.1, 0.96, 0.1, 0.18, 0.02, 0.3, M.paper);
    box(0.35, 1.15, 0.1, 0.08, 0.08, 0.08, M.light(0xa55eea, 1));
    box(-0.35, 1.1, 0.25, 0.07, 0.07, 0.07, M.light(0x45aaf2, 1));
    box(0.12, 1.25, -0.25, 0.08, 0.08, 0.08, M.light(0xfd9644, 1));

    solid(0, 0, 2.8, 2.8);
    light(0, 1.3, 0.1, 2.5, 9);
  },
};
