import { createRoot } from 'react-dom/client';
import '../styles/fonts.css';
import '../styles/base.css';
import '../styles/card.css';
import '../styles/app.css';
import { Card } from '../components/Card';
import type { CardFace } from '../engine/types';

// Maquette (page de développement promo/encoche.html) : trois façons de remplir l'onglet en haut à gauche des cartes.

const CARDS: CardFace[] = [
  { athleteId: 'souris', variant: 'base' },
  { athleteId: 'caniche', variant: 'base' },
  { athleteId: 'tapir', variant: 'base' },
  { athleteId: 'guepard', variant: 'base' },
  { athleteId: 'lion', variant: 'reverse' },
  { athleteId: 'mx-axolotl', variant: 'prime' },
];

const ROWS = [
  ['A · Losanges de rareté (1 commune → 5 légendaire)', 'gems'],
  ['B · Feuille du logo', 'logo'],
  ['C · Empreinte de patte', 'patte'],
] as const;

createRoot(document.getElementById('root')!).render(
  <div style={{ padding: 24, display: 'grid', gap: 22, color: 'var(--text)' }}>
    {ROWS.map(([title, notch]) => (
      <section key={notch} style={{ display: 'grid', gap: 10 }}>
        <h2 style={{ margin: 0, fontFamily: 'var(--font-display)', fontWeight: 400 }}>{title}</h2>
        <div style={{ display: 'flex', gap: 14 }}>
          {CARDS.map((c) => (
            <Card key={c.athleteId} card={c} size="sm" notch={notch} />
          ))}
        </div>
      </section>
    ))}
  </div>,
);
