'use strict';
// banc d'essai (à supprimer) : window.lu_snap(job) dessine une planche puis renvoie un PNG
window.LAB = {};
function lab_bg(kind) {
  L.setTransform(1, 0, 0, 1, 0, 0);
  if (kind === 'night') { vgrad(0, 0, LW, LH, [[0, NI[1]], [1, NI[0]]]); return; }
  if (kind === 'gray') { R(0, 0, LW, LH, ST[5]); return; }
  vgrad(0, 0, LW, 330, [[0, BL[3]], [0.5, CY[3]], [0.8, NE[3]], [1, AM[8]]]);
  R(0, 330, LW, LH - 330, WO[2]); vgrad(0, 330, LW, 150, [[0, WO[3]], [1, WO[1]]]);
}
function lab_grid() { for (let x = 0; x < LW; x += 50) R(x, 0, 1, LH, 'rgba(255,255,255,0.15)'); for (let y = 0; y < LH; y += 50) R(0, y, LW, 1, 'rgba(255,255,255,0.15)'); }
// une ou plusieurs figures : args.list = [{fn, x, y, s, o}]
LAB.fig = (t, a) => {
  const ms = [];
  for (const f of a.list) { const t0 = performance.now(); if (f.o && f.o.holdPaper) f.o.hold = lab_paper(f.o.holdPaper); window[f.fn || 'lu_lustig'](f.x, f.y, f.s, f.t ?? t, f.o); ms.push(performance.now() - t0); }
  window.LAB_MS = ms;
};
window.lu_snap = function (j) {
  try {
    for (const c of [L, Y]) { c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over'; c.filter = 'none'; }
    if (!window.LU_INIT) { INITS.forEach(f => f()); window.LU_INIT = true; }
    lab_bg(j.bg || 'sun');
    LAB[j.sheet](j.t || 0, j.args || {});
    quantize();
    L.setTransform(1, 0, 0, 1, 0, 0);
    if (LAB[j.sheet + '_ui']) LAB[j.sheet + '_ui'](j.t || 0, j.args || {});
    if (j.grid) lab_grid();
    const [x, y, w, h] = j.crop || [0, 0, 270, 480], z = j.zoom || 4;
    const c = document.createElement('canvas'); c.width = Math.round(w * z); c.height = Math.round(h * z);
    const g = c.getContext('2d'); g.imageSmoothingEnabled = z < 1; g.imageSmoothingQuality = 'high';
    g.drawImage(low, x, y, w, h, 0, 0, c.width, c.height);
    return { url: c.toDataURL('image/png'), ms: (window.LAB_MS || []).reduce((a, b) => a + b, 0) };
  } catch (e) { return { err: e.stack }; }
};
try { INITS.forEach(f => f()); window.LU_INIT = true; window.LU_READY = true; } catch (e) { window.LU_ERR = e.stack; }
// bande d'images d'une pose : args = {fn, pose, n, dt, t0, s, x, y, o}
LAB.strip = (t, a) => {
  const n = a.n || 6, w = LW / n; const ms = [];
  for (let i = 0; i < n; i++) { const tt = (a.t0 || 0) + i * (a.dt || 0.2); const t0 = performance.now(); window[a.fn || 'lu_lustig'](a.x0 + i * (a.dx || 0), a.y, a.s, tt, Object.assign({}, a.o, a.each ? a.each(i, tt) : {})); ms.push(performance.now() - t0); }
  window.LAB_MS = ms;
};
window.lab_paper = (dir = 1) => (x, y, info) => { const s = info.scale; R(x - (dir > 0 ? 6 : 52) * s, y - 40 * s, 58 * s, 76 * s, WH[1]); R(x - (dir > 0 ? 6 : 52) * s, y - 40 * s, 58 * s, 3 * s, ST[3]); for (let i = 0; i < 9; i++) R(x - (dir > 0 ? 2 : 48) * s, y - 30 * s + i * 7 * s, 50 * s, 1.4 * s, ST[2]); };
LAB.icon = (t, a) => { R(0, 0, LW, LH, '#05040f'); };
LAB.icon_ui = (t, a) => { ICONES[3](40, 40); const bx = 100; R(bx - 1, 7, 24, 24, '#05040f'); R(bx, 8, 22, 22, BETES[3].fond); R(bx + 1, 9, 20, 20, BETES[3].fond); ICONES[3](bx + 11, 19); hudTracker(3, 3, 1, 8, 50); };
LAB.bench = (t, a) => {
  const res = {};
  const run = (name, fn, n = 20) => { const t0 = performance.now(); for (let i = 0; i < n; i++) fn(i); res[name] = ((performance.now() - t0) / n).toFixed(1); };
  run('lustig s1', i => lu_lustig(135, 400, 1, i * 0.1, { pose: 'stand' }));
  run('lustig s2 stand', i => lu_lustig(135, 460, 2, i * 0.1, { pose: 'stand' }));
  run('lustig s2 walk', i => lu_lustig(135, 460, 2, i * 0.1, { pose: 'walk' }));
  run('lustig s3 crop', i => lu_lustig(135, 500, 3, i * 0.1, { pose: 'think', crop: 'waist' }));
  run('lustig run+hat', i => lu_lustig(135, 460, 2, i * 0.1, { pose: 'run', hat: 0.5 }));
  run('marchand s2', i => lu_marchand(135, 460, 2, i * 0.1, { pose: 'eager' }));
  run('groupe s1.1', i => lu_groupe(135, 300, 1.1, i * 0.1, { lean: 0.5, murmur: 1 }), 10);
  console.log('LU: ' + JSON.stringify(res));
};
