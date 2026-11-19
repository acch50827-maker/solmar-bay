// The wanted system and the Bay Police. Crimes raise the heat; police cars spawn
// in proportion to the wanted level, chase the player, ram and (from 3 stars)
// shoot. Lay low and the heat cools off.
import { clamp, dist, angleTo, angDiff } from './util.js';
import { policeCar } from './vehicles.js';

export function createWanted() {
  return { level: 0, heat: 0, quiet: 0, shootTimer: 0 };
}
export function addCrime(wanted, stars) {
  wanted.heat = clamp(wanted.heat + stars * 20, 0, 100);
  wanted.level = clamp(Math.floor(wanted.heat / 20), 0, 5);
  wanted.quiet = 0;
}
export function updateWanted(wanted, dt, player, police, city, rng, onShoot) {
  const nearest = police.reduce((m, c) => Math.min(m, dist(player.x, player.y, c.x, c.y)), 1e9);
  if (nearest > 520) wanted.quiet += dt; else wanted.quiet = 0;
  if (wanted.level > 0 && wanted.quiet > 9) {
    wanted.heat = Math.max(0, wanted.heat - 20 * dt);
    wanted.level = clamp(Math.floor(wanted.heat / 20), 0, 5);
  }
  // Keep the right number of police on the streets.
  const want = wanted.level * 2;
  while (police.length < want) {
    const a = rng() * Math.PI * 2;
    const d = 650;
    const x = clamp(player.x + Math.cos(a) * d, 60, city.w - 60);
    const y = clamp(player.y + Math.sin(a) * d, 60, city.h - 60);
    police.push(policeCar(x, y, angleTo(x, y, player.x, player.y)));
  }
  while (police.length > want) police.pop();
  // Chase: steer at the player, ram on contact, shoot from 3 stars.
  wanted.shootTimer -= dt;
  for (const c of police) {
    const d = dist(c.x, c.y, player.x, player.y);
    const wantAngle = angleTo(c.x, c.y, player.x, player.y);
    c.angle += clamp(angDiff(c.angle, wantAngle), -2.4 * dt, 2.4 * dt);
    const sp = wanted.level >= 4 ? 460 : 380;
    c.speed += clamp(sp - c.speed, -500 * dt, 400 * dt);
    const nx = c.x + Math.cos(c.angle) * c.speed * dt;
    const ny = c.y + Math.sin(c.angle) * c.speed * dt;
    const hit = city.buildings.some((b) => {
      const cx = Math.max(b.x, Math.min(nx, b.x + b.w));
      const cy = Math.max(b.y, Math.min(ny, b.y + b.h));
      return (nx - cx) ** 2 + (ny - cy) ** 2 < 20 * 20;
    });
    if (!hit) { c.x = nx; c.y = ny; } else { c.angle += 1.2 * dt; c.speed *= 0.6; }
    if (wanted.level >= 3 && d < 420 && wanted.shootTimer <= 0) {
      wanted.shootTimer = 0.9;
      onShoot(c, wantAngle + (rng() - 0.5) * 0.35);
    }
  }
}
export function wantedStars(wanted) { return wanted.level; }
