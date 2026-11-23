// Screenshot staging for Coral Bay Heat. `?shot=cover|shootout|map|title`
// arranges the scene and camera for each of the four dossier shots, then
// the capture harness screenshots after __READY__. Every shot answers
// the same question — which car / character is ours? — by putting the
// hero biggest, closest and lit.
//
// The game calls stageShot(name) after boot; the shot modules only move
// the camera and actors, they never change mission state.

export function stageShot(game, name) {
  if (name === 'cover') return stageCover(game);
  if (name === 'shootout') return stageShootout(game);
  if (name === 'map') return stageMap(game);
  if (name === 'title') return stageTitle(game);
  return null;
}

// Cover: a chase down the beach road, east into the sunset. The orange
// hero car leads, low and huge in the lower right; four cruisers fan out
// behind it; the heli hangs ahead with its beam slanting back down onto
// the hero and its pool glowing under the car. Staged on M6 (Pier 9 Run
// — both its legs are drives, so the shot can never flip to the
// shootout scene while the car coasts).
function stageCover(game) {
  game.setMission(5); // M6 PIER 9 RUN
  game.placeHero(45, 0, Math.PI / 2); // east down the beach road, into the sun
  // The hero coasts at ~3 u/s² from the moment the shot is staged, so
  // start at 35 to read 111 KM/H when the capture fires (~1.5 s later).
  game.setSpeed(35); // 111 KM/H on the HUD at capture
  game.state.cash = 21000;
  game.setWanted(3);
  game.placePoliceChase();
  game.setCamera('cover');
  game.setScreen(null);
  game.hud.setDialogue('Mara Voss: "Every cruiser in Coral Bay is behind you, kid. Drive."');
  return 'cover';
}

// Shootout: on foot on the beach, player centre with back to camera,
// pistol raised, crosshair up; three officers with red markers ahead;
// the fallen officer and the blood pool to the left; the burning van
// close behind the officers, flames big. Stages M4's shoot leg so the
// mission panel reads STAND-OFF ON THE SAND.
function stageShootout(game) {
  game.setMission(3);
  game.setLeg(1);
  // Wanted AFTER the mission places the car, so the response units
  // spawn around the car (26 m) instead of the origin (134 m away).
  game.setWanted(3);
  game.state.cash = 9500; // M4's cash — the HUD must not read $0 mid-story
  game.setCamera('shootout');
  game.stageTracer(); // a live tracer to the nearest officer, held for the shot
  game.setScreen(null);
  game.hud.setDialogue('Mara Voss: "Hold the beach. Three officers, one van — make it count."');
  return 'shootout';
}

// Map: the pause map, 66.1% ring, 9 progress bars, career stats, crew,
// three save slots.
function stageMap(game) {
  game.placeHero(0, 0, 0);
  game.setCamera('top');
  game.setScreen('map');
  return 'map';
}

// Title: the title screen over a dusk boulevard with the hero car on
// the road and the skyline behind it.
function stageTitle(game) {
  game.placeHero(0, 20, 0);
  game.setWanted(0);
  game.setCamera('title');
  game.setScreen('title');
  return 'title';
}
