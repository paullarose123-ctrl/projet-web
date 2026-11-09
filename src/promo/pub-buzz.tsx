import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import '../styles/fonts.css';
import '../styles/base.css';
import '../styles/card.css';
import '../styles/app.css';
import './pub-reserve.css';
import './pub-buzz.css';
import { Card } from '../components/Card';
import { Logo } from '../components/Logo';
import { PackArt } from '../components/PackArt';
import { Landscape } from '../components/PackScene';
import { SCREEN_SCENES } from '../art/scenes';
import { SCENE_H, SCENE_W, drawScene, type SceneModel } from '../art/reserve-scene';
import { TRAIL_H, TRAIL_W, drawTrail } from '../art/expedition-scene';
import { spriteForAthlete } from '../art/reserve-sprites';
import { ATHLETES_BY_ID } from '../data/athletes';
import { SHOP_PACKS } from '../engine/packs';
import type { EnclosId } from '../engine/reserve';
import type { CardFace } from '../engine/types';

// Pub TikTok « AnimalCards » (1080 × 1920, 30 images/s), calée image par image avec window.__seek(t).
// Accroche : un animal disparu en 1936 qu'on peut encore collectionner ; puis 500 vrais animaux, l'ouverture d'un
// booster jusqu'à la Légendaire, les animaux célèbres (Prime), le duel « qui gagne ? », la réserve, et l'appel à jouer.

const DURATION = 29.5;
const SCENES: [number, number][] = [
  [0, 3.4],
  [3.4, 7.0],
  [7.0, 12.4],
  [12.4, 18.0],
  [18.0, 21.4],
  [21.4, 24.6],
  [24.6, DURATION],
];

const clamp = (v: number) => Math.max(0, Math.min(1, v));
const face = (athleteId: string, variant: CardFace['variant'] = 'base'): CardFace => ({ athleteId, variant });
const sprite = (id: string) => spriteForAthlete(ATHLETES_BY_ID[id]);

/** Une animation CSS qui commence à `delay` secondes depuis le début de la pub. */
const anim = (name: string, delay: number, dur = 0.6, curve = 'cubic-bezier(0.2, 1.3, 0.4, 1)', fill = 'both') => `${name} ${dur}s ${curve} ${delay}s ${fill}`;
const style = (animation: string, extra: CSSProperties = {}): CSSProperties => ({ animation, ...extra });

const draws: ((t: number) => void)[] = [];
function Canvas({ w, h, draw, css }: { w: number; h: number; draw: (c: CanvasRenderingContext2D, t: number) => void; css?: CSSProperties }) {
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
  return <canvas ref={ref} width={w} height={h} style={css} />;
}

const PENS: Partial<Record<EnclosId, string[]>> = {
  foret: ['panda', 'cerf', 'ours-brun', 'renard-roux'],
  savane: ['lion', 'girafe', 'zebre', 'elephant', 'guepard'],
  ferme: ['vache', 'cochon', 'cheval'],
  marais: ['flamant-rose', 'hippopotame'],
  banquise: ['ours-polaire', 'manchot-empereur'],
  jungle: ['tigre', 'gorille'],
  aquarium: ['orque', 'poisson-clown'],
  montagne: ['panthere-des-neiges'],
};
const MODEL: SceneModel = {
  open: new Set(Object.keys(PENS) as EnclosId[]),
  animals: Object.fromEntries(Object.entries(PENS).map(([k, ids]) => [k, ids!.filter((id) => ATHLETES_BY_ID[id]).map(sprite)])),
  gains: { foret: 74, savane: 135, ferme: 26, marais: 32, banquise: 54, jungle: 50, aquarium: 62, montagne: 30 },
  rate: 463,
};
const drawReserve = (c: CanvasRenderingContext2D, t: number) => drawScene(c, t, MODEL);
const drawTrip = (c: CanvasRenderingContext2D, t: number) => drawTrail(c, t, sprite('requin-marteau'), 'aquarium', ((t - 21.4) / 3.2) * 0.9, false);

function Scene({ i, children }: { i: number; children: ReactNode }) {
  return (
    <section className="ad-scene" data-scene={i}>
      {children}
    </section>
  );
}

/** Une carte posée en (left, top), de largeur w, avec ses animations. */
function Big({ card, w, left, top, animation, r = 0, vars = {}, inner }: { card: CardFace; w: number; left: number; top: number; animation: string; r?: number; vars?: Record<string, string>; inner?: CSSProperties }) {
  const css: CSSProperties = { left, top, animation, ['--r' as string]: `${r}deg` };
  for (const [k, v] of Object.entries(vars)) (css as Record<string, string>)[k] = v;
  return (
    <div className="ad-card" style={css}>
      <div style={inner}>
        <Card card={card} size="lg" style={{ ['--card-w' as string]: `${w}px` }} />
      </div>
    </div>
  );
}

const WALL = ['panda', 'lion', 'flamant-rose', 'orque', 'girafe', 'gorille', 'ours-polaire', 'renard-roux', 'requin-marteau', 'zebre', 'hippopotame', 'tigre'];
const decouverte = SHOP_PACKS.find((p) => p.id === 'decouverte')!;
// le booster, puis les cartes qui en jaillissent (centre du booster : 540 × 886)
const PACK = { left: 340, top: 600, w: 400 };
const BURST: { id: string; left: number; top: number; r: number }[] = [
  { id: 'lapin', left: 30, top: 860, r: -14 },
  { id: 'ocelot', left: 270, top: 790, r: -5 },
  { id: 'loup', left: 550, top: 790, r: 5 },
  { id: 'renard-roux', left: 790, top: 860, r: 14 },
];
const FAMOUS: { id: string; title: string; text: string }[] = [
  { id: 'pieuvre', title: 'Paul le poulpe', text: 'Il a prédit 8 matchs sur 8 au Mondial 2010' },
  { id: 'chat', title: 'Félicette', text: 'La chatte française partie dans l’espace en 1963' },
  { id: 'orque', title: 'Keiko', text: 'La vraie star du film « Sauvez Willy »' },
];
const FAMOUS_AT = (k: number) => 12.8 + k * 1.85;

function Ad() {
  return (
    <div className="ad">
      {/* 1 · l'accroche : un animal disparu, qu'on peut encore avoir */}
      <Scene i={0}>
        <div className="ad-night" />
        <div className="ad-grain" />
        <p className="ad-hook" style={style(anim('ad-rise', 0.1, 0.5), { top: 250, margin: 0 })}>
          Cet animal a disparu
          <br />
          en <b>1936</b>.
        </p>
        <Big
          card={face('thylacine')}
          w={420}
          left={330}
          top={560}
          animation={`${anim('ad-rise', 0.05, 0.6)}, ad-zoom-slow 3.4s linear 0s both`}
          inner={{ animation: anim('ad-revive', 1.85, 0.6, 'ease-out') }}
        />
        <div className="ad-flash" style={style(anim('ad-flash', 1.85, 0.5, 'ease-out'))} />
        <p className="ad-hook" style={style(anim('ad-rise', 1.95, 0.5), { top: 1230, margin: 0, fontSize: 84 })}>
          Ici, tu peux encore
          <br />
          <b>le collectionner.</b>
        </p>
        <div style={style(anim('ad-pop', 2.45, 0.5), { position: 'absolute', left: 0, right: 0, top: 1520, textAlign: 'center' })}>
          <span className="ad-chip" style={{ borderColor: '#ffd36b' }}>
            Carte Icône · 1 chance sur 1 000
          </span>
        </div>
      </Scene>

      {/* 2 · plus de 500 vrais animaux */}
      <Scene i={1}>
        <div className="ad-glow" />
        <h2 className="ad-title" style={style(anim('ad-rise', 3.5, 0.5), { top: 110, margin: 0, fontSize: 88, fontWeight: 400 })}>
          Plus de <b>500</b> vrais animaux,
          <br />
          en vraies photos
        </h2>
        {WALL.map((id, k) => {
          const col = k % 4;
          const row = Math.floor(k / 4);
          const r = ((k * 37) % 9) - 4;
          return <Big key={id} card={face(id)} w={225} left={52 + col * 250} top={400 + row * 340} r={r} vars={{ '--r0': `${r * 3}deg`, '--dx': `${(col - 1.5) * 80}px` }} animation={anim('ad-deal', 3.55 + k * 0.08, 0.6, 'cubic-bezier(0.2, 1.2, 0.4, 1)')} />;
        })}
        <p className="ad-sub" style={style(anim('ad-rise', 5.2, 0.5), { top: 1470, margin: 0, fontSize: 52 })}>
          Du lapin au requin blanc :
          <br />
          <b style={{ color: '#ffd36b' }}>à toi de tous les avoir</b>
        </p>
      </Scene>

      {/* 3 · un booster, jusqu'à la Légendaire */}
      <Scene i={2}>
        <div className="ad-glow" />
        <div className="ad-rays" />
        <h2 className="ad-title" style={style(anim('ad-rise', 7.1, 0.5), { top: 150, margin: 0, fontSize: 96, fontWeight: 400 })}>
          Ouvre des boosters…
        </h2>
        <div style={style(`${anim('ad-pop', 7.1, 0.5)}, ad-shake 0.9s ease-in-out 7.6s both, ad-vanish 0.25s ease-in 8.5s forwards`, { position: 'absolute', left: PACK.left, top: PACK.top, width: PACK.w })}>
          <PackArt tone={decouverte.tone} name={decouverte.name} size={decouverte.size} />
        </div>
        <div className="ad-flash" style={style(anim('ad-flash', 8.5, 0.45, 'ease-out'))} />
        {BURST.map((c, k) => (
          <Big
            key={c.id}
            card={face(c.id)}
            w={260}
            left={c.left}
            top={c.top}
            r={c.r}
            vars={{ '--fx': `${540 - (c.left + 130)}px`, '--fy': `${886 - (c.top + 182)}px` }}
            animation={anim('ad-burst', 8.55 + k * 0.09, 0.55, 'cubic-bezier(0.2, 1.3, 0.4, 1)')}
          />
        ))}
        <div className="ad-flash" style={style(anim('ad-flash', 9.55, 0.4, 'ease-out'), { background: '#ffe9a8' })} />
        <Big
          card={face('panthere-des-neiges')}
          w={380}
          left={350}
          top={600}
          animation={anim('ad-pop', 9.6, 0.55)}
          inner={{ borderRadius: 22, animation: 'ad-halo 0.6s ease-in-out 10.1s infinite alternate' }}
        />
        <h2 className="ad-title" style={style(anim('ad-slam', 9.9, 0.5), { top: 1240, margin: 0, fontSize: 130, fontWeight: 400 })}>
          <b>LÉGENDAIRE !</b>
        </h2>
        <p className="ad-sub" style={style(anim('ad-rise', 10.5, 0.5), { top: 1430, margin: 0, fontSize: 50 })}>
          Commune, rare, épique… ou le jackpot
        </p>
      </Scene>

      {/* 4 · des animaux célèbres */}
      <Scene i={3}>
        <div className="ad-glow" />
        <div className="ad-rays" />
        <h2 className="ad-title" style={style(anim('ad-rise', 12.5, 0.5), { top: 130, margin: 0, fontSize: 86, fontWeight: 400 })}>
          Et même des animaux
          <br />
          <b>célèbres</b>
        </h2>
        {FAMOUS.map((f, k) => {
          const at = FAMOUS_AT(k);
          const last = k === FAMOUS.length - 1;
          const leave = last ? '' : `, ad-out-left 0.35s ease-in ${at + 1.5}s forwards`;
          return (
            <div key={f.id}>
              <Big card={face(f.id, 'prime')} w={460} left={310} top={420} r={k % 2 ? 3 : -3} animation={`${anim('ad-from-right2', at, 0.55, 'cubic-bezier(0.2, 1.1, 0.3, 1)')}${leave}`} />
              <div className="ad-fact" style={style(`${anim('ad-rise', at + 0.25, 0.45)}${last ? '' : `, ad-vanish 0.3s ease-in ${at + 1.5}s forwards`}`, { top: 1150 })}>
                <b>{f.title}</b>
                {f.text}
              </div>
            </div>
          );
        })}
      </Scene>

      {/* 5 · le duel : qui gagne ? */}
      <Scene i={4}>
        <div className="ad-glow" style={{ background: 'radial-gradient(circle at 50% 50%, rgba(232, 88, 107, 0.35), transparent 55%), linear-gradient(180deg, #2a1c2e, #0b130e)' }} />
        <div className="ad-rays" style={{ top: '52%' }} />
        <h2 className="ad-title" style={style(anim('ad-rise', 18.1, 0.5), { top: 130, margin: 0, fontSize: 92, fontWeight: 400 })}>
          Défie tes amis
          <br />
          en <b>duel</b>
        </h2>
        <Big card={face('lion')} w={430} left={30} top={560} r={-7} animation={anim('ad-from-left', 18.25, 0.5, 'cubic-bezier(0.2, 1.1, 0.3, 1)')} />
        <Big card={face('tigre')} w={430} left={620} top={560} r={7} animation={anim('ad-from-right2', 18.35, 0.5, 'cubic-bezier(0.2, 1.1, 0.3, 1)')} />
        <div className="ad-flash" style={style(anim('ad-flash', 18.8, 0.35, 'ease-out'), { background: '#ff8fb8' })} />
        <div className="ad-vs" style={style(anim('ad-slam', 18.8, 0.45))}>VS</div>
        <h2 className="ad-title" style={style(anim('ad-slam', 19.4, 0.45), { top: 1250, margin: 0, fontSize: 140, fontWeight: 400 })}>
          <b>Qui gagne ?</b>
        </h2>
        <p className="ad-sub" style={style(anim('ad-rise', 19.9, 0.5), { top: 1460, margin: 0, fontSize: 52 })}>
          Dis-le en commentaire
        </p>
      </Scene>

      {/* 6 · la réserve et les expéditions */}
      <Scene i={5}>
        <div className="ad-glow" />
        <h2 className="ad-title" style={style(anim('ad-rise', 21.5, 0.5), { top: 120, margin: 0, fontSize: 82, fontWeight: 400 })}>
          Construis ta <b>réserve</b>
          <br />
          et pars en expédition
        </h2>
        <div className="ad-panel" style={style(anim('ad-rise', 21.45, 0.5), { top: 390, height: 900 })}>
          <div style={{ animation: 'ad-pan-down 2.8s ease-in-out 21.7s both' }}>
            <Canvas w={SCENE_W} h={SCENE_H} draw={drawReserve} css={{ display: 'block', width: 960, height: (960 * SCENE_H) / SCENE_W, imageRendering: 'pixelated' }} />
          </div>
        </div>
        <div className="ad-trail" style={style(anim('ad-from-right', 21.8, 0.6, 'cubic-bezier(0.2, 1, 0.3, 1)'), { top: 1340 })}>
          <Canvas w={TRAIL_W} h={TRAIL_H} draw={drawTrip} />
        </div>
        <div style={style(anim('ad-pop', 22.6, 0.5), { position: 'absolute', left: 0, right: 0, top: 1700, textAlign: 'center' })}>
          <span className="ad-chip">Crédits, cartes et packs à gagner</span>
        </div>
      </Scene>

      {/* 7 · à toi de jouer */}
      <Scene i={6}>
        <Landscape className="ad-bg" scene={SCREEN_SCENES.boutique} seed="pub-buzz-fin" maxWidth={1080} />
        <div className="ad-shade" />
        <div className="ad-logo" style={style(anim('ad-pop', 24.75, 0.6), { top: 210 })}>
          <Logo />
        </div>
        <p className="ad-sub" style={style(anim('ad-rise', 25.1, 0.5), { top: 440, margin: 0, fontSize: 50 })}>
          Le jeu de cartes des animaux du monde
        </p>
        <Big card={face('pieuvre', 'prime')} w={290} left={90} top={700} r={-11} vars={{ '--r0': '-30deg', '--dx': '-200px' }} animation={`${anim('ad-deal', 25.3, 0.7, 'cubic-bezier(0.2, 1.2, 0.4, 1)')}, ad-float 1.7s ease-in-out 26s infinite alternate`} />
        <Big card={face('tigre', 'reverse')} w={290} left={700} top={700} r={11} vars={{ '--r0': '30deg', '--dx': '200px' }} animation={`${anim('ad-deal', 25.45, 0.7, 'cubic-bezier(0.2, 1.2, 0.4, 1)')}, ad-float 1.7s ease-in-out 26.1s infinite alternate`} />
        <Big card={face('thylacine')} w={340} left={370} top={630} r={0} vars={{ '--r0': '8deg' }} animation={`${anim('ad-deal', 25.6, 0.7, 'cubic-bezier(0.2, 1.2, 0.4, 1)')}, ad-float 1.7s ease-in-out 26.3s infinite alternate`} />
        <div className="ad-cta" style={{ top: 1250, ['--base' as string]: 'translateX(-50%)', animation: `${anim('ad-pop', 26.0, 0.5)}, ad-pulse 0.7s ease-in-out 26.6s infinite alternate` }}>
          Joue gratuitement
        </div>
        <p className="ad-sub" style={style(anim('ad-rise', 26.3, 0.5), { top: 1450, margin: 0, fontSize: 70, color: '#fff8ec' })}>
          animalcards.fr
        </p>
        <p className="ad-sub" style={style(anim('ad-rise', 26.5, 0.5), { top: 1550, margin: 0, fontSize: 36, fontWeight: 600, color: 'rgba(255,248,236,.85)' })}>
          Sans téléchargement · sur ton téléphone ou ton ordi
        </p>
        <h2 className="ad-title" style={style(anim('ad-rise', 27.0, 0.5), { top: 1680, margin: 0, fontSize: 64, fontWeight: 400 })}>
          <b>Quel animal tu vas sortir ?</b>
        </h2>
      </Scene>
    </div>
  );
}

function seek(t: number) {
  for (const img of document.images) if (img.decoding !== 'sync') img.decoding = 'sync';
  for (const a of document.getAnimations()) {
    a.pause();
    a.currentTime = t * 1000;
  }
  document.querySelectorAll<HTMLElement>('.ad-scene').forEach((el) => {
    const [start, end] = SCENES[Number(el.dataset.scene)];
    const fadeIn = start === 0 ? 1 : clamp((t - start) / 0.3);
    const gone = end !== DURATION && t >= end + 0.3;
    const k = gone ? 0 : fadeIn;
    el.style.opacity = String(k);
    el.style.transform = `scale(${1 + (1 - fadeIn) * 0.06})`;
    el.style.visibility = k > 0 ? 'visible' : 'hidden';
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
