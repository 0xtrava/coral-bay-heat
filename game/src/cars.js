// Coral Bay Heat (rebuild v19) — cars.
// The hero is a vivid orange low-poly GT in 3/4 view: long hood, cabin,
// spoiler, whitewall stripes, plate CORAL-01. Traffic and police share the
// same chassis builder with different paint and light bars.

import * as THREE from 'three';
import { lambert } from './materials.js';

function wheel(r = 0.42) {
  const g = new THREE.Group();
  const tyre = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.34, 12), lambert(0x14141a));
  tyre.rotation.z = Math.PI / 2;
  g.add(tyre);
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.55, r * 0.55, 0.36, 10), lambert(0xd8d8d2));
  hub.rotation.z = Math.PI / 2;
  g.add(hub);
  return g;
}

// A boxy low-poly car. `opts` picks the paint, the roof, the extras.
export function buildCar(opts = {}) {
  const {
    color = 0xff6a00, roof = 0x22222a, spoiler = false, lightBar = false,
    taxi = false, plate = '', length = 4.4, width = 2.0,
  } = opts;
  const car = new THREE.Group();
  const bodyMat = lambert(color);
  const body = new THREE.Mesh(new THREE.BoxGeometry(width, 0.62, length), bodyMat);
  body.position.y = 0.62;
  car.add(body);
  const nose = new THREE.Mesh(new THREE.BoxGeometry(width * 0.92, 0.42, 0.7), bodyMat);
  nose.position.set(0, 0.52, length / 2 + 0.2);
  car.add(nose);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(width * 0.74, 0.46, length * 0.4), lambert(roof));
  cabin.position.set(0, 1.12, -length * 0.08);
  car.add(cabin);
  const glass = new THREE.Mesh(new THREE.BoxGeometry(width * 0.76, 0.36, length * 0.38), lambert(0xbfe8f2, { transparent: true, opacity: 0.55 }));
  glass.position.set(0, 1.1, -length * 0.08);
  car.add(glass);
  // white racing stripes over the hood and roof
  for (const sx of [-0.32, 0.32]) {
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.03, length * 0.9), lambert(0xf2f2ee));
    stripe.position.set(sx, 0.95, 0.1);
    car.add(stripe);
  }
  if (spoiler) {
    const wing = new THREE.Mesh(new THREE.BoxGeometry(width * 0.8, 0.06, 0.42), lambert(0x1a1a20));
    wing.position.set(0, 1.06, -length / 2 - 0.12);
    car.add(wing);
    for (const sx of [-0.7, 0.7]) {
      const strut = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.3, 0.08), lambert(0x1a1a20));
      strut.position.set(sx, 1.0, -length / 2 - 0.15);
      car.add(strut);
    }
  }
  if (lightBar) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.16, 0.4), lambert(0x22222a));
    bar.position.set(0, 1.56, -length * 0.06);
    car.add(bar);
    const red = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.18, 0.42), lambert(0xe02020, { emissive: 0xe02020, emissiveIntensity: 0.9 }));
    red.position.set(-0.28, 1.58, -length * 0.06);
    car.add(red);
    const blue = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.18, 0.42), lambert(0x2040e0, { emissive: 0x2040e0, emissiveIntensity: 0.9 }));
    blue.position.set(0.28, 1.58, -length * 0.06);
    car.add(blue);
  }
  if (taxi) {
    const sign = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.22, 0.4), lambert(0xffd24d, { emissive: 0xffd24d, emissiveIntensity: 0.5 }));
    sign.position.set(0, 1.62, -length * 0.06);
    car.add(sign);
  }
  // headlights + taillights
  for (const sx of [-0.62, 0.62]) {
    const hl = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.16, 0.06), lambert(0xfff2c9, { emissive: 0xffedb0, emissiveIntensity: 0.8 }));
    hl.position.set(sx, 0.62, length / 2 + 0.56);
    car.add(hl);
    const tl = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.14, 0.06), lambert(0xe02020, { emissive: 0xe02020, emissiveIntensity: 0.9 }));
    tl.position.set(sx, 0.66, -length / 2 - 0.02);
    car.add(tl);
  }
  // plate
  if (plate) {
    const canvas = document.createElement('canvas');
    canvas.width = 128; canvas.height = 32;
    const g = canvas.getContext('2d');
    g.fillStyle = '#f2f2ee'; g.fillRect(0, 0, 128, 32);
    g.fillStyle = '#1a1a20'; g.font = 'bold 20px Arial'; g.textAlign = 'center';
    g.fillText(plate, 64, 23);
    const tex = new THREE.CanvasTexture(canvas);
    const p = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.22), new THREE.MeshBasicMaterial({ map: tex }));
    p.position.set(0, 0.5, -length / 2 - 0.05);
    p.rotation.y = Math.PI;
    car.add(p);
  }
  // wheels (kept in userData so the playtest can watch them spin)
  const wheels = [];
  const wheelPos = [
    [-width / 2 - 0.05, 0.42, length * 0.32],
    [width / 2 + 0.05, 0.42, length * 0.32],
    [-width / 2 - 0.05, 0.42, -length * 0.32],
    [width / 2 + 0.05, 0.42, -length * 0.32],
  ];
  for (const [wx, wy, wz] of wheelPos) {
    const w = wheel();
    w.position.set(wx, wy, wz);
    car.add(w);
    wheels.push(w);
  }
  car.userData.wheels = wheels;
  return car;
}

export function buildHeroCar() {
  const car = buildCar({ color: 0xff6a00, roof: 0x3a3f4a, spoiler: true, plate: 'CORAL-01' });
  car.userData.isHero = true;
  return car;
}

export function buildPoliceCar() {
  const car = buildCar({ color: 0xf2f2ee, roof: 0x1d2f55, lightBar: true, plate: 'CBPD' });
  car.userData.isPolice = true;
  return car;
}

export function buildTrafficCar(color) {
  return buildCar({ color, roof: 0x2a2d34 });
}
