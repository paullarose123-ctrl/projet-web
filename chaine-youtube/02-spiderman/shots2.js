'use strict';
// ───────────────────────── plans 8 à 15 : acier, balance, mouche, ténacité, araignée de Darwin ─────────────────────────
function iconVest(x, y) {                                // gilet pare-balles (28 × 34)
  poly([[x + 2, y], [x + 9, y], [x + 14, y + 6], [x + 19, y], [x + 26, y], [x + 28, y + 12], [x + 25, y + 34], [x + 3, y + 34], [x, y + 12]], '#05040f');
  poly([[x + 3, y + 1], [x + 9, y + 1], [x + 14, y + 7], [x + 19, y + 1], [x + 25, y + 1], [x + 26, y + 12], [x + 24, y + 33], [x + 4, y + 33], [x + 2, y + 12]], ST[2]);
  R(x + 5, y + 14, 18, 2, ST[4]); R(x + 5, y + 22, 18, 2, ST[4]); R(x + 13, y + 8, 2, 25, ST[3]); R(x + 4, y + 11, 3, 4, ST[5]); R(x + 21, y + 11, 3, 4, ST[5]);
  R(x + 8, y + 18, 5, 4, ST[3]); R(x + 15, y + 18, 5, 4, ST[3]);
}
function iconSpiderSmall(cx, cy) {
  ell(cx, cy, 4, 5, WO[1]); ell(cx, cy, 3, 4, AM[6]); px(cx - 1, cy - 1, AM[10]); px(cx + 1, cy + 1, AM[10]); ell(cx, cy + 6, 2, 2, WO[3]);
  for (const sd of [-1, 1]) for (let i = 0; i < 4; i++) { lineP(cx + sd * 3, cy + 1 + i, cx + sd * (8 + (i & 1)), cy - 2 + i * 3, WO[2], 1); }
}

function buildShots2() {
  // 8. acier contre soie, à épaisseur égale
  const tEp = wt('acier', 'épaisseur'), tPar = wt('acier', 'acier'), tSix = wt('acier', 'six'), tMais = wt('acier', 'mais');
  shot('steelSilk', P.acier.t0 - 0.1, {
    draw(u, t) {
      plateBG(t, { glowY: 200 });
      R(30, 0, 210, 12, ST[2]); R(30, 10, 210, 2, ST[4]); R(30, 0, 210, 1, ST[5]); for (let x = 36; x < 240; x += 14) px(x, 5, ST[4]);
      const drop = eo(prog(u, 0.2, 0.7)), y1 = 12 + drop * 188;
      cable(75, 12, y1, 7, 'steel', t); cable(195, 12, y1, 7, 'silk', t);
      if (u > 0.7) { weightBlock(75, y1, 72, 40, 'MÊME CHARGE', 0); weightBlock(195, y1, 72, 40, 'MÊME CHARGE', 0); }
      const pc = prog(t, tEp - 0.05, tEp + 0.4);
      if (pc > 0) { crossSection(75, 330, 20, 'steel', t); crossSection(195, 330, 20, 'silk', t); lineP(75, 304, 75, 262, ST[5]); lineP(195, 304, 195, 262, CY[3]); }
    },
    ui(u, t) {
      if (u > 0.4) tagBox(135, 22, 'À ÉPAISSEUR ÉGALE', 'amber', 99, true);
      if (u > 1.2) { ptextC('ACIER', 75, 262, WH[2], 1); ptextC('SOIE', 195, 262, CY[4], 1); }
      const pc = prog(t, tEp - 0.05, tEp + 0.4);
      if (pc > 0) { const y = 330; arrow(135, y, 103, y, AM[8], 1, 3); arrow(135, y, 167, y, AM[8], 1, 3); ptextC('MÊME', 135, y - 21, AM[9], 1); ptextC('ÉPAISSEUR', 135, y - 11, AM[9], 1); }
      const pp = prog(t, tPar - 0.05, tPar + 0.4);
      if (pp > 0) { approx(135, 292, 22, YE[3]); mark(75, 292, 'yes', pp, 7); mark(195, 292, 'yes', pp, 7); }
    },
    ev: [[P.acier.t0 + 0.7, 'clank', 1], [tEp, 'label', 1], [tPar, 'ding', 1]],
  });
  // 9. six fois plus légère : la balance
  shot('balance', tMais - 0.1, {
    draw(u, t) {
      plateBG(t, { glowY: 260 });
      const n = Math.max(0, (u - 0.2) / 0.13), nS = Math.min(6, Math.floor(n)), u6 = 0.2 + 6 * 0.13;
      const tilt = -0.13 * (1 - Math.min(1, n / 6)) + (u > u6 ? -0.07 * Math.exp(-(u - u6) * 2.4) * Math.sin((u - u6) * 11) : 0);
      balance(135, 190, tilt, nS, t);
    },
    ui(u, t) {
      if (u > 0.3) tagBox(51, 292, '1 CUBE D\'ACIER', 'white', 99, true);
      if (u > 0.9) tagBox(195, 292, '6 CUBES DE SOIE', 'blue', 99, true);
      if (u > 1.0) counter(135, 58, '6× PLUS LÉGÈRE', 2);
    },
    ev: [[tSix, 'blip', 1], [tMais + 0.8, 'ding', 1]],
  });
  // 10. une toile d'épeire à l'aube : la mouche arrive
  const tUne = wt('chocs', 'une');  // « Quand une mouche fonce dedans »
  shot('webApproach', P.chocs.t0 - 0.1, {
    draw(u, t) {
      drawDawn(t);
      foliage(-1, 5, 30, 400, 52, t); foliage(1, 9, 30, 400, 52, t);
      const def = (x, y, r, a) => [x + Math.sin(t * 1.6 + a * 2) * 0.8 * (r / 100), y + Math.cos(t * 1.3 + a) * 0.8 * (r / 100)];
      orbWeb(135, 205, 118, t, { def });
      drawSpider(135, 198, 0.95, t, { legWig: 0.5 });
      // la mouche arrive en piqué, par le haut gauche
      const k = clamp(u / (tUne - 0.12 - (P.chocs.t0 - 0.1))), fx = lerp(-16, 58, Math.pow(k, 1.6)), fy = lerp(14, 207, Math.pow(k, 1.25)) + Math.sin(k * 26) * 7 * (1 - k);
      for (let i = 1; i <= 3; i++) { px(fx - i * 3, fy - i * 2, CY[4]); }
      drawFly(fx, fy, t, { s: 1.9 });
      vignette(0.35, 150, 330);
    },
    ui(u, t) { if (u > 0.4) tagBox(14, 16, 'LA TOILE', 'blue', Math.floor((u - 0.4) * 30)); },
    ev: [[P.chocs.t0 + 0.6, 'fly', 1]],
  });
  // 11. vue de côté : la toile encaisse le choc, « boing »
  const T11 = tUne - 0.12, uH = 0.62, tE = wt('chocs', "s'étire");
  const off = tau => tau < 0 ? 0 : 26 * (1 - Math.exp(-6 * tau)) + 46 * Math.exp(-3.0 * tau) * Math.sin(8 * tau);
  const strand = (x0, k, o, y0 = 84, y1 = 346, yh = 215) => {          // brin déformé : forme en V arrondie
    const pts = []; for (let y = y0; y <= y1; y += 4) { const d = Math.abs(y - yh) / (y < yh ? yh - y0 : y1 - yh); pts.push([x0 + o * k * Math.pow(Math.max(0, 1 - d), 1.7), y]); }
    for (let i = 0; i + 1 < pts.length; i++) { lineP(pts[i][0] + 1, pts[i][1], pts[i + 1][0] + 1, pts[i + 1][1], CY[2], 3); }
    for (let i = 0; i + 1 < pts.length; i++) { lineP(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], WH[3], 2); }
  };
  shot('flyHit', T11, {
    draw(u, t) {
      plateBG(t, { glowY: 240 });
      const o = off(u - uH);
      R(100, 78, 140, 8, WO[2]); R(100, 78, 140, 2, WO[5]); R(100, 346, 140, 8, WO[2]); R(100, 346, 140, 2, WO[5]);
      for (const [x, k] of [[126, 0.18], [148, 0.5], [170, 1], [192, 0.5], [214, 0.18]]) strand(x, k, o);
      let fx, fy;
      if (u < uH) { const k = u / uH; fx = lerp(-12, 164, Math.pow(k, 1.5)); fy = 215 + Math.sin(k * 30) * 6 * (1 - k); for (let i = 1; i <= 6; i++) lineP(fx - 8 - i * 8, fy, fx - 14 - i * 8, fy, i < 4 ? CY[3] : CY[2], 1); }
      else { fx = 170 + o - 5; fy = 215; }
      drawFly(fx, fy, u < uH + 0.5 ? t : 0, { s: 2.2 });
    },
    ui(u, t) {
      const e = clamp((u - uH) / 0.55);
      if (u > uH) { ptext('LA TOILE ENCAISSE', 40, 22, AM[9], 1); barH(40, 34, 190, 8, e, CY[3]); }
      const ps = prog(t, tE - 0.05, tE + 0.4);
      if (ps > 0) tagBox(135, 52, "S'ÉTIRE", 'amber', Math.floor(ps * 10), true);
    },
    ev: [[T11 + uH, 'boing', 1], [tE, 'blip', 1]],
  });
  // 12. « au lieu de casser » : la mouche est prise, le fil n'a pas cassé
  const tAu = wt('chocs', 'au'), tCas = wt('chocs', 'casser.');
  shot('webCaught', tAu - 0.1, {
    draw(u, t) {
      drawDawn(t);
      foliage(-1, 5, 30, 400, 52, t); foliage(1, 9, 30, 400, 52, t);
      const k = 5 * Math.exp(-1.7 * u) * Math.sin(8 * u + 0.6);
      const def = (x, y, r, a) => [x, y + k * Math.max(0, 1 - r / 135)];
      orbWeb(135, 205, 118, t, { def });
      drawFly(135, 205 + k, 0, { s: 2.1 });
      drawSpider(196, 120 + 30 * eo(prog(u, 0.2, 2.6)), 0.95, t, { legWig: 0.8 });
      vignette(0.35, 150, 330);
    },
    ui(u, t) {
      const p = prog(t, tCas - 0.1, tCas + 0.3);
      if (p > 0) { mark(135, 92, 'yes', p, 12); tagBox(135, 116, 'LE FIL NE CASSE PAS', 'green', Math.floor(p * 22), true); }
    },
    ev: [[tCas, 'ding', 1]],
  });
  // 13. Madagascar : l'araignée écorce de Darwin et sa toile au-dessus de la rivière
  const T13 = P.darwin.t0 - 0.1, tMad = wt('darwin', 'madagascar'), tEc = wt('darwin', 'araignée');   // l'étiquette de l'espèce n'est pas dite, seulement écrite
  shot('darwinWeb', T13, {
    draw(u, t) {
      drawDawn(t);
      foliage(-1, 21, 40, 420, 60, t); foliage(1, 33, 40, 420, 60, t);
      // fil de pont jusqu'à l'autre rive, puis la toile géante
      const sagY = x => 96 + 10 * Math.sin((x / LW) * Math.PI) + Math.sin(t * 0.9) * 0.7;
      for (let x = 0; x < LW - 1; x += 2) { lineP(x, sagY(x), x + 2, sagY(x + 2), WH[2], 1); }
      const cy = 205 + Math.sin(t * 0.7) * 2, def = (x, y, r, a) => [x + Math.sin(t * 1.1 + a * 2) * 0.7 * (r / 100), y];
      orbWeb(135, cy, 122, t, { def, turns: 11, rays: 18 });
      drawSpider(135, cy - 8, 1.7, t, { tone: 'bark', legWig: 0.6 });
      vignette(0.3, 160, 340);
    },
    ui(u, t) {
      const p = prog(t, tMad - 0.05, tMad + 0.4);
      if (p > 0) tagBox(14, 16, 'MADAGASCAR', 'blue', Math.floor(p * 30));
      const q = prog(t, tEc - 0.05, tEc + 0.6);
      if (q > 0) { lineP(140, 232, 170, 300, CY[4]); tagBox(135, 300, 'ARAIGNÉE ÉCORCE DE DARWIN', 'blue', Math.floor(q * 40), true); }
    },
    ev: [[tMad, 'label', 1], [tEc, 'blip', 1]],
  });
  // 14. dix fois plus tenace que le Kevlar
  const T14 = wt('darwin', 'sa') - 0.12, tJus = wt('darwin', "jusqu'à"), tDix = wt('darwin', 'dix'), tKev = wt('darwin', 'kevlar');
  shot('kevlarChart', T14, {
    draw(u, t) {
      plateBG(t, { glowY: 220 });
      const g1 = eo(prog(u, 0.5, 0.9)), g2 = eo(prog(t, tJus, tDix + 0.8));
      // barre Kevlar (courte) et barre araignée (longue)
      R(55, 126, 202, 14, '#12060a'); R(56, 127, Math.round(21 * g1), 12, ST[5]); R(56, 127, Math.round(21 * g1), 3, ST[7]);
      R(55, 206, 202, 14, '#12060a'); R(56, 207, Math.round(190 * g2), 12, CY[3]); R(56, 207, Math.round(190 * g2), 3, CY[4]);
      for (let i = 0; i < 6; i++) { const x = 56 + ((t * 90 + i * 40) % Math.max(1, 190 * g2)); if (g2 > 0.05) { px(x, 209, WH[3]); px(x + 1, 210, CY[4]); } }
      iconVest(14, 109); iconSpiderSmall(26, 216);
    },
    ui(u, t) {
      if (u > 0.2) tagBox(135, 60, 'RÉSISTANCE AUX CHOCS', 'amber', 99, true);
      if (u > 0.5) { ptext('KEVLAR', 56, 114, WH[2], 1); ptext('(GILET PARE-BALLES)', 98, 114, ST[6], 1); ptext('×1', 82, 129, AM[9], 1); }
      if (u > 0.9) ptext('ARAIGNÉE ÉCORCE DE DARWIN', 56, 194, CY[4], 1);
      const pd = prog(t, tDix - 0.05, tDix + 0.4);
      if (pd > 0) { ptext("JUSQU'À ×10", 150, 209, '#05040f', 1, null); }
      if (pd > 0) { const k = eob(pd); counter(135, 270, '×10', 4); ptextC('PLUS RÉSISTANTE QUE LE KEVLAR', 135, 330, AM[9], 1); }
    },
    ev: [[tJus, 'bars', 1], [tDix, 'ding', 1]],
  });
}
// segment de fil épais (2 px) en blanc à liseré cyan
function silkWave2(x0, y0, x1, y1, th) { lineP(x0 + 1, y0, x1 + 1, y1, CY[2], th); lineP(x0, y0, x1, y1, WH[3], th - 1); }
