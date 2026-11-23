// Screenshot capture for Coral Bay Heat: loads each staged shot in
// headless Chrome and saves it to out/screenshots/ + screenshots/.
// Usage: node capture.mjs [all|cover|shootout|map|title]
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { launchChrome, connectPage } from './test/cdp.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)));
const PORT = 8091;
const CDP_PORT = 9333;
const SHOTS = [
  { shot: 'cover', file: '1-cover.jpg' },
  { shot: 'shootout', file: '2-shootout.jpg' },
  { shot: 'map', file: '3-map.jpg' },
  { shot: 'title', file: '4-title.jpg' },
];

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

const want = process.argv[2] || 'all';
const list = want === 'all' ? SHOTS : SHOTS.filter((s) => s.shot === want);
if (list.length === 0) {
  console.error(`unknown shot: ${want} (cover|shootout|map|title|all)`);
  process.exit(2);
}

const server = spawn(process.execPath, ['serve.mjs', String(PORT)], { cwd: ROOT, stdio: 'ignore' });
let chrome = null;
try {
  await waitForServer(`http://localhost:${PORT}/game/index.html`);
  const launched = await launchChrome(CDP_PORT);
  chrome = launched.chrome;
  const page = await connectPage(CDP_PORT);
  await page.open();
  for (const s of list) {
    const url = `http://localhost:${PORT}/game/index.html?shot=${s.shot}&seed=1`;
    await page.navigate(url);
    await page.waitForReady(60000);
    // one extra beat so the settle frames and the heli drift land
    await sleep(3000);
    const outFile = path.join(ROOT, 'out', 'screenshots', s.file);
    await page.screenshot(outFile);
    const finalFile = path.join(ROOT, 'screenshots', s.file);
    fs.mkdirSync(path.dirname(finalFile), { recursive: true });
    fs.copyFileSync(outFile, finalFile);
    const size = fs.statSync(finalFile).size;
    console.log(`${s.shot}: ${finalFile} (${size} bytes)`);
  }
  page.close();
} finally {
  if (chrome) chrome.kill();
  server.kill();
}
console.log('capture done');
