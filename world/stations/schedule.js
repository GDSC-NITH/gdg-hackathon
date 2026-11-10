// Schedule: a clock-tower pavilion with a bell and a timetable board.
// Local frame: (0, 0) is the centre, +z is the front (faces the path).
export default {
  size: [3.2, 5.0, 3.2],
  build({ box, solid, light, cornerLights, M }) {
    box(0, 0, 0, 2.6, 0.35, 2.6, M.pavers);
    cornerLights(2.6, 2.6, 'warm');

    for (const px of [-0.95, 0.95]) for (const pz of [-0.95, 0.95]) box(px, 0.35, pz, 0.28, 2.4, 0.28, M.log);
    // Clock housing and stepped roof.
    box(0, 2.75, 0, 2.2, 1.25, 2.2, M.wood);
    box(0, 4.0, 0, 2.5, 0.2, 2.5, M.oak);
    box(0, 4.2, 0, 1.9, 0.25, 1.9, M.oak);
    box(0, 4.45, 0, 1.3, 0.25, 1.3, M.oak);
    box(0, 4.7, 0, 0.7, 0.3, 0.7, M.oak);
    // Clock face with night glow
    box(0, 3.35, 1.12, 0.88, 0.88, 0.05, M.gold);
    box(0, 3.35, 1.15, 0.72, 0.72, 0.02, M.light(0xfffbe6, 0.85));
    box(0, 3.45, 1.17, 0.05, 0.2, 0.01, M.blackMetal);
    box(0.08, 3.35, 1.17, 0.16, 0.04, 0.01, M.paint(0xd23c3c));
    // Bell.
    box(0, 2.4, 0, 0.05, 0.35, 0.05, M.steel);
    box(0, 2.1, 0, 0.35, 0.32, 0.35, M.goldGlow);
    // Timetable board.
    box(-1.25, 0.35, 0, 0.08, 1.2, 1.0, M.wood);
    box(-1.2, 0.75, 0, 0.03, 0.65, 0.75, M.paper);

    solid(0, 0, 2.6, 2.6);
    light(0, 2.2, 0, 2.2, 9);
  },
};
