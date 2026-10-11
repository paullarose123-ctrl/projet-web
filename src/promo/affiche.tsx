import { createRoot } from 'react-dom/client';
import '../styles/fonts.css';
import '../styles/base.css';
import '../styles/card.css';
import '../styles/app.css';
import '../styles/motion.css';
import './promo.css';
import { MexiqueAffiche } from './MexiqueAffiche';

// Page de l'affiche de la Série 2 (seulement en développement : promo/affiche.html).
createRoot(document.getElementById('root')!).render(<MexiqueAffiche />);
