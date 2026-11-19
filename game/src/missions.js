// The story of Solmar Bay: five chained missions. Each mission is a list of
// steps; a step is done by reaching its target, holding there, or stealing a
// car, and the mission pays out when its last step is done. No drawing and no
// browser in here: missions only read and write the world state, so the
// screenshot scenes can run the same steps with a scripted driver and get
// the same result.
export const MISSIONS = [
  {
    id: 'delivery',
    title: '1. First Delivery',
    reward: 150,
    intro: 'Rosa needs a parcel at the Marina Cafe. Take it there — on foot or by car.',
    steps: [
      { kind: 'goto', text: 'Deliver the parcel to the Marina Cafe', x: 2620, y: 400, r: 70 },
    ],
  },
  {
    id: 'getaway',
    title: '2. Getaway Driver',
    reward: 250,
    intro: 'Borrow a car — any car — and bring it to the Southside hideout in 90 seconds.',
    steps: [
      { kind: 'steal', text: 'Steal a car (press E near one)', x: 0, y: 0, r: 0, timer: 90 },
      { kind: 'goto', text: 'Drive to the Southside hideout', x: 500, y: 2000, r: 80, timer: 90 },
    ],
  },
  {
    id: 'pursuit',
    title: '3. Hot Pursuit',
    reward: 400,
    intro: 'The Bay Police are onto you. Hit all three checkpoints and lose them.',
    steps: [
      { kind: 'goto', text: 'Checkpoint 1 of 3 — Downtown', x: 1600, y: 1200, r: 80 },
      { kind: 'goto', text: 'Checkpoint 2 of 3 — Marina', x: 2400, y: 800, r: 80 },
      { kind: 'goto', text: 'Checkpoint 3 of 3 — Old Town', x: 800, y: 400, r: 80 },
    ],
  },
  {
    id: 'rescue',
    title: '4. Rescue at the Park',
    reward: 500,
    intro: 'Your friend Milo is cornered in Harbour Park. Reach him, then get him home.',
    steps: [
      { kind: 'goto', text: 'Reach Milo in Harbour Park', x: 200, y: 200, r: 70 },
      { kind: 'goto', text: 'Bring Milo to the Southside hideout', x: 500, y: 2000, r: 80 },
    ],
  },
  {
    id: 'heist',
    title: '5. Bay Heist — Finale',
    reward: 1000,
    intro: 'The Bay Bank job. Hold the vault for 20 seconds, then escape to the boat.',
    steps: [
      { kind: 'goto', text: 'Reach the Bay Bank, Downtown', x: 1600, y: 1200, r: 80 },
      { kind: 'hold', text: 'Hold the vault — stay inside the circle', x: 1600, y: 1200, r: 90, hold: 20 },
      { kind: 'goto', text: 'Escape to the boat on the beach!', x: 2960, y: 2000, r: 80 },
    ],
  },
];

export const EVENT_MISSION = 16;

export function createMissionState() {
  return {
    index: 0,
    step: 0,
    timer: 0,
    hold: 0,
    dialog: '',
    dialogTimer: 0,
    done: false,
    storyComplete: false,
    started: false,
  };
}

function stepOf(mission, index) {
  if (!mission) return null;
  return mission.steps[index] ?? null;
}

export function missionTitle(state) {
  const mission = MISSIONS[state.mission.index];
  return mission ? mission.title : 'Free Roam';
}

export function missionObjective(state) {
  const ms = state.mission;
  if (ms.storyComplete) return 'Story complete — free roam Solmar Bay!';
  const mission = MISSIONS[ms.index];
  if (!mission) return 'Free roam';
  const step = stepOf(mission, ms.step);
  return step ? step.text : mission.title;
}

export function missionTarget(state) {
  const mission = MISSIONS[state.mission.index];
  if (!mission) return null;
  const step = stepOf(mission, state.mission.step);
  if (!step || !step.x) return null;
  return { x: step.x, y: step.y, r: step.r };
}

function say(state, text, seconds) {
  state.mission.dialog = text;
  state.mission.dialogTimer = seconds;
}

function playerPos(state) {
  const car = state.player.car;
  return car ? { x: car.x, y: car.y } : { x: state.player.x, y: state.player.y };
}

function completeMission(state) {
  const mission = MISSIONS[state.mission.index];
  state.cash += mission.reward;
  say(state, `${mission.title} complete! +$${mission.reward}`, 4);
  state.mission.index += 1;
  state.mission.step = 0;
  state.mission.timer = 0;
  state.mission.hold = 0;
  if (state.mission.index >= MISSIONS.length) {
    state.mission.storyComplete = true;
    state.mission.done = true;
    state.cash += 1000;
    say(state, 'STORY COMPLETE! You own Solmar Bay. +$1000 bonus', 6);
  } else {
    say(state, MISSIONS[state.mission.index].intro, 5);
  }
  return EVENT_MISSION;
}

/** Advance the mission state one step. Returns an event bit (0 or EVENT_MISSION). */
export function updateMissions(state, dt) {
  const ms = state.mission;
  if (ms.dialogTimer > 0) ms.dialogTimer -= dt;
  if (ms.storyComplete || ms.done) return 0;
  const mission = MISSIONS[ms.index];
  if (!mission) return 0;

  if (!ms.started) {
    ms.started = true;
    say(state, mission.intro, 5);
    if (mission.id === 'pursuit') state.wanted = Math.max(state.wanted, 2);
    if (mission.id === 'heist') state.wanted = Math.max(state.wanted, 1);
  }

  const step = mission.steps[ms.step];
  if (!step) return completeMission(state);

  // Timed steps: run out of time and the step restarts with a fresh timer.
  if (step.timer) {
    ms.timer += dt;
    if (ms.timer > step.timer) {
      ms.timer = 0;
      if (step.kind === 'steal') ms.step = 0;
      say(state, 'Too slow! Try again — the clock has reset.', 3);
      return 0;
    }
  }

  if (step.kind === 'steal') {
    if (state.player.car) {
      ms.step += 1;
      ms.timer = 0;
      say(state, 'Car taken. Now drive!', 2.5);
    }
    return 0;
  }

  const pos = playerPos(state);
  const d = Math.hypot(pos.x - step.x, pos.y - step.y);

  if (step.kind === 'goto') {
    if (d < step.r) {
      ms.step += 1;
      ms.timer = 0;
      if (ms.step >= mission.steps.length) return completeMission(state);
      say(state, mission.steps[ms.step].text, 3);
    }
    return 0;
  }

  if (step.kind === 'hold') {
    if (d < step.r) {
      ms.hold += dt;
      if (ms.hold >= step.hold) return completeMission(state);
    } else {
      ms.hold = Math.max(0, ms.hold - dt * 2);
    }
    return 0;
  }

  return 0;
}
