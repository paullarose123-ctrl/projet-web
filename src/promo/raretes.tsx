import { createRoot } from 'react-dom/client';
import '../styles/fonts.css';
import '../styles/base.css';
import '../styles/card.css';
import '../styles/app.css';
import { Card } from '../components/Card';
import { isIcon, rarityOf } from '../engine/cards';
import { cardsOfSerie } from '../engine/series';

// Planche de développement : une carte de chaque rareté (de Commune à Légendaire), pour chaque série, pour vérifier
// qu'on reconnaît la rareté d'un coup d'œil. ?serie=3 n'affiche qu'une série ; ?n=3 montre trois cartes par rareté.

const RARITIES = ['commune', 'peu-commune', 'rare', 'epique', 'legendaire'];
const params = new URLSearchParams(location.search);
const only = Number(params.get('serie')) || 0;
const per = Number(params.get('n')) || 1;

function Row({ serie }: { serie: number }) {
  const cards = cardsOfSerie(serie).filter((a) => !isIcon(a) && !a.id.startsWith('habitat'));
  return (
    <section style={{ padding: '18px 24px' }}>
      <h2 style={{ color: '#fff8ec', fontFamily: 'var(--font-display)', margin: '0 0 12px' }}>Série {serie}</h2>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        {RARITIES.map((r) => (
          <div key={r} style={{ display: 'grid', gap: 8, justifyItems: 'center' }}>
            <div style={{ display: 'flex', gap: 10 }}>
              {cards
                .filter((a) => rarityOf(a).id === r)
                .slice(0, per)
                .map((a) => (
                  <Card key={a.id} card={{ athleteId: a.id, variant: 'base' }} size="md" />
                ))}
            </div>
            <span style={{ color: '#e8dec4', font: '600 15px var(--font-body)' }}>{r}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function Planche() {
  return <div>{(only ? [only] : [1, 2, 3]).map((s) => <Row key={s} serie={s} />)}</div>;
}

createRoot(document.getElementById('root')!).render(<Planche />);
