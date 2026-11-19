// Gambar dunia Porto Verde: jalan, gedung, laut, mobil, orang, HUD, dan minimap.
import { WORLD_W, WORLD_H, clamp, dist, fmtMoney, fmtTime } from './util.js';
import { ROAD_X, ROAD_Y, ROAD_W, PARK, BEACH_Y, SEA_Y, MARINA, BOAT, HOSPITAL, buildings, trees, VAULT, SAFEHOUSE, WAREHOUSE } from './city.js';
import { drawCarShape } from './vehicles.js';
import { drawPeds } from './people.js';
import { drawBullets } from './combat.js';
import { missionTarget, missionStatus, MISSIONS } from './missions.js';

const SKY = '#7ec850';

export function drawWorld(ctx, state) {
  const cam = state.camera;
  const W = ctx.canvas.width;
  const H = ctx.canvas.height;
  // Rumput dasar.
  ctx.fillStyle = '#69a84f';
  ctx.fillRect(0, 0, W, H);
  ctx.save();
  ctx.translate(-cam.x, -cam.y);
  // Pantai + laut.
  ctx.fillStyle = '#e8d8a0';
  ctx.fillRect(0, BEACH_Y, WORLD_W, WORLD_H - BEACH_Y);
  ctx.fillStyle = '#2b7ac2';
  ctx.fillRect(0, SEA_Y, WORLD_W, WORLD_H - SEA_Y);
  ctx.fillStyle = '#5aa9e6';
  for (let i = 0; i < 24; i++) {
    const wx = ((i * 137) % WORLD_W);
    const wy = SEA_Y + 12 + ((i * 53) % 70);
    ctx.fillRect(wx, wy, 60, 3);
  }
  // Taman.
  ctx.fillStyle = '#4c8a3f';
  ctx.fillRect(PARK.x, PARK.y, PARK.w, PARK.h);
  ctx.fillStyle = '#6aa84f';
  ctx.beginPath();
  ctx.arc(PARK.x + PARK.w / 2, PARK.y + PARK.h / 2, 90, 0, Math.PI * 2);
  ctx.fill();
  // Jalan.
  ctx.fillStyle = '#3a3a3a';
  for (const rx of ROAD_X) ctx.fillRect(rx - ROAD_W / 2, 0, ROAD_W, BEACH_Y);
  for (const ry of ROAD_Y) ctx.fillRect(0, ry - ROAD_W / 2, WORLD_W, ROAD_W);
  // Marka jalan.
  ctx.fillStyle = '#f5d76e';
  for (const rx of ROAD_X) {
    for (let y = 40; y < BEACH_Y; y += 80) ctx.fillRect(rx - 2, y, 4, 34);
  }
  for (const ry of ROAD_Y) {
    for (let x = 40; x < WORLD_W; x += 80) ctx.fillRect(x, ry - 2, 34, 4);
  }
  // Trotoar.
  ctx.fillStyle = '#9a9a9a';
  for (const rx of ROAD_X) {
    ctx.fillRect(rx - ROAD_W / 2 - 10, 0, 10, BEACH_Y);
    ctx.fillRect(rx + ROAD_W / 2, 0, 10, BEACH_Y);
  }
  // Marina + dermaga.
  ctx.fillStyle = '#8a6a4a';
  ctx.fillRect(MARINA.x, MARINA.y, MARINA.w, MARINA.h);
  ctx.fillStyle = '#6a4a2a';
  ctx.fillRect(MARINA.x + 40, MARINA.y + 50, 300, 14);
  // Perahu.
  ctx.save();
  ctx.translate(BOAT.x, BOAT.y);
  ctx.fillStyle = '#f2f2f2';
  ctx.beginPath();
  ctx.ellipse(0, 0, 46, 16, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#c0392b';
  ctx.fillRect(-20, -8, 40, 8);
  ctx.restore();
  // Gedung.
  for (const b of buildings) {
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(b.x + 5, b.y + 6, b.w, b.h);
    ctx.fillStyle = b.color;
    ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.fillRect(b.x, b.y, b.w, 8);
    if (b.kind === 'hospital') {
      ctx.fillStyle = '#c0392b';
      ctx.fillRect(b.x + b.w / 2 - 22, b.y + b.h / 2 - 6, 44, 12);
      ctx.fillRect(b.x + b.w / 2 - 6, b.y + b.h / 2 - 22, 12, 44);
    }
    if (b.kind === 'tower') {
      ctx.fillStyle = '#ffe9a8';
      for (let wy = b.y + 14; wy < b.y + b.h - 10; wy += 26) {
        for (let wx = b.x + 12; wx < b.x + b.w - 12; wx += 24) ctx.fillRect(wx, wy, 10, 12);
      }
    }
  }
  // Pohon.
  for (const t of trees) {
    ctx.fillStyle = '#2e6b2e';
    ctx.beginPath();
    ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#3f8a3f';
    ctx.beginPath();
    ctx.arc(t.x - 3, t.y - 3, t.r * 0.6, 0, Math.PI * 2);
    ctx.fill();
  }
  // Titik misi: brankas, safehouse, gudang.
  drawMarker(ctx, VAULT.x, VAULT.y, '#f1c40f', 'BRANKAS');
  drawMarker(ctx, SAFEHOUSE.x, SAFEHOUSE.y, '#27ae60', 'SAFEHOUSE');
  drawMarker(ctx, WAREHOUSE.x, WAREHOUSE.y, '#8e44ad', 'GUDANG');
  // Pickup.
  for (const pk of state.pickups) {
    const bob = Math.sin(pk.t * 4) * 3;
    ctx.save();
    ctx.translate(pk.x, pk.y + bob);
    if (pk.kind === 'cash') {
      ctx.fillStyle = '#27ae60';
      ctx.fillRect(-11, -7, 22, 14);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('$', 0, 4);
    } else {
      ctx.fillStyle = '#fff';
      ctx.fillRect(-9, -9, 18, 18);
      ctx.fillStyle = '#e74c3c';
      ctx.fillRect(-3, -8, 6, 16);
      ctx.fillRect(-8, -3, 16, 6);
    }
    ctx.restore();
  }
  // Target misi (penanda berdenyut).
  const tgt = missionTarget(state);
  if (tgt) {
    const pulse = 26 + Math.sin(state.time * 5) * 6;
    ctx.strokeStyle = '#ffe14d';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(tgt.x, tgt.y, pulse, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#ffe14d';
    ctx.beginPath();
    ctx.arc(tgt.x, tgt.y, 6, 0, Math.PI * 2);
    ctx.fill();
  }
  // Pejalan kaki, mobil lalu lintas, polisi, preman.
  drawPeds(ctx, cam, state);
  for (const c of state.cars) {
    if (c === state.player.car) continue;
    drawCarShape(ctx, c.x - cam.x, c.y - cam.y, c.angle, c.color, c.model, false);
  }
  for (const cop of state.police) {
    drawCarShape(ctx, cop.car.x - cam.x, cop.car.y - cam.y, cop.car.angle, '#1f3a5f', 'sedan', true);
  }
  for (const t of state.thugs) {
    ctx.save();
    ctx.translate(t.x - cam.x, t.y - cam.y);
    ctx.rotate(t.angle);
    ctx.fillStyle = '#3a2b2b';
    ctx.fillRect(-5, -6, 10, 12);
    ctx.fillStyle = '#e8b98a';
    ctx.beginPath();
    ctx.arc(7, 0, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#222';
    ctx.fillRect(6, -2, 14, 4);
    ctx.restore();
    ctx.fillStyle = '#c0392b';
    ctx.fillRect(t.x - cam.x - 14, t.y - cam.y - 20, 28 * (t.hp / 100), 4);
  }
  // Pemain.
  const p = state.player;
  if (p.car) {
    drawCarShape(ctx, p.car.x - cam.x, p.car.y - cam.y, p.car.angle, p.car.color, p.car.model, false);
  } else {
    ctx.save();
    ctx.translate(p.x - cam.x, p.y - cam.y);
    ctx.rotate(p.angle);
    ctx.fillStyle = '#2b3a4a';
    ctx.fillRect(-4, -5, 8, 10);
    ctx.fillStyle = '#f39c12';
    ctx.fillRect(-5, -6, 10, 9);
    ctx.fillStyle = '#e8b98a';
    ctx.beginPath();
    ctx.arc(7, 0, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#333';
    ctx.fillRect(8, -2, 10, 4);
    ctx.restore();
  }
  if (state.muzzle > 0) {
    ctx.fillStyle = '#ffe14d';
    ctx.beginPath();
    ctx.arc(p.x - cam.x + Math.cos(p.angle) * 24, p.y - cam.y + Math.sin(p.angle) * 24, 7, 0, Math.PI * 2);
    ctx.fill();
  }
  drawBullets(ctx, cam, state);
  ctx.restore();
}

function drawMarker(ctx, x, y, color, label) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.5)';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 10px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(label, x, y - 16);
}

export function drawHUD(ctx, state) {
  const W = ctx.canvas.width;
  const p = state.player;
  ctx.save();
  // Panel kiri atas.
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(12, 12, 250, 92);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 20px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(fmtMoney(state.cash), 24, 38);
  ctx.font = '14px sans-serif';
  ctx.fillText('Dante Cruz — Porto Verde', 24, 58);
  // Bintang wanted.
  for (let i = 0; i < 5; i++) {
    ctx.fillStyle = i < state.wanted ? '#ffd700' : 'rgba(255,255,255,0.25)';
    ctx.font = '20px sans-serif';
    ctx.fillText('★', 24 + i * 24, 88);
  }
  // Bar HP.
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.fillRect(150, 74, 100, 10);
  ctx.fillStyle = p.hp > 40 ? '#2ecc71' : '#e74c3c';
  ctx.fillRect(150, 74, 100 * (p.hp / 100), 10);
  // Panel misi kanan atas.
  const mi = state.missionIdx;
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(W - 312, 12, 300, 74);
  ctx.fillStyle = '#ffe14d';
  ctx.font = 'bold 15px sans-serif';
  ctx.fillText('Misi ' + (mi + 1) + '/5: ' + MISSIONS[mi].name, W - 300, 36);
  ctx.fillStyle = '#fff';
  ctx.font = '13px sans-serif';
  ctx.fillText(missionStatus(state), W - 300, 58);
  ctx.fillStyle = '#aaa';
  ctx.fillText('Hadiah $' + MISSIONS[mi].reward, W - 300, 76);
  // Kecepatan kiri bawah.
  if (p.car) {
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(12, ctx.canvas.height - 52, 130, 40);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 18px sans-serif';
    ctx.fillText(Math.round(Math.abs(p.speed) * 0.35) + ' km/h', 24, ctx.canvas.height - 26);
  }
  // Toast tengah.
  if (state.toastT > 0) {
    ctx.font = 'bold 22px sans-serif';
    const tw = ctx.measureText(state.toast).width;
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    ctx.fillRect(W / 2 - tw / 2 - 16, 110, tw + 32, 40);
    ctx.fillStyle = '#ffe14d';
    ctx.textAlign = 'center';
    ctx.fillText(state.toast, W / 2, 138);
    ctx.textAlign = 'left';
  }
  // Hint kontrol.
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.font = '12px sans-serif';
  ctx.fillText('WASD gerak/kendara • E curi/keluar mobil • Klik tembak • P jeda • M suara', 14, ctx.canvas.height - 10);
  ctx.restore();
}

export function drawMinimap(ctx, state) {
  const mw = 200;
  const mh = 150;
  const x0 = ctx.canvas.width - mw - 12;
  const y0 = ctx.canvas.height - mh - 12;
  const sx = mw / WORLD_W;
  const sy = mh / WORLD_H;
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(x0, y0, mw, mh);
  ctx.fillStyle = '#69a84f';
  ctx.fillRect(x0, y0, mw, mh * (BEACH_Y / WORLD_H));
  ctx.fillStyle = '#e8d8a0';
  ctx.fillRect(x0, y0 + mh * (BEACH_Y / WORLD_H), mw, mh * ((SEA_Y - BEACH_Y) / WORLD_H));
  ctx.fillStyle = '#2b7ac2';
  ctx.fillRect(x0, y0 + mh * (SEA_Y / WORLD_H), mw, mh * ((WORLD_H - SEA_Y) / WORLD_H));
  ctx.fillStyle = '#3a3a3a';
  for (const rx of ROAD_X) ctx.fillRect(x0 + rx * sx - 2, y0, 4, mh * (BEACH_Y / WORLD_H));
  for (const ry of ROAD_Y) ctx.fillRect(x0, y0 + ry * sy - 2, mw, 4);
  ctx.fillStyle = '#4c8a3f';
  ctx.fillRect(x0 + PARK.x * sx, y0 + PARK.y * sy, PARK.w * sx, PARK.h * sy);
  const tgt = missionTarget(state);
  if (tgt) {
    ctx.fillStyle = '#ffe14d';
    ctx.beginPath();
    ctx.arc(x0 + tgt.x * sx, y0 + tgt.y * sy, 5, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const cop of state.police) {
    ctx.fillStyle = '#5aa9ff';
    ctx.beginPath();
    ctx.arc(x0 + cop.car.x * sx, y0 + cop.car.y * sy, 3.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(x0 + state.player.x * sx, y0 + state.player.y * sy, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.7)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x0, y0, mw, mh);
  ctx.restore();
}
