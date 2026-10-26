import { DURATION, MexiquePromo } from './MexiquePromo';
import { mountPromo } from './mount';
import { scheduleMusique } from './musique';

// Page de la vidéo de la Série 2 (seulement en développement : promo/mexique.html). Lecteur : voir mount.tsx.
mountPromo({ duration: DURATION, render: (t) => <MexiquePromo t={t} />, music: scheduleMusique });
