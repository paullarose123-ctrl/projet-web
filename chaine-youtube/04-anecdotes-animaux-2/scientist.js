'use strict';
// Le scientifique de la chaîne (même personnage que dans la vidéo 2 : coiffure de l'auteur, dégradé et boucles blond vénitien).
function drawScientist(cx, cy, s, t, o = {}) {
  const coat = o.coat || [WH[1], WH[0], WH[2]], hair = o.hair || WO[1], hairL = o.hairL || WO[3];
  const X0 = (x) => rd(cx + x * s), Y0 = (y) => rd(cy + y * s), S = v => Math.max(1, rd(v * s));
  const sway = Math.sin(t * 1.4) * 0.6 * (o.sway ?? 1), hy = o.headDy ?? 0;
  // jambes et chaussures
  R(X0(-8), Y0(-30), S(6), S(26), ST[2]); R(X0(2), Y0(-30), S(6), S(26), ST[2]); R(X0(-8), Y0(-30), S(2), S(26), ST[1]);
  R(X0(-9), Y0(-5), S(8), S(5), WO[2]); R(X0(1), Y0(-5), S(8), S(5), WO[2]); R(X0(-9), Y0(-5), S(8), S(1), WO[4]); R(X0(1), Y0(-5), S(8), S(1), WO[4]);
  // blouse
  R(X0(-15), Y0(-62), S(30), S(32), coat[0]); R(X0(-15), Y0(-62), S(5), S(32), coat[1]); R(X0(10), Y0(-62), S(5), S(32), coat[2]);
  R(X0(-1), Y0(-62), S(1), S(32), coat[1]);                                                              // boutonnage
  R(X0(-12), Y0(-50), S(7), S(6), coat[1]); R(X0(-12), Y0(-50), S(7), S(1), ST[5]);                       // poche
  R(X0(-2), Y0(-62), S(4), S(8), WO[3]);                                                               // cravate
  // bras
  const arm = o.armUp ?? 0;
  R(X0(-19), Y0(-62), S(6), S(24 - arm * 10), coat[0]); R(X0(13), Y0(-62 + arm * 6), S(6), S(22 - arm * 10), coat[0]);
  R(X0(-19), Y0(-38 + arm * 10), S(6), S(5), SK[3]); R(X0(13), Y0(-40 + arm * 4), S(6), S(5), SK[3]);
  // cou et tête
  R(X0(-3), Y0(-66), S(6), S(5), SK[2]);
  const hx = X0(0 + sway * 0.3), hyy = Y0(-76 + hy);
  ell(hx, hyy, S(9), S(10), SK[3]); ell(hx - S(1), hyy - S(1), S(7), S(8), SK[4]);
  if (o.hairStyle === 'curlyFade') hairCurlyFade(hx, hyy, S);
  else {
    R(hx - S(9), hyy - S(10), S(18), S(5), hair); R(hx - S(9), hyy - S(10), S(18), S(1), hairL);        // cheveux
    R(hx - S(9), hyy - S(6), S(3), S(5), hair); R(hx + S(6), hyy - S(6), S(3), S(5), hair);
  }
  // lunettes
  R(hx - S(7), hyy - S(2), S(6), S(5), '#05040f'); R(hx + S(1), hyy - S(2), S(6), S(5), '#05040f');
  R(hx - S(6), hyy - S(1), S(4), S(3), CY[4]); R(hx + S(2), hyy - S(1), S(4), S(3), CY[4]); R(hx - S(1), hyy - S(1), S(2), S(1), '#05040f');
  px(hx - S(5), hyy - S(1), WH[3]); px(hx + S(3), hyy - S(1), WH[3]);
  R(hx - S(2), hyy + S(5), S(4), S(1), SK[1]);                                                         // bouche
}

// coiffure de l'auteur (le scientifique du plan final, c'est lui) : dégradé (côtés ras qui fondent dans la peau) et boucles blond vénitien
// sur le dessus. Couleurs : uniquement des rampes de la palette du film (bois WO, ambre AM, éclats en peau SK).
// Les mesures sont données en pixels pour l'échelle 1,55 du plan final et suivent l'échelle du personnage.
// Trois tons de boucle (0 : dans l'ombre, 1 : base, 2 : éclairée par le haut) : contour, corps, partie claire, éclat.
const VB = {
  ring: [AM[4], WO[4], WO[6]], body: [AM[5], WO[6], SK[3]], lite: [WO[6], SK[3], SK[4]], hi: [SK[3], SK[4], AM[9]],
  cap: AM[4], stubble: [AM[5], WO[6]],
};
function curl(cx, cy, r, tone) {                                        // une boucle : contour, corps, lumière en haut à gauche, un arc clair
  disc(cx, cy, r, VB.ring[tone]); disc(cx, cy, r - 1, VB.body[tone]);
  disc(cx - 1, cy - 1, Math.max(1, r - 2), VB.lite[tone]);
  const a = r - 1.5; for (const q of [195, 220, 245, 268]) { const t = q * Math.PI / 180; px(cx + Math.cos(t) * a, cy + Math.sin(t) * a, VB.hi[tone]); }
}
function curlLayout(k) {                                                // boucles du fond (haut) vers le front : [x, y, rayon, ton]
  const P = v => rd(v * k / 1.55), out = [];
  const rows = [[-20.5, 0, 6.2, 4.4], [-16.6, 3.1, 6.2, 4.4], [-13, 0, 6.2, 4.2], [-10, 3.1, 6.2, 3.8]];     // [y, décalage, pas, rayon]
  rows.forEach(([y, off, step, r], j) => {
    const hw = 16 * Math.sqrt(Math.max(0, 1 - ((y + 9.5) / 16.5) ** 2)) - 1.8;
    for (let x = -19 + off; x <= 19; x += step) {
      if (Math.abs(x) > hw) continue;
      const h1 = Math.sin(x * 12.9898 + j * 78.233) * 43758.5453, f1 = h1 - Math.floor(h1);
      const h2 = Math.sin(x * 4.1414 + j * 12.9898) * 24634.6345, f2 = h2 - Math.floor(h2);
      const cx = x + (f1 - 0.5) * 2.6, cy = y + (f2 - 0.5) * 2.4;
      const q = (-cy - 8) / 13 - cx / 55 + (f2 - 0.5) * 0.25, tone = q > 0.62 ? 2 : q > 0.22 ? 1 : 0;
      out.push([P(cx), P(cy), Math.max(2, P(r + (f1 - 0.5) * 1.2)), tone]);
    }
  });
  out.push([P(-13.2), P(-8.6), Math.max(2, P(3.2)), 0], [P(13.4), P(-8), Math.max(2, P(3.2)), 0]);      // tempes
  out.push([P(-1.5), P(-23.2), Math.max(2, P(3.3)), 2], [P(10.2), P(-19.4), Math.max(2, P(2.8)), 1]);          // une mèche haute et une qui retombe à droite
  return out;
}
function drawCurls(hx, hyy, S) {
  for (const [x, y, r, tone] of curlLayout(S(100) / 100)) curl(hx + x, hyy + y, r, tone);
}
function hairCurlyFade(hx, hyy, S) {
  const rx = S(9), ry = S(10), k = S(100) / 100, u = k / 1.55;
  const yT = hyy - Math.round(8 * u), yB = hyy + Math.round(4.5 * u);        // le dégradé : de la tempe (cheveu ras) à l'oreille (peau)
  for (let y = hyy - ry; y <= yB; y++) for (let x = hx - rx - 2; x <= hx + rx + 2; x++) {
    const dx = (x + 0.5 - hx), dy = (y + 0.5 - hyy) / ry, edge = rx * Math.sqrt(Math.max(0, 1 - dy * dy));
    if (y < yT) { if (Math.abs(dx) <= edge) px(x, y, VB.cap); continue; }    // calotte sous les boucles
    const t = (y - yT) / (yB - yT), ext = Math.max(0, 1.5 * (1 - t / 0.7)) * u;           // t : 0 aux tempes → 1 à l'oreille ; le cheveu ras déborde un peu du crâne en haut
    if (Math.abs(dx) > edge + ext || Math.abs(dx) < rx * (0.6 + 0.12 * t)) continue;      // le visage reste libre
    const dens = clamp(1.3 - 1.25 * t);
    if (BAYER[((y & 3) << 2) | (x & 3)] < dens) px(x, y, t < 0.45 ? VB.stubble[0] : VB.stubble[1]);
  }
  for (const sd of [-1, 1]) { ell(hx + sd * rd(14.4 * u), hyy + rd(2 * u), Math.max(1, rd(2 * u)), Math.max(1, rd(3 * u)), SK[3]); px(hx + sd * rd(14.4 * u), hyy + rd(2 * u), SK[1]); }   // oreilles
  drawCurls(hx, hyy, S);
}

// ───────────────────────── accessoires de labo ─────────────────────────
