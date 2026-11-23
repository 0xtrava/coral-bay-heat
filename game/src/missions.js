// Coral Bay Heat (rebuild v19) — story, missions, packages, taxi, boats.
// Eight missions, $43,550 of payouts on top of a $500 starting stake, so a
// clean run ends on VICTORY at exactly $44,050. Every waypoint sits on a
// road centreline (or on open sand / the pier deck) so the autopilot never
// has to cut a corner through a building.

export const START_CASH = 500;
export const VICTORY_CASH = 44050;

export const CREW = [
  { id: 'mira', name: 'Mira', role: 'Driver', skill: 'Swap Plates', desc: 'Getaway wheel — +top speed on call' },
  { id: 'lio', name: 'Lio', role: 'Mechanic', skill: 'Quick Fix', desc: 'Repairs the car to full health' },
  { id: 'kiki', name: 'Kiki', role: 'Lookout', skill: 'Eyes Out', desc: 'Spots the heat before it spots you' },
];

export const FIXER = {
  name: 'MARA VOSS', role: 'FIXER', rank: 'RANK C', rp: '2,180 / 5,200 RP',
  lines: [
    'The whole bay is lit up behind you — shake them off before the roadblock, then disappear.',
    'Three stars and the whole of CBPD is on your tail — outrun the cruisers, break line of sight, and vanish.',
    'CBPD cordoned the beach. They think they have the car — you are going to give them a show instead.',
    'Hold the beach. Three officers, one van — make it count.',
    'The boat leaves Pier 9 at sundown. The cargo has to be on it — and so do you, briefly.',
    'One last lap, kid.',
  ],
};

export const WEAPONS = [
  { name: 'FISTS', icon: 'fists', ammo: Infinity, price: 0 },
  { name: 'PISTOL', icon: 'pistol', ammo: 60, price: 0 },
  { name: 'SMG', icon: 'smg', ammo: 0, price: 150, pack: 120 },
  { name: 'SHOTGUN', icon: 'shotgun', ammo: 12, price: 0 },
];

export const RADIOS = ['CORAL FM 98.1', 'ISLAND POP', 'MARINA LIGHTS', 'KPD SCANNER'];

// Steps: { kind: 'drive' | 'collect' | 'shootout', at: [x, z], text }
export const MISSIONS = [
  {
    id: 'M1', title: 'FIRST WHEELS', payout: 2000,
    brief: 'Mara Voss needs a driver with a fast car. Take the orange GT and show her the bay.',
    steps: [
      { kind: 'drive', at: [48, 12], text: 'Meet Mara at the downtown plaza' },
      { kind: 'drive', at: [84, -24], text: 'Cruise the beachfront to the crew' },
    ],
  },
  {
    id: 'M2', title: 'CROSS-TOWN RUN', payout: 3000,
    brief: 'A package for the docks, then a pickup up north. No questions, no stops.',
    steps: [
      { kind: 'drive', at: [-60, -60], text: 'Drop the parcel at the docks' },
      { kind: 'drive', at: [12, -96], text: 'Pick up the northside buyer' },
    ],
  },
  {
    id: 'M3', title: 'FOUR CORNERS', payout: 4000,
    brief: 'Four stashes, four corners of the island. Grab them all before CBPD wakes up.',
    steps: [
      { kind: 'collect', at: [48, -60], text: 'Grab the stash at Northside' },
      { kind: 'collect', at: [-60, 12], text: 'Grab the stash at Old Town' },
      { kind: 'collect', at: [84, 48], text: 'Grab the stash at Marina Beach' },
      { kind: 'collect', at: [-24, -96], text: 'Grab the stash at the Docks' },
    ],
  },
  {
    id: 'M4', title: 'STAND-OFF ON THE SAND', payout: 5000,
    brief: 'Police have the beach surrounded — hold the line, take down three officers, then break out.',
    steps: [
      { kind: 'drive', at: [108, 24], text: 'Drive to the beach staging point' },
      { kind: 'shootout', at: [114, 24], text: 'Take down 3 officers' },
    ],
  },
  {
    id: 'M5', title: 'LOSE THE HEAT', payout: 6000,
    brief: 'Three stars and the whole of CBPD is on your tail — outrun the cruisers and vanish.',
    steps: [
      { kind: 'drive', at: [48, 84], text: 'Break line of sight at Pier 9' },
      { kind: 'drive', at: [-24, 48], text: 'Vanish through the garage district' },
    ],
  },
  {
    id: 'M6', title: 'PIER 9 RUN', payout: 7000,
    brief: 'The boat leaves Pier 9 at sundown. The cargo has to be on it — and so do you, briefly.',
    steps: [
      { kind: 'drive', at: [108, 72], text: 'Drive out to Pier 9' },
      { kind: 'drive', at: [134, 72], text: 'Board the boat at the pier end' },
    ],
  },
  {
    id: 'M7', title: 'DOCKLANDS DASH', payout: 8000,
    brief: 'A rival crew is moving on the docks. Beat them to the drop, twice.',
    steps: [
      { kind: 'drive', at: [-96, 48], text: 'Reach the west docks first' },
      { kind: 'drive', at: [-60, -96], text: 'Cut across to the north gate' },
    ],
  },
  {
    id: 'M8', title: 'THE LAST LAP', payout: 8550,
    brief: 'One last lap of the island. Bring it home and the bay is yours.',
    steps: [
      { kind: 'drive', at: [12, 12], text: 'Return to the downtown plaza' },
      { kind: 'drive', at: [48, 12], text: 'Park it where Mara can see it' },
    ],
  },
];

export const SHOPS = {
  gun: { name: 'IRONWORKS GUNS', x: 30, z: -42, radius: 30 },
  garage: { name: 'SUNSET GARAGE', x: -38, z: 96, radius: 30 },
};

export const UPGRADES = {
  speed: { price: 400, topSpeed: 42 },
  health: { price: 300, maxHealth: 120 },
};

export const BASE_TOP_SPEED = 36;
export const BASE_MAX_HEALTH = 100;

// Boats for the pick rule: the destination is the south marina exit.
// Boat 2 (RED TIDE) sits closest to that exit, so the rule must pick it.
export const BOATS = [
  { name: 'BLUE MARLIN', x: -96, z: -96, color: 0x4d8fd1 },
  { name: 'WHITE GULL', x: 150, z: -24, color: 0xf2f2ee },
  { name: 'RED TIDE', x: 120, z: 96, color: 0xd94f3d },
];
export const MARINA_EXIT = { x: 108, z: 110 };

export function pickBoatForDestination() {
  let best = 0, bestD = Infinity;
  BOATS.forEach((b, i) => {
    const d = Math.hypot(b.x - MARINA_EXIT.x, b.z - MARINA_EXIT.z);
    if (d < bestD) { bestD = d; best = i; }
  });
  return best;
}

// Career numbers shown on the map screen (staged and live share the shape).
export function careerStats(state) {
  return {
    carsStolen: 41,
    copsEscaped: 12,
    distanceKm: 48.2,
    peopleTakenOut: 23,
    longestJumpM: 47,
    hiddenByLocals: 38,
    missionsDone: state.mission,
    cashEarned: state.cash,
    time: '17:42',
    day: 1,
  };
}
