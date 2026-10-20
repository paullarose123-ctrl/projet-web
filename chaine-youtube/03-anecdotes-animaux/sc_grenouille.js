'use strict';
/* ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════
   sc_grenouille.js — segment ALASKA (grenouille des bois) : version PROVISOIRE, trois plans de contrôle des sprites de sc_grenouille_sprites.js (préfixe gr_)
     gr_planche  planche de 12 poses en grille 3 × 4 sur fond neutre (ce que le relecteur juge en premier)
     gr_cycles   cycle de saut (assise, accroupie, impulsion, vol, réception, écrasement) et respiration / clignement en continu
     gr_interne  planche du carnet : cœur qui bat puis s'arrête, électrocardiogramme, cellules qui se ratatinent, enrobage de sucre, cristaux de glace, redémarrage
   Les temps se calent sur wt() (mots de la voix) : rien n'est écrit en secondes. Les vrais plans du segment remplaceront ce fichier ; ils utiliseront les mêmes gr_*.
   ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════ */

// ───────────── plan 1 : la planche de 12 poses (grille 3 × 4) ─────────────
const gr_CELLW = 88, gr_CELLH = 82, gr_CX0 = 3, gr_CY0 = 15, gr_GAPX = 3, gr_GAPY = 3;
// [étiquette, options de gr_frog, échelle, décalage x]
const gr_POSES = [
  ['ASSISE', { pose: 'sit' }, 1.5, 2],
  ['ALERTE', { pose: 'alert' }, 1.5, 0],
  ['ACCROUPIE', { pose: 'crouch' }, 1.5, 1],
  ['IMPULSION', { pose: 'leap', ph: 0.275, hop: 0 }, 0.95, 14],
  ['VOL', { pose: 'leap', ph: 0.5, hop: 7 }, 0.88, 8],
  ['RÉCEPTION', { pose: 'land', ph: 0.34 }, 1.35, 0],
  ['GELÉE', { pose: 'frozen' }, 1.5, 1],
  ['DÉGEL', { pose: 'thaw', ph: 0.55, ice: 0.22 }, 1.5, 1],
  ['GIVRE', { pose: 'frozen', ice: 0.38 }, 1.5, 1],
  ['GLACE', { pose: 'frozen', ice: 1 }, 1.5, 1],
  ['GORGE', { pose: 'sit', breath: 'pulse' }, 2.1, -6],
  ['CLIGNE', { pose: 'sit', flip: true, blink: 'pulse' }, 1.5, -1],
];
function gr_planche(u, t) {
  vgrad(0, 0, LW, LH, [[0, ST[7]], [1, ST[6]]]);
  R(0, 0, LW, 12, ST[2]); R(0, 12, LW, 1, ST[4]);
  gr_POSES.forEach(([lab, opt, s, dx], i) => {
    const c = i % 3, r = Math.floor(i / 3), x0 = gr_CX0 + c * (gr_CELLW + gr_GAPX), y0 = gr_CY0 + r * (gr_CELLH + gr_GAPY);
    R(x0 - 1, y0 - 1, gr_CELLW + 2, gr_CELLH + 2, ST[5]); R(x0, y0, gr_CELLW, gr_CELLH, NE[3]); vgrad(x0, y0, gr_CELLW, 60, [[0, NE[4]], [1, NE[3]]]);
    R(x0, y0 + 58, gr_CELLW, gr_CELLH - 58, NE[2]); R(x0, y0 + 58, gr_CELLW, 1, ST[6]);
    const o = { ...opt, light: 1, rim: WH[3], shadow: 0.3 };
    if (o.breath === 'pulse') o.breath = 0.5 + 0.5 * Math.sin(t * TAU * 0.8);
    if (o.blink === 'pulse') { const k = (t * 0.85) % 1; o.blink = k < 0.2 ? sm(k / 0.1) * (k < 0.1 ? 1 : 1 - sm((k - 0.1) / 0.1)) : 0; }
    const fly = o.pose === 'leap' && o.ph > 0.3, bob = fly ? Math.round(Math.sin(t * 3 + i) * 1.2) : 0;
    gr_frog(x0 + gr_CELLW / 2 + dx, y0 + 58 + (fly ? -2 : 0) + bob, s, t, o);
  });
}
function gr_plancheUi(u, t) {
  ptextC('GRENOUILLE DES BOIS · 12 POSES', LW / 2, 3, WH[2], 1, null);
  gr_POSES.forEach(([lab], i) => {
    const c = i % 3, r = Math.floor(i / 3), x0 = gr_CX0 + c * (gr_CELLW + gr_GAPX), y0 = gr_CY0 + r * (gr_CELLH + gr_GAPY);
    ptextC(lab, x0 + gr_CELLW / 2, y0 + 68, NI[1], 1, null);
    ptext(String(i + 1), x0 + 3, y0 + 3, ST[4], 1, null);
  });
}

// ───────────── plan 2 : cycle de saut et respiration ─────────────
const gr_HOPP = 1.9, gr_HOLD = 0.3, gr_HOPD = 52;                          // période (s), part d'immobilité (assise qui respire), distance d'un saut (unités)
function gr_hopState(u) {                                                    // état du saut à l'instant u : { n (n-ième saut), f (phase du cycle), ph (phase du saut 0..1) }
  const c = u / gr_HOPP, n = Math.floor(c), f = c - n;
  return { n, f, ph: clamp((f - gr_HOLD) / (1 - gr_HOLD)) };
}
function gr_cycles(u, t) {
  vgrad(0, 0, LW, LH, [[0, ST[7]], [1, ST[6]]]);
  // panneau du haut : respiration et clignement, gros plan
  R(7, 17, 256, 150, ST[5]); R(8, 18, 254, 148, NE[4]); vgrad(8, 18, 254, 112, [[0, NE[4]], [1, NE[3]]]); R(8, 130, 254, 36, NE[2]); R(8, 130, 254, 1, ST[6]);
  const br = gr_breath(t, 1.25, gr_h(3, 1));
  gr_frog(122, 150, 3.5, t, { pose: 'sit', light: 1, rim: WH[3], shadow: 0.32, seed: 3 });
  // panneau du bas : le saut, en boucle ; la grenouille avance de saut en saut
  R(7, 190, 256, 158, ST[5]); R(8, 191, 254, 156, NE[4]); vgrad(8, 191, 254, 118, [[0, NE[4]], [1, NE[3]]]); R(8, 309, 254, 38, NE[2]); R(8, 309, 254, 1, ST[6]);
  const { n, ph } = gr_hopState(u), x0 = 52, gy = 330, s = 1.55;
  const xs = (nn, p) => x0 + (nn * gr_HOPD + gr_hopX(p, gr_HOPD)) * s * 0.62;                                  // abscisse écran : unités × échelle réduite pour tenir dans le panneau
  for (let q = Math.max(0, n - 1); q <= n; q++) {                         // la poussière du saut précédent et du courant
    const tl = (q + gr_HOLD + (1 - gr_HOLD) * 0.8) * gr_HOPP; if (tl <= u) k_dustKick(xs(q, 1) - 4, gy + 1, tl, u, { col: 'snow', dir: 1, size: 0.6, n: 6 });
  }
  gr_frog(xs(n, ph), gy, s, t, { pose: 'leap', ph, light: 1, rim: WH[3], shadow: 0.3, hop: 9, seed: 3 });
}
function gr_cyclesUi(u, t) {
  tagBox(12, 22, 'RESPIRATION · CLIGNEMENT', 'blue');
  const b = gr_breath(t, 1.25, gr_h(3, 1));
  ptext('GORGE', 12, 42, NI[1], 1, null); barH(46, 41, 60, 7, b, CY[3], NI[1], ST[4]);
  tagBox(12, 195, 'SAUT', 'amber');
  const { f, ph } = gr_hopState(u), lab = ph <= 0 ? 'ASSISE' : ph < 0.14 ? 'ACCROUPIE' : ph < 0.26 ? 'IMPULSION' : ph < 0.76 ? 'VOL' : ph < 0.9 ? 'RÉCEPTION' : 'ÉCRASEMENT';
  ptext(lab, 186, 199, NI[1], 1, null); barH(186, 211, 70, 4, ph, AM[7], NI[1], ST[4]);
}
function gr_cyclesEv(t0) {                                                  // décollage et réception de chaque saut (temps absolus), mots-clés : hop
  const ev = [];
  for (let q = 0; q < 4; q++) { const a = t0 + (q + gr_HOLD + (1 - gr_HOLD) * 0.26) * gr_HOPP, b = t0 + (q + gr_HOLD + (1 - gr_HOLD) * 0.8) * gr_HOPP; ev.push([a, 'whoosh', 0.35], [b, 'hop', 1]); }
  return ev;
}

// ───────────── plan 3 : vues internes (planche du carnet) ─────────────
// battements : instants relatifs au début du plan (le cœur ralentit puis s'arrête ; il repart vers 7,4 s)
const gr_BEATS = [0.25, 0.75, 1.25, 1.75, 2.35, 3.15, 4.2, 7.4, 8.0, 8.5, 8.95];
function gr_beatPulse(u, bs) {                                              // contraction du cœur 0..1 : montée rapide, retour lent
  let v = 0; for (const b of bs) { const d = u - b; if (d >= 0 && d < 0.5) v = Math.max(v, d < 0.09 ? sm(d / 0.09) : 1 - sm((d - 0.09) / 0.38)); } return v;
}
function gr_heartState(u) { return u < 1.8 ? 'live' : u < 4.4 ? 'slow' : u < 7.3 ? 'stopped' : u < 8.7 ? 'restart' : 'live'; }
function gr_interne(u, t, S) {
  const t0 = S.t0;
  vgrad(0, 0, LW, LH, [[0, NI[1]], [1, NI[2]]]);
  for (let x = 0; x < LW; x += 18) R(x, 0, 1, LH, NI[2]); for (let y = 0; y < LH; y += 18) R(0, y, LW, 1, NI[2]);       // papier quadrillé de nuit
  const st = gr_heartState(u), bs = gr_BEATS.map(b => t0 + b);
  gr_heart(70, 104, 1.7, t, { state: st, beat: gr_beatPulse(u, gr_BEATS), light: 1 });
  gr_ecg(134, 34, 128, 70, t, { beats: bs, speed: 56, now: 0.84 });
  // cellules
  const shrink = sm(prog(u, 3.0, 4.8)), glu = sm(prog(u, 5.0, 6.6)), bounce = prog(u, 5.2, 6.2);
  gr_cells(10, 198, 250, 124, t, { shrink, glucose: glu, ice: shrink * 0.95 * (1 - 0.0 * glu), bounce, molecules: glu, seed: 5 });
  if (glu > 0.9) { /* rien : l'enrobage reste */ }
}
function gr_interneUi(u, t, S) {
  const t0 = S.t0, st = gr_heartState(u);
  tagBox(10, 14, 'COEUR', 'red'); tagBox(134, 14, 'ELECTROCARDIOGRAMME', 'green');
  // cadence : 60 / intervalle entre les deux derniers battements ; 0 si le dernier a plus de 1,3 s
  const past = gr_BEATS.filter(b => b <= u); let bpm = 0;
  if (past.length >= 2 && u - past[past.length - 1] < 1.3) bpm = Math.round(60 / (past[past.length - 1] - past[past.length - 2]));
  counter(198, 112, bpm + '/MIN', 2, bpm > 0 ? '#ff5a48' : '#7a7a8a');
  ptext('BATTEMENTS', 134, 142, ST[6], 1, null); ptext(String(past.length), 134 + textW('BATTEMENTS '), 142, WH[2], 1, null);
  if (st === 'stopped') tagBox(10, 164, 'COEUR ARRETE', 'red', Infinity); else if (st === 'restart' || u > 8.7) tagBox(10, 164, 'IL REPART', 'green');
  tagBox(10, 180, 'CELLULES', 'blue');
  if (u > 3.0 && u < 5.0) tagBox(100, 180, 'LA GLACE LES RATATINE', 'blue', Infinity);
  if (u >= 5.0) tagBox(100, 180, 'LE SUCRE LES PROTEGE', 'amber', Infinity);
  if (u > 6.9) { mark(244, 180, 'yes', prog(u, 6.9, 7.3), 7); tagBox(146, 330, 'ELLE SURVIT', 'green'); }
  ptext('GLUCOSE', 12, 330, AM[8], 1, null); ptext('GLACE', 12 + textW('GLUCOSE  '), 330, CY[4], 1, null);
}
function gr_interneEv(t0) {
  const ev = [[t0 + 0.05, 'label', 1], [t0 + 3.0, 'frost', 1.8], [t0 + 3.0, 'zoom', 1.4], [t0 + 4.5, 'flatline', 2.6], [t0 + 5.0, 'glow', 1.6], [t0 + 5.8, 'sparkle', 1], [t0 + 6.9, 'ding', 1]];
  for (const b of gr_BEATS) ev.push([t0 + b, 'heartbeat', b < 2 || b > 7 ? 1 : 0.5], [t0 + b, 'beep', 1]);
  return ev;
}

function buildGrenouille(S) {
  const tCycles = wt('g2', 'Pendant') - 0.1, tInterne = wt('g3', 'Mais') - 0.1;
  shot('gr_planche', S.t0, { draw: gr_planche, ui: gr_plancheUi, ev: [] });
  shot('gr_cycles', tCycles, {
    draw: (u, t) => gr_cycles(u, t), ui: (u, t) => gr_cyclesUi(u, t),
    ev: gr_cyclesEv(tCycles).filter(e => e[0] < tInterne - 0.05),
  });
  shot('gr_interne', tInterne, { draw: (u, t, sh) => gr_interne(u, t, sh), ui: (u, t, sh) => gr_interneUi(u, t, sh), ev: gr_interneEv(tInterne).filter(e => e[0] < S.t1 - 0.05) });
}
