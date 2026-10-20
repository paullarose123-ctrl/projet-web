'use strict';
// ───────────────────────── démonstration de flore.js (page solo_flore.html) : 8 plans de 1,7 s ─────────────────────────
// préfixe fd_ ; ciels = simples dégradés (vgrad) et soleil dessinés ici, sans kit.js ; tout le reste vient de flore.js.
// node solo.mjs flore ; PAGE=solo_flore.html OUT=build/flore node check.mjs 6 ; PAGE=solo_flore.html node sheet.mjs 0.6 build/flore/sheet

const fd_SKY = {
  alaskaDusk: [[0, NI[2]], [0.3, NI[4]], [0.55, NI[6]], [0.75, NI[8]], [0.86, NI[9]], [0.93, DU[7]], [1, SK[4]]],
  alaskaSpring: [[0, NI[6]], [0.35, NI[7]], [0.6, NI[8]], [0.78, CY[4]], [0.9, NE[4]], [1, WH[2]]],
  desertDusk: [[0, NI[3]], [0.12, DU[1]], [0.3, DU[3]], [0.48, DU[5]], [0.62, RD[4]], [0.76, AM[6]], [0.88, AM[8]], [1, AM[9]]],
  savannaDawn: [[0, NI[4]], [0.14, DU[2]], [0.3, DU[4]], [0.46, DU[6]], [0.6, DU[7]], [0.72, RD[5]], [0.86, AM[8]], [1, AM[10]]],
};
function fd_sky(env, h = 300, sun = null) {
  vgrad(0, 0, LW, h, fd_SKY[env]);
  const hz = fd_SKY[env][fd_SKY[env].length - 1][1]; R(0, h, LW, 16, hz);        // le ciel déborde de 16 px sous la ligne h : les collines de la démo plongent parfois sous h (sinon bande noire à l'horizon)
  if (sun) { rgrad(sun[0], sun[1], 4, sun[2] * 5, [[0, 'rgba(255,224,138,0.8)'], [0.4, 'rgba(255,184,100,0.3)'], [1, 'rgba(255,184,100,0)']], 1, 'lighter'); disc(sun[0], sun[1], sun[2], AM[10]); disc(sun[0], sun[1], sun[2] - 2, WH[2]); }
}
// collines lointaines (silhouette lisse) : fond de démonstration entre le ciel et les plantes
function fd_hill(y, amp, k, col, ph, cam = 0, par = 0.2) { L.fillStyle = col; for (let x = 0; x < LW; x++) { const h = y - amp * (0.5 + 0.5 * Math.sin((x + cam * par) * k + ph)) - amp * 0.4 * Math.sin((x + cam * par) * k * 2.3 + ph * 2); L.fillRect(x, Math.round(h), 1, 300); } }
// neige qui tombe (démonstration seulement : 3 plans de points)
function fd_flakes(t, cam = 0) { for (let k = 0; k < 90; k++) { const z = 1 + (k % 3), x = ((fl_h(k, 5) * 330 + t * (6 + z * 3) * (k % 2 ? 1 : 0.7) - cam * z * 0.3) % 330 + 330) % 330 - 30, y = ((fl_h(k, 6) * 520 + t * (14 + z * 9)) % 520) - 20; R(x, y, z > 2 ? 2 : 1, z > 2 ? 2 : 1, z > 1 ? NE[4] : NE[3]); } }
function fd_motes(t, col, n = 30, cam = 0) { for (let k = 0; k < n; k++) { const x = ((fl_h(k, 15) * 300 + t * (4 + k % 5) - cam * 0.6) % 300 + 300) % 300 - 15, y = 150 + fl_h(k, 16) * 280 + Math.sin(t * 1.3 + k) * 4; R(x, y, 1, 1, col); } }

// les 8 plans (id → draw(u, t)) : au niveau du fichier pour que le préchauffage (INITS) les dessine une fois avant le premier plan
const fd_DRAW = {

  // ── 1 · forêt d'épicéas enneigée, heure bleue : trois plans de forêt dans la brume, neige ombrée, épicéas de premier plan ──
  fd_epiceas(u, t) {
    const E = 'alaskaDusk', cam = u / 1.7 * 26;
    fd_sky(E, 300);
    fl_spruceForest(t, { env: E, y: 305, bands: 3, h: 58, seed: 3, cam, snow: 0.9 });
    fl_snowGround(300, 480, { env: E, seed: 7, cam, t, shadows: [{ x: 96, y: 330, len: 80, w: 9 }, { x: 214, y: 336, len: 120, w: 13 }, { x: 22, y: 452, len: 170, w: 18 }], tracks: [{ x0: 40, y0: 470, x1: 210, y1: 318, kind: 'paw', step: 11 }] });
    fl_spruce(t, { x: 214, y: 336, h: 118, env: E, depth: 0.22, seed: 2, cam, snow: 0.95 });
    fl_spruce(t, { x: 96, y: 330, h: 74, env: E, depth: 0.35, seed: 5, cam, snow: 0.9 });
    fl_spruce(t, { x: 22, y: 452, h: 215, env: E, depth: 0.0, seed: 1, cam, snow: 1.0 });
    fl_deadBranches(t, { x: 150, y: 420, h: 34, n: 4, env: E, depth: 0.15, snow: 0.9, seed: 3, cam });
    fl_branchFg(t, { env: E, corner: 'tr', kind: 'spruce', len: 140, seed: 6, snow: 0.8, cam });
    fd_flakes(t, cam);
  },

  // ── 2 · bouleaux et litière de feuilles sous la neige qui fond ──
  fd_bouleaux(u, t) {
    const E = 'alaskaSpring', cam = u / 1.7 * -20, melt = 0.28 + 0.4 * sm(u / 1.7);
    fd_sky(E, 290);
    fd_hill(292, 22, 0.02, '#a9bcd8', 1.0, cam, 0.15);
    fl_spruceForest(t, { env: E, y: 300, bands: 2, h: 52, seed: 9, cam, snow: 0.2, fog: 0.6 });
    fl_snowGround(300, 480, { env: E, seed: 4, cam, t, melt, under: 'litter' });
    fl_birch(t, { x: 54, y: 336, h: 130, env: E, depth: 0.45, leaf: 0, snow: 0.2, frost: 0.8, seed: 2, cam, stems: 2 });
    fl_birch(t, { x: 232, y: 346, h: 150, env: E, depth: 0.35, leaf: 0, snow: 0.2, seed: 5, cam });
    fl_leafLitter(70, 372, 210, 430, { env: E, snow: 1 - melt * 0.9, seed: 3, cam });
    fl_log(14, 420, 96, 15, { env: E, moss: 0.7, snow: 0.35 * (1 - melt), seed: 6, end: 'left', cam, depth: 0.2 });
    fl_deadBranches(t, { x: 190, y: 400, h: 30, n: 4, kind: 'fallen', env: E, depth: 0.2, seed: 4, cam });
    fl_birch(t, { x: 128, y: 478, h: 245, env: E, depth: 0.0, leaf: 0, snow: 0.1, seed: 7, cam });
    fl_moss(176, 450, 38, { env: E, seed: 8, cam, depth: 0.1 });
  },

  // ── 3 · prairie de printemps fleurie : herbe neuve, crocus, saxifrages, anémones, fougères, bouleaux en feuilles ──
  fd_prairie(u, t) {
    const E = 'alaskaSpring', cam = u / 1.7 * 22;
    fd_sky(E, 300);
    fd_hill(290, 26, 0.018, '#bcd0e8', 0.4, cam, 0.12); fd_hill(300, 16, 0.03, '#a2c0a8', 2.0, cam, 0.2);
    fl_spruceForest(t, { env: E, y: 312, bands: 2, h: 56, seed: 12, cam, snow: 0, fog: 0.5, depthNear: 0.5 });
    fl_grassSpring(306, 480, { env: E, t, cam, grow: 1, seed: 3, h: 15 });
    fl_birch(t, { x: 60, y: 340, h: 125, env: E, depth: 0.45, leaf: 0.75, seed: 2, cam, stems: 2 });
    fl_birch(t, { x: 214, y: 350, h: 140, env: E, depth: 0.35, leaf: 0.8, seed: 3, cam });
    fl_flowers(10, 352, 262, 400, { env: E, t, cam, seed: 4, density: 0.9, zmin: 0.55, zmax: 0.95, depth: 0.3 });
    fl_ferns(t, { x: 40, y: 410, h: 28, n: 7, env: E, depth: 0.2, seed: 2, cam, unfurl: 0.5 });
    fl_ferns(t, { x: 238, y: 420, h: 34, n: 8, env: E, depth: 0.15, seed: 4, cam, unfurl: 0.2 });
    fl_flowers(6, 410, 266, 476, { env: E, t, cam, seed: 8, density: 1.1, zmin: 0.9, zmax: 1.6, depth: 0.1 });
    fl_log(150, 436, 90, 14, { env: E, moss: 0.8, seed: 5, end: 'right', cam, depth: 0.15 });
    fl_branchFg(t, { env: E, corner: 'tr', kind: 'leafy', len: 175, seed: 3, blossom: true, cam });
    fd_motes(t, '#fff8c0', 26, cam);
  },

  // ── 4 · désert au coucher du soleil : mesas, saguaros, agaves, figuier de Barbarie, ocotillo ──
  fd_desert(u, t) {
    const E = 'desertDusk', cam = u / 1.7 * 24;
    fd_sky(E, 300, [190, 292, 17]);
    fl_desertRock(60 - cam * 0.15, 318, 96, 60, 'mesa', 2, { env: E, depth: 0.85 });
    fl_desertRock(224 - cam * 0.15, 320, 70, 78, 'mesa', 5, { env: E, depth: 0.8 });
    fl_desertRock(150 - cam * 0.2, 312, 34, 34, 'ledge', 3, { env: E, depth: 0.9 });
    fl_sand(300, 480, { env: E, seed: 5, cam, t, pebbles: 70, tracks: [{ x0: 190, y0: 470, x1: 120, y1: 335, kind: 'paw', step: 12 }] });
    fl_saguaro(t, { x: 232, y: 350, h: 84, arms: 2, env: E, depth: 0.5, seed: 5, cam });
    fl_agave(t, { x: 120, y: 345, h: 17, env: E, depth: 0.45, seed: 2, cam }); fl_agave(t, { x: 168, y: 340, h: 14, env: E, depth: 0.5, seed: 4, cam });
    fl_saguaro(t, { x: 62, y: 420, h: 196, arms: 3, env: E, depth: 0.12, seed: 3, cam, bloom: 0.8 });
    fl_prickly(t, { x: 178, y: 454, h: 62, env: E, depth: 0.04, seed: 2, cam });
    fl_agave(t, { x: 130, y: 468, h: 40, env: E, depth: 0.0, seed: 6, cam, stalk: 0 });
    fl_ocotillo(t, { x: 240, y: 470, h: 102, env: E, depth: 0.0, seed: 3, cam, bloom: 0.9 });
    fl_dryShrub(t, { x: 100, y: 396, h: 22, env: E, depth: 0.3, seed: 2, cam });
    fd_motes(t, '#ffd890', 24, cam);
  },

  // ── 5 · sable rippé, traces, boule d'herbe qui roule, cholla, buissons secs, rochers ──
  fd_sable(u, t) {
    const E = 'desertDusk', cam = u / 1.7 * 18, tx = -20 + (u / 1.7) * 330;
    fd_sky(E, 312, [60, 288, 15]);
    fd_hill(300, 20, 0.022, '#7a3a86', 0.8, cam, 0.12); fd_hill(304, 12, 0.04, '#5e2e78', 2.6, cam, 0.2);
    fl_desertRock(214 - cam * 0.2, 326, 52, 66, 'spire', 4, { env: E, depth: 0.7 });
    fl_sand(304, 480, { env: E, seed: 3, cam, t, pebbles: 90, tracks: [{ x0: 20, y0: 462, x1: 252, y1: 360, kind: 'lizard', step: 9 }, { x0: 250, y0: 400, x1: 120, y1: 330, kind: 'paw', step: 12 }] });
    fl_cholla(t, { x: 56, y: 372, h: 40, env: E, depth: 0.3, seed: 2, cam }); fl_cholla(t, { x: 150, y: 352, h: 28, env: E, depth: 0.4, seed: 4, cam });
    fl_dryShrub(t, { x: 214, y: 396, h: 30, env: E, depth: 0.25, seed: 3, cam }); fl_dryShrub(t, { x: 94, y: 410, h: 24, env: E, depth: 0.2, seed: 1, cam });
    fl_boulders(70, 458, 150, { env: E, mat: 'sand', seed: 4, depth: 0.05, cam, n: 4 });
    fl_tumbleweed(tx, 436, t, { env: E, r: 15, hop: 8, cam });
    fl_dryShrub(t, { x: 226, y: 472, h: 56, env: E, depth: 0.0, seed: 5, cam });
    fl_grassFg(t, { env: E, kind: 'dry', side: 'right', h: 70, n: 16, seed: 9, cam });
    fd_motes(t, '#ffe08a', 30, cam);
  },

  // ── 6 · savane au lever du jour : acacias en parasol, baobab, termitière, hautes herbes qui ploient ──
  fd_savane(u, t) {
    const E = 'savannaDawn', cam = u / 1.7 * 22;
    fd_sky(E, 300, [190, 296, 18]);
    fd_hill(300, 14, 0.025, '#b0587e', 0.8, cam, 0.1);
    fl_savannaSoil(300, 480, { env: E, seed: 3, cam, t, depth: 0.1 });
    fl_baobab(t, { x: 40 - cam * 0.2, y: 314, h: 58, env: E, depth: 0.82, sil: true, seed: 2, leaf: 0.6 });
    fl_acacia(t, { x: 232, y: 322, h: 52, env: E, depth: 0.78, sil: true, seed: 5, cam, kind: 'tortilis' });
    fl_acacia(t, { x: 120, y: 340, h: 76, env: E, depth: 0.42, seed: 3, cam, kind: 'lean' });
    fl_savannaGrass(332, 392, { env: E, t, cam, h: 28, seed: 2, bands: 2, depth: 0.62 });
    fl_termiteMound(t, { x: 214, y: 408, h: 46, env: E, depth: 0.25, seed: 2, cam });
    fl_acacia(t, { x: 40, y: 440, h: 150, env: E, depth: 0.05, seed: 4, cam, kind: 'tortilis', cw: 230 });
    fl_bush(t, { x: 170, y: 430, w: 44, env: E, depth: 0.15, seed: 2, cam, kind: 'olive' });
    fl_savannaGrass(420, 480, { env: E, t, cam, h: 66, seed: 6, bands: 2, depth: 0.2, depthNear: 0.0 });
    fl_grassFg(t, { env: E, kind: 'gold', side: 'both', h: 100, n: 26, seed: 5, cam, dip: 0.45 });
    fd_motes(t, '#ffe6a0', 36, cam);
  },

  // ── 7 · premier plan d'herbes qui encadre (vert de printemps), branche de coin, bouquets de fleurs ──
  fd_premier(u, t) {
    const E = 'alaskaSpring', cam = u / 1.7 * 30;
    fd_sky(E, 300);
    fd_hill(292, 26, 0.018, '#bcd0e8', 2.4, cam, 0.12);
    fl_spruceForest(t, { env: E, y: 318, bands: 2, h: 60, seed: 5, cam, snow: 0.1, fog: 0.5, depthNear: 0.5 });
    fl_grassSpring(312, 480, { env: E, t, cam, grow: 1, seed: 8, h: 14 });
    fl_birch(t, { x: 150, y: 352, h: 120, env: E, depth: 0.4, leaf: 0.85, seed: 8, cam });
    fl_flowers(40, 380, 250, 430, { env: E, t, cam, seed: 3, density: 0.8, zmin: 0.7, zmax: 1.2, depth: 0.2 });
    fl_ferns(t, { x: 200, y: 440, h: 36, n: 7, env: E, depth: 0.1, seed: 5, cam, unfurl: 0.4 });
    fl_rock(70, 452, 56, 36, 'round', 4, { env: E, mat: 'stone', depth: 0.1, cam, moss: 0.6, grass: 'green' });
    fl_grassFg(t, { env: E, kind: 'spring', side: 'both', h: 150, n: 40, seed: 2, cam, dip: 0.75 });
    fl_grassFg(t, { env: E, kind: 'green', side: 'bottom', h: 66, n: 36, seed: 7, cam, dip: 0.25 });
    fl_branchFg(t, { env: E, corner: 'tl', kind: 'leafy', len: 150, seed: 6, blossom: true, cam });
    fd_motes(t, '#fff8c0', 26, cam);
  },

  // ── 8 · rochers : gris, rouge, sable, enneigés, moussus ──
  fd_rochers(u, t) {
    const E = 'alaskaSpring', cam = u / 1.7 * 16;
    fd_sky(E, 300);
    fd_hill(292, 24, 0.02, '#a9bcd8', 1.0, cam, 0.15);
    fl_grassSpring(300, 480, { env: E, t, cam, grow: 0.55, seed: 2, h: 11 });
    fl_rock(46, 372, 74, 54, 'round', 2, { env: E, mat: 'stone', depth: 0.3, cam, moss: 0.7, grass: 'green' });
    fl_rock(150, 360, 64, 38, 'flat', 4, { env: E, mat: 'stone', depth: 0.4, cam, snow: 0.8, grass: 'green' });
    fl_rock(232, 380, 46, 66, 'tall', 3, { env: E, mat: 'dark', depth: 0.25, cam, snow: 0.5, grass: 'green' });
    fl_rock(110, 428, 62, 46, 'round', 7, { env: E, mat: 'warm', depth: 0.1, cam, moss: 0.4, grass: 'green' });
    fl_rock(214, 452, 50, 40, 'slab', 5, { env: E, mat: 'stone', depth: 0.05, cam, grass: 'green' });
    fl_rock(30, 472, 76, 60, 'round', 6, { env: E, mat: 'sand', depth: 0.0, cam, grass: 'green' });
    fl_moss(150, 466, 40, { env: E, seed: 3, cam, depth: 0.05 });
    fl_flowers(100, 436, 160, 476, { env: E, t, cam, seed: 2, density: 0.7, zmin: 0.9, zmax: 1.3, kind: 'saxifrage', depth: 0.1 });
  },
};

// préchauffage : dessine chaque plan une fois (au milieu de sa durée) avant le premier plan, puis efface. Les sprites étant déterministes (clés = valeurs lues par le constructeur),
// le premier vrai plan ne paie plus leur construction. Recette à copier dans un segment :  INITS.push(() => { monPlan(0.85, 3); clearL(); });
function fd_warm() { if (location.search.includes('nowarm')) return; for (const id in fd_DRAW) fd_DRAW[id](0.85, 3); clearL(); }       // ?nowarm : sans préchauffage (test de déterminisme)
INITS.push(fd_warm);

function buildFloreDemo(S) { Object.keys(fd_DRAW).forEach((id, i) => shot(id, S.t0 + 1.7 * i, { draw: fd_DRAW[id] })); }
