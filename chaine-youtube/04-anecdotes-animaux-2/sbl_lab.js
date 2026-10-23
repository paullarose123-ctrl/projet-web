'use strict';
// laboratoire temporaire (à supprimer)
function buildScarabee(S) {
  const bg = (u, t) => { vgrad(0, 0, LW, LH, [[0, AM[6]], [0.5, YE[2]], [1, LM[3]]]); };
  shot('lab_poses', S.t0, { draw(u, t) {
    bg(u, t);
    const cells = [['stand', {}], ['walk', { ph: 0 }], ['walk', { ph: 0.25 }], ['walk', { ph: 0.5 }], ['walk', { ph: 0.75 }], ['stand', { up: 1 }], ['aim', { aimK: 1 }], ['aim', { aimK: 1, hot: 1, fire: 1 }]];
    cells.forEach(([pose, op], i) => { const col = i % 2, row = Math.floor(i / 2); sb_beetle(70 + col * 130, 100 + row * 86, 1.0, t, { pose, ...op }); });
  }});
  shot('lab_big', S.t0 + 3, { draw(u, t) { bg(u, t); sb_beetle(150, 210, 2.7, t, { pose: 'aim', aimK: 1, hot: 0.8, fire: 1 }); sb_beetle(130, 420, 2.7, t, { pose: 'stand', up: 1, flip: true }); } });
  shot('lab_sil', S.t0 + 6, { draw(u, t) { bg(u, t); const sz = [0.6, 0.8, 1.0, 1.5]; sz.forEach((s, i) => sb_beetle(80, 60 + i * 60, s, t, { pose: 'stand', sil: '#05040f', shadow: 0 })); sb_beetle(190, 100, 1.2, t, { pose: 'walk', ph: 0.3, sil: '#05040f', shadow: 0 }); sb_beetle(190, 200, 1.2, t, { pose: 'aim', aimK: 1, sil: '#05040f', shadow: 0 }); } });
  shot('lab_walk', S.t0 + 9, { draw(u, t) { bg(u, t); const d = sb_WALK.speed * u; sb_beetle(120, 330, 2.0, t, { pose: 'walk', ph: sb_walkPh(d) }); } });
  shot('lab_toad', S.t0 + 14, { draw(u, t) { bg(u, t);
    sb_toad(70, 150, 1.0, t, { flip: true }); sb_toad(200, 150, 1.0, t, { lunge: 1, tongue: 0.8, flip: true });
    sb_toad(70, 280, 1.0, t, { recoil: 1, shake: 0.5, flip: true, squint: 1 }); sb_toad(200, 280, 1.0, t, { hop: 0.5, flip: true });
    sb_toad(140, 440, 2.4, t, { flip: true }); } });
  shot('lab_cut', S.t0 + 18, { draw(u, t) { sb_cutaway(t, { fill: 0.8, flow: 1.2, mix: 0.7, enz: 0.6, heat: 0.4, hl: 'both' }, {}); } });
  shot('lab_cut2', S.t0 + 21, { draw(u, t) { sb_cutaway(t, { fill: 0.4, flow: 1.2, mix: 1, enz: 1, heat: 0.9, flash: 0.8, boom: u > 0.8 ? 0.6 : 0 }, { zoom: 2.2, fx: 135, fy: 214, cx: 135, cy: 200 }); } });
  shot('lab_jet', S.t0 + 24, { draw(u, t) { bg(u, t); sb_jet(60, 200, 0.0, t, S.t0 + 24.1, { dur: 1.5, len: 160 }); sb_beetle(60, 300, 1.4, t, { pose: 'aim', aimK: 1, hot: 1, fire: 1, tip: 1 }); sb_steam(220, 300, t, {}); } ,
    ui(u, t) { sb_thermo(210, 70, 170, 0.5 + 0.5 * Math.sin(u), t, { flask: true }); sb_thermo(20, 70, 170, 1, t, { flask: true }); } });
  shot('_end', S.t0 + 27, { draw() { } });
}
