import { mix, mulberry32 } from './kit';
import { blit, type Sprite } from './reserve-sprites';
import { ENCLOS, type EnclosId } from '../engine/reserve';

// Le plan de « Ma Réserve » en pixel art, dans la palette du jeu à l'heure dorée (voir aussi la maquette
// promo/reserve-pixel.ts) : 8 enclos sur deux colonnes, reliés par des allées, l'entrée et sa billetterie en bas.
// Toile de SCENE_W × SCENE_H pixels, agrandie sans lissage. Le décor fixe (sols, clôtures, arbres) est peint une
// fois par état des enclos ouverts ; les animaux, les visiteurs, l'eau, la brume et les lumières à chaque image.

export const SCENE_W = 130;
const ZONE_H = 50;
const ROW = 58;
export const SCENE_H = 3 + ROW * 4 + 30;

type Ctx = CanvasRenderingContext2D;
type Box = readonly [number, number, number, number];

/** Place de chaque enclos sur le plan : deux colonnes, quatre rangées, dans l'ordre où on les débloque. */
export const ZONE_BOX: Record<EnclosId, Box> = Object.fromEntries(
  ENCLOS.map((e, i) => {
    const top = 3 + Math.floor(i / 2) * ROW;
    return [e.id, i % 2 ? [70, top, 127, top + ZONE_H - 1] : [3, top, 58, top + ZONE_H - 1]];
  }),
) as unknown as Record<EnclosId, Box>;

const PATH_ROWS = [0, 1, 2, 3].map((r) => 3 + r * ROW + ZONE_H + 1);
const PLAZA_Y = PATH_ROWS[3] + 6;

// ——— palette ———
const G = ['#1a3322', '#24452b', '#2f5a34', '#3d6f3d', '#548848', '#7aa65a'];
const P = ['#6b5636', '#9a8058', '#c2a878', '#dcc697', '#efe3bf'];
const WD = ['#3a2414', '#5e3b20', '#8a5a33', '#b9824c', '#e0ad62'];
const AQ = ['#0f2d3d', '#174a5e', '#23697c', '#3f8e9c', '#86bccb', '#d8f0ee'];
const SN = ['#7f97ad', '#a9bfd0', '#cfdde6', '#eef2ee', '#ffffff'];
const SV = ['#6e4f22', '#9c7533', '#c49a49', '#dbb767', '#efd690'];
const FO = ['#132a1b', '#1b3a23', '#24492b', '#2f5c34', '#3d6f3d'];
const NI = ['#15122a', '#211c3a', '#2c2648', '#3b3360'];

const GROUND: Record<EnclosId, string[]> = {
  foret: [FO[1], FO[2], FO[3]],
  savane: [SV[2], SV[3], SV[4]],
  ferme: [G[3], G[4], G[5]],
  marais: [G[3], G[4], G[5]],
  banquise: [SN[2], SN[3], SN[4]],
  jungle: [FO[0], FO[1], FO[2]],
  aquarium: [AQ[1], AQ[2], AQ[3]],
  montagne: [NI[1], NI[2], NI[3]],
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
const PALM: Sprite = {
  rows: ['..ll...ll..', '.lLLl.lLLl.', 'lL..lLl..Ll', '.....T.....', '....lTl....', '...l.T.l...', '.....T.....', '.....T.....', '.....T.....', '....tTt....'],
  pal: { l: '#3f8a45', L: '#6ab05a', T: '#8a6a3a', t: '#5a4226' },
};
const ROCK: Sprite = { rows: ['..hhh..', '.hRRRr.', 'hRRRRrd', 'RRRrrdd', '.ddddd.'], pal: { h: '#cfcdb8', R: '#a8a796', r: '#7f8076', d: '#585a52' } };
const DARK_ROCK: Sprite = { rows: ROCK.rows, pal: { h: '#5a5478', R: '#433d62', r: '#332e4e', d: '#221e38' } };
const BUSH: Sprite = { rows: ['.hll..', 'hllmm.', 'lmmmmd', '.dddd.'], pal: { h: '#8fbf6a', l: '#5f9550', m: '#417543', d: '#2a5532' } };
const DRY_BUSH: Sprite = { rows: BUSH.rows, pal: { h: '#c9c06a', l: '#a39a4c', m: '#7f7a38', d: '#5c5a2a' } };
const MUSHROOM: Sprite = { rows: ['.RR.', 'RwRR', '.ss.'], pal: { R: '#d9553a', w: '#f6efe0', s: '#efe3bf' } };
const HAY: Sprite = { rows: ['.hhhh.', 'hHHHHd', 'HhHHhd', 'Hdddd.'], pal: { h: '#f2d27a', H: '#d9b04a', d: '#a8802a' } };
const BARN: Sprite = {
  rows: ['....rrrrrr....', '..rrRRRRRRrr..', '.rRRRRRRRRRRr.', 'rrrrrrrrrrrrrr', '.WwwwwwwwwwwW.', '.WwwwddddwwwW.', '.WwwwdWWdwwwW.', '.WwwwdddWwwwW.', '.WwwwdWWdwwwW.', '.WwwwddddwwwW.'],
  pal: { r: '#5a2a1e', R: '#7a3a28', W: '#f1e6cc', w: '#b8402e', d: '#f1e6cc' },
};
const SEAWEED: Sprite = { rows: ['.g.', 'g..', '.g.', '..g', '.g.', 'g..', '.G.'], pal: { g: '#3f9a6a', G: '#2a6a4a' } };
const PADLOCK: Sprite = {
  rows: ['..ggg..', '.g...G.', '.g...G.', 'hHHHHHd', 'HHHKHHd', 'HHHKHHd', 'Hddddd.'],
  pal: { g: '#b9b9ae', G: '#8f8f86', h: '#ffe08a', H: '#e0a83f', d: '#a8741f', K: '#3a2508' },
};
const COIN: Sprite = { rows: ['.hHH.', 'hlHHd', 'hHHHd', 'HHHdd', '.ddd.'], pal: { h: '#ffe08a', H: '#e3ab3f', l: '#fff6d0', d: '#a8741f' } };
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
    for (let j = 0; j < 5; j++) rows[j] += (k ? '.' : '') + (FONT[ch] ?? FONT['0'])[j].replace(/1/g, 'X').replace(/0/g, '.');
  });
  return { rows, pal: { X: col } };
}

const SHIRTS = ['#e8866b', '#86bccb', '#d9a441', '#a9cf7e', '#b98bff', '#f2c7d8', '#efe8d6', '#5d8fd8'];
const HAIRS = ['#2a2318', '#6b4426', '#c99a4b', '#3a2a1c', '#8a5a33'];
const SKINS = ['#f1c9a5', '#d6a27a', '#a8714a', '#7a4f32'];
function person(k: number, step: boolean): Sprite {
  return { rows: ['.h.', '.f.', 'sss', '.s.', step ? '.l.' : 'l.l'], pal: { h: HAIRS[k % 5], f: SKINS[(k * 3) % 4], s: SHIRTS[(k * 5) % 8], l: '#3b3a45' } };
}

// ——— outils ———
const px = (c: Ctx, x: number, y: number, col: string) => {
  c.fillStyle = col;
  c.fillRect(x, y, 1, 1);
};
const rect = (c: Ctx, x: number, y: number, w: number, h: number, col: string) => {
  c.fillStyle = col;
  c.fillRect(x, y, w, h);
};

function noise(seed: number, cell: number) {
  const r = mulberry32(seed);
  const gw = Math.ceil(SCENE_W / cell) + 2;
  const gh = Math.ceil(SCENE_H / cell) + 2;
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
    const cc = g[(iy + 1) * gw + ix];
    const d = g[(iy + 1) * gw + ix + 1];
    return a + (b - a) * sx + (cc - a) * sy + (a - b - cc + d) * sx * sy;
  };
}
const light = (x: number, y: number) => 1 - (x / SCENE_W) * 0.4 - (y / SCENE_H) * 0.35;

function inBox(x: number, y: number, [x0, y0, x1, y1]: Box, r = 3) {
  if (x < x0 || x > x1 || y < y0 || y > y1) return false;
  const dx = x < x0 + r ? x0 + r - x : x > x1 - r ? x - (x1 - r) : 0;
  const dy = y < y0 + r ? y0 + r - y : y > y1 - r ? y - (y1 - r) : 0;
  return dx * dx + dy * dy <= r * r;
}
const isPlaza = (x: number, y: number) => x >= 38 && x <= 91 && y >= PLAZA_Y;
const isPath = (x: number, y: number) => (x >= 61 && x <= 67 && y < PLAZA_Y) || PATH_ROWS.some((py) => y >= py && y <= py + 5) || isPlaza(x, y);
function zoneAt(x: number, y: number): EnclosId | null {
  for (const e of ENCLOS) if (inBox(x, y, ZONE_BOX[e.id])) return e.id;
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
  rim: [string, string];
}
function paintWater(c: Ctx, w: Water) {
  const [x0, y0, x1, y1] = w.box;
  for (let y = y0; y <= y1; y++)
    for (let x = x0; x <= x1; x++) {
      const v = w.d(x, y);
      if (v <= 1) px(c, x, y, v < 0.42 ? AQ[1] : v < 0.78 ? AQ[2] : v < 0.93 ? AQ[3] : AQ[4]);
      else if (v <= 1.2) px(c, x, y, v < 1.1 ? w.rim[1] : w.rim[0]);
    }
}

function fence(c: Ctx, [x0, y0, x1, y1]: Box, glass = false) {
  const [hi, mid, lo, post, dark] = glass ? ['#d8f0ee', '#86bccb', '#3f8e9c', '#efffff', '#23697c'] : [WD[3], WD[2], WD[1], WD[4], WD[0]];
  c.fillStyle = 'rgba(8, 16, 10, 0.32)';
  c.fillRect(x0 + 3, y0 + 1, x1 - x0 - 5, 2);
  c.fillRect(x1 + 1, y0 + 3, 1, y1 - y0 - 3);
  c.fillRect(x0 + 3, y1 + 1, x1 - x0 - 4, 1);
  rect(c, x0 + 3, y0 - 1, x1 - x0 - 5, 1, hi);
  rect(c, x0 + 3, y0, x1 - x0 - 5, 1, lo);
  rect(c, x0 + 3, y1 - 1, x1 - x0 - 5, 1, hi);
  rect(c, x0 + 3, y1, x1 - x0 - 5, 1, lo);
  rect(c, x0, y0 + 3, 1, y1 - y0 - 5, mid);
  rect(c, x1, y0 + 3, 1, y1 - y0 - 5, lo);
  for (const [x, y] of [
    [x0 + 1, y0 + 1], [x0 + 2, y0], [x0, y0 + 2], [x1 - 1, y0 + 1], [x1 - 2, y0], [x1, y0 + 2],
    [x0 + 1, y1 - 1], [x0 + 2, y1], [x0, y1 - 2], [x1 - 1, y1 - 1], [x1 - 2, y1], [x1, y1 - 2],
  ])
    px(c, x, y, mid);
  for (let x = x0 + 4; x <= x1 - 3; x += 5)
    for (const y of [y0, y1]) {
      px(c, x, y - 2, post);
      px(c, x, y - 1, mid);
      px(c, x, y, dark);
    }
  for (let y = y0 + 6; y <= y1 - 4; y += 5) {
    px(c, x0, y - 1, post);
    px(c, x0, y, dark);
    px(c, x1, y - 1, hi);
    px(c, x1, y, dark);
  }
}

// ——— décor de chaque enclos ———
const WATERS: Partial<Record<EnclosId, Water>> = {};
function decor(c: Ctx, id: EnclosId, [x0, y0, x1, y1]: Box) {
  const r = mulberry32(x0 * 31 + y0);
  switch (id) {
    case 'foret':
      for (let k = 0; k < 30; k++) px(c, x0 + 2 + Math.floor(r() * 52), y0 + 4 + Math.floor(r() * 44), ['#6b4426', '#8a5a33', '#a8742f'][k % 3]);
      for (const [dx, s] of [[2, TREE], [13, DARK_TREE], [25, TREE], [38, DARK_TREE], [47, TREE]] as const) blit(c, s, x0 + dx, y0 - 2 + (dx % 3), { shadow: true });
      blit(c, MUSHROOM, x0 + 4, y1 - 6);
      blit(c, BUSH, x1 - 8, y1 - 6, { shadow: true });
      break;
    case 'savane':
      for (let k = 0; k < 18; k++) {
        const x = x0 + 2 + Math.floor(r() * 52);
        const y = y0 + 4 + Math.floor(r() * 44);
        px(c, x, y, SV[1]);
        px(c, x + 1, y - 1, SV[4]);
      }
      blit(c, ACACIA, x1 - 17, y0 - 1, { shadow: true });
      blit(c, ACACIA, x0 + 1, y0 + 1, { shadow: true });
      blit(c, DRY_BUSH, x0 + 22, y0 + 4, { shadow: true });
      WATERS.savane = { d: pond(x1 - 10, y1 - 5, 8, 3.4, 2.1), box: [x1 - 20, y1 - 11, x1 - 1, y1 - 1], rim: [SV[1], SV[2]] };
      paintWater(c, WATERS.savane);
      break;
    case 'ferme':
      blit(c, BARN, x0 + 2, y0 + 1, { shadow: true });
      blit(c, HAY, x0 + 19, y0 + 7, { shadow: true });
      blit(c, HAY, x0 + 26, y0 + 8, { shadow: true });
      blit(c, TREE, x1 - 13, y0 - 2, { shadow: true });
      // potager
      for (let k = 0; k < 4; k++) rect(c, x1 - 22 + k * 3, y1 - 6, 2, 4, k % 2 ? '#7a5230' : '#6b4426');
      for (let k = 0; k < 4; k++) px(c, x1 - 22 + k * 3, y1 - 7, '#7bb05c');
      break;
    case 'marais':
      WATERS.marais = { d: pond(x0 + 30, y0 + 26, 22, 13, 0.7), box: [x0 + 2, y0 + 8, x1 - 1, y1 - 1], rim: [SV[3], SV[4]] };
      paintWater(c, WATERS.marais);
      for (const dx of [3, 5, 7, 49, 51, 53]) {
        const top = y0 + 6 + (dx % 4);
        for (let y = top; y < top + 7; y++) px(c, x0 + dx, y, y === top ? '#7bb05c' : '#4f7a2a');
        rect(c, x0 + dx, top - 2, 1, 2, '#8a5a33');
      }
      for (const [dx, dy] of [[18, 20], [40, 30], [26, 36]] as const) {
        rect(c, x0 + dx, y0 + dy, 3, 1, '#4f8a45');
        px(c, x0 + dx + 1, y0 + dy - 1, '#f2c7d8');
      }
      break;
    case 'banquise':
      for (const [dx, dy, w] of [[4, 44, 10], [18, 47, 12], [40, 45, 10]] as const) {
        rect(c, x0 + dx, y0 + dy, w, 1, SN[1]);
        rect(c, x0 + dx + 1, y0 + dy - 1, w - 2, 1, SN[4]);
      }
      WATERS.banquise = { d: pond(x1 - 14, y0 + 30, 11, 7, 1.3), box: [x1 - 28, y0 + 20, x1 - 1, y0 + 40], rim: [SN[2], SN[4]] };
      paintWater(c, WATERS.banquise);
      for (const dx of [2, 10, 18]) blit(c, SNOWY_PINE, x0 + dx, y0 - 3 + (dx % 3), { shadow: true });
      blit(c, SNOWY_PINE, x1 - 10, y0 - 2, { shadow: true });
      break;
    case 'jungle':
      for (const [dx, s] of [[0, DARK_TREE], [10, PALM], [20, DARK_TREE], [32, PALM], [44, DARK_TREE]] as const) blit(c, s, x0 + dx, y0 - 2 + (dx % 4), { shadow: true });
      // lianes
      for (const dx of [8, 30, 50]) for (let y = y0 + 8; y < y0 + 16; y++) px(c, x0 + dx + (y % 2), y, '#4f8a45');
      for (let k = 0; k < 6; k++) px(c, x0 + 4 + Math.floor(r() * 48), y0 + 20 + Math.floor(r() * 26), ['#e8866b', '#f2c7d8', '#ffe08a'][k % 3]);
      break;
    case 'aquarium':
      // grand bassin : bandes de profondeur, sable au fond, algues et rochers
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (inBox(x, y, [x0, y0, x1, y1])) px(c, x, y, y < y0 + 8 ? AQ[3] : y < y0 + 26 ? AQ[2] : AQ[1]);
      for (let x = x0 + 2; x < x1 - 1; x++) {
        const h = 2 + Math.round(Math.sin(x / 4) + 1);
        rect(c, x, y1 - h, 1, h, x % 3 ? SV[3] : SV[2]);
      }
      for (const dx of [4, 9, 36, 50]) blit(c, SEAWEED, x0 + dx, y1 - 10, { outline: false });
      blit(c, ROCK, x0 + 20, y1 - 7);
      blit(c, ROCK, x1 - 14, y1 - 6);
      break;
    case 'montagne': {
      // la montagne de nuit : sommets enneigés sous la lune, éboulis, sapins sombres et une cascade
      for (let k = 0; k < 12; k++) px(c, x0 + 2 + Math.floor(r() * 52), y0 + 2 + Math.floor(r() * 10), k % 3 ? '#8a84c8' : '#f4f6f0');
      rect(c, x1 - 13, y0 + 3, 4, 4, '#f4f6f0');
      rect(c, x1 - 14, y0 + 4, 6, 2, '#f4f6f0');
      px(c, x1 - 12, y0 + 4, '#c9c6e8');
      const peak = (cx: number, top: number, half: number, body: string, shade: string) => {
        for (let y = top; y <= y0 + 22; y++) {
          const w = Math.round(((y - top) / (y0 + 22 - top)) * half);
          rect(c, cx - w, y, w + 1, 1, body);
          rect(c, cx + 1, y, w, 1, shade);
          if (y - top < 4) {
            rect(c, cx - w, y, w + 1, 1, '#eef2ee');
            rect(c, cx + 1, y, w, 1, '#a9bfd0');
          }
        }
      };
      peak(x0 + 14, y0 + 5, 14, '#4a4f78', '#343a5c');
      peak(x0 + 38, y0 + 2, 17, '#545a86', '#3b4166');
      peak(x0 + 54, y0 + 9, 10, '#4a4f78', '#343a5c');
      // la cascade qui descend des sommets
      for (let y = y0 + 12; y < y0 + 30; y++) px(c, x0 + 30 + (y % 3 === 0 ? 1 : 0), y, y % 2 ? '#d8f0ee' : '#86bccb');
      rect(c, x0 + 26, y0 + 30, 10, 2, '#3f8e9c');
      rect(c, x0 + 27, y0 + 30, 8, 1, '#86bccb');
      for (const dx of [2, 44]) blit(c, SNOWY_PINE, x0 + dx, y0 + 14, { shadow: true });
      blit(c, DARK_ROCK, x0 + 8, y1 - 8);
      blit(c, DARK_ROCK, x1 - 12, y1 - 10);
      blit(c, DARK_ROCK, x0 + 40, y0 + 30);
      break;
    }
  }
}

/** Ce qu'il faut savoir pour dessiner la réserve. */
export interface SceneModel {
  /** enclos ouverts */
  open: Set<EnclosId>;
  /** animaux de chaque enclos (dans l'ordre d'installation) */
  animals: Partial<Record<EnclosId, Sprite[]>>;
  /** visiteurs par heure de chaque enclos (affichés au-dessus) */
  gains: Partial<Record<EnclosId, number>>;
  /** visiteurs par heure de toute la réserve : plus il y en a, plus il y a de monde dans les allées */
  rate: number;
}

const LAMPS: [number, number][] = [
  [44, PLAZA_Y + 10],
  [83, PLAZA_Y + 10],
  ...PATH_ROWS.slice(0, 3).map((py, i): [number, number] => (i % 2 ? [68, py - 8] : [58, py - 8])),
];

function paintStatic(c: Ctx, open: Set<EnclosId>) {
  const r = mulberry32(7);
  const n1 = noise(11, 9);
  const n2 = noise(23, 4);
  const nz = (x: number, y: number) => n1(x, y) * 0.7 + n2(x, y) * 0.3 - 0.5;
  const patch = (x: number, y: number, [dark, mid, lit]: string[], v: number) => px(c, x, y, v < 0.36 ? dark : v > 0.66 ? lit : mid);
  for (let y = 0; y < SCENE_H; y++)
    for (let x = 0; x < SCENE_W; x++) {
      const z = zoneAt(x, y);
      const v = 0.5 + nz(x, y) * 1.25 + (light(x, y) - 0.62) * 0.55;
      if (z) patch(x, y, open.has(z) ? GROUND[z] : GROUND[z].map((col) => mix(col, '#7f8a78', 0.55)), v);
      else if (isPlaza(x, y)) {
        const row = Math.floor((y - PLAZA_Y) / 4);
        const joint = (y - PLAZA_Y) % 4 === 3 || (x + (row % 2) * 3) % 6 === 0;
        px(c, x, y, joint ? P[2] : v > 0.72 ? P[4] : P[3]);
      } else if (isPath(x, y)) {
        const edge = !isPath(x - 1, y) || !isPath(x + 1, y) || !isPath(x, y - 1) || !isPath(x, y + 1);
        px(c, x, y, edge ? P[1] : v < 0.32 ? P[2] : v > 0.74 ? P[4] : P[3]);
      } else {
        const shade = isPath(x, y - 1) || zoneAt(x - 1, y) !== null || zoneAt(x, y - 1) !== null;
        patch(x, y, shade ? [G[1], G[2], G[2]] : [G[2], G[3], G[4]], v);
      }
    }
  const free = (x: number, y: number) => !isPath(x, y) && zoneAt(x, y) === null && x > 0 && x < SCENE_W - 1;
  for (let k = 0; k < 160; k++) {
    const x = Math.floor(r() * SCENE_W);
    const y = Math.floor(r() * SCENE_H);
    if (!free(x, y) || !free(x + 2, y)) continue;
    px(c, x, y, G[1]);
    px(c, x + 1, y - 1, G[2]);
    px(c, x + 2, y, G[1]);
    px(c, x + 1, y - 2, G[5]);
  }
  for (let k = 0; k < 70; k++) {
    const x = Math.floor(r() * SCENE_W);
    const y = Math.floor(r() * SCENE_H);
    if (free(x, y)) px(c, x, y, ['#f2c7d8', '#ffe08a', '#f6f1e1', '#b98bff', '#e8866b'][k % 5]);
  }
  for (const e of ENCLOS) {
    const box = ZONE_BOX[e.id];
    decor(c, e.id, box);
    if (open.has(e.id)) fence(c, box, e.id === 'aquarium');
  }

  // entrée : billetterie, portail, bancs, lampes
  const by = PLAZA_Y + 2;
  {
    const x0 = 8;
    c.fillStyle = 'rgba(8, 16, 10, 0.32)';
    c.fillRect(x0 + 3, by + 19, 21, 2);
    rect(c, x0 + 1, by + 5, 20, 14, WD[2]);
    for (let y = by + 7; y < by + 19; y += 3) rect(c, x0 + 1, y, 20, 1, WD[1]);
    rect(c, x0 + 1, by + 5, 1, 14, WD[3]);
    rect(c, x0 + 4, by + 7, 14, 5, '#5a3a1c');
    rect(c, x0 + 4, by + 7, 14, 1, '#ffd98a');
    blit(c, person(3, false), x0 + 9, by + 7, { outline: false });
    rect(c, x0 + 3, by + 12, 16, 2, WD[4]);
    for (let x = 0; x < 22; x++) rect(c, x0 + x, by, 1, 5, Math.floor(x / 3) % 2 ? '#f4ead2' : '#e8a83c');
    for (let x = 0; x < 22; x += 3) px(c, x0 + x + 1, by + 5, Math.floor(x / 3) % 2 ? '#f4ead2' : '#e8a83c');
    rect(c, x0, by - 1, 22, 1, WD[1]);
    // ticket au-dessus du guichet
    rect(c, x0 + 7, by - 6, 8, 4, '#efe3bf');
    rect(c, x0 + 7, by - 6, 1, 4, '#d9a441');
    rect(c, x0 + 14, by - 6, 1, 4, '#d9a441');
  }
  {
    const gy = by + 2;
    c.fillStyle = 'rgba(8, 16, 10, 0.32)';
    c.fillRect(53, gy + 6, 2, SCENE_H - gy);
    c.fillRect(80, gy + 6, 2, SCENE_H - gy);
    rect(c, 50, gy + 5, 3, SCENE_H - gy, WD[1]);
    rect(c, 50, gy + 5, 1, SCENE_H - gy, WD[3]);
    rect(c, 77, gy + 5, 3, SCENE_H - gy, WD[1]);
    rect(c, 77, gy + 5, 1, SCENE_H - gy, WD[3]);
    rect(c, 46, gy, 38, 6, WD[0]);
    rect(c, 47, gy + 1, 36, 4, '#d9a441');
    rect(c, 47, gy + 1, 36, 1, '#f0c766');
    rect(c, 47, gy + 4, 36, 1, '#b07a26');
    // panneau en bois, comme l'icône
    blit(c, { rows: ['..K..', 'KKKK.', '..KKK', '..K..'], pal: { K: '#6b3d1f' } }, 63, gy + 1, { outline: false });
  }
  blit(c, BENCH, 100, by + 1, { shadow: true });
  blit(c, BENCH, 110, by + 10, { shadow: true });
  blit(c, TREE, 117, by - 6, { shadow: true });
  blit(c, BUSH, 32, by + 16, { shadow: true });
  for (const [x, y] of LAMPS) blit(c, LAMP, x, y, { shadow: true });
}

// les animaux : places dans un enclos (centre bas, relatif à l'enclos), remplies dans cet ordre
const SLOTS: [number, number][] = [
  [12, 30], [30, 32], [46, 29], [20, 45], [38, 46], [6, 44], [52, 44], [28, 22],
];

const PUFFS = (() => {
  const r = mulberry32(5);
  return Array.from({ length: 9 }, () => ({ x: r(), y: r(), s: 4 + r() * 5, v: 0.6 + r() * 0.8 }));
})();

let cache: { key: string; canvas: HTMLCanvasElement } | null = null;

/** Dessine la réserve à l'instant t (secondes). */
export function drawScene(c: Ctx, t: number, model: SceneModel) {
  c.imageSmoothingEnabled = false;
  const key = ENCLOS.map((e) => (model.open.has(e.id) ? '1' : '0')).join('');
  if (!cache || cache.key !== key) {
    const canvas = document.createElement('canvas');
    canvas.width = SCENE_W;
    canvas.height = SCENE_H;
    for (const id of Object.keys(WATERS) as EnclosId[]) delete WATERS[id];
    paintStatic(canvas.getContext('2d')!, model.open);
    cache = { key, canvas };
  }
  c.globalCompositeOperation = 'source-over';
  c.drawImage(cache.canvas, 0, 0);

  // reflets sur l'eau
  for (const w of Object.values(WATERS)) {
    const [x0, y0, x1, y1] = w!.box;
    for (let k = 0; k < 5; k++) {
      const y = y0 + 2 + ((k * 5) % Math.max(1, y1 - y0 - 3));
      const len = 2 + (k % 3);
      const span = x1 - x0;
      const x = x0 + Math.floor((((k * 13 + t * (2 + (k % 3))) % span) + span) % span);
      if (w!.d(x, y) < 0.7 && w!.d(x + len, y) < 0.7) rect(c, x, y, len, 1, k % 2 ? AQ[5] : AQ[4]);
    }
  }

  // animaux et bulles
  for (const e of ENCLOS) {
    if (!model.open.has(e.id)) continue;
    const [x0, y0] = ZONE_BOX[e.id];
    const sprites = model.animals[e.id] ?? [];
    const placed = sprites.map((s, i) => ({ s, i, slot: SLOTS[i % SLOTS.length] })).sort((a, b) => a.slot[1] - b.slot[1]);
    const water = e.id === 'aquarium';
    for (const { s, i, slot } of placed) {
      const w = Math.max(...s.rows.map((row) => row.length));
      const h = s.rows.length;
      const flip = Math.floor(t / (2.5 + (i % 3)) + i) % 2 === 1;
      const bob = water ? Math.round(Math.sin(t * 1.5 + i)) : Math.sin(t * 2 + i * 1.7) > 0.7 ? -1 : 0;
      const sway = water ? Math.round(Math.sin(t * 0.6 + i * 2) * 3) : 0;
      blit(c, s, Math.round(x0 + slot[0] - w / 2 + sway), Math.round(y0 + slot[1] - h + bob), { flip: water ? Math.cos(t * 0.6 + i * 2) < 0 : flip, shadow: !water });
    }
    if (water)
      for (let k = 0; k < 6; k++) {
        const bx = x0 + 6 + ((k * 9) % 46);
        const by = y0 + 46 - ((t * 6 + k * 11) % 40);
        px(c, bx + Math.round(Math.sin(t * 3 + k)), Math.round(by), AQ[5]);
      }
    const gain = model.gains[e.id];
    if (gain) {
      const dy = Math.round(Math.sin(t * 2.2 + x0) * 1);
      blit(c, COIN, x0 + 3, y0 + 3 + dy);
      blit(c, text(`+${gain}`, '#ffe08a'), x0 + 10, y0 + 3 + dy);
    }
  }

  // visiteurs : plus la réserve attire de monde, plus les allées sont pleines
  const crowd = Math.min(22, 3 + Math.floor(model.rate / 12));
  for (let k = 0; k < crowd; k++) {
    const vertical = k % 3 === 0;
    const row = PATH_ROWS[k % 4];
    const len = vertical ? PLAZA_Y - 4 : 120;
    const speed = 3 + (k % 4);
    const d = (t * speed + k * 37) % (len * 2);
    const back = d > len;
    const f = back ? 2 * len - d : d;
    const x = vertical ? 62 + (k % 2) * 3 : 4 + f;
    const y = vertical ? 2 + f : row + 1 + (k % 2) * 2;
    const step = Math.floor(t * 4 + k) % 2 === 0;
    c.fillStyle = 'rgba(8, 16, 10, 0.3)';
    c.fillRect(Math.round(x), Math.round(y) + 5, 3, 1);
    blit(c, person(k, step), Math.round(x) - 1, Math.round(y), { flip: back, outline: 'rgba(30, 24, 16, 0.75)' });
  }

  // brume sur les enclos à débloquer
  for (const e of ENCLOS) {
    if (model.open.has(e.id)) continue;
    const box = ZONE_BOX[e.id];
    const [x0, y0, x1, y1] = box;
    c.fillStyle = 'rgba(214, 222, 208, 0.55)';
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (inBox(x, y, box)) c.fillRect(x, y, 1, 1);
    const wdt = x1 - x0;
    for (const p of PUFFS) {
      const cx = x0 + ((p.x * wdt + t * p.v * 2) % wdt);
      const cy = y0 + p.y * (y1 - y0);
      for (let y = Math.floor(cy - p.s); y <= cy + p.s; y++)
        for (let x = Math.floor(cx - p.s * 1.7); x <= cx + p.s * 1.7; x++) {
          const dx = (x - cx) / (p.s * 1.7);
          const dy = (y - cy) / p.s;
          const v = dx * dx + dy * dy;
          if (v <= 1 && inBox(x, y, box)) px(c, x, y, v > 0.7 ? 'rgba(239, 232, 214, 0.35)' : 'rgba(250, 247, 238, 0.6)');
        }
    }
    for (let x = x0 + 2; x <= x1 - 2; x += 2) {
      px(c, x, y0, '#c9b48a');
      px(c, x, y1, '#c9b48a');
    }
    for (let y = y0 + 2; y <= y1 - 2; y += 2) {
      px(c, x0, y, '#c9b48a');
      px(c, x1, y, '#c9b48a');
    }
    blit(c, PADLOCK, Math.round((x0 + x1) / 2 - 3), y0 + 8);
  }

  // lumière de fin de journée
  c.globalCompositeOperation = 'multiply';
  const tint = c.createLinearGradient(0, 0, 0, SCENE_H);
  tint.addColorStop(0, '#fff3e2');
  tint.addColorStop(0.55, '#f6ecdc');
  tint.addColorStop(1, '#d4d8cc');
  c.fillStyle = tint;
  c.fillRect(0, 0, SCENE_W, SCENE_H);
  c.globalCompositeOperation = 'soft-light';
  const sun = c.createRadialGradient(0, 0, 0, 0, 0, 200);
  sun.addColorStop(0, 'rgba(255, 196, 120, 0.55)');
  sun.addColorStop(1, 'rgba(255, 196, 120, 0)');
  c.fillStyle = sun;
  c.fillRect(0, 0, SCENE_W, SCENE_H);
  c.globalCompositeOperation = 'lighter';
  const glow = (x: number, y: number, rad: number, a: number) => {
    const g = c.createRadialGradient(x, y, 0, x, y, rad);
    g.addColorStop(0, `rgba(255, 196, 110, ${a})`);
    g.addColorStop(1, 'rgba(255, 196, 110, 0)');
    c.fillStyle = g;
    c.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  };
  LAMPS.forEach(([x, y], k) => glow(x + 1.5, y + 2, 11, 0.3 + 0.05 * Math.sin(t * 7 + k * 2)));
  glow(19, PLAZA_Y + 10, 14, 0.22);
  c.globalCompositeOperation = 'source-over';
  // guirlande de la billetterie
  for (let k = 0; k < 6; k++) px(c, 10 + k * 4, PLAZA_Y + (k % 2), Math.floor(t * 2 + k) % 3 !== 0 ? '#ffe9a8' : '#a8741f');
  // lucioles
  for (let k = 0; k < 16; k++) {
    const b = Math.sin(t * 2.1 + k * 1.7);
    if (b < 0.1) continue;
    const x = Math.round(((k * 47) % 124) + 3 + Math.sin(t * 0.7 + k) * 2);
    const y = Math.round(((k * 89) % (SCENE_H - 10)) + 5 + Math.cos(t * 0.9 + k * 2) * 2);
    c.fillStyle = `rgba(214, 240, 140, ${0.25 * b})`;
    c.fillRect(x - 1, y, 3, 1);
    c.fillRect(x, y - 1, 1, 3);
    c.fillStyle = `rgba(244, 255, 190, ${b})`;
    c.fillRect(x, y, 1, 1);
  }
  const fade = (y0: number, y1: number, from: number, to: number) => {
    const g = c.createLinearGradient(0, y0, 0, y1);
    g.addColorStop(0, `rgba(14, 23, 18, ${from})`);
    g.addColorStop(1, `rgba(14, 23, 18, ${to})`);
    c.fillStyle = g;
    c.fillRect(0, y0, SCENE_W, y1 - y0);
  };
  fade(0, 6, 0.45, 0);
  fade(SCENE_H - 8, SCENE_H, 0, 0.55);
}
