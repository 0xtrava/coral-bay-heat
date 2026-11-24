// Vehicles for Coral Bay Heat — rebuilt as REAL cars, not boxes.
// The hero is an orange Nissan GT-R R35 (vivid orange, a BIG rear
// wing on two struts, QUAD ROUND taillights, black wheels, a wide
// rear, a rear diffuser, a low wide stance). The police cruisers are
// black-and-white muscle cars (black hood / roof / trunk, white
// doors, POLICE on the hood, a round gold badge on the door,
// EMERGENCY DIAL 911 on the rear quarter, a red+blue roof light
// bar, a black front push bar, black steel wheels with a silver
// centre). The burning vehicle is a black-and-white police Ranger
// SUV (black hood / roof, white doors, POLICE on the door, a round
// badge, a red+blue light bar, off-road tires with silver rims, a
// front bull bar, a white stripe on the hood, a spare on the back).
// Every vehicle is built from many small, well-proportioned parts —
// a long hood, a cabin set back, a sloped windshield, defined wheel
// arches, detailed wheels, shaped headlights, a grille, mirrors,
// glass — so each one reads as a real vehicle at a glance.
// Forward is +Z, rear is -Z (the grille sits at +Z, the plate at -Z).
import * as THREE from 'three';
import { PALETTE, plateTexture } from './materials.js';

function std(color, roughness = 0.45, metalness = 0.35) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness });
}

function box(w, h, d, mat, x, y, z, rx = 0, ry = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  m.rotation.x = rx;
  m.rotation.y = ry;
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

// A canvas text decal: bold text on a flat plane (POLICE on a hood,
// EMERGENCY DIAL 911 on a rear quarter). Transparent background, so
// the paint shows through and only the letters read.
function textDecal(text, w, h, fg = '#f4f0e2', fontPx = 40) {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 128;
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, 512, 128);
  ctx.fillStyle = fg;
  ctx.font = `bold ${fontPx}px Arial, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 256, 66);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    new THREE.MeshStandardMaterial({ map: t, transparent: true, roughness: 0.6, metalness: 0.1 }),
  );
  return m;
}

// A glowing lamp: a headlight or a taillight that reads at dusk.
function lamp(w, h, d, color, x, y, z) {
  const m = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshStandardMaterial({
      color, emissive: color, emissiveIntensity: 0.85, roughness: 0.25, metalness: 0.2,
    }),
  );
  m.position.set(x, y, z);
  return m;
}

// A round lamp: a GT-R taillight, a fog light, an exhaust tip.
function roundLamp(radius, depth, color, x, y, z) {
  const geo = new THREE.CylinderGeometry(radius, radius, depth, 16);
  geo.rotateX(Math.PI / 2);
  const m = new THREE.Mesh(
    geo,
    new THREE.MeshStandardMaterial({
      color, emissive: color, emissiveIntensity: 0.9, roughness: 0.25, metalness: 0.2,
    }),
  );
  m.position.set(x, y, z);
  return m;
}

// A wheel: a chunky tire, a dark rim disc, a bright hub and five
// spokes on the outer face, all in a group whose rotation.x is the
// spin axis (the game spins userData.wheels). `side` is +1 for the
// right wheels (outer face +X) and -1 for the left wheels.
function wheel(radius, width, side, rimColor = 0x1a1a22, hubColor = 0xcfd8dc) {
  const g = new THREE.Group();
  const tireGeo = new THREE.CylinderGeometry(radius, radius, width, 20);
  tireGeo.rotateZ(Math.PI / 2);
  const tire = new THREE.Mesh(tireGeo, std(0x14141a, 0.9, 0.1));
  tire.castShadow = true;
  g.add(tire);
  // rim disc, slightly proud of the tire on the outer face
  const rimGeo = new THREE.CylinderGeometry(radius * 0.62, radius * 0.62, width + 0.04, 16);
  rimGeo.rotateZ(Math.PI / 2);
  const rim = new THREE.Mesh(rimGeo, std(rimColor, 0.35, 0.65));
  g.add(rim);
  // bright hub cap on the outer face
  const hubGeo = new THREE.CylinderGeometry(radius * 0.26, radius * 0.26, width + 0.08, 12);
  hubGeo.rotateZ(Math.PI / 2);
  const hub = new THREE.Mesh(hubGeo, std(hubColor, 0.3, 0.7));
  g.add(hub);
  // five spokes radiating from the hub across the outer face
  const faceX = side * (width / 2 + 0.03);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const s = new THREE.Mesh(new THREE.BoxGeometry(0.05, radius * 0.62, 0.1), std(rimColor, 0.35, 0.65));
    s.position.set(faceX, Math.cos(a) * radius * 0.32, Math.sin(a) * radius * 0.32);
    s.rotation.x = a;
    g.add(s);
  }
  return g;
}

// A roof light bar: a red beacon and a blue beacon on a dark base.
// Returns { group, red, blue } — the caller exposes red/blue as
// userData.lightRed / lightBlue so the game can flash them.
function lightBar() {
  const g = new THREE.Group();
  g.add(box(1.25, 0.09, 0.5, std(0x1a1a22, 0.5, 0.4), 0, 0, 0));
  const redMat = new THREE.MeshStandardMaterial({ color: 0xff2020, emissive: 0xff0000, emissiveIntensity: 1.2, roughness: 0.3 });
  const blueMat = new THREE.MeshStandardMaterial({ color: 0x2040ff, emissive: 0x0000ff, emissiveIntensity: 1.2, roughness: 0.3 });
  const red = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.24, 0.45), redMat);
  red.position.set(-0.31, 0.16, 0);
  const blue = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.24, 0.45), blueMat);
  blue.position.set(0.31, 0.16, 0);
  g.add(red, blue);
  return { group: g, red, blue };
}

// A round gold badge for a police door: a gold disc with a dark star.
function doorBadge(x, y, z, facing) {
  const c = document.createElement('canvas');
  c.width = 128; c.height = 128;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#ffd34d';
  ctx.beginPath(); ctx.arc(64, 64, 60, 0, 7); ctx.fill();
  ctx.strokeStyle = '#8a6a1a'; ctx.lineWidth = 6;
  ctx.beginPath(); ctx.arc(64, 64, 56, 0, 7); ctx.stroke();
  ctx.fillStyle = '#1a2a6e';
  ctx.font = 'bold 64px Arial, sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('★', 64, 68);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(0.34, 0.34),
    new THREE.MeshStandardMaterial({ map: t, transparent: true, roughness: 0.4, metalness: 0.4 }),
  );
  m.position.set(x, y, z);
  m.rotation.y = facing;
  return m;
}

// A side mirror: a small stalk and a dark glass head.
function mirror(side, y, z) {
  const g = new THREE.Group();
  g.add(box(0.12, 0.04, 0.04, std(0x1a1a22, 0.5, 0.4), side * 0.06, 0, 0));
  g.add(box(0.1, 0.14, 0.2, std(0x1a1a22, 0.4, 0.5), side * 0.16, 0.02, 0));
  g.position.set(side * 1.0, y, z);
  return g;
}

function finishCar(g, kind, wheels) {
  g.userData = { kind, wheels, lightRed: null, lightBlue: null };
  return g;
}

// The hero: an orange Nissan GT-R R35. Vivid orange, a long hood, a
// low wide stance, the cabin set back, a sloped windshield, a BIG
// rear wing on two struts, QUAD ROUND taillights, black wheels with
// bright hubs, a rear diffuser, side skirts, a front splitter, a
// grille, mirrors, glass, plate CORAL-01. Wide at the rear, like the
// real car.
export function makeHeroCar() {
  const g = new THREE.Group();
  const orange = std(PALETTE.heroOrange, 0.32, 0.55);
  const orangeDark = std(0xd94f00, 0.4, 0.5);
  const dark = std(0x14141a, 0.5, 0.4);
  const glass = new THREE.MeshStandardMaterial({ color: 0x14202e, roughness: 0.12, metalness: 0.8 });

  // lower body: long, low, wide — the GT stance
  g.add(box(2.0, 0.5, 4.4, orange, 0, 0.55, 0));
  // sloped hood, falling toward the nose, with a power bulge down
  // the centre so the hood has shape instead of a flat slab.
  // Round 8: the bulge is wider and taller, and fender bulges run
  // down each hood edge — the flat slab hood is what made the car
  // read as a wedge from the front. Sculpted fenders + a raised
  // centre give the nose the GT-R's muscular shape.
  g.add(box(1.9, 0.08, 1.3, orange, 0, 0.84, 1.5, -0.1));
  g.add(box(1.0, 0.1, 1.0, orange, 0, 0.92, 1.45, -0.1));
  g.add(box(0.28, 0.09, 1.25, orangeDark, -0.82, 0.88, 1.5, -0.1));
  g.add(box(0.28, 0.09, 1.25, orangeDark, 0.82, 0.88, 1.5, -0.1));
  // nose / front bumper with a black lower splitter
  g.add(box(2.05, 0.32, 0.4, orange, 0, 0.42, 2.25));
  g.add(box(2.1, 0.1, 0.5, dark, 0, 0.22, 2.28));
  // splitter corner canards — small vertical fins at the bumper corners
  g.add(box(0.06, 0.22, 0.4, dark, -1.02, 0.32, 2.3));
  g.add(box(0.06, 0.22, 0.4, dark, 1.02, 0.32, 2.3));
  // wide black grille + a lower intake, so the nose reads as a GT-R face
  g.add(box(1.5, 0.2, 0.06, dark, 0, 0.58, 2.46));
  g.add(box(1.7, 0.12, 0.06, dark, 0, 0.34, 2.46));
  // angular swept headlights: wide, bright, angled back toward the
  // fenders like the real GT-R's — not flat white rectangles. Each
  // sits in a black bezel so the light reads as an inset lamp, not
  // a white blob pasted on the nose.
  g.add(box(0.78, 0.2, 0.04, dark, -0.66, 0.76, 2.44));
  g.add(box(0.78, 0.2, 0.04, dark, 0.66, 0.76, 2.44));
  const hlL = lamp(0.68, 0.14, 0.06, 0xfff2c0, -0.66, 0.76, 2.47);
  hlL.rotation.y = 0.18;
  const hlR = lamp(0.68, 0.14, 0.06, 0xfff2c0, 0.66, 0.76, 2.47);
  hlR.rotation.y = -0.18;
  g.add(hlL, hlR);
  // LED daytime strips under the headlights
  g.add(lamp(0.5, 0.05, 0.05, 0xffffff, -0.66, 0.64, 2.47));
  g.add(lamp(0.5, 0.05, 0.05, 0xffffff, 0.66, 0.64, 2.47));
  // black side air intakes on the front corners
  g.add(box(0.16, 0.22, 0.3, dark, -0.98, 0.55, 2.2));
  g.add(box(0.16, 0.22, 0.3, dark, 0.98, 0.55, 2.2));
  // flared front arches over the front wheels
  g.add(box(0.22, 0.28, 1.1, orangeDark, -1.0, 0.72, 1.55));
  g.add(box(0.22, 0.28, 1.1, orangeDark, 1.0, 0.72, 1.55));
  // flared rear arches — the GT-R is wide at the rear
  g.add(box(0.24, 0.3, 1.2, orangeDark, -1.02, 0.72, -1.55));
  g.add(box(0.24, 0.3, 1.2, orangeDark, 1.02, 0.72, -1.55));
  // cabin: glasshouse set back, lower and sleeker than a box — a
  // sloped windshield and rear glass so the roofline falls away.
  // Round 8: the cabin is lower (0.40, not 0.46) and the roof panel
  // is BLACK, like the real GT-R in the reference photo — the tall
  // orange slab roof is what made the car read as a wedge from the
  // front. A black roof + lower glasshouse slims the whole car.
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.4, 2.0), glass);
  cabin.position.set(0, 0.98, -0.3);
  cabin.castShadow = true;
  g.add(cabin);
  g.add(box(1.6, 0.06, 1.9, dark, 0, 1.21, -0.3)); // black roof panel
  g.add(box(1.62, 0.05, 0.9, glass, 0, 1.05, 0.78, -0.62)); // windshield
  g.add(box(1.62, 0.05, 0.85, glass, 0, 1.05, -1.32, 0.5)); // rear glass
  g.add(box(0.04, 0.32, 1.6, glass, -0.86, 0.98, -0.3)); // side glass L
  g.add(box(0.04, 0.32, 1.6, glass, 0.86, 0.98, -0.3)); // side glass R
  // BIG rear wing on two tall struts, with endplates and a gurney
  // flap — the GT-R signature, and the reference photo's wing is
  // tall and wide, standing clear above the decklid. Round 8: the
  // struts are taller (0.52) and the wing wider (2.3 m) so it reads
  // as a real GT wing from every angle, not a flat shelf.
  g.add(box(0.08, 0.52, 0.16, dark, -0.7, 1.06, -2.25));
  g.add(box(0.08, 0.52, 0.16, dark, 0.7, 1.06, -2.25));
  g.add(box(2.3, 0.07, 0.55, dark, 0, 1.34, -2.25));
  g.add(box(0.06, 0.28, 0.55, dark, -1.15, 1.34, -2.25));
  g.add(box(0.06, 0.28, 0.55, dark, 1.15, 1.34, -2.25));
  g.add(box(2.3, 0.12, 0.04, dark, 0, 1.4, -2.5)); // gurney flap
  // QUAD ROUND taillights — two on each side, like the real GT-R.
  // Big and bright red so they read even from far down the boulevard.
  // Round 8: bigger (0.2) with a dark-red ring disc behind each lamp,
  // like the reference photo's ringed lights — the ring is what makes
  // them read as GT-R lights instead of plain red dots.
  for (const tx of [-0.62, -0.94, 0.62, 0.94]) {
    g.add(roundLamp(0.23, 0.03, 0x6e0a0a, tx, 0.72, -2.43));
    g.add(roundLamp(0.2, 0.07, 0xff2a2a, tx, 0.72, -2.44));
  }
  // rear diffuser with vertical fins + twin exhausts
  g.add(box(1.9, 0.26, 0.3, dark, 0, 0.35, -2.35));
  for (const fx of [-0.6, -0.2, 0.2, 0.6]) g.add(box(0.05, 0.22, 0.34, dark, fx, 0.3, -2.38));
  g.add(roundLamp(0.09, 0.1, 0x8a8a92, -0.45, 0.28, -2.5));
  g.add(roundLamp(0.09, 0.1, 0x8a8a92, 0.45, 0.28, -2.5));
  // side skirts + mirrors
  g.add(box(0.08, 0.12, 3.2, dark, -1.02, 0.28, 0));
  g.add(box(0.08, 0.12, 3.2, dark, 1.02, 0.28, 0));
  g.add(mirror(-1, 1.0, 0.55));
  g.add(mirror(1, 1.0, 0.55));
  // plate CORAL-01 on the rear
  const plate = new THREE.Mesh(
    new THREE.PlaneGeometry(0.62, 0.16),
    new THREE.MeshStandardMaterial({ map: plateTexture('CORAL-01') }),
  );
  plate.position.set(0, 0.48, -2.52);
  plate.rotation.y = Math.PI;
  g.add(plate);
  // big black wheels with bright hubs — large enough to fill the
  // arches, so the car sits on its wheels instead of floating.
  // Round 8: 0.48, not 0.46 — the bigger wheel fills the flared
  // arches and drops the stance, like the reference photo.
  const wheels = [];
  for (const [wx, wz] of [[-0.96, 1.55], [0.96, 1.55], [-0.96, -1.55], [0.96, -1.55]]) {
    const w = wheel(0.48, 0.32, wx > 0 ? 1 : -1, 0x14141a, 0xd8dde2);
    w.position.set(wx, 0.48, wz);
    g.add(w);
    wheels.push(w);
  }
  return finishCar(g, 'hero', wheels);
}

// A CBPD cruiser: a black-and-white police muscle car. Black hood /
// roof / trunk, white doors, POLICE on the hood, a round gold badge
// on the door, EMERGENCY DIAL 911 on the rear quarter, a red+blue
// roof light bar, a black front push bar, black steel wheels with a
// silver centre.
export function makeCruiser() {
  const g = new THREE.Group();
  const white = std(PALETTE.policeWhite, 0.4, 0.3);
  const black = std(0x14141a, 0.4, 0.5);
  const dark = std(0x1a1a22, 0.5, 0.4);
  const glass = new THREE.MeshStandardMaterial({ color: 0x14202e, roughness: 0.12, metalness: 0.8 });

  // white main body; the black panels make the two-tone
  g.add(box(1.95, 0.55, 4.3, white, 0, 0.6, 0));
  g.add(box(1.85, 0.08, 1.2, black, 0, 0.9, 1.5)); // black hood
  g.add(box(1.6, 0.08, 1.6, black, 0, 1.25, -0.2)); // black roof
  g.add(box(1.85, 0.08, 0.9, black, 0, 0.9, -1.7)); // black trunk
  // POLICE across the hood, reading from the front — big and bold
  const hoodMark = textDecal('POLICE', 1.7, 0.42, '#f4f0e2', 52);
  hoodMark.rotation.x = -Math.PI / 2;
  hoodMark.rotation.z = Math.PI;
  hoodMark.position.set(0, 0.95, 1.5);
  g.add(hoodMark);
  // black side stripe along the doors — the classic police two-tone
  g.add(box(0.04, 0.22, 3.4, black, -0.99, 0.62, -0.2));
  g.add(box(0.04, 0.22, 3.4, black, 0.99, 0.62, -0.2));
  // cabin: glasshouse with white pillars
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.45, 1.8), glass);
  cabin.position.set(0, 1.0, -0.2);
  cabin.castShadow = true;
  g.add(cabin);
  g.add(box(1.62, 0.05, 0.8, glass, 0, 1.05, 0.72, -0.45)); // windshield
  g.add(box(1.62, 0.05, 0.7, glass, 0, 1.05, -1.1, 0.4)); // rear glass
  // round gold badge on each front door
  g.add(doorBadge(-0.99, 0.75, 0.5, -Math.PI / 2));
  g.add(doorBadge(0.99, 0.75, 0.5, Math.PI / 2));
  // EMERGENCY DIAL 911 on each rear quarter
  for (const s of [-1, 1]) {
    const q = textDecal('EMERGENCY DIAL 911', 1.15, 0.2, '#1a2a6e', 30);
    q.position.set(s * 0.99, 0.72, -1.35);
    q.rotation.y = s * Math.PI / 2;
    g.add(q);
  }
  // red+blue roof light bar
  const bar = lightBar();
  bar.group.position.set(0, 1.38, -0.2);
  g.add(bar.group);
  // black front push bar + grille + headlights
  g.add(box(1.6, 0.12, 0.1, dark, 0, 0.5, 2.32));
  g.add(box(0.1, 0.5, 0.08, dark, -0.5, 0.55, 2.32));
  g.add(box(0.1, 0.5, 0.08, dark, 0.5, 0.55, 2.32));
  g.add(box(1.4, 0.16, 0.06, dark, 0, 0.6, 2.3));
  g.add(lamp(0.5, 0.13, 0.06, 0xffe9a8, -0.62, 0.78, 2.3));
  g.add(lamp(0.5, 0.13, 0.06, 0xffe9a8, 0.62, 0.78, 2.3));
  // taillights + POLICE plate on the rear
  g.add(lamp(0.45, 0.13, 0.06, 0xff2a2a, -0.62, 0.78, -2.18));
  g.add(lamp(0.45, 0.13, 0.06, 0xff2a2a, 0.62, 0.78, -2.18));
  const plate = new THREE.Mesh(
    new THREE.PlaneGeometry(0.62, 0.16),
    new THREE.MeshStandardMaterial({ map: plateTexture('POLICE') }),
  );
  plate.position.set(0, 0.48, -2.2);
  plate.rotation.y = Math.PI;
  g.add(plate);
  // mirrors
  g.add(mirror(-1, 0.98, 0.5));
  g.add(mirror(1, 0.98, 0.5));
  // black steel wheels with a silver centre
  const wheels = [];
  for (const [wx, wz] of [[-0.9, 1.45], [0.9, 1.45], [-0.9, -1.45], [0.9, -1.45]]) {
    const w = wheel(0.4, 0.3, wx > 0 ? 1 : -1, 0x14141a, 0xcfd8dc);
    w.position.set(wx, 0.4, wz);
    g.add(w);
    wheels.push(w);
  }
  const car = finishCar(g, 'cruiser', wheels);
  car.userData.lightRed = bar.red;
  car.userData.lightBlue = bar.blue;
  return car;
}

// The burning vehicle: a black-and-white police Ranger SUV. Black
// hood / roof, white doors, POLICE on the door, a round badge, a
// red+blue light bar, off-road tires with silver rims, a front bull
// bar, a white stripe on the hood, a spare on the back.
export function makePoliceVan() {
  const g = new THREE.Group();
  const white = std(PALETTE.policeWhite, 0.4, 0.3);
  const black = std(0x14141a, 0.4, 0.5);
  const dark = std(0x1a1a22, 0.5, 0.4);
  const glass = new THREE.MeshStandardMaterial({ color: 0x14202e, roughness: 0.12, metalness: 0.8 });

  // tall 4x4 body: white, with the black hood and roof
  g.add(box(2.0, 0.8, 4.6, white, 0, 0.75, 0));
  g.add(box(1.9, 0.08, 1.3, black, 0, 1.18, 1.6)); // black hood
  g.add(box(0.5, 0.02, 1.3, white, 0, 1.23, 1.6)); // white hood stripe
  g.add(box(1.7, 0.08, 2.2, black, 0, 1.6, -0.3)); // black roof
  // POLICE on each front door — big and bold
  for (const s of [-1, 1]) {
    const d = textDecal('POLICE', 1.15, 0.3, '#1a2a6e', 46);
    d.position.set(s * 1.01, 0.88, 0.6);
    d.rotation.y = s * Math.PI / 2;
    g.add(d);
  }
  // round gold badge on each door, under the POLICE text
  g.add(doorBadge(-1.01, 0.55, 0.6, -Math.PI / 2));
  g.add(doorBadge(1.01, 0.55, 0.6, Math.PI / 2));
  // big glasshouse — an SUV has tall windows
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.55, 2.4), glass);
  cabin.position.set(0, 1.35, -0.3);
  cabin.castShadow = true;
  g.add(cabin);
  g.add(box(1.72, 0.05, 0.9, glass, 0, 1.38, 0.95, -0.4)); // windshield
  g.add(box(1.72, 0.05, 0.8, glass, 0, 1.38, -1.5, 0.35)); // rear glass
  // red+blue roof light bar
  const bar = lightBar();
  bar.group.position.set(0, 1.72, -0.3);
  g.add(bar.group);
  // front bull bar + grille + high headlights
  g.add(box(1.8, 0.12, 0.12, dark, 0, 0.7, 2.42));
  g.add(box(0.12, 0.7, 0.1, dark, -0.6, 0.75, 2.42));
  g.add(box(0.12, 0.7, 0.1, dark, 0.6, 0.75, 2.42));
  g.add(box(1.3, 0.18, 0.06, dark, 0, 0.85, 2.4));
  g.add(lamp(0.5, 0.14, 0.06, 0xffe9a8, -0.68, 1.02, 2.4));
  g.add(lamp(0.5, 0.14, 0.06, 0xffe9a8, 0.68, 1.02, 2.4));
  // taillights + spare tire on the back door
  g.add(lamp(0.45, 0.14, 0.06, 0xff2a2a, -0.68, 1.02, -2.32));
  g.add(lamp(0.45, 0.14, 0.06, 0xff2a2a, 0.68, 1.02, -2.32));
  const spareGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.22, 18);
  spareGeo.rotateX(Math.PI / 2);
  const spare = new THREE.Mesh(spareGeo, std(0x14141a, 0.9, 0.1));
  spare.position.set(0, 1.0, -2.38);
  spare.castShadow = true;
  g.add(spare);
  const spareHubGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.26, 12);
  spareHubGeo.rotateX(Math.PI / 2);
  const spareHub = new THREE.Mesh(spareHubGeo, std(0xcfd8dc, 0.3, 0.7));
  spareHub.position.set(0, 1.0, -2.38);
  g.add(spareHub);
  // running boards along the sides
  g.add(box(0.15, 0.08, 3.0, dark, -1.05, 0.45, 0));
  g.add(box(0.15, 0.08, 3.0, dark, 1.05, 0.45, 0));
  // mirrors
  g.add(mirror(-1, 1.25, 0.7));
  g.add(mirror(1, 1.25, 0.7));
  // off-road tires: bigger, with a chunky tread ring and silver rims
  const wheels = [];
  for (const [wx, wz] of [[-0.95, 1.6], [0.95, 1.6], [-0.95, -1.6], [0.95, -1.6]]) {
    const w = wheel(0.5, 0.35, wx > 0 ? 1 : -1, 0x1a1a22, 0xd8dde2);
    // tread blocks around the tire
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      const t = new THREE.Mesh(new THREE.BoxGeometry(0.37, 0.09, 0.14), std(0x1e1e24, 0.95, 0.05));
      t.position.set(0, Math.cos(a) * 0.5, Math.sin(a) * 0.5);
      t.rotation.x = a;
      w.add(t);
    }
    w.position.set(wx, 0.5, wz);
    g.add(w);
    wheels.push(w);
  }
  // the fire anchors over the engine / hood
  const flameAnchor = new THREE.Object3D();
  flameAnchor.position.set(0, 1.45, -0.6);
  g.add(flameAnchor);
  const car = finishCar(g, 'van', wheels);
  car.userData.lightRed = bar.red;
  car.userData.lightBlue = bar.blue;
  car.userData.flameAnchor = flameAnchor;
  return car;
}

// Civilian traffic in soft island colours — a proper sedan: a lower
// body, a set-back cabin with glass, a grille, headlights and
// taillights, mirrors, wheels.
const CIVILIAN_COLORS = [0xd94f4f, 0x4f7fd9, 0xe8d44f, 0x7fd94f, 0xc9c9c9, 0x8a6fd9, 0xe8a34f, 0x4fd9c9];
export function makeCivilianCar(rng) {
  const color = rng.pick(CIVILIAN_COLORS);
  const g = new THREE.Group();
  const paint = std(color, 0.4, 0.4);
  const dark = std(0x1a1a22, 0.5, 0.4);
  const glass = new THREE.MeshStandardMaterial({ color: 0x14202e, roughness: 0.12, metalness: 0.8 });
  g.add(box(1.9, 0.5, 4.2, paint, 0, 0.55, 0));
  g.add(box(1.8, 0.07, 1.1, paint, 0, 0.82, 1.45, -0.08)); // sloped hood
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.45, 1.9), glass);
  cabin.position.set(0, 1.0, -0.25);
  cabin.castShadow = true;
  g.add(cabin);
  g.add(box(1.5, 0.06, 1.8, paint, 0, 1.25, -0.25)); // roof
  g.add(box(1.52, 0.05, 0.8, glass, 0, 1.05, 0.7, -0.45)); // windshield
  g.add(box(1.52, 0.05, 0.7, glass, 0, 1.05, -1.15, 0.4)); // rear glass
  g.add(box(1.2, 0.14, 0.06, dark, 0, 0.55, 2.12)); // grille
  g.add(lamp(0.45, 0.12, 0.06, 0xffe9a8, -0.6, 0.7, 2.12));
  g.add(lamp(0.45, 0.12, 0.06, 0xffe9a8, 0.6, 0.7, 2.12));
  g.add(lamp(0.4, 0.12, 0.06, 0xff2a2a, -0.6, 0.7, -2.12));
  g.add(lamp(0.4, 0.12, 0.06, 0xff2a2a, 0.6, 0.7, -2.12));
  g.add(mirror(-1, 0.95, 0.5));
  g.add(mirror(1, 0.95, 0.5));
  const wheels = [];
  for (const [wx, wz] of [[-0.88, 1.4], [0.88, 1.4], [-0.88, -1.4], [0.88, -1.4]]) {
    const w = wheel(0.38, 0.28, wx > 0 ? 1 : -1, 0x1a1a22, 0xcfd8dc);
    w.position.set(wx, 0.38, wz);
    g.add(w);
    wheels.push(w);
  }
  return finishCar(g, 'car', wheels);
}

// A scooter: a low deck, two small wheels, a handlebar, a seat.
export function makeScooter() {
  const g = new THREE.Group();
  const paint = std(0xd92020, 0.4, 0.4);
  const dark = std(0x1a1a22, 0.5, 0.4);
  g.add(box(0.5, 0.12, 1.5, paint, 0, 0.35, 0)); // deck
  g.add(box(0.45, 0.3, 0.5, paint, 0, 0.55, -0.55)); // rear body
  g.add(box(0.4, 0.25, 0.45, dark, 0, 0.62, -0.55)); // seat
  g.add(box(0.35, 0.5, 0.25, paint, 0, 0.6, 0.65)); // front shield
  const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.6, 8), dark);
  bar.rotation.z = Math.PI / 2;
  bar.position.set(0, 0.95, 0.6);
  g.add(bar);
  g.add(lamp(0.2, 0.1, 0.06, 0xffe9a8, 0, 0.7, 0.78));
  const wheels = [];
  for (const wz of [0.65, -0.65]) {
    const w = wheel(0.28, 0.14, 1, 0x14141a, 0xcfd8dc);
    w.position.set(0, 0.28, wz);
    g.add(w);
    wheels.push(w);
  }
  return finishCar(g, 'scooter', wheels);
}
