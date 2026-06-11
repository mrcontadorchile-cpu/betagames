// Solitaire Master — FreeCell
// Suits: 0=♠ 1=♥ 2=♦ 3=♣
// Ranks: 1=A ... 13=K

const SUITS = ['♠','♥','♦','♣'];
const SUIT_COLORS = ['#1a1a2e','#e53935','#e53935','#1a1a2e'];
const RANKS = ['','A','2','3','4','5','6','7','8','9','10','J','Q','K'];

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// ── Layout constants (scaled at runtime) ──
let W, H, CARD_W, CARD_H, CARD_R;
let COL_X = [], COL_Y_START;
let FREE_X = [], FREE_Y;
let FOUND_X = [], FOUND_Y;

// ── Game state ──
let freeCells = [null,null,null,null];
let foundations = [0,0,0,0]; // top rank per suit (0=empty)
let cascades = []; // 8 arrays of cards
let selected = null; // {source:'free'|'cascade'|null, idx, cards:[]}
let moves = 0, score = 0, bestScore = 0;
let gamesWon = 0, gamesPlayed = 0;
let winStreak = 0, bestWinStreak = 0;
let comboCount = 0, lastFoundTime = 0;
let gameState = 'menu'; // menu | playing | win | settings | pause
let gameOverCount = 0;
let animCards = []; // flying cards for win animation
let bgStars = [], bgOrbs = [];
let bgWaveOffset = 0;
let undoStack = [];
let flights = [];      // animated card moves
let winBounce = [];    // bouncing cards on win
let scorePop = 0, lastScore = 0;
let hintCard = null, hintTarget = null, hintTimer = 0;
let startTime = 0, elapsedTime = 0;
let pausedAt = 0, pausedTotal = 0;
let lastMilestone = 0, flowPulse = 0;
let coachAlert = null; // {title, detail, timer, x, y}
let blockedSeq = null; // {col, row, len, timer, type}
let currentDifficulty = 'medium';
let settingsReturnState = 'playing';

const DIFFICULTIES = {
  basic: { label: 'Easy', scoreMult: 0.85 },
  medium: { label: 'Medium', scoreMult: 1 },
  advanced: { label: 'Hard', scoreMult: 1.2 }
};

// Progress unlock tracking
let totalFoundations = 0; // foundations placed this game

function resize() {
  const winW = window.innerWidth;
  const winH = window.innerHeight;
  const targetRatio = 9/16;
  // Internal resolution capped for consistent card rendering
  W = 420;
  H = Math.floor(W / targetRatio);
  canvas.width = W;
  canvas.height = H;
  // Display size: scale to fill viewport while keeping aspect ratio
  let dispH, dispW;
  if(winW / winH > targetRatio) {
    dispH = winH;
    dispW = Math.floor(dispH * targetRatio);
  } else {
    dispW = winW;
    dispH = Math.floor(dispW / targetRatio);
  }
  canvas.style.width = dispW + 'px';
  canvas.style.height = dispH + 'px';

  // Card size: fit 8 columns in width with margins
  const margin = W * 0.012;
  CARD_W = Math.floor((W - margin*9) / 8);
  CARD_H = Math.floor(CARD_W * 1.4);
  CARD_R = Math.floor(CARD_W * 0.1);

  // Top row: free cells (4) + foundations (4)
  FREE_Y = H * 0.04;
  FOUND_Y = FREE_Y;
  const topRowW = CARD_W * 8 + margin * 7;
  const topRowX = (W - topRowW) / 2;
  for(let i=0; i<4; i++) FREE_X[i] = topRowX + i * (CARD_W + margin);
  for(let i=0; i<4; i++) FOUND_X[i] = topRowX + (i+4) * (CARD_W + margin);

  // Cascade columns
  COL_Y_START = FREE_Y + CARD_H + H * 0.025;
  for(let i=0; i<8; i++) COL_X[i] = topRowX + i * (CARD_W + margin);
}

// ── Card drawing ──
function drawCard(x, y, rank, suit, faceUp, selected=false, hint=false) {
  const theme = ThemeManager.get();
  const r = CARD_R;
  ctx.save();

  if(hint) {
    ctx.shadowColor = '#ffd54f';
    ctx.shadowBlur = 14;
  }
  if(selected) {
    ctx.shadowColor = '#ffd54f';
    ctx.shadowBlur = 14 + Math.sin(Date.now()*0.008)*6;
  }

  // Card background
  ctx.beginPath();
  roundRect(ctx, x, y, CARD_W, CARD_H, r);
  if(faceUp) {
    ctx.fillStyle = theme.cardBg;
  } else {
    const grad = ctx.createLinearGradient(x, y, x+CARD_W, y+CARD_H);
    grad.addColorStop(0, theme.cardBack[0]);
    grad.addColorStop(1, theme.cardBack[1]);
    ctx.fillStyle = grad;
  }
  ctx.fill();

  // Border
  ctx.strokeStyle = selected ? '#ffd54f' : theme.cardBorder;
  ctx.lineWidth = selected ? 2.5 : 1;
  ctx.stroke();

  if(faceUp && rank > 0) {
    const color = SUIT_COLORS[suit];
    const fontSize = Math.max(10, Math.floor(CARD_W * 0.28));
    ctx.fillStyle = color;
    ctx.font = `bold ${fontSize}px Arial`;
    ctx.textAlign = 'left';
    ctx.fillText(RANKS[rank], x+3, y+fontSize+1);

    const suitSize = Math.max(8, Math.floor(fontSize*0.85));
    ctx.font = `${suitSize}px Arial`;
    ctx.fillText(SUITS[suit], x+3, y+fontSize+suitSize+1);

    // Center suit symbol
    const bigSuit = Math.floor(CARD_W * 0.42);
    ctx.font = `${bigSuit}px Arial`;
    ctx.textAlign = 'center';
    ctx.fillText(SUITS[suit], x+CARD_W/2, y+CARD_H/2+bigSuit*0.35);

    // Bottom corner (rotated)
    ctx.save();
    ctx.translate(x+CARD_W-3, y+CARD_H-3);
    ctx.rotate(Math.PI);
    ctx.font = `bold ${fontSize}px Arial`;
    ctx.textAlign = 'left';
    ctx.fillStyle = color;
    ctx.fillText(RANKS[rank], 0, fontSize);
    ctx.restore();
  } else if(!faceUp) {
    // Premium card back: inner frame + diagonal lattice + glowing medallion
    const inset = Math.max(3, CARD_W*0.08);
    ctx.strokeStyle = theme.accent;
    ctx.globalAlpha = 0.55;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    roundRect(ctx, x+inset, y+inset, CARD_W-inset*2, CARD_H-inset*2, CARD_R*0.6);
    ctx.stroke();
    // Lattice
    ctx.globalAlpha = 0.14;
    ctx.lineWidth = 1;
    ctx.save();
    ctx.beginPath();
    roundRect(ctx, x+inset, y+inset, CARD_W-inset*2, CARD_H-inset*2, CARD_R*0.6);
    ctx.clip();
    const step = Math.max(6, CARD_W*0.18);
    for(let d=-CARD_H; d<CARD_W+CARD_H; d+=step) {
      ctx.beginPath(); ctx.moveTo(x+d, y); ctx.lineTo(x+d+CARD_H, y+CARD_H); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x+d, y+CARD_H); ctx.lineTo(x+d+CARD_H, y); ctx.stroke();
    }
    ctx.restore();
    // Medallion
    const mcx = x+CARD_W/2, mcy = y+CARD_H/2, mr = CARD_W*0.26;
    ctx.globalAlpha = 0.9;
    ctx.shadowColor = theme.accent;
    ctx.shadowBlur = 8;
    ctx.strokeStyle = theme.accent;
    ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.arc(mcx, mcy, mr, 0, Math.PI*2); ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.fillStyle = theme.accent;
    ctx.font = `${Math.floor(mr*1.1)}px Arial`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('♠', mcx, mcy+1);
    ctx.textBaseline = 'alphabetic';
    ctx.globalAlpha = 1;
  }

  ctx.restore();
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x+r, y);
  ctx.lineTo(x+w-r, y);
  ctx.quadraticCurveTo(x+w, y, x+w, y+r);
  ctx.lineTo(x+w, y+h-r);
  ctx.quadraticCurveTo(x+w, y+h, x+w-r, y+h);
  ctx.lineTo(x+r, y+h);
  ctx.quadraticCurveTo(x, y+h, x, y+h-r);
  ctx.lineTo(x, y+r);
  ctx.quadraticCurveTo(x, y, x+r, y);
  ctx.closePath();
}

function drawEmptySlot(x, y, label='', dashed=true) {
  const theme = ThemeManager.get();
  ctx.save();
  ctx.strokeStyle = theme.feltBorder;
  ctx.lineWidth = 1.5;
  if(dashed) ctx.setLineDash([4,4]);
  ctx.globalAlpha = 0.5;
  ctx.beginPath();
  roundRect(ctx, x, y, CARD_W, CARD_H, CARD_R);
  ctx.stroke();
  if(label) {
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = theme.text;
    ctx.font = `bold ${Math.floor(CARD_W*0.3)}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, x+CARD_W/2, y+CARD_H/2);
  }
  ctx.restore();
}

function haptic(pattern) {
  if(navigator.vibrate) navigator.vibrate(pattern);
}

function foundationProgress() {
  return totalFoundations / 52;
}

function getNextUnlock() {
  const unlockThresholds = [
    ...ThemeManager.THEMES.map(t => t.unlockScore),
    ...ThemeManager.BG_STYLES.map(b => b.unlockScore)
  ].filter(t => t > bestScore).sort((a,b) => a-b);
  return unlockThresholds[0] || null;
}

function getUnlockThresholds() {
  return [
    ...ThemeManager.THEMES.map(t => t.unlockScore),
    ...ThemeManager.BG_STYLES.map(b => b.unlockScore)
  ].filter((value, index, arr) => value > 0 && arr.indexOf(value) === index).sort((a,b) => a-b);
}

function difficultyRect(id) {
  const keys = ['basic','medium','advanced'];
  const i = keys.indexOf(id);
  return { x: W*0.14 + i*W*0.245, y: H*0.735, w: W*0.22, h: H*0.052 };
}

function pauseButtonRect(i) {
  return { x: W*0.18, y: H*(0.42 + i*0.105), w: W*0.64, h: H*0.072 };
}

function prepareDeckForDifficulty(deck, level) {
  if(level === 'basic') {
    // Easy: ensure some aces are near column bottoms and create a few
    // natural sequences, but still require player moves to solve.
    // Shuffle fully first, then nudge a couple of aces toward accessible spots.
    for(let nudged=0, i=0; i<deck.length && nudged<2; i++) {
      if(deck[i].rank === 1) {
        // Move ace to a cascade bottom position (indices 0,7,14,21 = first card of each col)
        const target = [6, 13, 20, 27][nudged]; // last card dealt to cols 0-3
        [deck[i], deck[target]] = [deck[target], deck[i]];
        nudged++;
      }
    }
    // Create 2-3 natural stackable pairs near column tops
    for(let col=0; col<3; col++) {
      const topIdx = col < 4 ? col*7+6 : col*6+30; // top card of column
      const belowIdx = topIdx - 1;
      if(belowIdx < 0) continue;
      const top = deck[topIdx];
      // Find a card that can stack on top (rank-1, opposite color)
      for(let j=topIdx+1; j<deck.length; j++) {
        if(deck[j].rank === top.rank - 1 && (deck[j].suit % 2) !== (top.suit % 2)) {
          // Swap into the position above top so they're adjacent in column
          [deck[belowIdx], deck[j]] = [deck[j], deck[belowIdx]];
          break;
        }
      }
    }
  } else if(level === 'advanced') {
    // Hard: bury aces deep and break natural sequences
    // Move all aces to early deal positions (deep in columns)
    const aces = [];
    for(let i=deck.length-1; i>=0; i--) {
      if(deck[i].rank === 1) aces.push(i);
    }
    const deepSlots = [0, 7, 14, 21]; // first card of cols 0-3 (bottom)
    aces.forEach((aceIdx, k) => {
      if(k < deepSlots.length) {
        [deck[aceIdx], deck[deepSlots[k]]] = [deck[deepSlots[k]], deck[aceIdx]];
      }
    });
    // Break any natural sequences in the top 3 cards of each column
    for(let col=0; col<8; col++) {
      const base = col < 4 ? col*7 : 28 + (col-4)*6;
      const len = col < 4 ? 7 : 6;
      const top = base + len - 1;
      if(top-1 >= base) {
        const a = deck[top], b = deck[top-1];
        if(a.rank === b.rank - 1 && (a.suit%2) !== (b.suit%2)) {
          // Break the pair by swapping top card with something random from another col
          const rndCol = (col + 1 + Math.floor(Math.random()*6)) % 8;
          const rndBase = rndCol < 4 ? rndCol*7 : 28 + (rndCol-4)*6;
          const rndLen = rndCol < 4 ? 7 : 6;
          const rndIdx = rndBase + Math.floor(Math.random() * rndLen);
          [deck[top], deck[rndIdx]] = [deck[rndIdx], deck[top]];
        }
      }
    }
  }
}

function currentPlayTime() {
  if(!startTime) return 0;
  const activePause = pausedAt ? Date.now() - pausedAt : 0;
  return Math.max(0, Date.now() - startTime - pausedTotal - activePause);
}

function enterPause() {
  pausedAt = Date.now();
  gameState = 'pause';
}

function resumeFromPause() {
  if(pausedAt) {
    pausedTotal += Date.now() - pausedAt;
    pausedAt = 0;
  }
  gameState = 'playing';
  AdsManager.gameplayStart();
  AudioManager._resumeBg();
}

function formatTime(ms) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, '0')}`;
}

function rewardMove(text, x, y, color='#d9f7ff') {
  VFX.addFloatText(x, y, text, color, Math.max(16, Math.floor(W*0.045)));
  flowPulse = 18;
}

function invalidFeedback(text='Invalid') {
  VFX.addFloatText(W/2, H*0.82, text, '#ff8a80', Math.max(16, Math.floor(W*0.042)));
  VFX.spawnParticles(W/2, H*0.82, '#ff8a80', 8);
  haptic(28);
  AudioManager.playInvalid();
}

function showCoachAlert(title, detail, col=null, row=null, len=1, type='blocked') {
  const x = col === null ? W/2 : COL_X[col] + CARD_W/2;
  const y = row === null ? H*0.55 : Math.min(H*0.72, COL_Y_START + row*getCardOverlap(col) + CARD_H*0.32);
  coachAlert = { title, detail, timer: 150, x, y };
  if(col !== null) blockedSeq = { col, row, len, timer: 150, type };
  VFX.spawnRing(x, y, type === 'capacity' ? '#ffd54f' : '#ff8a80');
  haptic([18, 25, 18]);
  AudioManager.playInvalid();
}

function checkProgressMilestone() {
  const pct = foundationProgress();
  const milestone = pct >= 0.75 ? 75 : pct >= 0.5 ? 50 : pct >= 0.25 ? 25 : 0;
  if(milestone > lastMilestone) {
    lastMilestone = milestone;
    const labels = {25:'Getting started!', 50:'Halfway there!', 75:'Almost done!'};
    VFX.addFloatText(W/2, H*0.32, labels[milestone], ThemeManager.get().accent, Math.max(20, Math.floor(W*0.055)));
    VFX.spawnParticles(W/2, H*0.34, ThemeManager.get().accent, 24);
    haptic([18, 35, 18]);
  }
}

// ── Background ──
// ── Per-theme ambient particles (gold dust, petals, embers, fireflies…) ──
let ambientP = [], ambientTheme = null;

function drawAmbient(theme, now) {
  const a = theme.ambient;
  if(!a) { ambientP = []; return; }
  if(ambientTheme !== theme.id) { ambientP = []; ambientTheme = theme.id; }

  while(ambientP.length < a.count) {
    ambientP.push({
      x: Math.random()*W, y: Math.random()*H,
      vx: (Math.random()-0.5)*0.4,
      vy: a.type==='rise' ? -(0.3+Math.random()*0.7) : (a.type==='fall'||a.type==='petal') ? 0.3+Math.random()*0.7 : 0,
      size: a.size*(0.6+Math.random()*0.8),
      phase: Math.random()*Math.PI*2,
      speed: 0.5+Math.random()*1.5,
      rot: Math.random()*Math.PI*2
    });
  }

  ambientP.forEach(p => {
    if(a.type === 'firefly') {
      p.x += Math.cos(now*p.speed + p.phase) * 0.8;
      p.y += Math.sin(now*p.speed*0.8 + p.phase*1.3) * 0.6;
    } else if(a.type === 'wander') {
      p.x += Math.cos(now*0.3 + p.phase) * 0.3;
      p.y += Math.sin(now*0.25 + p.phase) * 0.25;
    } else {
      p.x += p.vx + Math.sin(now + p.phase) * 0.3;
      p.y += p.vy;
      if(a.type === 'petal') p.rot += 0.02;
    }
    // wrap
    if(p.y > H+10) { p.y = -10; p.x = Math.random()*W; }
    if(p.y < -10) { p.y = H+10; p.x = Math.random()*W; }
    if(p.x > W+10) p.x = -10;
    if(p.x < -10) p.x = W+10;

    const tw = a.type==='firefly'
      ? Math.max(0, Math.sin(now*p.speed*2 + p.phase))   // blink
      : 0.35 + Math.sin(now*p.speed + p.phase)*0.25;
    if(tw <= 0.02) return;

    ctx.save();
    if(a.glow) {
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size*4);
      g.addColorStop(0, `rgba(${a.color},${(tw*0.5).toFixed(3)})`);
      g.addColorStop(1, `rgba(${a.color},0)`);
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size*4, 0, Math.PI*2); ctx.fill();
    }
    ctx.fillStyle = `rgba(${a.color},${tw.toFixed(3)})`;
    if(a.type === 'petal') {
      ctx.translate(p.x, p.y); ctx.rotate(p.rot);
      ctx.beginPath(); ctx.ellipse(0, 0, p.size, p.size*0.45, 0, 0, Math.PI*2); ctx.fill();
    } else {
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI*2); ctx.fill();
    }
    ctx.restore();
  });
}

function drawBackground() {
  const theme = ThemeManager.get();
  const bgId = ThemeManager.getBg().id;
  const now = Date.now() * 0.001;

  // ── Deep gradient base ──
  const grad = ctx.createRadialGradient(W/2, H*0.35, 0, W/2, H*0.35, Math.max(W,H)*0.85);
  grad.addColorStop(0,   theme.bgGlow || '#1a1f3a');
  grad.addColorStop(0.5, theme.bg);
  grad.addColorStop(1,   theme.bgEdge || '#060810');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // ── Floating orbs (always on) ──
  bgOrbs.forEach((o, oi) => {
    o.x += Math.cos(now * o.speed + o.phase) * 0.3;
    o.y += Math.sin(now * o.speed * 0.7 + o.phase) * 0.2;
    // wrap
    if(o.x < -80) o.x = W+80;
    if(o.x > W+80) o.x = -80;
    if(o.y < -80) o.y = H+80;
    if(o.y > H+80) o.y = -80;
    const pulse = 0.04 + Math.sin(now * o.speed * 1.3 + o.phase) * 0.025;
    const col = theme.orbTint ? theme.orbTint[oi % theme.orbTint.length] : o.color;
    const og = ctx.createRadialGradient(o.x, o.y, 0, o.x, o.y, o.r);
    og.addColorStop(0, col.replace('A', pulse.toFixed(3)));
    og.addColorStop(1, col.replace('A', '0'));
    ctx.fillStyle = og;
    ctx.beginPath(); ctx.arc(o.x, o.y, o.r, 0, Math.PI*2); ctx.fill();
  });

  drawAmbient(theme, now);

  if(bgId === 'petals') {
    bgStars.forEach((p, i) => {
      const drift = (now*p.speed*18 + p.phase*40) % (H+80);
      const x = (p.x + Math.sin(now*p.speed+p.phase)*26) % W;
      const y = drift - 40;
      ctx.save();
      ctx.globalAlpha = 0.16 + (i%4)*0.035;
      ctx.translate(x, y);
      ctx.rotate(Math.sin(now+p.phase)*0.8);
      ctx.fillStyle = i%2 ? '#ffd1dc' : theme.accent;
      ctx.beginPath();
      ctx.ellipse(0, 0, 3+p.r*1.8, 7+p.r*2.5, 0, 0, Math.PI*2);
      ctx.fill();
      ctx.restore();
    });
  } else if(bgId === 'silk') {
    ctx.save();
    for(let i=0; i<4; i++) {
      const y = H*(0.18+i*0.18);
      const ribbon = ctx.createLinearGradient(0, y-30, W, y+45);
      ribbon.addColorStop(0, 'rgba(255,209,220,0)');
      ribbon.addColorStop(0.5, i%2 ? 'rgba(255,230,167,0.10)' : 'rgba(216,199,255,0.11)');
      ribbon.addColorStop(1, 'rgba(255,209,220,0)');
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = ribbon;
      ctx.beginPath();
      ctx.moveTo(0, y);
      for(let x=0; x<=W; x+=10) {
        ctx.lineTo(x, y + Math.sin(x*0.014 + now*0.45 + i)*18);
      }
      ctx.lineTo(W, y+45);
      ctx.lineTo(0, y+45);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  } else if(bgId === 'aurora') {
    ctx.save();
    for(let i=0; i<3; i++) {
      const y = H*(0.18+i*0.16);
      const aurora = ctx.createLinearGradient(0, y-60, W, y+80);
      aurora.addColorStop(0, 'rgba(255,209,220,0)');
      aurora.addColorStop(0.45, i%2 ? 'rgba(216,199,255,0.16)' : 'rgba(255,230,167,0.14)');
      aurora.addColorStop(1, 'rgba(255,209,220,0)');
      ctx.globalAlpha = 0.75;
      ctx.fillStyle = aurora;
      ctx.beginPath();
      ctx.moveTo(0, y);
      for(let x=0; x<=W; x+=12) {
        ctx.lineTo(x, y + Math.sin(x*0.018 + now*0.8 + i)*28);
      }
      ctx.lineTo(W, y+90);
      ctx.lineTo(0, y+90);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  } else if(bgId === 'stars') {
    bgStars.forEach(s => {
      const alpha = 0.3 + Math.sin(now * s.speed + s.phase) * 0.3;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI*2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
  }

  // ── Waves (unlockable) ──
  if(bgId === 'waves') {
    bgWaveOffset += 0.4;
    for(let i=0; i<5; i++) {
      ctx.globalAlpha = 0.04 + i*0.008;
      ctx.strokeStyle = theme.accent;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for(let wx=0; wx<=W; wx+=3) {
        const wy = H*(0.3+i*0.12) + Math.sin(wx*0.008 + bgWaveOffset*0.04 + i*1.4)*50;
        wx===0 ? ctx.moveTo(wx,wy) : ctx.lineTo(wx,wy);
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  // ── Felt table ──
  const feltPad = W*0.015;
  const feltX = FREE_X[0] - feltPad;
  const feltY = FREE_Y - feltPad;
  const feltW = W - (feltX - W*0.01)*2;
  const feltH = H - feltY - H*0.005;

  // Felt shadow
  ctx.shadowColor = 'rgba(0,0,0,0.6)';
  ctx.shadowBlur = 24;
  ctx.fillStyle = theme.felt;
  ctx.globalAlpha = 0.28;
  ctx.beginPath(); roundRect(ctx, feltX, feltY, feltW, feltH, 16); ctx.fill();
  ctx.globalAlpha = 1; ctx.shadowBlur = 0;

  // Felt border glow
  ctx.strokeStyle = theme.feltBorder;
  ctx.lineWidth = 1.5;
  ctx.globalAlpha = 0.5;
  ctx.beginPath(); roundRect(ctx, feltX, feltY, feltW, feltH, 16); ctx.stroke();
  ctx.globalAlpha = 1;

  // Subtle inner texture lines
  ctx.globalAlpha = 0.04;
  ctx.strokeStyle = theme.feltBorder;
  ctx.lineWidth = 1;
  for(let gy=feltY+20; gy<feltY+feltH; gy+=22) {
    ctx.beginPath(); ctx.moveTo(feltX+8, gy); ctx.lineTo(feltX+feltW-8, gy); ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

// ── Deal ──
function deal(level=currentDifficulty) {
  const deck = [];
  for(let s=0; s<4; s++) for(let r=1; r<=13; r++) deck.push({rank:r, suit:s});
  // Fisher-Yates
  for(let i=deck.length-1; i>0; i--) {
    const j = Math.floor(Math.random()*(i+1));
    [deck[i],deck[j]] = [deck[j],deck[i]];
  }
  prepareDeckForDifficulty(deck, level);
  cascades = Array.from({length:8}, ()=>[]);
  // Deal: first 4 columns get 7 cards, last 4 get 6
  let idx=0;
  for(let col=0; col<8; col++) {
    const count = col < 4 ? 7 : 6;
    for(let i=0; i<count; i++) cascades[col].push(deck[idx++]);
  }
  freeCells = [null,null,null,null];
  foundations = [0,0,0,0];
  selected = null;
  moves = 0;
  totalFoundations = 0;
  comboCount = 0;
  lastMilestone = 0;
  elapsedTime = 0;
  undoStack = [];
  hintCard = null;
}

// ── FreeCell rules ──
function canStack(card, onCard) {
  // Alternating color, descending rank
  const redSuits = [1,2];
  const cardRed = redSuits.includes(card.suit);
  const onRed = redSuits.includes(onCard.suit);
  return (cardRed !== onRed) && (card.rank === onCard.rank - 1);
}

function maxMovable() {
  const emptyCells = freeCells.filter(c=>c===null).length;
  const emptyCols = cascades.filter(c=>c.length===0).length;
  return (emptyCells + 1) * Math.pow(2, emptyCols);
}

function moveCapacityHint(count=maxMovable()) {
  if(count <= 1) return 'Max 1 card: free a cell';
  return `Max ${count} cards movable`;
}

function canMoveToFoundation(card) {
  return foundations[card.suit] === card.rank - 1;
}

function canMoveToCascade(card, col) {
  if(cascades[col].length === 0) return true;
  const top = cascades[col][cascades[col].length-1];
  return canStack(card, top);
}

// ── Save undo state ──
function saveUndo() {
  undoStack.push({
    freeCells: freeCells.map(c=>c?{...c}:null),
    foundations: [...foundations],
    cascades: cascades.map(col=>col.map(c=>({...c}))),
    moves, score, comboCount, totalFoundations
  });
  if(undoStack.length > 30) undoStack.shift();
}

function undo() {
  if(undoStack.length === 0) return;
  const s = undoStack.pop();
  freeCells = s.freeCells;
  foundations = s.foundations;
  cascades = s.cascades;
  moves = s.moves;
  score = s.score;
  comboCount = s.comboCount;
  totalFoundations = s.totalFoundations;
  selected = null;
  rewardMove('Deshecho', W/2, H*0.82, '#b3e5fc');
  AudioManager.playCardMove();
}

// ── Auto-foundation (safe move) ──
let autoFoundQueue = [];
let autoFoundTimer = 0;

function autoFoundation() {
  const queue = [];
  const simFree = freeCells.map(c => c ? {...c} : null);
  const simFound = [...foundations];
  const simCasc = cascades.map(col => col.map(c => ({...c})));
  let moved = true;
  while(moved) {
    moved = false;
    for(let i=0; i<4; i++) {
      if(simFree[i] && simFound[simFree[i].suit] === simFree[i].rank - 1) {
        const card = simFree[i];
        queue.push({card:{...card}, srcX: FREE_X[i], srcY: FREE_Y, from:'free', idx:i});
        simFound[card.suit]++;
        simFree[i] = null;
        moved = true;
      }
    }
    for(let col=0; col<8; col++) {
      if(simCasc[col].length === 0) continue;
      const card = simCasc[col][simCasc[col].length-1];
      if(simFound[card.suit] === card.rank - 1) {
        const minFound = Math.min(...simFound);
        if(card.rank <= minFound + 2) {
          const overlap = getCardOverlap(col);
          const row = simCasc[col].length - 1;
          queue.push({card:{...card}, srcX: COL_X[col], srcY: COL_Y_START + row * overlap, from:'cascade', idx:col});
          simFound[card.suit]++;
          simCasc[col].pop();
          moved = true;
        }
      }
    }
  }
  if(queue.length === 0) {
    checkWin();
    if(gameState === 'playing') checkStuck();
    return;
  }
  autoFoundQueue = queue;
  autoFoundTimer = 0;
  processAutoFoundQueue();
}

function processAutoFoundQueue() {
  if(autoFoundQueue.length === 0) {
    checkWin();
    if(gameState === 'playing') checkStuck();
    return;
  }
  const item = autoFoundQueue.shift();
  const card = item.card;
  if(item.from === 'free') {
    freeCells[item.idx] = null;
  } else {
    cascades[item.idx].pop();
  }
  foundations[card.suit]++;
  totalFoundations++;
  flights.push({
    cards: [card],
    x0: item.srcX, y0: item.srcY,
    x1: FOUND_X[card.suit], y1: FOUND_Y,
    t: 0,
    target: {type:'found', idx: card.suit},
    onLand() {
      VFX.spawnFoundationBurst(FOUND_X[card.suit]+CARD_W/2, FOUND_Y+CARD_H/2);
      AudioManager.playFoundation();
      haptic(18);
      checkCombo();
      checkProgressMilestone();
    }
  });
  AudioManager.playCardMove();
  if(autoFoundQueue.length > 0) {
    setTimeout(processAutoFoundQueue, 180);
  } else {
    setTimeout(() => { checkWin(); if(gameState === 'playing') checkStuck(); }, 350);
  }
}

function checkCombo() {
  const now = Date.now();
  if(now - lastFoundTime < 2000) {
    comboCount++;
    if(comboCount >= 3) {
      const bonus = comboCount * 10;
      score += bonus;
      VFX.addFloatText(W/2, H*0.35, `COMBO x${comboCount} +${bonus}`, '#ffd54f', 28);
      VFX.spawnRing(W/2, H*0.36, '#ffd54f');
      AudioManager.playCombo(comboCount);
      haptic([12, 20, 12]);
      AdsManager.happyTime(Math.min(comboCount * 0.15, 0.6));
    }
  } else {
    comboCount = 1;
  }
  lastFoundTime = now;
  score += 15;
  moves++;
  rewardMove('+15', W/2, H*0.18, '#fff176');
}

function checkWin() {
  if(foundations.every(f => f === 13)) {
    gameState = 'win';
    gamesWon++;
    winStreak++;
    if(winStreak > bestWinStreak) bestWinStreak = winStreak;
    AdsManager.gameplayStop();
    AdsManager.happyTime(1.0);
    elapsedTime = currentPlayTime();
    const winBonus = Math.max(0, 1000 - moves*5);
    score += winBonus;
    if(score > bestScore) bestScore = score;
    saveProgress();
    AudioManager.playWin();
    VFX.spawnWinBurst(W/2, H/2, W, H);
    haptic([40, 60, 40, 90, 60]);
    startWinAnimation();
  }
}

// ── Win card animation ──
function startWinAnimation() {
  animCards = [];
  winBounce = [];
  for(let i=0; i<14; i++) winBounce.push({
    x: FOUND_X[i%4], y: FOUND_Y,
    vx: (Math.random()-0.5)*9,
    vy: -3 - Math.random()*5,
    rank: 1 + Math.floor(Math.random()*13),
    suit: i%4,
    delay: i*12
  });
}

// ── Click / touch handling ──
function getCardAt(px, py) {
  // Check free cells
  for(let i=0; i<4; i++) {
    if(freeCells[i] && hitTest(px,py,FREE_X[i],FREE_Y,CARD_W,CARD_H))
      return {source:'free', idx:i, cards:[freeCells[i]]};
  }
  // Check foundations (just for display, can't pick from)
  // Check cascades (top card or sequence)
  for(let col=0; col<8; col++) {
    const c = cascades[col];
    if(c.length === 0) continue;
    const overlap = getCardOverlap(col);
    for(let row=c.length-1; row>=0; row--) {
      const cx = COL_X[col];
      const cy = COL_Y_START + row*overlap;
      const cardH = row === c.length-1 ? CARD_H : overlap;
      if(hitTest(px, py, cx, cy, CARD_W, cardH)) {
        const seq = c.slice(row);
        const validSeq = isValidSequence(seq);
        const movable = maxMovable();
        if(validSeq && seq.length <= movable) {
          return {source:'cascade', idx:col, row, cards:seq};
        } else if(row === c.length-1) {
          return {source:'cascade', idx:col, row, cards:[c[row]]};
        }
        if(validSeq) {
          const title = movable <= 1 ? 'Can only move 1 card' : `Can only move ${movable}`;
          return {
            blocked: true,
            col,
            row,
            len: seq.length,
            type: 'capacity',
            reason: title,
            detail: 'Free a cell or column'
          };
        }
        return {
          blocked: true,
          col,
          row,
          len: seq.length,
          type: 'rule',
          reason: 'Not a valid sequence',
          detail: 'Must alternate color descending'
        };
      }
    }
  }
  return null;
}

function getTargetAt(px, py) {
  // Free cells
  for(let i=0; i<4; i++) {
    if(hitTest(px,py,FREE_X[i],FREE_Y,CARD_W,CARD_H)) return {type:'free',idx:i};
  }
  // Foundations
  for(let i=0; i<4; i++) {
    if(hitTest(px,py,FOUND_X[i],FOUND_Y,CARD_W,CARD_H)) return {type:'found',idx:i};
  }
  // Cascades
  for(let col=0; col<8; col++) {
    const cx = COL_X[col];
    const topRow = cascades[col].length;
    const overlap = getCardOverlap(col);
    const colBottom = topRow > 0
      ? COL_Y_START + (topRow-1)*overlap + CARD_H
      : COL_Y_START + CARD_H;
    if(px >= cx && px <= cx+CARD_W && py >= COL_Y_START && py <= colBottom+20)
      return {type:'cascade',idx:col};
  }
  return null;
}

function isValidSequence(cards) {
  for(let i=0; i<cards.length-1; i++) {
    if(!canStack(cards[i+1], cards[i])) return false;
  }
  return true;
}

function hitTest(px,py,x,y,w,h) {
  return px>=x && px<=x+w && py>=y && py<=y+h;
}

function getCardOverlap(col) {
  const c = cascades[col];
  if(c.length <= 1) return CARD_H;
  const available = H - COL_Y_START - CARD_H - H*0.02;
  const needed = (c.length-1);
  return Math.min(CARD_H * 0.28, available / needed);
}

function handleTap(px, py) {
  if(tutorialStep >= 0) { handleTutorialTap(); return; }
  if(gameState === 'menu') {
    for(const id of ['basic','medium','advanced']) {
      const r = difficultyRect(id);
      if(hitTest(px, py, r.x, r.y, r.w, r.h)) { currentDifficulty = id; return; }
    }
    startGame(currentDifficulty);
    return;
  }
  if(gameState === 'win') { gameState = 'menu'; return; }
  if(gameState === 'settings') { handleSettingsTap(px, py); return; }
  if(gameState === 'pause') { handlePauseTap(px, py); return; }

  // Undo button
  if(hitTest(px, py, W*0.045, H*0.923, W*0.185, H*0.062)) { undo(); return; }
  // Hint button
  if(hitTest(px, py, W*0.285, H*0.923, W*0.185, H*0.062)) { showHint(); return; }
  // New game button
  if(hitTest(px, py, W*0.525, H*0.923, W*0.185, H*0.062)) { newGame(); return; }
  // Pause button
  if(hitTest(px, py, W*0.765, H*0.923, W*0.185, H*0.062)) { enterPause(); return; }

  if(!selected) {
    const pick = getCardAt(px, py);
    if(pick && pick.blocked) {
      hintCard = {source:'cascade', col:pick.col, row:pick.row};
      hintTarget = null;
      hintTimer = 90;
      showCoachAlert(pick.reason, pick.detail, pick.col, pick.row, pick.len, pick.type);
    } else if(pick) {
      selected = pick;
      AudioManager.playCardMove();
    }
  } else {
    // Double-tap: same card selected again → try auto-foundation
    const pick = getCardAt(px, py);
    if(pick && !pick.blocked && pick.cards.length === 1 &&
       pick.source === selected.source && pick.idx === selected.idx) {
      const card = pick.cards[0];
      if(canMoveToFoundation(card)) {
        tryMove(selected, {type:'foundation', idx:card.suit});
        return;
      }
    }
    const target = getTargetAt(px, py);
    if(!target) { selected = null; return; }
    tryMove(selected, target);
  }
}

function selPixelPos(sel) {
  if(sel.source === 'free') return {x: FREE_X[sel.idx], y: FREE_Y};
  return {x: COL_X[sel.idx], y: COL_Y_START + sel.row * getCardOverlap(sel.idx)};
}

function tryMove(sel, target) {
  const card = sel.cards[0];
  const srcPos = selPixelPos(sel);

  if(target.type === 'free') {
    if(sel.cards.length > 1) { invalidFeedback('One card only'); selected=null; return; }
    if(freeCells[target.idx] !== null) { invalidFeedback('Cell occupied'); selected=null; return; }
    saveUndo();
    if(sel.source === 'free') freeCells[sel.idx] = null;
    else cascades[sel.idx].splice(sel.row, sel.cards.length);
    freeCells[target.idx] = card;
    flights.push({cards: sel.cards, x0: srcPos.x, y0: srcPos.y, x1: FREE_X[target.idx], y1: FREE_Y, t: 0, target: {type:'free', idx: target.idx}});
    AudioManager.playCardPlace();
    score += 2; moves++;
    rewardMove('+2', FREE_X[target.idx]+CARD_W/2, FREE_Y+CARD_H*0.55);
    haptic(10);
    selected = null;
    autoFoundation();
    return;
  }

  if(target.type === 'found') {
    if(sel.cards.length > 1) { invalidFeedback('One card only'); selected=null; return; }
    if(card.suit !== target.idx) { invalidFeedback('Wrong suit'); selected=null; return; }
    if(!canMoveToFoundation(card)) { invalidFeedback('Not yet'); selected=null; return; }
    saveUndo();
    if(sel.source === 'free') freeCells[sel.idx] = null;
    else cascades[sel.idx].splice(sel.row, 1);
    foundations[card.suit]++;
    totalFoundations++;
    flights.push({cards: sel.cards, x0: srcPos.x, y0: srcPos.y, x1: FOUND_X[card.suit], y1: FOUND_Y, t: 0, target: {type:'found', idx: card.suit}});
    checkCombo();
    checkProgressMilestone();
    VFX.spawnFoundationBurst(FOUND_X[card.suit]+CARD_W/2, FOUND_Y+CARD_H/2);
    VFX.spawnRing(FOUND_X[card.suit]+CARD_W/2, FOUND_Y+CARD_H/2, '#ffd54f');
    AudioManager.playFoundation();
    haptic(22);
    selected = null;
    checkWin();
    return;
  }

  if(target.type === 'cascade') {
    const col = target.idx;
    if(sel.source === 'cascade' && sel.idx === col) { selected=null; return; }
    if(!canMoveToCascade(card, col)) { invalidFeedback('Doesn\'t fit'); selected=null; return; }
    if(sel.cards.length > maxMovable()) { invalidFeedback('Too many cards'); selected=null; return; }
    saveUndo();
    if(sel.source === 'free') freeCells[sel.idx] = null;
    else cascades[sel.idx].splice(sel.row, sel.cards.length);
    sel.cards.forEach(c => cascades[col].push(c));
    flights.push({cards: sel.cards, x0: srcPos.x, y0: srcPos.y, x1: COL_X[col], y1: COL_Y_START + (cascades[col].length - sel.cards.length) * getCardOverlap(col), t: 0, target: {type:'cascade', idx: col}});
    AudioManager.playCardPlace();
    score += 5; moves++;
    rewardMove(sel.cards.length > 1 ? `Cadena x${sel.cards.length}` : '+5', COL_X[col]+CARD_W/2, COL_Y_START + Math.max(1,cascades[col].length-1)*getCardOverlap(col));
    haptic(sel.cards.length > 1 ? [10, 20, 10] : 10);
    selected = null;
    autoFoundation();
    return;
  }

  selected = null;
}

// ── Hint system ──
// ── Smart stuck detection ──
// A move is "useful" if it:
//  1. Goes to a foundation (always good)
//  2. Exposes a card that can go to foundation
//  3. Moves a card to an empty column (frees a free cell or creates space)
//  4. Builds a longer sequence on a cascade (net progress)
//  5. Moves to a free cell when it unblocks foundation-bound cards
// A move is "circular" if the card could equally come back — e.g. swapping
// between two columns with same-rank tops, or moving to a free cell when
// all free cells are already occupied and nothing gets unblocked.

function isUsefulMove(srcType, srcIdx, srcRow, card, dstType, dstIdx) {
  // Foundation = always useful
  if(dstType === 'found') return 2;

  // Moving to empty cascade: useful if source column has cards below
  if(dstType === 'cascade' && cascades[dstIdx].length === 0) {
    if(srcType === 'cascade' && srcRow > 0) return 1;
    if(srcType === 'free') return 1;
    return 0; // King to empty = neutral unless it frees something
  }

  if(dstType === 'cascade') {
    const dstTop = cascades[dstIdx][cascades[dstIdx].length-1];
    // Moving single card: check if the card below (in source) benefits
    if(srcType === 'cascade') {
      const srcCol = cascades[srcIdx];
      // Moving reveals a card that can go to foundation?
      if(srcRow > 0) {
        const revealed = srcCol[srcRow-1];
        if(canMoveToFoundation(revealed)) return 2;
      }
      // Building a longer sorted sequence on destination?
      const seqLen = srcCol.length - srcRow;
      const dstLen = cascades[dstIdx].length;
      // Check if destination already has a sequence ending at dstTop
      let dstSeqLen = 1;
      for(let i=dstLen-1; i>0; i--) {
        if(canStack(cascades[dstIdx][i], cascades[dstIdx][i-1])) dstSeqLen++;
        else break;
      }
      // Joining two sequences = progress
      if(seqLen + dstSeqLen > Math.max(seqLen, dstSeqLen)) return 1;

      // Avoid circular: if top of dest could also move to source column
      if(srcRow === 0 && seqLen === srcCol.length) return 0; // emptying a col with a single card just to stack
    }
    if(srcType === 'free') {
      // Freeing a cell is useful
      return 1;
    }
    return 0;
  }

  if(dstType === 'free') {
    // Moving to free cell: useful only if it exposes a foundation-bound card
    // or the column below has useful cards to unblock
    if(srcType === 'cascade') {
      const srcCol = cascades[srcIdx];
      if(srcRow > 0) {
        const revealed = srcCol[srcRow-1];
        if(canMoveToFoundation(revealed)) return 2;
        // Check if revealed card can be moved to build sequences
        for(let tc=0; tc<8; tc++) {
          if(tc === srcIdx) continue;
          if(canMoveToCascade(revealed, tc)) return 1;
        }
      }
    }
    return 0;
  }
  return 0;
}

function analyzePosition() {
  let allMoves = [];

  // From cascade tops and sequences
  for(let col=0; col<8; col++) {
    const c = cascades[col];
    if(c.length === 0) continue;
    const card = c[c.length-1];

    // Single card moves
    // → to foundation
    if(canMoveToFoundation(card))
      allMoves.push({srcType:'cascade', srcIdx:col, srcRow:c.length-1, card, dstType:'found', dstIdx:card.suit,
        usefulness: isUsefulMove('cascade', col, c.length-1, card, 'found', card.suit)});

    // → to other cascades
    for(let tc=0; tc<8; tc++) {
      if(tc===col) continue;
      if(canMoveToCascade(card, tc))
        allMoves.push({srcType:'cascade', srcIdx:col, srcRow:c.length-1, card, dstType:'cascade', dstIdx:tc,
          usefulness: isUsefulMove('cascade', col, c.length-1, card, 'cascade', tc)});
    }

    // → to free cells
    for(let fc=0; fc<4; fc++) {
      if(!freeCells[fc])
        allMoves.push({srcType:'cascade', srcIdx:col, srcRow:c.length-1, card, dstType:'free', dstIdx:fc,
          usefulness: isUsefulMove('cascade', col, c.length-1, card, 'free', fc)});
    }

    // Multi-card sequences
    for(let row=c.length-2; row>=0; row--) {
      const seq = c.slice(row);
      if(!isValidSequence(seq)) break;
      if(seq.length > maxMovable()) break;
      const seqCard = seq[0];
      for(let tc=0; tc<8; tc++) {
        if(tc===col) continue;
        if(canMoveToCascade(seqCard, tc))
          allMoves.push({srcType:'cascade', srcIdx:col, srcRow:row, card: seqCard, dstType:'cascade', dstIdx:tc,
            usefulness: isUsefulMove('cascade', col, row, seqCard, 'cascade', tc)});
      }
    }
  }

  // From free cells
  for(let fc=0; fc<4; fc++) {
    if(!freeCells[fc]) continue;
    const card = freeCells[fc];
    if(canMoveToFoundation(card))
      allMoves.push({srcType:'free', srcIdx:fc, srcRow:0, card, dstType:'found', dstIdx:card.suit, usefulness:2});
    for(let tc=0; tc<8; tc++) {
      if(canMoveToCascade(card, tc))
        allMoves.push({srcType:'free', srcIdx:fc, srcRow:0, card, dstType:'cascade', dstIdx:tc,
          usefulness: isUsefulMove('free', fc, 0, card, 'cascade', tc)});
    }
  }

  allMoves.sort((a,b) => b.usefulness - a.usefulness);
  return allMoves;
}

let stuckNotified = false;
let stuckTimer = 0;

function checkStuck() {
  if(gameState !== 'playing') return;
  const moves = analyzePosition();

  if(moves.length === 0) {
    // Truly no moves at all
    if(!stuckNotified) {
      showCoachAlert('No moves left', 'Try undo or start a new game.');
      stuckNotified = true;
    }
    return;
  }

  const useful = moves.filter(m => m.usefulness > 0);
  if(useful.length === 0 && moves.length > 0) {
    // Moves exist but none are productive
    stuckTimer++;
    if(stuckTimer >= 3 && !stuckNotified) {
      showCoachAlert('Stuck', 'Only circular moves remain. Undo or restart.');
      stuckNotified = true;
    }
  } else {
    stuckTimer = 0;
    stuckNotified = false;
  }
}

function showHint() {
  hintCard = null;
  const moves = analyzePosition();

  if(moves.length === 0) {
    showCoachAlert('No moves left', 'Try undo or start a new game.');
    return;
  }

  const useful = moves.filter(m => m.usefulness > 0);
  if(useful.length === 0) {
    showCoachAlert('Stuck', 'No useful moves available. Try undo.');
    return;
  }

  // Pick best useful move
  const best = useful[0];
  if(best.dstType === 'found') {
    hintCard = {source: best.srcType, col: best.srcIdx, row: best.srcRow};
    hintTarget = {type:'found', suit: best.card.suit};
  } else if(best.dstType === 'cascade') {
    hintCard = {source: best.srcType, col: best.srcIdx, row: best.srcRow};
    hintTarget = {type:'cascade', col: best.dstIdx};
  } else {
    hintCard = {source: best.srcType, col: best.srcIdx, row: best.srcRow};
    hintTarget = {type:'free', idx: best.dstIdx};
  }
  hintTimer = 120;

  // Explain the hint
  const cardName = RANKS[best.card.rank] + SUITS[best.card.suit];
  if(best.dstType === 'found') VFX.addFloatText(W/2, H*0.82, `${cardName} → Fundación`, '#69f0ae', 18);
  else if(best.usefulness >= 2) VFX.addFloatText(W/2, H*0.82, `${cardName} → desbloquea fundación`, '#ffd54f', 18);
  else VFX.addFloatText(W/2, H*0.82, `Mover ${cardName}`, '#64b5f6', 18);
}

// ── Save/Load ──
function saveProgress() {
  localStorage.setItem('sm_best', bestScore);
  localStorage.setItem('sm_won', gamesWon);
  localStorage.setItem('sm_played', gamesPlayed);
  localStorage.setItem('sm_score', score);
  localStorage.setItem('sm_streak', winStreak);
  localStorage.setItem('sm_best_streak', bestWinStreak);
}

function loadProgress() {
  bestScore = parseInt(localStorage.getItem('sm_best')) || 0;
  gamesWon = parseInt(localStorage.getItem('sm_won')) || 0;
  gamesPlayed = parseInt(localStorage.getItem('sm_played')) || 0;
  score = parseInt(localStorage.getItem('sm_score')) || 0;
  winStreak = parseInt(localStorage.getItem('sm_streak')) || 0;
  bestWinStreak = parseInt(localStorage.getItem('sm_best_streak')) || 0;
  currentDifficulty = localStorage.getItem('sm_difficulty') || 'medium';
  if(!DIFFICULTIES[currentDifficulty]) currentDifficulty = 'medium';
}

// ── Game flow ──
function startGame(level=currentDifficulty) {
  currentDifficulty = level;
  localStorage.setItem('sm_difficulty', currentDifficulty);
  gameState = 'playing';
  gamesPlayed++;
  score = 0;
  startTime = Date.now();
  elapsedTime = 0;
  pausedAt = 0;
  pausedTotal = 0;
  deal(currentDifficulty);
  AdsManager.hideBanner();
  AdsManager.gameplayStart();
  autoFoundation();
  if(shouldShowTutorial()) startTutorial();
}

async function newGame() {
  AdsManager.gameplayStop();
  gameOverCount++;
  saveProgress();
  pausedAt = 0;
  pausedTotal = 0;
  if(gameOverCount % 3 === 0) await AdsManager.showInterstitial();
  gameState = 'menu';
  AdsManager.showBanner();
}

function handlePauseTap(px, py) {
  const continueBtn = pauseButtonRect(0);
  const themesBtn = pauseButtonRect(1);
  const menuBtn = pauseButtonRect(2);
  if(hitTest(px, py, continueBtn.x, continueBtn.y, continueBtn.w, continueBtn.h)) {
    resumeFromPause();
  } else if(hitTest(px, py, themesBtn.x, themesBtn.y, themesBtn.w, themesBtn.h)) {
    settingsReturnState = 'pause';
    gameState = 'settings';
  } else if(hitTest(px, py, menuBtn.x, menuBtn.y, menuBtn.w, menuBtn.h)) {
    saveProgress();
    pausedAt = 0;
    pausedTotal = 0;
    gameState = 'menu';
    AdsManager.showBanner();
  }
}

// ── Settings screen ──
let settingsThemeIdx = 0, settingsBgIdx = 0;
function themeOptionRect(i) {
  const cols = 3;
  const col = i % cols;
  const row = Math.floor(i / cols);
  return {
    x: W*0.055 + col*W*0.31,
    y: H*0.31 + row*H*0.075,
    w: W*0.27,
    h: H*0.058
  };
}

function bgOptionRect(i) {
  const cols = 3;
  const col = i % cols;
  const row = Math.floor(i / cols);
  return {
    x: W*0.055 + col*W*0.31,
    y: H*0.585 + row*H*0.068,
    w: W*0.27,
    h: H*0.052
  };
}

function handleSettingsTap(px, py) {
  ThemeManager.THEMES.forEach((t, i) => {
    const r = themeOptionRect(i);
    if(bestScore >= t.unlockScore && hitTest(px,py,r.x,r.y,r.w,r.h)) {
      ThemeManager.setTheme(i);
    }
  });
  ThemeManager.BG_STYLES.forEach((b, i) => {
    const r = bgOptionRect(i);
    if(bestScore >= b.unlockScore && hitTest(px,py,r.x,r.y,r.w,r.h)) {
      ThemeManager.setBg(i);
    }
  });
  // Back button
  if(hitTest(px,py,W*0.3,H*0.75,W*0.4,H*0.07)) gameState=settingsReturnState;
}

function drawMenuHeroCards(cx, cy) {
  const cards = [
    {rank:1, suit:1, dx:-CARD_W*1.25, dy:10, rot:-0.22},
    {rank:13, suit:0, dx:-CARD_W*0.42, dy:-8, rot:-0.08},
    {rank:7, suit:2, dx:CARD_W*0.42, dy:-8, rot:0.08},
    {rank:10, suit:3, dx:CARD_W*1.25, dy:10, rot:0.22}
  ];
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.55)';
  ctx.shadowBlur = 18;
  cards.forEach(c => {
    ctx.save();
    ctx.translate(cx+c.dx+CARD_W/2, cy+c.dy+CARD_H/2);
    ctx.rotate(c.rot);
    drawCard(-CARD_W/2, -CARD_H/2, c.rank, c.suit, true);
    ctx.restore();
  });
  ctx.restore();
}

function drawStatPill(x, y, w, h, label, value) {
  const theme = ThemeManager.get();
  ctx.save();
  const grad = ctx.createLinearGradient(x, y, x, y+h);
  grad.addColorStop(0, 'rgba(255,255,255,0.16)');
  grad.addColorStop(1, 'rgba(255,255,255,0.06)');
  ctx.fillStyle = grad;
  ctx.shadowColor = 'rgba(0,0,0,0.25)';
  ctx.shadowBlur = 10;
  ctx.beginPath(); roundRect(ctx, x, y, w, h, Math.min(10, h*0.28)); ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = 'rgba(255,255,255,0.18)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = '#aabbcc';
  ctx.font = `bold ${Math.floor(h*0.24)}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, x+w/2, y+h*0.34);
  ctx.fillStyle = theme.text;
  ctx.font = `bold ${Math.floor(h*0.36)}px Arial Black`;
  ctx.fillText(value, x+w/2, y+h*0.68);
  ctx.restore();
}

function drawProgressPanel(x, y, w, h, pct, label) {
  const theme = ThemeManager.get();
  ctx.save();
  const panel = ctx.createLinearGradient(x, y, x+w, y+h);
  panel.addColorStop(0, 'rgba(255,255,255,0.13)');
  panel.addColorStop(1, 'rgba(255,255,255,0.045)');
  ctx.fillStyle = panel;
  ctx.beginPath(); roundRect(ctx, x, y, w, h, 10); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.16)';
  ctx.stroke();

  ctx.fillStyle = '#aabbcc';
  ctx.font = `bold ${Math.floor(h*0.22)}px Arial`;
  ctx.textAlign = 'center';
  ctx.fillText(label, x+w/2, y+h*0.33);

  const barX = x+w*0.08, barY = y+h*0.55, barW = w*0.84, barH = Math.max(10, h*0.18);
  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  ctx.beginPath(); roundRect(ctx, barX, barY, barW, barH, barH/2); ctx.fill();
  const fill = ctx.createLinearGradient(barX, barY, barX+barW, barY);
  fill.addColorStop(0, theme.accent);
  fill.addColorStop(1, '#ffffff');
  ctx.fillStyle = fill;
  ctx.beginPath(); roundRect(ctx, barX, barY, barW*Math.max(0.02, pct), barH, barH/2); ctx.fill();
  ctx.restore();
}

function drawDifficultySelector() {
  const theme = ThemeManager.get();
  ['basic','medium','advanced'].forEach(id => {
    const r = difficultyRect(id);
    const active = currentDifficulty === id;
    ctx.save();
    const grad = ctx.createLinearGradient(r.x, r.y, r.x, r.y+r.h);
    grad.addColorStop(0, active ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.10)');
    grad.addColorStop(1, active ? 'rgba(255,213,79,0.11)' : 'rgba(255,255,255,0.035)');
    ctx.fillStyle = grad;
    ctx.beginPath(); roundRect(ctx, r.x, r.y, r.w, r.h, 9); ctx.fill();
    ctx.strokeStyle = active ? theme.accent : 'rgba(255,255,255,0.18)';
    ctx.lineWidth = active ? 2 : 1;
    ctx.stroke();
    ctx.fillStyle = active ? theme.text : '#aabbcc';
    ctx.font = `bold ${Math.floor(r.h*0.34)}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(DIFFICULTIES[id].label, r.x+r.w/2, r.y+r.h/2);
    ctx.restore();
  });
}

function drawBlockedSequence() {
  if(!blockedSeq || blockedSeq.timer <= 0) return;
  const theme = ThemeManager.get();
  const overlap = getCardOverlap(blockedSeq.col);
  const x = COL_X[blockedSeq.col];
  const y = COL_Y_START + blockedSeq.row*overlap;
  const h = CARD_H + Math.max(0, blockedSeq.len-1)*overlap;
  const pulse = 0.55 + Math.sin(Date.now()*0.018)*0.2;
  ctx.save();
  ctx.globalAlpha = Math.min(0.85, blockedSeq.timer/30);
  ctx.fillStyle = blockedSeq.type === 'capacity' ? 'rgba(255,213,79,0.12)' : 'rgba(255,90,90,0.12)';
  ctx.beginPath(); roundRect(ctx, x-4, y-4, CARD_W+8, h+8, CARD_R+4); ctx.fill();
  ctx.strokeStyle = blockedSeq.type === 'capacity' ? theme.accent : '#ff8a80';
  ctx.lineWidth = 2 + pulse;
  ctx.setLineDash([6, 5]);
  ctx.beginPath(); roundRect(ctx, x-4, y-4, CARD_W+8, h+8, CARD_R+4); ctx.stroke();
  ctx.restore();
}

function drawCoachAlert() {
  if(!coachAlert || coachAlert.timer <= 0) return;
  const theme = ThemeManager.get();
  const alpha = Math.min(1, coachAlert.timer / 18);
  const w = W*0.78, h = H*0.105;
  const x = (W-w)/2;
  const y = Math.min(H*0.78, Math.max(H*0.52, coachAlert.y + CARD_H*0.58));
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.shadowColor = 'rgba(0,0,0,0.42)';
  ctx.shadowBlur = 18;
  ctx.shadowOffsetY = 6;
  const grad = ctx.createLinearGradient(x, y, x, y+h);
  grad.addColorStop(0, 'rgba(24,36,42,0.96)');
  grad.addColorStop(1, 'rgba(8,15,18,0.96)');
  ctx.fillStyle = grad;
  ctx.beginPath(); roundRect(ctx, x, y, w, h, 12); ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = coachAlert.title.includes('Not a') ? '#ff8a80' : theme.accent;
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = ctx.strokeStyle;
  ctx.beginPath();
  ctx.moveTo(Math.max(x+22, Math.min(x+w-22, coachAlert.x)), y-9);
  ctx.lineTo(Math.max(x+12, Math.min(x+w-32, coachAlert.x-10)), y+1);
  ctx.lineTo(Math.max(x+32, Math.min(x+w-12, coachAlert.x+10)), y+1);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = theme.text;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `bold ${Math.floor(h*0.27)}px Arial Black`;
  ctx.fillText(coachAlert.title, x+w/2, y+h*0.40);
  ctx.fillStyle = '#d6e4e8';
  ctx.font = `bold ${Math.floor(h*0.21)}px Arial`;
  ctx.fillText(coachAlert.detail, x+w/2, y+h*0.70);
  ctx.restore();
}

function drawPause() {
  drawGame();
  const theme = ThemeManager.get();
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.58)';
  ctx.fillRect(0,0,W,H);
  ctx.fillStyle = theme.accent;
  ctx.font = `bold ${Math.floor(W*0.085)}px Arial Black`;
  ctx.textAlign = 'center';
  ctx.fillText('PAUSED', W/2, H*0.31);
  ctx.fillStyle = '#d6e4e8';
  ctx.font = `bold ${Math.floor(W*0.034)}px Arial`;
  ctx.fillText(`Level: ${DIFFICULTIES[currentDifficulty].label}`, W/2, H*0.36);
  drawButton(...Object.values(pauseButtonRect(0)), 'RESUME', theme.accent, '#061018');
  drawButton(...Object.values(pauseButtonRect(1)), 'THEMES', '#d8c7ff', '#120f22');
  drawButton(...Object.values(pauseButtonRect(2)), 'BACK TO MENU', '#ffd1dc', '#170b14');
  ctx.restore();
}

// ── Draw screens ──
function drawMenu() {
  const theme = ThemeManager.get();
  drawBackground();

  const now = Date.now() * 0.001;
  const glow = 0.55 + Math.sin(now*1.7) * 0.18;

  ctx.save();
  const vignette = ctx.createRadialGradient(W/2, H*0.28, W*0.08, W/2, H*0.34, W*0.78);
  vignette.addColorStop(0, 'rgba(255,255,255,0.08)');
  vignette.addColorStop(0.48, 'rgba(255,255,255,0)');
  vignette.addColorStop(1, 'rgba(0,0,0,0.38)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();

  drawMenuHeroCards(W/2, H*0.13);

  ctx.save();
  ctx.shadowColor = theme.accent;
  ctx.shadowBlur = 18 + glow*16;
  ctx.fillStyle = theme.accent;
  ctx.font = `bold ${Math.floor(W*0.112)}px Arial Black`;
  ctx.textAlign = 'center';
  ctx.fillText('SOLITAIRE', W/2, H*0.36);
  ctx.restore();

  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.65)';
  ctx.shadowBlur = 12;
  ctx.fillStyle = theme.text;
  ctx.font = `bold ${Math.floor(W*0.08)}px Arial Black`;
  ctx.textAlign = 'center';
  ctx.fillText('MASTER', W/2, H*0.44);
  ctx.restore();

  ctx.fillStyle = theme.text;
  ctx.globalAlpha = 0.8;
  ctx.font = `bold ${Math.floor(W*0.034)}px Arial`;
  ctx.textAlign = 'center';
  ctx.fillText('Precision FreeCell', W/2, H*0.49);
  ctx.globalAlpha = 1;

  const pillW = W*0.285, pillH = H*0.072;
  const pillY = H*0.535;
  drawStatPill(W*0.06, pillY, pillW, pillH, 'BEST', `${bestScore}`);
  drawStatPill(W*0.365, pillY, pillW, pillH, 'WON', `${gamesWon}/${gamesPlayed}`);
  drawStatPill(W*0.67, pillY, pillW, pillH, 'STREAK', `${winStreak}`);

  // Progress bar to next unlock
  const unlockThresholds = getUnlockThresholds();
  const nextUnlock = unlockThresholds.find(t => t > bestScore);
  if(nextUnlock) {
    const prev = unlockThresholds[unlockThresholds.indexOf(nextUnlock)-1] || 0;
    const pct = (bestScore-prev)/(nextUnlock-prev);
    drawProgressPanel(W*0.14, H*0.64, W*0.72, H*0.085, pct, `Unlock at ${nextUnlock} pts`);
  } else {
    drawProgressPanel(W*0.14, H*0.64, W*0.72, H*0.085, 1, 'Todo desbloqueado');
  }

  drawDifficultySelector();
  drawButton(W*0.16, H*0.81, W*0.68, H*0.078, '▶ PLAY', theme.accent, '#061018');

  ctx.fillStyle = '#aabbcc';
  ctx.globalAlpha = 0.78;
  ctx.font = `bold ${Math.floor(W*0.028)}px Arial`;
  ctx.textAlign = 'center';
  ctx.fillText(`Best streak ${bestWinStreak}`, W/2, H*0.925);
  ctx.globalAlpha = 1;
}

function drawGame() {
  drawBackground();
  const theme = ThemeManager.get();

  // Cards in flight are hidden at their destination until landing
  const skipFree = {}, skipFound = {}, skipCasc = {};
  flights.forEach(f => {
    if(f.target.type==='free') skipFree[f.target.idx] = true;
    else if(f.target.type==='found') skipFound[f.target.idx] = (skipFound[f.target.idx]||0) + 1;
    else skipCasc[f.target.idx] = (skipCasc[f.target.idx]||0) + f.cards.length;
  });

  // Draw free cell slots
  for(let i=0; i<4; i++) {
    if(freeCells[i] && !skipFree[i]) {
      const isSel = selected && selected.source==='free' && selected.idx===i;
      const isHint = hintCard && hintCard.source==='free' && hintCard.col===i;
      drawCard(FREE_X[i], isSel ? FREE_Y-6 : FREE_Y, freeCells[i].rank, freeCells[i].suit, true, isSel, isHint);
    } else {
      drawEmptySlot(FREE_X[i], FREE_Y, 'FC');
    }
  }

  // Draw foundation slots
  for(let i=0; i<4; i++) {
    const shownRank = foundations[i] - (skipFound[i]||0);
    if(shownRank > 0) {
      const isHintTarget = hintTarget && hintTarget.type==='found' && hintTarget.suit===i;
      drawCard(FOUND_X[i], FOUND_Y, shownRank, i, true, false, isHintTarget);
    } else {
      drawEmptySlot(FOUND_X[i], FOUND_Y, SUITS[i]);
    }
  }

  // Pulsating highlight on every valid destination while a card is held
  if(selected && selected.cards.length) {
    const c0 = selected.cards[0];
    ctx.save();
    ctx.strokeStyle = theme.accent;
    ctx.lineWidth = 2.5;
    ctx.shadowColor = theme.accent;
    ctx.shadowBlur = 12;
    ctx.globalAlpha = 0.45 + Math.sin(Date.now()*0.007)*0.3;
    const mark = (x,y) => { ctx.beginPath(); roundRect(ctx,x-2,y-2,CARD_W+4,CARD_H+4,CARD_R+2); ctx.stroke(); };
    if(selected.cards.length === 1) {
      for(let i=0; i<4; i++) if(!freeCells[i]) mark(FREE_X[i], FREE_Y);
      if(canMoveToFoundation(c0)) mark(FOUND_X[c0.suit], FOUND_Y);
    }
    for(let col=0; col<8; col++) {
      if(selected.source==='cascade' && selected.idx===col) continue;
      if(canMoveToCascade(c0, col) && selected.cards.length <= maxMovable()) {
        const len = cascades[col].length;
        mark(COL_X[col], len ? COL_Y_START + (len-1)*getCardOverlap(col) : COL_Y_START);
      }
    }
    ctx.restore();
  }

  // Draw cascade columns
  for(let col=0; col<8; col++) {
    const c = cascades[col];
    if(c.length === 0) {
      const isHintTarget = hintTarget && hintTarget.type==='cascade' && hintTarget.col===col;
      drawEmptySlot(COL_X[col], COL_Y_START, '', true);
      if(isHintTarget) {
        ctx.save();
        ctx.strokeStyle='#ffd54f'; ctx.lineWidth=2.5; ctx.globalAlpha=0.7;
        ctx.beginPath(); roundRect(ctx,COL_X[col],COL_Y_START,CARD_W,CARD_H,CARD_R); ctx.stroke();
        ctx.restore();
      }
      continue;
    }
    const overlap = getCardOverlap(col);
    const drawLen = c.length - (skipCasc[col]||0);
    for(let row=0; row<drawLen; row++) {
      const cx = COL_X[col];
      const isSel = selected && selected.source==='cascade' && selected.idx===col && row>=selected.row;
      const cy = COL_Y_START + row*overlap + (isSel ? -6 : 0);
      const isHint = hintCard && hintCard.source==='cascade' && hintCard.col===col && row===hintCard.row;
      const isHintTarget = hintTarget && hintTarget.type==='cascade' && hintTarget.col===col && row===c.length-1;
      drawCard(cx, cy, c[row].rank, c[row].suit, true, isSel, isHint||isHintTarget);
    }
  }

  // Flying cards (eased arc with slight scale-up mid-flight)
  flights = flights.filter(f => {
    f.t = Math.min(1, f.t + 0.085);
    const e = 1 - Math.pow(1 - f.t, 3);
    const fx = f.x0 + (f.x1 - f.x0) * e;
    const fy = f.y0 + (f.y1 - f.y0) * e - Math.sin(f.t * Math.PI) * 26;
    const ov = CARD_H * 0.28;
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 16;
    ctx.shadowOffsetY = 8;
    f.cards.forEach((c, i) => drawCard(fx, fy + i*ov, c.rank, c.suit, true));
    ctx.restore();
    if(f.t >= 1) {
      if(f.onLand) f.onLand();
      else VFX.spawnRing(f.x1 + CARD_W/2, f.y1 + CARD_H/2, theme.accent);
      return false;
    }
    return true;
  });

  drawBlockedSequence();

  // HUD with score pop
  if(score > lastScore) scorePop = 1;
  lastScore = score;
  scorePop *= 0.92;
  ctx.fillStyle = scorePop > 0.15 ? theme.accent : theme.text;
  ctx.font = `bold ${Math.floor(W*0.038*(1+scorePop*0.3))}px Arial`;
  ctx.textAlign = 'center';
  const playTime = currentPlayTime();
  ctx.fillText(`Score: ${score}  Moves: ${moves}  ${formatTime(playTime)}`, W/2, H*0.88);

  const progressW = W*0.72, progressH = Math.max(8, H*0.012);
  const progressX = (W-progressW)/2, progressY = H*0.895;
  const pulse = flowPulse > 0 ? flowPulse / 18 : 0;
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  ctx.beginPath(); roundRect(ctx, progressX, progressY, progressW, progressH, progressH/2); ctx.fill();
  ctx.fillStyle = theme.accent;
  ctx.globalAlpha = 0.8 + pulse*0.2;
  ctx.beginPath(); roundRect(ctx, progressX, progressY, progressW*foundationProgress(), progressH, progressH/2); ctx.fill();
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#aabbcc';
  ctx.font = `${Math.floor(W*0.027)}px Arial`;
  ctx.fillText(`Foundations ${Math.floor(foundationProgress()*100)}%  ${moveCapacityHint()}`, W/2, progressY+progressH+9);
  if(flowPulse > 0) flowPulse--;

  // Action buttons
  const btnH = H*0.062;
  drawControlDock(H*0.914, H*0.086);
  drawSmallButton(W*0.045, H*0.923, W*0.185, btnH, 'undo', 'Undo');
  drawSmallButton(W*0.285, H*0.923, W*0.185, btnH, 'hint', 'Hint');
  drawSmallButton(W*0.525, H*0.923, W*0.185, btnH, 'new', 'New');
  drawSmallButton(W*0.765, H*0.923, W*0.185, btnH, 'settings', 'Pause');

  // Hint timer
  if(hintTimer > 0) hintTimer--;
  else { hintCard=null; hintTarget=null; }
  if(coachAlert && coachAlert.timer > 0) coachAlert.timer--;
  else coachAlert = null;
  if(blockedSeq && blockedSeq.timer > 0) blockedSeq.timer--;
  else blockedSeq = null;
  drawCoachAlert();
}

function drawWin() {
  drawBackground();
  const theme = ThemeManager.get();

  // Classic solitaire bouncing-card cascade
  winBounce.forEach(b => {
    if(b.delay > 0) { b.delay--; return; }
    b.x += b.vx; b.y += b.vy; b.vy += 0.35;
    if(b.y > H - CARD_H) {
      b.y = H - CARD_H;
      b.vy *= -0.82;
      if(Math.random() < 0.3) VFX.spawnParticles(b.x+CARD_W/2, b.y+CARD_H, theme.accent, 4);
    }
    if(b.x < -CARD_W) b.x = W;
    if(b.x > W) b.x = -CARD_W;
    drawCard(b.x, b.y, b.rank, b.suit, true);
  });

  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.fillRect(0,0,W,H);
  ctx.fillStyle = theme.accent;
  ctx.font = `bold ${Math.floor(W*0.12)}px Arial Black`;
  ctx.textAlign='center';
  ctx.fillText('YOU WIN!', W/2, H*0.35);
  ctx.fillStyle = theme.text;
  ctx.font = `bold ${Math.floor(W*0.06)}px Arial`;
  ctx.fillText(`Score: ${score}`, W/2, H*0.45);
  ctx.fillText(`Record: ${bestScore}`, W/2, H*0.52);
  ctx.fillText(`Time: ${formatTime(elapsedTime)}  Moves: ${moves}`, W/2, H*0.59);
  ctx.fillText(`Streak: ${winStreak}  Best: ${bestWinStreak}`, W/2, H*0.65);
  drawButton(W*0.2, H*0.7, W*0.6, H*0.08, '▶ PLAY AGAIN', theme.accent, '#000');
}

function drawSettings() {
  drawBackground();
  const theme = ThemeManager.get();

  ctx.fillStyle = theme.text;
  ctx.font = `bold ${Math.floor(W*0.07)}px Arial Black`;
  ctx.textAlign='center';
  ctx.fillText('THEMES', W/2, H*0.15);

  ctx.font = `${Math.floor(W*0.04)}px Arial`;
  ctx.fillStyle='#aabbcc';
  ctx.fillText(`Record: ${bestScore} pts`, W/2, H*0.22);

  // Themes
  ctx.fillStyle=theme.text; ctx.font=`bold ${Math.floor(W*0.04)}px Arial`;
  ctx.fillText('Table Color', W/2, H*0.29);
  ThemeManager.THEMES.forEach((t,i) => {
    const locked = bestScore < t.unlockScore;
    const r = themeOptionRect(i);
    const bx = r.x, by = r.y;
    ctx.fillStyle = locked ? '#333' : t.felt;
    ctx.beginPath(); roundRect(ctx,bx,by,r.w,r.h,8); ctx.fill();
    ctx.strokeStyle = ThemeManager.current===i ? theme.accent : '#555';
    ctx.lineWidth = ThemeManager.current===i ? 3 : 1;
    ctx.stroke();
    ctx.fillStyle = locked ? '#666' : theme.text;
    ctx.font = `bold ${Math.floor(W*0.026)}px Arial`;
    ctx.textAlign='center';
    ctx.fillText(locked ? `${t.unlockScore}` : t.name, bx+r.w/2, by+r.h*0.58);
  });

  // Backgrounds
  ctx.fillStyle=theme.text; ctx.font=`bold ${Math.floor(W*0.04)}px Arial`;
  ctx.textAlign='center';
  ctx.fillText('Animated Background', W/2, H*0.56);
  ThemeManager.BG_STYLES.forEach((b,i) => {
    const locked = bestScore < b.unlockScore;
    const r = bgOptionRect(i);
    const bx = r.x, by = r.y;
    ctx.fillStyle = locked ? '#333' : 'rgba(255,255,255,0.1)';
    ctx.beginPath(); roundRect(ctx,bx,by,r.w,r.h,8); ctx.fill();
    ctx.strokeStyle = ThemeManager.currentBg===i ? theme.accent : '#555';
    ctx.lineWidth = ThemeManager.currentBg===i ? 3 : 1;
    ctx.stroke();
    ctx.fillStyle = locked ? '#666' : theme.text;
    ctx.font = `bold ${Math.floor(W*0.029)}px Arial`;
    ctx.textAlign='center';
    ctx.fillText(locked ? `${b.unlockScore}` : b.name, bx+r.w/2, by+r.h*0.58);
  });

  drawButton(W*0.3, H*0.74, W*0.4, H*0.07, '← Back', theme.accent, '#000');
}

function drawButton(x, y, w, h, label, bg, textColor) {
  ctx.save();
  // Soft glow behind the button
  ctx.shadowColor = bg;
  ctx.shadowBlur = 16;
  ctx.shadowOffsetY = 3;
  const grad = ctx.createLinearGradient(x, y, x, y+h);
  grad.addColorStop(0, 'rgba(255,255,255,0.35)');
  grad.addColorStop(0.5, 'rgba(255,255,255,0)');
  ctx.fillStyle = bg;
  ctx.beginPath(); roundRect(ctx,x,y,w,h,h/2); ctx.fill();
  // Kill shadow completely before drawing anything else
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  // Top gloss
  ctx.fillStyle = grad;
  ctx.beginPath(); roundRect(ctx,x,y,w,h,h/2); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.4)';
  ctx.lineWidth = 1.5;
  ctx.beginPath(); roundRect(ctx,x,y,w,h,h/2); ctx.stroke();
  // Label — shrink font until it fits inside the button
  let fs = Math.floor(h*0.46);
  ctx.font = `bold ${fs}px Arial Black`;
  while(fs > 9 && ctx.measureText(label).width > w*0.84) {
    fs--;
    ctx.font = `bold ${fs}px Arial Black`;
  }
  ctx.fillStyle = textColor;
  ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.fillText(label, x+w/2, y+h/2+1);
  ctx.textBaseline='alphabetic';
  ctx.restore();
}

function drawToolIcon(x, y, size, type, color) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = Math.max(1.5, size*0.12);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const cx = x + size/2, cy = y + size/2;

  if(type === 'undo' || type === 'new') {
    const dir = type === 'undo' ? -1 : 1;
    ctx.beginPath();
    ctx.arc(cx, cy, size*0.28, type === 'undo' ? -0.15 : Math.PI+0.15, type === 'undo' ? Math.PI*1.35 : Math.PI*2.35, type === 'undo');
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx - dir*size*0.33, cy - size*0.12);
    ctx.lineTo(cx - dir*size*0.46, cy - size*0.28);
    ctx.lineTo(cx - dir*size*0.47, cy - size*0.02);
    ctx.stroke();
  } else if(type === 'hint') {
    ctx.beginPath();
    ctx.arc(cx, cy-size*0.08, size*0.22, 0, Math.PI*2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx-size*0.13, cy+size*0.18);
    ctx.lineTo(cx+size*0.13, cy+size*0.18);
    ctx.moveTo(cx-size*0.09, cy+size*0.32);
    ctx.lineTo(cx+size*0.09, cy+size*0.32);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.arc(cx, cy, size*0.18, 0, Math.PI*2);
    ctx.stroke();
    for(let i=0; i<8; i++) {
      const a = i * Math.PI/4;
      ctx.beginPath();
      ctx.moveTo(cx+Math.cos(a)*size*0.31, cy+Math.sin(a)*size*0.31);
      ctx.lineTo(cx+Math.cos(a)*size*0.42, cy+Math.sin(a)*size*0.42);
      ctx.stroke();
    }
  }
  ctx.restore();
}

function drawControlDock(y, h) {
  ctx.save();
  const grad = ctx.createLinearGradient(0, y, 0, y+h);
  grad.addColorStop(0, 'rgba(255,255,255,0.055)');
  grad.addColorStop(1, 'rgba(0,0,0,0.18)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  roundRect(ctx, W*0.025, y, W*0.95, h, 12);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,213,79,0.12)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();
}

function drawSmallButton(x, y, w, h, icon, label) {
  const theme = ThemeManager.get();
  ctx.save();
  const grad = ctx.createLinearGradient(x, y, x, y+h);
  grad.addColorStop(0, 'rgba(255,255,255,0.115)');
  grad.addColorStop(0.5, 'rgba(255,255,255,0.05)');
  grad.addColorStop(1, 'rgba(0,0,0,0.11)');
  ctx.shadowColor='rgba(0,0,0,0.22)';
  ctx.shadowBlur=7;
  ctx.shadowOffsetY=2;
  ctx.fillStyle=grad;
  ctx.beginPath(); roundRect(ctx,x,y,w,h,8); ctx.fill();
  ctx.shadowBlur=0;
  ctx.shadowOffsetY=0;
  ctx.strokeStyle='rgba(255,255,255,0.18)'; ctx.lineWidth=1; ctx.stroke();
  ctx.globalAlpha = 0.2;
  ctx.strokeStyle = theme.accent;
  ctx.beginPath(); roundRect(ctx,x+1.5,y+1.5,w-3,h-3,7); ctx.stroke();
  ctx.globalAlpha = 1;

  const iconSize = Math.min(h*0.34, w*0.25);
  const iconX = x + (w-iconSize)/2;
  const iconY = y + h*0.17;
  drawToolIcon(iconX, iconY, iconSize, icon, theme.accent);

  let fontSize = Math.floor(Math.min(h*0.25, W*0.029));
  ctx.font=`bold ${fontSize}px Arial`;
  const maxTextW = w * 0.84;
  while(ctx.measureText(label).width > maxTextW && fontSize > 9) {
    fontSize--;
    ctx.font=`bold ${fontSize}px Arial`;
  }
  ctx.fillStyle=theme.text;
  ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.fillText(label, x+w/2, y+h*0.72);
  ctx.textBaseline='alphabetic';
  ctx.restore();
}

// ── Tutorial overlay ──
let tutorialStep = -1;
const TUTORIAL_STEPS = [
  { icon:'🃏', title:'Welcome to FreeCell', text:'Move all cards to the 4\nfoundation piles (top right)\nordered by suit: A → K' },
  { icon:'📋', title:'Build in Cascades', text:'Stack cards in descending\norder, alternating colors.\nRed 6 → Black 5 → Red 4' },
  { icon:'🔲', title:'Free Cells', text:'Use the 4 free cells (top left)\nas temporary storage.\nEach holds one card.' },
  { icon:'💡', title:'Tips', text:'Tap a card to select it,\nthen tap where to move it.\nUse Hint if you get stuck!' }
];

function shouldShowTutorial() {
  return !localStorage.getItem('sm_tutorial_done');
}

function startTutorial() {
  tutorialStep = 0;
}

function drawTutorial() {
  ctx.fillStyle = 'rgba(0,0,0,0.72)';
  ctx.fillRect(0,0,W,H);
  const step = TUTORIAL_STEPS[tutorialStep];
  const bw = W*0.82, bh = H*0.38;
  const bx = (W-bw)/2, by = H*0.22;
  const theme = ThemeManager.get();
  ctx.fillStyle = 'rgba(20,25,40,0.95)';
  ctx.beginPath(); roundRect(ctx,bx,by,bw,bh,18); ctx.fill();
  ctx.strokeStyle = theme.accent; ctx.lineWidth = 2;
  ctx.beginPath(); roundRect(ctx,bx,by,bw,bh,18); ctx.stroke();
  ctx.font = `${Math.floor(W*0.12)}px Arial`;
  ctx.textAlign='center';
  ctx.fillStyle = '#fff';
  ctx.fillText(step.icon, W/2, by+bh*0.18);
  ctx.font = `bold ${Math.floor(W*0.05)}px Arial Black`;
  ctx.fillStyle = theme.accent;
  ctx.fillText(step.title, W/2, by+bh*0.32);
  ctx.font = `${Math.floor(W*0.036)}px Arial`;
  ctx.fillStyle = '#d6e4e8';
  const lines = step.text.split('\n');
  lines.forEach((l,i) => ctx.fillText(l, W/2, by+bh*0.46+i*W*0.05));
  ctx.fillStyle = '#8899aa';
  ctx.font = `${Math.floor(W*0.028)}px Arial`;
  ctx.fillText(`${tutorialStep+1} / ${TUTORIAL_STEPS.length}`, W/2, by+bh*0.85);
  const isLast = tutorialStep === TUTORIAL_STEPS.length - 1;
  drawButton(bx+bw*0.15, by+bh*0.88, bw*0.7, H*0.06, isLast ? '▶ GOT IT!' : 'NEXT →', theme.accent, '#000');
}

function handleTutorialTap() {
  tutorialStep++;
  if(tutorialStep >= TUTORIAL_STEPS.length) {
    tutorialStep = -1;
    localStorage.setItem('sm_tutorial_done', '1');
  }
}

// ── Main loop ──
function loop() {
  requestAnimationFrame(loop);
  VFX.update();

  switch(gameState) {
    case 'menu': drawMenu(); break;
    case 'playing': drawGame(); break;
    case 'win': drawWin(); break;
    case 'settings': drawSettings(); break;
    case 'pause': drawPause(); break;
  }

  VFX.draw(ctx);
  if(tutorialStep >= 0) drawTutorial();
}

// ── Init ──
function init() {
  resize();
  ThemeManager.load();
  loadProgress();

  // Generate background stars
  for(let i=0; i<100; i++) bgStars.push({
    x: Math.random()*W, y: Math.random()*H,
    r: 0.4+Math.random()*1.8,
    speed: 0.3+Math.random()*1.5,
    phase: Math.random()*Math.PI*2
  });

  // Generate background orbs
  const orbColors = [
    'rgba(100,120,255,A)', 'rgba(180,80,255,A)',
    'rgba(80,200,180,A)',  'rgba(255,180,60,A)',
    'rgba(255,80,120,A)',  'rgba(60,180,255,A)'
  ];
  for(let i=0; i<8; i++) bgOrbs.push({
    x: Math.random()*W, y: Math.random()*H,
    r: 80+Math.random()*140,
    speed: 0.15+Math.random()*0.4,
    phase: Math.random()*Math.PI*2,
    color: orbColors[i % orbColors.length]
  });

  window.addEventListener('resize', ()=>{ resize(); });

  canvas.addEventListener('click', e => {
    const r = canvas.getBoundingClientRect();
    const sx = W/canvas.clientWidth;
    const sy = H/canvas.clientHeight;
    handleTap((e.clientX-r.left)*sx, (e.clientY-r.top)*sy);
    if(!AudioManager.ctx) AudioManager.init();
  });

  canvas.addEventListener('touchstart', e => {
    e.preventDefault();
    const r = canvas.getBoundingClientRect();
    const t = e.touches[0];
    const sx = W/canvas.clientWidth;
    const sy = H/canvas.clientHeight;
    handleTap((t.clientX-r.left)*sx, (t.clientY-r.top)*sy);
    if(!AudioManager.ctx) AudioManager.init();
  }, {passive:false});

  // Loading screen
  const fill = document.getElementById('loadingFill');
  const ls = document.getElementById('loadingScreen');
  if(fill) fill.style.width = '40%';
  (async () => {
    try { await AdsManager.init(); } catch(e) {}
    if(fill) fill.style.width = '100%';
    if(AdsManager.loadingFinished) AdsManager.loadingFinished();
    setTimeout(() => { if(ls) ls.classList.add('done'); }, 400);
  })();

  // Poki: handle tab visibility for pause
  document.addEventListener('visibilitychange', () => {
    if(document.hidden && gameState === 'playing') {
      gameState = 'pause';
      AdsManager.gameplayStop();
      AudioManager._pauseBg();
    }
  });

  loop();
}

init();
