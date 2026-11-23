// Save games for Coral Bay Heat. Three slots in localStorage, one JSON
// blob each. Nothing here may throw: private-mode browsers and quota
// errors degrade to "no save", never to a crash. The game never auto-
// loads on boot — loadGame() only runs when the player asks for it, so
// the save-reload side test can set cash, save, reload the page and get
// the same cash back.
const PREFIX = 'coral-bay-heat-save-';

export function slotKey(slot) {
  return PREFIX + (slot || 1);
}

// The shape of a save. Everything the game needs to resume: mission,
// money, upgrades, position, weapons and the clock.
export function makeSave(state) {
  return {
    version: 1,
    savedAt: new Date().toISOString(),
    mission: state.mission,
    cash: Math.round(state.cash),
    health: Math.round(state.health),
    maxHealth: state.maxHealth,
    topSpeed: state.topSpeed,
    pos: { x: state.pos.x, z: state.pos.z },
    heading: state.heading,
    weapons: state.weapons.map((w) => ({ name: w.name, ammo: w.ammo === Infinity ? -1 : w.ammo })),
    weaponIndex: state.weaponIndex,
    packages: state.packages,
    taxiEarned: Math.round(state.taxiEarned),
    clockMinutes: state.clockMinutes,
  };
}

export function saveGame(slot, state) {
  try {
    window.localStorage.setItem(slotKey(slot), JSON.stringify(makeSave(state)));
    return true;
  } catch (e) {
    return false;
  }
}

// Returns the parsed save object, or null when the slot is empty or the
// JSON is corrupt (a corrupt save is treated as empty, not fatal).
export function loadSave(slot) {
  try {
    const raw = window.localStorage.getItem(slotKey(slot));
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || data.version !== 1) return null;
    return data;
  } catch (e) {
    return null;
  }
}

export function hasSave(slot) {
  return loadSave(slot) !== null;
}

export function clearSave(slot) {
  try {
    window.localStorage.removeItem(slotKey(slot));
    return true;
  } catch (e) {
    return false;
  }
}
