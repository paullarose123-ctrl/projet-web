import { createRoot } from 'react-dom/client';
import '../styles/fonts.css';
import '../styles/base.css';
import '../styles/card.css';
import '../styles/app.css';
import '../styles/motion.css';
import './promo.css';
import { CardBack } from '../components/CardBack';
import { CardBackHiver } from '../components/CardBackHiver';
import { CardBackMexique } from '../components/CardBackMexique';
import { PackArt } from '../components/PackArt';
import { PackArtHiver } from '../components/PackArtHiver';
import { PackArtMexique } from '../components/PackArtMexique';

// Planche de présentation de la Série 3 (Hiver) : le booster et le dos des cartes, à côté de ceux des séries 1 et 2
// (page de développement promo/hiver.html).

const back = (node: React.ReactNode, w: number, rot = 0) => (
  <div style={{ width: w, aspectRatio: '100 / 140', transform: `rotate(${rot}deg)`, filter: 'drop-shadow(0 18px 26px rgba(0,0,0,0.55))' }}>{node}</div>
);
const pack = (node: React.ReactNode, w: number, rot = 0) => (
  <div style={{ width: w, transform: `rotate(${rot}deg)`, filter: 'drop-shadow(0 22px 30px rgba(0,0,0,0.6))' }}>{node}</div>
);

function Planche() {
  return (
    <div className="hiver-planche">
      <header>
        <p className="eyebrow">Premier visuel</p>
        <h1>Série 3 · Hiver</h1>
        <p>Une nuit polaire sous l’aurore boréale : pleine lune, sommets enneigés, sapins sous la neige et un loup qui hurle.</p>
      </header>
      <div className="hiver-planche__hero">
        {pack(<PackArtHiver />, 340, -4)}
        <div className="hiver-planche__backs">
          {back(<CardBackHiver />, 250, 5)}
          <p className="hiver-planche__label">Dos des cartes</p>
        </div>
      </div>
      <div className="hiver-planche__compare">
        <p className="hiver-planche__label">À côté des deux premières séries</p>
        <div className="hiver-planche__row">
          {pack(<PackArt tone="bronze" name="Booster gratuit" size={5} title="Animaux du monde" />, 120)}
          {back(<CardBack />, 96)}
          {pack(<PackArtMexique />, 120)}
          {back(<CardBackMexique />, 96)}
          {pack(<PackArtHiver />, 120)}
          {back(<CardBackHiver />, 96)}
        </div>
      </div>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(<Planche />);
