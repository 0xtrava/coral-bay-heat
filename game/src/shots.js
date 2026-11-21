// Coral Bay Heat — camera presets for the four dossier shots.
// Cover: hero car large centre-frame, 3/4 rear, heli centre-top, police car
// close ahead, crosswalk + palms + buildings in frame, sun ahead.
// Pier: diagonal down the pier, boats both sides, sky in the top third.
// Beach: from the sand looking at the boulevard, hero on the road.
// Docks: gantry crane, containers, sun disc + heli in frame.
export const SHOTS = {
  cover: {
    cam: [10.5, 4.0, 12.0],
    look: [0, 0.7, -2],
    hero: [0.6, 0, 2],
    heroRot: 0.5,
    heli: [0.5, 13.5, -38],
    wanted: 3,
    fov: 55,
  },
  pier: {
    cam: [14, 3.4, -86],
    look: [60, 1.0, -97],
    hero: [22, 0, -95],
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
    cam: [10, 5.0, 110],
    look: [-34, 9, 144],
    hero: [-8, 0, 118],
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
