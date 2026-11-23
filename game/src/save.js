// Save / load for Coral Bay Heat. One localStorage slot, plain JSON.
// Nothing here touches the network; a missing or corrupt slot simply
// means "no save yet".
const KEY = 'coral-bay-heat-save-v6';

export function writeSave(data) {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

export function readSave() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || typeof data !== 'object') return null;
    return data;
  } catch {
    return null;
  }
}

export function clearSave() {
  try { localStorage.removeItem(KEY); } catch { /* storage unavailable */ }
}

export function hasSave() {
  return readSave() !== null;
}
