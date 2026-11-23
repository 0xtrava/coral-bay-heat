# CORAL BAY HEAT

[![make.fun](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01)
[![rank](https://make.fun/badge/gta6-01/0xtrava/coral-bay-heat/rank.svg)](https://make.fun/bounty/gta6-01)
[![reward](https://make.fun/badge/gta6-01/0xtrava/coral-bay-heat/reward.svg)](https://make.fun/bounty/gta6-01)

An open-world crime game in the spirit of GTA 6, built for [make.fun](https://make.fun/bounty/gta6-01) — competition **gta6-01**. One island, one fixer, eight jobs, and a boat waiting past the breakwater.

## The game

You are the new driver for Mara Voss, a fixer working the island of Coral Bay. The city is a grid of avenues and streets wrapped around a beach, a pier, a marina and the sea — with traffic, pedestrians, beachgoers, a market, and the CBPD always one bad decision away.

Run all eight jobs and the RED TIDE is yours:

1. **FIRST WHEELS** — meet the fixer downtown, drop the parcel at Marina Beach. $2,000
2. **THE PICKUP** — fetch a client up north, get him south. $3,000
3. **FOUR PACKAGES** — four drops stashed around the island. $4,000
4. **LOSE THE HEAT** — a stand-off on the sand with three officers. $5,000
5. **PIER 9 RUN** — drive out to the end of the pier. $6,000
6. **LOSE THE HEAT** — three stars, the whole of CBPD on your tail. $7,000
7. **THE DOCKS** — a crate at the docks, run it north. $8,000
8. **RED TIDE** — board the boat at the south marina and sail past the breakwater. $8,550

Finish all eight and the payout is **$44,050**.

## What is in it

- A drivable island: roads, beach, pier, marina, sea, named hotels (HOTEL CORAL, LAGUNA RASI, PALM COURT), a garage and a gun store.
- Traffic, a scooter rider, pedestrians and beachgoers; cars you can steal.
- A wanted level with CBPD cruisers that chase and ram, and a helicopter with a searchlight at three stars and up.
- Combat on foot (fists, pistol, SMG, shotgun), a gun store and a garage for upgrades.
- A crew — Mira the driver, Lio the mechanic, Kiki the lookout — and a taxi meter for side money.
- A HUD with a mission card, a CBPD response list, district and respect, health and armour, a round minimap, a fixer card, weapon slots, speed and radio; a pause map with a ring, progress bars, career stats, medals and save slots.
- A save system (localStorage) and a title screen with three save slots.
- Procedural audio: engine hum, radio stations, gunshots, sirens.
- An autopilot that drives the mission route for you — used by the playtest, and handy if you just want to watch the island go by.

## How to play

Serve the repo and open it in a desktop browser (Chrome recommended):

```sh
node serve.mjs 8080
# open http://localhost:8080/game/index.html
```

Keyboard: **W/A/S/D** or arrows to drive, **E** to get in and out of a car, **F** to shoot, **R** to change the radio, **1–4** to switch weapons, **M** for the map, **Esc** to close it. Any key starts from the title screen.

## How to check it

```sh
node test/playtest.mjs all 2   # SEQ (autopilot M1→M8 to VICTORY) + 15 side checks, twice
node capture.mjs all           # the four screenshots into screenshots/
```

The game runs entirely from static files — no network request — with three.js vendored under `game/vendor/`.

## Files

- `game/index.html` — the page and the HUD.
- `game/src/` — the game: `game.js` (loop, missions, combat, police), `city.js` (island, hotels, market), `cars.js`, `people.js`, `heli.js`, `autopilot.js`, `hud.js`, `audio.js`, `missions.js`, `save.js`, `shots.js`, `rng.js`, `materials.js`.
- `game/vendor/three.module.js` + `three.core.js` — three.js, vendored.
- `main.ts` — the make.fun dossier entry (`node main.ts`).
- `screenshots/` — the four entry screenshots: cover, shootout, map, title.

Built for the [gta6-01 bounty on make.fun](https://make.fun/bounty/gta6-01).
