import type { ReactNode } from 'react';
import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';
import '../styles/fonts.css';
import '../styles/base.css';
import '../styles/card.css';
import '../styles/app.css';
import '../styles/motion.css';
import './promo.css';
import { createBus, sharedAudio, type Bus } from '../audio/engine';

// Lecteur commun des vidéos de promotion (pages de développement promo/*.html) :
// - window.__promo.ready se résout quand les images de la vidéo sont chargées ;
// - window.__promo.frame(t) affiche l'image au temps t (utilisé par scripts/promo/video.mjs) ;
// - window.__promo.audio() rend la musique hors ligne et la renvoie en WAV (base64) ;
// - le bouton « Aperçu » rejoue la vidéo en temps réel, avec le son.

export interface PromoVideo {
  duration: number;
  render: (t: number) => ReactNode;
  /** programme toute la musique à partir du temps `t0` (horloge audio) */
  music: (ac: AudioContext, bus: Bus, t0: number) => void;
  /** images à charger avant la première image */
  images?: string[];
}

const nextPaint = () => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));

/** WAV 16 bits stéréo, en base64. */
function wav(buffer: AudioBuffer): Promise<string> {
  const channels = [buffer.getChannelData(0), buffer.getChannelData(1)];
  const n = buffer.length;
  const view = new DataView(new ArrayBuffer(44 + n * 4));
  const text = (offset: number, s: string) => [...s].forEach((c, i) => view.setUint8(offset + i, c.charCodeAt(0)));
  text(0, 'RIFF');
  view.setUint32(4, 36 + n * 4, true);
  text(8, 'WAVE');
  text(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 2, true);
  view.setUint32(24, buffer.sampleRate, true);
  view.setUint32(28, buffer.sampleRate * 4, true);
  view.setUint16(32, 4, true);
  view.setUint16(34, 16, true);
  text(36, 'data');
  view.setUint32(40, n * 4, true);
  for (let i = 0; i < n; i++)
    for (let c = 0; c < 2; c++) view.setInt16(44 + i * 4 + c * 2, Math.max(-1, Math.min(1, channels[c][i])) * 32767, true);
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1]);
    reader.readAsDataURL(new Blob([view.buffer]));
  });
}

declare global {
  interface Window {
    __promo: { duration: number; ready: Promise<void>; frame: (t: number) => Promise<void>; audio: () => Promise<string> };
  }
}

export function mountPromo({ duration, render, music, images = [] }: PromoVideo) {
  const root = createRoot(document.getElementById('root')!);
  const show = (t: number) => flushSync(() => root.render(render(t)));
  show(0);

  // une image qui manque reste vide dans la vidéo : on les charge et on les décode toutes d'abord
  const ready = Promise.all(
    images.map((src) => {
      const img = new Image();
      img.src = src;
      return img.decode().catch(() => console.warn(`Image introuvable : ${src}`));
    }),
  ).then(() => undefined);

  window.__promo = {
    duration,
    ready,
    async frame(t) {
      show(t);
      await nextPaint();
    },
    async audio() {
      const rate = 44100;
      const ac = new OfflineAudioContext(2, Math.ceil(rate * duration), rate);
      const bus = createBus(ac as unknown as AudioContext, 0.42, 0.55);
      music(ac as unknown as AudioContext, bus, 0.05);
      return wav(await ac.startRendering());
    },
  };

  // aperçu en temps réel, avec le son
  const play = document.createElement('button');
  play.className = 'promo__play';
  play.textContent = '▶ Aperçu avec le son';
  play.onclick = () => {
    const ac = sharedAudio();
    if (!ac) return;
    const bus = createBus(ac, 0.42, 0.55);
    const start = ac.currentTime + 0.1;
    music(ac, bus, start);
    const loop = () => {
      const t = ac.currentTime - start;
      show(Math.max(0, Math.min(duration, t)));
      if (t < duration) requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  };
  if (!new URLSearchParams(location.search).has('capture')) document.body.appendChild(play);
}
