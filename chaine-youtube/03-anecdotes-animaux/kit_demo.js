'use strict';
// ───────────────────────── démonstration du kit (page solo_kit.html) : 8 plans de 1,7 s, uniquement kit.js ─────────────────────────
// préfixe kd_ ; chaque plan montre un préréglage de ciel avec ses reliefs, sa lumière et ses particules ; la caméra glisse (cam) pour montrer la parallaxe.

// sol simple (dégradé tramé + liseré + congères), uniquement pour la démonstration (le vrai sol vient de flore.js)
function kd_ground(y0, cols, o = {}) {
  const hi = o.hi ?? cols[0], seed = o.seed ?? 3, cam = o.cam || 0;
  vgrad(0, y0, LW, LH - y0, [[0, cols[0]], [0.3, cols[1]], [1, cols[2]]]);
  for (let x = 0; x < LW; x++) { const y = y0 + Math.round(1.5 * Math.sin((x + cam * 1.0) * 0.05 + seed) + Math.sin((x + cam) * 0.13)); R(x, y, 1, 1, hi); }
  const r = rng(seed);
  for (let i = 0; i < 26; i++) { const x = ((r() * 400 - cam * 1.0) % 330 + 330) % 330 - 30, y = y0 + 8 + r() * (LH - y0 - 14), w = 14 + r() * 40; ell(x, y, w / 2, 1 + r() * 2, o.drift ?? cols[0]); }
}
// épicéa de premier plan (démonstration)
function kd_spruce(x, y, h, c, hi, snow) {
  const w = h * 0.32; R(x - 1, y - 6, 3, 6, c);
  for (let k = 0; k < 6; k++) { const yy = y - 6 - k * h / 7, ww = w * (1 - k / 6.5); poly([[x - ww, yy], [x + ww, yy], [x, yy - h / 5]], c); if (snow) { poly([[x - ww * 0.8, yy - 1], [x + ww * 0.2, yy - 1], [x - ww * 0.3, yy - h / 5 + 1], [x - 1, yy - h / 5]], snow); } lineP(x - ww, yy, x, yy - h / 5, hi, 1); }
}
function kd_blade(x, y, h, lean, c) { lineP(x, y, x + lean, y - h, c, 1); }
// petite grenouille pour le plan de la glace (sujet dessiné avant le voile)
function kd_frog(cx, cy, s) {
  const o = '#05040f';
  ell(cx - 2 * s, cy + 4 * s, 11 * s, 7 * s, o); ell(cx + 9 * s, cy + 1 * s, 8 * s, 6 * s, o); ell(cx - 10 * s, cy + 9 * s, 6 * s, 4 * s, o);
  ell(cx - 2 * s, cy + 4 * s, 10 * s, 6 * s, WO[4]); ell(cx - 2 * s, cy + 6 * s, 7 * s, 3 * s, WH[1]);
  ell(cx + 9 * s, cy + 1 * s, 7 * s, 5 * s, WO[5]); R(cx + 4 * s, cy + 3 * s, 12 * s, 1, WH[1]);
  ell(cx - 10 * s, cy + 9 * s, 5 * s, 3 * s, WO[3]); disc(cx + 12 * s, cy - 4 * s, 3 * s, o); disc(cx + 12 * s, cy - 4 * s, 2 * s, WO[5]); px(cx + 12 * s, cy - 4 * s, WH[3]); px(cx + 13 * s, cy - 4 * s, o);
  R(cx + 7 * s, cy - 1 * s, 8 * s, 2, WO[0]);
}

function buildKitDemo(S) {
  const T = (i) => S.t0 + 1.7 * i;
  // 1 · Alaska, heure bleue : montagnes en 4 plans, brume, forêt lointaine, neige en rafale, vol d'oiseaux, buée
  shot('kd_alaska', T(0), {
    draw(u, t) {
      const cam = k_pan(u, 0, 26, 'io', 1.7), P = 'alaskaDusk';
      k_sky(P, t, { h: 240 }); k_clouds(t, { preset: P, y0: 70, y1: 160, cam, n: 5 });
      k_birds(t, { y: 120, x: 20, speed: 12, cam, n: 7, col: NI[2] });
      k_mountains(P, t, { y: 236, cam, base: 360 });
      k_haze(228, 262, '#c9b4d4', 0.55, { t, cam, profile: 'bottom' });
      k_hills(P, t, { y: 296, amp: 24, trees: 0.55, cam, haze: 0.18, seed: 4, snowy: 5, par: 0.6, base: 400 });
      kd_ground(322, [NE[2], NE[1], '#7a8fb8'], { cam, hi: NE[4], drift: NE[3] });
      for (const [x, h] of [[24, 70], [250, 84], [210, 52]]) kd_spruce(x - cam * 1.1, 372 + (h > 60 ? 18 : 0), h, GR[0], GR[2], NE[3]);
      k_snow(t, { cam, wind: 9, gust: { t0: T(0) + 0.5, t1: T(0) + 1.3, push: 42 } });
      k_vignetteWarm(0.45, { cold: true });
    },
    ev: [[T(0) + 0.5, 'wind', 1]],
  });
  // 2 · Aurore : nuit profonde, étoiles, rideaux verts et cyan, lac gelé qui reflète
  shot('kd_aurore', T(1), {
    draw(u, t) {
      const cam = k_pan(u, 0, 18, 'io', 1.7), P = 'alaskaNight';
      k_sky(P, t, { h: 250, stars: 150 });
      k_aurora(t, { y: 150, hmax: 130, cam, curtains: 3 });
      k_mountains(P, t, { y: 262, cam, layers: 3, base: 330 });
      k_hills(P, t, { y: 318, amp: 20, trees: 0.6, cam, haze: 0.1, seed: 9, snowy: 4, par: 0.6, base: 330 });
      k_pond(332, 440, { preset: P, axis: 250, k: 0.8, calm: 0.7, t, cam, ripple: 0.7 });
      kd_ground(436, [NI[5], NI[4], NI[3]], { cam, hi: NI[7], drift: NI[5], seed: 8 });
      k_glints(t, { y0: 440, y1: 476, n: 24, cam, col2: NI[8] });
      kd_spruce(40 - cam * 1.1, 470, 80, NI[0], NI[3], null); kd_spruce(236 - cam * 1.1, 480, 96, NI[0], NI[3], null);
      k_vignetteWarm(0.5, { cold: true });
    },
  });
  // 3 · Matin de printemps : brume, rayons, pollen, ruisseau de fonte, papillons
  shot('kd_printemps', T(2), {
    draw(u, t) {
      const cam = k_pan(u, 0, -24, 'io', 1.7), P = 'alaskaSpring', L1 = T(2);
      k_sky(P, t, { h: 244 }); k_clouds(t, { preset: P, y0: 30, y1: 140, cam, n: 5, speed: 4 });
      k_mountains(P, t, { y: 240, cam, snow: 0.8, base: 340 });
      k_haze(222, 270, '#e4eef8', 0.6, { t, cam, profile: 'bottom' });
      k_hills(P, t, { y: 292, amp: 26, trees: 0.6, cam, haze: 0.25, seed: 5, par: 0.6, base: 380 });
      kd_ground(318, [LM[3], LM[2], GR[2]], { cam, hi: LM[5], drift: LM[4], seed: 2 });
      k_stream(t, { preset: P, cam, path: [[150, 320, 8], [158, 360, 15], [128, 405, 26], [150, 445, 40], [132, 490, 56]] });
      k_rays(240 - cam * 0.04, -20, t, { angle: 1.95, spread: 0.9, len: 420, strength: 0.34, n: 8, col: WH[2], col2: YE[3], cam });
      k_pollen(t, { n: 46, y0: 90, y1: 400, cam, beam: { x: 240, y: -20, angle: 1.95, spread: 1.1, len: 520 } });
      k_butterfly(70 - cam * 1.0, 300 + 8 * Math.sin(u * 3), t, { col: YE[2], col2: AM[6], flutter: 3 });
      k_butterfly(190 - cam * 1.0, 340, t, { col: WH[3], col2: CY[3], phase: 2, s: 1 });
      for (let i = 0; i < 16; i++) { const x = (i * 19 + 8 - cam * 1.1), h = 6 + (i * 7) % 10; kd_blade(x, 480, h + 14, Math.round(5 * k_wind(t, x, i)), LM[1]); kd_blade(x + 3, 480, h + 8, Math.round(4 * k_wind(t, x, i)), GR[1]); }
    },
    ev: [[T(2) + 0.2, 'thaw', 1.5], [T(2) + 0.4, 'bird', 1]],
  });
  // 4 · Désert au coucher du soleil : mesas, dunes, chaleur qui tremble, poussière dorée, vautour, pas de poussière
  shot('kd_desert', T(3), {
    draw(u, t) {
      const cam = k_pan(u, 0, 30, 'io', 1.7), P = 'desertDusk', sp = k_sunPos(P, { h: 236 });
      k_sky(P, t, { h: 236 }); k_sun(sp[0], sp[1] - 4, sp[2], { t, cam }); k_clouds(t, { preset: P, y0: 50, y1: 150, cam, n: 5 });
      k_bird(60 - cam * 0.3, 118, t, { kind: 'soar', dir: -1, s: 1, col: DU[0], col2: DU[1], rim: AM[8] });
      k_mesas(P, t, { y: 244, cam, base: 360 });
      k_dunes(P, t, { y: 300, cam, base: 420 });
      k_heatShimmer(246, 330, t, { amp: 1.7, profile: 'ground' });
      kd_ground(352, [OC[3], OC[2], DU[2]], { cam, hi: AM[8], drift: OC[4], seed: 5 });
      k_dust(t, { n: 60, cam, y0: 150, y1: 420, beam: { x: sp[0], y: sp[1], angle: Math.PI * 0.55, spread: 2.2, len: 360 } });
      k_dustKick(150 - cam, 420, T(3) + 0.35, t, { col: 'sand', dir: 1, size: 1.3 });
      for (const [x, h] of [[24, 40], [250, 28]]) { R(x - 2 - cam * 1.2, 480 - h, 5, h, '#05040f'); R(x - 8 - cam * 1.2, 480 - h * 0.7, 4, 3, '#05040f'); R(x - 8 - cam * 1.2, 480 - h * 0.7 - 8, 3, 9, '#05040f'); }
      k_vignetteWarm(0.5);
    },
    ev: [[T(3) + 0.35, 'step', 1]],
  });
  // 5 · Savane à l'aube : horizon à baobab et acacias, brume dorée, rayons, vol d'oiseaux, insectes
  shot('kd_savane', T(4), {
    draw(u, t) {
      const cam = k_pan(u, 0, -26, 'io', 1.7), P = 'savannaDawn', sp = k_sunPos(P, { h: 256 });
      k_sky(P, t, { h: 256 }); k_sun(sp[0], sp[1], sp[2], { t, cam }); k_clouds(t, { preset: P, y0: 50, y1: 160, cam, n: 5 });
      k_birds(t, { y: 132, x: 40, speed: 16, cam, n: 9, col: DU[1], size: 1 });
      k_horizon(P, t, { y: 258, cam, base: 360 });
      k_haze(240, 300, '#f6b6a8', 0.6, { t, cam, profile: 'mid' });
      kd_ground(318, [AM[5], AM[3], OC[1]], { cam, hi: AM[8], drift: AM[6], seed: 6 });
      k_haze(318, 380, '#ffc880', 0.28, { t, cam, profile: 'top', seed: 9 });
      k_rays(sp[0] - cam * 0.04, sp[1], t, { angle: Math.PI * 0.55, spread: 1.6, len: 380, strength: 0.3, n: 10, col: AM[9], cam });
      k_insects(t, { cx: 120, cy: 330, r: 46, n: 22, cam });
      k_dust(t, { n: 36, cam, y0: 200, y1: 440, beam: { x: sp[0], y: sp[1], angle: Math.PI * 0.55, spread: 2, len: 360 } });
      for (let i = 0; i < 26; i++) { const x = (i * 11 + 3 - cam * 1.2), h = 10 + (i * 13) % 22; kd_blade(x, 482, h + 12, Math.round(6 * k_wind(t, x, i * 0.7)), DU[0]); kd_blade(x + 2, 482, h + 4, Math.round(5 * k_wind(t, x, i * 0.7)), '#4a1a3a'); }
    },
  });
  // 6 · Bloc de glace : sujet dessiné avant, voile de glace par-dessus, fissures qui progressent, givre, éclats
  shot('kd_glace', T(5), {
    draw(u, t) {
      const P = 'alaskaDusk', cam = 0;
      k_sky(P, t, { h: 250 }); k_mountains(P, t, { y: 252, cam, layers: 3, base: 330 });
      kd_ground(318, [NE[2], NE[1], '#6a7ca8'], { hi: NE[4], drift: NE[3] });
      for (let i = 0; i < 20; i++) ell(20 + i * 13, 440 + (i % 3) * 8, 16, 3, NE[3]);
      const bx = 52, by = 170, bw = 168, bh = 132;
      kd_frog(bx + 82, by + 50, 2);                         // le sujet d'abord
      k_iceBlock(bx, by, bw, bh, { t, preset: P, crack: k_pan(u, 0.04, 1, 'io', 1.7), frost: 0.8, warm: prog(u, 1.0, 1.4), seed: 5 });
      k_glints(t, { y0: 330, y1: 470, n: 18 });
      k_snow(t, { wind: 5, density: 0.8, par: [0.3, 0.6, 1] });
    },
    ev: [[T(5) + 0.1, 'crack', 0.4], [T(5) + 0.8, 'crack', 0.7], [T(5) + 1.3, 'crack', 1]],
  });
  // 7 · Fonte : neige qui recule, gouttes, flaque et éclaboussures, mare
  shot('kd_fonte', T(6), {
    draw(u, t) {
      const P = 'alaskaSpring', t0 = T(6);
      k_sky(P, t, { h: 230 }); k_clouds(t, { preset: P, y0: 40, y1: 120, n: 4, speed: 5 });
      k_mountains(P, t, { y: 226, layers: 3, base: 300, snow: 0.7 });
      k_haze(210, 250, '#e4eef8', 0.5, { t, profile: 'bottom' });
      kd_ground(268, [WO[3], WO[2], WO[1]], { hi: WO[5], drift: WO[4], seed: 4 });
      k_meltEdge(0, 268, LW, 372, k_pan(u, 0.18, 0.62, 'io', 1.7), { t, from: 'bottom', light: -1 });
      R(150, 268, 70, 2, NE[4]); for (let i = 0; i < 8; i++) { const x = 152 + i * 8; poly([[x, 270], [x + 4, 270], [x + 2, 280 + (i * 5) % 10]], CY[4]); px(x + 1, 271, WH[3]); }
      k_drips(150, 281, t, { n: 4, spread: 36, fall: 150, floorY: 420, period: 1.2, seed: 3, col: CY[3] });
      k_puddle(130, 418, 40, 14, t, { preset: P, drips: [t0 + 0.25, t0 + 0.9, t0 + 1.4], axis: 230, dropX: 8 });
      k_splash(188, 440, t0 + 0.55, t, { size: 1.1 });
      k_glints(t, { y0: 280, y1: 360, n: 14, col2: CY[4] });
    },
    ev: [[T(6) + 0.25, 'drip', 0.5], [T(6) + 0.9, 'drip', 0.7]],
  });
  // 8 · Nuit : lune, nuages sombres, lucioles, feuilles, oiseau, souffle
  shot('kd_nuit', T(7), {
    draw(u, t) {
      const cam = k_pan(u, 0, 22, 'io', 2), P = 'alaskaNight';
      k_sky(P, t, { h: 270, stars: 80 }); k_moon(190, 80, 15, { phase: 0.42, cam }); k_clouds(t, { preset: P, y0: 90, y1: 170, cam, n: 4, speed: 4 });
      k_mountains(P, t, { y: 270, cam, layers: 3, base: 340 });
      k_hills(P, t, { y: 318, amp: 22, trees: 0.7, treeH: 14, cam, haze: 0.2, seed: 7, par: 0.6, base: 360 });
      kd_ground(340, [NI[4], NI[3], NI[2]], { cam, hi: NI[7], drift: NI[5], seed: 3 });
      k_bird(20 + u * 90 - cam, 150 - u * 20, t, { kind: 'small', dir: 1, col: NI[0], col2: NI[1], rim: NI[8] });
      k_fireflies(t, { n: 16, y0: 300, y1: 440, cam, par: 1 });
      k_leaves(t, { n: 10, cam, y0: 150, y1: 440, cols: [OC[3], AM[6], OC[2], LM[3]] });
      k_breath(150, 380, t, { dir: 1, period: 1.4, col: [NI[9], NI[8], NI[7]] });
      kd_spruce(36 - cam * 1.1, 480, 110, NI[0], NI[3], null);
      k_vignetteWarm(0.5, { cold: true });
    },
  });
}
