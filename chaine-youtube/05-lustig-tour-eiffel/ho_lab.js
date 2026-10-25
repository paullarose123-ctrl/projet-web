'use strict';
// banc d'essai (à supprimer) : HO_LAB[nom] = { draw(u, t), ui(u, t) }
const HO_LAB = {};
function buildKitDemo(S) {
  const names = Object.keys(HO_LAB);
  const sp = Math.min(5, 55 / Math.max(1, names.length)); names.forEach((n, i) => shot('lab_' + n, i * sp, { draw: (u, t) => HO_LAB[n].draw(u, t), ui: (u, t) => HO_LAB[n].ui && HO_LAB[n].ui(u, t) }));
  if (!names.length) shot('lab_vide', 0, { draw() { } });
}
window.hoRender = function (name, u) {
  for (const c of [X, L, Y]) { c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over'; c.filter = 'none'; c.shadowBlur = 0; }
  const sc = HO_LAB[name]; if (!sc) throw new Error('scene ' + name);
  clearL(); sc.draw(u, 100 + u); quantize(); L.setTransform(1, 0, 0, 1, 0, 0); if (sc.ui) sc.ui(u, 100 + u);
  X.imageSmoothingEnabled = false; X.drawImage(low, 0, 0, W, H);
  return document.querySelector('canvas').toDataURL('image/png');
};
window.hoTime = function (name, u, n) { const sc = HO_LAB[name]; for (let k = 0; k < 2; k++) { clearL(); sc.draw(u, 100 + u); quantize(); } const t0 = performance.now(); for (let i = 0; i < n; i++) { clearL(); sc.draw(u + i / 30, 100 + u + i / 30); quantize(); if (sc.ui) sc.ui(u + i / 30, 100 + u + i / 30); } return (performance.now() - t0) / n; };

HO_LAB.stampPov = {
  draw(u, t) {
    vgrad(0, 0, LW, LH, [[0, DU[4]], [0.6, AM[6]], [1, WO[3]]]);
    ho_tampon(135, 190, 1, u, 1.0, { texte: 'VENDUE' });
  },
};
HO_LAB.stampPaper = {
  draw(u, t) {
    R(0, 0, LW, LH, WH[1]); R(0, 0, LW, 80, WH[2]);
    ho_tampon(135, 190, 1, u, 1.0, { texte: 'OFFICIEL', view: 'pov', frame: 'double' });
  },
};
HO_LAB.stampSide = {
  draw(u, t) {
    R(0, 0, LW, LH, WO[2]); R(40, 150, 190, 150, WH[1]);
    ho_tampon(135, 230, 0.8, u, 1.0, { texte: 'OFFICIEL', view: 'side' });
  },
};
HO_LAB.imprints = {
  draw(u, t) {
    R(0, 0, LW, LH, WH[1]);
    ho_empreinte(135, 50, 1, 'VENDUE');
    ho_empreinte(135, 130, 1, 'ARNAQUE', { barre: 1 });
    ho_empreinte(135, 210, 1, 'PAS DE PLAINTE');
    ho_empreinte(135, 290, 0.8, 'JAMAIS A LUI', { frame: 'fill' });
    ho_empreinte(135, 360, 0.7, 'SECRET', { frame: 'rect' });
    ho_empreinte(135, 420, 0.7, 'OFFICIEL', { frame: 'double' });
  },
};

HO_LAB.docs = {
  draw(u, t) {
    vgrad(0, 0, LW, LH, [[0, WO[1]], [1, WO[0]]]);
    ho_document(14, 14, 110, 150, t, { write: 1, seal: 1, sign: 1, lines: 14 });
    ho_document(140, 20, 110, 150, t, { write: prog(u, 0, 2), seal: 0, sign: prog(u, 1, 2), stamp: prog(u, 2, 2.2) + 0.01, stampText: 'OFFICIEL', rot: -0.06, title: 'ORDRE DE MISSION', sub: 'DES POSTES' });
    ho_contrat(14, 180, 120, 160, t, { sign1: 1, sign2: prog(u, 0.5, 2), seal: 1, stamp: 0.6, write: 1 });
    ho_enveloppe(190, 215, 1, t, { open: 0, seal: 1 });
    ho_enveloppe(190, 260, 1, t, { open: 1, letter: 1 });
    ho_enveloppe(190, 310, 1, t, { face: 'face' });
    ho_enveloppe(150, 400, 1.3, t, { open: 0.5 });
    ho_enveloppe(0, 0, 1, t, { fly: { p: prog(u, 0, 3), from: [20, 420], to: [250, 380], arc: 60 } });
  },
};

HO_LAB.affiche = {
  draw(u, t) {
    vgrad(0, 0, LW, LH, [[0, WO[1]], [1, WO[0]]]);
    ho_affiche(10, 10, 150, 215, t, { ball: 0.9 + 0 * u, ruin: 0 });
    ho_affiche(168, 10, 96, 140, t, { ball: 0.9, ruin: prog(u, 0, 3) });
    ho_affiche(10, 240, 100, 120, t, { kind: 'dossier', stamp: 0.5, out: prog(u, 0, 2) });
    ho_affiche(130, 200, 135, 150, t, { ball: 0.5, ruin: 1 });
  },
};

HO_LAB.argent = {
  draw(u, t) {
    vgrad(0, 0, LW, LH, [[0, NI[2]], [1, NI[0]]]);
    ho_mallette(70, 130, 1, t, { open: 0 });
    ho_mallette(200, 130, 1, t, { open: prog(u, 0, 1.5), glow: prog(u, 0.5, 1.5) });
    ho_mallette(70, 250, 1.2, t, { open: 0.3 });
    ho_mallette(200, 250, 0.9, t, { open: 1, glow: 0.5 });
    ho_billets(60, 360, 1, t, { kind: 'liasse', n: 4 });
    ho_billets(150, 360, 1, t, { kind: 'tas', n: 6 });
    ho_billets(230, 360, 1, t, { kind: 'monnaie', n: 14 });
    ho_billets(135, 330, 1, t, { kind: 'vol', n: 16, vy: -70 });
    ho_billets(40, 300, 1, t, { kind: 'pieces', n: 10, vy: -60, area: [20, 330, 80, 330] });
  },
};

HO_LAB.machine = {
  draw(u, t) {
    vgrad(0, 0, LW, LH, [[0, WO[1]], [1, WO[0]]]);
    ho_machine(70, 200, 0.9, u, { rate: 9, paper: prog(u, 0, 0.8), t0: 0.8 });
    ho_machine(180, 330, 1.3, u + 3, { rate: 14, paper: 1, t0: 0 });
    ho_telephone(40, 380, 1, t, { ring: 1 });
    ho_telephone(100, 380, 1, t, { ring: 0 });
    ho_telephone(160, 380, 1, t, { lift: 1 });
  },
};

HO_LAB.briques = {
  draw(u, t) {
    vgrad(0, 0, LW, LH, [[0, AM[4]], [1, AM[2]]]);
    ho_windowSprite; hc().drawImage(ho_windowSprite(46, 130), 10, 30);
    ho_curtain(2, 30, 18, 140, t, { seed: 1 }); ho_curtain(66, 30, 18, 140, t, { flip: true, seed: 2 });
    hc().drawImage(ho_columnSprite(34, 300, 1), 90, 20);
    hc().drawImage(ho_columnSprite(34, 300, -1), 220, 20);
    ho_lustre(150, 0, 1, t);
    ho_lustre(60, 250, 0.6, t);
  },
};

HO_LAB.salon = {
  draw(u, t) {
    ho_salon(t, { cam: 0 });
    ho_table(135, 322, 1, t);
  },
};
HO_LAB.salonClose = {
  draw(u, t) {
    ho_salon(t, { view: 'close' });
    ho_table(135, 330, 2, t);
  },
};

HO_LAB.p1 = { draw(u, t) { ho_salon(t, { layer: 'back', lustre: false }); } };
HO_LAB.p2 = { draw(u, t) { ho_lustre(135, -2, 1.05, t, { glow: 1, chain: 28 }); } };
HO_LAB.p3 = { draw(u, t) { ho_salon(t, { layer: 'front', columns: false, dust: 0, vignette: 0 }); } };
HO_LAB.p4 = { draw(u, t) { ho_table(135, 322, 1, t); } };
HO_LAB.p5 = { draw(u, t) { ho_salon(t, { layer: 'front', columns: false, rays: false, vignette: 0 }); } };
HO_LAB.p0 = { draw(u, t) { } };

HO_LAB.objets = {
  draw(u, t) {
    vgrad(0, 0, LW, LH, [[0, WO[0]], [1, NI[0]]]);
    R(0, 120, LW, 200, WO[2]);
    ho_lampe(50, 150, 1, t); ho_lampe(50, 250, 1.6, t, { glow: 0 });
    ho_bougie(130, 150, 1, t); ho_bougie(180, 150, 1.8, t, { melt: 1, glow: 0 });
    ho_encrier(230, 150, 1, t, { dip: prog(u, 0, 1) });
    ho_tamponBois(40, 330, 1); ho_tamponBois(80, 330, 1, { kind: 'rect' }); ho_tamponBois(140, 330, 2);
    ho_pile(200, 300, 1, t); ho_pile(200, 400, 1.4, t, { lift: 0.6 });
  },
};

HO_LAB.bureau = {
  draw(u, t) {
    ho_bureau(t, { machine: { rate: 9, t0: 0.5, paper: prog(u, 0, 0.6) } });
  },
};
HO_LAB.cachet = {
  draw(u, t) {
    R(0, 0, LW, LH, WO[1]); ho_document(40, 100, 190, 250, t, { write: 1, sign: 1 });
    ho_cachet(110, 300, 1.4, u, 0.5, { ribbon: true });
  },
};

HO_LAB.chambre1 = {
  draw(u, t) {
    vgrad(0, 0, LW, LH, [[0, NI[3]], [1, NI[1]]]);
    ho_miroir(70, 340, 88, 176, t, { reflect: (inf) => { ho_chapeau(inf.cx, inf.bottom - 40, 1.4, { kind: 'haut' }); ho_canne(inf.cx + 20, inf.bottom - 5, 1); } });
    ho_portemanteau(200, 400, 1, t, { coat: true, hat: 'melon', cane: true, scarf: true });
    ho_lampeChevet(120, 440, 1, t); ho_gueridon(120, 470, 44, 28);
    ho_valise(60, 470, 1, t, { open: prog(u, 0, 1) });
    ho_chapeau(250, 200, 1, { kind: 'canotier' });
    ho_chapeau(250, 240, 1, { kind: 'melon' });
  },
};

HO_LAB.chambre = {
  draw(u, t) {
    ho_chambre(t, { reflect: (inf) => { R(inf.cx - 15, inf.bottom - 120, 30, 120, ST[2]); disc(inf.cx, inf.bottom - 130, 9, SK[3]); } });
  },
};

HO_LAB.facade0 = { draw(u, t) { ho_facade(t, { light: 0 }); } };
HO_LAB.facade1 = { draw(u, t) { ho_facade(t, { light: 1 }); } };
