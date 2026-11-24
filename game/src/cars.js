// Cars for Coral Bay Heat: low, wide, sleek GTs and cruisers with
// real proportions — a long sloped nose, a raked narrow glasshouse, a
// wide stance with big wheels and bright hubs, glowing headlights and
// grilles — so they read as cars at a glance, never boxes. The hero
// GT is longer, lower and wider than the traffic around it, and the
// only vivid orange car on the road.
import * as THREE from 'three';
import { PALETTE, plateTexture } from './materials.js';

function box(w, h, d, color, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshStandardMaterial({ color, roughness: 0.5, metalness: 0.3 }),
  );
  m.position.set(x, y, z);
  m.castShadow = true;
  return m;
}

// A box tilted about X: the sloped nose, windshield and rear deck that
// make a car read as a car instead of a box.
function slopeBox(w, h, d, color, x, y, z, rx) {
  const m = box(w, h, d, color, x, y, z);
  m.rotation.x = rx;
  return m;
}

// A glowing lamp: headlight / tail light that reads at dusk.
function lamp(w, h, d, color, x, y, z) {
  const m = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 1.1, roughness: 0.4 }),
  );
  m.position.set(x, y, z);
  return m;
}

// A big wheel: fat dark tyre with a bright silver hub that reads at a
// glance, pushed out to the corners of the car.
function wheelMesh() {
  const g = new THREE.Group();
  const tyre = new THREE.Mesh(
    new THREE.CylinderGeometry(0.48, 0.48, 0.3, 16),
    new THREE.MeshStandardMaterial({ color: 0x14141a, roughness: 0.9 }),
  );
  tyre.rotation.z = Math.PI / 2;
  tyre.castShadow = true;
  const hub = new THREE.Mesh(
    new THREE.CylinderGeometry(0.28, 0.28, 0.32, 12),
    new THREE.MeshStandardMaterial({ color: 0xd8dce2, roughness: 0.3, metalness: 0.8 }),
  );
  hub.rotation.z = Math.PI / 2;
  const cap = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12, 0.12, 0.34, 8),
    new THREE.MeshStandardMaterial({ color: 0x222226, roughness: 0.5, metalness: 0.5 }),
  );
  cap.rotation.z = Math.PI / 2;
  g.add(tyre, hub, cap);
  return g;
}

function addWheels(group, halfW, halfL, y = 0.48) {
  const wheels = [];
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    const w = wheelMesh();
    w.position.set(sx * halfW, y, sz * halfL);
    group.add(w);
    wheels.push(w);
  }
  group.userData.wheels = wheels;
  return wheels;
}

function lightBar(group, y) {
  const bar = new THREE.Group();
  // a white roof pod under the bar, then big red/blue lamps
  const pod = new THREE.Mesh(
    new THREE.BoxGeometry(1.5, 0.1, 0.42),
    new THREE.MeshStandardMaterial({ color: 0xf2f2ee, roughness: 0.4, metalness: 0.2 }),
  );
  pod.position.y = -0.12;
  const red = new THREE.Mesh(
    new THREE.BoxGeometry(0.65, 0.22, 0.34),
    new THREE.MeshStandardMaterial({ color: 0xd92020, emissive: 0xd92020, emissiveIntensity: 0.9, roughness: 0.4 }),
  );
  red.position.set(-0.36, 0, 0);
  const blue = new THREE.Mesh(
    new THREE.BoxGeometry(0.65, 0.22, 0.34),
    new THREE.MeshStandardMaterial({ color: 0x2050d0, emissive: 0x2050d0, emissiveIntensity: 0.9, roughness: 0.4 }),
  );
  blue.position.set(0.36, 0, 0);
  bar.add(pod, red, blue);
  bar.position.y = y;
  group.add(bar);
  group.userData.lightRed = red;
  group.userData.lightBlue = blue;
  return bar;
}

// A white door badge with dark letters, e.g. CBPD on a cruiser door.
function doorBadge(text) {
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(1.1, 0.28),
    new THREE.MeshStandardMaterial({ map: plateTexture(text) }),
  );
  return m;
}

// The hero: a long, low, wide orange GT — a long gently-sloped hood,
// a raked narrow glasshouse, white racing stripes, a big black grille,
// glowing headlights, a wing spoiler, and big wheels with bright hubs.
// 5.0 m long, 2.18 m wide, roof under a metre — a wedge, not a box.
export function makeHeroCar() {
  const g = new THREE.Group();
  g.add(box(2.18, 0.36, 5.0, PALETTE.heroOrange, 0, 0.46, 0)); // low wide body
  g.add(slopeBox(2.16, 0.12, 1.9, PALETTE.heroOrange, 0, 0.56, 1.8, 0.26)); // long sloped nose
  g.add(slopeBox(1.62, 0.12, 1.5, 0x2a3a4a, 0, 0.9, 0.5, -0.55)); // raked windshield
  g.add(box(1.55, 0.24, 1.0, 0x2a3a4a, 0, 0.98, -0.3)); // narrow roof glass
  g.add(slopeBox(1.62, 0.12, 1.1, 0x2a3a4a, 0, 0.88, -1.3, 0.55)); // sloped rear deck
  // white racing stripes down the centre: hood, roof, trunk
  g.add(box(0.26, 0.02, 1.85, 0xf4f0e2, -0.18, 0.66, 1.8));
  g.add(box(0.26, 0.02, 1.85, 0xf4f0e2, 0.18, 0.66, 1.8));
  g.add(box(0.26, 0.02, 0.95, 0xf4f0e2, -0.18, 1.11, -0.3));
  g.add(box(0.26, 0.02, 0.95, 0xf4f0e2, 0.18, 1.11, -0.3));
  g.add(box(0.26, 0.02, 1.05, 0xf4f0e2, -0.18, 1.02, -1.3));
  g.add(box(0.26, 0.02, 1.05, 0xf4f0e2, 0.18, 1.02, -1.3));
  g.add(box(1.4, 0.16, 0.06, 0x14141a, 0, 0.5, 2.51)); // black grille
  g.add(box(2.2, 0.1, 0.5, 0x2a2a30, 0, 0.32, 2.4)); // front splitter
  g.add(box(0.12, 0.18, 4.0, 0x1c1c22, -1.1, 0.34, 0)); // side skirts
  g.add(box(0.12, 0.18, 4.0, 0x1c1c22, 1.1, 0.34, 0));
  // wing spoiler on two struts
  g.add(box(0.1, 0.28, 0.1, 0x1c1c22, -0.75, 0.86, -2.28));
  g.add(box(0.1, 0.28, 0.1, 0x1c1c22, 0.75, 0.86, -2.28));
  g.add(box(2.1, 0.07, 0.55, 0x2a2a30, 0, 1.03, -2.28)); // wing
  g.add(lamp(0.75, 0.13, 0.06, 0xffe9a8, -0.66, 0.56, 2.51)); // headlights
  g.add(lamp(0.75, 0.13, 0.06, 0xffe9a8, 0.66, 0.56, 2.51));
  g.add(lamp(0.4, 0.12, 0.06, 0xff2a2a, -0.68, 0.54, -2.51)); // tail lights
  g.add(lamp(0.4, 0.12, 0.06, 0xff2a2a, 0.68, 0.54, -2.51));
  const plate = new THREE.Mesh(
    new THREE.PlaneGeometry(0.72, 0.18),
    new THREE.MeshStandardMaterial({ map: plateTexture('CORAL-01') }),
  );
  plate.position.set(0, 0.42, -2.54);
  plate.rotation.y = Math.PI;
  g.add(plate);
  addWheels(g, 1.04, 1.7);
  g.userData.kind = 'hero';
  return g;
}

// A CBPD cruiser: long, low, wide — white body, navy doors with big
// CBPD badges, a tall glowing red/blue light bar on a roof pod,
// POLICE on the rear, big wheels with bright hubs — a real police car.
export function makeCruiser() {
  const g = new THREE.Group();
  g.add(box(2.16, 0.38, 4.9, PALETTE.policeWhite, 0, 0.48, 0));
  g.add(slopeBox(2.14, 0.12, 1.8, PALETTE.policeWhite, 0, 0.58, 1.8, 0.26)); // long sloped nose
  g.add(slopeBox(1.6, 0.12, 1.45, PALETTE.policeBlue, 0, 0.92, 0.5, -0.55)); // raked windshield
  g.add(box(1.55, 0.24, 1.0, PALETTE.policeBlue, 0, 1.0, -0.3)); // roof
  g.add(slopeBox(1.6, 0.12, 1.05, PALETTE.policeBlue, 0, 0.9, -1.28, 0.55)); // sloped rear deck
  g.add(box(2.18, 0.32, 1.3, PALETTE.policeBlue, 0, 0.54, -0.2)); // navy door band
  const badgeL = doorBadge('CBPD');
  badgeL.position.set(-1.1, 0.54, -0.2);
  badgeL.rotation.y = -Math.PI / 2;
  const badgeR = doorBadge('CBPD');
  badgeR.position.set(1.1, 0.54, -0.2);
  badgeR.rotation.y = Math.PI / 2;
  g.add(badgeL, badgeR);
  g.add(box(1.4, 0.14, 0.06, 0x14141a, 0, 0.52, 2.46)); // grille
  g.add(lamp(0.7, 0.12, 0.06, 0xffe9a8, -0.64, 0.56, 2.46));
  g.add(lamp(0.7, 0.12, 0.06, 0xffe9a8, 0.64, 0.56, 2.46));
  g.add(lamp(0.4, 0.12, 0.06, 0xff2a2a, -0.66, 0.56, -2.46));
  g.add(lamp(0.4, 0.12, 0.06, 0xff2a2a, 0.66, 0.56, -2.46));
  const rear = new THREE.Mesh(
    new THREE.PlaneGeometry(0.95, 0.24),
    new THREE.MeshStandardMaterial({ map: plateTexture('POLICE') }),
  );
  rear.position.set(0, 0.6, -2.49);
  rear.rotation.y = Math.PI;
  g.add(rear);
  lightBar(g, 1.36);
  addWheels(g, 1.04, 1.65);
  g.userData.kind = 'cruiser';
  return g;
}

// Civilian traffic in soft island colours — low, wide, long sloped
// nose and windshield, glowing headlights, big wheels, so the street
// reads as cars.
const CIVILIAN_COLORS = [0xd94f4f, 0x4f7fd9, 0xe8d44f, 0x7fd94f, 0xc9c9c9, 0x8a6fd9, 0xe8a34f, 0x4fd9c9];
export function makeCivilianCar(rng) {
  const color = rng.pick(CIVILIAN_COLORS);
  const g = new THREE.Group();
  g.add(box(2.0, 0.38, 4.5, color, 0, 0.48, 0));
  g.add(slopeBox(1.98, 0.12, 1.7, color, 0, 0.56, 1.65, 0.26)); // long sloped nose
  g.add(slopeBox(1.56, 0.12, 1.35, 0x223038, 0, 0.88, 0.45, -0.55)); // raked windshield
  g.add(box(1.5, 0.24, 0.95, 0x223038, 0, 0.96, -0.28)); // roof glass
  g.add(slopeBox(1.56, 0.12, 1.0, 0x223038, 0, 0.86, -1.15, 0.55)); // sloped rear deck
  g.add(box(1.3, 0.12, 0.06, 0x14141a, 0, 0.52, 2.26)); // grille
  g.add(lamp(0.6, 0.11, 0.06, 0xffe9a8, -0.6, 0.56, 2.26));
  g.add(lamp(0.6, 0.11, 0.06, 0xffe9a8, 0.6, 0.56, 2.26));
  g.add(lamp(0.36, 0.11, 0.06, 0xff2a2a, -0.62, 0.56, -2.26));
  g.add(lamp(0.36, 0.11, 0.06, 0xff2a2a, 0.62, 0.56, -2.26));
  addWheels(g, 0.98, 1.5);
  g.userData.kind = 'civilian';
  return g;
}

// The white police box van for the beach stand-off: a two-tone body
// with a long sloped cab nose, navy side stripe with CBPD badges, a
// tall light bar on a roof pod, glowing headlights, big wheels — and
// a flame socket the game lights on fire.
export function makePoliceVan() {
  const g = new THREE.Group();
  g.add(box(2.15, 1.35, 4.7, 0xe8e8e2, 0, 1.0, 0));
  g.add(box(2.0, 0.6, 1.4, 0x223038, 0, 1.3, 1.5)); // cab glass
  g.add(slopeBox(2.05, 0.3, 1.2, 0xe8e8e2, 0, 0.68, 2.3, 0.4)); // long sloped nose
  g.add(box(2.17, 0.4, 1.6, PALETTE.policeBlue, 0, 0.68, 0.2)); // navy side stripe
  const badgeL = doorBadge('CBPD');
  badgeL.position.set(-1.09, 0.68, 0.2);
  badgeL.rotation.y = -Math.PI / 2;
  const badgeR = doorBadge('CBPD');
  badgeR.position.set(1.09, 0.68, 0.2);
  badgeR.rotation.y = Math.PI / 2;
  g.add(badgeL, badgeR);
  g.add(box(1.3, 0.16, 0.06, 0x14141a, 0, 0.58, 2.76)); // grille
  g.add(lamp(0.6, 0.14, 0.06, 0xffe9a8, -0.62, 0.7, 2.76));
  g.add(lamp(0.6, 0.14, 0.06, 0xffe9a8, 0.62, 0.7, 2.76));
  lightBar(g, 1.85);
  addWheels(g, 1.02, 1.6);
  const flameAnchor = new THREE.Object3D();
  flameAnchor.position.set(0, 1.45, -0.6);
  g.add(flameAnchor);
  g.userData.flameAnchor = flameAnchor;
  g.userData.kind = 'van';
  return g;
}

// A little red scooter for the boulevard (the cover's street life).
export function makeScooter() {
  const g = new THREE.Group();
  g.add(box(0.5, 0.35, 1.6, 0xd92020, 0, 0.5, 0));
  g.add(box(0.4, 0.5, 0.5, 0x222226, 0, 0.85, -0.5));
  const w1 = wheelMesh(); w1.scale.set(0.8, 0.8, 0.8); w1.position.set(0, 0.3, 0.7);
  const w2 = wheelMesh(); w2.scale.set(0.8, 0.8, 0.8); w2.position.set(0, 0.3, -0.7);
  g.add(w1, w2);
  g.userData.wheels = [w1, w2];
  g.userData.kind = 'scooter';
  return g;
}
