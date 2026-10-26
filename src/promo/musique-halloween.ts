import { air, bass, bed, bell, boom, marimba, midi, pluck, strings, tick, type Bus } from '../audio/engine';
import { SQUELETTES, SQUELETTES_MELODY, owl } from '../audio/tracks';

// Musique de la vidéo d'Halloween : le « Bal des squelettes » de la radio du jeu (sol mineur, 6/8, 168 croches
// par minute), arrangé pour la vidéo. Le vent et la hulotte dans la forêt, une boîte à musique qui hésite et une
// horloge qui s'emballe ; un coup de tambour quand Halloween arrive, puis la danse des squelettes (pizzicati,
// os qui s'entrechoquent, marimba), reprise aux cloches pendant la visite du jeu, et l'accord final.
// Une mesure dure 6 croches, soit 2,14 s : la vidéo est calée sur ces mesures.

export const EIGHTH = 60 / 168;
export const BAR = EIGHTH * 6;
/** mesures de la musique : 2 d'introduction, 7 de danse, puis l'accord final qui résonne */
export const BARS = 10;

// la grille du Bal des squelettes, ramenée à 7 mesures qui finissent sur la dominante (ré 7)
const STEPS = [0, 1, 2, 3, 4, 6, 7];
const GM = [55, 58, 62];

/** Programme toute la musique à partir du temps `t0` (horloge audio). */
export function scheduleHalloween(ac: AudioContext, out: Bus, t0: number) {
  // ── introduction : la forêt la nuit
  bed(ac, out, t0, BAR * 2 + 0.6, { gain: 0.026, low: 140, high: 700, fade: 1.2 });
  strings(ac, out, [43, 50].map(midi), t0 + 0.1, BAR * 2 - 0.1, 0.026, { attack: 1.6, release: 0.8, open: 600 });
  owl(ac, out, t0 + 0.9);
  // une boîte à musique qui monte en hésitant, puis une horloge qui s'emballe
  const box: [number, number][] = [[3, 79], [5, 78], [6, 79], [8, 82], [9, 81], [10, 79], [11, 78]];
  for (const [e, n] of box) bell(ac, out, midi(n), t0 + e * EIGHTH, 0.04, 0.25, 1.6);
  for (let k = 0; k < 10; k++) {
    const e = 6 + k * (k < 6 ? 1 : 0.5);
    tick(ac, out, t0 + e * EIGHTH, 0.02 + k * 0.004, 2200 + k * 60);
  }
  air(ac, out, t0 + BAR * 2 - 1.3, 1.3, { gain: 0.05, from: 400, to: 6000, q: 0.7, attack: 1.2, send: 0.5 });

  // ── la danse des squelettes
  STEPS.forEach((step, k) => {
    const t = t0 + (k + 2) * BAR;
    const { r, c } = SQUELETTES[step];
    const tour = k >= 3 && k <= 5; // la visite du jeu : la mélodie passe aux cloches
    if (k === 0) {
      // Halloween arrive : grand tambour, cloches et cordes qui s'ouvrent
      boom(ac, out, t, 0.2, 46);
      GM.forEach((n, j) => bell(ac, out, midi(n + 12), t + j * 0.02, 0.05, -0.2 + j * 0.2, 2.6));
      strings(ac, out, c.map(midi), t, BAR * 2, 0.034, { attack: 0.15, release: 1.4, open: 1800 });
      air(ac, out, t, 1.6, { gain: 0.05, from: 8000, to: 2200, q: 0.5, attack: 0.008, send: 0.7 });
    }
    // pizzicati : la basse sur les temps forts, l'accord en réponse
    for (const b of [0, 3]) pluck(ac, out, midi(r), t + b * EIGHTH, 0.2, -0.25, 0.3);
    bass(ac, out, midi(r - 12), t, BAR * 0.45, 0.08);
    for (const b of [2, 5]) c.forEach((n, j) => pluck(ac, out, midi(n), t + b * EIGHTH + j * 0.015, 0.075, 0.1 + j * 0.12, 0.35));
    // les os qui s'entrechoquent, et un battement de tambour au début de chaque phrase
    for (const b of [0, 3]) tick(ac, out, t + b * EIGHTH, b ? 0.03 : 0.045, b ? 2400 : 1900);
    if (k === 3 || k === 6) boom(ac, out, t, 0.1, 58);
    if (tour) strings(ac, out, c.map(midi), t, BAR - 0.1, 0.02, { attack: 0.6, release: 1, open: 1100 });
    for (const [e, n, length = 1] of SQUELETTES_MELODY[step]) {
      if (!tour) marimba(ac, out, midi(n), t + e * EIGHTH, 0.12, 0.15);
      else bell(ac, out, midi(n + 12), t + e * EIGHTH, 0.05, 0.2, Math.max(1.2, length * EIGHTH * 2));
      if (k === 6) marimba(ac, out, midi(n - 12), t + e * EIGHTH, 0.07, -0.15);
    }
  });

  // ── l'accord final, et la hulotte qui répond
  const end = t0 + BAR * (BARS - 1);
  [31, 43, 55, 58, 62, 67].forEach((n, k) => pluck(ac, out, midi(n), end + k * 0.06, 0.15, (k - 3) * 0.12, 0.35));
  bass(ac, out, midi(31), end, BAR * 1.2, 0.14);
  boom(ac, out, end, 0.16, 46);
  GM.forEach((n, j) => bell(ac, out, midi(n + 12), end + 0.1 + j * 0.05, 0.045, -0.2 + j * 0.2, 3.2));
  strings(ac, out, [43, 55, 58, 62].map(midi), end, BAR * 0.8, 0.03, { attack: 0.2, release: 2.2, open: 1300 });
  owl(ac, out, end + 0.9);
}
