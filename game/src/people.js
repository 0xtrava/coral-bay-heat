// Coral Bay Heat — pedestrians. Simple blocky figures, numerous, spread at
// different depths, visibly mid-stride (one leg forward, one back, arms
// swinging). They walk the sidewalks, cross at crosswalks, gather on the
// beach and stand on the pier — no street or beach may look empty.
import * as THREE from 'three';

const SHIRTS = [0xff5d8f, 0x37e0c8, 0xffd76a, 0x6ad8ff, 0xff9d2e, 0x9d7bff, 0x7dff9a, 0xf2f2ee, 0xff6b4a];
const PANTS = [0x2a2f45, 0x4a3a28, 0x3a5a7a, 0x555555, 0x7a2d4d];
const SKINS = [0xe8b98a, 0xc98d5f, 0x8a5a34, 0xf0c49a];
const HAIRS = [0x1c1c22, 0x3a1f0d, 0xd8b13a, 0x6a6a72, 0x8a2d2d];

function seededRnd(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function makePerson(seed = 1, scale = 1) {
  const rnd = seededRnd(seed);
  const g = new THREE.Group();
  const skin = new THREE.MeshStandardMaterial({ color: SKINS[Math.floor(rnd() * SKINS.length)], roughness: 0.75 });
  const shirt = new THREE.MeshStandardMaterial({ color: SHIRTS[Math.floor(rnd() * SHIRTS.length)], roughness: 0.8 });
  const pants = new THREE.MeshStandardMaterial({ color: PANTS[Math.floor(rnd() * PANTS.length)], roughness: 0.85 });
  const hair = new THREE.MeshStandardMaterial({ color: HAIRS[Math.floor(rnd() * HAIRS.length)], roughness: 0.9 });
  const h = 1.55 + rnd() * 0.3;
  const s = scale * (h / 1.7);

  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.55, 0.24), shirt);
  torso.position.y = 0.98; torso.castShadow = true;
  g.add(torso);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.28, 0.26), skin);
  head.position.y = 1.42; head.castShadow = true;
  g.add(head);
  const hairTop = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.10, 0.28), hair);
  hairTop.position.y = 1.59;
  g.add(hairTop);
  // mid-stride legs: one forward, one back
  const stride = 0.28 + rnd() * 0.12;
  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.62, 0.17), pants);
  legL.position.set(-0.11, 0.42, stride);
  legL.rotation.x = -0.5;
  g.add(legL);
  const legR = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.62, 0.17), pants);
  legR.position.set(0.11, 0.42, -stride);
  legR.rotation.x = 0.5;
  g.add(legR);
  // swinging arms
  const armL = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.5, 0.12), shirt);
  armL.position.set(-0.27, 1.0, -0.14);
  armL.rotation.x = 0.45;
  g.add(armL);
  const armR = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.5, 0.12), shirt);
  armR.position.set(0.27, 1.0, 0.14);
  armR.rotation.x = -0.45;
  g.add(armR);
  g.scale.setScalar(s);
  g.userData.phase = rnd() * Math.PI * 2;
  g.userData.walkSpeed = 0.4 + rnd() * 0.5;
  return g;
}

// Scatter walkers along a line segment (sidewalk, beach, pier).
// Returns the group; each walker keeps its own stride phase.
export function makeCrowd(scene, spots) {
  const crowd = new THREE.Group();
  spots.forEach((sp, i) => {
    const p = makePerson(1000 + i * 17, sp.scale || 1);
    p.position.set(sp.x, sp.y || 0, sp.z);
    p.rotation.y = sp.rot ?? (Math.random() * Math.PI * 2);
    crowd.add(p);
  });
  scene.add(crowd);
  return crowd;
}

// Animate a gentle bob + leg swing so the crowd reads alive in motion.
export function animateCrowd(crowd, t) {
  crowd.children.forEach((p) => {
    const ph = p.userData.phase + t * p.userData.walkSpeed * 4;
    p.position.y = Math.abs(Math.sin(ph)) * 0.03;
    p.rotation.z = Math.sin(ph) * 0.02;
  });
}
