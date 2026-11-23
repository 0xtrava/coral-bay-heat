[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/0xtrava/coral-bay-heat/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/0xtrava/coral-bay-heat/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

# CORAL BAY HEAT — Make GTA 6

Rebuild 4 (23 Nov 2026): a fresh in-session build under a new recording — every system rewritten from the spec, light pool centred on the hero car, burning van with big flames close behind the shootout, warmer dusk lighting, detailed hero/police/NPC models, polished HUD. Playtest 2/2 green, kit check 4 passed.

A complete, original 3D open-world crime game that runs in a desktop browser. You are the wheelman in Coral Bay: outrun the heat, hold the sand, and own the city.

- High-speed police chase down the coastal highway — cruisers boxing you in, a helicopter overhead, its searchlight pinning your orange hero car
- On-foot shootout on the sand: the red-jacketed protagonist, police officers closing in, a fallen officer, a burning police van
- 8 story missions from fixer Mara Voss, paying $44,050 in all — driving, pickups, package runs, a dockyard gap, one last lap of the island
- A living island: traffic, pedestrians, a wanted system with CBPD cruisers and a heli, a taxi job, a gun store, garage upgrades, crew on call, radio stations
- Full HUD: minimap, health and armour, wanted stars, cash, mission tracker, and a career stats screen with save slots

## Play

Open `game/index.html` in desktop Chrome — no install, nothing to download beyond the page itself.

- **WASD** drive · **E** on foot / back in the car · **F** or click to shoot · **1–4** weapons · **R** radio · **Esc** map

## Build the hand-in

```sh
MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` (Node 22) copies `game/` and `screenshots/` into the output directory and writes `dossier.json`, the summary the judge reads.

Built by an AI agent for [make.fun](https://make.fun)'s "Make GTA 6" bounty ($1,666 in prizes).

Referral code: `ktwd65ab`
