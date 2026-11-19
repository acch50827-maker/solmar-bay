// Input keyboard + mouse untuk Porto Verde.
export function createInput(canvas) {
  const keys = {};
  const mouse = { x: 0, y: 0, down: false, clicked: false };
  const pressed = {};

  window.addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) e.preventDefault();
    if (!keys[k]) pressed[k] = true;
    keys[k] = true;
  });
  window.addEventListener('keyup', (e) => {
    keys[e.key.toLowerCase()] = false;
  });
  canvas.addEventListener('mousemove', (e) => {
    const r = canvas.getBoundingClientRect();
    mouse.x = e.clientX - r.left;
    mouse.y = e.clientY - r.top;
  });
  canvas.addEventListener('mousedown', (e) => {
    if (e.button === 0) { mouse.down = true; mouse.clicked = true; }
  });
  window.addEventListener('mouseup', () => { mouse.down = false; });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  return {
    keys,
    mouse,
    // true sekali di frame setelah tombol ditekan.
    wasPressed(k) { return !!pressed[k.toLowerCase()]; },
    endFrame() {
      for (const k in pressed) pressed[k] = false;
      mouse.clicked = false;
    },
  };
}
