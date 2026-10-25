'use strict';
// sc_intro.js : segment « intro » (i1, i2). PLAN PROVISOIRE : fond uni et nom, pour que le film se rende déjà de bout en bout.
// À REMPLACER par les vrais plans (voir BRIEF.md) : un plan = shot('id', S.t0, { draw, ui, ev }), calé sur wt() / P.<id>.
function buildIntro(S) {
  shot('intro_provisoire', S.t0, {
    draw(u, t) { vgrad(0, 0, LW, LH, [[0, NI[2]], [1, NI[0]]]); },
    ui(u, t) { ptextC("ACCROCHE", 135, 200, WH[3], 3, '#05040f'); },
    ev: [],
  });
}
