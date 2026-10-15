'use strict';
// ───────────────────────── la ville la nuit + le héros qui se balance ─────────────────────────
const LIGHT = [0.55, -0.83];                           // vers la lune (en haut à droite)
const lightLocal = rot => { const c = Math.cos(-rot), s = Math.sin(-rot); return [LIGHT[0] * c - LIGHT[1] * s, LIGHT[0] * s + LIGHT[1] * c]; };
const rimCv = mkCanvas(), RIMC = rimCv.getContext('2d');
function rim(c, path, ll, w, color, alpha = 1) {       // liseré clair du côté de la lumière
  RIMC.setTransform(1, 0, 0, 1, 0, 0); RIMC.globalCompositeOperation = 'source-over'; RIMC.clearRect(0, 0, LW, LH);
  RIMC.setTransform(c.getTransform()); RIMC.fillStyle = color; RIMC.fill(path);
  RIMC.globalCompositeOperation = 'destination-out'; RIMC.translate(-ll[0] * w, -ll[1] * w); RIMC.fill(path);
  c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = alpha; c.drawImage(rimCv, 0, 0); c.restore();
}

let CITY = null;
function winGrid(c, x, y, w, h, o) {
  const r = o.r, wx = o.wx || 3, wy = o.wy || 4, gx = o.gx || 2, gy = o.gy || 3;
  for (let j = y + 3; j + wy <= y + h - 2; j += wy + gy) for (let i = x + 2; i + wx <= x + w - 2; i += wx + gx) {
    const k = r();
    if (k < o.lit) { c.fillStyle = r() < 0.18 ? o.alt : o.on; c.fillRect(i, j, wx, wy); if (o.glow && r() < 0.3) { c.fillStyle = o.glow; c.fillRect(i - 1, j, 1, wy); } }
    else if (o.off) { c.fillStyle = o.off; c.fillRect(i, j, wx, wy); }
  }
}
function makeCityLayer(seed, width, base, hmin, hmax, wmin, wmax, o) {
  const cvs = mkCanvas(width, LH), c = cvs.getContext('2d'), r = rng(seed);
  let x = -4;
  while (x < width) {
    const w = Math.round(wmin + r() * (wmax - wmin)), h = Math.round(hmin + Math.pow(r(), o.pow || 1.4) * (hmax - hmin)), y = base - h;
    const body = o.body[Math.floor(r() * o.body.length)];
    c.fillStyle = body; c.fillRect(x, y, w, h + 90);
    // liseré de lune sur le bord droit et sur le toit
    c.fillStyle = o.rim; c.fillRect(x + w - 1, y, 1, h + 90); c.fillRect(x, y, w, 1);
    c.fillStyle = o.shadow; c.fillRect(x, y + 1, 2, h + 90);
    // toit : antenne, citerne ou gradins
    const k = r();
    if (k < 0.22) { c.fillStyle = body; c.fillRect(x + (w >> 1), y - 14 - Math.floor(r() * 10), 1, 24); if (o.beacon && r() < 0.6) { c.fillStyle = '#d73442'; c.fillRect(x + (w >> 1), y - 15, 1, 1); } }
    else if (k < 0.4) { c.fillStyle = o.shadow; c.fillRect(x + 3, y - 7, 8, 7); c.fillRect(x + 4, y - 9, 6, 2); c.fillStyle = o.rim; c.fillRect(x + 10, y - 7, 1, 7); }
    else if (k < 0.55) { c.fillStyle = body; c.fillRect(x + 2, y - 5, w - 4, 5); c.fillStyle = o.rim; c.fillRect(x + 2, y - 5, w - 4, 1); }
    if (o.lit > 0) winGrid(c, x, y, w, h + 90, { ...o, r });
    x += w + (o.gap ?? 0);
  }
  return cvs;
}
function makeCity() {
  // ciel : dégradé violet → rose → orange à l'horizon, étoiles, lune
  const sky = mkCanvas(), c = sky.getContext('2d'), r = rng(5);
  const g = c.createLinearGradient(0, 0, 0, 340);
  [[0, NI[0]], [0.3, NI[2]], [0.55, DU[1]], [0.72, DU[3]], [0.86, DU[5]], [0.95, DU[7]], [1, AM[6]]].forEach(([o, col]) => g.addColorStop(o, col));
  c.fillStyle = g; c.fillRect(0, 0, LW, LH);
  c.fillStyle = AM[1]; c.fillRect(0, 340, LW, LH);
  CITY = { sky, stars: [] };
  for (let i = 0; i < 90; i++) CITY.stars.push({ x: Math.floor(r() * LW), y: Math.floor(Math.pow(r(), 1.6) * 230), c: r() < 0.15 ? '#ff9ec8' : r() < 0.3 ? '#9fe0ff' : '#cfd8ff', ph: r() * TAU, sp: 1 + r() * 3 });
  CITY.far = makeCityLayer(11, 700, 380, 100, 200, 14, 30, { body: [DU[1], DU[2], DU[2]], rim: DU[5], shadow: DU[0], lit: 0.07, on: DU[7], alt: AM[8], off: null, wx: 2, wy: 3, gx: 2, gy: 3, beacon: true });
  CITY.mid = makeCityLayer(23, 760, 420, 90, 230, 18, 36, { body: [NI[2], NI[3], NI[2]], rim: NI[6], shadow: NI[1], lit: 0.16, on: AM[8], alt: CY[3], off: NI[1], wx: 3, wy: 3, gx: 3, gy: 4, beacon: true, glow: AM[5] });
  CITY.near = makeCityLayer(37, 900, 520, 150, 330, 24, 48, { body: [NI[0], NI[1], NI[0]], rim: NI[5], shadow: '#05040f', lit: 0.22, on: AM[9], alt: CY[3], off: NI[2], wx: 3, wy: 4, gx: 3, gy: 4, pow: 1.1, glow: AM[6] });
}
// ciel + villes en parallaxe. cam : décalage horizontal ; o.dark : assombrit ; o.zoom : pas utilisé
function drawCityBG(cam, t, o = {}) {
  L.setTransform(1, 0, 0, 1, 0, 0);
  L.drawImage(CITY.sky, 0, 0);
  for (const s of CITY.stars) { if (s.y > 230) continue; const tw = 0.5 + 0.5 * Math.sin(t * s.sp + s.ph); L.globalAlpha = (o.starA ?? 1) * (0.35 + 0.65 * tw); L.fillStyle = s.c; L.fillRect(s.x, s.y, 1, 1); }
  L.globalAlpha = 1;
  // lune
  const mx = 205, my = 66 + (o.moonDy || 0);
  if (!o.noMoon) {
    rgrad(mx, my, 6, 56, [[0, 'rgba(207,216,255,0.42)'], [1, 'rgba(207,216,255,0)']]);
    disc(mx, my, 12, '#e8ecff'); disc(mx + 3, my + 2, 12, '#cfd8ff');
    L.save(); L.beginPath(); L.arc(mx, my, 12, 0, TAU); L.clip(); L.fillStyle = '#e8ecff'; L.fillRect(mx - 12, my - 12, 24, 24); L.restore();
    for (const [a, b, cc] of [[-4, -3, 2], [3, 3, 1.6], [-1, 5, 1.2], [5, -4, 1], [-6, 3, 1.1]]) disc(mx + a, my + b, Math.max(1, Math.round(cc)), '#b8c0dc');
  }
  const dx = (k, w) => Math.round(-cam * k) % w;
  const blit = (img, k, y = 0) => { const w = img.width, x = Math.round(-cam * k); const xm = ((x % w) + w) % w; L.drawImage(img, xm - w, y); L.drawImage(img, xm, y); };
  if (o.skyOnly) return;
  blit(CITY.far, 0.12, o.farDy || 0);
  blit(CITY.mid, 0.3, o.midDy || 0);
  blit(CITY.near, 0.7, o.nearDy || 0);
}

// ───────────────────────── le héros (silhouette de super-héros rouge et bleu, tout en code) ─────────────────────────
// Repère local : la main qui tient le fil est l'origine, +y vers le bas, taille ≈ 58 px à l'échelle 1.
// ang : rotation (rad), s : échelle, o : { legs, armL, head, lean, wet }
function heroPose(o = {}) {
  const kk = o.legs ?? 0, ka = o.armL ?? 0, ln = o.lean ?? 0;
  const P0 = { hand: [0, 0], elbow: [1.2 + ln * 0.5, 8.6], sh: [0, 16.8] };
  const hips = [-3.5 + ln, 37.5];
  const legR = [[-2 + ln, 37], [0.4 + 4 * kk + ln, 47.5], [-2.8 + 7 * kk + ln, 56.5]];
  const legL = [[-5.6 + ln, 37], [-8.8 - 3 * kk + ln, 46.5], [-13 - 6 * kk + ln, 54.5 - 2 * kk]];
  const armL = [[-8.6, 18.6], [-13.8 - 3 * ka, 25.5 - 3 * ka], [-12.5 - 7 * ka, 33 - 8 * ka]];
  return { ...P0, hips, legR, legL, armL, head: [-4.4 + ln * 0.3, 11.6] };
}
function heroDraw(ox, oy, ang, s, o = {}) {
  const pz = heroPose(o), ll = lightLocal(ang);
  const c = Y; layerBegin();
  c.setTransform(s * Math.cos(ang), s * Math.sin(ang), -s * Math.sin(ang), s * Math.cos(ang), ox, oy);
  const red = o.wet ? RD[2] : RD[3], redS = RD[1], redH = RD[5], blue = o.wet ? BL[1] : BL[2], blueS = BL[0], blueH = BL[4];
  const part = (pts, lit, dark, off, bl, hi) => { const p = polyPath(pts); shade(c, p, lit, dark, ll, off, bl); if (hi) rim(c, p, ll, 0.9, hi, 0.9); return p; };
  // bras gauche (arrière), jambes
  part(limb(pz.armL, [3.6, 3.4, 3.0]), red, redS, 2, 1.2, redH);
  part(limb(pz.legL, [5.2, 4.6, 4.2]), blue, blueS, 2, 1.2, blueH);
  // botte rouge
  { const a = pz.legL[2], b = pz.legL[1]; const dx = a[0] - b[0], dy = a[1] - b[1], l = Math.hypot(dx, dy); const bx = b[0] + dx * 0.55, by = b[1] + dy * 0.55; part(limb([[bx, by], a, [a[0] - 2.6, a[1] + 1.4]], [4.6, 4.4, 3.6]), red, redS, 2, 1, redH); }
  part(limb(pz.legR, [5.8, 5.0, 4.4]), blue, blueS, 2, 1.2, blueH);
  { const a = pz.legR[2], b = pz.legR[1]; const dx = a[0] - b[0], dy = a[1] - b[1]; const bx = b[0] + dx * 0.55, by = b[1] + dy * 0.55; part(limb([[bx, by], a, [a[0] + 2.8, a[1] + 1.2]], [5, 4.8, 3.8]), red, redS, 2, 1, redH); }
  // torse : rouge en haut, bleu à la taille
  const hp = pz.hips;
  part([[-9.8, 17.6], [-4, 15.6], [1.8, 17.2], [0.8, 28], [hp[0] + 2.2, 38.4], [hp[0] - 4.2, 38.4], [-9.2, 28]], red, redS, 3, 1.6, redH);
  part([[-8.8, 29], [0.4, 29], [hp[0] + 2.2, 38.6], [hp[0] - 4.2, 38.6]], blue, blueS, 2, 1.2, blueH);
  // toile sur le torse et emblème
  c.strokeStyle = RD[0]; c.lineWidth = 0.55; c.lineCap = 'round';
  c.beginPath(); c.moveTo(-4, 17); c.lineTo(-3.6, 29); c.moveTo(-9, 21); c.lineTo(1, 20.6); c.moveTo(-8.6, 25.4); c.quadraticCurveTo(-4, 27, 0.6, 25.2); c.moveTo(-6.5, 17.6); c.lineTo(-7.3, 28); c.moveTo(-1.6, 17.2); c.lineTo(-0.2, 27); c.stroke();
  c.fillStyle = '#05040f'; c.beginPath(); c.ellipse(-4, 22.2, 1.5, 2, 0, 0, TAU); c.fill();
  c.lineWidth = 0.5; c.strokeStyle = '#05040f'; c.beginPath(); c.moveTo(-6, 20.4); c.lineTo(-2, 24); c.moveTo(-6, 24); c.lineTo(-2, 20.4); c.moveTo(-6.2, 22.2); c.lineTo(-1.8, 22.2); c.stroke();
  // tête (masque)
  const hd = pz.head;
  { const p = new Path2D(); p.ellipse(hd[0], hd[1], 4.5, 5, 0, 0, TAU); shade(c, p, red, redS, ll, 2.4, 1.2); rim(c, p, ll, 0.9, redH, 0.9);
    c.strokeStyle = RD[0]; c.lineWidth = 0.5; c.beginPath(); c.moveTo(hd[0], hd[1] - 5); c.lineTo(hd[0] + 0.2, hd[1] + 5); c.moveTo(hd[0] - 4.4, hd[1]); c.quadraticCurveTo(hd[0], hd[1] + 1.4, hd[0] + 4.4, hd[1]); c.moveTo(hd[0] - 3, hd[1] - 3.4); c.quadraticCurveTo(hd[0], hd[1] - 1.6, hd[0] + 3, hd[1] - 3.4); c.stroke(); }
  // bras droit (qui tient le fil)
  part(limb([pz.sh, pz.elbow, pz.hand], [4.4, 3.8, 3.4]), red, redS, 2, 1.2, redH);
  layerEnd({ outline: o.outline ?? null });
  // détails nets en coordonnées écran : yeux, gant
  const T = (lx, ly) => [ox + s * (lx * Math.cos(ang) - ly * Math.sin(ang)), oy + s * (lx * Math.sin(ang) + ly * Math.cos(ang))];
  L.setTransform(1, 0, 0, 1, 0, 0);
  if (!o.noEyes) {
    // deux verres blancs en biseau, cerclés de noir
    for (const sd of [-1, 1]) {
      const pts = [[sd * 3.9, -1.7], [sd * 0.5, 0.1], [sd * 0.9, 2.0], [sd * 3.6, 1.0]].map(p => T(hd[0] + p[0], hd[1] - 0.6 + p[1]));
      const cx0 = (pts[0][0] + pts[1][0] + pts[2][0] + pts[3][0]) / 4, cy0 = (pts[0][1] + pts[1][1] + pts[2][1] + pts[3][1]) / 4;
      const grow = (k) => pts.map(p => [cx0 + (p[0] - cx0) * k, cy0 + (p[1] - cy0) * k]);
      poly(grow(1.35), '#05040f'); poly(pts, WH[3]);
    }
  }
  return { T, pz };
}
// fil de soie : ligne nette blanche à liseré cyan, avec un éclat qui glisse (tension)
function silk(x0, y0, x1, y1, t, o = {}) {
  const th = o.th ?? 1;
  lineP(x0 + 1, y0, x1 + 1, y1, CY[2], th);
  lineP(x0, y0, x1, y1, WH[3], th);
  const sp = o.glint ?? 1;
  if (sp > 0) {
    const k = ((t * 0.9) % 1 + 1) % 1, gx = lerp(x0, x1, k), gy = lerp(y0, y1, k);
    px(gx, gy, CY[4]); px(gx, gy - 1, WH[3]); px(gx, gy + 1, CY[3]);
  }
}
// pluie : traits obliques qui tombent
function drawRain(t, dens = 1, o = {}) {
  const r = rng(77), ang = o.ang ?? 0.22, n = Math.round(140 * dens), len = o.len ?? 9, sp = o.sp ?? 420;
  L.setTransform(1, 0, 0, 1, 0, 0);
  for (let i = 0; i < n; i++) {
    const x0 = r() * (LW + 120) - 40, y0 = r() * LH, v = sp * (0.7 + r() * 0.6), ph = r() * 7;
    const y = ((y0 + (t + ph) * v) % (LH + 40)) - 20, x = x0 - y * ang * 0.35 - (t + ph) * v * ang * 0.0;
    lineP(x, y, x - len * ang, y - len, r() < 0.3 ? CY[4] : CY[2]);
  }
}

// fil tendu qui vibre : polyligne du haut vers la main, déplacée latéralement par une onde amortie
function silkWave(x0, y0, x1, y1, t, amp = 1.2, freq = 7, decay = 0, t0 = 0, o = {}) {
  const N = 28, pts = [], k = amp * Math.exp(-decay * (t - t0));
  const dx = x1 - x0, dy = y1 - y0, l = Math.hypot(dx, dy), nx = -dy / l, ny = dx / l;
  for (let i = 0; i <= N; i++) { const s = i / N, w = Math.sin(Math.PI * s) * Math.sin(TAU * freq * (t - t0) - s * 5) * k; pts.push([x0 + dx * s + nx * w, y0 + dy * s + ny * w]); }
  for (let i = 0; i < N; i++) lineP(pts[i][0] + 1, pts[i][1], pts[i + 1][0] + 1, pts[i + 1][1], CY[2], o.th ?? 1);
  for (let i = 0; i < N; i++) lineP(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], WH[3], o.th ?? 1);
  const g = ((t * 1.3) % 1 + 1) % 1, gi = Math.min(N - 1, Math.floor(g * N));
  px(pts[gi][0], pts[gi][1], CY[4]); px(pts[gi][0], pts[gi][1] - 1, WH[3]);
  return pts[N];
}
