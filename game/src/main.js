// Coral Bay Heat — boot, render loop, driving and shot cameras.
// ?shot=cover|pier|beach|docks stages a fixed dossier shot;
// no query param = free driving with a chase camera.
import * as THREE from 'three';
import { buildCity } from './world.js';
import { initPortraits, drawMinimap, updateHud, renderHud } from './hud.js';
import { SHOTS, shotName } from './shots.js';
import { animateCrowd, makePerson } from './people.js';
import { skyTexture } from './textures.js';
import { createGame } from './game.js';

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
window.__HERO__ = hero; // playtest hook: wheel spin + brake checks

const shot = shotName();
const isShot = new URLSearchParams(location.search).has('shot');
const preset = SHOTS[shot];
// Fast-forward for headless playtests: ?ff=N runs N extra fixed-dt logic
// ticks per rendered frame in free mode (default 1 = the shipped game).
// Rendering still happens every frame; only the logic rate changes, so the
// same mission code is exercised at ~real-time game speed under SwiftShader.
const ff = isShot ? 1 : Math.max(1, Math.min(8, Number(new URLSearchParams(location.search).get('ff') || 1)));

// ---- overlay helpers (victory / fail / big map) ----
function showOverlay(kind, data = {}) {
  const v = document.getElementById('victory');
  const f = document.getElementById('fail');
  if (v) v.style.display = kind === 'victory' ? 'flex' : 'none';
  if (f) f.style.display = kind === 'fail' ? 'flex' : 'none';
  if (kind === 'victory') {
    const c = document.getElementById('victory-cash');
    if (c) c.textContent = '$' + Number(data.cash || 0).toLocaleString('en-US');
    const s = document.getElementById('victory-sub');
    if (s) s.textContent = `All 8 missions complete · ${Math.floor((data.time || 0) / 60)}:${String(Math.floor((data.time || 0) % 60)).padStart(2, '0')} on the clock`;
  }
  if (kind === 'fail') {
    const t = document.getElementById('fail-title');
    if (t) t.textContent = data.reason || 'WRECKED';
  }
}

// ---- Phase 2 game (free mode only; shots stay staged) ----
const avatar = makePerson(7, 1);
avatar.visible = false;
scene.add(avatar);
let game = null;
if (!isShot) {
  game = createGame({ scene, refs, THREE, renderHud, showOverlay, isShot });
  window.__GAME__ = game;
  const rb = document.getElementById('fail-retry');
  if (rb) rb.addEventListener('click', () => game.retry());
  const vb = document.getElementById('victory-again');
  if (vb) vb.addEventListener('click', () => location.reload());
}

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
addEventListener('keydown', (e) => {
  drive.keys[e.code] = true;
  if (!game || e.repeat) return;
  if (e.code === 'KeyE') game.tryEnterExit();
  else if (e.code === 'KeyF') game.shoot();
  else if (e.code === 'KeyR') game.nextRadio();
  else if (e.code === 'KeyP') { game.saveGame(); game.toast('Game saved'); }
  else if (e.code === 'KeyL') { game.loadGame(); game.toast('Save loaded'); }
  else if (e.code === 'KeyM') {
    const bm = document.getElementById('bigmap');
    if (bm) bm.style.display = bm.style.display === 'flex' ? 'none' : 'flex';
  } else if (e.code === 'Digit1') game.selectWeapon(0);
  else if (e.code === 'Digit2') game.selectWeapon(1);
  else if (e.code === 'Digit3') game.selectWeapon(2);
  else if (e.code === 'Digit4') game.selectWeapon(3);
  else if (e.code === 'Digit5') game.useCrew('mira');
  else if (e.code === 'Digit6') game.useCrew('lio');
  else if (e.code === 'Digit7') game.useCrew('kiki');
});
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

function spinWheels(car, dt, speed) {
  if (!car.userData.wheels) return;
  const w = speed / 0.36; // angular velocity from linear speed
  for (const wheel of car.userData.wheels) {
    wheel.rotation.x += w * dt;
  }
  for (const sw of car.userData.steer || []) {
    sw.rotation.y = drive.steer * 0.42;
  }
}

// Sync the 3D scene from the Phase 2 game state: the driven vehicle sits at
// the game position, the on-foot avatar shows when walking, boats included.
function syncGameVisuals(dt) {
  if (!game) return;
  const st = game.state;
  const driven = game.drivenMesh();
  driven.position.x = st.pos.x;
  driven.position.z = st.pos.z;
  driven.rotation.y = st.heading;
  // the hero mesh parks where the player left it when driving another car
  if (st.mode === 'foot') {
    avatar.visible = true;
    avatar.position.set(st.pos.x, 0, st.pos.z);
    avatar.rotation.y = st.heading;
  } else {
    avatar.visible = false;
  }
  // steer angle for the front wheels follows the player's steering
  const k = drive.keys;
  const steerTarget = (k.KeyA || k.ArrowLeft ? 1 : 0) - (k.KeyD || k.ArrowRight ? 1 : 0);
  drive.steer += (steerTarget * 0.55 - drive.steer) * Math.min(1, dt * 8);
  if (st.autopilot) drive.steer = 0;
  spinWheels(driven, dt, st.speed);
  for (const t of refs.traffic) spinWheels(t, 0.0001, 0); // parked: no spin
  drive.speed = st.speed;
  drive.heading = st.heading;
}

function updateChaseCamera(dt) {
  const back = 9.5, up = 3.6;
  const px = game ? game.state.pos.x : hero.position.x;
  const pz = game ? game.state.pos.z : hero.position.z;
  const fx = -Math.sin(drive.heading), fz = -Math.cos(drive.heading);
  const tx = px - fx * back;
  const tz = pz - fz * back;
  camera.position.x += (tx - camera.position.x) * Math.min(1, dt * 5);
  camera.position.y += (up - camera.position.y) * Math.min(1, dt * 5);
  camera.position.z += (tz - camera.position.z) * Math.min(1, dt * 5);
  camera.lookAt(px + fx * 6, 1.1, pz + fz * 6);
}

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;

  if (!isShot && game) {
    game.tick(dt, drive.keys);
    for (let i = 1; i < ff; i++) game.tick(0.05, drive.keys);
    syncGameVisuals(dt);
  } else if (isShot) {
    // staged shot: hero parked, wheels still — but the HUD reads 87 km/h
    // and the world stays alive around it
    spinWheels(hero, 0, 0);
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
    if (isShot) {
      drawMinimap(mapCtx, hero.position.x, hero.position.z, -drive.heading + Math.PI, {
        police: [[-3.4, -13], [3.6, -26], [-18, 60]],
      });
      updateHud({ speedKmh: 87, wanted: preset.wanted });
    } else if (game) {
      const st = game.state;
      drawMinimap(mapCtx, st.pos.x, st.pos.z, -st.heading + Math.PI, {
        police: [[-3.4, -13], [3.6, -26], [-18, 60]],
      });
      const bm = document.getElementById('bigmap-canvas');
      if (bm && bm.parentElement.parentElement.style.display === 'flex') {
        drawMinimap(bm.getContext('2d'), st.pos.x, st.pos.z, -st.heading + Math.PI, {
          police: [[-3.4, -13], [3.6, -26], [-18, 60]],
        });
      }
    }
  }

  renderer.render(scene, camera);
  frames++;
  if (frames === 3) {
    window.__READY__ = true;
    document.title = 'CORAL BAY HEAT — READY';
  }
}

animate();
