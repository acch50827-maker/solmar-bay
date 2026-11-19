// Combat: bullets, street thugs, and pickups. The player shoots with the mouse;
// thugs and police shoot back. Cash and health pickups drop from the action.
import { dist, circleRectHit } from './util.js';

export function fireBullet(bullets, x, y, angle, from, speed) {
  bullets.push({ x, y, vx: Math.cos(angle) * (speed || 900), vy: Math.sin(angle) * (speed || 900), life: 0.7, from, dmg: 25 });
}
export function spawnThug(x, y) {
  return { x, y, hp: 50, angle: 0, shootTimer: 1 + Math.random(), state: 'fight', color: '#3a2e2e' };
}
export function updateBullets(bullets, dt, city, G) {
  // G carries peds, cars, police, thugs, player for hit tests; returns events.
  const events = [];
  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i];
    b.life -= dt;
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    let dead = b.life <= 0;
    if (!dead) {
      for (const bd of city.buildings) {
        if (circleRectHit(b.x, b.y, 3, bd)) { dead = true; events.push({ type: 'spark', x: b.x, y: b.y }); break; }
      }
    }
    if (!dead && b.from !== 'player') {
      if (dist(b.x, b.y, G.player.x, G.player.y) < 16) {
        dead = true;
        G.player.hp -= b.dmg;
        events.push({ type: 'playerHit', dmg: b.dmg });
      }
    }
    if (!dead && b.from === 'player') {
      for (const t of G.thugs) {
        if (t.state !== 'down' && dist(b.x, b.y, t.x, t.y) < 18) {
          dead = true; t.hp -= b.dmg;
          if (t.hp <= 0) { t.state = 'down'; events.push({ type: 'thugDown', x: t.x, y: t.y }); }
          break;
        }
      }
      if (!dead) for (const p of G.peds) {
        if (p.state !== 'down' && dist(b.x, b.y, p.x, p.y) < 14) {
          dead = true; p.state = 'down';
          events.push({ type: 'pedDown', x: p.x, y: p.y });
          break;
        }
      }
      if (!dead) for (const c of G.police) {
        if (dist(b.x, b.y, c.x, c.y) < 22) {
          dead = true; c.hp -= b.dmg;
          if (c.hp <= 0) { events.push({ type: 'copDown', x: c.x, y: c.y }); }
          break;
        }
      }
    }
    if (dead) bullets.splice(i, 1);
  }
  return events;
}
export function updateThugs(thugs, dt, player, fire) {
  for (const t of thugs) {
    if (t.state === 'down') continue;
    const d = dist(t.x, t.y, player.x, player.y);
    t.angle = Math.atan2(player.y - t.y, player.x - t.x);
    if (d > 260) {
      t.x += Math.cos(t.angle) * 90 * dt;
      t.y += Math.sin(t.angle) * 90 * dt;
    } else {
      t.shootTimer -= dt;
      if (t.shootTimer <= 0) {
        t.shootTimer = 1.4;
        fire(t.x, t.y, t.angle + (Math.random() - 0.5) * 0.3, 'thug');
      }
    }
  }
}
export function updatePickups(pickups, dt, player, G) {
  for (let i = pickups.length - 1; i >= 0; i--) {
    const p = pickups[i];
    p.bob += dt;
    if (dist(p.x, p.y, player.x, player.y) < 30) {
      if (p.kind === 'cash') { G.cash += p.value; }
      else { player.hp = Math.min(100, player.hp + 40); }
      pickups.splice(i, 1);
      return p.kind;
    }
  }
  return null;
}
export function dropPickup(pickups, x, y, kind, value) {
  pickups.push({ x, y, kind, value: value || 50, bob: 0 });
}
