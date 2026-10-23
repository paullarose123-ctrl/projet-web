'use strict';
// ───────────────────────── fil conducteur : le carnet de terrain ─────────────────────────
// Trois cases en haut à gauche (grenouille, lézard, lycaon) : la bête en cours est allumée, celles déjà racontées sont cochées.
// Les icônes (≈ 17 px) servent aussi dans l'accroche et dans le carton final. Tout se dessine dans ui() (après le tramage), en couleurs exactes.
const BETES = [
  { id: 'sca', nom: 'SCARABÉE', lieu: 'BOMBARDIER', fond: '#3a2a10', clair: '#ffc84a' },
  { id: 'bas', nom: 'BASILIC', lieu: 'AMERIQUE CENTRALE', fond: '#0e2a22', clair: '#62ae72' },
  { id: 'ang', nom: 'ANGUILLE', lieu: 'AMAZONIE', fond: '#124a66', clair: '#70d0e4' },
];

// icônes provisoires (un disque et le numéro) ; chaque artiste définit ICONES[k] = function (cx, cy) { … } dans son fichier de sprites (17 × 17 px, couleurs exactes)
function iconeProvisoire(k) { return (cx, cy) => { disc(cx, cy, 7, '#05040f'); disc(cx, cy, 6, BETES[k].clair); ptextC(String(k + 1), cx, cy - 3, '#05040f', 1, null); }; }
const ICONES = [iconeProvisoire(0), iconeProvisoire(1), iconeProvisoire(2)];

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
