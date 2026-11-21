// Coral Bay Heat — vehicles. Every car is built from shaped geometry:
// extruded side profiles with bevels (curved metal, never a box), flared
// wheel arches, real wheels with bright sidewalls and silver hubs, lights
// and louvres. Forward is -Z, width is X, up is Y.
import * as THREE from 'three';

// ---- shared materials -------------------------------------------------
const MAT = {
  tire: new THREE.MeshStandardMaterial({ color: 0x14161a, roughness: 0.92, metalness: 0.05 }),
  sidewall: new THREE.MeshStandardMaterial({ color: 0xc9ccd2, roughness: 0.55, metalness: 0.25 }),
  hub: new THREE.MeshStandardMaterial({ color: 0xdfe3e8, roughness: 0.22, metalness: 0.95 }),
  spoke: new THREE.MeshStandardMaterial({ color: 0x3a3f46, roughness: 0.35, metalness: 0.85 }),
  glass: new THREE.MeshPhysicalMaterial({ color: 0x0e1420, roughness: 0.08, metalness: 0.4, clearcoat: 1, clearcoatRoughness: 0.06 }),
  chrome: new THREE.MeshStandardMaterial({ color: 0xe8ecf0, roughness: 0.15, metalness: 1.0 }),
  blackTrim: new THREE.MeshStandardMaterial({ color: 0x111216, roughness: 0.6, metalness: 0.3 }),
  tailRed: new THREE.MeshStandardMaterial({ color: 0xaa0a12, emissive: 0xcc1122, emissiveIntensity: 0.9, roughness: 0.3 }),
  headWhite: new THREE.MeshStandardMaterial({ color: 0xfff6d8, emissive: 0xffeeb0, emissiveIntensity: 1.4, roughness: 0.25 }),
  amber: new THREE.MeshStandardMaterial({ color: 0xff9d2e, emissive: 0xff8c1a, emissiveIntensity: 0.8, roughness: 0.3 }),
};

function box(w, h, d, mat, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  return m;
}

// Extrude a side profile (x = length, front +, y = height) across the width.
function extrudedBody(points, width, mat, bevel = 0.07) {
  const shape = new THREE.Shape();
  shape.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++) shape.lineTo(points[i][0], points[i][1]);
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: width, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel * 0.9,
    bevelSegments: 3, steps: 1, curveSegments: 10,
  });
  geo.translate(0, 0, -width / 2);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.y = Math.PI / 2; // shape +X (front) -> world -Z (forward)
  mesh.castShadow = true;
  return mesh;
}

// One readable wheel: dark tyre, light sidewall ring, silver hub, spokes.
function makeWheel(radius = 0.36, width = 0.30) {
  const g = new THREE.Group();
  const tyre = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, width, 24), MAT.tire);
  tyre.rotation.z = Math.PI / 2;
  tyre.castShadow = true;
  g.add(tyre);
  // tread hint: slightly wider thin ring
  const tread = new THREE.Mesh(new THREE.CylinderGeometry(radius * 1.005, radius * 1.005, width * 0.55, 24, 1, true), MAT.blackTrim);
  tread.rotation.z = Math.PI / 2;
  g.add(tread);
  for (const side of [-1, 1]) {
    // thin light sidewall RING — a line, not a white disc, so the tyre reads
    const ring = new THREE.Mesh(new THREE.RingGeometry(radius * 0.60, radius * 0.78, 24), MAT.sidewall);
    ring.rotation.y = Math.PI / 2;
    ring.position.x = side * (width / 2 + 0.016);
    g.add(ring);
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.46, radius * 0.46, 0.035, 20), MAT.hub);
    hub.rotation.z = Math.PI / 2;
    hub.position.x = side * (width / 2 + 0.012);
    g.add(hub);
    for (let s = 0; s < 5; s++) {
      const sp = box(0.02, radius * 0.40, 0.07, MAT.spoke, side * (width / 2 + 0.032), 0, 0);
      sp.rotation.x = (s / 5) * Math.PI * 2;
      sp.position.y = Math.cos((s / 5) * Math.PI * 2) * radius * 0.19;
      sp.position.z = Math.sin((s / 5) * Math.PI * 2) * radius * 0.19;
      g.add(sp);
    }
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.05, 12),
      new THREE.MeshStandardMaterial({ color: 0xd21f26, roughness: 0.3, metalness: 0.6 }));
    cap.rotation.z = Math.PI / 2;
    cap.position.x = side * (width / 2 + 0.02);
    g.add(cap);
  }
  g.userData.spin = tyre;
  return g;
}

// ---- HERO CAR: CORAL GT VELOCE ----------------------------------------
// Low, wide, sleek: 5.1 long, 1.98 wide, roofline crest ~0.80.
export function makeHeroCar() {
  const car = new THREE.Group();
  const red = new THREE.MeshPhysicalMaterial({
    color: 0xd21f26, metalness: 0.55, roughness: 0.26,
    clearcoat: 1, clearcoatRoughness: 0.12,
  });
  const redDark = new THREE.MeshPhysicalMaterial({
    color: 0x9e141b, metalness: 0.5, roughness: 0.32, clearcoat: 0.8,
  });
  // lower body — curved profile, bevelled edges read as shaped metal.
  // NOTE: the extrude bevel expands the outline by ~bevelSize, so every
  // surface-mounted detail (lights, decals, louvres) must sit OUTSIDE
  // shape + bevel, or it is buried inside the body.
  const bodyPts = [
    [-2.55, 0.20], [-2.57, 0.50], [-2.46, 0.70], [-1.95, 0.70], [-1.05, 0.70],
    [0.30, 0.68], [1.45, 0.60], [2.30, 0.44], [2.55, 0.30], [2.56, 0.18],
    [-2.50, 0.16],
  ];
  car.add(extrudedBody(bodyPts, 1.82, red, 0.08));
  // glasshouse — glossy dark glass, narrower and shorter so the body reads first
  const glassPts = [
    [-1.25, 0.60], [-0.95, 0.78], [-0.15, 0.79], [0.40, 0.76], [0.65, 0.62],
    [-1.12, 0.58],
  ];
  car.add(extrudedBody(glassPts, 1.16, MAT.glass, 0.05));
  // roof spine highlight (thin body-colour strip over the glasshouse crown)
  const spine = box(0.10, 0.03, 0.9, red, 0, 0.795, 0.35);
  car.add(spine);
  // ---- rear deck: louvres, spoiler, taillights ----
  // deck louvres: 5 bright slats per side, angled, read from 3/4 rear.
  // Slight self-light so they read against the red deck at any angle.
  const louvreMat = new THREE.MeshStandardMaterial({ color: 0xf2f4f6, roughness: 0.2, metalness: 0.9, emissive: 0x9a9a9a, emissiveIntensity: 0.55 });
  for (const side of [-1, 1]) {
    for (let i = 0; i < 5; i++) {
      // forward on the deck (z 1.58..2.10), clear of the spoiler, tall
      // enough to read over the deck from the cover angle
      const lv = box(0.55, 0.06, 0.16, louvreMat, side * 0.55, 0.73 + i * 0.004, 1.58 + i * 0.13);
      lv.rotation.x = -0.12;
      car.add(lv);
    }
  }
  // low sleek body-coloured spoiler (NOT a heavy black wing), chrome lip,
  // with a dark gap line under it so it reads as a separate wing
  car.add(box(1.66, 0.025, 0.10, MAT.blackTrim, 0, 0.695, 2.36));
  const spoiler = extrudedBody(
    [[-0.32, 0.00], [0.30, 0.00], [0.32, 0.10], [-0.30, 0.11]], 1.74, red, 0.02);
  spoiler.position.set(0, 0.70, 2.38);
  spoiler.rotation.x = -0.06;
  car.add(spoiler);
  car.add(box(1.70, 0.03, 0.03, MAT.chrome, 0, 0.815, 2.68));
  for (const side of [-1, 1]) {
    car.add(box(0.06, 0.10, 0.10, redDark, side * 0.62, 0.66, 2.30));
  }
  // full-width taillight bar + clusters (proud of the bevelled rear face)
  car.add(box(1.62, 0.10, 0.04, MAT.tailRed, 0, 0.52, 2.645));
  for (const side of [-1, 1]) {
    car.add(box(0.34, 0.10, 0.03, MAT.tailRed, side * 0.62, 0.50, 2.65));
    car.add(box(0.30, 0.05, 0.02, MAT.chrome, side * 0.62, 0.585, 2.64));
  }
  // rear diffuser + twin exhausts
  car.add(box(1.5, 0.10, 0.06, MAT.blackTrim, 0, 0.20, 2.64));
  for (const side of [-1, 1]) {
    const ex = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.055, 0.12, 12), MAT.chrome);
    ex.rotation.x = Math.PI / 2;
    ex.position.set(side * 0.55, 0.24, 2.66);
    car.add(ex);
  }
  // ---- front: headlights, intake, splitter (proud of the bevelled nose) ----
  for (const side of [-1, 1]) {
    const hl = box(0.42, 0.06, 0.05, MAT.headWhite, side * 0.66, 0.50, -2.645);
    hl.rotation.y = side * 0.18;
    car.add(hl);
    car.add(box(0.46, 0.10, 0.03, MAT.chrome, side * 0.66, 0.50, -2.63));
    car.add(box(0.16, 0.05, 0.03, MAT.amber, side * 0.88, 0.42, -2.62));
  }
  car.add(box(1.30, 0.14, 0.05, MAT.blackTrim, 0, 0.24, -2.65)); // intake
  car.add(box(1.70, 0.05, 0.16, MAT.blackTrim, 0, 0.15, -2.62)); // splitter
  // ---- flank crease / character line + lower skirt (side must not read slab) ----
  // bright silver strip with a little self-light so it reads in any light
  const creaseMat = new THREE.MeshStandardMaterial({ color: 0xf4f6f8, roughness: 0.25, metalness: 0.9, emissive: 0x555555, emissiveIntensity: 0.5 });
  for (const side of [-1, 1]) {
    const crease = box(0.06, 0.055, 2.9, creaseMat, side * 1.005, 0.52, -0.1);
    car.add(crease);
    const crease2 = box(0.04, 0.035, 2.2, redDark, side * 0.995, 0.40, -0.2);
    car.add(crease2);
    // sculpted side panel: a shallow inset band above the skirt
    car.add(box(0.02, 0.16, 2.5, redDark, side * 0.99, 0.30, -0.15));
    car.add(box(0.04, 0.10, 3.4, MAT.blackTrim, side * 0.97, 0.20, 0)); // skirt
    // door handle + mirror
    car.add(box(0.03, 0.025, 0.16, MAT.chrome, side * 1.0, 0.60, 0.35));
    const stalk = box(0.03, 0.03, 0.12, MAT.blackTrim, side * 1.02, 0.66, -0.55);
    car.add(stalk);
    car.add(box(0.06, 0.09, 0.14, red, side * 1.06, 0.68, -0.55));
  }
  // ---- flared wheel arches: flattened half-torus hugging the wheel, so the
  // top of the arch stays at the deck line and never pokes up like ears ----
  const archGeo = new THREE.TorusGeometry(0.40, 0.06, 10, 22, Math.PI);
  for (const [x, z] of [[-0.95, -1.62], [0.95, -1.62], [-0.95, 1.62], [0.95, 1.62]]) {
    const arch = new THREE.Mesh(archGeo, red);
    arch.rotation.y = Math.PI / 2;
    arch.scale.set(1, 0.82, 1);
    arch.position.set(x, 0.34, z);
    arch.castShadow = true;
    car.add(arch);
  }
  // ---- wheels: mounted, aligned, spin in sync ----
  car.userData.wheels = [];
  car.userData.steer = [];
  for (const [x, z, front] of [[-0.92, -1.62, true], [0.92, -1.62, true], [-0.92, 1.62, false], [0.92, 1.62, false]]) {
    const w = makeWheel(0.34, 0.30);
    w.position.set(x, 0.34, z);
    car.add(w);
    car.userData.wheels.push(w);
    if (front) car.userData.steer.push(w);
  }
  return car;
}

// ---- text decal (doors / signs) ---------------------------------------
export function textTexture(text, fg = '#111', bg = 'rgba(0,0,0,0)', font = 'bold 64px Arial') {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 96;
  const g = c.getContext('2d');
  g.fillStyle = bg; g.fillRect(0, 0, 256, 96);
  g.fillStyle = fg; g.font = font; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(text, 128, 50);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// ---- generic shaped sedan (police / civilian / taxi) -------------------
function makeSedan({ color = 0x8899aa, taxi = false, police = false } = {}) {
  const car = new THREE.Group();
  const paint = new THREE.MeshPhysicalMaterial({
    color, metalness: 0.4, roughness: 0.35, clearcoat: 0.7, clearcoatRoughness: 0.2,
  });
  const white = new THREE.MeshPhysicalMaterial({ color: 0xf2f2ee, metalness: 0.35, roughness: 0.35, clearcoat: 0.7 });
  const black = new THREE.MeshPhysicalMaterial({ color: 0x14161c, metalness: 0.4, roughness: 0.4, clearcoat: 0.5 });
  const bodyMat = police ? white : paint;
  const bodyPts = [
    [-2.30, 0.20], [-2.32, 0.55], [-2.15, 0.72], [-1.35, 0.78], [-0.4, 0.80],
    [0.7, 0.78], [1.7, 0.68], [2.25, 0.52], [2.32, 0.30], [2.32, 0.18], [-2.28, 0.16],
  ];
  car.add(extrudedBody(bodyPts, 1.78, bodyMat, 0.06));
  const glassPts = [
    [-1.35, 0.72], [-0.95, 0.92], [0.15, 0.93], [0.75, 0.74], [-1.15, 0.70],
  ];
  car.add(extrudedBody(glassPts, 1.55, MAT.glass, 0.04));
  // lights (proud of the bevelled faces: body rear is 2.32 + bevel 0.054)
  car.add(box(1.6, 0.08, 0.04, MAT.tailRed, 0, 0.55, 2.39));
  for (const side of [-1, 1]) {
    car.add(box(0.34, 0.07, 0.04, MAT.headWhite, side * 0.62, 0.52, -2.39));
  }
  car.add(box(1.2, 0.12, 0.05, MAT.blackTrim, 0, 0.26, -2.40));
  if (police) {
    // black hood + trunk, CBPD doors, light bar (panels sit above the deck)
    car.add(box(1.5, 0.03, 0.95, black, 0, 0.795, -1.55)); // hood
    car.add(box(1.5, 0.03, 0.75, black, 0, 0.775, 1.85)); // trunk
    const doorTex = textTexture('CBPD', '#0d2b45');
    for (const side of [-1, 1]) {
      const decal = new THREE.Mesh(new THREE.PlaneGeometry(0.85, 0.32),
        new THREE.MeshBasicMaterial({ map: doorTex, transparent: true }));
      decal.position.set(side * 0.955, 0.48, 0.15);
      decal.rotation.y = side * Math.PI / 2;
      car.add(decal);
      const num = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.2),
        new THREE.MeshBasicMaterial({ map: textTexture('43', '#0d2b45'), transparent: true }));
      num.position.set(side * 0.955, 0.48, -0.75);
      num.rotation.y = side * Math.PI / 2;
      car.add(num);
    }
    const bar = box(1.3, 0.16, 0.32, MAT.blackTrim, 0, 1.0, 0.1);
    car.add(bar);
    const redL = box(0.6, 0.14, 0.34, new THREE.MeshStandardMaterial({ color: 0xcc1122, emissive: 0xff2233, emissiveIntensity: 2.2 }), -0.32, 1.01, 0.1);
    const blueL = box(0.6, 0.14, 0.34, new THREE.MeshStandardMaterial({ color: 0x2244cc, emissive: 0x3355ff, emissiveIntensity: 2.2 }), 0.32, 1.01, 0.1);
    car.add(redL); car.add(blueL);
    car.userData.lightBar = [redL, blueL];
    // rear CBPD marking on the trunk — reads as police from behind
    const rearMark = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.4),
      new THREE.MeshBasicMaterial({ map: textTexture('CBPD', '#ffffff', '#14161c', 'bold 56px Arial') }));
    rearMark.position.set(0, 0.66, 2.40);
    car.add(rearMark);
    // push bar
    car.add(box(1.4, 0.12, 0.08, MAT.blackTrim, 0, 0.32, -2.42));
  }
  if (taxi) {
    car.add(box(0.7, 0.16, 0.35, new THREE.MeshStandardMaterial({ color: 0x111111, emissive: 0xffc832, emissiveIntensity: 0.7 }), 0, 1.02, 0.1));
    const t = new THREE.Mesh(new THREE.PlaneGeometry(0.66, 0.14),
      new THREE.MeshBasicMaterial({ map: textTexture('TAXI', '#111', '#ffc832', 'bold 52px Arial') }));
    t.position.set(0, 1.02, 0.29); car.add(t);
  }
  car.userData.wheels = [];
  for (const [x, z] of [[-0.88, -1.5], [0.88, -1.5], [-0.88, 1.5], [0.88, 1.5]]) {
    const w = makeWheel(0.33, 0.26);
    w.position.set(x, 0.33, z);
    car.add(w);
    car.userData.wheels.push(w);
  }
  return car;
}

export function makePoliceCar() { return makeSedan({ police: true }); }
export function makeCivilianCar(color) { return makeSedan({ color }); }
export function makeTaxi() { return makeSedan({ color: 0xf5b81e, taxi: true }); }

export function makeVan(color = 0x4a7a9e) {
  const g = new THREE.Group();
  const paint = new THREE.MeshPhysicalMaterial({ color, metalness: 0.3, roughness: 0.45, clearcoat: 0.5 });
  g.add(box(1.9, 1.15, 4.4, paint, 0, 0.85, 0));
  g.add(box(1.7, 0.5, 0.5, MAT.glass, 0, 1.05, -2.1));
  g.add(box(1.7, 0.08, 0.04, MAT.tailRed, 0, 0.6, 2.21));
  for (const side of [-1, 1]) g.add(box(0.3, 0.07, 0.04, MAT.headWhite, side * 0.6, 0.55, -2.21));
  g.userData.wheels = [];
  for (const [x, z] of [[-0.88, -1.5], [0.88, -1.5], [-0.88, 1.5], [0.88, 1.5]]) {
    const w = makeWheel(0.33, 0.26);
    w.position.set(x, 0.33, z);
    g.add(w); g.userData.wheels.push(w);
  }
  return g;
}

// ---- scooter + rider ----------------------------------------------------
export function makeScooter() {
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshPhysicalMaterial({ color: 0xff5d8f, metalness: 0.4, roughness: 0.35, clearcoat: 0.7 });
  g.add(box(0.42, 0.42, 1.5, bodyMat, 0, 0.55, 0));
  g.add(box(0.36, 0.5, 0.4, bodyMat, 0, 0.75, -0.55)); // front shield
  g.add(box(0.4, 0.1, 0.7, MAT.blackTrim, 0, 0.72, 0.35)); // seat
  g.add(box(0.06, 0.06, 0.3, MAT.headWhite, 0, 0.7, -0.78));
  g.userData.wheels = [];
  for (const z of [-0.62, 0.62]) {
    const w = makeWheel(0.26, 0.12);
    w.position.set(0, 0.26, z);
    g.add(w); g.userData.wheels.push(w);
  }
  // rider: blocky figure leaning forward
  const skin = new THREE.MeshStandardMaterial({ color: 0xe8b98a, roughness: 0.7 });
  const shirt = new THREE.MeshStandardMaterial({ color: 0x37e0c8, roughness: 0.7 });
  const pants = new THREE.MeshStandardMaterial({ color: 0x2a2f45, roughness: 0.8 });
  const rider = new THREE.Group();
  rider.add(box(0.42, 0.5, 0.3, shirt, 0, 1.05, 0.15));
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 10), skin);
  head.position.set(0, 1.45, 0.05); head.castShadow = true; rider.add(head);
  const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.19, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.55),
    new THREE.MeshStandardMaterial({ color: 0xffd76a, roughness: 0.3 }));
  helmet.position.set(0, 1.47, 0.05); rider.add(helmet);
  rider.add(box(0.14, 0.4, 0.14, skin, -0.16, 1.15, -0.25));
  rider.add(box(0.14, 0.4, 0.14, skin, 0.16, 1.15, -0.25));
  rider.add(box(0.15, 0.42, 0.15, pants, -0.13, 0.72, 0.05));
  rider.add(box(0.15, 0.42, 0.15, pants, 0.13, 0.72, 0.05));
  rider.rotation.x = 0.18;
  g.add(rider);
  return g;
}
