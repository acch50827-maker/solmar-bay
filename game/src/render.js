// Drawing only: the world state and the current screen in, pixels out. The
// camera follows the player over the 3200 x 2400 city; a 1280 x 720 window of
// it is scaled to fit the browser window. Flat shapes and canvas text: the
// city, the cars and people, the HUD (cash, health, wanted stars, objective,
// speed), the minimap, and the title / pause / game-over / story-complete
// panels.
import {
  BEACH_X, FONT, PALETTE, ROAD_WIDTH, ROAD_X, ROAD_Y, VIEW, WANTED_MAX, WORLD,
} from './config.js';
import { missionObjective, missionTarget, missionTitle } from './missions.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';
export const SCREEN_COMPLETE = 'complete';

const PANEL = { width: 680, top: 150, line: 32, bottom: 76 };

export function createRenderer(canvas) {
  const context = canvas.getContext('2d');
  const view = { scale: 1, x: 0, y: 0 };
  const fonts = new Map();

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    const width = Math.round(window.innerWidth * ratio);
    const height = Math.round(window.innerHeight * ratio);
    canvas.width = width;
    canvas.height = height;
    view.scale = Math.min(width / VIEW.width, height / VIEW.height);
    view.x = (width - VIEW.width * view.scale) / 2;
    view.y = (height - VIEW.height * view.scale) / 2;
  }

  function text(value, x, y, size, color, align) {
    if (!fonts.has(size)) fonts.set(size, `bold ${size}px ${FONT}`);
    context.font = fonts.get(size);
    context.fillStyle = color;
    context.textAlign = align || 'left';
    context.fillText(value, x, y);
  }

  function textPlain(value, x, y, size, color, align) {
    const key = `p${size}`;
    if (!fonts.has(key)) fonts.set(key, `${size}px ${FONT}`);
    context.font = fonts.get(key);
    context.fillStyle = color;
    context.textAlign = align || 'left';
    context.fillText(value, x, y);
  }

  function drawCity(state) {
    const cam = state.camera;
    const vx0 = cam.x - VIEW.width / 2;
    const vy0 = cam.y - VIEW.height / 2;
    const vx1 = vx0 + VIEW.width;
    const vy1 = vy0 + VIEW.height;

    // Ground: grass, then beach sand and water on the east edge.
    context.fillStyle = PALETTE.grass;
    context.fillRect(0, 0, VIEW.width, VIEW.height);
    const sandX0 = BEACH_X - vx0;
    const waterX0 = 3080 - vx0;
    if (sandX0 < VIEW.width) {
      context.fillStyle = PALETTE.sand;
      context.fillRect(Math.max(0, sandX0), 0, VIEW.width - Math.max(0, sandX0), VIEW.height);
    }
    if (waterX0 < VIEW.width) {
      context.fillStyle = PALETTE.water;
      context.fillRect(Math.max(0, waterX0), 0, VIEW.width - Math.max(0, waterX0), VIEW.height);
      context.fillStyle = PALETTE.waterDeep;
      for (let y = 0; y < VIEW.height; y += 90) {
        const wx = waterX0 + 30 + ((y / 90) % 2) * 40;
        if (wx > 0 && wx < VIEW.width) context.fillRect(wx, y + 20, 70, 6);
      }
    }

    // Harbour Park: the big green block top-left.
    context.fillStyle = PALETTE.park;
    context.fillRect(62 - vx0, 62 - vy0, 276, 276);

    // Roads, sidewalks and lane dashes.
    context.fillStyle = PALETTE.road;
    for (const rx of ROAD_X) context.fillRect(rx - ROAD_WIDTH / 2 - vx0, -vy0, ROAD_WIDTH, WORLD.height);
    for (const ry of ROAD_Y) context.fillRect(-vx0, ry - ROAD_WIDTH / 2 - vy0, WORLD.width, ROAD_WIDTH);
    context.fillStyle = PALETTE.sidewalk;
    for (const rx of ROAD_X) {
      context.fillRect(rx - ROAD_WIDTH / 2 - 10 - vx0, -vy0, 10, WORLD.height);
      context.fillRect(rx + ROAD_WIDTH / 2 - vx0, -vy0, 10, WORLD.height);
    }
    for (const ry of ROAD_Y) {
      context.fillRect(-vx0, ry - ROAD_WIDTH / 2 - 10 - vy0, WORLD.width, 10);
      context.fillRect(-vx0, ry + ROAD_WIDTH / 2 - vy0, WORLD.width, 10);
    }
    context.fillStyle = PALETTE.lane;
    for (const rx of ROAD_X) {
      for (let y = 0; y < WORLD.height; y += 64) context.fillRect(rx - 3 - vx0, y - vy0, 6, 30);
    }
    for (const ry of ROAD_Y) {
      for (let x = 0; x < WORLD.width; x += 64) context.fillRect(x - vx0, ry - 3 - vy0, 30, 6);
    }

    // Trees (only those in view).
    for (const tree of state.trees) {
      if (tree.x < vx0 - 30 || tree.x > vx1 + 30 || tree.y < vy0 - 30 || tree.y > vy1 + 30) continue;
      context.fillStyle = '#6b4a2f';
      context.fillRect(tree.x - 3 - vx0, tree.y - 2 - vy0, 6, 8);
      context.fillStyle = PALETTE.tree;
      context.beginPath();
      context.arc(tree.x - vx0, tree.y - 6 - vy0, tree.r, 0, Math.PI * 2);
      context.fill();
    }

    // Buildings, with lit windows.
    for (const b of state.buildings) {
      if (b.x + b.w < vx0 || b.x > vx1 || b.y + b.h < vy0 || b.y > vy1) continue;
      context.fillStyle = b.color;
      context.fillRect(b.x - vx0, b.y - vy0, b.w, b.h);
      context.fillStyle = PALETTE.roof;
      context.fillRect(b.x + 6 - vx0, b.y + 6 - vy0, b.w - 12, b.h - 12);
      context.fillStyle = 'rgba(255,235,150,0.55)';
      const cols = Math.floor(b.w / 26);
      const rows = Math.floor(b.h / 24);
      for (let cx = 0; cx < cols; cx += 1) {
        for (let cy = 0; cy < rows; cy += 1) {
          if ((cx * 7 + cy * 3 + b.x) % 3 === 0) {
            context.fillRect(b.x + 12 + cx * 26 - vx0, b.y + 12 + cy * 24 - vy0, 10, 8);
          }
        }
      }
    }

    // Pickups: cash coins and health kits.
    for (const pk of state.pickups) {
      if (!pk.active) continue;
      if (pk.x < vx0 || pk.x > vx1 || pk.y < vy0 || pk.y > vy1) continue;
      if (pk.kind === 'cash') {
        context.fillStyle = PALETTE.gold;
        context.beginPath();
        context.arc(pk.x - vx0, pk.y - vy0, 11, 0, Math.PI * 2);
        context.fill();
        text('$', pk.x - vx0, pk.y - vy0 + 6, 16, '#7a5c00', 'center');
      } else {
        context.fillStyle = '#fff';
        context.fillRect(pk.x - 11 - vx0, pk.y - 11 - vy0, 22, 22);
        context.fillStyle = PALETTE.green;
        context.fillRect(pk.x - 3 - vx0, pk.y - 9 - vy0, 6, 18);
        context.fillRect(pk.x - 9 - vx0, pk.y - 3 - vy0, 18, 6);
      }
    }

    // Mission target marker: a pulsing gold ring with an arrow.
    const target = missionTarget(state);
    if (target) {
      const pulse = 1 + Math.sin(state.elapsed * 4) * 0.15;
      context.strokeStyle = PALETTE.gold;
      context.lineWidth = 4;
      context.beginPath();
      context.arc(target.x - vx0, target.y - vy0, target.r * pulse, 0, Math.PI * 2);
      context.stroke();
      context.fillStyle = PALETTE.gold;
      context.beginPath();
      context.moveTo(target.x - vx0, target.y - vy0 - 26);
      context.lineTo(target.x + 14 - vx0, target.y - vy0 - 4);
      context.lineTo(target.x - 14 - vx0, target.y - vy0 - 4);
      context.closePath();
      context.fill();
      text('!', target.x - vx0, target.y - vy0 - 6, 16, '#000', 'center');
    }
  }

  function drawCar(car, vx0, vy0, state) {
    context.save();
    context.translate(car.x - vx0, car.y - vy0);
    context.rotate(car.angle);
    context.fillStyle = '#111';
    context.fillRect(-26, -16, 10, 8);
    context.fillRect(-26, 8, 10, 8);
    context.fillRect(16, -16, 10, 8);
    context.fillRect(16, 8, 10, 8);
    context.fillStyle = car.color;
    context.beginPath();
    context.roundRect(-27, -14, 54, 28, 7);
    context.fill();
    context.fillStyle = 'rgba(180,220,255,0.85)';
    context.fillRect(6, -11, 12, 22);
    context.fillStyle = 'rgba(0,0,0,0.25)';
    context.fillRect(-14, -11, 10, 22);
    if (car.kind === 'police') {
      context.fillStyle = '#fff';
      context.fillRect(-4, -13, 12, 26);
      const blink = state.elapsed % 0.5 < 0.25;
      context.fillStyle = blink ? '#ff3b30' : '#2f6fd0';
      context.beginPath();
      context.arc(2, -8, 5, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = blink ? '#2f6fd0' : '#ff3b30';
      context.beginPath();
      context.arc(2, 8, 5, 0, Math.PI * 2);
      context.fill();
    }
    context.restore();
  }

  function drawEntities(state) {
    const cam = state.camera;
    const vx0 = cam.x - VIEW.width / 2;
    const vy0 = cam.y - VIEW.height / 2;

    // Pedestrians on foot.
    for (const ped of state.peds) {
      if (!ped.alive) continue;
      context.fillStyle = ped.color;
      context.beginPath();
      context.arc(ped.x - vx0, ped.y - vy0, 9, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = '#f2c9a0';
      context.beginPath();
      context.arc(
        ped.x - vx0 + Math.cos(ped.angle) * 4,
        ped.y - vy0 + Math.sin(ped.angle) * 4,
        4, 0, Math.PI * 2,
      );
      context.fill();
    }
    // Pedestrians knocked down: a cross where they lie.
    for (const ped of state.peds) {
      if (ped.alive) continue;
      context.strokeStyle = '#888';
      context.lineWidth = 3;
      context.beginPath();
      context.moveTo(ped.x - 10 - vx0, ped.y - vy0);
      context.lineTo(ped.x + 10 - vx0, ped.y - vy0);
      context.moveTo(ped.x - vx0, ped.y - 8 - vy0);
      context.lineTo(ped.x - vx0, ped.y + 8 - vy0);
      context.stroke();
    }

    for (const car of state.cars) drawCar(car, vx0, vy0, state);

    // Bullets.
    context.fillStyle = '#ffe27a';
    for (const b of state.bullets) {
      context.beginPath();
      context.arc(b.x - vx0, b.y - vy0, 4, 0, Math.PI * 2);
      context.fill();
    }

    // The player on foot: blue dot, facing, and an aim line.
    const p = state.player;
    if (!p.car) {
      if (p.invulnerable <= 0 || Math.floor(p.invulnerable * 10) % 2 === 1) {
        context.fillStyle = '#1f8fff';
        context.beginPath();
        context.arc(p.x - vx0, p.y - vy0, 14, 0, Math.PI * 2);
        context.fill();
        context.fillStyle = '#f2c9a0';
        context.beginPath();
        context.arc(
          p.x - vx0 + Math.cos(p.angle) * 6,
          p.y - vy0 + Math.sin(p.angle) * 6,
          6, 0, Math.PI * 2,
        );
        context.fill();
        context.strokeStyle = '#fff';
        context.lineWidth = 3;
        context.beginPath();
        context.moveTo(p.x - vx0, p.y - vy0);
        context.lineTo(
          p.x - vx0 + Math.cos(p.aimAngle) * 26,
          p.y - vy0 + Math.sin(p.aimAngle) * 26,
        );
        context.stroke();
      }
      if (p.punchTimer > 0) {
        context.strokeStyle = 'rgba(255,255,255,0.8)';
        context.lineWidth = 5;
        context.beginPath();
        context.arc(p.x - vx0, p.y - vy0, 34, p.punchAngle - 0.9, p.punchAngle + 0.9);
        context.stroke();
      }
    }

    // Off-screen mission arrow: point at the target from the screen edge.
    const target = missionTarget(state);
    if (target) {
      const sx = target.x - vx0;
      const sy = target.y - vy0;
      if (sx < 30 || sx > VIEW.width - 30 || sy < 30 || sy > VIEW.height - 30) {
        const cx = Math.max(40, Math.min(VIEW.width - 40, sx));
        const cy = Math.max(40, Math.min(VIEW.height - 40, sy));
        const a = Math.atan2(sy - 360, sx - 640);
        context.save();
        context.translate(cx, cy);
        context.rotate(a);
        context.fillStyle = PALETTE.gold;
        context.beginPath();
        context.moveTo(18, 0);
        context.lineTo(-10, -12);
        context.lineTo(-10, 12);
        context.closePath();
        context.fill();
        context.restore();
      }
    }
  }

  function drawMinimap(state) {
    const mw = 200;
    const mh = 150;
    const mx = VIEW.width - mw - 16;
    const my = 96;
    const sx = mw / WORLD.width;
    const sy = mh / WORLD.height;
    context.fillStyle = 'rgba(10,14,22,0.85)';
    context.fillRect(mx - 4, my - 4, mw + 8, mh + 8);
    context.fillStyle = '#2e6b2f';
    context.fillRect(mx, my, mw, mh);
    context.fillStyle = '#1d6f9e';
    context.fillRect(mx + BEACH_X * sx, my, mw - BEACH_X * sx, mh);
    context.fillStyle = '#555';
    for (const rx of ROAD_X) context.fillRect(mx + rx * sx - 2, my, 4, mh);
    for (const ry of ROAD_Y) context.fillRect(mx, my + ry * sy - 2, mw, 4);
    const target = missionTarget(state);
    if (target) {
      context.fillStyle = PALETTE.gold;
      context.beginPath();
      context.arc(mx + target.x * sx, my + target.y * sy, 6, 0, Math.PI * 2);
      context.fill();
    }
    for (const car of state.cars) {
      if (car.kind === 'police') {
        context.fillStyle = '#ff3b30';
        context.fillRect(mx + car.x * sx - 2, my + car.y * sy - 2, 5, 5);
      }
    }
    const p = state.player;
    context.fillStyle = '#fff';
    context.beginPath();
    context.arc(mx + p.x * sx, my + p.y * sy, 5, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = '#fff';
    context.lineWidth = 1;
    context.strokeRect(mx - 4, my - 4, mw + 8, mh + 8);
    textPlain('SOLMAR BAY', mx, my + mh + 10, 12, PALETTE.muted, 'left');
  }

  function drawHud(state, best) {
    const p = state.player;
    context.fillStyle = 'rgba(10,14,22,0.72)';
    context.fillRect(0, 0, VIEW.width, 62);
    context.textBaseline = 'top';
    text(`$${state.cash}`, 20, 16, 28, PALETTE.gold, 'left');
    textPlain(missionTitle(state), 220, 18, 20, PALETTE.text, 'left');
    textPlain(missionObjective(state), 220, 42, 15, PALETTE.muted, 'left');

    // Wanted stars, top right.
    const sx = VIEW.width - 330;
    text('WANTED', sx, 16, 18, PALETTE.muted, 'left');
    for (let i = 0; i < WANTED_MAX; i += 1) {
      context.fillStyle = i < state.wanted ? '#ffd23e' : 'rgba(255,255,255,0.18)';
      const x = sx + 78 + i * 26;
      const y = 30;
      context.beginPath();
      for (let k = 0; k < 5; k += 1) {
        const a = -Math.PI / 2 + (k * Math.PI * 2) / 5;
        const a2 = a + Math.PI / 5;
        context.lineTo(x + Math.cos(a) * 10, y + Math.sin(a) * 10);
        context.lineTo(x + Math.cos(a2) * 4.5, y + Math.sin(a2) * 4.5);
      }
      context.closePath();
      context.fill();
    }

    // Health bar, bottom left.
    context.fillStyle = 'rgba(255,255,255,0.2)';
    context.fillRect(20, 690, 220, 14);
    context.fillStyle = p.health > 40 ? PALETTE.green : PALETTE.red;
    context.fillRect(20, 690, 220 * Math.max(0, p.health) / 100, 14);
    textPlain(`HP ${Math.max(0, Math.ceil(p.health))}`, 250, 688, 15, PALETTE.text, 'left');

    // Speed and hints, bottom right.
    if (p.car) {
      const mph = Math.round(Math.abs(p.car.speed) * 0.12);
      text(`${mph} mph`, VIEW.width - 260, 688, 20, PALETTE.text, 'right');
      textPlain('IN CAR — E to exit', VIEW.width - 260, 660, 14, PALETTE.muted, 'right');
    } else {
      textPlain(
        'E near a car to steal it  •  Click to shoot  •  F to punch',
        VIEW.width - 20, 688, 14, PALETTE.muted, 'right',
      );
    }

    // Dialogue banner under the top bar.
    if (state.mission.dialogTimer > 0 && state.mission.dialog) {
      context.fillStyle = 'rgba(10,14,22,0.8)';
      context.fillRect(240, 78, 800, 44);
      context.strokeStyle = PALETTE.gold;
      context.lineWidth = 2;
      context.strokeRect(240, 78, 800, 44);
      textPlain(state.mission.dialog, 640, 90, 18, PALETTE.text, 'center');
    }

    // Vault hold progress (the heist finale).
    const m = state.mission;
    if (m.hold > 0) {
      context.fillStyle = 'rgba(255,255,255,0.2)';
      context.fillRect(440, 140, 400, 16);
      context.fillStyle = PALETTE.gold;
      context.fillRect(440, 140, 400 * Math.min(1, m.hold / 20), 16);
      textPlain('HOLDING THE VAULT…', 640, 164, 15, PALETTE.gold, 'center');
    }

    // Timed step countdown (the getaway).
    const mission = state.mission;
    const step = mission.timer > 0 ? 90 - mission.timer : 0;
    if (step > 0 && mission.index === 1) {
      textPlain(`TIME ${Math.ceil(step)}s`, 640, 120, 20, PALETTE.red, 'center');
    }

    drawMinimap(state);
  }

  function drawPanel(title, lines, prompt) {
    const height = PANEL.top + lines.length * PANEL.line + PANEL.bottom;
    const x = (VIEW.width - PANEL.width) / 2;
    const y = (VIEW.height - height) / 2;
    context.fillStyle = PALETTE.panel;
    context.fillRect(x, y, PANEL.width, height);
    context.strokeStyle = PALETTE.panelEdge;
    context.lineWidth = 2;
    context.strokeRect(x, y, PANEL.width, height);
    context.textBaseline = 'alphabetic';
    text(title, VIEW.width / 2, y + 78, 44, PALETTE.text, 'center');
    for (let i = 0; i < lines.length; i += 1) {
      textPlain(lines[i], VIEW.width / 2, y + PANEL.top + i * PANEL.line, 19, PALETTE.muted, 'center');
    }
    text(prompt, VIEW.width / 2, y + height - 36, 22, PALETTE.gold, 'center');
  }

  const TITLE_LINES = [
    'An original open-world crime game in sunny Solmar Bay.',
    'Explore the city on foot or by car. Steal cars, dodge the Bay Police,',
    'run five missions for Rosa and Milo — and pull off the Bay Bank heist.',
    '',
    'WASD / arrows — walk or drive   •   E — enter / exit a car',
    'Mouse — aim   •   Click — shoot   •   F — punch   •   P — pause',
    'M — mute   •   L — continue a saved game   •   Progress auto-saves',
    '',
  ];
  const PAUSED_LINES = ['The city waits for you.', 'Progress auto-saves after every mission.'];

  function draw(state, screen, best) {
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.fillStyle = PALETTE.backdrop;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.setTransform(view.scale, 0, 0, view.scale, view.x, view.y);
    drawCity(state);
    drawEntities(state);
    if (screen === SCREEN_TITLE) {
      const lines = [...TITLE_LINES, `Best cash: $${best}`];
      drawPanel('SOLMAR BAY', lines, 'Press Space or click to start');
      return;
    }
    drawHud(state, best);
    if (screen === SCREEN_PAUSED) {
      drawPanel('Paused', PAUSED_LINES, 'Press P to resume');
    } else if (screen === SCREEN_OVER) {
      drawPanel('Busted', [
        `You ran out of health with $${state.cash} in your pocket.`,
        `Best cash: $${best}`,
      ], 'Press Space to try again');
    } else if (screen === SCREEN_COMPLETE) {
      drawPanel('Story Complete!', [
        'You pulled off the Bay Bank heist and own Solmar Bay.',
        `Final cash: $${state.cash}  •  Best cash: $${best}`,
      ], 'Press Space to keep roaming');
    }
  }

  resize();
  window.addEventListener('resize', resize);
  return { draw, view };
}
