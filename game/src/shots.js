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
    // Fix round 3 (v12): hero at x 1.6, not 0.6 — at 0.6 the hero's nose
    // clipped the police door's "E" (the door read "POLIC"). A metre east
    // puts the whole POLICE plate clear of the nose with the hero still
    // centre-frame. (Free mode is unaffected: game.js hardcodes its own
    // start pos; the beach preset keeps its own hero.)
    hero: [1.6, 0, 2],
    heroRot: 3.05,
    heli: [0.5, 13.5, -38],
    wanted: 3,
    fov: 55,
  },
  pier: {
    // Fix round 3 (v12): CLOSE rear-3/4 proof of the rebuilt rear. The
    // old shot was a straight rear from 13 m and still read slab-like.
    // Camera on the sand just south of the pier root, 9.9 m out, low
    // (y 2.4) and 30 deg off the rear axis, so the lens sees the rear
    // LEFT flank: roofline 1.26, sloped rear window, taillight bar,
    // bumper, diffuser, 0.40 wheels — plus the pier deck receding east,
    // the white boat and the sea in the background. Hero rot -0.26 puts
    // all four wheels on the planks (tail tip 0.7 m inside the deck edge)
    // and the hero 1.5 m west of the first attempt, so the fixed angler
    // at (36, -98.4) no longer sits dead-centre behind the roof.
    // Foreground right is the pier's south edge: lamp post, crates,
    // bench, rope coil (world.js) — never the empty sand of the old shot.
    // (First attempt at 6.7 m was too close: the (27.6, -90.8) lamp post
    // filled the right edge and the deck filled half the frame.)
    cam: [20, 2.4, -87.5],
    look: [27, 1.0, -94.5],
    hero: [27, 0.41, -94.5],
    heroRot: -0.26,
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
