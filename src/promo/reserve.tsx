import { useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import '../styles/fonts.css';
import '../styles/base.css';
import '../styles/app.css';
import './reserve.css';
import { BallIcon } from '../components/Balles';
import { drawReserve, H, LION_AT, W, ZONES } from './reserve-pixel';

// Maquette de l'écran « Ma Réserve » (page de développement promo/reserve.html) : la réserve en pixel art, et autour
// l'interface habituelle du jeu.

const at = (x: number, y: number) => ({ left: `${(x / W) * 100}%`, top: `${(y / H) * 100}%` });

function Scene() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current!.getContext('2d')!;
    // la réserve vit : une image par rafraîchissement ; ?t=… fige un instant (captures)
    const fixed = new URLSearchParams(location.search).get('t');
    const capture = window as unknown as { reserveAt?: (t: number) => void };
    capture.reserveAt = (t) => drawReserve(c, t);
    if (fixed !== null) {
      drawReserve(c, Number(fixed));
      return;
    }
    let frame = 0;
    const start = performance.now();
    const loop = (now: number) => {
      drawReserve(c, (now - start) / 1000);
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, []);
  const label = (zone: keyof typeof ZONES, name: string, count: number) => (
    <span className={`rsv-zone${ZONES[zone][0] > 60 ? ' is-right' : ''}`} style={ZONES[zone][0] > 60 ? { ...at(0, ZONES[zone][1]), left: 'auto', right: `${((W - ZONES[zone][2] + 3) / W) * 100}%` } : at(ZONES[zone][0] + 3, ZONES[zone][1])}>
      {name} <b>{count}</b>
    </span>
  );
  const lock = (zone: keyof typeof ZONES, name: string, price: string) => {
    const [x0, y0, x1, y1] = ZONES[zone];
    return (
      <span className="rsv-lock" style={at((x0 + x1) / 2, (y0 + y1) / 2 + 3)}>
        <b>{name}</b>
        <span>
          <BallIcon /> {price}
        </span>
      </span>
    );
  };
  return (
    <div className="rsv-scene">
      <canvas ref={ref} width={W} height={H} />
      {label('banquise', 'Banquise', 5)}
      {label('foret', 'Forêt', 2)}
      {label('savane', 'Savane', 5)}
      {label('lagon', 'Marais', 5)}
      {lock('montagne', 'Montagne', '2 500')}
      {lock('jungle', 'Jungle', '5 000')}
      <div className="rsv-bubble" style={at(LION_AT[0] + 11, LION_AT[1] - 7)}>
        <b>Lion</b>
        <span>+18 visiteurs/h</span>
        <em>✓ bon milieu</em>
      </div>
    </div>
  );
}

function Maquette() {
  return (
    <div className="rsv">
      <header className="rsv-head">
        <div>
          <p className="rsv-eyebrow">Niveau 4</p>
          <h1>Ma Réserve</h1>
        </div>
        <span className="rsv-balance">
          <BallIcon /> 12 480
        </span>
      </header>
      <div className="rsv-stats">
        <span>
          <b>17</b> animaux
        </span>
        <span>
          <b>214</b> visiteurs/h
        </span>
        <button type="button" className="rsv-collect">
          Récolter <BallIcon /> +340
        </button>
      </div>
      <Scene />
      <div className="rsv-actions">
        <button type="button" className="rsv-btn rsv-btn--main">
          <svg viewBox="0 0 24 24">
            <path d="M12,5 V19 M5,12 H19" />
          </svg>
          Installer
        </button>
        <button type="button" className="rsv-btn">
          <svg viewBox="0 0 24 24">
            <path d="M4,20 V9 L12,4 L20,9 V20 Z M9,20 V14 H15 V20" />
          </svg>
          Agrandir
        </button>
        <button type="button" className="rsv-btn is-soon">
          <svg viewBox="0 0 24 24">
            <circle cx={12} cy={12} r={8} />
            <path d="M15,9 L13,13 L9,15 L11,11 Z" />
          </svg>
          Expéditions
          <i>bientôt</i>
        </button>
      </div>
      <nav className="rsv-nav">
        {[
          ['Boosters', 'M7,3 H17 L18,5 V19 L17,21 H7 L6,19 V5 Z M9,9 H15 M9,13 H15'],
          ['Collection', 'M8,4 H18 A1,1 0 0 1 19,5 V17 M5,7 H15 A1,1 0 0 1 16,8 V20 A1,1 0 0 1 15,21 H5 A1,1 0 0 1 4,20 V8 A1,1 0 0 1 5,7 Z'],
          ['Réserve', 'M4.5,21 V10.5 M19.5,21 V10.5 M2.5,11 Q12,1.5 21.5,11'],
          ['Marché', 'M4,8 H18 M14,4 L18,8 L14,12 M20,16 H6 M10,12 L6,16 L10,20'],
          ['Duel', 'M8,4 H16 V9 A4,4 0 0 1 8,9 Z M8,6 H5 A3,3 0 0 0 8,11 M16,6 H19 A3,3 0 0 1 16,11 M12,13 V17 M8,20 H16 M9,17 H15 V20 H9 Z'],
          ['Boutique', 'M5,8 H19 L18,20 H6 Z M9,8 V6 A3,3 0 0 1 15,6 V8'],
        ].map(([label, d]) => (
          <span key={label} className={label === 'Réserve' ? 'is-active' : ''}>
            <svg viewBox="0 0 24 24">
              <path d={d} />
              {label === 'Réserve' && (
                // l'entrée de la réserve : une arche, et une empreinte de patte dessous
                <g fill="currentColor" stroke="none">
                  <ellipse cx={12} cy={17.6} rx={2.7} ry={2.2} />
                  <circle cx={8.7} cy={14.3} r={1.15} />
                  <circle cx={10.9} cy={12.7} r={1.15} />
                  <circle cx={13.1} cy={12.7} r={1.15} />
                  <circle cx={15.3} cy={14.3} r={1.15} />
                </g>
              )}
            </svg>
            {label}
          </span>
        ))}
      </nav>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(<Maquette />);
