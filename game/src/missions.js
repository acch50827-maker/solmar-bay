// Rantai 5 misi Porto Verde: Dante Cruz & Lena Ortiz melawan Salazar.
import { dist, fmtTime } from './util.js';
import { SAFEHOUSE, WAREHOUSE, VAULT, BOAT } from './city.js';
import { sfx } from './audio.js';
import { spawnThugs } from './combat.js';

export const MISSIONS = [
  { name: 'Paket Pertama', reward: 300, brief: 'Ambil paket di pelabuhan kecil, antar ke apartemen downtown.' },
  { name: 'Jemput Lena', reward: 500, brief: 'Jemput Lena di taman, antar dia ke safehouse.' },
  { name: 'Tiga Pos', reward: 700, brief: 'Kunjungi tiga pos dalam 90 detik. Jangan sampai kehabisan waktu!' },
  { name: 'Selamatkan Tomas', reward: 800, brief: 'Tomas disandera di gudang. Habisi 3 preman Salazar.' },
  { name: 'Brankas Pelabuhan', reward: 1000, brief: 'Tahan brankas 20 detik, lalu kabur ke perahu di marina.' },
];

const PICKUP_A = { x: 2600, y: 2200 };
const DROP_A = { x: 1800, y: 1000 };
const LENA_SPOT = { x: 1600, y: 1200 };
const CHECKPOINTS = [
  { x: 600, y: 600 },
  { x: 2600, y: 1400 },
  { x: 1000, y: 2200 },
];

export function startMission(state, idx) {
  const m = MISSIONS[idx];
  state.missionIdx = idx;
  state.mission = {
    stage: 0,
    timer: idx === 2 ? 90 : 0,
    vaultHold: 0,
    cpIdx: 0,
    text: m.brief,
    done: false,
  };
  state.kills = 0;
  state.thugs.length = 0;
  if (idx === 3) spawnThugs(state, WAREHOUSE.x, WAREHOUSE.y, 3);
  state.toast = 'Misi ' + (idx + 1) + ': ' + m.name;
  state.toastT = 3;
  sfx.mission();
}

function completeMission(state) {
  const m = MISSIONS[state.missionIdx];
  state.cash += m.reward;
  state.toast = 'Misi selesai! +' + '$' + m.reward;
  state.toastT = 3.5;
  sfx.cash();
  state.mission.done = true;
  state.saveGame();
  if (state.missionIdx + 1 < MISSIONS.length) {
    setTimeout(() => startMission(state, state.missionIdx + 1), 1200);
  } else {
    setTimeout(() => { state.mode = 'complete'; }, 1200);
  }
}

function failMission(state, why) {
  state.toast = why;
  state.toastT = 3;
  sfx.fail();
  setTimeout(() => startMission(state, state.missionIdx), 1200);
}

// Target panah penunjuk saat ini (untuk HUD + minimap).
export function missionTarget(state) {
  const m = state.mission;
  if (!m || state.mode !== 'play') return null;
  switch (state.missionIdx) {
    case 0: return m.stage === 0 ? PICKUP_A : DROP_A;
    case 1: return m.stage === 0 ? LENA_SPOT : SAFEHOUSE;
    case 2: return CHECKPOINTS[m.cpIdx];
    case 3: return { x: WAREHOUSE.x, y: WAREHOUSE.y };
    case 4: return m.stage === 0 ? VAULT : BOAT;
    default: return null;
  }
}

export function missionStatus(state) {
  const m = state.mission;
  if (!m) return '';
  switch (state.missionIdx) {
    case 0: return m.stage === 0 ? 'Ambil paket' : 'Antar paket ke downtown';
    case 1: return m.stage === 0 ? 'Jemput Lena di taman' : 'Antar Lena ke safehouse';
    case 2: return 'Pos ' + (m.cpIdx + 1) + '/3 — ' + fmtTime(m.timer);
    case 3: return 'Habisi preman: ' + (state.kills || 0) + '/3';
    case 4: return m.stage === 0 ? 'Tahan brankas: ' + Math.floor(m.vaultHold) + '/20 dtk' : 'Kabur ke perahu!';
    default: return '';
  }
}

export function updateMission(state, dt) {
  const m = state.mission;
  if (!m || m.done || state.mode !== 'play') return;
  const p = state.player;
  const near = (t, r) => dist(p.x, p.y, t.x, t.y) < r;

  switch (state.missionIdx) {
    case 0:
      if (m.stage === 0 && near(PICKUP_A, 46)) { m.stage = 1; sfx.pickup(); state.toast = 'Paket didapat — antar ke downtown'; state.toastT = 2.5; }
      else if (m.stage === 1 && near(DROP_A, 46)) completeMission(state);
      break;
    case 1:
      if (m.stage === 0 && near(LENA_SPOT, 46)) { m.stage = 1; sfx.pickup(); state.toast = 'Lena ikut! Antar ke safehouse'; state.toastT = 2.5; }
      else if (m.stage === 1 && near(SAFEHOUSE, 46)) completeMission(state);
      break;
    case 2: {
      m.timer -= dt;
      if (m.timer <= 0) { failMission(state, 'Waktu habis! Ulangi misi.'); return; }
      const cp = CHECKPOINTS[m.cpIdx];
      if (near(cp, 50)) {
        sfx.pickup();
        m.cpIdx++;
        if (m.cpIdx >= CHECKPOINTS.length) completeMission(state);
        else { state.toast = 'Pos ' + m.cpIdx + '/3 dilewati'; state.toastT = 1.5; }
      }
      break;
    }
    case 3:
      if ((state.kills || 0) >= 3) completeMission(state);
      break;
    case 4:
      if (m.stage === 0) {
        if (near(VAULT, 60)) {
          m.vaultHold += dt;
          if (m.vaultHold >= 20) { m.stage = 1; sfx.mission(); state.toast = 'Brankas dibuka! Kabur ke perahu!'; state.toastT = 3; }
        } else {
          m.vaultHold = Math.max(0, m.vaultHold - dt * 0.5);
        }
      } else if (near(BOAT, 60)) {
        completeMission(state);
      }
      break;
    default:
      break;
  }
}
