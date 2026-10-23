'use strict';
const _bb = window.buildBasilic;
window.buildBasilic = function (S) {
  _bb(S);
  shot('dbg', S.t1 - 0.3, {
    draw(u, t) {
      vgrad(0, 0, LW, LH, [[0, '#2a6648'], [1, '#124a66']]);
      ba_birdShadow(135, 120, t, { s: 1.5, a: 0.6, squash: 0.5 });
      ba_birdShadow(135, 240, t, { s: 1.5, a: 0.6, squash: 1.0 });
      ba_caiman(70, 380, 1.3, t, { rise: 1, open: 0.8 });
    },
  });
};
