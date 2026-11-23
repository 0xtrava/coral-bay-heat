// Coral Bay Heat (rebuild v19) — save / load.
// One localStorage slot holding cash, mission progress, upgrades and ammo.
// loadGame returns true only when a real save was there to restore.

const KEY = 'cbh-save-v19';

export function saveGame(state) {
  try {
    const data = {
      cash: state.cash,
      mission: state.mission,
      step: state.step,
      topSpeed: state.topSpeed,
      maxHealth: state.maxHealth,
      health: state.health,
      weapons: state.weapons.map((w) => ({ name: w.name, ammo: w.ammo })),
      radio: state.radio,
      packages: state.packages,
      savedAt: Date.now(),
    };
    localStorage.setItem(KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

export function loadSave() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (typeof data.cash !== 'number' || typeof data.mission !== 'number') return null;
    return data;
  } catch {
    return null;
  }
}

export function hasSave() {
  return loadSave() !== null;
}

export function clearSave() {
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
}
