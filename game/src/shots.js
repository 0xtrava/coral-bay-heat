// Screenshot staging for Coral Bay Heat: each of the four shots is a
// composed scene — the right place, the right traffic, the right light
// — built from the live game, never a still image. The capture script
// loads ?shot=<name> and this runs before __READY__ is set.
import * as THREE from 'three';

const SUNSET_CLOCK = '17:42';

function stageCover(game) {
  // M4 chase on Strand Boulevard at dusk: hero GT low in frame, four
  // cruisers ahead, heli overhead with its beam on the hero, the sun
  // low ahead down the vanishing point.
  game.startPlay();
  game.setMission(3); // M4 LOSE THE HEAT, step 0 = the chase
  game.setStep(0);
  game.setCash(18450);
  game.setClock(SUNSET_CLOCK);
  game.setWanted(3);
  game.teleportCar(12, 34, Math.PI); // facing north, up the boulevard
  game.placeCoverTraffic();
  // street-level chase cam: low behind the hero (south of it, looking
  // north up the boulevard), hero big at bottom-right, cruisers ahead,
  // sun and heli in the top of the frame — the v17 composition.
  // FIXED, not chase: the capture runs at ~1 fps, so a lerping chase
  // camera never converges and the hero ends up behind the camera.
  // Offset to the west so the hero reads rear-3/4, full car in frame —
  // straight behind it the rear bumper cropped out the bottom.
  game.setCameraMode('fixed', { x: 8.5, y: 2.8, z: 42.5 }, { x: 12.5, y: 2.2, z: 4 });
  game.hud.showHud(true);
  game.hud.showTitle(false);
  game.hud.showMap(false);
  game.hud.setDialogue('MARA VOSS · FIXER', 'The whole bay is lit up behind you — shake them off before the roadblock, then disappear.');
}

function stageShootout(game) {
  // M4 stand-off on the sand: red jacket centre, three officers with
  // red markers, fallen officer and blood pool, the burning van, stalls
  // and string lights, heli beam overhead, sunset behind.
  game.startPlay();
  game.setMission(3);
  game.setStep(1);
  game.setCash(18450);
  game.setClock(SUNSET_CLOCK);
  game.setWanted(3);
  game.placeShootoutScene();
  // foot cam south of the player, looking north AT the staged scene
  // (officers x 110-122, van, fallen) — the old aim looked south at
  // empty sand while the whole cast stood behind the camera.
  // FIXED, not foot: the capture runs at ~1 fps, so a lerping foot
  // camera never converges and ends up stuck inside a building.
  // Closer now, so the player fills a third of the frame, and aimed
  // slightly left so the fallen officer lands in the left third.
  game.setCameraMode('fixed', { x: 116, y: 2.0, z: 8.5 }, { x: 113, y: 1.4, z: -4 });
  game.hud.showHud(true);
  game.hud.showTitle(false);
  game.hud.showMap(false);
  game.hud.setDialogue('MARA VOSS · FIXER', 'Three stars and the whole beach is crawling with CBPD — hold the line, then vanish before backup lands.');
}

function stageMap(game) {
  // Pause map: 66.1% ring, nine progress bars, career stats, medals,
  // crew, three save slots, coloured districts and a purple route line.
  game.startPlay();
  game.setMission(6);
  game.setCash(18450);
  game.setClock(SUNSET_CLOCK);
  game.setCompletion(66.1);
  game.teleportCar(0, 0, Math.PI);
  game.setTarget(48, -48);
  game.hud.showHud(false);
  game.hud.showTitle(false);
  game.hud.showMap(true);
  game.hud.updateMapScreen(game.status());
  game.hud.drawBigMap(game.status());
}

function stageTitle(game) {
  // Title: the boulevard at dusk, hero GT parked in the foreground,
  // palms and beach people, the sun low ahead, the named hotels
  // readable down the street, menu and save slots on top.
  game.startPlay();
  game.setCash(18450);
  game.setClock(SUNSET_CLOCK);
  game.teleportCar(94, 12, Math.PI * 0.92);
  game.placeTitleTraffic();
  // fixed camera on the boulevard, between the palm rows, looking
  // north-west up the avenue: hero car left-foreground, sun centre,
  // hotel row ahead — the v17 title composition. Closer to the hotels
  // now (camera at z 20, not 70) so their signs read, and the camera
  // sits between palm rows so no frond dominates the frame.
  game.setCameraMode('fixed',
    { x: 96, y: 3.5, z: 20 },
    { x: 55, y: 8, z: -50 });
  game.hud.showHud(false);
  game.hud.showMap(false);
  game.hud.showTitle(true);
}

export function stageShot(game, shot) {
  if (shot === 'cover') stageCover(game);
  else if (shot === 'shootout') stageShootout(game);
  else if (shot === 'map') stageMap(game);
  else if (shot === 'title') stageTitle(game);
  else stageCover(game);
  // let the scene settle (heli drift, traffic, flames) before the frame
  game.settleFrames(6);
}
