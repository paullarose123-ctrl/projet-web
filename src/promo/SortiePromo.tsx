import type { CSSProperties, ReactNode } from 'react';
import { ATHLETES } from '../data/athletes';
import { Card } from '../components/Card';
import { Logo } from '../components/Logo';
import { PackArtMexique } from '../components/PackArtMexique';
import { photoCredit } from '../photos';
import type { Variant } from '../engine/types';
import { MexicoScene, Papel } from './MexiquePromo';
import { Line, Petals, backOut, clamp, easeInOut, easeOut, life, pop, rise, span } from './anim';

// Pub de la sortie de la Série 2 (Mexique), au format TikTok (9:16). Comme les autres vidéos, chaque image est une
// fonction du temps `t` (voir mount.tsx), rendue en 1080 × 1920 par scripts/promo/video.mjs : rien n'est filmé.
// 1. « C'est sorti ! » : le booster du Mexique tombe, se charge et se déchire
// 2. cinq vraies cartes en éventail : « 116 nouvelles cartes »
// 3. quatre cartes en grand, l'une après l'autre
// 4. un mur de cartes qui défile : « plus de 100 espèces »
// 5. ce qu'on fait dans le jeu
// 6. « Disponible maintenant », l'adresse du jeu

export const DURATION = 27;

// sur le boléro de la radio (80 temps par minute : une mesure = 3 s, un temps = 0,75 s)
const TEAR = 3;
const HEROES = 6;
const HERO = 2.25;
const WALL = 15;
const FEATURES = 18.75;
const END = 22.5;

// le Mexique déjà au grand jour, l'aigle qui traverse le ciel au début
const sceneTime = (t: number) => t + 6;

interface Pick {
  id: string;
  variant: Variant;
}

const FAN: Pick[] = [
  { id: 'mx-axolotl', variant: 'base' },
  { id: 'mx-quetzal', variant: 'base' },
  { id: 'mx-jaguar', variant: 'prime' },
  { id: 'mx-monarque', variant: 'base' },
  { id: 'mx-aigle-royal', variant: 'base' },
];

const STARS: (Pick & { name: string; tag: string })[] = [
  { id: 'mx-jaguar', variant: 'prime', name: 'Jaguar', tag: 'en version Prime' },
  { id: 'mx-axolotl', variant: 'base', name: 'Axolotl', tag: 'le petit roi de Xochimilco' },
  { id: 'mx-quetzal', variant: 'reverse', name: 'Quetzal', tag: 'en version Reverse' },
  { id: 'mx-requin-baleine', variant: 'base', name: 'Requin-baleine', tag: 'le plus grand poisson du monde' },
];

const FAN_IDS = new Set(FAN.map((c) => c.id));
/** les autres cartes de la Série 2 qui ont leur photo, pour le mur */
const WALL_IDS = ATHLETES.filter((a) => a.serie === 2 && photoCredit(a.id) && !FAN_IDS.has(a.id)).map((a) => a.id);

const photoSrc = (id: string) => {
  const credit = photoCredit(id);
  return credit ? `${import.meta.env.BASE_URL}photos/${credit.file}${credit.v ? `?v=${credit.v}` : ''}` : '';
};

const ROWS = 4;
const PER_ROW = 7;
const wallRows: string[][] = Array.from({ length: ROWS }, (_, r) =>
  Array.from({ length: PER_ROW }, (_, i) => WALL_IDS[(r * PER_ROW + i) % Math.max(1, WALL_IDS.length)]),
);

export const IMAGES = [...new Set([...FAN.map((c) => c.id), ...STARS.map((c) => c.id), ...wallRows.flat()])].map(photoSrc).filter(Boolean);

function Face({ pick, size = 'lg', style, className = '' }: { pick: Pick; size?: 'sm' | 'md' | 'lg'; style?: CSSProperties; className?: string }) {
  return (
    <div className={`ad__card ${className}`} style={style}>
      <Card card={{ uid: `${pick.id}-${pick.variant}`, athleteId: pick.id, variant: pick.variant }} size={size} />
    </div>
  );
}

/** reflet qui balaie une carte ou le booster */
function Shine({ k }: { k: number }) {
  if (k <= 0 || k >= 1) return null;
  return (
    <div className="ad__shine-clip">
      <div className="ad__shine" style={{ transform: `translateX(${-130 + k * 380}%) skewX(-18deg)` }} />
    </div>
  );
}

const ICONS: Record<string, ReactNode> = {
  booster: <path d="M7 3h10l-1 3 1 3-1 3 1 3-1 3 1 3H7l1-3-1-3 1-3-1-3 1-3Z M10 9h4 M10 13h4" />,
  defi: <path d="M12 3a9 9 0 1 0 9 9 M12 7a5 5 0 1 0 5 5 M12 12l7-7 M16 5h3v3" />,
  duel: <path d="M8 4h8v5a4 4 0 0 1-8 0Z M8 6H5a3 3 0 0 0 3 4 M16 6h3a3 3 0 0 1-3 4 M12 13v4 M8 20h8" />,
  echange: <path d="M4 8h13l-3-3 M20 16H7l3 3" />,
};

const FEATURE_ROWS: [keyof typeof ICONS, string, string][] = [
  ['booster', 'Un booster gratuit', 'toutes les heures'],
  ['defi', 'Des défis chaque jour', 'et des crédits à gagner'],
  ['duel', 'Des duels', 'de culture animale'],
  ['echange', 'Des échanges', 'entre amis'],
];

function Flag() {
  return (
    <span className="ad__flag">
      <i />
      <i />
      <i />
    </span>
  );
}

export function SortiePromo({ t }: { t: number }) {
  const st = sceneTime(t);

  // 1. le booster
  // le booster surgit à sa place (rien ne cache le titre dès la première image)
  const packPop = 0.7 + 0.3 * backOut(span(t, -0.25, 0.4));
  const charge = span(t, TEAR - 0.8, TEAR);
  const shake = t < TEAR ? charge * 6 : 0;
  const packY = Math.sin(t * 2.2) * 6;
  const flash = t >= TEAR ? Math.exp(-(t - TEAR) * 4) : charge * 0.22;
  const introOut = easeInOut(span(t, TEAR - 0.3, TEAR + 0.1));

  // 2. l'éventail
  const fanK = (i: number) => span(t, TEAR + 0.05 + i * 0.08, TEAR + 0.8 + i * 0.08);
  const fanOut = easeInOut(span(t, HEROES - 0.5, HEROES - 0.1));

  // 4. le mur
  const wallIn = easeOut(span(t, WALL - 0.3, WALL + 0.5));
  const wallOut = easeInOut(span(t, FEATURES - 0.45, FEATURES - 0.05));
  const wall = wallIn * (1 - wallOut);

  const darken =
    0.25 * life(t, TEAR - 0.4, TEAR + 0.2) + 0.25 * life(t, HEROES - 0.4, HEROES) + 0.25 * life(t, FEATURES - 0.4, FEATURES + 0.2) - 0.1 * life(t, END - 0.3, END + 0.5);
  const rays = life(t, 0.6, 1.4, FEATURES - 0.5, FEATURES) + life(t, END, END + 0.8);
  const endK = (a: number, b = a + 0.6) => easeOut(span(t, a, b));

  return (
    <div className="promo ad" style={{ '--ad-t': `${-t}s` } as CSSProperties}>
      <div className="promo__layer">
        <MexicoScene t={st} />
        <div className="promo__darken" style={{ opacity: clamp(0.15 + darken) }} />
      </div>
      {rays > 0 && <div className="promo__rays ad__rays" style={{ opacity: clamp(rays) * 0.9, transform: `translate(-50%, -50%) rotate(${t * 14}deg)` }} />}
      <Papel t={t + 4.6} />
      <Petals t={t} from={0.2} />

      {/* 1. « C'est sorti ! » et le booster */}
      {introOut < 1 && (
        <>
          <Line className="ad__badge" style={{ ...pop(span(t, -0.3, 0.3)), opacity: 1 - introOut, top: 132 }}>
            <span>
              <Flag /> Nouvelle série
            </span>
          </Line>
          <Line className="ad__title" style={{ ...pop(span(t, -0.25, 0.35)), opacity: 1 - introOut, top: 178 }}>
            C’est sorti&nbsp;!
          </Line>
          <Line className="ad__kicker" style={{ ...rise(life(t, 0.5, 1)), opacity: life(t, 0.5, 1) * (1 - introOut), top: 282 }}>
            La Série 2 · Mexique
          </Line>
        </>
      )}
      {t < TEAR && (
        <div
          className="ad__pack"
          style={{
            transform: `translate(-50%, -50%) translate(${Math.sin(t * 61) * shake}px, ${packY + Math.cos(t * 53) * shake}px) perspective(1200px) rotateY(${Math.sin(t * 1.4) * 16}deg) rotateX(${Math.sin(t * 0.9) * 5}deg) scale(${(1 + charge * 0.07) * packPop})`,
            filter: `drop-shadow(0 0 ${12 + charge * 54}px rgba(255, 226, 150, ${0.25 + charge * 0.7})) drop-shadow(0 26px 30px rgba(0,0,0,0.5))`,
          }}
        >
          <PackArtMexique />
          <Shine k={span(t, 1.5, 2.2)} />
        </div>
      )}

      {/* 2. cinq vraies cartes en éventail */}
      {t >= TEAR && fanOut < 1 && (
        <>
          {FAN.map((pick, i) => {
            const slot = i - 2;
            const k = backOut(fanK(i));
            return (
              <Face
                key={pick.id}
                pick={pick}
                size="md"
                className="ad__fan"
                style={{
                  opacity: clamp(fanK(i) * 4) * (1 - fanOut),
                  transform: `translate(-50%, -50%) translate(${slot * 96 * k}px, ${Math.abs(slot) * 30 * k + Math.sin(t * 1.8 + i) * 5 + fanOut * 120}px) rotate(${slot * 10 * k}deg) scale(${(0.3 + 0.58 * k) * (slot === 0 ? 1.08 : 1)})`,
                  zIndex: 10 - Math.abs(slot),
                }}
              />
            );
          })}
          <Line className="ad__big" style={{ ...pop(span(t, TEAR + 0.5, TEAR + 1.1)), opacity: clamp(span(t, TEAR + 0.5, TEAR + 0.65) * 4) * (1 - fanOut), top: 140 }}>
            116
          </Line>
          <Line className="ad__kicker" style={{ ...rise(life(t, TEAR + 0.9, TEAR + 1.4)), opacity: life(t, TEAR + 0.9, TEAR + 1.4) * (1 - fanOut), top: 262 }}>
            nouvelles cartes à collectionner
          </Line>
        </>
      )}

      {/* 3. les stars, une par une */}
      {STARS.map((star, i) => {
        const a = HEROES + i * HERO;
        if (t < a - 0.4 || t > a + HERO + 0.1) return null;
        // la carte suivante arrive pendant que la précédente sort
        const inK = easeOut(span(t, a - 0.35, a + 0.3));
        const outK = easeInOut(span(t, a + HERO - 0.35, a + HERO + 0.05));
        const x = (1 - inK) * 560 - outK * 560;
        const ry = (1 - inK) * -55 + outK * 55 + Math.sin((t - a) * 2.2) * 9 * inK * (1 - outK);
        const label = life(t, a, a + 0.45, a + HERO - 0.4, a + HERO - 0.1);
        return (
          <div key={star.id}>
            <Line className="ad__name" style={{ ...rise(label, 30), top: 150 }}>
              {star.name}
            </Line>
            <Line className="ad__tag" style={{ ...rise(label, 20), top: 222 }}>
              {star.tag}
            </Line>
            <div
              className="ad__hero"
              style={{
                transform: `translate(-50%, -50%) translateX(${x}px) perspective(1100px) rotateY(${ry}deg) rotate(${(1 - inK) * 8 - outK * 8}deg) scale(1.42)`,
              }}
            >
              <Face pick={star} size="lg" />
              <Shine k={span(t, a + 0.6, a + 1.35)} />
            </div>
          </div>
        );
      })}

      {/* 4. le mur de cartes */}
      {t < FEATURES && (
        <div className="ad__wall" style={{ opacity: wall, transform: `translate(-50%, -50%) rotate(-11deg) scale(${1.08 - 0.08 * wallIn})` }}>
          {wallRows.map((row, r) => {
            const dir = r % 2 ? 1 : -1;
            const offset = dir * (t - WALL) * 46 - (r % 2 ? 260 : 120);
            return (
              <div key={r} className="ad__row" style={{ transform: `translateX(${offset}px)` }}>
                {row.map((id, i) => (
                  <Face key={`${id}-${i}`} pick={{ id, variant: (r * PER_ROW + i) % 9 === 4 ? 'reverse' : 'base' }} size="sm" />
                ))}
              </div>
            );
          })}
        </div>
      )}
      {wall > 0 && (
        <div className="ad__band" style={{ opacity: wall, transform: `translateY(-50%) scaleY(${0.4 + 0.6 * easeOut(span(t, WALL, WALL + 0.45))})` }}>
          <div className="ad__band-title" style={rise(life(t, WALL + 0.2, WALL + 0.7))}>
            Plus de 100 espèces
          </div>
          <div className="ad__band-sub" style={rise(life(t, WALL + 0.5, WALL + 1))}>
            du Mexique, de l’axolotl au jaguar
          </div>
        </div>
      )}

      {/* 5. le jeu */}
      {t >= FEATURES - 0.1 && t < END + 0.1 && (
        <>
          <Line className="ad__name" style={{ ...rise(life(t, FEATURES - 0.1, FEATURES + 0.4, END - 0.4, END)), top: 150 }}>
            Et dans le jeu…
          </Line>
          {FEATURE_ROWS.map(([icon, title, sub], i) => {
            const k = life(t, FEATURES + 0.1 + i * 0.35, FEATURES + 0.55 + i * 0.35, END - 0.4, END);
            return (
              <div key={icon} className="ad__feature" style={{ top: 252 + i * 104, opacity: k, transform: `translateX(${(1 - k) * (i % 2 ? 60 : -60)}px)` }}>
                <span className="ad__feature-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
                    {ICONS[icon]}
                  </svg>
                </span>
                <span>
                  <b>{title}</b>
                  <small>{sub}</small>
                </span>
              </div>
            );
          })}
        </>
      )}

      {/* 6. fin */}
      {t >= END - 0.1 && (
        <>
          <Line className="promo__logo promo__logo--end" style={{ ...rise(endK(END, END + 0.7)), top: 150 }}>
            <Logo />
          </Line>
          <Line className="ad__badge" style={{ ...rise(endK(END + 0.3, END + 0.9)), top: 230 }}>
            <span>
              <Flag /> Série 2 · México
            </span>
          </Line>
          <div className="ad__duo" style={{ opacity: endK(END + 0.5, END + 1.1), transform: `translate(-50%, 0) translateY(${(1 - endK(END + 0.5, END + 1.3)) * 50}px)` }}>
            <div className="ad__duo-card" style={{ transform: `rotate(${-9 + Math.sin(t * 1.2) * 2}deg)` }}>
              <Face pick={{ id: 'mx-jaguar', variant: 'prime' }} size="sm" />
            </div>
            <div className="ad__duo-pack" style={{ transform: `rotate(${7 + Math.sin(t * 1.1 + 1) * 2}deg) translateY(${Math.sin(t * 1.6) * 4}px)` }}>
              <PackArtMexique />
            </div>
          </div>
          <Line className="ad__dispo" style={{ ...pop(span(t, END + 1.1, END + 1.7)), opacity: clamp(span(t, END + 1.1, END + 1.25) * 4), top: 548 }}>
            Disponible maintenant
          </Line>
          <Line className="ad__url" style={{ ...pop(span(t, END + 1.6, END + 2.2)), opacity: clamp(span(t, END + 1.6, END + 1.75) * 4), top: 616 }}>
            <span>animalcards.fr</span>
          </Line>
          <Line className="ad__free" style={{ ...rise(endK(END + 2.1, END + 2.6)), top: 700 }}>
            Gratuit · sans téléchargement
          </Line>
        </>
      )}

      <div className="promo__flash" style={{ opacity: flash }} />
    </div>
  );
}
