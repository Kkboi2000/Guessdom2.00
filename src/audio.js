/**
 * audio.js — Sound effects + background music
 *
 * FIX #7: adds playLock() so the lock button plays a sound.
 *         Falls back gracefully to the flip sound if lock.mp3 is missing.
 */

import { getSetting } from './settings.js';

let flipAudio   = null;
let lockAudio   = null;
let revealAudio = null;
let bgmAudio    = null;
let bgmUnlocked = false;

// ── Lazy factories ──────────────────────────────────────────
function getFlip() {
  if (!flipAudio) {
    flipAudio = new Audio('assets/sounds/flip.mp3');
    flipAudio.preload = 'auto';
  }
  return flipAudio;
}

function getLock() {
  if (!lockAudio) {
    lockAudio = new Audio('assets/sounds/lock.mp3');
    lockAudio.preload = 'auto';
    // If lock.mp3 doesn't exist, fall back to flip on first error
    lockAudio.addEventListener('error', () => { lockAudio = null; }, { once: true });
  }
  return lockAudio;
}

function getReveal() {
  if (!revealAudio) {
    revealAudio = new Audio('assets/sounds/reveal.mp3');
    revealAudio.preload = 'auto';
    revealAudio.addEventListener('error', () => { revealAudio = null; }, { once: true });
  }
  return revealAudio;
}

function getBgm() {
  if (!bgmAudio) {
    bgmAudio = new Audio('assets/music/bgm.mp3');
    bgmAudio.loop    = true;
    bgmAudio.volume  = 0.4;
    bgmAudio.preload = 'auto';
  }
  return bgmAudio;
}

// ── Public API ──────────────────────────────────────────────
export function playFlip() {
  if (!getSetting('sound')) return;
  try {
    const a = getFlip();
    a.currentTime = 0;
    a.play().catch(() => {});
  } catch {}
}

/** FIX #7 — plays the lock SFX */
export function playLock() {
  if (!getSetting('sound')) return;
  try {
    const a = getLock();
    if (!a) { playFlip(); return; }      // fallback if lock.mp3 missing
    a.currentTime = 0;
    a.play().catch(() => {});
  } catch { playFlip(); }
}

export function playReveal() {
  if (!getSetting('sound')) return;
  try {
    const a = getReveal();
    if (!a) return;
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
  if (getSetting('music')) startMusic();
  else stopMusic();
}

// iOS audio unlock — call on first user gesture
export function unlockAudio() {
  if (bgmUnlocked) return;
  bgmUnlocked = true;

  const flip = getFlip();
  flip.play().then(() => { flip.pause(); flip.currentTime = 0; }).catch(() => {});

  const bgm = getBgm();
  bgm.play().then(() => {
    if (!getSetting('music')) { bgm.pause(); bgm.currentTime = 0; }
  }).catch(() => {});
}
