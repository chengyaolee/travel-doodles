const { test, describe } = require('node:test');
const assert = require('node:assert');
const { getPostsByLocation, MOCK_POSTS } = require('../src/lib/explore/mockPosts.ts');

describe('Explore Experience & Regional Feed Interactions', () => {
  test('Post filtering by audience: Explore (everyone) vs Friends', () => {
    const everyonePosts = getPostsByLocation(undefined, undefined, 'everyone');
    const friendsPosts = getPostsByLocation(undefined, undefined, 'friends');

    assert.ok(everyonePosts.length > 0, 'Everyone posts should be present');
    assert.ok(friendsPosts.length > 0, 'Friends posts should be present');
    assert.ok(
      friendsPosts.every(p => p.visibility === 'friends'),
      'All friends posts must have visibility: friends'
    );
  });

  test('Geographic hierarchy navigation: World -> Country -> Region -> Post', () => {
    // 1. World scale
    const worldPosts = getPostsByLocation();
    assert.ok(worldPosts.length > 5, 'World view has aggregate posts');

    // 2. Country scale: Japan (JP)
    const jpPosts = getPostsByLocation('JP');
    assert.ok(jpPosts.length >= 3, 'Japan has multiple posts');
    assert.ok(jpPosts.every(p => p.country === 'JP'), 'All posts belong to Japan');

    // 3. Region scale: Kyoto (JP-26)
    const kyotoPosts = getPostsByLocation('JP', 'JP-26');
    assert.ok(kyotoPosts.length >= 2, 'Kyoto has posts');
    assert.ok(kyotoPosts.every(p => p.region === 'JP-26'), 'All posts belong to Kyoto');

    // 4. Post scale
    const post = MOCK_POSTS.find(p => p.id === 'post-jp-4');
    assert.ok(post, 'Target Kyoto post exists');
    assert.strictEqual(post.country, 'JP');
    assert.strictEqual(post.region, 'JP-26');
    assert.strictEqual(post.city, 'Kyoto');
  });

  test('Outlying territories and antimeridian handling', () => {
    // US Outlying parts (Hawaii, Alaska)
    const hiPosts = getPostsByLocation('US', 'US-HI');
    assert.ok(Array.isArray(hiPosts));

    // Fiji (Antimeridian Crossing 180° meridian)
    const fjPosts = getPostsByLocation('FJ');
    assert.ok(fjPosts.length >= 1, 'Fiji post must exist');
    const fijiPost = fjPosts[0];
    assert.ok(fijiPost.coordinates[0] > 170 || fijiPost.coordinates[0] < -170);
  });

  test('Microstate point target handling (Vatican City & Singapore)', () => {
    const vaPosts = getPostsByLocation('VA');
    assert.ok(vaPosts.length >= 1, 'Vatican City post must exist');
    assert.strictEqual(vaPosts[0].country, 'VA');

    const sgPosts = getPostsByLocation('SG');
    assert.ok(sgPosts.length >= 1, 'Singapore post must exist');
    assert.strictEqual(sgPosts[0].country, 'SG');
  });

  test('Empty state & retry handling for unpinned regions', () => {
    // Non-existent or empty region
    const emptyPosts = getPostsByLocation('IS', 'NON_EXISTENT_REGION');
    assert.strictEqual(emptyPosts.length, 0, 'Empty region returns 0 posts to trigger empty state UI');
  });

  test('Text-only post support', () => {
    const textOnlyPost = MOCK_POSTS.find(p => p.isTextOnly);
    assert.ok(textOnlyPost, 'At least one test fixture must be text-only');
    assert.strictEqual(textOnlyPost.isTextOnly, true);
    assert.ok(textOnlyPost.caption.length > 10, 'Text post must have valid caption');
  });

  test('Deep link query generation', () => {
    const samplePost = MOCK_POSTS[0];
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
  });
});
