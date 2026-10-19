'use strict';
function buildKitDemo(S) {
  shot('kd_a', S.t0 + 0, { draw(u, t) { k_sky('alaskaDusk', t, { h: 250 }); } });
  shot('kd_b', S.t0 + 1.7, { draw(u, t) { k_sky('alaskaNight', t, { h: 250 }); k_aurora(t, { y: 150 }); } });
  shot('kd_c', S.t0 + 3.4, { draw(u, t) { k_sky('desertDusk', t, { h: 250 }); const s = k_sunPos('desertDusk'); k_sun(s[0], s[1], s[2], { t }); k_moon(60, 60, 12, { phase: 0.3 }) } });
  shot('kd_d', S.t0 + 5.1, { draw(u, t) { k_sky('savannaDawn', t, { h: 260 }); const s = k_sunPos('savannaDawn'); k_sun(s[0], s[1], s[2], { t }); } });
  shot('kd_e', S.t0 + 6.8, { draw(u, t) { k_sky('alaskaSpring', t, { h: 260 }); k_moon(200, 80, 14, { phase: 0.7 }); } });
}
