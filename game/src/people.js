// Coral Bay Heat — pedestrians. Detailed, proportional figures that stay
// GROUNDED: every leg pivots at the hip and its foot reaches y = 0 at rest,
// so a planted foot always touches the surface the person stands on.
// Walkers use a one-foot-planted gait (only one leg swings forward at a
// time, the other stays vertical), so no frame ever shows both feet in the
// air. Variety: skin / shirt / pants / hair / hats differ per seed, some
// wear shorts, some stand or chat instead of walking.
import * as THREE from 'three';

const SHIRTS = [0xff5d8f, 0x37e0c8, 0xffd76a, 0x6ad8ff, 0xff9d2e, 0x9d7bff, 0x7dff9a, 0xf2f2ee, 0xff6b4a, 0xe8e8e8, 0x2e8a6a];
const PANTS = [0x2a2f45, 0x4a3a28, 0x3a5a7a, 0x555555, 0x7a2d4d, 0x1e3a2a];
const SKINS = [0xe8b98a, 0xc98d5f, 0x8a5a34, 0xf0c49a, 0xa06a3f];
const HAIRS = [0x1c1c22, 0x3a1f0d, 0xd8b13a, 0x6a6a72, 0x8a2d2d, 0x111111];
const SHOES = [0x1c1c22, 0x3a2a1a, 0xf2f2ee, 0x8a2d2d, 0x2a4a6a];
const HATS = [0xff5d8f, 0xffd76a, 0x37e0c8, 0xf2f2ee, 0x2e5a8a];

function seededRnd(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function mat(color, rough = 0.8) {
  return new THREE.MeshStandardMaterial({ color, roughness: rough });
}

export function makePerson(seed = 1, scale = 1, opts = {}) {
  const rnd = seededRnd(seed);
  const g = new THREE.Group();
  const skin = mat(SKINS[Math.floor(rnd() * SKINS.length)], 0.7);
  // hi-vis dock workers: orange vest shirt, so the docks crew reads at a
  // glance and never blends into a container wall. opts.shirt forces a
  // specific shirt colour — the PLAYER shooter wears a red jacket, so
  // he reads as the player, not an NPC.
  const shirt = opts.shirt ? mat(opts.shirt, 0.8) : opts.hivis ? mat(0xff7a1a, 0.8) : mat(SHIRTS[Math.floor(rnd() * SHIRTS.length)], 0.8);
  // opts.pants forces a specific trouser colour (the police officer
  // wears navy, never the random pedestrian palette); opts.noShorts
  // forces full-length legs — no uniformed officer in shorts.
  const pants = opts.pants ? mat(opts.pants, 0.85) : mat(PANTS[Math.floor(rnd() * PANTS.length)], 0.85);
  const hair = mat(HAIRS[Math.floor(rnd() * HAIRS.length)], 0.9);
  const shoe = mat(SHOES[Math.floor(rnd() * SHOES.length)], 0.6);
  const h = 1.55 + rnd() * 0.3;
  const s = scale * (h / 1.7);
  const shorts = !opts.noShorts && rnd() < 0.35;
  const mode = rnd() < 0.55 ? 'walk' : rnd() < 0.72 ? 'stand' : 'chat';

  // ---- torso: chest + shoulder bar + waist ----
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.52, 0.24), shirt);
  torso.position.y = 1.05; torso.castShadow = true;
  g.add(torso);
  const shoulders = new THREE.Mesh(new THREE.BoxGeometry(0.47, 0.10, 0.26), shirt);
  shoulders.position.y = 1.30; shoulders.castShadow = true;
  g.add(shoulders);
  const waist = new THREE.Mesh(new THREE.BoxGeometry(0.40, 0.07, 0.23),
    mat(0x222222, 0.7));
  waist.position.y = 0.80;
  g.add(waist);

  // ---- head: rounded, with one of five hair/hat styles ----
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.135, 12, 10), skin);
  head.scale.set(1, 1.18, 1.02);
  head.position.y = 1.50; head.castShadow = true;
  g.add(head);
  const style = opts.hivis ? 0.95 : rnd(); // hi-vis workers wear a hard hat
  if (opts.hivis) {
    // hard hat: yellow dome + brim, unmistakable at docks distance
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.155, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.55),
      mat(0xffd21a, 0.5));
    dome.position.y = 1.53;
    g.add(dome);
    const brimH = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.02, 12), mat(0xffd21a, 0.5));
    brimH.position.y = 1.55;
    g.add(brimH);
    // reflective silver stripes across the vest
    const stripeMat = mat(0xe8ecf0, 0.4);
    for (const sy of [0.95, 1.18]) {
      const st = new THREE.Mesh(new THREE.BoxGeometry(0.43, 0.05, 0.25), stripeMat);
      st.position.y = sy;
      g.add(st);
    }
  } else if (style < 0.42) {
    // short hair: cap over the crown
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.14, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.52), hair);
    cap.position.y = 1.53;
    g.add(cap);
  } else if (style < 0.62) {
    // long hair: cap + back panel to the shoulders
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.14, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), hair);
    cap.position.y = 1.53;
    g.add(cap);
    const back = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.34, 0.07), hair);
    back.position.set(0, 1.32, 0.12);
    g.add(back);
  } else if (style < 0.76) {
    // bun
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.14, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.5), hair);
    cap.position.y = 1.53;
    g.add(cap);
    const bun = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), hair);
    bun.position.set(0, 1.66, 0.06);
    g.add(bun);
  } else if (style < 0.9) {
    // baseball cap
    const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.135, 0.14, 0.09, 12),
      mat(HATS[Math.floor(rnd() * HATS.length)], 0.8));
    crown.position.y = 1.60;
    g.add(crown);
    const brim = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.02, 0.14),
      mat(HATS[Math.floor(rnd() * HATS.length)], 0.8));
    brim.position.set(0, 1.565, -0.17);
    g.add(brim);
  } else {
    // afro
    const afro = new THREE.Mesh(new THREE.SphereGeometry(0.175, 12, 10), hair);
    afro.position.y = 1.56;
    g.add(afro);
  }

  // ---- legs: hip pivots, feet reach y = 0 at rest ----
  function makeLeg(side) {
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.11, 0.78, 0);
    if (shorts) {
      const thigh = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.36, 0.17), pants);
      thigh.position.y = -0.18; thigh.castShadow = true;
      pivot.add(thigh);
      const calf = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.36, 0.14), skin);
      calf.position.y = -0.54; calf.castShadow = true;
      pivot.add(calf);
    } else {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.72, 0.16), pants);
      leg.position.y = -0.39; leg.castShadow = true;
      pivot.add(leg);
    }
    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.07, 0.27), shoe);
    foot.position.set(0, -0.745, 0.045); foot.castShadow = true;
    pivot.add(foot);
    g.add(pivot);
    return pivot;
  }
  const legL = makeLeg(-1);
  const legR = makeLeg(1);

  // ---- arms: shoulder pivots, shirt sleeve + skin forearm + hand ----
  function makeArm(side) {
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.27, 1.28, 0);
    const sleeve = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.26, 0.12), shirt);
    sleeve.position.y = -0.13; sleeve.castShadow = true;
    pivot.add(sleeve);
    const fore = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.24, 0.11), skin);
    fore.position.y = -0.38; fore.castShadow = true;
    pivot.add(fore);
    const hand = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.09, 0.10), skin);
    hand.position.y = -0.53;
    pivot.add(hand);
    g.add(pivot);
    return pivot;
  }
  const armL = makeArm(-1);
  const armR = makeArm(1);

  // ---- pose ----
  if (mode === 'stand') {
    // feet together, arms relaxed at the sides
    legL.position.x = -0.09; legR.position.x = 0.09;
    armL.rotation.x = 0.06; armR.rotation.x = 0.06;
  } else if (mode === 'chat') {
    // feet together, one hand raised mid-gesture
    legL.position.x = -0.09; legR.position.x = 0.09;
    armR.rotation.x = -0.85;
    armR.rotation.z = -0.25;
    armL.rotation.x = 0.15;
  } else {
    // mid-stride start pose: one leg forward, one planted — never both airborne
    legL.rotation.x = 0.38;
    armR.rotation.x = -0.32;
    armL.rotation.x = 0.30;
  }

  g.scale.setScalar(s);
  g.userData.phase = rnd() * Math.PI * 2;
  g.userData.walkSpeed = 0.4 + rnd() * 0.5;
  g.userData.mode = mode;
  g.userData.groundY = 0;
  g.userData.legL = legL; g.userData.legR = legR;
  g.userData.armL = armL; g.userData.armR = armR;
  g.userData.head = head;
  return g;
}

// A GUNMAN in a two-handed aiming stance — the beach gunfight's hero.
// Built on the grounded pedestrian rig, then re-posed: braced legs (one
// forward), BOTH arms extended level in front of the chest, and a chunky
// dark pistol clamped in the hands so the WEAPON reads at 15 m, not just
// the flash. A muzzleTip anchor rides at the barrel mouth so the staging
// code can plant a muzzle flash exactly on the gun. Static — never added
// to the animated crowd, so animateCrowd never fights the pose.
export function makeShooter(seed = 7, opts = {}) {
  const g = makePerson(seed, 1, opts);
  const u = g.userData;
  // braced stance: left leg forward, right leg back, feet planted
  u.legL.rotation.x = 0.30;
  u.legR.rotation.x = -0.18;
  u.legL.position.x = -0.11;
  u.legR.position.x = 0.11;
  // both arms dead level forward (rotation.x +1.45 swings a hanging arm
  // up to horizontal, pointing -Z, the figure's facing direction) and
  // angled INWARD (rotation.z ∓0.38) so both hands converge on the one
  // gun instead of pointing 0.54 m apart, parallel, at nothing.
  u.armL.rotation.x = 1.42;
  u.armR.rotation.x = 1.42;
  u.armL.rotation.z = 0.38;
  u.armR.rotation.z = -0.38;
  // chunky pistol in the right hand, slide forward, grip down: a
  // DARK GUNMETAL slide (fix round 5, v15.1) so the gun reads as a
  // dark silhouette AGAINST the bright muzzle flash behind it — the
  // old bright-steel slide washed out to white inside the flash
  // bloom and the pistol vanished entirely. 0.56 long and 0.11 tall
  // so it is a visible shape at 15 m, with a dark barrel ring at
  // the muzzle so the eye finds it. The gun meshes render AFTER
  // the additive flash sprites (renderOrder 10, transparent pass
  // with depthWrite on) so the silhouette paints OVER the bloom
  // instead of the bloom painting over the gun.
  //
  // FIX ROUND 5 (v15.2) — the gun is mounted on the FIGURE, not on
  // the arm pivot: the arm's local -Z is VERTICAL once the arm is
  // pitched forward (rotation.x 1.42), so a gun parented to the arm
  // with its slide along local Z stood on end like a flagpole, its
  // muzzle a third of a metre above the hands, and the whole pistol
  // hid behind the shooter's own head from the rear camera. That —
  // not the flash — was why the pistol never read. On the figure the
  // slide lies level along figure -Z (the aim line), the grip hangs
  // below the slide's rear right where the converged hands are, and
  // the muzzleTip anchor rides at the true barrel mouth.
  const gunMetal = new THREE.MeshStandardMaterial({ color: 0x14161a, roughness: 0.35, metalness: 0.85 });
  const slideMetal = new THREE.MeshStandardMaterial({ color: 0x17191d, roughness: 0.4, metalness: 0.7 });
  for (const m of [gunMetal, slideMetal]) {
    m.transparent = true;
    m.depthWrite = true;
  }
  const gun = new THREE.Group();
  const slide = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.11, 0.56), slideMetal);
  slide.renderOrder = 10;
  gun.add(slide);
  const barrelRing = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.03, 10),
    new THREE.MeshStandardMaterial({ color: 0x17191d, roughness: 0.4, metalness: 0.7, transparent: true, depthWrite: true }));
  barrelRing.renderOrder = 10;
  barrelRing.rotation.x = Math.PI / 2;
  barrelRing.position.set(0, 0, -0.29);
  gun.add(barrelRing);
  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.15, 0.07), gunMetal);
  grip.renderOrder = 10;
  grip.position.set(0, -0.09, 0.10);
  grip.rotation.x = 0.25;
  gun.add(grip);
  // level, on the aim line, between the converged hands: the hands
  // meet at figure (±0.07, 1.21, -0.49), so the slide (z -0.27 to
  // -0.83) runs forward from the hands and the grip (y 1.12, z -0.45)
  // drops right under them — a two-handed grip, not a gun floating
  // past the hands.
  gun.position.set(0, 1.21, -0.55);
  g.add(gun);
  // left hand meets the grip from below, closing the two-handed grip:
  // +0.12 local x walks it from the left shoulder across to the gun,
  // which the inward arm angle carries to figure-centre.
  const gripHand = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.09, 0.10),
    new THREE.MeshStandardMaterial({ color: 0xe8b98a, roughness: 0.7 }));
  gripHand.position.set(0.12, -0.55, -0.06);
  u.armL.add(gripHand);
  const tip = new THREE.Object3D();
  tip.position.set(0, 0, -0.32);
  gun.add(tip);
  g.userData.muzzleTip = tip;
  g.userData.gun = gun;
  return g;
}

// A POLICE OFFICER in a two-handed aiming stance — the shootout's
// target in fix round 5 (v15.2): the player is in a stand-off with the
// POLICE now, no gang rivals. Built on the same aiming rig as
// makeShooter (so the pistol, muzzleTip anchor and stance are
// identical), then dressed as CBPD: dark navy uniform shirt +
// trousers (forced, never the random pedestrian palette), full-length
// legs, a navy peaked cap with a gold band, and a gold badge on the
// chest. The officer faces the player, so the camera sees his FRONT:
// cap, badge and navy uniform all read as police at a glance.
//
// FIX ROUND 6 (v15.2) — the figure now reads AS POLICE, not as a
// dark silhouette: he is 1.3x LIFE SIZE (a ~2.2 m hero-scale officer,
// so at shootout distance he stands ~120 px tall, not ~60), and the
// uniform carries every marker a real uniform has, all oversized and
// gold-on-navy or white-on-navy so they survive a glance: a white
// shirt V + black tie at the collar, gold shoulder boards, a wide
// gold duty belt with gold buckle and pouches, a big gold chest
// badge, a white POLICE chest patch (unlit canvas texture, so the
// letters stay readable in dusk light), a taller gold cap band with
// a big gold cap badge, and gold sleeve stripes.
function policePatchTexture() {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = '#101c33'; g.fillRect(0, 0, 256, 64);
  g.strokeStyle = '#ffd21a'; g.lineWidth = 4;
  g.strokeRect(3, 3, 250, 58);
  g.fillStyle = '#ffffff';
  g.font = 'bold 40px Arial'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText('POLICE', 128, 34);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function makePoliceOfficer(seed = 21) {
  const g = makeShooter(seed, { shirt: 0x22345c, pants: 0x1e2a44, noShorts: true });
  // hero scale: 1.3x, so the uniform reads at a glance from the
  // over-shoulder camera. Feet stay on the ground (scale is about the
  // group origin at y = 0); the gun and muzzleTip scale with him.
  g.scale.multiplyScalar(1.3);
  const navy = new THREE.MeshStandardMaterial({ color: 0x1e2a44, roughness: 0.75 });
  // FIX ROUND 6b: the gold carries a warm emissive lift (0.5), so the
  // badge, cap band, shoulder boards and buckle still read gold when
  // the officer's front is in shade — the dusk sun lights his back,
  // and unlit gold went near-black in the first fix-6 capture.
  const gold = new THREE.MeshStandardMaterial({ color: 0xffd21a, roughness: 0.35, metalness: 0.7, emissive: 0x8a6a00, emissiveIntensity: 0.5 });
  const white = new THREE.MeshStandardMaterial({ color: 0xf2f2ee, roughness: 0.7, emissive: 0xffffff, emissiveIntensity: 0.22 });
  const black = new THREE.MeshStandardMaterial({ color: 0x111216, roughness: 0.6 });
  // white shirt V at the collar + black tie: the white triangle at the
  // throat is the first thing the eye finds on a navy uniform
  const shirtV = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.14, 0.02), white);
  shirtV.position.set(0, 1.36, -0.135);
  g.add(shirtV);
  const tie = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.16, 0.02), black);
  tie.position.set(0, 1.26, -0.14);
  g.add(tie);
  // gold shoulder boards (epaulettes) on both shoulders
  for (const sx of [-0.20, 0.20]) {
    const board = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.025, 0.16), gold);
    board.position.set(sx, 1.345, 0);
    g.add(board);
  }
  // wide black duty belt with a gold buckle and side pouches — the
  // horizontal black band breaks the navy torso in two at a glance
  const belt = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.09, 0.27), black);
  belt.position.set(0, 0.82, 0);
  g.add(belt);
  const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, 0.02), gold);
  buckle.position.set(0, 0.82, -0.14);
  g.add(buckle);
  for (const px of [-0.17, 0.17]) {
    const pouch = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.10, 0.06), black);
    pouch.position.set(px, 0.82, -0.13);
    g.add(pouch);
  }
  // gold sleeve stripes, parented to the ARM pivots (not static boxes):
  // the arms are pitched forward into the aim, so a static stripe at
  // the old upper-arm spot would float in empty air beside the torso.
  // On the pivot the stripe rides the sleeve wherever the arm points.
  for (const arm of [g.userData.armL, g.userData.armR]) {
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.04, 0.14), gold);
    stripe.position.set(0, -0.13, 0);
    arm.add(stripe);
  }
  // peaked cap: navy crown over the hair, gold band around its base,
  // brim jutting forward over the face — the silhouette that says
  // "police" before the badge does. The crown sits high (y 1.62) so
  // it covers the hair cap underneath instead of letting it poke out.
  // FIX ROUND 6: the band is TALLER (0.075, was 0.05) and the cap
  // badge BIGGER (0.055, was 0.035) — at 120 px the gold band is the
  // officer's headline, and it has to be unmissable.
  const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.145, 0.15, 0.10, 12), navy);
  crown.position.y = 1.62;
  crown.castShadow = true;
  g.add(crown);
  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.153, 0.153, 0.075, 12), gold);
  band.position.y = 1.575;
  g.add(band);
  const capBadge = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.02, 10), gold);
  capBadge.rotation.x = Math.PI / 2;
  capBadge.position.set(0, 1.62, -0.15);
  g.add(capBadge);
  const brim = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.02, 0.15), navy);
  brim.position.set(0, 1.585, -0.19);
  g.add(brim);
  // gold badge on the RIGHT chest (his right, screen-left): the
  // muzzle flash blooms across his left chest, so the badge sits
  // where it stays clear of the flash — FIX ROUND 6: bigger
  // (0.18 x 0.20, was 0.14 x 0.16) so the gold reads at a glance.
  const badge = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.20, 0.02), gold);
  badge.position.set(-0.11, 1.18, -0.13);
  g.add(badge);
  // white POLICE chest patch across the chest, under the badge line:
  // an unlit canvas texture, so the letters stay bright white in dusk
  // light instead of going dark with the navy cloth. This is the
  // single most legible police marker at shootout distance.
  const patch = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.085),
    new THREE.MeshBasicMaterial({ map: policePatchTexture() }));
  patch.position.set(0, 1.02, -0.135);
  patch.rotation.y = Math.PI;
  g.add(patch);
  return g;
}

// A dock worker: hi-vis orange vest, reflective stripes, yellow hard hat.
// Same grounded rig as a pedestrian (feet reach y = 0), so the docks crew
// stands ON the apron, never on a car, and reads at a glance.
export function makeWorker(seed = 1, scale = 1) {
  return makePerson(seed, scale, { hivis: true });
}

// A COLLAPSED NPC — shot in a gunfight, lying flat on the ground
// (terkapar). Built lying down on purpose, never a standing figure tipped
// over: torso flat, head at one end, legs stretched out, one arm flung
// wide, the other bent across the chest, a dropped pistol by the open
// hand and a small dark blood pool under the torso. The long axis is
// local Z (head -Z, feet +Z); rotate the group to lay it broadside to
// the camera. Static — never added to the animated crowd.
// opts.police dresses the body as a FALLEN POLICE OFFICER (fix round 5,
// v15.2): navy uniform, gold badge on the chest, and his peaked cap
// lying on the sand beside his head, knocked off as he fell.
export function makeFallenPerson(seed = 1, opts = {}) {
  const rnd = seededRnd(seed);
  const g = new THREE.Group();
  const skin = mat(SKINS[Math.floor(rnd() * SKINS.length)], 0.7);
  // Fix round 5 (v14): the shirt is FORCED bright white and the pants
  // forced dark navy — the seeded random shirt could be tan or brown
  // and vanish into the sand. A white-shirted body on tan sand reads
  // at a glance; the dark blood pool and the dropped pistol finish it.
  // Fix round 5 (v15.2): opts.police swaps the white shirt for the
  // same dark navy uniform as the standing officer, so the fallen body
  // reads as police too — the navy body on tan sand, the gold badge
  // and the cap beside him carry it.
  const shirt = opts.police ? mat(0x22345c, 0.8) : mat(0xf2f2ee, 0.8);
  const pants = mat(0x2a2f45, 0.85);
  const hair = mat(HAIRS[Math.floor(rnd() * HAIRS.length)], 0.9);
  const shoe = mat(SHOES[Math.floor(rnd() * SHOES.length)], 0.6);
  // torso: flat on the ground, chest up
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.24, 0.58), shirt);
  torso.position.set(0, 0.14, 0.05);
  torso.castShadow = true;
  g.add(torso);
  const shoulders = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.12, 0.26), shirt);
  shoulders.position.set(0, 0.16, -0.18);
  shoulders.castShadow = true;
  g.add(shoulders);
  // head: turned to one side, resting on the ground
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.135, 12, 10), skin);
  head.scale.set(1, 1.02, 1.18);
  head.position.set(0.06, 0.14, -0.42);
  head.rotation.y = 0.9;
  head.castShadow = true;
  g.add(head);
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.14, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), hair);
  cap.position.set(0.06, 0.16, -0.42);
  cap.rotation.y = 0.9;
  g.add(cap);
  // legs: stretched out, one slightly bent and splayed — a body that fell,
  // not a mannequin laid out straight
  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.14, 0.78), pants);
  legL.position.set(-0.11, 0.09, 0.70);
  legL.castShadow = true;
  g.add(legL);
  const legR = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.14, 0.72), pants);
  legR.position.set(0.13, 0.09, 0.68);
  legR.rotation.y = 0.16;
  legR.castShadow = true;
  g.add(legR);
  for (const [fx, fz, ry] of [[-0.11, 1.10, 0], [0.22, 1.05, 0.16]]) {
    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.10, 0.26), shoe);
    foot.position.set(fx, 0.07, fz);
    foot.rotation.y = ry;
    foot.castShadow = true;
    g.add(foot);
  }
  // left arm: THROWN UP as he fell — the one vertical element on an
  // otherwise flat body, and the reason the figure reads as a person
  // rather than a shadow on the sand. The arm rises from the ground at
  // the body's left side to ~0.50 m (hand open), leaning over the
  // torso; its lower end stays on the sand so it never floats.
  // (Euler XYZ applies Z, then Y, then X to a vector, so rotation.x
  // -1.25 after rotation.y 0.3 lifts the arm's +Z end up-and-over
  // instead of just swinging it sideways.)
  const armL = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.10, 0.52), skin);
  armL.position.set(-0.30, 0.26, -0.12);
  armL.rotation.set(-1.25, 0.3, 0);
  armL.castShadow = true;
  g.add(armL);
  const handL = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.07, 0.12), skin);
  handL.position.set(-0.22, 0.50, -0.04);
  g.add(handL);
  // right arm: bent across the chest
  const armR = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.10, 0.42), shirt);
  armR.position.set(0.22, 0.17, -0.08);
  armR.rotation.y = -0.7;
  armR.castShadow = true;
  g.add(armR);
  const handR = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.07, 0.10), skin);
  handR.position.set(0.10, 0.18, -0.24);
  g.add(handR);
  // dropped pistol on the sand by the raised arm's base — where the
  // hand was when the gun left it
  const gun = new THREE.Group();
  const gunMetal = new THREE.MeshStandardMaterial({ color: 0x1c1e22, roughness: 0.4, metalness: 0.8 });
  const slide = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.04, 0.22), gunMetal);
  gun.add(slide);
  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.10, 0.06), gunMetal);
  grip.position.set(0, -0.04, 0.07);
  gun.add(grip);
  gun.position.set(-0.58, 0.05, -0.28);
  gun.rotation.y = 0.7;
  g.add(gun);
  if (opts.police) {
    // gold badge flat on the chest — the torso's top face is y 0.26.
    // Oversized (0.12) so the gold reads at beach distance.
    const badge = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.02, 0.14),
      new THREE.MeshStandardMaterial({ color: 0xffd21a, roughness: 0.35, metalness: 0.7 }));
    badge.position.set(0.10, 0.27, 0.05);
    g.add(badge);
    // his peaked cap, knocked off as he fell, lying on the sand by
    // his head (head end is -Z): dome up, brim pointing away from
    // the body, so it reads as a cap on the ground, not a blob. The
    // gold band around the dome is the tell that it is a police cap.
    const capMat = mat(0x1e2a44, 0.75);
    const capDome = new THREE.Mesh(new THREE.SphereGeometry(0.145, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), capMat);
    capDome.position.set(-0.48, 0.03, -0.62);
    capDome.castShadow = true;
    g.add(capDome);
    const capBand = new THREE.Mesh(new THREE.CylinderGeometry(0.148, 0.148, 0.03, 12),
      new THREE.MeshStandardMaterial({ color: 0xffd21a, roughness: 0.35, metalness: 0.7 }));
    capBand.position.set(-0.48, 0.05, -0.62);
    g.add(capBand);
    const capBrim = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.02, 0.13), capMat);
    capBrim.position.set(-0.48, 0.03, -0.80);
    capBrim.rotation.y = 0.4;
    g.add(capBrim);
  }
  // FIX ROUND 6 (v15.2) — BLOOD, unmistakable at a glance. Egi asked
  // for more, and the fix-5 pool still read as a dark shadow on the
  // sand. Now it is a system, not a disc: a BIG bright-red main pool
  // (radius 0.95, brighter 0x7a0d0d, opacity 0.95) spilling onto the
  // open sand beside the navy torso; a long smear trailing toward the
  // camera side, as if he was dragged / crawled; four satellite
  // splatter blobs around the body; a small pool under the head; and
  // dark-red blood PATCHES ON THE UNIFORM itself (chest and side),
  // so the blood reads on the body as well as on the sand. Stylised
  // game blood — flat bright red, no gore detail — but it must read
  // instantly as blood, not as a shadow.
  const bloodMat = new THREE.MeshBasicMaterial({ color: 0x7a0d0d, transparent: true, opacity: 0.95 });
  const bloodDark = new THREE.MeshBasicMaterial({ color: 0x5a0808, transparent: true, opacity: 0.9 });
  const pool = new THREE.Mesh(new THREE.CircleGeometry(0.95, 20), bloodMat);
  pool.rotation.x = -Math.PI / 2;
  pool.scale.set(1.45, 0.9, 1);
  pool.position.set(0.25, 0.015, 0.05);
  g.add(pool);
  // smear trailing toward the camera side (+X), elongated
  const smear = new THREE.Mesh(new THREE.CircleGeometry(0.55, 16), bloodMat);
  smear.rotation.x = -Math.PI / 2;
  smear.scale.set(1.9, 0.55, 1);
  smear.rotation.z = 0.5;
  smear.position.set(1.15, 0.016, 0.35);
  g.add(smear);
  // satellite splatters: drops flung around the body
  for (const [sx, sz, sr] of [[-0.75, 0.55, 0.22], [0.85, -0.55, 0.18], [1.55, -0.15, 0.14], [-0.35, -0.75, 0.16], [0.45, 0.85, 0.12]]) {
    const drop = new THREE.Mesh(new THREE.CircleGeometry(sr, 12), bloodMat);
    drop.rotation.x = -Math.PI / 2;
    drop.position.set(sx, 0.016, sz);
    g.add(drop);
  }
  // small pool under the head (head end is -Z)
  const headPool = new THREE.Mesh(new THREE.CircleGeometry(0.30, 14), bloodDark);
  headPool.rotation.x = -Math.PI / 2;
  headPool.scale.set(1.3, 0.9, 1);
  headPool.position.set(0.06, 0.016, -0.55);
  g.add(headPool);
  // blood ON the uniform: dark-red patches on the chest and the side
  // of the torso (thin boxes just proud of the cloth, top face y 0.26)
  const chestBlood = new THREE.Mesh(new THREE.BoxGeometry(0.30, 0.02, 0.34), bloodDark);
  chestBlood.position.set(-0.06, 0.265, 0.12);
  chestBlood.rotation.y = 0.2;
  g.add(chestBlood);
  const sideBlood = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.16, 0.30), bloodDark);
  sideBlood.position.set(-0.23, 0.16, 0.10);
  g.add(sideBlood);
  return g;
}

// Scatter walkers along a line segment (sidewalk, beach, pier).
// Each spot may carry y = the surface height (pier deck 0.41, sand 0.04);
// the crowd keeps that ground height forever — animation only bobs on top.
// A spot may also carry hivis: true for a dock worker.
export function makeCrowd(scene, spots) {
  const crowd = new THREE.Group();
  spots.forEach((sp, i) => {
    const p = sp.hivis ? makeWorker(1000 + i * 17, sp.scale || 1) : makePerson(1000 + i * 17, sp.scale || 1);
    p.position.set(sp.x, sp.y || 0, sp.z);
    p.userData.groundY = sp.y || 0;
    p.rotation.y = sp.rot ?? (Math.random() * Math.PI * 2);
    crowd.add(p);
  });
  scene.add(crowd);
  return crowd;
}

// Animate the crowd so it reads alive in motion — without ever leaving the
// ground: walkers keep one foot planted at all times, the body bob rides on
// top of the stored ground height, standers sway, chatters gesture.
export function animateCrowd(crowd, t) {
  crowd.children.forEach((p) => {
    const u = p.userData;
    const gy = u.groundY || 0;
    if (u.mode === 'walk') {
      const ph = u.phase + t * u.walkSpeed * 4;
      // one-foot-planted gait: each leg only swings forward from vertical,
      // the other stays planted, so a foot is on the ground in every frame
      const swingL = Math.max(0, Math.sin(ph)) * 0.45;
      const swingR = Math.max(0, Math.sin(ph + Math.PI)) * 0.45;
      u.legL.rotation.x = swingL;
      u.legR.rotation.x = swingR;
      u.armL.rotation.x = -swingR * 0.8;
      u.armR.rotation.x = -swingL * 0.8;
      // NO vertical bob: the planted foot must stay exactly on the ground
      // in every frame — the leg swing alone reads as walking
      p.position.y = gy;
      p.rotation.z = Math.sin(ph) * 0.015;
    } else if (u.mode === 'stand') {
      p.position.y = gy;
      u.armL.rotation.x = 0.06 + Math.sin(t * 0.8 + u.phase) * 0.04;
      u.armR.rotation.x = 0.06 + Math.cos(t * 0.7 + u.phase) * 0.04;
      p.rotation.z = Math.sin(t * 0.5 + u.phase) * 0.01;
    } else {
      // chat: raised hand gestures, head nods
      p.position.y = gy;
      u.armR.rotation.x = -0.85 + Math.sin(t * 1.4 + u.phase) * 0.18;
      u.armL.rotation.x = 0.15 + Math.sin(t * 1.1 + u.phase) * 0.08;
      u.head.rotation.x = Math.sin(t * 1.2 + u.phase) * 0.10;
      u.head.rotation.y = Math.sin(t * 0.6 + u.phase) * 0.12;
    }
  });
}
