import type { RecordDef, RecordId } from './duel';

// La question d'une manche, telle qu'on l'annonce au joueur : une vraie question courte (« Qui est le plus lourd ? »),
// la règle qui départage (« Le plus lourd gagne », « Le OUI l'emporte ») et les précisions utiles, en petit.
// Le nom du record (« Le plus lourd ») reste le titre court du thème ; la description complète reste dans les règles.

export interface Ask {
  /** la question, courte, terminée par un point d'interrogation */
  question: string;
  /** ce qui gagne la manche */
  rule: string;
  /** précisions (ce qui compte, les pièges), ou chaîne vide */
  more: string;
}

const YES = 'Le OUI l’emporte';
const WHERE = 'À l’état sauvage, ou élevé partout pour un animal domestique.';

const ASKS: Record<RecordId, [question: string, more?: string, rule?: string]> = {
  lourd: ['Qui est le plus lourd ?', 'Le poids d’un adulte.', 'Le plus lourd gagne'],
  leger: ['Qui est le plus léger ?', 'Le poids d’un adulte.', 'Le plus léger gagne'],
  'plus-lourd-qu-un-humain': ['Pèse-t-il 70 kg ou plus ?', 'Le poids d’un adulte, comme un humain.'],
  'moins-d-un-kilo': ['Pèse-t-il moins d’un kilo ?', 'Le poids d’un adulte.'],
  grand: ['Qui est le plus grand ?', 'Sa plus grande mesure : longueur, hauteur ou envergure.', 'Le plus grand gagne'],
  petit: ['Qui est le plus petit ?', 'Sa plus grande mesure : longueur, hauteur ou envergure.', 'Le plus petit gagne'],
  'plus-grand-qu-un-humain': ['Mesure-t-il 1,75 m ou plus ?', 'Sa plus grande mesure : longueur, hauteur ou envergure.'],
  vieux: ['Qui vit le plus longtemps ?', 'La longévité dans la nature.', 'Le plus vieux gagne'],
  ephemere: ['Qui vit le moins longtemps ?', 'La longévité dans la nature.', 'Le plus éphémère gagne'],
  'plus-de-20-ans': ['Vit-il 20 ans ou plus ?', 'Sa longévité dans la nature.'],
  nombreux: ['Qui est le plus nombreux sur Terre ?', 'Le nombre d’individus encore vivants.', 'Le plus nombreux gagne'],
  rare: ['Qui est le plus rare ?', 'Le nombre d’individus encore vivants. Une espèce éteinte n’en a plus aucun.', 'Le plus rare gagne'],
  'plus-d-un-million': ['Sont-ils plus d’un million sur Terre ?', 'Le nombre d’individus encore vivants.'],
  menace: [
    'Qui est le plus menacé ?',
    'Sa catégorie sur la Liste rouge de l’UICN. Un animal domestique ou non évalué n’est pas sur l’échelle.',
    'Le plus menacé gagne',
  ],
  menacee: ['Son espèce est-elle menacée ?', 'Vulnérable, en danger ou en danger critique sur la Liste rouge de l’UICN.'],
  afrique: ['Vit-il en Afrique ?', `${WHERE} Les animaux de haute mer ne vivent sur aucun continent.`],
  asie: ['Vit-il en Asie ?', `${WHERE} Les animaux de haute mer ne vivent sur aucun continent.`],
  amerique: ['Vit-il en Amérique ?', `${WHERE} Les animaux de haute mer ne vivent sur aucun continent.`],
  europe: ['Vit-il en Europe ?', `${WHERE} Les animaux de haute mer ne vivent sur aucun continent.`],
  oceanie: ['Vit-il en Océanie ?', `${WHERE} Les animaux de haute mer ne vivent sur aucun continent.`],
  'plusieurs-continents': ['Vit-il sur plusieurs continents ?', `Au moins deux. ${WHERE}`],
  mammifere: ['Est-ce un mammifère ?'],
  oiseau: ['Est-ce un oiseau ?'],
  reptile: ['Est-ce un reptile ?'],
  poisson: ['Est-ce un poisson ?', 'Les requins en sont, les dauphins et les baleines non.'],
  amphibien: ['Est-ce un amphibien ?', 'Grenouilles, crapauds, salamandres, tritons…'],
  insecte: ['Est-ce un insecte ?', 'Six pattes : les araignées, les scorpions et les mille-pattes n’en sont pas.'],
  carnivore: ['Est-il carnivore ?', 'Il mange surtout d’autres animaux : viande, poissons, krill ou charognes. Les mangeurs d’insectes ne comptent pas.'],
  herbivore: ['Mange-t-il des plantes ?', 'Herbe, feuilles, fruits, graines, nectar, algues… Il suffit que ça fasse partie de son menu.'],
  omnivore: ['Mange-t-il de tout ?', 'À la fois des plantes et des animaux.'],
  insectivore: ['Mange-t-il des insectes ?', 'Fourmis, termites, chenilles, larves… Il suffit que ça fasse partie de son menu.'],
  piscivore: ['Mange-t-il du poisson ?', 'Il suffit que ça fasse partie de son menu.'],
  nocturne: ['Est-il actif la nuit ?', 'La nuit, à l’aube et au crépuscule, ou de jour comme de nuit.'],
  diurne: ['Est-il actif le jour ?', 'Surtout le jour, ou de jour comme de nuit. L’aube et le crépuscule ne comptent pas.'],
  solitaire: ['Vit-il seul ?', 'En dehors de la saison des amours et de l’élevage des petits.'],
  oeufs: ['Pond-il des œufs ?', 'Attention aux pièges : l’ornithorynque pond, certains serpents et requins non.'],
  vole: ['Sait-il voler ?', 'Même un peu (la poule oui, l’autruche jamais). Planer ne compte pas.'],
  groupe: ['Vit-il en groupe ?', 'Troupeau, meute, colonie, banc… Un couple ne suffit pas.'],
  mer: ['Vit-il en mer ?', 'Océan, récif ou abysses : le milieu écrit sur la carte.'],
  foret: ['Vit-il en forêt ?', 'Forêt ou jungle : le milieu écrit sur la carte.'],
  montagne: ['Vit-il en montagne ?', 'Le milieu écrit sur la carte.'],
  'desert-savane': ['Vit-il au chaud et au sec ?', 'Désert ou savane : le milieu écrit sur la carte.'],
  'eau-douce': ['Vit-il en eau douce ?', 'Rivières, fleuves, lacs, étangs ou marais.'],
  cotes: ['Vit-il sur les côtes ?', 'Plages, rochers, estuaires ou mangroves : le milieu écrit sur la carte.'],
};

/** La question annoncée pour un record. */
export function askOf(record: RecordDef): Ask {
  const entry = ASKS[record.id];
  if (!entry) return { question: record.name, rule: record.question ? YES : '', more: record.desc };
  const [question, more = '', rule] = entry;
  return { question, more, rule: rule ?? YES };
}
