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

  // Round minimap: rich district tints, bright roads, blue sea with a
  // sandy beach, big labels, player arrow, police, marker.
  drawMinimap(s) {
    const c = this.miniCtx;
    if (!c) return;
    const W = this.mini.width, H = this.mini.height;
    c.clearRect(0, 0, W, H);
    const view = 260; // metres across the map
    const px = (x) => W / 2 + ((x - s.pos.x) / view) * W;
    const pz = (z) => H / 2 + ((z - s.pos.z) / view) * H;
    // land: deep green base, then a district tint for each quarter
    c.fillStyle = '#2a5a34';
    c.fillRect(0, 0, W, H);
    const tints = [
      { x0: -100, z0: -112, x1: 0, z1: 0, c: 'rgba(90,140,200,0.35)' },
      { x0: 0, z0: -112, x1: 108, z1: 0, c: 'rgba(200,180,110,0.35)' },
      { x0: -100, z0: 0, x1: 0, z1: 132, c: 'rgba(200,130,110,0.35)' },
      { x0: 0, z0: 0, x1: 108, z1: 132, c: 'rgba(220,200,140,0.35)' },
    ];
    for (const t of tints) {
      c.fillStyle = t.c;
      c.fillRect(px(t.x0), pz(t.z0), px(t.x1) - px(t.x0), pz(t.z1) - pz(t.z0));
    }
    // sea + beach
    c.fillStyle = '#2a8ab8';
    c.fillRect(px(134), 0, W, H);
    c.fillStyle = '#e8c88f';
    c.fillRect(px(108), 0, px(134) - px(108), H);
    c.fillStyle = 'rgba(255,255,255,0.5)';
    c.fillRect(px(108) - 1, 0, 2, H);
    // roads: bright and thick so the grid reads at a glance
    c.strokeStyle = '#e8e8e0';
    c.lineWidth = 3;
    for (const a of AVENUES) { c.beginPath(); c.moveTo(px(a), 0); c.lineTo(px(a), H); c.stroke(); }
    for (const st of STREETS) { c.beginPath(); c.moveTo(0, pz(st)); c.lineTo(W, pz(st)); c.stroke(); }
    c.strokeStyle = '#ffd34d';
    c.lineWidth = 1;
    for (const a of AVENUES) { c.beginPath(); c.moveTo(px(a), 0); c.lineTo(px(a), H); c.stroke(); }
    // district labels: bold white with a dark outline
    c.font = 'bold 9px Arial';
    c.textAlign = 'left';
    for (const [t, x, z] of [['DOWNTOWN', -40, -60], ['PIER 9', 96, -60], ['MARINA BEACH', 96, 20], ['GARAGE', -36, 100], ['THE DOCKS', -60, 110]]) {
      c.fillStyle = 'rgba(0,0,0,0.7)';
      c.fillText(t, px(x) + 1, pz(z) + 1);
      c.fillStyle = '#fff';
      c.fillText(t, px(x), pz(z));
    }
    // mission marker
    if (s.target) {
      c.fillStyle = '#ffd34d';
      c.beginPath(); c.arc(px(s.target.x), pz(s.target.z), 6, 0, 7); c.fill();
      c.strokeStyle = '#fff';
      c.lineWidth = 1.5;
      c.beginPath(); c.arc(px(s.target.x), pz(s.target.z), 6, 0, 7); c.stroke();
      c.fillStyle = '#222';
      c.font = 'bold 9px Arial';
      c.fillText('!', px(s.target.x) - 1.5, pz(s.target.z) + 3);
    }
    // police dots with a white ring
    for (const p of s.police) {
      c.fillStyle = '#ff4040';
      c.beginPath(); c.arc(px(p.x), pz(p.z), 3.5, 0, 7); c.fill();
      c.strokeStyle = '#fff';
      c.lineWidth = 1;
      c.beginPath(); c.arc(px(p.x), pz(p.z), 3.5, 0, 7); c.stroke();
    }
    // player arrow: heading 0 faces +z (down the map), so rotate PI - h
    c.save();
    c.translate(W / 2, H / 2);
    c.rotate(Math.PI - s.heading);
    c.fillStyle = '#fff';
    c.beginPath(); c.moveTo(0, -9); c.lineTo(6, 7); c.lineTo(-6, 7); c.closePath(); c.fill();
    c.strokeStyle = '#2a6fd9';
    c.lineWidth = 1.5;
    c.beginPath(); c.moveTo(0, -9); c.lineTo(6, 7); c.lineTo(-6, 7); c.closePath(); c.stroke();
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
    // sea: a gradient, deep at the horizon to bright near the beach
    const seaGrad = c.createLinearGradient(W * 0.62, 0, W, 0);
    seaGrad.addColorStop(0, '#1a6a8a');
    seaGrad.addColorStop(1, '#2a8ab8');
    c.fillStyle = seaGrad;
    c.fillRect(0, 0, W, H);
    c.fillStyle = '#2a5a34';
    c.fillRect(0, 0, W * 0.62, H);
    c.fillStyle = '#1e7fa8';
    c.fillRect(W * 0.62, 0, W * 0.38, H);
    const mx = (x) => ((x + 100) / 240) * W * 0.62;
    const mz = (z) => ((z + 112) / 244) * H;
    // varied city blocks: rich saturated tones picked from the
    // coordinates, so the west half reads as a real city — warm tans,
    // terracotta, teal and rose, not one flat green field
    const blockTones = ['rgba(200,170,120,0.85)', 'rgba(190,120,95,0.85)', 'rgba(110,140,170,0.85)', 'rgba(140,160,120,0.85)', 'rgba(190,140,140,0.85)', 'rgba(100,160,150,0.85)'];
    const bxs = [-100, ...AVENUES, 108];
    const bzs = [-112, ...STREETS, 124];
    for (let i = 0; i < bxs.length - 1; i++) {
      for (let j = 0; j < bzs.length - 1; j++) {
        if (bxs[i] >= 108) continue; // beach and sea are drawn above
        c.fillStyle = blockTones[(Math.abs(bxs[i] * 7 + bzs[j] * 13) | 0) % blockTones.length];
        c.fillRect(mx(bxs[i]) + 3, mz(bzs[j]) + 3, mx(bxs[i + 1]) - mx(bxs[i]) - 6, mz(bzs[j + 1]) - mz(bzs[j]) - 6);
      }
    }
    // district tints
    const tints = { DOWNTOWN: 'rgba(120,180,120,0.22)', NORTHSIDE: 'rgba(120,140,200,0.22)', 'OLD TOWN': 'rgba(200,180,120,0.22)', 'THE DOCKS': 'rgba(180,120,120,0.22)', 'MARINA BEACH': 'rgba(220,200,140,0.22)', 'PIER 9': 'rgba(140,200,200,0.22)', GARAGE: 'rgba(160,140,180,0.22)' };
    for (const d of DISTRICTS) {
      c.fillStyle = tints[d.name] || 'rgba(255,255,255,0.15)';
      c.fillRect(mx(d.x0), mz(d.z0), mx(d.x1) - mx(d.x0), mz(d.z1) - mz(d.z0));
    }
    // street grid: bright, thick, with a gold centre line on the avenues
    c.strokeStyle = '#e8e8e0';
    c.lineWidth = 4;
    for (const a of AVENUES) { c.beginPath(); c.moveTo(mx(a), 0); c.lineTo(mx(a), H); c.stroke(); }
    for (const st of STREETS) { c.beginPath(); c.moveTo(0, mz(st)); c.lineTo(W * 0.62, mz(st)); c.stroke(); }
    c.strokeStyle = '#ffd34d';
    c.lineWidth = 1.5;
    for (const a of AVENUES) { c.beginPath(); c.moveTo(mx(a), 0); c.lineTo(mx(a), H); c.stroke(); }
    // beach strip + pier
    c.fillStyle = '#d9b478';
    c.fillRect(mx(108), 0, mx(134) - mx(108), H);
    c.fillStyle = '#8a6a44';
    c.fillRect(mx(96), mz(-51.5), mx(132) - mx(96), mz(-44.5) - mz(-51.5));
    // marina + sea detail: the eastern third is sea, not flat blue —
    // a marina basin by the beach, named boats, two islands, a
    // breakwater and the pier running out past the beach
    const sx = (x) => W * 0.62 + ((x - 134) / 110) * W * 0.38;
    c.fillStyle = '#1a6a8a';
    c.fillRect(sx(134), mz(-72), sx(244) - sx(134), mz(72) - mz(-72)); // marina basin
    c.strokeStyle = '#d9b478';
    c.lineWidth = 4;
    c.beginPath(); c.moveTo(sx(150), mz(-72)); c.lineTo(sx(150), mz(72)); c.stroke(); // breakwater
    c.strokeStyle = '#8a6a44';
    c.lineWidth = 5;
    c.beginPath(); c.moveTo(mx(96), mz(-48)); c.lineTo(sx(210), mz(-48)); c.stroke(); // pier out to sea
    const seaBoats = [
      { x: 160, z: -60, n: 'NIGHT TIDE' }, { x: 200, z: -30, n: 'CORAL DREAM' },
      { x: 170, z: 0, n: 'BLUE HORIZON' }, { x: 210, z: 10, n: 'ISLAND QUEEN' },
      { x: 175, z: 30, n: 'RED TIDE' }, { x: 205, z: 55, n: 'SEA STAR' },
      { x: 165, z: 60, n: 'GOLDEN HOUR' },
    ];
    for (const b of seaBoats) {
      c.fillStyle = '#f4f0e2';
      c.beginPath(); c.ellipse(sx(b.x), mz(b.z), 9, 5, 0, 0, 7); c.fill();
      c.fillStyle = '#fff';
      c.font = 'bold 10px Arial';
      c.fillText(b.n, sx(b.x) - 26, mz(b.z) - 9);
    }
    // two islands in the sea
    c.fillStyle = '#3f7d4e';
    c.beginPath(); c.ellipse(sx(190), mz(-55), 16, 8, 0.4, 0, 7); c.fill();
    c.beginPath(); c.ellipse(sx(225), mz(35), 12, 7, -0.3, 0, 7); c.fill();
    c.fillStyle = '#fff';
    c.font = 'bold 10px Arial';
    c.fillText('REEF ISLE', sx(190) - 24, mz(-55) - 12);
    c.fillText('PALM CAY', sx(225) - 22, mz(35) - 11);
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
    // Markers: hotels, shops, garages, pier, boats — dense, like a
    // real open-world map. Sixteen now, including the two relocated
    // title hotels (LAGUNA RASI at 84,12 and PALM COURT at 60,12 —
    // the map and the title agree on where they stand), a shop and a
    // garage in the west, and a pier marker on the beach, so no
    // district reads as blank.
    const mark = (x, z, t, c) => ({ x, z, t, c });
    const marks = [
      // hotels
      mark(60, -60, 'H', '#ff9ec4'), mark(36, -60, 'H', '#ff9ec4'),
      mark(-36, -60, 'H', '#ff9ec4'), mark(84, 12, 'H', '#ff9ec4'),
      mark(60, 12, 'H', '#ff9ec4'),
      // shops
      mark(18, -36, 'S', '#ffd34d'), mark(-72, -60, 'S', '#ffd34d'),
      mark(36, 36, 'S', '#ffd34d'),
      // garages
      mark(12, -42, 'G', '#ffd34d'), mark(-24, 96, 'G', '#ffd34d'),
      mark(-32, 102, 'G', '#ffd34d'), mark(72, 60, 'G', '#ffd34d'),
      // pier + boats
      mark(96, -48, 'P', '#7fd9d9'), mark(120, 60, 'P', '#7fd9d9'),
      mark(140, 108, 'B', '#ff4040'), mark(150, 60, 'B', '#ff4040'),
    ];
    for (const m of marks) {
      c.fillStyle = m.c;
      c.beginPath(); c.arc(mx(m.x), mz(m.z), 6, 0, 7); c.fill();
      c.fillStyle = '#111';
      c.font = 'bold 9px Arial';
      c.fillText(m.t, mx(m.x) - 3, mz(m.z) + 3);
    }
    // district labels: big bold white with a dark outline
    c.font = 'bold 14px Arial';
    c.textAlign = 'left';
    for (const [t, x, z] of [['DOWNTOWN', -56, -70], ['PIER 9', 100, -58], ['MARINA BEACH', 72, 10], ['OLD TOWN', -58, 30], ['THE DOCKS', -72, 100], ['NORTHSIDE', -20, -100], ['GARAGE', -40, 84]]) {
      c.fillStyle = 'rgba(0,0,0,0.75)';
      c.fillText(t, mx(x) + 1, mz(z) + 1);
      c.fillStyle = '#fff';
      c.fillText(t, mx(x), mz(z));
    }
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
