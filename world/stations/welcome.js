// Welcome desk: a timber info kiosk with a quest book on the counter.
// Local frame: (0, 0) is the centre, +z is the front (faces the path).
export default {
  size: [2.8, 2.5, 2.5],
  build({ box, solid, light, cornerLights, M }) {
    cornerLights(2.8, 2.5, 'warm');

    // Log corner pillars.
    for (const px of [-1.1, 1.1]) for (const pz of [-0.9, 0.9]) box(px, 0, pz, 0.28, 2.3, 0.28, M.log);
    // Roof beams and awning.
    box(0, 2.2, -0.9, 2.5, 0.18, 0.2, M.wood);
    box(0, 2.2, 0.9, 2.5, 0.18, 0.2, M.wood);
    box(-1.1, 2.2, 0, 0.2, 0.18, 1.9, M.wood);
    box(1.1, 2.2, 0, 0.2, 0.18, 1.9, M.wood);
    box(0, 2.35, 0, 2.7, 0.15, 2.3, M.oak);
    box(0, 2.45, 0, 2.3, 0.12, 1.9, M.wood);
    box(0, 2.22, 1.1, 2.7, 0.16, 0.08, M.redVelvet);
    // Counter with an open book, inkwell and quill.
    box(0, 0, 0.1, 1.6, 0.85, 0.65, M.oak);
    box(0, 0.85, 0.1, 1.7, 0.08, 0.75, M.wood);
    box(-0.35, 0.93, 0.1, 0.42, 0.03, 0.32, M.wood);
    box(-0.45, 0.95, 0.1, 0.2, 0.02, 0.3, M.paper);
    box(-0.25, 0.95, 0.1, 0.2, 0.02, 0.3, M.paper);
    box(0.35, 0.93, 0.15, 0.08, 0.09, 0.08, M.blackMetal);
    box(0.36, 1.02, 0.16, 0.03, 0.16, 0.03, M.paper);
    // Hanging lantern.
    box(0, 2.05, 0, 0.04, 0.3, 0.04, M.steel);
    box(0, 1.82, 0, 0.22, 0.25, 0.22, M.blackMetal);
    box(0, 1.84, 0, 0.16, 0.18, 0.16, M.lanternGlow);
    // Signpost.
    box(1.3, 0, 1.1, 0.12, 1.25, 0.12, M.log);
    box(1.05, 1.05, 1.1, 0.55, 0.18, 0.04, M.wood);
    box(1.5, 0.78, 1.1, 0.5, 0.16, 0.04, M.wood);

    solid(0, 0.1, 1.7, 0.75);
    light(0, 1.9, 0, 2.4, 9, [0, -1, 0]);
  },
};
