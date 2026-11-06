import { mulberry32, type Rng } from '../art/kit';

// Moteur de dessin de « Ma Réserve » en pixel art : une petite toile de 130 × 200 pixels agrandie trois fois sans lissage.
// Les sprites sont écrits en texte (une lettre = une couleur de leur palette, « . » = vide) ; le contour sombre est
// ajouté automatiquement autour de chaque sprite, ce qui les détache du sol.

export const W = 130;
export const H = 200;

type Ctx = CanvasRenderingContext2D;
type Pal = Record<string, string>;
export interface Sprite {
  rows: string[];
  pal: Pal;
}

const INK = '#2a2318';

const px = (c: Ctx, x: number, y: number, col: string) => {
  c.fillStyle = col;
  c.fillRect(x, y, 1, 1);
};
const rect = (c: Ctx, x: number, y: number, w: number, h: number, col: string) => {
  c.fillStyle = col;
  c.fillRect(x, y, w, h);
};

/** Pose un sprite : ombre au sol, contour automatique, puis ses couleurs. */
function blit(c: Ctx, s: Sprite, x: number, y: number, o: { flip?: boolean; outline?: string | false; shadow?: boolean } = {}) {
  const h = s.rows.length;
  const w = Math.max(...s.rows.map((r) => r.length));
  const rows = s.rows.map((r) => r.padEnd(w, '.'));
  const at = (i: number, j: number) => {
    if (j < 0 || j >= h || i < 0 || i >= w) return '.';
    return rows[j][o.flip ? w - 1 - i : i];
  };
  if (o.shadow) {
    c.fillStyle = 'rgba(24, 32, 18, 0.28)';
    c.fillRect(x + 1, y + h - 1, w - 2, 1);
    c.fillRect(x + 2, y + h, w - 4, 1);
  }
  if (o.outline !== false) {
    const ink = o.outline ?? INK;
    for (let j = -1; j <= h; j++)
      for (let i = -1; i <= w; i++) {
        if (at(i, j) !== '.') continue;
        if (at(i - 1, j) !== '.' || at(i + 1, j) !== '.' || at(i, j - 1) !== '.' || at(i, j + 1) !== '.') px(c, x + i, y + j, ink);
      }
  }
  for (let j = 0; j < h; j++)
    for (let i = 0; i < w; i++) {
      const ch = at(i, j);
      if (ch !== '.') px(c, x + i, y + j, s.pal[ch] ?? '#ff00ff');
    }
}

// ——— sprites ———

const LION: Sprite = {
  rows: [
    '.........MMM..',
    '........MMYYM.',
    '.......MMYYKY.',
    'M......MMYYYYn',
    '.Y.....MMMYYY.',
    '..YYYYYMMMMM..',
    '..YYYYYYYYYY..',
    '..YyyyyyyyyY..',
    '..Y.Y....Y.Y..',
  ],
  pal: { Y: '#e3ad55', y: '#c18a3e', M: '#93532a', K: INK, n: '#5a2e1c' },
};

const ELEPHANT: Sprite = {
  rows: [
    '....GGGGGG......',
    '..GGGGGGGGGG....',
    '.GGGGGGGGGGGGG..',
    '.GGGGGGGGGeeGGG.',
    'GGGGGGGGGGeeeGKG',
    '.GGGGGGGGGeeeGGG',
    '.GGGGGGGGGGeGGWG',
    '.gGGGGGGGGGGG..G',
    '.ggGGgggggGGg..G',
    '..GG.GG..GG...G.',
    '..GG.GG..GG.....',
    '..gg.gg..gg.....',
  ],
  pal: { G: '#a3acaf', g: '#7f888c', e: '#8a9397', K: INK, W: '#f6f1e1' },
};

const GIRAFFE: Sprite = {
  rows: [
    '.......h.h.',
    '.......YYY.',
    '......YYKYY',
    '.......YYYY',
    '......YsY..',
    '......YY...',
    '.....sYY...',
    '.....YY....',
    '....YsY....',
    '....YY.....',
    '.YYYYYsY...',
    'YsYYsYYsY..',
    '.YYsYYYYY..',
    '..YY...YY..',
    '..Y.Y..Y.Y.',
    '..Y.Y..Y.Y.',
    '..Y.Y..Y.Y.',
    '..d.d..d.d.',
  ],
  pal: { Y: '#efc372', s: '#a5612c', h: '#6b3d1f', K: INK, d: '#5a3a22' },
};

const ZEBRA: Sprite = {
  rows: [
    '.........BB..',
    '........BWWW.',
    '........BWBWW',
    'B.......BWWBB',
    '.WWBWBWBWB...',
    '.WBWBWBWBW...',
    '.WWBWBWBWW...',
    '.W.W....W.W..',
    '.B.B....B.B..',
  ],
  pal: { W: '#f5f2ea', B: '#2b2724' },
};

const POLAR_BEAR: Sprite = {
  rows: [
    '..........w.w..',
    '...WWWWWWWWWWW.',
    '..WWWWWWWWwWKWW',
    '.WWWWWWWWWwWWWWK',
    '.WWWWWWWWWWWW...',
    '.wWWWWWWWWWWw...',
    '.wW.WW...WW.W...',
    '.ww.ww...ww.w...',
  ],
  pal: { W: '#f6f2e6', w: '#d3cbb4', K: INK },
};

const PENGUIN: Sprite = {
  rows: ['.BB..', 'BBBB.', 'BWBYY', 'BWWB.', 'BWWWB', 'BWWWB', '.WWW.', '.Y.Y.'],
  pal: { B: '#262b33', W: '#f4f6f2', Y: '#f2a63a' },
};

const SEAL: Sprite = {
  rows: ['.......GG.', '..GGGGGGKG', 'GGGGGGGGGG', '.gg.ggggg.'],
  pal: { G: '#8e9aa3', g: '#6f7b84', K: INK },
};

const PANDA: Sprite = {
  rows: ['.BB...BB.', '.BWWWWWB.', '.WWWWWWW.', 'WBBWWWBBW', 'WBeWWWeBW', '.WWWBWWW.', 'BBWWWWWBB', 'BBWWWWWBB', '.BWWWWWB.', '.BB...BB.'],
  pal: { W: '#f3f0e8', B: '#24211f', e: '#f3f0e8' },
};

const FOX: Sprite = {
  rows: ['.......O.O..', '.......OOOO.', 'WO.....OBOOB', '.WOOOOOOOWW.', '..OOOOOOO...', '..B.B..B.B..'],
  pal: { O: '#e3783a', W: '#f6efe2', B: INK },
};

const FLAMINGO: Sprite = {
  rows: ['...PP.', '...PPB', '...P.B', '..P...', '..P...', '..PPPP.', 'pPPPPPP', '.pPPPp.', '...p...', '...p...', '..pp...'],
  pal: { P: '#f39bb5', p: '#d8708f', B: INK },
};

const HIPPO: Sprite = {
  rows: ['.........h.h..', '...HHHH..HHHH.', '..HHHHHHHHHKHH', '.hHHHHHHHHHHHp'],
  pal: { H: '#94788a', h: '#6f5866', p: '#e6a3a8', K: INK },
};

const CROCODILE: Sprite = {
  rows: ['......c.c.c.......', '...CCCCCCCCCCKC...', 'CCCCCCCCCCCCCCCCCC', '....C.C....C.C....'],
  pal: { C: '#6f9142', c: '#4d6a2c', K: INK },
};

const TREE: Sprite = {
  rows: ['...lll...', '..lllLL..', '.llLLLLL.', 'lLLLLLLLd', 'LLLLLLLLd', 'LLLLLLLdd', '.dLLLLdd.', '..ddddd..', '....T....', '...TT....'],
  pal: { L: '#4f8a45', l: '#7bb05c', d: '#356b3a', T: '#6b4426' },
};

const DARK_TREE: Sprite = { rows: TREE.rows, pal: { L: '#3f7a42', l: '#5f9a4e', d: '#2a5734', T: '#5a3a22' } };

const SNOWY_PINE: Sprite = {
  rows: ['...S...', '..SNS..', '.SNNNS.', '..NNN..', '.SNNNS.', 'SNNNNNS', '.NNNNN.', 'SNNNNNS', 'NNNNNNN', '...T...', '...T...'],
  pal: { S: '#f4f9ff', N: '#2e5b50', T: '#5a3a22' },
};

const ACACIA: Sprite = {
  rows: ['...aaaaaaa...', '.aAAAAAAAAAa.', 'aAAAAAAAAAAAa', '.aaaaaaaaaaa.', '...T...T.....', '....T.T......', '.....T.......', '.....T.......', '.....T.......'],
  pal: { A: '#88a544', a: '#5f7d2f', T: '#6b4426' },
};

const ROCK: Sprite = { rows: ['..lll..', '.lRRRr.', 'lRRRRRr', 'rrrrrrr'], pal: { R: '#a39f8c', r: '#7c7868', l: '#c4c0ab' } };
const BIG_ROCK: Sprite = {
  rows: ['...llll....', '..lRRRRRr..', '.lRRRRRRRr.', 'lRRRRRRRRRr', 'rrrrrrrrrrr'],
  pal: { R: '#b0a283', r: '#857a60', l: '#cfc3a3' },
};
const SNOW_ROCK: Sprite = { rows: ['..sss..', '.sRRRr.', 'lRRRRRr', 'rrrrrrr'], pal: { R: '#8d9aa6', r: '#6c7984', l: '#aab6c0', s: '#f4f9ff' } };

const BUSH: Sprite = { rows: ['.lLl.', 'lLLLd', 'dLLdd'], pal: { L: '#4f8a45', l: '#7bb05c', d: '#356b3a' } };
const DRY_BUSH: Sprite = { rows: ['.lLl.', 'lLLLd', 'dLLdd'], pal: { L: '#9a9a48', l: '#b8b45e', d: '#767634' } };

const PADLOCK: Sprite = {
  rows: ['..ggg..', '.g...g.', '.g...g.', 'HHHHHHH', 'HHHKHHH', 'HHHKHHH', 'hhhhhhh'],
  pal: { g: '#8f8f86', H: '#e0a83f', h: '#b07a26', K: INK },
};

const COIN: Sprite = { rows: ['.HHH.', 'HHlHH', 'HlHHH', 'HHHHh', '.hhh.'], pal: { H: '#e9b347', l: '#fff3c4', h: '#b07a26' } };
const ARROW: Sprite = { rows: ['HHHHH', '.HHH.', '..H..'], pal: { H: '#ffd36b' } };
const BENCH: Sprite = { rows: ['TTTTTT', 'tttttt', 't....t'], pal: { T: '#b07a46', t: '#7a4d2b' } };
const LAMP: Sprite = { rows: ['.H.', 'HhH', '.k.', '.k.', '.k.', '.k.', 'kkk'], pal: { H: '#ffe08a', h: '#fff6d0', k: '#3b3a33' } };

const FONT: Record<string, string[]> = {
  '0': ['111', '101', '101', '101', '111'],
  '1': ['010', '110', '010', '010', '111'],
  '2': ['111', '001', '111', '100', '111'],
  '3': ['111', '001', '111', '001', '111'],
  '4': ['101', '101', '111', '001', '001'],
  '5': ['111', '100', '111', '001', '111'],
  '6': ['111', '100', '111', '101', '111'],
  '7': ['111', '001', '010', '010', '010'],
  '8': ['111', '101', '111', '101', '111'],
  '9': ['111', '101', '111', '001', '111'],
  '+': ['000', '010', '111', '010', '000'],
};

/** Petit texte pixel (chiffres et « + ») en sprite. */
function text(s: string, col: string): Sprite {
  const rows = ['', '', '', '', ''];
  [...s].forEach((ch, k) => {
    const g = FONT[ch];
    for (let j = 0; j < 5; j++) rows[j] += (k ? '.' : '') + g[j].replace(/1/g, 'X').replace(/0/g, '.');
  });
  return { rows, pal: { X: col } };
}

const SHIRTS = ['#e8866b', '#86bccb', '#d9a441', '#a9cf7e', '#b98bff', '#f2c7d8', '#efe8d6', '#5d8fd8'];
const HAIRS = ['#2a2318', '#6b4426', '#c99a4b', '#3a2a1c', '#8a5a33'];
const SKINS = ['#f1c9a5', '#d6a27a', '#a8714a', '#7a4f32'];

function visitor(r: Rng): Sprite {
  const pick = <T,>(list: T[]) => list[Math.floor(r() * list.length)];
  return {
    rows: ['.h.', '.f.', 'sss', '.s.', 'l.l'],
    pal: { h: pick(HAIRS), f: pick(SKINS), s: pick(SHIRTS), l: '#3b3a45' },
  };
}

// ——— sols ———

function dither(c: Ctx, r: Rng, x0: number, y0: number, w: number, h: number, base: string, alts: [string, number][], inside?: (x: number, y: number) => boolean) {
  for (let y = y0; y < y0 + h; y++)
    for (let x = x0; x < x0 + w; x++) {
      if (inside && !inside(x, y)) continue;
      let col = base;
      let v = r();
      for (const [alt, p] of alts) {
        if (v < p) {
          col = alt;
          break;
        }
        v -= p;
      }
      px(c, x, y, col);
    }
}

/** Forme d'étang aux bords irréguliers : distance normalisée au centre (≤ 1 dans l'eau). */
function pond(cx: number, cy: number, rx: number, ry: number, seed: number) {
  return (x: number, y: number) => {
    const dx = (x + 0.5 - cx) / rx;
    const dy = (y + 0.5 - cy) / ry;
    const a = Math.atan2(dy, dx);
    return (dx * dx + dy * dy) / (1 + 0.12 * Math.sin(a * 3 + seed) + 0.06 * Math.sin(a * 7 + seed * 2));
  };
}

function water(c: Ctx, r: Rng, d: (x: number, y: number) => number, box: [number, number, number, number], pal: { deep: string; shallow: string; shine: string; shore: string }) {
  const [x0, y0, x1, y1] = box;
  for (let y = y0; y <= y1; y++)
    for (let x = x0; x <= x1; x++) {
      const v = d(x, y);
      if (v <= 1) px(c, x, y, v > 0.72 ? pal.shallow : pal.deep);
      else if (v <= 1.22) px(c, x, y, pal.shore);
    }
  // reflets : petits tirets clairs
  for (let k = 0; k < 14; k++) {
    const x = Math.floor(x0 + r() * (x1 - x0));
    const y = Math.floor(y0 + r() * (y1 - y0));
    if (d(x, y) < 0.6 && d(x + 2, y) < 0.6) rect(c, x, y, r() < 0.5 ? 2 : 3, 1, pal.shine);
  }
}

function fence(c: Ctx, x0: number, y0: number, x1: number, y1: number) {
  const rail = '#8a5a33';
  const post = '#d39c5e';
  rect(c, x0, y0, x1 - x0 + 1, 1, rail);
  rect(c, x0, y1, x1 - x0 + 1, 1, rail);
  rect(c, x0, y0, 1, y1 - y0 + 1, rail);
  rect(c, x1, y0, 1, y1 - y0 + 1, rail);
  for (let x = x0; x <= x1; x += 4) {
    px(c, x, y0 - 1, post);
    px(c, x, y1 - 1, post);
  }
  for (let y = y0 + 4; y < y1; y += 4) {
    px(c, x0, y, post);
    px(c, x1, y, post);
  }
}

/** Parcelle à acheter : brume claire, piquets de corde et cadenas. */
function locked(c: Ctx, r: Rng, x0: number, y0: number, x1: number, y1: number) {
  c.fillStyle = 'rgba(222, 228, 214, 0.72)';
  c.fillRect(x0, y0, x1 - x0 + 1, y1 - y0 + 1);
  for (let k = 0; k < 9; k++) {
    const cx = x0 + 4 + r() * (x1 - x0 - 8);
    const cy = y0 + 4 + r() * (y1 - y0 - 8);
    const rr = 4 + r() * 6;
    c.fillStyle = 'rgba(246, 247, 240, 0.55)';
    for (let y = Math.floor(cy - rr); y <= cy + rr; y++)
      for (let x = Math.floor(cx - rr * 1.6); x <= cx + rr * 1.6; x++) {
        const dx = (x - cx) / (rr * 1.6);
        const dy = (y - cy) / rr;
        if (dx * dx + dy * dy <= 1 && x >= x0 && x <= x1 && y >= y0 && y <= y1) c.fillRect(x, y, 1, 1);
      }
  }
  for (let x = x0; x <= x1; x += 2) {
    px(c, x, y0, '#b8a27a');
    px(c, x, y1, '#b8a27a');
  }
  for (let y = y0; y <= y1; y += 2) {
    px(c, x0, y, '#b8a27a');
    px(c, x1, y, '#b8a27a');
  }
  blit(c, PADLOCK, Math.round((x0 + x1) / 2 - 3), Math.round((y0 + y1) / 2 - 8));
}

/** Gain qui s'élève d'un enclos : pièce + « +18 ». */
function gain(c: Ctx, x: number, y: number, n: number) {
  blit(c, COIN, x, y);
  blit(c, text(`+${n}`, '#ffe08a'), x + 7, y);
}

// ——— la réserve ———

export const ZONES = {
  banquise: [3, 3, 58, 55],
  montagne: [70, 3, 127, 55],
  foret: [3, 66, 58, 121],
  savane: [70, 66, 127, 121],
  lagon: [3, 132, 58, 165],
  jungle: [70, 132, 127, 165],
} as const;

/** Position du lion (pour la bulle de sélection de la maquette). */
export const LION_AT = [76, 90] as const;

export function drawReserve(c: Ctx, seed = 7) {
  const r = mulberry32(seed);
  c.imageSmoothingEnabled = false;

  // herbe de fond, chemins de terre claire
  dither(c, r, 0, 0, W, H, '#5d9450', [
    ['#6aa25a', 0.05],
    ['#558a49', 0.05],
  ]);
  // touffes d'herbe
  for (let k = 0; k < 160; k++) {
    const x = Math.floor(r() * W);
    const y = Math.floor(r() * H);
    px(c, x, y, '#4a7d41');
    px(c, x + 1, y - 1, '#4a7d41');
    px(c, x + 2, y, '#4a7d41');
  }
  const path = (x: number, y: number, w: number, h: number) =>
    dither(c, r, x, y, w, h, '#e4d3a6', [
      ['#d6c290', 0.07],
      ['#ecdfb9', 0.04],
      ['#bfa877', 0.015],
    ]);
  path(61, 0, 7, 176);
  path(0, 58, W, 6);
  path(0, 124, W, 6);
  path(0, 168, W, 6);
  path(38, 168, 54, 32);
  // fleurs dans l'herbe
  for (let k = 0; k < 70; k++) {
    const x = Math.floor(r() * W);
    const y = Math.floor(r() * H);
    const inZone = Object.values(ZONES).some(([a, b, cc, d]) => x >= a - 1 && x <= cc + 1 && y >= b - 2 && y <= d + 1);
    const onPath = (x >= 60 && x <= 68 && y < 177) || (y >= 57 && y <= 64) || (y >= 123 && y <= 130) || (y >= 167 && y <= 174) || (x >= 37 && x <= 92 && y >= 167);
    if (!inZone && !onPath) px(c, x, y, ['#f2c7d8', '#ffe08a', '#f6f1e1', '#b98bff'][k % 4]);
  }

  // ——— Banquise ———
  {
    const [x0, y0, x1, y1] = ZONES.banquise;
    dither(c, r, x0, y0, x1 - x0 + 1, y1 - y0 + 1, '#eef5fb', [
      ['#dbe8f3', 0.05],
      ['#ffffff', 0.04],
    ]);
    // congères
    for (const [x, y, w] of [[8, 46, 9], [20, 51, 12], [6, 26, 7]] as const) {
      rect(c, x, y, w, 1, '#c9dbea');
      rect(c, x + 1, y - 1, w - 2, 1, '#ffffff');
    }
    const d = pond(41, 37, 14, 9, 1.3);
    water(c, r, d, [x0 + 1, y0 + 1, x1 - 1, y1 - 1], { deep: '#3f8fb2', shallow: '#76c0d6', shine: '#d6f3fa', shore: '#bfe0ee' });
    // banquise flottante
    const floe = pond(45, 35, 5, 2.6, 0.4);
    for (let y = 31; y <= 39; y++) for (let x = 38; x <= 52; x++) if (floe(x, y) <= 1) px(c, x, y, floe(x, y) > 0.7 ? '#cfe6f2' : '#f6fbff');
    for (const x of [6, 13, 20, 48]) blit(c, SNOWY_PINE, x, x === 48 ? 6 : 4 + (x % 3), { shadow: true });
    blit(c, SNOW_ROCK, 29, 10, { shadow: true });
    blit(c, POLAR_BEAR, 8, 31, { shadow: true });
    blit(c, SEAL, 41, 30);
    blit(c, PENGUIN, 25, 41, { shadow: true });
    blit(c, PENGUIN, 30, 45, { shadow: true });
    blit(c, PENGUIN, 21, 46, { shadow: true, flip: true });
    fence(c, x0, y0, x1, y1);
    gain(c, 33, 19, 18);
  }

  // ——— Montagne (à débloquer) ———
  {
    const [x0, y0, x1, y1] = ZONES.montagne;
    dither(c, r, x0, y0, x1 - x0 + 1, y1 - y0 + 1, '#8f9a7c', [
      ['#7d8a6c', 0.08],
      ['#a3ad8f', 0.05],
    ]);
    for (const [x, y] of [[74, 30], [96, 36], [112, 22], [84, 12]] as const) blit(c, ROCK, x, y, { shadow: true });
    for (const x of [104, 118]) blit(c, SNOWY_PINE, x, 8, { shadow: true });
    locked(c, r, x0, y0, x1, y1);
  }

  // ——— Forêt ———
  {
    const [x0, y0, x1, y1] = ZONES.foret;
    dither(c, r, x0, y0, x1 - x0 + 1, y1 - y0 + 1, '#447a3f', [
      ['#3b6e38', 0.07],
      ['#4f8848', 0.05],
      ['#6a5a3a', 0.01],
    ]);
    // bambous
    for (let k = 0; k < 7; k++) {
      const x = 8 + k * 2 + (k % 2);
      const top = 78 + ((k * 5) % 7);
      for (let y = top; y < 100; y++) px(c, x, y, (y - top) % 4 === 3 ? '#5f8a35' : '#9cc65a');
      px(c, x - 1, top + 2, '#7bb05c');
      px(c, x + 1, top + 4, '#7bb05c');
      px(c, x - 1, top + 7, '#6a9e4c');
    }
    const trees: [number, number, Sprite][] = [
      [24, 67, TREE], [36, 66, DARK_TREE], [47, 68, TREE], [4, 102, DARK_TREE], [48, 92, DARK_TREE], [30, 108, TREE], [44, 108, DARK_TREE],
    ];
    for (const [x, y, s] of trees) blit(c, s, x, y, { shadow: true });
    blit(c, BUSH, 20, 115);
    blit(c, BUSH, 6, 117);
    px(c, 40, 86, '#e8866b');
    px(c, 40, 87, '#f6f1e1');
    blit(c, PANDA, 19, 93, { shadow: true });
    blit(c, FOX, 34, 85, { shadow: true, flip: true });
    fence(c, x0, y0, x1, y1);
    gain(c, 23, 80, 12);
  }

  // ——— Savane ———
  {
    const [x0, y0, x1, y1] = ZONES.savane;
    dither(c, r, x0, y0, x1 - x0 + 1, y1 - y0 + 1, '#d9b764', [
      ['#c9a552', 0.07],
      ['#e6c97e', 0.05],
      ['#b38f45', 0.01],
    ]);
    // herbes sèches
    for (let k = 0; k < 24; k++) {
      const x = x0 + 2 + Math.floor(r() * (x1 - x0 - 4));
      const y = y0 + 3 + Math.floor(r() * (y1 - y0 - 5));
      px(c, x, y, '#a88a3c');
      px(c, x + 1, y - 1, '#a88a3c');
    }
    const d = pond(114, 113, 8, 3.6, 2.1);
    water(c, r, d, [x0 + 1, 105, x1 - 1, y1 - 1], { deep: '#4d9bb8', shallow: '#7cc0cf', shine: '#c9eef2', shore: '#a88a4a' });
    blit(c, ACACIA, 106, 68, { shadow: true });
    blit(c, ACACIA, 113, 70, { shadow: true });
    blit(c, DRY_BUSH, 92, 115);
    blit(c, DRY_BUSH, 121, 90);
    blit(c, BIG_ROCK, 73, 97, { shadow: true });
    blit(c, LION, LION_AT[0], LION_AT[1]);
    blit(c, GIRAFFE, 110, 78, { shadow: true, flip: true });
    blit(c, ELEPHANT, 89, 101, { shadow: true });
    blit(c, ZEBRA, 94, 86, { shadow: true, flip: true });
    blit(c, ZEBRA, 116, 103, { shadow: true, flip: true });
    fence(c, x0, y0, x1, y1);
    gain(c, 73, 106, 24);
  }

  // ——— Lagon ———
  {
    const [x0, y0, x1, y1] = ZONES.lagon;
    dither(c, r, x0, y0, x1 - x0 + 1, y1 - y0 + 1, '#6aa25a', [
      ['#5d9450', 0.06],
      ['#7bb466', 0.04],
    ]);
    const d = pond(33, 148, 21, 12, 0.7);
    water(c, r, d, [x0 + 1, y0 + 1, x1 - 1, y1 - 1], { deep: '#3f8fb2', shallow: '#6fb8cc', shine: '#d6f3fa', shore: '#c9b07a' });
    // roseaux
    for (const x of [6, 8, 10, 52, 54, 50]) {
      const top = 136 + (x % 4);
      for (let y = top; y < top + 6; y++) px(c, x, y, '#5f8a35');
      rect(c, x, top - 2, 1, 2, '#8a5a33');
    }
    // nénuphars
    for (const [x, y] of [[22, 142], [44, 152], [27, 156]] as const) {
      rect(c, x, y, 3, 1, '#4f8a45');
      px(c, x + 1, y - 1, '#f2c7d8');
    }
    blit(c, FLAMINGO, 10, 137);
    blit(c, FLAMINGO, 16, 141, { flip: true });
    blit(c, FLAMINGO, 9, 149);
    blit(c, HIPPO, 31, 144);
    rect(c, 30, 148, 17, 1, '#76c0d6');
    blit(c, CROCODILE, 36, 159, { shadow: true, flip: true });
    fence(c, x0, y0, x1, y1);
    gain(c, 26, 134, 9);
  }

  // ——— Jungle (à débloquer) ———
  {
    const [x0, y0, x1, y1] = ZONES.jungle;
    dither(c, r, x0, y0, x1 - x0 + 1, y1 - y0 + 1, '#2f6a3c', [
      ['#275a33', 0.25],
      ['#3a7a45', 0.12],
    ]);
    for (const [x, y] of [[72, 134], [86, 140], [100, 133], [114, 140], [78, 150], [106, 150], [118, 152]] as const) blit(c, DARK_TREE, x, y, { shadow: true });
    locked(c, r, x0, y0, x1, y1);
  }

  // ——— entrée : buvette, portail, bancs ———
  // pavés de la place
  for (let y = 176; y < H; y += 3) for (let x = 38 + ((y / 3) % 2) * 2; x < 92; x += 4) px(c, x, y, '#cdb98a');
  // buvette
  {
    const x0 = 8;
    const y0 = 178;
    rect(c, x0 + 1, y0 + 5, 20, 14, '#9a6a3c');
    for (let y = y0 + 7; y < y0 + 19; y += 3) rect(c, x0 + 1, y, 20, 1, '#83582f');
    rect(c, x0 + 4, y0 + 7, 14, 5, '#3a2a1c');
    blit(c, visitor(r), x0 + 9, y0 + 7, { outline: false });
    rect(c, x0 + 3, y0 + 12, 16, 2, '#d8a86a');
    for (let x = 0; x < 22; x++) rect(c, x0 + x, y0, 1, 5, Math.floor(x / 3) % 2 ? '#f4ead2' : '#e8a83c');
    for (let x = 0; x < 22; x += 3) px(c, x0 + x + 1, y0 + 5, Math.floor(x / 3) % 2 ? '#f4ead2' : '#e8a83c');
    rect(c, x0, y0 - 1, 22, 1, '#8a5a22');
    blit(c, COIN, x0 + 8, y0 - 7);
  }
  // portail d'entrée
  {
    rect(c, 50, 182, 3, 18, '#7a4d2b');
    rect(c, 50, 182, 1, 18, '#a87347');
    rect(c, 77, 182, 3, 18, '#7a4d2b');
    rect(c, 77, 182, 1, 18, '#a87347');
    rect(c, 46, 177, 38, 6, '#8a5a22');
    rect(c, 47, 178, 36, 4, '#d9a441');
    rect(c, 47, 178, 36, 1, '#f0c766');
    // feuille du logo au milieu du fronton
    blit(c, { rows: ['.K.K.', 'K...K', '.KKK.', '.KKK.'], pal: { K: '#6b3d1f' } }, 63, 178, { outline: false });
    blit(c, LAMP, 44, 186);
    blit(c, LAMP, 83, 186);
  }
  blit(c, BENCH, 100, 177, { shadow: true });
  blit(c, BENCH, 112, 186, { shadow: true });
  blit(c, TREE, 118, 174, { shadow: true });
  blit(c, TREE, 96, 186, { shadow: true });
  blit(c, BUSH, 33, 190);
  blit(c, BUSH, 92, 196);

  // visiteurs dans les allées
  const people: [number, number, boolean?][] = [
    [63, 14], [64, 40, true], [18, 59], [44, 58, true], [96, 59], [110, 58, true], [63, 84], [64, 108, true],
    [26, 125], [86, 124, true], [100, 125], [63, 146], [64, 160, true], [56, 186], [70, 191, true], [73, 186], [24, 169], [104, 168, true],
    [48, 61, false], [118, 125],
  ];
  for (const [x, y, flip] of people) blit(c, visitor(r), x, y, { flip, outline: 'rgba(42, 35, 24, 0.75)' });

  // le lion sélectionné
  blit(c, ARROW, LION_AT[0] + 9, LION_AT[1] - 6);
}
