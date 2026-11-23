// Coral Bay Heat (rebuild v19) — replicate the exact side-check taxi
// sequence, then M3, to reproduce the packages failure.
import { spawn } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const CHROME = '/home/hatch/workspace/makefun/shot-tool/chrome/chrome-linux64/chrome';
const PORT = 8125;
const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function httpOk(url) {
  try { const r = await fetch(url, { method: 'HEAD' }); return r.ok; } catch { return false; }
}

const server = spawn(process.execPath, [join(root, 'serve.mjs'), String(PORT)], { stdio: 'ignore', detached: true });
for (let i = 0; i < 30; i++) { if (await httpOk(`http://127.0.0.1:${PORT}/index.html`)) break; await sleep(250); }
const chrome = spawn(CHROME, [
  '--headless=new', '--no-sandbox', '--disable-gpu-sandbox',
  '--use-angle=swiftshader', '--enable-unsafe-swiftshader',
  '--remote-debugging-port=9337', '--window-size=480,270', '--hide-scrollbars',
  '--user-data-dir=/tmp/cbh-probe-taxi-profile', 'about:blank',
], { stdio: 'ignore', detached: true });

try {
  let targets = null;
  for (let i = 0; i < 40; i++) {
    try { targets = await (await fetch('http://127.0.0.1:9337/json')).json(); break; } catch { await sleep(250); }
  }
  const page = targets.find((t) => t.type === 'page');
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  let id = 0;
  const pending = new Map();
  ws.onmessage = (e) => {
    const m = JSON.parse(e.data);
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
  };
  const send = (method, params = {}) => {
    const mid = ++id;
    ws.send(JSON.stringify({ id: mid, method, params }));
    return new Promise((res) => pending.set(mid, res));
  };
  const ev = async (expr) => {
    const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
    return r.result?.result?.value;
  };
  await send('Page.enable');
  await send('Runtime.enable');
  await send('Page.navigate', { url: `http://127.0.0.1:${PORT}/index.html?seed=1&ff=6` });
  for (let i = 0; i < 120; i++) {
    if ((await ev('window.__READY__ === true')) === true) break;
    await sleep(250);
  }
  // wheels: drive with KeyW (also dismisses the title)
  await ev(`window.dispatchEvent(new KeyboardEvent('keydown',{code:'KeyW'}))`);
  await sleep(2500);
  await ev(`window.dispatchEvent(new KeyboardEvent('keyup',{code:'KeyW'})); window.dispatchEvent(new KeyboardEvent('keydown',{code:'KeyS'}))`);
  await sleep(1500);
  await ev(`window.dispatchEvent(new KeyboardEvent('keyup',{code:'KeyS'}))`);
  // taxi: teleport, start, drive south 8 s
  await ev('window.__GAME__.teleport(12, -84, 0); window.__GAME__.startTaxi()');
  await ev(`window.dispatchEvent(new KeyboardEvent('keydown',{code:'KeyW'}))`);
  await sleep(8000);
  await ev(`window.dispatchEvent(new KeyboardEvent('keyup',{code:'KeyW'}))`);
  const st = await ev('window.__GAME__.status()');
  console.log(`after taxi: pos (${st.pos.x},${st.pos.z}) cash ${st.cash} taxiEarned ${st.taxiEarned} hp ${st.health}`);
  await ev('window.__GAME__.exitTaxi()');
  // packages: M3 with autopilot
  await ev('window.__GAME__.setMission(2); window.__GAME__.setAutopilot(true)');
  for (let i = 0; i < 12; i++) {
    const s = await ev('window.__GAME__.status()');
    console.log(`[${i * 5}s] ${s.missionId} step ${s.step} pkgs ${s.packages} hp ${s.health} pos (${s.pos.x},${s.pos.z}) speed ${(await ev('window.__GAME__.state.speed')).toFixed(1)}`);
    await sleep(5000);
  }
} finally {
  try { process.kill(-chrome.pid, 'SIGTERM'); } catch {}
  try { process.kill(-server.pid, 'SIGTERM'); } catch {}
}
