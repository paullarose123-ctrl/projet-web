import { mix } from './kit';
import { blit, type Sprite } from './reserve-sprites';
import type { EnclosId } from '../engine/reserve';

// Le chemin d'une expédition, en pixel art, dans la palette de la réserve. Le paysage est celui du milieu de l'animal
// (l'océan pour un requin, la jungle pour un gorille, la savane pour un lion…) et défile pendant qu'il avance vers la
// droite ; sa position montre où il en est, jusqu'au repère de l'arrivée. De retour, il saute de joie à côté d'un
// coffre qui brille. Toile de TRAIL_W × TRAIL_H pixels, agrandie sans lissage.

export const TRAIL_W = 120;
export const TRAIL_H = 34;
const GROUND_Y = 27;

type Ctx = CanvasRenderingContext2D;

// ——— sprites du paysage ———
const PINE: Sprite = { rows: ['..n..', '.nNn.', '.nNn.', 'nNNNn', 'nNNNn', '..t..'], pal: { n: '#1b3a23', N: '#2f5c34', t: '#3a2414' } };
const ROUND_TREE: Sprite = { rows: ['.hll.', 'hllmm', 'lllmm', '.mmm.', '..t..', '..t..'], pal: { h: '#8fbf6a', l: '#5f9550', m: '#417543', t: '#6b4426' } };
const ACACIA: Sprite = { rows: ['.hAAAAAAh.', 'AAAAAAAAAa', '.aaaaaaaa.', '....T.T...', '.....T....', '.....T....', '....tTt...'], pal: { h: '#a9c46a', A: '#8aa548', a: '#6a8a36', T: '#6b4426', t: '#4a2e18' } };
const DRY_TUFT: Sprite = { rows: ['y.y.y', '.yYy.'], pal: { y: '#e0c070', Y: '#c49a49' } };
const TUFT: Sprite = { rows: ['g.g', '.g.'], pal: { g: '#7aa65a' } };
const ROCK: Sprite = { rows: ['.hR.', 'hRRr', 'RRrr'], pal: { h: '#cfcdb8', R: '#a8a796', r: '#7f8076' } };
const FENCE: Sprite = { rows: ['p...p...p', 'bbbbbbbbb', 'p...p...p', 'bbbbbbbbb', 'p...p...p'], pal: { p: '#8a5a33', b: '#b9824c' } };
const HAY: Sprite = { rows: ['.hhhh.', 'hHHHHd', 'HhHHhd', 'Hdddd.'], pal: { h: '#f2d27a', H: '#d9b04a', d: '#a8802a' } };
const REEDS: Sprite = { rows: ['.b..b', '.B..B', 'g.g.g', 'g.gg.', '.ggg.', '..g..'], pal: { b: '#6b4426', B: '#8a5a33', g: '#5f9550' } };
const SNOWY_PINE: Sprite = { rows: ['..S..', '.SNs.', '.NNn.', 'SSNss', 'NNNNn', '..t..'], pal: { S: '#f4f6f0', s: '#c3d2dc', N: '#2a5048', n: '#1c3a34', t: '#5a3a22' } };
const ICE: Sprite = { rows: ['.hhW.', 'hWWWw', 'WWWwd', 'wwwdd'], pal: { h: '#ffffff', W: '#d8f0ee', w: '#a9cfdc', d: '#86b2c4' } };
const BIG_LEAF: Sprite = { rows: ['.LL...ll.', 'LLLl.lllL', '.LlL.Lll.', '..LlLll..', '....T....', '....T....'], pal: { L: '#3f8a45', l: '#6ab05a', T: '#2a5532' } };
const PALM: Sprite = { rows: ['.ll...ll.', 'lLLl.lLLl', '...lTl...', '....T....', '....T....', '....T....', '...tTt...'], pal: { l: '#3f8a45', L: '#6ab05a', T: '#8a6a3a', t: '#5a4226' } };
const SEAWEED: Sprite = { rows: ['.g.', 'g..', '.g.', '..g', '.g.', 'g..', '.G.'], pal: { g: '#3f9a6a', G: '#2a6a4a' } };
const CORAL: Sprite = { rows: ['p.p.p', 'pPpPp', '.pPp.', '..P..'], pal: { p: '#f2a7c8', P: '#e8586b' } };
const FISH: Sprite = { rows: ['.oo.o', 'oOOoo', '.oo.o'], pal: { o: '#ffb157', O: '#fff3d6' } };

// ——— repères de l'arrivée et du retour ———
const FLAG: Sprite = { rows: ['kRR', 'kRRR', 'kRR', 'k', 'k', 'k', 'k', 'k'], pal: { k: '#5e3b20', R: '#e8586b' } };
const FLAG_WAVE: Sprite = { rows: ['kRRR', 'kRR', 'kRRR', 'k', 'k', 'k', 'k', 'k'], pal: { k: '#5e3b20', R: '#e8586b' } };
const ANCHOR: Sprite = { rows: ['..o..', '.o.o.', '..o..', 'ooooo', '..o..', '..o..', 'o.o.o', '.ooo.'], pal: { o: '#7f8076' } };
const CHEST: Sprite = {
  rows: ['.hHHHHHh.', 'hHHGGGHHd', 'dddGKGddd', 'WwwwGwwwW', 'WwwwwwwwW', 'WWWWWWWWW'],
  pal: { h: '#b9824c', H: '#8a5a33', d: '#5e3b20', G: '#ffd36b', K: '#6b4426', W: '#5e3b20', w: '#8a5a33' },
};

interface Theme {
  /** ciel (ou eau) du haut vers le bas */
  sky: [string, string];
  /** soleil, lune ou rien */
  light: string | null;
  /** arrière-plan : collines, sommets, dunes, cime des arbres ou rien */
  ridge: 'hills' | 'peaks' | 'canopy' | 'flat' | 'none';
  far: string;
  farTop: string;
  ground: [string, string];
  /** chemin de terre (null : pas de chemin) */
  path: string | null;
  /** premier plan : sprites qui défilent, et leur écart */
  props: Sprite[];
  step: number;
  /** sous l'eau : l'animal nage au milieu, des bulles montent, des poissons passent */
  water?: boolean;
  /** neige qui tombe */
  snow?: boolean;
  /** lianes qui pendent du haut */
  vines?: boolean;
}

const THEMES: Record<EnclosId, Theme> = {
  foret: { sky: ['#9fcfc0', '#d8efd8'], light: '#fff6d0', ridge: 'hills', far: '#3d6f3d', farTop: '#548848', ground: ['#2f5a34', '#24452b'], path: '#c2a878', props: [PINE, PINE, ROUND_TREE], step: 11 },
  savane: { sky: ['#f6b26b', '#ffe3a6'], light: '#fff3c4', ridge: 'flat', far: '#c49a49', farTop: '#dbb767', ground: ['#dbb767', '#c49a49'], path: '#efd690', props: [ACACIA, DRY_TUFT, DRY_TUFT], step: 19 },
  ferme: { sky: ['#f6c98e', '#fbe6c0'], light: '#ffe9a8', ridge: 'hills', far: '#9cbf72', farTop: '#b9d48a', ground: ['#548848', '#3d6f3d'], path: '#dcc697', props: [FENCE, HAY, TUFT, ROUND_TREE], step: 14 },
  marais: { sky: ['#b8d8c8', '#e8f0d8'], light: '#fff6d0', ridge: 'flat', far: '#548848', farTop: '#7aa65a', ground: ['#3f8e9c', '#23697c'], path: '#9a7448', props: [REEDS, REEDS, TUFT], step: 10 },
  banquise: { sky: ['#a9c8e8', '#eef6ff'], light: '#ffffff', ridge: 'peaks', far: '#cfdde6', farTop: '#ffffff', ground: ['#eef2ee', '#cfdde6'], path: '#ffffff', props: [ICE, SNOWY_PINE, ICE], step: 16, snow: true },
  jungle: { sky: ['#4f8a5a', '#9fcf98'], light: null, ridge: 'canopy', far: '#24492b', farTop: '#3d6f3d', ground: ['#2f5a34', '#1b3a23'], path: '#8a6a3a', props: [BIG_LEAF, PALM, BIG_LEAF], step: 12, vines: true },
  aquarium: { sky: ['#3f8e9c', '#174a5e'], light: null, ridge: 'none', far: '#23697c', farTop: '#3f8e9c', ground: ['#dcc697', '#c2a878'], path: null, props: [SEAWEED, CORAL, SEAWEED, ROCK], step: 13, water: true },
  montagne: { sky: ['#8e9fd0', '#f2c7d8'], light: '#ffe9a8', ridge: 'peaks', far: '#6a6f9a', farTop: '#eef2ee', ground: ['#7aa65a', '#548848'], path: '#efe3bf', props: [ROCK, TUFT, ROCK], step: 17 },
};

const rect = (c: Ctx, x: number, y: number, w: number, h: number, col: string) => {
  c.fillStyle = col;
  c.fillRect(Math.round(x), Math.round(y), w, h);
};

/** Pseudo-hasard stable pour un nombre entier. */
const hash = (n: number) => {
  const v = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return v - Math.floor(v);
};

/** L'arrière-plan qui défile lentement, en boucle. */
function ridge(c: Ctx, th: Theme, shift: number) {
  if (th.ridge === 'none') return;
  for (let x = 0; x < TRAIL_W; x++) {
    const u = x + shift;
    if (th.ridge === 'peaks') {
      const period = 26;
      const p = (((u % period) + period) % period) / period;
      const h = (9 + hash(Math.floor(u / period)) * 8) * (1 - Math.abs(p - 0.5) * 2) + 3;
      const top = GROUND_Y - 6 - h;
      rect(c, x, top, 1, h + 6, th.far);
      if (h > 7) rect(c, x, top, 1, Math.min(3, h - 7), th.farTop);
    } else if (th.ridge === 'canopy') {
      // la cime des grands arbres, très haute, en masses arrondies
      const h = 16 + Math.sin(u / 5) * 3 + Math.sin(u / 2.3) * 1.5;
      rect(c, x, GROUND_Y - h, 1, h, th.far);
      rect(c, x, GROUND_Y - h, 1, 1, th.farTop);
    } else {
      const h = th.ridge === 'flat' ? 3 + Math.sin(u / 13) * 1 : 6 + Math.sin(u / 9) * 2.5 + Math.sin(u / 4.3) * 1.2;
      const top = GROUND_Y - 4 - h;
      rect(c, x, top, 1, h + 4, th.far);
      rect(c, x, top, 1, 1, th.farTop);
    }
  }
}

/** Le premier plan qui défile plus vite. */
function props(c: Ctx, th: Theme, shift: number) {
  const first = Math.floor(shift / th.step) - 1;
  for (let k = first; k < first + TRAIL_W / th.step + 3; k++) {
    const sprite = th.props[Math.floor(hash(k) * th.props.length)];
    const x = k * th.step - shift + Math.floor(hash(k + 7) * 5);
    blit(c, sprite, x, GROUND_Y - sprite.rows.length + 1, { outline: sprite === TUFT || sprite === DRY_TUFT ? false : undefined });
  }
}

/**
 * Dessine le chemin à l'instant `t` (secondes), dans le milieu `env` de l'animal. `progress` : avancée de l'expédition,
 * de 0 à 1 ; `back` : l'animal est revenu (il attend qu'on le récupère).
 */
export function drawTrail(c: Ctx, t: number, sprite: Sprite, env: EnclosId, progress: number, back: boolean) {
  c.imageSmoothingEnabled = false;
  const th = THEMES[env] ?? THEMES.foret;
  const speed = back ? 0 : 1;
  // ciel (ou eau), par bandes de pixels
  for (let y = 0; y < GROUND_Y; y++) rect(c, 0, y, TRAIL_W, 1, mix(th.sky[0], th.sky[1], y / GROUND_Y));
  if (th.light) for (let y = -3; y <= 3; y++) for (let x = -3; x <= 3; x++) if (x * x + y * y <= 9) rect(c, 96 + x, 7 + y, 1, 1, th.light);
  if (th.water) {
    // rayons de lumière qui descendent de la surface
    for (let k = 0; k < 4; k++) {
      const x0 = ((k * 37 + t * 2) % (TRAIL_W + 20)) - 10;
      for (let y = 0; y < GROUND_Y; y++) rect(c, x0 + y * 0.4, y, 2, 1, 'rgba(216, 240, 238, 0.12)');
    }
  }
  ridge(c, th, Math.floor(t * 3 * speed));
  // sol (sable, neige, eau du marais…) et chemin
  rect(c, 0, GROUND_Y, TRAIL_W, TRAIL_H - GROUND_Y, th.ground[0]);
  rect(c, 0, GROUND_Y + 3, TRAIL_W, TRAIL_H - GROUND_Y - 3, th.ground[1]);
  if (th.path) {
    rect(c, 0, GROUND_Y + 1, TRAIL_W, 2, th.path);
    const dash = Math.floor(t * 14 * speed);
    for (let x = -((dash % 6) + 6); x < TRAIL_W; x += 6) rect(c, x, GROUND_Y + 2, 2, 1, mix(th.path, '#000000', 0.18));
  }
  props(c, th, Math.floor(t * 9 * speed));
  if (th.vines) {
    for (let k = 0; k < 7; k++) {
      const x = Math.round(((k * 19 - t * 9 * speed) % (TRAIL_W + 10) + TRAIL_W + 10) % (TRAIL_W + 10)) - 5;
      const len = 5 + Math.floor(hash(k) * 7);
      for (let y = 0; y < len; y++) rect(c, x + (y % 3 === 2 ? 1 : 0), y, 1, 1, y % 2 ? '#2f6038' : '#417a45');
      rect(c, x - 1, len, 3, 1, '#5f9550');
    }
  }
  if (th.water) {
    // poissons qui passent en sens inverse, et bulles qui montent
    for (let k = 0; k < 3; k++) {
      const x = TRAIL_W + 10 - ((t * (7 + k * 3) + k * 47) % (TRAIL_W + 30));
      blit(c, FISH, Math.round(x), 5 + k * 6 + Math.round(Math.sin(t * 2 + k)), { flip: false, outline: false });
    }
    for (let k = 0; k < 8; k++) {
      const x = (k * 15 + 7) % TRAIL_W;
      const y = GROUND_Y - ((t * 5 + k * 9) % GROUND_Y);
      rect(c, x + Math.round(Math.sin(t * 3 + k)), y, 1, 1, 'rgba(216, 240, 238, 0.8)');
    }
  }

  const w = Math.max(...sprite.rows.map((r) => r.length));
  const h = sprite.rows.length;
  // l'animal marche sur le sol, ou nage au milieu de l'eau
  const baseY = th.water ? GROUND_Y - 8 : GROUND_Y + 1;
  if (!back) {
    if (th.water) blit(c, ANCHOR, TRAIL_W - 9, GROUND_Y - 7, { outline: false });
    else blit(c, Math.floor(t * 3) % 2 ? FLAG : FLAG_WAVE, TRAIL_W - 9, GROUND_Y - 7, { outline: false });
    const x = 4 + Math.min(1, Math.max(0, progress)) * (TRAIL_W - 18 - w);
    const bob = th.water ? Math.round(Math.sin(t * 3) * 1.5) : Math.floor(t * 6) % 2;
    blit(c, sprite, Math.round(x), baseY - h - bob, { shadow: !th.water });
    if (!th.water && Math.floor(t * 6) % 3 === 0) rect(c, x - 2, GROUND_Y, 2, 1, mix(th.path ?? th.ground[0], '#ffffff', 0.4));
  } else {
    // de retour : un coffre qui brille, et l'animal qui saute de joie à côté
    const cx = TRAIL_W / 2 + 6;
    blit(c, CHEST, cx, GROUND_Y - 5, { shadow: true });
    const jump = Math.max(0, Math.sin(t * 6)) * 4;
    blit(c, sprite, Math.round(cx - w - 4), Math.round(baseY - h - jump), { shadow: !th.water });
    for (let k = 0; k < 6; k++) {
      if (Math.sin(t * 5 + k * 2) <= 0.2) continue;
      const a = t * 2 + k * 1.05;
      const sx = cx + 4 + Math.cos(a) * 9;
      const sy = GROUND_Y - 8 + Math.sin(a) * 5;
      rect(c, sx, sy, 1, 1, '#fff6d0');
      rect(c, sx - 1, sy, 1, 1, 'rgba(255, 211, 107, 0.7)');
      rect(c, sx + 1, sy, 1, 1, 'rgba(255, 211, 107, 0.7)');
    }
  }
  if (th.snow) {
    for (let k = 0; k < 14; k++) {
      const x = (k * 23 + Math.sin(t + k) * 3 + 200) % TRAIL_W;
      const y = (t * (4 + (k % 3)) + k * 11) % GROUND_Y;
      rect(c, x, y, 1, 1, 'rgba(255, 255, 255, 0.9)');
    }
  }
}
