// Shared look for Coral Bay Heat: the sunset palette and every canvas
// texture the city paints with. All art is generated here at runtime from
// plain canvas 2D, so the game ships no image files and loads nothing
// over the network.
import * as THREE from 'three';

// The island at dusk: warm walls, teal glass, orange sun, violet sky.
export const PALETTE = {
  skyTop: '#5b2a86',
  skyMid: '#c65b7c',
  skyLow: '#ff9e57',
  sun: '#ffd97a',
  sunCore: '#fff3c4',
  sea: '#1e7fa8',
  seaDeep: '#14607f',
  sand: '#e8c88f',
  sandDark: '#d9b478',
  road: '#3a3a44',
  roadLine: '#ffd34d',
  sidewalk: '#8a7f72',
  grass: '#3f7d4e',
  wallPink: '#e88ca0',
  wallPeach: '#f2b28c',
  wallCream: '#f4e3c2',
  wallTerra: '#d98a5f',
  wallTeal: '#7fb5a8',
  wallLavender: '#b9a7d6',
  wallYellow: '#f2d38c',
  glassDay: '#9fd8e8',
  glassLit: '#ffd98a',
  heroOrange: 0xff6a00,
  policeWhite: '#f2f2ee',
  policeBlue: '#1c3a6e',
};

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}

export function canvasTexture(canvas) {
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

// A building face: warm plaster, a grid of windows (some lit gold, some
// cool glass), a darker ground floor with a shopfront band.
export function facadeTexture(base, litRatio, rng) {
  const c = makeCanvas(256, 256);
  const g = c.getContext('2d');
  g.fillStyle = base;
  g.fillRect(0, 0, 256, 256);
  // faint plaster variation
  for (let i = 0; i < 40; i++) {
    g.fillStyle = rng.chance(0.5) ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
    g.fillRect(rng.range(0, 256), rng.range(0, 256), rng.range(8, 40), rng.range(8, 40));
  }
  // window grid
  const cols = 5, rows = 7;
  const cw = 256 / cols, ch = 256 / rows;
  for (let x = 0; x < cols; x++) {
    for (let y = 0; y < rows; y++) {
      const lit = rng.chance(litRatio);
      g.fillStyle = lit ? PALETTE.glassLit : PALETTE.glassDay;
      g.fillRect(x * cw + 9, y * ch + 10, cw - 18, ch - 20);
      g.fillStyle = 'rgba(0,0,0,0.35)';
      g.fillRect(x * cw + 9, y * ch + 10, cw - 18, 3);
      if (lit && rng.chance(0.4)) {
        g.fillStyle = 'rgba(120,60,20,0.5)';
        g.fillRect(x * cw + 9, y * ch + ch - 22, cw - 18, 4);
      }
    }
  }
  // ground floor shopfront band
  g.fillStyle = 'rgba(30,20,30,0.55)';
  g.fillRect(0, 224, 256, 32);
  g.fillStyle = '#ffd98a';
  g.fillRect(12, 232, 60, 16);
  g.fillRect(180, 232, 64, 16);
  return canvasTexture(c);
}

// A rooftop / wall sign: big readable letters on a dark board.
export function signTexture(text, sub, fg, bg) {
  const c = makeCanvas(512, 128);
  const g = c.getContext('2d');
  g.fillStyle = bg;
  g.fillRect(0, 0, 512, 128);
  g.strokeStyle = fg;
  g.lineWidth = 6;
  g.strokeRect(6, 6, 500, 116);
  g.fillStyle = fg;
  g.font = 'bold 56px Arial, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(text, 256, sub ? 52 : 64);
  if (sub) {
    g.font = 'bold 26px Arial, sans-serif';
    g.fillText(sub, 256, 100);
  }
  return canvasTexture(c);
}

// Striped awning (market stalls, beach bars).
export function awningTexture(colorA, colorB) {
  const c = makeCanvas(128, 64);
  const g = c.getContext('2d');
  for (let i = 0; i < 8; i++) {
    g.fillStyle = i % 2 === 0 ? colorA : colorB;
    g.fillRect(i * 16, 0, 16, 64);
  }
  g.fillStyle = 'rgba(0,0,0,0.18)';
  for (let i = 0; i < 8; i += 2) g.fillRect(i * 16, 0, 3, 64);
  return canvasTexture(c);
}

// Asphalt with a dashed centre line, tiled along a road segment.
export function roadTexture() {
  const c = makeCanvas(128, 128);
  const g = c.getContext('2d');
  g.fillStyle = PALETTE.road;
  g.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 200; i++) {
    g.fillStyle = Math.random() < 0.5 ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.06)';
    g.fillRect(Math.random() * 128, Math.random() * 128, 2, 2);
  }
  g.fillStyle = PALETTE.roadLine;
  g.fillRect(60, 8, 8, 44);
  g.fillRect(60, 76, 8, 44);
  const t = canvasTexture(c);
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.RepeatWrapping;
  return t;
}

// Sand with speckles and a few darker patches.
export function sandTexture() {
  const c = makeCanvas(256, 256);
  const g = c.getContext('2d');
  g.fillStyle = PALETTE.sand;
  g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 900; i++) {
    g.fillStyle = Math.random() < 0.5 ? 'rgba(180,140,80,0.25)' : 'rgba(255,240,200,0.25)';
    g.fillRect(Math.random() * 256, Math.random() * 256, 2, 2);
  }
  for (let i = 0; i < 12; i++) {
    g.fillStyle = 'rgba(160,120,70,0.12)';
    g.beginPath();
    g.ellipse(Math.random() * 256, Math.random() * 256, 18 + Math.random() * 30, 8 + Math.random() * 14, Math.random() * 3, 0, 7);
    g.fill();
  }
  const t = canvasTexture(c);
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.RepeatWrapping;
  return t;
}

// Sea: deep blue with pale wave streaks.
export function seaTexture() {
  const c = makeCanvas(256, 256);
  const g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 256, 256);
  grad.addColorStop(0, PALETTE.sea);
  grad.addColorStop(1, PALETTE.seaDeep);
  g.fillStyle = grad;
  g.fillRect(0, 0, 256, 256);
  g.strokeStyle = 'rgba(255,255,255,0.16)';
  g.lineWidth = 2;
  for (let i = 0; i < 26; i++) {
    const y = Math.random() * 256;
    g.beginPath();
    g.moveTo(Math.random() * 120, y);
    g.lineTo(120 + Math.random() * 136, y + (Math.random() * 10 - 5));
    g.stroke();
  }
  const t = canvasTexture(c);
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.RepeatWrapping;
  return t;
}

// The sunset sky: vertical gradient purple -> rose -> orange, painted
// once and wrapped around a big dome.
export function skyTexture() {
  const c = makeCanvas(64, 512);
  const g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 0, 512);
  grad.addColorStop(0.0, '#3d1a63');
  grad.addColorStop(0.35, PALETTE.skyTop);
  grad.addColorStop(0.62, PALETTE.skyMid);
  grad.addColorStop(0.82, PALETTE.skyLow);
  grad.addColorStop(1.0, '#ffb26b');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 512);
  return canvasTexture(c);
}

// A soft round glow (sun halo, light pool, muzzle flash sprite).
export function glowTexture(inner, outer) {
  const c = makeCanvas(128, 128);
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(64, 64, 4, 64, 64, 62);
  grad.addColorStop(0, inner);
  grad.addColorStop(0.55, outer);
  grad.addColorStop(1, 'rgba(255,180,90,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  return canvasTexture(c);
}

// A licence plate: white board, dark letters.
export function plateTexture(text) {
  const c = makeCanvas(256, 64);
  const g = c.getContext('2d');
  g.fillStyle = '#f4f0e2';
  g.fillRect(0, 0, 256, 64);
  g.strokeStyle = '#222';
  g.lineWidth = 4;
  g.strokeRect(3, 3, 250, 58);
  g.fillStyle = '#1a2a6e';
  g.font = 'bold 34px Arial, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(text, 128, 34);
  return canvasTexture(c);
}
