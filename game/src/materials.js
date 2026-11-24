// Shared look for Coral Bay Heat: the sunset palette and every canvas
// texture the city paints with. All art is generated here at runtime from
// plain canvas 2D, so the game ships no image files and loads nothing
// over the network.
import * as THREE from 'three';

// The island at golden hour: warm walls, teal glass, orange sun, a
// dusky-blue sky that stays bright — no purple wash over the city.
export const PALETTE = {
  skyTop: '#4a5a9e',
  skyMid: '#d96a7a',
  skyLow: '#ff9e57',
  sun: '#ffd97a',
  sunCore: '#fff3c4',
  sea: '#1e7fa8',
  seaDeep: '#14607f',
  sand: '#e8c88f',
  sandDark: '#d9b478',
  road: '#55555f',
  roadLine: '#ffd34d',
  sidewalk: '#a89a8a',
  grass: '#3f7d4e',
  wallPink: '#f28aa8',
  wallPeach: '#f7b98a',
  wallCream: '#f4e3c2',
  wallTerra: '#e08a52',
  wallTeal: '#6fb5a8',
  wallLavender: '#b39ad9',
  wallYellow: '#f7d67a',
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

// A building face: warm plaster, a grid of framed windows (some lit
// gold, some cool glass, each with a frame and a mullion cross), a
// darker roofline band and a ground floor with a shopfront band.
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
  // roofline band
  g.fillStyle = 'rgba(0,0,0,0.28)';
  g.fillRect(0, 0, 256, 10);
  g.fillStyle = 'rgba(255,255,255,0.12)';
  g.fillRect(0, 10, 256, 3);
  // window grid
  const cols = 5, rows = 7;
  const cw = 256 / cols, ch = 256 / rows;
  for (let x = 0; x < cols; x++) {
    for (let y = 0; y < rows; y++) {
      const lit = rng.chance(litRatio);
      const wx = x * cw + 9, wy = y * ch + 10, ww = cw - 18, wh = ch - 20;
      g.fillStyle = lit ? PALETTE.glassLit : PALETTE.glassDay;
      g.fillRect(wx, wy, ww, wh);
      // frame + mullion cross so each window reads as a window, not a flat tile
      g.strokeStyle = 'rgba(0,0,0,0.55)';
      g.lineWidth = 2;
      g.strokeRect(wx, wy, ww, wh);
      g.beginPath();
      g.moveTo(wx + ww / 2, wy); g.lineTo(wx + ww / 2, wy + wh);
      g.moveTo(wx, wy + wh / 2); g.lineTo(wx + ww, wy + wh / 2);
      g.stroke();
      g.fillStyle = 'rgba(0,0,0,0.35)';
      g.fillRect(wx, wy, ww, 3);
      if (lit && rng.chance(0.4)) {
        g.fillStyle = 'rgba(120,60,20,0.5)';
        g.fillRect(wx, wy + wh - 12, ww, 4);
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
// Real asphalt, not flat grey: a warm dark base, fine aggregate
// grain, a few pebbles, hairline cracks, darker repair patches,
// two darker wheel-track bands where the traffic runs, and a
// slightly worn centre line.
export function roadTexture() {
  const c = makeCanvas(256, 256);
  const g = c.getContext('2d');
  g.fillStyle = PALETTE.road;
  g.fillRect(0, 0, 256, 256);
  // fine aggregate grain: thousands of tiny dots in warm greys
  for (let i = 0; i < 2600; i++) {
    const v = Math.random();
    g.fillStyle = v < 0.4 ? 'rgba(255,255,255,0.05)' : v < 0.75 ? 'rgba(0,0,0,0.08)' : 'rgba(180,150,110,0.06)';
    g.fillRect(Math.random() * 256, Math.random() * 256, 1.6, 1.6);
  }
  // a few larger stones caught in the asphalt
  for (let i = 0; i < 60; i++) {
    g.fillStyle = Math.random() < 0.5 ? 'rgba(200,190,175,0.28)' : 'rgba(40,35,30,0.3)';
    g.beginPath();
    g.arc(Math.random() * 256, Math.random() * 256, 1 + Math.random() * 1.6, 0, 7);
    g.fill();
  }
  // hairline cracks, jagged and dark
  g.strokeStyle = 'rgba(15,12,10,0.5)';
  g.lineWidth = 1;
  for (let i = 0; i < 7; i++) {
    let x = Math.random() * 256, y = Math.random() * 256;
    g.beginPath();
    g.moveTo(x, y);
    for (let s = 0; s < 6; s++) {
      x += (Math.random() - 0.5) * 22;
      y += Math.random() * 16;
      g.lineTo(x, y);
    }
    g.stroke();
  }
  // darker repair patches (rectangles of newer asphalt)
  for (let i = 0; i < 3; i++) {
    g.fillStyle = 'rgba(20,18,16,0.16)';
    const px = Math.random() * 200, py = Math.random() * 200;
    g.fillRect(px, py, 30 + Math.random() * 30, 18 + Math.random() * 22);
  }
  // wheel-track bands: two darker strips where the traffic runs
  g.fillStyle = 'rgba(0,0,0,0.10)';
  g.fillRect(38, 0, 26, 256);
  g.fillRect(192, 0, 26, 256);
  // edge wear: a slightly lighter band along each edge
  g.fillStyle = 'rgba(255,255,255,0.05)';
  g.fillRect(0, 0, 6, 256);
  g.fillRect(250, 0, 6, 256);
  // the dashed centre line, slightly worn at the edges
  g.fillStyle = PALETTE.roadLine;
  g.fillRect(121, 16, 14, 88);
  g.fillRect(121, 152, 14, 88);
  g.fillStyle = 'rgba(20,18,16,0.25)';
  for (let i = 0; i < 24; i++) {
    g.fillRect(121 + Math.random() * 14, 16 + Math.random() * 88, 2, 2);
    g.fillRect(121 + Math.random() * 14, 152 + Math.random() * 88, 2, 2);
  }
  const t = canvasTexture(c);
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.RepeatWrapping;
  return t;
}

// Sand with speckles and a few darker patches — real beach sand:
// a warm base with a soft gradient, fine grain, a few tiny shells
// and pebbles, wind-blown ripples, scattered footprints, and damp
// darker patches.
export function sandTexture() {
  const c = makeCanvas(256, 256);
  const g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, '#e8c88f');
  grad.addColorStop(1, '#d9b478');
  g.fillStyle = grad;
  g.fillRect(0, 0, 256, 256);
  // fine grain: thousands of tiny dots in warm sand tones
  for (let i = 0; i < 2200; i++) {
    const v = Math.random();
    g.fillStyle = v < 0.4 ? 'rgba(180,140,80,0.28)' : v < 0.75 ? 'rgba(255,240,200,0.28)' : 'rgba(150,110,60,0.22)';
    g.fillRect(Math.random() * 256, Math.random() * 256, 1.6, 1.6);
  }
  // tiny shells and pebbles: pale flecks
  for (let i = 0; i < 40; i++) {
    g.fillStyle = Math.random() < 0.6 ? 'rgba(255,250,235,0.7)' : 'rgba(120,110,100,0.5)';
    g.beginPath();
    g.arc(Math.random() * 256, Math.random() * 256, 1 + Math.random() * 1.4, 0, 7);
    g.fill();
  }
  // wind-blown ripples: soft wavy horizontal lines
  g.strokeStyle = 'rgba(160,120,70,0.14)';
  g.lineWidth = 2;
  for (let i = 0; i < 14; i++) {
    const y = Math.random() * 256;
    g.beginPath();
    g.moveTo(0, y);
    for (let x = 0; x <= 256; x += 16) g.lineTo(x, y + Math.sin(x * 0.06 + i) * 4);
    g.stroke();
  }
  // footprints: small darker ovals in wandering pairs
  for (let i = 0; i < 10; i++) {
    const fx = Math.random() * 220, fy = Math.random() * 220;
    g.fillStyle = 'rgba(140,105,60,0.22)';
    g.beginPath(); g.ellipse(fx, fy, 5, 8, 0.3, 0, 7); g.fill();
    g.beginPath(); g.ellipse(fx + 9, fy + 12, 5, 8, 0.3, 0, 7); g.fill();
  }
  // damp darker patches
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

// The golden-hour sky: a deep blue zenith fading through rose to
// a bright gold horizon — bright and saturated, no purple wash.
// The top is deepened to #1e4a9e for the bright-blue-over-sunset
// contrast Karimbu's cover has, and the horizon warms to #ffe0a0
// so the sun sits in gold, not grey.
export function skyTexture() {
  const c = makeCanvas(64, 512);
  const g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 0, 512);
  const STOPS = [
    [0.0, '#1e4a9e'], [0.32, '#4a7cc8'], [0.55, '#e8a06a'],
    [0.8, '#ffb35c'], [1.0, '#ffe0a0'],
  ];
  for (const [at, color] of STOPS) grad.addColorStop(at, color);
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 512);
  return canvasTexture(c);
}

// A flame sprite: a teardrop flame with a warm orange core, a deep
// orange body and a soft red edge — drawn once, then billboarded as
// a sprite so it reads as real fire from any angle. A solid cone
// reads as an orange triangle; a soft teardrop sprite reads as flame.
// Fix9: the core is ORANGE, not white-hot — a white-hot core plus
// additive blending blew the shootout's centre out to pure white.
export function flameTexture() {
  const c = makeCanvas(128, 128);
  const g = c.getContext('2d');
  g.clearRect(0, 0, 128, 128);
  // outer flame: a tall teardrop, deep orange, soft edge
  const grad = g.createRadialGradient(64, 78, 4, 64, 72, 58);
  grad.addColorStop(0, 'rgba(255,180,60,1)');
  grad.addColorStop(0.35, 'rgba(255,140,30,0.95)');
  grad.addColorStop(0.65, 'rgba(255,80,10,0.75)');
  grad.addColorStop(1, 'rgba(220,40,10,0)');
  g.fillStyle = grad;
  g.beginPath();
  g.moveTo(64, 6);
  g.bezierCurveTo(96, 44, 104, 78, 92, 102);
  g.bezierCurveTo(82, 120, 46, 120, 36, 102);
  g.bezierCurveTo(24, 78, 32, 44, 64, 6);
  g.fill();
  // hot core: a smaller, warmer teardrop low in the flame — orange,
  // never white, so the flame reads as fire and not as a light bulb
  const core = g.createRadialGradient(64, 92, 2, 64, 88, 34);
  core.addColorStop(0, 'rgba(255,200,90,1)');
  core.addColorStop(0.5, 'rgba(255,150,50,0.9)');
  core.addColorStop(1, 'rgba(255,90,20,0)');
  g.fillStyle = core;
  g.beginPath();
  g.moveTo(64, 52);
  g.bezierCurveTo(82, 72, 86, 92, 78, 106);
  g.bezierCurveTo(72, 116, 56, 116, 50, 106);
  g.bezierCurveTo(42, 92, 46, 72, 64, 52);
  g.fill();
  return canvasTexture(c);
}

// A smoke puff: a soft round grey blob with a lighter centre and a
// transparent edge — billboarded, it reads as smoke; a cone reads
// as a black pyramid.
export function smokeTexture() {
  const c = makeCanvas(128, 128);
  const g = c.getContext('2d');
  g.clearRect(0, 0, 128, 128);
  const grad = g.createRadialGradient(64, 64, 6, 64, 64, 60);
  grad.addColorStop(0, 'rgba(200,200,200,0.85)');
  grad.addColorStop(0.55, 'rgba(170,170,170,0.5)');
  grad.addColorStop(1, 'rgba(150,150,150,0)');
  g.fillStyle = grad;
  g.beginPath();
  g.arc(64, 64, 60, 0, 7);
  g.fill();
  // a few lumps so the puff is not a perfect disc
  for (const [x, y, r] of [[40, 44, 26], [88, 48, 24], [52, 88, 22], [84, 86, 20]]) {
    const lump = g.createRadialGradient(x, y, 2, x, y, r);
    lump.addColorStop(0, 'rgba(190,190,190,0.55)');
    lump.addColorStop(1, 'rgba(160,160,160,0)');
    g.fillStyle = lump;
    g.beginPath();
    g.arc(x, y, r, 0, 7);
    g.fill();
  }
  return canvasTexture(c);
}

// A blood pool: an irregular dark-red splatter with a glossy dark
// centre, a lighter ragged edge and droplets around it — a flat
// bright-red disc reads as a sticker; this reads as blood.
export function bloodTexture() {
  const c = makeCanvas(256, 256);
  const g = c.getContext('2d');
  g.clearRect(0, 0, 256, 256);
  // main pool: an irregular blob, dark glossy red
  const pool = g.createRadialGradient(128, 128, 10, 128, 128, 110);
  pool.addColorStop(0, '#5a0505');
  pool.addColorStop(0.55, '#8a0f0f');
  pool.addColorStop(0.85, '#a01818');
  pool.addColorStop(1, 'rgba(120,15,15,0)');
  g.fillStyle = pool;
  g.beginPath();
  for (let i = 0; i <= 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    const r = 95 + Math.sin(a * 3) * 14 + Math.sin(a * 7 + 1) * 8;
    const x = 128 + Math.cos(a) * r;
    const y = 128 + Math.sin(a) * r;
    if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
  }
  g.closePath();
  g.fill();
  // a darker glossy centre (wet blood)
  const core = g.createRadialGradient(128, 128, 4, 128, 128, 55);
  core.addColorStop(0, 'rgba(40,2,2,0.9)');
  core.addColorStop(1, 'rgba(60,5,5,0)');
  g.fillStyle = core;
  g.beginPath();
  g.arc(128, 128, 55, 0, 7);
  g.fill();
  // droplets flung out from the pool
  for (let i = 0; i < 14; i++) {
    const a = Math.random() * Math.PI * 2;
    const d = 105 + Math.random() * 18;
    const x = 128 + Math.cos(a) * d;
    const y = 128 + Math.sin(a) * d;
    g.fillStyle = 'rgba(130,18,18,0.85)';
    g.beginPath();
    g.arc(x, y, 2 + Math.random() * 4, 0, 7);
    g.fill();
  }
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
