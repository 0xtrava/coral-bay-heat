// Coral Bay Heat — camera presets for the four dossier shots.
//
// Each shot is a fixed camera plus the staged positions of the hero car
// and the helicopter, so the four screenshots are reproducible frames:
//   cover    — high rear chase cam: the hero car big in the right
//              foreground mid-drive, police cruisers ahead of him on the
//              coastal road, the helicopter hovering over the chase.
//   shootout — over-shoulder, just off the aim axis: the player (red
//              jacket, back to the lens) firing at a police officer
//              across the sand, a fallen officer on the ground.
//   map      — neutral city view behind the map/stats pause screen.
//   title    — low dusk view up the boulevard at the skyline and sunset,
//              behind the title screen overlay.
export const SHOTS = {
  cover: {
    // High (y 4.2) and centred on the road, behind the hero and looking
    // straight north down the road. The hero sits 9 m from the lens in
    // the right lane, so he is the big foreground car — unmistakably
    // ours — and every cruiser is ahead of him: two leading the chase
    // (cop1 left lane, cop3 his own lane, rears to the lens) and two
    // oncoming as a roadblock (cop2, cop4, fronts to the lens).
    cam: [0, 4.2, 23],
    look: [0, 1.0, -16],
    // Hero mid-drive in the northbound lane, a touch of steering angle
    // so he reads as driving, not parked.
    hero: [3.5, 0, 14],
    heroRot: 0.05,
    // The heli hovers over the chase just north of the hero, nose
    // turned back at him, so heli, beam and car read as one spotlight.
    // The bob/drift in animate() follows this preset.
    heli: [2, 11, 0],
    wanted: 3,
    fov: 55,
  },
  shootout: {
    // Over-shoulder, 3.5 m off the aim axis: dead behind the player the
    // pistol foreshortens to a stub and hides behind his head; off-axis
    // the slide reads in profile beside his head, muzzle flash at its
    // tip, tracer running on to the officer. Player ~210 px tall, back
    // to the lens, right of centre; officer centre-frame; fallen
    // officer on the ground left of centre, clear of the tracer line.
    // The hero car stays parked on the road as background.
    cam: [24.2, 2.6, 15.1],
    look: [18, 1.1, 0.5],
    hero: [0.6, 0, 2],
    heroRot: 0.06,
    heli: [-6, 24, -60],
    // Wanted 3, matching M4 LOSE THE HEAT — three stars on a police
    // stand-off, not two.
    wanted: 3,
    fov: 55,
  },
  map: {
    // Backdrop behind the full map/stats pause screen overlay — the
    // overlay covers the screen, so this is a neutral city view.
    cam: [0, 8, 40],
    look: [0, 1, -20],
    hero: [1.6, 0, 2],
    heroRot: 3.05,
    heli: [0.5, 13.5, -38],
    wanted: 1,
    fov: 55,
  },
  title: {
    // Low dusk view up the boulevard at the skyline + sunset, behind
    // the title screen overlay. The hero car sits big and glossy in
    // the lower centre, framed by palms and the sunset; the overlay's
    // scrim darkens the bottom so the title and menu read over it.
    cam: [10, 1.7, 26],
    look: [-6, 7, -80],
    hero: [2.5, 0, 14],
    heroRot: 3.05,
    heli: [0.5, 13.5, -38],
    wanted: 0,
    fov: 55,
  },
};

// The shot to stage, from ?shot= in the URL; anything unknown falls
// back to the cover.
export function shotName() {
  const q = new URLSearchParams(location.search);
  const s = q.get('shot') || 'cover';
  return SHOTS[s] ? s : 'cover';
}
