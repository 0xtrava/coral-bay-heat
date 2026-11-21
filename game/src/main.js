// Coral Bay Heat — boot, render loop, driving and shot cameras.
// ?shot=cover|pier|beach|docks stages a fixed dossier shot;
// no query param = free driving with a chase camera.
import * as THREE from 'three';
import { buildCity } from './world.js';
import { initPortraits, drawMinimap, updateHud } from './hud.js';
import { SHOTS, shotName } from './shots.js';
import { animateCrowd } from './people.js';
import { skyTexture } from './textures.js';

window.addEventListener('error', (e) => { window.__PAGEERROR__ = String(e.message || e.error); });

const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xe8a06a, 200, 560);

const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 1200);

// Glossy reflections: a PMREM environment baked from the sunset sky.
{
  const pmrem = new THREE.PMREMGenerator(renderer);
  const skyTex = skyTexture();
  skyTex.mapping = THREE.EquirectangularReflectionMapping;
  const envRT = pmrem.fromEquirectangular(skyTex);
  scene.environment = envRT.texture;
  skyTex.dispose();
  pmrem.dispose();
}

const refs = buildCity(scene);
const hero = refs.hero;
const heli = refs.heli;

const shot = shotName();
const isShot = new URLSearchParams(location.search).has('shot');
const preset = SHOTS[shot];

// stage the shot: hero + heli placement, wanted level
hero.position.set(...preset.hero);
hero.rotation.y = preset.heroRot;
heli.position.set(...preset.heli);
camera.position.set(...preset.cam);
camera.lookAt(...preset.look);
camera.fov = preset.fov;
camera.updateProjectionMatrix();
updateHud({ speedKmh: 87, wanted: preset.wanted });

// ---- driving state ----
const drive = {
  speed: 0, // m/s
  heading: preset.heroRot,
  steer: 0,
  keys: {},
};
addEventListener('keydown', (e) => { drive.keys[e.code] = true; });
addEventListener('keyup', (e) => { drive.keys[e.code] = false; });
addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

initPortraits();
const hintEl = document.getElementById('hint');
if (hintEl && isShot) hintEl.style.display = 'none';
const mapCtx = document.getElementById('minimap').getContext('2d');

const clock = new THREE.Clock();
let frames = 0;
let lastMap = 0;

function spinWheels(car, dt) {
  if (!car.userData.wheels) return;
  const w = drive.speed / 0.36; // angular velocity from linear speed
  for (const wheel of car.userData.wheels) {
    wheel.rotation.x += w * dt;
  }
  for (const sw of car.userData.steer || []) {
    sw.rotation.y = drive.steer * 0.42;
  }
}

function updateDrive(dt) {
  const k = drive.keys;
  const accel = k.KeyW || k.ArrowUp ? 14 : 0;
  const brake = k.KeyS || k.ArrowDown ? 22 : 0;
  if (accel) drive.speed += accel * dt;
  if (brake) drive.speed -= brake * dt;
  if (!accel && !brake) drive.speed *= Math.max(0, 1 - 0.6 * dt);
  if (k.Space) drive.speed *= Math.max(0, 1 - 4 * dt);
  drive.speed = THREE.MathUtils.clamp(drive.speed, -8, 38);
  const steerTarget = (k.KeyA || k.ArrowLeft ? 1 : 0) - (k.KeyD || k.ArrowRight ? 1 : 0);
  drive.steer += (steerTarget * 0.55 - drive.steer) * Math.min(1, dt * 8);
  if (Math.abs(drive.speed) > 0.2) {
    drive.heading += drive.steer * (drive.speed / 12) * dt * (drive.speed >= 0 ? 1 : -1);
  }
  // heading 0 = facing -Z; forward vector is (-sin h, 0, -cos h)
  hero.position.x += -Math.sin(drive.heading) * drive.speed * dt;
  hero.position.z += -Math.cos(drive.heading) * drive.speed * dt;
  hero.rotation.y = drive.heading;
  // keep the car inside the island
  hero.position.x = THREE.MathUtils.clamp(hero.position.x, -60, 70);
  hero.position.z = THREE.MathUtils.clamp(hero.position.z, -168, 168);
  spinWheels(hero, dt);
  for (const t of refs.traffic) spinWheels(t, 0.0001); // parked: no spin
}

function updateChaseCamera(dt) {
  const back = 9.5, up = 3.6;
  const fx = -Math.sin(drive.heading), fz = -Math.cos(drive.heading);
  const tx = hero.position.x - fx * back;
  const tz = hero.position.z - fz * back;
  camera.position.x += (tx - camera.position.x) * Math.min(1, dt * 5);
  camera.position.y += (up - camera.position.y) * Math.min(1, dt * 5);
  camera.position.z += (tz - camera.position.z) * Math.min(1, dt * 5);
  camera.lookAt(hero.position.x + fx * 6, 1.1, hero.position.z + fz * 6);
}

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;

  if (!isShot) updateDrive(dt);
  else {
    // staged shot: hero parked, wheels still — but the HUD reads 87 km/h
    // and the world stays alive around it
    spinWheels(hero, 0);
  }

  // helicopter: rotor blur spins, gentle bob + drift
  if (heli.userData.rotor) heli.userData.rotor.rotation.y += dt * 9;
  if (heli.userData.tailRotor) heli.userData.tailRotor.rotation.x += dt * 22;
  heli.position.y = preset.heli[1] + Math.sin(t * 0.7) * 0.5;
  heli.position.x = preset.heli[0] + Math.sin(t * 0.23) * 0.8;

  // police light bars flash
  for (const car of refs.traffic) {
    const bar = car.userData.lightBar;
    if (bar) {
      const on = Math.sin(t * 9) > 0;
      bar[0].material.emissiveIntensity = on ? 2.4 : 0.25;
      bar[1].material.emissiveIntensity = on ? 0.25 : 2.4;
    }
  }

  animateCrowd(refs.crowd, t);

  if (!isShot) updateChaseCamera(dt);

  // minimap + speed, throttled to every 120 ms
  if (t - lastMap > 0.12) {
    lastMap = t;
    drawMinimap(mapCtx, hero.position.x, hero.position.z, -drive.heading + Math.PI, {
      police: [[-3.4, -13], [3.6, -26], [-18, 60]],
    });
    updateHud({ speedKmh: isShot ? 87 : Math.abs(drive.speed) * 3.6, wanted: preset.wanted });
  }

  renderer.render(scene, camera);
  frames++;
  if (frames === 3) {
    window.__READY__ = true;
    document.title = 'CORAL BAY HEAT — READY';
  }
}

animate();
