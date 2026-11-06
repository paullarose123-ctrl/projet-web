import { createRoot } from 'react-dom/client';
import '../styles/fonts.css';
import '../styles/base.css';
import '../styles/app.css';
import './reserve.css';
import { BallIcon } from '../components/Balles';
import { ATHLETES_BY_ID } from '../data/athletes';
import { rarityOf } from '../engine/cards';
import { usePhoto } from '../photos';
import { MW, ReserveMap, ZONES } from './reserve-map';

// Maquette de l'écran « Ma Réserve » (page de développement promo/reserve.html) : le plan du parc vu de haut, dessiné
// dans le langage des affiches du jeu (reserve-map.tsx), et les animaux installés posés dans leurs enclos en médaillons
// photo, cerclés de la couleur de leur rareté. Les parcelles à débloquer restent sous les nuages.

function Medal({ id, gain, x, y }: { id: string; gain: number; x: number; y: number }) {
  const athlete = ATHLETES_BY_ID[id];
  const photo = usePhoto(athlete);
  return (
    <span className="rsv-medal" style={{ left: x, top: y, ['--ring' as string]: `var(--r-${rarityOf(athlete).id})` }} title={athlete.first}>
      <span className="rsv-medal__photo">{photo.src && <img src={photo.src} alt="" />}</span>
      <i>+{gain}</i>
    </span>
  );
}

const ANIMALS: [string, number, number, number][] = [
  // banquise
  ['ours-polaire', 22, 46, 120],
  ['renard-polaire', 10, 90, 152],
  ['manchot-empereur', 12, 150, 150],
  ['phoque', 6, 134, 98],
  ['harfang', 14, 116, 50],
  // forêt
  ['panda', 20, 66, 262],
  ['renard-roux', 6, 124, 300],
  ['cerf', 8, 70, 340],
  // savane
  ['lion', 18, 242, 326],
  ['girafe', 14, 330, 254],
  ['elephant', 16, 300, 350],
  ['zebre', 8, 352, 304],
  // lagon
  ['flamant-rose', 9, 48, 462],
  ['hippopotame', 12, 104, 468],
  ['crocodile-du-nil', 11, 152, 468],
];

function Zone({ zone, name, count }: { zone: keyof typeof ZONES; name: string; count: number }) {
  const [x0, y0, x1] = ZONES[zone];
  const right = x0 > MW / 2;
  return (
    <span className="rsv-zone" style={right ? { right: MW - x1 + 14, top: y0 } : { left: x0 + 14, top: y0 }}>
      {name} <b>{count}</b>
    </span>
  );
}

function Lock({ zone, name, price }: { zone: keyof typeof ZONES; name: string; price: string }) {
  const [x0, y0, x1, y1] = ZONES[zone];
  return (
    <span className="rsv-lock" style={{ left: (x0 + x1) / 2, top: (y0 + y1) / 2 }}>
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x={5} y={10.5} width={14} height={10} rx={2.5} />
        <path d="M8,10.5 V8 A4,4 0 0 1 16,8 V10.5" />
      </svg>
      <b>{name}</b>
      <span>
        <BallIcon /> {price}
      </span>
    </span>
  );
}

function Plan() {
  return (
    <div className="rsv-map">
      <ReserveMap />
      <Zone zone="banquise" name="Banquise" count={5} />
      <Zone zone="foret" name="Forêt" count={3} />
      <Zone zone="savane" name="Savane" count={4} />
      <Zone zone="lagon" name="Lagon" count={3} />
      <Lock zone="montagne" name="Montagne" price="2 500" />
      <Lock zone="jungle" name="Jungle" price="5 000" />
      {ANIMALS.map(([id, gain, x, y]) => (
        <Medal key={id} id={id} gain={gain} x={x} y={y} />
      ))}
      <span className="rsv-medal rsv-medal--empty" style={{ left: 134, top: 352 }}>
        <span className="rsv-medal__photo">+</span>
      </span>
      <div className="rsv-bubble" style={{ left: 242, top: 300 }}>
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
          <p className="rsv-eyebrow">Niveau 4 · 17 animaux</p>
          <h1>Ma Réserve</h1>
        </div>
        <span className="rsv-balance">
          <BallIcon /> 12 480
        </span>
      </header>
      <div className="rsv-stats">
        <span>
          <b>214</b> visiteurs par heure
        </span>
        <button type="button" className="rsv-collect">
          Récolter <BallIcon /> +340
        </button>
      </div>
      <Plan />
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
          ['Réserve', 'M12,3 C 7,7 6,11 9,13 C 6,14 6,17 12,17 C 18,17 18,14 15,13 C 18,11 17,7 12,3 Z M12,17 V21'],
          ['Marché', 'M4,8 H18 M14,4 L18,8 L14,12 M20,16 H6 M10,12 L6,16 L10,20'],
          ['Duel', 'M8,4 H16 V9 A4,4 0 0 1 8,9 Z M8,6 H5 A3,3 0 0 0 8,11 M16,6 H19 A3,3 0 0 1 16,11 M12,13 V17 M8,20 H16 M9,17 H15 V20 H9 Z'],
          ['Boutique', 'M5,8 H19 L18,20 H6 Z M9,8 V6 A3,3 0 0 1 15,6 V8'],
        ].map(([label, d]) => (
          <span key={label} className={label === 'Réserve' ? 'is-active' : ''}>
            <svg viewBox="0 0 24 24">
              <path d={d} />
            </svg>
            {label}
          </span>
        ))}
      </nav>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(<Maquette />);
