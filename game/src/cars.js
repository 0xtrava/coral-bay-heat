// Cars for Coral Bay Heat: low-poly box-built vehicles with spinning
// wheels, light bars for the police, and a readable hero GT in vivid
// orange with its CORAL-01 plate.
import * as THREE from 'three';
import { PALETTE, plateTexture } from './materials.js';

function box(w, h, d, color, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0.25 }),
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

function wheelMesh() {
  const w = new THREE.Mesh(
    new THREE.CylinderGeometry(0.34, 0.34, 0.24, 12),
    new THREE.MeshStandardMaterial({ color: 0x14141a, roughness: 0.9 }),
  );
  w.rotation.z = Math.PI / 2;
  w.castShadow = true;
  return w;
}

function addWheels(group, halfW, halfL, y = 0.34) {
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
  const red = box(0.5, 0.16, 0.3, 0xd92020, -0.3, 0, 0);
  const blue = box(0.5, 0.16, 0.3, 0x2050d0, 0.3, 0, 0);
  bar.add(red, blue);
  bar.position.y = y;
  group.add(bar);
  group.userData.lightRed = red;
  group.userData.lightBlue = blue;
  return bar;
}

// The hero: a low orange GT, 3/4 rear readable, plate on the back.
// Sloped nose, raked windshield and rear deck so it reads as a fastback
// GT, not a box — plus skirts, a splitter and a wing spoiler.
export function makeHeroCar() {
  const g = new THREE.Group();
  g.add(box(1.9, 0.5, 4.4, PALETTE.heroOrange, 0, 0.55, 0)); // lower body
  g.add(slopeBox(1.88, 0.16, 1.1, PALETTE.heroOrange, 0, 0.62, 1.85, 0.42)); // sloped nose
  g.add(slopeBox(1.7, 0.14, 1.6, 0x181820, 0, 1.02, 0.55, -0.5)); // raked windshield
  g.add(box(1.66, 0.3, 1.1, 0x181820, 0, 1.12, -0.35)); // roof glass
  g.add(slopeBox(1.7, 0.14, 1.0, 0x181820, 0, 1.0, -1.25, 0.55)); // sloped rear deck
  g.add(box(1.94, 0.12, 0.5, 0x2a2a30, 0, 0.42, 2.1)); // front splitter
  g.add(box(0.14, 0.22, 3.6, 0x1c1c22, -0.98, 0.42, 0)); // side skirts
  g.add(box(0.14, 0.22, 3.6, 0x1c1c22, 0.98, 0.42, 0));
  // wing spoiler on two struts
  g.add(box(0.1, 0.28, 0.1, 0x1c1c22, -0.7, 0.95, -1.95));
  g.add(box(0.1, 0.28, 0.1, 0x1c1c22, 0.7, 0.95, -1.95));
  g.add(box(1.92, 0.08, 0.55, 0x2a2a30, 0, 1.12, -1.95)); // wing
  g.add(box(0.5, 0.1, 0.06, 0xffe9a8, -0.6, 0.62, 2.21)); // headlights
  g.add(box(0.5, 0.1, 0.06, 0xffe9a8, 0.6, 0.62, 2.21));
  g.add(box(0.34, 0.12, 0.06, 0xff2a2a, -0.62, 0.62, -2.21)); // tail lights
  g.add(box(0.34, 0.12, 0.06, 0xff2a2a, 0.62, 0.62, -2.21));
  const plate = new THREE.Mesh(
    new THREE.PlaneGeometry(0.72, 0.18),
    new THREE.MeshStandardMaterial({ map: plateTexture('CORAL-01') }),
  );
  plate.position.set(0, 0.5, -2.24);
  plate.rotation.y = Math.PI;
  g.add(plate);
  addWheels(g, 0.92, 1.45);
  g.userData.kind = 'hero';
  return g;
}

// A CBPD cruiser: white body, navy doors, light bar, CBPD on the side.
// Sloped nose and raked windshield like the hero, so the pursuit pack
// reads as cars, not boxes.
export function makeCruiser() {
  const g = new THREE.Group();
  g.add(box(1.9, 0.55, 4.4, PALETTE.policeWhite, 0, 0.58, 0));
  g.add(slopeBox(1.88, 0.16, 1.0, PALETTE.policeWhite, 0, 0.66, 1.85, 0.42)); // sloped nose
  g.add(slopeBox(1.7, 0.14, 1.5, PALETTE.policeBlue, 0, 1.06, 0.5, -0.5)); // raked windshield
  g.add(box(1.66, 0.3, 1.1, PALETTE.policeBlue, 0, 1.14, -0.35)); // roof
  g.add(slopeBox(1.7, 0.14, 0.9, PALETTE.policeBlue, 0, 1.04, -1.2, 0.55)); // sloped rear deck
  g.add(box(1.92, 0.3, 1.1, PALETTE.policeBlue, 0, 0.62, -0.3)); // navy door band
  g.add(box(0.45, 0.1, 0.06, 0xffe9a8, -0.6, 0.65, 2.21));
  g.add(box(0.45, 0.1, 0.06, 0xffe9a8, 0.6, 0.65, 2.21));
  lightBar(g, 1.42);
  addWheels(g, 0.92, 1.45);
  g.userData.kind = 'cruiser';
  return g;
}

// Civilian traffic in soft island colours — sloped nose and windshield
// so the street reads as cars, not boxes.
const CIVILIAN_COLORS = [0xd94f4f, 0x4f7fd9, 0xe8d44f, 0x7fd94f, 0xc9c9c9, 0x8a6fd9, 0xe8a34f, 0x4fd9c9];
export function makeCivilianCar(rng) {
  const color = rng.pick(CIVILIAN_COLORS);
  const g = new THREE.Group();
  g.add(box(1.8, 0.55, 4.0, color, 0, 0.58, 0));
  g.add(slopeBox(1.78, 0.15, 0.9, color, 0, 0.65, 1.7, 0.42)); // sloped nose
  g.add(slopeBox(1.6, 0.14, 1.4, 0x223038, 0, 1.0, 0.45, -0.5)); // raked windshield
  g.add(box(1.56, 0.28, 1.0, 0x223038, 0, 1.08, -0.3)); // roof glass
  g.add(slopeBox(1.6, 0.14, 0.85, 0x223038, 0, 0.98, -1.1, 0.55)); // sloped rear deck
  g.add(box(0.4, 0.1, 0.06, 0xffe9a8, -0.55, 0.65, 2.01));
  g.add(box(0.4, 0.1, 0.06, 0xffe9a8, 0.55, 0.65, 2.01));
  addWheels(g, 0.88, 1.3);
  g.userData.kind = 'civilian';
  return g;
}

// The white police box van for the beach stand-off: tall body, light
// bar, side door, and a flame socket the game lights on fire.
export function makePoliceVan() {
  const g = new THREE.Group();
  g.add(box(2.1, 1.5, 4.6, 0xe8e8e2, 0, 1.05, 0));
  g.add(box(2.0, 0.7, 1.6, 0x223038, 0, 1.35, 1.4)); // cab glass
  g.add(slopeBox(2.0, 0.3, 0.8, 0xe8e8e2, 0, 0.75, 2.2, 0.45)); // sloped nose
  g.add(box(2.12, 0.35, 1.2, PALETTE.policeBlue, 0, 0.75, 0.4));
  lightBar(g, 1.95);
  addWheels(g, 1.0, 1.5, 0.36);
  const flameAnchor = new THREE.Object3D();
  flameAnchor.position.set(0, 1.5, -0.6);
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
  const w1 = wheelMesh(); w1.scale.set(0.8, 0.8, 0.8); w1.position.set(0, 0.28, 0.7);
  const w2 = wheelMesh(); w2.scale.set(0.8, 0.8, 0.8); w2.position.set(0, 0.28, -0.7);
  g.add(w1, w2);
  g.userData.wheels = [w1, w2];
  g.userData.kind = 'scooter';
  return g;
}
