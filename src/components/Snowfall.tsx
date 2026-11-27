import { memo, useMemo, type CSSProperties } from 'react';
import { flakePath } from './Noel';

// Neige de Noël (du 1er décembre au 6 janvier), à la place des lucioles : des flocons qui tombent en se balançant.
// Deux calques : derrière le contenu, une neige fine et nombreuse ; devant, quelques gros flocons, plus rares, qui
// passent sur les écrans sans gêner la lecture ni les clics. Tout est en CSS (déplacements seulement) : rien n'est
// recalculé à chaque image. En mode léger, la neige s'arrête là où elle est, et le calcul de devant disparaît.

/** Flocon cristal en image de fond (blanc, six branches). */
const CRYSTAL = `url("data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-10 -10 20 20"><path d="${flakePath(0, 0, 8.4)}" fill="none" stroke="#fff" stroke-width="1.5" stroke-linecap="round"/></svg>`,
)}")`;

function rand(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function flakes(count: number, front: boolean): CSSProperties[] {
  return Array.from({ length: count }, (_, i) => {
    const crystal = front || i % 4 === 0;
    const size = front ? rand(9, 16) : crystal ? rand(6, 10) : rand(2.5, 5);
    const style: Record<string, string> = {
      left: `${rand(0, 100).toFixed(1)}%`,
      '--y': `${rand(0, 100).toFixed(1)}vh`,
      '--s': `${size.toFixed(1)}px`,
      // les petits flocons tombent lentement, les gros de devant un peu plus vite
      '--d': `${(front ? rand(9, 14) : rand(12, 24)).toFixed(1)}s`,
      '--sway': `${(front ? rand(4, 7) : rand(3, 6)).toFixed(1)}s`,
      '--dx': `${Math.round(rand(10, 34))}px`,
      '--delay': `${rand(-24, 0).toFixed(1)}s`,
      '--o': (front ? rand(0.55, 0.85) : rand(0.45, 0.9)).toFixed(2),
    };
    if (crystal) style.backgroundImage = CRYSTAL;
    return style as CSSProperties;
  });
}

export const Snowfall = memo(function Snowfall({ front = false }: { front?: boolean }) {
  // sur un petit écran, moins de flocons
  const small = typeof window !== 'undefined' && window.innerWidth < 760;
  const list = useMemo(() => flakes(front ? (small ? 7 : 12) : small ? 26 : 40, front), [front, small]);
  return (
    <div className={`snowfall${front ? ' snowfall--front' : ''}`} aria-hidden="true">
      {list.map((style, i) => (
        <i key={i} className={`snowflake${style.backgroundImage ? ' snowflake--crystal' : ''}`} style={style} />
      ))}
    </div>
  );
});
