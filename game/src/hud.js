// Coral Bay Heat — HUD wiring: the big circular minimap (canvas, drawn
// fresh each frame from the player's position) and the crew portraits.
// Recovery round 21 (2026-11-21): unchanged behaviour, witnessed rebuild.
import { drawPortrait } from './textures.js';

// City bounds the minimap covers: x -60..80, z -170..170.
const MAP = { x0: -60, x1: 80, z0: -170, z1: 170 };

export function initPortraits() {
  document.querySelectorAll('canvas.portrait').forEach((cv) => {
    drawPortrait(cv, cv.dataset.who);
  });
  const mara = document.getElementById('mara-portrait');
  if (mara) drawPortrait(mara, 'mara');
}

// Draw the circular minimap. Player arrow, mission marker, police dots,
// streets with names, coastline and district labels — all legible at 240px.
export function drawMinimap(ctx, px, pz, prot, opts = {}) {
  const S = 480; // canvas is 480x480, shown at 240
  const W = ctx.canvas.width, H = ctx.canvas.height;
  const X = (x) => ((x - MAP.x0) / (MAP.x1 - MAP.x0)) * W;
  const Z = (z) => ((z - MAP.z0) / (MAP.z1 - MAP.z0)) * H;
  ctx.clearRect(0, 0, W, H);
  ctx.save();
  // clip to the circle
  ctx.beginPath(); ctx.arc(W / 2, H / 2, W / 2, 0, 7); ctx.clip();
  // land
  ctx.fillStyle = '#3d5a3a'; ctx.fillRect(0, 0, W, H);
  // ocean (east)
  ctx.fillStyle = '#0e7fa8';
  ctx.beginPath();
  ctx.moveTo(X(62), 0);
  ctx.bezierCurveTo(X(58), H * 0.3, X(66), H * 0.6, X(60), H);
  ctx.lineTo(W, H); ctx.lineTo(W, 0); ctx.closePath();
  ctx.fill();
  // beach strip
  ctx.fillStyle = '#e8c98f';
  ctx.beginPath();
  ctx.moveTo(X(56), 0);
  ctx.bezierCurveTo(X(52), H * 0.3, X(60), H * 0.6, X(54), H);
  ctx.lineTo(X(62), H);
  ctx.bezierCurveTo(X(66), H * 0.6, X(58), H * 0.3, X(62), 0);
  ctx.closePath();
  ctx.fill();
  // docks apron (north)
  ctx.fillStyle = '#8a8a86';
  ctx.fillRect(X(-58), Z(120), X(10) - X(-58), Z(165) - Z(120));
  // pier
  ctx.fillStyle = '#9a6a42';
  ctx.fillRect(X(14), Z(-99), X(74) - X(14), Z(-91) - Z(-99));
  // streets
  ctx.strokeStyle = '#c8c2b2'; ctx.lineCap = 'round';
  const streets = [
    { x1: 0, z1: -170, x2: 0, z2: 170, w: 13 },   // Strand Blvd
    { x1: -24, z1: -170, x2: -24, z2: 170, w: 8 }, // west avenue
    { x1: -48, z1: -150, x2: -48, z2: 150, w: 7 },
    { x1: -48, z1: 60, x2: 12, z2: 60, w: 9 },     // cross street
    { x1: -48, z1: -40, x2: 12, z2: -40, w: 7 },
    { x1: -48, z1: 120, x2: 12, z2: 120, w: 7 },
    { x1: -48, z1: -120, x2: 12, z2: -120, w: 7 },
    { x1: 12, z1: -170, x2: 12, z2: 170, w: 6 },   // beachfront road
  ];
  for (const s of streets) {
    ctx.lineWidth = s.w * (W / (MAP.x1 - MAP.x0));
    ctx.beginPath();
    ctx.moveTo(X(s.x1), Z(s.z1)); ctx.lineTo(X(s.x2), Z(s.z2));
    ctx.stroke();
  }
  // street centre lines
  ctx.strokeStyle = '#f5c832'; ctx.lineWidth = 2;
  ctx.setLineDash([8, 8]);
  ctx.beginPath(); ctx.moveTo(X(0), Z(-170)); ctx.lineTo(X(0), Z(170)); ctx.stroke();
  ctx.setLineDash([]);
  // district labels — readable words, not single letters
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.font = 'bold 21px Arial';
  ctx.fillText('DOWNTOWN', X(-26), Z(-90));
  ctx.font = 'bold 19px Arial';
  ctx.fillText('MARINA BEACH', X(38), Z(40));
  ctx.fillText('PIER 9', X(38), Z(-88));
  ctx.fillText('THE DOCKS', X(-26), Z(112));
  ctx.font = 'bold 17px Arial';
  ctx.fillStyle = '#ffe9a8';
  ctx.fillText('GARAGE', X(-30), Z(96));
  // street names
  ctx.font = 'bold 14px Arial';
  ctx.fillStyle = '#ffe9a8';
  ctx.save();
  ctx.translate(X(6), Z(80)); ctx.rotate(-Math.PI / 2);
  ctx.fillText('STRAND BLVD', 0, 0);
  ctx.restore();
  ctx.save();
  ctx.translate(X(-30), Z(54)); ctx.rotate(0);
  ctx.fillText('CROSS ST', 0, 0);
  ctx.restore();
  // north arrow
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 20px Arial';
  ctx.fillText('N', W / 2, 42);
  ctx.beginPath();
  ctx.moveTo(W / 2, 46); ctx.lineTo(W / 2 - 7, 62); ctx.lineTo(W / 2 + 7, 62);
  ctx.closePath(); ctx.fill();
  // mission marker (marina lot)
  const mx = X(8), my = Z(-60);
  ctx.fillStyle = '#ffd76a';
  ctx.beginPath(); ctx.arc(mx, my, 13, 0, 7); ctx.fill();
  ctx.fillStyle = '#1a1200';
  ctx.font = 'bold 16px Arial';
  ctx.fillText('!', mx, my + 6);
  // police dots
  const police = opts.police || [[-3.4, -13], [3.6, -26], [-18, 60]];
  for (const [x, z] of police) {
    ctx.fillStyle = '#ff3b30';
    ctx.beginPath(); ctx.arc(X(x), Z(z), 7, 0, 7); ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
    ctx.stroke();
  }
  // player arrow
  const pxx = X(px), pzz = Z(pz);
  ctx.save();
  ctx.translate(pxx, pzz);
  ctx.rotate(prot);
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#0d2b45'; ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, -16); ctx.lineTo(11, 12); ctx.lineTo(0, 6); ctx.lineTo(-11, 12);
  ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.restore();
  // view ring around the player
  ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(pxx, pzz, 26, 0, 7); ctx.stroke();
  ctx.restore();
  // rim: a dark outer ring first, so the circle reads as a solid disc even
  // when a bright 3D object (lamp globe, awning) sits right behind its edge
  ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.lineWidth = 12;
  ctx.beginPath(); ctx.arc(W / 2, H / 2, W / 2 - 6, 0, 7); ctx.stroke();
  ctx.strokeStyle = 'rgba(55,224,200,0.9)'; ctx.lineWidth = 6;
  ctx.beginPath(); ctx.arc(W / 2, H / 2, W / 2 - 3, 0, 7); ctx.stroke();
}

// Update the live HUD numbers from game state.
export function updateHud(state) {
  const speedEl = document.getElementById('speed-num');
  if (speedEl) speedEl.textContent = String(Math.round(state.speedKmh)).padStart(2, '0');
  const stars = document.getElementById('stars');
  if (stars) {
    let html = '';
    for (let i = 0; i < 5; i++) html += `<span class="${i < state.wanted ? 'on' : 'off'}">&#9733;</span>`;
    stars.innerHTML = html;
  }
  const tag = document.getElementById('wanted-tag');
  if (tag) tag.textContent = `WANTED · LEVEL ${state.wanted} · AIR UNIT DEPLOYED`;
}

// Full HUD render from the Phase 2 game state: mission panel, police table,
// cash, fixer rank/RP, weapon slots, radio line, dialogue, vitals, packages.
export function renderHud(s) {
  updateHud(s);
  const set = (id, txt) => { const el = document.getElementById(id); if (el) el.textContent = txt; };
  const cash = document.getElementById('cash');
  if (cash && s.cash !== undefined) cash.textContent = '$' + Number(s.cash).toLocaleString('en-US');
  if (s.mission) {
    set('m-kicker', `MISSION ${s.mission.id} · ${s.mission.name}`);
    set('m-title', s.title || s.mission.name);
    set('m-stage', s.stage || '');
    set('m-reward', '$' + Number(s.mission.reward).toLocaleString('en-US'));
    set('m-obj', s.obj || '');
    set('m-next', s.next || '');
  }
  const tbl = document.getElementById('police-rows');
  if (tbl && s.police) {
    const rows = s.police.slice(0, 5).map((u) =>
      `<tr><td>${u.name}</td><td class="role">${u.role}</td><td class="r">${u.d} m</td></tr>`).join('');
    tbl.innerHTML = rows || '<tr><td colspan="3">No active units</td></tr>';
    set('police-count', `${s.police.length} UNIT${s.police.length === 1 ? '' : 'S'}`);
  }
  if (s.rp !== undefined) {
    set('f-rank', `RANK ${s.rank} · ${Number(s.rp).toLocaleString('en-US')} / ${Number(s.rpMax).toLocaleString('en-US')} RP`);
    const bar = document.getElementById('f-bar');
    if (bar) bar.style.width = `${Math.round((s.rp / s.rpMax) * 100)}%`;
  }
  if (s.weapons) {
    const slots = document.querySelectorAll('#weapons .wslot');
    s.weapons.forEach((w, i) => {
      const el = slots[i];
      if (!el) return;
      el.classList.toggle('sel', !!w.sel);
      const ammo = el.querySelector('.wa');
      if (ammo) ammo.textContent = w.ammo === Infinity ? '∞' : String(w.ammo);
    });
  }
  if (s.radio) set('radio-line', `♫ ${s.radio.name} — ${s.radio.genre} · ${s.radio.track}`);
  if (s.dialogue) set('dlg-line', s.dialogue);
  if (s.health !== undefined) {
    const hp = document.getElementById('hp-i');
    if (hp) hp.style.width = `${Math.round((s.health / s.maxHealth) * 100)}%`;
    set('hp-num', String(s.health));
    const ar = document.getElementById('ar-i');
    if (ar) ar.style.width = `${s.armour}%`;
    set('ar-num', String(s.armour));
  }
  if (s.packages !== undefined) set('pkg-line', `PACKAGES ${s.packages} / 4${s.taxiEarned ? ` · TAXI +$${Math.floor(s.taxiEarned)}` : ''}`);
  if (s.toast) {
    const t = document.getElementById('toast');
    if (t) { t.textContent = s.toast; t.style.opacity = '1'; clearTimeout(t._h); t._h = setTimeout(() => { t.style.opacity = '0'; }, 2600); }
  }
  const dmg = document.getElementById('dmg-line');
  if (dmg && s.health !== undefined) {
    const pct = Math.round((s.health / s.maxHealth) * 100);
    dmg.textContent = `CONDITION ${pct}% · ${100 - pct}% DENTED`;
  }
  const carName = document.getElementById('car-name');
  if (carName && s.vehicle) {
    carName.textContent = s.vehicle === 'sedan' ? 'MARINA SEDAN · STOLEN' :
      s.vehicle === 'taxi' ? 'CORAL CAB · TAXI' :
      s.vehicle === 'waiting' ? 'REEF RUNNER · BORROWED' :
      s.vehicle === 'boat' ? 'BAY SKIFF · SOUTHBOUND' : 'CORAL GT · VELOCE';
  }
}
