import { ATHLETES_BY_ID } from '../data/athletes';
import { SITE_SCENE } from '../art/scenes';
import { air, bass, bell, boom, midi, pluck, strings, tick, type Bus } from '../audio/engine';
import { Card } from '../components/Card';
import { Logo } from '../components/Logo';
import { Landscape } from '../components/PackScene';
import { formatRecordValue, recordValue, compare, type RecordId } from '../engine/duel';
import { Fireflies, Line, clamp, easeInOut, easeOut, life, pop, rise, span } from './anim';

// Série TikTok « Qui est le plus… ? » : deux cartes du jeu, une question du duel de records, un compte à rebours
// (« réponds en commentaire »), puis la vraie réponse tirée des données du jeu. Une vidéo par question :
// promo/quiz.html?q=0 … ?q=9 (scripts/promo/video.mjs).

export const QUIZ: { record: RecordId; question: string; a: string; b: string }[] = [
  { record: 'lourd', question: 'Qui est le plus lourd\u00a0?', a: 'hippopotame', b: 'rhinoceros-blanc' },
  { record: 'vieux', question: 'Qui vit le plus longtemps\u00a0?', a: 'elephant', b: 'tortue-geante' },
  { record: 'oeufs', question: 'Lequel pond des œufs\u00a0?', a: 'dauphin', b: 'ornithorynque' },
  { record: 'rare', question: 'Qui est le plus rare\u00a0?', a: 'tigre', b: 'panda' },
  { record: 'nombreux', question: 'Qui est le plus nombreux sur Terre\u00a0?', a: 'pigeon', b: 'poule' },
  { record: 'grand', question: 'Qui est le plus grand\u00a0?', a: 'calmar-geant', b: 'baleine-bleue' },
  { record: 'leger', question: 'Qui est le plus léger\u00a0?', a: 'souris', b: 'colibri' },
  { record: 'rare', question: 'Qui est le plus rare\u00a0?', a: 'loup', b: 'lion' },
  { record: 'lourd', question: 'Qui est le plus lourd\u00a0?', a: 'gorille', b: 'ours-polaire' },
  { record: 'vieux', question: 'Qui vit le plus longtemps\u00a0?', a: 'chat', b: 'ara' },
];

const CARDS = 0.7;
const COUNT = 2;
const REVEAL = 5;
const FACT = 6.2;
const CTA = 8.8;
export const DURATION = 11.5;

export function quizIndex(): number {
  const q = Number(new URLSearchParams(location.search).get('q') ?? 0);
  return Math.max(0, Math.min(QUIZ.length - 1, Number.isFinite(q) ? q : 0));
}

export function QuizPromo({ t, index }: { t: number; index: number }) {
  const quiz = QUIZ[index];
  const face = (id: string) => ({ uid: id, athleteId: id, variant: 'base' as const });
  const winner = compare(quiz.record, recordValue(face(quiz.a), quiz.record), recordValue(face(quiz.b), quiz.record));
  const revealed = easeOut(span(t, REVEAL, REVEAL + 0.4));
  const count = t >= COUNT && t < REVEAL ? 3 - Math.floor((t - COUNT) / 1) : 0;
  const ctaOut = easeInOut(span(t, CTA - 0.3, CTA + 0.3));
  const win = ATHLETES_BY_ID[winner === 'opp' ? quiz.b : quiz.a];
  const side = (id: string, who: 'me' | 'opp', dir: 1 | -1) => {
    const k = easeOut(span(t, CARDS + (who === 'opp' ? 0.15 : 0), CARDS + 0.75 + (who === 'opp' ? 0.15 : 0)));
    const won = winner === who || winner === 'draw';
    const scale = 1 + (won ? 0.08 : -0.08) * revealed;
    return (
      <div
        className={`quiz__side${t >= REVEAL && won ? ' is-winner' : ''}`}
        style={{
          opacity: k * (t >= REVEAL && !won ? 1 - 0.5 * revealed : 1) * (1 - ctaOut),
          transform: `translateX(${(1 - k) * dir * -320}px) rotate(${dir * (-4 + Math.sin(t * 1.4 + dir) * 1.5)}deg) scale(${scale})`,
        }}
      >
        <Card card={face(id)} size="md" hideFacts />
        <p className="quiz__value" style={{ opacity: revealed, transform: `scale(${0.6 + 0.4 * revealed})` }}>
          {formatRecordValue(face(id), quiz.record)}
        </p>
      </div>
    );
  };
  return (
    <div className="promo quiz">
      <div className="promo__layer">
        <Landscape className="promo__forest" scene={SITE_SCENE} seed="sous-bois" maxWidth={600} />
        <Fireflies t={t} opacity={0.8} />
        <div className="quiz__shade" />
      </div>
      <Line className="quiz__eyebrow" style={{ ...rise(life(t, 0.1, 0.5, CTA - 0.3, CTA)), top: 92 }}>
        Quiz animaux · {index + 1}/10
      </Line>
      <Line className="quiz__question" style={{ ...pop(span(t, 0.2, 0.8)), opacity: clamp(span(t, 0.2, 0.4)) * (1 - ctaOut), top: 124 }}>
        {quiz.question}
      </Line>
      <div className="quiz__duel">
        {side(quiz.a, 'me', 1)}
        <span className="quiz__vs" style={{ opacity: life(t, CARDS + 0.6, CARDS + 0.9) * (1 - ctaOut) }}>VS</span>
        {side(quiz.b, 'opp', -1)}
      </div>
      {count > 0 && (
        <div className="quiz__count" key={count} style={{ opacity: 1 - span(t, COUNT + (3 - count) + 0.6, COUNT + (3 - count) + 1), transform: `scale(${1.4 - 0.4 * easeOut(span(t, COUNT + (3 - count), COUNT + (3 - count) + 0.3))})` }}>
          {count}
        </div>
      )}
      <Line className="quiz__hint" style={{ ...rise(life(t, COUNT - 0.4, COUNT, REVEAL - 0.3, REVEAL)), top: 760 }}>
        Réponds en commentaire 👇
      </Line>
      <Line className="quiz__fact" style={{ ...rise(life(t, FACT, FACT + 0.5, CTA - 0.3, CTA)), top: 742 }}>
        <b>{win.last}</b> · {win.fact}
      </Line>
      {t >= CTA - 0.2 && (
        <>
          <Line className="promo__logo" style={{ ...rise(easeOut(span(t, CTA, CTA + 0.6))), top: 330 }}>
            <Logo />
          </Line>
          <Line className="quiz__cta" style={{ ...rise(easeOut(span(t, CTA + 0.3, CTA + 0.9))), top: 420 }}>
            Plus de 450 animaux à collectionner et des duels de culture générale
          </Line>
          <Line className="promo__url" style={{ ...rise(easeOut(span(t, CTA + 0.6, CTA + 1.2))), top: 540 }}>
            Joue gratuitement sur <b>animalcards.fr</b>
          </Line>
        </>
      )}
    </div>
  );
}

/** Musique : un battement qui monte pendant le compte à rebours, un impact à la réponse, un accord à la fin. */
export function scheduleQuiz(ac: AudioContext, out: Bus, t0: number) {
  const chord = [57, 60, 64];
  boom(ac, out, t0 + 0.2, 0.12, 60);
  bell(ac, out, midi(76), t0 + 0.25, 0.05, 0, 1.6);
  for (let k = 0; k < 12; k++) {
    const t = t0 + CARDS + k * 0.36;
    pluck(ac, out, midi(k % 2 ? 52 : 45), t, 0.12, -0.2, 0.3);
    if (k % 3 === 2) chord.forEach((n, j) => pluck(ac, out, midi(n), t + j * 0.015, 0.05, 0.1 + j * 0.1, 0.35));
  }
  for (let k = 0; k < 3; k++) {
    bell(ac, out, midi(81 - k * 0), t0 + COUNT + k, 0.05, 0.2, 0.8);
    for (let e = 0; e < 4; e++) tick(ac, out, t0 + COUNT + k + e * 0.25, 0.025 + k * 0.01, 2000 + k * 200);
    bass(ac, out, midi(33 + k * 2), t0 + COUNT + k, 0.9, 0.12);
  }
  air(ac, out, t0 + REVEAL - 1, 1, { gain: 0.045, from: 400, to: 6000, q: 0.7, attack: 0.9, send: 0.5 });
  boom(ac, out, t0 + REVEAL, 0.2, 46);
  [69, 73, 76, 81].forEach((n, j) => bell(ac, out, midi(n), t0 + REVEAL + j * 0.06, 0.05, -0.2 + j * 0.15, 2.4));
  strings(ac, out, [57, 61, 64, 69].map(midi), t0 + REVEAL, 3, 0.03, { attack: 0.1, release: 1.5, open: 1800 });
  for (let k = 0; k < 8; k++) pluck(ac, out, midi([57, 61, 64, 69][k % 4] + 12), t0 + FACT + k * 0.3, 0.06, (k % 2) * 0.3 - 0.15, 0.4);
  [45, 57, 61, 64, 69].forEach((n, j) => pluck(ac, out, midi(n), t0 + CTA + j * 0.05, 0.12, (j - 2) * 0.12, 0.4));
  bass(ac, out, midi(33), t0 + CTA, 2, 0.12);
  strings(ac, out, [57, 61, 64].map(midi), t0 + CTA, 2.2, 0.026, { attack: 0.3, release: 1.5, open: 1300 });
}
