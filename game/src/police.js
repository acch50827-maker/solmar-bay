// The Bay Police. A police car is a free-physics car that steers toward the
// player, rams them, and — from 3 stars — shoots. How many are out is the
// wanted level: none at 0 stars, one per star up to five. When the player is
// hidden (no police close and no crime for a while) the wanted level falls
// and the police give up.
import { CAR, WANTED_MAX, WORLD } from './config.js';

export function makePoliceCar(id, x, y) {
  return {
    id,
    kind: 'police',
    axis: 'v',
    road: 0,
    dir: 1,
    lane: 0,
    along: 0,
    x,
    y,
    angle: 0,
    speed: 0,
    color: '#2f6fd0',
    driver: 'police',
    health: 120,
    turnCooldown: 0,
    shootTimer: 1 + Math.random() * 2,
    sirenPhase: Math.random() * 2,
  };
}

export function policeTargetCount(wanted) {
  return Math.min(wanted, WANTED_MAX);
}

function wrapAngle(a) {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

/** Steer one police car toward the player, ram on contact, shoot from 3 stars. */
export function updatePoliceCar(car, state, dt, random) {
  const player = state.player;
  const px = player.car ? player.car.x : player.x;
  const py = player.car ? player.car.y : player.y;
  const dx = px - car.x;
  const dy = py - car.y;
  const dist = Math.hypot(dx, dy) || 1;
  const wantAngle = Math.atan2(dy, dx);
  const diff = wrapAngle(wantAngle - car.angle);
  car.angle += Math.max(-2.8 * dt, Math.min(2.8 * dt, diff));
  car.angle = wrapAngle(car.angle);
  const targetSpeed = Math.min(CAR.policeSpeed, 300 + state.wanted * 55);
  car.speed += (targetSpeed - car.speed) * Math.min(1, dt * 0.8);
  car.x += Math.cos(car.angle) * car.speed * dt;
  car.y += Math.sin(car.angle) * car.speed * dt;
  car.x = Math.max(30, Math.min(WORLD.width - 30, car.x));
  car.y = Math.max(30, Math.min(WORLD.height - 30, car.y));
  car.sirenPhase += dt * 4;

  // Ram: contact hurts the player and slows the police car down.
  if (dist < 48 && player.invulnerable <= 0) {
    player.health -= 5;
    player.invulnerable = 1.0;
    car.speed *= 0.4;
    return 1; // EVENT_HIT
  }
  // Shoot from 3 stars, when close enough and roughly facing the player.
  car.shootTimer -= dt;
  if (state.wanted >= 3 && car.shootTimer <= 0 && dist < 520 && Math.abs(diff) < 0.5) {
    car.shootTimer = 1.4 + random() * 1.2;
    state.bullets.push({
      x: car.x + Math.cos(car.angle) * 30,
      y: car.y + Math.sin(car.angle) * 30,
      vx: Math.cos(wantAngle) * 620,
      vy: Math.sin(wantAngle) * 620,
      life: 1.1,
      from: 'police',
      damage: 7,
    });
  }
  return 0;
}

/** Keep the right number of police cars out, spawning them just off-screen. */
export function updatePolice(state, dt, random) {
  const want = policeTargetCount(state.wanted);
  const police = state.cars.filter((car) => car.kind === 'police');
  const player = state.player;
  const px = player.car ? player.car.x : player.x;
  const py = player.car ? player.car.y : player.y;
  if (police.length < want) {
    const angle = random() * Math.PI * 2;
    const x = Math.max(60, Math.min(WORLD.width - 60, px + Math.cos(angle) * 750));
    const y = Math.max(60, Math.min(WORLD.height - 60, py + Math.sin(angle) * 750));
    state.cars.push(makePoliceCar(state.nextCarId++, x, y));
  } else if (police.length > want) {
    // Wanted fell: the furthest police car gives up and drives away.
    let far = police[0];
    let farD = -1;
    for (const car of police) {
      const d = Math.hypot(car.x - px, car.y - py);
      if (d > farD) { farD = d; far = car; }
    }
    state.cars.splice(state.cars.indexOf(far), 1);
  }
}
