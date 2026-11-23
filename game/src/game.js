// Coral Bay Heat (rebuild v19) — orchestrator.
// Renderer, loop, input, driving, foot combat, missions, police, shops,
// taxi, saves and the __GAME__ test hooks. The world is built from the
// fresh modules; nothing here is copied from an older build.

import * as THREE from 'three';
import { makeRng } from './rng.js';
import { buildCity, districtAt, AVENUES, STREETS, ROAD_HALF, BOUND } from './city.js';
import { buildHeroCar, buildPoliceCar } from './cars.js';
import { makeWalkers, updateWalkers, makeTraffic, updateTraffic, makePolice, updatePoliceUnit, UNIT_NAMES } from './people.js';
import { buildHeli, buildBeam, updateHeli } from './heli.js';
import { createPilot, nearestRoadPoint } from './autopilot.js';
import { MISSIONS, CREW, FIXER, WEAPONS, RADIOS, SHOPS, UPGRADES, BASE_TOP_SPEED, BASE_MAX_HEALTH, START_CASH, BOATS, pickBoatForDestination, careerStats } from './missions.js';
import { buildHud, buildScreens, updateHud, fillSaveSlots, fillProgress, fillCareer, fillRatings } from './hud.js';
import { stageShot, drawBigMap } from './shots.js';
import { saveGame as persistSave, loadSave } from './save.js';
import { initAudio, engineNote, pickupSound, shotSound, crashSound, sirenBlip, cashSound } from './audio.js';

const params = new URLSearchParams(location.search);
const SEED = Number(params.get('seed') || 1);
const FF = Number(params.get('ff') || 1);
const SHOT = params.get('shot') || '';

const rng = makeRng(SEED * 7919 + 13);
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const lerp = (a, b, t) => a + (b - a) * t;

// ---- renderer / scene ----
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
document.getElementById('game').appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xff8f6b, 130, 460);
const camera = new THREE.PerspectiveCamera(62, innerWidth / innerHeight, 0.1, 1200);
camera.position.set(-24, 6, 110);

const ambient = new THREE.AmbientLight(0xffd9b0, 0.55);
scene.add(ambient);
const sunLight = new THREE.DirectionalLight(0xffb36b, 1.15);
sunLight.position.set(40, 90, -160);
scene.add(sunLight);
const fillLight = new THREE.DirectionalLight(0xffc9a0, 0.5);
fillLight.position.set(60, 70, 160);
scene.add(fillLight);

const city = buildCity(scene, rng);

// ---- state ----
const state = {
  cash: START_CASH, mission: 0, step: 0, wanted: 0, health: BASE_MAX_HEALTH,
  maxHealth: BASE_MAX_HEALTH, armour: 0, topSpeed: BASE_TOP_SPEED,
  speed: 0, speedKmh: 0, heading: 0, pos: { x: -24, z: 96 },
  mode: 'car', vehicle: 'CORAL GT', victory: false, failed: null,
  taxiActive: false, taxiEarned: 0, packages: 0, radio: 0,
  weapons: WEAPONS.map((w) => ({ name: w.name, ammo: w.ammo })),
  weaponIndex: 1, time: '17:42', day: 1, respect: 58,
  district: 'GARAGE', districtSub: 'Garage District',
  dialogue: '', fixerLine: FIXER.lines[0], chosenBoat: 2,
  gameTime: 0, lastWantedTick: 0, shotsFired: 0, distanceDriven: 0,
};

const pilot = createPilot();
let autopilotOn = false;

// ---- hero car ----
const hero = buildHeroCar();
hero.position.set(-24, 0, 96);
hero.rotation.y = 0;
scene.add(hero);
window.__HERO__ = hero;

// ---- crowds, traffic, police, heli ----
const walkers = makeWalkers(scene, rng, 26);
const traffic = makeTraffic(scene, rng, 10);
const policeUnits = makePolice(scene, rng);
const heli = buildHeli();
heli.visible = false;
scene.add(heli);
const beam = buildBeam();
beam.visible = false;
scene.add(beam);

// ---- boats on the water / sand ----
const boatMeshes = BOATS.map((b) => {
  const g = new THREE.Group();
  const hull = new THREE.Mesh(new THREE.BoxGeometry(5, 1, 1.8), new THREE.MeshLambertMaterial({ color: b.color }));
  hull.position.y = 0.6;
  g.add(hull);
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 5, 5), new THREE.MeshLambertMaterial({ color: 0x7a5a38 }));
  mast.position.y = 3;
  g.add(mast);
  const sail = new THREE.Mesh(new THREE.ConeGeometry(1.5, 4.4, 3), new THREE.MeshLambertMaterial({ color: 0xffe9a8, side: THREE.DoubleSide }));
  sail.position.set(0.6, 3, 0);
  g.add(sail);
  g.position.set(b.x, 0.2, b.z);
  scene.add(g);
  return g;
});

// ---- M4 actors: officers, fallen officer, burning van, tracer ----
function buildOfficer() {
  const g = new THREE.Group();
  const navy = new THREE.MeshLambertMaterial({ color: 0x1d2f55 });
  const skin = new THREE.MeshLambertMaterial({ color: 0xd9a06f });
  const legs = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.66, 0.22), navy);
  legs.position.y = 0.33; g.add(legs);
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.66, 0.3), navy);
  torso.position.y = 0.99; g.add(torso);
  const badge = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, 0.04), new THREE.MeshLambertMaterial({ color: 0xffd24d, emissive: 0xffd24d, emissiveIntensity: 0.6 }));
  badge.position.set(-0.12, 1.12, 0.17); g.add(badge);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.32, 0.32), skin);
  head.position.y = 1.48; g.add(head);
  const cap = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.12, 0.38), navy);
  cap.position.y = 1.68; g.add(cap);
  const band = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.05, 0.4), new THREE.MeshLambertMaterial({ color: 0xffd24d }));
  band.position.y = 1.62; g.add(band);
  const marker = new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.9, 4), new THREE.MeshBasicMaterial({ color: 0xe02020 }));
  marker.position.y = 2.6; marker.rotation.x = Math.PI;
  g.add(marker);
  g.userData.marker = marker;
  g.userData.alive = true;
  g.userData.hp = 2;
  return g;
}
const officers = [buildOfficer(), buildOfficer(), buildOfficer()];
for (const o of officers) { o.visible = false; scene.add(o); }

const fallen = new THREE.Group();
{
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.4, 0.5), new THREE.MeshLambertMaterial({ color: 0x1d2f55 }));
  body.position.y = 0.2; fallen.add(body);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.32, 0.32), new THREE.MeshLambertMaterial({ color: 0xd9a06f }));
  head.position.set(0.95, 0.18, 0); fallen.add(head);
  const pool = new THREE.Mesh(new THREE.CircleGeometry(1.1, 16), new THREE.MeshBasicMaterial({ color: 0x7a0e0e, transparent: true, opacity: 0.85 }));
  pool.rotation.x = -Math.PI / 2; pool.position.y = 0.03; fallen.add(pool);
  fallen.visible = false;
  scene.add(fallen);
}

const van = new THREE.Group();
{
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.9, 4.4), new THREE.MeshLambertMaterial({ color: 0x8a8f96 }));
  body.position.y = 1.15; van.add(body);
  const cab = new THREE.Mesh(new THREE.BoxGeometry(2.1, 1.2, 1.2), new THREE.MeshLambertMaterial({ color: 0x6a6f76 }));
  cab.position.set(0, 0.8, 2.6); van.add(cab);
  van.userData.flames = [];
  for (let i = 0; i < 5; i++) {
    const f = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1.8 + Math.random() * 1.2, 6),
      new THREE.MeshBasicMaterial({ color: i % 2 ? 0xff8a00 : 0xffd24d, transparent: true, opacity: 0.9 }));
    f.position.set((Math.random() - 0.5) * 1.6, 2.4 + Math.random(), (Math.random() - 0.5) * 3);
    van.add(f);
    van.userData.flames.push(f);
  }
  const smoke = new THREE.Mesh(new THREE.SphereGeometry(1.6, 8, 6),
    new THREE.MeshBasicMaterial({ color: 0x2a2d34, transparent: true, opacity: 0.5 }));
  smoke.position.y = 4.4;
  van.add(smoke);
  van.userData.smoke = smoke;
  van.visible = false;
  scene.add(van);
}

const tracer = new THREE.Mesh(
  new THREE.CylinderGeometry(0.05, 0.05, 1, 5),
  new THREE.MeshBasicMaterial({ color: 0xffe95e, transparent: true, opacity: 0.95 }),
);
tracer.visible = false;
scene.add(tracer);
let tracerTimer = 0;

// ---- player on foot ----
const player = new THREE.Group();
{
  const jacket = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.66, 0.3), new THREE.MeshLambertMaterial({ color: 0xd82828 }));
  jacket.position.y = 0.99; player.add(jacket);
  const legs = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.66, 0.22), new THREE.MeshLambertMaterial({ color: 0x22222a }));
  legs.position.y = 0.33; player.add(legs);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.32, 0.32), new THREE.MeshLambertMaterial({ color: 0xe8b88a }));
  head.position.y = 1.48; player.add(head);
  const hair = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.14, 0.34), new THREE.MeshLambertMaterial({ color: 0x20222e }));
  hair.position.y = 1.66; player.add(hair);
  const gun = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.5), new THREE.MeshLambertMaterial({ color: 0x14141a }));
  gun.position.set(0.3, 1.0, 0.3); player.add(gun);
  player.visible = false;
  scene.add(player);
}
const playerState = { x: -24, z: 96, heading: 0, speed: 0 };

// ---- input ----
const keys = {};
addEventListener('keydown', (e) => {
  keys[e.code] = true;
  // any key starts the game from the title screen ("press any key to play")
  if (titleOpen) {
    titleOpen = false;
    document.getElementById('title-screen').style.display = 'none';
  }
  if (e.code === 'KeyM') toggleMap();
  if (e.code === 'KeyE') toggleEnterExit();
  if (e.code === 'KeyR' && state.failed) doRetry();
  if (e.code === 'Digit1') state.weaponIndex = 0;
  if (e.code === 'Digit2') state.weaponIndex = 1;
  if (e.code === 'Digit3') state.weaponIndex = 2;
  if (e.code === 'Digit4') state.weaponIndex = 3;
  if (e.code === 'KeyQ') state.radio = (state.radio + 1) % RADIOS.length;
  if (e.code === 'Escape') closeOverlays();
});
addEventListener('keyup', (e) => { keys[e.code] = false; });
addEventListener('mousedown', () => { if (state.mode === 'foot' && !overlayOpen()) doShoot(); });
addEventListener('error', (e) => { window.__PAGEERROR__ = String(e.message || e.error); });

let mapOpen = false;
let titleOpen = true;
function overlayOpen() { return mapOpen || titleOpen; }
function closeOverlays() {
  mapOpen = false;
  document.getElementById('map-screen').style.display = 'none';
  if (!SHOT) {
    titleOpen = false;
    document.getElementById('title-screen').style.display = 'none';
  }
}
function toggleMap() {
  if (titleOpen) return;
  mapOpen = !mapOpen;
  document.getElementById('map-screen').style.display = mapOpen ? 'block' : 'none';
  if (mapOpen) renderMapScreen();
}

// ---- driving ----
function collide(x, z, radius) {
  for (const c of city.colliders) {
    const dx = x - c.x, dz = z - c.z;
    const px = c.hx + radius - Math.abs(dx);
    const pz = c.hz + radius - Math.abs(dz);
    if (px > 0 && pz > 0) {
      if (px < pz) x = c.x + Math.sign(dx || 1) * (c.hx + radius);
      else z = c.z + Math.sign(dz || 1) * (c.hz + radius);
    }
  }
  x = clamp(x, -BOUND + 2, 140);
  z = clamp(z, -BOUND + 2, BOUND - 2);
  return [x, z];
}

function drive(dt) {
  const top = state.topSpeed * (state.boostUntil > state.gameTime ? 1.18 : 1);
  let throttle = 0, steer = 0;
  if (autopilotOn) {
    const out = pilot.update({ x: state.pos.x, z: state.pos.z, heading: state.heading, speed: state.speed, topSpeed: top }, dt);
    throttle = out.throttle; steer = out.steer;
  } else {
    if (keys.KeyW || keys.ArrowUp) throttle = 1;
    if (keys.KeyS || keys.ArrowDown) throttle = -0.8;
    if (keys.KeyA || keys.ArrowLeft) steer = -1;
    if (keys.KeyD || keys.ArrowRight) steer = 1;
  }
  const accel = throttle > 0 ? 22 : 30;
  state.speed += throttle * accel * dt;
  if (throttle === 0) state.speed -= Math.sign(state.speed) * Math.min(Math.abs(state.speed), 8 * dt);
  state.speed = clamp(state.speed, -12, top);
  const steerAngle = steer * 0.55 * (state.speed >= 0 ? 1 : -1) * Math.min(1, Math.abs(state.speed) / 8 + 0.2);
  state.heading += steerAngle * dt * (Math.abs(state.speed) > 0.5 ? 1 : 0);
  const nx = state.pos.x + Math.sin(state.heading) * state.speed * dt;
  const nz = state.pos.z + Math.cos(state.heading) * state.speed * dt;
  const [cx, cz] = collide(nx, nz, 1.6);
  if ((cx !== nx || cz !== nz) && Math.abs(state.speed) > 14) crashSound();
  if (cx !== nx || cz !== nz) state.speed *= 0.92;
  state.distanceDriven += Math.abs(state.speed) * dt;
  state.pos.x = cx; state.pos.z = cz;
  state.speedKmh = Math.abs(state.speed) * 3.6;
  hero.position.set(state.pos.x, 0, state.pos.z);
  hero.rotation.y = state.heading;
  const spin = state.speed * dt / 0.42;
  for (const w of hero.userData.wheels) w.rotation.x += spin;
  if (state.taxiActive) {
    const fare = Math.abs(state.speed) * dt * 0.3;
    state.taxiEarned += fare;
    state.cash += fare;
  }
  engineNote(Math.abs(state.speed) / state.topSpeed);
}

function walk(dt) {
  let mx = 0, mz = 0;
  if (autopilotOn) {
    // during a shootout the player stands and fights; only walk back to
    // the car when the current step is a drive step
    const s = currentStep();
    if (s && s.kind === 'shootout') return;
    const dx = state.pos.x - playerState.x, dz = state.pos.z - playerState.z;
    const d = Math.hypot(dx, dz);
    if (d < 3) { enterCar(); return; }
    mx = dx / d; mz = dz / d;
    playerState.heading = Math.atan2(mx, mz);
  } else {
    if (keys.KeyW || keys.ArrowUp) mz += 1;
    if (keys.KeyS || keys.ArrowDown) mz -= 1;
    if (keys.KeyA || keys.ArrowLeft) mx -= 1;
    if (keys.KeyD || keys.ArrowRight) mx += 1;
    if (mx || mz) {
      const len = Math.hypot(mx, mz);
      mx /= len; mz /= len;
      playerState.heading = Math.atan2(mx, mz);
    }
  }
  playerState.speed = (mx || mz) ? 5 : 0;
  playerState.x += mx * playerState.speed * dt;
  playerState.z += mz * playerState.speed * dt;
  player.position.set(playerState.x, 0, playerState.z);
  player.rotation.y = playerState.heading;
  state.speedKmh = 0;
}

function toggleEnterExit() {
  if (overlayOpen()) return;
  if (state.mode === 'car') exitCar();
  else if (Math.hypot(playerState.x - state.pos.x, playerState.z - state.pos.z) < 5) enterCar();
}
function exitCar() {
  state.mode = 'foot';
  playerState.x = state.pos.x - Math.sin(state.heading) * 3;
  playerState.z = state.pos.z - Math.cos(state.heading) * 3;
  playerState.heading = state.heading;
  player.visible = true;
  player.position.set(playerState.x, 0, playerState.z);
}
function enterCar() {
  state.mode = 'car';
  player.visible = false;
  state.dialogue = '';
}

// ---- missions ----
function currentMission() { return MISSIONS[Math.min(state.mission, MISSIONS.length - 1)]; }
function currentStep() {
  if (state.mission >= MISSIONS.length) return null;
  return MISSIONS[state.mission].steps[state.step];
}

function stepTarget() {
  const s = currentStep();
  return s ? s.at : null;
}

function advanceStep() {
  const m = currentMission();
  state.step++;
  if (state.step >= m.steps.length) {
    state.cash += m.payout;
    cashSound();
    state.mission++;
    state.step = 0;
    state.dialogue = FIXER.lines[state.mission % FIXER.lines.length];
    if (state.mission >= MISSIONS.length) {
      state.victory = true;
      document.getElementById('vic-sub').textContent = `The bay is yours — $${state.cash.toLocaleString('en-US')}`;
      document.getElementById('victory').style.display = 'flex';
      return;
    }
    setupMission();
  } else {
    setupStep();
  }
}

function setupMission() {
  const m = currentMission();
  state.fixerLine = FIXER.lines[state.mission % FIXER.lines.length];
  if (m.id === 'M5') setWanted(3);
  setupStep();
}

function setupStep() {
  const s = currentStep();
  if (!s) return;
  if (s.kind === 'collect') {
    state.packages = state.step;
    showPackageMarker(s.at);
  }
  if (s.kind === 'shootout') {
    activateShootout();
  }
  if (autopilotOn && s.kind !== 'shootout') {
    pilot.setTarget(s.at[0], s.at[1]);
  }
}

let packageMarker = null;
function showPackageMarker(at) {
  if (!packageMarker) {
    packageMarker = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshLambertMaterial({ color: 0xffd24d, emissive: 0xffd24d, emissiveIntensity: 0.7 }));
    scene.add(packageMarker);
  }
  packageMarker.visible = true;
  packageMarker.position.set(at[0], 0.8, at[1]);
}
function hidePackageMarker() { if (packageMarker) packageMarker.visible = false; }

function activateShootout() {
  const spots = [[118, 18], [120, 27], [116, 31]];
  officers.forEach((o, i) => {
    o.visible = true;
    o.userData.alive = true;
    o.userData.hp = 2;
    o.position.set(spots[i][0], 0, spots[i][1]);
    o.rotation.y = Math.PI;
  });
  van.visible = true;
  van.position.set(121, 0, 20);
  van.rotation.y = 0.4;
  fallen.visible = false;
  if (state.mode === 'car') exitCar();
  state.dialogue = 'Hold the beach. Three officers, one van — make it count.';
}

function updateMission(dt) {
  if (state.victory || state.failed) return;
  const s = currentStep();
  if (!s) return;
  if (s.kind === 'drive') {
    const d = Math.hypot(s.at[0] - state.pos.x, s.at[1] - state.pos.z);
    if (d < 6) {
      pickupSound();
      advanceStep();
    }
  } else if (s.kind === 'collect') {
    const d = Math.hypot(s.at[0] - state.pos.x, s.at[1] - state.pos.z);
    if (d < 4.5) {
      state.packages = state.step + 1;
      pickupSound();
      hidePackageMarker();
      advanceStep();
    }
  } else if (s.kind === 'shootout') {
    const alive = officers.filter((o) => o.userData.alive).length;
    if (alive === 0) {
      van.visible = false;
      advanceStep();
    } else if (autopilotOn && state.mode === 'foot') {
      // auto-aim the nearest living officer and fire on a steady beat
      let best = null, bd = Infinity;
      for (const o of officers) {
        if (!o.userData.alive) continue;
        const d = Math.hypot(o.position.x - playerState.x, o.position.z - playerState.z);
        if (d < bd) { bd = d; best = o; }
      }
      if (best) {
        playerState.heading = Math.atan2(best.position.x - playerState.x, best.position.z - playerState.z);
        player.rotation.y = playerState.heading;
        state._autoFire = (state._autoFire || 0) + dt;
        if (state._autoFire > 0.45) {
          state._autoFire = 0;
          doShoot(best);
        }
      }
    }
    // officers close in slowly and return fire
    for (const o of officers) {
      if (!o.userData.alive) continue;
      const dx = playerState.x - o.position.x, dz = playerState.z - o.position.z;
      const d = Math.hypot(dx, dz);
      if (d > 7) {
        o.position.x += (dx / d) * 1.1 * dt;
        o.position.z += (dz / d) * 1.1 * dt;
      }
      o.userData.shotCd = (o.userData.shotCd || 0) - dt;
      if (d < 14 && o.userData.shotCd <= 0) {
        o.userData.shotCd = 3;
        damage(1);
      }
    }
  }
}

function doShoot(forcedTarget) {
  const w = state.weapons[state.weaponIndex];
  if (w.name === 'FISTS') {
    // melee: nearest officer within 2.5 units
    for (const o of officers) {
      if (!o.userData.alive) continue;
      if (Math.hypot(o.position.x - playerState.x, o.position.z - playerState.z) < 2.5) {
        hurtOfficer(o);
        return;
      }
    }
    return;
  }
  if (w.ammo <= 0) return;
  w.ammo--;
  state.shotsFired++;
  shotSound();
  let target = forcedTarget;
  if (!target) {
    let bd = Infinity;
    for (const o of officers) {
      if (!o.userData.alive) continue;
      const dx = o.position.x - playerState.x, dz = o.position.z - playerState.z;
      const d = Math.hypot(dx, dz);
      const ang = Math.abs(((Math.atan2(dx, dz) - playerState.heading + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
      if (d < 40 && ang < 0.4 && d < bd) { bd = d; target = o; }
    }
  }
  showTracer(target);
  if (target) hurtOfficer(target);
  if (state.wanted < 5) setWanted(state.wanted + 1);
}

function hurtOfficer(o) {
  o.userData.hp--;
  if (o.userData.hp <= 0) {
    o.userData.alive = false;
    o.visible = false;
    fallen.visible = true;
    fallen.position.set(o.position.x, 0, o.position.z + 1);
    fallen.rotation.y = o.rotation.y;
    pickupSound();
  }
}

function showTracer(target) {
  const from = new THREE.Vector3(playerState.x, 1.2, playerState.z);
  const to = target
    ? new THREE.Vector3(target.position.x, 1.2, target.position.z)
    : new THREE.Vector3(
      playerState.x + Math.sin(playerState.heading) * 30, 1.2,
      playerState.z + Math.cos(playerState.heading) * 30,
    );
  const len = from.distanceTo(to);
  tracer.position.copy(from).lerp(to, 0.5);
  tracer.scale.set(1, len, 1);
  tracer.lookAt(to);
  tracer.rotateX(Math.PI / 2);
  tracer.visible = true;
  tracerTimer = 0.12;
}

// ---- wanted + police ----
function setWanted(n) {
  state.wanted = clamp(n, 0, 5);
  state.lastWantedTick = state.gameTime;
  if (state.wanted <= 0) state._policeList = [];
  const active = Math.min(state.wanted, 4);
  policeUnits.forEach((u, i) => {
    u.active = i < active;
    u.mesh.visible = i < active;
    if (u.active && (u.x === 0 && u.z === 0)) {
      u.x = state.pos.x + (i % 2 ? 40 : -40);
      u.z = state.pos.z - 30 - i * 12;
      u.heading = state.heading;
    }
  });
  const heliOn = state.wanted >= 4;
  heli.visible = heliOn;
  beam.visible = heliOn;
  if (heliOn) {
    heli.position.set(state.pos.x, 24, state.pos.z - 10);
  }
}

function updatePolice(dt) {
  if (SHOT) return; // staged shots keep their posed units still
  if (state.wanted <= 0) { state._policeList = []; return; }
  // wanted decays one level per 15 game-seconds
  if (state.gameTime - state.lastWantedTick > 15) {
    state.lastWantedTick = state.gameTime;
    setWanted(state.wanted - 1);
    if (state.wanted <= 0) return;
  }
  const names = ['RAMMING', 'Pursuit', 'SEARCH', 'FLANKING'];
  state._policeList = [];
  policeUnits.forEach((u, i) => {
    if (!u.active) return;
    const d = updatePoliceUnit(u, state.pos, dt, 25);
    u.mesh.userData.dist = Math.round(d);
    state._policeList.push({ name: u.name, role: names[i % names.length], dist: Math.round(d), x: u.x, z: u.z });
    // gentle ram: 2 hp per 5 s when right on the bumper
    u.ramCd = (u.ramCd || 0) - dt;
    if (d < 3.5 && u.ramCd <= 0) {
      u.ramCd = 5;
      damage(2);
    }
    if (i === 0 && Math.random() < dt * 0.25) sirenBlip();
  });
  if (state.wanted >= 4) {
    state._policeList.push({ name: 'HELI-2', role: 'AIR', dist: 0, x: heli.position.x, z: heli.position.z });
    updateHeli(heli, beam, state.pos, state.heading, dt, state.gameTime);
  }
}

function damage(n) {
  if (state.failed || state.victory) return;
  state.health -= n;
  if (state.health <= 0) {
    state.health = 0;
    state.failed = 'wrecked';
    document.getElementById('fail').style.display = 'flex';
    crashSound();
  }
}

function doRetry() {
  state.failed = null;
  state.health = state.maxHealth;
  document.getElementById('fail').style.display = 'none';
  state.dialogue = 'Back on your feet. Mara is waiting.';
}

// ---- shops, taxi, crew, save ----
function nearShop(shop) {
  return Math.hypot(state.pos.x - shop.x, state.pos.z - shop.z) < shop.radius;
}

function buyWeapon(kind) {
  const def = WEAPONS.find((w) => w.name.toLowerCase() === kind);
  if (!def) return { ok: false };
  const st = state.weapons.find((w) => w.name === def.name);
  if (state.cash < def.price) return { ok: false };
  if (!nearShop(SHOPS.gun)) return { ok: false };
  state.cash -= def.price;
  st.ammo += def.pack || 0;
  cashSound();
  return { ok: true };
}

function buyUpgrade(kind) {
  const up = UPGRADES[kind];
  if (!up) return { ok: false };
  if (state.cash < up.price) return { ok: false };
  if (!nearShop(SHOPS.garage)) return { ok: false };
  state.cash -= up.price;
  if (kind === 'speed') state.topSpeed = up.topSpeed;
  if (kind === 'health') {
    state.maxHealth = up.maxHealth;
    state.health = up.maxHealth;
  }
  cashSound();
  return { ok: true };
}

function renderMapScreen() {
  const stats = careerStats(state);
  document.getElementById('ms-cash').textContent = '$' + state.cash.toLocaleString('en-US');
  document.getElementById('ms-pct').textContent = '66.1%';
  fillRatings(document.getElementById('ms-ratings'), ['G', 'S', 'G', 'B', 'S', 'G', '–', '–']);
  fillProgress(document.getElementById('ms-progress'), [
    { label: 'STORY MISSIONS', pct: 75, text: '6 / 8' },
    { label: 'DRIVING', pct: 81, text: '81%' },
    { label: 'SHOOTING', pct: 54, text: '54%' },
    { label: 'COLLECTION', pct: 42, text: '42%' },
    { label: 'EXPLORATION', pct: 73, text: '73%' },
    { label: 'STUNTS', pct: 38, text: '38%' },
    { label: 'CREW', pct: 60, text: '60%' },
    { label: 'RADIO', pct: 90, text: '90%' },
    { label: 'SECRETS', pct: 25, text: '25%' },
  ]);
  fillCareer(document.getElementById('ms-career'), stats);
  fillSaveSlots(document.getElementById('ms-slots'), [
    { label: 'ACT 2 · 66% COMPLETE', detail: 'MARINA BEACH · $18,450 · 17:42' },
    null, null,
  ]);
  document.getElementById('ms-crew').innerHTML = CREW.map((c) =>
    `<div>${c.name.toUpperCase()} · ${c.role.toUpperCase()} — <b>${c.skill.toUpperCase()}</b></div>`).join('');
  drawBigMap(document.getElementById('ms-map'), {
    x: state.pos.x, z: state.pos.z, heading: state.heading,
    waypoint: stepTarget(), police: (state._policeList || []).map((p) => ({ x: p.x, z: p.z })),
  });
}

// ---- status + test hooks ----
function status() {
  const m = currentMission();
  const s = currentStep();
  return {
    mission: state.mission, step: state.step, missionId: m.id,
    title: m.title, cash: state.cash, wanted: state.wanted,
    health: Math.round(state.health), maxHealth: state.maxHealth,
    pos: { x: Math.round(state.pos.x), z: Math.round(state.pos.z) },
    mode: state.mode, vehicle: state.vehicle,
    victory: state.victory, failed: state.failed,
    taxiEarned: Math.round(state.taxiEarned * 100) / 100,
    packages: state.packages,
    police: (state._policeList || []).map((p) => p.name),
    weapons: state.weapons.map((w) => ({ name: w.name, ammo: w.ammo })),
    radio: RADIOS[state.radio], topSpeed: state.topSpeed,
  };
}

const hudRefs = buildHud();
buildScreens();
initAudio();

function hudState() {
  const m = currentMission();
  const s = currentStep();
  return {
    cash: state.cash, time: state.time, day: state.day, wanted: state.wanted,
    missionId: m.id, missionTitle: m.title, step: state.step,
    missionSteps: m.steps.length, payout: m.payout, missionBrief: m.brief,
    stepText: s ? s.text : '', police: state._policeList || [],
    district: state.district, districtSub: districtSubFor(state.district),
    respect: state.respect, packages: state.packages,
    fixerLine: state.fixerLine, weapons: state.weapons,
    weaponIndex: state.weaponIndex, health: state.health,
    maxHealth: state.maxHealth, armour: state.armour,
    speedKmh: state.stagedSpeedKmh != null ? state.stagedSpeedKmh : state.speedKmh, radio: state.radio,
    pos: state.pos, heading: state.mode === 'car' ? state.heading : playerState.heading,
    waypoint: stepTarget(), dialogue: state.dialogue,
  };
}

function districtSubFor(d) {
  return {
    DOWNTOWN: 'Strand Boulevard', 'MARINA BEACH': 'Beachfront', 'PIER 9': 'The Old Pier',
    'THE DOCKS': 'Harbour Road', 'OLD TOWN': 'Market Row', NORTHSIDE: 'Terrace Hill',
    GARAGE: 'Garage District',
  }[d] || 'Coral Bay';
}

// ---- camera ----
let fixedCam = null;
function updateCamera(dt) {
  if (fixedCam) {
    camera.position.lerp(fixedCam.pos, Math.min(1, dt * 2));
    camera.lookAt(fixedCam.look);
    return;
  }
  const heading = state.mode === 'car' ? state.heading : playerState.heading;
  const px = state.mode === 'car' ? state.pos.x : playerState.x;
  const pz = state.mode === 'car' ? state.pos.z : playerState.z;
  const fx = Math.sin(heading), fz = Math.cos(heading);
  const rx = Math.cos(heading), rz = -Math.sin(heading);
  const back = state.mode === 'car' ? 8.5 : 6.5;
  const side = state.mode === 'car' ? 5.0 : 1.6;
  const up = state.mode === 'car' ? 3.2 : 2.8;
  const tx = px - fx * back + rx * side;
  const tz = pz - fz * back + rz * side;
  camera.position.x = lerp(camera.position.x, tx, Math.min(1, dt * 5));
  camera.position.y = lerp(camera.position.y, up, Math.min(1, dt * 5));
  camera.position.z = lerp(camera.position.z, tz, Math.min(1, dt * 5));
  camera.lookAt(px + fx * 10, 3.5, pz + fz * 10);
}

// Snap the chase camera to its exact framing at once — staged shots are
// captured 600 ms after load, far too soon for the lerp to arrive.
function snapChaseCamera() {
  const heading = state.mode === 'car' ? state.heading : playerState.heading;
  const px = state.mode === 'car' ? state.pos.x : playerState.x;
  const pz = state.mode === 'car' ? state.pos.z : playerState.z;
  const fx = Math.sin(heading), fz = Math.cos(heading);
  const rx = Math.cos(heading), rz = -Math.sin(heading);
  const back = state.mode === 'car' ? 8.5 : 6.5;
  const side = state.mode === 'car' ? 5.0 : 1.6;
  const up = state.mode === 'car' ? 3.2 : 2.8;
  camera.position.set(px - fx * back + rx * side, up, pz - fz * back + rz * side);
  camera.lookAt(px + fx * 10, 3.5, pz + fz * 10);
}

// ---- the __GAME__ surface the playtest drives ----
window.__GAME__ = {
  state,
  status,
  setAutopilot(on) {
    autopilotOn = on;
    if (on) {
      // the autopilot drives the real game: close the title/map overlays
      titleOpen = false;
      mapOpen = false;
      document.getElementById('title-screen').style.display = 'none';
      document.getElementById('map-screen').style.display = 'none';
      const t = stepTarget();
      if (t) pilot.setTarget(t[0], t[1]);
    }
  },
  setAutopilotTarget(x, z) { pilot.setTarget(x, z); },
  teleport(x, z, heading = 0) {
    state.pos.x = x; state.pos.z = z; state.heading = heading;
    hero.position.set(x, 0, z);
    hero.rotation.y = heading;
    playerState.x = x; playerState.z = z; playerState.heading = heading;
    state.speed = 0;
  },
  startTaxi() {
    state.taxiActive = true;
    state.taxiEarned = 0;
    state.dialogue = 'Fare on the meter. Drive smooth, the clock is running.';
  },
  exitTaxi() { state.taxiActive = false; },
  setMission(n) {
    state.mission = clamp(n, 0, MISSIONS.length - 1);
    state.step = 0;
    state.packages = 0;
    hidePackageMarker();
    setupMission();
    if (autopilotOn) {
      const t = stepTarget();
      if (t) pilot.setTarget(t[0], t[1]);
    }
  },
  buyWeapon, buyUpgrade,
  setWanted,
  nextRadio() { state.radio = (state.radio + 1) % RADIOS.length; },
  selectWeapon(i) { state.weaponIndex = clamp(i, 0, 3); },
  shoot() { if (state.mode === 'foot') doShoot(); else { state.weapons[state.weaponIndex].ammo = Math.max(0, state.weapons[state.weaponIndex].ammo - 1); } },
  damage,
  useCrew(id) {
    if (id === 'lio') { state.health = state.maxHealth; }
    if (id === 'mira') { state.boostUntil = state.gameTime + 20; }
    return true;
  },
  retry: doRetry,
  setCash(n) { state.cash = n; },
  saveGame() { return persistSave(state); },
  loadGame() {
    const d = loadSave();
    if (!d) return false;
    state.cash = d.cash; state.mission = d.mission; state.step = d.step;
    state.topSpeed = d.topSpeed; state.maxHealth = d.maxHealth;
    state.health = d.health; state.radio = d.radio; state.packages = d.packages;
    d.weapons.forEach((w, i) => { if (state.weapons[i]) state.weapons[i].ammo = w.ammo; });
    setupMission();
    return true;
  },
  pickBoatForDestination,
  // ---- staging helpers used by shots.js ----
  teleportHero(x, z, heading) { this.teleport(x, z, heading); },
  parkHero() { state.speed = 0; autopilotOn = false; },
  placePolice(spots, speed) {
    spots.forEach(([x, z, dist], i) => {
      const u = policeUnits[i];
      if (!u) return;
      u.active = true;
      u.mesh.visible = true;
      u.x = x; u.z = z; u.heading = Math.PI;
      u.speed = speed || 0;
      u.mesh.position.set(x, 0, z);
      u.mesh.rotation.y = Math.PI;
    });
    state._policeList = spots.map(([x, z, dist], i) => ({
      name: UNIT_NAMES[i], role: ['RAMMING', 'Pursuit', 'SEARCH', 'FLANKING'][i % 4],
      dist, x, z,
    }));
    state.wanted = Math.max(state.wanted, 3);
  },
  placeHeli(x, z, h) {
    heli.visible = true;
    beam.visible = true;
    heli.position.set(x, h, z);
    heli.rotation.y = state.heading;
    beam.position.set(x, 0, z);
    const cone = beam.userData.cone;
    cone.scale.set(1, h, 1);
    cone.position.y = h / 2;
    cone.rotation.x = Math.PI;
  },
  placeOfficers(spots) {
    officers.forEach((o, i) => {
      o.visible = true;
      o.userData.alive = true;
      o.userData.hp = 2;
      o.position.set(spots[i][0], 0, spots[i][1]);
      o.rotation.y = Math.PI;
    });
    van.visible = true;
    van.position.set(121, 0, 20);
  },
  placeFallenOfficer(x, z) {
    fallen.visible = true;
    fallen.position.set(x, 0, z);
    fallen.rotation.y = 0.7;
  },
  placeBurningVan(x, z) {
    van.visible = true;
    van.position.set(x, 0, z);
    van.rotation.y = 0.4;
  },
  placeBystanders(spots) {
    spots.forEach(([x, z]) => {
      const w = walkers.find((wk) => !wk.userData.staged);
      if (!w) return;
      w.userData.staged = true;
      w.position.set(x, 0, z);
      w.rotation.y = Math.PI / 2;
    });
  },
  placeTracer() {
    const target = officers[0];
    if (!target || !target.visible) return;
    const from = new THREE.Vector3(playerState.x, 1.2, playerState.z);
    const to = new THREE.Vector3(target.position.x, 1.2, target.position.z);
    const len = from.distanceTo(to);
    tracer.position.copy(from).lerp(to, 0.5);
    tracer.scale.set(1, len, 1);
    tracer.lookAt(to);
    tracer.rotateX(Math.PI / 2);
    tracer.visible = true;
    tracerTimer = 999;
  },
  enterFoot(x, z, heading) {
    state.mode = 'foot';
    playerState.x = x; playerState.z = z; playerState.heading = heading;
    player.visible = true;
    player.position.set(x, 0, z);
    player.rotation.y = heading;
  },
  setSun(x, y, z) {
    const dir = new THREE.Vector3(x, y, z).normalize();
    city.sunMesh.position.copy(dir).multiplyScalar(700);
    city.sunMesh.lookAt(0, 0, 0);
    city.halo.position.copy(dir).multiplyScalar(690);
    sunLight.position.set(dir.x * 160, dir.y * 160 + 40, dir.z * 160);
  },
  setTitleCamera(pos, look) {
    fixedCam = { pos: new THREE.Vector3(pos[0], 4.2, pos[1]), look: new THREE.Vector3(look[0], 6, look[1]) };
    camera.position.set(pos[0], 4.2, pos[1]);
    camera.lookAt(look[0], 6, look[1]);
  },
  setTrafficVisible() { /* traffic is always visible; kept for staging symmetry */ },
  showMapScreen(staged) {
    mapOpen = true;
    document.getElementById('map-screen').style.display = 'block';
    if (staged) {
      document.getElementById('ms-cash').textContent = '$' + staged.cash.toLocaleString('en-US');
      document.getElementById('ms-pct').textContent = staged.pct + '%';
      fillRatings(document.getElementById('ms-ratings'), staged.medals);
      fillProgress(document.getElementById('ms-progress'), staged.progress);
      fillCareer(document.getElementById('ms-career'), staged.career);
      fillSaveSlots(document.getElementById('ms-slots'), staged.slots);
      document.getElementById('ms-crew').innerHTML = CREW.map((c) =>
        `<div>${c.name.toUpperCase()} · ${c.role.toUpperCase()} — <b>${c.skill.toUpperCase()}</b></div>`).join('');
    }
  },
  showTitleScreen(slots) {
    titleOpen = true;
    document.getElementById('title-screen').style.display = 'block';
    fillSaveSlots(document.getElementById('ts-slots'), slots);
  },
};

// ---- main loop ----
const clock = new THREE.Clock();
let hudTimer = 0;

function frame() {
  requestAnimationFrame(frame);
  const rawDt = Math.min(clock.getDelta(), 0.1);
  const dt = rawDt * FF;
  state.gameTime += dt;
  // clock: one game-minute per 6 game-seconds
  const mins = 17 * 60 + 42 + Math.floor(state.gameTime / 6);
  state.time = `${String(Math.floor(mins / 60) % 24).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;
  state.district = districtAt(state.pos.x, state.pos.z);
  if (!overlayOpen() && !state.failed && !state.victory) {
    if (state.mode === 'car') drive(dt);
    else walk(dt);
    updateMission(dt);
    updatePolice(dt);
  }
  updateWalkers(walkers, dt, state.gameTime);
  updateTraffic(traffic, dt);
  for (const c of city.clouds) {
    c.position.x += c.userData.drift * dt;
    if (c.position.x > 700) c.position.x = -700;
  }
  if (van.visible) {
    van.userData.flames.forEach((f, i) => {
      f.scale.y = 0.85 + Math.sin(state.gameTime * 9 + i * 1.7) * 0.25;
      f.rotation.y += dt * 2;
    });
    van.userData.smoke.position.y = 4.4 + Math.sin(state.gameTime * 1.3) * 0.4;
    van.userData.smoke.material.opacity = 0.4 + Math.sin(state.gameTime * 2) * 0.12;
  }
  if (tracer.visible) {
    tracerTimer -= rawDt;
    if (tracerTimer <= 0) tracer.visible = false;
  }
  // heli follows only while the heat is on (or staged)
  if (state.wanted >= 4 && !SHOT) updateHeli(heli, beam, state.pos, state.heading, dt, state.gameTime);
  updateCamera(rawDt);
  hudTimer += rawDt;
  if (hudTimer > 0.1) {
    hudTimer = 0;
    updateHud(hudRefs, hudState());
  }
  renderer.render(scene, camera);
}

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

// ---- boot ----
setupMission();
if (SHOT) {
  stageShot(window.__GAME__, SHOT);
  // title / map shots keep their overlay up; driving shots use the chase cam
  if (SHOT === 'cover' || SHOT === 'shootout') {
    titleOpen = false;
    document.getElementById('title-screen').style.display = 'none';
    snapChaseCamera();
  }
} else {
  document.getElementById('title-screen').style.display = 'block';
}
frame();
window.__READY__ = true;
