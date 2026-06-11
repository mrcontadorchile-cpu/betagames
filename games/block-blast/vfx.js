// VFX helpers — particles, screen shake, floating text

class VFX {
  constructor(scene) {
    this.scene = scene;
    this.particles = [];
  }

  // Burst of colored squares at world position
  explodeLine(cells, gridOriginX, gridOriginY, cellSize) {
    const scene = this.scene;
    cells.forEach(([col, row]) => {
      const cx = gridOriginX + col * cellSize + cellSize / 2;
      const cy = gridOriginY + row * cellSize + cellSize / 2;
      for (let i = 0; i < 8; i++) {
        const angle = (Math.PI * 2 * i) / 8 + Math.random() * 0.4;
        const speed = 80 + Math.random() * 120;
        const vx = Math.cos(angle) * speed;
        const vy = Math.sin(angle) * speed;
        const size = 4 + Math.random() * 5;
        const colors = [0xffd700, 0xff6b6b, 0x00d4ff, 0x2ecc71, 0xf39c12, 0xec407a];
        const color = colors[Math.floor(Math.random() * colors.length)];
        const rect = scene.add.rectangle(cx, cy, size, size, color);
        rect.setDepth(20);
        scene.tweens.add({
          targets: rect,
          x: cx + vx * 0.5,
          y: cy + vy * 0.5,
          alpha: 0,
          scaleX: 0.1,
          scaleY: 0.1,
          duration: 400 + Math.random() * 200,
          ease: 'Power2',
          onComplete: () => rect.destroy()
        });
      }
    });
  }

  screenShake(intensity = 6, duration = 250) {
    const scene = this.scene;
    if (scene.cameras && scene.cameras.main) {
      scene.cameras.main.shake(duration, intensity / 500);
    }
  }

  floatingScore(x, y, text, color = '#ffd700', fontSize = 28) {
    const scene = this.scene;
    const txt = scene.add.text(x, y, text, {
      fontFamily: 'Arial Black, Arial',
      fontSize: `${fontSize}px`,
      color: color,
      stroke: '#000000',
      strokeThickness: 4
    }).setOrigin(0.5).setDepth(30);

    scene.tweens.add({
      targets: txt,
      y: y - 80,
      alpha: 0,
      scaleX: 1.4,
      scaleY: 1.4,
      duration: 900,
      ease: 'Power2',
      onComplete: () => txt.destroy()
    });
  }

  comboText(x, y, combo) {
    const labels = ['', '', 'DOUBLE!', 'TRIPLE!', 'MEGA!', 'INSANE!'];
    const label = labels[Math.min(combo, labels.length - 1)] || `x${combo}`;
    if (!label) return;
    const colors = ['', '', '#00ff88', '#ffd700', '#ff6b6b', '#ff00ff'];
    const col = colors[Math.min(combo, colors.length - 1)] || '#ffffff';
    this.floatingScore(x, y, label, col, 36);
  }

  nearMissGlow(cells, gridOriginX, gridOriginY, cellSize, scene) {
    // Called externally — handled via tint in grid rendering
  }

  cellPlaceAnim(scene, x, y, size) {
    const flash = scene.add.rectangle(x + size / 2, y + size / 2, size - 2, size - 2, 0xffffff, 0.5);
    flash.setDepth(12);
    scene.tweens.add({
      targets: flash,
      alpha: 0,
      duration: 200,
      onComplete: () => flash.destroy()
    });
  }

  invalidDrop(scene, x, y) {
    if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(20);
    this.screenShake(3, 120);
    const ring = scene.add.graphics().setDepth(30);
    const state = { r: 8, a: 0.7 };
    scene.tweens.add({
      targets: state,
      r: 34,
      a: 0,
      duration: 260,
      ease: 'Quad.easeOut',
      onUpdate: () => {
        ring.clear();
        ring.lineStyle(3, 0xff3355, state.a);
        ring.strokeCircle(x, y, state.r);
      },
      onComplete: () => ring.destroy()
    });
  }

  lineSweep(cells, gridOriginX, gridOriginY, cellSize) {
    if (!cells.length) return;
    const scene = this.scene;
    const minC = Math.min(...cells.map(c => c[0]));
    const maxC = Math.max(...cells.map(c => c[0]));
    const minR = Math.min(...cells.map(c => c[1]));
    const maxR = Math.max(...cells.map(c => c[1]));
    const x = gridOriginX + minC * cellSize;
    const y = gridOriginY + minR * cellSize;
    const w = (maxC - minC + 1) * cellSize;
    const h = (maxR - minR + 1) * cellSize;
    const sweep = scene.add.rectangle(x, y, 8, h, 0xffffff, 0.55)
      .setOrigin(0, 0)
      .setDepth(19);

    scene.tweens.add({
      targets: sweep,
      x: x + w,
      alpha: 0,
      duration: 280,
      ease: 'Cubic.easeOut',
      onComplete: () => sweep.destroy()
    });
  }
}
