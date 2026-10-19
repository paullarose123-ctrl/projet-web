'use strict';
// ───────────────────────── plans (shots) : coupes franches ─────────────────────────
// Chaque plan : { id, t0, draw(u, t, S) dessin avant tramage, ui(u, t, S) étiquettes nettes après tramage, ev: [[t, type, v]] }
const SHOTS = [];
function shot(id, t0, o) { SHOTS.push({ id, t0, ...o }); }
function finishShots() {
  SHOTS.sort((a, b) => a.t0 - b.t0);
  SHOTS.forEach((s, i) => { s.i = i; s.t1 = i + 1 < SHOTS.length ? SHOTS[i + 1].t0 : DUR + 1; });
  for (const s of SHOTS) if (!(s.t1 > s.t0 + 0.2)) throw new Error('plan trop court : ' + s.id + ' (' + s.t0.toFixed(2) + ' → ' + s.t1.toFixed(2) + ')');
}
const shotAt = t => { let k = 0; while (k + 1 < SHOTS.length && t >= SHOTS[k + 1].t0) k++; return SHOTS[k]; };
function clearL() { L.setTransform(1, 0, 0, 1, 0, 0); L.globalAlpha = 1; L.globalCompositeOperation = 'source-over'; L.filter = 'none'; L.fillStyle = '#05040f'; L.fillRect(0, 0, LW, LH); }

// ───────────────────────── rendu d'une image ─────────────────────────
function render(f) {
  const t = f / FPS;
  for (const c of [X, L, Y]) { c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over'; c.filter = 'none'; c.shadowBlur = 0; }
  const S = shotAt(t), u = t - S.t0;
  CAPY = S.capY || 1500;
  clearL(); S.draw(u, t, S);
  quantize();
  L.setTransform(1, 0, 0, 1, 0, 0);
  if (S.ui) S.ui(u, t, S);
  X.imageSmoothingEnabled = false; X.drawImage(low, 0, 0, W, H);
  drawCaption(t);
}

// ───────────────────────── événements (pour la bande-son) ─────────────────────────
function buildEvents() {
  const E = [];
  const add = (t, type, v = 1) => E.push({ t: +t.toFixed(3), type, v });
  for (const S of SHOTS) if (S.ev) for (const [t, type, v] of S.ev) add(t, type, v ?? 1);
  return E.sort((a, b) => a.t - b.t);
}

// ───────────────────────── démarrage ─────────────────────────
(async function () {
  INITS.forEach(f => f());
  buildShots();
  finishShots();
  const ff = new FontFace('Nunito', 'url(node_modules/@fontsource/nunito/files/nunito-latin-900-normal.woff2)', { weight: '900' });
  await ff.load(); document.fonts.add(ff);
  window.EVENTS = buildEvents(); window.DUR = DUR; window.SHOTLIST = SHOTS.map(s => ({ id: s.id, t0: +s.t0.toFixed(3), t1: +Math.min(s.t1, DUR).toFixed(3) }));
  window.READY = true;
  if (!location.search.includes('render')) {
    const t0 = performance.now();
    const loop = () => { const f = Math.floor((performance.now() - t0) / 1000 * FPS) % NF; render(f); requestAnimationFrame(loop); };
    loop();
  }
})();
