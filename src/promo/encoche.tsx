import { createRoot } from 'react-dom/client';
import '../styles/fonts.css';
import '../styles/base.css';
import '../styles/card.css';
import '../styles/app.css';
import { Card } from '../components/Card';
import type { CardFace } from '../engine/types';

// Maquette (page de développement promo/encoche.html) : le contour gravé dans l'onglet en haut à gauche des cartes.

const CARDS: CardFace[] = [
  { athleteId: 'souris', variant: 'base' },
  { athleteId: 'caniche', variant: 'base' },
  { athleteId: 'tapir', variant: 'base' },
  { athleteId: 'guepard', variant: 'base' },
  { athleteId: 'lion', variant: 'reverse' },
  { athleteId: 'mx-axolotl', variant: 'prime' },
];

createRoot(document.getElementById('root')!).render(
  <div style={{ padding: 24, display: 'grid', gap: 22, color: 'var(--text)' }}>
    <div style={{ display: 'flex', gap: 14 }}>
      {CARDS.map((c) => (
        <Card key={c.athleteId} card={c} size="sm" />
      ))}
    </div>
    <div style={{ display: 'flex', gap: 18 }}>
      {CARDS.slice(3).map((c) => (
        <Card key={c.athleteId} card={c} size="md" />
      ))}
    </div>
  </div>,
);
