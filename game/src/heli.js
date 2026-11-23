// Coral Bay Heat (rebuild v19) — the police helicopter.
// A dark navy heli with a spinning rotor, a SLIM searchlight cone and a
// soft light pool on the ground. The beam is narrow on purpose: v18's
// giant pale triangle washed out half the screen.

import * as THREE from 'three';
import { lambert } from './materials.js';

export function buildHeli() {
  const g = new THREE.Group();
  const navy = lambert(0x1d2f55);
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.5, 3.6), navy);
  g.add(body);
  const nose = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.1, 1.2), lambert(0x9fd8e8, { transparent: true, opacity: 0.8 }));
  nose.position.set(0, 0.1, 2.1);
  g.add(nose);
  const tail = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 3.4), navy);
  tail.position.set(0, 0.3, -3.2);
  g.add(tail);
  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1.4, 0.8), lambert(0xe02020));
  fin.position.set(0, 0.9, -4.6);
  g.add(fin);
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.7, 6), lambert(0x22222a));
  mast.position.y = 1.05;
  g.add(mast);
  const rotor = new THREE.Group();
  for (const a of [0, Math.PI / 2]) {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(9.2, 0.06, 0.34), lambert(0x14141a));
    blade.rotation.y = a;
    rotor.add(blade);
  }
  rotor.position.y = 1.45;
  g.add(rotor);
  const tailRotor = new THREE.Mesh(new THREE.BoxGeometry(0.06, 2.2, 0.3), lambert(0x14141a));
  tailRotor.position.set(0.35, 0.5, -4.6);
  g.add(tailRotor);
  for (const sx of [-0.9, 0.9]) {
    const skid = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 3.2), lambert(0x22222a));
    skid.position.set(sx, -1.0, 0);
    g.add(skid);
  }
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.28, 8, 6), lambert(0xfff2c9, { emissive: 0xffedb0, emissiveIntensity: 1 }));
  lamp.position.set(0, -0.85, 1.2);
  g.add(lamp);
  g.userData.rotor = rotor;
  g.userData.tailRotor = tailRotor;
  return g;
}

// A narrow cone from the heli belly to the ground, opacity kept low so the
// scene underneath stays readable, plus a warm pool where it lands.
export function buildBeam() {
  const group = new THREE.Group();
  const coneGeo = new THREE.ConeGeometry(1.35, 1, 20, 1, true);
  const coneMat = new THREE.MeshBasicMaterial({
    color: 0xfff2c9, transparent: true, opacity: 0.10,
    side: THREE.DoubleSide, depthWrite: false, fog: false,
  });
  const cone = new THREE.Mesh(coneGeo, coneMat);
  group.add(cone);
  const poolGeo = new THREE.CircleGeometry(3.2, 20);
  const poolMat = new THREE.MeshBasicMaterial({
    color: 0xffe9a8, transparent: true, opacity: 0.22,
    depthWrite: false, fog: false,
  });
  const pool = new THREE.Mesh(poolGeo, poolMat);
  pool.rotation.x = -Math.PI / 2;
  pool.position.y = 0.08;
  group.add(pool);
  group.userData.cone = cone;
  group.userData.pool = pool;
  return group;
}

// Hover above the hero, slightly ahead, bobbing gently. The beam stretches
// from the belly to the ground and stays slim at any height.
export function updateHeli(heli, beam, heroPos, heroHeading, dt, time) {
  const ahead = 10;
  const tx = heroPos.x + Math.sin(heroHeading) * ahead;
  const tz = heroPos.z + Math.cos(heroHeading) * ahead;
  const hoverH = 24 + Math.sin(time * 0.7) * 1.2;
  heli.position.x += (tx - heli.position.x) * Math.min(1, dt * 1.2);
  heli.position.z += (tz - heli.position.z) * Math.min(1, dt * 1.2);
  heli.position.y += (hoverH - heli.position.y) * Math.min(1, dt * 1.2);
  heli.rotation.y = heroHeading;
  heli.userData.rotor.rotation.y += dt * 22;
  heli.userData.tailRotor.rotation.x += dt * 30;
  // beam: top at the heli belly, bottom on the ground, always narrow
  beam.position.set(heli.position.x, 0, heli.position.z);
  const h = heli.position.y;
  const cone = beam.userData.cone;
  cone.scale.set(1, h, 1);
  cone.position.y = h / 2;
  cone.rotation.x = Math.PI;
  beam.userData.pool.position.y = 0.08;
  beam.userData.pool.material.opacity = 0.16 + Math.sin(time * 2.2) * 0.05;
}
