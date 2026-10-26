import type { CSSProperties, ReactNode } from 'react';
import { mulberry32 } from '../art/kit';

// Outils communs des vidéos de promotion : chaque image est une fonction du temps `t`, sans aucune animation du
// navigateur (voir mount.tsx). Courbes d'animation, textes qui apparaissent, lucioles et pétales.

export const W = 540;
export const H = 960;

export const clamp = (x: number) => Math.max(0, Math.min(1, x));
/** avancement de `a` à `b` (0 → 1) */
export const span = (t: number, a: number, b: number) => clamp((t - a) / (b - a));
export const easeOut = (x: number) => 1 - (1 - x) ** 3;
export const easeInOut = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2);
export const backOut = (x: number) => 1 + 2.4 * (x - 1) ** 3 + 1.4 * (x - 1) ** 2;
/** apparition de a à b, disparition de c à d */
export const life = (t: number, a: number, b: number, c?: number, d?: number) =>
  easeOut(span(t, a, b)) * (c === undefined || d === undefined ? 1 : 1 - easeInOut(span(t, c, d)));

// ───────────── lucioles du sous-bois ─────────────

export function Fireflies({ t, opacity }: { t: number; opacity: number }) {
  const r = mulberry32(7);
  return (
    <svg className="promo__fireflies" viewBox={`0 0 ${W} ${H}`} style={{ opacity }}>
      {Array.from({ length: 26 }, (_, i) => {
        const x = r() * W + Math.sin(t * (0.4 + r() * 0.5) + i) * 24;
        const y = 300 + r() * 600 + Math.cos(t * (0.3 + r() * 0.4) + i * 2) * 18 - t * 6;
        const glow = 0.35 + 0.65 * Math.max(0, Math.sin(t * (1.2 + r()) + i * 1.7));
        return (
          <g key={i} opacity={glow}>
            <circle cx={x} cy={y} r={7} fill="#d9f2a0" opacity={0.18} />
            <circle cx={x} cy={y} r={2.2} fill="#f4ffd0" />
          </g>
        );
      })}
    </svg>
  );
}

// ───────────── pétales de cempasúchil (la fleur du Jour des morts, le 1er novembre) ─────────────

/** `keep` écarte des pétales selon leur position (l'affiche les retire de devant le texte). */
export function Petals({ t, from, keep }: { t: number; from: number; keep?: (x: number, y: number) => boolean }) {
  if (t < from) return null;
  const r = mulberry32(42);
  const fade = span(t, from, from + 1);
  return (
    <svg className="promo__petals" viewBox={`0 0 ${W} ${H}`}>
      {Array.from({ length: 34 }, (_, i) => {
        const x0 = r() * W;
        const speed = 60 + r() * 70;
        const phase = r() * Math.PI * 2;
        const spin = (r() - 0.5) * 300;
        const offset = r() * H;
        const size = 4 + r() * 4;
        const y = ((t - from) * speed + offset) % (H + 60) - 30;
        const x = x0 + Math.sin(t * 1.3 + phase) * 26;
        if (keep && !keep(x, y)) return null;
        return (
          <ellipse
            key={i}
            cx={0}
            cy={0}
            rx={size}
            ry={size * 0.55}
            fill={['#ff9f1c', '#ffbf47', '#f37b20', '#ffd166'][i % 4]}
            opacity={0.9 * fade}
            transform={`translate(${x} ${y}) rotate(${spin * t + phase * 57})`}
          />
        );
      })}
    </svg>
  );
}

// ───────────── textes ─────────────

export function Line({ children, style, className = '' }: { children: ReactNode; style?: CSSProperties; className?: string }) {
  return (
    <div className={`promo__line ${className}`} style={style}>
      {children}
    </div>
  );
}

/** Apparition d'un texte : fondu et montée (ou rebond pour un titre). */
export const rise = (k: number, px = 24): CSSProperties => ({ opacity: k, transform: `translateY(${(1 - k) * px}px)` });
export const pop = (k: number): CSSProperties => ({ opacity: clamp(k * 3), transform: `scale(${0.6 + 0.4 * backOut(k)})` });
