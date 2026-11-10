// Tracks: a blacksmith's forge with an anvil and an armour stand.
// Local frame: (0, 0) is the centre, +z is the front (faces the path).
export default {
  size: [3.2, 2.6, 3.2],
  build({ box, solid, light, cornerLights, M }) {
    cornerLights(3.2, 3.2, 'fire');

    // Furnace and chimney.
    box(0, 0, -0.6, 1.5, 1.6, 1.4, M.deepslate);
    box(0, 1.6, -0.6, 0.75, 1.0, 0.75, M.stone);
    box(0, 0.35, 0.12, 0.75, 0.55, 0.08, M.fireGlow);
    // Anvil on a stump.
    box(-0.85, 0, 0.5, 0.55, 0.45, 0.55, M.log);
    box(-0.85, 0.45, 0.5, 0.45, 0.1, 0.28, M.blackMetal);
    box(-0.85, 0.55, 0.5, 0.2, 0.15, 0.16, M.blackMetal);
    box(-0.9, 0.7, 0.5, 0.55, 0.15, 0.26, M.steel);
    // Armour stand in diamond.
    box(0.85, 0, 0.5, 0.55, 0.08, 0.55, M.stone);
    box(0.85, 0.08, 0.5, 0.08, 1.1, 0.08, M.wood);
    box(0.85, 0.7, 0.5, 0.48, 0.58, 0.26, M.diamond);
    box(0.85, 1.25, 0.5, 0.36, 0.32, 0.36, M.diamond);

    solid(0, -0.6, 1.5, 1.4);
    solid(-0.85, 0.5, 0.55, 0.55);
    solid(0.85, 0.5, 0.55, 0.55);
    light(0, 0.6, 0.3, 2.8, 10, [0, 0, 1]);
  },
};
