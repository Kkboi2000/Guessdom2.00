/**
 * game.js — Core game logic & state
 * Handles: card state, history/undo, lock, refresh,
 *          image selection, discard animations.
 * Pure logic — no direct DOM manipulation.
 * Communicates with ui.js and audio.js via imported functions.
 */

import { cards }        from './data/cards.js';
import { loadSettings } from './settings.js';
import { playFlip }     from './audio.js';
import {
  renderSelectGrid,
  renderPlayGrid,
  setAnswerPreview,
  resetAnswerPreview,
  setGameAnswerBox,
  toggleGameAnswerReveal,
  showSaveBtn,
  setUndoBtnState,
  getLang,
} from './ui.js';

// ─────────────────────────────────────────────
// STATE
// ─────────────────────────────────────────────
let currentLayout    = 'classic';
let currentAmount    = 'normal';
let currentCategory  = 'people';
let currentImages    = [];   // array of card data objects for current game
let selectedIdx      = null; // index into currentImages for the secret card
let gameCards        = [];   // array of card DOM elements (play grid)
let history          = [];   // array of state snapshots
let historyIdx       = -1;
let isAnswerRevealed = false;

// ─────────────────────────────────────────────
// IMAGE POOL
// ─────────────────────────────────────────────
export function buildImages(category, amount) {
  const all = cards[category] || [];
  if (amount === 'mini')   return all.slice(0, 12);
  if (amount === 'normal') return all.slice(0, 24);
  // 'big' — shuffle full 36
  return [...all].sort(() => Math.random() - 0.5);
}

// ─────────────────────────────────────────────
// SETUP — called when user hits Continue
// ─────────────────────────────────────────────
export function setupGame(layout, amount, category) {
  currentLayout   = layout;
  currentAmount   = amount;
  currentCategory = category;
  currentImages   = buildImages(category, amount);
  selectedIdx     = null;
  isAnswerRevealed = false;
}

export function getCategory()    { return currentCategory; }
export function getLayout()      { return currentLayout; }
export function getCurrentImages() { return currentImages; }
export function getSelectedIdx() { return selectedIdx; }

// ─────────────────────────────────────────────
// SELECTION SCREEN
// ─────────────────────────────────────────────
export function initSelectScreen() {
  selectedIdx = null;
  resetAnswerPreview();
  showSaveBtn(false);

  renderSelectGrid(currentImages, currentCategory, currentLayout, (idx, cardData) => {
    selectedIdx = idx;
    setAnswerPreview(cardData, currentCategory);
    showSaveBtn(true);
  });
}

export function selectRandom() {
  const idx = Math.floor(Math.random() * currentImages.length);
  selectedIdx = idx;

  // Highlight the card in the grid
  const grid = document.getElementById('select-grid');
  grid?.querySelectorAll('.card-wrap').forEach((c, i) => {
    c.classList.toggle('selected-card', i === idx);
  });

  setAnswerPreview(currentImages[idx], currentCategory);
  showSaveBtn(true);
  return idx;
}

// ─────────────────────────────────────────────
// PLAY SCREEN
// ─────────────────────────────────────────────
export function initPlayScreen() {
  history   = [];
  historyIdx = -1;
  isAnswerRevealed = false;

  gameCards = renderPlayGrid(
    currentImages,
    currentCategory,
    currentLayout,
    handleCardClick
  );

  if (selectedIdx !== null && currentImages[selectedIdx]) {
    setGameAnswerBox(currentImages[selectedIdx], currentCategory);
  }

  saveHistory();
  setUndoBtnState(false);
}

// ─────────────────────────────────────────────
// CARD CLICK (in-game)
// ─────────────────────────────────────────────
function handleCardClick(wrap) {
  const animType = loadSettings().discardAnim;

  if (animType === 'cross' || animType === 'delete') {
    const cls = animType === 'cross' ? 'anim-cross' : 'anim-delete';
    wrap.classList.add(cls);
    setTimeout(() => {
      wrap.classList.remove(cls);
      wrap.classList.toggle('flipped');
      saveHistory();
      playFlip();
    }, 380);
  } else {
    // 'flip' — default CSS transition
    wrap.classList.toggle('flipped');
    saveHistory();
    playFlip();
  }
}

// ─────────────────────────────────────────────
// HISTORY
// ─────────────────────────────────────────────
function saveHistory() {
  // Discard any redo states beyond current index
  history = history.slice(0, historyIdx + 1);
  history.push(
    gameCards.map(c => ({
      flipped: c.classList.contains('flipped'),
      locked:  c.classList.contains('locked'),
    }))
  );
  historyIdx = history.length - 1;
  setUndoBtnState(historyIdx > 0);
}

// ─────────────────────────────────────────────
// CONTROLS
// ─────────────────────────────────────────────

/** Undo: flip all unlocked cards face-up (back to unflipped) */
export function undoFlips() {
  gameCards.forEach(c => {
    if (!c.classList.contains('locked')) c.classList.remove('flipped');
  });
  saveHistory();
  playFlip();
}

/** Lock: lock all currently flipped cards */
export function lockFlipped() {
  gameCards.forEach(c => {
    if (c.classList.contains('flipped')) c.classList.add('locked');
  });
  saveHistory();
}

/** Reset: unflip and unlock all cards */
export function resetBoard() {
  gameCards.forEach(c => c.classList.remove('flipped', 'locked'));
  saveHistory();
  playFlip();
}

// ─────────────────────────────────────────────
// ANSWER REVEAL
// ─────────────────────────────────────────────
export function toggleAnswer() {
  isAnswerRevealed = !isAnswerRevealed;
  toggleGameAnswerReveal(isAnswerRevealed);
}

// ─────────────────────────────────────────────
// RESET ALL STATE (on home)
// ─────────────────────────────────────────────
export function fullReset() {
  selectedIdx      = null;
  gameCards        = [];
  history          = [];
  historyIdx       = -1;
  isAnswerRevealed = false;
  resetAnswerPreview();
  showSaveBtn(false);
}
