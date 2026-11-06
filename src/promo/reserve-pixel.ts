import { mix, mulberry32 } from '../art/kit';

// « Ma Réserve » en pixel art : une toile de 130 × 200 pixels agrandie trois fois sans lissage.
// Direction : la palette du jeu (sous-bois vert profond, parchemin, miel, lichen) à l'heure dorée, quand les lampes
// s'allument. Lumière venue d'en haut à gauche, ombres portées vers le bas à droite, lucioles le soir.
// Les sprites sont écrits en texte (une lettre = une couleur de leur palette, « . » = vide) ; leur contour est tracé
// automatiquement dans une teinte sombre de la couleur voisine (contour « sélectif »), pas en noir.
// Le décor fixe est peint une fois ; la vie (eau, visiteurs, animaux, brume, lucioles, lumières) à chaque image.

export const W = 130;
export const H = 200;

type Ctx = CanvasRenderingContext2D;
type Pal = Record<string, string>;
export interface Sprite {
  rows: string[];
  pal: Pal;
}

const BG = '#0e1712';

// ——— palette ———
const G = ['#1a3322', '#24452b', '#2f5a34', '#3d6f3d', '#548848', '#7aa65a']; // herbe, de l'ombre à la lumière
const P = ['#6b5636', '#9a8058', '#c2a878', '#dcc697', '#efe3bf']; // terre des allées, couleur parchemin
const WD = ['#3a2414', '#5e3b20', '#8a5a33', '#b9824c', '#e0ad62']; // bois
const AQ = ['#0f2d3d', '#174a5e', '#23697c', '#3f8e9c', '#86bccb', '#d8f0ee']; // eau
const SN = ['#7f97ad', '#a9bfd0', '#cfdde6', '#eef2ee', '#ffffff']; // neige
const SV = ['#6e4f22', '#9c7533', '#c49a49', '#dbb767', '#efd690']; // savane
const FO = ['#132a1b', '#1b3a23', '#24492b', '#2f5c34', '#3d6f3d']; // sous-bois
const RK = ['#383a35', '#585a52', '#7f8076', '#a8a796', '#cfcdb8']; // pierre

const px = (c: Ctx, x: number, y: number, col: string) => {
  c.fillStyle = col;
  c.fillRect(x, y, 1, 1);
};
const rect = (c: Ctx, x: number, y: number, w: number, h: number, col: string) => {
  c.fillStyle = col;
  c.fillRect(x, y, w, h);
};

/** Bruit doux (valeurs interpolées sur une grille), de 0 à 1. */
function noise(seed: number, cell: number) {
  const r = mulberry32(seed);
  const gw = Math.ceil(W / cell) + 2;
  const gh = Math.ceil(H / cell) + 2;
  const g = Array.from({ length: gw * gh }, () => r());
  return (x: number, y: number) => {
    const fx = Math.max(0, x) / cell;
    const fy = Math.max(0, y) / cell;
    const ix = Math.floor(fx);
    const iy = Math.floor(fy);
    const sx = (fx - ix) * (fx - ix) * (3 - 2 * (fx - ix));
    const sy = (fy - iy) * (fy - iy) * (3 - 2 * (fy - iy));
    const a = g[iy * gw + ix];
    const b = g[iy * gw + ix + 1];
    const c = g[(iy + 1) * gw + ix];
    const d = g[(iy + 1) * gw + ix + 1];
    return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
  };
}

/** Lumière de fin de journée, plus forte en haut à gauche. */
const light = (x: number, y: number) => 1 - (x / W) * 0.4 - (y / H) * 0.35;

/** Pose un sprite : ombre portée, contour sélectif, puis ses couleurs. */
export function blit(c: Ctx, s: Sprite, x: number, y: number, o: { flip?: boolean; outline?: string | false; shadow?: boolean; alpha?: number } = {}) {
  const h = s.rows.length;
  const w = Math.max(...s.rows.map((r) => r.length));
  const rows = s.rows.map((r) => r.padEnd(w, '.'));
  const at = (i: number, j: number) => (j < 0 || j >= h || i < 0 || i >= w ? '.' : rows[j][o.flip ? w - 1 - i : i]);
  c.globalAlpha = o.alpha ?? 1;
  if (o.shadow) {
    c.fillStyle = 'rgba(8, 16, 10, 0.34)';
    c.fillRect(x + 2, y + h - 1, w - 1, 1);
    c.fillRect(x + 3, y + h, w - 3, 1);
  }
  if (o.outline !== false) {
    for (let j = -1; j <= h; j++)
      for (let i = -1; i <= w; i++) {
        if (at(i, j) !== '.') continue;
        const n = [at(i, j + 1), at(i + 1, j), at(i - 1, j), at(i, j - 1)].find((ch) => ch !== '.');
        if (n) px(c, x + i, y + j, o.outline ?? mix(s.pal[n] ?? BG, BG, 0.66));
      }
  }
  for (let j = 0; j < h; j++)
    for (let i = 0; i < w; i++) {
      const ch = at(i, j);
      if (ch !== '.') px(c, x + i, y + j, s.pal[ch] ?? '#ff00ff');
    }
  c.globalAlpha = 1;
}

// ——— animaux ———

const INK = '#2a1a10';

const LION: Sprite = {
  rows: [
    '.........mMMm...',
    '........mMLLMM..',
    '........MLYYKM..',
    'M.......MYYYYYn.',
    '.L......MMYYyY..',
    '..L....MMMMyy...',
    '..YLLLLLMMMm....',
    '..YYYYYYYYYYy...',
    '..YyyyyyyyyYy...',
    '..Yb.Yb..Yb.Yb..',
    '..bb.bb..bb.bb..',
  ],
  pal: { Y: '#e3a94f', y: '#b97c36', L: '#f4cd80', M: '#8e4f25', m: '#b4672f', K: INK, n: '#4a2616', b: '#93652c' },
};

const ELEPHANT: Sprite = {
  rows: [
    '.....LLLLLL.......',
    '...LLGGGGGGLL.....',
    '..LGGGGGGGGGGGe...',
    '.LGGGGGGGGGGeeeG..',
    '.GGGGGGGGGGGeEegG.',
    'gGGGGGGGGGGGeEeGKG',
    '.GGGGGGGGGGGgeeGGG',
    '.gGGGGGGGGGGGgGGWW',
    '.dgGGGGGGGGGGd.GG.',
    '..dgggggggggd..GG.',
    '..GG.GG...GG.G..G.',
    '..Gg.Gg...Gg.Gg...',
    '..dd.dd...dd.dd...',
  ],
  pal: { G: '#a9afb1', g: '#878e92', d: '#686f74', L: '#c9cdcc', e: '#959ca0', E: '#7d858a', W: '#f3ead2', K: INK },
};

const GIRAFFE: Sprite = {
  rows: [
    '........h.h.',
    '........LLL.',
    '.......LYYKY',
    '........YYYYn',
    '.......mYs..',
    '.......mYY..',
    '......msYY..',
    '......mYY...',
    '.....msY....',
    '.....mYY....',
    '..LLLLYsY...',
    '.LYsYYsYYs..',
    '.YYYsYYYYY..',
    '..YsYYYsY...',
    '..Yy...Yy...',
    '..Y.y..Y.y..',
    '..Y.y..Y.y..',
    '..Y.y..Y.y..',
    '..d.d..d.d..',
  ],
  pal: { Y: '#eebe68', y: '#c8954a', L: '#f8d898', s: '#a8622c', m: '#8a4f24', h: '#5a331a', K: INK, n: '#a8622c', d: '#4a2e1a' },
};

const ZEBRA: Sprite = {
  rows: [
    '..........Bm..',
    '.........BWWW.',
    '.........BWKWW',
    'B........BWWBB',
    '.WWBWBWBWBW...',
    '.WBWBWBWBWw...',
    '.wWBWBWBWww...',
    '.W.W....W.W...',
    '.W.w....W.w...',
    '.B.B....B.B...',
  ],
  pal: { W: '#f3efe6', w: '#cfc8b8', B: '#2a2622', K: '#2a2622', m: '#2a2622' },
};

const POLAR_BEAR: Sprite = {
  rows: [
    '...........s.s..',
    '...LLLLLLLLWWWW.',
    '..LWWWWWWWWWWKWW',
    '.LWWWWWWWWWsWWWWK',
    '.WWWWWWWWWWWWw...',
    '.WWWWWWWWWWWw....',
    '.sWWwwwwwwWWs....',
    '.sW.Ws...sW.Ws...',
    '.ss.ss...ss.ss...',
  ],
  pal: { W: '#f1ece0', L: '#fffaf0', w: '#d8cfb8', s: '#b5aa8c', K: INK },
};

const PENGUIN: Sprite = {
  rows: ['.BBB..', 'BBBBB.', 'BBWBYY', 'BWWBb.', 'BWWWb.', 'BWWWb.', 'BwWWb.', '.www..', '.Y.Y..'],
  pal: { B: '#262c3c', b: '#3d4559', W: '#f2f2ea', w: '#cfd2cc', Y: '#f0a338' },
};

const SEAL: Sprite = {
  rows: ['........LL.', '..LLLLLLGGK', '.LGGGGGGGGGG', 'GGGGGGGGGgg.', '.gg.gggggg..'],
  pal: { L: '#b4bec6', G: '#8a96a0', g: '#68747e', K: INK },
};

const PANDA: Sprite = {
  rows: ['.BB...BB.', '.BWWWWWB.', '.WLLWWWWw', 'WBBWWWBBw', 'WBeWWWeBw', '.WWWBWWw.', 'BBWWWWWBB', 'BBWWWWwBB', '.BWWwwwB.', '.BB...BB.'],
  pal: { W: '#f1ede4', L: '#ffffff', w: '#cdc5b4', B: '#221f1d', e: '#f1ede4' },
};

const FOX: Sprite = {
  rows: ['........O.O.', '........OOOO', 'WO......OKOOB', '.WOOOOOOOLWW', '..OOOOOOOo..', '..o.o..o.o..', '..B.B..B.B..'],
  pal: { O: '#df7434', o: '#b5562a', L: '#f09a55', W: '#f4ecdc', B: INK, K: INK },
};

const FLAMINGO: Sprite = {
  rows: ['...LP..', '...PPBB', '...P..B', '..P....', '..P....', '..PLLP.', 'pPPPPPP', '.pPPPPp', '..pp...', '...p...', '...p...', '..pp...'],
  pal: { P: '#f49ab4', p: '#cf6c8c', L: '#ffc6d6', B: INK },
};

const HIPPO: Sprite = {
  rows: ['.........h.h..', '...LLLL..LLLL.', '..LHHHHHHHHKHH', '.hHHHHHHHHHHHp', '.hhhhhhhhhhhhh'],
  pal: { H: '#8e7286', h: '#6c5466', L: '#a98fa2', p: '#e2a1a8', K: INK },
};

const CROCODILE: Sprite = {
  rows: ['......c.c.c.......', '...LLLLLLLLLLKLL..', 'CCCCCCCCCCCCCCCCCC', '..cC.Cc....Cc.Cc..'],
  pal: { C: '#6c8a3f', c: '#4b6a2c', L: '#8fae55', K: INK },
};

// ——— décor ———

const TREE_ROWS = ['....hhh....', '..hhllhh...', '.hllllllm..', '.lllllllmm.', 'hlllllllmmd', 'lllllmmmmmd', 'lllmmmmmmdd', '.mmmmmmmdd.', '..ddmmddd..', '....ddd....', '.....T.....', '....TTt....'];
const TREE: Sprite = { rows: TREE_ROWS, pal: { h: '#8fbf6a', l: '#5f9550', m: '#417543', d: '#2a5532', T: '#6b4426', t: '#4a2e18' } };
const DARK_TREE: Sprite = { rows: TREE_ROWS, pal: { h: '#6aa25a', l: '#417a45', m: '#2f6038', d: '#1f4428', T: '#5a3a22', t: '#3a2414' } };

const SNOWY_PINE: Sprite = {
  rows: ['....S....', '...SSs...', '..SNNns..', '...NNn...', '..SSSss..', '.SNNNNns.', '..NNNNn..', '.SSSSSss.', 'SNNNNNNns', '.NNNNNNn.', 'SSNNNNnss', 'NNNNNNNnn', '....T....', '....T....'],
  pal: { N: '#2a5048', n: '#1c3a34', S: '#f4f6f0', s: '#c3d2dc', T: '#5a3a22' },
};

const ACACIA: Sprite = {
  rows: ['....hhhhhhh....', '..hAAAAAAAAAa..', '.AAAAAAAAAAAAa.', 'aAAAAAAAAAAAAad', '.daaaaaaaaaadd.', '.....T...T.....', '......T.T......', '.......T.......', '.......T.......', '......tTt......'],
  pal: { A: '#8aa548', a: '#6a8a36', d: '#4f6a28', h: '#a9c46a', T: '#6b4426', t: '#4a2e18' },
};

const ROCK_ROWS = ['..hhh..', '.hRRRr.', 'hRRRRrd', 'RRRrrdd', '.ddddd.'];
const ROCK: Sprite = { rows: ROCK_ROWS, pal: { h: RK[4], R: RK[3], r: RK[2], d: RK[1] } };
const SNOW_ROCK: Sprite = { rows: ['..sss..', '.sSSSr.', 'hRRRRrd', 'RRRrrdd', '.ddddd.'], pal: { s: SN[4], S: SN[3], h: '#aab6c0', R: '#8d9aa6', r: '#6c7984', d: '#55606a' } };
const BIG_ROCK: Sprite = {
  rows: ['...hhhh.....', '..hRRRRRr...', '.hRRRRRRRrr.', 'hRRRRRRRRrrd', 'RRRRRrrrrrdd', '.ddddddddd..'],
  pal: { h: '#e2d2a8', R: '#bfae84', r: '#958560', d: '#6e6046' },
};

const BUSH: Sprite = { rows: ['.hll..', 'hllmm.', 'lmmmmd', '.dddd.'], pal: { h: '#8fbf6a', l: '#5f9550', m: '#417543', d: '#2a5532' } };
const DRY_BUSH: Sprite = { rows: ['.hll..', 'hllmm.', 'lmmmmd', '.dddd.'], pal: { h: '#c9c06a', l: '#a39a4c', m: '#7f7a38', d: '#5c5a2a' } };
const MUSHROOM: Sprite = { rows: ['.RR.', 'RwRR', '.ss.'], pal: { R: '#d9553a', w: '#f6efe0', s: '#efe3bf' } };
const MOUND: Sprite = { rows: ['..h..', '.hVv.', '.VVv.', 'hVVvv', 'VVvvd', 'Vvvdd'], pal: { h: SV[3], V: SV[2], v: SV[1], d: SV[0] } };

const PADLOCK: Sprite = {
  rows: ['..ggg..', '.g...G.', '.g...G.', 'hHHHHHd', 'HHHKHHd', 'HHHKHHd', 'Hddddd.'],
  pal: { g: '#b9b9ae', G: '#8f8f86', h: '#ffe08a', H: '#e0a83f', d: '#a8741f', K: '#3a2508' },
};
const COIN: Sprite = { rows: ['.hHH.', 'hlHHd', 'hHHHd', 'HHHdd', '.ddd.'], pal: { h: '#ffe08a', H: '#e3ab3f', l: '#fff6d0', d: '#a8741f' } };
const ARROW: Sprite = { rows: ['hHHHH', '.HHH.', '..H..'], pal: { h: '#fff3c4', H: '#ffd36b' } };
const BENCH: Sprite = { rows: ['hTTTTT', 'tttttt', 'd....d'], pal: { h: WD[4], T: WD[3], t: WD[2], d: WD[1] } };
const LAMP: Sprite = { rows: ['.k.', 'kHk', 'kHk', '.k.', '.k.', '.k.', '.k.', 'kkk'], pal: { H: '#ffe6a0', k: '#2f2e29' } };

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

function text(s: string, col: string): Sprite {
  const rows = ['', '', '', '', ''];
  [...s].forEach((ch, k) => {
    for (let j = 0; j < 5; j++) rows[j] += (k ? '.' : '') + FONT[ch][j].replace(/1/g, 'X').replace(/0/g, '.');
  });
  return { rows, pal: { X: col } };
}

const SHIRTS = ['#e8866b', '#86bccb', '#d9a441', '#a9cf7e', '#b98bff', '#f2c7d8', '#efe8d6', '#5d8fd8'];
const HAIRS = ['#2a2318', '#6b4426', '#c99a4b', '#3a2a1c', '#8a5a33'];
const SKINS = ['#f1c9a5', '#d6a27a', '#a8714a', '#7a4f32'];

function person(k: number, step: boolean): Sprite {
  return {
    rows: ['.h.', '.f.', 'sss', '.s.', step ? '.l.' : 'l.l'],
    pal: { h: HAIRS[k % HAIRS.length], f: SKINS[(k * 3) % SKINS.length], s: SHIRTS[(k * 5) % SHIRTS.length], l: '#3b3a45' },
  };
}

// ——— plan ———

type Box = readonly [number, number, number, number];
export const ZONES = {
  banquise: [3, 3, 58, 55],
  montagne: [70, 3, 127, 55],
  foret: [3, 66, 58, 121],
  savane: [70, 66, 127, 121],
  lagon: [3, 132, 58, 165],
  jungle: [70, 132, 127, 165],
} as const satisfies Record<string, Box>;
type ZoneId = keyof typeof ZONES;

/** Position du lion (pour la bulle de sélection de la maquette). */
export const LION_AT = [74, 88] as const;

function inZone(x: number, y: number, [x0, y0, x1, y1]: Box, r = 3) {
  if (x < x0 || x > x1 || y < y0 || y > y1) return false;
  const dx = x < x0 + r ? x0 + r - x : x > x1 - r ? x - (x1 - r) : 0;
  const dy = y < y0 + r ? y0 + r - y : y > y1 - r ? y - (y1 - r) : 0;
  return dx * dx + dy * dy <= r * r;
}
const isPlaza = (x: number, y: number) => x >= 38 && x <= 91 && y >= 173;
const isPath = (x: number, y: number) =>
  (x >= 61 && x <= 67 && y <= 173) || (y >= 58 && y <= 63) || (y >= 124 && y <= 129) || (y >= 167 && y <= 172) || isPlaza(x, y);

function zoneAt(x: number, y: number): ZoneId | null {
  for (const id of Object.keys(ZONES) as ZoneId[]) if (inZone(x, y, ZONES[id])) return id;
  return null;
}

/** Étang aux bords irréguliers : distance normalisée au centre (≤ 1 dans l'eau). */
function pond(cx: number, cy: number, rx: number, ry: number, seed: number) {
  return (x: number, y: number) => {
    const dx = (x + 0.5 - cx) / rx;
    const dy = (y + 0.5 - cy) / ry;
    const a = Math.atan2(dy, dx);
    return (dx * dx + dy * dy) / (1 + 0.12 * Math.sin(a * 3 + seed) + 0.06 * Math.sin(a * 7 + seed * 2));
  };
}

interface Water {
  d: (x: number, y: number) => number;
  box: Box;
  rim: string[];
}

const WATERS: Water[] = [
  { d: pond(41, 37, 14, 9, 1.3), box: [24, 26, 57, 49], rim: [SN[2], SN[4]] },
  { d: pond(114, 113, 8, 3.6, 2.1), box: [104, 107, 126, 119], rim: [SV[1], SV[2]] },
  { d: pond(33, 148, 21, 12, 0.7), box: [6, 134, 57, 164], rim: [SV[3], SV[4]] },
];

function paintWater(c: Ctx, w: Water) {
  const [x0, y0, x1, y1] = w.box;
  for (let y = y0; y <= y1; y++)
    for (let x = x0; x <= x1; x++) {
      const v = w.d(x, y);
      if (v <= 1) px(c, x, y, v < 0.42 ? AQ[1] : v < 0.78 ? AQ[2] : v < 0.93 ? AQ[3] : AQ[4]);
      else if (v <= 1.2) px(c, x, y, v < 1.1 ? w.rim[1] : w.rim[0]);
    }
}

function fence(c: Ctx, [x0, y0, x1, y1]: Box) {
  const shade = 'rgba(8, 16, 10, 0.32)';
  // ombre de la clôture du haut sur le sol de l'enclos, de celle de droite à côté
  c.fillStyle = shade;
  c.fillRect(x0 + 3, y0 + 1, x1 - x0 - 5, 2);
  c.fillRect(x1 + 1, y0 + 3, 1, y1 - y0 - 3);
  c.fillRect(x0 + 3, y1 + 1, x1 - x0 - 4, 1);
  // traverses
  rect(c, x0 + 3, y0 - 1, x1 - x0 - 5, 1, WD[3]);
  rect(c, x0 + 3, y0, x1 - x0 - 5, 1, WD[1]);
  rect(c, x0 + 3, y1 - 1, x1 - x0 - 5, 1, WD[3]);
  rect(c, x0 + 3, y1, x1 - x0 - 5, 1, WD[1]);
  rect(c, x0, y0 + 3, 1, y1 - y0 - 5, WD[2]);
  rect(c, x1, y0 + 3, 1, y1 - y0 - 5, WD[1]);
  // coins arrondis
  for (const [x, y] of [
    [x0 + 1, y0 + 1], [x0 + 2, y0], [x0, y0 + 2], [x1 - 1, y0 + 1], [x1 - 2, y0], [x1, y0 + 2],
    [x0 + 1, y1 - 1], [x0 + 2, y1], [x0, y1 - 2], [x1 - 1, y1 - 1], [x1 - 2, y1], [x1, y1 - 2],
  ])
    px(c, x, y, WD[2]);
  // poteaux, éclairés sur le dessus
  for (let x = x0 + 4; x <= x1 - 3; x += 5) {
    for (const y of [y0, y1]) {
      px(c, x, y - 2, WD[4]);
      px(c, x, y - 1, WD[2]);
      px(c, x, y, WD[0]);
    }
  }
  for (let y = y0 + 6; y <= y1 - 4; y += 5) {
    px(c, x0, y - 1, WD[4]);
    px(c, x0, y, WD[0]);
    px(c, x1, y - 1, WD[3]);
    px(c, x1, y, WD[0]);
  }
}

/** Le décor fixe : sols, eau, clôtures, arbres, rochers, bâtiments. */
function paintStatic(c: Ctx) {
  const r = mulberry32(7);
  const n1 = noise(11, 9);
  const n2 = noise(23, 4);
  const nz = (x: number, y: number) => n1(x, y) * 0.7 + n2(x, y) * 0.3 - 0.5;

  // sols, pixel par pixel : trois tons par sol, en taches nettes (ombre, ton de base, lumière)
  const patch = (x: number, y: number, [dark, mid, lit]: string[], v: number) => px(c, x, y, v < 0.36 ? dark : v > 0.66 ? lit : mid);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const z = zoneAt(x, y);
      const v = 0.5 + nz(x, y) * 1.25 + (light(x, y) - 0.62) * 0.55;
      if (z === 'banquise') patch(x, y, y - ZONES.banquise[1] < 3 ? [SN[1], SN[1], SN[2]] : [SN[2], SN[3], SN[4]], v);
      else if (z === 'savane') patch(x, y, [SV[2], SV[3], SV[4]], v);
      else if (z === 'foret') patch(x, y, [FO[1], FO[2], FO[3]], v);
      else if (z === 'lagon') patch(x, y, [G[3], G[4], G[5]], v);
      else if (z === 'montagne') patch(x, y, [RK[1], RK[2], RK[3]], v);
      else if (z === 'jungle') patch(x, y, [FO[0], FO[1], FO[2]], v);
      else if (isPlaza(x, y)) {
        const row = Math.floor((y - 173) / 4);
        const joint = (y - 173) % 4 === 3 || (x + (row % 2) * 3) % 6 === 0;
        px(c, x, y, joint ? P[2] : v > 0.72 ? P[4] : P[3]);
      } else if (isPath(x, y)) {
        const edge = !isPath(x - 1, y) || !isPath(x + 1, y) || !isPath(x, y - 1) || !isPath(x, y + 1);
        px(c, x, y, edge ? P[1] : v < 0.32 ? P[2] : v > 0.74 ? P[4] : P[3]);
      } else {
        // herbe ; plus sombre au pied d'une allée ou à droite d'un enclos (ombre de bordure)
        const shade = isPath(x, y - 1) || zoneAt(x - 1, y) !== null || zoneAt(x, y - 1) !== null;
        patch(x, y, shade ? [G[1], G[2], G[2]] : [G[2], G[3], G[4]], v);
      }
    }

  // touffes d'herbe et fleurs hors des enclos et des allées
  const free = (x: number, y: number) => !isPath(x, y) && zoneAt(x, y) === null && x > 0 && x < W - 1;
  for (let k = 0; k < 190; k++) {
    const x = Math.floor(r() * W);
    const y = Math.floor(r() * H);
    if (!free(x, y) || !free(x + 2, y)) continue;
    px(c, x, y, G[1]);
    px(c, x + 1, y - 1, G[2]);
    px(c, x + 2, y, G[1]);
    px(c, x + 1, y - 2, G[5]);
  }
  for (let k = 0; k < 60; k++) {
    const x = Math.floor(r() * W);
    const y = Math.floor(r() * H);
    if (free(x, y)) px(c, x, y, ['#f2c7d8', '#ffe08a', '#f6f1e1', '#b98bff', '#e8866b'][k % 5]);
  }
  // cailloux dans les allées
  for (let k = 0; k < 50; k++) {
    const x = Math.floor(r() * W);
    const y = Math.floor(r() * H);
    if (isPath(x, y) && !isPlaza(x, y) && isPath(x + 1, y)) {
      px(c, x, y, P[1]);
      px(c, x + 1, y, P[4]);
    }
  }

  // eau
  for (const w of WATERS) paintWater(c, w);

  // ——— Banquise ———
  {
    for (const [x, y, w] of [[7, 49, 10], [20, 52, 13], [5, 25, 8], [44, 52, 10]] as const) {
      rect(c, x, y, w, 1, SN[1]);
      rect(c, x + 1, y - 1, w - 2, 1, SN[4]);
    }
    // banquise flottante
    const floe = pond(45, 35, 5.4, 2.8, 0.4);
    for (let y = 30; y <= 40; y++) for (let x = 38; x <= 53; x++) if (floe(x, y) <= 1) px(c, x, y, floe(x, y) > 0.65 ? SN[2] : y < 35 ? SN[4] : SN[3]);
    for (const x of [6, 13, 20]) blit(c, SNOWY_PINE, x, 3 + (x % 3), { shadow: true });
    blit(c, SNOWY_PINE, 47, 5, { shadow: true });
    blit(c, SNOW_ROCK, 29, 11, { shadow: true });
    fence(c, ZONES.banquise);
  }

  // ——— Montagne (à débloquer) ———
  {
    for (const [x, y] of [[74, 30], [96, 36], [112, 22], [84, 12]] as const) blit(c, ROCK, x, y, { shadow: true });
    for (const x of [104, 118]) blit(c, SNOWY_PINE, x, 7, { shadow: true });
  }

  // ——— Forêt ———
  {
    // feuilles mortes
    for (let k = 0; k < 40; k++) {
      const x = 5 + Math.floor(r() * 52);
      const y = 70 + Math.floor(r() * 50);
      px(c, x, y, ['#6b4426', '#8a5a33', '#a8742f'][k % 3]);
    }
    // bambous
    for (let k = 0; k < 8; k++) {
      const x = 7 + k * 2 + (k % 2);
      const top = 76 + ((k * 5) % 7);
      for (let y = top; y < 100; y++) px(c, x, y, (y - top) % 5 === 4 ? '#4f7a2a' : k % 2 ? '#8ab84e' : '#a6cf62');
      px(c, x - 1, top + 2, '#7bb05c');
      px(c, x + 1, top + 4, '#5f9550');
      px(c, x - 1, top + 8, '#5f9550');
      px(c, x + 1, top + 11, '#7bb05c');
    }
    const trees: [number, number, Sprite][] = [
      [24, 65, TREE], [36, 64, DARK_TREE], [46, 67, TREE], [3, 100, DARK_TREE], [47, 90, DARK_TREE], [29, 106, TREE], [43, 107, DARK_TREE],
    ];
    for (const [x, y, s] of trees) blit(c, s, x, y, { shadow: true });
    blit(c, BUSH, 18, 115, { shadow: true });
    blit(c, BUSH, 5, 115, { shadow: true });
    blit(c, MUSHROOM, 40, 86);
    blit(c, MUSHROOM, 13, 110);
    fence(c, ZONES.foret);
  }

  // ——— Savane ———
  {
    for (let k = 0; k < 26; k++) {
      const x = 72 + Math.floor(r() * 52);
      const y = 70 + Math.floor(r() * 48);
      px(c, x, y, SV[1]);
      px(c, x + 1, y - 1, SV[4]);
    }
    blit(c, ACACIA, 110, 68, { shadow: true });
    blit(c, MOUND, 98, 72, { shadow: true });
    blit(c, DRY_BUSH, 121, 90, { shadow: true });
    blit(c, DRY_BUSH, 90, 115, { shadow: true });
    blit(c, BIG_ROCK, 71, 96, { shadow: true });
    fence(c, ZONES.savane);
  }

  // ——— Lagon ———
  {
    for (const x of [6, 8, 10, 50, 52, 54]) {
      const top = 136 + (x % 4);
      for (let y = top; y < top + 7; y++) px(c, x, y, y === top ? '#7bb05c' : '#4f7a2a');
      rect(c, x, top - 2, 1, 2, '#8a5a33');
    }
    for (const [x, y] of [[22, 142], [44, 152], [27, 157], [40, 140]] as const) {
      rect(c, x, y, 3, 1, '#4f8a45');
      px(c, x + 1, y - 1, '#5f9550');
      if ((x + y) % 2) px(c, x + 1, y - 1, '#f2c7d8');
    }
    fence(c, ZONES.lagon);
  }

  // ——— Jungle (à débloquer) ———
  for (const [x, y] of [[72, 133], [86, 139], [100, 132], [114, 139], [78, 149], [106, 149], [117, 151]] as const) blit(c, DARK_TREE, x, y, { shadow: true });

  // ——— entrée ———
  // buvette, avec sa guirlande
  {
    const x0 = 8;
    const y0 = 178;
    c.fillStyle = 'rgba(8, 16, 10, 0.32)';
    c.fillRect(x0 + 3, y0 + 19, 21, 2);
    rect(c, x0 + 1, y0 + 5, 20, 14, WD[2]);
    for (let y = y0 + 7; y < y0 + 19; y += 3) rect(c, x0 + 1, y, 20, 1, WD[1]);
    rect(c, x0 + 1, y0 + 5, 1, 14, WD[3]);
    rect(c, x0 + 4, y0 + 7, 14, 5, '#5a3a1c');
    rect(c, x0 + 4, y0 + 7, 14, 1, '#ffd98a');
    blit(c, person(3, false), x0 + 9, y0 + 7, { outline: false });
    rect(c, x0 + 3, y0 + 12, 16, 2, WD[4]);
    for (let x = 0; x < 22; x++) rect(c, x0 + x, y0, 1, 5, Math.floor(x / 3) % 2 ? '#f4ead2' : '#e8a83c');
    for (let x = 0; x < 22; x += 3) px(c, x0 + x + 1, y0 + 5, Math.floor(x / 3) % 2 ? '#f4ead2' : '#e8a83c');
    rect(c, x0, y0 - 1, 22, 1, WD[1]);
  }
  // portail
  {
    c.fillStyle = 'rgba(8, 16, 10, 0.32)';
    c.fillRect(53, 183, 2, 17);
    c.fillRect(80, 183, 2, 17);
    rect(c, 50, 182, 3, 18, WD[1]);
    rect(c, 50, 182, 1, 18, WD[3]);
    rect(c, 77, 182, 3, 18, WD[1]);
    rect(c, 77, 182, 1, 18, WD[3]);
    rect(c, 46, 177, 38, 6, WD[0]);
    rect(c, 47, 178, 36, 4, '#d9a441');
    rect(c, 47, 178, 36, 1, '#f0c766');
    rect(c, 47, 181, 36, 1, '#b07a26');
    blit(c, { rows: ['.K.K.', 'K...K', '.KKK.', '.KKK.'], pal: { K: '#6b3d1f' } }, 63, 178, { outline: false });
  }
  blit(c, BENCH, 100, 178, { shadow: true });
  blit(c, BENCH, 110, 187, { shadow: true });
  blit(c, TREE, 117, 172, { shadow: true });
  blit(c, TREE, 95, 186, { shadow: true });
  blit(c, BUSH, 32, 191, { shadow: true });
  blit(c, BUSH, 90, 196, { shadow: true });
  for (let k = 0; k < 14; k++) px(c, 101 + (k % 7) * 2, 196 + Math.floor(k / 7) * 2, ['#f2c7d8', '#ffe08a', '#e8866b'][k % 3]);
  for (const [x, y] of LAMPS) blit(c, LAMP, x, y, { shadow: true });
}

const LAMPS: [number, number][] = [
  [44, 186],
  [83, 186],
  [58, 49],
  [68, 115],
  [58, 159],
];

// ——— la vie ———

interface Walker {
  a: [number, number];
  b: [number, number];
  speed: number;
  phase: number;
}

const WALKERS: Walker[] = [
  { a: [62, 2], b: [62, 52], speed: 5, phase: 0 },
  { a: [65, 20], b: [65, 118], speed: 4, phase: 3 },
  { a: [63, 70], b: [63, 160], speed: 5, phase: 9 },
  { a: [66, 130], b: [66, 165], speed: 3.5, phase: 2 },
  { a: [2, 58], b: [56, 58], speed: 4, phase: 1 },
  { a: [20, 59], b: [124, 59], speed: 5, phase: 14 },
  { a: [76, 58], b: [126, 58], speed: 3.5, phase: 6 },
  { a: [4, 124], b: [58, 124], speed: 4.5, phase: 4 },
  { a: [70, 125], b: [125, 125], speed: 4, phase: 11 },
  { a: [30, 124], b: [100, 124], speed: 5.5, phase: 7 },
  { a: [4, 167], b: [124, 167], speed: 5, phase: 5 },
  { a: [96, 168], b: [126, 168], speed: 3, phase: 0 },
  { a: [56, 174], b: [56, 194], speed: 3, phase: 2 },
  { a: [72, 174], b: [72, 194], speed: 3.5, phase: 6 },
  { a: [40, 176], b: [90, 176], speed: 4, phase: 3 },
];

/** Animaux : position, sprite, sens et façon de bouger. */
const ANIMALS: { s: Sprite; x: number; y: number; flip?: boolean; move?: 'bob' | 'hop' | 'turn' | 'swim' | 'none'; ph?: number }[] = [
  { s: POLAR_BEAR, x: 7, y: 30, move: 'turn', ph: 0 },
  { s: SEAL, x: 40, y: 30, move: 'bob', ph: 1 },
  { s: PENGUIN, x: 19, y: 42, move: 'hop', ph: 0 },
  { s: PENGUIN, x: 27, y: 46, move: 'hop', ph: 0.7 },
  { s: PENGUIN, x: 35, y: 45, flip: true, move: 'hop', ph: 1.4 },
  { s: PANDA, x: 20, y: 90, move: 'bob', ph: 0.5 },
  { s: FOX, x: 33, y: 85, flip: true, move: 'turn', ph: 2 },
  { s: LION, x: LION_AT[0], y: LION_AT[1], move: 'bob', ph: 0 },
  { s: ZEBRA, x: 94, y: 86, flip: true, move: 'turn', ph: 1 },
  { s: GIRAFFE, x: 110, y: 77, flip: true, move: 'bob', ph: 2 },
  { s: ELEPHANT, x: 88, y: 100, move: 'bob', ph: 1.2 },
  { s: ZEBRA, x: 115, y: 103, flip: true, move: 'turn', ph: 3 },
  { s: FLAMINGO, x: 10, y: 136, move: 'bob', ph: 0 },
  { s: FLAMINGO, x: 16, y: 140, flip: true, move: 'bob', ph: 1 },
  { s: FLAMINGO, x: 9, y: 148, move: 'bob', ph: 2 },
  { s: HIPPO, x: 31, y: 143, move: 'swim', ph: 0 },
  { s: CROCODILE, x: 35, y: 158, flip: true, move: 'none' },
];

const GAINS: [number, number, number][] = [
  [31, 20, 18],
  [23, 79, 12],
  [73, 110, 24],
  [26, 133, 9],
];

const FIREFLIES: [number, number][] = [
  [12, 72], [30, 80], [50, 100], [20, 108], [40, 118], [52, 74],
  [14, 160], [48, 146], [56, 136],
  [30, 180], [100, 184], [120, 196], [6, 196], [92, 172],
];

const PUFFS = (() => {
  const r = mulberry32(5);
  return (['montagne', 'jungle'] as const).flatMap((z) =>
    Array.from({ length: 11 }, () => ({ z, x: r(), y: r(), s: 4 + r() * 6, v: 0.6 + r() * 0.8 })),
  );
})();

let base: HTMLCanvasElement | null = null;

/** Dessine la réserve à l'instant t (en secondes). */
export function drawReserve(c: Ctx, t = 0) {
  c.imageSmoothingEnabled = false;
  if (!base) {
    base = document.createElement('canvas');
    base.width = W;
    base.height = H;
    paintStatic(base.getContext('2d')!);
  }
  c.globalCompositeOperation = 'source-over';
  c.drawImage(base, 0, 0);

  // reflets qui glissent sur l'eau
  for (const w of WATERS) {
    const [x0, y0, x1, y1] = w.box;
    for (let k = 0; k < 7; k++) {
      const y = y0 + 2 + ((k * 5) % Math.max(1, y1 - y0 - 3));
      const len = 2 + (k % 3);
      const span = x1 - x0;
      const x = x0 + Math.floor(((k * 13 + t * (2 + (k % 3))) % span + span) % span);
      if (w.d(x, y) < 0.7 && w.d(x + len, y) < 0.7) rect(c, x, y, len, 1, k % 2 ? AQ[5] : AQ[4]);
    }
  }

  // animaux, du fond vers l'avant
  for (const a of [...ANIMALS].sort((p, q) => p.y + p.s.rows.length - (q.y + q.s.rows.length))) {
    const ph = a.ph ?? 0;
    let dy = 0;
    let flip = a.flip ?? false;
    if (a.move === 'bob') dy = Math.sin(t * 2 + ph) > 0.6 ? -1 : 0;
    if (a.move === 'hop') dy = Math.max(0, Math.sin(t * 5 + ph * 2)) > 0.8 ? -1 : 0;
    if (a.move === 'turn') flip = Math.floor(t / 2.5 + ph) % 2 ? !flip : flip;
    if (a.move === 'swim') dy = Math.sin(t * 1.4 + ph) > 0.3 ? 0 : 1;
    const water = a.move === 'swim';
    blit(c, a.s, a.x, a.y + dy, { flip, shadow: !water && a.s !== SEAL && a.s !== FLAMINGO });
    if (water) {
      // l'hippopotame à moitié dans l'eau
      rect(c, a.x, a.y + 4, a.s.rows[0].length + 1, 1, AQ[3]);
      rect(c, a.x + 2, a.y + 5, a.s.rows[0].length - 2, 1, AQ[2]);
    }
  }

  // gains qui flottent au-dessus des enclos
  for (const [x, y, n] of GAINS) {
    const dy = Math.round(Math.sin(t * 2.2 + x) * 1);
    blit(c, COIN, x, y + dy);
    blit(c, text(`+${n}`, '#ffe08a'), x + 7, y + dy);
  }

  // visiteurs qui se promènent
  WALKERS.forEach((w, k) => {
    const dx = w.b[0] - w.a[0];
    const dyy = w.b[1] - w.a[1];
    const len = Math.hypot(dx, dyy);
    const d = (t * w.speed + w.phase * 7) % (len * 2);
    const back = d > len;
    const f = back ? 2 - d / len : d / len;
    const x = Math.round(w.a[0] + dx * f) - 1;
    const y = Math.round(w.a[1] + dyy * f) - 4;
    const step = Math.floor(t * 4 + k) % 2 === 0;
    c.fillStyle = 'rgba(8, 16, 10, 0.3)';
    c.fillRect(x + 1, y + 5, 3, 1);
    blit(c, person(k, step), x, y, { flip: back, outline: 'rgba(30, 24, 16, 0.75)' });
  });

  // brume qui dérive sur les parcelles à débloquer
  for (const id of ['montagne', 'jungle'] as const) {
    const [x0, y0, x1, y1] = ZONES[id];
    c.fillStyle = 'rgba(214, 222, 208, 0.62)';
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (inZone(x, y, ZONES[id])) c.fillRect(x, y, 1, 1);
    for (const p of PUFFS.filter((q) => q.z === id)) {
      const wdt = x1 - x0;
      const cx = x0 + ((p.x * wdt + t * p.v * 2) % wdt);
      const cy = y0 + p.y * (y1 - y0);
      for (let y = Math.floor(cy - p.s); y <= cy + p.s; y++)
        for (let x = Math.floor(cx - p.s * 1.7); x <= cx + p.s * 1.7; x++) {
          const ddx = (x - cx) / (p.s * 1.7);
          const ddy = (y - cy) / p.s;
          const v = ddx * ddx + ddy * ddy;
          if (v > 1 || !inZone(x, y, ZONES[id])) continue;
          px(c, x, y, v > 0.7 ? 'rgba(239, 232, 214, 0.35)' : 'rgba(250, 247, 238, 0.6)');
        }
    }
    // piquets et corde
    for (let x = x0 + 2; x <= x1 - 2; x += 2) {
      px(c, x, y0, '#c9b48a');
      px(c, x, y1, '#c9b48a');
    }
    for (let y = y0 + 2; y <= y1 - 2; y += 2) {
      px(c, x0, y, '#c9b48a');
      px(c, x1, y, '#c9b48a');
    }
    blit(c, PADLOCK, Math.round((x0 + x1) / 2 - 3), Math.round((y0 + y1) / 2 - 10));
  }

  // le lion sélectionné
  blit(c, ARROW, LION_AT[0] + 9, LION_AT[1] - 7 + (Math.sin(t * 4) > 0 ? -1 : 0));

  // ——— lumière de fin de journée ———
  // teinte chaude en haut, plus froide et plus sombre en bas
  c.globalCompositeOperation = 'multiply';
  const tint = c.createLinearGradient(0, 0, 0, H);
  tint.addColorStop(0, '#fff3e2');
  tint.addColorStop(0.55, '#f6ecdc');
  tint.addColorStop(1, '#d4d8cc');
  c.fillStyle = tint;
  c.fillRect(0, 0, W, H);
  // soleil bas, en haut à gauche
  c.globalCompositeOperation = 'soft-light';
  const sun = c.createRadialGradient(0, 0, 0, 0, 0, 170);
  sun.addColorStop(0, 'rgba(255, 196, 120, 0.55)');
  sun.addColorStop(1, 'rgba(255, 196, 120, 0)');
  c.fillStyle = sun;
  c.fillRect(0, 0, W, H);
  // halos des lampes et de la buvette
  c.globalCompositeOperation = 'lighter';
  const glow = (x: number, y: number, rad: number, a: number) => {
    const g = c.createRadialGradient(x, y, 0, x, y, rad);
    g.addColorStop(0, `rgba(255, 196, 110, ${a})`);
    g.addColorStop(1, 'rgba(255, 196, 110, 0)');
    c.fillStyle = g;
    c.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  };
  LAMPS.forEach(([x, y], k) => glow(x + 1.5, y + 2, 11, 0.32 + 0.05 * Math.sin(t * 7 + k * 2)));
  glow(19, 186, 14, 0.22);
  // guirlande de la buvette
  c.globalCompositeOperation = 'source-over';
  for (let k = 0; k < 6; k++) {
    const on = Math.floor(t * 2 + k) % 3 !== 0;
    px(c, 10 + k * 4, 176 + (k % 2), on ? '#ffe9a8' : '#a8741f');
  }
  // lucioles
  FIREFLIES.forEach(([x0, y0], k) => {
    const b = Math.sin(t * 2.1 + k * 1.7);
    if (b < 0.1) return;
    const x = Math.round(x0 + Math.sin(t * 0.7 + k) * 2);
    const y = Math.round(y0 + Math.cos(t * 0.9 + k * 2) * 2);
    c.fillStyle = `rgba(214, 240, 140, ${0.25 * b})`;
    c.fillRect(x - 1, y, 3, 1);
    c.fillRect(x, y - 1, 1, 3);
    c.fillStyle = `rgba(244, 255, 190, ${b})`;
    c.fillRect(x, y, 1, 1);
  });
  // fondu vers le vert sombre du jeu, en haut et en bas
  const fade = (y0: number, y1: number, from: number, to: number) => {
    const g = c.createLinearGradient(0, y0, 0, y1);
    g.addColorStop(0, `rgba(14, 23, 18, ${from})`);
    g.addColorStop(1, `rgba(14, 23, 18, ${to})`);
    c.fillStyle = g;
    c.fillRect(0, y0, W, y1 - y0);
  };
  fade(0, 8, 0.55, 0);
  fade(H - 10, H, 0, 0.6);
  const side = c.createLinearGradient(0, 0, W, 0);
  side.addColorStop(0, 'rgba(14, 23, 18, 0.3)');
  side.addColorStop(0.06, 'rgba(14, 23, 18, 0)');
  side.addColorStop(0.94, 'rgba(14, 23, 18, 0)');
  side.addColorStop(1, 'rgba(14, 23, 18, 0.3)');
  c.fillStyle = side;
  c.fillRect(0, 0, W, H);
}
