'use strict';

// ─── Background Theme Definitions ───────────────────────────────────────────
const BG_THEMES = {
  deepspace: {
    key: 'deepspace', name: 'Deep Space', emoji: '🌌',
    bg: 0x050510,
    gridBg: 0x0A0A20, gridBgAlpha: 0.6,
    gridLine: 0x2A2A5A, gridLineAlpha: 0.3,
  },
  underwater: {
    key: 'underwater', name: 'Underwater', emoji: '🫧',
    bg: 0x0A2A3A,
    gridBg: 0x0D3045, gridBgAlpha: 1,
    gridLine: 0x1A5060, gridLineAlpha: 0.25,
  },
  sunset: {
    key: 'sunset', name: 'Sunset City', emoji: '🌆',
    bg: 0x1A0530,
    gridBg: 0x2A1520, gridBgAlpha: 1,
    gridLine: 0x604030, gridLineAlpha: 0.2,
  },
  neon: {
    key: 'neon', name: 'Neon Arcade', emoji: '👾',
    bg: 0x05000D,
    gridBg: 0x0A0518, gridBgAlpha: 1,
    gridLine: 0xFF00FF, gridLineAlpha: 0.15,
  },
  forest: {
    key: 'forest', name: 'Enchanted Forest', emoji: '🌿',
    bg: 0x0A1A10,
    gridBg: 0x0D1A12, gridBgAlpha: 1,
    gridLine: 0x2A4A30, gridLineAlpha: 0.2,
  },
  sakura: {
    key: 'sakura', name: 'Sakura', emoji: '🌸',
    bg: 0x1A0A1A,
    gridBg: 0x1A0D15, gridBgAlpha: 0.5,
    gridLine: 0x3A2030, gridLineAlpha: 0.2,
    unlockScore: 1500,
  },
  storm: {
    key: 'storm', name: 'Storm', emoji: '⚡',
    bg: 0x0A0A14,
    gridBg: 0x0D0D1A, gridBgAlpha: 0.6,
    gridLine: 0x2A3050, gridLineAlpha: 0.25,
    unlockScore: 2000,
  },
  desert: {
    key: 'desert', name: 'Desert', emoji: '🏜️',
    bg: 0x1A1000,
    gridBg: 0x1A1208, gridBgAlpha: 0.5,
    gridLine: 0x3A2A15, gridLineAlpha: 0.2,
    unlockScore: 2500,
  },
  frozen: {
    key: 'frozen', name: 'Frozen', emoji: '❄️',
    bg: 0x0A1020,
    gridBg: 0x0D1525, gridBgAlpha: 0.5,
    gridLine: 0x2A4060, gridLineAlpha: 0.2,
    unlockScore: 3000,
  },
};

const BG_THEME_KEYS = Object.keys(BG_THEMES);

// ─── ThemeRenderer ──────────────────────────────────────────────────────────
class ThemeRenderer {
  constructor(scene) {
    this.scene = scene;
    this.objects = [];    // all graphics/gameobjects to destroy
    this.tweenRefs = [];  // all tweens to stop
    this.timerRefs = [];  // all timer events
    this.activeTheme = null;
    this.stars = [];
    this.bubbles = [];
    this.dataRain = [];
    this.fireflies = [];
    this.leaves = [];
    this.spores = [];
    this.birds = [];
    this.shootingStar = null;
    this.nebulas = [];
    this.clouds = [];
    this.seaweed = [];
    this.buildings = [];
    this.windows = [];
    this.petals = [];
    this.rainDrops = [];
    this.stormClouds = [];
    this.sandParticles = [];
    this.snowflakes = [];
    this.auroraBands = [];
    this.iceCrystals = [];
  }

  // ── Public API ────────────────────────────────────────────────────
  apply(themeKey) {
    this.destroy();
    this.activeTheme = BG_THEMES[themeKey] || BG_THEMES.deepspace;
    const t = this.activeTheme;

    // Background rect
    const bg = this.scene.add.rectangle(GAME_W / 2, GAME_H / 2, GAME_W, GAME_H, t.bg).setDepth(0);
    this.objects.push(bg);

    switch (t.key) {
      case 'deepspace': this._buildDeepSpace(); break;
      case 'underwater': this._buildUnderwater(); break;
      case 'sunset': this._buildSunset(); break;
      case 'neon': this._buildNeon(); break;
      case 'forest': this._buildForest(); break;
      case 'sakura': this._buildSakura(); break;
      case 'storm': this._buildStorm(); break;
      case 'desert': this._buildDesert(); break;
      case 'frozen': this._buildFrozen(); break;
    }
  }

  destroy() {
    this.tweenRefs.forEach(tw => { if (tw && tw.isPlaying) tw.stop(); });
    this.timerRefs.forEach(te => { if (te) te.remove(false); });
    this.objects.forEach(o => { if (o && o.destroy) o.destroy(); });
    this.objects = [];
    this.tweenRefs = [];
    this.timerRefs = [];
    this.stars = [];
    this.bubbles = [];
    this.dataRain = [];
    this.fireflies = [];
    this.leaves = [];
    this.spores = [];
    this.birds = [];
    this.shootingStar = null;
    this.nebulas = [];
    this.clouds = [];
    this.seaweed = [];
    this.buildings = [];
    this.windows = [];
    this.petals = [];
    this.rainDrops = [];
    this.stormClouds = [];
    this.sandParticles = [];
    this.snowflakes = [];
    this.auroraBands = [];
    this.iceCrystals = [];
    this.activeTheme = null;
  }

  update(time, delta) {
    if (!this.activeTheme) return;
    switch (this.activeTheme.key) {
      case 'deepspace': this._updateDeepSpace(time, delta); break;
      case 'underwater': this._updateUnderwater(time, delta); break;
      case 'sunset': this._updateSunset(time, delta); break;
      case 'neon': this._updateNeon(time, delta); break;
      case 'forest': this._updateForest(time, delta); break;
      case 'sakura': this._updateSakura(time, delta); break;
      case 'storm': this._updateStorm(time, delta); break;
      case 'desert': this._updateDesert(time, delta); break;
      case 'frozen': this._updateFrozen(time, delta); break;
    }
  }

  onLineClear(cells) {
    if (!this.activeTheme) return;
    // Calculate center of cleared cells
    const cx = cells.reduce((s, c) => s + (GRID_X + c[0] * GRID_CELL + GRID_CELL / 2), 0) / cells.length;
    const cy = cells.reduce((s, c) => s + (GRID_Y + c[1] * GRID_CELL + GRID_CELL / 2), 0) / cells.length;
    switch (this.activeTheme.key) {
      case 'deepspace': this._lcDeepSpace(cx, cy); break;
      case 'underwater': this._lcUnderwater(cx, cy); break;
      case 'sunset': this._lcSunset(cx, cy); break;
      case 'neon': this._lcNeon(cx, cy); break;
      case 'forest': this._lcForest(cx, cy); break;
      case 'sakura': this._lcSakura(cx, cy); break;
      case 'storm': this._lcStorm(cx, cy); break;
      case 'desert': this._lcDesert(cx, cy); break;
      case 'frozen': this._lcFrozen(cx, cy); break;
    }
  }

  // Helper to add a graphics object tracked for cleanup
  _gfx(depth) {
    const g = this.scene.add.graphics().setDepth(depth || 0);
    this.objects.push(g);
    return g;
  }

  _tw(config) {
    const t = this.scene.tweens.add(config);
    this.tweenRefs.push(t);
    return t;
  }

  _timer(config) {
    const t = this.scene.time.addEvent(config);
    this.timerRefs.push(t);
    return t;
  }

  // ════════════════════════════════════════════════════════════════════
  // 1. DEEP SPACE
  // ════════════════════════════════════════════════════════════════════
  _buildDeepSpace() {
    const s = this.scene;
    const rng = new Phaser.Math.RandomDataGenerator(['deepspace42']);

    // Nebulas — 4 clusters of concentric circles
    const nebulaConfigs = [
      { x: GAME_W * 0.3, y: GAME_H * 0.2, color: 0x6B2FA0 },
      { x: GAME_W * 0.7, y: GAME_H * 0.7, color: 0x1A3A6B },
      { x: GAME_W * 0.15, y: GAME_H * 0.55, color: 0x2A5A4B },
      { x: GAME_W * 0.85, y: GAME_H * 0.35, color: 0x8B2050 },
    ];
    nebulaConfigs.forEach(nc => {
      const g = this._gfx(0);
      for (let i = 5; i >= 0; i--) {
        const r = 50 + i * 28;
        g.fillStyle(nc.color, 0.03);
        g.fillCircle(0, 0, r);
      }
      g.setPosition(nc.x, nc.y);
      this.nebulas.push({ gfx: g, baseX: nc.x, baseY: nc.y, phase: rng.realInRange(0, Math.PI * 2) });
    });

    // Stars — 90 tiny circles with varied sizes
    for (let i = 0; i < 90; i++) {
      const x = rng.realInRange(0, GAME_W);
      const y = rng.realInRange(0, GAME_H);
      const radius = rng.realInRange(0.5, 3);
      const alpha = rng.realInRange(0.2, 0.9);
      const g = this._gfx(0);
      g.fillStyle(0xffffff, alpha);
      g.fillCircle(0, 0, radius);
      g.setPosition(x, y);
      const dur = rng.between(1500, 4000);
      this._tw({
        targets: g, alpha: { from: alpha, to: alpha * 0.3 },
        duration: dur, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
        delay: rng.between(0, dur)
      });
      this.stars.push({ gfx: g, x, y });
    }

    // Bright star clusters with glow
    const clusterG = this._gfx(1);
    for (let c = 0; c < 4; c++) {
      const cx = rng.between(30, GAME_W - 30);
      const cy = rng.between(30, GAME_H - 30);
      // Glow behind cluster
      clusterG.fillStyle(0x8080FF, 0.1);
      clusterG.fillCircle(cx, cy, 6);
      // 3-4 bright stars
      for (let j = 0; j < rng.between(3, 4); j++) {
        const sx = cx + rng.between(-8, 8);
        const sy = cy + rng.between(-8, 8);
        clusterG.fillStyle(0xffffff, rng.realInRange(0.8, 1.0));
        clusterG.fillCircle(sx, sy, 2);
      }
    }

    // Shooting stars timer
    this._timer({
      delay: 8000, loop: true,
      callback: () => this._spawnShootingStar()
    });
  }

  _spawnShootingStar() {
    const s = this.scene;
    const startX = Phaser.Math.Between(0, GAME_W);
    const startY = 0;
    const endX = Phaser.Math.Between(0, GAME_W);
    const endY = GAME_H;
    const g = this._gfx(1);
    const trail = [];
    for (let i = 0; i < 5; i++) {
      trail.push({ x: startX, y: startY, alpha: 1 - i * 0.18 });
    }
    const obj = { gfx: g, sx: startX, sy: startY, ex: endX, ey: endY, progress: 0, trail };
    this.shootingStar = obj;
    this._tw({
      targets: obj, progress: 1, duration: 800, ease: 'Quad.easeIn',
      onUpdate: () => {
        const cx = Phaser.Math.Linear(obj.sx, obj.ex, obj.progress);
        const cy = Phaser.Math.Linear(obj.sy, obj.ey, obj.progress);
        // Shift trail
        for (let i = trail.length - 1; i > 0; i--) {
          trail[i].x = trail[i - 1].x;
          trail[i].y = trail[i - 1].y;
        }
        trail[0].x = cx; trail[0].y = cy;
        g.clear();
        trail.forEach((t, idx) => {
          g.fillStyle(0xffffff, (1 - idx * 0.2) * (1 - obj.progress * 0.5));
          g.fillRect(t.x, t.y, 2, 1);
        });
      },
      onComplete: () => { g.clear(); }
    });
  }

  _updateDeepSpace(time) {
    // Nebula drift
    const t = time * 0.001;
    this.nebulas.forEach(n => {
      n.gfx.setPosition(
        n.baseX + Math.sin(t * 0.4 + n.phase) * 20,
        n.baseY + Math.cos(t * 0.3 + n.phase) * 10
      );
    });
  }

  _lcDeepSpace(cx, cy) {
    // Supernova: white circle expanding + purple ring
    const g = this._gfx(15);
    const state = { radius: 5, alpha: 1 };
    this._tw({
      targets: state, radius: 150, alpha: 0, duration: 400, ease: 'Quad.easeOut',
      onUpdate: () => {
        g.clear();
        g.fillStyle(0xffffff, state.alpha * 0.6);
        g.fillCircle(cx, cy, state.radius);
        g.lineStyle(2, 0x6B4AFF, state.alpha * 0.8);
        g.strokeCircle(cx, cy, state.radius * 1.2);
      },
      onComplete: () => { g.clear(); }
    });
  }

  // ════════════════════════════════════════════════════════════════════
  // 2. UNDERWATER
  // ════════════════════════════════════════════════════════════════════
  _buildUnderwater() {
    const s = this.scene;
    const rng = new Phaser.Math.RandomDataGenerator(['underwater42']);

    // Depth gradient — 4 horizontal bands
    const bandColors = [0x0A2A3A, 0x082838, 0x062030, 0x041828];
    const bandH = GAME_H / 4;
    bandColors.forEach((c, i) => {
      const r = s.add.rectangle(GAME_W / 2, bandH * i + bandH / 2, GAME_W, bandH + 2, c).setDepth(0);
      this.objects.push(r);
    });

    // Caustics — 6 ellipses in upper third
    for (let i = 0; i < 6; i++) {
      const g = this._gfx(0);
      const cx = rng.realInRange(20, GAME_W - 20);
      const cy = rng.realInRange(20, GAME_H * 0.33);
      const rx = rng.between(30, 60);
      const ry = rng.between(15, 25);
      g.fillStyle(0x40B0D0, 0.04);
      g.fillEllipse(0, 0, rx * 2, ry * 2);
      g.setPosition(cx, cy);
      this._tw({
        targets: g, scaleX: { from: 0.8, to: 1.3 },
        duration: rng.between(2000, 4000), yoyo: true, repeat: -1, ease: 'Sine.easeInOut'
      });
    }

    // Bubbles — 25
    this.bubbles = [];
    for (let i = 0; i < 25; i++) {
      const x = rng.realInRange(10, GAME_W - 10);
      const y = rng.realInRange(0, GAME_H);
      const radius = rng.realInRange(2, 8);
      const alpha = rng.realInRange(0.15, 0.4);
      const speed = rng.realInRange(0.3, 0.8);
      const swayAmp = 15;
      const swayFreq = rng.realInRange(0.001, 0.003);
      const g = this._gfx(1);
      g.lineStyle(1, 0x60D0E0, alpha);
      g.strokeCircle(0, 0, radius);
      g.setPosition(x, y);
      this.bubbles.push({ gfx: g, x, y, baseX: x, speed, radius, swayAmp, swayFreq, phase: rng.realInRange(0, Math.PI * 2) });
    }

    // Seaweed — 6 groups, more detailed with 4-5 segments
    const seaweedPositions = [
      { x: 20, baseY: GAME_H },
      { x: 70, baseY: GAME_H },
      { x: GAME_W - 25, baseY: GAME_H },
      { x: GAME_W - 70, baseY: GAME_H },
      { x: GAME_W / 2 - 40, baseY: GAME_H },
      { x: GAME_W / 2 + 50, baseY: GAME_H },
    ];
    seaweedPositions.forEach(sp => {
      const g = this._gfx(0);
      for (let j = 0; j < 3; j++) {
        const ox = (j - 1) * 12;
        const col = [0x1A6040, 0x186838, 0x1A5A3A][j];
        g.lineStyle(rng.between(2, 4), col, 0.35);
        g.beginPath();
        g.moveTo(ox, 0);
        const segs = rng.between(4, 5);
        let sx = ox, sy = 0;
        for (let k = 0; k < segs; k++) {
          sx += rng.between(-8, 8);
          sy -= rng.between(22, 35);
          g.lineTo(sx, sy);
        }
        g.strokePath();
      }
      g.setPosition(sp.x, sp.baseY);
      this.seaweed.push({ gfx: g, baseX: sp.x });
      this._tw({
        targets: g, x: { from: sp.x - 12, to: sp.x + 12 },
        duration: rng.between(2500, 5000), yoyo: true, repeat: -1, ease: 'Sine.easeInOut'
      });
    });

    // Coral silhouettes in lower corners
    const coralG = this._gfx(0);
    const coralShapes = [
      { x: 10, y: GAME_H - 20 }, { x: 50, y: GAME_H - 15 },
      { x: GAME_W - 15, y: GAME_H - 25 }, { x: GAME_W - 55, y: GAME_H - 18 },
    ];
    coralShapes.forEach(cs => {
      coralG.fillStyle(0x1A4050, 0.3);
      // Organic coral shape: overlapping circles
      for (let k = 0; k < 5; k++) {
        const cr = rng.between(6, 14);
        coralG.fillCircle(cs.x + rng.between(-10, 10), cs.y - rng.between(0, 30), cr);
      }
      // Coral branches
      coralG.fillStyle(0x1A4050, 0.25);
      for (let k = 0; k < 3; k++) {
        coralG.fillRect(cs.x + rng.between(-6, 6), cs.y - rng.between(15, 45), 3, rng.between(10, 25));
      }
    });

    // Light rays — 4 diagonal triangles with subtle animation
    for (let i = 0; i < 4; i++) {
      const g = this._gfx(0);
      const rx = rng.between(30, GAME_W - 30);
      g.fillStyle(0x40B0D0, 0.04);
      g.beginPath();
      g.moveTo(rx, 0);
      g.lineTo(rx - 45, GAME_H * 0.65);
      g.lineTo(rx + 45, GAME_H * 0.65);
      g.closePath();
      g.fillPath();
      this._tw({
        targets: g, alpha: { from: 0.02, to: 0.06 },
        duration: rng.between(3000, 6000), yoyo: true, repeat: -1, ease: 'Sine.easeInOut'
      });
    }
  }

  _updateUnderwater(time) {
    const t = time * 0.001;
    this.bubbles.forEach(b => {
      b.y -= b.speed;
      b.x = b.baseX + Math.sin(t * b.swayFreq * 1000 + b.phase) * b.swayAmp;
      if (b.y < -b.radius * 2) {
        b.y = GAME_H + b.radius * 2;
        b.baseX = Phaser.Math.Between(10, GAME_W - 10);
      }
      b.gfx.setPosition(b.x, b.y);
    });
  }

  _lcUnderwater(cx, cy) {
    // Wave ring + burst of bubbles
    const g = this._gfx(15);
    const state = { radius: 10, alpha: 1 };
    this._tw({
      targets: state, radius: 250, alpha: 0, duration: 500, ease: 'Quad.easeOut',
      onUpdate: () => {
        g.clear();
        g.lineStyle(2, 0x60E0FF, state.alpha);
        g.strokeCircle(cx, cy, state.radius);
      },
      onComplete: () => { g.clear(); }
    });
    // Burst bubbles
    for (let i = 0; i < 20; i++) {
      const bg = this._gfx(15);
      const angle = (Math.PI * 2 / 20) * i;
      const dist = Phaser.Math.Between(30, 100);
      const bx = cx + Math.cos(angle) * dist;
      const by = cy + Math.sin(angle) * dist;
      const br = Phaser.Math.Between(2, 6);
      bg.lineStyle(1, 0x60D0E0, 0.6);
      bg.strokeCircle(0, 0, br);
      bg.setPosition(cx, cy);
      this._tw({
        targets: bg, x: bx, y: by, alpha: 0, duration: 600, ease: 'Quad.easeOut',
        onComplete: () => { bg.clear(); }
      });
    }
  }

  // ════════════════════════════════════════════════════════════════════
  // 3. SUNSET CITY
  // ════════════════════════════════════════════════════════════════════
  _buildSunset() {
    const s = this.scene;
    const rng = new Phaser.Math.RandomDataGenerator(['sunset42']);

    // Sky gradient — 5 bands
    const skyColors = [0x1A0530, 0x4A1040, 0xC04020, 0xE08030, 0xF0B040];
    const bandH = GAME_H / 5;
    skyColors.forEach((c, i) => {
      const r = s.add.rectangle(GAME_W / 2, bandH * i + bandH / 2, GAME_W, bandH + 2, c).setDepth(0);
      this.objects.push(r);
    });

    // Sun
    const sunG = this._gfx(0);
    const sunY = GAME_H * 0.55;
    // Glow
    sunG.fillStyle(0xFFD060, 0.08);
    sunG.fillCircle(GAME_W / 2, sunY, 80);
    sunG.fillStyle(0xFFD060, 0.15);
    sunG.fillCircle(GAME_W / 2, sunY, 55);
    sunG.fillStyle(0xFFD060, 0.9);
    sunG.fillCircle(GAME_W / 2, sunY, 40);

    // Buildings — skyline
    this.buildings = [];
    this.windows = [];
    const buildingG = this._gfx(1);
    const bCount = Phaser.Math.Between(8, 12);
    const bWidth = GAME_W / bCount;
    for (let i = 0; i < bCount; i++) {
      const bh = rng.between(60, 200);
      const bx = i * bWidth;
      const by = GAME_H - bh;
      buildingG.fillStyle(0x0A0510, 1);
      buildingG.fillRect(bx + 1, by, bWidth - 2, bh);
      this.buildings.push({ x: bx, y: by, w: bWidth, h: bh });

      // Windows
      const winCols = Math.floor((bWidth - 8) / 8);
      const winRows = Math.floor((bh - 10) / 12);
      for (let wr = 0; wr < winRows; wr++) {
        for (let wc = 0; wc < winCols; wc++) {
          if (rng.frac() > 0.5) {
            const wx = bx + 5 + wc * 8;
            const wy = by + 8 + wr * 12;
            const wa = rng.realInRange(0.3, 0.8);
            buildingG.fillStyle(0xFFD060, wa);
            buildingG.fillRect(wx, wy, 3, 3);
            this.windows.push({ x: wx, y: wy });
          }
        }
      }

      // Antenna on tall buildings
      if (bh > 150 && rng.frac() > 0.5) {
        buildingG.lineStyle(1, 0x0A0510, 1);
        const ax = bx + bWidth / 2;
        buildingG.lineBetween(ax, by, ax, by - 20);
        // Blinking red light
        const redG = this._gfx(2);
        redG.fillStyle(0xFF0000, 0.8);
        redG.fillCircle(0, 0, 2);
        redG.setPosition(ax, by - 20);
        this._tw({
          targets: redG, alpha: { from: 0.2, to: 1 },
          duration: 1000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut'
        });
      }
    }

    // Clouds — 4 groups
    this.clouds = [];
    for (let i = 0; i < 4; i++) {
      const g = this._gfx(0);
      const cx = rng.between(-50, GAME_W + 50);
      const cy = rng.between(30, GAME_H * 0.3);
      for (let j = 0; j < 3; j++) {
        const ox = (j - 1) * 20;
        const oy = rng.between(-5, 5);
        const rx = rng.between(20, 35);
        const ry = rng.between(8, 15);
        g.fillStyle(0xD06030, rng.realInRange(0.15, 0.25));
        g.fillEllipse(ox, oy, rx * 2, ry * 2);
      }
      g.setPosition(cx, cy);
      this.clouds.push({ gfx: g, x: cx, y: cy, speed: rng.realInRange(0.08, 0.2) });
    }

    // Birds — 3 V-shapes
    this.birds = [];
    for (let i = 0; i < 3; i++) {
      const g = this._gfx(2);
      const bx = rng.between(50, GAME_W - 50);
      const by = rng.between(80, GAME_H * 0.35);
      g.lineStyle(1, 0x1A0520, 0.7);
      g.lineBetween(-6, 3, 0, 0);
      g.lineBetween(0, 0, 6, 3);
      g.setPosition(bx, by);
      this.birds.push({ gfx: g, x: bx, y: by, speed: rng.realInRange(0.1, 0.25), bobPhase: rng.realInRange(0, Math.PI * 2) });
    }

    // Window flickering — random windows blink on/off
    this._timer({
      delay: 2000, loop: true,
      callback: () => {
        if (this.windows.length === 0) return;
        const idx = Phaser.Math.Between(0, this.windows.length - 1);
        const w = this.windows[idx];
        const flash = this._gfx(2);
        flash.fillStyle(0xFFD060, 0.9);
        flash.fillRect(w.x, w.y, 3, 3);
        this._tw({ targets: flash, alpha: 0, duration: 800, onComplete: () => flash.clear() });
      }
    });

    // Distant airplane crossing every 30s
    this._sunsetPlane = null;
    this._timer({
      delay: 30000, loop: true,
      callback: () => {
        const pg = this._gfx(2);
        const py = rng.between(40, 120);
        pg.setPosition(-20, py);
        pg.lineStyle(1, 0x1a0520, 0.3);
        pg.lineBetween(0, 0, -6, -3);
        pg.lineBetween(0, 0, -6, 3);
        pg.fillStyle(0x1a0520, 0.3);
        pg.fillRect(-2, -1, 8, 2);
        this._tw({
          targets: pg, x: GAME_W + 30, duration: 15000, ease: 'Linear',
          onComplete: () => pg.clear()
        });
      }
    });
  }

  _updateSunset(time) {
    const t = time * 0.001;
    // Clouds drift
    this.clouds.forEach(c => {
      c.x -= c.speed;
      if (c.x < -80) c.x = GAME_W + 80;
      c.gfx.setPosition(c.x, c.y);
    });
    // Birds
    this.birds.forEach(b => {
      b.x -= b.speed;
      if (b.x < -20) b.x = GAME_W + 20;
      const by = b.y + Math.sin(t * 2 + b.bobPhase) * 3;
      b.gfx.setPosition(b.x, by);
    });
  }

  _lcSunset(cx, cy) {
    // Golden flash
    const flash = this._gfx(15);
    flash.fillStyle(0xFFD060, 0.4);
    flash.fillRect(0, 0, GAME_W, GAME_H);
    this._tw({
      targets: flash, alpha: 0, duration: 300, onComplete: () => flash.clear()
    });
    // Windows blink white
    if (this.buildings.length > 0) {
      const wg = this._gfx(15);
      this.windows.forEach(w => {
        if (Math.random() > 0.5) {
          wg.fillStyle(0xffffff, 0.9);
          wg.fillRect(w.x, w.y, 3, 3);
        }
      });
      this._tw({ targets: wg, alpha: 0, duration: 500, onComplete: () => wg.clear() });
    }
    // Bird flock from point
    for (let i = 0; i < 5; i++) {
      const bg = this._gfx(15);
      const angle = rnd(-0.8, -2.4);
      const dist = rnd(40, 120);
      const tx = cx + Math.cos(angle) * dist;
      const ty = cy + Math.sin(angle) * dist;
      bg.lineStyle(1, 0x1A0520, 0.8);
      bg.lineBetween(-4, 2, 0, 0);
      bg.lineBetween(0, 0, 4, 2);
      bg.setPosition(cx, cy);
      this._tw({
        targets: bg, x: tx, y: ty, alpha: 0, duration: 800, ease: 'Quad.easeOut',
        onComplete: () => bg.clear()
      });
    }
  }

  // ════════════════════════════════════════════════════════════════════
  // 4. NEON ARCADE
  // ════════════════════════════════════════════════════════════════════
  _buildNeon() {
    const s = this.scene;
    const rng = new Phaser.Math.RandomDataGenerator(['neon42']);
    const horizonY = GAME_H * 0.30;
    const vanishX = GAME_W / 2;

    // ── Background gradient & floor reflection ──
    const bgG = this._gfx(0);
    // Purple tint band at bottom 30%
    bgG.fillStyle(0x150535, 0.4);
    bgG.fillRect(0, GAME_H * 0.7, GAME_W, GAME_H * 0.3);
    // Floor reflection
    bgG.fillStyle(0xFF00FF, 0.02);
    bgG.fillRect(0, GAME_H * 0.8, GAME_W, GAME_H * 0.2);

    // ── Perspective grid (Tron style) ──
    const gridG = this._gfx(0);
    // Vertical lines converging to vanish point
    const numVLines = 25;
    for (let i = 0; i < numVLines; i++) {
      const t = i / (numVLines - 1);
      const bx = t * GAME_W;
      const distFromCenter = Math.abs(t - 0.5) * 2; // 0 at center, 1 at edges
      const a = 0.08 - distFromCenter * 0.02; // brighter at center
      gridG.lineStyle(1, 0xFF00FF, Math.max(0.04, a));
      gridG.lineBetween(bx, GAME_H, Phaser.Math.Linear(bx, vanishX, 0.85), horizonY);
    }
    // Horizontal lines with quadratic spacing
    for (let i = 0; i < 20; i++) {
      const t = i / 20;
      const y = horizonY + (GAME_H - horizonY) * (t * t);
      gridG.lineStyle(1, 0xFF00FF, 0.03 + t * 0.04);
      gridG.lineBetween(0, y, GAME_W, y);
    }
    // Horizon line
    gridG.lineStyle(1.5, 0xFF00FF, 0.12);
    gridG.lineBetween(0, horizonY, GAME_W, horizonY);
    // Horizon glow
    const hGlow = this._gfx(0);
    hGlow.fillStyle(0xFF00FF, 0.04);
    hGlow.fillRect(vanishX - 200, horizonY - 3, 400, 6);

    // ── Neon signs (6 signs with irregular flicker) ──
    this.neonSigns = [];
    const _drawSign = (g, type, params) => {
      // Draw glow layer first
      if (type === 'play') {
        // "PLAY" pixel letters
        const lw = 2; const sz = 4;
        // P
        g.lineStyle(6, params.color, 0.08);
        g.lineBetween(-24, -8, -24, 8); g.lineBetween(-24, -8, -18, -8); g.lineBetween(-18, -8, -18, 0); g.lineBetween(-24, 0, -18, 0);
        // L
        g.lineBetween(-12, -8, -12, 8); g.lineBetween(-12, 8, -6, 8);
        // A
        g.lineBetween(-1, 8, -1, -8); g.lineBetween(-1, -8, 5, -8); g.lineBetween(5, -8, 5, 8); g.lineBetween(-1, 0, 5, 0);
        // Y
        g.lineBetween(10, -8, 13, 0); g.lineBetween(16, -8, 13, 0); g.lineBetween(13, 0, 13, 8);
        // Sharp layer
        g.lineStyle(lw, params.color, 0.6);
        g.lineBetween(-24, -8, -24, 8); g.lineBetween(-24, -8, -18, -8); g.lineBetween(-18, -8, -18, 0); g.lineBetween(-24, 0, -18, 0);
        g.lineBetween(-12, -8, -12, 8); g.lineBetween(-12, 8, -6, 8);
        g.lineBetween(-1, 8, -1, -8); g.lineBetween(-1, -8, 5, -8); g.lineBetween(5, -8, 5, 8); g.lineBetween(-1, 0, 5, 0);
        g.lineBetween(10, -8, 13, 0); g.lineBetween(16, -8, 13, 0); g.lineBetween(13, 0, 13, 8);
      } else if (type === 'triangle') {
        const r = params.r;
        g.lineStyle(8, params.color, 0.06);
        g.beginPath();
        for (let k = 0; k < 3; k++) { const a = (Math.PI*2/3)*k - Math.PI/2; const px = Math.cos(a)*r, py = Math.sin(a)*r; k===0?g.moveTo(px,py):g.lineTo(px,py); }
        g.closePath(); g.strokePath();
        g.lineStyle(2, params.color, 0.7);
        g.beginPath();
        for (let k = 0; k < 3; k++) { const a = (Math.PI*2/3)*k - Math.PI/2; const px = Math.cos(a)*r, py = Math.sin(a)*r; k===0?g.moveTo(px,py):g.lineTo(px,py); }
        g.closePath(); g.strokePath();
      } else if (type === 'pacman') {
        const r = params.r;
        // Glow
        g.lineStyle(8, params.color, 0.06);
        g.beginPath(); g.arc(0, 0, r, 0.35, Math.PI*2 - 0.35, false); g.lineTo(0, 0); g.closePath(); g.strokePath();
        // Sharp
        g.lineStyle(2, params.color, 0.5);
        g.beginPath(); g.arc(0, 0, r, 0.35, Math.PI*2 - 0.35, false); g.lineTo(0, 0); g.closePath(); g.strokePath();
        // Dots
        g.fillStyle(params.color, 0.4);
        g.fillCircle(r + 10, 0, 2); g.fillCircle(r + 22, 0, 2); g.fillCircle(r + 34, 0, 2);
      } else if (type === 'heart') {
        const draw = (lw, al) => {
          g.lineStyle(lw, params.color, al);
          // Heart using two arcs + triangle (no bezierCurveTo in Phaser)
          g.beginPath();
          g.arc(-6, -2, 7, Math.PI, 0, false);
          g.lineTo(0, 14);
          g.strokePath();
          g.beginPath();
          g.arc(6, -2, 7, Math.PI, 0, false);
          g.lineTo(0, 14);
          g.strokePath();
        };
        draw(8, 0.06); draw(2, 0.4);
      } else if (type === 'cross') {
        g.lineStyle(8, params.color, 0.06);
        g.fillStyle(params.color, 0.06);
        g.fillRect(-10, -3, 20, 6); g.fillRect(-3, -10, 6, 20);
        g.lineStyle(2, params.color, 0.5);
        g.fillStyle(params.color, 0.4);
        g.fillRect(-10, -3, 20, 6); g.fillRect(-3, -10, 6, 20);
      } else if (type === 'star') {
        const drawStar = (lw, al) => {
          g.lineStyle(lw, params.color, al);
          g.beginPath();
          for (let k = 0; k < 5; k++) {
            const aOuter = (Math.PI*2/5)*k - Math.PI/2;
            const aInner = aOuter + Math.PI/5;
            const ox = Math.cos(aOuter)*params.r, oy = Math.sin(aOuter)*params.r;
            const ix = Math.cos(aInner)*params.r*0.4, iy = Math.sin(aInner)*params.r*0.4;
            k===0 ? g.moveTo(ox, oy) : g.lineTo(ox, oy);
            g.lineTo(ix, iy);
          }
          g.closePath(); g.strokePath();
        };
        drawStar(8, 0.06); drawStar(2, 0.5);
      }
    };

    const signDefs = [
      { type: 'play', x: 70, y: 80, color: 0xFF0066, r: 0 },
      { type: 'triangle', x: GAME_W - 60, y: 90, color: 0x00FFFF, r: 22, rotate: true, rotSpeed: 360/12 },
      { type: 'pacman', x: 40, y: GAME_H * 0.35, color: 0xFFFF00, r: 12, driftX: true },
      { type: 'heart', x: GAME_W - 50, y: GAME_H * 0.3, color: 0xFF0066, r: 0, heartbeat: true },
      { type: 'cross', x: GAME_W / 2 - 40, y: 50, color: 0x39FF14, r: 0, glowPulse: true },
      { type: 'star', x: GAME_W / 2 + 50, y: GAME_H * 0.32, color: 0xFF00FF, r: 14, rotate: true, rotSpeed: 360/20 },
    ];

    signDefs.forEach((sd, idx) => {
      const g = this._gfx(1);
      _drawSign(g, sd.type, sd);
      g.setPosition(sd.x, sd.y);

      const signObj = { gfx: g, def: sd, baseAlpha: g.alpha, flickerTimer: 0, flickerState: 'on' };
      this.neonSigns.push(signObj);

      // Rotating signs
      if (sd.rotate) {
        this._tw({ targets: g, angle: 360, duration: (360 / sd.rotSpeed) * 1000, repeat: -1, ease: 'Linear' });
      }
      // Pac-man drift
      if (sd.driftX) {
        this._tw({ targets: g, x: sd.x + 80, duration: 4000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      }
      // Heartbeat
      if (sd.heartbeat) {
        this._tw({ targets: g, scaleX: 1.15, scaleY: 1.15, duration: 500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      }
      // Glow pulse
      if (sd.glowPulse) {
        this._tw({ targets: g, alpha: { from: 0.6, to: 1 }, duration: 1200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      }

      // Irregular flicker timer
      signObj.flickerTimer = rng.between(2000, 5000);
    });

    // ── Scanlines (scrolling, every 2px) ──
    this.neonScanOffset = 0;
    this.neonScanG = this._gfx(5);
    // Bright CRT refresh scanline
    this.neonBrightScan = this._gfx(5);
    this.neonBrightScanY = 0;

    // ── Data rain — 25 chains ──
    this.dataRain = [];
    for (let i = 0; i < 25; i++) {
      const x = rng.between(5, GAME_W - 5);
      const y = rng.between(-200, GAME_H);
      const len = rng.between(3, 8);
      const speed = rng.realInRange(0.3, 1.8);
      const baseAlpha = rng.realInRange(0.3, 0.5);
      // Variable segment sizes
      const segs = [];
      for (let j = 0; j < len; j++) {
        segs.push({ w: 2, h: [4, 6, 8][rng.between(0, 2)] });
      }
      const g = this._gfx(1);
      this.dataRain.push({ gfx: g, x, y, len, speed, baseAlpha, segs });
    }

    // ── Neon floating particles ──
    this.neonParticles = [];
    const pColors = [0xFF00FF, 0x00FFFF, 0x39FF14, 0xFF0066];
    for (let i = 0; i < 12; i++) {
      const g = this._gfx(2);
      if (g.setBlendMode) g.setBlendMode(Phaser.BlendModes.ADD);
      const px = rng.between(10, GAME_W - 10);
      const py = rng.between(10, GAME_H - 10);
      const col = pColors[rng.between(0, 3)];
      const rad = rng.realInRange(1, 2);
      const al = rng.realInRange(0.2, 0.4);
      g.fillStyle(col, al);
      g.fillCircle(0, 0, rad);
      g.setPosition(px, py);
      this.neonParticles.push({ gfx: g, vx: rng.realInRange(-0.3, 0.3), vy: rng.realInRange(-0.3, 0.3), changeTimer: rng.between(1000, 3000), col, rad, al });
    }

    // ── CRT Vignette ──
    const vigG = this._gfx(6);
    // Corner darkening — simulated radial
    const steps = 6;
    for (let i = 0; i < steps; i++) {
      const inset = i * 15;
      const al = 0.5 - i * 0.07;
      if (al <= 0) break;
      vigG.fillStyle(0x000000, al);
      // Top
      vigG.fillRect(0, 0 + inset, GAME_W, 8);
      // Bottom
      vigG.fillRect(0, GAME_H - 8 - inset, GAME_W, 8);
      // Left
      vigG.fillRect(0 + inset, 0, 8, GAME_H);
      // Right
      vigG.fillRect(GAME_W - 8 - inset, 0, 8, GAME_H);
    }
    // Heavy corners
    const cs = 50;
    vigG.fillStyle(0x000000, 0.4);
    vigG.fillRect(0, 0, cs, cs);
    vigG.fillRect(GAME_W - cs, 0, cs, cs);
    vigG.fillRect(0, GAME_H - cs, cs, cs);
    vigG.fillRect(GAME_W - cs, GAME_H - cs, cs, cs);

    // ── Glitch timer (random 2-4s) ──
    this._neonScheduleGlitch = () => {
      this._timer({
        delay: Phaser.Math.Between(2000, 4000),
        callback: () => { this._doGlitch(); this._neonScheduleGlitch(); }
      });
    };
    this._neonScheduleGlitch();

    // ── CRT flicker timer (random 8-15s) ──
    this._neonScheduleCRT = () => {
      this._timer({
        delay: Phaser.Math.Between(8000, 15000),
        callback: () => { this._doCRTFlicker(); this._neonScheduleCRT(); }
      });
    };
    this._neonScheduleCRT();

    // Track elapsed for flicker logic
    this._neonElapsed = 0;
  }

  _doGlitch() {
    const s = this.scene;
    // Horizontal tear — colored strips
    const colors = [0xFF0066, 0x00FFAA, 0x4040FF];
    const numStrips = Phaser.Math.Between(3, 5);
    for (let i = 0; i < numStrips; i++) {
      const g = this._gfx(7);
      const y = Phaser.Math.Between(0, GAME_H);
      const h = Phaser.Math.Between(2, 8);
      const offsetX = Phaser.Math.Between(-5, 5);
      g.fillStyle(colors[Phaser.Math.Between(0, 2)], 0.4);
      g.fillRect(offsetX, y, GAME_W, h);
      // Background-color strip to simulate horizontal displacement
      g.fillStyle(0x05000D, 0.8);
      g.fillRect(offsetX < 0 ? GAME_W + offsetX : 0, y, Math.abs(offsetX), h);
      s.time.delayedCall(60, () => g.clear());
    }

    // Chromatic aberration
    const abG = this._gfx(7);
    abG.fillStyle(0xFF0000, 0.03);
    abG.fillRect(2, 0, GAME_W, GAME_H);
    abG.fillStyle(0x0000FF, 0.03);
    abG.fillRect(-2, 0, GAME_W, GAME_H);
    s.time.delayedCall(60, () => abG.clear());

    // Static noise
    const noiseG = this._gfx(7);
    const numDots = Phaser.Math.Between(20, 30);
    for (let i = 0; i < numDots; i++) {
      const nx = Phaser.Math.Between(0, GAME_W);
      const ny = Phaser.Math.Between(0, GAME_H);
      const sz = Phaser.Math.Between(1, 2);
      noiseG.fillStyle(0xFFFFFF, Phaser.Math.FloatBetween(0.3, 0.6));
      noiseG.fillRect(nx, ny, sz, sz);
    }
    s.time.delayedCall(60, () => noiseG.clear());
  }

  _doCRTFlicker() {
    const s = this.scene;
    // Brief blackout
    const blackG = this._gfx(8);
    blackG.fillStyle(0x000000, 0.1);
    blackG.fillRect(0, 0, GAME_W, GAME_H);
    s.time.delayedCall(30, () => {
      blackG.clear();
      // White flash
      const whiteG = this._gfx(8);
      whiteG.fillStyle(0xFFFFFF, 0.04);
      whiteG.fillRect(0, 0, GAME_W, GAME_H);
      s.time.delayedCall(40, () => whiteG.clear());
    });

    // 20% chance: rolling bar
    if (Math.random() < 0.2) {
      const barG = this._gfx(8);
      barG.fillStyle(0xFFFFFF, 0.03);
      const barY = { value: GAME_H };
      this._tw({
        targets: barY, value: -30, duration: 400, ease: 'Linear',
        onUpdate: () => {
          barG.clear();
          barG.fillStyle(0xFFFFFF, 0.03);
          barG.fillRect(0, barY.value, GAME_W, 30);
        },
        onComplete: () => barG.clear()
      });
    }
  }

  _updateNeon(time, delta) {
    if (!delta) delta = 16;
    this._neonElapsed = (this._neonElapsed || 0) + delta;

    // ── Data rain ──
    this.dataRain.forEach(d => {
      d.y += d.speed;
      if (d.y > GAME_H + 80) {
        d.y = -60;
        d.x = Phaser.Math.Between(5, GAME_W - 5);
      }
      d.gfx.clear();
      for (let j = 0; j < d.len; j++) {
        const segY = d.y + j * 10;
        if (j === 0) {
          // Head particle — white highlight
          d.gfx.fillStyle(0xFFFFFF, 0.6);
        } else {
          // Trail — gradient fade
          const fadeA = d.baseAlpha * (1 - j / d.len);
          d.gfx.fillStyle(0x00FF88, fadeA);
        }
        d.gfx.fillRect(d.x, segY, d.segs[j].w, d.segs[j].h);
      }
    });

    // ── Scrolling scanlines ──
    this.neonScanOffset = (this.neonScanOffset + 0.5) % 4;
    this.neonScanG.clear();
    for (let y = -2; y < GAME_H + 2; y += 2) {
      this.neonScanG.fillStyle(0x000000, 0.1);
      this.neonScanG.fillRect(0, y + this.neonScanOffset, GAME_W, 1);
    }

    // ── Bright CRT refresh scanline ──
    this.neonBrightScanY = (this.neonBrightScanY + GAME_H / (4 * 60)) % GAME_H; // ~4s full sweep
    this.neonBrightScan.clear();
    this.neonBrightScan.fillStyle(0xFFFFFF, 0.08);
    this.neonBrightScan.fillRect(0, this.neonBrightScanY, GAME_W, 2);

    // ── Neon sign irregular flicker ──
    if (this.neonSigns) {
      this.neonSigns.forEach(sign => {
        sign.flickerTimer -= delta;
        if (sign.flickerTimer <= 0) {
          const roll = Math.random();
          if (roll < 0.1) {
            // Rapid flicker: 3 blinks in 200ms
            const g = sign.gfx;
            const origA = g.alpha;
            let count = 0;
            const blinkInterval = this._timer({
              delay: 33, repeat: 5,
              callback: () => {
                g.alpha = (count % 2 === 0) ? 0.02 : origA;
                count++;
              }
            });
            this.scene.time.delayedCall(200, () => { g.alpha = origA; });
          } else if (roll < 0.2) {
            // Temporary off
            const g = sign.gfx;
            const origA = g.alpha;
            g.alpha = 0.05;
            this.scene.time.delayedCall(300, () => { g.alpha = origA; });
          }
          // else: stays on (80%)
          sign.flickerTimer = Phaser.Math.Between(2000, 5000);
        }
      });
    }

    // ── Floating neon particles (Brownian drift) ──
    if (this.neonParticles) {
      this.neonParticles.forEach(p => {
        p.changeTimer -= delta;
        if (p.changeTimer <= 0) {
          p.vx = Phaser.Math.FloatBetween(-0.3, 0.3);
          p.vy = Phaser.Math.FloatBetween(-0.3, 0.3);
          p.changeTimer = Phaser.Math.Between(1500, 3000);
        }
        let nx = p.gfx.x + p.vx;
        let ny = p.gfx.y + p.vy;
        // Bounce off edges
        if (nx < 5 || nx > GAME_W - 5) p.vx *= -1;
        if (ny < 5 || ny > GAME_H - 5) p.vy *= -1;
        nx = Phaser.Math.Clamp(nx, 5, GAME_W - 5);
        ny = Phaser.Math.Clamp(ny, 5, GAME_H - 5);
        p.gfx.setPosition(nx, ny);
      });
    }
  }

  _lcNeon(cx, cy) {
    const s = this.scene;

    // 1. Screen glitch — X offset jitter
    const jitterG = this._gfx(15);
    let jitterCount = 0;
    const jitterTimer = this._timer({
      delay: 16, repeat: 2,
      callback: () => {
        jitterG.clear();
        const off = Phaser.Math.Between(-4, 4);
        jitterG.fillStyle(0x05000D, 1);
        jitterG.fillRect(off < 0 ? GAME_W + off : 0, 0, Math.abs(off), GAME_H);
        jitterCount++;
        if (jitterCount >= 3) s.time.delayedCall(16, () => jitterG.clear());
      }
    });

    // 2. Color split flash
    const splitG = this._gfx(15);
    splitG.fillStyle(0xFF0066, 0.08);
    splitG.fillRect(-2, 0, GAME_W, GAME_H);
    splitG.fillStyle(0x00FF88, 0.08);
    splitG.fillRect(2, 0, GAME_W, GAME_H);
    splitG.fillStyle(0x4040FF, 0.08);
    splitG.fillRect(0, -2, GAME_W, GAME_H);
    s.time.delayedCall(60, () => splitG.clear());

    // 3. Neon explosion — line segments from center
    const neonColors = [0xFF0066, 0x00FFFF, 0x39FF14, 0xFF00FF, 0xFFFF00];
    for (let i = 0; i < 15; i++) {
      const g = this._gfx(15);
      const angle = Math.random() * Math.PI * 2;
      const len = Phaser.Math.Between(20, 50);
      const col = neonColors[Phaser.Math.Between(0, neonColors.length - 1)];
      const startR = 5;
      const endR = startR + len;
      g.lineStyle(2, col, 0.8);
      g.setPosition(cx, cy);
      g.lineBetween(
        Math.cos(angle) * startR, Math.sin(angle) * startR,
        Math.cos(angle) * endR, Math.sin(angle) * endR
      );
      this._tw({
        targets: g,
        scaleX: 2.5, scaleY: 2.5, alpha: 0, angle: Phaser.Math.Between(-30, 30),
        duration: 400, ease: 'Quad.easeOut',
        onComplete: () => g.clear()
      });
    }

    // 4. Scanlines intensify
    const scanFlash = this._gfx(14);
    for (let y = 0; y < GAME_H; y += 2) {
      scanFlash.fillStyle(0x000000, 0.3);
      scanFlash.fillRect(0, y, GAME_W, 1);
    }
    this._tw({ targets: scanFlash, alpha: 0, duration: 200, delay: 200, onComplete: () => scanFlash.clear() });

    // 5. Score text arcade style
    const scoreTxt = s.add.text(cx, cy - 30, '+100', {
      fontFamily: 'monospace', fontSize: '28px', color: '#00FF88',
      stroke: '#003322', strokeThickness: 2
    }).setOrigin(0.5).setDepth(16).setScale(1.5).setAlpha(1);
    this.objects.push(scoreTxt);
    this._tw({
      targets: scoreTxt, scaleX: 1, scaleY: 1, alpha: 0, y: cy - 70,
      duration: 600, ease: 'Quad.easeOut',
      onComplete: () => scoreTxt.destroy()
    });

    // 6. All neon signs flash
    if (this.neonSigns) {
      this.neonSigns.forEach(sign => {
        const orig = sign.gfx.alpha;
        sign.gfx.alpha = 1;
        s.time.delayedCall(100, () => { sign.gfx.alpha = orig; });
      });
    }
  }

  // ════════════════════════════════════════════════════════════════════
  // 5. ENCHANTED FOREST
  // ════════════════════════════════════════════════════════════════════
  _buildForest() {
    const s = this.scene;
    const rng = new Phaser.Math.RandomDataGenerator(['forest42']);

    // Green gradient bg
    const gradColors = [0x0A1A10, 0x0C1E14, 0x0E2218, 0x0A1A10];
    const bandH = GAME_H / 4;
    gradColors.forEach((c, i) => {
      const r = s.add.rectangle(GAME_W / 2, bandH * i + bandH / 2, GAME_W, bandH + 2, c).setDepth(0);
      this.objects.push(r);
    });

    // Tree silhouettes — triangular shapes on edges
    const treeG = this._gfx(0);
    const treePositions = [
      { x: 20, h: 180 }, { x: 60, h: 140 }, { x: GAME_W - 20, h: 160 },
      { x: GAME_W - 55, h: 130 }, { x: GAME_W / 2 + 80, h: 100 }
    ];
    treePositions.forEach(tp => {
      const base = GAME_H;
      treeG.fillStyle(0x061008, 0.6);
      treeG.beginPath();
      treeG.moveTo(tp.x, base);
      treeG.lineTo(tp.x - 20, base - tp.h * 0.5);
      treeG.lineTo(tp.x - 12, base - tp.h * 0.7);
      treeG.lineTo(tp.x, base - tp.h);
      treeG.lineTo(tp.x + 12, base - tp.h * 0.7);
      treeG.lineTo(tp.x + 20, base - tp.h * 0.5);
      treeG.closePath();
      treeG.fillPath();
      // Trunk
      treeG.fillStyle(0x061008, 0.5);
      treeG.fillRect(tp.x - 4, base - tp.h * 0.3, 8, tp.h * 0.3);
    });

    // Fireflies — 20
    this.fireflies = [];
    for (let i = 0; i < 20; i++) {
      const x = rng.realInRange(10, GAME_W - 10);
      const y = rng.realInRange(50, GAME_H - 50);
      const alpha = rng.realInRange(0.3, 0.7);
      const g = this._gfx(2);
      // Outer glow
      g.fillStyle(0xA0FF40, alpha * 0.08);
      g.fillCircle(0, 0, 10);
      // Inner glow
      g.fillStyle(0xA0FF40, alpha * 0.3);
      g.fillCircle(0, 0, 6);
      // Core
      g.fillStyle(0xD0FF80, alpha);
      g.fillCircle(0, 0, 2);
      g.setPosition(x, y);

      const targetX = x + rng.realInRange(-60, 60);
      const targetY = y + rng.realInRange(-60, 60);
      const dur = rng.between(2000, 5000);

      this.fireflies.push({ gfx: g, x, y });

      // Erratic movement
      this._tw({
        targets: g,
        x: { from: x, to: Phaser.Math.Clamp(targetX, 10, GAME_W - 10) },
        y: { from: y, to: Phaser.Math.Clamp(targetY, 50, GAME_H - 50) },
        duration: dur, yoyo: true, repeat: -1, ease: 'Sine.easeInOut'
      });

      // Twinkle
      this._tw({
        targets: g,
        alpha: { from: alpha, to: alpha * 0.3 },
        duration: rng.between(1000, 3000), yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
        delay: rng.between(0, 2000)
      });
    }

    // Falling leaves — 6
    this.leaves = [];
    for (let i = 0; i < 6; i++) {
      const g = this._gfx(1);
      const x = rng.realInRange(10, GAME_W - 10);
      const y = rng.realInRange(-20, GAME_H);
      g.fillStyle(0x3A6030, 0.5);
      g.fillEllipse(0, 0, 4, 2);
      g.setPosition(x, y);
      this.leaves.push({
        gfx: g, x, y, baseX: x,
        speed: rng.realInRange(0.15, 0.4),
        swayAmp: rng.realInRange(15, 30),
        swayFreq: rng.realInRange(0.001, 0.003),
        rotSpeed: rng.realInRange(0.01, 0.03),
        phase: rng.realInRange(0, Math.PI * 2)
      });
    }

    // Spores — 8 tiny dots rising
    this.spores = [];
    for (let i = 0; i < 8; i++) {
      const g = this._gfx(1);
      const x = rng.realInRange(10, GAME_W - 10);
      const y = rng.realInRange(GAME_H * 0.5, GAME_H);
      g.fillStyle(0x80C060, 0.15);
      g.fillCircle(0, 0, 1);
      g.setPosition(x, y);
      this.spores.push({ gfx: g, x, y, speed: rng.realInRange(0.05, 0.15), baseX: x, phase: rng.realInRange(0, Math.PI * 2) });
    }

    // Fog — 4 large ellipses at multiple heights
    for (let i = 0; i < 4; i++) {
      const g = this._gfx(1);
      const cx = rng.between(0, GAME_W);
      const cy = GAME_H * (0.55 + i * 0.1) + rng.between(0, 40);
      g.fillStyle(0x1A3020, 0.04 + i * 0.005);
      g.fillEllipse(0, 0, rng.between(200, 350), rng.between(30, 60));
      g.setPosition(cx, cy);
      this._tw({
        targets: g, x: { from: cx - 50, to: cx + 50 },
        duration: rng.between(7000, 14000), yoyo: true, repeat: -1, ease: 'Sine.easeInOut'
      });
    }

    // Luminous mushrooms at base
    const mushG = this._gfx(1);
    const mushConfigs = [
      { x: 40, y: GAME_H - 15, color: 0xFF4040 },
      { x: GAME_W - 50, y: GAME_H - 10, color: 0x40FF80 },
      { x: GAME_W / 2 + 30, y: GAME_H - 12, color: 0xFFAA30 },
    ];
    mushConfigs.forEach(mc => {
      // Glow
      mushG.fillStyle(mc.color, 0.08);
      mushG.fillCircle(mc.x, mc.y - 8, 14);
      // Cap (semicircle via ellipse)
      mushG.fillStyle(mc.color, 0.15);
      mushG.fillEllipse(mc.x, mc.y - 8, 16, 10);
      // Stem
      mushG.fillStyle(0xE0D0B0, 0.1);
      mushG.fillRect(mc.x - 2, mc.y - 4, 4, 8);
      // Spots on cap
      mushG.fillStyle(0xFFFFFF, 0.1);
      mushG.fillCircle(mc.x - 3, mc.y - 10, 1.5);
      mushG.fillCircle(mc.x + 4, mc.y - 9, 1);
    });
  }

  _updateForest(time) {
    const t = time * 0.001;
    // Falling leaves
    this.leaves.forEach(l => {
      l.y += l.speed;
      l.x = l.baseX + Math.sin(t * l.swayFreq * 1000 + l.phase) * l.swayAmp;
      l.gfx.setRotation(t * l.rotSpeed * 10);
      if (l.y > GAME_H + 10) {
        l.y = -10;
        l.baseX = Phaser.Math.Between(10, GAME_W - 10);
      }
      l.gfx.setPosition(l.x, l.y);
    });
    // Spores rising
    this.spores.forEach(sp => {
      sp.y -= sp.speed;
      sp.x = sp.baseX + Math.sin(t + sp.phase) * 5;
      if (sp.y < -5) {
        sp.y = GAME_H + 5;
        sp.baseX = Phaser.Math.Between(10, GAME_W - 10);
      }
      sp.gfx.setPosition(sp.x, sp.y);
    });
  }

  _lcForest(cx, cy) {
    // Leaf explosion — multicolor
    const leafColors = [0x3A6030, 0x6A9040, 0xA0C060, 0xD0A030, 0xC06030];
    for (let i = 0; i < 15; i++) {
      const g = this._gfx(15);
      const angle = (Math.PI * 2 / 15) * i + Math.random() * 0.3;
      const dist = Phaser.Math.Between(30, 100);
      const tx = cx + Math.cos(angle) * dist;
      const ty = cy + Math.sin(angle) * dist;
      const col = leafColors[Phaser.Math.Between(0, leafColors.length - 1)];
      g.fillStyle(col, 0.8);
      g.fillEllipse(0, 0, 5, 3);
      g.setPosition(cx, cy);
      this._tw({
        targets: g, x: tx, y: ty, alpha: 0, angle: Phaser.Math.Between(0, 360),
        duration: 600, ease: 'Quad.easeOut',
        onComplete: () => g.clear()
      });
    }
    // Fireflies converge to center
    this.fireflies.forEach(f => {
      this._tw({
        targets: f.gfx, x: cx, y: cy, duration: 400, yoyo: true, ease: 'Sine.easeInOut'
      });
    });
    // Mini tree grows
    const treeG = this._gfx(15);
    treeG.fillStyle(0x3A6030, 0.6);
    treeG.beginPath();
    treeG.moveTo(cx - 8, cy);
    treeG.lineTo(cx, cy - 25);
    treeG.lineTo(cx + 8, cy);
    treeG.closePath();
    treeG.fillPath();
    treeG.fillStyle(0x2A4020, 0.5);
    treeG.fillRect(cx - 2, cy, 4, 10);
    treeG.setScale(0.1);
    this._tw({
      targets: treeG, scaleX: 1, scaleY: 1, alpha: 0,
      duration: 800, ease: 'Back.easeOut',
      onComplete: () => treeG.clear()
    });
  }

  // ════════════════════════════════════════════════════════════════════
  // 6. SAKURA
  // ════════════════════════════════════════════════════════════════════
  _buildSakura() {
    const s = this.scene;
    const rng = new Phaser.Math.RandomDataGenerator(['sakura42']);

    // ── Sky: 4-band gradient ──
    const grad = this._gfx(0);
    const bands = [
      { color: 0xfce4ec, y: 0, h: GAME_H * 0.2, a: 0.55 },
      { color: 0xf8bbd0, y: GAME_H * 0.2, h: GAME_H * 0.25, a: 0.5 },
      { color: 0xce93d8, y: GAME_H * 0.45, h: GAME_H * 0.25, a: 0.4 },
      { color: 0x2d1b3d, y: GAME_H * 0.7, h: GAME_H * 0.3, a: 0.55 },
    ];
    bands.forEach(b => { grad.fillStyle(b.color, b.a); grad.fillRect(0, b.y, GAME_W, b.h); });

    // ── Moon glow + moon ──
    const moonG = this._gfx(1);
    moonG.fillStyle(0xFFD060, 0.25);
    moonG.fillCircle(GAME_W - 55, 55, 50);
    moonG.fillStyle(0xFFD060, 0.7);
    moonG.fillCircle(GAME_W - 55, 55, 30);

    // ── Ambient glow center ──
    this._sakuraGlow = this._gfx(0);
    this._sakuraGlow.fillStyle(0xFF70A0, 0.04);
    this._sakuraGlow.fillCircle(GAME_W / 2, GAME_H / 2, 200);
    this._tw({ targets: this._sakuraGlow, alpha: 0.6, duration: 5000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    // ── Pink fog bands ──
    const fogG = this._gfx(1);
    fogG.fillStyle(0xFFB0C8, 0.06);
    fogG.fillEllipse(GAME_W / 2 - 40, GAME_H * 0.72, 300, 20);
    fogG.fillEllipse(GAME_W / 2 + 30, GAME_H * 0.78, 280, 18);

    // ── Branches with sub-branches and flowers ──
    const branchG = this._gfx(1);
    const branches = [
      { sx: 0, sy: 30, cx1: 80, cy1: 55, cx2: 160, cy2: 110, ex: 210, ey: 150 },
      { sx: GAME_W, sy: 45, cx1: GAME_W - 80, cy1: 70, cx2: GAME_W - 170, cy2: 100, ex: GAME_W - 230, ey: 140 },
      { sx: 0, sy: 100, cx1: 70, cy1: 140, cx2: 120, cy2: 180, ex: 160, ey: 220 },
      { sx: GAME_W, sy: 130, cx1: GAME_W - 60, cy1: 155, cx2: GAME_W - 110, cy2: 190, ex: GAME_W - 150, ey: 230 },
      { sx: 0, sy: 190, cx1: 50, cy1: 210, cx2: 90, cy2: 240, ex: 120, ey: 260 },
    ];
    const bezPt = (b, t) => {
      const it = 1 - t;
      return {
        x: it*it*it*b.sx + 3*it*it*t*b.cx1 + 3*it*t*t*b.cx2 + t*t*t*b.ex,
        y: it*it*it*b.sy + 3*it*it*t*b.cy1 + 3*it*t*t*b.cy2 + t*t*t*b.ey,
      };
    };
    branches.forEach(b => {
      // Main branch
      branchG.lineStyle(3, 0x4a1020, 0.8);
      branchG.beginPath();
      branchG.moveTo(b.sx, b.sy);
      for (let i = 1; i <= 24; i++) { const p = bezPt(b, i / 24); branchG.lineTo(p.x, p.y); }
      branchG.strokePath();
      // Sub-branches (thinner offshoots)
      for (let j = 0; j < 4; j++) {
        const t = 0.25 + j * 0.18;
        const p = bezPt(b, t);
        const ang = (b.sx === 0 ? 1 : -1) * (0.3 + rng.realInRange(-0.4, 0.4));
        const len = rng.between(15, 30);
        branchG.lineStyle(1, 0x4a1020, 0.5);
        branchG.lineBetween(p.x, p.y, p.x + Math.cos(ang) * len, p.y + Math.sin(ang) * len);
      }
      // Mini 5-petal flowers along branch
      for (let j = 0; j < rng.between(8, 10); j++) {
        const t = 0.1 + j * 0.09;
        const p = bezPt(b, Math.min(t, 0.95));
        const flowerCol = [0xFFB0C8, 0xFF8FAA, 0xFFC0D0][rng.between(0, 2)];
        for (let k = 0; k < 5; k++) {
          const a = (Math.PI * 2 / 5) * k;
          branchG.fillStyle(flowerCol, 0.6);
          branchG.fillCircle(p.x + Math.cos(a) * 4, p.y + Math.sin(a) * 4, 3);
        }
        branchG.fillStyle(0xFFE060, 0.7);
        branchG.fillCircle(p.x, p.y, 2);
      }
    });

    // ── Green leaves (subtle) ──
    const leafG = this._gfx(1);
    for (let i = 0; i < 5; i++) {
      leafG.fillStyle(0x4a8040, 0.2);
      leafG.fillEllipse(rng.between(20, GAME_W - 20), rng.between(50, 280), 4, 2);
    }

    // ── Petals — 30 falling, varied sizes ──
    this.petals = [];
    const petalColors = [0xFFB0C8, 0xFF8FAA, 0xFF70A0, 0xFFC0D0];
    for (let i = 0; i < 30; i++) {
      const g = this._gfx(2);
      const col = petalColors[rng.between(0, 3)];
      const alpha = rng.realInRange(0.5, 0.9);
      const pw = rng.realInRange(4, 8);
      const ph = rng.realInRange(2.5, 5);
      g.fillStyle(col, alpha);
      g.fillEllipse(0, 0, pw, ph);
      const startX = rng.realInRange(10, GAME_W - 10);
      const startY = rng.realInRange(-20, GAME_H);
      g.setPosition(startX, startY);
      const dur = rng.between(7000, 13000);
      const phase = rng.realInRange(0, Math.PI * 2);
      const petal = { gfx: g, baseX: startX, phase, vx: 0 };
      this.petals.push(petal);
      this._tw({
        targets: g, y: GAME_H + 20, duration: dur, repeat: -1,
        onRepeat: () => { g.y = -20; g.x = rng.realInRange(10, GAME_W - 10); petal.baseX = g.x; }
      });
      this._tw({ targets: g, angle: 360, duration: rng.between(3000, 6000), repeat: -1 });
    }

    // ── Breeze timer ──
    this._timer({
      delay: 6000, loop: true,
      callback: () => {
        const dir = Math.random() > 0.5 ? 2.5 : -2.5;
        this.petals.forEach(p => { p.vx = dir; });
        this._timer({ delay: 1200, callback: () => { this.petals.forEach(p => { p.vx = 0; }); } });
      }
    });

    // ── Floating lanterns ──
    for (let i = 0; i < 8; i++) {
      const g = this._gfx(2);
      g.fillStyle(0xFFA040, 0.12);
      g.fillCircle(0, 0, 8);
      g.fillStyle(0xFFB860, 0.5);
      g.fillCircle(0, 0, 4);
      g.fillStyle(0xFFDD90, 0.7);
      g.fillCircle(0, 0, 2);
      const lx = rng.realInRange(20, GAME_W - 20);
      const ly = rng.realInRange(30, GAME_H * 0.5);
      g.setPosition(lx, ly);
      this._tw({ targets: g, y: ly - 15, duration: rng.between(3000, 5000), yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      this._tw({ targets: g, alpha: rng.realInRange(0.5, 0.8), duration: rng.between(2000, 4000), yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }
  }

  _updateSakura(time, delta) {
    this.petals.forEach(p => {
      p.gfx.x = p.gfx.x + Math.sin(time * 0.001 + p.phase) * 0.3 + p.vx;
      if (p.gfx.x < -10) p.gfx.x = GAME_W + 10;
      if (p.gfx.x > GAME_W + 10) p.gfx.x = -10;
    });
  }

  _lcSakura(cx, cy) {
    // Petal whirlwind — 15 petals spiral out
    const petalColors = [0xFFB0C8, 0xFF8FAA, 0xFF70A0];
    for (let i = 0; i < 15; i++) {
      const g = this._gfx(15);
      const col = petalColors[i % 3];
      g.fillStyle(col, 0.7);
      g.fillEllipse(0, 0, 3, 2);
      g.setPosition(cx, cy);
      const angle = (Math.PI * 2 / 15) * i;
      const dist = 60 + Math.random() * 60;
      const tx = cx + Math.cos(angle) * dist;
      const ty = cy + Math.sin(angle) * dist;
      this._tw({
        targets: g, x: tx, y: ty, alpha: 0, angle: 360 + Phaser.Math.Between(0, 180),
        duration: 700, ease: 'Quad.easeOut',
        onComplete: () => g.clear()
      });
    }
    // Pink flash on line
    const flash = this._gfx(14);
    flash.fillStyle(0xFF70A0, 0.3);
    flash.fillRect(0, cy - 15, GAME_W, 30);
    this._tw({ targets: flash, alpha: 0, duration: 400, onComplete: () => flash.clear() });
  }

  // ════════════════════════════════════════════════════════════════════
  // 7. STORM
  // ════════════════════════════════════════════════════════════════════
  _buildStorm() {
    const s = this.scene;
    const rng = new Phaser.Math.RandomDataGenerator(['storm42']);

    // Storm clouds — 5 groups
    this.stormClouds = [];
    for (let i = 0; i < 5; i++) {
      const g = this._gfx(1);
      const bx = rng.realInRange(20, GAME_W - 20);
      const by = rng.realInRange(20, GAME_H * 0.35);
      for (let j = 0; j < 3; j++) {
        const alpha = rng.realInRange(0.4, 0.65);
        const rx = rng.realInRange(80, 150);
        const ry = rng.realInRange(30, 50);
        g.fillStyle(0x1A1A2A, alpha);
        g.fillEllipse(j * 30 - 30, j * 8 - 8, rx, ry);
      }
      g.setPosition(bx, by);
      const cloud = { gfx: g, baseX: bx };
      this.stormClouds.push(cloud);
      this._tw({
        targets: g, x: bx + rng.realInRange(-40, 40),
        duration: rng.between(8000, 15000), yoyo: true, repeat: -1, ease: 'Sine.easeInOut'
      });
    }

    // Rain — 50 drops (dense storm)
    this.rainDrops = [];
    for (let i = 0; i < 50; i++) {
      const g = this._gfx(2);
      const alpha = rng.realInRange(0.2, 0.4);
      const h = rng.between(0, 3) === 0 ? 12 : 8;
      g.fillStyle(0x6080AA, alpha);
      g.fillRect(0, 0, 1, h);
      g.setPosition(rng.realInRange(0, GAME_W), rng.realInRange(-30, GAME_H));
      g.setRotation(0.26); // ~15 degrees
      const dur = h === 12 ? rng.between(1500, 2000) : rng.between(2000, 2500);
      this.rainDrops.push({ gfx: g });
      this._tw({
        targets: g, y: GAME_H + 30, duration: dur, repeat: -1,
        onRepeat: () => { g.y = -30; g.x = rng.realInRange(0, GAME_W); }
      });
    }

    // Puddles — 3-4 at bottom
    this._puddles = [];
    for (let i = 0; i < 4; i++) {
      const g = this._gfx(1);
      g.fillStyle(0x3040A0, 0.05);
      const px = rng.realInRange(40, GAME_W - 40);
      const py = GAME_H - rng.realInRange(20, 60);
      g.fillEllipse(0, 0, rng.realInRange(40, 80), rng.realInRange(8, 15));
      g.setPosition(px, py);
      this._puddles.push(g);
    }

    // Lightning timer — every 5-8s
    this._timer({
      delay: rng.between(5000, 8000), loop: true,
      callback: () => {
        // Flash 1
        const flash = this._gfx(20);
        flash.fillStyle(0xE0E0FF, 0.25);
        flash.fillRect(0, 0, GAME_W, GAME_H);
        this._timer({ delay: 60, callback: () => flash.clear() });

        // Zigzag lightning
        const bolt = this._gfx(20);
        bolt.lineStyle(2, 0xFFFFFF, 1.0);
        bolt.beginPath();
        let lx = rng.realInRange(GAME_W * 0.2, GAME_W * 0.8);
        let ly = 0;
        bolt.moveTo(lx, ly);
        const segs = rng.between(4, 6);
        for (let s = 0; s < segs; s++) {
          lx += rng.realInRange(-30, 30);
          ly += GAME_H / segs;
          bolt.lineTo(lx, ly);
        }
        bolt.strokePath();
        this._timer({ delay: 150, callback: () => bolt.clear() });

        // Second softer flash
        this._timer({
          delay: 200,
          callback: () => {
            const f2 = this._gfx(20);
            f2.fillStyle(0xE0E0FF, 0.05);
            f2.fillRect(0, 0, GAME_W, GAME_H);
            this._timer({ delay: 100, callback: () => f2.clear() });
          }
        });

        // Puddle ripple
        this._puddles.forEach(p => {
          this._tw({ targets: p, scaleX: 1.05, scaleY: 1.05, duration: 200, yoyo: true });
        });
      }
    });

    // ── Wind streaks ──
    this._windStreaks = [];
    for (let i = 0; i < 8; i++) {
      const g = this._gfx(2);
      g.lineStyle(1, 0x6080AA, 0.08);
      g.lineBetween(0, 0, rng.realInRange(80, 150), 0);
      g.setPosition(rng.realInRange(-100, GAME_W), rng.realInRange(20, GAME_H * 0.6));
      this._windStreaks.push({ gfx: g });
    }
  }

  _updateStorm(time, delta) {
    // Wind streaks drift
    if (this._windStreaks) {
      this._windStreaks.forEach(w => {
        w.gfx.x += 0.8;
        if (w.gfx.x > GAME_W + 50) w.gfx.x = -150;
      });
    }
  }

  _lcStorm(cx, cy) {
    // Direct lightning bolt to cleared line
    const bolt = this._gfx(15);
    bolt.lineStyle(2, 0xFFFFFF, 0.9);
    bolt.beginPath();
    let lx = cx + Phaser.Math.Between(-30, 30);
    bolt.moveTo(lx, 0);
    const segs = 5;
    for (let i = 0; i < segs; i++) {
      lx += Phaser.Math.Between(-20, 20);
      const ly = (cy / segs) * (i + 1);
      bolt.lineTo(lx, ly);
    }
    bolt.strokePath();
    this._tw({ targets: bolt, alpha: 0, duration: 300, onComplete: () => bolt.clear() });

    // Flash
    const flash = this._gfx(14);
    flash.fillStyle(0xE0E0FF, 0.4);
    flash.fillRect(0, cy - 15, GAME_W, 30);
    this._tw({ targets: flash, alpha: 0, duration: 300, onComplete: () => flash.clear() });

    // Camera shake
    this.scene.cameras.main.shake(200, 0.008);
  }

  // ════════════════════════════════════════════════════════════════════
  // 8. DESERT
  // ════════════════════════════════════════════════════════════════════
  _buildDesert() {
    const s = this.scene;
    const rng = new Phaser.Math.RandomDataGenerator(['desert42']);

    // Sky gradient — dark sky at top, warm at bottom
    const skyG = this._gfx(0);
    skyG.fillStyle(0x0A0820, 0.8);
    skyG.fillRect(0, 0, GAME_W, GAME_H * 0.35);
    skyG.fillStyle(0x2A1800, 0.4);
    skyG.fillRect(0, GAME_H * 0.35, GAME_W, GAME_H * 0.35);
    skyG.fillStyle(0x3A2400, 0.3);
    skyG.fillRect(0, GAME_H * 0.7, GAME_W, GAME_H * 0.3);

    // ── Crescent moon ──
    const moonG = this._gfx(1);
    moonG.fillStyle(0xFFDD60, 0.6);
    moonG.fillCircle(GAME_W - 60, 50, 25);
    moonG.fillStyle(0xFFDD60, 0.12);
    moonG.fillCircle(GAME_W - 60, 50, 40);
    moonG.fillStyle(0x0A0820, 0.85);
    moonG.fillCircle(GAME_W - 48, 45, 22);

    // Stars in sky — 35 (bright desert night sky)
    const starG = this._gfx(1);
    for (let i = 0; i < 35; i++) {
      const sa = rng.realInRange(0.5, 1.0);
      const sr = rng.realInRange(0.8, 2.5);
      starG.fillStyle(0xFFFFFF, sa);
      starG.fillCircle(rng.realInRange(5, GAME_W - 5), rng.realInRange(5, GAME_H * 0.3), sr);
    }
    // A few bright stars with glow
    for (let i = 0; i < 5; i++) {
      const sx = rng.between(20, GAME_W - 20);
      const sy = rng.between(10, GAME_H * 0.25);
      starG.fillStyle(0xFFFFDD, 0.08);
      starG.fillCircle(sx, sy, 5);
      starG.fillStyle(0xFFFFFF, 0.9);
      starG.fillCircle(sx, sy, 1.5);
    }

    // Dunes — 5 overlapping curves (2 layers)
    const duneG = this._gfx(1);
    const duneConfigs = [
      // Back layer (darker, taller)
      { color: 0x1A1005, alpha: 0.35, yBase: GAME_H, h: 100, peakX: GAME_W * 0.5 },
      { color: 0x1A1005, alpha: 0.3, yBase: GAME_H, h: 90, peakX: GAME_W * 0.15 },
      // Front layer
      { color: 0x2A1A08, alpha: 0.6, yBase: GAME_H, h: 80, peakX: GAME_W * 0.3 },
      { color: 0x3A2810, alpha: 0.5, yBase: GAME_H, h: 60, peakX: GAME_W * 0.65 },
      { color: 0x2A1A08, alpha: 0.4, yBase: GAME_H, h: 45, peakX: GAME_W * 0.9 },
    ];
    duneConfigs.forEach(d => {
      duneG.fillStyle(d.color, d.alpha);
      duneG.beginPath();
      duneG.moveTo(0, d.yBase);
      // Smooth curve across bottom
      for (let x = 0; x <= GAME_W; x += 5) {
        const yOff = Math.sin((x - d.peakX) * 0.008) * d.h * 0.5 + Math.sin(x * 0.015) * d.h * 0.3;
        duneG.lineTo(x, d.yBase - d.h + yOff);
      }
      duneG.lineTo(GAME_W, d.yBase);
      duneG.closePath();
      duneG.fillPath();
    });

    // Floating sand — 20 particles
    this.sandParticles = [];
    for (let i = 0; i < 20; i++) {
      const g = this._gfx(2);
      g.fillStyle(0xD0A060, rng.realInRange(0.15, 0.35));
      g.fillCircle(0, 0, 1);
      const sx = rng.realInRange(0, GAME_W);
      const sy = rng.realInRange(GAME_H * 0.3, GAME_H);
      g.setPosition(sx, sy);
      this.sandParticles.push({ gfx: g, baseY: sy, phase: rng.realInRange(0, Math.PI * 2) });
      this._tw({
        targets: g, x: sx + rng.realInRange(-60, 60),
        duration: rng.between(6000, 12000), yoyo: true, repeat: -1, ease: 'Sine.easeInOut'
      });
    }

    // Heat shimmer — 2 horizontal bands
    for (let i = 0; i < 2; i++) {
      const g = this._gfx(2);
      g.fillStyle(0xFF8040, 0.02);
      g.fillRect(0, 0, GAME_W, 3);
      g.setPosition(0, GAME_H * 0.5 + i * 80);
      this._tw({
        targets: g, y: g.y + 5, duration: 3000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut'
      });
    }

    // Cactus silhouettes — 2 on edges
    const cactG = this._gfx(1);
    cactG.fillStyle(0x1A1000, 0.5);
    // Left cactus
    cactG.fillRect(25, GAME_H - 60, 6, 40);
    cactG.fillRect(15, GAME_H - 45, 10, 5);
    cactG.fillRect(15, GAME_H - 45, 5, -15);
    cactG.fillRect(31, GAME_H - 50, 10, 5);
    cactG.fillRect(36, GAME_H - 50, 5, -12);
    // Right cactus
    cactG.fillRect(GAME_W - 30, GAME_H - 50, 6, 35);
    cactG.fillRect(GAME_W - 40, GAME_H - 38, 10, 5);
    cactG.fillRect(GAME_W - 40, GAME_H - 38, 5, -12);

    // Scorpion silhouette walking slowly
    const scorpG = this._gfx(2);
    scorpG.fillStyle(0x1A1000, 0.15);
    // Body
    scorpG.fillEllipse(0, 0, 8, 4);
    // Claws
    scorpG.fillEllipse(-6, -3, 3, 2);
    scorpG.fillEllipse(-6, 3, 3, 2);
    // Tail (curved up)
    scorpG.lineStyle(1, 0x1A1000, 0.15);
    scorpG.beginPath();
    scorpG.moveTo(4, 0);
    scorpG.lineTo(7, -2);
    scorpG.lineTo(9, -5);
    scorpG.lineTo(10, -8);
    scorpG.lineTo(8, -9);
    scorpG.strokePath();
    scorpG.setPosition(-20, GAME_H - 18);
    this._tw({
      targets: scorpG,
      x: { from: -20, to: GAME_W + 20 },
      duration: 60000, repeat: -1, ease: 'Linear'
    });

    // ── Shooting stars ──
    const launchShootingStar = () => {
      const g = this._gfx(2);
      const startX = rng.realInRange(GAME_W * 0.2, GAME_W * 0.9);
      const startY = rng.realInRange(10, GAME_H * 0.2);
      g.lineStyle(1.5, 0xFFFFFF, 0.8);
      g.lineBetween(0, 0, -25, -8);
      g.lineStyle(1, 0xFFFFFF, 0.3);
      g.lineBetween(-25, -8, -50, -16);
      g.setPosition(startX, startY);
      g.setAlpha(0);
      this._tw({
        targets: g, x: startX - 120, y: startY + 60, alpha: { from: 0.9, to: 0 },
        duration: 800, ease: 'Quad.easeIn',
        onComplete: () => { g.clear(); }
      });
    };
    for (let i = 0; i < 3; i++) {
      this._timer({
        delay: rng.between(15000, 25000) + i * 5000, loop: true,
        callback: launchShootingStar
      });
    }
  }

  _updateDesert(time, delta) {
    this.sandParticles.forEach(p => {
      p.gfx.y = p.baseY + Math.sin(time * 0.0005 + p.phase) * 8;
    });
  }

  _lcDesert(cx, cy) {
    // Sandstorm burst — 30 particles horizontal
    for (let i = 0; i < 30; i++) {
      const g = this._gfx(15);
      g.fillStyle(0xD0A060, 0.4);
      g.fillCircle(0, 0, Phaser.Math.Between(1, 3));
      g.setPosition(cx, cy + Phaser.Math.Between(-15, 15));
      const dir = Math.random() > 0.5 ? 1 : -1;
      this._tw({
        targets: g, x: cx + dir * Phaser.Math.Between(60, 180), y: cy + Phaser.Math.Between(-30, 30), alpha: 0,
        duration: 500, ease: 'Quad.easeOut',
        onComplete: () => g.clear()
      });
    }
    // Flash
    const flash = this._gfx(14);
    flash.fillStyle(0xFFD080, 0.2);
    flash.fillRect(0, cy - 15, GAME_W, 30);
    this._tw({ targets: flash, alpha: 0, duration: 400, onComplete: () => flash.clear() });
  }

  // ════════════════════════════════════════════════════════════════════
  // 9. FROZEN
  // ════════════════════════════════════════════════════════════════════
  _buildFrozen() {
    const s = this.scene;
    const rng = new Phaser.Math.RandomDataGenerator(['frozen42']);

    // Gradient — darker at bottom
    const gradG = this._gfx(0);
    gradG.fillStyle(0x0A1830, 0.4);
    gradG.fillRect(0, GAME_H * 0.5, GAME_W, GAME_H * 0.5);

    // Snowy mountains in background
    const mtnG = this._gfx(0);
    mtnG.fillStyle(0x101830, 0.5);
    mtnG.beginPath();
    mtnG.moveTo(0, GAME_H * 0.7);
    mtnG.lineTo(60, GAME_H * 0.5);
    mtnG.lineTo(120, GAME_H * 0.62);
    mtnG.lineTo(180, GAME_H * 0.45);
    mtnG.lineTo(240, GAME_H * 0.58);
    mtnG.lineTo(310, GAME_H * 0.42);
    mtnG.lineTo(GAME_W, GAME_H * 0.6);
    mtnG.lineTo(GAME_W, GAME_H * 0.7);
    mtnG.closePath();
    mtnG.fillPath();
    // Snow caps
    mtnG.fillStyle(0xC0D8F0, 0.15);
    mtnG.beginPath();
    mtnG.moveTo(170, GAME_H * 0.45);
    mtnG.lineTo(180, GAME_H * 0.45);
    mtnG.lineTo(190, GAME_H * 0.48);
    mtnG.closePath();
    mtnG.fillPath();
    mtnG.beginPath();
    mtnG.moveTo(300, GAME_H * 0.42);
    mtnG.lineTo(310, GAME_H * 0.42);
    mtnG.lineTo(320, GAME_H * 0.46);
    mtnG.closePath();
    mtnG.fillPath();

    // Aurora borealis — 3 undulating bands (more visible)
    this.auroraBands = [];
    const auroraColors = [0x40FF80, 0x4080FF, 0x8040FF];
    const auroraAlphas = [0.15, 0.15, 0.15];
    for (let i = 0; i < 3; i++) {
      const g = this._gfx(1);
      // Wider bands with gradient effect
      g.fillStyle(auroraColors[i], auroraAlphas[i]);
      g.fillRect(0, 0, GAME_W, 20);
      g.fillStyle(auroraColors[i], auroraAlphas[i] * 0.5);
      g.fillRect(0, 20, GAME_W, 12);
      g.fillRect(0, -12, GAME_W, 12);
      const by = 35 + i * 35;
      g.setPosition(0, by);
      const band = { gfx: g, baseY: by, phase: i * 2 };
      this.auroraBands.push(band);
      // Y oscillation
      this._tw({
        targets: g, y: by - 20,
        duration: rng.between(5000, 9000), yoyo: true, repeat: -1, ease: 'Sine.easeInOut'
      });
      // Alpha oscillation
      this._tw({
        targets: g, alpha: 0.5,
        duration: rng.between(3000, 6000), yoyo: true, repeat: -1, ease: 'Sine.easeInOut'
      });
    }

    // Snowflakes — 35, 3 sizes
    this.snowflakes = [];
    for (let i = 0; i < 35; i++) {
      const g = this._gfx(2);
      const sizeType = i < 14 ? 0 : i < 25 ? 1 : 2; // small, medium, large
      const radius = [1, 2, 4][sizeType];
      const alpha = [0.35, 0.5, 0.65][sizeType];
      const dur = [10000, 7000, 5000][sizeType];
      g.fillStyle(0xFFFFFF, alpha);
      g.fillCircle(0, 0, radius);
      if (sizeType === 2) {
        // 6-pointed star lines for large snowflakes
        g.lineStyle(1, 0xFFFFFF, alpha * 0.8);
        for (let a = 0; a < 6; a++) {
          const ang = (Math.PI * 2 / 6) * a;
          g.lineBetween(Math.cos(ang) * -4, Math.sin(ang) * -4, Math.cos(ang) * 4, Math.sin(ang) * 4);
        }
      }
      const sx = rng.realInRange(5, GAME_W - 5);
      const sy = rng.realInRange(-20, GAME_H);
      g.setPosition(sx, sy);
      const phase = rng.realInRange(0, Math.PI * 2);
      this.snowflakes.push({ gfx: g, baseX: sx, phase });
      this._tw({
        targets: g, y: GAME_H + 20, duration: dur, repeat: -1,
        onRepeat: () => { g.y = -20; g.x = rng.realInRange(5, GAME_W - 5); }
      });
    }

    // Ice crystals — 3 hexagons, slow rotation
    this.iceCrystals = [];
    const crystalPositions = [
      { x: GAME_W * 0.15, y: GAME_H * 0.6, r: 30 },
      { x: GAME_W * 0.8, y: GAME_H * 0.4, r: 40 },
      { x: GAME_W * 0.5, y: GAME_H * 0.8, r: 50 },
    ];
    crystalPositions.forEach(cp => {
      const g = this._gfx(1);
      // Outer glow
      g.fillStyle(0x80C0FF, 0.08);
      g.fillCircle(0, 0, cp.r + 5);
      g.lineStyle(1, 0x80C0FF, 0.15);
      // Hexagon
      g.beginPath();
      for (let j = 0; j <= 6; j++) {
        const a = (Math.PI * 2 / 6) * j;
        const px = Math.cos(a) * cp.r;
        const py = Math.sin(a) * cp.r;
        if (j === 0) g.moveTo(px, py); else g.lineTo(px, py);
      }
      g.strokePath();
      // Inner star of 6 points
      g.lineStyle(1, 0x80C0FF, 0.12);
      for (let j = 0; j < 6; j++) {
        const a = (Math.PI * 2 / 6) * j;
        g.lineBetween(0, 0, Math.cos(a) * cp.r, Math.sin(a) * cp.r);
      }
      g.setPosition(cp.x, cp.y);
      this.iceCrystals.push(g);
      this._tw({ targets: g, angle: 360, duration: 30000, repeat: -1 });
    });

    // Frost on grid border
    const frostG = this._gfx(3);
    if (typeof GRID_X !== 'undefined' && typeof GRID_Y !== 'undefined') {
      const gw = GRID_CELL * 8;
      const gh = GRID_CELL * 8;
      frostG.lineStyle(1, 0x80C0FF, 0.1);
      frostG.strokeRect(GRID_X - 1, GRID_Y - 1, gw + 2, gh + 2);
      // Corner frost clusters
      const corners = [
        { x: GRID_X, y: GRID_Y },
        { x: GRID_X + gw, y: GRID_Y },
        { x: GRID_X, y: GRID_Y + gh },
        { x: GRID_X + gw, y: GRID_Y + gh },
      ];
      corners.forEach(c => {
        for (let k = 0; k < 4; k++) {
          frostG.fillStyle(0xC0E0FF, 0.15);
          frostG.fillCircle(c.x + rng.realInRange(-6, 6), c.y + rng.realInRange(-6, 6), rng.realInRange(1, 2));
        }
      });
    }
  }

  _updateFrozen(time, delta) {
    this.snowflakes.forEach(sf => {
      sf.gfx.x = sf.gfx.x + Math.sin(time * 0.0008 + sf.phase) * 0.2;
    });
  }

  _lcFrozen(cx, cy) {
    // Freeze blast — expanding ring
    const ring = this._gfx(15);
    ring.lineStyle(3, 0x80E0FF, 0.5);
    ring.strokeCircle(0, 0, 5);
    ring.setPosition(cx, cy);
    this._tw({
      targets: ring, scaleX: 12, scaleY: 12, alpha: 0,
      duration: 500, ease: 'Quad.easeOut',
      onComplete: () => ring.clear()
    });

    // 12 hexagonal crystals fly out
    for (let i = 0; i < 12; i++) {
      const g = this._gfx(15);
      g.lineStyle(1, 0x80C0FF, 0.7);
      g.beginPath();
      for (let j = 0; j <= 6; j++) {
        const a = (Math.PI * 2 / 6) * j;
        const px = Math.cos(a) * 4;
        const py = Math.sin(a) * 4;
        if (j === 0) g.moveTo(px, py); else g.lineTo(px, py);
      }
      g.strokePath();
      g.setPosition(cx, cy);
      const angle = (Math.PI * 2 / 12) * i;
      const dist = 50 + Math.random() * 60;
      this._tw({
        targets: g, x: cx + Math.cos(angle) * dist, y: cy + Math.sin(angle) * dist,
        alpha: 0, angle: 360,
        duration: 600, ease: 'Quad.easeOut',
        onComplete: () => g.clear()
      });
    }

    // Ice flash on line
    const flash = this._gfx(14);
    flash.fillStyle(0xC0E0FF, 0.4);
    flash.fillRect(0, cy - 15, GAME_W, 30);
    this._tw({ targets: flash, alpha: 0, duration: 500, onComplete: () => flash.clear() });
  }

  // ── Static preview for settings ────────────────────────────────────
  static drawPreview(scene, x, y, w, h, themeKey) {
    const t = BG_THEMES[themeKey];
    if (!t) return;
    const g = scene.add.graphics().setDepth(6);
    g.fillStyle(t.bg, 1);
    g.fillRoundedRect(x, y, w, h, 8);

    // Mini decorations per theme
    const cx = x + w / 2, cy = y + h / 2;
    switch (t.key) {
      case 'deepspace':
        g.fillStyle(0x6B2FA0, 0.15); g.fillCircle(cx - 10, cy - 8, 12);
        g.fillStyle(0x1A3A6B, 0.15); g.fillCircle(cx + 12, cy + 6, 10);
        for (let i = 0; i < 8; i++) { g.fillStyle(0xffffff, 0.6); g.fillCircle(x + Math.random() * w, y + Math.random() * h, 0.8); }
        break;
      case 'underwater':
        g.lineStyle(1, 0x60D0E0, 0.3);
        for (let i = 0; i < 5; i++) g.strokeCircle(x + 8 + i * 14, y + h - 10 - i * 8, 2 + i);
        g.fillStyle(0x40B0D0, 0.08); g.fillRect(x, y, w, h / 3);
        break;
      case 'sunset':
        g.fillStyle(0xE08030, 0.4); g.fillRect(x, y + h * 0.5, w, h * 0.3);
        g.fillStyle(0xFFD060, 0.7); g.fillCircle(cx, cy - 5, 8);
        g.fillStyle(0x0A0510, 0.8);
        for (let i = 0; i < 4; i++) g.fillRect(x + 5 + i * 18, y + h - 15 - i * 5, 12, 15 + i * 5);
        break;
      case 'neon':
        g.lineStyle(1, 0xFF00FF, 0.15);
        for (let lx = x + 10; lx < x + w; lx += 15) g.lineBetween(lx, y, lx, y + h);
        g.fillStyle(0x00FF88, 0.4);
        for (let i = 0; i < 4; i++) g.fillRect(x + 8 + i * 16, y + 10 + i * 12, 2, 8);
        break;
      case 'forest':
        g.fillStyle(0x061008, 0.5);
        g.beginPath(); g.moveTo(x + 10, y + h); g.lineTo(x + 18, y + 10); g.lineTo(x + 26, y + h); g.closePath(); g.fillPath();
        g.beginPath(); g.moveTo(x + w - 25, y + h); g.lineTo(x + w - 18, y + 15); g.lineTo(x + w - 10, y + h); g.closePath(); g.fillPath();
        g.fillStyle(0xA0FF40, 0.5);
        for (let i = 0; i < 5; i++) g.fillCircle(x + 15 + Math.random() * (w - 30), y + 10 + Math.random() * (h - 20), 1.5);
        break;
      case 'sakura':
        g.fillStyle(0x2A1025, 0.5); g.fillRoundedRect(x, y, w, h / 3, 4);
        g.lineStyle(2, 0x3A1A20, 0.6);
        g.beginPath(); g.moveTo(x, cy - 10); g.lineTo(cx, cy - 15); g.lineTo(x + w, cy - 5); g.strokePath();
        g.fillStyle(0xFF8FAA, 0.5);
        for (let i = 0; i < 8; i++) g.fillCircle(x + 8 + Math.random() * (w - 16), y + 8 + Math.random() * (h - 16), 1.5);
        break;
      case 'storm':
        g.fillStyle(0x1A1A2A, 0.4);
        g.fillEllipse(cx - 10, cy - 12, 30, 12); g.fillEllipse(cx + 8, cy - 8, 25, 10);
        g.lineStyle(2, 0xFFFFFF, 0.6);
        g.beginPath(); g.moveTo(cx, cy - 5); g.lineTo(cx - 4, cy + 5); g.lineTo(cx + 2, cy + 5); g.lineTo(cx - 2, cy + 15); g.strokePath();
        g.fillStyle(0x6080AA, 0.3);
        for (let i = 0; i < 6; i++) g.fillRect(x + 8 + i * 10, y + 10 + i * 6, 1, 6);
        break;
      case 'desert':
        g.fillStyle(0x0A0820, 0.8); g.fillRect(x, y, w, h * 0.4);
        g.fillStyle(0xffffff, 0.6);
        for (let i = 0; i < 6; i++) g.fillCircle(x + 5 + Math.random() * (w - 10), y + 3 + Math.random() * (h * 0.3), 0.8);
        g.fillStyle(0x3A2810, 0.5);
        g.beginPath(); g.moveTo(x, y + h); g.lineTo(x + w * 0.3, y + h * 0.6); g.lineTo(x + w * 0.6, y + h * 0.75); g.lineTo(x + w, y + h * 0.65); g.lineTo(x + w, y + h); g.closePath(); g.fillPath();
        break;
      case 'frozen':
        g.fillStyle(0x40FF80, 0.06); g.fillRect(x, y + 5, w, 4);
        g.fillStyle(0x4080FF, 0.05); g.fillRect(x, y + 12, w, 4);
        g.fillStyle(0x8040FF, 0.05); g.fillRect(x, y + 19, w, 3);
        g.fillStyle(0xFFFFFF, 0.4);
        for (let i = 0; i < 8; i++) g.fillCircle(x + 5 + Math.random() * (w - 10), y + 10 + Math.random() * (h - 15), 1);
        g.lineStyle(1, 0x80C0FF, 0.15);
        g.strokeCircle(cx + 12, cy + 8, 6);
        break;
    }
    return g;
  }
}

// Helper
function rnd(min, max) { return min + Math.random() * (max - min); }
