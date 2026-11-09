# 🗺️ Travel Doodles ✍️

> **"The world is your canvas."**  
> *A living travel whiteboard where every pin has a story.*

[![Next.js](https://img.shields.io/badge/Next.js-16.4.5-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.3.0-blue?style=flat-square&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38bdf8?style=flat-square&logo=tailwind-css)](https://tailwindcss.com/)
[![MapLibre GL](https://img.shields.io/badge/MapLibre_GL-v6-2c7bb6?style=flat-square)](https://maplibre.org/)
[![Go](https://img.shields.io/badge/Go-1.24-00ADD8?style=flat-square&logo=go)](https://go.dev/)
[![Tests](https://img.shields.io/badge/Tests-12%2F12_Passing-brightgreen?style=flat-square)]()

**Travel Doodles** is an interactive, hand-drawn social travel atlas and living whiteboard. Turn your wanderlust into an organic, sketched sketchbook—pin memories, discover hidden local spots, follow friends' journeys along dotted route lines, and explore a world map covering 250 countries and territories.

---

## ✨ Features from the Canvas

### 🌍 Interactive World Sketchbook (`/explore`)
- **Handmade Paper Aesthetic**: Rendered on warm cream paper with graphite linework, subtle stippling, and paper grain noise in Light Mode, transitioning to dark charcoal slate in Dark Mode.
- **80% Screen Centering**: Clicking any nation, territory, or subnational region centers it and dynamically scales the view so the destination fills **80% of the visible viewport**, automatically adjusting for the feed drawer on desktop and bottom sheet on mobile.
- **Granular Subnational States & Regions**: Popular tourist destinations (Japan, USA, France, Italy, Spain, Germany, Indonesia, UK, Australia, Brazil) split into first-order administrative divisions and provinces.
- **Progressive Google Maps-Style Labels**: Country names are placed inside their geographical areas, fading in progressively according to landmass scale (large continents at low zoom, microstates and islands when zoomed in).
- **Popular City & Hotspot Discovery**: World metropolises and popular travel hubs (Tokyo, Kyoto, Paris, Nice, Rome, Florence, Barcelona, Bali, Honolulu, etc.) appear as zoom increases and are clickable to filter the feed.
- **Apple Photos-Style Granularity**:
  - At regional view, photos cluster into representative Polaroid-style cards with a post count badge on the **bottom-right** of each picture (e.g. `📷 42`).
  - Zooming in smoothly spreads the pictures out to their exact geographic coordinates.
  - Photos dynamically scale with zoom: starting at $\ge$ **20% of the screen dimension** and scaling up to a fixed maximum size of 280px.
- **Modern Pin Markers**: Sleek travel pins with top-right notification badges showing story counts, replacing tacky white pill circles.
- **Natural Antimeridian Cartography**: Specially sanitized geometry eliminating horizontal line wrap artifacts across Russia, Antarctica, and Fiji, with full infinite horizontal panning support (`renderWorldCopies`) and two-finger trackpad horizontal scrolling.

### 🎨 The Landing Page Experience
- **Hero Canvas**: A living whiteboard with interactive pins that animate and trigger destination previews on click.
- **Section A — Your World, Your Stories**: *"Every pin has a story."* Explore stories pinned from Brooklyn Bridge at dusk to table mountain mists in Cape Town.
- **Section B — Leave Your Mark**: A 3-step creation flow connected by wobbly hand-drawn arrows:
  1. *Pick a place*: Search or drop a wobbly pin anywhere on the world map.
  2. *Add your photos & story*: Upload real travel photographs, scribble notes, and add doodle accents.
  3. *Pin it to the whiteboard*: Share privately with friends or broadcast to the global travel community.
- **Section C — Follow the Dotted Lines**: *"See where your friends wander."* Follow cross-continental itineraries traced with dotted lines and date markers.
- **Section D — A World Full of Doodles**: An irregular masonry gallery with organic Polaroid tilts, tape stickers, and emoji doodles (🍜, 🎋, 🍣, 🐱, 🍵).
- **Section E — Your Own Little Corner**: Personal travel profile boards featuring visited country counters, passport stats, and trip timelines.
- **Section F — Final Call to Adventure**: *"Got a story? Put it on the map."*

---

## 🛠️ Tech Stack & Architecture

### Frontend
- **Framework**: [Next.js 16.4.5](https://nextjs.org/) (App Router, Turbopack & Webpack support)
- **UI & State**: [React 19](https://react.dev/), [Next Themes](https://github.com/pacocoursey/next-themes), [@tanstack/react-query](https://tanstack.com/query)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/) with custom sketchbook CSS design tokens
- **Map Engine**: [MapLibre GL 6.x](https://maplibre.org/) with client-side WebGL2 rendering and accessible fallback
- **Geospatial Pipeline**: [TopoJSON Client](https://github.com/topojson/topojson-client), [d3-geo](https://github.com/d3/d3-geo), Natural Earth & geoBoundaries datasets
- **Animation & Graphics**: [GSAP 3](https://gsap.com/), [Motion](https://motion.dev/), [Rough.js](https://roughjs.com/)

### Backend Services
- **API Engine**: Go 1.24 REST API (`cmd/api`) and async worker (`cmd/worker`)
- **Database**: PostgreSQL with PostGIS geographic spatial indexing (`db/migrations`)
- **Cache**: Redis for session storage and feed caching
- **Deployment**: Docker Compose, Caddy reverse proxy (`deploy/Caddyfile`), automated backup scripts

---

## 🚀 Getting Started

### Prerequisites
- **Node.js**: v20 or v22+
- **npm** or **pnpm**
- *(Optional for backend)*: **Go** 1.24+, **Docker** & **Docker Compose**

### 1. Installation

```bash
git clone https://github.com/chengyaolee/travel-doodles.git
cd travel-doodles
npm install
```

### 2. Generate Geographic Datasets

Compile the 250-country inventory, topological geometries, and administrative boundaries:

```bash
npm run build:geo
```

This generates:
- `public/data/geography-inventory.json` (250 UN/ISO territories with bounding boxes and anchors)
- `public/data/geo/countries.geojson` (Antimeridian-sanitized vector country boundaries)
- `public/data/geo/regions.geojson` (Subnational state divisions for top tourist destinations)
- `public/data/geo/cities.geojson` (Populated travel hubs with ranking metadata)
- `docs/coverage-report.md` (Automated 100% audit report)

### 3. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) for the landing page or [http://localhost:3000/explore](http://localhost:3000/explore) for the interactive world map.

### 4. Running the Backend (Optional)

```bash
# Start PostgreSQL, Redis, and Caddy with Docker Compose
docker compose -f deploy/compose.yaml up -d

# Run database migrations
# Run Go API
go run cmd/api/main.go
```

---

## 🧪 Testing & Verification

Run the test suite using Node.js's native test runner:

```bash
npm test
```

### Test Coverage includes:
- **Inventory Acceptance**: 250 verified unique ISO/product codes and geometry anchors.
- **Topological Integrity**: 0 antimeridian line jumps ($> 180^\circ$) across all polygons.
- **Interactive Hierarchy**: World $\rightarrow$ Country $\rightarrow$ Subnational Region $\rightarrow$ Story Peek transitions.
- **Audience Filtering**: Instant switching between Public ("Everyone") and "Friends" feeds.
- **Accessibility & Error Boundaries**: WebGL fallback mode and keyboard navigability.

---

## 📄 License & Attribution

- **Cartographic Boundaries**: Derived from [Natural Earth](https://www.naturalearthdata.com/) (Public Domain), [geoBoundaries](https://www.geoboundaries.org/) (ODbL / CC-BY 4.0), and [OpenStreetMap](https://www.openstreetmap.org/) contributors.
- **Codebase**: MIT License. Made with ❤️ for wanderers, sketchers, and storytellers.
