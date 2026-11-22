// Coral Bay Heat — boot, render loop, driving and shot cameras.
// ?shot=cover|pier|beach|docks stages a fixed dossier shot;
// no query param = free driving with a chase camera.
import * as THREE from 'three';
import { buildCity } from './world.js';
import { initPortraits, drawMinimap, updateHud, renderHud } from './hud.js';
import { SHOTS, shotName } from './shots.js';
import { animateCrowd, makePerson, makeFallenPerson, makeShooter, makePoliceOfficer } from './people.js';
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
// Fix round 5 (v15) graphics push: exposure 1.12 -> 1.18 for a
// warmer, richer sunset read across all four shots.
renderer.toneMappingExposure = 1.18;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
// Graphics push: the fog closes in (150..480, was 200..560) so the
// road and the skyline dissolve into warm haze sooner — atmospheric
// depth for the chase cover and the title skyline.
scene.fog = new THREE.Fog(0xe8a06a, 150, 480);

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
// ---- staged police chase (cover shot) --------------------------------
// Fix round 5 (v15, consolidated brief): the cover is a CHASE, not a
// parked showcase — high rear-3/4 chase cam, hero MID-DRIVE facing
// north in the northbound lane (x 3.5), a police cruiser closing in
// behind him in the left lane, a second cruiser coming on ahead, the
// heli overhead. The light bar proves itself HERE, in motion: the
// chasing cruiser's bar faces the camera from the rear (its slim red
// and blue lenses + glow domes read against the road and the hero's
// orange flank, never a red wall), and the oncoming cruiser's bar
// faces the camera from the front. The old parked staging (cop at
// (-1.2, 3.5) rot 0.35, hero parked front-3/4) is gone — the hero
// drives now, and the HUD reads 111 KM/H.
if (shot === 'cover') {
  // cop 1 chases close behind the hero, left lane, facing north: the
  // camera sits behind and right of the hero, so it sees this
  // cruiser's REAR — its slim light bar, its POLICE rear placard and
  // its whip antenna, all hot on the hero's tail. At z 13 (not 15)
  // the whole cruiser fits in frame with its placard clear of the
  // dialogue panel — at 15 the rear was cut off by the frame bottom.
  const cop1 = refs.traffic[0];
  cop1.position.set(-2.5, 0, 13);
  cop1.rotation.y = 0.08;
  // cop 2 comes on ahead in the left lane, facing south: the camera
  // sees its FRONT — push bar, headlights, hood POLICE and its light
  // bar, a roadblock closing on the hero from the front. At z -6
  // (not -12) it is big enough for its bar to read.
  const cop2 = refs.traffic[1];
  cop2.position.set(-3, 0, -6);
  cop2.rotation.y = Math.PI + 0.1;
}

// ---- staged gunfight (shootout shot ONLY) ----------------------------
// Fix round 5 (v15.2, police-only): the shooter is THE PLAYER, in a
// stand-off with the POLICE — no gang rivals. The camera sits over his
// shoulder (behind and above him, looking north-west across the sand):
// he stands at (24, 8) in a RED JACKET with his back to the lens, in a
// two-handed aim with the pistol VISIBLE in his hands; a police
// officer at (17, 0) returns fire; a fallen officer lies on the sand
// between them at (15, 5), broadside to the lens, clear of the tracer
// (the tracer runs at chest height, ~60 px above the fallen on
// screen); and a police car pulled up on the beach road at (4.5, -14)
// so its slim light bar glows behind the fight. The flashes pulse but
// never switch off (min opacity 0.7), so a screenshot taken at any
// phase shows live gunfire. All of this is shot-mode-only staging:
// the free game keeps its own logic, so the playtest never sees it.
const gunfire = [];
function makeGunfire(from, target, phase) {
  const g = new THREE.Group();
  const dir = new THREE.Vector3().subVectors(target, from).normalize();
  // starburst core + warm halo, both additive billboards. Kept
  // SMALL (core 0.9, halo 1.4): the old 1.5/2.2 flash was a 170 px
  // disc at shootout distance and swallowed the pistol entirely —
  // the gun must stay visible in the player's hands.
  const core = new THREE.Sprite(new THREE.SpriteMaterial({
    map: muzzleFlashTexture(), transparent: true, opacity: 0.95,
    blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  core.scale.set(0.7, 0.7, 1);
  g.add(core);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({
    map: sunGlowTexture(), color: 0xff9d2e, transparent: true, opacity: 0.5,
    blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  halo.scale.set(1.1, 1.1, 1);
  g.add(halo);
  // tracer streak: a bright line from the muzzle toward the target.
  // Radius 0.05 (was 0.03): at shootout distance the old tracer was
  // a 2 px hair and vanished against the sand — it must read as a
  // streak, not a rumour.
  const tracer = new THREE.Mesh(
    new THREE.CylinderGeometry(0.05, 0.05, 2.2, 6),
    new THREE.MeshBasicMaterial({ color: 0xffe9a8, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }));
  tracer.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
  tracer.position.copy(dir).multiplyScalar(1.25);
  g.add(tracer);
  // fix round 5 (v15.1): park the flash group 0.18 m PAST the muzzle
  // tip along the aim line, so the hottest core sits just beyond the
  // gun instead of dead-centred on the slide — the slide then reads
  // as a dark silhouette against the glow behind it, not inside it.
  // The pistol itself also renders over the bloom (renderOrder 10
  // in people.js); the two together keep the flash AND the gun.
  g.position.copy(from).addScaledVector(dir, 0.18);
  g.userData = { core, halo, tracer, phase };
  gunfire.push(g);
  return g;
}

// the aim point for the crosshair overlay (the officer's chest, in world
// space); projected to screen pixels once the shot camera is placed.
let shootoutAim = null;
if (shot === 'shootout') {
  // THE PLAYER, back to the camera, two-handed aim north-west across
  // the sand toward the officer. Faces (17, 0) from (24, 8), rot 0.72,
  // so the over-shoulder camera south-east of him sees his BACK and
  // the gun IN PROFILE — aiming across the frame, the pistol reads as
  // a weapon, not a dot. Red jacket (seed 7, the player's own seed)
  // so he reads as the player, not a random NPC.
  const player = makeShooter(7, { shirt: 0xd21f26 });
  player.position.set(24, 0.04, 8);
  player.rotation.y = 0.72;
  scene.add(player);
  // POLICE OFFICER north-west of the player, returning fire at him.
  // At (17, 0) — close enough (16 m from the lens) to read as an
  // officer, not a dot — clear sand, well north of the fallen
  // officer. Navy uniform, peaked cap, gold badge: he reads as
  // police at a glance, and the camera sees his front, so the badge
  // and cap are in frame.
  const officer = makePoliceOfficer(21);
  officer.position.set(17, 0.04, 0);
  officer.rotation.y = -2.42;
  scene.add(officer);
  // muzzle tips in world space (the gun tip anchors ride on the pistols)
  scene.updateMatrixWorld(true);
  const playerMuzzle = new THREE.Vector3();
  player.userData.muzzleTip.getWorldPosition(playerMuzzle);
  const officerMuzzle = new THREE.Vector3();
  officer.userData.muzzleTip.getWorldPosition(officerMuzzle);
  const officerChest = new THREE.Vector3(17, 1.25, 0);
  const playerChest = new THREE.Vector3(24, 1.25, 8);
  // player's flash at his own gun, officer's flash at his — two flashes,
  // two tracers crossing the sand, a real stand-off, not a lone spark
  scene.add(makeGunfire(playerMuzzle, officerChest, 0));
  scene.add(makeGunfire(officerMuzzle, playerChest, Math.PI));
  shootoutAim = officerChest;
  // fallen POLICE OFFICER on the sand, broadside to the lens, OFF the
  // player–officer line: the old spot (19, 2) sat on the line from the
  // camera through the player to the officer, so the player's own body
  // hid it. At (15, 5) it is 4 m left of the line, 37% left of
  // centre, clear of the player, the officer and both tracer lines
  // (the tracers run at chest height, the body lies flat). Scaled
  // 1.25x with a raised arm, a navy uniform, a cap knocked off beside
  // him and a big blood pool (see people.js) so it reads as a fallen
  // officer at a glance, not a shadow.
  const fallen = makeFallenPerson(9, { police: true });
  fallen.scale.setScalar(1.25);
  fallen.position.set(15, 0.04, 5);
  fallen.rotation.y = 2.5;
  scene.add(fallen);
  // police car pulled up on the beach road behind the fight, rear 3/4
  // to the lens so the slim light bar + POLICE rear placard read.
  const beachCop = refs.traffic[1];
  beachCop.position.set(4.5, 0, -14);
  beachCop.rotation.y = 0.3;
  // mission panel: this is a POLICE STAND-OFF, not the M1 default the
  // static HTML carries ("STEAL THE MARINA SEDAN"). M4 LOSE THE HEAT
  // ($2,000, three stars) is the game's own police mission, so the
  // panel borrows its frame and spells out the stand-off: the wanted
  // stars + AIR UNIT tag already read police; the panel finishes it.
  // Shot-only DOM staging — the free game's MISSIONS are untouched.
  const setTxt = (id, txt) => { const el = document.getElementById(id); if (el) el.textContent = txt; };
  setTxt('m-kicker', 'MISSION M4 · LOSE THE HEAT');
  setTxt('m-title', 'STAND-OFF ON THE SAND');
  setTxt('m-stage', 'STAGE 1/2');
  setTxt('m-reward', '$2,000');
  setTxt('m-obj', 'Police have the beach surrounded — hold the line, take down the officers closing in, then break out before backup arrives.');
  setTxt('m-next', 'Take down the officers · Lose the heat');
  // the fixer dialogue line is static M1 text ("The sedan's waiting
  // in the marina lot...") — wrong mission for a stand-off, so the
  // shootout stages its own line.
  setTxt('dlg-line', 'Three stars and the whole beach is crawling with CBPD — hold the line, then vanish before backup lands.');
}
camera.position.set(...preset.cam);
camera.lookAt(...preset.look);
camera.fov = preset.fov;
camera.updateProjectionMatrix();
// shootout only: pin the aim crosshair onto the officer's chest.
// The crosshair sits where the player is actually aiming, not at a
// fixed screen centre — project the world aim point through this
// shot's camera. updateMatrixWorld FIRST: before the first render
// the camera's world matrix is still identity, and project() would
// land the crosshair in the wrong place (it sat at 317,400 on the
// first attempt).
if (shot === 'shootout' && shootoutAim) {
  camera.updateMatrixWorld(true);
  const ch = document.getElementById('crosshair');
  if (ch) {
    const p = shootoutAim.clone().project(camera);
    ch.style.display = 'block';
    ch.style.left = `${((p.x * 0.5 + 0.5) * innerWidth).toFixed(0)}px`;
    ch.style.top = `${((-p.y * 0.5 + 0.5) * innerHeight).toFixed(0)}px`;
  }
}
updateHud({ speedKmh: shot === 'cover' ? 111 : shot === 'shootout' ? 0 : 87, wanted: preset.wanted });

// map / title shots: the gameplay HUD stays hidden and the real
// game screen takes over — the full map/stats pause screen, or the
// title screen over the live dusk skyline. Never a mockup: both are
// live DOM in the game, drawn over the real 3D scene.
if (shot === 'map' || shot === 'title') {
  const hud = document.getElementById('hud');
  if (hud) hud.style.display = 'none';
  const ov = document.getElementById(shot === 'map' ? 'mapscreen' : 'titlescreen');
  if (ov) ov.style.display = 'block';
}
if (shot === 'title') {
  // the van parks right in front of the title camera (3.5, 22) — a
  // big dark blob in the bottom-left. Move it south, behind the
  // lens, so the foreground stays clean.
  const van = refs.traffic[5];
  van.position.set(3.5, 0, 60);
  van.rotation.y = Math.PI;
}
// title screen buttons: real handlers (CONTINUE dismisses, NEW GAME
// reloads, LOAD GAME loads the save, SETTINGS toasts — the screen is
// a live game screen, not a picture).
const tsC = document.getElementById('ts-continue');
if (tsC) tsC.addEventListener('click', () => {
  const ts = document.getElementById('titlescreen');
  if (ts) ts.style.display = 'none';
});
const tsN = document.getElementById('ts-new');
if (tsN) tsN.addEventListener('click', () => location.reload());
const tsL = document.getElementById('ts-load');
if (tsL) tsL.addEventListener('click', () => {
  if (game) { game.loadGame(); game.toast('Save loaded'); }
  const ts = document.getElementById('titlescreen');
  if (ts) ts.style.display = 'none';
});
const tsS = document.getElementById('ts-settings');
if (tsS) tsS.addEventListener('click', () => {
  const t = document.getElementById('toast');
  if (t) { t.textContent = 'SETTINGS — SOUND ON · MUSIC ON · QUALITY HIGH'; t.style.opacity = '1'; }
});

// ---- driving state ----
const drive = {
  speed: 0, // m/s
  heading: preset.heroRot,
  // chase cover: the hero's front wheels carry a touch of steering
  // angle (0.15 -> 3.6 deg) so he reads as driving, not parked
  steer: shot === 'cover' ? 0.15 : 0,
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
    // full map/stats pause screen (the old circular bigmap is gone)
    const bm = document.getElementById('mapscreen');
    if (bm) bm.style.display = bm.style.display === 'block' ? 'none' : 'block';
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
  // lives in the GLOW SHELLS only (hot 0.45..0.28, wash 0.18..0.10),
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
        // base opacities match the slim shells in cars.js (hot 0.45,
        // wash 0.18); the flash swings them up/down around those
        // values.
        const hot = on ? [0.50, 0.28] : [0.28, 0.50];
        const wash = on ? [0.22, 0.10] : [0.10, 0.22];
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
      // chase cover reads 111 KM/H (mid-drive); the shootout player
      // is ON FOOT, so it reads 0; the other shots 87
      updateHud({ speedKmh: shot === 'cover' ? 111 : shot === 'shootout' ? 0 : 87, wanted: preset.wanted });
    } else if (game) {
      const st = game.state;
      drawMinimap(mapCtx, st.pos.x, st.pos.z, -st.heading + Math.PI, {
        police: [[-3.4, -13], [3.6, -26], [-18, 60]],
      });
    }
    // full map/stats screen: redraw the big island map (rectangular,
    // not circular) while it is open — in the map shot and in free
    // mode when the player opens it with M.
    const ms = document.getElementById('mapscreen');
    const mc = document.getElementById('map-canvas');
    if (ms && mc && ms.style.display === 'block') {
      const px = isShot ? hero.position.x : (game ? game.state.pos.x : 0);
      const pz = isShot ? hero.position.z : (game ? game.state.pos.z : 0);
      const prot = isShot ? -drive.heading + Math.PI : (game ? -game.state.heading + Math.PI : 0);
      drawMinimap(mc.getContext('2d'), px, pz, prot, {
        rect: true,
        police: [[-3.4, -13], [3.6, -26], [-18, 60]],
      });
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
