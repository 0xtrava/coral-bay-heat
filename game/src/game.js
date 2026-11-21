// Coral Bay Heat — Phase 2: missions M1-M8, wanted police, shops, weapons,
// crew, radio, taxi, packages, save/load, fail + retry, autopilot harness.
// The game owns the player state (position, heading, speed, mode); main.js
// renders the driven vehicle, the on-foot avatar and the camera from it.
import { makeCivilianCar, makePoliceCar } from './cars.js';

const SAVE_KEY = 'coral-bay-heat-save-v1';
const GARAGE = { x: -30, z: 96 };
const PIER_BASE = { x: 12, z: -95 };
const PIER_END = { x: 60, z: -95 };
const SOUTH_MARINA = { x: 75, z: 140 };
const DEST_EXIT = { x: 75, z: 140 }; // south marina pier exit: boats are picked nearest THIS
const GUN_STORE = { x: -14, z: -30 };
const HIDE_ZONE = { x: -40, z: 90 };

export const STATIONS = [
  { name: 'CORAL FM 98.4', genre: 'Island Pop', track: 'Marina Lights — The Palms' },
  { name: 'BAY BREEZE 101.2', genre: 'Sunset Reggae', track: 'Low Tide — Sandy Cove' },
  { name: 'NEON REEF 104.7', genre: 'Night Drive Synth', track: 'Reef Runner — Glasshouse' },
  { name: 'PIER TALK 88.9', genre: 'Coral Bay Nights', track: 'Dockside Stories — Old Salty' },
];

const UNIT_NAMES = [
  ['IBIS-43', 'RAMMING'], ['TARPON-10', 'PURSUIT'], ['HERON-19', 'SEARCH'],
  ['EGRET-07', 'FLANKING'], ['OSPREY-22', 'PURSUIT'], ['PELICAN-31', 'SEARCH'],
];

// Mission scripts. Each step: kind + target + HUD text. Rewards in $.
export const MISSIONS = [
  {
    id: 'M1', name: 'FIRST WHEELS', reward: 1200, startWanted: 0,
    brief: 'The sedan is waiting in the marina lot. Take it quiet — and bring it back to my garage in one piece.',
    steps: [
      { kind: 'goto', x: 8, z: -60, r: 6, stage: 'STAGE 1/3', title: 'REACH THE MARINA LOT', obj: 'Drive to the marina lot where the marked sedan is parked.', next: 'Reach the marina lot' },
      { kind: 'steal', x: 8, z: -60, r: 5, stage: 'STAGE 2/3', title: 'TAKE THE SEDAN', obj: 'Get in the marked green sedan and take it.', next: 'Press E by the sedan' },
      { kind: 'deliver', x: GARAGE.x, z: GARAGE.z, r: 7, stage: 'STAGE 3/3', title: 'DELIVER TO THE GARAGE', obj: 'Bring the sedan to Mara\u2019s garage at the south end.', next: 'Deliver to Mara\u2019s garage' },
    ],
  },
  {
    id: 'M2', name: 'DOWNTOWN MEET', reward: 2400, startWanted: 0,
    brief: 'A buyer waits downtown. It smells like a setup — keep the engine running and your eyes open.',
    steps: [
      { kind: 'goto', x: -24, z: -120, r: 6, stage: 'STAGE 1/3', title: 'DRIVE TO THE MEET', obj: 'Drive to the downtown meet on the west avenue.', next: 'Reach the meet point' },
      { kind: 'ambush', x: -24, z: -120, r: 0, stage: 'STAGE 2/3', title: 'SURVIVE THE AMBUSH', obj: 'Rivals are ramming and shooting! Ram them back or shoot them down.', next: 'Take out both rival cars' },
      { kind: 'goto', x: 0, z: 40, r: 7, stage: 'STAGE 3/3', title: 'ESCAPE THE BLOCK', obj: 'Break away and get clear of the downtown block.', next: 'Escape to Strand Boulevard' },
    ],
  },
  {
    id: 'M3', name: 'PACKAGE RUN', reward: 1800, startWanted: 0,
    brief: 'Four packages, four corners of the city. Collect them all, then bring them home to the garage.',
    steps: [
      { kind: 'collect', x: 6, z: -140, r: 4, stage: 'PACKAGE 1/4', title: 'COLLECT THE PACKAGES', obj: 'Pick up the package at the north end of Strand Boulevard.', next: 'Package 1 of 4' },
      { kind: 'collect', x: -6, z: 60, r: 4, stage: 'PACKAGE 2/4', title: 'COLLECT THE PACKAGES', obj: 'Pick up the package by the cross street.', next: 'Package 2 of 4' },
      { kind: 'collect', x: 6, z: 120, r: 4, stage: 'PACKAGE 3/4', title: 'COLLECT THE PACKAGES', obj: 'Pick up the package near the docks turn-off.', next: 'Package 3 of 4' },
      { kind: 'collect', x: -6, z: -40, r: 4, stage: 'PACKAGE 4/4', title: 'COLLECT THE PACKAGES', obj: 'Pick up the last package on the west side.', next: 'Package 4 of 4' },
      { kind: 'deliver', x: GARAGE.x, z: GARAGE.z, r: 7, stage: 'STAGE 2/2', title: 'DELIVER THE PACKAGES', obj: 'Bring all four packages to Mara\u2019s garage.', next: 'Deliver to the garage' },
    ],
  },
  {
    id: 'M4', name: 'LOSE THE HEAT', reward: 2000, startWanted: 3,
    brief: 'Three stars, kid. Get out of sight, sit still in the alley by the garage, and let the heat fade.',
    steps: [
      { kind: 'hide', x: HIDE_ZONE.x, z: HIDE_ZONE.z, r: 10, stage: 'STAGE 1/2', title: 'BREAK LINE OF SIGHT', obj: 'Reach the garage alley and stay out of sight until the heat fades.', next: 'Hide in the garage alley' },
    ],
  },
  {
    id: 'M5', name: 'THE BIG SCORE', reward: 5000, startWanted: 0,
    brief: 'There is a cash drop at the docks and five stars waiting for whoever grabs it. Grab it on foot, then vanish.',
    steps: [
      { kind: 'goto', x: -34, z: 136, r: 7, stage: 'STAGE 1/3', title: 'REACH THE DOCKS', obj: 'Drive to the container docks at the north end.', next: 'Reach the docks' },
      { kind: 'grab', x: -34, z: 140, r: 3, stage: 'STAGE 2/3', title: 'GRAB THE CASH ON FOOT', obj: 'Leave the car, walk to the cash drop and pick it up.', next: 'Grab the cash on foot' },
      { kind: 'deliver', x: PIER_BASE.x, z: PIER_BASE.z, r: 8, stage: 'STAGE 3/3', title: 'BRING IT TO PIER 9', obj: 'Bring the cash to Pier 9 — five stars will be on you.', next: 'Reach Pier 9' },
    ],
  },
  {
    id: 'M6', name: 'HARBOR RUN', reward: 2200, startWanted: 0,
    brief: 'The boat is waiting at the end of the pier. Walk out there and board the one nearest the south marina exit.',
    steps: [
      { kind: 'walkto', x: PIER_END.x, z: PIER_END.z, r: 4, stage: 'STAGE 1/2', title: 'WALK THE PIER', obj: 'Walk to the end of Pier 9 on foot.', next: 'Walk to the pier end' },
      { kind: 'board', x: PIER_END.x, z: PIER_END.z, r: 6, stage: 'STAGE 2/2', title: 'BOARD THE BOAT', obj: 'Board the boat nearest the south marina pier exit.', next: 'Board the boat' },
    ],
  },
  {
    id: 'M7', name: 'CROSS THE BAY', reward: 3000, startWanted: 0,
    brief: 'Take her across the bay to the south marina. Steady on the throttle — the water is calm if you are.',
    steps: [
      { kind: 'sail', x: SOUTH_MARINA.x, z: SOUTH_MARINA.z, r: 8, stage: 'STAGE 1/1', title: 'SAIL TO THE SOUTH MARINA', obj: 'Pilot the boat across the bay to the south marina.', next: 'Reach the south marina' },
    ],
  },
  {
    id: 'M8', name: 'CORAL CROWN', reward: 8000, startWanted: 0,
    brief: 'Last job. Leave the boat, reach the marina office, take the waiting car and run north. Finish this.',
    steps: [
      { kind: 'walkto', x: 58, z: 142, r: 4, stage: 'STAGE 1/3', title: 'REACH THE MARINA OFFICE', obj: 'Leave the boat and walk to the marina office on foot.', next: 'Reach the marina office' },
      { kind: 'takeCar', x: 20, z: 140, r: 5, stage: 'STAGE 2/3', title: 'TAKE THE WAITING CAR', obj: 'Get in the waiting car by the south marina lot.', next: 'Take the waiting car' },
      { kind: 'escape', x: 0, z: -160, r: 8, stage: 'STAGE 3/3', title: 'RUN NORTH AND VANISH', obj: 'Escape north up Strand Boulevard with four stars on you.', next: 'Escape to the north end' },
    ],
  },
];

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const dist = (ax, az, bx, bz) => Math.hypot(ax - bx, az - bz);
const angDiff = (a, b) => {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
};

export function createGame(ctx) {
  const { scene, refs, renderHud, showOverlay } = ctx;
  const THREE = ctx.THREE;

  // ---- world props the missions need ----
  const sedan = makeCivilianCar(0x2e8a6a);
  sedan.position.set(8, 0, -60);
  sedan.rotation.y = 0.2;
  scene.add(sedan);
  const waitingCar = makeCivilianCar(0x37b8a8);
  waitingCar.position.set(20, 0, 140);
  waitingCar.rotation.y = -0.4;
  scene.add(waitingCar);
  const taxiMesh = refs.traffic.find((t) => t.userData && t.position.z === -60 && t.position.x < 0) || refs.traffic[4];

  // objective beacon: gold ring + beam, moved to the current step target
  const beaconMat = new THREE.MeshBasicMaterial({ color: 0xffd76a, transparent: true, opacity: 0.85 });
  const beacon = new THREE.Group();
  const ring = new THREE.Mesh(new THREE.TorusGeometry(2.2, 0.18, 8, 28), beaconMat);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.25;
  beacon.add(ring);
  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(0.5, 0.5, 26, 10, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xffd76a, transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false }),
  );
  beam.position.y = 13;
  beacon.add(beam);
  scene.add(beacon);

  // package pickups (gold crates)
  const pkgMeshes = [];
  const pkgSpots = [[6, -140], [-6, 60], [6, 120], [-6, -40]];
  for (const [x, z] of pkgSpots) {
    const p = new THREE.Group();
    const crate = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.8, 1.1),
      new THREE.MeshStandardMaterial({ color: 0xffd76a, roughness: 0.4, metalness: 0.3, emissive: 0xa87800, emissiveIntensity: 0.5 }));
    crate.position.y = 0.55;
    crate.castShadow = true;
    p.add(crate);
    p.position.set(x, 0, z);
    scene.add(p);
    pkgMeshes.push(p);
  }
  // cash drop at the docks (M5)
  const cashMesh = new THREE.Group();
  const cashBox = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.7, 0.9),
    new THREE.MeshStandardMaterial({ color: 0x2ee66b, roughness: 0.35, metalness: 0.3, emissive: 0x1a8a3a, emissiveIntensity: 0.6 }));
  cashBox.position.y = 0.5;
  cashMesh.add(cashBox);
  cashMesh.position.set(-34, 0, 140);
  cashMesh.visible = false;
  scene.add(cashMesh);

  // rivals (M2 ambush) and police chasers, hidden until needed
  const rivals = [];
  for (let i = 0; i < 2; i++) {
    const r = makeCivilianCar(i === 0 ? 0x8a1a2a : 0x1a1a22);
    r.visible = false;
    scene.add(r);
    rivals.push({ mesh: r, hp: 3, active: false, shootT: 0 });
  }
  const chasers = [];
  for (let i = 0; i < 3; i++) {
    const c = makePoliceCar();
    c.visible = false;
    scene.add(c);
    chasers.push({ mesh: c, name: UNIT_NAMES[i][0], role: UNIT_NAMES[i][1], ramCd: 0 });
  }

  const state = {
    cash: 18450, mission: 0, step: 0, rp: 2180, rpMax: 5200, rank: 'C',
    packages: 0, pkgGot: [false, false, false, false],
    wanted: 0, health: 100, maxHealth: 100, armour: 64,
    topSpeed: 38, speedLvl: 0, healthLvl: 0,
    weapons: [
      { name: 'FISTS', ammo: Infinity, sel: false },
      { name: 'PISTOL', ammo: 60, sel: true },
      { name: 'SMG', ammo: 120, sel: false },
      { name: 'SHOTGUN', ammo: 18, sel: false },
    ],
    radio: 0, taxiEarned: 0, taxiMode: false,
    mode: 'car', vehicle: 'hero', boatIndex: -1,
    pos: { x: 0.6, z: 2 }, heading: 0.06, speed: 0,
    victory: false, failed: null, failReason: '',
    autopilot: false, hideT: 0, bustT: 0, kikiT: 0,
    crewCd: { mira: 0, lio: 0, kiki: 0 },
    missionStart: null, startTime: 0, playT: 0,
    chosenBoat: -1, hasCash: false, toast: '',
  };

  function mission() { return MISSIONS[state.mission]; }
  function step() { return mission() ? mission().steps[state.step] : null; }
  function toast(msg) { state.toast = msg; }

  function snapshotStart() {
    state.missionStart = {
      cash: state.cash, pos: { ...state.pos }, heading: state.heading,
      vehicle: state.vehicle, mode: state.mode, wanted: state.wanted,
      health: state.health, packages: state.packages, pkgGot: [...state.pkgGot],
    };
  }

  function startMission(i) {
    state.mission = i;
    state.step = 0;
    state.failed = null;
    state.victory = false;
    state.wanted = MISSIONS[i].startWanted;
    state.hideT = 0;
    state.hasCash = false;
    if (i === 4) cashMesh.visible = true; // M5 cash drop appears
    if (i === 1) spawnRivals();
    snapshotStart();
    placeBeacon();
    syncHud();
  }

  function spawnRivals() {
    rivals[0].mesh.position.set(-20, 0, -128);
    rivals[1].mesh.position.set(-28, 0, -112);
    rivals.forEach((r) => { r.hp = 3; r.active = true; r.mesh.visible = true; r.shootT = 1 + Math.random(); r.stun = 0; });
  }

  function placeBeacon() {
    const s = step();
    if (!s || s.kind === 'ambush') { beacon.visible = false; return; }
    beacon.visible = true;
    beacon.position.set(s.x, 0, s.z);
  }

  function advanceStep() {
    state.step++;
    if (state.step >= mission().steps.length) completeMission();
    else {
      // M8 finale: the escape leg runs under four stars
      if (state.mission === 7 && state.step === 2) state.wanted = 4;
      placeBeacon();
    }
    syncHud();
  }

  function completeMission() {
    const m = mission();
    state.cash += m.reward;
    state.rp = Math.min(state.rpMax, state.rp + 350);
    if (state.rp >= state.rpMax) { state.rank = 'B'; }
    // Mara's crew patches the car up between jobs
    state.health = state.maxHealth;
    // M1: Mara swaps you back into the Coral GT at the garage
    if (state.mission === 0 && state.vehicle === 'sedan') state.vehicle = 'hero';
    toast(`${m.id} COMPLETE — +$${m.reward.toLocaleString()}`);
    saveGame();
    if (state.mission >= MISSIONS.length - 1) {
      state.victory = true;
      showOverlay('victory', { cash: state.cash, time: Math.round(state.playT) });
    } else {
      startMission(state.mission + 1);
    }
    syncHud();
  }

  function fail(kind) {
    if (state.failed || state.victory) return;
    state.failed = kind;
    state.failReason = kind === 'wrecked' ? 'WRECKED' : 'BUSTED';
    state.autopilot = false;
    showOverlay('fail', { reason: state.failReason });
    syncHud();
  }

  function retry() {
    const s = state.missionStart;
    if (!s) { startMission(state.mission); return; }
    state.cash = s.cash;
    state.pos = { ...s.pos };
    state.heading = s.heading;
    state.vehicle = s.vehicle;
    state.mode = s.mode;
    state.wanted = s.wanted;
    state.health = state.maxHealth;
    state.packages = s.packages;
    state.pkgGot = [...s.pkgGot];
    state.step = 0;
    state.failed = null;
    state.hasCash = false;
    state.hideT = 0;
    state.bustT = 0;
    rivals.forEach((r) => { r.active = false; r.mesh.visible = false; });
    chasers.forEach((c) => { c.mesh.visible = false; });
    if (state.mission === 4) cashMesh.visible = true;
    if (state.mission === 1) spawnRivals();
    showOverlay('none');
    placeBeacon();
    syncHud();
  }

  // ---- save / load ----
  function saveGame() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify({
        cash: state.cash, mission: state.mission, step: state.step,
        packages: state.packages, pkgGot: state.pkgGot,
        upgrades: { speedLvl: state.speedLvl, healthLvl: state.healthLvl },
        weapons: state.weapons.map((w) => w.ammo),
        rp: state.rp, taxiEarned: state.taxiEarned,
        pos: state.pos, heading: state.heading, vehicle: state.vehicle, mode: state.mode,
      }));
    } catch { /* storage unavailable in some headless runs */ }
  }
  function loadGame() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return false;
      const d = JSON.parse(raw);
      state.cash = d.cash; state.mission = d.mission; state.step = d.step;
      state.packages = d.packages; state.pkgGot = d.pkgGot || [false, false, false, false];
      state.speedLvl = d.upgrades.speedLvl; state.healthLvl = d.upgrades.healthLvl;
      state.topSpeed = 38 + state.speedLvl * 4;
      state.maxHealth = 100 + state.healthLvl * 20;
      d.weapons.forEach((a, i) => { if (state.weapons[i] && a !== null) state.weapons[i].ammo = a; });
      state.rp = d.rp; state.taxiEarned = d.taxiEarned || 0;
      state.pos = d.pos; state.heading = d.heading;
      state.vehicle = d.vehicle; state.mode = d.mode;
      state.failed = null; state.victory = false;
      state.wanted = MISSIONS[state.mission].startWanted;
      state.health = state.maxHealth;
      pkgMeshes.forEach((m, i) => { m.visible = !state.pkgGot[i]; });
      if (state.mission === 4) cashMesh.visible = true;
      snapshotStart();
      placeBeacon();
      showOverlay('none');
      syncHud();
      return true;
    } catch { return false; }
  }

  // ---- shops / weapons / crew / radio ----
  function nearShop(kind) {
    const p = kind === 'gun' ? GUN_STORE : GARAGE;
    return dist(state.pos.x, state.pos.z, p.x, p.z) < 9;
  }
  function buyWeapon(name) {
    if (!nearShop('gun')) return { ok: false, why: 'not at the gun store' };
    const price = { pistol: 150, smg: 400, shotgun: 300 }[name];
    if (price === undefined) return { ok: false, why: 'unknown weapon' };
    if (state.cash < price) return { ok: false, why: 'not enough cash' };
    state.cash -= price;
    const w = state.weapons.find((x) => x.name.toLowerCase() === name);
    w.ammo += name === 'pistol' ? 60 : name === 'smg' ? 120 : 12;
    toast(`Bought ${name.toUpperCase()} ammo — $${price}`);
    syncHud();
    return { ok: true };
  }
  function buyUpgrade(kind) {
    if (!nearShop('garage')) return { ok: false, why: 'not at the garage' };
    if (kind === 'speed') {
      if (state.speedLvl >= 3) return { ok: false, why: 'maxed' };
      if (state.cash < 800) return { ok: false, why: 'not enough cash' };
      state.cash -= 800; state.speedLvl++;
      state.topSpeed = 38 + state.speedLvl * 4;
      toast(`Engine tuned — top speed now ${Math.round(state.topSpeed * 3.6)} km/h`);
    } else if (kind === 'health') {
      if (state.healthLvl >= 3) return { ok: false, why: 'maxed' };
      if (state.cash < 800) return { ok: false, why: 'not enough cash' };
      state.cash -= 800; state.healthLvl++;
      state.maxHealth = 100 + state.healthLvl * 20;
      state.health = state.maxHealth;
      toast(`Armour plating — max health now ${state.maxHealth}`);
    } else return { ok: false, why: 'unknown upgrade' };
    syncHud();
    return { ok: true };
  }
  function useCrew(who) {
    if (state.crewCd[who] > 0) return { ok: false, why: 'cooling down' };
    if (who === 'mira') { state.wanted = Math.max(0, state.wanted - 1); toast('Mira swapped the plates — heat down a star'); }
    else if (who === 'lio') { state.health = state.maxHealth; toast('Lio patched the car up — full condition'); }
    else if (who === 'kiki') { state.kikiT = 20; toast('Kiki is watching the CBPD channels — they lose you faster'); }
    else return { ok: false, why: 'unknown crew' };
    state.crewCd[who] = 30;
    syncHud();
    return { ok: true };
  }
  function nextRadio() {
    state.radio = (state.radio + 1) % STATIONS.length;
    syncHud();
    return STATIONS[state.radio];
  }
  function selectWeapon(i) {
    state.weapons.forEach((w, j) => { w.sel = j === i; });
    syncHud();
  }
  function shoot() {
    const w = state.weapons.find((x) => x.sel) || state.weapons[1];
    if (w.name !== 'FISTS' && w.ammo <= 0) { toast('Out of ammo — visit the gun store'); return { ok: false, why: 'no ammo' }; }
    if (w.name !== 'FISTS') w.ammo--;
    // hits a rival or chaser roughly ahead within 30 m
    for (const r of rivals) {
      if (!r.active) continue;
      const d = dist(state.pos.x, state.pos.z, r.mesh.position.x, r.mesh.position.z);
      if (d < 30) {
        const want = Math.atan2(-(r.mesh.position.x - state.pos.x), -(r.mesh.position.z - state.pos.z));
        if (Math.abs(angDiff(want, state.heading)) < 0.5) { damageRival(r, 1); break; }
      }
    }
    syncHud();
    return { ok: true, weapon: w.name, ammo: w.ammo };
  }
  function damageRival(r, n) {
    r.hp -= n;
    if (r.hp <= 0) {
      r.active = false;
      r.mesh.visible = false;
      toast('Rival taken out');
    } else {
      // shoved back a little and stunned — the ram lands, the chase ends
      const dx = r.mesh.position.x - state.pos.x;
      const dz = r.mesh.position.z - state.pos.z;
      const d = Math.hypot(dx, dz) || 1;
      r.mesh.position.x += (dx / d) * 3;
      r.mesh.position.z += (dz / d) * 3;
      r.stun = 2.5;
    }
  }

  // ---- enter / exit / taxi / boat ----
  function drivenMesh() {
    if (state.mode === 'boat') return refs.boats[state.boatIndex];
    if (state.vehicle === 'sedan') return sedan;
    if (state.vehicle === 'taxi') return taxiMesh;
    if (state.vehicle === 'waiting') return waitingCar;
    return refs.hero;
  }
  function tryEnterExit() {
    if (state.mode === 'car') {
      state.mode = 'foot';
      state.speed = 0;
      toast('On foot — E near a car to get in');
    } else if (state.mode === 'foot') {
      const near = [
        ['hero', refs.hero], ['sedan', sedan], ['taxi', taxiMesh], ['waiting', waitingCar],
      ].find(([, m]) => dist(state.pos.x, state.pos.z, m.position.x, m.position.z) < 5);
      if (near) {
        state.vehicle = near[0];
        state.mode = 'car';
        if (state.vehicle === 'taxi') state.taxiMode = true;
        else state.taxiMode = false;
        toast(state.vehicle === 'taxi' ? 'Taxi job — fares pay as you drive' : 'Back behind the wheel');
      } else toast('No car close enough');
    } else if (state.mode === 'boat') {
      state.mode = 'foot';
      state.boatIndex = -1;
      state.speed = 0;
    }
    syncHud();
  }
  function pickBoatForDestination() {
    // nearest the DESTINATION pier exit, never nearest the player
    let best = -1, bestD = Infinity;
    refs.boats.forEach((b, i) => {
      const d = dist(b.position.x, b.position.z, DEST_EXIT.x, DEST_EXIT.z);
      if (d < bestD) { bestD = d; best = i; }
    });
    return best;
  }
  function boardBoat() {
    const i = pickBoatForDestination();
    state.chosenBoat = i;
    state.boatIndex = i;
    state.mode = 'boat';
    state.vehicle = 'boat';
    state.pos.x = refs.boats[i].position.x;
    state.pos.z = refs.boats[i].position.z;
    state.speed = 0;
    toast('Aboard — cross the bay to the south marina');
    syncHud();
    return i;
  }

  // ---- autopilot: steer toward a point, returns virtual keys ----
  function steerTo(tx, tz, dt, maxSpeed) {
    const d = dist(state.pos.x, state.pos.z, tx, tz);
    const want = Math.atan2(-(tx - state.pos.x), -(tz - state.pos.z));
    const err = angDiff(want, state.heading);
    const steer = clamp(err * 1.6, -1, 1);
    let throttle = 0, brake = 0;
    if (Math.abs(err) > 1.2) { throttle = 0.6; }
    else if (d < 6) { throttle = 0.35; }
    else throttle = 1;
    if (d < 3) brake = 1;
    return { throttle, steer, brake, dist: d };
  }

  // On foot with a drive step ahead: walk to the nearest parked car and get in.
  function walkToCar(k, dt) {
    const cands = [refs.hero, sedan, taxiMesh, waitingCar];
    let best = null, bd = Infinity;
    for (const m of cands) {
      const d = dist(state.pos.x, state.pos.z, m.position.x, m.position.z);
      if (d < bd) { bd = d; best = m; }
    }
    if (bd < 5) tryEnterExit();
    else Object.assign(k, steerTo(best.position.x, best.position.z, dt, 6));
  }

  function autopilotStep(dt) {
    const s = step();
    if (!s || state.failed || state.victory) return { throttle: 0, steer: 0, brake: 1 };
    const k = { throttle: 0, steer: 0, brake: 0 };
    switch (s.kind) {
      case 'goto':
      case 'deliver':
      case 'escape': {
        if (state.mode === 'foot') { walkToCar(k, dt); break; }
        Object.assign(k, steerTo(s.x, s.z, dt, state.topSpeed));
        if (k.dist < s.r) advanceStep();
        break;
      }
      case 'steal': {
        if (state.mode === 'car') {
          Object.assign(k, steerTo(s.x, s.z, dt, state.topSpeed));
          if (k.dist < 5) { state.mode = 'foot'; state.speed = 0; }
          break;
        }
        // on foot by the sedan: take it
        if (dist(state.pos.x, state.pos.z, sedan.position.x, sedan.position.z) < 5) {
          state.vehicle = 'sedan'; state.mode = 'car'; state.speed = 0;
          state.taxiMode = false;
          toast('Sedan taken — get it to the garage');
          advanceStep();
        } else Object.assign(k, steerTo(s.x, s.z, dt, 6));
        break;
      }
      case 'ambush': {
        const alive = rivals.filter((r) => r.active);
        if (alive.length === 0) { advanceStep(); break; }
        const r = alive[0];
        Object.assign(k, steerTo(r.mesh.position.x, r.mesh.position.z, dt, state.topSpeed));
        if (k.dist < 4.5) damageRival(r, 1);
        else if (k.dist < 22 && Math.abs(angDiff(Math.atan2(-(r.mesh.position.x - state.pos.x), -(r.mesh.position.z - state.pos.z)), state.heading)) < 0.4) shoot();
        break;
      }
      case 'collect': {
        if (state.mode === 'foot') { walkToCar(k, dt); break; }
        Object.assign(k, steerTo(s.x, s.z, dt, state.topSpeed));
        if (k.dist < s.r) {
          const idx = pkgSpots.findIndex(([x, z]) => x === s.x && z === s.z);
          state.pkgGot[idx] = true; state.packages++;
          pkgMeshes[idx].visible = false;
          toast(`Package ${state.packages} of 4 collected`);
          advanceStep();
        }
        break;
      }
      case 'hide': {
        const d = dist(state.pos.x, state.pos.z, s.x, s.z);
        if (d > s.r) { Object.assign(k, steerTo(s.x, s.z, dt, state.topSpeed)); break; }
        if (Math.abs(state.speed) > 1.5) { k.brake = 1; break; }
        // hidden: heat fades
        state.hideT += dt;
        const rate = state.kikiT > 0 ? 2.5 : 4;
        if (state.hideT >= rate) { state.hideT = 0; state.wanted = Math.max(0, state.wanted - 1); syncHud(); }
        if (state.wanted === 0) advanceStep();
        break;
      }
      case 'grab': {
        if (state.mode === 'car') {
          Object.assign(k, steerTo(s.x, s.z, dt, state.topSpeed));
          if (k.dist < 7) { state.mode = 'foot'; state.speed = 0; }
          break;
        }
        Object.assign(k, steerTo(s.x, s.z, dt, 6));
        if (k.dist < s.r) {
          state.hasCash = true; cashMesh.visible = false;
          state.wanted = 5;
          toast('Cash grabbed — five stars, run!');
          advanceStep();
        }
        break;
      }
      case 'walkto': {
        if (state.mode === 'car' || state.mode === 'boat') {
          if (state.mode === 'boat') { state.mode = 'foot'; state.boatIndex = -1; state.speed = 0; }
          else { state.mode = 'foot'; state.speed = 0; }
          break;
        }
        Object.assign(k, steerTo(s.x, s.z, dt, 6));
        if (k.dist < s.r) advanceStep();
        break;
      }
      case 'board': {
        if (state.mode === 'car') { state.mode = 'foot'; state.speed = 0; break; }
        // chosen boat glides to the pier end, then board
        const bi = pickBoatForDestination();
        const b = refs.boats[bi];
        b.position.x += clamp(64 - b.position.x, -6 * dt, 6 * dt);
        b.position.z += clamp(-95 - b.position.z, -6 * dt, 6 * dt);
        Object.assign(k, steerTo(PIER_END.x, PIER_END.z, dt, 6));
        if (k.dist < 5 && dist(state.pos.x, state.pos.z, b.position.x, b.position.z) < 9) {
          boardBoat();
          advanceStep();
        }
        break;
      }
      case 'sail': {
        if (state.mode !== 'boat') break;
        Object.assign(k, steerTo(s.x, s.z, dt, 16));
        if (k.dist < s.r) advanceStep();
        break;
      }
      case 'takeCar': {
        if (state.mode === 'car' && state.vehicle === 'waiting') { advanceStep(); break; }
        if (state.mode === 'car') { state.mode = 'foot'; state.speed = 0; break; }
        if (dist(state.pos.x, state.pos.z, waitingCar.position.x, waitingCar.position.z) < 5) {
          state.vehicle = 'waiting'; state.mode = 'car'; state.speed = 0;
          state.taxiMode = false;
          toast('Waiting car taken — run north!');
          advanceStep();
        } else Object.assign(k, steerTo(s.x, s.z, dt, 6));
        break;
      }
      default: break;
    }
    return k;
  }

  // ---- police + wanted simulation ----
  function updatePolice(dt) {
    const want = state.wanted;
    const active = Math.min(want, 3);
    // hidden in the garage alley, engine off: the CBPD loses the trail
    const hidden = state.mission === 3 && Math.abs(state.speed) < 1.5 &&
      dist(state.pos.x, state.pos.z, HIDE_ZONE.x, HIDE_ZONE.z) < 10;
    chasers.forEach((c, i) => {
      if (i < active && !state.victory && !state.failed) {
        if (!c.mesh.visible) {
          c.mesh.visible = true;
          c.mesh.position.set(state.pos.x + 25 - i * 12, 0, state.pos.z + 30 + i * 8);
        }
        if (hidden) return; // searching elsewhere — no pursuit, no ram
        const d = dist(state.pos.x, state.pos.z, c.mesh.position.x, c.mesh.position.z);
        const sp = Math.min(30, Math.abs(state.speed) + 5);
        const wantA = Math.atan2(-(state.pos.x - c.mesh.position.x), -(state.pos.z - c.mesh.position.z));
        const cur = c.mesh.rotation.y;
        c.mesh.rotation.y = cur + angDiff(wantA, cur) * Math.min(1, dt * 2);
        c.mesh.position.x += -Math.sin(c.mesh.rotation.y) * sp * dt;
        c.mesh.position.z += -Math.cos(c.mesh.rotation.y) * sp * dt;
        c.ramCd -= dt;
        if (d < 4 && c.ramCd <= 0) {
          c.ramCd = 1.2;
          state.health -= state.mode === 'foot' ? 12 : 8;
          state.armour = Math.max(0, state.armour - 4);
          if (state.health <= 0) { state.health = 0; fail('wrecked'); }
          syncHud();
        }
        // busted on foot at high heat
        if (state.mode === 'foot' && want >= 4 && d < 3) {
          state.bustT += dt;
          if (state.bustT > 2) fail('busted');
        } else state.bustT = Math.max(0, state.bustT - dt);
      } else if (c.mesh.visible) {
        c.mesh.visible = false;
      }
    });
    // rivals shoot during the ambush
    for (const r of rivals) {
      if (!r.active) continue;
      r.shootT -= dt;
      const d = dist(state.pos.x, state.pos.z, r.mesh.position.x, r.mesh.position.z);
      if (r.shootT <= 0 && d < 26) {
        r.shootT = 2;
        state.health -= 3;
        if (state.health <= 0) { state.health = 0; fail('wrecked'); }
        syncHud();
      }
      // rivals creep toward the player, leashed to the meet block
      if (r.stun > 0) { r.stun -= dt; continue; }
      if (d > 6) {
        const wantA = Math.atan2(-(state.pos.x - r.mesh.position.x), -(state.pos.z - r.mesh.position.z));
        r.mesh.rotation.y = wantA;
        r.mesh.position.x += -Math.sin(wantA) * 7 * dt;
        r.mesh.position.z += -Math.cos(wantA) * 7 * dt;
      }
      // leash: never drag the fight out of the downtown block
      const ld = dist(r.mesh.position.x, r.mesh.position.z, -24, -120);
      if (ld > 30) {
        r.mesh.position.x += (-24 - r.mesh.position.x) / ld * 5 * dt;
        r.mesh.position.z += (-120 - r.mesh.position.z) / ld * 5 * dt;
      }
    }
  }

  // ---- main tick ----
  function tick(dt, keys) {
    if (state.victory || state.failed) return;
    state.playT += dt;
    for (const w of Object.keys(state.crewCd)) state.crewCd[w] = Math.max(0, state.crewCd[w] - dt);
    if (state.kikiT > 0) state.kikiT -= dt;

    let k = { throttle: 0, steer: 0, brake: 0 };
    if (state.autopilot) k = autopilotStep(dt);
    else {
      k.throttle = keys.KeyW || keys.ArrowUp ? 1 : 0;
      k.brake = keys.KeyS || keys.ArrowDown ? 1 : 0;
      k.steer = (keys.KeyA || keys.ArrowLeft ? 1 : 0) - (keys.KeyD || keys.ArrowRight ? 1 : 0);
      if (keys.Space) k.brake = 1;
    }

    const maxSp = state.mode === 'boat' ? 16 : state.mode === 'foot' ? 6 : state.topSpeed;
    const accel = state.mode === 'boat' ? 10 : state.mode === 'foot' ? 12 : 14;
    if (k.throttle) state.speed += accel * k.throttle * dt;
    if (k.brake) state.speed -= (state.mode === 'foot' ? 14 : 22) * dt;
    if (!k.throttle && !k.brake) state.speed *= Math.max(0, 1 - (state.mode === 'foot' ? 2.5 : 0.6) * dt);
    state.speed = clamp(state.speed, state.mode === 'foot' ? 0 : -8, maxSp);
    if (Math.abs(state.speed) > 0.2 || k.throttle) {
      // turn authority has a floor: the car must be able to swing around
      // from a standstill instead of crawling in a straight line
      const authority = Math.max(0.4, Math.min(1, Math.abs(state.speed) / 10));
      state.heading += k.steer * 0.6 * authority * dt * (state.speed >= 0 ? 1 : -1);
    }
    state.pos.x += -Math.sin(state.heading) * state.speed * dt;
    state.pos.z += -Math.cos(state.heading) * state.speed * dt;
    // keep inside the island (boats stay in the bay: x 58..200, z -170..170)
    if (state.mode === 'boat') {
      state.pos.x = clamp(state.pos.x, 58, 200);
      state.pos.z = clamp(state.pos.z, -170, 170);
    } else {
      state.pos.x = clamp(state.pos.x, -60, 70);
      state.pos.z = clamp(state.pos.z, -168, 168);
    }
    // taxi fares
    if (state.taxiMode && state.mode === 'car' && Math.abs(state.speed) > 1) {
      const earn = Math.abs(state.speed) * dt * 0.4;
      state.cash += earn;
      state.taxiEarned += earn;
    }
    // beacon pulse
    beacon.rotation.y += dt;
    ring.scale.setScalar(1 + Math.sin(state.playT * 3) * 0.08);

    updatePolice(dt);
    // heli follows the player at high wanted (free mode only; shots stage it)
    if (refs.heli && state.wanted >= 3 && !ctx.isShot) {
      refs.heli.position.x += (state.pos.x - refs.heli.position.x) * Math.min(1, dt * 0.5);
      refs.heli.position.z += (state.pos.z - 20 - refs.heli.position.z) * Math.min(1, dt * 0.5);
      refs.heli.position.y += (24 - refs.heli.position.y) * Math.min(1, dt * 0.5);
    }
    syncHudThrottled();
  }

  let lastHud = 0;
  function syncHudThrottled() {
    if (state.playT - lastHud > 0.12) { lastHud = state.playT; syncHud(); }
  }
  function syncHud() {
    if (!renderHud) return;
    const s = step();
    const police = chasers.filter((c) => c.mesh.visible).map((c) => ({
      name: c.name, role: c.role,
      d: Math.round(dist(state.pos.x, state.pos.z, c.mesh.position.x, c.mesh.position.z)),
    }));
    if (state.wanted >= 3) police.push({ name: 'HELI-2', role: 'AIR SUPPORT', d: 210 });
    renderHud({
      speedKmh: Math.abs(state.speed) * 3.6,
      wanted: state.wanted,
      cash: Math.floor(state.cash),
      health: Math.round(state.health),
      maxHealth: state.maxHealth,
      armour: state.armour,
      mission: mission() ? { id: mission().id, name: mission().name, reward: mission().reward } : null,
      stage: s ? s.stage : '',
      title: s ? s.title : '',
      obj: s ? s.obj : '',
      next: s ? s.next : '',
      police,
      rp: state.rp, rpMax: state.rpMax, rank: state.rank,
      weapons: state.weapons.map((w) => ({ name: w.name, ammo: w.ammo, sel: w.sel })),
      radio: STATIONS[state.radio],
      packages: state.packages, taxiEarned: state.taxiEarned,
      toast: state.toast,
      dialogue: mission() ? mission().brief : '',
      topSpeed: state.topSpeed,
      vehicle: state.vehicle,
    });
    state.toast = '';
  }

  function status() {
    const s = step();
    return {
      mission: state.mission, missionId: mission() ? mission().id : null,
      step: state.step, stage: s ? s.stage : null, title: s ? s.title : null,
      cash: Math.floor(state.cash), wanted: state.wanted,
      health: Math.round(state.health), maxHealth: state.maxHealth,
      packages: state.packages, pkgGot: [...state.pkgGot],
      topSpeed: state.topSpeed, speedLvl: state.speedLvl, healthLvl: state.healthLvl,
      weapons: state.weapons.map((w) => ({ name: w.name, ammo: w.ammo === Infinity ? 'inf' : w.ammo })),
      radio: STATIONS[state.radio].name, rp: state.rp, rank: state.rank,
      taxiEarned: Math.round(state.taxiEarned * 100) / 100,
      pos: { x: Math.round(state.pos.x * 10) / 10, z: Math.round(state.pos.z * 10) / 10 },
      heading: Math.round(state.heading * 100) / 100,
      speed: Math.round(state.speed * 100) / 100,
      speedKmh: Math.round(Math.abs(state.speed) * 3.6),
      mode: state.mode, vehicle: state.vehicle, boatIndex: state.boatIndex,
      chosenBoat: state.chosenBoat, hasCash: state.hasCash,
      victory: state.victory, failed: state.failed, failReason: state.failReason,
      autopilot: state.autopilot,
      police: chasers.filter((c) => c.mesh.visible).map((c) => c.name),
      heliVisible: !!(refs.heli && refs.heli.visible),
    };
  }

  // public API (also exposed as window.__GAME__ by main.js)
  const api = {
    state, tick, startMission, retry, fail, saveGame, loadGame,
    buyWeapon, buyUpgrade, useCrew, nextRadio, selectWeapon, shoot,
    tryEnterExit, boardBoat, pickBoatForDestination, drivenMesh,
    status, toast,
    setAutopilot(on) { state.autopilot = !!on; syncHud(); },
    teleport(x, z, heading) {
      state.pos.x = x; state.pos.z = z;
      if (heading !== undefined) state.heading = heading;
      state.speed = 0;
    },
    setCash(n) { state.cash = n; syncHud(); },
    setHealth(n) { state.health = n; syncHud(); },
    setWanted(n) { state.wanted = n; syncHud(); },
    setMission(i) { startMission(i); },
    setSpeedLvl(n) { state.speedLvl = n; state.topSpeed = 38 + n * 4; syncHud(); },
    damage(n) { state.health = Math.max(0, state.health - n); if (state.health <= 0) fail('wrecked'); syncHud(); },
    startTaxi() {
      if (dist(state.pos.x, state.pos.z, taxiMesh.position.x, taxiMesh.position.z) > 6) return { ok: false, why: 'not near the taxi' };
      state.vehicle = 'taxi'; state.mode = 'car'; state.taxiMode = true; state.speed = 0;
      toast('Taxi job — fares pay as you drive');
      syncHud();
      return { ok: true };
    },
    exitTaxi() { state.taxiMode = false; state.mode = 'foot'; state.speed = 0; syncHud(); },
  };

  startMission(0);
  return api;
}
