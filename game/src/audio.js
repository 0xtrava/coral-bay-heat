// Sound for Coral Bay Heat: everything is synthesized with WebAudio,
// so the game ships no audio files. The engine is lazy — it only builds
// its context after the first user gesture, and every call is guarded so
// a headless run (no audio device) never throws.
export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.engineOsc = null;
    this.engineGain = null;
    this.radioOsc = null;
    this.radioGain = null;
    this.sirenTimer = null;
    this.muted = false;
    this.station = 0;
    this.stations = ['CORAL FM 98.4 — Island Pop', 'VICE 107.3 — Sunset Rock', 'SUNSET 91.1 — Night Drive'];
  }

  // Build the context on first gesture. Safe to call repeatedly.
  ensure() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
      return true;
    }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.5;
      this.master.connect(this.ctx.destination);
      this._startEngine();
      this._startRadio();
      return true;
    } catch {
      this.ctx = null;
      return false;
    }
  }

  _startEngine() {
    this.engineOsc = this.ctx.createOscillator();
    this.engineOsc.type = 'sawtooth';
    this.engineOsc.frequency.value = 42;
    this.engineGain = this.ctx.createGain();
    this.engineGain.gain.value = 0.0;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 320;
    this.engineOsc.connect(filter);
    filter.connect(this.engineGain);
    this.engineGain.connect(this.master);
    this.engineOsc.start();
  }

  _startRadio() {
    // A soft two-note pad that drifts between chord tones per station.
    this.radioOsc = this.ctx.createOscillator();
    this.radioOsc.type = 'triangle';
    this.radioOsc.frequency.value = 220;
    const osc2 = this.ctx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.value = 277;
    this.radioGain = this.ctx.createGain();
    this.radioGain.gain.value = 0.05;
    this.radioOsc.connect(this.radioGain);
    osc2.connect(this.radioGain);
    this.radioGain.connect(this.master);
    this.radioOsc.start();
    osc2.start();
    this.radioOsc2 = osc2;
  }

  // speed 0..1 -> engine pitch and loudness
  setEngine(speed01, on) {
    if (!this.ctx || !this.engineOsc) return;
    const t = this.ctx.currentTime;
    this.engineOsc.frequency.setTargetAtTime(42 + speed01 * 130, t, 0.08);
    this.engineGain.gain.setTargetAtTime(on ? 0.05 + speed01 * 0.05 : 0.0, t, 0.1);
  }

  nextStation() {
    this.station = (this.station + 1) % this.stations.length;
    if (!this.ctx || !this.radioOsc) return this.stations[this.station];
    const roots = [220, 196, 174];
    const t = this.ctx.currentTime;
    this.radioOsc.frequency.setTargetAtTime(roots[this.station], t, 0.2);
    this.radioOsc2.frequency.setTargetAtTime(roots[this.station] * 1.26, t, 0.2);
    return this.stations[this.station];
  }

  stationName() { return this.stations[this.station]; }

  // A short noise burst: a gunshot.
  gunshot() {
    if (!this.ctx) return;
    try {
      const dur = 0.14;
      const buf = this.ctx.createBuffer(1, this.ctx.sampleRate * dur, this.ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      const g = this.ctx.createGain();
      g.gain.value = 0.35;
      src.connect(g); g.connect(this.master);
      src.start();
    } catch { /* ignore */ }
  }

  // Two-tone police siren while wanted is high; call with the wanted level.
  siren(level) {
    if (!this.ctx) return;
    if (level < 3) {
      if (this.sirenTimer) { clearInterval(this.sirenTimer); this.sirenTimer = null; }
      return;
    }
    if (this.sirenTimer) return;
    let high = false;
    this.sirenTimer = setInterval(() => {
      if (!this.ctx || this.muted) return;
      try {
        const o = this.ctx.createOscillator();
        o.type = 'sine';
        o.frequency.value = high ? 920 : 660;
        high = !high;
        const g = this.ctx.createGain();
        g.gain.value = 0.05;
        o.connect(g); g.connect(this.master);
        o.start();
        o.stop(this.ctx.currentTime + 0.42);
      } catch { /* ignore */ }
    }, 450);
  }

  blip(freq = 660) {
    if (!this.ctx) return;
    try {
      const o = this.ctx.createOscillator();
      o.type = 'square';
      o.frequency.value = freq;
      const g = this.ctx.createGain();
      g.gain.value = 0.08;
      o.connect(g); g.connect(this.master);
      o.start();
      o.stop(this.ctx.currentTime + 0.09);
    } catch { /* ignore */ }
  }

  setMuted(m) {
    this.muted = m;
    if (this.master) this.master.gain.value = m ? 0 : 0.5;
  }
}
