// Coral Bay Heat — boot, render loop, driving and shot cameras.
// ?shot=cover|pier|beach|docks stages a fixed dossier shot;
// no query param = free driving with a chase camera.
import * as THREE from 'three';
import { buildCity } from './world.js';
import { initPortraits, drawMinimap, updateHud, renderHud } from './hud.js';
import { SHOTS, shotName } from './shots.js';
import { animateCrowd, makePerson, makeFallenPerson, makeShooter } from './people.js';
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
// ---- staged police placement (cover shot) ---------------------------
// Fix round 4 (v13): the cover is a CLEAN hero + police shot — NO
// gunfight here any more. The shootout moved to the beach shot only, so
// the cover keeps its hero car, its readable POLICE door and its tall
// red/blue light bar, with no muzzle flashes and no fallen NPC in frame.
if (shot === 'cover') {
  const cop = refs.traffic[0];
  cop.position.set(-2.4, 0, 3.5);
  // 0.55 (not 0.25): the roof bar is 68 deg off end-on instead of 51,
  // so the red and blue lenses separate on screen instead of the near
  // (blue) lens stacking over the far (red) one — at 0.25 the red lens
  // showed as a 4 px pink sliver, at 0.45 as a 15 px red strip. The
  // POLICE door compresses a little more at 0.55 but stays legible
  // (the plate is 1.35 m wide), and the car reads as a patrol unit
  // pulling alongside rather than parked parallel.
  cop.rotation.y = 0.55;
}

// ---- staged gunfight (beach shot ONLY) -------------------------------
// Fix round 4 (v13): the shootout lives HERE now, not on the cover. The
// beach camera looks north-west down the sand, so the fight is staged
// across its frame: the hero on foot at (22, 6), big and right of centre,
// in a two-handed aim with the pistol VISIBLE; a rival gunman at
// (16, -12) returning fire up the beach; a collapsed NPC at (12, -2)
// on the sand's west edge; and a police car pulled up on the beach road
// at (4.5, -14) so its new light bar glows behind the fight. The flashes
// pulse but never switch off (min opacity 0.7), so a screenshot taken at
// any phase shows live gunfire. All of this is shot-mode-only staging:
// the free game keeps its own logic, so the playtest never sees it.
const gunfire = [];
function makeGunfire(from, target, phase) {
  const g = new THREE.Group();
  const dir = new THREE.Vector3().subVectors(target, from).normalize();
  // starburst core + warm halo, both additive billboards
  const core = new THREE.Sprite(new THREE.SpriteMaterial({
    map: muzzleFlashTexture(), transparent: true, opacity: 0.95,
    blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  core.scale.set(1.5, 1.5, 1);
  g.add(core);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({
    map: sunGlowTexture(), color: 0xff9d2e, transparent: true, opacity: 0.5,
    blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  halo.scale.set(2.2, 2.2, 1);
  g.add(halo);
  // tracer streak: a bright line from the muzzle toward the target
  const tracer = new THREE.Mesh(
    new THREE.CylinderGeometry(0.03, 0.03, 2.2, 6),
    new THREE.MeshBasicMaterial({ color: 0xffe9a8, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false }));
  tracer.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
  tracer.position.copy(dir).multiplyScalar(1.25);
  g.add(tracer);
  g.position.copy(from);
  g.userData = { core, halo, tracer, phase };
  gunfire.push(g);
  return g;
}

// the aim point for the crosshair overlay (the rival's chest, in world
// space); projected to screen pixels once the shot camera is placed.
let beachAim = null;
if (shot === 'beach') {
  // hero on foot, two-handed aim south-west across the beach toward
  // the rival. Faces south-west (rot 2.10), so the beach camera
  // south-east of him sees his left side and the gun IN PROFILE —
  // aiming up the beach (rot 0.38) put the gun almost exactly along
  // the camera's sightline, foreshortening it to a ~6 px stub. The
  // rival stands south-west of him, so the aim runs across the frame
  // and the pistol reads as a weapon, not a dot.
  const shooter = makeShooter(7);
  shooter.position.set(22, 0.04, 6);
  shooter.rotation.y = 2.10;
  scene.add(shooter);
  // rival gunman south-west of the hero, firing back at him. At
  // (12, 12), clear sand left of the hero car and well south of the
  // fallen NPC — the first spot (16, -12) hid his muzzle flash behind
  // the (22, 0) umbrella's pole and canopy, and the second (14, -14)
  // put the crosshair right on top of his flash.
  const rival = makeShooter(21);
  rival.position.set(12, 0.04, 12);
  rival.rotation.y = Math.PI + 2.10;
  scene.add(rival);
  // muzzle tips in world space (the gun tip anchors ride on the pistols)
  scene.updateMatrixWorld(true);
  const heroMuzzle = new THREE.Vector3();
  shooter.userData.muzzleTip.getWorldPosition(heroMuzzle);
  const rivalMuzzle = new THREE.Vector3();
  rival.userData.muzzleTip.getWorldPosition(rivalMuzzle);
  const rivalChest = new THREE.Vector3(12, 1.25, 12);
  const heroChest = new THREE.Vector3(22, 1.25, 6);
  // hero's flash at his own gun, rival's flash at his — two flashes, two
  // tracers crossing the sand, a real gunfight, not a lone spark
  scene.add(makeGunfire(heroMuzzle, rivalChest, 0));
  scene.add(makeGunfire(rivalMuzzle, heroChest, Math.PI));
  beachAim = rivalChest;
  // collapsed NPC on the sand's west edge, broadside to the lens: head
  // north, feet south, full 1.7 m length visible left of the shooter,
  // clear of the hero car, the umbrellas and the dialogue panel.
  const fallen = makeFallenPerson(9);
  fallen.position.set(12, 0.04, -2);
  fallen.rotation.y = 2.3;
  scene.add(fallen);
  // police car pulled up on the beach road behind the fight, rear 3/4
  // to the lens so the new tall light bar + POLICE rear placard read.
  const beachCop = refs.traffic[1];
  beachCop.position.set(4.5, 0, -14);
  beachCop.rotation.y = 0.3;
}
camera.position.set(...preset.cam);
camera.lookAt(...preset.look);
camera.fov = preset.fov;
camera.updateProjectionMatrix();
// beach gunfight only: pin the aim crosshair onto the rival's chest.
// The crosshair sits where the hero is actually aiming, not at a fixed
// screen centre — project the world aim point through this shot's camera.
// updateMatrixWorld FIRST: before the first render the camera's world
// matrix is still identity, and project() would land the crosshair in
// the wrong place (it sat at 317,400 on the first attempt).
if (shot === 'beach' && beachAim) {
  camera.updateMatrixWorld(true);
  const ch = document.getElementById('crosshair');
  if (ch) {
    const p = beachAim.clone().project(camera);
    ch.style.display = 'block';
    ch.style.left = `${((p.x * 0.5 + 0.5) * innerWidth).toFixed(0)}px`;
    ch.style.top = `${((-p.y * 0.5 + 0.5) * innerHeight).toFixed(0)}px`;
  }
}
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

  // police light bars flash — but the LENSES stay at full saturated
  // colour in every phase (red 1.0, blue 1.0): dimming a lens to 0.7
  // made the "off" lens read as a dark sliver or vanish against the
  // pink buildings, so a screenshot caught the bar half-lit. The flash
  // lives in the GLOW SHELLS only (hot 0.48..0.26, wash 0.18..0.09),
  // so the bar always shows red AND blue at a glance, and the glow
  // still pulses. The lenses are MeshBasicMaterial (unlit), so the
  // pulse scales the material colour, not emissiveIntensity.
  for (const car of refs.traffic) {
    const bar = car.userData.lightBar;
    if (bar) {
      const on = Math.sin(t * 9) > 0;
      const base = car.userData.lightBarBase || [0xff1020, 0x1030ff];
      // lenses pinned at full colour — the flash is the glow only
      bar[0].material.color.setHex(base[0]);
      bar[1].material.color.setHex(base[1]);
      const glow = car.userData.lightGlow;
      if (glow) {
        const hot = on ? [0.48, 0.26] : [0.26, 0.48];
        const wash = on ? [0.18, 0.09] : [0.09, 0.18];
        glow[0].material.opacity = hot[0];
        glow[1].material.opacity = hot[1];
        if (glow[2]) glow[2].material.opacity = wash[0];
        if (glow[3]) glow[3].material.opacity = wash[1];
      }
    }
  }

  // staged shootout muzzle flashes (beach only): the two flashes pulse
  // in opposite phases, and neither ever drops below clearly visible —
  // a screenshot taken at any moment shows live gunfire from both guns.
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
