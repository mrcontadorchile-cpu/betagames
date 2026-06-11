const ThemeManager = {
  THEMES: [
    {
      id: 'classic', ambient: {type:'fall', color:'255,213,79', count:26, size:2.2, glow:false}, orbTint:['rgba(255,200,80,A)','rgba(80,140,255,A)'], name: 'Classic', unlockScore: 0,
      bg: '#0b1020', bgGlow: '#1a2545', bgEdge: '#040608',
      felt: '#1a6b3a', feltBorder: '#2d9a56',
      cardBg: '#ffffff', cardBorder: '#cccccc',
      cardBack: ['#1a3a7a', '#2a5abf'],
      accent: '#ffd54f', text: '#ffffff'
    },
    {
      id: 'rose', ambient: {type:'petal', color:'255,170,200', count:18, size:5, glow:false}, orbTint:['rgba(255,120,170,A)','rgba(255,200,220,A)'], name: 'Rose', unlockScore: 0,
      bg: '#170b14', bgGlow: '#45213b', bgEdge: '#070307',
      felt: '#5a243f', feltBorder: '#c86f93',
      cardBg: '#fff7fb', cardBorder: '#e7b8cc',
      cardBack: ['#7d3159', '#d889a8'],
      accent: '#ffd1dc', text: '#fff5fa'
    },
    {
      id: 'midnight', ambient: {type:'fall', color:'140,190,255', count:30, size:1.8, glow:true}, orbTint:['rgba(70,120,255,A)','rgba(140,90,255,A)'], name: 'Midnight', unlockScore: 500,
      bg: '#050a1a', bgGlow: '#0d1f40', bgEdge: '#020408',
      felt: '#0d2240', feltBorder: '#1a3a6a',
      cardBg: '#e8eeff', cardBorder: '#a0b0d0',
      cardBack: ['#0d1b40', '#1a2f6b'],
      accent: '#64b5f6', text: '#e8f0ff'
    },
    {
      id: 'lavender', ambient: {type:'rise', color:'200,170,255', count:22, size:2.5, glow:true}, orbTint:['rgba(170,120,255,A)','rgba(120,90,220,A)'], name: 'Lavender', unlockScore: 900,
      bg: '#120f22', bgGlow: '#332653', bgEdge: '#060510',
      felt: '#40305c', feltBorder: '#9f86d9',
      cardBg: '#fbf8ff', cardBorder: '#cab8ef',
      cardBack: ['#4b3874', '#a78bdc'],
      accent: '#d8c7ff', text: '#f8f2ff'
    },
    {
      id: 'sunset', ambient: {type:'rise', color:'255,140,70', count:24, size:2.8, glow:true}, orbTint:['rgba(255,110,60,A)','rgba(255,60,100,A)'], name: 'Sunset', unlockScore: 1500,
      bg: '#150810', bgGlow: '#3a1020', bgEdge: '#060204',
      felt: '#4a1a2a', feltBorder: '#7a2a45',
      cardBg: '#fff8f0', cardBorder: '#e0c0a0',
      cardBack: ['#8b1a2a', '#c0304a'],
      accent: '#ff8a65', text: '#fff0e8'
    },
    {
      id: 'pearl', ambient: {type:'wander', color:'255,240,210', count:18, size:2, glow:true}, orbTint:['rgba(220,200,170,A)','rgba(180,170,200,A)'], name: 'Pearl', unlockScore: 2200,
      bg: '#11151a', bgGlow: '#3b3942', bgEdge: '#050608',
      felt: '#4f5966', feltBorder: '#d7c5a1',
      cardBg: '#fffdf8', cardBorder: '#d8c9ad',
      cardBack: ['#7a7282', '#d1b8c8'],
      accent: '#ffe6a7', text: '#fffaf0'
    },
    {
      id: 'emerald', ambient: {type:'firefly', color:'130,255,180', count:14, size:3, glow:true}, orbTint:['rgba(60,220,140,A)','rgba(40,180,200,A)'], name: 'Emerald', unlockScore: 3000,
      bg: '#030f0a', bgGlow: '#0a2818', bgEdge: '#010503',
      felt: '#0a3020', feltBorder: '#155535',
      cardBg: '#f0fff5', cardBorder: '#a0d0b0',
      cardBack: ['#0a3520', '#1a6040'],
      accent: '#69f0ae', text: '#e0fff0'
    }
  ],
  BG_STYLES: [
    { id: 'plain', name: 'Plain', unlockScore: 0 },
    { id: 'petals', name: 'Petals', unlockScore: 0 },
    { id: 'stars', name: 'Stars', unlockScore: 800 },
    { id: 'silk', name: 'Silk', unlockScore: 1200 },
    { id: 'waves', name: 'Waves', unlockScore: 2000 },
    { id: 'aurora', name: 'Aurora', unlockScore: 2600 }
  ],
  current: 0,
  currentBg: 0,

  load() {
    const s = localStorage.getItem('sm_theme');
    const b = localStorage.getItem('sm_bg');
    if(s !== null) this.current = parseInt(s);
    if(b !== null) this.currentBg = parseInt(b);
  },
  save() {
    localStorage.setItem('sm_theme', this.current);
    localStorage.setItem('sm_bg', this.currentBg);
  },
  get() { return this.THEMES[this.current]; },
  getBg() { return this.BG_STYLES[this.currentBg]; },
  unlockedThemes(score) {
    return this.THEMES.filter(t => score >= t.unlockScore);
  },
  unlockedBgs(score) {
    return this.BG_STYLES.filter(b => score >= b.unlockScore);
  },
  setTheme(idx) { this.current = idx; this.save(); },
  setBg(idx) { this.currentBg = idx; this.save(); }
};
