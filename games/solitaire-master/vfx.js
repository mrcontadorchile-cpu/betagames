const VFX = {
  particles: [],
  floatTexts: [],
  rings: [],

  spawnParticles(x, y, color, count=12) {
    for(let i=0; i<count; i++) {
      const angle = (Math.PI*2/count)*i + Math.random()*0.5;
      const speed = 2 + Math.random()*4;
      this.particles.push({
        x, y,
        vx: Math.cos(angle)*speed,
        vy: Math.sin(angle)*speed - 2,
        life: 1, decay: 0.025 + Math.random()*0.02,
        size: 3 + Math.random()*4,
        color
      });
    }
  },

  spawnFoundationBurst(x, y) {
    const colors = ['#ffd54f','#fff176','#ffecb3','#ffffff'];
    for(let i=0; i<20; i++) {
      const angle = Math.random()*Math.PI*2;
      const speed = 3 + Math.random()*5;
      const color = colors[Math.floor(Math.random()*colors.length)];
      this.particles.push({
        x, y,
        vx: Math.cos(angle)*speed,
        vy: Math.sin(angle)*speed - 3,
        life: 1, decay: 0.018 + Math.random()*0.015,
        size: 4 + Math.random()*5,
        color
      });
    }
  },

  spawnRing(x, y, color='#ffd54f') {
    this.rings.push({ x, y, r: 8, maxR: 56, color, life: 1, decay: 0.035 });
  },

  spawnWinBurst(cx, cy, W, H) {
    const colors = ['#ffd54f','#ff6b9d','#64b5f6','#69f0ae','#fff'];
    for(let i=0; i<80; i++) {
      const angle = Math.random()*Math.PI*2;
      const speed = 4 + Math.random()*8;
      const color = colors[Math.floor(Math.random()*colors.length)];
      this.particles.push({
        x: cx + (Math.random()-0.5)*W*0.6,
        y: cy + (Math.random()-0.5)*H*0.4,
        vx: Math.cos(angle)*speed,
        vy: Math.sin(angle)*speed - 5,
        life: 1, decay: 0.012 + Math.random()*0.01,
        size: 5 + Math.random()*7,
        color
      });
    }
  },

  addFloatText(x, y, text, color='#ffd54f', size=22) {
    this.floatTexts.push({ x, y, vy: -1.5, text, color, size, life: 1, decay: 0.02 });
  },

  update() {
    this.particles = this.particles.filter(p => {
      p.x += p.vx; p.y += p.vy;
      p.vy += 0.18; p.vx *= 0.97;
      p.life -= p.decay;
      return p.life > 0;
    });
    this.floatTexts = this.floatTexts.filter(f => {
      f.y += f.vy; f.life -= f.decay;
      return f.life > 0;
    });
    this.rings = this.rings.filter(r => {
      r.r += (r.maxR - r.r) * 0.14;
      r.life -= r.decay;
      return r.life > 0;
    });
  },

  draw(ctx) {
    this.rings.forEach(r => {
      ctx.save();
      ctx.globalAlpha = Math.max(0, r.life);
      ctx.strokeStyle = r.color;
      ctx.lineWidth = 3 * r.life;
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.r, 0, Math.PI*2);
      ctx.stroke();
      ctx.restore();
    });
    this.particles.forEach(p => {
      ctx.save();
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size*p.life, 0, Math.PI*2);
      ctx.fill();
      ctx.restore();
    });
    this.floatTexts.forEach(f => {
      ctx.save();
      ctx.globalAlpha = f.life;
      ctx.fillStyle = f.color;
      ctx.font = `bold ${f.size}px Arial Black`;
      ctx.textAlign = 'center';
      ctx.fillText(f.text, f.x, f.y);
      ctx.restore();
    });
  }
};
