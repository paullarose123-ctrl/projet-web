import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/fonts.css';
import './styles/base.css';
import './styles/card.css';
import './styles/app.css';
import './styles/motion.css';
import { App } from './App';
import { AllCards, Gallery, MexicoBackdropPreview } from './dev/Gallery';
import { useGame } from './store/game';
import { startAutoSave } from './store/account';
import { startAnalytics } from './analytics';

// En développement, l'état du jeu est accessible depuis la console (tests visuels).
if (import.meta.env.DEV) (window as unknown as { __game: typeof useGame }).__game = useGame;

// #galerie affiche la planche de contrôle visuel (matières de cartes et drapeaux) ;
// #toutes-les-cartes affiche toutes les cartes, pour la planche de revue ; #serie-2 celles du Mexique ;
// #fonds-mexique=panteon (monarcas, xochimilco) un décor d'ouverture des boosters du Mexique.
const hash = typeof window !== 'undefined' ? window.location.hash : '';

// la partie d'un joueur connecté part toute seule dans son compte
startAutoSave();
// mesure d'audience anonyme (GoatCounter), sur le vrai site seulement
startAnalytics();

createRoot(document.getElementById('root')!).render(
  <StrictMode>{hash === '#galerie' ? <Gallery /> : hash === '#toutes-les-cartes' ? <AllCards /> : hash === '#serie-2' ? <AllCards serie={2} /> : hash.startsWith('#fonds-mexique') ? <MexicoBackdropPreview scene={hash.split('=')[1] ?? ''} /> : <App />}</StrictMode>,
);
