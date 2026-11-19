// Synthesized sound only — no audio files, no network. The WebAudio context
// is created on the first user gesture; every sound is an oscillator or a
// filtered noise burst, so the game stays silent (and safe) in a headless
// screenshot run, where no gesture ever happens.
export function createAudio() {
  let ctx = null;
  let engineOsc = null;
  let engineGain = null;
  let sirenOsc = null;
  let sirenGain = null;
  let muted = false;
  let sirenOn = false;

  function ensure() {
    if (ctx) return ctx;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      engineOsc = ctx.createOscillator();
      engineGain = ctx.createGain();
      engineOsc.type = 'sawtooth';
      engineOsc.frequency.value = 50;
      engineGain.gain.value = 0;
      engineOsc.connect(engineGain);
      engineGain.connect(ctx.destination);
      engineOsc.start();
      sirenOsc = ctx.createOscillator();
      sirenGain = ctx.createGain();
      sirenOsc.type = 'sine';
      sirenOsc.frequency.value = 700;
      sirenGain.gain.value = 0;
      sirenOsc.connect(sirenGain);
      sirenGain.connect(ctx.destination);
      sirenOsc.start();
    } catch {
      ctx = null;
    }
    return ctx;
  }

  function blip(freq, dur, type, vol) {
    if (muted || !ensure()) return;
    try {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = type || 'square';
      o.frequency.value = freq;
      g.gain.setValueAtTime(vol || 0.08, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
      o.connect(g);
      g.connect(ctx.destination);
      o.start();
      o.stop(ctx.currentTime + dur);
    } catch { /* sound is decoration */ }
  }

  function noise(dur, vol) {
    if (muted || !ensure()) return;
    try {
      const len = Math.floor(ctx.sampleRate * dur);
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = ctx.createBufferSource();
      const g = ctx.createGain();
      src.buffer = buf;
      g.gain.value = vol;
      src.connect(g);
      g.connect(ctx.destination);
      src.start();
    } catch { /* sound is decoration */ }
  }

  return {
    unlock() {
      ensure();
      if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
    },
    toggleMute() {
      muted = !muted;
      return muted;
    },
    get muted() { return muted; },
    shoot() { noise(0.12, 0.16); },
    punch() { noise(0.08, 0.1); blip(120, 0.08, 'sine', 0.08); },
    pickup() { blip(880, 0.12, 'sine', 0.09); blip(1320, 0.16, 'sine', 0.07); },
    mission() {
      blip(523, 0.14, 'triangle', 0.1);
      setTimeout(() => blip(659, 0.14, 'triangle', 0.1), 140);
      setTimeout(() => blip(784, 0.22, 'triangle', 0.1), 280);
    },
    hurt() { blip(160, 0.18, 'sawtooth', 0.1); },
    crime() { blip(220, 0.2, 'square', 0.07); },
    engine(speed, inCar) {
      if (!ctx || muted) {
        if (engineGain) engineGain.gain.value = 0;
        return;
      }
      const target = inCar ? 0.03 + (Math.abs(speed) / 520) * 0.05 : 0;
      engineGain.gain.setTargetAtTime(target, ctx.currentTime, 0.1);
      engineOsc.frequency.setTargetAtTime(45 + (Math.abs(speed) / 520) * 110, ctx.currentTime, 0.1);
    },
    siren(on) {
      sirenOn = on;
      if (!ctx) return;
      sirenGain.gain.setTargetAtTime(on && !muted ? 0.025 : 0, ctx.currentTime, 0.2);
      if (on) sirenOsc.frequency.setTargetAtTime(650 + Math.sin(Date.now() / 300) * 250, ctx.currentTime, 0.05);
    },
    get sirenOn() { return sirenOn; },
  };
}
