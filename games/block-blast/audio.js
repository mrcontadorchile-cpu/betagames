// ─── AudioManager ────────────────────────────────────────────────────────────
// Procedural audio via Web Audio API. No files needed.

const AudioManager = (() => {
  let ctx = null;
  let masterGain = null;
  let musicGain = null;
  let sfxGain = null;
  let muted = false;
  let musicStarted = false;
  let musicNodes = [];

  const MUTE_KEY = 'blockblast_muted';

  // ── Init ──────────────────────────────────────────────────────────────────
  function init() {
    if (ctx) return;
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    masterGain = ctx.createGain();
    masterGain.connect(ctx.destination);

    musicGain = ctx.createGain();
    musicGain.gain.value = 0.22;
    musicGain.connect(masterGain);

    sfxGain = ctx.createGain();
    sfxGain.gain.value = 0.6;
    sfxGain.connect(masterGain);

    muted = localStorage.getItem(MUTE_KEY) === 'true';
    masterGain.gain.value = muted ? 0 : 1;
  }

  function resume() {
    if (ctx && ctx.state === 'suspended') ctx.resume();
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  function osc(freq, type, start, dur, gainVal, dest, detune = 0) {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.value = freq;
    if (detune) o.detune.value = detune;
    g.gain.setValueAtTime(0, start);
    g.gain.linearRampToValueAtTime(gainVal, start + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    o.connect(g);
    g.connect(dest || sfxGain);
    o.start(start);
    o.stop(start + dur + 0.05);
    return { osc: o, gain: g };
  }

  // Soft low-pass filtered noise burst
  function noise(start, dur, gainVal, cutoff = 800) {
    const bufLen = ctx.sampleRate * dur;
    const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = cutoff;
    const g = ctx.createGain();
    g.gain.setValueAtTime(gainVal, start);
    g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    src.connect(filter);
    filter.connect(g);
    g.connect(sfxGain);
    src.start(start);
    src.stop(start + dur + 0.05);
  }

  // Simple reverb using convolver
  function makeReverb(decaySec = 1.2) {
    const len = ctx.sampleRate * decaySec;
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2);
    }
    const conv = ctx.createConvolver();
    conv.buffer = buf;
    return conv;
  }

  // ── SFX ───────────────────────────────────────────────────────────────────

  // Colocar pieza: "pop" suave + click
  function playPlace() {
    if (!ctx) return;
    resume();
    const t = ctx.currentTime;
    osc(520, 'sine', t, 0.06, 0.4);
    osc(780, 'sine', t, 0.04, 0.15);
    noise(t, 0.04, 0.08, 600);
  }

  // Línea completada: campanita ascendente
  function playClear(lines = 1) {
    if (!ctx) return;
    resume();
    const t = ctx.currentTime;
    const rev = makeReverb(0.8);
    rev.connect(sfxGain);

    const base = lines >= 4 ? 660 : lines >= 2 ? 528 : 440;
    // Ascending arpeggio
    const steps = Math.min(lines + 2, 5);
    const intervals = [1, 5/4, 3/2, 2, 5/2];
    for (let i = 0; i < steps; i++) {
      const freq = base * intervals[i];
      const start = t + i * 0.08;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'triangle';
      o.frequency.value = freq;
      g.gain.setValueAtTime(0, start);
      g.gain.linearRampToValueAtTime(0.35, start + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, start + 0.5);
      o.connect(g);
      g.connect(rev);
      g.connect(sfxGain);
      o.start(start);
      o.stop(start + 0.55);
    }
  }

  // Combo: arpegio más brillante con brillo
  function playCombo(combo = 2) {
    if (!ctx) return;
    resume();
    const t = ctx.currentTime;
    const rev = makeReverb(1.0);
    rev.connect(sfxGain);
    const freqs = [523, 659, 784, 1047, 1319];
    const count = Math.min(combo + 1, 5);
    for (let i = 0; i < count; i++) {
      const start = t + i * 0.07;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine';
      o.frequency.value = freqs[i];
      g.gain.setValueAtTime(0, start);
      g.gain.linearRampToValueAtTime(0.4, start + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, start + 0.6);
      o.connect(g);
      g.connect(rev);
      g.connect(sfxGain);
      o.start(start);
      o.stop(start + 0.65);
      // Add shimmer on last note
      if (i === count - 1) {
        osc(freqs[i] * 2, 'sine', start, 0.4, 0.15, rev);
      }
    }
  }

  // Drop inválido: golpe sordo apagado
  function playInvalid() {
    if (!ctx) return;
    resume();
    const t = ctx.currentTime;
    osc(120, 'sine', t, 0.12, 0.3);
    osc(90, 'sine', t + 0.03, 0.08, 0.15);
    noise(t, 0.08, 0.12, 300);
  }

  // Game over: caída musical suave
  function playGameOver() {
    if (!ctx) return;
    resume();
    const t = ctx.currentTime;
    const rev = makeReverb(1.5);
    rev.connect(sfxGain);
    const descend = [523, 440, 349, 262, 196];
    descend.forEach((freq, i) => {
      const start = t + i * 0.18;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine';
      o.frequency.value = freq;
      g.gain.setValueAtTime(0, start);
      g.gain.linearRampToValueAtTime(0.3, start + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, start + 0.7);
      o.connect(g);
      g.connect(rev);
      g.connect(sfxGain);
      o.start(start);
      o.stop(start + 0.75);
    });
  }

  // Botón: tap elegante
  function playButton() {
    if (!ctx) return;
    resume();
    const t = ctx.currentTime;
    osc(880, 'sine', t, 0.05, 0.25);
    osc(1320, 'sine', t + 0.02, 0.04, 0.12);
  }

  // ── Música Procedural ─────────────────────────────────────────────────────
  // Minimalista tipo puzzle boutique: pad + arpeggio ligero + bajo sutil

  function startMusic() {
    if (!ctx) return;
    resume();
    if (musicStarted) return;
    musicStarted = true;
    _scheduleMusic();
  }

  function stopMusic() {
    musicStarted = false;
    musicNodes.forEach(n => { try { n.stop(); } catch(e){} });
    musicNodes = [];
  }

  const TEMPO = 2.4; // seconds per beat (slow ~25 bpm feel)
  const ROOT = 174.61; // F3

  // Pad chord: warm sine + triangle layers
  function _chord(freqs, start, dur, vol = 0.06) {
    freqs.forEach(f => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'triangle';
      o.frequency.value = f;
      o.detune.value = (Math.random() - 0.5) * 4;
      g.gain.setValueAtTime(0, start);
      g.gain.linearRampToValueAtTime(vol, start + 0.4);
      g.gain.setValueAtTime(vol, start + dur - 0.5);
      g.gain.linearRampToValueAtTime(0, start + dur);
      o.connect(g);
      g.connect(musicGain);
      o.start(start);
      o.stop(start + dur + 0.1);
      musicNodes.push(o);
    });
  }

  // Bell/mallet note
  function _bell(freq, start, vol = 0.07) {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sine';
    o.frequency.value = freq;
    g.gain.setValueAtTime(vol, start);
    g.gain.exponentialRampToValueAtTime(0.0001, start + 2.5);
    o.connect(g);
    g.connect(musicGain);
    o.start(start);
    o.stop(start + 2.6);
    musicNodes.push(o);

    // Inharmonic shimmer for bell feel
    const o2 = ctx.createOscillator();
    const g2 = ctx.createGain();
    o2.type = 'sine';
    o2.frequency.value = freq * 2.756;
    g2.gain.setValueAtTime(vol * 0.3, start);
    g2.gain.exponentialRampToValueAtTime(0.0001, start + 1.0);
    o2.connect(g2);
    g2.connect(musicGain);
    o2.start(start);
    o2.stop(start + 1.1);
    musicNodes.push(o2);
  }

  // Bass pulse
  function _bass(freq, start, dur) {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    const filt = ctx.createBiquadFilter();
    o.type = 'sine';
    o.frequency.value = freq;
    filt.type = 'lowpass';
    filt.frequency.value = 200;
    g.gain.setValueAtTime(0, start);
    g.gain.linearRampToValueAtTime(0.18, start + 0.05);
    g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    o.connect(filt);
    filt.connect(g);
    g.connect(musicGain);
    o.start(start);
    o.stop(start + dur + 0.05);
    musicNodes.push(o);
  }

  function _scheduleMusic() {
    if (!musicStarted) return;
    const t = ctx.currentTime + 0.1;

    // Chord progression: Fmaj → Am → Gm → C (loop every 4 beats)
    const chords = [
      [ROOT, ROOT * 5/4, ROOT * 3/2, ROOT * 2],         // F major
      [ROOT * 5/4, ROOT * 3/2, ROOT * 15/8, ROOT * 5/2], // A minor
      [ROOT * 3/4, ROOT * 9/8, ROOT * 27/16, ROOT * 9/4], // G minor-ish
      [ROOT * 2/3, ROOT * 5/6, ROOT * 5/4, ROOT * 5/3],   // C major
    ];
    const bassBass = [ROOT / 2, ROOT * 5/8, ROOT * 3/4, ROOT * 2/3];

    const loopDur = TEMPO * 4;

    chords.forEach((ch, i) => {
      const start = t + i * TEMPO;
      _chord(ch, start, TEMPO * 0.95, 0.045);
      _bass(bassBass[i], start, TEMPO * 0.7);
    });

    // Bell melody — gentle arpeggio scattered
    const bellNotes = [
      ROOT * 2, ROOT * 5/2, ROOT * 3, ROOT * 4,
      ROOT * 3, ROOT * 5/2, ROOT * 2, ROOT * 3/2
    ];
    bellNotes.forEach((freq, i) => {
      if (Math.random() > 0.3) {  // not every note, feels organic
        _bell(freq, t + i * (TEMPO / 2) + Math.random() * 0.15, 0.055);
      }
    });

    // Schedule next loop slightly before this one ends
    const scheduleDelay = (loopDur - 0.5) * 1000;
    const timer = setTimeout(() => { _scheduleMusic(); }, scheduleDelay);
    musicNodes.push({ stop: () => clearTimeout(timer) });
  }

  // ── Mute ──────────────────────────────────────────────────────────────────
  function toggleMute() {
    if (!ctx) return;
    muted = !muted;
    masterGain.gain.setTargetAtTime(muted ? 0 : 1, ctx.currentTime, 0.05);
    localStorage.setItem(MUTE_KEY, muted);
    return muted;
  }

  function isMuted() { return muted; }

  return { init, resume, startMusic, stopMusic, toggleMute, isMuted,
    playPlace, playClear, playCombo, playInvalid, playButton, playGameOver };
})();
