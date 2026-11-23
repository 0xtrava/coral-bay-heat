// Coral Bay Heat (rebuild v19) — headless capture via Chrome DevTools.
// Usage: node capture.mjs [shot] [outpath]
//   shot: cover | shootout | map | title | all   (default: cover)
// Loads the game in headless Chrome with SwiftShader, waits for
// window.__READY__, screenshots 1280x720, and refreshes screenshots/
// beside this file so no stale shot survives.
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync, copyFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const CHROME = '/home/hatch/workspace/makefun/shot-tool/chrome/chrome-linux64/chrome';
const PORT = 8121;
const here = dirname(fileURLToPath(import.meta.url));
const shotArg = process.argv[2] || 'cover';
const outArg = process.argv[3];
const shots = shotArg === 'all' ? ['cover', 'shootout', 'map', 'title'] : [shotArg];
const NAMES = { cover: '1-cover.jpg', shootout: '2-shootout.jpg', map: '3-map.jpg', title: '4-title.jpg' };

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function httpOk(url) {
  try { const r = await fetch(url, { method: 'HEAD' }); return r.ok; } catch { return false; }
}

async function main() {
  let server = null;
  if (!(await httpOk(`http://127.0.0.1:${PORT}/index.html`))) {
    server = spawn(process.execPath, [join(here, 'serve.mjs'), String(PORT)], { stdio: 'ignore', detached: true });
    for (let i = 0; i < 30; i++) {
      if (await httpOk(`http://127.0.0.1:${PORT}/index.html`)) break;
      await sleep(250);
    }
  }
  const chrome = spawn(CHROME, [
    '--headless=new', '--no-sandbox', '--disable-gpu-sandbox',
    '--use-angle=swiftshader', '--enable-unsafe-swiftshader',
    '--remote-debugging-port=9333',
    '--window-size=1280,720', '--hide-scrollbars',
    '--user-data-dir=/tmp/cbh-chrome-profile', 'about:blank',
  ], { stdio: 'ignore', detached: true });

  try {
    let targets = null;
    for (let i = 0; i < 40; i++) {
      try { targets = await (await fetch('http://127.0.0.1:9333/json')).json(); break; } catch { await sleep(250); }
    }
    if (!targets) throw new Error('chrome devtools did not come up');
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
    await send('Page.enable');
    await send('Runtime.enable');
    await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 720, deviceScaleFactor: 1, mobile: false });

    for (const shot of shots) {
      const url = `http://127.0.0.1:${PORT}/index.html?shot=${shot}&seed=1`;
      await send('Page.navigate', { url });
      let ready = false, pageError = null;
      for (let i = 0; i < 120; i++) {
        const r = await send('Runtime.evaluate', { expression: 'window.__READY__ === true ? "ready" : (window.__PAGEERROR__ || "")', returnByValue: true });
        const v = r.result?.result?.value;
        if (v === 'ready') { ready = true; break; }
        if (v) { pageError = v; break; }
        await sleep(250);
      }
      if (pageError) throw new Error(`page error on ${shot}: ${pageError}`);
      if (!ready) throw new Error(`timeout waiting for __READY__ on ${shot}`);
      await sleep(600);
      const snap = await send('Page.captureScreenshot', { format: 'jpeg', quality: 88 });
      const data = Buffer.from(snap.result.data, 'base64');
      const outDir = join(here, 'out', 'screenshots');
      mkdirSync(outDir, { recursive: true });
      const outPath = outArg && shots.length === 1 ? outArg : join(outDir, NAMES[shot]);
      writeFileSync(outPath, data);
      console.log(`OK ${shot} -> ${outPath} (${data.length} bytes)`);
      const dossierPath = join(here, 'screenshots', NAMES[shot]);
      mkdirSync(join(here, 'screenshots'), { recursive: true });
      copyFileSync(outPath, dossierPath);
      console.log(`   copied -> ${dossierPath}`);
    }
    ws.close();
  } finally {
    try { process.kill(-chrome.pid, 'SIGTERM'); } catch {}
    if (server) { try { process.kill(-server.pid, 'SIGTERM'); } catch {} }
  }
}

main().catch((e) => { console.error('CAPTURE FAILED:', e.message); process.exit(1); });
