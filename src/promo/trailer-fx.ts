// Effets dessinés de la bande-annonce (promo/pub-trailer.html) : rubans d'énergie qui s'enroulent autour d'un animal
// (moitié derrière, moitié devant), rayons, lignes de vitesse, particules, ondes de choc, éclairs.
// Tout est calculé à partir du temps t : la même image sort à chaque capture.

export const W = 1080;
export const H = 1920;

export const clamp = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v));
export const seg = (t: number, a: number, b: number) => clamp((t - a) / (b - a));
export const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
export const outCubic = (k: number) => 1 - Math.pow(1 - k, 3);
export const inCubic = (k: number) => k * k * k;
export const inOut = (k: number) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
export const outBack = (k: number, s = 1.9) => 1 + (s + 1) * Math.pow(k - 1, 3) + s * Math.pow(k - 1, 2);
export const outExpo = (k: number) => (k >= 1 ? 1 : 1 - Math.pow(2, -10 * k));

/** Hasard reproductible. */
export function rng(seed: number) {
  let a = seed >>> 0 || 1;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Bruit doux entre -1 et 1. */
export const wobble = (x: number, seed = 0) => Math.sin(x * 1.7 + seed) * 0.5 + Math.sin(x * 3.1 + seed * 2.3) * 0.3 + Math.sin(x * 5.3 + seed * 0.7) * 0.2;

// ───────────── fonds ─────────────

export function radial(c: CanvasRenderingContext2D, x: number, y: number, r: number, stops: [number, string][]) {
  const g = c.createRadialGradient(x, y, 0, x, y, r);
  for (const [k, col] of stops) g.addColorStop(k, col);
  c.fillStyle = g;
  c.fillRect(0, 0, W, H);
}

export function linear(c: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, stops: [number, string][], alpha = 1) {
  const g = c.createLinearGradient(x0, y0, x1, y1);
  for (const [k, col] of stops) g.addColorStop(k, col);
  c.save();
  c.globalAlpha = alpha;
  c.fillStyle = g;
  c.fillRect(0, 0, W, H);
  c.restore();
}

/** Tourbillon de couleurs (dégradé conique qui tourne). */
export function vortex(c: CanvasRenderingContext2D, x: number, y: number, rot: number, colors: string[], alpha = 1) {
  const g = c.createConicGradient(rot, x, y);
  colors.forEach((col, i) => g.addColorStop(i / colors.length, col));
  g.addColorStop(1, colors[0]);
  c.save();
  c.globalAlpha = alpha;
  c.fillStyle = g;
  c.fillRect(0, 0, W, H);
  c.restore();
}

/** Rayons de lumière qui partent d'un point. */
export function rays(c: CanvasRenderingContext2D, x: number, y: number, n: number, rot: number, color: string, alpha: number, width = 0.5, len = 2600) {
  if (alpha <= 0) return;
  c.save();
  c.globalCompositeOperation = 'lighter';
  const g = c.createRadialGradient(x, y, 0, x, y, len);
  g.addColorStop(0, color);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  c.fillStyle = g;
  c.globalAlpha = alpha;
  const step = (Math.PI * 2) / n;
  for (let i = 0; i < n; i++) {
    const a = rot + i * step;
    c.beginPath();
    c.moveTo(x, y);
    c.arc(x, y, len, a - (step * width) / 2, a + (step * width) / 2);
    c.closePath();
    c.fill();
  }
  c.restore();
}

/** Lignes de vitesse (manga) qui convergent vers un point. */
export function speedLines(c: CanvasRenderingContext2D, x: number, y: number, seed: number, n: number, r0: number, alpha: number, color = '#ffffff') {
  if (alpha <= 0) return;
  const r = rng(seed);
  c.save();
  c.globalAlpha = alpha;
  c.fillStyle = color;
  for (let i = 0; i < n; i++) {
    const a = r() * Math.PI * 2;
    const inner = r0 * (0.7 + r() * 0.8);
    const outer = inner + 500 + r() * 1400;
    const w = 2 + r() * 9;
    const dx = Math.cos(a);
    const dy = Math.sin(a);
    c.beginPath();
    c.moveTo(x + dx * inner, y + dy * inner);
    c.lineTo(x + dx * outer - dy * w, y + dy * outer + dx * w);
    c.lineTo(x + dx * outer + dy * w, y + dy * outer - dx * w);
    c.closePath();
    c.fill();
  }
  c.restore();
}

/** Onde de choc : anneau qui s'élargit et s'efface. */
export function ring(c: CanvasRenderingContext2D, x: number, y: number, t: number, t0: number, dur: number, rMax: number, color = '#ffffff', width = 40) {
  const k = (t - t0) / dur;
  if (k < 0 || k > 1) return;
  const e = outCubic(k);
  c.save();
  c.globalAlpha = (1 - k) * 0.9;
  c.strokeStyle = color;
  c.lineWidth = width * (1 - e) + 2;
  c.shadowColor = color;
  c.shadowBlur = 30;
  c.beginPath();
  c.ellipse(x, y, rMax * e, rMax * e * 0.92, 0, 0, Math.PI * 2);
  c.stroke();
  c.restore();
}

export function glow(c: CanvasRenderingContext2D, x: number, y: number, r: number, color: string, alpha: number) {
  if (alpha <= 0) return;
  c.save();
  c.globalCompositeOperation = 'lighter';
  c.globalAlpha = Math.min(1, alpha);
  const g = c.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, color);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  c.fillStyle = g;
  c.fillRect(x - r, y - r, r * 2, r * 2);
  c.restore();
}

export function flash(c: CanvasRenderingContext2D, alpha: number, color = '#ffffff') {
  if (alpha <= 0) return;
  c.save();
  c.globalAlpha = Math.min(1, alpha);
  c.fillStyle = color;
  c.fillRect(0, 0, W, H);
  c.restore();
}

export function vignette(c: CanvasRenderingContext2D, alpha = 0.55) {
  const g = c.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.75);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, `rgba(0,0,0,${alpha})`);
  c.fillStyle = g;
  c.fillRect(0, 0, W, H);
}

// ───────────── rubans d'énergie ─────────────

type Pt = [number, number, number];

/**
 * Hélice inclinée autour d'un centre : x et y à l'écran, z > 0 quand le ruban passe devant le sujet.
 * `turns` tours, `rise` px de montée sur toute la longueur, `tilt` en radians.
 */
export function helix(cx: number, cy: number, rx: number, ry: number, opts: { turns?: number; rise?: number; tilt?: number; phase?: number; grow?: number } = {}) {
  const { turns = 1.2, rise = 0, tilt = 0, phase = 0, grow = 0 } = opts;
  const ct = Math.cos(tilt);
  const st = Math.sin(tilt);
  return (u: number): Pt => {
    const th = phase + u * turns * Math.PI * 2;
    const k = 1 + grow * (u - 0.5);
    const x = rx * k * Math.cos(th);
    const y = ry * k * Math.sin(th) - (u - 0.5) * rise;
    return [cx + x * ct - y * st, cy + x * st + y * ct, Math.sin(th)];
  };
}

/** Une courbe de Bézier cubique, toujours devant ou derrière. */
export function bezier(p0: [number, number], p1: [number, number], p2: [number, number], p3: [number, number], z = 1) {
  return (u: number): Pt => {
    const v = 1 - u;
    const a = v * v * v;
    const b = 3 * v * v * u;
    const d = 3 * v * u * u;
    const e = u * u * u;
    return [a * p0[0] + b * p1[0] + d * p2[0] + e * p3[0], a * p0[1] + b * p1[1] + d * p2[1] + e * p3[1], z];
  };
}

export interface RibbonStyle {
  /** couleurs de la queue à la tête */
  colors: [string, string];
  width: number;
  /** longueur visible (fraction du chemin) */
  len?: number;
  core?: string;
}

/**
 * Ruban : la tête avance sur le chemin (0 → 1 + len) ; il s'effile aux deux bouts.
 * Les morceaux qui passent derrière le sujet vont sur `back`, les autres sur `front`.
 */
export function ribbon(back: CanvasRenderingContext2D, front: CanvasRenderingContext2D, path: (u: number) => Pt, head: number, style: RibbonStyle) {
  const len = style.len ?? 0.55;
  const tail = head - len;
  const a = Math.max(0, tail);
  const b = Math.min(1, head);
  if (b <= a + 0.002) return;
  const N = 140;
  const pts: Pt[] = [];
  const ws: number[] = [];
  for (let i = 0; i <= N; i++) {
    const u = a + ((b - a) * i) / N;
    pts.push(path(u));
    const v = (u - tail) / len;
    // plus épais vers la tête, effilé à la queue
    ws.push(style.width * Math.pow(Math.sin(Math.PI * clamp(v)), 0.6) * (0.55 + 0.45 * v));
  }
  const left: [number, number][] = [];
  const right: [number, number][] = [];
  for (let i = 0; i <= N; i++) {
    const p = pts[Math.max(0, i - 1)];
    const q = pts[Math.min(N, i + 1)];
    let dx = q[0] - p[0];
    let dy = q[1] - p[1];
    const l = Math.hypot(dx, dy) || 1;
    dx /= l;
    dy /= l;
    const w = ws[i] / 2;
    left.push([pts[i][0] - dy * w, pts[i][1] + dx * w]);
    right.push([pts[i][0] + dy * w * 0.35, pts[i][1] - dx * w * 0.35]);
  }
  const p0 = path(Math.max(0, tail));
  const p1 = path(Math.min(1, head));
  // morceaux continus devant / derrière
  let start = 0;
  for (let i = 1; i <= N + 1; i++) {
    const side = pts[start][2] >= 0;
    if (i <= N && pts[i][2] >= 0 === side) continue;
    const end = Math.min(N, i);
    const c = side ? front : back;
    const g = c.createLinearGradient(p0[0], p0[1], p1[0], p1[1]);
    g.addColorStop(0, style.colors[0]);
    g.addColorStop(1, style.colors[1]);
    c.save();
    c.globalAlpha = side ? 1 : 0.92;
    c.shadowColor = style.colors[1];
    c.shadowBlur = 28;
    c.fillStyle = g;
    c.beginPath();
    c.moveTo(left[start][0], left[start][1]);
    for (let j = start + 1; j <= end; j++) c.lineTo(left[j][0], left[j][1]);
    for (let j = end; j >= start; j--) c.lineTo(right[j][0], right[j][1]);
    c.closePath();
    c.fill();
    // filet clair au bord : le ruban brille
    c.shadowBlur = 0;
    c.strokeStyle = style.core ?? 'rgba(255,255,255,0.85)';
    c.lineWidth = Math.max(2, style.width * 0.09);
    c.lineCap = 'round';
    c.beginPath();
    c.moveTo(pts[start][0], pts[start][1]);
    for (let j = start + 1; j <= end; j++) c.lineTo(pts[j][0], pts[j][1]);
    c.stroke();
    c.restore();
    start = end;
  }
}

// ───────────── particules ─────────────

export type Kind = 'spark' | 'dot' | 'confetti' | 'bubble' | 'snow' | 'leaf' | 'petal' | 'ember' | 'streak';

function sparkShape(c: CanvasRenderingContext2D, x: number, y: number, s: number, rot: number) {
  c.save();
  c.translate(x, y);
  c.rotate(rot);
  c.beginPath();
  c.moveTo(0, -s);
  c.quadraticCurveTo(0, 0, s * 0.28, 0);
  c.quadraticCurveTo(0, 0, 0, s);
  c.quadraticCurveTo(0, 0, -s * 0.28, 0);
  c.quadraticCurveTo(0, 0, 0, -s);
  c.moveTo(-s * 0.7, 0);
  c.quadraticCurveTo(0, 0, 0, s * 0.2);
  c.quadraticCurveTo(0, 0, s * 0.7, 0);
  c.quadraticCurveTo(0, 0, 0, -s * 0.2);
  c.quadraticCurveTo(0, 0, -s * 0.7, 0);
  c.fill();
  c.restore();
}

function drawParticle(c: CanvasRenderingContext2D, kind: Kind, x: number, y: number, s: number, rot: number, color: string, alpha: number, vx = 0, vy = 0) {
  if (alpha <= 0.01) return;
  c.globalAlpha = Math.min(1, alpha);
  c.fillStyle = color;
  c.strokeStyle = color;
  switch (kind) {
    case 'spark':
      c.shadowColor = color;
      c.shadowBlur = 14;
      sparkShape(c, x, y, s, rot);
      c.shadowBlur = 0;
      break;
    case 'dot':
    case 'ember':
      c.shadowColor = color;
      c.shadowBlur = kind === 'ember' ? 12 : 0;
      c.beginPath();
      c.arc(x, y, s, 0, Math.PI * 2);
      c.fill();
      c.shadowBlur = 0;
      break;
    case 'snow':
      c.beginPath();
      c.arc(x, y, s, 0, Math.PI * 2);
      c.fill();
      break;
    case 'bubble':
      c.lineWidth = Math.max(1.5, s * 0.14);
      c.beginPath();
      c.arc(x, y, s, 0, Math.PI * 2);
      c.stroke();
      c.globalAlpha *= 0.8;
      c.beginPath();
      c.arc(x - s * 0.35, y - s * 0.35, s * 0.22, 0, Math.PI * 2);
      c.fill();
      break;
    case 'confetti':
      c.save();
      c.translate(x, y);
      c.rotate(rot);
      c.scale(1, Math.abs(Math.cos(rot * 1.7)) * 0.8 + 0.2);
      c.fillRect(-s, -s * 0.5, s * 2, s);
      c.restore();
      break;
    case 'leaf':
    case 'petal':
      c.save();
      c.translate(x, y);
      c.rotate(rot);
      c.beginPath();
      c.ellipse(0, 0, s, s * (kind === 'leaf' ? 0.42 : 0.62), 0, 0, Math.PI * 2);
      c.fill();
      c.restore();
      break;
    case 'streak': {
      const l = Math.hypot(vx, vy) || 1;
      c.lineWidth = s;
      c.lineCap = 'round';
      c.beginPath();
      c.moveTo(x, y);
      c.lineTo(x - (vx / l) * s * 9, y - (vy / l) * s * 9);
      c.stroke();
      break;
    }
  }
}

/** Gerbe de particules projetées depuis un point à l'instant t0. */
export function burst(
  c: CanvasRenderingContext2D,
  t: number,
  t0: number,
  o: { seed: number; n: number; x: number; y: number; speed: number; gravity?: number; life?: number; size?: number; kind: Kind; colors: string[]; spread?: number; dir?: number; drag?: number },
) {
  const dt = t - t0;
  const life = o.life ?? 1.2;
  if (dt < 0 || dt > life) return;
  const r = rng(o.seed);
  c.save();
  for (let i = 0; i < o.n; i++) {
    const a = (o.dir ?? 0) + (r() - 0.5) * (o.spread ?? Math.PI * 2);
    const v = o.speed * (0.35 + r() * 0.65);
    const drag = o.drag ?? 1.6;
    const travel = (v * (1 - Math.exp(-drag * dt))) / drag;
    const x = o.x + Math.cos(a) * travel;
    const y = o.y + Math.sin(a) * travel + 0.5 * (o.gravity ?? 0) * dt * dt;
    const size = (o.size ?? 10) * (0.5 + r() * 0.8);
    const k = dt / (life * (0.6 + r() * 0.4));
    const col = o.colors[Math.floor(r() * o.colors.length)];
    const rot = r() * 6 + dt * (r() - 0.5) * 14;
    drawParticle(c, o.kind, x, y, size * (o.kind === 'spark' ? 1 - k * 0.6 : 1), rot, col, 1 - k, Math.cos(a) * v, Math.sin(a) * v);
  }
  c.restore();
}

/** Flot continu de particules dans une zone (bulles qui montent, neige qui tombe, braises…). */
export function stream(
  c: CanvasRenderingContext2D,
  t: number,
  o: { seed: number; n: number; kind: Kind; colors: string[]; vx: number; vy: number; size?: number; alpha?: number; box?: [number, number, number, number]; sway?: number },
) {
  const [bx, by, bw, bh] = o.box ?? [-100, -100, W + 200, H + 200];
  const r = rng(o.seed);
  c.save();
  for (let i = 0; i < o.n; i++) {
    const x0 = r() * bw;
    const y0 = r() * bh;
    const sp = 0.6 + r() * 0.8;
    const size = (o.size ?? 8) * (0.4 + r() * 0.9);
    const ph = r() * 10;
    const col = o.colors[Math.floor(r() * o.colors.length)];
    let x = (x0 + o.vx * sp * t + Math.sin(t * 2 + ph) * (o.sway ?? 0)) % bw;
    let y = (y0 + o.vy * sp * t) % bh;
    if (x < 0) x += bw;
    if (y < 0) y += bh;
    const tw = o.kind === 'spark' ? 0.5 + 0.5 * Math.sin(t * 7 + ph) : 1;
    drawParticle(c, o.kind, bx + x, by + y, size * (o.kind === 'spark' ? 0.6 + tw * 0.6 : 1), ph + t * (r() - 0.5) * 4, col, (o.alpha ?? 1) * tw);
  }
  c.restore();
}

/** Éclair entre deux points (redessiné toutes les deux images). */
export function lightning(c: CanvasRenderingContext2D, a: [number, number], b: [number, number], seed: number, color: string, width = 6, jag = 60) {
  const r = rng(seed);
  const pts: [number, number][] = [a];
  const n = 18;
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const l = Math.hypot(dx, dy);
  const nx = -dy / l;
  const ny = dx / l;
  for (let i = 1; i < n; i++) {
    const k = i / n;
    const off = (r() - 0.5) * jag * Math.sin(Math.PI * k) * 2;
    pts.push([a[0] + dx * k + nx * off, a[1] + dy * k + ny * off]);
  }
  pts.push(b);
  c.save();
  c.lineJoin = 'round';
  c.lineCap = 'round';
  c.shadowColor = color;
  c.shadowBlur = 30;
  for (const [lw, col] of [
    [width * 3, color],
    [width, '#ffffff'],
  ] as [number, string][]) {
    c.strokeStyle = col;
    c.lineWidth = lw;
    c.beginPath();
    c.moveTo(pts[0][0], pts[0][1]);
    for (const p of pts) c.lineTo(p[0], p[1]);
    c.stroke();
  }
  c.restore();
}
