import { mix } from './kit';
import { blit, type Sprite } from './reserve-sprites';
import type { ExpeditionDef } from '../engine/reserve';

// Le chemin d'une expédition, en pixel art, dans la palette de la réserve : l'animal marche vers la droite pendant
// que le paysage défile (prairie pour une balade, forêt pour une exploration, montagnes pour une grande expédition) ;
// sa position sur le chemin montre où il en est, jusqu'au drapeau de l'arrivée. De retour, il saute de joie à côté
// d'un coffre qui brille. Toile de TRAIL_W × TRAIL_H pixels, agrandie sans lissage.

export const TRAIL_W = 120;
export const TRAIL_H = 34;
const GROUND_Y = 27;

type Ctx = CanvasRenderingContext2D;
type Kind = ExpeditionDef['id'];

interface Theme {
  sky: [string, string];
  far: string;
  farTop: string;
  mid: string;
  midDark: string;
  ground: [string, string];
  path: string;
}

const THEMES: Record<Kind, Theme> = {
  // prairie au soleil couchant
  balade: { sky: ['#f6c98e', '#fbe6c0'], far: '#9cbf72', farTop: '#b9d48a', mid: '#5f9550', midDark: '#417543', ground: ['#548848', '#3d6f3d'], path: '#dcc697' },
  // sous-bois
  exploration: { sky: ['#9fcfc0', '#d8efd8'], far: '#3d6f3d', farTop: '#548848', mid: '#24492b', midDark: '#1b3a23', ground: ['#2f5a34', '#24452b'], path: '#c2a878' },
  // haute montagne, ciel rose du soir
  grande: { sky: ['#8e9fd0', '#f2c7d8'], far: '#6a6f9a', farTop: '#eef2ee', mid: '#3b3360', midDark: '#2c2648', ground: ['#7aa65a', '#548848'], path: '#efe3bf' },
};

const FLAG: Sprite = { rows: ['kRR', 'kRRR', 'kRR', 'k', 'k', 'k', 'k', 'k'], pal: { k: '#5e3b20', R: '#e8586b' } };
const FLAG_WAVE: Sprite = { rows: ['kRRR', 'kRR', 'kRRR', 'k', 'k', 'k', 'k', 'k'], pal: { k: '#5e3b20', R: '#e8586b' } };
const CHEST: Sprite = {
  rows: ['.hHHHHHh.', 'hHHGGGHHd', 'dddGKGddd', 'WwwwGwwwW', 'WwwwwwwwW', 'WWWWWWWWW'],
  pal: { h: '#b9824c', H: '#8a5a33', d: '#5e3b20', G: '#ffd36b', K: '#6b4426', W: '#5e3b20', w: '#8a5a33' },
};
const PINE: Sprite = { rows: ['..n..', '.nNn.', '.nNn.', 'nNNNn', 'nNNNn', '..t..'], pal: { n: '#1b3a23', N: '#2f5c34', t: '#3a2414' } };
const ROUND_TREE: Sprite = { rows: ['.hll.', 'hllmm', 'lllmm', '.mmm.', '..t..', '..t..'], pal: { h: '#8fbf6a', l: '#5f9550', m: '#417543', t: '#6b4426' } };
const ROCK: Sprite = { rows: ['.hR.', 'hRRr', 'RRrr'], pal: { h: '#cfcdb8', R: '#a8a796', r: '#7f8076' } };
const TUFT: Sprite = { rows: ['g.g', '.g.'], pal: { g: '#7aa65a' } };

const rect = (c: Ctx, x: number, y: number, w: number, h: number, col: string) => {
  c.fillStyle = col;
  c.fillRect(Math.round(x), Math.round(y), w, h);
};

/** Pseudo-hasard stable pour un nombre entier. */
const hash = (n: number) => {
  const v = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return v - Math.floor(v);
};

/** Une rangée de collines (ou de sommets) qui défile, en boucle. */
function ridge(c: Ctx, theme: Theme, kind: Kind, shift: number) {
  for (let x = 0; x < TRAIL_W; x++) {
    const u = x + shift;
    let h: number;
    if (kind === 'grande') {
      // sommets en dents de scie, coiffés de neige
      const period = 26;
      const k = Math.floor(u / period);
      const p = (((u % period) + period) % period) / period;
      const peak = 9 + hash(k) * 8;
      h = peak * (1 - Math.abs(p - 0.5) * 2) + 3;
      const top = GROUND_Y - 6 - h;
      rect(c, x, top, 1, h + 6, theme.far);
      if (h > 7) rect(c, x, top, 1, Math.min(3, h - 7), theme.farTop);
    } else {
      h = 6 + Math.sin(u / 9) * 2.5 + Math.sin(u / 4.3) * 1.2;
      const top = GROUND_Y - 4 - h;
      rect(c, x, top, 1, h + 4, theme.far);
      rect(c, x, top, 1, 1, theme.farTop);
    }
  }
}

/** Arbres, rochers et touffes du premier plan, qui défilent plus vite. */
function props(c: Ctx, kind: Kind, shift: number) {
  const step = kind === 'exploration' ? 11 : 17;
  const first = Math.floor(shift / step) - 1;
  for (let k = first; k < first + TRAIL_W / step + 3; k++) {
    const x = k * step - shift + Math.floor(hash(k + 7) * 6);
    const r = hash(k);
    if (kind === 'exploration') blit(c, r > 0.3 ? PINE : ROUND_TREE, x, GROUND_Y - 6 - Math.floor(hash(k + 3) * 2));
    else if (kind === 'balade') {
      if (r > 0.55) blit(c, ROUND_TREE, x, GROUND_Y - 6);
      else blit(c, TUFT, x, GROUND_Y - 1, { outline: false });
    } else if (r > 0.5) blit(c, ROCK, x, GROUND_Y - 3);
    else blit(c, TUFT, x, GROUND_Y - 1, { outline: false });
  }
}

/**
 * Dessine le chemin à l'instant `t` (secondes). `progress` : avancée de l'expédition, de 0 à 1 ; `back` : l'animal est
 * revenu (il attend qu'on le récupère).
 */
export function drawTrail(c: Ctx, t: number, sprite: Sprite, kind: Kind, progress: number, back: boolean) {
  c.imageSmoothingEnabled = false;
  const theme = THEMES[kind];
  // ciel en dégradé, par bandes de pixels
  for (let y = 0; y < GROUND_Y; y++) rect(c, 0, y, TRAIL_W, 1, mix(theme.sky[0], theme.sky[1], y / GROUND_Y));
  // soleil ou lune
  const sun = kind === 'exploration' ? '#fff6d0' : '#ffe9a8';
  for (let y = -3; y <= 3; y++) for (let x = -3; x <= 3; x++) if (x * x + y * y <= 9) rect(c, 96 + x, 7 + y, 1, 1, sun);
  const walking = !back;
  const speed = walking ? 1 : 0;
  ridge(c, theme, kind, Math.floor(t * 3 * speed));
  // sol et chemin
  rect(c, 0, GROUND_Y, TRAIL_W, TRAIL_H - GROUND_Y, theme.ground[0]);
  rect(c, 0, GROUND_Y + 3, TRAIL_W, TRAIL_H - GROUND_Y - 3, theme.ground[1]);
  rect(c, 0, GROUND_Y + 1, TRAIL_W, 2, theme.path);
  const dash = Math.floor(t * 14 * speed);
  for (let x = -((dash % 6) + 6); x < TRAIL_W; x += 6) rect(c, x, GROUND_Y + 2, 2, 1, mix(theme.path, '#000000', 0.18));
  props(c, kind, Math.floor(t * 9 * speed));

  const w = Math.max(...sprite.rows.map((r) => r.length));
  const h = sprite.rows.length;
  if (walking) {
    // drapeau de l'arrivée, et l'animal qui avance vers lui en trottinant
    blit(c, Math.floor(t * 3) % 2 ? FLAG : FLAG_WAVE, TRAIL_W - 9, GROUND_Y - 7, { outline: false });
    const x = 4 + Math.min(1, Math.max(0, progress)) * (TRAIL_W - 18 - w);
    const bob = Math.floor(t * 6) % 2;
    blit(c, sprite, Math.round(x), GROUND_Y - h + 1 - bob, { shadow: true });
    // petits nuages de poussière derrière lui
    if (Math.floor(t * 6) % 3 === 0) rect(c, x - 2, GROUND_Y, 2, 1, mix(theme.path, '#ffffff', 0.4));
  } else {
    // de retour : un coffre qui brille, et l'animal qui saute de joie à côté
    const cx = TRAIL_W / 2 + 6;
    blit(c, CHEST, cx, GROUND_Y - 5, { shadow: true });
    const jump = Math.max(0, Math.sin(t * 6)) * 4;
    blit(c, sprite, Math.round(cx - w - 4), Math.round(GROUND_Y - h + 1 - jump), { shadow: true });
    for (let k = 0; k < 6; k++) {
      const a = t * 2 + k * 1.05;
      const on = Math.sin(t * 5 + k * 2) > 0.2;
      if (!on) continue;
      const sx = cx + 4 + Math.cos(a) * 9;
      const sy = GROUND_Y - 8 + Math.sin(a) * 5;
      rect(c, sx, sy, 1, 1, '#fff6d0');
      rect(c, sx - 1, sy, 1, 1, 'rgba(255, 211, 107, 0.7)');
      rect(c, sx + 1, sy, 1, 1, 'rgba(255, 211, 107, 0.7)');
    }
  }
}
