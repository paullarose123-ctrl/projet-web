import type { CSSProperties, ReactNode } from 'react';
import { SITE_SCENE } from '../art/scenes';
import { air, bass, bell, boom, kalimba, marimba, midi, pluck, strings, tick, type Bus } from '../audio/engine';
import { Card } from '../components/Card';
import { CardBack } from '../components/CardBack';
import { Logo } from '../components/Logo';
import { Landscape } from '../components/PackScene';
import { formatRecordValue } from '../engine/duel';
import { photoCredit } from '../photos';
import { Fireflies, Line, backOut, clamp, easeInOut, easeOut, life, pop, rise, span } from './anim';

// Pub TikTok « 30 jours, 30 cartes » (1080 × 1920, 24,5 s) : une éphéméride dont on arrache une page par jour.
// Chaque jour, une carte se retourne et donne un vrai fait tiré du jeu (« Elle a 3 cœurs »). Les jours 1 à 5 prennent
// leur temps, puis l'album se remplit de plus en plus vite jusqu'au jour 30 ; la culture apprise fait ensuite gagner
// un duel (« Qui est le plus grand ? » : la girafe, apprise au jour 5), et l'appel à jouer explique le jeu en trois lignes.

const face = (id: string) => ({ uid: id, athleteId: id, variant: 'base' as const });
/** largeur exacte d'une carte (la taille du composant fixe sinon --card-w en ligne) */
const cw = (px: number) => ({ ['--card-w' as string]: `${px}px` }) as CSSProperties;

interface Day {
  id: string;
  /** début du jour (la page de l'éphéméride s'arrache) */
  at: number;
  fact: ReactNode;
}

const FIRST: Day[] = [
  { id: 'pieuvre', at: 0, fact: <>Elle a <b>3 cœurs</b><br />et le sang bleu.</> },
  { id: 'loutre-de-mer', at: 3.0, fact: <>Elle dort en tenant<br /><b>la main</b> de ses voisines.</> },
  { id: 'crevette-mante', at: 4.85, fact: <>Son coup de poing<br /><b>fait bouillir l’eau.</b></> },
  { id: 'tardigrade', at: 6.55, fact: <>Il survit<br /><b>dans l’espace.</b></> },
  { id: 'girafe', at: 8.15, fact: <>Jusqu’à <b>5,5 m</b>, et 7 vertèbres<br />dans le cou… comme toi.</> },
];

const RUSH: [string, string][] = [
  ['colibri', 'Il peut voler en arrière.'],
  ['axolotl', 'Il se refait un cœur.'],
  ['paresseux', 'Des algues poussent sur lui.'],
  ['flamant-rose', 'Rose grâce à ce qu’il mange.'],
  ['ornithorynque', 'Un mammifère qui pond des œufs.'],
  ['koala', 'Il dort 20 h par jour.'],
  ['ours-polaire', 'Sa peau est noire.'],
  ['kangourou', 'Il ne sait pas reculer.'],
  ['dauphin', 'Chacun a son « prénom » sifflé.'],
  ['tigre', 'Ses rayures sont uniques.'],
  ['hippopotame', 'Il court plus vite que toi.'],
  ['manchot-empereur', 'Le papa couve 2 mois sans manger.'],
  ['cameleon', 'Ses yeux bougent séparément.'],
  ['requin-blanc', 'Environ 300 dents.'],
  ['thylacine', 'Disparu en 1936.'],
  ['elephant', '40 000 muscles dans la trompe.'],
  ['beluga', 'Le « canari des mers ».'],
  ['loup', 'Son hurlement porte à 10 km.'],
  ['chimpanze', '98 % de notre ADN.'],
  ['guepard', '100 km/h en 3 secondes.'],
  ['abeille', 'Elles se parlent en dansant.'],
  ['zebre', 'Ses rayures gênent les mouches.'],
  ['lion', 'Son rugissement porte à 8 km.'],
  ['panda', '14 h par jour à manger.'],
  ['baleine-bleue', 'Le plus grand animal de tous les temps.'],
];

/** Début de l'accélération (jours 6 à 30). */
const R0 = 9.75;
const RUSH_AT: number[] = (() => {
  const out: number[] = [];
  let at = R0 + 0.15;
  for (let k = 0; k < RUSH.length; k++) {
    out.push(at);
    at += k === RUSH.length - 2 ? 0.42 : Math.max(0.06, 0.42 * 0.86 ** k);
  }
  return out;
})();
const D30 = RUSH_AT[RUSH_AT.length - 1];
const DU = D30 + 2.0; // duel
const PICK = DU + 1.35;
const SHOW = DU + 2.2;
const WIN = DU + 2.5;
const END = DU + 4.1;
export const DURATION = END + 5.2;

const ALL: { id: string; at: number; fact: ReactNode }[] = [...FIRST, ...RUSH.map(([id, fact], k) => ({ id, at: RUSH_AT[k], fact }))];
export const IMAGES = [...new Set([...ALL.map((d) => d.id), 'axolotl'])]
  .map((id) => photoCredit(id))
  .filter((c): c is NonNullable<typeof c> => !!c)
  .map((c) => `/photos/${c.file}${c.v ? `?v=${c.v}` : ''}`);

/** Jour affiché sur l'éphéméride au temps t (1 à 30). */
const dayAt = (t: number) => ALL.reduce((n, d, i) => (t >= d.at ? i + 1 : n), 1);

// ───────────── éphéméride ─────────────

function Page({ n, style }: { n: number; style?: CSSProperties }) {
  return (
    <div className="jour__page" style={style}>
      <div className="jour__page-top">Jour</div>
      <div className="jour__page-n">{n}</div>
    </div>
  );
}

function Calendar({ t, opacity }: { t: number; opacity: number }) {
  const n = dayAt(t);
  // les pages arrachées s'envolent (on garde les trois dernières)
  const torn = ALL.map((d, i) => ({ i, at: d.at })).filter(({ i, at }) => i > 0 && t >= at && t < at + 0.45).slice(-3);
  const land = t >= D30 ? backOut(span(t, D30, D30 + 0.35)) : 1;
  return (
    <div className="jour__cal" style={{ opacity, transform: `scale(${t >= D30 ? 1.25 - 0.25 * land : 1})` }}>
      <div className="jour__rings">
        <i />
        <i />
      </div>
      <Page n={n} />
      {torn.map(({ i, at }) => {
        const k = easeOut(span(t, at, at + 0.45));
        return (
          <Page
            key={i}
            n={i}
            style={{
              position: 'absolute',
              inset: 0,
              transformOrigin: '10% 0%',
              opacity: 1 - k,
              transform: `translate(${k * 160}px, ${-k * 90}px) rotate(${k * 38}deg)`,
            }}
          />
        );
      })}
    </div>
  );
}

// ───────────── carte qui se retourne ─────────────

/** Une carte face cachée qui monte, se retourne (flip de flipAt à flipAt + 0.3) puis repart vers l'album. */
function FlipCard({ t, day, next }: { t: number; day: Day; next?: number }) {
  const enter = day.at === 0 ? 1 : easeOut(span(t, day.at + 0.05, day.at + 0.35));
  const flipAt = day.at === 0 ? 0.15 : day.at + 0.3;
  const angle = 180 * (1 - easeInOut(span(t, flipAt, flipAt + 0.3)));
  const leave = next === undefined ? 0 : easeInOut(span(t, next - 0.05, next + 0.3));
  if (t < day.at || leave >= 1) return null;
  const sway = Math.sin(t * 1.6) * 2;
  const scaleX = Math.abs(Math.cos((angle * Math.PI) / 180));
  const showFace = angle < 90;
  const glow = clamp(1 - span(t, flipAt + 0.3, flipAt + 1.2));
  return (
    <div
      className="jour__card"
      style={{
        opacity: enter * (1 - leave),
        transform: `translate(${leave * 0}px, ${(1 - enter) * 520 + leave * 420}px) scale(${1 - 0.8 * leave}) rotate(${sway * (1 - leave)}deg)`,
      }}
    >
      <div style={{ transform: `scaleX(${Math.max(0.02, scaleX)}) scale(${1 + 0.06 * Math.sin((angle * Math.PI) / 180)})` }}>
        {showFace ? <Card card={face(day.id)} size="lg" style={cw(232)} /> : <CardBack label="Série 1" />}
      </div>
      {showFace && <div className="jour__flash" style={{ opacity: glow }} />}
    </div>
  );
}

// ───────────── album (grille de 30) ─────────────

const COLS = 6;
const CW = 64;
const GAP = 7;
const CH = CW * 1.4;
const GX = (540 - (COLS * CW + (COLS - 1) * GAP)) / 2;
const GY = 246;
const slot = (i: number) => ({ x: GX + (i % COLS) * (CW + GAP), y: GY + Math.floor(i / COLS) * (CH + GAP) });

function Album({ t }: { t: number }) {
  const show = life(t, R0 - 0.25, R0 + 0.15, DU - 0.5, DU - 0.1);
  if (show <= 0) return null;
  const wave = t >= D30 ? span(t, D30, D30 + 0.9) : -1;
  return (
    <div className="jour__album" style={{ opacity: show }}>
      {ALL.map((d, i) => {
        const p = slot(i);
        // la girafe (jour 5) rejoint sa case depuis le centre
        if (i === 4) {
          const k = easeInOut(span(t, R0 - 0.3, R0 + 0.15));
          const x = 154 + (p.x - 154) * k;
          const y = 262 + (p.y - 262) * k;
          const s = 232 / CW + (1 - 232 / CW) * k;
          return (
            <div key={i} className="jour__slot is-filled" style={{ left: x, top: y, transform: `scale(${s})`, transformOrigin: '0 0', zIndex: 3 }}>
              <Card card={face(d.id)} size="xs" style={cw(CW)} />
            </div>
          );
        }
        const filled = i < 4 || t >= d.at;
        const k = i < 4 ? 1 : easeOut(span(t, d.at, d.at + 0.16));
        const lit = wave >= 0 ? clamp(1 - Math.abs(wave * 1.6 - (Math.floor(i / COLS) + (i % COLS) * 0.3) / 6) * 4) : 0;
        return (
          <div key={i} className={`jour__slot${filled ? ' is-filled' : ''}`} style={{ left: p.x, top: p.y }}>
            {filled && (
              <div style={{ opacity: k, transform: `scale(${1.7 - 0.7 * k + lit * 0.12})`, filter: lit ? `drop-shadow(0 0 ${10 * lit}px rgba(255, 209, 102, ${lit}))` : undefined }}>
                <Card card={face(d.id)} size="xs" style={cw(CW)} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ───────────── la vidéo ─────────────

export function JourPromo({ t }: { t: number }) {
  const n = dayAt(t);
  const single = t < R0 + 0.2;
  const current = [...FIRST].reverse().find((d) => t >= d.at) ?? FIRST[0];
  const ci = FIRST.indexOf(current);
  const factAt = current.at === 0 ? 0.42 : current.at + 0.58;
  const nextAt = FIRST[ci + 1]?.at ?? R0 - 0.15;
  const fact = life(t, factAt, factAt + 0.3, nextAt - 0.15, nextAt + 0.05);
  const rushDay = ALL[n - 1];
  const rushFact = t >= R0 + 0.15 && t < D30;
  const calOpacity = 1 - easeInOut(span(t, DU - 0.5, DU - 0.1));
  const duel = t >= DU - 0.2 && t < END + 0.4;
  const end = t >= END - 0.1;
  const endOut = easeInOut(span(t, END - 0.4, END));
  const duelIn = (a: number, b: number) => life(t, a, b, END - 0.4, END);
  const shake = t >= D30 && t < D30 + 0.3 ? Math.sin(t * 90) * 5 * (1 - span(t, D30, D30 + 0.3)) : 0;

  return (
    <div className="promo jour" style={{ transform: `translate(${shake}px, ${shake * 0.6}px)` }}>
      <div className="promo__layer">
        <Landscape className="promo__forest" scene={SITE_SCENE} seed="sous-bois" maxWidth={600} />
        <Fireflies t={t} opacity={0.8} />
        <div className="jour__shade" style={{ opacity: 0.85 + 0.15 * clamp(span(t, R0, R0 + 1)) }} />
        {t >= D30 && t < DU && <div className="jour__burst" style={{ opacity: life(t, D30, D30 + 0.15, D30 + 0.4, DU - 0.3) }} />}
      </div>

      {/* jours 1 à 30 */}
      {t < DU && <Calendar t={t} opacity={calOpacity} />}
      {single && (
        <Line className="jour__tagline" style={{ ...rise(life(t, 1.5, 1.9, R0 - 0.3, R0)), top: 212 }}>
          Chaque carte t’apprend <b>un vrai truc</b>
        </Line>
      )}
      {single && FIRST.map((d, i) => <FlipCard key={d.id} t={t} day={d} next={i < 4 ? FIRST[i + 1].at : undefined} />)}
      {single && (
        <Line className="jour__fact" style={{ ...rise(fact, 18), top: 606 }}>
          <span className="jour__fact-kicker">Le savais-tu ?</span>
          {current.fact}
        </Line>
      )}
      {single && t >= 1.0 && (
        <div className="jour__progress" style={{ opacity: life(t, 1.0, 1.4, R0 - 0.3, R0) }}>
          <span>Album</span>
          <div className="jour__bar">
            <i style={{ width: `${(Math.min(n, 5) / 30) * 100}%` }} />
          </div>
          <b>{t >= FIRST[1].at + 0.3 ? Math.min(n, 5) : 1}/30</b>
        </div>
      )}
      <Album t={t} />
      {rushFact && (
        <Line className="jour__rush" style={{ top: 200, opacity: clamp(span(t, R0 + 0.15, R0 + 0.3)) }}>
          <span className="jour__rush-day">Jour {n}</span> {rushDay.fact}
        </Line>
      )}
      {t >= D30 && t < DU && (
        <>
          <Line className="jour__thirty" style={{ ...pop(span(t, D30 + 0.05, D30 + 0.5)), top: 198, opacity: clamp(span(t, D30, D30 + 0.15)) * (1 - easeInOut(span(t, DU - 0.5, DU - 0.1))) }}>
            30 cartes = <b>30 trucs appris</b>
          </Line>
          <Line className="jour__more" style={{ ...rise(life(t, D30 + 0.7, D30 + 1.1, DU - 0.5, DU - 0.1)), top: 742 }}>
            … et il en reste plus de 500 à découvrir.
          </Line>
        </>
      )}

      {/* duel de culture générale : ce qu'on a appris sert */}
      {duel && (
        <>
          <Line className="promo__eyebrow" style={{ ...rise(duelIn(DU, DU + 0.35)), top: 92 }}>
            Duel de culture G
          </Line>
          <Line className="jour__question" style={{ ...pop(span(t, DU + 0.1, DU + 0.6)), opacity: duelIn(DU + 0.1, DU + 0.3), top: 122 }}>
            Qui est le plus grand ?
          </Line>
          <div className="jour__duel">
            {(['girafe', 'elephant'] as const).map((id, k) => {
              const dir = k === 0 ? 1 : -1;
              const kin = easeOut(span(t, DU + 0.25 + k * 0.12, DU + 0.85 + k * 0.12));
              const picked = id === 'girafe' ? easeOut(span(t, PICK, PICK + 0.3)) : 0;
              const lose = id === 'elephant' ? easeOut(span(t, WIN, WIN + 0.4)) : 0;
              const shown = easeOut(span(t, SHOW, SHOW + 0.35));
              return (
                <div
                  key={id}
                  className={`jour__side${picked > 0.5 ? ' is-picked' : ''}`}
                  style={{
                    opacity: kin * (1 - 0.45 * lose) * (1 - endOut),
                    transform: `translate(${(1 - kin) * dir * -320}px, ${-picked * 16}px) rotate(${dir * (-3 + Math.sin(t * 1.3 + k) * 1.2)}deg) scale(${1 + picked * 0.06 - lose * 0.06})`,
                  }}
                >
                  <Card card={face(id)} size="md" hideFacts style={cw(200)} />
                  <p className="jour__value" style={{ opacity: shown, transform: `scale(${0.6 + 0.4 * backOut(shown)})` }}>
                    {formatRecordValue(face(id), 'grand')}
                  </p>
                </div>
              );
            })}
            <span className="jour__vs" style={{ opacity: duelIn(DU + 0.8, DU + 1.0) * (1 - easeOut(span(t, WIN, WIN + 0.3))) }}>
              VS
            </span>
          </div>
          {t >= PICK && t < PICK + 0.5 && (
            <div className="jour__tap" style={{ opacity: 1 - span(t, PICK, PICK + 0.5), transform: `scale(${0.4 + 1.2 * easeOut(span(t, PICK, PICK + 0.5))})` }} />
          )}
          <Line className="jour__caption" style={{ ...rise(duelIn(PICK + 0.1, PICK + 0.45)), top: 616 }}>
            Facile : je l’ai appris <b>au jour 5</b>.
          </Line>
          {t >= WIN && (
            <div className="jour__win" style={{ opacity: clamp(span(t, WIN, WIN + 0.1)) * (1 - endOut), transform: `rotate(-8deg) scale(${1.8 - 0.8 * backOut(span(t, WIN, WIN + 0.35))})` }}>
              Victoire !
            </div>
          )}
        </>
      )}

      {/* fin : le jeu en trois lignes */}
      {end && (
        <>
          <Line className="promo__logo jour__logo" style={{ ...rise(easeOut(span(t, END, END + 0.5))), top: 92 }}>
            <Logo />
          </Line>
          <div className="jour__fan">
            {(['pieuvre', 'axolotl', 'girafe'] as const).map((id, k) => {
              const kin = easeOut(span(t, END + 0.15 + k * 0.1, END + 0.65 + k * 0.1));
              const rot = (k - 1) * 13 * kin + Math.sin(t * 1.2 + k) * 1.5;
              return (
                <div key={id} className="jour__fan-card" style={{ opacity: kin, transform: `translate(${(k - 1) * 112 * kin}px, ${(1 - kin) * 80 + Math.abs(k - 1) * 22}px) rotate(${rot}deg)`, zIndex: k === 1 ? 2 : 1 }}>
                  <Card card={face(id)} size="sm" style={cw(160)} />
                </div>
              );
            })}
          </div>
          {[
            ['Ouvre des boosters', 'd’animaux'],
            ['Collectionne', 'plus de 500 vraies espèces'],
            ['Apprends un vrai truc', 'à chaque carte'],
          ].map(([a, b], k) => (
            <Line key={a} className="jour__point" style={{ ...rise(easeOut(span(t, END + 0.9 + k * 0.35, END + 1.3 + k * 0.35))), top: 470 + k * 46 }}>
              <i>{k + 1}</i> <b>{a}</b> {b}
            </Line>
          ))}
          <Line className="jour__cta" style={{ ...pop(span(t, END + 2.2, END + 2.7)), opacity: clamp(span(t, END + 2.2, END + 2.4)), top: 628 }}>
            <span>Gratuit sur <b>animalcards.fr</b></span>
          </Line>
          <Line className="jour__sub" style={{ ...rise(easeOut(span(t, END + 2.6, END + 3.0))), top: 714 }}>
            1 booster offert toutes les heures
          </Line>
        </>
      )}
    </div>
  );
}

// ───────────── musique : groove de kalimba en la majeur, 120 à la noire ─────────────

const BEAT = 0.5;
// la – fa♯m – ré – mi, une mesure (4 temps) chacun
const PROG = [
  [57, 61, 64],
  [54, 57, 61],
  [50, 54, 57],
  [52, 56, 59],
];

export function scheduleJour(ac: AudioContext, out: Bus, t0: number) {
  const groove = (from: number, to: number, opts: { kal?: boolean; bassGain?: number; ticks?: boolean } = {}) => {
    for (let b = Math.ceil(from / BEAT); b * BEAT < to; b++) {
      const t = t0 + b * BEAT;
      const chord = PROG[Math.floor(b / 4) % 4];
      if (b % 2 === 0) bass(ac, out, midi(chord[0] - 12), t, BEAT * 1.8, opts.bassGain ?? 0.12);
      if (opts.kal !== false) {
        kalimba(ac, out, midi(chord[b % 3] + 12), t, 0.07, -0.25);
        kalimba(ac, out, midi(chord[(b + 1) % 3] + 24), t + BEAT / 2, 0.045, 0.25);
      }
      if (opts.ticks !== false) tick(ac, out, t + BEAT / 2, 0.02, 2400);
    }
  };
  // jours 1 à 5
  groove(0, R0);
  for (const d of FIRST) {
    const flip = d.at === 0 ? 0.15 : d.at + 0.3;
    if (d.at > 0) air(ac, out, t0 + d.at, 0.3, { gain: 0.05, from: 1500, to: 6000, q: 0.8, send: 0.2 });
    [76, 81, 85].forEach((n, j) => bell(ac, out, midi(n), t0 + flip + 0.25 + j * 0.05, 0.045, -0.2 + j * 0.2, 1.4));
  }
  boom(ac, out, t0 + 0.15, 0.14, 58);
  // jours 6 à 30 : une note qui monte à chaque carte, le souffle qui grimpe
  const scale = [69, 71, 73, 74, 76, 78, 80];
  RUSH_AT.slice(0, -1).forEach((at, k) => {
    marimba(ac, out, midi(scale[k % 7] + 12 * Math.floor(k / 7) - 12), t0 + at, 0.09, (k % 2) * 0.4 - 0.2);
    tick(ac, out, t0 + at, 0.025, 2200 + k * 60);
  });
  groove(R0, D30 - 0.4, { kal: false });
  air(ac, out, t0 + R0, D30 - R0, { gain: 0.05, from: 300, to: 7000, q: 0.6, attack: D30 - R0 - 0.2, send: 0.5 });
  // jour 30
  boom(ac, out, t0 + D30, 0.26, 44);
  [57, 64, 69, 73, 76, 81].forEach((n, j) => bell(ac, out, midi(n + 12), t0 + D30 + j * 0.04, 0.04, -0.3 + j * 0.12, 2.6));
  strings(ac, out, [57, 61, 64, 69].map(midi), t0 + D30, DU - D30 + 0.4, 0.03, { attack: 0.08, release: 1.2, open: 2000 });
  // duel : pulsation en fa♯ mineur, le choix, la réponse
  for (let b = 0; b * BEAT < PICK - DU + 0.9; b++) {
    const t = t0 + DU + b * BEAT;
    bass(ac, out, midi(b % 4 === 3 ? 37 : 42), t, 0.4, 0.1);
    tick(ac, out, t + BEAT / 2, 0.03, 1800);
  }
  pluck(ac, out, midi(69), t0 + PICK, 0.12, 0, 0.5);
  air(ac, out, t0 + SHOW - 0.7, 0.7, { gain: 0.045, from: 500, to: 6000, q: 0.7, attack: 0.6, send: 0.4 });
  boom(ac, out, t0 + SHOW, 0.18, 50);
  [69, 73, 76, 81, 85].forEach((n, j) => bell(ac, out, midi(n), t0 + WIN + j * 0.06, 0.05, -0.3 + j * 0.15, 2));
  strings(ac, out, [57, 61, 64].map(midi), t0 + WIN, END - WIN + 0.4, 0.028, { attack: 0.1, release: 1, open: 1800 });
  // fin
  groove(END, DURATION - 1.6, { bassGain: 0.13 });
  [45, 57, 61, 64, 69].forEach((n, j) => pluck(ac, out, midi(n), t0 + END + j * 0.04, 0.1, (j - 2) * 0.12, 0.4));
  const last = t0 + DURATION - 1.6;
  boom(ac, out, last, 0.16, 46);
  [45, 57, 64, 69, 73, 76].forEach((n, j) => pluck(ac, out, midi(n), last + j * 0.05, 0.11, (j - 2.5) * 0.12, 0.45));
  strings(ac, out, [57, 61, 64, 69].map(midi), last, 1.5, 0.03, { attack: 0.05, release: 1.4, open: 1600 });
}
