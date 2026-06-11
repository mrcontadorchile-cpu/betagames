const AudioManager = {
  ctx: null, muted: false, bgNodes: [], masterGain: null,
  _bellTimer: null, _chordTimer: null, _bassTimer: null,

  init() {
    if(this.ctx) return;
    this.muted = localStorage.getItem('sm_mute') === '1';
    document.getElementById('muteBtn').textContent = this.muted ? '🔇' : '🔊';
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    // Master gain + soft compressor
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = this.muted ? 0 : 0.7;
    const comp = this.ctx.createDynamicsCompressor();
    comp.threshold.value = -18; comp.ratio.value = 4;
    this.masterGain.connect(comp);
    comp.connect(this.ctx.destination);
    if(!this.muted) this._startBg();
  },

  resume() { if(this.ctx && this.ctx.state==='suspended') this.ctx.resume(); },
  _pauseBg() {
    if(this.masterGain) this.masterGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.15);
  },
  _resumeBg() {
    if(this.masterGain && !this.muted) this.masterGain.gain.setTargetAtTime(0.7, this.ctx.currentTime, 0.3);
  },

  toggle() {
    this.muted = !this.muted;
    localStorage.setItem('sm_mute', this.muted ? '1' : '0');
    document.getElementById('muteBtn').textContent = this.muted ? '🔇' : '🔊';
    if(this.muted) {
      this.bgNodes.forEach(n=>{ try{n.stop();}catch(e){} });
      this.bgNodes = [];
      clearTimeout(this._bellTimer);
      clearTimeout(this._chordTimer);
      clearTimeout(this._bassTimer);
      if(this.masterGain) this.masterGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.1);
    } else {
      if(this.masterGain) this.masterGain.gain.setTargetAtTime(0.7, this.ctx.currentTime, 0.3);
      this._startBg();
    }
  },

  // Reverb impulse
  _makeReverb(duration=1.5) {
    const sr = this.ctx.sampleRate;
    const len = sr * duration;
    const buf = this.ctx.createBuffer(2, len, sr);
    for(let c=0; c<2; c++) {
      const d = buf.getChannelData(c);
      for(let i=0; i<len; i++) d[i] = (Math.random()*2-1) * Math.pow(1 - i/len, 2.5);
    }
    const conv = this.ctx.createConvolver();
    conv.buffer = buf;
    return conv;
  },

  _osc(type, freq, start, dur, gainVal=0.15, dest=null) {
    if(!this.ctx || this.muted) return null;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0, start);
    g.gain.linearRampToValueAtTime(gainVal, start+0.01);
    g.gain.exponentialRampToValueAtTime(0.001, start+dur);
    g.connect(dest || this.masterGain);
    const o = this.ctx.createOscillator();
    o.type = type; o.frequency.value = freq;
    o.connect(g); o.start(start); o.stop(start+dur);
    return o;
  },

  _startBg() {
    if(!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;

    // Reverb bus
    const rev = this._makeReverb(2);
    const revGain = this.ctx.createGain(); revGain.gain.value = 0.22;
    rev.connect(revGain); revGain.connect(this.masterGain);

    // ── Deep pad: Cmaj7 chord (C2 E2 G2 B2) ──
    const padFreqs = [65.4, 82.4, 98.0, 123.5]; // C2 E2 G2 B2
    const padGain = this.ctx.createGain(); padGain.gain.value = 0.06;
    padGain.connect(this.masterGain);
    padGain.connect(rev);
    padFreqs.forEach((f, i) => {
      const o = this.ctx.createOscillator();
      o.type = 'sine'; o.frequency.value = f;
      // Slight detune for warmth
      o.detune.value = (i%2===0 ? 3 : -3);
      const lfo = this.ctx.createOscillator();
      lfo.type = 'sine'; lfo.frequency.value = 0.15 + i*0.07;
      const lg = this.ctx.createGain(); lg.gain.value = 0.8;
      lfo.connect(lg); lg.connect(o.frequency);
      lfo.start(t); o.connect(padGain); o.start(t);
      this.bgNodes.push(o, lfo);
    });

    // ── High shimmer: octave above ──
    const shimFreqs = [261.6, 329.6, 392.0, 493.9]; // C4 E4 G4 B4
    const shimGain = this.ctx.createGain(); shimGain.gain.value = 0.025;
    shimGain.connect(this.masterGain);
    shimGain.connect(rev);
    shimFreqs.forEach(f => {
      const o = this.ctx.createOscillator();
      o.type = 'triangle'; o.frequency.value = f;
      o.detune.value = Math.random()*6-3;
      o.connect(shimGain); o.start(t);
      this.bgNodes.push(o);
    });

    // ── Slow breathing filter sweep ──
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass'; filter.frequency.value = 600; filter.Q.value = 1;
    const filterLfo = this.ctx.createOscillator();
    filterLfo.type = 'sine'; filterLfo.frequency.value = 0.08;
    const flGain = this.ctx.createGain(); flGain.gain.value = 300;
    filterLfo.connect(flGain); flGain.connect(filter.frequency);
    filterLfo.start(t);
    shimGain.disconnect(); shimGain.connect(filter);
    filter.connect(this.masterGain);
    this.bgNodes.push(filterLfo);

    // Start chord + melody sequences
    this._schedChords();
    this._schedMelody();
    this._schedBass();
  },

  // Jazz chord progression: Cmaj7 → Am7 → Fmaj7 → G7
  _chordProg: [
    [261.6, 329.6, 392.0, 493.9],   // Cmaj7
    [220.0, 261.6, 329.6, 440.0],   // Am7
    [174.6, 220.0, 261.6, 349.2],   // Fmaj7
    [196.0, 246.9, 293.7, 392.0],   // G7
  ],
  _chordIdx: 0,
  _schedChords() {
    if(this.muted || !this.ctx) return;
    const t = this.ctx.currentTime;
    const chord = this._chordProg[this._chordIdx % 4];
    this._chordIdx++;
    // Arpeggiate softly
    chord.forEach((f, i) => {
      this._osc('sine', f, t + i*0.08, 2.5, 0.04);
      this._osc('triangle', f*2, t + i*0.08, 1.8, 0.015); // octave shimmer
    });
    this._chordTimer = setTimeout(() => this._schedChords(), 2800);
  },

  // Pentatonic melody
  _melodyNotes: [523, 587, 659, 784, 880, 784, 659, 587, 523, 659, 784, 880, 1047, 880, 784, 659],
  _melIdx: 0,
  _schedMelody() {
    if(this.muted || !this.ctx) return;
    const t = this.ctx.currentTime;
    const f = this._melodyNotes[this._melIdx % this._melodyNotes.length];
    this._melIdx++;
    // Soft bell-like tone
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.06, t);
    g.gain.exponentialRampToValueAtTime(0.001, t+0.9);
    g.connect(this.masterGain);
    const o = this.ctx.createOscillator();
    o.type = 'sine'; o.frequency.value = f;
    // Attack click via high partial
    const o2 = this.ctx.createOscillator();
    o2.type = 'triangle'; o2.frequency.value = f*3;
    const g2 = this.ctx.createGain();
    g2.gain.setValueAtTime(0.02, t);
    g2.gain.exponentialRampToValueAtTime(0.001, t+0.12);
    g2.connect(this.masterGain);
    o2.connect(g2); o.connect(g);
    o.start(t); o.stop(t+1.0);
    o2.start(t); o2.stop(t+0.15);
    const interval = [350,350,700,350,350,700][this._melIdx%6] + Math.random()*100;
    this._bellTimer = setTimeout(() => this._schedMelody(), interval);
  },

  _bassNotes: [65.4, 55.0, 43.65, 49.0], // C2 A1 F1 G1
  _bassIdx: 0,
  _schedBass() {
    if(this.muted || !this.ctx) return;
    const t = this.ctx.currentTime;
    const f = this._bassNotes[this._bassIdx % 4];
    this._bassIdx++;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.09, t);
    g.gain.setValueAtTime(0.09, t+0.05);
    g.gain.exponentialRampToValueAtTime(0.001, t+0.7);
    g.connect(this.masterGain);
    const o = this.ctx.createOscillator();
    o.type = 'triangle'; o.frequency.value = f;
    o.connect(g); o.start(t); o.stop(t+0.8);
    this._bassTimer = setTimeout(() => this._schedBass(), 1400);
  },

  // ── SFX ──
  playCardMove() {
    if(!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    // Smooth whoosh
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.08, t); g.gain.exponentialRampToValueAtTime(0.001, t+0.12);
    g.connect(this.masterGain);
    const o = this.ctx.createOscillator();
    o.type = 'triangle'; o.frequency.setValueAtTime(900, t);
    o.frequency.exponentialRampToValueAtTime(500, t+0.12);
    o.connect(g); o.start(t); o.stop(t+0.13);
  },

  playCardPlace() {
    if(!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    // Satisfying thud + ping
    this._osc('triangle', 200, t, 0.08, 0.12);
    this._osc('sine', 880, t+0.01, 0.18, 0.08);
    this._osc('sine', 1320, t+0.02, 0.12, 0.05);
  },

  playFoundation() {
    if(!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    // Rising arpeggio + sparkle
    [523,659,784,1047,1319].forEach((f,i) => {
      this._osc('sine', f, t+i*0.06, 0.35, 0.13);
      this._osc('triangle', f*2, t+i*0.06, 0.15, 0.04);
    });
  },

  playWin() {
    if(!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    // Grand fanfare
    const fanfare = [523,659,784,1047,784,1047,1319];
    fanfare.forEach((f,i) => {
      this._osc('sine', f, t+i*0.1, 0.6, 0.18);
      this._osc('triangle', f*2, t+i*0.1, 0.3, 0.06);
    });
    // Final chord
    [523,659,784,1047].forEach(f => this._osc('sine', f, t+0.9, 1.5, 0.15));
  },

  playInvalid() {
    if(!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.08, t); g.gain.exponentialRampToValueAtTime(0.001, t+0.2);
    g.connect(this.masterGain);
    const o = this.ctx.createOscillator();
    o.type = 'sawtooth'; o.frequency.setValueAtTime(220, t);
    o.frequency.exponentialRampToValueAtTime(110, t+0.2);
    o.connect(g); o.start(t); o.stop(t+0.22);
  },

  playCombo(n) {
    if(!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const base = 440 * Math.pow(1.15, Math.min(n,10));
    [1, 1.25, 1.5, 2].forEach((mult, i) => {
      this._osc('sine', base*mult, t+i*0.07, 0.35, 0.14-i*0.02);
    });
  }
};
