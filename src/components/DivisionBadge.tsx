import { divisionInfo, type DivisionTier } from '../engine/divisions';

// Blasons des divisions de la Ligue des naturalistes, à plat comme les boutons d'ouverture : un rond pastel uni, un filet
// vert sombre, l'animal de la division en silhouette à l'encre et une à trois étoiles dessous. La couleur change avec
// le métal (bronze, argent, or, platine, diamant, légende).
// Repère : le rond est un cercle de rayon 50 centré en (0, 0).

export const DIVISION_PASTELS: Record<DivisionTier, string> = {
  bronze: '#eebf98',
  argent: '#d3dce6',
  or: '#f3d98a',
  platine: '#b9e3e3',
  diamant: '#d5c8f4',
  legende: '#f6ad97',
};
const INK = '#1c3124';
const CREAM = '#fff8ec';

type Pt = [number, number];
const pts = (list: Pt[]) => list.map(([x, y]) => `${x.toFixed(2)} ${y.toFixed(2)}`).join(' L');
const polygon = (list: Pt[]) => `M${pts(list)}Z`;
/** Polygone symétrique : on donne la moitié droite, de haut en bas (x ≥ 0), la gauche est le miroir. */
const mirrored = (half: Pt[]) => polygon([...half, ...half.slice().reverse().map(([x, y]): Pt => [-x, y])]);
const both = (half: Pt[]) => polygon(half) + polygon(half.map(([x, y]): Pt => [-x, y]));

// ───────────── les emblèmes : têtes géométriques, de face (de profil pour l'aigle, l'orque et le hérisson) ─────────────
// Trois tons à plat : l'encre (la silhouette), la crème (la face, le ventre) et le pastel du rond pour les yeux, le nez et les rayures.

interface Emblem {
  light?: string;
  mid?: string;
  dark?: string;
}

const EMBLEMS: Record<string, Emblem> = {
  // hérisson de profil : un dôme de piquants, la face claire et le museau pointu, deux petites pattes
  herisson: {
    mid:
      polygon([
        [-23, 8],
        ...Array.from({ length: 19 }, (_, k): Pt => {
          const a = Math.PI * (1.03 + (k / 18) * 0.8);
          const r = k % 2 ? 17 : 23;
          return [-3 + Math.cos(a) * r * 1.08, 7 + Math.sin(a) * r];
        }),
        [8, 8],
      ]) +
      polygon([[-12, 8], [-11, 14], [-7, 14], [-7, 8]]) +
      polygon([[5, 8], [6, 14], [10, 14], [10, 8]]),
    light: 'M5 -9C11 -9.5 17 -4 24 1.5C25.6 2.8 25.4 5 23.5 5.4C17 6.8 12 10 4 10.2L-18 10.2C-20.6 10.2 -22.4 9 -23 7.6C-12 7.6 -3 5 0.6 -1C2 -4 3 -7 5 -9Z',
    dark: 'M22.4 3.4a2 2 0 1 0 4 0a2 2 0 1 0-4 0Z M11.2 -0.8a1.6 1.6 0 1 0 3.2 0a1.6 1.6 0 1 0-3.2 0Z',
  },
  // renard : grandes oreilles, museau fin, joues blanches
  'renard-roux': {
    mid: mirrored([[0, -8], [6, -10], [13, -23], [16, -6], [19, 2], [11, 8], [4, 15], [0, 18]]),
    light: both([[0, 2], [11, 0], [17, 3], [10, 9], [3, 15], [0, 17]]),
    dark: both([[8, -12], [12.5, -20], [13.5, -9]]) + both([[4, -3], [9, -4], [7, -1.5]]) + mirrored([[0, 14.5], [2.6, 14.5], [0, 18.5]]),
  },
  // loup : oreilles dressées, collerette de fourrure, long museau
  loup: {
    mid: mirrored([[0, -11], [6, -12], [11, -24], [15, -10], [21, -4], [17, 2], [19, 8], [11, 9], [6, 13], [3, 19], [0, 20]]),
    light: mirrored([[0, -6], [5, -4], [9, 2], [6, 10], [3, 18], [0, 19]]),
    dark: both([[8.5, -13], [11, -20], [13, -11]]) + both([[3.5, -2], [9.5, -4], [7.5, -0.5]]) + mirrored([[0, 15.5], [3, 15.5], [0, 19.5]]),
  },
  // gorille : crâne en crête, arcades saillantes, mufle large
  gorille: {
    mid: mirrored([[0, -21], [7, -19], [13, -12], [16, -3], [15, 6], [11, 14], [5, 18], [0, 18]]),
    light: mirrored([[0, -4], [9, -4], [12, 4], [9, 13], [4, 16], [0, 16]]),
    dark:
      mirrored([[0, -6], [6, -7], [13, -5], [12, -2], [6, -3.5], [0, -3]]) +
      both([[4, -1], [8, -1.5], [6.5, 1]]) +
      both([[1.5, 5], [4.5, 4.5], [4, 8], [1.5, 7.5]]) +
      mirrored([[0, 11.5], [6, 11], [5, 12.6], [0, 13]]),
  },
  // guépard : tête fine, petites oreilles rondes, larmes noires
  guepard: {
    mid: mirrored([[0, -14], [7, -14], [11, -20], [15, -15], [15, -8], [17, 0], [14, 8], [8, 14], [3, 17], [0, 17]]),
    light: mirrored([[0, 1], [4.5, 1], [6.5, 7], [5, 13], [2, 16], [0, 16]]),
    dark:
      both([[4, -3], [10, -5], [8, -1]]) +
      both([[3, -1.4], [4.4, -1.6], [6.6, 10.4], [5.2, 10.8]]) +
      mirrored([[0, 9], [2.6, 9], [0, 12]]) +
      both([[11, -17], [13, -16], [12.5, -14]]) +
      `M-1 -9a1 1 0 1 0 2 0a1 1 0 1 0-2 0Z M5 -10a0.9 0.9 0 1 0 1.8 0a0.9 0.9 0 1 0-1.8 0Z M-6.8 -10a0.9 0.9 0 1 0 1.8 0a0.9 0.9 0 1 0-1.8 0Z M12 -1a0.8 0.8 0 1 0 1.6 0a0.8 0.8 0 1 0-1.6 0Z M-13.6 -1a0.8 0.8 0 1 0 1.6 0a0.8 0.8 0 1 0-1.6 0Z`,
  },
  // aigle royal de profil : la tête, le bec crochu, l'œil sous l'arcade, les plumes du cou en pointes
  'aigle-royal': {
    mid: 'M-20 21L-18 6C-17 -5 -11 -14 -3 -17C4 -19.5 10 -17 13.5 -12.5L16 -8L7 3C3 8 0 14 -2 20L-5 16L-8 22L-11 16L-14 22L-17 17Z',
    light: 'M11 -12.6C17 -12.6 22.6 -8.6 23.6 -1.6C24 1.4 23 4.4 21 6.6C21.2 3.6 20 1.6 17.4 0.8L9 0.8C7 -3 7.6 -9 11 -12.6Z',
    dark: 'M4.4 -7.8a2 2 0 1 0 4 0a2 2 0 1 0-4 0Z' + polygon([[-1, -10.6], [10, -12.2], [7, -9.6]]) + polygon([[9, 0.8], [17.4, 0.8], [16.6, 2.2], [9.6, 2.2]]),
  },
  // ours polaire : tête ronde, petites oreilles, gros museau
  'ours-polaire': {
    mid:
      polygon(Array.from({ length: 20 }, (_, k): Pt => [Math.cos((k / 20) * Math.PI * 2) * 16, Math.sin((k / 20) * Math.PI * 2) * 15 - 1])) +
      polygon(Array.from({ length: 12 }, (_, k): Pt => [11 + Math.cos((k / 12) * Math.PI * 2) * 5, -13 + Math.sin((k / 12) * Math.PI * 2) * 5])) +
      polygon(Array.from({ length: 12 }, (_, k): Pt => [-11 + Math.cos((k / 12) * Math.PI * 2) * 5, -13 + Math.sin((k / 12) * Math.PI * 2) * 5])),
    light: polygon(Array.from({ length: 16 }, (_, k): Pt => [Math.cos((k / 16) * Math.PI * 2) * 8, Math.sin((k / 16) * Math.PI * 2) * 6.5 + 7])),
    dark:
      both([[9, -15], [13, -15], [11, -11]]) +
      `M-6.5 -3a1.6 1.6 0 1 0 3.2 0a1.6 1.6 0 1 0-3.2 0Z M3.3 -3a1.6 1.6 0 1 0 3.2 0a1.6 1.6 0 1 0-3.2 0Z` +
      mirrored([[0, 3], [3.6, 3], [0, 7]]) +
      mirrored([[0, 9.5], [3, 11], [2.6, 11.8], [0, 10.6]]),
  },
  // orque de profil : grand aileron, nageoires, la tache de l'œil et le ventre en creux
  orque: {
    mid:
      'M27 1C27 -5 21 -9 11 -9.5C8.5 -9.6 6.5 -9.6 4.5 -9.4C3 -15 1 -20 -1 -25C-2.5 -19 -4 -13 -6.6 -8.6' +
      'C-12 -7.6 -17 -4.6 -20 -1.5C-22 -4 -24 -7 -28 -8.5C-27 -4 -26 -1 -23.5 1C-26 3 -27 6 -28 9C-24 7 -21 4.5 -19 2.5' +
      'C-12 8 -2 11 8 10.5C6.5 14 5 17 3.5 19.5C7.5 19 11 15 13.5 10.2C19 9.6 27 7 27 1Z',
    dark:
      'M5 -4.4C8 -7.6 14 -7.8 16.4 -6C14 -3.4 9 -2.6 5 -4.4Z' +
      'M26 3.6C23 7.4 15 9 7 8.6C1 8.3 -5 6.6 -9 3.8C-5 7.8 2 9.6 8 9.6C16 9.6 23 7 26 3.6Z',
  },
  // tigre : tête large, rayures sur le front et les joues
  tigre: {
    mid: mirrored([[0, -15], [8, -15], [14, -20], [16, -12], [19, -2], [17, 8], [10, 15], [4, 17], [0, 17]]),
    light: mirrored([[0, 3], [6, 2], [11, 8], [6, 14], [2, 16], [0, 16]]),
    dark:
      mirrored([[0, -14], [2, -14], [0, -8]]) +
      both([[4, -14], [6, -13], [3, -9]]) +
      both([[18, -4], [11, -3], [18, -1]]) +
      both([[18, 2], [12, 4], [17, 5]]) +
      both([[4, -4], [11, -6], [9, -2]]) +
      mirrored([[0, 9], [3, 9], [0, 12]]) +
      both([[12.5, -18], [14.6, -17], [14.5, -14]]),
  },
  // lion : crinière en étoile, face claire
  lion: {
    mid: polygon(Array.from({ length: 28 }, (_, k): Pt => {
      const a = (k / 28) * Math.PI * 2 - Math.PI / 2;
      const r = k % 2 ? 17 : 23;
      return [Math.cos(a) * r, Math.sin(a) * r * 1.02 + 1];
    })),
    light: mirrored([[0, -12], [8, -11], [12, -3], [10, 7], [5, 13], [0, 14]]),
    dark:
      both([[3.5, -3], [9, -5], [7.5, -1]]) +
      mirrored([[0, 5], [3.4, 5], [0, 9]]) +
      mirrored([[0, 10], [4, 11.5], [3.4, 12.4], [0, 11.2]]) +
      both([[7, -12], [10, -14], [10, -10]]),
  },
};

const STAR = (cx: number, cy: number, r: number) =>
  polygon(Array.from({ length: 10 }, (_, k): Pt => {
    const a = (k / 10) * Math.PI * 2 - Math.PI / 2;
    const rr = k % 2 ? r * 0.45 : r;
    return [cx + Math.cos(a) * rr, cy + Math.sin(a) * rr];
  }));

export type BadgeState = 'current' | 'won' | 'locked';

/** Le blason d'une division (10 = la plus basse, 1 = la légende). */
export function DivisionBadge({ number, state = 'won', className = '' }: { number: number; state?: BadgeState; className?: string }) {
  const info = divisionInfo(number);
  const pastel = DIVISION_PASTELS[info.tier];
  const emblem = EMBLEMS[info.athleteId] ?? {};
  // deux divisions par métal : la première a une étoile, la seconde deux ; le diamant et la légende en ont trois
  const stars = info.tier === 'diamant' || info.tier === 'legende' ? 3 : number % 2 === 0 ? 1 : 2;
  return (
    <svg className={`dbadge dbadge--${info.tier} is-${state} ${className}`} viewBox="-52 -52 104 104" role="img" aria-label={`Blason de la division ${info.name}`}>
      <circle r={50} fill={pastel} />
      <circle r={44} fill="none" stroke={INK} strokeWidth={1.4} />
      <g transform="translate(0 -5) scale(1.18)">
        {emblem.mid && <path d={emblem.mid} fill={INK} />}
        {emblem.light && <path d={emblem.light} fill={CREAM} />}
        {emblem.dark && <path d={emblem.dark} fill={pastel} />}
      </g>
      <path d={Array.from({ length: stars }, (_, k) => STAR((k - (stars - 1) / 2) * 9.5, 33, 3.3)).join('')} fill={INK} />
    </svg>
  );
}
