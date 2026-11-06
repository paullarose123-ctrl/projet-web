import { createRoot } from 'react-dom/client';
import '../styles/fonts.css';
import '../styles/base.css';
import '../styles/app.css';
import './reserve.css';
import { BallIcon } from '../components/Balles';
import { Landscape, type SceneDef } from '../components/PackScene';
import { ATHLETES_BY_ID } from '../data/athletes';
import { rarityOf } from '../engine/cards';
import { usePhoto } from '../photos';
import { HERO_SCENE } from '../art/scenes';

// Maquette de l'écran « Ma Réserve » (page de développement promo/reserve.html), dans le langage du jeu : chaque enclos
// est une affiche peinte comme les boosters, et les animaux installés y sont posés en médaillons photo, cerclés de la
// couleur de leur rareté. Les enclos à débloquer restent dans l'ombre.

const SCENES: Record<string, SceneDef> = {
  savane: {
    kind: 'savane',
    palette: { sky: ['#3b2d55', '#f4a35c'], sun: '#fff0cf', far: '#c48c5c', near: '#24160c', accent: '#f2c46b' },
  },
  banquise: {
    kind: 'aurore',
    palette: { sky: ['#071a2e', '#1d4f6e'], sun: '#f4fbff', far: '#7fa6c6', near: '#0b2236', accent: '#7ff0c1', accent2: '#b28cff' },
  },
  foret: {
    kind: 'foret',
    palette: { sky: ['#17333a', '#c7d58a'], sun: '#fff6d8', far: '#6b8f62', near: '#0b170f', accent: '#ffffff' },
  },
  lagon: {
    kind: 'marais',
    palette: { sky: ['#1b3b5c', '#f2a7a0'], sun: '#fff0dc', far: '#6f9a8a', near: '#0c1c18', accent: '#ff9fbf' },
  },
};

function Medal({ id, gain }: { id: string; gain: number }) {
  const athlete = ATHLETES_BY_ID[id];
  const photo = usePhoto(athlete);
  return (
    <span className="rsv-medal" style={{ ['--ring' as string]: `var(--r-${rarityOf(athlete).id})` }} title={athlete.first}>
      <span className="rsv-medal__photo">{photo.src && <img src={photo.src} alt="" />}</span>
      <i>+{gain}</i>
    </span>
  );
}

function Enclos({ name, scene, seed, animals, places, perHour }: { name: string; scene: SceneDef; seed: string; animals: [string, number][]; places: number; perHour: number }) {
  return (
    <section className="rsv-enclos">
      <Landscape scene={scene} seed={seed} className="rsv-enclos__art" />
      <header>
        <h2>{name}</h2>
        <span className="rsv-chip">
          {animals.length}/{places}
        </span>
        <span className="rsv-chip rsv-chip--gain">
          <BallIcon /> +{perHour}/h
        </span>
      </header>
      <div className="rsv-enclos__animals">
        {animals.map(([id, gain]) => (
          <Medal key={id} id={id} gain={gain} />
        ))}
        {Array.from({ length: places - animals.length }, (_, k) => (
          <span key={k} className="rsv-medal rsv-medal--empty">
            <span className="rsv-medal__photo">+</span>
          </span>
        ))}
      </div>
    </section>
  );
}

function Locked({ name, scene, seed, price, hint }: { name: string; scene: SceneDef; seed: string; price: string; hint: string }) {
  return (
    <section className="rsv-enclos is-locked">
      <Landscape scene={scene} seed={seed} className="rsv-enclos__art" />
      <div className="rsv-locked">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <rect x={5} y={10.5} width={14} height={10} rx={2.5} />
          <path d="M8,10.5 V8 A4,4 0 0 1 16,8 V10.5" />
        </svg>
        <h2>{name}</h2>
        <p>{hint}</p>
        <button type="button" className="rsv-unlock">
          Débloquer <BallIcon /> {price}
        </button>
      </div>
    </section>
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
      <div className="rsv-list">
        <Enclos
          name="Savane"
          scene={SCENES.savane}
          seed="reserve-savane"
          animals={[
            ['lion', 18],
            ['girafe', 14],
            ['elephant', 16],
            ['zebre', 8],
          ]}
          places={5}
          perHour={56}
        />
        <Enclos
          name="Banquise"
          scene={SCENES.banquise}
          seed="reserve-banquise"
          animals={[
            ['ours-polaire', 22],
            ['manchot-empereur', 12],
            ['renard-polaire', 10],
            ['phoque', 6],
            ['harfang', 14],
          ]}
          places={5}
          perHour={64}
        />
        <Enclos
          name="Forêt"
          scene={SCENES.foret}
          seed="reserve-foret"
          animals={[
            ['panda', 20],
            ['renard-roux', 6],
            ['cerf', 8],
          ]}
          places={5}
          perHour={34}
        />
        <Locked name="Montagne" scene={HERO_SCENE} seed="reserve-montagne" price="2 500" hint="Aigles, chamois, panthère des neiges…" />
        <Enclos
          name="Lagon"
          scene={SCENES.lagon}
          seed="reserve-lagon"
          animals={[
            ['flamant-rose', 9],
            ['hippopotame', 12],
            ['crocodile-du-nil', 11],
          ]}
          places={5}
          perHour={32}
        />
      </div>
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
