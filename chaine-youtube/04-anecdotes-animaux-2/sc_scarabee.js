'use strict';
const sb_GY = 330;
function sb_wrap(x, cam, par = 1, W = 440) { return ((x - cam * par) % W + W) % W - 80; }
function sb_scene(u, t, cam, o = {}) {
  const gy = o.gy ?? sb_GY, E = 'savannaDawn';
  // ciel doré
  vgrad(0, 0, LW, gy, [[0, AM[4]], [0.3, AM[6]], [0.62, AM[8]], [1, AM[9]]]);
  rgrad(228 - cam * 0.03, 170, 4, 120, [[0, 'rgba(255,250,214,1)'], [0.3, 'rgba(255,228,150,0.75)'], [1, 'rgba(255,190,70,0)']], 0.9, 'lighter');
  { const r = rng(21); L.save(); for (let i = 0; i < 28; i++) { const x = sb_wrap(r() * 440, cam, 0.04 + r() * 0.06), y = 20 + r() * 200, rad = 3 + r() * 9; L.globalAlpha = 0.07 + r() * 0.12; L.fillStyle = r() < 0.5 ? '#fff2c4' : '#ffc84a'; L.beginPath(); L.arc(x, y, rad, 0, TAU); L.fill(); } L.restore(); }
  // prairie lointaine floue
  vgrad(0, gy - 90, LW, 92, [[0, 'rgba(120,150,56,0)'], [0.35, 'rgba(120,156,56,0.55)'], [1, 'rgba(52,80,26,0.95)']]);
  fl_savannaGrass(gy - 60, gy - 6, { t, cam: clamp(cam * 0.3, -100, 100), bands: 3, h: 44, depth: 0.7, depthNear: 0.4, seed: 5, green: true, env: E });
  k_haze(gy - 96, gy - 20, '#ffe08a', 0.4, { t, cam: cam * 0.3, profile: 'bottom' });
  vgrad(0, gy - 30, LW, 32, [[0, 'rgba(52,80,26,0)'], [0.6, 'rgba(40,62,18,0.9)'], [1, 'rgba(30,46,12,1)']]);
  // sol : terre brune accrochée par la lumière rasante, grains, cailloux, mousse, jeunes pousses (positions enroulées : le sol défile sans limite)
  vgrad(0, gy - 3, LW, LH - gy + 3, [[0, WO[4]], [0.05, WO[3]], [0.3, WO[2]], [1, WO[0]]]);
  L.fillStyle = 'rgba(255,200,74,0.55)'; L.fillRect(0, gy - 3, LW, 1); L.fillStyle = 'rgba(255,224,138,0.35)'; L.fillRect(0, gy - 2, LW, 1);
  { const r = rng(9); for (let i = 0; i < 300; i++) { const x = sb_wrap(r() * 440, cam), y = gy + r() * (LH - gy), a = 0.2 + r() * 0.45; L.fillStyle = r() < 0.55 ? WO[5] : WO[1]; L.globalAlpha = a; L.fillRect(Math.round(x), Math.round(y), 1 + Math.round(r() * 3 * (y - gy) / 100), 1); } L.globalAlpha = 1;
    for (let i = 0; i < 22; i++) { const x = sb_wrap(r() * 440, cam), y = gy + 4 + r() * 130, w = 2 + r() * 3.4 * (1 + (y - gy) / 60); sb_shadow(x - w * 0.8, y + 1, w * 1.7, w * 0.35, 0.3); ell(x, y, Math.round(w), Math.max(1, Math.round(w * 0.55)), WO[4]); ell(x - 1, y - 1, Math.max(1, Math.round(w * 0.7)), Math.max(1, Math.round(w * 0.35)), WO[6]); } }
  for (const [x0, y0, w, k] of [[30, 12, 46, 0], [250, 26, 60, 1], [330, 8, 38, 0]]) { const x = sb_wrap(x0, cam); if (k) fl_rock(x, gy + y0, w, w * 0.5, 'round', 4, { env: E, mat: 'warm', moss: 0.6, depth: 0.1 }); else fl_moss(x, gy + y0, w, { env: E, seed: 3, depth: 0.1 }); }
  for (const [x0, y0, h, sd] of [[110, 40, 26, 2], [380, 52, 30, 5]]) fl_ferns(t, { x: sb_wrap(x0, cam), y: gy + y0, h, n: 6, seed: sd, env: E, depth: 0.1, unfurl: 0.3 });
}
// avant-plan fixe (collé au cadre) : herbes en bordure, pollen, poussière, vignette chaude
function sb_fg(u, t, cam, o = {}) {
  fl_grassFg(t, { env: 'savannaDawn', kind: 'gold', side: 'bottom', h: 62, n: 24, seed: 8, cam: 0 });
  fl_grassFg(t, { env: 'savannaDawn', kind: 'green', side: 'left', h: 56, n: 8, seed: 3, cam: 0, y: 470 });
  k_pollen(t, { n: 46, y0: 40, y1: 330, cam, par: 0.8 });
  k_dust(t, { n: 14, y0: 60, y1: 300, cam, seed: 9, par: 0.6 });
  k_vignetteWarm(0.45);
}
function buildScarabee(S) {
  shot('sb_lab', S.t0, { draw(u, t) {
    const d = sb_WALK.speed * u, cam = d * 2.0 - 40 * u; sb_scene(u, t, cam); sb_beetle(30 + 40 * u, 336, 2.0, t, { pose: 'walk', ph: sb_walkPh(d) }); sb_fg(u, t, cam); },
    ui(u, t) { hudTracker(0, 0, 1); hudLieu(0); tagBox(8, 40, "JUSQU'À ≈ 100 °C", 'red'); const q = sb_thermo(214, 90, 190, prog(u, 0.2, 1.4), t, { flask: true }); counter(190, 62, '100°C', 2); } });
  shot('_end', S.t0 + 3, { draw() { } });
}
