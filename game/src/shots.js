// Coral Bay Heat — camera presets for the four dossier shots.
// Cover: hero car large centre-frame, 3/4 rear, heli centre-top, police car
// close ahead, crosswalk + palms + buildings in frame, sun ahead.
// Pier: diagonal down the pier, boats both sides, sky in the top third.
// Beach: from the sand looking at the boulevard, hero on the road.
// Docks: gantry crane, containers, sun disc + heli in frame.
export const SHOTS = {
  cover: {
    cam: [8.4, 2.7, 10.2],
    look: [0.8, 0.9, -8],
    hero: [0.6, 0, 2],
    heroRot: 0.28,
    heli: [0.5, 13.5, -38],
    wanted: 3,
    fov: 55,
  },
  pier: {
    cam: [16, 4.2, -80],
    look: [62, 1.2, -100],
    hero: [20, 0, -95],
    heroRot: Math.PI / 2,
    heli: [30, 26, -120],
    wanted: 1,
    fov: 55,
  },
  beach: {
    cam: [34, 3.4, 26],
    look: [2, 1.0, -6],
    hero: [0.6, 0, 2],
    heroRot: 0.06,
    heli: [-6, 24, -60],
    wanted: 2,
    fov: 55,
  },
  docks: {
    cam: [-6, 4.0, 108],
    look: [-32, 8, 146],
    hero: [-20, 0, 122],
    heroRot: -0.4,
    heli: [-30, 30, 132],
    wanted: 5,
    fov: 55,
  },
};

export function shotName() {
  const q = new URLSearchParams(location.search);
  const s = q.get('shot') || 'cover';
  return SHOTS[s] ? s : 'cover';
}
