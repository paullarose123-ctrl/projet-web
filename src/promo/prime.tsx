import { createRoot } from 'react-dom/client';
import '../styles/fonts.css';
import '../styles/base.css';
import '../styles/card.css';
import '../styles/app.css';
import './prime.css';
import { Card } from '../components/Card';
import type { CardFace, Variant } from '../engine/types';

// Maquette (page de développement promo/prime.html) : la Reverse comme une carte normale « inversée ».

const IDS = ['lion', 'tigre', 'panda', 'orque', 'requin-blanc', 'mx-axolotl'];
const ROWS: [string, Variant, string][] = [
  ['Légendaire normale', 'base', ''],
  ['Reverse aujourd’hui', 'reverse', ''],
  ['1 · Bas corail et orange', 'reverse', 'y-1'],
  ['2 · Bas rose corail', 'reverse', 'y-2'],
];

const params = new URLSearchParams(location.search);
const id = params.get('id') ?? 'lion';

createRoot(document.getElementById('root')!).render(
  params.has('id') ? (
    <div style={{ padding: 20, display: 'flex', gap: 18, color: 'var(--text)' }}>
      {ROWS.map(([title, variant, cls]) => (
        <section key={title} style={{ display: 'grid', gap: 8, justifyItems: 'center' }}>
          <h2 style={{ margin: 0, fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: 20 }}>{title}</h2>
          <Card card={{ athleteId: id, variant } as CardFace} size="md" className={cls} />
        </section>
      ))}
    </div>
  ) : (
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
    </div>
  ),
);
