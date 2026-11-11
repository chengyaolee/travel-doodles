# 🗺️ Travel Doodles — Frontend Application

Interactive map-first social travel whiteboard built with Next.js 16, React 19, MapLibre GL, and Tailwind CSS v4.

## Features

- **Interactive World Sketchbook (`/explore`)**: Dynamic 80% viewport centering, progressive Google Maps-style label hierarchies, and Apple Photos-style Polaroid clusters.
- **Natural Antimeridian Cartography**: Seamless infinite horizontal panning across Date Line boundaries.
- **Backend API Integration**: Connects to the Go backend via transparent Next.js rewrites in `next.config.ts`.
- **Doodle Whiteboard Components**: Hand-drawn lines, pins, Polaroid cards, and stickers rendered with Rough.js, Motion, and GSAP.

## Directory Structure

```
frontend/
├── public/            # Static assets and GeoJSON boundary datasets
├── scripts/           # Geography generation & coverage audit tools
├── src/
│   ├── app/           # Next.js App Router pages and API routes
│   ├── components/    # Sketchbook map, UI controls, doodles, modals
│   └── lib/           # Map styles, mock posts, geometry utilities
├── tests/             # Browser interaction & geography acceptance tests
├── next.config.ts     # Next.js configuration and API proxy rewrites
└── package.json       # Frontend scripts and dependencies
```

## Running Locally

```bash
# Install dependencies
npm install

# Run development server (http://localhost:3000)
npm run dev

# Run test suite
npm test

# Build for production
npm run build
```

## Deploying to Vercel

1. In the Vercel Dashboard, import the repository.
2. In **Project Settings** → **General** → **Root Directory**: set to `frontend`.
3. In **Settings** → **Environment Variables**: set `BACKEND_URL` to your Go backend URL (e.g. `https://api.yourdomain.com`).
4. Deploy!
