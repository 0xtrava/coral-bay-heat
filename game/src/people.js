// Coral Bay Heat (rebuild v19) — people and traffic.
// Pedestrians stroll the sidewalks in bright shirts, traffic cruises the
// avenues, and police cruisers hunt the hero when the heat is on.
// All motion is deterministic from the seeded rng so captures are stable.

import * as THREE from 'three';
import { makeRng, pick, between, whole } from './rng.js';
import { AVENUES, STREETS, ROAD_HALF } from './city.js';
import { lambert } from './materials.js';
import { buildTrafficCar, buildPoliceCar } from './cars.js';

const SHIRTS = [0xe85d75, 0x4d8fd1, 0xffd24d, 0x7ac74f, 0xc98ad9, 0xff8a3c, 0x5ec8b8, 0xf2f2ee];
const SKINS = [0xf0c8a0, 0xe8b88a, 0xd9a06f, 0x8a5a3b];

export function buildPedestrian(rng) {
  const g = new THREE.Group();
  const skin = pick(rng, SKINS);
  const shirt = pick(rng, SHIRTS);
  const legs = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.62, 0.2), lambert(0x2a2d34));
  legs.position.y = 0.31;
  g.add(legs);
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.62, 0.28), lambert(shirt));
  torso.position.y = 0.93;
  g.add(torso);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.32, 0.32), lambert(skin));
  head.position.y = 1.42;
  g.add(head);
  const hair = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.12, 0.34), lambert(pick(rng, [0x20222e, 0x3a2418, 0x7a3b1e, 0x101014])));
  hair.position.y = 1.6;
  g.add(hair);
  for (const sx of [-0.3, 0.3]) {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.55, 0.12), lambert(shirt));
    arm.position.set(sx, 0.95, 0);
    g.add(arm);
  }
  g.userData.phase = rng() * Math.PI * 2;
  return g;
}

// A walker follows one sidewalk line, turns around at the ends.
export function makeWalkers(scene, rng, count = 26) {
  const walkers = [];
  const lanes = [];
  for (const x of AVENUES) {
    lanes.push({ axis: 'z', fixed: x + ROAD_HALF + 1.3, from: -108, to: 108 });
    lanes.push({ axis: 'z', fixed: x - ROAD_HALF - 1.3, from: -108, to: 108 });
  }
  for (const z of STREETS) {
    lanes.push({ axis: 'x', fixed: z + ROAD_HALF + 1.3, from: -108, to: 108 });
    lanes.push({ axis: 'x', fixed: z - ROAD_HALF - 1.3, from: -108, to: 108 });
  }
  // a few beach strollers on the boardwalk
  for (let i = 0; i < 5; i++) {
    lanes.push({ axis: 'z', fixed: 104, from: -100, to: 100 });
  }
  for (let i = 0; i < count; i++) {
    const lane = pick(rng, lanes);
    const mesh = buildPedestrian(rng);
    const t = between(rng, lane.from, lane.to);
    const dir = rng() < 0.5 ? 1 : -1;
    if (lane.axis === 'z') mesh.position.set(lane.fixed, 0, t);
    else mesh.position.set(t, 0, lane.fixed);
    mesh.userData.lane = lane;
    mesh.userData.dir = dir;
    mesh.userData.speed = between(rng, 0.8, 1.6);
    mesh.userData.t = t;
    scene.add(mesh);
    walkers.push(mesh);
  }
  return walkers;
}

export function updateWalkers(walkers, dt, time) {
  for (const w of walkers) {
    const lane = w.userData.lane;
    w.userData.t += w.userData.dir * w.userData.speed * dt;
    if (w.userData.t > lane.to - 2) { w.userData.dir = -1; }
    if (w.userData.t < lane.from + 2) { w.userData.dir = 1; }
    if (lane.axis === 'z') {
      w.position.z = w.userData.t;
      w.rotation.y = w.userData.dir > 0 ? 0 : Math.PI;
    } else {
      w.position.x = w.userData.t;
      w.rotation.y = w.userData.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
    }
    // a gentle stroll bob
    w.position.y = Math.abs(Math.sin(time * 6 + w.userData.phase)) * 0.05;
  }
}

const TRAFFIC_COLORS = [0xd94f3d, 0x4d8fd1, 0xf2f2ee, 0x7ac74f, 0xc9a0c8, 0x3a3f4a, 0xffd24d];

// Traffic cars loop one avenue or street, wrapping at the city edge.
export function makeTraffic(scene, rng, count = 10) {
  const cars = [];
  const routes = [];
  for (const x of AVENUES) routes.push({ axis: 'z', fixed: x, from: -114, to: 114 });
  for (const z of STREETS) routes.push({ axis: 'x', fixed: z, from: -114, to: 114 });
  for (let i = 0; i < count; i++) {
    const route = pick(rng, routes);
    const mesh = buildTrafficCar(pick(rng, TRAFFIC_COLORS));
    const t = between(rng, route.from, route.to);
    const dir = rng() < 0.5 ? 1 : -1;
    const laneOff = dir > 0 ? 2.2 : -2.2;
    if (route.axis === 'z') {
      mesh.position.set(route.fixed + laneOff, 0, t);
      mesh.rotation.y = dir > 0 ? 0 : Math.PI;
    } else {
      mesh.position.set(t, 0, route.fixed + laneOff);
      mesh.rotation.y = dir > 0 ? Math.PI / 2 : -Math.PI / 2;
    }
    mesh.userData.route = route;
    mesh.userData.dir = dir;
    mesh.userData.speed = between(rng, 8, 14);
    mesh.userData.t = t;
    scene.add(mesh);
    cars.push(mesh);
  }
  return cars;
}

export function updateTraffic(cars, dt) {
  for (const c of cars) {
    const route = c.userData.route;
    c.userData.t += c.userData.dir * c.userData.speed * dt;
    if (c.userData.t > route.to) c.userData.t = route.from;
    if (c.userData.t < route.from) c.userData.t = route.to;
    if (route.axis === 'z') c.position.z = c.userData.t;
    else c.position.x = c.userData.t;
    const spin = c.userData.speed * dt / 0.42;
    for (const w of c.userData.wheels) w.rotation.x += spin;
  }
}

// Police cruisers: named units that close in on the hero and ram gently.
export const UNIT_NAMES = ['IBIS-43', 'TARPON-10', 'HERON-19', 'EGRET-07', 'HELI-2'];

export function makePolice(scene, rng) {
  const units = [];
  for (let i = 0; i < 4; i++) {
    const mesh = buildPoliceCar();
    mesh.visible = false;
    scene.add(mesh);
    units.push({
      mesh, name: UNIT_NAMES[i], active: false,
      x: 0, z: 0, heading: 0, speed: 0,
    });
  }
  return units;
}

// Steer one unit toward the hero along the road grid; returns its distance.
export function updatePoliceUnit(unit, heroPos, dt, topSpeed) {
  const dx = heroPos.x - unit.x;
  const dz = heroPos.z - unit.z;
  const dist = Math.hypot(dx, dz);
  const want = Math.atan2(dx, dz);
  let diff = want - unit.heading;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  unit.heading += Math.max(-2.2 * dt, Math.min(2.2 * dt, diff));
  const target = dist > 26 ? topSpeed : Math.max(6, topSpeed * (dist / 26));
  unit.speed += (target - unit.speed) * Math.min(1, dt * 1.5);
  unit.x += Math.sin(unit.heading) * unit.speed * dt;
  unit.z += Math.cos(unit.heading) * unit.speed * dt;
  unit.mesh.position.set(unit.x, 0, unit.z);
  unit.mesh.rotation.y = unit.heading;
  const spin = unit.speed * dt / 0.42;
  for (const w of unit.mesh.userData.wheels) w.rotation.x += spin;
  return dist;
}
