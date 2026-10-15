'use strict';
// ───────────────────────── les plans, dans l'ordre du film ─────────────────────────
// pendule : le fil est accroché au-dessus du cadre ; th = angle par rapport à la verticale
function swing(t, o = {}) {
  const A = o.A ?? 0.27, w = TAU / (o.period ?? 3.6), ph = o.ph ?? 0.775, ax = o.ax ?? 150, ay = o.ay ?? -150, len = o.len ?? 350;
  const th = A * Math.cos(w * t + ph), om = -A * w * Math.sin(w * t + ph);
  return { th, om, ax, ay, hx: ax + len * Math.sin(th), hy: ay + len * Math.cos(th), len };
}
function drawSwingHero(t, sw, o = {}) {
  silk(sw.ax, sw.ay, sw.hx, sw.hy, t);
  const k = Math.sin(t * 5.2) * 0.5 + 0.5;
  return heroDraw(sw.hx, sw.hy, -sw.th * 0.92, o.s ?? 1.7, { legs: 0.2 + 0.5 * Math.abs(sw.om) * 0.6 + 0.2 * k, armL: 0.3 + 0.3 * k, lean: sw.om * 1.1, ...o });
}

function buildShots() { buildShots1(); buildShots2(); if (typeof buildShots3 === 'function') buildShots3(); if (typeof buildShots4 === 'function') buildShots4(); if (typeof buildOutro === 'function') buildOutro(); }
