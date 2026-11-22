// Coral Bay Heat — camera presets for the four dossier shots.
// Fix round 5 (v15, consolidated brief): the set now matches Karimbu's
// four compositions, with our own city and characters.
// Cover: HIGH REAR-3/4 CHASE CAM — above and behind the hero car,
// looking forward down the coastal road. The hero is MID-DRIVE
// (facing north in the northbound lane), a police cruiser closes in
// behind him in the left lane, a second cruiser comes on ahead, the
// heli hovers overhead, palms + beach right, buildings left, full HUD.
// Shootout: third-person OVER-SHOULDER — the camera sits behind and
// above the PLAYER (red jacket, back to the lens) as he fires at a
// police officer across the sand, with a fallen officer on the ground
// between them. Map: a backdrop view behind the full map/stats pause
// screen overlay. Title: a low dusk view up the boulevard at the
// skyline + sunset, behind the title screen overlay.
export const SHOTS = {
  cover: {
    // Chase cam: HIGH (y 4.0) and CENTRED on the road (x 0, z 24),
    // behind both cars and looking straight north down the road.
    // The camera sits central so BOTH cars fit: the chasing cruiser
    // (cop1, left lane, 9 m ahead) in the left foreground, the hero
    // (right lane, 16 m ahead) right of centre, the oncoming cruiser
    // (cop2) far ahead, the road vanishing north, the heli overhead.
    // A right-side camera (x 8.5) pushed cop1 out of the left edge
    // of the frame — the chase read as a lone car, not a pursuit.
    cam: [0, 4.0, 24],
    look: [0, 1.0, -16],
    // hero MID-DRIVE, facing north in the northbound lane (x 3.5),
    // a touch of angle (rot 0.05) so he reads as steering, not parked.
    // At z 6 (not 8) he keeps a 2.4 m gap to the chasing cruiser's
    // nose (cop1 at z 13) — bumper to bumper at 8.
    hero: [3.5, 0, 6],
    heroRot: 0.05,
    heli: [-3, 14, -24],
    wanted: 3,
    fov: 55,
  },
  shootout: {
    // Over-shoulder: the camera sits behind and above the PLAYER
    // (player at (24, 8), camera at (24.2, 15.1)), looking
    // north-west at the officer (17, 0) — the player is ~210 px tall,
    // back to the lens, right of centre; the officer ~60 px,
    // centre-frame; the fallen officer (15, 5) on the ground between
    // them, clear of the tracer (which runs at chest height, ~60 px
    // above the fallen on screen). The hero car stays parked on the
    // road at (0.6, 2) as background, and the beach cop (4.5, -14)
    // glows behind the fight.
    // FIX ROUND 5 (v15.2): the camera sits 3.5 m OFF the aim axis
    // (south-west of the old dead-behind spot), NOT dead behind the
    // player — dead behind, the pistol points straight at the lens,
    // foreshortens to a 16 px stub, and hides behind the player's
    // own head and torso. Off-axis the slide reads 37 px in profile
    // beside his head, clear of the skull and the red jacket, with
    // the muzzle flash at its tip and the tracer running on to the
    // officer. Same look target and fov, so the rest of the framing
    // (officer centre, fallen left, cop behind) is unchanged.
    cam: [24.2, 2.6, 15.1],
    look: [15, 1.0, -3],
    hero: [0.6, 0, 2],
    heroRot: 0.06,
    heli: [-6, 24, -60],
    // Fix round 5 (v15.2): wanted 3, matching M4 LOSE THE HEAT (the
    // mission frame the shootout's HUD panel borrows) — three stars
    // on a police stand-off, not two.
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
    // the title screen overlay. Buildings left, beach/palms right,
    // the sun low north-west, the hero car on the road in the
    // foreground — the overlay's scrim darkens the bottom so the
    // title and menu read over it.
    cam: [12, 2.2, 30],
    look: [-8, 8, -80],
    hero: [1.6, 0, 2],
    heroRot: 3.05,
    heli: [0.5, 13.5, -38],
    wanted: 0,
    fov: 55,
  },
};

export function shotName() {
  const q = new URLSearchParams(location.search);
  const s = q.get('shot') || 'cover';
  return SHOTS[s] ? s : 'cover';
}
