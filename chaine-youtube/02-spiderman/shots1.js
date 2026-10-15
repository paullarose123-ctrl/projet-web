'use strict';
// ───────────────────────── plans 1 à 7 : accroche, labo, coupe, microscope ─────────────────────────
function buildShots1() {
  // 1. accroche : le héros se balance dans la nuit
  shot('hookCity', 0, {
    draw(u, t) { const sw = swing(t); drawCityBG(sw.hx * 0.35, t); drawSwingHero(t, sw); },
    ui(u, t) { const sw = swing(t), v = 0.28 + 0.34 * Math.pow(Math.cos(sw.th * 2.4), 8); if (u > 0.3) gauge(10, 14, v, 'TENSION'); },
    ev: [[0.456, 'swoosh', 1], [2.256, 'swoosh', 1]],
  });
  // 2. « Oui. Le fil tiendrait. » : le fil tendu, le héros suspendu, la coche
  const tTient = wt('oui', 'tiendrait');
  shot('hookOui', P.oui.t0 - 0.1, {
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
    draw(u, t) { const sw = swing(t + 1.0, { ph: 2.4, ax: 120 }); drawCityBG(sw.hx * 0.35, t); drawSwingHero(t + 1.0, sw, { s: 1.6 }); vignette(0.35, 150, 330); },
    ui(u, t) {
      ['burger', 'spray', 'cloud'].forEach((k, i) => {
        const p = prog(t, t3[i], t3[i] + 0.35); if (p > 0) slot(177 + i * 29, 14, k, p > 0.6 ? 'no' : null, p);
      });
    },
    ev: t3.map(x => [x, 'no', 1]),
  });

  // 5a. coupe dans l'abdomen : « Dans l'araignée, la soie est liquide »
  const tLiq = wt('jet', 'liquide'), tJetW = wt('jet', 'jet');
  shot('cutGland', P.jet.t0 - 0.1, {
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
      if (u > 0.4) tagBox(14, 16, "DANS L'ARAIGNÉE", 'amber', Math.floor((u - 0.4) * 30));
      const p2 = prog(t, tLiq - 0.05, tLiq + 0.5);
      if (p2 > 0) { lineP(150, 190, 170, 160, AM[8]); lineP(170, 160, 176, 160, AM[8]); tagBox(178, 153, 'SOIE LIQUIDE', 'amber', Math.floor(p2 * 14)); }
    },
    ev: [[tLiq, 'label', 1]],
  });

  // 5b. gros plan : le liquide est étiré, le fil se solidifie (« Pour devenir solide, il faut l'étirer »)
  const tPour = wt('jet', 'pour'), tDev = wt('jet', 'devenir'), tSolide = wt('jet', 'solide,'), tEtire = wt('jet', "l'étirer.");
  const hwDuct = y => 11 + 70 * Math.pow(clamp((y - 238) / 250), 1.7);
  shot('cutNozzle', tPour - 0.1, {
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
      const g = bump(t, tSolide - 0.15, tSolide + 0.1, tSolide + 1.4, tSolide + 1.9);
      if (g > 0) for (let i = 0; i < 6; i++) { const y = 30 + i * 28 + ((t * 40) % 28), sz = Math.round(g * (1 + (i % 2))); lineP(cx - 2 - sz, y, cx + 2 + sz, y, WH[3]); lineP(cx, y - 2 - sz, cx, y + 2 + sz, WH[3]); }
    },
    ui(u, t) {
      if (u > 0.3) tagBox(14, 16, 'GROS PLAN', 'amber', Math.floor((u - 0.3) * 30));
      const pl = prog(t, tDev - 0.05, tDev + 0.5);
      if (pl > 0) { lineP(152, 380, 190, 396, AM[8]); tagBox(194, 389, 'LIQUIDE', 'amber', Math.floor(pl * 14)); }
      const ps = prog(t, tSolide - 0.1, tSolide + 0.5);
      if (ps > 0) { tagBox(150, 60, 'FIL SOLIDE', 'blue', Math.floor(ps * 12)); }
      const pe = prog(t, tEtire - 0.05, tEtire + 0.5);
      if (pe > 0) { arrow(168, 190, 168, 120, AM[9], 1, 4); ptext('ÉTIRÉ', 175, 150, AM[9], 1, '#05040f', Math.floor(pe * 8)); }
    },
    ev: [[tDev, 'label', 1], [tSolide, 'ding', 1], [tEtire, 'blip', 1]],
  });

  // jet de liquide : des gouttes (« en jet, elle ferait juste des gouttes »)
  const tGou = wt('jet', 'gouttes.');
  shot('jetDrops', tJetW - 0.15, {
    draw(u, t) {
      plateBG(t, { glowY: 250 });
      R(0, 410, LW, 2, AM[4]); ditherRect(0, 412, LW, 68, AM[1], 0.5);
      // buse en haut à gauche ; le jet part en continu, se brise en gouttes qui tombent et s'étalent en flaque
      R(20, 140, 52, 18, ST[4]); R(20, 140, 52, 3, ST[6]); R(66, 144, 14, 10, ST[3]);
      const x0 = 80, y0 = 150, st = clamp((u - 0.15) / 0.3);
      const pos = s => [x0 + 120 * s, y0 - 10 * s + 230 * s * s];
      for (let s = 0; s < st * 0.5; s += 0.01) { const [x, y] = pos(s); R(x, y - 1, 3, Math.max(1, 3 - Math.round(s * 4)), WH[3]); }
      for (let i = 0; i < 18; i++) { const sp = ((t * 1.6 + i * 0.058) % 0.55) + 0.5, [x, y] = pos(sp); if (st < 0.5 || y > 408) continue; disc(x + Math.sin(i * 3.1) * 3, y + Math.cos(i * 2.3) * 2, 1 + (i % 2), i % 3 ? WH[3] : CY[4]); }
      const fl = clamp((u - 0.9) / 1.2); if (fl > 0) ell(214, 409, Math.round(26 * fl), 3, WH[1]);
    },
    ui(u, t) {
      if (u > 0.3) tagBox(14, 16, 'EN JET', 'red', Math.floor((u - 0.3) * 30));
      const p = prog(t, tGou - 0.1, tGou + 0.35); if (p > 0) { mark(190, 300, 'no', p, 11); tagBox(190, 322, 'DES GOUTTES', 'red', Math.floor(p * 20), true); }
    },
    ev: [[tJetW, 'spray', 1], [tGou, 'no', 1]],
  });
}
