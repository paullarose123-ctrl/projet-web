import { StrictMode, Suspense, lazy, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/fonts.css';
import './styles/base.css';
import './styles/card.css';
import './styles/app.css';
import './styles/motion.css';
import './styles/pioche.css';
import { App } from './App';
import { startFluidite } from './fluidite';
import { useGame } from './store/game';
import { startAutoSave } from './store/account';
import { startAnalytics } from './analytics';

// En développement, l'état du jeu est accessible depuis la console (tests visuels).
if (import.meta.env.DEV) (window as unknown as { __game: typeof useGame }).__game = useGame;

// #galerie affiche la planche de contrôle visuel (matières de cartes et drapeaux) ;
// #toutes-les-cartes affiche toutes les cartes, pour la planche de revue ; #serie-2 celles du Mexique, #serie-3 celles
// de l'Hiver ;
// #fonds-mexique=panteon (monarcas, xochimilco, volcanes, barrancas, desierto, selva) un décor d'ouverture du Mexique ;
// #divisions les blasons de la ligue.
const hash = typeof window !== 'undefined' ? window.location.hash : '';

// planches de contrôle (développement) : chargées à part, seulement quand on les demande, pour alléger le jeu
const Gallery = lazy(() => import('./dev/Gallery').then((m) => ({ default: m.Gallery })));
const AllCards = lazy(() => import('./dev/Gallery').then((m) => ({ default: m.AllCards })));
const MexicoBackdropPreview = lazy(() => import('./dev/Gallery').then((m) => ({ default: m.MexicoBackdropPreview })));
const DivisionBadges = lazy(() => import('./dev/Gallery').then((m) => ({ default: m.DivisionBadges })));
const dev = (node: ReactNode) => <Suspense fallback={null}>{node}</Suspense>;

// téléphone lent : animations allégées (mesure automatique, ou réglage du joueur dans son profil)
startFluidite();

// la partie d'un joueur connecté part toute seule dans son compte
startAutoSave();
// mesure d'audience anonyme (GoatCounter), sur le vrai site seulement
startAnalytics();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {hash === '#galerie'
      ? dev(<Gallery />)
      : hash === '#toutes-les-cartes'
        ? dev(<AllCards />)
        : hash === '#serie-2'
          ? dev(<AllCards serie={2} />)
          : hash === '#serie-3'
            ? dev(<AllCards serie={3} />)
            : hash.startsWith('#fonds-mexique')
              ? dev(<MexicoBackdropPreview scene={hash.split('=')[1] ?? ''} />)
              : hash === '#divisions'
                ? dev(<DivisionBadges />)
                : <App />}
  </StrictMode>,
);
