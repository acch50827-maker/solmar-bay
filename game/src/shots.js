// The screenshot scenes behind ?shot=start|drive|chase|mission. Each one
// plays the real rules forward from a fresh seeded world, steered by a
// scripted driver (drive along a road, chase the mission target, keep the
// police close), so the frame is what real play looks like and the same seed
// always gives the same frame.
import { STEP } from './config.js';
import { SCREEN_PLAY, SCREEN_TITLE } from './render.js';

// Steer a car toward a target: throttle, but ease off to turn sharply —
// a full-speed U-turn swings wide off the road and into the buildings.
function driveInput(state, target) {
  const car = state.player.car;
  if (!car) return { mx: 0, my: 0, aimAngle: 0 };
  const dx = target.x - car.x;
  const dy = target.y - car.y;
  const want = Math.atan2(dy, dx);
  let diff = want - car.angle;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return {
    accel: Math.abs(diff) > 0.6 ? 0.35 : 1,
    steer: Math.max(-1, Math.min(1, diff * 2)),
    aimAngle: want,
    shoot: false,
  };
}

// Walk straight at a target on foot.
function walkInput(state, target) {
  const p = state.player;
  const dx = target.x - p.x;
  const dy = target.y - p.y;
  const len = Math.hypot(dx, dy) || 1;
  return {
    mx: dx / len,
    my: dy / len,
    aimAngle: Math.atan2(dy, dx),
    shoot: false,
  };
}

function putPlayerInParkedCar(state) {
  const car = state.cars.find((c) => c.kind === 'parked');
  if (!car) return;
  car.kind = 'player';
  state.player.car = car;
  state.player.x = car.x;
  state.player.y = car.y;
}

export function stageShot(name, world) {
  world.reset();
  const state = world.state;

  if (name !== 'drive' && name !== 'chase' && name !== 'mission') {
    // Title: traffic and pedestrians move behind the panel for 5 seconds.
    for (let i = 0; i < 5 / STEP; i += 1) world.step(STEP, null, true);
    return { screen: SCREEN_TITLE, best: 0 };
  }

  if (name === 'drive') {
    // Put the player in a parked car on Downtown's main road and drive east.
    putPlayerInParkedCar(state);
    const target = { x: 2400, y: 800 };
    for (let i = 0; i < 14 / STEP; i += 1) world.step(STEP, driveInput(state, target), false);
    return { screen: SCREEN_PLAY, best: state.cash };
  }

  if (name === 'chase') {
    putPlayerInParkedCar(state);
    state.wanted = 3;
    state.mission.index = 2;
    state.mission.started = true;
    state.mission.dialog = 'The Bay Police are onto you. Hit all three checkpoints!';
    state.mission.dialogTimer = 99;
    const target = { x: 1600, y: 1200 };
    for (let i = 0; i < 12 / STEP; i += 1) world.step(STEP, driveInput(state, target), false);
    return { screen: SCREEN_PLAY, best: state.cash };
  }

  // Mission: on foot in Harbour Park, walking to Milo, mission 4 active.
  state.mission.index = 3;
  state.mission.started = true;
  state.mission.dialog = 'Your friend Milo is cornered in Harbour Park. Reach him!';
  state.mission.dialogTimer = 99;
  state.player.x = 100;
  state.player.y = 200;
  const target = { x: 200, y: 200 };
  for (let i = 0; i < 6 / STEP; i += 1) world.step(STEP, walkInput(state, target), false);
  return { screen: SCREEN_PLAY, best: state.cash };
}
