'use strict';

const TEXTURE_SIZE = 64;
const BLOCK_TEXTURE_THEMES = [
  'classic', 'watermelon', 'metal', 'plush', 'rock', 'neon',
  'flowers', 'hearts', 'candy', 'gems', 'bubbles'
];

const TEXTURE_COLORS = {
  red:     { base: '#FF4444', light: '#FF7777', dark: '#CC2222', value: 0xff4444 },
  orange:  { base: '#FF8833', light: '#FFAA66', dark: '#CC6611', value: 0xff8833 },
  yellow:  { base: '#FFCC33', light: '#FFDD66', dark: '#CCAA11', value: 0xffcc33 },
  green:   { base: '#44CC44', light: '#77DD77', dark: '#22AA22', value: 0x44cc44 },
  cyan:    { base: '#44CCCC', light: '#77DDDD', dark: '#22AAAA', value: 0x44cccc },
  blue:    { base: '#4466FF', light: '#7799FF', dark: '#2244CC', value: 0x4466ff },
  purple:  { base: '#9944FF', light: '#BB77FF', dark: '#7722CC', value: 0x9944ff },
  pink:    { base: '#FF44AA', light: '#FF77CC', dark: '#CC2288', value: 0xff44aa },
};

const PIECE_COLOR_TO_TEXTURE = new Map([
  [0x00d4ff, 'cyan'], [0xff6b6b, 'red'], [0xffd700, 'yellow'],
  [0xff8c00, 'orange'], [0x9b59b6, 'purple'], [0x2ecc71, 'green'],
  [0xe74c3c, 'red'], [0xf39c12, 'orange'], [0x1abc9c, 'cyan'],
  [0xffffff, 'blue'], [0xec407a, 'pink'], [0x42a5f5, 'blue'],
  [0xab47bc, 'purple'], [0x26c6da, 'cyan'], [0x88ffcc, 'green'],
]);

if (typeof CanvasRenderingContext2D !== 'undefined' && !CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function(x, y, w, h, r) {
    const radius = Math.min(r || 0, w / 2, h / 2);
    this.moveTo(x + radius, y);
    this.lineTo(x + w - radius, y);
    this.quadraticCurveTo(x + w, y, x + w, y + radius);
    this.lineTo(x + w, y + h - radius);
    this.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
    this.lineTo(x + radius, y + h);
    this.quadraticCurveTo(x, y + h, x, y + h - radius);
    this.lineTo(x, y + radius);
    this.quadraticCurveTo(x, y, x + radius, y);
    return this;
  };
}

function createTextureCanvas(size) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  return { canvas, ctx };
}

function withRoundedClip(ctx, size, radius, draw) {
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(2, 2, size - 4, size - 4, radius);
  ctx.clip();
  draw();
  ctx.restore();
}

function drawGlassBlock(ctx, color, size, radius = 7) {
  const r = size - 4;
  const bg = ctx.createRadialGradient(size * 0.28, size * 0.22, 2, size * 0.72, size * 0.82, size * 0.82);
  bg.addColorStop(0, color.light);
  bg.addColorStop(0.52, color.base);
  bg.addColorStop(1, color.dark);
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.roundRect(2, 2, r, r, radius);
  ctx.fill();

  withRoundedClip(ctx, size, radius, () => {
    const shine = ctx.createLinearGradient(0, 2, 0, size * 0.42);
    shine.addColorStop(0, 'rgba(255,255,255,0.30)');
    shine.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = shine;
    ctx.fillRect(2, 2, r, size * 0.42);

    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.fillRect(6, size - 8, size - 12, 3);
  });

  ctx.strokeStyle = 'rgba(255,255,255,0.20)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(4, 4, size - 8, size - 8, Math.max(3, radius - 2));
  ctx.stroke();

  ctx.strokeStyle = 'rgba(0,0,0,0.34)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(2, 2, r, r, radius);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(size * 0.30, size * 0.30, size * 0.16, Math.PI * 1.05, Math.PI * 1.65);
  ctx.stroke();
}

function tintColor(color, tint) {
  return {
    base: tint.base || color.base,
    light: tint.light || color.light,
    dark: tint.dark || color.dark,
  };
}

function blendHex(hex1, hex2, t) {
  const r1 = parseInt(hex1.slice(1, 3), 16), g1 = parseInt(hex1.slice(3, 5), 16), b1 = parseInt(hex1.slice(5, 7), 16);
  const r2 = parseInt(hex2.slice(1, 3), 16), g2 = parseInt(hex2.slice(3, 5), 16), b2 = parseInt(hex2.slice(5, 7), 16);
  const r = Math.round(r1 + (r2 - r1) * t), g = Math.round(g1 + (g2 - g1) * t), b = Math.round(b1 + (b2 - b1) * t);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

function drawHeart(ctx, x, y, s) {
  ctx.beginPath();
  ctx.moveTo(x, y + s * 0.38);
  ctx.bezierCurveTo(x - s * 0.58, y - s * 0.10, x - s * 0.42, y - s * 0.65, x, y - s * 0.35);
  ctx.bezierCurveTo(x + s * 0.42, y - s * 0.65, x + s * 0.58, y - s * 0.10, x, y + s * 0.38);
  ctx.closePath();
  ctx.fill();
}

function generateBlockTexture(colorObj, size = TEXTURE_SIZE, themeKey = 'classic') {
  const { canvas, ctx } = createTextureCanvas(size);
  const color = colorObj || TEXTURE_COLORS.blue;

  ctx.shadowColor = 'rgba(0,0,0,0.20)';
  ctx.shadowBlur = 7;
  ctx.shadowOffsetY = 2;

  if (themeKey === 'classic') {
    drawGlassBlock(ctx, color, size, 7);
    return canvas;
  }

  ctx.shadowColor = 'transparent';
  switch (themeKey) {
    case 'watermelon': {
      drawGlassBlock(ctx, tintColor(color, { base: '#D94148', light: '#FF6B72', dark: '#A82230' }), size, 7);
      ctx.lineWidth = 5;
      ctx.strokeStyle = '#188A34';
      ctx.beginPath();
      ctx.roundRect(4, 4, size - 8, size - 8, 7);
      ctx.stroke();
      ctx.fillStyle = 'rgba(0,0,0,0.78)';
      [[0.34, 0.36], [0.58, 0.48], [0.42, 0.66]].forEach(([x, y]) => {
        ctx.beginPath();
        ctx.ellipse(size * x, size * y, 3, 5, -0.45, 0, Math.PI * 2);
        ctx.fill();
      });
      break;
    }
    case 'metal': {
      const grad = ctx.createLinearGradient(6, 6, size - 6, size - 6);
      grad.addColorStop(0, '#F7F9FF');
      grad.addColorStop(0.36, '#8790A0');
      grad.addColorStop(0.62, '#D5DAE4');
      grad.addColorStop(1, '#505866');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.roundRect(3, 3, size - 6, size - 6, 7);
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.45)';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.62)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(12, 12);
      ctx.lineTo(38, 38);
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.72)';
      ctx.beginPath();
      ctx.arc(17, 17, 5, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'plush': {
      // Puffy stuffed-toy pillow — warm pastels, visible fabric, button center
      const cR = parseInt(color.base.slice(1,3),16);
      const cG = parseInt(color.base.slice(3,5),16);
      const cB = parseInt(color.base.slice(5,7),16);
      const pR = Math.min(255, cR + 50), pG = Math.min(255, cG + 40), pB = Math.min(255, cB + 40);
      const pad = 3, s = size - pad*2, prad = size * 0.22;

      ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0;

      // Bottom shadow
      ctx.fillStyle = `rgba(${Math.floor(pR*0.5)},${Math.floor(pG*0.4)},${Math.floor(pB*0.4)},0.3)`;
      ctx.beginPath(); ctx.roundRect(pad+2, pad+3, s, s, prad); ctx.fill();

      // Puffy body — radial gradient (bright center, dark edges = inflated)
      const puff = ctx.createRadialGradient(size*0.4, size*0.38, size*0.05, size*0.5, size*0.5, size*0.6);
      puff.addColorStop(0, `rgb(${Math.min(255,pR+30)},${Math.min(255,pG+35)},${Math.min(255,pB+30)})`);
      puff.addColorStop(0.5, `rgb(${pR},${pG},${pB})`);
      puff.addColorStop(1, `rgb(${Math.floor(pR*0.7)},${Math.floor(pG*0.6)},${Math.floor(pB*0.6)})`);
      ctx.fillStyle = puff;
      ctx.beginPath(); ctx.roundRect(pad, pad, s, s, prad); ctx.fill();

      // Fabric knit texture
      ctx.save();
      ctx.beginPath(); ctx.roundRect(pad+1, pad+1, s-2, s-2, prad); ctx.clip();
      for (let ty = pad+3; ty < pad+s-2; ty += 5) {
        ctx.strokeStyle = (ty % 10 < 5) ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)';
        ctx.lineWidth = 0.5;
        ctx.beginPath(); ctx.moveTo(pad+3, ty); ctx.lineTo(pad+s-3, ty); ctx.stroke();
      }
      for (let tx = pad+3; tx < pad+s-2; tx += 5) {
        ctx.strokeStyle = 'rgba(0,0,0,0.03)'; ctx.lineWidth = 0.4;
        ctx.beginPath(); ctx.moveTo(tx, pad+3); ctx.lineTo(tx, pad+s-3); ctx.stroke();
      }
      ctx.restore();

      // Stitching
      ctx.setLineDash([3, 2.5]);
      ctx.strokeStyle = `rgba(${Math.min(255,pR+40)},${Math.min(255,pG+45)},${Math.min(255,pB+40)},0.6)`;
      ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.roundRect(pad+6, pad+6, s-12, s-12, Math.max(2, prad-4)); ctx.stroke();
      ctx.setLineDash([]);

      // Button with 4 holes + X thread
      const bx = size/2, by = size/2, br = size*0.07;
      ctx.fillStyle = 'rgba(0,0,0,0.12)';
      ctx.beginPath(); ctx.arc(bx+0.5, by+1, br+1, 0, Math.PI*2); ctx.fill();
      const btnG = ctx.createRadialGradient(bx-1, by-1, 0, bx, by, br);
      btnG.addColorStop(0, `rgb(${Math.min(255,pR+50)},${Math.min(255,pG+55)},${Math.min(255,pB+50)})`);
      btnG.addColorStop(1, `rgb(${pR},${pG},${pB})`);
      ctx.fillStyle = btnG;
      ctx.beginPath(); ctx.arc(bx, by, br, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,0.15)';
      const hd = br*0.4;
      [[-hd,-hd],[hd,-hd],[-hd,hd],[hd,hd]].forEach(([dx,dy]) => {
        ctx.beginPath(); ctx.arc(bx+dx, by+dy, 0.7, 0, Math.PI*2); ctx.fill();
      });
      ctx.strokeStyle = `rgba(${Math.min(255,pR+20)},${Math.min(255,pG+20)},${Math.min(255,pB+15)},0.5)`;
      ctx.lineWidth = 0.6;
      ctx.beginPath(); ctx.moveTo(bx-hd, by-hd); ctx.lineTo(bx+hd, by+hd); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(bx+hd, by-hd); ctx.lineTo(bx-hd, by+hd); ctx.stroke();

      // Edge highlights
      ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(pad+prad, pad+1.5); ctx.lineTo(pad+s-prad, pad+1.5); ctx.stroke();
      ctx.strokeStyle = 'rgba(0,0,0,0.10)';
      ctx.beginPath(); ctx.moveTo(pad+prad, pad+s-1); ctx.lineTo(pad+s-prad, pad+s-1); ctx.stroke();

      ctx.strokeStyle = `rgba(${Math.floor(pR*0.5)},${Math.floor(pG*0.4)},${Math.floor(pB*0.4)},0.25)`;
      ctx.lineWidth = 0.8;
      ctx.beginPath(); ctx.roundRect(pad, pad, s, s, prad); ctx.stroke();
      break;
    }
    case 'rock': {
      drawGlassBlock(ctx, tintColor(color, { base: '#6B6870', light: '#A2A0A8', dark: '#3A3840' }), size, 6);
      ctx.strokeStyle = 'rgba(20,20,24,0.55)';
      ctx.lineWidth = 2;
      [[12, 14, 29, 31, 40, 27], [20, 44, 34, 50, 47, 41]].forEach(p => {
        ctx.beginPath();
        ctx.moveTo(p[0], p[1]);
        ctx.lineTo(p[2], p[3]);
        ctx.lineTo(p[4], p[5]);
        ctx.stroke();
      });
      ctx.fillStyle = 'rgba(255,255,255,0.20)';
      [[16,35],[29,18],[45,33],[35,46],[49,20],[22,52]].forEach(([x,y]) => {
        ctx.beginPath(); ctx.arc(x, y, 1.4, 0, Math.PI * 2); ctx.fill();
      });
      break;
    }
    case 'neon': {
      ctx.fillStyle = '#020612';
      ctx.beginPath();
      ctx.roundRect(5, 5, size - 10, size - 10, 7);
      ctx.fill();
      [0.18, 0.38, 0.82].forEach((a, i) => {
        ctx.strokeStyle = color.base.replace(')', `,${a})`);
        ctx.strokeStyle = `rgba(${parseInt(color.base.slice(1,3),16)},${parseInt(color.base.slice(3,5),16)},${parseInt(color.base.slice(5,7),16)},${a})`;
        ctx.lineWidth = 8 - i * 2;
        ctx.beginPath();
        ctx.roundRect(7 + i * 5, 7 + i * 5, size - 14 - i * 10, size - 14 - i * 10, 7);
        ctx.stroke();
      });
      break;
    }
    case 'flowers': {
      drawGlassBlock(ctx, tintColor(color, { base: color.light, light: '#FFFFFF', dark: color.base }), size, 8);
      ctx.fillStyle = 'rgba(255,255,255,0.50)';
      for (let i = 0; i < 5; i++) {
        const a = i * Math.PI * 2 / 5;
        ctx.beginPath();
        ctx.arc(size / 2 + Math.cos(a) * 8, size / 2 + Math.sin(a) * 8, 6, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#FFE060';
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, 6, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'hearts': {
      const pad = 2;
      const s = size - pad * 2;
      const rad = 7;
      const cx = size / 2;
      const cy = size / 2 + 2;
      const chocolate = {
        top: '#E995AC',
        warm: '#D66F8D',
        base: '#C65A7B',
        deep: '#87334F',
        edge: '#502031'
      };

      ctx.shadowColor = 'rgba(39,8,18,0.36)';
      ctx.shadowBlur = 5;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 2;

      const baseGrad = ctx.createRadialGradient(size * 0.35, size * 0.22, 2, size * 0.66, size * 0.78, size * 0.78);
      baseGrad.addColorStop(0, chocolate.top);
      baseGrad.addColorStop(0.46, chocolate.warm);
      baseGrad.addColorStop(0.78, chocolate.base);
      baseGrad.addColorStop(1, chocolate.deep);
      ctx.fillStyle = baseGrad;
      ctx.beginPath();
      ctx.roundRect(pad, pad, s, s, rad);
      ctx.fill();

      ctx.shadowColor = 'transparent';
      withRoundedClip(ctx, size, rad, () => {
        const topPillow = ctx.createLinearGradient(0, pad, 0, pad + s * 0.28);
        topPillow.addColorStop(0, 'rgba(255,206,217,0.22)');
        topPillow.addColorStop(1, 'rgba(255,206,217,0)');
        ctx.fillStyle = topPillow;
        ctx.fillRect(pad + 4, pad + 2, s - 8, s * 0.32);

        const sideShade = ctx.createLinearGradient(pad, pad, pad + s, pad + s);
        sideShade.addColorStop(0, 'rgba(255,221,229,0.10)');
        sideShade.addColorStop(0.55, 'rgba(255,255,255,0)');
        sideShade.addColorStop(1, 'rgba(43,8,19,0.24)');
        ctx.fillStyle = sideShade;
        ctx.fillRect(pad, pad, s, s);
      });

      ctx.strokeStyle = 'rgba(255,213,222,0.20)';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.roundRect(pad + 3, pad + 3, s - 6, s - 7, rad - 2);
      ctx.stroke();

      ctx.strokeStyle = 'rgba(54,14,29,0.62)';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.roundRect(pad + 0.8, pad + 0.8, s - 1.6, s - 1.6, rad);
      ctx.stroke();

      ctx.strokeStyle = 'rgba(255,216,224,0.24)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.roundRect(9, 9, size - 18, size - 19, 5);
      ctx.stroke();

      const hs = s * 0.43;
      ctx.save();
      ctx.translate(1.7, 2.2);
      ctx.fillStyle = 'rgba(49,10,25,0.28)';
      drawHeart(ctx, cx, cy, hs);
      ctx.restore();

      const heartG = ctx.createRadialGradient(cx - 6, cy - 7, 2, cx + 3, cy + 7, hs * 0.78);
      heartG.addColorStop(0, '#EFA4B8');
      heartG.addColorStop(0.42, '#D06B8A');
      heartG.addColorStop(0.78, '#B84F73');
      heartG.addColorStop(1, '#8C2F52');
      ctx.fillStyle = heartG;
      drawHeart(ctx, cx, cy, hs);

      ctx.strokeStyle = 'rgba(83,20,39,0.36)';
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.moveTo(cx, cy + hs * 0.38);
      ctx.bezierCurveTo(cx - hs * 0.58, cy - hs * 0.10, cx - hs * 0.42, cy - hs * 0.65, cx, cy - hs * 0.35);
      ctx.bezierCurveTo(cx + hs * 0.42, cy - hs * 0.65, cx + hs * 0.58, cy - hs * 0.10, cx, cy + hs * 0.38);
      ctx.closePath();
      ctx.stroke();

      ctx.strokeStyle = 'rgba(255,209,220,0.24)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx - hs * 0.40, cy - hs * 0.22);
      ctx.bezierCurveTo(cx - hs * 0.30, cy - hs * 0.52, cx - hs * 0.08, cy - hs * 0.48, cx, cy - hs * 0.33);
      ctx.stroke();

      ctx.fillStyle = 'rgba(255,220,228,0.16)';
      ctx.beginPath();
      ctx.arc(cx - 10, cy - 10, 1.6, 0, Math.PI * 2);
      ctx.fill();

      break;
    }
    case 'candy': {
      drawGlassBlock(ctx, color, size, 10);
      withRoundedClip(ctx, size, 10, () => {
        ctx.strokeStyle = 'rgba(255,255,255,0.30)';
        ctx.lineWidth = 6;
        for (let x = -size; x < size * 2; x += 18) {
          ctx.beginPath();
          ctx.moveTo(x, size + 6);
          ctx.lineTo(x + size, -6);
          ctx.stroke();
        }
        ctx.fillStyle = 'rgba(255,255,255,0.18)';
        ctx.fillRect(6, 7, 5, size - 14);
      });
      break;
    }
    case 'gems': {
      drawGlassBlock(ctx, color, size, 5);
      withRoundedClip(ctx, size, 5, () => {
        ctx.fillStyle = 'rgba(255,255,255,0.28)';
        ctx.beginPath(); ctx.moveTo(size / 2, 4); ctx.lineTo(4, 30); ctx.lineTo(size - 4, 30); ctx.closePath(); ctx.fill();
        ctx.fillStyle = 'rgba(0,0,0,0.20)';
        ctx.beginPath(); ctx.moveTo(size / 2, size - 4); ctx.lineTo(4, 30); ctx.lineTo(size - 4, 30); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.28)';
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(4, 4); ctx.lineTo(size - 4, size - 4); ctx.moveTo(size - 4, 4); ctx.lineTo(4, size - 4); ctx.stroke();
      });
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      ctx.beginPath(); ctx.arc(18, 17, 4, 0, Math.PI * 2); ctx.fill();
      break;
    }
    case 'bubbles': {
      // Soap bubble — transparent sphere with rainbow iridescence
      const bcx = size / 2, bcy = size / 2, brad = size / 2 - 3;
      const cR = parseInt(color.base.slice(1,3),16);
      const cG = parseInt(color.base.slice(3,5),16);
      const cB = parseInt(color.base.slice(5,7),16);

      ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0;

      // Ground shadow (bubble floats)
      ctx.fillStyle = 'rgba(0,0,0,0.10)';
      ctx.beginPath();
      ctx.ellipse(bcx, bcy + brad*0.85, brad*0.5, brad*0.1, 0, 0, Math.PI*2);
      ctx.fill();

      // === 1. TRANSPARENT BUBBLE FILL ===
      ctx.globalAlpha = 0.55;
      const bubFill = ctx.createRadialGradient(bcx*0.6, bcy*0.55, 2, bcx, bcy, brad);
      bubFill.addColorStop(0, `rgba(${Math.min(255,cR+100)},${Math.min(255,cG+100)},${Math.min(255,cB+100)},0.7)`);
      bubFill.addColorStop(0.4, `rgba(${Math.min(255,cR+40)},${Math.min(255,cG+40)},${Math.min(255,cB+40)},0.4)`);
      bubFill.addColorStop(1, `rgba(${cR},${cG},${cB},0.25)`);
      ctx.fillStyle = bubFill;
      ctx.beginPath(); ctx.arc(bcx, bcy, brad, 0, Math.PI*2); ctx.fill();
      ctx.globalAlpha = 1.0;

      // === 2. IRIDESCENT RAINBOW FILM ===
      // Top-left: pink/magenta arc
      ctx.strokeStyle = 'rgba(255,100,180,0.18)'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(bcx, bcy, brad*0.85, Math.PI*1.1, Math.PI*1.5); ctx.stroke();
      // Left: cyan arc
      ctx.strokeStyle = 'rgba(80,220,255,0.15)'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(bcx, bcy, brad*0.78, Math.PI*1.3, Math.PI*1.7); ctx.stroke();
      // Bottom-right: green/yellow arc
      ctx.strokeStyle = 'rgba(180,255,100,0.12)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(bcx, bcy, brad*0.82, Math.PI*0.2, Math.PI*0.6); ctx.stroke();
      // Bottom: purple arc
      ctx.strokeStyle = 'rgba(160,100,255,0.10)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(bcx, bcy, brad*0.75, Math.PI*0.5, Math.PI*0.9); ctx.stroke();

      // === 3. OUTER THIN FILM RING ===
      ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.arc(bcx, bcy, brad, 0, Math.PI*2); ctx.stroke();
      // Inner ring with color tint
      ctx.strokeStyle = `rgba(${cR},${cG},${cB},0.15)`; ctx.lineWidth = 0.6;
      ctx.beginPath(); ctx.arc(bcx, bcy, brad-1.5, 0, Math.PI*2); ctx.stroke();

      // === 4. MAIN CRESCENT REFLECTION (window reflection) ===
      ctx.strokeStyle = 'rgba(255,255,255,0.50)'; ctx.lineWidth = 2.8;
      ctx.beginPath();
      ctx.arc(bcx - brad*0.12, bcy - brad*0.12, brad*0.55, Math.PI*1.15, Math.PI*1.7);
      ctx.stroke();
      // Softer outer crescent
      ctx.strokeStyle = 'rgba(255,255,255,0.15)'; ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(bcx - brad*0.1, bcy - brad*0.1, brad*0.65, Math.PI*1.2, Math.PI*1.6);
      ctx.stroke();

      // === 5. HIGHLIGHT DOTS ===
      // Main bright dot (top-left)
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      ctx.beginPath(); ctx.arc(bcx - brad*0.32, bcy - brad*0.32, size*0.06, 0, Math.PI*2); ctx.fill();
      // Secondary dot (smaller, offset)
      ctx.fillStyle = 'rgba(255,255,255,0.30)';
      ctx.beginPath(); ctx.arc(bcx - brad*0.15, bcy - brad*0.45, size*0.03, 0, Math.PI*2); ctx.fill();
      // Faint bottom-right dot
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      ctx.beginPath(); ctx.arc(bcx + brad*0.3, bcy + brad*0.3, size*0.025, 0, Math.PI*2); ctx.fill();

      break;
    }
    default:
      drawGlassBlock(ctx, color, size, 7);
  }
  return canvas;
}

function generateEmptyCellTexture(size = TEXTURE_SIZE) {
  const { canvas, ctx } = createTextureCanvas(size);
  const grad = ctx.createRadialGradient(size / 2, size / 2, 2, size / 2, size / 2, size * 0.72);
  grad.addColorStop(0, '#1a1a3a');
  grad.addColorStop(1, '#111128');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.roundRect(2, 2, size - 4, size - 4, 4);
  ctx.fill();

  const edge = ctx.createLinearGradient(0, 0, 0, size);
  edge.addColorStop(0, 'rgba(0,0,0,0.10)');
  edge.addColorStop(0.18, 'rgba(0,0,0,0)');
  edge.addColorStop(0.82, 'rgba(0,0,0,0)');
  edge.addColorStop(1, 'rgba(0,0,0,0.10)');
  ctx.fillStyle = edge;
  ctx.beginPath();
  ctx.roundRect(2, 2, size - 4, size - 4, 4);
  ctx.fill();

  ctx.strokeStyle = 'rgba(42,42,90,0.30)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(2.5, 2.5, size - 5, size - 5, 4);
  ctx.stroke();
  return canvas;
}

function generateGridTexture(width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width + 24;
  canvas.height = height + 24;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.shadowColor = 'rgba(0,0,0,0.34)';
  ctx.shadowBlur = 18;
  ctx.shadowOffsetY = 8;
  ctx.fillStyle = '#0d1433';
  ctx.beginPath();
  ctx.roundRect(12, 12, width, height, 12);
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.strokeStyle = '#2a2a5a';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(12, 12, width, height, 12);
  ctx.stroke();
  return canvas;
}

function addCanvasTexture(scene, key, canvas) {
  if (scene.textures.exists(key)) return;
  scene.textures.addCanvas(key, canvas);
}

function getBlockColorName(color) {
  if (PIECE_COLOR_TO_TEXTURE.has(color)) return PIECE_COLOR_TO_TEXTURE.get(color);
  let bestName = 'blue';
  let bestDist = Infinity;
  const r = (color >> 16) & 0xff;
  const g = (color >> 8) & 0xff;
  const b = color & 0xff;
  Object.entries(TEXTURE_COLORS).forEach(([name, c]) => {
    const cr = (c.value >> 16) & 0xff;
    const cg = (c.value >> 8) & 0xff;
    const cb = c.value & 0xff;
    const d = (r - cr) ** 2 + (g - cg) ** 2 + (b - cb) ** 2;
    if (d < bestDist) { bestDist = d; bestName = name; }
  });
  return bestName;
}

function getBlockTextureKey(color, themeKey = 'classic') {
  const theme = BLOCK_TEXTURE_THEMES.includes(themeKey) ? themeKey : 'classic';
  return `block_${theme}_${getBlockColorName(color)}`;
}

function generateAllTextures(scene) {
  Object.entries(TEXTURE_COLORS).forEach(([name, color]) => {
    BLOCK_TEXTURE_THEMES.forEach(theme => {
      addCanvasTexture(scene, `block_${theme}_${name}`, generateBlockTexture(color, TEXTURE_SIZE, theme));
    });
  });
  addCanvasTexture(scene, 'empty_cell', generateEmptyCellTexture(TEXTURE_SIZE));
  addCanvasTexture(scene, 'grid_board', generateGridTexture(GRID_W + 8, GRID_H + 8));
}
