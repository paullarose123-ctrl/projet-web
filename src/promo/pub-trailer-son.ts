// Bande-son de la bande-annonce (promo/pub-trailer.html), rendue hors ligne (OfflineAudioContext) et calée sur
// l'image : 120 battements par minute (un temps = 0,5 s), en ré majeur comme la musique du jeu (Ré, Si m, Sol, La).
// Batterie et basse synthétisées ici ; harpe, kalimba, marimba, cloches et cordes viennent du moteur du jeu.
// Que de la musique : aucun bruitage.
import { bell, createBus, kalimba, marimba, midi, pluck, strings, bass as roundBass, type Bus } from '../audio/engine';

type Ctx = AudioContext;

const PROG = [
  { root: 38, chord: [62, 66, 69] }, // Ré
  { root: 35, chord: [59, 62, 66] }, // Si m
  { root: 43, chord: [59, 62, 67] }, // Sol
  { root: 45, chord: [61, 64, 69] }, // La
];
const chordAt = (t: number) => PROG[(((Math.floor((t - 4) / 2) % 4) + 4) % 4)];

let noise: AudioBuffer | null = null;
function noiseSrc(ac: Ctx) {
  if (!noise) {
    noise = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
    const d = noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const src = ac.createBufferSource();
  src.buffer = noise;
  src.loop = true;
  return src;
}

function env(ac: Ctx, t: number, peak: number, attack: number, decay: number) {
  const g = ac.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
  return g;
}

function noiseHit(ac: Ctx, out: AudioNode, t: number, o: { type: BiquadFilterType; freq: number; q?: number; gain: number; attack?: number; decay: number; to?: number }) {
  const src = noiseSrc(ac);
  const f = ac.createBiquadFilter();
  f.type = o.type;
  f.frequency.setValueAtTime(o.freq, t);
  if (o.to) f.frequency.exponentialRampToValueAtTime(o.to, t + (o.attack ?? 0.002) + o.decay);
  f.Q.value = o.q ?? 0.8;
  const g = env(ac, t, o.gain, o.attack ?? 0.002, o.decay);
  src.connect(f).connect(g).connect(out);
  src.start(t, Math.random() * 1.5);
  src.stop(t + (o.attack ?? 0.002) + o.decay + 0.05);
}

// ───────────── batterie ─────────────

function kick(ac: Ctx, out: AudioNode, t: number, gain = 0.9) {
  const o = ac.createOscillator();
  o.type = 'sine';
  o.frequency.setValueAtTime(170, t);
  o.frequency.exponentialRampToValueAtTime(48, t + 0.11);
  const g = env(ac, t, gain, 0.002, 0.42);
  o.connect(g).connect(out);
  o.start(t);
  o.stop(t + 0.5);
  noiseHit(ac, out, t, { type: 'highpass', freq: 2500, gain: gain * 0.18, decay: 0.012 });
}

function hat(ac: Ctx, out: AudioNode, t: number, gain = 0.07, open = false) {
  noiseHit(ac, out, t, { type: 'highpass', freq: 7500, gain, decay: open ? 0.22 : 0.04 });
}

function crash(ac: Ctx, out: AudioNode, t: number, gain = 0.16) {
  noiseHit(ac, out, t, { type: 'highpass', freq: 4800, gain, decay: 1.1 });
  noiseHit(ac, out, t, { type: 'bandpass', freq: 9000, q: 0.6, gain: gain * 0.5, decay: 0.8 });
}

// ───────────── accents ─────────────

/** accord doux : cordes qui montent sans à-coup et harpe arpégée, comme les instruments du jeu */
function stab(ac: Ctx, bus: Bus, t: number, notes: number[], gain = 0.07, dur = 0.45) {
  strings(ac, bus, notes.map(midi), t, Math.max(0.8, dur), gain * 0.55, { attack: 0.18, release: Math.max(0.8, dur), open: 2400 });
  notes.forEach((n, i) => pluck(ac, bus, midi(n + 12), t + i * 0.04, gain * 1.5, (i / Math.max(1, notes.length - 1) - 0.5) * 0.6, 0.45));
}

function sparkleRun(ac: Ctx, fx: Bus, t: number, notes: number[], step = 0.0625, gain = 0.05) {
  notes.forEach((n, i) => bell(ac, fx, midi(n), t + i * step, gain, (i % 2 ? 0.4 : -0.4) * Math.random(), 1.6));
}

// ───────────── la partition ─────────────

const SR = 44100;

/** la musique du montage d'origine (25 s) */
async function renderMain(duration: number): Promise<AudioBuffer> {
  const off = new OfflineAudioContext(2, Math.ceil(SR * duration), SR);
  const ac = off as unknown as Ctx;
  noise = null;
  const music = createBus(ac, 1.1, 0.22);
  const chimes = createBus(ac, 0.9, 0.35);
  const drums = createBus(ac, 0.8, 0.06).dry;
  const orch = createBus(ac, 1.2, 0.3);
  // rien que de la musique : pas de bruitage, les temps forts tombent sur les coupes de l'image

  // ── 0 à 2 s : nappe de cordes, harpe qui monte, la pulsation arrive
  strings(ac, music, [midi(38), midi(45), midi(50), midi(57)], 0, 4, 0.04, { attack: 1.2, release: 1, open: 1200 });
  [62, 66, 69, 74, 66, 69, 74, 78, 69, 74, 78, 81, 74, 78, 81, 86].forEach((n, i) => pluck(ac, music, midi(n), i * 0.125, 0.11, i % 2 ? 0.3 : -0.3, 0.5));
  kick(ac, drums, 0.5, 0.25);
  kick(ac, drums, 1.5, 0.3);

  // ── 2 s : premier temps fort
  kick(ac, drums, 2.0, 0.35);
  stab(ac, orch, 2.0, [50, 62, 66, 69], 0.05, 0.9);
  sparkleRun(ac, chimes, 2.02, [81, 86, 90, 93], 0.08, 0.04);
  roundBass(ac, music, midi(38), 2.0, 0.95, 0.2);
  // la carte du milieu monte : les cordes s'ouvrent
  strings(ac, music, [midi(50), midi(57), midi(62), midi(64)], 2.95, 1.05, 0.045, { attack: 0.95, release: 0.3, open: 3000 });

  // ── 4 s : Légendaire
  crash(ac, drums, 4.0, 0.05);
  stab(ac, orch, 4.0, [50, 62, 66, 69], 0.06, 1.2);
  strings(ac, music, [midi(50), midi(62), midi(66), midi(69), midi(74)], 4.0, 1.2, 0.05, { attack: 0.06, release: 2, open: 3400 });
  [62, 66, 69, 74, 78, 81, 86].forEach((n, i) => pluck(ac, music, midi(n), 4.0 + i * 0.07, 0.14, (i - 3) * 0.12, 0.45));
  bell(ac, chimes, midi(86), 4.45, 0.05, 0.2, 3);

  // ── la pulsation, douce : de 4 s à 24 s (un battement par seconde, une basse tenue, un léger souffle de balai)
  for (let t = 4.0; t < 24.0 - 1e-6; t += 0.5) {
    const inBar = (t - 4) % 2;
    const half = t >= 11 && t < 12.5; // passage aérien des ultra-rares
    const suspense = t >= 13.5 && t < 15; // le duel : les mesures sont cachées
    const onBeat = inBar === 0 || inBar === 1;
    if (onBeat && !half) kick(ac, drums, t, suspense ? 0.22 : 0.32);
    if (!half) hat(ac, drums, t + 0.25, 0.025);
    if (onBeat && !half) roundBass(ac, music, midi(chordAt(t).root), t, 0.95, suspense ? 0.16 : 0.22);
  }
  for (let bar = 4; bar < 24; bar += 2) {
    const { chord, root } = chordAt(bar);
    if (bar >= 11 && bar < 13) continue;
    stab(ac, orch, bar, [root + 12, ...chord], 0.04, 1.6);
    strings(ac, music, chord.map(midi), bar, 2, 0.022, { attack: 0.5, release: 0.8, open: 1800 });
  }

  // ── 7 à 11 s : un accord sur chaque animal
  for (let i = 0; i < 4; i++) {
    const t = 7 + i;
    const { chord } = chordAt(t);
    [0, 1, 2].forEach((k) => pluck(ac, music, midi(chord[k] + 24), t + k * 0.08, 0.08, (k - 1) * 0.3, 0.45));
  }

  // ── 11 à 13 s : les ultra-rares, des cloches qui scintillent
  [11.25, 11.75, 12.25].forEach((t, i) => sparkleRun(ac, chimes, t, [[81, 86, 90, 93], [83, 86, 90, 95], [86, 90, 93, 98]][i], 0.06, 0.05));
  strings(ac, music, [midi(62), midi(69), midi(74), midi(78), midi(81)], 11.0, 2, 0.04, { attack: 0.4, release: 0.8, open: 4500 });

  // ── 13 à 17 s : le duel de records, suspense puis la réponse
  stab(ac, orch, 13.0, [47, 59, 62, 66], 0.04, 1.2);
  strings(ac, music, [midi(47), midi(54), midi(59), midi(62), midi(66)], 13.5, 1.5, 0.04, { attack: 0.8, release: 0.3, open: 2000 });
  for (let t = 13.5; t < 14.5; t += 0.5) marimba(ac, music, midi(t % 1 ? 78 : 74), t, 0.06, 0);
  stab(ac, orch, 15.0, [38, 50, 62, 66, 69, 74], 0.055, 1.4);
  [74, 78, 81, 86, 90].forEach((n, i) => pluck(ac, music, midi(n), 15.0 + i * 0.07, 0.11, (i - 2) * 0.2, 0.45));
  bell(ac, chimes, midi(93), 15.25, 0.06, 0, 2.5);

  // ── 17 à 19,5 s : la réserve, un air de marimba
  const tune = [74, 79, 83, 78, 76, 81, 85, 81, 78, 76];
  tune.forEach((n, i) => marimba(ac, music, midi(n), 17.0 + i * 0.25, 0.09, i % 2 ? 0.3 : -0.3));

  // ── 19,5 s : le final
  crash(ac, drums, 19.5, 0.04);
  stab(ac, orch, 19.5, [38, 50, 62, 66, 69, 74], 0.06, 1.6);
  bell(ac, chimes, midi(86), 19.7, 0.06, 0, 3);
  for (let t = 20.0; t < 24.0 - 1e-6; t += 0.25) {
    const { chord } = chordAt(t);
    const step = Math.round((t - 20) / 0.25) % 8;
    const notes = [chord[0], chord[1], chord[2], chord[0] + 12, chord[1] + 12, chord[2] + 12, chord[0] + 12, chord[2]];
    pluck(ac, music, midi(notes[step] + 12), t, 0.09, step % 2 ? 0.35 : -0.35, 0.45);
  }
  [74, 78, 81, 86].forEach((n, i) => kalimba(ac, chimes, midi(n), 20.8 + i * 0.08, 0.1, (i - 1.5) * 0.3));
  // dernier accord
  stab(ac, orch, 24.0, [38, 50, 57, 62, 66, 69], 0.06, 2.0);
  strings(ac, music, [midi(50), midi(57), midi(62), midi(66), midi(69)], 24.0, 1.0, 0.05, { attack: 0.02, release: 0.9, open: 3000 });
  bell(ac, chimes, midi(93), 24.0, 0.07, 0, 2);

  return off.startRendering();
}

/** les 3 s du Mexique : marimba, guitare grattée, basse qui balance entre la tonique et la quinte */
async function renderMexique(duration: number): Promise<AudioBuffer> {
  const off = new OfflineAudioContext(2, Math.ceil(SR * duration), SR);
  const ac = off as unknown as Ctx;
  noise = null;
  const music = createBus(ac, 1.1, 0.22);
  const chimes = createBus(ac, 0.9, 0.35);
  const drums = createBus(ac, 0.8, 0.06).dry;
  const orch = createBus(ac, 1.2, 0.3);
  stab(ac, orch, 0, [50, 62, 66, 69], 0.05, 1.2);
  for (let t = 0; t < 3 - 1e-6; t += 0.5) {
    const root = t < 1 || t >= 2 ? 38 : 45;
    if (t % 1 === 0) {
      kick(ac, drums, t, 0.3);
      roundBass(ac, music, midi(root), t, 0.45, 0.22);
    } else roundBass(ac, music, midi(root + 7), t, 0.45, 0.16);
    hat(ac, drums, t + 0.25, 0.025);
    // guitare effleurée sur le contretemps
    const chord = t < 1 || t >= 2 ? [62, 66, 69, 74] : [61, 64, 69, 73];
    chord.forEach((n, i) => pluck(ac, music, midi(n), t + 0.25 + i * 0.03, 0.055, (i - 1.5) * 0.2, 0.45));
  }
  const tune = [74, 78, 81, 83, 81, 78, 76, 79, 81, 85, 81, 78];
  tune.forEach((n, i) => marimba(ac, music, midi(n), i * 0.25, 0.09, i % 2 ? 0.3 : -0.3));
  sparkleRun(ac, chimes, 0.6, [81, 86, 90, 93], 0.08, 0.04);
  return off.startRendering();
}

/** toute la bande-son : la musique d'origine, avec le passage du Mexique inséré à `at` (il dure `len`) */
export async function renderSoundtrack(duration: number, at = 11, len = 3): Promise<string> {
  const main = await renderMain(duration - len);
  const mex = await renderMexique(len + 1.5);
  const off = new OfflineAudioContext(2, Math.ceil(SR * duration), SR);
  const play = (buf: AudioBuffer, when: number, offset: number, dur: number, fadeIn: number, fadeOut: number) => {
    const src = off.createBufferSource();
    src.buffer = buf;
    const g = off.createGain();
    g.gain.setValueAtTime(fadeIn ? 0 : 1, when);
    if (fadeIn) g.gain.linearRampToValueAtTime(1, when + fadeIn);
    g.gain.setValueAtTime(1, when + dur - fadeOut);
    g.gain.linearRampToValueAtTime(0, when + dur);
    src.connect(g).connect(off.destination);
    src.start(when, offset, dur);
  };
  play(main, 0, 0, at + 0.03, 0, 0.03);
  play(mex, at, 0, len + 1.2, 0.004, 0.6);
  play(main, at + len, at, duration - len - at, 0.01, 0.01);
  return wav(await off.startRendering());
}

/** WAV 16 bits stéréo en base64, normalisé à -1 dB. */
function wav(buf: AudioBuffer): string {
  const chs = [buf.getChannelData(0), buf.getChannelData(1)];
  let peak = 0;
  for (const c of chs) for (let i = 0; i < c.length; i++) peak = Math.max(peak, Math.abs(c[i]));
  const gain = peak > 0 ? 0.89 / peak : 1;
  const n = buf.length;
  const bytes = new DataView(new ArrayBuffer(44 + n * 4));
  const str = (o: number, s: string) => [...s].forEach((ch, i) => bytes.setUint8(o + i, ch.charCodeAt(0)));
  str(0, 'RIFF');
  bytes.setUint32(4, 36 + n * 4, true);
  str(8, 'WAVE');
  str(12, 'fmt ');
  bytes.setUint32(16, 16, true);
  bytes.setUint16(20, 1, true);
  bytes.setUint16(22, 2, true);
  bytes.setUint32(24, buf.sampleRate, true);
  bytes.setUint32(28, buf.sampleRate * 4, true);
  bytes.setUint16(32, 4, true);
  bytes.setUint16(34, 16, true);
  str(36, 'data');
  bytes.setUint32(40, n * 4, true);
  for (let i = 0; i < n; i++)
    for (let c = 0; c < 2; c++) {
      const v = Math.max(-1, Math.min(1, chs[c][i] * gain));
      bytes.setInt16(44 + i * 4 + c * 2, v * 32767, true);
    }
  const u8 = new Uint8Array(bytes.buffer);
  let s = '';
  for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode(...u8.subarray(i, i + 0x8000));
  return btoa(s);
}
