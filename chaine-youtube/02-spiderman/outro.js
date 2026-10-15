'use strict';
// ───────────────────────── plan de sortie : le logo de la chaîne (grappe de raisin), son nom, « abonnez-vous » ─────────────────────────
// Le logo est le sprite de ../marque/logo.js (généré par ../marque/logo_pixel.py à partir de logo-raisins.webp), dessiné à l'échelle
// des pixels du film (1 pixel de sprite = 1 pixel du canevas). Tout ce qui porte la marque est dessiné après le tramage, en couleurs exactes.
// Rythme (u = secondes depuis le début du plan) : le logo tombe et rebondit, les lettres de RAISINS tombent une à une,
// puis « ABONNEZ-VOUS » se tape en jaune. Ni bouton, ni curseur, ni cloche (demande de l'auteur : seulement le texte).
const OUTRO = { logo: 0.10, land: 0.48, name: 0.98, nameStep: 0.07, sub: 1.80, subRate: 22, cx: 135, restTop: 80, nameY: 224, subY: 288 };
const MARQUE = { ink: '#210627', deep: '#49048c', mid: '#6605b8', lit: '#b92efa', pale: '#db86fa', snow: '#f5dafb', stem: '#c87331' };

let LOGO_CV = null;
function logoCanvas() {
  if (LOGO_CV) return LOGO_CV;
  const c = mkCanvas(LOGO.w, LOGO.h), g = c.getContext('2d');
  LOGO.rows.forEach((row, y) => {
    for (let x = 0; x < row.length;) {
      const ch = row[x]; let x1 = x; while (x1 < row.length && row[x1] === ch) x1++;
      if (ch !== '.') { g.fillStyle = LOGO.pal[parseInt(ch, 16)]; g.fillRect(x, y, x1 - x, 1); }
      x = x1;
    }
  });
  return LOGO_CV = c;
}
// hauteur du logo au-dessus de sa position de repos : chute, trois rebonds, écrasement à chaque impact
function logoBounce(u) {
  const t = u - OUTRO.logo, fall = OUTRO.land - OUTRO.logo;
  if (t < 0) return { lift: 400, sq: 0 };
  if (t < fall) { const k = t / fall; return { lift: 170 * (1 - k * k), sq: 0 }; }
  let s = t - fall;
  for (const [h, d] of [[30, 0.36], [11, 0.22], [4, 0.14]]) {
    if (s < d) { const k = s / d; return { lift: h * 4 * k * (1 - k), sq: Math.max(0, 1 - s / 0.07) * (h / 30 * 0.6 + 0.4) }; }
    s -= d;
  }
  return { lift: 0, sq: 0 };
}
function marqueText(s, cx, y, sc, nShown, step, rise) {              // lettres qui tombent une à une
  let x = Math.round(cx - textW(s, sc) / 2), i = 0;
  for (const ch of s) {
    const p = clamp((nShown - i * step) / 0.22), w = (gl(ch)[0].length + 1) * sc;
    if (p > 0) {
      const dy = Math.round((1 - eob(p)) * -rise);
      ptext(ch, x + 2, y + dy + 3, MARQUE.deep, sc, MARQUE.ink);       // ombre portée violette
      ptext(ch, x, y + dy, MARQUE.snow, sc, MARQUE.ink);
      L.save(); L.beginPath(); L.rect(x - 2, y + dy + 4 * sc, w + 2, 4 * sc); L.clip();      // bas des lettres : lilas
      ptext(ch, x, y + dy, MARQUE.pale, sc, null); L.restore();
    }
    x += w; i++;
  }
}
function buildOutro() {
  const T0 = VOICE_END + CARD_T, O = OUTRO, stars = [], rs = rng(77);
  for (let i = 0; i < 70; i++) stars.push({ x: rs() * LW, y: rs() * LH * 0.92, ph: rs() * TAU, sp: 0.8 + rs() * 2.2, c: rs() < 0.3 ? '#db86fa' : rs() < 0.6 ? WH[2] : CY[4] });
  shot('outro', T0, {
    draw(u, t) {
      vgrad(0, 0, LW, LH, [[0, '#1c1034'], [0.55, '#10102e'], [1, '#05040f']]);
      const pulse = 0.75 + 0.25 * Math.sin(t * 2.4);
      rgrad(135, 150, 8, 190, [[0, `rgba(134,65,164,${0.55 * pulse})`], [1, 'rgba(134,65,164,0)']], clamp(u / 0.5), 'lighter');
      for (const s of stars) { const a = 0.5 + 0.5 * Math.sin(t * s.sp + s.ph); if (a > 0.55) px(s.x, s.y, s.c); if (a > 0.92) { px(s.x - 1, s.y, s.c); px(s.x + 1, s.y, s.c); px(s.x, s.y - 1, s.c); px(s.x, s.y + 1, s.c); } }
      const { lift } = logoBounce(u), gy = O.restTop + LOGO.h + 8, k = clamp(1 - lift / 120);
      if (u > O.logo + 0.1) ell(O.cx, gy, 6 + 38 * k, 1 + 4 * k, '#05040f');
      vignette(0.45, 120, 300);
    },
    ui(u, t) {
      const cv = logoCanvas(), { lift, sq } = logoBounce(u);
      const bob = u > 1.4 ? Math.round(Math.sin((u - 1.4) * 2.2) * 2) : 0;
      // logo : écrasé à l'impact (plus large, moins haut), collé au sol
      if (lift < 399) {
        const sx = 1 + 0.12 * sq, sy = 1 - 0.14 * sq, w = Math.round(LOGO.w * sx), h = Math.round(LOGO.h * sy);
        L.imageSmoothingEnabled = false;
        L.drawImage(cv, Math.round(O.cx - w / 2), Math.round(O.restTop + LOGO.h - h - lift + bob), w, h);
      }
      // onde d'impact et étincelles à l'atterrissage
      const ls = u - O.land;
      if (ls > 0 && ls < 0.6) {
        const r = 10 + ls * 130, gy = O.restTop + LOGO.h + 8, a = 1 - ls / 0.6;
        for (let q = 0; q < 56; q++) { const an = q / 56 * TAU, x = O.cx + Math.cos(an) * r, y = gy + Math.sin(an) * r * 0.16; if (q % 2 === 0 || a > 0.5) px(x, y, a > 0.55 ? MARQUE.snow : MARQUE.pale); }
      }
      if (ls > 0 && ls < 0.9) for (let q = 0; q < 14; q++) { const an = -Math.PI * (0.1 + 0.8 * (q / 13)), v = 60 + (q % 4) * 22, x = O.cx + Math.cos(an) * v * ls, y = O.restTop + LOGO.h - 10 + Math.sin(an) * v * ls + 90 * ls * ls; if (q % 2) px(x, y, MARQUE.snow); else { px(x, y, MARQUE.pale); px(x + 1, y, MARQUE.pale); } }
      // brillance qui passe sur la grappe
      const gl0 = u - 1.55;
      if (gl0 > 0 && gl0 < 0.5) { const gx = O.cx - 30 + gl0 * 120, gyy = O.restTop + 18 + gl0 * 40; for (const [dx, dy] of [[0, 0], [-1, 0], [1, 0], [0, -1], [0, 1], [-2, 0], [2, 0], [0, -2], [0, 2]]) px(gx + dx, gyy + dy + bob, MARQUE.snow); }
      // nom
      if (u > O.name) marqueText('RAISINS', O.cx, O.nameY, 6, u - O.name, O.nameStep, 26);
      // « abonnez-vous », en jaune
      const ns = Math.floor((u - O.sub) * O.subRate), s = 'ABONNEZ-VOUS';
      if (ns > 0) {
        const lit = Math.floor((u - O.sub) * 2.5) % 2 === 0;
        ptext(s, O.cx - textW(s, 3) / 2, O.subY, lit ? YE[2] : YE[3], 3, '#05040f', ns);
        if (ns < s.length) R(O.cx - textW(s, 3) / 2 + textW(s.slice(0, ns), 3) + 3, O.subY, 3, 21, Math.floor(t * 6) % 2 ? WH[3] : YE[1]);
      }
    },
    ev: [[T0 + O.land, 'logo', 1], [T0 + O.name, 'letters', 1], [T0 + O.sub, 'label', 1]],
  });
}
