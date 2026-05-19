/**
 * ui.js — DOM rendering & page transitions
 * Handles: page switching, card creation, grid rendering,
 *          answer boxes, start animation, i18n text updates.
 */

import { cards }     from './data/cards.js';
import { loadSettings } from './settings.js';

// ── Language accessor (kept in sync by main.js) ──
let _lang = 'en';
export function setLang(l) { _lang = l; }
export function getLang()  { return _lang; }

const strings = {};   // populated by registerStrings() from main.js
export function registerStrings(en, th, jp) {
  strings.en = en;
  strings.th = th;
  strings.jp = jp;
}

export function t(key) {
  return strings[_lang]?.[key] ?? strings.en?.[key] ?? key;
}

// ─────────────────────────────────────────────
// PAGE MANAGEMENT
// ─────────────────────────────────────────────
const pageIds = ['page-menu', 'page-setup', 'page-game'];

export function showPage(name) {
  pageIds.forEach(id => {
    document.getElementById(id)?.classList.remove('active');
  });
  document.getElementById(`page-${name}`)?.classList.add('active');
}

// ─────────────────────────────────────────────
// SECTION MANAGEMENT (within game page)
// ─────────────────────────────────────────────
export function showSection(name) {
  // name: 'select' | 'play' | 'none'
  document.getElementById('section-select')?.classList.toggle('show', name === 'select');
  document.getElementById('section-play')?.classList.toggle('show',   name === 'play');
  document.getElementById('home-btn')?.classList.toggle('show',        name === 'play');
}

// ─────────────────────────────────────────────
// i18n TEXT UPDATES
// ─────────────────────────────────────────────
export function applyLang() {
  _lang = loadSettings().language;

  // Static data-i18n elements
  document.querySelectorAll('[data-i18n]').forEach(el => {
    el.textContent = t(el.dataset.i18n);
  });

  // Card labels already in DOM
  document.querySelectorAll('.card-label span[data-card-id]').forEach(span => {
    const id  = span.dataset.cardId;
    const cat = span.dataset.category;
    const card = cards[cat]?.find(c => c.id === id);
    if (card) span.textContent = card[_lang];
  });

  // Confirm popup strings
  const msg = document.getElementById('confirm-msg');
  const yes = document.getElementById('confirm-yes');
  const no  = document.getElementById('confirm-no');
  if (msg) msg.textContent = t('confirmMsg');
  if (yes) yes.textContent = t('yes');
  if (no)  no.textContent  = t('no');
}

// ─────────────────────────────────────────────
// SETTINGS PANEL UI
// ─────────────────────────────────────────────
export function refreshSettingsUI() {
  const s = loadSettings();

  const ts = document.getElementById('toggle-sound');
  const tm = document.getElementById('toggle-music');
  if (ts) ts.checked = s.sound;
  if (tm) tm.checked = s.music;

  document.querySelectorAll('#lang-seg .seg-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.val === s.language);
  });
  document.querySelectorAll('#anim-seg .seg-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.val === s.discardAnim);
  });
}

// ─────────────────────────────────────────────
// CARD ELEMENT FACTORY
// ─────────────────────────────────────────────
const CARD_BACK = 'assets/cards/back.webp';

/**
 * Creates a full card DOM element (image + label, 4:5 ratio).
 * @param {object} cardData  - { id, en, th, jp }
 * @param {string} category  - 'people' | 'places' | etc.
 * @param {function} onClick - (wrapEl, cardData) => void
 * @returns {HTMLElement}
 */
export function makeCard(cardData, category, onClick) {
  const wrap = document.createElement('div');
  wrap.className = 'card-wrap';
  wrap.dataset.id = cardData.id;

  // ── Flip container (top 80% — square image)
  const flipCont = document.createElement('div');
  flipCont.className = 'card-flip-container';

  const inner = document.createElement('div');
  inner.className = 'card-inner';

  // Front face (character image)
  const front = document.createElement('div');
  front.className = 'card-face';
  const fImg = document.createElement('img');
  fImg.src     = `assets/cards/${category}/${cardData.id}.webp`;
  fImg.loading = 'lazy';
  fImg.alt     = cardData[_lang];
  front.appendChild(fImg);

  // Back face (card back image)
  const back = document.createElement('div');
  back.className = 'card-back-face';
  const bImg = document.createElement('img');
  bImg.src = CARD_BACK;
  bImg.alt = '';
  back.appendChild(bImg);

  inner.appendChild(front);
  inner.appendChild(back);
  flipCont.appendChild(inner);

  // ── Label (bottom 20%)
  const label = document.createElement('div');
  label.className = 'card-label';
  const span = document.createElement('span');
  span.textContent          = cardData[_lang];
  span.dataset.cardId       = cardData.id;
  span.dataset.category     = category;
  label.appendChild(span);

  wrap.appendChild(flipCont);
  wrap.appendChild(label);

  wrap.addEventListener('click', () => onClick(wrap, cardData));
  return wrap;
}

// ─────────────────────────────────────────────
// SELECT GRID
// ─────────────────────────────────────────────
/**
 * Renders character-selection grid.
 * @param {object[]} images    - subset of cards[category]
 * @param {string}   category
 * @param {string}   layout    - 'classic' | 'clear' | 'zoom'
 * @param {function} onSelect  - (index, cardData) => void
 */
export function renderSelectGrid(images, category, layout, onSelect) {
  const grid = document.getElementById('select-grid');
  grid.innerHTML = '';
  grid.className = `card-grid grid-${layout}`;

  images.forEach((cardData, i) => {
    const wrap = makeCard(cardData, category, (w, cd) => {
      grid.querySelectorAll('.card-wrap').forEach(c => c.classList.remove('selected-card'));
      w.classList.add('selected-card');
      onSelect(i, cd);
    });
    grid.appendChild(wrap);
  });
}

// ─────────────────────────────────────────────
// PLAY GRID
// ─────────────────────────────────────────────
/**
 * Renders the game board.
 * @param {object[]} images    - subset of cards[category]
 * @param {string}   category
 * @param {string}   layout
 * @param {function} onCardClick - (wrapEl, cardData) => void
 * @returns {HTMLElement[]} array of card wrap elements
 */
export function renderPlayGrid(images, category, layout, onCardClick) {
  const grid = document.getElementById('play-grid');
  grid.innerHTML = '';
  grid.className = `card-grid grid-${layout}`;

  const gameCards = [];
  images.forEach((cardData) => {
    const wrap = makeCard(cardData, category, (w, cd) => {
      if (!w.classList.contains('locked')) onCardClick(w, cd);
    });
    grid.appendChild(wrap);
    gameCards.push(wrap);
  });
  return gameCards;
}

// ─────────────────────────────────────────────
// ANSWER PREVIEW (selection screen)
// ─────────────────────────────────────────────
export function setAnswerPreview(cardData, category) {
  const box = document.getElementById('answer-preview');
  if (!box) return;
  box.innerHTML = `
    <img src="assets/cards/${category}/${cardData.id}.webp"
         style="width:100%;height:80%;object-fit:cover;display:block;"
         alt="${cardData[_lang]}" />
    <div class="answer-box-label">${cardData[_lang]}</div>
  `;
}

export function resetAnswerPreview() {
  const box = document.getElementById('answer-preview');
  if (box) box.innerHTML = '<div class="answer-box-empty">?</div>';
}

// ─────────────────────────────────────────────
// GAME ANSWER BOX (secret card)
// ─────────────────────────────────────────────
export function setGameAnswerBox(cardData, category) {
  const img = document.getElementById('game-answer-img');
  const lbl = document.getElementById('game-answer-label');
  const cov = document.getElementById('game-answer-cover');
  if (!img) return;

  img.src          = `assets/cards/${category}/${cardData.id}.webp`;
  lbl.textContent  = cardData[_lang];
  img.style.display = 'none';
  lbl.style.display = 'none';
  cov.style.display = 'flex';
}

export function toggleGameAnswerReveal(revealed) {
  const img = document.getElementById('game-answer-img');
  const lbl = document.getElementById('game-answer-label');
  const cov = document.getElementById('game-answer-cover');
  if (!img) return;
  img.style.display = revealed ? 'block' : 'none';
  lbl.style.display = revealed ? 'flex'  : 'none';
  cov.style.display = revealed ? 'none'  : 'flex';
}

// ─────────────────────────────────────────────
// START ANIMATION OVERLAY
// ─────────────────────────────────────────────
export function playStartAnimation(onComplete) {
  const overlay = document.getElementById('start-overlay');
  const text    = document.getElementById('start-anim-text');
  if (!overlay || !text) { onComplete?.(); return; }

  text.textContent = t('start');
  // Force reflow to restart animation
  text.style.animation = 'none';
  text.offsetHeight;
  text.style.animation = '';

  overlay.classList.add('show');
  setTimeout(() => {
    overlay.classList.remove('show');
    onComplete?.();
  }, 2000);
}

// ─────────────────────────────────────────────
// CONFIRM POPUP
// ─────────────────────────────────────────────
export function openConfirm()  {
  document.getElementById('confirm-overlay')?.classList.add('show');
}
export function closeConfirm() {
  document.getElementById('confirm-overlay')?.classList.remove('show');
}

// ─────────────────────────────────────────────
// SAVE/RANDOM BUTTON VISIBILITY
// ─────────────────────────────────────────────
export function showSaveBtn(visible) {
  const btn = document.getElementById('save-btn');
  if (btn) btn.style.display = visible ? 'inline-block' : 'none';
}

// ─────────────────────────────────────────────
// NAV BUTTON STATE
// ─────────────────────────────────────────────
export function setUndoBtnState(enabled) {
  const btn = document.getElementById('undo-btn');
  if (btn) btn.disabled = !enabled;
}
