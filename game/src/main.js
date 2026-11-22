// Coral Bay Heat — boot, render loop, driving and shot cameras.
// ?shot=cover|pier|beach|docks stages a fixed dossier shot;
// no query param = free driving with a chase camera.
import * as THREE from 'three';
import { buildCity } from './world.js';
import { initPortraits, drawMinimap, updateHud, renderHud } from './hud.js';
import { SHOTS, shotName } from './shots.js';
import { animateCrowd, makePerson, makeFallenPerson, makeShooter, makePoliceOfficer, makeTargetMarker } from './people.js';
import { makePoliceCar, makeBurningPoliceVan } from './cars.js';
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
  // FOUR cruisers + heli = the panel's "5 UNITS" (IBIS-43, TARPON-10,
  // HERON-19, EGRET-07 + HELI-2) — the count on screen now matches the
  // count in the CBPD RESPONSE panel. FIX ROUND 6 FOLLOW-UP (v15.3):
  // the cruisers are ALL AHEAD of the hero now. The old staging put
  // cop1 (z 11) closer to the lens than the hero (z 6), so the white
  // cruiser dominated the foreground and read as the player's car.
  // Now the hero (z 14) is the big foreground car and the chase reads
  // the right way round: two cruisers lead ahead of him (cop1 left
  // lane, cop3 his own lane — rears to the lens, POLICE placards +
  // light bars) and two come on as a roadblock (cop2, cop4 — fronts
  // to the lens, push bars + headlights).
  const cop1 = refs.traffic[0];
  cop1.position.set(-2.5, 0, 4);
  cop1.rotation.y = 0.08;
  // cop 3 leads in the hero's own lane, directly ahead of him: the
  // hero is right on his tail, so the chase reads as pursuit, not as
  // a lone car. traffic[7] (police3) is reused — its cross-street
  // default spot is never seen in the cover frame.
  const cop3 = refs.traffic[7];
  cop3.position.set(3.5, 0, -4);
  cop3.rotation.y = 0.05;
  // cop 2 comes on ahead in the left lane, facing south: the camera
  // sees its FRONT — push bar, headlights, hood POLICE and its light
  // bar, a roadblock closing on the hero from the front. At z -14
  // (not -6) it sits deeper in the frame, behind cop1, so the four
  // cruisers layer in depth instead of bunching.
  const cop2 = refs.traffic[1];
  cop2.position.set(-3, 0, -14);
  cop2.rotation.y = Math.PI + 0.1;
  // cop 4 is the second roadblock car, far ahead in the left lane,
  // front to the lens — the roadblock line runs into the distance
  // (civ2, taxi further on). Built fresh here, shot-only, and pushed
  // into refs.traffic so the animate loop pulses its light bar with
  // the other cruisers.
  const cop4 = makePoliceCar();
  cop4.position.set(-2.5, 0, -24);
  cop4.rotation.y = Math.PI + 0.1;
  scene.add(cop4);
  refs.traffic.push(cop4);
  // FIX ROUND 6 FOLLOW-UP (v15.3) — the heli searchlight is AIMED AT
  // THE HERO CAR: the beam lands on the red hero, not on empty road
  // or a cruiser, so the spotlight itself says which car is ours.
  // The aim is recomputed every frame in animate() (the heli bobs
  // ±0.5 m and drifts ±0.8 m, which would walk a fixed beam off the
  // car); here we only store the target and brighten the beam a
  // touch (0.16, was 0.10) so the long diagonal shaft reads.
  heli.userData.spotTarget = new THREE.Vector3(3.5, 1.0, 14);
  heli.userData.cone.material.opacity = 0.16;
  // FIX ROUND 6b: the cover is a POLICE CHASE at 111 KM/H with three
  // stars — but the static HUD panel still says M1 "STEAL THE MARINA
  // SEDAN / Reach the marina lot", a quiet theft, which contradicts
  // the picture (Karimbu's cover shows its chase mission, MISSION 6).
  // Stage the real chase mission frame instead: M4 LOSE THE HEAT is
  // the game's own police mission (startWanted 3, $2,000), so the
  // panel borrows it — same trick the shootout already uses. Shot-only
  // DOM staging; the free game's MISSIONS are untouched.
  {
    const setTxt = (id, txt) => { const el = document.getElementById(id); if (el) el.textContent = txt; };
    setTxt('m-kicker', 'MISSION M4 · LOSE THE HEAT');
    setTxt('m-title', 'BREAK LINE OF SIGHT');
    setTxt('m-stage', 'STAGE 1/2');
    setTxt('m-reward', '$2,000');
    setTxt('m-obj', 'Three stars and the whole of CBPD is on your tail — outrun the cruisers, break line of sight, and vanish before the roadblock closes.');
    setTxt('m-next', 'Outrun the cruisers · Lose the heat');
    setTxt('dlg-line', 'The whole bay is lit up behind you — shake them off before the roadblock, then disappear.');
  }
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
  // starburst core + warm halo, both additive billboards. FIX ROUND 6
  // (v15.2): SMALLER still (core 0.55, halo 0.9, was 0.7/1.1) — at
  // the new closer shootout distance the old flash was a 170 px disc
  // that swallowed the pistol; the gun must stay visible in the
  // player's hands, with the flash as a spark at its tip, not a sun.
  const core = new THREE.Sprite(new THREE.SpriteMaterial({
    map: muzzleFlashTexture(), transparent: true, opacity: 0.95,
    blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  core.scale.set(0.55, 0.55, 1);
  g.add(core);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({
    map: sunGlowTexture(), color: 0xff9d2e, transparent: true, opacity: 0.5,
    blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  halo.scale.set(0.9, 0.9, 1);
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
  // fix round 5 (v15.1): park the flash group 0.30 m PAST the muzzle
  // tip along the aim line (was 0.18), so the hottest core sits just
  // beyond the gun instead of dead-centred on the slide — the slide
  // then reads as a dark silhouette against the glow behind it, not
  // inside it. The pistol itself also renders over the bloom
  // (renderOrder 10 in people.js); the two together keep the flash
  // AND the gun.
  g.position.copy(from).addScaledVector(dir, 0.30);
  g.userData = { core, halo, tracer, phase };
  gunfire.push(g);
  return g;
}

// the aim point for the crosshair overlay (the officer's chest, in world
// space); projected to screen pixels once the shot camera is placed.
let shootoutAim = null;
if (shot === 'shootout') {
  // THE PLAYER, back to the camera, two-handed aim north-west across
  // the sand toward officer 1. FIX ROUND 6 FOLLOW-UP (Egi 16:41 +
  // 16:48 WIB): the player was losing to the officer — same size, so
  // at a glance nobody knew which figure was ours. Now he is the
  // UNMISTAKABLE PROTAGONIST: 1.3x hero scale like the fix-6 officer
  // (~2.2 m), moved to (22.5, 9.5) — 5.9 m from the lens, near the
  // CENTRE of the frame, ~280 px tall, red jacket dominant, back to
  // the camera. And he stands IN THE MIDDLE of the formation: the
  // officers form a HALF-CIRCLE around him (north-west, north,
  // north-east) — we are SURROUNDED, he is the one shooting out.
  // Faces officer 1 at (20, 4) from (22.5, 9.5), rot 0.42, so the
  // over-shoulder camera south-east of him sees his BACK and the gun
  // IN PROFILE — aiming across the frame, the pistol reads as a
  // weapon, not a dot. Red jacket (seed 7, the player's own seed).
  const player = makeShooter(7, { shirt: 0xd21f26 });
  player.scale.multiplyScalar(1.3);
  player.position.set(22.5, 0.04, 9.5);
  player.rotation.y = 0.42;
  scene.add(player);
  // THREE STANDING POLICE OFFICERS in a half-circle around the player
  // — the surround. Each is a 1.3x hero-scale makePoliceOfficer (the
  // uniform reads: POLICE patch, gold badge + cap band, duty belt,
  // white shirt V) and each faces the player, returning fire at him.
  // Officer 1 is the centre of the arc and the crosshair target.
  const officer1 = makePoliceOfficer(21);
  officer1.position.set(20, 0.04, 4);
  officer1.rotation.y = -2.72;
  scene.add(officer1);
  const officer2 = makePoliceOfficer(22);
  officer2.position.set(24, 0.04, 4);
  officer2.rotation.y = 2.88;
  scene.add(officer2);
  const officer3 = makePoliceOfficer(23);
  officer3.position.set(15, 0.04, 4.5);
  officer3.rotation.y = -2.16;
  scene.add(officer3);
  // RED TARGET MARKERS above every officer's head, GTA-style: a red
  // arrow/blip says "enemy / target" at a glance. Police = red
  // marker, the player = NO marker — he is the one shooting. Markers
  // sit ~0.55 m above the 1.3x officers' heads (y 2.72), added to the
  // scene (the staged figures are static, so no parenting needed).
  for (const [mx, mz] of [[20, 4], [24, 4], [15, 4.5]]) {
    const marker = makeTargetMarker();
    marker.position.set(mx, 2.72, mz);
    scene.add(marker);
  }
  // muzzle tips in world space (the gun tip anchors ride on the pistols)
  scene.updateMatrixWorld(true);
  const playerMuzzle = new THREE.Vector3();
  player.userData.muzzleTip.getWorldPosition(playerMuzzle);
  const muzzle1 = new THREE.Vector3();
  officer1.userData.muzzleTip.getWorldPosition(muzzle1);
  const muzzle2 = new THREE.Vector3();
  officer2.userData.muzzleTip.getWorldPosition(muzzle2);
  const muzzle3 = new THREE.Vector3();
  officer3.userData.muzzleTip.getWorldPosition(muzzle3);
  const officerChest = new THREE.Vector3(20, 1.6, 4);
  const playerChest = new THREE.Vector3(22.5, 1.63, 9.5);
  // player's flash at his own gun, officers' flashes at theirs — four
  // flashes, four tracers converging on the player, a real surround,
  // not a lone spark. Phases spread (0 / PI / PI/2 / 3PI/2) so the
  // flashes never pulse in sync.
  scene.add(makeGunfire(playerMuzzle, officerChest, 0));
  scene.add(makeGunfire(muzzle1, playerChest, Math.PI));
  scene.add(makeGunfire(muzzle2, playerChest, Math.PI / 2));
  scene.add(makeGunfire(muzzle3, playerChest, Math.PI * 1.5));
  // FIX ROUND 6b: the crosshair aims at officer 1's BELT (waist),
  // NOT his chest — the chest aim put the 46 px crosshair dead over
  // the POLICE patch and the gold badge, hiding the two markers the
  // whole uniform fix exists to show. The player's TRACER still runs
  // to the chest (officerChest above); only the crosshair drops.
  shootoutAim = new THREE.Vector3(20, 0.95, 4);
  // fallen POLICE OFFICER on the sand, broadside to the lens, OFF the
  // player–officer line: the old spot (19, 2) sat on the line from the
  // camera through the player to the officer, so the player's own body
  // hid it. FIX ROUND 6 (v15.2): at (17.5, 6.5) — closer to the lens
  // (10.9 m), 3.5 m left of the firing line, scaled 1.4x, with the
  // big blood system (main pool + smear + splatters + uniform blood,
  // see people.js) so the fallen officer AND the blood read at a
  // glance, not as a dark log on the sand.
  const fallen = makeFallenPerson(9, { police: true });
  fallen.scale.setScalar(1.4);
  fallen.position.set(17.5, 0.04, 6.5);
  fallen.rotation.y = 2.2;
  scene.add(fallen);
  // BEHIND the officers, the police cordon: 4 POLICE CARS + 1 BURNING
  // POLICE BOX VAN on the beach road (Egi 16:46–16:48 WIB) — the
  // depth order from the lens is player (front, biggest) -> officers
  // surrounding him -> cars + burning van behind them. The van is the
  // chaos anchor: flame cones + smoke column + scorch, mesh-only
  // (no sprites — sprites parented to a car never draw in this build).
  // Cars are the traffic pool's own police cars, repositioned
  // shot-only; the van and the 4th car are new builds pushed into
  // refs.traffic so their light bars pulse with the rest.
  const beachCop = refs.traffic[1];
  beachCop.position.set(4.5, 0, -14);
  beachCop.rotation.y = 0.3;
  const roadCop2 = refs.traffic[0];
  roadCop2.position.set(-2.5, 0, -20);
  roadCop2.rotation.y = 0.1;
  const roadCop3 = refs.traffic[7];
  roadCop3.position.set(3.5, 0, -26);
  roadCop3.rotation.y = 0.1;
  const roadCop4 = makePoliceCar();
  roadCop4.position.set(-3, 0, -32);
  roadCop4.rotation.y = Math.PI + 0.1;
  scene.add(roadCop4);
  refs.traffic.push(roadCop4);
  const burnVan = makeBurningPoliceVan();
  burnVan.position.set(6.5, 0, -18);
  burnVan.rotation.y = 0.4;
  scene.add(burnVan);
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

  // FIX ROUND 6 FOLLOW-UP (v15.3): aim the heli searchlight AT the
  // hero car. The heli bobs +/-0.5 m and drifts +/-0.8 m every frame
  // and sits rotated (rotation.y 0.5, scale 1.35), so a static cone
  // would sweep off the car — recompute the aim every frame: pod =
  // the cone apex in world space, dir = pod -> spotTarget, stretch
  // the cone to that length and rotate its local -Y axis onto dir.
  // Only the cover sets spotTarget; other shots keep the default cone.
  if (heli.userData.spotTarget) {
    heli.updateMatrixWorld(true);
    const cone = heli.userData.cone;
    const pod = heli.localToWorld(new THREE.Vector3(0, -0.7, -1.2));
    const target = heli.userData.spotTarget;
    const dir = target.clone().sub(pod);
    const len = dir.length();
    dir.normalize();
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, -1, 0), dir);
    const heliQ = new THREE.Quaternion();
    heli.getWorldQuaternion(heliQ);
    cone.quaternion.copy(heliQ.invert().multiply(q));
    cone.scale.set(1, len / (9 * heli.scale.y), 1);
    const mid = pod.clone().addScaledVector(dir, len / 2);
    cone.position.copy(heli.worldToLocal(mid));
  }

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
    // FIX ROUND 6 (v15.2): the pulse scales RELATIVE to the small
    // 0.55 base — the old absolute 1.15..1.6 undid the smaller flash
    // and re-swallowed the pistol every pulse.
    const s = 0.55 * (1.15 + 0.45 * f);
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
