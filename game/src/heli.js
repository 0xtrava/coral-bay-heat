// The CBPD helicopter — a REAL Bell 206 / Police Maverick, not a
// drum and not a box. A white rounded egg-shaped cabin with a BIG
// black glass cockpit (a curved windshield and dark side windows),
// a long thin dark blue tail boom with POLICE in white along it, a
// tall tail fin with a tail rotor, a four-blade main rotor on a mast,
// thin black skids, nav lights, and a searchlight ball under the
// nose whose beam lands a warm pool of light on whatever it watches.
// Long, slim, tapered — the whole aircraft is far longer than tall.
// The staged shots yaw it side-on (heli.yawOffset) so the camera
// sees the full length of the aircraft, not the nose.
import * as THREE from 'three';
import { glowTexture } from './materials.js';

function std(color, roughness = 0.4, metalness = 0.35) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness });
}

// White POLICE lettering for the tail boom, on a transparent plane.
function boomMarking() {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 96;
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, 512, 96);
  ctx.fillStyle = '#f4f0e2';
  ctx.font = 'bold 72px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('POLICE', 256, 50);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return new THREE.Mesh(
    new THREE.PlaneGeometry(2.6, 0.5),
    new THREE.MeshStandardMaterial({ map: t, transparent: true, roughness: 0.5, metalness: 0.1 }),
  );
}

export function makeHeli() {
  const g = new THREE.Group();
  const white = std(0xf8f8f4, 0.3, 0.25);
  const navy = std(0x1c3a6e, 0.4, 0.3);
  const dark = std(0x1a1a22, 0.5, 0.4);
  const glassMat = new THREE.MeshStandardMaterial({ color: 0x0c141c, roughness: 0.05, metalness: 0.9 });

  // cabin: a white rounded egg — a sphere stretched long and squashed
  // flat, so it reads as a helicopter cabin, never a cylinder
  const cabin = new THREE.Mesh(new THREE.SphereGeometry(0.85, 20, 16), white);
  cabin.scale.set(1.0, 0.78, 1.75);
  cabin.position.set(0, 0.05, 0.35);
  cabin.castShadow = true;
  g.add(cabin);
  // nose: a smaller white egg at the front, tapering the cabin down
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.52, 16, 12), white);
  nose.scale.set(0.9, 0.72, 1.2);
  nose.position.set(0, -0.08, 1.7);
  nose.castShadow = true;
  g.add(nose);
  // BIG black glass cockpit: a large curved bubble wrapping the
  // front-top of the cabin — the windshield the camera reads from
  // any angle. Bigger and glossier than a black blob: it covers the
  // whole front of the cabin like a real Bell 206 bubble.
  const canopy = new THREE.Mesh(new THREE.SphereGeometry(0.88, 20, 14), glassMat);
  canopy.scale.set(1.0, 0.75, 1.25);
  canopy.position.set(0, 0.25, 1.35);
  g.add(canopy);
  // side windows: dark glass panels on each side of the cabin
  const winGeo = new THREE.PlaneGeometry(1.3, 0.55);
  const winL = new THREE.Mesh(winGeo, glassMat);
  winL.position.set(-0.82, 0.18, 0.55);
  winL.rotation.y = -Math.PI / 2;
  const winR = new THREE.Mesh(winGeo, glassMat);
  winR.position.set(0.82, 0.18, 0.55);
  winR.rotation.y = Math.PI / 2;
  g.add(winL, winR);
  // navy cheatline along each side of the cabin
  const stripeL = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.2, 2.6), navy);
  stripeL.position.set(-0.84, -0.28, 0.35);
  const stripeR = stripeL.clone();
  stripeR.position.x = 0.84;
  g.add(stripeL, stripeR);
  // navy belly
  const belly = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.18, 2.4), navy);
  belly.position.set(0, -0.62, 0.35);
  g.add(belly);
  // tapered tail cone: the cabin narrows into the boom
  const tailCone = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.55, 1.0, 10), navy);
  tailCone.rotation.x = Math.PI / 2;
  tailCone.position.set(0, 0.18, -1.55);
  g.add(tailCone);
  // long thin tail boom, dark blue, rising slightly toward the tail
  const boom = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.17, 3.6, 8), navy);
  boom.rotation.x = Math.PI / 2 - 0.05;
  boom.position.set(0, 0.38, -3.7);
  boom.castShadow = true;
  g.add(boom);
  // POLICE in white along each side of the boom
  const markL = boomMarking();
  markL.position.set(-0.14, 0.38, -3.7);
  markL.rotation.y = -Math.PI / 2;
  const markR = boomMarking();
  markR.position.set(0.14, 0.38, -3.7);
  markR.rotation.y = Math.PI / 2;
  g.add(markL, markR);
  // tall tail fin (vertical) + horizontal stabiliser
  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.35, 0.75), navy);
  fin.position.set(0, 1.0, -5.4);
  g.add(fin);
  const stab = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.07, 0.5), white);
  stab.position.set(0, 0.5, -5.15);
  g.add(stab);
  // tail rotor: a small two-blade cross on the fin, spins
  const tailRotor = new THREE.Group();
  const trMat = std(0x14141a, 0.5, 0.4);
  const tr1 = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.1, 0.08), trMat);
  const tr2 = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.08, 1.1), trMat);
  tailRotor.add(tr1, tr2);
  tailRotor.position.set(0.12, 1.0, -5.4);
  g.add(tailRotor);
  // skids: two long thin tubes with four struts
  for (const sx of [-0.68, 0.68]) {
    const skidGeo = new THREE.CylinderGeometry(0.055, 0.055, 3.4, 8);
    skidGeo.rotateX(Math.PI / 2);
    const skid = new THREE.Mesh(skidGeo, dark);
    skid.position.set(sx, -1.05, 0.35);
    g.add(skid);
    for (const sz of [-0.65, 1.05]) {
      const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.5, 6), dark);
      strut.position.set(sx, -0.85, sz);
      strut.rotation.z = sx > 0 ? -0.3 : 0.3;
      g.add(strut);
    }
  }
  // mast + main rotor: four long thin blades and a translucent blur disc
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.6, 8), dark);
  mast.position.y = 0.9;
  g.add(mast);
  const rotor = new THREE.Group();
  const bladeMat = std(0x14141a, 0.5, 0.4);
  for (let i = 0; i < 4; i++) {
    const holder = new THREE.Group();
    holder.rotation.y = (i / 4) * Math.PI * 2;
    const blade = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.05, 0.26), bladeMat);
    blade.position.x = 2.25;
    holder.add(blade);
    rotor.add(holder);
  }
  const blur = new THREE.Mesh(
    new THREE.CircleGeometry(4.2, 24),
    new THREE.MeshBasicMaterial({ color: 0x888888, transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false }),
  );
  blur.rotation.x = -Math.PI / 2;
  rotor.add(blur);
  rotor.position.y = 1.2;
  g.add(rotor);
  // nav lights: red left, green right, white tail — they glow
  const navL = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 8), new THREE.MeshBasicMaterial({ color: 0xff2a2a }));
  navL.position.set(-0.85, 0, 0.9);
  const navR = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 8), new THREE.MeshBasicMaterial({ color: 0x2aff5a }));
  navR.position.set(0.85, 0, 0.9);
  const navT = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 8), new THREE.MeshBasicMaterial({ color: 0xffffff }));
  navT.position.set(0, 0.55, -5.6);
  g.add(navL, navR, navT);
  // searchlight ball under the nose
  const lampBall = new THREE.Mesh(new THREE.SphereGeometry(0.24, 12, 10), dark);
  lampBall.position.set(0, -0.72, 1.35);
  g.add(lampBall);
  const lampLens = new THREE.Mesh(
    new THREE.SphereGeometry(0.16, 10, 8),
    new THREE.MeshBasicMaterial({ color: 0xfff2b0 }),
  );
  lampLens.position.set(0, -0.82, 1.5);
  g.add(lampLens);
  // searchlight: a soft shaft of light from the belly, additive.
  // The cone's apex is translated to the origin, so the beam pivots
  // at the searchlight ball under the nose and its wide base lands
  // on the beam target — it reads as a searchlight aimed at someone,
  // not a faint cone hanging under the heli. Bright enough to see.
  const beamGeo = new THREE.ConeGeometry(2.2, 26, 16, 1, true);
  beamGeo.translate(0, -13, 0);
  const beam = new THREE.Mesh(
    beamGeo,
    new THREE.MeshBasicMaterial({
      color: 0xfff2b0, transparent: true, opacity: 0.16,
      blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false,
    }),
  );
  beam.position.set(0, -0.72, 1.35);
  g.add(beam);
  // light pool: a warm glow disc that sits on the ground under the beam
  const pool = new THREE.Mesh(
    new THREE.PlaneGeometry(16, 16),
    new THREE.MeshBasicMaterial({
      map: glowTexture('rgba(255,240,180,0.95)', 'rgba(255,200,90,0.4)'),
      transparent: true, opacity: 1.0, blending: THREE.AdditiveBlending, depthWrite: false,
    }),
  );
  pool.rotation.x = -Math.PI / 2;
  // the whole aircraft reads bigger on screen than the old drum did
  g.scale.setScalar(1.15);
  g.userData = { kind: 'heli', rotor, tailRotor, beam, pool, phase: Math.random() * 6.28 };
  return { group: g, pool, yawOffset: 0 };
}

// Hover altitude for a staged shot: the chase camera sits low, so the
// cover shot flies the heli down in the frame (altitude 8.5) instead of
// 26 m up where only the beam shows.
export function setHeliAltitude(heli, altitude) {
  heli.altitude = altitude;
}

// Yaw the aircraft side-on to a camera: the staged shots set this so
// the long axis reads across the frame instead of nose-on (a nose-on
// helicopter looks like a ball — that is what made the old one a drum).
export function setHeliYaw(heli, radians) {
  heli.yawOffset = radians;
}

// Hover above a target, rotor spinning, beam aimed down at it.
export function updateHeli(heli, target, dt, time) {
  const g = heli.group;
  const u = g.userData;
  u.rotor.rotation.y += dt * 22;
  u.tailRotor.rotation.x += dt * 40;
  // gentle bob and drift so the hover feels alive; the cover shot flies
  // the heli low (altitude 8.5) so its body lands in the frame
  const alt = heli.altitude ?? 26;
  const hoverY = alt + Math.sin(time * 0.7 + u.phase) * 1.2;
  g.position.set(
    target.x + Math.sin(time * 0.23 + u.phase) * 4,
    hoverY,
    target.z + Math.cos(time * 0.19 + u.phase) * 4,
  );
  g.rotation.y = Math.atan2(target.x - g.position.x, target.z - g.position.z) + (heli.yawOffset || 0);
  // the searchlight aims at the beam target (the hero), which is
  // NOT the hover point: the heli hangs ahead in the frame while
  // its beam and light pool land ON the hero. The beam pivots at
  // the searchlight ball and stretches to the target, so the shaft
  // visibly connects the heli to the hero instead of landing on
  // empty ground behind him.
  g.updateMatrixWorld(true);
  const bt = heli.beamTarget || target;
  const ballWorld = g.localToWorld(new THREE.Vector3(0, -0.72, 1.35));
  const toTarget = new THREE.Vector3(bt.x - ballWorld.x, -ballWorld.y, bt.z - ballWorld.z);
  const dist = Math.max(toTarget.length(), 0.01);
  const dir = toTarget.clone().normalize();
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, -1, 0), dir);
  const inv = g.getWorldQuaternion(new THREE.Quaternion()).invert();
  u.beam.quaternion.copy(inv.multiply(q));
  u.beam.scale.set(1, dist / 26, 1);
  u.pool.position.set(bt.x, 0.06, bt.z);
  const s = 1 + Math.sin(time * 2.1) * 0.05;
  u.pool.scale.set(s, s, 1);
}
