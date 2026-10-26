import { bird, createBus, sharedAudio, type Bus } from './engine';
import { allTracks, type Track } from './tracks';

// La radio du jeu : sept morceaux calmes de la même famille (src/audio/tracks.ts), joués l'un après l'autre
// dans un ordre mélangé, sans jamais repasser deux fois le même avant d'avoir entendu tous les autres.
// En saison (Halloween et Jour des morts, jusqu'au 1er novembre), la radio ne joue que ses trois morceaux de fête.
// Entre deux morceaux, l'accord final résonne puis quelques secondes de calme, avec des oiseaux au loin.
// Chaque morceau a son propre bus : on peut passer au suivant en fondu sans couper les notes déjà prévues.

const VOLUME = 0.42;
/** temps laissé à l'accord final pour résonner, en secondes */
const RING = 4;
/** silence entre deux morceaux, en secondes */
const GAP_MIN = 4;
const GAP_MAX = 8;

let TRACKS = allTracks();

interface Playing {
  track: Track;
  bus: Bus;
  nextBar: number;
  barIndex: number;
}

let current: Playing | null = null;
let queue: Track[] = [];
let lastId = '';
/** heure (horloge audio) du prochain morceau, pendant la pause entre deux morceaux */
let nextTrackAt = 0;
let nextBird = 0;
let ambience: Bus | null = null;
let timer: number | undefined;
let enabled = true;
let started = false;
let title: string | null = null;
const listeners = new Set<(title: string | null) => void>();

const barLength = (track: Track) => (60 / track.bpm) * track.beats;

function announce(value: string | null) {
  title = value;
  listeners.forEach((listener) => listener(value));
}

/** Le prochain morceau : la file mélangée est refaite quand elle est vide, sans répéter le dernier joué. */
function nextInQueue(): Track {
  if (!queue.length) {
    queue = [...TRACKS].sort(() => Math.random() - 0.5);
    if (queue.length > 1 && queue[0].id === lastId) queue.push(queue.shift()!);
  }
  const track = queue.shift()!;
  lastId = track.id;
  return track;
}

function fade(ac: AudioContext, bus: Bus, value: number, seconds: number) {
  for (const [node, level] of [
    [bus.dry, value],
    [bus.wet, value * 0.55],
  ] as const) {
    node.gain.cancelScheduledValues(ac.currentTime);
    node.gain.setValueAtTime(node.gain.value, ac.currentTime);
    node.gain.linearRampToValueAtTime(level, ac.currentTime + seconds);
  }
}

/** Libère le bus d'un morceau une fois ses dernières notes éteintes. */
function release(bus: Bus, afterSeconds: number) {
  window.setTimeout(
    () => {
      bus.dry.disconnect();
      bus.wet.disconnect();
    },
    afterSeconds * 1000 + 500,
  );
}

function startTrack(ac: AudioContext, at: number) {
  const track = nextInQueue();
  const bus = createBus(ac, 0, 0);
  current = { track, bus, nextBar: at, barIndex: 0 };
  fade(ac, bus, VOLUME, 1.5);
  // le titre s'affiche quand le morceau commence vraiment
  window.setTimeout(() => announce(track.title), Math.max(0, (at - ac.currentTime) * 1000));
}

function endTrack(ac: AudioContext, at: number) {
  if (!current) return;
  release(current.bus, at - ac.currentTime + RING + 2);
  current = null;
  nextTrackAt = at + RING + GAP_MIN + Math.random() * (GAP_MAX - GAP_MIN);
  nextBird = at + RING;
}

function loop() {
  const ac = sharedAudio();
  if (!ac || !enabled) return;
  const now = ac.currentTime;
  if (!current) {
    // pause entre deux morceaux : quelques oiseaux, puis le morceau suivant
    if (now >= nextTrackAt - 0.5) {
      startTrack(ac, Math.max(now + 0.1, nextTrackAt));
    } else if (now >= nextBird) {
      ambience ??= createBus(ac, VOLUME, 0.55);
      bird(ac, ambience, now + 0.2, 0.01);
      nextBird = now + 2.5 + Math.random() * 3;
    }
    return;
  }
  const playing = current;
  const length = barLength(playing.track);
  // on programme toujours un peu d'avance, sans jamais prendre de retard
  if (playing.nextBar < now) playing.nextBar = now + 0.1;
  while (current === playing && playing.nextBar < now + length * 1.2) {
    if (playing.barIndex >= playing.track.bars) {
      endTrack(ac, playing.nextBar);
      break;
    }
    playing.track.bar(ac, playing.bus, playing.nextBar, playing.barIndex);
    playing.nextBar += length;
    playing.barIndex += 1;
  }
}

function play() {
  const ac = sharedAudio();
  if (!ac) return;
  if (current) fade(ac, current.bus, VOLUME, 2);
  else nextTrackAt = Math.min(nextTrackAt, ac.currentTime + 0.3);
  if (timer === undefined) {
    timer = window.setInterval(loop, 250);
    loop();
  }
}

function stop() {
  const ac = sharedAudio();
  if (ac && current) fade(ac, current.bus, 0, 0.8);
  if (timer !== undefined) {
    window.clearInterval(timer);
    timer = undefined;
  }
}

/** Démarre la musique au premier geste du joueur (les navigateurs l'exigent). */
export function startMusic(): void {
  started = true;
  if (enabled) play();
}

/** Active ou coupe la musique (bouton musique, bouton son, onglet caché). */
export function setMusicEnabled(on: boolean): void {
  enabled = on;
  if (!started) return;
  if (on) play();
  else stop();
}

/** Passe au morceau suivant : fondu rapide du morceau en cours, puis le suivant démarre. */
export function nextTrack(): void {
  const ac = sharedAudio();
  if (!ac || !started || !enabled) return;
  if (current) {
    fade(ac, current.bus, 0, 0.7);
    release(current.bus, 1.5);
    current = null;
  }
  nextTrackAt = ac.currentTime + 0.9;
  loop();
}

/** Titre du dernier morceau lancé (null avant le premier). */
export function currentTitle(): string | null {
  return title;
}

/** Prévient à chaque nouveau morceau (et quand la musique reprend) ; renvoie de quoi se désabonner. */
export function onTrackChange(listener: (title: string | null) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Liste des morceaux de la radio. */
export function trackList(): Array<{ id: string; title: string }> {
  return TRACKS.map(({ id, title: name }) => ({ id, title: name }));
}

/** Pour les tests : remplace la liste des morceaux (par exemple par des morceaux très courts). */
export function setTracksForTesting(tracks: Track[]): void {
  TRACKS = tracks;
  queue = [];
}
