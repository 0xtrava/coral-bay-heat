// Coral Bay Heat (rebuild v19) — HUD.
// Every panel is built here: mission + CBPD response on the left, fixer +
// weapons + crew on the right, health and speed bottom-left, a street-level
// minimap bottom-right, and the full map / title / fail / victory screens.
// Portraits and weapon icons are the painted canvas textures from
// materials.js, reused as data URLs so the HUD needs no image assets.

import { portraitTexture, weaponIconTexture } from './materials.js';
import { CREW, FIXER, RADIOS } from './missions.js';

function el(tag, cls, parent, html = '') {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html) e.innerHTML = html;
  if (parent) parent.appendChild(e);
  return e;
}

function imgFromTexture(tex) {
  const img = new Image();
  img.src = tex.image.toDataURL();
  return img;
}

export function buildHud() {
  const hud = document.getElementById('hud');
  const refs = {};

  // top-left: cash + clock
  const tl = el('div', 'hud-tl', hud);
  refs.cash = el('div', 'hud-cash', tl, '$500');
  refs.clock = el('div', 'hud-clock', tl, '17:42 · DAY 1');

  // top-right: wanted stars + banner
  const tr = el('div', 'hud-tr', hud);
  refs.stars = el('div', 'hud-stars', tr, '☆☆☆☆☆');
  refs.wantedBanner = el('div', 'hud-wanted', tr, '');
  refs.wantedBanner.style.display = 'none';

  // left column: mission, CBPD response, district
  const left = el('div', 'hud-left', hud);
  const mp = el('div', 'panel mission-panel', left);
  refs.missionKicker = el('div', 'mp-kicker', mp, 'MISSION');
  refs.missionTitle = el('div', 'mp-title', mp, 'M1 · FIRST WHEELS');
  refs.missionStage = el('div', 'mp-stage', mp, 'STAGE 1/2');
  refs.missionBrief = el('div', 'mp-brief', mp, '');
  refs.missionNext = el('div', 'mp-next', mp, '');
  const cbpd = el('div', 'panel cbpd-panel', left);
  el('div', 'cbpd-head', cbpd, '▲ CBPD RESPONSE <span id="cbpd-count">0 UNITS</span>');
  refs.cbpdList = el('div', 'cbpd-list', cbpd, '');
  const dp = el('div', 'panel district-panel', left);
  refs.districtName = el('div', 'dp-name', dp, 'DOWNTOWN');
  refs.districtSub = el('div', 'dp-sub', dp, 'Coral Bay · Strand Boulevard');
  const respect = el('div', 'dp-respect', dp);
  el('span', '', respect, 'RESPECT · Lv1 — ');
  refs.respectVal = el('span', '', respect, '58 / 100');
  const respectBar = el('div', 'bar', dp);
  refs.respectFill = el('div', 'bar-fill green', respectBar);
  refs.packagesLine = el('div', 'dp-packages', dp, 'PACKAGES 0 / 4');
  // health + armour live in the left column, v17-style
  const hb = el('div', 'panel health-panel', left);
  const hRow = el('div', 'hp-row', hb);
  el('span', 'hp-label', hRow, 'HEALTH');
  const hBar = el('div', 'bar', hRow);
  refs.healthFill = el('div', 'bar-fill red', hBar);
  refs.healthVal = el('span', 'hp-val', hRow, '100');
  const aRow = el('div', 'hp-row', hb);
  el('span', 'hp-label', aRow, 'ARMOUR');
  const aBar = el('div', 'bar', aRow);
  refs.armourFill = el('div', 'bar-fill blue', aBar);

  // right column: fixer, weapons, crew
  const right = el('div', 'hud-right', hud);
  const fx = el('div', 'panel fixer-card', right);
  const fxHead = el('div', 'fx-head', fx);
  el('span', 'fx-kicker', fxHead, 'FIXER');
  refs.fixerName = el('div', 'fx-name', fx, FIXER.name);
  refs.fixerRank = el('div', 'fx-rank', fx, FIXER.rank + ' · ' + FIXER.rp);
  const fxBar = el('div', 'bar', fx);
  refs.fixerFill = el('div', 'bar-fill amber', fxBar);
  const fxRow = el('div', 'fx-row', fx);
  fxRow.appendChild(imgFromTexture(portraitTexture('mara')));
  refs.fixerQuote = el('div', 'fx-quote', fxRow, FIXER.lines[0]);
  const wp = el('div', 'weapons', right);
  refs.weaponSlots = [];
  const weaponDefs = [
    { key: 'fists', label: 'FISTS' },
    { key: 'pistol', label: 'PISTOL' },
    { key: 'smg', label: 'SMG' },
    { key: 'shotgun', label: 'SHOTGUN' },
  ];
  weaponDefs.forEach((w, i) => {
    const slot = el('div', 'weapon-slot', wp);
    slot.appendChild(imgFromTexture(weaponIconTexture(w.key)));
    el('div', 'ws-num', slot, String(i + 1));
    el('div', 'ws-label', slot, w.label);
    const ammo = el('div', 'ws-ammo', slot, '∞');
    refs.weaponSlots.push({ slot, ammo });
  });
  const crew = el('div', 'crew', right);
  refs.crewCards = [];
  for (const c of CREW) {
    const card = el('div', 'panel crew-card', crew);
    card.appendChild(imgFromTexture(portraitTexture(c.id)));
    const body = el('div', 'cc-body', card);
    el('div', 'cc-name', body, `<b>${c.name}</b> · ${c.role}`);
    el('div', 'cc-skill', body, `${c.skill} — ${c.desc}`);
    refs.crewCards.push(card);
  }

  // bottom-left: minimap (v17 puts the round street map here)
  const bl = el('div', 'hud-bl', hud);
  const mmWrap = el('div', 'minimap-wrap', bl);
  refs.minimap = document.createElement('canvas');
  refs.minimap.width = 180; refs.minimap.height = 180;
  mmWrap.appendChild(refs.minimap);
  refs.minimapLabel = el('div', 'minimap-label', mmWrap, 'DOWNTOWN');

  // bottom-right: speed, car, radio
  const br = el('div', 'hud-br', hud);
  refs.speedo = el('div', 'speedo', br, '<b>0</b> KM/H');
  refs.carName = el('div', 'car-name', br, 'CORAL GT · VELOCE');
  refs.carCond = el('div', 'car-cond', br, 'CONDITION 100%');
  refs.radioLine = el('div', 'radio-line', br, '♪ CORAL FM 98.1 — Island Pop');

  // bottom-centre: dialogue bar
  refs.dialogue = el('div', 'dialogue', hud, '');
  refs.dialogue.style.display = 'none';

  return refs;
}

// Draw the street map onto a canvas: roads, blocks, beach, sea, markers.
// `view` is { x, z, heading, waypoint, police: [{x,z}], scale }.
export function drawMinimap(canvas, view) {
  const g = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  g.clearRect(0, 0, W, H);
  // sea + sand on the east edge
  g.fillStyle = '#155a7d';
  g.fillRect(W * 0.86, 0, W * 0.14, H);
  g.fillStyle = '#e8c98f';
  g.fillRect(W * 0.80, 0, W * 0.06, H);
  // land
  g.fillStyle = '#22331f';
  g.fillRect(0, 0, W * 0.80, H);
  // blocks
  g.fillStyle = '#3d5a3a';
  const xs = [-96, -60, -24, 12, 48, 84];
  const zs = [-96, -60, -24, 12, 48, 84];
  const px = (x) => ((x + 120) / 240) * W;
  const pz = (z) => ((z + 120) / 240) * H;
  for (let i = 0; i < xs.length - 1; i++) {
    for (let j = 0; j < zs.length - 1; j++) {
      g.fillRect(px(xs[i] + 6), pz(zs[j] + 6), px(xs[i + 1] - 6) - px(xs[i] + 6), pz(zs[j + 1] - 6) - pz(zs[j] + 6));
    }
  }
  // roads
  g.strokeStyle = '#c9c2b2';
  g.lineWidth = 3;
  for (const x of xs) {
    g.beginPath(); g.moveTo(px(x), 0); g.lineTo(px(x), H); g.stroke();
  }
  for (const z of zs) {
    g.beginPath(); g.moveTo(0, pz(z)); g.lineTo(W, pz(z)); g.stroke();
  }
  // pier
  g.strokeStyle = '#c9a06a';
  g.lineWidth = 4;
  g.beginPath(); g.moveTo(px(106), pz(72)); g.lineTo(px(140), pz(72)); g.stroke();
  // route line from the player to the waypoint (purple, like a sat-nav)
  if (view.waypoint) {
    g.strokeStyle = '#b45cff';
    g.lineWidth = 3;
    g.setLineDash([7, 5]);
    g.beginPath(); g.moveTo(px(view.x), pz(view.z)); g.lineTo(px(view.waypoint[0]), pz(view.waypoint[1])); g.stroke();
    g.setLineDash([]);
  }
  // police blips
  for (const p of view.police || []) {
    g.fillStyle = '#e02020';
    g.beginPath(); g.arc(px(p.x), pz(p.z), 3.5, 0, Math.PI * 2); g.fill();
  }
  // waypoint diamond
  if (view.waypoint) {
    g.fillStyle = '#ffd24d';
    g.save();
    g.translate(px(view.waypoint[0]), pz(view.waypoint[1]));
    g.rotate(Math.PI / 4);
    g.fillRect(-5, -5, 10, 10);
    g.restore();
  }
  // player arrow
  g.save();
  g.translate(px(view.x), pz(view.z));
  g.rotate(view.heading);
  g.fillStyle = '#ff6a00';
  g.strokeStyle = '#fff';
  g.lineWidth = 1.5;
  g.beginPath();
  g.moveTo(0, -8); g.lineTo(6, 6); g.lineTo(0, 3); g.lineTo(-6, 6);
  g.closePath(); g.fill(); g.stroke();
  g.restore();
  // north tick
  g.fillStyle = '#fff';
  g.font = 'bold 11px Arial';
  g.fillText('N', 6, 14);
}

export function buildScreens() {
  // ---- map screen ----
  const map = document.getElementById('map-screen');
  map.innerHTML = `
    <div class="ms-top"><span class="ms-title">CORAL BAY <b>HEAT</b></span>
    <span class="ms-tabs">MAP&nbsp;&nbsp;STORY&nbsp;&nbsp;STATS&nbsp;&nbsp;CREW&nbsp;&nbsp;SETTINGS&nbsp;&nbsp;CONTROLS&nbsp;&nbsp;SAVE</span>
    <span class="ms-cash" id="ms-cash">$18,450</span></div>
    <div class="ms-body">
      <div class="ms-mapwrap"><canvas id="ms-map" width="560" height="420"></canvas>
      <div class="ms-mapfoot">CORAL BAY · ISLAND MAP · PRESS M TO CLOSE</div></div>
      <div class="ms-side">
        <div class="ms-ring"><span id="ms-pct">66.1%</span><small>COMPLETE</small></div>
        <div class="ms-sec">MISSION RATINGS</div>
        <div class="ms-ratings" id="ms-ratings"></div>
        <div class="ms-sec">PROGRESS</div>
        <div id="ms-progress"></div>
        <div class="ms-sec">CAREER STATS</div>
        <div id="ms-career"></div>
        <div class="ms-sec">CREW</div>
        <div id="ms-crew"></div>
      </div>
    </div>
    <div class="ms-slots" id="ms-slots"></div>`;
  // ---- title screen ----
  const title = document.getElementById('title-screen');
  title.innerHTML = `
    <div class="ts-left">
      <div class="ts-title">CORAL BAY<br><span>HEAT</span></div>
      <div class="ts-tag">AN OPEN-WORLD CRIME STORY — ON AN ISLAND THAT NEVER EXISTED</div>
      <div class="ts-menu">
        <div class="ts-item sel">▶ CONTINUE</div>
        <div class="ts-item">NEW GAME</div>
        <div class="ts-item">LOAD GAME</div>
        <div class="ts-item">SETTINGS</div>
      </div>
    </div>
    <div class="ts-right" id="ts-slots"></div>
    <div class="ts-foot">THE CITY IS YOURS<br><small>CORAL BAY HEAT · 2026 · PRESS ANY KEY TO PLAY</small></div>`;
  // ---- fail overlay ----
  const fail = document.getElementById('fail');
  fail.innerHTML = `<div class="fail-box"><div class="fail-title">WRECKED</div>
    <div class="fail-sub">The GT is scrap. Mara is not happy.</div>
    <div class="fail-hint">Press R to retry — the car comes back fresh.</div></div>`;
  fail.style.display = 'none';
  // ---- victory overlay ----
  const vic = document.getElementById('victory');
  vic.innerHTML = `<div class="vic-box"><div class="vic-title">VICTORY</div>
    <div class="vic-sub" id="vic-sub">The bay is yours — $44,050</div>
    <div class="vic-hint">Press Enter to keep cruising Coral Bay.</div></div>`;
  vic.style.display = 'none';
}

export function fillSaveSlots(el, slots) {
  el.innerHTML = '';
  slots.forEach((s, i) => {
    const d = document.createElement('div');
    d.className = 'save-slot' + (s ? ' filled' : '');
    d.innerHTML = s
      ? `<b>SLOT ${i + 1}</b> · ${s.label}<br><span>${s.detail}</span>`
      : `<b>SLOT ${i + 1}</b> — EMPTY<br><span>NO SAVE YET</span>`;
    el.appendChild(d);
  });
}

export function fillProgress(el, rows) {
  el.innerHTML = '';
  for (const r of rows) {
    const row = document.createElement('div');
    row.className = 'prog-row';
    row.innerHTML = `<span>${r.label}</span><div class="bar"><div class="bar-fill green" style="width:${r.pct}%"></div></div><b>${r.text}</b>`;
    el.appendChild(row);
  }
}

export function fillCareer(el, stats) {
  el.innerHTML = `
    <div class="career-grid">
      <div>CARS STOLEN <b>${stats.carsStolen}</b></div><div>COPS ESCAPED <b>${stats.copsEscaped}</b></div>
      <div>DISTANCE DRIVEN <b>${stats.distanceKm} KM</b></div><div>PEOPLE TAKEN OUT <b>${stats.peopleTakenOut}</b></div>
      <div>LONGEST JUMP <b>${stats.longestJumpM} M</b></div><div>HIDDEN BY LOCALS <b>${stats.hiddenByLocals}</b></div>
    </div>
    <div class="career-line">Missions: ${stats.missionsDone} / 8 · Cash earned: $${stats.cashEarned.toLocaleString('en-US')} · Time: ${stats.time} · Day ${stats.day}</div>`;
}

export function fillRatings(el, medals) {
  el.innerHTML = '';
  for (const m of medals) {
    const s = document.createElement('span');
    s.className = 'medal ' + (m === '–' ? 'empty' : m.toLowerCase());
    s.textContent = m;
    el.appendChild(s);
  }
}

// Push the whole game state into the HUD. Called every frame (cheap DOM writes).
export function updateHud(refs, st) {
  refs.cash.textContent = '$' + st.cash.toLocaleString('en-US');
  refs.clock.textContent = st.time + ' · DAY ' + st.day;
  const filled = '★'.repeat(st.wanted);
  const empty = '☆'.repeat(Math.max(0, 5 - st.wanted));
  refs.stars.textContent = filled + empty;
  refs.stars.style.color = st.wanted >= 3 ? '#ff5e5e' : '#ffd24d';
  if (st.wanted >= 2) {
    refs.wantedBanner.style.display = 'block';
    refs.wantedBanner.textContent = `WANTED · LEVEL ${st.wanted}` + (st.wanted >= 4 ? ' · AIR UNIT DEPLOYED' : '');
  } else {
    refs.wantedBanner.style.display = 'none';
  }
  refs.missionTitle.textContent = `${st.missionId} · ${st.missionTitle}`;
  refs.missionStage.textContent = `STAGE ${st.step + 1}/${st.missionSteps} · $${st.payout.toLocaleString('en-US')}`;
  refs.missionBrief.textContent = st.missionBrief;
  refs.missionNext.textContent = st.stepText ? 'NEXT  ' + st.stepText : '';
  refs.cbpdList.innerHTML = st.police.map((p) =>
    `<div class="cbpd-row"><span>${p.name}</span><span class="cbpd-role">${p.role}</span><b>${p.dist} m</b></div>`).join('')
    || '<div class="cbpd-row"><span>—</span><span class="cbpd-role">NO UNITS</span><b>—</b></div>';
  document.getElementById('cbpd-count').textContent = st.police.length + ' UNITS';
  refs.districtName.textContent = st.district;
  refs.districtSub.textContent = 'Coral Bay · ' + st.districtSub;
  refs.respectVal.textContent = st.respect + ' / 100';
  refs.respectFill.style.width = st.respect + '%';
  refs.packagesLine.textContent = `PACKAGES ${st.packages} / 4`;
  refs.fixerName.textContent = FIXER.name;
  refs.fixerRank.textContent = FIXER.rank + ' · ' + FIXER.rp;
  refs.fixerFill.style.width = '42%';
  refs.fixerQuote.textContent = st.fixerLine;
  st.weapons.forEach((w, i) => {
    const slot = refs.weaponSlots[i];
    if (!slot) return;
    slot.slot.classList.toggle('active', i === st.weaponIndex);
    slot.ammo.textContent = w.ammo === Infinity ? '∞' : String(w.ammo);
  });
  refs.healthFill.style.width = Math.max(0, (st.health / st.maxHealth) * 100) + '%';
  refs.healthVal.textContent = String(Math.max(0, Math.round(st.health)));
  refs.armourFill.style.width = st.armour + '%';
  refs.speedo.innerHTML = `<b>${Math.round(st.speedKmh)}</b> KM/H`;
  refs.carName.textContent = 'CORAL GT · VELOCE';
  refs.carCond.textContent = `CONDITION ${Math.round((st.health / st.maxHealth) * 100)}%` + (st.health < st.maxHealth * 0.5 ? ' · DENTED' : '');
  refs.radioLine.textContent = '♪ ' + RADIOS[st.radio] + ' — Island Pop';
  refs.minimapLabel.textContent = st.district;
  if (st.dialogue) {
    refs.dialogue.style.display = 'block';
    refs.dialogue.innerHTML = `<b>MARA VOSS · FIXER</b> — ${st.dialogue}`;
  } else {
    refs.dialogue.style.display = 'none';
  }
  drawMinimap(refs.minimap, {
    x: st.pos.x, z: st.pos.z, heading: st.heading,
    waypoint: st.waypoint, police: st.police.map((p) => ({ x: p.x, z: p.z })),
  });
}
