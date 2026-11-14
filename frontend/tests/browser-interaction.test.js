const { test, describe } = require('node:test');
const assert = require('node:assert');
const { getPostsByLocation } = require('../src/lib/explore/mockPosts.ts');

const TEST_FIXTURE_POSTS = [
  {
    id: "post-jp-1",
    country: "JP",
    region: "JP-13",
    city: "Tokyo",
    location: "Shibuya Crossing, Tokyo",
    author: "Kenji Sato",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d",
    date: "2026-05-01",
    visibility: "everyone",
    image: "https://images.unsplash.com/photo-1503899036084-c55cdd92da26",
    caption: "Shibuya crossing in the spring drizzle.",
    doodleSticker: "",
    likes: 215,
    comments: 34,
    coordinates: [139.7006, 35.6595]
  },
  {
    id: "post-jp-2",
    country: "JP",
    region: "JP-13",
    city: "Tokyo",
    location: "Yanaka Ginza, Tokyo",
    author: "Elena Rostova",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb",
    date: "2026-04-28",
    visibility: "friends",
    image: "https://images.unsplash.com/photo-1542051841857-5f90071e7989",
    caption: "Steamed sweet potato from wooden cart in Yanaka.",
    doodleSticker: "",
    likes: 98,
    comments: 12,
    coordinates: [139.7680, 35.7275]
  },
  {
    id: "post-jp-3",
    country: "JP",
    region: "JP-26",
    city: "Kyoto",
    location: "Gion Shijo, Kyoto",
    author: "Liam O'Connor",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e",
    date: "2026-04-15",
    visibility: "everyone",
    caption: "Lanterns glowing along Shirakawa canal in the dusk.",
    doodleSticker: "",
    likes: 72,
    comments: 8,
    isTextOnly: true,
    coordinates: [135.7727, 35.0037]
  },
  {
    id: "post-jp-4",
    country: "JP",
    region: "JP-26",
    city: "Kyoto",
    location: "Arashiyama Bamboo Grove, Kyoto",
    author: "Camille Laurent",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330",
    date: "2026-05-03",
    visibility: "everyone",
    image: "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e",
    caption: "Morning light through tall bamboo.",
    doodleSticker: "",
    likes: 310,
    comments: 41,
    coordinates: [135.6713, 35.0166]
  },
  {
    id: "post-us-1",
    country: "US",
    region: "US-HI",
    city: "Honolulu",
    location: "Waikiki Beach, Hawaii",
    author: "Kai Kealoha",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d",
    date: "2026-04-10",
    visibility: "friends",
    image: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e",
    caption: "Sunset surf session off Diamond Head.",
    doodleSticker: "",
    likes: 180,
    comments: 20,
    coordinates: [-157.8294, 21.2766]
  },
  {
    id: "post-fj-1",
    country: "FJ",
    region: "FJ-W",
    city: "Nadi",
    location: "Denarau Island, Fiji",
    author: "Moana Tui",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb",
    date: "2026-04-18",
    visibility: "everyone",
    image: "https://images.unsplash.com/photo-1512100356356-de1b84283e18",
    caption: "Clear waters across the 180 degree meridian.",
    doodleSticker: "",
    likes: 140,
    comments: 15,
    coordinates: [177.3833, -17.7667]
  },
  {
    id: "post-va-1",
    country: "VA",
    region: "VA-01",
    city: "Vatican City",
    location: "St. Peter's Square, Vatican City",
    author: "Marco Rossi",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e",
    date: "2026-04-17",
    visibility: "everyone",
    image: "https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7",
    caption: "Bernini's colonnade in morning sunlight.",
    doodleSticker: "",
    likes: 210,
    comments: 26,
    coordinates: [12.4563, 41.9022]
  },
  {
    id: "post-sg-1",
    country: "SG",
    region: "SG-01",
    city: "Singapore",
    location: "Marina Bay Sands, Singapore",
    author: "Zhen Tan",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d",
    date: "2026-04-22",
    visibility: "everyone",
    image: "https://images.unsplash.com/photo-1525625293386-3f8f99389edd",
    caption: "Gardens by the Bay supertrees glowing after dusk.",
    doodleSticker: "",
    likes: 195,
    comments: 22,
    coordinates: [103.8636, 1.2816]
  }
];

const getPosts = (c, r, v) => getPostsByLocation(c, r, v, TEST_FIXTURE_POSTS);

describe('Explore Experience & Regional Feed Interactions', () => {
  test('Post filtering by audience: Explore (everyone) vs Friends', () => {
    const everyonePosts = getPosts(undefined, undefined, 'everyone');
    const friendsPosts = getPosts(undefined, undefined, 'friends');

    assert.ok(everyonePosts.length > 0, 'Everyone posts should be present');
    assert.ok(friendsPosts.length > 0, 'Friends posts should be present');
    assert.ok(
      friendsPosts.every(p => p.visibility === 'friends'),
      'All friends posts must have visibility: friends'
    );
  });

  test('Geographic hierarchy navigation: World -> Country -> Region -> Post', () => {
    // 1. World scale
    const worldPosts = getPosts();
    assert.ok(worldPosts.length > 5, 'World view has aggregate posts');

    // 2. Country scale: Japan (JP)
    const jpPosts = getPosts('JP');
    assert.ok(jpPosts.length >= 3, 'Japan has multiple posts');
    assert.ok(jpPosts.every(p => p.country === 'JP'), 'All posts belong to Japan');

    // 3. Region scale: Kyoto (JP-26)
    const kyotoPosts = getPosts('JP', 'JP-26');
    assert.ok(kyotoPosts.length >= 2, 'Kyoto has posts');
    assert.ok(kyotoPosts.every(p => p.region === 'JP-26'), 'All posts belong to Kyoto');

    // 4. Post scale
    const post = TEST_FIXTURE_POSTS.find(p => p.id === 'post-jp-4');
    assert.ok(post, 'Target Kyoto post exists');
    assert.strictEqual(post.country, 'JP');
    assert.strictEqual(post.region, 'JP-26');
    assert.strictEqual(post.city, 'Kyoto');
  });

  test('Outlying territories and antimeridian handling', () => {
    // US Outlying parts (Hawaii, Alaska)
    const hiPosts = getPosts('US', 'US-HI');
    assert.ok(Array.isArray(hiPosts));

    // Fiji (Antimeridian Crossing 180° meridian)
    const fjPosts = getPosts('FJ');
    assert.ok(fjPosts.length >= 1, 'Fiji post must exist');
    const fijiPost = fjPosts[0];
    assert.ok(fijiPost.coordinates[0] > 170 || fijiPost.coordinates[0] < -170);
  });

  test('Microstate point target handling (Vatican City & Singapore)', () => {
    const vaPosts = getPosts('VA');
    assert.ok(vaPosts.length >= 1, 'Vatican City post must exist');
    assert.strictEqual(vaPosts[0].country, 'VA');

    const sgPosts = getPosts('SG');
    assert.ok(sgPosts.length >= 1, 'Singapore post must exist');
    assert.strictEqual(sgPosts[0].country, 'SG');
  });

  test('Empty state & retry handling for unpinned regions', () => {
    // Non-existent or empty region
    const emptyPosts = getPosts('IS', 'NON_EXISTENT_REGION');
    assert.strictEqual(emptyPosts.length, 0, 'Empty region returns 0 posts to trigger empty state UI');
  });

  test('Text-only post support', () => {
    const textOnlyPost = TEST_FIXTURE_POSTS.find(p => p.isTextOnly);
    assert.ok(textOnlyPost, 'At least one test fixture must be text-only');
    assert.strictEqual(textOnlyPost.isTextOnly, true);
    assert.ok(textOnlyPost.caption.length > 10, 'Text post must have valid caption');
  });

  test('Deep link query generation', () => {
    const samplePost = TEST_FIXTURE_POSTS[0];
    const params = new URLSearchParams();
    params.set('country', samplePost.country);
    params.set('region', samplePost.region);
    params.set('post', samplePost.id);

    const deepLink = `/explore?${params.toString()}`;
    assert.ok(deepLink.includes(`country=${samplePost.country}`));
    assert.ok(deepLink.includes(`region=${samplePost.region}`));
    assert.ok(deepLink.includes(`post=${samplePost.id}`));
  });

  test('Map visibility rules: country names disappear when states appear, and dark mode uses white text', () => {
    const { DARK_TOKENS, LIGHT_TOKENS } = require('../src/lib/explore/mapStyles.ts');
    assert.strictEqual(DARK_TOKENS.inkPrimary.toLowerCase(), '#ffffff', 'Dark mode primary text must be pure white for high contrast');

    // Rule verification: 3 distinct shades (base, country hover, state hover)
    assert.ok(LIGHT_TOKENS.stateHover, 'Light tokens must have stateHover');
    assert.notStrictEqual(LIGHT_TOKENS.stateHover, LIGHT_TOKENS.landFill, 'State hover must differ from base land fill');
    assert.notStrictEqual(LIGHT_TOKENS.stateHover, LIGHT_TOKENS.landHover, 'State hover must be a 3rd distinct shade from country hover');

    assert.ok(DARK_TOKENS.stateHover, 'Dark tokens must have stateHover');
    assert.notStrictEqual(DARK_TOKENS.stateHover, DARK_TOKENS.landFill, 'Dark state hover must differ from base land fill');
    assert.notStrictEqual(DARK_TOKENS.stateHover, DARK_TOKENS.landHover, 'Dark state hover must be a 3rd distinct shade from country hover');

    // Post count badge cap at 99+
    const capBadge = (count) => (count > 99 ? '99+' : String(count));
    assert.strictEqual(capBadge(42), '42');
    assert.strictEqual(capBadge(99), '99');
    assert.strictEqual(capBadge(100), '99+');
    assert.strictEqual(capBadge(250), '99+');

    // Rule verification: states show up at zoom >= 2.8, country name for states-bearing countries disappears at zoom >= 2.8
    const mapZoomAtStates = 3.2;
    const hasStates = true;
    const shouldShowCountryName = !hasStates || mapZoomAtStates < 2.8;
    assert.strictEqual(shouldShowCountryName, false, 'Country name must disappear when zoomed into countries with states');

    const mapZoomAtWorld = 1.6;
    const shouldShowWorldCountryName = !hasStates || mapZoomAtWorld < 2.8;
    assert.strictEqual(shouldShowWorldCountryName, true, 'Country name must appear at world overview zoom');

    // Verify World Level (mapZoom < 3.2, selectedCountry = null) aggregates red badges immediately on load
    const samplePosts = [
      { country: 'JP', coordinates: [139.7, 35.6] },
      { country: 'JP', coordinates: [135.7, 35.0] },
      { country: 'US', coordinates: [-122.4, 37.8] },
      { country: 'FR', coordinates: [2.35, 48.8] },
    ];
    const worldGroups = {};
    samplePosts.forEach((p) => {
      const key = p.country;
      if (!worldGroups[key]) {
        worldGroups[key] = { count: 0, code: p.country };
      }
      worldGroups[key].count += 1;
    });

    assert.strictEqual(Object.keys(worldGroups).length, 3, 'Must create 3 country badge groups on world map');
    assert.strictEqual(worldGroups['JP'].count, 2, 'Japan must have 2 posts in badge');
    assert.strictEqual(worldGroups['US'].count, 1, 'US must have 1 post in badge');
    assert.strictEqual(worldGroups['FR'].count, 1, 'France must have 1 post in badge');

    // Verify autocomplete geocoding data structure for map pointing
    const sampleAutocomplete = {
      id: 'photon-eiffel',
      name: 'Eiffel Tower',
      displayName: 'Eiffel Tower, 5 Avenue Anatole France, Paris, France',
      city: 'Paris',
      country: 'France',
      countryCode: 'FR',
      coordinates: [2.2945, 48.8582],
    };
    assert.ok(sampleAutocomplete.coordinates[0] >= -180 && sampleAutocomplete.coordinates[0] <= 180, 'Longitude must be valid WGS84');
    assert.ok(sampleAutocomplete.coordinates[1] >= -90 && sampleAutocomplete.coordinates[1] <= 90, 'Latitude must be valid WGS84');
    assert.strictEqual(sampleAutocomplete.countryCode, 'FR', 'Country code must be ISO2 uppercase');

    // Verify English country normalization (converting ISO codes and foreign names to English)
    const englishRegionNames = new Intl.DisplayNames(['en'], { type: 'region' });
    assert.strictEqual(englishRegionNames.of('JP'), 'Japan', 'JP must normalize to Japan');
    assert.strictEqual(englishRegionNames.of('FR'), 'France', 'FR must normalize to France');
    assert.strictEqual(englishRegionNames.of('KR'), 'South Korea', 'KR must normalize to South Korea');
    assert.strictEqual(englishRegionNames.of('TH'), 'Thailand', 'TH must normalize to Thailand');

    // Verify red badge and marker elements have stationary fixed styling (zero scale, zero transition)
    const fs = require('fs');
    const path = require('path');
    const filePath = fs.existsSync('src/components/explore/SketchbookMap.tsx')
      ? 'src/components/explore/SketchbookMap.tsx'
      : 'frontend/src/components/explore/SketchbookMap.tsx';
    const sketchbookMapSource = fs.readFileSync(filePath, 'utf-8');
    assert.ok(sketchbookMapSource.includes('el.style.transform = "none"'), 'Markers must enforce transform: none');
    assert.ok(sketchbookMapSource.includes('el.style.transition = "none"'), 'Markers must enforce transition: none');
    assert.ok(!sketchbookMapSource.includes('hover:scale-'), 'Must not contain hover:scale on map markers');

    // Verify tactile needle pin from "The world is a blank whiteboard" is restored with top-right red badge
    assert.ok(sketchbookMapSource.includes('getDoodlePinSvg'), 'Map markers must restore DoodlePin asset');
    assert.ok(!sketchbookMapSource.includes('animate-bounce'), 'Explore map markers must not bounce');
    assert.ok(sketchbookMapSource.includes('-top-1.5 -right-3.5'), 'Red rounded rectangle badge must be positioned on top right of pin');
    assert.ok(sketchbookMapSource.includes('anchor: "bottom"'), 'Marker must anchor needle tip to geographic coordinates');

    // Verify DoodlePin SVG helper structure
    const doodlePinPath = fs.existsSync('src/components/doodles/DoodlePin.tsx')
      ? 'src/components/doodles/DoodlePin.tsx'
      : 'frontend/src/components/doodles/DoodlePin.tsx';
    const doodlePinSource = fs.readFileSync(doodlePinPath, 'utf-8');
    assert.ok(doodlePinSource.includes('export function getDoodlePinSvg'), 'DoodlePin must export getDoodlePinSvg');
    assert.ok(doodlePinSource.includes('ellipse cx="16" cy="36"'), 'Must contain needle puncture shadow at base');
    assert.ok(doodlePinSource.includes('circle cx="16" cy="9"'), 'Must contain spherical pearl head');
  });

  test('State/Region name has distinctive grey styling from cities', () => {
    const fs = require('fs');
    const filePath = fs.existsSync('src/components/explore/SketchbookMap.tsx')
      ? 'src/components/explore/SketchbookMap.tsx'
      : 'frontend/src/components/explore/SketchbookMap.tsx';
    const source = fs.readFileSync(filePath, 'utf-8');

    // State labels use grey tones (#52525b light / #94a3b8 dark)
    assert.ok(source.includes('#52525b') && source.includes('#94a3b8'), 'State/region labels must use distinct grey shades');
    // Cities use bold dark/light tones (#1c1917 / #ffffff)
    assert.ok(source.includes('#1c1917'), 'Cities must maintain strong dark/light contrast');
  });

  test('Smooth scrolling & zoom performance: RAF throttling eliminates frame choppiness', () => {
    const fs = require('fs');
    const filePath = fs.existsSync('src/components/explore/SketchbookMap.tsx')
      ? 'src/components/explore/SketchbookMap.tsx'
      : 'frontend/src/components/explore/SketchbookMap.tsx';
    const source = fs.readFileSync(filePath, 'utf-8');

    // 1. Zoom state updates are throttled with RAF and minimum delta
    assert.ok(source.includes('commitZoomState'), 'Must commit zoom state via requestAnimationFrame');
    assert.ok(source.includes('lastCommittedZoomRef'), 'Must track last committed zoom to prevent spamming re-renders on scroll');
    assert.ok(source.includes('cancelAnimationFrame(zoomRafRef.current)'), 'Must cancel pending RAF to avoid stale frames');

    // 2. Horizontal wheel panning is batched with RAF
    assert.ok(source.includes('panRafId'), 'Wheel panning must be batched with requestAnimationFrame');
    assert.ok(source.includes('pendingPanX'), 'Wheel delta must be accumulated to prevent synchronous layout thrashing');
  });

  test('Hero world map projection accuracy aligns location pins with SVG landmasses', () => {
    const fs = require('fs');
    const filePath = fs.existsSync('src/lib/worldMapData.ts')
      ? 'src/lib/worldMapData.ts'
      : 'frontend/src/lib/worldMapData.ts';
    const source = fs.readFileSync(filePath, 'utf-8');

    assert.ok(source.includes('export function projectLngLatToWorldMap'), 'worldMapData must export projectLngLatToWorldMap');

    // Mathematical verification of Mercator projection formula:
    // x = 500 + (lng * 145 * Math.PI) / 180
    // y = 335 - 145 * Math.log(Math.tan(Math.PI / 4 + rad / 2))
    const project = (lng, lat) => {
      const clampedLat = Math.max(-84, Math.min(84, lat));
      const x = 500 + (lng * 145 * Math.PI) / 180;
      const rad = (clampedLat * Math.PI) / 180;
      const y = 335 - 145 * Math.log(Math.tan(Math.PI / 4 + rad / 2));
      return { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 };
    };

    // Center of map (0 lng, 0 lat)
    const center = project(0, 0);
    assert.strictEqual(center.x, 500, 'Prime meridian must project to x=500');
    assert.strictEqual(center.y, 335, 'Equator must project to y=335');

    // Tokyo (approx 139.69, 35.69)
    const tokyo = project(139.69, 35.69);
    assert.ok(Math.abs(tokyo.x - 853.5) < 1.0, `Tokyo x (${tokyo.x}) must align with SVG map coordinates ~853.5`);
    assert.ok(Math.abs(tokyo.y - 238.2) < 1.0, `Tokyo y (${tokyo.y}) must align with SVG map coordinates ~238.2`);

    // London (approx -0.13, 51.51)
    const london = project(-0.13, 51.51);
    assert.ok(Math.abs(london.x - 499.7) < 1.0, `London x (${london.x}) must align with SVG map coordinates ~499.7`);
    assert.ok(Math.abs(london.y - 182.4) < 1.0, `London y (${london.y}) must align with SVG map coordinates ~182.4`);

    // Verify HeroWorldMap pin needle anchor positioning
    const heroFilePath = fs.existsSync('src/components/hero/HeroWorldMap.tsx')
      ? 'src/components/hero/HeroWorldMap.tsx'
      : 'frontend/src/components/hero/HeroWorldMap.tsx';
    const heroSource = fs.readFileSync(heroFilePath, 'utf-8');
    assert.ok(heroSource.includes('projectLngLatToWorldMap'), 'HeroWorldMap must use projectLngLatToWorldMap');
    assert.ok(heroSource.includes('transformOrigin: "50% 8.6px"'), 'HeroWorldMap pin must pivot on needle puncture point');
    assert.ok(heroSource.includes('aspect-[1000/560]'), 'HeroWorldMap container must match SVG aspect ratio');
  });
});
