"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  Map as MapLibreMap,
  Marker,
  AttributionControl,
  setWorkerUrl,
  type MapLayerMouseEvent,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useTheme } from "next-themes";
import { getSketchbookMapStyle, LIGHT_TOKENS, DARK_TOKENS } from "@/lib/explore/mapStyles";
import { ExplorePost } from "@/lib/explore/mockPosts";
import { PhotoPeek } from "./PhotoPeek";
import { InventoryItem } from "./ExploreToolbar";

if (typeof window !== "undefined") {
  setWorkerUrl("/maplibre-gl-worker.mjs");
}

interface RegionGeoFeature {
  id: string;
  country: string;
  name: string;
  shortName?: string;
  localName: string;
  postCount: number;
  center: [number, number];
  bounds: [[number, number], [number, number]];
}

interface CityGeoFeature {
  id: string;
  name: string;
  localName: string;
  country: string;
  region: string;
  rank: number;
  coordinates: [number, number];
}

interface SketchbookMapProps {
  inventory: InventoryItem[];
  selectedCountry: string | null;
  selectedRegion: string | null;
  onSelectCountry: (code: string) => void;
  onSelectRegion: (regionId: string) => void;
  posts: ExplorePost[];
  selectedPostId: string | null;
  onSelectPost: (postId: string) => void;
  isSidebarOpen: boolean;
  isMobile: boolean;
  mapInstanceRef?: React.MutableRefObject<MapLibreMap | null>;
}

export function SketchbookMap({
  inventory,
  selectedCountry,
  selectedRegion,
  onSelectCountry,
  onSelectRegion,
  posts,
  selectedPostId,
  onSelectPost,
  isSidebarOpen,
  isMobile,
  mapInstanceRef,
}: SketchbookMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);

  // Markers
  const markersRef = useRef<Marker[]>([]);
  const countryLabelsRef = useRef<Marker[]>([]);
  const stateLabelsRef = useRef<Marker[]>([]);
  const cityLabelsRef = useRef<Marker[]>([]);

  const hoveredCountryIdRef = useRef<string | number | null>(null);
  const hoveredRegionIdRef = useRef<string | number | null>(null);
  const selectedCountryIdRef = useRef<string | number | null>(null);
  const selectedRegionIdRef = useRef<string | number | null>(null);

  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const [activePeekPost, setActivePeekPost] = useState<ExplorePost | null>(null);
  const [peekCoords, setPeekCoords] = useState<{ x: number; y: number } | null>(null);
  const [mapZoom, setMapZoom] = useState(1.6);
  const [mapError, setMapError] = useState<string | null>(null);

  // Cached regions and cities data
  const [regionsData, setRegionsData] = useState<RegionGeoFeature[]>([]);
  const [citiesData, setCitiesData] = useState<CityGeoFeature[]>([]);

  // Load regions and cities GeoJSON
  useEffect(() => {
    fetch("/data/geo/regions.geojson")
      .then((res) => res.json())
      .then((geo) => {
        if (geo.features) {
          const list: RegionGeoFeature[] = geo.features.map(
            (f: { properties: RegionGeoFeature }) => f.properties
          );
          setRegionsData(list);
        }
      })
      .catch((err) => console.warn("Could not load regions geojson:", err));

    fetch("/data/geo/cities.geojson")
      .then((res) => res.json())
      .then((geo) => {
        if (geo.features) {
          const list: CityGeoFeature[] = geo.features.map(
            (f: { properties: CityGeoFeature; geometry: { coordinates: [number, number] } }) => ({
              ...f.properties,
              coordinates: f.geometry.coordinates,
            })
          );
          setCitiesData(list);
        }
      })
      .catch((err) => console.warn("Could not load cities geojson:", err));
  }, []);

  // Motion preference
  const getCameraDuration = useCallback(() => {
    if (typeof window !== "undefined") {
      const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (prefersReduced) return 0;
    }
    return 650;
  }, []);

  // 80% screen coverage viewport padding for countries
  const getCountryViewportPadding = useCallback(() => {
    const map = mapRef.current;
    const container = map?.getContainer();
    const mapW = container?.clientWidth || (typeof window !== "undefined" ? window.innerWidth - (isSidebarOpen && !isMobile ? 380 : 0) : 800);
    const mapH = container?.clientHeight || (typeof window !== "undefined" ? window.innerHeight : 600);

    const mobileSheetH = isSidebarOpen && isMobile ? Math.round(mapH * 0.45) : 0;
    const availH = Math.max(200, mapH - mobileSheetH);

    // 10% margin on each side gives 80% screen coverage, centered
    const padX = Math.round(mapW * 0.10);
    const padTop = Math.round(availH * 0.10);
    const padBottom = padTop + mobileSheetH;

    return {
      top: padTop,
      bottom: padBottom,
      left: padX,
      right: padX,
    };
  }, [isSidebarOpen, isMobile]);

  // 70% screen coverage viewport padding for focused regions
  // After the side bar is open, the visible map canvas is centered and the region fills ~70% of both width and height.
  const getRegionViewportPadding = useCallback(() => {
    const map = mapRef.current;
    const container = map?.getContainer();
    const mapW = container?.clientWidth || (typeof window !== "undefined" ? window.innerWidth - (isSidebarOpen && !isMobile ? 380 : 0) : 800);
    const mapH = container?.clientHeight || (typeof window !== "undefined" ? window.innerHeight : 600);

    const mobileSheetH = isSidebarOpen && isMobile ? Math.round(mapH * 0.45) : 0;
    const availH = Math.max(200, mapH - mobileSheetH);

    // 15% margin on each side gives exactly 70% window coverage, perfectly centered
    const padX = Math.round(mapW * 0.15);
    const padTop = Math.round(availH * 0.15);
    const padBottom = padTop + mobileSheetH;

    return {
      top: padTop,
      bottom: padBottom,
      left: padX,
      right: padX,
    };
  }, [isSidebarOpen, isMobile]);

  // Center and zoom to country filling 80% of screen
  const zoomToCountry = useCallback(
    (code: string) => {
      const map = mapRef.current;
      if (!map) return;
      const inv = inventory.find((i) => i.code === code);
      if (!inv) return;

      map.resize();
      const padding = getCountryViewportPadding();
      const duration = getCameraDuration();

      map.fitBounds(inv.cameraBounds, {
        padding,
        duration,
        maxZoom: 14, // Allows both large and microstate countries to fill 80% of screen
      });
    },
    [inventory, getCountryViewportPadding, getCameraDuration]
  );

  // Center and zoom to region filling 70% of screen after sidebar is open
  const zoomToRegion = useCallback(
    (regionId: string) => {
      const map = mapRef.current;
      if (!map) return;
      const reg = regionsData.find((r) => r.id === regionId);
      if (!reg) return;

      map.resize();
      const padding = getRegionViewportPadding();
      const duration = getCameraDuration();

      map.fitBounds(reg.bounds, {
        padding,
        duration,
        maxZoom: 15,
      });
    },
    [regionsData, getRegionViewportPadding, getCameraDuration]
  );

  // Initialize MapLibre
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    if (typeof window !== "undefined") {
      setWorkerUrl(`${window.location.origin}/maplibre-gl-worker.mjs`);
    }

    let map: MapLibreMap;
    try {
      map = new MapLibreMap({
        container: containerRef.current,
        style: getSketchbookMapStyle(isDark),
        center: [15, 25],
        zoom: 1.6,
        minZoom: 1,
        maxZoom: 16,
        pitch: 0,
        maxPitch: 0,
        minPitch: 0,
        pitchWithRotate: false,
        dragRotate: false,
        touchPitch: false,
        attributionControl: false,
        renderWorldCopies: true, // Infinite horizontal wrap
      });
    } catch (err) {
      console.warn("MapLibre WebGL initialization, falling back to accessible atlas mode:", err);
      setMapError(
        "WebGL2 graphics context is not supported or hardware acceleration is unavailable. Search and regional feeds remain active."
      );
      return;
    }

    // Disable all pitch / tilt gestures to lock map in pure 2D top-down perspective
    if (map.touchPitch) map.touchPitch.disable();
    if (map.dragRotate) map.dragRotate.disable();
    map.on("pitch", () => {
      if (map.getPitch() !== 0) {
        map.setPitch(0);
      }
    });

    map.addControl(
      new AttributionControl({
        compact: true,
        customAttribution: "Natural Earth · geoBoundaries · © OSM",
      }),
      "bottom-left"
    );

    map.on("load", () => {
      mapRef.current = map;
      if (mapInstanceRef) {
        mapInstanceRef.current = map;
      }
    });

    map.on("zoom", () => {
      setMapZoom(map.getZoom());
    });

    // Requirement 8: Horizontal scrolling to pan left/right
    const container = containerRef.current;
    const handleWheel = (e: WheelEvent) => {
      // Horizontal trackpad swipe or shift + wheel
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY) && Math.abs(e.deltaX) > 1) {
        e.preventDefault();
        map.panBy([e.deltaX, 0], { duration: 0 });
      } else if (e.shiftKey && Math.abs(e.deltaY) > 1) {
        e.preventDefault();
        map.panBy([e.deltaY, 0], { duration: 0 });
      }
    };
    container.addEventListener("wheel", handleWheel, { passive: false });

    // Country hover interaction
    map.on("mousemove", "countries-fill", (e: MapLayerMouseEvent) => {
      if (!e.features || e.features.length === 0) return;
      map.getCanvas().style.cursor = "pointer";
      const f = e.features[0];
      if (hoveredCountryIdRef.current !== null && hoveredCountryIdRef.current !== f.id) {
        map.setFeatureState(
          { source: "countries", id: hoveredCountryIdRef.current },
          { hovered: false }
        );
      }
      hoveredCountryIdRef.current = f.id ?? null;
      if (f.id !== undefined) {
        map.setFeatureState({ source: "countries", id: f.id }, { hovered: true });
      }
    });

    map.on("mouseleave", "countries-fill", () => {
      map.getCanvas().style.cursor = "";
      if (hoveredCountryIdRef.current !== null) {
        map.setFeatureState(
          { source: "countries", id: hoveredCountryIdRef.current },
          { hovered: false }
        );
        hoveredCountryIdRef.current = null;
      }
    });

    // Country click: centers country & scales to fill 80% of screen (Req 1)
    map.on("click", "countries-fill", (e: MapLayerMouseEvent) => {
      if (!e.features || e.features.length === 0) return;
      const f = e.features[0];
      const code = f.properties?.code;
      if (code) {
        onSelectCountry(code);
        zoomToCountry(code);
      }
    });

    // Region hover interaction
    map.on("mousemove", "regions-fill", (e: MapLayerMouseEvent) => {
      if (!e.features || e.features.length === 0) return;
      map.getCanvas().style.cursor = "pointer";
      const f = e.features[0];
      if (hoveredRegionIdRef.current !== null && hoveredRegionIdRef.current !== f.id) {
        map.setFeatureState(
          { source: "regions", id: hoveredRegionIdRef.current },
          { hovered: false }
        );
      }
      hoveredRegionIdRef.current = f.id ?? null;
      if (f.id !== undefined) {
        map.setFeatureState({ source: "regions", id: f.id }, { hovered: true });
      }
    });

    map.on("mouseleave", "regions-fill", () => {
      if (hoveredRegionIdRef.current !== null) {
        map.setFeatureState(
          { source: "regions", id: hoveredRegionIdRef.current },
          { hovered: false }
        );
        hoveredRegionIdRef.current = null;
      }
    });

    // Region click: centers region & scales to fill 80% of screen (Req 2 & 11)
    map.on("click", "regions-fill", (e: MapLayerMouseEvent) => {
      if (!e.features || e.features.length === 0) return;
      const f = e.features[0];
      const regionId = f.properties?.id;
      if (regionId) {
        onSelectRegion(regionId);
        zoomToRegion(regionId);
      }
    });

    return () => {
      container.removeEventListener("wheel", handleWheel);
      countryLabelsRef.current.forEach((m) => m.remove());
      stateLabelsRef.current.forEach((m) => m.remove());
      cityLabelsRef.current.forEach((m) => m.remove());
      markersRef.current.forEach((m) => m.remove());
      map.remove();
      mapRef.current = null;
      if (mapInstanceRef) {
        mapInstanceRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep map canvas dimensions in sync with sidebar open/close flex changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.resize();
    const timer = setTimeout(() => {
      map.resize();
    }, 320);
    return () => clearTimeout(timer);
  }, [isSidebarOpen, isMobile]);

  // Update theme colors
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;

    const tokens = isDark ? DARK_TOKENS : LIGHT_TOKENS;
    map.setPaintProperty("background", "background-color", tokens.paperBackground);
    map.setPaintProperty("countries-fill", "fill-color", [
      "case",
      ["boolean", ["feature-state", "selected"], false],
      tokens.landSelected,
      ["boolean", ["feature-state", "hovered"], false],
      tokens.landHover,
      tokens.landFill,
    ]);
    map.setPaintProperty("regions-fill", "fill-color", [
      "case",
      ["boolean", ["feature-state", "selected"], false],
      tokens.landSelected,
      ["boolean", ["feature-state", "hovered"], false],
      tokens.stateHover,
      "transparent",
    ]);
    map.setPaintProperty("countries-border", "line-color", tokens.graphiteBorder);
    map.setPaintProperty("regions-border", "line-color", tokens.regionBorder);
  }, [isDark]);

  // Handle camera transition when selectedCountry or selectedRegion changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (!selectedCountry) {
      if (selectedCountryIdRef.current !== null) {
        map.setFeatureState(
          { source: "countries", id: selectedCountryIdRef.current },
          { selected: false }
        );
        selectedCountryIdRef.current = null;
      }
      if (selectedRegionIdRef.current !== null) {
        map.setFeatureState(
          { source: "regions", id: selectedRegionIdRef.current },
          { selected: false }
        );
        selectedRegionIdRef.current = null;
      }
      return;
    }

    const inv = inventory.find((i) => i.code === selectedCountry);
    if (!inv) return;

    // Highlight country feature
    if (selectedCountryIdRef.current !== null) {
      map.setFeatureState(
        { source: "countries", id: selectedCountryIdRef.current },
        { selected: false }
      );
    }
    selectedCountryIdRef.current = inv.geometryId;
    map.setFeatureState({ source: "countries", id: inv.geometryId }, { selected: true });

    // If region selected, center on region
    if (selectedRegion) {
      zoomToRegion(selectedRegion);
      return;
    }

    // Otherwise focus on country bounds (filling 80% of screen)
    zoomToCountry(selectedCountry);
  }, [selectedCountry, selectedRegion, inventory, zoomToCountry, zoomToRegion]);

  // Requirement 9: Google Maps style Country Names inside areas by zoom level
  // Disappears when zoomed in and states show up
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clean up previous country labels
    countryLabelsRef.current.forEach((m) => m.remove());
    countryLabelsRef.current = [];

    // Filter which country names appear based on current zoom
    inventory.forEach((item) => {
      // Check if this country has subnational states in the dataset
      const hasStates = regionsData.some((r) => r.country === item.code);

      // When zoomed in into countries and states show up, country name disappears
      if (hasStates && mapZoom >= 2.8) return;
      if (selectedCountry === item.code && mapZoom >= 2.8) return;
      if (mapZoom >= 5.8) return;

      const [[w, s], [e, n]] = item.cameraBounds;
      const span = Math.max(Math.abs(e - w), Math.abs(n - s));

      let minZoom = 1.4; // Large countries (e.g. US, Canada, Russia, China, Australia, Brazil, India)
      if (span < 16 && span >= 6) {
        minZoom = 2.8; // Medium countries (e.g. France, Japan, Germany, Spain, Italy, UK)
      } else if (span < 6 && span >= 2) {
        minZoom = 4.2; // Small countries (e.g. Switzerland, Netherlands, Belgium, Taiwan)
      } else if (span < 2) {
        minZoom = 5.5; // Microstates & small islands (e.g. Singapore, Monaco, Vatican, Malta)
      }

      if (mapZoom >= minZoom) {
        const el = document.createElement("button");
        // Completely fixed position: zero scale, zero translate on hover to prevent moving away
        el.className =
          "country-label group pointer-events-auto cursor-pointer select-none px-1.5 py-0.5 text-center";
        el.style.transform = "none";
        el.style.transition = "none";
        el.setAttribute("aria-label", item.displayName);

        const textColor = isDark ? "#ffffff" : "#1c1917";
        const textShadow = isDark
          ? "0 1px 3px rgba(0,0,0,0.95), 0 0 4px rgba(0,0,0,0.9)"
          : "0 1px 2px rgba(255,255,255,0.95), 0 0 3px rgba(255,255,255,0.9)";

        el.innerHTML = `
          <span class="block text-[11px] font-sans font-bold uppercase tracking-wider transition-colors group-hover:text-[#d94e34] dark:group-hover:text-[#f87171]" style="color: ${textColor}; text-shadow: ${textShadow};">
            ${item.displayName}
          </span>
        `;

        el.onclick = (e) => {
          e.stopPropagation();
          onSelectCountry(item.code);
          zoomToCountry(item.code);
        };

        const marker = new Marker({ element: el }).setLngLat(item.labelAnchor).addTo(map);

        countryLabelsRef.current.push(marker);
      }
    });
  }, [inventory, mapZoom, onSelectCountry, zoomToCountry, selectedCountry, regionsData, isDark]);

  // State / Regional Labels on the map with short form names ("CA, TX, ID...")
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    stateLabelsRef.current.forEach((m) => m.remove());
    stateLabelsRef.current = [];

    // State labels appear starting at zoom 2.8 (or 2.5 when country is selected) up to zoom 7.2
    const minStateZoom = selectedCountry ? 2.5 : 2.8;
    if (mapZoom < minStateZoom || mapZoom > 7.2) return;

    const visibleRegions = selectedCountry
      ? regionsData.filter((r) => r.country === selectedCountry)
      : regionsData.filter((r) => mapZoom >= 3.6);

    visibleRegions.forEach((reg) => {
      // Short form name like "CA, TX, ID..." or full name if no commonly known short form
      const displayLabel = reg.shortName || reg.name;

      const el = document.createElement("button");
      // Completely fixed position: zero scale, zero translate on hover to prevent moving away
      el.className =
        "state-label group pointer-events-auto cursor-pointer select-none px-1.5 py-0.5 text-center";
      el.style.transform = "none";
      el.style.transition = "none";
      el.setAttribute("aria-label", `${reg.name} (${displayLabel})`);

      const isShortCode = displayLabel.length <= 4 && displayLabel === displayLabel.toUpperCase();
      const textColor = isDark ? "#ffffff" : "#1c1917";
      const textShadow = isDark
        ? "0 1px 3px rgba(0,0,0,0.95), 0 0 4px rgba(0,0,0,0.9)"
        : "0 1px 2px rgba(255,255,255,0.95), 0 0 3px rgba(255,255,255,0.9)";

      el.innerHTML = `
        <span class="block ${
          isShortCode
            ? "text-[12px] font-mono font-bold tracking-widest"
            : "text-[10px] font-sans font-semibold tracking-wide"
        } transition-colors group-hover:text-[#d94e34] dark:group-hover:text-[#f87171]" style="color: ${textColor}; text-shadow: ${textShadow};">
          ${displayLabel}
        </span>
      `;

      el.onclick = (e) => {
        e.stopPropagation();
        onSelectRegion(reg.id);
        zoomToRegion(reg.id);
      };

      const marker = new Marker({ element: el }).setLngLat(reg.center).addTo(map);
      stateLabelsRef.current.push(marker);
    });
  }, [regionsData, mapZoom, selectedCountry, onSelectRegion, zoomToRegion, isDark]);

  // Requirement 10: Names of big and popular cities / hotspots when zoomed in
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    cityLabelsRef.current.forEach((m) => m.remove());
    cityLabelsRef.current = [];

    // Cities only show when zoomed in sufficiently
    if (mapZoom < 3.8) return;

    citiesData.forEach((city) => {
      // Rank 1: zoom >= 3.8, Rank 2: zoom >= 5.2
      if (city.rank === 1 && mapZoom < 3.8) return;
      if (city.rank === 2 && mapZoom < 5.2) return;

      const isBigCity = city.rank === 1;
      const el = document.createElement("button");
      // Fixed position, zero movement on hover
      el.className = `city-label pointer-events-auto cursor-pointer select-none px-1 py-0.5 text-center ${
        isBigCity
          ? "font-sans font-bold text-xs tracking-wide"
          : "font-sans font-medium text-[11px]"
      }`;
      el.style.transform = "none";
      el.style.transition = "none";
      el.style.color = isDark ? "#ffffff" : isBigCity ? "#1c1917" : "#44403c";
      el.style.textShadow = isDark
        ? "0 1px 3px rgba(0,0,0,0.95), 0 0 6px rgba(0,0,0,0.9)"
        : "0 1px 3px rgba(255,255,255,0.95), 0 0 6px rgba(255,255,255,0.9)";
      el.setAttribute("aria-label", `${city.name}, ${city.country}`);
      el.innerHTML = `
        <span class="hover:underline underline-offset-2 decoration-1 block hover:text-[#d94e34] dark:hover:text-[#f87171] transition-colors">
          ${city.name}
        </span>
      `;

      el.onclick = (e) => {
        e.stopPropagation();
        if (city.country && city.country !== selectedCountry) {
          onSelectCountry(city.country);
        }
        if (city.region) {
          onSelectRegion(city.region);
          zoomToRegion(city.region);
        } else {
          map.flyTo({ center: city.coordinates, zoom: Math.max(mapZoom, 7), duration: 600 });
        }
      };

      const marker = new Marker({ element: el }).setLngLat(city.coordinates).addTo(map);

      cityLabelsRef.current.push(marker);
    });
  }, [citiesData, mapZoom, selectedCountry, onSelectCountry, onSelectRegion, zoomToRegion, isDark]);

  // Requirements 5, 6, 7:
  // - Requirement 5: Sleek pin with notification icon on top right (no white circle background)
  // - Requirement 6: Apple Photos style granularity (revealing regions, bottom-right post count, spreading out)
  // - Requirement 7: Scaling images dynamically (min 20% of screen up to fixed max ~280px)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    const visiblePosts = posts.slice(0, 45);

    // Tier 1 (Zoom < 3.2): Collapsed Red Rounded Rectangle Badge with post count (Req 4)
    // No pin asset; capped at "99+" if count > 99
    if (mapZoom < 3.2) {
      const countByGroup: Record<
        string,
        { count: number; coords: [number, number]; code: string; regionId?: string }
      > = {};

      visiblePosts.forEach((p) => {
        const key = selectedCountry ? p.region || p.country : p.country;
        if (!countByGroup[key]) {
          countByGroup[key] = {
            count: 0,
            coords: p.coordinates,
            code: p.country,
            regionId: p.region,
          };
        }
        countByGroup[key].count += 1;
      });

      Object.values(countByGroup).forEach((group) => {
        const countBadge = group.count > 99 ? "99+" : group.count;
        const el = document.createElement("button");
        el.className =
          "relative pointer-events-auto cursor-pointer select-none px-2 py-0.5 rounded-full bg-[#d94e34] hover:bg-[#b91c1c] text-white font-mono text-[11px] font-bold shadow-md border-2 border-white dark:border-stone-900 leading-none flex items-center justify-center transition-colors";
        el.setAttribute("aria-label", `${group.count} stories in ${group.code}`);
        el.innerHTML = `<span>${countBadge}</span>`;

        el.onclick = (e) => {
          e.stopPropagation();
          if (group.regionId && selectedCountry) {
            onSelectRegion(group.regionId);
            zoomToRegion(group.regionId);
          } else {
            onSelectCountry(group.code);
            zoomToCountry(group.code);
          }
        };

        const marker = new Marker({ element: el }).setLngLat(group.coords).addTo(map);
        markersRef.current.push(marker);
      });
      return;
    }

    // Tier 2 (Zoom 3.2 to 4.8): Collapsed Regional Polaroid with Red Rounded Rectangle Count (Req 4, 5)
    // No emojis tagged; red rounded rectangle count badge capped at "99+"
    if (mapZoom < 4.8) {
      const clusterByRegion: Record<
        string,
        { post: ExplorePost; count: number; regionId: string }
      > = {};
      visiblePosts.forEach((p) => {
        const key = p.region || p.country;
        if (!clusterByRegion[key]) {
          clusterByRegion[key] = { post: p, count: 0, regionId: p.region };
        }
        clusterByRegion[key].count += 1;
      });

      Object.values(clusterByRegion).forEach(({ post, count, regionId }) => {
        const countBadge = count > 99 ? "99+" : count;
        const el = document.createElement("button");
        el.className =
          "group relative p-1 rounded-md bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 shadow-md hover:shadow-xl hover:border-[#d94e34] dark:hover:border-[#ef4444] transition-colors cursor-pointer select-none";
        el.setAttribute("aria-label", `${count} posts in ${post.city}`);

        el.innerHTML = `
          <div class="relative w-13 h-13 rounded overflow-hidden bg-stone-100 dark:bg-stone-800">
            <img src="${post.image || post.avatar}" alt="${post.city}" class="w-full h-full object-cover pointer-events-none" />
            <span class="absolute bottom-0.5 right-0.5 px-1.5 py-0.2 rounded-full bg-[#d94e34] text-white font-mono text-[9px] font-bold shadow border border-white dark:border-stone-900 leading-none">
              ${countBadge}
            </span>
          </div>
          <div class="text-[9px] font-sans font-semibold text-center mt-0.5 text-stone-800 dark:text-white truncate max-w-[52px]">
            ${post.city}
          </div>
        `;

        el.onclick = (e) => {
          e.stopPropagation();
          if (regionId) {
            onSelectRegion(regionId);
            zoomToRegion(regionId);
          } else {
            onSelectCountry(post.country);
            zoomToCountry(post.country);
          }
        };

        const marker = new Marker({ element: el }).setLngLat(post.coordinates).addTo(map);
        markersRef.current.push(marker);
      });
      return;
    }

    // Tier 3 (Zoom >= 4.8): Compact Spread-out Post Polaroids (Req 1, 5)
    // Scaled to a compact footprint (76px to 94px) so it never blocks the map underneath.
    // Zero emojis attached.
    const zoomProgress = Math.min(1, Math.max(0, (mapZoom - 4.8) / 3.0));
    const cardWidth = Math.round(76 + zoomProgress * 18); // 76px to 94px compact width
    const imageHeight = Math.round(cardWidth * 0.72);

    visiblePosts.forEach((post) => {
      const isSelected = post.id === selectedPostId;
      const el = document.createElement("button");
      el.className = `group relative p-1 rounded-md bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 shadow-sm hover:shadow-lg transition-colors cursor-pointer select-none ${
        isSelected
          ? "ring-2 ring-[#d94e34] ring-offset-1 ring-offset-[var(--bg-primary)] z-30 shadow-xl border-[#d94e34]"
          : "z-10 hover:border-[#d94e34] dark:hover:border-[#ef4444]"
      }`;
      el.style.width = `${cardWidth}px`;
      el.setAttribute("aria-label", `Story by ${post.author} in ${post.city}`);

      if (post.isTextOnly || !post.image) {
        el.innerHTML = `
          <div class="p-1 rounded bg-amber-50/60 dark:bg-stone-800/60 text-left">
            <p class="text-[9px] text-stone-800 dark:text-white font-sans line-clamp-2 leading-tight">
              "${post.caption}"
            </p>
            <span class="text-[8px] font-mono text-stone-500 dark:text-stone-300 block mt-0.5 truncate">${post.author} · ${post.city}</span>
          </div>
        `;
      } else {
        el.innerHTML = `
          <div class="relative w-full rounded overflow-hidden bg-stone-100 dark:bg-stone-800" style="height: ${imageHeight}px;">
            <img src="${post.image}" alt="${post.city}" class="w-full h-full object-cover pointer-events-none" />
            <span class="absolute bottom-0.5 right-0.5 px-1 py-0.2 rounded bg-black/75 text-white font-mono text-[8px] font-bold shadow-xs leading-none">
              ${post.city}
            </span>
          </div>
          <div class="pt-0.5 text-left flex items-center justify-between">
            <span class="text-[9px] font-sans font-medium text-stone-800 dark:text-white truncate max-w-[50px]">
              ${post.author}
            </span>
            <span class="text-[8px] font-mono text-stone-500 dark:text-stone-300">
              ${post.likes}
            </span>
          </div>
        `;
      }

      el.onclick = (e) => {
        e.stopPropagation();
        onSelectPost(post.id);
        setActivePeekPost(post);

        const point = map.project(post.coordinates);
        setPeekCoords({ x: point.x, y: point.y });
      };

      const marker = new Marker({ element: el }).setLngLat(post.coordinates).addTo(map);
      markersRef.current.push(marker);
    });
  }, [
    posts,
    selectedCountry,
    selectedPostId,
    mapZoom,
    onSelectCountry,
    onSelectRegion,
    onSelectPost,
    zoomToCountry,
    zoomToRegion,
    isDark,
  ]);

  // Keep peek aligned with camera movements
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !activePeekPost) return;

    const updatePeekPos = () => {
      const point = map.project(activePeekPost.coordinates);
      setPeekCoords({ x: point.x, y: point.y });
    };

    map.on("move", updatePeekPos);
    return () => {
      map.off("move", updatePeekPos);
    };
  }, [activePeekPost]);

  return (
    <div className="relative w-full h-full overflow-hidden select-none">
      {/* MapLibre WebGL Canvas Container */}
      <div ref={containerRef} className="w-full h-full" />

      {/* Accessible Sketchbook Fallback when WebGL2 is unavailable */}
      {mapError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-[var(--bg-primary)] z-20">
          <div className="max-w-md p-6 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)]/80 backdrop-blur-md shadow-xl space-y-3">
            <span className="text-3xl">🗺️</span>
            <h3 className="font-hand text-2xl font-bold text-[var(--ink-primary)]">
              Travel Atlas Sketchbook
            </h3>
            <p className="text-xs text-[var(--ink-secondary)] leading-relaxed">{mapError}</p>
            <div className="pt-2">
              <span className="text-[11px] font-mono text-[var(--ink-secondary)] uppercase tracking-wider block mb-2">
                Quick Geographic Jumps
              </span>
              <div className="flex flex-wrap justify-center gap-1.5 text-xs">
                {[
                  { code: "JP", name: "Japan" },
                  { code: "US", name: "United States" },
                  { code: "ID", name: "Indonesia" },
                  { code: "FR", name: "France" },
                  { code: "IT", name: "Italy" },
                  { code: "ES", name: "Spain" },
                  { code: "DE", name: "Germany" },
                  { code: "AU", name: "Australia" },
                  { code: "BR", name: "Brazil" },
                  { code: "SG", name: "Singapore" },
                ].map((item) => (
                  <button
                    key={item.code}
                    onClick={() => {
                      onSelectCountry(item.code);
                      zoomToCountry(item.code);
                    }}
                    className="px-2.5 py-1 rounded-md bg-[var(--bg-elevated)] border border-[var(--border-color)] text-[var(--ink-primary)] hover:bg-[var(--bg-primary)] text-xs font-medium cursor-pointer"
                  >
                    {item.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating Photo Peek Popover */}
      {activePeekPost && peekCoords && (
        <div
          className="absolute z-40 transform -translate-x-1/2 -translate-y-full mb-3 pointer-events-auto"
          style={{
            left: `${peekCoords.x}px`,
            top: `${peekCoords.y}px`,
          }}
        >
          <PhotoPeek
            post={activePeekPost}
            onOpenPost={(postId) => {
              onSelectPost(postId);
              setActivePeekPost(null);
            }}
            onClose={() => setActivePeekPost(null)}
          />
        </div>
      )}
    </div>
  );
}
