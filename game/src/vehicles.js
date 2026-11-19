// Cars: player driving physics, traffic that follows the road grid, parked cars,
// and stealing. All movement is top-down arcade physics with wall sliding.
import { clamp, dist, angleTo, angDiff, rand, randi, pick } from './util.js';
import { onRoad, hitsBuilding } from './city.js';

const PALETTE = ['#d94f3d', '#3d7dd9', '#e8b93c', '#7bc47f', '#c9c9c9', '#8e6fc0', '#e87fb0', '#3db8a6'];
const POLICE_COLOR = '#2244aa';

export function makeCar(x, y, angle, color, kind) {
  return { x, y, angle, speed: 0, color, kind: kind || 'traffic', hp: 100, dir: 0, targetSpeed: 0, honk: 0 };
}
export function spawnTraffic(city, rng, n) {
  const cars = [];
  for (let i = 0; i < n; i++) {
    const vertical = rng() < 0.5;
    const road = vertical ? pick(rng, city.roadsV) : pick(rng, city.roadsH);
    const along = rand(rng, 150, (vertical ? city.h : city.w) - 150);
    const x = vertical ? road : along;
    const y = vertical ? along : road;
    const angle = vertical ? (rng() < 0.5 ? Math.PI / 2 : -Math.PI / 2) : (rng() < 0.5 ? 0 : Math.PI);
    const c = makeCar(x, y, angle, pick(rng, PALETTE), 'traffic');
    c.dir = angle;
    c.targetSpeed = rand(rng, 90, 150);
    c.speed = c.targetSpeed;
    cars.push(c);
  }
  return cars;
}
export function spawnParked(city, rng, n) {
  const cars = [];
  let tries = 0;
  while (cars.length < n && tries < 300) {
    tries++;
    const vertical = rng() < 0.5;
    const road = vertical ? pick(rng, city.roadsV) : pick(rng, city.roadsH);
    const along = rand(rng, 150, (vertical ? city.h : city.w) - 150);
    const off = (rng() < 0.5 ? -1 : 1) * 34;
    const x = vertical ? road + off : along;
    const y = vertical ? along : road + off;
    if (hitsBuilding(city, x, y, 24)) continue;
    const angle = vertical ? (off > 0 ? Math.PI / 2 : -Math.PI / 2) : (off > 0 ? 0 : Math.PI);
    cars.push(makeCar(x, y, angle, pick(rng, PALETTE), 'parked'));
  }
  return cars;
}
function slideMove(city, car, nx, ny, r) {
  // Move axis by axis so the car slides along walls instead of sticking.
  const ox = car.x, oy = car.y;
  car.x = nx;
  if (hitsBuilding(city, car.x, car.y, r) || car.x < 20 || car.x > city.w - 20) car.x = ox;
  car.y = ny;
  if (hitsBuilding(city, car.y ? car.x : car.x, car.y, r) || car.y < 20 || car.y > city.h - 20) car.y = oy;
}
export function updatePlayerCar(car, input, dt, city) {
  const fwd = (input.down('KeyW') || input.down('ArrowUp') ? 1 : 0) - (input.down('KeyS') || input.down('ArrowDown') ? 1 : 0);
  const steer = (input.down('KeyA') || input.down('ArrowLeft') ? 1 : 0) - (input.down('KeyD') || input.down('ArrowRight') ? 1 : 0);
  const handbrake = input.down('Space');
  const maxSpeed = onRoad(city, car.x, car.y) ? 540 : 300;
  const accel = fwd > 0 ? 420 : fwd < 0 ? 300 : 0;
  car.speed += accel * fwd * dt;
  if (fwd === 0) car.speed -= Math.sign(car.speed) * Math.min(Math.abs(car.speed), 260 * dt);
  if (handbrake) car.speed -= Math.sign(car.speed) * Math.min(Math.abs(car.speed), 700 * dt);
  car.speed = clamp(car.speed, -180, maxSpeed);
  const turn = steer * (car.speed >= 0 ? 1 : -1) * clamp(Math.abs(car.speed) / 160, 0, 1) * 2.6 * (handbrake ? 1.5 : 1);
  car.angle += turn * dt * Math.sign(car.speed || 1);
  const nx = car.x + Math.cos(car.angle) * car.speed * dt;
  const ny = car.y + Math.sin(car.angle) * car.speed * dt;
  slideMove(city, car, nx, ny, 20);
  return Math.abs(car.speed) / 540;
}
function nearestIntersection(city, x, y) {
  let best = null, bd = 1e9;
  for (const rx of city.roadsV) for (const ry of city.roadsH) {
    const d = Math.abs(x - rx) + Math.abs(y - ry);
    if (d < bd) { bd = d; best = { x: rx, y: ry }; }
  }
  return best;
}
export function updateTrafficCar(car, dt, city, allCars, rng) {
  // Follow the road grid: drive straight, pick a new direction at intersections.
  const ix = nearestIntersection(city, car.x, car.y);
  const atJunction = ix && Math.abs(car.x - ix.x) < 14 && Math.abs(car.y - ix.y) < 14;
  if (atJunction && rng() < 0.6) {
    const dirs = [0, Math.PI / 2, Math.PI, -Math.PI / 2];
    const cur = car.dir;
    const options = dirs.filter((d) => Math.abs(angDiff(cur, d)) > 2.4); // no U-turn
    car.dir = pick(rng, options);
    car.x = ix.x; car.y = ix.y;
  }
  // Slow down for the car ahead on the same lane.
  let want = car.targetSpeed;
  for (const o of allCars) {
    if (o === car) continue;
    const d = dist(car.x, car.y, o.x, o.y);
    if (d < 70 && Math.abs(angDiff(car.dir, angleTo(car.x, car.y, o.x, o.y))) < 0.7) { want = 0; break; }
  }
  car.speed += clamp(want - car.speed, -300 * dt, 200 * dt);
  const nx = car.x + Math.cos(car.dir) * car.speed * dt;
  const ny = car.y + Math.sin(car.dir) * car.speed * dt;
  if (!hitsBuilding(city, nx, ny, 20)) { car.x = nx; car.y = ny; }
  car.angle = car.dir;
  // Wrap around the far edge so traffic never runs out.
  if (car.x < 40 || car.x > city.w - 40 || car.y < 40 || car.y > city.h - 40) {
    const vertical = rng() < 0.5;
    const road = vertical ? pick(rng, city.roadsV) : pick(rng, city.roadsH);
    car.x = vertical ? road : rand(rng, 150, city.w - 150);
    car.y = vertical ? rand(rng, 150, city.h - 150) : road;
    car.dir = vertical ? (rng() < 0.5 ? Math.PI / 2 : -Math.PI / 2) : (rng() < 0.5 ? 0 : Math.PI);
  }
}
export function nearestCar(cars, x, y, maxD) {
  let best = null, bd = maxD;
  for (const c of cars) {
    const d = dist(x, y, c.x, c.y);
    if (d < bd) { bd = d; best = c; }
  }
  return best;
}
export function policeCar(x, y, angle) {
  const c = makeCar(x, y, angle, POLICE_COLOR, 'police');
  c.targetSpeed = 300;
  return c;
}
