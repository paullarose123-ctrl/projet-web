'use strict';
// sc_faux.js : segment « faux » (b1, b2) — LES FAUX PAPIERS. Préfixe fx_.
// b1 : « Il fabrique de faux documents officiels et invite plusieurs marchands de ferraille dans un hôtel de luxe. »
// b2 : « Il leur annonce une information totalement secrète : la tour Eiffel va être détruite et vendue pour son métal ! »
// Plans (coupes 0,10 s avant un début de mot ; tout est calé sur wt() / P.<id>, jamais sur des secondes écrites en dur) :
//   b1_machine      le bureau du faussaire : Lustig derrière sa machine à écrire qui tape (« Il fabrique de faux »)
//   b1_tampon       le faux ordre de mission plein cadre (étiquette FAUX sur « documents ») : le tampon OFFICIEL s'abat sur « officiels »
//   b1_invitations  les enveloppes à cachet s'envolent au-dessus des toits de Paris (« invite plusieurs marchands de ferraille »)
//   b1_hotel        la façade du palace au crépuscule (« dans un hôtel de luxe »)
//   b2_secret       le grand salon : Lustig se penche, doigt sur les lèvres, les marchands se rapprochent ; étiquette SECRET
//   b2_dossier      le dossier cartonné glisse sur la table, tampon SECRET, l'affiche en sort (« la tour Eiffel va être »)
//   b2_demolition   l'affiche : le boulet frappe, la tour s'effondre (« détruite »), le tampon VENDUE s'abat (« vendue »), pluie de pièces (« métal ») ; case 2/4 cochée
function fx_hud(u, t, first, tick) {
  hudTracker(1, 1, 1);                                                                      // case 1 déjà cochée, case 2 allumée
  hudLieu(1, first ? Math.ceil(prog(u, 0.25, 0.85) * 17) : Infinity);
  if (tick != null && t > tick) mark(52, 26, 'yes', prog(t, tick, tick + 0.25), 5);         // la case 2/4 se coche à la fin du segment
}
// ombre portée de choc : décalage de l'image entière
const fx_shake = (t, t0, amp = 3.2) => { const h = ho_hit(t, t0); return [Math.round(Math.sin(t * 93) * amp * h), Math.round(Math.cos(t * 71) * amp * h)]; };

function buildFaux(S) {
  const T = {
    fab: wt('b1', 'fabrique'), faux: wt('b1', 'faux'), docs: wt('b1', 'documents'), off: wt('b1', 'officiels'), inv: wt('b1', 'invite'), plus: wt('b1', 'plusieurs'),
    et: wt('b1', 'et'), march: wt('b1', 'marchands'), ferr: wt('b1', 'ferraille'), dans: wt('b1', 'dans'), hotel: wt('b1', 'hôtel'), luxe: wt('b1', 'luxe'),
    ann: wt('b2', 'annonce'), tot: wt('b2', 'totalement'), sec: wt('b2', 'secrète'), la: wt('b2', 'la'), tour: wt('b2', 'tour'), eiffel: wt('b2', 'Eiffel'), va: wt('b2', 'va'),
    det: wt('b2', 'détruite'), vend: wt('b2', 'vendue'), metal: wt('b2', 'métal'), metal1: wt1('b2', 'métal'),
  };
  const CUT = { tampon: T.docs - 0.07, inv: T.et - 0.10, hotel: T.dans - 0.10, secret: P.b2.t0 - 0.10, dossier: T.la - 0.10, demo: T.det - 0.10 };
  const TICK = T.metal1 + 0.30;

  // ───────── 1. le bureau du faussaire : Lustig, la machine qui tape ─────────
  shot('b1_machine', S.t0, {
    draw(u, t) {
      ho_bureau(t, { layer: 'back', items: { lampe: false, machine: false, pile: false, bougie: false, encrier: false, tampons: false } });
      ho_lampe(24, 342, 1.25, t, { glow: 1 });
      lu_lustig(222, 262, 2.15, t, { pose: 'smile', corner: true, crop: 'chest', clipY: 296, yaw: 0.8, flip: true, light: -1, rim: AM[8], look: [-0.7, 0.6] });
      ho_machine(112, 360, 1.5, t, { rate: 12, t0: S.t0 - 2.3, paper: eo(prog(u, 0, 0.25)), light: 1 });
      ho_encrier(232, 352, 1.3, t, {});
      ho_bureau(t, { layer: 'front', items: { lampe: false, machine: false, pile: false, bougie: false, encrier: false, tampons: false } });
    },
    ui(u, t) {
      fx_hud(u, t, true);
    },
    ev: [[S.t0 + 0.12, 'typing', 0.8], [S.t0 + 0.30, 'label']],
  });

  // ───────── 2. le tampon OFFICIEL sur le faux ordre de mission ─────────
  shot('b1_tampon', CUT.tampon, {
    draw(u, t) {
      const [dx, dy] = fx_shake(t, T.off);
      L.save(); L.translate(dx, dy);
      vgrad(-10, -10, LW + 20, LH + 20, [[0, WO[2]], [0.6, WO[1]], [1, WO[0]]]);
      for (let y = 0; y < LH; y += 6) ho_R(-10, y + ((y * 7) % 5), LW + 20, 1, WO[(y / 6 | 0) % 3 ? 1 : 2]);
      ho_glow(70, 110, 220, '255,140,40', 0.5); ho_glow(90, 140, 110, '255,200,120', 0.3);
      ho_document(36, 50, 198, 280, t, { head: 'MINISTERE', sub: 'DES POSTES ET TELEGRAPHES', title: 'ORDRE DE MISSION', lines: 24, write: 1, seal: 1, sign: 1, rot: -0.03, warm: 0.25, seed: 7 });
      ho_tampon(138, 262, 0.95, t, T.off, { texte: 'OFFICIEL', view: 'pov', fall: 0.30, wind: 0.10, hold: 0.16, lift: 0.28, seed: 4 });
      ho_motes(t, { n: 24, cx: 90, cy: 120, x0: 0, x1: LW, y0: 0, y1: 350 });
      L.restore();
      vignette(0.55, 90, 300, 135, 200, '3,2,8');
    },
    ui(u, t) {
      fx_hud(u, t, false);
      if (t >= T.docs) tagBox(206, 30, 'FAUX', 'red', Math.ceil((t - T.docs) * 28), true);
    },
    ev: [[T.docs, 'label'], [T.off - 0.38, 'whoosh', 0.35], [T.off, 'stamp', 1]],
  });

  // ───────── 3. les invitations s'envolent au-dessus des toits ─────────
  const FL = [
    { t: T.inv - 0.05, from: [-30, 350], to: [320, 110], arc: 70, spin: 0.9 },
    { t: T.inv + 0.20, from: [-30, 320], to: [320, 60], arc: 90, spin: 1.2 },
    { t: T.plus, from: [-30, 370], to: [320, 175], arc: 60, spin: 0.7 },
    { t: T.plus + 0.28, from: [-30, 340], to: [320, 85], arc: 100, spin: 1.5 },
    { t: T.march, from: [-30, 330], to: [320, 140], arc: 80, spin: 1.0 },
    { t: T.ferr - 0.12, from: [-30, 365], to: [320, 40], arc: 110, spin: 1.3 },
  ];
  const FLDUR = 1.25;
  shot('b1_invitations', CUT.inv, {
    draw(u, t) {
      const cam = k_pan(u, -8, 34, 'io', 1.55), env = 'soir';
      pa_ciel(t, { env, h: 330, clouds: 4, cam });
      pa_toits(t, { env, y: 330, layers: ['far'], cam, smoke: 1 });
      pa_tour(184 - cam * 0.2, 346, 0.66, t, { env, haze: 0.32, flag: false });
      pa_toits(t, { env, y: 330, layers: ['mid', 'near'], cam, smoke: 1 });
      ho_glow(0, 360, 160, '255,140,50', 0.28);
      FL.forEach((f, i) => { const p = (t - f.t) / FLDUR; if (p <= 0 || p >= 1) return; ho_enveloppe(0, 0, 1, t, { fly: { p, from: f.from, to: f.to, arc: f.arc, spin: f.spin, phase: i * 1.7, s0: 1.9, s1: 0.8 }, seal: 1, face: 'dos', shadow: 0 }); });
      vignette(0.45, 100, 300, 135, 220, '30,10,40');
    },
    ui(u, t) { fx_hud(u, t, false); },
    ev: FL.map(f => [f.t + 0.05, 'whoosh', 0.7]),
  });

  // ───────── 4. la façade du palace au crépuscule ─────────
  shot('b1_hotel', CUT.hotel, {
    draw(u, t) { ho_facade(t, { light: 1, cam: k_pan(u, -18, 16, 'io', 1.62), car: { x: 205 } }); },
    ui(u, t) { fx_hud(u, t, false); },
    ev: [[T.hotel, 'reveal', 1]],
  });

  // ───────── 5. le grand salon : l'annonce secrète ─────────
  const GX = 116, LX = 238;                                                  // abscisse du groupe, de Lustig
  shot('b2_secret', CUT.secret, {
    draw(u, t) {
      const lean = eio(prog(t, T.ann, T.sec + 0.1)), gx = GX + 10 * lean, uw = t - (T.sec - 0.55);
      ho_salon(t, { layer: 'back', columns: false });
      lu_groupe(gx, 303, 1.0, t, { lean: 0.12 + 0.88 * lean, aim: LX - gx, murmur: prog(t, T.ann - 0.2, T.sec) * 0.9, nod: 0.5 * prog(t, T.tot, T.sec + 0.4), light: 0, rim: AM[9] });
      ho_table(GX + 4, 322, 1, t, {});
      lu_lustig(LX, 400, 1.5, t, { pose: 'whisper', u: uw, flip: true, light: -0.3, rim: AM[9] });
      ho_salon(t, { layer: 'front', columns: false });
    },
    ui(u, t) {
      fx_hud(u, t, false);
      if (t >= T.sec) tagBox(135, 96, 'SECRET', 'red', Math.ceil((t - T.sec) * 26), true);
    },
    ev: [[T.tot - 0.05, 'suspense', 1.4], [T.sec, 'label'], [T.sec + 0.06, 'gasp']],
  });

  // ───────── 6. le dossier glisse sur la table ; tampon SECRET ; l'affiche en sort ─────────
  const DX = 52, DY = 132, DW = 166, DH = 210;
  shot('b2_dossier', CUT.dossier, {
    draw(u, t) {
      const slide = eo(prog(t, CUT.dossier, CUT.dossier + 0.34)), out = eo(prog(t, T.eiffel, T.eiffel + 0.5)), x = lerp(320, DX, slide), y = DY + Math.sin(t * 2.6) * 1.2;
      const [sx, sy] = fx_shake(t, T.tour, 2.4);
      ho_salon(t, { view: 'close', layer: 'back', light: 0.9 });
      ho_table(135, 346, 2, t, { items: { carafes: 0, verres: 2, papiers: 0, cendrier: 0 } });
      L.save(); L.translate(sx, sy);
      ho_affiche(x, y, DW, DH, t, { kind: 'dossier', out, ball: 0.4, stampText: 'SECRET' });
      ho_tampon(x + DW / 2, y + DH * 0.66, 0.62, t, T.tour, { texte: 'SECRET', view: 'pov', fall: 0.2, wind: 0.08, hold: 0.12, lift: 0.24, seed: 5 });
      L.restore();
      ho_salon(t, { view: 'close', layer: 'front', light: 0.9 });
    },
    ui(u, t) { fx_hud(u, t, false); },
    ev: [[CUT.dossier + 0.03, 'whoosh', 0.3], [T.tour, 'stamp', 0.8], [T.eiffel, 'page']],
  });

  // ───────── 7. l'affiche : la tour démolie, VENDUE, les pièces ─────────
  const PX = 34, PY = 32, PW = 202, PH = 300, PHASE = 0.25;                  // le boulet frappe à t + 0,25 ≡ 0,6 mod 2,4 s : t = 26,75 s
  const HIT = Math.ceil((T.det + 0.05 + PHASE - 0.6) / 2.4) * 2.4 + 0.6 - PHASE;
  shot('b2_demolition', CUT.demo, {
    draw(u, t) {
      const [sx, sy] = fx_shake(t, T.vend, 3.6), [hx, hy] = fx_shake(t, HIT, 2.2);
      ho_salon(t, { view: 'close', layer: 'back', light: 0.9 });
      L.save(); L.translate(sx + hx, sy + hy);
      ho_affiche(PX, PY, PW, PH, t + PHASE, { ball: 0.95, ruin: prog(t, HIT - 0.02, HIT + 0.7) });
      ho_tampon(PX + PW / 2, PY + PH * 0.52, 1.25, t, T.vend, { texte: 'VENDUE', view: 'pov', fall: 0.24, wind: 0.07, hold: 0.2, lift: 0.3, seed: 3 });
      ho_billets(PX + PW / 2, PY + PH * 0.8, 1, t, { kind: 'pieces', n: 18, area: [PX + 20, PY + PH * 0.78, PX + PW - 20, PY + PH * 0.86], vx: 0, vy: -150, spread: 60, g: 210, life: 1.5, t0: T.metal, loop: false, size: 1.4, flip: 7 });
      L.restore();
      ho_salon(t, { view: 'close', layer: 'front', light: 0.9 });
    },
    ui(u, t) { fx_hud(u, t, false, TICK); },
    ev: [[HIT, 'crack', 0.8], [T.vend, 'stamp', 1], [T.metal, 'coins', 1.5], [TICK, 'ding']],
  });
}
