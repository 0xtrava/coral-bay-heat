// The CBPD helicopter: body, tail, spinning rotors, skids, and the
// searchlight — a translucent beam cone from the belly to the ground plus
// a warm light pool that lands on the hero car. The pool is a separate
// mesh so the beam can track the hero while the heli bobs above.
import * as THREE from 'three';
import { mat, glowMat, blobTexture } from './materials.js';

// Build the helicopter Group. `userData.rotor` spins; `userData.beam` is
// the cone; `userData.pool` is the ground pool (added to the scene, not
// to the heli, so it stays flat on the road while the heli moves).
export function makeHeli() {
  const heli = new THREE.Group();
  const navy = mat(0x1b2a4a);
  const dark = mat(0x14141a);
  // Body: rounded nose + cabin.
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.5, 3.4), navy);
  body.position.y = 0;
  heli.add(body);
  const nose = new THREE.Mesh(new THREE.BoxGeometry(1.9, 1.1, 1.2), navy);
  nose.position.set(0, -0.15, 2.1);
  heli.add(nose);
  // Glass.
  const glass = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.8, 0.9), new THREE.MeshLambertMaterial({ color: 0x9fc4d8, transparent: true, opacity: 0.75 }));
  glass.position.set(0, 0.1, 1.9);
  heli.add(glass);
  // Tail boom + fin + tail rotor.
  const boom = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.34, 3.6, 8), navy);
  boom.rotation.x = Math.PI / 2;
  boom.position.set(0, 0.25, -3.2);
  heli.add(boom);
  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.3, 0.9), navy);
  fin.position.set(0, 0.9, -4.8);
  heli.add(fin);
  const tailRotor = new THREE.Group();
  tailRotor.position.set(0.3, 0.5, -4.9);
  const tr1 = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.4, 0.12), dark);
  tailRotor.add(tr1);
  const tr2 = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.4, 0.12), dark);
  tr2.rotation.x = Math.PI / 2;
  tailRotor.add(tr2);
  heli.add(tailRotor);
  // Main rotor: mast + two blades.
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.7, 8), dark);
  mast.position.y = 1.05;
  heli.add(mast);
  const rotor = new THREE.Group();
  rotor.position.y = 1.45;
  const bladeGeo = new THREE.BoxGeometry(9.2, 0.07, 0.5);
  const blade1 = new THREE.Mesh(bladeGeo, dark);
  rotor.add(blade1);
  const blade2 = new THREE.Mesh(bladeGeo, dark);
  blade2.rotation.y = Math.PI / 2;
  rotor.add(blade2);
  heli.add(rotor);
  // Skids.
  for (const s of [-0.8, 0.8]) {
    const skid = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 3.4, 6), dark);
    skid.rotation.x = Math.PI / 2;
    skid.position.set(s, -1.05, 0.2);
    heli.add(skid);
    for (const z of [-1, 1]) {
      const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.5, 6), dark);
      strut.position.set(s, -0.85, z);
      heli.add(strut);
    }
  }
  // Belly searchlight housing.
  const housing = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.42, 0.3, 10), mat(0xd8dde2));
  housing.position.set(0, -0.85, 1.2);
  heli.add(housing);
  const lens = new THREE.Mesh(new THREE.CircleGeometry(0.3, 12), glowMat(0xfff6c0));
  lens.position.set(0, -1.0, 1.2);
  lens.rotation.x = Math.PI / 2;
  heli.add(lens);
  // The beam: a cone from the belly to the ground. Its length and tilt
  // are set every frame by updateHeli (it tracks the hero).
  const beamGeo = new THREE.ConeGeometry(1, 1, 16, 1, true);
  beamGeo.translate(0, -0.5, 0); // apex at the origin, opening downward
  const beam = new THREE.Mesh(
    beamGeo,
    new THREE.MeshBasicMaterial({ color: 0xfff2b0, transparent: true, opacity: 0.25, side: THREE.DoubleSide, depthWrite: false })
  );
  heli.add(beam);
  // The ground pool: a warm blob that sits on the road under the beam.
  const pool = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 1),
    new THREE.MeshBasicMaterial({ map: blobTexture(), color: 0xffd98a, transparent: true, opacity: 0.55, depthWrite: false })
  );
  pool.rotation.x = -Math.PI / 2;
  pool.position.y = 0.09;
  heli.userData.rotor = rotor;
  heli.userData.tailRotor = tailRotor;
  heli.userData.beam = beam;
  heli.userData.pool = pool;
  heli.userData.kind = 'heli';
  return heli;
}

// Per-frame: hover bob, spin the rotors, and aim the beam + pool at the
// hero's ground position. `heroPos` is {x, z}, `heading` the anchor's
// heading. The heli hovers AHEAD of the hero (in the chase camera's
// view, top-centre) so the heli itself reads in the frame — it used to
// sit behind the hero, above the camera, so only the beam showed.
export function updateHeli(heli, dt, time, heroPos, visible, heading = 0) {
  heli.visible = visible;
  heli.userData.pool.visible = visible;
  if (!visible) return;
  heli.userData.rotor.rotation.y += dt * 22;
  heli.userData.tailRotor.rotation.x += dt * 30;
  const hoverY = 10.5 + Math.sin(time * 0.9) * 0.8;
  const fx = Math.sin(heading), fz = Math.cos(heading);
  const sx = Math.cos(heading), sz = -Math.sin(heading);
  const hx = heroPos.x + fx * 20 + sx * 5;
  const hz = heroPos.z + fz * 20 + sz * 5;
  heli.position.set(hx, hoverY, hz);
  // Beam: from the belly (world) to the hero's ground point. The cone
  // hangs along -Y, so rotate -Y onto the belly->hero direction.
  const beam = heli.userData.beam;
  const from = new THREE.Vector3(hx, hoverY - 1, hz + 1.2);
  const to = new THREE.Vector3(heroPos.x, 0, heroPos.z);
  const dir = to.clone().sub(from);
  const len = dir.length();
  beam.position.set(0, -1, 1.2);
  beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), dir.clone().normalize());
  beam.scale.set(1.7, len, 1.7);
  // Pool: centred dead on the hero, gently pulsing.
  const pool = heli.userData.pool;
  pool.position.set(heroPos.x, 0.09, heroPos.z);
  const pulse = 11 + Math.sin(time * 2.2) * 0.6;
  pool.scale.set(pulse, pulse, 1);
}
