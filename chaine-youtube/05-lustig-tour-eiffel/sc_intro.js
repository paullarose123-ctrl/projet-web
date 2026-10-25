'use strict';
/* ═════════════════════════════════════════════════════════════════════════════════════════════
   sc_intro.js : l'ACCROCHE de « L'homme qui a vendu la tour Eiffel » (préfixe in_), de 0 à SEG.intro.t1 (≈ 8,1 s), quatre plans calés sur la voix (wt) :
     i_paris    Paris à l'aube, la tour au loin derrière les toits ; « 1925 » claque dans le ciel                         « En 1925, »
     i_tour     la tour monte dans le cadre ; sur « Eiffel » un énorme tampon rouge « VENDUE » s'écrase (l'image tremble)    « un homme a réussi à vendre la tour Eiffel… »
     i_pas      au pied de la tour, Lustig les mains dans le dos lève les yeux, le tampon reste dans le ciel : « PAS A LUI »  « alors qu'elle ne lui appartenait même pas ! »
     i_dossier  le dossier « AFFAIRE LUSTIG » s'ouvre sur son portrait                                                    « Et voici comment il a fait. »
   Sprites : sc_paris_sprites.js (pa_), sc_hotel_sprites.js (ho_ : tampon), sc_lustig_sprites.js (lu_). Tout est calé sur wt() : aucune seconde écrite en dur pour un mot.
   ═════════════════════════════════════════════════════════════════════════════════════════════ */
const in_A = {};
function in_anch() {
  if (in_A.ok) return in_A;
  const w = m => wt('i1', m);
  Object.assign(in_A, { an: w('1925'), un: w('un'), vendre: w('vendre'), eiffel: w('Eiffel'), alors: w('alors'), quelle: w("qu'elle"), app: w('appartenait'), meme: w('même'), pas: w('pas'),
    et: wt('i2', 'Et'), voici: wt('i2', 'voici'), comment: wt('i2', 'comment'), fait: wt('i2', 'fait'), ok: true });
  return in_A;
}
function in_shake(dx, dy) {                                                 // vibration de toute l'image : L recopiée sur elle-même décalée de quelques pixels entiers
  dx = Math.round(dx); dy = Math.round(dy); if (!dx && !dy) return;
  L.setTransform(1, 0, 0, 1, 0, 0); L.drawImage(low, dx, dy);
}
const IN_STAMP = { x: 135, y: 235, s: 1.5, rot: -0.07, seed: 3 };            // le gros tampon « VENDUE » : même position dans les trois plans où il apparaît
const in_hit = (t) => ho_hit(t, in_anch().eiffel, 0.5);
function in_shakeStamp(u, t) { const h = in_hit(t); if (h > 0.02) in_shake(Math.sin(u * 95) * 4 * h, Math.cos(u * 83) * 3 * h); }

// ───────────────────────── plan 1 : i_paris ─────────────────────────
function in_parisDraw(u, t) {
  const env = 'matin', cam = 6 * u;
  pa_ciel(t, { env, h: 330, cam, birds: 5, clouds: 5 });
  pa_toits(t, { env, y: 330, layers: ['far'], cam });
  pa_tour(190 - cam * 0.3, 346, 0.62, t, { env, haze: 0.32, flag: true, lifts: false });
  pa_toits(t, { env, y: 330, layers: ['mid', 'near'], cam });
}
function in_parisUi(u, t) {
  const A = in_anch(), p = prog(t, A.an - 0.02, A.an + 0.3);
  if (p <= 0) return;
  const s = '1925', sc = 8, y = 62 - Math.round((eob(p) - 1) * -26) + (p >= 1 ? Math.round(Math.sin(t * 2.4)) : 0), x = Math.round(135 - textW(s, sc) / 2);
  ptext(s, x + 3, y + 4, RD[4], sc, null); ptext(s, x, y, WH[3], sc, '#05040f');
  const n = Math.floor(prog(t, A.an + 0.12, A.an + 0.55) * 5);
  if (n > 0) tagBox(135, y + 74, 'PARIS', 'amber', n, true);
}

// ───────────────────────── plan 2 : i_tour ─────────────────────────
function in_tourDraw(u, t) {
  const A = in_anch(), env = 'matin';
  pa_ciel(t, { env, h: 330, birds: 3, rays: 0.5 });
  const rise = prog(u, 0, 2.1);
  pa_tour(135, 478 - 26 * rise, 1.2, t, { env, haze: 0.08, flag: true });
  pa_toits(t, { env, y: 450 + 26 * rise, layers: ['near'] });
  ho_tampon(IN_STAMP.x, IN_STAMP.y, IN_STAMP.s, t, A.eiffel, { texte: 'VENDUE', view: 'pov', rot: IN_STAMP.rot, seed: IN_STAMP.seed });
  in_shakeStamp(u, t);
}
// ───────────────────────── plan 3 : i_pas ─────────────────────────
function in_pasDraw(u, t) {
  const A = in_anch(), env = 'matin', cam = 4 * u, F = 410;
  const pv = pa_tourPied(t, { env, F, cam, layer: 'back' });
  ho_empreinte(IN_STAMP.x, 128, IN_STAMP.s, 'VENDUE', { rot: IN_STAMP.rot, seed: IN_STAMP.seed });
  const tip = prog(t, A.meme - 0.05, A.meme + 0.9);
  lu_lustig(104 - cam * 0.4, F + 62, 0.74, t, tip > 0 ? { pose: 'tipHat', u: t - (A.meme - 0.05), flip: false, light: 1, yaw: 0.55 } : { pose: 'stand', light: 1, yaw: 0.55, look: [0.2, -0.9] });
  pa_tourPied(t, { env, F, cam, layer: 'front' });
}
function in_pasUi(u, t) {
  const A = in_anch(), n = Math.floor(prog(t, A.app, A.app + 0.35) * 9);
  if (n > 0) tagBox(135, 214, 'PAS A LUI', 'red', n, true);
}

// ───────────────────────── plan 4 : i_dossier ─────────────────────────
const IN_D = { x: 38, y: 108, w: 194, h: 250 };
function in_dossierDraw(u, t) {
  const A = in_anch(), D = IN_D;
  vgrad(0, 0, LW, LH, [[0, WO[1]], [1, WO[0]]]);                                  // le bureau : bois sombre, buvard vert
  for (let i = 0; i < 9; i++) lineP(0, 30 + i * 52 + Math.sin(i * 2.1) * 4, LW, 36 + i * 52 + Math.sin(i * 2.9) * 5, WO[2], 1);
  R(18, 84, 234, 300, GR[0]); R(20, 86, 230, 296, GR[1]); ditherRect(20, 86, 230, 296, GR[0], 0.35);
  R(D.x + 5, D.y + 8, D.w, D.h, 'rgba(5,4,15,0.4)');                              // ombre portée
  // intérieur : feuille blanche, portrait encadré, lignes de dossier
  R(D.x, D.y, D.w, D.h, OC[2]); R(D.x + 6, D.y + 6, D.w - 12, D.h - 12, WH[2]); R(D.x + 6, D.y + 6, D.w - 12, 2, WH[3]);
  const open = prog(t, A.comment - 0.05, A.comment + 0.45);
  const px0 = D.x + 30, py0 = D.y + 34;
  R(px0 - 3, py0 - 3, 140, 122, WO[2]); R(px0 - 1, py0 - 1, 136, 118, '#05040f'); R(px0, py0, 134, 116, SK[4]); vgrad(px0, py0, 134, 116, [[0, SK[3]], [1, SK[4]]]);
  L.save(); L.beginPath(); L.rect(px0, py0, 134, 116); L.clip();
  lu_lustig(px0 + 67, py0 + 100, 1.1, t, { pose: t > A.fait - 0.15 ? 'smile' : 'stand', crop: 'chest', yaw: 0.2, light: 1, hat: true, shadow: 0 });
  L.restore();
  for (let i = 0; i < 5; i++) R(D.x + 24, D.y + 168 + i * 14, i === 4 ? 70 : D.w - 48, 1, ST[4]);
  // la couverture (kraft) pivote sur la charnière de gauche : sa largeur passe de w à 0
  const cw = Math.round(D.w * (1 - eio(open)));
  if (cw > 1) {
    R(D.x, D.y, cw, D.h, OC[3]); R(D.x, D.y, cw, 3, OC[4]); R(D.x, D.y + D.h - 3, cw, 3, OC[1]); R(D.x + cw - 2, D.y, 2, D.h, OC[1]);
    if (cw > 120) { R(D.x + 28, D.y + 36, cw - 56, 56, WH[2]); R(D.x + 28, D.y + 36, cw - 56, 2, WH[3]); }
    if (cw > 120) ho_empreinte(D.x + cw * 0.55, D.y + 200, 0.5, 'VENDUE', { rot: -0.2, seed: 5 });
  }
}
function in_dossierUi(u, t) {
  const A = in_anch(), D = IN_D, open = prog(t, A.comment - 0.05, A.comment + 0.45), cw = Math.round(D.w * (1 - eio(open)));
  if (cw > 120) { ptextC('AFFAIRE', D.x + cw / 2, D.y + 44, '#05040f', 3, null); ptextC('LUSTIG', D.x + cw / 2, D.y + 70, RD[4], 3, null); }
  const n = Math.floor(prog(t, A.comment + 0.35, A.fait) * 13);
  if (open >= 1) { ptextC('VICTOR LUSTIG', 135, D.y + 160, '#05040f', 2, null, n); }
  if (open >= 1) tagBox(135, D.y - 16, 'PARIS 1925', 'amber', Math.floor(prog(t, A.comment + 0.45, A.comment + 0.85) * 10), true);
}

INITS.push(() => { const A = in_anch(); for (const t of [0.4, A.eiffel + 0.2, A.alors + 0.3, A.fait]) { in_parisDraw(t, t); in_tourDraw(t, t); in_pasDraw(t, t); in_dossierDraw(t, t); } clearL(); });

function buildIntro(S) {
  const A = in_anch(), t1 = A.un - 0.12, t2 = A.quelle - 0.12, t3 = A.et - 0.1;
  shot('i_paris', S.t0, { draw: in_parisDraw, ui: in_parisUi, ev: [[S.t0 + 0.03, 'whoosh', 0.35], [S.t0 + 0.3, 'bird', 1], [A.an - 0.02, 'pop', 1], [A.an + 0.12, 'label', 1]] });
  shot('i_tour', t1, { draw: in_tourDraw, ev: [[t1 + 0.02, 'whoosh', 0.3], [A.eiffel, 'stamp', 1.6], [A.eiffel + 0.02, 'shake', 1], [A.eiffel + 0.2, 'sparkle', 1]] });
  shot('i_pas', t2, { draw: in_pasDraw, ui: in_pasUi, ev: [[t2 + 0.02, 'whoosh', 0.3], [A.app, 'label', 1], [A.app + 0.05, 'blip', 1], [A.meme + 0.1, 'step', 1], [t2 + 0.5, 'bird', 2]] });
  shot('i_dossier', t3, { draw: in_dossierDraw, ui: in_dossierUi, ev: [[A.comment - 0.05, 'page', 1], [A.comment + 0.45, 'label', 1], [A.comment, 'scribble', A.fait - A.comment], [A.fait, 'reveal', 1]] });
}
