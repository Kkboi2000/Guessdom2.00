/**
 * main.js — Entry point for Guessdom 2
 * Wires: settings, i18n, audio, game logic, UI, page nav
 */

import en from './i18n/en.js';
import th from './i18n/th.js';
import jp from './i18n/jp.js';

import {
  loadSettings,
  saveSettings,
  applyDescSize,
} from './settings.js';

import {
  registerStrings,
  setLang,
  applyLang,
  showPage,
  showSection,
  refreshSettingsUI,
  playStartAnimation,
  showSaveBtn,
  t,
} from './ui.js';

import {
  unlockAudio,
  playFlip,
  startMusic,
  stopMusic,
  syncMusic,
} from './audio.js';

import {
  setupGame,
  initSelectScreen,
  initPlayScreen,
  selectRandom,
  undoFlips,
  lockFlipped,
  resetBoard,
  toggleAnswer,
  fullReset,
} from './game.js';

// ─────────────────────────────────────────────
// BOOT
// ─────────────────────────────────────────────
registerStrings(en, th, jp);

const settings = loadSettings();
setLang(settings.language);
applyLang();
applyDescSize(settings.descSize);
refreshSettingsUI();
syncMusic();

// ─────────────────────────────────────────────
// SETUP STATE
// ─────────────────────────────────────────────
let chosenSize     = 'classic';
let chosenAmount   = 'normal';
let chosenCategory = 'people';

// ─────────────────────────────────────────────
// USER GESTURE GATE (iOS audio unlock)
// ─────────────────────────────────────────────
document.addEventListener('pointerdown', unlockAudio, { once: true, passive: true });

// ─────────────────────────────────────────────
// SETTINGS PANEL
// ─────────────────────────────────────────────
const settingsBtn     = document.getElementById('settings-btn');
const settingsOverlay = document.getElementById('settings-overlay');
const settingsClose   = document.getElementById('settings-close');

settingsBtn.addEventListener('click', () => {
  settingsOverlay.classList.add('open');
  refreshSettingsUI();
});
settingsClose.addEventListener('click', () => settingsOverlay.classList.remove('open'));
settingsOverlay.addEventListener('click', e => {
  if (e.target === settingsOverlay) settingsOverlay.classList.remove('open');
});

// Sound toggle
document.getElementById('toggle-sound').addEventListener('change', e => {
  settings.sound = e.target.checked;
  saveSettings(settings);
});

// Music toggle
document.getElementById('toggle-music').addEventListener('change', e => {
  settings.music = e.target.checked;
  saveSettings(settings);
  syncMusic();
});

// Language seg
document.querySelectorAll('#lang-seg .seg-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('#lang-seg .seg-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    settings.language = btn.dataset.val;
    saveSettings(settings);
    setLang(settings.language);
    applyLang();
  });
});

// Discard anim seg
document.querySelectorAll('#anim-seg .seg-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('#anim-seg .seg-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    settings.discardAnim = btn.dataset.val;
    saveSettings(settings);
  });
});

// Desc size seg
document.querySelectorAll('#desc-seg .seg-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('#desc-seg .seg-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    settings.descSize = btn.dataset.val;
    saveSettings(settings);
    applyDescSize(settings.descSize);
  });
});
// Set initial active state for desc-seg
document.querySelectorAll('#desc-seg .seg-btn').forEach(b => {
  b.classList.toggle('active', b.dataset.val === settings.descSize);
});

// ─────────────────────────────────────────────
// PAGE 1: MENU
// ─────────────────────────────────────────────
document.getElementById('start-btn').addEventListener('click', () => {
  showPage('setup');
  window.__swapBgs?.();
});

// ─────────────────────────────────────────────
// PAGE 2: BOARD SETUP — seg buttons
// ─────────────────────────────────────────────
function wireSetupSeg(segId, onChange) {
  document.querySelectorAll(`#${segId} .setup-seg-btn`).forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll(`#${segId} .setup-seg-btn`)
        .forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      onChange(btn.dataset.val);
    });
  });
}

wireSetupSeg('size-seg',   val => { chosenSize     = val; });
wireSetupSeg('amount-seg', val => { chosenAmount   = val; });
wireSetupSeg('cat-seg',    val => { chosenCategory = val; });

document.getElementById('continue-btn').addEventListener('click', () => {
  setupGame(chosenSize, chosenAmount, chosenCategory);
  showPage('game');
  showSection('select');
  setGameUI(false);       // home/tips hidden during selection
  initSelectScreen();
  window.__swapBgs?.();
});

// ─────────────────────────────────────────────
// PAGE 3: GAME — selection screen
// ─────────────────────────────────────────────
document.getElementById('random-btn').addEventListener('click', () => {
  selectRandom();
});

document.getElementById('save-btn').addEventListener('click', () => {
  playStartAnimation(() => {
    showSection('play');
    setGameUI(true);      // show home + tips
    initPlayScreen();
    startMusic();
    window.__swapBgs?.();
  });
});

// ─────────────────────────────────────────────
// PAGE 3: GAME — play controls
// ─────────────────────────────────────────────
document.getElementById('undo-btn').addEventListener('click', () => {
  undoFlips();
});

document.getElementById('refresh-btn').addEventListener('click', () => {
  openConfirm('refresh');
});

document.getElementById('lock-btn').addEventListener('click', () => {
  lockFlipped();
});

// Answer box reveal
document.getElementById('game-answer-box').addEventListener('click', () => {
  toggleAnswer();
});

// ─────────────────────────────────────────────
// HOME BUTTON
// ─────────────────────────────────────────────
document.getElementById('home-btn').addEventListener('click', () => {
  openConfirm('home');
});

// ─────────────────────────────────────────────
// TIPS BUTTON
// ─────────────────────────────────────────────
const tipsBtn   = document.getElementById('tips-btn');
const tipsPanel = document.getElementById('tips-panel');

tipsBtn.addEventListener('click', e => {
  e.stopPropagation();
  tipsPanel.classList.toggle('open');
});
document.addEventListener('click', e => {
  if (!tipsPanel.contains(e.target) && e.target !== tipsBtn) {
    tipsPanel.classList.remove('open');
  }
});

// ─────────────────────────────────────────────
// CONFIRM POPUP
// ─────────────────────────────────────────────
let _confirmAction = null;  // 'refresh' | 'home'

function openConfirm(action) {
  _confirmAction = action;
  document.getElementById('confirm-overlay').classList.add('show');
}

document.getElementById('confirm-yes').addEventListener('click', () => {
  closeConfirm();
  if (_confirmAction === 'home') {
    goHome();
  } else if (_confirmAction === 'refresh') {
    resetBoard();
  }
  _confirmAction = null;
});

document.getElementById('confirm-no').addEventListener('click', () => {
  closeConfirm();
  _confirmAction = null;
});

function goHome() {
  fullReset();
  stopMusic();
  setGameUI(false);
  showSection('none');
  showPage('menu');
  window.__swapBgs?.();
}

// ─────────────────────────────────────────────
// GAME UI VISIBILITY (home btn + tips)
// ─────────────────────────────────────────────
function setGameUI(active) {
  document.body.classList.toggle('in-game', active);
}
