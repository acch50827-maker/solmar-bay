// Keyboard + mouse input for Porto Verde.
export function createInput(canvas) {
  const keys = new Set();
  const mouse = { x: 0, y: 0, down: false, clicked: false };
  const pressed = new Set(); // edge-triggered keys, consumed by the game
  window.addEventListener('keydown', (e) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) e.preventDefault();
    if (!keys.has(e.code)) pressed.add(e.code);
    keys.add(e.code);
  });
  window.addEventListener('keyup', (e) => keys.delete(e.code));
  window.addEventListener('blur', () => { keys.clear(); mouse.down = false; });
  canvas.addEventListener('mousemove', (e) => {
    const r = canvas.getBoundingClientRect();
    mouse.x = (e.clientX - r.left) * (canvas.width / r.width);
    mouse.y = (e.clientY - r.top) * (canvas.height / r.height);
  });
  canvas.addEventListener('mousedown', (e) => { mouse.down = true; mouse.clicked = true; });
  window.addEventListener('mouseup', () => { mouse.down = false; });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  return {
    keys, mouse, pressed,
    down(code) { return keys.has(code); },
    wasPressed(code) {
      if (pressed.has(code)) { pressed.delete(code); return true; }
      return false;
    },
    endFrame() { pressed.clear(); mouse.clicked = false; },
  };
}
