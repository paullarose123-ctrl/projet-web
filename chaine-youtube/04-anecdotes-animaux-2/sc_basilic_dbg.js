'use strict';
window.buildBasilic = function (S) {
  shot('dbg', S.t0, {
    draw(u, t) { vgrad(0, 0, LW, LH, [[0, '#1a4636'], [1, '#0e2a22']]); },
    ui(u, t) { hudTracker(1, 1, 1); hudLieu(1); ICONES[1](60, 100); ICONES[1](100, 100); R(0, 120, 270, 40, '#fff2c4'); ICONES[1](30, 140); },
  });
};
