// Traffic cars and pedestrians. A traffic car is not a free-physics car:
// it drives along one road's centre-line, in one direction and one lane,
// turns at intersections, and slows for the car ahead — so traffic stays on
// the roads and never drives through buildings. Pedestrians walk the
// sidewalks beside the roads and turn at intersections the same way.
import { CAR_COLORS, PED_COLORS, ROAD_X, ROAD_Y } from './config.js';

export function nearestRoadX(x) {
  let best = ROAD_X[0];
  for (const road of ROAD_X) {
    if (Math.abs(road - x) < Math.abs(best - x)) best = road;
  }
  return best;
}
export function nearestRoadY(y) {
  let best = ROAD_Y[0];
  for (const road of ROAD_Y) {
    if (Math.abs(road - y) < Math.abs(best - y)) best = road;
  }
  return best;
}
export function onRoad(x, y) {
  const onVertical = ROAD_X.some((road) => Math.abs(x - road) < 58);
  const onHorizontal = ROAD_Y.some((road) => Math.abs(y - road) < 58);
  return onVertical || onHorizontal;
}

export function makeTrafficCar(random, id) {
  const vertical = random() < 0.5;
  const road = vertical
    ? ROAD_X[Math.floor(random() * ROAD_X.length)]
    : ROAD_Y[Math.floor(random() * ROAD_Y.length)];
  const dir = random() < 0.5 ? 1 : -1;
  const along = 100 + random() * 2200;
  const lane = random() < 0.5 ? -24 : 24;
  return {
    id,
    kind: 'traffic',
    axis: vertical ? 'v' : 'h',
    road,
    dir,
    lane,
    along,
    x: vertical ? road + lane : along,
    y: vertical ? along : road + lane,
    angle: vertical ? (dir > 0 ? Math.PI / 2 : -Math.PI / 2) : (dir > 0 ? 0 : Math.PI),
    speed: 120 + random() * 60,
    color: CAR_COLORS[Math.floor(random() * CAR_COLORS.length)],
    driver: 'traffic',
    health: 100,
    turnCooldown: 0,
  };
}

export function makeParkedCar(random, id) {
  const vertical = random() < 0.5;
  const road = vertical
    ? ROAD_X[Math.floor(random() * ROAD_X.length)]
    : ROAD_Y[Math.floor(random() * ROAD_Y.length)];
  const along = 150 + random() * 2100;
  const side = random() < 0.5 ? -58 : 58;
  return {
    id,
    kind: 'parked',
    axis: vertical ? 'v' : 'h',
    road,
    dir: 1,
    lane: side,
    along,
    x: vertical ? road + side : along,
    y: vertical ? along : road + side,
    angle: vertical ? (random() < 0.5 ? Math.PI / 2 : -Math.PI / 2) : (random() < 0.5 ? 0 : Math.PI),
    speed: 0,
    color: CAR_COLORS[Math.floor(random() * CAR_COLORS.length)],
    driver: null,
    health: 100,
    turnCooldown: 0,
  };
}

export function makePedestrian(random, id) {
  const vertical = random() < 0.5;
  const road = vertical
    ? ROAD_X[Math.floor(random() * ROAD_X.length)]
    : ROAD_Y[Math.floor(random() * ROAD_Y.length)];
  const side = random() < 0.5 ? -70 : 70;
  return {
    id,
    x: vertical ? road + side : 100 + random() * 2200,
    y: vertical ? 100 + random() * 2200 : road + side,
    angle: random() * Math.PI * 2,
    speed: 35 + random() * 35,
    color: PED_COLORS[Math.floor(random() * PED_COLORS.length)],
    alive: true,
    downTimer: 0,
    wander: 0,
  };
}

// How far ahead the nearest car is, in the direction this car faces.
function gapAhead(cars, car) {
  let best = Infinity;
  for (const other of cars) {
    if (other === car || other.kind === 'parked') continue;
    const dx = other.x - car.x;
    const dy = other.y - car.y;
    const forward = dx * Math.cos(car.angle) + dy * Math.sin(car.angle);
    const side = Math.abs(-dx * Math.sin(car.angle) + dy * Math.cos(car.angle));
    if (forward > 0 && forward < best && side < 30) best = forward;
  }
  return best;
}

/** Move one traffic car along its road; turn at an intersection when its cooldown allows. */
export function updateTrafficCar(car, cars, dt, random) {
  if (car.kind !== 'traffic') return;
  car.turnCooldown -= dt;
  const ahead = gapAhead(cars, car);
  const targetSpeed = ahead < 110 ? 0 : 150;
  car.speed += (targetSpeed - car.speed) * Math.min(1, dt * 1.5);
  car.along += car.dir * car.speed * dt;

  // Is the car at a crossing road right now?
  const crossing = ROAD_X.some((road) => Math.abs(car.along - road) < 8)
    || ROAD_Y.some((road) => Math.abs(car.along - road) < 8);
  if (crossing && car.turnCooldown <= 0 && random() < 0.35) {
    // Turn onto the crossing road: swap axis, keep the crossing coordinate.
    const crossRoad = car.axis === 'v' ? nearestRoadY(car.along) : nearestRoadX(car.along);
    const newDir = random() < 0.5 ? 1 : -1;
    const newLane = random() < 0.5 ? -24 : 24;
    if (car.axis === 'v') {
      car.axis = 'h';
      car.road = crossRoad;
      car.along = car.x;
    } else {
      car.axis = 'v';
      car.road = crossRoad;
      car.along = car.y;
    }
    car.lane = newLane;
    car.dir = newDir;
    car.turnCooldown = 4;
  }

  if (car.axis === 'v') {
    car.x = car.road + car.lane;
    car.y = car.along;
    car.angle = car.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
    if (car.along < 60) { car.dir = 1; car.along = 60; }
    if (car.along > 2340) { car.dir = -1; car.along = 2340; }
  } else {
    car.x = car.along;
    car.y = car.road + car.lane;
    car.angle = car.dir > 0 ? 0 : Math.PI;
    if (car.along < 60) { car.dir = 1; car.along = 60; }
    if (car.along > 3140) { car.dir = -1; car.along = 3140; }
  }
}

/** Pedestrians stroll the sidewalks, turning at intersections, and flee from gunfire. */
export function updatePedestrian(ped, dt, random, danger) {
  if (!ped.alive) {
    ped.downTimer -= dt;
    if (ped.downTimer <= 0) {
      ped.alive = true;
      ped.x = 200 + random() * 2800;
      ped.y = 200 + random() * 2000;
    }
    return;
  }
  ped.wander -= dt;
  if (ped.wander <= 0) {
    ped.wander = 2 + random() * 4;
    const nearX = ROAD_X.some((road) => Math.abs(ped.x - road) < 90);
    const nearY = ROAD_Y.some((road) => Math.abs(ped.y - road) < 90);
    if ((nearX || nearY) && random() < 0.6) {
      ped.angle += (random() < 0.5 ? 1 : -1) * (Math.PI / 2);
    }
  }
  const speed = danger ? ped.speed * 2.2 : ped.speed;
  ped.x += Math.cos(ped.angle) * speed * dt;
  ped.y += Math.sin(ped.angle) * speed * dt;
  if (ped.x < 40) { ped.x = 40; ped.angle = 0; }
  if (ped.x > 3160) { ped.x = 3160; ped.angle = Math.PI; }
  if (ped.y < 40) { ped.y = 40; ped.angle = Math.PI / 2; }
  if (ped.y > 2360) { ped.y = 2360; ped.angle = -Math.PI / 2; }
}
