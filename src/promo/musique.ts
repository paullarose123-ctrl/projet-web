import { air, bass, bed, bell, boom, flute, marimba, midi, pluck, strings, type Bus } from '../audio/engine';

// Musique de la vidéo de la Série 2 : dans le style des morceaux du jeu, mais au Mexique.
// Une valse ranchera à 120 bpm en ré majeur : marimba jouée en tierces (comme les marimbas du Chiapas),
// guitare nylon en rasgueo sur les temps 2 et 3, guitarrón (la basse des mariachis) au premier temps,
// maracas ; une flûte seule dans le vent du désert en introduction, puis tout l'orchestre quand le Mexique
// apparaît, un impact quand le booster se déchire, et un accord final qui résonne sur la date de sortie.

export const BPM = 120;
export const BEAT = 60 / BPM;
export const BAR = BEAT * 3;
/** mesures de la musique (l'accord final résonne ensuite) */
export const BARS = 13;

type Note = [beat: number, note: number, length?: number];

// ré majeur, pour harmoniser la mélodie une tierce en dessous
const SCALE = [62, 64, 66, 67, 69, 71, 73];
function thirdBelow(n: number): number {
  const octave = Math.floor((n - 62) / 12);
  const pc = ((n - 62) % 12 + 12) % 12;
  const degree = SCALE.findIndex((s) => s - 62 === pc);
  if (degree < 0) return n - 3;
  const target = degree - 2;
  const wrapped = (target + 7) % 7;
  return SCALE[wrapped] + 12 * (octave + (target < 0 ? -1 : 0));
}

// accords de guitare (cordes de la plus grave à la plus aiguë) et basse du guitarrón
const CHORDS: Record<string, { strum: number[]; root: number; fifth: number }> = {
  D: { strum: [50, 57, 62, 66], root: 38, fifth: 45 },
  A7: { strum: [45, 52, 55, 61, 64], root: 33, fifth: 40 },
  G: { strum: [43, 50, 55, 59, 67], root: 43, fifth: 38 },
};
const PROGRESSION = ['D', 'D', 'D', 'A7', 'A7', 'D', 'D', 'G', 'A7', 'D', 'G', 'A7', 'D'];

const MELODY: Note[][] = [
  [],
  [],
  [[0, 74], [1, 78], [2, 81]],
  [[0, 79, 2], [2, 76]],
  [[0, 73], [1, 76], [2, 79]],
  [[0, 78, 2], [2, 74]],
  [[0, 81], [1, 78], [2, 81]],
  [[0, 83, 2], [2, 79]],
  [[0, 76], [1, 79], [2, 73]],
  [[0, 74, 3]],
  [[0, 83], [1, 81], [2, 79]],
  [[0, 78], [1, 76], [2, 73]],
  [],
];

// flûte de l'introduction, dans le vent
const INTRO: Note[][] = [
  [[0, 69, 1], [1, 71, 0.5], [1.5, 74, 1.5]],
  [[0, 76, 1], [1, 74, 0.5], [1.5, 73, 0.5], [2, 69, 0.9]],
];

/** Une note de marimba ; les notes longues sont jouées en trémolo, comme sur une vraie marimba. */
function mallet(ac: AudioContext, out: Bus, note: number, t: number, length: number, gain: number, pan: number) {
  if (length <= 1) {
    marimba(ac, out, midi(note), t, gain, pan);
    return;
  }
  const hits = Math.floor((length * BEAT) / 0.085);
  for (let k = 0; k < hits; k++) marimba(ac, out, midi(note), t + k * 0.085, gain * (k === 0 ? 1 : 0.55 + 0.1 * Math.sin(k * 1.7)), pan);
}

/** Rasgueo : les cordes balayées de la plus grave à la plus aiguë. */
function strum(ac: AudioContext, out: Bus, notes: number[], t: number, gain: number) {
  notes.forEach((n, k) => pluck(ac, out, midi(n), t + k * 0.014, gain, -0.25 + k * 0.12, 0.6));
}

/** Programme toute la musique à partir du temps `t0` (horloge audio). */
export function scheduleMusique(ac: AudioContext, out: Bus, t0: number) {
  // le vent du désert, pendant l'introduction
  bed(ac, out, t0, BAR * 2 + 1.5, { gain: 0.02, low: 200, high: 900, fade: 1 });
  strings(ac, out, [62, 66, 69].map(midi), t0 + 0.2, BAR * 2 - 0.4, 0.02, { attack: 1.6, release: 1.2, open: 1100 });
  INTRO.forEach((phrase, b) => {
    for (const [beat, n, length = 1] of phrase) flute(ac, out, midi(n), t0 + b * BAR + beat * BEAT, length * BEAT * 0.95, 0.06, 0.1);
  });
  // petit rasgueo d'appel juste avant l'entrée de l'orchestre
  strum(ac, out, CHORDS.A7.strum, t0 + BAR * 2 - BEAT * 0.5, 0.06);
  strum(ac, out, CHORDS.A7.strum, t0 + BAR * 2 - BEAT * 0.25, 0.07);

  for (let b = 2; b < BARS; b++) {
    const t = t0 + b * BAR;
    const chord = CHORDS[PROGRESSION[b]];
    const final = b === BARS - 1;
    // guitarrón : fondamentale au premier temps, quinte une mesure sur deux
    const low = b % 2 === 0 ? chord.root : chord.fifth;
    bass(ac, out, midi(low), t, BEAT * 1.4, 0.14);
    pluck(ac, out, midi(low + 12), t, 0.16, -0.1, 0.25);
    if (final) {
      // accord final : rasgueo, marimba qui monte, cloche et cordes qui résonnent
      strum(ac, out, chord.strum, t, 0.09);
      strum(ac, out, chord.strum, t + BEAT * 0.5, 0.07);
      [62, 66, 69, 74, 78, 81, 86].forEach((n, k) => marimba(ac, out, midi(n), t + k * 0.07, 0.11, (k - 3) * 0.15));
      strings(ac, out, [62, 66, 69, 74].map(midi), t, BAR * 1.6, 0.03, { attack: 0.4, release: 2.6, open: 1800 });
      bell(ac, out, midi(86), t + 0.5, 0.05, 0.2, 2.8);
      boom(ac, out, t, 0.12, 60);
      continue;
    }
    // guitare : rasgueo sur les temps 2 et 3
    strum(ac, out, chord.strum, t + BEAT, 0.075);
    strum(ac, out, chord.strum, t + BEAT * 2, 0.06);
    // maracas en croches, plus fortes sur les temps
    for (let s = 0; s < 6; s++) air(ac, out, t + s * (BEAT / 2), 0.06, { gain: s % 2 ? 0.012 : 0.022, from: 5200, q: 1.1, attack: 0.004, pan: 0.3, send: 0.1 });
    // marimba en tierces
    for (const [beat, n, length = 1] of MELODY[b]) {
      mallet(ac, out, n, t + beat * BEAT, length, 0.15, 0.1);
      mallet(ac, out, thirdBelow(n), t + beat * BEAT, length, 0.09, -0.1);
    }
    // nappe de cordes discrète
    strings(ac, out, chord.strum.slice(-3).map(midi), t, BAR - 0.1, 0.014, { attack: 0.6, release: 0.9, open: 1200 });
  }
  // le booster se déchire (mesure 8) : souffle qui monte, puis impact et étincelles
  const tear = t0 + BAR * 8;
  air(ac, out, tear - 0.9, 0.9, { gain: 0.06, from: 600, to: 5000, q: 0.8, attack: 0.8, send: 0.5 });
  boom(ac, out, tear, 0.16, 58);
  [86, 90, 93].forEach((n, k) => bell(ac, out, midi(n), tear + 0.05 + k * 0.08, 0.035, (k - 1) * 0.4, 2));
}
