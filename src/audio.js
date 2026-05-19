import { getSetting } from './settings.js';

let flipAudio = null;
let bgmAudio = null;
let bgmUnlocked = false;

function getFlip() {
  if (!flipAudio) {
    flipAudio = new Audio('assets/sounds/flip.mp3');
    flipAudio.preload = 'auto';
  }
  return flipAudio;
}

function getBgm() {
  if (!bgmAudio) {
    bgmAudio = new Audio('assets/music/bgm.mp3');
    bgmAudio.loop = true;
    bgmAudio.volume = 0.4;
    bgmAudio.preload = 'auto';
  }
  return bgmAudio;
}

export function playFlip() {
  if (!getSetting('sound')) return;
  try {
    const a = getFlip();
    a.currentTime = 0;
    a.play().catch(() => {});
  } catch {}
}

export function startMusic() {
  if (!getSetting('music')) return;
  try {
    const bgm = getBgm();
    if (bgm.paused) bgm.play().catch(() => {});
  } catch {}
}

export function stopMusic() {
  try {
    if (bgmAudio && !bgmAudio.paused) {
      bgmAudio.pause();
      bgmAudio.currentTime = 0;
    }
  } catch {}
}

export function syncMusic() {
  if (getSetting('music')) {
    startMusic();
  } else {
    stopMusic();
  }
}

// iOS requires user gesture — call this on first tap anywhere
export function unlockAudio() {
  if (bgmUnlocked) return;
  bgmUnlocked = true;
  // Unlock by playing & immediately pausing
  const flip = getFlip();
  flip.play().then(() => { flip.pause(); flip.currentTime = 0; }).catch(() => {});
  const bgm = getBgm();
  bgm.play().then(() => {
    if (!getSetting('music')) { bgm.pause(); bgm.currentTime = 0; }
  }).catch(() => {});
}
