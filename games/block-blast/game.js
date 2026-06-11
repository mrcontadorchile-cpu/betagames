'use strict';

// ─── Constants ───────────────────────────────────────────────────────────────
const GRID_COLS = 8;
const GRID_ROWS = 8;
const GAME_W = 390;
const GAME_H = 844;

// Grid visual config
const GRID_PADDING = 16;
const GRID_X = GRID_PADDING;
const GRID_CELL = Math.floor((GAME_W - GRID_PADDING * 2) / GRID_COLS); // 44px
const GRID_Y = 130;
const GRID_W = GRID_CELL * GRID_COLS;
const GRID_H = GRID_CELL * GRID_ROWS;

// Piece tray
const TRAY_Y = GRID_Y + GRID_H + 32;
const TRAY_CELL = 24; // smaller preview cell size

// Colors
const BG_COLOR = 0x080820;
const GRID_BG = 0x0d1433;
const GRID_LINE = 0x1a2550;
const EMPTY_CELL = 0x0d1433;
const SLOT_H = 104;
const SLOT_Y = TRAY_Y + 40;

function clamp255(v) {
  return Math.max(0, Math.min(255, Math.round(v)));
}

function rgbOf(color) {
  return { r: (color >> 16) & 0xff, g: (color >> 8) & 0xff, b: color & 0xff };
}

function rgbToHex(r, g, b) {
  return (clamp255(r) << 16) | (clamp255(g) << 8) | clamp255(b);
}

function mix(color, target, amount) {
  const a = rgbOf(color);
  const b = rgbOf(target);
  return rgbToHex(
    a.r + (b.r - a.r) * amount,
    a.g + (b.g - a.g) * amount,
    a.b + (b.b - a.b) * amount
  );
}

function buzz(pattern) {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    navigator.vibrate(pattern);
  }
}

// ─── Themes ──────────────────────────────────────────────────────────────────
// BG_THEMES & ThemeRenderer loaded from themes.js
let currentThemeKey = localStorage.getItem('blockblast_theme') || 'deepspace';
// Migration: remap old theme keys to new ones
if (!BG_THEMES[currentThemeKey]) { currentThemeKey = 'deepspace'; localStorage.setItem('blockblast_theme', 'deepspace'); }

// ─── Block Themes ─────────────────────────────────────────────────────────────
const BLOCK_THEMES = {
  classic:    { name: 'Classic',    emoji: '⬛', unlockScore: 0 },
  hearts:     { name: 'Hearts',    emoji: '💕', unlockScore: 100 },
  watermelon: { name: 'Watermelon', emoji: '🍉', unlockScore: 200 },
  flowers:    { name: 'Flowers',   emoji: '🌺', unlockScore: 350 },
  plush:      { name: 'Plush',      emoji: '🧸', unlockScore: 500 },
  metal:      { name: 'Metal',      emoji: '🔩', unlockScore: 650 },
  candy:      { name: 'Candy',     emoji: '🍬', unlockScore: 800 },
  rock:       { name: 'Rock',       emoji: '🪨', unlockScore: 1000 },
  neon:       { name: 'Neon',       emoji: '⚡', unlockScore: 1200 },
  gems:       { name: 'Gems',      emoji: '💎', unlockScore: 1500 },
  bubbles:    { name: 'Bubbles',   emoji: '🫧', unlockScore: 1800 },
};
const BLOCK_THEME_KEYS = ['classic', 'watermelon', 'metal', 'plush', 'rock', 'neon', 'flowers', 'hearts', 'candy', 'gems', 'bubbles'];

function loadUnlockedBgThemes() {
  try { return JSON.parse(localStorage.getItem('blockblast_bg_themes') || '[]'); }
  catch(e) { return []; }
}
function saveUnlockedBgThemes(arr) {
  localStorage.setItem('blockblast_bg_themes', JSON.stringify(arr));
}
function loadUnlockedBlockThemes() {
  const record = parseInt(localStorage.getItem('blockblast_record') || '0');
  // Recompute from record — always authoritative
  const earned = Object.keys(BLOCK_THEMES).filter(k => record >= BLOCK_THEMES[k].unlockScore);
  if (!earned.includes('classic')) earned.unshift('classic');
  return earned;
}
function saveUnlockedBlockThemes(arr) {
  localStorage.setItem('blockblast_themes', JSON.stringify(arr));
}
let unlockedBlockThemes = loadUnlockedBlockThemes();
let currentBlockTheme = localStorage.getItem('blockblast_block_theme') || 'classic';
if (!unlockedBlockThemes.includes(currentBlockTheme)) currentBlockTheme = 'classic';

// ─── Phaser Scene ────────────────────────────────────────────────────────────
class GameScene extends Phaser.Scene {
  constructor() { super({ key: 'GameScene' }); }

  // ── State ─────────────────────────────────────────────────────────
  initState() {
    this.grid = Array.from({ length: GRID_ROWS }, () => Array(GRID_COLS).fill(0));
    this.score = 0;
    this.pieces = [];
    this.placedCount = 0; // for adaptive difficulty
    this.comboCount = 0;  // lines cleared in one placement
    this.streak = 0;      // consecutive placements with line clears
    this.vfx = new VFX(this);
    this.dragPiece = null;
    this.dragIndex = null;
    this.ghostCells = [];
    this.nearMissCols = [];
    this.nearMissRows = [];
    this.clearPreviewCols = [];
    this.clearPreviewRows = [];
    this.totalLinesCleared = 0;
    this.previewThemeKey = null;
    this.lastUnlockChecked = 0;
    // Animation state
    this.gridImages = Array.from({ length: GRID_ROWS }, () => Array(GRID_COLS).fill(null));
    this.smoothDragX = 0;
    this.smoothDragY = 0;
    this.frameCount = 0;
    this.isAnimatingClear = false;
  }

  // ── Create ────────────────────────────────────────────────────────
  create() {
    this.initState();
    generateAllTextures(this);
    this.drawBackground();
    this.drawGridBg();
    this.createCellGraphics();
    this.createScoreUI();
    this.createPauseButton();
    this.spawnPieces();
    this.setupInput();
    this.renderAll();
  }

  createPauseButton() {
    const btn = this.add.text(14, 14, '⏸', {
      fontSize: '22px',
      color: '#ffffff',
      alpha: 0.7,
      backgroundColor: 'rgba(255,255,255,0.08)',
      padding: { x: 8, y: 6 }
    }).setDepth(100).setInteractive({ useHandCursor: true });
    btn.on('pointerdown', () => {
      this.scene.pause('GameScene');
      this.scene.launch('PauseScene');
    });
    this.pauseBtn = btn;

    // Mute button in-game
    const muteIcon = () => AudioManager.isMuted() ? '🔇' : '🔊';
    const muteBtn = this.add.text(GAME_W - 14, 14, muteIcon(), {
      fontSize: '22px', alpha: 0.7
    }).setOrigin(1, 0).setDepth(100).setInteractive({ useHandCursor: true });
    muteBtn.on('pointerdown', () => {
      AudioManager.toggleMute();
      muteBtn.setText(muteIcon());
    });
  }

  // ── Background ────────────────────────────────────────────────────
  drawBackground() {
    if (this.themeRenderer) this.themeRenderer.destroy();
    this.themeRenderer = new ThemeRenderer(this);
    this.themeRenderer.apply(currentThemeKey);

    // Grid border (recreate on theme change)
    if (this.gridBorderGfx) this.gridBorderGfx.destroy();
    this.gridBorderGfx = this.add.graphics().setDepth(1);
    if (this.gridBoardImage) this.gridBoardImage.destroy();
    this.gridBoardImage = this.add.image(GRID_X - 16, GRID_Y - 16, 'grid_board')
      .setOrigin(0, 0)
      .setDepth(1);
    this._redrawGridBorder();
  }

  _redrawGridBorder() {
    const theme = BG_THEMES[currentThemeKey] || BG_THEMES.deepspace;
    const gfx = this.gridBorderGfx;
    gfx.clear();
    gfx.lineStyle(7, theme.gridLine, 0.08);
    gfx.strokeRoundedRect(GRID_X - 9, GRID_Y - 9, GRID_W + 18, GRID_H + 18, 16);
  }

  drawGridBg() {
    if (this.gridLinesGfx) this.gridLinesGfx.destroy();
    this.gridLinesGfx = this.add.graphics().setDepth(2);
    this._redrawGridLines();
  }

  _redrawGridLines() {
    const gfx = this.gridLinesGfx;
    gfx.clear();
  }

  // ── Cell Graphics (filled blocks) ─────────────────────────────────
  createCellGraphics() {
    this.cellImages = [];
    this.ghostImages = [];
    this.trayImages = [];
    this.dragImages = [];
    this.emptyCellImages = [];
    this.emptyCellScale = (GRID_CELL - 4) / TEXTURE_SIZE;
    for (let r = 0; r < GRID_ROWS; r++) {
      for (let c = 0; c < GRID_COLS; c++) {
        const img = this.add.image(
          GRID_X + c * GRID_CELL + GRID_CELL / 2,
          GRID_Y + r * GRID_CELL + GRID_CELL / 2,
          'empty_cell'
        ).setDepth(2.5).setScale(this.emptyCellScale);
        this.emptyCellImages.push(img);
      }
    }
    this.nearMissGfx = this.add.graphics().setDepth(3);
    this.clearPreviewGfx = this.add.graphics().setDepth(7);
    this.trayGfx = this.add.graphics().setDepth(5);
    this.dragGfx = this.add.graphics().setDepth(14);
  }

  renderGrid() {
    this._destroyImages(this.cellImages);
    this.cellImages = [];
    // Clear old gridImages references
    for (let r = 0; r < GRID_ROWS; r++) {
      for (let c = 0; c < GRID_COLS; c++) {
        this.gridImages[r][c] = null;
      }
    }
    for (let r = 0; r < GRID_ROWS; r++) {
      for (let c = 0; c < GRID_COLS; c++) {
        const val = this.grid[r][c];
        if (!val) continue;
        const img = this.addBlockImage(
          GRID_X + c * GRID_CELL,
          GRID_Y + r * GRID_CELL,
          GRID_CELL,
          val,
          1.0,
          5
        );
        this.cellImages.push(img);
        this.gridImages[r][c] = img;
        // Note: breathing tweens only added on new placements (see addBlockImage snap anim)
      }
    }
  }

  addBreathingTween(img) {
    if (!img || !img.active) return;
    // Stop any existing tween on this image to avoid accumulation
    this.tweens.killTweensOf(img);
    const baseScale = img.scaleX;
    this.tweens.add({
      targets: img,
      scaleX: baseScale * 1.018,
      scaleY: baseScale * 1.018,
      duration: 2000 + Math.random() * 600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut'
    });
  }

  renderGhost() {
    this._destroyImages(this.ghostImages);
    this.ghostImages = [];
    this.ghostCells.forEach(([col, row]) => {
      this.ghostImages.push(this.addBlockImage(
        GRID_X + col * GRID_CELL,
        GRID_Y + row * GRID_CELL,
        GRID_CELL,
        0x88ffcc,
        0.40,
        4
      ));
    });
  }

  renderClearPreview() {
    const g = this.clearPreviewGfx;
    g.clear();
    if (!this.clearPreviewRows.length && !this.clearPreviewCols.length) return;

    g.lineStyle(2, 0xffd700, 0.78);
    this.clearPreviewRows.forEach(r => {
      g.fillStyle(0xffd700, 0.13);
      g.fillRoundedRect(GRID_X + 2, GRID_Y + r * GRID_CELL + 2, GRID_W - 4, GRID_CELL - 4, 8);
      g.strokeRoundedRect(GRID_X + 2, GRID_Y + r * GRID_CELL + 2, GRID_W - 4, GRID_CELL - 4, 8);
    });
    this.clearPreviewCols.forEach(c => {
      g.fillStyle(0xffd700, 0.13);
      g.fillRoundedRect(GRID_X + c * GRID_CELL + 2, GRID_Y + 2, GRID_CELL - 4, GRID_H - 4, 8);
      g.strokeRoundedRect(GRID_X + c * GRID_CELL + 2, GRID_Y + 2, GRID_CELL - 4, GRID_H - 4, 8);
    });
  }

  renderNearMiss() {
    const g = this.nearMissGfx;
    g.clear();
    // highlight near-miss columns
    this.nearMissCols.forEach(c => {
      for (let r = 0; r < GRID_ROWS; r++) {
        if (this.grid[r][c]) continue;
        g.fillStyle(0x00ff88, 0.12);
        g.fillRoundedRect(GRID_X + c * GRID_CELL + 2, GRID_Y + r * GRID_CELL + 2, GRID_CELL - 4, GRID_CELL - 4, 5);
      }
    });
    // highlight near-miss rows
    this.nearMissRows.forEach(r => {
      for (let c = 0; c < GRID_COLS; c++) {
        if (this.grid[r][c]) continue;
        g.fillStyle(0x00ff88, 0.12);
        g.fillRoundedRect(GRID_X + c * GRID_CELL + 2, GRID_Y + r * GRID_CELL + 2, GRID_CELL - 4, GRID_CELL - 4, 5);
      }
    });
  }

  _destroyImages(list) {
    if (!list) return;
    list.forEach(img => { if (img && img.destroy) img.destroy(); });
  }

  addBlockImage(x, y, size, color, alpha = 1.0, depth = 5, theme = null) {
    const key = getBlockTextureKey(color, theme || currentBlockTheme);
    return this.add.image(x + size / 2, y + size / 2, key)
      .setDepth(depth)
      .setAlpha(alpha)
      .setScale(size / TEXTURE_SIZE);
  }

  drawBlock(gfx, x, y, size, color, alpha = 1.0, theme = null) {
    return this.addBlockImage(x, y, size, color, alpha, 5, theme);
  }


  // ── Tray ──────────────────────────────────────────────────────────
  renderTray() {
    const g = this.trayGfx;
    g.clear();
    this._destroyImages(this.trayImages);
    this.trayImages = [];

    const slotW = GAME_W / 3;
    this.trayRects = [];
    for (let i = 0; i < 3; i++) {
      const x = slotW * i + slotW / 2;
      const w = slotW - 16;
      const active = this.pieces[i] && this.dragIndex !== i;
      g.fillGradientStyle(0xffffff, 0xffffff, 0x000000, 0x000000, active ? 0.08 : 0.03, active ? 0.045 : 0.02, 0.03, 0.02);
      g.fillRoundedRect(x - w / 2, SLOT_Y - SLOT_H / 2, w, SLOT_H, 16);
      g.lineStyle(1, active ? 0xffffff : 0x334477, active ? 0.13 : 0.08);
      g.strokeRoundedRect(x - w / 2, SLOT_Y - SLOT_H / 2, w, SLOT_H, 16);
    }

    this.pieces.forEach((piece, i) => {
      if (!piece) return;
      const slotCenterX = slotW * i + slotW / 2;

      // bounding box
      let maxC = 0, maxR = 0;
      piece.cells.forEach(([c, r]) => { if (c > maxC) maxC = c; if (r > maxR) maxR = r; });
      const pw = (maxC + 1) * TRAY_CELL;
      const ph = (maxR + 1) * TRAY_CELL;
      const ox = slotCenterX - pw / 2;
      const oy = TRAY_Y + (80 - ph) / 2;

      // store for hit test
      this.trayRects[i] = { x: slotCenterX - slotW / 2, y: SLOT_Y - SLOT_H / 2, w: slotW, h: SLOT_H, ox, oy };
      if (this.dragIndex === i) return;

      piece.cells.forEach(([c, r]) => {
        this.trayImages.push(this.addBlockImage(
          ox + c * TRAY_CELL,
          oy + r * TRAY_CELL,
          TRAY_CELL,
          piece.color,
          1.0,
          6
        ));
      });
    });
  }

  // ── Score UI ──────────────────────────────────────────────────────
  createScoreUI() {
    const record = this.getRecord();

    // Create HTML score panel
    let panel = document.getElementById('score-panel');
    if (!panel) {
      panel = document.createElement('div');
      panel.id = 'score-panel';
      document.getElementById('game-container').appendChild(panel);
    }
    panel.innerHTML = `
      <div class="sp-block sp-score">
        <div class="sp-label">SCORE</div>
        <div class="sp-value" id="sp-score-val">0</div>
      </div>
      <div class="sp-block sp-best">
        <div class="sp-label sp-label-gold">BEST</div>
        <div class="sp-value sp-value-gold" id="sp-best-val">${record}</div>
      </div>
    `;
    panel.style.display = 'flex';

    // Theme button (legacy HTML — keep hidden, themes now in SettingsScene)
    const themeBtn = document.getElementById('theme-btn');
    if (themeBtn) themeBtn.style.display = 'none';
  }

  applyTheme() {
    // Rebuild entire background via ThemeRenderer
    this.drawBackground();
    this.drawGridBg();
  }

  updateScoreUI() {
    const scoreEl = document.getElementById('sp-score-val');
    const bestEl = document.getElementById('sp-best-val');
    if (scoreEl) scoreEl.textContent = this.score;
    if (bestEl) bestEl.textContent = this.getRecord();
    // pulse score via CSS
    if (scoreEl) {
      scoreEl.classList.remove('pulse');
      void scoreEl.offsetWidth;
      scoreEl.classList.add('pulse');
    }
  }

  // ── Block Theme System ────────────────────────────────────────────
  checkBlockThemeUnlocks() {
    BLOCK_THEME_KEYS.forEach(key => {
      if (unlockedBlockThemes.includes(key)) return;
      if (this.score >= BLOCK_THEMES[key].unlockScore) {
        unlockedBlockThemes.push(key);
        saveUnlockedBlockThemes(unlockedBlockThemes);
        this.showThemeUnlockBanner(key);
      }
    });
  }

  checkBgThemeUnlocks() {
    const unlocked = loadUnlockedBgThemes();
    BG_THEME_KEYS.forEach(key => {
      const t = BG_THEMES[key];
      if (!t.unlockScore || unlocked.includes(key)) return;
      if (this.score >= t.unlockScore) {
        unlocked.push(key);
        saveUnlockedBgThemes(unlocked);
        this.showThemeUnlockBanner(key, true);
      }
    });
  }

  showThemeUnlockBanner(key, isBg) {
    const theme = isBg ? BG_THEMES[key] : BLOCK_THEMES[key];
    let banner = document.getElementById('theme-unlock-banner');
    if (!banner) {
      banner = document.createElement('div');
      banner.id = 'theme-unlock-banner';
      document.getElementById('game-container').appendChild(banner);
    }
    banner.textContent = `${theme.emoji} Tema ${theme.name} desbloqueado!`;
    banner.style.display = 'block';
    banner.classList.remove('banner-hide');
    void banner.offsetWidth;
    banner.classList.add('banner-show');
    clearTimeout(this._bannerTimer);
    this._bannerTimer = setTimeout(() => {
      banner.classList.add('banner-hide');
      setTimeout(() => { banner.style.display = 'none'; banner.classList.remove('banner-show','banner-hide'); }, 500);
    }, 2500);
  }

  checkBlockThemePreviewRotation() {
    if (unlockedBlockThemes.length >= 3) return;
    const every = 5;
    if (this.totalLinesCleared % every !== 0) return;
    const idx = BLOCK_THEME_KEYS.indexOf(currentBlockTheme);
    const next = BLOCK_THEME_KEYS[(idx + 1) % BLOCK_THEME_KEYS.length];
    const isLocked = !unlockedBlockThemes.includes(next);
    this.previewThemeKey = next;
    currentBlockTheme = next;
    this.renderGrid();
    this.renderTray();
    // Show preview label
    let lbl = document.getElementById('theme-preview-label');
    if (!lbl) {
      lbl = document.createElement('div');
      lbl.id = 'theme-preview-label';
      document.getElementById('game-container').appendChild(lbl);
    }
    const t = BLOCK_THEMES[next];
    lbl.textContent = isLocked ? `Preview: ${t.emoji} ${t.name}` : `${t.emoji} ${t.name}`;
    lbl.style.display = 'block';
    clearTimeout(this._previewTimer);
    this._previewTimer = setTimeout(() => {
      lbl.style.display = 'none';
      // Revert to actual theme if preview was locked
      if (isLocked) {
        currentBlockTheme = localStorage.getItem('blockblast_block_theme') || 'classic';
        if (!unlockedBlockThemes.includes(currentBlockTheme)) currentBlockTheme = 'classic';
        this.renderGrid();
        this.renderTray();
      }
    }, 2000);
  }

  openBlockThemePanel() {
    let panel = document.getElementById('block-theme-panel');
    if (panel) { panel.style.display = 'flex'; return; }
    panel = document.createElement('div');
    panel.id = 'block-theme-panel';
    panel.innerHTML = `
      <div class="btp-modal">
        <div class="btp-title">TEMAS DE BLOQUES</div>
        <div class="btp-list" id="btp-list"></div>
        <button class="btp-close" id="btp-close">CERRAR</button>
      </div>
    `;
    document.getElementById('game-container').appendChild(panel);
    document.getElementById('btp-close').onclick = () => { panel.style.display = 'none'; };
    panel.onclick = (e) => { if (e.target === panel) panel.style.display = 'none'; };
    this.refreshBlockThemePanel();
    panel.style.display = 'flex';
  }

  refreshBlockThemePanel() {
    const list = document.getElementById('btp-list');
    if (!list) return;
    list.innerHTML = '';
    BLOCK_THEME_KEYS.forEach(key => {
      const t = BLOCK_THEMES[key];
      const unlocked = unlockedBlockThemes.includes(key);
      const active = currentBlockTheme === key;
      const row = document.createElement('div');
      row.className = 'btp-row' + (active ? ' btp-active' : '') + (unlocked ? '' : ' btp-locked');
      row.innerHTML = `<span class="btp-emoji">${t.emoji}</span>
        <span class="btp-name">${t.name}</span>
        <span class="btp-status">${active ? '✓ activo' : unlocked ? 'Usar' : `score: ${t.unlockScore}`}</span>`;
      if (unlocked && !active) {
        row.onclick = () => {
          currentBlockTheme = key;
          localStorage.setItem('blockblast_block_theme', key);
          this.renderGrid();
          this.renderTray();
          this.refreshBlockThemePanel();
        };
      }
      list.appendChild(row);
    });
  }

  // ── Piece Spawning ────────────────────────────────────────────────
  spawnPieces() {
    // Adaptive: as score grows, favor larger pieces
    const bias = Math.min(this.score / 200, 1.0);
    const pool = bias > 0.5
      ? PIECES.filter(p => p.cells.length >= 3)
      : PIECES;

    this.pieces = [0, 1, 2].map(() => {
      const def = pool[Math.floor(Math.random() * pool.length)];
      return { cells: def.cells.map(c => [...c]), color: def.color };
    });
  }

  // ── Input ─────────────────────────────────────────────────────────
  setupInput() {
    // Pointer events for drag
    this.input.on('pointerdown', this.onPointerDown, this);
    this.input.on('pointermove', this.onPointerMove, this);
    this.input.on('pointerup', this.onPointerUp, this);
  }

  onPointerDown(ptr) {
    if (this.isAnimatingClear) return; // block input during line clear animation
    if (!this.trayRects) return;
    for (let i = 0; i < 3; i++) {
      if (!this.pieces[i]) continue;
      const r = this.trayRects[i];
      if (!r) continue;
      if (ptr.x >= r.x && ptr.x <= r.x + r.w && ptr.y >= r.y && ptr.y <= r.y + r.h) {
        this.dragIndex = i;
        this.dragPiece = this.pieces[i];
        this.dragX = ptr.x;
        this.dragY = ptr.y;
        this.smoothDragX = ptr.x;
        this.smoothDragY = ptr.y;
        this.renderTray();
        this.updateGhostAndNearMiss();
        this.renderDragPiece();
        this.renderGhost();
        this.renderNearMiss();
        this.renderClearPreview();
        break;
      }
    }
  }

  onPointerMove(ptr) {
    if (this.dragPiece === null) return;
    this.dragX = ptr.x;
    this.dragY = ptr.y;
    // Ghost/near-miss use actual pointer for responsiveness
    this.updateGhostAndNearMiss();
    this.renderGhost();
    this.renderNearMiss();
    this.renderClearPreview();
    // renderDragPiece is now called from update() via lerp
  }

  onPointerUp(ptr) {
    if (this.dragPiece === null) return;
    const placed = this.tryPlace();
    this.dragPiece = null;
    this.dragIndex = null;
    this.ghostCells = [];
    this.nearMissCols = [];
    this.nearMissRows = [];
    this.clearPreviewCols = [];
    this.clearPreviewRows = [];
    this._destroyImages(this.ghostImages);
    this._destroyImages(this.dragImages);
    this.ghostImages = [];
    this.dragImages = [];
    this.dragGfx.clear();
    this.renderNearMiss();
    this.renderClearPreview();

    if (!placed) {
      AudioManager.playInvalid();
      this.vfx.invalidDrop(this, ptr.x, ptr.y);
      this.renderTray();
      return;
    }

    // checkGameOver() is called after clear animation completes (see clearLines)
    // or immediately if no lines were cleared (isAnimatingClear stays false)
    if (!this.isAnimatingClear) this.checkGameOver();
  }

  // ── Ghost + Near Miss ─────────────────────────────────────────────
  getGridPos(px, py) {
    // Offset upward by one cell so finger doesn't cover piece
    const adjustY = py - GRID_CELL * 1.5;
    const col = Math.floor((px - GRID_X) / GRID_CELL);
    const row = Math.floor((adjustY - GRID_Y) / GRID_CELL);
    return { col, row };
  }

  updateGhostAndNearMiss() {
    this.ghostCells = [];
    this.clearPreviewCols = [];
    this.clearPreviewRows = [];
    if (!this.dragPiece) return;
    const { col, row } = this.getGridPos(this.dragX, this.dragY);
    if (this.canPlace(this.dragPiece, col, row)) {
      this.ghostCells = this.dragPiece.cells.map(([c, r]) => [col + c, row + r]);
    }
    this.computeNearMiss();
  }

  computeNearMiss() {
    this.nearMissCols = [];
    this.nearMissRows = [];
    this.clearPreviewCols = [];
    this.clearPreviewRows = [];
    // Check which rows/cols are 1 away from full
    for (let r = 0; r < GRID_ROWS; r++) {
      let filled = 0;
      for (let c = 0; c < GRID_COLS; c++) {
        if (this.grid[r][c] || this.ghostCells.some(([gc, gr]) => gc === c && gr === r)) filled++;
      }
      if (filled === GRID_COLS) this.clearPreviewRows.push(r);
      if (filled === GRID_COLS - 1) this.nearMissRows.push(r);
    }
    for (let c = 0; c < GRID_COLS; c++) {
      let filled = 0;
      for (let r = 0; r < GRID_ROWS; r++) {
        if (this.grid[r][c] || this.ghostCells.some(([gc, gr]) => gc === c && gr === r)) filled++;
      }
      if (filled === GRID_ROWS) this.clearPreviewCols.push(c);
      if (filled === GRID_ROWS - 1) this.nearMissCols.push(c);
    }
  }

  // ── Drag Render ───────────────────────────────────────────────────
  renderDragPiece() {
    const g = this.dragGfx;
    g.clear();
    this._destroyImages(this.dragImages);
    this.dragImages = [];
    if (!this.dragPiece) return;
    const { col, row } = this.getGridPos(this.dragX, this.dragY);
    const canPlace = this.canPlace(this.dragPiece, col, row);
    const onGrid = col >= 0 && row >= 0 && col < GRID_COLS && row < GRID_ROWS;

    // Draw at grid-snapped position if on grid, else at smooth finger pos
    this.dragPiece.cells.forEach(([c, r]) => {
      let x, y;
      if (onGrid) {
        x = GRID_X + (col + c) * GRID_CELL;
        y = GRID_Y + (row + r) * GRID_CELL;
        const size = GRID_CELL;
        const alpha = canPlace ? 0.85 : 0.45;
        const color = canPlace ? this.dragPiece.color : 0xff2222;
        this.dragImages.push(this.addBlockImage(x, y, size, color, alpha, 15));
      } else {
        // floating near finger with lerp
        x = this.smoothDragX + c * TRAY_CELL - TRAY_CELL;
        y = this.smoothDragY + r * TRAY_CELL - GRID_CELL * 1.5;
        this.dragImages.push(this.addBlockImage(x, y, TRAY_CELL, this.dragPiece.color, 0.9, 15));
      }
    });
  }

  // ── Placement Logic ───────────────────────────────────────────────
  canPlace(piece, col, row) {
    if (col === undefined || row === undefined) return false;
    return piece.cells.every(([c, r]) => {
      const gc = col + c;
      const gr = row + r;
      return gc >= 0 && gc < GRID_COLS && gr >= 0 && gr < GRID_ROWS && !this.grid[gr][gc];
    });
  }

  tryPlace() {
    if (!this.dragPiece) return false;
    const { col, row } = this.getGridPos(this.dragX, this.dragY);
    if (!this.canPlace(this.dragPiece, col, row)) return false;

    const placedCells = [];
    let cellCount = 0;
    this.dragPiece.cells.forEach(([c, r]) => {
      const gc = col + c;
      const gr = row + r;
      this.grid[gr][gc] = this.dragPiece.color;
      placedCells.push({ gc, gr, color: this.dragPiece.color });
      cellCount++;
    });
    buzz(8);
    AudioManager.playPlace();
    this.addScore(cellCount);
    this.pieces[this.dragIndex] = null;
    this.placedCount++;

    // ANIM 2: Snap animation for placed blocks
    // Render grid first so gridImages[][] is populated, then animate placed cells
    this.renderGrid();
    this.renderTray();

    placedCells.forEach(({ gc, gr, color }, idx) => {
      const img = this.gridImages[gr][gc];
      if (!img) return;
      const finalY = img.y;
      const baseScale = img.scaleX;
      // Kill any existing breathing tween on this image
      this.tweens.killTweensOf(img);
      img.y = finalY - 30;
      img.setScale(baseScale * 0.8);
      img.setAlpha(0.7);

      this.tweens.add({
        targets: img,
        y: finalY,
        scaleX: baseScale * 1.05,
        scaleY: baseScale * 1.05,
        alpha: 1,
        duration: 180,
        ease: 'Power2.Out',
        delay: idx * 25,
        onComplete: () => {
          this.tweens.add({
            targets: img,
            scaleX: baseScale,
            scaleY: baseScale,
            duration: 120,
            ease: 'Sine.Out',
            onComplete: () => this.addBreathingTween(img)
          });
        }
      });

      // White flash
      const cx = GRID_X + gc * GRID_CELL + GRID_CELL / 2;
      const cy = GRID_Y + gr * GRID_CELL + GRID_CELL / 2;
      const flash = this.add.rectangle(cx, cy, GRID_CELL, GRID_CELL, 0xffffff, 0.3).setDepth(20);
      this.tweens.add({
        targets: flash,
        alpha: 0,
        duration: 150,
        onComplete: () => flash.destroy()
      });

      // Ripple neighbors
      const neighbors = [[gc-1,gr],[gc+1,gr],[gc,gr-1],[gc,gr+1]];
      neighbors.forEach(([nc, nr]) => {
        if (nc < 0 || nc >= GRID_COLS || nr < 0 || nr >= GRID_ROWS) return;
        const nImg = this.gridImages[nr][nc];
        if (!nImg || placedCells.some(p => p.gc === nc && p.gr === nr)) return;
        const nBase = nImg.scaleX;
        this.tweens.add({
          targets: nImg,
          scaleX: nBase * 1.04,
          scaleY: nBase * 1.04,
          duration: 100,
          yoyo: true,
          ease: 'Sine.Out',
          delay: idx * 25 + 50
        });
      });
    });

    // Subtle camera shake
    this.cameras.main.shake(60, 0.0015);

    // Check and clear lines
    this.clearLines();

    if (this.pieces.every(p => !p)) {
      this.spawnPieces();
      this.renderTray();
    }

    return true;
  }

  clearLines() {
    const rowsToClear = [];
    const colsToClear = [];

    for (let r = 0; r < GRID_ROWS; r++) {
      if (this.grid[r].every(v => v)) rowsToClear.push(r);
    }
    for (let c = 0; c < GRID_COLS; c++) {
      if (this.grid.every(row => row[c])) colsToClear.push(c);
    }

    const linesCleared = rowsToClear.length + colsToClear.length;
    if (!linesCleared) { this.comboCount = 0; this.streak = 0; return; }
    buzz(linesCleared >= 2 ? [18, 30, 28] : 18);
    if (this.comboCount >= 2) AudioManager.playCombo(this.comboCount);
    else AudioManager.playClear(linesCleared);
    this.totalLinesCleared += linesCleared;
    this.checkBlockThemePreviewRotation();

    // Collect all cells to explode
    const explodeCells = [];
    rowsToClear.forEach(r => {
      for (let c = 0; c < GRID_COLS; c++) explodeCells.push([c, r]);
    });
    colsToClear.forEach(c => {
      for (let r = 0; r < GRID_ROWS; r++) {
        if (!rowsToClear.includes(r)) explodeCells.push([c, r]);
      }
    });

    // Deduplicate
    const key = ([c, r]) => `${c},${r}`;
    const unique = [...new Map(explodeCells.map(cell => [key(cell), cell])).values()];

    // Theme callback
    if (this.themeRenderer) this.themeRenderer.onLineClear(unique);

    // ANIM 3: Sequential line clear explosion
    this.isAnimatingClear = true;

    // 1. Flash white on all line cells
    unique.forEach(([c, r]) => {
      const flash = this.add.rectangle(
        GRID_X + c * GRID_CELL + GRID_CELL / 2,
        GRID_Y + r * GRID_CELL + GRID_CELL / 2,
        GRID_CELL, GRID_CELL, 0xffffff, 0.25
      ).setDepth(20);
      this.tweens.add({ targets: flash, alpha: 0, duration: 100, onComplete: () => flash.destroy() });
    });

    // 2. Sequential block explosion
    unique.forEach(([c, r], index) => {
      const blockImage = this.gridImages[r][c];
      const blockColor = this.grid[r][c] || 0xffffff;

      this.time.delayedCall(index * 35, () => {
        if (blockImage && blockImage.active) {
          this.tweens.killTweensOf(blockImage);
          this.tweens.add({
            targets: blockImage,
            scaleX: blockImage.scaleX * 1.2,
            scaleY: blockImage.scaleY * 1.2,
            duration: 80,
            ease: 'Power2.Out',
            onComplete: () => {
              this.tweens.add({
                targets: blockImage,
                scaleX: 0,
                scaleY: 0,
                alpha: 0,
                duration: 120,
                ease: 'Power2.In',
                onComplete: () => {
                  blockImage.destroy();
                  // Remove from cellImages
                  const ci = this.cellImages.indexOf(blockImage);
                  if (ci !== -1) this.cellImages.splice(ci, 1);
                }
              });
            }
          });
        }
        this.gridImages[r][c] = null;

        // Particles per block
        const cx = GRID_X + c * GRID_CELL + GRID_CELL / 2;
        const cy = GRID_Y + r * GRID_CELL + GRID_CELL / 2;
        for (let p = 0; p < 6; p++) {
          const angle = (p / 6) * Math.PI * 2;
          const speed = 50 + Math.random() * 60;
          const particle = this.add.circle(cx, cy, 2 + Math.random() * 2, blockColor, 0.7).setDepth(25);
          this.tweens.add({
            targets: particle,
            x: particle.x + Math.cos(angle) * speed,
            y: particle.y + Math.sin(angle) * speed,
            alpha: 0, scaleX: 0, scaleY: 0,
            duration: 350,
            ease: 'Power2.Out',
            onComplete: () => particle.destroy()
          });
        }
      });
    });

    // 3. Camera shake proportional to combo
    const intensity = Math.min(0.008, 0.002 * linesCleared);
    this.cameras.main.shake(150 + linesCleared * 50, intensity);

    // 4. Clear grid data and re-render after all explosions finish
    const totalDelay = unique.length * 35 + 250;
    this.time.delayedCall(totalDelay, () => {
      // Actually clear grid data
      rowsToClear.forEach(r => { this.grid[r] = Array(GRID_COLS).fill(0); });
      colsToClear.forEach(c => { for (let r = 0; r < GRID_ROWS; r++) this.grid[r][c] = 0; });
      // Re-render grid cleanly
      this.renderGrid();
      this.isAnimatingClear = false;
      this.checkGameOver();
    });

    // Score
    this.streak++;
    let lineScore = linesCleared * 10;
    if (linesCleared >= 2) lineScore *= 2;
    if (this.streak > 1) lineScore = Math.floor(lineScore * (1 + this.streak * 0.2)); // streak bonus
    this.addScore(lineScore);

    // Combo text
    this.comboCount += linesCleared;
    if (linesCleared >= 2) {
      this.vfx.comboText(GAME_W / 2, GRID_Y + GRID_H / 2, linesCleared);
    }

    // Streak display
    if (this.streak >= 2) {
      this._showStreak(this.streak);
    }

    // Floating score
    this.vfx.floatingScore(GAME_W / 2, GRID_Y + GRID_H / 2 + 40, `+${lineScore}`, '#ffd700', 32);
  }

  _showStreak(n) {
    const labels = ['', '', '🔥 x2', '🔥 x3', '🔥🔥 x4', '🔥🔥 x5', '💥 INSANE!'];
    const colors = ['', '', '#ff8c00', '#ff4400', '#ff0088', '#aa00ff', '#ffffff'];
    const label = labels[Math.min(n, labels.length - 1)] || `🔥 x${n}`;
    const color = colors[Math.min(n, colors.length - 1)] || '#ffffff';
    const size = Math.min(28 + n * 4, 48);
    // Destroy previous streak display
    if (this._streakTxt) { this._streakTxt.destroy(); this._streakTxt = null; }
    const txt = this.add.text(GAME_W / 2, GRID_Y - 28, label, {
      fontSize: `${size}px`, fontFamily: "'Arial Black', Arial, sans-serif",
      fontStyle: 'bold', color,
      stroke: '#000000', strokeThickness: 3,
      shadow: { offsetX: 0, offsetY: 0, color, blur: 20, fill: true }
    }).setOrigin(0.5).setDepth(30).setAlpha(0).setScale(1.5);
    this._streakTxt = txt;
    this.tweens.add({
      targets: txt, alpha: 1, scale: 1, y: GRID_Y - 40,
      duration: 300, ease: 'Back.easeOut',
      onComplete: () => {
        this.tweens.add({
          targets: txt, alpha: 0, y: GRID_Y - 70, duration: 600, delay: 600,
          onComplete: () => { if (this._streakTxt === txt) { txt.destroy(); this._streakTxt = null; } }
        });
      }
    });
  }

  addScore(pts) {
    this.score += pts;
    if (this.score > this.getRecord()) {
      localStorage.setItem('blockblast_record', this.score);
    }
    this.updateScoreUI();
    this.checkBlockThemeUnlocks();
    this.checkBgThemeUnlocks();
  }

  // ── Near Miss Flash on Grid Lines ─────────────────────────────────
  flashLine(cells) {
    const gfx = this.add.graphics().setDepth(18);
    cells.forEach(([c, r]) => {
      gfx.fillStyle(0x00ff88, 0.5);
      gfx.fillRoundedRect(GRID_X + c * GRID_CELL + 2, GRID_Y + r * GRID_CELL + 2, GRID_CELL - 4, GRID_CELL - 4, 5);
    });
    this.time.delayedCall(200, () => gfx.destroy());
  }

  // ── Game Over ─────────────────────────────────────────────────────
  checkGameOver() {
    const activePieces = this.pieces.filter(Boolean);
    const anyFits = activePieces.some(piece =>
      this.pieceFitsAnywhere(piece)
    );
    if (!anyFits && activePieces.length > 0) {
      this.time.delayedCall(400, () => this.gameOver());
    }
  }

  pieceFitsAnywhere(piece) {
    for (let r = 0; r < GRID_ROWS; r++) {
      for (let c = 0; c < GRID_COLS; c++) {
        if (this.canPlace(piece, c, r)) return true;
      }
    }
    return false;
  }

  gameOver() {
    AudioManager.playGameOver();
    AudioManager.stopMusic();
    AdsManager.showInterstitial();
    // Flash all cells dark
    const targets = this.cellImages && this.cellImages.length ? this.cellImages : [this.gridBoardImage].filter(Boolean);
    this.tweens.add({
      targets,
      alpha: 0.3,
      duration: 300,
      yoyo: true,
      repeat: 1,
      onComplete: () => {
        targets.forEach(t => t.setAlpha(1));
        this.showGameOverScreen();
      }
    });
  }

  showGameOverScreen() {
    const streak = this.getStreak();
    if (this.score > 0) {
      localStorage.setItem('blockblast_streak', Math.min((streak || 1) + 0.5, 3).toFixed(1));
    } else {
      localStorage.setItem('blockblast_streak', '1');
    }
    this.scene.pause('GameScene');
    this.scene.launch('GameOverScene', { score: this.score, record: this.getRecord() });
  }

  // ── Record / Streak ───────────────────────────────────────────────
  getRecord() {
    return parseInt(localStorage.getItem('blockblast_record') || '0');
  }

  getStreak() {
    return parseFloat(localStorage.getItem('blockblast_streak') || '1');
  }

  // ── Update (theme animation + drag lerp) ───────────────────────────
  update(time, delta) {
    if (this.themeRenderer) this.themeRenderer.update(time, delta);
    this.frameCount++;

    // ANIM 4: Smooth drag lerp + trail
    if (this.dragPiece) {
      const prevX = this.smoothDragX;
      const prevY = this.smoothDragY;
      this.smoothDragX += (this.dragX - this.smoothDragX) * 0.25;
      this.smoothDragY += (this.dragY - this.smoothDragY) * 0.25;

      // Only re-render if moved enough
      const dx = Math.abs(this.smoothDragX - prevX);
      const dy = Math.abs(this.smoothDragY - prevY);
      if (dx > 0.5 || dy > 0.5) {
        this.renderDragPiece();
      }

      // Trail particles every 3 frames
      if (this.frameCount % 3 === 0 && (dx > 1 || dy > 1)) {
        const trail = this.add.circle(
          this.smoothDragX, this.smoothDragY,
          3, this.dragPiece.color || 0xffffff, 0.3
        ).setDepth(15);
        this.tweens.add({
          targets: trail,
          alpha: 0, scaleX: 0, scaleY: 0,
          duration: 300,
          onComplete: () => trail.destroy()
        });
      }
    }
  }

  // ── Render All ────────────────────────────────────────────────────
  renderAll() {
    this.renderGrid();
    this.renderTray();
    this.renderGhost();
    this.renderNearMiss();
    this.renderClearPreview();
  }
}

// ─── MenuScene ────────────────────────────────────────────────────────────────
class MenuScene extends Phaser.Scene {
  constructor() { super({ key: 'MenuScene' }); }

  create() {
    AdsManager.init();
    AdsManager.showBanner();
    this._drawStarBg();
    // Dark vignette so logo reads clearly
    this.add.rectangle(GAME_W / 2, GAME_H / 2, GAME_W, GAME_H, 0x000000, 0.38).setDepth(1);
    this._drawFloatingBlocks();
    this.cameras.main.fadeIn(350, 0, 0, 0);

    const cx = GAME_W / 2;

    // ── Logo panel (dark glass behind text) ──
    const logoPanelY = 240;
    const logoBg = this.add.graphics().setDepth(4);
    logoBg.fillStyle(0x000000, 0.35);
    logoBg.fillRoundedRect(cx - 150, logoPanelY - 52, 300, 88, 20);
    logoBg.setAlpha(0);
    this.tweens.add({ targets: logoBg, alpha: 1, duration: 400, delay: 60 });

    // "BLOCK" line
    const blockTxt = this.add.text(cx, logoPanelY - 18, 'BLOCK', {
      fontSize: '48px',
      fontFamily: "'Arial Black', Arial, sans-serif",
      fontStyle: 'bold',
      color: '#ffffff',
      stroke: '#ffffff',
      strokeThickness: 1,
      shadow: { offsetX: 0, offsetY: 3, color: '#000000', blur: 8, fill: true }
    }).setOrigin(0.5, 1).setDepth(5).setAlpha(0).setScale(0.85);

    // "BLAST" line — accent color
    const blastTxt = this.add.text(cx, logoPanelY + 28, 'BLAST', {
      fontSize: '48px',
      fontFamily: "'Arial Black', Arial, sans-serif",
      fontStyle: 'bold',
      color: '#ffc837',
      stroke: '#ff6b00',
      strokeThickness: 2,
      shadow: { offsetX: 0, offsetY: 4, color: '#cc4400', blur: 12, fill: true }
    }).setOrigin(0.5, 1).setDepth(5).setAlpha(0).setScale(0.85);

    this.tweens.add({ targets: [blockTxt, blastTxt], alpha: 1, scale: 1, duration: 500, ease: 'Back.easeOut', delay: 80 });
    // Subtle breathe
    this.tweens.add({ targets: blastTxt, alpha: 0.82, duration: 2200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: 700 });

    // ── Score capsule ──
    const rec = parseInt(localStorage.getItem('blockblast_record') || '0');
    const capsule = this.add.container(cx, 310).setDepth(5).setAlpha(0);
    const capBg = this.add.graphics();
    capBg.fillStyle(0xffffff, 0.08);
    capBg.fillRoundedRect(-90, -16, 180, 32, 16);
    capBg.lineStyle(1, 0xffffff, 0.18);
    capBg.strokeRoundedRect(-90, -16, 180, 32, 16);
    const capLabel = this.add.text(-50, 0, 'MEJOR', {
      fontSize: '11px', fontFamily: 'Arial, sans-serif', color: '#888888', letterSpacing: 2
    }).setOrigin(0.5);
    const capVal = this.add.text(30, 0, rec.toString(), {
      fontSize: '18px', fontFamily: "'Arial Black', Arial, sans-serif", color: '#ffc837'
    }).setOrigin(0, 0.5);
    const capDiv = this.add.text(-10, 0, '|', {
      fontSize: '14px', fontFamily: 'Arial, sans-serif', color: '#444444'
    }).setOrigin(0.5);
    capsule.add([capBg, capLabel, capDiv, capVal]);
    this.tweens.add({ targets: capsule, alpha: 1, duration: 350, delay: 320 });

    // ── Next unlock progress ──
    const nextUnlock = this._getNextUnlock();
    if (nextUnlock) {
      const progY = 354;
      const progContainer = this.add.container(cx, progY).setDepth(5).setAlpha(0);
      const pBg = this.add.graphics();
      pBg.fillStyle(0x000000, 0.25);
      pBg.fillRoundedRect(-120, -14, 240, 28, 14);
      const pLabel = this.add.text(0, -1, `Siguiente: ${nextUnlock.name}  ${rec}/${nextUnlock.unlockScore}`, {
        fontSize: '10px', fontFamily: 'Arial, sans-serif', color: '#aaaaaa', letterSpacing: 1
      }).setOrigin(0.5);
      // progress bar
      const barW = 160, barH = 4, barX = -barW / 2, barY = 9;
      const barBg = this.add.graphics();
      barBg.fillStyle(0x333355, 1);
      barBg.fillRoundedRect(barX, barY, barW, barH, 2);
      const pct = Math.min(rec / nextUnlock.unlockScore, 1);
      if (pct > 0) {
        const barFill = this.add.graphics();
        barFill.fillStyle(0xffc837, 1);
        barFill.fillRoundedRect(barX, barY, barW * pct, barH, 2);
        progContainer.add(barFill);
      }
      progContainer.add([pBg, pLabel, barBg]);
      this.tweens.add({ targets: progContainer, alpha: 1, duration: 350, delay: 420 });
    }

    // ── JUGAR button (primary, large) ──
    const playBtn = this._makePrimaryButton(cx, 480, 'JUGAR');
    playBtn.setAlpha(0).setY(510);
    this.tweens.add({ targets: playBtn, alpha: 1, y: 480, duration: 420, ease: 'Back.easeOut', delay: 500 });
    playBtn.on('pointerdown', () => {
      AudioManager.init();
      AudioManager.playButton();
      AudioManager.startMusic();
      AdsManager.hideBanner();
      this.cameras.main.fadeOut(280, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => { this.scene.start('GameScene'); });
    });

    // ── Settings icon button (secondary) ──
    const settingsBtn = this._makeIconButton(cx, 566, '⚙ TEMAS');
    settingsBtn.setAlpha(0).setY(590);
    this.tweens.add({ targets: settingsBtn, alpha: 1, y: 566, duration: 380, ease: 'Back.easeOut', delay: 620 });
    settingsBtn.on('pointerdown', () => {
      AudioManager.playButton();
      this.scene.start('SettingsScene', { from: 'MenuScene' });
    });

    // ── Mute button top-right ──
    const muteIcon = () => AudioManager.isMuted() ? '🔇' : '🔊';
    const muteBtn = this.add.text(GAME_W - 20, 20, muteIcon(), {
      fontSize: '20px', alpha: 0.6
    }).setOrigin(1, 0).setDepth(20).setInteractive({ useHandCursor: true });
    muteBtn.on('pointerdown', () => {
      AudioManager.init();
      AudioManager.toggleMute();
      muteBtn.setText(muteIcon());
    });
  }

  _getNextUnlock() {
    const rec = parseInt(localStorage.getItem('blockblast_record') || '0');
    const unlocked = loadUnlockedBlockThemes();
    for (const key of BLOCK_THEME_KEYS) {
      if (!unlocked.includes(key) && BLOCK_THEMES[key].unlockScore > 0) return BLOCK_THEMES[key];
    }
    // Check BG themes
    const unlockedBg = loadUnlockedBgThemes();
    for (const key of BG_THEME_KEYS) {
      const t = BG_THEMES[key];
      if (t.unlockScore && !unlockedBg.includes(key)) return { name: t.name, unlockScore: t.unlockScore };
    }
    return null;
  }

  // Large primary CTA button
  _makePrimaryButton(x, y, label) {
    const w = 220, h = 60, r = 30;
    const c = this.add.container(x, y).setDepth(10);
    const box = this.add.graphics();
    // White-tinted dark gradient feel
    box.fillStyle(0x1a1a2e, 1);
    box.fillRoundedRect(-w / 2, -h / 2, w, h, r);
    // Accent top line
    box.lineStyle(2, 0xffc837, 0.9);
    box.strokeRoundedRect(-w / 2, -h / 2, w, h, r);
    // Inner glow band
    box.fillStyle(0xffc837, 0.08);
    box.fillRoundedRect(-w / 2 + 2, -h / 2 + 2, w - 4, h / 2, r - 2);
    const txt = this.add.text(0, 0, label, {
      fontSize: '26px', fontFamily: "'Arial Black', Arial, sans-serif",
      fontStyle: 'bold', color: '#ffc837',
      shadow: { offsetX: 0, offsetY: 2, color: '#ff6b00', blur: 6, fill: true }
    }).setOrigin(0.5);
    c.add([box, txt]);
    c.setInteractive(new Phaser.Geom.Rectangle(-w / 2, -h / 2, w, h), Phaser.Geom.Rectangle.Contains);
    c.on('pointerover', () => { this.tweens.add({ targets: c, scaleX: 1.04, scaleY: 1.04, duration: 100 }); });
    c.on('pointerout', () => { this.tweens.add({ targets: c, scaleX: 1, scaleY: 1, duration: 100 }); });
    c.on('pointerdown', () => { this.tweens.add({ targets: c, scaleX: 0.94, scaleY: 0.94, duration: 80, yoyo: true }); });
    return c;
  }

  // Subtle secondary button
  _makeIconButton(x, y, label) {
    const w = 180, h = 40, r = 20;
    const c = this.add.container(x, y).setDepth(10);
    const box = this.add.graphics();
    box.fillStyle(0xffffff, 0.06);
    box.fillRoundedRect(-w / 2, -h / 2, w, h, r);
    box.lineStyle(1, 0xffffff, 0.14);
    box.strokeRoundedRect(-w / 2, -h / 2, w, h, r);
    const txt = this.add.text(0, 0, label, {
      fontSize: '15px', fontFamily: 'Arial, sans-serif', color: '#cccccc', letterSpacing: 2
    }).setOrigin(0.5);
    c.add([box, txt]);
    c.setInteractive(new Phaser.Geom.Rectangle(-w / 2, -h / 2, w, h), Phaser.Geom.Rectangle.Contains);
    c.on('pointerover', () => { this.tweens.add({ targets: c, scaleX: 1.04, scaleY: 1.04, duration: 100 }); });
    c.on('pointerout', () => { this.tweens.add({ targets: c, scaleX: 1, scaleY: 1, duration: 100 }); });
    c.on('pointerdown', () => { this.tweens.add({ targets: c, scaleX: 0.94, scaleY: 0.94, duration: 80, yoyo: true }); });
    return c;
  }

  _drawStarBg() {
    this._menuThemeRenderer = new ThemeRenderer(this);
    this._menuThemeRenderer.apply(currentThemeKey);
  }

  _drawFloatingBlocks() {
    const texColors = Object.values(TEXTURE_COLORS);
    const rng = new Phaser.Math.RandomDataGenerator(['menu_blocks_v2']);
    // Only 4 blocks, larger, slow drift — premium feel
    const slots = [
      { x: 48, startY: -60, size: 48, delay: 0 },
      { x: GAME_W - 55, startY: -120, size: 40, delay: 2500 },
      { x: 80, startY: GAME_H * 0.6, size: 36, delay: 1200 },
      { x: GAME_W - 70, startY: GAME_H * 0.45, size: 44, delay: 3800 },
    ];
    slots.forEach((slot, i) => {
      const colorObj = texColors[(i * 3) % texColors.length];
      const texKey = getBlockTextureKey(colorObj, currentBlockTheme);
      if (this.textures.exists(texKey)) {
        const img = this.add.image(slot.x, slot.startY, texKey)
          .setDepth(2).setAlpha(0.18).setDisplaySize(slot.size, slot.size);
        this.tweens.add({
          targets: img, y: GAME_H + 80, angle: 22,
          duration: rng.between(14000, 22000), ease: 'Linear', repeat: -1,
          delay: slot.delay,
          onRepeat: () => { img.y = -80; }
        });
      }
    });
  }
}

// ─── PauseScene ───────────────────────────────────────────────────────────────
class PauseScene extends Phaser.Scene {
  constructor() { super({ key: 'PauseScene' }); }

  create() {
    // Dark overlay
    this.add.rectangle(GAME_W / 2, GAME_H / 2, GAME_W, GAME_H, 0x000000, 0.72).setDepth(0);

    const cx = GAME_W / 2;
    const panelW = 280, panelH = 360;
    const panelY = GAME_H / 2;

    // Panel
    const panel = this.add.graphics().setDepth(1);
    panel.fillStyle(0x0d1433, 0.97);
    panel.fillRoundedRect(cx - panelW / 2, panelY - panelH / 2, panelW, panelH, 20);
    panel.lineStyle(1, 0x334477, 1);
    panel.strokeRoundedRect(cx - panelW / 2, panelY - panelH / 2, panelW, panelH, 20);

    this.add.text(cx, panelY - 130, 'PAUSADO', {
      fontSize: '28px', fontFamily: "'Arial Black', Arial, sans-serif",
      color: '#ffffff', fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(2);

    const buttons = [
      { label: 'CONTINUAR', color: '#ffd700', fg: '#000000', action: () => this._resume() },
      { label: 'REINICIAR', color: '#223366', fg: '#ffffff', action: () => this._restart() },
      { label: 'TEMAS', color: '#223366', fg: '#ffffff', action: () => this._openSettings() },
      { label: 'MENU', color: '#223366', fg: '#ffffff', action: () => this._goMenu() },
    ];

    buttons.forEach((b, i) => {
      const btn = this._makeBtn(cx, panelY - 60 + i * 64, b.label, b.color, b.fg);
      btn.on('pointerdown', b.action);
    });
  }

  _makeBtn(x, y, label, bg, fg) {
    const w = 220, h = 48;
    const container = this.add.container(x, y).setDepth(2);
    const box = this.add.graphics();
    const col = Phaser.Display.Color.HexStringToColor(bg).color;
    if (bg === '#ffd700') {
      box.fillGradientStyle(0xffd700, 0xff8c00, 0xffd700, 0xff8c00, 1);
    } else {
      box.fillStyle(col, 1);
    }
    box.fillRoundedRect(-w / 2, -h / 2, w, h, 24);
    const txt = this.add.text(0, 0, label, {
      fontSize: '16px', fontFamily: "'Arial Black', Arial, sans-serif",
      fontStyle: 'bold', color: fg
    }).setOrigin(0.5);
    container.add([box, txt]);
    container.setInteractive(new Phaser.Geom.Rectangle(-w / 2, -h / 2, w, h), Phaser.Geom.Rectangle.Contains);
    container.on('pointerover', () => this.tweens.add({ targets: container, scaleX: 1.04, scaleY: 1.04, duration: 80 }));
    container.on('pointerout', () => this.tweens.add({ targets: container, scaleX: 1, scaleY: 1, duration: 80 }));
    return container;
  }

  _resume() {
    this.scene.stop('PauseScene');
    this.scene.resume('GameScene');
  }

  _restart() {
    this.scene.stop('PauseScene');
    this.scene.stop('GameScene');
    this.scene.start('GameScene');
  }

  _openSettings() {
    this.scene.stop('PauseScene');
    this.scene.pause('GameScene');
    const p = document.getElementById('score-panel');
    if (p) p.style.display = 'none';
    this.scene.launch('SettingsScene', { from: 'PauseScene' });
  }

  _goMenu() {
    this.scene.stop('PauseScene');
    this.scene.stop('GameScene');
    this.scene.start('MenuScene');
  }
}

// ─── GameOverScene ────────────────────────────────────────────────────────────
class GameOverScene extends Phaser.Scene {
  constructor() { super({ key: 'GameOverScene' }); }

  init(data) {
    this.finalScore = data.score || 0;
    this.finalRecord = data.record || 0;
  }

  create() {
    const isNewRecord = this.finalScore > 0 && this.finalScore >= this.finalRecord;

    // Dark overlay
    this.add.rectangle(GAME_W / 2, GAME_H / 2, GAME_W, GAME_H, 0x000000, 0.78).setDepth(0);

    const cx = GAME_W / 2;
    const panelW = 300, panelH = 420;
    const panelY = GAME_H / 2;

    // Panel glass
    const panel = this.add.graphics().setDepth(1);
    panel.fillStyle(0x0d1433, 0.97);
    panel.fillRoundedRect(cx - panelW / 2, panelY - panelH / 2, panelW, panelH, 24);
    panel.lineStyle(2, isNewRecord ? 0xffd700 : 0x334477, 1);
    panel.strokeRoundedRect(cx - panelW / 2, panelY - panelH / 2, panelW, panelH, 24);

    // Title
    const titleText = isNewRecord ? '¡NUEVO RECORD!' : 'GAME OVER';
    const titleColor = isNewRecord ? '#ffd700' : '#ff4444';
    const title = this.add.text(cx, panelY - 160, titleText, {
      fontSize: isNewRecord ? '26px' : '32px',
      fontFamily: "'Arial Black', Arial, sans-serif",
      fontStyle: 'bold',
      color: titleColor,
      shadow: isNewRecord ? { color: '#ffd700', blur: 20, fill: true } : {}
    }).setOrigin(0.5).setDepth(2);

    if (isNewRecord) {
      this.tweens.add({ targets: title, scaleX: 1.08, scaleY: 1.08, duration: 500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      this._spawnConfetti();
    }

    // Score
    this.add.text(cx, panelY - 90, `${this.finalScore}`, {
      fontSize: '64px', fontFamily: "'Arial Black', Arial, sans-serif",
      fontStyle: 'bold', color: '#ffffff',
      shadow: { color: '#00d4ff', blur: 20, fill: true }
    }).setOrigin(0.5).setDepth(2);

    this.add.text(cx, panelY - 100, 'SCORE', {
      fontSize: '11px', fontFamily: 'Arial, sans-serif',
      color: 'rgba(255,255,255,0.5)', letterSpacing: 3
    }).setOrigin(0.5, 1).setDepth(2);

    // Best
    const bestColor = isNewRecord ? '#ffd700' : '#ffd700';
    this.add.text(cx, panelY + 10, `MEJOR: ${this.finalRecord}`, {
      fontSize: '20px', fontFamily: "'Arial Black', Arial, sans-serif",
      color: bestColor
    }).setOrigin(0.5).setDepth(2);

    // Newly unlocked themes
    const newUnlocks = this._checkNewUnlocks();
    if (newUnlocks.length > 0) {
      this.add.text(cx, panelY + 50, `Tema desbloqueado: ${newUnlocks[0].emoji} ${newUnlocks[0].name}`, {
        fontSize: '14px', fontFamily: 'Arial, sans-serif',
        color: '#55cc00'
      }).setOrigin(0.5).setDepth(2);
    }

    // Buttons
    const btnY = panelY + (newUnlocks.length > 0 ? 110 : 100);

    // Rewarded: "Continuar" — solo si el rewarded está listo
    if (AdsManager.isRewardedReady()) {
      const continueBtn = this._makeBtn(cx, btnY - 70, '▶ VER ANUNCIO Y CONTINUAR', '#22aa66', '#ffffff');
      continueBtn.on('pointerdown', () => {
        AdsManager.showRewarded(() => {
          // Reward entregado: restaurar juego desde el mismo estado
          this.scene.stop('GameOverScene');
          this.scene.resume('GameScene');
          const gs = this.scene.manager.getScene('GameScene');
          if (gs) { gs.isAnimatingClear = false; }
        });
      });
    }

    const playAgainBtn = this._makeBtn(cx, btnY, 'JUGAR DE NUEVO', '#ffd700', '#000000');
    playAgainBtn.on('pointerdown', () => {
      this.scene.stop('GameOverScene');
      this.scene.stop('GameScene');
      this.scene.start('GameScene');
    });

    const menuBtn = this._makeBtn(cx, btnY + 64, 'MENU', '#223366', '#ffffff');
    menuBtn.on('pointerdown', () => {
      this.scene.stop('GameOverScene');
      this.scene.stop('GameScene');
      this.scene.start('MenuScene');
    });

    const themesBtn = this._makeBtn(cx, btnY + 128, 'TEMAS', '#223366', '#ffffff');
    themesBtn.on('pointerdown', () => {
      this.scene.stop('GameOverScene');
      this.scene.launch('SettingsScene', { from: 'GameOverScene' });
    });
  }

  _checkNewUnlocks() {
    const score = this.finalScore;
    const prev = loadUnlockedBlockThemes();
    const newly = [];
    BLOCK_THEME_KEYS.forEach(k => {
      if (!prev.includes(k) && score >= BLOCK_THEMES[k].unlockScore) {
        newly.push(BLOCK_THEMES[k]);
        prev.push(k);
      }
    });
    if (newly.length > 0) saveUnlockedBlockThemes(prev);
    return newly;
  }

  _spawnConfetti() {
    const colors = [0xffd700, 0xff4466, 0x44aaff, 0x44ff88, 0xff8844];
    for (let i = 0; i < 30; i++) {
      const x = Phaser.Math.Between(40, GAME_W - 40);
      const gfx = this.add.graphics().setDepth(3).setAlpha(0.85);
      const col = colors[i % colors.length];
      gfx.fillStyle(col, 1);
      gfx.fillRect(0, 0, Phaser.Math.Between(6, 12), Phaser.Math.Between(6, 12));
      gfx.setPosition(x, -20);
      this.tweens.add({
        targets: gfx,
        y: GAME_H + 40,
        x: x + Phaser.Math.Between(-60, 60),
        angle: Phaser.Math.Between(-360, 360),
        duration: Phaser.Math.Between(1200, 2800),
        delay: Phaser.Math.Between(0, 800),
        ease: 'Linear',
        onComplete: (t, tgts) => tgts[0].destroy()
      });
    }
  }

  _makeBtn(x, y, label, bg, fg) {
    const w = 240, h = 50;
    const container = this.add.container(x, y).setDepth(2);
    const box = this.add.graphics();
    if (bg === '#ffd700') {
      box.fillGradientStyle(0xffd700, 0xff8c00, 0xffd700, 0xff8c00, 1);
    } else {
      box.fillStyle(Phaser.Display.Color.HexStringToColor(bg).color, 1);
    }
    box.fillRoundedRect(-w / 2, -h / 2, w, h, 26);
    const txt = this.add.text(0, 0, label, {
      fontSize: '16px', fontFamily: "'Arial Black', Arial, sans-serif",
      fontStyle: 'bold', color: fg
    }).setOrigin(0.5);
    container.add([box, txt]);
    container.setInteractive(new Phaser.Geom.Rectangle(-w / 2, -h / 2, w, h), Phaser.Geom.Rectangle.Contains);
    container.on('pointerover', () => this.tweens.add({ targets: container, scaleX: 1.04, scaleY: 1.04, duration: 80 }));
    container.on('pointerout', () => this.tweens.add({ targets: container, scaleX: 1, scaleY: 1, duration: 80 }));
    container.on('pointerdown', () => this.tweens.add({ targets: container, scaleX: 0.95, scaleY: 0.95, duration: 80, yoyo: true }));
    return container;
  }
}

// ─── SettingsScene ────────────────────────────────────────────────────────────
class SettingsScene extends Phaser.Scene {
  constructor() { super({ key: 'SettingsScene' }); }

  init(data) {
    this.fromScene = data.from || 'MenuScene';
  }

  create() {
    this._drawStarBg();
    const cx = GAME_W / 2;

    // Back button
    const backBtn = this.add.text(20, 20, '← VOLVER', {
      fontSize: '16px', fontFamily: "'Arial Black', Arial, sans-serif",
      color: '#aaaaaa', padding: { x: 8, y: 6 }
    }).setDepth(10).setInteractive({ useHandCursor: true });
    backBtn.on('pointerdown', () => this._goBack());
    backBtn.on('pointerover', () => backBtn.setColor('#ffffff'));
    backBtn.on('pointerout', () => backBtn.setColor('#aaaaaa'));

    // Title
    this.add.text(cx, 60, 'PERSONALIZACION', {
      fontSize: '20px', fontFamily: "'Arial Black', Arial, sans-serif",
      color: '#ffffff', fontStyle: 'bold', letterSpacing: 2
    }).setOrigin(0.5).setDepth(10);

    this._drawDivider(100, 'TEMA DE FONDO');
    this._drawBgThemes(130);

    this._drawDivider(320, 'TEMA DE BLOQUES');
    this._drawBlockThemes(350);

    this.unlocked = loadUnlockedBlockThemes();
  }

  _drawStarBg() {
    this._settingsThemeRenderer = new ThemeRenderer(this);
    this._settingsThemeRenderer.apply(currentThemeKey);
  }

  _drawDivider(y, label) {
    const gfx = this.add.graphics().setDepth(5);
    gfx.lineStyle(1, 0x334477, 0.8);
    gfx.lineBetween(20, y, GAME_W - 20, y);
    this.add.text(GAME_W / 2, y - 2, `  ${label}  `, {
      fontSize: '12px', fontFamily: 'Arial, sans-serif',
      color: '#aaaaaa', letterSpacing: 2,
      backgroundColor: '#' + (BG_THEMES[currentThemeKey] || BG_THEMES.deepspace).bg.toString(16).padStart(6, '0')
    }).setOrigin(0.5, 0.5).setDepth(6);
  }

  _drawBgThemes(startY) {
    const bgThemes = BG_THEME_KEYS.map(k => BG_THEMES[k]);
    const score = parseInt(localStorage.getItem('blockblast_record') || '0');
    const unlockedBg = loadUnlockedBgThemes();
    const cardW = 64, cardH = 72, gap = 8;
    const cols = 5;
    const totalW = cols * cardW + (cols - 1) * gap;
    const startX = (GAME_W - totalW) / 2;

    bgThemes.forEach((t, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = startX + col * (cardW + gap) + cardW / 2;
      const y = startY + row * (cardH + gap) + cardH / 2;
      const isActive = currentThemeKey === t.key;
      const isUnlocked = !t.unlockScore || unlockedBg.includes(t.key);

      // Preview card with theme mini-render
      if (isUnlocked) {
        ThemeRenderer.drawPreview(this, x - cardW / 2 + 2, y - cardH / 2 + 2, cardW - 4, cardH - 20, t.key);
      }

      const card = this.add.graphics().setDepth(5);
      if (isUnlocked) {
        card.lineStyle(isActive ? 2 : 1, isActive ? 0xffd700 : 0x334477, isActive ? 1 : 0.5);
      } else {
        card.fillStyle(0x1a2050, 0.3);
        card.fillRoundedRect(x - cardW / 2, y - cardH / 2, cardW, cardH, 8);
        card.lineStyle(1, 0x334477, 0.3);
      }
      card.strokeRoundedRect(x - cardW / 2, y - cardH / 2, cardW, cardH, 8);

      if (isUnlocked) {
        this.add.text(x, y + cardH / 2 - 10, t.name.split(' ').pop(), {
          fontSize: '9px', fontFamily: 'Arial, sans-serif', color: isActive ? '#ffd700' : '#aaaaaa'
        }).setOrigin(0.5).setDepth(6);
      } else {
        // Locked overlay
        const lockOverlay = this.add.graphics().setDepth(6);
        lockOverlay.fillStyle(0x000000, 0.5);
        lockOverlay.fillRoundedRect(x - cardW / 2, y - cardH / 2, cardW, cardH, 8);
        this.add.text(x, y - 8, '🔒', { fontSize: '14px' }).setOrigin(0.5).setDepth(7);
        this.add.text(x, y + 10, `${t.unlockScore}`, {
          fontSize: '10px', fontFamily: 'Arial, sans-serif', color: '#666666'
        }).setOrigin(0.5).setDepth(7);
        this.add.text(x, y + cardH / 2 - 10, t.name.split(' ').pop(), {
          fontSize: '9px', fontFamily: 'Arial, sans-serif', color: '#555555'
        }).setOrigin(0.5).setDepth(7);
      }

      if (isUnlocked && !isActive) {
        const hit = this.add.rectangle(x, y, cardW, cardH, 0x000000, 0).setDepth(8).setInteractive({ useHandCursor: true });
        hit.on('pointerdown', () => {
          currentThemeKey = t.key;
          localStorage.setItem('blockblast_theme', t.key);
          const gs = this.scene.manager.getScene('GameScene');
          if (gs && gs.themeRenderer) { gs.applyTheme(); }
          this.scene.restart();
        });
      }
    });
  }

  _drawBlockThemes(startY) {
    const unlocked = loadUnlockedBlockThemes();
    const score = parseInt(localStorage.getItem('blockblast_record') || '0');
    const cardW = 68, cardH = 80, cols = 4, gap = 10;
    const totalW = cols * cardW + (cols - 1) * gap;
    const startX = (GAME_W - totalW) / 2;
    // Pick a representative color for preview (index 2 = warm orange-ish)
    const previewColors = Object.values(TEXTURE_COLORS);

    BLOCK_THEME_KEYS.forEach((key, i) => {
      const t = BLOCK_THEMES[key];
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = startX + col * (cardW + gap) + cardW / 2;
      const y = startY + row * (cardH + gap) + cardH / 2;
      const isUnlocked = unlocked.includes(key);
      const isActive = currentBlockTheme === key;

      // Card background
      const card = this.add.graphics().setDepth(5);
      card.fillStyle(isUnlocked ? (isActive ? 0x1e2760 : 0x161d45) : 0x0e1128, 1);
      card.fillRoundedRect(x - cardW / 2, y - cardH / 2, cardW, cardH, 10);
      if (isActive) {
        card.lineStyle(2, 0xffc837, 1);
      } else {
        card.lineStyle(1, 0x2a3470, isUnlocked ? 0.8 : 0.3);
      }
      card.strokeRoundedRect(x - cardW / 2, y - cardH / 2, cardW, cardH, 10);

      // Texture preview (actual block render)
      const previewSize = 36;
      const colorObj = previewColors[i % previewColors.length];
      const texKey = getBlockTextureKey(colorObj, key);
      if (isUnlocked && this.textures.exists(texKey)) {
        const preview = this.add.image(x, y - 12, texKey)
          .setDisplaySize(previewSize, previewSize).setDepth(6);
        if (isActive) {
          this.tweens.add({ targets: preview, scaleX: previewSize / preview.width * 1.06,
            scaleY: previewSize / preview.height * 1.06, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
        }
      } else if (!isUnlocked) {
        // Lock icon (text-based, small)
        this.add.text(x, y - 12, '🔒', { fontSize: '16px' }).setOrigin(0.5).setDepth(6).setAlpha(0.6);
        // Score progress bar
        const barW = cardW - 16, barH = 3;
        const barBg = this.add.graphics().setDepth(6);
        barBg.fillStyle(0x2a3470, 1);
        barBg.fillRoundedRect(x - barW / 2, y + 4, barW, barH, 1);
        const pct = Math.min(score / t.unlockScore, 1);
        if (pct > 0) {
          const barFill = this.add.graphics().setDepth(7);
          barFill.fillStyle(0xffc837, 1);
          barFill.fillRoundedRect(x - barW / 2, y + 4, barW * pct, barH, 1);
        }
        this.add.text(x, y + 14, `${score}/${t.unlockScore}`, {
          fontSize: '8px', fontFamily: 'Arial, sans-serif', color: '#556688'
        }).setOrigin(0.5).setDepth(7);
      }

      // Name label
      this.add.text(x, y + cardH / 2 - 13, t.name, {
        fontSize: '9px', fontFamily: 'Arial, sans-serif',
        color: isActive ? '#ffc837' : (isUnlocked ? '#aaaaaa' : '#445566')
      }).setOrigin(0.5).setDepth(6);

      // Active checkmark
      if (isActive) {
        this.add.text(x + cardW / 2 - 8, y - cardH / 2 + 8, '✓', {
          fontSize: '10px', color: '#ffc837'
        }).setOrigin(0.5).setDepth(7);
      }

      // Dark overlay for locked
      if (!isUnlocked) {
        const lockOverlay = this.add.graphics().setDepth(5);
        lockOverlay.fillStyle(0x000000, 0.35);
        lockOverlay.fillRoundedRect(x - cardW / 2, y - cardH / 2, cardW, cardH, 10);
      }

      if (isUnlocked && !isActive) {
        const hit = this.add.rectangle(x, y, cardW, cardH, 0x000000, 0).setDepth(8).setInteractive({ useHandCursor: true });
        hit.on('pointerdown', () => {
          currentBlockTheme = key;
          localStorage.setItem('blockblast_block_theme', key);
          const gs = this.scene.manager.getScene('GameScene');
          if (gs && gs.sys.isActive()) { gs.renderGrid(); gs.renderTray(); }
          this.scene.restart();
        });
        hit.on('pointerover', () => { card.setAlpha(0.75); });
        hit.on('pointerout', () => { card.setAlpha(1); });
      }
    });
  }

  _goBack() {
    if (this.fromScene === 'PauseScene') {
      this.scene.stop('SettingsScene');
      this.scene.launch('PauseScene');
      this.scene.resume('GameScene');
      const p = document.getElementById('score-panel');
      if (p) p.style.display = 'flex';
    } else if (this.fromScene === 'GameOverScene') {
      this.scene.stop('SettingsScene');
      this.scene.launch('GameOverScene');
    } else {
      this.scene.start('MenuScene');
    }
  }
}

// ─── Phaser Config ────────────────────────────────────────────────────────────
const config = {
  type: Phaser.AUTO,
  width: GAME_W,
  height: GAME_H,
  backgroundColor: BG_COLOR,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    parent: 'game-container'
  },
  scene: [MenuScene, GameScene, PauseScene, GameOverScene, SettingsScene],
  render: {
    antialias: true,
    pixelArt: false,
    roundPixels: false
  }
};

// ─── Boot ─────────────────────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  window.__game = new Phaser.Game(config);
});
