import { useId, type CSSProperties } from 'react';
import { HIVER_NEAR, WinterScene } from '../art/hiver';
import { Logo } from './Logo';
import { Plastic } from './PackArt';

// Booster de la Série 3 (Hiver), sur le même sachet que les autres boosters : une nuit polaire sous l'aurore
// boréale, la pleine lune derrière les sommets, des sapins enneigés et un loup qui hurle (art/hiver.tsx).
// Premier visuel : pas encore utilisé dans le jeu.

const styleFor = (name: string) => ({ '--near': HIVER_NEAR, '--ink': '#f4f9ff', '--pk-title': `${Math.min(15, 128 / Math.max(name.length, 7))}cqw` }) as CSSProperties;

export function PackArtHiver({ className = '', kicker = 'Édition spéciale', name = 'Hiver', line = '5 cartes' }: { className?: string; kicker?: string; name?: string; line?: string }) {
  const id = `pah${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  return (
    <div className={`pack-art pack-art--hiver ${className}`} style={styleFor(name)}>
      <div className="pack-art__sachet">
        <svg className="pack-art__scene" viewBox="0 0 120 172" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
          <WinterScene w={120} h={172} id={id} seed="Série 3 · Hiver" moon={[0.3, 0.4]} />
          <defs>
            <linearGradient id={`${id}-shade`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={HIVER_NEAR} stopOpacity={0} />
              <stop offset="0.55" stopColor={HIVER_NEAR} stopOpacity={0.5} />
              <stop offset="1" stopColor={HIVER_NEAR} stopOpacity={0.9} />
            </linearGradient>
          </defs>
          {/* ombre au pied de la scène, pour que le nom posé dessus se lise toujours */}
          <rect x={-2} y={112} width={124} height={62} fill={`url(#${id}-shade)`} />
        </svg>
        <div className="pack-art__grain" />
        <div className="pack-art__frame" />
        <div className="pack-art__logo">
          <Logo />
        </div>
        <div className="pack-art__series">Série 3 · Hiver</div>
        <div className="pack-art__kicker">{kicker}</div>
        <div className="pack-art__name">{name}</div>
        <div className="pack-art__line">
          <span>{line}</span>
        </div>
        <div className="pack-art__pillow" />
        <Plastic seed="Série 3 · Hiver" />
        <div className="pack-art__seal pack-art__seal--top" />
        <div className="pack-art__seal pack-art__seal--bottom" />
        <div className="pack-art__gloss" />
        <div className="pack-art__shine" />
      </div>
    </div>
  );
}
