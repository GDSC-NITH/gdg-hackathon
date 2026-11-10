// The island map. 1 block = 1 m; x points east, z points south, y up.
// Everything placed on the island is listed here, so the whole plan can be
// read (and rearranged) in one file. Station builds live in world/stations/.
//
//             prizes      sponsors      team                 z = -20
//                 \_______    |    _______/
//   schedule  |  ring road ┌──────────┐  |  faq                z = -8
//             |            │ GDG board │  |
//   tracks    |            │   maze    │  |  venue             z =  3
//                          └────┬─────┘
//                     welcome   │   register                  z = 14
//                               │  (avenue)
//                             spawn                           z = 21
import { FACING, toWorld } from './frame.js';

export const ISLAND = { x0: -25, x1: 25, z0: -26, z1: 29 };

// Visitors start on the avenue, facing north towards the plaza.
export const SPAWN = { x: 0, z: 21, heading: Math.PI };

// Stations are drawn this many times their build size (world/kit.js), so they
// read as the island's landmarks next to the trees and lamps.
export const STATION_SCALE = 1.25;

// Stations in tour order: the Dock, the top bar and "Next" all follow it.
// face: the side the station's front looks towards (south, east, north, west).
// approach: how far in front of the centre a visitor stands (default 3.5 m).
export const PLAN = [
  { id: 'welcome', en: 'Welcome', icon: 'scroll', x: -5.5, z: 14, face: 'east' },
  { id: 'tracks', en: 'Tracks', icon: 'works', x: -16, z: 3, face: 'east' },
  { id: 'schedule', en: 'Schedule', icon: 'camera', x: -16, z: -8, face: 'east' },
  { id: 'prizes', en: 'Prizes', icon: 'honors', x: -9, z: -18, face: 'south' },
  { id: 'sponsors', en: 'Sponsors', icon: 'cap', x: 0, z: -20, face: 'south' },
  { id: 'team', en: 'Team', icon: 'heart', x: 9, z: -18, face: 'south' },
  { id: 'faq', en: 'FAQ', icon: 'writing', x: 16, z: -8, face: 'west' },
  { id: 'venue', en: 'Venue', icon: 'map', x: 16, z: 3, face: 'west' },
  { id: 'register', en: 'Register', icon: 'seal', x: 5.5, z: 14, face: 'west' },
];

const standIn = (p, approach = p.approach ?? 3.5) => toWorld(p.x, p.z, FACING[p.face], 0, approach);

// What the engine reads: where to stand (at) and what to look at (look).
export const STATIONS = [
  ...PLAN.map(p => ({ id: p.id, name: p.en, en: p.en, icon: p.icon, at: standIn(p), look: [p.x, p.z] })),
  { id: 'mailbox', name: 'Contact', en: 'Contact', icon: 'mail', at: [1.6, 18.5], look: [3.2, 18.5] },
];

export const MAILBOX = { x: 3.2, z: 18.5, yaw: -Math.PI / 2 };
export const PORTAL = null;

// The GDG signboard stands at the north end of the plaza, facing the avenue.
export const SIGNBOARD = { x: 0, z: -9 };

// Paved ground, as half-open block rectangles { x0, x1, z0, z1 }.
export const RING = { outer: { x0: -13, x1: 13, z0: -15, z1: 9 }, inner: { x0: -11, x1: 11, z0: -13, z1: 7 } };
export const AVENUE = { x0: -2, x1: 2, z0: 9, z1: 27 };
// The maze inlay on the plaza floor: odd width and depth, walls one block wide.
export const MAZE = { x0: -8, x1: 9, z0: -6, z1: 5, seed: 7 };

// Lamp posts along the avenue and the ring, [x, z].
export const LAMPS = [[-2.6, 10.5], [2.6, 10.5], [-2.6, 16.5], [2.6, 16.5], [-13.6, -15.6], [13.6, -15.6], [-13.6, 9.6], [13.6, 9.6]];

// Trees around the edge of the island, [x, z].
export const TREES = [[-19, -21], [19, -21], [-21, -13], [21, -13], [-21, 9], [21, 9], [-19, 21], [19, 21], [-11, 24], [11, 24]];
