// Coral Bay Heat — police helicopter. Big, dark, silhouetted against the
// sky, main rotor with a translucent blur disc so it reads as spinning.
// Recovery round 21 (2026-11-21): unchanged behaviour, witnessed rebuild.
import * as THREE from 'three';

export function makeHelicopter() {
  const heli = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x1d2733, roughness: 0.45, metalness: 0.55 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x0c1016, roughness: 0.6, metalness: 0.4 });
  const glassMat = new THREE.MeshPhysicalMaterial({ color: 0x182838, roughness: 0.1, metalness: 0.5, clearcoat: 1 });
  const accent = new THREE.MeshStandardMaterial({ color: 0xffc832, roughness: 0.4, metalness: 0.4 });

  // fuselage: rounded cabin from a stretched sphere + belly box
  const cabin = new THREE.Mesh(new THREE.SphereGeometry(1.15, 20, 14), bodyMat);
  cabin.scale.set(1.0, 0.95, 1.55);
  cabin.castShadow = true;
  heli.add(cabin);
  const belly = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.5, 2.2), darkMat);
  belly.position.set(0, -0.75, 0.2);
  heli.add(belly);
  // cockpit glass
  const glass = new THREE.Mesh(new THREE.SphereGeometry(0.95, 16, 12), glassMat);
  glass.scale.set(0.92, 0.72, 0.9);
  glass.position.set(0, 0.12, -1.05);
  heli.add(glass);
  // nose stripe + CBPD-style marking band
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(1.62, 0.16, 0.5), accent);
  stripe.position.set(0, -0.15, -0.9);
  heli.add(stripe);
  // tail boom + fins
  const boom = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.42, 3.4, 10), bodyMat);
  boom.rotation.x = Math.PI / 2 - 0.10;
  boom.position.set(0, 0.28, 2.9);
  boom.castShadow = true;
  heli.add(boom);
  const finV = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.1, 0.9), darkMat);
  finV.position.set(0, 0.75, 4.45);
  heli.add(finV);
  const finH = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.07, 0.5), darkMat);
  finH.position.set(0, 0.45, 4.3);
  heli.add(finH);
  // tail rotor (small, spins fast)
  const tailRotor = new THREE.Group();
  for (let i = 0; i < 2; i++) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.5, 0.05), darkMat);
    b.rotation.z = (i * Math.PI) / 2;
    tailRotor.add(b);
  }
  tailRotor.position.set(0.32, 0.45, 4.55);
  tailRotor.rotation.y = Math.PI / 2;
  heli.add(tailRotor);
  // skids
  for (const side of [-1, 1]) {
    const skid = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.6, 8), darkMat);
    skid.rotation.x = Math.PI / 2;
    skid.position.set(side * 0.85, -1.25, 0.1);
    heli.add(skid);
    for (const z of [-0.8, 0.8]) {
      const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.5, 8), darkMat);
      strut.position.set(side * 0.85, -1.0, z);
      heli.add(strut);
    }
  }
  // searchlight cone (translucent, points down from the heli: apex at the
  // heli, wide base on the ground)
  const coneMat = new THREE.MeshBasicMaterial({
    color: 0xfff2b0, transparent: true, opacity: 0.10,
    blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
  });
  const cone = new THREE.Mesh(new THREE.ConeGeometry(1.9, 9, 20, 1, true), coneMat);
  cone.position.set(0, -5.2, -1.2);
  heli.add(cone);
  // main rotor mast + blades + blur disc
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.7, 10), darkMat);
  mast.position.set(0, 1.35, 0);
  heli.add(mast);
  const rotor = new THREE.Group();
  rotor.position.set(0, 1.7, 0);
  const bladeMat = new THREE.MeshStandardMaterial({ color: 0x11151c, roughness: 0.5, metalness: 0.5 });
  for (let i = 0; i < 4; i++) {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.05, 4.6), bladeMat);
    blade.position.z = i % 2 === 0 ? 0 : 0;
    const holder = new THREE.Group();
    holder.rotation.y = (i * Math.PI) / 2;
    blade.position.set(0, 0, 2.3);
    holder.add(blade);
    rotor.add(holder);
  }
  // blur disc: reads as a spinning rotor even in a still screenshot
  const blur = new THREE.Mesh(
    new THREE.CircleGeometry(4.7, 40),
    new THREE.MeshBasicMaterial({
      color: 0x9aa4b0, transparent: true, opacity: 0.20,
      side: THREE.DoubleSide, depthWrite: false,
    }),
  );
  blur.rotation.x = -Math.PI / 2;
  rotor.add(blur);
  const blurRing = new THREE.Mesh(
    new THREE.RingGeometry(3.9, 4.7, 40),
    new THREE.MeshBasicMaterial({
      color: 0x30363f, transparent: true, opacity: 0.22,
      side: THREE.DoubleSide, depthWrite: false,
    }),
  );
  blurRing.rotation.x = -Math.PI / 2;
  rotor.add(blurRing);
  heli.add(rotor);
  heli.userData.rotor = rotor;
  heli.userData.tailRotor = tailRotor;
  heli.userData.cone = cone;
  return heli;
}
