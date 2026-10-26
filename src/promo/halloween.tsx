import { DURATION, HalloweenPromo, SCREENS } from './HalloweenPromo';
import { mountPromo } from './mount';
import { scheduleHalloween } from './musique-halloween';

// Page de la vidéo d'Halloween (seulement en développement : promo/halloween.html). Lecteur : voir mount.tsx.
mountPromo({ duration: DURATION, render: (t) => <HalloweenPromo t={t} />, music: scheduleHalloween, images: SCREENS.map((s) => s.src) });
