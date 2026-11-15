import type { SceneDef } from '../components/PackScene';

// Décors du terrain de duel : un paysage par division de la Ligue des naturalistes, dans le monde de l'animal de son
// blason. Les tons montent avec la ligue : prairies et sous-bois en bas, banquise, récif et nuits d'aurore en haut.
// Chaque match tire l'un de ces paysages ou l'un des nouveaux décors (matchArena), pour que le fond change d'un match à l'autre.

const ARENES: Record<number, SceneDef> = {
  // Hérisson de bronze : prairie au matin
  14: { kind: 'collines', creature: 'lapin', palette: { sky: ['#8fd3f2', '#fff0c8'], sun: '#fffbea', far: '#a9d48c', near: '#1d3d1f', accent: '#ff8fb1' } },
  // Renard de bronze : lisière de forêt en automne
  13: { kind: 'foret', palette: { sky: ['#ee8c4c', '#fde3ae'], sun: '#fff3d0', far: '#d98b5f', near: '#2a170f', accent: '#ffffff' } },
  // Loup d'argent : clair de lune sur la taïga
  12: { kind: 'nuit', creature: 'loup', palette: { sky: ['#0d1a3a', '#4c74ab'], sun: '#f1f6ff', far: '#3b5888', near: '#080f1f', accent: '#cfe0ff' } },
  // Gorille d'argent : forêt tropicale à l'aube
  11: { kind: 'jungle', creature: 'papillons', palette: { sky: ['#ff8aa1', '#ffd8a8'], sun: '#fff3dc', far: '#62b08b', near: '#07281b', accent: '#ffffff' } },
  // Guépard d'or : savane dorée
  10: { kind: 'savane', creature: 'girafes', palette: { sky: ['#ffad42', '#ffe8ae'], sun: '#fffbe8', far: '#d9a15c', near: '#3a2211', accent: '#ffffff' } },
  // Aigle d'or : sommets au couchant
  9: { kind: 'montagne', creature: 'aigle', palette: { sky: ['#f2737d', '#fbd486'], sun: '#fff4d4', far: '#c9788c', near: '#271322', accent: '#ffe8e0' } },
  // Ours de platine : aurore sur la banquise
  8: { kind: 'aurore', palette: { sky: ['#070f1f', '#1f3a66'], sun: '#f0f6ff', far: '#3e5f86', near: '#070917', accent: '#7ff7d6', accent2: '#8fb6ff' } },
  // Orque de platine : haute mer et dauphins
  7: { kind: 'ocean', creature: 'dauphins', palette: { sky: ['#62bdf0', '#e2f5ff'], sun: '#ffffff', far: '#4f99d8', near: '#0a2350', accent: '#ffffff' } },
  // Tigre de diamant : jungle de nuit et lucioles
  6: { kind: 'jungle', creature: 'lucioles', palette: { sky: ['#1a1240', '#5a3f9e'], sun: '#efe6ff', far: '#3a5a6e', near: '#060b12', accent: '#d9c9ff' } },
  // Requin de diamant : récif profond
  5: { kind: 'recif', creature: 'manta', palette: { sky: ['#7a6ee0', '#0a1f58'], sun: '#efeaff', far: '#4c48a8', near: '#050a26', accent: '#d5c8f4' } },
  // Éléphant de rubis : savane au crépuscule pourpre
  4: { kind: 'savane', creature: 'elephant', palette: { sky: ['#6b1638', '#f2919f'], sun: '#ffe3e6', far: '#a54a68', near: '#1e0710', accent: '#ffd0d8' } },
  // Crocodile de rubis : marais au soleil couchant
  3: { kind: 'marais', creature: 'flamants', palette: { sky: ['#4a0f2a', '#ff7f6e'], sun: '#ffe0c4', far: '#8a3448', near: '#14050b', accent: '#ffb3a8' } },
  // Lion légendaire : volcan et ciel de braise
  2: { kind: 'volcan', creature: 'pteros', palette: { sky: ['#2a0e1e', '#f6ad97'], sun: '#fff0d8', far: '#8a3a3e', near: '#160709', accent: '#ffb347' } },
  // Baleine bleue mythique : océan sous les étoiles
  1: { kind: 'ocean', creature: 'baleine', stars: true, palette: { sky: ['#040a26', '#2a5bb8'], sun: '#eaf3ff', far: '#1d3f8a', near: '#020617', accent: '#a9cdfb' } },
};

/** Le décor d'une division. */
export function arenaScene(division: number): SceneDef {
  return ARENES[division] ?? ARENES[14];
}

/** Nouveaux décors proposés pour les duels, en plus des paysages de la ligue. */
export const NOUVEAUX: Array<{ name: string; scene: SceneDef }> = [
  { name: 'Banquise au soleil de minuit', scene: { kind: 'banquise', creature: 'manchots', palette: { sky: ['#f4a3b9', '#ffe7d1'], sun: '#fff6e8', far: '#4c7fbf', near: '#0b1f3d', accent: '#f4fbff' } } },
  { name: 'Grand canyon au couchant', scene: { kind: 'canyon', creature: 'aigle', palette: { sky: ['#ff8f5a', '#ffe0ae'], sun: '#fff3d6', far: '#d27a52', near: '#3a1508', accent: '#ffd28a' } } },
  { name: 'Bambouseraie dans la brume', scene: { kind: 'bambou', creature: 'panda', palette: { sky: ['#bfe0bb', '#f6f1d6'], sun: '#ffab8f', far: '#7fb487', near: '#0f2a17', accent: '#ffffff' } } },
  { name: 'Chute d’eau tropicale', scene: { kind: 'cascade', palette: { sky: ['#5cbfee', '#dff6ff'], sun: '#ffffff', far: '#58a87c', near: '#062a1a', accent: '#eefaff' } } },
  { name: 'Abysses lumineuses', scene: { kind: 'abysses', creature: 'baudroie', palette: { sky: ['#0d2c5e', '#020617'], sun: '#d6fff6', far: '#1b3a6b', near: '#01040f', accent: '#7ff7e0', accent2: '#ff7aa8' } } },
  { name: 'Grotte aux cristaux', scene: { kind: 'grotte', creature: 'chauves-souris', palette: { sky: ['#1a1f3d', '#3d4278'], sun: '#efeaff', far: '#34376a', near: '#07071a', accent: '#b98cff', accent2: '#6ff0ff' } } },
  { name: 'Lac de montagne', scene: { kind: 'lac', creature: 'cerf', palette: { sky: ['#78c4f0', '#fff0cf'], sun: '#fffbe8', far: '#7a9cc4', near: '#0d2420', accent: '#ffffff' } } },
  { name: 'Forêt sous la neige', scene: { kind: 'neige', creature: 'renard', palette: { sky: ['#9db3dc', '#f4e4ee'], sun: '#fff6f0', far: '#8ea2c8', near: '#1a2440', accent: '#ffffff', accent2: '#ef7a32' } } },
  { name: 'Cerisiers en fleurs', scene: { kind: 'printemps', creature: 'papillons', palette: { sky: ['#ffc2d5', '#fff5e6'], sun: '#fffaf0', far: '#b7d49c', near: '#1f3320', accent: '#ff9ec2', accent2: '#ffe3ee' } } },
  { name: 'Désert de cactus', scene: { kind: 'desert', palette: { sky: ['#f2a65a', '#ffe9c2'], sun: '#fff8e0', far: '#d98a54', near: '#3a1a0c', accent: '#ffffff' } } },
  { name: 'Bush australien', scene: { kind: 'outback', creature: 'kangourou', palette: { sky: ['#ff7e4f', '#ffd9a0'], sun: '#fff4dc', far: '#c8643c', near: '#2b0f08', accent: '#ffffff' } } },
  { name: 'Lagon aux méduses', scene: { kind: 'recif', creature: 'meduses', palette: { sky: ['#2fb8d8', '#0a3a78'], sun: '#ffffff', far: '#2a7fb8', near: '#04163a', accent: '#ffb3e6' } } },
  { name: 'Banc de poissons', scene: { kind: 'recif', creature: 'banc', palette: { sky: ['#3fd0c9', '#0b4f7a'], sun: '#ffffff', far: '#2d9a9a', near: '#052a3a', accent: '#ffe27a' } } },
  { name: 'Cerf sous les étoiles', scene: { kind: 'nuit', creature: 'cerf', palette: { sky: ['#1b1440', '#7a5aa8'], sun: '#fff6e0', far: '#4b3f7e', near: '#0b0820', accent: '#e8dcff' } } },
];

const ALL = [...Object.values(ARENES), ...NOUVEAUX.map((n) => n.scene)];
const KEY = 'animalcards-arene';

/** Le décor d'un match : chaque duel tire l'un des paysages (ligue et nouveaux décors) d'après son identifiant, jamais le même que celui du
 *  match précédent. Le choix est retenu (dans le navigateur) : le décor reste le même pendant tout le match, même
 *  après un rechargement. */
export function matchArena(matchId: string): SceneDef {
  let saved: { id: string; index: number } | null = null;
  try {
    saved = JSON.parse(localStorage.getItem(KEY) ?? 'null');
  } catch {
    saved = null;
  }
  if (saved?.id === matchId && ALL[saved.index]) return ALL[saved.index];
  let h = 2166136261;
  for (let i = 0; i < matchId.length; i++) h = Math.imul(h ^ matchId.charCodeAt(i), 16777619);
  let index = (h >>> 0) % ALL.length;
  if (saved && index === saved.index) index = (index + 1) % ALL.length;
  try {
    localStorage.setItem(KEY, JSON.stringify({ id: matchId, index }));
  } catch {
    // stockage indisponible : le tirage reste celui de l'identifiant
  }
  return ALL[index];
}
