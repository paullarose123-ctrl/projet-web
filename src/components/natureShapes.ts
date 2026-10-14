// Petites formes de la nature dessinées dans un canvas, centrées sur l'origine : feuille, pétale, étoile.
// Utilisées par les effets de révélation (RevealFx) et les confettis des grosses cartes.

export type NatureShape = 'feuille' | 'petale' | 'etoile';

/** Feuille en amande, avec sa nervure centrale. */
function leaf(ctx: CanvasRenderingContext2D, size: number) {
  ctx.beginPath();
  ctx.moveTo(-size, 0);
  ctx.quadraticCurveTo(0, -size * 0.62, size, 0);
  ctx.quadraticCurveTo(0, size * 0.62, -size, 0);
  ctx.fill();
  ctx.globalAlpha *= 0.45;
  ctx.strokeStyle = 'rgba(40, 20, 0, 0.6)';
  ctx.lineWidth = Math.max(0.6, size * 0.09);
  ctx.beginPath();
  ctx.moveTo(-size * 1.2, 0);
  ctx.lineTo(size * 0.8, 0);
  ctx.stroke();
}

/** Pétale arrondi, un peu échancré au bout. */
function petal(ctx: CanvasRenderingContext2D, size: number) {
  ctx.beginPath();
  ctx.moveTo(-size, 0);
  ctx.bezierCurveTo(-size * 0.6, -size * 0.75, size * 0.7, -size * 0.7, size, -size * 0.12);
  ctx.lineTo(size * 0.82, 0);
  ctx.lineTo(size, size * 0.12);
  ctx.bezierCurveTo(size * 0.7, size * 0.7, -size * 0.6, size * 0.75, -size, 0);
  ctx.fill();
}

/** Étoile à quatre branches fines, comme un scintillement. */
function star(ctx: CanvasRenderingContext2D, size: number) {
  const w = size * 0.24;
  ctx.beginPath();
  ctx.moveTo(0, -size);
  ctx.quadraticCurveTo(w * 0.3, -w * 0.3, size, 0);
  ctx.quadraticCurveTo(w * 0.3, w * 0.3, 0, size);
  ctx.quadraticCurveTo(-w * 0.3, w * 0.3, -size, 0);
  ctx.quadraticCurveTo(-w * 0.3, -w * 0.3, 0, -size);
  ctx.fill();
}

/** Dessine une forme (couleur et transparence déjà choisies par l'appelant). */
export function drawShape(ctx: CanvasRenderingContext2D, shape: NatureShape, size: number) {
  if (shape === 'feuille') leaf(ctx, size);
  else if (shape === 'petale') petal(ctx, size);
  else star(ctx, size);
}
