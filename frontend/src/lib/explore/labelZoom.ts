// Zoom thresholds for map labels, derived from on-screen size.
// MapLibre's world is 512 * 2^zoom px wide in Web Mercator.

type Bounds = [[number, number], [number, number]];

export const MIN_LABEL_PX = 11;
// Small countries get a label at this zoom even if the name overflows their outline.
export const SMALL_COUNTRY_ZOOM = 5;

const mercY = (lat: number) => Math.log(Math.tan(Math.PI / 4 + (Math.max(-85, Math.min(85, lat)) * Math.PI) / 360));

// Zoom at which `text` at `fontPx` fits inside the area's bounding box (with 20% breathing room).
// charWidth is the average glyph width as a fraction of font size.
export function fitZoom([[w, s], [e, n]]: Bounds, text: string, fontPx = MIN_LABEL_PX, charWidth = 0.6): number {
  const widthAtZ0 = (Math.abs(e - w) / 360) * 512 * 0.8;
  const heightAtZ0 = (Math.abs(mercY(n) - mercY(s)) / (2 * Math.PI)) * 512 * 0.8;
  const textW = text.length * fontPx * charWidth + 8;
  const textH = fontPx * 1.3;
  if (widthAtZ0 <= 0 || heightAtZ0 <= 0) return 22;
  return Math.max(Math.log2(textW / widthAtZ0), Math.log2(textH / heightAtZ0));
}

// One zoom per country at which all its regions are labelled together:
// once the median region fits, the small ones come along with their neighbours.
export function stateZoomByCountry(
  regions: { country: string; name: string; shortName?: string; bounds?: Bounds }[]
): Record<string, number> {
  const fits: Record<string, number[]> = {};
  for (const r of regions) {
    if (!r.bounds) continue;
    (fits[r.country] ??= []).push(fitZoom(r.bounds, r.shortName || r.name));
  }
  const out: Record<string, number> = {};
  for (const [country, zs] of Object.entries(fits)) {
    zs.sort((a, b) => a - b);
    out[country] = zs[Math.floor((zs.length - 1) / 2)];
  }
  return out;
}

// Country names: bold uppercase with tracking, so glyphs run wider.
export function countryLabelZoom(bounds: Bounds, name: string): number {
  return Math.min(fitZoom(bounds, name, MIN_LABEL_PX, 0.78), SMALL_COUNTRY_ZOOM);
}
