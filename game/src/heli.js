// The CBPD helicopter: a REAL helicopter silhouette — a long, slim
// fuselage (far longer than tall, never a fat cylinder, never a box),
// a tapered nose with a distinct glass cockpit, a long thin tail boom
// with fin and tail rotor, a rotor mast on top, skids underneath, nav
// lights, and a bright searchlight beam that lands a warm pool of
// light on whatever it watches — the player, the hero car, the beach.
// The staged shots yaw it side-on (heli.yawOffset) so the camera sees
// the full length of the aircraft, not the nose.
import * as THREE from 'three';
import { glowTexture } from './materials.js';

function std(color, roughness = 0.4, metalness = 0.35) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness });
}

export function makeHeli() {
  const g = new THREE.Group();
  const white = std(0xf2f2ee, 0.35, 0.25);
  const navy = std(0x1c3a6e, 0.4, 0.3);
  const dark = std(0x1a1a22, 0.5, 0.4);
  const glassMat = new THREE.MeshStandardMaterial({ color: 0x16324a, roughness: 0.12, metalness: 0.75 });

  // slim fuselage: a long thin cylinder along Z — 3.2 long, 1.1 across,
  // so the body reads as an aircraft fuselage, never a drum
  const fuselage = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 3.2, 14), white);
  fuselage.rotation.x = Math.PI / 2;
  fuselage.position.set(0, 0, 0.1);
  fuselage.castShadow = true;
  // tapered nose cone: the front narrows to a point, it is not a ball
  const nose = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.55, 1.3, 12), white);
  nose.rotation.x = Math.PI / 2;
  nose.position.set(0, -0.02, 2.35);
  nose.castShadow = true;
  // nose tip cap
  const noseTip = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), dark);
  noseTip.position.set(0, -0.02, 3.0);
  // glass cockpit: a big dark bubble over the front-top — the windshield
  // that reads from below and from the side
  const canopy = new THREE.Mesh(new THREE.SphereGeometry(0.58, 16, 12), glassMat);
  canopy.scale.set(0.95, 0.6, 1.35);
  canopy.position.set(0, 0.32, 1.55);
  // side windows: dark glass panels on each side of the cabin
  const winGeo = new THREE.PlaneGeometry(1.15, 0.5);
  const winL = new THREE.Mesh(winGeo, glassMat);
  winL.position.set(-0.56, 0.18, 1.15);
  winL.rotation.y = -Math.PI / 2;
  const winR = new THREE.Mesh(winGeo, glassMat);
  winR.position.set(0.56, 0.18, 1.15);
  winR.rotation.y = Math.PI / 2;
  // navy cheatline along each side
  const stripeL = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.22, 3.0), navy);
  stripeL.position.set(-0.55, -0.18, 0.1);
  const stripeR = stripeL.clone();
  stripeR.position.x = 0.55;
  // navy belly
  const belly = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.22, 2.6), navy);
  belly.position.set(0, -0.52, 0.1);
  // POLICE marking on each side of the cabin
  const markGeo = new THREE.PlaneGeometry(1.3, 0.32);
  const markMat = new THREE.MeshStandardMaterial({
    map: (() => {
      const c = document.createElement('canvas');
      c.width = 256; c.height = 64;
      const ctx = c.getContext('2d');
      ctx.fillStyle = '#f4f0e2'; ctx.fillRect(0, 0, 256, 64);
      ctx.fillStyle = '#1a2a6e';
      ctx.font = 'bold 36px Arial, sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('POLICE', 128, 34);
      const t = new THREE.CanvasTexture(c);
      t.colorSpace = THREE.SRGBColorSpace;
      return t;
    })(),
  });
  const markL = new THREE.Mesh(markGeo, markMat);
  markL.position.set(-0.57, -0.05, -0.55);
  markL.rotation.y = -Math.PI / 2;
  const markR = new THREE.Mesh(markGeo, markMat);
  markR.position.set(0.57, -0.05, -0.55);
  markR.rotation.y = Math.PI / 2;
  // tapered tail cone: the fuselage narrows into the boom
  const tailCone = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.5, 0.9, 10), white);
  tailCone.rotation.x = Math.PI / 2;
  tailCone.position.set(0, 0.08, -1.95);
  // long thin tail boom, rising slightly toward the tail
  const boom = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.2, 3.4, 8), white);
  boom.rotation.x = Math.PI / 2 - 0.06;
  boom.position.set(0, 0.32, -4.0);
  boom.castShadow = true;
  // tail fin (vertical) + horizontal stabiliser
  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.25, 0.7), navy);
  fin.position.set(0, 0.95, -5.55);
  const stab = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.07, 0.45), white);
  stab.position.set(0, 0.45, -5.3);
  // tail rotor: small cross on the fin, spins
  const tailRotor = new THREE.Group();
  const trMat = std(0x14141a, 0.5, 0.4);
  const tr1 = new THREE.Mesh(new THREE.BoxGeometry(0.07, 1.05, 0.09), trMat);
  const tr2 = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.09, 1.05), trMat);
  tailRotor.add(tr1, tr2);
  tailRotor.position.set(0.11, 0.95, -5.55);
  // skids: two long tubes with four struts
  const skidMat = dark;
  for (const sx of [-0.68, 0.68]) {
    const skid = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 3.4, 8), skidMat);
    skid.rotation.x = Math.PI / 2;
    skid.position.set(sx, -1.0, 0.3);
    g.add(skid);
    for (const sz of [-0.7, 1.0]) {
      const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.45, 6), skidMat);
      strut.position.set(sx, -0.82, sz);
      strut.rotation.z = sx > 0 ? -0.3 : 0.3;
      g.add(strut);
    }
  }
  // mast + main rotor: four long blades and a translucent blur disc
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.55, 8), dark);
  mast.position.y = 0.85;
  const rotor = new THREE.Group();
  const bladeMat = std(0x14141a, 0.5, 0.4);
  for (let i = 0; i < 4; i++) {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(4.1, 0.05, 0.26), bladeMat);
    const holder = new THREE.Group();
    holder.rotation.y = (i / 4) * Math.PI * 2;
    blade.position.x = 2.2;
    holder.add(blade);
    rotor.add(holder);
  }
  const blur = new THREE.Mesh(
    new THREE.CircleGeometry(4.1, 24),
    new THREE.MeshBasicMaterial({ color: 0x888888, transparent: true, opacity: 0.13, side: THREE.DoubleSide, depthWrite: false }),
  );
  blur.rotation.x = -Math.PI / 2;
  rotor.add(blur);
  rotor.position.y = 1.15;
  // nav lights: red left, green right, white tail — they glow
  const navL = new THREE.Mesh(
    new THREE.SphereGeometry(0.11, 8, 8),
    new THREE.MeshBasicMaterial({ color: 0xff2a2a }),
  );
  navL.position.set(-0.58, 0, 0.9);
  const navR = new THREE.Mesh(
    new THREE.SphereGeometry(0.11, 8, 8),
    new THREE.MeshBasicMaterial({ color: 0x2aff5a }),
  );
  navR.position.set(0.58, 0, 0.9);
  const navT = new THREE.Mesh(
    new THREE.SphereGeometry(0.09, 8, 8),
    new THREE.MeshBasicMaterial({ color: 0xffffff }),
  );
  navT.position.set(0, 0.5, -5.75);
  // belly searchlight housing
  const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.28, 0.28, 10), dark);
  lamp.position.set(0, -0.68, 1.0);
  // searchlight: a soft shaft of light from the belly, additive — the
  // beam is a whisper, the warm pool on the ground is the signature
  const beamGeo = new THREE.ConeGeometry(2.2, 26, 16, 1, true);
  const beam = new THREE.Mesh(
    beamGeo,
    new THREE.MeshBasicMaterial({
      color: 0xfff2b0, transparent: true, opacity: 0.12,
      blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false,
    }),
  );
  beam.position.y = -13.4;
  // light pool: a warm glow disc that sits on the ground under the beam
  const pool = new THREE.Mesh(
    new THREE.PlaneGeometry(12, 12),
    new THREE.MeshBasicMaterial({
      map: glowTexture('rgba(255,240,180,0.95)', 'rgba(255,200,90,0.4)'),
      transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false,
    }),
  );
  pool.rotation.x = -Math.PI / 2;
  g.add(fuselage, nose, noseTip, canopy, winL, winR, stripeL, stripeR, belly,
    markL, markR, tailCone, boom, fin, stab, tailRotor, mast, rotor, navL, navR, navT, lamp, beam);
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
  // aim the beam straight down at the target; the beam is a 26 m cone,
  // so scale it to the hover altitude and its tip lands on the ground
  // under the heli instead of poking through it
  const bs = alt / 26;
  u.beam.scale.set(1, bs, 1);
  u.beam.position.y = -13.4 * bs;
  const dx = target.x - g.position.x;
  const dz = target.z - g.position.z;
  u.beam.rotation.z = Math.atan2(dx, alt) * 0.9;
  u.beam.rotation.x = -Math.atan2(dz, alt) * 0.9;
  u.pool.position.set(target.x, 0.06, target.z);
  const s = 1 + Math.sin(time * 2.1) * 0.05;
  u.pool.scale.set(s, s, 1);
}
