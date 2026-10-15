'use strict';
// ───────────────────────── plans 16 à 22 : le point le plus bas, spaghetti et câble, métro, étudiants, bras ─────────────────────────
function buildShots3() {
  // 16. le point le plus bas du balancement
  const tB = wt('bas', 'point') + 0.25, tPt = wt('bas', 'point');
  const swB = t => { const th = 0.27 * Math.sin(TAU / 3.6 * (t - tB)), om = 0.27 * TAU / 3.6 * Math.cos(TAU / 3.6 * (t - tB)); return { th, om, ax: 150, ay: -150, len: 350, hx: 150 + 350 * Math.sin(th), hy: -150 + 350 * Math.cos(th) }; };
  shot('lowPoint', P.bas.t0 - 0.1, {
    target: [135, 210],
    draw(u, t) {
      const sw = swB(t); drawCityBG(sw.hx * 0.35, t);
      for (let a = -0.36; a < 0.36; a += 0.008) { const x = 150 + 350 * Math.sin(a), y = -150 + 350 * Math.cos(a); if (Math.round(a * 125) % 3 === 0) { px(x, y, AM[8]); px(x, y + 1, AM[3]); } }
      drawSwingHero(t, sw, { s: 1.9 });
      vignette(0.3, 150, 330);
    },
    ui(u, t) {
      const sw = swB(t), v = 0.26 + 0.6 * Math.pow(Math.max(0, 1 - Math.abs(sw.th) / 0.27), 1.4);
      gauge(10, 14, v, 'TENSION');
      const p = prog(t, tPt - 0.05, tPt + 0.5);
      if (p > 0) { arrow(96, 300, 134, 262, AM[9], 1, 4); tagBox(12, 302, 'POINT LE PLUS BAS', 'amber', Math.floor(p * 30), false); }
    },
    ev: [[tB, 'swoosh', 1]],
  });
  // 17. un fil à peine plus fin qu'un spaghetti ; avec de la marge, un câble de chargeur
  const tFil = wt('spaghetti', 'fil'), tSp = wt('spaghetti', 'spaghetti'), tMarge = wt('spaghetti', 'marge?'), tCab = wt('spaghetti', 'câble');
  shot('threadSpaghetti', P.spaghetti.t0 - 0.1, {
    target: [135, 200],
    draw(u, t) {
      plateBG(t, { glowY: 220 });
      const y1 = 292, h = 150, pxmm = 12, x0 = 15;
      const gF = eo(prog(t, tFil - 0.05, tFil + 0.5)), gS = eo(prog(t, tSp - 0.2, tSp + 0.5)), gC = eo(prog(t, tCab - 0.2, tCab + 0.6));
      silkV(x0 + 4 * pxmm, y1, h, 20, gF, t);
      spaghettiV(x0 + 8 * pxmm + 6, y1, h, 24, gS, t);
      chargerV(x0 + 13 * pxmm, y1, h + 40, 46, gC, t);
      rulerH(x0, y1, 20, pxmm, t);
    },
    ui(u, t) {
      if (u > 0.3) tagBox(14, 16, 'MÊME RÈGLE', 'amber', 99);
      if (t > tFil) tagBox(15 + 4 * 12 + 10, 118, 'FIL DE SOIE', 'blue', Math.floor((t - tFil) * 30), true);
      if (t > tSp + 0.2) tagBox(15 + 8 * 12 + 18, 98, 'SPAGHETTI', 'amber', Math.floor((t - tSp - 0.2) * 30), true);
      const pm = prog(t, tMarge - 0.05, tMarge + 0.4);
      if (pm > 0) tagBox(135, 44, 'AVEC DE LA MARGE', 'green', Math.floor(pm * 24), true);
      if (t > tCab + 0.4) tagBox(15 + 13 * 12 + 23 + 20, 142, 'CÂBLE DE CHARGEUR', 'white', Math.floor((t - tCab - 0.4) * 30), true);
    },
    ev: [[tFil, 'label', 1], [tSp, 'label', 1], [tMarge, 'blip', 1], [tCab, 'label', 1]],
  });
  // 18. le métro de Spider-Man 2 : toile contre train
  const T18 = P.metro.t0 - 0.1, tEn = wt('metro', 'en') - 0.12;
  shot('metroTunnel', wt('metro', 'et') - 0.1 + 0.0 > 0 ? T18 + 0 : T18, {
    target: [135, 245],
    draw(u, t) {
      drawTunnel(t);
      const k = clamp(u / (tEn - T18)), z = lerp(0.45, 1.0, eo(prog(k, 0, 0.8))), br = k > 0.75;
      drawTrainFront(135, 248, z, t, { sparks: br });
      // la toile : trois fils de chaque côté, de la main du héros aux murs
      const hxL = 74, hxR = 196, hy = 296;
      for (const [x, y, sd] of [[hxL, hy, -1], [hxR, hy, 1]]) for (const dy of [-48, -4, 40]) {
        const wx = sd < 0 ? 0 : LW, wy = hy + dy - 30; lineP(x, y, wx, wy, CY[2], 2); lineP(x, y, wx, wy, WH[3], 1);
        for (const q of [0.35, 0.6, 0.82]) { const qx = lerp(x, wx, q), qy = lerp(y, wy, q); lineP(qx, qy - 5, qx, qy + 5, CY[3], 1); }
      }
      heroFront(135, 332, 1.5, t, { arms: 'out', trem: br ? 0.5 : 0 });
    },
    ui(u, t) { if (u > 0.4) tagBox(14, 16, 'SPIDER-MAN 2 · LE MÉTRO', 'blue', Math.floor((u - 0.4) * 30)); },
    ev: [[T18 + 0.15, 'train', 1], [tEn - 0.9, 'screech', 1]],
  });
  // 19. des étudiants font le calcul : ça tiendrait
  const T19 = tEn, t2013 = wt('metro', '2013,'), tCalc = wt('metro', 'calcul.'), tTien = wt('metro', 'tiendrait.');
  shot('leicester', T19, {
    target: [135, 130],
    draw(u, t) {
      L.setTransform(1, 0, 0, 1, 0, 0);
      L.drawImage(WOODWALL, 0, 0); L.globalAlpha = 0.6; R(0, 0, LW, LH, WO[0]); L.globalAlpha = 1;
      // tableau noir
      R(14, 36, 242, 200, WO[5]); R(14, 36, 242, 3, WO[6]); R(18, 40, 234, 192, GR[1]); R(18, 40, 234, 3, GR[0]); ditherRect(18, 40, 234, 192, GR[2], 0.12);
      R(18, 232, 234, 5, WO[3]); for (let i = 0; i < 6; i++) R(24 + i * 18, 233, 8, 2, WH[1]);
      // dessin à la craie : un train et une toile
      const ch = (x, y, w, h) => R(x, y, w, h, WH[1]);
      R(34, 90, 90, 40, GR[1]); for (const [x, y, w, h] of [[34, 90, 90, 1], [34, 129, 90, 1], [34, 90, 1, 40], [123, 90, 1, 40]]) ch(x, y, w, h);
      for (let i = 0; i < 5; i++) ch(42 + i * 16, 100, 10, 12); ch(34, 118, 90, 1); disc(50, 134, 3, WH[1]); disc(106, 134, 3, WH[1]);
      for (const [y0, y1] of [[60, 98], [76, 106], [96, 122]]) lineP(126, 110, 236, y0 + (y1 - y0), WH[1], 1);
      lineP(200, 56, 236, 150, WH[1], 1); lineP(232, 56, 232, 150, WH[1], 1); lineP(126, 110, 200, 60, WH[1], 1);
      const typed = Math.floor(clamp((t - tCalc + 0.3) / 0.7) * 14);
      ptext('F ≈ 300 000 N', 34, 168, WH[3], 2, GR[0], typed);
      // trois étudiants
      const stu = [[52, [BL[3], BL[2], BL[4]], WO[0], WO[2]], [135, [RD[3], RD[2], RD[4]], AM[6], AM[7]], [218, [GR[4], GR[3], GR[5]], WO[4], WO[5]]];
      stu.forEach(([x, coat, hair, hl], i) => drawScientist(x, 372, 1.05, t + i, { coat, hair, hairL: hl, armUp: i === 1 ? 0.6 * Math.max(0, Math.sin(t * 3)) : 0 }));
    },
    ui(u, t) {
      if (t > t2013 - 0.1) tagBox(135, 16, 'UNIVERSITÉ DE LEICESTER · 2013', 'blue', Math.floor((t - t2013 + 0.1) * 30), true);
      const p = prog(t, tTien - 0.05, tTien + 0.35);
      if (p > 0) { mark(135, 120, 'yes', p, 20); tagBox(135, 150, 'ÇA TIENT', 'green', Math.floor(p * 20), true); }
    },
    ev: [[t2013, 'label', 1], [tCalc, 'blip', 1], [tTien, 'ding', 1]],
  });
  // 20. côté fil, c'est crédible : la nuit, la ville, le tableau des preuves
  const T20 = P.bras.t0 - 0.1, tCred = wt('bras', 'crédible.');
  shot('credible', T20, {
    target: [135, 220],
    draw(u, t) { const sw = swing(t + 0.6, { ph: 1.9, A: 0.25 }); drawCityBG(sw.hx * 0.35, t); drawSwingHero(t + 0.6, sw, { s: 1.7 }); vignette(0.3, 150, 330); },
    ui(u, t) {
      const p0 = prog(t, tCred - 0.2, tCred + 0.25);
      slot(148, 14, 'thread', p0 > 0.6 ? 'yes' : null, p0);
      ['burger', 'spray', 'cloud'].forEach((k, i) => slot(177 + i * 29, 14, k, null, 1));
    },
    ev: [[tCred, 'ding', 1]],
  });
  // 21. mais les bras de Peter Parker...
  const T21 = wt('bras', 'ce') - 0.1, tBras = wt('bras', 'bras'), tParker = wt('bras', 'parker');
  shot('arms', T21, {
    target: [135, 200],
    draw(u, t) {
      plateBG(t, { glowY: 300 });
      const trem = 0.9 * Math.min(1, u / 0.5), cy = 346;
      lineP(136, -2, 136, 150, CY[2], 3); lineP(135, -2, 135, 150, WH[3], 1);
      const T = heroFront(135, cy, 2.55, t, { arms: 'up', trem });
      // gouttes de sueur
      for (let i = 0; i < 6; i++) { const k = ((t * 1.6 + i * 0.37) % 1), sd = i % 2 ? 1 : -1, x = 135 + sd * (30 + 22 * k + i * 3), y = cy - 100 + 70 * k * k - 20 * (1 - k); disc(x, y, 2, CY[4]); px(x, y - 3, CY[3]); }
    },
    ui(u, t) {
      const v = 0.86 + 0.07 * Math.sin(t * 40);
      gauge(10, 14, v, 'FORCE DES BRAS', { style: 'red', redFrom: 0.5 });
      const p = prog(t, tBras - 0.05, tBras + 0.4);
      if (p > 0) tagBox(135, 70, 'BRAS DE PETER PARKER', 'red', Math.floor(p * 30), true);
      const q = prog(t, tParker + 0.2, tParker + 0.6);
      if (q > 0) { ptextC('???', 135, 88, RD[5], 2, '#05040f', Math.floor(q * 4)); }
      mark(204, 130, 'yes', prog(t, T21 + 0.5, T21 + 0.9), 8); tagBox(218, 124, 'FIL OK', 'green', 99);
    },
    ev: [[tBras, 'strain', 1]],
  });
}
