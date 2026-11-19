// Porto Verde — game entry point. Wires the city, cars, people, police, combat,
// missions, sound and rendering into one loop, plus title / pause / busted /
// complete screens, autosave, and the ?shot= scene presets.
import { buildCity, onRoad, hitsBuilding } from './city.js';
import { createInput } from './input.js';
import { createAudio } from './audio.js';
import { spawnTraffic, spawnParked, updatePlayerCar, updateTrafficCar, nearestCar } from './vehicles.js';
import { spawnPeds, updatePeds } from './people.js';
import { createWanted, addCrime, updateWanted } from './police.js';
import { fireBullet, updateBullets, updateThugs, updatePickups, dropPickup, spawnThug } from './combat.js';
import { MISSIONS, createMissionState, updateMission } from './missions.js';
import { drawWorld, drawHUD, drawMenu } from './render.js';
import { applyShot } from './shots.js';
import { clamp, dist, resolveCircleRect, mulberry32 } from './util.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const rng = mulberry32(20261119);
const city = buildCity();
const input = createInput(canvas);
const audio = createAudio();

const G = {
  mode: 'title',
  time: 0,
  cash: 0,
  city,
  cam: { x: 600, y: 600 },
  player: { x: city.spots.start.x, y: city.spots.start.y, angle: 0, hp: 100, car: null, fireT: 0 },
  cars: [], police: [], peds: [], thugs: [], bullets: [], pickups: [], particles: [],
  wanted: createWanted(),
  mission: createMissionState(),
  save: null,
  shot: new URLSearchParams(location.search).get('shot'),
  muted: false,
};
G.cars = [...spawnTraffic(city, rng, 14), ...spawnParked(city, rng, 10)];
G.peds = spawnPeds(city, rng, 26);

function loadSave() {
  try {
    const raw = localStorage.getItem('porto-verde-save-v1');
    if (raw) G.save = JSON.parse(raw);
  } catch (e) { G.save = null; }
}
function writeSave() {
  try {
    localStorage.setItem('porto-verde-save-v1', JSON.stringify({
      cash: G.cash, missionIndex: G.mission.index,
      x: G.player.x, y: G.player.y,
    }));
  } catch (e) { /* storage unavailable */ }
}
function startGame(fresh) {
  audio.ensure();
  if (!fresh && G.save) {
    G.cash = G.save.cash || 0;
    G.mission.index = Math.min(G.save.missionIndex || 0, MISSIONS.length - 1);
    G.player.x = G.save.x || city.spots.start.x;
    G.player.y = G.save.y || city.spots.start.y;
  } else {
    G.cash = 0;
    G.mission = createMissionState();
    G.player.x = city.spots.start.x;
    G.player.y = city.spots.start.y;
  }
  G.player.hp = 100;
  G.player.car = null;
  G.wanted = createWanted();
  G.police = [];
  G.thugs = [];
  G.bullets = [];
  G.mode = 'playing';
  audio.click();
}
function burst(x, y, color, n) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    G.particles.push({ x, y, vx: Math.cos(a) * 120, vy: Math.sin(a) * 120, r: 2 + Math.random() * 3, life: 0.5, max: 0.5, color });
  }
}
function onStepEnter() {
  // Side effects when a new mission step begins.
  const m = MISSIONS[G.mission.index];
  if (!m) return;
  const step = m.steps[G.mission.step];
  if (!step) return;
  if (m.id === 'pickup' && G.mission.step === 1) addCrime(G.wanted, 2);
  if (m.id === 'rescue' && G.mission.step === 1) {
    for (const [x, y] of [[2820, 1980], [2900, 2060], [2760, 2100]]) G.thugs.push(spawnThug(x, y));
  }
  if (m.id === 'vault' && G.mission.step === 2) addCrime(G.wanted, 4);
}
let lastStepKey = '0-0';
function stepKey() { return G.mission.index + '-' + G.mission.step; }

function update(dt) {
  G.time += dt;
  const p = G.player;
  // Aim at the mouse (world space).
  const wx = G.cam.x - 640 + input.mouse.x;
  const wy = G.cam.y - 360 + input.mouse.y;
  if (!p.car) p.angle = Math.atan2(wy - p.y, wx - p.x);
  // Camera follows the player.
  G.cam.x = clamp(p.x, 640, city.w - 640);
  G.cam.y = clamp(p.y, 360, city.h - 360);
  // Traffic + pedestrians always live.
  for (const c of G.cars) if (c.kind === 'traffic') updateTrafficCar(c, dt, city, G.cars, Math.random);
  updatePeds(G.peds, dt, city, G.danger || null);
  G.danger = null;
  // Player movement.
  if (p.car) {
    const speed01 = updatePlayerCar(p.car, input, dt, city);
    p.x = p.car.x; p.y = p.car.y; p.angle = p.car.angle;
    audio.engine(speed01, true);
    // Running over pedestrians is a crime.
    for (const ped of G.peds) {
      if (ped.state !== 'down' && dist(p.x, p.y, ped.x, ped.y) < 26 && Math.abs(p.car.speed) > 120) {
        ped.state = 'down';
        addCrime(G.wanted, 1);
        burst(ped.x, ped.y, '#ff5d5d', 8);
        audio.thud();
      }
    }
    // Ram police cars.
    for (let i = G.police.length - 1; i >= 0; i--) {
      const c = G.police[i];
      if (dist(p.x, p.y, c.x, c.y) < 40 && Math.abs(p.car.speed) > 200) {
        c.hp -= 40;
        p.car.speed *= 0.5;
        burst(c.x, c.y, '#ffe14d', 10);
        audio.thud();
        if (c.hp <= 0) { G.police.splice(i, 1); addCrime(G.wanted, 2); dropPickup(G.pickups, c.x, c.y, 'cash', 100); }
      }
    }
  } else {
    const run = input.down('ShiftLeft') || input.down('ShiftRight');
    const sp = (run ? 280 : 185);
    let mx = (input.down('KeyD') || input.down('ArrowRight') ? 1 : 0) - (input.down('KeyA') || input.down('ArrowLeft') ? 1 : 0);
    let my = (input.down('KeyS') || input.down('ArrowDown') ? 1 : 0) - (input.down('KeyW') || input.down('ArrowUp') ? 1 : 0);
    if (mx || my) {
      const len = Math.hypot(mx, my);
      p.x += (mx / len) * sp * dt;
      p.y += (my / len) * sp * dt;
      for (const b of city.buildings) resolveCircleRect(p, 12, b);
      p.x = clamp(p.x, 20, city.w - 20);
      p.y = clamp(p.y, 20, city.h - 20);
    }
    audio.engine(0, false);
    // Shooting.
    p.fireT -= dt;
    if (input.mouse.down && p.fireT <= 0) {
      p.fireT = 0.18;
      fireBullet(G.bullets, p.x + Math.cos(p.angle) * 16, p.y + Math.sin(p.angle) * 16, p.angle, 'player');
      audio.shot();
      G.danger = { x: p.x, y: p.y, radius: 320 };
    }
  }
  // Enter / exit car.
  if (input.wasPressed('KeyE')) {
    if (p.car) {
      const car = p.car;
      car.kind = 'parked';
      car.speed = 0;
      p.car = null;
      p.x = car.x + 34; p.y = car.y;
      audio.click();
    } else {
      const car = nearestCar(G.cars.filter((c) => c.kind !== 'police'), p.x, p.y, 75);
      if (car) {
        car.kind = 'player';
        p.car = car;
        addCrime(G.wanted, 1);
        audio.click();
      }
    }
  }
  // Police + wanted.
  updateWanted(G.wanted, dt, p, G.police, city, Math.random, (c, a) => {
    fireBullet(G.bullets, c.x, c.y, a, 'police', 560);
    audio.shot();
  });
  audio.siren(G.wanted.level > 0);
  // Police bumping the player on foot.
  if (!p.car) {
    for (const c of G.police) {
      if (dist(p.x, p.y, c.x, c.y) < 30) {
        p.hp -= 30 * dt;
        p.x += Math.sign(p.x - c.x) * 60 * dt;
        p.y += Math.sign(p.y - c.y) * 60 * dt;
      }
    }
  }
  // Combat.
  const events = updateBullets(G.bullets, dt, city, G);
  for (const ev of events) {
    if (ev.type === 'spark') burst(ev.x, ev.y, '#ffe14d', 5);
    if (ev.type === 'pedDown') { addCrime(G.wanted, 1); if (Math.random() < 0.5) dropPickup(G.pickups, ev.x, ev.y, 'cash', 50); }
    if (ev.type === 'thugDown') { G.mission.kills++; dropPickup(G.pickups, ev.x, ev.y, 'cash', 80); burst(ev.x, ev.y, '#ff5d5d', 10); }
    if (ev.type === 'copDown') {
      const i = G.police.findIndex((c) => dist(c.x, c.y, ev.x, ev.y) < 30);
      if (i >= 0) G.police.splice(i, 1);
      addCrime(G.wanted, 2);
      dropPickup(G.pickups, ev.x, ev.y, 'cash', 100);
    }
  }
  updateThugs(G.thugs, dt, p, (x, y, a, from) => { fireBullet(G.bullets, x, y, a, from, 560); audio.shot(); });
  updatePickups(G.pickups, dt, p, G);
  // Particles.
  for (let i = G.particles.length - 1; i >= 0; i--) {
    const pt = G.particles[i];
    pt.life -= dt;
    pt.x += pt.vx * dt; pt.y += pt.vy * dt;
    if (pt.life <= 0) G.particles.splice(i, 1);
  }
  // Missions.
  const before = G.mission.index;
  const res = updateMission(G.mission, dt, G);
  if (stepKey() !== lastStepKey) { lastStepKey = stepKey(); onStepEnter(); }
  if (res === 'mission' || res === 'all') {
    audio.jingle();
    writeSave();
    if (res === 'all') G.mode = 'complete';
  } else if (res === 'fail') {
    G.mission.step = 0; G.mission.timer = 0; G.mission.kills = 0;
    audio.busted();
  }
  // Busted?
  if (p.hp <= 0 && G.mode === 'playing') {
    G.mode = 'busted';
    G.cash = Math.floor(G.cash * 0.8);
    audio.busted();
    audio.siren(false);
  }
  // Periodic autosave.
  if (Math.floor(G.time) % 15 === 0 && Math.floor(G.time - dt) % 15 !== 0) writeSave();
}

function frame(t) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (t - (frame.last || t)) / 1000 || 0.016);
  frame.last = t;
  if (input.wasPressed('KeyM')) { G.muted = audio.toggleMute(); }
  if (G.mode === 'title') {
    if (input.wasPressed('Enter')) startGame(false);
    if (input.wasPressed('KeyN')) startGame(true);
    drawWorld(ctx, G);
    drawMenu(ctx, G);
  } else if (G.mode === 'paused') {
    if (input.wasPressed('KeyP') || input.wasPressed('Enter')) G.mode = 'playing';
    if (input.wasPressed('KeyQ')) { G.mode = 'title'; writeSave(); }
    drawWorld(ctx, G);
    drawHUD(ctx, G);
    drawMenu(ctx, G);
  } else if (G.mode === 'busted' || G.mode === 'complete') {
    if (input.wasPressed('Enter')) {
      if (G.mode === 'busted') {
        G.player.hp = 100;
        G.player.x = city.spots.hospital.x; G.player.y = city.spots.hospital.y;
        G.player.car = null;
        G.wanted = createWanted();
        G.police = [];
        G.mode = 'playing';
      } else {
        G.mission = createMissionState();
        G.mode = 'playing';
      }
    }
    drawWorld(ctx, G);
    drawHUD(ctx, G);
    drawMenu(ctx, G);
  } else {
    if (input.wasPressed('KeyP') || input.wasPressed('Escape')) G.mode = 'paused';
    update(dt);
  }
  if (G.mode === 'playing') { drawWorld(ctx, G); drawHUD(ctx, G); }
  input.endFrame();
}

loadSave();
if (G.shot) applyShot(G, Number(G.shot));
requestAnimationFrame(frame);

// Debug hook for headless play-testing (not part of the game UI).
window.__pv = {
  G,
  start: (fresh) => startGame(fresh),
  state: () => ({ mode: G.mode, cash: G.cash, hp: G.player.hp, wanted: G.wanted.level, mission: G.mission.index, step: G.mission.step, x: Math.round(G.player.x), y: Math.round(G.player.y), inCar: !!G.player.car, police: G.police.length, peds: G.peds.length, cars: G.cars.length }),
};
