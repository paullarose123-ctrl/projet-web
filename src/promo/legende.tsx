import { createRoot } from 'react-dom/client';
import '../styles/fonts.css';
import '../styles/base.css';
import '../styles/card.css';
import '../styles/app.css';
import { Card } from '../components/Card';
import type { CardFace } from '../engine/types';

// Maquette (page de développement promo/legende.html) : les Reverse légendaires, à côté des autres raretés.

const IDS = ['souris', 'lynx-roux', 'ocelot', 'loup', 'lion', 'mx-axolotl'];

createRoot(document.getElementById('root')!).render(
  <div style={{ padding: 24, display: 'grid', gap: 22, color: 'var(--text)' }}>
    <section style={{ display: 'grid', gap: 10 }}>
      <h2 style={{ margin: 0, fontFamily: 'var(--font-display)', fontWeight: 400 }}>{document.title}</h2>
      <div style={{ display: 'flex', gap: 14 }}>
        {IDS.map((athleteId) => (
          <Card key={athleteId} card={{ athleteId, variant: 'reverse' } as CardFace} size="md" />
        ))}
      </div>
    </section>
  </div>,
);
