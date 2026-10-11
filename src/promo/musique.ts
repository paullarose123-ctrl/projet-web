import { air, bass, bed, boom, flute, midi, pluck, strings, type Bus } from '../audio/engine';

// Musique de la vidéo de la Série 2 : dans le style des morceaux du jeu, mais au Mexique, et plutôt cinéma
// que comptine. La mineur (avec le sol dièse de la mineure harmonique, couleur hispanique), en 6/8 lent :
// guitare nylon en arpèges, guitarrón profond, grand tambour, hochets discrets, cordes sombres et une flûte
// grave. Le vent du désert en introduction ; la tension monte pendant que le booster se charge, l'impact
// tombe quand il se déchire, et l'accord final résonne sur la date de sortie.
// Une mesure de 6/8 dure 1,5 s (noire pointée à 80) : la vidéo est calée sur ces mesures.

export const BAR = 1.5;
export const EIGHTH = BAR / 6;
/** à la noire pointée */
export const BPM = 80;
/** mesures de la musique (l'accord final résonne ensuite) */
export const BARS = 13;

/** croche de départ, note MIDI, durée en croches */
type Note = [eighth: number, note: number, length: number];

// voix de guitare (de la corde la plus grave à la plus aiguë) et basse du guitarrón
const CHORDS: Record<string, { voice: number[]; root: number; fifth: number }> = {
  Am: { voice: [45, 52, 57, 60, 64], root: 33, fifth: 40 },
  Dm: { voice: [50, 57, 62, 65, 69], root: 38, fifth: 45 },
  E7: { voice: [40, 47, 52, 56, 62], root: 40, fifth: 47 },
  F: { voice: [41, 48, 53, 57, 60], root: 41, fifth: 48 },
  G: { voice: [43, 50, 55, 59, 62], root: 43, fifth: 50 },
};
// intro, thème (le Mexique), tension (le booster se charge), impact, puis la fin
const PROGRESSION = ['Am', 'Am', 'Am', 'Am', 'Dm', 'E7', 'F', 'G', 'Am', 'Am', 'Dm', 'E7', 'Am'];

const MELODY: Note[][] = [
  [[3, 69, 3]],
  [[0, 72, 2], [2, 71, 1], [3, 68, 3]],
  [[0, 69, 4], [4, 72, 2]],
  [[0, 76, 3], [3, 74, 1], [4, 72, 2]],
  [[0, 74, 3], [3, 77, 2], [5, 76, 1]],
  [[0, 74, 2], [2, 71, 1], [3, 68, 3]],
  [[0, 72, 3], [3, 77, 3]],
  [[0, 79, 3], [3, 76, 1.5], [4.5, 79, 1.5]],
  [[0, 81, 6]],
  [[0, 81, 2], [2, 79, 1], [3, 76, 3]],
  [[0, 77, 3], [3, 74, 3]],
  [[0, 76, 2], [2, 74, 1], [3, 71, 1.5], [4.5, 68, 1.5]],
  [[0, 69, 6]],
];

/** Arpège de guitare aux doigts : basse, puis les cordes aiguës qui montent et redescendent. */
const PICKING = [0, 2, 3, 4, 3, 2];

/** Rasgueo : les cordes balayées de la plus grave à la plus aiguë. */
function strum(ac: AudioContext, out: Bus, notes: number[], t: number, gain: number) {
  notes.forEach((n, k) => pluck(ac, out, midi(n), t + k * 0.016, gain, -0.3 + k * 0.14, 0.42));
}

/** Programme toute la musique à partir du temps `t0` (horloge audio). */
export function scheduleMusique(ac: AudioContext, out: Bus, t0: number) {
  // le vent du désert et un bourdon grave pendant l'introduction
  bed(ac, out, t0, BAR * 2 + 2, { gain: 0.024, low: 160, high: 800, fade: 1.2 });
  strings(ac, out, [45, 52].map(midi), t0 + 0.1, BAR * 2 - 0.2, 0.024, { attack: 2, release: 1.4, open: 700 });
  boom(ac, out, t0 + 0.05, 0.1, 50);

  for (let b = 0; b < BARS; b++) {
    const t = t0 + b * BAR;
    const chord = CHORDS[PROGRESSION[b]];
    const intro = b < 2;
    const tension = b === 6 || b === 7;
    const impact = b === 8;
    const final = b === BARS - 1;

    // flûte grave ; doublée à l'octave inférieure à partir de l'impact, pour plus de corps
    for (const [e, n, length] of MELODY[b]) {
      flute(ac, out, midi(n), t + e * EIGHTH, length * EIGHTH * 0.94, intro ? 0.05 : 0.06, 0.12);
      if (b >= 8) flute(ac, out, midi(n - 12), t + e * EIGHTH, length * EIGHTH * 0.94, 0.035, -0.15);
    }

    if (final) {
      strum(ac, out, CHORDS.Am.voice, t, 0.1);
      bass(ac, out, midi(33), t, BAR * 1.6, 0.16);
      boom(ac, out, t, 0.17, 46);
      strings(ac, out, [45, 52, 57, 60, 64].map(midi), t, BAR * 1.4, 0.034, { attack: 0.3, release: 3, open: 1500 });
      air(ac, out, t, 1.6, { gain: 0.035, from: 7000, to: 2500, q: 0.6, attack: 0.01, send: 0.6 });
      continue;
    }

    // guitare : arpège en croches (plus doux dans l'introduction), rasgueos pendant la tension
    if (impact) {
      strum(ac, out, chord.voice, t, 0.11);
    } else {
      PICKING.forEach((k, e) => pluck(ac, out, midi(chord.voice[k]), t + e * EIGHTH, (e === 0 ? 0.13 : 0.08) * (intro ? 0.7 : 1), -0.2 + k * 0.1, 0.4));
      if (tension) for (const e of [0, 2, 3, 5]) strum(ac, out, chord.voice, t + e * EIGHTH, e % 3 === 0 ? 0.07 : 0.05);
      if (b === 10 || b === 11) for (const e of [0, 3]) strum(ac, out, chord.voice, t + e * EIGHTH, 0.05);
    }
    if (intro) continue;

    // guitarrón : fondamentale sur le premier temps, quinte sur le second
    bass(ac, out, midi(chord.root), t, EIGHTH * 2.6, 0.15);
    bass(ac, out, midi(chord.fifth), t + EIGHTH * 3, EIGHTH * 2.4, 0.1);

    // grand tambour : un battement lent ; roulement qui monte pendant la tension ; impact à la déchirure
    if (tension) {
      for (let e = 0; e < 6; e++) {
        const k = ((b - 6) * 6 + e) / 11;
        boom(ac, out, t + e * EIGHTH, 0.03 + k * 0.08, 58 + k * 10);
      }
    } else if (impact) {
      boom(ac, out, t, 0.19, 44);
      air(ac, out, t, 1.8, { gain: 0.05, from: 8000, to: 2200, q: 0.5, attack: 0.008, send: 0.7 });
    } else {
      boom(ac, out, t, 0.09, 52);
      boom(ac, out, t + EIGHTH * 3, 0.045, 60);
    }

    // hochets discrets sur les croches faibles
    for (const e of [1, 2, 4, 5]) air(ac, out, t + e * EIGHTH, 0.035, { gain: tension ? 0.012 : 0.008, from: 6500, q: 1.4, attack: 0.003, pan: 0.35, send: 0.1 });

    // cordes sombres : nappe discrète, qui enfle pendant la tension et éclate à l'impact
    const pad = impact ? 0.036 : tension ? 0.02 + (b - 6) * 0.008 : 0.015;
    strings(ac, out, chord.voice.slice(1).map(midi), t, impact ? BAR * 2 - 0.2 : BAR - 0.05, pad, {
      attack: tension ? 1.2 : impact ? 0.15 : 0.6,
      release: impact ? 1.5 : 0.8,
      open: impact ? 2000 : tension ? 1300 + (b - 6) * 300 : 1000,
    });
  }

  // souffle qui monte juste avant la déchirure du booster
  const tear = t0 + BAR * 8;
  air(ac, out, tear - 1.2, 1.2, { gain: 0.05, from: 400, to: 6000, q: 0.7, attack: 1.1, send: 0.5 });
}
