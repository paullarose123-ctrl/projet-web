import { createRoot } from 'react-dom/client';
import '../styles/fonts.css';
import '../styles/base.css';
import '../styles/app.css';
import { Card } from '../components/Card';
import type { CardFace } from '../engine/types';

// Page de développement : la Reverse légendaire avec une ancienne feuille de style des cartes (?v=commit).
const sheets = import.meta.glob('./old-*.css', { query: '?inline', import: 'default', eager: true }) as Record<string, string>;
const current = import.meta.glob('../styles/card.css', { query: '?inline', import: 'default', eager: true }) as Record<string, string>;
const v = new URLSearchParams(location.search).get('v');
const css = v ? sheets[`./old-${v}.css`] : Object.values(current)[0];
const style = document.createElement('style');
style.textContent = css;
document.head.appendChild(style);

const cards: CardFace[] = [
  { athleteId: 'lion', variant: 'reverse' },
  { athleteId: 'tigre', variant: 'reverse' },
];

createRoot(document.getElementById('root')!).render(
  <div style={{ padding: 24, display: 'flex', gap: 14 }}>
    {cards.map((c) => (
      <Card key={c.athleteId} card={c} size="md" />
    ))}
  </div>,
);
