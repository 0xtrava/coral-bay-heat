// The autopilot: drives the hero car along the road grid to a waypoint,
// recovers when it gets stuck, and (on foot) walks the player to a
// shooting position and fires at officers. It is the same driver the
// playtest uses, so it has to be boringly reliable — no clever shortcuts,
// just Manhattan routing through intersections.
//
// Heading convention: heading 0 = +z, forward = (sin h, 0, cos h).
// Roads sit at x/z = -90, -45, 0, 45, 90 (see city.js ROAD_X / ROAD_Z).
import { ROAD_X, ROAD_Z } from './city.js';

const ROADS = ROAD_X;

// Nearest road line to a coordinate.
function nearestRoad(v) {
  let best = ROADS[0];
  let bd = Math.abs(v - best);
  for (const r of ROADS) {
    const d = Math.abs(v - r);
    if (d < bd) { bd = d; best = r; }
  }
  return best;
}

// Plan a Manhattan route from (sx, sz) to (tx, tz): a list of waypoints.
// The car first slides onto the nearest road line, then follows roads to
// the target's road line, then along it to the target. Consecutive
// waypoints share either x or z, so each leg is a straight drive.
export function planRoute(sx, sz, tx, tz) {
  const pts = [];
  const rx = nearestRoad(sx);
  const rz = nearestRoad(sz);
  const txr = nearestRoad(tx);
  const tzr = nearestRoad(tz);
  // Slide to the nearest intersection.
  if (Math.abs(sx - rx) > 0.5 || Math.abs(sz - rz) > 0.5) {
    pts.push({ x: rx, z: rz });
  }
  // If the target is off-grid, the final approach runs along its road
  // line; otherwise the target IS on a road line.
  const midX = Math.abs(tx - txr) < 0.5 ? tx : txr;
  const midZ = Math.abs(tz - tzr) < 0.5 ? tz : tzr;
  // Go along x first (to the target's x line), then along z.
  if (Math.abs(rx - midX) > 0.5) pts.push({ x: midX, z: rz });
  if (Math.abs(rz - midZ) > 0.5) pts.push({ x: midX, z: midZ });
  // Final leg to the exact target (short, may be off-road).
  if (Math.abs(midX - tx) > 0.5 || Math.abs(midZ - tz) > 0.5) pts.push({ x: tx, z: tz });
  // Drop waypoints that are (nearly) the current position.
  return pts.filter((p, i) => {
    const prev = i === 0 ? { x: sx, z: sz } : pts[i - 1];
    return Math.hypot(p.x - prev.x, p.z - prev.z) > 1.5;
  });
}

// Normalise an angle to [-PI, PI].
function wrapAngle(a) {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

// The driver. The game owns the car state; the driver only reads the
// current pose and returns an input each frame: { throttle, brake,
// steer } in [-1, 1]. `car` is { x, z, heading, speed }.
export class Driver {
  constructor() {
    this.route = [];
    this.target = null;
    this.stuckTimer = 0;
    this.lastX = 0;
    this.lastZ = 0;
    this.reverseTimer = 0;
    this.enabled = false;
  }

  // Aim at a new destination; (re)plans from the current position.
  driveTo(x, z, from) {
    this.route = planRoute(from.x, from.z, x, z);
    this.target = this.route.shift() || { x, z };
    this.stuckTimer = 0;
    this.lastX = from.x;
    this.lastZ = from.z;
    this.reverseTimer = 0;
  }

  // One frame of driving. Returns { throttle, brake, steer }.
  // `car` = { x, z, heading, speed }; `dt` in seconds.
  update(car, dt) {
    if (!this.target) return { throttle: 0, brake: 0, steer: 0 };
    const dx = this.target.x - car.x;
    const dz = this.target.z - car.z;
    const dist = Math.hypot(dx, dz);
    if (dist < 3.5) {
      const next = this.route.shift();
      if (!next) {
        this.target = null;
        return { throttle: 0, brake: 1, steer: 0 };
      }
      this.target = next;
      return this.update(car, dt);
    }
    // Stuck detection: the car barely MOVED (not what its speedo says —
    // a car grinding against a wall still reads 36). 3 s of no progress
    // means back up and try again.
    const moved = Math.hypot(car.x - this.lastX, car.z - this.lastZ);
    this.lastX = car.x;
    this.lastZ = car.z;
    if (moved < 0.12 && this.reverseTimer <= 0) {
      this.stuckTimer += dt;
    } else {
      this.stuckTimer = 0;
    }
    if (this.stuckTimer > 3) {
      // Back up for a second, then try again — usually clears a kerb or
      // a traffic car.
      this.reverseTimer = 1.0;
      this.stuckTimer = 0;
    }
    if (this.reverseTimer > 0) {
      this.reverseTimer -= dt;
      return { throttle: 0, brake: 0, steer: 0.5, reverse: true };
    }
    // Steer toward the target. Positive angle = target to the left.
    const want = Math.atan2(dx, dz);
    const diff = wrapAngle(want - car.heading);
    const steer = Math.max(-1, Math.min(1, diff * 2.2));
    // Slow down early for the waypoint: arrive at a crawl, not at 36,
    // or the 90-degree turn at the next intersection overshoots into
    // the block beyond the road.
    const sharp = Math.abs(diff) > 0.7;
    const slow = dist < 40;
    let brake = 0;
    if (slow && Math.abs(car.speed) > 10) brake = 0.8;
    if (sharp && Math.abs(car.speed) > 12) brake = Math.max(brake, 0.6);
    // Brake only works when the throttle is off: the physics applies
    // throttle first, so a braking driver must lift off entirely.
    // (Before this, throttle stayed >= 0.35 while braking, so the brake
    // never engaged and every 90-degree turn was taken at 36 u/s with a
    // 21 m swing — straight into the block. M7 step 2 wedged that way.)
    const throttle = brake > 0 ? 0 : (sharp || slow ? 0.35 : 1);
    return { throttle, brake, steer };
  }

  get done() {
    return !this.target && this.route.length === 0;
  }
}

// On-foot shooting: walk the player toward `spot`, then aim at the
// nearest living officer and fire. Returns { move, aimAt, fire } where
// move is a unit {x, z} step and aimAt is an officer (or null).
export function shootStep(playerPos, officers, spot, dt) {
  const dx = spot.x - playerPos.x;
  const dz = spot.z - playerPos.z;
  const dist = Math.hypot(dx, dz);
  if (dist > 2.5) {
    return { move: { x: dx / dist, z: dz / dist }, aimAt: null, fire: false };
  }
  // In position: pick the nearest officer that is still standing.
  let best = null;
  let bd = Infinity;
  for (const o of officers) {
    if (o.dead) continue;
    const d = Math.hypot(o.x - playerPos.x, o.z - playerPos.z);
    if (d < bd) { bd = d; best = o; }
  }
  return { move: { x: 0, z: 0 }, aimAt: best, fire: !!best };
}
