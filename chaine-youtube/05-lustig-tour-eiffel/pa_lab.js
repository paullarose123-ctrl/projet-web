'use strict';
// pa_lab.js : banc d'essai (à supprimer). Une seule plan 'lab' qui appelle PA_LAB[window.LAB.name](t, o).
const PA_LAB = {};
window.LAB = { name: '', o: {}, t: 0 };
function buildIdee(S) {
  shot('lab', S.t0, {
    capY: 9000,
    draw(u, t) { const f = PA_LAB[window.LAB.name]; if (f) f(window.LAB.t ?? t, window.LAB.o || {}); else vgrad(0, 0, LW, LH, [[0, NI[2]], [1, NI[0]]]); },
    ui(u, t) { const f = PA_LAB[window.LAB.name + '_ui']; if (f) f(window.LAB.t ?? t, window.LAB.o || {}); },
    ev: [],
  });
}
PA_LAB.ciel = (t, o) => { pa_ciel(t, o); };
PA_LAB.tour = (t, o) => { const E = pa_ciel(t, Object.assign({ h: 360, clouds: 3 }, o)); const r = pa_tour(135, o.baseY ?? 440, o.s ?? 1.1, t, o); };
PA_LAB.fumee = (t, o) => { const E = pa_ciel(t, Object.assign({ h: 360, clouds: 2 }, o)); for (let k = 0; k < 3; k++) { const kind = ['fumee', 'vapeur', 'noire'][k]; R(40 + k * 80, 350, 10, 40, ST[2]); pa_vapeur(45 + k * 80, 350, t, Object.assign({ kind, w2: k === 1 ? 14 : 9, h: 90 }, o)); } };
PA_LAB.house = (t, o) => {
  const E = pa_ciel(t, Object.assign({ h: 330, clouds: 2 }, o)); const M = pa_mat(o); const b = new PaBuf(270, 480);
  pa_house(b, 6, 200, 70, { M, det: 1, nfl: 4, fh: 12, ww: 4, wh: 8, wp: 8.5, roofH: 15, seed: 3, balc: [1, 3], side: 1 });
  pa_house(b, 90, 260, 100, { M, det: 2, nfl: 4, fh: 17, ww: 6, wh: 11, wp: 13, roofH: 22, seed: 5, balc: [1, 3], side: 1 });
  pa_house(b, 200, 150, 60, { M, det: 0, nfl: 5, fh: 7, ww: 2, wh: 4, wp: 5, roofH: 9, seed: 8, balc: [], side: 1 });
  pa_house(b, 6, 470, 130, { M, det: 3, nfl: 3, fh: 30, ww: 11, wh: 20, wp: 22, roofH: 34, seed: 11, balc: [0, 2], side: 1, shop: true });
  pa_put(b.done(), 0, 0);
};
PA_LAB.toits = (t, o) => { pa_ciel(t, Object.assign({ h: 330, clouds: 4 }, o)); if (o.tower) pa_tour(o.tower[0], o.tower[1], o.tower[2], t, Object.assign({ haze: 0.3, shadow: 0 }, o)); pa_toits(t, o); };
PA_LAB.journal = (t, o) => { vgrad(0, 0, LW, LH, [[0, WO[2]], [1, WO[1]]]); pa_journal(o.x ?? 50, o.y ?? 60, o.w ?? 170, o.h ?? 230, t, o); if (o.w2) pa_journal(20, 330, o.w2, 90, t, Object.assign({}, o, { titre: 'LA TOUR A VENDRE', side: 'back' })); };
PA_LAB.journal_ui = (t, o) => { ICONES[0](20, 20); ICONES[0](60, 20); R(78, 10, 24, 22, '#171a45'); ICONES[0](90, 21); };
PA_LAB.icone = (t, o) => { vgrad(0, 0, LW, LH, [[0, NI[3]], [1, NI[1]]]); };
PA_LAB.icone_ui = (t, o) => { for (let k = 0; k < 4; k++) { R(10 + k * 30, 10, 22, 22, '#171a45'); ICONES[k](21 + k * 30, 21); } hudTracker(0, 0, 1, 8, 60); hudTracker(0, 1, 1, 8, 100); };
PA_LAB.petits = (t, o) => { pa_ciel(t, Object.assign({ h: 330, clouds: 2 }, o)); R(0, 300, 270, 180, ST[4]);
  for (let k = 0; k < 8; k++) pa_passant(30 + k * 28, 350 + (k % 2) * 40, 1 + (k % 3) * 0.5, t, Object.assign({ seed: k + 1, dir: k % 2 ? -1 : 1, speed: k % 4 === 0 ? 0 : 14 }, o));
  for (let k = 0; k < 6; k++) pa_pigeon(30 + k * 38, 430, 1 + (k % 3) * 0.7, t, Object.assign({ seed: k + 1, dir: k % 2 ? -1 : 1, mode: ['auto', 'walk', 'peck', 'sit', 'fly', 'auto'][k] }, o)); };
PA_LAB.cafe = (t, o) => { pa_cafe(t, o); };
PA_LAB.voiture = (t, o) => { pa_ciel(t, Object.assign({ h: 330, clouds: 2 }, o)); R(0, 330, 270, 150, ST[4]); pa_voiture(80, 380, 1, t, Object.assign({ kind: 'taxi', speed: 40, dir: 1 }, o)); pa_voiture(170, 440, 1, t, Object.assign({ kind: 'limousine', speed: 0, dir: -1 }, o)); pa_voiture(120, 300, 0.6, t, Object.assign({ kind: 'torpedo', speed: 20, dir: 1 }, o)); };
PA_LAB.rue = (t, o) => { pa_ciel(t, Object.assign({ h: 330, clouds: 3 }, o)); if (o.tower) pa_tour(o.tower[0], o.tower[1], o.tower[2], t, Object.assign({ haze: 0.5, shadow: 0 }, o)); pa_rue(t, o); };
PA_LAB.peintres = (t, o) => { pa_ciel(t, Object.assign({ h: 330, clouds: 2 }, o)); pa_echafaudage(150, 60, 100, 280, t, o); pa_peintres(100, 300, 1.4, t, Object.assign({ n: 2 }, o)); pa_peintres(200, 420, 0.5, t, Object.assign({ n: 2, seed: 3 }, o)); };
PA_LAB.detail = (t, o) => { pa_tourDetail(t, o); };
PA_LAB.pied = (t, o) => { pa_tourPied(t, o); };
PA_LAB.train = (t, o) => { pa_ciel(t, Object.assign({ h: 360, clouds: 2 }, o)); R(0, 360, 270, 120, ST[3]); R(0, 330, 270, 40, ST[4]);
  const x = o.x ?? 190 ; pa_train(x, 420, o.s ?? 0.62, t, Object.assign({ cars: 2, speed: o.speed ?? 30 }, o)); };
PA_LAB.gare = (t, o) => { pa_gare(Object.assign({}, o, { layer: 'back' }) && t, Object.assign({}, o, { layer: 'back' })); if (o.train !== false) pa_train(o.tx ?? 230, 392, o.ts ?? 0.8, t, Object.assign({ cars: 2, speed: o.speed ?? 0, dir: 1 }, o)); pa_gare(t, Object.assign({}, o, { layer: 'front' })); };
PA_LAB.commis = (t, o) => { pa_commissariat(t, o); };
PA_LAB.agents = (t, o) => { vgrad(0, 0, LW, LH, [[0, NI[8]], [1, NE[2]]]); R(0, 330, 270, 150, ST[4]); pa_agent(40, 400, 1.5, t, { mode: 'stand' }); pa_agent(110, 400, 1.5, t, { mode: 'walk' }); pa_agent(190, 400, 1.5, t, { mode: 'run', dir: -1 }); pa_agent(60, 450, 3, t, { mode: 'stand', dir: -1 }); };
PA_LAB.pieces = (t, o) => { pa_ciel(t, { h: 330, clouds: 2 }); pa_tour(135, 440, 1.0, t, { shadow: 0.2 }); pa_pieces(135, 200, t, 1, { n: 16 }); pa_pieces(120, 300, t, 1.4, { n: 10, mode: 'chute', seed: 3 }); };
