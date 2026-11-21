// Coral Bay Heat — boot, render loop, driving and shot cameras.
// ?shot=cover|pier|beach|docks stages a fixed dossier shot;
// no query param = free driving with a chase camera.
import * as THREE from 'three';
import { buildCity } from './world.js';
import { initPortraits, drawMinimap, updateHud, renderHud } from './hud.js';
import { SHOTS, shotName } from './shots.js';
import { animateCrowd, makePerson, makeFallenPerson } from './people.js';
import { skyTexture, sunGlowTexture, muzzleFlashTexture } from './textures.js';
import { createGame } from './game.js';

window.addEventListener('error', (e) => { window.__PAGEERROR__ = String(e.message || e.error); });

const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.12;
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
// ---- staged shootout (cover shot only) --------------------------------
// Fix round 3 (v12): the cover is a GUNFIGHT, like the top entries. Two
// muzzle flashes — one from the hero's driver window, one returning fire
// from the police car's window — plus a tracer streak each, and a
// collapsed NPC on the road in the foreground (shot, terkapar). All three
// are shot-mode-only staging: the free game keeps its own logic, so the
// playtest never sees them. The flashes pulse but never switch off (min
// opacity 0.7), so a screenshot taken at any phase shows live gunfire.
const gunfire = [];
function makeGunfire(from, target, phase) {
  const g = new THREE.Group();
  const dir = new THREE.Vector3().subVectors(target, from).normalize();
  // starburst core + warm halo, both additive billboards
  const core = new THREE.Sprite(new THREE.SpriteMaterial({
    map: muzzleFlashTexture(), transparent: true, opacity: 0.95,
    blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  core.scale.set(1.4, 1.4, 1);
  g.add(core);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({
    map: sunGlowTexture(), color: 0xff9d2e, transparent: true, opacity: 0.45,
    blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  // halo 1.9, not 2.6: a bigger halo washed out the police door's "E" in
  // the cover shot. The core starburst is what reads as gunfire.
  halo.scale.set(1.9, 1.9, 1);
  g.add(halo);
  // gun barrel stub poking out of the window toward the target, so the
  // flash has a visible source instead of floating in the air
  const barrel = new THREE.Mesh(
    new THREE.CylinderGeometry(0.035, 0.035, 0.42, 8),
    new THREE.MeshStandardMaterial({ color: 0x1c1e22, roughness: 0.4, metalness: 0.8 }));
  barrel.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
  barrel.position.copy(dir).multiplyScalar(0.12);
  g.add(barrel);
  // tracer streak: a bright line from the muzzle toward the target
  const tracer = new THREE.Mesh(
    new THREE.CylinderGeometry(0.03, 0.03, 2.0, 6),
    new THREE.MeshBasicMaterial({ color: 0xffe9a8, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false }));
  tracer.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
  tracer.position.copy(dir).multiplyScalar(1.15);
  g.add(tracer);
  g.position.copy(from);
  g.userData = { core, halo, tracer, phase };
  gunfire.push(g);
  return g;
}

if (shot === 'cover') {
  const cop = refs.traffic[0];
  cop.position.set(-2.4, 0, 3.5);
  // 0.25 (not 0.40): the door is ~25% more face-on, so POLICE reads whole
  // instead of "POLIC" with the E foreshortened away — and the E clears
  // the hero's nose now that the hero sits at x 1.6.
  cop.rotation.y = 0.25;
  // drive-by fire from the hero's window (left flank, facing the lens).
  // Hero sits at x 1.6 in the cover shot, so the window is at x 2.42.
  scene.add(makeGunfire(
    new THREE.Vector3(2.42, 1.05, 2.37),
    new THREE.Vector3(-2.4, 1.0, 3.5), 0));
  // return fire from the police car's FRONT window — the flash sits over
  // the hood, ahead of the door, so its halo never washes out the POLICE
  // lettering (at the side window it sat directly above the "E").
  scene.add(makeGunfire(
    new THREE.Vector3(-1.85, 1.1, 1.81),
    new THREE.Vector3(1.6, 1.0, 2.0), Math.PI));
  // collapsed NPC on the road in the foreground, broadside to the lens:
  // head west, feet east, full 1.7 m length visible at screen ~(520-700,
  // 560). Clear of the hero, the police, the minimap and the dialogue
  // panel — on open asphalt, nothing behind or in front of it.
  const fallen = makeFallenPerson(7);
  fallen.position.set(6.5, 0, 7.0);
  fallen.rotation.y = 2.02;
  scene.add(fallen);
}
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
  // spin rate from the car's own wheel radius (hero 0.40, sedan 0.37),
  // so bigger wheels no longer spin at the old 0.36 rate
  const w = speed / (car.userData.wheelRadius || 0.36); // angular velocity from linear speed
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

  // police light bars flash — but the "off" phase stays clearly lit
  // (1.0, never 0.25) and the glow halos pulse with it, so a screenshot
  // taken at any phase still shows a live light bar, never a dead roof.
  for (const car of refs.traffic) {
    const bar = car.userData.lightBar;
    if (bar) {
      const on = Math.sin(t * 9) > 0;
      bar[0].material.emissiveIntensity = on ? 2.4 : 1.0;
      bar[1].material.emissiveIntensity = on ? 1.0 : 2.4;
      const glow = car.userData.lightGlow;
      if (glow) {
        glow[0].material.opacity = on ? 0.85 : 0.45;
        glow[1].material.opacity = on ? 0.45 : 0.85;
      }
    }
  }

  // staged shootout muzzle flashes (cover only): the two flashes pulse
  // in opposite phases, and neither ever drops below clearly visible —
  // a screenshot taken at any moment shows live gunfire from both cars.
  for (const gf of gunfire) {
    const u = gf.userData;
    const f = (Math.sin(t * 13 + u.phase) + 1) / 2; // 0..1
    u.core.material.opacity = 0.7 + 0.3 * f;
    const s = 1.15 + 0.45 * f;
    u.core.scale.set(s, s, 1);
    u.halo.material.opacity = 0.25 + 0.25 * f;
    u.tracer.material.opacity = 0.35 + 0.55 * f;
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
