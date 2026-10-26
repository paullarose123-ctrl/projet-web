import type { SceneDef } from '../components/PackScene';

// Paysages du site, dans le même langage que les boosters : chaque écran a son affiche.

/** Fond de page : sous-bois de sapins sous un ciel de nuit, en tons sourds pour ne pas gêner la lecture. */
export const SITE_SCENE: SceneDef = {
  kind: 'foret',
  stars: true,
  palette: { sky: ['#0a1411', '#23402f'], sun: '#efe1b8', far: '#2b4a3a', near: '#08110d', accent: '#ffffff' },
};

/** Le même sous-bois pendant Halloween et le Jour des morts : ciel violet et grosse lune orange. */
export const SITE_SCENE_HALLOWEEN: SceneDef = {
  kind: 'foret',
  stars: true,
  palette: { sky: ['#110a20', '#3a1f46'], sun: '#ffb35c', far: '#2e2142', near: '#0a0712', accent: '#ffffff' },
};

/** Accueil (boosters gratuits) : sommets à l'aube et un aigle. */
export const HERO_SCENE: SceneDef = {
  kind: 'montagne',
  creature: 'aigle',
  palette: { sky: ['#1a2c4e', '#f4a06a'], sun: '#ffe7bd', far: '#8a8fb0', near: '#101528', accent: '#fdf2e6' },
};

/** Accueil pendant la saison d'Halloween : les mêmes sommets sous un ciel de nuit, une grosse lune orange. */
export const HERO_SCENE_HALLOWEEN: SceneDef = {
  kind: 'montagne',
  stars: true,
  palette: { sky: ['#120a24', '#7a2f4a'], sun: '#ffa94d', far: '#4b3463', near: '#0c0716', accent: '#b9a3d6' },
};

/** Bannières des écrans */
export const SCREEN_SCENES = {
  // collection : prairie au crépuscule, un lapin dans les fleurs
  collection: {
    kind: 'collines',
    creature: 'lapin',
    palette: { sky: ['#203a5c', '#f6b26b'], sun: '#fff0cf', far: '#7d9a6a', near: '#12200f', accent: '#ff8fb1' },
  },
  // marché : sous la surface d'un récif, un banc de poissons dans les rayons de lumière
  mercato: {
    kind: 'recif',
    creature: 'banc',
    palette: { sky: ['#6fe0ea', '#2470b0'], sun: '#f2feff', far: '#4aa6d6', near: '#0c3364', accent: '#ffd166' },
  },
  // arène : volcan en éruption et ptérosaures
  matchs: {
    kind: 'volcan',
    creature: 'pteros',
    palette: { sky: ['#2a0e1e', '#e2574c'], sun: '#ffd7a0', far: '#8a3a3e', near: '#160709', accent: '#ffb347' },
  },
  // profil : forêt au crépuscule, comme le dos des cartes
  profil: {
    kind: 'foret',
    palette: { sky: ['#14273f', '#f0a468'], sun: '#fff0cf', far: '#6b7f6a', near: '#0b170f', accent: '#ffffff' },
  },
  // boutique : aurore boréale
  boutique: {
    kind: 'aurore',
    palette: { sky: ['#070f1f', '#2a2266'], sun: '#f0eeff', far: '#3e3f86', near: '#070917', accent: '#5ff2c0', accent2: '#d27bff' },
  },
} satisfies Record<string, SceneDef>;
