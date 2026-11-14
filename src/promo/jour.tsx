import { DURATION, IMAGES, JourPromo, scheduleJour } from './JourPromo';
import { mountPromo } from './mount';
import './jour.css';

// Pub TikTok « 30 jours, 30 cartes » (page de développement : promo/jour.html).
mountPromo({ duration: DURATION, render: (t) => <JourPromo t={t} />, music: scheduleJour, images: IMAGES });
