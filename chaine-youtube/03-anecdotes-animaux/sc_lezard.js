'use strict';
/* ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════
   sc_lezard.js — segment MEXIQUE (lézard à cornes de Sonora), 7 plans calés sur la voix (préfixe lz_)
     l1_desert   large : désert de Sonora au coucher du soleil, saguaros, mesas, boule d'herbe ; le lézard à peine visible,        « Au Mexique, certains lézards à »
                 viseur qui se referme sur lui ; case 2/3 + « 2/3 MEXIQUE »
     l1_lezard   gros plan : le lézard camouflé sur le gravier, marche par à-coups, cligne ; « LÉZARD À CORNES » ; « !? »          « cornes possèdent une arme complètement improbable. »
     l2_menace   le coyote arrive (trot, traque, flair) ; le lézard s'aplatit puis se gonfle ; « DERNIER RECOURS »                 « Lorsqu'ils sont menacés, »
     l2_jet      RALENTI : le sinus de l'œil gonfle dès « ils », le jet part 0,5 s avant « yeux » et frappe le museau SUR « yeux » ; « SANG DES SINUS » « ils peuvent projeter du sang directement depuis leurs yeux ! »
     l3_metre    la règle (1 m = 520 px, plus large que le cadre) se déroule ; le lézard (≈ 80 px) lance, la caméra SUIT le jet jusqu'à « 1 M » ;   « Ce jet peut atteindre presque un mètre ! »
                 impact sur « mètre » ; « JUSQU'À ≈ 1 M »
     l4_gout     gros plan sur le coyote : la grimace MONTE (lèche, s'étonne, coup de tête sur « goût », langue sur « particulièrement ») ; « BEURK »                                « Et le plus fou ? Ce sang a un goût particulièrement désagréable »
     l4_repart   le coyote file au loin, le lézard se dégonfle et repart à pas comptés ; « CIBLE : COYOTES, RENARDS, CHIENS » ; case 2/3 cochée   « pour certains de leurs prédateurs ! »
   TOUT est calé sur wt() / wt1() (ancres lz_A, remplies par lz_anchors) : les coupes tombent 0,10 s avant un début de mot, et les mouvements d'un plan
   sont exprimés en fractions de sa durée ou relativement aux ancres de mots (jamais en secondes absolues). La caméra des plans d'action (l2, l4) est FIXE
   (la parallaxe y ferait glisser le sol sous des animaux immobiles) ; elle bouge dans l1 et l3, où le sol et les sujets partagent la même abscisse monde − cam.
   Brume basse : lz_haze (bruit précalculé dans INITS, remplace k_haze qui coûtait ≈ 45 ms par image). L1 : la coupe vers l1_lezard tombe 0,10 s avant « à ».
   Sprites : sc_lezard_sprites.js (lz_lizard, lz_coyote, lz_gait, lz_cGait, lz_jet, lz_splat, lz_ruler, lz_rulerText). Décor : kit.js, flore.js.
   ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════ */

const LZ_E = 'desertDusk';

// ───────────── ancres de la voix (instants ABSOLUS) ─────────────
const lz_A = {};
function lz_anchors() {
  const S = SEG.lez;
  Object.assign(lz_A, {
    t0: S.t0, t1: S.t1,
    mex: wt('l1', 'Mexique'), cert1: wt('l1', 'certains'), lez: wt('l1', 'lézards'), aa: wt('l1', 'à'), cornes: wt('l1', 'cornes'), poss: wt('l1', 'possèdent'), arme: wt('l1', 'arme'), compl: wt('l1', 'complètement'), impro: wt('l1', 'improbable'),
    lors: wt('l2', "Lorsqu'ils"), mena: wt('l2', 'menacés'), ils: wt('l2', 'ils'), peuv: wt('l2', 'peuvent'), proj: wt('l2', 'projeter'), sang: wt('l2', 'sang'), dir: wt('l2', 'directement'),
    dep: wt('l2', 'depuis'), leurs: wt('l2', 'leurs'), yeux: wt('l2', 'yeux'),
    ce3: wt('l3', 'Ce'), att: wt('l3', 'atteindre'), pres: wt('l3', 'presque'), metre: wt('l3', 'mètre'), metre1: wt1('l3', 'mètre'),
    et: wt('l4', 'Et'), fou: wt('l4', 'fou'), ce4: wt('l4', 'Ce'), gout: wt('l4', 'goût'), part: wt('l4', 'particulièrement'), desag: wt('l4', 'désagréable'),
    cert: wt('l4', 'certains'), pred: wt('l4', 'prédateurs'), pred1: wt1('l4', 'prédateurs'),
  });
  return lz_A;
}
const lz_memo = {};
function lz_once(k, f) { return k in lz_memo ? lz_memo[k] : (lz_memo[k] = f()); }
const lz_tag = (x, y, s, style, u, a, speed = 55) => u < a ? 0 : tagBox(x, y, s, style, Math.ceil((u - a) * speed));

// ───────────── brume basse : même rendu que k_haze (profil 'top', graine 7), mais le bruit est PRÉCALCULÉ une fois (INITS) ─────────────
// k_haze rappelle 10 800 fois k_n2 à chaque image (≈ 45 ms) ; le bruit ne dépend que de l'abscisse monde (x + cam·0,5 − 5·t) arrondie au pixel et de la ligne y : une table suffit.
const LZ_HZ = { y0: 252, rows: 64, xmin: -260, xn: 700, seed: 7, F: null };      // lignes 252 à 316 (horizons 262, 288, 300), colonnes −260 à 440 (t de 24 à 45 s, cam jusqu'à 280)
function lz_hazeInit() {
  const Z = LZ_HZ; Z.F = new Float32Array(Z.rows * Z.xn);
  for (let r = 0; r < Z.rows; r++) for (let i = 0; i < Z.xn; i++) {
    const wx = (i + Z.xmin) * 0.011, y = Z.y0 + r;
    Z.F[r * Z.xn + i] = k_n2(wx, y * 0.06, Z.seed) * 0.6 + k_n2(wx * 2.7 + 5, y * 0.17, Z.seed + 2) * 0.4;
  }
}
function lz_haze(y0, y1, color, alpha, t, cam) {
  const Z = LZ_HZ; if (!Z.F) lz_hazeInit();
  y0 = Math.max(Z.y0, Math.round(y0)); y1 = Math.min(Z.y0 + Z.rows, Math.round(y1)); const H = y1 - y0; if (H <= 0 || alpha <= 0) return;
  const b = k_tmp('haze', LW, H), c = k_u32(color), off = Math.round(cam * 0.5 - 5 * t) - Z.xmin;
  for (let y = 0; y < H; y++) {
    const pr = clamp(Math.pow(1 - y / Math.max(1, H - 1), 1.3)), row = (y0 + y - Z.y0) * Z.xn + off;
    for (let x = 0; x < LW; x++) {
      const n = Z.F[row + x], d = alpha * pr * (0.3 + 0.7 * clamp((n - 0.25) * 1.9));
      if (BAYER[(((y0 + y) & 3) << 2) | (x & 3)] < d) b.d[y * LW + x] = c;
    }
  }
  k_blit(b, 0, y0);
}

// ───────────── décor commun ─────────────
// ciel, soleil, nuages, mesas, dunes (k_backdrop), vautour, sable (fl_sand), air qui tremble. H : ligne d'horizon (CONSTANTE du plan : un cache par valeur).
function lz_bg(t, cam, o = {}) {
  const H = o.H ?? 276;
  const b = k_backdrop(LZ_E, t, { horizon: H, cam, base: H + 70, seed: o.seed ?? 1, clouds: o.clouds ?? 4 });
  if (o.vulture !== false) { const v = o.vulture || [-40, 14]; k_bird(v[0] + t * v[1] - 0 * cam, H - 150 + 10 * Math.sin(t * 0.35), t, { kind: 'soar', dir: 1, s: 0.9, col: DU[0], col2: DU[1], rim: AM[8], cam, par: 0.3 }); }
  fl_sand(H, LH, { env: LZ_E, seed: o.sand ?? 5, cam, t, pebbles: o.pebbles ?? 46 });
  lz_haze(H - 6, H + 14, AM[6], 0.32, t, cam);
  k_heatShimmer(H - 34, H + 26, t, { amp: 1.5, profile: 'ground' });
  return b;
}
// lumière rasante, poussière dorée, vignette chaude : toujours en dernier
function lz_light(t, b, cam, o = {}) {
  if (b.sun) k_rays(b.sun[0] - cam * 0.04, b.sun[1], t, { angle: Math.PI * 0.55, spread: 1.6, len: 380, strength: o.rays ?? 0.3, n: 8, col: AM[9], col2: YE[3], cam });
  k_dust(t, { n: o.dust ?? 46, y0: 150, y1: 440, cam, par: 0.8, beam: b.sun ? { x: b.sun[0], y: b.sun[1], angle: Math.PI * 0.55, spread: 2.2, len: 360 } : undefined });
  k_vignetteWarm(0.45);
}
// les deux cases du bandeau de carnet (allumée dès le premier plan, apparition animée seulement dans l1_desert)
function lz_hud(u, a = -1) {
  if (a < 0) { hudTracker(1, 1, 1); hudLieu(1); return; }
  hudTracker(1, 1, prog(u, a, a + 0.5)); if (u > a + 0.3) hudLieu(1, Math.ceil(prog(u, a + 0.3, a + 0.75) * 12));
}

// ═══════════════════════════ l1_desert : le désert de Sonora, large ═══════════════════════════
const LZ_L1 = { x: 152, y: 346, s: 0.42, t0: 0.22 };                   // le lézard dans le grand plan (monde) ; t0 : début de son petit trottinement (s depuis le début du plan)
const lz_l1x = u => LZ_L1.x + lz_gait(u, { t0: LZ_L1.t0 }).x * LZ_L1.s;   // abscisse monde du lézard (il avance par à-coups)
function lz_dWide(u, t, sh) {
  lz_anchors();
  const cam = k_pan(u, 0, 14, 'io', 1.6), E = LZ_E, H = 300;
  const b = lz_bg(t, cam, { H, vulture: [-30, 12] });
  // plan moyen : saguaros, agaves, cailloux, buissons secs
  fl_saguaro(t, { x: 214, y: 322, h: 66, arms: 2, env: E, depth: 0.6, seed: 5, cam });
  fl_saguaro(t, { x: 90, y: 316, h: 44, arms: 1, env: E, depth: 0.72, seed: 2, cam });
  fl_cholla(t, { x: 30, y: 330, h: 26, env: E, depth: 0.6, seed: 4, cam });
  fl_agave(t, { x: 124, y: 332, h: 14, env: E, depth: 0.55, seed: 2, cam });
  fl_dryShrub(t, { x: 190, y: 350, h: 18, env: E, depth: 0.5, seed: 3, cam });
  fl_desertRock(262 - cam * 0.3, 342, 28, 14, 'boulder', 2, { env: E, depth: 0.4 });
  // le lézard : posé, aplati, camouflé ; il cligne
  const g1 = lz_gait(u, { t0: LZ_L1.t0 });
  lz_lizard(lz_l1x(u) - cam, LZ_L1.y, LZ_L1.s, t, { pose: 'walk', ph: g1.ph, go: g1.go, pre: g1.pre, camo: 0.78, shadow: 0.6, rim: 0.5, seed: 3 });
  fl_tumbleweed(236 - u * 100, 396, t, { env: E, r: 11, hop: 7, cam, dir: -1 });
  fl_dryShrub(t, { x: 136, y: 400, h: 24, env: E, depth: 0.25, seed: 1, cam });
  // premier plan
  fl_saguaro(t, { x: 30, y: 440, h: 206, arms: 3, env: E, depth: 0.1, seed: 3, cam, bloom: 0.8 });
  fl_ocotillo(t, { x: 250, y: 472, h: 112, env: E, depth: 0, seed: 3, cam, bloom: 0.9 });
  fl_agave(t, { x: 142, y: 476, h: 38, env: E, depth: 0, seed: 6, cam, stalk: 0 });
  lz_light(t, b, cam);
}
function lz_uWide(u, t, sh) {
  lz_hud(u, 0.12);
  const k = prog(u, lz_A.mex - sh.t0 + 0.12, sh.t1 - sh.t0 - 0.02);          // viseur du naturaliste : quatre coins qui se referment sur le lézard (dès « Mexique », il est complètement refermé à la coupe)
  if (k > 0) {
    const cam = k_pan(u, 0, 14, 'io', 1.6), cx = Math.round(lz_l1x(u) - cam), cy = LZ_L1.y - 6, half = Math.round(lerp(58, 25, eo(k))), len = 8, col = AM[9];
    for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const x = cx + sx * half, y = cy + sy * (half * 0.62), x0 = sx > 0 ? x - len : x, y0 = sy > 0 ? y - len : y;
      R(x0 - 1, y - 1, len + 3, 4, NI[0]); R(x - 1, y0 - 1, 4, len + 3, NI[0]);                  // contour sombre
      R(x0, y, len + 1, 2, col); R(x, y0, 2, len + 1, col);
    }
  }
}

// ═══════════════════════════ l1_lezard : gros plan sur le lézard camouflé ═══════════════════════════
const LZ_Z = { s: 2.0, y: 350, t0: 0.4 };
function lz_zState(u) {                                                    // marche par à-coups : position monde et caméra (la caméra suit aux trois quarts)
  const g = lz_gait(u, { t0: LZ_Z.t0 }), dx = g.x * LZ_Z.s;
  return { g, wx: 112 + dx, cam: 0.78 * dx };
}
function lz_dZoom(u, t, sh) {
  lz_anchors();
  const z = lz_zState(u), cam = z.cam, E = LZ_E, H = 262;
  const b = lz_bg(t, cam, { H, vulture: false, pebbles: 30, sand: 8, seed: 2 });
  // gravier : cailloux de toutes tailles, plus gros devant
  for (const [x, y, w, hh, sd] of [[18, 292, 9, 5, 1], [70, 300, 13, 7, 2], [226, 296, 12, 6, 3], [168, 288, 8, 4, 4], [250, 322, 16, 8, 5], [24, 330, 18, 9, 6], [196, 372, 24, 11, 7], [60, 396, 30, 14, 8], [130, 428, 38, 17, 9], [246, 430, 34, 15, 10], [14, 452, 40, 17, 11]])
    fl_rock(x, y, w, hh, 'pebble', sd, { env: E, mat: 'sand', depth: 0.1, cam });
  fl_dryShrub(t, { x: 238, y: 306, h: 20, env: E, depth: 0.5, seed: 3, cam });
  const camo = lerp(0.82, 0.38, prog(t, lz_A.poss, lz_A.impro));
  const liz = lz_lizard(z.wx - cam, LZ_Z.y, LZ_Z.s, t, { pose: 'walk', ph: z.g.ph, go: z.g.go, pre: z.g.pre, camo, shadow: 0.7, seed: 3 });
  lz_zLiz = liz;
  // l'éclat sur les cornes quand la voix dit « improbable »
  const ks = prog(t, lz_A.impro - 0.05, lz_A.impro + 0.5);
  if (ks > 0 && ks < 1) { const c = liz.crown, r = Math.round(2 + 9 * Math.sin(ks * Math.PI)), cx = Math.round(c[0]), cy = Math.round(c[1]); R(cx - r, cy, 2 * r + 1, 1, WH[3]); R(cx, cy - r, 1, 2 * r + 1, WH[3]); px(cx, cy, WH[3]); R(cx - 1, cy - 1, 3, 3, AM[10]); px(cx, cy, WH[3]); }
  fl_rock(100 - cam, 480, 70, 30, 'flat', 12, { env: E, mat: 'sand', depth: 0.0, cam: 0 });
  lz_light(t, b, cam, { dust: 56, rays: 0.34 });
}
let lz_zLiz = null;
function lz_uZoom(u, t, sh) {
  lz_hud(u);
  const a = lz_A, cn = a.cornes - sh.t0;
  lz_tag(8, 40, 'LÉZARD À CORNES', 'white', u, cn - 0.02);
  const ki = u - (a.impro - sh.t0);
  if (ki > -0.02 && lz_zLiz) {                                             // « !? » au-dessus de la tête, qui rebondit
    const h = lz_zLiz.head, k = eob(clamp(ki / 0.2)), jig = ki > 0.25 ? Math.round(Math.sin((ki - 0.25) * 22)) : 0;
    ptextC('!?', Math.round(h[0]) + 4 + jig, Math.round(h[1]) - 60 - Math.round(5 * k), AM[9], 4, NI[0]);
  }
}

// ═══════════════════════════ l2_menace et l2_jet : le coyote, le lézard ═══════════════════════════
const LZ_GY = 350;                                                         // sol des plans d'action (pieds)
const LZ_H2 = 288;                                                         // horizon des plans d'action                                                         // sol des plans d'action (pieds)
const LZ_LIZ = { x: 68, s: 1.25 };                                          // le lézard
const LZ_COY = { x: 224, y: LZ_GY, s: 0.95 };                              // le coyote à l'arrêt, au flair
// décor commun de l2_menace et l2_jet (même lieu, même sol) : fond, plan moyen, puis premier plan
function lz_sceneBack(t, vulture) {
  const E = LZ_E, b = lz_bg(t, 0, { H: LZ_H2, vulture, seed: 3 });
  fl_saguaro(t, { x: 150, y: 308, h: 56, arms: 2, env: E, depth: 0.55, seed: 4 });
  fl_agave(t, { x: 236, y: 314, h: 14, env: E, depth: 0.5, seed: 5 });
  fl_dryShrub(t, { x: 104, y: 322, h: 16, env: E, depth: 0.5, seed: 2 });
  return b;
}
function lz_sceneFront(t) {
  const E = LZ_E;
  fl_boulders(30, 470, 90, { env: E, mat: 'sand', seed: 3, depth: 0.03, n: 3 });
  fl_prickly(t, { x: 236, y: 476, h: 66, env: E, depth: 0, seed: 2, fruit: 0.8 });
  fl_agave(t, { x: 150, y: 482, h: 26, env: E, depth: 0, seed: 7, stalk: 0 });
}
// trajet du coyote : trot → traque → flair ; l'échelle croît avec l'approche (perspective : il se rapproche de la caméra) ; abscisse = intégrale de D·s dφ (les pieds ne glissent pas)
function lz_coyPath(u, d) {
  const tr = LZ_CPOSE.trot, st = LZ_CPOSE.stalk, a = 0.5 * d, b = 0.28 * d, s0 = 0.6, s1 = 0.78, s2 = LZ_COY.s;
  const phA = tr.freq * a, phB = st.freq * b, dispA = tr.D * phA * (s0 + s1) / 2, dispB = st.D * phB * (s1 + s2) / 2, x0 = LZ_COY.x + dispA + dispB;
  const yOf = s => LZ_COY.y - (LZ_COY.s - s) * 80;
  if (u < a) { const p = u / a, ph = phA * p, s = lerp(s0, s1, p), x = x0 - tr.D * (s0 * ph + (s1 - s0) * ph * ph / (2 * phA)); return { pose: 'trot', ph, x, s, y: yOf(s), hd: 0 }; }
  if (u < a + b) { const p = (u - a) / b, ph = phB * p, s = lerp(s1, s2, p), x = x0 - dispA - st.D * (s1 * ph + (s2 - s1) * ph * ph / (2 * phB)); return { pose: 'stalk', ph, x, s, y: yOf(s), hd: 0.8 }; }
  return { pose: 'sniff', ph: 0, x: LZ_COY.x, s: s2, y: yOf(s2), hd: 0.35 + 0.5 * (1 - sm(clamp((u - a - b) / (0.12 * d)))) };
}
function lz_dMenace(u, t, sh) {
  lz_anchors();
  const d = sh.t1 - sh.t0;
  const b = lz_sceneBack(t, [20, 9]);
  // le lézard : se fige, s'aplatit (camouflage), puis se gonfle ; le sinus de l'œil commence à enfler
  const f1 = prog(u, 0.16 * d, 0.34 * d), f2 = prog(u, 0.58 * d, 0.9 * d);
  const pose = f2 > 0 ? 'flat' : 'rest', pose2 = f2 > 0 ? 'puff' : 'flat', mix = f2 > 0 ? sm(f2) : sm(f1);
  const bulge = 0.5 * prog(u, 0.82 * d, 1.0 * d);
  lz_lizard(LZ_LIZ.x, LZ_GY + 3, LZ_LIZ.s, t, { pose, pose2, mix, camo: 0.5 * sm(f1) * (1 - sm(f2)), bulge, rim: 1, seed: 3 });
  // le coyote
  const c = lz_coyPath(u, d);
  lz_coyote(c.x, c.y, c.s, t, { pose: c.pose, ph: c.ph, flip: true, headDown: c.hd, speed: c.pose === 'sniff' ? 0 : 1, seed: 5 });
  if (u < 0.5 * d) { const ph = c.ph; for (const q of [0.25, 0.75]) { const k = Math.floor(ph - q) + q; k_dustKick(c.x - 18 * c.s, c.y, sh.t0 + k / LZ_CPOSE.trot.freq, t, { col: 'sand', dir: 1, size: 0.55, n: 5 }); } }
  lz_sceneFront(t);
  lz_light(t, b, 0, { dust: 38 });
}
function lz_uMenace(u, t, sh) {
  lz_hud(u);
  lz_tag(8, 40, 'DERNIER RECOURS', 'red', u, lz_A.mena - sh.t0 - 0.02);
}
// jet : mêmes acteurs, même sol ; la caméra reste fixe
// le jet part 0,5 s avant « yeux » et touche le museau SUR « yeux » ; les yeux gonflent depuis « ils » (le sinus se remplit, plus vite à mesure que l'on approche)
const lz_T0j = () => lz_A.yeux - 0.5;
function lz_jlz(t) {                                                       // options du lézard pendant le jet (fonction du temps du film : sert aussi au départ du jet)
  const a = lz_A, T0 = lz_T0j(), k = prog(t, T0 - 0.3, T0), thr = 0.5 + 0.5 * Math.sin((t - a.t0) * (10 + 10 * prog(t, a.ils, T0)));
  const after = prog(t, a.yeux + 0.1, a.yeux + 0.7);
  return { pose: 'puff', pose2: 'squirt', mix: sm(k), puff: 0.55 * sm(k) * (1 - 0.5 * after), bulge: lerp(0.5, 1, prog(t, a.ils - 0.1, T0)) * (t < T0 ? 0.88 + 0.12 * thr : 1 - 0.45 * after), rim: 1, seed: 3 };
}
function lz_jetGeom() {                                                    // départ (coin de l'œil), cible (museau), durées : calculés une fois (ne dépendent que de la mise en page et de la voix)
  return lz_once('jetGeom', () => {
    const a = lz_anchors(), T0 = lz_T0j(), hitT = a.yeux, Tr = 0.34, tau = Tr / (hitT - T0);
    const liz = lz_lizard(LZ_LIZ.x, LZ_GY + 3, LZ_LIZ.s, T0, lz_jlz(T0)), coy = lz_coyote(LZ_COY.x, LZ_COY.y, LZ_COY.s, T0, { pose: 'sniff', flip: true, headDown: 0.35, seed: 5 });
    const A = liz.jet.slice(), B = coy.muzzle.slice(), v = lz_jetVel(A[0], A[1], B[0], B[1], Tr);
    return { T0, hitT, Tr, tau, A, B, v };
  });
}
function lz_dJet(u, t, sh) {
  const G = lz_jetGeom(), a = lz_A;
  const b = lz_sceneBack(t, [60, 7]);
  lz_lizard(LZ_LIZ.x, LZ_GY + 3, LZ_LIZ.s, t, lz_jlz(t));
  const ant = G.hitT - 0.07 / G.tau;
  const coy = lz_coyote(LZ_COY.x, LZ_COY.y, LZ_COY.s, t, { pose: t >= ant ? 'hit' : 'sniff', flip: true, headDown: 0.35, t0: G.hitT, tau: G.tau, seed: 5 });
  lz_jet(G.A[0], G.A[1], G.v[0], G.v[1], G.T0, t, { tau: G.tau, hit: G.B, dur: 0.3, seed: 9, size: 1.7 });
  lz_splat(coy.muzzle[0], coy.muzzle[1], t, { t0: G.hitT, tau: G.tau, slide: [-0.25, 1], dir: -2.7 });
  lz_sceneFront(t);
  lz_light(t, b, 0, { dust: 38 });
}
function lz_uJet(u, t, sh) {
  lz_hud(u);
  lz_tag(8, 40, "SANG DES SINUS DE L'OEIL", 'blue', u, lz_A.sang - sh.t0 - 0.04);
}

// ═══════════════════════════ l3_metre : la règle ═══════════════════════════
// 1 m = 520 px : la règle dépasse largement le cadre (270 px) ; le lézard (≈ 16 cm) fait ≈ 80 px et la caméra SUIT la tête du jet de zéro jusqu'à « 1 M »
const LZ_R = { x: 84, y: 346, w: 520, h: 11 };
const LZ_RS = 0.88;                                                        // le lézard à côté de la règle (≈ 16 cm : un grand mâle)
const LZ_RCAM = 372;                                                       // abscisse de caméra finale : « 1 M » (x = 604) tombe à 232
const LZ_RLAB = [[0, '0'], [0.25, '25'], [0.5, '50 CM'], [0.75, '75'], [1, '1 M']];
// géométrie du jet (calculée une fois) : il part 0,64 s (ralenti × 0,5) avant l'instant où la voix dit « mètre » et touche le sol à 0,95 m, SUR « mètre »
function lz_rGeom() {
  return lz_once('rGeom', () => {
    const a = lz_anchors(), R0 = LZ_R, tau = 0.5, Tr = 0.32, T0 = a.metre - Tr / tau, gy = R0.y + 1, g = lz_gOf({ pxm: R0.w });
    const e = lz_lizard(R0.x - 20, R0.y + 1, LZ_RS, T0, { pose: 'squirt', puff: 0.4, bulge: 1, seed: 3 }).jet.slice(), xHit = R0.x + R0.w * 0.95, v = lz_jetVel(e[0], e[1], xHit, gy, Tr, g);
    return { T0, tau, Tr, gy, e, v, xHit, hitT: T0 + Tr / tau };
  });
}
function lz_rCam(t, sh) {                                                  // pure fonction du temps : dérive lente, puis suit la tête du jet
  const G = lz_rGeom(), s = clamp((t - G.T0) * G.tau, 0, G.Tr), hx = G.e[0] + G.v[0] * s;
  return lerp(6 * sm(prog(t, sh.t0, G.T0)), LZ_RCAM, sm(prog(hx, G.e[0] + 90, G.xHit - 20)));
}
function lz_dRuler(u, t, sh) {
  const a = lz_anchors(), G = lz_rGeom(), cam = lz_rCam(t, sh), E = LZ_E, H = 254, R0 = LZ_R;
  const b = lz_bg(t, cam, { H, vulture: false, pebbles: 40, sand: 6, seed: 4 });
  const rv = eio(prog(u, 0.04, 0.5));                                       // le ruban se déroule vite, hors du cadre à droite
  // gravier lointain et moyen
  for (const [x, y, w, hh, sd] of [[40, 284, 10, 5, 1], [210, 290, 12, 6, 2], [330, 286, 12, 6, 3], [470, 294, 14, 7, 4], [610, 288, 10, 5, 5]]) fl_rock(x, y, w, hh, 'pebble', sd, { env: E, mat: 'sand', depth: 0.1, cam });
  fl_dryShrub(t, { x: 190, y: 296, h: 18, env: E, depth: 0.5, seed: 4, cam });
  fl_dryShrub(t, { x: 560, y: 300, h: 16, env: E, depth: 0.5, seed: 6, cam });
  // cailloux du sable autour de la règle (un par graduation, plus gros devant)
  for (const [x, y, w, hh, sd] of [[130, 370, 14, 6, 6], [300, 374, 16, 7, 7], [470, 368, 12, 5, 8], [250, 402, 26, 11, 9], [560, 404, 30, 13, 10], [120, 430, 36, 15, 11], [420, 440, 40, 17, 12], [20, 392, 20, 8, 13]]) fl_rock(x, y, w, hh, 'pebble', sd, { env: E, mat: 'sand', depth: 0.05, cam });
  const rl = lz_ruler(R0.x - cam, R0.y, R0.w, t, { reveal: rv, text: false, h: R0.h });
  // le lézard au zéro de la règle : il se gonfle (anticipation), puis lance
  const sq = prog(t, G.T0 - 0.4, G.T0 - 0.03), lizX = R0.x - 20 - cam;
  lz_lizard(lizX, R0.y + 1, LZ_RS, t, { pose: 'puff', pose2: 'squirt', mix: sm(sq), puff: 0.4 * sm(sq) * (1 - prog(t, G.T0 + 0.3, G.T0 + 1.0)), bulge: sm(sq) * (1 - 0.5 * prog(t, G.T0 + 0.3, G.T0 + 1.2)), shadow: 0.8, rim: 1, seed: 3 });
  // le jet longe la règle (gravité réelle : 1 m = 440 px), ombre portée de la tête sur le sable, éclaboussure à l'arrivée
  const jt = lz_jet(G.e[0] - cam, G.e[1], G.v[0], G.v[1], G.T0, t, { tau: G.tau, ground: G.gy, dur: 0.2, pxm: R0.w, size: 2.2, gs: 1.8, seed: 4, maxAge: 0.6 });
  if (t > G.T0 && t < G.hitT + 0.02) { L.setTransform(1, 0, 0, 1, 0, 0); L.fillStyle = 'rgba(40,16,52,0.4)'; L.fillRect(Math.round(jt.tip[0]) - 4, G.gy + 2, 9, 2); }
  lz_splat(G.xHit - cam, G.gy - 1, t, { t0: G.hitT, tau: G.tau, dir: -Math.PI / 2, slide: [0, 0], n: 22, size: 2.3, drips: 0, seed: 6 });
  fl_grassFg(t, { env: E, kind: 'dry', side: 'bottom', h: 56, n: 16, seed: 11, cam, y: LH + 14 });
  fl_boulders(-20, 478, 110, { env: E, mat: 'sand', seed: 7, depth: 0.0, n: 2, cam });
  lz_light(t, b, cam, { dust: 44 });
  return { rl, cam };
}
function lz_uRuler(u, t, sh) {
  lz_hud(u);
  const cam = lz_rCam(t, sh), rv = eio(prog(u, 0.04, 0.5));
  lz_rulerText(LZ_R.x - cam, LZ_R.y, LZ_R.w, t, { reveal: rv, ts: 2, labels: LZ_RLAB, h: LZ_R.h, hi: [1, YE[3], t >= lz_rGeom().hitT ? 1 : 0] });
  lz_tag(8, 40, "JUSQU'À ≈ 1 M", 'blue', u, lz_A.pres - sh.t0 - 0.02);
}

// ═══════════════════════════ l4_gout : le coyote fait la grimace ═══════════════════════════
const LZ_G4 = { x: 196, y: 384, s: 1.9 };
// goutte de bave rougie : se forme à (x, y) (0,14 s), tombe jusqu'au sol y1, éclabousse en quelques points
function lz_drip(x, y, y1, t0, t, o = {}) {
  const s = t - t0; if (s < 0) return;
  const form = 0.14, g = o.g ?? 1100, sz = o.size ?? 1, cx = Math.round(x);
  L.setTransform(1, 0, 0, 1, 0, 0);
  const blob = (bx, by, k) => { const rr = Math.max(1, Math.round(2.2 * sz * k)); disc(bx, by + rr, rr + 1, RD[0]); R(bx, by - 1, 1, 2, RD[0]); disc(bx, by + rr, rr, RD[3]); px(bx, by, RD[3]); px(bx - rr * 0.5, by + rr - rr * 0.5, RD[5]); px(bx + rr * 0.5, by + rr + rr * 0.5, RD[1]); };
  if (s < form) { const k = sm(s / form); R(cx, Math.round(y) - 3, 1, 3, RD[2]); blob(cx, Math.round(y), 0.5 + 0.5 * k); return; }
  const a = s - form, yy = y + 0.5 * g * a * a;
  if (yy < y1) { blob(cx, Math.round(yy), 1); return; }
  const ta = Math.sqrt(2 * (y1 - y) / g), age = a - ta;                                 // éclaboussure au sol
  if (age < 0.3) { const k = age / 0.3; for (let i = 0; i < 6; i++) { const an = Math.PI * (1 + (i + 0.5) / 6), d = 3 + 7 * eo(k) * sz; px(cx + Math.cos(an) * d, y1 + Math.sin(an) * d * 0.5 * (1 - k) * 2, k < 0.6 ? RD[4] : RD[2]); } R(cx - 2, y1, 5, 1, RD[2]); }
  else if (age < 1.6) { R(cx - 2, y1, 5, 1, RD[1]); px(cx, y1 - 1, RD[2]); }                // petite tache qui reste
}
function lz_dGout(u, t, sh) {
  lz_anchors();
  const a = lz_A, d = sh.t1 - sh.t0, E = LZ_E, H = 262, r = x => x - sh.t0;
  const b = lz_bg(t, 0, { H, vulture: [100, 6], seed: 5, sand: 9, pebbles: 30 });
  fl_rock(30, 330, 18, 8, 'pebble', 3, { env: E, mat: 'sand', depth: 0.1 });
  fl_dryShrub(t, { x: 40, y: 300, h: 18, env: E, depth: 0.55, seed: 4 });
  // la grimace MONTE avec la voix : il se lèche le museau (« fou ? »), s'étonne (« ce sang »), secoue la tête (« goût »), sort la langue (« particulièrement »), grimace à fond (« désagréable »)
  const lick = prog(u, r(a.fou) - 0.1, r(a.ce4)) * (1 - prog(u, r(a.ce4), r(a.gout) - 0.2));
  const tongue = Math.max(0.5 * lick * (0.5 + 0.5 * Math.sin(u * 13)), sm(prog(u, r(a.part) - 0.05, r(a.part) + 0.3)));
  const wrinkle = lerp(0.05, 0.4, prog(u, r(a.ce4), r(a.gout))) + 0.6 * sm(prog(u, r(a.gout), r(a.desag)));
  const eye = lerp(1, 0.55, prog(u, r(a.ce4), r(a.gout))) * (1 - 0.7 * sm(prog(u, r(a.part), r(a.desag) + 0.1)));
  const mouth = Math.max(0.2 * lick, lerp(0.12, 0.3, prog(u, r(a.ce4), r(a.gout))) + 0.32 * sm(prog(u, r(a.part) - 0.05, r(a.part) + 0.3)));
  const ush = u - r(a.gout);
  const shake = ush < 0 ? 0 : Math.max(0.2 * (1 - prog(u, r(a.desag) + 0.4, d)), (1 - sm(prog(ush, 0.35, 0.8))) * sm(clamp(ush / 0.08)));      // coup de tête sec sur « goût », puis reste secoué
  const headDown = lerp(0.1, 0.3, prog(u, r(a.gout), r(a.desag)));
  const coy = lz_coyote(LZ_G4.x, LZ_G4.y, LZ_G4.s, t, { pose: 'disgust', flip: true, mouth, tongue, wrinkle, shake, eye, headDown, seed: 5 });
  lz_g4Coy = coy;
  // le sang sur le museau : s'estompe quand la tête secoue
  const sa = 1 - prog(u, r(a.part), r(a.desag));
  if (sa > 0.02) lz_splat(coy.muzzle[0], coy.muzzle[1], t, { t0: a.leurs, tau: 1, slide: [-0.2, 1], dir: -2.7, n: 0, size: 0.9 * (0.4 + 0.6 * sa), drips: 3 });
  // gouttes de bave rougie : une par bruit de goutte (36,5 s et 37,4 s)
  for (const [tg, big] of [[a.ce4 + 0.1, 1], [a.part + 0.15, 1.4]]) lz_drip(coy.mouth[0] + 1, coy.mouth[1] + 6 + 26 * tongue * (big > 1 ? 1 : 0.3), LZ_G4.y + 6, tg, t, { size: big });
  fl_agave(t, { x: 24, y: 470, h: 30, env: E, depth: 0, seed: 6, stalk: 0 });
  lz_light(t, b, 0, { dust: 40 });
}
let lz_g4Coy = null;
function lz_uGout(u, t, sh) {
  lz_hud(u);
  const a = lz_A, r = x => x - sh.t0, kb = u - r(a.desag);
  if (kb > -0.03) {                                                         // « BEURK » au-dessus du museau (à gauche des oreilles)
    const c = lz_g4Coy && lz_g4Coy.muzzle;
    if (c) { const k = eob(clamp(kb / 0.18)), j = Math.round(Math.sin(kb * 30) * (kb < 1.2 ? 1.5 : 0.6)); ptextC('BEURK', Math.round(c[0]) + 2 + j, Math.round(c[1]) - 98 - Math.round(4 * k), RD[4], 4, NI[0]); }
  }
}

// ═══════════════════════════ l4_repart : le lézard repart à pas comptés ═══════════════════════════
const LZ_L4 = { x: 92, y: LZ_GY + 6, s: 1.45, t0: 0.55 };
function lz_dLeave(u, t, sh) {
  lz_anchors();
  const a = lz_A, d = sh.t1 - sh.t0, E = LZ_E;
  const b = lz_bg(t, 0, { H: LZ_H2, vulture: [120, -10], seed: 6, sand: 5 });
  fl_saguaro(t, { x: 232, y: 310, h: 50, arms: 1, env: E, depth: 0.6, seed: 6 });
  fl_dryShrub(t, { x: 40, y: 318, h: 14, env: E, depth: 0.5, seed: 5 });
  // le coyote file au loin vers la gauche (trot de fuite), poussière aux pieds
  const gc = lz_cGait(u, { pose: 'trotOff' }), cs = 0.5, cx = 150 - gc.x * cs, cy = 316;
  lz_coyote(cx, cy, cs, t, { pose: 'trotOff', ph: gc.ph, flip: true, shake: 0.25 * (1 - prog(u, 0.5, 1.2)), seed: 5 });
  for (const q of [0.3, 0.8]) { const k = Math.floor(gc.ph - q) + q, tk = sh.t0 + k / LZ_CPOSE.trotOff.freq; k_dustKick(150 - LZ_CPOSE.trotOff.D * k * cs + 8, cy, tk, t, { col: 'sand', dir: 1, size: 0.6, n: 5 }); }
  fl_tumbleweed(300 - u * 46, 384, t, { env: E, r: 10, hop: 6, dir: -1 });
  // le lézard : il se dégonfle, puis repart par à-coups
  const dg = prog(u, 0.05, 0.55), g = lz_gait(u, { t0: LZ_L4.t0 });
  lz_lizard(LZ_L4.x + g.x * LZ_L4.s, LZ_L4.y, LZ_L4.s, t, { pose: 'puff', pose2: 'walk', mix: sm(dg), ph: g.ph, go: g.go, pre: g.pre, bulge: 0.55 * (1 - sm(dg)), rim: 1, seed: 3 });
  fl_prickly(t, { x: 30, y: 478, h: 60, env: E, depth: 0, seed: 3, fruit: 0.8 });
  fl_boulders(236, 470, 80, { env: E, mat: 'sand', seed: 5, depth: 0.03, n: 3 });
  lz_light(t, b, 0, { dust: 40 });
}
function lz_uLeave(u, t, sh) {
  const a = lz_A, r = x => x - sh.t0, kd = u - (r(a.pred1) - 0.02);
  hudTracker(1, 1, 1); hudLieu(1);
  if (kd > 0) mark(34 + 18, 8 + 18, 'yes', clamp(kd / 0.25), 5);                  // la case 2/3 se coche
  lz_tag(8, 40, 'CIBLE : COYOTES, RENARDS, CHIENS', 'red', u, r(a.cert) - 0.02 - (sh.t0 - sh.t0), 70);
}

// ───────────── préchauffage ─────────────
const lz_fakeSh = { t0: 0, t1: 3 };
INITS.push(() => {
  lz_hazeInit(); lz_anchors();
  for (const [f, d] of [[lz_dWide, 1.4], [lz_dZoom, 2.6], [lz_dMenace, 1.8], [lz_dJet, 2.8], [lz_dRuler, 1.9], [lz_dGout, 3.6], [lz_dLeave, 2.0]]) { const sh = { t0: lz_A.t0, t1: lz_A.t0 + d }; try { f(0.6 * d, lz_A.t0 + 0.6 * d, sh); } catch (e) { } }
  clearL();
});

function buildLezard(S) {
  const a = lz_anchors();
  const B = [S.t0, a.aa - 0.1, a.lors - 0.1, a.ils - 0.1, a.ce3 - 0.1, a.et - 0.1, a.cert - 0.1];
  const j = lz_jetGeom(), G3 = lz_rGeom();
  shot('l1_desert', B[0], { draw: lz_dWide, ui: lz_uWide,
    ev: [[B[0] + 0.1, 'wind', 3], [B[0] + 0.14, 'pop'], [B[0] + 0.45, 'label'], [B[0] + 0.4, 'step'], [B[0] + 0.7, 'bird', 1], [a.lez - 0.02, 'blip'], [B[0] + 1.25, 'step']] });
  shot('l1_lezard', B[1], { draw: lz_dZoom, ui: lz_uZoom,
    ev: [[B[1] + 0.05, 'label'], [B[1] + 0.45, 'step'], [B[1] + 0.78, 'step'], [B[1] + 1.43, 'step'], [B[1] + 1.68, 'step'], [B[1] + 2.35, 'step'], [B[1] + 2.62, 'step'], [a.impro, 'reveal'], [a.impro + 0.03, 'blip']] });
  shot('l2_menace', B[2], { draw: lz_dMenace, ui: lz_uMenace,
    ev: [[B[2] + 0.05, 'wind', 2], [B[2] + 0.2, 'step'], [B[2] + 0.42, 'step'], [B[2] + 0.65, 'step'], [B[2] + 0.88, 'step'], [B[2] + 1.0, 'suspense', B[3] - B[2] - 1.0], [a.mena, 'label'], [B[3] - 0.5, 'sniff']] });
  shot('l2_jet', B[3], { draw: lz_dJet, ui: lz_uJet,
    ev: [[B[3] + 0.15, 'suspense', j.T0 - B[3] - 0.35], [j.T0 - 0.2, 'whoosh', 0.2], [j.T0, 'squirt', j.hitT - j.T0], [a.sang, 'label'], [j.hitT, 'splat'], [j.hitT + 0.02, 'yelp'], [j.hitT + 0.5, 'shake']] });
  shot('l3_metre', B[4], { draw: (u, t, sh) => { lz_dRuler(u, t, sh); }, ui: lz_uRuler,
    ev: [[B[4] + 0.1, 'ruler', 21], [G3.T0, 'squirt', G3.hitT - G3.T0], [G3.hitT, 'splat'], [a.pres - 0.02, 'label']] });
  shot('l4_gout', B[5], { draw: lz_dGout, ui: lz_uGout,
    ev: [[a.fou + 0.15, 'sniff'], [a.ce4 + 0.51, 'drip', 0.5], [a.gout, 'shake'], [a.part + 0.49, 'drip', 0.8], [a.desag - 0.03, 'label'], [a.desag, 'yelp']] });
  shot('l4_repart', B[6], { draw: lz_dLeave, ui: lz_uLeave,
    ev: [[B[6] + 0.05, 'whoosh', 0.8], [B[6] + 0.65, 'step'], [B[6] + 1.6, 'step'], [a.cert - 0.02, 'label'], [a.pred1 - 0.02, 'ding'], [B[6] + 1.2, 'bird', 2]] });
}
