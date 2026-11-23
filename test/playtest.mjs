// Playtest for Coral Bay Heat: the full contract — the autopilot SEQ
// (M1→M8 to VICTORY, $44,050) plus 15 side checks. Exits 0 when every
// run is green, 1 otherwise.
// Usage: node test/playtest.mjs [all|seq|sides] [runs]   (default: all 1)
//   all 2  → the whole suite twice: 2/2 GREEN + 15/15 sides per run.
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { launchChrome, connectPage } from './cdp.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 8092;
const CDP_PORT = 9334;
const BASE = `http://localhost:${PORT}/game/index.html?seed=1&ff=6`;
const VICTORY_CASH = 44050;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitForServer(url, timeoutMs = 15000) {
  const start = Date.now();
  for (;;) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch { /* not up yet */ }
    if (Date.now() - start > timeoutMs) throw new Error('server did not come up');
    await sleep(250);
  }
}

const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok: !!ok, detail });
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
  return !!ok;
}

// ---- the autopilot SEQ: M1→M8 to VICTORY ----
async function runSeq(page) {
  console.log('SEQ: autopilot M1→M8');
  await page.navigate(BASE);
  await page.waitForReady(60000);
  const err0 = await page.evaluate(`window.__PAGEERROR__ || null`);
  if (err0) return check('seq-page-loads', false, `page error: ${err0}`);
  await page.evaluate(`window.__GAME__.setAutopilot(true)`);
  const start = Date.now();
  let last = null;
  for (;;) {
    const s = await page.evaluate(`window.__GAME__.status()`);
    last = s;
    if (s.victory) break;
    if (s.failed) {
      return check('seq-victory', false,
        `failed=${s.failed} at ${s.missionId} step ${s.step + 1}/${s.steps}, cash $${s.cash}, health ${s.health}`);
    }
    if (Date.now() - start > 300000) {
      return check('seq-victory', false,
        `timeout at ${s.missionId} step ${s.step + 1}/${s.steps}, cash $${s.cash}, health ${s.health}, wanted ${s.wanted}, pos (${s.pos.x},${s.pos.z})`);
    }
    await sleep(2000);
  }
  const s = last;
  return check('seq-victory', s.cash === VICTORY_CASH,
    `VICTORY cash $${s.cash} (expected $${VICTORY_CASH}), ${s.missionId} done, health ${s.health}`);
}

// ---- the 15 side checks ----
async function runSides(page) {
  console.log('SIDES: 15 checks');
  await page.navigate(BASE);
  await page.waitForReady(60000);
  const ev = (expr) => page.evaluate(expr);

  // 1. wheels spin when the car drives
  await ev(`window.__GAME__.startPlay(); window.__GAME__.teleport(12, -84, 0)`);
  const w0 = await ev(`window.__HERO__.userData.wheels[0].rotation.x`);
  await page.holdKey('KeyW', 1000);
  const w1 = await ev(`window.__HERO__.userData.wheels[0].rotation.x`);
  const sp1 = await ev(`window.__GAME__.state.speed`);
  check('wheels-spin', w1 > w0 + 1 && sp1 > 5,
    `wheel rotation ${w0.toFixed(1)} → ${w1.toFixed(1)}, speed ${sp1.toFixed(1)}`);

  // 2. braking slows the car
  await ev(`window.__GAME__.teleport(12, -84, 0)`);
  await page.holdKey('KeyW', 1000);
  const b0 = await ev(`window.__GAME__.state.speed`);
  await page.holdKey('KeyS', 1000);
  const b1 = await ev(`window.__GAME__.state.speed`);
  check('brake', b1 < b0 - 5, `speed ${b0.toFixed(1)} → ${b1.toFixed(1)}`);

  // 3. taxi meter earns while driving
  const cash0 = await ev(`window.__GAME__.status().cash`);
  await ev(`window.__GAME__.teleport(12, -84, 0); window.__GAME__.startTaxi()`);
  await page.holdKey('KeyW', 2000);
  await ev(`window.__GAME__.exitTaxi()`);
  const taxi = await ev(`({ earned: window.__GAME__.taxiEarned, cash: window.__GAME__.status().cash })`);
  check('taxi', taxi.earned > 2 && taxi.cash > cash0,
    `earned $${taxi.earned.toFixed(2)}, cash $${cash0} → $${taxi.cash}`);

  // 4. four packages (M3) via the autopilot
  await ev(`window.__GAME__.teleport(0, 0, 0); window.__GAME__.setMission(2); window.__GAME__.setAutopilot(true)`);
  let pkgs = 0;
  const pStart = Date.now();
  for (;;) {
    pkgs = await ev(`window.__GAME__.status().packages`);
    if (pkgs >= 4) break;
    if (Date.now() - pStart > 120000) break;
    await sleep(1000);
  }
  await ev(`window.__GAME__.setAutopilot(false)`);
  check('packages-4-4', pkgs === 4, `packages ${pkgs}/4`);

  // 5. gun store: SMG costs $200, ammo +120
  await ev(`window.__GAME__.setCash(5000); window.__GAME__.teleport(12, -42, 0)`);
  const gun = await ev(`(() => { const r = window.__GAME__.buyWeapon("smg"); const w = window.__GAME__.status().weapons.find((x) => x.name === "SMG"); return { ok: r.ok, ammo: w.ammo }; })()`);
  check('gun-store', gun.ok === true && gun.ammo === 120, `ok=${gun.ok}, SMG ammo ${gun.ammo}`);

  // 6. garage: speed upgrade → topSpeed 42
  await ev(`window.__GAME__.setCash(5000); window.__GAME__.teleport(-24, 96, 0)`);
  const spd = await ev(`(() => { const r = window.__GAME__.buyUpgrade("speed"); return { ok: r.ok, top: window.__GAME__.status().topSpeed }; })()`);
  check('garage-speed', spd.ok === true && spd.top === 42, `ok=${spd.ok}, topSpeed ${spd.top}`);

  // 7. garage: health upgrade → maxHealth 120
  const hp = await ev(`(() => { const r = window.__GAME__.buyUpgrade("health"); const s = window.__GAME__.status(); return { ok: r.ok, max: s.maxHealth }; })()`);
  check('garage-health', hp.ok === true && hp.max === 120, `ok=${hp.ok}, maxHealth ${hp.max}`);

  // 8. high wanted: police + heli respond
  await ev(`window.__GAME__.setWanted(5)`);
  await sleep(2000);
  const heat = await ev(`(() => { const s = window.__GAME__.status(); return { units: s.police.length, wanted: s.wanted }; })()`);
  check('heli-high-wanted', heat.units >= 2 && heat.wanted >= 4,
    `${heat.units} units, wanted ${heat.wanted}`);
  await ev(`window.__GAME__.setWanted(0)`);

  // 9. radio cycles to the next station
  const radio = await ev(`(() => { const a = window.__GAME__.status().radio; const n = window.__GAME__.nextRadio(); const b = window.__GAME__.status().radio; return { a, n, b }; })()`);
  check('radio', typeof radio.n === 'string' && radio.n.length > 0 && radio.b !== radio.a,
    `${radio.a} → ${radio.b}`);

  // 10. shooting on foot: PISTOL ammo -1
  await ev(`window.__GAME__.toggleVehicle(); window.__GAME__.selectWeapon(1)`);
  const veh = await ev(`window.__GAME__.status().vehicle`);
  const ammo = await ev(`(() => { const a = window.__GAME__.status().weapons[1].ammo; window.__GAME__.shoot(); const b = window.__GAME__.status().weapons[1].ammo; return { a, b }; })()`);
  check('shooting', veh === 'foot' && ammo.b === ammo.a - 1,
    `vehicle ${veh}, PISTOL ammo ${ammo.a} → ${ammo.b}`);
  await ev(`window.__GAME__.toggleVehicle()`);

  // 11. crew quick fix: Lio restores full health
  const crew = await ev(`(() => { window.__GAME__.damage(40); const hurt = window.__GAME__.status().health; window.__GAME__.useCrew("lio"); const healed = window.__GAME__.status().health; const max = window.__GAME__.status().maxHealth; return { hurt, healed, max }; })()`);
  check('crew-quick-fix', crew.healed === crew.max && crew.hurt < crew.max,
    `health ${crew.hurt} → ${crew.healed} (max ${crew.max})`);

  // 12. wrecked: fail overlay shows
  const wreck = await ev(`(() => { window.__GAME__.damage(999); const s = window.__GAME__.status(); const disp = document.getElementById('fail-screen').style.display; return { failed: s.failed, disp }; })()`);
  check('wreck-fail', wreck.failed === 'wrecked' && wreck.disp === 'flex',
    `failed=${wreck.failed}, #fail display=${wreck.disp}`);

  // 13. retry puts the player back in the car
  const ret = await ev(`(() => { window.__GAME__.retry(); const s = window.__GAME__.status(); return { mode: s.mode, health: s.health, max: s.maxHealth, failed: s.failed }; })()`);
  check('retry', ret.mode === 'playing' && ret.health === ret.max && ret.failed === null,
    `mode ${ret.mode}, health ${ret.health}/${ret.max}, failed=${ret.failed}`);

  // 14. save + reload: cash survives
  const saved = await ev(`(() => { window.__GAME__.setCash(7777); return window.__GAME__.saveGame(); })()`);
  await page.reload();
  await page.waitForReady(60000);
  const loaded = await ev(`(() => { const ok = window.__GAME__.loadGame(); return { ok, cash: window.__GAME__.status().cash }; })()`);
  check('save-reload', saved === true && loaded.ok === true && loaded.cash === 7777,
    `saved=${saved}, loaded=${loaded.ok}, cash $${loaded.cash}`);

  // 15. the boat pick rule: RED TIDE (index 2) is nearest the exit
  const boat = await ev(`window.__GAME__.pickBoatForDestination()`);
  check('boat-pick-rule', boat === 2, `pickBoatForDestination() = ${boat}`);
}

// ---- main ----
const suite = process.argv[2] || 'all';
const runs = Number(process.argv[3] || '1');
if (!['all', 'seq', 'sides'].includes(suite) || !Number.isInteger(runs) || runs < 1) {
  console.error('usage: node test/playtest.mjs [all|seq|sides] [runs]');
  process.exit(2);
}

const server = spawn(process.execPath, ['serve.mjs', String(PORT)], { cwd: ROOT, stdio: 'ignore' });
let chrome = null;
let exitCode = 0;
try {
  await waitForServer(`http://localhost:${PORT}/game/index.html`);
  const launched = await launchChrome(CDP_PORT);
  chrome = launched.chrome;
  const page = await connectPage(CDP_PORT);
  await page.open();

  for (let run = 1; run <= runs; run++) {
    console.log(`\n=== RUN ${run}/${runs} (${suite}) ===`);
    results.length = 0;
    if (suite === 'all' || suite === 'seq') {
      await runSeq(page);
    }
    if (suite === 'all' || suite === 'sides') {
      await runSides(page);
    }
    const passed = results.filter((r) => r.ok).length;
    const total = results.length;
    const sidesPassed = results.filter((r) => r.ok && r.name !== 'seq-victory').length;
    const sidesTotal = results.filter((r) => r.name !== 'seq-victory').length;
    console.log(`--- run ${run}: ${passed}/${total} checks green (sides ${sidesPassed}/${sidesTotal}) ---`);
    if (passed !== total) exitCode = 1;
  }
  page.close();
} finally {
  if (chrome) chrome.kill();
  server.kill();
}
console.log(exitCode === 0 ? '\nPLAYTEST GREEN' : '\nPLAYTEST RED');
process.exit(exitCode);
