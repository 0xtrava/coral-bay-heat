// Coral Bay island: the static city. Roads on a grid, towers inside the
// blocks, a beach and sea to the east, a marina basin to the south, a pier,
// and islands with sailboats offshore. Nothing here moves; the game moves
// cars, people and the helicopter around it.
import * as THREE from 'three';
import { createRng, range, int, pick } from './rng.js';
import { DUSK, mat, glowMat, signTexture, facadeTexture, roadTexture, blobTexture } from './materials.js';

// The road grid: every mission waypoint sits on one of these lines, so the
// autopilot can always route along roads instead of cutting through blocks.
export const ROAD_X = [-90, -45, 0, 45, 90];
export const ROAD_Z = [-90, -45, 0, 45, 90];
// Where a car may drive. East past 150 is open sea; south past -150 is.
export const BOUNDS = { minX: -110, maxX: 150, minZ: -150, maxZ: 110 };
// The marina exit the boat rule measures from: the red boat at index 2 is
// the closest boat to this point, by construction.
export const MARINA_EXIT = { x: 62, z: -148 };

const WALLS = ['#c96f4a', '#d9a05b', '#e8c99a', '#7a8ba0', '#a05b7a', '#5b7a8c', '#b8b0a0', '#8c6f9a'];

function box(w, h, d, material, x, y, z, parent) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  m.position.set(x, y, z);
  parent.add(m);
  return m;
}

function plane(w, d, material, x, y, z, parent) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), material);
  m.rotation.x = -Math.PI / 2;
  m.position.set(x, y, z);
  parent.add(m);
  return m;
}

// A palm: trunk + a crown of drooping fronds.
function palm(x, z, parent, rng) {
  const g = new THREE.Group();
  const h = range(rng, 5, 8);
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.38, h, 6), mat(0x7a5a38));
  trunk.position.y = h / 2;
  trunk.rotation.z = range(rng, -0.08, 0.08);
  g.add(trunk);
  const crown = new THREE.Group();
  crown.position.y = h;
  for (let i = 0; i < 6; i++) {
    const frond = new THREE.Mesh(new THREE.ConeGeometry(0.9, 3.4, 4), mat(0x2e7a3a, { flat: true }));
    const a = (i / 6) * Math.PI * 2;
    frond.position.set(Math.cos(a) * 1.1, -0.3, Math.sin(a) * 1.1);
    frond.rotation.z = Math.cos(a) * 1.1;
    frond.rotation.x = -Math.sin(a) * 1.1;
    crown.add(frond);
  }
  g.add(crown);
  g.position.set(x, 0, z);
  parent.add(g);
  return g;
}

function lampPost(x, z, parent) {
  const g = new THREE.Group();
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 5.2, 6), mat(0x30343c));
  pole.position.y = 2.6;
  g.add(pole);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 8, 6), glowMat(0xffe6a0));
  head.position.y = 5.3;
  g.add(head);
  const pool = new THREE.Mesh(
    new THREE.PlaneGeometry(7, 7),
    new THREE.MeshBasicMaterial({ map: blobTexture(), color: 0xffd98a, transparent: true, opacity: 0.16, depthWrite: false })
  );
  pool.rotation.x = -Math.PI / 2;
  pool.position.y = 0.06;
  g.add(pool);
  g.position.set(x, 0, z);
  parent.add(g);
  return g;
}

// A sailboat: hull, mast and a triangular sail. `userData.phase` drives a
// gentle bob in the game loop.
function sailboat(x, z, parent, rng, sailColor) {
  const g = new THREE.Group();
  const hull = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.7, 5.2), mat(pick(rng, [0xe8e2d4, 0xc94f4f, 0x4f7ac9])));
  hull.position.y = 0.1;
  g.add(hull);
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 4.6, 6), mat(0x5a4632));
  mast.position.y = 2.4;
  g.add(mast);
  const sailShape = new THREE.Shape();
  sailShape.moveTo(0, 0); sailShape.lineTo(0, 4.2); sailShape.lineTo(2.2, 0.4); sailShape.closePath();
  const sail = new THREE.Mesh(new THREE.ShapeGeometry(sailShape), new THREE.MeshLambertMaterial({ color: sailColor, side: THREE.DoubleSide }));
  sail.position.set(0, 0.6, 0.1);
  g.add(sail);
  g.position.set(x, -0.35, z);
  g.rotation.y = range(rng, 0, Math.PI * 2);
  g.userData.phase = rng() * Math.PI * 2;
  parent.add(g);
  return g;
}

export function buildCity(scene, seed) {
  const rng = createRng(seed);
  const colliders = [];
  const sailboats = [];
  const world = new THREE.Group();
  scene.add(world);

  // Ground: city slab, sand strip, and the sea + marina basin below it.
  plane(340, 340, mat(0x3d4a3a), 20, -0.1, -20, world);
  plane(46, 280, mat(DUSK.sand), 128, 0.02, -20, world);
  const sea = plane(300, 420, new THREE.MeshLambertMaterial({ color: DUSK.sea }), 300, -0.6, -20, world);
  sea.userData.isSea = true;
  plane(280, 60, new THREE.MeshLambertMaterial({ color: DUSK.seaDeep }), 20, -0.6, -155, world);

  // Roads: asphalt strips with a dashed centre line, plus sidewalks.
  const roadTex = roadTexture();
  for (const x of ROAD_X) {
    const t = roadTex.clone();
    t.needsUpdate = true;
    t.repeat.set(1, 26);
    const r = plane(9, 264, new THREE.MeshLambertMaterial({ map: t }), x, 0.05, -20, world);
    r.userData.road = true;
    plane(3, 264, mat(DUSK.sidewalk), x - 6, 0.04, -20, world);
    plane(3, 264, mat(DUSK.sidewalk), x + 6, 0.04, -20, world);
  }
  for (const z of ROAD_Z) {
    // Same strip, dashes along X: rotate the texture 90 degrees instead
    // of rotating the mesh (an Euler tilt would lift it off the ground).
    const t = roadTex.clone();
    t.needsUpdate = true;
    t.center.set(0.5, 0.5);
    t.rotation = Math.PI / 2;
    t.repeat.set(26, 1);
    const r = plane(264, 9, new THREE.MeshLambertMaterial({ map: t }), 20, 0.05, z, world);
    r.userData.road = true;
    plane(264, 3, mat(DUSK.sidewalk), 20, 0.04, z - 6, world);
    plane(264, 3, mat(DUSK.sidewalk), 20, 0.04, z + 6, world);
  }

  // Buildings: one to three towers per block, taller toward the centre.
  const colEdges = [-110, -94.5, -85.5, -49.5, -40.5, -4.5, 4.5, 40.5, 49.5, 85.5, 94.5, 110];
  const rowEdges = [-110, -94.5, -85.5, -49.5, -40.5, -4.5, 4.5, 40.5, 49.5, 85.5, 94.5, 110];
  const roofMat = mat(0x2a2d34);
  for (let ci = 0; ci < colEdges.length - 1; ci += 2) {
    for (let ri = 0; ri < rowEdges.length - 1; ri += 2) {
      const x0 = colEdges[ci], x1 = colEdges[ci + 1];
      const z0 = rowEdges[ri], z1 = rowEdges[ri + 1];
      if (x1 - x0 < 8 || z1 - z0 < 8) continue;
      const count = int(rng, 1, 2);
      for (let b = 0; b < count; b++) {
        const w = range(rng, 9, Math.min(16, x1 - x0 - 3));
        const d = range(rng, 9, Math.min(16, z1 - z0 - 3));
        const cx = range(rng, x0 + w / 2 + 1, x1 - w / 2 - 1);
        const cz = range(rng, z0 + d / 2 + 1, z1 - d / 2 - 1);
        const distCentre = Math.hypot(cx, cz);
        const h = range(rng, 8, distCentre < 55 ? 42 : 20);
        const wall = pick(rng, WALLS);
        const facade = new THREE.MeshLambertMaterial({ map: facadeTexture(wall, 0.5) });
        const tower = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), [facade, facade, roofMat, roofMat, facade, facade]);
        tower.position.set(cx, h / 2, cz);
        world.add(tower);
        // A rooftop box or two so the skyline is not a flat table.
        if (rng() < 0.6) {
          box(range(rng, 2, 4), range(rng, 1, 2.5), range(rng, 2, 4), mat(0x3a3e46), cx + range(rng, -2, 2), h + 0.8, cz + range(rng, -2, 2), world);
        }
        colliders.push({ x: cx, z: cz, hx: w / 2, hz: d / 2 });
      }
    }
  }

  // Landmark shops: the garage and the gun store, with painted signs.
  const garage = box(16, 7, 12, mat(0x8c4a2f), -30, 3.5, 96, world);
  garage.userData.sign = 'GARAGE';
  const garageSign = new THREE.Mesh(
    new THREE.PlaneGeometry(12, 3),
    new THREE.MeshBasicMaterial({ map: signTexture(['GARAGE'], { bg: '#5b2a12', fg: '#ffd98a' }) })
  );
  garageSign.position.set(-30, 6.2, 89.8);
  garageSign.rotation.y = Math.PI;
  world.add(garageSign);
  colliders.push({ x: -30, z: 96, hx: 8, hz: 6 });
  const gunstore = box(12, 6, 10, mat(0x2f4a3a), -14, 3, -30, world);
  const gunSign = new THREE.Mesh(
    new THREE.PlaneGeometry(10, 2.6),
    new THREE.MeshBasicMaterial({ map: signTexture(['GUN STORE'], { bg: '#12351f', fg: '#d8ffd8' }) })
  );
  gunSign.position.set(-14, 5, -24.8);
  world.add(gunSign);
  colliders.push({ x: -14, z: -30, hx: 6, hz: 5 });

  // Named hotels flanking the boulevard north of the start — the title
  // shot reads their signs over the hero's roof. Signs face south
  // (+z), toward the title camera.
  const hotels = [
    { x: -18, z: -28, w: 14, h: 20, d: 10, wall: 0xc96f4a, name: 'HOTEL CORAL' },
    { x: 18, z: -48, w: 12, h: 26, d: 10, wall: 0x7a8ba0, name: 'LAGUNA RASI' },
    { x: -16, z: -68, w: 12, h: 16, d: 10, wall: 0xd9a05b, name: 'PALM COURT' },
  ];
  for (const ht of hotels) {
    const tower = new THREE.Mesh(
      new THREE.BoxGeometry(ht.w, ht.h, ht.d),
      new THREE.MeshLambertMaterial({ map: facadeTexture('#' + ht.wall.toString(16).padStart(6, '0'), 0.5) })
    );
    tower.position.set(ht.x, ht.h / 2, ht.z);
    world.add(tower);
    const sign = new THREE.Mesh(
      new THREE.PlaneGeometry(Math.min(11, ht.w - 1), 2.2),
      new THREE.MeshBasicMaterial({ map: signTexture([ht.name], { bg: '#14213d', fg: '#ffe9a0' }) })
    );
    sign.position.set(ht.x, ht.h - 3.5, ht.z + ht.d / 2 + 0.15);
    world.add(sign);
    colliders.push({ x: ht.x, z: ht.z, hx: ht.w / 2, hz: ht.d / 2 });
  }

  // The beach: umbrellas, towels, a lifeguard tower, and the sea beyond.
  for (let i = 0; i < 7; i++) {
    const ux = range(rng, 116, 142);
    const uz = range(rng, -90, 90);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 3, 6), mat(0x8a6f4d));
    pole.position.set(ux, 1.5, uz);
    world.add(pole);
    const canopy = new THREE.Mesh(new THREE.ConeGeometry(2.6, 1.1, 8), mat(pick(rng, [0xe86a8a, 0x4f9ac9, 0xf2c14e, 0xffffff]), { flat: true }));
    canopy.position.set(ux, 3.2, uz);
    world.add(canopy);
  }
  // Lifeguard tower at the south end of the beach — kept clear of the
  // M4 stand-off sightline (the shootout plays around z = 20).
  box(3, 4.5, 3, mat(0xe8e2d4), 128, 2.25, -60, world);
  box(3.6, 0.4, 3.6, mat(0xc94f4f), 128, 4.7, -60, world);

  // Beach props around the M4 stand-off (120, 20): striped umbrellas,
  // palms and crates so the shootout frame is dense, plus a string of
  // warm bulbs between two poles — the night-market echo.
  const beachUmbrellas = [
    { x: 132, z: 10, c: 0xe86a8a }, { x: 140, z: 26, c: 0x4f9ac9 },
    { x: 146, z: 12, c: 0xf2c14e }, { x: 136, z: 32, c: 0xffffff },
  ];
  for (const u of beachUmbrellas) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 3, 6), mat(0x8a6f4d));
    pole.position.set(u.x, 1.5, u.z);
    world.add(pole);
    const canopy = new THREE.Mesh(new THREE.ConeGeometry(2.8, 1.2, 8), mat(u.c, { flat: true }));
    canopy.position.set(u.x, 3.2, u.z);
    world.add(canopy);
  }
  palm(130, 30, world, rng);
  palm(147, 20, world, rng);
  box(1.6, 1.2, 1.6, mat(0x7a5a38), 134, 0.6, 18, world);
  box(1.3, 1.0, 1.3, mat(0x6a5138), 142, 0.5, 30, world);
  box(1.1, 0.9, 1.1, mat(0x8a6f4d), 138, 0.45, 8, world);
  // String lights: two poles, bulbs sagging between them.
  const slA = { x: 130, z: 6 }, slB = { x: 148, z: 28 };
  for (const p of [slA, slB]) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 4.6, 6), mat(0x30343c));
    pole.position.set(p.x, 2.3, p.z);
    world.add(pole);
  }
  for (let i = 0; i <= 8; i++) {
    const t = i / 8;
    const bx = slA.x + (slB.x - slA.x) * t;
    const bz = slA.z + (slB.z - slA.z) * t;
    const by = 4.6 - Math.sin(t * Math.PI) * 0.9;
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 6), glowMat(pick(rng, [0xffd98a, 0xff9a4d, 0xffe14d])));
    bulb.position.set(bx, by, bz);
    world.add(bulb);
  }

  // Pier 9: a wooden deck out over the sea, with a sign.
  for (let x = 110; x <= 148; x += 4) {
    box(4.2, 0.5, 9, mat(0x7a5a38), x, -0.25, -45, world);
  }
  const pierSign = new THREE.Mesh(
    new THREE.PlaneGeometry(9, 2.4),
    new THREE.MeshBasicMaterial({ map: signTexture(['PIER 9'], { bg: '#14324a', fg: '#ffe9a0' }) })
  );
  pierSign.position.set(112, 4.5, -50.5);
  pierSign.rotation.y = Math.PI / 4;
  world.add(pierSign);
  // Pier posts.
  for (let x = 112; x <= 148; x += 8) {
    for (const dz of [-4, 4]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 3, 6), mat(0x5a4632));
      post.position.set(x, -1.2, -45 + dz);
      world.add(post);
    }
  }

  // Marina quay + dock fingers + boats. Boat index 2 is the red one at
  // (62, -138): the closest to MARINA_EXIT, by the numbers in the comment
  // above — the boat-pick rule depends on it.
  plane(260, 26, mat(0x9a938a), 20, 0.03, -137, world);
  for (let i = 0; i < 4; i++) {
    box(3, 0.4, 14, mat(0x6a5138), -70 + i * 46, -0.1, -128, world);
  }
  const boatDefs = [
    { x: -80, z: -140, sail: 0xe8e2d4 },
    { x: -20, z: -140, sail: 0x4f7ac9 },
    { x: 62, z: -138, sail: 0xc94f4f },
    { x: 120, z: -138, sail: 0xf2c14e },
  ];
  const boats = boatDefs.map((b) => sailboat(b.x, b.z, world, rng, b.sail));
  boats.forEach((b) => sailboats.push(b));

  // Islands offshore with palms, and sailboats out on the water.
  const islandSpots = [[190, -60], [230, 40], [200, 110], [270, -20]];
  for (const [ix, iz] of islandSpots) {
    const isle = new THREE.Mesh(new THREE.ConeGeometry(range(rng, 14, 22), range(rng, 4, 8), 7), mat(0x4a7a52, { flat: true }));
    isle.position.set(ix, -0.5, iz);
    world.add(isle);
    for (let p = 0; p < 3; p++) palm(ix + range(rng, -8, 8), iz + range(rng, -6, 6), world, rng);
  }
  for (let i = 0; i < 5; i++) {
    sailboats.push(sailboat(range(rng, 165, 260), range(rng, -120, 120), world, rng, pick(rng, [0xffffff, 0xf2c14e, 0xe86a8a])));
  }

  // Palms along the beach and the boulevard; lamps along the roads.
  for (let z = -100; z <= 100; z += 20) {
    palm(106, z + range(rng, -3, 3), world, rng);
    if (rng() < 0.7) palm(-104, z + range(rng, -3, 3), world, rng);
  }
  // A palm-lined boulevard: a fixed row down both sidewalks of the
  // beach road (z = 0), so the cover chase runs under palms.
  for (let x = -30; x <= 110; x += 20) {
    palm(x, 9, world, rng);
    palm(x + 10, -9, world, rng);
  }
  for (let z = -95; z <= 95; z += 24) {
    lampPost(6.5, z, world);
    lampPost(-6.5, z + 12, world);
  }
  for (let x = -95; x <= 95; x += 24) {
    lampPost(x, 6.5, world);
  }

  // The sun: a low disc over the sea, plus a warm glow sprite.
  const sun = new THREE.Mesh(new THREE.CircleGeometry(16, 24), glowMat(DUSK.sunCore));
  sun.position.set(320, 42, -20);
  sun.lookAt(0, 10, -20);
  scene.add(sun);
  const sunGlow = new THREE.Mesh(
    new THREE.PlaneGeometry(90, 90),
    new THREE.MeshBasicMaterial({ map: blobTexture(), color: 0xff9a4d, transparent: true, opacity: 0.5, depthWrite: false })
  );
  sunGlow.position.set(318, 42, -20);
  sunGlow.lookAt(0, 10, -20);
  scene.add(sunGlow);

  return {
    colliders,
    boats: boatDefs.map((b, i) => ({ ...b, mesh: boats[i] })),
    sailboats,
    landmarks: {
      garage: { x: -30, z: 96 },
      gunstore: { x: -14, z: -30 },
      beach: { x: 120, z: 20 },
      pier: { x: 135, z: -45 },
      docks: { x: 0, z: -135 },
      marinaExit: { ...MARINA_EXIT },
    },
  };
}
