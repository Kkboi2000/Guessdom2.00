/**
 * ui.js — DOM rendering & page transitions
 *
 * FIX #5 — showSection('select' | 'play') now reveals home button on BOTH.
 * FIX #4/#8 — card images that 404 are hidden cleanly and a styled
 *             placeholder shows instead of the browser's broken-image icon.
 * FIX #1   — text uses --gd-text-size CSS variable (10/14/16pt).
 *
 * GRID-COLUMNS REFACTOR — renderSelectGrid / renderPlayGrid now accept
 * an `amount` argument and stamp it onto the grid as data-amount, so
 * CSS can drive columns via [data-amount="..."] + orientation media
 * queries instead of brittle :has(:nth-child) child-counting.
 */

import { cards }     from './data/cards.js';
import { loadSettings } from './settings.js';

// ── Language ──────────────────────────────────────────
let _lang = 'en';
export function setLang(l) { _lang = l; }
export function getLang()  { return _lang; }

const strings = {};
export function registerStrings(en, th, jp) {
  strings.en = en;
  strings.th = th;
  strings.jp = jp;
}

export function t(key) {
  return strings[_lang]?.[key] ?? strings.en?.[key] ?? key;
}

// ── Pages ─────────────────────────────────────────────
const pageIds = ['page-menu', 'page-setup', 'page-game'];

export function showPage(name) {
  pageIds.forEach(id => document.getElementById(id)?.classList.remove('active'));
  document.getElementById(`page-${name}`)?.classList.add('active');
}

// ── Sections within the game page ─────────────────────
export function showSection(name) {
  // FIX #5: home button visible during both 'select' and 'play'
  document.getElementById('section-select')?.classList.toggle('show', name === 'select');
  document.getElementById('section-play')?.classList.toggle('show',   name === 'play');
  const showHome = name === 'select' || name === 'play';
  document.getElementById('home-btn')?.classList.toggle('show', showHome);
}

// ── i18n re-apply ─────────────────────────────────────
export function applyLang() {
  _lang = loadSettings().language;

  document.querySelectorAll('[data-i18n]').forEach(el => {
    el.textContent = t(el.dataset.i18n);
  });

  document.querySelectorAll('.card-label span[data-card-id]').forEach(span => {
    const id  = span.dataset.cardId;
    const cat = span.dataset.category;
    const card = cards[cat]?.find(c => c.id === id);
    if (card) span.textContent = card[_lang];
  });

  const msg = document.getElementById('confirm-msg');
  const yes = document.getElementById('confirm-yes');
  const no  = document.getElementById('confirm-no');
  if (msg) msg.textContent = t('confirmRefresh');
  if (yes) yes.textContent = t('yes');
  if (no)  no.textContent  = t('no');
}

// ── Settings UI refresh ───────────────────────────────
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
  document.querySelectorAll('#desc-seg .seg-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.val === s.descSize);
  });
}

// ─────────────────────────────────────────────
// CARD FACTORY
// FIX #4/#8 — onerror on both front & back images replaces them with a
// styled placeholder div so we never see the browser's broken-image icon.
// ─────────────────────────────────────────────
const CARD_BACK = 'assets/cards/back.webp';

function attachImgFallback(img, label) {
  img.addEventListener('error', () => {
    const ph = document.createElement('div');
    ph.className = 'card-img-fallback';
    ph.textContent = label?.[0]?.toUpperCase() || '?';
    img.replaceWith(ph);
  }, { once: true });
}

export function makeCard(cardData, category, onClick) {
  const wrap = document.createElement('div');
  wrap.className = 'card-wrap';
  wrap.dataset.id = cardData.id;

  // Flip container (top portion — image)
  const flipCont = document.createElement('div');
  flipCont.className = 'card-flip-container';

  const inner = document.createElement('div');
  inner.className = 'card-inner';

  // Front face
  const front = document.createElement('div');
  front.className = 'card-face';
  const fImg = document.createElement('img');
  fImg.src     = `assets/cards/${category}/${cardData.id}.webp`;
  fImg.loading = 'lazy';
  fImg.alt     = cardData[_lang];
  attachImgFallback(fImg, cardData[_lang]);
  front.appendChild(fImg);

  // Back face
  const back = document.createElement('div');
  back.className = 'card-back-face';
  const bImg = document.createElement('img');
  bImg.src = CARD_BACK;
  bImg.alt = '';
  attachImgFallback(bImg, '?');
  back.appendChild(bImg);

  // X overlay for "cross" discard animation (hidden by default,
  // shown via .crossed CSS rule)
  const xOverlay = document.createElement('div');
  xOverlay.className = 'card-x-overlay';
  xOverlay.setAttribute('aria-hidden', 'true');
  xOverlay.innerHTML = `
    <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <line x1="15" y1="15" x2="85" y2="85" stroke="currentColor"
            stroke-width="10" stroke-linecap="round"/>
      <line x1="85" y1="15" x2="15" y2="85" stroke="currentColor"
            stroke-width="10" stroke-linecap="round"/>
    </svg>`;

  inner.appendChild(front);
  inner.appendChild(back);
  flipCont.appendChild(inner);
  flipCont.appendChild(xOverlay);

  // Label
  const label = document.createElement('div');
  label.className = 'card-label';
  const span = document.createElement('span');
  span.textContent      = cardData[_lang];
  span.dataset.cardId   = cardData.id;
  span.dataset.category = category;
  label.appendChild(span);

  wrap.appendChild(flipCont);
  wrap.appendChild(label);

  wrap.addEventListener('click', () => onClick(wrap, cardData));
  return wrap;
}

// ─────────────────────────────────────────────
// GRIDS
//
// `amount` is one of 'mini' | 'normal' | 'big'. It's stamped onto the
// grid as data-amount so game.css can pick columns via attribute +
// orientation media queries. Falls back to 'normal' if missing, which
// matches the CSS default of 4 columns.
// ─────────────────────────────────────────────
export function renderSelectGrid(images, category, layout, amount, onSelect) {
  const grid = document.getElementById('select-grid');
  grid.innerHTML = '';
  grid.className = `card-grid grid-${layout}`;
  grid.dataset.amount = amount || 'normal';

  images.forEach((cardData, i) => {
    const wrap = makeCard(cardData, category, (w, cd) => {
      grid.querySelectorAll('.card-wrap').forEach(c => c.classList.remove('selected-card'));
      w.classList.add('selected-card');
      onSelect(i, cd);
    });
    grid.appendChild(wrap);
  });
}

export function renderPlayGrid(images, category, layout, amount, onCardClick) {
  const grid = document.getElementById('play-grid');
  grid.innerHTML = '';
  grid.className = `card-grid grid-${layout}`;
  grid.dataset.amount = amount || 'normal';

  const gameCards = [];
  images.forEach((cardData) => {
    const wrap = makeCard(cardData, category, (w, cd) => onCardClick(w, cd));
    grid.appendChild(wrap);
    gameCards.push(wrap);
  });
  return gameCards;
}

// ─────────────────────────────────────────────
// ANSWER PREVIEW (select screen)
// ─────────────────────────────────────────────
export function setAnswerPreview(cardData, category) {
  const box = document.getElementById('answer-preview');
  if (!box) return;

  box.innerHTML = '';

  const img = document.createElement('img');
  img.src    = `assets/cards/${category}/${cardData.id}.webp`;
  img.alt    = cardData[_lang];
  img.style.cssText = 'width:100%;height:80%;object-fit:cover;display:block;';
  attachImgFallback(img, cardData[_lang]);

  const label = document.createElement('div');
  label.className   = 'answer-box-label';
  label.textContent = cardData[_lang];

  box.appendChild(img);
  box.appendChild(label);
}

export function resetAnswerPreview() {
  const box = document.getElementById('answer-preview');
  if (box) box.innerHTML = '<div class="answer-box-empty">?</div>';
}

// ─────────────────────────────────────────────
// GAME ANSWER BOX
// ─────────────────────────────────────────────
export function setGameAnswerBox(cardData, category) {
  const img = document.getElementById('game-answer-img');
  const lbl = document.getElementById('game-answer-label');
  const cov = document.getElementById('game-answer-cover');
  if (!img) return;

  img.src           = `assets/cards/${category}/${cardData.id}.webp`;
  // Reset any prior error handler & attach fresh fallback
  img.onerror       = () => { img.style.visibility = 'hidden'; };
  img.style.visibility = 'visible';
  lbl.textContent   = cardData[_lang];
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
export function openConfirm()  { document.getElementById('confirm-overlay')?.classList.add('show'); }
export function closeConfirm() { document.getElementById('confirm-overlay')?.classList.remove('show'); }

// ─────────────────────────────────────────────
// BUTTONS
// ─────────────────────────────────────────────
export function showSaveBtn(visible) {
  const btn = document.getElementById('save-btn');
  if (btn) btn.style.display = visible ? 'inline-block' : 'none';
}

export function setUndoBtnState(enabled) {
  const btn = document.getElementById('undo-btn');
  if (btn) btn.disabled = !enabled;
}
