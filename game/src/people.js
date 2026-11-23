// People for Coral Bay Heat: the player in the red jacket, CBPD
// officers in navy with gold badges and red markers, and the island's
// pedestrians and beachgoers. All low-poly box figures with a simple
// leg-swing walk.
import * as THREE from 'three';

const SHIRTS = [0xe86a5a, 0x5a8ad9, 0x7fd94f, 0xe8d44f, 0xffffff, 0xd97fb5, 0x4fd9c9, 0xe8a34f];
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
  g.userData = { walkPhase: rng.float() * 6.28, armL, armR, legL, legR, speed: 0 };
  return g;
}

export function stepWalk(person, dt, moving) {
  const u = person.userData;
  if (moving) {
    u.walkPhase += dt * 9;
    const s = Math.sin(u.walkPhase) * 0.55;
    u.legL.rotation.x = s;
    u.legR.rotation.x = -s;
    u.armL.rotation.x = -s * 0.7;
    u.armR.rotation.x = s * 0.7;
  } else {
    u.legL.rotation.x *= 0.8;
    u.legR.rotation.x *= 0.8;
    u.armL.rotation.x *= 0.8;
    u.armR.rotation.x *= 0.8;
  }
}

// The player: red jacket, black hair, unmistakable at a glance.
export function makePlayer() {
  const g = makeWalker({ float: () => 0 }, 0xd21f1f, 0x1c1c22);
  g.userData.kind = 'player';
  return g;
}

// A CBPD officer: navy uniform, gold badge, cap, red marker floating
// above so the player always knows who to shoot.
export function makeOfficer() {
  const g = new THREE.Group();
  const torso = limb(0.54, 0.62, 0.3, 0x1c2a4a, 0, 1.08, 0);
  const head = limb(0.3, 0.3, 0.28, 0xd9a986, 0, 1.56, 0);
  const cap = limb(0.34, 0.1, 0.32, 0x14203a, 0, 1.74, 0);
  const badge = limb(0.1, 0.12, 0.02, 0xffd34d, -0.16, 1.22, 0.16);
  const armL = limb(0.14, 0.58, 0.16, 0x1c2a4a, -0.34, 1.32, 0);
  const armR = limb(0.14, 0.58, 0.16, 0x1c2a4a, 0.34, 1.32, 0);
  const legL = limb(0.18, 0.72, 0.2, 0x14203a, -0.13, 0.72, 0);
  const legR = limb(0.18, 0.72, 0.2, 0x14203a, 0.13, 0.72, 0);
  armL.geometry.translate(0, -0.2, 0);
  armR.geometry.translate(0, -0.2, 0);
  legL.geometry.translate(0, -0.3, 0);
  legR.geometry.translate(0, -0.3, 0);
  // red marker: a small downward cone that bobs above the head
  const marker = new THREE.Mesh(
    new THREE.ConeGeometry(0.22, 0.5, 4),
    new THREE.MeshBasicMaterial({ color: 0xff2a2a }),
  );
  marker.rotation.x = Math.PI;
  marker.position.y = 2.15;
  g.add(torso, head, cap, badge, armL, armR, legL, legR, marker);
  g.userData = { kind: 'officer', walkPhase: 0, armL, armR, legL, legR, marker, hp: 3 };
  return g;
}

// A fallen officer: lying on the sand with a blood pool under him.
export function makeFallenOfficer() {
  const g = new THREE.Group();
  const body = limb(0.54, 0.5, 1.5, 0x1c2a4a, 0, 0.28, 0);
  body.rotation.y = 0.5;
  const head = limb(0.3, 0.28, 0.3, 0xd9a986, 0, 0.26, 0.85);
  const cap = limb(0.34, 0.1, 0.32, 0x14203a, 0, 0.42, 0.85);
  const pool = new THREE.Mesh(
    new THREE.CircleGeometry(0.85, 20),
    new THREE.MeshBasicMaterial({ color: 0x8a0f0f, transparent: true, opacity: 0.85 }),
  );
  pool.rotation.x = -Math.PI / 2;
  pool.position.set(0.1, 0.02, 0.1);
  pool.scale.set(1.4, 1, 1);
  g.add(body, head, cap, pool);
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
