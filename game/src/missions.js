// The story: eight jobs across one dusk in Coral Bay, told by Mara Voss
// over the radio. Every mission is a list of legs — drive here, wait,
// collect, shoot — and the money adds up to $44,050 at the final job.
// Waypoints all sit on road-grid intersections so the autopilot can
// route along roads instead of cutting through blocks.
export const MISSION_PAY = [2000, 3500, 4000, 6000, 5500, 7000, 8050, 8000];
export const TOTAL_PAY = MISSION_PAY.reduce((a, b) => a + b, 0); // 44,050

// One leg of a mission. `kind`: 'drive' | 'wait' | 'collect' | 'shoot' |
// 'enterCar' | 'victory'. `at` is an {x, z} waypoint for drive legs.
export const MISSIONS = [
  {
    id: 1,
    title: 'FIRST WHEELS',
    brief: 'Mara Voss: "The Coral GT is yours, kid. Take her uptown and back — gentle, like she owes you money."',
    start: { x: 0, z: -80, heading: 0 },
    legs: [
      { kind: 'drive', at: { x: 0, z: 45 }, text: 'Drive north to the corner of 5th & Coral' },
      { kind: 'drive', at: { x: 45, z: 45 }, text: 'Swing east to the marina road junction' },
    ],
  },
  {
    id: 2,
    title: 'THE PICKUP',
    brief: 'Mara Voss: "A friend of mine left a parcel on the west side. Go get it, and don\'t keep him waiting."',
    start: { x: 45, z: 45, heading: Math.PI },
    legs: [
      { kind: 'drive', at: { x: -45, z: 0 }, text: 'Drive to the west-side drop point' },
      { kind: 'wait', seconds: 3, text: 'Wait for the handoff' },
      { kind: 'drive', at: { x: 90, z: -45 }, text: 'Deliver the parcel to the east junction' },
    ],
  },
  {
    id: 3,
    title: 'FOUR PACKAGES',
    brief: 'Mara Voss: "Four packages, four corners of the east side. Grab them all — the client pays per parcel."',
    start: { x: 90, z: -45, heading: Math.PI / 2 },
    legs: [
      { kind: 'collect', spots: [
        { x: 90, z: 0 }, { x: 45, z: -45 }, { x: 90, z: -90 }, { x: 45, z: -90 },
      ], text: 'Collect the four packages' },
    ],
  },
  {
    id: 4,
    title: 'STAND-OFF ON THE SAND',
    brief: 'Mara Voss: "CBPD cordoned the beach. They want the car — you\'re going to give them a show instead."',
    start: { x: 90, z: -45, heading: 0 },
    legs: [
      { kind: 'drive', at: { x: 90, z: 0 }, text: 'Drive down to the beach road' },
      { kind: 'shoot', at: { x: 120, z: 20 }, text: 'Hold the beach — take down 3 officers' },
      { kind: 'enterCar', text: 'Get back in the car' },
      { kind: 'drive', at: { x: 0, z: 90 }, text: 'Break away south to the boulevard' },
    ],
  },
  {
    id: 5,
    title: 'THE LONG WAY HOME',
    brief: 'Mara Voss: "They\'ve got the bridges watched. Take the long way round — north-west, then all the way across."',
    start: { x: 0, z: 90, heading: Math.PI },
    legs: [
      { kind: 'drive', at: { x: -90, z: -90 }, text: 'Cut across to the north-west corner' },
      { kind: 'drive', at: { x: 90, z: 90 }, text: 'Sweep down to the south-east corner' },
      { kind: 'drive', at: { x: 0, z: -90 }, text: 'Finish at the north boulevard' },
    ],
  },
  {
    id: 6,
    title: 'PIER 9 RUN',
    brief: 'Mara Voss: "The boat leaves Pier 9 at sundown. The cargo has to be on it — and so do you, briefly."',
    start: { x: 0, z: -90, heading: -Math.PI / 2 },
    legs: [
      { kind: 'drive', at: { x: 135, z: -45 }, text: 'Drive out to Pier 9' },
      { kind: 'drive', at: { x: 45, z: 0 }, text: 'Loop back to the midtown crossroads' },
    ],
  },
  {
    id: 7,
    title: 'DOCKYARD HEAT',
    brief: 'Mara Voss: "The docks are crawling. Sit tight till the patrol passes, then run the gap."',
    start: { x: 45, z: 0, heading: Math.PI },
    legs: [
      { kind: 'drive', at: { x: 0, z: -135 }, text: 'Drive to the dockyard gate' },
      { kind: 'wait', seconds: 3, text: 'Hold still — let the patrol pass' },
      { kind: 'drive', at: { x: 90, z: 45 }, text: 'Run the gap to the east junction' },
    ],
  },
  {
    id: 8,
    title: 'CORAL BAY HEAT',
    brief: 'Mara Voss: "One last lap of the island, kid. Every cruiser in Coral Bay is out there — make it count."',
    start: { x: 90, z: 45, heading: 0 },
    legs: [
      { kind: 'drive', at: { x: -90, z: 45 }, text: 'West along the south road' },
      { kind: 'drive', at: { x: 45, z: -90 }, text: 'North-east to the top of the island' },
      { kind: 'drive', at: { x: 0, z: 0 }, text: 'Bring her home to the plaza' },
      { kind: 'victory', text: 'VICTORY' },
    ],
  },
];

// The CBPD response roster shown in the HUD when the heat is on.
export const CBPD_UNITS = ['IBIS-43', 'TARPON-10', 'HERON-19', 'EGRET-07', 'HELI-2'];

// Radio stations, in the order the dial cycles through.
export const RADIO_STATIONS = ['CORAL FM 98.1', 'PALM WAVE 104.7', 'DUSK DRIVE 87.9', 'HARBOUR JAZZ 91.3'];
