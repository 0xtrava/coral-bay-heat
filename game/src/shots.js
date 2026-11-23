// Coral Bay Heat (rebuild v19) — screenshot staging.
// When the page loads with ?shot=cover|shootout|map|title, the game is
// posed into that moment before __READY__ fires: hero, cruisers, heli,
// officers, van, sun and HUD values are all placed by hand, the way a
// photographer would block a scene. The world itself is the real game.

import { drawMinimap, fillSaveSlots, fillProgress, fillCareer, fillRatings } from './hud.js';
import { FIXER } from './missions.js';

function stageHud(game, patch) {
  Object.assign(game.state, patch);
  game.hudDirty = true;
}

// Big street map for the map screen: the minimap drawing plus district
// labels, street names and the player marker, on the 560x420 canvas.
export function drawBigMap(canvas, view) {
  drawMinimap(canvas, view);
  const g = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const px = (x) => ((x + 120) / 240) * W;
  const pz = (z) => ((z + 120) / 240) * H;
  g.font = 'bold 15px Arial';
  g.textAlign = 'center';
  const labels = [
    ['DOWNTOWN', 12, -6, '#ffd24d'],
    ['MARINA BEACH', 96, 0, '#ffe9a8'],
    ['PIER 9', 78, 96, '#ffd24d'],
    ['THE DOCKS', -48, -78, '#9fd8ff'],
    ['OLD TOWN', -84, -6, '#ffd24d'],
    ['NORTHSIDE', 72, -78, '#ffd24d'],
    ['GARAGE', -72, 84, '#9fd8ff'],
  ];
  for (const [text, x, z, color] of labels) {
    g.fillStyle = 'rgba(0,0,0,0.45)';
    const w = g.measureText(text).width + 12;
    g.fillRect(px(x) - w / 2, pz(z) - 11, w, 20);
    g.fillStyle = color;
    g.fillText(text, px(x), pz(z) + 4);
  }
  g.font = 'bold 11px Arial';
  g.fillStyle = '#e8e4d8';
  g.fillText('STRAND BLVD', px(84), pz(-100));
  g.fillText('CORAL BAY · ISLAND MAP', W / 2, H - 8);
}

export function stageShot(game, shot) {
  const S = game.state;
  if (shot === 'cover') {
    // M6 chase up the beachfront avenue, sun low ahead, heli overhead.
    // The hero is parked for the still: the speedo is staged to 110.
    game.teleportHero(84, -30, Math.PI);
    game.parkHero();
    stageHud(game, {
      cash: 21000, mission: 5, step: 0, missionId: 'M6', missionTitle: 'PIER 9 RUN',
      missionSteps: 2, payout: 7000, wanted: 3, stagedSpeedKmh: 110,
      missionBrief: 'The boat leaves Pier 9 at sundown. The cargo has to be on it — and so do you, briefly.',
      stepText: 'Drive out to Pier 9',
      fixerLine: FIXER.lines[4],
      dialogue: 'Every cruiser in Coral Bay is behind you, kid. Drive.',
    });
    // three cruisers ahead, holding the hero's pace so none blocks the shot
    const spots = [[84, -42, 12], [84, -44, 14], [84, -47, 17], [84, -51, 21]];
    game.placePolice(spots, 30.5);
    game.placeHeli(84, -62, 24);
    game.setSun(0.15, 0.20, -1);
    game.setTrafficVisible(true);
    return;
  }
  if (shot === 'shootout') {
    // M4 on the sand: player centre, officers marked, van burning, heli above.
    game.enterFoot(112, 24, Math.PI / 2);
    stageHud(game, {
      cash: 9500, mission: 3, step: 1, missionId: 'M4', missionTitle: 'STAND-OFF ON THE SAND',
      missionSteps: 4, payout: 5000, wanted: 3,
      missionBrief: 'Police have the beach surrounded — hold the line, take down three officers, then break out.',
      stepText: 'Hold the beach — take down 3 officers',
      fixerLine: FIXER.lines[3],
      dialogue: 'Hold the beach. Three officers, one van — make it count.',
    });
    game.placeOfficers([
      [118, 18], [120, 27], [116, 31],
    ]);
    game.placeFallenOfficer(114, 28);
    game.placeBurningVan(121, 20);
    game.placeHeli(116, 6, 20);
    game.placeBystanders([[110, 30], [109, 18], [115, 34], [108, 26]]);
    game.placeTracer();
    game.setSun(1, 0.16, 0.15);
    game.setTrafficVisible(true);
    return;
  }
  if (shot === 'map') {
    game.showMapScreen({
      pct: 66.1, cash: 18450, missionsDone: 7,
      progress: [
        { label: 'STORY MISSIONS', pct: 75, text: '6 / 8' },
        { label: 'DRIVING', pct: 81, text: '81%' },
        { label: 'SHOOTING', pct: 54, text: '54%' },
        { label: 'COLLECTION', pct: 42, text: '42%' },
        { label: 'EXPLORATION', pct: 73, text: '73%' },
        { label: 'STUNTS', pct: 38, text: '38%' },
        { label: 'CREW', pct: 60, text: '60%' },
        { label: 'RADIO', pct: 90, text: '90%' },
        { label: 'SECRETS', pct: 25, text: '25%' },
      ],
      career: { carsStolen: 41, copsEscaped: 12, distanceKm: 48.2, peopleTakenOut: 23, longestJumpM: 47, hiddenByLocals: 38, missionsDone: 7, cashEarned: 18450, time: '17:42', day: 1 },
      medals: ['G', 'S', 'G', 'B', 'S', 'G', '–', '–'],
      slots: [
        { label: 'ACT 2 · 66.1% COMPLETE', detail: 'MARINA BEACH · $18,450 · 17:42' },
        null, null,
      ],
    });
    drawBigMap(document.getElementById('ms-map'), {
      x: 12, z: 12, heading: 0, waypoint: [48, 12],
      police: [{ x: 84, y: 0, z: -40 }],
    });
    game.setSun(0.15, 0.20, -1);
    return;
  }
  if (shot === 'title') {
    // Boulevard at dusk: hotels signed and fully visible, hero parked big.
    game.teleportHero(90, 42, Math.PI * 0.72);
    game.parkHero();
    game.placeHeli(60, -30, 26);
    game.showTitleScreen([
      { label: 'ACT 2 · 66% COMPLETE', detail: 'MARINA BEACH · $18,450 · 12:34' },
      null, null,
    ]);
    game.setTitleCamera([86, 68], [74, -20]);
    game.setSun(-0.25, 0.20, -1);
    game.setTrafficVisible(true);
  }
}
