# Travel Doodles · Interactive World Map

## Copy-ready build prompt

Build the `/explore` experience for **Travel Doodles**, a social travel journal where people discover photos and stories by exploring a world map. Implement a working Next.js App Router feature in TypeScript and Tailwind CSS. Start with a map-led, usable screen and finish with the data pipeline, coverage report, and browser tests. Use the coverage checklist at the end of this brief as the acceptance inventory.

### 1. Art direction · A travel sketchbook

Make the map fill the available viewport beneath a slim toolbar. Use warm white paper, pale gray land fills, and graphite borders in light mode. Use charcoal paper, soft gray land fills, and light graphite borders in dark mode. Let travel photography supply the color in both themes. A faint paper grain, occasional hand-drawn compass or dashed trail, and small white-edged photo pins make the atlas feel handmade. Keep geographic borders crisp and place names easy to read. Use a handwriting face sparingly for titles or annotations and a readable UI face for controls, labels, and captions.

Place the wordmark, place search, and **Explore / Friends** switch in the toolbar. Provide labeled zoom controls, **Back to world**, and a light/dark toggle. Keep controls and attribution visible when the sidebar is open. Treat the sidebar as a page of the same sketchbook, with a fine rule, generous spacing, and full-color photos.

### 2. Geography · Real boundaries at every zoom

- Use **MapLibre GL JS** for a single persistent map canvas. Render the map as a client component and keep the surrounding Next.js shell lightweight. Use Tailwind and shared CSS tokens for the interface, and matching MapLibre style tokens for the map.
- Ingest versioned vector data. Use [geoBoundaries gbOpen](https://www.geoboundaries.org/api.html) for country and first-order administrative geometry where suitable. Check data coverage and suitability against the inventory before committing to a source. Add documented, licensed fallbacks where boundaries are missing, outdated, or inconsistent. Use a vetted [OpenStreetMap-derived place layer](https://openmaptiles.org/docs/schema/#place) for cities and towns. A city is a label or point by default. Draw city boundaries only where a reliable administrative polygon exists.
- Preserve real coastlines, islands, holes, enclaves, and multipolygons. Use topology-aware simplification for world zooms and higher-detail geometry as users zoom in. Derive fills, strokes, highlights, and hit testing from the same source geometry and stable feature IDs. Country outlines are geographic vector features. Reserve hand-drawn SVGs for decorations and optional thumbnails generated from source geometry.
- Pick and document one boundary worldview. Render disputes and claims with a distinct dashed style and a legend. Keep disputed overlays separate from ordinary hit areas and make overlapping selections deterministic. Record source, version, date, license, and any exceptions in a manifest. Keep source attribution visible in both themes. [Boundary policy example](https://www.naturalearthdata.com/about/disputed-boundaries-policy/) · [OSM attribution](https://www.openstreetmap.org/copyright)
- Keep tiny states and islands selectable through place search and carefully positioned point targets at low zoom. Use their real polygons at close zoom. Handle antimeridian crossings and countries with widely separated islands using wrapped bounds, a useful initial focus, and a way to jump to outlying parts. Use a projection that supports the required polar coverage, or provide a navigable polar view for areas clipped by the default projection.
- Support first-order regions under their local names, such as states, provinces, prefectures, governorates, and cantons. A country or area with no applicable or verified first-order layer opens a country-level feed and can show cities where available. Give every missing or inapplicable layer an explicit status with evidence. A missing dataset is a coverage gap.

### 3. Navigation and motion

| User action | Expected behavior |
| --- | --- |
| Open the world map | Show country outlines, a restrained set of labels, and aggregated post counts. Country search can reach every inventory entry. |
| Zoom or pan with mouse, keyboard, or touch | Move continuously. Reveal smaller countries, subnational lines, and more city labels as zoom increases. Pan and zoom preserve the current selection until the user changes it. |
| Click a country or choose one in search | Highlight the country and ease to its bounds. Fade in first-order boundaries and city labels as their tiles arrive. Show a compact country header with a searchable region list. |
| Click a region or choose one in search | Highlight the region, open its feed, and fit its bounds into the unobscured map. Prioritize region hit targets over country fills within the active country. |
| Click a city, cluster, or photo pin | A city focuses the place and can filter the parent region feed. A cluster expands or zooms toward its posts. A photo pin opens a peek and selects the matching feed item. Selecting a feed item highlights its pin. |
| Go back, close the feed, or reset | Closing the feed keeps the selected region and removes panel padding smoothly. Breadcrumb or browser Back restores the previous selection and camera. **Back to world** clears selection and animates to the overview. |

Use MapLibre's `fitBounds` or `easeTo` for camera movement. Keep the canvas mounted across selection, URL, and theme changes. Use viewport padding for the desktop sidebar and the open mobile sheet. Drive each focus action with one camera transition so sidebar movement and camera movement do not compete. Make animations interruptible from the current view when users tap another place or start dragging. Use roughly **450–750 ms** for camera focus and **180–260 ms** for panel transitions as starting values. Ease to a stop, keep landmarks legible during the move, and honor `prefers-reduced-motion`. [MapLibre camera options](https://maplibre.org/maplibre-gl-js/docs/API/type-aliases/FitBoundsOptions/)

Use deep links such as `/explore?country=JP&region=<stable-region-id>&post=<post-id>`. Push history for deliberate selections and avoid creating a history entry for each pan frame. Reopening a link must restore the intended geography, panel, and post even if map tiles are still loading.

### 4. Photos and posts on the map

At world scale show quiet count clusters. At country and region scale reveal representative thumbnail pins, with collision handling and a simple dot for text-only posts. Use small Polaroid-style frames and a visible focus ring. Give photos consistent dimensions and lazy-load only the thumbnails near the viewport. Keep other pins usable on phones through tap interactions.

A thumbnail peek shows the photo, author, place, and first line of the caption with an **Open post** action. Link posts by stable post and region IDs. Use a coarse place point for approximate locations. Apply the same audience rules to map counts, clusters, thumbnails, and sidebar data. Use public or authorized data for **Explore** and **Friends**.

### 5. Regional feed design

**Desktop.** Slide a right-hand panel about **360–420 px** wide over the map. Use a sticky header with country and region breadcrumb, the region title, city or region selector, post count when available, and a labeled close button. Under it, show **Recent / Popular** and optional **All posts / Photos** controls. The toolbar's Explore/Friends switch applies to both the map and panel.

**Mobile.** Use the same feed as a bottom sheet with collapsed, half-height, and expanded states. Provide labeled expand and collapse controls as alternatives to dragging. Keep the map usable above the sheet, respect safe areas, and bring keyboard focus back to the previous control when it closes.

**Feed cards.** Show avatar, name, visit or post date with a clear label, and place. Give the photo most of the card, followed by a short caption and **Like**, **Comment**, and **Share**. Support text-only posts. Use a stable public link for sharing and integrate social actions with the existing app interfaces. If those interfaces are absent, provide a clearly labeled demo adapter. Do not present demo fixtures as live posts.

Design loading skeletons, no-post and no-friends results, retryable errors, unavailable thumbnails, and long names. Keep a selected card in view without unexpectedly resetting the feed's scroll position. Use cursor pagination with a visible **Load more** control. Make the search and region list a full keyboard alternative to pointing at polygons. Provide readable contrast and an announcement when the active region or feed changes. If the map cannot render, preserve search, region navigation, and access to the feed.

### 6. Agent skills and implementation tools

Use installed skill equivalents for the agent's environment. The slash names below describe the requested workflow. If a skill is unavailable, use the linked guidance directly and continue.

| Skill or tool | Assignment |
| --- | --- |
| [/frontend-design](https://github.com/anthropics/skills/tree/main/skills/frontend-design) | Establish the sketchbook art direction and compose the toolbar, map controls, pin treatments, and sidebar. |
| [/ui-ux-pro-max](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) | Check responsive layouts, interaction states, discoverability, contrast, and accessible controls. |
| [/design-motion-principles](https://github.com/kylezantos/design-motion-principles) | Define and audit camera, panel, and pin transitions. Some prompts call this `/design-motion-principle`. Use the installed name. |
| [/impeccable](https://github.com/pbakaus/impeccable) | Polish hierarchy and spacing, then audit both themes and the mobile sheet. |
| [MapLibre GL JS](https://maplibre.org/maplibre-gl-js/docs/) and [Next.js App Router](https://nextjs.org/docs/app) with Tailwind | Implement the map camera, layered vectors, feature selection, and app UI. |
| [QGIS](https://qgis.org/) and [Mapshaper](https://mapshaper.org/docs/guides/simplification.html) | Inspect and prepare geographic shapes. Use QGIS to review geometry against its source and Mapshaper to simplify shared borders while checking island and microstate retention. |
| [Tippecanoe](https://github.com/felt/tippecanoe) and [PMTiles](https://docs.protomaps.com/pmtiles/maplibre) | Build and serve viewport-loaded vector tiles. Verify geometry and IDs survive tiling across zoom levels. |
| SVG editor such as Figma or Inkscape | Draw compass marks, pins, and UI icons. Import geography-derived paths if a design needs standalone country silhouettes. |
| [Playwright](https://playwright.dev/) or the agent's browser tool | Verify interactions, keyboard paths, mobile sheet behavior, and light/dark screenshots in a real browser. |

### 7. Performance and handoff

Build boundary tiles offline and serve immutable, versioned map assets from object storage or a CDN with byte-range support when using PMTiles. Keep the 2-core, 4 GB application server focused on app requests. Load visible tiles first, and fetch markers and posts by area and audience. Cache public region reads briefly and prefetch likely next regions or the first Friends feed page within a bounded budget. Scope Friends cache keys to the viewer and authorization state. Debounce viewport requests, cancel stale requests, and prevent late responses from replacing the active feed. Keep the previous map layers visible during loads. Eventual consistency is acceptable for public counts. Access checks apply on every protected response.

Deliver all of the following:

1. A runnable `/explore` implementation with map, search, pins, sidebar, mobile sheet, and demo or production data adapter.
2. Reproducible map build scripts, versioned source manifest, attribution, and a machine-readable geography inventory. For each inventory entry record its code, display name and aliases, geometry ID, label anchor, camera bounds, first-order layer source and status, place source and status, feed routing, and validation status. Create a single reusable map feature pipeline for all rows.
3. A generated coverage report keyed to the checklist below. Validate unique codes and feature IDs, geometry type and validity, matching outlines and selection, reachable tiny areas, region links, city layers where applicable, and public or authorized feed behavior. Mark absent data as missing and inapplicable data as N/A with a reason. Keep the two states distinct. Use test fixtures for empty and populated feeds.
4. Browser tests for world → country → region → post → back, rapid interruption, direct links, empty/error/retry, keyboard, reduced motion, mobile touch, and theme switching. Sample Japan, the United States including Alaska and Hawaii, Indonesia, Fiji, Vatican City, Singapore, a disputed boundary, and a polar area. Run inventory validation across **every** row. Include setup steps and desktop/mobile screenshots with the delivery.

---

## Geography acceptance checklist

The core list contains **193 UN members and two observer states**. The extended list adds the other **54 ISO 3166-1 entries** so territories, dependencies, and separately coded areas are discoverable. **Kosovo** is included as an extra geographic feature using `XK` as a product code outside the ISO-assigned list. These are coverage groups for map testing. Use the boundary policy above for how areas are rendered and labeled. [UN members](https://www.un.org/en/about-us/member-states) · [UN observer states](https://research.un.org/en/unmembers/observers) · [ISO codes](https://www.iso.org/iso-3166-country-codes.html)

Each row starts pending. Fill the corresponding statuses in the generated coverage report. A check represents a tested deliverable, even when a feed has zero posts.

| Check | Pass condition |
| --- | --- |
| Shape | Source geometry, appropriate detail levels, visible outline, and stable feature ID. |
| Focus | Reachable from map or accessible search, correct highlight and animated camera, working deep link. |
| Regions + places | Verified first-order geometry and populated-place labels where applicable. Document separate region and place statuses and explain each N/A. |
| Feed + pins | Correct area routing and audience, populated and empty test states, and linked markers where fixture posts have a public display location. |

### Core country coverage · 195 entries

| Country or area | Code | Shape | Focus | Regions + places | Feed + pins |
| --- | --- | --- | --- | --- | --- |
| Afghanistan | `AF` | ☐ | ☐ | ☐ | ☐ |
| Albania | `AL` | ☐ | ☐ | ☐ | ☐ |
| Algeria | `DZ` | ☐ | ☐ | ☐ | ☐ |
| Andorra | `AD` | ☐ | ☐ | ☐ | ☐ |
| Angola | `AO` | ☐ | ☐ | ☐ | ☐ |
| Antigua & Barbuda | `AG` | ☐ | ☐ | ☐ | ☐ |
| Argentina | `AR` | ☐ | ☐ | ☐ | ☐ |
| Armenia | `AM` | ☐ | ☐ | ☐ | ☐ |
| Australia | `AU` | ☐ | ☐ | ☐ | ☐ |
| Austria | `AT` | ☐ | ☐ | ☐ | ☐ |
| Azerbaijan | `AZ` | ☐ | ☐ | ☐ | ☐ |
| Bahamas | `BS` | ☐ | ☐ | ☐ | ☐ |
| Bahrain | `BH` | ☐ | ☐ | ☐ | ☐ |
| Bangladesh | `BD` | ☐ | ☐ | ☐ | ☐ |
| Barbados | `BB` | ☐ | ☐ | ☐ | ☐ |
| Belarus | `BY` | ☐ | ☐ | ☐ | ☐ |
| Belgium | `BE` | ☐ | ☐ | ☐ | ☐ |
| Belize | `BZ` | ☐ | ☐ | ☐ | ☐ |
| Benin | `BJ` | ☐ | ☐ | ☐ | ☐ |
| Bhutan | `BT` | ☐ | ☐ | ☐ | ☐ |
| Bolivia | `BO` | ☐ | ☐ | ☐ | ☐ |
| Bosnia & Herzegovina | `BA` | ☐ | ☐ | ☐ | ☐ |
| Botswana | `BW` | ☐ | ☐ | ☐ | ☐ |
| Brazil | `BR` | ☐ | ☐ | ☐ | ☐ |
| Brunei | `BN` | ☐ | ☐ | ☐ | ☐ |
| Bulgaria | `BG` | ☐ | ☐ | ☐ | ☐ |
| Burkina Faso | `BF` | ☐ | ☐ | ☐ | ☐ |
| Burundi | `BI` | ☐ | ☐ | ☐ | ☐ |
| Cambodia | `KH` | ☐ | ☐ | ☐ | ☐ |
| Cameroon | `CM` | ☐ | ☐ | ☐ | ☐ |
| Canada | `CA` | ☐ | ☐ | ☐ | ☐ |
| Cape Verde | `CV` | ☐ | ☐ | ☐ | ☐ |
| Central African Republic | `CF` | ☐ | ☐ | ☐ | ☐ |
| Chad | `TD` | ☐ | ☐ | ☐ | ☐ |
| Chile | `CL` | ☐ | ☐ | ☐ | ☐ |
| China | `CN` | ☐ | ☐ | ☐ | ☐ |
| Colombia | `CO` | ☐ | ☐ | ☐ | ☐ |
| Comoros | `KM` | ☐ | ☐ | ☐ | ☐ |
| Costa Rica | `CR` | ☐ | ☐ | ☐ | ☐ |
| Côte d’Ivoire | `CI` | ☐ | ☐ | ☐ | ☐ |
| Croatia | `HR` | ☐ | ☐ | ☐ | ☐ |
| Cuba | `CU` | ☐ | ☐ | ☐ | ☐ |
| Cyprus | `CY` | ☐ | ☐ | ☐ | ☐ |
| Czechia | `CZ` | ☐ | ☐ | ☐ | ☐ |
| Democratic Republic of the Congo | `CD` | ☐ | ☐ | ☐ | ☐ |
| Denmark | `DK` | ☐ | ☐ | ☐ | ☐ |
| Djibouti | `DJ` | ☐ | ☐ | ☐ | ☐ |
| Dominica | `DM` | ☐ | ☐ | ☐ | ☐ |
| Dominican Republic | `DO` | ☐ | ☐ | ☐ | ☐ |
| Ecuador | `EC` | ☐ | ☐ | ☐ | ☐ |
| Egypt | `EG` | ☐ | ☐ | ☐ | ☐ |
| El Salvador | `SV` | ☐ | ☐ | ☐ | ☐ |
| Equatorial Guinea | `GQ` | ☐ | ☐ | ☐ | ☐ |
| Eritrea | `ER` | ☐ | ☐ | ☐ | ☐ |
| Estonia | `EE` | ☐ | ☐ | ☐ | ☐ |
| Eswatini | `SZ` | ☐ | ☐ | ☐ | ☐ |
| Ethiopia | `ET` | ☐ | ☐ | ☐ | ☐ |
| Fiji | `FJ` | ☐ | ☐ | ☐ | ☐ |
| Finland | `FI` | ☐ | ☐ | ☐ | ☐ |
| France | `FR` | ☐ | ☐ | ☐ | ☐ |
| Gabon | `GA` | ☐ | ☐ | ☐ | ☐ |
| Gambia | `GM` | ☐ | ☐ | ☐ | ☐ |
| Georgia | `GE` | ☐ | ☐ | ☐ | ☐ |
| Germany | `DE` | ☐ | ☐ | ☐ | ☐ |
| Ghana | `GH` | ☐ | ☐ | ☐ | ☐ |
| Greece | `GR` | ☐ | ☐ | ☐ | ☐ |
| Grenada | `GD` | ☐ | ☐ | ☐ | ☐ |
| Guatemala | `GT` | ☐ | ☐ | ☐ | ☐ |
| Guinea | `GN` | ☐ | ☐ | ☐ | ☐ |
| Guinea-Bissau | `GW` | ☐ | ☐ | ☐ | ☐ |
| Guyana | `GY` | ☐ | ☐ | ☐ | ☐ |
| Haiti | `HT` | ☐ | ☐ | ☐ | ☐ |
| Holy See (Vatican City) | `VA` | ☐ | ☐ | ☐ | ☐ |
| Honduras | `HN` | ☐ | ☐ | ☐ | ☐ |
| Hungary | `HU` | ☐ | ☐ | ☐ | ☐ |
| Iceland | `IS` | ☐ | ☐ | ☐ | ☐ |
| India | `IN` | ☐ | ☐ | ☐ | ☐ |
| Indonesia | `ID` | ☐ | ☐ | ☐ | ☐ |
| Iran | `IR` | ☐ | ☐ | ☐ | ☐ |
| Iraq | `IQ` | ☐ | ☐ | ☐ | ☐ |
| Ireland | `IE` | ☐ | ☐ | ☐ | ☐ |
| Israel | `IL` | ☐ | ☐ | ☐ | ☐ |
| Italy | `IT` | ☐ | ☐ | ☐ | ☐ |
| Jamaica | `JM` | ☐ | ☐ | ☐ | ☐ |
| Japan | `JP` | ☐ | ☐ | ☐ | ☐ |
| Jordan | `JO` | ☐ | ☐ | ☐ | ☐ |
| Kazakhstan | `KZ` | ☐ | ☐ | ☐ | ☐ |
| Kenya | `KE` | ☐ | ☐ | ☐ | ☐ |
| Kiribati | `KI` | ☐ | ☐ | ☐ | ☐ |
| Kuwait | `KW` | ☐ | ☐ | ☐ | ☐ |
| Kyrgyzstan | `KG` | ☐ | ☐ | ☐ | ☐ |
| Laos | `LA` | ☐ | ☐ | ☐ | ☐ |
| Latvia | `LV` | ☐ | ☐ | ☐ | ☐ |
| Lebanon | `LB` | ☐ | ☐ | ☐ | ☐ |
| Lesotho | `LS` | ☐ | ☐ | ☐ | ☐ |
| Liberia | `LR` | ☐ | ☐ | ☐ | ☐ |
| Libya | `LY` | ☐ | ☐ | ☐ | ☐ |
| Liechtenstein | `LI` | ☐ | ☐ | ☐ | ☐ |
| Lithuania | `LT` | ☐ | ☐ | ☐ | ☐ |
| Luxembourg | `LU` | ☐ | ☐ | ☐ | ☐ |
| Madagascar | `MG` | ☐ | ☐ | ☐ | ☐ |
| Malawi | `MW` | ☐ | ☐ | ☐ | ☐ |
| Malaysia | `MY` | ☐ | ☐ | ☐ | ☐ |
| Maldives | `MV` | ☐ | ☐ | ☐ | ☐ |
| Mali | `ML` | ☐ | ☐ | ☐ | ☐ |
| Malta | `MT` | ☐ | ☐ | ☐ | ☐ |
| Marshall Islands | `MH` | ☐ | ☐ | ☐ | ☐ |
| Mauritania | `MR` | ☐ | ☐ | ☐ | ☐ |
| Mauritius | `MU` | ☐ | ☐ | ☐ | ☐ |
| Mexico | `MX` | ☐ | ☐ | ☐ | ☐ |
| Micronesia | `FM` | ☐ | ☐ | ☐ | ☐ |
| Moldova | `MD` | ☐ | ☐ | ☐ | ☐ |
| Monaco | `MC` | ☐ | ☐ | ☐ | ☐ |
| Mongolia | `MN` | ☐ | ☐ | ☐ | ☐ |
| Montenegro | `ME` | ☐ | ☐ | ☐ | ☐ |
| Morocco | `MA` | ☐ | ☐ | ☐ | ☐ |
| Mozambique | `MZ` | ☐ | ☐ | ☐ | ☐ |
| Myanmar (Burma) | `MM` | ☐ | ☐ | ☐ | ☐ |
| Namibia | `NA` | ☐ | ☐ | ☐ | ☐ |
| Nauru | `NR` | ☐ | ☐ | ☐ | ☐ |
| Nepal | `NP` | ☐ | ☐ | ☐ | ☐ |
| Netherlands | `NL` | ☐ | ☐ | ☐ | ☐ |
| New Zealand | `NZ` | ☐ | ☐ | ☐ | ☐ |
| Nicaragua | `NI` | ☐ | ☐ | ☐ | ☐ |
| Niger | `NE` | ☐ | ☐ | ☐ | ☐ |
| Nigeria | `NG` | ☐ | ☐ | ☐ | ☐ |
| North Korea | `KP` | ☐ | ☐ | ☐ | ☐ |
| North Macedonia | `MK` | ☐ | ☐ | ☐ | ☐ |
| Norway | `NO` | ☐ | ☐ | ☐ | ☐ |
| Oman | `OM` | ☐ | ☐ | ☐ | ☐ |
| Pakistan | `PK` | ☐ | ☐ | ☐ | ☐ |
| Palau | `PW` | ☐ | ☐ | ☐ | ☐ |
| Panama | `PA` | ☐ | ☐ | ☐ | ☐ |
| Papua New Guinea | `PG` | ☐ | ☐ | ☐ | ☐ |
| Paraguay | `PY` | ☐ | ☐ | ☐ | ☐ |
| Peru | `PE` | ☐ | ☐ | ☐ | ☐ |
| Philippines | `PH` | ☐ | ☐ | ☐ | ☐ |
| Poland | `PL` | ☐ | ☐ | ☐ | ☐ |
| Portugal | `PT` | ☐ | ☐ | ☐ | ☐ |
| Qatar | `QA` | ☐ | ☐ | ☐ | ☐ |
| Republic of the Congo | `CG` | ☐ | ☐ | ☐ | ☐ |
| Romania | `RO` | ☐ | ☐ | ☐ | ☐ |
| Russia | `RU` | ☐ | ☐ | ☐ | ☐ |
| Rwanda | `RW` | ☐ | ☐ | ☐ | ☐ |
| Samoa | `WS` | ☐ | ☐ | ☐ | ☐ |
| San Marino | `SM` | ☐ | ☐ | ☐ | ☐ |
| São Tomé & Príncipe | `ST` | ☐ | ☐ | ☐ | ☐ |
| Saudi Arabia | `SA` | ☐ | ☐ | ☐ | ☐ |
| Senegal | `SN` | ☐ | ☐ | ☐ | ☐ |
| Serbia | `RS` | ☐ | ☐ | ☐ | ☐ |
| Seychelles | `SC` | ☐ | ☐ | ☐ | ☐ |
| Sierra Leone | `SL` | ☐ | ☐ | ☐ | ☐ |
| Singapore | `SG` | ☐ | ☐ | ☐ | ☐ |
| Slovakia | `SK` | ☐ | ☐ | ☐ | ☐ |
| Slovenia | `SI` | ☐ | ☐ | ☐ | ☐ |
| Solomon Islands | `SB` | ☐ | ☐ | ☐ | ☐ |
| Somalia | `SO` | ☐ | ☐ | ☐ | ☐ |
| South Africa | `ZA` | ☐ | ☐ | ☐ | ☐ |
| South Korea | `KR` | ☐ | ☐ | ☐ | ☐ |
| South Sudan | `SS` | ☐ | ☐ | ☐ | ☐ |
| Spain | `ES` | ☐ | ☐ | ☐ | ☐ |
| Sri Lanka | `LK` | ☐ | ☐ | ☐ | ☐ |
| St. Kitts & Nevis | `KN` | ☐ | ☐ | ☐ | ☐ |
| St. Lucia | `LC` | ☐ | ☐ | ☐ | ☐ |
| St. Vincent & Grenadines | `VC` | ☐ | ☐ | ☐ | ☐ |
| State of Palestine | `PS` | ☐ | ☐ | ☐ | ☐ |
| Sudan | `SD` | ☐ | ☐ | ☐ | ☐ |
| Suriname | `SR` | ☐ | ☐ | ☐ | ☐ |
| Sweden | `SE` | ☐ | ☐ | ☐ | ☐ |
| Switzerland | `CH` | ☐ | ☐ | ☐ | ☐ |
| Syria | `SY` | ☐ | ☐ | ☐ | ☐ |
| Tajikistan | `TJ` | ☐ | ☐ | ☐ | ☐ |
| Tanzania | `TZ` | ☐ | ☐ | ☐ | ☐ |
| Thailand | `TH` | ☐ | ☐ | ☐ | ☐ |
| Timor-Leste | `TL` | ☐ | ☐ | ☐ | ☐ |
| Togo | `TG` | ☐ | ☐ | ☐ | ☐ |
| Tonga | `TO` | ☐ | ☐ | ☐ | ☐ |
| Trinidad & Tobago | `TT` | ☐ | ☐ | ☐ | ☐ |
| Tunisia | `TN` | ☐ | ☐ | ☐ | ☐ |
| Türkiye | `TR` | ☐ | ☐ | ☐ | ☐ |
| Turkmenistan | `TM` | ☐ | ☐ | ☐ | ☐ |
| Tuvalu | `TV` | ☐ | ☐ | ☐ | ☐ |
| Uganda | `UG` | ☐ | ☐ | ☐ | ☐ |
| Ukraine | `UA` | ☐ | ☐ | ☐ | ☐ |
| United Arab Emirates | `AE` | ☐ | ☐ | ☐ | ☐ |
| United Kingdom | `GB` | ☐ | ☐ | ☐ | ☐ |
| United States | `US` | ☐ | ☐ | ☐ | ☐ |
| Uruguay | `UY` | ☐ | ☐ | ☐ | ☐ |
| Uzbekistan | `UZ` | ☐ | ☐ | ☐ | ☐ |
| Vanuatu | `VU` | ☐ | ☐ | ☐ | ☐ |
| Venezuela | `VE` | ☐ | ☐ | ☐ | ☐ |
| Vietnam | `VN` | ☐ | ☐ | ☐ | ☐ |
| Yemen | `YE` | ☐ | ☐ | ☐ | ☐ |
| Zambia | `ZM` | ☐ | ☐ | ☐ | ☐ |
| Zimbabwe | `ZW` | ☐ | ☐ | ☐ | ☐ |

### Additional ISO areas · 54 entries

| Country or area | Code | Shape | Focus | Regions + places | Feed + pins |
| --- | --- | --- | --- | --- | --- |
| Åland Islands | `AX` | ☐ | ☐ | ☐ | ☐ |
| American Samoa | `AS` | ☐ | ☐ | ☐ | ☐ |
| Anguilla | `AI` | ☐ | ☐ | ☐ | ☐ |
| Antarctica | `AQ` | ☐ | ☐ | ☐ | ☐ |
| Aruba | `AW` | ☐ | ☐ | ☐ | ☐ |
| Bermuda | `BM` | ☐ | ☐ | ☐ | ☐ |
| Bouvet Island | `BV` | ☐ | ☐ | ☐ | ☐ |
| British Indian Ocean Territory | `IO` | ☐ | ☐ | ☐ | ☐ |
| British Virgin Islands | `VG` | ☐ | ☐ | ☐ | ☐ |
| Caribbean Netherlands | `BQ` | ☐ | ☐ | ☐ | ☐ |
| Cayman Islands | `KY` | ☐ | ☐ | ☐ | ☐ |
| Christmas Island | `CX` | ☐ | ☐ | ☐ | ☐ |
| Cocos (Keeling) Islands | `CC` | ☐ | ☐ | ☐ | ☐ |
| Cook Islands | `CK` | ☐ | ☐ | ☐ | ☐ |
| Curaçao | `CW` | ☐ | ☐ | ☐ | ☐ |
| Falkland Islands | `FK` | ☐ | ☐ | ☐ | ☐ |
| Faroe Islands | `FO` | ☐ | ☐ | ☐ | ☐ |
| French Guiana | `GF` | ☐ | ☐ | ☐ | ☐ |
| French Polynesia | `PF` | ☐ | ☐ | ☐ | ☐ |
| French Southern Territories | `TF` | ☐ | ☐ | ☐ | ☐ |
| Gibraltar | `GI` | ☐ | ☐ | ☐ | ☐ |
| Greenland | `GL` | ☐ | ☐ | ☐ | ☐ |
| Guadeloupe | `GP` | ☐ | ☐ | ☐ | ☐ |
| Guam | `GU` | ☐ | ☐ | ☐ | ☐ |
| Guernsey | `GG` | ☐ | ☐ | ☐ | ☐ |
| Heard & McDonald Islands | `HM` | ☐ | ☐ | ☐ | ☐ |
| Hong Kong SAR China | `HK` | ☐ | ☐ | ☐ | ☐ |
| Isle of Man | `IM` | ☐ | ☐ | ☐ | ☐ |
| Jersey | `JE` | ☐ | ☐ | ☐ | ☐ |
| Macao SAR China | `MO` | ☐ | ☐ | ☐ | ☐ |
| Martinique | `MQ` | ☐ | ☐ | ☐ | ☐ |
| Mayotte | `YT` | ☐ | ☐ | ☐ | ☐ |
| Montserrat | `MS` | ☐ | ☐ | ☐ | ☐ |
| New Caledonia | `NC` | ☐ | ☐ | ☐ | ☐ |
| Niue | `NU` | ☐ | ☐ | ☐ | ☐ |
| Norfolk Island | `NF` | ☐ | ☐ | ☐ | ☐ |
| Northern Mariana Islands | `MP` | ☐ | ☐ | ☐ | ☐ |
| Pitcairn Islands | `PN` | ☐ | ☐ | ☐ | ☐ |
| Puerto Rico | `PR` | ☐ | ☐ | ☐ | ☐ |
| Réunion | `RE` | ☐ | ☐ | ☐ | ☐ |
| Sint Maarten | `SX` | ☐ | ☐ | ☐ | ☐ |
| South Georgia & South Sandwich Islands | `GS` | ☐ | ☐ | ☐ | ☐ |
| St. Barthélemy | `BL` | ☐ | ☐ | ☐ | ☐ |
| St. Helena | `SH` | ☐ | ☐ | ☐ | ☐ |
| St. Martin | `MF` | ☐ | ☐ | ☐ | ☐ |
| St. Pierre & Miquelon | `PM` | ☐ | ☐ | ☐ | ☐ |
| Svalbard & Jan Mayen | `SJ` | ☐ | ☐ | ☐ | ☐ |
| Taiwan | `TW` | ☐ | ☐ | ☐ | ☐ |
| Tokelau | `TK` | ☐ | ☐ | ☐ | ☐ |
| Turks & Caicos Islands | `TC` | ☐ | ☐ | ☐ | ☐ |
| U.S. Outlying Islands | `UM` | ☐ | ☐ | ☐ | ☐ |
| U.S. Virgin Islands | `VI` | ☐ | ☐ | ☐ | ☐ |
| Wallis & Futuna | `WF` | ☐ | ☐ | ☐ | ☐ |
| Western Sahara | `EH` | ☐ | ☐ | ☐ | ☐ |

### Additional geographic feature · 1 entry

| Country or area | Code | Shape | Focus | Regions + places | Feed + pins |
| --- | --- | --- | --- | --- | --- |
| Kosovo | `XK` | ☐ | ☐ | ☐ | ☐ |
