import { createRoot } from 'react-dom/client';
import '../styles/fonts.css';
import '../styles/base.css';
import '../styles/card.css';
import '../styles/app.css';
import './prime.css';
import { Card } from '../components/Card';
import type { CardFace } from '../engine/types';

// Maquette (page de développement promo/prime.html) : les Prime de la Série 1.

const IDS = ['lion', 'panda', 'orque', 'gorille', 'husky', 'chat'];
const ROWS: [string, string][] = [
  ['En ligne aujourd’hui', ''],
  ['I · Bordure de nacre plus large, avec un liseré nacré et des losanges', 'pr-i'],
  ['J · Le dégradé de la photo qui ondule doucement (figé ici)', 'pr-j'],
  ['K · Les deux', 'pr-i pr-j'],
];

createRoot(document.getElementById('root')!).render(
  <div style={{ padding: 24, display: 'grid', gap: 22, color: 'var(--text)' }}>
    {ROWS.map(([title, cls]) => (
      <section key={title} style={{ display: 'grid', gap: 10 }}>
        <h2 style={{ margin: 0, fontFamily: 'var(--font-display)', fontWeight: 400 }}>{title}</h2>
        <div style={{ display: 'flex', gap: 14 }}>
          {IDS.map((athleteId) => (
            <Card key={athleteId} card={{ athleteId, variant: 'prime' } as CardFace} size="md" className={cls} />
          ))}
        </div>
      </section>
    ))}
  </div>,
);
