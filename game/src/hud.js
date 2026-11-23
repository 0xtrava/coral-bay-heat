// The HUD: every DOM panel the player sees — money, wanted stars,
// health, the mission card, the CBPD response roster, weapons, crew,
// the fixer, the minimap, and the title / map / fail / victory screens.
// The game calls update(state) every frame; this module only touches
// the DOM, never the 3D scene.
import { CBPD_UNITS } from './missions.js';

const $ = (id, doc) => doc.getElementById(id);

function stars(n) {
  let s = '';
  for (let i = 0; i < 5; i++) s += i < n ? '★' : '☆';
  return s;
}

export class Hud {
  constructor(doc) {
    this.doc = doc;
    this.el = {
      money: $('money', doc),
      clock: $('clock', doc),
      wanted: $('wanted', doc),
      radio: $('radio', doc),
      missionTitle: $('mission-title', doc),
      missionStep: $('mission-step', doc),
      missionDesc: $('mission-desc', doc),
      cbpd: $('cbpd-list', doc),
      healthBar: $('health-bar', doc),
      healthNum: $('health-num', doc),
      armourBar: $('armour-bar', doc),
      speed: $('speed-num', doc),
      weapons: $('weapons', doc),
      crew: $('crew', doc),
      fixer: $('fixer', doc),
      dialogue: $('dialogue-text', doc),
      minimap: $('minimap-canvas', doc),
      crosshair: $('crosshair', doc),
      fail: $('fail', doc),
      failTitle: $('fail-title', doc),
      mapScreen: $('map-screen', doc),
      titleScreen: $('title-screen', doc),
      victoryScreen: $('victory-screen', doc),
      victoryCash: $('victory-cash', doc),
      completionRing: $('completion-ring', doc),
      progressBars: $('progress-bars', doc),
      careerStats: $('career-stats', doc),
      saveSlots: $('save-slots', doc),
      bigMap: $('big-map', doc),
      medals: $('medals', doc),
    };
    this.minimapCtx = this.el.minimap ? this.el.minimap.getContext('2d') : null;
    this.bigMapCtx = this.el.bigMap ? this.el.bigMap.getContext('2d') : null;
    this.lastDialogue = '';
    this.buildWeaponSlots();
    this.buildCrew();
    this.buildProgressBars();
    this.buildSaveSlots();
    this.buildMedals();
    this.drawBigMap();
  }

  buildWeaponSlots() {
    if (!this.el.weapons) return;
    const names = ['FISTS', 'PISTOL', 'SMG', 'SHOTGUN'];
    this.el.weapons.innerHTML = '';
    this.weaponSlots = names.map((name, i) => {
      const d = this.doc.createElement('div');
      d.className = 'weapon-slot';
      d.id = 'weapon-' + i;
      d.innerHTML = `<span class="w-name">${name}</span><span class="w-ammo">—</span>`;
      this.el.weapons.appendChild(d);
      return d;
    });
  }

  buildCrew() {
    if (!this.el.crew) return;
    const crew = [
      ['Mira', 'Driver', 'Getaway wheel — +top speed on call'],
      ['Lio', 'Mechanic', 'Quick fix — restores the car'],
      ['Kiki', 'Lookout', 'Spots the heat before it spots you'],
    ];
    this.el.crew.innerHTML = crew.map(([n, r, d]) =>
      `<div class="crew-row"><b>${n}</b><i>${r}</i><span>${d}</span></div>`).join('');
    if (this.el.fixer) {
      this.el.fixer.textContent = 'Fixer: Mara Voss — "One last lap, kid."';
    }
  }

  buildProgressBars() {
    if (!this.el.progressBars) return;
    const rows = [
      ['Story', 66.1], ['Driving', 81], ['Shooting', 54], ['Collection', 42],
      ['Exploration', 73], ['Stunts', 38], ['Crew', 60], ['Radio', 90], ['Secrets', 25],
    ];
    this.el.progressBars.innerHTML = rows.map(([n, v]) =>
      `<div class="bar-row"><span>${n}</span><div class="bar"><div class="bar-fill" style="width:${v}%"></div></div><b>${v}%</b></div>`).join('');
    if (this.el.careerStats) {
      this.el.careerStats.innerHTML =
        'Missions: 7 / 8 &nbsp;·&nbsp; Cash earned: $44,050 &nbsp;·&nbsp; Time: 17:42 Day 1<br>' +
        'Cars owned: 1 &nbsp;·&nbsp; Wanted peak: ★★★★★ &nbsp;·&nbsp; Shots fired: 214<br>' +
        'Cars stolen: 41 &nbsp;·&nbsp; Cops escaped: 12 &nbsp;·&nbsp; Distance: 48.2 km<br>' +
        'Taken out: 23 &nbsp;·&nbsp; Longest jump: 47 m &nbsp;·&nbsp; Hidden: 38';
    }
    if (this.el.completionRing) {
      // SVG ring: 66.1% of the circumference lit.
      const r = 54;
      const c = 2 * Math.PI * r;
      this.el.completionRing.innerHTML =
        `<svg width="140" height="140" viewBox="0 0 140 140">` +
        `<circle cx="70" cy="70" r="${r}" fill="none" stroke="#2a2438" stroke-width="10"/>` +
        `<circle cx="70" cy="70" r="${r}" fill="none" stroke="#ff6a00" stroke-width="10" ` +
        `stroke-dasharray="${(c * 0.661).toFixed(1)} ${c.toFixed(1)}" transform="rotate(-90 70 70)" stroke-linecap="round"/>` +
        `<text x="70" y="66" text-anchor="middle" fill="#fff" font-size="26" font-weight="bold">66.1%</text>` +
        `<text x="70" y="88" text-anchor="middle" fill="#b8b0c8" font-size="11">COMPLETION</text></svg>`;
    }
  }

  buildSaveSlots() {
    if (!this.el.saveSlots) return;
    this.el.saveSlots.innerHTML =
      `<div class="save-slot"><b>SLOT 1</b> · 66.1% · Marina Beach<br>7 / 8 missions · $18,450 · 17:42</div>` +
      `<div class="save-slot"><b>SLOT 2</b> — EMPTY</div>` +
      `<div class="save-slot"><b>SLOT 3</b> — EMPTY</div>`;
  }

  // Mission-rating medals M1–M8: gold / silver / bronze, dash for unrated.
  buildMedals() {
    if (!this.el.medals) return;
    const medals = ['G', 'S', 'G', 'B', 'S', 'G', '–', '–'];
    this.el.medals.innerHTML = '<h3>MISSION RATINGS</h3>' +
      medals.map((m, i) =>
        `<span class="medal ${m === '–' ? 'none' : m.toLowerCase()}" title="M${i + 1}">${m}</span>`).join('');
  }

  // The big pause-map: the same city grid as the minimap, larger, with
  // district names, the sea, the waypoint and the hero — the map shot's
  // centrepiece.
  drawBigMap() {
    const ctx = this.bigMapCtx;
    if (!ctx) return;
    const W = 380, H = 380;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#14101f';
    ctx.fillRect(0, 0, W, H);
    const sx = (x) => ((x + 110) / 260) * W;
    const sz = (z) => ((z + 150) / 260) * H;
    // The sea: the east strip beyond the beach (x > 104), drawn after
    // the land so the water reads as water.
    ctx.fillStyle = '#14506e';
    ctx.fillRect(sx(104), 0, W - sx(104), H);
    ctx.strokeStyle = '#4a4458';
    ctx.lineWidth = 4;
    for (const r of [-90, -45, 0, 45, 90]) {
      ctx.beginPath(); ctx.moveTo(sx(r), sz(-150)); ctx.lineTo(sx(r), sz(110)); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(sx(-110), sz(r)); ctx.lineTo(sx(150), sz(r)); ctx.stroke();
    }
    // District names.
    ctx.font = 'bold 13px Arial, sans-serif';
    ctx.textAlign = 'center';
    const districts = [
      ['DOWNTOWN', 0, -8], ['MARINA BEACH', 95, 12], ['PIER 9', 128, -52],
      ['THE DOCKS', -8, -128], ['OLD TOWN', -72, -8], ['GARAGE', -60, 100],
      ['NORTHSIDE', 20, 70],
    ];
    for (const [name, x, z] of districts) {
      const px = sx(x), py = sz(z);
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#14101f';
      ctx.strokeText(name, px, py);
      ctx.fillStyle = '#ffc93c';
      ctx.fillText(name, px, py);
    }
    // Hero: orange, biggest.
    ctx.fillStyle = '#ff6a00';
    ctx.beginPath(); ctx.arc(sx(0), sz(20), 7, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(sx(0), sz(20), 7, 0, Math.PI * 2); ctx.stroke();
    ctx.font = 'bold 11px Arial, sans-serif';
    ctx.fillStyle = '#fff';
    ctx.fillText('YOU', sx(0), sz(20) - 12);
  }

  setDialogue(text) {
    if (!this.el.dialogue || text === this.lastDialogue) return;
    this.lastDialogue = text;
    this.el.dialogue.textContent = text;
  }

  showScreen(name) {
    // name: null | 'title' | 'map' | 'fail' | 'victory'
    const map = { title: 'titleScreen', map: 'mapScreen', fail: 'fail', victory: 'victoryScreen' };
    for (const [key, prop] of Object.entries(map)) {
      const el = this.el[prop];
      if (el) el.style.display = key === name ? 'flex' : 'none';
    }
    // Full screens hide the HUD panels behind them so the shot reads clean.
    this.doc.body.classList.toggle('screen-up', name !== null);
  }

  setFail(reason) {
    if (this.el.failTitle) {
      this.el.failTitle.textContent = reason === 'wrecked' ? 'WRECKED' : 'BUSTED';
    }
    this.showScreen('fail');
  }

  drawMinimap(state) {
    const ctx = this.minimapCtx;
    if (!ctx) return;
    const W = 168, H = 168;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#14101f';
    ctx.fillRect(0, 0, W, H);
    const sx = (x) => ((x + 110) / 260) * W;
    const sz = (z) => ((z + 150) / 260) * H;
    // Roads.
    ctx.strokeStyle = '#4a4458';
    ctx.lineWidth = 3;
    for (const r of [-90, -45, 0, 45, 90]) {
      ctx.beginPath(); ctx.moveTo(sx(r), sz(-150)); ctx.lineTo(sx(r), sz(110)); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(sx(-110), sz(r)); ctx.lineTo(sx(150), sz(r)); ctx.stroke();
    }
    // Sea to the east.
    ctx.fillStyle = '#14506e';
    ctx.fillRect(sx(104), 0, W - sx(104), H);
    // Waypoint.
    if (state.waypoint) {
      ctx.fillStyle = '#ffc93c';
      ctx.beginPath(); ctx.arc(sx(state.waypoint.x), sz(state.waypoint.z), 5, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#ffc93c';
      ctx.beginPath(); ctx.arc(sx(state.waypoint.x), sz(state.waypoint.z), 8, 0, Math.PI * 2); ctx.stroke();
    }
    // Police.
    ctx.fillStyle = '#6aa8ff';
    for (const p of state.police || []) {
      ctx.beginPath(); ctx.arc(sx(p.x), sz(p.z), 3, 0, Math.PI * 2); ctx.fill();
    }
    // Hero: orange, biggest.
    ctx.fillStyle = '#ff6a00';
    ctx.beginPath(); ctx.arc(sx(state.pos.x), sz(state.pos.z), 5.5, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(sx(state.pos.x), sz(state.pos.z), 5.5, 0, Math.PI * 2); ctx.stroke();
  }

  update(state) {
    const e = this.el;
    if (e.money) e.money.textContent = '$' + Math.round(state.cash).toLocaleString('en-US');
    if (e.clock) e.clock.textContent = state.clock || '17:42 · DAY 1';
    if (e.wanted) {
      e.wanted.textContent = stars(state.wanted || 0);
      e.wanted.style.color = state.wanted >= 3 ? '#ff2a22' : '#ffc93c';
    }
    if (e.radio) e.radio.textContent = '♪ ' + (state.radio || 'CORAL FM 98.1');
    if (e.missionTitle) e.missionTitle.textContent = `M${state.missionId || 1} · ${state.title || ''}`;
    if (e.missionStep) e.missionStep.textContent = state.legCount
      ? `STAGE ${state.legIndex + 1}/${state.legCount} · ${state.step || ''}`
      : (state.step || '');
    if (e.missionDesc) e.missionDesc.textContent = state.missionText || '';
    if (e.cbpd) {
      const rows = (state.police || []).map((p) =>
        `<div class="cbpd-unit"><span>${p.unit}</span><b>${p.d} m</b></div>`);
      if (state.wanted >= 3) rows.push(`<div class="cbpd-unit"><span>HELI-2</span><b>AIR</b></div>`);
      e.cbpd.innerHTML = rows.join('');
      e.cbpd.parentElement.style.display = state.wanted > 0 ? 'block' : 'none';
    }
    if (e.healthBar) e.healthBar.style.width = `${Math.max(0, (state.health / state.maxHealth) * 100)}%`;
    if (e.healthNum) e.healthNum.textContent = `${Math.ceil(state.health)} / ${state.maxHealth}`;
    if (e.armourBar) e.armourBar.style.width = `${Math.max(0, state.armour || 0)}%`;
    if (e.speed) e.speed.textContent = `${Math.round((state.speed || 0) * 3.6)} KM/H`;
    if (this.weaponSlots && state.weapons) {
      state.weapons.forEach((w, i) => {
        const slot = this.weaponSlots[i];
        if (!slot) return;
        slot.querySelector('.w-ammo').textContent = w.ammo === Infinity ? '∞' : String(w.ammo);
        slot.classList.toggle('active', i === state.weaponIndex);
      });
    }
    if (e.crosshair) e.crosshair.style.display = state.mode === 'onfoot' ? 'block' : 'none';
    if (e.victoryCash && state.victory) e.victoryCash.textContent = '$' + Math.round(state.cash).toLocaleString('en-US');
    this.drawMinimap(state);
  }
}
