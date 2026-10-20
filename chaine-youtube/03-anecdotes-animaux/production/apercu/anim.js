'use strict';
// Aperçu de travail (pas le film) : les décors des trois mondes sur la vraie voix, sans animaux ni scientifique.
const AP = {
  alaska(t, u, o = {}) {
    const cam = o.cam ?? k_pan(u, 0, 30, 'io', 6), P = o.P || 'alaskaDusk';
    const bd = k_backdrop(P, t, { cam, aurora: P === 'alaskaNight', moon: P === 'alaskaNight' ? [190, 70, 14, 0.5] : undefined });
    fl_spruceForest(t, { y: 330, cam, snow: P === 'alaskaSpring' ? 0.2 : 0.85 });
    if (P === 'alaskaSpring') { fl_mudGround(335, 480, { cam, under: 'litter', t }); fl_snowGround(335, 480, { melt: o.melt ?? 0.6, cam, under: 'litter' }); fl_grassSpring(380, 480, { grow: o.grow ?? 0.6, t, cam }); fl_flowers(0, 395, 270, 470, { t, cam }); }
    else fl_snowGround(335, 480, { cam, env: P });
    fl_birch(t, { x: 40 - cam * 0.9, y: 360, h: 130, leaf: P === 'alaskaSpring' ? 0.6 : 0, snow: P === 'alaskaSpring' ? 0 : 0.7 });
    fl_spruce(t, { x: 225 - cam * 1.1, y: 400, h: 120, depth: 0.15 });
    if (P === 'alaskaSpring') { k_rays(190, 10, t, { strength: 0.35 }); k_pollen(t, { cam }); k_butterfly(100 + Math.sin(t) * 30, 330 + Math.sin(t * 1.7) * 10, t); }
    else k_snow(t, { cam, density: o.snow ?? 1 });
    fl_branchFg(t, { corner: 'tr', kind: P === 'alaskaSpring' ? 'leafy' : 'spruce', snow: P === 'alaskaSpring' ? 0 : 0.8 });
    k_vignetteWarm(0.3, { cold: P !== 'alaskaSpring' });
  },
  desert(t, u) {
    const cam = k_pan(u, 0, 40, 'io', 8), P = 'desertDusk';
    k_backdrop(P, t, { cam });
    fl_sand(362, 480, { cam, tracks: [{ x0: 20, y0: 450, x1: 250, y1: 430, kind: 'lizard' }] });
    fl_saguaro(t, { x: 60 - cam * 1.0, y: 372, h: 130, depth: 0.3 }); fl_saguaro(t, { x: 210 - cam * 0.8, y: 366, h: 96, depth: 0.5, arms: 1 });
    fl_agave(t, { x: 150 - cam, y: 410, h: 44 }); fl_prickly(t, { x: 235 - cam, y: 420, h: 54 }); fl_ocotillo(t, { x: 20 - cam, y: 432, h: 90 });
    fl_boulders(120 - cam, 440, 40);
    fl_tumbleweed(((u * 20) % 330) - 30, 438, t);
    k_heatShimmer(352, 372, t); k_dust(t, { cam });
    k_bird(80 + u * 10, 70, t, { kind: 'soar', s: 1 });
    fl_grassFg(t, { kind: 'dry', side: 'bottom', h: 40 });
    k_vignetteWarm(0.4);
  },
  savane(t, u) {
    const cam = k_pan(u, 0, 36, 'io', 8), P = 'savannaDawn';
    const bd = k_backdrop(P, t, { cam, birds: true, hills: false });
    fl_savannaSoil(340, 480, { cam });
    fl_acacia(t, { x: 60 - cam * 0.5, y: 330, h: 38, depth: 0.7, sil: true }); fl_acacia(t, { x: 215 - cam * 0.6, y: 338, h: 52, depth: 0.5 });
    fl_savannaGrass(350, 480, { t, cam });
    fl_termiteMound(t, { x: 150 - cam, y: 395, h: 40 });
    if (bd && bd.sun) k_rays(bd.sun[0], bd.sun[1], t, { strength: 0.35 });
    k_dust(t, { cam, beam: bd && bd.sun ? { x: bd.sun[0], y: bd.sun[1], angle: 1.9, spread: 1.2, len: 320 } : undefined });
    fl_grassFg(t, { kind: 'gold', side: 'bottom', h: 56 });
    k_vignetteWarm(0.4);
  },
};
function buildIntro(S) {
  const t1 = P.trois.t0 - 0.1;
  shot('i_gel', S.t0, { draw(u, t) { AP.alaska(t, u, { P: 'alaskaNight', cam: 0 }); const m = kd_frog(135, 318, 2); k_iceBlock(135, 330, 170, 120, { t, preset: 'alaskaNight', crack: prog(u, 1.8, 3.4), warm: prog(u, 2.4, 3.4) }); } });
  shot('i_trois', t1, { draw(u, t) { AP.alaska(t, u, { P: 'alaskaSpring', melt: 0.9, grow: 0.9 }); drawScientist(135, 400, 1.9, t, { hairStyle: 'curlyFade' }); } });
}
function buildGrenouille(S) {
  shot('g1_alaska', S.t0, { draw(u, t) { AP.alaska(t, u, { P: 'alaskaDusk' }); hudTracker(0, 0, prog(u, 0.2, 0.8)); }, ui(u, t) { hudTracker(0, 0, prog(u, 0.2, 0.8)); hudLieu(0, Math.floor(prog(u, 0.4, 1) * 12)); } });
  shot('g2_gel', P.g2.t0 - 0.1, { draw(u, t) { AP.alaska(t, u, { P: 'alaskaNight', snow: 2 }); }, ui(u, t) { hudTracker(0, 0); hudLieu(0); } });
  shot('g3_sucre', P.g3.t0 - 0.1, { draw(u, t) { AP.alaska(t, u, { P: 'alaskaNight', snow: 0.6, cam: 20 }); k_aurora(t, {}); }, ui(u, t) { hudTracker(0, 0); hudLieu(0); } });
  shot('g4_printemps', P.g4.t0 - 0.1, { draw(u, t) { AP.alaska(t, u, { P: 'alaskaSpring', melt: 0.3 + 0.6 * prog(u, 0, 3), grow: 0.2 + 0.7 * prog(u, 0, 3.5) }); }, ui(u, t) { hudTracker(0, 1); hudLieu(0); } });
}
function buildLezard(S) {
  shot('l1_mexique', S.t0, { draw(u, t) { AP.desert(t, u); }, ui(u, t) { hudTracker(1, 1, prog(u, 0.2, 0.8)); hudLieu(1, Math.floor(prog(u, 0.4, 1) * 12)); } });
  shot('l2_menace', P.l2.t0 - 0.1, { draw(u, t) { AP.desert(t, u + 8); }, ui(u, t) { hudTracker(1, 1); hudLieu(1); } });
  shot('l4_gout', P.l4.t0 - 0.1, { draw(u, t) { AP.desert(t, u + 4); }, ui(u, t) { hudTracker(1, 2); hudLieu(1); } });
}
function buildLycaon(S) {
  shot('y1_savane', S.t0, { draw(u, t) { AP.savane(t, u); }, ui(u, t) { hudTracker(2, 2, prog(u, 0.2, 0.8)); hudLieu(2, Math.floor(prog(u, 0.4, 1) * 12)); } });
  shot('y3_vote', P.y3.t0 - 0.1, { draw(u, t) { AP.savane(t, u + 8); }, ui(u, t) { hudTracker(2, 2); hudLieu(2); } });
  shot('y4_nez', P.y4.t0 - 0.1, { draw(u, t) { AP.savane(t, u + 4); }, ui(u, t) { hudTracker(2, 3); hudLieu(2); } });
}
function buildFin(S) {
  shot('fin_choix', S.t0, { draw(u, t) { AP.alaska(t, u, { P: 'alaskaSpring', melt: 1, grow: 1 }); drawScientist(135, 400, 1.9, t, { hairStyle: 'curlyFade', armUp: 0.5 }); } });
}
