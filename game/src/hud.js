// HUD for Coral Bay Heat: every overlay the player reads — mission
// card, CBPD response, district, health, the round minimap, fixer and
// crew, weapons, speed, radio, dialogue — plus the title, map, fail
// and victory screens. The DOM lives in index.html; this file only
// fills it in and draws the two maps.
import { AVENUES, STREETS, DISTRICTS } from './city.js';

const WEAPON_ICONS = { FISTS: '✊', PISTOL: '🔫', SMG: '🔫', SHOTGUN: '🔫' };

export class HUD {
  constructor(doc) {
    this.d = doc;
    this.el = (id) => doc.getElementById(id);
    this.mini = this.el('minimap');
    this.miniCtx = this.mini ? this.mini.getContext('2d') : null;
    this.big = this.el('bigmap');
    this.bigCtx = this.big ? this.big.getContext('2d') : null;
    this.lastRadio = '';
  }

  setText(id, text) {
    const e = this.el(id);
    if (e && e.textContent !== String(text)) e.textContent = text;
  }

  setWidth(id, pct) {
    const e = this.el(id);
    if (e) e.style.width = Math.max(0, Math.min(100, pct)) + '%';
  }

  show(id, on, display = 'block') {
    const e = this.el(id);
    if (e) e.style.display = on ? display : 'none';
  }

  update(s) {
    // mission card
    this.setText('m-id', `MISSION ${s.missionId} · ${s.missionTitle}`);
    this.setText('m-title', s.missionTitle);
    this.setText('m-stage', `STAGE ${s.step + 1}/${s.steps}`);
    this.setText('m-pay', `$${Math.floor(s.payout || 0).toLocaleString('en-US')}`);
    this.setText('m-objective', s.objective || '');
    this.setText('m-next', s.next ? `NEXT  ${s.next}` : '');
    // cash + clock + wanted
    this.setText('cash', `$${Math.floor(s.cash).toLocaleString('en-US')}`);
    this.setText('clock', `${s.clock} · DAY ${s.day}`);
    const stars = this.el('stars');
    if (stars) {
      let html = '';
      for (let i = 0; i < 5; i++) html += `<span class="${i < s.wanted ? 'on' : ''}">★</span>`;
      if (stars.innerHTML !== html) stars.innerHTML = html;
    }
    // CBPD response rows
    const rows = this.el('cbpd-rows');
    if (rows) {
      const html = s.police.map((p) => (
        `<div class="cbpd-row"><span>${p.name}</span><span>${p.role}</span><span>${p.dist} m</span></div>`
      )).join('') || '<div class="cbpd-row"><span>—</span><span>NO UNITS</span><span></span></div>';
      if (rows.innerHTML !== html) rows.innerHTML = html;
      this.setText('cbpd-count', `${s.police.length} UNITS`);
    }
    // district
    this.setText('d-name', s.district);
    this.setText('d-sub', `Coral Bay · ${s.districtSub}`);
    this.setWidth('d-respect', s.respect);
    this.setText('d-packages', `PACKAGES ${s.packages}/4`);
    // health / armour
    this.setWidth('health-bar', (s.health / s.maxHealth) * 100);
    this.setWidth('armour-bar', s.armour);
    this.setText('health-num', `${Math.round(s.health)}`);
    // weapons
    for (let i = 0; i < 4; i++) {
      const w = s.weapons[i];
      const slot = this.el(`wslot-${i}`);
      if (slot) {
        slot.classList.toggle('active', s.weaponIndex === i);
        const ammo = w.name === 'FISTS' ? '∞' : String(w.ammo);
        const html = `<div class="w-ico">${WEAPON_ICONS[w.name] || '🔫'}</div><div class="w-name">${w.name}</div><div class="w-ammo">${ammo}</div>`;
        if (slot.innerHTML !== html) slot.innerHTML = html;
      }
    }
    // speed + car + radio
    this.setText('speed', `${Math.round(Math.abs(s.speed) * 3.6)}`);
    this.setText('car-name', s.vehicle === 'boat' ? 'RED TIDE · BOAT' : s.vehicle === 'foot' ? 'ON FOOT' : 'CORAL GT · VELOCE');
    this.setText('car-cond', s.vehicle === 'foot' ? '' : `CONDITION ${Math.round(s.condition)}% · ${s.dented ? 'DENTED' : 'CLEAN'}`);
    if (s.radio !== this.lastRadio) {
      this.setText('radio-line', `♪ ${s.radio}`);
      this.lastRadio = s.radio;
    }
    // fixer + crew
    this.setText('fixer-rp', `${s.fixerRp.toLocaleString('en-US')} / 5,200 RP`);
    this.setWidth('fixer-rp-bar', (s.fixerRp / 5200) * 100);
    this.drawMinimap(s);
  }

  setDialogue(name, text) {
    this.setText('dlg-name', name);
    this.setText('dlg-text', text);
    this.show('dialogue', true);
  }

  hideDialogue() { this.show('dialogue', false); }

  // Round minimap: roads, beach, sea, player arrow, police, marker.
  drawMinimap(s) {
    const c = this.miniCtx;
    if (!c) return;
    const W = this.mini.width, H = this.mini.height;
    c.clearRect(0, 0, W, H);
    const view = 260; // metres across the map
    const px = (x) => W / 2 + ((x - s.pos.x) / view) * W;
    const pz = (z) => H / 2 + ((z - s.pos.z) / view) * H;
    // land + sea + beach
    c.fillStyle = '#22402a';
    c.fillRect(0, 0, W, H);
    c.fillStyle = '#1e7fa8';
    c.fillRect(px(134), 0, W, H);
    c.fillStyle = '#c9a86a';
    c.fillRect(px(108), 0, px(134) - px(108), H);
    // roads
    c.strokeStyle = '#8a8a92';
    c.lineWidth = 2;
    for (const a of AVENUES) { c.beginPath(); c.moveTo(px(a), 0); c.lineTo(px(a), H); c.stroke(); }
    for (const st of STREETS) { c.beginPath(); c.moveTo(0, pz(st)); c.lineTo(W, pz(st)); c.stroke(); }
    // district labels
    c.fillStyle = 'rgba(255,255,255,0.65)';
    c.font = 'bold 8px Arial';
    c.fillText('DOWNTOWN', px(-40), pz(-60));
    c.fillText('PIER 9', px(96), pz(-60));
    c.fillText('MARINA BEACH', px(96), pz(20));
    c.fillText('GARAGE', px(-36), pz(100));
    c.fillText('THE DOCKS', px(-60), pz(110));
    // mission marker
    if (s.target) {
      c.fillStyle = '#ffd34d';
      c.beginPath(); c.arc(px(s.target.x), pz(s.target.z), 5, 0, 7); c.fill();
      c.fillStyle = '#222';
      c.font = 'bold 8px Arial';
      c.fillText('!', px(s.target.x) - 1.5, pz(s.target.z) + 3);
    }
    // police dots
    c.fillStyle = '#ff4040';
    for (const p of s.police) { c.beginPath(); c.arc(px(p.x), pz(p.z), 2.5, 0, 7); c.fill(); }
    // player arrow: heading 0 faces +z (down the map), so rotate PI - h
    c.save();
    c.translate(W / 2, H / 2);
    c.rotate(Math.PI - s.heading);
    c.fillStyle = '#fff';
    c.beginPath(); c.moveTo(0, -7); c.lineTo(5, 6); c.lineTo(-5, 6); c.closePath(); c.fill();
    c.fillStyle = '#2a6fd9';
    c.beginPath(); c.arc(0, 0, 3, 0, 7); c.fill();
    c.restore();
  }

  // Full-screen map: coloured district blocks, street grid, markers,
  // a purple route line, progress bars, career stats, medals, saves.
  drawBigMap(s) {
    const c = this.bigCtx;
    if (!c) return;
    const W = this.big.width, H = this.big.height;
    c.clearRect(0, 0, W, H);
    // sea + land
    c.fillStyle = '#0e2a3a';
    c.fillRect(0, 0, W, H);
    c.fillStyle = '#1d4a2a';
    c.fillRect(0, 0, W * 0.62, H);
    c.fillStyle = '#1e7fa8';
    c.fillRect(W * 0.62, 0, W * 0.38, H);
    const mx = (x) => ((x + 100) / 240) * W * 0.62;
    const mz = (z) => ((z + 112) / 244) * H;
    // district tints
    const tints = { DOWNTOWN: 'rgba(120,180,120,0.35)', NORTHSIDE: 'rgba(120,140,200,0.35)', 'OLD TOWN': 'rgba(200,180,120,0.35)', 'THE DOCKS': 'rgba(180,120,120,0.35)', 'MARINA BEACH': 'rgba(220,200,140,0.35)', 'PIER 9': 'rgba(140,200,200,0.35)', GARAGE: 'rgba(160,140,180,0.35)' };
    for (const d of DISTRICTS) {
      c.fillStyle = tints[d.name] || 'rgba(255,255,255,0.15)';
      c.fillRect(mx(d.x0), mz(d.z0), mx(d.x1) - mx(d.x0), mz(d.z1) - mz(d.z0));
    }
    // street grid
    c.strokeStyle = '#d8d8d0';
    c.lineWidth = 3;
    for (const a of AVENUES) { c.beginPath(); c.moveTo(mx(a), 0); c.lineTo(mx(a), H); c.stroke(); }
    for (const st of STREETS) { c.beginPath(); c.moveTo(0, mz(st)); c.lineTo(W * 0.62, mz(st)); c.stroke(); }
    // beach strip + pier
    c.fillStyle = '#d9b478';
    c.fillRect(mx(108), 0, mx(134) - mx(108), H);
    c.fillStyle = '#8a6a44';
    c.fillRect(mx(96), mz(-51.5), mx(132) - mx(96), mz(-44.5) - mz(-51.5));
    // route line from player to target
    if (s.target) {
      c.strokeStyle = '#b45ae8';
      c.lineWidth = 4;
      c.beginPath();
      c.moveTo(mx(s.pos.x), mz(s.pos.z));
      c.lineTo(mx(s.target.x), mz(s.pos.z));
      c.lineTo(mx(s.target.x), mz(s.target.z));
      c.stroke();
      c.fillStyle = '#ffd34d';
      c.beginPath(); c.arc(mx(s.target.x), mz(s.target.z), 7, 0, 7); c.fill();
      c.fillStyle = '#222';
      c.font = 'bold 11px Arial';
      c.fillText('!', mx(s.target.x) - 2, mz(s.target.z) + 4);
    }
    // markers: shops, garage, boats
    const marks = [
      { x: 12, z: -42, t: 'G', c: '#ffd34d' },
      { x: -24, z: 96, t: 'G', c: '#ffd34d' },
      { x: 140, z: 108, t: 'B', c: '#ff4040' },
      { x: 96, z: -48, t: 'P', c: '#7fd9d9' },
    ];
    for (const m of marks) {
      c.fillStyle = m.c;
      c.beginPath(); c.arc(mx(m.x), mz(m.z), 6, 0, 7); c.fill();
      c.fillStyle = '#111';
      c.font = 'bold 9px Arial';
      c.fillText(m.t, mx(m.x) - 3, mz(m.z) + 3);
    }
    // district labels
    c.fillStyle = '#fff';
    c.font = 'bold 13px Arial';
    c.fillText('DOWNTOWN', mx(-56), mz(-70));
    c.fillText('PIER 9', mx(100), mz(-58));
    c.fillText('MARINA BEACH', mx(72), mz(10));
    c.fillText('OLD TOWN', mx(-58), mz(30));
    c.fillText('THE DOCKS', mx(-72), mz(100));
    c.fillText('NORTHSIDE', mx(-20), mz(-100));
    c.fillText('GARAGE', mx(-40), mz(84));
    // player arrow
    c.save();
    c.translate(mx(s.pos.x), mz(s.pos.z));
    c.rotate(Math.PI - s.heading);
    c.fillStyle = '#fff';
    c.beginPath(); c.moveTo(0, -9); c.lineTo(7, 8); c.lineTo(-7, 8); c.closePath(); c.fill();
    c.restore();
    // compass
    c.fillStyle = '#fff';
    c.font = 'bold 14px Arial';
    c.fillText('N ▲', 12, 22);
  }

  // Fill the map screen's side panels (ring, bars, stats, medals, saves).
  updateMapScreen(s) {
    this.setText('map-ring', `${s.completion}%`);
    this.setText('map-mission-line', `ACT ${s.act} · ${s.district} · DAY ${s.day} · ${s.clock}`);
    const bars = [
      ['STORY MISSIONS', s.mission, 8], ['STREET RACES', 3, 5], ['STUNT JUMPS', 4, 6],
      ['COLLECTIBLES', 12, 20], ['EXPORT LIST', 2, 4], ['DISTRICT JOBS', 8, 12],
      ['DISTRICTS FRIENDLY', 3, 5], ['CREW RECRUITED', 3, 3], ['GOLD RATINGS', 5, 8],
    ];
    const host = this.el('map-bars');
    if (host) {
      host.innerHTML = bars.map(([label, v, max]) => (
        `<div class="bar-row"><span>${label}</span><div class="bar"><div class="bar-fill" style="width:${(v / max) * 100}%"></div></div><span>${v} / ${max}</span></div>`
      )).join('');
    }
    const stats = this.el('map-stats');
    if (stats) {
      stats.innerHTML = [
        ['CARS STOLEN', s.carsStolen], ['COPS ESCAPED', s.copsEscaped],
        ['DISTANCE DRIVEN', `${s.distanceKm.toFixed(1)} KM`], ['PEOPLE TAKEN OUT', s.takenOut],
        ['LONGEST JUMP', `${s.longestJump} M`], ['HIDDEN BY LOCALS', s.hidden],
      ].map(([k, v]) => `<div class="stat"><span>${k}</span><b>${v}</b></div>`).join('');
    }
    const medals = this.el('map-medals');
    if (medals) {
      medals.innerHTML = s.medals.map((m) => `<span class="medal ${m}">${m}</span>`).join('');
    }
    const saves = this.el('map-saves');
    if (saves) {
      saves.innerHTML = s.saves.map((sv, i) => (
        `<div class="save-slot ${sv ? 'filled' : ''}"><b>SAVE SLOT ${i + 1}</b><span>${sv ? sv : 'EMPTY · NO SAVE YET'}</span></div>`
      )).join('');
    }
  }

  showTitle(on) { this.show('title-screen', on, 'flex'); }
  showMap(on) { this.show('map-screen', on, 'flex'); }
  showFail(reason) {
    this.setText('fail-reason', reason || 'WRECKED');
    this.show('fail-screen', true, 'flex');
  }
  hideFail() { this.show('fail-screen', false); }
  showVictory(cash) {
    this.setText('victory-cash', `$${Math.floor(cash).toLocaleString('en-US')}`);
    this.show('victory-screen', true, 'flex');
  }
  hideVictory() { this.show('victory-screen', false); }
  showHud(on) { this.show('hud', on); }
}
