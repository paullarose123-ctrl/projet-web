// Moteur audio du jeu, sans aucun fichier : de vrais timbres d'instruments synthétisés avec Web Audio.
// - une chaîne de sortie de studio : compresseur doux et réverbération de salle (réponse impulsionnelle générée) ;
// - des instruments : corde pincée (algorithme de Karplus-Strong, comme une harpe ou une guitare), kalimba,
//   cloche (synthèse FM), nappe de cordes (scies désaccordées filtrées), basse ronde, souffles et frottements.
// Le son ne démarre qu'après une action du joueur (règle des navigateurs).

let ctx: AudioContext | null = null;

/** Contexte audio commun aux effets et à la musique (créé au premier geste du joueur). */
export function sharedAudio(): AudioContext | null {
  try {
    if (!ctx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      ctx = new Ctor();
    }
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

export interface Bus {
  /** entrée sèche (directe) */
  dry: GainNode;
  /** envoi vers la réverbération */
  wet: GainNode;
}

const buses = new WeakMap<AudioContext, { master: GainNode; reverb: GainNode }>();

/** Réverbération de salle : bruit stéréo qui s'éteint en 2,6 s, légèrement assombri. */
function impulse(ac: BaseAudioContext, seconds = 2.6): AudioBuffer {
  const length = Math.floor(ac.sampleRate * seconds);
  const buffer = ac.createBuffer(2, length, ac.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const data = buffer.getChannelData(ch);
    let low = 0;
    for (let i = 0; i < length; i++) {
      const t = i / length;
      // bruit filtré (plus sombre vers la fin) avec décroissance exponentielle
      low += (Math.random() * 2 - 1 - low) * (0.6 - 0.45 * t);
      data[i] = low * Math.pow(1 - t, 2.8) * (i < ac.sampleRate * 0.008 ? i / (ac.sampleRate * 0.008) : 1);
    }
  }
  return buffer;
}

function chain(ac: AudioContext) {
  let chainNodes = buses.get(ac);
  if (chainNodes) return chainNodes;
  const compressor = ac.createDynamicsCompressor();
  compressor.threshold.value = -20;
  compressor.knee.value = 18;
  compressor.ratio.value = 3;
  compressor.attack.value = 0.01;
  compressor.release.value = 0.25;
  compressor.connect(ac.destination);
  const master = ac.createGain();
  master.gain.value = 0.9;
  master.connect(compressor);
  const convolver = ac.createConvolver();
  convolver.buffer = impulse(ac);
  const darken = ac.createBiquadFilter();
  darken.type = 'lowpass';
  darken.frequency.value = 4200;
  const reverb = ac.createGain();
  reverb.gain.value = 1;
  reverb.connect(convolver).connect(darken).connect(master);
  chainNodes = { master, reverb };
  buses.set(ac, chainNodes);
  return chainNodes;
}

/** Un bus de sortie (volume propre) : sa partie sèche et son envoi de réverbération. */
export function createBus(ac: AudioContext, volume: number, reverbAmount: number): Bus {
  const { master, reverb } = chain(ac);
  const dry = ac.createGain();
  dry.gain.value = volume;
  dry.connect(master);
  const wet = ac.createGain();
  wet.gain.value = volume * reverbAmount;
  wet.connect(reverb);
  return { dry, wet };
}

/** Branche une voix sur un bus (sec + réverbération), avec un placement stéréo. */
function out(ac: AudioContext, node: AudioNode, bus: Bus, pan = 0, send = 1) {
  let last: AudioNode = node;
  if (pan && ac.createStereoPanner) {
    const panner = ac.createStereoPanner();
    panner.pan.value = pan;
    node.connect(panner);
    last = panner;
  }
  last.connect(bus.dry);
  if (send > 0) {
    if (send === 1) last.connect(bus.wet);
    else {
      const amount = ac.createGain();
      amount.gain.value = send;
      last.connect(amount).connect(bus.wet);
    }
  }
}

export const midi = (note: number) => 440 * Math.pow(2, (note - 69) / 12);

function envelope(ac: AudioContext, t: number, peak: number, attack: number, decay: number): GainNode {
  const gain = ac.createGain();
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
  return gain;
}

// ───────────── corde pincée (Karplus-Strong) ─────────────

const plucks = new Map<string, AudioBuffer>();

function pluckBuffer(ac: AudioContext, freq: number, brightness: number): AudioBuffer {
  const key = `${Math.round(freq * 10)}:${brightness}`;
  const cached = plucks.get(key);
  if (cached) return cached;
  const sr = ac.sampleRate;
  const period = Math.max(2, Math.round(sr / freq));
  const length = Math.floor(sr * Math.min(3.2, 1.2 + 220 / freq));
  const buffer = ac.createBuffer(1, length, sr);
  const data = buffer.getChannelData(0);
  const ring = new Float32Array(period);
  // excitation : bruit adouci (le doigt plutôt que le médiator)
  let soft = 0;
  for (let i = 0; i < period; i++) {
    soft += (Math.random() * 2 - 1 - soft) * brightness;
    ring[i] = soft;
  }
  let index = 0;
  const damping = 0.4985 + 0.0013 * Math.min(1, freq / 1000);
  for (let i = 0; i < length; i++) {
    const current = ring[index];
    const next = ring[(index + 1) % period];
    ring[index] = (current + next) * damping;
    data[i] = current;
    index = (index + 1) % period;
  }
  plucks.set(key, buffer);
  return buffer;
}

/** Corde pincée : harpe ou guitare nylon selon la brillance. */
export function pluck(ac: AudioContext, bus: Bus, freq: number, t: number, gain = 0.3, pan = 0, brightness = 0.45) {
  const src = ac.createBufferSource();
  src.buffer = pluckBuffer(ac, freq, brightness);
  const body = ac.createBiquadFilter();
  body.type = 'lowpass';
  body.frequency.value = 3200;
  const amp = ac.createGain();
  amp.gain.value = gain;
  src.connect(body).connect(amp);
  out(ac, amp, bus, pan, 0.7);
  src.start(t);
}

// ───────────── kalimba : lame métallique, attaque nette et harmonique aiguë fugace ─────────────

export function kalimba(ac: AudioContext, bus: Bus, freq: number, t: number, gain = 0.2, pan = 0) {
  const partials: Array<[number, number, number]> = [
    [1, 1, 1.6],
    [5.4, 0.18, 0.12],
    [2.0, 0.08, 0.5],
  ];
  for (const [ratio, level, decay] of partials) {
    const osc = ac.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq * ratio;
    const env = envelope(ac, t, gain * level, 0.004, decay);
    osc.connect(env);
    out(ac, env, bus, pan, 0.8);
    osc.start(t);
    osc.stop(t + decay + 0.1);
  }
}

// ───────────── cloche (FM) ─────────────

export function bell(ac: AudioContext, bus: Bus, freq: number, t: number, gain = 0.12, pan = 0, decay = 2.2) {
  const carrier = ac.createOscillator();
  carrier.type = 'sine';
  carrier.frequency.value = freq;
  const modulator = ac.createOscillator();
  modulator.type = 'sine';
  modulator.frequency.value = freq * 3.5;
  const depth = ac.createGain();
  depth.gain.setValueAtTime(freq * 2.2, t);
  depth.gain.exponentialRampToValueAtTime(freq * 0.05, t + decay * 0.6);
  modulator.connect(depth).connect(carrier.frequency);
  const env = envelope(ac, t, gain, 0.003, decay);
  carrier.connect(env);
  out(ac, env, bus, pan, 1);
  carrier.start(t);
  modulator.start(t);
  carrier.stop(t + decay + 0.1);
  modulator.stop(t + decay + 0.1);
}

// ───────────── nappe de cordes : scies désaccordées, filtre qui s'ouvre, attaque et relâche lentes ─────────────

export function strings(ac: AudioContext, bus: Bus, freqs: number[], t: number, duration: number, gain = 0.05, opts: { attack?: number; release?: number; open?: number } = {}) {
  const attack = opts.attack ?? 1.2;
  const release = opts.release ?? 1.8;
  const filter = ac.createBiquadFilter();
  filter.type = 'lowpass';
  filter.Q.value = 0.4;
  filter.frequency.setValueAtTime(500, t);
  filter.frequency.linearRampToValueAtTime(opts.open ?? 1600, t + attack);
  filter.frequency.linearRampToValueAtTime(700, t + duration + release);
  const amp = ac.createGain();
  amp.gain.setValueAtTime(0.0001, t);
  amp.gain.linearRampToValueAtTime(gain, t + attack);
  amp.gain.setValueAtTime(gain, t + duration);
  amp.gain.exponentialRampToValueAtTime(0.0001, t + duration + release);
  filter.connect(amp);
  out(ac, amp, bus, 0, 1);
  freqs.forEach((freq, i) => {
    for (const cents of [-7, 6]) {
      const osc = ac.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.value = freq;
      osc.detune.value = cents + (i % 2 ? 2 : -2);
      osc.connect(filter);
      osc.start(t);
      osc.stop(t + duration + release + 0.1);
    }
  });
}

/** Basse ronde, comme une contrebasse jouée aux doigts. */
export function bass(ac: AudioContext, bus: Bus, freq: number, t: number, duration: number, gain = 0.16) {
  const osc = ac.createOscillator();
  osc.type = 'triangle';
  osc.frequency.value = freq;
  const sub = ac.createOscillator();
  sub.type = 'sine';
  sub.frequency.value = freq;
  const filter = ac.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 420;
  const env = envelope(ac, t, gain, 0.015, duration);
  osc.connect(filter);
  sub.connect(filter);
  filter.connect(env);
  out(ac, env, bus, 0, 0.15);
  for (const o of [osc, sub]) {
    o.start(t);
    o.stop(t + duration + 0.1);
  }
}

// ───────────── bruits : souffles, frottements de carte, papier ─────────────

const noiseBuffers = new WeakMap<AudioContext, AudioBuffer>();

function noiseBuffer(ac: AudioContext): AudioBuffer {
  let buffer = noiseBuffers.get(ac);
  if (!buffer) {
    buffer = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    noiseBuffers.set(ac, buffer);
  }
  return buffer;
}

/** Souffle filtré : un passage d'air, un frottement. Le filtre peut balayer de `from` à `to` Hz. */
export function air(
  ac: AudioContext,
  bus: Bus,
  t: number,
  duration: number,
  opts: { gain?: number; from?: number; to?: number; q?: number; attack?: number; type?: BiquadFilterType; pan?: number; send?: number } = {},
) {
  const src = ac.createBufferSource();
  src.buffer = noiseBuffer(ac);
  src.loop = true;
  const filter = ac.createBiquadFilter();
  filter.type = opts.type ?? 'bandpass';
  filter.Q.value = opts.q ?? 0.9;
  filter.frequency.setValueAtTime(opts.from ?? 1200, t);
  if (opts.to) filter.frequency.exponentialRampToValueAtTime(opts.to, t + duration);
  const attack = opts.attack ?? Math.min(0.05, duration / 3);
  const env = ac.createGain();
  env.gain.setValueAtTime(0.0001, t);
  env.gain.linearRampToValueAtTime(opts.gain ?? 0.1, t + attack);
  env.gain.exponentialRampToValueAtTime(0.0001, t + duration);
  src.connect(filter).connect(env);
  out(ac, env, bus, opts.pan ?? 0, opts.send ?? 0.3);
  src.start(t, Math.random() * 1.5);
  src.stop(t + duration + 0.05);
}

/** Petit choc boisé : un tic net et sec. */
export function tick(ac: AudioContext, bus: Bus, t: number, gain = 0.08, freq = 1900) {
  const osc = ac.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(freq, t);
  osc.frequency.exponentialRampToValueAtTime(freq * 0.6, t + 0.04);
  const env = envelope(ac, t, gain, 0.001, 0.05);
  osc.connect(env);
  out(ac, env, bus, 0, 0.2);
  osc.start(t);
  osc.stop(t + 0.1);
  air(ac, bus, t, 0.03, { gain: gain * 0.5, from: 4500, q: 1.2, attack: 0.002, send: 0 });
}

/** Coup sourd et profond (timbale feutrée). */
export function boom(ac: AudioContext, bus: Bus, t: number, gain = 0.3, freq = 70) {
  const osc = ac.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(freq * 1.6, t);
  osc.frequency.exponentialRampToValueAtTime(freq, t + 0.12);
  const env = envelope(ac, t, gain, 0.005, 1.1);
  osc.connect(env);
  out(ac, env, bus, 0, 0.5);
  osc.start(t);
  osc.stop(t + 1.2);
  air(ac, bus, t, 0.12, { gain: gain * 0.25, from: 600, q: 0.7, attack: 0.003, send: 0.3 });
}

/** Chant d'oiseau : quelques gazouillis rapides, placés au hasard dans l'espace. */
export function bird(ac: AudioContext, bus: Bus, t: number, gain = 0.02) {
  const pan = Math.random() * 1.6 - 0.8;
  const base = 2600 + Math.random() * 1800;
  const notes = 2 + Math.floor(Math.random() * 4);
  for (let i = 0; i < notes; i++) {
    const start = t + i * (0.09 + Math.random() * 0.06);
    const osc = ac.createOscillator();
    osc.type = 'sine';
    const f0 = base * (0.9 + Math.random() * 0.25);
    osc.frequency.setValueAtTime(f0, start);
    osc.frequency.exponentialRampToValueAtTime(f0 * (Math.random() < 0.5 ? 1.35 : 0.75), start + 0.07);
    const env = envelope(ac, start, gain, 0.008, 0.07);
    osc.connect(env);
    out(ac, env, bus, pan, 1);
    osc.start(start);
    osc.stop(start + 0.1);
  }
}

// ───────────── instruments de la radio ─────────────

/** Piano feutré : partiels presque harmoniques qui s'éteignent d'autant plus vite qu'ils sont aigus. */
export function piano(ac: AudioContext, bus: Bus, freq: number, t: number, gain = 0.1, pan = 0, decay = 2.6) {
  const partials: Array<[number, number, number]> = [
    [1, 1, 1],
    [2.002, 0.42, 0.55],
    [3.005, 0.16, 0.35],
    [4.012, 0.07, 0.24],
    [5.02, 0.03, 0.16],
  ];
  // les notes aiguës sonnent moins longtemps, les graves un peu plus
  const length = decay * Math.min(1.5, Math.max(0.55, Math.sqrt(440 / freq)));
  const tone = ac.createBiquadFilter();
  tone.type = 'lowpass';
  tone.frequency.value = Math.min(5200, freq * 7);
  out(ac, tone, bus, pan, 0.8);
  for (const [ratio, level, fade] of partials) {
    const osc = ac.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq * ratio;
    const env = envelope(ac, t, gain * level, 0.006, length * fade);
    osc.connect(env).connect(tone);
    osc.start(t);
    osc.stop(t + length * fade + 0.1);
  }
  // le feutre du marteau
  air(ac, bus, t, 0.03, { gain: gain * 0.12, from: Math.min(6000, freq * 4), q: 1.4, attack: 0.002, pan, send: 0 });
}

/** Flûte douce : sinus un peu boisé, vibrato qui arrive après l'attaque, souffle au début de la note. */
export function flute(ac: AudioContext, bus: Bus, freq: number, t: number, duration: number, gain = 0.05, pan = 0) {
  const tone = ac.createBiquadFilter();
  tone.type = 'lowpass';
  tone.frequency.value = 3200;
  const amp = ac.createGain();
  amp.gain.setValueAtTime(0.0001, t);
  amp.gain.linearRampToValueAtTime(gain, t + 0.09);
  amp.gain.setValueAtTime(gain, t + Math.max(0.1, duration));
  amp.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(0.1, duration) + 0.28);
  tone.connect(amp);
  out(ac, amp, bus, pan, 0.9);
  const vibrato = ac.createOscillator();
  vibrato.frequency.value = 5.2;
  const depth = ac.createGain();
  depth.gain.setValueAtTime(0, t);
  depth.gain.linearRampToValueAtTime(freq * 0.006, t + 0.45);
  vibrato.connect(depth);
  const end = t + Math.max(0.1, duration) + 0.35;
  for (const [type, level] of [
    ['sine', 1],
    ['triangle', 0.22],
  ] as const) {
    const osc = ac.createOscillator();
    osc.type = type;
    osc.frequency.value = freq;
    depth.connect(osc.frequency);
    const g = ac.createGain();
    g.gain.value = level;
    osc.connect(g).connect(tone);
    osc.start(t);
    osc.stop(end);
  }
  vibrato.start(t);
  vibrato.stop(end);
  air(ac, bus, t, 0.14, { gain: gain * 0.3, from: Math.min(7000, freq * 2), q: 2, attack: 0.02, pan, send: 0.4 });
}

/** Lit de bruit doux et continu (pluie, vent), avec une montée et une descente lentes. */
export function bed(ac: AudioContext, bus: Bus, t: number, duration: number, opts: { gain?: number; low?: number; high?: number; fade?: number; pan?: number } = {}) {
  const src = ac.createBufferSource();
  src.buffer = noiseBuffer(ac);
  src.loop = true;
  const hp = ac.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = opts.low ?? 2500;
  const lp = ac.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = opts.high ?? 7000;
  const fade = opts.fade ?? 1;
  const env = ac.createGain();
  env.gain.setValueAtTime(0, t);
  env.gain.linearRampToValueAtTime(opts.gain ?? 0.02, t + fade);
  env.gain.setValueAtTime(opts.gain ?? 0.02, t + duration - fade);
  env.gain.linearRampToValueAtTime(0, t + duration);
  src.connect(hp).connect(lp).connect(env);
  out(ac, env, bus, opts.pan ?? 0, 0.5);
  src.start(t, Math.random() * 1.5);
  src.stop(t + duration + 0.05);
}

/** Grillon : quelques stridulations aiguës et rapides. */
export function cricket(ac: AudioContext, bus: Bus, t: number, gain = 0.008) {
  const pan = Math.random() * 1.4 - 0.7;
  const freq = 4300 + Math.random() * 600;
  const chirps = 3 + Math.floor(Math.random() * 3);
  for (let i = 0; i < chirps; i++) {
    const start = t + i * 0.055;
    const osc = ac.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq;
    const env = envelope(ac, start, gain, 0.003, 0.035);
    osc.connect(env);
    out(ac, env, bus, pan, 0.6);
    osc.start(start);
    osc.stop(start + 0.05);
  }
}

/** Bulle qui remonte : un petit glissando vers l'aigu. */
export function bubble(ac: AudioContext, bus: Bus, t: number, gain = 0.02) {
  const osc = ac.createOscillator();
  osc.type = 'sine';
  const f0 = 260 + Math.random() * 260;
  osc.frequency.setValueAtTime(f0, t);
  osc.frequency.exponentialRampToValueAtTime(f0 * 2.6, t + 0.09);
  const env = envelope(ac, t, gain, 0.004, 0.1);
  osc.connect(env);
  out(ac, env, bus, Math.random() * 1.4 - 0.7, 0.8);
  osc.start(t);
  osc.stop(t + 0.14);
}

/** Marimba : lame de bois frappée (partiels 1, ~4 et ~9,2 qui s'éteignent vite), plus le claquement de la mailloche. */
export function marimba(ac: AudioContext, bus: Bus, freq: number, t: number, gain = 0.15, pan = 0) {
  const length = Math.min(1.6, Math.max(0.6, Math.sqrt(440 / freq)));
  const partials: Array<[number, number, number]> = [
    [1, 1, 0.5],
    [3.93, 0.26, 0.12],
    [9.2, 0.07, 0.04],
  ];
  for (const [ratio, level, decay] of partials) {
    const osc = ac.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq * ratio;
    const env = envelope(ac, t, gain * level, 0.003, decay * length);
    osc.connect(env);
    out(ac, env, bus, pan, 0.6);
    osc.start(t);
    osc.stop(t + decay * length + 0.1);
  }
  air(ac, bus, t, 0.012, { gain: gain * 0.18, from: Math.min(7000, freq * 6), q: 1.2, attack: 0.001, pan, send: 0 });
}
