import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BUILDINGS_DATA,
  PLATFORMS_DATA,
  ROADS_DATA,
  BOUNDARY_POLYGON,
  PROJECT_METADATA,
  getElevationAt,
  getSceneY,
} from './pzuData';
import { generateStandaloneIndexHtml } from './standaloneHtmlGenerator';

test('terrain elevation rises from North-East (~585m) to South-West (~596m)', () => {
  const neElev = getElevationAt(150, -150);
  const centerElev = getElevationAt(0, 0);
  const swElev = getElevationAt(-150, 150);

  assert.ok(neElev >= 584.5 && neElev <= 589.0, `Expected NE elevation near 585-588m, got ${neElev}`);
  assert.ok(centerElev >= 590.0 && centerElev <= 592.5, `Expected center elevation near 591m, got ${centerElev}`);
  assert.ok(swElev >= 594.0 && swElev <= 596.8, `Expected SW elevation near 595-596m, got ${swElev}`);
  assert.ok(swElev > centerElev && centerElev > neElev, 'Terrain must slope upward from NE to SW');
});

test('getSceneY scales elevation relative to 585m datum', () => {
  const yNe = getSceneY(150, -150, 2.0);
  const ySw = getSceneY(-150, 150, 2.0);
  assert.ok(ySw > yNe + 10, 'SW scene Y should be significantly higher than NE scene Y');
});

test('all explication buildings (2.1 to 2.18) and long warehouse groups (392m, 401m, 455m) exist', () => {
  assert.equal(BUILDINGS_DATA.length, 25);

  const codes = new Set(BUILDINGS_DATA.map((b) => b.code));
  const expectedCodes = [
    '2.1', '2.2', '2.3', '2.4', '2.5', '2.6', '2.7', '2.8', '2.9',
    '2.10', '2.11', '2.12', '2.13', '2.14',
    '2.15.1', '2.15.2', '2.15.3',
    '2.16.1', '2.16.2', '2.16.3', '2.16.4', '2.16.5', '2.16.6',
    '2.17', '2.18',
  ];
  for (const code of expectedCodes) {
    assert.ok(codes.has(code), `Missing explication code ${code}`);
  }

  const tags = BUILDINGS_DATA.map((b) => b.blueprintTag || '').join(' ');
  assert.ok(tags.includes('455 м'), 'Must include 455m/t warehouse marking');
  assert.ok(tags.includes('401 м'), 'Must include 401m/t warehouse marking');
  assert.ok(tags.includes('392 м'), 'Must include 392m/t warehouse marking');
});

test('roads, ditches, platforms, and boundary polygon are properly defined', () => {
  const type1Roads = ROADS_DATA.filter((r) => r.type === 'road_type_1');
  const type3Ditches = ROADS_DATA.filter((r) => r.type === 'ditch_type_3');

  assert.ok(type1Roads.length >= 6, 'Should have Type I road network');
  assert.ok(type3Ditches.length >= 2, 'Should have Type III drainage ditches');
  assert.ok(PLATFORMS_DATA.length >= 5, 'Should have Type III concrete platforms');
  assert.ok(BOUNDARY_POLYGON.length >= 8, 'Should have outer security perimeter vertices');
});

test('standalone HTML generator produces valid self-contained Three.js document', () => {
  const html = generateStandaloneIndexHtml();
  assert.ok(html.startsWith('<!DOCTYPE html>'));
  assert.ok(html.includes('https://unpkg.com/three@'));
  assert.ok(html.includes('OrbitControls.js'));
  assert.ok(html.includes('EdgesGeometry'));
  assert.ok(html.includes(PROJECT_METADATA.cadastralMain));
  assert.ok(!html.includes('TODO'), 'Generated HTML must not contain TODOs');
});

test('root index.html is a complete monolithic standalone file with mobile support and no download button', async () => {
  const fs = await import('node:fs');
  const indexHtml = fs.readFileSync('index.html', 'utf8');
  const lineCount = indexHtml.split('\n').length;
  assert.ok(lineCount > 1000, `Expected index.html to have >1000 lines, got ${lineCount}`);
  assert.ok(indexHtml.includes('three.min.js'), 'index.html must include Three.js CDN script for standalone usage');
  assert.ok(!indexHtml.includes('btn-download-html'), 'index.html must not contain a download button');
  assert.ok(indexHtml.includes('@media (max-width: 768px)'), 'index.html must include mobile responsive styles');
  assert.ok(indexHtml.includes('touch-action: none'), 'index.html must support mobile touch gestures');
  assert.ok(indexHtml.includes('455 м (455 т)'), 'index.html must include 455m/t warehouses');
});


