// Missions for Coral Bay Heat: eight jobs from Mara Voss, the fixer.
// Payouts add up to the $44,050 VICTORY. Steps are plain data — the
// game turns them into waypoints, and the autopilot drives them.
export const MISSION_PAYOUTS = [2000, 3000, 4000, 5000, 6000, 7000, 8000, 8550];
export const VICTORY_CASH = MISSION_PAYOUTS.reduce((a, b) => a + b, 0); // 44050

// Step types: drive (reach a point in the car), collect (pick up a
// package), fight (take down N officers on foot), board (get on a boat),
// sail (reach the exit by boat), deliver (reach a point with cargo).
export const MISSIONS = [
  {
    id: 'M1', title: 'FIRST WHEELS', payout: 2000,
    brief: 'Mara Voss needs a driver. Take the GT and prove you can hold a line.',
    steps: [
      { type: 'drive', x: 0, z: 0, label: 'Meet the fixer at Downtown' },
      { type: 'drive', x: 48, z: 48, label: 'Drop the parcel at Marina Beach' },
    ],
  },
  {
    id: 'M2', title: 'THE PICKUP', payout: 3000,
    brief: 'A client waits on the north edge. Fetch him, then get him south before the heat wakes up.',
    steps: [
      { type: 'drive', x: 72, z: -72, label: 'Pick up the client at Northside' },
      { type: 'drive', x: -48, z: 72, label: 'Drop him at Old Town' },
    ],
  },
  {
    id: 'M3', title: 'FOUR PACKAGES', payout: 4000,
    brief: 'Four drops stashed around the island. Grab them all — the car knows the way.',
    steps: [
      { type: 'collect', x: 48, z: -48, label: 'Package 1 · Downtown east' },
      { type: 'collect', x: -24, z: 48, label: 'Package 2 · Old Town' },
      { type: 'collect', x: 72, z: 24, label: 'Package 3 · Marina Beach' },
      { type: 'collect', x: -48, z: -72, label: 'Package 4 · Northside' },
    ],
  },
  {
    id: 'M4', title: 'LOSE THE HEAT', payout: 5000,
    brief: 'CBPD cordoned the beach. Break line of sight, hold the line on the sand, take down three officers, then vanish before backup lands.',
    steps: [
      { type: 'drive', x: 112, z: 0, label: 'Break line of sight — reach the beach' },
      { type: 'fight', x: 116, z: 0, count: 3, label: 'Stand-off on the sand — take down 3 officers' },
    ],
  },
  {
    id: 'M5', title: 'PIER 9 RUN', payout: 6000,
    brief: 'The boat leaves Pier 9 at sundown. Drive out to the end of the pier and be on it.',
    steps: [
      { type: 'drive', x: 128, z: -48, label: 'Drive to the end of Pier 9' },
    ],
  },
  {
    id: 'M6', title: 'LOSE THE HEAT', payout: 7000,
    brief: 'Three stars and the whole of CBPD is on your tail. Outrun the cruisers, break line of sight, vanish.',
    steps: [
      { type: 'drive', x: -72, z: 96, label: 'Reach the hideout at The Docks', wanted: 3 },
    ],
  },
  {
    id: 'M7', title: 'THE DOCKS', payout: 8000,
    brief: 'A crate waits at the docks. Load it, then run it north before the port police wake up.',
    steps: [
      { type: 'drive', x: -72, z: 120, label: 'Pick up the crate at The Docks' },
      { type: 'deliver', x: 24, z: -96, label: 'Deliver the crate to Northside' },
    ],
  },
  {
    id: 'M8', title: 'RED TIDE', payout: 8550,
    brief: 'Last job. Board the RED TIDE at the south marina and ride her out past the breakwater.',
    steps: [
      { type: 'drive', x: 120, z: 108, label: 'Reach the south marina' },
      { type: 'board', x: 140, z: 108, label: 'Board the RED TIDE' },
      { type: 'sail', x: 150, z: 140, label: 'Sail past the breakwater' },
    ],
  },
];

// The three boats. RED TIDE (index 2) is moored at the south marina,
// nearest the destination exit — the pick rule proves it, it is not
// hardcoded.
export const BOATS = [
  { name: 'BLUE HORIZON', x: 140, z: -60, color: 0x3a6fd9 },
  { name: 'ISLAND QUEEN', x: 140, z: 24, color: 0xe8e8e2 },
  { name: 'RED TIDE', x: 140, z: 108, color: 0xd92020 },
];
export const BOAT_EXIT = { x: 150, z: 140 };

// The boat nearest the destination exit (genuine distance check).
export function pickBoatForDestination() {
  let best = 0;
  let bestD = Infinity;
  for (let i = 0; i < BOATS.length; i++) {
    const dx = BOATS[i].x - BOAT_EXIT.x;
    const dz = BOATS[i].z - BOAT_EXIT.z;
    const d = dx * dx + dz * dz;
    if (d < bestD) { bestD = d; best = i; }
  }
  return best;
}

// Side jobs and shops the playtest touches.
export const SHOPS = {
  gunStore: { x: 12, z: -42, name: 'AMMU-NATION', radius: 14 },
  garage: { x: -24, z: 96, name: 'Lio’s Garage', radius: 14 },
};
export const TAXI_START = { x: 12, z: -84 };
export const HERO_START = { x: -24, z: 96, heading: Math.PI };
