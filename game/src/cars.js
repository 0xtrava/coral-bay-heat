// Cars for Coral Bay Heat: the hero sports car, CBPD cruisers, the box
// van (one of them burning), and plain traffic. Every car is a Group
// facing +z, with its wheels as Groups in userData.wheels — the game spins
// each wheel Group around X, which is what the playtest measures.
import * as THREE from 'three';
import { mat, glowMat, signTexture } from './materials.js';

function box(w, h, d, material, x, y, z, parent) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  m.position.set(x, y, z);
  parent.add(m);
  return m;
}

// One wheel: a Group at the hub point so the game can spin it around X.
// The tyre, hub and brake disc spin with it; the caliper stays fixed to
// the car body and is added by the caller.
function makeWheel(parent, x, z, withDisc) {
  const g = new THREE.Group();
  g.position.set(x, 0.35, z);
  const tyre = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.28, 14), mat(0x14141a));
  tyre.rotation.z = Math.PI / 2;
  g.add(tyre);
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.3, 10), mat(0xb8bcc4));
  hub.rotation.z = Math.PI / 2;
  g.add(hub);
  if (withDisc) {
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.1, 12), mat(0xd8dde2));
    disc.rotation.z = Math.PI / 2;
    g.add(disc);
  }
  parent.add(g);
  return g;
}

function addCaliper(parent, x, z) {
  // Fixed to the body, sitting just behind the disc.
  return box(0.1, 0.22, 0.16, mat(0xc01818), x + (x > 0 ? 0.16 : -0.16), 0.35, z - 0.05, parent);
}

function headlights(parent, z, color = 0xfff2c0) {
  for (const sx of [-0.62, 0.62]) {
    box(0.34, 0.14, 0.06, glowMat(color), sx, 0.62, z, parent);
  }
}

function taillights(parent, z) {
  for (const sx of [-0.62, 0.62]) {
    box(0.34, 0.12, 0.06, glowMat(0xff2a22), sx, 0.62, z, parent);
  }
}

// The hero: a vivid orange sports car, the biggest and closest thing in
// the cover shot. Brake discs, red calipers, a visible interior under
// tinted glass, an LED strip and a rear spoiler.
export function makeHeroCar() {
  const car = new THREE.Group();
  const orange = mat(0xff6a00);
  const dark = mat(0x1a1a20);
  // Low, wide body with a sloping nose.
  box(1.9, 0.55, 4.4, orange, 0, 0.55, 0, car);
  box(1.7, 0.28, 1.4, orange, 0, 0.62, 1.9, car); // nose taper
  box(1.94, 0.16, 4.44, dark, 0, 0.32, 0, car); // skirt
  // Cabin: tinted glass over two seats and a dash.
  const glass = new THREE.MeshLambertMaterial({ color: 0x18202c, transparent: true, opacity: 0.82 });
  box(1.6, 0.5, 2.1, glass, 0, 1.05, -0.3, car);
  box(0.5, 0.42, 0.5, mat(0x222226), -0.42, 0.98, -0.45, car); // seats
  box(0.5, 0.42, 0.5, mat(0x222226), 0.42, 0.98, -0.45, car);
  box(1.4, 0.1, 0.3, mat(0x303036), 0, 0.95, 0.55, car); // dash
  // Spoiler, splitter, grille.
  box(1.8, 0.07, 0.5, dark, 0, 1.12, -2.05, car);
  box(0.08, 0.3, 0.08, dark, -0.7, 0.95, -2.05, car);
  box(0.08, 0.3, 0.08, dark, 0.7, 0.95, -2.05, car);
  box(1.2, 0.16, 0.06, dark, 0, 0.42, 2.21, car);
  // LED strip across the nose + headlights + taillights.
  box(1.5, 0.07, 0.05, glowMat(0xffffff), 0, 0.72, 2.22, car);
  headlights(car, 2.21);
  taillights(car, -2.21);
  // Plate.
  const plate = new THREE.Mesh(
    new THREE.PlaneGeometry(0.7, 0.18),
    new THREE.MeshBasicMaterial({ map: signTexture(['CORAL-01'], { px: 30, bg: '#f2f2ee', fg: '#14213d', pad: 8 }) })
  );
  plate.position.set(0, 0.42, 2.24);
  car.add(plate);
  // Wheels with discs + red calipers.
  const wheels = [];
  for (const [x, z] of [[-0.88, 1.45], [0.88, 1.45], [-0.88, -1.45], [0.88, -1.45]]) {
    wheels.push(makeWheel(car, x, z, true));
    addCaliper(car, x, z);
  }
  car.userData.wheels = wheels;
  car.userData.kind = 'hero';
  return car;
}

// A CBPD cruiser: white body, navy doors, POLICE on the flanks, a
// red/blue light bar and a CBPD rear plate.
export function makePoliceCar() {
  const car = new THREE.Group();
  const white = mat(0xf2f2ee);
  const navy = mat(0x1b2a4a);
  box(1.9, 0.55, 4.4, white, 0, 0.55, 0, car);
  box(1.9, 0.34, 2.0, navy, 0, 0.55, -0.2, car); // navy door band
  box(1.6, 0.5, 2.0, new THREE.MeshLambertMaterial({ color: 0x18202c, transparent: true, opacity: 0.85 }), 0, 1.02, -0.3, car);
  box(1.94, 0.16, 4.44, mat(0x1a1a20), 0, 0.32, 0, car);
  // Light bar: red left, blue right, both glowing.
  box(0.62, 0.14, 0.4, glowMat(0xff2222), -0.4, 1.34, -0.3, car);
  box(0.62, 0.14, 0.4, glowMat(0x2266ff), 0.4, 1.34, -0.3, car);
  box(1.3, 0.06, 0.44, mat(0x1a1a20), 0, 1.26, -0.3, car);
  headlights(car, 2.21);
  taillights(car, -2.21);
  // POLICE flank decals.
  const decal = new THREE.MeshBasicMaterial({ map: signTexture(['POLICE'], { px: 40, bg: '#f2f2ee', fg: '#14213d', pad: 10 }) });
  for (const side of [-1, 1]) {
    const d = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 0.62), decal);
    d.position.set(side * 0.97, 0.62, -0.2);
    d.rotation.y = side * Math.PI / 2;
    car.add(d);
  }
  const rear = new THREE.Mesh(
    new THREE.PlaneGeometry(0.9, 0.24),
    new THREE.MeshBasicMaterial({ map: signTexture(['CBPD'], { px: 30, bg: '#14213d', fg: '#ffffff', pad: 8 }) })
  );
  rear.position.set(0, 0.55, -2.22);
  rear.rotation.y = Math.PI;
  car.add(rear);
  const wheels = [];
  for (const [x, z] of [[-0.88, 1.45], [0.88, 1.45], [-0.88, -1.45], [0.88, -1.45]]) {
    wheels.push(makeWheel(car, x, z, false));
  }
  car.userData.wheels = wheels;
  car.userData.kind = 'police';
  return car;
}

// A plain traffic sedan in one of the island's colours.
export function makeTrafficCar(color) {
  const car = new THREE.Group();
  box(1.85, 0.55, 4.2, mat(color), 0, 0.55, 0, car);
  box(1.55, 0.48, 1.9, new THREE.MeshLambertMaterial({ color: 0x20262e, transparent: true, opacity: 0.85 }), 0, 1.0, -0.25, car);
  box(1.89, 0.14, 4.24, mat(0x1a1a20), 0, 0.32, 0, car);
  headlights(car, 2.11);
  taillights(car, -2.11);
  const wheels = [];
  for (const [x, z] of [[-0.86, 1.4], [0.86, 1.4], [-0.86, -1.4], [0.86, -1.4]]) {
    wheels.push(makeWheel(car, x, z, false));
  }
  car.userData.wheels = wheels;
  car.userData.kind = 'traffic';
  return car;
}

// A box van. `burning` adds big flame cones, a glow light and smoke so
// the shootout's van reads as a fire from across the beach.
export function makeBoxVan(burning = false) {
  const van = new THREE.Group();
  const white = mat(0xe8e4da);
  box(2.0, 0.62, 2.0, white, 0, 0.6, 1.9, van); // cab
  box(1.7, 0.5, 1.4, new THREE.MeshLambertMaterial({ color: 0x20262e, transparent: true, opacity: 0.85 }), 0, 1.1, 1.9, van);
  box(2.05, 2.0, 3.6, white, 0, 1.35, -0.9, van); // cargo box
  box(2.09, 0.2, 3.64, mat(0x2f4a3a), 0, 0.45, -0.9, van);
  headlights(van, 2.92);
  taillights(van, -2.72);
  const wheels = [];
  for (const [x, z] of [[-0.9, 2.1], [0.9, 2.1], [-0.9, -1.9], [0.9, -1.9]]) {
    wheels.push(makeWheel(van, x, z, false));
  }
  van.userData.wheels = wheels;
  van.userData.kind = 'van';
  if (burning) {
    van.userData.flames = [];
    const flameCols = [0xff7a00, 0xffb300, 0xffe14d, 0xff4d00];
    for (let i = 0; i < 5; i++) {
      const h = 2.6 + (i % 3) * 1.0;
      const flame = new THREE.Mesh(
        new THREE.ConeGeometry(0.85 + (i % 2) * 0.35, h, 7),
        glowMat(flameCols[i % flameCols.length], 0.92)
      );
      flame.position.set(-0.8 + (i % 3) * 0.8, 2.2 + h / 2, -0.9 + (i % 2) * 0.9 - 0.4);
      flame.userData.baseH = h;
      flame.userData.phase = i * 1.3;
      van.add(flame);
      van.userData.flames.push(flame);
    }
    // Scorch the cargo box.
    box(2.06, 1.1, 2.2, mat(0x1c1c20), 0, 1.9, -1.2, van);
    const fireLight = new THREE.PointLight(0xff8a2a, 85, 32, 1.6);
    fireLight.position.set(0, 3.4, -0.9);
    van.add(fireLight);
    van.userData.fireLight = fireLight;
    // A slow smoke column.
    const smoke = new THREE.Mesh(
      new THREE.SphereGeometry(1.5, 8, 6),
      new THREE.MeshLambertMaterial({ color: 0x2a2a2e, transparent: true, opacity: 0.55 })
    );
    smoke.position.set(0, 4.6, -0.9);
    smoke.scale.y = 1.8;
    van.add(smoke);
    van.userData.smoke = smoke;
  }
  return van;
}
