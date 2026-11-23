// Minimal headless-Chrome driver over the DevTools protocol, using
// Node's built-in WebSocket — no npm install, no puppeteer. The
// playtest and the capture script share it.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export const CHROME = '/home/hatch/workspace/makefun/shot-tool/chrome/chrome-linux64/chrome';
export const VIEWPORT = { width: 1280, height: 720 };

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function launchChrome(port) {
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'coral-bay-chrome-'));
  const chrome = spawn(CHROME, [
    '--headless=new',
    '--no-sandbox',
    '--disable-gpu',
    '--mute-audio',
    '--hide-scrollbars',
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${userDataDir}`,
    `--window-size=${VIEWPORT.width},${VIEWPORT.height}`,
  ], { stdio: 'ignore' });
  for (let i = 0; i < 60; i++) {
    try {
      const res = await fetch(`http://localhost:${port}/json/version`);
      if (res.ok) return { chrome, userDataDir };
    } catch {
      // not up yet
    }
    await sleep(250);
  }
  chrome.kill();
  throw new Error('chrome did not come up on the devtools port');
}

export async function connectPage(port) {
  const res = await fetch(`http://localhost:${port}/json/list`);
  const targets = await res.json();
  const page = targets.find((t) => t.type === 'page');
  if (!page) throw new Error('no page target');
  return new Page(page.webSocketDebuggerUrl);
}

const KEYCODES = {
  KeyW: 87, KeyA: 65, KeyS: 83, KeyD: 68, KeyE: 69, KeyM: 77,
  KeyR: 82, KeyF: 70, ArrowUp: 38, ArrowDown: 40, ArrowLeft: 37, ArrowRight: 39,
  Digit1: 49, Digit2: 50, Digit3: 51, Digit4: 52, Enter: 13, Escape: 27, Space: 32,
};

export class Page {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.nextId = 1;
    this.pending = new Map();
  }

  async open() {
    this.ws = new WebSocket(this.wsUrl);
    await new Promise((resolve, reject) => {
      this.ws.onopen = resolve;
      this.ws.onerror = reject;
    });
    this.ws.onmessage = (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) reject(new Error(msg.error.message));
        else resolve(msg.result);
      }
    };
    await this.send('Page.enable');
    await this.send('Runtime.enable');
  }

  send(method, params = {}) {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
      setTimeout(() => {
        if (this.pending.has(id)) {
          this.pending.delete(id);
          reject(new Error(`CDP timeout: ${method}`));
        }
      }, 30000);
    });
  }

  async navigate(url) {
    await this.send('Page.navigate', { url });
  }

  async reload() {
    await this.send('Page.reload', { ignoreCache: true });
  }

  // Evaluate JS in the page and return the value (or throw on error).
  async evaluate(expression) {
    const r = await this.send('Runtime.evaluate', {
      expression, awaitPromise: true, returnByValue: true,
    });
    if (r.exceptionDetails) {
      const text = r.exceptionDetails.exception?.description
        || r.exceptionDetails.text || 'page error';
      throw new Error(`page eval failed: ${text}`);
    }
    return r.result ? r.result.value : undefined;
  }

  // Wait until window.__READY__ is true, or throw. Also surfaces a
  // page error (window.__PAGEERROR__) immediately.
  async waitForReady(timeoutMs = 60000) {
    const start = Date.now();
    for (;;) {
      const state = await this.evaluate(
        `({ ready: !!window.__READY__, err: window.__PAGEERROR__ || null })`,
      ).catch(() => ({ ready: false, err: null }));
      if (state.err) throw new Error(`page error: ${state.err}`);
      if (state.ready) return;
      if (Date.now() - start > timeoutMs) throw new Error('timed out waiting for __READY__');
      await sleep(250);
    }
  }

  async keyDown(code) {
    await this.send('Input.dispatchKeyEvent', {
      type: 'rawKeyDown', code,
      key: code.startsWith('Key') ? code.slice(3).toLowerCase() : code,
      windowsVirtualKeyCode: KEYCODES[code] || 0,
    });
  }

  async keyUp(code) {
    await this.send('Input.dispatchKeyEvent', {
      type: 'keyUp', code,
      key: code.startsWith('Key') ? code.slice(3).toLowerCase() : code,
      windowsVirtualKeyCode: KEYCODES[code] || 0,
    });
  }

  async holdKey(code, ms) {
    await this.keyDown(code);
    await sleep(ms);
    await this.keyUp(code);
  }

  async screenshot(file, quality = 88) {
    const r = await this.send('Page.captureScreenshot', { format: 'jpeg', quality });
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, Buffer.from(r.data, 'base64'));
    return file;
  }

  close() {
    try { this.ws.close(); } catch { /* already closed */ }
  }
}
