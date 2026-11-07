import { createRoot } from 'react-dom/client';
import '../styles/fonts.css';
import '../styles/base.css';
import '../styles/card.css';
import '../styles/app.css';
import './legende.css';
import { Card } from '../components/Card';
import type { CardFace } from '../engine/types';

// Maquette (page de développement promo/legende.html) : les Reverse légendaires, à côté des autres raretés.

const IDS = ['lion', 'tigre', 'panda', 'orque', 'requin-blanc', 'mx-axolotl'];

const ROWS: [string, string][] = [
    ['A · Aquarelle de feu (la première version)', 'rl-a'],
  ['A2 · Rehaussée d’or, avec des étoiles qui scintillent', 'rl-a rl-a2'],
  ['A3 · Pareil, avec les rayons du soleil couchant', 'rl-a rl-a2 rl-a3'],
];

createRoot(document.getElementById('root')!).render(
  <div style={{ padding: 24, display: 'grid', gap: 22, color: 'var(--text)' }}>
    {ROWS.map(([title, cls]) => (
      <section key={title} style={{ display: 'grid', gap: 10 }}>
        <h2 style={{ margin: 0, fontFamily: 'var(--font-display)', fontWeight: 400 }}>{title}</h2>
        <div style={{ display: 'flex', gap: 14 }}>
          {IDS.map((athleteId) => (
            <Card key={athleteId} card={{ athleteId, variant: 'reverse' } as CardFace} size="md" className={cls} />
          ))}
        </div>
      </section>
    ))}
  </div>,
);
