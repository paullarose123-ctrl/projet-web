'use strict';
// ───────────────────────── fil conducteur : le carnet de terrain ─────────────────────────
// Trois cases en haut à gauche (grenouille, lézard, lycaon) : la bête en cours est allumée, celles déjà racontées sont cochées.
// Les icônes (≈ 17 px) servent aussi dans l'accroche et dans le carton final. Tout se dessine dans ui() (après le tramage), en couleurs exactes.
const BETES = [
  { id: 'gre', nom: 'GRENOUILLE', lieu: 'ALASKA', fond: '#16324a', clair: '#3aa8c4' },
  { id: 'lez', nom: 'LÉZARD', lieu: 'MEXIQUE', fond: '#5a2a14', clair: '#e08c4a' },
  { id: 'lyc', nom: 'LYCAON', lieu: 'AFRIQUE', fond: '#4a3a10', clair: '#ffc84a' },
];

// icônes : centre (cx, cy), couleurs exactes (hors palette tramée), contour sombre
function iconGre(cx, cy, k = 1) {
  const o = '#05040f', b = WO[4], bl = WO[5], m = WO[0], v = WH[1];
  ell(cx - 1, cy + 3, 7, 5, o); ell(cx + 5, cy, 5, 4, o); ell(cx - 6, cy + 5, 4, 3, o); disc(cx + 6, cy - 4, 3, o);       // contours
  ell(cx - 1, cy + 3, 6, 4, b); ell(cx - 1, cy + 5, 4, 2, v);                                                           // corps, ventre clair
  ell(cx + 5, cy, 4, 3, b); R(cx + 3, cy + 1, 6, 1, v);                                                                 // tête, lèvre claire
  ell(cx - 6, cy + 5, 3, 2, bl); disc(cx + 6, cy - 4, 2, b); px(cx + 6, cy - 4, WH[3]); px(cx + 7, cy - 4, o);           // patte arrière, œil
  R(cx + 4, cy - 1, 4, 1, m); px(cx + 5, cy - 2, m);                                                                     // masque sombre
}
function iconLez(cx, cy, k = 1) {                                // lézard à cornes vu de dessus : corps plat rond, couronne de cornes
  const o = '#05040f', b = OC[3], d = OC[2], c = SK[4], l = AM[8];
  for (const [dx, dy] of [[-6, -4], [6, -4], [-6, 4], [6, 4]]) lineP(cx, cy, cx + dx + Math.sign(dx) * 2, cy + dy + Math.sign(dy), o, 3);
  lineP(cx, cy + 3, cx - 1, cy + 11, o, 3); ell(cx, cy, 7, 6, o);
  lineP(cx, cy + 3, cx - 1, cy + 10, d, 1); for (const [dx, dy] of [[-6, -4], [6, -4], [-6, 4], [6, 4]]) lineP(cx, cy, cx + dx + Math.sign(dx) * 2, cy + dy + Math.sign(dy), d, 1);
  ell(cx, cy, 6, 5, b); ell(cx, cy + 1, 4, 3, d); for (let i = 0; i < 6; i++) px(cx - 3 + (i * 7) % 7, cy - 2 + (i * 5) % 5, l);        // dos tacheté
  disc(cx, cy - 6, 3, o); disc(cx, cy - 6, 2, b);                                                                       // tête
  for (const sd of [-1, 1]) { lineP(cx + sd * 2, cy - 7, cx + sd * 5, cy - 11, o, 1); px(cx + sd * 5, cy - 11, c); lineP(cx + sd * 3, cy - 5, cx + sd * 6, cy - 7, o, 1); }
  px(cx - 1, cy - 7, '#05040f'); px(cx + 1, cy - 7, '#05040f');
}
function iconLyc(cx, cy, k = 1) {                                // tête de lycaon : grandes oreilles rondes, museau noir, pelage tacheté
  const o = '#05040f', f = AM[6], fd = AM[4], bl = WH[2], n = '#12100c';
  disc(cx - 7, cy - 5, 5, o); disc(cx + 7, cy - 5, 5, o); ell(cx, cy + 1, 8, 8, o);
  disc(cx - 7, cy - 5, 4, n); disc(cx + 7, cy - 5, 4, n); disc(cx - 7, cy - 5, 2, fd); disc(cx + 7, cy - 5, 2, fd);          // oreilles
  ell(cx, cy + 1, 7, 7, f); ell(cx - 4, cy - 2, 2, 2, fd); ell(cx + 4, cy + 2, 2, 2, fd); R(cx - 1, cy - 6, 3, 5, n);        // visage, taches, raie sombre
  ell(cx, cy + 4, 4, 3, bl); disc(cx, cy + 4, 2, n); px(cx - 1, cy + 3, WH[3]);                                              // museau clair, truffe
  px(cx - 4, cy - 1, n); px(cx + 4, cy - 1, n); px(cx - 4, cy - 2, WH[3]); px(cx + 4, cy - 2, WH[3]);                           // yeux
}
const ICONES = [iconGre, iconLez, iconLyc];

// k : bête en cours (0, 1, 2) ou -1 ; fait : nombre de bêtes déjà racontées (cochées) ; p : apparition 0 → 1 ; x, y : coin haut gauche
function hudTracker(k, fait = Math.max(0, k), p = 1, x = 8, y = 8) {
  if (p <= 0) return;
  for (let i = 0; i < 3; i++) {
    const bx = x + i * 26, B = BETES[i], on = i === k, done = i < fait, a = clamp(p * 3 - i * 0.6);
    if (a <= 0) continue;
    R(bx - 1, y - 1, 24, 24, '#05040f'); R(bx, y, 22, 22, on ? B.clair : done ? '#2a6648' : '#171a45'); R(bx + 1, y + 1, 20, 20, on ? B.fond : done ? '#0e2a22' : '#0a0a1f');
    if (on) { R(bx, y, 22, 1, B.clair); }
    L.save(); L.globalAlpha = on ? 1 : done ? 0.55 : 0.35; ICONES[i](bx + 11, y + 11 + (i === 1 ? 1 : 0)); L.restore();
    if (done) mark(bx + 18, y + 18, 'yes', clamp(p * 2), 5);
  }
}
// bandeau « 1/3 · ALASKA » à droite des cases
function hudLieu(k, nChars = Infinity, x = 8 + 3 * 26 + 2, y = 14) {
  if (k < 0) return 0;
  return tagBox(x, y, `${k + 1}/3 ${BETES[k].lieu}`, 'amber', nChars);
}
