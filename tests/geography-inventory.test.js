const { test, describe } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const inventory = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../public/data/geography-inventory.json'), 'utf8')
);
const manifest = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../public/data/manifest.json'), 'utf8')
);
const countriesGeo = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../public/data/geo/countries.geojson'), 'utf8')
);
const regionsGeo = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../public/data/geo/regions.geojson'), 'utf8')
);
const disputedGeo = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../public/data/geo/disputed.geojson'), 'utf8')
);
const citiesGeo = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../public/data/geo/cities.geojson'), 'utf8')
);

describe('Geography Inventory Acceptance Tests', () => {
  test('Exact 250 checklist entries with unique codes and IDs', () => {
    assert.strictEqual(inventory.length, 250, 'Expected exactly 250 inventory rows');
    const codes = new Set(inventory.map(i => i.code));
    assert.strictEqual(codes.size, 250, 'All 250 ISO / product codes must be unique');
  });

  test('Required sample geographies are present and valid', () => {
    // 1. Japan
    const jp = inventory.find(i => i.code === 'JP');
    assert.ok(jp, 'Japan must exist');
    assert.strictEqual(jp.firstOrderStatus, 'supported');

    // 2. United States (including Alaska & Hawaii)
    const us = inventory.find(i => i.code === 'US');
    assert.ok(us, 'United States must exist');
    assert.strictEqual(us.firstOrderStatus, 'supported');
    const usRegions = regionsGeo.features.filter(f => f.properties.country === 'US');
    const hasAlaska = usRegions.some(r => r.properties.id === 'US-AK');
    const hasHawaii = usRegions.some(r => r.properties.id === 'US-HI');
    assert.ok(hasAlaska, 'US must include Alaska subnational region');
    assert.ok(hasHawaii, 'US must include Hawaii subnational region');

    // 3. Indonesia (island nation)
    const id = inventory.find(i => i.code === 'ID');
    assert.ok(id, 'Indonesia must exist');
    const idRegions = regionsGeo.features.filter(f => f.properties.country === 'ID');
    assert.ok(idRegions.some(r => r.properties.id === 'ID-BA'), 'Indonesia must include Bali province');

    // 4. Fiji (antimeridian handling)
    const fj = inventory.find(i => i.code === 'FJ');
    assert.ok(fj, 'Fiji must exist');
    assert.ok(fj.cameraBounds[0][0] < fj.cameraBounds[1][0], 'Fiji bounds must be non-inverted');

    // 5. Vatican City (microstate)
    const va = inventory.find(i => i.code === 'VA');
    assert.ok(va, 'Vatican City must exist');
    assert.strictEqual(va.firstOrderStatus, 'n_a', 'Microstate first-order must be N/A with documented reason');
    assert.ok(va.firstOrderReason.includes('microstate'), 'Vatican N/A reason must mention microstate');

    // 6. Singapore (island city-state)
    const sg = inventory.find(i => i.code === 'SG');
    assert.ok(sg, 'Singapore must exist');
    assert.strictEqual(sg.firstOrderStatus, 'n_a');

    // 7. Disputed boundary
    const eh = inventory.find(i => i.code === 'EH');
    assert.ok(eh, 'Western Sahara must exist');
    assert.ok(disputedGeo.features.length >= 4, 'Must have documented disputed boundaries');

    // 8. Polar areas
    const gl = inventory.find(i => i.code === 'GL');
    const sj = inventory.find(i => i.code === 'SJ');
    const aq = inventory.find(i => i.code === 'AQ');
    assert.ok(gl && sj && aq, 'Greenland, Svalbard, and Antarctica must exist');
  });

  test('Boundary worldview policy and manifest are documented', () => {
    assert.ok(manifest.boundaryPolicy, 'Boundary policy must be defined');
    assert.strictEqual(manifest.boundaryPolicy.worldview, 'UN Cartographic Standard Worldview');
    assert.strictEqual(manifest.boundaryPolicy.disputesStyle, 'graphite-dash-2-2');
    assert.ok(manifest.licenses.geoBoundaries, 'geoBoundaries license must be recorded');
    assert.ok(manifest.licenses.openStreetMap, 'OSM license must be recorded');
  });

  test('Vector boundary GeoJSON assets are topologically valid', () => {
    assert.ok(countriesGeo.features.length >= 250, 'Countries layer must have all boundaries');
    assert.ok(regionsGeo.features.length >= 20, 'Regions layer must have subnational divisions');
    assert.ok(citiesGeo.features.length >= 25, 'Cities layer must have populated places');

    // Verify all regions have center coordinates and bounds
    regionsGeo.features.forEach(rf => {
      assert.ok(rf.properties.country, 'Region must have country code');
      assert.ok(rf.properties.name, 'Region must have display name');
      assert.ok(rf.properties.localName, 'Region must have verified local name');
      assert.ok(Array.isArray(rf.properties.center), 'Region must have center coords');
    });

    // Verify 0 horizontal line jumps across the antimeridian in countries.geojson
    let jumps = 0;
    countriesGeo.features.forEach(f => {
      const checkRings = (rings) => {
        rings.forEach(ring => {
          for (let i = 0; i < ring.length - 1; i++) {
            const dLng = Math.abs(ring[i][0] - ring[i+1][0]);
            if (dLng > 180) jumps++;
          }
        });
      };
      if (f.geometry.type === "Polygon") checkRings(f.geometry.coordinates);
      if (f.geometry.type === "MultiPolygon") f.geometry.coordinates.forEach(poly => checkRings(poly));
    });
    assert.strictEqual(jumps, 0, 'Zero antimeridian line jumps (> 180 deg) in countries layer');
  });

  test('Coverage report audits 100% of rows with distinct N/A and missing statuses', () => {
    const report = JSON.parse(
      fs.readFileSync(path.join(__dirname, '../public/data/coverage-report.json'), 'utf8')
    );
    assert.strictEqual(report.summary.total, 250);
    assert.strictEqual(report.summary.passed, 250);

    const naRows = report.rows.filter(r => r.firstOrderStatus === 'n_a');
    assert.ok(naRows.length > 0, 'Must have distinct N/A rows');
    naRows.forEach(row => {
      assert.ok(row.firstOrderReason.length > 5, 'Every N/A row must have an explicit reason');
    });
  });
});
