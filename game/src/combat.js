// Tembak-menembak Porto Verde: peluru pemain, preman misi, dan pickup.
import { WORLD_W, WORLD_H, clamp, dist, rand, pick } from './util.js';
import { sfx } from './audio.js';
import { addWanted } from './police.js';

export function firePlayerShot(state, tx, ty) {
  const p = state.player;
  if (state.fireCd > 0) return;
  state.fireCd = 0.22;
  const a = Math.atan2(ty - p.y, tx - p.x);
  state.bullets.push({
    x: p.x + Math.cos(a) * 20, y: p.y + Math.sin(a) * 20,
    vx: Math.cos(a) * 700, vy: Math.sin(a) * 700,
    life: 0.9, fromPolice: false, dmg: 34,
  });
  state.shotsFiredAt = 1.2;
  sfx.shot();
  state.muzzle = 0.08;
}

export function spawnThugs(state, x, y, n) {
  for (let i = 0; i < n; i++) {
    state.thugs.push({
      x: x + rand(-70, 70), y: y + rand(-70, 70),
      angle: rand(0, Math.PI * 2),
      hp: 100, speed: rand(60, 85),
      shootCd: rand(0.6, 1.4),
      color: '#3a2b2b',
    });
  }
}

export function updateThugs(state, dt) {
  const p = state.player;
  for (const t of state.thugs) {
    const d = dist(t.x, t.y, p.x, p.y);
    const a = Math.atan2(p.y - t.y, p.x - t.x);
    t.angle = a;
    if (d > 200) {
      t.x += Math.cos(a) * t.speed * dt;
      t.y += Math.sin(a) * t.speed * dt;
    }
    t.shootCd -= dt;
    if (t.shootCd <= 0 && d < 480) {
      t.shootCd = rand(1.1, 1.8);
      const spread = rand(-0.15, 0.15);
      state.bullets.push({
        x: t.x + Math.cos(a) * 18, y: t.y + Math.sin(a) * 18,
        vx: Math.cos(a + spread) * 560, vy: Math.sin(a + spread) * 560,
        life: 1.0, fromPolice: false, dmg: 6, fromThug: true,
      });
      sfx.shot();
    }
  }
}

export function updateBullets(state, dt) {
  const p = state.player;
  for (const b of state.bullets) {
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;
    if (b.x < 0 || b.y < 0 || b.x > WORLD_W || b.y > WORLD_H) b.life = 0;
    // Kena preman (peluru pemain).
    if (!b.fromPolice) {
      for (const t of state.thugs) {
        if (dist(b.x, b.y, t.x, t.y) < 16) {
          t.hp -= b.dmg;
          b.life = 0;
          sfx.hit();
          if (t.hp <= 0) {
            state.kills = (state.kills || 0) + 1;
            state.cash += 50;
            dropPickup(state, t.x, t.y, 'cash');
          }
          break;
        }
      }
      if (b.life <= 0) continue;
      // Kena mobil polisi.
      for (const cop of state.police) {
        if (dist(b.x, b.y, cop.car.x, cop.car.y) < 22) {
          cop.car.hp -= b.dmg;
          b.life = 0;
          sfx.hit();
          if (cop.car.hp <= 0) {
            cop.car.hp = 100;
            cop.car.x = clamp(cop.car.x + rand(-600, 600), 80, WORLD_W - 80);
            cop.car.y = clamp(cop.car.y + rand(-600, 600), 80, WORLD_H - 80);
            state.cash += 100;
          }
          break;
        }
      }
      if (b.life <= 0) continue;
      // Kena pejalan kaki: wanted naik.
      for (const ped of state.peds) {
        if (dist(b.x, b.y, ped.x, ped.y) < 12) {
          ped.panic = 2.5;
          addWanted(state, 1);
          b.life = 0;
          break;
        }
      }
    } else {
      // Peluru musuh kena pemain.
      if (dist(b.x, b.y, p.x, p.y) < (p.car ? 24 : 13)) {
        p.hp = Math.max(0, p.hp - b.dmg);
        b.life = 0;
        sfx.hit();
        state.shake = 0.25;
      }
    }
  }
  state.bullets = state.bullets.filter((b) => b.life > 0);
  state.thugs = state.thugs.filter((t) => t.hp > 0);
}

export function dropPickup(state, x, y, kind) {
  state.pickups.push({ x, y, kind, t: 0 });
}

export function spawnPickups(state) {
  const spots = [
    [1000, 200, 'cash'], [1800, 1000, 'health'], [600, 1400, 'cash'],
    [2600, 1000, 'health'], [1400, 2200, 'cash'], [3000, 600, 'health'],
    [200, 1800, 'cash'], [2200, 2200, 'health'],
  ];
  for (const [x, y, kind] of spots) state.pickups.push({ x, y, kind, t: 0 });
}

export function updatePickups(state, dt) {
  const p = state.player;
  for (const pk of state.pickups) pk.t += dt;
  state.pickups = state.pickups.filter((pk) => {
    if (dist(pk.x, pk.y, p.x, p.y) < 30) {
      if (pk.kind === 'cash') { state.cash += 100; sfx.cash(); }
      else { p.hp = clamp(p.hp + 40, 0, 100); sfx.pickup(); }
      return false;
    }
    return true;
  });
}

export function drawBullets(ctx, cam, state) {
  for (const b of state.bullets) {
    ctx.fillStyle = b.fromPolice ? '#ff5a3c' : '#ffe14d';
    ctx.beginPath();
    ctx.arc(b.x - cam.x, b.y - cam.y, 3.5, 0, Math.PI * 2);
    ctx.fill();
  }
}
