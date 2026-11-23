// The CBPD helicopter: dark body, spinning rotor, and a slim
// searchlight beam that lands a warm pool of light on whatever it
// watches — the player, the hero car, the beach.
import * as THREE from 'three';
import { glowTexture } from './materials.js';

export function makeHeli() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(1.6, 1.1, 3.4),
    new THREE.MeshStandardMaterial({ color: 0x23232e, roughness: 0.4, metalness: 0.5 }),
  );
  body.position.y = 0;
  body.castShadow = true;
  const glass = new THREE.Mesh(
    new THREE.BoxGeometry(1.4, 0.6, 1.0),
    new THREE.MeshStandardMaterial({ color: 0x9fd8e8, roughness: 0.15, metalness: 0.6 }),
  );
  glass.position.set(0, 0.1, 1.3);
  const tail = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.5, 2.6),
    new THREE.MeshStandardMaterial({ color: 0x23232e, roughness: 0.4, metalness: 0.5 }),
  );
  tail.position.set(0, 0.2, -2.6);
  const fin = new THREE.Mesh(
    new THREE.BoxGeometry(0.12, 1.1, 0.7),
    new THREE.MeshStandardMaterial({ color: 0x23232e, roughness: 0.4, metalness: 0.5 }),
  );
  fin.position.set(0, 0.6, -3.7);
  const mast = new THREE.Mesh(
    new THREE.CylinderGeometry(0.09, 0.09, 0.5, 8),
    new THREE.MeshStandardMaterial({ color: 0x111118, roughness: 0.6 }),
  );
  mast.position.y = 0.75;
  // rotor: two long thin blades on a hub
  const rotor = new THREE.Group();
  const bladeMat = new THREE.MeshStandardMaterial({ color: 0x111118, roughness: 0.5 });
  const b1 = new THREE.Mesh(new THREE.BoxGeometry(7.5, 0.07, 0.34), bladeMat);
  const b2 = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.07, 7.5), bladeMat);
  rotor.add(b1, b2);
  rotor.position.y = 1.0;
  // searchlight: a slim cone from the belly, additive, faint
  const beamGeo = new THREE.ConeGeometry(2.6, 26, 16, 1, true);
  const beam = new THREE.Mesh(
    beamGeo,
    new THREE.MeshBasicMaterial({
      color: 0xfff2b0, transparent: true, opacity: 0.16,
      blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false,
    }),
  );
  beam.position.y = -13.4;
  // light pool: a warm glow disc that sits on the ground under the beam
  const pool = new THREE.Mesh(
    new THREE.PlaneGeometry(9, 9),
    new THREE.MeshBasicMaterial({
      map: glowTexture('rgba(255,240,180,0.9)', 'rgba(255,200,90,0.35)'),
      transparent: true, opacity: 0.75, blending: THREE.AdditiveBlending, depthWrite: false,
    }),
  );
  pool.rotation.x = -Math.PI / 2;
  g.add(body, glass, tail, fin, mast, rotor, beam);
  g.userData = { kind: 'heli', rotor, beam, pool, phase: Math.random() * 6.28 };
  return { group: g, pool };
}

// Hover above a target, rotor spinning, beam aimed down at it.
export function updateHeli(heli, target, dt, time) {
  const g = heli.group;
  const u = g.userData;
  u.rotor.rotation.y += dt * 22;
  // gentle bob and drift so the hover feels alive
  const hoverY = 26 + Math.sin(time * 0.7 + u.phase) * 1.2;
  g.position.set(
    target.x + Math.sin(time * 0.23 + u.phase) * 4,
    hoverY,
    target.z + Math.cos(time * 0.19 + u.phase) * 4,
  );
  g.rotation.y = Math.atan2(target.x - g.position.x, target.z - g.position.z);
  // aim the beam straight down at the target
  const dx = target.x - g.position.x;
  const dz = target.z - g.position.z;
  u.beam.rotation.z = Math.atan2(dx, 26) * 0.9;
  u.beam.rotation.x = -Math.atan2(dz, 26) * 0.9;
  u.pool.position.set(target.x, 0.06, target.z);
  const s = 1 + Math.sin(time * 2.1) * 0.05;
  u.pool.scale.set(s, s, 1);
}
