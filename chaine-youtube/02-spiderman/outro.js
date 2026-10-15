'use strict';
// ───────────────────────── plan de sortie : le logo de la chaîne (grappe de raisin), son nom, « abonnez-vous » ─────────────────────────
// Le logo est le sprite de ../marque/logo.js (généré par ../marque/logo_pixel.py à partir de logo-raisins.webp), dessiné à l'échelle
// des pixels du film (1 pixel de sprite = 1 pixel du canevas). Tout ce qui porte la marque est dessiné après le tramage, en couleurs exactes.
// Rythme (u = secondes depuis le début du plan) : le logo tombe et rebondit, les lettres de RAISINS tombent une à une,
// « ABONNEZ-VOUS » se tape, le bouton S'ABONNER apparaît, un curseur clique, le bouton passe à ABONNÉ, la cloche sonne, pluie de confettis.
const OUTRO = {
  logo: 0.10, land: 0.48, name: 0.98, nameStep: 0.07, sub: 1.80, subRate: 22, btn: 2.40, cursorIn: 2.62, click: 3.42, done: 3.50, bell: 3.62,
  cx: 135, restTop: 66, nameY: 210, subY: 272, btnY: 308,
};
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
function marqueText(s, cx, y, sc, nShown, t0, step, rise) {          // lettres qui tombent une à une ; renvoie rien
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
function bellSprite(cx, cy, swing, pop) {                               // cloche 13 × 14 (pixels doublés), pivot en haut ; swing : -1 à 1
  const rows = ['......#......', '.....###.....', '....#####....', '...#######...', '...#######...', '..#########..', '..#########..', '.###########.', '.###########.', '#############', '#############', '.............', '.....###.....', '......#......'];
  const sc = 2 * Math.max(0.1, eob(clamp(pop))), w = 13, sz = Math.max(1, Math.round(sc + 0.4));
  const draw = (ox, oy, colFn) => rows.forEach((row, r) => {
    const sh = Math.round(swing * r * 0.9);
    for (let q = 0; q < w; q++) if (row[q] === '#') { L.fillStyle = colFn(q, r); L.fillRect(Math.round(cx + (q - 6) * sc) + sh + ox, Math.round(cy + (r - 7) * sc) + oy, sz, sz); }
  });
  for (const [ox, oy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) draw(ox, oy, () => '#05040f');
  draw(0, 0, (q, r) => r >= 12 ? AM[5] : q <= 3 ? AM[10] : q >= 10 ? AM[5] : AM[8]);
}
function cursorSprite(x, y, press) {
  const pts = [[0, 0], [0, 17], [4, 13], [7, 20], [10, 19], [7, 12], [12, 12]].map(([a, b]) => [x + a + (press ? 1 : 0), y + b + (press ? 1 : 0)]);
  for (const [ox, oy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [1, 1], [-1, -1]]) poly(pts.map(([a, b]) => [a + ox, b + oy]), '#05040f');
  poly(pts, '#ffffff');
}
function buildOutro() {
  const T0 = VOICE_END + CARD_T, O = OUTRO, stars = [], rs = rng(77);
  for (let i = 0; i < 70; i++) stars.push({ x: rs() * LW, y: rs() * LH * 0.92, ph: rs() * TAU, sp: 0.8 + rs() * 2.2, c: rs() < 0.3 ? '#db86fa' : rs() < 0.6 ? WH[2] : CY[4] });
  const rc = rng(5), conf = [];
  for (let i = 0; i < 70; i++) { const a = -Math.PI / 2 + (rc() - 0.5) * 2.6, v = 90 + rc() * 150; conf.push({ vx: Math.cos(a) * v, vy: Math.sin(a) * v, c: [MARQUE.lit, MARQUE.pale, MARQUE.snow, AM[8], YE[2], '#a014f7'][i % 6], w: 2 + (i % 3) + (i % 7 === 0 ? 1 : 0), sp: 4 + rc() * 8 }); }
  const bellRing = u => { const s = u - O.bell; return s < 0 ? 0 : Math.sin(s * 22) * Math.exp(-s * 1.7); };
  shot('outro', T0, {
    draw(u, t) {
      vgrad(0, 0, LW, LH, [[0, '#1c1034'], [0.55, '#10102e'], [1, '#05040f']]);
      const pulse = 0.75 + 0.25 * Math.sin(t * 2.4);
      rgrad(135, 120, 8, 190, [[0, `rgba(134,65,164,${0.55 * pulse})`], [1, 'rgba(134,65,164,0)']], clamp(u / 0.5), 'lighter');
      for (const s of stars) { const a = 0.5 + 0.5 * Math.sin(t * s.sp + s.ph); if (a > 0.55) px(s.x, s.y, s.c); if (a > 0.92) { px(s.x - 1, s.y, s.c); px(s.x + 1, s.y, s.c); px(s.x, s.y - 1, s.c); px(s.x, s.y + 1, s.c); } }
      const { lift } = logoBounce(u), gy = O.restTop + LOGO.h + 8, k = clamp(1 - lift / 120);
      if (u > O.logo + 0.1) { ell(O.cx, gy, 6 + 38 * k, 1 + 4 * k, '#05040f'); }
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
      if (u > O.name) marqueText('RAISINS', O.cx, O.nameY + bob * 0, 6, u - O.name, O.name, O.nameStep, 26);
      // « abonnez-vous »
      const ns = Math.floor((u - O.sub) * O.subRate);
      if (ns > 0) { const s = 'ABONNEZ-VOUS'; ptext(s, O.cx - textW(s, 3) / 2, O.subY, AM[8], 3, '#05040f', ns); if (ns < s.length) { R(O.cx - textW(s, 3) / 2 + textW(s.slice(0, ns), 3) + 3, O.subY, 3, 21, Math.floor(t * 6) % 2 ? WH[3] : AM[6]); } }
      // bouton
      const bp = eob(clamp((u - O.btn) / 0.3)), done = u > O.done, press = u > O.click - 0.06 && u < O.click + 0.1;
      if (bp > 0.02) {
        const bw = Math.round(158 * bp), bh = Math.round(36 * bp), bx = Math.round(O.cx - bw / 2 - (done ? 14 : 0) + (done ? 0 : 0)), by = O.btnY + (press ? 2 : 0) + Math.round((1 - bp) * 14);
        const fill = done ? ST[2] : RD[3], edge = done ? ST[4] : RD[5], shade = done ? ST[1] : RD[1];
        R(bx - 1, by - 1, bw + 2, bh + 3, '#05040f'); R(bx, by, bw, bh, fill); R(bx, by, bw, 2, edge); R(bx, by + bh - 3, bw, 3, shade); R(bx, by, 2, bh, edge);
        if (bp > 0.9) {
          if (!done) { const s = "S'ABONNER"; ptext(s, bx + Math.round(bw / 2 - textW(s, 2) / 2), by + 11, WH[3], 2, RD[0]); }
          else { const s = 'ABONNÉ'; ptext(s, bx + 34, by + 11, WH[2], 2, '#05040f'); const p = eob(clamp((u - O.done) / 0.25)); mark(bx + 18, by + 18, 'yes', p, 8); }
        }
        if (done) bellSprite(bx + bw + 26, by + 18, bellRing(u), (u - O.bell) / 0.25);
      }
      // curseur : arrive du bas à droite, clique, repart
      if (u > O.cursorIn && u < O.click + 0.9) {
        const k = eo(clamp((u - O.cursorIn) / (O.click - 0.1 - O.cursorIn))), out = clamp((u - (O.click + 0.3)) / 0.5);
        const x = lerp(250, O.cx + 26, k) + out * 40, y = lerp(372, O.btnY + 20, k) + out * 60;
        if (out < 1) cursorSprite(Math.round(x), Math.round(y), press);
      }
      // confettis
      const cs = u - O.done;
      if (cs > 0 && cs < 2.4) for (const c of conf) { const x = O.cx - 14 + c.vx * cs * 0.5 + Math.sin(cs * c.sp) * 3, y = O.btnY + 10 + c.vy * cs * 0.55 + 300 * cs * cs * 0.5; if (y < LH - 2 && x > 0 && x < LW) R(x, y, c.w, Math.max(1, c.w - 1), c.c); }
    },
    ev: [[T0 + O.land, 'logo', 1], [T0 + O.name, 'letters', 1], [T0 + O.sub, 'label', 1], [T0 + O.btn, 'blip', 1], [T0 + O.click, 'click', 1], [T0 + O.done, 'subscribed', 1], [T0 + O.bell, 'bellring', 1]],
  });
}
