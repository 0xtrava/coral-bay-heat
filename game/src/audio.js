// Coral Bay Heat (rebuild v19) — tiny WebAudio synth.
// Engine hum, pickup blips, gunshots and a two-tone siren, all synthesized
// so the game ships no audio files. Everything is guarded: if the browser
// has no audio (or the tab is headless) the game simply stays silent.

let ctx = null;
let engineOsc = null;
let engineGain = null;
let muted = false;

function ensure() {
  if (ctx) return ctx;
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    engineOsc = ctx.createOscillator();
    engineOsc.type = 'sawtooth';
    engineOsc.frequency.value = 55;
    engineGain = ctx.createGain();
    engineGain.gain.value = 0;
    const filt = ctx.createBiquadFilter();
    filt.type = 'lowpass';
    filt.frequency.value = 420;
    engineOsc.connect(filt);
    filt.connect(engineGain);
    engineGain.connect(ctx.destination);
    engineOsc.start();
  } catch {
    ctx = null;
  }
  return ctx;
}

export function initAudio() {
  ensure();
}

export function setMuted(m) {
  muted = m;
  if (engineGain) engineGain.gain.value = 0;
}

export function engineNote(speedNorm) {
  if (muted || !engineGain || !engineOsc || !ctx) return;
  if (ctx.state === 'suspended') return;
  engineOsc.frequency.value = 48 + speedNorm * 130;
  engineGain.gain.value = 0.015 + speedNorm * 0.03;
}

function blip(freq, dur, type = 'sine', vol = 0.08) {
  if (muted) return;
  const c = ensure();
  if (!c || c.state === 'suspended') return;
  try {
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(vol, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur);
    o.connect(g);
    g.connect(c.destination);
    o.start();
    o.stop(c.currentTime + dur);
  } catch { /* silent */ }
}

export function pickupSound() { blip(880, 0.18, 'sine', 0.09); setTimeout(() => blip(1320, 0.22, 'sine', 0.09), 90); }
export function shotSound() { blip(180, 0.12, 'square', 0.07); }
export function crashSound() { blip(70, 0.3, 'sawtooth', 0.1); }
export function sirenBlip() { blip(740, 0.25, 'triangle', 0.04); setTimeout(() => blip(560, 0.25, 'triangle', 0.04), 260); }
export function cashSound() { blip(1040, 0.12, 'sine', 0.08); setTimeout(() => blip(1560, 0.2, 'sine', 0.08), 110); }
