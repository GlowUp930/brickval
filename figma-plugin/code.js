// BrickVal — Figma Design Generator
// Generates: Home · Scan · Result · Button System
// Run via: Plugins → Development → Import plugin from manifest → select manifest.json

figma.showUI(__html__, { width: 280, height: 160 });

figma.ui.onmessage = async (msg) => {
  if (msg.type !== 'generate') return;

  send('Loading fonts…');

  // ── Font preload ─────────────────────────────────────────────────────────
  const fonts = [
    ['Inter', 'Regular'], ['Inter', 'Medium'], ['Inter', 'Semi Bold'],
    ['Inter', 'Bold'], ['Inter', 'Extra Bold'], ['Inter', 'Black'],
  ];
  for (const [family, style] of fonts) {
    try { await figma.loadFontAsync({ family, style }); } catch (_) {}
  }

  // ── Design tokens ────────────────────────────────────────────────────────
  const C = {
    bg:          { r: 0.055, g: 0.055, b: 0.055, a: 1 },       // #0e0e0e
    primary:     { r: 1,     g: 0.765, b: 0.173, a: 1 },        // #ffc32c
    primaryCont: { r: 0.914, g: 0.690, b: 0.067, a: 1 },        // #e9b011
    onPrimary:   { r: 0.345, g: 0.251, b: 0,     a: 1 },        // #584000
    surfLow:     { r: 0.075, g: 0.075, b: 0.075, a: 1 },        // #131313
    surfHigh:    { r: 0.125, g: 0.125, b: 0.122, a: 1 },        // #20201f
    white:       { r: 1,     g: 1,     b: 1,     a: 1 },
    muted:       { r: 0.678, g: 0.667, b: 0.667, a: 1 },        // #adaaaa
    gray:        { r: 0.443, g: 0.443, b: 0.478, a: 1 },        // #71717a
    dark:        { r: 0.067, g: 0.067, b: 0.067, a: 1 },        // #111111
    navBg:       { r: 0.055, g: 0.055, b: 0.055, a: 0.75 },
    surfHigh2:   { r: 0.125, g: 0.125, b: 0.122, a: 0.9 },
    badgeBg:     { r: 1,     g: 0.765, b: 0.173, a: 0.1 },
    scanIconBg:  { r: 0.345, g: 0.251, b: 0,     a: 0.18 },
  };

  // ── Primitive helpers ────────────────────────────────────────────────────
  function mkFrame(parent, x, y, w, h, fill, name = '') {
    const f = figma.createFrame();
    f.x = x; f.y = y; f.resize(w, h);
    f.fills = fill ? [{ type: 'SOLID', color: fill.a !== undefined && fill.a < 1 ? { r: fill.r, g: fill.g, b: fill.b } : fill, opacity: fill.a }] : [];
    // Correct opacity handling
    if (fill && fill.a !== undefined && fill.a < 1) {
      f.fills = [{ type: 'SOLID', color: { r: fill.r, g: fill.g, b: fill.b }, opacity: fill.a }];
    } else if (fill) {
      f.fills = [{ type: 'SOLID', color: fill }];
    } else {
      f.fills = [];
    }
    if (name) f.name = name;
    f.clipsContent = true;
    parent.appendChild(f);
    return f;
  }

  function mkRect(parent, x, y, w, h, fill, radius = 0, name = '') {
    const r = figma.createRectangle();
    r.x = x; r.y = y; r.resize(w, h);
    if (fill && fill.a !== undefined && fill.a < 1) {
      r.fills = [{ type: 'SOLID', color: { r: fill.r, g: fill.g, b: fill.b }, opacity: fill.a }];
    } else if (fill) {
      r.fills = [{ type: 'SOLID', color: fill }];
    } else {
      r.fills = [];
    }
    if (radius) r.cornerRadius = radius;
    if (name) r.name = name;
    parent.appendChild(r);
    return r;
  }

  function mkEllipse(parent, x, y, w, h, fill) {
    const e = figma.createEllipse();
    e.x = x; e.y = y; e.resize(w, h);
    if (fill && fill.a !== undefined && fill.a < 1) {
      e.fills = [{ type: 'SOLID', color: { r: fill.r, g: fill.g, b: fill.b }, opacity: fill.a }];
    } else if (fill) {
      e.fills = [{ type: 'SOLID', color: fill }];
    } else {
      e.fills = [];
    }
    parent.appendChild(e);
    return e;
  }

  function mkText(parent, content, x, y, size, color, weight = 'Regular', font = 'Inter', opts = {}) {
    const t = figma.createText();
    t.fontName = { family: font, style: weight };
    t.characters = content;
    t.fontSize = size;
    if (color && color.a !== undefined && color.a < 1) {
      t.fills = [{ type: 'SOLID', color: { r: color.r, g: color.g, b: color.b }, opacity: color.a }];
    } else if (color) {
      t.fills = [{ type: 'SOLID', color }];
    }
    t.x = x; t.y = y;
    if (opts.letterSpacing) t.letterSpacing = { value: opts.letterSpacing, unit: 'PIXELS' };
    if (opts.lineHeight) t.lineHeight = { value: opts.lineHeight, unit: 'PIXELS' };
    if (opts.width) { t.textAutoResize = 'HEIGHT'; t.resize(opts.width, t.height); }
    if (opts.align) t.textAlignHorizontal = opts.align;
    parent.appendChild(t);
    return t;
  }

  function gradFill(stops) {
    return [{
      type: 'GRADIENT_LINEAR',
      gradientTransform: [[1, 0, 0], [0, 1, 0]],
      gradientStops: stops,
    }];
  }

  // ── Bottom Nav component (reused across screens) ────────────────────────
  function buildBottomNav(parent, activeTab, yPos = 764) {
    const nav = mkFrame(parent, 0, yPos, 390, 80, C.navBg, 'BottomNav');
    const tabs = [
      { label: 'HOME',       x: 6  },
      { label: 'SCANNER',    x: 104 },
      { label: 'COLLECTION', x: 202 },
      { label: 'MARKET',     x: 300 },
    ];
    tabs.forEach(tab => {
      const active = tab.label === activeTab;
      const tf = mkFrame(nav, tab.x, 8, 82, 64, null, tab.label);
      if (active) tf.fills = [{ type: 'SOLID', color: C.primary, opacity: 0.08 }];
      else tf.fills = [];
      tf.cornerRadius = 12;
      // Icon
      mkEllipse(tf, 29, 8, 24, 24, active ? C.primary : C.gray);
      // Label
      const lx = tab.label === 'COLLECTION' ? 4 : tab.label === 'SCANNER' ? 10 : 16;
      mkText(tf, tab.label, lx, 38, 8, active ? C.primary : C.gray, 'Bold', 'Inter', { letterSpacing: 0.8 });
    });
    return nav;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SCREEN 1 — HOME
  // ═══════════════════════════════════════════════════════════════════════════
  send('Building Home screen…');

  const home = mkFrame(figma.currentPage, 0, 0, 390, 844, C.bg, '01 · Home');

  // TopAppBar
  const header = mkFrame(home, 0, 0, 390, 64, C.navBg, 'TopAppBar');
  mkEllipse(header, 20, 12, 40, 40, { r: 0.102, g: 0.102, b: 0.102, a: 1 });
  mkText(header, 'BrickVal', 143, 19, 22, C.primary, 'Black');
  mkEllipse(header, 351, 21, 18, 18, C.primary); // bell placeholder

  // Hero — label
  mkText(home, 'YOUR COLLECTION VALUE', 24, 84, 10, C.muted, 'Bold', 'Inter', { letterSpacing: 1.6 });

  // Hero — big value
  mkText(home, '$12,450.00', 24, 100, 40, C.white, 'Black');

  // Trending badge
  const badge = mkRect(home, 210, 108, 78, 26, C.badgeBg, 13);
  mkText(home, '▲ +2.4%', 220, 113, 11, C.primary, 'Bold');

  // Sparkline card
  const spark = mkFrame(home, 24, 150, 342, 110, C.surfLow, 'Sparkline');
  spark.cornerRadius = 12;
  // Gradient area
  const areaRect = mkRect(spark, 0, 0, 342, 110, null, 0, 'Area');
  areaRect.fills = [{
    type: 'GRADIENT_LINEAR',
    gradientTransform: [[0, 1, 0], [-1, 0, 1]],
    gradientStops: [
      { position: 0, color: { r: 1, g: 0.765, b: 0.173 }, boundVariables: {} },
      { position: 1, color: { r: 1, g: 0.765, b: 0.173 }, boundVariables: {} },
    ],
  }];
  areaRect.fillStyleId = '';
  areaRect.fills = [{
    type: 'GRADIENT_LINEAR',
    gradientTransform: [[0, 1, 0], [-1, 0, 1]],
    gradientStops: [
      { position: 0, color: { r: 1, g: 0.765, b: 0.173 } },
      { position: 1, color: { r: 1, g: 0.765, b: 0.173 } },
    ],
  }];
  // Simpler approach: draw the sparkline as a series of thin colored bars
  const dataY = [70, 65, 78, 68, 55, 72, 45, 60, 50, 42, 52, 20]; // y from bottom
  const step = 342 / (dataY.length - 1);
  for (let i = 0; i < dataY.length - 1; i++) {
    const x1 = i * step;
    const y1 = 105 - dataY[i];
    const x2 = (i + 1) * step;
    const y2 = 105 - dataY[i + 1];
    const len = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
    const angle = Math.atan2(y2 - y1, x2 - x1);
    const seg = mkRect(spark, x1, Math.min(y1, y2), Math.ceil(len), 3, C.primary, 2);
    seg.rotation = angle * 180 / Math.PI;
  }
  mkEllipse(spark, 335, 105 - dataY[11] - 5, 10, 10, C.primary); // end dot
  const halo = mkEllipse(spark, 331, 105 - dataY[11] - 9, 18, 18, { r: 1, g: 0.765, b: 0.173, a: 0.25 });

  // Scan CTA
  const scanBtn = mkFrame(home, 24, 276, 342, 104, null, 'Scan CTA');
  scanBtn.cornerRadius = 12;
  scanBtn.fills = [{
    type: 'GRADIENT_LINEAR',
    gradientTransform: [[1, 0, 0], [0, 1, 0]],
    gradientStops: [
      { position: 0, color: C.primary },
      { position: 1, color: C.primaryCont },
    ],
  }];
  mkText(scanBtn, 'Scan LEGO', 28, 24, 22, C.onPrimary, 'Bold');
  mkText(scanBtn, 'Identify sets instantly via camera', 28, 52, 12, { r: 0.345, g: 0.251, b: 0, a: 0.75 }, 'Medium');
  // Icon area
  const iconBox = mkRect(scanBtn, 270, 24, 50, 56, C.scanIconBg, 10);
  // Scan brackets
  const bLines = [
    [278,32,10,2],[278,32,2,10],[308,32,2,10],[308,32,10,2],   // top corners (approx)
    [278,68,10,2],[278,60,2,10],[308,60,2,10],[308,68,10,2],   // bottom corners
  ];
  bLines.forEach(([bx,by,bw,bh]) => mkRect(scanBtn, bx, by, bw, bh, C.onPrimary, 1));

  // Recent Scans
  mkText(home, 'Recent Scans', 24, 400, 20, C.white, 'Bold');
  mkText(home, 'View All', 320, 404, 10, C.primary, 'Bold', 'Inter', { letterSpacing: 1 });

  const scans = [
    { num: '75192', name: 'UCS Millennium Falcon', price: '$849.99', gain: '+12%' },
    { num: '42056', name: 'Porsche 911 GT3 RS',    price: '$612.40', gain: '+4.2%' },
  ];
  scans.forEach((s, i) => {
    const card = mkFrame(home, 24 + i * 180, 428, 168, 184, C.surfHigh, `Card · ${s.num}`);
    card.cornerRadius = 12;
    mkRect(card, 0, 0, 168, 110, C.dark, 0, 'image-placeholder');
    // Set number badge
    mkRect(card, 108, 8, 52, 20, { r: 0, g: 0, b: 0, a: 0.6 }, 4);
    mkText(card, s.num, 112, 11, 9, C.white, 'Bold', 'Inter', { letterSpacing: 0.5 });
    // LEGO brick placeholder
    mkRect(card, 60, 36, 48, 40, { r: 1, g: 0.765, b: 0.173, a: 0.15 }, 6);
    mkText(card, '⬛', 72, 40, 22, C.primary, 'Regular');
    mkText(card, s.name, 12, 118, 12, C.white, 'Bold', 'Inter', { width: 144 });
    mkText(card, s.price, 12, 140, 11, C.muted, 'Medium');
    mkText(card, s.gain, 82, 140, 11, C.primary, 'Bold');
  });

  // Market Trends
  mkText(home, 'Market Trends', 24, 628, 20, C.white, 'Bold');

  const trends = [
    { num: '21044', name: 'Paris Skyline',        theme: 'Architecture', badge: 'RETIRING SOON', gain: '+$42.00' },
    { num: '21309', name: 'NASA Apollo Saturn V',  theme: 'Ideas',        badge: 'BULLISH',       gain: '+$28.15' },
  ];
  trends.forEach((t, i) => {
    const row = mkFrame(home, 24, 656 + i * 66, 342, 58, C.surfLow, `Trend · ${t.num}`);
    row.cornerRadius = 10;
    mkRect(row, 0, 0, 3, 58, C.primary, 0, 'accent-border');
    mkRect(row, 8, 8, 42, 42, C.dark, 8, 'thumb');
    mkRect(row, 14, 14, 30, 30, { r: 1, g: 0.765, b: 0.173, a: 0.15 }, 4);
    mkText(row, t.badge, 58, 8, 8, C.primary, 'Bold', 'Inter', { letterSpacing: 0.8 });
    mkText(row, t.name, 58, 21, 13, C.white, 'Bold', 'Inter', { width: 170 });
    mkText(row, `${t.theme} · ${t.num}`, 58, 38, 10, C.muted, 'Regular');
    mkText(row, t.gain, 282, 16, 13, C.primary, 'Bold');
    mkText(row, 'THIS MONTH', 274, 33, 8, C.muted, 'Regular', 'Inter', { letterSpacing: 0.5 });
  });

  buildBottomNav(home, 'HOME');

  // ═══════════════════════════════════════════════════════════════════════════
  // SCREEN 2 — SCAN
  // ═══════════════════════════════════════════════════════════════════════════
  send('Building Scan screen…');

  const scan = mkFrame(figma.currentPage, 430, 0, 390, 844, C.bg, '02 · Scan');

  // Header
  const scanHeader = mkFrame(scan, 0, 0, 390, 60, C.navBg, 'Header');
  // Logo mark
  mkRect(scanHeader, 20, 16, 28, 28, C.primary, 6, 'logo-brick');
  mkRect(scanHeader, 26, 10, 16, 8, C.primary, 3, 'logo-stud');
  mkText(scanHeader, 'BrickVal', 56, 19, 16, C.primary, 'Black');
  mkText(scanHeader, 'PREVIEW', 340, 22, 9, C.muted, 'Bold', 'Inter', { letterSpacing: 1.2 });

  // Title
  mkText(scan, 'Scan a Set', 24, 84, 28, C.white, 'Black');
  mkText(scan, 'Take a photo of the box or enter the set number.', 24, 120, 13, C.muted, 'Regular', 'Inter', { width: 342, lineHeight: 20 });

  // Mode toggle pill
  const toggle = mkFrame(scan, 24, 156, 342, 48, C.surfHigh, 'Mode Toggle');
  toggle.cornerRadius = 24;
  // Active pill (Set)
  const activePill = mkRect(toggle, 4, 4, 163, 40, C.primary, 20, 'active-Set');
  mkText(toggle, 'Set', 74, 15, 13, C.onPrimary, 'Bold');
  mkText(toggle, 'Minifigure', 224, 15, 13, C.gray, 'Bold');

  // Upload card
  const uploadCard = mkFrame(scan, 24, 220, 342, 260, C.surfHigh, 'Upload Card');
  uploadCard.cornerRadius = 20;
  // Dashed border effect (rect with no fill)
  const dashedBorder = mkRect(uploadCard, 16, 16, 310, 180, null, 12, 'dashed-area');
  dashedBorder.strokes = [{ type: 'SOLID', color: { r: 0.443, g: 0.443, b: 0.478 } }];
  dashedBorder.strokeWeight = 1.5;
  dashedBorder.dashPattern = [8, 6];
  // Camera icon placeholder
  mkRect(uploadCard, 155, 60, 32, 26, { r: 1, g: 0.765, b: 0.173, a: 0.2 }, 8);
  mkEllipse(uploadCard, 163, 66, 16, 16, { r: 1, g: 0.765, b: 0.173, a: 0.4 });
  mkText(uploadCard, 'Tap to take photo', 111, 110, 13, C.muted, 'Bold', 'Inter', { align: 'CENTER' });
  mkText(uploadCard, 'or drag & drop an image', 100, 130, 11, C.muted, 'Regular', 'Inter', { align: 'CENTER' });

  // Camera button
  const camBtn = mkFrame(uploadCard, 97, 172, 148, 44, null, 'CameraBtn');
  camBtn.cornerRadius = 22;
  camBtn.fills = [{
    type: 'GRADIENT_LINEAR',
    gradientTransform: [[1, 0, 0], [0, 1, 0]],
    gradientStops: [{ position: 0, color: C.primary }, { position: 1, color: C.primaryCont }],
  }];
  mkText(camBtn, '📷  Open Camera', 20, 13, 12, C.onPrimary, 'Bold');

  // Divider
  mkRect(scan, 24, 494, 150, 1, C.gray, 0, 'divider-l');
  mkText(scan, 'or enter manually', 136, 482, 11, C.muted, 'Medium');
  mkRect(scan, 218, 494, 150, 1, C.gray, 0, 'divider-r');

  // Manual entry
  const inputBg = mkRect(scan, 24, 514, 342, 52, C.surfHigh, 12, 'manual-input');
  inputBg.strokes = [{ type: 'SOLID', color: { r: 0.165, g: 0.165, b: 0.196 } }];
  inputBg.strokeWeight = 1;
  mkText(scan, 'e.g. 75192', 44, 527, 14, C.muted, 'Regular');

  // Search button
  const searchBtn = mkFrame(scan, 290, 520, 64, 40, null, 'SearchBtn');
  searchBtn.cornerRadius = 10;
  searchBtn.fills = [{ type: 'SOLID', color: C.primary }];
  mkText(searchBtn, '→', 24, 10, 18, C.onPrimary, 'Bold');

  buildBottomNav(scan, 'SCANNER');

  // ═══════════════════════════════════════════════════════════════════════════
  // SCREEN 3 — RESULT / PRICE REVEAL
  // ═══════════════════════════════════════════════════════════════════════════
  send('Building Result screen…');

  const result = mkFrame(figma.currentPage, 860, 0, 390, 844, C.bg, '03 · Result');

  // Header
  const resHeader = mkFrame(result, 0, 0, 390, 56, C.navBg, 'Header');
  mkText(resHeader, '← Back', 20, 18, 14, C.primary, 'Bold');
  mkText(resHeader, 'Set Result', 155, 18, 14, C.white, 'Bold');

  // Set image placeholder
  const setImgBg = mkRect(result, 0, 56, 390, 220, C.dark, 0, 'set-image-bg');
  mkRect(result, 140, 96, 110, 90, { r: 1, g: 0.765, b: 0.173, a: 0.12 }, 12);
  mkText(result, '🧱', 173, 118, 48, C.primary, 'Regular');

  // Set info card
  const infoCard = mkFrame(result, 24, 260, 342, 90, C.surfHigh, 'Set Info');
  infoCard.cornerRadius = 16;
  mkText(infoCard, '75192', 20, 14, 11, C.muted, 'Bold', 'Inter', { letterSpacing: 1.2 });
  mkText(infoCard, 'Millennium Falcon', 20, 32, 18, C.white, 'Bold', 'Inter', { width: 220 });
  mkText(infoCard, 'Star Wars · 7541 pcs', 20, 58, 12, C.muted, 'Regular');
  // Retirement badge
  const retBadge = mkRect(infoCard, 252, 32, 70, 22, { r: 0.239, g: 0.749, b: 0.357, a: 0.15 }, 11);
  mkText(infoCard, '✓ ACTIVE', 258, 38, 9, { r: 0.239, g: 0.749, b: 0.357, a: 1 }, 'Bold', 'Inter', { letterSpacing: 0.8 });

  // Price reveal card (hero)
  const priceCard = mkFrame(result, 24, 366, 342, 130, C.surfLow, 'Price Reveal');
  priceCard.cornerRadius = 16;
  priceCard.strokes = [{ type: 'SOLID', color: { r: 1, g: 0.765, b: 0.173 }, opacity: 0.15 }];
  priceCard.strokeWeight = 1;
  mkText(priceCard, 'NEW · MARKET VALUE', 20, 16, 9, C.muted, 'Bold', 'Inter', { letterSpacing: 1.5 });
  mkText(priceCard, '$824.99', 20, 36, 44, C.primary, 'Black');
  mkText(priceCard, '▲ +78% vs RRP', 20, 86, 12, { r: 0.239, g: 0.749, b: 0.357, a: 1 }, 'Bold');
  mkText(priceCard, 'RRP: ~$464.99', 240, 92, 11, C.muted, 'Medium');
  // Data source badge
  const srcBadge = mkRect(priceCard, 248, 16, 74, 20, C.badgeBg, 10);
  mkText(priceCard, '⬤ sold data', 256, 20, 9, C.primary, 'Bold', 'Inter', { letterSpacing: 0.3 });

  // BrickLink stats
  const blCard = mkFrame(result, 24, 510, 164, 120, C.surfHigh, 'BrickLink Stats');
  blCard.cornerRadius = 14;
  mkRect(blCard, 0, 0, 3, 120, C.primary, 0);
  mkText(blCard, 'BRICKLINK', 12, 12, 8, C.primary, 'Bold', 'Inter', { letterSpacing: 1 });
  mkText(blCard, '$824.99', 12, 30, 22, C.white, 'Black');
  mkText(blCard, 'avg sold', 12, 56, 10, C.muted, 'Regular');
  mkText(blCard, 'Min  $710', 12, 72, 10, C.muted, 'Regular');
  mkText(blCard, 'Max  $960', 12, 86, 10, C.muted, 'Regular');
  mkText(blCard, '42 sales · 6mo', 12, 100, 10, C.muted, 'Regular');

  // eBay stats
  const ebayCard = mkFrame(result, 202, 510, 164, 120, C.surfHigh, 'eBay Stats');
  ebayCard.cornerRadius = 14;
  mkRect(ebayCard, 0, 0, 3, 120, C.gray, 0);
  mkText(ebayCard, 'EBAY', 12, 12, 8, C.muted, 'Bold', 'Inter', { letterSpacing: 1 });
  mkText(ebayCard, '$811.50', 12, 30, 22, C.white, 'Black');
  mkText(ebayCard, 'avg sold', 12, 56, 10, C.muted, 'Regular');
  mkText(ebayCard, 'Min  $690', 12, 72, 10, C.muted, 'Regular');
  mkText(ebayCard, 'Max  $940', 12, 86, 10, C.muted, 'Regular');
  mkText(ebayCard, '28 listings', 12, 100, 10, C.muted, 'Regular');

  // Used card
  const usedCard = mkFrame(result, 24, 644, 342, 64, C.surfHigh, 'Used Price');
  usedCard.cornerRadius = 14;
  mkText(usedCard, 'USED · MARKET VALUE', 20, 12, 9, C.muted, 'Bold', 'Inter', { letterSpacing: 1.5 });
  mkText(usedCard, '$548.00', 20, 30, 22, C.white, 'Black');
  mkText(usedCard, 'BrickLink avg sold · used condition', 140, 38, 10, C.muted, 'Regular');

  buildBottomNav(result, 'SCANNER');

  // ═══════════════════════════════════════════════════════════════════════════
  // SCREEN 4 — BUTTON SYSTEM + DESIGN TOKENS
  // ═══════════════════════════════════════════════════════════════════════════
  send('Building Button System…');

  const btnPage = mkFrame(figma.currentPage, 1290, 0, 480, 844, C.bg, '04 · Button System');

  mkText(btnPage, 'BUTTON SYSTEM', 24, 24, 10, C.primary, 'Bold', 'Inter', { letterSpacing: 2 });
  mkText(btnPage, 'BrickVal — Design Tokens', 24, 40, 18, C.white, 'Black');

  // Primary buttons (3 sizes)
  mkText(btnPage, 'Primary', 24, 80, 11, C.muted, 'Bold', 'Inter', { letterSpacing: 1 });
  const btnSizes = [
    { label: 'Small',  w: 100, h: 36, x: 24,  fontSize: 12 },
    { label: 'Medium', w: 130, h: 44, x: 140, fontSize: 13 },
    { label: 'Large',  w: 160, h: 52, x: 288, fontSize: 14 },
  ];
  btnSizes.forEach(s => {
    const b = mkFrame(btnPage, s.x, 98, s.w, s.h, null, `btn-primary-${s.label.toLowerCase()}`);
    b.cornerRadius = s.h / 2;
    b.fills = [{ type: 'SOLID', color: C.primary }];
    mkText(b, s.label, s.w/2 - (s.label.length * s.fontSize * 0.29), s.h/2 - s.fontSize/2, s.fontSize, C.onPrimary, 'Bold');
  });

  // Secondary
  mkText(btnPage, 'Secondary', 24, 170, 11, C.muted, 'Bold', 'Inter', { letterSpacing: 1 });
  const secBtn = mkFrame(btnPage, 24, 188, 130, 44, null, 'btn-secondary');
  secBtn.cornerRadius = 22;
  secBtn.fills = [{ type: 'SOLID', color: C.surfHigh }];
  secBtn.strokes = [{ type: 'SOLID', color: { r: 0.165, g: 0.165, b: 0.196 } }];
  secBtn.strokeWeight = 1;
  mkText(secBtn, 'Secondary', 18, 13, 13, C.white, 'Bold');

  // Ghost
  const ghostBtn = mkFrame(btnPage, 172, 188, 100, 44, null, 'btn-ghost');
  ghostBtn.cornerRadius = 22;
  ghostBtn.fills = [];
  ghostBtn.strokes = [{ type: 'SOLID', color: { r: 0.165, g: 0.165, b: 0.196 } }];
  ghostBtn.strokeWeight = 1;
  mkText(ghostBtn, 'Ghost', 24, 13, 13, C.white, 'Bold');

  // Destructive
  const destBtn = mkFrame(btnPage, 290, 188, 130, 44, null, 'btn-destructive');
  destBtn.cornerRadius = 22;
  destBtn.fills = [{ type: 'SOLID', color: { r: 0.937, g: 0.267, b: 0.267, a: 1 } }];
  mkText(destBtn, 'Destructive', 16, 13, 13, C.white, 'Bold');

  // Loading state
  mkText(btnPage, 'Loading State', 24, 256, 11, C.muted, 'Bold', 'Inter', { letterSpacing: 1 });
  const loadBtn = mkFrame(btnPage, 24, 274, 130, 44, null, 'btn-loading');
  loadBtn.cornerRadius = 22;
  loadBtn.fills = [{ type: 'SOLID', color: C.primary, opacity: 0.7 }];
  mkEllipse(loadBtn, 53, 12, 20, 20, { r: 0.345, g: 0.251, b: 0, a: 0.3 });
  mkText(loadBtn, '···', 56, 13, 18, C.onPrimary, 'Bold');

  // Design Tokens section
  mkText(btnPage, 'DESIGN TOKENS', 24, 340, 10, C.primary, 'Bold', 'Inter', { letterSpacing: 2 });

  const tokens = [
    { name: 'Background',          hex: '#0e0e0e', fill: C.bg },
    { name: 'Primary',             hex: '#ffc32c', fill: C.primary },
    { name: 'Primary Container',   hex: '#e9b011', fill: C.primaryCont },
    { name: 'On Primary',          hex: '#584000', fill: C.onPrimary },
    { name: 'Surface Low',         hex: '#131313', fill: C.surfLow },
    { name: 'Surface High',        hex: '#20201f', fill: C.surfHigh },
    { name: 'On Surface',          hex: '#ffffff', fill: C.white },
    { name: 'On Surface Variant',  hex: '#adaaaa', fill: C.muted },
  ];

  tokens.forEach((tok, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const tx = 24 + col * 220;
    const ty = 360 + row * 56;
    mkRect(btnPage, tx, ty, 36, 36, tok.fill, 8, `token-${tok.name}`);
    if (tok.fill === C.bg) {
      mkRect(btnPage, tx, ty, 36, 36, null, 8);
      const outline = mkRect(btnPage, tx, ty, 36, 36, tok.fill, 8);
      outline.strokes = [{ type: 'SOLID', color: C.gray }];
      outline.strokeWeight = 1;
    }
    mkText(btnPage, tok.name, tx + 44, ty + 4, 12, C.white, 'Bold', 'Inter', { width: 160 });
    mkText(btnPage, tok.hex, tx + 44, ty + 22, 10, C.muted, 'Regular', 'Inter', { letterSpacing: 0.5 });
  });

  // Typography section
  mkText(btnPage, 'TYPOGRAPHY', 24, 590, 10, C.primary, 'Bold', 'Inter', { letterSpacing: 2 });
  mkText(btnPage, 'Headline — Inter Black', 24, 610, 20, C.white, 'Black');
  mkText(btnPage, 'Label — Inter Bold', 24, 642, 16, C.white, 'Bold');
  mkText(btnPage, 'Body — Inter Regular', 24, 672, 14, C.white, 'Regular');
  mkText(btnPage, 'Caption — Inter Medium · tracking +1.5', 24, 700, 10, C.muted, 'Medium', 'Inter', { letterSpacing: 1.5 });

  // ── Scroll into view ──────────────────────────────────────────────────────
  figma.viewport.scrollAndZoomIntoView([home, scan, result, btnPage]);

  send('Done! ✓ 4 screens created.', true);
  figma.notify('BrickVal screens generated ✓', { timeout: 3000 });
};

function send(text, done = false) {
  figma.ui.postMessage({ text, done });
}
