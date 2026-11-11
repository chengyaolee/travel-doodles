import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export interface AutocompleteItem {
  id: string;
  name: string;
  displayName: string;
  city: string;
  state?: string;
  country: string;
  countryCode: string;
  regionId?: string;
  coordinates: [number, number]; // [lon, lat]
}

interface LocalCity {
  id: string;
  name: string;
  localName?: string;
  country: string;
  region: string;
  coordinates: [number, number];
}

interface LocalRegion {
  id: string;
  country: string;
  name: string;
  shortName?: string;
  localName?: string;
  center: [number, number];
}

interface LocalCountry {
  code: string;
  displayName: string;
  labelAnchor: [number, number];
}

let cachedCities: LocalCity[] | null = null;
let cachedRegions: LocalRegion[] | null = null;
let cachedCountries: LocalCountry[] | null = null;

function loadLocalGeoData() {
  if (cachedCities && cachedRegions && cachedCountries) return;

  try {
    const pubDir = path.join(process.cwd(), "public");

    const citiesFile = path.join(pubDir, "data", "geo", "cities.geojson");
    if (fs.existsSync(citiesFile)) {
      const geo = JSON.parse(fs.readFileSync(citiesFile, "utf-8"));
      cachedCities = geo.features.map((f: any) => ({
        ...f.properties,
        coordinates: f.geometry.coordinates,
      }));
    } else {
      cachedCities = [];
    }

    const regionsFile = path.join(pubDir, "data", "geo", "regions.geojson");
    if (fs.existsSync(regionsFile)) {
      const geo = JSON.parse(fs.readFileSync(regionsFile, "utf-8"));
      cachedRegions = geo.features.map((f: any) => ({
        id: f.properties.id,
        country: f.properties.country,
        name: f.properties.name,
        shortName: f.properties.shortName,
        localName: f.properties.localName,
        center: f.properties.center,
      }));
    } else {
      cachedRegions = [];
    }

    const invFile = path.join(pubDir, "data", "geography-inventory.json");
    if (fs.existsSync(invFile)) {
      cachedCountries = JSON.parse(fs.readFileSync(invFile, "utf-8"));
    } else {
      cachedCountries = [];
    }
  } catch (e) {
    console.warn("Failed to load local geo caches for autocomplete:", e);
    cachedCities = cachedCities || [];
    cachedRegions = cachedRegions || [];
    cachedCountries = cachedCountries || [];
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") || "").trim();

  if (!q || q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const results: AutocompleteItem[] = [];
  const queryLower = q.toLowerCase();

  // 1. Try external free Photon geocoder (OpenStreetMap / Komoot)
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);

    const res = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=6`, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.features)) {
        for (const feat of data.features) {
          const p = feat.properties || {};
          const coords = feat.geometry?.coordinates as [number, number];
          if (!coords || coords.length !== 2) continue;

          const name = p.name || p.city || p.country || q;
          const city = p.city || p.town || p.district || p.locality || name;
          const country = p.country || "";
          const countryCode = (p.countrycode || "").toUpperCase();
          const state = p.state || p.county || "";

          // Build clean readable address string
          const parts: string[] = [];
          if (name) parts.push(name);
          if (city && city !== name) parts.push(city);
          if (state && state !== city && state !== name) parts.push(state);
          if (country) parts.push(country);

          const displayName = parts.join(", ");

          results.push({
            id: `photon-${feat.properties?.osm_id || Math.random()}`,
            name,
            displayName,
            city,
            state,
            country: countryCode || country,
            countryCode,
            coordinates: coords,
          });
        }
      }
    }
  } catch {
    // Photon timed out or offline, proceed with local index
  }

  // 2. If results are few, search local dataset (cities, regions, countries)
  if (results.length < 5) {
    loadLocalGeoData();

    // Search cities
    if (cachedCities) {
      for (const c of cachedCities) {
        if (
          c.name.toLowerCase().includes(queryLower) ||
          (c.localName && c.localName.toLowerCase().includes(queryLower))
        ) {
          const exists = results.some(
            (r) => Math.abs(r.coordinates[0] - c.coordinates[0]) < 0.1 && Math.abs(r.coordinates[1] - c.coordinates[1]) < 0.1
          );
          if (!exists) {
            results.push({
              id: `local-city-${c.id}`,
              name: c.name,
              displayName: `${c.name}, ${c.country}`,
              city: c.name,
              country: c.country,
              countryCode: c.country,
              regionId: c.region,
              coordinates: c.coordinates,
            });
          }
        }
        if (results.length >= 8) break;
      }
    }

    // Search regions / states
    if (results.length < 8 && cachedRegions) {
      for (const r of cachedRegions) {
        if (
          r.name.toLowerCase().includes(queryLower) ||
          (r.shortName && r.shortName.toLowerCase() === queryLower)
        ) {
          const exists = results.some((item) => item.id === `local-reg-${r.id}`);
          if (!exists) {
            results.push({
              id: `local-reg-${r.id}`,
              name: r.name,
              displayName: `${r.name}${r.shortName ? ` (${r.shortName})` : ""}, ${r.country}`,
              city: r.name,
              country: r.country,
              countryCode: r.country,
              regionId: r.id,
              coordinates: r.center,
            });
          }
        }
        if (results.length >= 8) break;
      }
    }

    // Search countries
    if (results.length < 8 && cachedCountries) {
      for (const c of cachedCountries) {
        if (
          c.displayName.toLowerCase().includes(queryLower) ||
          c.code.toLowerCase() === queryLower
        ) {
          const exists = results.some((item) => item.countryCode === c.code);
          if (!exists) {
            results.push({
              id: `local-country-${c.code}`,
              name: c.displayName,
              displayName: c.displayName,
              city: c.displayName,
              country: c.displayName,
              countryCode: c.code,
              coordinates: c.labelAnchor,
            });
          }
        }
        if (results.length >= 8) break;
      }
    }
  }

  return NextResponse.json({ results: results.slice(0, 8) });
}
