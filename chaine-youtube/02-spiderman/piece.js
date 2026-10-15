'use strict';
// ───────────────────────── plans (shots) et coupes en « tir de toile » ─────────────────────────
// Chaque plan : { id, t0, draw(u, t, S) dessin avant tramage, ui(u, t, S) étiquettes nettes après tramage,
//                 target: [x, y] point où la toile se plante à l'entrée du plan, tr: 'web' | 'cut', ev: [[t, type, v]] }
const SHOTS = [];
function shot(id, t0, o) { SHOTS.push({ id, t0, tr: 'web', target: [135, 200], ...o }); }
function finishShots() {
  SHOTS.sort((a, b) => a.t0 - b.t0);
  SHOTS.forEach((s, i) => { s.i = i; s.t1 = i + 1 < SHOTS.length ? SHOTS[i + 1].t0 : DUR + 1; });
  for (const s of SHOTS) if (!(s.t1 > s.t0 + 0.2)) throw new Error('plan trop court : ' + s.id + ' (' + s.t0.toFixed(2) + ' → ' + s.t1.toFixed(2) + ')');
}
const TRD = 0.30, PRE = 0.12;                           // durée du fondu tramé, avance du tir de toile
const shotAt = t => { let k = 0; while (k + 1 < SHOTS.length && t >= SHOTS[k + 1].t0) k++; return SHOTS[k]; };
function clearL() { L.setTransform(1, 0, 0, 1, 0, 0); L.globalAlpha = 1; L.globalCompositeOperation = 'source-over'; L.filter = 'none'; L.fillStyle = '#05040f'; L.fillRect(0, 0, LW, LH); }

// la toile part du haut du cadre et se plante sur le sujet du plan suivant ; la coupe se fait sous le fil
function webOverlay(t) {
  for (const S of SHOTS) {
    if (S.tr !== 'web' || S.i === 0) continue;
    const a = S.t0 - PRE, b = S.t0 + 0.36;
    if (t < a || t > b) continue;
    const [tx, ty] = S.target, ox = S.origin ? S.origin[0] : 135 + (tx - 135) * 0.3, oy = -3;
    let p;
    if (t < S.t0) p = eo((t - a) / PRE); else if (t < S.t0 + 0.1) p = 1; else p = 1 - ei(clamp((t - S.t0 - 0.1) / 0.26));
    if (p <= 0.02) continue;
    const hx = lerp(ox, tx, p), hy = lerp(oy, ty, p);
    L.setTransform(1, 0, 0, 1, 0, 0);
    lineP(ox + 1, oy, hx + 1, hy, CY[2], 1); lineP(ox, oy, hx, hy, WH[3], 1);
    if (p < 1 || t < S.t0 + 0.14) { R(hx - 1, hy - 1, 3, 3, CY[4]); px(hx, hy, WH[3]); }
  }
}

// ───────────────────────── rendu d'une image ─────────────────────────
function render(f) {
  const t = f / FPS;
  for (const c of [X, L, Y]) { c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over'; c.filter = 'none'; c.shadowBlur = 0; }
  const S = shotAt(t), prev = S.i > 0 ? SHOTS[S.i - 1] : null, u = t - S.t0;
  const inTr = S.tr === 'web' && prev && u < TRD;
  CAPY = S.capY || 1500;
  if (inTr) {
    clearL(); prev.draw(t - prev.t0, t, prev);
    const A = L.getImageData(0, 0, LW, LH);
    clearL(); S.draw(u, t, S);
    const B = L.getImageData(0, 0, LW, LH), a = A.data, b = B.data;
    const [cx, cy] = S.target, rad = eo(u / TRD) * 360, band = 22;
    for (let y = 0, i = 0; y < LH; y++) for (let x = 0; x < LW; x++, i += 4) {
      const v = clamp((rad - Math.hypot(x - cx, y - cy)) / band + 0.0);
      if (!(v > BAYER[(y & 3) * 4 + (x & 3)])) { b[i] = a[i]; b[i + 1] = a[i + 1]; b[i + 2] = a[i + 2]; }
    }
    L.putImageData(B, 0, 0);
  } else { clearL(); S.draw(u, t, S); }
  quantize();
  L.setTransform(1, 0, 0, 1, 0, 0);
  if (!inTr && S.ui) S.ui(u, t, S);
  else if (inTr && prev.ui && u < 0.05) prev.ui(t - prev.t0, t, prev);
  webOverlay(t);
  X.imageSmoothingEnabled = false; X.drawImage(low, 0, 0, W, H);
  drawCaption(t);
}

// ───────────────────────── événements (pour la bande-son) ─────────────────────────
function buildEvents() {
  const E = [];
  const add = (t, type, v = 1) => E.push({ t: +t.toFixed(3), type, v });
  for (const S of SHOTS) {
    if (S.tr === 'web' && S.i > 0) add(S.t0 - PRE, 'thwip', 1);
    if (S.ev) for (const [t, type, v] of S.ev) add(t, type, v ?? 1);
  }
  return E.sort((a, b) => a.t - b.t);
}

// ───────────────────────── démarrage ─────────────────────────
(async function () {
  makeCity(); if (typeof makeLab === 'function') makeLab(); if (typeof makePlates === 'function') makePlates();
  if (typeof buildShots === 'function') buildShots();
  finishShots();
  const ff = new FontFace('Nunito', 'url(node_modules/@fontsource/nunito/files/nunito-latin-900-normal.woff2)', { weight: '900' });
  await ff.load(); document.fonts.add(ff);
  window.EVENTS = buildEvents(); window.DUR = DUR;
  window.READY = true;
  if (!location.search.includes('render')) {
    const t0 = performance.now();
    const loop = () => { const f = Math.floor((performance.now() - t0) / 1000 * FPS) % NF; render(f); requestAnimationFrame(loop); };
    loop();
  }
})();
