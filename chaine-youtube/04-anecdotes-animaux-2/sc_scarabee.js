'use strict';
/* ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════
   sc_scarabee.js — segment SCARABÉE BOMBARDIER (SEG.sca ; phrases b1 à b4 ; préfixe sb_), 7 plans calés sur la voix
     b1_chaud   prairie dorée au ras du sol : le scarabée marche (caméra qui le suit), le thermomètre monte à 100 °C   « Tu savais qu'un petit scarabée pouvait projeter du liquide à 100 degrés ? »
     b2_nom     il se redresse fièrement, étiquette de nom                                                            « C'est le cas du scarabée bombardier ! »
     b3_proie   le crapaud saute dans le cadre, le scarabée se fige, le crapaud lance la langue                       « Lorsqu'un prédateur l'attaque, »
     b3_coupe   planche du carnet : coupe de l'abdomen, deux réservoirs qui se vident dans la chambre de réaction     « il mélange deux substances chimiques dans son abdomen »
     b3_boum    gros plan de la chambre : enzymes, éclair, thermomètre, étoile d'explosion                             « et provoque une véritable petite explosion ! »
     b4_jet     retour au réel : la pointe se recourbe, le jet pulsé brûlant frappe le crapaud qui se cabre             « Il projette alors un jet brûlant et irritant »
     b4_fuite   le crapaud s'enfuit en secouant la tête, le scarabée repart tranquillement ; case 1/3 cochée            « pour faire fuir son ennemi ! »
   Tout est calé sur wt() / wt1() (sb_A : instants absolus des mots, remplis par buildScarabee) : aucune seconde écrite en dur pour un mot ; les coupes tombent 0,10 s avant un début de mot.
   Les durées des mouvements (cycle de marche, saut, jet) sont fixes, leur DÉPART est calé sur la voix. Sprites : sc_scarabee_sprites.js.
   ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════ */

const sb_GY = 330;                                                           // ligne de sol (pieds du scarabée)
const sb_A = {};                                                             // instants absolus des mots (remplis par buildScarabee ; valeurs de repli pour le préchauffage)
// instant d'un mot, avec repli sur le rang du mot (la graphie « 100 » / « cent » peut changer avec la vraie voix)
function sb_w(id, txt, k = 0, fb = 0, end = false) {
  try { return end ? wt1(id, txt, k) : wt(id, txt, k); } catch (e) { const w = P[id].words[Math.min(fb, P[id].words.length - 1)]; return end ? w.t1 : w.t0; }
}
const sb_rel = (name, sh) => (sb_A[name] ?? 0) - ((sh && sh.t0) || 0);

// ───────────── décor : prairie de fin de journée vue au ras du sol, lumière dorée rasante venue de la droite ─────────────
function sb_wrap(x, cam, par = 1, W = 440) { return ((x - cam * par) % W + W) % W - 80; }
function sb_scene(u, t, cam, o = {}) {
  const gy = o.gy ?? sb_GY, E = 'savannaDawn';
  vgrad(0, 0, LW, gy, [[0, AM[4]], [0.3, AM[6]], [0.62, AM[8]], [1, AM[9]]]);
  rgrad(228 - cam * 0.03, 170, 4, 118, [[0, 'rgba(255,242,196,1)'], [0.3, 'rgba(255,224,138,0.8)'], [0.65, 'rgba(255,200,74,0.4)'], [1, 'rgba(255,170,42,0)']], 1, 'source-over');
  { const r = rng(21); L.save(); for (let i = 0; i < 28; i++) { const x = sb_wrap(r() * 440, cam, 0.04 + r() * 0.06), y = 20 + r() * 200, rad = 3 + r() * 9; L.globalAlpha = 0.07 + r() * 0.12; L.fillStyle = r() < 0.5 ? '#fff2c4' : '#ffc84a'; L.beginPath(); L.arc(x, y, rad, 0, TAU); L.fill(); } L.restore(); }
  // prairie lointaine floue (le défilement des bandes est borné par flore.js : on lui donne une caméra réduite)
  vgrad(0, gy - 90, LW, 92, [[0, 'rgba(120,150,56,0)'], [0.35, 'rgba(120,156,56,0.55)'], [1, 'rgba(52,80,26,0.95)']]);
  fl_savannaGrass(gy - 60, gy - 6, { t, cam: clamp(cam * 0.3, -100, 100), bands: 3, h: 44, depth: 0.7, depthNear: 0.4, seed: 5, green: true, env: E });
  k_haze(gy - 96, gy - 20, '#ffe08a', 0.4, { t, cam: cam * 0.3, profile: 'bottom' });
  vgrad(0, gy - 30, LW, 32, [[0, 'rgba(52,80,26,0)'], [0.6, 'rgba(40,62,18,0.9)'], [1, 'rgba(30,46,12,1)']]);
  // sol : terre brune accrochée par la lumière rasante, grains, cailloux, mousse, pousses (positions enroulées : le sol défile sans limite)
  vgrad(0, gy - 3, LW, LH - gy + 3, [[0, WO[4]], [0.05, WO[3]], [0.3, WO[2]], [1, WO[0]]]);
  L.fillStyle = 'rgba(255,200,74,0.55)'; L.fillRect(0, gy - 3, LW, 1); L.fillStyle = 'rgba(255,224,138,0.35)'; L.fillRect(0, gy - 2, LW, 1);
  { const r = rng(9); for (let i = 0; i < 300; i++) { const x = sb_wrap(r() * 440, cam), y = gy + r() * (LH - gy), a = 0.2 + r() * 0.45; L.fillStyle = r() < 0.55 ? WO[5] : WO[1]; L.globalAlpha = a; L.fillRect(Math.round(x), Math.round(y), 1 + Math.round(r() * 3 * (y - gy) / 100), 1); } L.globalAlpha = 1;
    for (let i = 0; i < 22; i++) { const x = sb_wrap(r() * 440, cam), y = gy + 4 + r() * 130, w = 2 + r() * 3.4 * (1 + (y - gy) / 60); sb_shadow(x - w * 0.8, y + 1, w * 1.7, w * 0.35, 0.3); ell(x, y, Math.round(w), Math.max(1, Math.round(w * 0.55)), WO[4]); ell(x - 1, y - 1, Math.max(1, Math.round(w * 0.7)), Math.max(1, Math.round(w * 0.35)), WO[6]); } }
  for (const [x0, y0, w, k] of [[30, 12, 46, 0], [250, 26, 60, 1], [330, 8, 38, 0]]) { const x = sb_wrap(x0, cam); if (k) fl_rock(x, gy + y0, w, w * 0.5, 'round', 4, { env: E, mat: 'warm', moss: 0.6, depth: 0.1 }); else fl_moss(x, gy + y0, w, { env: E, seed: 3, depth: 0.1 }); }
  for (const [x0, y0, h, sd] of [[110, 40, 26, 2], [380, 52, 30, 5]]) fl_ferns(t, { x: sb_wrap(x0, cam), y: gy + y0, h, n: 6, seed: sd, env: E, depth: 0.1, unfurl: 0.3 });
}
// grandes lames d'herbe floues au premier plan (silhouettes à contre-jour, liseré doré du côté du soleil) qui encadrent la scène
function sb_blades(t) {
  const defs = [[8, 52, 150, 13, -22, 1], [-6, 24, 262, 10, -10, 2], [262, 238, 168, 13, 16, 3], [280, 264, 96, 12, 10, 4], [246, 208, 296, 9, 12, 5]];
  for (const [x0, x1, y1, w0, bend, sd] of defs) {
    const y0 = 490, sway = k_wind(t, x0, sd) * 5 * (1 - (y1 - 90) / 400), pts = [];
    for (let k = 0; k <= 16; k++) { const f = k / 16, c = [x0 + (x1 - x0) * 0.25 + bend, lerp(y0, y1, 0.55)], p = bez([x0, y0], c, [x1 + sway, y1], f), w = w0 * Math.pow(1 - f, 0.85) + 0.4; pts.push([p, w]); }
    const left = [], right = [];
    for (let k = 0; k < pts.length; k++) { const a = pts[Math.max(0, k - 1)][0], b = pts[Math.min(pts.length - 1, k + 1)][0], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l, w = pts[k][1]; left.push([pts[k][0][0] - nx * w / 2, pts[k][0][1] - ny * w / 2]); right.push([pts[k][0][0] + nx * w / 2, pts[k][0][1] + ny * w / 2]); }
    L.fillStyle = LM[0]; L.beginPath(); left.forEach((q, i) => i ? L.lineTo(q[0], q[1]) : L.moveTo(q[0], q[1])); right.reverse().forEach(q => L.lineTo(q[0], q[1])); L.closePath(); L.fill();
    L.strokeStyle = AM[8]; L.globalAlpha = 0.8; L.lineWidth = 1; L.beginPath(); right.forEach((q, i) => i ? L.lineTo(q[0] + 0.5, q[1]) : L.moveTo(q[0] + 0.5, q[1])); L.stroke(); L.globalAlpha = 1;
    L.strokeStyle = LM[2]; L.globalAlpha = 0.7; L.beginPath(); left.slice(0, 11).forEach((q, i) => i ? L.lineTo(q[0] + 2, q[1]) : L.moveTo(q[0] + 2, q[1])); L.stroke(); L.globalAlpha = 1;
  }
}
// avant-plan fixe (collé au cadre) : herbes en bordure, pollen, poussière dorée, vignette chaude
function sb_fg(u, t, cam, o = {}) {
  sb_blades(t);
  fl_grassFg(t, { env: 'savannaDawn', kind: 'gold', side: 'bottom', h: 62, n: 24, seed: 8, cam: 0 });
  k_pollen(t, { n: 46, y0: 40, y1: 330, cam, par: 0.8 });
  k_dust(t, { n: 14, y0: 60, y1: 300, cam, seed: 9, par: 0.6 });
  k_vignetteWarm(0.38);
}
function sb_hud(u, t, sh, o = {}) {                                                   // cases du carnet (1/3 allumée) et lieu
  if (o.first) { hudTracker(0, 0, prog(u, 0.1, 0.6)); if (u > 0.3) hudLieu(0, Math.ceil((u - 0.3) * 30)); }
  else { hudTracker(0, 0, 1); hudLieu(0); }
}
const sb_ptag = (x, y, s, style, n, center) => n > 0 ? tagBox(x, y, s, style, n, center) : 0;   // étiquette qui se « tape » (n caractères)
// distance parcourue (unités) d'un marcheur qui ralentit : plein régime jusqu'à a, ralentit jusqu'à b, arrêt
function sb_dist(u, a, b) { const x = prog(u, a, b), ue = u <= a ? u : a + (b - a) * (x - x * x * x + x * x * x * x / 2); return sb_WALK.speed * (u <= b ? ue : a + (b - a) * 0.5); }

// ───────────── les plans ─────────────
function buildScarabee(S) {
  const A = sb_A, w = sb_w;
  A.liquide = w('b1', 'liquide', 0, 8); A.a = w('b1', 'à', 0, 9); A.cent = (() => { try { return wt('b1', '100'); } catch (e) { return w('b1', 'cent', 0, 10); } })(); A.cent1 = (() => { try { return wt1('b1', '100'); } catch (e) { return w('b1', 'cent', 0, 10, true); } })();
  A.scar2 = w('b2', 'scarabée', 0, 4); A.bomb = w('b2', 'bombardier', 0, 5); A.bomb1 = w('b2', 'bombardier', 0, 5, true);
  A.pred = w('b3', 'prédateur', 0, 1); A.att = w('b3', "l'attaque", 0, 2); A.il3 = w('b3', 'il', 0, 3); A.mel = w('b3', 'mélange', 0, 4); A.deux = w('b3', 'deux', 0, 5); A.subs = w('b3', 'substances', 0, 6); A.chim = w('b3', 'chimiques', 0, 7);
  A.dans = w('b3', 'dans', 0, 8); A.abd = w('b3', 'abdomen', 0, 10); A.et3 = w('b3', 'et', 0, 11); A.prov = w('b3', 'provoque', 0, 12); A.verit = w('b3', 'véritable', 0, 14); A.petite = w('b3', 'petite', 0, 15); A.expl = w('b3', 'explosion', 0, 16); A.expl1 = w('b3', 'explosion', 0, 16, true);
  A.il4 = w('b4', 'il', 0, 0); A.proj = w('b4', 'projette', 0, 1); A.jet = w('b4', 'jet', 0, 4); A.brul = w('b4', 'brûlant', 0, 5); A.irr = w('b4', 'irritant', 0, 7); A.pour = w('b4', 'pour', 0, 8); A.fuir = w('b4', 'fuir', 0, 10); A.enn = w('b4', 'ennemi', 0, 12); A.enn1 = w('b4', 'ennemi', 0, 12, true);
  const cut = x => x - 0.1;                                                           // la coupe tombe 0,10 s avant le mot
  const T = { b1: S.t0, b2: cut(w('b2', "C'est", 0, 0)), b3a: cut(w('b3', "Lorsqu'un", 0, 0)), b3b: cut(A.il3), b3c: cut(A.et3), b4a: cut(A.il4), b4b: cut(A.pour) };

  // ═════ b1_chaud : le scarabée marche, la caméra le suit ; le thermomètre apparaît sur « liquide », monte sur « à 100 » ═════
  {
    const tTop = A.cent + 0.28, tRise = A.a - 0.04;                                    // le niveau atteint 100 juste après le mot « 100 »
    const steps = []; for (let k = 0; k < 9; k++) steps.push([T.b1 + 0.08 + k * sb_WALK.T, 'step', 0.5]);
    const ev = [[A.liquide, 'pop', 1], [tRise, 'heat', tTop - tRise + 0.3], [A.cent, 'label', 1], [tTop, 'steam', 1.1], [tTop, 'bubbles', 1.2], [tTop, 'ding', 1], ...[1, 2, 3, 4, 5].map(k => [lerp(tRise, tTop, k / 6), 'counter', k]), ...steps.filter(e => e[0] < T.b2 - 0.2)];
    shot('b1_chaud', T.b1, {
      draw(u, t, sh) {
        const d = sb_WALK.speed * u, sc = 2.0, bx = 88 + 10 * u, cam = d * sc - (bx - 88);
        sb_scene(u, t, cam);
        sb_beetle(bx, sb_GY + 7, sc, t, { pose: 'walk', ph: sb_walkPh(d) });
        sb_fg(u, t, cam);
      },
      ui(u, t, sh) {
        sb_hud(u, t, sh, { first: true });
        const slide = 1 - eo(prog(t, A.liquide - 0.05, A.liquide + 0.3)), v = eio(prog(t, tRise, tTop)), temp = Math.round(20 + 80 * v), x0 = 214 + slide * 70;
        if (slide < 1) {
          const q = sb_thermo(x0, 98, 188, v, t, { flask: true, bubbles: 2 + 8 * v });
          if (t >= A.a - 0.15) counter(x0 - 36 + 4, 62 + 0, temp + '°C', 2, v >= 1 ? '#fff09a' : '#ff5a48');
        }
        if (t >= A.cent) sb_ptag(8, 40, "JUSQU'À ≈ 100 °C", 'red', Math.ceil((t - A.cent) * 60));
      },
      ev,
    });
  }

  // ═════ b2_nom : il se redresse fièrement, étiquette de nom ═════
  {
    const ev = [[A.scar2, 'whoosh', 0.3], [A.scar2 + 0.05, 'step', 0.6], [A.scar2 + 0.1, 'label', 1], [A.bomb + 0.12, 'sparkle', 1], [A.bomb + 0.05, 'blip', 1]];
    shot('b2_nom', T.b2, {
      draw(u, t, sh) {
        const cam = 8 * u, up = eob(prog(t, A.scar2 - 0.1, A.scar2 + 0.42)), flick = bump(t, A.bomb + 0.02, A.bomb + 0.12, A.bomb + 0.22, A.bomb + 0.42) * 0.5;
        sb_scene(u, t, cam);
        const m = sb_beetle(108 - 3 * u, sb_GY + 8, 2.2, t, { pose: 'stand', up: clamp(up, 0, 1.12), tip: flick, sheen: ((t - A.bomb) * 1.5 + 0.1) });
        // éclat sur le dos au moment où le nom est prononcé
        const g = bump(t, A.bomb + 0.1, A.bomb + 0.2, A.bomb + 0.3, A.bomb + 0.55);
        if (g > 0.02) { const bx = Math.round(m.back[0] + 14), by = Math.round(m.back[1] + 2), r = Math.round(2 + 6 * g); for (let k = -r; k <= r; k++) { px(bx + k, by, WH[3]); px(bx, by + k, WH[3]); } for (let k = -(r >> 1); k <= (r >> 1); k++) { px(bx + k, by + k, YE[3]); px(bx + k, by - k, YE[3]); } }
        sb_fg(u, t, cam);
      },
      ui(u, t, sh) {
        sb_hud(u, t, sh);
        sb_ptag(135, 88, 'SCARABÉE BOMBARDIER', 'amber', Math.ceil((t - A.scar2 - 0.1) * 40), true);
      },
      ev,
    });
  }

  // ═════ b3_proie : le crapaud saute dans le cadre, le scarabée se fige, le crapaud lance la langue ═════
  {
    const tHop0 = T.b3a, hopDur = 0.62, tLand = tHop0 + hopDur, tLunge = A.att - 0.12;
    const ev = [[tHop0 + 0.2, 'whoosh', 0.3], [tLand, 'hop', 1], [tLand + 0.04, 'ribbit', 0.8], [tLunge + 0.1, 'whoosh', 0.2], [A.att + 0.14, 'splat', 1], [A.att + 0.02, 'suspense', 0.8]];
    shot('b3_proie', T.b3a, {
      draw(u, t, sh) {
        sb_scene(u, t, 0);
        const hp = clamp((t - tHop0) / hopDur), cx = 312 + 110 - sb_toadHopX(hp, 110);
        const lunge = sm(prog(t, tLunge, tLunge + 0.2)) * (1 - 0.0), tg = sm(prog(t, A.att + 0.02, A.att + 0.14)) * 0.4 * (1 - sm(prog(t, A.att + 0.3, A.att + 0.5)));
        sb_toad(cx, 350, 1.9, t, { flip: true, hop: hp < 1 ? hp : undefined, lunge: lunge * (1 - sm(prog(t, A.att + 0.34, A.att + 0.6)) * 0.5), tongue: tg, seed: 5 });
        // le scarabée marche, ralentit à l'arrivée du crapaud, se fige ; la pointe commence à se redresser
        const dd = sb_dist(u, 0.35, 0.7), bx = 40 + dd * 1.4;
        const aimK = 0.62 * sm(prog(t, A.att - 0.08, A.att + 0.35)), up = 0.0;
        sb_beetle(bx, sb_GY + 7, 1.4, t, { pose: 'walk', ph: sb_walkPh(dd), settle: prog(u, 0.4, 0.78), aimK, tip: aimK * 0.9 });
        sb_fg(u, t, 0);
      },
      ui(u, t, sh) { sb_hud(u, t, sh); },
      ev,
    });
  }

  // ═════ b3_coupe : planche du carnet, coupe de l'abdomen : deux réservoirs → chambre de réaction ═════
  {
    const ev = [[A.mel, 'blip', 1], [A.mel + 0.05, 'drip', 0.8], [A.mel + 0.4, 'drip', 0.5], [A.mel + 0.8, 'drip', 0.6], [A.deux, 'label', 1], [A.subs, 'label', 1], [A.chim + 0.1, 'whoosh', 0.4], [A.abd, 'pop', 1]];
    shot('b3_coupe', T.b3b, {
      draw(u, t, sh) {
        const zoom = 1.08 + 0.14 * eio(prog(t, T.b3b, T.b3c)), flow = eio(prog(t, A.mel, A.mel + 1.0)) * 1.15, mix = sm(prog(t, A.mel + 0.9, A.mel + 2.2)) * 0.6, fill = 0.92 - 0.3 * prog(t, A.mel, A.mel + 1.8);
        const hl = t >= A.chim ? 'both' : t >= A.subs ? 'B' : t >= A.deux ? 'A' : null;
        sh.cut = sb_cutaway(t, { fill, flow, mix, enz: 0.25 + 0.2 * Math.sin(t * 4), heat: 0.06 + 0.1 * mix, hl }, { zoom, fx: 135, fy: 190, cx: 135, cy: 208 });
      },
      ui(u, t, sh) {
        const c = sh.cut; if (!c) return;
        const a = c.pA, b = c.pB;
        if (t >= A.deux) { const wA = sb_ptag(a[0] - 40, 22, 'HYDROQUINONE', 'amber', Math.ceil((t - A.deux) * 60)); if (wA) { R(Math.round(a[0]), 36, 1, Math.round(a[1] - a[3] - 36 - 4 * c.z), AM[8]); } }
        if (t >= A.subs) { const wB = sb_ptag(b[0] - 40, 22, 'EAU OXYGENEE', 'blue', Math.ceil((t - A.subs) * 60)); if (wB) { R(Math.round(b[0]), 36, 1, Math.round(b[1] - b[3] - 36 - 4 * c.z), CY[4]); } }
      },
      ev,
    });
  }

  // ═════ b3_boum : gros plan de la chambre : enzymes, éclair, la température monte, étoile d'explosion ═════
  {
    const tFlash = A.prov, tBoom = A.expl, tEnd = T.b4a;
    const ev = [[A.prov - 0.02, 'suspense', A.expl - A.prov + 0.1], [A.prov, 'heat', A.expl - A.prov + 0.2], [A.prov + 0.02, 'sparkle', 1], [A.verit, 'counter', 1], [A.petite, 'counter', 2], [tBoom, 'bang', 1.5], [tBoom + 0.05, 'reveal', 1], [tBoom + 0.18, 'steam', 1.0]];
    shot('b3_boum', T.b3c, {
      draw(u, t, sh) {
        const zoom = lerp(1.7, 2.1, eio(prog(t, T.b3c, tBoom))), heat = lerp(0.2, 0.92, sm(prog(t, A.prov, tBoom))), enz = sm(prog(t, A.et3, A.prov + 0.2));
        const flash = Math.max(0.9 * bump(t, A.prov, A.prov + 0.05, A.prov + 0.2, A.prov + 0.42), 0.6 * bump(t, A.petite - 0.05, A.petite, A.petite + 0.08, A.petite + 0.26)) * 1.0;
        const boom = prog(t, tBoom, tBoom + 0.3), fade = prog(t, tBoom + 0.5, tEnd - 0.02);
        const shake = 0.4 + 3.5 * sm(prog(t, A.prov, tBoom)) - 3 * sm(prog(t, tBoom, tBoom + 0.4));
        sh.cut = sb_cutaway(t, { fill: 0.55, flow: 1.2, mix: 1, enz, heat: t >= tBoom ? 1 : heat, flash: t >= tBoom ? 0.7 * (1 - boom) : flash, boom, boomFade: fade, jet: t >= tBoom + 0.3 ? 1 : 0 }, { zoom, fx: 135, fy: 218, cx: 135, cy: 190, shake: Math.max(0, shake) });
        // éblouissement blanc sur les deux premières images de l'explosion
        const wf = bump(t, tBoom - 0.01, tBoom + 0.01, tBoom + 0.07, tBoom + 0.17) * 0.9; if (wf > 0.02) { L.fillStyle = `rgba(255,255,235,${wf})`; L.fillRect(0, 0, LW, LH); }
      },
      ui(u, t, sh) {
        const heat = t >= tBoom ? 1 : lerp(0.2, 0.92, sm(prog(t, A.prov, tBoom)));
        sb_thermo(10, 96, 190, heat, t, { hot: heat > 0.8 ? 1 : 0 });
        counter(54, 62, Math.round(20 + 80 * heat) + '°C', 2, heat > 0.95 ? '#fff09a' : '#ff5a48');
        if (t >= A.prov) { const c = sh.cut; sb_ptag(160, 30, 'ENZYMES', 'green', Math.ceil((t - A.prov) * 60)); if (c) { const ex = c.cham[0] + Math.cos(-2.2) * (c.cham[2] - 8.5 * c.z), ey = c.cham[1] + Math.sin(-2.2) * (c.cham[3] - 8.5 * c.z); lineP(176, 44, ex + 2, ey - 2, LM[5], 1); } }
      },
      ev,
    });
  }

  // ═════ b4_jet : la pointe se recourbe, le jet pulsé brûlant frappe le crapaud ═════
  {
    const tFire = A.proj + 0.22, tHit = tFire + 0.24, tEnd = T.b4b;
    const ev = [[A.proj, 'suspense', 0.3], [tFire, 'steam', 1.6], [tFire, 'bang', 0.7], [tFire + 0.12, 'whoosh', 0.5], [tHit, 'splat', 1], [tHit + 0.05, 'steam', 1.0], [tHit + 0.18, 'ribbit', 1.3], [tHit + 0.5, 'shake', 1], [tHit + 0.75, 'shake', 1], [tHit + 1.0, 'shake', 1]];
    shot('b4_jet', T.b4a, {
      draw(u, t, sh) {
        const sc = 1.45, bx = 66, by = sb_GY + 8, camS = 3 * bump(t, tHit, tHit + 0.05, tHit + 0.2, tHit + 0.5) * Math.sin(t * 70);
        sb_scene(u, t, 0);
        const rec = eob(prog(t, tHit, tHit + 0.34)), unl = 1 - sm(prog(t, tHit, tHit + 0.18)), sk = prog(t, tHit + 0.28, tHit + 1.5), shake = Math.sin((t - tHit) * 40) * (1 - sk) * (t > tHit + 0.28 ? 1 : 0);
        const tg = 0.34 * (1 - sm(prog(t, T.b4a, T.b4a + 0.25))) * unl, cxT = 276 + 16 * sm(prog(t, tHit + 0.1, tHit + 0.7)) + camS;
        const toad = sb_toad(cxT, 350, 1.9, t, { flip: true, lunge: 1 * unl, tongue: tg, recoil: rec * 0.95, shake, seed: 5, mouth: 0.9 * unl });
        const fire = prog(t, tFire, tFire + 0.05) * (1 - prog(t, tFire + 1.5, tFire + 1.65));
        const tipK = 0.72 + 0.28 * sm(prog(t, A.il4, A.proj + 0.12));
        const m = sb_beetle(bx + camS * 0.5, by, sc, t, { pose: 'aim', aimK: 1, tip: tipK, aim: -0.3, hot: sm(prog(t, T.b4a, A.proj + 0.2)) * (1 - 0.5 * prog(t, tFire + 1.5, tFire + 1.8)), fire });
        const tgt = [toad.nose[0] - 6, toad.nose[1] + 4], ang = Math.atan2(tgt[1] - m.tip[1], tgt[0] - m.tip[0]);
        sb_jet(m.tip[0], m.tip[1], ang, t, tFire, { dur: 1.5, len: Math.hypot(tgt[0] - m.tip[0], tgt[1] - m.tip[1]) * 1.15, hz: 14, size: 1.7, gravity: 40, seed: 3 });
        sb_splashHit(tgt[0], tgt[1], t, tHit, { dir: -Math.PI * 0.55, size: 1.5, n: 16 });
        if (t > tHit + 0.1 && t < tHit + 1.7) sb_steam(toad.nose[0] + 4, toad.nose[1] - 4, t, { n: 6, w: 8, h: 50, a: 0.9 * (1 - prog(t, tHit + 1.2, tHit + 1.7)), size: 1.2, seed: 6 });
        sb_fg(u, t, 0);
      },
      ui(u, t, sh) { sb_hud(u, t, sh); },
      ev,
    });
  }

  // ═════ b4_fuite : le crapaud s'enfuit en secouant la tête, le scarabée repart tranquillement ; case 1/3 cochée ═════
  {
    const tH1 = T.b4b + 0.1, tH2 = tH1 + 0.7, hopDur = 0.62, tTick = A.enn1 + 0.12;
    const ev = [[tH1 + 0.2, 'hop', 1], [tH1 + 0.45, 'step', 1], [tH2 + 0.2, 'hop', 1], [tH2 + 0.45, 'step', 1], [T.b4b, 'shake', 1], [T.b4b + 0.35, 'shake', 1], [tTick, 'ding', 1], [tTick, 'pop', 1]];
    shot('b4_fuite', T.b4b, {
      draw(u, t, sh) {
        sb_scene(u, t, 0);
        // crapaud (de dos, il file vers la droite) : deux sauts, la tête qui se secoue, de plus en plus loin (petit et haut sur l'écran)
        const h1 = clamp((t - tH1) / hopDur), h2 = clamp((t - tH2) / hopDur), dist = 92;
        const cx = 214 + sb_toadHopX(h1, dist) + sb_toadHopX(h2, dist) + (t < tH1 ? 0 : 0), hp = t < tH1 ? undefined : (h1 < 1 ? h1 : (t >= tH2 ? h2 : undefined));
        const shk = Math.sin(t * 38) * 0.9 * (1 - prog(t, T.b4b, T.b4b + 1.0)), sq = 0.8 * (1 - prog(t, T.b4b + 0.4, T.b4b + 1.2));
        if (cx < 420) sb_toad(cx, 340, 1.7, t, { flip: false, hop: hp, shake: shk, squint: sq, mouth: 0.3 * (1 - prog(t, T.b4b, T.b4b + 0.7)), recoil: 0.35 * (1 - prog(t, T.b4b, T.b4b + 0.6)), seed: 5 });
        // vapeur qui s'attarde là où le crapaud a reçu le jet
        if (t < T.b4b + 1.1) sb_steam(206, 290, t, { n: 5, w: 6, h: 46, a: 0.8 * (1 - prog(t, T.b4b, T.b4b + 1.1)), seed: 8 });
        // le scarabée relâche sa pointe et repart tranquillement vers la gauche
        const dist2 = sb_WALK.speed * 0.5 * Math.max(0, u - 0.25), bx = 128 - dist2 * 1.9, relax = sm(prog(t, T.b4b, T.b4b + 0.55));
        sb_beetle(bx, sb_GY + 12, 1.9, t, { pose: 'walk', ph: sb_walkPh(dist2 * 0.0 + dist2), settle: 1 - sm(prog(u, 0.25, 0.55)), flip: true, aimK: 1 - relax, tip: 1 - relax, hot: 0.8 * (1 - sm(prog(t, T.b4b, T.b4b + 0.5))) });
        sb_fg(u, t, 0);
      },
      ui(u, t, sh) {
        sb_hud(u, t, sh);
        const p = prog(t, tTick, tTick + 0.35); if (p > 0) mark(8 + 18, 8 + 18, 'yes', p, 5);
      },
      ev,
    });
  }
}

// préchauffage : sprites en cache de flore.js (herbes, rochers, mousse), LUT des tons, tampons
INITS.push(() => { sb_scene(0, 1, 0); sb_scene(0, 1, 60); sb_fg(0, 1, 0); sb_beetle(100, 330, 1.5, 1, { pose: 'walk', ph: 0.3 }); sb_toad(150, 350, 1.5, 1, { flip: true, hop: 0.5 }); clearL(); });
