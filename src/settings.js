const KEY = 'guessdom_settings';

const DEFAULTS = {
  sound: false,
  music: false,
  language: 'en',           // 'en' | 'th' | 'jp'
  discardAnim: 'flip',      // 'cross' | 'flip' | 'delete'
};

export function loadSettings() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : { ...DEFAULTS };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveSettings(settings) {
  try {
    localStorage.setItem(KEY, JSON.stringify(settings));
  } catch {}
}

export function getSetting(key) {
  return loadSettings()[key];
}

export function setSetting(key, value) {
  const s = loadSettings();
  s[key] = value;
  saveSettings(s);
  return s;
}
