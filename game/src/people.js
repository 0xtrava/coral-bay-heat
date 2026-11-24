// People for Coral Bay Heat: the player in the red jacket with a
// pistol held out in front, CBPD officers in navy with light-blue
// shirts, gold badges and red markers, and the island's pedestrians
// and beachgoers. All low-poly box figures with a simple leg-swing
// walk — but the player and the officers read at a glance, and the
// WEAPONS read too: the player and every officer hold a BIG silver
// pistol out in front, in both hands, so the shootout reads as an
// armed standoff from any angle — including from behind the player,
// where the gun sits at her right side, past her shoulder, bright
// metal against the dark.
import * as THREE from 'three';
import { bloodTexture } from './materials.js';

// A text decal: bold letters on a transparent plane (POLICE on a
// chest), so the paint/uniform shows through and only the letters read.
function textDecal(text, w, h, fg = '#f4f0e2', fontPx = 40) {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 128;
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, 512, 128);
  ctx.fillStyle = fg;
  ctx.font = `bold ${fontPx}px Arial, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 256, 66);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    new THREE.MeshStandardMaterial({ map: t, transparent: true, roughness: 0.6, metalness: 0.1 }),
  );
}

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
    // aim pose: both arms held out in front, gun forward — the right
    // arm leads the gun, the left arm crosses to support it
    u.armL.rotation.x = -1.25;
    u.armR.rotation.x = -1.25;
    u.armL.rotation.z = 0.22;
    u.armR.rotation.z = -0.1;
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

// A BIG pistol, held out in front: a dark grip, a long bright silver
// slide that catches the light, a dark barrel tip, a trigger guard
// and a front sight. Long enough and bright enough to read at a
// glance — this is the weapon Egi asked to see. The slide is bright
// light-grey with LOW metalness: a high-metalness silver renders
// almost black in a scene with no environment map, which is why the
// old gun vanished against the sand. Round 8: the silver is hotter
// (emissive 1.4) and the gun is scaled up at the player/officer, so
// it reads even in a bright frame. Round 9: the silver is hotter
// still (emissive 2.0) and the player's gun is BIGGER (3.4x) — and
// it rides on the CAMERA side, so the shootout lens sees it.
function pistol() {
  const g = new THREE.Group();
  const dark = new THREE.MeshStandardMaterial({ color: 0x1c1c22, roughness: 0.5, metalness: 0.4 });
  const silver = new THREE.MeshStandardMaterial({ color: 0xe8ecf0, roughness: 0.25, metalness: 0.25, emissive: 0x77777a, emissiveIntensity: 2.0 });
  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.26, 0.14), dark);
  grip.position.set(0, 0, 0);
  grip.castShadow = true;
  const slide = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.09, 0.6), silver);
  slide.position.set(0, 0.15, 0.2);
  slide.castShadow = true;
  const barrel = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, 0.14), dark);
  barrel.position.set(0, 0.15, 0.54);
  const guard = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, 0.16), dark);
  guard.position.set(0, 0.03, 0.16);
  const sight = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.05, 0.04), silver);
  sight.position.set(0, 0.22, 0.46);
  g.add(grip, slide, barrel, guard, sight);
  return g;
}

// The player: Mara Voss in a bright red jacket, black hair, a BIG
// silver pistol held out at her right side in both hands — big and
// readable, and the gun sits past her right shoulder so it reads
// even from behind her, where the shootout camera sits.
export function makePlayer() {
  const g = makeWalker({ float: () => 0 }, 0xd21f1f, 0x1c1c22);
  // the gun rides at her hand, forward and high, bright metal —
  // BIG (3.4x) so it reads at a glance from the shootout camera,
  // and on the CAMERA side (local x -0.72, not +0.55): fix8 put it
  // on the far side, where the player's own torso hid it from the
  // shootout lens — the line from the lens to the gun passed
  // straight through her chest. Mirrored to the east side it clears
  // the torso and the long silver slide shows its SIDE to the
  // behind-camera, angled across her body (rotation +0.55) so the
  // slide reads as a pistol, not a speck.
  const gun = pistol();
  gun.scale.setScalar(3.4);
  gun.position.set(-0.72, 1.28, 0.7);
  gun.rotation.y = 0.55;
  g.add(gun);
  // a lighter red chest panel so the jacket reads as a jacket, not a slab
  const chest = limb(0.4, 0.4, 0.04, 0xe83a3a, 0, 1.12, 0.16);
  g.add(chest);
  // a dark belt and a white sleeve stripe, so the silhouette reads
  const belt = limb(0.54, 0.08, 0.32, 0x1c1c22, 0, 0.78, 0);
  g.add(belt);
  const stripe = limb(0.16, 0.5, 0.02, 0xf4f0e2, -0.34, 1.1, 0.16);
  g.add(stripe);
  g.userData.kind = 'player';
  g.userData.aim = true;
  g.scale.setScalar(1.18);
  return g;
}

// A CBPD officer: navy uniform with a light-blue shirt front, white
// cap band, big gold badge, POLICE across the chest, a tall red
// marker floating above so the player always knows who to shoot —
// and a BIG silver pistol held out in front in an aim pose, weapon
// drawn, aimed at the player. The chest text and big badge are what
// make him read as police at a glance instead of a dark box.
export function makeOfficer() {
  const g = new THREE.Group();
  const torso = limb(0.54, 0.62, 0.3, 0x1c2a4a, 0, 1.08, 0);
  const shirt = limb(0.44, 0.52, 0.04, 0x8ab8f0, 0, 1.1, 0.16);
  const head = limb(0.3, 0.3, 0.28, 0xd9a986, 0, 1.56, 0);
  const cap = limb(0.34, 0.1, 0.32, 0x14203a, 0, 1.74, 0);
  const band = limb(0.36, 0.04, 0.34, 0xf4f0e2, 0, 1.7, 0);
  const visor = limb(0.3, 0.04, 0.16, 0x0c0c10, 0, 1.7, 0.2);
  const badge = limb(0.26, 0.28, 0.02, 0xffd34d, -0.14, 1.24, 0.18);
  const chestMark = textDecal('POLICE', 0.44, 0.12, '#f4f0e2', 44);
  chestMark.position.set(0, 1.28, 0.17);
  const belt = limb(0.56, 0.08, 0.32, 0x0c0c10, 0, 0.78, 0);
  const armL = limb(0.14, 0.58, 0.16, 0x1c2a4a, -0.34, 1.32, 0);
  const armR = limb(0.14, 0.58, 0.16, 0x1c2a4a, 0.34, 1.32, 0);
  const legL = limb(0.18, 0.72, 0.2, 0x14203a, -0.13, 0.72, 0);
  const legR = limb(0.18, 0.72, 0.2, 0x14203a, 0.13, 0.72, 0);
  armL.geometry.translate(0, -0.2, 0);
  armR.geometry.translate(0, -0.2, 0);
  legL.geometry.translate(0, -0.3, 0);
  legR.geometry.translate(0, -0.3, 0);
  // the officer's pistol, held out at his right hand in the aim pose
  // — BIG (1.8x) so the weapon reads, not a speck of grey
  const gun = pistol();
  gun.scale.setScalar(1.8);
  gun.position.set(0.34, 1.18, 0.52);
  gun.rotation.y = -0.12;
  // red marker: a tall downward cone that bobs above the head
  const marker = new THREE.Mesh(
    new THREE.ConeGeometry(0.3, 0.65, 4),
    new THREE.MeshBasicMaterial({ color: 0xff2a2a }),
  );
  marker.rotation.x = Math.PI;
  marker.position.y = 2.3;
  g.add(torso, shirt, head, cap, band, visor, badge, chestMark, belt, armL, armR, legL, legR, gun, marker);
  g.userData = { kind: 'officer', walkPhase: 0, armL, armR, legL, legR, marker, hp: 3, aim: true };
  g.scale.setScalar(1.15);
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
    new THREE.PlaneGeometry(5.2, 5.2),
    new THREE.MeshBasicMaterial({ map: bloodTexture(), transparent: true, opacity: 1.0, depthWrite: false }),
  );
  pool.rotation.x = -Math.PI / 2;
  pool.position.set(0.1, 0.03, 0.1);
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
