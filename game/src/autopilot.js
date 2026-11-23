// Autopilot for Coral Bay Heat: routes on the road grid, steers the
// car to each waypoint, and gets itself unstuck. A car wedged against
// a building in an earlier build is the reason for the three-stage
// escape: reverse, replan, then nudge to the nearest road centre.
import { AVENUES, STREETS, nearestRoadPoint } from './city.js';

function nearestAvenue(x) {
  let best = AVENUES[0], bd = Infinity;
  for (const a of AVENUES) { const d = Math.abs(a - x); if (d < bd) { bd = d; best = a; } }
  return best;
}
function nearestStreet(z) {
  let best = STREETS[0], bd = Infinity;
  for (const s of STREETS) { const d = Math.abs(s - z); if (d < bd) { bd = d; best = s; } }
  return best;
}

// Manhattan route on the grid: snap to the nearest avenue, run along
// it, turn onto the nearest street, run to the target's street, then
// along it to the target. Every waypoint sits on a road centreline,
// so the route never cuts through a block.
export function routeOnGrid(fx, fz, tx, tz) {
  const pts = [];
  const ax = nearestAvenue(fx);
  const sz = nearestStreet(tz);
  const txAvenue = nearestAvenue(tx);
  // 1) get onto the nearest avenue
  pts.push({ x: ax, z: fz });
  // 2) run along that avenue to the target's street
  pts.push({ x: ax, z: sz });
  // 3) if the target is not on that avenue, run along the street to it
  if (Math.abs(txAvenue - ax) > 0.5) {
    pts.push({ x: txAvenue, z: sz });
    pts.push({ x: txAvenue, z: tz });
  }
  // 4) final approach to the target itself
  pts.push({ x: tx, z: tz });
  // drop waypoints that are basically where we already are
  const out = [];
  let px = fx, pz = fz;
  for (const p of pts) {
    if (Math.hypot(p.x - px, p.z - pz) > 2) out.push(p);
    px = p.x; pz = p.z;
  }
  if (out.length === 0) out.push({ x: tx, z: tz });
  return out;
}

export class Autopilot {
  constructor(getState) {
    // getState() returns { x, z, heading, speed } of the vehicle.
    this.getState = getState;
    this.enabled = false;
    this.waypoints = [];
    this.wpIndex = 0;
    this.stuckTimer = 0;
    this.reverseTimer = 0;
    this.failures = 0;
    this.lastMoveTime = 0;
    this.onNudge = null; // called with {x, z} when a nudge is needed
  }

  setTarget(tx, tz) {
    const s = this.getState();
    this.waypoints = routeOnGrid(s.x, s.z, tx, tz);
    this.wpIndex = 0;
    this.stuckTimer = 0;
    this.failures = 0;
  }

  // Returns { throttle, brake, steer } in [-1, 1]. throttle 1 = full
  // gas, brake 1 = full brake, steer -1..1 (left..right).
  update(dt, time) {
    if (!this.enabled || this.waypoints.length === 0) {
      return { throttle: 0, brake: 1, steer: 0 };
    }
    const s = this.getState();
    const wp = this.waypoints[this.wpIndex];
    const dx = wp.x - s.x, dz = wp.z - s.z;
    const dist = Math.hypot(dx, dz);
    if (dist < 3.5) {
      this.wpIndex++;
      this.stuckTimer = 0;
      if (this.wpIndex >= this.waypoints.length) {
        return { throttle: 0, brake: 1, steer: 0, arrived: true };
      }
      return this.update(dt, time);
    }
    // stuck detection: barely moving while far from the waypoint.
    // NOTE: displacement per step is speed*dt (<=0.5 even at top
    // speed), so the old per-step 0.4 threshold read any speed below
    // 24 as "stuck" and looped reverse/replan forever around the
    // nearest avenue. Compare speed instead: a car wedged on a
    // building reads ~0.2 (the collider damps speed x0.4 per step),
    // a driving car reads well above 2.
    if (Math.abs(s.speed) > 2) {
      this.lastMoveTime = time;
      this.stuckTimer = 0;
    }
    if (time - this.lastMoveTime > 2.5 && dist > 4) {
      this.stuckTimer += dt;
      if (this.stuckTimer > 1.2) {
        this.failures++;
        this.stuckTimer = 0;
        this.lastMoveTime = time;
        if (this.failures >= 3) {
          // third failure: nudge back onto the nearest road centre
          this.failures = 0;
          const np = nearestRoadPoint(s.x, s.z);
          if (this.onNudge) this.onNudge(np);
          this.setTarget(this.waypoints[this.waypoints.length - 1].x, this.waypoints[this.waypoints.length - 1].z);
          return { throttle: 0, brake: 1, steer: 0 };
        }
        // first failures: reverse out, then replan
        this.reverseTimer = 1.4;
        const cur = this.waypoints[this.waypoints.length - 1];
        this.setTarget(cur.x, cur.z);
      }
    }
    if (this.reverseTimer > 0) {
      this.reverseTimer -= dt;
      return { throttle: -0.7, brake: 0, steer: 0.4 };
    }
    // steer toward the waypoint
    const targetAngle = Math.atan2(dx, dz);
    let diff = targetAngle - s.heading;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    const steer = Math.max(-1, Math.min(1, diff * 1.6));
    // brake for sharp turns or when close
    const sharp = Math.abs(diff) > 0.9;
    const brake = sharp || dist < 8 ? 0.6 : 0;
    const throttle = sharp ? 0.25 : (dist < 8 ? 0.45 : 1);
    return { throttle, brake, steer };
  }
}
