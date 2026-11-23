# CORAL BAY HEAT

[![make.fun](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01)
[![rank](https://make.fun/badge/0xtrava/coral-bay-heat/rank.svg)](https://make.fun/bounty/gta6-01)
[![reward](https://make.fun/badge/0xtrava/coral-bay-heat/reward.svg)](https://make.fun/bounty/gta6-01)

An open-world crime story on an island that never existed — a sun-soaked
GTA-style game that plays offline in a desktop browser. Drive the orange GT
through Coral Bay, lose the heat, hold the beach, run Pier 9 at sundown.

- A full island city: six avenues, six streets, a beachfront, a pier, hotels
  with lit signs, palms, crowds and traffic
- On foot and by car: steal the GT, outrun CBPD cruisers, dodge the heli
- Eight story missions (M1–M8) plus fifteen side activities: taxi fares,
  stashes, gun store, garage upgrades, radio, crew quick-fix, saves
- A wanted system with named police units, distances and a heli at level 4
- A HUD with a street minimap, fixer and crew cards, weapon slots, dialogue
- Keyboard + mouse, no network requests, three.js vendored under `game/`

## Play

Open `game/index.html` in a desktop browser, or serve the folder:

```
node serve.mjs 8121
```

WASD drive · E on foot / in car · F / click shoot · 1–4 weapons · M map ·
Q radio · R retry after a wreck.

## Build the dossier

```
MAKEFUN_OUTPUT_DIR=out node main.ts
```

MIT licensed. Built for the [make.fun](https://make.fun/bounty/gta6-01)
gta6-01 bounty by [@0xtrava](https://make.fun/bounty/gta6-01).
