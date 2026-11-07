import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import '../styles/fonts.css';
import '../styles/base.css';
import '../styles/card.css';
import '../styles/app.css';
import './pub-reserve.css';
import { Card } from '../components/Card';
import { Logo } from '../components/Logo';
import { BallIcon } from '../components/Balles';
import { PackArt } from '../components/PackArt';
import { Landscape } from '../components/PackScene';
import { SCREEN_SCENES } from '../art/scenes';
import { SCENE_H, SCENE_W, ZONE_BOX, drawScene, type SceneModel } from '../art/reserve-scene';
import { TRAIL_H, TRAIL_W, drawTrail } from '../art/expedition-scene';
import { blit, spriteForAthlete } from '../art/reserve-sprites';
import { ATHLETES_BY_ID } from '../data/athletes';
import { SHOP_PACKS } from '../engine/packs';
import type { EnclosId } from '../engine/reserve';
import type { CardFace } from '../engine/types';

// Pub animée « Ma Réserve & les expéditions », pour TikTok (1080 × 1920). Chaque instant se dessine avec
// window.__seek(t) : les entrées en CSS (délais comptés depuis le début), le plan et les chemins sur des toiles.
// Capture : scripts de la session (une image toutes les 1/30 s).

export const DURATION = 29.6;

/** Les plans de la pub : [début, fin] en secondes. */
const SCENES: [number, number][] = [
  [0, 4.6],
  [4.6, 7.6],
  [7.6, 12.9],
  [12.9, 16.3],
  [16.3, 21.4],
  [21.4, 25.3],
  [25.3, DURATION],
];

const sprite = (id: string) => spriteForAthlete(ATHLETES_BY_ID[id]);

const PENS: Partial<Record<EnclosId, string[]>> = {
  foret: ['panda', 'cerf', 'ours-brun', 'renard-roux'],
  savane: ['lion', 'girafe', 'zebre', 'elephant', 'guepard'],
  ferme: ['vache', 'cochon', 'cheval'],
  marais: ['flamant-rose', 'hippopotame'],
  banquise: ['ours-polaire', 'manchot-empereur', 'phoque'],
  jungle: ['tigre', 'chimpanze'],
  aquarium: ['orque', 'tortue-luth', 'poisson-clown'],
  montagne: ['panthere-des-neiges'],
};
const MODEL: SceneModel = {
  open: new Set(Object.keys(PENS) as EnclosId[]),
  animals: Object.fromEntries(Object.entries(PENS).map(([k, ids]) => [k, ids!.filter((id) => ATHLETES_BY_ID[id]).map(sprite)])),
  gains: { foret: 74, savane: 135, ferme: 26, marais: 32, banquise: 54, jungle: 50, aquarium: 62, montagne: 30 },
  rate: 463,
};

const TRIPS: { id: string; env: EnclosId; label: string }[] = [
  { id: 'requin-marteau', env: 'aquarium', label: 'Requin-marteau · Océan' },
  { id: 'gorille', env: 'jungle', label: 'Gorille · Jungle' },
  { id: 'panthere-des-neiges', env: 'montagne', label: 'Panthère des neiges · Montagne' },
];
const PARADE = ['lion', 'girafe', 'elephant', 'zebre', 'panda', 'ours-polaire', 'flamant-rose', 'gorille'].filter((id) => ATHLETES_BY_ID[id]);

const PANEL_W = 960;
const PANEL_H = 1200;
const SCALE = PANEL_W / SCENE_W;
const CANVAS_H = SCENE_H * SCALE;

const clamp = (v: number) => Math.max(0, Math.min(1, v));
const ease = (k: number) => (k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2);

/** Une animation CSS qui commence à `delay` secondes depuis le début de la pub. */
const anim = (name: string, delay: number, dur = 0.6, extra: CSSProperties = {}, curve = 'cubic-bezier(0.2, 1.3, 0.4, 1)'): CSSProperties => ({
  animation: `${name} ${dur}s ${curve} ${delay}s both`,
  ...extra,
});

/** Les toiles, redessinées à chaque instant. */
const draws: ((t: number) => void)[] = [];

function Canvas({ w, h, draw, style }: { w: number; h: number; draw: (c: CanvasRenderingContext2D, t: number) => void; style?: CSSProperties }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current!.getContext('2d')!;
    const fn = (t: number) => draw(c, t);
    draws.push(fn);
    fn(0);
    return () => {
      draws.splice(draws.indexOf(fn), 1);
    };
  }, [draw]);
  return <canvas ref={ref} width={w} height={h} style={style} />;
}

const drawReserve = (c: CanvasRenderingContext2D, t: number) => drawScene(c, t, MODEL);

/** Défilé d'animaux en pixel art, sous le titre de la Réserve. */
const drawParade = (c: CanvasRenderingContext2D, t: number) => {
  c.clearRect(0, 0, 150, 26);
  c.imageSmoothingEnabled = false;
  PARADE.forEach((id, i) => {
    const s = sprite(id);
    const w = Math.max(...s.rows.map((r) => r.length));
    const x = ((i * 26 + t * 14) % (PARADE.length * 26)) - 24;
    const bob = Math.floor(t * 6 + i) % 2;
    blit(c, s, Math.round(x), 24 - s.rows.length - bob, { shadow: true });
    void w;
  });
};

const tripDraw = (trip: (typeof TRIPS)[number], start: number) => (c: CanvasRenderingContext2D, t: number) =>
  drawTrail(c, t, sprite(trip.id), trip.env, 0.08 + clamp((t - start) / 4.6) * 0.8, false);
const TRIP_DRAWS = TRIPS.map((trip, i) => tripDraw(trip, 16.6 + i * 0.25));
const drawBack = (c: CanvasRenderingContext2D, t: number) => drawTrail(c, t, sprite('panthere-des-neiges'), 'montagne', 1, true);

function Scene({ i, children }: { i: number; children: ReactNode }) {
  return (
    <section className="ad-scene" data-scene={i}>
      {children}
    </section>
  );
}

const face = (athleteId: string, variant: CardFace['variant'] = 'base'): CardFace => ({ athleteId, variant });

function BigCard({ card, w, left, top, delay, r = 0, r0 = 0, dx = '0px', float = true }: { card: CardFace; w: number; left: number; top: number; delay: number; r?: number; r0?: number; dx?: string; float?: boolean }) {
  return (
    <div
      className="ad-card"
      style={{
        left,
        top,
        ['--r' as string]: `${r}deg`,
        ['--r0' as string]: `${r0}deg`,
        ['--dx' as string]: dx,
        animation: `ad-deal 0.8s cubic-bezier(0.2, 1.2, 0.4, 1) ${delay}s both${float ? `, ad-float 1.7s ease-in-out ${delay + 0.8}s infinite alternate` : ''}`,
      }}
    >
      <Card card={card} size="lg" style={{ ['--card-w' as string]: `${w}px` }} />
    </div>
  );
}

const decouverte = SHOP_PACKS.find((p) => p.id === 'decouverte')!;
const savane = ZONE_BOX.savane;
// où la carte du lion plonge dans l'enclos de la savane (centre de l'enclos, dans la page)
const PEN_X = 60 + ((savane[0] + savane[2]) / 2) * SCALE;
const PEN_Y = 470 + ((savane[1] + savane[3]) / 2) * SCALE;

const COINS = Array.from({ length: 22 }, (_, k) => ({ x: 40 + ((k * 211) % 980), d: 13.1 + (k % 11) * 0.22 + Math.floor(k / 11) * 0.11, dur: 1.9 + (k % 4) * 0.25 }));

function Ad() {
  return (
    <div className="ad">
      {/* 1 · AnimalCards */}
      <Scene i={0}>
        <Landscape className="ad-bg" scene={SCREEN_SCENES.profil} seed="pub-intro" maxWidth={1080} />
        <div className="ad-shade" />
        <div className="ad-logo" style={anim('ad-pop', 0.15, 0.7, { top: 330 })}>
          <Logo />
        </div>
        <p className="ad-sub" style={anim('ad-rise', 0.75, 0.6, { top: 560, margin: 0, fontSize: 54 })}>
          Le jeu de cartes des animaux du monde
        </p>
        <BigCard card={face('panda')} w={320} left={70} top={1010} delay={1.25} r={-13} r0={-30} dx="-200px" />
        <BigCard card={face('orque')} w={320} left={690} top={1010} delay={1.45} r={13} r0={30} dx="200px" />
        <BigCard card={face('lion', 'prime')} w={350} left={365} top={930} delay={1.65} r={0} r0={8} />
        <div style={{ position: 'absolute', left: 0, right: 0, top: 1730, textAlign: 'center', ...anim('ad-pop', 2.5, 0.6) }}>
          <span className="ad-chip">Plus de 500 cartes à collectionner</span>
        </div>
      </Scene>

      {/* 2 · Nouveau : Ma Réserve */}
      <Scene i={1}>
        <div className="ad-glow" />
        <div className="ad-rays" />
        <svg viewBox="0 0 24 24" style={{ position: 'absolute', left: 440, top: 400, width: 200, height: 200, fill: 'none', stroke: '#ffd36b', strokeWidth: 1.6, strokeLinejoin: 'round', ...anim('ad-pop', 4.8, 0.6) }}>
          <path d="M12,21 V3.5 M5,6 H16.5 L19,8.5 L16.5,11 H5 Z M19,13.5 H8 L5.5,16 L8,18.5 H19 Z" />
        </svg>
        <h1 className="ad-title" style={anim('ad-slam', 5.0, 0.55, { top: 640, margin: 0, fontSize: 190, fontWeight: 400 })}>
          Ma Réserve
        </h1>
        <div className="ad-sticker" style={anim('ad-pop', 5.35, 0.5, { left: 690, top: 560, ['--base' as string]: 'rotate(10deg)' })}>
          NOUVEAU
        </div>
        <p className="ad-sub" style={anim('ad-rise', 5.7, 0.6, { top: 900, margin: 0, fontSize: 54 })}>
          Tes cartes prennent vie
          <br />
          dans ton propre parc
        </p>
        <div style={{ position: 'absolute', left: 0, right: 0, top: 1240, ...anim('ad-rise', 6.0, 0.6) }}>
          <Canvas w={150} h={26} draw={drawParade} style={{ display: 'block', width: 1080, height: 187, imageRendering: 'pixelated' }} />
        </div>
      </Scene>

      {/* 3 · les enclos */}
      <Scene i={2}>
        <div className="ad-glow" />
        <h2 className="ad-title" style={anim('ad-rise', 7.75, 0.6, { top: 150, margin: 0, fontSize: 92, fontWeight: 400 })}>
          Installe tes animaux
          <br />
          dans <b>8 enclos</b>
        </h2>
        <div className="ad-panel" style={{ top: 470, height: PANEL_H, ...anim('ad-rise', 7.7, 0.6) }}>
          <div className="ad-pan" data-pan="1">
            <Canvas w={SCENE_W} h={SCENE_H} draw={drawReserve} style={{ width: PANEL_W, height: CANVAS_H }} />
          </div>
        </div>
        <div className="ad-card" style={{ left: 540 - 165, top: 1331 - 231, ['--tx' as string]: `${PEN_X - 540}px`, ['--ty' as string]: `${PEN_Y - 1331}px`, ...anim('ad-into-pen', 8.1, 1.7, {}, 'ease-in-out') }}>
          <Card card={face('lion', 'reverse')} size="lg" style={{ ['--card-w' as string]: '330px' }} />
        </div>
        <div className="ad-spark" style={{ left: PEN_X, top: PEN_Y, ...anim('ad-sparkle', 9.65, 0.7, {}, 'ease-out') }} />
        <div style={{ position: 'absolute', left: 40, right: 40, top: 1712, display: 'flex', justifyContent: 'center', gap: 16, flexWrap: 'wrap' }}>
          {['Forêt', 'Savane', 'Banquise', 'Océan'].map((n, k) => (
            <span key={n} className="ad-chip" style={anim('ad-pop', 10.0 + k * 0.18, 0.45, { fontSize: 36 })}>
              {n}
            </span>
          ))}
        </div>
      </Scene>

      {/* 4 · la billetterie */}
      <Scene i={3}>
        <div className="ad-glow" />
        <div className="ad-panel" style={{ top: 330, height: 1400, opacity: 0.55 }}>
          <div style={{ transform: 'translateY(-260px)' }}>
            <Canvas w={SCENE_W} h={SCENE_H} draw={drawReserve} style={{ width: PANEL_W, height: CANVAS_H }} />
          </div>
        </div>
        {COINS.map((c, k) => (
          <div key={k} className="ad-coin" style={{ left: c.x, top: 0, animation: `ad-fall ${c.dur}s linear ${c.d}s both` }}>
            <BallIcon />
          </div>
        ))}
        <h2 className="ad-title" style={anim('ad-rise', 13.05, 0.6, { top: 150, margin: 0, fontSize: 84, fontWeight: 400 })}>
          Les visiteurs paient
          <br />
          leur ticket…
        </h2>
        <h2 className="ad-title" style={anim('ad-slam', 14.0, 0.5, { top: 420, margin: 0, fontSize: 104, fontWeight: 400 })}>
          <b>même quand tu dors !</b>
        </h2>
        <div className="ad-counter" style={anim('ad-pop', 13.3, 0.6, { ['--base' as string]: 'translateX(-50%)' })}>
          <small>Billetterie</small>
          <b>
            <BallIcon /> +<span data-counter="3898">0</span>
          </b>
        </div>
      </Scene>

      {/* 5 · les expéditions */}
      <Scene i={4}>
        <div className="ad-glow" />
        <h2 className="ad-title" style={anim('ad-slam', 16.45, 0.55, { top: 150, margin: 0, fontSize: 96, fontWeight: 400 })}>
          Envoie-les en
          <br />
          <b>EXPÉDITION</b>
        </h2>
        {TRIPS.map((trip, k) => (
          <div key={trip.id} className="ad-trail" style={{ top: 520 + k * 360, ...anim('ad-from-right', 16.8 + k * 0.25, 0.7, {}, 'cubic-bezier(0.2, 1, 0.3, 1)') }}>
            <Canvas w={TRAIL_W} h={TRAIL_H} draw={TRIP_DRAWS[k]} />
            <span className="ad-chip">{trip.label}</span>
          </div>
        ))}
        <p className="ad-sub" style={anim('ad-rise', 18.7, 0.6, { top: 1660, margin: 0, fontSize: 56 })}>
          Chacun part dans <b style={{ color: '#ffd36b' }}>son milieu</b>
        </p>
      </Scene>

      {/* 6 · les récompenses */}
      <Scene i={5}>
        <div className="ad-glow" />
        <div className="ad-rays" style={{ top: '62%' }} />
        <h2 className="ad-title" style={anim('ad-rise', 21.55, 0.6, { top: 150, margin: 0, fontSize: 92, fontWeight: 400 })}>
          Ils reviennent avec…
        </h2>
        <div className="ad-trail" style={{ top: 380, ...anim('ad-rise', 21.6, 0.6) }}>
          <Canvas w={TRAIL_W} h={TRAIL_H} draw={drawBack} />
        </div>
        <div className="ad-reward" style={{ left: 40, top: 900, width: 300, ...anim('ad-pop', 22.3, 0.55) }}>
          <div className="ad-big-coin">
            <BallIcon />
          </div>
          <span className="ad-chip">+720 crédits</span>
        </div>
        <div className="ad-reward" style={{ left: 385, top: 850, width: 310, ...anim('ad-pop', 22.75, 0.55) }}>
          <Card card={face('renard-roux', 'reverse')} size="lg" style={{ ['--card-w' as string]: '290px' }} />
          <span className="ad-chip">des cartes</span>
        </div>
        <div className="ad-reward" style={{ left: 740, top: 880, width: 300, ...anim('ad-pop', 23.2, 0.55) }}>
          <div style={{ width: 250 }}>
            <PackArt tone={decouverte.tone} name={decouverte.name} size={decouverte.size} />
          </div>
          <span className="ad-chip">des packs !</span>
        </div>
        <p className="ad-sub" style={anim('ad-rise', 23.7, 0.6, { top: 1620, margin: 0, fontSize: 56 })}>
          et parfois une carte <b style={{ color: '#ffd36b' }}>Légendaire</b>
        </p>
      </Scene>

      {/* 7 · à toi de jouer */}
      <Scene i={6}>
        <Landscape className="ad-bg" scene={SCREEN_SCENES.boutique} seed="pub-fin" maxWidth={1080} />
        <div className="ad-shade" />
        <div className="ad-logo" style={anim('ad-pop', 25.45, 0.7, { top: 260 })}>
          <Logo />
        </div>
        <p className="ad-title" style={anim('ad-rise', 25.9, 0.6, { top: 500, margin: 0, fontSize: 76 })}>
          <b>Ma Réserve</b> &amp; les expéditions
        </p>
        <BigCard card={face('tigre', 'reverse')} w={290} left={110} top={820} delay={26.0} r={-11} r0={-30} dx="-200px" />
        <BigCard card={face('requin-blanc')} w={290} left={680} top={820} delay={26.15} r={11} r0={30} dx="200px" />
        <BigCard card={face('guepard', 'prime')} w={320} left={380} top={760} delay={26.3} r={0} r0={8} />
        <div className="ad-cta" style={{ top: 1420, ['--base' as string]: 'translateX(-50%)', animation: `ad-pop 0.6s cubic-bezier(0.2, 1.3, 0.4, 1) 26.7s both, ad-pulse 0.7s ease-in-out 27.4s infinite alternate` }}>
          Joue gratuitement
        </div>
        <p className="ad-sub" style={anim('ad-rise', 27.0, 0.6, { top: 1640, margin: 0, fontSize: 64, color: '#fff8ec' })}>
          animalcards.fr
        </p>
        <p className="ad-sub" style={anim('ad-rise', 27.2, 0.6, { top: 1740, margin: 0, fontSize: 38, fontWeight: 600, color: 'rgba(255,248,236,.8)' })}>
          Sur ton téléphone ou ton ordi
        </p>
      </Scene>
    </div>
  );
}

/** Cale toute la pub sur l'instant `t` (secondes). */
function seek(t: number) {
  // les photos se décodent avant d'être peintes : jamais de carte vide sur une image de la vidéo
  for (const img of document.images) if (img.decoding !== 'sync') img.decoding = 'sync';
  for (const a of document.getAnimations()) {
    a.pause();
    a.currentTime = t * 1000;
  }
  document.querySelectorAll<HTMLElement>('.ad-scene').forEach((el) => {
    const [start, end] = SCENES[Number(el.dataset.scene)];
    const fadeIn = start === 0 ? 1 : clamp((t - start) / 0.35);
    // fondu enchaîné : le plan qui s'en va reste en place sous celui qui arrive (sans passage au noir)
    const gone = end !== DURATION && t >= end + 0.35;
    const k = gone ? 0 : fadeIn;
    el.style.opacity = String(k);
    el.style.transform = `scale(${1 + (1 - fadeIn) * 0.06})`;
    el.style.visibility = k > 0 ? 'visible' : 'hidden';
  });
  // le plan défile vers le bas pour montrer tous les enclos
  document.querySelectorAll<HTMLElement>('[data-pan]').forEach((el) => {
    el.style.transform = `translateY(${-ease(clamp((t - 10.4) / 2.2)) * (CANVAS_H - PANEL_H)}px)`;
  });
  document.querySelectorAll<HTMLElement>('[data-counter]').forEach((el) => {
    const k = clamp((t - 13.4) / 1.7);
    el.textContent = Math.round(Number(el.dataset.counter) * (1 - (1 - k) ** 3)).toLocaleString('fr-FR');
  });
  for (const draw of draws) draw(t);
}

declare global {
  interface Window {
    __seek: (t: number) => void;
    __duration: number;
  }
}
window.__seek = seek;
window.__duration = DURATION;

createRoot(document.getElementById('root')!).render(<Ad />);
