'use strict';
// ───────────────────────── plans 23 à 35 : les trois problèmes, le verdict, les labos, le cocon ─────────────────────────
// tableau des trois épreuves, en haut à droite : le fil (✓) puis quantité, fabrication, météo
function scoreTiles(t, st = {}, hi = null, t0 = 0) {
  ['thread', 'burger', 'spray', 'cloud'].forEach((k, i) => {
    const x = 148 + i * 29, y = 14;
    slot(x, y, k, st[k] || null, 1);
    if (hi === k) { const a = 0.5 + 0.5 * Math.sin(t * 9); R(x - 2, y - 2, 28, 1, a > 0.5 ? YE[3] : AM[6]); R(x - 2, y + 25, 28, 1, a > 0.5 ? YE[3] : AM[6]); R(x - 2, y - 2, 1, 28, a > 0.5 ? YE[3] : AM[6]); R(x + 25, y - 2, 1, 28, a > 0.5 ? YE[3] : AM[6]); }
  });
}
function jarGraduated(x, y, w, h, level, col, t, bright) {   // éprouvette large : verre, graduations, liquide
  R(x - 2, y - 2, w + 4, h + 4, ST[6]); R(x - 1, y - 1, w + 2, h + 2, '#0a1018'); R(x, y, w, h, '#0c1620');
  const ly = y + h - Math.round(h * level);
  for (let yy = ly; yy < y + h; yy++) { const wv = Math.round(Math.sin(t * 3 + yy * 0.2) * 0.5); R(x + 1 + wv, yy, w - 2, 1, yy === ly ? bright : col); }
  for (let i = 0; i < 6; i++) { const yy = y + h - Math.round(h * i / 5); R(x, yy, i % 5 === 0 ? 7 : 4, 1, ST[7]); }
  R(x + w - 5, y + 4, 2, h - 8, ST[7]); R(x - 3, y - 5, w + 6, 4, ST[5]); R(x - 3, y + h + 1, w + 6, 4, ST[4]);
  for (let i = 0; i < 5; i++) { const bx = x + 6 + ((i * 29) % (w - 14)), by = y + h - ((t * (16 + i * 4) + i * 21) % Math.max(4, h * level)); if (by > ly) disc(bx, by, 1, bright); }
}
function buildShots4() {
  // 22. problème 1 : la quantité (carte-titre)
  const tQ = wt('probleme', 'quantité'), tPrem = wt('probleme', 'premier');
  shot('quantA', tPrem - 0.1, {
    draw(u, t) {
      plateBG(t, { glowY: 230 });
      rgrad(135, 225, 10, 120, [[0, 'rgba(255,184,80,0.3)'], [1, 'rgba(255,184,80,0)']], 1, 'lighter');
      bigIcon(iconBurger, 135, 225, 6);
    },
    ui(u, t) {
      if (u > 0.4) tagBox(14, 16, 'PROBLÈME 1 SUR 3', 'red', Math.floor((u - 0.4) * 30));
      scoreTiles(t, { thread: 'yes' }, 'burger');
      const p = prog(t, tQ - 0.05, tQ + 0.5);
      if (p > 0) ptextC('LA QUANTITÉ', 135, 318, WH[3], 2, '#05040f', Math.floor(p * 11));
    },
    ev: [[tPrem + 0.1, 'label', 1], [tQ, 'ding', 1]],
  });
  // 22b. « la toile sort de son corps, et la soie, c'est de la protéine, comme la viande »
  const tCor = wt('corps', 'corps,'), tPro = wt('corps', 'protéine,'), tVia = wt('corps', 'viande.');
  shot('bodyThread', P.corps.t0 - 0.1, {
    draw(u, t) {
      plateBG(t, { glowY: 260 });
      const cy = 350, s = 2.2;
      heroFront(135, cy, s, t, { arms: 'out' });
      // le fil sort du poignet droit du héros et file vers le haut du cadre
      const wx = Math.round(135 + 41 * s), wy = Math.round(cy - 23 * s);          // le poing droit (bras écartés)
      silkWave2(wx, wy, wx + 6, wy - 90, 2); silkWave2(wx + 6, wy - 90, wx + 2, -4, 2);
      for (let i = 0; i < 5; i++) { const k = ((t * 1.2 + i * 0.2) % 1); px(wx + 3 + Math.sin(k * 9 + i) * 3, wy - k * 150, WH[3]); }
    },
    ui(u, t) {
      if (u > 0.3) tagBox(14, 16, 'DANS LE FILM', 'blue', Math.floor((u - 0.3) * 30));
      const p1 = prog(t, tCor - 0.05, tCor + 0.5); if (p1 > 0) tagBox(135, 44, 'LA TOILE SORT DU CORPS', 'blue', Math.floor(p1 * 26), true);
      const p2 = prog(t, tPro - 0.05, tPro + 0.5); if (p2 > 0) tagBox(135, 96, 'SOIE = PROTÉINE', 'amber', Math.floor(p2 * 20), true);
      const p3 = prog(t, tVia - 0.25, tVia + 0.3); if (p3 > 0) { bigIcon(iconBurger, 60, 166, 2); ptextC('COMME LA VIANDE', 135, 124, AM[9], 1, '#05040f', Math.floor(p3 * 16)); }
      scoreTiles(t, { thread: 'yes' }, 'burger');
    },
    ev: [[tCor, 'label', 1], [tPro, 'blip', 1], [tVia, 'ding', 1]],
  });
  // 23. un seul balancement : plus de protéines que ce qu'un adulte doit manger en une journée
  const tBal = wt('proteine', 'balancement,'), tBes = wt('proteine', 'adulte'), tEnt = wt('proteine', 'journée.');
  shot('quantB', P.proteine.t0 - 0.1, {
    draw(u, t) {
      plateBG(t, { glowY: 230 });
      const g1 = eo(prog(t, tBal, tBal + 1.0)), g2 = eo(prog(t, tBes, tBes + 0.8));
      jarGraduated(36, 120, 74, 210, 0.75 * g1, CY[3], t, WH[3]);
      jarGraduated(160, 120, 74, 210, 0.5 * g2, AM[7], t, AM[10]);
      // ligne du besoin quotidien
      if (g2 > 0.9) for (let x = 20; x < 250; x += 6) R(x, 120 + 105, 3, 1, YE[3]);
    },
    ui(u, t) {
      if (u > 0.3) tagBox(14, 16, 'PROTÉINES', 'amber', 99);
      if (t > tBal + 0.4) { ptextC('1 BALANCEMENT', 73, 340, CY[4], 1); ptextC('ENVIRON', 73, 86, ST[7], 1); ptextC('90 G', 73, 100, WH[3], 2); }
      if (t > tBes + 0.4) { ptextC("UN ADULTE : 1 JOUR", 197, 340, AM[9], 1); ptextC('ENVIRON', 197, 86, ST[7], 1); ptextC('60 G', 197, 100, AM[10], 2); }
      const p = prog(t, tEnt - 0.2, tEnt + 0.3);
      if (p > 0) ptextC('>', 135, 200, RD[5], 3, '#05040f');
      scoreTiles(t, { thread: 'yes' }, 'burger');
    },
    ev: [[tBal, 'liquid', 1], [tBes, 'liquid', 1], [tEnt, 'no', 1]],
  });
  // 24. un très gros appétit : la tour de pizzas
  const tTres = wt('appetit', 'très'), tApp = wt('appetit', 'appétit.');
  shot('pizza', P.appetit.t0 - 0.1, {
    draw(u, t) {
      L.setTransform(1, 0, 0, 1, 0, 0); L.drawImage(WOODWALL, 0, 0); L.globalAlpha = 0.5; R(0, 0, LW, LH, WO[0]); L.globalAlpha = 1;
      drawWindow(16, 50, 74, 104, t, { rain: false });
      rgrad(190, 30, 6, 190, [[0, 'rgba(255,200,74,0.55)'], [1, 'rgba(255,200,74,0)']], 1, 'lighter');
      R(186, 0, 2, 30, ST[3]); poly([[168, 40], [206, 40], [198, 28], [176, 28]], ST[5]); R(172, 40, 30, 3, AM[10]);
      heroFront(105, 352, 1.9, t, { arms: 'down', trem: 0 });
      // table et nappe à carreaux
      R(0, 340, LW, 140, WO[4]); R(0, 340, LW, 3, WO[6]);
      for (let y = 343; y < 480; y += 12) for (let x = 0; x < LW; x += 12) R(x, y, 12, 12, ((x / 12 + (y - 343) / 12) % 2) ? RD[3] : WH[1]);
      ditherRect(0, 343, LW, 137, '#05040f', 0.15);
      // tour de boîtes
      const n = Math.min(12, 3 + Math.max(0, Math.floor((t - tTres + 0.1) / 0.1)));
      for (let i = 0; i < n; i++) {
        const pop = i < 3 ? 1 : eob(clamp((t - (tTres - 0.1 + (i - 3) * 0.1)) / 0.15)), y = 336 - i * 11 - (1 - pop) * 14, x = 168 + (i % 2) * 2 - ((i * 7) % 3);
        R(x, y - 10, 70, 11, AM[5]); R(x, y - 10, 70, 2, AM[7]); R(x, y - 1, 70, 1, AM[2]); R(x + 4, y - 7, 62, 1, AM[3]); R(x + 20, y - 8, 30, 5, RD[3]); ptextC('PIZZA', x + 35, y - 7, WH[3], 1, null);
      }
    },
    ui(u, t) {
      if (u > 0.4) tagBox(14, 168, 'GRAND POUVOIR...', 'amber', Math.floor((u - 0.4) * 30));
      const p = prog(t, tApp - 0.1, tApp + 0.3); if (p > 0) tagBox(14, 186, '...GROS APPÉTIT', 'red', Math.floor(p * 30));
      scoreTiles(t, { thread: 'yes' }, 'burger');
    },
    ev: [[tTres, 'pizza', 1], [tApp, 'thud', 1]],
  });
  // 25. problème 2 : la fabrication — un jet de liquide
  const tFab = wt('fabrication', 'fabrication.'), tUne2 = wt('fabrication', 'une');
  shot('fabA', P.fabrication.t0 - 0.1, {
    draw(u, t) {
      plateBG(t, { glowY: 280 });
      R(0, 345, LW, 2, AM[4]); ditherRect(0, 347, LW, 133, AM[1], 0.5);
      heroFront(112, 280, 2.2, t, { arms: 'out' });
      // jet : liquide continu puis gouttes
      const x0 = 204, y0 = 233, t0 = tFab - 0.2;
      const st = clamp((t - t0) / 0.3);
      const pos = s => [x0 + 40 * s, y0 - 22 * s + 140 * s * s];
      for (let s = 0; s < st * 0.45; s += 0.012) { const [x, y] = pos(s); R(x, y - 1, 3, 3 - Math.round(s * 3), WH[3]); }
      for (let i = 0; i < 14; i++) {
        const sp = ((t * 1.7 + i * 0.071) % 0.6) + 0.45, [x, y] = pos(sp); if (st < 0.5 || y > 343) continue;
        disc(x + Math.sin(i * 3.1) * 3, y + Math.cos(i * 2.3) * 2, 1 + (i % 2), i % 3 ? WH[3] : CY[4]);
      }
      // flaque qui s'étale
      const fl = clamp((t - t0 - 0.9) / 1.5); if (fl > 0) ell(238, 344, Math.round(18 * fl), 3, WH[1]);
      for (let i = 0; i < 6; i++) { const k = ((t * 2 + i * 0.3) % 1); if (fl > 0.2) px(224 + i * 5 + k * 4, 342 - Math.sin(k * 3.14) * 10, WH[3]); }
    },
    ui(u, t) {
      if (u > 0.4) tagBox(14, 16, 'PROBLÈME 2 SUR 3', 'red', Math.floor((u - 0.4) * 30));
      scoreTiles(t, { thread: 'yes', burger: 'no' }, 'spray');
      const p = prog(t, tFab - 0.05, tFab + 0.5); if (p > 0) ptextC('LA FABRICATION', 135, 100, WH[3], 2, '#05040f', Math.floor(p * 14));
      if (t > tFab + 0.6) { tagBox(135, 128, 'JET DE LIQUIDE', 'red', Math.floor((t - tFab - 0.6) * 30), true); }
    },
    ev: [[tFab - 0.2, 'spray', 1], [tFab, 'ding', 1]],
  });
  // 26. elle l'étire : l'araignée descend en tirant son fil
  const tEj = wt('fabrication', 'vraie'), tEtire = wt('fabrication', "l'étire.");
  shot('fabB', tUne2 - 0.1, {
    draw(u, t) {
      drawLabWall(t, { shelfY: 70, clockY: 100, dim: 0.62 });
      rgrad(20, 160, 10, 240, [[0, 'rgba(255,200,74,0.45)'], [1, 'rgba(255,200,74,0)']], 1, 'lighter');
      vgrad(0, 338, LW, 142, [[0, WO[5]], [0.06, WO[4]], [1, WO[1]]]); R(0, 338, LW, 1, WO[6]);
      const jx = 78, jy = 126, jw = 116, jh = 214;
      drawJar(jx, jy, jw, jh - 10, t);
      lineP(jx + 3, jy + 16, jx + 70, jy + 5, WO[3], 3); lineP(jx + 3, jy + 15, jx + 70, jy + 4, WO[5], 1);
      const down = eio(prog(u, 0.3, 2.9)), ay = jy + 40 + down * 120, ax = 126 + Math.sin(t * 2) * 1.5;
      silk(126, jy + 5, ax, ay, t, { glint: 1 });
      drawSpider(ax, ay, 2.4, t, { legWig: 1.6 });
      vignette(0.55, 120, 290);
    },
    ui(u, t) {
      const p = prog(t, tEtire - 0.1, tEtire + 0.5);
      arrow(100, 190, 100, 280, AM[9], 1, 4);
      if (p > 0) tagBox(232, 176, "L'ÉTIRE", 'amber', Math.floor(p * 20), true);
      const q = prog(t, tEj - 0.05, tEj + 0.4); if (q > 0) { slot(18, 150, 'spray', 'no', q); ptext('PAS UN JET', 14, 182, RD[5], 1, '#05040f', Math.floor(q * 10)); }
      scoreTiles(t, { thread: 'yes', burger: 'no' }, 'spray');
    },
    ev: [[tEj, 'no', 1], [tEtire, 'blip', 1]],
  });
  // 28. problème 3 : la pluie sur la fenêtre du labo
  const tPl = wt('pluie', 'pluie.');
  shot('rainWindow', P.pluie.t0 - 0.1, {
    draw(u, t) {
      L.setTransform(1, 0, 0, 1, 0, 0); L.drawImage(WOODWALL, 0, 0); L.globalAlpha = 0.6; R(0, 0, LW, LH, WO[0]); L.globalAlpha = 1;
      const fl = Math.max(bump(t, tPl - 0.25, tPl - 0.15, tPl - 0.1, tPl + 0.05), 0.7 * bump(t, tPl + 0.2, tPl + 0.25, tPl + 0.28, tPl + 0.5));
      drawWindow(34, 70, 202, 250, t, { flash: fl });
      R(0, 360, LW, 120, WO[4]); R(0, 360, LW, 2, WO[6]); vgrad(0, 362, LW, 118, [[0, WO[4]], [1, WO[1]]]);
      drawJar(196, 300, 52, 56, t); lineP(206, 304, 236, 300, WO[3], 2); drawSpider(222, 322, 0.8, t, { legWig: 1 });
      if (fl > 0.2) { L.globalAlpha = 0.25 * fl; R(0, 0, LW, LH, '#cfd8ff'); L.globalAlpha = 1; }
    },
    ui(u, t) {
      if (u > 0.4) tagBox(14, 16, 'PROBLÈME 3 SUR 3', 'red', Math.floor((u - 0.4) * 30));
      scoreTiles(t, { thread: 'yes', burger: 'no', spray: 'no' }, 'cloud');
      const p = prog(t, tPl - 0.05, tPl + 0.5); if (p > 0) ptextC('LA PLUIE', 135, 50, WH[3], 2, '#05040f', Math.floor(p * 8));
    },
    ev: [[P.pluie.t0 - 0.1, 'rain', 1], [tPl - 0.2, 'thunder', 0.5]],
  });
  // 29. mouillée, la soie rétrécit de moitié (supercontraction)
  const tMou = wt('pluie', 'mouillée'), tRet = wt('pluie', 'raccourcir'), tMoi = wt('pluie', 'moitié.');
  shot('shrink', wt('pluie', 'quand') - 0.1, {
    draw(u, t) {
      plateBG(t, { glowY: 220 });
      const k = eio(prog(t, tRet - 0.1, tMoi + 0.2)), len = 250 - 125 * k, hy = len;
      // gouttes de pluie qui frappent le fil
      for (let i = 0; i < 18; i++) { const x = 100 + (i * 29) % 70, y = ((t * (200 + (i % 4) * 40) + i * 37) % 320) - 10; lineP(x, y, x - 1, y - 6, CY[3], 1); if (y > 20 && y < hy) { } }
      for (let i = 0; i < 7; i++) { const yy = 20 + ((t * 40 + i * 41) % Math.max(10, hy - 20)); ell(136, yy, 1, 2, CY[4]); }
      // fil mouillé : plus sombre et ondulé quand il rétrécit
      const wet = prog(t, tMou, tMou + 1.2), wob = Math.sin(t * 9) * 3 * k * (1 - Math.abs(k - 0.5) * 2 * 0 );
      for (let y = 0; y < hy; y++) { const x = 135 + Math.sin(y * 0.18 + t * 3) * 2.6 * k; R(x, y, 3, 1, wet > 0.5 ? CY[1] : CY[2]); R(x + 1, y, 1, 1, wet > 0.5 ? CY[4] : WH[3]); }
      heroDraw(137, hy, 0, 1.6, { legs: 0.1, armL: 0.4, wet: wet > 0.5 });
      // règle de longueur
      lineP(60, 0, 60, 250, ST[4], 1); for (let y = 0; y <= 250; y += 25) R(56, y, 9, 1, ST[6]);
      lineP(60, hy, 80, hy, AM[8], 1);
    },
    ui(u, t) {
      if (u > 0.3) tagBox(14, 16, 'FIL MOUILLÉ', 'blue', Math.floor((u - 0.3) * 30));
      const p = prog(t, tRet - 0.05, tRet + 0.5); if (p > 0) tagBox(190, 70, 'LE FIL RACCOURCIT', 'red', Math.floor(p * 30), true);
      if (t < tRet) ptext('100 %', 14, 100, AM[9], 2);
      const q = prog(t, tMoi - 0.1, tMoi + 0.4); if (q > 0) { ptext('50 %', 14, 100, RD[5], 2); ptext('-50 %', 190, 96, RD[5], 2); arrow(30, 130, 30, 190, RD[5], 1, 4); }
      scoreTiles(t, { thread: 'yes', burger: 'no', spray: 'no' }, 'cloud');
    },
    ev: [[tRet, 'creak', 1], [tMoi, 'no', 1]],
  });
  // 30. en plein orage : la galère
  const tOr = wt('galere', 'orage...'), tGal = wt('galere', 'galère.');
  shot('storm', P.galere.t0 - 0.1, {
    draw(u, t) {
      const A = 0.2 * (1 - sm(prog(u, 0.9, 1.8))), len = 350 - 70 * eio(prog(u, 1.0, 1.7));
      const sw = (() => { const th = A * Math.sin(TAU / 3.6 * (t - P.galere.t0) + 0.5), ax = 150, ay = -150; return { th, om: 0, ax, ay, len, hx: ax + len * Math.sin(th), hy: ay + len * Math.cos(th) }; })();
      drawCityBG(sw.hx * 0.3, t, { moonDy: -20 });
      L.globalAlpha = 0.5; R(0, 0, LW, LH, NI[1]); L.globalAlpha = 1;
      // éclair
      const fl = bump(t, tOr - 0.05, tOr, tOr + 0.05, tOr + 0.25) + 0.6 * bump(t, tOr + 0.35, tOr + 0.38, tOr + 0.4, tOr + 0.6);
      if (bump(t, tOr - 0.05, tOr, tOr + 0.05, tOr + 0.3) > 0.3) { let x = 60, y = -4; while (y < 200) { const nx = x + (Math.sin(y * 0.9) * 9 + 3), ny = y + 14; lineP(x, y, nx, ny, WH[3], 2); lineP(x + 1, y, nx + 1, ny, CY[3], 1); x = nx; y = ny; } }
      if (fl > 0.1) { L.globalAlpha = 0.45 * clamp(fl); R(0, 0, LW, LH, '#cfd8ff'); L.globalAlpha = 1; }
      drawSwingHero(t, sw, { s: 1.9, wet: true, legs: u > 1.7 ? 0 : undefined });
      drawRain(t, 1.1, { len: 11 });
    },
    ui(u, t) { scoreTiles(t, { thread: 'yes', burger: 'no', spray: 'no' }, 'cloud'); const p = prog(t, tGal - 0.05, tGal + 0.3); if (p > 0) mark(214, 130, 'no', p, 11); },
    ev: [[tOr - 0.05, 'thunder', 1], [wt1('galere', 'galère.') + 0.1, 'sad', 1]],
  });
  // 31. verdict : le fil tient, tout le reste est fiction
  const tVe = P.verdict.t0, tSo = wt('verdict', 'soie'), tSl = wt('verdict', 'solide'), tFi = wt('fiction', 'fiction,'), tRe = wt('fiction', 'reste.');
  shot('verdict', P.verdict.t0 - 0.1, {
    draw(u, t) { plateBG(t, { glowY: 200 }); },
    ui(u, t) {
      ptextC('VERDICT', 135, 22, WH[3], 3, '#05040f', Math.floor((t - tVe + 0.1) * 12));
      const rows = [['thread', 'LA SOIE · SOLIDITÉ', 'yes', tSo], ['burger', 'LA QUANTITÉ', 'no', tFi + 0.15], ['spray', 'LA FABRICATION', 'no', tFi + 0.55], ['cloud', 'LA PLUIE', 'no', tFi + 0.95]];
      rows.forEach(([k, lab, st, tt], i) => {
        const y = 66 + i * 52, p = prog(t, tt - 0.05, tt + 0.3);
        if (k === 'mask') { R(23, y - 1, 26, 26, '#05040f'); R(24, y, 24, 24, ST[3]); R(25, y + 1, 22, 22, NI[1]); iconMask(36, y + 12); } else slot(24, y, k, null, 1);
        ptext(lab, 58, y + 9, p <= 0 ? ST[4] : st === 'yes' ? GR[5] : WH[2], 1, '#05040f');
        const q = prog(t, st === 'yes' ? tSl : tt + 0.15, (st === 'yes' ? tSl : tt + 0.15) + 0.35); if (q > 0) mark(236, y + 12, st, q, 10);
      });
      const f = prog(t, tRe - 0.05, tRe + 0.25);
      if (f > 0) { ptextC('FICTION', 135, 272, RD[4], 4, '#05040f'); R(28, 260, 214, 2, RD[4]); R(28, 306, 214, 2, RD[4]); R(28, 260, 2, 48, RD[4]); R(240, 260, 2, 48, RD[4]); }
    },
    ev: [[tSl, 'ding', 1], [tFi + 0.15, 'no', 1], [tFi + 0.55, 'no', 1], [tFi + 0.95, 'no', 1], [tRe, 'stamp', 1]],
  });
  // 32. les labos d'aujourd'hui : des cuves de production
  const tLab = wt('labos', 'labos,'), tMasse = wt('labos', 'masse.');
  shot('vats', P.labos.t0 - 0.1, {
    draw(u, t) {
      vgrad(0, 0, LW, 330, [[0, ST[1]], [1, ST[3]]]); for (let x = 0; x < LW; x += 30) R(x, 0, 1, 330, ST[2]);
      R(0, 330, LW, 150, ST[2]); for (let y = 330; y < 480; y += 20) for (let x = 0; x < LW; x += 20) R(x, y, 19, 19, ((x / 20 + (y - 330) / 20) % 2) ? ST[3] : ST[4]);
      ditherRect(0, 330, LW, 150, '#05040f', 0.25);
      R(0, 330, LW, 2, ST[6]);
      drawVat(52, 335, 54, 160, t, 0); drawVat(135, 345, 70, 210, t, 1); drawVat(220, 335, 54, 150, t, 0);
      R(0, 96, LW, 3, ST[5]); for (let x = 10; x < LW; x += 40) R(x, 99, 3, 8, ST[4]);
      drawScientist(88, 345, 0.9, t, { sway: 1 });
      L.globalAlpha = 0.18; vgrad(0, 0, LW, LH, [[0, '#70d0e4'], [1, '#05040f']]); L.globalAlpha = 1;
    },
    ui(u, t) {
      if (u > 0.3) tagBox(14, 16, "LABO · AUJOURD'HUI", 'blue', Math.floor((u - 0.3) * 30));
      const p = prog(t, tMasse - 0.4, tMasse + 0.3); if (p > 0) tagBox(135, 44, 'EN MASSE', 'green', Math.floor(p * 20), true);
    },
    ev: [[P.labos.t0, 'hum', 1], [tMasse, 'bubbles', 1]],
  });
  // 33. mais pas avec des araignées : elles se dévorent
  const tAr = wt('labos', 'araignées'), tEl = wt('labos', 'elles'), tDev = wt('labos', 'dévorent');
  shot('fight', wt('labos', 'mais') - 0.1, {
    draw(u, t) {
      drawLabWall(t, { shelfY: 70, clockY: 100, dim: 0.62 });
      rgrad(20, 160, 10, 240, [[0, 'rgba(255,200,74,0.45)'], [1, 'rgba(255,200,74,0)']], 1, 'lighter');
      vgrad(0, 338, LW, 142, [[0, WO[5]], [0.06, WO[4]], [1, WO[1]]]); R(0, 338, LW, 1, WO[6]);
      const jx = 62, jy = 126, jw = 146, jh = 214; drawJar(jx, jy, jw, jh - 10, t);
      lineP(jx + 3, jy + 16, jx + 120, jy + 5, WO[3], 3); lineP(jx + 3, jy + 15, jx + 120, jy + 4, WO[5], 1);
      const k = clamp((t - (tEl - 0.1)) / (tDev - tEl + 0.25)), clash = k >= 1;
      const pa = lerp(-34, -3, eio(k)), pb = lerp(34, 3, eio(k)), ay = jy + 120 + Math.sin(t * 2) * 3;
      silk(100, jy + 5, 135 + pa, ay, t, { glint: 0 });
      if (!clash || t < tDev + 0.1) silk(170, jy + 5, 135 + pb, ay, t, { glint: 0 });
      drawSpider(135 + pa, ay, 1.9, t, { legWig: 1.4 + k * 2 });
      if (!clash || t < tDev + 0.1) drawSpider(135 + pb, ay, 1.9, t, { tone: 'bark', legWig: 1.4 + k * 2 });
      else drawSpider(135 + pa, ay, 2.1, t, { legWig: 0.4 });
      const f = bump(t, tDev - 0.05, tDev, tDev + 0.08, tDev + 0.35);
      if (f > 0) { for (let i = 0; i < 12; i++) { const a = i * TAU / 12, d = 8 + 26 * (1 - f); lineP(135 + Math.cos(a) * d, ay + Math.sin(a) * d, 135 + Math.cos(a) * (d + 9), ay + Math.sin(a) * (d + 9), i % 2 ? YE[3] : WH[3], 1); } }
      vignette(0.55, 120, 290);
    },
    ui(u, t) {
      const p = prog(t, tAr - 0.05, tAr + 0.4); if (p > 0) tagBox(14, 16, 'MÊME BOCAL', 'red', Math.floor(p * 26));
      const q = prog(t, tDev + 0.3, tDev + 0.8); if (q > 0) tagBox(135, 98, 'IL EN RESTE UNE', 'amber', Math.floor(q * 28), true);
    },
    ev: [[tDev, 'chomp', 1]],
  });
  // 34. des bactéries qui fabriquent la soie
  const tBa = wt('bacteries', 'bactéries,');
  shot('bacteria', P.bacteries.t0 - 0.1, {
    draw(u, t) {
      fieldBG(t, NI[5], NI[2]);
      const r = rng(5);
      for (let i = 0; i < 12; i++) {
        const bx = 36 + r() * 200 + Math.sin(t * 0.8 + i) * 8, by = 100 + r() * 200 + Math.cos(t * 0.7 + i * 1.3) * 8, ang = r() * TAU + Math.sin(t * 0.6 + i) * 0.5;
        drawBacterium(bx, by, ang, 1.25, t, i);
        const k = ((t * 0.9 + i * 0.37) % 1); const ex = bx + Math.cos(ang) * 7, ey = by + Math.sin(ang) * 7, jx = (r() - 0.5) * 6;
        lineP(ex + 1, ey, ex + 1 + jx, ey - 10 - k * 28, CY[2], 1); lineP(ex, ey, ex + jx, ey - 10 - k * 28, WH[3], 1); px(ex + jx, ey - 10 - k * 28, CY[4]);
      }
      viewportMask();
    },
    ui(u, t) {
      tagBox(135, 333, 'AU MICROSCOPE', 'blue', 99, true);
      const p = prog(t, tBa - 0.05, tBa + 0.5); if (p > 0) { tagBox(14, 16, 'BACTÉRIES', 'green', Math.floor(p * 20)); ptext('SOIE ↑', 14, 34, WH[3], 1, '#05040f', Math.floor(p * 8)); }
    },
    ev: [[tBa, 'label', 1]],
  });
  // 35. ou des vers à soie modifiés
  const tVe2 = wt('bacteries', 'vers'), tMo = wt('bacteries', 'modifiés.');
  shot('silkworm', tVe2 - 0.12, {
    draw(u, t) {
      vgrad(0, 0, LW, LH, [[0, GR[0]], [0.5, GR[1]], [1, '#05140f']]);
      const r = rng(9); for (let i = 0; i < 30; i++) { L.globalAlpha = 0.25; disc(r() * LW, r() * 330, 4 + Math.round(r() * 8), r() < 0.5 ? GR[3] : CY[2]); L.globalAlpha = 1; }
      drawLeaf(140, 270, 120, 56, t);
      drawWorm(120 + Math.sin(t * 1.2) * 4, 252, t, 1.5);
      // double hélice : « modifié »
      const hx = 215, p = prog(t, tMo - 0.2, tMo + 0.4);
      if (p > 0) for (let y = 90; y < 90 + Math.round(110 * p); y++) { const a = y * 0.16 + t * 3, x1 = hx + Math.sin(a) * 12, x2 = hx - Math.sin(a) * 12; R(x1, y, 2, 1, CY[4]); R(x2, y, 2, 1, AM[8]); if (y % 7 === 0) lineP(x1, y, x2, y, WH[1], 1); }
      vignette(0.35, 140, 320);
    },
    ui(u, t) { const p = prog(t, tMo - 0.1, tMo + 0.4); if (p > 0) tagBox(135, 24, 'VER À SOIE MODIFIÉ', 'green', Math.floor(p * 30), true); },
    ev: [[tMo, 'blip', 1]],
  });
  // 36. je range l'échantillon... avant de finir en cocon
  const tRa = wt('cocon', 'range'), tAv = wt('cocon', 'avant'), tCo = wt('cocon', 'cocon.');
  shot('cocoon', P.cocon.t0 - 0.1, {
    draw(u, t) {
      drawLabWall(t, { shelfY: 100, clockY: 56, dim: 0.5 });
      rgrad(40, 120, 10, 250, [[0, 'rgba(255,200,74,0.4)'], [1, 'rgba(255,200,74,0)']], 1, 'lighter');
      vgrad(0, 400, LW, 80, [[0, WO[5]], [1, WO[1]]]); R(0, 400, LW, 1, WO[6]);
      const cx = 135, cy = 430, s = 1.55;
      const wrap = prog(t, tAv, tCo + 0.15);
      drawScientist(cx, cy, s, t, { armUp: wrap < 0.1 ? 0.5 : 0, sway: 1 - wrap, hairStyle: 'curlyFade' });
      // éprouvette à la main
      const vx = cx + 22 * s, vy = cy - 58 * s;
      if (wrap < 0.1) { R(vx - 2, vy - 16, 5, 18, CY[2]); R(vx - 2, vy - 16, 5, 3, ST[7]); R(vx - 1, vy - 10, 3, 10, CY[4]); }
      else { R(212, 118, 44, 3, WO[5]); R(212, 118, 44, 1, WO[6]); R(212, 121, 44, 1, WO[1]); R(230, 100, 6, 18, CY[2]); R(230, 100, 6, 3, ST[7]); R(231, 108, 4, 9, CY[4]); }
      // fil qui s'échappe du flacon (rangé sur l'étagère) et s'enroule
      drawCocoon(cx, cy, s, wrap, t);
      // les lunettes dépassent
      if (wrap > 0.9) { const hy = cy - 76 * s; R(cx - 11, hy - 3, 22, 7, '#05040f'); R(cx - 9, hy - 2, 7, 5, CY[4]); R(cx + 2, hy - 2, 7, 5, CY[4]); px(cx - 7, hy - 1, WH[3]); px(cx + 4, hy - 1, WH[3]); }
      { const k = clamp((t - VOICE_END + 0.25) / 0.5); if (k > 0) { L.globalAlpha = 0.8 * k; R(0, 0, LW, LH, '#05040f'); L.globalAlpha = 1; } }
      
    },
    ui(u, t) {
      const c = t - VOICE_END + 0.2;
      if (c > 0) {
        const L1 = 'LE FIL TIENT.', L2 = 'LE RESTE, NON.', n = Math.floor(c * 32);
        ptext(L1, 135 - textW(L1, 3) / 2, 130, WH[3], 3, '#05040f', n);
        ptext(L2, 135 - textW(L2, 3) / 2, 160, AM[8], 3, '#05040f', n - L1.length);
      }
    },
    ev: [[tRa, 'shelf', 1], [tAv, 'wrap', 1], [VOICE_END - 0.2, 'endCard', 1]],
  });
}
