// Bande-son de la pub « ouverture d'un booster Mexique » (promo/pub-mexique.html), rendue hors ligne
// (OfflineAudioContext) et calée sur l'image : 120 battements par minute, en ré majeur comme la musique du jeu.
// Marimba en trémolo sur le sachet, montée pendant la déchirure, deux coups au moment où il s'ouvre et à l'éclair,
// une harpe pour chaque carte qui sort, puis un air de marimba et une guitare grattée sur une basse qui balance
// entre la tonique et la quinte, comme le passage du Mexique de la bande-annonce. Que de la musique.
import { bell, createBus, kalimba, marimba, midi, pluck, strings, bass as roundBass, type Bus } from '../audio/engine';

type Ctx = AudioContext;
const SR = 44100;

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

function noiseHit(ac: Ctx, out: AudioNode, t: number, o: { type: BiquadFilterType; freq: number; q?: number; gain: number; attack?: number; decay: number }) {
  const src = noiseSrc(ac);
  const f = ac.createBiquadFilter();
  f.type = o.type;
  f.frequency.value = o.freq;
  f.Q.value = o.q ?? 0.8;
  const g = env(ac, t, o.gain, o.attack ?? 0.002, o.decay);
  src.connect(f).connect(g).connect(out);
  src.start(t, Math.random() * 1.5);
  src.stop(t + (o.attack ?? 0.002) + o.decay + 0.05);
}

function kick(ac: Ctx, out: AudioNode, t: number, gain = 0.9) {
  const o = ac.createOscillator();
  o.type = 'sine';
  o.frequency.setValueAtTime(160, t);
  o.frequency.exponentialRampToValueAtTime(45, t + 0.12);
  const g = env(ac, t, gain, 0.002, 0.5);
  o.connect(g).connect(out);
  o.start(t);
  o.stop(t + 0.6);
  noiseHit(ac, out, t, { type: 'highpass', freq: 2500, gain: gain * 0.15, decay: 0.012 });
}

function hat(ac: Ctx, out: AudioNode, t: number, gain = 0.06) {
  noiseHit(ac, out, t, { type: 'highpass', freq: 7500, gain, decay: 0.04 });
}

function crash(ac: Ctx, out: AudioNode, t: number, gain = 0.16) {
  noiseHit(ac, out, t, { type: 'highpass', freq: 4800, gain, decay: 1.3 });
  noiseHit(ac, out, t, { type: 'bandpass', freq: 9000, q: 0.6, gain: gain * 0.5, decay: 0.9 });
}

/** accord : cordes et harpe arpégée */
function stab(ac: Ctx, bus: Bus, t: number, notes: number[], gain = 0.07, dur = 0.8) {
  strings(ac, bus, notes.map(midi), t, Math.max(0.8, dur), gain * 0.55, { attack: 0.03, release: Math.max(0.8, dur), open: 3000 });
  notes.forEach((n, i) => pluck(ac, bus, midi(n + 12), t + i * 0.035, gain * 1.5, (i / Math.max(1, notes.length - 1) - 0.5) * 0.6, 0.5));
}

async function render(duration: number): Promise<AudioBuffer> {
  const off = new OfflineAudioContext(2, Math.ceil(SR * duration), SR);
  const ac = off as unknown as Ctx;
  noise = null;
  const music = createBus(ac, 1.1, 0.24);
  const chimes = createBus(ac, 0.9, 0.4);
  const drums = createBus(ac, 0.85, 0.08).dry;
  const orch = createBus(ac, 1.2, 0.32);

  // ── 0 à 1,1 s : le sachet brille, trémolo de marimba qui enfle
  strings(ac, orch, [midi(50), midi(57), midi(62), midi(66)], 0, 3.2, 0.045, { attack: 1.4, release: 0.4, open: 1800 });
  for (let t = 0, i = 0; t < 1.1; t += 0.0625, i++) marimba(ac, music, midi(i % 2 ? 74 : 69), t, 0.025 + 0.04 * (t / 1.1), i % 2 ? 0.25 : -0.25);
  bell(ac, chimes, midi(93), 0.05, 0.035, 0.3, 2.4);
  bell(ac, chimes, midi(88), 0.55, 0.025, -0.3, 2);

  // ── 1,1 à 2,3 s : la déchirure, une gamme qui monte de plus en plus vite
  const scale = [62, 64, 66, 67, 69, 71, 73, 74, 76, 78, 79, 81, 83, 85, 86, 88, 90, 91, 93];
  let tt = 1.1;
  scale.forEach((n, i) => {
    marimba(ac, music, midi(n), tt, 0.06 + i * 0.003, ((i % 4) - 1.5) * 0.25);
    if (i % 3 === 2) kalimba(ac, chimes, midi(n + 12), tt + 0.02, 0.04, 0.4);
    tt += 0.085 - i * 0.0026;
  });
  strings(ac, orch, [midi(57), midi(64), midi(69), midi(73)], 1.1, 1.25, 0.05, { attack: 1.1, release: 0.2, open: 2600 });
  for (let t = 1.6; t < 2.3; t += 0.0625) hat(ac, drums, t, 0.015 + 0.05 * ((t - 1.6) / 0.7));

  // ── 2,3 s : le sachet s'ouvre
  kick(ac, drums, 2.3, 0.85);
  crash(ac, drums, 2.3, 0.12);
  roundBass(ac, music, midi(38), 2.3, 1.0, 0.24);
  stab(ac, orch, 2.3, [50, 62, 66, 69, 74], 0.06, 1.0);
  // la lumière monte jusqu'à l'éclair
  strings(ac, orch, [midi(62), midi(66), midi(69), midi(74), midi(78)], 2.45, 1.0, 0.05, { attack: 0.95, release: 0.1, open: 4000 });
  [86, 90, 93, 98].forEach((n, i) => bell(ac, chimes, midi(n), 2.5 + i * 0.18, 0.03, (i - 1.5) * 0.3, 1.6));

  // ── 3,45 s : l'éclair
  kick(ac, drums, 3.45, 1);
  crash(ac, drums, 3.45, 0.18);
  roundBass(ac, music, midi(38), 3.45, 1.4, 0.28);
  stab(ac, orch, 3.45, [38, 50, 62, 66, 69, 74, 78], 0.07, 1.4);
  bell(ac, chimes, midi(98), 3.47, 0.05, 0, 3);

  // ── 3,7 s : la Prime sort du sachet (glissando de harpe), puis les quatre autres
  [74, 78, 81, 86, 90, 93].forEach((n, i) => pluck(ac, music, midi(n), 3.72 + i * 0.05, 0.08, (i - 2.5) * 0.2, 0.5));
  bell(ac, chimes, midi(93), 4.05, 0.05, 0, 2.4);
  [
    [4.3, 78],
    [4.36, 81],
    [4.42, 86],
    [4.48, 90],
  ].forEach(([t, n], i) => kalimba(ac, chimes, midi(n), t + 0.12, 0.07, i % 2 ? 0.35 : -0.35));
  [86, 90, 93, 98].forEach((n, i) => kalimba(ac, chimes, midi(n), 4.5 + i * 0.07, 0.05, (i - 1.5) * 0.3));

  // ── 5 à 9 s : l'éventail et le logo, un air de marimba sur une guitare grattée
  const bars = [
    { root: 38, chord: [62, 66, 69, 74], tune: [81, 78, 81, 86, 85, 81, 78, 76] },
    { root: 45, chord: [61, 64, 69, 73], tune: [76, 73, 76, 81, 79, 76, 73, 69] },
    { root: 38, chord: [62, 66, 69, 74], tune: [74, 78, 81, 86, 88, 86, 85, 83] },
    { root: 45, chord: [61, 64, 69, 73], tune: [81, 79, 78, 76, 73, 76, 78, 81] },
  ];
  bars.forEach((bar, b) => {
    const t0 = 5.0 + b;
    for (let beat = 0; beat < 2; beat++) {
      const t = t0 + beat * 0.5;
      if (beat === 0) kick(ac, drums, t, 0.42);
      roundBass(ac, music, midi(beat === 0 ? bar.root : bar.root + 7), t, 0.45, beat === 0 ? 0.22 : 0.16);
      hat(ac, drums, t + 0.25, 0.022);
      bar.chord.forEach((n, i) => pluck(ac, music, midi(n), t + 0.25 + i * 0.03, 0.05, (i - 1.5) * 0.2, 0.45));
    }
    bar.tune.forEach((n, i) => marimba(ac, music, midi(n), t0 + i * 0.125, 0.085, i % 2 ? 0.3 : -0.3));
  });
  crash(ac, drums, 5.0, 0.05);
  bell(ac, chimes, midi(86), 5.05, 0.045, 0, 2.5);

  // ── 9 s : dernier accord, qui résonne jusqu'à la fin
  kick(ac, drums, 9.0, 0.5);
  stab(ac, orch, 9.0, [38, 50, 57, 62, 66, 69, 74], 0.065, 1.6);
  strings(ac, music, [midi(50), midi(57), midi(62), midi(66), midi(69)], 9.0, 0.6, 0.05, { attack: 0.02, release: 0.9, open: 3000 });
  marimba(ac, music, midi(86), 9.0, 0.1, 0);
  bell(ac, chimes, midi(98), 9.02, 0.05, 0, 2);
  return off.startRendering();
}

/** toute la bande-son, en WAV 16 bits stéréo (base64), normalisée à -1 dB, avec un fondu sur la dernière demi-seconde */
export async function renderSoundtrack(duration: number): Promise<string> {
  const buf = await render(duration);
  const chs = [buf.getChannelData(0), buf.getChannelData(1)];
  const fade = Math.floor(SR * 0.5);
  for (const c of chs) for (let i = 0; i < fade; i++) c[c.length - 1 - i] *= i / fade;
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
