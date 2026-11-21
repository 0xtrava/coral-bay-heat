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
    cam: [11, 3.0, -84],
    look: [58, 1.0, -96.5],
    hero: [28, 0, -93.5],
    heroRot: -Math.PI / 2,
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
    cam: [10, 5.5, 150],
    look: [-28, 6, 138],
    hero: [-2, 0, 143],
    heroRot: 2.6,
    heli: [-24, 20, 132],
    wanted: 5,
    fov: 55,
  },
};

export function shotName() {
  const q = new URLSearchParams(location.search);
  const s = q.get('shot') || 'cover';
  return SHOTS[s] ? s : 'cover';
}
