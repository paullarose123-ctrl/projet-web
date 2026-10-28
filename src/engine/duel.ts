import type { Athlete, CardFace } from './types';
import { ATHLETES_BY_ID } from '../data/athletes';
import { releasedAthletes } from './series';
import { MESURES, formatLongevite, formatPoids, formatTaille } from '../data/mesures';
import { CHIENS_DANS_LE_MONDE, POPULATIONS, formatPopulation } from '../data/populations';
import { canBePrime, isHabitat } from './cards';
import { CONTINENTS_MULTIPLES, type Continent } from '../data/repartition';
import { ENCYCLOPEDIE, REGIMES, RYTHMES, UICN, type Encyclo, type Uicn } from '../data/encyclopedie';
import { makeUid, pick, shuffle, type Rng } from './random';

// Duel de records : un jeu de culture générale sur les animaux, avec leurs vraies mesures.
// Un duel se joue en 5 manches ; chaque manche est une question tirée au sort : un record (le plus lourd, le plus
// petit, le plus menacé…) ou une question oui/non (« Vit en Afrique ? », « Pond des œufs ? », « Sait voler ? »,
// « Plus lourd qu'un humain ? »). Les questions sont rangées par thème (poids, régime, rythme de vie…) : un duel
// pioche cinq thèmes différents, avec au plus trois questions oui/non.
// Chaque joueur envoie un de ses 5 animaux, pas encore joué, sans voir ses mesures : il faut savoir.
// La vraie mesure la plus forte (ou la plus faible, selon le record) gagne ; pour une question, un « oui » bat un « non ».
// Les réponses viennent des mesures des cartes (data/mesures.ts), des populations, de la répartition et de
// l'encyclopédie des espèces (data/encyclopedie.ts), celle des fiches « En savoir plus ».

export const TEAM_SIZE = 5;
export const ROUNDS = 5;

export type RecordId =
  | 'lourd'
  | 'leger'
  | 'plus-lourd-qu-un-humain'
  | 'moins-d-un-kilo'
  | 'grand'
  | 'petit'
  | 'plus-grand-qu-un-humain'
  | 'vieux'
  | 'ephemere'
  | 'plus-de-20-ans'
  | 'nombreux'
  | 'rare'
  | 'plus-d-un-million'
  | 'menace'
  | 'menacee'
  | 'afrique'
  | 'asie'
  | 'amerique'
  | 'europe'
  | 'oceanie'
  | 'plusieurs-continents'
  | 'mammifere'
  | 'oiseau'
  | 'reptile'
  | 'poisson'
  | 'amphibien'
  | 'insecte'
  | 'carnivore'
  | 'herbivore'
  | 'omnivore'
  | 'insectivore'
  | 'piscivore'
  | 'nocturne'
  | 'diurne'
  | 'solitaire'
  | 'oeufs'
  | 'vole';

/** Thèmes des questions : un duel n'en pose jamais deux du même thème. */
export type Theme = 'poids' | 'taille' | 'longevite' | 'population' | 'menaces' | 'continent' | 'classe' | 'regime' | 'rythme' | 'vie-sociale' | 'petits' | 'vol';

export const THEMES: Record<Theme, string> = {
  poids: 'Poids',
  taille: 'Taille',
  longevite: 'Longévité',
  population: 'Population',
  menaces: 'Menaces',
  continent: 'Continents',
  classe: 'Classe',
  regime: 'Régime',
  rythme: 'Rythme de vie',
  'vie-sociale': 'Vie sociale',
  petits: 'Naissance',
  vol: 'Vol',
};

export interface RecordDef {
  id: RecordId;
  theme: Theme;
  name: string;
  desc: string;
  /** le plus grand chiffre gagne (max) ou le plus petit (min) */
  best: 'max' | 'min';
  /** question oui/non (valeur 1 ou 0) plutôt qu'un record chiffré */
  question?: boolean;
  value: (athlete: Athlete) => number | null;
  format: (value: number, athlete: Athlete) => string;
}

const extinct = (a: Athlete) => !!a.retired;

/** Individus encore vivants : 0 pour une espèce éteinte, les chiens du monde pour une race de chien. */
function population(a: Athlete): number | null {
  if (extinct(a)) return 0;
  if (a.race) return CHIENS_DANS_LE_MONDE;
  return POPULATIONS[a.id] ?? null;
}

const poids = (a: Athlete) => MESURES[a.id]?.[0] ?? null;
const taille = (a: Athlete) => MESURES[a.id]?.[1] ?? null;
const formatPop = (n: number, a: Athlete) => (n === 0 && extinct(a) ? 'Éteint' : a.race ? `${formatPopulation(n)} (tous les chiens)` : formatPopulation(n));

// ───── continents et classes, pour les questions oui/non ─────

/**
 * Continent du pays emblématique de l'espèce (la Russie compte pour l'Asie : ses espèces sont sibériennes).
 * Les espèces de plusieurs continents sont dans src/data/repartition.ts.
 */
const CONTINENT: Record<string, Continent> = Object.fromEntries(
  (
    [
      ['afrique', 'BW CD CG CM DZ EG ET GA GH KE KM LR MA MG MU NA RW SC SD SO TZ ZA'],
      ['asie', 'BD CN ID IN IR JP KZ LK MN MY NP PH SA SY TH TW VN RU'],
      ['europe', 'BE CH DE ES FI FR GB GB-ENG GB-SCT GB-WLS GR HR IE IS IT NL NO PL RO SI SE'],
      ['amerique', 'AR BO BR CA CL CO CR CU EC GT JM MX PE US GL'],
      ['oceanie', 'AU FJ NZ PG'],
    ] as Array<[Continent, string]>
  ).flatMap(([continent, codes]) => codes.split(' ').map((code) => [code, continent])),
);

type Classe = 'mammifere' | 'oiseau' | 'reptile' | 'poisson' | 'amphibien' | 'insecte' | 'autre';

const CLASSE_DES_FAMILLES: Partial<Record<Athlete['sport'], Classe>> = {
  felins: 'mammifere', canides: 'mammifere', ours: 'mammifere', primates: 'mammifere', geants: 'mammifere',
  ongules: 'mammifere', petits: 'mammifere', marsupiaux: 'mammifere', marins: 'mammifere',
  requins: 'poisson', poissons: 'poisson', rapaces: 'oiseau', oiseaux: 'oiseau', reptiles: 'reptile',
  amphibiens: 'amphibien', insectes: 'insecte',
};

/** Exceptions : les animaux de la ferme qui ne sont pas des mammifères, les araignées et les mille-pattes des insectes. */
const CLASSE_A_PART: Record<string, Classe> = {
  poule: 'oiseau', canard: 'oiseau', oie: 'oiseau', dindon: 'oiseau', pigeon: 'oiseau', perruche: 'oiseau',
  'poisson-rouge': 'poisson', escargot: 'autre', 'ver-a-soie': 'insecte',
  mygale: 'autre', 'mx-mygale': 'autre', scorpion: 'autre', 'veuve-noire': 'autre', epeire: 'autre', 'araignee-paon': 'autre',
  'mille-pattes': 'autre', 'scorpion-de-durango': 'autre', 'mygale-a-pattes-de-feu': 'autre',
};

export function classeOf(a: Athlete): Classe {
  if (CLASSE_A_PART[a.id]) return CLASSE_A_PART[a.id];
  if (a.sport === 'ferme') return 'mammifere';
  return CLASSE_DES_FAMILLES[a.sport] ?? 'autre';
}

const yesNo = (v: number) => (v ? 'Oui' : 'Non');
const continentQuestion = (id: Continent, where: string): RecordDef => ({
  id,
  theme: 'continent',
  name: `Vit ${where}`,
  desc: `L’animal vit-il ${where} (à l’état sauvage, ou élevé partout pour un animal domestique) ? Oui bat non.`,
  best: 'max',
  question: true,
  value: (a) => (continentsOf(a).includes(id) ? 1 : 0),
  format: yesNo,
});
const classeQuestion = (id: Exclude<Classe, 'autre'>, name: string, precision = ''): RecordDef => ({
  id,
  theme: 'classe',
  name: `Est ${name}`,
  desc: `L’animal est-il ${name} ?${precision} Oui bat non.`,
  best: 'max',
  question: true,
  value: (a) => (classeOf(a) === id ? 1 : 0),
  format: yesNo,
});

/** Les continents où vit l'espèce : celui de son pays, et les autres pour une espèce de plusieurs continents. */
function continentsOf(a: Athlete): Continent[] {
  return [...new Set([...(CONTINENT[a.country] ? [CONTINENT[a.country]] : []), ...(CONTINENTS_MULTIPLES[a.id] ?? [])])];
}

/** Question oui/non sur une mesure : « Plus lourd qu'un humain ? » ; la réponse montre la vraie mesure. */
const seuil = (
  id: RecordId,
  theme: Theme,
  name: string,
  desc: string,
  measure: (a: Athlete) => number | null,
  test: (v: number) => boolean,
  show: (v: number, a: Athlete) => string,
): RecordDef => ({
  id,
  theme,
  name,
  desc: `${desc} Oui bat non.`,
  best: 'max',
  question: true,
  value: (a) => {
    const v = measure(a);
    return v === null ? null : test(v) ? 1 : 0;
  },
  format: (v, a) => `${yesNo(v)} · ${show(measure(a) ?? 0, a)}`,
});

/** Question oui/non tirée de la fiche encyclopédique ; la réponse rappelle ce que dit la fiche. */
const fiche = (
  id: RecordId,
  theme: Theme,
  name: string,
  desc: string,
  test: (e: Encyclo, a: Athlete) => boolean,
  show?: (e: Encyclo) => string,
): RecordDef => ({
  id,
  theme,
  name,
  desc: `${desc} Oui bat non.`,
  best: 'max',
  question: true,
  value: (a) => {
    const e = ENCYCLOPEDIE[a.id];
    return e ? (test(e, a) ? 1 : 0) : null;
  },
  format: (v, a) => {
    const e = ENCYCLOPEDIE[a.id];
    return show && e ? `${yesNo(v)} · ${show(e)}` : yesNo(v);
  },
});

// ───── menaces : la Liste rouge de l'UICN ─────

/** Rang sur la Liste rouge, de 1 (préoccupation mineure) à 7 (éteinte) ; 0 pour un animal domestique ou non évalué. */
const RANG_UICN: Record<Uicn, number> = { DOM: 0, NE: 0, DD: 0, GRP: 0, LC: 1, NT: 2, VU: 3, EN: 4, CR: 5, EW: 6, EX: 7 };
const statut = (a: Athlete): Uicn | null => ENCYCLOPEDIE[a.id]?.uicn ?? (a.retired ? 'EX' : null);

// ───── naissance et vol ─────

/** Pond-il des œufs ? Ce que la fiche ne dit pas en toutes lettres (insectes, mammifères sans le mot « gestation »…). */
const PONTE_A_PART: Record<string, boolean> = {
  chevreuil: false, blaireau: false, melomys: false, numbat: false, salamandre: false, scorpion: false, 'crotale-du-mexique': false,
  // le requin-baleine garde ses œufs dans son ventre jusqu'à l'éclosion
  'requin-baleine': false, 'mx-requin-baleine': false,
  physalie: false, paradisier: true, cecilie: true, meduse: true, anemone: true,
  fourmi: true, 'fourmi-a-escamoles': true, paraponera: true, frelon: true, 'frelon-geant': true, bourdon: true, guepe: true, melipone: true,
  'dynaste-hercule': true, lucane: true, luciole: true, cigale: true, goliath: true,
};
function pondDesOeufs(e: Encyclo, a: Athlete): boolean {
  return PONTE_A_PART[a.id] ?? (/ponte|pond|œuf|incubation|couv/i.test(e.petits) && !/gestation/i.test(e.petits));
}

/** Oiseaux qui ne volent pas ; et parmi les autres animaux, ceux qui volent vraiment (planer ne compte pas). */
const OISEAUX_COUREURS = new Set(['manchot-empereur', 'autruche', 'autruche-d-arabie', 'kiwi', 'casoar', 'emeu', 'emeu-de-king-island']);
const VOLANTS = new Set([
  'vampire', 'pipistrelle', 'chauve-souris-des-agaves',
  'abeille', 'monarque', 'mx-monarque', 'coccinelle', 'moustique', 'dynaste-hercule', 'lucane', 'libellule', 'luciole', 'cigale',
  'frelon', 'frelon-geant', 'criquet-pelerin', 'bourdon', 'morpho', 'guepe', 'goliath', 'melipone', 'bousier', 'mante-religieuse',
  'baronia', 'haricot-sauteur', 'ver-de-maguey',
]);
const vole = (a: Athlete) => (classeOf(a) === 'oiseau' ? !OISEAUX_COUREURS.has(a.id) : VOLANTS.has(a.id));

export const RECORDS: Record<RecordId, RecordDef> = {
  // poids
  lourd: { id: 'lourd', theme: 'poids', name: 'Le plus lourd', desc: 'Le poids d’un adulte : le plus lourd gagne.', best: 'max', value: poids, format: (v) => formatPoids(v) },
  leger: { id: 'leger', theme: 'poids', name: 'Le plus léger', desc: 'Le poids d’un adulte : le plus léger gagne.', best: 'min', value: poids, format: (v) => formatPoids(v) },
  'plus-lourd-qu-un-humain': seuil('plus-lourd-qu-un-humain', 'poids', 'Plus lourd qu’un humain', 'Un adulte pèse-t-il plus de 70 kg ?', poids, (v) => v > 70, (v) => formatPoids(v)),
  'moins-d-un-kilo': seuil('moins-d-un-kilo', 'poids', 'Pèse moins d’un kilo', 'Un adulte pèse-t-il moins d’un kilo ?', poids, (v) => v < 1, (v) => formatPoids(v)),
  // taille
  grand: {
    id: 'grand',
    theme: 'taille',
    name: 'Le plus grand',
    desc: 'Sa plus grande mesure (longueur, hauteur ou envergure) : le plus grand gagne.',
    best: 'max',
    value: taille,
    format: (v) => formatTaille(v),
  },
  petit: {
    id: 'petit',
    theme: 'taille',
    name: 'Le plus petit',
    desc: 'Sa plus grande mesure (longueur, hauteur ou envergure) : le plus petit gagne.',
    best: 'min',
    value: taille,
    format: (v) => formatTaille(v),
  },
  'plus-grand-qu-un-humain': seuil(
    'plus-grand-qu-un-humain',
    'taille',
    'Plus grand qu’un humain',
    'Sa plus grande mesure (longueur, hauteur ou envergure) dépasse-t-elle 1,75 m ?',
    taille,
    (v) => v > 1.75,
    (v) => formatTaille(v),
  ),
  // longévité
  vieux: {
    id: 'vieux',
    theme: 'longevite',
    name: 'Vit le plus longtemps',
    desc: 'La longévité dans la nature : celui qui vit le plus vieux gagne.',
    best: 'max',
    value: (a) => MESURES[a.id]?.[3] ?? null,
    format: (v) => formatLongevite(v),
  },
  ephemere: {
    id: 'ephemere',
    theme: 'longevite',
    name: 'Vit le moins longtemps',
    desc: 'La longévité dans la nature : celui qui vit le moins longtemps gagne.',
    best: 'min',
    value: (a) => MESURES[a.id]?.[3] ?? null,
    format: (v) => formatLongevite(v),
  },
  'plus-de-20-ans': seuil(
    'plus-de-20-ans',
    'longevite',
    'Vit plus de 20 ans',
    'Sa longévité dans la nature dépasse-t-elle 20 ans ?',
    (a) => MESURES[a.id]?.[3] ?? null,
    (v) => v > 20,
    (v) => formatLongevite(v),
  ),
  // population
  nombreux: {
    id: 'nombreux',
    theme: 'population',
    name: 'Le plus nombreux',
    desc: 'Le nombre d’individus encore vivants sur Terre : le plus nombreux gagne.',
    best: 'max',
    value: population,
    format: formatPop,
  },
  rare: {
    id: 'rare',
    theme: 'population',
    name: 'Le plus rare',
    desc: 'Le nombre d’individus encore vivants : le plus rare gagne. Une espèce éteinte n’en a plus aucun.',
    best: 'min',
    value: population,
    format: formatPop,
  },
  'plus-d-un-million': seuil(
    'plus-d-un-million',
    'population',
    'Plus d’un million sur Terre',
    'Reste-t-il plus d’un million d’individus vivants ?',
    population,
    (v) => v > 1_000_000,
    formatPop,
  ),
  // menaces
  menace: {
    id: 'menace',
    theme: 'menaces',
    name: 'Le plus menacé',
    desc: 'Sa catégorie sur la Liste rouge de l’UICN, de « préoccupation mineure » à « éteinte » : la plus grave gagne. Un animal domestique ou non évalué n’est pas sur l’échelle.',
    best: 'max',
    value: (a) => {
      const s = statut(a);
      return s ? RANG_UICN[s] : null;
    },
    format: (_, a) => UICN[statut(a) ?? 'NE'].label,
  },
  menacee: {
    id: 'menacee',
    theme: 'menaces',
    name: 'Est menacé',
    desc: 'L’espèce est-elle classée vulnérable, en danger ou en danger critique sur la Liste rouge de l’UICN ? Oui bat non.',
    best: 'max',
    question: true,
    value: (a) => {
      const s = statut(a);
      return s === null ? null : s === 'VU' || s === 'EN' || s === 'CR' ? 1 : 0;
    },
    format: (v, a) => `${yesNo(v)} · ${UICN[statut(a) ?? 'NE'].label}`,
  },
  // continents
  afrique: continentQuestion('afrique', 'en Afrique'),
  asie: continentQuestion('asie', 'en Asie'),
  amerique: continentQuestion('amerique', 'en Amérique'),
  europe: continentQuestion('europe', 'en Europe'),
  oceanie: continentQuestion('oceanie', 'en Océanie'),
  'plusieurs-continents': {
    id: 'plusieurs-continents',
    theme: 'continent',
    name: 'Vit sur plusieurs continents',
    desc: 'L’animal vit-il sur au moins deux continents (à l’état sauvage, ou élevé partout pour un animal domestique) ? Oui bat non.',
    best: 'max',
    question: true,
    value: (a) => (continentsOf(a).length >= 2 ? 1 : 0),
    format: (v, a) => `${yesNo(v)} · ${continentsOf(a).length} continent${continentsOf(a).length > 1 ? 's' : ''}`,
  },
  // classe
  mammifere: classeQuestion('mammifere', 'un mammifère'),
  oiseau: classeQuestion('oiseau', 'un oiseau'),
  reptile: classeQuestion('reptile', 'un reptile'),
  poisson: classeQuestion('poisson', 'un poisson', ' Les requins en sont, les dauphins et les baleines non.'),
  amphibien: classeQuestion('amphibien', 'un amphibien', ' Grenouilles, crapauds, salamandres, tritons…'),
  insecte: classeQuestion('insecte', 'un insecte', ' Six pattes : les araignées, les scorpions et les mille-pattes n’en sont pas.'),
  // régime
  carnivore: fiche(
    'carnivore',
    'regime',
    'Est carnivore',
    'Mange-t-il surtout d’autres animaux : viande, poissons ou charognes (les mangeurs d’insectes ne comptent pas) ?',
    (e) => e.regime === 'carnivore' || e.regime === 'piscivore' || e.regime === 'charognard',
    (e) => REGIMES[e.regime],
  ),
  herbivore: fiche(
    'herbivore',
    'regime',
    'Mange des plantes',
    'Est-il herbivore, mangeur de fruits ou buveur de nectar ?',
    (e) => e.regime === 'herbivore' || e.regime === 'frugivore' || e.regime === 'nectarivore',
    (e) => REGIMES[e.regime],
  ),
  omnivore: fiche('omnivore', 'regime', 'Mange de tout', 'Est-il omnivore, à la fois mangeur de plantes et d’animaux ?', (e) => e.regime === 'omnivore', (e) => REGIMES[e.regime]),
  insectivore: fiche('insectivore', 'regime', 'Mange des insectes', 'Se nourrit-il surtout d’insectes ?', (e) => e.regime === 'insectivore', (e) => REGIMES[e.regime]),
  piscivore: fiche('piscivore', 'regime', 'Mange du poisson', 'Se nourrit-il surtout de poissons ?', (e) => e.regime === 'piscivore', (e) => REGIMES[e.regime]),
  // rythme de vie
  nocturne: fiche(
    'nocturne',
    'rythme',
    'Actif la nuit',
    'Est-il actif la nuit (surtout la nuit, ou de jour comme de nuit) ? L’aube et le crépuscule ne comptent pas.',
    (e) => e.rythme === 'nuit' || e.rythme === 'jour-nuit',
    (e) => RYTHMES[e.rythme],
  ),
  diurne: fiche(
    'diurne',
    'rythme',
    'Actif le jour',
    'Est-il actif le jour (surtout le jour, ou de jour comme de nuit) ? L’aube et le crépuscule ne comptent pas.',
    (e) => e.rythme === 'jour' || e.rythme === 'jour-nuit',
    (e) => RYTHMES[e.rythme],
  ),
  // vie sociale, naissance, vol
  solitaire: fiche('solitaire', 'vie-sociale', 'Vit seul', 'Vit-il en solitaire, en dehors de la saison des amours et de l’élevage des petits ?', (e) => /^solitaire/i.test(e.social)),
  oeufs: fiche(
    'oeufs',
    'petits',
    'Pond des œufs',
    'Ses petits sortent-ils d’un œuf pondu ? Attention aux pièges : l’ornithorynque pond, certains serpents et requins non.',
    pondDesOeufs,
  ),
  vole: {
    id: 'vole',
    theme: 'vol',
    name: 'Sait voler',
    desc: 'Vole-t-il, même sur une courte distance (la poule vole un peu, l’autruche jamais) ? Planer ne compte pas : écureuil volant, poisson volant. Oui bat non.',
    best: 'max',
    question: true,
    value: (a) => (vole(a) ? 1 : 0),
    format: yesNo,
  },
};

export const RECORD_ORDER = Object.keys(RECORDS) as RecordId[];

/** Au plus trois questions oui/non par duel : elles finissent plus souvent à égalité que les records. */
export const MAX_QUESTIONS = 3;

/** Les questions d'un thème. */
export const RECORDS_BY_THEME = Object.fromEntries(
  (Object.keys(THEMES) as Theme[]).map((theme) => [theme, RECORD_ORDER.filter((id) => RECORDS[id].theme === theme)]),
) as Record<Theme, RecordId[]>;

/**
 * Les 5 manches d'un duel : cinq thèmes tirés au hasard, une question de chaque thème, dont au plus MAX_QUESTIONS
 * questions oui/non. Les thèmes de mesures (poids, taille, longévité, population, menaces) ont tous un record chiffré :
 * même après trois questions oui/non, il en reste assez pour finir le duel.
 */
export function drawRecords(rng: Rng): RecordId[] {
  const out: RecordId[] = [];
  let questions = 0;
  for (const theme of shuffle(rng, Object.keys(THEMES) as Theme[])) {
    if (out.length >= ROUNDS) break;
    const choices = RECORDS_BY_THEME[theme].filter((id) => questions < MAX_QUESTIONS || !RECORDS[id].question);
    if (!choices.length) continue;
    const id = pick(rng, choices);
    if (RECORDS[id].question) questions += 1;
    out.push(id);
  }
  return out;
}

export interface DuelCard extends CardFace {
  uid: string;
}

export interface DuelSide {
  name: string;
  cards: DuelCard[];
  used: number[];
  score: number;
}

export interface DuelRound {
  round: number;
  record: RecordId;
  me: number;
  opp: number;
  /** valeurs mesurées (null : inconnue, la carte perd la manche) */
  myValue: number | null;
  oppValue: number | null;
  winner: 'me' | 'opp' | 'draw';
}

export interface DuelState {
  id: string;
  /** distingue un duel d'un ancien match d'Arène dans les sauvegardes */
  kind: 'duel';
  /** pseudo de l'ami défié (son équipe est sa vitrine) ; absent pour un duel de la ligue */
  friend?: string;
  division: number;
  records: RecordId[];
  round: number;
  me: DuelSide;
  opp: DuelSide;
  log: DuelRound[];
  finished: boolean;
}

const RIVALS = [
  'Les Explorateurs du Vercors', 'Le Club des Marais', 'Les Naturalistes de la Brousse', 'Les Pisteurs des Steppes',
  'Les Plongeurs du Récif', 'Les Botanistes des Collines', 'Les Guetteurs du Grand Chêne', 'Les Veilleurs de la Lande',
  'Les Arpenteurs de la Banquise', 'Les Rangers des Mangroves', 'Les Curieux du Désert', 'Les Ornithologues des Falaises',
  'Les Herboristes des Cèdres', 'Les Grimpeurs de la Canopée', 'Les Sondeurs des Abysses', 'Les Gardes du Baobab',
];

/** Les animaux qui peuvent jouer un duel (pas les cartes Habitat). */
export function canDuel(athlete: Athlete): boolean {
  return !isHabitat(athlete);
}

/**
 * Chance que l'adversaire joue sa meilleure carte pour le record : 35 % en division 10, 95 % en division 1.
 * Le reste du temps, il joue au hasard.
 */
export function aiSkill(division: number): number {
  return Math.min(0.95, 0.35 + (10 - division) * (0.6 / 9));
}

export function createDuel(
  myCards: DuelCard[],
  division: number,
  rng: Rng,
  myName = 'Mon équipe',
  friend?: { pseudo: string; cards: CardFace[] },
): DuelState {
  // contre un ami : les animaux de sa vitrine, complétés au hasard s'il en a moins de 5
  const given = (friend?.cards ?? []).filter((c) => ATHLETES_BY_ID[c.athleteId] && canDuel(ATHLETES_BY_ID[c.athleteId])).slice(0, TEAM_SIZE);
  const taken = new Set(given.map((c) => c.athleteId));
  // adversaires tirés parmi les cartes déjà sorties (aucune carte d'une série à venir)
  const pool = releasedAthletes().filter((a) => canDuel(a) && !taken.has(a.id));
  const chosen = shuffle(rng, pool).slice(0, TEAM_SIZE - given.length);
  const oppCards = given.map((c) => ({ uid: makeUid('o'), athleteId: c.athleteId, variant: c.variant })).concat(chosen.map((athlete) => ({
    uid: makeUid('o'),
    athleteId: athlete.id,
    variant: division <= 3 && canBePrime(athlete) && rng() < 0.15 ? ('prime' as const) : ('base' as const),
  })));
  return {
    id: makeUid('duel'),
    kind: 'duel',
    ...(friend ? { friend: friend.pseudo } : {}),
    division,
    records: drawRecords(rng),
    round: 0,
    me: { name: myName, cards: myCards, used: [], score: 0 },
    opp: { name: friend?.pseudo ?? pick(rng, RIVALS), cards: oppCards, used: [], score: 0 },
    log: [],
    finished: false,
  };
}

/** Valeur d'une carte pour un record (null si la mesure n'est pas connue). */
export function recordValue(card: CardFace, record: RecordId): number | null {
  return RECORDS[record].value(ATHLETES_BY_ID[card.athleteId]);
}

/** Qui gagne entre deux valeurs : une mesure inconnue perd, deux inconnues font match nul. */
export function compare(record: RecordId, mine: number | null, theirs: number | null): 'me' | 'opp' | 'draw' {
  if (mine === null && theirs === null) return 'draw';
  if (mine === null) return 'opp';
  if (theirs === null) return 'me';
  if (mine === theirs) return 'draw';
  const better = RECORDS[record].best === 'max' ? mine > theirs : mine < theirs;
  return better ? 'me' : 'opp';
}

/** Choix de l'adversaire : sa meilleure carte pour le record (selon son niveau), sinon une carte au hasard. */
export function aiChoose(state: DuelState, rng: Rng): number {
  const record = state.records[state.round];
  const free = state.opp.cards.map((_, i) => i).filter((i) => !state.opp.used.includes(i));
  if (rng() >= aiSkill(state.division)) return pick(rng, free);
  const score = (i: number) => {
    const v = recordValue(state.opp.cards[i], record);
    if (v === null) return -Infinity;
    return RECORDS[record].best === 'max' ? v : -v;
  };
  return free.reduce((best, i) => (score(i) > score(best) ? i : best), free[0]);
}

export function playDuelRound(state: DuelState, myIndex: number, rng: Rng): { state: DuelState; log: DuelRound } {
  const record = state.records[state.round];
  const oppIndex = aiChoose(state, rng);
  const myValue = recordValue(state.me.cards[myIndex], record);
  const oppValue = recordValue(state.opp.cards[oppIndex], record);
  const winner = compare(record, myValue, oppValue);
  const log: DuelRound = { round: state.round, record, me: myIndex, opp: oppIndex, myValue, oppValue, winner };
  const round = state.round + 1;
  return {
    state: {
      ...state,
      round,
      me: { ...state.me, used: [...state.me.used, myIndex], score: state.me.score + (winner === 'me' ? 1 : 0) },
      opp: { ...state.opp, used: [...state.opp.used, oppIndex], score: state.opp.score + (winner === 'opp' ? 1 : 0) },
      log: [...state.log, log],
      finished: round >= ROUNDS,
    },
    log,
  };
}

export function duelResult(state: DuelState): 'win' | 'draw' | 'loss' {
  if (state.me.score > state.opp.score) return 'win';
  if (state.me.score < state.opp.score) return 'loss';
  return 'draw';
}

export function rewardFor(result: 'win' | 'draw' | 'loss', division: number): number {
  const scale = 1 + (10 - division) * 0.25;
  const base = result === 'win' ? 500 : result === 'draw' ? 200 : 80;
  return Math.round((base * scale) / 10) * 10;
}

/** Valeur affichée d'une carte pour un record (« 190 kg », « Éteint », « inconnu »). */
export function formatRecordValue(card: CardFace, record: RecordId, value = recordValue(card, record)): string {
  if (value === null) return 'inconnu';
  return RECORDS[record].format(value, ATHLETES_BY_ID[card.athleteId]);
}

/**
 * Équipe auto : cinq espèces différentes qui couvrent au mieux tous les records
 * (la plus lourde, la plus légère, la plus grande, la plus petite et celle qui vit le plus longtemps).
 */
export function autoTeamFrom(cards: DuelCard[], rng: Rng = Math.random, current: string[] = []): string[] {
  // un exemplaire par espèce, tirées au hasard
  const unique = new Map<string, DuelCard>();
  for (const card of cards) if (canDuel(ATHLETES_BY_ID[card.athleteId]) && !unique.has(card.athleteId)) unique.set(card.athleteId, card);
  const list = [...unique.values()];
  const draw = () => {
    const pool = list.slice();
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    return pool.slice(0, TEAM_SIZE).map((c) => c.uid);
  };
  // si la réserve le permet, jamais deux fois de suite exactement la même équipe
  const same = (team: string[]) => team.length === current.filter(Boolean).length && team.every((uid) => current.includes(uid));
  let team = draw();
  for (let tries = 0; tries < 12 && list.length > TEAM_SIZE && same(team); tries++) team = draw();
  return team;
}
