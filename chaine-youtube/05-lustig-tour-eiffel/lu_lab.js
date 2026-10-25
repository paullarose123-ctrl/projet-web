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
  const ms = []; window.LAB_LAST = [];
  for (const f of a.list) { const t0 = performance.now(); if (f.o && f.o.holdPaper) f.o.hold = lab_paper(f.o.holdPaper); if (f.o && f.o.holdCase) f.o.hold = lab_case; const r = f.sp ? lu_figure(f.x, f.y, f.s, f.t ?? t, f.o, lu_WHO[f.sp]) : window[f.fn || 'lu_lustig'](f.x, f.y, f.s, f.t ?? t, f.o); window.LAB_LAST.push(r); ms.push(performance.now() - t0); }
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
    let [x, y, w, h] = j.crop || [0, 0, 270, 480]; const z = j.zoom || 4;
    if (j.focus && window.LAB_LAST && window.LAB_LAST[j.focusIdx || 0]) { const a = window.LAB_LAST[j.focusIdx || 0][j.focus]; x = Math.round(a[0] - w / 2); y = Math.round(a[1] - h / 2 + (j.dy || 0)); }
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

window.lab_case = (x, y, info) => { const s = info.scale; R(x - 15 * s, y + 4 * s, 30 * s, 22 * s, WO[3]); R(x - 15 * s, y + 4 * s, 30 * s, 3 * s, WO[5]); R(x - 15 * s, y + 24 * s, 30 * s, 2 * s, WO[1]); R(x - 3 * s, y + 10 * s, 6 * s, 4 * s, YE[2]); R(x - 5 * s, y - 1 * s, 10 * s, 1.6 * s, NI[0]); R(x - 5 * s, y - 1 * s, 1.6 * s, 6 * s, NI[0]); R(x + 3.4 * s, y - 1 * s, 1.6 * s, 6 * s, NI[0]); };
LAB.audit = (t, a) => {
  const bad = [], names = Object.keys(lu_POSES), who = Object.keys(lu_WHO);
  const finite = v => v === null || v === undefined || (Array.isArray(v) ? v.every(finite) : (typeof v === 'number' ? Number.isFinite(v) : true));
  let n = 0, maxMs = 0;
  for (const w of who) for (const pose of names) for (const tt of [0, 0.7, 2.3]) for (const extra of [{}, { flip: true, crop: 'waist' }, { sit: 1 }, { hat: 0.4 }, { hat: false, u: 0.5 }]) {
    const fn = w === 'lustig' ? lu_lustig : w === 'marchand' ? lu_marchand : (cx, cy, s, t, o) => lu_figure(cx, cy, s, t, o, lu_WHO[w]);
    try {
      const t0 = performance.now(); const r = fn(135, 400, 1.5, tt, Object.assign({ pose, u: tt }, extra)); const ms = performance.now() - t0; maxMs = Math.max(maxMs, ms);
      for (const k of ['head', 'eye', 'mouth', 'handL', 'handR', 'feet']) if (!finite(r[k])) bad.push(w + ' ' + pose + ' ' + JSON.stringify(extra) + ' ' + k + ' NaN');
      n++;
    } catch (e) { bad.push(w + ' ' + pose + ' ' + JSON.stringify(extra) + ' EXC ' + e.message); }
  }
  console.log('LU: audit ' + n + ' appels, max ' + maxMs.toFixed(1) + ' ms, problèmes : ' + bad.length);
  for (const b of bad.slice(0, 30)) console.log('LU: ' + b);
};
LAB.shake = (t, a) => {
  const draw = (dx) => { lab_bg('sun'); const A = lu_lustig(80, 440, 1.7, t, { pose: 'handshake', u: 1.2, yaw: 1.25, pump: a.pump ?? 1, light: 1 }); const B = lu_marchand(190 + dx, 440, 1.7, t, { pose: 'handshake', u: 1.2, yaw: 1.25, flip: true, pump: a.pump ?? 1, light: 1 }); return [A, B]; };
  const [A0, B0] = draw(0); const dx = A0.handR[0] - B0.handR[0] + (a.gap ?? 0);
  const [A, B] = draw(dx); window.LAB_MS = [0]; console.log('LU: shake dx=' + dx.toFixed(1) + ' Lhand=' + A.handR.map(v => v.toFixed(1)) + ' Phand=' + B.handR.map(v => v.toFixed(1)));
};
