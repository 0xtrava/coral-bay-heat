// Coral Bay Heat — procedural canvas textures. Everything is drawn, nothing
// is loaded from disk: asphalt grain, concrete, sand, ocean, sky, signs and
// the little crew portraits. Deterministic (seeded) so every run looks the same.
import * as THREE from 'three';

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return [c, c.getContext('2d')];
}

export function asphaltTexture() {
  const [c, g] = canvas(512, 512);
  const rnd = mulberry32(4107);
  g.fillStyle = '#4a4b52'; g.fillRect(0, 0, 512, 512);
  // large soft tonal variation
  for (let i = 0; i < 46; i++) {
    const x = rnd() * 512, y = rnd() * 512, r = 30 + rnd() * 90;
    const grad = g.createRadialGradient(x, y, 0, x, y, r);
    const dark = rnd() > 0.5;
    grad.addColorStop(0, dark ? 'rgba(18,18,22,0.20)' : 'rgba(78,80,90,0.16)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grad; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
  }
  // speckle grain
  for (let i = 0; i < 9000; i++) {
    const v = rnd();
    g.fillStyle = v > 0.66 ? 'rgba(210,210,215,0.10)' : v > 0.33 ? 'rgba(12,12,14,0.16)' : 'rgba(90,92,100,0.10)';
    g.fillRect(rnd() * 512, rnd() * 512, 1 + rnd() * 2, 1 + rnd() * 2);
  }
  // patched repair rectangles with soft edges
  for (let i = 0; i < 7; i++) {
    const x = rnd() * 400, y = rnd() * 400, w = 60 + rnd() * 90, h = 40 + rnd() * 70;
    g.fillStyle = 'rgba(22,22,26,0.35)';
    g.fillRect(x, y, w, h);
    g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = 2;
    g.strokeRect(x, y, w, h);
  }
  // hairline cracks
  g.strokeStyle = 'rgba(10,10,12,0.5)'; g.lineWidth = 1;
  for (let i = 0; i < 14; i++) {
    let x = rnd() * 512, y = rnd() * 512;
    g.beginPath(); g.moveTo(x, y);
    for (let s = 0; s < 6; s++) { x += (rnd() - 0.5) * 44; y += (rnd() - 0.5) * 44; g.lineTo(x, y); }
    g.stroke();
  }
  // faint tyre polish bands
  for (const bx of [150, 362]) {
    const grad = g.createLinearGradient(bx - 26, 0, bx + 26, 0);
    grad.addColorStop(0, 'rgba(0,0,0,0)'); grad.addColorStop(0.5, 'rgba(8,8,10,0.20)'); grad.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grad; g.fillRect(bx - 26, 0, 52, 512);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

export function sidewalkTexture() {
  const [c, g] = canvas(256, 256);
  const rnd = mulberry32(991);
  g.fillStyle = '#b8a88f'; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 2600; i++) {
    g.fillStyle = rnd() > 0.5 ? 'rgba(90,70,50,0.12)' : 'rgba(255,240,210,0.10)';
    g.fillRect(rnd() * 256, rnd() * 256, 2, 2);
  }
  // paving joints
  g.strokeStyle = 'rgba(70,55,40,0.55)'; g.lineWidth = 2;
  for (let i = 0; i <= 4; i++) {
    g.beginPath(); g.moveTo(0, i * 64); g.lineTo(256, i * 64); g.stroke();
    g.beginPath(); g.moveTo(i * 64, 0); g.lineTo(i * 64, 256); g.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

export function sandTexture() {
  const [c, g] = canvas(512, 512);
  const rnd = mulberry32(20240);
  g.fillStyle = '#e8c98f'; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 30; i++) {
    const x = rnd() * 512, y = rnd() * 512, r = 26 + rnd() * 70;
    const grad = g.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, rnd() > 0.5 ? 'rgba(240,210,150,0.35)' : 'rgba(190,150,95,0.30)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grad; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
  }
  for (let i = 0; i < 7000; i++) {
    g.fillStyle = rnd() > 0.5 ? 'rgba(120,90,50,0.14)' : 'rgba(255,235,190,0.14)';
    g.fillRect(rnd() * 512, rnd() * 512, 1.6, 1.6);
  }
  // footprints: little paired dots wandering
  g.fillStyle = 'rgba(150,115,70,0.35)';
  for (let i = 0; i < 26; i++) {
    let x = rnd() * 512, y = rnd() * 512, a = rnd() * 6.28;
    for (let s = 0; s < 9; s++) {
      x += Math.cos(a) * 9; y += Math.sin(a) * 9;
      g.beginPath(); g.ellipse(x, y, 3, 4.5, a, 0, 7); g.fill();
      g.beginPath(); g.ellipse(x + 5, y + 3, 3, 4.5, a, 0, 7); g.fill();
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

export function oceanTexture() {
  const [c, g] = canvas(512, 512);
  const rnd = mulberry32(777);
  const grad = g.createLinearGradient(0, 0, 512, 512);
  grad.addColorStop(0, '#19b8c9'); grad.addColorStop(0.5, '#0e8fb8'); grad.addColorStop(1, '#0a6f9e');
  g.fillStyle = grad; g.fillRect(0, 0, 512, 512);
  // wave streaks
  for (let i = 0; i < 90; i++) {
    const x = rnd() * 512, y = rnd() * 512, len = 20 + rnd() * 60;
    g.strokeStyle = `rgba(255,255,255,${0.05 + rnd() * 0.13})`;
    g.lineWidth = 1 + rnd() * 2;
    g.beginPath(); g.moveTo(x, y);
    g.quadraticCurveTo(x + len / 2, y + (rnd() - 0.5) * 10, x + len, y + (rnd() - 0.5) * 6);
    g.stroke();
  }
  for (let i = 0; i < 500; i++) {
    g.fillStyle = `rgba(255,255,255,${0.05 + rnd() * 0.12})`;
    g.fillRect(rnd() * 512, rnd() * 512, 2, 1.4);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

export function skyTexture() {
  // vertical sunset gradient, drawn wide so it wraps the sky dome
  const [c, g] = canvas(1024, 512);
  const grad = g.createLinearGradient(0, 0, 0, 512);
  grad.addColorStop(0.00, '#2c3a72');
  grad.addColorStop(0.34, '#5a5a9e');
  grad.addColorStop(0.55, '#c65f7e');
  grad.addColorStop(0.72, '#f07f4e');
  grad.addColorStop(0.86, '#ffb347');
  grad.addColorStop(1.00, '#ffd98a');
  g.fillStyle = grad; g.fillRect(0, 0, 1024, 512);
  const rnd = mulberry32(31337);
  // thin warm cloud bands
  for (let i = 0; i < 26; i++) {
    const y = 60 + rnd() * 300, x = rnd() * 1024, w = 120 + rnd() * 260;
    const cg = g.createLinearGradient(x, 0, x + w, 0);
    cg.addColorStop(0, 'rgba(255,220,190,0)');
    cg.addColorStop(0.5, `rgba(255,225,200,${0.10 + rnd() * 0.16})`);
    cg.addColorStop(1, 'rgba(255,220,190,0)');
    g.fillStyle = cg;
    g.fillRect(x, y, w, 5 + rnd() * 10);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function sunGlowTexture() {
  const [c, g] = canvas(256, 256);
  const grad = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  grad.addColorStop(0, 'rgba(255,246,214,1)');
  grad.addColorStop(0.22, 'rgba(255,214,130,0.95)');
  grad.addColorStop(0.45, 'rgba(255,158,80,0.55)');
  grad.addColorStop(0.75, 'rgba(255,120,60,0.18)');
  grad.addColorStop(1, 'rgba(255,110,50,0)');
  g.fillStyle = grad; g.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function cloudTexture() {
  const [c, g] = canvas(256, 128);
  const rnd = mulberry32(5150);
  for (let i = 0; i < 26; i++) {
    const x = 40 + rnd() * 176, y = 45 + rnd() * 40, r = 14 + rnd() * 26;
    const grad = g.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, 'rgba(255,244,230,0.55)');
    grad.addColorStop(1, 'rgba(255,244,230,0)');
    g.fillStyle = grad; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function signTexture(lines, opts = {}) {
  const w = opts.w || 512, h = opts.h || 128;
  const [c, g] = canvas(w, h);
  g.fillStyle = opts.bg || '#12324a'; g.fillRect(0, 0, w, h);
  g.strokeStyle = opts.border || '#ffd76a'; g.lineWidth = 6;
  g.strokeRect(6, 6, w - 12, h - 12);
  g.fillStyle = opts.fg || '#ffffff';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  const n = lines.length;
  lines.forEach((ln, i) => {
    g.font = `bold ${Math.floor(h / (n + 1.1))}px Arial`;
    g.fillText(ln, w / 2, h * (i + 0.75) / (n + 0.5));
  });
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

// Blocky crew / fixer portraits, drawn on a 2D canvas.
export function drawPortrait(cv, who) {
  const g = cv.getContext('2d');
  const W = cv.width, H = cv.height;
  const pal = {
    mara: { bg: '#7a2d4d', skin: '#e8b98a', hair: '#241722', top: '#37e0c8', accent: '#ffd76a' },
    mira: { bg: '#12324a', skin: '#f0c49a', hair: '#3a1f0d', top: '#ff5d8f', accent: '#7dff9a' },
    lio: { bg: '#2d4a1f', skin: '#c98d5f', hair: '#101010', top: '#ffb62e', accent: '#6ad8ff' },
    kiki: { bg: '#4a2d5e', skin: '#f2cfa4', hair: '#d8b13a', top: '#9d7bff', accent: '#ff9d2e' },
  }[who] || { bg: '#333', skin: '#e8b98a', hair: '#222', top: '#888', accent: '#fff' };
  g.fillStyle = pal.bg; g.fillRect(0, 0, W, H);
  // shoulders
  g.fillStyle = pal.top;
  g.beginPath(); g.moveTo(W * 0.08, H); g.quadraticCurveTo(W * 0.2, H * 0.62, W * 0.5, H * 0.62);
  g.quadraticCurveTo(W * 0.8, H * 0.62, W * 0.92, H); g.closePath(); g.fill();
  // neck + head
  g.fillStyle = pal.skin;
  g.fillRect(W * 0.44, H * 0.52, W * 0.12, H * 0.16);
  g.beginPath(); g.arc(W * 0.5, H * 0.38, W * 0.21, 0, 7); g.fill();
  // hair
  g.fillStyle = pal.hair;
  g.beginPath(); g.arc(W * 0.5, H * 0.32, W * 0.215, Math.PI, 0); g.fill();
  g.fillRect(W * 0.29, H * 0.28, W * 0.06, H * 0.2);
  g.fillRect(W * 0.65, H * 0.28, W * 0.06, H * 0.2);
  if (who === 'kiki') { // blonde bob
    g.fillRect(W * 0.27, H * 0.3, W * 0.09, H * 0.26);
    g.fillRect(W * 0.64, H * 0.3, W * 0.09, H * 0.26);
  }
  if (who === 'lio') { // cap
    g.fillStyle = pal.accent; g.fillRect(W * 0.28, H * 0.2, W * 0.44, H * 0.07);
    g.fillRect(W * 0.28, H * 0.26, W * 0.52, H * 0.04);
  }
  // eyes + smile
  g.fillStyle = '#1c1c22';
  g.fillRect(W * 0.39, H * 0.37, W * 0.05, H * 0.03);
  g.fillRect(W * 0.56, H * 0.37, W * 0.05, H * 0.03);
  g.strokeStyle = '#7a3a28'; g.lineWidth = 2;
  g.beginPath(); g.arc(W * 0.5, H * 0.46, W * 0.06, 0.15 * Math.PI, 0.85 * Math.PI); g.stroke();
  // accent dot (earring / badge)
  g.fillStyle = pal.accent;
  g.beginPath(); g.arc(W * 0.72, H * 0.44, 3, 0, 7); g.fill();
}
