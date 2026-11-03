import { useId } from 'react';
import { WinterScene } from '../art/hiver';
import { Logo } from './Logo';

// Dos des cartes de la Série 3 (Hiver), dans le langage des autres dos : la même affiche, une nuit polaire sous
// l'aurore boréale (art/hiver.tsx). Premier visuel : pas encore utilisé dans le jeu.

export function CardBackHiver({ className = '' }: { className?: string }) {
  const id = `cbh${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  return (
    <div className={`card-back card-back--hiver ${className}`}>
      <svg className="card-back__scene" viewBox="0 0 100 140" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <WinterScene w={100} h={140} id={id} seed="Dos · Série 3 · Hiver" moon={[0.5, 0.42]} />
        <rect x={3.4} y={3.4} width={93.2} height={133.2} rx={3.4} fill="none" stroke="#f4f9ff" strokeOpacity={0.6} strokeWidth={0.45} />
      </svg>
      <div className="card-back__grain" />
      <div className="card-back__gloss" />
      <div className="card-back__crest">
        <Logo />
        <small>Série 3 · Hiver</small>
      </div>
    </div>
  );
}
