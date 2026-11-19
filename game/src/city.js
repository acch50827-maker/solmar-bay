// Porto Verde: the city itself. A seeded grid city on the coast — roads, blocks,
// buildings, a central park, a beach and a marina. Everything is deterministic so
// screenshots and replays always show the same city.
import { mulberry32, rand, randi, pick } from './util.js';

export const WORLD_W = 3200;
export const WORLD_H = 2400;
export const ROAD_W = 96;

export function buildCity() {
  const rng = mulberry32(20261119);
  const roadsV = [200, 600, 1000, 1400, 1800, 2200, 2600, 3000];
  const roadsH = [200, 600, 1000, 1400, 1800, 2200];
  const buildings = [];
  const trees = [];
  const downtown = ['#5b7fa6', '#6b8cae', '#4a6b8a', '#7d9bb8', '#556b84'];
  const homes = ['#e8a87c', '#f2c879', '#d98c8c', '#a8c686', '#e6d3a3', '#c9a2c8'];
  const industry = ['#8a7d6b', '#7a6f5d', '#9c8f7a', '#6e6257'];

  // Park block: between roads 1400-1800 (x) and 1000-1400 (y).
  const park = { x: 1450, y: 1050, w: 300, h: 300 };
  for (let i = 0; i < 46; i++) {
    trees.push({ x: rand(rng, park.x + 15, park.x + park.w - 15), y: rand(rng, park.y + 15, park.y + park.h - 15), r: rand(rng, 9, 16) });
  }
  // Beach trees along the shore.
  for (let i = 0; i < 18; i++) {
    trees.push({ x: rand(rng, 120, 3080), y: rand(rng, 2140, 2220), r: rand(rng, 10, 18) });
  }

  for (let vi = 0; vi < roadsV.length - 1; vi++) {
    for (let hi = 0; hi < roadsH.length - 1; hi++) {
      const bx0 = roadsV[vi] + ROAD_W / 2 + 14;
      const bx1 = roadsV[vi + 1] - ROAD_W / 2 - 14;
      const by0 = roadsH[hi] + ROAD_W / 2 + 14;
      const by1 = roadsH[hi + 1] - ROAD_W / 2 - 14;
      // Skip the park block and the beach strip.
      if (bx0 >= park.x - 10 && bx1 <= park.x + park.w + 10 && by0 >= park.y - 10 && by1 <= park.y + park.h + 10) continue;
      if (by0 > 2050) continue;
      const n = randi(rng, 1, 2);
      for (let k = 0; k < n; k++) {
        const w = rand(rng, 110, Math.min(240, bx1 - bx0 - 20));
        const h = rand(rng, 100, Math.min(220, by1 - by0 - 20));
        const x = rand(rng, bx0, bx1 - w);
        const y = rand(rng, by0, by1 - h);
        let palette = homes;
        if (by0 < 800) palette = downtown;
        else if (bx0 > 2500) palette = industry;
        buildings.push({ x, y, w, h, color: pick(rng, palette), tall: by0 < 800 });
      }
    }
  }
  // Landmark buildings (hand-placed, named on the map).
  const landmarks = [
    { name: 'Grand Hotel Azul', x: 1760, y: 560, w: 190, h: 130, color: '#e8c46a' },
    { name: 'Porto Bank', x: 960, y: 560, w: 170, h: 120, color: '#b8c4cc' },
    { name: 'Mercado Central', x: 960, y: 960, w: 200, h: 130, color: '#d98c8c' },
    { name: 'Cafe Luna', x: 1360, y: 1760, w: 150, h: 110, color: '#f2c879' },
    { name: 'St. Marina Hospital', x: 560, y: 160, w: 180, h: 120, color: '#e8e8e8' },
    { name: 'Dock Warehouse', x: 2760, y: 1960, w: 200, h: 130, color: '#8a7d6b' },
  ];
  for (const lm of landmarks) buildings.push({ ...lm, landmark: true });

  return {
    w: WORLD_W, h: WORLD_H, roadsV, roadsH, buildings, trees, park,
    beach: { y0: 2240, waterY: 2330 },
    spots: {
      start: { x: 600, y: 600 },
      hospital: { x: 650, y: 300 },
      market: { x: 1060, y: 1030 },
      hotel: { x: 1855, y: 640 },
      cafe: { x: 1435, y: 1820 },
      hideout: { x: 2500, y: 1300 },
      docks: { x: 2860, y: 2030 },
      bank: { x: 1045, y: 630 },
      boat: { x: 2900, y: 2300 },
      parkCenter: { x: 1600, y: 1200 },
    },
  };
}

// Is a point on a road (used for traffic, spawning and off-road slowdown)?
export function onRoad(city, x, y) {
  const hw = ROAD_W / 2;
  for (const rx of city.roadsV) if (Math.abs(x - rx) < hw) return true;
  for (const ry of city.roadsH) if (Math.abs(y - ry) < hw) return true;
  return false;
}
export function onBeach(city, x, y) {
  return y > city.beach.y0;
}
export function hitsBuilding(city, x, y, r) {
  for (const b of city.buildings) {
    const cx = Math.max(b.x, Math.min(x, b.x + b.w));
    const cy = Math.max(b.y, Math.min(y, b.y + b.h));
    const dx = x - cx, dy = y - cy;
    if (dx * dx + dy * dy < r * r) return b;
  }
  return null;
}
