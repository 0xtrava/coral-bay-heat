// Coral Bay Heat — the city. A tropical island boulevard: textured asphalt
// road with markings and curbs, stepped buildings with balconies and signs,
// palm-lined beach, turquoise ocean, wooden Pier 9 and the container docks,
// under a warm sunset sky with a big haloed sun. Forward is -Z (north).
import * as THREE from 'three';
import { asphaltTexture, sidewalkTexture, sandTexture, oceanTexture, skyTexture, sunGlowTexture, cloudTexture, signTexture, containerTexture } from './textures.js';
import { makeHeroCar, makePoliceCar, makeCivilianCar, makeTaxi, makeVan, makeScooter } from './cars.js';
import { makeHelicopter } from './heli.js';
import { makeCrowd } from './people.js';

function rnd(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function box(w, h, d, mat, x = 0, y = 0, z = 0, shadow = true) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  m.castShadow = shadow; m.receiveShadow = true;
  return m;
}

// ---- palm tree: curved segmented trunk + layered drooping fronds ------
// A frond is three chained tapered segments that droop progressively, so
// it reads as a curved 3D leaf with volume — never a flat cone star.
// Two tiers (upper + lower drooping ring) + a thick ringed trunk.
function makePalm(seed = 1, scale = 1) {
  const r = rnd(seed);
  const g = new THREE.Group();
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x7a5a38, roughness: 0.9 });
  const ringMat = new THREE.MeshStandardMaterial({ color: 0x5a4026, roughness: 0.95 });
  const frondMat = new THREE.MeshStandardMaterial({ color: 0x2f9e4f, roughness: 0.8, side: THREE.DoubleSide });
  const frondMat2 = new THREE.MeshStandardMaterial({ color: 0x45b45e, roughness: 0.8, side: THREE.DoubleSide });
  const frondMat3 = new THREE.MeshStandardMaterial({ color: 0x1f7a38, roughness: 0.8, side: THREE.DoubleSide });
  let x = 0, y = 0;
  const lean = (r() - 0.5) * 0.5;
  for (let i = 0; i < 5; i++) {
    const seg = new THREE.Mesh(new THREE.CylinderGeometry(0.17 - i * 0.018, 0.21 - i * 0.018, 1.5, 8), trunkMat);
    x += lean * 0.3;
    seg.position.set(x, y + 0.75, 0);
    seg.rotation.z = -lean * 0.25;
    seg.castShadow = true;
    g.add(seg);
    // ring band at each trunk joint
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.19 - i * 0.016, 0.025, 6, 12), ringMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.set(x + lean * 0.15, y + 1.45, 0);
    g.add(ring);
    y += 1.45;
  }
  const topX = x, topY = y;
  // coconuts
  const nutMat = new THREE.MeshStandardMaterial({ color: 0x5a3a1a, roughness: 0.9 });
  for (let i = 0; i < 3; i++) {
    const nut = new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 6), nutMat);
    nut.position.set(topX + (r() - 0.5) * 0.4, topY - 0.15, (r() - 0.5) * 0.4);
    g.add(nut);
  }
  // one frond = a chain of 3 tapered, flattening segments, each drooping
  // further than the last, so the leaf arcs down under its own weight
  function makeFrond(mat, len) {
    const f = new THREE.Group();
    let px = 0, py = 0, pitch = -0.15;
    const segs = [[0.34, len * 0.42], [0.26, len * 0.36], [0.16, len * 0.30]];
    for (const [wdt, slen] of segs) {
      const s = new THREE.Mesh(new THREE.ConeGeometry(wdt, slen, 6), mat);
      s.scale.set(1, 1, 0.22);
      // cone points +Y; lay it along +X with a droop pitch
      s.rotation.z = -Math.PI / 2 + pitch;
      s.position.set(px + Math.cos(pitch) * slen * 0.45, py + Math.sin(pitch) * slen * 0.45, 0);
      s.castShadow = true;
      f.add(s);
      px += Math.cos(pitch) * slen * 0.9;
      py += Math.sin(pitch) * slen * 0.9;
      pitch -= 0.55; // each segment droops further
    }
    return f;
  }
  const frondMats = [frondMat, frondMat2, frondMat3];
  for (let tier = 0; tier < 2; tier++) {
    const n = tier === 0 ? 8 : 7;
    const basePitch = tier === 0 ? 0.35 : -0.15; // upper tier lifts, lower droops
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + r() * 0.3 + tier * 0.4;
      const f = makeFrond(frondMats[i % 3], 2.6 + r() * 0.7);
      f.position.set(topX, topY + (tier === 0 ? 0.25 : -0.05), 0);
      f.rotation.y = -a;
      f.rotation.x = basePitch;
      g.add(f);
    }
  }
  g.scale.setScalar(scale);
  return g;
}

// ---- building with real depth: setbacks, balconies, awnings, roof kit --
const BUILDING_COLORS = [0xe8b48a, 0xd98a6a, 0x7fb8a8, 0xe8d8a8, 0xc98a9a, 0x9ab8d8, 0xf0e0c0, 0xb88a6a];
const WINDOW_LIT = [0xffd98a, 0xffe9b0, 0x9fd8ff, 0xffb36b];
const WINDOW_DARK = [0x2a3444, 0x1e2836, 0x35424e];

function makeBuilding(seed, w, h, d, color) {
  const r = rnd(seed);
  const g = new THREE.Group();
  const wall = new THREE.MeshStandardMaterial({ color, roughness: 0.85 });
  const wall2 = new THREE.MeshStandardMaterial({ color: new THREE.Color(color).multiplyScalar(0.82), roughness: 0.85 });
  const trim = new THREE.MeshStandardMaterial({ color: 0xf5efe0, roughness: 0.8 });
  // main slab + setback upper slab + crown
  const h1 = h * 0.62, h2 = h * 0.28, h3 = h * 0.10;
  g.add(box(w, h1, d, wall, 0, h1 / 2, 0));
  g.add(box(w * 0.78, h2, d * 0.8, wall2, 0, h1 + h2 / 2, 0));
  g.add(box(w * 0.5, h3, d * 0.55, trim, 0, h1 + h2 + h3 / 2, 0));
  // rooftop kit: AC boxes, water tank, antenna
  g.add(box(1.2, 0.7, 1.0, trim, -w * 0.2, h1 + h2 + h3 + 0.35, 0));
  const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 1.6, 10),
    new THREE.MeshStandardMaterial({ color: 0x8a9aa8, roughness: 0.6, metalness: 0.4 }));
  tank.position.set(w * 0.22, h1 + h2 + h3 + 0.8, d * 0.1);
  tank.castShadow = true;
  g.add(tank);
  const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.08, 3.2, 6),
    new THREE.MeshStandardMaterial({ color: 0x666666, roughness: 0.5, metalness: 0.7 }));
  ant.position.set(-w * 0.3, h1 + h2 + h3 + 1.6, -d * 0.2);
  g.add(ant);
  // windows: framed + recessed, on EVERY face — never a flat wall with
  // squares pasted on. Each window gets a dark frame box (proud of the
  // wall), a glass pane set inside it, and a sill below; balconies hang
  // off some of them. Faces: +X (street), -X, +Z and -Z.
  const floors = Math.max(3, Math.floor(h1 / 3.2));
  const cols = Math.max(3, Math.floor(d / 2.6));
  const frameMat = new THREE.MeshStandardMaterial({ color: 0x2a2f38, roughness: 0.6, metalness: 0.3 });
  const sillMat = new THREE.MeshStandardMaterial({ color: 0xf5efe0, roughness: 0.8 });
  function addWindow(px, py, pz, ry, wx) {
    // frame box (proud), glass pane (recessed inside it), sill below.
    // All three are built facing +Z and rotated by ry, so the thin axis
    // always lines up with the wall normal — never buried sideways.
    const frame = box(1.5, 1.9, 0.10, frameMat, px, py, pz);
    frame.rotation.y = ry;
    g.add(frame);
    const lit = r() < 0.45;
    const wc = lit ? WINDOW_LIT[Math.floor(r() * WINDOW_LIT.length)] : WINDOW_DARK[Math.floor(r() * WINDOW_DARK.length)];
    const win = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 1.7),
      new THREE.MeshStandardMaterial({ color: wc, emissive: lit ? wc : 0x000000, emissiveIntensity: lit ? 0.55 : 0, roughness: 0.2, metalness: 0.3 }));
    win.position.set(px, py, pz);
    win.rotation.y = ry;
    // push the glass just proud of the frame face so it is never buried
    win.translateZ(0.06);
    g.add(win);
    const sill = box(1.6, 0.10, 0.14, sillMat, px, py - 1.0, pz);
    sill.rotation.y = ry;
    sill.translateZ(0.04);
    g.add(sill);
    // balcony slab + rail under some windows
    if (r() < 0.4) {
      const balc = box(1.7, 0.14, 0.7, trim, px, py - 1.0, pz);
      balc.rotation.y = ry;
      balc.translateZ(0.35);
      g.add(balc);
      const rail = box(1.7, 0.5, 0.05, new THREE.MeshStandardMaterial({ color: 0x3a4a5a, roughness: 0.6, metalness: 0.4 }), px, py - 0.7, pz);
      rail.rotation.y = ry;
      rail.translateZ(0.68);
      g.add(rail);
    }
  }
  for (let f = 0; f < floors; f++) {
    for (let cxi = 0; cxi < cols; cxi++) {
      if (r() < 0.18) continue; // some blank wall — not a uniform grid
      const wy = 2.2 + f * 3.2;
      const wx = -d / 2 + (cxi + 0.5) * (d / cols);
      addWindow(w / 2, wy, wx, Math.PI / 2, wx);
    }
    // back face (-X) and both long faces (+Z / -Z), sparser
    for (let cxi = 0; cxi < cols; cxi++) {
      if (r() < 0.45) continue;
      const wy = 2.2 + f * 3.2;
      const wx = -d / 2 + (cxi + 0.5) * (d / cols);
      addWindow(-w / 2, wy, wx, -Math.PI / 2, wx);
      const wz = -w / 2 + (cxi + 0.5) * (w / cols);
      addWindow(wz, wy, d / 2, 0, wz);
      addWindow(wz, wy, -d / 2, Math.PI, wz);
    }
  }
  // floor-band cornices: thin trim strips wrapping the slab at every floor
  // line, so the wall breaks into storeys instead of one flat expanse
  for (let f = 1; f < floors; f++) {
    const by = 0.8 + f * 3.2;
    g.add(box(w + 0.24, 0.18, d + 0.24, trim, 0, by, 0));
  }
  // corner pilasters: vertical trim ribs on all four corners
  for (const [px, pz] of [[-w / 2, -d / 2], [w / 2, -d / 2], [-w / 2, d / 2], [w / 2, d / 2]]) {
    g.add(box(0.5, h1, 0.5, trim, px, h1 / 2, pz));
  }
  // parapet cap around the roof edge
  g.add(box(w + 0.2, 0.35, 0.25, trim, 0, h1 + 0.17, d / 2));
  g.add(box(w + 0.2, 0.35, 0.25, trim, 0, h1 + 0.17, -d / 2));
  g.add(box(0.25, 0.35, d + 0.2, trim, w / 2, h1 + 0.17, 0));
  g.add(box(0.25, 0.35, d + 0.2, trim, -w / 2, h1 + 0.17, 0));
  // awnings over the ground floor + shopfront (street side)
  const awnColors = [0xff5d8f, 0x37e0c8, 0xffd76a, 0xff9d2e];
  const awn = new THREE.MeshStandardMaterial({ color: awnColors[Math.floor(r() * awnColors.length)], roughness: 0.8, side: THREE.DoubleSide });
  const aw = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.08, w * 0.7), awn);
  aw.position.set(w / 2 + 0.8, 3.4, 0);
  aw.rotation.z = -0.28;
  aw.castShadow = true;
  g.add(aw);
  const shop = new THREE.Mesh(new THREE.PlaneGeometry(d * 0.7, 2.6),
    new THREE.MeshStandardMaterial({ color: 0x1e2a3a, emissive: 0xffc832, emissiveIntensity: 0.25, roughness: 0.3 }));
  shop.position.set(w / 2 + 0.02, 1.5, 0);
  shop.rotation.y = Math.PI / 2;
  g.add(shop);
  return g;
}

function makeSign(text, sub, bg, fg) {
  const tex = signTexture([text, sub], { w: 512, h: 160, bg, fg, border: '#ffd76a' });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(6.4, 2.0),
    new THREE.MeshBasicMaterial({ map: tex }));
  return m;
}

// ---- the city ------------------------------------------------------------
export function buildCity(scene) {
  const refs = { traffic: [], crowdSpots: [], heli: null, hero: null, updateFns: [] };
  const R = rnd(90210);

  // ---- sky dome + sun + clouds ----
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(650, 24, 16),
    new THREE.MeshBasicMaterial({ map: skyTexture(), side: THREE.BackSide, fog: false }),
  );
  scene.add(sky);
  const sunTex = sunGlowTexture();
  const sunSprite = new THREE.Sprite(new THREE.SpriteMaterial({
    map: sunTex, transparent: true, depthWrite: false, fog: false,
  }));
  // low sun, centred over the road corridor: the sightline from the cover
  // camera runs straight down the boulevard, so the disc clears every
  // building and sits upper-right in the cover frame (the west-row roofs
  // hide any sun placed further west — v9's (-150, 50) was invisible)
  sunSprite.position.set(-30, 48, -400);
  sunSprite.scale.set(150, 150, 1);
  scene.add(sunSprite);
  // the disc itself: a saturated amber ring with a bright white-gold heart,
  // so it reads as a SUN against the orange sky instead of blending into it
  const sunOuter = new THREE.Mesh(new THREE.CircleGeometry(30, 32),
    new THREE.MeshBasicMaterial({ color: 0xff9d2e, fog: false }));
  sunOuter.position.set(-30, 48, -398);
  sunOuter.lookAt(0, 10, 60);
  scene.add(sunOuter);
  const sunCore = new THREE.Mesh(new THREE.CircleGeometry(19, 32),
    new THREE.MeshBasicMaterial({ color: 0xfff6d8, fog: false }));
  sunCore.position.set(-30, 48, -397);
  sunCore.lookAt(0, 10, 60);
  scene.add(sunCore);
  const cloudTex = cloudTexture();
  for (let i = 0; i < 14; i++) {
    const cl = new THREE.Sprite(new THREE.SpriteMaterial({ map: cloudTex, transparent: true, opacity: 0.75, depthWrite: false, fog: false }));
    cl.position.set(-260 + R() * 520, 90 + R() * 110, -380 + R() * 420);
    cl.scale.set(90 + R() * 110, 26 + R() * 22, 1);
    scene.add(cl);
  }

  // ---- lights ----
  const sun = new THREE.DirectionalLight(0xffb36b, 2.9);
  sun.position.set(-60, 110, -140);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -90; sun.shadow.camera.right = 90;
  sun.shadow.camera.top = 90; sun.shadow.camera.bottom = -90;
  sun.shadow.camera.far = 500;
  sun.shadow.bias = -0.0004;
  scene.add(sun);
  scene.add(new THREE.HemisphereLight(0xffd9a0, 0x3a4a5a, 0.85));
  const fill = new THREE.DirectionalLight(0x8fb8ff, 0.35);
  fill.position.set(80, 60, 120);
  scene.add(fill);
  // warm rim from the west, where the sun sits: edges facing the sunset
  // pick up a hot rim so cars and buildings stop reading flat
  const rim = new THREE.DirectionalLight(0xff9d5c, 0.55);
  rim.position.set(-140, 36, -120);
  scene.add(rim);

  // ---- ground base (lawn) ----
  const lawn = new THREE.Mesh(new THREE.PlaneGeometry(520, 420),
    new THREE.MeshStandardMaterial({ color: 0x5f8f4a, roughness: 1 }));
  lawn.rotation.x = -Math.PI / 2;
  lawn.position.set(40, 0, 0);
  lawn.receiveShadow = true;
  scene.add(lawn);
  // lawn texture patches: bushes + path stones break the flat green
  const bushMat = new THREE.MeshStandardMaterial({ color: 0x3f7a34, roughness: 1 });
  const bushMat2 = new THREE.MeshStandardMaterial({ color: 0x6fae4e, roughness: 1 });
  for (let i = 0; i < 60; i++) {
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.7 + R() * 0.9, 8, 6), R() > 0.5 ? bushMat : bushMat2);
    b.scale.y = 0.6;
    const side = R() > 0.5 ? -1 : 1;
    b.position.set(side * (16 + R() * 22), 0.3, -170 + R() * 340);
    if (Math.abs(b.position.x) < 14) b.position.x = side * (14 + R() * 8);
    // keep the pier-camera sightline clear: no bush in front of the lens
    if (b.position.x > 13 && b.position.z > -115 && b.position.z < -75) continue;
    b.castShadow = true;
    scene.add(b);
  }

  // ---- main road (asphalt with grain, patches, wear) ----
  const asphalt = asphaltTexture();
  asphalt.repeat.set(1, 22);
  const road = new THREE.Mesh(new THREE.PlaneGeometry(14, 340),
    new THREE.MeshStandardMaterial({ map: asphalt, roughness: 0.94 }));
  road.rotation.x = -Math.PI / 2;
  road.position.set(0, 0.02, 0);
  road.receiveShadow = true;
  scene.add(road);
  // cross street at z = 60
  const asphalt2 = asphaltTexture();
  asphalt2.repeat.set(4, 1);
  const cross = new THREE.Mesh(new THREE.PlaneGeometry(64, 10),
    new THREE.MeshStandardMaterial({ map: asphalt2, roughness: 0.94 }));
  cross.rotation.x = -Math.PI / 2;
  cross.position.set(-14, 0.02, 60);
  cross.receiveShadow = true;
  scene.add(cross);

  // ---- markings: sit ON the road (y = 0.045) ----
  const markWhite = new THREE.MeshBasicMaterial({ color: 0xf2f2ea });
  const markYellow = new THREE.MeshBasicMaterial({ color: 0xf5c832 });
  function stripe(w, l, mat, x, z, ry = 0) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, l), mat);
    m.rotation.x = -Math.PI / 2; m.rotation.z = ry;
    m.position.set(x, 0.045, z);
    m.receiveShadow = true;
    scene.add(m);
  }
  for (const z of [-160, -140, -120, -100, -80, -60, -40, -20, 0, 20, 40, 80, 100, 120, 140, 160]) {
    stripe(0.28, 5, markWhite, -3.5, z);
    stripe(0.28, 5, markWhite, 3.5, z);
  }
  stripe(0.3, 340, markYellow, -0.4, 0);
  stripe(0.3, 340, markYellow, 0.4, 0);
  stripe(0.25, 340, markWhite, -6.7, 0);
  stripe(0.25, 340, markWhite, 6.7, 0);
  // crosswalks (zebra stripes) at z = -8, -48, 32, 78
  for (const cz of [-8, -48, 32, 78]) {
    for (let i = 0; i < 9; i++) {
      const x = -6.3 + i * 1.575;
      stripe(0.85, 3.6, markWhite, x, cz);
    }
    stripe(0.5, 13.5, markWhite, 0, cz - 2.4); // stop line
  }
  // drains + manholes
  const drainMat = new THREE.MeshStandardMaterial({ color: 0x1c1e22, roughness: 0.9 });
  for (const [x, z] of [[-6.2, -30], [6.2, 10], [-6.2, 55], [6.2, -70], [-2, 95], [2, -120]]) {
    const d = new THREE.Mesh(new THREE.CircleGeometry(0.55, 16), drainMat);
    d.rotation.x = -Math.PI / 2;
    d.position.set(x, 0.05, z);
    scene.add(d);
    const grate = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.5), drainMat);
    grate.rotation.x = -Math.PI / 2;
    grate.position.set(x === -6.2 ? -6.6 : 6.6, 0.05, z + 6);
    scene.add(grate);
  }

  // ---- sidewalks + curbs ----
  const walk = sidewalkTexture();
  walk.repeat.set(2, 40);
  for (const side of [-1, 1]) {
    const sw = new THREE.Mesh(new THREE.PlaneGeometry(5, 340),
      new THREE.MeshStandardMaterial({ map: walk, roughness: 0.95 }));
    sw.rotation.x = -Math.PI / 2;
    sw.position.set(side * 9.5, 0.03, 0);
    sw.receiveShadow = true;
    scene.add(sw);
    // kerb stones along the road edge
    const kerb = box(0.35, 0.16, 340, new THREE.MeshStandardMaterial({ color: 0x9a8a72, roughness: 0.9 }), side * 7.15, 0.08, 0);
    scene.add(kerb);
    // grass strip between sidewalk and buildings/beach
    const grass = new THREE.Mesh(new THREE.PlaneGeometry(3.5, 340),
      new THREE.MeshStandardMaterial({ color: 0x6f9a52, roughness: 1 }));
    grass.rotation.x = -Math.PI / 2;
    grass.position.set(side * 13.8, 0.035, 0);
    grass.receiveShadow = true;
    scene.add(grass);
  }

  // ---- beach + ocean (east) ----
  const sand = sandTexture();
  sand.repeat.set(6, 20);
  const beach = new THREE.Mesh(new THREE.PlaneGeometry(46, 380),
    new THREE.MeshStandardMaterial({ map: sand, roughness: 1 }));
  beach.rotation.x = -Math.PI / 2;
  beach.position.set(38, 0.04, 0);
  beach.receiveShadow = true;
  scene.add(beach);
  const ocean = oceanTexture();
  ocean.repeat.set(10, 14);
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(240, 400),
    new THREE.MeshStandardMaterial({ map: ocean, roughness: 0.55, metalness: 0.15 }));
  sea.rotation.x = -Math.PI / 2;
  sea.position.set(180, 0.05, 0);
  sea.receiveShadow = true;
  scene.add(sea);
  // foam line at the shoreline
  const foam = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 380),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55 }));
  foam.rotation.x = -Math.PI / 2;
  foam.position.set(60.5, 0.07, 0);
  scene.add(foam);
  // beach umbrellas + towels + people
  const umbColors = [0xff5d8f, 0x37e0c8, 0xffd76a, 0xff9d2e, 0x9d7bff];
  for (let i = 0; i < 16; i++) {
    const ux = 20 + R() * 34, uz = -160 + R() * 320;
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.4, 6),
      new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.5 }));
    pole.position.set(ux, 1.2, uz);
    scene.add(pole);
    const top = new THREE.Mesh(new THREE.ConeGeometry(2.1, 0.9, 8),
      new THREE.MeshStandardMaterial({ color: umbColors[i % umbColors.length], roughness: 0.8, side: THREE.DoubleSide }));
    top.position.set(ux, 2.6, uz);
    top.castShadow = true;
    scene.add(top);
    const towel = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 1.8),
      new THREE.MeshStandardMaterial({ color: umbColors[(i + 2) % umbColors.length], roughness: 0.9 }));
    towel.rotation.x = -Math.PI / 2;
    towel.position.set(ux + 1.6, 0.07, uz + 0.8);
    scene.add(towel);
  }
  // beach-life cluster near the beach-shot camera (x 20..42, z -20..-4):
  // umbrellas, towels, a volleyball net and sunbathers so the foreground
  // sand never reads as one flat beige plane
  for (let i = 0; i < 5; i++) {
    const ux = 20 + i * 4.2, uz = -18 + (i % 2) * 9;
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.4, 6),
      new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.5 }));
    pole.position.set(ux, 1.2, uz);
    scene.add(pole);
    const top = new THREE.Mesh(new THREE.ConeGeometry(2.1, 0.9, 8),
      new THREE.MeshStandardMaterial({ color: umbColors[(i + 1) % umbColors.length], roughness: 0.8, side: THREE.DoubleSide }));
    top.position.set(ux, 2.6, uz);
    top.castShadow = true;
    scene.add(top);
    const towel = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 1.8),
      new THREE.MeshStandardMaterial({ color: umbColors[(i + 3) % umbColors.length], roughness: 0.9 }));
    towel.rotation.x = -Math.PI / 2;
    towel.position.set(ux + 1.8, 0.07, uz + 1);
    scene.add(towel);
  }
  // volleyball net
  for (const nz of [-14, -6]) {
    const np = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.4, 6),
      new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.5 }));
    np.position.set(28, 1.2, nz);
    scene.add(np);
  }
  const net = new THREE.Mesh(new THREE.PlaneGeometry(8, 1.1),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.45, side: THREE.DoubleSide }));
  net.position.set(28, 1.8, -10);
  scene.add(net);
  // beach ball
  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.45, 12, 10),
    new THREE.MeshStandardMaterial({ color: 0xff5d8f, roughness: 0.4 }));
  ball.position.set(24, 0.45, -12);
  ball.castShadow = true;
  scene.add(ball);
  // south beach cluster (fills the beach shot's bottom-right corner):
  // umbrellas, towels and sunbathers on the sand near the boulevard —
  // mid-ground, clear of the camera lens so they read as beach life,
  // not a giant umbrella in the foreground
  for (let i = 0; i < 3; i++) {
    const ux = 22 + i * 5, uz = (i % 2) * 6;
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.4, 6),
      new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.5 }));
    pole.position.set(ux, 1.2, uz);
    scene.add(pole);
    const top = new THREE.Mesh(new THREE.ConeGeometry(2.1, 0.9, 8),
      new THREE.MeshStandardMaterial({ color: umbColors[(i + 4) % umbColors.length], roughness: 0.8, side: THREE.DoubleSide }));
    top.position.set(ux, 2.6, uz);
    top.castShadow = true;
    scene.add(top);
    const towel = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 1.8),
      new THREE.MeshStandardMaterial({ color: umbColors[(i + 1) % umbColors.length], roughness: 0.9 }));
    towel.rotation.x = -Math.PI / 2;
    towel.position.set(ux + 1.8, 0.07, uz + 1);
    scene.add(towel);
  }

  // ---- buildings: west row (Downtown) ----
  const signs = [
    ['CORAL HOTEL', 'ROOMS · POOL · BAR', '#7a2d4d', '#ffd76a'],
    ['MARINA ARCADE', 'SHOPS · FOOD · FUN', '#12324a', '#7dff9a'],
    ['PIER 9 TOWER', 'APARTMENTS', '#2d4a1f', '#ffe9a8'],
    ['SUNSET PLAZA', 'OFFICES', '#4a2d5e', '#ffd76a'],
    ['CORAL BAY BANK', 'OPEN 24H', '#12324a', '#9fd8ff'],
    ['THE PALMS', 'RESIDENCES', '#5e2a1a', '#ffd76a'],
  ];
  const bz = [-150, -118, -86, -52, -18, 16, 48, 88, 122, 152];
  bz.forEach((z, i) => {
    const h = 16 + R() * 26;
    const w = 16 + R() * 8;
    const d = 14 + R() * 6;
    const b = makeBuilding(500 + i * 31, w, h, d, BUILDING_COLORS[i % BUILDING_COLORS.length]);
    b.position.set(-24 - R() * 6, 0, z + (R() - 0.5) * 6);
    b.rotation.y = (R() - 0.5) * 0.06;
    scene.add(b);
    if (i < signs.length) {
      const s = makeSign(signs[i][0], signs[i][1], signs[i][2], signs[i][3]);
      s.position.set(-24 + w / 2 + 0.6, Math.min(h * 0.55, 12), z);
      s.rotation.y = Math.PI / 2;
      scene.add(s);
    }
  });
  // a few low beachfront blocks north, facing the sand
  for (let i = 0; i < 3; i++) {
    const b = makeBuilding(900 + i * 47, 14, 9 + R() * 5, 12, BUILDING_COLORS[(i + 3) % BUILDING_COLORS.length]);
    b.position.set(-20, 0, 96 + i * 26);
    scene.add(b);
  }
  // ---- second skyline row (graphics push, fix round 5) ----
  // A TALLER row BEHIND the west row (x ~-44), so the skyline reads
  // dense from the road and the title screen shows a real dusk
  // skyline, not a single row. z sits between the first row's
  // buildings (midpoints, so the rows interleave, not collide) and
  // stops at 105: the docks apron runs z 120..165 and the garage
  // sits at (-30, 96), so nothing here can block a mission route.
  // The towers are SIMPLE (slab + setback + crown, NO per-window
  // meshes): a full makeBuilding carries 250-750 window meshes, and
  // 8 of them tanked the headless frame rate ~29% (wheels-spin fell
  // 29.4 -> 21.0, and the slower game time shifted the police-ram
  // timing so the crew-quick-fix side check failed 64->112 on v15
  // while v13 passed 56->120). At 45 m from the road a windowless
  // dark tower reads as a distant silhouette — the density stays,
  // the cost is 3 meshes per tower.
  function makeSkylineTower(w, h, d, color) {
    const g = new THREE.Group();
    const wall = new THREE.MeshStandardMaterial({ color, roughness: 0.85 });
    const wall2 = new THREE.MeshStandardMaterial({ color: new THREE.Color(color).multiplyScalar(0.82), roughness: 0.85 });
    const trim = new THREE.MeshStandardMaterial({ color: 0xf5efe0, roughness: 0.8 });
    const h1 = h * 0.62, h2 = h * 0.28, h3 = h * 0.10;
    g.add(box(w, h1, d, wall, 0, h1 / 2, 0));
    g.add(box(w * 0.78, h2, d * 0.8, wall2, 0, h1 + h2 / 2, 0));
    g.add(box(w * 0.5, h3, d * 0.55, trim, 0, h1 + h2 + h3 / 2, 0));
    return g;
  }
  const bz2 = [-134, -102, -70, -38, -2, 32, 68, 105];
  bz2.forEach((z, i) => {
    const h = 22 + R() * 26;
    const w = 16 + R() * 8;
    const d = 14 + R() * 6;
    const b = makeSkylineTower(w, h, d, BUILDING_COLORS[(i + 2) % BUILDING_COLORS.length]);
    b.position.set(-44 - R() * 4, 0, z + (R() - 0.5) * 6);
    b.rotation.y = (R() - 0.5) * 0.06;
    scene.add(b);
  });
  // billboard on the west side
  const bb = makeSign('CORAL BAY HEAT', 'THE CITY IS YOURS', '#1a0f2e', '#ff5d8f');
  bb.position.set(-13.5, 9, -32);
  bb.rotation.y = Math.PI / 2;
  scene.add(bb);
  const bbPole = box(0.5, 9, 0.5, new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.6, metalness: 0.6 }), -14.2, 4.5, -32);
  scene.add(bbPole);

  // ---- palms along both sidewalks + beach edge ----
  for (let i = 0; i < 26; i++) {
    const z = -165 + i * 13.5;
    const p = makePalm(700 + i * 13, 0.95 + R() * 0.25);
    p.position.set(-12.2, 0, z + (R() - 0.5) * 3);
    scene.add(p);
    const p2 = makePalm(1700 + i * 13, 0.9 + R() * 0.3);
    p2.position.set(12.6, 0, z + 6 + (R() - 0.5) * 3);
    scene.add(p2);
  }
  // street lamps + traffic lights
  const lampMat = new THREE.MeshStandardMaterial({ color: 0x2a2f38, roughness: 0.5, metalness: 0.7 });
  for (let i = 0; i < 12; i++) {
    const z = -150 + i * 28;
    for (const side of [-1, 1]) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 6.5, 8), lampMat);
      pole.position.set(side * 11.8, 3.25, z);
      pole.castShadow = true;
      scene.add(pole);
      const arm = box(1.6, 0.1, 0.1, lampMat, side * 11.0, 6.4, z);
      scene.add(arm);
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8),
        new THREE.MeshStandardMaterial({ color: 0xfff2b0, emissive: 0xffdf80, emissiveIntensity: 1.6 }));
      lamp.position.set(side * 10.2, 6.3, z);
      scene.add(lamp);
    }
  }
  // bus stop on the east sidewalk
  const busSign = makeSign('BUS STOP', 'LINE 9 · PIER', '#12324a', '#ffffff');
  busSign.scale.set(0.45, 0.45, 0.45);
  busSign.position.set(11.6, 2.6, 24);
  busSign.rotation.y = -Math.PI / 2;
  scene.add(busSign);
  const busPole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.6, 8), lampMat);
  busPole.position.set(11.6, 1.3, 24);
  scene.add(busPole);

  // ---- Pier 9 (z = -95, east into the bay) ----
  const pierGroup = new THREE.Group();
  const plankMat = new THREE.MeshStandardMaterial({ color: 0x9a6a42, roughness: 0.95 });
  const plankMat2 = new THREE.MeshStandardMaterial({ color: 0x8a5a34, roughness: 0.95 });
  for (let i = 0; i < 60; i++) {
    const plank = box(1.15, 0.12, 7.6, i % 2 ? plankMat : plankMat2, 14 + i * 1.15, 0.35, -95);
    pierGroup.add(plank);
  }
  for (const z of [-99, -91]) {
    pierGroup.add(box(70, 0.25, 0.3, plankMat2, 48, 0.55, z));
  }
  for (let i = 0; i < 12; i++) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 1.4, 8),
      new THREE.MeshStandardMaterial({ color: 0x6a4526, roughness: 0.95 }));
    post.position.set(16 + i * 5.8, 0.9, i % 2 ? -99.2 : -90.8);
    pierGroup.add(post);
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 8),
      new THREE.MeshStandardMaterial({ color: 0xfff2b0, emissive: 0xffdf80, emissiveIntensity: 1.8 }));
    lamp.position.set(16 + i * 5.8, 1.75, i % 2 ? -99.2 : -90.8);
    pierGroup.add(lamp);
  }
  // crates + barrels on the pier
  for (let i = 0; i < 8; i++) {
    const cr = box(1.1, 1.1, 1.1, new THREE.MeshStandardMaterial({ color: [0xb88a4a, 0x7a9a5a, 0x9a6a42][i % 3], roughness: 0.9 }),
      30 + R() * 30, 0.9, -97 + R() * 4);
    cr.rotation.y = R() * 1.2;
    pierGroup.add(cr);
  }
  // benches facing the water + a bait kiosk with a striped awning, so the
  // pier reads as a place people USE, not an empty boardwalk
  for (const bx of [24, 44, 62]) {
    pierGroup.add(box(2.2, 0.12, 0.6, plankMat2, bx, 0.75, -98.2));
    pierGroup.add(box(2.2, 0.12, 0.6, plankMat2, bx, 0.45, -98.2));
    pierGroup.add(box(0.12, 0.4, 0.55, plankMat2, bx - 0.9, 0.6, -98.2));
    pierGroup.add(box(0.12, 0.4, 0.55, plankMat2, bx + 0.9, 0.6, -98.2));
  }
  // bait kiosk at the pier root: counter, striped awning, sign
  pierGroup.add(box(3.2, 2.4, 2.4, new THREE.MeshStandardMaterial({ color: 0x2e7a9e, roughness: 0.8 }), 17.5, 1.6, -93.5));
  const kioskAwning = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.08, 1.6),
    new THREE.MeshStandardMaterial({ color: 0xff5d8f, roughness: 0.8, side: THREE.DoubleSide }));
  kioskAwning.position.set(17.5, 2.9, -92.0);
  kioskAwning.rotation.x = 0.3;
  pierGroup.add(kioskAwning);
  const kioskSign = makeSign('BAIT · TACKLE', 'FISHING', '#7a2d4d', '#ffd76a');
  kioskSign.scale.set(0.5, 0.5, 0.5);
  kioskSign.position.set(17.5, 3.6, -93.5);
  kioskSign.rotation.y = Math.PI / 2;
  pierGroup.add(kioskSign);
  // fishing rods leaning on the north railing + buckets
  for (const [rx, rz] of [[36, -99.1], [52, -99.1], [68, -99.1]]) {
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.045, 3.4, 6),
      new THREE.MeshStandardMaterial({ color: 0x3a3a3a, roughness: 0.6 }));
    rod.position.set(rx, 1.9, rz);
    rod.rotation.x = 0.5;
    pierGroup.add(rod);
    const bucket = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.26, 0.5, 10),
      new THREE.MeshStandardMaterial({ color: [0xc94a2e, 0x2e7a9e, 0xffd76a][Math.floor(R() * 3)], roughness: 0.7 }));
    bucket.position.set(rx + 0.8, 0.66, rz + 0.4);
    pierGroup.add(bucket);
  }
  // Fix round 3 (v12): the pier shot's foreground RIGHT was empty sand.
  // The new pier camera sits south of the root looking east, so its right
  // foreground is the pier's SOUTH edge (x 28..34, z -91..-93). Fill it
  // with real pier gear — crates, a barrel, a rope coil, a spare-plank
  // stack, a rod + bucket, a bench — all ON the planks at the edge, low
  // (nothing above 1.1 m), clear of the hero (28.5, -94.5) and of the
  // camera-hero corridor. The deck edge beam + plank texture do the rest.
  const gearWood = new THREE.MeshStandardMaterial({ color: 0xb88a4a, roughness: 0.9 });
  pierGroup.add(box(1.1, 1.1, 1.1, gearWood, 31.0, 0.96, -91.7));
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 1.0, 12),
    new THREE.MeshStandardMaterial({ color: 0x2e7a9e, roughness: 0.7 }));
  barrel.position.set(32.6, 0.91, -91.9);
  barrel.castShadow = true;
  pierGroup.add(barrel);
  const rope = new THREE.Mesh(new THREE.TorusGeometry(0.38, 0.10, 8, 16),
    new THREE.MeshStandardMaterial({ color: 0xc9a86a, roughness: 1 }));
  rope.rotation.x = -Math.PI / 2;
  rope.position.set(29.6, 0.47, -92.6);
  rope.castShadow = true;
  pierGroup.add(rope);
  // spare planks stacked flat by the edge, with a rod leaning on them
  for (let i = 0; i < 3; i++) {
    pierGroup.add(box(2.4, 0.09, 0.5, i % 2 ? plankMat : plankMat2, 33.2, 0.46 + i * 0.10, -92.4));
  }
  const rod2 = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.045, 3.0, 6),
    new THREE.MeshStandardMaterial({ color: 0x3a3a3a, roughness: 0.6 }));
  rod2.position.set(33.6, 1.8, -92.2);
  rod2.rotation.x = 0.45;
  rod2.rotation.z = 0.25;
  pierGroup.add(rod2);
  const bucket2 = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.26, 0.5, 10),
    new THREE.MeshStandardMaterial({ color: 0xc94a2e, roughness: 0.7 }));
  bucket2.position.set(34.3, 0.66, -92.0);
  pierGroup.add(bucket2);
  // south-edge bench (slabs + legs, facing the deck) at the right edge
  pierGroup.add(box(2.2, 0.12, 0.6, plankMat2, 34.5, 0.75, -91.8));
  pierGroup.add(box(2.2, 0.12, 0.6, plankMat2, 34.5, 0.45, -91.8));
  pierGroup.add(box(0.12, 0.4, 0.55, plankMat2, 33.6, 0.6, -91.8));
  pierGroup.add(box(0.12, 0.4, 0.55, plankMat2, 35.4, 0.6, -91.8));
  const pierSign = makeSign('PIER 9', 'FISHING · BOATS', '#12324a', '#ffd76a');
  pierSign.position.set(15.5, 3.4, -95);
  pierSign.rotation.y = Math.PI / 2;
  pierGroup.add(pierSign);
  scene.add(pierGroup);
  // ---- pier foreground (sand north of the pier root): the old pier shot
  // was a void of empty sand in the foreground. A beached dinghy on the
  // sand BEYOND the pier (24 m from the lens, never in the camera-hero
  // corridor) and flat towels by the pier root give the low pier camera
  // something to look over. Lesson from the first attempt: NOTHING tall
  // within 10 m of this lens — a lifeguard tower and a dinghy that close
  // filled the whole frame and hid the hero.
  const dinghy = makeBoat(0xffd76a, false);
  dinghy.position.set(40, 0.0, -102);
  dinghy.rotation.y = 0.8;
  scene.add(dinghy);
  for (const [tx, tz, col] of [[19, -90.5, 0xff5d8f], [23, -91.5, 0x37e0c8]]) {
    const tw = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 1.8),
      new THREE.MeshStandardMaterial({ color: col, roughness: 0.9 }));
    tw.rotation.x = -Math.PI / 2;
    tw.position.set(tx, 0.07, tz);
    scene.add(tw);
  }
  // Fix round 4 (v13): the pier shot's bottom-RIGHT foreground was STILL
  // bare sand. Fix 3 filled the pier deck's south edge, but the sand
  // strip the low pier camera actually looks over — x 24..36, z -88..-91,
  // right in front of the lens — had nothing in it. Fill THAT quadrant
  // with gear spread INTO it, not along an edge: crates, barrels, rope
  // coils, a plank stack, a bench, a cooler. All low (nothing above
  // 0.9 m) and at least 5 m from the lens, so they read as foreground
  // clutter without ever hiding the hero or the deck.
  const fillWood = new THREE.MeshStandardMaterial({ color: 0xb88a4a, roughness: 0.9 });
  const fillWood2 = new THREE.MeshStandardMaterial({ color: 0x7a9a5a, roughness: 0.9 });
  const fillBarrel = new THREE.MeshStandardMaterial({ color: 0x2e7a9e, roughness: 0.7 });
  const fillBarrel2 = new THREE.MeshStandardMaterial({ color: 0xc94a2e, roughness: 0.7 });
  for (const [cx, cz, s, ry] of [[25.5, -90.8, 0.8, 0.4], [28.0, -90.3, 0.85, 1.1], [33.0, -89.8, 1.1, 0.2]]) {
    const cr = box(s, s, s, s > 1 ? fillWood : fillWood2, cx, 0.04 + s / 2, cz);
    cr.rotation.y = ry;
    scene.add(cr);
  }
  for (const [bx, bz, bm] of [[26.5, -90.6, fillBarrel], [35.0, -90.5, fillBarrel2]]) {
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.95, 12), bm);
    bar.position.set(bx, 0.52, bz);
    bar.castShadow = true;
    scene.add(bar);
  }
  const ropeMat = new THREE.MeshStandardMaterial({ color: 0xc9a86a, roughness: 1 });
  for (const [rx, rz] of [[25.0, -88.3], [31.0, -88.8]]) {
    const coil = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.10, 8, 16), ropeMat);
    coil.rotation.x = -Math.PI / 2;
    coil.position.set(rx, 0.10, rz);
    coil.castShadow = true;
    scene.add(coil);
  }
  for (let i = 0; i < 3; i++) {
    scene.add(box(2.2, 0.09, 0.5, i % 2 ? plankMat : plankMat2, 29.5, 0.09 + i * 0.10, -89.0));
  }
  // low bench on the sand, facing the pier, at the quadrant's east edge
  // (seat + backrest slabs, same build as the pier benches)
  scene.add(box(2.0, 0.12, 0.55, plankMat2, 34.5, 0.75, -88.5));
  scene.add(box(2.0, 0.12, 0.55, plankMat2, 34.5, 0.45, -88.5));
  scene.add(box(0.12, 0.4, 0.5, plankMat2, 33.6, 0.6, -88.5));
  scene.add(box(0.12, 0.4, 0.5, plankMat2, 35.4, 0.6, -88.5));
  // cooler + bait bucket by the crates
  scene.add(box(0.7, 0.5, 0.45, new THREE.MeshStandardMaterial({ color: 0xf2f2ee, roughness: 0.6 }), 30.5, 0.29, -90.8));
  const baitBucket = new THREE.Mesh(new THREE.CylinderGeometry(0.30, 0.24, 0.48, 10),
    new THREE.MeshStandardMaterial({ color: 0xffd76a, roughness: 0.7 }));
  baitBucket.position.set(27.2, 0.28, -88.6);
  baitBucket.castShadow = true;
  scene.add(baitBucket);
  // boats in the bay
  function makeBoat(color, big) {
    const g = new THREE.Group();
    const hullMat = new THREE.MeshPhysicalMaterial({ color, metalness: 0.3, roughness: 0.4, clearcoat: 0.8 });
    const hull = new THREE.Mesh(new THREE.CylinderGeometry(big ? 1.6 : 1.1, big ? 1.1 : 0.8, big ? 7 : 5, 4, 1), hullMat);
    hull.rotation.x = Math.PI / 2;
    hull.rotation.y = Math.PI / 4;
    hull.scale.set(1, 1, 0.55);
    hull.position.y = 0.4;
    hull.castShadow = true;
    g.add(hull);
    const deck = box(big ? 2.2 : 1.5, 0.25, big ? 4.5 : 3.2, new THREE.MeshStandardMaterial({ color: 0xf2f2ee, roughness: 0.6 }), 0, 0.95, 0);
    g.add(deck);
    const cabin = box(big ? 1.6 : 1.1, 0.9, big ? 2.2 : 1.5, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 }), 0, 1.5, 0.4);
    g.add(cabin);
    g.add(box(big ? 1.7 : 1.2, 0.4, 0.1, MAT_GLASS(), 0, 1.55, -0.75));
    return g;
  }
  function MAT_GLASS() { return new THREE.MeshStandardMaterial({ color: 0x182838, roughness: 0.15, metalness: 0.5 }); }
  const boat1 = makeBoat(0xf2f2ee, true);
  boat1.position.set(66, 0.1, -102);
  boat1.rotation.y = 0.5;
  scene.add(boat1);
  const boat2 = makeBoat(0x1d2733, true);
  boat2.position.set(70, 0.1, -86);
  boat2.rotation.y = -0.4;
  scene.add(boat2);
  const boat3 = makeBoat(0xd21f26, false);
  boat3.position.set(62, 0.1, -78);
  boat3.rotation.y = 1.2;
  scene.add(boat3);
  // boats are boardable in M6/M7: the game picks the one nearest the
  // destination pier exit, never the one nearest the player
  refs.boats = [boat1, boat2, boat3];

  // ---- The Docks (north, z = 120..165) ----
  const dockMat = new THREE.MeshStandardMaterial({ color: 0x8a8a86, roughness: 0.95 });
  const apron = new THREE.Mesh(new THREE.PlaneGeometry(120, 50),
    new THREE.MeshStandardMaterial({ map: sidewalkTexture(), roughness: 0.95 }));
  apron.rotation.x = -Math.PI / 2;
  apron.position.set(-20, 0.04, 142);
  apron.receiveShadow = true;
  scene.add(apron);
  // gantry crane
  const craneMat = new THREE.MeshStandardMaterial({ color: 0xd98a2e, roughness: 0.55, metalness: 0.5 });
  const crane = new THREE.Group();
  for (const [x, z] of [[-38, 128], [-30, 128], [-38, 156], [-30, 156]]) {
    crane.add(box(1.4, 26, 1.4, craneMat, x, 13, z));
  }
  crane.add(box(10, 2, 30, craneMat, -34, 26, 142));
  crane.add(box(10, 1.6, 4, craneMat, -34, 29, 142));
  crane.add(box(1.2, 1.2, 1.2, new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.6 }), -34, 24.5, 136));
  // NOTE: the crane used to hang a cable + container at (-34, 14.5, 136).
  // From the docks camera that box lined up directly under the helicopter
  // and read as a disconnected sling load floating in the air — removed.
  scene.add(crane);
  // containers, stacked and coloured — ribbed steel (never a flat slab),
  // muted colours only: the old magenta stacks at x=2 sat right in the
  // docks camera's face and ate the bottom-right corner of the shot.
  const contColors = [0xc94a2e, 0x2e7a9e, 0x7a9e2e, 0xd9a02e, 0x3a7a8a, 0x4a6a8a];
  const contSpots = [
    [-52, 132, 0], [-52, 138, 0], [-52, 135, 1], [-58, 132, 0], [-58, 138, 0],
    [-12, 150, 0], [-12, 156, 0], [-12, 153, 1], [-6, 150, 0], [-46, 150, 0], [-40, 150, 0],
  ];
  contSpots.forEach(([x, z, lvl], i) => {
    const col = contColors[i % contColors.length];
    const c = box(6, 2.6, 2.6, new THREE.MeshStandardMaterial({ map: containerTexture(col), roughness: 0.7, metalness: 0.3 }), x, 1.3 + lvl * 2.6, z);
    c.rotation.y = (i % 3) * 0.02;
    scene.add(c);
  });
  // warehouses: real buildings with windows, rooflines and awnings on the
  // camera-facing (+X) side — never flat slabs — plus a dock office sign
  for (let i = 0; i < 2; i++) {
    const wh = makeBuilding(1200 + i * 53, 18, 9, 14, [0x9a8a72, 0x7a8a9a][i]);
    wh.position.set(-58 + i * 46, 0, 158);
    scene.add(wh);
  }
  const dockSign = makeSign('CORAL BAY DOCKS', 'CONTAINERS · FREIGHT', '#12324a', '#ffd76a');
  dockSign.position.set(-48.6, 7.5, 158);
  dockSign.rotation.y = Math.PI / 2;
  scene.add(dockSign);
  // forklift parked by the containers near the hero
  const fork = new THREE.Group();
  fork.add(box(1.6, 1.1, 2.2, new THREE.MeshStandardMaterial({ color: 0xd9a02e, roughness: 0.6, metalness: 0.3 }), 0, 0.75, 0));
  fork.add(box(1.4, 0.9, 1.0, new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.5 }), 0, 1.7, 0.3));
  fork.add(box(0.12, 2.4, 0.12, new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.5, metalness: 0.6 }), -0.6, 1.3, -1.2));
  fork.add(box(0.12, 2.4, 0.12, new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.5, metalness: 0.6 }), 0.6, 1.3, -1.2));
  fork.add(box(1.3, 0.06, 0.9, new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.4, metalness: 0.7 }), 0, 0.25, -1.5));
  fork.position.set(-8, 0, 146);
  fork.rotation.y = 0.5;
  scene.add(fork);
  // extra container rows + crates close to the docks camera, for depth
  // (flanking the hero, clear of the lens and the camera-hero corridor)
  const nearCont = [
    [-18, 144, 0, 0xc94a2e], [-24, 148, 0, 0x2e7a9e], [-26, 140, 0, 0x7a9e2e],
    [-24, 126, 0, 0xd9a02e], [-24, 132, 0, 0x3a7a8a], [-18, 129, 1, 0x4a6a8a],
  ];
  nearCont.forEach(([x, z, lvl, col], i) => {
    const c = box(6, 2.6, 2.6, new THREE.MeshStandardMaterial({ map: containerTexture(col), roughness: 0.7, metalness: 0.3 }), x, 1.3 + lvl * 2.6, z);
    c.rotation.y = (i % 3) * 0.03;
    scene.add(c);
  });
  for (let i = 0; i < 6; i++) {
    const cr = box(1.1, 1.1, 1.1, new THREE.MeshStandardMaterial({ color: [0xb88a4a, 0x7a9a5a, 0x9a6a42][i % 3], roughness: 0.9 }),
      -24 + R() * 16, 0.55, 142 + R() * 6);
    cr.rotation.y = R() * 1.2;
    scene.add(cr);
  }
  // ---- docks apron detail: the old apron was one flat grey-brown void.
  // Painted lane lines + a zebra crossing, glossy puddles, oil stains,
  // bollards along the yard edge and pallet stacks break it up.
  const apronMark = new THREE.MeshBasicMaterial({ color: 0xf5c832 });
  function apronStripe(w, l, x, z, ry = 0) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, l), apronMark);
    m.rotation.x = -Math.PI / 2; m.rotation.z = ry;
    m.position.set(x, 0.06, z);
    scene.add(m);
  }
  for (const z of [128, 136, 144, 152, 160]) apronStripe(0.3, 90, -20, z);
  for (let i = 0; i < 8; i++) apronStripe(0.9, 3.2, -2 + i * 1.7, 138); // zebra in front of the hero
  const puddleMat = new THREE.MeshStandardMaterial({ color: 0x4a5568, roughness: 0.25, metalness: 0.4 });
  for (const [px, pz, pr] of [[-10, 138, 1.6], [-16, 150, 2.2], [0, 146, 0.9]]) {
    const pud = new THREE.Mesh(new THREE.CircleGeometry(pr, 18), puddleMat);
    pud.rotation.x = -Math.PI / 2;
    pud.scale.set(1, 0.6, 1);
    pud.position.set(px, 0.06, pz);
    scene.add(pud);
  }
  const stainMat = new THREE.MeshBasicMaterial({ color: 0x141414, transparent: true, opacity: 0.45 });
  for (const [sx, sz, sr] of [[-6, 146, 1.4], [-20, 134, 1.8], [4, 148, 1.2]]) {
    const st = new THREE.Mesh(new THREE.CircleGeometry(sr, 14), stainMat);
    st.rotation.x = -Math.PI / 2;
    st.position.set(sx, 0.055, sz);
    scene.add(st);
  }
  const bolMat = new THREE.MeshStandardMaterial({ color: 0xd9a02e, roughness: 0.5, metalness: 0.4 });
  for (let i = 0; i < 10; i++) {
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 0.9, 10), bolMat);
    b.position.set(-52 + i * 6.5, 0.45, 124);
    b.castShadow = true;
    scene.add(b);
  }
  for (let i = 0; i < 4; i++) {
    const pal = box(1.4, 0.14, 1.2, new THREE.MeshStandardMaterial({ color: 0x9a6a42, roughness: 0.95 }),
      -30 + i * 3.2, 0.11, 148);
    scene.add(pal);
    scene.add(box(1.0, 0.9, 1.0, new THREE.MeshStandardMaterial({ color: [0xb88a4a, 0x7a9a5a][i % 2], roughness: 0.9 }),
      -30 + i * 3.2, 0.6, 148));
  }

  // ---- HERO + TRAFFIC ----
  const hero = makeHeroCar();
  hero.position.set(0.6, 0, 2);
  hero.rotation.y = 0.06;
  scene.add(hero);
  refs.hero = hero;

  const police1 = makePoliceCar();
  police1.position.set(-2.8, 0, -8.5);
  police1.rotation.y = -0.05;
  scene.add(police1);
  refs.traffic.push(police1);

  const police2 = makePoliceCar();
  police2.position.set(3.6, 0, -26);
  police2.rotation.y = 0.04;
  scene.add(police2);
  refs.traffic.push(police2);

  const civ1 = makeCivilianCar(0xe8e8e8);
  civ1.position.set(3.4, 0, -38);
  scene.add(civ1);
  refs.traffic.push(civ1);

  const civ2 = makeCivilianCar(0x2e5a8a);
  civ2.position.set(-3.5, 0, -48);
  scene.add(civ2);
  refs.traffic.push(civ2);

  const taxi = makeTaxi();
  taxi.position.set(-3.4, 0, -60);
  scene.add(taxi);
  refs.traffic.push(taxi);
  refs.taxi = taxi; // game.js used to find the taxi by fragile position match

  const van = makeVan(0x4a7a9e);
  van.position.set(3.5, 0, 22);
  van.rotation.y = Math.PI; // facing the other way, oncoming lane
  scene.add(van);
  refs.traffic.push(van);

  const scooter = makeScooter();
  scooter.position.set(4.6, 0, -18);
  scooter.rotation.y = 0.1;
  scene.add(scooter);
  refs.traffic.push(scooter);

  // a second police car + sedan on the cross street
  const police3 = makePoliceCar();
  police3.position.set(-18, 0, 60);
  police3.rotation.y = Math.PI / 2;
  scene.add(police3);
  refs.traffic.push(police3);

  // ---- HELICOPTER (cover: big, centre-top, against the sky) ----
  const heli = makeHelicopter();
  heli.position.set(0.5, 13.5, -38);
  heli.rotation.y = 0.5;
  heli.rotation.z = 0.06;
  heli.scale.setScalar(1.35);
  scene.add(heli);
  refs.heli = heli;

  // ---- CROWD: sidewalks, crosswalks, beach, pier ----
  // y = the surface each group stands on: sidewalk 0.03, road 0.045,
  // sand 0.04, pier planks 0.41, docks apron 0.04. Feet stay on it.
  const spots = [];
  for (let i = 0; i < 14; i++) {
    spots.push({ x: -9.6 + (R() - 0.5) * 1.2, z: -40 + i * 6.5, y: 0.03, rot: R() > 0.5 ? Math.PI : 0 });
    // east sidewalk: keep the cover-camera zone (z -2..26) clear so nobody
    // stands right in front of the lens
    const ez = -44 + i * 6.5;
    if (ez < -2 || ez > 26) spots.push({ x: 9.6 + (R() - 0.5) * 1.2, z: ez, y: 0.03, rot: R() > 0.5 ? Math.PI : 0 });
  }
  // crosswalk crowd at z = -8
  for (let i = 0; i < 6; i++) {
    spots.push({ x: -5 + i * 2.1, z: -8 + (R() - 0.5) * 2, y: 0.045, rot: Math.PI / 2 + (R() - 0.5) * 0.4 });
  }
  // beach crowd
  for (let i = 0; i < 16; i++) {
    spots.push({ x: 18 + R() * 36, z: -150 + R() * 300, y: 0.04, rot: R() * Math.PI * 2, scale: 0.95 });
  }
  // sunbathers + players around the beach-life cluster (near beach camera)
  for (let i = 0; i < 7; i++) {
    spots.push({ x: 20 + R() * 18, z: -20 + R() * 22, y: 0.04, rot: R() * Math.PI * 2, scale: 0.95 });
  }
  // south beach sunbathers (fills the beach shot's bottom-right corner)
  for (let i = 0; i < 5; i++) {
    spots.push({ x: 24 + R() * 14, z: 6 + R() * 16, y: 0.04, rot: R() * Math.PI * 2, scale: 0.95 });
  }
  // pier crowd — ON the planks (deck top 0.41), denser now: walkers down
  // the pier, a pair chatting by the kiosk, anglers at the north rail
  for (let i = 0; i < 12; i++) {
    spots.push({ x: 20 + R() * 44, z: -95 + (R() - 0.5) * 5, y: 0.41, rot: R() * Math.PI * 2 });
  }
  // fix round 3 (v12): two FIXED walkers on the pier's south edge, in the
  // new pier shot's right foreground (x 30..34, z -92..-93.5) — 6..11 m
  // from that lens, so they read as people, never as giants. Both stand
  // clear of the hero (28.5, -94.5) and of the camera-hero corridor.
  spots.push({ x: 30.5, z: -92.2, y: 0.41, rot: Math.PI * 0.85 });
  spots.push({ x: 34.0, z: -93.5, y: 0.41, rot: Math.PI * 1.1 });
  // Fix round 4 (v13): two walkers ON THE SAND in the pier shot's
  // bottom-right quadrant (x 26..34, z -89..-91), among the new crates
  // and rope coils — the quadrant gets people as well as gear, and the
  // nearer one (26, -90.2, ~7 m from the lens) anchors the foreground.
  spots.push({ x: 26.0, z: -90.2, y: 0.04, rot: Math.PI * 0.6 });
  spots.push({ x: 33.5, z: -89.6, y: 0.04, rot: Math.PI * 1.4 });
  for (let i = 0; i < 2; i++) {
    spots.push({ x: 21 + i * 1.2, z: -93.5 + (R() - 0.5) * 1.5, y: 0.41, rot: Math.PI / 2 });
  }
  for (const ax of [36, 52, 68]) {
    spots.push({ x: ax + 0.6, z: -98.4, y: 0.41, rot: Math.PI });
  }
  // docks workers — FIXED spots, hi-vis. Every one is at least 9 m from
  // the staged hero (-2, 143) AND at least 23 m from the docks camera
  // (5, 150): the first attempt put a worker 3 m from the lens and he
  // filled the whole foreground with his back.
  for (const [wx, wz] of [[-14, 136], [-20, 150], [-30, 138], [-24, 156], [-38, 148]]) {
    spots.push({ x: wx, z: wz, y: 0.04, rot: R() * Math.PI * 2, hivis: true });
  }
  refs.crowd = makeCrowd(scene, spots);
  return refs;
}
