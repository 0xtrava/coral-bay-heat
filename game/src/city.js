// Coral Bay Heat (rebuild v19) — the island city.
// A road grid, a beachfront avenue, a pier, hotels with lit signs, palms,
// crowds of props. The layout is new: avenues and streets every 36 units,
// the sea to the east, the pier to the south-east.

import * as THREE from 'three';
import { makeRng, pick, between, whole, chance } from './rng.js';
import {
  PALETTE, FACADE_COLORS, facadeTexture, roadTexture, sandTexture,
  signTexture, glowTexture, cloudTexture, lambert, lambertMap,
} from './materials.js';

export const AVENUES = [-96, -60, -24, 12, 48, 84];
export const STREETS = [-96, -60, -24, 12, 48, 84];
export const ROAD_HALF = 5;
export const BOUND = 120;

export const DISTRICTS = [
  { name: 'DOWNTOWN', x0: -24, z0: -24, x1: 48, z1: 48 },
  { name: 'MARINA BEACH', x0: 84, z0: -60, x1: 108, z1: 60 },
  { name: 'PIER 9', x0: 48, z0: 60, x1: 108, z1: 120 },
  { name: 'THE DOCKS', x0: -120, z0: -120, x1: 48, z1: -60 },
  { name: 'OLD TOWN', x0: -120, z0: -60, x1: -60, z1: 60 },
  { name: 'NORTHSIDE', x0: 48, z0: -120, x1: 108, z1: -60 },
  { name: 'GARAGE', x0: -120, z0: 60, x1: -24, z1: 120 },
];

export function districtAt(x, z) {
  for (const d of DISTRICTS) {
    if (x >= d.x0 && x <= d.x1 && z >= d.z0 && z <= d.z1) return d.name;
  }
  if (x > 108) return 'MARINA BEACH';
  return 'DOWNTOWN';
}

const SIGNS = [
  { text: 'HOTEL CORAL', sub: 'BEACHFRONT · POOL', bg: '#1d2f55', fg: '#ffd24d' },
  { text: 'LAGUNA RASI', sub: 'SUITES · SPA', bg: '#5e1f3d', fg: '#ffe9a8' },
  { text: 'PALM COURT', sub: 'ROOMS · BAR', bg: '#0f4d4a', fg: '#ffd24d' },
  { text: 'CORAL BAY BANK', sub: 'OPEN 9–5', bg: '#24344d', fg: '#9fd8ff' },
  { text: 'MARINA MARKET', sub: 'FRESH · DAILY', bg: '#3d5a1e', fg: '#ffe9a8' },
  { text: 'PIER 9 DINER', sub: 'EAT · 24 HRS', bg: '#7a2f1e', fg: '#ffd24d' },
  { text: 'DOCKS BAR', sub: 'COLD BEER', bg: '#2c1445', fg: '#ff8fb0' },
  { text: "KIKI'S TACOS", sub: 'BEST IN TOWN', bg: '#8a5a00', fg: '#fff3c9' },
  { text: 'SUNSET MOTEL', sub: 'VACANCY', bg: '#4a2c14', fg: '#ffb347' },
  { text: 'IRONWORKS GUNS', sub: 'AMMO · REPAIRS', bg: '#22222a', fg: '#f2f2ee' },
];

function box(w, h, d, mat, x, y, z, parent) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  parent.add(m);
  return m;
}

export function buildCity(scene, rng) {
  const colliders = [];
  const hotels = [];
  const world = new THREE.Group();
  scene.add(world);

  // ---- sky: gradient dome + sun + halo + clouds ----
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      sunDir: { value: new THREE.Vector3(0.2, 0.25, -1).normalize() },
    },
    vertexShader: `
      varying vec3 vDir;
      void main() {
        vDir = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: `
      varying vec3 vDir;
      uniform vec3 sunDir;
      void main() {
        float h = clamp(vDir.y, -0.05, 1.0);
        vec3 deep = vec3(0.13, 0.05, 0.28);
        vec3 violet = vec3(0.48, 0.18, 0.75);
        vec3 pink = vec3(1.00, 0.37, 0.54);
        vec3 gold = vec3(1.00, 0.62, 0.24);
        vec3 col = mix(gold, pink, smoothstep(0.0, 0.22, h));
        col = mix(col, violet, smoothstep(0.18, 0.55, h));
        col = mix(col, deep, smoothstep(0.5, 1.0, h));
        float sun = pow(max(dot(normalize(vDir), normalize(sunDir)), 0.0), 90.0);
        col += vec3(1.0, 0.85, 0.55) * sun * 1.4;
        float glow = pow(max(dot(normalize(vDir), normalize(sunDir)), 0.0), 18.0);
        col += vec3(1.0, 0.55, 0.35) * glow * 0.18;
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(760, 24, 16), skyMat);
  world.add(sky);

  // sun disc + halo sprite, placed far in the sun direction
  const sunDir = new THREE.Vector3(0.2, 0.22, -1).normalize();
  const sunMesh = new THREE.Mesh(
    new THREE.CircleGeometry(26, 24),
    new THREE.MeshBasicMaterial({ color: 0xfff2c9, fog: false }),
  );
  sunMesh.position.copy(sunDir).multiplyScalar(700);
  sunMesh.lookAt(0, 0, 0);
  world.add(sunMesh);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowTexture('rgba(255,230,170,0.9)', 'rgba(255,160,80,0.45)'),
    transparent: true, depthWrite: false, fog: false,
  }));
  halo.scale.set(120, 120, 1);
  halo.position.copy(sunDir).multiplyScalar(690);
  world.add(halo);

  // clouds drifting high over the city
  const clouds = [];
  for (let i = 0; i < 14; i++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({
      map: cloudTexture(rng), transparent: true, depthWrite: false, opacity: 0.85, fog: false,
    }));
    const a = rng() * Math.PI * 2;
    const r = 180 + rng() * 420;
    s.position.set(Math.cos(a) * r, 90 + rng() * 90, Math.sin(a) * r);
    s.scale.set(90 + rng() * 130, 30 + rng() * 26, 1);
    s.userData.drift = 0.4 + rng() * 0.8;
    world.add(s);
    clouds.push(s);
  }

  // ---- ground: grass base, roads, sidewalks, beach, sea ----
  const grass = new THREE.Mesh(
    new THREE.PlaneGeometry(560, 560),
    lambert(0x557a45),
  );
  grass.rotation.x = -Math.PI / 2;
  grass.position.set(20, -0.05, 0);
  world.add(grass);

  const roadTex = roadTexture();
  const roadMat = lambertMap(roadTex);
  for (const x of AVENUES) {
    const r = new THREE.Mesh(new THREE.PlaneGeometry(ROAD_HALF * 2, 244), roadMat);
    r.rotation.x = -Math.PI / 2;
    r.position.set(x, 0.02, 0);
    world.add(r);
  }
  for (const z of STREETS) {
    const r = new THREE.Mesh(new THREE.PlaneGeometry(244, ROAD_HALF * 2), roadMat);
    r.rotation.x = -Math.PI / 2;
    r.rotation.z = Math.PI / 2;
    r.position.set(0, 0.02, z);
    world.add(r);
  }
  // intersections get a fresh square so the dashes never double up
  const interMat = lambert(PALETTE.roadDark);
  for (const x of AVENUES) {
    for (const z of STREETS) {
      const sq = new THREE.Mesh(new THREE.PlaneGeometry(ROAD_HALF * 2 + 0.4, ROAD_HALF * 2 + 0.4), interMat);
      sq.rotation.x = -Math.PI / 2;
      sq.position.set(x, 0.03, z);
      world.add(sq);
      // crosswalk stripes
      for (let i = -2; i <= 2; i++) {
        const stripe = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 3.4), lambert(0xe8e4d8));
        stripe.rotation.x = -Math.PI / 2;
        stripe.position.set(x + i * 2.1, 0.05, z - ROAD_HALF - 1.2);
        world.add(stripe);
      }
    }
  }
  // sidewalks: pale strips hugging every road
  const walkMat = lambert(0x8d8272);
  for (const x of AVENUES) {
    for (const side of [-1, 1]) {
      const w = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 244), walkMat);
      w.rotation.x = -Math.PI / 2;
      w.position.set(x + side * (ROAD_HALF + 1.3), 0.04, 0);
      world.add(w);
    }
  }
  for (const z of STREETS) {
    for (const side of [-1, 1]) {
      const w = new THREE.Mesh(new THREE.PlaneGeometry(244, 2.6), walkMat);
      w.rotation.x = -Math.PI / 2;
      w.position.set(0, 0.04, z + side * (ROAD_HALF + 1.3));
      world.add(w);
    }
  }

  // beach sand + boardwalk + sea
  const sand = new THREE.Mesh(
    new THREE.PlaneGeometry(26, 244),
    lambertMap(sandTexture()),
  );
  sand.rotation.x = -Math.PI / 2;
  sand.position.set(120, 0.03, 0);
  world.add(sand);
  const board = new THREE.Mesh(
    new THREE.PlaneGeometry(8, 244),
    lambert(0x9a7b52),
  );
  board.rotation.x = -Math.PI / 2;
  board.position.set(104, 0.04, 0);
  world.add(board);
  const sea = new THREE.Mesh(
    new THREE.PlaneGeometry(120, 560),
    lambert(PALETTE.seaBlue, { transparent: true, opacity: 0.92 }),
  );
  sea.rotation.x = -Math.PI / 2;
  sea.position.set(192, 0.0, 0);
  world.add(sea);
  const seaDeep = new THREE.Mesh(
    new THREE.PlaneGeometry(90, 560),
    lambert(PALETTE.seaDeep, { transparent: true, opacity: 0.95 }),
  );
  seaDeep.rotation.x = -Math.PI / 2;
  seaDeep.position.set(280, -0.1, 0);
  world.add(seaDeep);
  // foam line where the water meets the sand
  const foam = new THREE.Mesh(
    new THREE.PlaneGeometry(1.6, 244),
    lambert(0xf2fbff, { transparent: true, opacity: 0.8 }),
  );
  foam.rotation.x = -Math.PI / 2;
  foam.position.set(132.5, 0.06, 0);
  world.add(foam);

  // ---- buildings: one to three towers per block, taller toward the centre ----
  const roofMat = lambert(0x2a2d34);
  const blockXs = [-120, -101, -65, -29, 7, 43, 79, 120];
  const blockZs = [-120, -101, -65, -29, 7, 43, 79, 120];
  let signIdx = 0;
  const hotelSpots = [
    { x: 70, z: -48, sign: 0 },
    { x: 70, z: -12, sign: 1 },
    { x: 70, z: 24, sign: 2 },
  ];
  for (let bi = 0; bi < blockXs.length - 1; bi++) {
    for (let bj = 0; bj < blockZs.length - 1; bj++) {
      const x0 = blockXs[bi] + 2, x1 = blockXs[bi + 1] - 2;
      const z0 = blockZs[bj] + 2, z1 = blockZs[bj + 1] - 2;
      // skip the beachfront strip (avenue 84, boardwalk, sand) and the pier block
      if (x0 >= 79) continue;
      if (x0 >= 43 && z0 >= 60) continue;
      if (x1 - x0 < 12 || z1 - z0 < 12) continue;
      const count = whole(rng, 1, 2);
      for (let b = 0; b < count; b++) {
        const w = between(rng, 10, Math.min(18, x1 - x0 - 4));
        const d = between(rng, 10, Math.min(18, z1 - z0 - 4));
        const cx = between(rng, x0 + w / 2 + 1, x1 - w / 2 - 1);
        const cz = between(rng, z0 + d / 2 + 1, z1 - d / 2 - 1);
        const distCentre = Math.hypot(cx, cz);
        const h = between(rng, 9, distCentre < 55 ? 46 : 22);
        const wall = pick(rng, FACADE_COLORS);
        const face = new THREE.MeshLambertMaterial({ map: facadeTexture(wall, rng) });
        const tower = new THREE.Mesh(
          new THREE.BoxGeometry(w, h, d),
          [face, face, roofMat, roofMat, face, face],
        );
        tower.position.set(cx, h / 2, cz);
        world.add(tower);
        if (chance(rng, 0.6)) {
          box(between(rng, 2, 4), between(rng, 1, 2.5), between(rng, 2, 4),
            lambert(0x3a3e46), cx + between(rng, -2, 2), h + 0.8, cz + between(rng, -2, 2), world);
        }
        // a lit sign on some of the taller towers, facing the nearest road
        if (h > 20 && chance(rng, 0.5)) {
          const s = SIGNS[signIdx % SIGNS.length];
          signIdx++;
          const tex = signTexture(s.text, s.sub, s.bg, s.fg);
          const sign = new THREE.Mesh(
            new THREE.BoxGeometry(12, 3, 0.4),
            lambertMap(tex, { emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.55 }),
          );
          sign.position.set(cx, h * 0.72, cz + d / 2 + 0.3);
          world.add(sign);
        }
        colliders.push({ x: cx, z: cz, hx: w / 2, hz: d / 2 });
      }
    }
  }

  // ---- beachfront hotels: tall, signed on their south face, fully visible ----
  for (const spot of hotelSpots) {
    const s = SIGNS[spot.sign];
    const h = 34 + spot.sign * 4;
    const face = new THREE.MeshLambertMaterial({ map: facadeTexture(0xe8a87c, rng, 0.6) });
    const tower = new THREE.Mesh(
      new THREE.BoxGeometry(16, h, 14),
      [face, face, roofMat, roofMat, face, face],
    );
    tower.position.set(spot.x, h / 2, spot.z);
    world.add(tower);
    const tex = signTexture(s.text, s.sub, s.bg, s.fg);
    const sign = new THREE.Mesh(
      new THREE.BoxGeometry(13, 3.2, 0.4),
      lambertMap(tex, { emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.7 }),
    );
    sign.position.set(spot.x, h * 0.62, spot.z - 7.2);
    world.add(sign);
    // glowing lobby strip at the base
    const lobby = new THREE.Mesh(
      new THREE.BoxGeometry(14, 2.4, 0.5),
      lambert(0xffd98a, { emissive: 0xffb347, emissiveIntensity: 0.7 }),
    );
    lobby.position.set(spot.x, 1.4, spot.z - 7.2);
    world.add(lobby);
    colliders.push({ x: spot.x, z: spot.z, hx: 8, hz: 7 });
    hotels.push({ name: s.text, x: spot.x, z: spot.z, h });
  }

  // ---- palms: along the beachfront avenue, the boardwalk and the pier ----
  const trunkMat = lambert(0x7a5a38);
  const frondMat = lambert(0x3f8f4f, { side: THREE.DoubleSide });
  function palm(x, z, scale = 1) {
    const g = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.28 * scale, 0.42 * scale, 7 * scale, 6), trunkMat);
    trunk.position.y = 3.5 * scale;
    trunk.rotation.z = 0.08;
    g.add(trunk);
    for (let i = 0; i < 6; i++) {
      const frond = new THREE.Mesh(new THREE.ConeGeometry(0.9 * scale, 3.4 * scale, 4), frondMat);
      const a = (i / 6) * Math.PI * 2;
      frond.position.set(Math.cos(a) * 1.1 * scale, 7 * scale, Math.sin(a) * 1.1 * scale);
      frond.rotation.z = Math.PI / 2.4;
      frond.rotation.y = a;
      g.add(frond);
    }
    const nuts = new THREE.Mesh(new THREE.SphereGeometry(0.4 * scale, 6, 5), lambert(0x6b4a1e));
    nuts.position.y = 6.6 * scale;
    g.add(nuts);
    g.position.set(x, 0, z);
    world.add(g);
    return g;
  }
  for (let z = -108; z <= 108; z += 18) {
    palm(89.5, z + between(rng, -2, 2), 1);
  }
  for (let x = -108; x <= 60; x += 24) {
    if (chance(rng, 0.5)) palm(x, 101.5, 0.9);
  }
  for (let i = 0; i < 8; i++) {
    palm(112 + between(rng, -2, 4), -90 + i * 24, 1.1);
  }

  // ---- beach props: umbrellas, crates, lifeguard tower, sailboat ----
  function umbrella(x, z, color) {
    const g = new THREE.Group();
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 3, 5), lambert(0xd8d2c4));
    pole.position.y = 1.5;
    g.add(pole);
    const top = new THREE.Mesh(new THREE.ConeGeometry(2.2, 1.1, 8), lambert(color));
    top.position.y = 3.2;
    g.add(top);
    g.position.set(x, 0, z);
    world.add(g);
  }
  umbrella(114, -42, 0xe85d75);
  umbrella(117, -6, 0x4d8fd1);
  umbrella(113, 36, 0xffd24d);
  umbrella(118, 66, 0x7ac74f);
  for (let i = 0; i < 6; i++) {
    box(1.4, 1.4, 1.4, lambert(0xa8845a), 112 + between(rng, -1, 5), 0.7, -70 + i * 26, world);
  }
  // lifeguard tower on the sand
  const lg = new THREE.Group();
  const legMat = lambert(0xf2f2ee);
  for (const [lx, lz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 4.4, 5), legMat);
    leg.position.set(lx, 2.2, lz);
    lg.add(leg);
  }
  const hut = new THREE.Mesh(new THREE.BoxGeometry(3.4, 2.2, 3), lambert(0xff6a5e));
  hut.position.y = 5.4;
  lg.add(hut);
  const lgRoof = new THREE.Mesh(new THREE.ConeGeometry(2.8, 1.4, 4), lambert(0xf2f2ee));
  lgRoof.position.y = 7.2;
  lgRoof.rotation.y = Math.PI / 4;
  lg.add(lgRoof);
  lg.position.set(116, 0, 2);
  world.add(lg);
  // sailboat out on the water
  const boat = new THREE.Group();
  const hull = new THREE.Mesh(new THREE.BoxGeometry(5, 1, 1.8), lambert(0xf2f2ee));
  hull.position.y = 0.6;
  boat.add(hull);
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 6, 5), lambert(0x7a5a38));
  mast.position.y = 3.4;
  boat.add(mast);
  const sail = new THREE.Mesh(new THREE.ConeGeometry(1.6, 5, 3), lambert(0xffe9a8, { side: THREE.DoubleSide }));
  sail.position.set(0.7, 3.4, 0);
  boat.add(sail);
  boat.position.set(152, 0.2, -40);
  boat.rotation.y = 0.5;
  world.add(boat);

  // ---- pier: wooden deck jutting east over the sand and sea ----
  const pierMat = lambert(0x8a6b42);
  const deck = new THREE.Mesh(new THREE.BoxGeometry(34, 0.8, 12), pierMat);
  deck.position.set(123, 0.6, 72);
  world.add(deck);
  for (let x = 108; x <= 138; x += 6) {
    for (const dz of [-5.4, 5.4]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 2.4, 5), lambert(0x5e4630));
      post.position.set(x, -0.4, 72 + dz);
      world.add(post);
    }
  }
  for (let x = 110; x <= 136; x += 6.5) {
    const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 3.4, 5), lambert(0x22222a));
    lamp.position.set(x, 2.4, 72 - 5.2);
    world.add(lamp);
    const bulb = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowTexture('rgba(255,230,170,0.95)', 'rgba(255,180,80,0.4)'),
      transparent: true, depthWrite: false,
    }));
    bulb.scale.set(3.2, 3.2, 1);
    bulb.position.set(x, 4.2, 72 - 5.2);
    world.add(bulb);
  }
  // pier kiosk
  box(4, 3, 3.4, lambert(0x4d8fd1), 112, 2.5, 68.5, world);

  // ---- street lamps along the avenues ----
  const lampGlow = glowTexture('rgba(255,230,170,0.95)', 'rgba(255,180,80,0.4)');
  for (const x of AVENUES) {
    for (let z = -96; z <= 96; z += 48) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 5.4, 5), lambert(0x22222a));
      pole.position.set(x + 6.4, 2.7, z);
      world.add(pole);
      const bulb = new THREE.Sprite(new THREE.SpriteMaterial({
        map: lampGlow, transparent: true, depthWrite: false,
      }));
      bulb.scale.set(2.6, 2.6, 1);
      bulb.position.set(x + 6.4, 5.6, z);
      world.add(bulb);
    }
  }

  return { world, colliders, hotels, clouds, sunMesh, halo, sea };
}
