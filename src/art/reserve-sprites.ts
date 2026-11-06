import type { Athlete } from '../engine/types';
import { mix } from './kit';

// Les animaux de « Ma Réserve » en pixel art.
// Une cinquantaine de silhouettes (félin, canidé, cheval, poisson, rapace…) dessinées une fois, tournées vers la
// droite, que chaque espèce recolore à ses couleurs (avec des taches ou des rayures au besoin). Les espèces les plus
// connues ont leurs couleurs réglées à la main ; le lion et le panda ont leur propre dessin.
// Lettres des dessins : A couleur principale (a ombre, L lumière), B couleur secondaire (b ombre), K œil,
// X accent : bec, cornes, sabots, nez (x ombre). Les taches et rayures se posent sur les A et L.

export interface Sprite {
  rows: string[];
  pal: Record<string, string>;
}

const SHAPES = {
  felin: ['.........A.A..', '.........AAAA.', '........ALAKA.', 'A.......AAABBX', '.A......AAAB..', '..ALLLLLAAa...', '..AAAAAAAAAa..', '..AbbbbbbbAa..', '..A.a....A.a..', '..a.a....a.a..'],
  canide: ['.........A.A...', '.........AAA...', '........ALAKA..', '........AAAABBX', '.AA.....AAAb...', 'AAALLLLLAAA....', '.aAAAAAAAAAa...', '..AbbbbbbbAa...', '..A.a....A.a...', '..a.a....a.a...'],
  ours: ['...........a.a..', '...LLLLLLLLAAAA.', '..LAAAAAAAAAAKAA.', '.LAAAAAAAAAaAABBX', '.AAAAAAAAAAAAa...', '.AAAAAAAAAAAa....', '.aAAaaaaaaAAa....', '.aA.Aa...aA.Aa...', '.aa.aa...aa.aa...'],
  'grand-singe': ['......AAA..', '.....AAAAA.', '..LLLABBKB.', '.LAAAABBBB.', 'LAAAAAAAAA.', 'AAAAAAAAAAa', 'aAAAAaaAAAa', '.AA..a..AA.', '.AA.....AA.', '.aa.....aa.'],
  singe: ['......AAA..', '.....ABBBA.', '.....ABKBB.', '.....AABB..', '.A..LAAAA..', 'A...AAAAAA.', 'A..AAAAAaA.', '.A.AAAAAa..', '..AAa..aA..'],
  elephant: ['.....LLLLLL.......', '...LLAAAAAALL.....', '..LAAAAAAAAAAAa...', '.LAAAAAAAAAAaaaA..', '.AAAAAAAAAAAaBaaA.', 'aAAAAAAAAAAAaBaAKA', '.AAAAAAAAAAAAaaAAA', '.aAAAAAAAAAAAaAAXX', '.aaAAAAAAAAAAa.AA.', '..aaaaaaaaaaa..AA.', '..AA.AA...AA.A..A.', '..Aa.Aa...Aa.Aa...', '..aa.aa...aa.aa...'],
  rhino: ['....LLLLL....X.', '..LLAAAAAAa.XX.', '.LAAAAAAAAAAAXA', 'AAAAAAAAAAAAKAA', 'AAAAAAAAAAAAAAa', '.AAAAAAAAAAAa..', '.aAaaaaaaaAa...', '.AA.AA..AA.AA..', '.aa.aa..aa.aa..'],
  hippo: ['...........a.a.', '...LLLLLL..AAAA', '..LAAAAAAAAAKAA', '.LAAAAAAAAAAAABB', 'AAAAAAAAAAAAABB.', '.AAAAAAAAAAAa...', '.aAA.aaaa.AAa...', '.aa........aa...'],
  girafe: ['........X.X.', '........LLL.', '.......LAAKA', '........AAAAa', '.......aABA.', '.......aAA..', '......aBAA..', '......aAA...', '.....aBA....', '.....aAA....', '..LLLLABA...', '.LABAABAAB..', '.AAABAAAAA..', '..ABAAABA...', '..Aa...Aa...', '..A.a..A.a..', '..A.a..A.a..', '..A.a..A.a..', '..x.x..x.x..'],
  cerf: ['........X..X.', '.......X.XX..', '........XX...', '........AA...', '.......ALKA..', '.......AAAAB.', '.B.....AA....', '.AALLLLAA....', '.AAAAAAAAa...', '..BbbbbbAa...', '..A.a..A.a...', '..A.a..A.a...', '..x.x..x.x...'],
  antilope: ['........X.X..', '........X.X..', '........X.X..', '........AA...', '.......ALKA..', '.......AAAAB.', '.B.....AA....', '.AALLLLAA....', '.AAAAAAAAa...', '..BbbbbbAa...', '..A.a..A.a...', '..A.a..A.a...', '..x.x..x.x...'],
  cheval: ['.........xA...', '........xAAA..', '........xAKAA.', '........xAAAAB', 'x.......xAA.B.', 'xx.....xAA....', 'xxLLLLLLAA....', '.AAAAAAAAA....', '.AAAAAAAAAa...', '.A.A....A.a...', '.A.A....A.A...', '.x.x....x.x...'],
  bovin: ['..........X..X.', '...LLLLL..aAAX.', '..LAAAAAAAaAKAa', '.LAAAAAAAAAAAAB', 'AAAAAAAAAAAAAB.', 'AAAAAAAAAAAAa..', '.AAAAAAAAAAa...', '.A.A....A.A....', '.A.A....A.A....', '.x.x....x.x....'],
  chameau: ['....LL........', '...LAAL.......', '..LAAAAL...AA.', '.LAAAAAAA.AAKA', '.AAAAAAAAAAAAB', 'aAAAAAAAAAA...', '.aAAAAAAAa....', '..A.A...A.A...', '..A.A...A.A...', '..A.A...A.A...', '..x.x...x.x...'],
  suide: ['........aa..', '..LLLLLLAAA.', '.LAAAAAAAKAA', 'aAAAAAAAAAABB', '.AAAAAAAAAAX.', '.aAaaaaaAa...', '.A.a...A.a...'],
  mouton: ['..........AA.', '.BBBBBBBB.AKA', 'BBBBBBBBBBAAA', 'BBBBBBBBBBA..', 'BBBBBBBBBB...', '.bbbbbbbbb...', '..A.A..A.A...', '..A.A..A.A...'],
  rongeur: ['......AA.', '.LL..AAKA', 'LAAL.AAAB', 'LA.LAAAA.', '.L.AAAAa.', '...a..a..'],
  lapin: ['.....AA.', '.....AA.', '....AAKA', '.LLAAAAX', 'BAAAAAA.', '.AAAAAa.', '.aa.aa..'],
  herisson: ['..aAaAa...', '.aAaAaAaa.', 'aAaAaAaBBK', '.aAaAaBBBX', '..b.b..b..'],
  'chauve-souris': ['....A.A....', 'A...AAA...A', 'AA.AKAKA.AA', 'AAAAAAAAAAA', 'A.AA.A.AA.A'],
  mustelide: ['.........AA..', '.......AAAKA.', 'aLLLLLAAAAABX', '.AAAAAAAAAA..', '..a.a...a.a..'],
  kangourou: ['.......AA.', '.......AA.', '......AAKA', '......AAAB', '.....AAA..', '....LAAA..', '...LAAAAa.', '..LAAAAAa.', '.AAAAAAa..', 'AA..AAA...', 'A...AAAa..', '....aaaaa.'],
  koala: ['.LL...LL.', 'LBAAAAABL', '.AAAAAAA.', '.AKAXAKA.', '.AAAXAAA.', '..BBBBB..', '.ABBBBBA.', '.aa...aa.'],
  dauphin: ['......A.......', '.....AA.......', '..LLLLLLLLL...', 'AAAAAAAAAAKAA.', 'A.BBBBBBBBBBAAA', '..a.....a.....'],
  baleine: ['...LLLLLLLLLL.....', '.LLAAAAAAAAAALL...', 'AAAAAAAAAAAAAAKAA.', 'A.BBBBBBBBBBBBBBAA', 'AA..aa.....aaa....'],
  phoque: ['........LL.', '..LLLLLLAAK', '.LAAAAAAAAAA', 'AAAAAAAAAaa.', '.aa.aaaaaa..'],
  requin: ['.......A........', 'A.....AA........', 'AA.LLLLLLLLLL...', 'AAAAAAAAAAAAKAA.', 'AA.BBBBBBBBBBBAA', 'A....a..a.......'],
  marteau: ['.......A.......A', 'A.....AA.......A', 'AA.LLLLLLLLLL.AA', 'AAAAAAAAAAAAAAKA', 'AA.BBBBBBBBBBBAA', 'A....a..a......A'],
  raie: ['.....AA.....', '...AAAAAA...', '.AAAAKAKAAA.', 'AAAAAAAAAAAA', '.aAAAAAAAAa.', '...aAAAAa...', '.....aa.....', '......a.....', '......a.....'],
  poisson: ['....LLL...', 'A..LAAAAL.', 'AAAAAAAKAA', 'AAAAAAAAAB', 'A..aBBBBa.', '....aa....'],
  anguille: ['..........LL..', 'LLLLLLLLLAAKA.', 'AaaAAaaAAAAAAB', '.a..a..a......'],
  hippocampe: ['..AA..', '.AKAX.', '..AA..', '..LA..', '.LAA..', '.AAa..', '..Aa..', '..aA..', '.a.a..', '..a...'],
  pieuvre: ['...LLLL...', '..LAAAAA..', '..AAAAAAa.', '..AKAAKAa.', '..AAAAAAa.', '.AAAAAAAAA', 'A.A.AA.A.A', 'A.A.A..A.A', '.A..A..A..'],
  meduse: ['..LLLL..', '.LAAAAA.', 'LAAAAAAa', 'AAAAAAAa', 'aBaBaBaB', '.B.B.B..', '.B..B.B.', '..B.B...', '.B...B..'],
  crabe: ['XX.......XX', 'X.X.K.K.X.X', '.XLLAAAAAX.', '..AAAAAAa..', '.A.A.A.A.A.', 'A..a...a..A'],
  etoile: ['....A....', '....A....', '...AAA...', 'AAAAAAAAA', '.AAALAAA.', '..AAAAA..', '..AA.AA..', '.AA...AA.', '.A.....A.'],
  escargot: ['...LLL......', '..LAAAL.....', '.LAaLAA..X.X', '.AAaaAA..B.B', '..AAAA..BBB.', 'BBBBBBBBBBB.'],
  rapace: ['....BB...', '...BBKXX.', '...BBB.X.', '..LAAA...', '.LAAAAA..', '.AAAAAAa.', '.AAAAAAa.', '..AAAAa..', '..aAAa...', '...x.x...'],
  chouette: ['A.....A', 'AAAAAAA', 'ABBABBA', 'ABKXKBA', 'AABXBAA', 'ALBBBLA', 'AABBBAA', '.aAAAa.', '..x.x..'],
  'petit-oiseau': ['....AA..', '...AKAX.', 'a.LAAAB.', '.aAAAAB.', '..aAAa..', '...x.x..'],
  echassier: ['...LA..', '...AAXX', '...A..X', '..A....', '..A....', '..ALLA.', 'aAAAAAA', '.aAAAAa', '..aa...', '...a...', '...a...', '..aa...'],
  manchot: ['.AAA..', 'AAAAA.', 'AABAXX', 'ABBAa.', 'ABBBa.', 'ABBBa.', 'AbBBa.', '.bbb..', '.X.X..'],
  perroquet: ['..AA...', '.AAKX..', '.ABXX..', '.AA....', 'LAAA...', 'AAAA...', 'BAAa...', 'BBAa...', '.Bb....', '.Bb....', '.x.....'],
  toucan: ['..AA.....', '.ABKXXXX.', '.ABBXXx..', '.AAB.....', 'LAAA.....', 'AAAA.....', 'AAAa.....', '.AAa.....', '.Aa......', '.x.......'],
  autruche: ['......AA.', '......AKX', '......A..', '......A..', '.....A...', '.BBB.A...', 'BBBBBBA..', 'BBBBBBB..', '.BBBBB...', '...A.A...', '...A..A..', '...A..A..', '..xx.xx..'],
  canard: ['.....AA...', '.....AKXX.', 'B...BAA...', 'BBLLBBB...', '.BBBBBBb..', '..bbbbb...'],
  serpent: ['.........AA..', '........AAKA.', '........A..X.', '..LLLL..A....', '.LAAAAL.A....', 'LAa..aALA....', 'AAa..aAAa....', '.aAAAAAa.....'],
  lezard: ['.........AAA..', '..LLLLLLAAKAA.', 'AAAAAAAAAAAAAB', '...a.A....a.A.'],
  tortue: ['...LLLL.....', '..LBBbBL....', '.LBBbBBBb.AA', '.bbbbbbbbAAK', 'A.A....A.A..'],
  crocodile: ['......a.a.a.......', '...LLLLLLLLLLKLL..', 'AAAAAAAAAAAAAAAAAA', '..aA.Aa....Aa.Aa..'],
  grenouille: ['.....LL..', '....LKLA.', '..LAAAAAA', '.AAAAABB.', 'AAaAAAA..', 'aa.aaaa..'],
  salamandre: ['.........X.X', '..LLLLLLAAKA', 'AAAAAAAAAAAB', '...a.a..a.a.'],
  insecte: ['......x.', '..LLL.Ax', '.LAAALAA', 'AAAAAAA.', '.x.x.x..'],
  papillon: ['AA.....AA', 'ABA.x.ABA', 'AAAAxAAAA', '.AAAxAAA.', '..BAxAB..', '..AA.AA..'],
  araignee: ['x..x.x..x', '.x.AAA.x.', 'xxAAAAAxx', '.xAAAAAx.', 'x..AAA..x', '..x...x..'],
  abeille: ['.LL.LL.', '..LLL..', '.AxAxAK', 'xAxAxAA', '..x.x..'],
  lion: ['.........xBBx...', '........xBLLBB..', '........BLAAKB..', 'B.......BAAAAAX.', '.L......BBAAaA..', '..L....BBBBaa...', '..ALLLLLBBBx....', '..AAAAAAAAAAa...', '..AaaaaaaaaAa...', '..Aa.Aa..Aa.Aa..', '..aa.aa..aa.aa..'],
  panda: ['.BB...BB.', '.BAAAAAB.', '.ALLAAAAa', 'ABBAAABBa', 'ABLAAALBa', '.AAABAAa.', 'BBAAAAABB', 'BBAAAAaBB', '.BAAaaaB.', '.BB...BB.'],
} as const satisfies Record<string, readonly string[]>;

export type SpriteType = keyof typeof SHAPES;
export const SPRITE_TYPES = Object.keys(SHAPES) as SpriteType[];

export interface Look {
  type: SpriteType;
  /** couleur principale */
  A: string;
  /** couleur secondaire (ventre, museau, crinière, carapace…) */
  B: string;
  /** accent : bec, cornes, sabots, nez */
  X: string;
  pattern?: 'spots' | 'stripes';
  /** couleur des taches ou des rayures */
  P?: string;
}

export const DEFAULTS_FOR_SHEET: Record<SpriteType, Omit<Look, 'type'>> = {
  felin: { A: '#d9a24e', B: '#f1dcb0', X: '#4a2616' },
  canide: { A: '#8f8a80', B: '#e9e2d2', X: '#2a1a10' },
  ours: { A: '#7a5230', B: '#a87a50', X: '#2a1a10' },
  'grand-singe': { A: '#3a3532', B: '#6b625a', X: '#2a1a10' },
  singe: { A: '#8a6a48', B: '#e6c9a0', X: '#2a1a10' },
  elephant: { A: '#a9afb1', B: '#7d858a', X: '#f3ead2' },
  rhino: { A: '#9c9a94', B: '#9c9a94', X: '#d9d2bf' },
  hippo: { A: '#8e7286', B: '#e2a1a8', X: '#2a1a10' },
  girafe: { A: '#eebe68', B: '#a8622c', X: '#5a331a' },
  cerf: { A: '#9a6a3c', B: '#e8d6b8', X: '#d9c8a0' },
  antilope: { A: '#c49a5a', B: '#f1e6cc', X: '#4a3a2a' },
  cheval: { A: '#8a5a33', B: '#e8d8c0', X: '#2a1a10' },
  bovin: { A: '#6b4426', B: '#c9a87a', X: '#e8dcc0' },
  chameau: { A: '#c9a066', B: '#e8d0a0', X: '#4a3a2a' },
  suide: { A: '#6a5446', B: '#a8907a', X: '#f3ead2' },
  mouton: { A: '#3a3230', B: '#efe8d6', X: '#2a1a10' },
  rongeur: { A: '#9a7048', B: '#e8d6b8', X: '#2a1a10' },
  lapin: { A: '#a89a88', B: '#f1ede4', X: '#e8a0a8' },
  herisson: { A: '#7a6450', B: '#d8c4a4', X: '#2a1a10' },
  'chauve-souris': { A: '#4a3e3a', B: '#6a5a54', X: '#2a1a10' },
  mustelide: { A: '#7a5432', B: '#e8d6b8', X: '#2a1a10' },
  kangourou: { A: '#b98a5a', B: '#ead2b0', X: '#2a1a10' },
  koala: { A: '#9aa0a2', B: '#e8e4dc', X: '#2a2a2a' },
  dauphin: { A: '#7f97ad', B: '#dfe6ea', X: '#2a1a10' },
  baleine: { A: '#4f6a86', B: '#c9d4dc', X: '#2a1a10' },
  phoque: { A: '#8a96a0', B: '#b4bec6', X: '#2a1a10' },
  requin: { A: '#8f9aa4', B: '#eef0ee', X: '#2a1a10' },
  marteau: { A: '#8a9488', B: '#eef0ee', X: '#2a1a10' },
  raie: { A: '#6a7a6a', B: '#d9dcc8', X: '#2a1a10' },
  poisson: { A: '#e8a03a', B: '#f6e8c8', X: '#2a1a10' },
  anguille: { A: '#6a7a3a', B: '#c9c08a', X: '#2a1a10' },
  hippocampe: { A: '#e8a03a', B: '#f6e8c8', X: '#c9802a' },
  pieuvre: { A: '#d9604a', B: '#f0a090', X: '#2a1a10' },
  meduse: { A: '#c9a8e8', B: '#e8c8f0', X: '#2a1a10' },
  crabe: { A: '#d9553a', B: '#f0a090', X: '#e8705a' },
  etoile: { A: '#e8804a', B: '#f0b080', X: '#2a1a10' },
  escargot: { A: '#b98a5a', B: '#c9b08a', X: '#4a3a2a' },
  rapace: { A: '#6b4426', B: '#c9a066', X: '#e8b83a' },
  chouette: { A: '#a08060', B: '#e8d8c0', X: '#e8b83a' },
  'petit-oiseau': { A: '#8a6a48', B: '#e8c8a0', X: '#e8a03a' },
  echassier: { A: '#f49ab4', B: '#f49ab4', X: '#2a1a10' },
  manchot: { A: '#262c3c', B: '#f2f2ea', X: '#f0a338' },
  perroquet: { A: '#d9402e', B: '#3f7fd0', X: '#e8dcc0' },
  toucan: { A: '#24242a', B: '#f2f2ea', X: '#f09a2a' },
  autruche: { A: '#d0a8a0', B: '#2a2622', X: '#d0a8a0' },
  canard: { A: '#2f7a4a', B: '#9a8a78', X: '#e8b83a' },
  serpent: { A: '#6a8a3a', B: '#c9c08a', X: '#d9402e' },
  lezard: { A: '#6a8a3a', B: '#c9c08a', X: '#2a1a10' },
  tortue: { A: '#8a8a5a', B: '#6a5a32', X: '#2a1a10' },
  crocodile: { A: '#6c8a3f', B: '#6c8a3f', X: '#2a1a10' },
  grenouille: { A: '#5f9e48', B: '#e8e0a0', X: '#2a1a10' },
  salamandre: { A: '#2a2622', B: '#e8c440', X: '#e8c440' },
  insecte: { A: '#3a5a3a', B: '#3a5a3a', X: '#2a2220' },
  papillon: { A: '#e8803a', B: '#2a2622', X: '#2a2622' },
  araignee: { A: '#3a3230', B: '#3a3230', X: '#2a2220' },
  abeille: { A: '#e8b83a', B: '#e8b83a', X: '#2a2220' },
  lion: { A: '#e3a94f', B: '#8e4f25', X: '#4a2616' },
  panda: { A: '#f1ede4', B: '#221f1d', X: '#221f1d' },
};

/** Réglages à la main des espèces les plus connues. */
const LOOKS: Record<string, Partial<Look>> = {
  lion: { type: 'lion' },
  panda: { type: 'panda' },
  tigre: { A: '#e0822e', B: '#f6efe2', pattern: 'stripes', P: '#2a1a10' },
  guepard: { A: '#e6bc62', pattern: 'spots', P: '#2a1a10' },
  leopard: { A: '#e2a850', pattern: 'spots', P: '#3a2414' },
  jaguar: { A: '#dca048', pattern: 'spots', P: '#2a1a10' },
  'panthere-noire': { A: '#2c2a30', B: '#3a3840', X: '#2c2a30' },
  'panthere-des-neiges': { A: '#dcd8cc', B: '#f4f2ec', pattern: 'spots', P: '#6a6a68' },
  lynx: { A: '#b99a6a' },
  ocelot: { A: '#d9a85a', pattern: 'spots', P: '#3a2414' },
  serval: { A: '#e2b45a', pattern: 'spots', P: '#2a1a10' },
  puma: { A: '#c49a62' },
  chat: { A: '#9a9488', B: '#d9d4c8', pattern: 'stripes', P: '#6a645a' },
  loup: { A: '#8f8a80' },
  'renard-roux': { A: '#df7434', B: '#f4ecdc' },
  fennec: { A: '#e8cfa0', B: '#f6efe2' },
  hyene: { A: '#b49a70', pattern: 'spots', P: '#4a3a2a' },
  lycaon: { A: '#8a6a3a', pattern: 'spots', P: '#2a2220' },
  husky: { A: '#6a6e72', B: '#f1ede4' },
  dalmatien: { A: '#f1ede4', B: '#f1ede4', pattern: 'spots', P: '#2a2622' },
  labrador: { A: '#e0b870', B: '#f1e0b8' },
  'berger-allemand': { A: '#a8743a', B: '#2a2622' },
  chihuahua: { A: '#e0b880', B: '#f1e0c8' },
  'ours-brun': { A: '#7a5230' },
  'ours-polaire': { A: '#f1ece0', B: '#f1ece0' },
  'ours-noir': { A: '#2c2a28', B: '#7a5a40' },
  'panda-roux': { type: 'mustelide', A: '#c8582a', B: '#f1ede4' },
  gorille: { A: '#3a3532' },
  chimpanze: { A: '#2c2826', B: '#c9a080' },
  'orang-outan': { A: '#b8562a', B: '#d08a5a' },
  zebre: { type: 'cheval', A: '#f3efe6', B: '#f3efe6', X: '#2a2622', pattern: 'stripes', P: '#2a2622' },
  cheval: { A: '#8a5a33' },
  vache: { A: '#f1ede4', B: '#e8b0b0', X: '#d9d0c0', pattern: 'spots', P: '#2a2622' },
  cochon: { A: '#f0b0a8', B: '#e89a98', X: '#f0b0a8' },
  chevre: { type: 'antilope', A: '#f1ede4', B: '#f1ede4' },
  ane: { A: '#8a8680', B: '#e8e4dc' },
  bison: { A: '#5a3a22', B: '#7a5230' },
  dauphin: { A: '#7f97ad' },
  orque: { A: '#1f2228', B: '#f2f2ea' },
  'baleine-bleue': { A: '#4f6a86' },
  cachalot: { A: '#5a6068', B: '#8a9098' },
  'baleine-a-bosse': { A: '#2f3a46' },
  beluga: { A: '#f1f4f4', B: '#f1f4f4' },
  'requin-blanc': { A: '#8f9aa4' },
  'rhinoceros-blanc': { A: '#a8a69e' },
  'requin-baleine': { A: '#3f5a72', pattern: 'spots', P: '#e8eef0' },
  'raie-manta': { A: '#2a2e34', B: '#eef0ee' },
  'poisson-clown': { A: '#f08a2a', pattern: 'stripes', P: '#f6f4ee' },
  piranha: { A: '#8a96a0', B: '#d9553a' },
  'poisson-rouge': { A: '#f0882a', B: '#f6c070' },
  'aigle-royal': { A: '#6b4426', B: '#c9a066' },
  pygargue: { A: '#5a3a22', B: '#f6f2ea' },
  'faucon-pelerin': { A: '#6a7280', B: '#e8e4dc' },
  harfang: { A: '#f4f2ec', B: '#f4f2ec', pattern: 'spots', P: '#3a3632' },
  ara: { A: '#d9402e', B: '#3f7fd0' },
  colibri: { A: '#3f9a6a', B: '#e8dcc0', X: '#2a2622' },
  'dragon-de-komodo': { type: 'lezard', A: '#6a6250', B: '#8a8268' },
  'cobra-royal': { A: '#5a5a3a', B: '#c9b88a' },
  anaconda: { A: '#4a6a3a', pattern: 'spots', P: '#2a2a1a' },
  'tortue-geante': { A: '#7a7a6a', B: '#5a5040' },
  cameleon: { A: '#6aa84a', B: '#c9e08a' },
  axolotl: { type: 'salamandre', A: '#f1b0b8', B: '#f6d0d4', X: '#e0607a' },
  fourmi: { type: 'insecte', A: '#8a3a22', B: '#8a3a22' },
  'mante-religieuse': { type: 'insecte', A: '#7ab04a', B: '#7ab04a' },
  'calmar-geant': { A: '#c84a3a' },
  suricate: { type: 'rongeur', A: '#c4a070', B: '#e8d6b8' },
  'loutre-de-mer': { type: 'mustelide', A: '#5a3e2a', B: '#a88a6a' },
};

const has = (re: RegExp, a: Athlete) => re.test(a.id);

/** La silhouette d'une espèce, d'après sa famille, son archétype et son nom. */
export function typeOf(a: Athlete): SpriteType {
  const t = LOOKS[a.id.replace(/^mx-/, '')]?.type;
  if (t) return t;
  switch (a.sport) {
    case 'felins':
      return 'felin';
    case 'canides':
      return 'canide';
    case 'ours':
      return 'ours';
    case 'primates':
      return has(/gorille|chimpanze|orang|bonobo/, a) ? 'grand-singe' : 'singe';
    case 'geants':
      if (has(/elephant|mammouth|mastodonte/, a)) return 'elephant';
      if (has(/rhinoceros/, a)) return 'rhino';
      if (has(/hippopotame/, a)) return 'hippo';
      if (has(/girafe/, a)) return 'girafe';
      return has(/okapi/, a) ? 'cheval' : 'rhino';
    case 'ongules':
      if (has(/zebre|cheval|ane|onagre|kiang|hemione/, a)) return 'cheval';
      if (has(/bison|buffle|yak|gaur|boeuf|vache|aurochs|banteng/, a)) return 'bovin';
      if (has(/dromadaire|chameau|lama|alpaga|vigogne|guanaco/, a)) return 'chameau';
      if (has(/sanglier|phacochere|cochon|pecari|babiroussa|tapir|hylochere/, a)) return 'suide';
      if (has(/cerf|elan|renne|daim|chevreuil|caribou|wapiti|muntjac|sika/, a)) return 'cerf';
      return 'antilope';
    case 'petits':
      if (has(/herisson|tatou|pangolin|porc-epic|tenrec/, a)) return 'herisson';
      if (has(/chauve|pipistrelle|vampire|roussette|murin|noctule/, a)) return 'chauve-souris';
      if (has(/lapin|lievre|pika/, a)) return 'lapin';
      if (has(/loutre|belette|hermine|blaireau|glouton|martre|furet|vison|mouffette|raton|putois|zorille|ratel|mangouste|genette|civette|binturong|fossa/, a)) return 'mustelide';
      return 'rongeur';
    case 'marsupiaux':
      if (has(/kangourou|wallaby|wallaroo|quokka/, a)) return 'kangourou';
      if (has(/koala|wombat/, a)) return 'koala';
      return 'rongeur';
    case 'marins':
      if (has(/loutre/, a)) return 'mustelide';
      if (a.archetype === 'marin-pinnipede' || has(/phoque|otarie|morse|lamantin|dugong|elephant-de-mer/, a)) return 'phoque';
      if (a.archetype === 'marin-geant' || has(/baleine|cachalot|rorqual/, a)) return 'baleine';
      return 'dauphin';
    case 'requins':
      if (has(/raie|manta|torpille|pastenague|mobula|poisson-scie/, a)) return 'raie';
      return has(/marteau/, a) ? 'marteau' : 'requin';
    case 'poissons':
      if (has(/anguille|murene|congre|lamproie|gymnote/, a)) return 'anguille';
      if (has(/hippocampe|dragon-de-mer/, a)) return 'hippocampe';
      return 'poisson';
    case 'rapaces':
      return a.archetype === 'rapace-nocturne' || has(/chouette|hibou|effraie|harfang|duc|cheveche/, a) ? 'chouette' : 'rapace';
    case 'oiseaux':
      if (has(/manchot|pingouin|gorfou/, a)) return 'manchot';
      if (has(/flamant|heron|cigogne|grue|ibis|aigrette|spatule|jabiru|marabout|bec-en-sabot|kamichi|serpentaire/, a)) return 'echassier';
      if (a.archetype === 'oiseau-coureur' || has(/autruche|emeu|nandou|casoar/, a)) return 'autruche';
      if (has(/ara|perroquet|cacatoes|perruche|kakapo|lori|inseparable|amazone|kea/, a)) return 'perroquet';
      if (has(/canard|oie|cygne|harle|eider|sarcelle|tadorne|bernache/, a)) return 'canard';
      if (has(/toucan|calao/, a)) return 'toucan';
      return 'petit-oiseau';
    case 'reptiles':
      if (a.archetype === 'reptile-tortue' || has(/tortue/, a)) return 'tortue';
      if (has(/crocodile|alligator|caiman|gavial/, a)) return 'crocodile';
      if (has(/cobra|vipere|python|boa|anaconda|mamba|couleuvre|crotale|serpent|taipan|naja|bongare|trigonocephale/, a)) return 'serpent';
      return 'lezard';
    case 'amphibiens':
      return has(/salamandre|triton|axolotl|protee|cecilie|necture|sirene|ajolote|ambystome/, a) ? 'salamandre' : 'grenouille';
    case 'insectes':
      if (has(/papillon|monarque|morpho|sphinx|machaon|libellule|paon-du-jour|vulcain|apollon|atlas/, a)) return 'papillon';
      if (a.archetype === 'arachnide' || has(/araignee|mygale|veuve|tarentule|scorpion|epeire/, a)) return 'araignee';
      if (has(/abeille|guepe|frelon|bourdon/, a)) return 'abeille';
      return 'insecte';
    case 'invertebres':
      if (a.archetype === 'cephalopode' || has(/pieuvre|poulpe|calmar|seiche|nautile|argonaute/, a)) return 'pieuvre';
      if (a.archetype === 'crustace' || has(/crabe|homard|langouste|crevette|krill|bernard/, a)) return 'crabe';
      if (has(/meduse|physalie|caravelle/, a)) return 'meduse';
      if (has(/escargot|conque|nudibranche|limace|bulot|cone/, a)) return 'escargot';
      return 'etoile';
    case 'ferme':
      if (has(/^chat$|chat-/, a)) return 'felin';
      if (has(/cheval|ane|poney/, a)) return 'cheval';
      if (has(/vache|buffle/, a)) return 'bovin';
      if (has(/cochon/, a)) return 'suide';
      if (has(/mouton/, a)) return 'mouton';
      if (has(/chevre|alpaga/, a)) return 'antilope';
      if (has(/poule|dindon|pigeon|perruche|coq/, a)) return 'petit-oiseau';
      if (has(/oie|canard/, a)) return 'canard';
      if (has(/hamster|cochon-d-inde|lapin|chinchilla/, a)) return 'rongeur';
      if (has(/furet/, a)) return 'mustelide';
      if (has(/poisson/, a)) return 'poisson';
      if (has(/escargot/, a)) return 'escargot';
      if (has(/ver-|abeille/, a)) return 'insecte';
      return 'canide';
    default:
      return 'rongeur';
  }
}

/** Couleurs lues dans le nom de l'espèce (« noir », « roux », « polaire »…). */
const NAME_COLORS: [RegExp, string][] = [
  [/polaire|arctique|des neiges|blanc|blanche|albinos/, '#f1ede4'],
  [/noir|noire/, '#2c2a28'],
  [/roux|rousse|fauve/, '#d06a2e'],
  [/rouge/, '#c8402e'],
  [/rose/, '#f19ab4'],
  [/gris|grise|argent/, '#9aa0a2'],
  [/doré|dorée|\bor\b|jaune/, '#e0b04a'],
  [/brun|brune/, '#7a5230'],
  [/bleu|bleue|azur/, '#4f86c8'],
  [/vert|verte|émeraude/, '#5f9e48'],
];

/** Couleurs et motif d'une espèce. */
export function lookOf(a: Athlete): Look {
  const type = typeOf(a);
  const base = { type, ...DEFAULTS_FOR_SHEET[type] };
  const own = LOOKS[a.id.replace(/^mx-/, '')];
  if (own) return { ...base, ...own, type };
  const name = `${a.first} ${a.last}`.toLowerCase();
  const color = NAME_COLORS.find(([re]) => re.test(name))?.[1];
  const look: Look = color ? { ...base, A: color } : base;
  if (/tacheté|léopard|ocellé/.test(name)) return { ...look, pattern: 'spots', P: '#2a2220' };
  if (/rayé|tigre|zébré/.test(name)) return { ...look, pattern: 'stripes', P: '#2a2220' };
  return look;
}

const INK = '#1c140c';

/** Le sprite d'un « look » : dessin, motif posé sur la couleur principale, et palette. */
export function spriteOf(look: Look): Sprite {
  let rows: string[] = [...SHAPES[look.type]];
  if (look.pattern) {
    rows = rows.map((row, j) =>
      [...row]
        .map((ch, i) => {
          if (ch !== 'A' && ch !== 'L') return ch;
          const on = look.pattern === 'stripes' ? i % 3 === 1 && j > 0 : (i * 7 + j * 3) % 5 === 0;
          return on ? 'P' : ch;
        })
        .join(''),
    );
  }
  return {
    rows,
    pal: {
      A: look.A,
      a: mix(look.A, INK, 0.32),
      L: mix(look.A, '#fff8e8', 0.3),
      B: look.B,
      b: mix(look.B, INK, 0.25),
      X: look.X,
      x: mix(look.X, INK, 0.3),
      K: INK,
      P: look.P ?? INK,
    },
  };
}

export function spriteForAthlete(a: Athlete): Sprite {
  return spriteOf(lookOf(a));
}

/** Pose un sprite à l'échelle 1 : ombre portée, contour sélectif (teinte sombre de la couleur voisine), couleurs. */
export function blit(c: CanvasRenderingContext2D, s: Sprite, x: number, y: number, o: { flip?: boolean; shadow?: boolean; outline?: string | false } = {}) {
  const h = s.rows.length;
  const w = Math.max(...s.rows.map((r) => r.length));
  const rows = s.rows.map((r) => r.padEnd(w, '.'));
  const at = (i: number, j: number) => (j < 0 || j >= h || i < 0 || i >= w ? '.' : rows[j][o.flip ? w - 1 - i : i]);
  const px = (xx: number, yy: number, col: string) => {
    c.fillStyle = col;
    c.fillRect(xx, yy, 1, 1);
  };
  if (o.shadow) {
    c.fillStyle = 'rgba(8, 16, 10, 0.34)';
    c.fillRect(x + 2, y + h - 1, w - 1, 1);
    c.fillRect(x + 3, y + h, w - 3, 1);
  }
  if (o.outline !== false) {
    for (let j = -1; j <= h; j++)
      for (let i = -1; i <= w; i++) {
        if (at(i, j) !== '.') continue;
        const n = [at(i, j + 1), at(i + 1, j), at(i - 1, j), at(i, j - 1)].find((ch) => ch !== '.');
        if (n) px(x + i, y + j, o.outline ?? mix(s.pal[n] ?? INK, '#0e1712', 0.66));
      }
  }
  for (let j = 0; j < h; j++)
    for (let i = 0; i < w; i++) {
      const ch = at(i, j);
      if (ch !== '.') px(x + i, y + j, s.pal[ch] ?? '#ff00ff');
    }
}
