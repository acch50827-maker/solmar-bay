// Boot and the one loop: input is read every frame, the world advances in
// fixed 1/60 s steps, and the renderer paints what is there. Screens: title,
// play, paused, game over, story complete.
//
// ?seed=N fixes the city. ?shot=start|drive|chase|mission (with &seed=N)
// stages that scene instead of running the loop, paints it twice and sets
// window.__shotReady for a screenshot. Progress auto-saves after every
// mission and on pause; L on the title screen continues a saved game.
import { BEST_KEY, SAVE_KEY, STEP } from './config.js';
import { createRandom } from './random.js';
import {
  createWorld, EVENT_CRIME, EVENT_HIT, EVENT_MISSION, EVENT_OVER, EVENT_PICKUP,
} from './world.js';
import {
  ACTION_CONFIRM, ACTION_INTERACT, ACTION_LOAD, ACTION_MUTE,
  ACTION_PAUSE, ACTION_PUNCH, createInput,
} from './input.js';
import { createAudio } from './audio.js';
import {
  createRenderer, SCREEN_COMPLETE, SCREEN_OVER, SCREEN_PAUSED,
  SCREEN_PLAY, SCREEN_TITLE,
} from './render.js';
import { stageShot } from './shots.js';

const MAX_FRAME = 0.25;
const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : 20261119;

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);
const audio = createAudio();

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}
function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch { /* storage off */ }
}

function saveGame() {
  try {
    const s = world.state;
    const p = s.player;
    window.localStorage.setItem(SAVE_KEY, JSON.stringify({
      cash: s.cash,
      missionIndex: s.mission.index,
      storyComplete: s.mission.storyComplete,
      health: p.health,
      x: p.x,
      y: p.y,
      wanted: s.wanted,
    }));
  } catch { /* storage off */ }
}

function loadGame() {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return false;
    const data = JSON.parse(raw);
    const s = world.state;
    const p = s.player;
    s.cash = data.cash || 0;
    s.mission.index = Math.min(5, data.missionIndex || 0);
    s.mission.storyComplete = !!data.storyComplete;
    s.mission.done = !!data.storyComplete;
    s.mission.started = false;
    s.mission.step = 0;
    p.health = data.health || 100;
    p.x = data.x || 1200;
    p.y = data.y || 1600;
    s.wanted = data.wanted || 0;
    s.camera.x = p.x;
    s.camera.y = p.y;
    return true;
  } catch {
    return false;
  }
}

function hasSave() {
  try {
    return !!window.localStorage.getItem(SAVE_KEY);
  } catch {
    return false;
  }
}

function runShot(name) {
  const scene = stageShot(name, world);
  let painted = 0;
  function paint() {
    renderer.draw(world.state, scene.screen, scene.best);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();
  let lastMissionIndex = 0;

  function announce(message) { status.textContent = message; }

  function startGame(fresh) {
    if (fresh) world.reset();
    accumulator = 0;
    screen = SCREEN_PLAY;
    lastMissionIndex = world.state.mission.index;
    announce('Playing Solmar Bay. Follow the gold marker.');
  }

  function endGame() {
    screen = SCREEN_OVER;
    if (world.state.cash > best) { best = world.state.cash; saveBest(best); }
    announce(`Busted. Cash $${world.state.cash}. Best $${best}.`);
  }

  function completeStory() {
    screen = SCREEN_COMPLETE;
    if (world.state.cash > best) { best = world.state.cash; saveBest(best); }
    saveGame();
    announce('Story complete!');
  }

  function handleActions(actions) {
    if (actions & ACTION_MUTE) audio.toggleMute();
    if (screen === SCREEN_TITLE) {
      if ((actions & ACTION_LOAD) && hasSave()) {
        world.reset();
        loadGame();
        startGame(false);
      } else if (actions & ACTION_CONFIRM) {
        audio.unlock();
        startGame(true);
      }
      return;
    }
    if ((actions & ACTION_PAUSE) && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      saveGame();
      announce('Paused.');
    } else if ((actions & ACTION_PAUSE) && screen === SCREEN_PAUSED) {
      screen = SCREEN_PLAY;
      announce('Playing.');
    } else if ((actions & ACTION_CONFIRM) && screen === SCREEN_PAUSED) {
      screen = SCREEN_PLAY;
      announce('Playing.');
    } else if ((actions & ACTION_CONFIRM) && (screen === SCREEN_OVER || screen === SCREEN_COMPLETE)) {
      startGame(true);
    }
  }

  function worldInput() {
    const p = world.state.player;
    const mv = input.moveVector();
    // Aim: from the player to the mouse, in world coordinates.
    let aim = p.aimAngle;
    if (input.mouseSeen()) {
      const m = input.mousePos();
      const scale = renderer.view.scale;
      const ratio = window.devicePixelRatio || 1;
      const viewX = (m.x * ratio - renderer.view.x) / scale;
      const viewY = (m.y * ratio - renderer.view.y) / scale;
      const cam = world.state.camera;
      const wx = cam.x - 640 + viewX;
      const wy = cam.y - 360 + viewY;
      aim = Math.atan2(wy - p.y, wx - p.x);
    }
    const inCar = !!p.car;
    return {
      mx: inCar ? 0 : mv.x,
      my: inCar ? 0 : mv.y,
      accel: inCar ? input.accel() : 0,
      steer: inCar ? input.steer() : 0,
      aimAngle: aim,
      shoot: input.mouseDown(),
      punch: false,
      interact: false,
    };
  }

  function step(actions) {
    if (screen === SCREEN_TITLE) {
      world.step(STEP, null, true);
      return;
    }
    const inp = worldInput();
    if (actions & ACTION_INTERACT) inp.interact = true;
    if (actions & ACTION_PUNCH) inp.punch = true;
    const shotFired = inp.shoot && world.state.player.shootCooldown <= 0;
    const punched = inp.punch && world.state.player.punchTimer <= 0 && !world.state.player.car;
    const events = world.step(STEP, inp, false);
    if (shotFired) audio.shoot();
    if (punched) audio.punch();
    if (events & EVENT_PICKUP) audio.pickup();
    if (events & EVENT_HIT) audio.hurt();
    if (events & EVENT_CRIME) audio.crime();
    if (events & EVENT_MISSION) {
      audio.mission();
      saveGame();
      if (world.state.mission.storyComplete) completeStory();
    }
    if (world.state.mission.index !== lastMissionIndex) {
      lastMissionIndex = world.state.mission.index;
      saveGame();
    }
    audio.engine(world.state.player.car ? world.state.player.car.speed : 0, !!world.state.player.car);
    audio.siren(world.state.wanted > 0);
    if (events & EVENT_OVER) endGame();
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    const actions = input.takeActions();
    handleActions(actions);
    if (screen === SCREEN_TITLE || screen === SCREEN_PLAY) {
      let first = true;
      while (accumulator >= STEP && (screen === SCREEN_TITLE || screen === SCREEN_PLAY)) {
        step(first ? actions : 0);
        first = false;
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }
    renderer.draw(world.state, screen, best);
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      saveGame();
      announce('Paused.');
    }
  });
  announce('Solmar Bay. Press Space or click to start.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
