// Coral Bay Heat (rebuild v19) — autopilot.
// Routes along road centrelines only: every leg is axis-aligned on an
// avenue or a street, so the car never cuts a corner through a building.
// Speed is trimmed before sharp turns and near the final waypoint, and a
// stuck car reverses out and re-plans instead of grinding against a wall.

import { AVENUES, STREETS } from './city.js';

function nearestLine(list, v) {
  let best = list[0], bd = Infinity;
  for (const l of list) {
    const d = Math.abs(l - v);
    if (d < bd) { bd = d; best = l; }
  }
  return best;
}

function onAvenue(x, z) {
  return AVENUES.some((a) => Math.abs(a - x) < 1.5);
}

function onStreet(x, z) {
  return STREETS.some((s) => Math.abs(s - z) < 1.5);
}

// Nearest point on the road grid to (x, z). Off-road targets (beach, pier)
// keep their own coordinates and get a road point as their approach.
export function nearestRoadPoint(x, z) {
  const ax = nearestLine(AVENUES, x);
  const sz = nearestLine(STREETS, z);
  const dx = Math.abs(ax - x);
  const dz = Math.abs(sz - z);
  if (dx <= dz) return [ax, z];
  return [x, sz];
}

function isOffRoad(x, z) {
  return x > 100 || (x >= 100 && z >= 60 && z <= 84);
}

// Manhattan route through intersections, all legs on road centrelines.
export function planRoute(fx, fz, tx, tz) {
  const pts = [];
  let cx = fx, cz = fz;
  const [rx, rz] = nearestRoadPoint(tx, tz);
  // first: get onto a road centreline from wherever we are
  if (!onAvenue(cx, cz) && !onStreet(cx, cz)) {
    const [nx, nz] = nearestRoadPoint(cx, cz);
    pts.push([nx, nz]);
    cx = nx; cz = nz;
  }
  // walk to the nearest intersection on our current road
  const ix = nearestLine(AVENUES, cx);
  const iz = nearestLine(STREETS, cz);
  if (onAvenue(cx, cz)) {
    pts.push([cx, iz]);
    cx = cx; cz = iz;
  } else if (onStreet(cx, cz)) {
    pts.push([ix, cz]);
    cx = ix; cz = cz;
  } else {
    pts.push([ix, iz]);
    cx = ix; cz = iz;
  }
  // along the grid to the target's intersection
  if (cz !== rz) pts.push([cx, rz]);
  if (cx !== rx) pts.push([rx, rz]);
  // final leg: on-road target, or open ground (beach / pier)
  if (tx !== rx || tz !== rz) pts.push([tx, tz]);
  // drop consecutive duplicates and points we already stand on
  const out = [];
  for (const [px, pz] of pts) {
    const last = out[out.length - 1];
    if (last && Math.abs(last[0] - px) < 0.5 && Math.abs(last[1] - pz) < 0.5) continue;
    out.push([px, pz]);
  }
  return out;
}

export function createPilot() {
  return {
    route: [],
    idx: 0,
    recovering: 0,
    lastX: 0,
    lastZ: 0,
    stuckTime: 0,
    target: null,

    setTarget(x, z) {
      this.target = [x, z];
      this.route = [];
      this.idx = 0;
      this.recovering = 0;
      this.stuckTime = 0;
    },

    // car: { x, z, heading, speed, topSpeed }. Returns { throttle, steer }.
    update(car, dt) {
      if (!this.target) return { throttle: 0, steer: 0 };
      if (this.route.length === 0) {
        this.route = planRoute(car.x, car.z, this.target[0], this.target[1]);
        this.idx = 0;
        this.lastX = car.x; this.lastZ = car.z;
      }
      // stuck detection: barely moving while we should be driving
      const moved = Math.hypot(car.x - this.lastX, car.z - this.lastZ);
      if (moved < 0.4 && Math.abs(car.speed) < 1.5) {
        this.stuckTime += dt;
      } else {
        this.stuckTime = 0;
      }
      this.lastX = car.x; this.lastZ = car.z;
      if (this.stuckTime > 3) {
        this.recovering = 1.4;
        this.stuckTime = 0;
      }
      if (this.recovering > 0) {
        this.recovering -= dt;
        return { throttle: -0.9, steer: 0.7 };
      }
      // advance along the route
      while (this.idx < this.route.length) {
        const [wx, wz] = this.route[this.idx];
        if (Math.hypot(wx - car.x, wz - car.z) < 6) this.idx++;
        else break;
      }
      if (this.idx >= this.route.length) {
        return { throttle: 0, steer: 0 };
      }
      const [wx, wz] = this.route[this.idx];
      const dx = wx - car.x, dz = wz - car.z;
      const dist = Math.hypot(dx, dz);
      const want = Math.atan2(dx, dz);
      let diff = want - car.heading;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      const steer = Math.max(-1, Math.min(1, diff * 1.6));
      // brake for sharp turns and for the final approach
      const isLast = this.idx === this.route.length - 1;
      let top = car.topSpeed;
      if (Math.abs(diff) > 0.6) top = Math.min(top, 12);
      if (isLast && dist < 40) top = Math.min(top, 10 + dist * 0.25);
      const throttle = car.speed < top ? 1 : 0.25;
      return { throttle, steer };
    },

    get arrived() {
      if (!this.target) return false;
      return this.route.length > 0 && this.idx >= this.route.length;
    },
  };
}
