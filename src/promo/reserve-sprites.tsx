import { useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import '../styles/fonts.css';
import '../styles/base.css';
import { ATHLETES } from '../data/athletes';
import { rarityOf } from '../engine/cards';
import { DEFAULTS_FOR_SHEET, SPRITE_TYPES, blit, spriteForAthlete, spriteOf, type Sprite } from '../art/reserve-sprites';

// Planche des animaux de la Réserve (page de développement promo/reserve-sprites.html) : les silhouettes par type,
// puis les espèces les plus connues à leurs couleurs.

const SCALE = 4;

function Pixel({ sprite }: { sprite: Sprite }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const w = Math.max(...sprite.rows.map((r) => r.length)) + 4;
  const h = sprite.rows.length + 3;
  useEffect(() => {
    const c = ref.current!.getContext('2d')!;
    c.clearRect(0, 0, w, h);
    blit(c, sprite, 2, 1, { shadow: true });
  }, [sprite, w, h]);
  return <canvas ref={ref} width={w} height={h} style={{ width: w * SCALE, height: h * SCALE, imageRendering: 'pixelated' }} />;
}

const cell: React.CSSProperties = {
  display: 'grid',
  justifyItems: 'center',
  alignContent: 'end',
  gap: 6,
  padding: '12px 6px 10px',
  borderRadius: 12,
  background: 'linear-gradient(180deg, #3d6f3d, #2f5a34)',
  border: '1px solid rgba(232,222,196,0.15)',
  fontSize: 11.5,
  fontWeight: 600,
  textAlign: 'center',
  minHeight: 110,
};

function Sheet() {
  const famous = ATHLETES.filter((a) => !a.habitat && !a.id.startsWith('mx-') && rarityOf(a).id !== 'icone')
    .sort((a, b) => b.fame - a.fame)
    .slice(0, 80);
  return (
    <div style={{ padding: 28, width: 1100, boxSizing: 'border-box', fontFamily: 'var(--font-body)', color: 'var(--text)' }}>
      <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 400, margin: '0 0 4px' }}>Les animaux de la Réserve</h1>
      <p style={{ margin: '0 0 18px', color: 'var(--text-dim)' }}>Les {SPRITE_TYPES.length} silhouettes, recolorées pour chaque espèce.</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 10 }}>
        {SPRITE_TYPES.map((t) => (
          <div key={t} style={cell}>
            <Pixel sprite={spriteOf({ type: t, ...DEFAULTS_FOR_SHEET[t] })} />
            {t}
          </div>
        ))}
      </div>
      <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 400, margin: '28px 0 12px' }}>Les 80 plus connus</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 10 }}>
        {famous.map((a) => (
          <div key={a.id} style={cell}>
            <Pixel sprite={spriteForAthlete(a)} />
            {`${a.first} ${a.last}`.trim()}
          </div>
        ))}
      </div>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(<Sheet />);
