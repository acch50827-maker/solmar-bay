// Porto Verde — orkestrasi utama: loop game, kamera, pemain, layar, dan save.
// Game open-world crime 2D top-down orisinal: Dante Cruz & Lena Ortiz vs Salazar.
import { WORLD_W, WORLD_H, clamp, dist, rand } from './util.js';
import { buildCity, moveWithCollision, HOSPITAL } from './city.js';
import { createInput } from './input.js';
import { ensureAudio, sfx } from './audio.js';
import { spawnPeds, updatePeds, checkPedHit } from './people.js';
import { spawnTraffic, updateTraffic, updatePlayerCar, nearestStealable, makeCar } from './vehicles.js';
import { addWanted, updatePolice, checkBusted, doBusted } from './police.js';
import { firePlayerShot, updateBullets, updatePickups, spawnPickups } from './combat.js';
import { startMission, updateMission } from './missions.js';
import { drawWorld, drawHUD, drawMinimap } from './render.js';
import { applyShot } from './shots.js';

const SAVE_KEY = 'porto-verde-save-v1';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const input = createInput(canvas);

function fitCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
fitCanvas();
window.addEventListener('resize', fitCanvas);

buildCity();

const state = {
  mode: 'title',
  time: 0,
  cash: 150,
  wanted: 0,
  wantedTimer: 0,
  kills: 0,
  fireCd: 0,
  muzzle: 0,
  shake: 0,
  toast: '',
  toastT: 0,
  shotsFiredAt: 0,
  lastBustedLoss: 0,
  view: { w: canvas.width, h: canvas.height },
  camera: { x: 0, y: 0 },
  player: {
    x: 1000, y: 600, angle: 0, speed: 0, hp: 100,
    onFoot: true, car: null,
  },
  cars: [],
  peds: [],
  police: [],
  thugs: [],
  bullets: [],
  pickups: [],
  missionIdx: 0,
  mission: null,
  muted: false,
};

state.saveGame = function () {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({
      cash: state.cash,
      missionIdx: state.missionIdx,
      hp: state.player.hp,
    }));
  } catch (e) {}
};

function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return;
    const s = JSON.parse(raw);
    if (typeof s.cash === 'number') state.cash = s.cash;
    if (typeof s.missionIdx === 'number') state.missionIdx = Math.min(s.missionIdx, 4);
    if (typeof s.hp === 'number') state.player.hp = s.hp;
  } catch (e) {}
}
loadSave();

// Dunia awal: pejalan kaki, lalu lintas, pickup, dan mobil parkir.
spawnPeds(state, 26);
spawnTraffic(state, 14);
spawnPickups(state);
for (let i = 0; i < 6; i++) {
  const car = makeCar(rand(200, 3000), rand(200, 2000), rand(0, Math.PI * 2));
  if (dist(car.x, car.y, state.player.x, state.player.y) > 300) state.cars.push(car);
}
startMission(state, state.missionIdx);
state.mode = 'title';

// Adegan screenshot ?shot=1..4.
const shot = new URLSearchParams(location.search).get('shot');
if (shot) applyShot(state, parseInt(shot, 10) || 1);

function worldMouse() {
  return {
    x: input.mouse.x + state.camera.x,
    y: input.mouse.y + state.camera.y,
  };
}

function update(dt) {
  state.time += dt;
  state.view.w = canvas.width;
  state.view.h = canvas.height;
  if (state.toastT > 0) state.toastT -= dt;
  if (state.fireCd > 0) state.fireCd -= dt;
  if (state.muzzle > 0) state.muzzle -= dt;
  if (state.shotsFiredAt > 0) state.shotsFiredAt -= dt;
  if (state.shake > 0) state.shake -= dt;

  if (input.wasPressed('p') || input.wasPressed('escape')) {
    if (state.mode === 'play') state.mode = 'pause';
    else if (state.mode === 'pause') state.mode = 'play';
  }
  if (input.wasPressed('m')) {
    state.muted = !state.muted;
    state.toast = state.muted ? 'Suara mati' : 'Suara hidup';
    state.toastT = 1.5;
  }

  if (state.mode === 'title') {
    if (input.wasPressed('enter') || input.mouse.clicked) {
      ensureAudio();
      state.mode = 'play';
      sfx.click();
    }
    updatePeds(state, dt);
    updateTraffic(state, dt);
    input.endFrame();
    return;
  }
  if (state.mode === 'pause') {
    if (input.wasPressed('enter') || input.mouse.clicked) state.mode = 'play';
    input.endFrame();
    return;
  }
  if (state.mode === 'busted' || state.mode === 'complete') {
    if (input.wasPressed('enter') || input.mouse.clicked) {
      if (state.mode === 'busted') {
        state.mode = 'play';
        state.player.hp = 100;
      } else {
        state.mode = 'title';
        state.cash = 150;
        state.missionIdx = 0;
        startMission(state, 0);
      }
    }
    input.endFrame();
    return;
  }

  // Mode play.
  const p = state.player;
  const k = input.keys;
  const wm = worldMouse();

  if (input.wasPressed('e')) {
    if (p.car) {
      // Keluar mobil.
      const car = p.car;
      car.speed = 0;
      p.car = null;
      p.onFoot = true;
      p.x = car.x + Math.cos(car.angle + Math.PI / 2) * 34;
      p.y = car.y + Math.sin(car.angle + Math.PI / 2) * 34;
      p.speed = 0;
      sfx.click();
    } else {
      const car = nearestStealable(state);
      if (car) {
        p.car = car;
        p.onFoot = false;
        p.angle = car.angle;
        addWanted(state, 1);
        state.toast = 'Mobil dicuri! Wanted naik.';
        state.toastT = 2;
        sfx.crash();
      }
    }
  }

  if (p.car) {
    updatePlayerCar(state, dt, input);
    if (checkPedHit(state, p.car)) {
      addWanted(state, 1);
      state.toast = 'Kamu menabrak pejalan kaki!';
      state.toastT = 2;
    }
  } else {
    // Jalan kaki.
    const mx = (k['d'] || k['arrowright'] ? 1 : 0) - (k['a'] || k['arrowleft'] ? 1 : 0);
    const my = (k['s'] || k['arrowdown'] ? 1 : 0) - (k['w'] || k['arrowup'] ? 1 : 0);
    const len = Math.hypot(mx, my) || 1;
    const spd = 175;
    moveWithCollision(p, (mx / len) * spd * dt * (mx || my ? 1 : 0), (my / len) * spd * dt * (mx || my ? 1 : 0), 12);
    p.speed = (mx || my) ? spd : 0;
    if (mx || my) p.angle = Math.atan2(my, mx);
    // Arahkan badan ke mouse saat menembak.
    if (input.mouse.down || input.mouse.clicked) p.angle = Math.atan2(wm.y - p.y, wm.x - p.x);
  }

  if (input.mouse.down || input.mouse.clicked) {
    firePlayerShot(state, wm.x, wm.y);
  }

  updatePeds(state, dt);
  updateTraffic(state, dt);
  updatePolice(state, dt);
  updateBullets(state, dt);
  updatePickups(state, dt);
  updateMission(state, dt);

  // Mobil pemain rusak parah: meledak, Dante keluar.
  if (p.car && p.car.hp <= 0) {
    sfx.crash();
    state.shake = 0.5;
    p.car.speed = 0;
    p.x = p.car.x;
    p.y = p.car.y;
    p.car = null;
    p.onFoot = true;
    p.hp = Math.max(10, p.hp - 15);
    state.toast = 'Mobilmu hancur!';
    state.toastT = 2.5;
  }

  if (p.hp <= 0 || checkBusted(state)) {
    doBusted(state);
    state.mode = 'busted';
  }

  // Kamera mengikuti pemain, dengan guncangan.
  const shx = state.shake > 0 ? rand(-6, 6) * state.shake : 0;
  const shy = state.shake > 0 ? rand(-6, 6) * state.shake : 0;
  state.camera.x = clamp(p.x - canvas.width / 2 + shx, 0, WORLD_W - canvas.width);
  state.camera.y = clamp(p.y - canvas.height / 2 + shy, 0, WORLD_H - canvas.height);

  // Autosave berkala.
  if (Math.floor(state.time * 10) % 100 === 0) state.saveGame();
  input.endFrame();
}

function drawOverlay(title, lines, hint) {
  ctx.fillStyle = 'rgba(8, 12, 20, 0.78)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffe14d';
  ctx.font = 'bold 54px sans-serif';
  ctx.fillText(title, canvas.width / 2, canvas.height / 2 - 90);
  ctx.fillStyle = '#fff';
  ctx.font = '20px sans-serif';
  lines.forEach((ln, i) => ctx.fillText(ln, canvas.width / 2, canvas.height / 2 - 40 + i * 32));
  ctx.fillStyle = '#9ecfff';
  ctx.font = 'bold 18px sans-serif';
  ctx.fillText(hint, canvas.width / 2, canvas.height / 2 + 60);
  ctx.textAlign = 'left';
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawWorld(ctx, state);
  if (state.mode === 'play' || state.mode === 'pause') {
    drawHUD(ctx, state);
    drawMinimap(ctx, state);
  }
  if (state.mode === 'title') {
    drawOverlay('PORTO VERDE', [
      'Dante Cruz kembali ke Porto Verde. Salazar menguasai kota ini.',
      'Bantu Lena Ortiz merebut kembali pelabuhan — 5 misi, 5 bintang wanted.',
      'WASD gerak • E curi mobil • Klik kiri tembak • P jeda',
    ], 'Tekan ENTER atau klik untuk mulai');
  } else if (state.mode === 'pause') {
    drawOverlay('JEDA', ['Istirahat dulu, Dante.', 'Uang: $' + state.cash + ' • Misi ' + (state.missionIdx + 1) + '/5'], 'Tekan P atau klik untuk lanjut');
  } else if (state.mode === 'busted') {
    drawOverlay('TERTANGKAP!', [
      'Bay Police menangkapmu. Kamu kehilangan $' + state.lastBustedLoss + ' (20%).',
      'Kamu bangun di rumah sakit Porto Verde.',
    ], 'Tekan ENTER untuk lanjut');
  } else if (state.mode === 'complete') {
    drawOverlay('PORTO VERDE BEBAS!', [
      'Semua misi selesai. Salazar kalah, pelabuhan kembali milik rakyat.',
      'Total hadiah misi: $3.300 • Uangmu sekarang: $' + state.cash,
    ], 'Tekan ENTER untuk main lagi');
  }
}

// Hook debug untuk play-test headless saya sendiri.
window.__pv = {
  state,
  snapshot() {
    return {
      mode: state.mode,
      x: Math.round(state.player.x),
      y: Math.round(state.player.y),
      inCar: !!state.player.car,
      wanted: state.wanted,
      cash: state.cash,
      hp: Math.round(state.player.hp),
      missionIdx: state.missionIdx,
      missionStage: state.mission ? state.mission.stage : -1,
      cars: state.cars.length,
      peds: state.peds.length,
      police: state.police.length,
      thugs: state.thugs.length,
      bullets: state.bullets.length,
    };
  },
};

let last = performance.now();
function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  try {
    update(dt);
    draw();
  } catch (err) {
    console.error(err);
  }
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
