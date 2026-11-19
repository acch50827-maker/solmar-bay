// Keyboard and pointer input. Held keys give movement and driving; one-shot
// presses (start, pause, enter/exit a car, punch, mute, continue) are queued
// as bit flags and taken once by the loop, so a press that lands between two
// frames is never lost. The mouse aims: the loop turns the pointer's screen
// position into a world angle, and holding the mouse button shoots.
export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_INTERACT = 4;
export const ACTION_PUNCH = 8;
export const ACTION_SAVE = 16;
export const ACTION_MUTE = 32;
export const ACTION_LOAD = 64;

const UP = ['ArrowUp', 'KeyW'];
const DOWN = ['ArrowDown', 'KeyS'];
const LEFT = ['ArrowLeft', 'KeyA'];
const RIGHT = ['ArrowRight', 'KeyD'];
const CONFIRM = new Set(['Space', 'Enter']);
const PAUSE = new Set(['KeyP', 'Escape']);

function any(keys, list) {
  return list.some((code) => keys.has(code));
}

export function createInput(canvas) {
  const keys = new Set();
  let actions = 0;
  let mouseX = 0;
  let mouseY = 0;
  let mouseDown = false;
  let mouseSeen = false;

  window.addEventListener('keydown', (event) => {
    keys.add(event.code);
    if (CONFIRM.has(event.code)) { if (!event.repeat) actions |= ACTION_CONFIRM; }
    else if (PAUSE.has(event.code)) { if (!event.repeat) actions |= ACTION_PAUSE; }
    else if (event.code === 'KeyE') { if (!event.repeat) actions |= ACTION_INTERACT; }
    else if (event.code === 'KeyF') { if (!event.repeat) actions |= ACTION_PUNCH; }
    else if (event.code === 'KeyM') { if (!event.repeat) actions |= ACTION_MUTE; }
    else if (event.code === 'KeyL') { if (!event.repeat) actions |= ACTION_LOAD; }
    else return;
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) {
      event.preventDefault();
    }
  });
  window.addEventListener('keyup', (event) => { keys.delete(event.code); });
  window.addEventListener('blur', () => { keys.clear(); mouseDown = false; });
  canvas.addEventListener('pointermove', (event) => {
    const r = canvas.getBoundingClientRect();
    mouseX = event.clientX - r.left;
    mouseY = event.clientY - r.top;
    mouseSeen = true;
  });
  canvas.addEventListener('pointerdown', (event) => {
    const r = canvas.getBoundingClientRect();
    mouseX = event.clientX - r.left;
    mouseY = event.clientY - r.top;
    mouseSeen = true;
    if (event.button === 0) mouseDown = true;
    actions |= ACTION_CONFIRM;
  });
  window.addEventListener('pointerup', () => { mouseDown = false; });

  return {
    moveVector() {
      return {
        x: (any(keys, RIGHT) ? 1 : 0) - (any(keys, LEFT) ? 1 : 0),
        y: (any(keys, DOWN) ? 1 : 0) - (any(keys, UP) ? 1 : 0),
      };
    },
    // W / up is the accelerator while driving; S / down brakes and reverses.
    accel() {
      return (any(keys, UP) ? 1 : 0) - (any(keys, DOWN) ? 0.7 : 0);
    },
    steer() {
      return (any(keys, RIGHT) ? 1 : 0) - (any(keys, LEFT) ? 1 : 0);
    },
    mouseDown() { return mouseDown; },
    mouseSeen() { return mouseSeen; },
    mousePos() { return { x: mouseX, y: mouseY }; },
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
  };
}
