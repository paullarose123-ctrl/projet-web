import { useEffect, useRef } from 'react';
import { drawShape, type NatureShape } from './natureShapes';

// Effets de lumière de la révélation d'une carte spéciale, dessinés dans un canvas :
// - « charge » : des étincelles sont aspirées en spirale vers le centre, de plus en plus vite, autour d'un cœur qui grossit ;
// - « burst » : le cœur explose en gerbe d'étincelles et de petits éléments de la nature, puis l'ambiance de la rareté
//   s'installe : lucioles (Épique), feuilles d'or qui tombent (Légendaire), étoiles qui scintillent (Icône),
//   pétales qui volent (Prime).
// Couleurs de la rareté (ou pastels arc-en-ciel pour une Prime). Rien n'est dessiné si le joueur a réduit les animations.

export type RevealPhase = 'charge' | 'burst';

/** Ambiance de la rareté, une fois la carte révélée. */
export type RevealTheme = 'lucioles' | 'feuilles' | 'etoiles' | 'petales';

interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
  color: string;
  /** in : aspirée vers le cœur ; out : gerbe ; ember : braise qui monte ; fly : luciole ; shape : feuille, pétale ou étoile */
  kind: 'in' | 'out' | 'ember' | 'fly' | 'shape';
  angle: number;
  radius: number;
  shape?: NatureShape;
  /** rotation et vitesse de rotation (formes) */
  rot?: number;
  spin?: number;
  /** étoile fixe qui scintille sur place */
  still?: boolean;
}

interface RevealFxProps {
  phase: RevealPhase;
  colors: string[];
  /** 1 pour une Épique, 1.5 pour une Légendaire, une Icône ou une Prime */
  intensity?: number;
  theme?: RevealTheme;
}

const SHAPE_OF: Partial<Record<RevealTheme, NatureShape>> = { feuilles: 'feuille', etoiles: 'etoile', petales: 'petale' };

export function RevealFx({ phase, colors, intensity = 1, theme = 'lucioles' }: RevealFxProps) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const state = useRef({ phase, start: performance.now(), burstAt: 0 });

  useEffect(() => {
    const s = state.current;
    if (phase === 'burst' && s.phase !== 'burst') s.burstAt = performance.now();
    s.phase = phase;
  }, [phase]);

  useEffect(() => {
    const el = canvas.current;
    if (!el || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const ctx = el.getContext('2d');
    if (!ctx) return;
    let width = 0;
    let height = 0;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const resize = () => {
      width = el.clientWidth;
      height = el.clientHeight;
      el.width = Math.round(width * dpr);
      el.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    const sparks: Spark[] = [];
    const pick = () => colors[Math.floor(Math.random() * colors.length)];
    const shape = SHAPE_OF[theme];
    let exploded = false;
    let frame = 0;
    let last = performance.now();

    const spawnIn = () => {
      const angle = Math.random() * Math.PI * 2;
      // départ tout autour de l'écran, même sur un téléphone en hauteur (sans partir trop loin du centre)
      const radius = Math.min(width, height) * (0.45 + Math.random() * 0.4) + Math.random() * Math.max(0, Math.abs(height - width)) * 0.35;
      sparks.push({ x: 0, y: 0, vx: 0, vy: 0, life: 0, max: 1.6 + Math.random() * 0.8, size: 1 + Math.random() * 2.2, color: pick(), kind: 'in', angle, radius });
    };

    const explode = (cx: number, cy: number) => {
      const count = Math.round(170 * intensity);
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = (260 + Math.random() * 900) * (0.6 + intensity * 0.4);
        sparks.push({
          x: cx,
          y: cy,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 0,
          max: 0.7 + Math.random() * 1.1,
          size: 1.2 + Math.random() * 2.8,
          color: Math.random() < 0.25 ? '#ffffff' : pick(),
          kind: 'out',
          angle,
          radius: 0,
        });
      }
      // la gerbe emporte aussi des feuilles, des pétales ou des étoiles (des lucioles pour une Épique)
      const extra = Math.round(34 * intensity);
      for (let i = 0; i < extra; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 220 + Math.random() * 520;
        if (shape) {
          sparks.push({
            x: cx,
            y: cy,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - 120,
            life: 0,
            max: 2.2 + Math.random() * 1.6,
            size: 5 + Math.random() * 6,
            color: pick(),
            kind: 'shape',
            angle: Math.random() * Math.PI * 2,
            radius: 0,
            shape,
            rot: Math.random() * Math.PI * 2,
            spin: (Math.random() - 0.5) * 9,
          });
        } else {
          spawnFly(cx + Math.cos(angle) * 30, cy + Math.sin(angle) * 30, Math.cos(angle) * speed * 0.5, Math.sin(angle) * speed * 0.5);
        }
      }
    };

    /** Luciole : elle erre lentement en clignotant, avec un halo. */
    function spawnFly(x?: number, y?: number, vx = 0, vy = 0) {
      sparks.push({
        x: x ?? Math.random() * width,
        y: y ?? height * (0.15 + Math.random() * 0.8),
        vx,
        vy,
        life: 0,
        max: 4 + Math.random() * 4,
        size: 2 + Math.random() * 1.8,
        color: pick(),
        kind: 'fly',
        angle: Math.random() * Math.PI * 2,
        radius: Math.random() * Math.PI * 2,
      });
    }

    /** Ambiance de la rareté après la révélation. */
    const spawnAmbient = () => {
      if (theme === 'lucioles') {
        spawnFly();
        return;
      }
      if (theme === 'etoiles') {
        // étoile qui s'allume, scintille sur place puis s'éteint
        sparks.push({
          x: Math.random() * width,
          y: Math.random() * height * 0.85,
          vx: 0,
          vy: -6,
          life: 0,
          max: 1.6 + Math.random() * 2.2,
          size: 3 + Math.random() * 6,
          color: pick(),
          kind: 'shape',
          angle: 0,
          radius: 0,
          shape: 'etoile',
          rot: Math.random() < 0.5 ? 0 : Math.PI / 4,
          spin: 0,
          still: true,
        });
        return;
      }
      // feuilles qui tombent en virevoltant, pétales qui volent en diagonale
      const petals = theme === 'petales';
      sparks.push({
        x: petals ? -20 + Math.random() * width * 0.9 : Math.random() * width,
        y: -20,
        vx: petals ? 30 + Math.random() * 50 : (Math.random() - 0.5) * 30,
        vy: petals ? 50 + Math.random() * 40 : 45 + Math.random() * 45,
        life: 0,
        max: 9,
        size: (petals ? 5 : 6) + Math.random() * 5,
        color: pick(),
        kind: 'shape',
        angle: Math.random() * Math.PI * 2,
        radius: 0,
        shape: petals ? 'petale' : 'feuille',
        rot: Math.random() * Math.PI * 2,
        spin: (Math.random() - 0.5) * 3,
      });
    };

    const spawnEmber = () => {
      sparks.push({
        x: width / 2 + (Math.random() - 0.5) * width * 0.7,
        y: height + 10,
        vx: (Math.random() - 0.5) * 20,
        vy: -(40 + Math.random() * 90),
        life: 0,
        max: 3 + Math.random() * 3,
        size: 1 + Math.random() * 2.4,
        color: pick(),
        kind: 'ember',
        angle: Math.random() * Math.PI * 2,
        radius: 0,
      });
    };

    // rythme de l'ambiance, par seconde
    const AMBIENT_RATE: Record<RevealTheme, number> = { lucioles: 7, feuilles: 6, etoiles: 9, petales: 7 };

    const step = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const s = state.current;
      const cx = width / 2;
      const cy = height / 2;
      ctx.clearRect(0, 0, width, height);
      ctx.globalCompositeOperation = 'lighter';

      const charging = s.phase === 'charge';
      const t = (now - s.start) / 1000;
      if (charging) {
        // de plus en plus d'étincelles aspirées à mesure que la révélation approche
        const rate = (30 + Math.min(t, 4) * 45) * intensity;
        for (let i = 0; i < rate * dt; i++) spawnIn();
        // cœur d'énergie qui grossit et palpite
        const core = (18 + Math.min(t, 4) * 12) * (1 + Math.sin(t * 9) * 0.08) * (0.8 + intensity * 0.2);
        const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, core * 4);
        glow.addColorStop(0, 'rgba(255,255,255,0.95)');
        glow.addColorStop(0.18, colors[0]);
        glow.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = glow;
        ctx.globalAlpha = 0.85;
        ctx.beginPath();
        ctx.arc(cx, cy, core * 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      } else {
        if (!exploded) {
          exploded = true;
          explode(cx, cy);
        }
        const since = (now - s.burstAt) / 1000;
        if (since > 0.4) {
          for (let i = 0; i < 6 * intensity * dt; i++) spawnEmber();
          // l'ambiance s'installe en douceur
          const ramp = Math.min(1, (since - 0.4) / 1.5);
          for (let i = 0; i < AMBIENT_RATE[theme] * intensity * ramp * dt; i++) spawnAmbient();
        }
      }

      for (let i = sparks.length - 1; i >= 0; i--) {
        const p = sparks[i];
        p.life += dt;
        if (p.life >= p.max || p.y > height + 40 || p.x > width + 40) {
          sparks.splice(i, 1);
          continue;
        }
        const k = p.life / p.max;
        let px: number;
        let py: number;
        let tail = 0;
        if (p.kind === 'in') {
          // spirale vers le centre, qui accélère
          const ease = k * k;
          const r = p.radius * (1 - ease);
          const a = p.angle + ease * 2.4;
          px = cx + Math.cos(a) * r;
          py = cy + Math.sin(a) * r;
          if (!charging) {
            // l'explosion surprend les étincelles en route : elles repartent vers l'extérieur
            p.kind = 'out';
            p.x = px;
            p.y = py;
            p.vx = Math.cos(a) * 600;
            p.vy = Math.sin(a) * 600;
            p.life = 0;
            p.max = 0.6;
          }
          tail = 10 * ease;
          ctx.globalAlpha = Math.min(1, k * 3) * 0.9;
          ctx.strokeStyle = p.color;
          ctx.lineWidth = p.size;
          ctx.beginPath();
          ctx.moveTo(px, py);
          ctx.lineTo(cx + Math.cos(a - 0.05) * (r + tail * 3), cy + Math.sin(a - 0.05) * (r + tail * 3));
          ctx.stroke();
          continue;
        }
        if (p.kind === 'out') {
          p.vx *= Math.pow(0.12, dt);
          p.vy = p.vy * Math.pow(0.12, dt) + 140 * dt;
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          const speed = Math.hypot(p.vx, p.vy);
          ctx.globalAlpha = (1 - k) * 0.95;
          ctx.strokeStyle = p.color;
          ctx.lineWidth = p.size;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x - (p.vx / (speed || 1)) * Math.min(28, speed * 0.04), p.y - (p.vy / (speed || 1)) * Math.min(28, speed * 0.04));
          ctx.stroke();
          continue;
        }
        if (p.kind === 'fly') {
          // vol hésitant : la direction tourne doucement, la vitesse de la gerbe s'amortit
          p.angle += (Math.sin(p.life * 1.7 + p.radius) * 1.6) * dt;
          p.vx = p.vx * Math.pow(0.2, dt) + Math.cos(p.angle) * 26 * dt * 3;
          p.vy = p.vy * Math.pow(0.2, dt) + Math.sin(p.angle) * 26 * dt * 3;
          p.x += p.vx * dt + Math.cos(p.angle) * 18 * dt;
          p.y += p.vy * dt + Math.sin(p.angle) * 14 * dt - 6 * dt;
          const blink = 0.35 + 0.65 * Math.max(0, Math.sin(p.life * 2.6 + p.radius));
          const alpha = Math.min(1, p.life * 2, (p.max - p.life) * 1.5) * blink;
          const halo = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 10);
          halo.addColorStop(0, p.color);
          halo.addColorStop(0.25, p.color);
          halo.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.globalAlpha = alpha * 0.5;
          ctx.fillStyle = halo;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * 10, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = alpha;
          ctx.fillStyle = '#fffbe8';
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * 0.8, 0, Math.PI * 2);
          ctx.fill();
          continue;
        }
        if (p.kind === 'shape' && p.shape) {
          if (p.still) {
            // étoile qui scintille sur place, en montant à peine
            p.y += p.vy * dt;
            const twinkle = Math.sin(k * Math.PI) * (0.75 + Math.sin(p.life * 14) * 0.25);
            ctx.globalAlpha = twinkle;
            ctx.fillStyle = p.color;
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(p.rot ?? 0);
            drawShape(ctx, 'etoile', p.size * (0.7 + twinkle * 0.3));
            ctx.restore();
            continue;
          }
          // feuille, pétale ou étoile emportés par la gerbe, puis portés par l'air : la vitesse rejoint celle d'une
          // chute lente (en diagonale pour les pétales), avec balancement et rotation
          const settle = Math.pow(0.3, dt);
          const fallX = p.shape === 'petale' ? 40 : 0;
          const fallY = p.shape === 'etoile' ? 22 : p.shape === 'petale' ? 55 : 62;
          p.vx = fallX + (p.vx - fallX) * settle;
          p.vy = fallY + (p.vy - fallY) * settle;
          p.angle += dt * 2.2;
          p.x += (p.vx + Math.sin(p.angle) * 26) * dt;
          p.y += p.vy * dt;
          p.rot = (p.rot ?? 0) + (p.spin ?? 0) * dt;
          const fade = Math.min(1, p.life * 3, (p.max - p.life) * 1.2);
          // les feuilles et les pétales sont opaques ; les étoiles brillent
          ctx.globalCompositeOperation = p.shape === 'etoile' ? 'lighter' : 'source-over';
          ctx.globalAlpha = fade * (p.shape === 'etoile' ? 0.95 : 0.88);
          ctx.fillStyle = p.color;
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot ?? 0);
          // la forme se retourne en tombant (elle s'aplatit puis revient)
          if (p.shape !== 'etoile') ctx.scale(1, 0.35 + Math.abs(Math.cos(p.angle * 1.3)) * 0.65);
          drawShape(ctx, p.shape, p.size);
          ctx.restore();
          ctx.globalCompositeOperation = 'lighter';
          continue;
        }
        // braise qui monte en ondulant et scintille
        p.angle += dt * 2;
        p.x += (p.vx + Math.sin(p.angle) * 18) * dt;
        p.y += p.vy * dt;
        const twinkle = 0.55 + Math.sin(p.life * 8 + p.angle) * 0.45;
        ctx.globalAlpha = Math.sin(k * Math.PI) * twinkle * 0.8;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
      frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', resize);
    };
  }, [colors, intensity, theme]);

  return <canvas ref={canvas} className="reveal-fx" aria-hidden="true" />;
}
