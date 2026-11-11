"use client";

import React, { Suspense, useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import type { Map as MapLibreMap } from "maplibre-gl";
import { ExploreToolbar, InventoryItem } from "@/components/explore/ExploreToolbar";
import { SketchbookMap } from "@/components/explore/SketchbookMap";
import { RegionalFeed, RegionItem } from "@/components/explore/RegionalFeed";
import { MobileFeedSheet } from "@/components/explore/MobileFeedSheet";
import { PaperGrainOverlay } from "@/components/explore/PaperGrainOverlay";
import { MOCK_POSTS, getPostsByLocation, ExplorePost } from "@/lib/explore/mockPosts";
import { api } from "@/lib/api";

function ExploreContent() {
  const searchParams = useSearchParams();

  // URL state synchronization
  const urlCountry = searchParams.get("country");
  const urlRegion = searchParams.get("region");
  const urlPost = searchParams.get("post");
  const urlCity = searchParams.get("city");

  const [selectedCountry, setSelectedCountry] = useState<string | null>(urlCountry);
  const [selectedRegion, setSelectedRegion] = useState<string | null>(urlRegion);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(urlPost);
  const [visibilityFilter, setVisibilityFilter] = useState<"everyone" | "friends">("everyone");
  const [selectedCity, setSelectedCity] = useState<string | null>(urlCity);

  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [regionsInventory, setRegionsInventory] = useState<Record<string, RegionItem[]>>({});
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const mapInstanceRef = useRef<MapLibreMap | null>(null);

  // Detect mobile viewport
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Fetch machine-readable geography inventory & regional directory
  useEffect(() => {
    fetch("/data/geography-inventory.json")
      .then((res) => res.json())
      .then((data: InventoryItem[]) => {
        setInventory(data);
      })
      .catch((err) => {
        console.error("Failed to load geography inventory:", err);
      });

    fetch("/data/regions-inventory.json")
      .then((res) => res.json())
      .then((data: Record<string, RegionItem[]>) => {
        setRegionsInventory(data);
      })
      .catch((err) => {
        console.error("Failed to load regions inventory:", err);
      });
  }, []);

  // Synchronize state with URL parameters
  useEffect(() => {
    if (urlCountry) {
      setSelectedCountry(urlCountry);
      setIsSidebarOpen(true);
    }
    if (urlRegion) {
      setSelectedRegion(urlRegion);
      setIsSidebarOpen(true);
    }
    if (urlPost) {
      setSelectedPostId(urlPost);
    }
    if (urlCity) {
      setSelectedCity(urlCity);
      setIsSidebarOpen(true);
    }
  }, [urlCountry, urlRegion, urlPost, urlCity]);

  // Push URL changes cleanly for deliberate user actions
  const updateUrl = useCallback(
    (country: string | null, region: string | null, post: string | null) => {
      const params = new URLSearchParams();
      if (country) params.set("country", country);
      if (region) params.set("region", region);
      if (post) params.set("post", post);
      const queryString = params.toString();
      const newUrl = queryString ? `/explore?${queryString}` : "/explore";
      window.history.pushState({}, "", newUrl);
    },
    []
  );

  // Country selection handler
  const handleSelectCountry = (countryCode: string) => {
    setSelectedCountry(countryCode);
    setSelectedRegion(null);
    setSelectedPostId(null);
    setSelectedCity(null);
    setIsSidebarOpen(true);
    updateUrl(countryCode, null, null);
  };

  // Region selection handler: centers region on the map taking up ~70% of available window
  const handleSelectRegion = (regionId: string) => {
    setSelectedRegion(regionId);
    setSelectedPostId(null);
    setSelectedCity(null);
    setIsSidebarOpen(true);
    updateUrl(selectedCountry, regionId, null);

    // Smoothly center and fit the selected state/region chunk filling 70% of the visible window
    const allRegions = selectedCountry ? (regionsInventory[selectedCountry] || []) : Object.values(regionsInventory).flat();
    const found = allRegions.find((r) => r.id === regionId);
    if (found && mapInstanceRef.current && found.bounds) {
      const map = mapInstanceRef.current;
      map.resize();
      const container = map.getContainer();
      const mapW = container?.clientWidth || (window.innerWidth - (!isMobile ? 380 : 0));
      const mapH = container?.clientHeight || window.innerHeight;
      const mobileSheetH = isMobile ? Math.round(mapH * 0.45) : 0;
      const availH = Math.max(200, mapH - mobileSheetH);

      // 70% window coverage -> 15% margin on each side
      const padX = Math.round(mapW * 0.15);
      const padTop = Math.round(availH * 0.15);
      const padBottom = padTop + mobileSheetH;

      map.fitBounds(found.bounds, {
        padding: { top: padTop, bottom: padBottom, left: padX, right: padX },
        maxZoom: 15,
        duration: 850,
      });
    }
  };

  // Post selection handler
  const handleSelectPost = (postId: string) => {
    setSelectedPostId(postId);
    const post = MOCK_POSTS.find((p) => p.id === postId);
    if (post) {
      if (!selectedCountry) setSelectedCountry(post.country);
      if (!selectedRegion) setSelectedRegion(post.region);
      updateUrl(post.country, post.region, postId);
    }
  };

  // Reset to world overview
  const handleResetWorld = () => {
    setSelectedCountry(null);
    setSelectedRegion(null);
    setSelectedPostId(null);
    setSelectedCity(null);
    setIsSidebarOpen(false);
    updateUrl(null, null, null);

    if (mapInstanceRef.current) {
      mapInstanceRef.current.easeTo({
        center: [15, 25],
        zoom: 1.6,
        duration: 700,
        padding: { top: 0, bottom: 0, left: 0, right: 0 },
      });
    }
  };

  // Zoom controls
  const handleZoomIn = () => {
    if (mapInstanceRef.current) mapInstanceRef.current.zoomIn({ duration: 300 });
  };
  const handleZoomOut = () => {
    if (mapInstanceRef.current) mapInstanceRef.current.zoomOut({ duration: 300 });
  };

  // Real posts state from backend
  const [realPosts, setRealPosts] = useState<ExplorePost[]>([]);
  const [hasLoadedApi, setHasLoadedApi] = useState(false);

  // Fetch real data from backend API
  useEffect(() => {
    let isMounted = true;

    api.getPosts({
      country: selectedCountry || undefined,
      region: selectedRegion || undefined,
      city: selectedCity || undefined,
      visibility: visibilityFilter,
    })
      .then((posts) => {
        if (isMounted) {
          setRealPosts(posts);
          setHasLoadedApi(true);
        }
      })
      .catch((err) => {
        console.warn("Backend API fetch notice, using local atlas cache:", err);
        if (isMounted) {
          setHasLoadedApi(true);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [selectedCountry, selectedRegion, selectedCity, visibilityFilter]);

  // Derive relevant posts: use real backend data once loaded, with instant fallback
  const activePosts = React.useMemo(() => {
    if (hasLoadedApi && realPosts.length > 0) {
      return realPosts;
    }
    return getPostsByLocation(
      selectedCountry || undefined,
      selectedRegion || undefined,
      visibilityFilter
    );
  }, [hasLoadedApi, realPosts, selectedCountry, selectedRegion, visibilityFilter]);

  // Current country & region metadata
  const currentCountry = inventory.find((i) => i.code === selectedCountry);
  const countryDisplayName = currentCountry ? currentCountry.displayName : selectedCountry || "";

  // Structured regions/states catalog for the selected country
  const countryRegions = React.useMemo(() => {
    if (!selectedCountry) return [];
    return regionsInventory[selectedCountry] || [];
  }, [selectedCountry, regionsInventory]);

  // Lookup active region details dynamically from inventory
  const activeRegionItem = React.useMemo(() => {
    if (!selectedRegion) return null;
    if (selectedCountry && regionsInventory[selectedCountry]) {
      const found = regionsInventory[selectedCountry].find((r) => r.id === selectedRegion);
      if (found) return found;
    }
    for (const list of Object.values(regionsInventory)) {
      const found = list.find((r) => r.id === selectedRegion);
      if (found) return found;
    }
    return null;
  }, [selectedRegion, selectedCountry, regionsInventory]);

  const fallbackRegionNames: Record<string, { name: string; local: string }> = {
    "JP-13": { name: "Tokyo", local: "東京都" },
    "JP-26": { name: "Kyoto", local: "京都府" },
    "JP-27": { name: "Osaka", local: "大阪府" },
    "US-CA": { name: "California", local: "California" },
    "US-NY": { name: "New York", local: "New York" },
    "US-HI": { name: "Hawaii", local: "Hawaii" },
    "US-AK": { name: "Alaska", local: "Alaska" },
    "ID-BA": { name: "Bali", local: "Provinsi Bali" },
    "FR-IDF": { name: "Île-de-France", local: "Île-de-France (Paris)" },
    "IT-62": { name: "Lazio", local: "Lazio (Roma)" },
    "AU-NSW": { name: "New South Wales", local: "NSW (Sydney)" },
    "BR-RJ": { name: "Rio de Janeiro", local: "Estado do Rio de Janeiro" },
  };

  const fallbackMeta = selectedRegion ? fallbackRegionNames[selectedRegion] : null;
  const regionDisplayName = activeRegionItem
    ? activeRegionItem.shortName && activeRegionItem.shortName !== activeRegionItem.name
      ? `${activeRegionItem.name} (${activeRegionItem.shortName})`
      : activeRegionItem.name
    : fallbackMeta
    ? fallbackMeta.name
    : selectedRegion || "";
  const regionLocalName = activeRegionItem ? activeRegionItem.localName : fallbackMeta ? fallbackMeta.local : "";

  // Available cities for the selected region
  const availableCities = React.useMemo(() => {
    const cityMap: Record<string, Array<{ id: string; name: string }>> = {
      "JP-13": [{ id: "c1", name: "Tokyo" }, { id: "c2", name: "Shinjuku" }, { id: "c3", name: "Shibuya" }],
      "JP-26": [{ id: "c4", name: "Kyoto" }, { id: "c5", name: "Uji" }],
      "US-CA": [{ id: "c6", name: "San Francisco" }, { id: "c7", name: "Los Angeles" }],
      "US-NY": [{ id: "c8", name: "New York City" }, { id: "c9", name: "Brooklyn" }],
      "ID-BA": [{ id: "c10", name: "Denpasar" }, { id: "c11", name: "Ubud" }, { id: "c12", name: "Seminyak" }],
      "FR-IDF": [{ id: "c13", name: "Paris" }, { id: "c14", name: "Versailles" }],
      "IT-62": [{ id: "c15", name: "Rome" }, { id: "c16", name: "Tivoli" }],
    };
    if (selectedRegion && cityMap[selectedRegion]) return cityMap[selectedRegion];
    return [];
  }, [selectedRegion]);

  return (
    <div className="explore-shell">
      {/* Top Slim Sketchbook Toolbar */}
      <ExploreToolbar
        inventory={inventory}
        selectedCountry={selectedCountry}
        visibilityFilter={visibilityFilter}
        onVisibilityChange={setVisibilityFilter}
        onSelectCountry={handleSelectCountry}
        onResetWorld={handleResetWorld}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
      />

      {/* Main Map Viewport & Sliding Sidebar Container */}
      <main id="main-content" tabIndex={-1} className="flex-1 min-h-0 relative overflow-hidden flex">
        {/* Watercolor Paper Grain Overlay */}
        <PaperGrainOverlay />

        {/* Map Canvas */}
        <div className="flex-1 h-full w-full relative">
          <SketchbookMap
            inventory={inventory}
            selectedCountry={selectedCountry}
            selectedRegion={selectedRegion}
            onSelectCountry={handleSelectCountry}
            onSelectRegion={handleSelectRegion}
            posts={activePosts}
            selectedPostId={selectedPostId}
            onSelectPost={handleSelectPost}
            isSidebarOpen={isSidebarOpen}
            isMobile={isMobile}
            mapInstanceRef={mapInstanceRef}
          />
        </div>

        {/* Desktop Slide-over Drawer (380px) */}
        {isSidebarOpen && !isMobile && (
          <div className="w-[380px] xl:w-[410px] h-full flex-shrink-0 animate-in slide-in-from-right duration-300">
            <RegionalFeed
              countryCode={selectedCountry}
              countryName={countryDisplayName}
              regionId={selectedRegion}
              regionName={regionDisplayName}
              regionLocalName={regionLocalName}
              regionsList={countryRegions}
              onSelectRegion={handleSelectRegion}
              cities={availableCities}
              selectedCity={selectedCity}
              onSelectCity={setSelectedCity}
              posts={activePosts}
              selectedPostId={selectedPostId}
              onSelectPost={handleSelectPost}
              onClose={() => {
                setIsSidebarOpen(false);
                if (mapInstanceRef.current) {
                  // Restore full unobscured viewport smoothly
                  mapInstanceRef.current.easeTo({
                    padding: { top: 40, bottom: 40, left: 40, right: 40 },
                    duration: 250,
                  });
                }
              }}
              visibilityFilter={visibilityFilter}
              onBackToWorld={handleResetWorld}
              onBackToCountry={() => {
                setSelectedRegion(null);
                setSelectedPostId(null);
                if (selectedCountry) updateUrl(selectedCountry, null, null);
              }}
            />
          </div>
        )}

        {/* Mobile Bottom Sheet */}
        {isSidebarOpen && isMobile && (
          <MobileFeedSheet
            countryCode={selectedCountry}
            countryName={countryDisplayName}
            regionId={selectedRegion}
            regionName={regionDisplayName}
            regionLocalName={regionLocalName}
            regionsList={countryRegions}
            onSelectRegion={handleSelectRegion}
            cities={availableCities}
            selectedCity={selectedCity}
            onSelectCity={setSelectedCity}
            posts={activePosts}
            selectedPostId={selectedPostId}
            onSelectPost={handleSelectPost}
            onClose={() => setIsSidebarOpen(false)}
            visibilityFilter={visibilityFilter}
            onBackToWorld={handleResetWorld}
            onBackToCountry={() => {
              setSelectedRegion(null);
              setSelectedPostId(null);
              if (selectedCountry) updateUrl(selectedCountry, null, null);
            }}
          />
        )}
      </main>
    </div>
  );
}

export default function ExplorePage() {
  return (
    <Suspense
      fallback={
        <div className="h-screen w-screen flex items-center justify-center bg-[var(--bg-primary)] text-[var(--ink-secondary)] font-mono text-xs">
          Loading Atlas Sketchbook...
        </div>
      }
    >
      <ExploreContent />
    </Suspense>
  );
}
