// Focused M2 ambush probe: jump to M2, autopilot on, log the fight.
// Recovery round 21 (2026-11-21): unchanged behaviour, witnessed rebuild.
import { spawn } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const CHROME = '/home/hatch/workspace/makefun/shot-tool/chrome/chrome-linux64/chrome';
const PORT = 8123;
const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
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
  return r.result?.result?.value;
}
async function main() {
  if (!(await httpOk(`http://127.0.0.1:${PORT}/index.html`))) {
    server = spawn(process.execPath, [join(root, 'serve.mjs'), String(PORT)], { stdio: 'ignore', detached: true });
    for (let i = 0; i < 30; i++) { if (await httpOk(`http://127.0.0.1:${PORT}/index.html`)) break; await sleep(250); }
  }
  chrome = spawn(CHROME, ['--headless=new', '--no-sandbox', '--disable-gpu-sandbox',
    '--use-angle=swiftshader', '--enable-unsafe-swiftshader',
    '--remote-debugging-port=9335', '--window-size=480,270', '--hide-scrollbars',
    '--user-data-dir=/tmp/cbh-probe-profile', 'about:blank'], { stdio: 'ignore', detached: true });
  let targets = null;
  for (let i = 0; i < 40; i++) {
    try { targets = await (await fetch('http://127.0.0.1:9335/json')).json(); break; } catch { await sleep(250); }
  }
  const page = targets.find((t) => t.type === 'page');
  ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  ws.onmessage = (e) => {
    const m = JSON.parse(e.data);
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
  };
  await send('Page.enable');
  await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 480, height: 270, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: `http://127.0.0.1:${PORT}/index.html?seed=1&ff=6` });
  for (let i = 0; i < 120; i++) {
    const v = await ev('window.__READY__ === true ? "ready" : (window.__PAGEERROR__ || "")');
    if (v === 'ready') break;
    if (v) throw new Error('page error: ' + v);
    await sleep(250);
  }
  await sleep(3000);
  await ev('window.__GAME__.setMission(1); window.__GAME__.setAutopilot(true)');
  const t0 = Date.now();
  while (Date.now() - t0 < 300000) {
    const s = await ev('window.__GAME__.status()');
    const r0 = s.rivals[0], r1 = s.rivals[1];
    const d0 = Math.hypot(s.pos.x - r0.x, s.pos.z - r0.z).toFixed(1);
    const d1 = Math.hypot(s.pos.x - r1.x, s.pos.z - r1.z).toFixed(1);
    console.log(`[${Math.round((Date.now() - t0) / 1000)}s] ${s.missionId} st${s.step} hp${s.health} pos(${s.pos.x},${s.pos.z}) spd${s.speed} | R0 hp${r0.hp} ${r0.active ? 'live' : 'dead'} (${r0.x},${r0.z}) d${d0} | R1 hp${r1.hp} ${r1.active ? 'live' : 'dead'} (${r1.x},${r1.z}) d${d1}`);
    if (s.mission > 1 || s.failed) { console.log('OUTCOME:', s.mission > 1 ? 'ambush cleared' : 'failed ' + s.failed); break; }
    await sleep(5000);
  }
  try { ws.close(); } catch {}
  try { process.kill(-chrome.pid, 'SIGTERM'); } catch {}
  try { if (server) process.kill(-server.pid, 'SIGTERM'); } catch {}
  process.exit(0);
}
main().catch((e) => { console.error('PROBE ERROR:', e.message); process.exit(2); });
