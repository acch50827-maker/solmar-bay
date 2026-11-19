// Polisi Bay Police + sistem wanted Porto Verde.
import { WORLD_W, WORLD_H, clamp, dist, angDiff, rand, pick } from './util.js';
import { makeCar } from './vehicles.js';
import { sfx, startSiren, stopSiren } from './audio.js';

export function addWanted(state, n) {
  state.wanted = clamp(state.wanted + n, 0, 5);
  state.wantedTimer = 0;
  if (state.wanted > 0) startSiren();
}

export function spawnPolice(state) {
  const want = Math.min(6, 1 + state.wanted);
  while (state.police.length < want) {
    const a = rand(0, Math.PI * 2);
    const d = rand(500, 750);
    const x = clamp(state.player.x + Math.cos(a) * d, 80, WORLD_W - 80);
    const y = clamp(state.player.y + Math.sin(a) * d, 80, WORLD_H - 80);
    const car = makeCar(x, y, Math.atan2(state.player.y - y, state.player.x - x), '#1f3a5f');
    car.cruise = 300 + state.wanted * 22;
    car.speed = car.cruise;
    car.police = true;
    state.police.push({ car, shootCd: rand(0.5, 1.5), ramCd: 0 });
  }
}

export function updatePolice(state, dt) {
  if (state.wanted <= 0) {
    if (state.police.length) { state.police.length = 0; stopSiren(); }
    return;
  }
  spawnPolice(state);
  const p = state.player;
  for (const cop of state.police) {
    const c = cop.car;
    const d = dist(c.x, c.y, p.x, p.y);
    const wantAngle = Math.atan2(p.y - c.y, p.x - c.x);
    c.angle += clamp(angDiff(c.angle, wantAngle), -2.4 * dt, 2.4 * dt);
    const targetSpeed = d > 260 ? c.cruise : c.cruise * 0.8;
    c.speed += clamp(targetSpeed - c.speed, -300 * dt, 220 * dt);
    c.x = clamp(c.x + Math.cos(c.angle) * c.speed * dt, 20, WORLD_W - 20);
    c.y = clamp(c.y + Math.sin(c.angle) * c.speed * dt, 20, WORLD_H - 20);
    // Menabrak pemain.
    if (d < 42 && cop.ramCd <= 0) {
      cop.ramCd = 1.1;
      p.hp = Math.max(0, p.hp - (6 + state.wanted * 2));
      sfx.crash();
      state.shake = 0.35;
      if (p.car) { p.car.speed *= 0.4; p.car.hp -= 8; }
      else { p.x += Math.cos(c.angle) * 26; p.y += Math.sin(c.angle) * 26; }
    }
    cop.ramCd -= dt;
    // Menembak dari bintang 3.
    cop.shootCd -= dt;
    if (state.wanted >= 3 && cop.shootCd <= 0 && d < 520) {
      cop.shootCd = rand(0.9, 1.6);
      const spread = rand(-0.12, 0.12);
      state.bullets.push({
        x: c.x + Math.cos(c.angle) * 26, y: c.y + Math.sin(c.angle) * 26,
        vx: Math.cos(wantAngle + spread) * 620, vy: Math.sin(wantAngle + spread) * 620,
        life: 1.1, fromPolice: true, dmg: 7,
      });
      sfx.shot();
    }
  }
  // Wanted mendingin kalau pemain jauh dari polisi dan tidak berbuat onar.
  state.wantedTimer += dt;
  const nearest = state.police.reduce((m, cop) => Math.min(m, dist(cop.car.x, cop.car.y, p.x, p.y)), 9999);
  if (nearest > 700 && state.wantedTimer > 14) {
    state.wanted -= 1;
    state.wantedTimer = 0;
    if (state.wanted === 0) stopSiren();
  }
}

// Pemain tertangkap: polisi sangat dekat dan pemain lambat / jalan kaki.
export function checkBusted(state) {
  const p = state.player;
  if (state.wanted <= 0) return false;
  const speed = Math.abs(p.speed || 0);
  for (const cop of state.police) {
    if (dist(cop.car.x, cop.car.y, p.x, p.y) < 34 && speed < 40) {
      return true;
    }
  }
  return false;
}

export function doBusted(state) {
  const lost = Math.floor(state.cash * 0.2);
  state.cash -= lost;
  state.lastBustedLoss = lost;
  state.wanted = 0;
  state.police.length = 0;
  stopSiren();
  state.player.hp = 100;
  state.player.x = 560;
  state.player.y = 640;
  if (state.player.car) { state.player.car.speed = 0; state.player.car = null; }
  state.player.onFoot = true;
  sfx.busted();
}
