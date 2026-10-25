'use strict';
/* ═══════════════════════════════════════════════════════════════════════════════════════════════════
   sc_idee.js : segment « idee » (a1, a2), 5 plans calés sur la voix (wt() / P.<id> : aucune seconde écrite en dur ; préfixe id_)
     a1_journal  terrasse de café, Lustig lit le journal derrière sa page, puis lève les yeux                     « À Paris, Victor Lustig apprend »
     a1_titre    le journal en gros plan : LA TOUR EIFFEL COUTE TROP CHER, le crayon rouge entoure le titre         « que l'entretien de la tour Eiffel »
     a1_tour     gros plan sur la ferronnerie, peintres suspendus, les pièces s'envolent de la tour                    « coûte extrêmement cher. »
     a2_miroir   Lustig devant le miroir de sa chambre : cravate, chapeau ; son reflet fait de même                  « Il décide alors de se faire passer pour un »
     a2_sourire  gros plan, demi-sourire ; étiquette HAUT FONCTIONNAIRE ; la case 1/4 se coche                         « haut fonctionnaire du gouvernement français. »
   Sprites : sc_paris_sprites.js (pa_cafe, pa_journal, pa_tourDetail, pa_pieces), sc_lustig_sprites.js (lu_lustig), sc_hotel_sprites.js (ho_chambre).
   HUD : hudTracker(0, …) + hudLieu(0, …) (« 1/4 PARIS 1925 ») sur tout le segment ; la case se coche (mark) vers la fin du dernier plan.
   ═══════════════════════════════════════════════════════════════════════════════════════════════════ */

function id_hud(u, p, nChars, fait, markP) {                           // dossier AFFAIRE LUSTIG : case 1 allumée, lieu qui se tape ; markP 0..1 : la coche (case 1/4 terminée)
  hudTracker(0, 0, p); hudLieu(0, nChars);
  if (markP > 0) mark(26, 26, 'yes', markP, 5);
}

function buildIdee(S) {
  const a1 = P.a1, a2 = P.a2;
  const tTitre = wt('a1', 'que') - 0.1, tTour = wt('a1', 'coûte') - 0.1, tMiroir = a2.t0 - 0.1, tSourire = wt('a2', 'haut') - 0.1;
  const tCoche = S.t1 - 0.85;                                           // la case se coche dans la pause finale

  // ───────────────────────── 1. le journal à la terrasse du café ─────────────────────────
  shot('a1_journal', S.t0, {
    draw(u, t) {
      const dur = tTitre - S.t0, cam = lerp(-6, 8, eio(clamp(u / dur)));
      const info = pa_cafe(t, { env: 'matin', layer: 'back', F: 352, cam, seatX: 112, tableX: 150, people: 3, pigeons: 2 });
      const tab = info.table, sx = info.seat.x + 6;
      const up = prog(u, dur - 1.15, dur - 0.35);                         // il lève les yeux vers la tour
      const holdPaper = (x, y) => {
        const tilt = -0.03 + 0.04 * up;
        pa_journal(x - 52, y - 26 + 16 * up, 104, 86, t, { side: 'back', held: true, tilt, curl: 0.5, shadow: false, flap: 0.4 });
      };
      lu_lustig(sx, 328, 1.85, t, { pose: 'read', both: true, crop: 'waist', clipY: tab.topY - 3, yaw: 0.35 + 0.35 * up, hat: true, light: 1, hold: { R: holdPaper, L: () => { } }, look: [lerp(-0.1, 0.55, up), lerp(0.55, -0.85, up)], lookX: 0.35 * up, shadow: 0 });
      pa_cafe(t, { env: 'matin', layer: 'front', F: 352, cam, tableX: 150, dust: 1 });
    },
    ui(u, t) { id_hud(u, prog(u, 0.1, 0.6), Math.floor(prog(u, 0.3, 0.85) * 14), 0, 0); },
    ev: [[S.t0 + 0.12, 'pop', 1], [S.t0 + 0.4, 'label', 1], [S.t0 + 0.9, 'page', 1], [tTitre - 0.9, 'bird', 1]],
  });

  // ───────────────────────── 2. le journal en gros plan ─────────────────────────
  shot('a1_titre', tTitre, {
    draw(u, t) {
      const dur = tTour - tTitre;
      pa_cafe(t, { env: 'matin', layer: 'back', F: 352, cam: 12, people: 2, pigeons: 0, dust: 0 });
      vignette(0.78, 50, 230, 135, 200, '24,10,6');
      const k = eio(clamp(u / dur)), x = 24 - 2 * k, y = 40 + 6 * (1 - k) - 4 * k;
      pa_journal(x, y, 222, 292, t, { titre: 'LA TOUR EIFFEL COÛTE TROP CHER', held: true, curl: 0.35, tilt: 0.012 * Math.sin(t * 1.1), flap: 0.2, shadow: false, circle: prog(u, 0.25, dur - 0.1), photo: 'tour' });
      k_dust(t, { n: 18, x0: 0, x1: 270, y0: 40, y1: 340, par: 0.9, seed: 5 });
    },
    ui(u, t) { id_hud(u, 1, Infinity, 0, 0); },
    ev: [[tTitre + 0.05, 'page', 1], [tTitre + 0.25, 'scribble', tTour - tTitre - 0.4]],
  });

  // ───────────────────────── 3. la ferronnerie, les peintres, l'argent qui s'échappe ─────────────────────────
  shot('a1_tour', tTour, {
    draw(u, t) {
      const dur = tMiroir - tTour, k = eio(clamp(u / dur)), cam = lerp(-8, 14, k), camY = lerp(30, -25, k);
      const tc = wt('a1', 'coûte'), te = wt('a1', 'extrêmement');
      pa_tourDetail(t, { env: 'matin', layer: 'back', cam, camY, freshY: lerp(150, 215, k) - camY * 0.55, h: 300, peintres: 1 });
      const ox = 150 - cam * 0.55, oy = 290 - camY * 0.55;
      pa_pieces(ox, oy, t, tc, { n: 12, mode: 'envol', seed: 1, spread: 46, vx: 22, dur: 3.0, r: 3 });
      pa_pieces(ox - 40, oy + 20, t, te, { n: 12, mode: 'envol', seed: 4, spread: 40, vx: 26, dur: 2.6, r: 3 });
      pa_tourDetail(t, { env: 'matin', layer: 'front', cam, camY });
    },
    ui(u, t) { id_hud(u, 1, Infinity, 0, 0); },
    ev: [[wt('a1', 'coûte'), 'coins', 1.6], [wt('a1', 'extrêmement'), 'coins', 1.4], [tTour + 0.3, 'wind', 1.5]],
  });

  // ───────────────────────── 4. devant le miroir ─────────────────────────
  shot('a2_miroir', tMiroir, {
    draw(u, t) {
      const dur = tSourire - tMiroir, cam = lerp(10, -4, eio(clamp(u / dur))), uu = Math.max(0, u - 0.15);
      const refl = info => {
        lu_lustig(info.cx, info.bottom - 3, 0.74, t, { pose: 'dress', u: uu, yaw: 0, hat: true, light: 0.6, shadow: 0, rim: AM[7] });
      };
      ho_chambre(t, { layer: 'back', cam, reflect: refl, hat: false, lamp: 1 });
      lu_lustig(176 - cam, 346, 1.18, t, { pose: 'dress', u: uu, yaw: 0.8, flip: true, hat: true, light: 1, shadow: 0.35 });
      ho_chambre(t, { layer: 'front', cam, reflect: refl, hat: false, lamp: 1 });
    },
    ui(u, t) { id_hud(u, 1, Infinity, 0, 0); },
    ev: [[tMiroir + 0.55, 'blip', 1], [tMiroir + 1.3, 'whoosh', 0.4]],
  });

  // ───────────────────────── 5. le demi-sourire, HAUT FONCTIONNAIRE ─────────────────────────
  shot('a2_sourire', tSourire, {
    draw(u, t) {
      const dur = S.t1 - tSourire, k = eio(clamp(u / dur)), cam = lerp(4, -2, k);
      ho_chambre(t, { layer: 'back', cam: cam + 40, hat: false, lamp: 1, items: { miroir: false } });
      vignette(0.7, 60, 250, 135, 190, '20,8,16');
      lu_lustig(138 - cam * 0.5, 292, 3.3, t, { pose: 'smile', corner: true, crop: 'chest', clipY: 480, yaw: 0.45, hat: true, light: 1, shadow: 0, rim: AM[9], look: [lerp(0.2, 0.55, k), -0.05] });
      ho_chambre(t, { layer: 'front', cam: cam + 40, hat: false, lamp: 1, items: { miroir: false } });
    },
    ui(u, t) {
      tagBox(135, 66, 'HAUT FONCTIONNAIRE', 'amber', Math.floor(prog(u, 0.12, 0.7) * 18), true);
      id_hud(u, 1, Infinity, 0, prog(t, tCoche, tCoche + 0.25));
    },
    ev: [[wt('a2', 'haut'), 'label', 1], [tCoche, 'ding', 1]],
  });
}
