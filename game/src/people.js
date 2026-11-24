// People for Coral Bay Heat: the player in the red jacket with a
// pistol held out in front, CBPD officers in navy with light-blue
// shirts, gold badges and red markers, and the island's pedestrians
// and beachgoers. All low-poly box figures with a simple leg-swing
// walk — but the player and the officers read at a glance.
import * as THREE from 'three';

const SHIRTS = [0xe86a5a, 0x5a8ad9, 0x7fd94f, 0xe8d44f, 0xffffff, 0xd97fb5, 0x4fd9c9, 0xe8a34f, 0xff6a5a, 0x5aff8a];
const PANTS = [0x2a2a33, 0x3a4a6e, 0x6e3a3a, 0x2f4a2f, 0x555560];

function limb(w, h, d, color, x, y, z) {
  const m = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshStandardMaterial({ color, roughness: 0.8 }),
  );
  m.position.set(x, y, z);
  m.castShadow = true;
  return m;
}

// A generic walker: torso, head, two arms, two legs. Legs swing when
// the figure walks (the game sets userData.walkPhase).
export function makeWalker(rng, shirt, pants) {
  const g = new THREE.Group();
  const torso = limb(0.52, 0.62, 0.3, shirt, 0, 1.08, 0);
  const head = limb(0.3, 0.3, 0.28, 0xd9a986, 0, 1.56, 0);
  const hair = limb(0.32, 0.12, 0.3, 0x1c1c22, 0, 1.74, 0);
  const armL = limb(0.14, 0.58, 0.16, shirt, -0.34, 1.08, 0);
  const armR = limb(0.14, 0.58, 0.16, shirt, 0.34, 1.08, 0);
  const legL = limb(0.18, 0.72, 0.2, pants, -0.13, 0.38, 0);
  const legR = limb(0.18, 0.72, 0.2, pants, 0.13, 0.38, 0);
  armL.geometry.translate(0, -0.2, 0);
  armR.geometry.translate(0, -0.2, 0);
  legL.geometry.translate(0, -0.3, 0);
  legR.geometry.translate(0, -0.3, 0);
  armL.position.y = 1.32; armR.position.y = 1.32;
  legL.position.y = 0.72; legR.position.y = 0.72;
  g.add(torso, head, hair, armL, armR, legL, legR);
  g.userData = { walkPhase: rng.float() * 6.28, armL, armR, legL, legR, speed: 0, aim: false };
  return g;
}

export function stepWalk(person, dt, moving) {
  const u = person.userData;
  if (u.aim) {
    // aim pose: both arms held out in front, gun forward
    u.armL.rotation.x = -1.25;
    u.armR.rotation.x = -1.25;
    u.armL.rotation.z = 0.12;
    u.armR.rotation.z = -0.12;
  } else if (moving) {
    u.armL.rotation.x = -Math.sin(u.walkPhase) * 0.7 * 0.55;
    u.armR.rotation.x = Math.sin(u.walkPhase) * 0.7 * 0.55;
  } else {
    u.armL.rotation.x *= 0.8;
    u.armR.rotation.x *= 0.8;
  }
  if (moving) {
    u.walkPhase += dt * 9;
    const s = Math.sin(u.walkPhase) * 0.55;
    u.legL.rotation.x = s;
    u.legR.rotation.x = -s;
  } else {
    u.legL.rotation.x *= 0.8;
    u.legR.rotation.x *= 0.8;
  }
}

// A pistol held out in front of the chest, barrel forward.
function pistol() {
  const g = new THREE.Group();
  const grip = limb(0.09, 0.2, 0.12, 0x1c1c22, 0, 0, 0);
  const barrel = limb(0.07, 0.07, 0.34, 0x2a2a30, 0, 0.08, 0.2);
  g.add(grip, barrel);
  return g;
}

// The player: red jacket, black hair, pistol out in front, arms aimed
// — unmistakable at a glance, and slightly bigger than a bystander.
export function makePlayer() {
  const g = makeWalker({ float: () => 0 }, 0xd21f1f, 0x1c1c22);
  const gun = pistol();
  gun.position.set(0.05, 1.18, 0.42);
  g.add(gun);
  // a lighter red chest panel so the jacket reads as a jacket, not a slab
  const chest = limb(0.4, 0.4, 0.04, 0xe83a3a, 0, 1.12, 0.16);
  g.add(chest);
  g.userData.kind = 'player';
  g.userData.aim = true;
  g.scale.setScalar(1.12);
  return g;
}

// A CBPD officer: navy uniform with a light-blue shirt front, white
// cap band, big gold badge, a pistol, and a tall red marker floating
// above so the player always knows who to shoot.
export function makeOfficer() {
  const g = new THREE.Group();
  const torso = limb(0.54, 0.62, 0.3, 0x1c2a4a, 0, 1.08, 0);
  const shirt = limb(0.4, 0.5, 0.04, 0x7fb2e8, 0, 1.1, 0.16);
  const head = limb(0.3, 0.3, 0.28, 0xd9a986, 0, 1.56, 0);
  const cap = limb(0.34, 0.1, 0.32, 0x14203a, 0, 1.74, 0);
  const band = limb(0.36, 0.04, 0.34, 0xf4f0e2, 0, 1.7, 0);
  const badge = limb(0.14, 0.16, 0.02, 0xffd34d, -0.16, 1.22, 0.18);
  const armL = limb(0.14, 0.58, 0.16, 0x1c2a4a, -0.34, 1.32, 0);
  const armR = limb(0.14, 0.58, 0.16, 0x1c2a4a, 0.34, 1.32, 0);
  const legL = limb(0.18, 0.72, 0.2, 0x14203a, -0.13, 0.72, 0);
  const legR = limb(0.18, 0.72, 0.2, 0x14203a, 0.13, 0.72, 0);
  armL.geometry.translate(0, -0.2, 0);
  armR.geometry.translate(0, -0.2, 0);
  legL.geometry.translate(0, -0.3, 0);
  legR.geometry.translate(0, -0.3, 0);
  // officer's pistol, held out in the right hand
  const gun = pistol();
  gun.position.set(0.34, 1.05, 0.3);
  gun.rotation.x = -0.4;
  // red marker: a tall downward cone that bobs above the head
  const marker = new THREE.Mesh(
    new THREE.ConeGeometry(0.3, 0.65, 4),
    new THREE.MeshBasicMaterial({ color: 0xff2a2a }),
  );
  marker.rotation.x = Math.PI;
  marker.position.y = 2.3;
  g.add(torso, shirt, head, cap, band, badge, armL, armR, legL, legR, gun, marker);
  g.userData = { kind: 'officer', walkPhase: 0, armL, armR, legL, legR, marker, hp: 3, aim: false };
  g.scale.setScalar(1.08);
  return g;
}

// A fallen officer: lying on the sand, arms splayed, legs out, cap
// beside his head, and a BIG bright blood pool under him — legible.
export function makeFallenOfficer() {
  const g = new THREE.Group();
  const body = limb(0.54, 0.5, 1.5, 0x1c2a4a, 0, 0.3, 0);
  body.rotation.y = 0.5;
  const shirt = limb(0.4, 0.4, 0.06, 0x7fb2e8, 0, 0.52, 0.1);
  shirt.rotation.y = 0.5;
  const head = limb(0.3, 0.28, 0.3, 0xd9a986, 0, 0.28, 0.85);
  const cap = limb(0.34, 0.1, 0.32, 0x14203a, 0.55, 0.1, 1.05);
  // arms splayed out to the sides
  const armL = limb(0.55, 0.14, 0.16, 0x1c2a4a, -0.5, 0.26, 0.25);
  armL.rotation.y = 0.5;
  const armR = limb(0.55, 0.14, 0.16, 0x1c2a4a, 0.5, 0.26, -0.15);
  armR.rotation.y = 0.5;
  // legs stretched out
  const legL = limb(0.18, 0.16, 0.85, 0x14203a, -0.14, 0.24, -1.05);
  legL.rotation.y = 0.5;
  const legR = limb(0.18, 0.16, 0.85, 0x14203a, 0.14, 0.24, -1.05);
  legR.rotation.y = 0.5;
  const pool = new THREE.Mesh(
    new THREE.CircleGeometry(1.7, 24),
    new THREE.MeshBasicMaterial({ color: 0xd02020, transparent: true, opacity: 1.0 }),
  );
  pool.rotation.x = -Math.PI / 2;
  pool.position.set(0.1, 0.03, 0.1);
  pool.scale.set(1.5, 1, 1);
  g.add(body, shirt, head, cap, armL, armR, legL, legR, pool);
  g.userData = { kind: 'fallen' };
  return g;
}

export function makePedestrian(rng) {
  const g = makeWalker(rng, rng.pick(SHIRTS), rng.pick(PANTS));
  g.userData.kind = 'ped';
  return g;
}

// A beachgoer with a towel over one shoulder (warm colours only).
export function makeBeachgoer(rng) {
  const g = makeWalker(rng, rng.pick([0xff8a5a, 0xffd34d, 0x7fd9d9, 0xff9ec4]), rng.pick([0x2a2a33, 0x6e3a3a]));
  g.userData.kind = 'beachgoer';
  return g;
}
