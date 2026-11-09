import type { StyleSpecification } from "maplibre-gl";

export interface SketchbookThemeTokens {
  paperBackground: string;
  landFill: string;
  landHover: string;
  landSelected: string;
  graphiteBorder: string;
  regionBorder: string;
  disputedLine: string;
  graticuleColor: string;
  inkPrimary: string;
  inkSecondary: string;
  pinBorder: string;
}

export const LIGHT_TOKENS: SketchbookThemeTokens = {
  paperBackground: "#f8f5ee", // Warm white / handmade cream paper
  landFill: "#eae4d8",       // Pale warm gray land fill
  landHover: "#dfd8cb",      // Hovered land fill
  landSelected: "#d5cbb9",   // Selected country fill
  graphiteBorder: "#34312d", // Fine graphite stroke
  regionBorder: "#787268",   // Subtle subnational stroke
  disputedLine: "#8c3b2d",   // Terracotta dashed dispute line
  graticuleColor: "rgba(60, 50, 40, 0.06)",
  inkPrimary: "#1f1d1a",
  inkSecondary: "#6c665e",
  pinBorder: "#ffffff",
};

export const DARK_TOKENS: SketchbookThemeTokens = {
  paperBackground: "#18181c", // Dark charcoal paper
  landFill: "#24242c",       // Soft charcoal gray land fill
  landHover: "#2e2e38",      // Hovered land fill
  landSelected: "#3a3a48",   // Selected country fill
  graphiteBorder: "#888894", // Light graphite stroke
  regionBorder: "#555562",   // Subtle subnational stroke
  disputedLine: "#e06c58",   // Soft terracotta dashed dispute line
  graticuleColor: "rgba(255, 255, 255, 0.05)",
  inkPrimary: "#f5f5f7",
  inkSecondary: "#a1a1aa",
  pinBorder: "#2a2a32",
};

export function getSketchbookMapStyle(isDark: boolean): StyleSpecification {
  const tokens = isDark ? DARK_TOKENS : LIGHT_TOKENS;

  return {
    version: 8,
    name: isDark ? "Travel Doodles Sketchbook (Dark)" : "Travel Doodles Sketchbook (Light)",
    sources: {
      countries: {
        type: "geojson",
        data: "/data/geo/countries.geojson",
        generateId: true
      },
      regions: {
        type: "geojson",
        data: "/data/geo/regions.geojson",
        generateId: true
      }
    },
    layers: [
      // Base paper texture canvas
      {
        id: "background",
        type: "background",
        paint: {
          "background-color": tokens.paperBackground,
        }
      },

      // Country polygon fills
      {
        id: "countries-fill",
        type: "fill",
        source: "countries",
        paint: {
          "fill-color": [
            "case",
            ["boolean", ["feature-state", "selected"], false],
            tokens.landSelected,
            ["boolean", ["feature-state", "hovered"], false],
            tokens.landHover,
            tokens.landFill
          ],
          "fill-opacity": 0.95
        }
      },

      // Subnational regional fills (rendered when zoomed in)
      {
        id: "regions-fill",
        type: "fill",
        source: "regions",
        minzoom: 2.8,
        paint: {
          "fill-color": [
            "case",
            ["boolean", ["feature-state", "selected"], false],
            tokens.landSelected,
            ["boolean", ["feature-state", "hovered"], false],
            tokens.landHover,
            "transparent"
          ],
          "fill-opacity": 0.45
        }
      },

      // Subnational region dashed boundaries (appears when zooming in)
      {
        id: "regions-border",
        type: "line",
        source: "regions",
        minzoom: 2.8,
        paint: {
          "line-color": tokens.regionBorder,
          "line-width": 1.1,
          "line-dasharray": [3, 2],
          "line-opacity": 0.85
        }
      },

      // Crisp graphite country outer borders
      {
        id: "countries-border",
        type: "line",
        source: "countries",
        paint: {
          "line-color": tokens.graphiteBorder,
          "line-width": [
            "case",
            ["boolean", ["feature-state", "selected"], false],
            2.2,
            1.1
          ],
          "line-opacity": 0.95
        }
      }
    ]
  };
}
