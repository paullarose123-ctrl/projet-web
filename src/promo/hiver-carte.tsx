import { createRoot } from 'react-dom/client';
import '../styles/fonts.css';
import '../styles/base.css';
import '../styles/card.css';
import '../styles/app.css';
import '../styles/motion.css';
import './promo.css';
import { Card } from '../components/Card';
import { cardsOfSerie } from '../engine/series';
import { collectionNumber } from '../engine/cards';

// Maquette des cartes de la Série 3 (Hiver) : l'ours polaire en classique, en Reverse et en Prime (Knut), dans le
// style de l'hiver, à côté de la même carte en Série 1 et d'une carte du Mexique (page promo/hiver-carte.html).

/** Une carte de chaque rareté, dans le style de l'hiver (promo/hiver-carte.html?raretes). */
function Raretes() {
  const cards: [string, string][] = [
    ['hermine', 'Commune'],
    ['phoque-du-groenland', 'Peu commune'],
    ['renard-polaire', 'Rare'],
    ['harfang', 'Épique'],
  ];
  return (
    <div className="hiver-planche hiver-planche--cartes">
      <header>
        <p className="eyebrow">Premier visuel</p>
        <h1>Série 3 · Hiver : les raretés</h1>
        <p>La bordure de glace change de couleur avec la rareté : givre, ciel d’hiver, glace turquoise, puis aurore violette (et l’aurore complète pour les Légendaires).</p>
      </header>
      <div className="hiver-planche__hero hiver-planche__hero--four">
        {cards.map(([id, label]) => (
          <figure key={id}>
            <Card card={{ athleteId: id, variant: 'base' }} size="xl" serie={3} />
            <figcaption className="hiver-planche__label">{label}</figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}

function Planche() {
  return (
    <div className="hiver-planche hiver-planche--cartes">
      <header>
        <p className="eyebrow">Premier visuel</p>
        <h1>Une carte de la Série 3 · Hiver</h1>
        <p>Bordure de givre semée de flocons, glaçons sous le cadre, sommets et sapins enneigés sur l’horizon de la photo ; la Prime porte une aurore boréale.</p>
      </header>
      <div className="hiver-planche__hero">
        <Card card={{ athleteId: 'ours-polaire', variant: 'base' }} size="xl" serie={3} />
        <Card card={{ athleteId: 'ours-polaire', variant: 'reverse' }} size="xl" serie={3} />
        <Card card={{ athleteId: 'ours-polaire', variant: 'prime' }} size="xl" serie={3} />
      </div>
      <div className="hiver-planche__compare">
        <p className="hiver-planche__label">Classique · Reverse · Prime (Knut) — et à côté des deux premières séries</p>
        <div className="hiver-planche__row">
          <Card card={{ athleteId: 'ours-polaire', variant: 'base' }} size="md" />
          <Card card={{ athleteId: 'mx-jaguar', variant: 'base' }} size="md" />
          <Card card={{ athleteId: 'ours-polaire', variant: 'base' }} size="md" serie={3} />
        </div>
        <p className="hiver-planche__label">Série 1 · Série 2 Mexique · Série 3 Hiver</p>
      </div>
    </div>
  );
}

/** Toutes les cartes de la série, dans l'ordre de l'album (promo/hiver-carte.html?toutes ; &de=0&a=40 pour une partie). */
function Toutes() {
  const params = new URLSearchParams(location.search);
  const cards = cardsOfSerie(3)
    .slice()
    .sort((a, b) => Number(collectionNumber(a).slice(1)) - Number(collectionNumber(b).slice(1)))
    .slice(Number(params.get('de') ?? 0), Number(params.get('a') ?? 999));
  return (
    <div className="hiver-planche hiver-planche--toutes">
      <div className="hiver-planche__grid">
        {cards.map((athlete) => (
          <Card key={athlete.id} card={{ athleteId: athlete.id, variant: athlete.prime ? 'prime' : 'base' }} size="md" serie={3} />
        ))}
      </div>
    </div>
  );
}

/** Cinq des plus belles cartes de la série, une de chaque rareté (une couleur de cadre chacune), pour les réseaux
 *  (promo/hiver-carte.html?top). */
function Top() {
  // hermine (Peu commune), renard polaire (Rare), tigre de l'Amour (Légendaire), grue du Japon (Épique), bruant (Commune)
  const cards: [string, 'base' | 'prime'][] = [
    ['hv-hermine', 'base'],
    ['hv-renard-polaire', 'base'],
    ['tigre-de-l-amour', 'base'],
    ['grue-du-japon', 'base'],
    ['bruant-des-neiges', 'base'],
  ];
  return (
    <div className="hiver-planche hiver-planche--top">
      <div className="hiver-planche__hero hiver-planche__hero--top">
        {cards.map(([id, variant], i) => (
          <figure key={id} className={i === 2 ? 'is-center' : ''}>
            <Card card={{ athleteId: id, variant }} size="xl" serie={3} />
          </figure>
        ))}
      </div>
    </div>
  );
}

const PARAMS = new URLSearchParams(location.search);
createRoot(document.getElementById('root')!).render(
  PARAMS.has('toutes') ? <Toutes /> : PARAMS.has('raretes') ? <Raretes /> : PARAMS.has('top') ? <Top /> : <Planche />,
);
