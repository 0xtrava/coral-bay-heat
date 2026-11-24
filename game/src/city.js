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
  // The sun must read as a sun: a crisp orange disc with a warm
  // glow, not a washed-out white blob. A small disc (15 m) in
  // saturated sunset orange (#ffb347) with a tight, soft halo
  // (80 m, faint outer falloff) keeps a hard edge even from 500 m
  // away. The clouds are bright white, soft and small, high up —
  // they break the gradient and make the sky read as a sunny day.
  const SUN = { x: 60, y: 78, discR: 21, discColor: 0xffb347, haloSize: 90, haloFade: 0.25 };
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(700, 24, 16),
    new THREE.MeshBasicMaterial({ map: skyTexture(), side: THREE.BackSide, fog: false }),
  );
  sky.position.y = 0;
  group.add(sky);
  const sunGlow = new THREE.Mesh(
    new THREE.PlaneGeometry(SUN.haloSize, SUN.haloSize),
    new THREE.MeshBasicMaterial({
      map: glowTexture('rgba(255,246,200,1)', `rgba(255,170,80,${SUN.haloFade})`),
      transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false,
    }),
  );
  sunGlow.position.set(SUN.x, SUN.y, -520);
  sunGlow.lookAt(0, 40, 0);
  group.add(sunGlow);
  const sunDisc = new THREE.Mesh(
    new THREE.CircleGeometry(SUN.discR, 32),
    new THREE.MeshBasicMaterial({ color: SUN.discColor, fog: false }),
  );
  sunDisc.position.set(SUN.x, SUN.y, -519);
  sunDisc.lookAt(0, 40, 0);
  group.add(sunDisc);
  // Puffy cumulus clouds: each cloud is a cluster of soft white
  // sprite blobs, overlapping so it reads as a real cloud with
  // volume — not a flat white rectangle pasted on the sky. A flat
  // plane reads as a cardboard cutout; a cluster of soft blobs
  // reads as weather. Spread high across the whole sky, including
  // over the sea to the east, so every shot has clouds in it.
  // LEAN SKY: only the first 10 clouds x 3 puffs are actually drawn
  // (30 sprites, slightly smaller) — each big transparent sprite is
  // fill-rate in software rendering, and 16 clouds x 4-6 puffs
  // starved the frame rate (the playtest is wall-clock timed, so a
  // slow frame fails the SEQ outright). The rng draws are kept
  // EXACTLY as before — same count, same order — so the seeded
  // stream for buildings, palms and stalls downstream is unchanged.
  const cloudTex = glowTexture('rgba(255,255,255,0.95)', 'rgba(255,255,255,0.45)');
  const cloudMat = new THREE.SpriteMaterial({ map: cloudTex, transparent: true, opacity: 0.85, fog: false, depthWrite: false });
  for (let c = 0; c < 16; c++) {
    const cx = rng.range(-420, 420);
    const cy = rng.range(110, 200);
    const cz = rng.range(-480, 120);
    const n = 4 + Math.floor(rng.range(0, 3));
    for (let i = 0; i < n; i++) {
      const w = rng.range(28, 62);
      const px = cx + rng.range(-28, 28);
      const py = cy + rng.range(-6, 10);
      const pz = cz + rng.range(-10, 10);
      if (c >= 10 || i >= 3) continue; // rng drawn, sprite skipped
      const s = new THREE.Sprite(cloudMat);
      s.scale.set(w * 0.8, w * 0.8 * 0.45, 1);
      s.position.set(px, py, pz);
      group.add(s);
    }
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

// A building: a facade-textured box, a dressed roofline (cap,
// parapet lip, rooftop AC boxes) so the roof reads as architecture
// rather than a slab, a ground-floor awning, and an optional big
// sign. The sign sits at 68% of the building height so the title
// camera reads it well inside the frame, and it can face south
// (the default) or east, toward the avenue.
function addBuilding(group, colliders, rng, cx, cz, w, d, h, color, sign) {
  const mat = new THREE.MeshStandardMaterial({
    map: facadeTexture(color, 0.6, rng), roughness: 0.85,
  });
  const b = box(w, h, d, mat, cx, h / 2, cz);
  group.add(b);
  const capMat = new THREE.MeshStandardMaterial({ color: 0x3a3238, roughness: 1 });
  group.add(box(w + 0.4, 0.5, d + 0.4, capMat, cx, h + 0.2, cz));
  // parapet lip: four thin edges around the roof rim
  const lipMat = new THREE.MeshStandardMaterial({ color: 0x2e282e, roughness: 1 });
  const lipY = h + 0.6;
  const lipPieces = [
    [w + 0.4, 0.5, 0.3, cx, lipY, cz + d / 2 + 0.05],
    [w + 0.4, 0.5, 0.3, cx, lipY, cz - d / 2 - 0.05],
    [0.3, 0.5, d + 0.4, cx - w / 2 - 0.05, lipY, cz],
    [0.3, 0.5, d + 0.4, cx + w / 2 + 0.05, lipY, cz],
  ];
  for (const [pw, ph, pd, px, py, pz] of lipPieces) group.add(box(pw, ph, pd, lipMat, px, py, pz));
  // rooftop AC boxes, two sizes, offset so they don't line up
  const acMat = new THREE.MeshStandardMaterial({ color: 0x8a8a92, roughness: 0.7, metalness: 0.3 });
  group.add(box(1.6, 0.9, 1.6, acMat, cx - w * 0.22, h + 0.9, cz - d * 0.2));
  group.add(box(1.2, 0.7, 1.2, acMat, cx + w * 0.25, h + 0.8, cz + d * 0.22));
  // ground-floor awning band over the shopfront
  const awnMat = new THREE.MeshStandardMaterial({ color: 0x3a2a3a, roughness: 0.9 });
  group.add(box(w * 0.8, 0.25, 0.8, awnMat, cx, 3.4, cz + d / 2 + 0.3));
  colliders.push({ minX: cx - w / 2, maxX: cx + w / 2, minZ: cz - d / 2, maxZ: cz + d / 2 });
  if (sign) {
    const signMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(sign.w, sign.h),
      new THREE.MeshBasicMaterial({ map: signTexture(sign.text, sign.sub, '#ffe9a8', '#1c2438') }),
    );
    const signY = h * 0.68;
    if (sign.face === 'east') {
      signMesh.position.set(cx + w / 2 + 0.15, signY, cz);
      signMesh.rotation.y = Math.PI / 2;
    } else {
      signMesh.position.set(cx, signY, cz + d / 2 + 0.15);
    }
    group.add(signMesh);
  }
  return b;
}

export function buildBlocks(state) {
  const { group, colliders, rng } = state;
  // The named hotels: tall, signed, inside their blocks, clear of
  // every road. The signs are big on purpose — the title camera
  // reads them from 130 m down the boulevard, and small signs were
  // unreadable there. LAGUNA RASI and PALM COURT stand side by side
  // on the west side of avenue 96, a full avenue apart (x 84 and
  // x 60, both at z 12), so from the title camera the two signs sit
  // next to each other and neither hides the other — stacking them
  // north-south on one x put PALM COURT directly behind LAGUNA RASI
  // and its sign was invisible. Both signs face south, straight at
  // the title camera.
  const HOTELS = [
    { x: 60, z: -60, w: 20, d: 14, h: 30, color: PALETTE.wallCream, text: 'HOTEL CORAL', sub: '★ ★ ★ ★', sw: 26, sh: 6 },
    { x: 84, z: 12, w: 13, d: 11, h: 26, color: PALETTE.wallPink, text: 'LAGUNA RASI', sub: 'ROOMS · POOL', sw: 18, sh: 5 },
    { x: 60, z: 12, w: 13, d: 11, h: 24, color: PALETTE.wallTeal, text: 'PALM COURT', sub: 'SUITES', sw: 18, sh: 5 },
  ];
  for (const ho of HOTELS) {
    addBuilding(group, colliders, rng, ho.x, ho.z, ho.w, ho.d, ho.h, ho.color,
      { text: ho.text, sub: ho.sub, w: ho.sw, h: ho.sh });
  }
  // the garage: low and wide, signed
  addBuilding(group, colliders, rng, -32, 102, 16, 12, 7, PALETTE.wallTerra,
    { text: "LIO'S GARAGE", sub: 'TUNE · REPAIR', w: 13, h: 3 });
  // the gun store: a small shop with a dark sign, on a REAL block
  // between avenues 24 and 48 (x 36, z -36) — clear of every road.
  // It used to sit at x 18, z -36, in the zero-width gap between
  // avenues 12 and 24, where its west face (x 14) stood ON avenue
  // 12's road and it blocked the street in the cover shot. A shop
  // belongs on a lot, not in the middle of the road.
  addBuilding(group, colliders, rng, 36, -36, 8, 10, 6, PALETTE.wallLavender,
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
      // skip blocks already holding a named building, and the two
      // blocks due south of the title hotels, which stay open as
      // plazas: a tall block-fill building there stands directly on
      // the title camera's sightline to the LAGUNA RASI and PALM
      // COURT signs and hides them (the old layout had exactly that
      // — a foreground tower cut LAGUNA RASI to "RASI" and buried
      // PALM COURT). Open ground reads as a plaza, not a hole.
      const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
      const RESERVED = [
        [60, -60, 14, 12], [84, 12, 10, 10], [60, 12, 10, 10],
        [84, 36, 10, 10], [60, 36, 10, 10],
      ];
      let reserved = false;
      for (const [rx, rz, rdx, rdz] of RESERVED) {
        if (Math.abs(cx - rx) < rdx && Math.abs(cz - rz) < rdz) { reserved = true; break; }
      }
      if (reserved) continue;
      if (Math.abs(cx + 32) < 12 && Math.abs(cz - 102) < 10) continue;
      if (Math.abs(cx - 36) < 10 && Math.abs(cz + 36) < 8) continue;
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

// A palm with real fronds: nine two-segment fronds that droop at the
// tips, two greens, a ringed trunk that leans a little, coconuts.
function makePalm(rng) {
  const g = new THREE.Group();
  const h = rng.range(5, 9);
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.2, 0.36, h, 7),
    new THREE.MeshStandardMaterial({ color: 0x6e4a2f, roughness: 1 }),
  );
  trunk.position.y = h / 2;
  trunk.rotation.z = rng.range(-0.08, 0.08);
  g.add(trunk);
  // trunk rings: thin dark bands so the trunk reads as bark, not a stick
  for (let i = 1; i <= 4; i++) {
    const ring = new THREE.Mesh(
      new THREE.CylinderGeometry(0.26, 0.28, 0.12, 7),
      new THREE.MeshStandardMaterial({ color: 0x4a2f1e, roughness: 1 }),
    );
    ring.position.y = (h / 5) * i;
    g.add(ring);
  }
  const frondMats = [
    new THREE.MeshStandardMaterial({ color: 0x2f7d3a, roughness: 0.9, side: THREE.DoubleSide }),
    new THREE.MeshStandardMaterial({ color: 0x3f9d4e, roughness: 0.9, side: THREE.DoubleSide }),
  ];
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2 + rng.range(-0.1, 0.1);
    const mat = frondMats[i % 2];
    const inner = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 0.9), mat);
    inner.position.set(Math.cos(a) * 1.0, h + 0.45, Math.sin(a) * 1.0);
    inner.rotation.y = -a + Math.PI / 2;
    inner.rotation.x = -0.25;
    const outer = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 0.8), mat);
    outer.position.set(Math.cos(a) * 2.4, h + 0.15, Math.sin(a) * 2.4);
    outer.rotation.y = -a + Math.PI / 2;
    outer.rotation.x = -0.95; // drooping tip
    g.add(inner, outer);
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
  // Palms along Strand Boulevard and the beach, with two sightlines
  // kept clear on purpose. A palm at (91,40) used to sit almost
  // exactly on the title camera's line to the hero GT, and the beach
  // palms around z -20..4 crossed the shootout camera's line to the
  // heli — both read as a trunk or fronds pasted across the subject.
  // Palms are still thick everywhere else, just not in front of the
  // two things the frame is about.
  const inWindow = (z, lo, hi) => z >= lo && z <= hi;
  const plantPalm = (x, z) => {
    const p = makePalm(rng);
    p.position.set(x, 0, z);
    group.add(p);
  };
  for (let z = -100; z <= 124; z += 14) {
    const pz = z + rng.range(-2, 2);
    // west sidewalk of avenue 96 — skip the title sightline (z 36..58)
    if (!inWindow(pz, 36, 58) && rng.chance(0.85)) plantPalm(91, pz);
    if (rng.chance(0.85)) plantPalm(101, z + rng.range(-2, 2));
    // beach palms — skip the shootout heli sightline (z -20..4)
    const bz = z + rng.range(-4, 4);
    if (!inWindow(bz, -20, 4) && rng.chance(0.75)) plantPalm(rng.range(111, 128), bz);
  }
  // streetlights along Strand Boulevard (avenue 12) and the beach
  // promenade: dark poles, warm glowing bulbs with a soft halo
  // sprite. The poles stand ON the sidewalk, two metres clear of
  // the road edge on each side (x 6.0 west, x 18.0 east — the 8 m
  // road runs x 8..16), and MID-BLOCK (z offset +12 from the
  // street grid), so no lamp ever stands in a drivable road or on
  // a cross-street. The old poles at x 4.2 / 19.8 hugged the road
  // edges and read as standing IN the road from the low cover
  // camera; at 6.0 / 18.0 they sit visibly on the pavement, with
  // the pale sidewalk under their bases. The gun store has moved
  // to x 36, so no lamp is near it any more.
  const lampPoleMat = new THREE.MeshStandardMaterial({ color: 0x2a2a30, roughness: 0.7, metalness: 0.4 });
  const lampBulbMat = new THREE.MeshBasicMaterial({ color: 0xffe9a8 });
  const lampHaloMat = new THREE.SpriteMaterial({
    map: glowTexture('rgba(255,240,190,0.9)', 'rgba(255,200,90,0.35)'),
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const addLamp = (x, z) => {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 5.5, 6), lampPoleMat);
    pole.position.set(x, 2.75, z);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.08, 0.08), lampPoleMat);
    arm.position.set(x + (x < 12 ? 0.4 : -0.4), 5.4, z);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 8), lampBulbMat);
    bulb.position.set(x + (x < 12 ? 0.8 : -0.8), 5.3, z);
    const halo = new THREE.Sprite(lampHaloMat);
    halo.scale.set(3.2, 3.2, 1);
    halo.position.copy(bulb.position);
    group.add(pole, arm, bulb, halo);
  };
  for (let z = -96; z <= 108; z += 24) {
    addLamp(6.0, z + 12);
    addLamp(18.0, z + 12);
  }
  for (let z = -40; z <= 60; z += 20) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 5.5, 6), lampPoleMat);
    pole.position.set(106, 2.75, z);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 8), lampBulbMat);
    bulb.position.set(106, 5.5, z);
    const halo = new THREE.Sprite(lampHaloMat);
    halo.scale.set(3.2, 3.2, 1);
    halo.position.copy(bulb.position);
    group.add(pole, bulb, halo);
  }
  // beach umbrellas + towels
  const umbrellaColors = [0xe86a5a, 0x5a8ad9, 0xe8d44f, 0xd97fb5, 0x7fd94f];
  for (let i = 0; i < 16; i++) {
    const u = makeUmbrella(rng, rng.pick(umbrellaColors));
    const ux = rng.range(112, 130), uz = rng.range(-96, 116);
    u.position.set(ux, 0, uz);
    u.rotation.y = rng.range(0, 6.28);
    // keep the shootout sightline clear: no umbrella in the standoff
    // zone (x 108..132, z -14..14) — a canopy there blocks the burning
    // Ranger and an officer from the shootout camera
    if (ux >= 108 && ux <= 132 && uz >= -14 && uz <= 14) continue;
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
