'use strict';
// laboratoire temporaire (à supprimer)
function buildScarabee(S) {
  const bg = (u, t) => { vgrad(0, 0, LW, LH, [[0, AM[6]], [0.5, YE[2]], [1, LM[3]]]); };
  shot('lab_poses', S.t0, { draw(u, t) {
    bg(u, t);
    const cells = [['stand', {}], ['walk', { ph: 0 }], ['walk', { ph: 0.25 }], ['walk', { ph: 0.5 }], ['walk', { ph: 0.75 }], ['stand', { up: 1 }], ['aim', { aimK: 1 }], ['aim', { aimK: 1, hot: 1, fire: 1 }]];
    cells.forEach(([pose, op], i) => { const col = i % 2, row = Math.floor(i / 2); sb_beetle(70 + col * 130, 100 + row * 86, 1.0, t, { pose, ...op }); });
  }});
  shot('lab_big', S.t0 + 3, { draw(u, t) { bg(u, t); sb_beetle(130, 190, 3.0, t, { pose: 'stand' }); sb_beetle(130, 400, 2.4, t, { pose: 'walk', ph: (u * 2) % 1, flip: true }); } });
  shot('lab_sil', S.t0 + 6, { draw(u, t) { bg(u, t); const sz = [0.6, 0.8, 1.0, 1.5]; sz.forEach((s, i) => sb_beetle(80, 60 + i * 60, s, t, { pose: 'stand', sil: '#05040f', shadow: 0 })); sb_beetle(190, 100, 1.2, t, { pose: 'walk', ph: 0.3, sil: '#05040f', shadow: 0 }); sb_beetle(190, 200, 1.2, t, { pose: 'aim', aimK: 1, sil: '#05040f', shadow: 0 }); } });
  shot('_end', S.t0 + 9, { draw() { } });
}
