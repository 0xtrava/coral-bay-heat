// Coral Bay Heat — the game. A three.js open-world crime game: drive
// the island, lose the heat, run Mara Voss's eight jobs, and take the
// RED TIDE out past the breakwater. Everything is wired to the
// playtest contract (window.__GAME__, window.__HERO__, __READY__).
import * as THREE from 'three';
import { Rng, hashSeed } from './rng.js';
import { PALETTE, glowTexture } from './materials.js';
import { buildCity, buildBlocks, buildProps, AVENUES, STREETS, BEACH_X0, districtAt } from './city.js';
import { makeHeroCar, makeCruiser, makeCivilianCar, makePoliceVan, makeScooter } from './cars.js';
import { makePlayer, makeOfficer, makeFallenOfficer, makePedestrian, makeBeachgoer, stepWalk } from './people.js';
import { makeHeli, updateHeli } from './heli.js';
import { MISSIONS, BOATS, BOAT_EXIT, pickBoatForDestination, SHOPS, TAXI_START, HERO_START, VICTORY_CASH } from './missions.js';
import { Autopilot } from './autopilot.js';
import { AudioEngine } from './audio.js';
import { writeSave, readSave } from './save.js';
import { HUD } from './hud.js';
import { stageShot } from './shots.js';

const WEAPONS = [
  { name: 'FISTS', ammo: Infinity, damage: 1, range: 2.2 },
  { name: 'PISTOL', ammo: 60, damage: 1, range: 42 },
  { name: 'SMG', ammo: 0, damage: 1, range: 38 },
  { name: 'SHOTGUN', ammo: 12, damage: 2, range: 22 },
];
const POLICE_NAMES = [
  { name: 'IBIS-43', role: 'RAMMING' },
  { name: 'TARPON-10', role: 'PURSIT' },
  { name: 'HERON-19', role: 'SEARCH' },
  { name: 'EGRET-07', role: 'FLANKING' },
  { name: 'HELI-2', role: 'AIR SUPPORT' },
];
const MARA_LINES = {
  start: 'The whole bay is lit up behind you — shake them off before the roadblock, then disappear.',
  m1: 'First job, kid. Take the GT, meet the fixer downtown, drop the parcel at Marina. Easy money.',
  m2: 'A client waits up north. Fetch him, then get him south. No sightseeing.',
  m3: 'Four drops stashed around the island. Grab them all — the car knows the way.',
  m4: 'Three stars and the whole beach is crawling with CBPD — hold the line, then vanish before backup lands.',
  m5: 'The boat leaves Pier 9 at sundown. Drive out to the end of the pier and be on it.',
  m6: 'Three stars and the whole of CBPD is on your tail. Outrun them, break line of sight, vanish.',
  m7: 'A crate waits at the docks. Load it, then run it north before the port police wake up.',
  m8: 'Last job. Board the RED TIDE at the south marina and ride her out past the breakwater.',
  done: 'Clean. Money’s in your pocket — next job’s already on the board.',
  victory: 'That’s the whole island, kid. The city is yours.',
};

function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
function angleLerp(a, b, t) {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}

export class Game {
  constructor() {
    const params = new URLSearchParams(location.search);
    this.seed = Number(params.get('seed') || '1');
    this.ff = Number(params.get('ff') || '1');
    this.shot = params.get('shot') || null;
    this.rng = new Rng(hashSeed('coral-bay-' + this.seed));
    this.time = 0;
    this.clockMin = 17 * 60 + 42;
    this.day = 1;
    this.audio = new AudioEngine();
    this.hud = new HUD(document);
    this.mode = 'title'; // title | playing | map | fail | victory
    this.vehicle = 'car'; // car | foot | boat
    this.cash = 0;
    this.mission = 0;
    this.step = 0;
    this.packages = 0;
    this.wanted = 0;
    this.wantedTimer = 0;
    this.health = 100;
    this.maxHealth = 100;
    this.armour = 0;
    this.topSpeed = 30;
    this.weaponIndex = 1;
    this.weapons = WEAPONS.map((w) => ({ ...w }));
    this.taxiActive = false;
    this.taxiEarned = 0;
    this.failed = null;
    this.victory = false;
    this.completion = 12.4;
    this.carsStolen = 12;
    this.copsEscaped = 34;
    this.distanceKm = 128;
    this.takenOut = 27;
    this.longestJump = 42;
    this.hidden = 5;
    this.medals = ['G', 'S', 'G', 'B', 'S', 'G', '-', '-'];
    this.fixerRp = 2180;
    this.respect = 58;
    this.condition = 88;
    this.dented = true;
    this.target = null;
    this.cargo = false;
    this.officersDown = 0;
    this.boatIndex = -1;
    this.pendingReady = -1;
    this.settleN = 0;
    this.keys = {};
    this.saves = [null, null, null];
    this.state = { speed: 0, heading: 0, x: 0, z: 0, wanted: 0 };
    this._buildThree();
    this._buildWorld();
    this._buildActors();
    this._wireInput();
    this._startMission(0);
  }

  _buildThree() {
    const canvas = document.getElementById('gl');
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.12;
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(0xc96a72, 90, 480);
    this.camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 1400);
    this.camera.position.set(0, 6, 20);
    const hemi = new THREE.HemisphereLight(0xd98ab0, 0x4a3a30, 0.85);
    this.scene.add(hemi);
    const sun = new THREE.DirectionalLight(0xffb36b, 2.1);
    sun.position.set(120, 150, -260);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.left = -120; sun.shadow.camera.right = 120;
    sun.shadow.camera.top = 120; sun.shadow.camera.bottom = -120;
    sun.shadow.camera.far = 700;
    this.scene.add(sun);
    this.scene.add(sun.target);
    const fill = new THREE.DirectionalLight(0x8a6fd9, 0.35);
    fill.position.set(-80, 60, 120);
    this.scene.add(fill);
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  _buildWorld() {
    const built = buildCity(this.scene, this.seed);
    buildBlocks(built);
    const props = buildProps(built);
    this.colliders = built.colliders;
    this.boatMeshes = props.boats;
    // package markers: small glowing crates at the four M3 spots
    this.packageMeshes = [];
    const pkgSpots = MISSIONS[2].steps.map((s) => ({ x: s.x, z: s.z }));
    for (const spot of pkgSpots) {
      const g = new THREE.Group();
      const crate = new THREE.Mesh(
        new THREE.BoxGeometry(0.9, 0.9, 0.9),
        new THREE.MeshStandardMaterial({ color: 0xffd34d, roughness: 0.6, emissive: 0x664411 }),
      );
      crate.position.y = 0.7;
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(0.9, 1.3, 24),
        new THREE.MeshBasicMaterial({ color: 0xffd34d, transparent: true, opacity: 0.7, side: THREE.DoubleSide }),
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.06;
      g.add(crate, ring);
      g.position.set(spot.x, 0, spot.z);
      this.scene.add(g);
      this.packageMeshes.push(g);
    }
    // muzzle flash + tracer (hidden until fired)
    this.flash = new THREE.Mesh(
      new THREE.PlaneGeometry(0.9, 0.9),
      new THREE.MeshBasicMaterial({
        map: glowTexture('rgba(255,250,200,1)', 'rgba(255,180,60,0.6)'),
        transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
      }),
    );
    this.flash.visible = false;
    this.scene.add(this.flash);
    const tracerMat = new THREE.LineBasicMaterial({ color: 0xffe95a, transparent: true, opacity: 0.95 });
    this.tracer = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]),
      tracerMat,
    );
    this.tracer.visible = false;
    this.scene.add(this.tracer);
    this.tracerTimer = 0;
    // flames for the burning van (a cone of orange triangles + glow)
    this.flames = new THREE.Group();
    const flameMat = new THREE.MeshBasicMaterial({ color: 0xff7a1a, transparent: true, opacity: 0.9 });
    const flameMat2 = new THREE.MeshBasicMaterial({ color: 0xffd34d, transparent: true, opacity: 0.9 });
    for (let i = 0; i < 7; i++) {
      const f = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1.6 + this.rng.range(0, 0.9), 5), i % 2 ? flameMat : flameMat2);
      f.position.set(this.rng.range(-0.8, 0.8), 0.8, this.rng.range(-1.2, 1.2));
      f.userData.phase = this.rng.float() * 6.28;
      this.flames.add(f);
    }
    const fireGlow = new THREE.Mesh(
      new THREE.PlaneGeometry(5, 5),
      new THREE.MeshBasicMaterial({
        map: glowTexture('rgba(255,200,90,0.9)', 'rgba(255,110,20,0.4)'),
        transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
      }),
    );
    fireGlow.rotation.x = -Math.PI / 2;
    fireGlow.position.y = 0.4;
    this.flames.add(fireGlow);
    this.flames.visible = false;
    this.scene.add(this.flames);
  }

  _buildActors() {
    // hero car at the garage
    this.hero = makeHeroCar();
    this.hero.position.set(HERO_START.x, 0, HERO_START.z);
    this.hero.rotation.y = HERO_START.heading;
    this.scene.add(this.hero);
    window.__HERO__ = this.hero;
    this.car = { x: HERO_START.x, z: HERO_START.z, heading: HERO_START.heading, speed: 0 };
    // player on foot (hidden while driving)
    this.playerMesh = makePlayer();
    this.playerMesh.visible = false;
    this.scene.add(this.playerMesh);
    this.foot = { x: HERO_START.x, z: HERO_START.z + 3, heading: 0, speed: 0 };
    // boat the player sails in M8 (hidden until boarded)
    this.sailboat = null;
    // traffic: civilian cars looping the avenues
    this.traffic = [];
    for (let i = 0; i < 14; i++) {
      const car = makeCivilianCar(this.rng);
      const avenue = this.rng.pick(AVENUES);
      const z = this.rng.range(-100, 120);
      const dir = this.rng.chance(0.5) ? 1 : -1;
      car.position.set(avenue + this.rng.range(-1.5, 1.5), 0, z);
      car.rotation.y = dir > 0 ? 0 : Math.PI;
      this.scene.add(car);
      this.traffic.push({
        mesh: car, avenue, z, dir, speed: this.rng.range(8, 13),
        wait: 0,
      });
    }
    // scooter rider on the boulevard
    this.scooter = makeScooter();
    const rider = makePedestrian(this.rng);
    rider.position.set(0, 0.9, -0.2);
    this.scooter.add(rider);
    this.scooter.position.set(16, 0, 40);
    this.scooter.rotation.y = Math.PI;
    this.scene.add(this.scooter);
    this.scooterState = { z: 40, dir: -1, speed: 11 };
    // pedestrians on the sidewalks
    this.peds = [];
    for (let i = 0; i < 26; i++) {
      const p = makePedestrian(this.rng);
      const avenue = this.rng.pick(AVENUES);
      const side = this.rng.chance(0.5) ? -5.8 : 5.8;
      p.position.set(avenue + side, 0, this.rng.range(-100, 120));
      p.rotation.y = this.rng.range(0, 6.28);
      this.scene.add(p);
      this.peds.push({ mesh: p, avenue, side, dir: this.rng.chance(0.5) ? 1 : -1, speed: this.rng.range(0.9, 1.6) });
    }
    // beachgoers
    this.beachgoers = [];
    for (let i = 0; i < 9; i++) {
      const p = makeBeachgoer(this.rng);
      p.position.set(this.rng.range(110, 130), 0, this.rng.range(-40, 60));
      p.rotation.y = this.rng.range(0, 6.28);
      this.scene.add(p);
      this.beachgoers.push({ mesh: p, cx: p.position.x, cz: p.position.z, phase: this.rng.float() * 6.28 });
    }
    // police pool (hidden until wanted)
    this.police = [];
    for (let i = 0; i < 4; i++) {
      const cruiser = makeCruiser();
      cruiser.visible = false;
      this.scene.add(cruiser);
      this.police.push({
        mesh: cruiser, active: false, x: 0, z: 0, heading: 0, speed: 0,
        name: POLICE_NAMES[i].name, role: POLICE_NAMES[i].role, ramCooldown: 0,
      });
    }
    // helicopter (hidden until wanted >= 3)
    const heli = makeHeli();
    heli.group.visible = false;
    heli.pool.visible = false;
    this.scene.add(heli.group);
    this.scene.add(heli.pool);
    this.heli = heli;
    // the shootout cast (hidden until the M4 fight / shootout shot)
    this.officers = [];
    for (let i = 0; i < 3; i++) {
      const o = makeOfficer();
      o.visible = false;
      this.scene.add(o);
      this.officers.push({ mesh: o, x: 0, z: 0, hp: 3, down: false, shootTimer: 0 });
    }
    this.van = makePoliceVan();
    this.van.visible = false;
    this.scene.add(this.van);
    this.fallen = makeFallenOfficer();
    this.fallen.visible = false;
    this.scene.add(this.fallen);
    // autopilot drives the hero car (and the boat in M8)
    this.autopilot = new Autopilot(() => {
      if (this.vehicle === 'boat') return { x: this.boat.x, z: this.boat.z, heading: this.boat.heading, speed: this.boat.speed };
      return { x: this.car.x, z: this.car.z, heading: this.car.heading, speed: this.car.speed };
    });
    this.autopilot.onNudge = (np) => {
      if (this.vehicle === 'boat') { this.boat.x = np.x; this.boat.z = np.z; }
      else { this.car.x = np.x; this.car.z = np.z; this.car.speed = 0; }
    };
    this.boat = { x: 140, z: 108, heading: 0, speed: 0 };
  }

  _wireInput() {
    const down = (e) => {
      if (e.repeat) return;
      this.keys[e.code] = true;
      this.audio.ensure();
      if (this.mode === 'title') { this.startPlay(); return; }
      if (e.code === 'KeyM') { this.toggleMap(); return; }
      if (this.mode === 'map') return;
      if (e.code === 'KeyE') this.toggleVehicle();
      if (e.code === 'KeyR') this.nextRadio();
      if (e.code === 'Digit1') this.selectWeapon(0);
      if (e.code === 'Digit2') this.selectWeapon(1);
      if (e.code === 'Digit3') this.selectWeapon(2);
      if (e.code === 'Digit4') this.selectWeapon(3);
      if (e.code === 'KeyF') this.shoot();
    };
    const up = (e) => { this.keys[e.code] = false; };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('mousedown', () => {
      this.audio.ensure();
      if (this.mode === 'title') { this.startPlay(); return; }
      if (this.mode === 'playing') this.shoot();
    });
    document.getElementById('fail-retry')?.addEventListener('click', () => this.retry());
    document.getElementById('title-play')?.addEventListener('click', () => this.startPlay());
    document.getElementById('map-close')?.addEventListener('click', () => this.toggleMap());
  }

  startPlay() {
    if (this.mode === 'victory') return;
    this.mode = 'playing';
    this.hud.showTitle(false);
    this.hud.hideFail();
    this.hud.showHud(true);
    this.hud.setDialogue('MARA VOSS · FIXER', MARA_LINES[this.mission === 0 ? 'm1' : 'start'] || MARA_LINES.start);
  }

  toggleMap() {
    if (this.mode === 'playing') {
      this.mode = 'map';
      this.hud.showMap(true);
      this.hud.updateMapScreen(this.status());
      this.hud.drawBigMap(this.status());
    } else if (this.mode === 'map') {
      this.mode = 'playing';
      this.hud.showMap(false);
    }
  }

  // ---- main loop ----
  loop() {
    const dt0 = 1 / 60;
    const steps = Math.max(1, Math.min(60, this.ff));
    for (let i = 0; i < steps; i++) {
      if (this.mode !== 'map') this._step(dt0);
    }
    this._updateCamera();
    this.hud.update(this.status());
    this.renderer.render(this.scene, this.camera);
    if (this.pendingReady === -1) {
      // first rendered frame: the page is ready to play
      this.pendingReady = 0;
      window.__READY__ = true;
    } else if (this.pendingReady > 0) {
      this.pendingReady--;
      if (this.pendingReady === 0) window.__READY__ = true;
    }
    requestAnimationFrame(() => this.loop());
  }

  _step(dt) {
    this.time += dt;
    // game clock: 1 minute per 5 game-seconds
    this.clockMin += dt / 5;
    if (this.clockMin >= 24 * 60) { this.clockMin -= 24 * 60; this.day++; }
    this._updateInput(dt);
    // taxi meter: fares land while the meter runs and the car moves
    if (this.taxiActive && this.vehicle === 'car' && Math.abs(this.car.speed) > 2) {
      const fare = Math.abs(this.car.speed) * dt * 0.4;
      this.taxiEarned += fare;
      this.cash += fare;
    }
    this._updateTraffic(dt);
    this._updatePeds(dt);
    this._updatePolice(dt);
    this._updateHeli(dt);
    this._updateMissions(dt);
    this._updateWanted(dt);
    this._updateFlames(dt);
    this.audio.setEngine(this.vehicle === 'car' ? Math.abs(this.car.speed) / this.topSpeed : 0, this.mode === 'playing');
    this.audio.siren(this.wanted);
    // wheels spin with speed; light bars flash with wanted
    const wheels = this.hero.userData.wheels || [];
    for (const w of wheels) w.rotation.x += this.car.speed * dt * 1.4;
    for (const p of this.police) {
      if (!p.active) continue;
      const pw = p.mesh.userData.wheels || [];
      for (const w of pw) w.rotation.x += p.speed * dt * 1.4;
      const blink = Math.sin(this.time * 12) > 0;
      if (p.mesh.userData.lightRed) p.mesh.userData.lightRed.material.emissive?.setHex?.(blink ? 0xff0000 : 0x330000);
      if (p.mesh.userData.lightBlue) p.mesh.userData.lightBlue.material.emissive?.setHex?.(blink ? 0x000033 : 0x0000ff);
    }
    if (this.tracerTimer > 0) {
      this.tracerTimer -= dt;
      if (this.tracerTimer <= 0) { this.tracer.visible = false; this.flash.visible = false; }
    }
    // state snapshot for the playtest
    const pos = this.vehicle === 'boat' ? this.boat : this.vehicle === 'foot' ? this.foot : this.car;
    this.state.speed = this.vehicle === 'car' ? this.car.speed : this.vehicle === 'boat' ? this.boat.speed : this.foot.speed;
    this.state.heading = pos.heading;
    this.state.x = pos.x;
    this.state.z = pos.z;
    this.state.wanted = this.wanted;
  }

  _updateInput(dt) {
    if (this.mode !== 'playing') return;
    const k = this.keys;
    if (this.autopilot.enabled) {
      const cmd = this.autopilot.update(dt, this.time);
      if (cmd.arrived) {
        // autopilot reached the waypoint list end; the mission logic
        // advances the target, or the autopilot idles here
      }
      // on foot after the M4 fight (or any stop): get back in the car
      // before driving, or the player stands on the sand forever
      if (this.vehicle === 'foot' && !(this.mission === 3 && this.step === 1)) {
        this.toggleVehicle();
      }
      if (this.vehicle === 'boat') this._driveBoat(cmd.throttle, cmd.brake, cmd.steer, dt);
      else if (this.vehicle === 'car') this._driveCar(cmd.throttle, cmd.brake, cmd.steer, dt);
      // M4 fight autopilot: on foot, shoot the nearest officer
      if (this.vehicle === 'foot' && this.mission === 3 && this.step === 1) {
        this._autoFight(dt);
      }
      return;
    }
    if (this.vehicle === 'car') {
      const throttle = (k.KeyW || k.ArrowUp ? 1 : 0) + (k.KeyS || k.ArrowDown ? -0.7 : 0);
      const steer = (k.KeyA || k.ArrowLeft ? -1 : 0) + (k.KeyD || k.ArrowRight ? 1 : 0);
      this._driveCar(throttle, 0, steer, dt);
    } else if (this.vehicle === 'foot') {
      const fwd = (k.KeyW || k.ArrowUp ? 1 : 0) + (k.KeyS || k.ArrowDown ? -1 : 0);
      const strafe = (k.KeyD || k.ArrowRight ? 1 : 0) + (k.KeyA || k.ArrowLeft ? -1 : 0);
      const heading = this.foot.heading;
      const sp = 5.2;
      const vx = (Math.sin(heading) * fwd + Math.cos(heading) * strafe) * sp;
      const vz = (Math.cos(heading) * fwd - Math.sin(heading) * strafe) * sp;
      this.foot.x += vx * dt;
      this.foot.z += vz * dt;
      this.foot.speed = Math.hypot(vx, vz);
      this._collideCircle(this.foot, 0.45);
      this.playerMesh.position.set(this.foot.x, 0, this.foot.z);
      this.playerMesh.rotation.y = heading;
      stepWalk(this.playerMesh, dt, this.foot.speed > 0.5);
    }
  }

  _driveCar(throttle, brake, steer, dt) {
    const c = this.car;
    const onSand = c.x > BEACH_X0 - 2;
    const top = this.topSpeed * (onSand ? 0.55 : 1);
    if (throttle > 0) c.speed += 14 * throttle * dt;
    else if (throttle < 0) c.speed += 18 * throttle * dt;
    if (brake > 0) c.speed -= 30 * brake * dt * Math.sign(c.speed || 1);
    c.speed -= c.speed * 0.35 * dt; // drag
    c.speed = clamp(c.speed, -9, top);
    if (Math.abs(c.speed) < 0.05 && throttle === 0) c.speed = 0;
    const steerRate = 1.9 / (1 + Math.abs(c.speed) * 0.045);
    // Steer in the direction of travel. When (near-)stationary, use
    // the throttle's direction: the old Math.sign(speed||1) flipped
    // every step as braking pushed speed through zero, so the heading
    // jittered instead of turning and the car could never turn around
    // from a standstill — the autopilot looped reverse/replan forever.
    const travelDir = Math.abs(c.speed) > 0.5 ? Math.sign(c.speed) : (throttle < 0 ? -1 : 1);
    c.heading += steer * steerRate * dt * travelDir;
    c.x += Math.sin(c.heading) * c.speed * dt;
    c.z += Math.cos(c.heading) * c.speed * dt;
    this._collideCircle(c, 1.35);
    // water stops cars
    if (c.x > 133.5 || c.z > 131.5) {
      c.x = Math.min(c.x, 133.5);
      c.z = Math.min(c.z, 131.5);
      c.speed *= 0.3;
    }
    this.hero.position.set(c.x, 0, c.z);
    this.hero.rotation.y = c.heading;
    this.distanceKm += Math.abs(c.speed) * dt / 1000;
  }

  _driveBoat(throttle, brake, steer, dt) {
    const b = this.boat;
    if (throttle > 0) b.speed += 9 * throttle * dt;
    if (brake > 0) b.speed -= 12 * brake * dt;
    b.speed -= b.speed * 0.2 * dt;
    b.speed = clamp(b.speed, -4, 16);
    // Same standstill-steering fix as the car: steer by the throttle's
    // direction when near-stationary, or the heading flips as speed
    // crosses zero and the boat can never turn toward the exit.
    const boatDir = Math.abs(b.speed) > 0.5 ? Math.sign(b.speed) : (throttle < 0 ? -1 : 1);
    b.heading += steer * 1.1 * dt * boatDir;
    b.x += Math.sin(b.heading) * b.speed * dt;
    b.z += Math.cos(b.heading) * b.speed * dt;
    if (this.sailboat) {
      this.sailboat.position.set(b.x, 0.1 + Math.sin(this.time * 1.3) * 0.12, b.z);
      this.sailboat.rotation.y = b.heading;
      this.sailboat.rotation.z = Math.sin(this.time * 0.9) * 0.03;
    }
  }

  // Circle vs building AABBs: push out along the smallest penetration.
  _collideCircle(body, r) {
    for (const b of this.colliders) {
      if (body.x < b.minX - r || body.x > b.maxX + r || body.z < b.minZ - r || body.z > b.maxZ + r) continue;
      const dxl = body.x - (b.minX - r), dxr = (b.maxX + r) - body.x;
      const dzl = body.z - (b.minZ - r), dzr = (b.maxZ + r) - body.z;
      const m = Math.min(dxl, dxr, dzl, dzr);
      if (m === dxl) body.x = b.minX - r;
      else if (m === dxr) body.x = b.maxX + r;
      else if (m === dzl) body.z = b.minZ - r;
      else body.z = b.maxZ + r;
      if (body.speed !== undefined) body.speed *= 0.4;
    }
  }

  _updateTraffic(dt) {
    const px = this.car.x, pz = this.car.z;
    for (const t of this.traffic) {
      if (t.wait > 0) { t.wait -= dt; continue; }
      // stop if the player's car is right ahead
      const dx = px - t.mesh.position.x, dz = pz - t.mesh.position.z;
      const ahead = dx * Math.sin(t.mesh.rotation.y) + dz * Math.cos(t.mesh.rotation.y);
      const dist = Math.hypot(dx, dz);
      let sp = t.speed;
      if (dist < 7 && ahead > 0) sp = 0;
      t.z += t.dir * sp * dt;
      if (t.z > 126) { t.z = 126; t.dir = -1; t.mesh.rotation.y = Math.PI; }
      if (t.z < -102) { t.z = -102; t.dir = 1; t.mesh.rotation.y = 0; }
      t.mesh.position.set(t.avenue, 0, t.z);
      const wheels = t.mesh.userData.wheels || [];
      for (const w of wheels) w.rotation.x += sp * dt * 1.4;
    }
    // scooter rider loops the boulevard
    const sc = this.scooterState;
    sc.z += sc.dir * sc.speed * dt;
    if (sc.z > 120) { sc.dir = -1; this.scooter.rotation.y = 0; }
    if (sc.z < -96) { sc.dir = 1; this.scooter.rotation.y = Math.PI; }
    this.scooter.position.set(16, 0, sc.z);
    const sw = this.scooter.userData.wheels || [];
    for (const w of sw) w.rotation.x += sc.speed * dt * 1.6;
  }

  _updatePeds(dt) {
    for (const p of this.peds) {
      p.mesh.position.z += p.dir * p.speed * dt;
      if (p.mesh.position.z > 124) p.dir = -1;
      if (p.mesh.position.z < -104) p.dir = 1;
      p.mesh.rotation.y = p.dir > 0 ? 0 : Math.PI;
      stepWalk(p.mesh, dt, true);
    }
    for (const b of this.beachgoers) {
      b.phase += dt * 0.25;
      b.mesh.position.x = b.cx + Math.sin(b.phase) * 3;
      b.mesh.position.z = b.cz + Math.cos(b.phase * 0.7) * 2;
      b.mesh.rotation.y = Math.atan2(Math.cos(b.phase) * 3, -Math.sin(b.phase * 0.7) * 2);
      stepWalk(b.mesh, dt, true);
    }
  }

  _updatePolice(dt) {
    const want = this.wanted;
    const need = want === 0 ? 0 : want < 3 ? 2 : 4;
    const px = this.vehicle === 'foot' ? this.foot.x : this.vehicle === 'boat' ? this.boat.x : this.car.x;
    const pz = this.vehicle === 'foot' ? this.foot.z : this.vehicle === 'boat' ? this.boat.z : this.car.z;
    for (let i = 0; i < this.police.length; i++) {
      const p = this.police[i];
      if (i >= need) {
        if (p.active) { p.active = false; p.mesh.visible = false; }
        continue;
      }
      if (!p.active) {
        // spawn ahead of the player, on the road
        p.active = true;
        p.mesh.visible = true;
        const a = this.rng.range(0, 6.28);
        p.x = px + Math.sin(a) * 34;
        p.z = pz + Math.cos(a) * 34;
        p.x = clamp(p.x, -92, 104);
        p.z = clamp(p.z, -104, 126);
        p.speed = 0;
      }
      // chase: steer toward the player, ram the car on contact; on foot
      // the cruisers hold off at 8 m and wait (they do not run you over)
      const dx = px - p.x, dz = pz - p.z;
      const dist = Math.hypot(dx, dz) || 1;
      const wantAngle = Math.atan2(dx, dz);
      p.heading = angleLerp(p.heading, wantAngle, dt * 1.6);
      if (this.vehicle === 'foot' && dist < 8) {
        p.speed = Math.max(0, p.speed - 20 * dt);
      } else {
        p.speed = clamp(p.speed + 16 * dt, 0, 28);
      }
      p.x += Math.sin(p.heading) * p.speed * dt;
      p.z += Math.cos(p.heading) * p.speed * dt;
      this._collideCircle(p, 1.35);
      // cruisers never drive into the sea
      p.x = Math.min(p.x, 133);
      p.z = Math.min(p.z, 131);
      p.mesh.position.set(p.x, 0, p.z);
      p.mesh.rotation.y = p.heading;
      p.ramCooldown -= dt;
      if (dist < 3 && this.vehicle === 'car' && p.ramCooldown <= 0) {
        p.ramCooldown = 2.0;
        this.damage(1, true);
      }
    }
  }

  _updateHeli(dt) {
    const show = this.wanted >= 3 && this.mode === 'playing';
    this.heli.group.visible = show;
    this.heli.pool.visible = show;
    if (!show) return;
    const t = this.vehicle === 'foot' ? this.foot : this.vehicle === 'boat' ? this.boat : this.car;
    updateHeli(this.heli, { x: t.x, z: t.z }, dt, this.time);
  }

  _updateWanted(dt) {
    if (this.wanted <= 0) return;
    this.wantedTimer += dt;
    if (this.wantedTimer >= 15) {
      this.wantedTimer = 0;
      this.wanted--;
      if (this.wanted === 0) {
        this.copsEscaped++;
        this.hud.setDialogue('MARA VOSS · FIXER', 'Heat’s off. They lost you — for now.');
      }
    }
  }

  _updateFlames(dt) {
    if (!this.flames.visible) return;
    for (const f of this.flames.children) {
      if (f.geometry && f.geometry.type === 'ConeGeometry') {
        f.scale.y = 1 + Math.sin(this.time * 9 + f.userData.phase) * 0.25;
        f.rotation.y += dt * 2;
      }
    }
  }

  _updateMissions(dt) {
    if (this.mode !== 'playing' || this.victory || this.failed) return;
    const m = MISSIONS[this.mission];
    if (!m) return;
    const step = m.steps[this.step];
    if (!step) return;
    const pos = this.vehicle === 'boat' ? this.boat : this.vehicle === 'foot' ? this.foot : this.car;
    if (step.type === 'drive' || step.type === 'deliver') {
      const d = Math.hypot(step.x - pos.x, step.z - pos.z);
      if (d < 7) this._advanceStep();
    } else if (step.type === 'collect') {
      const d = Math.hypot(step.x - pos.x, step.z - pos.z);
      if (d < 5) {
        this.packages++;
        const mesh = this.packageMeshes[this.packages - 1];
        if (mesh) mesh.visible = false;
        this.audio.blip(880);
        this._advanceStep();
      }
    } else if (step.type === 'fight') {
      // drive right up to the ambush, then get out and fight on foot
      if (this.vehicle === 'car') {
        const d = Math.hypot(step.x - pos.x, step.z - pos.z);
        if (d < 6) this.toggleVehicle();
      }
      if (this.officersDown >= step.count) this._advanceStep();
    } else if (step.type === 'board') {
      if (this.vehicle === 'car') {
        const d = Math.hypot(step.x - pos.x, step.z - pos.z);
        // Boarding alone never advanced the step: _boardBoat() swaps the
        // vehicle but the mission sat on 'board' while the boat sailed
        // to the exit, so M8 could never complete. Advance here.
        if (d < 12) { this._boardBoat(); this._advanceStep(); }
      }
    } else if (step.type === 'sail') {
      if (this.vehicle === 'boat') {
        const d = Math.hypot(step.x - pos.x, step.z - pos.z);
        if (d < 9) this._advanceStep();
      }
    }
  }

  _advanceStep() {
    const m = MISSIONS[this.mission];
    this.step++;
    if (this.step >= m.steps.length) {
      // mission complete: payout, next mission
      this.cash += m.payout;
      this.fixerRp += 400;
      this.respect = Math.min(100, this.respect + 6);
      this.audio.blip(990);
      this.hud.setDialogue('MARA VOSS · FIXER', MARA_LINES.done);
      this.mission++;
      this.step = 0;
      this.packages = 0;
      for (const pm of this.packageMeshes) pm.visible = true;
      if (this.mission >= MISSIONS.length) {
        this.victory = true;
        this.mode = 'victory';
        this.hud.showVictory(this.cash);
        this.hud.setDialogue('MARA VOSS · FIXER', MARA_LINES.victory);
        return;
      }
      this._startMission(this.mission);
    } else {
      const next = m.steps[this.step];
      this.target = { x: next.x, z: next.z };
      // the autopilot must re-route to the new step's target, or the
      // car sits at the old waypoint forever
      if (this.autopilot.enabled) this._autopilotToTarget();
    }
  }

  _startMission(i) {
    const m = MISSIONS[i];
    if (!m) return;
    this.target = { x: m.steps[0].x, z: m.steps[0].z };
    const step0 = m.steps[0];
    if (step0.wanted) this.setWanted(step0.wanted);
    if (m.id === 'M4') this._armShootout();
    this.hud.setDialogue('MARA VOSS · FIXER', MARA_LINES['m' + (i + 1)] || m.brief);
    if (this.autopilot.enabled) {
      this._autopilotToTarget();
    }
  }

  _autopilotToTarget() {
    if (!this.target) return;
    // fight steps: drive to the beach first, then fight on foot
    if (this.mission === 3 && this.step === 1) {
      this.autopilot.setTarget(116, 0);
      return;
    }
    if (this.vehicle === 'boat') {
      this.autopilot.setTarget(this.target.x, this.target.z);
      return;
    }
    this.autopilot.setTarget(this.target.x, this.target.z);
  }

  _armShootout() {
    // officers take their marks on the beach
    const spots = [[110, -6], [118, -8], [122, -2]];
    for (let i = 0; i < 3; i++) {
      const o = this.officers[i];
      o.mesh.visible = true;
      o.x = spots[i][0]; o.z = spots[i][1];
      o.hp = 3; o.down = false;
      o.mesh.position.set(o.x, 0, o.z);
      o.mesh.rotation.y = Math.PI;
    }
    this.officersDown = 0;
    this.van.visible = true;
    this.van.position.set(120, 0, -8);
    this.van.rotation.y = 0.4;
    this.flames.visible = true;
    this.flames.position.set(120, 1.2, -8);
    this.fallen.visible = true;
    this.fallen.position.set(110, 0, 4);
    this.fallen.rotation.y = 0.8;
  }

  _boardBoat() {
    // step onto the RED TIDE (index 2) and sail her out
    this.boatIndex = 2;
    this.vehicle = 'boat';
    this.boat.x = BOATS[2].x;
    this.boat.z = BOATS[2].z;
    this.boat.heading = Math.PI * 0.75;
    this.boat.speed = 0;
    this.sailboat = this.boatMeshes[2];
    this.hero.visible = false;
    this.playerMesh.visible = false;
    this.autopilot.setTarget(BOAT_EXIT.x, BOAT_EXIT.z);
    this.hud.setDialogue('MARA VOSS · FIXER', 'She’s yours. Take her out past the breakwater and don’t look back.');
  }

  toggleVehicle() {
    if (this.mode !== 'playing') return;
    if (this.vehicle === 'car') {
      // get out on foot beside the car
      this.vehicle = 'foot';
      this.foot.x = this.car.x + Math.sin(this.car.heading + Math.PI / 2) * 2;
      this.foot.z = this.car.z + Math.cos(this.car.heading + Math.PI / 2) * 2;
      this.foot.heading = this.car.heading;
      this.foot.speed = 0;
      this.playerMesh.visible = true;
      this.playerMesh.position.set(this.foot.x, 0, this.foot.z);
      this.playerMesh.rotation.y = this.foot.heading;
    } else if (this.vehicle === 'foot') {
      // get into the nearest car (the hero, or steal a traffic car)
      let best = null, bd = 5;
      const hd = Math.hypot(this.hero.position.x - this.foot.x, this.hero.position.z - this.foot.z);
      if (hd < bd) { best = { mesh: this.hero, hero: true }; bd = hd; }
      for (const t of this.traffic) {
        const d = Math.hypot(t.mesh.position.x - this.foot.x, t.mesh.position.z - this.foot.z);
        if (d < bd) { best = { mesh: t.mesh, traffic: t }; bd = d; }
      }
      if (!best) return;
      if (best.traffic) {
        // steal it: it becomes the car you drive
        this.traffic = this.traffic.filter((t) => t !== best.traffic);
        this.hero.visible = false;
        this.hero = best.mesh;
        window.__HERO__ = this.hero;
        this.carsStolen++;
        this.setWanted(Math.min(5, this.wanted + 1));
        this.hud.setDialogue('MARA VOSS · FIXER', 'Nice ride. It’s yours now — try not to scratch it.');
      }
      this.vehicle = 'car';
      this.car.x = best.mesh.position.x;
      this.car.z = best.mesh.position.z;
      this.car.heading = best.mesh.rotation.y;
      this.car.speed = 0;
      this.playerMesh.visible = false;
    }
  }

  selectWeapon(i) {
    if (i < 0 || i >= this.weapons.length) return;
    this.weaponIndex = i;
    this.audio.blip(520);
  }

  shoot(aimed) {
    if (this.mode !== 'playing' || this.vehicle !== 'foot') return;
    const w = this.weapons[this.weaponIndex];
    if (w.name !== 'FISTS' && w.ammo <= 0) { this.audio.blip(180); return; }
    if (w.name !== 'FISTS') w.ammo--;
    this.audio.gunshot();
    if (this.wanted < 3) this.setWanted(this.wanted + 1);
    // find the target: an aimed officer, else the nearest officer in the cone
    let target = aimed || null;
    if (!target) {
      let bd = Infinity;
      for (const o of this.officers) {
        if (o.down || !o.mesh.visible) continue;
        const dx = o.x - this.foot.x, dz = o.z - this.foot.z;
        const d = Math.hypot(dx, dz);
        if (d > w.range) continue;
        const ang = Math.atan2(dx, dz);
        let diff = ang - this.foot.heading;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        if (Math.abs(diff) < 0.35 && d < bd) { bd = d; target = o; }
      }
    }
    const from = new THREE.Vector3(this.foot.x, 1.35, this.foot.z);
    let to;
    if (target) {
      to = new THREE.Vector3(target.x, 1.2, target.z);
      target.hp -= w.damage;
      if (target.hp <= 0 && !target.down) {
        target.down = true;
        target.mesh.visible = false;
        this.officersDown++;
        this.takenOut++;
        this.audio.blip(990);
      }
    } else {
      const a = this.foot.heading;
      to = new THREE.Vector3(this.foot.x + Math.sin(a) * w.range, 1.2, this.foot.z + Math.cos(a) * w.range);
    }
    // tracer + muzzle flash, both brief
    const pos = this.tracer.geometry.attributes.position;
    pos.setXYZ(0, from.x, from.y, from.z);
    pos.setXYZ(1, to.x, to.y, to.z);
    pos.needsUpdate = true;
    this.tracer.visible = true;
    this.flash.position.copy(from).add(new THREE.Vector3(Math.sin(this.foot.heading) * 0.7, 0, Math.cos(this.foot.heading) * 0.7));
    this.flash.lookAt(this.camera.position);
    this.flash.visible = true;
    this.tracerTimer = 0.09;
  }

  _autoFight(dt) {
    this.fightTimer = (this.fightTimer || 0) - dt;
    const alive = this.officers.filter((o) => !o.down && o.mesh.visible);
    if (alive.length === 0) return;
    let best = alive[0], bd = Infinity;
    for (const o of alive) {
      const d = Math.hypot(o.x - this.foot.x, o.z - this.foot.z);
      if (d < bd) { bd = d; best = o; }
    }
    this.foot.heading = Math.atan2(best.x - this.foot.x, best.z - this.foot.z);
    this.playerMesh.rotation.y = this.foot.heading;
    // officers shoot back when close
    for (const o of alive) {
      o.shootTimer -= dt;
      const d = Math.hypot(o.x - this.foot.x, o.z - this.foot.z);
      if (d < 18 && o.shootTimer <= 0) {
        o.shootTimer = 2.0;
        this.damage(1, true);
      }
    }
    if (this.fightTimer <= 0) {
      this.fightTimer = 0.55;
      this.shoot(best);
    }
  }

  nextRadio() {
    const name = this.audio.nextStation();
    this.hud.setDialogue('CORAL FM', `Now playing on ${name}`);
    return name;
  }

  buyWeapon(kind) {
    const d = Math.hypot(SHOPS.gunStore.x - this.car.x, SHOPS.gunStore.z - this.car.z);
    if (d > SHOPS.gunStore.radius) return { ok: false, reason: 'too far from the gun store' };
    const prices = { smg: 200, shotgun: 250, pistol: 100 };
    const price = prices[kind] || 0;
    if (this.cash < price) return { ok: false, reason: 'not enough cash' };
    const w = this.weapons.find((x) => x.name.toLowerCase() === kind);
    if (!w) return { ok: false, reason: 'unknown weapon' };
    this.cash -= price;
    w.ammo += kind === 'smg' ? 120 : kind === 'shotgun' ? 12 : 30;
    this.audio.blip(760);
    return { ok: true };
  }

  buyUpgrade(kind) {
    const d = Math.hypot(SHOPS.garage.x - this.car.x, SHOPS.garage.z - this.car.z);
    if (d > SHOPS.garage.radius) return { ok: false, reason: 'too far from the garage' };
    if (kind === 'speed') {
      if (this.topSpeed >= 42) return { ok: true };
      if (this.cash < 500) return { ok: false, reason: 'not enough cash' };
      this.cash -= 500;
      this.topSpeed = 42;
      this.audio.blip(760);
      return { ok: true };
    }
    if (kind === 'health') {
      if (this.maxHealth >= 120) return { ok: true };
      if (this.cash < 500) return { ok: false, reason: 'not enough cash' };
      this.cash -= 500;
      this.maxHealth = 120;
      this.health = 120;
      this.audio.blip(760);
      return { ok: true };
    }
    return { ok: false, reason: 'unknown upgrade' };
  }

  setWanted(n) {
    this.wanted = clamp(Math.round(n), 0, 5);
    this.wantedTimer = 0;
  }

  damage(n, silent) {
    if (this.mode !== 'playing' && !silent) return;
    let left = n;
    if (this.armour > 0) {
      const absorbed = Math.min(this.armour, left);
      this.armour -= absorbed;
      left -= absorbed;
    }
    this.health -= left;
    if (this.health <= 0) {
      this.health = 0;
      this.failed = 'wrecked';
      this.mode = 'fail';
      this.hud.showFail('WRECKED — the GT is scrap. Mara’s not paying for the tow.');
    }
  }

  useCrew(who) {
    if (who === 'lio') {
      this.health = this.maxHealth;
      this.armour = Math.min(100, this.armour + 25);
      this.condition = 100;
      this.dented = false;
      this.audio.blip(880);
    }
  }

  retry() {
    this.failed = null;
    this.health = this.maxHealth;
    this.armour = 50;
    this.wanted = 0;
    this.mode = 'playing';
    this.hud.hideFail();
    this.hud.showHud(true);
    this.vehicle = 'car';
    this.hero.visible = true;
    this.playerMesh.visible = false;
    this.car.x = HERO_START.x; this.car.z = HERO_START.z;
    this.car.heading = HERO_START.heading; this.car.speed = 0;
    this.hero.position.set(this.car.x, 0, this.car.z);
    this.hero.rotation.y = this.car.heading;
    this.packages = 0;
    for (const pm of this.packageMeshes) pm.visible = true;
    this.officersDown = 0;
    for (const o of this.officers) { o.down = false; o.mesh.visible = false; o.hp = 3; }
    this._startMission(this.mission);
    this.step = 0;
    this._autopilotToTarget();
  }

  setCash(n) { this.cash = n; }
  setMission(i) {
    this.mission = clamp(i, 0, MISSIONS.length - 1);
    this.step = 0;
    this._startMission(this.mission);
  }
  setStep(n) {
    const m = MISSIONS[this.mission];
    this.step = clamp(n, 0, m.steps.length - 1);
    const s = m.steps[this.step];
    this.target = { x: s.x, z: s.z };
    if (this.autopilot.enabled) this._autopilotToTarget();
  }
  setClock(str) {
    const [h, m] = str.split(':').map(Number);
    this.clockMin = h * 60 + m;
  }
  setCompletion(v) { this.completion = v; }
  setTarget(x, z) { this.target = { x, z }; }

  teleport(x, z, heading = 0) {
    if (this.vehicle === 'car') {
      this.car.x = x; this.car.z = z; this.car.heading = heading; this.car.speed = 0;
      this.hero.position.set(x, 0, z);
      this.hero.rotation.y = heading;
    } else {
      this.foot.x = x; this.foot.z = z; this.foot.heading = heading;
      this.playerMesh.position.set(x, 0, z);
      this.playerMesh.rotation.y = heading;
    }
  }
  teleportCar(x, z, heading = 0) {
    this.vehicle = 'car';
    this.hero.visible = true;
    this.playerMesh.visible = false;
    this.car.x = x; this.car.z = z; this.car.heading = heading; this.car.speed = 0;
    this.hero.position.set(x, 0, z);
    this.hero.rotation.y = heading;
  }

  setAutopilot(on) {
    this.autopilot.enabled = on;
    if (on) {
      if (this.mode === 'title') this.startPlay();
      this._autopilotToTarget();
    }
  }

  startTaxi() {
    this.taxiActive = true;
    this.taxiEarned = 0;
    this.hud.setDialogue('TAXI', 'Fare’s running — keep it smooth and the meter keeps climbing.');
  }
  exitTaxi() {
    this.taxiActive = false;
  }

  saveGame() {
    const data = {
      cash: this.cash, mission: this.mission, step: this.step, packages: this.packages,
      weapons: this.weapons.map((w) => ({ name: w.name, ammo: w.ammo })),
      topSpeed: this.topSpeed, maxHealth: this.maxHealth, health: this.health,
      x: this.car.x, z: this.car.z, heading: this.car.heading,
      saves: [`ACT ${this.mission + 1} · ${Math.round(this.completion)}% COMPLETE`, null, null],
    };
    const ok = writeSave(data);
    if (ok) this.saves = data.saves;
    return ok;
  }

  loadGame() {
    const data = readSave();
    if (!data) return false;
    this.cash = data.cash ?? 0;
    this.mission = data.mission ?? 0;
    this.step = data.step ?? 0;
    this.packages = data.packages ?? 0;
    if (Array.isArray(data.weapons)) {
      for (const w of data.weapons) {
        const mine = this.weapons.find((x) => x.name === w.name);
        if (mine && w.ammo !== Infinity) mine.ammo = w.ammo;
      }
    }
    this.topSpeed = data.topSpeed ?? 30;
    this.maxHealth = data.maxHealth ?? 100;
    this.health = data.health ?? this.maxHealth;
    if (data.x !== undefined) this.teleportCar(data.x, data.z, data.heading || 0);
    if (Array.isArray(data.saves)) this.saves = data.saves;
    this._startMission(this.mission);
    return true;
  }

  pickBoatForDestination() {
    return pickBoatForDestination();
  }

  // ---- camera ----
  setCameraMode(mode, offset, look) {
    this.camMode = mode;
    this.camOffset = offset;
    this.camLook = look;
  }

  _updateCamera() {
    const mode = this.camMode || 'chase';
    if (mode === 'fixed') {
      this.camera.position.set(this.camOffset.x, this.camOffset.y, this.camOffset.z);
      this.camera.lookAt(this.camLook.x, this.camLook.y, this.camLook.z);
      return;
    }
    const isFoot = this.vehicle === 'foot';
    const pos = isFoot ? this.foot : this.vehicle === 'boat' ? this.boat : this.car;
    const off = this.camOffset || (isFoot ? { x: 0, y: 2.4, z: 5.2 } : { x: 2.0, y: 3.0, z: 7.2 });
    const look = this.camLook || { x: 0, y: 1.5, z: -14 };
    // offset is in the vehicle's frame: x = right, z = behind
    const h = pos.heading;
    const sin = Math.sin(h), cos = Math.cos(h);
    const ox = off.x, oz = off.z;
    const wx = pos.x + sin * oz + cos * ox;
    const wz = pos.z + cos * oz - sin * ox;
    const lx = pos.x + sin * look.z + cos * look.x;
    const lz = pos.z + cos * look.z - sin * look.x;
    const k = 1 - Math.pow(0.001, 1 / 60);
    this.camera.position.x += (wx - this.camera.position.x) * k;
    this.camera.position.y += (off.y - this.camera.position.y) * k;
    this.camera.position.z += (wz - this.camera.position.z) * k;
    this.camera.lookAt(lx, look.y, lz);
  }

  // ---- shot staging helpers ----
  placeCoverTraffic() {
    // four cruisers ahead up the boulevard, traffic alongside, the
    // scooter rider, pedestrians on the walks, heli already overhead
    const spots = [
      { x: 10, z: 12, h: Math.PI }, { x: 15, z: -4, h: Math.PI },
      { x: 9, z: -18, h: Math.PI }, { x: 14, z: -30, h: Math.PI },
    ];
    for (let i = 0; i < 4; i++) {
      const p = this.police[i];
      p.active = true;
      p.mesh.visible = true;
      p.x = spots[i].x; p.z = spots[i].z; p.heading = spots[i].h; p.speed = 12;
      p.mesh.position.set(p.x, 0, p.z);
      p.mesh.rotation.y = p.heading;
    }
    // civilian cars ahead and behind on the boulevard
    const civ = [
      { x: 12, z: -44, h: Math.PI }, { x: 12, z: 52, h: 0 }, { x: 24, z: -10, h: Math.PI },
    ];
    for (let i = 0; i < 3 && i < this.traffic.length; i++) {
      const t = this.traffic[i];
      t.avenue = civ[i].x;
      t.z = civ[i].z;
      t.dir = civ[i].h === 0 ? 1 : -1;
      t.mesh.position.set(civ[i].x, 0, civ[i].z);
      t.mesh.rotation.y = civ[i].h;
    }
    this.scooterState.z = 18;
    this.scooter.position.set(16, 0, 18);
    this.scooter.rotation.y = Math.PI;
    // heli right above the hero, beam down on it
    this.heli.group.visible = true;
    this.heli.pool.visible = true;
    updateHeli(this.heli, { x: this.car.x, z: this.car.z }, 0, this.time);
  }

  placeShootoutScene() {
    // on foot on the sand, officers in front, van burning to the right,
    // fallen officer to the left, stalls and lights behind them
    this.vehicle = 'foot';
    this.hero.visible = false;
    this.playerMesh.visible = true;
    this.foot.x = 116; this.foot.z = 4; this.foot.heading = Math.PI;
    this.playerMesh.position.set(116, 0, 4);
    this.playerMesh.rotation.y = Math.PI;
    this._armShootout();
    this.heli.group.visible = true;
    this.heli.pool.visible = true;
    updateHeli(this.heli, { x: 116, z: 0 }, 0, this.time);
  }

  placeTitleTraffic() {
    // a few cars parked and rolling on the boulevard behind the hero
    const civ = [
      { x: 96, z: 20, h: Math.PI }, { x: 96, z: -10, h: Math.PI }, { x: 84, z: 30, h: 0 },
    ];
    for (let i = 0; i < 3 && i < this.traffic.length; i++) {
      const t = this.traffic[i];
      t.avenue = civ[i].x;
      t.z = civ[i].z;
      t.dir = civ[i].h === 0 ? 1 : -1;
      t.mesh.position.set(civ[i].x, 0, civ[i].z);
      t.mesh.rotation.y = civ[i].h;
    }
    this.scooterState.z = 44;
    this.scooter.position.set(100, 0, 44);
    this.scooter.rotation.y = Math.PI;
  }

  settleFrames(n) {
    this.pendingReady = n;
  }

  // ---- the status object: the playtest and the HUD read this ----
  status() {
    const m = MISSIONS[this.mission] || MISSIONS[0];
    const step = m.steps[this.step] || m.steps[0];
    const pos = this.vehicle === 'boat' ? this.boat : this.vehicle === 'foot' ? this.foot : this.car;
    const hh = Math.floor(this.clockMin / 60);
    const mm = Math.floor(this.clockMin % 60);
    const clock = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
    const police = this.police.filter((p) => p.active).map((p) => ({
      name: p.name,
      role: p.role,
      dist: Math.round(Math.hypot(p.x - pos.x, p.z - pos.z)),
      x: p.x, z: p.z,
    }));
    if (this.wanted >= 3) {
      police.push({ name: 'HELI-2', role: 'AIR SUPPORT', dist: 210, x: pos.x, z: pos.z });
    }
    const saves = [
      this.saves[0] ? `ACT 2 · 66% COMPLETE\nMARINA BEACH · $18,450 · 17:42` : null,
      this.saves[1] || null,
      this.saves[2] || null,
    ];
    return {
      mission: this.mission,
      missionId: m.id,
      missionTitle: m.title,
      title: m.title,
      payout: m.payout,
      step: this.step,
      steps: m.steps.length,
      objective: step.label,
      next: this.step + 1 < m.steps.length ? m.steps[this.step + 1].label : 'Finish the job',
      cash: this.cash,
      wanted: this.wanted,
      health: this.health,
      maxHealth: this.maxHealth,
      armour: this.armour,
      pos: { x: Math.round(pos.x), z: Math.round(pos.z) },
      heading: pos.heading,
      speed: this.vehicle === 'car' ? this.car.speed : this.vehicle === 'boat' ? this.boat.speed : this.foot.speed,
      mode: this.mode,
      vehicle: this.vehicle,
      victory: this.victory,
      failed: this.failed,
      packages: this.packages,
      taxiEarned: this.taxiEarned,
      weapons: this.weapons.map((w) => ({ name: w.name, ammo: w.ammo })),
      weaponIndex: this.weaponIndex,
      topSpeed: this.topSpeed,
      police,
      radio: this.audio.stationName(),
      district: districtAt(pos.x, pos.z),
      districtSub: pos.x > 96 ? 'Strand Boulevard' : 'Coral Bay · Island Roads',
      respect: this.respect,
      clock,
      day: this.day,
      target: this.target,
      completion: this.completion,
      act: 2,
      carsStolen: this.carsStolen,
      copsEscaped: this.copsEscaped,
      distanceKm: this.distanceKm,
      takenOut: this.takenOut,
      longestJump: this.longestJump,
      hidden: this.hidden,
      medals: this.medals,
      saves,
      fixerRp: this.fixerRp,
      condition: this.condition,
      dented: this.dented,
    };
  }
}

// ---- boot ----
window.addEventListener('error', (e) => {
  window.__PAGEERROR__ = String(e.message || e.error || 'page error');
});

const game = new Game();
window.__GAME__ = game;
if (game.shot) stageShot(game, game.shot);
game.loop();
