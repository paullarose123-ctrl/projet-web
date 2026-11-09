// Bande-son de la bande-annonce (promo/pub-trailer.html), rendue hors ligne (OfflineAudioContext) et calée sur
// l'image : 120 battements par minute (un temps = 0,5 s), en ré majeur comme la musique du jeu (Ré, Si m, Sol, La).
// Batterie et basse synthétisées ici ; harpe, kalimba, marimba, cloches, cordes et souffles viennent du moteur du jeu.
import { air, bell, boom, createBus, kalimba, marimba, midi, pluck, strings, bass as roundBass, type Bus } from '../audio/engine';

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

function clap(ac: Ctx, out: AudioNode, t: number, gain = 0.32) {
  for (const d of [0, 0.011, 0.023]) noiseHit(ac, out, t + d, { type: 'bandpass', freq: 1300, q: 1.1, gain, decay: d === 0.023 ? 0.16 : 0.02 });
  noiseHit(ac, out, t, { type: 'highpass', freq: 5000, gain: gain * 0.4, decay: 0.08 });
}

function snare(ac: Ctx, out: AudioNode, t: number, gain = 0.25) {
  noiseHit(ac, out, t, { type: 'bandpass', freq: 2000, q: 0.7, gain, decay: 0.13 });
  const o = ac.createOscillator();
  o.type = 'triangle';
  o.frequency.setValueAtTime(220, t);
  o.frequency.exponentialRampToValueAtTime(160, t + 0.08);
  const g = env(ac, t, gain * 0.7, 0.002, 0.09);
  o.connect(g).connect(out);
  o.start(t);
  o.stop(t + 0.15);
}

function hat(ac: Ctx, out: AudioNode, t: number, gain = 0.07, open = false) {
  noiseHit(ac, out, t, { type: 'highpass', freq: 7500, gain, decay: open ? 0.22 : 0.04 });
}

function crash(ac: Ctx, out: AudioNode, t: number, gain = 0.16) {
  noiseHit(ac, out, t, { type: 'highpass', freq: 4800, gain, decay: 1.1 });
  noiseHit(ac, out, t, { type: 'bandpass', freq: 9000, q: 0.6, gain: gain * 0.5, decay: 0.8 });
}

function tom(ac: Ctx, out: AudioNode, t: number, freq = 110, gain = 0.5) {
  const o = ac.createOscillator();
  o.type = 'sine';
  o.frequency.setValueAtTime(freq * 1.8, t);
  o.frequency.exponentialRampToValueAtTime(freq, t + 0.08);
  const g = env(ac, t, gain, 0.002, 0.35);
  o.connect(g).connect(out);
  o.start(t);
  o.stop(t + 0.45);
}

/** roulement de caisse claire qui accélère et monte */
function roll(ac: Ctx, out: AudioNode, a: number, b: number, gain = 0.2) {
  let t = a;
  while (t < b) {
    const k = (t - a) / (b - a);
    snare(ac, out, t, gain * (0.35 + 0.65 * k));
    t += k < 0.5 ? 0.125 : k < 0.8 ? 0.0625 : 0.03125;
  }
}

// ───────────── chocs et effets ─────────────

function impact(ac: Ctx, drums: AudioNode, fx: Bus, t: number, big = 1) {
  kick(ac, drums, t, 0.8);
  boom(ac, fx, t, 0.4 * big, 42);
  crash(ac, drums, t, 0.13 * big);
  noiseHit(ac, drums, t, { type: 'lowpass', freq: 900, gain: 0.35 * big, decay: 0.5, to: 120 });
}

function riser(ac: Ctx, out: AudioNode, fx: Bus, a: number, b: number, gain = 0.12) {
  air(ac, fx, a, b - a + 0.05, { gain, from: 250, to: 7000, q: 1.4, attack: (b - a) * 0.95, send: 0.4 });
  const o = ac.createOscillator();
  o.type = 'sawtooth';
  o.frequency.setValueAtTime(110, a);
  o.frequency.exponentialRampToValueAtTime(880, b);
  const f = ac.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.setValueAtTime(300, a);
  f.frequency.exponentialRampToValueAtTime(5000, b);
  const g = ac.createGain();
  g.gain.setValueAtTime(0.0001, a);
  g.gain.exponentialRampToValueAtTime(gain * 0.5, b - 0.02);
  g.gain.linearRampToValueAtTime(0, b);
  o.connect(f).connect(g).connect(out);
  o.start(a);
  o.stop(b + 0.02);
}

function whoosh(fx: Bus, ac: Ctx, t: number, gain = 0.14, dur = 0.35) {
  air(ac, fx, t, dur, { gain, from: 400, to: 3800, q: 1.2, attack: dur * 0.6, send: 0.3 });
}

/** le rugissement : scie grave vibrante, souffle rauque et saturation */
function roar(ac: Ctx, out: AudioNode, t: number, gain = 0.32, dur = 1.3) {
  const shaper = ac.createWaveShaper();
  const curve = new Float32Array(1024);
  for (let i = 0; i < curve.length; i++) {
    const x = (i / (curve.length - 1)) * 2 - 1;
    curve[i] = Math.tanh(x * 3.2);
  }
  shaper.curve = curve;
  const lp = ac.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.setValueAtTime(600, t);
  lp.frequency.linearRampToValueAtTime(1500, t + 0.25);
  lp.frequency.exponentialRampToValueAtTime(350, t + dur);
  const g = ac.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.09);
  g.gain.setValueAtTime(gain, t + dur * 0.45);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  const o = ac.createOscillator();
  o.type = 'sawtooth';
  o.frequency.setValueAtTime(95, t);
  o.frequency.linearRampToValueAtTime(120, t + 0.2);
  o.frequency.exponentialRampToValueAtTime(62, t + dur);
  const lfo = ac.createOscillator();
  lfo.frequency.value = 13;
  const depth = ac.createGain();
  depth.gain.value = 9;
  lfo.connect(depth).connect(o.frequency);
  const n = noiseSrc(ac);
  const nb = ac.createBiquadFilter();
  nb.type = 'bandpass';
  nb.frequency.value = 420;
  nb.Q.value = 0.9;
  const ng = ac.createGain();
  ng.gain.value = 0.9;
  o.connect(shaper);
  n.connect(nb).connect(ng).connect(shaper);
  shaper.connect(lp).connect(g).connect(out);
  for (const s of [o, lfo, n]) {
    s.start(t);
    s.stop(t + dur + 0.05);
  }
}

/** accord d'orchestre : cordes qui attaquent franchement et harpe pincée, comme les instruments du jeu */
function stab(ac: Ctx, bus: Bus, t: number, notes: number[], gain = 0.07, dur = 0.45) {
  strings(ac, bus, notes.map(midi), t, dur, gain * 0.75, { attack: 0.02, release: Math.max(0.4, dur), open: 3600 });
  notes.forEach((n, i) => pluck(ac, bus, midi(n + 12), t + i * 0.012, gain * 2.4, (i / Math.max(1, notes.length - 1) - 0.5) * 0.6, 0.65));
}

function sparkleRun(ac: Ctx, fx: Bus, t: number, notes: number[], step = 0.0625, gain = 0.05) {
  notes.forEach((n, i) => bell(ac, fx, midi(n), t + i * step, gain, (i % 2 ? 0.4 : -0.4) * Math.random(), 1.6));
}

// ───────────── la partition ─────────────

export async function renderSoundtrack(duration: number): Promise<string> {
  const SR = 44100;
  const off = new OfflineAudioContext(2, Math.ceil(SR * duration), SR);
  const ac = off as unknown as Ctx;
  noise = null;
  const music = createBus(ac, 1.1, 0.22);
  const fxb = createBus(ac, 0.9, 0.35);
  const drumBus = createBus(ac, 0.8, 0.06);
  const drums = drumBus.dry;
  const synth = createBus(ac, 1.15, 0.18).dry;
  const orch = createBus(ac, 1.2, 0.3);

  // ── 0 à 2 s : le sachet tombe, l'énergie monte
  strings(ac, music, [midi(38), midi(45), midi(50)], 0, 4, 0.045, { attack: 1.2, release: 1, open: 900 });
  air(ac, fxb, 0, 0.45, { gain: 0.16, from: 3200, to: 380, q: 1, attack: 0.35, send: 0.3 });
  impact(ac, drums, fxb, 0.45, 0.6);
  for (const [t, g] of [
    [1.0, 0.45],
    [1.5, 0.55],
    [1.75, 0.6],
    [1.875, 0.65],
  ] as [number, number][])
    kick(ac, drums, t, g);
  roll(ac, drums, 1.25, 2.0, 0.18);
  riser(ac, synth, fxb, 1.0, 2.0, 0.13);
  for (let i = 0; i < 14; i++) air(ac, fxb, 1.35 + i * 0.043, 0.05, { gain: 0.05, from: 2600 + (i % 5) * 500, to: 1500, q: 2.5, attack: 0.003, send: 0.1 });

  // ── 2 s : la déchirure
  impact(ac, drums, fxb, 2.0, 1.1);
  air(ac, fxb, 2.0, 0.45, { gain: 0.12, from: 900, to: 5000, q: 0.6, attack: 0.02, send: 0.3 });
  sparkleRun(ac, fxb, 2.02, [81, 86, 90, 93], 0.05, 0.05);
  [2.08, 2.32, 2.56, 2.8].forEach((t) => whoosh(fxb, ac, t - 0.05, 0.13, 0.32));
  for (let t = 2.25; t < 2.95; t += 0.125) hat(ac, drums, t, 0.05);
  // la dernière carte monte : roulement, cordes, montée
  roll(ac, drums, 2.95, 4.0, 0.22);
  riser(ac, synth, fxb, 2.95, 4.0, 0.15);
  strings(ac, music, [midi(50), midi(57), midi(62), midi(64)], 2.95, 1.05, 0.045, { attack: 0.95, release: 0.3, open: 3000 });

  // ── 4 s : LÉGENDAIRE
  impact(ac, drums, fxb, 4.0, 1.2);
  stab(ac, orch, 4.0, [50, 62, 66, 69], 0.06, 0.9);
  strings(ac, music, [midi(50), midi(62), midi(66), midi(69), midi(74)], 4.0, 1.2, 0.05, { attack: 0.06, release: 2, open: 3400 });
  [62, 66, 69, 74, 78, 81, 86].forEach((n, i) => pluck(ac, music, midi(n), 4.0 + i * 0.05, 0.2, (i - 3) * 0.12, 0.6));
  bell(ac, fxb, midi(86), 4.35, 0.07, 0.2, 3);
  // ── 5 s : le lion jaillit
  impact(ac, drums, fxb, 5.0, 1);
  roar(ac, synth, 5.02, 0.34, 1.35);
  whoosh(fxb, ac, 4.85, 0.16, 0.3);

  // ── le rythme : de 4 s à 24 s
  for (let t = 4.0; t < 24.0 - 1e-6; t += 0.5) {
    const inBar = (t - 4) % 2;
    const half = t >= 11 && t < 12.5; // passage aérien des ultra-rares
    const build = (t >= 12.5 && t < 13) || (t >= 16.5 && t < 17) || (t >= 19 && t < 19.5);
    if (!build && (!half || inBar === 0 || inBar === 1)) kick(ac, drums, t, 0.7);
    if (!build && !half && (inBar === 0.5 || inBar === 1.5)) clap(ac, drums, t, 0.3);
    if (!build) hat(ac, drums, t + 0.25, 0.08);
    if (t >= 13 && !build) {
      hat(ac, drums, t + 0.125, 0.035);
      hat(ac, drums, t + 0.375, 0.035);
    }
    // basse qui pompe en croches
    if (!half && !build) {
      const { root } = chordAt(t);
      roundBass(ac, music, midi(root), t, 0.2, 0.3);
      roundBass(ac, music, midi(root + 12), t + 0.25, 0.18, 0.22);
    }
  }
  for (let bar = 4; bar < 24; bar += 2) {
    const { chord, root } = chordAt(bar);
    if (bar >= 11 && bar < 13) continue;
    stab(ac, orch, bar, [root + 12, ...chord], 0.05, 0.6);
    stab(ac, orch, bar + 0.75, chord, 0.035, 0.35);
    strings(ac, music, chord.map(midi), bar, 2, 0.022, { attack: 0.3, release: 0.6, open: 2400 });
  }
  roll(ac, drums, 12.5, 13.0, 0.2);
  roll(ac, drums, 16.5, 17.0, 0.2);
  roll(ac, drums, 19.0, 19.5, 0.22);
  riser(ac, synth, fxb, 6.4, 7.0, 0.1);
  riser(ac, synth, fxb, 12.4, 13.0, 0.12);
  riser(ac, synth, fxb, 16.4, 17.0, 0.12);
  riser(ac, synth, fxb, 18.9, 19.5, 0.14);

  // ── 7 à 11 s : le montage, un choc par animal
  for (let i = 0; i < 4; i++) {
    const t = 7 + i;
    whoosh(fxb, ac, t - 0.18, 0.12, 0.22);
    impact(ac, drums, fxb, t, 0.7);
  }
  // requin : plongeon et bulles
  air(ac, fxb, 7.08, 0.7, { gain: 0.14, from: 3000, to: 250, type: 'lowpass', q: 0.8, attack: 0.02, send: 0.4 });
  for (let i = 0; i < 8; i++) {
    const o = ac.createOscillator();
    const t = 7.2 + i * 0.07;
    o.frequency.setValueAtTime(500 + Math.random() * 500, t);
    o.frequency.exponentialRampToValueAtTime(1600 + Math.random() * 800, t + 0.05);
    const g = env(ac, t, 0.05, 0.003, 0.06);
    o.connect(g).connect(fxb.dry);
    o.start(t);
    o.stop(t + 0.1);
  }
  // cobra : sifflement
  air(ac, fxb, 8.12, 0.75, { gain: 0.09, from: 6500, to: 3800, type: 'highpass', q: 0.7, attack: 0.06, send: 0.25 });
  // panda : petit rebond joyeux
  [74, 78, 81, 86].forEach((n, i) => kalimba(ac, fxb, midi(n), 9.1 + i * 0.07, 0.15, (i - 1.5) * 0.3));
  // panthère des neiges : vent et feulement
  air(ac, fxb, 10.05, 0.9, { gain: 0.1, from: 500, to: 1400, q: 4, attack: 0.3, send: 0.6 });
  roar(ac, synth, 10.1, 0.18, 0.7);

  // ── 11 à 13 s : les ultra-rares, des cloches qui scintillent
  [11.0, 11.5, 12.0].forEach((t, i) => {
    whoosh(fxb, ac, t - 0.12, 0.12, 0.3);
    boom(ac, fxb, t + 0.25, 0.25, 55);
    sparkleRun(ac, fxb, t + 0.28, [[81, 86, 90, 93], [83, 86, 90, 95], [86, 90, 93, 98]][i], 0.055, 0.055);
  });
  strings(ac, music, [midi(62), midi(69), midi(74), midi(78), midi(81)], 11.0, 2, 0.04, { attack: 0.4, release: 0.8, open: 4500 });
  crash(ac, drums, 11.0, 0.12);
  bell(ac, fxb, midi(98), 12.45, 0.06, 0, 2.5);

  // ── 13 à 17 s : le duel
  whoosh(fxb, ac, 13.0, 0.16, 0.3);
  tom(ac, drums, 13.12, 90, 0.4);
  tom(ac, drums, 13.22, 80, 0.4);
  impact(ac, drums, fxb, 13.5, 1.3);
  stab(ac, orch, 13.5, [38, 50, 62, 66, 69], 0.08, 1.1);
  roar(ac, synth, 13.62, 0.22, 0.8);
  impact(ac, drums, fxb, 14.5, 1);
  stab(ac, orch, 14.5, [47, 59, 62, 66], 0.07, 0.8);
  for (let t = 14.75; t < 16.5; t += 1) {
    tom(ac, drums, t, 120, 0.3);
    tom(ac, drums, t + 0.125, 95, 0.3);
  }
  roar(ac, synth, 15.5, 0.2, 0.9);
  bell(ac, fxb, midi(81), 15.0, 0.05, 0, 1.5);

  // ── 17 à 19,5 s : la réserve, un air de marimba
  impact(ac, drums, fxb, 17.0, 0.7);
  const tune = [74, 79, 83, 79, 78, 74, 71, 74, 76, 81, 85, 81, 78, 76, 73, 76];
  tune.forEach((n, i) => marimba(ac, music, midi(n), 17.0 + i * 0.125, 0.12, (i % 2 ? 0.3 : -0.3)));
  whoosh(fxb, ac, 18.0, 0.14, 0.35);
  [18.45, 18.65, 18.85].forEach((t, i) => {
    bell(ac, fxb, midi(93 + i * 2), t, 0.06, (i - 1) * 0.4, 1.2);
    bell(ac, fxb, midi(98 + i * 2), t + 0.06, 0.045, (i - 1) * 0.4, 1.2);
  });

  // ── 19,5 s : le final
  impact(ac, drums, fxb, 19.5, 1.2);
  stab(ac, orch, 19.5, [38, 50, 62, 66, 69, 74], 0.07, 1.2);
  bell(ac, fxb, midi(86), 19.65, 0.08, 0, 3);
  boom(ac, fxb, 19.62, 0.3, 50);
  for (let t = 20.0; t < 24.0 - 1e-6; t += 0.125) {
    const { chord } = chordAt(t);
    const step = Math.round((t - 20) / 0.125) % 8;
    const notes = [chord[0], chord[1], chord[2], chord[0] + 12, chord[1] + 12, chord[2] + 12, chord[0] + 12, chord[2]];
    pluck(ac, music, midi(notes[step] + 12), t, 0.12, step % 2 ? 0.35 : -0.35, 0.55);
  }
  [74, 78, 81, 86].forEach((n, i) => kalimba(ac, fxb, midi(n), 20.8 + i * 0.05, 0.14, (i - 1.5) * 0.3));
  boom(ac, fxb, 21.2, 0.22, 60);
  stab(ac, orch, 22.3, [62, 66, 69, 74], 0.05, 0.6);
  // dernier accord
  impact(ac, drums, fxb, 24.0, 1.1);
  stab(ac, orch, 24.0, [38, 50, 57, 62, 66, 69], 0.08, 1.6);
  strings(ac, music, [midi(50), midi(57), midi(62), midi(66), midi(69)], 24.0, 1.0, 0.05, { attack: 0.02, release: 0.9, open: 3000 });
  bell(ac, fxb, midi(93), 24.0, 0.07, 0, 2);

  const buf = await off.startRendering();
  return wav(buf);
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
