const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { fitZoom, stateZoomByCountry, countryLabelZoom, SMALL_COUNTRY_ZOOM } = require('../src/lib/explore/labelZoom.ts');

const regions = JSON.parse(fs.readFileSync(path.join(__dirname, '../public/data/geo/regions.geojson'), 'utf8')).features.map((f) => f.properties);

test('bigger areas and shorter names fit at lower zoom', () => {
  const box = [[0, 0], [10, 10]];
  assert.ok(fitZoom([[0, 0], [20, 20]], 'Texas') < fitZoom(box, 'Texas'));
  assert.ok(fitZoom(box, 'TX') < fitZoom(box, 'Texas'));
});

test('all regions of a country share one threshold, set by the median region', () => {
  const zooms = stateZoomByCountry(regions);
  const us = regions.filter((r) => r.country === 'US').map((r) => fitZoom(r.bounds, r.shortName || r.name)).sort((a, b) => a - b);
  assert.ok(zooms.US > us[0] && zooms.US < us[us.length - 1], 'small states ride along, big states wait for the shared zoom');
});

test('small countries cap at a fixed zoom', () => {
  assert.strictEqual(countryLabelZoom([[12.44, 41.9], [12.46, 41.91]], 'Vatican City'), SMALL_COUNTRY_ZOOM);
  assert.ok(countryLabelZoom([[-125, 24], [-66, 49]], 'United States') < 3);
});
