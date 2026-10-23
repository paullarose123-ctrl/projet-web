'use strict';
/* sc_fin.js — FINALE (préfixe fn_) : fin_choix, un seul plan. Voir son_fin.md. */
// ═════════════════════════════════════════════════════════════════════════════════════════════
// 1. LE SCIENTIFIQUE EN TENUE DE TERRAIN (fn_sci) : drawScientist (blouse, lunettes, coiffure de l'auteur) rendu dans un calque,
//    bras redessinés (carnet tenu à gauche, main droite qui écrit, se gratte la tête ou se pose), jumelles au cou, carnet ouvert,
//    pupilles et bouche expressives, contour sombre, liseré chaud côté soleil. Tout est une fonction pure du temps.
// ═════════════════════════════════════════════════════════════════════════════════════════════
const fn_KEY = [255, 0, 255];
const fn_cv = mkCanvas(), fn_c = fn_cv.getContext('2d', { willReadFrequently: true });
const fn_INK = '#05040f';
function fn_R(c, x, y, w, h, col) { c.fillStyle = col; c.fillRect(rd(x), rd(y), rd(w), rd(h)); }
function fn_P(c, x, y, col) { c.fillStyle = col; c.fillRect(rd(x), rd(y), 1, 1); }
function fn_disc(c, cx, cy, r, col) { c.fillStyle = col; cx = rd(cx); cy = rd(cy); for (let dy = -r; dy <= r; dy++) { const hw = Math.floor(Math.sqrt(Math.max(0, r * r + r * 0.6 - dy * dy))); c.fillRect(cx - hw, cy + dy, hw * 2 + 1, 1); } }
function fn_text(c, str, x, y, col) {                                 // texte pixel 5 × 7 sur un calque (police du moteur)
  c.fillStyle = col; let cx = x;
  for (const ch of str) { const g = gl(ch), top = g.top || 0; for (let r = 0; r < g.length; r++) for (let q = 0; q < g[r].length; q++) if (g[r][q] === '#') c.fillRect(cx + q, y + r - top, 1, 1); cx += g[0].length + 1; }
}
function fn_seg(c, x0, y0, x1, y1, th, col) {                    // segment épais (pinceau carré)
  x0 = rd(x0); y0 = rd(y0); x1 = rd(x1); y1 = rd(y1);
  const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1; let e = dx + dy; const o = Math.floor(th / 2);
  c.fillStyle = col;
  for (let k = 0; k < 600; k++) { c.fillRect(x0 - o, y0 - o, th, th); if (x0 === x1 && y0 === y1) break; const e2 = 2 * e; if (e2 >= dy) { e += dy; x0 += sx; } if (e2 <= dx) { e += dx; y0 += sy; } }
}
// bras à deux os : épaule, main, longueurs ; out = +1 : le coude est du côté droit (x grand), -1 : du côté gauche
function fn_ik(sh, ha, l1, l2, out) {
  let dx = ha[0] - sh[0], dy = ha[1] - sh[1], d = Math.hypot(dx, dy); const reach = l1 + l2 - 0.01;
  if (d > reach) { ha = [sh[0] + dx / d * reach, sh[1] + dy / d * reach]; dx = ha[0] - sh[0]; dy = ha[1] - sh[1]; d = reach; }
  const a = (l1 * l1 - l2 * l2 + d * d) / (2 * d), h = Math.sqrt(Math.max(0, l1 * l1 - a * a));
  const mx = sh[0] + dx / d * a, my = sh[1] + dy / d * a;
  const c1 = [mx - dy / d * h, my + dx / d * h], c2 = [mx + dy / d * h, my - dx / d * h];
  return { e: (c1[0] - c2[0]) * out > 0 ? c1 : c2, h: ha };
}
// les positions de la main droite (unités du personnage, origine = pieds) pour chaque posture ; interpolées entre elles
const fn_HAND = {
  write: [8, -40], rest: [10, -33], scratch: [11, -84], hip: [17, -38],
};

// état du scientifique à l'instant t (anticipation, élan, temps d'arrêt : tout est dérivé des mots de la voix)
function fn_sciState(t, u, A) {
  const st = {};
  // regard et tête : baissée sur le carnet jusqu'à « Alors », se relève, hésite, se détend au carton
  const down = 1 - sm(prog(t, A.tA - 0.1, A.tA + 0.18));                                  // 1 : tête penchée sur le carnet
  const ponder = sm(prog(t, A.tLaq + 0.05, A.tLaq + 0.3)) * (1 - sm(prog(t, A.tSur - 0.05, A.tSur + 0.1)));
  st.headDy = 2.4 * down + 0.7 * ponder * Math.sin(t * 2.1);
  // main droite : écrit, se retire (anticipation), monte à la tête, gratte, retombe vite, se pose
  const w0 = prog(t, A.tA - 0.12, A.tA - 0.0), r0 = prog(t, A.tLaq + 0.02, A.tLaq + 0.46), r1 = prog(t, A.tSur - 0.08, A.tSur + 0.22), r2 = prog(t, A.tEnd + 0.05, A.tEnd + 0.5);
  let hx, hy;
  if (t < A.tLaq - 0.02) {                                                                   // écriture : petits traits rapides, puis la mine se lève
    const wr = 1 - sm(w0);
    hx = fn_HAND.write[0] + wr * (3.2 * Math.sin(t * 40) + 1.2 * Math.sin(t * 17)) + (1 - wr) * 2; hy = fn_HAND.write[1] + wr * 0.9 * Math.sin(t * 53) - (1 - wr) * 2 * sm(prog(t, A.tA - 0.05, A.tA + 0.2));
    st.writing = wr;
  } else {
    // anticipation : la main recule un peu avant de monter (0 → 0,25 de r0), puis arrive sur la tête en dépassant légèrement
    const back = Math.sin(clamp(r0 / 0.3) * Math.PI) * (r0 < 0.3 ? 1 : 0);
    const k = eob(clamp((r0 - 0.15) / 0.85));
    hx = lerp(fn_HAND.write[0], fn_HAND.scratch[0], k) + 4 * back; hy = lerp(fn_HAND.write[1] - 2, fn_HAND.scratch[1], k) + 3 * back;
    // grattage : va-et-vient de la main sur les boucles, un peu plus lent que le vent
    const sc = sm(prog(r0, 0.8, 1)) * (1 - r1);
    hx += sc * 2.6 * Math.sin((t - A.tLaq) * 19); hy += sc * 1.4 * Math.sin((t - A.tLaq) * 19 + 1.3);
    // retombée sur « surpris » : rapide, puis se pose sur le carnet
    if (r1 > 0) { hx = lerp(hx, fn_HAND.hip[0], eio(r1)); hy = lerp(hy, fn_HAND.hip[1], eio(r1)); }
    if (r2 > 0) { hx = lerp(hx, fn_HAND.rest[0], eo(r2)); hy = lerp(hy, fn_HAND.rest[1], eo(r2)); }
    st.scratch = sm(prog(r0, 0.5, 1)) * (1 - sm(r1));
  }
  st.hand = [hx, hy];
  // hop de surprise puis léger balancement de joie au carton
  const sh = t - A.tSur; st.hop = sh > 0 && sh < 0.34 ? Math.sin(sh / 0.34 * Math.PI) * 3.2 : 0;
  st.nod = t > A.tEnd + 0.1 ? Math.sin((t - A.tEnd - 0.1) * 3.2) * 0.5 : 0;
  // bouche : neutre (parle), perplexe, « oh », sourire franc
  if (t < A.tLaq) st.mouth = 'flat'; else if (t < A.tSur - 0.02) st.mouth = 'hm'; else if (t < A.tSur + 0.5) st.mouth = 'o'; else if (t < A.tEnd - 0.1) st.mouth = 'hm'; else st.mouth = 'smile';
  // regard : sur le carnet, vers les cartes (haut), vers le spectateur
  st.gaze = t < A.tA - 0.05 ? [0, 1] : t < A.tSur + 0.5 ? [-1 + (t > A.tLaq ? 2 * (0.5 + 0.5 * Math.sin((t - A.tLaq) * 1.7)) : 0), -1] : [0, 0];
  st.page = prog(t, A.tA + 0.02, A.tA + 0.3);                                                // page tournée au départ de la question
  st.flush = 0;
  return st;
}

const fn_MOUTH = {
  hm: ['.....XXX', 'XXXXX...'],
  o: ['.XX.', 'X..X', '.XX.'],
  smile: ['X......X', '.XWWWWX.', '..XXXX..'],
};
function fn_mouth(c, hx, hy, kind) {
  const rows = fn_MOUTH[kind]; if (!rows) return;
  const skin = c.getImageData(hx, hy + 6, 1, 1).data, sc = `rgb(${skin[0]},${skin[1]},${skin[2]})`;
  c.fillStyle = sc; c.fillRect(hx - 4, hy + 7, 8, 4);                                         // efface la bouche d'origine (trait de 6 × 2)
  const w = rows[0].length, x0 = hx - (w >> 1), y0 = hy + (kind === 'o' ? 7 : 7);
  rows.forEach((r, j) => { for (let i = 0; i < w; i++) { const ch = r[i]; if (ch === 'X') fn_P(c, x0 + i, y0 + j + (kind === 'smile' ? 0 : 1), WO[2]); else if (ch === 'W') fn_P(c, x0 + i, y0 + j, WH[3]); } });
}

// carnet de terrain ouvert, vu de face (pages vers le spectateur), tenu devant la blouse ; p = page tournée 0..1 ; écriture : traits de crayon
function fn_notebook(c, x, y, w, h, t, st) {
  const cov = WO[1], covL = WO[3], pg = WH[2], pgS = WH[1], rule = ST[6], ink = WO[2];
  fn_R(c, x - 2, y - 2, w + 4, h + 4, cov); fn_R(c, x - 2, y - 2, w + 4, 1, covL);                // couverture qui dépasse
  const hw = w >> 1;
  fn_R(c, x, y, hw, h, pg); fn_R(c, x + hw, y, w - hw, h, pg);
  fn_R(c, x + hw - 3, y, 3, h, pgS); fn_R(c, x + hw, y, 2, h, pgS); fn_R(c, x + hw - 1, y, 1, h, ST[5]);   // pli central
  // page de gauche : 1 2 3 avec une pastille de la bête de chaque ligne
  const cols = [GR[3], RD[3], AM[7]];
  for (let i = 0; i < 3; i++) {
    const ry = y + 2 + i * 7; fn_text(c, String(i + 1), x + 2, ry - 1, ink);
    fn_R(c, x + 9, ry + 1, hw - 14, 1, rule); fn_R(c, x + 9, ry + 3, hw - 18, 1, rule);
    fn_disc(c, x + hw - 6, ry + 2, 2, cols[i]); fn_P(c, x + hw - 7, ry + 1, WH[3]);
  }
  // page de droite : lignes de notes, crayon qui écrit (trait qui s'allonge tant que la main écrit)
  for (let i = 0; i < 4; i++) fn_R(c, x + hw + 3, y + 3 + i * 5, w - hw - 6 - (i === 3 ? 7 : 0), 1, rule);
  for (let i = 0; i < 3; i++) for (let j = 0; j < (w - hw - 8); j += 2) if (((j * 7 + i * 13) % 5) < 3) fn_P(c, x + hw + 3 + j, y + 2 + i * 5 + ((j * 3 + i) % 3 === 0 ? 1 : 0), ink);
  // page qui se tourne (de droite à gauche) : bande crème de largeur |cos|
  const p = st.page || 0;
  if (p > 0 && p < 1) {
    const a = p * Math.PI, ex = Math.round(x + hw + Math.cos(a) * (hw - 1)), lift = Math.round(Math.sin(a) * 4);
    c.fillStyle = pg; c.beginPath(); c.moveTo(x + hw, y); c.lineTo(ex, y - lift); c.lineTo(ex, y + h - lift * 0.5); c.lineTo(x + hw, y + h); c.closePath(); c.fill();
    c.fillStyle = ST[6]; c.fillRect(Math.min(x + hw, ex), y + h - 1, Math.abs(ex - (x + hw)), 1); c.fillStyle = WH[3]; c.fillRect(ex, y - lift, 1, h);
  }
  // élastique rouge à droite
  fn_R(c, x + w - 3, y, 2, h, RD[2]);
}

// jumelles : sangle autour du cou, deux oculaires, bosses de lentille, reflet
function fn_binos(c, X0, Y0, S, bob) {
  const o = fn_INK, b = Y0(-58) + bob;
  const bwS = S(6), xL = X0(0) - bwS - 2 + (bwS >> 1), xR = X0(0) + 2 + (bwS >> 1);
  fn_seg(c, X0(-3), Y0(-65), xL, b, 3, WO[1]); fn_seg(c, X0(3), Y0(-65), xR, b, 3, WO[1]);       // sangle en V
  fn_seg(c, X0(-3), Y0(-65), xL, b, 1, WO[5]); fn_seg(c, X0(3), Y0(-65), xR, b, 1, WO[5]);
  const bw = S(6), bh = S(9);
  for (const x of [X0(0) - bw - 2, X0(0) + 2]) {
    fn_R(c, x - 1, b - 1, bw + 2, bh + 2, o); fn_R(c, x, b, bw, bh, ST[4]); fn_R(c, x, b, 2, bh, ST[2]); fn_R(c, x + bw - 2, b, 2, bh, ST[7]); fn_R(c, x, b, bw, 2, ST[6]);
    fn_R(c, x, b + bh - 2, bw, 2, ST[0]); fn_R(c, x + 1, b + bh - 1, bw - 2, 1, CY[2]);                                          // lentille
  }
  fn_R(c, X0(0) - S(2), b + 1, S(4), S(3), ST[3]);
}

// le scientifique complet : (cx, cy) = pieds, s = échelle (1,5 ≈ 150 px de haut)
function fn_sci(cx, cy, s, t, A, o = {}) {
  const st = o.st || fn_sciState(t, 0, A), rim = o.rim ?? 1;
  const S = v => Math.max(1, rd(v * s)), X0 = x => rd(cx + x * s), Y0 = y => rd(cy + y * s);
  const bx0 = Math.max(0, X0(-30)), by0 = Math.max(0, Y0(-112)), bx1 = Math.min(LW, X0(52)), by1 = Math.min(LH, Y0(0) + 1), bw = bx1 - bx0, bh = by1 - by0;
  const hop = Math.round(st.hop || 0);
  // 1) dessine drawScientist sur un fond « clé », lit le résultat, restaure le fond
  const bg = L.getImageData(bx0, by0, bw, bh);
  L.setTransform(1, 0, 0, 1, 0, 0); L.fillStyle = '#ff00ff'; L.fillRect(bx0, by0, bw, bh);
  const sw = o.sway ?? 1;
  drawScientist(cx, cy - hop, s, t, { hairStyle: 'curlyFade', sway: sw, headDy: st.headDy + (st.nod || 0), armUp: 0 });
  const im = L.getImageData(bx0, by0, bw, bh), d = im.data;
  L.putImageData(bg, bx0, by0);
  for (let i = 0; i < d.length; i += 4) if (d[i] === 255 && d[i + 1] === 0 && d[i + 2] === 255) d[i + 3] = 0;
  const c = fn_c; c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(bx0 - 2, by0 - 2, bw + 4, bh + 4);
  c.putImageData(im, bx0, by0);
  const Yh = y => Y0(y) - hop;                                                                   // tout ce qui suit saute avec le corps
  const coat = [WH[1], WH[0], WH[2]];
  // 2) retire les deux bras d'origine (rectangles fixes) et reconstitue la blouse dessous
  for (const [ax, sd, sc] of [[-19, -15, coat[1]], [13, 10, coat[2]]]) {
    const x = X0(ax), w = S(6), y = Yh(-62), h = Yh(-38) + S(5) - Yh(-62);
    c.save(); c.beginPath(); c.rect(x, y, w, h); c.clip(); c.clearRect(x, y, w, h);
    fn_R(c, X0(sd), Yh(-62), S(5), S(32), sc); c.restore();
  }
  // 3) jumelles, bras gauche (tient le carnet), carnet, bras droit
  const bob = Math.round(Math.sin(t * 2.4) * 0.5);
  fn_binos(c, X0, Yh, S, bob);
  const nbx = X0(-21), nby = Yh(-50) + bob, nbw = S(33), nbh = S(22);
  const shL = [X0(-16), Yh(-58)], hL = [X0(-21), Yh(-35)], ikL = fn_ik(shL, hL, S(15), S(17), -1);
  const sleeve = (p0, p1, th) => { fn_seg(c, p0[0], p0[1], p1[0], p1[1], th, coat[1]); fn_seg(c, p0[0] + 1, p0[1] - 1, p1[0] + 1, p1[1] - 1, Math.max(1, th - 3), coat[0]); };
  sleeve(shL, ikL.e, S(6.5)); sleeve(ikL.e, hL, S(6));
  fn_notebook(c, nbx, nby, nbw, nbh, t, st);
  // main gauche : sous le carnet, pouce sur la page
  fn_R(c, nbx - 3, nby + nbh - 7, 6, 8, SK[3]); fn_R(c, nbx - 3, nby + nbh - 7, 6, 2, SK[4]); fn_R(c, nbx + 2, nby + nbh - 9, 3, 3, SK[3]); fn_R(c, nbx + 2, nby + nbh - 9, 3, 1, SK[4]);
  // bras droit : épaule → main (cinématique inverse), manche, poignet clair, main
  const shR = [X0(15), Yh(-58)], hR = [X0(st.hand[0]), Yh(st.hand[1])], ikR = fn_ik(shR, hR, S(17), S(19), 1);
  sleeve(shR, ikR.e, S(6.5)); sleeve(ikR.e, ikR.h, S(6));
  const hd = ikR.h; fn_R(c, hd[0] - 3, hd[1] - 3, 7, 6, SK[3]); fn_R(c, hd[0] - 3, hd[1] - 3, 7, 2, SK[4]); fn_R(c, hd[0] - 3, hd[1] + 2, 7, 1, SK[2]);
  if (st.scratch > 0.3) for (let i = 0; i < 3; i++) fn_R(c, hd[0] - 6 - (i === 1 ? 1 : 0), hd[1] - 3 + i * 2, 3, 2, SK[3]);          // doigts en peigne
  if (st.writing > 0.05) { fn_seg(c, hd[0] + 1, hd[1] + 1, hd[0] - 3, hd[1] + 6, 2, YE[2]); fn_P(c, hd[0] - 3, hd[1] + 7, fn_INK); fn_P(c, hd[0] + 2, hd[1], RD[4]); }   // crayon : mine vers la page
  // 4) visage : pupilles et bouche
  const sway = Math.sin(t * 1.4) * 0.6 * sw, hx = X0(0 + sway * 0.3), hy = Yh(-76 + st.headDy + (st.nod || 0)) + hop * 0;
  const g = st.gaze;
  for (const lx of [hx - S(6) + 1, hx + S(2) + 1]) { fn_R(c, lx + (g[0] > 0 ? 2 : g[0] < 0 ? 0 : 1), hy - S(1) + (g[1] > 0 ? 2 : g[1] < 0 ? 0 : 1), 2, 2, ST[1]); }
  fn_mouth(c, hx, hy, st.mouth);
  // 5) contour sombre + liseré chaud côté soleil (droite) + ombre froide à gauche
  const img = c.getImageData(bx0 - 2, by0 - 2, bw + 4, bh + 4), p = img.data, W2 = bw + 4, H2 = bh + 4, a = new Uint8Array(W2 * H2);
  for (let i = 0; i < W2 * H2; i++) a[i] = p[i * 4 + 3] ? 1 : 0;
  const out = [];
  for (let y = 0; y < H2; y++) for (let x = 0; x < W2; x++) {
    const i = y * W2 + x; if (a[i]) continue;
    if ((x > 0 && a[i - 1]) || (x < W2 - 1 && a[i + 1]) || (y > 0 && a[i - W2]) || (y < H2 - 1 && a[i + W2])) out.push(i);
  }
  const edgeR = [];
  for (let y = 0; y < H2; y++) for (let x = 0; x < W2 - 2; x++) { const i = y * W2 + x; if (a[i] && !a[i + 1] ) edgeR.push(i); }
  const tint = (i, rgb, k) => { p[i * 4] += (rgb[0] - p[i * 4]) * k; p[i * 4 + 1] += (rgb[1] - p[i * 4 + 1]) * k; p[i * 4 + 2] += (rgb[2] - p[i * 4 + 2]) * k; };
  for (let y = 0; y < H2; y++) for (let x = 0; x < W2; x++) {
    const i = y * W2 + x; if (!a[i]) continue;
    const fx = (x - (cx - bx0 + 2)) / (28 * s); tint(i, fx > 0 ? [255, 214, 140] : [90, 70, 130], Math.abs(fx) * 0.14);      // lumière chaude à droite, ombre violette à gauche
  }
  if (rim) for (const i of edgeR) tint(i, [255, 240, 190], 0.78);
  for (const i of out) { p[i * 4] = 5; p[i * 4 + 1] = 4; p[i * 4 + 2] = 15; p[i * 4 + 3] = 255; }
  c.putImageData(img, bx0 - 2, by0 - 2);
  L.setTransform(1, 0, 0, 1, 0, 0); L.drawImage(fn_cv, bx0 - 2, by0 - 2, W2, H2, bx0 - 2, by0 - 2, W2, H2);
  return { hx, hy, hand: hd, head: [hx, hy] };
}
// ═════════════════════════════════════════════════════════════════════════════════════════════
// 2. ANCRES DE LA VOIX (tout est calé sur wt() / P.fin : aucune seconde écrite en dur pour un mot)
// ═════════════════════════════════════════════════════════════════════════════════════════════
let fn_AC = null;
function fn_A() {
  if (fn_AC) return fn_AC;
  const w = m => wt('fin', m), tA = w('Alors');
  return fn_AC = {
    t0: SEG.fin.t0, t1: SEG.fin.t1, tA, tLaq: w('lequel'), tCes: w('ces'), tTrois: w('trois'), tAnec: w('animaux'), tPlus: w('plus'), tSur: w('impressionnant'), tEnd: P.fin.t1,
    rise: [tA + 0.16, tA + 0.40, tA + 0.64],                         // les cartes se dressent l'une après l'autre, juste après « Alors »
  };
}

// ═════════════════════════════════════════════════════════════════════════════════════════════
// 3. DÉCOR : prairie au lever du jour (ciel savannaDawn du kit, collines et herbes dessinées ici)
// ═════════════════════════════════════════════════════════════════════════════════════════════
const FN_E = 'savannaDawn', FN_HZ = 214, FN_GND = 236;
function fn_hill(base, amp, per, seed, top, bot, rim, trees) {
  const g = L.createLinearGradient(0, base - amp, 0, base + 46); g.addColorStop(0, top); g.addColorStop(1, bot); L.fillStyle = g;
  const hs = [];
  for (let x = -2; x <= LW + 2; x++) hs.push(base - amp * (0.62 * k_n1(x / per, seed) + 0.38 * k_n1(x / (per * 0.37), seed + 5)));
  for (let x = 0; x < LW; x++) { const h = Math.round(hs[x + 2]); L.fillRect(x, h, 1, LH - h); }
  for (let x = 0; x < LW; x++) { const sl = hs[x + 4] - hs[x]; if (sl > 0.5) px(x, Math.round(hs[x + 2]), rim); else if (sl < -1.2) px(x, Math.round(hs[x + 2]) + 1, bot); }
  if (trees) {                                                         // bosquets : même teinte que la colline, un peu plus sombre, liseré chaud
    const r = rng(seed * 7 + 3);
    for (let i = 0; i < trees; i++) {
      const x = Math.round(8 + r() * (LW - 16)), y = Math.round(hs[x + 2]) + 2, rr = 2 + Math.round(r() * 2);
      ell(x, y - rr, rr + 1, rr, bot); ell(x - 1, y - rr - 1, rr, rr - 1, top); px(x + rr, y - rr - 1, rim); R(x, y, 1, 1, bot);
    }
  }
}
function fn_bg(u, t) {
  const E = FN_E, H = FN_HZ, skyH = H - 44;
  k_sky(E, t, { h: skyH });
  const sp = k_sunPos(E, { h: skyH }); k_sun(sp[0], sp[1], sp[2], { t });
  k_clouds(t, { preset: E, y0: 36, y1: H - 100, n: 3, seed: 14, speed: 4 });
  k_birds(t, { y: 76, x: 20, n: 5, speed: 12, col: DU[1] });
  fn_hill(H - 6, 9, 70, 4, '#f0a8b8', '#c27aa4', AM[9], 0);
  k_haze(H - 22, H + 4, '#ffd8a0', 0.4, { t, profile: 'bottom', seed: 4 });
  fn_hill(H + 4, 11, 55, 9, '#86a878', '#5e8870', AM[8], 6);
  k_haze(H - 10, H + 16, '#ffd8a0', 0.3, { t, profile: 'bottom', seed: 6, wisp: 1 });
  fn_hill(H + 12, 8, 46, 13, LM[3], LM[2], AM[9], 3);
  fl_grassSpring(H + 14, LH, { env: E, t, grow: 1, seed: 8, h: 12 });
}

// ═════════════════════════════════════════════════════════════════════════════════════════════
// 4. LES TROIS CARTES : numérotées 1, 2, 3, plantées sur un piquet, chacune avec sa bête en pose calme
// ═════════════════════════════════════════════════════════════════════════════════════════════
const FN_CW = 78, FN_CH = 108, FN_CX = [9, 96, 183], FN_CY = 84;
const FN_CARD = [
  { num: '1', nom: 'SCARABÉE', lieu: '100 DEGRÉS', band: AM[4], band2: AM[7], ink: AM[9], tag: 'amber' },
  { num: '2', nom: 'BASILIC', lieu: "SUR L'EAU", band: GR[2], band2: LM[4], ink: GR[4], tag: 'green' },
  { num: '3', nom: 'ANGUILLE', lieu: '860 VOLTS', band: CY[1], band2: CY[3], ink: CY[4], tag: 'blue' },
];
// position animée de la carte k : lever en rebond, balancement, secousse sur « surpris », vibration douce au carton
function fn_cardPos(k, t) {
  const A = fn_A(), p = prog(t, A.rise[k], A.rise[k] + 0.42);
  if (p <= 0) return { vis: false };
  let dx = 0, dy = Math.round((1 - eob(p)) * 100);
  if (p >= 1) dy += Math.round(Math.sin(t * 2.3 + k * 2.1) * 0.9);
  const s = t - (A.tSur - 0.02 + k * 0.05); let env = 0;
  if (s > 0 && s < 1.2) { env = Math.exp(-s * 4); dx += Math.round(Math.sin(s * TAU * 13) * 3.4 * env); dy -= Math.round(Math.abs(Math.sin(s * TAU * 6.5)) * 6 * env); }
  const q = sm(prog(t, A.tEnd, A.tEnd + 0.3));
  if (q > 0) { dx += Math.round(Math.sin(t * TAU * 8.5 + k * 1.9) * 1.1 * q); dy += Math.round(Math.sin(t * TAU * 5 + k * 2.7) * 0.6 * q); }
  return { vis: true, x: FN_CX[k] + dx, y: FN_CY + dy, p, env };
}
// fond de la carte (fenêtre 70 × 70) puis la bête : le pouvoir de chacune à demi montré
function fn_cardArt(k, x, y, t) {
  const ax = x + 4, ay = y + 20, aw = 70, ah = 70, gy = ay + 58;
  L.save(); L.beginPath(); L.rect(ax, ay, aw, ah); L.clip();
  if (k === 0) {                                                       // scarabée : terre chaude de fin d'après-midi, cailloux, brin d'herbe sèche
    vgrad(ax, ay, aw, ah, [[0, DU[4]], [0.35, RD[4]], [0.62, AM[7]], [0.8, AM[9]], [1, YE[3]]]);
    disc(ax + 54, ay + 38, 8, YE[3]); disc(ax + 54, ay + 38, 6, WH[3]);
    poly([[ax, ay + 50], [ax, ay + 44], [ax + 16, ay + 42], [ax + 30, ay + 46], [ax + 44, ay + 43], [ax + 70, ay + 47], [ax + 70, ay + 50]], OC[1]);
    R(ax, ay + 48, aw, 22, OC[3]); ditherRect(ax, ay + 48, aw, 6, OC[2], 0.55); ditherRect(ax, ay + 56, aw, 14, OC[2], 0.4);
    ell(ax + 36, gy + 3, 31, 6, OC[2]); ell(ax + 36, gy + 1, 30, 5, OC[4]);
    ell(ax + 8, gy + 5, 5, 2, ST[4]); ell(ax + 62, gy + 6, 6, 2, ST[3]);
    for (let i = 0; i < 9; i++) { const gx = ax + 2 + i * 8, gh = 6 + (i * 5) % 6; lineP(gx, gy + 7, gx + ((i % 3) - 1), gy + 7 - gh, i % 2 ? AM[6] : AM[5], 1); }
    sb_beetle(ax + 32, gy + 1, 0.56, t, { pose: 'aim', light: 1, shadow: 0.45 });
  } else if (k === 1) {                                                // basilic : rivière sous la canopée, il court à la surface
    vgrad(ax, ay, aw, ah, [[0, GR[0]], [0.3, GR[1]], [0.5, LM[1]], [0.6, CY[3]], [1, CY[1]]]);
    for (const [bx, bh] of [[6, 36], [20, 30], [58, 40], [66, 28]]) { R(ax + bx, ay + 50 - bh, 3, bh, GR[0]); ell(ax + bx + 1, ay + 50 - bh, 9, 5, GR[2]); }
    ell(ax + 36, ay + 18, 30, 9, GR[2]); ell(ax + 30, ay + 14, 18, 6, LM[3]); ell(ax + 52, ay + 20, 14, 6, GR[1]);
    R(ax, ay + 46, aw, 24, CY[2]); ditherRect(ax, ay + 46, aw, 4, LM[3], 0.5); ditherRect(ax, ay + 56, aw, 14, CY[1], 0.5);
    for (let i = 0; i < 6; i++) lineP(ax + 4 + i * 12 + ((t * 8 + i * 3) % 5), gy + 3 + (i % 3) * 3, ax + 12 + i * 12 + ((t * 8 + i * 3) % 5), gy + 3 + (i % 3) * 3, WH[2], 1);
    ba_slap(ax + 22, gy + 2, 0, ((t * 3.3) % 1) + 0.12, { size: 0.45, dir: 1 });
    ba_lizard(ax + 34, gy - 9, 0.4, t, { pose: 'run', spd: 1, light: [0.5, -0.86], rim: 1 });
  } else {                                                             // anguille : eau trouble de l'Amazonie, rayons de lumière, éclair
    vgrad(ax, ay, aw, ah, [[0, CY[1]], [0.5, BL[2]], [1, NI[3]]]);
    for (let i = 0; i < 4; i++) poly([[ax + 6 + i * 18, ay], [ax + 14 + i * 18, ay], [ax + 4 + i * 18, ay + 60], [ax - 6 + i * 18, ay + 60]], CY[3]);
    ditherRect(ax, ay + 56, aw, 14, NI[1], 0.7);
    for (let i = 0; i < 8; i++) { const gx = ax + 4 + i * 9; lineP(gx, ay + 70, gx + Math.sin(t * 1.5 + i) * 2, ay + 56 - (i * 5) % 9, i % 2 ? GR[1] : GR[2], 1); }
    an_eel(ax + 64, gy - 14, 0.26, t, { pose: 'tense', zap: 0.6 });
  }
  L.restore();
}
// piquet de bois planté dans l'herbe, derrière la carte
function fn_stake(x, y, t) {
  const cx = x + FN_CW / 2 - 2, top = y + FN_CH - 6, bot = FN_GND + 26;
  R(cx - 1, top, 6, bot - top, fn_INK); R(cx, top, 4, bot - top, WO[3]); R(cx, top, 1, bot - top, WO[1]); R(cx + 3, top, 1, bot - top, WO[5]);
  for (let yy = top + 6; yy < bot; yy += 9) px(cx + 1 + ((yy / 9) | 0) % 2, yy, WO[2]);
}
// en-tête, cadre et pied de la carte : couleurs exactes, après le tramage (ui) ; l'art (fenêtre 70 × 70) est déjà dessous
function fn_cardUi(k, c, t) {
  const x = c.x, y = c.y, d = FN_CARD[k], W = FN_CW, H = FN_CH;
  L.save(); L.beginPath(); L.rect(0, 0, LW, FN_GND); L.clip();
  R(x - 1, y - 1, W + 2, 21, fn_INK); R(x - 1, y + 89, W + 2, H - 88, fn_INK); R(x - 1, y + 19, 5, 71, fn_INK); R(x + W - 4, y + 19, 5, 71, fn_INK);   // contour
  R(x, y, W, 19, WH[1]); R(x, y, W, 1, WH[3]); R(x, y + 90, W, H - 90, WH[1]); R(x, y + H - 1, W, 1, WH[0]); R(x, y + 19, 3, 71, WH[1]); R(x + W - 3, y + 19, 3, 71, WH[1]);
  R(x + 2, y + 2, W - 4, 16, fn_INK); R(x + 3, y + 3, W - 6, 14, d.band); R(x + 3, y + 3, W - 6, 1, d.band2);                                      // bandeau du nom
  R(x + 3, y + 19, 1, 71, fn_INK); R(x + W - 4, y + 19, 1, 71, fn_INK); R(x + 3, y + 19, W - 6, 1, fn_INK); R(x + 3, y + 90, W - 6, 1, fn_INK);       // cadre de l'art
  R(x + 2, y + 92, W - 4, 14, WH[0]); R(x + 3, y + 93, W - 6, 12, WH[2]);                                                                           // pied : lieu
  ptextC(d.nom, x + W / 2 + 8, y + 7, WH[3], 1, fn_INK);
  ptextC(d.lieu, x + W / 2, y + 96, d.band, 1, null);
  disc(x + 4, y + 4, 11, fn_INK); disc(x + 4, y + 4, 10, d.band2); disc(x + 4, y + 4, 8, d.band); px(x - 3, y - 3, WH[3]); px(x - 2, y - 4, WH[3]);   // pastille du numéro
  ptextC(d.num, x + 5, y - 2, WH[3], 2, fn_INK);
  L.restore();
}
// ═════════════════════════════════════════════════════════════════════════════════════════════
// 5. LE PLAN fin_choix (un seul plan, de S.t0 à S.t1 : la question, puis le carton qui reste 2 s)
// ═════════════════════════════════════════════════════════════════════════════════════════════
const FN_SCI = { cx: 122, cy: 400, s: 1.6 };
function fn_draw(u, t) {
  const A = fn_A(), E = FN_E;
  fn_bg(u, t);
  // fleurs dans les flancs de la prairie
  fl_flowers(4, 262, 78, 340, { env: E, t, seed: 4, density: 0.5, zmin: 0.55, zmax: 0.85, depth: 0.3 });
  fl_flowers(176, 262, 266, 336, { env: E, t, seed: 11, density: 0.5, zmin: 0.55, zmax: 0.85, depth: 0.3 });
  // piquets et cartes (coupés à la ligne d'herbe : elles sortent de terre)
  L.save(); L.beginPath(); L.rect(0, 0, LW, FN_GND); L.clip();
  for (let k = 0; k < 3; k++) { const c = fn_cardPos(k, t); if (!c.vis) continue; fn_stake(c.x, c.y, t); fn_cardArt(k, c.x, c.y, t); }
  L.restore();
  // touffes d'herbe qui cachent le pied des piquets, poussière de terre quand une carte sort
  for (let k = 0; k < 3; k++) { fl_bush(t, { x: FN_CX[k] + FN_CW / 2, y: FN_GND + 22, w: 40, h: 22, kind: 'green', env: E, seed: 3 + k }); }
  for (let k = 0; k < 3; k++) k_dustKick(FN_CX[k] + FN_CW / 2, FN_GND + 8, A.rise[k], t, { col: 'grass', dir: 0, size: 0.9, n: 7, dur: 0.8 });
  // le scientifique
  fn_sci(FN_SCI.cx, FN_SCI.cy, FN_SCI.s, t, A);
  // premier plan : herbes hautes, fleurs
  fl_flowers(2, 392, 266, 470, { env: E, t, seed: 8, density: 0.9, zmin: 0.95, zmax: 1.5, depth: 0.1 });
  fl_grassFg(t, { env: E, kind: 'spring', side: 'both', h: 96, n: 30, seed: 2, dip: 0.8 });
  fl_grassFg(t, { env: E, kind: 'green', side: 'bottom', h: 44, n: 28, seed: 7, dip: 0.2 });
  // vie : papillons, rosée qui scintille, pollen dans la lumière, rayons
  k_butterfly(214 + 14 * Math.sin(u * 1.3), 262 + 9 * Math.sin(u * 2.3), t, { col: YE[2], col2: AM[6], flutter: 3, phase: 1 });
  k_butterfly(40 + 12 * Math.sin(u * 1.1 + 2), 300 + 10 * Math.sin(u * 2.9), t, { col: WH[3], col2: CY[3], flutter: 3, phase: 3 });
  k_butterfly(150 + 20 * Math.sin(u * 0.9), 248 + 6 * Math.sin(u * 3.3), t, { col: AM[7], col2: RD[3], flutter: 2, phase: 5, s: 1 });
  k_glints(t, { n: 30, y0: 244, y1: 380, col: WH[3], col2: AM[9], rate: 1.1, seed: 12 });
  k_glints(t, { n: 14, y0: 392, y1: 470, col: WH[3], col2: YE[3], rate: 0.9, seed: 5 });
  const sp = k_sunPos(FN_E, { h: FN_HZ - 44 });
  k_pollen(t, { n: 22, y0: 90, y1: 350, beam: { x: sp[0], y: sp[1], angle: Math.PI * 0.62, spread: 1.4, len: 420 } });
  k_rays(sp[0], sp[1], t, { angle: Math.PI * 0.62, spread: 1.5, len: 400, strength: 0.22, n: 9, col: AM[9] });
  k_vignetteWarm(0.34, { r0: 120, r1: 300 });
}

// « ? » flottants (pendant l'hésitation) puis grand « 1 · 2 · 3 ? » du carton (couleurs exactes)
function fn_ui(u, t) {
  const A = fn_A();
  for (let k = 0; k < 3; k++) { const c = fn_cardPos(k, t); if (c.vis) fn_cardUi(k, c, t); }
  // traits de secousse autour des cartes sur « surpris »
  for (let k = 0; k < 3; k++) {
    const c = fn_cardPos(k, t); if (!c.vis || !(c.env > 0.25)) continue;
    const x = c.x, y = c.y, on = Math.floor(t * 22 + k) % 2 === 0, col = on ? YE[3] : WH[3];
    for (const sd of [-1, 1]) { const bx = sd < 0 ? x - 4 : x + FN_CW + 3; lineP(bx, y + 14, bx + sd * 5, y + 10, col, 1); lineP(bx, y + 24, bx + sd * 6, y + 24, col, 1); lineP(bx, y + 34, bx + sd * 5, y + 38, col, 1); }
  }
  // points d'interrogation : le grand pop sur « trois », le petit sur « anecdotes » ; ils s'éteignent sur « surpris »
  const gone = t >= A.tSur - 0.02 ? 1 : 0;
  const q1 = prog(t, A.tTrois - 0.04, A.tTrois + 0.3) * (1 - gone), q2 = prog(t, A.tAnec - 0.02, A.tAnec + 0.28) * (1 - gone);
  if (q1 > 0) { const y = 238 - Math.round((eob(q1) - 1) * -10) + Math.round(Math.sin(t * 4) * 2); ptextC('?', 196, y, WH[3], q1 < 0.3 ? 2 : 4, fn_INK); }
  if (q2 > 0) { const y = 252 + Math.round(Math.sin(t * 4.6 + 1) * 2); ptextC('?', 226, y, AM[8], q2 < 0.3 ? 1 : 3, fn_INK); }
  // carton final : une teinte par carte, lettres qui tombent l'une après l'autre
  const items = [['1', CY[3], CY[1], 5], ['·', WH[3], ST[4], 5], ['2', RD[4], RD[1], 5], ['·', WH[3], ST[4], 5], ['3', AM[8], AM[4], 5], ['?', WH[3], ST[4], 5]];
  const gap = 9; let tw = -gap; for (const it of items) tw += textW(it[0], it[3]) + gap;
  let x = Math.round(135 - tw / 2);
  items.forEach((it, i) => {
    const p = prog(t, A.tEnd + 0.05 + 0.09 * i, A.tEnd + 0.05 + 0.09 * i + 0.3);
    if (p > 0 && it[0] === '·') { const y = 22 - Math.round((1 - eob(p)) * 46) + (p >= 1 ? Math.round(Math.sin(t * 3 + i * 0.9) * 1) : 0); R(x + 2, y + 14, 11, 11, fn_INK); R(x + 3, y + 15, 9, 9, it[1]); R(x + 3, y + 15, 9, 2, WH[3]); R(x + 3, y + 21, 9, 3, ST[5]); }
    else if (p > 0) { const y = 22 - Math.round((1 - eob(p)) * 46) + (p >= 1 ? Math.round(Math.sin(t * 3 + i * 0.9) * 1) : 0); ptext(it[0], x, y + 3, it[2], it[3], fn_INK); ptext(it[0], x, y, it[1], it[3], fn_INK); }
    x += textW(it[0], it[3]) + gap;
  });
}

function fn_events(A) {
  const ev = [];
  ev.push([A.t0 + 0.02, 'wind', 2.5], [A.t0 + 0.35, 'bird', 1], [A.t0 + 0.04, 'scribble', 0.35]);
  ev.push([A.tA + 0.04, 'page', 1]);
  A.rise.forEach((r, k) => { ev.push([r, 'pop', 1]); ev.push([r + 0.3, 'sparkle', 1]); });
  ev.push([A.tTrois - 0.02, 'pop', 1], [A.tAnec - 0.02, 'pop', 1]);
  ev.push([A.tLaq + 0.2, 'whoosh', 0.3], [A.tTrois + 0.9, 'bird', 2]);
  ev.push([A.tSur - 0.02, 'reveal', 1], [A.tSur, 'whoosh', 0.5], [A.tSur + 0.05, 'sparkle', 1], [A.tSur + 0.15, 'sparkle', 1], [A.tSur + 0.25, 'sparkle', 1]);
  ev.push([A.tEnd + 0.05, 'endCard', 1], [A.tEnd + 0.6, 'bird', 3]);
  return ev.filter(e => e[0] >= A.t0 && e[0] <= A.t1 - 0.02).sort((a, b) => a[0] - b[0]);
}

function buildFin(S) {
  const A = fn_A();
  shot('fin_choix', S.t0, { draw: fn_draw, ui: fn_ui, ev: fn_events(A) });
}

// préchauffage : les sprites de la prairie et des cartes se construisent une fois avant le premier plan
INITS.push(() => { const A = fn_A(); for (const t of [A.tA + 0.5, A.tEnd + 1]) fn_draw(t - A.t0, t); fn_ui(1, A.tEnd + 1); clearL(); });
