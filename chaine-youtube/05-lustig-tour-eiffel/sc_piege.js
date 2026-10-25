'use strict';
/* ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════
   sc_piege.js — segment « piege » (SEG.piege ; phrases c1 à c4 ; préfixe pg_), 7 plans calés sur la voix
     c1_groupe      le salon de l'hôtel : Lustig chuchote, les marchands se penchent ; Poisson, à droite, se frotte les mains    « L'un des marchands »
     c1_marchand    gros plan de Poisson, yeux brillants (éclat sur « piège »)                                                   « tombe dans le piège. »
     c2_affaire     Lustig et Poisson : il hoche la tête ; étiquette L'AFFAIRE DU SIECLE                                         « Convaincu de réaliser l'affaire du siècle, »
     c2_valise      la mallette tendue s'ouvre : liasses, pièces d'or qui s'envolent (coins)                                     « il remet une énorme somme d'argent »
     c2_vendue      le contrat sur la table : le tampon VENDUE s'écrase sur « Lustig », sourire en coin de Lustig               « à Lustig. »
     c3_decouverte  au pied de la tour, Poisson arrive, brandit son contrat ; le gardien secoue la tête                          « Mais quelques jours plus tard, il découvre la vérité. »
     c4_arnaque     stupeur (chapeau qui se soulève), le contrat tombe, ARNAQUE écrasé en rouge ; case 3/4 cochée                « Il vient de se faire arnaquer ! »
   Tout est calé sur wt() / wt1() (pg_A : instants absolus des mots, remplis par buildPiege) : aucune seconde de parole écrite en dur ; les coupes tombent 0,10 s avant un début de mot.
   Sprites : sc_lustig_sprites.js (lu_), sc_hotel_sprites.js (ho_), sc_paris_sprites.js (pa_).
   ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════ */

const pg_A = {};                                                             // instants absolus des mots (remplis par buildPiege)
function pg_w(id, txt, k = 0, end = false) {                                 // instant d'un mot, avec repli sur le rang si la graphie change
  try { return end ? wt1(id, txt, k) : wt(id, txt, k); } catch (e) { const w = P[id].words[Math.min(k, P[id].words.length - 1)]; return end ? w.t1 : w.t0; }
}
const pg_ptag = (x, y, s, style, n, center) => n > 0 ? tagBox(x, y, s, style, n, center) : 0;
// cases du carnet : au début du segment la case 2 est cochée et la case 3 (LE PIEGE) s'allume ; 3/4 se coche à la fin
function pg_hud(u, first, checkT) {
  hudTracker(2, 2, first ? prog(u, 0.0, 0.4) : 1);
  if (first) { if (u > 0.3) hudLieu(2, Math.ceil((u - 0.3) * 30)); } else hudLieu(2);
  if (checkT !== undefined && u > checkT) mark(8 + 2 * 26 + 18, 8 + 18, 'yes', prog(u, checkT, checkT + 0.3), 5);
}
// le gardien de la tour : variante trapue de Poisson, casquette plate, uniforme bleu nuit, grosse moustache
const pg_GARDIEN = lu_variant(lu_SPEC_POISSON, 'gardien', {
  kx: 0.9, kz: 0.85, kh: 1.0, kHead: 1.0,
  mats: { jacket: lu_mat(NI[3], NI[4], NI[5], NI[2], NI[1]), lapel: lu_mat(NI[4], NI[5], BL[1], NI[3], NI[2]), vest: lu_mat(NI[4], NI[5], BL[1], NI[3], NI[2]), hat: lu_mat(NI[3], NI[4], NI[5], NI[2], NI[1]), ribbon: lu_mat(YE[0], YE[1], YE[2], AM[4], AM[4]), hair: lu_mat(ST[3], ST[4], ST[6], ST[2], ST[1]), tie: lu_mat(RD[1], RD[2], RD[3], RD[0], RD[0]) },
  set: { hat: { style: 'cap', seat: 6.2, back: -0.4 }, facial: { mous: 'walrus' }, eyeCol: ST[2], browCol: ST[2], blinkSeed: 81, mouthY: -8.2 },
});
INITS.push(() => { lu_prep(pg_GARDIEN); });

// mallette tenue par la poignée en (x, y) : la mallette pend dessous (le bas de la face avant est à 40 px de la poignée à s = 1)
function pg_caseAt(x, y, s, t, o) { return ho_mallette(x, y + 38 * s, s, t, o); }

function buildPiege(S) {
  // ───── instants calés sur la voix
  pg_A.tombe = pg_w('c1', 'tombe'); pg_A.piege = pg_w('c1', 'piège'); pg_A.convaincu = pg_w('c2', 'Convaincu'); pg_A.affaire = pg_w('c2', "l'affaire"); pg_A.siecle = pg_w('c2', 'siècle');
  pg_A.il2 = pg_w('c2', 'il'); pg_A.remet = pg_w('c2', 'remet'); pg_A.somme = pg_w('c2', 'somme'); pg_A.argent = pg_w('c2', "d'argent"); pg_A.a = pg_w('c2', 'à'); pg_A.lustig = pg_w('c2', 'Lustig');
  pg_A.mais = pg_w('c3', 'Mais'); pg_A.jours = pg_w('c3', 'jours'); pg_A.decouvre = pg_w('c3', 'découvre'); pg_A.verite = pg_w('c3', 'vérité');
  pg_A.il = pg_w('c4', 'Il'); pg_A.vient = pg_w('c4', 'vient'); pg_A.arnaquer = pg_w('c4', 'arnaquer');
  const CUT = 0.10, tc1 = pg_A.tombe - CUT, tc2 = pg_A.convaincu - CUT, tc3 = pg_A.il2 - CUT, tc4 = pg_A.a - CUT, tc5 = pg_A.mais - CUT, tc6 = pg_A.il - CUT;
  const rel = (name, sh) => pg_A[name] - sh.t0;                              // instant d'un mot relatif au plan (u)

  // ═════ 1. c1_groupe : le salon, Lustig chuchote, les marchands se penchent vers lui
  shot('c1_groupe', S.t0, {
    draw(u, t, sh) {
      const lean = 0.55 + 0.25 * prog(u, 0, 0.9), push = 1 + 0.03 * prog(u, 0, 1);
      ho_salon(t, { view: 'wide', layer: 'back', light: 0.9, cam: 0 });
      lu_groupe(150, 318, 1.12 * push, t, { lean, aim: -150, murmur: 1, nod: 0.2, light: 0.2 });
      lu_marchand(238, 322, 1.2 * push, t, { pose: 'eager', u: 0.4 + u, crop: 'waist', flip: true, yaw: 0.85, light: 0.2 });
      ho_table(148, 336, 1.12, t, { items: { carafes: 1, verres: 4, papiers: 2 } });
      lu_lustig(36, 376, 1.6 * push, t, { pose: 'whisper', u: 0.5 + u, yaw: 1.05, light: 0.2, shadow: 0.3 });
      ho_salon(t, { view: 'wide', layer: 'front', light: 0.9, cam: 0 });
    },
    ui(u, t, sh) { pg_hud(u, true); },
    ev: [[S.t0 + 0.08, 'pop'], [S.t0 + 0.34, 'label']],
  });

  // ═════ 2. c1_marchand : gros plan, yeux brillants ; éclat sur « piège »
  let eyeA = null;
  shot('c1_marchand', tc1, {
    draw(u, t, sh) {
      ho_salon(t, { view: 'close', light: 1 });
      const s = 3.1 + 0.25 * prog(u, 0, 1.4);
      eyeA = lu_marchand(130, 330 + 8 * prog(u, 0, 1.4), s, t, { pose: 'eager', u: 1 + u, crop: 'waist', yaw: 0.75, light: 0.6, rim: AM[9] });
      k_vignetteWarm(0.3);
    },
    ui(u, t, sh) {
      pg_hud(u, false);
      const ts = t - pg_A.piege;
      if (eyeA && ts > -0.02 && ts < 0.5) {                                  // éclat dans les yeux : petite étoile à quatre branches
        const k = ts < 0.12 ? ts / 0.12 : 1 - (ts - 0.12) / 0.38, r = Math.max(1, Math.round(5 * k)), ex = Math.round(eyeA.eye[0]), ey = Math.round(eyeA.eye[1]), d = Math.round(eyeA.scale * 4.4);
        for (const dx of [-d, d]) { R(ex + dx - r, ey, r * 2 + 1, 1, WH[3]); R(ex + dx, ey - r, 1, r * 2 + 1, WH[3]); px(ex + dx, ey, YE[3]); }
      }
    },
    ev: [[pg_A.piege, 'sparkle']],
  });

  // ═════ 3. c2_affaire : Lustig souffle l'affaire du siècle, Poisson hoche la tête
  shot('c2_affaire', tc2, {
    draw(u, t, sh) {
      ho_salon(t, { view: 'close', light: 1 });
      const nod = 0.05 * Math.max(0, Math.sin(TAU * 1.9 * (u - 0.3))) * prog(u, 0.2, 0.4);
      lu_lustig(66, 362, 2.6, t, { pose: 'whisper', u: 1, crop: 'waist', yaw: 1.05, light: 0.6, bend: -0.03 });
      lu_marchand(208, 372, 2.6, t, { pose: 'eager', u: 1.5 + u, crop: 'waist', flip: true, yaw: 1.0, light: 0.6, bend: nod });
      k_vignetteWarm(0.3);
    },
    ui(u, t, sh) {
      pg_hud(u, false);
      pg_ptag(135, 52, "L'AFFAIRE DU SIECLE", 'amber', Math.ceil((t - pg_A.affaire) * 30), true);
    },
    ev: [[pg_A.affaire, 'label']],
  });

  // ═════ 4. c2_valise : la mallette s'ouvre, les liasses et les pièces s'envolent
  shot('c2_valise', tc3, {
    draw(u, t, sh) {
      const op = prog(t, pg_A.somme - 0.15, pg_A.somme + 0.3);
      ho_salon(t, { view: 'wide', layer: 'back', light: 0.9 });
      lu_lustig(72, 372, 1.4, t, { pose: 'handshake', u: 0.4 + u, yaw: 1.2, light: 0.4, reachY: 100 });
      lu_marchand(208, 372, 1.4, t, { pose: 'handover', u: 0.2 + u, flip: true, yaw: 1.15, light: 0.4, hold: (x, y, info) => pg_caseAt(x, y, 1.0, t, { open: op, glow: op, bills: 1 }) });
      ho_salon(t, { view: 'wide', layer: 'front', light: 0.9 });
      if (t > pg_A.somme) ho_billets(140, 250, 1, t, { kind: 'pieces', n: 12, vy: -80, spread: 50, t0: pg_A.somme, loop: false, life: 1.4 });
    },
    ui(u, t, sh) { pg_hud(u, false); },
    ev: [[pg_A.somme, 'coins', 1.0], [pg_A.somme - 0.1, 'glow', 0.6]],
  });

  // ═════ 5. c2_vendue : le contrat est tamponné VENDUE à « Lustig » ; sourire en coin
  const tStamp = () => pg_A.lustig + 0.04;
  shot('c2_vendue', tc4, {
    draw(u, t, sh) {
      const h = ho_hit(t, tStamp());
      ho_salon(t, { view: 'close', light: 1 });
      L.save(); L.setTransform(1, 0, 0, 1, Math.round((Math.sin(t * 90) * 2.2) * h), Math.round((Math.cos(t * 70) * 1.6) * h));
      ho_table(135, 360, 2.0, t, { items: { carafes: 0, verres: 0, papiers: 0 } });
      lu_lustig(96, 300, 2.5, t, { pose: 'smile', corner: true, crop: 'chest', yaw: 0.75, light: 0.6, bend: 0.04 });
      ho_contrat(52, 286, 166, 76, t, { sign1: 1, sign2: 1, seal: 1, rot: -0.03 });
      ho_tampon(135, 326, 0.9, t, tStamp(), { texte: 'VENDUE', view: 'pov', seed: 3, fall: 0.22, wind: 0.08 });
      L.restore();
    },
    ui(u, t, sh) { pg_hud(u, false); },
    ev: [[tStamp(), 'stamp', 1]],
  });

  // ═════ 6. c3_decouverte : quelques jours plus tard, au pied de la tour : Poisson arrive, brandit son contrat ; le gardien secoue la tête
  const D3 = { s: 1.7, x0: -44, v0: lu_WALK_P.speed * 1.7 * 0.997, ta: 1.0, tb: 1.55, F: 296 };
  const pg_dist = (u, v0, ta, tb) => { if (u <= ta) return v0 * u; const d = Math.min(u, tb) - ta, L_ = tb - ta; return v0 * ta + v0 * (d - d * d / (2 * L_)); };
  const pg_steps = (D, f) => { const out = []; let prev = 0; for (let u = 0; u <= D.tb; u += 0.01) { const k = Math.floor(lu_walkPh(f(u, D.v0, D.ta, D.tb) / D.s, lu_WALK_P) * 2); if (k > prev) { out.push(u); prev = k; } } return out; };
  shot('c3_decouverte', tc5, {
    draw(u, t, sh) {
      const info = pa_tourPied(t, { env: 'soir', F: D3.F, layer: 'back' }), y = D3.F + 66;
      const d = pg_dist(u, D3.v0, D3.ta, D3.tb), x = D3.x0 + d, stop = u >= D3.tb, m = prog(u, D3.tb - 0.25, D3.tb + 0.1);
      // gardien (à droite) : regarde Poisson, puis secoue la tête
      const gx = 214, gs = prog(u, D3.tb + 0.25, D3.tb + 0.5) * Math.sin(TAU * 1.7 * (u - D3.tb - 0.25));
      lu_figure(gx, y + 4, 1.6, t, { pose: 'stand', yaw: -0.7, flip: true, light: 0.8, lookX: 0.55 * gs, bend: 0.02 }, pg_GARDIEN);
      const o = stop ? { pose: 'walk', pose2: 'handshake', mix: m, ph: lu_walkPh(d / D3.s, lu_WALK_P), u: u - D3.tb + 0.3, yaw: 1.3, light: 0.8, pump: 1, reachY: 136, reachZ: 34,
        hold: (hx, hy, i) => ho_contrat(hx - 8, hy - 58, 44, 60, t, { sign1: 1, sign2: 1, seal: 1, stamp: 1, stampText: 'VENDUE', rot: 0.08 + 0.05 * Math.sin(t * 26) }) }
        : { pose: 'walk', ph: lu_walkPh(d / D3.s, lu_WALK_P), yaw: 1.3, light: 0.8 };
      lu_marchand(x, y, D3.s, t, o);
      pa_tourPied(t, { env: 'soir', F: D3.F, layer: 'front' });
    },
    ui(u, t, sh) { pg_hud(u, false); },
    ev: [[pg_A.decouvre, 'gasp']].concat(pg_steps(D3, pg_dist).map(u => [tc5 + u, 'step', 1])),
  });

  // ═════ 7. c4_arnaque : stupeur, le contrat tombe, ARNAQUE ; case 3/4 cochée
  shot('c4_arnaque', tc6, {
    draw(u, t, sh) {
      const h = ho_hit(t, pg_A.arnaquer);
      pa_tourPied(t, { env: 'soir', F: 330, layer: 'back' });
      L.save(); L.setTransform(1, 0, 0, 1, Math.round(Math.sin(t * 90) * 2.5 * h), Math.round(Math.cos(t * 70) * 2 * h));
      lu_marchand(135, 372, 2.5, t, { pose: 'shock', u: u + 0.12, crop: 'waist', yaw: 0.55, light: 0.8, tremble: 0.8 });
      const fp = prog(u, 0.25, 1.4);
      if (fp > 0) ho_contrat(190 - 30 * fp, 250 + 130 * fp * fp, 46, 62, t, { sign1: 1, sign2: 1, seal: 1, stamp: 1, stampText: 'VENDUE', rot: 0.5 * fp * Math.sin(t * 6) + 0.2 });
      L.restore();
      pa_tourPied(t, { env: 'soir', F: 330, layer: 'front' });
      ho_tampon(135, 322, 1.0, t, pg_A.arnaquer, { texte: 'ARNAQUE', view: 'pov', col: 'red', seed: 5, fall: 0.2, wind: 0.08 });
    },
    ui(u, t, sh) { pg_hud(u, false, pg_A.arnaquer + 0.55 - sh.t0); },
    ev: [[pg_A.vient, 'gasp'], [pg_A.arnaquer, 'stamp', 1.2], [pg_A.arnaquer + 0.55, 'ding']],
  });
}
