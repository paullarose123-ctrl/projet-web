import { createRoot } from 'react-dom/client';
import '../styles/fonts.css';
import '../styles/base.css';
import '../styles/card.css';
import '../styles/app.css';
import { Card } from '../components/Card';
import type { CardFace, Variant } from '../engine/types';

// Maquette (page de développement promo/prime.html) : la Reverse comme une carte normale « inversée ».

const IDS = ['lion', 'tigre', 'panda', 'orque', 'requin-blanc', 'mx-axolotl'];
const ROWS: [string, Variant, string][] = [
  ['Légendaire normale', 'base', ''],
  ['Reverse légendaire, avec le côté brillant', 'reverse', ''],
];

createRoot(document.getElementById('root')!).render(
  <div style={{ padding: 24, display: 'grid', gap: 22, color: 'var(--text)' }}>
    {ROWS.map(([title, variant, cls]) => (
      <section key={title} style={{ display: 'grid', gap: 10 }}>
        <h2 style={{ margin: 0, fontFamily: 'var(--font-display)', fontWeight: 400 }}>{title}</h2>
        <div style={{ display: 'flex', gap: 14 }}>
          {IDS.map((athleteId) => (
            <Card key={athleteId} card={{ athleteId, variant } as CardFace} size="md" className={cls} />
          ))}
        </div>
      </section>
    ))}
  </div>,
);
