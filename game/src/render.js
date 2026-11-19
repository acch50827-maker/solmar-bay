// All drawing for Porto Verde: the city, cars, people, effects, HUD, minimap
// and every menu. One canvas, one camera, warm coastal colours.
import { clamp, TAU } from './util.js';
import { ROAD_W } from './city.js';
import { currentObjective, missionMarker, MISSIONS } from './missions.js';

const SKY = '#7ec8e3';

function drawCar(ctx, c) {
  ctx.save();
  ctx.translate(c.x, c.y);
  ctx.rotate(c.angle);
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fillRect(-20, -11, 42, 26);
  ctx.fillStyle = c.color;
  ctx.beginPath();
  ctx.roundRect(-20, -11, 42, 22, 6);
  ctx.fill();
  ctx.fillStyle = '#bfe3f2';
  ctx.fillRect(-4, -9, 12, 18);
  ctx.fillStyle = '#ffe9a8';
  ctx.fillRect(18, -9, 3, 4);
  ctx.fillRect(18, 5, 3, 4);
  if (c.kind === 'police') {
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 9px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('POLISI', 0, 4);
    ctx.fillStyle = '#ff3b30';
    ctx.fillRect(-12, -11, 8, 4);
    ctx.fillStyle = '#2f7bff';
    ctx.fillRect(4, -11, 8, 4);
  }
  ctx.restore();
}
function drawPed(ctx, p) {
  ctx.save();
  ctx.translate(p.x, p.y);
  if (p.state === 'down') {
    ctx.rotate(1.2);
    ctx.fillStyle = p.color;
    ctx.beginPath(); ctx.arc(0, 0, 8, 0, TAU); ctx.fill();
  } else {
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath(); ctx.ellipse(0, 3, 7, 4, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = p.color;
    ctx.beginPath(); ctx.arc(0, 0, 7, 0, TAU); ctx.fill();
    ctx.fillStyle = '#f2c89b';
    ctx.beginPath(); ctx.arc(Math.cos(p.angle) * 3, Math.sin(p.angle) * 3, 4, 0, TAU); ctx.fill();
  }
  ctx.restore();
}
function drawPlayer(ctx, pl) {
  ctx.save();
  ctx.translate(pl.x, pl.y);
  ctx.rotate(pl.angle);
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath(); ctx.ellipse(0, 4, 10, 6, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = '#ffd23f';
  ctx.beginPath(); ctx.arc(0, 0, 10, 0, TAU); ctx.fill();
  ctx.fillStyle = '#222';
  ctx.fillRect(6, -3, 10, 6); // gun / arm
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(3, -3, 2, 0, TAU); ctx.arc(3, 3, 2, 0, TAU); ctx.fill();
  ctx.restore();
}
export function drawWorld(ctx, G) {
  const { city, cam } = G;
  const vw = 1280, vh = 720;
  ctx.fillStyle = '#3f7a4a';
  ctx.fillRect(0, 0, vw, vh);
  const x0 = cam.x - vw / 2, y0 = cam.y - vh / 2;
  ctx.save();
  ctx.translate(-x0, -y0);
  // Beach + sea along the south edge.
  ctx.fillStyle = '#e8d8a0';
  ctx.fillRect(0, city.beach.y0, city.w, city.h - city.beach.y0);
  ctx.fillStyle = '#2f7fb8';
  ctx.fillRect(0, city.beach.waterY, city.w, city.h - city.beach.waterY);
  ctx.fillStyle = '#7fc4e8';
  ctx.fillRect(0, city.beach.waterY, city.w, 6);
  // Ground blocks.
  ctx.fillStyle = '#4c8a52';
  ctx.fillRect(0, 0, city.w, city.beach.y0);
  // Park.
  ctx.fillStyle = '#57a05e';
  ctx.fillRect(city.park.x, city.park.y, city.park.w, city.park.h);
  ctx.fillStyle = '#6fbf7a';
  ctx.beginPath(); ctx.arc(city.park.x + 150, city.park.y + 150, 60, 0, TAU); ctx.fill();
  for (const t of city.trees) {
    ctx.fillStyle = '#2e7d32';
    ctx.beginPath(); ctx.arc(t.x, t.y, t.r, 0, TAU); ctx.fill();
    ctx.fillStyle = '#43a047';
    ctx.beginPath(); ctx.arc(t.x - 3, t.y - 3, t.r * 0.6, 0, TAU); ctx.fill();
  }
  // Roads.
  ctx.fillStyle = '#3a3f4a';
  for (const rx of city.roadsV) ctx.fillRect(rx - ROAD_W / 2, 0, ROAD_W, city.beach.y0);
  for (const ry of city.roadsH) ctx.fillRect(0, ry - ROAD_W / 2, city.w, ROAD_W);
  ctx.strokeStyle = '#e8d44d';
  ctx.lineWidth = 3;
  ctx.setLineDash([18, 18]);
  for (const rx of city.roadsV) { ctx.beginPath(); ctx.moveTo(rx, 0); ctx.lineTo(rx, city.beach.y0); ctx.stroke(); }
  for (const ry of city.roadsH) { ctx.beginPath(); ctx.moveTo(0, ry); ctx.lineTo(city.w, ry); ctx.stroke(); }
  ctx.setLineDash([]);
  // Buildings.
  for (const b of city.buildings) {
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(b.x + 5, b.y + 6, b.w, b.h);
    ctx.fillStyle = b.color;
    ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 2;
    ctx.strokeRect(b.x + 4, b.y + 4, b.w - 8, b.h - 8);
    if (b.tall) {
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      for (let wy = b.y + 16; wy < b.y + b.h - 12; wy += 26)
        for (let wx = b.x + 12; wx < b.x + b.w - 12; wx += 26) ctx.fillRect(wx, wy, 12, 14);
    }
    if (b.landmark) {
      ctx.fillStyle = '#222';
      ctx.font = 'bold 13px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(b.name, b.x + b.w / 2, b.y + b.h / 2 + 4);
    }
  }
  // Marina boat.
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.moveTo(city.spots.boat.x - 40, city.spots.boat.y);
  ctx.lineTo(city.spots.boat.x + 40, city.spots.boat.y);
  ctx.lineTo(city.spots.boat.x + 24, city.spots.boat.y + 16);
  ctx.lineTo(city.spots.boat.x - 24, city.spots.boat.y + 16);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#d94f3d';
  ctx.fillRect(city.spots.boat.x - 8, city.spots.boat.y - 18, 16, 18);
  // Mission marker.
  const mk = missionMarker(G.mission);
  if (mk && G.mode === 'playing') {
    const pulse = 1 + Math.sin(G.time * 5) * 0.15;
    ctx.strokeStyle = '#ffe14d';
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(mk.x, mk.y, mk.r * 0.5 * pulse, 0, TAU); ctx.stroke();
    ctx.fillStyle = '#ffe14d';
    ctx.font = 'bold 22px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('▼', mk.x, mk.y - mk.r * 0.5 - 8);
  }
  // Pickups.
  for (const p of G.pickups) {
    const bob = Math.sin(p.bob * 4) * 3;
    ctx.fillStyle = p.kind === 'cash' ? '#37d67a' : '#ff5d5d';
    ctx.beginPath(); ctx.arc(p.x, p.y + bob, 11, 0, TAU); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(p.kind === 'cash' ? '$' : '+', p.x, p.y + bob + 5);
  }
  // Thugs.
  for (const t of G.thugs) {
    if (t.state === 'down') continue;
    ctx.save(); ctx.translate(t.x, t.y);
    ctx.fillStyle = t.color;
    ctx.beginPath(); ctx.arc(0, 0, 10, 0, TAU); ctx.fill();
    ctx.fillStyle = '#ff5d5d';
    ctx.fillRect(-8, -16, 16, 3);
    ctx.fillStyle = '#37d67a';
    ctx.fillRect(-8, -16, 16 * Math.max(0, t.hp / 50), 3);
    ctx.restore();
  }
  for (const p of G.peds) drawPed(ctx, p);
  for (const c of G.cars) drawCar(ctx, c);
  for (const c of G.police) drawCar(ctx, c);
  if (G.player.car) drawCar(ctx, G.player.car);
  else drawPlayer(ctx, G.player);
  // Bullets.
  ctx.fillStyle = '#ffe14d';
  for (const b of G.bullets) { ctx.beginPath(); ctx.arc(b.x, b.y, 3, 0, TAU); ctx.fill(); }
  // Particles.
  for (const pt of G.particles) {
    ctx.globalAlpha = Math.max(0, pt.life / pt.max);
    ctx.fillStyle = pt.color;
    ctx.beginPath(); ctx.arc(pt.x, pt.y, pt.r, 0, TAU); ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}
function drawMinimap(ctx, G) {
  const s = 150, ox = 1280 - s - 16, oy = 16;
  const sx = s / G.city.w, sy = s / G.city.h;
  ctx.fillStyle = 'rgba(8,14,28,0.85)';
  ctx.fillRect(ox - 4, oy - 4, s + 8, s * (G.city.h / G.city.w) + 8);
  const mh = s * (G.city.h / G.city.w);
  ctx.save();
  ctx.beginPath(); ctx.rect(ox, oy, s, mh); ctx.clip();
  ctx.fillStyle = '#2c5d34';
  ctx.fillRect(ox, oy, s, mh);
  ctx.fillStyle = '#3a3f4a';
  for (const rx of G.city.roadsV) ctx.fillRect(ox + rx * sx - 1, oy, 2, mh);
  for (const ry of G.city.roadsH) ctx.fillRect(ox, oy + ry * sy, s, 2);
  ctx.fillStyle = '#2f7fb8';
  ctx.fillRect(ox, oy + G.city.beach.waterY * sy, s, mh - G.city.beach.waterY * sy);
  const mk = missionMarker(G.mission);
  if (mk) {
    ctx.fillStyle = '#ffe14d';
    ctx.beginPath(); ctx.arc(ox + mk.x * sx, oy + mk.y * sy, 5, 0, TAU); ctx.fill();
  }
  for (const c of G.police) {
    ctx.fillStyle = '#4d8dff';
    ctx.beginPath(); ctx.arc(ox + c.x * sx, oy + c.y * sy, 3, 0, TAU); ctx.fill();
  }
  ctx.fillStyle = '#ffd23f';
  ctx.beginPath(); ctx.arc(ox + G.player.x * sx, oy + G.player.y * sy, 4, 0, TAU); ctx.fill();
  ctx.restore();
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 1;
  ctx.strokeRect(ox - 4, oy - 4, s + 8, mh + 8);
}
export function drawHUD(ctx, G) {
  const mh = 150 * (G.city.h / G.city.w);
  ctx.textAlign = 'left';
  // Cash + health.
  ctx.fillStyle = 'rgba(8,14,28,0.8)';
  ctx.fillRect(12, 12, 250, 64);
  ctx.fillStyle = '#37d67a';
  ctx.font = 'bold 24px sans-serif';
  ctx.fillText('$' + G.cash.toLocaleString(), 24, 42);
  ctx.fillStyle = '#333';
  ctx.fillRect(24, 52, 200, 12);
  ctx.fillStyle = G.player.hp > 30 ? '#37d67a' : '#ff5d5d';
  ctx.fillRect(24, 52, 200 * Math.max(0, G.player.hp / 100), 12);
  // Wanted stars.
  ctx.fillStyle = 'rgba(8,14,28,0.8)';
  ctx.fillRect(12, 84, 200, 36);
  for (let i = 0; i < 5; i++) {
    ctx.fillStyle = i < G.wanted.level ? '#ffe14d' : '#555';
    ctx.font = '22px sans-serif';
    ctx.fillText('★', 24 + i * 36, 110);
  }
  // Speed + vehicle.
  if (G.player.car) {
    ctx.fillStyle = 'rgba(8,14,28,0.8)';
    ctx.fillRect(12, 128, 150, 36);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText(Math.round(Math.abs(G.player.car.speed) * 0.22) + ' km/h', 24, 153);
  }
  // Objective.
  ctx.fillStyle = 'rgba(8,14,28,0.8)';
  const obj = currentObjective(G.mission);
  ctx.fillRect(12, 720 - 52, Math.min(760, 24 + obj.length * 8.5), 40);
  ctx.fillStyle = '#ffe14d';
  ctx.font = 'bold 16px sans-serif';
  ctx.fillText('◆ ' + obj, 24, 720 - 26);
  // Mission list (top-left under stars).
  ctx.fillStyle = 'rgba(8,14,28,0.65)';
  ctx.fillRect(12, 172, 230, 24 + MISSIONS.length * 20);
  ctx.fillStyle = '#cfe3ff';
  ctx.font = '13px sans-serif';
  ctx.fillText('MISI — PORTO VERDE', 22, 190);
  MISSIONS.forEach((m, i) => {
    ctx.fillStyle = i < G.mission.index ? '#37d67a' : i === G.mission.index ? '#ffe14d' : '#888';
    ctx.fillText((i < G.mission.index ? '✓ ' : i === G.mission.index ? '► ' : '· ') + m.name + '  $' + m.reward, 22, 210 + i * 20);
  });
  drawMinimap(ctx, G);
  // Busted / complete banners are drawn by drawMenu.
}
export function drawMenu(ctx, G) {
  ctx.fillStyle = 'rgba(6,10,22,0.72)';
  ctx.fillRect(0, 0, 1280, 720);
  ctx.textAlign = 'center';
  if (G.mode === 'title') {
    ctx.fillStyle = '#ffd23f';
    ctx.font = 'bold 84px sans-serif';
    ctx.fillText('PORTO VERDE', 640, 210);
    ctx.fillStyle = '#fff';
    ctx.font = '28px sans-serif';
    ctx.fillText('Kota pantai. Uang cepat. Polisi di mana-mana.', 640, 260);
    ctx.font = '18px sans-serif';
    ctx.fillStyle = '#cfe3ff';
    ctx.fillText('Dante Cruz baru keluar dari penjara — dan Lena Ortiz sudah punya 5 pekerjaan untuknya.', 640, 300);
    ctx.fillStyle = '#37d67a';
    ctx.font = 'bold 26px sans-serif';
    ctx.fillText(G.save ? '[ ENTER ]  Lanjutkan  •  [ N ]  Permainan Baru' : '[ ENTER ]  Mulai Permainan', 640, 400);
    ctx.fillStyle = '#cfe3ff';
    ctx.font = '16px sans-serif';
    ctx.fillText('WASD gerak / nyetir  •  Mouse bidik, Klik tembak  •  E masuk / keluar mobil  •  P jeda  •  M bisu', 640, 450);
    ctx.fillText('Misi berantai, wanted 0–5 bintang, kejar-kejaran polisi, simpan otomatis.', 640, 480);
  } else if (G.mode === 'paused') {
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 56px sans-serif';
    ctx.fillText('JEDA', 640, 330);
    ctx.font = '20px sans-serif';
    ctx.fillText('[ P ] lanjut  •  [ M ] bisu  •  [ Q ] kembali ke judul', 640, 380);
  } else if (G.mode === 'busted') {
    ctx.fillStyle = '#ff5d5d';
    ctx.font = 'bold 64px sans-serif';
    ctx.fillText('TERTANGKAP!', 640, 300);
    ctx.fillStyle = '#fff';
    ctx.font = '22px sans-serif';
    ctx.fillText('Polisi Porto Verde menyitamu. Uangmu dipotong 20%.', 640, 350);
    ctx.fillText('[ ENTER ]  Coba lagi', 640, 400);
  } else if (G.mode === 'complete') {
    ctx.fillStyle = '#37d67a';
    ctx.font = 'bold 56px sans-serif';
    ctx.fillText('PORTO VERDE MILIKMU!', 640, 280);
    ctx.fillStyle = '#fff';
    ctx.font = '24px sans-serif';
    ctx.fillText('Semua 5 misi selesai. Dante bebas — dengan $' + G.cash.toLocaleString() + ' di kantong.', 640, 330);
    ctx.fillText('[ ENTER ]  Main lagi (free roam)', 640, 380);
  }
}
