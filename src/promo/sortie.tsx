import { allTracks } from '../audio/tracks';
import { DURATION, IMAGES, SortiePromo } from './SortiePromo';
import { mountPromo } from './mount';

// Pub de la sortie de la Série 2 (seulement en développement : promo/sortie.html), sur le « Boléro de la Catrina »
// de la radio. Lecteur : voir mount.tsx.
const bolero = allTracks(new Date(2026, 10, 3).getTime()).find((track) => track.id === 'bolero')!;
const barLength = (bolero.beats * 60) / bolero.bpm;

mountPromo({
  duration: DURATION,
  render: (t) => <SortiePromo t={t} />,
  images: IMAGES,
  music: (ac, bus, t0) => {
    for (let i = 0; i * barLength < DURATION + barLength && i < bolero.bars; i++) bolero.bar(ac, bus, t0 + i * barLength, i);
  },
});
