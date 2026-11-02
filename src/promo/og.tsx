import { createRoot } from 'react-dom/client';
import '../styles/fonts.css';
import '../styles/base.css';
import '../styles/card.css';
import '../styles/app.css';
import '../styles/motion.css';
import './promo.css';
import { SITE_SCENE } from '../art/scenes';
import { Card } from '../components/Card';
import { Logo } from '../components/Logo';
import { Landscape } from '../components/PackScene';

// Image de partage du site (public/og-image.jpg, 1200 × 630) : celle que montrent Google, WhatsApp, Discord, X…
// quand on partage animalcards.fr. Page de développement promo/og.html, capturée par une capture d'écran.

const FAN = [
  { id: 'ara', variant: 'base' as const },
  { id: 'mx-axolotl', variant: 'base' as const },
  { id: 'mx-jaguar', variant: 'prime' as const },
  { id: 'panda', variant: 'base' as const },
  { id: 'mx-quetzal', variant: 'base' as const },
];

function OgImage() {
  return (
    <div className="og">
      <div className="og__sky">
        <Landscape className="og__scene" scene={SITE_SCENE} seed="sous-bois" maxWidth={1200} />
      </div>
      <div className="og__text">
        <div className="og__logo">
          <Logo />
        </div>
        <p className="og__kicker">Le jeu de cartes des animaux</p>
        <p className="og__pitch">Ouvre des boosters, collectionne plus de 500 animaux, affronte tes amis en duel.</p>
        <p className="og__free">Gratuit · sans téléchargement · animalcards.fr</p>
      </div>
      <div className="og__fan">
        {FAN.map(({ id, variant }, i) => (
          <div
            key={id}
            className="og__card"
            style={{ transform: `translate(-50%, -50%) translateX(${(i - 2) * 92}px) translateY(${Math.abs(i - 2) * 16}px) rotate(${(i - 2) * 8}deg)`, zIndex: 10 - Math.abs(i - 2) }}
          >
            <Card card={{ uid: id, athleteId: id, variant }} size="md" />
          </div>
        ))}
      </div>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(<OgImage />);
