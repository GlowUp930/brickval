// BrickVal — Paste this entire file into the Scripter plugin and hit ▶ Run
// Scripter: https://www.figma.com/community/plugin/757836922707087381/scripter

// ── Font preload ─────────────────────────────────────────────────────────────
const fonts = [
  ['Inter', 'Regular'], ['Inter', 'Medium'], ['Inter', 'Semi Bold'],
  ['Inter', 'Bold'],    ['Inter', 'Extra Bold'], ['Inter', 'Black'],
];
for (const [family, style] of fonts) {
  try { await figma.loadFontAsync({ family, style }); } catch (_) {}
}

// ── Design tokens ─────────────────────────────────────────────────────────────
const C = {
  bg:          { r: 0.055, g: 0.055, b: 0.055 },
  primary:     { r: 1,     g: 0.765, b: 0.173 },
  primaryCont: { r: 0.914, g: 0.690, b: 0.067 },
  onPrimary:   { r: 0.345, g: 0.251, b: 0     },
  surfLow:     { r: 0.075, g: 0.075, b: 0.075 },
  surfHigh:    { r: 0.125, g: 0.125, b: 0.122 },
  white:       { r: 1,     g: 1,     b: 1     },
  muted:       { r: 0.678, g: 0.667, b: 0.667 },
  gray:        { r: 0.443, g: 0.443, b: 0.478 },
  dark:        { r: 0.067, g: 0.067, b: 0.067 },
  green:       { r: 0.239, g: 0.749, b: 0.357 },
  red:         { r: 0.937, g: 0.267, b: 0.267 },
};

// ── Helpers ──────────────────────────────────────────────────────────────────
function solid(color, opacity = 1) {
  return [{ type: 'SOLID', color, opacity }];
}

function mkFrame(parent, x, y, w, h, color, name, opacity = 1) {
  const f = figma.createFrame();
  f.x = x; f.y = y; f.resize(w, h);
  f.fills = color ? solid(color, opacity) : [];
  f.clipsContent = true;
  if (name) f.name = name;
  parent.appendChild(f);
  return f;
}

function mkRect(parent, x, y, w, h, color, radius = 0, opacity = 1, name = '') {
  const r = figma.createRectangle();
  r.x = x; r.y = y; r.resize(w, h);
  r.fills = color ? solid(color, opacity) : [];
  if (radius) r.cornerRadius = radius;
  if (name) r.name = name;
  parent.appendChild(r);
  return r;
}

function mkEllipse(parent, x, y, w, h, color, opacity = 1) {
  const e = figma.createEllipse();
  e.x = x; e.y = y; e.resize(w, h);
  e.fills = color ? solid(color, opacity) : [];
  parent.appendChild(e);
  return e;
}

function mkText(parent, content, x, y, size, color, weight = 'Regular', opacity = 1, opts = {}) {
  const t = figma.createText();
  t.fontName = { family: 'Inter', style: weight };
  t.characters = String(content);
  t.fontSize = size;
  t.fills = color ? solid(color, opacity) : [];
  t.x = x; t.y = y;
  if (opts.letterSpacing) t.letterSpacing = { value: opts.letterSpacing, unit: 'PIXELS' };
  if (opts.lineHeight)    t.lineHeight    = { value: opts.lineHeight,    unit: 'PIXELS' };
  if (opts.width) { t.textAutoResize = 'HEIGHT'; t.resize(opts.width, t.height); }
  parent.appendChild(t);
  return t;
}

function gradFill(x1, y1, x2, y2, stops) {
  const dx = x2 - x1, dy = y2 - y1;
  return [{
    type: 'GRADIENT_LINEAR',
    gradientTransform: [[dx, dy, x1], [-dy, dx, y1]],
    gradientStops: stops,
  }];
}

function buildBottomNav(parent, activeTab) {
  const nav = mkFrame(parent, 0, 764, 390, 80, C.bg, 'BottomNav', 0.75);
  const tabs = [
    { label: 'HOME',       x: 6   },
    { label: 'SCANNER',    x: 104 },
    { label: 'COLLECTION', x: 202 },
    { label: 'MARKET',     x: 300 },
  ];
  tabs.forEach(({ label, x }) => {
    const active = label === activeTab;
    const tf = mkFrame(nav, x, 8, 82, 64, active ? C.primary : null, label, active ? 0.08 : 1);
    tf.clipsContent = false;
    tf.cornerRadius = 12;
    mkEllipse(tf, 29, 8, 24, 24, active ? C.primary : C.gray);
    const lx = label === 'COLLECTION' ? 4 : label === 'SCANNER' ? 10 : label === 'MARKET' ? 16 : 20;
    mkText(tf, label, lx, 40, 8, active ? C.primary : C.gray, 'Bold', 1, { letterSpacing: 0.6 });
  });
  return nav;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 01 · HOME SCREEN
// ═══════════════════════════════════════════════════════════════════════════════
const home = mkFrame(figma.currentPage, 0, 0, 390, 844, C.bg, '01 · Home');

// — Top app bar
const hdr = mkFrame(home, 0, 0, 390, 64, C.bg, 'TopAppBar', 0.72);
mkEllipse(hdr, 20, 12, 40, 40, { r: 0.102, g: 0.102, b: 0.102 });
mkText(hdr, 'BrickVal', 143, 18, 22, C.primary, 'Black');
mkEllipse(hdr, 351, 21, 18, 18, C.primary);

// — Hero label + value
mkText(home, 'YOUR COLLECTION VALUE', 24, 84, 10, C.muted, 'Bold', 1, { letterSpacing: 1.6 });
mkText(home, '$12,450.00', 24, 100, 40, C.white, 'Black');

// — Trending badge
mkRect(home, 210, 110, 78, 24, C.primary, 12, 0.12);
mkText(home, '▲ +2.4%', 220, 114, 11, C.primary, 'Bold');

// — Sparkline card
const spark = mkFrame(home, 24, 150, 342, 112, C.surfLow, 'Sparkline');
spark.cornerRadius = 12;
const dataY = [30, 28, 38, 30, 22, 32, 15, 26, 18, 12, 20, 5];
const step = 342 / (dataY.length - 1);
for (let i = 0; i < dataY.length - 1; i++) {
  const x1 = Math.round(i * step), y1 = 100 - dataY[i];
  const x2 = Math.round((i+1) * step), y2 = 100 - dataY[i+1];
  const dx = x2 - x1, dy = y2 - y1;
  const len = Math.round(Math.sqrt(dx*dx + dy*dy));
  const seg = mkRect(spark, x1, Math.min(y1,y2), len + 2, Math.max(Math.abs(dy), 3), C.primary, 1);
  seg.opacity = 0.9;
}
mkEllipse(spark, Math.round((dataY.length-1)*step) - 5, 100 - dataY[11] - 5, 10, 10, C.primary);
mkEllipse(spark, Math.round((dataY.length-1)*step) - 9, 100 - dataY[11] - 9, 18, 18, C.primary, 0.2);

// — Scan CTA
const scanBtn = mkFrame(home, 24, 278, 342, 104, null, 'Scan CTA');
scanBtn.cornerRadius = 12;
scanBtn.fills = gradFill(0, 0, 1, 0, [
  { position: 0, color: C.primary },
  { position: 1, color: C.primaryCont },
]);
mkText(scanBtn, 'Scan LEGO', 28, 24, 22, C.onPrimary, 'Bold');
mkText(scanBtn, 'Identify sets instantly via camera', 28, 54, 12, C.onPrimary, 'Regular', 0.7);
mkRect(scanBtn, 272, 24, 46, 56, C.onPrimary, 10, 0.15);
// corner brackets on icon
[[280,32],[310,32],[280,64],[310,64]].forEach(([bx,by],i) => {
  mkRect(scanBtn, bx + (i%2===1?-8:0), by + (i>1?-2:0), 8, 2, C.onPrimary, 1);
  mkRect(scanBtn, bx, by + (i>1?-8:0), 2, 8, C.onPrimary, 1);
});

// — Recent Scans
mkText(home, 'Recent Scans', 24, 402, 20, C.white, 'Bold');
mkText(home, 'View All', 318, 407, 10, C.primary, 'Bold', 1, { letterSpacing: 1 });
[
  { num: '75192', name: 'UCS Millennium Falcon', price: '$849.99', gain: '+12%' },
  { num: '42056', name: 'Porsche 911 GT3 RS',    price: '$612.40', gain: '+4.2%' },
].forEach((s, i) => {
  const card = mkFrame(home, 24 + i * 180, 430, 168, 184, C.surfHigh, `Card · ${s.num}`);
  card.cornerRadius = 12;
  mkRect(card, 0, 0, 168, 110, C.dark, 0);
  mkRect(card, 108, 8, 52, 20, { r:0,g:0,b:0 }, 4, 0.6);
  mkText(card, s.num, 112, 11, 9, C.white, 'Bold', 1, { letterSpacing: 0.5 });
  mkRect(card, 58, 34, 52, 44, C.primary, 8, 0.15);
  mkText(card, s.name, 12, 118, 12, C.white, 'Bold', 1, { width: 144 });
  mkText(card, s.price, 12, 140, 11, C.muted, 'Medium');
  mkText(card, s.gain, 90, 140, 11, C.primary, 'Bold');
});

// — Market Trends
mkText(home, 'Market Trends', 24, 632, 20, C.white, 'Bold');
[
  { num: '21044', name: 'Paris Skyline',       theme: 'Architecture', badge: 'RETIRING SOON', gain: '+$42.00' },
  { num: '21309', name: 'NASA Apollo Saturn V', theme: 'Ideas',       badge: 'BULLISH',       gain: '+$28.15' },
].forEach((t, i) => {
  const row = mkFrame(home, 24, 660 + i * 66, 342, 58, C.surfLow, `Trend · ${t.num}`);
  row.cornerRadius = 10;
  row.clipsContent = false;
  mkRect(row, 0, 0, 3, 58, C.primary, 0);
  mkRect(row, 8, 8, 42, 42, C.dark, 8);
  mkRect(row, 14, 14, 30, 30, C.primary, 4, 0.15);
  mkText(row, t.badge, 58, 8, 8, C.primary, 'Bold', 1, { letterSpacing: 0.8 });
  mkText(row, t.name, 58, 22, 13, C.white, 'Bold', 1, { width: 170 });
  mkText(row, `${t.theme} · ${t.num}`, 58, 39, 10, C.muted, 'Regular');
  mkText(row, t.gain, 282, 16, 13, C.primary, 'Bold');
  mkText(row, 'THIS MONTH', 272, 34, 8, C.muted, 'Regular', 1, { letterSpacing: 0.5 });
});

buildBottomNav(home, 'HOME');

// ═══════════════════════════════════════════════════════════════════════════════
// 02 · SCAN SCREEN
// ═══════════════════════════════════════════════════════════════════════════════
const scan = mkFrame(figma.currentPage, 430, 0, 390, 844, C.bg, '02 · Scan');

const scanHdr = mkFrame(scan, 0, 0, 390, 60, C.bg, 'Header', 0.72);
mkRect(scanHdr, 20, 16, 28, 28, C.primary, 6);
mkRect(scanHdr, 26, 10, 16, 8, C.primary, 3);
mkText(scanHdr, 'BrickVal', 56, 19, 16, C.primary, 'Black');
mkText(scanHdr, 'PREVIEW', 338, 23, 9, C.muted, 'Bold', 1, { letterSpacing: 1.2 });

mkText(scan, 'Scan a Set', 24, 82, 28, C.white, 'Black');
mkText(scan, 'Take a photo of the box or enter the set number.', 24, 120, 13, C.muted, 'Regular', 1, { width: 342, lineHeight: 20 });

// Mode toggle
const tog = mkFrame(scan, 24, 156, 342, 48, C.surfHigh, 'Mode Toggle');
tog.cornerRadius = 24;
const pill = mkRect(tog, 4, 4, 163, 40, C.primary, 20);
mkText(tog, 'Set', 77, 15, 13, C.onPrimary, 'Bold');
mkText(tog, 'Minifigure', 222, 15, 13, C.gray, 'Bold');

// Upload card
const upCard = mkFrame(scan, 24, 220, 342, 256, C.surfHigh, 'Upload Card');
upCard.cornerRadius = 20;
const dashedArea = mkRect(upCard, 16, 16, 310, 176, null, 12);
dashedArea.strokes = [{ type: 'SOLID', color: C.gray, opacity: 0.6 }];
dashedArea.strokeWeight = 1.5;
dashedArea.dashPattern = [8, 6];
mkRect(upCard, 151, 56, 40, 32, C.primary, 8, 0.2);
mkEllipse(upCard, 159, 62, 24, 24, C.primary, 0.35);
mkText(upCard, 'Tap to take photo', 108, 108, 13, C.muted, 'Bold');
mkText(upCard, 'or drag & drop an image', 98, 128, 11, C.muted, 'Regular');
// Camera button
const camBtn = mkFrame(upCard, 97, 168, 148, 44, null, 'CameraBtn');
camBtn.cornerRadius = 22;
camBtn.fills = gradFill(0, 0, 1, 0, [
  { position: 0, color: C.primary },
  { position: 1, color: C.primaryCont },
]);
mkText(camBtn, 'Open Camera', 22, 13, 12, C.onPrimary, 'Bold');

// Divider + manual entry
mkRect(scan, 24, 492, 148, 1, C.gray, 0, 0.4);
mkText(scan, 'or enter manually', 136, 481, 11, C.muted, 'Medium');
mkRect(scan, 220, 492, 148, 1, C.gray, 0, 0.4);

const inputBg = mkRect(scan, 24, 512, 342, 52, C.surfHigh, 12);
inputBg.strokes = [{ type: 'SOLID', color: { r:0.165, g:0.165, b:0.196 } }];
inputBg.strokeWeight = 1;
mkText(scan, 'e.g. 75192', 44, 526, 14, C.muted, 'Regular');
const goBtn = mkFrame(scan, 290, 518, 64, 40, C.primary, 'SearchBtn');
goBtn.cornerRadius = 10;
mkText(goBtn, '→', 20, 10, 18, C.onPrimary, 'Bold');

buildBottomNav(scan, 'SCANNER');

// ═══════════════════════════════════════════════════════════════════════════════
// 03 · RESULT SCREEN
// ═══════════════════════════════════════════════════════════════════════════════
const res = mkFrame(figma.currentPage, 860, 0, 390, 844, C.bg, '03 · Result');

const resHdr = mkFrame(res, 0, 0, 390, 56, C.bg, 'Header', 0.72);
mkText(resHdr, '← Back', 20, 18, 14, C.primary, 'Bold');
mkText(resHdr, 'Set Result', 155, 18, 14, C.white, 'Bold');

mkRect(res, 0, 56, 390, 216, C.dark);
mkRect(res, 140, 96, 110, 90, C.primary, 12, 0.12);
mkText(res, '🧱', 173, 118, 48, C.white, 'Regular');

// Set info
const infoCard = mkFrame(res, 24, 258, 342, 92, C.surfHigh, 'Set Info');
infoCard.cornerRadius = 16;
mkText(infoCard, '75192', 20, 14, 11, C.muted, 'Bold', 1, { letterSpacing: 1.2 });
mkText(infoCard, 'Millennium Falcon', 20, 32, 18, C.white, 'Bold', 1, { width: 218 });
mkText(infoCard, 'Star Wars  ·  7541 pcs', 20, 58, 12, C.muted, 'Regular');
mkRect(infoCard, 252, 32, 72, 22, C.green, 11, 0.15);
mkText(infoCard, '✓ ACTIVE', 260, 38, 9, C.green, 'Bold', 1, { letterSpacing: 0.8 });

// Price reveal hero
const priceCard = mkFrame(res, 24, 364, 342, 132, C.surfLow, 'Price Reveal');
priceCard.cornerRadius = 16;
priceCard.strokes = [{ type: 'SOLID', color: C.primary, opacity: 0.18 }];
priceCard.strokeWeight = 1;
mkText(priceCard, 'NEW · MARKET VALUE', 20, 16, 9, C.muted, 'Bold', 1, { letterSpacing: 1.5 });
mkRect(priceCard, 246, 14, 78, 22, C.primary, 11, 0.12);
mkText(priceCard, '● sold data', 254, 19, 9, C.primary, 'Bold', 1, { letterSpacing: 0.3 });
mkText(priceCard, '$824.99', 20, 36, 44, C.primary, 'Black');
mkText(priceCard, '▲ +78% vs RRP', 20, 88, 12, C.green, 'Bold');
mkText(priceCard, 'RRP: ~$464.99', 238, 94, 11, C.muted, 'Medium');

// Stat cards
[
  { label: 'BRICKLINK', avg: '$824.99', min: '$710', max: '$960', sub: '42 sales · 6mo', accent: C.primary, x: 24  },
  { label: 'EBAY',      avg: '$811.50', min: '$690', max: '$940', sub: '28 listings',    accent: C.gray,    x: 202 },
].forEach(s => {
  const c = mkFrame(res, s.x, 510, 164, 120, C.surfHigh, `${s.label} Stats`);
  c.cornerRadius = 14;
  mkRect(c, 0, 0, 3, 120, s.accent);
  mkText(c, s.label, 12, 12, 8, s.accent, 'Bold', 1, { letterSpacing: 1 });
  mkText(c, s.avg, 12, 30, 22, C.white, 'Black');
  mkText(c, 'avg sold', 12, 57, 10, C.muted, 'Regular');
  mkText(c, `Min  ${s.min}`, 12, 74, 10, C.muted, 'Regular');
  mkText(c, `Max  ${s.max}`, 12, 88, 10, C.muted, 'Regular');
  mkText(c, s.sub, 12, 102, 10, C.muted, 'Regular');
});

// Used row
const usedRow = mkFrame(res, 24, 644, 342, 64, C.surfHigh, 'Used Price');
usedRow.cornerRadius = 14;
mkText(usedRow, 'USED · MARKET VALUE', 20, 12, 9, C.muted, 'Bold', 1, { letterSpacing: 1.5 });
mkText(usedRow, '$548.00', 20, 30, 22, C.white, 'Black');
mkText(usedRow, 'BrickLink avg · used condition', 148, 38, 10, C.muted, 'Regular');

buildBottomNav(res, 'SCANNER');

// ═══════════════════════════════════════════════════════════════════════════════
// 04 · BUTTON SYSTEM + DESIGN TOKENS
// ═══════════════════════════════════════════════════════════════════════════════
const sys = mkFrame(figma.currentPage, 1290, 0, 480, 844, C.bg, '04 · Button System');

mkText(sys, 'BUTTON SYSTEM', 24, 24, 10, C.primary, 'Bold', 1, { letterSpacing: 2 });
mkText(sys, 'BrickVal Design Tokens', 24, 40, 20, C.white, 'Black');

// Primary — 3 sizes
mkText(sys, 'PRIMARY', 24, 82, 9, C.muted, 'Bold', 1, { letterSpacing: 1.5 });
[
  { label: 'Small',  w: 96,  h: 36, x: 24,  fs: 12 },
  { label: 'Medium', w: 128, h: 44, x: 136, fs: 13 },
  { label: 'Large',  w: 160, h: 52, x: 282, fs: 14 },
].forEach(s => {
  const b = mkFrame(sys, s.x, 98, s.w, s.h, C.primary, `btn-primary-${s.label.toLowerCase()}`);
  b.cornerRadius = s.h / 2;
  mkText(b, s.label, Math.round(s.w/2 - s.label.length*s.fs*0.29), Math.round(s.h/2 - s.fs/2 - 1), s.fs, C.onPrimary, 'Bold');
});

// Other variants
mkText(sys, 'VARIANTS', 24, 172, 9, C.muted, 'Bold', 1, { letterSpacing: 1.5 });
[
  { label: 'Secondary',   x: 24,  fill: C.surfHigh, textColor: C.white,    stroke: true },
  { label: 'Ghost',       x: 160, fill: null,        textColor: C.white,    stroke: true },
  { label: 'Destructive', x: 272, fill: C.red,       textColor: C.white,    stroke: false },
].forEach(v => {
  const b = mkFrame(sys, v.x, 188, 120, 44, v.fill, `btn-${v.label.toLowerCase()}`);
  b.cornerRadius = 22;
  if (!v.fill) b.fills = [];
  if (v.stroke) {
    b.strokes = [{ type: 'SOLID', color: { r:0.165,g:0.165,b:0.196 } }];
    b.strokeWeight = 1;
  }
  const tx = Math.round(60 - v.label.length * 13 * 0.29);
  mkText(b, v.label, tx, 13, 13, v.textColor, 'Bold');
});

// Loading
mkText(sys, 'LOADING STATE', 24, 256, 9, C.muted, 'Bold', 1, { letterSpacing: 1.5 });
const loadB = mkFrame(sys, 24, 272, 128, 44, C.primary, 'btn-loading', 0.7);
loadB.cornerRadius = 22;
mkEllipse(loadB, 50, 10, 28, 24, C.onPrimary, 0.25);
mkText(loadB, '· · ·', 50, 13, 16, C.onPrimary, 'Bold');

// Design Tokens
mkText(sys, 'DESIGN TOKENS', 24, 340, 10, C.primary, 'Bold', 1, { letterSpacing: 2 });
[
  { name: 'Background',         hex: '#0e0e0e', fill: C.bg,          border: true  },
  { name: 'Primary',            hex: '#ffc32c', fill: C.primary,     border: false },
  { name: 'Primary Container',  hex: '#e9b011', fill: C.primaryCont, border: false },
  { name: 'On Primary',         hex: '#584000', fill: C.onPrimary,   border: false },
  { name: 'Surface Low',        hex: '#131313', fill: C.surfLow,     border: true  },
  { name: 'Surface High',       hex: '#20201f', fill: C.surfHigh,    border: false },
  { name: 'On Surface',         hex: '#ffffff', fill: C.white,       border: false },
  { name: 'On Surface Variant', hex: '#adaaaa', fill: C.muted,       border: false },
].forEach((tok, i) => {
  const col = i % 2, row = Math.floor(i / 2);
  const tx = 24 + col * 224, ty = 360 + row * 58;
  const swatch = mkRect(sys, tx, ty, 36, 36, tok.fill, 8);
  if (tok.border) {
    swatch.strokes = [{ type: 'SOLID', color: C.gray, opacity: 0.5 }];
    swatch.strokeWeight = 1;
  }
  mkText(sys, tok.name, tx + 44, ty + 4,  12, C.white, 'Bold');
  mkText(sys, tok.hex,  tx + 44, ty + 22, 10, C.muted, 'Regular', 1, { letterSpacing: 0.5 });
});

// Typography
mkText(sys, 'TYPOGRAPHY', 24, 594, 10, C.primary, 'Bold', 1, { letterSpacing: 2 });
mkText(sys, 'Headline — Inter Black / 40px',      24, 612, 20, C.white, 'Black');
mkText(sys, 'Label — Inter Bold / 16px',          24, 646, 16, C.white, 'Bold');
mkText(sys, 'Body — Inter Regular / 14px',        24, 676, 14, C.white, 'Regular');
mkText(sys, 'CAPTION — Inter Bold / 10px · +1.5 tracking', 24, 706, 10, C.muted, 'Bold', 1, { letterSpacing: 1.5 });

// ── Done ────────────────────────────────────────────────────────────────────
figma.viewport.scrollAndZoomIntoView([home, scan, res, sys]);
figma.notify('BrickVal — 4 screens generated ✓', { timeout: 4000 });
