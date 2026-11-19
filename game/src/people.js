// Pedestrians: people walking the sidewalks of Porto Verde. They stroll, wait
// at crossings, and run away from gunfire and speeding cars.
import { clamp, dist, angleTo, rand, randi, pick } from './util.js';
import { onRoad } from './city.js';

const SHIRTS = ['#e85d75', '#5da9e8', '#f2b134', '#7ed957', '#b07fe8', '#f2855d', '#4fd1c5'];
export function spawnPeds(city, rng, n) {
  const peds = [];
  for (let i = 0; i < n; i++) {
    const vertical = rng() < 0.5;
    const road = vertical ? pick(rng, city.roadsV) : pick(rng, city.roadsH);
    const along = rand(rng, 120, (vertical ? city.h : city.w) - 120);
    const off = (rng() < 0.5 ? -1 : 1) * 62;
    peds.push({
      x: vertical ? road + off : along,
      y: vertical ? along : road + off,
      angle: rng() * Math.PI * 2,
      speed: rand(rng, 28, 55),
      color: pick(rng, SHIRTS),
      state: 'walk',
      panic: 0,
      wait: rand(rng, 0, 3),
    });
  }
  return peds;
}
export function updatePeds(peds, dt, city, danger) {
  // danger: {x, y, radius} of the latest gunshot / near-miss, or null.
  for (const p of peds) {
    if (p.state === 'down') continue;
    if (danger && dist(p.x, p.y, danger.x, danger.y) < danger.radius) {
      p.state = 'flee';
      p.panic = 2.5;
      p.angle = angleTo(danger.x, danger.y, p.x, p.y);
    }
    if (p.state === 'flee') {
      p.panic -= dt;
      const sp = 150;
      p.x += Math.cos(p.angle) * sp * dt;
      p.y += Math.sin(p.angle) * sp * dt;
      if (p.panic <= 0) p.state = 'walk';
    } else {
      if (p.wait > 0) { p.wait -= dt; continue; }
      // Stroll along the sidewalk; turn at intersections sometimes.
      const nx = p.x + Math.cos(p.angle) * p.speed * dt;
      const ny = p.y + Math.sin(p.angle) * p.speed * dt;
      if (!onRoad(city, nx, ny) && nx > 30 && nx < city.w - 30 && ny > 30 && ny < city.h - 30) {
        p.x = nx; p.y = ny;
      } else {
        p.angle += (Math.random() < 0.5 ? 1 : -1) * (Math.PI / 2);
        p.wait = Math.floor(Math.random() * 3);
      }
    }
    p.x = clamp(p.x, 30, city.w - 30);
    p.y = clamp(p.y, 30, city.h - 30);
  }
}
