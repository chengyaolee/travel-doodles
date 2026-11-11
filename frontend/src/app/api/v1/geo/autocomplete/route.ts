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

const englishRegionNames = new Intl.DisplayNames(["en"], { type: "region" });

/**
 * Normalizes ISO country codes or local country names into standard English country names.
 */
function toEnglishCountry(countryName: string, countryCode: string): string {
  const code = (countryCode || "").toUpperCase().trim();
  if (code.length === 2) {
    try {
      const standard = englishRegionNames.of(code);
      if (standard) return standard;
    } catch {
      // ignore
    }
  }
  return countryName || countryCode;
}

/**
 * Strips non-Latin scripts when bilingual "Foreign (English)" or "English (Foreign)" patterns are present,
 * ensuring the returned label is predominantly English.
 */
function cleanEnglishText(str: string): string {
  if (!str) return "";
  const trimmed = str.trim();

  // Pattern: "ForeignName (English Name)" -> return "English Name"
  const parenMatch = trimmed.match(/^(.*?)\s*\((.*?)\)$/);
  if (parenMatch) {
    const [, outer, inner] = parenMatch;
    const outerHasLatin = /[a-zA-Z]{2,}/.test(outer);
    const innerHasLatin = /[a-zA-Z]{2,}/.test(inner);
    if (!outerHasLatin && innerHasLatin) {
      return inner.trim();
    }
    if (outerHasLatin && !innerHasLatin) {
      return outer.trim();
    }
  }

  // Pattern: "English Name / ForeignName" or "ForeignName / English Name"
  if (trimmed.includes("/")) {
    const parts = trimmed.split("/").map((s) => s.trim());
    const latinPart = parts.find((p) => /^[a-zA-Z0-9\s,.'-]+$/.test(p));
    if (latinPart) return latinPart;
  }

  return trimmed;
}

function loadLocalGeoData() {
  if (cachedCities && cachedRegions && cachedCountries) return;

  try {
    const pubDir = path.join(process.cwd(), "public");

    const citiesFile = path.join(pubDir, "data", "geo", "cities.geojson");
    if (fs.existsSync(citiesFile)) {
      const geo = JSON.parse(fs.readFileSync(citiesFile, "utf-8"));
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

  // 1. Try external free Photon geocoder with explicit lang=en for English translations
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2500);

    const res = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&lang=en&limit=8`, {
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

          const countryCode = (p.countrycode || "").toUpperCase();
          const country = toEnglishCountry(p.country || "", countryCode);

          const rawName = p.name || p.city || country || q;
          const rawCity = p.city || p.town || p.district || p.locality || "";
          const rawState = p.state || p.county || "";

          let name = cleanEnglishText(rawName);
          let city = cleanEnglishText(rawCity);
          const state = cleanEnglishText(rawState);

          // If primary name has no Latin letters (e.g. native script), fallback to English city or state
          if (!/[a-zA-Z]/.test(name)) {
            if (city && /[a-zA-Z]/.test(city)) {
              name = city;
            } else if (state && /[a-zA-Z]/.test(state)) {
              name = state;
            }
          }

          if (!city) city = name;

          // Build clean readable address string strictly with English/Latin parts
          const parts: string[] = [];
          if (name) parts.push(name);
          if (city && city !== name && /[a-zA-Z]/.test(city)) parts.push(city);
          if (state && state !== city && state !== name && /[a-zA-Z]/.test(state)) parts.push(state);
          if (country) parts.push(country);

          const displayName = parts.join(", ");

          results.push({
            id: `photon-${feat.properties?.osm_id || Math.random()}`,
            name,
            displayName,
            city,
            state: state && /[a-zA-Z]/.test(state) ? state : undefined,
            country,
            countryCode,
            coordinates: coords,
          });
        }
      }
    }
  } catch {
    // Photon timed out or offline, proceed with local index
  }

  // 2. If results are few, search local dataset (cities, regions, countries) in English
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
            const englishCountry = toEnglishCountry(c.country, c.country);
            results.push({
              id: `local-city-${c.id}`,
              name: c.name,
              displayName: `${c.name}, ${englishCountry}`,
              city: c.name,
              country: englishCountry,
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
            const englishCountry = toEnglishCountry(r.country, r.country);
            results.push({
              id: `local-reg-${r.id}`,
              name: r.name,
              displayName: `${r.name}${r.shortName ? ` (${r.shortName})` : ""}, ${englishCountry}`,
              city: r.name,
              country: englishCountry,
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
            const englishCountry = toEnglishCountry(c.displayName, c.code);
            results.push({
              id: `local-country-${c.code}`,
              name: englishCountry,
              displayName: englishCountry,
              city: englishCountry,
              country: englishCountry,
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
