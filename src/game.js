/**
 * game.js — Core game logic & state
 *
 * FIX #6 — Discard animations rewritten:
 *   • cross   → overlay X + grayscale; card stays in place (NOT flipped)
 *   • delete  → card collapses out of the grid entirely (slot disappears)
 *   • flip    → default flip (unchanged)
 *
 * FIX #7 — lockFlipped() now calls playLock() so user gets audio feedback.
 *
 * History tracks "eliminated" state generically: a card may be eliminated
 * via flip OR cross OR delete. Undo restores them all.
 */

import { cards }        from './data/cards.js';
import { loadSettings } from './settings.js';
import { playFlip, playLock } from './audio.js';
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
let currentImages    = [];
let selectedIdx      = null;
let gameCards        = [];   // DOM card-wrap elements (play grid)
let history          = [];
let historyIdx       = -1;
let isAnswerRevealed = false;

// ─────────────────────────────────────────────
// IMAGE POOL
// ─────────────────────────────────────────────
export function buildImages(category, amount) {
  const all = cards[category] || [];
  if (amount === 'mini')   return all.slice(0, 12);
  if (amount === 'normal') return all.slice(0, 24);
  return [...all].sort(() => Math.random() - 0.5);
}

// ─────────────────────────────────────────────
// SETUP
// ─────────────────────────────────────────────
export function setupGame(layout, amount, category) {
  currentLayout   = layout || 'classic';
  currentAmount   = amount;
  currentCategory = category;
  currentImages   = buildImages(category, amount);
  selectedIdx     = null;
  isAnswerRevealed = false;
}

export function getCategory()      { return currentCategory; }
export function getLayout()        { return currentLayout; }
export function getCurrentImages() { return currentImages; }
export function getSelectedIdx()   { return selectedIdx; }

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
  history    = [];
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
// CARD CLICK — FIX #6
// ─────────────────────────────────────────────
function handleCardClick(wrap) {
  if (wrap.classList.contains('locked')) return;
  // Once "deleted", a card cannot be re-clicked (it's gone from the layout).
  if (wrap.classList.contains('deleted')) return;

  const animType = loadSettings().discardAnim;

  // Toggle behavior: if already eliminated, clicking restores.
  const isEliminated = wrap.classList.contains('flipped')
                    || wrap.classList.contains('crossed');

  if (isEliminated) {
    wrap.classList.remove('flipped', 'crossed');
    saveHistory();
    playFlip();
    return;
  }

  if (animType === 'cross') {
    // Add X overlay + grayscale. No flip.
    wrap.classList.add('crossed');
    saveHistory();
    playFlip();
    return;
  }

  if (animType === 'delete') {
    // Animate out, then collapse the slot so it disappears from the grid.
    wrap.classList.add('deleting');
    // After the shrink animation, mark as fully deleted (display:none).
    const onEnd = () => {
      wrap.classList.remove('deleting');
      wrap.classList.add('deleted');
      saveHistory();
    };
    wrap.addEventListener('animationend', onEnd, { once: true });
    // Safety fallback
    setTimeout(onEnd, 500);
    playFlip();
    return;
  }

  // Default: flip
  wrap.classList.add('flipped');
  saveHistory();
  playFlip();
}

// ─────────────────────────────────────────────
// HISTORY
// ─────────────────────────────────────────────
function snapshot() {
  return gameCards.map(c => ({
    flipped: c.classList.contains('flipped'),
    crossed: c.classList.contains('crossed'),
    deleted: c.classList.contains('deleted'),
    locked:  c.classList.contains('locked'),
  }));
}

function applySnapshot(snap) {
  gameCards.forEach((c, i) => {
    const s = snap[i];
    c.classList.toggle('flipped', s.flipped);
    c.classList.toggle('crossed', s.crossed);
    c.classList.toggle('deleted', s.deleted);
    c.classList.toggle('locked',  s.locked);
  });
}

function saveHistory() {
  history = history.slice(0, historyIdx + 1);
  history.push(snapshot());
  historyIdx = history.length - 1;
  setUndoBtnState(historyIdx > 0);
}

// ─────────────────────────────────────────────
// CONTROLS
// ─────────────────────────────────────────────

/** Undo: restore every UNLOCKED card to face-up (un-eliminated). */
export function undoFlips() {
  gameCards.forEach(c => {
    if (!c.classList.contains('locked')) {
      c.classList.remove('flipped', 'crossed', 'deleted');
    }
  });
  saveHistory();
  playFlip();
}

/** Lock: lock all currently flipped/crossed/deleted cards. */
export function lockFlipped() {
  gameCards.forEach(c => {
    const eliminated = c.classList.contains('flipped')
                    || c.classList.contains('crossed')
                    || c.classList.contains('deleted');
    if (eliminated) c.classList.add('locked');
  });
  saveHistory();
  playLock();   // FIX #7
}

/** Reset: clear everything including locks. */
export function resetBoard() {
  gameCards.forEach(c => {
    c.classList.remove('flipped', 'crossed', 'deleted', 'locked');
  });
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
// FULL RESET (home button)
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
