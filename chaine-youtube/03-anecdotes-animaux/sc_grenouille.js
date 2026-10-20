'use strict';
/* ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════
   sc_grenouille.js — segment ALASKA (grenouille des bois) : version PROVISOIRE, trois plans de contrôle des sprites de sc_grenouille_sprites.js (préfixe gr_)
     gr_planche  planche de 12 poses en grille 3 × 4 sur fond neutre (ce que le relecteur juge en premier)
     gr_cycles   cycle de saut à l'échelle de production (caméra qui suit, poussière à la réception) et respiration / clignement en continu
     gr_interne  planche du carnet : cœur qui bat puis s'arrête, électrocardiogramme, cellules qui se ratatinent, enrobage de sucre, cristaux de glace, redémarrage
   Les temps du plan gr_interne sont CALÉS SUR LA VOIX : gr_ANCH (rempli par buildGrenouille à partir de wt()/wt1()) donne, en secondes depuis le début du plan, « sucre », « survit », « dégèle »,
   « reprend » ; la cadence cardiaque se déduit de la durée des battements, jamais d'un chiffre écrit : si la voix est refaite, tout se recale.
   Les vrais plans du segment (g2_coeur, g3_sucre, g4_printemps) utiliseront les mêmes gr_* : arrêt du cœur sur wt('g2', "s'arrête") / wt1('g2', 'battre'), sucre sur wt('g3', 'sucre'),
   coche sur wt('g3', 'survit'), redémarrage de l'électrocardiogramme sur wt('g4', 'dégèle') AVANT l'œil et le saut (le cœur repart en premier : faits.md, Layne et First 1991).
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
  ['RÉCEPTION', { pose: 'land', ph: 0.2 }, 1.2, -9],
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

// ───────────── plan 2 : cycle de saut et respiration (le saut est vu à l'échelle de production : s = 2,4, caméra qui suit) ─────────────
const gr_HOPP = 2.0, gr_HOLD = 0.3, gr_HOPD = 78, gr_HOPS = 2.4, gr_FX0 = 96, gr_GY = 322;   // période (s), part d'immobilité (assise qui respire), distance d'un saut (px), échelle, abscisse de la grenouille à l'arrêt, sol
function gr_hopState(u) {                                                    // état du saut à l'instant u : { n (n-ième saut), f (phase du cycle), ph (phase du saut 0..1) }
  const c = Math.max(0, u) / gr_HOPP, n = Math.floor(c), f = c - n;
  return { n, f, ph: clamp((f - gr_HOLD) / (1 - gr_HOLD)) };
}
const gr_hopW = u => { const { n, ph } = gr_hopState(u); return n * gr_HOPD + gr_hopX(ph, gr_HOPD); };     // abscisse « monde » de la grenouille
const gr_camX = u => gr_hopW(u - 0.3);                                                                      // la caméra suit avec 0,3 s de retard : la grenouille la devance pendant le saut puis elle la rattrape
function gr_cycles(u, t) {
  vgrad(0, 0, LW, LH, [[0, ST[7]], [1, ST[6]]]);
  // panneau du haut : respiration et clignement, gros plan
  R(7, 17, 256, 150, ST[5]); R(8, 18, 254, 148, NE[4]); vgrad(8, 18, 254, 112, [[0, NE[4]], [1, NE[3]]]); R(8, 130, 254, 36, NE[2]); R(8, 130, 254, 1, ST[6]);
  gr_frog(122, 150, 3.5, t, { pose: 'sit', light: 1, rim: WH[3], shadow: 0.32, seed: 3 });
  // panneau du bas : le saut en boucle, vu de côté avec une caméra qui suit ; le sol défile (touffes, brindilles, plaques de neige)
  R(7, 190, 256, 158, ST[5]); R(8, 191, 254, 156, NE[4]); vgrad(8, 191, 254, 118, [[0, NE[4]], [1, NE[3]]]); R(8, 309, 254, 38, NE[2]); R(8, 309, 254, 1, ST[6]);
  const cam = gr_camX(u), { n, ph } = gr_hopState(u), cam0 = cam - gr_FX0;
  L.save(); L.beginPath(); L.rect(8, 191, 254, 156); L.clip();
  for (let k = Math.floor((cam0 - 20) / 41); k <= Math.floor((cam0 + 290) / 41); k++) {                      // décor du sol : positions fixes dans le monde
    const h1 = gr_h(k, 61), h2 = gr_h(k, 62), h3 = gr_h(k, 63), sx = Math.round(k * 41 + h1 * 30 - cam0), kind = Math.floor(h3 * 4);
    const gy = gr_GY + 6 + Math.round(h2 * 14);
    if (kind === 0) { ell(sx, gy, 9, 2, NE[1]); ell(sx - 1, gy - 1, 6, 1, NE[4]); }                           // plaque de neige
    else if (kind === 1) { lineP(sx, gy, sx + 7, gy - 2, WO[3], 1); lineP(sx + 3, gy - 1, sx + 4, gy - 4, WO[3], 1); }   // brindille
    else if (kind === 2) { for (let q = 0; q < 4; q++) lineP(sx + q * 2, gy, sx + q * 2 + (q % 2 ? 1 : -1), gy - 4 - (q % 3), LM[3 + (q % 2)], 1); }   // touffe d'herbe
    else { ell(sx, gy, 4, 2, ST[3]); ell(sx - 1, gy - 1, 2, 1, ST[5]); }                                      // caillou
  }
  const fx = gr_FX0 + (gr_hopW(u) - cam);
  gr_frog(fx, gr_GY, gr_HOPS, t, { pose: 'leap', ph, light: 1, rim: WH[3], shadow: 0.3, hop: 9, seed: 3 });
  L.restore();
  for (let q = Math.max(0, n - 1); q <= n; q++) {                                                         // la poussière de neige du saut précédent et du courant (monde → écran par o.cam)
    const tl = (q + gr_HOLD + (1 - gr_HOLD) * 0.8) * gr_HOPP; if (tl <= u) k_dustKick((q + 1) * gr_HOPD + gr_FX0 + 6, gr_GY + 1, tl, u, { col: 'snow', dir: 0, size: 1.5, n: 9, cam: cam0 });
  }
}
function gr_cyclesUi(u, t) {
  tagBox(12, 22, 'RESPIRATION · CLIGNEMENT', 'blue');
  const b = gr_breath(t, 1.25, gr_h(3, 1));
  ptext('GORGE', 12, 42, NI[1], 1, null); barH(46, 41, 60, 7, b, CY[3], NI[1], ST[4]);
  tagBox(12, 195, 'SAUT', 'amber');
  const { ph } = gr_hopState(u), lab = ph <= 0 ? 'ASSISE' : ph < 0.14 ? 'ACCROUPIE' : ph < 0.26 ? 'IMPULSION' : ph < 0.76 ? 'VOL' : ph < 0.9 ? 'RÉCEPTION' : 'ÉCRASEMENT';
  ptext(lab, 186, 199, NI[1], 1, null); barH(186, 211, 70, 4, ph, AM[7], NI[1], ST[4]);
}
function gr_cyclesEv(t0) {                                                  // décollage et réception de chaque saut (temps absolus), mots-clés : hop
  const ev = [];
  for (let q = 0; q < 4; q++) { const a = t0 + (q + gr_HOLD + (1 - gr_HOLD) * 0.26) * gr_HOPP, b = t0 + (q + gr_HOLD + (1 - gr_HOLD) * 0.8) * gr_HOPP; ev.push([a, 'whoosh', 0.35], [b, 'hop', 1]); }
  return ev;
}

// ───────────── plan 3 : vues internes (planche du carnet), calées sur la voix ─────────────
// Ancres en secondes DEPUIS LE DÉBUT DU PLAN (remplies par buildGrenouille ; valeurs par défaut pour les essais isolés) : durée du plan, « sucre », « survit », « dégèle », « reprend ».
const gr_ANCH = { D: 8, sucre: 0.8, survit: 2.8, degele: 4.7, reprend: 5.6 };
// battements : instants relatifs au début du plan. Le cœur ralentit (intervalle de 1,0 s puis 1,25 s : 60 puis 48 battements/min, jamais 120) puis s'arrête ; il repart à « dégèle » (intervalle de 1,0 s).
// (Layne, Lee et Heil 1989 : ≈ 8 battements/min au début du gel : les vrais plans g2_coeur peuvent espacer davantage, 1,0 puis 1,5, 2,2 et 3 s.)
let gr_BEATS = [0.15, 1.15, 2.4, 4.9, 5.9, 6.9, 7.9];
const gr_LASTLIVE = () => gr_BEATS.filter(b => b < gr_ANCH.degele)[gr_BEATS.filter(b => b < gr_ANCH.degele).length - 1];     // dernier battement avant l'arrêt
function gr_beatPulse(u, bs) {                                              // contraction du cœur 0..1 : montée rapide, retour lent
  let v = 0; for (const b of bs) { const d = u - b; if (d >= 0 && d < 0.5) v = Math.max(v, d < 0.09 ? sm(d / 0.09) : 1 - sm((d - 0.09) / 0.38)); } return v;
}
function gr_heartState(u) {
  const last = gr_LASTLIVE(), restart = gr_ANCH.degele + 0.2;
  return u < 1.25 ? 'live' : u < last + 1.3 ? 'slow' : u < restart ? 'stopped' : u < gr_ANCH.reprend + 0.9 ? 'restart' : 'live';
}
function gr_interne(u, t, S) {
  const A = gr_ANCH, t0 = S.t0;
  vgrad(0, 0, LW, LH, [[0, NI[1]], [1, NI[2]]]);
  for (let x = 0; x < LW; x += 18) R(x, 0, 1, LH, NI[2]); for (let y = 0; y < LH; y += 18) R(0, y, LW, 1, NI[2]);       // papier quadrillé de nuit
  const st = gr_heartState(u), bs = gr_BEATS.map(b => t0 + b);
  gr_heart(70, 104, 1.7, t, { state: st, beat: gr_beatPulse(u, gr_BEATS), light: 1 });
  gr_ecg(134, 34, 128, 70, t, { beats: bs, speed: 56, now: 0.84 });
  // cellules : la glace les ratatine jusqu'à « sucre », le sucre les enrobe, des cristaux rebondissent
  const shrink = sm(prog(u, 0, Math.max(0.3, A.sucre * 0.9))), glu = sm(prog(u, A.sucre, A.sucre + 1.1)), bounce = prog(u, A.sucre + 0.2, A.sucre + 1.2);
  gr_cells(10, 198, 250, 124, t, { shrink, glucose: glu, ice: shrink * 0.95, bounce, molecules: glu, seed: 5 });
}
function gr_interneUi(u, t, S) {
  const A = gr_ANCH, st = gr_heartState(u);
  tagBox(10, 14, 'COEUR', 'red'); tagBox(134, 14, 'ÉLECTROCARDIOGRAMME', 'green');
  // cadence : 60 / intervalle entre les deux derniers battements ; 0 si le dernier a plus de 1,5 s
  const past = gr_BEATS.filter(b => b <= u); let bpm = 0;
  if (past.length >= 2 && u - past[past.length - 1] < 1.5) bpm = Math.round(60 / (past[past.length - 1] - past[past.length - 2]));
  const mesure = past.length < 2 && u < gr_BEATS[1];                       // pas encore deux battements : la cadence ne se mesure pas (pas de « 0/MIN » alors que le cœur bat)
  counter(198, 112, (mesure ? '--' : bpm) + '/MIN', 2, !mesure && bpm > 0 ? '#ff5a48' : '#7a7a8a');
  ptext('BATTEMENTS', 134, 142, ST[6], 1, null); ptext(String(past.length), 134 + textW('BATTEMENTS '), 142, WH[2], 1, null);
  if (st === 'stopped') tagBox(10, 164, 'COEUR ARRÊTÉ', 'red', Infinity); else if (st === 'restart' || (st === 'live' && u > A.reprend)) tagBox(10, 164, 'IL REPART', 'green');
  tagBox(10, 180, 'CELLULES', 'blue');
  if (u < A.sucre) tagBox(100, 180, 'LA GLACE LES RATATINE', 'blue', Infinity);
  else tagBox(100, 180, 'LE SUCRE LES PROTÈGE', 'amber', Infinity);
  if (u >= A.survit) { mark(244, 180, 'yes', prog(u, A.survit, A.survit + 0.4), 7); tagBox(146, 330, 'ELLE SURVIT', 'green'); }
  ptext('GLUCOSE', 12, 330, AM[8], 1, null); ptext('GLACE', 12 + textW('GLUCOSE  '), 330, CY[4], 1, null);
}
function gr_interneEv(t0) {
  const A = gr_ANCH, ev = [[t0 + 0.05, 'label', 1], [t0 + 0.1, 'frost', Math.max(0.6, A.sucre)], [t0 + 0.1, 'zoom', Math.max(0.6, A.sucre)], [t0 + gr_LASTLIVE() + 1.3, 'flatline', Math.max(0.5, A.degele + 0.2 - gr_LASTLIVE() - 1.3)],
    [t0 + A.sucre, 'glow', 1.6], [t0 + A.sucre + 0.9, 'sparkle', 1], [t0 + A.survit + 0.05, 'ding', 1]];
  for (const b of gr_BEATS) ev.push([t0 + b, 'heartbeat', b < 2 || b > A.degele ? 1 : 0.5], [t0 + b, 'beep', 1]);
  return ev;
}

function buildGrenouille(S) {
  const tCycles = wt('g2', 'Pendant') - 0.1, tInterne = wt('g3', 'Mais') - 0.1;
  // calage sur la voix du plan gr_interne (secondes depuis le début du plan)
  Object.assign(gr_ANCH, { D: S.t1 - tInterne, sucre: wt('g3', 'sucre') - tInterne, survit: wt('g3', 'survit') - tInterne, degele: wt('g4', 'dégèle') - tInterne, reprend: wt('g4', 'reprend') - tInterne });
  const A = gr_ANCH, b0 = [0.15, 1.15, 2.4];                                                       // les trois derniers battements avant l'arrêt (intervalle 1,0 puis 1,25 s)
  gr_BEATS = b0.slice(); for (let b = A.degele + 0.2; b < A.D - 0.1; b += 1.0) gr_BEATS.push(b);    // redémarrage à « dégèle » : un battement par seconde
  shot('gr_planche', S.t0, { draw: gr_planche, ui: gr_plancheUi, ev: [] });
  shot('gr_cycles', tCycles, {
    draw: (u, t) => gr_cycles(u, t), ui: (u, t) => gr_cyclesUi(u, t),
    ev: gr_cyclesEv(tCycles).filter(e => e[0] < tInterne - 0.05),
  });
  shot('gr_interne', tInterne, { draw: (u, t, sh) => gr_interne(u, t, sh), ui: (u, t, sh) => gr_interneUi(u, t, sh), ev: gr_interneEv(tInterne).filter(e => e[0] < S.t1 - 0.05) });
}
