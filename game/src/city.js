// Tata kota Porto Verde: jalan grid, distrik, taman, pantai, marina, dan gedung.
// Semua posisi dihitung dari seed tetap, jadi kota selalu sama.
import { WORLD_W, WORLD_H, mulberry32, rectHit, clamp } from './util.js';

export const ROAD_W = 84;
export const ROAD_X = [200, 600, 1000, 1400, 1800, 2200, 2600, 3000];
export const ROAD_Y = [200, 600, 1000, 1400, 1800, 2200];

export const PARK = { x: 1400, y: 1000, w: 400, h: 400, label: 'Taman Pusat' };
export const BEACH_Y = 2180;
export const SEA_Y = 2310;
export const MARINA = { x: 2560, y: 2220, w: 420, h: 120 };
export const BOAT = { x: 2880, y: 2290 };
export const HOSPITAL = { x: 520, y: 520, w: 150, h: 110 };
export const SAFEHOUSE = { x: 1000, y: 1800 };
export const WAREHOUSE = { x: 2200, y: 600 };
export const VAULT = { x: 2600, y: 1800 };

export const buildings = [];
export const trees = [];

function blockHasPark(bx, by) {
  return bx + 320 > PARK.x && bx < PARK.x + PARK.w && by + 320 > PARK.y && by < PARK.y + PARK.h;
}

export function buildCity() {
  buildings.length = 0;
  trees.length = 0;
  const rng = mulberry32(20261119);
  // Gedung di tiap blok di antara jalan; lewati taman, pantai, dan blok rumah sakit.
  for (let ix = 0; ix < ROAD_X.length - 1; ix++) {
    for (let iy = 0; iy < ROAD_Y.length - 1; iy++) {
      const bx = ROAD_X[ix] + ROAD_W / 2 + 8;
      const by = ROAD_Y[iy] + ROAD_W / 2 + 8;
      if (by >= BEACH_Y) continue;
      if (blockHasPark(bx, by)) continue;
      if (ix === 0 && iy === 0) {
        // Blok rumah sakit: gedung rumah sakit putih.
        buildings.push({ x: HOSPITAL.x, y: HOSPITAL.y, w: HOSPITAL.w, h: HOSPITAL.h, color: '#e8eef2', kind: 'hospital' });
        continue;
      }
      const downtown = ix >= 3 && ix <= 5 && iy >= 1 && iy <= 3;
      const n = downtown ? 2 : 1;
      for (let k = 0; k < n; k++) {
        const w = 90 + rng() * 130;
        const h = 80 + rng() * 110;
        const x = bx + 10 + rng() * Math.max(1, 300 - w - 20);
        const y = by + 10 + rng() * Math.max(1, 300 - h - 20);
        const palette = downtown
          ? ['#5b6b7a', '#6b7a8c', '#4a5a68', '#7a6b5b']
          : ['#8a7a6b', '#7a8a7b', '#9a8a7a', '#6b7a8a'];
        buildings.push({ x, y, w, h, color: palette[Math.floor(rng() * palette.length)], kind: downtown ? 'tower' : 'house' });
      }
    }
  }
  // Pohon di taman.
  for (let i = 0; i < 46; i++) {
    trees.push({ x: PARK.x + 25 + rng() * (PARK.w - 50), y: PARK.y + 25 + rng() * (PARK.h - 50), r: 12 + rng() * 10 });
  }
  // Pohon di tepi pantai.
  for (let i = 0; i < 18; i++) {
    trees.push({ x: 60 + rng() * (WORLD_W - 120), y: BEACH_Y + 14 + rng() * 40, r: 11 + rng() * 8 });
  }
}

export function onRoad(x, y) {
  for (const rx of ROAD_X) if (Math.abs(x - rx) < ROAD_W / 2) return true;
  for (const ry of ROAD_Y) if (Math.abs(y - ry) < ROAD_W / 2) return true;
  return false;
}

export function inSea(x, y) {
  return y > SEA_Y;
}

export function hitBuilding(x, y, r) {
  for (const b of buildings) if (rectHit(x, y, r, b)) return b;
  return null;
}

// Gerakkan entitas (x,y) sejauh dx,dy dengan tabrakan gedung dan batas dunia.
export function moveWithCollision(e, dx, dy, r) {
  const nx = clamp(e.x + dx, r, WORLD_W - r);
  if (!hitBuilding(nx, e.y, r) && !inSea(nx, e.y)) e.x = nx;
  const ny = clamp(e.y + dy, r, WORLD_H - r);
  if (!hitBuilding(e.x, ny, r) && !inSea(e.x, ny)) e.y = ny;
}

// Titik jalan terdekat dari sebuah posisi (untuk spawn lalu lintas).
export function nearestRoad(x, y) {
  let bx = ROAD_X[0];
  let bd = Math.abs(x - bx);
  for (const rx of ROAD_X) if (Math.abs(x - rx) < bd) { bd = Math.abs(x - rx); bx = rx; }
  let by = ROAD_Y[0];
  bd = Math.abs(y - by);
  for (const ry of ROAD_Y) if (Math.abs(y - ry) < bd) { bd = Math.abs(y - ry); by = ry; }
  return Math.abs(x - bx) < Math.abs(y - by) ? { x: bx, y } : { x, y: by };
}
