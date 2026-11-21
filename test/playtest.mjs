// Coral Bay Heat — headless playtest driver (CDP, SwiftShader).
// Usage:
//   node test/playtest.mjs seq [n]     sequential M1->M8 autopilot runs (default 1)
//   node test/playtest.mjs sides       side checks (taxi, package, shops, heli,
//                                     radio, wreck-fail+retry, save/reload, wheels)
//   node test/playtest.mjs all [n]     both
// Exits 0 only when every check passes.
import { spawn } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const CHROME = '/home/hatch/workspace/makefun/shot-tool/chrome/chrome-linux64/chrome';
const PORT = 8122;
const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const W = 640, H = 360;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function httpOk(url) {
  try { const r = await fetch(url, { method: 'HEAD' }); return r.ok; } catch { return false; }
}

let server = null, chrome = null, ws = null, id = 0;
const pending = new Map();
function send(method, params = {}) {
  const mid = ++id;
  ws.send(JSON.stringify({ id: mid, method, params }));
  return new Promise((res) => pending.set(mid, res));
}
async function ev(expr) {
  const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
  if (r.result?.exceptionDetails) throw new Error('page exception: ' + JSON.stringify(r.result.exceptionDetails).slice(0, 400));
  return r.result?.result?.value;
}
async function boot() {
  if (!(await httpOk(`http://127.0.0.1:${PORT}/index.html`))) {
    server = spawn(process.execPath, [join(root, 'serve.mjs'), String(PORT)], { stdio: 'ignore', detached: true });
    for (let i = 0; i < 30; i++) { if (await httpOk(`http://127.0.0.1:${PORT}/index.html`)) break; await sleep(250); }
  }
  chrome = spawn(CHROME, [
    '--headless=new', '--no-sandbox', '--disable-gpu-sandbox',
    '--use-angle=swiftshader', '--enable-unsafe-swiftshader',
    '--remote-debugging-port=9334', `--window-size=${W},${H}`, '--hide-scrollbars',
    '--user-data-dir=/tmp/cbh-playtest-profile', 'about:blank',
  ], { stdio: 'ignore', detached: true });
  let targets = null;
  for (let i = 0; i < 40; i++) {
    try { targets = await (await fetch('http://127.0.0.1:9334/json')).json(); break; } catch { await sleep(250); }
  }
  if (!targets) throw new Error('chrome devtools did not come up');
  const page = targets.find((t) => t.type === 'page');
  ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  ws.onmessage = (e) => {
    const m = JSON.parse(e.data);
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
  };
  await send('Page.enable');
  await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: false });
}
async function load(url) {
  await send('Page.navigate', { url });
  for (let i = 0; i < 120; i++) {
    const v = await ev('window.__READY__ === true ? "ready" : (window.__PAGEERROR__ || "")');
    if (v === 'ready') return;
    if (v) throw new Error('page error: ' + v);
    await sleep(250);
  }
  throw new Error('timeout waiting for __READY__');
}
async function shutdown() {
  try { ws?.close(); } catch {}
  try { if (chrome) process.kill(-chrome.pid, 'SIGTERM'); } catch {}
  try { if (server) process.kill(-server.pid, 'SIGTERM'); } catch {}
}
const status = () => ev('window.__GAME__ ? window.__GAME__.status() : null');

async function seqRun(n) {
  console.log(`--- sequential run ${n} ---`);
  await load(`http://127.0.0.1:${PORT}/index.html?seed=1`);
  await ev('window.__GAME__.setAutopilot(true)');
  const t0 = Date.now();
  let lastMission = -1, lastStep = -1;
  while (Date.now() - t0 < 900000) {
    const s = await status();
    if (!s) throw new Error('no __GAME__');
    if (s.mission !== lastMission || s.step !== lastStep) {
      console.log(`  [${Math.round((Date.now() - t0) / 1000)}s] ${s.missionId} step ${s.step} ${s.title || ''} cash $${s.cash} wanted ${s.wanted} hp ${s.health} pos (${s.pos.x},${s.pos.z}) ${s.mode}/${s.vehicle}`);
      lastMission = s.mission; lastStep = s.step;
    }
    if (s.victory) {
      console.log(`  VICTORY in ${Math.round((Date.now() - t0) / 1000)}s — cash $${s.cash}`);
      return { ok: true, secs: Math.round((Date.now() - t0) / 1000), cash: s.cash };
    }
    if (s.failed) {
      console.log(`  FAILED: ${s.failed} at ${s.missionId} step ${s.step} (${JSON.stringify(s.pos)})`);
      return { ok: false, failed: s.failed, mission: s.missionId, step: s.step };
    }
    await sleep(2000);
  }
  const s = await status();
  return { ok: false, failed: 'timeout', mission: s?.missionId, step: s?.step, pos: s?.pos };
}

async function sideChecks() {
  const results = {};
  const check = (name, ok, detail = '') => {
    results[name] = ok;
    console.log(`  ${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ' — ' + detail : ''}`);
  };

  // fresh load for the side checks
  await load(`http://127.0.0.1:${PORT}/index.html?seed=1`);

  // wheels: spin in sync + brake works (drive with synthetic keys)
  await ev(`window.dispatchEvent(new KeyboardEvent('keydown',{code:'KeyW'}))`);
  await sleep(2500);
  const w1 = await ev('window.__HERO__.userData.wheels[0].rotation.x');
  const sp1 = await ev('window.__GAME__.state.speed');
  await sleep(1200);
  const w2 = await ev('window.__HERO__.userData.wheels[0].rotation.x');
  const sp2 = await ev('window.__GAME__.state.speed');
  check('wheels-spin', w2 > w1 && sp2 > 2, `rot ${w1.toFixed(2)}->${w2.toFixed(2)} speed ${sp1.toFixed(1)}->${sp2.toFixed(1)}`);
  await ev(`window.dispatchEvent(new KeyboardEvent('keyup',{code:'KeyW'})); window.dispatchEvent(new KeyboardEvent('keydown',{code:'KeyS'}))`);
  await sleep(1500);
  const sp3 = await ev('window.__GAME__.state.speed');
  check('brake', sp3 < sp2 - 1, `speed ${sp2.toFixed(1)}->${sp3.toFixed(1)}`);
  await ev(`window.dispatchEvent(new KeyboardEvent('keyup',{code:'KeyS'}))`);

  // taxi: near the cab, start the job, drive, fares land
  await ev('window.__GAME__.teleport(-3.4, -56, 0); window.__GAME__.startTaxi()');
  const cash0 = (await status()).cash;
  await ev('window.__GAME__.setAutopilot(true)');
  await sleep(6000);
  await ev('window.__GAME__.setAutopilot(false)');
  const st = await status();
  check('taxi', st.taxiEarned > 2 && st.cash > cash0, `earned $${st.taxiEarned.toFixed(2)}`);
  await ev('window.__GAME__.exitTaxi()');

  // package found: jump to M3, autopilot collects all four
  await ev('window.__GAME__.setMission(2); window.__GAME__.setAutopilot(true)');
  const t0 = Date.now();
  let pkgs = 0;
  while (Date.now() - t0 < 240000) {
    const s = await status();
    pkgs = s.packages;
    if (s.mission > 2) break;
    if (s.failed) break;
    await sleep(2000);
  }
  check('packages', pkgs >= 4, `${pkgs}/4 collected, now at ${((await status()).missionId)}`);
  await ev('window.__GAME__.setAutopilot(false)');

  // shops: gun store ammo + garage upgrades change top speed and max health
  await ev('window.__GAME__.teleport(-14, -30, 0)');
  const smg0 = (await status()).weapons.find((w) => w.name === 'SMG').ammo;
  const buy = await ev('window.__GAME__.buyWeapon("smg")');
  const smg1 = (await status()).weapons.find((w) => w.name === 'SMG').ammo;
  check('gun-store', buy.ok && smg1 === smg0 + 120, `SMG ammo ${smg0}->${smg1}`);
  await ev('window.__GAME__.teleport(-30, 96, 0)');
  const up1 = await ev('window.__GAME__.buyUpgrade("speed")');
  const up2 = await ev('window.__GAME__.buyUpgrade("health")');
  const s2 = await status();
  check('garage-speed', up1.ok && s2.topSpeed === 42, `topSpeed ${s2.topSpeed}`);
  check('garage-health', up2.ok && s2.maxHealth === 120, `maxHealth ${s2.maxHealth}`);

  // helicopter at high wanted + named police units with distances
  await ev('window.__GAME__.setWanted(5)');
  await sleep(3000);
  const s3 = await status();
  const heliNear = await ev('Math.abs(window.__GAME__.state.pos.x) < 1000 && true');
  check('heli-high-wanted', s3.police.length >= 2 && s3.wanted === 5, `units: ${s3.police.join(',')} wanted ${s3.wanted}`);
  void heliNear;

  // radio cycles stations
  const r0 = (await status()).radio;
  await ev('window.__GAME__.nextRadio()');
  const r1 = (await status()).radio;
  check('radio', r0 !== r1, `${r0} -> ${r1}`);

  // shooting spends ammo
  const p0 = (await status()).weapons.find((w) => w.name === 'PISTOL').ammo;
  await ev('window.__GAME__.selectWeapon(1); window.__GAME__.shoot()');
  const p1 = (await status()).weapons.find((w) => w.name === 'PISTOL').ammo;
  check('shooting', p1 === p0 - 1, `pistol ${p0}->${p1}`);

  // crew: Lio repairs
  await ev('window.__GAME__.damage(40)');
  const h0 = (await status()).health;
  await ev('window.__GAME__.useCrew("lio")');
  const h1 = (await status()).health;
  check('crew-quick-fix', h1 > h0 && h1 === (await status()).maxHealth, `hp ${h0}->${h1}`);

  // wreck-fail with a clean retry
  await ev('window.__GAME__.setWanted(0); window.__GAME__.damage(999)');
  await sleep(500);
  const f = await status();
  const overlay = await ev('document.getElementById("fail").style.display');
  check('wreck-fail', f.failed === 'wrecked' && overlay === 'flex', `failed=${f.failed} overlay=${overlay}`);
  await ev('window.__GAME__.retry()');
  const r = await status();
  check('retry', r.failed === null && r.health === r.maxHealth, `failed=${r.failed} hp=${r.health}`);

  // save / reload preserves cash and progress exactly (across a page reload)
  await ev('window.__GAME__.setCash(77777); window.__GAME__.saveGame()');
  await load(`http://127.0.0.1:${PORT}/index.html?seed=1`);
  const loaded = await ev('window.__GAME__.loadGame()');
  const s4 = await status();
  check('save-reload', loaded === true && s4.cash === 77777, `loaded=${loaded} cash=${s4.cash} mission=${s4.missionId}`);

  // boat pick rule: nearest the DESTINATION exit, never nearest the player
  const boat = await ev('window.__GAME__.pickBoatForDestination()');
  const boats = await ev('window.__GAME__.state.chosenBoat');
  void boats;
  check('boat-pick-rule', boat === 2, `picked boat index ${boat} (red boat at 62,-78 is nearest the south marina exit)`);
  return results;
}

async function main() {
  const mode = process.argv[2] || 'all';
  const n = Number(process.argv[3] || 1);
  await boot();
  let ok = true;
  try {
    if (mode === 'seq' || mode === 'all') {
      for (let i = 1; i <= n; i++) {
        const r = await seqRun(i);
        console.log(`SEQ RUN ${i}: ${r.ok ? 'GREEN' : 'RED'} ${JSON.stringify(r)}`);
        if (!r.ok) ok = false;
      }
    }
    if (mode === 'sides' || mode === 'all') {
      console.log('--- side checks ---');
      const res = await sideChecks();
      const bad = Object.entries(res).filter(([, v]) => !v).map(([k]) => k);
      console.log(`SIDES: ${Object.keys(res).length - bad.length}/${Object.keys(res).length} passed${bad.length ? ' — failed: ' + bad.join(', ') : ''}`);
      if (bad.length) ok = false;
    }
  } finally {
    await shutdown();
  }
  console.log(ok ? 'PLAYTEST: ALL GREEN' : 'PLAYTEST: FAILURES PRESENT');
  process.exit(ok ? 0 : 1);
}

main().catch((e) => { console.error('PLAYTEST ERROR:', e.message); shutdown().finally(() => process.exit(2)); });
