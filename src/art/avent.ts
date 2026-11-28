import { area, circle, draw, ellipse, f, hills, mix, mountain, mulberry32, pine, poly, spots, type Rng } from './kit';

// Le calendrier de l'Avent (components/Avent.tsx), peint dans le langage des boosters et des dos de cartes : aplats,
// brume entre les plans, une nuit polaire sous l'aurore. Chaque image est tracée une seule fois et posée en image de
// fond (une seule image pour les 24 cartes) : rien de lourd à redessiner, même quand tout bouge.

const SKY = ['#081a33', '#1d4f6e', '#6fb3c8'];
const SNOW = '#f4f9ff';
const FAR = '#a9c9e2';
const NEAR = '#0b2236';
const AURORA = ['#7ff0c1', '#5fd4d8', '#b28cff'];
const tone = (t: number) => mix(FAR, NEAR, t);

const url = (w: number, h: number, body: string, aspect = 'xMidYMid slice') =>
  `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" preserveAspectRatio="${aspect}">${body}</svg>`)}")`;

/** Sapin enneigé : le sapin sombre et un bonnet de neige sur sa pointe et ses premières branches. */
function snowyPines(list: [number, number, number][]): { trees: string; snow: string } {
  return {
    trees: draw(list, pine),
    snow: draw(list, (x, y, h) => pine(x, y - h * 0.5, h * 0.48) + pine(x, y - h * 0.18, h * 0.28)),
  };
}

/** Ruban d'aurore : une bande ondulée qui traverse le ciel. */
function ribbon(r: Rng, w: number, y: number, thick: number, wave: number): string {
  const top: [number, number][] = [];
  const bottom: [number, number][] = [];
  const phase = r() * Math.PI * 2;
  for (let x = -6; x <= w + 6; x += 6) {
    const k = Math.sin(x / (w / 2.4) + phase) * wave + Math.sin(x / 11 + phase * 2) * wave * 0.15;
    const t = thick * (0.55 + 0.45 * Math.sin(x / (w / 3.2) + phase));
    top.push([x, y + k - t]);
    bottom.push([x, y + k + t * 0.35]);
  }
  return poly([...top, ...bottom.reverse()]);
}

/**
 * Dos des cartes du calendrier : le dos de la Série 3 en miniature (nuit polaire, aurore, pleine lune, sommets et
 * sapins enneigés), son filet crème, et au milieu un médaillon de glace où s'inscrit le numéro du jour.
 */
export const AVENT_BACK = (() => {
  const r = mulberry32(24);
  const [w, h] = [100, 140];
  let stars = '';
  for (let i = 0; i < 26; i++) stars += circle(r() * w, r() * 62, 0.25 + r() * 0.5);
  const aurora = [ribbon(r, w, 30, 9, 6), ribbon(r, w, 42, 6, 5)];
  const far = [mountain(r, 18, 78, 112, 34, 28), mountain(r, 84, 72, 112, 30, 34)];
  const l1 = hills(r, 108, 3);
  const l2 = hills(r, 122, 2.4);
  const p1 = snowyPines(spots(r, l1, w, 8, 13, 5));
  const p2 = snowyPines([[8, l2(8) + 1, 30], [94, l2(94) + 1, 26]]);
  const body = [
    `<defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${SKY[0]}"/><stop offset="0.55" stop-color="${SKY[1]}"/><stop offset="0.85" stop-color="${SKY[2]}"/></linearGradient>`,
    `<linearGradient id="a" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${AURORA[0]}"/><stop offset="0.5" stop-color="${AURORA[1]}"/><stop offset="1" stop-color="${AURORA[2]}"/></linearGradient>`,
    `<radialGradient id="g"><stop offset="0" stop-color="#f4fbff" stop-opacity="0.5"/><stop offset="1" stop-color="#f4fbff" stop-opacity="0"/></radialGradient>`,
    `<filter id="b" x="-10%" y="-60%" width="120%" height="220%"><feGaussianBlur stdDeviation="2"/></filter></defs>`,
    `<rect width="${w}" height="${h}" fill="url(#s)"/>`,
    `<path d="${stars}" fill="#fff" opacity="0.7"/>`,
    `<g filter="url(#b)">${aurora.map((d, i) => `<path d="${d}" fill="url(#a)" opacity="${[0.7, 0.5][i]}"/>`).join('')}</g>`,
    ...far.map((m) => `<path d="${m.body}" fill="${mix(FAR, SKY[1], 0.3)}"/><path d="${m.shadow}" fill="${NEAR}" opacity="0.22"/><path d="${m.snow}" fill="${SNOW}" opacity="0.95"/>`),
    `<path d="${area(l1, w)}" fill="${mix(SNOW, FAR, 0.3)}"/><path d="${p1.trees}" fill="${tone(0.55)}"/><path d="${p1.snow}" fill="${SNOW}" opacity="0.85"/>`,
    `<path d="${area(l2, w)}" fill="${SNOW}"/><path d="${p2.trees}" fill="${NEAR}"/><path d="${p2.snow}" fill="${SNOW}" opacity="0.9"/>`,
    // le médaillon du numéro : un disque de nuit cerclé de givre, et son halo
    `<circle cx="50" cy="66" r="30" fill="url(#g)"/>`,
    `<circle cx="50" cy="66" r="19" fill="${NEAR}" fill-opacity="0.72" stroke="${SNOW}" stroke-opacity="0.85" stroke-width="1"/>`,
    `<circle cx="50" cy="66" r="16" fill="none" stroke="${SNOW}" stroke-opacity="0.35" stroke-width="0.5" stroke-dasharray="1.2 1.6"/>`,
    `<rect x="3.4" y="3.4" width="93.2" height="133.2" rx="3.4" fill="none" stroke="#f4f9ff" stroke-opacity="0.65" stroke-width="0.6"/>`,
  ].join('');
  return url(w, h, body);
})();

/**
 * Face d'une carte ouverte : un papier de givre, son filet et des flocons en filigrane ; le cadeau (icône et nom)
 * s'y pose par-dessus, et le cadre prend la couleur du cadeau, comme la rareté sur les cartes du jeu.
 */
export const AVENT_FRONT = (() => {
  const r = mulberry32(12);
  const [w, h] = [100, 140];
  let flakes = '';
  for (let i = 0; i < 14; i++) {
    const [x, y, s] = [r() * w, r() * h, 2 + r() * 3];
    for (let k = 0; k < 3; k++) {
      const a = (k * Math.PI) / 3;
      flakes += `M${f(x - Math.cos(a) * s)} ${f(y - Math.sin(a) * s)}L${f(x + Math.cos(a) * s)} ${f(y + Math.sin(a) * s)}`;
    }
  }
  const body = [
    `<defs><radialGradient id="p" cx="0.5" cy="0.4" r="0.8"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#cfe2f4"/></radialGradient></defs>`,
    `<rect width="${w}" height="${h}" fill="url(#p)"/>`,
    `<path d="${flakes}" stroke="#7fa6c8" stroke-opacity="0.35" stroke-width="0.7" stroke-linecap="round"/>`,
    `<rect x="4" y="4" width="92" height="132" rx="3" fill="none" stroke="#0d2a4a" stroke-opacity="0.35" stroke-width="0.6"/>`,
  ].join('');
  return url(w, h, body);
})();

/** Le pied du calendrier : sommets enneigés, brume, deux rangées de sapins poudrés et la neige au premier plan. */
export const AVENT_GROUND = (() => {
  const r = mulberry32(7);
  const [w, h] = [1200, 150];
  // le profil part de y = 172 (SCENE_H) : on dessine dans un repère de 172 de haut, cadré sur le bas
  const far: ReturnType<typeof mountain>[] = [];
  for (let x = 40; x < w; x += 150 + r() * 90) far.push(mountain(r, x, 70 + r() * 18, 128, 60 + r() * 30, 60 + r() * 30));
  const l1 = hills(r, 126, 4);
  const l2 = hills(r, 142, 3.4);
  const l3 = hills(r, 160, 2.6);
  const p1 = snowyPines(spots(r, l1, w, 10, 16, 6));
  const p2 = snowyPines(spots(r, l2, w, 16, 26, 11));
  let drifts = '';
  for (let x = 30; x < w; x += 110 + r() * 80) drifts += ellipse(x, 166 + r() * 3, 26 + r() * 20, 1.8);
  const body = [
    `<defs><linearGradient id="m" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${SKY[2]}" stop-opacity="0"/><stop offset="1" stop-color="${SNOW}" stop-opacity="0.7"/></linearGradient></defs>`,
    `<g transform="translate(0 -22)">`,
    ...far.map((m) => `<path d="${m.body}" fill="${mix(FAR, SKY[1], 0.35)}"/><path d="${m.shadow}" fill="${NEAR}" opacity="0.2"/><path d="${m.snow}" fill="${SNOW}" opacity="0.92"/>`),
    `<rect x="0" y="100" width="${w}" height="34" fill="url(#m)" opacity="0.6"/>`,
    `<path d="${area(l1, w)}" fill="${mix(SNOW, FAR, 0.35)}"/><path d="${p1.trees}" fill="${tone(0.5)}"/><path d="${p1.snow}" fill="${SNOW}" opacity="0.85"/>`,
    `<rect x="0" y="126" width="${w}" height="22" fill="url(#m)" opacity="0.35"/>`,
    `<path d="${area(l2, w)}" fill="${mix(SNOW, FAR, 0.15)}"/><path d="${p2.trees}" fill="${tone(0.78)}"/><path d="${p2.snow}" fill="${SNOW}" opacity="0.9"/>`,
    `<path d="${area(l3, w)}" fill="${SNOW}"/><path d="${drifts}" fill="#9fbfdc" opacity="0.45"/>`,
    `</g>`,
  ].join('');
  return url(w, h, body, 'xMidYMax slice');
})();

/** Aurore boréale du ciel du calendrier : trois rubans flous, étirés sur toute la largeur. */
export const AVENT_AURORA = (() => {
  const r = mulberry32(3);
  const [w, h] = [400, 120];
  const ribbons = [ribbon(r, w, 48, 18, 16), ribbon(r, w, 70, 12, 12), ribbon(r, w, 34, 9, 10)];
  const body = [
    `<defs><linearGradient id="a" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${AURORA[0]}"/><stop offset="0.5" stop-color="${AURORA[1]}"/><stop offset="1" stop-color="${AURORA[2]}"/></linearGradient>`,
    `<filter id="b" x="-10%" y="-60%" width="120%" height="220%"><feGaussianBlur stdDeviation="5"/></filter></defs>`,
    `<g filter="url(#b)">${ribbons.map((d, i) => `<path d="${d}" fill="url(#a)" opacity="${[0.6, 0.45, 0.35][i]}"/>`).join('')}</g>`,
  ].join('');
  return url(w, h, body, 'none');
})();

/** Ciel étoilé en motif (deux motifs décalés, qui scintillent tour à tour). */
function starTile(seed: number, count: number, w: number, h: number): string {
  const r = mulberry32(seed);
  let big = '';
  let small = '';
  for (let i = 0; i < count; i++) {
    const [x, y] = [r() * w, r() * h];
    if (i % 4 === 0) big += circle(x, y, 0.9 + r() * 0.5);
    else small += circle(x, y, 0.4 + r() * 0.45);
  }
  return url(w, h, `<path d="${small}" fill="#fff" opacity="0.75"/><path d="${big}" fill="#fff"/>`, 'none');
}
export const AVENT_STARS_A = starTile(31, 18, 180, 140);
export const AVENT_STARS_B = starTile(77, 14, 210, 160);
