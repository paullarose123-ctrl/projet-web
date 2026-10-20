'use strict';
/* ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════
   sc_lycaon.js — segment Afrique (PROVISOIRE : trois plans de contrôle des sprites de sc_lycaon_sprites.js, préfixe ly_)
   ly_planche  planche de 12 poses en grille 3 × 4 (douze motifs de pelage différents)
   ly_cycles   marche, trot, course et éternuement en continu (quatre couloirs)
   ly_vote     urne, bulletin, nez, compteur d'éternuements et jauge DÉPART
   Les vrais plans (y1_savane … y4_nez) sont écrits plus tard avec les mêmes fonctions ly_* ; ce fichier les remplacera.
   ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════ */

// ── planche : 12 poses dans une grille 3 × 4 (cases de 90 × 120), un motif de pelage par case ──
const LY_CASES = [
  ['DEBOUT', (c, t) => ly_dog(c[0], c[1], 0.5, t, { pose: 'stand', seed: 2 })],
  ['COUCHÉ', (c, t) => ly_dog(c[0] + 2, c[1], 0.5, t, { pose: 'lie', seed: 14 })],
  ['ASSIS', (c, t) => ly_dog(c[0] + 4, c[1], 0.5, t, { pose: 'sit', seed: 41 })],
  ['AU GUET', (c, t) => ly_dog(c[0] - 1, c[1], 0.5, t, { pose: 'look', seed: 30 })],
  ['INSPIRE', (c, t) => ly_dog(c[0], c[1], 0.5, t, { pose: 'sneeze', seed: 17, sneeze: -0.4 })],
  ['ATCHOUM', (c, t) => ly_dog(c[0] - 2, c[1], 0.5, t, { pose: 'sneeze', seed: 8, sneeze: 1 })],
  ['SALUE', (c, t) => ly_dog(c[0] - 2, c[1], 0.5, t, { pose: 'greet', seed: 36 })],
  ['MARCHE', (c, t) => ly_dog(c[0], c[1], 0.5, t, { pose: 'walk', seed: 21, ph: 0.3 + 0.22 * Math.sin(t * 2) })],
  ['TROT', (c, t) => ly_dog(c[0], c[1], 0.5, t, { pose: 'trot', seed: 9, ph: 0.2 + 0.2 * Math.sin(t * 2.4) })],
  ['COURSE', (c, t) => ly_dog(c[0] - 2, c[1], 0.5, t, { pose: 'run', seed: 25, ph: 0.3 + 0.12 * Math.sin(t * 2.2) })],
  ['SOMMEIL', (c, t) => ly_dog(c[0] + 2, c[1], 0.5, t, { pose: 'lie', rest: 1, seed: 3 })],
  ['CONTRE-JOUR', (c, t) => ly_dog(c[0], c[1], 0.5, t, { pose: 'stand', seed: 12, flip: true, sil: 0.75, rim: 1 })],
];
const ly_cell = k => [(k % 3) * 90 + 47, Math.floor(k / 3) * 120 + 100];

function ly_drawPlanche(u, t) {
  vgrad(0, 0, LW, LH, [[0, NI[3]], [0.12, DU[3]], [0.2, DU[6]], [0.26, AM[7]], [1, AM[9]]]);
  for (let k = 0; k < 12; k++) {
    const x0 = (k % 3) * 90, y0 = Math.floor(k / 3) * 120;
    vgrad(x0, y0, 90, 120, [[0, DU[3]], [0.45, DU[6]], [0.72, AM[7]], [1, AM[8]]]);
    fl_savannaSoil(y0 + 86, y0 + 120, { env: 'savannaDawn', seed: 3 + k, t, depth: 0.1, cracks: 0.5, pebbles: 12 });
  }
  for (let k = 0; k < 12; k++) { const c = ly_cell(k); LY_CASES[k][1](c, t); }
  for (const x of [90, 180]) R(x, 0, 1, LH, NI[0]);
  for (const y of [120, 240, 360]) R(0, y, LW, 1, NI[0]);
}

// ── cycles : quatre couloirs ; les pieds ne glissent pas (la distance vient de ly_gait) ──
const LY_LANES = [[135, 'walk', 20], [205, 'trot', 6], [275, 'run', 25], [345, 'sneeze', 5]];
function ly_drawCycles(u, t) {
  vgrad(0, 0, LW, 100, [[0, NI[3]], [0.5, DU[5]], [1, AM[8]]]);
  fl_savannaSoil(92, LH, { env: 'savannaDawn', seed: 3, t, depth: 0.1, cracks: 0.4, pebbles: 40 });
  const s = 0.62, t0 = t - u;
  LY_LANES.forEach(([y, g, seed], i) => {
    if (g === 'sneeze') return;
    const G = ly_gait(u, { gait: g }), span = LW + 190, x = (G.x * s + [120, 40, 10][i] + 95) % span - 95;
    ly_dog(x, y, s, t, { pose: g, seed, ph: G.ph });
  });
  const per = 2.6, r = ly_dog(104, 345, s, t, { pose: 'sneeze', seed: 5, t0 });
  const k = Math.floor((u - 0.75) / per), tS = t0 + 0.75 + k * per;
  if (k >= 0) ly_sneezeFx(r.nose[0] + 1, r.nose[1] + 3, tS, t, { dir: 1, s: 1.0, ang: 0.9, light: 1 });
}
function ly_cyclesUi(u, t) {
  LY_LANES.forEach(([y, g], i) => ptext(['MARCHE', 'TROT', 'COURSE', 'ÉTERNUEMENT'][i], 4, y - 66, WH[3], 1, NI[0]));
  const per = 2.6, k = Math.floor((u - 0.75) / per), p = prog(u - (0.75 + k * per), 0, 1.0);
  if (k >= 0) ly_atchoum(190, 300, p, { sc: 2 });
}

// ── vote : urne, bulletin, nez, compteur et jauge ──
const LY_VP = 7.4;
function ly_drawVote(u, t) {
  const b = k_backdrop('savannaDawn', t, { horizon: 272, cam: 0, clouds: 3 });
  fl_savannaSoil(272, LH, { env: 'savannaDawn', seed: 4, t, depth: 0.1, cracks: 0.5, pebbles: 20 });
  const v = u % LY_VP, BX = 196, BY = 338, BS = 1.1, slotX = BX;
  // le nez arrive de la gauche avec le bulletin, plonge vers la fente, lâche, repart ; le bulletin tombe ; puis le nez éternue
  const approach = eo(prog(v, 0, 1.5)), dip = eio(prog(v, 1.5, 2.3)), lift = eo(prog(v, 2.35, 3.1));
  const nx = lerp(-30, 150, approach) + 40 * dip - 60 * lift, ny = lerp(150, 150, approach) + 76 * dip - 70 * lift + 3 * Math.sin(v * 4) * (1 - dip) ;
  const holding = v < 2.35, NS = 0.8;
  const paperHeld = [nx, ny + 29.5 * NS];
  let paper = null;
  if (!holding) { const f = prog(v, 2.35, 3.25), y0 = paperHeld[1] + 0, yEnd = 296; paper = { x: lerp(nx, slotX, 0.0) , y: lerp(paperHeld[1], yEnd, Math.pow(f, 1.4)) }; paper.x = (150 + 40) + (slotX - 190) * 0 + Math.sin(f * 7) * 2 * (1 - f); }
  const bump = holding ? 0 : sm(prog(v, 3.2, 3.28)) * (1 - sm(prog(v, 3.28, 3.6)));
  ly_ballot(BX, BY, BS, t, { paper, bump });
  ly_nose(nx, ny, NS, t, { ballot: holding ? 1 : 0, sneeze: ly_sneezeEnv(v - 4.6), seed: 4 });
  ly_sneezeFx(nx, ny + 12, 4.6, v, { dir: 1, s: 2.4, ang: 1.0, light: 1 });
}
function ly_voteUi(u, t) {
  const v = u % LY_VP, n = Math.min(6, Math.floor(prog(v, 3.5, 6.4) * 6.99));
  counter(190, 10, 'ATCHOUM ×' + n, 1, '#ffe08a');
  gauge(168, 34, clamp(prog(v, 3.5, 6.4)), 'DÉPART', { redFrom: 0.8, style: 'amber' });
  ly_atchoum(110, 232, prog(v - 4.62, 0, 1.1), { sc: 3 });
}

INITS.push(() => { for (const p of ['stand', 'lie', 'sit', 'look', 'greet', 'walk', 'trot', 'run']) ly_dog(135, 300, 0.6, 0, { pose: p, seed: 1 }); ly_nose(135, 200, 0.8, 0, {}); ly_ballot(135, 300, 1, 0, {}); clearL(); });

function buildLycaon(S) {
  const tCyc = wt('y2', 'Avant') - 0.1, tVote = wt('y3', 'Plus') - 0.1;
  shot('ly_planche', S.t0, {
    draw: ly_drawPlanche,
    ui(u, t) { LY_CASES.forEach(([name], k) => { const c = ly_cell(k), x0 = (k % 3) * 90, y0 = Math.floor(k / 3) * 120; ptextC(name, x0 + 45, y0 + 4, WH[3], 1, NI[0]); ptext(String(k + 1), x0 + 3, y0 + 14, AM[8], 1, NI[0]); }); },
    ev: [[S.t0 + 1.0, 'blip', 1]],
  });
  shot('ly_cycles', tCyc, {
    draw: ly_drawCycles,
    ui(u, t) { ly_cyclesUi(u, t); },
    ev: [[tCyc + 0.4, 'step', 1], [tCyc + 1.0, 'run', 1.5]],
  });
  shot('ly_vote', tVote, {
    draw: ly_drawVote,
    ui: ly_voteUi,
    ev: [[tVote + 3.2, 'vote', 1], [tVote + 4.4, 'sneeze', 1]],
  });
}
