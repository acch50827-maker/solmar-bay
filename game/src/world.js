// The game's rules and state, with no drawing and no browser in it: the city
// of Solmar Bay, the player on foot and in cars, traffic, pedestrians, the
// police and the wanted level, combat, pickups and the mission story. step()
// advances one fixed step and returns what happened as bit flags, so the
// caller can react — sounds, saving, screens — without the world knowing
// about any of them.
import {
  BEACH_X, CAR, CAR_COLORS, DISTRICTS, PALETTE, PLAYER, ROAD_X, ROAD_Y,
  VIEW, WORLD, WANTED_MAX,
} from './config.js';
import {
  makeParkedCar, makePedestrian, makeTrafficCar,
  updatePedestrian, updateTrafficCar,
} from './traffic.js';
import { updatePolice, updatePoliceCar } from './police.js';
import { createMissionState, updateMissions, EVENT_MISSION } from './missions.js';

export const EVENT_HIT = 1;
export const EVENT_PICKUP = 2;
export const EVENT_OVER = 4;
export const EVENT_CRIME = 8;
export { EVENT_MISSION };

function districtColor(x, y) {
  for (const d of DISTRICTS) {
    if (x >= d.x0 && x < d.x1 && y >= d.y0 && y < d.y1) return d.color;
  }
  return PALETTE.building;
}

function circleHitsBuilding(buildings, x, y, r) {
  for (const b of buildings) {
    const cx = Math.max(b.x, Math.min(x, b.x + b.w));
    const cy = Math.max(b.y, Math.min(y, b.y + b.h));
    if ((x - cx) * (x - cx) + (y - cy) * (y - cy) < r * r) return true;
  }
  return false;
}

function pointInBuilding(buildings, x, y) {
  for (const b of buildings) {
    if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) return true;
  }
  return false;
}

export function createWorld(random) {
  const state = {
    elapsed: 0,
    cash: 0,
    wanted: 0,
    wantedTimer: 0,
    crimeTimer: 99,
    player: {
      x: 1200, y: 1600, angle: -Math.PI / 2, health: PLAYER.health,
      car: null, invulnerable: 0, aimAngle: 0, shootCooldown: 0,
      punchTimer: 0, punchAngle: 0,
    },
    cars: [],
    peds: [],
    bullets: [],
    pickups: [],
    buildings: [],
    trees: [],
    camera: { x: 1200, y: 1600 },
    mission: createMissionState(),
    nextCarId: 1,
    nextPedId: 1,
    pickupTimer: 0,
    dialog: '',
  };

  function buildCity() {
    state.buildings = [];
    state.trees = [];
    for (let bx = 0; bx < 8; bx += 1) {
      for (let by = 0; by < 6; by += 1) {
        const x0 = bx * 400 + 62;
        const x1 = (bx + 1) * 400 - 62;
        const y0 = by * 400 + 62;
        const y1 = (by + 1) * 400 - 62;
        if (bx === 0 && by === 0) {
          // Harbour Park: trees, no buildings.
          for (let t = 0; t < 14; t += 1) {
            state.trees.push({
              x: x0 + random() * (x1 - x0),
              y: y0 + random() * (y1 - y0),
              r: 14 + random() * 10,
            });
          }
          continue;
        }
        if (bx === 7) continue; // Beach: sand and water, no buildings.
        const count = 1 + Math.floor(random() * 2);
        for (let i = 0; i < count; i += 1) {
          const w = 110 + random() * 90;
          const h = 80 + random() * 80;
          const x = x0 + random() * Math.max(1, x1 - x0 - w);
          const y = y0 + random() * Math.max(1, y1 - y0 - h);
          const color = districtColor(x + w / 2, y + h / 2);
          state.buildings.push({ x, y, w, h, color, tall: color === '#5a6b7d' });
        }
      }
    }
    for (let t = 0; t < 40; t += 1) {
      state.trees.push({
        x: 80 + random() * 2800,
        y: 80 + random() * 2200,
        r: 10 + random() * 8,
      });
    }
  }

  function spawnPickups() {
    state.pickups = [];
    for (let i = 0; i < 14; i += 1) {
      state.pickups.push({
        x: 150 + random() * 2700,
        y: 150 + random() * 2100,
        kind: i % 3 === 0 ? 'health' : 'cash',
        active: true,
        timer: 0,
      });
    }
  }

  function reset() {
    state.elapsed = 0;
    state.cash = 0;
    state.wanted = 0;
    state.wantedTimer = 0;
    state.crimeTimer = 99;
    state.bullets = [];
    const p = state.player;
    p.x = 1200; p.y = 1600; p.angle = -Math.PI / 2;
    p.health = PLAYER.health; p.car = null; p.invulnerable = 0;
    p.shootCooldown = 0; p.punchTimer = 0;
    state.mission = createMissionState();
    state.camera.x = 1200;
    state.camera.y = 1600;
    state.cars = [];
    for (let i = 0; i < 22; i += 1) state.cars.push(makeTrafficCar(random, state.nextCarId++));
    for (let i = 0; i < 10; i += 1) state.cars.push(makeParkedCar(random, state.nextCarId++));
    state.peds = [];
    for (let i = 0; i < 36; i += 1) state.peds.push(makePedestrian(random, state.nextPedId++));
    spawnPickups();
  }

  function addCrime(amount) {
    state.wanted = Math.min(WANTED_MAX, state.wanted + amount);
    state.crimeTimer = 0;
    state.wantedTimer = 0;
    return EVENT_CRIME;
  }

  function nearestCar(x, y, maxD) {
    let best = null;
    let bestD = maxD;
    for (const car of state.cars) {
      if (car.kind === 'police') continue;
      const d = Math.hypot(car.x - x, car.y - y);
      if (d < bestD) { bestD = d; best = car; }
    }
    return best;
  }

  // Move a circle, sliding along buildings instead of stopping dead.
  function moveCircle(x, y, dx, dy, r) {
    const nx = x + dx;
    if (!circleHitsBuilding(state.buildings, nx, y, r)) x = nx;
    const ny = y + dy;
    if (!circleHitsBuilding(state.buildings, x, ny, r)) y = ny;
    return { x, y };
  }

  function enterCar() {
    const p = state.player;
    const car = nearestCar(p.x, p.y, 78);
    if (!car) return 0;
    if (car.kind === 'traffic') {
      // Stealing a driven car: its driver bails out and flees on foot.
      state.peds.push({
        id: state.nextPedId++, x: car.x + 40, y: car.y + 30,
        angle: Math.random() * 6.28, speed: 90, color: '#e74c3c',
        alive: true, downTimer: 0, wander: 0,
      });
      car.kind = 'player';
      p.car = car;
      return addCrime(1);
    }
    car.kind = 'player';
    p.car = car;
    return 0;
  }

  function exitCar() {
    const p = state.player;
    const car = p.car;
    if (!car) return;
    const sx = car.x + Math.cos(car.angle + Math.PI / 2) * 44;
    const sy = car.y + Math.sin(car.angle + Math.PI / 2) * 44;
    p.x = Math.max(20, Math.min(WORLD.width - 20, sx));
    p.y = Math.max(20, Math.min(WORLD.height - 20, sy));
    p.angle = car.angle;
    car.kind = 'parked';
    car.speed = 0;
    p.car = null;
  }

  function shootBullet(from) {
    const p = state.player;
    const ox = p.car ? p.car.x : p.x;
    const oy = p.car ? p.car.y : p.y;
    state.bullets.push({
      x: ox + Math.cos(p.aimAngle) * 26,
      y: oy + Math.sin(p.aimAngle) * 26,
      vx: Math.cos(p.aimAngle) * PLAYER.bulletSpeed,
      vy: Math.sin(p.aimAngle) * PLAYER.bulletSpeed,
      life: 0.9,
      from,
      damage: PLAYER.bulletDamage,
    });
  }

  function punch() {
    const p = state.player;
    let ev = 0;
    for (const ped of state.peds) {
      if (!ped.alive) continue;
      const d = Math.hypot(ped.x - p.x, ped.y - p.y);
      if (d >= PLAYER.punchRange) continue;
      const a = Math.atan2(ped.y - p.y, ped.x - p.x);
      let diff = Math.abs(a - p.punchAngle);
      if (diff > Math.PI) diff = Math.PI * 2 - diff;
      if (diff < PLAYER.punchArc) {
        ped.alive = false;
        ped.downTimer = 8;
        ev |= addCrime(1);
      }
    }
    return ev;
  }

  function step(dt, input, harmless) {
    let events = 0;
    state.elapsed += dt;
    const p = state.player;
    if (p.invulnerable > 0) p.invulnerable -= dt;
    if (p.shootCooldown > 0) p.shootCooldown -= dt;
    if (p.punchTimer > 0) p.punchTimer -= dt;
    state.crimeTimer += dt;

    // --- the player, on foot or behind the wheel ---
    if (input) {
      p.aimAngle = input.aimAngle ?? p.aimAngle;
      if (p.car) {
        const car = p.car;
        const forward = input.accel || 0;
        const steer = input.steer || 0;
        if (forward > 0) car.speed += CAR.accel * forward * dt;
        else if (forward < 0) car.speed -= (car.speed > 0 ? CAR.brake : CAR.reverseAccel) * dt;
        else car.speed -= car.speed * CAR.drag * dt * 2;
        car.speed = Math.max(-CAR.maxReverse, Math.min(CAR.maxSpeed, car.speed));
        // Steering keeps some authority even at a crawl, so a car can
        // wiggle out of a tight spot instead of needing speed to turn.
        const authority = Math.max(0.3, Math.abs(car.speed) / CAR.maxSpeed);
        car.angle += steer * CAR.steer * authority * dt * (car.speed < 0 ? -1 : 1);
        while (car.angle > Math.PI) car.angle -= Math.PI * 2;
        while (car.angle < -Math.PI) car.angle += Math.PI * 2;
        const nx = car.x + Math.cos(car.angle) * car.speed * dt;
        const ny = car.y + Math.sin(car.angle) * car.speed * dt;
        // Slide along walls: try each axis on its own, so a car pushing
        // diagonally into a building glides along it instead of stopping
        // dead — and can never wedge itself in a corner.
        let moved = false;
        if (!circleHitsBuilding(state.buildings, nx, car.y, 22)) { car.x = nx; moved = true; }
        if (!circleHitsBuilding(state.buildings, car.x, ny, 22)) { car.y = ny; moved = true; }
        if (!moved) {
          car.speed = -car.speed * 0.3;
          if (Math.abs(car.speed) < 50) car.speed = car.speed >= 0 ? 50 : -50;
        }
        car.x = Math.max(24, Math.min(WORLD.width - 24, car.x));
        car.y = Math.max(24, Math.min(WORLD.height - 24, car.y));
        p.x = car.x; p.y = car.y; p.angle = car.angle;
        // Running over pedestrians is a crime.
        for (const ped of state.peds) {
          if (ped.alive && Math.abs(car.speed) > 140 && Math.hypot(ped.x - car.x, ped.y - car.y) < 32) {
            ped.alive = false;
            ped.downTimer = 8;
            if (!harmless) events |= addCrime(1);
          }
        }
      } else {
        const mx = input.mx || 0;
        const my = input.my || 0;
        const len = Math.hypot(mx, my);
        if (len > 0) {
          const moved = moveCircle(
            p.x, p.y,
            (mx / len) * PLAYER.walkSpeed * dt,
            (my / len) * PLAYER.walkSpeed * dt,
            PLAYER.radius,
          );
          p.x = moved.x;
          p.y = moved.y;
          p.angle = Math.atan2(my, mx);
        }
        p.x = Math.max(20, Math.min(BEACH_X + 130, p.x));
        p.y = Math.max(20, Math.min(WORLD.height - 20, p.y));
      }
      if (input.interact) {
        if (p.car) exitCar();
        else events |= enterCar();
      }
      if (input.punch && p.punchTimer <= 0 && !p.car) {
        p.punchTimer = 0.35;
        p.punchAngle = p.aimAngle;
        if (!harmless) events |= punch();
      }
      if (input.shoot && p.shootCooldown <= 0) {
        p.shootCooldown = PLAYER.shootCooldown;
        shootBullet('player');
      }
    }

    // --- bullets ---
    for (let i = state.bullets.length - 1; i >= 0; i -= 1) {
      const b = state.bullets[i];
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;
      let dead = b.life <= 0 || b.x < 0 || b.y < 0 || b.x > WORLD.width || b.y > WORLD.height;
      if (!dead && pointInBuilding(state.buildings, b.x, b.y)) dead = true;
      if (!dead) {
        if (b.from === 'player') {
          for (const ped of state.peds) {
            if (ped.alive && Math.hypot(ped.x - b.x, ped.y - b.y) < 16) {
              ped.alive = false;
              ped.downTimer = 10;
              dead = true;
              if (!harmless) events |= addCrime(1);
              break;
            }
          }
          if (!dead) {
            for (const car of state.cars) {
              if (car.kind === 'player') continue;
              const lx = (b.x - car.x) * Math.cos(-car.angle) - (b.y - car.y) * Math.sin(-car.angle);
              const ly = (b.x - car.x) * Math.sin(-car.angle) + (b.y - car.y) * Math.cos(-car.angle);
              if (Math.abs(lx) < 30 && Math.abs(ly) < 17) {
                car.health -= b.damage;
                dead = true;
                if (car.kind === 'police' && !harmless) events |= addCrime(1);
                if (car.health <= 0 && car.kind === 'traffic') { car.kind = 'parked'; car.speed = 0; }
                break;
              }
            }
          }
        } else {
          const px = p.car ? p.car.x : p.x;
          const py = p.car ? p.car.y : p.y;
          if (Math.hypot(px - b.x, py - b.y) < (p.car ? 30 : 16)) {
            if (p.invulnerable <= 0) {
              p.health -= b.damage;
              p.invulnerable = 0.5;
              events |= EVENT_HIT;
            }
            dead = true;
          }
        }
      }
      if (dead) state.bullets.splice(i, 1);
    }

    // --- traffic, pedestrians, police ---
    const danger = state.bullets.length > 0;
    for (const car of state.cars) {
      if (car.kind === 'traffic') updateTrafficCar(car, state.cars, dt, random);
      else if (car.kind === 'police') events |= updatePoliceCar(car, state, dt, random);
    }
    for (const ped of state.peds) updatePedestrian(ped, dt, random, danger);
    if (!harmless) {
      updatePolice(state, dt, random);
      // Wanted decays when no crime lately and no police are close by.
      const px = p.car ? p.car.x : p.x;
      const py = p.car ? p.car.y : p.y;
      const policeNear = state.cars.some(
        (car) => car.kind === 'police' && Math.hypot(car.x - px, car.y - py) < 600,
      );
      if (state.crimeTimer > 15 && !policeNear && state.wanted > 0) {
        state.wantedTimer += dt;
        if (state.wantedTimer > 12) {
          state.wanted -= 1;
          state.wantedTimer = 0;
        }
      } else {
        state.wantedTimer = 0;
      }
      events |= updateMissions(state, dt);
    }

    // --- pickups: cash and health ---
    for (const pk of state.pickups) {
      if (!pk.active) {
        pk.timer -= dt;
        if (pk.timer <= 0) pk.active = true;
        continue;
      }
      if (Math.hypot(pk.x - p.x, pk.y - p.y) < 30) {
        pk.active = false;
        pk.timer = 25;
        if (pk.kind === 'cash') state.cash += 25;
        else p.health = Math.min(PLAYER.health, p.health + 30);
        events |= EVENT_PICKUP;
      }
    }

    // --- the camera follows the player, eased ---
    const tx = p.car ? p.car.x : p.x;
    const ty = p.car ? p.car.y : p.y;
    state.camera.x += (tx - state.camera.x) * Math.min(1, dt * 5);
    state.camera.y += (ty - state.camera.y) * Math.min(1, dt * 5);
    state.camera.x = Math.max(VIEW.width / 2 - 200, Math.min(WORLD.width - VIEW.width / 2 + 200, state.camera.x));
    state.camera.y = Math.max(VIEW.height / 2 - 200, Math.min(WORLD.height - VIEW.height / 2 + 200, state.camera.y));

    if (p.health <= 0) events |= EVENT_OVER;
    return events;
  }

  buildCity();
  reset();
  return { state, reset, step, nearestCar, addCrime };
}
