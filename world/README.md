# Labyrinth world: how to work on it

The island is split so several people can work at once without touching the
same file. 1 block = 1 m; x points east, z points south, y points up.

| File | What it holds | Who edits it |
|---|---|---|
| `layout.js` | The map: island size, spawn, every station's position and facing (`PLAN`), paths, lamps, trees | Whoever moves things around |
| `stations/<id>.js` | One station's look: its boxes, footprint and lights | One person per station |
| `stations/index.js` | The list of station builds | When a station is added |
| `grounds.js` | Paths and plaza surface, the maze inlay, lamp posts, flowers, GDG signboard | Landscape |
| `campus.js` | NIT Hamirpur round the venue ground (backdrop, not walkable): fence and main gate, the road with Admin Block, Central Block and New Lecture Hall, basketball court and gallery, practice field, communication tower, chir pines | Landscape |
| `mountains.js` | Mountains and hills beyond the campus; they start at `CAMPUS_REACH` from `campus.js` | Landscape |
| `sakura.js` | Sakura trees on the ground and their falling petals | Landscape |
| `kit.js` | Shared materials (`M`) and the station placement helper | Rarely |
| `frame.js` | Facing names and local-to-world maths | Rarely |
| `build.js` | Puts it all together; keeps the player on the island | Rarely |
| `../index.html` | Card text for each station (`<article data-station="<id>">`) and the hero | Content |
| `../site/` | The website layer: top bar, hero, name tags, click-to-open, Prev/Next | Web UI |

## Station frame

Each station is built in its own frame: `(0, 0)` is its centre on the ground
and **local +z is its front**, the side that faces the path. `layout.js` turns
the station with `face: 'south' | 'east' | 'north' | 'west'`; the kit rotates
the boxes, the footprint, the lights and the click box to match. Moving or
turning a station never needs changes in its build file.

```js
// world/stations/example.js
export default {
  size: [3, 2.5, 3],              // click box: width, height, depth (local)
  build({ box, solid, light, M }) {
    box(0, 0, 0, 2.8, 0.35, 2.8, M.pavers);       // x, y(bottom), z, w, h, d, material
    box(0, 0.35, -0.9, 2.2, 2.0, 0.4, M.books);   // back wall at local -z
    solid(0, 0, 2.8, 2.8);                        // can't walk through (x, z, w, d)
    light(0, 1.6, 0, 2.5, 9);                     // baked night light (x, y, z, power, radius)
  },
};
```

`box` is `BoxBatch.box` (see AGENTS.md "Furniture"). Use materials from `M`
in `kit.js` so the island keeps one palette; add new ones there.

## Adding a station

1. Copy a file in `stations/` to `stations/<id>.js` and change the build.
2. Import it in `stations/index.js` and add it to `BUILDS`.
3. Add `{ id, en, icon, x, z, face }` to `PLAN` in `layout.js`. Its order is the
   tour order: Dock, top bar and the card's Prev/Next follow it. `icon` is a
   name from `ART` in `engine/ui/icons.js`.
4. Add `<article class="page" id="<id>" data-station="<id>">` with an `<h2>`
   to `index.html`.
5. `grounds.js` paves a walkway from the station's front automatically. Keep
   about 1.5 m clear in front of the station: visitors stand at
   `approach` (default 2.8 m) from its centre.

## Checking your change

```sh
python3 tools/serve.py           # preview; refresh after each change
npm run check                    # site check + headless browser at desktop and phone size
```

Open the preview with `?debug` to see draw calls and triangles. The budget is
60 draw calls and 200k triangles (AGENTS.md); the island is about 25 calls and
9k triangles today. `#<id>` in the address opens that station's card
directly, e.g. `http://127.0.0.1:<port>/#prizes`. `?plain` shows the page
view, which is also what search engines and visitors without WebGL get.
