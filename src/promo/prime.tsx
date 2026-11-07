import { createRoot } from 'react-dom/client';
import '../styles/fonts.css';
import '../styles/base.css';
import '../styles/card.css';
import '../styles/app.css';
import './prime.css';
import { Card } from '../components/Card';
import type { CardFace, Variant } from '../engine/types';

// Maquette (page de développement promo/prime.html) : la Reverse comme une carte normale « inversée ».

const IDS = ['thylacine', 'quagga', 'lion-de-l-atlas', 'crapaud-dore', 'grizzli-du-mexique', 'phoque-moine-des-caraibes'];
const ROWS: [string, Variant, string][] = [
  ['Icônes aujourd’hui', 'base', ''],
  ['1 · Cadre de musée doré', 'base', 'ic-1'],
  ['2 · Pareil, avec la bordure semée de feuille d’or', 'base', 'ic-2'],
  ['Prime du Mexique', 'prime', ''],
];

const ROW_IDS: Record<string, string[]> = { 'Prime du Mexique': ['mx-jaguar', 'mx-requin-baleine', 'mx-requin-blanc', 'mx-chihuahua', 'xoloitzcuintle'] };
const ID_BY_ROW: Record<string, string> = { 'Prime du Mexique': 'mx-jaguar' };
const params = new URLSearchParams(location.search);
const id = params.get('id') ?? 'lion';

createRoot(document.getElementById('root')!).render(
  params.has('id') ? (
    <div style={{ padding: 20, display: 'flex', gap: 18, color: 'var(--text)' }}>
      {ROWS.map(([title, variant, cls]) => (
        <section key={title} style={{ display: 'grid', gap: 8, justifyItems: 'center' }}>
          <h2 style={{ margin: 0, fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: 20 }}>{title}</h2>
          <Card card={{ athleteId: ID_BY_ROW[title] ?? id, variant } as CardFace} size="md" className={cls} />
        </section>
      ))}
    </div>
  ) : (
    <div style={{ padding: 24, display: 'grid', gap: 22, color: 'var(--text)' }}>
      {ROWS.map(([title, variant, cls]) => (
        <section key={title} style={{ display: 'grid', gap: 10 }}>
          <h2 style={{ margin: 0, fontFamily: 'var(--font-display)', fontWeight: 400 }}>{title}</h2>
          <div style={{ display: 'flex', gap: 14 }}>
            {(ROW_IDS[title] ?? IDS).map((athleteId) => (
              <Card key={athleteId} card={{ athleteId, variant } as CardFace} size="md" className={cls} />
            ))}
          </div>
        </section>
      ))}
    </div>
  ),
);
