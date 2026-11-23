// The island of Coral Bay: roads, beach, sea, pier, marina, hotels and
// the sunset sky. Everything is placed on a road grid, and every
// building collider stays inside its block, clear of the roads — a
// collider on a mission route wedged a car in an earlier build and
// that mistake is not repeated.
import * as THREE from 'three';
import { Rng } from './rng.js';
import {
  PALETTE, facadeTexture, signTexture, awningTexture, roadTexture,
  sandTexture, seaTexture, skyTexture, glowTexture, canvasTexture,
} from './materials.js';

// Road grid: avenues run north-south, streets east-west. Road half-width 4.
export const AVENUES = [-72, -48, -24, 0, 12, 24, 48, 72, 96];
export const STREETS = [-96, -72, -48, -24, 0, 24, 48, 72, 96, 120];
export const ROAD_HALF = 4;
export const LAND = { minX: -100, maxX: 134, minZ: -112, maxZ: 132 };
export const BEACH_X0 = 108; // sand starts here; sea past x = 134

export const DISTRICTS = [
  { name: 'DOWNTOWN', x0: -72, x1: 24, z0: -96, z1: 0 },
  { name: 'NORTHSIDE', x0: -48, x1: 48, z0: -108, z1: -72 },
  { name: 'OLD TOWN', x0: -72, x1: 0, z0: 0, z1: 72 },
  { name: 'THE DOCKS', x0: -96, x1: -24, z0: 72, z1: 132 },
  { name: 'MARINA BEACH', x0: 48, x1: 134, z0: -48, z1: 72 },
  { name: 'PIER 9', x0: 72, x1: 134, z0: -72, z1: -24 },
  { name: 'GARAGE', x0: -48, x1: 0, z0: 72, z1: 120 },
];

export function districtAt(x, z) {
  for (const d of DISTRICTS) {
    if (x >= d.x0 && x < d.x1 && z >= d.z0 && z < d.z1) return d.name;
  }
  return 'CORAL BAY';
}

// Nearest point on the road grid (used by the autopilot's wedge escape).
export function nearestRoadPoint(x, z) {
  let bx = AVENUES[0], bd = Infinity;
  for (const a of AVENUES) { const d = Math.abs(a - x); if (d < bd) { bd = d; bx = a; } }
  let bz = STREETS[0]; bd = Infinity;
  for (const s of STREETS) { const d = Math.abs(s - z); if (d < bd) { bd = d; bz = s; } }
  // snap to the closer of the two axes
  if (Math.abs(bx - x) < Math.abs(bz - z)) return { x: bx, z };
  return { x, z: bz };
}

function plane(w, d, mat, x, y, z, ry = 0) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat);
  m.rotation.x = -Math.PI / 2;
  m.rotation.z = ry;
  m.position.set(x, y, z);
  m.receiveShadow = true;
  return m;
}

function box(w, h, d, mat, x, y, z) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

export function buildCity(scene, seed = 1) {
  const rng = new Rng(seed);
  const colliders = [];
  const group = new THREE.Group();
  scene.add(group);

  // ---- sky dome, sun, halo, clouds ----
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(700, 24, 16),
    new THREE.MeshBasicMaterial({ map: skyTexture(), side: THREE.BackSide, fog: false }),
  );
  sky.position.y = 0;
  group.add(sky);
  const sunGlow = new THREE.Mesh(
    new THREE.PlaneGeometry(150, 150),
    new THREE.MeshBasicMaterial({
      map: glowTexture('rgba(255,246,200,1)', 'rgba(255,170,80,0.55)'),
      transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false,
    }),
  );
  sunGlow.position.set(60, 78, -520);
  sunGlow.lookAt(0, 40, 0);
  group.add(sunGlow);
  const sunDisc = new THREE.Mesh(
    new THREE.CircleGeometry(26, 32),
    new THREE.MeshBasicMaterial({ color: PALETTE.sunCore, fog: false }),
  );
  sunDisc.position.set(60, 78, -519);
  sunDisc.lookAt(0, 40, 0);
  group.add(sunDisc);
  // soft pink clouds, flat billboards high up
  const cloudMat = new THREE.MeshBasicMaterial({ color: 0xffc9d9, transparent: true, opacity: 0.5, fog: false });
  for (let i = 0; i < 14; i++) {
    const cw = rng.range(60, 150);
    const cloud = new THREE.Mesh(new THREE.PlaneGeometry(cw, cw * 0.22), cloudMat);
    cloud.position.set(rng.range(-420, 420), rng.range(120, 220), rng.range(-480, -120));
    cloud.lookAt(0, 60, 0);
    group.add(cloud);
  }

  // ---- ground: grass base, sea, beach ----
  const seaMat = new THREE.MeshStandardMaterial({ map: seaTexture(), roughness: 0.35, metalness: 0.1 });
  seaMat.map.repeat.set(8, 8);
  const sea = plane(1100, 900, seaMat, 150, -0.6, 40);
  group.add(sea);
  const landMat = new THREE.MeshStandardMaterial({ color: 0x4a6b46, roughness: 1 });
  const land = plane(LAND.maxX - LAND.minX + 40, LAND.maxZ - LAND.minZ + 40, landMat, 17, -0.05, 10);
  group.add(land);
  const sandMat = new THREE.MeshStandardMaterial({ map: sandTexture(), roughness: 1 });
  sandMat.map.repeat.set(3, 6);
  const beach = plane(134 - BEACH_X0, LAND.maxZ - LAND.minZ, sandMat, (134 + BEACH_X0) / 2, 0.02, 10);
  group.add(beach);

  // ---- roads: asphalt strips with dashed centre lines ----
  const asphalt = roadTexture();
  const roadMat = new THREE.MeshStandardMaterial({ map: asphalt, roughness: 0.95 });
  const roadLen = LAND.maxZ - LAND.minZ;
  for (const ax of AVENUES) {
    const t = asphalt.clone();
    t.needsUpdate = true;
    t.repeat.set(1, roadLen / 16);
    const m = plane(8, roadLen, new THREE.MeshStandardMaterial({ map: t, roughness: 0.95 }), ax, 0.05, 10);
    group.add(m);
  }
  const roadWid = LAND.maxX - LAND.minX;
  for (const sz of STREETS) {
    const t = asphalt.clone();
    t.needsUpdate = true;
    t.repeat.set(roadWid / 16, 1);
    const m = plane(roadWid, 8, new THREE.MeshStandardMaterial({ map: t, roughness: 0.95 }), 17, 0.06, sz);
    m.rotation.z = Math.PI / 2;
    group.add(m);
  }
  // sidewalks: pale strips flanking every road
  const walkMat = new THREE.MeshStandardMaterial({ color: PALETTE.sidewalk, roughness: 1 });
  for (const ax of AVENUES) {
    group.add(plane(2.5, roadLen, walkMat, ax - 5.2, 0.03, 10));
    group.add(plane(2.5, roadLen, walkMat, ax + 5.2, 0.03, 10));
  }
  for (const sz of STREETS) {
    group.add(plane(roadWid, 2.5, walkMat, 17, 0.035, sz - 5.2));
    group.add(plane(roadWid, 2.5, walkMat, 17, 0.035, sz + 5.2));
  }

  // ---- Pier 9: wooden deck out into the sea at z = -48 ----
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x8a6a44, roughness: 0.9 });
  const pier = box(38, 0.5, 7, woodMat, 114, 0.25, -48);
  group.add(pier);
  for (let x = 98; x <= 130; x += 8) {
    const post = new THREE.Mesh(
      new THREE.CylinderGeometry(0.35, 0.35, 3, 8),
      new THREE.MeshStandardMaterial({ color: 0x5f4630, roughness: 1 }),
    );
    post.position.set(x, -0.8, -51.2);
    group.add(post);
    const post2 = post.clone();
    post2.position.z = -44.8;
    group.add(post2);
  }
  // pier lamps
  const lampMat = new THREE.MeshBasicMaterial({ color: 0xffe9a8 });
  for (let x = 100; x <= 128; x += 14) {
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.12, 4, 6),
      new THREE.MeshStandardMaterial({ color: 0x2a2a30, roughness: 0.7 }),
    );
    pole.position.set(x, 2.4, -50.5);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 8), lampMat);
    bulb.position.set(x, 4.5, -50.5);
    group.add(pole, bulb);
  }

  return { group, colliders, rng };
}

// ---- buildings: one or two per block, colliders inside the block ----
const WALL_COLORS = [
  PALETTE.wallPink, PALETTE.wallPeach, PALETTE.wallCream, PALETTE.wallTerra,
  PALETTE.wallTeal, PALETTE.wallLavender, PALETTE.wallYellow,
];

function addBuilding(group, colliders, rng, cx, cz, w, d, h, color, sign) {
  const mat = new THREE.MeshStandardMaterial({
    map: facadeTexture(color, 0.45, rng), roughness: 0.85,
  });
  const b = box(w, h, d, mat, cx, h / 2, cz);
  group.add(b);
  // flat roof cap, slightly darker
  const cap = box(w + 0.4, 0.5, d + 0.4,
    new THREE.MeshStandardMaterial({ color: 0x3a3238, roughness: 1 }), cx, h + 0.2, cz);
  group.add(cap);
  colliders.push({ minX: cx - w / 2, maxX: cx + w / 2, minZ: cz - d / 2, maxZ: cz + d / 2 });
  if (sign) {
    const signMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(sign.w, sign.h),
      new THREE.MeshBasicMaterial({ map: signTexture(sign.text, sign.sub, '#ffe9a8', '#1c2438') }),
    );
    // face the street to the south (toward the title camera)
    signMesh.position.set(cx, h * 0.82, cz + d / 2 + 0.15);
    group.add(signMesh);
  }
  return b;
}

export function buildBlocks(state) {
  const { group, colliders, rng } = state;
  // named hotels: tall, signed, inside their blocks, clear of every road
  addBuilding(group, colliders, rng, 60, -60, 20, 14, 30, PALETTE.wallCream,
    { text: 'HOTEL CORAL', sub: '★ ★ ★ ★', w: 16, h: 4 });
  // LAGUNA RASI: inside the 24-48 block, clear of every road. It used
  // to sit centred on avenue 12 (x=12) and walled the whole avenue off
  // — a car driving up it wedged on the hotel face. Never again.
  addBuilding(group, colliders, rng, 36, -60, 12, 12, 26, PALETTE.wallPink,
    { text: 'LAGUNA RASI', sub: 'ROOMS · POOL', w: 11, h: 3.5 });
  addBuilding(group, colliders, rng, -36, -60, 18, 13, 24, PALETTE.wallTeal,
    { text: 'PALM COURT', sub: 'SUITES', w: 14, h: 3.5 });
  // the garage: low and wide, signed
  addBuilding(group, colliders, rng, -32, 102, 16, 12, 7, PALETTE.wallTerra,
    { text: "LIO'S GARAGE", sub: 'TUNE · REPAIR', w: 13, h: 3 });
  // the gun store: small shop with a dark sign. Narrow (w=8) so it
  // clears both avenues' centrelines — at w=12 it walled off avenue
  // 12's west lane and a car driving up it wedged on the shop face.
  addBuilding(group, colliders, rng, 18, -36, 8, 10, 6, PALETTE.wallLavender,
    { text: 'AMMU-NATION', sub: 'GUNS · AMMO', w: 8, h: 2.8 });

  // fill the remaining blocks with varied buildings
  for (let ai = 0; ai < AVENUES.length - 1; ai++) {
    for (let si = 0; si < STREETS.length - 1; si++) {
      const x0 = AVENUES[ai] + ROAD_HALF + 2;
      const x1 = AVENUES[ai + 1] - ROAD_HALF - 2;
      const z0 = STREETS[si] + ROAD_HALF + 2;
      const z1 = STREETS[si + 1] - ROAD_HALF - 2;
      const bw = x1 - x0, bd = z1 - z0;
      if (bw < 6 || bd < 6) continue;
      // beach blocks stay open (sand, palms, stalls instead)
      if (x0 >= BEACH_X0 - 4) continue;
      // the docks block stays open for the M7 crate yard
      if (x0 >= -96 && x1 <= -24 && z0 >= 96) continue;
      // skip blocks already holding a named building
      const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
      if (Math.abs(cx - 60) < 14 && Math.abs(cz + 60) < 12) continue;
      if (Math.abs(cx - 36) < 12 && Math.abs(cz + 60) < 10) continue;
      if (Math.abs(cx + 36) < 13 && Math.abs(cz + 60) < 11) continue;
      if (Math.abs(cx + 32) < 12 && Math.abs(cz - 102) < 10) continue;
      if (Math.abs(cx - 18) < 10 && Math.abs(cz + 36) < 8) continue;
      if (!rng.chance(0.82)) continue; // some blocks stay plazas / parks
      const n = rng.chance(0.35) ? 2 : 1;
      for (let k = 0; k < n; k++) {
        const w = rng.range(7, Math.max(8, bw * (n === 2 ? 0.42 : 0.7)));
        const d = rng.range(7, Math.max(8, bd * 0.7));
        const bx = cx + (n === 2 ? (k === 0 ? -bw * 0.22 : bw * 0.22) : 0);
        const bz = cz + rng.range(-1, 1);
        const h = rng.range(8, 26);
        addBuilding(group, colliders, rng, bx, bz, w, d, h, rng.pick(WALL_COLORS), null);
      }
    }
  }
}

// ---- palms, beach gear, market stalls, string lights, boats ----
function makePalm(rng) {
  const g = new THREE.Group();
  const h = rng.range(5, 8);
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.22, 0.34, h, 7),
    new THREE.MeshStandardMaterial({ color: 0x6e4a2f, roughness: 1 }),
  );
  trunk.position.y = h / 2;
  trunk.rotation.z = rng.range(-0.08, 0.08);
  g.add(trunk);
  const frondMat = new THREE.MeshStandardMaterial({ color: 0x2f7d3a, roughness: 0.9, side: THREE.DoubleSide });
  for (let i = 0; i < 7; i++) {
    const frond = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 0.9), frondMat);
    const a = (i / 7) * Math.PI * 2;
    frond.position.set(Math.cos(a) * 1.4, h + 0.3, Math.sin(a) * 1.4);
    frond.rotation.y = -a + Math.PI / 2;
    frond.rotation.x = -0.5;
    g.add(frond);
  }
  const coconuts = new THREE.Mesh(
    new THREE.SphereGeometry(0.3, 8, 8),
    new THREE.MeshStandardMaterial({ color: 0x7a5230, roughness: 1 }),
  );
  coconuts.position.y = h - 0.2;
  g.add(coconuts);
  return g;
}

function makeUmbrella(rng, color) {
  const g = new THREE.Group();
  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.07, 0.07, 2.6, 6),
    new THREE.MeshStandardMaterial({ color: 0xe8e8e2, roughness: 0.8 }),
  );
  pole.position.y = 1.3;
  const top = new THREE.Mesh(
    new THREE.ConeGeometry(1.9, 0.7, 8),
    new THREE.MeshStandardMaterial({ color, roughness: 0.9, side: THREE.DoubleSide }),
  );
  top.position.y = 2.7;
  g.add(pole, top);
  return g;
}

function makeStall(rng, awningColor) {
  const g = new THREE.Group();
  const counter = new THREE.Mesh(
    new THREE.BoxGeometry(2.6, 1.0, 1.4),
    new THREE.MeshStandardMaterial({ color: 0x8a6a44, roughness: 0.95 }),
  );
  counter.position.y = 0.5;
  const awn = new THREE.Mesh(
    new THREE.PlaneGeometry(3.0, 1.8),
    new THREE.MeshStandardMaterial({ map: awningTexture(awningColor, '#f4f0e2'), side: THREE.DoubleSide, roughness: 0.9 }),
  );
  awn.rotation.x = -Math.PI / 2 + 0.35;
  awn.position.set(0, 2.3, 0.2);
  const poleL = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.4, 6),
    new THREE.MeshStandardMaterial({ color: 0x44444a, roughness: 0.8 }));
  poleL.position.set(-1.3, 1.2, 0.6);
  const poleR = poleL.clone(); poleR.position.x = 1.3;
  // goods on the counter: little coloured boxes
  for (let i = 0; i < 5; i++) {
    const good = new THREE.Mesh(
      new THREE.BoxGeometry(0.32, 0.32, 0.32),
      new THREE.MeshStandardMaterial({ color: rng.pick([0xe86a5a, 0xe8d44f, 0x7fd94f, 0xd97fb5, 0x5a8ad9]), roughness: 0.8 }),
    );
    good.position.set(-1 + i * 0.5, 1.18, rng.range(-0.3, 0.3));
    g.add(good);
  }
  g.add(counter, awn, poleL, poleR);
  return g;
}

function makeBoat(color, name) {
  const g = new THREE.Group();
  const hull = new THREE.Mesh(
    new THREE.BoxGeometry(2.2, 0.9, 6.5),
    new THREE.MeshStandardMaterial({ color, roughness: 0.5, metalness: 0.2 }),
  );
  hull.position.y = 0.4;
  const bow = new THREE.Mesh(
    new THREE.ConeGeometry(1.1, 1.8, 4),
    new THREE.MeshStandardMaterial({ color, roughness: 0.5, metalness: 0.2 }),
  );
  bow.rotation.x = Math.PI / 2;
  bow.rotation.y = Math.PI / 4;
  bow.position.set(0, 0.4, 4.0);
  const cabin = new THREE.Mesh(
    new THREE.BoxGeometry(1.6, 0.8, 2.2),
    new THREE.MeshStandardMaterial({ color: 0xf4f0e2, roughness: 0.6 }),
  );
  cabin.position.set(0, 1.2, -0.6);
  const mast = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.08, 4.5, 6),
    new THREE.MeshStandardMaterial({ color: 0x5f4630, roughness: 0.9 }),
  );
  mast.position.set(0, 3.0, 0.8);
  const sail = new THREE.Mesh(
    new THREE.PlaneGeometry(2.4, 3.6),
    new THREE.MeshStandardMaterial({ color: 0xf4f0e2, side: THREE.DoubleSide, roughness: 0.9 }),
  );
  sail.position.set(0, 3.2, 0.8);
  g.add(hull, bow, cabin, mast, sail);
  g.userData = { kind: 'boat', name };
  return g;
}

export function buildProps(state) {
  const { group, rng } = state;
  // palms along Strand Boulevard and the beach
  for (let z = -100; z <= 124; z += 14) {
    if (rng.chance(0.85)) {
      const p = makePalm(rng);
      p.position.set(91, 0, z + rng.range(-2, 2));
      group.add(p);
    }
    if (rng.chance(0.85)) {
      const p = makePalm(rng);
      p.position.set(101, 0, z + rng.range(-2, 2));
      group.add(p);
    }
    if (rng.chance(0.6)) {
      const p = makePalm(rng);
      p.position.set(rng.range(111, 128), 0, z + rng.range(-4, 4));
      group.add(p);
    }
  }
  // beach umbrellas + towels
  const umbrellaColors = [0xe86a5a, 0x5a8ad9, 0xe8d44f, 0xd97fb5, 0x7fd94f];
  for (let i = 0; i < 16; i++) {
    const u = makeUmbrella(rng, rng.pick(umbrellaColors));
    u.position.set(rng.range(112, 130), 0, rng.range(-96, 116));
    u.rotation.y = rng.range(0, 6.28);
    group.add(u);
  }
  // market stalls along the beach near the stand-off (z -24..24), kept
  // off the centre fight lane (player at x 116, officers x 110..122)
  const stallSpots = [[124, -18], [124, 18], [126, -4], [118, -26], [120, 26], [126, 10]];
  for (const [sx, sz] of stallSpots) {
    const s = makeStall(rng, rng.pick(['#e86a5a', '#5a8ad9', '#e8d44f', '#7fb5a8']));
    s.position.set(sx, 0, sz);
    s.rotation.y = rng.range(-0.4, 0.4) - Math.PI / 2;
    group.add(s);
  }
  // string lights between poles over the beach market
  const bulbMat = new THREE.MeshBasicMaterial({ color: 0xffe9a8 });
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x2a2a30, roughness: 0.8 });
  const strands = [[[112, -20], [124, -20]], [[112, 20], [124, 20]], [[112, -8], [126, 8]]];
  for (const [[ax, az], [bx, bz]] of strands) {
    for (const [px, pz] of [[ax, az], [bx, bz]]) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 3.4, 6), poleMat);
      pole.position.set(px, 1.7, pz);
      group.add(pole);
    }
    for (let i = 1; i < 8; i++) {
      const t = i / 8;
      const x = ax + (bx - ax) * t;
      const z = az + (bz - az) * t;
      const y = 3.3 - Math.sin(t * Math.PI) * 0.7;
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.14, 6, 6), bulbMat);
      bulb.position.set(x, y, z);
      group.add(bulb);
    }
  }
  // benches and bins along the boulevard
  const benchMat = new THREE.MeshStandardMaterial({ color: 0x6e4a2f, roughness: 1 });
  for (let z = -84; z <= 108; z += 36) {
    const bench = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.5, 0.7), benchMat);
    bench.position.set(90.5, 0.45, z);
    group.add(bench);
  }
  // boats in the sea
  const boats = [];
  const boatDefs = [
    { name: 'BLUE HORIZON', x: 140, z: -60, color: 0x3a6fd9 },
    { name: 'ISLAND QUEEN', x: 140, z: 24, color: 0xe8e8e2 },
    { name: 'RED TIDE', x: 140, z: 108, color: 0xd92020 },
  ];
  for (const def of boatDefs) {
    const b = makeBoat(def.color, def.name);
    b.position.set(def.x, 0.1, def.z);
    b.rotation.y = rng.range(0, 6.28);
    group.add(b);
    boats.push(b);
  }
  return { boats };
}
