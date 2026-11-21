// Coral Bay Heat — camera presets for the four dossier shots.
// Cover: hero car large centre-frame, FRONT 3/4 (nose toward the camera,
// both nearside wheels visible, headlights lit), heli centre-top, police
// car close ahead-left, crosswalk + palms + buildings in frame, sun disc
// centred in the sky behind. Pier: low diagonal down the pier, hero big
// mid-frame, boats both sides, sky in the top third.
// Beach: from the sand looking at the boulevard, hero on the road.
// Docks: hero big in the foreground, gantry crane, containers, warehouses
// with windows, sun disc + heli in frame.
export const SHOTS = {
  cover: {
    cam: [9.5, 2.4, 12.5],
    look: [0.5, 0.9, -6],
    hero: [0.6, 0, 2],
    heroRot: 3.05,
    heli: [0.5, 13.5, -38],
    wanted: 3,
    fov: 55,
  },
  pier: {
    // low, close, down the pier: hero big mid-frame, FRONT 3/4 toward the
    // lens (nose toward the camera, both headlights visible), boats + sea
    // behind. Hero y = 0.41 = the plank deck top, so the wheels sit ON the
    // pier instead of sinking into it. Foreground is flat towels only —
    // nothing tall within 10 m of this lens (a tower/dinghy there hid the
    // whole hero in the first attempt).
    cam: [20, 2.4, -88],
    look: [32, 1.0, -94],
    hero: [28, 0.41, -93.5],
    heroRot: 2.2,
    heli: [40, 26, -120],
    wanted: 1,
    fov: 55,
  },
  beach: {
    cam: [30, 3.0, 18],
    look: [0, 1.0, -8],
    hero: [0.6, 0, 2],
    heroRot: 0.06,
    heli: [-6, 24, -60],
    wanted: 2,
    fov: 55,
  },
  docks: {
    // close and low: hero big in the foreground, FRONT 3/4 toward the
    // lens (the old rear 3/4 is what made the car read as a flat wedge),
    // gantry crane + container stacks behind, heli up LEFT so it never
    // sits on the WANTED text top-right, sun + warehouses in frame.
    // Camera low (y 2.0) and 10.6 m out, hero turned -1.9 so the lens sees
    // front + right flank, not a head-on hood.
    cam: [5, 2.0, 150],
    look: [-3, 1.0, 142],
    hero: [-2, 0, 143],
    heroRot: -1.9,
    heli: [-24, 11, 136],
    wanted: 5,
    fov: 55,
  },
};

export function shotName() {
  const q = new URLSearchParams(location.search);
  const s = q.get('shot') || 'cover';
  return SHOTS[s] ? s : 'cover';
}
