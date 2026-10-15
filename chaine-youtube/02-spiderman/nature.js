'use strict';
// ───────────────────────── nature : toile d'épeire, mouche, aube sur la rivière ─────────────────────────
// toile vue de face : rayons + spirale, gouttes de rosée. p : 0 à 1, avancement du tissage ; def : déformation (x, y, r, θ) → [x, y]
function orbWeb(cx, cy, Rw, t, o = {}) {
  const nR = o.rays ?? 16, turns = o.turns ?? 9, r0 = o.r0 ?? 10, def = o.def || null, col = o.col ?? WH[1], col2 = o.col2 ?? CY[3], p = o.p ?? 1, ph = o.phase ?? 0.18;
  const dth = TAU / nR, ang = i => ph + (i % nR) * dth;
  const pt = (r, a) => { let x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r; if (def) [x, y] = def(x, y, r, a); return [x, y]; };
  const rayP = Math.min(1, p * 1.6), spP = clamp((p - 0.3) / 0.7), total = turns * nR, shown = Math.floor(total * spP);
  for (let i = 0; i < nR; i++) { const q = pt(Rw * rayP, ang(i)), q0 = pt(r0 * 0.5, ang(i)); lineP(q0[0], q0[1], q[0], q[1], col, 1); }
  const rk = k => r0 + 8 + (k / total) * (Rw - r0 - 10);
  for (let k = 0; k < shown; k++) {
    const a0 = ang(k), r0k = rk(k), r1k = rk(k + 1), P0 = pt(r0k, a0), P1 = pt(r1k, ang(k + 1)), M = pt((r0k + r1k) / 2 * 0.982, a0 + dth / 2);
    lineP(P0[0], P0[1], M[0], M[1], col2, 1); lineP(M[0], M[1], P1[0], P1[1], col2, 1);
    if (o.dew !== false && k % 3 === 0) { px(P0[0], P0[1], WH[3]); if (k % 9 === 0) px(P0[0] + 1, P0[1] + 1, CY[4]); }
  }
  const h = pt(r0 * 0.5, 0); disc(h[0], h[1], 2, WH[1]);
}
// mouche : corps gris acier, thorax clair, deux ailes translucides qui battent
function drawFly(x, y, t, o = {}) {
  const s = o.s ?? 1, flap = Math.floor(t * 40) % 2;
  const wy = flap ? -4 : -2, wl = flap ? 7 : 5;
  L.globalAlpha = 0.8; ell(x - 1 * s, y + wy * s, rd(wl * s), rd(2.4 * s), CY[4]); ell(x + 2 * s, y + wy * s - 1, rd((wl - 1) * s), rd(2.2 * s), WH[3]); L.globalAlpha = 1;
  ell(x, y, rd(3.8 * s), rd(2.8 * s), ST[3]); ell(x - 1, y - 1, rd(3 * s), rd(1.8 * s), ST[5]); R(x - rd(2 * s), y - rd(0.5 * s), rd(4 * s), 1, ST[1]);
  ell(x + rd(4.4 * s), y + rd(0.5 * s), rd(2.4 * s), rd(2.2 * s), ST[5]); px(x + rd(5 * s), y, RD[4]); px(x + rd(5.6 * s), y + 1, RD[4]); px(x + rd(5 * s) - 1, y - 1, RD[5]);
  px(x - 1, y - rd(1.6 * s), ST[7]);
  for (const dx of [-2, 1, 3]) lineP(x + dx * s, y + rd(2.6 * s), x + dx * s - 1, y + rd(4.6 * s), ST[2], 1);
}
// aube sur une rivière : ciel, soleil, collines, brume, eau
function drawDawn(t, o = {}) {
  vgrad(0, 0, LW, 330, [[0, NI[2]], [0.3, DU[2]], [0.55, DU[5]], [0.78, DU[7]], [0.93, AM[8]], [1, AM[9]]]);
  const sx = 98, sy = 300;
  rgrad(sx, sy, 6, 120, [[0, 'rgba(255,224,138,0.8)'], [0.4, 'rgba(255,184,100,0.3)'], [1, 'rgba(255,184,100,0)']], 1, 'lighter');
  disc(sx, sy + 6, 14, AM[10]);
  const r = rng(8);
  for (let i = 0; i < 40; i++) px(r() * LW, r() * 130, '#cfd8ff');
  // collines lointaines, puis rideau d'arbres
  const hill = (base, amp, k, col, ph) => { L.fillStyle = col; for (let x = 0; x < LW; x++) { const h = base - amp * (0.5 + 0.5 * Math.sin(x * k + ph)) - amp * 0.4 * Math.sin(x * k * 2.3 + ph * 2); L.fillRect(x, Math.round(h), 1, 400); } };
  hill(325, 30, 0.021, DU[3], 1.0); hill(335, 22, 0.034, DU[2], 2.0); hill(345, 18, 0.05, GR[0], 0.4);
  // brume
  vgrad(0, 300, LW, 70, [[0, 'rgba(240,144,164,0)'], [0.5, 'rgba(240,144,164,0.25)'], [1, 'rgba(240,144,164,0)']]);
  // eau avec reflets du soleil
  vgrad(0, 352, LW, 128, [[0, DU[5]], [0.15, DU[3]], [0.55, NI[3]], [1, NI[1]]]);
  for (let i = 0; i < 70; i++) { const y = 356 + Math.pow(r(), 1.4) * 120, w = 3 + r() * 14, x = sx + (r() - 0.5) * (30 + (y - 352) * 0.6) + Math.sin(t * 1.4 + i) * 2; R(x, y, w, 1, r() < 0.5 ? AM[8] : AM[6]); }
  for (let i = 0; i < 40; i++) { const y = 358 + r() * 118, x = r() * LW; R(x + Math.sin(t * 0.9 + i) * 3, y, 4 + r() * 8, 1, DU[5]); }
}

// feuillage sombre sur un bord de l'image (silhouettes), side : -1 gauche, 1 droite
function foliage(side, seed, y0 = 20, y1 = 400, w = 40, t = 0) {
  const r = rng(seed), x0 = side < 0 ? 0 : LW;
  for (let i = 0; i < 60; i++) {
    const y = y0 + r() * (y1 - y0), reach = (0.25 + 0.75 * Math.pow(r(), 1.5)) * w * (0.4 + 0.6 * (1 - Math.abs((y - (y0 + y1) / 2) / ((y1 - y0) / 2)) * 0.6)), sz = 5 + r() * 10, sway = Math.sin(t * 0.8 + i) * 0.8;
    ell(x0 + side * reach * 0.5 + sway, y, rd(sz), rd(sz * 0.6), r() < 0.5 ? GR[0] : '#0a1a14');
    if (r() < 0.25) ell(x0 + side * (reach * 0.5 - 2) + sway, y - 1, rd(sz * 0.6), rd(sz * 0.3), GR[1]);
  }
  for (let i = 0; i < 6; i++) { const y = y0 + r() * (y1 - y0); lineP(x0, y, x0 + side * (w + 10 + r() * 20), y + (r() - 0.5) * 30, '#0a1a14', 3); }
}
