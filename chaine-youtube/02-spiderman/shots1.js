'use strict';
// ───────────────────────── plans 1 à 7 : accroche, labo, coupe, microscope ─────────────────────────
function buildShots1() {
  // 1. accroche : le héros se balance dans la nuit
  shot('hookCity', 0, {
    tr: 'cut',
    draw(u, t) { const sw = swing(t); drawCityBG(sw.hx * 0.35, t); drawSwingHero(t, sw); },
    ui(u, t) { const sw = swing(t), v = 0.28 + 0.34 * Math.pow(Math.cos(sw.th * 2.4), 8); if (u > 0.3) gauge(10, 14, v, 'TENSION'); },
    ev: [[0.456, 'swoosh', 1], [2.256, 'swoosh', 1]],
  });
  // 2. « Oui. Le fil tiendrait. » : le fil tendu, le héros suspendu, la coche
  const tTient = wt('oui', 'tiendrait');
  shot('hookOui', P.oui.t0 - 0.1, {
    target: [135, 170],
    draw(u, t) {
      drawCityBG(0, t, { moonDy: 40, farDy: 70, midDy: 100, nearDy: 150 });
      vignette(0.55, 60, 260);
      const sway = 0.035 * Math.sin(t * 2.2), hx = 135 + 230 * Math.sin(sway), hy = 232 + 3 * Math.sin(t * 4.4);
      const e = silkWave(135, -10, hx, hy, t, 1.6, 6, 1.1, P.oui.t0 - 0.1);
      heroDraw(hx, hy, -sway, 2.5, { legs: 0.05, armL: 0.2, lean: 0 });
    },
    ui(u, t) {
      const v = 0.34 + 0.06 * Math.sin(t * 6) * Math.exp(-(t - P.oui.t0) * 0.9);
      gauge(10, 14, v, 'TENSION', { style: 'red' });
      const p = prog(t, tTient - 0.05, tTient + 0.35);
      if (p > 0) { mark(160, 118, 'yes', p, 11); tagBox(176, 112, 'LE FIL TIENT', 'green', Math.floor(p * 40)); }
    },
    ev: [[tTient, 'ding', 1]],
  });
  // 3. « Mais trois choses ne passeraient jamais » : trois cases, trois ✗
  const t3 = [wt('trois', 'trois'), wt('trois', 'choses') + 0.15, wt('trois', 'ne')];
  shot('hookTrois', P.trois.t0 - 0.1, {
    target: [135, 220],
    draw(u, t) { const sw = swing(t + 1.0, { ph: 2.4, ax: 120 }); drawCityBG(sw.hx * 0.35, t); drawSwingHero(t + 1.0, sw, { s: 1.6 }); vignette(0.35, 150, 330); },
    ui(u, t) {
      ['burger', 'spray', 'cloud'].forEach((k, i) => {
        const p = prog(t, t3[i], t3[i] + 0.35); if (p > 0) slot(177 + i * 29, 14, k, p > 0.6 ? 'no' : null, p);
      });
    },
    ev: t3.map(x => [x, 'no', 1]),
  });

  // 4. le labo : une araignée au bout de son fil, dans un bocal
  const tSoie = wt('soie', 'soie'), tProt = wt('soie', 'protéines');
  shot('labSpider', P.soie.t0 - 0.1, {
    target: [135, 230],
    draw(u, t) {
      drawLabWall(t, { shelfY: 70, clockY: 40, dim: 0.55 });
      rgrad(20, 160, 10, 240, [[0, 'rgba(255,200,74,0.5)'], [1, 'rgba(255,200,74,0)']], 1, 'lighter');
      // plan de travail
      vgrad(0, 338, LW, 142, [[0, WO[5]], [0.06, WO[4]], [1, WO[1]]]); R(0, 338, LW, 1, WO[6]); R(0, 339, LW, 1, WO[2]);
      for (let i = 0; i < 12; i++) R(((i * 61) % 260), 350 + ((i * 29) % 120), 20 + (i % 3) * 8, 1, WO[3]);
      bookStack(4, 338, 4, 3); deskLamp(24, 338, t);
      flask(236, 338, 34, GR[4], t); bottle(206, 338, 11, 20, [AM[3], AM[6], AM[9]], { liquid: AM[7] });
      ell(135, 340, 62, 5, WO[1]);
      const jx = 78, jy = 126, jw = 116, jh = 214;
      drawJar(jx, jy, jw, jh - 10, t);
      // branche
      lineP(jx + 3, jy + 16, jx + 70, jy + 5, WO[3], 3); lineP(jx + 3, jy + 15, jx + 70, jy + 4, WO[5], 1); lineP(jx + 50, jy + 6, jx + 88, jy + 22, WO[3], 2);
      // araignée sur son fil, la tête en bas
      const sw = Math.sin(t * 1.5) * 2.5, ax = 126 + sw * 0.5, ay = jy + 78 + 8 * Math.sin(t * 0.9);
      silk(126, jy + 5, ax, ay, t, { glint: 1 });
      drawSpider(ax, ay, 2.5, t, { legWig: 1.3 });
      for (let i = 0; i < 26; i++) { const x = (i * 53 + t * (4 + i % 5)) % 270, y = (i * 97 + Math.sin(t * 0.7 + i) * 8 + t * 2) % 480; px(x, y, AM[9]); }
      vignette(0.6, 120, 290);
    },
    ui(u, t) {
      if (u > 0.4) tagBox(14, 16, 'LABO', 'blue', Math.floor((u - 0.4) * 30));
      const p = prog(t, tSoie - 0.1, tSoie + 0.6);
      if (p > 0) { lineP(128, 215, 160, 188, CY[3]); lineP(160, 188, 196, 188, CY[3]); ptext('SOIE', 164, 178, CY[4], 1, '#05040f', Math.floor(p * 8)); }
    },
    ev: [[tSoie, 'label', 1]],
  });

  // 5a. coupe dans l'abdomen : les protéines liquides (gel) dans la glande
  const tGel = wt('soie', 'gel'), tLiq = wt('soie', 'liquides');
  shot('cutGland', tProt - 0.18, {
    target: [135, 165],
    draw(u, t) {
      plateBG(t, { glowY: 170 });
      const cx = 135, cy = 168;
      // fil qui monte depuis les filières (en haut de l'abdomen)
      lineP(cx, 96, cx, -2, CY[2], 1); lineP(cx - 1, 96, cx - 1, -2, WH[3], 1);
      // abdomen : paroi, hachures, intérieur sombre
      ell(cx, cy, 60, 78, AM[7]); ell(cx, cy, 58, 76, AM[1]);
      ditherEll(cx, cy, 58, 76, AM[2], 0.5);
      ellRing(cx, cy, 58, 76, AM[5], 1);
      // glande principale
      gelFill(cx, cy + 8, 25, 46, t, [AM[5], AM[6], AM[8]], { lit: true });
      ellRing(cx, cy + 8, 25, 46, AM[9], 1); ellRing(cx, cy + 8, 26, 47, AM[3], 1);
      // petites glandes
      for (const [dx, dy, rx, ry] of [[-42, 6, 8, 20], [42, 6, 8, 20], [-36, 52, 7, 12], [36, 52, 7, 12]]) { gelFill(cx + dx, cy + dy, rx, ry, t + dx, [AM[4], AM[5], AM[7]]); ellRing(cx + dx, cy + dy, rx, ry, AM[8], 1); }
      // canal vers les filières
      poly([[cx - 6, cy - 36], [cx + 6, cy - 36], [cx + 2, 100], [cx - 2, 100]], AM[8]); poly([[cx - 4, cy - 36], [cx + 4, cy - 36], [cx + 1, 100], [cx - 1, 100]], AM[5]);
      // protéines (traits en pelote) qui dérivent dans la glande
      const r = rng(4);
      for (let i = 0; i < 16; i++) { const a = r() * TAU, rr = Math.sqrt(r()), x = cx + Math.cos(a + t * 0.3) * rr * 20, y = cy + 8 + Math.sin(a * 2 + t * 0.4) * rr * 38; protein(x, y, r() * TAU + t * 0.6, 0, AM[10], 5); }
      // cuticule : points
      for (let i = 0; i < 40; i++) { const a = r() * TAU, k = 0.86 + 0.1 * r(); px(cx + Math.cos(a) * 58 * k, cy + Math.sin(a) * 76 * k, AM[4]); }
      // céphalothorax et pattes en traits ambre
      ell(cx, cy + 108, 30, 24, AM[7]); ell(cx, cy + 108, 28, 22, AM[1]); ditherEll(cx, cy + 108, 28, 22, AM[2], 0.4); px(cx - 8, cy + 120, AM[10]); px(cx + 8, cy + 120, AM[10]);
      const lg = [[1.15, 0], [0.62, 1], [-0.12, 2], [-0.78, 3]];
      for (const sd of [-1, 1]) for (const [a, i] of lg) {
        const bx = cx + sd * 24, by = cy + 98 + i * 3.5, w = Math.sin(t * 2 + i + sd) * 0.05;
        const kx = bx + sd * 34 * Math.cos(a - 0.7 + w), ky = by + 34 * Math.sin(a - 0.7 + w), fx = kx + sd * 38 * Math.cos(a + 0.65), fy = ky + 38 * Math.sin(a + 0.65);
        lineP(bx, by, kx, ky, AM[7], 2); lineP(kx, ky, fx, fy, AM[6], 2); px(kx, ky - 1, AM[9]);
      }
      // filières (3 petits cônes) en haut de l'abdomen
      for (const dx of [-5, 0, 5]) { poly([[cx + dx - 3, 104], [cx + dx + 3, 104], [cx + dx + 1, 96], [cx + dx - 1, 96]], AM[8]); }
    },
    ui(u, t) {
      if (u > 0.4) tagBox(14, 16, 'COUPE · ABDOMEN', 'amber', Math.floor((u - 0.4) * 30));
      const p1 = prog(t, tProt - 0.05, tProt + 0.7);
      if (p1 > 0) { lineP(160, 190, 185, 158, AM[8]); lineP(185, 158, 193, 158, AM[8]); ptext('PROTÉINES', 196, 154, AM[9], 1, '#05040f', Math.floor(p1 * 12)); }
      const p2 = prog(t, tLiq - 0.05, tLiq + 0.7);
      if (p2 > 0) ptext('LIQUIDES', 196, 166, AM[8], 1, '#05040f', Math.floor(p2 * 12));
      const p3 = prog(t, tGel - 0.05, tGel + 0.5);
      if (p3 > 0) ptext('COMME UN GEL', 196, 178, AM[7], 1, '#05040f', Math.floor(p3 * 14));
    },
    ev: [[tProt, 'label', 1], [tGel, 'blip', 1]],
  });

  // 5b. gros plan : le gel est étiré par les filières, le fil se solidifie
  const tEtire = wt('etire', 'étire'), tOrif = wt('etire', 'orifices'), tSolide = wt('etire', 'solide.');
  const hwDuct = y => 11 + 70 * Math.pow(clamp((y - 238) / 250), 1.7);
  shot('cutNozzle', P.etire.t0 - 0.1, {
    target: [135, 240],
    draw(u, t) {
      plateBG(t, { glowY: 280 });
      const cx = 135, yN = 238;
      // paroi du canal et gel
      for (let y = yN; y < LH; y++) {
        const h = Math.round(hwDuct(y));
        for (let x = -h; x <= h; x++) {
          const n = Math.sin(x * 0.21 + t * 1.5) + Math.sin(y * 0.17 - t * 2.1) + Math.sin((x + y) * 0.11 + t * 0.8) - (x / h) * 0.7;
          L.fillStyle = n > 1.1 ? AM[8] : n > -0.2 ? AM[6] : AM[5]; L.fillRect(cx + x, y, 1, 1);
        }
        L.fillStyle = AM[9]; L.fillRect(cx - h - 1, y, 1, 1); L.fillRect(cx + h + 1, y, 1, 1);
        L.fillStyle = AM[3]; L.fillRect(cx - h - 2, y, 1, 1); L.fillRect(cx + h + 2, y, 1, 1);
        for (let k = 3; k < 12; k++) if (BAYER[(y & 3) * 4 + ((cx - h - k) & 3)] < 0.45 - k * 0.03) { L.fillStyle = AM[2]; L.fillRect(cx - h - k, y, 1, 1); L.fillRect(cx + h + k, y, 1, 1); }
      }
      // protéines : en pelote en bas, de plus en plus alignées en montant
      for (let i = 0; i < 26; i++) {
        const per = 250, y = LH - 6 - ((t * 38 + i * (per / 26) * 1.0) % per), h = hwDuct(y), r = rng(i * 13 + 1), xr = (r() * 2 - 1) * 0.8;
        const q = clamp(1 - (y - yN) / 150); protein(cx + xr * h, y, lerp(r() * TAU, -Math.PI / 2, q), q, AM[10], 6);
      }
      // trois filières : cônes
      for (const dx of [-17, 0, 17]) {
        const y0 = yN + (dx ? 4 : 0);
        poly([[cx + dx - 8, y0 + 4], [cx + dx + 8, y0 + 4], [cx + dx + 3, y0 - 12], [cx + dx - 3, y0 - 12]], AM[8]); poly([[cx + dx - 5, y0 + 4], [cx + dx + 5, y0 + 4], [cx + dx + 1.5, y0 - 12], [cx + dx - 1.5, y0 - 12]], AM[5]);
        R(cx + dx - 3, y0 - 13, 7, 2, AM[10]);
        // brin qui sort : ambre épais puis blanc fin, en convergeant vers le fil unique
        const x0 = cx + dx, ya = y0 - 13, yb = 206;
        for (let y = ya; y >= yb; y--) { const k = (ya - y) / (ya - yb), x = lerp(x0, cx, sm(k)), w = k < 0.35 ? 3 : 1; L.fillStyle = k < 0.25 ? AM[8] : k < 0.5 ? AM[10] : WH[3]; L.fillRect(Math.round(x) - (w >> 1), y, w, 1); }
      }
      // fil unique qui monte, avec ses brins alignés qui défilent
      lineP(cx + 1, 206, cx + 1, -2, CY[2], 1); lineP(cx, 206, cx, -2, WH[3], 1);
      for (let i = 0; i < 9; i++) { const y = 200 - ((t * 60 + i * 24) % 210); px(cx - 1, y, CY[4]); px(cx - 1, y - 1, WH[3]); }
      // brillance quand il se fige : petites étoiles le long du fil
      const g = bump(t, tSolide - 0.15, tSolide + 0.1, tSolide + 0.9, tSolide + 1.3);
      if (g > 0) for (let i = 0; i < 6; i++) { const y = 30 + i * 28 + ((t * 40) % 28), sz = Math.round(g * (1 + (i % 2))); lineP(cx - 2 - sz, y, cx + 2 + sz, y, WH[3]); lineP(cx, y - 2 - sz, cx, y + 2 + sz, WH[3]); }
    },
    ui(u, t) {
      if (u > 0.4) tagBox(14, 16, 'GROS PLAN · FILIÈRES', 'amber', Math.floor((u - 0.4) * 30));
      const pe = prog(t, tEtire - 0.05, tEtire + 0.5);
      if (pe > 0) { arrow(168, 190, 168, 120, AM[9], 1, 4); ptext('ÉTIRÉ', 175, 150, AM[9], 1, '#05040f', Math.floor(pe * 8)); }
      const po = prog(t, tOrif - 0.05, tOrif + 0.6);
      if (po > 0) { lineP(152, 232, 190, 262, AM[8]); lineP(190, 262, 200, 262, AM[8]); ptext('FILIÈRES', 203, 258, AM[9], 1, '#05040f', Math.floor(po * 10)); }
      const ps = prog(t, tSolide - 0.1, tSolide + 0.5);
      if (ps > 0) { tagBox(150, 60, 'FIL SOLIDE', 'blue', Math.floor(ps * 12)); }
    },
    ev: [[tEtire, 'label', 1], [tOrif, 'blip', 1], [tSolide, 'ding', 1]],
  });

  // 6. microscope : on zoome du fil aux molécules ; 7. briques et élastiques
  const tMol = wt('zoom', 'molécules:'), tBr = wt('zoom', 'briques'), tSou = wt('zoom', 'souples.');
  const zT0 = P.zoom.t0 - 0.1, zA = 1.15, zB = 2.35;                    // fin du plan A, fin du plan B
  shot('microZoom', zT0, {
    target: [135, 205],
    draw(u, t) {
      const kAB = prog(u, zA, zA + 0.5), kBC = prog(u, zB, zB + 0.5);
      const dA = tt => stageThread(tt), dB = tt => stageFibrils(tt), dC = tt => molecules(tt, 0, tt > tBr && tt < tBr + 0.5, false);
      if (kBC > 0) zoomThrough(dB, dC, kBC, t, t);
      else if (kAB > 0) zoomThrough(dA, dB, kAB, t, t);
      else dA(t);
      viewportMask();
    },
    ui(u, t) {
      const lab = u < zA + 0.35 ? 'ZOOM ×100 · LE FIL' : u < zB + 0.35 ? 'ZOOM ×10 000 · FIBRILLES' : 'ZOOM ×1 000 000 · MOLÉCULES';
      tagBox(135, 350, lab, 'blue', 99, true);
      if (u > zB + 0.6) {
        const pb = prog(t, tBr, tBr + 0.5); if (pb > 0) { lineP(70, 168, 40, 140, CY[4]); ptext('BRIQUES', 8, 130, CY[4], 1, '#05040f', Math.floor(pb * 10)); }
        const pc = prog(t, wt('zoom', 'chaînes'), wt('zoom', 'chaînes') + 0.5); if (pc > 0) { lineP(112, 214, 150, 262, AM[8]); ptext('CHAÎNES SOUPLES', 150, 266, AM[8], 1, '#05040f', Math.floor(pc * 16)); }
      }
    },
    ev: [[zT0 + zA, 'zoom', 1], [zT0 + zB, 'zoom', 1], [tBr, 'label', 1]],
  });
  const tFont = wt('briques', 'solidité.'), tEla = wt('briques', 'élastiques'), tCasse = wt('briques', 'casse.');
  shot('microBricks', P.briques.t0 - 0.1, {
    target: [135, 205],
    draw(u, t) {
      // s : étirement (deux tractions) ; les briques restent rigides
      const s = 0.5 - 0.5 * Math.cos(clamp((t - tEla) / 2.2) * TAU * 1.0);
      molecules(t, clamp(s), t > P.briques.t0 && t < tFont + 0.3 && Math.floor(t * 6) % 2 === 0, t > tEla && t < tCasse + 0.2 && Math.floor(t * 6) % 2 === 0);
      viewportMask();
    },
    ui(u, t) {
      tagBox(135, 350, 'ZOOM ×1 000 000 · MOLÉCULES', 'blue', 99, true);
      const p1 = prog(t, P.briques.t0 + 0.2, P.briques.t0 + 0.7); if (p1 > 0) { tagBox(14, 16, 'BRIQUES = SOLIDE', 'blue', Math.floor(p1 * 20)); }
      const p2 = prog(t, tEla, tEla + 0.5); if (p2 > 0) { tagBox(14, 34, "ÉLASTIQUES = S'ÉTIRE", 'amber', Math.floor(p2 * 22)); }
    },
    ev: [[tFont, 'blip', 1], [tEla, 'stretch', 1], [tCasse, 'ding', 1]],
  });
}
