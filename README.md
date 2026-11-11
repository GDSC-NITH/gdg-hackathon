# Labyrinth

> **Labyrinth hackathon Organised by GDG NIT Hamirpur**  
> *Author: Prashant*

An interactive 3D website and virtual island experience for **Labyrinth**, a premier 36-hour in-person hackathon hosted at the National Institute of Technology (NIT), Hamirpur.

Built with Three.js and native ES modules, running completely in modern browsers with **zero build step**.

---

## ✨ Features

- **🎮 Immersive 3D Voxel World**: Explore the floating hackathon island freely with authentic Minecraft-style voxel graphics, custom lighting bakes, and dynamic day/night atmospheric transitions.
- **🌐 Website first, game second**: a top bar with plain links to every section, a landing hero with dates and a countdown, name tags over every building, and click-a-building-to-open. Visitors who never play games can use it like a normal site; `?plain` shows a page view.
- **🏛️ Stations around a maze plaza** (positions in [`world/layout.js`](world/layout.js)): Welcome and Register flank the avenue from spawn; Tracks and Schedule on the west side; Prizes, Sponsors and Team to the north; FAQ and Venue to the east. The GDG signboard stands behind a maze inlay at the centre of the plaza.
- **📜 Minecraft GUI Content Drawers**: High-contrast, beveled stone dialog panels ensuring readability for all cards, schedules, and prize tiers.
- **🕹️ Movement & Flight Dynamics**:
  - `W`, `A`, `S`, `D` / Arrow keys: Walk and navigate.
  - `Space`: Jump / double-tap to toggle flight mode.
  - `Shift`: Sprint on foot; descend and fly faster while flying. `Ctrl`: descend while flying.
  - `F`: Interact with nearby stations.
  - `M`: Toggle radar minimap.
- **⚡ Strict Performance Budget**:
  - About **25 draw calls** at common viewpoints (budget < 60).
  - About **9,000 triangles** (budget < 200,000).
  - 100% baked ambient lighting with zero unneeded real-time shadow overhead.
  - Mobile-ready touch controls and responsive layouts.

---

## 🚀 Quick Start

Run locally with any standard Python HTTP server:

```sh
# On Windows / macOS / Linux
python tools/serve.py
```

The script automatically selects an available port, disables browser caching for instant reloading, and opens your browser at `http://127.0.0.1:<port>/`.

### Conformance Checks

```sh
npm run check:site
```

Validates site metadata, configuration, assets, and engine diffs.

### Preview Deployments

Pull requests to `main` automatically deploy an isolated preview build to Vercel and post a comment with the live preview link.

---

## 📂 Project Structure

```
index.html          # Hero, top bar and station content cards
homecraft.json      # Metadata: site name, author, tagline, and language
home.config.js      # Configuration: skin, IST timezone (Asia/Kolkata), Dock items
site/               # Website layer: top bar, hero, name tags, click-to-open, Prev/Next
world/
  README.md         # How the world is split up and how to add a station
  layout.js         # The map: island, spawn, station positions, paths, lamps, trees
  stations/         # One file per station's 3D build
  grounds.js        # Paths, maze plaza, lamps, flowers, GDG signboard
  kit.js            # Shared materials and station placement helper
  build.js          # Puts the island together
assets/             # Textures, skins, and branding assets
engine/             # Three.js rendering engine and UI systems
tools/              # Local server, validation, and testing scripts
```

---

## 👥 Credits & Organization

- **Organized by**: Google Developer Groups (GDG) on Campus, NIT Hamirpur
- **Author**: Prashant
- **License**: MIT
