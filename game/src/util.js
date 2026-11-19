// Utilitas kecil untuk Porto Verde: matematika, RNG, dan helper geometri.
export const WORLD_W = 3200;
export const WORLD_H = 2400;
export const TAU = Math.PI * 2;

export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const dist = (x1, y1, x2, y2) => Math.hypot(x2 - x1, y2 - y1);
export const rand = (a, b) => a + Math.random() * (b - a);
export const randi = (a, b) => Math.floor(rand(a, b + 1));
export const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
export const choice = (arr) => pick(arr);

// Selisih sudut terpendek antara a dan b, dalam [-PI, PI].
export function angDiff(a, b) {
  let d = (b - a) % TAU;
  if (d > Math.PI) d -= TAU;
  if (d < -Math.PI) d += TAU;
  return d;
}

// RNG deterministik (mulberry32) supaya tata kota sama di setiap run.
export function mulberry32(seed) {
  let s = seed >>> 0;
  return function () {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function rectHit(ax, ay, ar, b) {
  return ax + ar > b.x && ax - ar < b.x + b.w && ay + ar > b.y && ay - ar < b.y + b.h;
}

export function fmtMoney(n) {
  return '$' + Math.floor(n).toLocaleString('en-US');
}

export function fmtTime(sec) {
  const s = Math.max(0, Math.ceil(sec));
  return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
}
