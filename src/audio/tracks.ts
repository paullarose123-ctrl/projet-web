import { air, bass, bed, bell, bird, boom, bubble, cricket, flute, kalimba, marimba, midi, piano, pluck, strings, tick, type Bus } from './engine';
import { seasonAt, type Season } from '../engine/season';

// Les morceaux de la radio du jeu : sept pièces calmes de la même famille, façon documentaire nature,
// chacune avec son paysage (une clairière au matin, la pluie sur la canopée, la savane la nuit…),
// trois pièces pour Halloween et quatre mexicaines pour la semaine du Jour des morts : pendant une fête, la radio ne joue qu'elles.
// Tout est composé en direct avec Web Audio : aucun fichier, aucun droit d'auteur.
// Chaque morceau joue une grille de 8 mesures (16 pour la valse) en plusieurs passages qui changent
// d'instruments (introduction, thème, variation, retour du thème), puis un accord final qui résonne.

export interface Track {
  id: string;
  title: string;
  bpm: number;
  /** temps par mesure */
  beats: number;
  /** nombre de mesures, accord final compris */
  bars: number;
  /** programme la mesure `i`, qui commence au temps `t0` (horloge audio) */
  bar: (ac: AudioContext, out: Bus, t0: number, i: number) => void;
  /** morceau de saison, joué seulement pendant ses fêtes (voir engine/season.ts) */
  seasons?: Season[];
}

/** Une note de mélodie : temps dans la mesure, note MIDI, durée en temps (pour la flûte). */
export type Note = [beat: number, note: number, length?: number];
export interface Chord {
  /** basse (MIDI) */
  r: number;
  /** accord (MIDI) */
  c: number[];
}

const rand = (min: number, max: number) => min + Math.random() * (max - min);

/** Où en est le morceau : passage (0, 1, 2…), mesure dans la grille, accord final. */
function where(i: number, bars: number, cycle = 8) {
  return { section: Math.floor(i / cycle), step: i % cycle, outro: i >= bars - 2, last: i === bars - 1 };
}

/** Accord égrené lentement, de la basse vers l'aigu. */
function roll(ac: AudioContext, out: Bus, notes: number[], t: number, gain: number, gap = 0.12) {
  notes.forEach((n, k) => piano(ac, out, midi(n), t + k * gap, gain, (k - notes.length / 2) * 0.12, 3.2));
}

/** Joue une phrase de mélodie avec l'instrument donné. */
function play(phrase: Note[], t0: number, beat: number, voice: (freq: number, t: number, length: number) => void, transpose = 0) {
  for (const [b, n, length = 1] of phrase) voice(midi(n + transpose), t0 + b * beat, length * beat);
}

// ───────────── 1. Clairière du matin (ré majeur, 76 bpm) : harpe, kalimba, cordes, oiseaux ─────────────

const CLAIRIERE: Chord[] = [
  { r: 38, c: [62, 66, 69] }, // Ré
  { r: 35, c: [59, 62, 66] }, // Si m
  { r: 43, c: [59, 62, 67] }, // Sol
  { r: 45, c: [61, 64, 69] }, // La
  { r: 38, c: [62, 66, 69] }, // Ré
  { r: 42, c: [61, 66, 69] }, // Fa# m
  { r: 43, c: [59, 62, 67] }, // Sol
  { r: 45, c: [61, 64, 69] }, // La
];
const CLAIRIERE_MELODY = [74, 76, 78, 81, 83, 86];
const ARPEGGIOS = [
  [0, 1, 2, 3, 4, 3, 2, 1],
  [0, 2, 1, 3, 2, 4, 3, 5],
  [0, 1, 2, 4, 5, 4, 2, 1],
];

function clairiere(): Track {
  const bpm = 76;
  const beat = 60 / bpm;
  const BAR = beat * 4;
  const bars = 34;
  let note = 2;
  return {
    id: 'clairiere',
    title: 'Clairière du matin',
    bpm,
    beats: 4,
    bars,
    bar(ac, out, t0, i) {
      const { outro, last } = where(i, bars, 16);
      if (outro) {
        if (!last) {
          strings(ac, out, [62, 66, 69].map(midi), t0, BAR * 2, 0.03, { attack: 1.2, release: 3 });
          bass(ac, out, midi(38), t0, BAR * 1.5, 0.13);
          [62, 66, 69, 74, 78].forEach((n, k) => pluck(ac, out, midi(n), t0 + k * 0.16, 0.16, (k - 2) * 0.2, 0.4));
          kalimba(ac, out, midi(81), t0 + BAR * 0.75, 0.1, 0.2);
        }
        return;
      }
      const section = Math.floor(i / 16) % 2;
      const { r, c } = CLAIRIERE[Math.floor(i / 2) % CLAIRIERE.length];
      if (i % 2 === 0) strings(ac, out, c.map(midi), t0, BAR * 2 - 0.4, 0.032, { attack: 1.6, release: 2.2, open: 1400 });
      bass(ac, out, midi(r), t0, beat * 1.7, 0.15);
      bass(ac, out, midi(r + (i % 2 ? 7 : 0)), t0 + beat * 2, beat * 1.5, 0.11);
      const spread = [...c, ...c.map((n) => n + 12)];
      ARPEGGIOS[(Math.floor(i / 4) + section) % ARPEGGIOS.length].forEach((k, s) => {
        if (s === 7 && i % 4 === 3) return;
        pluck(ac, out, midi(spread[k]), t0 + s * (beat / 2) + (s % 2 ? 0.012 : 0), s % 4 === 0 ? 0.2 : 0.13, ((s % 4) - 1.5) * 0.18, 0.4);
      });
      if (i >= 2) {
        const density = section ? 0.55 : 0.35;
        for (let b = 0; b < 4; b++) {
          if (Math.random() > density || (b === 3 && i % 2)) continue;
          note = Math.max(0, Math.min(CLAIRIERE_MELODY.length - 1, note + [-2, -1, -1, 1, 1, 2][Math.floor(Math.random() * 6)]));
          kalimba(ac, out, midi(CLAIRIERE_MELODY[note]), t0 + b * beat + (Math.random() < 0.3 ? beat / 2 : 0), 0.11, 0.25);
        }
      }
      if (i % 3 === 1) bird(ac, out, t0 + rand(0, BAR), 0.012);
    },
  };
}

// ───────────── 2. Pluie sur la canopée (la mineur, 68 bpm) : piano, pluie, cordes ─────────────

const PLUIE: Chord[] = [
  { r: 45, c: [57, 60, 64] }, // La m
  { r: 41, c: [53, 57, 60] }, // Fa
  { r: 48, c: [55, 60, 64] }, // Do
  { r: 43, c: [55, 59, 62] }, // Sol
  { r: 45, c: [57, 60, 64] }, // La m
  { r: 41, c: [53, 57, 60] }, // Fa
  { r: 43, c: [55, 59, 62] }, // Sol
  { r: 40, c: [56, 59, 64] }, // Mi
];
const PLUIE_MELODY: Note[][] = [
  [[0, 76], [1.5, 74], [2, 72], [3, 71]],
  [[0, 72], [2, 69]],
  [[0, 67], [1, 72], [1.5, 74], [2, 76]],
  [[0, 74], [2.5, 71]],
  [[0, 76], [1.5, 74], [2, 72], [3, 74]],
  [[0, 76], [1, 77], [2, 76], [3, 72]],
  [[0, 74], [1.5, 72], [2, 71], [3, 67]],
  [[0, 68], [2, 71], [3, 74]],
];

function pluie(): Track {
  const bpm = 68;
  const beat = 60 / bpm;
  const BAR = beat * 4;
  const bars = 34;
  return {
    id: 'pluie',
    title: 'Pluie sur la canopée',
    bpm,
    beats: 4,
    bars,
    bar(ac, out, t0, i) {
      const { section, step, outro, last } = where(i, bars);
      // la pluie, un lit de bruit continu renouvelé toutes les deux mesures (avec chevauchement)
      if (i % 2 === 0 && !last) bed(ac, out, t0, BAR * 2 + 1.5, { gain: 0.016, low: 2800, high: 8000, fade: 1.2 });
      if (Math.random() < 0.6) kalimba(ac, out, midi(rand(86, 96)), t0 + rand(0, BAR), 0.015, rand(-0.8, 0.8));
      if (outro) {
        if (!last) {
          roll(ac, out, [45, 52, 57, 60, 64, 69], t0, 0.08, 0.2);
          strings(ac, out, [57, 60, 64].map(midi), t0, BAR * 1.6, 0.028, { attack: 1.4, release: 3 });
          bass(ac, out, midi(33), t0, BAR, 0.11);
        }
        return;
      }
      const { r, c } = PLUIE[step];
      const spread = [r + 12, c[0], c[1], c[2], c[1] + 12];
      const sparse = section === 0 || section === 3;
      [0, 1, 2, 3, 4, 3, 2, 1].forEach((k, s) => {
        if (sparse && s % 2) return;
        piano(ac, out, midi(spread[k]), t0 + s * (beat / 2), (s === 0 ? 0.075 : 0.055) * (sparse ? 1.4 : 1), -0.25 + k * 0.08, 2.2);
      });
      if (section > 0) bass(ac, out, midi(r - 12), t0, BAR * 0.9, 0.1);
      if (section === 2) strings(ac, out, c.map(midi), t0, BAR - 0.2, 0.026, { attack: 1.2, release: 1.6, open: 1300 });
      if (section === 1 || section === 3) play(PLUIE_MELODY[step], t0, beat, (f, t) => piano(ac, out, f, t, 0.12, 0.15, 3));
      if (section === 2) play(PLUIE_MELODY[step], t0, beat, (f, t) => bell(ac, out, f, t, 0.045, 0.2, 2.4), 12);
    },
  };
}

// ───────────── 3. Nuit sur la savane (mi mineur, 70 bpm) : kalimba, tambour, flûte, grillons ─────────────

const SAVANE: Chord[] = [
  { r: 40, c: [59, 64, 67] }, // Mi m
  { r: 36, c: [60, 64, 67] }, // Do
  { r: 43, c: [59, 62, 67] }, // Sol
  { r: 38, c: [57, 62, 66] }, // Ré
  { r: 40, c: [59, 64, 67] }, // Mi m
  { r: 36, c: [60, 64, 67] }, // Do
  { r: 38, c: [57, 62, 66] }, // Ré
  { r: 40, c: [59, 64, 67] }, // Mi m
];
const SAVANE_MELODY: Note[][] = [
  [[0, 71, 2], [2, 74, 1], [3, 76, 1]],
  [[0, 74, 1.5], [1.5, 71, 0.5], [2, 67, 2]],
  [[0, 71, 2], [2, 69, 1], [3, 67, 1]],
  [[0, 69, 3], [3, 74, 1]],
  [[0, 76, 2], [2, 79, 1], [3, 76, 1]],
  [[0, 74, 2], [2, 71, 2]],
  [[0, 69, 1], [1, 71, 1], [2, 74, 2]],
  [[0, 71, 3.5]],
];

function savane(): Track {
  const bpm = 70;
  const beat = 60 / bpm;
  const BAR = beat * 4;
  const bars = 34;
  return {
    id: 'savane',
    title: 'Nuit sur la savane',
    bpm,
    beats: 4,
    bars,
    bar(ac, out, t0, i) {
      const { section, step, outro, last } = where(i, bars);
      for (let k = 0; k < 2; k++) if (Math.random() < 0.7) cricket(ac, out, t0 + rand(0, BAR), 0.006);
      if (outro) {
        if (!last) {
          strings(ac, out, [59, 64, 67].map(midi), t0, BAR * 1.6, 0.026, { attack: 1.2, release: 3 });
          bass(ac, out, midi(40), t0, BAR, 0.12);
          boom(ac, out, t0, 0.06, 62);
          [64, 67, 71, 76].forEach((n, k) => kalimba(ac, out, midi(n), t0 + k * 0.22, 0.09, (k - 1.5) * 0.2));
        }
        return;
      }
      const { r, c } = SAVANE[step];
      // ostinato de kalimba en croches
      const spread = [c[0], c[1], c[2], c[0] + 12, c[1] + 12];
      [1, 2, 3, 2, 4, 2, 3, 1].forEach((k, s) => {
        if (section === 0 && s % 2 && s !== 3) return;
        kalimba(ac, out, midi(spread[k]), t0 + s * (beat / 2), s % 2 ? 0.045 : 0.065, ((s % 4) - 1.5) * 0.25);
      });
      // tambour feutré, comme un cœur qui bat, et un léger hochet
      if (section > 0) {
        boom(ac, out, t0, 0.07, 62);
        boom(ac, out, t0 + beat * 2.5, 0.035, 70);
        for (let s = 1; s < 8; s += 2) tick(ac, out, t0 + s * (beat / 2), 0.008, 3200);
      }
      bass(ac, out, midi(r), t0, beat * 1.8, 0.12);
      bass(ac, out, midi(r + 7), t0 + beat * 2, beat * 1.4, 0.08);
      if (section > 0) strings(ac, out, c.map(midi), t0, BAR - 0.2, 0.02, { attack: 1.4, release: 1.6, open: 1100 });
      if (section === 1 || section === 3) play(SAVANE_MELODY[step], t0, beat, (f, t, length) => flute(ac, out, f, t, length * 0.92, 0.055, 0.1));
      if (section === 2) play(SAVANE_MELODY[step], t0, beat, (f, t) => pluck(ac, out, f, t, 0.2, -0.1, 0.55));
    },
  };
}

// ───────────── 4. Aurore sur la banquise (do lydien, 60 bpm) : cloches, piano, cordes, vent ─────────────

const BANQUISE: Chord[] = [
  { r: 36, c: [55, 59, 64, 67] }, // Do maj7
  { r: 36, c: [54, 57, 62, 66] }, // Ré / Do
  { r: 35, c: [57, 62, 66, 69] }, // Si m7
  { r: 40, c: [55, 59, 62, 67] }, // Mi m7
  { r: 36, c: [55, 59, 64, 67] }, // Do maj7
  { r: 36, c: [54, 57, 62, 66] }, // Ré / Do
  { r: 33, c: [55, 60, 64, 67] }, // La m7
  { r: 38, c: [54, 57, 62, 66] }, // Ré
];
const BANQUISE_MELODY: Note[][] = [
  [[0, 79], [2, 83]],
  [[0, 81], [3, 78]],
  [[0, 74], [2, 78]],
  [[1, 76]],
  [[0, 79], [2, 84]],
  [[0, 83], [2, 81], [3, 78]],
  [[0, 76], [2, 72]],
  [[0, 74], [2, 78]],
];

function banquise(): Track {
  const bpm = 60;
  const beat = 60 / bpm;
  const BAR = beat * 4;
  const bars = 26;
  return {
    id: 'banquise',
    title: 'Aurore sur la banquise',
    bpm,
    beats: 4,
    bars,
    bar(ac, out, t0, i) {
      const { section, step, outro, last } = where(i, bars);
      // le vent, grave et lent
      if (i % 2 === 0 && !last) bed(ac, out, t0, BAR * 2 + 2, { gain: 0.02, low: 180, high: 700, fade: 2.2, pan: rand(-0.4, 0.4) });
      if (outro) {
        if (!last) {
          roll(ac, out, [36, 48, 55, 59, 64, 67, 71], t0, 0.065, 0.25);
          strings(ac, out, [55, 59, 64, 67].map(midi), t0, BAR * 1.5, 0.026, { attack: 1.8, release: 3.5 });
          bell(ac, out, midi(83), t0 + BAR * 0.5, 0.04, 0.3, 3);
        }
        return;
      }
      const { r, c } = BANQUISE[step];
      strings(ac, out, c.map(midi), t0, BAR - 0.3, section === 0 ? 0.022 : 0.028, { attack: 2, release: 2.2, open: 1500 });
      bass(ac, out, midi(r), t0, BAR * 0.95, 0.08);
      roll(ac, out, c, t0, section === 0 ? 0.04 : 0.05, 0.2);
      if (section === 0 && step % 2 === 1) bell(ac, out, midi(c[3] + 12), t0 + beat * 2, 0.03, rand(-0.5, 0.5), 3);
      if (section === 1) play(BANQUISE_MELODY[step], t0, beat, (f, t) => bell(ac, out, f, t, 0.05, 0.2, 3.2));
      if (section === 2) {
        play(BANQUISE_MELODY[step], t0, beat, (f, t) => piano(ac, out, f, t, 0.11, 0.1, 3.4), -12);
        if (step % 2 === 0) bell(ac, out, midi(BANQUISE_MELODY[step][0][1]), t0 + beat * 2.5, 0.03, -0.3, 3);
      }
    },
  };
}

// ───────────── 5. Le récif (fa majeur, 88 bpm) : marimba, basse, bulles ─────────────

const RECIF: Chord[] = [
  { r: 41, c: [60, 65, 69] }, // Fa
  { r: 38, c: [60, 62, 65] }, // Ré m
  { r: 46, c: [58, 62, 65] }, // Si b
  { r: 36, c: [60, 64, 67] }, // Do
  { r: 41, c: [60, 65, 69] }, // Fa
  { r: 38, c: [60, 62, 65] }, // Ré m
  { r: 46, c: [58, 62, 65] }, // Si b
  { r: 36, c: [60, 64, 67] }, // Do
];
const RECIF_MELODY: Note[][] = [
  [[0, 72], [0.5, 74], [1, 77], [2.5, 74], [3, 72]],
  [[0, 69], [1.5, 72], [2, 74], [3, 77]],
  [[0, 74], [0.5, 72], [1, 70], [2, 69], [3, 67]],
  [[0, 67], [1.5, 69], [2, 72], [3.5, 67]],
  [[0, 77], [1, 79], [1.5, 77], [2, 74], [3, 72]],
  [[0, 74], [1, 77], [2, 81], [3, 79]],
  [[0, 77], [1, 74], [2, 72], [3, 70]],
  [[0, 72], [2, 67], [3, 72]],
];

function recif(): Track {
  const bpm = 88;
  const beat = 60 / bpm;
  const BAR = beat * 4;
  const bars = 42;
  // « marimba » : une corde pincée brillante doublée d'une lame de kalimba
  const marimba = (ac: AudioContext, out: Bus, f: number, t: number, gain: number, pan = 0) => {
    pluck(ac, out, f, t, gain, pan, 0.75);
    kalimba(ac, out, f, t, gain * 0.5, pan);
  };
  return {
    id: 'recif',
    title: 'Le récif',
    bpm,
    beats: 4,
    bars,
    bar(ac, out, t0, i) {
      const { section, step, outro, last } = where(i, bars);
      const bubbles = 1 + Math.floor(Math.random() * 3);
      for (let k = 0; k < bubbles; k++) bubble(ac, out, t0 + rand(0, BAR), 0.016);
      if (outro) {
        if (!last) {
          [53, 60, 65, 69, 72, 77].forEach((n, k) => marimba(ac, out, midi(n), t0 + k * 0.12, 0.12, (k - 2.5) * 0.18));
          strings(ac, out, [60, 65, 69].map(midi), t0, BAR * 1.5, 0.024, { attack: 1, release: 3 });
          bass(ac, out, midi(41), t0, BAR, 0.13);
        }
        return;
      }
      const { r, c } = RECIF[step];
      // accords syncopés sur le contretemps des temps 2 et 4
      for (const b of [1.5, 3.5]) c.forEach((n, k) => marimba(ac, out, midi(n), t0 + b * beat + k * 0.012, 0.065, (k - 1) * 0.3));
      // basse qui rebondit
      bass(ac, out, midi(r), t0, beat * 0.9, 0.13);
      bass(ac, out, midi(r + 12), t0 + beat * 1.5, beat * 0.4, 0.07);
      bass(ac, out, midi(r + 7), t0 + beat * 2, beat * 0.9, 0.1);
      if (section > 0) for (let s = 0; s < 8; s++) tick(ac, out, t0 + s * (beat / 2), s % 2 ? 0.01 : 0.006, 2800);
      if (section === 1 || section === 4) play(RECIF_MELODY[step], t0, beat, (f, t) => kalimba(ac, out, f, t, 0.15, 0.15));
      if (section === 2) {
        play(RECIF_MELODY[step], t0, beat, (f, t) => marimba(ac, out, f, t, 0.15, -0.1), 12);
        strings(ac, out, c.map(midi), t0, BAR - 0.2, 0.02, { attack: 1, release: 1.4, open: 1500 });
      }
      if (section === 3) play(RECIF_MELODY[step], t0, beat, (f, t) => piano(ac, out, f, t, 0.1, 0.1, 2.2));
    },
  };
}

// ───────────── 6. Valse des lucioles (sol majeur, 3/4, 96 bpm) : harpe, célesta, flûte ─────────────

const VALSE: Chord[] = [
  { r: 43, c: [59, 62, 67] }, // Sol
  { r: 40, c: [59, 64, 67] }, // Mi m
  { r: 36, c: [60, 64, 67] }, // Do
  { r: 38, c: [57, 62, 66] }, // Ré
  { r: 43, c: [59, 62, 67] }, // Sol
  { r: 35, c: [57, 63, 66] }, // Si 7
  { r: 40, c: [59, 64, 67] }, // Mi m
  { r: 38, c: [57, 62, 66] }, // Ré
  { r: 36, c: [60, 64, 67] }, // Do
  { r: 38, c: [57, 62, 66] }, // Ré
  { r: 43, c: [59, 62, 67] }, // Sol
  { r: 40, c: [59, 64, 67] }, // Mi m
  { r: 36, c: [60, 64, 67] }, // Do
  { r: 38, c: [57, 62, 66] }, // Ré
  { r: 43, c: [59, 62, 67] }, // Sol
  { r: 43, c: [59, 62, 67] }, // Sol
];
const VALSE_MELODY: Note[][] = [
  [[0, 74], [1, 71], [2, 74]],
  [[0, 79, 2], [2, 76]],
  [[0, 76], [1, 72], [2, 76]],
  [[0, 74, 2], [2, 69]],
  [[0, 71], [1, 74], [2, 79]],
  [[0, 78], [1, 75], [2, 78]],
  [[0, 76, 2], [2, 71]],
  [[0, 74], [1, 72], [2, 69]],
  [[0, 72], [1, 76], [2, 79]],
  [[0, 78], [1, 74], [2, 72]],
  [[0, 71], [1, 74], [2, 79]],
  [[0, 83, 2], [2, 79]],
  [[0, 81], [1, 79], [2, 76]],
  [[0, 74], [1, 78], [2, 81]],
  [[0, 79, 3]],
  [],
];

function valse(): Track {
  const bpm = 96;
  const beat = 60 / bpm;
  const BAR = beat * 3;
  const bars = 66;
  return {
    id: 'valse',
    title: 'Valse des lucioles',
    bpm,
    beats: 3,
    bars,
    bar(ac, out, t0, i) {
      const { section, step, outro, last } = where(i, bars, 16);
      if (Math.random() < 0.35) cricket(ac, out, t0 + rand(0, BAR), 0.005);
      if (outro) {
        if (!last) {
          [43, 55, 59, 62, 67, 71, 74].forEach((n, k) => pluck(ac, out, midi(n), t0 + k * 0.1, 0.15, (k - 3) * 0.12, 0.4));
          bell(ac, out, midi(79), t0 + BAR * 0.6, 0.05, 0.2, 3);
          strings(ac, out, [59, 62, 67].map(midi), t0, BAR * 2, 0.024, { attack: 1, release: 3 });
        }
        return;
      }
      const { r, c } = VALSE[step];
      // « oum-pa-pa » : basse au premier temps, accord aux deux suivants
      pluck(ac, out, midi(r + 12), t0, 0.24, -0.2, 0.35);
      bass(ac, out, midi(r), t0, beat * 1.2, 0.09);
      for (const b of [1, 2]) c.forEach((n, k) => pluck(ac, out, midi(n), t0 + b * beat + k * 0.018, b === 1 ? 0.09 : 0.075, 0.1 + k * 0.12, 0.45));
      if (section === 1 || section === 3) strings(ac, out, c.map(midi), t0, BAR - 0.15, 0.022, { attack: 0.8, release: 1.2, open: 1400 });
      const phrase = VALSE_MELODY[step];
      if (section === 0 || section === 2) play(phrase, t0, beat, (f, t) => bell(ac, out, f, t, 0.065, 0.15, 1.6), 12);
      if (section === 1) play(phrase, t0, beat, (f, t, length) => flute(ac, out, f, t, length * 0.9, 0.05, 0.1));
      if (section === 3) {
        play(phrase, t0, beat, (f, t, length) => flute(ac, out, f, t, length * 0.9, 0.045, 0.1));
        if (phrase[0]) bell(ac, out, midi(phrase[0][1] + 12), t0, 0.03, -0.2, 1.6);
      }
    },
  };
}

// ───────────── 7. Retour au nid (si bémol majeur, 58 bpm) : berceuse au piano, cordes, flûte ─────────────

const NID: Chord[] = [
  { r: 34, c: [58, 62, 65] }, // Si b
  { r: 33, c: [57, 60, 65] }, // Fa / La
  { r: 43, c: [55, 58, 62] }, // Sol m
  { r: 39, c: [55, 58, 63] }, // Mi b
  { r: 34, c: [58, 62, 65] }, // Si b
  { r: 41, c: [57, 60, 65] }, // Fa
  { r: 39, c: [55, 58, 63] }, // Mi b
  { r: 41, c: [57, 60, 65] }, // Fa
];
const NID_MELODY: Note[][] = [
  [[0, 77, 1.5], [1.5, 74, 0.5], [2, 72, 1], [3, 70, 1]],
  [[0, 72, 2], [2, 77, 2]],
  [[0, 74, 1], [1, 70, 1], [2, 67, 2]],
  [[0, 70, 2], [2, 67, 1], [3, 65, 1]],
  [[0, 74, 1], [1, 77, 1], [2, 82, 1], [3, 81, 1]],
  [[0, 79, 2], [2, 77, 2]],
  [[0, 75, 1], [1, 74, 1], [2, 72, 1], [3, 70, 1]],
  [[0, 72, 2], [2, 69, 2]],
];

function nid(): Track {
  const bpm = 58;
  const beat = 60 / bpm;
  const BAR = beat * 4;
  const bars = 26;
  return {
    id: 'nid',
    title: 'Retour au nid',
    bpm,
    beats: 4,
    bars,
    bar(ac, out, t0, i) {
      const { section, step, outro, last } = where(i, bars);
      if (i % 4 === 2) bird(ac, out, t0 + rand(0, BAR), 0.008);
      if (outro) {
        if (!last) {
          roll(ac, out, [34, 46, 58, 62, 65, 70], t0, 0.075, 0.22);
          strings(ac, out, [58, 62, 65].map(midi), t0, BAR * 1.4, 0.026, { attack: 1.6, release: 3.5 });
          bass(ac, out, midi(34), t0, BAR, 0.1);
        }
        return;
      }
      const { r, c } = NID[step];
      const spread = [r + 12, c[0], c[1], c[2]];
      [0, 1, 2, 3, 2, 1, 2, 1].forEach((k, s) => piano(ac, out, midi(spread[k]), t0 + s * (beat / 2), s === 0 ? 0.07 : 0.05, -0.2 + k * 0.1, 2.6));
      bass(ac, out, midi(r), t0, BAR * 0.9, 0.09);
      if (section > 0) strings(ac, out, c.map(midi), t0, BAR - 0.2, section === 2 ? 0.03 : 0.02, { attack: 1.5, release: 2, open: 1200 });
      if (section === 1) play(NID_MELODY[step], t0, beat, (f, t) => piano(ac, out, f, t, 0.12, 0.15, 3.2));
      if (section === 2) play(NID_MELODY[step], t0, beat, (f, t, length) => flute(ac, out, f, t, length * 0.92, 0.05, 0.15));
    },
  };
}

// ───────────── Saison : 8. Nuit des citrouilles (mi mineur, 64 bpm) : piano grave, célesta, cordes, vent ─────────────

const CITROUILLES: Chord[] = [
  { r: 40, c: [55, 59, 64] }, // Mi m
  { r: 36, c: [55, 60, 64] }, // Do
  { r: 45, c: [57, 60, 64] }, // La m
  { r: 47, c: [57, 59, 63] }, // Si 7
  { r: 40, c: [55, 59, 64] }, // Mi m
  { r: 36, c: [55, 60, 64] }, // Do
  { r: 42, c: [57, 60, 64] }, // Fa# demi-diminué
  { r: 47, c: [57, 59, 63] }, // Si 7
];
const CITROUILLES_MELODY: Note[][] = [
  [[0, 71, 1], [1, 72, 1], [2, 71, 1], [3, 67, 1]],
  [[0, 64, 2], [2, 67, 1], [3, 72, 1]],
  [[0, 71, 1.5], [1.5, 69, 0.5], [2, 72, 1], [3, 76, 1]],
  [[0, 75, 2], [2, 71, 2]],
  [[0, 76, 1], [1, 75, 1], [2, 76, 1], [3, 79, 1]],
  [[0, 79, 1], [1, 76, 1], [2, 72, 2]],
  [[0, 72, 1], [1, 69, 1], [2, 66, 1], [3, 63, 1]],
  [[0, 71, 4]],
];

/** Hulotte au loin : deux notes graves et voilées, la seconde qui tombe. */
export function owl(ac: AudioContext, out: Bus, t: number) {
  flute(ac, out, midi(64), t, 0.45, 0.018, -0.5);
  flute(ac, out, midi(62), t + 0.7, 0.9, 0.016, -0.5);
}

function citrouilles(): Track {
  const bpm = 64;
  const beat = 60 / bpm;
  const BAR = beat * 4;
  const bars = 34;
  return {
    id: 'citrouilles',
    title: 'Nuit des citrouilles',
    seasons: ['halloween'],
    bpm,
    beats: 4,
    bars,
    bar(ac, out, t0, i) {
      const { section, step, outro, last } = where(i, bars);
      // le vent dans les branches nues, et parfois une hulotte
      if (i % 4 === 0) air(ac, out, t0, BAR * 4, { gain: 0.012, from: 380, to: 900, q: 1.6, attack: BAR * 1.5, pan: -0.3, send: 0.6 });
      if (i % 8 === 5) owl(ac, out, t0 + rand(0, BAR * 0.5));
      if (outro) {
        if (!last) {
          roll(ac, out, [28, 40, 52, 55, 59, 64, 71], t0, 0.07, 0.24);
          bell(ac, out, midi(83), t0 + BAR * 0.5, 0.04, 0.2, 4);
          strings(ac, out, [55, 59, 64].map(midi), t0, BAR * 1.6, 0.026, { attack: 1.4, release: 3.5, open: 900 });
          bass(ac, out, midi(28), t0, BAR, 0.1);
        }
        return;
      }
      const { r, c } = CITROUILLES[step];
      // ostinato grave au piano, en croches : la basse, puis l'accord qui monte et redescend
      const spread = [r + 12, c[0], c[1], c[2]];
      [0, 1, 2, 3, 2, 1, 2, 1].forEach((k, s) => piano(ac, out, midi(spread[k]), t0 + s * (beat / 2), s === 0 ? 0.075 : 0.05, -0.25 + k * 0.12, 2.2));
      bass(ac, out, midi(r), t0, BAR * 0.9, 0.1);
      // un coup de timbale sourd au début de chaque phrase
      if (step === 0 || step === 4) boom(ac, out, t0, 0.12, 55);
      if (section > 0) strings(ac, out, c.map(midi), t0, BAR - 0.2, section === 2 ? 0.03 : 0.022, { attack: 1.4, release: 2, open: 900 });
      const phrase = CITROUILLES_MELODY[step];
      if (section === 1 || section === 3) play(phrase, t0, beat, (f, t) => bell(ac, out, f, t, 0.06, 0.2, 2.4), 12);
      if (section === 2) play(phrase, t0, beat, (f, t, length) => flute(ac, out, f, t, length * 0.92, 0.045, 0.15));
      if (section === 3) play(phrase, t0, beat, (f, t) => piano(ac, out, f, t, 0.05, -0.1, 2.4));
    },
  };
}

// ───────────── Saison : 9. Valse des calaveras (ré mineur, 3/4, 104 bpm) : guitare, marimba, flûte, cloches ─────────────

const CALAVERAS: Chord[] = [
  { r: 38, c: [57, 62, 65] }, // Ré m
  { r: 38, c: [57, 62, 65] }, // Ré m
  { r: 45, c: [55, 61, 64] }, // La 7
  { r: 45, c: [55, 61, 64] }, // La 7
  { r: 45, c: [55, 61, 64] }, // La 7
  { r: 45, c: [55, 61, 64] }, // La 7
  { r: 38, c: [57, 62, 65] }, // Ré m
  { r: 38, c: [57, 62, 65] }, // Ré m
  { r: 38, c: [57, 60, 66] }, // Ré 7
  { r: 38, c: [57, 60, 66] }, // Ré 7
  { r: 43, c: [55, 58, 62] }, // Sol m
  { r: 43, c: [55, 58, 62] }, // Sol m
  { r: 45, c: [57, 62, 65] }, // Ré m / La
  { r: 40, c: [55, 61, 64] }, // La 7 / Mi
  { r: 38, c: [57, 62, 65] }, // Ré m
  { r: 38, c: [57, 62, 65] }, // Ré m
];
const CALAVERAS_MELODY: Note[][] = [
  [[0, 69], [1, 74], [2, 77]],
  [[0, 76, 2], [2, 74]],
  [[0, 73], [1, 76], [2, 79]],
  [[0, 77, 2], [2, 76]],
  [[0, 76], [1, 73], [2, 69]],
  [[0, 67, 2], [2, 69]],
  [[0, 65], [1, 69], [2, 74]],
  [[0, 74, 3]],
  [[0, 72], [1, 74], [2, 78]],
  [[0, 81, 2], [2, 78]],
  [[0, 79], [1, 74], [2, 70]],
  [[0, 67, 2], [2, 70]],
  [[0, 69], [1, 74], [2, 77]],
  [[0, 76], [1, 73], [2, 67]],
  [[0, 74, 3]],
  [],
];

/** Note de marimba : les notes longues sont jouées en trémolo, comme les marimbistes du Chiapas. */
function marimbaNote(ac: AudioContext, out: Bus, freq: number, t: number, length: number, gain: number) {
  const hits = length > 1.2 ? Math.round(length * 6) : 1;
  for (let k = 0; k < hits; k++) marimba(ac, out, freq, t + (k * length) / hits, gain * (k ? 0.55 : 1), 0.15);
}

function calaveras(): Track {
  const bpm = 104;
  const beat = 60 / bpm;
  const BAR = beat * 3;
  const bars = 66;
  return {
    id: 'calaveras',
    title: 'Valse des calaveras',
    seasons: ['halloween'],
    bpm,
    beats: 3,
    bars,
    bar(ac, out, t0, i) {
      const { section, step, outro, last } = where(i, bars, 16);
      if (Math.random() < 0.3) cricket(ac, out, t0 + rand(0, BAR), 0.005);
      if (outro) {
        if (!last) {
          [38, 50, 57, 62, 65, 69, 74].forEach((n, k) => pluck(ac, out, midi(n), t0 + k * 0.09, 0.15, (k - 3) * 0.12, 0.45));
          marimbaNote(ac, out, midi(74), t0 + BAR * 0.4, 2.4, 0.1);
          bell(ac, out, midi(62), t0 + BAR * 0.6, 0.05, -0.3, 4);
          strings(ac, out, [57, 62, 65].map(midi), t0, BAR * 2, 0.024, { attack: 1, release: 3 });
        }
        return;
      }
      const { r, c } = CALAVERAS[step];
      // la guitare : « oum-pa-pa », basse au premier temps, accord aux deux suivants
      pluck(ac, out, midi(r + 12), t0, 0.24, -0.2, 0.4);
      bass(ac, out, midi(r), t0, beat * 1.2, 0.09);
      for (const b of [1, 2]) c.forEach((n, k) => pluck(ac, out, midi(n), t0 + b * beat + k * 0.02, b === 1 ? 0.1 : 0.08, 0.1 + k * 0.12, 0.5));
      // les cloches de l'église du village, au loin, en début de grille
      if (step === 0) bell(ac, out, midi(50), t0, 0.04, -0.4, 4.5);
      if (section === 1 || section === 3) strings(ac, out, c.map(midi), t0, BAR - 0.15, 0.022, { attack: 0.8, release: 1.2, open: 1300 });
      const phrase = CALAVERAS_MELODY[step];
      if (section !== 1) play(phrase, t0, beat, (f, t, length) => marimbaNote(ac, out, f, t, length, section === 3 ? 0.1 : 0.12));
      if (section === 1) play(phrase, t0, beat, (f, t, length) => flute(ac, out, f, t, length * 0.9, 0.05, 0.1));
      if (section === 2 && phrase[0]) bell(ac, out, midi(phrase[0][1] + 12), t0, 0.025, -0.2, 1.6);
    },
  };
}

// ───────────── Saison : 10. Bal des squelettes (sol mineur, 6/8, 168 croches/min) : marimba, pizzicati, célesta ─────────────

export const SQUELETTES: Chord[] = [
  { r: 43, c: [55, 58, 62] }, // Sol m
  { r: 43, c: [55, 58, 62] }, // Sol m
  { r: 48, c: [55, 60, 63] }, // Do m
  { r: 50, c: [54, 57, 60] }, // Ré 7
  { r: 43, c: [55, 58, 62] }, // Sol m
  { r: 39, c: [55, 58, 63] }, // Mi b
  { r: 48, c: [55, 60, 63] }, // Do m
  { r: 50, c: [54, 57, 60] }, // Ré 7
  { r: 43, c: [55, 58, 62] }, // Sol m
  { r: 41, c: [57, 60, 65] }, // Fa
  { r: 46, c: [58, 62, 65] }, // Si b
  { r: 39, c: [55, 58, 63] }, // Mi b
  { r: 48, c: [55, 60, 63] }, // Do m
  { r: 50, c: [54, 57, 60] }, // Ré 7
  { r: 43, c: [55, 58, 62] }, // Sol m
  { r: 43, c: [55, 58, 62] }, // Sol m
];
// en croches : position dans la mesure (0 à 5), note, durée
export const SQUELETTES_MELODY: Note[][] = [
  [[0, 74, 2], [2, 70, 1], [3, 67, 3]],
  [[0, 69, 1], [1, 70, 1], [2, 72, 1], [3, 74, 3]],
  [[0, 75, 2], [2, 74, 1], [3, 72, 3]],
  [[0, 66, 3], [3, 69, 3]],
  [[0, 74, 2], [2, 70, 1], [3, 67, 3]],
  [[0, 70, 1], [1, 72, 1], [2, 74, 1], [3, 75, 3]],
  [[0, 72, 2], [2, 75, 1], [3, 79, 2], [5, 78, 1]],
  [[0, 78, 3], [3, 74, 3]],
  [[0, 79, 2], [2, 74, 1], [3, 70, 3]],
  [[0, 77, 2], [2, 72, 1], [3, 69, 3]],
  [[0, 74, 1], [1, 77, 1], [2, 82, 1], [3, 81, 3]],
  [[0, 79, 3], [3, 75, 3]],
  [[0, 72, 1], [1, 75, 1], [2, 79, 1], [3, 84, 3]],
  [[0, 78, 2], [2, 74, 1], [3, 72, 1], [4, 69, 1], [5, 66, 1]],
  [[0, 67, 6]],
  [],
];

function squelettes(): Track {
  const bpm = 168;
  const eighth = 60 / bpm;
  const BAR = eighth * 6;
  const bars = 50;
  return {
    id: 'squelettes',
    title: 'Bal des squelettes',
    seasons: ['halloween'],
    bpm,
    beats: 6,
    bars,
    bar(ac, out, t0, i) {
      const { section, step, outro, last } = where(i, bars, 16);
      if (i % 8 === 6) owl(ac, out, t0 + rand(0, BAR * 0.5));
      if (outro) {
        if (!last) {
          [31, 43, 55, 58, 62, 67].forEach((n, k) => pluck(ac, out, midi(n), t0 + k * 0.08, 0.14, (k - 3) * 0.12, 0.35));
          marimba(ac, out, midi(79), t0 + BAR * 0.5, 0.1, 0.2);
          bell(ac, out, midi(67), t0 + BAR * 0.7, 0.045, -0.2, 4);
          strings(ac, out, [55, 58, 62].map(midi), t0, BAR * 2, 0.022, { attack: 1, release: 3, open: 900 });
        }
        return;
      }
      const { r, c } = SQUELETTES[step];
      // pizzicati : la basse sur les temps forts (1 et 4), l'accord en réponse (3 et 6)
      for (const b of [0, 3]) pluck(ac, out, midi(r), t0 + b * eighth, 0.2, -0.25, 0.3);
      bass(ac, out, midi(r - 12), t0, BAR * 0.45, 0.07);
      for (const b of [2, 5]) c.forEach((n, k) => pluck(ac, out, midi(n), t0 + b * eighth + k * 0.015, 0.075, 0.1 + k * 0.12, 0.35));
      // les os qui s'entrechoquent : un tic de bois sur chaque temps
      for (const b of [0, 3]) tick(ac, out, t0 + b * eighth, b ? 0.03 : 0.045, b ? 2400 : 1900);
      if (step === 0) boom(ac, out, t0, 0.1, 60);
      if (section === 1) strings(ac, out, c.map(midi), t0, BAR - 0.1, 0.02, { attack: 0.6, release: 1, open: 1100 });
      const phrase = SQUELETTES_MELODY[step];
      if (section === 0 || section === 2) play(phrase, t0, eighth, (f, t) => marimba(ac, out, f, t, 0.12, 0.15));
      if (section === 1) play(phrase, t0, eighth, (f, t) => bell(ac, out, f, t, 0.055, 0.2, 1.8), 12);
      if (section === 2 && phrase[0]) bell(ac, out, midi(phrase[0][1] + 12), t0, 0.022, -0.2, 1.4);
    },
  };
}

// ───────────── Jour des morts : la seconde voix, une tierce sous la mélodie ─────────────

const RE_MAJEUR = [2, 4, 6, 7, 9, 11, 1];
const SOL_MAJEUR = [7, 9, 11, 0, 2, 4, 6];
const DO_MAJEUR = [0, 2, 4, 5, 7, 9, 11];
const LA_MINEUR = [9, 11, 0, 2, 4, 5, 7];
const LA_MINEUR_HARMONIQUE = [9, 11, 0, 2, 4, 5, 8];

/** La phrase descendue de deux degrés dans la gamme donnée (classes de hauteur) : les tierces des violons mexicains. */
function below(phrase: Note[], scale: number[]): Note[] {
  return phrase.map(([b, note, length]) => {
    let n = note;
    for (let steps = 0; steps < 2; ) if (scale.includes((--n % 12 + 12) % 12)) steps++;
    return [b, n, length];
  });
}

// ───────────── Jour des morts : 11. Huapango du cempasúchil (ré majeur, 6/8 et 3/4, 186 croches/min) ─────────────
// Le son huasteco : la jarana gratte chaque croche, le guitarrón marque la basse, et la mesure balance entre 6/8
// (deux temps de trois croches) et 3/4 (trois temps de deux croches), la « sesquiáltera » du huapango.

const HUAPANGO: Chord[] = [
  { r: 38, c: [62, 66, 69] }, // Ré
  { r: 45, c: [61, 64, 67] }, // La 7
  { r: 45, c: [61, 64, 67] }, // La 7
  { r: 38, c: [62, 66, 69] }, // Ré
  { r: 43, c: [62, 67, 71] }, // Sol
  { r: 38, c: [62, 66, 69] }, // Ré
  { r: 45, c: [61, 64, 67] }, // La 7
  { r: 38, c: [62, 66, 69] }, // Ré
  { r: 43, c: [62, 67, 71] }, // Sol
  { r: 43, c: [62, 67, 71] }, // Sol
  { r: 38, c: [62, 66, 69] }, // Ré
  { r: 38, c: [62, 66, 69] }, // Ré
  { r: 45, c: [61, 64, 67] }, // La 7
  { r: 45, c: [61, 64, 67] }, // La 7
  { r: 38, c: [62, 66, 69] }, // Ré
  { r: 38, c: [62, 66, 69] }, // Ré
];
// en croches : position dans la mesure (0 à 5), note, durée
const HUAPANGO_MELODY: Note[][] = [
  [[0, 74, 2], [2, 76, 1], [3, 78, 3]],
  [[0, 79, 2], [2, 78, 1], [3, 76, 3]],
  [[0, 73, 1], [1, 76, 1], [2, 79, 1], [3, 81, 3]],
  [[0, 78, 3], [3, 74, 3]],
  [[0, 71, 1], [1, 74, 1], [2, 79, 1], [3, 83, 2], [5, 81, 1]],
  [[0, 81, 2], [2, 78, 1], [3, 74, 3]],
  [[0, 76, 1], [1, 79, 1], [2, 76, 1], [3, 73, 2], [5, 76, 1]],
  [[0, 74, 6]],
  [[0, 79, 3], [3, 83, 3]],
  [[0, 81, 1], [1, 79, 1], [2, 78, 1], [3, 79, 3]],
  [[0, 78, 2], [2, 81, 1], [3, 86, 3]],
  [[0, 85, 1], [1, 83, 1], [2, 81, 1], [3, 78, 3]],
  [[0, 76, 2], [2, 79, 1], [3, 81, 2], [5, 79, 1]],
  [[0, 78, 1], [1, 76, 1], [2, 73, 1], [3, 69, 3]],
  [[0, 74, 1], [1, 78, 1], [2, 81, 1], [3, 86, 3]],
  [[0, 74, 6]],
];

function huapango(): Track {
  const bpm = 186;
  const eighth = 60 / bpm;
  const BAR = eighth * 6;
  const bars = 50;
  return {
    id: 'huapango',
    title: 'Huapango du cempasúchil',
    seasons: ['muertos'],
    bpm,
    beats: 6,
    bars,
    bar(ac, out, t0, i) {
      const { section, step, outro, last } = where(i, bars, 16);
      if (outro) {
        if (!last) {
          // le rasgueo final de la jarana, puis la note tenue du violon
          for (let k = 0; k < 6; k++) [50, 57, 62, 66, 69].forEach((n, j) => pluck(ac, out, midi(n), t0 + k * 0.06 + j * 0.012, 0.09, (j - 2) * 0.15, 0.6));
          bass(ac, out, midi(38), t0, BAR, 0.1);
          flute(ac, out, midi(74), t0 + 0.4, BAR * 1.4, 0.04, 0.15);
          marimbaNote(ac, out, midi(86), t0 + BAR * 0.5, 2.4, 0.08);
        }
        return;
      }
      const { r, c } = HUAPANGO[step];
      // la sesquiáltera : 6/8 sur les mesures paires, 3/4 sur les impaires
      const accents = step % 2 === 0 ? [0, 3] : [0, 2, 4];
      // la jarana : un accord gratté sur chaque croche, plus fort sur les temps
      for (let e = 0; e < 6; e++) {
        const strong = accents.includes(e);
        const down = e % 2 === 0;
        const notes = down ? [r + 12, ...c] : [...c].reverse();
        notes.forEach((n, k) => pluck(ac, out, midi(n), t0 + e * eighth + k * 0.011, strong ? 0.075 : 0.04, -0.15 + k * 0.1, strong ? 0.6 : 0.45));
      }
      // le guitarrón : la basse sur les temps, la quinte en réponse
      accents.forEach((e, k) => bass(ac, out, midi(k % 2 ? r + 7 : r), t0 + e * eighth, eighth * 1.6, 0.1));
      // le zapateado des danseurs, sur le bois de la tarima
      for (const e of accents) tick(ac, out, t0 + e * eighth, 0.03, 1500);
      if (step === 0) boom(ac, out, t0, 0.06, 70);
      const phrase = HUAPANGO_MELODY[step];
      // le violon (la flûte) en tierces au deuxième passage, la marimba aux autres
      if (section === 0 || section === 2) play(phrase, t0, eighth, (f, t, length) => marimbaNote(ac, out, f, t, length * 1.4, 0.11));
      if (section === 1) {
        play(phrase, t0, eighth, (f, t, length) => flute(ac, out, f, t, length * 0.9, 0.045, 0.15));
        play(below(phrase, RE_MAJEUR), t0, eighth, (f, t, length) => flute(ac, out, f, t, length * 0.9, 0.026, -0.2));
      }
      if (section === 2 && phrase[0]) bell(ac, out, midi(phrase[0][1] + 12), t0, 0.02, -0.2, 1.4);
    },
  };
}

// ───────────── Jour des morts : 12. Bolero de la Catrina (la mineur, 4/4, 80 bpm) : trio de guitares, maracas ─────────────
// Le boléro des trios mexicains : la basse sur un et trois, la guitare qui gratte le rythme du boléro, les maracas,
// et le requinto (la petite guitare aiguë) qui chante la mélodie ; une flûte et des cordes la reprennent ensuite.

const BOLERO: Chord[] = [
  { r: 45, c: [60, 64, 69] }, // La m
  { r: 45, c: [60, 64, 69] }, // La m
  { r: 38, c: [62, 65, 69] }, // Ré m
  { r: 38, c: [62, 65, 69] }, // Ré m
  { r: 40, c: [62, 64, 68] }, // Mi 7
  { r: 40, c: [62, 64, 68] }, // Mi 7
  { r: 45, c: [60, 64, 69] }, // La m
  { r: 40, c: [62, 64, 68] }, // Mi 7
  { r: 48, c: [60, 64, 67] }, // Do
  { r: 48, c: [60, 64, 67] }, // Do
  { r: 43, c: [59, 62, 65] }, // Sol 7
  { r: 43, c: [59, 62, 65] }, // Sol 7
  { r: 38, c: [62, 65, 69] }, // Ré m
  { r: 45, c: [60, 64, 69] }, // La m
  { r: 40, c: [62, 64, 68] }, // Mi 7
  { r: 45, c: [60, 64, 69] }, // La m
];
const BOLERO_MELODY: Note[][] = [
  [[0, 76, 1.5], [1.5, 74, 0.5], [2, 72, 1], [3, 71, 1]],
  [[0, 72, 3], [3, 76, 1]],
  [[0, 77, 1.5], [1.5, 76, 0.5], [2, 74, 1], [3, 72, 1]],
  [[0, 74, 3], [3, 77, 1]],
  [[0, 76, 1.5], [1.5, 74, 0.5], [2, 71, 1], [3, 68, 1]],
  [[0, 71, 2], [2, 74, 1], [3, 76, 1]],
  [[0, 72, 1], [1, 71, 1], [2, 69, 2]],
  [[0, 68, 1], [1, 71, 1], [2, 74, 1], [3, 76, 1]],
  [[0, 79, 1.5], [1.5, 77, 0.5], [2, 76, 1], [3, 74, 1]],
  [[0, 76, 3], [3, 79, 1]],
  [[0, 77, 1.5], [1.5, 76, 0.5], [2, 74, 1], [3, 71, 1]],
  [[0, 74, 3], [3, 77, 1]],
  [[0, 77, 1], [1, 76, 1], [2, 74, 1], [3, 72, 1]],
  [[0, 72, 1], [1, 74, 1], [2, 76, 2]],
  [[0, 74, 1.5], [1.5, 72, 0.5], [2, 71, 1], [3, 68, 1]],
  [[0, 69, 4]],
];

/** Note de requinto : pincée claire, doublée d'un trémolo sur les notes longues. */
function requinto(ac: AudioContext, out: Bus, freq: number, t: number, length: number, gain: number) {
  const hits = length > 1.6 ? Math.round(length * 4) : 1;
  for (let k = 0; k < hits; k++) pluck(ac, out, freq, t + (k * length) / hits, gain * (k ? 0.6 : 1), 0.2, 0.7);
}

function bolero(): Track {
  const bpm = 80;
  const beat = 60 / bpm;
  const BAR = beat * 4;
  const bars = 34;
  return {
    id: 'bolero',
    title: 'Bolero de la Catrina',
    seasons: ['muertos'],
    bpm,
    beats: 4,
    bars,
    bar(ac, out, t0, i) {
      const { section, step, outro, last } = where(i, bars, 16);
      if (Math.random() < 0.25) cricket(ac, out, t0 + rand(0, BAR), 0.004);
      if (outro) {
        if (!last) {
          [33, 45, 52, 57, 60, 64, 69, 76].forEach((n, k) => pluck(ac, out, midi(n), t0 + k * 0.1, 0.13, (k - 4) * 0.1, 0.5));
          requinto(ac, out, midi(81), t0 + BAR * 0.5, 2.4, 0.12);
          strings(ac, out, [57, 60, 64].map(midi), t0, BAR * 1.6, 0.024, { attack: 1, release: 3.5 });
          bass(ac, out, midi(33), t0, BAR, 0.1);
        }
        return;
      }
      const { r, c } = BOLERO[step];
      // la basse sur un et trois (la fondamentale, puis la quinte)
      bass(ac, out, midi(r), t0, beat * 1.4, 0.1);
      bass(ac, out, midi(r + 7), t0 + beat * 2, beat * 1.4, 0.08);
      // la guitare : le rythme du boléro, accords grattés sur 1, 2 et, 3 et 4
      for (const [b, g] of [[0, 0.07], [1.5, 0.05], [2, 0.06], [3, 0.05]] as const) {
        c.forEach((n, k) => pluck(ac, out, midi(n), t0 + b * beat + k * 0.018, g, -0.2 + k * 0.12, 0.42));
      }
      // les maracas sur chaque croche, plus marquées sur les temps
      for (let e = 0; e < 8; e++) tick(ac, out, t0 + e * (beat / 2), e % 2 ? 0.012 : 0.018, 5200);
      // le bongo : deux coups légers en fin de mesure
      tick(ac, out, t0 + beat * 3.5, 0.03, 900);
      tick(ac, out, t0 + beat * 3.75, 0.02, 1200);
      if (section === 1) strings(ac, out, c.map(midi), t0, BAR - 0.2, 0.02, { attack: 1, release: 1.6, open: 1100 });
      const phrase = BOLERO_MELODY[step];
      if (section === 0) play(phrase, t0, beat, (f, t, length) => requinto(ac, out, f, t, length, 0.13));
      if (section === 1) {
        play(phrase, t0, beat, (f, t, length) => flute(ac, out, f, t, length * 0.92, 0.045, 0.1));
        // la seconde voix, une tierce plus bas (avec le sol dièse sur l'accord de mi 7)
        play(below(phrase, c.includes(68) ? LA_MINEUR_HARMONIQUE : LA_MINEUR), t0, beat, (f, t, length) => requinto(ac, out, f, t, length, 0.06));
      }
    },
  };
}

// ───────────── Jour des morts : 13. Marimba de l'ofrenda (sol majeur, 3/4, 138 bpm) : trois marimbas ─────────────
// Le son chiapanèque : la grande marimba du Chiapas jouée à plusieurs. La basse marque le premier temps, l'accord
// répond sur les deux autres (« oum-pa-pa »), le soliste chante la mélodie en trémolo et le second la double à la tierce.

const MARIMBA: Chord[] = [
  { r: 43, c: [59, 62, 67] }, // Sol
  { r: 43, c: [59, 62, 67] }, // Sol
  { r: 38, c: [60, 62, 66] }, // Ré 7
  { r: 38, c: [60, 62, 66] }, // Ré 7
  { r: 38, c: [60, 62, 66] }, // Ré 7
  { r: 38, c: [60, 62, 66] }, // Ré 7
  { r: 43, c: [59, 62, 67] }, // Sol
  { r: 43, c: [59, 62, 67] }, // Sol
  { r: 43, c: [59, 65, 67] }, // Sol 7
  { r: 43, c: [59, 65, 67] }, // Sol 7
  { r: 48, c: [60, 64, 67] }, // Do
  { r: 48, c: [60, 64, 67] }, // Do
  { r: 43, c: [59, 62, 67] }, // Sol
  { r: 38, c: [60, 62, 66] }, // Ré 7
  { r: 43, c: [59, 62, 67] }, // Sol
  { r: 43, c: [59, 62, 67] }, // Sol
];
const MARIMBA_MELODY: Note[][] = [
  [[0, 74, 1], [1, 76, 0.5], [1.5, 74, 0.5], [2, 71, 1]],
  [[0, 67, 1], [1, 71, 1], [2, 74, 1]],
  [[0, 72, 1], [1, 74, 0.5], [1.5, 72, 0.5], [2, 69, 1]],
  [[0, 66, 1], [1, 69, 1], [2, 72, 1]],
  [[0, 74, 1.5], [1.5, 72, 0.5], [2, 69, 1]],
  [[0, 72, 1], [1, 71, 1], [2, 69, 1]],
  [[0, 71, 1], [1, 74, 1], [2, 79, 1]],
  [[0, 79, 3]],
  [[0, 77, 1], [1, 79, 0.5], [1.5, 77, 0.5], [2, 74, 1]],
  [[0, 71, 1], [1, 74, 1], [2, 77, 1]],
  [[0, 76, 1.5], [1.5, 74, 0.5], [2, 72, 1]],
  [[0, 72, 1], [1, 76, 1], [2, 79, 1]],
  [[0, 79, 1], [1, 78, 0.5], [1.5, 76, 0.5], [2, 74, 1]],
  [[0, 72, 1], [1, 69, 1], [2, 66, 1]],
  [[0, 67, 1], [1, 71, 1], [2, 74, 1]],
  [[0, 79, 3]],
];

function marimbaOfrenda(): Track {
  const bpm = 138;
  const beat = 60 / bpm;
  const BAR = beat * 3;
  const bars = 66;
  return {
    id: 'marimba',
    title: 'Marimba de l’ofrenda',
    seasons: ['muertos'],
    bpm,
    beats: 3,
    bars,
    bar(ac, out, t0, i) {
      const { section, step, outro, last } = where(i, bars, 16);
      if (outro) {
        if (!last) {
          [43, 55, 59, 62, 67, 71, 74, 79].forEach((n, k) => marimba(ac, out, midi(n), t0 + k * 0.07, 0.11, (k - 4) * 0.1));
          marimbaNote(ac, out, midi(79), t0 + BAR * 0.6, 2.4, 0.1);
          marimbaNote(ac, out, midi(71), t0 + BAR * 0.6, 2.4, 0.06);
          bass(ac, out, midi(31), t0, BAR * 1.5, 0.09);
        }
        return;
      }
      const { r, c } = MARIMBA[step];
      // la marimba grave : la basse au premier temps ; l'accord sur les deux autres
      marimba(ac, out, midi(r), t0, 0.16, -0.25);
      bass(ac, out, midi(r - 12), t0, beat * 1.1, 0.07);
      for (const b of [1, 2]) c.forEach((n, k) => marimba(ac, out, midi(n), t0 + b * beat + k * 0.012, b === 1 ? 0.07 : 0.055, -0.05 + k * 0.1));
      // le claquement des baguettes sur le bois du cadre, en début de phrase
      if (step % 4 === 0) tick(ac, out, t0, 0.025, 2100);
      const phrase = MARIMBA_MELODY[step];
      const scale = c.includes(65) ? DO_MAJEUR : SOL_MAJEUR;
      play(phrase, t0, beat, (f, t, length) => marimbaNote(ac, out, f, t, length, section === 0 ? 0.12 : 0.11), 12);
      if (section >= 1) play(below(phrase, scale), t0, beat, (f, t, length) => marimbaNote(ac, out, f, t, length, 0.065), 12);
      if (section === 2) play(phrase, t0, beat, (f, t, length) => flute(ac, out, f, t, length * 0.9, 0.03, 0.2));
    },
  };
}

// ───────────── Jour des morts : 14. Danzón des monarques (fa majeur, 4/4, 100 bpm) : flûte, piano, cordes, güiro ─────────────
// Le danzón des salles de bal de Veracruz et de Mexico : le cinquillo (cinq coups sur huit croches) au piano et au
// timbal, le güiro qui gratte, la basse qui anticipe, et la flûte qui mène la danse, reprise par les violons.

const DANZON: Chord[] = [
  { r: 41, c: [60, 65, 69] }, // Fa
  { r: 41, c: [60, 65, 69] }, // Fa
  { r: 43, c: [58, 62, 67] }, // Sol m
  { r: 36, c: [58, 64, 67] }, // Do 7
  { r: 36, c: [58, 64, 67] }, // Do 7
  { r: 36, c: [58, 64, 67] }, // Do 7
  { r: 41, c: [60, 65, 69] }, // Fa
  { r: 41, c: [60, 65, 69] }, // Fa
  { r: 41, c: [60, 63, 69] }, // Fa 7
  { r: 46, c: [58, 62, 65] }, // Si b
  { r: 46, c: [58, 61, 65] }, // Si b m
  { r: 41, c: [60, 65, 69] }, // Fa
  { r: 38, c: [57, 62, 65] }, // Ré m
  { r: 43, c: [58, 62, 67] }, // Sol m
  { r: 36, c: [58, 64, 67] }, // Do 7
  { r: 41, c: [60, 65, 69] }, // Fa
];
const DANZON_MELODY: Note[][] = [
  [[0, 72, 1], [1.5, 74, 0.5], [2, 76, 1], [3, 77, 1]],
  [[0, 81, 2], [2.5, 79, 0.5], [3, 77, 1]],
  [[0, 79, 1], [1.5, 77, 0.5], [2, 74, 1], [3, 70, 1]],
  [[0, 72, 3], [3, 70, 1]],
  [[0, 76, 1], [1.5, 79, 0.5], [2, 82, 1], [3, 79, 1]],
  [[0, 76, 1], [1, 74, 1], [2, 72, 2]],
  [[0, 69, 1], [1.5, 72, 0.5], [2, 77, 1], [3, 81, 1]],
  [[0, 77, 4]],
  [[0, 84, 1], [1.5, 82, 0.5], [2, 81, 1], [3, 75, 1]],
  [[0, 74, 2], [2, 77, 1], [3, 82, 1]],
  [[0, 82, 1], [1.5, 80, 0.5], [2, 77, 1], [3, 73, 1]],
  [[0, 72, 3], [3, 74, 1]],
  [[0, 77, 1], [1.5, 76, 0.5], [2, 74, 1], [3, 69, 1]],
  [[0, 70, 1], [1, 74, 1], [2, 79, 1], [3, 77, 1]],
  [[0, 76, 1.5], [1.5, 74, 0.5], [2, 72, 1], [3, 70, 1]],
  [[0, 65, 4]],
];
/** le cinquillo : les croches jouées sur les huit de la mesure */
const CINQUILLO = [0, 2, 3, 5, 6];

function danzon(): Track {
  const bpm = 100;
  const beat = 60 / bpm;
  const eighth = beat / 2;
  const BAR = beat * 4;
  const bars = 50;
  return {
    id: 'danzon',
    title: 'Danzón des monarques',
    seasons: ['muertos'],
    bpm,
    beats: 4,
    bars,
    bar(ac, out, t0, i) {
      const { section, step, outro, last } = where(i, bars, 16);
      if (outro) {
        if (!last) {
          roll(ac, out, [29, 41, 53, 57, 60, 65, 69, 77], t0, 0.07, 0.1);
          flute(ac, out, midi(77), t0 + 0.3, BAR * 1.3, 0.04, 0.15);
          strings(ac, out, [57, 60, 65].map(midi), t0, BAR * 1.6, 0.024, { attack: 1, release: 3.5 });
          bass(ac, out, midi(29), t0, BAR, 0.1);
        }
        return;
      }
      const { r, c } = DANZON[step];
      // la basse : la fondamentale au premier temps, la quinte anticipée sur le « et » du troisième
      bass(ac, out, midi(r), t0, beat * 1.4, 0.1);
      bass(ac, out, midi(r + 7), t0 + 5 * eighth, beat * 1.2, 0.08);
      // le piano et le timbal sur le cinquillo
      for (const e of CINQUILLO) {
        c.forEach((n, k) => piano(ac, out, midi(n), t0 + e * eighth + k * 0.01, e === 0 ? 0.045 : 0.032, -0.15 + k * 0.12, 1.2));
        tick(ac, out, t0 + e * eighth, e === 0 ? 0.03 : 0.02, 1300);
      }
      // le güiro : un long grattement puis deux courts, à chaque temps
      for (let b = 0; b < 4; b++) {
        air(ac, out, t0 + b * beat, eighth * 0.9, { gain: 0.012, from: 2600, to: 4200, q: 3, attack: 0.02, pan: 0.35, send: 0.1 });
        tick(ac, out, t0 + b * beat + eighth, 0.01, 4200);
        tick(ac, out, t0 + b * beat + eighth * 1.5, 0.008, 4400);
      }
      if (section >= 1) strings(ac, out, c.map(midi), t0, BAR - 0.2, 0.02, { attack: 0.8, release: 1.4, open: 1200 });
      const phrase = DANZON_MELODY[step];
      if (section !== 1) play(phrase, t0, beat, (f, t, length) => flute(ac, out, f, t, length * 0.9, 0.05, 0.15));
      if (section === 1) {
        play(phrase, t0, beat, (f, t, length) => strings(ac, out, [f], t, length * 0.95, 0.035, { attack: 0.08, release: 0.4, open: 2400 }));
        play(phrase, t0, beat, (f, t) => piano(ac, out, f, t, 0.035, 0.1, 1.6), -12);
      }
    },
  };
}

/**
 * Les morceaux de la radio : les sept de toujours ou, pendant une fête, les siens seulement (Halloween : citrouilles,
 * calaveras, squelettes ; Jour des morts : huapango, boléro, marimba et danzón).
 */
export function allTracks(now: number = Date.now()): Track[] {
  const season = seasonAt(now);
  if (season === 'halloween') return [citrouilles(), calaveras(), squelettes()];
  if (season === 'muertos') return [huapango(), bolero(), marimbaOfrenda(), danzon()];
  return [clairiere(), pluie(), savane(), banquise(), recif(), valse(), nid()];
}
