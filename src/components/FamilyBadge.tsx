import { EAGLE } from '../art/kit';
import type { CSSProperties } from 'react';
import type { SportId } from '../engine/types';
import { SPORTS } from '../data/sports';
import { packScene } from './PackArt';
import { PackScene } from './PackScene';
import { SportIcon } from './SportIcon';

// Badge de collection d'une famille, dans le langage des boosters : le paysage peint du pack de la famille
// dans un médaillon cerclé d'or, l'emblème de la famille au centre (comme le médaillon des cartes) et un ruban
// à son nom. Tant que la famille n'est pas complète, le badge reste éteint, en grisaille.

export function FamilyBadge({ sport, earned, size = 104 }: { sport: SportId; earned: boolean; size?: number }) {
  const scene = packScene('sport', sport);
  const style = {
    '--badge-size': `${size}px`,
    '--badge-near': scene.palette.near,
    '--sport': SPORTS[sport].color,
  } as CSSProperties;
  return (
    <div className={`fbadge${earned ? ' is-earned' : ' is-locked'}`} style={style}>
      <div className="fbadge__medal">
        <PackScene scene={scene} seed={`badge ${sport}`} className="fbadge__scene" shade={false} />
        <span className="fbadge__emblem">
          <SportIcon sport={sport} />
        </span>
      </div>
      <span className="fbadge__ribbon">{SPORTS[sport].short}</span>
    </div>
  );
}

/** Flocon à six branches (emblème de la Série 3), dans le repère des icônes de badge (-11 -5 22 10). */
const FLAKE = (() => {
  let d = '';
  for (let i = 0; i < 6; i++) {
    const a = (i * Math.PI) / 3;
    const [c, s] = [Math.cos(a), Math.sin(a)];
    const [x, y] = [c * 4.6, s * 4.6];
    d += `M0 0L${x.toFixed(2)} ${y.toFixed(2)}`;
    // deux petites branches vers l'extérieur
    const [bx, by] = [c * 2.8, s * 2.8];
    for (const turn of [0.6, -0.6]) d += `M${bx.toFixed(2)} ${by.toFixed(2)}L${(bx + Math.cos(a + turn) * 1.5).toFixed(2)} ${(by + Math.sin(a + turn) * 1.5).toFixed(2)}`;
  }
  return d;
})();

/**
 * Badge d'une série complète : son paysage, et son emblème (l'aigle du drapeau pour le Mexique, un flocon pour
 * l'Hiver).
 */
export function SerieBadge({ number, name, earned, size = 104 }: { number: number; name: string; earned: boolean; size?: number }) {
  const hiver = number === 3;
  const scene = packScene(hiver ? 'hiver' : 'mexique');
  const style = {
    '--badge-size': `${size}px`,
    '--badge-near': scene.palette.near,
    '--sport': '#2fa36b',
  } as CSSProperties;
  return (
    <div className={`fbadge fbadge--serie${earned ? ' is-earned' : ' is-locked'}`} style={style}>
      <div className="fbadge__medal">
        <PackScene scene={scene} seed={`badge ${name}`} className="fbadge__scene" shade={false} />
        <span className="fbadge__emblem">
          <svg className="sport-icon" viewBox="-11 -5 22 10" aria-hidden="true">
            {hiver ? <path d={FLAKE} fill="none" stroke="currentColor" strokeWidth={0.9} strokeLinecap="round" /> : <path d={EAGLE} fill="currentColor" />}
          </svg>
        </span>
      </div>
      <span className="fbadge__ribbon">{name}</span>
    </div>
  );
}
