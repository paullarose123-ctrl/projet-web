'use strict';
window.buildBasilic = function (S) {
  shot('dbg', S.t0, {
    draw(u, t) {
      vgrad(0, 0, LW, LH, [[0, '#1a4636'], [1, '#0e2a22']]);
      vgrad(0, 300, LW, 180, [[0, '#2a6648'], [1, '#124a66']]);
      R(0, 300, LW, 1, '#94d098');
      ba_lizard(165, 150, 2.0, t, { pose: 'sit' });
      ba_lizard(185, 300, 1.3, t, { pose: 'run', ph: u * 0.5, tint: [300, '18,74,102', 0.5] });
    },
  });
};
