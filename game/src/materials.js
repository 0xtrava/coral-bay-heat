// Coral Bay Heat (rebuild v19) — palette + procedural canvas textures.
// Every texture is painted in code so the city ships with zero image assets.
// The look: warm dusk pastels, lit windows, hand-painted signs.

import * as THREE from 'three';

export const PALETTE = {
  heroOrange: 0xff6a00,
  sunGold: 0xffb347,
  duskPink: 0xff5e8a,
  duskPurple: 0x7b2fbe,
  duskDeep: 0x2c1445,
  roadDark: 0x33313d,
  roadLine: 0xf5d76e,
  walkLight: 0x9a8f7a,
  sandWarm: 0xe8c98f,
  seaBlue: 0x1f7fa8,
  seaDeep: 0x155a7d,
  grassGreen: 0x4d7a4a,
  policeWhite: 0xf2f2ee,
  policeNavy: 0x1d2f55,
};

export const FACADE_COLORS = [
  0xe8a87c, 0xf2c48d, 0xd98c7a, 0x8fb8a8, 0xc9a0c8,
  0xe6b8a2, 0x9ab8d9, 0xf0d9a8, 0xb98a6e, 0x7fb3a3,
];

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return [c, c.getContext('2d')];
}

function toTexture(canvas, repeatX = 1, repeatY = 1) {
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// A building face: warm plaster, a grid of windows, some glowing amber.
export function facadeTexture(baseHex, rng, litRatio = 0.45) {
  const [c, g] = makeCanvas(128, 256);
  const base = '#' + baseHex.toString(16).padStart(6, '0');
  g.fillStyle = base;
  g.fillRect(0, 0, 128, 256);
  // subtle plaster shading
  for (let i = 0; i < 40; i++) {
    g.fillStyle = `rgba(0,0,0,${0.02 + rng() * 0.05})`;
    g.fillRect(rng() * 128, rng() * 256, 6 + rng() * 20, 4 + rng() * 10);
  }
  // cornice + base band
  g.fillStyle = 'rgba(0,0,0,0.18)';
  g.fillRect(0, 0, 128, 10);
  g.fillStyle = 'rgba(255,255,255,0.10)';
  g.fillRect(0, 246, 128, 10);
  // windows
  const cols = 4, rows = 8;
  const cw = 128 / cols, ch = 256 / rows;
  for (let r = 0; r < rows; r++) {
    for (let col = 0; col < cols; col++) {
      const x = col * cw + 6, y = r * ch + 8;
      const lit = rng() < litRatio;
      g.fillStyle = lit ? '#ffd98a' : '#2e3440';
      if (lit) {
        g.shadowColor = '#ffb347'; g.shadowBlur = 8;
      }
      g.fillRect(x, y, cw - 12, ch - 16);
      g.shadowBlur = 0;
      g.fillStyle = 'rgba(255,255,255,0.25)';
      g.fillRect(x, y, cw - 12, 3);
    }
  }
  return toTexture(c);
}

// Asphalt with a dashed centre line and worn edges.
export function roadTexture() {
  const [c, g] = makeCanvas(128, 128);
  g.fillStyle = '#33313d';
  g.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 220; i++) {
    g.fillStyle = `rgba(255,255,255,${0.015 + Math.random() * 0.03})`;
    g.fillRect(Math.random() * 128, Math.random() * 128, 2, 2);
  }
  g.fillStyle = '#f5d76e';
  g.fillRect(60, 0, 8, 44);
  g.fillRect(60, 84, 8, 44);
  g.fillStyle = 'rgba(255,255,255,0.35)';
  g.fillRect(4, 0, 3, 128);
  g.fillRect(121, 0, 3, 128);
  return toTexture(c, 1, 6);
}

// Warm sand with speckles and soft ripples.
export function sandTexture() {
  const [c, g] = makeCanvas(128, 128);
  g.fillStyle = '#e8c98f';
  g.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 500; i++) {
    const warm = Math.random() < 0.5;
    g.fillStyle = warm ? 'rgba(190,140,80,0.25)' : 'rgba(255,240,200,0.3)';
    g.fillRect(Math.random() * 128, Math.random() * 128, 2, 2);
  }
  g.strokeStyle = 'rgba(190,140,80,0.18)';
  for (let i = 0; i < 8; i++) {
    g.beginPath();
    const y = Math.random() * 128;
    g.moveTo(0, y);
    g.bezierCurveTo(40, y + 8, 80, y - 8, 128, y + 4);
    g.stroke();
  }
  return toTexture(c, 8, 8);
}

// A lit shop / hotel sign board. Text is painted big and crisp.
export function signTexture(text, sub, bgHex, fgHex) {
  const [c, g] = makeCanvas(512, 128);
  g.fillStyle = bgHex;
  g.fillRect(0, 0, 512, 128);
  g.strokeStyle = fgHex;
  g.lineWidth = 6;
  g.strokeRect(6, 6, 500, 116);
  g.fillStyle = fgHex;
  g.font = 'bold 56px Arial, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(text, 256, sub ? 52 : 64);
  if (sub) {
    g.font = 'bold 26px Arial, sans-serif';
    g.fillText(sub, 256, 100);
  }
  return toTexture(c);
}

// Soft radial glow used for the sun halo, lamp glows and the heli light pool.
export function glowTexture(inner, outer) {
  const [c, g] = makeCanvas(128, 128);
  const grad = g.createRadialGradient(64, 64, 4, 64, 64, 62);
  grad.addColorStop(0, inner);
  grad.addColorStop(0.45, outer);
  grad.addColorStop(1, 'rgba(255,180,80,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  return toTexture(c);
}

// A puffy dusk cloud, painted soft so it reads at a distance.
export function cloudTexture(rng) {
  const [c, g] = makeCanvas(256, 128);
  for (let i = 0; i < 14; i++) {
    const x = 30 + rng() * 196, y = 45 + rng() * 40, r = 18 + rng() * 26;
    const grad = g.createRadialGradient(x, y, 2, x, y, r);
    grad.addColorStop(0, 'rgba(255,205,220,0.55)');
    grad.addColorStop(1, 'rgba(255,205,220,0)');
    g.fillStyle = grad;
    g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
  }
  return toTexture(c);
}

// Small painted portrait for crew / fixer cards (canvas face, no photo assets).
export function portraitTexture(kind) {
  const [c, g] = makeCanvas(96, 96);
  const skins = { mara: '#f0c8a0', mira: '#e8b88a', lio: '#d9a06f', kiki: '#f0c8a0' };
  const hairs = { mara: '#20222e', mira: '#3a2418', lio: '#101014', kiki: '#7a3b1e' };
  g.fillStyle = '#2c1445';
  g.fillRect(0, 0, 96, 96);
  g.fillStyle = skins[kind] || '#e8b88a';
  g.beginPath(); g.arc(48, 46, 24, 0, Math.PI * 2); g.fill();
  g.fillStyle = hairs[kind] || '#20222e';
  g.beginPath(); g.arc(48, 36, 24, Math.PI, 0); g.fill();
  if (kind === 'mara') {
    g.fillStyle = '#c02040';
    g.fillRect(24, 30, 48, 8);
  }
  if (kind === 'kiki') {
    g.fillStyle = '#ffd24d';
    g.beginPath(); g.arc(48, 18, 8, 0, Math.PI * 2); g.fill();
  }
  if (kind === 'lio') {
    g.fillStyle = '#3a3f4a';
    g.fillRect(26, 40, 44, 6);
  }
  g.fillStyle = '#20222e';
  g.beginPath(); g.arc(39, 46, 3, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.arc(57, 46, 3, 0, Math.PI * 2); g.fill();
  g.strokeStyle = '#a05a3a';
  g.lineWidth = 2;
  g.beginPath(); g.arc(48, 58, 8, 0.15 * Math.PI, 0.85 * Math.PI); g.stroke();
  // shoulders / jacket
  g.fillStyle = kind === 'mira' ? '#2f6fb2' : kind === 'lio' ? '#3f7a4a' : '#7a2f5e';
  g.beginPath(); g.moveTo(14, 96); g.quadraticCurveTo(48, 62, 82, 96); g.closePath(); g.fill();
  return toTexture(c);
}

// Tiny weapon pictograms drawn as canvas sprites for the HUD slots.
export function weaponIconTexture(kind) {
  const [c, g] = makeCanvas(64, 64);
  g.clearRect(0, 0, 64, 64);
  g.strokeStyle = '#f2f2ee';
  g.fillStyle = '#f2f2ee';
  g.lineWidth = 5;
  g.lineCap = 'round';
  if (kind === 'fists') {
    g.beginPath(); g.arc(24, 34, 12, 0, Math.PI * 2); g.stroke();
    g.beginPath(); g.arc(42, 30, 11, 0, Math.PI * 2); g.stroke();
  } else if (kind === 'pistol') {
    g.beginPath();
    g.moveTo(12, 26); g.lineTo(48, 26); g.lineTo(48, 34); g.lineTo(26, 34);
    g.lineTo(24, 48); g.lineTo(16, 48); g.lineTo(18, 34); g.closePath();
    g.fill();
  } else if (kind === 'smg') {
    g.fillRect(8, 26, 44, 8);
    g.fillRect(20, 34, 8, 16);
    g.fillRect(40, 30, 14, 5);
  } else {
    g.fillRect(8, 24, 40, 10);
    g.fillRect(44, 27, 12, 4);
    g.fillRect(20, 34, 9, 16);
  }
  return toTexture(c);
}

export function lambert(color, opts = {}) {
  return new THREE.MeshLambertMaterial({ color, ...opts });
}

export function lambertMap(map, opts = {}) {
  return new THREE.MeshLambertMaterial({ map, ...opts });
}
