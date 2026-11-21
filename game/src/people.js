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
  // glance and never blends into a container wall
  const shirt = opts.hivis ? mat(0xff7a1a, 0.8) : mat(SHIRTS[Math.floor(rnd() * SHIRTS.length)], 0.8);
  const pants = mat(PANTS[Math.floor(rnd() * PANTS.length)], 0.85);
  const hair = mat(HAIRS[Math.floor(rnd() * HAIRS.length)], 0.9);
  const shoe = mat(SHOES[Math.floor(rnd() * SHOES.length)], 0.6);
  const h = 1.55 + rnd() * 0.3;
  const s = scale * (h / 1.7);
  const shorts = rnd() < 0.35;
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

// A dock worker: hi-vis orange vest, reflective stripes, yellow hard hat.
// Same grounded rig as a pedestrian (feet reach y = 0), so the docks crew
// stands ON the apron, never on a car, and reads at a glance.
export function makeWorker(seed = 1, scale = 1) {
  return makePerson(seed, scale, { hivis: true });
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
