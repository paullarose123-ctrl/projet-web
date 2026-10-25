'use strict';
/* ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════
   sc_honte.js — segment « honte » (SEG.honte ; phrases d1 à d3 ; préfixe hn_), 7 plans calés sur la voix
     d1_question   devant le commissariat au crépuscule, Poisson s'approche de la porte : un « ? » géant éclate ; il lève la main… et hésite   « Et le plus incroyable ? Le marchand est »
     d2_honte      gros plan : tête basse, chapeau à deux mains, les joues rougissent (heartbeat)                                              « tellement honteux qu'il ne porte même pas »
     d2_talons     il tourne les talons, chapeau à la main ; le tampon PAS DE PLAINTE s'écrase                                                  « plainte ! »
     d3_train      la fenêtre du compartiment : Lustig sourit en coin, le train démarre (le décor défile)                                       « Victor Lustig disparaît »
     d3_argent     la mallette ouverte sur la banquette : liasses et pièces d'or (coins)                                                        « avec l'argent… »
     d3_gare       le train revient en gare de Paris (étiquette PARIS 1925)                                                                     « avant de revenir à Paris »
     d3_retour     Lustig descend sur le quai, rouvre le dossier AFFAIRE LUSTIG : les mêmes enveloppes s'envolent ; case 4/4 cochée             « pour tenter exactement la même arnaque ! »
   Tout est calé sur wt() / wt1() (hn_A : instants absolus des mots, remplis par buildHonte) ; les coupes tombent 0,10 s avant un début de mot.
   Sprites : sc_lustig_sprites.js (lu_), sc_hotel_sprites.js (ho_), sc_paris_sprites.js (pa_).
   ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════ */

const hn_A = {};                                                             // instants absolus des mots (remplis par buildHonte)
function hn_w(id, txt, k = 0, end = false) {
  try { return end ? wt1(id, txt, k) : wt(id, txt, k); } catch (e) { const w = P[id].words[Math.min(k, P[id].words.length - 1)]; return end ? w.t1 : w.t0; }
}
const hn_ptag = (x, y, s, style, n, center) => n > 0 ? tagBox(x, y, s, style, n, center) : 0;
// cases du carnet : la case 3 est cochée, la case 4 (LA FUITE) s'allume ; 4/4 se coche à la fin
function hn_hud(u, first, checkT) {
  hudTracker(3, 3, first ? prog(u, 0.0, 0.4) : 1);
  if (first) { if (u > 0.3) hudLieu(3, Math.ceil((u - 0.3) * 30)); } else hudLieu(3);
  if (checkT !== undefined && u > checkT) mark(8 + 3 * 26 + 18, 8 + 18, 'yes', prog(u, checkT, checkT + 0.3), 5);
}
// distance (px) d'un marcheur qui roule à v0 jusqu'à ta, puis ralentit jusqu'à l'arrêt en tb
const hn_dist = (u, v0, ta, tb) => { if (u <= ta) return v0 * u; const d = Math.min(u, tb) - ta, L_ = tb - ta; return v0 * ta + v0 * (d - d * d / (2 * L_)); };
// instants des pas (talon posé) d'une marche calée sur la distance
function hn_steps(v0, ta, tb, s, W) { const out = []; let prev = 0; for (let u = 0; u <= tb; u += 0.01) { const k = Math.floor(lu_walkPh(hn_dist(u, v0, ta, tb) / s, W) * 2); if (k > prev) { out.push(u); prev = k; } } return out; }

function buildHonte(S) {
  hn_A.incroy = hn_w('d1', 'incroyable'); hn_A.le = hn_w('d2', 'Le'); hn_A.honteux = hn_w('d2', 'honteux'); hn_A.plainte = hn_w('d2', 'plainte');
  hn_A.victor = hn_w('d3', 'Victor'); hn_A.dispar = hn_w('d3', 'disparaît'); hn_A.avec = hn_w('d3', 'avec'); hn_A.argent = hn_w('d3', "l'argent"); hn_A.avant = hn_w('d3', 'avant'); hn_A.paris = hn_w('d3', 'Paris');
  hn_A.pour = hn_w('d3', 'pour'); hn_A.exact = hn_w('d3', 'exactement'); hn_A.meme = hn_w('d3', 'même'); hn_A.arnaque = hn_w('d3', 'arnaque'); hn_A.arnaqueEnd = hn_w('d3', 'arnaque', 0, true);
  const CUT = 0.10, tc1 = hn_A.honteux - CUT, tc2 = hn_A.plainte - CUT, tc3 = hn_A.victor - CUT, tc4 = hn_A.avec - CUT, tc5 = hn_A.avant - CUT, tc6 = hn_A.pour - CUT;
  const ENV = 'crepuscule';

  // ═════ 1. d1_question : « Et le plus incroyable ? » : « ? » géant ; « Le marchand est » : il s'approche de la porte, lève la main… et hésite
  const Q = { s: 1.15, x0: 22, ta: 0.35, tb: 1.15 }; Q.v0 = lu_WALK_P.speed * Q.s * 0.997;
  shot('d1_question', S.t0, {
    draw(u, t, sh) {
      const info = pa_commissariat(t, { env: ENV, F: 345 });
      const d = hn_dist(u, Q.v0, Q.ta, Q.tb), x = Q.x0 + d, y = info.feetY + 2;
      const knock = prog(u, 1.45, 1.75) * (1 - prog(u, 1.95, 2.15));
      const o = u < Q.tb ? { pose: 'walk', ph: lu_walkPh(d / Q.s, lu_WALK_P), yaw: 1.3, light: -0.4, bend: 0.05 }
        : { pose: 'stand', pose2: 'handshake', mix: knock, u: 2, yaw: 1.3, light: -0.4, reachY: 118, reachZ: 30, bend: 0.06 };
      lu_marchand(x, y, Q.s, t, o);
    },
    ui(u, t, sh) {
      hn_hud(u, true);
      const tq = t - hn_A.incroy, out = prog(t, hn_A.le - 0.05, hn_A.le + 0.2);
      if (tq > 0 && out < 1) {                                               // le « ? » géant : il éclate, tremble, puis s'efface
        const k = eob(prog(tq, 0, 0.3)) * (1 - ei(out)), sc = Math.max(1, Math.round(14 * k)), wob = Math.sin(t * 11) * 2;
        ptextC('?', 150 + wob + 4, 86 + 4, RD[1], sc, null); ptextC('?', 150 + wob, 86, YE[2], sc, '#05040f');
      }
    },
    ev: [[S.t0 + 0.08, 'pop'], [S.t0 + 0.34, 'label'], [hn_A.incroy, 'pop'], [hn_A.incroy, 'suspense', 1.1]].concat(hn_steps(Q.v0, Q.ta, Q.tb, Q.s, lu_WALK_P).map(u => [S.t0 + u, 'step', 1])),
  });

  // ═════ 2. d2_honte : gros plan, tête basse, chapeau à deux mains, les joues rougissent
  shot('d2_honte', tc1, {
    draw(u, t, sh) {
      pa_commissariat(t, { env: ENV, F: 345 });
      vgrad(0, 0, LW, LH, [[0, 'rgba(8,6,30,0.5)'], [1, 'rgba(8,6,30,0.8)']]);
      const s = 3.0 + 0.2 * prog(u, 0, 1.4);
      lu_marchand(128, 372, s, t, { pose: 'ashamed', u: 0.5 + u, crop: 'waist', yaw: 0.7, light: -0.4, blush: prog(u, 0.05, 0.9), rim: '#9ab4f0' });
      k_vignetteWarm(0.3);
    },
    ui(u, t, sh) { hn_hud(u, false); },
    ev: [[hn_A.honteux + 0.05, 'heartbeat', 1], [hn_A.honteux + 0.5, 'heartbeat', 0.6], [hn_A.honteux + 0.95, 'heartbeat', 0.6]],
  });

  // ═════ 3. d2_talons : il tourne les talons, chapeau à la main ; PAS DE PLAINTE
  const T3 = { s: 1.15, x0: 112 }; T3.v0 = lu_WALK_P.speed * T3.s * 0.997;
  const tStamp = hn_A.plainte + 0.06;
  shot('d2_talons', tc2, {
    draw(u, t, sh) {
      const info = pa_commissariat(t, { env: ENV, F: 345 }), d = T3.v0 * u * (0.6 + 0.4 * prog(u, 0, 0.3)), x = T3.x0 - d;
      lu_marchand(x, info.feetY + 2, T3.s, t, { pose: 'walk', ph: lu_walkPh(d / T3.s, lu_WALK_P), flip: true, yaw: 1.3, light: -0.4, bend: 0.14, blush: 0.9, hat: false, eye: { look: [0.1, 0.9], lid: 0.6 },
        hold: (hx, hy, i) => lu_hat(hx + 3 * (i.flip), hy + 5, 0.75, 0.2, { who: 'marchand', yaw: 0.6, pitch: 0.5, light: -0.4 }) });
      const h = ho_hit(t, tStamp);
      L.save(); L.setTransform(1, 0, 0, 1, Math.round(Math.sin(t * 90) * 2 * h), Math.round(Math.cos(t * 70) * 1.6 * h));
      ho_tampon(135, 118, 0.8, t, tStamp, { texte: 'PAS DE PLAINTE', view: 'pov', col: 'red', seed: 7, fall: 0.14, wind: 0.04, hold: 0.08, lift: 0.2 });
      L.restore();
    },
    ui(u, t, sh) { hn_hud(u, false); },
    ev: [[tStamp, 'stamp', 1]].concat(hn_steps(T3.v0 * 0.8, 0.0, 0.9, T3.s, lu_WALK_P).map(u => [tc2 + u, 'step', 1])),
  });

  // ═════ 4. d3_train : la fenêtre du compartiment, Lustig sourit en coin ; le train démarre, le décor défile
  const TR = { s: 2.4, x: 771 };
  shot('d3_train', tc3, {
    draw(u, t, sh) {
      const cam = 22 * u + 70 * u * u, info = pa_gare(t, { env: ENV, E: 398, layer: 'back', cam, people: 2, farPeople: 3 });
      pa_train(TR.x, info.railY, TR.s, t, { env: ENV, dir: 1, cars: 2, speed: 150, pax: 1, insideCar: 0, insideIdx: 1, whistle: tc3 + 0.1, lamp: true,
        inside: (x, y, w, h, tt) => lu_lustig(x + w * 0.5, y + h + 10, 0.82, tt, { pose: 'smile', corner: true, crop: 'chest', yaw: 0.5, light: 0.6 }) });
      pa_gare(t, { env: ENV, E: 398, layer: 'front', cam, people: 2 });
      vgrad(0, 0, LW, LH, [[0, 'rgba(8,6,30,0.25)'], [1, 'rgba(8,6,30,0.5)']]);
    },
    ui(u, t, sh) { hn_hud(u, false); },
    ev: [[tc3, 'train', 2.6], [tc3 + 0.1, 'steam', 1.2]],
  });

  // ═════ 5. d3_argent : la mallette ouverte sur la banquette, liasses et pièces
  shot('d3_argent', tc4, {
    draw(u, t, sh) {
      vgrad(0, 0, LW, LH, [[0, WO[0]], [0.5, WO[1]], [1, NI[0]]]);
      for (let i = 0; i < 6; i++) { const x = ((i * 70 - 40 * u) % 420 + 420) % 420 - 60; ho_glow(x, 60 + (i % 3) * 30, 70, '255,200,74', 0.18); }   // la lumière des lampadaires défile à la fenêtre
      R(0, 330, LW, 150, RD[1]); R(0, 330, LW, 3, RD[2]);
      ho_glow(135, 280, 110, '255,200,74', 0.35 + 0.1 * Math.sin(t * 9));
      ho_mallette(135, 372, 2.1, t, { open: 1, glow: 1, bills: 1, shake: 0.6 });
      const k = prog(t, hn_A.argent - 0.05, hn_A.argent + 0.1);
      if (k > 0) ho_billets(135, 250, 1, t, { kind: 'pieces', n: 12, vy: -70, spread: 60, t0: hn_A.argent, loop: false, life: 1.2 });
      k_vignetteWarm(0.45);
    },
    ui(u, t, sh) { hn_hud(u, false); },
    ev: [[hn_A.argent, 'coins', 0.9]],
  });

  // ═════ 6. d3_gare : le train revient en gare de Paris
  shot('d3_gare', tc5, {
    draw(u, t, sh) {
      const info = pa_gare(t, { env: ENV, E: 340, layer: 'back', people: 3 });
      pa_train(130 + 90 * u, info.railY, 0.95, t, { env: ENV, dir: 1, cars: 2, speed: 90, pax: 1, lamp: true, whistle: tc5 + 0.05 });
      pa_gare(t, { env: ENV, E: 340, layer: 'front', people: 3 });
    },
    ui(u, t, sh) { hn_hud(u, false); hn_ptag(135, 52, 'PARIS 1925', 'amber', Math.ceil((t - tc5 - 0.1) * 30), true); },
    ev: [[tc5, 'train', 1.2], [tc5 + 0.05, 'steam', 1.0], [tc5 + 0.3, 'label']],
  });

  // ═════ 7. d3_retour : Lustig descend sur le quai, rouvre le dossier ; les mêmes enveloppes s'envolent ; 4/4
  const R7 = { s: 1.3, x0: 18, ta: 0.55, tb: 1.15 }; R7.v0 = lu_WALK.speed * R7.s * 0.997;
  const uOpen = hn_A.meme - tc6, uEnv = hn_A.arnaque - tc6, uCheck = hn_A.arnaqueEnd + 0.45 - tc6;
  shot('d3_retour', tc6, {
    draw(u, t, sh) {
      const info = pa_gare(t, { env: ENV, E: 340, layer: 'back', people: 2 });
      pa_train(300, info.railY, 0.95, t, { env: ENV, dir: 1, cars: 2, speed: 0, pax: 1, lamp: true });
      pa_gare(t, { env: ENV, E: 340, layer: 'front', people: 2 });
      const d = hn_dist(u, R7.v0, R7.ta, R7.tb), x = R7.x0 + d, y = info.floorY - 2, stop = u >= R7.tb, op = prog(u, uOpen, uOpen + 0.35);
      const o = stop ? { pose: 'walk', pose2: 'smile', mix: prog(u, R7.tb - 0.2, R7.tb + 0.15), ph: lu_walkPh(d / R7.s), corner: true, yaw: 1.0, light: -0.4, holdHand: 'L',
          hold: (hx, hy, i) => { ho_affiche(hx - 14, hy - 36, 52, 40, t, { kind: 'dossier', out: 0, rot: -0.1 }); } }
        : { pose: 'walk', ph: lu_walkPh(d / R7.s), yaw: 1.5, light: -0.4 };
      const r = lu_lustig(x, y, R7.s, t, o);
      // les mêmes enveloppes : trois d'affilée, en arc vers la droite et le haut
      for (let k = 0; k < 3; k++) { const p = prog(u, uEnv + k * 0.2, uEnv + k * 0.2 + 1.0); if (p > 0 && p < 1 && r.handL) ho_enveloppe(0, 0, 1, t, { face: 'face', seal: 1, fly: { p, from: [r.handL[0] + 6, r.handL[1] - 14], to: [200 + 22 * k, 70 + 36 * k], arc: 50, spin: 0.7, s0: 0.7, s1: 1.0 } }); }
    },
    ui(u, t, sh) { hn_hud(u, false, uCheck); hn_ptag(135, 52, 'AFFAIRE LUSTIG', 'amber', Math.ceil((t - hn_A.exact) * 30), true); },
    ev: [[hn_A.exact, 'label'], [hn_A.arnaque, 'whoosh', 0.7], [hn_A.arnaque + 0.2, 'whoosh', 0.7], [hn_A.arnaque + 0.4, 'whoosh', 0.7], [tc6 + uCheck, 'ding']].concat(hn_steps(R7.v0, R7.ta, R7.tb, R7.s, lu_WALK).map(u => [tc6 + u, 'step', 1])),
  });
}
