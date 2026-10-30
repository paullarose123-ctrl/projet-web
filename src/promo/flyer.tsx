import { createRoot } from 'react-dom/client';
import type { ReactNode } from 'react';
import '../styles/fonts.css';
import '../styles/base.css';
import '../styles/card.css';
import '../styles/app.css';
import '../styles/motion.css';
import './promo.css';
import { SITE_SCENE } from '../art/scenes';
import { Card } from '../components/Card';
import { Logo } from '../components/Logo';
import { PackArtMexique } from '../components/PackArtMexique';
import { Landscape } from '../components/PackScene';

// Flyer à imprimer (A4, rendu par scripts/promo/flyer.mjs) : le sous-bois du jeu, cinq vraies cartes en éventail,
// l'annonce de la Série 2 · Mexique, ce qu'on fait dans le jeu et un QR code vers animalcards.fr
// (promo/qr-animalcards.svg, avec ?utm_campaign=flyer pour compter les visites venues du flyer).

const FAN: { id: string; variant: 'base' | 'prime' }[] = [
  { id: 'ara', variant: 'base' },
  { id: 'panda', variant: 'base' },
  { id: 'lion', variant: 'base' },
  { id: 'tigre', variant: 'base' },
  { id: 'mx-axolotl', variant: 'base' },
];

const ICONS: Record<string, ReactNode> = {
  booster: <path d="M7 3h10l-1 3 1 3-1 3 1 3-1 3 1 3H7l1-3-1-3 1-3-1-3 1-3Z M10 9h4 M10 13h4" />,
  rare: <path d="M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.4 6.7 19.4l1.2-6L3.4 9.3l6-.7Z" />,
  duel: <path d="M8 4h8v5a4 4 0 0 1-8 0Z M8 6H5a3 3 0 0 0 3 4 M16 6h3a3 3 0 0 1-3 4 M12 13v4 M8 20h8" />,
  echange: <path d="M4 8h13l-3-3 M20 16H7l3 3" />,
};

const FEATURES: [keyof typeof ICONS, string, string][] = [
  ['booster', 'Un booster gratuit', 'toutes les 15 minutes'],
  ['rare', 'Des cartes rares', 'Épiques, Légendaires et Prime'],
  ['duel', 'Des duels', 'de culture générale'],
  ['echange', 'Des échanges', 'entre joueurs'],
];

function Flyer() {
  return (
    <div className="flyer">
      <div className="flyer__sky">
        <Landscape className="flyer__scene" scene={SITE_SCENE} seed="sous-bois" maxWidth={800} />
      </div>
      <div className="flyer__logo">
        <Logo />
      </div>
      <p className="flyer__kicker">Le jeu de cartes des animaux</p>
      <div className="flyer__fan">
        {FAN.map(({ id, variant }, i) => (
          <div key={id} className="flyer__card" style={{ transform: `translateX(${(i - 2) * 108}px) translateY(${Math.abs(i - 2) * 18}px) rotate(${(i - 2) * 7}deg)`, zIndex: 10 - Math.abs(i - 2) }}>
            <Card card={{ uid: id, athleteId: id, variant }} size="md" />
          </div>
        ))}
      </div>
      <h1 className="flyer__title">Collectionne plus de 450 animaux du monde entier&nbsp;!</h1>
      <div className="flyer__news">
        <div className="flyer__news-pack">
          <PackArtMexique />
        </div>
        <div>
          <p className="flyer__news-tag">Nouveau</p>
          <p className="flyer__news-title">La Série 2 · Mexique vient de sortir&nbsp;!</p>
          <p className="flyer__news-sub">Plus de 100 nouvelles espèces : axolotl, jaguar, quetzal, monarque…</p>
        </div>
      </div>
      <ul className="flyer__features">
        {FEATURES.map(([icon, title, sub]) => (
          <li key={icon}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              {ICONS[icon]}
            </svg>
            <span>
              <b>{title}</b> {sub}
            </span>
          </li>
        ))}
      </ul>
      <div className="flyer__qr">
        <div className="flyer__qr-code">
          <img src="/promo/qr-animalcards.svg" alt="QR code vers animalcards.fr" />
        </div>
        <div className="flyer__qr-text">
          <p className="flyer__scan">Scanne et joue gratuitement&nbsp;!</p>
          <p className="flyer__url">www.animalcards.fr</p>
          <p className="flyer__small">Gratuit · sans téléchargement · sur téléphone et ordinateur</p>
        </div>
      </div>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(<Flyer />);
