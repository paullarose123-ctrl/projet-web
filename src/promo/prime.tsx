import { createRoot } from 'react-dom/client';
import '../styles/fonts.css';
import '../styles/base.css';
import '../styles/card.css';
import '../styles/app.css';
import './prime.css';
import { Card } from '../components/Card';
import type { CardFace, Variant } from '../engine/types';

// Maquette (page de développement promo/prime.html) : Prime de la Série 1 et Reverse légendaires.

const PRIMES = ['lion', 'panda', 'orque', 'gorille', 'husky', 'chat'];
const LEGENDES = ['lion', 'tigre', 'panda', 'orque', 'requin-blanc', 'mx-axolotl'];
const ROWS: [string, string[], Variant, string][] = [
  ['Prime, version finale', PRIMES, 'prime', ''],
  ['Légendaire normale', LEGENDES, 'base', ''],
  ['Reverse légendaire aujourd’hui', LEGENDES, 'reverse', ''],
  ['L1 · Crépuscule clair : les couleurs exactes de la Légendaire sur un cadre clair', LEGENDES, 'reverse', 'rl-1'],
  ['L2 · Crépuscule inversé : la Légendaire en négatif (bordure prune, cadre couleur coucher de soleil)', LEGENDES, 'reverse', 'rl-2'],
];

createRoot(document.getElementById('root')!).render(
  <div style={{ padding: 24, display: 'grid', gap: 22, color: 'var(--text)' }}>
    {ROWS.map(([title, ids, variant, cls]) => (
      <section key={title} style={{ display: 'grid', gap: 10 }}>
        <h2 style={{ margin: 0, fontFamily: 'var(--font-display)', fontWeight: 400 }}>{title}</h2>
        <div style={{ display: 'flex', gap: 14 }}>
          {ids.map((athleteId) => (
            <Card key={athleteId} card={{ athleteId, variant } as CardFace} size="md" className={cls} />
          ))}
        </div>
      </section>
    ))}
  </div>,
);
