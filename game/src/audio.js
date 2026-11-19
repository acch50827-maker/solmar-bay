// Synthesized WebAudio sound for Porto Verde: engine hum, sirens, gunshots,
// pickups, jingles and a light bass groove. No audio files, no network.
export function createAudio() {
  const s = { ctx: null, muted: false, engineOsc: null, engineGain: null, sirenOn: false, musicTimer: null, step: 0 };
  function ensure() {
    if (s.ctx) { if (s.ctx.state === 'suspended') s.ctx.resume(); return; }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      s.ctx = new AC();
      const eng = s.ctx.createOscillator();
      eng.type = 'sawtooth';
      eng.frequency.value = 55;
      const eg = s.ctx.createGain();
      eg.gain.value = 0;
      const lp = s.ctx.createBiquadFilter();
      lp.type = 'lowpass'; lp.frequency.value = 420;
      eng.connect(lp); lp.connect(eg); eg.connect(s.ctx.destination);
      eng.start();
      s.engineOsc = eng; s.engineGain = eg;
      s.musicTimer = setInterval(() => playGroove(), 250);
    } catch (e) { s.ctx = null; }
  }
  function blip(freq, dur, type, vol, slideTo) {
    if (!s.ctx || s.muted) return;
    const t = s.ctx.currentTime;
    const o = s.ctx.createOscillator();
    const g = s.ctx.createGain();
    o.type = type || 'square';
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(vol || 0.12, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(s.ctx.destination);
    o.start(t); o.stop(t + dur + 0.02);
  }
  function noiseBurst(dur, vol, freq) {
    if (!s.ctx || s.muted) return;
    const t = s.ctx.currentTime;
    const len = Math.floor(s.ctx.sampleRate * dur);
    const buf = s.ctx.createBuffer(1, len, s.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = s.ctx.createBufferSource();
    src.buffer = buf;
    const f = s.ctx.createBiquadFilter();
    f.type = 'lowpass'; f.frequency.value = freq || 1800;
    const g = s.ctx.createGain();
    g.gain.value = vol || 0.25;
    src.connect(f); f.connect(g); g.connect(s.ctx.destination);
    src.start(t);
  }
  function playGroove() {
    if (!s.ctx || s.muted) return;
    // Chill coastal bass line: A minor groove, one note per beat.
    const notes = [55, 0, 65.41, 0, 49, 0, 65.41, 82.41];
    const n = notes[s.step % notes.length];
    s.step++;
    if (n > 0) blip(n, 0.22, 'triangle', 0.05);
    if (s.step % 4 === 0) blip(220, 0.08, 'sine', 0.03);
  }
  return {
    ensure,
    get muted() { return s.muted; },
    toggleMute() { s.muted = !s.muted; if (s.engineGain) s.engineGain.gain.value = 0; return s.muted; },
    engine(speed01, driving) {
      if (!s.ctx || !s.engineGain) return;
      const target = s.muted ? 0 : (driving ? 0.035 + speed01 * 0.05 : 0.012);
      s.engineGain.gain.setTargetAtTime(target, s.ctx.currentTime, 0.1);
      s.engineOsc.frequency.setTargetAtTime(50 + speed01 * 130, s.ctx.currentTime, 0.1);
    },
    siren(on) {
      if (!s.ctx || on === s.sirenOn) return;
      s.sirenOn = on;
      if (!on) return;
      const twoTone = () => {
        if (!s.sirenOn || !s.ctx || s.muted) { if (s.sirenOn) setTimeout(twoTone, 500); return; }
        blip(660, 0.42, 'sine', 0.035);
        setTimeout(() => blip(520, 0.42, 'sine', 0.035), 430);
        setTimeout(twoTone, 880);
      };
      twoTone();
    },
    shot() { noiseBurst(0.12, 0.3, 2400); blip(180, 0.08, 'square', 0.1, 60); },
    thud() { noiseBurst(0.15, 0.3, 500); },
    pickup() { blip(880, 0.1, 'sine', 0.14); setTimeout(() => blip(1320, 0.14, 'sine', 0.14), 90); },
    jingle() { [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => blip(f, 0.22, 'triangle', 0.14), i * 110)); },
    busted() { [392, 330, 262, 196].forEach((f, i) => setTimeout(() => blip(f, 0.3, 'sawtooth', 0.1), i * 160)); },
    click() { blip(700, 0.05, 'square', 0.08); },
  };
}
