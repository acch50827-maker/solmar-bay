// Suara sintetis WebAudio untuk Porto Verde: tanpa file audio sama sekali.
let ctx = null;
let master = null;
let sirenNodes = null;

export function ensureAudio() {
  if (ctx) {
    if (ctx.state === 'suspended') ctx.resume();
    return;
  }
  try {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain();
    master.gain.value = 0.22;
    master.connect(ctx.destination);
  } catch (e) {
    ctx = null;
  }
}

function tone(freq, dur, type, vol, slideTo) {
  if (!ctx) return;
  const t0 = ctx.currentTime;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type || 'square';
  o.frequency.setValueAtTime(freq, t0);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + dur);
  g.gain.setValueAtTime(vol || 0.5, t0);
  g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  o.connect(g);
  g.connect(master);
  o.start(t0);
  o.stop(t0 + dur + 0.02);
}

function noiseBurst(dur, vol, low) {
  if (!ctx) return;
  const t0 = ctx.currentTime;
  const len = Math.floor(ctx.sampleRate * dur);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const f = ctx.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.value = low || 1200;
  const g = ctx.createGain();
  g.gain.value = vol || 0.6;
  src.connect(f);
  f.connect(g);
  g.connect(master);
  src.start(t0);
}

export const sfx = {
  click() { tone(660, 0.07, 'square', 0.3); },
  pickup() { tone(880, 0.09, 'sine', 0.5); setTimeout(() => tone(1320, 0.12, 'sine', 0.5), 70); },
  cash() { tone(990, 0.08, 'triangle', 0.5); setTimeout(() => tone(1480, 0.14, 'triangle', 0.5), 80); },
  shot() { noiseBurst(0.12, 0.7, 900); tone(180, 0.08, 'sawtooth', 0.3, 60); },
  hit() { noiseBurst(0.08, 0.4, 500); },
  crash() { noiseBurst(0.25, 0.8, 400); tone(90, 0.25, 'sawtooth', 0.4, 40); },
  busted() { tone(320, 0.5, 'sawtooth', 0.5, 90); },
  mission() { [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => tone(f, 0.16, 'triangle', 0.5), i * 110)); },
  fail() { tone(220, 0.3, 'sawtooth', 0.4, 110); },
  engine(on) {
    if (!ctx) return;
    if (on && !sirenNodes) return;
  },
};

export function startSiren() {
  if (!ctx || sirenNodes) return;
  const o = ctx.createOscillator();
  o.type = 'sine';
  o.frequency.value = 700;
  const lfo = ctx.createOscillator();
  lfo.type = 'sine';
  lfo.frequency.value = 0.9;
  const lg = ctx.createGain();
  lg.gain.value = 260;
  const g = ctx.createGain();
  g.gain.value = 0.05;
  lfo.connect(lg);
  lg.connect(o.frequency);
  o.connect(g);
  g.connect(master);
  o.start();
  lfo.start();
  sirenNodes = { o, lfo, g };
}

export function stopSiren() {
  if (!sirenNodes) return;
  try {
    sirenNodes.o.stop();
    sirenNodes.lfo.stop();
  } catch (e) {}
  sirenNodes = null;
}
