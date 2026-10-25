'use strict';
/* ═════════════════════════════════════════════════════════════════════════════════════════════
   sc_fin.js : la FIN de « L'homme qui a vendu la tour Eiffel » (préfixe fn_), de SEG.fin.t0 à SEG.fin.t1 (≈ 8 s + le carton de 2 s), trois plans calés sur la voix (wt) :
     f_police   un marchand traverse la rue d'un pas décidé vers le commissariat                          « Mais cette fois, »
     f_fuite    Lustig s'enfuit, chapeau emporté, deux agents sur les talons : « ECHEC »                    « son plan échoue. »
     f_tour     la tour au crépuscule : « VENDUE » est barré, le tampon « JAMAIS A LUI » s'écrase ;         « Cet homme a donc réussi à vendre l'un des monuments les plus célèbres du monde…
                carton final « ELLE EST TOUJOURS A PARIS »                                                     sans jamais en être propriétaire ! »
   Sprites : sc_paris_sprites.js (pa_), sc_hotel_sprites.js (ho_ : tampon), sc_lustig_sprites.js (lu_).
   ═════════════════════════════════════════════════════════════════════════════════════════════ */
const fn_A = {};
function fn_anch() {
  if (fn_A.ok) return fn_A;
  const f1 = m => wt('fin', m), f2 = m => wt('fin2', m);
  Object.assign(fn_A, { mais: f1('Mais'), son: f1('son'), echoue: f1('échoue'), cet: f2('Cet'), vendre: f2('vendre'), sans: f2('sans'), jamais: f2('jamais'), proprio: f2('propriétaire'), end: P.fin2.t1, ok: true });
  return fn_A;
}
function fn_shake(dx, dy) { dx = Math.round(dx); dy = Math.round(dy); if (!dx && !dy) return; L.setTransform(1, 0, 0, 1, 0, 0); L.drawImage(low, dx, dy); }

// ───────────────────────── plan 1 : f_police ─────────────────────────
function fn_policeDraw(u, t, sh) {
  const A = fn_anch(), env = 'matin', F = 412;
  const c = pa_commissariat(t, { env, F, agent: 1, people: 1 });
  const sc = 0.52, sp = lu_WALK_P.speed * sc, dur = (A.son - 0.1) - sh.t0, x = c.doorX - sp * dur - 6 + sp * u;
  lu_marchand(x, c.feetY + 4, sc, t, { pose: 'walk', ph: u / lu_WALK_P.T, yaw: 1.5, light: 1, hat: true });
}
// ───────────────────────── plan 2 : f_fuite ─────────────────────────
function fn_fuiteDraw(u, t, sh) {
  const env = 'matin', F = 362, cam = 0;
  pa_ciel(t, { env, h: 200, clouds: 4 });
  pa_rue(t, { env, F, layer: 'back', people: 3, pigeons: 2 });
  const sc = 0.86, v = lu_RUN.speed * sc, x = -40 + v * u, y = F + 40;
  const hat = clamp((u - 0.12) / 0.9) * 1.3;
  for (const [k, off, sp] of [[0, 78, 0.92], [1, 124, 0.9]]) pa_agent(x - off, y - 4 + k * 3, 1.45, t, { mode: 'run', dir: 1, speed: v * sp, env, light: 1 });
  if (x < LW + 30) lu_lustig(x, y, sc, t, { pose: 'run', ph: u / lu_RUN.T, yaw: 1.5, light: 1, hat: hat > 0.01 ? hat : true, lookBack: prog(u, 0.2, 0.7) });
  pa_rue(t, { env, F, layer: 'front' });
}
function fn_fuiteUi(u, t) { const A = fn_anch(), n = Math.floor(prog(t, A.echoue, A.echoue + 0.25) * 5); if (n > 0) tagBox(135, 120, 'ECHEC', 'red', n, true); }
// ───────────────────────── plan 3 : f_tour ─────────────────────────
const FN_V = { x: 135, y: 118, s: 1.25, rot: -0.07, seed: 3 }, FN_J = { x: 135, y: 262, s: 1.2, rot: 0.05, seed: 8 };
function fn_tourDraw(u, t, sh) {
  const A = fn_anch(), env = 'crepuscule';
  pa_ciel(t, { env, h: 330, stars: 26, birds: 3 });
  pa_toits(t, { env, y: 372, layers: ['far'] });
  pa_tour(135, 387, 0.98, t, { env, haze: 0.12, flag: true });
  pa_toits(t, { env, y: 372, layers: ['mid', 'near'] });
  const barre = prog(t, A.sans, A.sans + 0.35);
  ho_empreinte(FN_V.x, FN_V.y, FN_V.s, 'VENDUE', { rot: FN_V.rot, seed: FN_V.seed, barre: barre > 0 ? barre : false });
  ho_tampon(FN_J.x, FN_J.y, FN_J.s, t, A.jamais, { texte: 'JAMAIS A LUI', view: 'pov', rot: FN_J.rot, seed: FN_J.seed });
  const h = ho_hit(t, A.jamais, 0.5); if (h > 0.02) fn_shake(Math.sin(u * 95) * 4 * h, Math.cos(u * 83) * 3 * h);
}
function fn_tourUi(u, t) {
  const A = fn_anch(), p = prog(t, A.end + 0.1, A.end + 0.5);
  if (p <= 0) return;
  const y = 14 - Math.round((1 - eob(p)) * 40);
  ptextC('ELLE EST TOUJOURS', 135, y, WH[3], 2, '#05040f'); ptextC('A PARIS', 135, y + 20, AM[8], 3, '#05040f');
}

INITS.push(() => { const A = fn_anch(); fn_policeDraw(0.4, A.mais + 0.4, { t0: A.mais - 0.12 }); fn_fuiteDraw(0.5, A.echoue, { t0: A.son }); fn_tourDraw(1, A.cet + 1, { t0: A.cet }); fn_tourDraw(4, A.jamais + 0.3, { t0: A.cet }); clearL(); });

function buildFin(S) {
  const A = fn_anch(), t1 = A.son - 0.1, t2 = A.cet - 0.1;
  shot('f_police', S.t0, { draw: fn_policeDraw, ev: [[S.t0 + 0.02, 'whoosh', 0.3], [S.t0 + 0.1, 'step', 1], [S.t0 + 0.4, 'step', 1], [S.t0 + 0.7, 'step', 1], [t1 - 0.2, 'knock', 1]] });
  shot('f_fuite', t1, { draw: fn_fuiteDraw, ui: fn_fuiteUi, ev: [[t1 + 0.02, 'whoosh', 0.3], [t1 + 0.08, 'run', 1.1], [t1 + 0.35, 'gasp', 1], [A.echoue, 'label', 1], [A.echoue, 'no', 1]] });
  shot('f_tour', t2, { draw: fn_tourDraw, ui: fn_tourUi, ev: [[t2 + 0.02, 'whoosh', 0.3], [t2 + 0.3, 'bird', 1], [A.sans, 'scribble', 0.35], [A.jamais, 'stamp', 1.8], [A.jamais + 0.02, 'shake', 1], [A.end + 0.1, 'endCard', 1], [A.end + 0.1, 'sparkle', 1], [A.end + 0.6, 'bird', 2]] });
}
