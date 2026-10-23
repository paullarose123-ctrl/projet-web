'use strict';
// banc d'essai temporaire (à supprimer en fin de travail)
window.buildBasilic = function (S) {
  const q = new URLSearchParams(location.search).get('dbg') || 'poses';
  shot('dbg', S.t0, {
    draw(u, t) {
      vgrad(0, 0, LW, LH, [[0, '#1a4636'], [1, '#0e2a22']]);
      vgrad(0, 300, LW, 180, [[0, '#2a6648'], [1, '#124a66']]);
      R(0, 300, LW, 1, '#94d098');
      const T = [['sit', 0, 60, 1.0], ['look', 0, 130, 1.0], ['crouch', 0, 200, 1.0], ['leap', 0, 270, 1.0], ['fall', 0, 340, 1.0]];
      if (q === 'poses') {
        ba_lizard(100, 90, 0.9, t, { pose: 'sit' }); ba_lizard(100, 170, 0.9, t, { pose: 'look' });
        ba_lizard(100, 250, 0.9, t, { pose: 'crouch' }); ba_lizard(100, 330, 0.9, t, { pose: 'leap' });
        ba_lizard(100, 410, 0.9, t, { pose: 'fall' });
      }
    },
  });
};
