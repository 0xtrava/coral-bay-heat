// Coral Bay Heat — camera presets for the four dossier shots.
// Cover: hero car large centre-frame, 3/4 rear, heli centre-top, police car
// close ahead, crosswalk + palms + buildings in frame, sun ahead.
// Pier: diagonal down the pier, boats both sides, sky in the top third.
// Beach: from the sand looking at the boulevard, hero on the road.
// Docks: gantry crane, containers, sun disc + heli in frame.
export const SHOTS = {
  cover: {
    cam: [8.6, 3.4, 11.0],
    look: [2.0, 0.8, -6],
    hero: [0.6, 0, 2],
    heroRot: 0.5,
    heli: [0.5, 13.5, -38],
    wanted: 3,
    fov: 55,
  },
  pier: {
    cam: [12, 3.8, -88],
    look: [65, 1.0, -98],
    hero: [26, 0, -93],
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
    cam: [16, 6, 148],
    look: [-36, 9, 136],
    hero: [-14, 0, 136],
    heroRot: 0.6,
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
