// Saisons du jeu : un décor et des musiques de fête, aux mêmes dates chaque année (heure du joueur).
// Halloween, du 20 au 31 octobre : citrouilles, toiles d'araignée et cempasúchil dans l'interface, et la radio passe
// ses trois morceaux d'Halloween.
// Le Jour des morts (1er–7 novembre 2026 : calaveras, bougies, pan de muerto, monarques, musique mexicaine) est retiré :
// ses décors ne reviennent plus, mais ses couleurs (rose, turquoise, nuit indigo et magenta) sont restées celles du jeu
// en dehors des fêtes (voir App.tsx).
// Noël, du 1er décembre au 6 janvier (avec la Série 3 · Hiver) : la neige tombe, une guirlande lumineuse sous la barre
// du haut, des sapins décorés et des cadeaux dans les coins, des boules de Noël et du houx dans le ciel des en-têtes,
// et le calendrier de l'Avent sur l'accueil du 1er au 24 décembre (voir engine/avent.ts).

import { earlyAccess } from './series';

export type Season = 'halloween' | 'muertos' | 'noel';

/**
 * Aperçu d'une fête avant sa date, dans la version de développement et sur la page d'aperçu seulement
 * (`?saison=noel` ou `?saison=halloween` dans l'adresse) ; jamais sur le site public.
 */
function preview(): Season | null {
  if (!earlyAccess() || typeof location === 'undefined') return null;
  const value = new URLSearchParams(location.search).get('saison');
  return value === 'noel' || value === 'halloween' ? value : null;
}

/** La fête en cours, ou null hors saison. */
export function seasonAt(now: number = Date.now()): Season | null {
  const forced = preview();
  if (forced) return forced;
  const date = new Date(now);
  const month = date.getMonth();
  const day = date.getDate();
  if (month === 9 && day >= 20) return 'halloween';
  if (month === 11 || (month === 0 && day <= 6)) return 'noel';
  return null;
}

/** Est-ce la saison d'Halloween ? */
export function isHalloween(now: number = Date.now()): boolean {
  return seasonAt(now) === 'halloween';
}
