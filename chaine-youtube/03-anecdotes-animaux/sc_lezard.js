'use strict';
/* ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════
   sc_lezard.js — segment Mexique (PROVISOIRE : trois plans de contrôle des sprites de sc_lezard_sprites.js, préfixe lz_)
   lz_planche  planche de 12 poses (lézard et coyote) en grille 3 × 4
   lz_cycles   marche par à-coups du lézard et trot continu du coyote
   lz_jet      jet de sang au ralenti sur le museau du coyote, puis la règle (un mètre = 200 px) et le jet à vitesse réelle
   Les vrais plans (l1_desert … l4_gout) sont écrits par l'artiste du segment : ils remplacent ces trois plans.
   ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════ */

// fond commun : sable du désert au coucher du soleil
function lz_ground(t, y0 = 0, o = {}) { fl_sand(y0, LH, { env: 'desertDusk', seed: 5, t, pebbles: 46, ...o }); }

// ── planche : 12 poses dans une grille 3 × 4 (cases de 90 × 120) ──
const LZ_CASES = [
  ['REPOS', (c, t) => lz_lizard(c[0], c[1] + 20, 0.74, t, { pose: 'rest' })],
  ['ALERTE', (c, t) => lz_lizard(c[0], c[1] + 20, 0.74, t, { pose: 'alert' })],
  ['MARCHE', (c, t) => lz_lizard(c[0] + 2, c[1] + 20, 0.74, t, { pose: 'walk', ph: 0.4 + 0.25 * Math.sin(t * 2.2), go: 1 })],
  ['APLATI', (c, t) => lz_lizard(c[0], c[1] + 20, 0.74, t, { pose: 'flat', camo: 0.5 })],
  ['GONFLÉ', (c, t) => lz_lizard(c[0], c[1] + 20, 0.74, t, { pose: 'puff' })],
  ['JET', (c, t) => lz_lizard(c[0] - 2, c[1] + 20, 0.74, t, { pose: 'squirt', bulge: 0.55 + 0.45 * Math.sin(t * 2.6) })],
  ['TROT', (c, t) => lz_coyote(c[0] - 3, c[1] + 42, 0.5, t, { pose: 'trot' })],
  ['TRAQUE', (c, t) => lz_coyote(c[0] - 3, c[1] + 42, 0.5, t, { pose: 'stalk' })],
  ['FLAIRE', (c, t) => lz_coyote(c[0] - 3, c[1] + 42, 0.5, t, { pose: 'sniff' })],
  ['SURSAUT', (c, t) => lz_coyote(c[0] - 3, c[1] + 42, 0.5, t, { pose: 'hit', hit: 0.7 + 0.3 * Math.sin(t * 3) })],
  ['BEURK', (c, t) => lz_coyote(c[0] - 3, c[1] + 42, 0.5, t, { pose: 'disgust' })],
  ['S\'ÉLOIGNE', (c, t) => lz_coyote(c[0] - 3, c[1] + 42, 0.5, t, { pose: 'trotOff', flip: true })],
];
const lz_cell = k => [(k % 3) * 90 + 45, Math.floor(k / 3) * 120 + 40];

function lz_drawPlanche(u, t) {
  vgrad(0, 0, LW, LH, [[0, '#d9a96c'], [1, '#a96d3c']]);
  lz_ground(t, 0, { pebbles: 40 });
  for (let k = 0; k < 12; k++) { const c = lz_cell(k); LZ_CASES[k][1](c, t); }
  // grille
  for (const x of [90, 180]) R(x, 0, 1, LH, NI[0]);
  for (const y of [120, 240, 360]) R(0, y, LW, 1, NI[0]);
}

// ── plan 2 : cycles de marche ──
function lz_drawCycles(u, t) {
  vgrad(0, 0, LW, 130, [[0, '#2e1a56'], [0.6, '#cf6b9a'], [1, '#ffc84a']]);
  lz_ground(t, 120);
  k_dust(t, { n: 30, y0: 160, y1: 420, cam: 0, beam: { x: 250, y: 100, angle: 2.2, spread: 1.6, len: 380 } });
  // lézard : marche par à-coups (la distance vient du même calendrier que les pattes)
  const g = lz_gait(u, { stride: 26 }), sL = 1.2;
  lz_lizard(34 + g.x * sL, 220, sL, t, { pose: 'walk', ph: g.ph, go: g.go });
  // coyote : trot continu, les pattes suivent le sol
  const gc = lz_cGait(u, { pose: 'trot' }), sC = 0.7, x = -70 + gc.x * sC;
  lz_coyote(x, 420, sC, t, { pose: 'trot', ph: gc.ph });
}

// ── plan 3 : jet, ralenti sur le museau du coyote, puis règle ──
function lz_drawJet(u, t, S) {
  vgrad(0, 0, LW, 130, [[0, '#2e1a56'], [0.6, '#cf6b9a'], [1, '#ffc84a']]);
  lz_ground(t, 120);
  const T0 = 0.5, tau = 0.22, per = 6.4, uu = u % per;                 // la scène se répète toutes les 6,4 s
  const liz = lz_lizard(52, 290, 1.25, t, { pose: uu > T0 - 0.35 ? 'squirt' : 'rest', bulge: prog(uu, T0 - 0.5, T0 - 0.05) });
  const hitT = T0 + 0.24 / tau;                                         // le jet touche le museau 0,24 s réelles après le départ
  const coy = lz_coyote(196, 292, 0.95, t, { pose: uu > hitT ? 'hit' : 'sniff', flip: true, t0: t - (uu - hitT), headDown: uu > hitT ? undefined : 0.35 });
  const a = liz.jet, b = coy.muzzle, v = lz_jetVel(a[0], a[1], b[0], b[1], 0.24);
  lz_jet(a[0], a[1], v[0], v[1], t - (uu - T0), t, { tau, hit: b, dur: 0.3 });
  lz_splat(b[0], b[1], t, { t0: t - (uu - hitT), tau, slide: [-0.2, 1] });
  // règle : un mètre = 200 px, le jet se déroule le long (vitesse réelle)
  const rv = prog(u, 0.2, 1.0), R0 = [34, 440];
  lz_ruler(R0[0], R0[1], 200, t, { reveal: rv });
  const j2 = u - 1.6;
  if (j2 > 0) { const e = [R0[0] - 6, R0[1] - 18], vv = lz_jetVel(e[0], e[1], R0[0] + 190, R0[1], 0.5); lz_jet(e[0], e[1], vv[0], vv[1], t - (j2 % 2.4), t, { tau: 0.5, ground: R0[1], dur: 0.5, maxAge: 0.7 }); }
}

// préchauffage : le sable et le premier dessin des sprites (caches) sont construits avant le premier plan
INITS.push(() => { lz_ground(0, 0); lz_lizard(135, 300, 1, 0, {}); lz_coyote(135, 300, 0.6, 0, {}); clearL(); });

function buildLezard(S) {
  const tCyc = wt('l2', "Lorsqu'ils") - 0.1, tJet = wt('l3', 'Ce') - 0.1;
  shot('lz_planche', S.t0, {
    draw: lz_drawPlanche,
    ui(u, t) { LZ_CASES.forEach(([name], k) => { const c = lz_cell(k); ptextC(name, c[0], k < 6 ? c[1] - 36 : c[1] - 36, WH[3], 1, NI[0]); }); },
    ev: [[S.t0 + 1.0, 'blip', 1], [S.t0 + 2.0, 'step', 1]],
  });
  shot('lz_cycles', tCyc, {
    draw: lz_drawCycles,
    ui(u, t) { hudTracker(1, 1, prog(u, 0, 0.5)); hudLieu(1, Math.floor(prog(u, 0.2, 0.7) * 12)); },
    ev: [[tCyc + 0.2, 'step', 1], [tCyc + 1.0, 'step', 1], [tCyc + 1.6, 'step', 1]],
  });
  shot('lz_jet', tJet, {
    draw: lz_drawJet,
    ui(u, t) { },
    ev: [[tJet + 0.5, 'squirt', 0.3], [tJet + 0.5 + 0.24 / 0.22, 'splat', 1], [tJet + 0.5 + 0.24 / 0.22, 'yelp', 1], [tJet + 0.4, 'ruler', 10]],
  });
}
