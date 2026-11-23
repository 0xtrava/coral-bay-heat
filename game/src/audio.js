// Sound for Coral Bay Heat — all WebAudio, all guarded. Nothing here
// may throw: if the browser has no AudioContext (or the user has not
// interacted yet), every call becomes a silent no-op and the game goes on.
// The engine hum is one oscillator whose pitch follows speed; the radio
// is a soft pad chord per station; gunshots are short noise bursts.
import { RADIO_STATIONS } from './missions.js';

const STATION_ROOTS = [110, 98, 130.8, 87.3]; // A2, G2, C3, F2

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.engineOsc = null;
    this.engineGain = null;
    this.radioGain = null;
    this.radioOscs = [];
    this.station = 0;
    this.muted = false;
  }

  // Call from the first user gesture (or the first keydown). Safe to
  // call repeatedly; it only builds the graph once.
  ensure() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
      return true;
    }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      this.ctx = new AC();
      // Engine: a low sawtooth through a gentle lowpass.
      this.engineOsc = this.ctx.createOscillator();
      this.engineOsc.type = 'sawtooth';
      this.engineOsc.frequency.value = 55;
      this.engineGain = this.ctx.createGain();
      this.engineGain.gain.value = 0.0;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 420;
      this.engineOsc.connect(filter);
      filter.connect(this.engineGain);
      this.engineGain.connect(this.ctx.destination);
      this.engineOsc.start();
      // Radio: a quiet pad — root + fifth + octave, one chord per station.
      this.radioGain = this.ctx.createGain();
      this.radioGain.gain.value = 0.0;
      this.radioGain.connect(this.ctx.destination);
      this.startRadioChord(0);
      return true;
    } catch (e) {
      this.ctx = null;
      return false;
    }
  }

  startRadioChord(station) {
    if (!this.ctx) return;
    for (const o of this.radioOscs) { try { o.stop(); } catch (e) {} }
    this.radioOscs = [];
    const root = STATION_ROOTS[station % STATION_ROOTS.length];
    for (const mult of [1, 1.5, 2]) {
      const o = this.ctx.createOscillator();
      o.type = 'triangle';
      o.frequency.value = root * mult;
      const g = this.ctx.createGain();
      g.gain.value = 0.05;
      o.connect(g);
      g.connect(this.radioGain);
      o.start();
      this.radioOscs.push(o);
    }
  }

  // Engine pitch + volume follow the car's speed (0..42 units/s).
  setEngine(speed, onFoot) {
    if (!this.ctx || !this.engineOsc) return;
    const t = this.ctx.currentTime;
    const target = onFoot ? 0 : Math.min(0.12, 0.02 + Math.abs(speed) * 0.0025);
    this.engineGain.gain.setTargetAtTime(target, t, 0.1);
    this.engineOsc.frequency.setTargetAtTime(55 + Math.abs(speed) * 2.4, t, 0.1);
  }

  setRadioOn(on) {
    if (!this.ctx || !this.radioGain) return;
    this.radioGain.gain.setTargetAtTime(on && !this.muted ? 0.5 : 0.0, this.ctx.currentTime, 0.2);
  }

  nextStation() {
    this.station = (this.station + 1) % RADIO_STATIONS.length;
    if (this.ctx) this.startRadioChord(this.station);
    return RADIO_STATIONS[this.station];
  }

  gunshot() {
    if (!this.ctx || this.muted) return;
    try {
      const dur = 0.14;
      const buffer = this.ctx.createBuffer(1, this.ctx.sampleRate * dur, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) {
        data[i] = (Math.random() * 2 - 1) * (1 - i / data.length) * 0.7;
      }
      const src = this.ctx.createBufferSource();
      src.buffer = buffer;
      const gain = this.ctx.createGain();
      gain.gain.value = 0.35;
      src.connect(gain);
      gain.connect(this.ctx.destination);
      src.start();
    } catch (e) {}
  }

  crash() {
    if (!this.ctx || this.muted) return;
    try {
      const o = this.ctx.createOscillator();
      o.type = 'square';
      o.frequency.setValueAtTime(90, this.ctx.currentTime);
      o.frequency.exponentialRampToValueAtTime(30, this.ctx.currentTime + 0.3);
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.25, this.ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.35);
      o.connect(g);
      g.connect(this.ctx.destination);
      o.start();
      o.stop(this.ctx.currentTime + 0.35);
    } catch (e) {}
  }
}
