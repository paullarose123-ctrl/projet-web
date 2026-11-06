import { createRoot } from 'react-dom/client';
import '../styles/fonts.css';
import '../styles/base.css';
import '../styles/card.css';
import '../styles/app.css';
import { Card } from '../components/Card';
import type { CardFace } from '../engine/types';

// Maquette (page de développement promo/sans-code.html) : les mêmes cartes avec et sans le code en 3 lettres.

const CARDS: CardFace[] = [
  { athleteId: 'lion', variant: 'reverse' },
  { athleteId: 'guepard', variant: 'base' },
  { athleteId: 'tapir', variant: 'base' },
  { athleteId: 'caniche', variant: 'base' },
];

function Row({ title, hide }: { title: string; hide: boolean }) {
  return (
    <section className={hide ? 'sans-code' : ''} style={{ display: 'grid', gap: 12 }}>
      <h2 style={{ margin: 0, fontFamily: 'var(--font-display)', fontWeight: 400 }}>{title}</h2>
      <div style={{ display: 'flex', gap: 22 }}>
        {CARDS.map((c) => (
          <Card key={c.athleteId} card={c} size="md" />
        ))}
      </div>
    </section>
  );
}

createRoot(document.getElementById('root')!).render(
  <div style={{ padding: 28, display: 'grid', gap: 28, color: 'var(--text)' }}>
    <style>{'.sans-code .card__code { display: none; }'}</style>
    <Row title="Aujourd’hui : avec les 3 lettres" hide={false} />
    <Row title="Sans les 3 lettres" hide />
  </div>,
);
