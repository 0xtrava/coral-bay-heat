// People for Coral Bay Heat: the red-jacketed player, CBPD officers
// (standing and fallen), and the island's pedestrians. Boxy on purpose —
// the look is a toy-city diorama, and the shapes read at a glance.
// Every person is a Group facing +z, with named limbs so the game can
// swing arms and legs while they walk.
import * as THREE from 'three';
import { mat, glowMat, blobTexture } from './materials.js';

function box(w, h, d, material, x, y, z, parent) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  m.position.set(x, y, z);
  parent.add(m);
  return m;
}

// Legs pivot at the hip so a walk cycle is one sine per leg.
function makeLegs(parent, color, spread = 0.14) {
  const legs = [];
  for (const s of [-1, 1]) {
    const hip = new THREE.Group();
    hip.position.set(s * spread, 0.82, 0);
    const leg = box(0.2, 0.8, 0.24, mat(color), 0, -0.4, 0, hip);
    const shoe = box(0.22, 0.12, 0.36, mat(0x1a1a1a), 0, -0.78, 0.06, hip);
    hip.userData.leg = leg;
    hip.userData.shoe = shoe;
    parent.add(hip);
    legs.push(hip);
  }
  return legs;
}

function makeArms(parent, color, spread = 0.32) {
  const arms = [];
  for (const s of [-1, 1]) {
    const shoulder = new THREE.Group();
    shoulder.position.set(s * spread, 1.42, 0);
    box(0.17, 0.62, 0.2, mat(color), 0, -0.3, 0, shoulder);
    parent.add(shoulder);
    arms.push(shoulder);
  }
  return arms;
}

// The player: red jacket, dark trousers, dark hair, pistol in hand.
// Built facing +z; the chase camera sits behind, so the back of the red
// jacket is what the player sees most.
export function makePlayer() {
  const p = new THREE.Group();
  const legs = makeLegs(p, 0x23232e);
  const arms = makeArms(p, 0xf03535);
  // Bright red jacket torso with a darker collar + belt — the red must
  // read from behind in dusk light, so it stays vivid, not maroon.
  box(0.62, 0.62, 0.34, mat(0xf03535), 0, 1.13, 0, p);
  box(0.64, 0.1, 0.36, mat(0x7a1010), 0, 1.4, 0, p);
  box(0.64, 0.08, 0.36, mat(0x1a1a1a), 0, 0.84, 0, p);
  // Head: skin, dark hair cap, a hint of a jaw.
  box(0.34, 0.36, 0.32, mat(0xe8b98a), 0, 1.66, 0, p);
  box(0.36, 0.14, 0.34, mat(0x1c1410), 0, 1.86, 0, p);
  box(0.36, 0.2, 0.1, mat(0x1c1410), 0, 1.68, -0.14, p);
  // Pistol in the right hand, pointing forward.
  const gun = box(0.07, 0.1, 0.42, mat(0x14141a), 0.32, 1.06, 0.3, p);
  gun.userData.isGun = true;
  // A small gold chain — the one flash of jewellery.
  box(0.3, 0.05, 0.02, glowMat(0xffc93c), 0, 1.38, 0.18, p);
  p.userData.legs = legs;
  p.userData.arms = arms;
  p.userData.kind = 'player';
  p.userData.walkPhase = 0;
  return p;
}

// A CBPD officer: dark-navy uniform, peaked cap with a gold band and
// badge, an oversized gold chest badge, belt and boots. `standing` picks
// the pose; a fallen officer lies flat with a blood pool under them.
export function makeOfficer(standing = true) {
  const o = new THREE.Group();
  const navy = 0x1b2a4a;
  const legs = makeLegs(o, 0x141c30, 0.13);
  const arms = makeArms(o, navy, 0.3);
  box(0.6, 0.6, 0.32, mat(navy), 0, 1.12, 0, o);
  // Oversized gold chest badge + name tape + belt.
  box(0.16, 0.16, 0.03, glowMat(0xffc93c), -0.16, 1.28, 0.18, o);
  box(0.34, 0.08, 0.03, mat(0xd8dde2), 0.1, 1.28, 0.18, o);
  box(0.62, 0.09, 0.34, mat(0x0e1424), 0, 0.86, 0, o);
  box(0.1, 0.1, 0.05, glowMat(0xffc93c), 0.14, 0.86, 0.18, o); // buckle
  // Head + peaked cap: crown, gold band, black brim, cap badge.
  box(0.32, 0.34, 0.3, mat(0xe8b98a), 0, 1.64, 0, o);
  box(0.38, 0.12, 0.36, mat(navy), 0, 1.84, 0, o);
  box(0.38, 0.06, 0.36, glowMat(0xffc93c), 0, 1.79, 0, o);
  box(0.34, 0.04, 0.22, mat(0x0e1424), 0, 1.76, 0.2, o);
  box(0.09, 0.09, 0.03, glowMat(0xffc93c), 0, 1.9, 0.19, o);
  // Duty pistol at the hip.
  box(0.07, 0.1, 0.3, mat(0x14141a), 0.3, 0.98, 0.1, o);
  o.userData.legs = legs;
  o.userData.arms = arms;
  o.userData.kind = 'officer';
  o.userData.walkPhase = 0;
  if (!standing) {
    // Fallen: lie on the back, arms out, with an enlarged blood pool.
    o.rotation.x = -Math.PI / 2 + 0.08;
    o.position.y = 0.32;
    const blood = new THREE.Mesh(
      new THREE.PlaneGeometry(3.4, 3.4),
      new THREE.MeshBasicMaterial({ map: blobTexture(), color: 0x7a0e0e, transparent: true, opacity: 0.9, depthWrite: false })
    );
    blood.rotation.x = -Math.PI / 2;
    blood.position.y = 0.03;
    o.add(blood);
    o.userData.fallen = true;
  }
  return o;
}

// A red target marker that floats above a standing officer's head in the
// shootout — the "this one is the enemy" cue, same language as the
// wanted stars.
export function makeTargetMarker() {
  const g = new THREE.Group();
  const cone = new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.9, 4), glowMat(0xff2a22));
  cone.rotation.x = Math.PI;
  g.add(cone);
  g.userData.spin = true;
  return g;
}

// A pedestrian: one of a dozen shirt/trouser/skin combos, walking the
// sidewalks. `userData.phase` staggers the walk cycle.
export function makePedestrian(rng) {
  const p = new THREE.Group();
  const shirts = [0xe86a8a, 0x4f9ac9, 0xf2c14e, 0x7ac98a, 0xe8e2d4, 0x9a6ac9, 0x4fc9b0];
  const trousers = [0x2a2a33, 0x3a4a6a, 0x5a4632, 0x1e2a1e];
  const skins = [0xe8b98a, 0xc98d5f, 0x8a5a3a, 0xf2c9a0];
  const shirt = shirts[Math.floor(rng() * shirts.length)];
  const legs = makeLegs(p, trousers[Math.floor(rng() * trousers.length)]);
  const arms = makeArms(p, shirt);
  box(0.58, 0.58, 0.32, mat(shirt), 0, 1.11, 0, p);
  box(0.32, 0.34, 0.3, mat(skins[Math.floor(rng() * skins.length)]), 0, 1.62, 0, p);
  // Hair or a hat, half the time.
  if (rng() < 0.5) {
    box(0.34, 0.12, 0.32, mat(rng() < 0.5 ? 0x1c1410 : 0x5a4632), 0, 1.82, 0, p);
  } else {
    const hat = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.3, 8), mat(0xf2c14e, { flat: true }));
    hat.position.y = 1.88;
    p.add(hat);
  }
  // Some carry a bag or a backpack.
  if (rng() < 0.4) {
    box(0.3, 0.36, 0.12, mat(0x6a4a2a), 0, 1.1, -0.22, p);
  }
  p.userData.legs = legs;
  p.userData.arms = arms;
  p.userData.kind = 'pedestrian';
  p.userData.walkPhase = rng() * Math.PI * 2;
  return p;
}

// Swing limbs for a walking person. `amount` is 0 when standing still.
export function animateWalk(person, dt, amount) {
  if (!person.userData.legs) return;
  person.userData.walkPhase += dt * 7 * Math.max(0.2, amount);
  const s = Math.sin(person.userData.walkPhase) * 0.55 * amount;
  person.userData.legs[0].rotation.x = s;
  person.userData.legs[1].rotation.x = -s;
  person.userData.arms[0].rotation.x = -s * 0.8;
  person.userData.arms[1].rotation.x = s * 0.8;
}
