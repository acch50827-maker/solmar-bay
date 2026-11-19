// Kendaraan Porto Verde: lalu lintas di jalan + mobil yang dikendarai pemain.
import { WORLD_W, WORLD_H, rand, randi, pick, clamp, dist, angDiff } from './util.js';
import { ROAD_X, ROAD_Y, ROAD_W, onRoad, moveWithCollision, hitBuilding } from './city.js';
import { sfx } from './audio.js';

export const CAR_COLORS = ['#c0392b', '#2980b9', '#f1c40f', '#27ae60', '#8e44ad', '#e67e22', '#ecf0f1', '#2c3e50', '#16a085', '#d35400'];
const MODELS = ['sedan', 'hatch', 'pickup', 'van'];

export function makeCar(x, y, angle, color) {
  return {
    x, y, angle,
    speed: 0,
    color: color || pick(CAR_COLORS),
    model: pick(MODELS),
    axis: Math.abs(Math.cos(angle)) > 0.7 ? 'x' : 'y',
    dir: Math.cos(angle) >= 0 ? 1 : -1,
    cruise: rand(90, 150),
    turnAt: 0,
    hp: 100,
  };
}

export function spawnTraffic(state, n) {
  for (let i = 0; i < n; i++) {
    const horizontal = Math.random() < 0.5;
    let x, y, angle;
    if (horizontal) {
      y = pick(ROAD_Y) + (Math.random() < 0.5 ? -16 : 16);
      x = rand(100, WORLD_W - 100);
      angle = y % 2 === 0 ? 0 : Math.PI;
      angle = Math.random() < 0.5 ? 0 : Math.PI;
    } else {
      x = pick(ROAD_X) + (Math.random() < 0.5 ? -16 : 16);
      y = rand(100, WORLD_H - 300);
      angle = Math.random() < 0.5 ? Math.PI / 2 : -Math.PI / 2;
    }
    const c = makeCar(x, y, angle);
    c.speed = c.cruise;
    if (dist(c.x, c.y, state.player.x, state.player.y) > 350) state.cars.push(c);
  }
}

// Mobil lalu lintas mengikuti jalan; belok acak di persimpangan.
export function updateTraffic(state, dt) {
  for (const c of state.cars) {
    if (c === state.player.car) continue;
    // Cari persimpangan terdekat di depan.
    const aheadX = c.x + Math.cos(c.angle) * 60;
    const aheadY = c.y + Math.sin(c.angle) * 60;
    const atX = ROAD_X.some((rx) => Math.abs(aheadX - rx) < 26);
    const atY = ROAD_Y.some((ry) => Math.abs(aheadY - ry) < 26);
    if ((atX || atY) && Math.random() < dt * 0.5) {
      // Belok 90 derajat secara acak.
      c.angle += (Math.random() < 0.5 ? 1 : -1) * Math.PI / 2;
      c.axis = c.axis === 'x' ? 'y' : 'x';
    }
    // Perlambat kalau ada mobil di depan.
    let slow = false;
    for (const o of state.cars) {
      if (o === c) continue;
      const d = dist(c.x, c.y, o.x, o.y);
      if (d < 70) {
        const a = Math.atan2(o.y - c.y, o.x - c.x);
        if (Math.abs(angDiff(c.angle, a)) < 0.6) { slow = true; break; }
      }
    }
    const target = slow ? 0 : c.cruise;
    c.speed += clamp(target - c.speed, -260 * dt, 140 * dt);
    const nx = c.x + Math.cos(c.angle) * c.speed * dt;
    const ny = c.y + Math.sin(c.angle) * c.speed * dt;
    if (onRoad(nx, ny) && !hitBuilding(nx, ny, 16)) { c.x = nx; c.y = ny; }
    else { c.angle += Math.PI / 2; }
    // Keluar dari dunia? putar balik.
    if (c.x < 60 || c.x > WORLD_W - 60 || c.y < 60 || c.y > WORLD_H - 60) c.angle += Math.PI;
  }
}

// Kendali mobil pemain: W/S gas-rem, A/D belok.
export function updatePlayerCar(state, dt, input) {
  const car = state.player.car;
  if (!car) return;
  const k = input.keys;
  const fwd = (k['w'] || k['arrowup'] ? 1 : 0) - (k['s'] || k['arrowdown'] ? 0.65 : 0);
  const steer = (k['a'] || k['arrowleft'] ? 1 : 0) - (k['d'] || k['arrowright'] ? 1 : 0);
  const maxSpeed = 460;
  car.speed = clamp(car.speed + fwd * 420 * dt - car.speed * 0.9 * dt, -180, maxSpeed);
  if (Math.abs(car.speed) > 12) {
    car.angle += steer * 2.1 * dt * (car.speed > 0 ? 1 : -1) * clamp(Math.abs(car.speed) / 160, 0.35, 1);
  }
  const nx = car.x + Math.cos(car.angle) * car.speed * dt;
  const ny = car.y + Math.sin(car.angle) * car.speed * dt;
  const hit = hitBuilding(nx, ny, 17);
  if (hit) {
    if (Math.abs(car.speed) > 200) {
      sfx.crash();
      car.hp -= 18;
      state.player.hp = Math.max(0, state.player.hp - 4);
    }
    car.speed *= -0.25;
  } else {
    car.x = clamp(nx, 20, WORLD_W - 20);
    car.y = clamp(ny, 20, WORLD_H - 20);
  }
  state.player.x = car.x;
  state.player.y = car.y;
  state.player.angle = car.angle;
  state.player.speed = car.speed;
}

// Cari mobil terdekat yang bisa dicuri (tombol E).
export function nearestStealable(state) {
  let best = null;
  let bd = 70;
  for (const c of state.cars) {
    if (c === state.player.car) continue;
    const d = dist(state.player.x, state.player.y, c.x, c.y);
    if (d < bd) { bd = d; best = c; }
  }
  return best;
}

export function drawCarShape(ctx, x, y, angle, color, model, police) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  const len = model === 'van' ? 52 : model === 'pickup' ? 50 : 46;
  const wid = 22;
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fillRect(-len / 2 + 3, -wid / 2 + 4, len, wid);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(-len / 2, -wid / 2, len, wid, 6);
  ctx.fill();
  if (police) {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-6, -wid / 2, 12, wid);
    ctx.fillStyle = '#111111';
    ctx.font = 'bold 8px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('BAY', 0, 3);
  } else {
    ctx.fillStyle = 'rgba(20,30,40,0.85)';
    ctx.beginPath();
    ctx.roundRect(-len / 2 + 8, -wid / 2 + 4, model === 'van' ? 30 : 16, wid - 8, 3);
    ctx.fill();
  }
  ctx.fillStyle = '#111';
  ctx.fillRect(-len / 2 + 6, -wid / 2 - 2, 9, 4);
  ctx.fillRect(-len / 2 + 6, wid / 2 - 2, 9, 4);
  ctx.fillRect(len / 2 - 15, -wid / 2 - 2, 9, 4);
  ctx.fillRect(len / 2 - 15, wid / 2 - 2, 9, 4);
  ctx.fillStyle = '#ffe9a8';
  ctx.fillRect(len / 2 - 2, -wid / 2 + 4, 2, 4);
  ctx.fillRect(len / 2 - 2, wid / 2 - 8, 2, 4);
  ctx.restore();
}
