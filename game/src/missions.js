// The story of Porto Verde: five chained jobs for Dante Cruz, a driver fresh out
// of prison, working off a debt to fixer Lena Ortiz while the Salazar crew closes
// in. Each mission is a list of steps; finish one to unlock the next.
import { dist } from './util.js';

export const MISSIONS = [
  {
    id: 'package', name: 'Paket Pertama', reward: 300,
    briefing: 'Lena: "Satu paket di Mercado Central. Antar ke Grand Hotel Azul. Jangan bikin ribut."',
    steps: [
      { type: 'goto', x: 1060, y: 1030, r: 70, text: 'Ambil paket di Mercado Central' },
      { type: 'goto', x: 1855, y: 640, r: 80, text: 'Antar paket ke Grand Hotel Azul' },
    ],
  },
  {
    id: 'pickup', name: 'Jemput Lena', reward: 500,
    briefing: 'Lena: "Jemput aku di Cafe Luna, lalu bawa ke tempat aman di utara. Polisi sudah mengendus."',
    steps: [
      { type: 'goto', x: 1435, y: 1820, r: 70, text: 'Jemput Lena di Cafe Luna' },
      { type: 'escape', x: 2500, y: 1300, r: 90, wanted: 2, text: 'Bawa Lena ke tempat aman — polisi mengejarmu!' },
    ],
  },
  {
    id: 'checkpoints', name: 'Tiga Pos', reward: 600,
    briefing: 'Lena: "Tiga pos, sembilan puluh detik. Buktikan kau masih bisa ngebut, Dante."',
    steps: [
      { type: 'timed', x: 600, y: 1400, r: 80, time: 90, text: 'Pos 1: perempatan barat (90 dtk)' },
      { type: 'timed', x: 2200, y: 600, r: 80, time: 90, text: 'Pos 2: jalan utara (90 dtk)' },
      { type: 'timed', x: 2600, y: 1800, r: 80, time: 90, text: 'Pos 3: jalan selatan (90 dtk)' },
    ],
  },
  {
    id: 'rescue', name: 'Selamatkan Tomas', reward: 800,
    briefing: 'Lena: "Tomas dijebak di dermaga oleh anak buah Salazar. Habisi mereka, bawa Tomas pulang."',
    steps: [
      { type: 'goto', x: 2860, y: 2030, r: 110, text: 'Pergi ke dermaga' },
      { type: 'kill', count: 3, text: 'Habisi 3 anak buah Salazar' },
      { type: 'goto', x: 2500, y: 1300, r: 90, text: 'Bawa Tomas ke tempat aman' },
    ],
  },
  {
    id: 'vault', name: 'Brankas Pelabuhan', reward: 1100,
    briefing: 'Lena: "Terakhir. Porto Bank, tahan brankas 20 detik, lalu kabur ke perahu di marina. Setelah ini kau bebas."',
    steps: [
      { type: 'goto', x: 1045, y: 630, r: 80, text: 'Masuk ke Porto Bank' },
      { type: 'hold', x: 1045, y: 630, r: 80, time: 20, text: 'Tahan brankas 20 detik!' },
      { type: 'escape', x: 2900, y: 2300, r: 100, wanted: 4, text: 'Kabur ke perahu di marina!' },
    ],
  },
];

export function createMissionState() {
  return { index: 0, step: 0, timer: 0, holdT: 0, kills: 0, done: false, failed: false, failReason: '' };
}
// Returns 'step' | 'mission' | 'all' | 'fail' | null.
export function updateMission(ms, dt, G) {
  if (ms.done || ms.failed) return null;
  const m = MISSIONS[ms.index];
  if (!m) { ms.done = true; return 'all'; }
  const step = m.steps[ms.step];
  const p = G.player;
  const d = step.x !== undefined ? dist(p.x, p.y, step.x, step.y) : 1e9;
  if (step.type === 'goto' || step.type === 'pickup') {
    if (d < step.r) return advance(ms, G);
  } else if (step.type === 'escape') {
    if (d < step.r) return advance(ms, G);
  } else if (step.type === 'hold') {
    if (d < step.r) {
      ms.holdT += dt;
      if (ms.holdT >= step.time) return advance(ms, G);
    } else ms.holdT = Math.max(0, ms.holdT - dt * 2);
  } else if (step.type === 'timed') {
    ms.timer += dt;
    if (d < step.r) return advance(ms, G);
    if (ms.timer > step.time) { ms.failed = true; ms.failReason = 'Waktu habis!'; return 'fail'; }
  } else if (step.type === 'kill') {
    if (ms.kills >= step.count) return advance(ms, G);
  }
  return null;
}
function advance(ms, G) {
  const m = MISSIONS[ms.index];
  ms.step++;
  ms.timer = 0; ms.holdT = 0; ms.kills = 0;
  if (ms.step >= m.steps.length) {
    G.cash += m.reward;
    ms.index++;
    ms.step = 0;
    if (ms.index >= MISSIONS.length) { ms.done = true; return 'all'; }
    return 'mission';
  }
  return 'step';
}
export function currentObjective(ms) {
  if (ms.done) return 'Semua misi selesai — Porto Verde milikmu, Dante.';
  const m = MISSIONS[ms.index];
  if (!m) return '';
  const step = m.steps[ms.step];
  let text = `${m.name}: ${step.text}`;
  if (step.type === 'hold') text += ` (${Math.max(0, Math.ceil(step.time - ms.holdT))} dtk)`;
  if (step.type === 'timed') text += ` (${Math.max(0, Math.ceil(step.time - ms.timer))} dtk)`;
  if (step.type === 'kill') text += ` (${ms.kills}/${step.count})`;
  return text;
}
export function missionMarker(ms) {
  if (ms.done) return null;
  const m = MISSIONS[ms.index];
  if (!m) return null;
  const step = m.steps[ms.step];
  if (step.x === undefined) return null;
  return { x: step.x, y: step.y, r: step.r };
}
