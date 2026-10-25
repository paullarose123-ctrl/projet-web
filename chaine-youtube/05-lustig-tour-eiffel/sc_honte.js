'use strict';
// sc_honte.js : segment « honte » (d1, d2, d3). PLAN PROVISOIRE : fond uni et nom, pour que le film se rende déjà de bout en bout.
// À REMPLACER par les vrais plans (voir BRIEF.md) : un plan = shot('id', S.t0, { draw, ui, ev }), calé sur wt() / P.<id>.
function buildHonte(S) {
  shot('honte_provisoire', S.t0, {
    draw(u, t) { vgrad(0, 0, LW, LH, [[0, NI[2]], [1, NI[0]]]); },
    ui(u, t) { ptextC("LA HONTE", 135, 200, WH[3], 3, '#05040f'); },
    ev: [],
  });
}
