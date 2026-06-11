'use strict';

// ─── Dimensiones (usadas también por themes.js) ───────────────────────────────
const GAME_W = 390;
const GAME_H = 844;

// ─── Storage keys ─────────────────────────────────────────────────────────────
const SK = {
  BEST:   'sudoku_best_times',
  SOLVED: 'sudoku_total_solved',
  THEME:  'sudoku_theme',
};

// ─── Idioma ───────────────────────────────────────────────────────────────────
const LANG = (navigator.language || 'en').toLowerCase().startsWith('es') ? 'es' : 'en';
const T = {
  es: {
    subtitle:    'Puzzle de números',
    solvedStr:   n => `${n} puzzle${n===1?'':'s'} resuelto${n===1?'':'s'}`,
    diffEasy:    'FÁCIL', diffMed: 'MEDIO', diffHard: 'DIFÍCIL',
    choiceDiff:  'ELEGIR DIFICULTAD',
    themes:      'TEMAS',
    nextTheme:   k => `Siguiente tema: ${k}`,
    backMenu:    '← Menú',
    mistakes:    n => `❌ ${n} error${n===1?'':'es'}`,
    bestTime:    t => `⭐ Récord: ${t}`,
    pencil:      '✏ Lápiz',
    hint:        n => `💡 Pista (${n})`,
    double:      '¡DOBLE!', triple: '¡TRIPLE!',
    completed:   '¡COMPLETADO!', time: 'Tiempo',
    newRecord:   '⭐ ¡NUEVO RÉCORD!',
    errLabel:    'Errores',    scoreLabel: 'Puntuación',
    totalSolved: n => `Total resueltos: ${n}`,
    again:       'Repetir',   menu: 'Menú',
    rewarded:    '▶ Ver anuncio: +500 pts bonus', bonusPts: '+500 pts!',
    themeNames:  { underwater:'Underwater', sunset:'Sunset City', neon:'Neon Arcade', forest:'Enchanted Forest', sakura:'Sakura', storm:'Storm', desert:'Desert', frozen:'Frozen' },
  },
  en: {
    subtitle:    'Number Puzzle',
    solvedStr:   n => `${n} puzzle${n===1?'':'s'} solved`,
    diffEasy:    'EASY', diffMed: 'MEDIUM', diffHard: 'HARD',
    choiceDiff:  'CHOOSE DIFFICULTY',
    themes:      'THEMES',
    nextTheme:   k => `Next theme: ${k}`,
    backMenu:    '← Menu',
    mistakes:    n => `❌ ${n} mistake${n===1?'':'s'}`,
    bestTime:    t => `⭐ Best: ${t}`,
    pencil:      '✏ Notes',
    hint:        n => `💡 Hint (${n})`,
    double:      'DOUBLE!', triple: 'TRIPLE!',
    completed:   'COMPLETED!', time: 'Time',
    newRecord:   '⭐ NEW RECORD!',
    errLabel:    'Mistakes', scoreLabel: 'Score',
    totalSolved: n => `Total solved: ${n}`,
    again:       'Play Again', menu: 'Menu',
    rewarded:    '▶ Watch ad: +500 pts bonus', bonusPts: '+500 pts!',
    themeNames:  { underwater:'Underwater', sunset:'Sunset City', neon:'Neon Arcade', forest:'Enchanted Forest', sakura:'Sakura', storm:'Storm', desert:'Desert', frozen:'Frozen' },
  },
};
const DIFFS = [
  { k: 'easy',   l: T[LANG].diffEasy, c: '#4caf50' },
  { k: 'medium', l: T[LANG].diffMed,  c: '#ff9800' },
  { k: 'hard',   l: T[LANG].diffHard, c: '#f44336' },
];

// ─── Requisitos de desbloqueo de temas ────────────────────────────────────────
const THEME_REQ = {
  deepspace:0, underwater:3, sunset:8, neon:15,
  forest:25, sakura:40, storm:60, desert:80, frozen:100
};

// ─── Store helpers ────────────────────────────────────────────────────────────
const Store = {
  getSolved() { return +localStorage.getItem(SK.SOLVED) || 0; },
  addSolved()  { const n = this.getSolved() + 1; localStorage.setItem(SK.SOLVED, n); return n; },
  getBest(d)   { const o = JSON.parse(localStorage.getItem(SK.BEST) || '{}'); return o[d] ?? null; },
  saveBest(d, s) {
    const o = JSON.parse(localStorage.getItem(SK.BEST) || '{}');
    if (o[d] === undefined || s < o[d]) { o[d] = s; localStorage.setItem(SK.BEST, JSON.stringify(o)); return true; }
    return false;
  },
  getTheme() { return localStorage.getItem(SK.THEME) || 'deepspace'; },
  setTheme(k) { localStorage.setItem(SK.THEME, k); },
};

// ─── Generador de Sudoku ──────────────────────────────────────────────────────
const SudokuGen = (() => {
  const shuf = a => {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.random() * (i + 1) | 0;
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  const ok = (b, r, c, n) => {
    for (let i = 0; i < 9; i++) if (b[r][i] === n || b[i][c] === n) return false;
    const br = r - r % 3, bc = c - c % 3;
    for (let dr = 0; dr < 3; dr++)
      for (let dc = 0; dc < 3; dc++)
        if (b[br + dr][bc + dc] === n) return false;
    return true;
  };

  const fill = b => {
    for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) {
      if (b[r][c]) continue;
      for (const n of shuf([1, 2, 3, 4, 5, 6, 7, 8, 9])) {
        if (ok(b, r, c, n)) {
          b[r][c] = n;
          if (fill(b)) return true;
          b[r][c] = 0;
        }
      }
      return false;
    }
    return true;
  };

  const generate = diff => {
    const b = Array.from({ length: 9 }, () => Array(9).fill(0));
    fill(b);
    const sol = b.map(r => [...r]);
    const keep = { easy: 40, medium: 32, hard: 26 }[diff] || 32;
    shuf([...Array(81).keys()]).slice(0, 81 - keep).forEach(idx => {
      b[idx / 9 | 0][idx % 9] = 0;
    });
    return { puzzle: b, solution: sol };
  };

  return { generate };
})();

// ─── Colores ─────────────────────────────────────────────────────────────────
const COL = {
  cell:      0x111827,
  selected:  0x2a3d5e,
  highlight: 0x161f30,
  sameNum:   0x1d3040,
  boxLine:   0x5566aa,
  cellLine:  0x222840,
  btnBg:     0x1a2540,
  btnBorder: 0x334466,
};

// ─── Layout ──────────────────────────────────────────────────────────────────
const CS = 40;          // cell size
const GX = 15;          // grid origin X
const GY = 96;          // grid origin Y
const GS = CS * 9;      // grid size = 360

// ════════════════════════════════════════════════════════════════════════════
// MENU SCENE
// ════════════════════════════════════════════════════════════════════════════
class MenuScene extends Phaser.Scene {
  constructor() { super('MenuScene'); }

  create() {
    AudioManager.init();
    AudioManager.startMusic();

    this._tr = new ThemeRenderer(this);
    this._tr.apply(Store.getTheme());

    const cx = GAME_W / 2;

    this.add.text(cx, 98, 'SUDOKU', {
      fontFamily: 'Arial Black, Arial', fontSize: '58px',
      color: '#ffd54f', stroke: '#000000', strokeThickness: 6,
    }).setOrigin(0.5);

    this.add.text(cx, 158, T[LANG].subtitle, {
      fontFamily: 'Arial', fontSize: '18px', color: '#6677aa',
    }).setOrigin(0.5);

    const solved = Store.getSolved();
    this.add.text(cx, 190, T[LANG].solvedStr(solved), {
      fontFamily: 'Arial', fontSize: '14px', color: '#8899cc',
    }).setOrigin(0.5);

    // Mejores tiempos
    DIFFS.forEach(({ k, l, c }, i) => {
      const x = 80 + i * 115;
      this.add.text(x, 224, l, { fontFamily: 'Arial Black', fontSize: '12px', color: c }).setOrigin(0.5);
      const best = Store.getBest(k);
      this.add.text(x, 244, best ? this._fmt(best) : '--:--', {
        fontFamily: 'Arial', fontSize: '13px', color: '#aabbdd',
      }).setOrigin(0.5);
    });

    const sep = this.add.graphics();
    sep.lineStyle(1, 0x334466, 0.4).lineBetween(30, 268, 360, 268);

    this.add.text(cx, 290, T[LANG].choiceDiff, {
      fontFamily: 'Arial Black', fontSize: '11px', color: '#6677aa', letterSpacing: 2,
    }).setOrigin(0.5);

    DIFFS.forEach(({ k, l, c }, i) => this._diffBtn(80 + i * 115, 346, 100, 56, l, c, k));

    this._themeBar(cx, 436);

    // Progreso de desbloqueo
    const nxt = this._nextUnlock(solved);
    if (nxt) {
      this.add.text(cx, 485, T[LANG].nextTheme(nxt.label), {
        fontFamily: 'Arial', fontSize: '12px', color: '#556688',
      }).setOrigin(0.5);
      const bw = 260, bx = (GAME_W - bw) / 2, by = 500;
      const pg = this.add.graphics();
      pg.fillStyle(0x1a2540).fillRoundedRect(bx, by, bw, 10, 5);
      pg.fillStyle(0xffd54f).fillRoundedRect(bx, by, bw * Math.min(solved / nxt.req, 1), 10, 5);
      this.add.text(cx, 518, `${solved} / ${nxt.req}`, {
        fontFamily: 'Arial', fontSize: '11px', color: '#445566',
      }).setOrigin(0.5);
    }

    // Mute
    this._muteTxt = this.add.text(GAME_W - 16, 16, AudioManager.isMuted() ? '🔇' : '🔊', {
      fontSize: '22px',
    }).setOrigin(1, 0).setInteractive({ useHandCursor: true });
    this._muteTxt.on('pointerdown', () => {
      AudioManager.toggleMute();
      this._muteTxt.setText(AudioManager.isMuted() ? '🔇' : '🔊');
    });

    AdsManager.showBanner();
  }

  update(t, d) { if (this._tr) this._tr.update(t, d); }

  _fmt(s) {
    return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  }

  _diffBtn(x, y, w, h, label, color, diff) {
    const col = Phaser.Display.Color.HexStringToColor(color).color;
    const g = this.add.graphics();
    const draw = hov => {
      g.clear();
      g.fillStyle(hov ? 0x2a3a5a : COL.btnBg).fillRoundedRect(x - w / 2, y - h / 2, w, h, 10);
      g.lineStyle(2, col).strokeRoundedRect(x - w / 2, y - h / 2, w, h, 10);
    };
    draw(false);
    this.add.text(x, y, label, { fontFamily: 'Arial Black', fontSize: '15px', color }).setOrigin(0.5).setDepth(5);
    const zone = this.add.zone(x, y, w, h).setInteractive({ useHandCursor: true });
    zone.on('pointerover', () => draw(true));
    zone.on('pointerout',  () => draw(false));
    zone.on('pointerdown', () => {
      AudioManager.playButton();
      AdsManager.hideBanner();
      this.scene.start('GameScene', { difficulty: diff });
    });
  }

  _themeBar(cx, y) {
    const solved = Store.getSolved(), active = Store.getTheme();
    const keys = Object.keys(THEME_REQ);
    const bs = 36, gap = 6;
    const tw = keys.length * (bs + gap) - gap;
    const sx = (GAME_W - tw) / 2;

    this.add.text(cx, y - 20, T[LANG].themes, {
      fontFamily: 'Arial Black', fontSize: '11px', color: '#556688', letterSpacing: 3,
    }).setOrigin(0.5);

    keys.forEach((k, i) => {
      const tx = sx + i * (bs + gap) + bs / 2;
      const unlocked = solved >= THEME_REQ[k];
      const isActive = k === active;
      const theme = BG_THEMES[k];
      const g = this.add.graphics();
      g.fillStyle(theme ? theme.bg : 0x050510).fillCircle(tx, y, bs / 2);
      if (isActive) { g.lineStyle(3, 0xffd54f); g.strokeCircle(tx, y, bs / 2 + 2); }
      else if (unlocked) { g.lineStyle(1, 0x334466, 0.5); g.strokeCircle(tx, y, bs / 2); }
      if (!unlocked) {
        g.fillStyle(0x000000, 0.65).fillCircle(tx, y, bs / 2);
        this.add.text(tx, y, '🔒', { fontSize: '13px' }).setOrigin(0.5);
      }
      if (unlocked) {
        this.add.zone(tx, y, bs, bs).setInteractive({ useHandCursor: true }).on('pointerdown', () => {
          AudioManager.playButton();
          Store.setTheme(k);
          this.scene.restart();
        });
      }
    });
  }

  _nextUnlock(solved) {
    const names = T[LANG].themeNames;
    for (const [k, req] of Object.entries(THEME_REQ)) {
      if (solved < req) return { key: k, req, label: names[k] || k };
    }
    return null;
  }
}

// ════════════════════════════════════════════════════════════════════════════
// GAME SCENE
// ════════════════════════════════════════════════════════════════════════════
class GameScene extends Phaser.Scene {
  constructor() { super('GameScene'); }
  init(d) { this.difficulty = d.difficulty || 'medium'; }

  create() {
    this._tr = new ThemeRenderer(this);
    this._tr.apply(Store.getTheme());

    const { puzzle, solution } = SudokuGen.generate(this.difficulty);
    this.puzzle   = puzzle;
    this.solution = solution;
    this.given    = puzzle.map(row => row.map(v => v !== 0));
    this.notes    = Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => new Set()));

    this.sel      = null;
    this.pencil   = false;
    this.mistakes = 0;
    this.hintsLeft= 3;
    this.elapsed  = 0;
    this.done     = false;
    this.vfx      = new VFX(this);

    this._buildHeader();
    this._buildGrid();
    this._buildPad();
    this._renderGrid();

    this._timerEv = this.time.addEvent({
      delay: 1000, callback: () => this._tick(), loop: true,
    });

    // Interstitial cada 3 partidas
    const gc = (+localStorage.getItem('sudoku_gc') || 0) + 1;
    localStorage.setItem('sudoku_gc', gc);
    if (gc % 3 === 0) AdsManager.showInterstitial();

    AudioManager.startMusic();
  }

  update(t, d) { if (this._tr) this._tr.update(t, d); }

  // ── Header ─────────────────────────────────────────────────────────────────
  _buildHeader() {
    const DL = { easy: T[LANG].diffEasy, medium: T[LANG].diffMed, hard: T[LANG].diffHard };
    const DC = { easy: '#4caf50', medium: '#ff9800', hard: '#f44336' };

    const back = this.add.text(16, 20, T[LANG].backMenu, {
      fontFamily: 'Arial', fontSize: '14px', color: '#6677aa',
    }).setInteractive({ useHandCursor: true });
    back.on('pointerdown', () => {
      AudioManager.playButton();
      this._timerEv.remove();
      this.scene.start('MenuScene');
    });

    this.add.text(GAME_W / 2, 16, 'SUDOKU', {
      fontFamily: 'Arial Black', fontSize: '18px', color: '#ffd54f',
    }).setOrigin(0.5, 0);
    this.add.text(GAME_W / 2, 38, DL[this.difficulty], {
      fontFamily: 'Arial Black', fontSize: '12px', color: DC[this.difficulty],
    }).setOrigin(0.5, 0);

    this._timerTxt = this.add.text(16, 56, '⏱ 00:00', {
      fontFamily: 'Arial', fontSize: '14px', color: '#aabbdd',
    });
    this._errTxt = this.add.text(GAME_W - 16, 56, T[LANG].mistakes(0), {
      fontFamily: 'Arial', fontSize: '14px', color: '#aabbdd',
    }).setOrigin(1, 0);

    this._muteTxt = this.add.text(GAME_W - 16, 18, AudioManager.isMuted() ? '🔇' : '🔊', {
      fontSize: '20px',
    }).setOrigin(1, 0).setInteractive({ useHandCursor: true });
    this._muteTxt.on('pointerdown', () => {
      AudioManager.toggleMute();
      this._muteTxt.setText(AudioManager.isMuted() ? '🔇' : '🔊');
    });

    const best = Store.getBest(this.difficulty);
    this.add.text(GAME_W / 2, 76, best ? T[LANG].bestTime(this._fmt(best)) : '', {
      fontFamily: 'Arial', fontSize: '12px', color: '#556688',
    }).setOrigin(0.5, 0);
  }

  _tick() {
    if (!this.done) {
      this.elapsed++;
      this._timerTxt.setText(`⏱ ${this._fmt(this.elapsed)}`);
    }
  }

  _fmt(s) {
    return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  }

  // ── Grid ───────────────────────────────────────────────────────────────────
  _buildGrid() {
    this._gfx = this.add.graphics().setDepth(2);

    this._vt = [];
    this._nt = [];
    for (let r = 0; r < 9; r++) {
      this._vt[r] = [];
      this._nt[r] = [];
      for (let c = 0; c < 9; c++) {
        const cx = GX + c * CS + CS / 2, cy = GY + r * CS + CS / 2;
        this._vt[r][c] = this.add.text(cx, cy, '', {
          fontFamily: 'Arial Black, Arial', fontSize: '22px', color: '#ffffff',
        }).setOrigin(0.5).setDepth(5);
        this._nt[r][c] = this.add.text(GX + c * CS + 2, GY + r * CS + 1, '', {
          fontFamily: 'Arial', fontSize: '8px', color: '#7788aa', lineSpacing: 1,
        }).setDepth(5);
      }
    }

    // Zona de toque para el grid
    this.add.rectangle(GX + GS / 2, GY + GS / 2, GS, GS, 0, 0)
      .setInteractive()
      .setDepth(3)
      .on('pointerdown', ptr => {
        const c = Math.floor((ptr.x - GX) / CS);
        const r = Math.floor((ptr.y - GY) / CS);
        if (r >= 0 && r < 9 && c >= 0 && c < 9) this._selectCell(r, c);
      });
  }

  _renderGrid() {
    const g = this._gfx;
    g.clear();

    // Fondos de celda
    for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) {
      const x = GX + c * CS, y = GY + r * CS;
      let bg = COL.cell;
      if (this.sel) {
        const { r: sr, c: sc } = this.sel;
        const sameBox = Math.floor(r / 3) === Math.floor(sr / 3) &&
                        Math.floor(c / 3) === Math.floor(sc / 3);
        if (r === sr && c === sc) bg = COL.selected;
        else if (r === sr || c === sc || sameBox) bg = COL.highlight;
        const sv = this.puzzle[sr][sc];
        if (sv && this.puzzle[r][c] === sv) bg = COL.sameNum;
        if (r === sr && c === sc) bg = COL.selected; // re-afirmar selección
      }
      g.fillStyle(bg).fillRect(x + 1, y + 1, CS - 2, CS - 2);
    }

    // Líneas delgadas de celda
    g.lineStyle(1, COL.cellLine, 0.5);
    for (let i = 0; i <= 9; i++) {
      g.lineBetween(GX + i * CS, GY, GX + i * CS, GY + GS);
      g.lineBetween(GX, GY + i * CS, GX + GS, GY + i * CS);
    }

    // Líneas gruesas de caja 3×3
    g.lineStyle(3, COL.boxLine, 0.9);
    for (let i = 0; i <= 3; i++) {
      g.lineBetween(GX + i * 3 * CS, GY, GX + i * 3 * CS, GY + GS);
      g.lineBetween(GX, GY + i * 3 * CS, GX + GS, GY + i * 3 * CS);
    }

    // Actualizar textos
    for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) this._cellTxt(r, c);
  }

  _cellTxt(r, c) {
    const v = this.puzzle[r][c];
    const vt = this._vt[r][c], nt = this._nt[r][c];
    if (v) {
      const isErr = !this.given[r][c] && v !== this.solution[r][c];
      vt.setText(String(v))
        .setColor(this.given[r][c] ? '#ffffff' : isErr ? '#ff4466' : '#ffd54f')
        .setVisible(true);
      nt.setVisible(false);
    } else {
      vt.setVisible(false);
      const ns = this.notes[r][c];
      if (ns.size) {
        const rows = [];
        for (let row = 0; row < 3; row++) {
          const parts = [];
          for (let col = 0; col < 3; col++) {
            const n = row * 3 + col + 1;
            parts.push(ns.has(n) ? String(n) : '·');
          }
          rows.push(parts.join(' '));
        }
        nt.setText(rows.join('\n')).setVisible(true);
      } else {
        nt.setVisible(false);
      }
    }
  }

  // ── Selección ──────────────────────────────────────────────────────────────
  _selectCell(r, c) {
    AudioManager.playButton();
    this.sel = { r, c };
    this._renderGrid();
  }

  // ── Teclado numérico ───────────────────────────────────────────────────────
  _buildPad() {
    const py = GY + GS + 14;   // 470
    const bw = 68, bh = 50, gap = 8;
    const totalW = 5 * (bw + gap) - gap;  // 372
    const sx = (GAME_W - totalW) / 2;     // 9

    // Fila 1: 1-5
    [1, 2, 3, 4, 5].forEach((n, i) =>
      this._numBtn(sx + i * (bw + gap), py, bw, bh, String(n), '#ffd54f', () => this._input(n))
    );
    // Fila 2: 6-9 + Borrar
    [6, 7, 8, 9, 0].forEach((n, i) => {
      const label = n === 0 ? '✕' : String(n);
      const color = n === 0 ? '#ff6677' : '#ffd54f';
      this._numBtn(sx + i * (bw + gap), py + bh + gap, bw, bh, label, color, () => n === 0 ? this._erase() : this._input(n));
    });

    // Contadores de dígitos restantes
    this._cntTxt = [];
    for (let n = 1; n <= 9; n++) {
      const idx = n - 1, ri = Math.floor(idx / 5), ci = idx % 5;
      const x = sx + ci * (bw + gap) + bw / 2, y = py + ri * (bh + gap) + bh + 4;
      this._cntTxt[n] = this.add.text(x, y, '9', {
        fontFamily: 'Arial', fontSize: '11px', color: '#556688',
      }).setOrigin(0.5).setDepth(5);
    }
    this._refreshCounts();

    // Fila de controles: Lápiz | Pista
    const cy2 = py + 2 * (bh + gap) + 22;
    const cbw = (totalW - gap) / 2;

    // Lápiz
    this._pcGfx = this.add.graphics().setDepth(4);
    this._pcTxt = this.add.text(sx + cbw / 2, cy2 + bh / 2, T[LANG].pencil, {
      fontFamily: 'Arial', fontSize: '14px', color: '#aabbdd',
    }).setOrigin(0.5).setDepth(5);
    this._pcX = sx; this._pcY = cy2; this._pcW = cbw; this._pcH = bh;
    this._drawPcBtn();
    this.add.zone(sx + cbw / 2, cy2 + bh / 2, cbw, bh).setInteractive().on('pointerdown', () => {
      this.pencil = !this.pencil;
      AudioManager.playButton();
      this._drawPcBtn();
    });

    // Pista
    const hx = sx + cbw + gap;
    this._htGfx = this.add.graphics().setDepth(4);
    this._htTxt = this.add.text(hx + cbw / 2, cy2 + bh / 2, T[LANG].hint(this.hintsLeft), {
      fontFamily: 'Arial', fontSize: '13px', color: '#ffd54f',
    }).setOrigin(0.5).setDepth(5);
    this._htX = hx; this._htY = cy2; this._htW = cbw; this._htH = bh;
    this._drawHtBtn();
    this.add.zone(hx + cbw / 2, cy2 + bh / 2, cbw, bh).setInteractive().on('pointerdown', () => this._hint());
  }

  _numBtn(x, y, w, h, label, color, cb) {
    const col = Phaser.Display.Color.HexStringToColor(color).color;
    const g = this.add.graphics().setDepth(4);
    const draw = hov => {
      g.clear();
      g.fillStyle(hov ? 0x2a3a5a : COL.btnBg).fillRoundedRect(x, y, w, h, 8);
      g.lineStyle(2, hov ? col : COL.btnBorder).strokeRoundedRect(x, y, w, h, 8);
    };
    draw(false);
    this.add.text(x + w / 2, y + h / 2, label, {
      fontFamily: 'Arial Black', fontSize: '20px', color,
    }).setOrigin(0.5).setDepth(5);
    const zone = this.add.zone(x + w / 2, y + h / 2, w, h).setInteractive();
    zone.on('pointerover', () => draw(true));
    zone.on('pointerout',  () => draw(false));
    zone.on('pointerdown', cb);
  }

  _drawPcBtn() {
    const { _pcGfx: g, _pcX: x, _pcY: y, _pcW: w, _pcH: h, pencil: on } = this;
    g.clear();
    g.fillStyle(on ? 0xffd54f : COL.btnBg).fillRoundedRect(x, y, w, h, 8);
    g.lineStyle(2, on ? 0xffd54f : COL.btnBorder).strokeRoundedRect(x, y, w, h, 8);
    this._pcTxt.setColor(on ? '#0d1224' : '#aabbdd');
  }

  _drawHtBtn() {
    const { _htGfx: g, _htX: x, _htY: y, _htW: w, _htH: h, hintsLeft: n } = this;
    g.clear();
    g.fillStyle(n > 0 ? COL.btnBg : 0x111520).fillRoundedRect(x, y, w, h, 8);
    g.lineStyle(2, n > 0 ? 0xffd54f : 0x333344).strokeRoundedRect(x, y, w, h, 8);
    this._htTxt.setText(T[LANG].hint(n)).setColor(n > 0 ? '#ffd54f' : '#444466');
  }

  _refreshCounts() {
    const cnt = Array(10).fill(0);
    for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++)
      if (this.puzzle[r][c]) cnt[this.puzzle[r][c]]++;
    for (let n = 1; n <= 9; n++) {
      const rem = 9 - cnt[n];
      this._cntTxt[n].setText(rem > 0 ? String(rem) : '').setColor(rem > 0 ? '#556688' : '#222233');
    }
  }

  // ── Input ──────────────────────────────────────────────────────────────────
  _input(n) {
    if (!this.sel || this.done) return;
    const { r, c } = this.sel;
    if (this.given[r][c]) return;
    AudioManager.playButton();

    if (this.pencil) {
      if (this.puzzle[r][c]) return;
      const ns = this.notes[r][c];
      ns.has(n) ? ns.delete(n) : ns.add(n);
      this._cellTxt(r, c);
      return;
    }

    this.notes[r][c].clear();
    this.puzzle[r][c] = n;
    this._renderGrid();
    this._refreshCounts();

    if (n !== this.solution[r][c]) {
      this.mistakes++;
      this._errTxt.setText(T[LANG].mistakes(this.mistakes));
      AudioManager.playInvalid();
      this.vfx.screenShake(3, 100);
    } else {
      AudioManager.playPlace();
      this._flash(r, c);
      this._checkCompletions(r, c);
    }
    this._checkWin();
  }

  _erase() {
    if (!this.sel || this.done) return;
    const { r, c } = this.sel;
    if (this.given[r][c]) return;
    this.puzzle[r][c] = 0;
    this.notes[r][c].clear();
    AudioManager.playButton();
    this._renderGrid();
    this._refreshCounts();
  }

  _hint() {
    if (this.hintsLeft <= 0 || this.done) return;
    let hr = -1, hc = -1;
    if (this.sel && !this.puzzle[this.sel.r][this.sel.c]) {
      hr = this.sel.r; hc = this.sel.c;
    } else {
      outer: for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++)
        if (!this.puzzle[r][c]) { hr = r; hc = c; break outer; }
    }
    if (hr === -1) return;

    this.hintsLeft--;
    this.puzzle[hr][hc] = this.solution[hr][hc];
    this.given[hr][hc] = true;
    this.notes[hr][hc].clear();
    this.sel = { r: hr, c: hc };

    AudioManager.playClear(1);
    this._flash(hr, hc);
    this._drawHtBtn();
    this._renderGrid();
    this._refreshCounts();
    this._checkCompletions(hr, hc);
    this._checkWin();
  }

  // ── Verificaciones de compleción ───────────────────────────────────────────
  _checkCompletions(r, c) {
    let n = 0;
    if (this.puzzle[r].every(v => v)) n++;
    if ([...Array(9)].map((_, i) => this.puzzle[i][c]).every(v => v)) n++;
    const br = Math.floor(r / 3) * 3, bc = Math.floor(c / 3) * 3;
    let boxFull = true;
    for (let dr = 0; dr < 3; dr++) for (let dc = 0; dc < 3; dc++)
      if (!this.puzzle[br + dr][bc + dc]) boxFull = false;
    if (boxFull) n++;

    if (n) {
      AudioManager.playClear(n);
      if (n >= 2) {
        this.vfx.floatingScore(
          GX + c * CS + CS / 2, GY + r * CS,
          n >= 3 ? T[LANG].triple : T[LANG].double, '#ffd700', 28
        );
      }
    }
  }

  _checkWin() {
    for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++)
      if (this.puzzle[r][c] !== this.solution[r][c]) return;

    this.done = true;
    this._timerEv.remove();
    AudioManager.playCombo(5);

    const newRec      = Store.saveBest(this.difficulty, this.elapsed);
    const totalSolved = Store.addSolved();
    const score       = this._calcScore();

    this.time.delayedCall(1200, () => {
      this.scene.start('WinScene', {
        time: this.elapsed, mistakes: this.mistakes,
        difficulty: this.difficulty, newRec, totalSolved, score,
      });
    });
  }

  _calcScore() {
    const base   = { easy: 1000, medium: 2000, hard: 3000 }[this.difficulty] || 1000;
    const tBonus = Math.max(0, 2000 - Math.floor(this.elapsed / 2));
    return Math.max(0, base + tBonus - this.mistakes * 100);
  }

  _flash(r, c) {
    const fl = this.add.rectangle(
      GX + c * CS + CS / 2, GY + r * CS + CS / 2, CS - 2, CS - 2, 0xffd54f, 0.45
    ).setDepth(8);
    this.tweens.add({ targets: fl, alpha: 0, duration: 300, onComplete: () => fl.destroy() });
  }
}

// ════════════════════════════════════════════════════════════════════════════
// WIN SCENE
// ════════════════════════════════════════════════════════════════════════════
class WinScene extends Phaser.Scene {
  constructor() { super('WinScene'); }
  init(d) { this._d = d; }

  create() {
    const d = this._d;
    this._tr = new ThemeRenderer(this);
    this._tr.apply(Store.getTheme());

    // Confetti
    const colors = [0xffd700, 0xff6b6b, 0x00d4ff, 0x2ecc71, 0xf39c12, 0xec407a, 0xffd54f];
    for (let i = 0; i < 60; i++) {
      const x = Math.random() * GAME_W, y = Math.random() * 150;
      const s = 4 + Math.random() * 6;
      const rect = this.add.rectangle(x, y, s, s, colors[Math.random() * colors.length | 0]);
      this.tweens.add({
        targets: rect, y: y + 250 + Math.random() * 200,
        x: x + (Math.random() - 0.5) * 100,
        alpha: 0, scaleX: 0.1, scaleY: 0.1,
        duration: 800 + Math.random() * 700, delay: Math.random() * 500,
        ease: 'Power2', onComplete: () => rect.destroy(),
      });
    }

    const cx = GAME_W / 2, cw = 310, ch = 400, cy = 180;
    const g = this.add.graphics();
    g.fillStyle(0x0d1224, 0.95).fillRoundedRect((GAME_W - cw) / 2, cy, cw, ch, 16);
    g.lineStyle(2, 0xffd54f).strokeRoundedRect((GAME_W - cw) / 2, cy, cw, ch, 16);

    this.add.text(cx, cy + 44, T[LANG].completed, {
      fontFamily: 'Arial Black, Arial', fontSize: '30px',
      color: '#ffd54f', stroke: '#000000', strokeThickness: 4,
    }).setOrigin(0.5);

    const DL = { easy: T[LANG].diffEasy, medium: T[LANG].diffMed, hard: T[LANG].diffHard };
    const DC = { easy: '#4caf50', medium: '#ff9800', hard: '#f44336' };
    this.add.text(cx, cy + 84, DL[d.difficulty], {
      fontFamily: 'Arial Black', fontSize: '16px', color: DC[d.difficulty],
    }).setOrigin(0.5);

    this.add.text(cx, cy + 116, T[LANG].time, {
      fontFamily: 'Arial', fontSize: '13px', color: '#556688',
    }).setOrigin(0.5);
    this.add.text(cx, cy + 140, this._fmt(d.time), {
      fontFamily: 'Arial Black', fontSize: '40px', color: '#ffffff',
    }).setOrigin(0.5);

    if (d.newRec) {
      this.add.text(cx, cy + 185, T[LANG].newRecord, {
        fontFamily: 'Arial Black', fontSize: '15px', color: '#ffd700',
      }).setOrigin(0.5);
    }

    this.add.text(cx - 70, cy + 220, T[LANG].errLabel, {
      fontFamily: 'Arial', fontSize: '12px', color: '#556688',
    }).setOrigin(0.5);
    this.add.text(cx - 70, cy + 240, String(d.mistakes), {
      fontFamily: 'Arial Black', fontSize: '24px', color: '#ff6677',
    }).setOrigin(0.5);

    this.add.text(cx + 70, cy + 220, T[LANG].scoreLabel, {
      fontFamily: 'Arial', fontSize: '12px', color: '#556688',
    }).setOrigin(0.5);
    this.add.text(cx + 70, cy + 240, String(d.score), {
      fontFamily: 'Arial Black', fontSize: '24px', color: '#ffd54f',
    }).setOrigin(0.5);

    this.add.text(cx, cy + 286, T[LANG].totalSolved(d.totalSolved), {
      fontFamily: 'Arial', fontSize: '13px', color: '#7788aa',
    }).setOrigin(0.5);

    // Botones
    this._btn(cx - 78, cy + 348, 130, 48, T[LANG].again, '#4caf50', () => {
      AudioManager.playButton();
      this.scene.start('GameScene', { difficulty: d.difficulty });
    });
    this._btn(cx + 78, cy + 348, 130, 48, T[LANG].menu, '#6677aa', () => {
      AudioManager.playButton();
      this.scene.start('MenuScene');
    });

    // Anuncio recompensado (opcional)
    const ry = cy + ch + 22;
    this.add.graphics().fillStyle(0x1a2540).fillRoundedRect((GAME_W - 280) / 2, ry, 280, 44, 22);
    this.add.text(cx, ry + 22, T[LANG].rewarded, {
      fontFamily: 'Arial', fontSize: '13px', color: '#ffd54f',
    }).setOrigin(0.5).setDepth(5);
    this.add.zone(cx, ry + 22, 280, 44).setInteractive().on('pointerdown', () => {
      AdsManager.showRewarded(() => {
        this.add.text(cx, ry - 12, T[LANG].bonusPts, {
          fontFamily: 'Arial Black', fontSize: '26px',
          color: '#ffd700', stroke: '#000000', strokeThickness: 4,
        }).setOrigin(0.5).setDepth(10);
      });
    });

    AdsManager.showInterstitial();

  }

  update(t, d) { if (this._tr) this._tr.update(t, d); }

  _fmt(s) {
    return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  }

  _btn(x, y, w, h, label, color, cb) {
    const col = Phaser.Display.Color.HexStringToColor(color).color;
    const g = this.add.graphics();
    g.fillStyle(COL.btnBg).fillRoundedRect(x - w / 2, y - h / 2, w, h, 10);
    g.lineStyle(2, col).strokeRoundedRect(x - w / 2, y - h / 2, w, h, 10);
    this.add.text(x, y, label, { fontFamily: 'Arial Black', fontSize: '14px', color }).setOrigin(0.5).setDepth(5);
    this.add.zone(x, y, w, h).setInteractive({ useHandCursor: true }).on('pointerdown', cb);
  }
}

// ─── Phaser config ────────────────────────────────────────────────────────────
new Phaser.Game({
  type: Phaser.AUTO,
  width: GAME_W,
  height: GAME_H,
  backgroundColor: '#0d1224',
  parent: 'game-container',
  resolution: window.devicePixelRatio || 1,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  input: { activePointers: 3 },
  scene: [MenuScene, GameScene, WinScene],
});
