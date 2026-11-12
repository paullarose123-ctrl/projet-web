import type { SceneDef } from '../components/PackScene';

// Décors du terrain de duel : un paysage par division de la Ligue des naturalistes, dans le monde de l'animal de son
// blason. Les tons montent avec la ligue : prairies et sous-bois en bas, banquise, récif et nuits d'aurore en haut.

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

/** Le décor du terrain pour une division. */
export function arenaScene(division: number): SceneDef {
  return ARENES[division] ?? ARENES[14];
}
