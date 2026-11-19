// Pejalan kaki Porto Verde: berjalan di trotoar, menghindar dari mobil dan tembakan.
import { WORLD_W, WORLD_H, rand, randi, pick, clamp, dist } from './util.js';
import { onRoad, moveWithCollision, nearestRoad, hitBuilding } from './city.js';

const SHIRTS = ['#d94f4f', '#4f7ad9', '#4fd97a', '#d9c94f', '#9a4fd9', '#e8e8e8', '#333333', '#d98a4f'];
const PANTS = ['#2b3a4a', '#4a2b2b', '#2b4a2b', '#555555'];

export function spawnPeds(state, n) {
  for (let i = 0; i < n; i++) {
    let x, y, tries = 0;
    do {
      x = rand(80, WORLD_W - 80);
      y = rand(80, WORLD_H - 260);
      tries++;
    } while (tries < 20 && (hitBuilding(x, y, 14) || !onRoad(x, y)));
    state.peds.push({
      x, y,
      angle: rand(0, Math.PI * 2),
      speed: rand(28, 55),
      shirt: pick(SHIRTS),
      pants: pick(PANTS),
      panic: 0,
      target: null,
      walkPhase: rand(0, 6),
    });
  }
}

function pickSidewalkTarget(p) {
  const r = nearestRoad(p.x, p.y);
  const along = Math.random() < 0.5;
  if (along) {
    const horizontal = Math.abs(p.y - r.y) < Math.abs(p.x - r.x);
    if (horizontal) return { x: clamp(p.x + rand(-260, 260), 60, WORLD_W - 60), y: r.y + (Math.random() < 0.5 ? -58 : 58) };
    return { x: r.x + (Math.random() < 0.5 ? -58 : 58), y: clamp(p.y + rand(-260, 260), 60, WORLD_H - 60) };
  }
  return { x: clamp(p.x + rand(-300, 300), 60, WORLD_W - 60), y: clamp(p.y + rand(-300, 300), 60, WORLD_H - 260) };
}

export function updatePeds(state, dt) {
  const px = state.player.x;
  const py = state.player.y;
  for (const p of state.peds) {
    p.walkPhase += dt * 6;
    // Panik kalau ada tembakan atau mobil ngebut di dekatnya.
    const nearCar = state.cars.some((c) => dist(p.x, p.y, c.x, c.y) < 70 && Math.abs(c.speed) > 120);
    const nearShot = state.shotsFiredAt > 0 && dist(p.x, p.y, px, py) < 260;
    if (nearCar || nearShot) p.panic = Math.max(p.panic, 1.6);
    if (p.panic > 0) {
      p.panic -= dt;
      const away = Math.atan2(p.y - py, p.x - px);
      p.angle = away;
      moveWithCollision(p, Math.cos(away) * 130 * dt, Math.sin(away) * 130 * dt, 10);
      continue;
    }
    if (!p.target || dist(p.x, p.y, p.target.x, p.target.y) < 18) {
      p.target = pickSidewalkTarget(p);
    }
    const a = Math.atan2(p.target.y - p.y, p.target.x - p.x);
    p.angle = a;
    moveWithCollision(p, Math.cos(a) * p.speed * dt, Math.sin(a) * p.speed * dt, 10);
  }
}

// Pejalan kaki yang tertabrak mobil: jatuh, wanted naik.
export function checkPedHit(state, car) {
  for (const p of state.peds) {
    if (dist(p.x, p.y, car.x, car.y) < 26 && Math.abs(car.speed) > 60) {
      p.panic = 2.5;
      p.x += Math.cos(car.angle) * 30;
      p.y += Math.sin(car.angle) * 30;
      return true;
    }
  }
  return false;
}

export function drawPeds(ctx, cam, state) {
  for (const p of state.peds) {
    const sx = p.x - cam.x;
    const sy = p.y - cam.y;
    if (sx < -30 || sy < -30 || sx > ctx.canvas.width + 30 || sy > ctx.canvas.height + 30) continue;
    const bob = Math.sin(p.walkPhase) * 1.5;
    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(p.angle);
    ctx.fillStyle = p.pants;
    ctx.fillRect(-4, -5, 8, 10);
    ctx.fillStyle = p.shirt;
    ctx.fillRect(-5, -6 + bob * 0.3, 10, 9);
    ctx.fillStyle = '#e8b98a';
    ctx.beginPath();
    ctx.arc(7, 0, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}
