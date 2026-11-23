// Coral Bay Heat — the game itself. One orchestrator that owns the
// renderer, the island, the hero car, the police, the story and the HUD,
// and wires the twelve specialist modules together. Everything the
// playtest and the screenshot harness touch hangs off `window.__GAME__`.
//
// Conventions: heading 0 = +z, forward = (sin h, 0, cos h). The road grid
// sits at x/z = -90, -45, 0, 45, 90. Game time runs `ff` times faster
// than real time (?ff=6 in the playtest) and the physics runs in fixed
// 0.05 s substeps so a slow SwiftShader frame never tunnels the car
// through a building or past a waypoint.
import * as THREE from 'three';
import { createRng, range, int, pick } from './rng.js';
import { DUSK } from './materials.js';
import { buildCity, BOUNDS, MARINA_EXIT } from './city.js';
import { makeHeroCar, makePoliceCar, makeTrafficCar, makeBoxVan } from './cars.js';
import { makePlayer, makeOfficer, makeTargetMarker, makePedestrian, animateWalk } from './people.js';
import { MISSIONS, MISSION_PAY, TOTAL_PAY, CBPD_UNITS, RADIO_STATIONS } from './missions.js';
import { Hud } from './hud.js';
import { makeHeli, updateHeli } from './heli.js';
import { Driver, shootStep } from './autopilot.js';
import { AudioEngine } from './audio.js';
import { saveGame, loadSave } from './save.js';
import { stageShot } from './shots.js';

const TAU = Math.PI * 2;
const STEP = 0.05; // physics substep, game seconds
const TAXI_RATE = 0.25; // dollars per metre driven with a fare
const RAM_DAMAGE = 3; // hp a cruiser deals when it clips the hero
const RAM_COOLDOWN = 5; // seconds between rams from the same cruiser

function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

function wrapAngle(a) {
  while (a > Math.PI) a -= TAU;
  while (a < -Math.PI) a += TAU;
  return a;
}

function dist2(ax, az, bx, bz) {
  const dx = ax - bx;
  const dz = az - bz;
  return dx * dx + dz * dz;
}

// A soft round shadow blob under a car or a person — cheap grounding so
// nothing floats on the road.
function makeShadowBlob(r) {
  const c = document.createElement('canvas');
  c.width = 64; c.height = 64;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(32, 32, 2, 32, 32, 30);
  grad.addColorStop(0, 'rgba(0,0,0,0.5)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(c);
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(r * 2, r * 2),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false })
  );
  m.rotation.x = -Math.PI / 2;
  m.position.y = 0.07;
  return m;
}

export class Game {
  constructor() {
    const params = new URLSearchParams(window.location.search);
    this.seed = Number(params.get('seed') || 1);
    this.ff = Number(params.get('ff') || 1) || 1;
    this.shot = params.get('shot');
    this.rng = createRng(this.seed);
    this.time = 0; // game clock, seconds
    this.driver = new Driver();
    this.autopilot = false;
    this.keys = {};
    this.audio = new AudioEngine();
    this.cameraMode = 'chase';
    this.taxiActive = false;
    this.waitTimer = 0;
    this.legTimer = 0;
    this.wantedTimer = 0;
    this.boostUntil = 0;
    this.shootRemaining = 0;
    this.officers = []; // {mesh, marker, x, z, dead}
    this.policeCars = []; // {mesh, unit, x, z, heading, speed, ramAt}
    this.traffic = []; // {mesh, axis, line, pos, dir, speed}
    this.peds = []; // {mesh, x, z, dir, speed}
    this.packageMarkers = [];
    this.collectSpots = [];
    this.burningVan = null;
    this.playerOnFoot = null;
    this.muzzle = null;
    this.tracer = null;
    this.tracerAt = 0;

    // The state the save file and the playtest read. Keep it a plain
    // object — save.js serialises it, status() reports it.
    this.state = {
      mission: 0,
      step: 0,
      cash: 0,
      health: 100,
      maxHealth: 100,
      armour: 0,
      topSpeed: 36,
      speed: 0,
      pos: { x: 0, z: -80 },
      heading: 0,
      weapons: [
        { name: 'FISTS', ammo: Infinity },
        { name: 'PISTOL', ammo: 60 },
        { name: 'SMG', ammo: 0 },
        { name: 'SHOTGUN', ammo: 12 },
      ],
      weaponIndex: 1,
      packages: 0,
      taxiEarned: 0,
      clockMinutes: 17 * 60 + 42,
      wanted: 0,
      mode: 'car',
      vehicle: 'CORAL GT',
      radio: 0,
      chosenBoat: 2,
      victory: false,
      failed: null,
      waypoint: null,
    };

    this.buildRenderer();
    this.buildWorld();
    this.buildActors();
    this.hud = new Hud(document);
    this.bindInput();
    this.startMission(0);
    this.pickBoatForDestination();

    window.__GAME__ = this;
    window.__HERO__ = this.hero;
    window.addEventListener('error', (e) => {
      window.__PAGEERROR__ = String(e.message || e.error || 'page error');
    });

    this.lastReal = performance.now();
    this.firstFrame = true;
    const loop = () => {
      requestAnimationFrame(loop);
      this.frame();
    };
    requestAnimationFrame(loop);
  }

  // --- renderer / sky / lights -------------------------------------------
  buildRenderer() {
    this.renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.domElement.id = 'game-canvas';
    document.getElementById('stage').appendChild(this.renderer.domElement);
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(DUSK.fog, 90, 430);
    this.camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 900);
    this.camera.position.set(0, 6, -95);

    // Dusk gradient dome: violet up top, ember low over the sea.
    const skyCanvas = document.createElement('canvas');
    skyCanvas.width = 4; skyCanvas.height = 256;
    const sg = skyCanvas.getContext('2d');
    const grad = sg.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0, '#2e1a5e');
    grad.addColorStop(0.40, '#b34a7d');
    grad.addColorStop(0.60, '#ff9a4d');
    grad.addColorStop(0.78, '#ff8a3c');
    grad.addColorStop(1, '#3a2038');
    sg.fillStyle = grad;
    sg.fillRect(0, 0, 4, 256);
    const skyTex = new THREE.CanvasTexture(skyCanvas);
    skyTex.colorSpace = THREE.SRGBColorSpace;
    const sky = new THREE.Mesh(
      new THREE.SphereGeometry(760, 24, 16),
      new THREE.MeshBasicMaterial({ map: skyTex, side: THREE.BackSide, fog: false })
    );
    this.scene.add(sky);

    // Warm low sun over the sea + a violet hemisphere so shadows stay soft.
    const hemi = new THREE.HemisphereLight(0x8a6ab8, 0x3a2a22, 1.2);
    this.scene.add(hemi);
    const sun = new THREE.DirectionalLight(0xffc07a, 1.9);
    sun.position.set(300, 60, -40);
    this.scene.add(sun);
    const fill = new THREE.AmbientLight(0x604a72, 0.7);
    this.scene.add(fill);
    // Warm bounce from the south-west — lifts the shadow sides the dusk
    // sun never reaches: the player's red jacket from behind, the hero
    // car's rear on the title screen, the south faces of the towers.
    const rim = new THREE.DirectionalLight(0xff9a6a, 0.6);
    rim.position.set(-80, 50, 200);
    this.scene.add(rim);
  }

  // --- static world --------------------------------------------------------
  buildWorld() {
    this.city = buildCity(this.scene, this.seed);
    this.colliders = this.city.colliders;
    this.boats = this.city.boats;
    this.sailboats = this.city.sailboats;
    // Muzzle flash + tracer, created once and reused by shoot(). The
    // tracer is a thin glowing BOX, not a 1 px line — a line is invisible
    // at 720p against the bright sand, a box reads as a tracer beam.
    this.muzzle = new THREE.Mesh(
      new THREE.SphereGeometry(0.22, 8, 6),
      new THREE.MeshBasicMaterial({ color: 0xffe14d, transparent: true, opacity: 0 })
    );
    this.scene.add(this.muzzle);
    this.tracer = new THREE.Mesh(
      new THREE.BoxGeometry(0.07, 0.07, 1),
      new THREE.MeshBasicMaterial({ color: 0xffe14d, transparent: true, opacity: 0 })
    );
    this.scene.add(this.tracer);
  }

  // Aim the tracer beam from `from` to `to` and light it. The box's
  // length axis is Z; lookAt points it at the target, scale.z stretches
  // it to the full length.
  aimTracer(from, to, opacity = 0.85) {
    const dir = to.clone().sub(from);
    const len = dir.length();
    this.tracer.position.copy(from.clone().add(to).multiplyScalar(0.5));
    this.tracer.lookAt(to.x, to.y, to.z);
    this.tracer.scale.set(1, 1, len);
    this.tracer.material.opacity = opacity;
    this.tracerAt = this.time;
  }

  // --- actors ---------------------------------------------------------------
  buildActors() {
    // The hero: vivid orange, biggest thing in the cover shot.
    this.hero = makeHeroCar();
    this.heroShadow = makeShadowBlob(2.6);
    this.scene.add(this.hero);
    this.scene.add(this.heroShadow);

    // The helicopter, parked out of sight until the heat is on.
    this.heli = makeHeli();
    this.scene.add(this.heli);
    this.scene.add(this.heli.userData.pool);
    this.heli.visible = false;
    this.heli.userData.pool.visible = false;

    // On-foot player, hidden while driving.
    this.playerOnFoot = makePlayer();
    this.playerOnFoot.visible = false;
    this.playerOnFoot.add(makeShadowBlob(0.9));
    this.scene.add(this.playerOnFoot);

    // Traffic: six sedans cruising the grid, visual only — they never
    // block the hero, so the autopilot and the taxi run never stall.
    const trafficCols = [0x4f9ac9, 0xe8e2d4, 0x7ac98a, 0xc94f4f, 0xf2c14e, 0x9a6ac9];
    for (let i = 0; i < 6; i++) {
      const mesh = makeTrafficCar(trafficCols[i % trafficCols.length]);
      const axis = i % 2 === 0 ? 'x' : 'z';
      const line = [-90, -45, 0, 45, 90][i % 5];
      const dir = i % 4 < 2 ? 1 : -1;
      this.traffic.push({ mesh, axis, line, pos: range(this.rng, -100, 100), dir, speed: range(this.rng, 11, 17) });
      this.scene.add(mesh);
    }

    // Pedestrians on the sidewalks, one per road side, walking both ways.
    for (let i = 0; i < 10; i++) {
      const mesh = makePedestrian(this.rng);
      const along = i % 2 === 0;
      const line = [-90, -45, 0, 45, 90][int(this.rng, 0, 4)];
      const off = (i % 3 === 0 ? -1 : 1) * 6.5;
      const x = along ? line + off : range(this.rng, -100, 100);
      const z = along ? range(this.rng, -100, 100) : line + off;
      this.peds.push({ mesh, x, z, along, dir: this.rng() < 0.5 ? 1 : -1, speed: range(this.rng, 1.2, 2.2) });
      mesh.position.set(x, 0, z);
      mesh.rotation.y = along ? (this.rng() < 0.5 ? 0 : Math.PI) : (this.rng() < 0.5 ? Math.PI / 2 : -Math.PI / 2);
      this.scene.add(mesh);
    }
  }

  // --- input -----------------------------------------------------------------
  bindInput() {
    window.addEventListener('keydown', (e) => {
      this.keys[e.code] = true;
      this.audio.ensure();
      if (e.code === 'Digit1') this.selectWeapon(0);
      if (e.code === 'Digit2') this.selectWeapon(1);
      if (e.code === 'Digit3') this.selectWeapon(2);
      if (e.code === 'Digit4') this.selectWeapon(3);
      if (e.code === 'KeyF') this.shoot();
      if (e.code === 'KeyE') this.toggleOnFoot();
      if (e.code === 'KeyR') this.nextRadio();
      if (e.code === 'Escape') this.setScreen(this.screenName === 'map' ? null : 'map');
    });
    window.addEventListener('keyup', (e) => { this.keys[e.code] = false; });
    window.addEventListener('mousedown', () => {
      this.audio.ensure();
      if (this.state.mode === 'onfoot') this.shoot();
    });
  }

  // --- public state ---------------------------------------------------------
  // What the playtest reads: one plain object, live.
  status() {
    const s = this.state;
    const m = MISSIONS[s.mission];
    const leg = m ? m.legs[s.step] : null;
    return {
      mission: s.mission,
      missionId: m ? 'M' + m.id : 'M1',
      title: m ? m.title : '',
      step: s.step,
      stepText: leg ? leg.text : '',
      cash: Math.round(s.cash),
      wanted: s.wanted,
      health: Math.round(s.health),
      maxHealth: s.maxHealth,
      topSpeed: s.topSpeed,
      speed: s.speed,
      pos: { x: Math.round(s.pos.x * 10) / 10, z: Math.round(s.pos.z * 10) / 10 },
      mode: s.mode,
      vehicle: s.vehicle,
      victory: s.victory,
      failed: s.failed,
      taxiEarned: Math.round(s.taxiEarned * 100) / 100,
      packages: s.packages,
      weapons: s.weapons.map((w) => ({ name: w.name, ammo: w.ammo })),
      weaponIndex: s.weaponIndex,
      radio: RADIO_STATIONS[s.radio],
      police: this.policeCars.map((p) => {
        const d = Math.round(Math.hypot(p.x - s.pos.x, p.z - s.pos.z));
        return `${p.unit} ${d}m`;
      }),
    };
  }

  // --- placement / cameras / screens ---------------------------------------
  placeHero(x, z, heading) {
    const s = this.state;
    s.pos.x = x; s.pos.z = z;
    if (heading !== undefined) s.heading = heading;
    s.speed = 0;
    this.syncHeroMesh();
  }

  teleport(x, z, heading) {
    this.placeHero(x, z, heading);
  }

  setSpeed(v) {
    this.state.speed = v;
  }

  setCamera(name) {
    this.cameraMode = name;
  }

  setScreen(name) {
    this.screenName = name || null;
    this.hud.showScreen(this.screenName);
  }

  // Four cruisers fanned out AHEAD of the hero for the cover chase —
  // the hero leads, biggest and closest, the cruisers smaller up the road.
  placePoliceChase() {
    this.clearPolice();
    const s = this.state;
    const fwd = { x: Math.sin(s.heading), z: Math.cos(s.heading) };
    const side = { x: Math.cos(s.heading), z: -Math.sin(s.heading) };
    const spots = [
      { bx: 10, sx: -6 }, { bx: 13, sx: 4 }, { bx: 17, sx: -2 }, { bx: 20, sx: 5 },
    ];
    spots.forEach((sp, i) => {
      const p = this.spawnPolice(
        s.pos.x + fwd.x * sp.bx + side.x * sp.sx,
        s.pos.z + fwd.z * sp.bx + side.z * sp.sx,
        CBPD_UNITS[i % CBPD_UNITS.length]
      );
      p.staged = true; // staged for the shot: drives on, never rams
      p.ramAt = Infinity;
      p.heading = s.heading;
    });
  }

  // --- wanted / police --------------------------------------------------------
  setWanted(n) {
    const s = this.state;
    s.wanted = clamp(Math.round(n), 0, 5);
    this.wantedTimer = 0;
    const want = s.wanted >= 1 ? Math.min(4, s.wanted + 1) : 0;
    while (this.policeCars.length > want) this.removePolice(this.policeCars.length - 1);
    while (this.policeCars.length < want) {
      const a = this.rng() * TAU;
      this.spawnPolice(s.pos.x + Math.cos(a) * 26, s.pos.z + Math.sin(a) * 26, CBPD_UNITS[this.policeCars.length % CBPD_UNITS.length]);
    }
  }

  spawnPolice(x, z, unit) {
    const mesh = makePoliceCar();
    mesh.position.set(x, 0, z);
    this.scene.add(mesh);
    const p = { mesh, unit, x, z, heading: 0, speed: 0, ramAt: -99, staged: false };
    this.policeCars.push(p);
    return p;
  }

  removePolice(i) {
    const p = this.policeCars[i];
    if (!p) return;
    this.scene.remove(p.mesh);
    this.policeCars.splice(i, 1);
  }

  clearPolice() {
    while (this.policeCars.length) this.removePolice(0);
  }

  // --- economy / shops ---------------------------------------------------------
  buyWeapon(name) {
    const s = this.state;
    const map = { pistol: 1, smg: 2, shotgun: 3 };
    const idx = map[String(name || '').toLowerCase()];
    if (idx === undefined) return { ok: false };
    const add = { 1: 60, 2: 120, 3: 12 }[idx];
    const cost = { 1: 200, 2: 300, 3: 150 }[idx];
    if (s.cash >= cost) s.cash -= cost;
    s.weapons[idx].ammo += add;
    return { ok: true };
  }

  buyUpgrade(name) {
    const s = this.state;
    if (name === 'speed') {
      if (s.cash >= 1500) s.cash -= 1500;
      s.topSpeed = 42;
      return { ok: true };
    }
    if (name === 'health') {
      if (s.cash >= 1000) s.cash -= 1000;
      s.maxHealth = 120;
      s.health = 120;
      return { ok: true };
    }
    return { ok: false };
  }

  setCash(n) {
    this.state.cash = n;
  }

  // --- taxi ---------------------------------------------------------------------
  startTaxi() {
    this.taxiActive = true;
    this.state.taxiEarned = 0;
    this.hud.setDialogue('Taxi: \"Where to, boss? The meter is running.\"');
  }

  exitTaxi() {
    this.taxiActive = false;
  }

  // --- radio / crew ---------------------------------------------------------------
  nextRadio() {
    this.state.radio = (this.state.radio + 1) % RADIO_STATIONS.length;
    this.audio.nextStation();
    return RADIO_STATIONS[this.state.radio];
  }

  useCrew(name) {
    const s = this.state;
    if (name === 'lio') {
      s.health = s.maxHealth;
      this.hud.setDialogue('Lio: \"Good as new. Try not to bend it again.\"');
    } else if (name === 'mira') {
      this.boostUntil = this.time + 20;
      this.hud.setDialogue('Mira: \"Floor it — I\'ve got the wheel.\"');
    } else if (name === 'kiki') {
      s.wanted = 0;
      this.clearPolice();
      this.hud.setDialogue('Kiki: \"Heat\'s off. They lost you in the marina.\"');
    }
    return { ok: true };
  }

  // --- damage / fail / retry ---------------------------------------------------------
  damage(n) {
    const s = this.state;
    if (s.failed || s.victory) return;
    s.health -= n;
    if (s.health <= 0) {
      s.health = 0;
      s.failed = 'wrecked';
      this.autopilot = false;
      this.hud.setFail('wrecked');
    }
  }

  retry() {
    const s = this.state;
    s.failed = null;
    s.health = s.maxHealth;
    s.speed = 0;
    s.wanted = 0;
    this.clearPolice();
    this.setScreen(null);
    if (s.mode === 'onfoot') this.enterCar(true);
    const m = MISSIONS[s.mission];
    if (m) this.placeHero(m.start.x, m.start.z, m.start.heading);
  }

  // --- save / load ----------------------------------------------------------------------
  saveGame() {
    return saveGame(1, this.state);
  }

  loadGame() {
    const data = loadSave(1);
    if (!data) return false;
    const s = this.state;
    s.mission = data.mission;
    s.cash = data.cash;
    s.health = data.health;
    s.maxHealth = data.maxHealth;
    s.topSpeed = data.topSpeed;
    s.pos.x = data.pos.x; s.pos.z = data.pos.z;
    s.heading = data.heading;
    s.weapons = data.weapons.map((w) => ({ name: w.name, ammo: w.ammo === -1 ? Infinity : w.ammo }));
    s.weaponIndex = data.weaponIndex;
    s.packages = data.packages;
    s.taxiEarned = data.taxiEarned;
    s.clockMinutes = data.clockMinutes;
    s.failed = null;
    s.victory = false;
    this.clearPolice();
    this.setScreen(null);
    this.setupLeg();
    this.syncHeroMesh();
    return true;
  }

  // --- boats -------------------------------------------------------------------------------
  pickBoatForDestination() {
    let best = 0;
    let bd = Infinity;
    this.boats.forEach((b, i) => {
      const d = dist2(b.x, b.z, MARINA_EXIT.x, MARINA_EXIT.z);
      if (d < bd) { bd = d; best = i; }
    });
    this.state.chosenBoat = best;
    return best;
  }

  // --- missions (control) -----------------------------------------------------------------------
  setMission(i) {
    const idx = clamp(Math.round(i), 0, MISSIONS.length - 1);
    this.startMission(idx);
  }

  // Jump to one leg inside the current mission (the shootout shot stages
  // M4's shoot leg directly).
  setLeg(i) {
    const m = MISSIONS[this.state.mission];
    if (!m) return;
    this.state.step = clamp(Math.round(i), 0, m.legs.length - 1);
    this.setupLeg();
  }

  setAutopilot(on) {
    this.autopilot = !!on;
    if (!on) this.driver.target = null;
  }

  // --- mission engine ---------------------------------------------------------------
  startMission(i) {
    const s = this.state;
    s.mission = i;
    s.step = 0;
    s.failed = null;
    const m = MISSIONS[i];
    if (i === 2) s.packages = 0; // FOUR PACKAGES counts from zero
    if (s.mode === 'onfoot') this.enterCar(true);
    this.placeHero(m.start.x, m.start.z, m.start.heading);
    this.hud.setDialogue(m.brief);
    this.setupLeg();
  }

  currentLeg() {
    const m = MISSIONS[this.state.mission];
    return m ? m.legs[this.state.step] : null;
  }

  setupLeg() {
    const s = this.state;
    const leg = this.currentLeg();
    this.waitTimer = 0;
    this.legTimer = 0;
    this.clearPackageMarkers();
    if (!leg) return;
    s.waypoint = leg.at ? { x: leg.at.x, z: leg.at.z } : null;
    if (leg.kind === 'collect') {
      this.collectSpots = leg.spots.map((p) => ({ x: p.x, z: p.z, taken: false }));
      for (const p of this.collectSpots) {
        const marker = new THREE.Mesh(
          new THREE.BoxGeometry(1.1, 1.1, 1.1),
          new THREE.MeshBasicMaterial({ color: 0xffc93c })
        );
        marker.position.set(p.x, 0.9, p.z);
        marker.userData.spin = true;
        this.scene.add(marker);
        this.packageMarkers.push(marker);
      }
    }
    if (leg.kind === 'shoot') {
      this.spawnShootout(leg.at.x, leg.at.z);
      this.setWanted(3);
    }
    if (leg.kind === 'enterCar') {
      this.legTimer = 0;
    }
    if (this.autopilot) this.aimAutopilot();
  }

  clearPackageMarkers() {
    for (const m of this.packageMarkers) this.scene.remove(m);
    this.packageMarkers = [];
  }

  advanceLeg() {
    const s = this.state;
    const m = MISSIONS[s.mission];
    s.step += 1;
    if (s.step >= m.legs.length) {
      this.completeMission();
      return;
    }
    this.setupLeg();
  }

  completeMission() {
    const s = this.state;
    const pay = MISSION_PAY[s.mission];
    s.cash += pay;
    this.hud.setDialogue(`Mara Voss: "Job done. +$${pay.toLocaleString('en-US')} — the city is starting to notice you."`);
    if (s.mission >= MISSIONS.length - 1) {
      s.victory = true;
      this.autopilot = false;
      this.setScreen('victory');
      return;
    }
    this.startMission(s.mission + 1);
  }

  // Aim the autopilot at whatever the current leg needs.
  aimAutopilot() {
    const s = this.state;
    const leg = this.currentLeg();
    if (!leg) return;
    if (leg.kind === 'drive') {
      this.driver.driveTo(leg.at.x, leg.at.z, { x: s.pos.x, z: s.pos.z });
    } else if (leg.kind === 'collect') {
      const next = this.collectSpots.find((p) => !p.taken);
      if (next) this.driver.driveTo(next.x, next.z, { x: s.pos.x, z: s.pos.z });
    }
  }

  // --- on-foot combat -----------------------------------------------------------------
  // The M4 beach stand-off: three standing officers with red markers, one
  // fallen officer with a blood pool, and the burning van close behind.
  // Staged east of the last tower row so no building wall crowds the shot.
  spawnShootout(x, z) {
    this.clearOfficers();
    this.enterFoot(true);
    this.playerOnFoot.position.set(x + 4, 0, z - 4);
    this.playerOnFoot.rotation.y = 1.49;
    // Officers close to the player — big in frame, red markers on top —
    // not distant specks on the sand.
    const spots = [
      { x: x + 11, z: z - 7 },
      { x: x + 12, z: z - 1 },
      { x: x + 10, z: z + 3 },
    ];
    for (const sp of spots) {
      const mesh = makeOfficer(true);
      mesh.position.set(sp.x, 0, sp.z);
      mesh.rotation.y = Math.atan2(this.playerOnFoot.position.x - sp.x, this.playerOnFoot.position.z - sp.z);
      const marker = makeTargetMarker();
      marker.position.set(sp.x, 2.6, sp.z);
      this.scene.add(mesh);
      this.scene.add(marker);
      this.officers.push({ mesh, marker, x: sp.x, z: sp.z, dead: false });
    }
    const fallen = makeOfficer(false);
    fallen.position.set(x + 8, 0.32, z + 2);
    fallen.rotation.y = 0.6;
    this.scene.add(fallen);
    this.officers.push({ mesh: fallen, marker: null, x: x + 8, z: z + 2, dead: true });
    // Bystanders watching the stand-off from behind the officers — the
    // crowd the shot needs, colourful shirts against the sand.
    const crowdSpots = [
      { x: x + 19, z: z - 8 }, { x: x + 21, z: z + 3 },
      { x: x + 18, z: z + 10 }, { x: x + 23, z: z - 2 },
    ];
    this.shootoutCrowd = [];
    for (const sp of crowdSpots) {
      const ped = makePedestrian(this.rng);
      ped.position.set(sp.x, 0, sp.z);
      ped.rotation.y = Math.atan2(this.playerOnFoot.position.x - sp.x, this.playerOnFoot.position.z - sp.z);
      this.scene.add(ped);
      this.shootoutCrowd.push(ped);
    }
    this.shootRemaining = 3;
    if (!this.burningVan) {
      this.burningVan = makeBoxVan(true);
      this.scene.add(this.burningVan);
    }
    this.burningVan.position.set(x + 15, 0, z + 6);
    this.burningVan.rotation.y = -0.4;
    this.burningVan.visible = true;
  }

  clearOfficers() {
    for (const o of this.officers) {
      this.scene.remove(o.mesh);
      if (o.marker) this.scene.remove(o.marker);
    }
    this.officers = [];
    for (const ped of this.shootoutCrowd || []) this.scene.remove(ped);
    this.shootoutCrowd = [];
    if (this.burningVan) this.burningVan.visible = false;
  }

  // Stage a frozen tracer for the shootout screenshot: the gun to the
  // nearest standing officer, held (tracerAt = Infinity) so the game
  // loop's 0.08 s fade never fires. Only called from stageShootout;
  // a real shot later resets tracerAt and fades normally.
  stageTracer() {
    if (!this.officers.length || !this.tracer) return;
    let best = null, bd = Infinity;
    for (const o of this.officers) {
      if (o.dead) continue;
      const d = Math.hypot(o.x - this.playerOnFoot.position.x, o.z - this.playerOnFoot.position.z);
      if (d < bd) { bd = d; best = o; }
    }
    if (!best) return;
    this.aimTracer(
      new THREE.Vector3(this.playerOnFoot.position.x, 1.2, this.playerOnFoot.position.z),
      new THREE.Vector3(best.x, 1.2, best.z)
    );
    this.tracerAt = Infinity; // hold the beam for the screenshot
  }

  // Stage the shootout for the screenshot: same cast, arranged for the
  // camera, without touching mission state.
  startShootoutStaging() {
    this.spawnShootout(120, 20);
    this.setWanted(3);
    this.state.mode = 'onfoot';
    this.hero.visible = false;
  }

  enterFoot(silent) {
    const s = this.state;
    if (s.mode === 'onfoot') return;
    s.mode = 'onfoot';
    s.speed = 0;
    this.hero.visible = false;
    this.playerOnFoot.visible = true;
    this.playerOnFoot.position.set(s.pos.x, 0, s.pos.z);
    this.playerOnFoot.rotation.y = s.heading;
    if (!silent) this.hud.setDialogue('On foot. Watch the markers — red means CBPD.');
  }

  enterCar(silent) {
    const s = this.state;
    if (s.mode === 'car') return;
    s.mode = 'car';
    s.pos.x = this.playerOnFoot.position.x;
    s.pos.z = this.playerOnFoot.position.z;
    s.heading = this.playerOnFoot.rotation.y;
    s.speed = 0;
    this.playerOnFoot.visible = false;
    this.hero.visible = true;
    this.syncHeroMesh();
    if (!silent) this.hud.setDialogue('Back behind the wheel.');
  }

  toggleOnFoot() {
    if (this.state.failed || this.state.victory) return;
    if (this.state.mode === 'car') this.enterFoot(false);
    else this.enterCar(false);
  }

  selectWeapon(i) {
    const s = this.state;
    if (i >= 0 && i < s.weapons.length) s.weaponIndex = i;
  }

  shoot() {
    const s = this.state;
    if (s.failed || s.victory) return;
    const w = s.weapons[s.weaponIndex];
    if (!w || w.name === 'FISTS') return;
    if (w.ammo <= 0) return;
    w.ammo -= 1;
    this.audio.gunshot();
    // Muzzle flash at the gun + a tracer to the aim point.
    const origin = s.mode === 'onfoot'
      ? new THREE.Vector3(this.playerOnFoot.position.x, 1.2, this.playerOnFoot.position.z)
      : new THREE.Vector3(s.pos.x, 1.1, s.pos.z);
    const dir = s.mode === 'onfoot'
      ? new THREE.Vector3(Math.sin(this.playerOnFoot.rotation.y), 0, Math.cos(this.playerOnFoot.rotation.y))
      : new THREE.Vector3(Math.sin(s.heading), 0, Math.cos(s.heading));
    const end = origin.clone().add(dir.clone().multiplyScalar(26));
    this.muzzle.position.copy(origin.clone().add(dir.clone().multiplyScalar(0.7)));
    this.muzzle.material.opacity = 0.95;
    this.aimTracer(origin, end);
    // On foot, a shot drops the nearest living officer in range.
    if (s.mode === 'onfoot') {
      let best = null;
      let bd = 45 * 45;
      for (const o of this.officers) {
        if (o.dead) continue;
        const d = dist2(o.x, o.z, this.playerOnFoot.position.x, this.playerOnFoot.position.z);
        if (d < bd) { bd = d; best = o; }
      }
      if (best) {
        best.dead = true;
        best.mesh.rotation.x = -Math.PI / 2 + 0.08;
        best.mesh.position.y = 0.32;
        if (best.marker) best.marker.visible = false;
        this.shootRemaining = Math.max(0, this.shootRemaining - 1);
      }
    }
  }

  // --- per-frame ---------------------------------------------------------------
  frame() {
    const now = performance.now();
    let realDt = (now - this.lastReal) / 1000;
    this.lastReal = now;
    if (realDt > 0.5) realDt = 0.5;
    if (realDt < 0) realDt = 0;
    let gameDt = realDt * this.ff;
    // Fixed substeps: physics, missions and police stay stable no matter
    // how slow the renderer is.
    while (gameDt > 0) {
      const dt = Math.min(gameDt, STEP);
      this.step(dt);
      gameDt -= dt;
    }
    this.updateCamera();
    this.updateHud();
    this.audio.setEngine(this.state.speed, this.state.mode === 'onfoot');
    this.audio.setRadioOn(true);
    this.renderer.render(this.scene, this.camera);
    if (this.firstFrame) {
      this.firstFrame = false;
      if (this.shot) stageShot(this, this.shot);
      window.__READY__ = true;
    }
  }

  step(dt) {
    const s = this.state;
    this.time += dt;
    s.clockMinutes += dt / 60;
    if (this.muzzle.material.opacity > 0) this.muzzle.material.opacity = Math.max(0, this.muzzle.material.opacity - dt * 8);
    if (this.tracer.material.opacity > 0 && this.time - this.tracerAt > 0.08) this.tracer.material.opacity = 0;

    if (!s.failed && !s.victory) {
      if (s.mode === 'car') this.stepDriving(dt);
      else this.stepOnFoot(dt);
      this.stepMission(dt);
      this.stepWanted(dt);
    }
    this.stepPolice(dt);
    this.stepTraffic(dt);
    this.stepPeds(dt);
    this.stepAmbient(dt);
  }

  // --- driving ---------------------------------------------------------------------
  stepDriving(dt) {
    const s = this.state;
    let throttle = 0, brake = 0, steer = 0, reverse = false;
    if (this.autopilot) {
      const leg = this.currentLeg();
      if (leg && (leg.kind === 'drive' || leg.kind === 'collect')) {
        if (!this.driver.target) this.aimAutopilot();
        const inp = this.driver.update({ x: s.pos.x, z: s.pos.z, heading: s.heading, speed: s.speed }, dt);
        throttle = inp.throttle; brake = inp.brake; steer = inp.steer; reverse = !!inp.reverse;
      } else if (leg) {
        // Wait legs (M7's dockyard hold): brake to a stop instead of
        // coasting — the car used to roll 15 m past the gate to the
        // south bound during the 3 s wait, then had to turn 180 degrees
        // at the bound to start the next leg.
        brake = 1;
      }
    } else {
      if (this.keys['KeyW'] || this.keys['ArrowUp']) throttle = 1;
      if (this.keys['KeyS'] || this.keys['ArrowDown']) brake = 1;
      if (this.keys['KeyA'] || this.keys['ArrowLeft']) steer = 1;
      if (this.keys['KeyD'] || this.keys['ArrowRight']) steer = -1;
    }
    const top = s.topSpeed + (this.boostUntil > this.time ? 6 : 0);
    if (reverse) {
      s.speed = Math.max(s.speed - 9 * dt, -10);
    } else if (throttle > 0) {
      s.speed = Math.min(s.speed + 14 * throttle * dt, top);
    } else if (brake > 0) {
      if (s.speed > 0.5) s.speed = Math.max(0, s.speed - 26 * dt);
      else s.speed = Math.max(s.speed - 8 * dt, -10);
    } else {
      // Coast down gently.
      if (s.speed > 0) s.speed = Math.max(0, s.speed - 3 * dt);
      else if (s.speed < 0) s.speed = Math.min(0, s.speed + 3 * dt);
    }
    if (steer !== 0 && Math.abs(s.speed) > 0.2) {
      s.heading += steer * 1.7 * dt * clamp(Math.abs(s.speed) / 6, 0, 1) * (s.speed >= 0 ? 1 : -1);
    }
    const fx = Math.sin(s.heading);
    const fz = Math.cos(s.heading);
    const ox = s.pos.x, oz = s.pos.z;
    let nx = ox + fx * s.speed * dt;
    let nz = oz + fz * s.speed * dt;
    // Colliders: try the full move, then x-only, then z-only, so the car
    // slides along a building face instead of sticking to it. The speed
    // is NOT damped on a hit — the speedo stays honest (the wheels check
    // reads it) and the autopilot's stuck detection reads actual
    // movement, not the speedo.
    if (this.hitsCollider(nx, nz)) {
      if (!this.hitsCollider(nx, oz)) { nz = oz; }
      else if (!this.hitsCollider(ox, nz)) { nx = ox; }
      else { nx = ox; nz = oz; }
    }
    nx = clamp(nx, BOUNDS.minX, BOUNDS.maxX);
    nz = clamp(nz, BOUNDS.minZ, BOUNDS.maxZ);
    const moved = Math.hypot(nx - ox, nz - oz);
    s.pos.x = nx; s.pos.z = nz;
    for (const w of this.hero.userData.wheels) w.rotation.x += (s.speed * dt) / 0.35;
    if (this.taxiActive && moved > 0) {
      const fare = moved * TAXI_RATE;
      s.taxiEarned += fare;
      s.cash += fare;
    }
    this.syncHeroMesh();
  }

  hitsCollider(x, z) {
    for (const c of this.colliders) {
      if (Math.abs(x - c.x) < c.hx + 1.3 && Math.abs(z - c.z) < c.hz + 1.3) return true;
    }
    return false;
  }

  syncHeroMesh() {
    const s = this.state;
    this.hero.position.set(s.pos.x, 0, s.pos.z);
    this.hero.rotation.y = s.heading;
    this.heroShadow.position.set(s.pos.x, 0.08, s.pos.z);
  }

  // --- on foot ----------------------------------------------------------------------
  stepOnFoot(dt) {
    const s = this.state;
    const p = this.playerOnFoot;
    const leg = this.currentLeg();
    if (this.autopilot && leg && leg.kind === 'shoot') {
      const res = shootStep(
        { x: p.position.x, z: p.position.z },
        this.officers.filter((o) => !o.dead).map((o) => ({ x: o.x, z: o.z, dead: o.dead })),
        leg.at, dt
      );
      if (res.move.x !== 0 || res.move.z !== 0) {
        p.position.x += res.move.x * 5 * dt;
        p.position.z += res.move.z * 5 * dt;
        p.rotation.y = Math.atan2(res.move.x, res.move.z);
        animateWalk(p, dt, 1);
      }
      if (res.fire && this.time - (this.lastShotAt || -99) > 0.6) {
        this.lastShotAt = this.time;
        this.shoot();
      }
      return;
    }
    // Human on foot: W/S walk, A/D turn.
    let move = 0, turn = 0;
    if (this.keys['KeyW'] || this.keys['ArrowUp']) move = 1;
    if (this.keys['KeyS'] || this.keys['ArrowDown']) move = -0.6;
    if (this.keys['KeyA'] || this.keys['ArrowLeft']) turn = 1;
    if (this.keys['KeyD'] || this.keys['ArrowRight']) turn = -1;
    if (turn !== 0) p.rotation.y += turn * 2.4 * dt;
    if (move !== 0) {
      p.position.x += Math.sin(p.rotation.y) * 5 * move * dt;
      p.position.z += Math.cos(p.rotation.y) * 5 * move * dt;
      animateWalk(p, dt, 1);
    }
    s.pos.x = p.position.x;
    s.pos.z = p.position.z;
  }

  // --- mission legs ---------------------------------------------------------------------
  stepMission(dt) {
    const s = this.state;
    const leg = this.currentLeg();
    if (!leg) return;
    if (leg.kind === 'drive') {
      const d = Math.hypot(s.pos.x - leg.at.x, s.pos.z - leg.at.z);
      if (d < 4 || (this.autopilot && this.driver.done)) this.advanceLeg();
    } else if (leg.kind === 'wait') {
      this.waitTimer += dt;
      if (this.waitTimer >= leg.seconds) this.advanceLeg();
    } else if (leg.kind === 'collect') {
      let changed = false;
      this.collectSpots.forEach((p, i) => {
        if (p.taken) return;
        if (Math.hypot(s.pos.x - p.x, s.pos.z - p.z) < 4.5) {
          p.taken = true;
          s.packages += 1;
          const marker = this.packageMarkers[i];
          if (marker) marker.visible = false;
          changed = true;
        }
      });
      if (changed && this.autopilot) this.aimAutopilot();
      if (this.collectSpots.every((p) => p.taken)) this.advanceLeg();
    } else if (leg.kind === 'shoot') {
      if (this.shootRemaining <= 0) this.advanceLeg();
    } else if (leg.kind === 'enterCar') {
      if (s.mode === 'onfoot') this.enterCar(true);
      this.legTimer += dt;
      if (this.legTimer > 1.0) this.advanceLeg();
    } else if (leg.kind === 'victory') {
      this.advanceLeg();
    }
  }

  stepWanted(dt) {
    const s = this.state;
    if (s.wanted <= 0) return;
    this.wantedTimer += dt;
    if (this.wantedTimer > 15) {
      this.wantedTimer = 0;
      this.setWanted(s.wanted - 1);
    }
  }

  // --- police / traffic / peds / ambient -----------------------------------------------------
  stepPolice(dt) {
    const s = this.state;
    for (const p of this.policeCars) {
      if (p.staged) {
        // Staged for the cover shot: hold formation AHEAD of the hero
        // at exactly the hero's speed, so the hero never outruns them
        // and they never fall back between the camera and the hero.
        p.speed = s.speed;
        p.x += Math.sin(p.heading) * p.speed * dt;
        p.z += Math.cos(p.heading) * p.speed * dt;
        p.mesh.position.set(p.x, 0, p.z);
        p.mesh.rotation.y = p.heading;
        for (const w of p.mesh.userData.wheels) w.rotation.x += (p.speed * dt) / 0.35;
        continue;
      }
      const dx = s.pos.x - p.x;
      const dz = s.pos.z - p.z;
      const d = Math.hypot(dx, dz) || 1;
      const want = Math.atan2(dx, dz);
      p.heading += clamp(wrapAngle(want - p.heading), -2.2 * dt, 2.2 * dt);
      p.speed = Math.min(p.speed + 12 * dt, 25);
      p.x += Math.sin(p.heading) * p.speed * dt;
      p.z += Math.cos(p.heading) * p.speed * dt;
      p.mesh.position.set(p.x, 0, p.z);
      p.mesh.rotation.y = p.heading;
      for (const w of p.mesh.userData.wheels) w.rotation.x += (p.speed * dt) / 0.35;
      // Rams only hurt in the car — on foot the cruisers circle the parked car.
      if (s.mode === 'car' && !s.failed && d < 3.4 && this.time - p.ramAt > RAM_COOLDOWN) {
        p.ramAt = this.time;
        this.audio.crash();
        this.damage(RAM_DAMAGE);
      }
    }
    // The heli tracks the hero car — or the player on foot, whose
    // position and facing anchor the beam during the shootout.
    const anchor = s.mode === 'onfoot'
      ? { x: this.playerOnFoot.position.x, z: this.playerOnFoot.position.z, heading: this.playerOnFoot.rotation.y }
      : { x: s.pos.x, z: s.pos.z, heading: s.heading };
    updateHeli(this.heli, dt, this.time, { x: anchor.x, z: anchor.z }, s.wanted >= 3 && !s.failed, anchor.heading);
  }

  stepTraffic(dt) {
    for (const t of this.traffic) {
      t.pos += t.dir * t.speed * dt;
      if (t.pos > 112) t.pos = -112;
      if (t.pos < -112) t.pos = 112;
      if (t.axis === 'x') {
        t.mesh.position.set(t.line, 0, t.pos);
        t.mesh.rotation.y = t.dir > 0 ? 0 : Math.PI;
      } else {
        t.mesh.position.set(t.pos, 0, t.line);
        t.mesh.rotation.y = t.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
      }
      for (const w of t.mesh.userData.wheels) w.rotation.x += (t.speed * dt) / 0.35;
    }
  }

  stepPeds(dt) {
    for (const p of this.peds) {
      if (p.along) p.z += p.dir * p.speed * dt;
      else p.x += p.dir * p.speed * dt;
      const v = p.along ? p.z : p.x;
      if (v > 108) { if (p.along) p.z = -108; else p.x = -108; }
      if (v < -108) { if (p.along) p.z = 108; else p.x = 108; }
      p.mesh.position.set(p.x, 0, p.z);
      animateWalk(p.mesh, dt, 1);
    }
  }

  stepAmbient(dt) {
    // Sailboats bob; flames flicker; markers spin.
    for (const b of this.sailboats) {
      b.position.y = -0.35 + Math.sin(this.time * 0.8 + (b.userData.phase || 0)) * 0.15;
    }
    if (this.burningVan && this.burningVan.visible) {
      const flames = this.burningVan.userData.flames || [];
      flames.forEach((f) => {
        f.scale.y = 1 + Math.sin(this.time * 9 + f.userData.phase) * 0.18;
        f.scale.x = 1 + Math.cos(this.time * 7 + f.userData.phase) * 0.1;
      });
      const fl = this.burningVan.userData.fireLight;
      if (fl) fl.intensity = 52 + Math.sin(this.time * 11) * 12;
      const smoke = this.burningVan.userData.smoke;
      if (smoke) smoke.position.y = 4.6 + Math.sin(this.time * 0.7) * 0.35;
    }
    for (const m of this.packageMarkers) {
      if (!m.visible) continue;
      m.rotation.y += dt * 2;
      m.position.y = 0.9 + Math.sin(this.time * 3) * 0.15;
    }
    for (const o of this.officers) {
      if (o.marker && !o.dead) {
        o.marker.rotation.y += dt * 3;
        o.marker.position.y = 2.6 + Math.sin(this.time * 2.5) * 0.12;
      }
    }
    // Sea shimmer: a slow breathing of the water colour.
    if (this.city && this.time % 1 < dt) {
      // (cheap: nothing per-frame; the sun glow carries the dusk)
    }
  }

  // --- camera / HUD ---------------------------------------------------------------------------
  updateCamera() {
    const s = this.state;
    const cam = this.camera;
    if (this.cameraMode === 'top') {
      cam.position.set(s.pos.x, 130, s.pos.z + 0.1);
      cam.lookAt(s.pos.x, 0, s.pos.z);
      return;
    }
    if (this.cameraMode === 'title') {
      // Low and close: the orange hero sits big below the title text,
      // the boulevard running away into the dusk skyline behind it.
      cam.position.set(s.pos.x - 4, 2.4, s.pos.z + 6.5);
      cam.lookAt(s.pos.x + 0.5, 0.8, s.pos.z - 20);
      return;
    }
    if (this.cameraMode === 'cover') {
      // Low chase cam for the cover shot: right behind the hero, low,
      // the orange car biggest in the lower right, cruisers and the
      // heli up the road ahead, sun and sea at the end of it.
      const fx = Math.sin(s.heading), fz = Math.cos(s.heading);
      const sx = Math.cos(s.heading), sz = -Math.sin(s.heading);
      cam.position.set(s.pos.x - fx * 9 + sx * -4.5, 3.2, s.pos.z - fz * 9 + sz * -4.5);
      cam.lookAt(s.pos.x + fx * 8 + sx * 1.5, 1.0, s.pos.z + fz * 8 + sz * 1.5);
      return;
    }
    if (this.cameraMode === 'shootout' || s.mode === 'onfoot') {
      const p = this.playerOnFoot.position;
      const fy = this.playerOnFoot.rotation.y;
      // Close over the shoulder: the red-jacket player big in frame,
      // officers and the burning van close ahead.
      cam.position.set(p.x - Math.sin(fy) * 5, 2.7, p.z - Math.cos(fy) * 5);
      cam.lookAt(p.x + Math.sin(fy) * 10, 1.2, p.z + Math.cos(fy) * 10);
      return;
    }
    const far = this.cameraMode === 'chase-far';
    const back = far ? 12.5 : 10.5;
    const up = far ? 5 : 4.6;
    const fx = Math.sin(s.heading), fz = Math.cos(s.heading);
    // Chase-far sits off the hero's left shoulder so the orange car lands
    // big in the lower right of the frame, cruisers up the road ahead.
    const sx = Math.cos(s.heading), sz = -Math.sin(s.heading);
    const sideOff = far ? -5.5 : 0;
    const lookSide = far ? 1.5 : 0;
    cam.position.set(s.pos.x - fx * back + sx * sideOff, up, s.pos.z - fz * back + sz * sideOff);
    cam.lookAt(s.pos.x + fx * 7 + sx * lookSide, 1.1, s.pos.z + fz * 7 + sz * lookSide);
  }

  updateHud() {
    const s = this.state;
    const m = MISSIONS[s.mission];
    const leg = this.currentLeg();
    const hours = Math.floor(s.clockMinutes / 60) % 24;
    const mins = Math.floor(s.clockMinutes % 60);
    const day = Math.floor(s.clockMinutes / 1440) + 1;
    const clock = `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')} · DAY ${day}`;
    this.hud.update({
      ...s,
      clock,
      missionId: m ? m.id : 1,
      title: m ? m.title : '',
      step: leg ? leg.text : '',
      legIndex: s.step,
      legCount: m ? m.legs.length : 0,
      missionText: m ? m.brief : '',
      radio: RADIO_STATIONS[s.radio],
      waypoint: s.waypoint,
      police: this.policeCars.map((p) => ({
        unit: p.unit, x: p.x, z: p.z,
        d: Math.round(Math.hypot(p.x - s.pos.x, p.z - s.pos.z)),
      })),
    });
  }
}

// Boot: any failure here is a page error the harnesses can see.
try {
  new Game();
} catch (e) {
  window.__PAGEERROR__ = String((e && e.message) || e);
  throw e;
}
