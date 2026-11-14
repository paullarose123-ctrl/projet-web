import { CLIP_AT, CLIP_LENGTH, DURATION, IMAGES, JourPromo, SCREEN, scheduleJour } from './JourPromo';
import { mountPromo } from './mount';
import './jour.css';

// Pub TikTok « 30 jours, 30 cartes » (page de développement : promo/jour.html).
mountPromo({ duration: DURATION, render: (t) => <JourPromo t={t} />, music: scheduleJour, images: IMAGES });

// pour le montage (scripts/promo/jour-montage.mjs) : où et quand incruster l'enregistrement de la vraie partie
(window as unknown as { __jour: unknown }).__jour = { clipAt: CLIP_AT, clipLength: CLIP_LENGTH, screen: SCREEN };
