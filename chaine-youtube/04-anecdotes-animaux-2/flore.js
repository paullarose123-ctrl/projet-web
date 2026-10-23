'use strict';
/* ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════
   flore.js — bibliothèque de VÉGÉTATION, SOLS, ROCHERS et PREMIER PLAN (artiste « flore », préfixe fl_)
   Tout se dessine sur L (270 × 480) AVANT le tramage, dans l'ordre : lointain → proche. Aucune fonction ne dessine de ciel, de relief
   lointain, de neige qui tombe ni de particules (c'est kit.js : k_sky, k_mountains, k_snow, k_dust…). Tout est une fonction pure du temps
   (pas de Math.random ni de Date ; hasard = graine `seed`) et rien ne survit d'une image à l'autre sauf des caches de sprites déterministes.

   ── CONVENTIONS COMMUNES ─────────────────────────────────────────────────────────────────────────────────────────
   · Deux familles de signatures :
       OBJETS   fl_xxx(t, o)            t = temps en secondes (vent) ; o = options.   x, y = point de contact avec le sol (pied), en pixels « monde » à cam = 0.
       ZONES    fl_xxx(y0, y1, o)       bande de sol/herbe entre deux lignes y0 < y1 (aussi (x0, y0, x1, y1, o)) : le temps passe par o.t (0 si absent).
       ROCHERS  fl_rock(x, y, w, h, kind, seed, o) · fl_log(x, y, w, h, o) · fl_moss(x, y, w, o) · fl_tumbleweed(x, y, t, o)   (statiques ou temps explicite).
   · Options communes (toutes facultatives) :
       x, y      pied de l'objet ; l'écran affiche x − cam·par.                 seed   entier : change la forme (chaque graine = un individu, mis en cache).
       depth     0 = premier plan (plus sombre, plus contrasté, contour sombre) … 1 = lointain (fondu dans la brume par tramage). Défauts réels :
                 0,4 épicéa, bouleau, saguaro, figuier, agave, ocotillo, cholla, buisson sec, acacia, baobab, termitière, buisson · 0,3 branches mortes, mousse, fougères, fleurs, rocher du désert
                 · 0,25 tronc couché, rocher (fl_rock, fl_boulders) · 0,12 sols (neige, boue, sable, terre rouge), litière, herbe neuve · 0,85 → 0,35 forêt (lointain → proche)
                 · 0,7 → 0,05 herbes de savane · 0 fixe pour fl_grassFg et fl_branchFg. À partir de depth ≈ 0,5 la brume domine : pour une silhouette à contre-jour passer sil: true.
       cam       déplacement de caméra en pixels ; l'objet se décale de cam·par. par = parallaxe (défaut 1,1 − 0,85·depth : proche 1,1 → lointain 0,25).
                 Les sols acceptent |cam·par| ≤ 100 px ; les bandes de forêt / d'herbe ≤ 110 px. Au-delà, la bande se fige.
       wind      amplitude du vent (1 par défaut, 0 = air immobile, 2 = tempête). Toutes les plantes partagent la même oscillation
                 Math.sin(t·1,3 + x·0,05) (+ deux harmoniques) : un même coup de vent traverse l'écran de gauche à droite (fonction fl_wind(t, x, o)).
       env       ambiance, mêmes noms que les ciels de kit.js : 'alaskaDusk' (heure bleue, lumière à gauche) · 'alaskaNight' · 'alaskaSpring' (matin clair, soleil à droite)
                 · 'desertDusk' (couchant, soleil à droite) · 'savannaDawn' (lever, soleil à droite). L'ambiance teinte les ombres, la lumière, la brume et le liseré.
                 Surcharges : o.light (−1 soleil à gauche, +1 à droite), o.mist ('#rrggbb' couleur de la brume), o.rim (couleur du liseré de lumière).
       snow, moss  0 à 1 : couche de neige / de mousse sur le dessus (rochers, buissons, troncs, bouleaux, branches).
       PARAMÈTRES ANIMABLES (snow, moss, frost, leaf, unfurl, fruit, stalk, bloom, grow, fog, melt…) : arrondis au dixième (melt au quarantième, snow de fl_leafLitter au vingtième) AVANT d'entrer
                 dans un sprite en cache : un paramètre qui varie en continu change donc par paliers (11 sprites au plus par paramètre), et le sprite d'une case ne dépend jamais de l'ordre
                 des appels (render(f) pur, vérifié : build/flore/det.mjs et qunit.mjs). Une valeur donnée est arrondie ; le défaut (constante) est pris tel quel.
       tracks    [{x0, y0, x1, y1, kind, step}] (fl_snowGround, fl_sand, fl_mudGround, fl_savannaSoil) : coordonnées ÉCRAN à cam = 0 ; la piste est figée dans le sprite du sol et suit donc
                 le sol (cam·par) ; elle serpente légèrement et son pas est irrégulier (déterministe). 'lizard' : queue qui serpente et paires d'empreintes ; 'paw', 'boot', 'hop' : pas alternés.
   · Chaque plante : 3 à 5 tons dans la palette, lumière du haut et du côté soleil (liseré clair), masse sombre cohérente ; contour sombre « sélectif » au premier plan.
   · Premiers appels : un sprite se construit une fois (1 à 100 ms) puis se recopie (< 0,1 ms) ; seuls les cisaillements du vent sont recalculés à chaque image.
     Les sols à fonte (fl_snowGround avec melt qui change) coûtent ≈ 40 ms par palier de 1/40. Un plan complet : ≈ 200 ms à la première image (démo la plus chargée), 10 à 30 ms ensuite.
     Avec le préchauffage de flore_demo.js (fd_warm, INITS), le premier appel de chaque plan de la démo tombe à 8 à 50 ms (fd_premier : 105 à 170 ms par image à cause des herbes de premier plan, indépendamment du cache).

   ── ALASKA ET PRINTEMPS ──────────────────────────────────────────────────────────────────────────────────────────
   fl_spruce(t, o)                 Épicéa chargé de neige : étages de branches retombantes, paquets de neige arrondis (lumière côté soleil, creux bleutés), ombre de l'étage du dessus.
                                   o : x, y, h (hauteur px, 100), snow (0,85), slim (0,17 largeur/hauteur), seed, depth. Bouge à peine (≤ 2 px). Coût : 0,05 ms (premier appel 9 ms).
   fl_spruceForest(t, o)           Bandes de forêt d'épicéas dans la brume, du lointain au proche. o : y (ligne de sol du plan proche), bands (3), h (hauteur moyenne du plan proche, 70),
                                   depth (plan lointain, 0,85), depthNear (0,35), step (décalage vertical entre plans, 9), snow (0,8), fog (0,55 brume au pied), mist (false = pas de bande de brume),
                                   mistA (opacité), gap, spread, seed, x0/x1 (découpe). Brume tramée qui dérive. Coût : 1,4 ms (premier appel 33 ms).
   fl_birch(t, o)                  Bouleau blanc à lenticelles noires, branches fines qui retombent, brindilles sombres. o : x, y, h (120), leaf 0 (nu) à 1 (feuillu, 0,5), snow, frost 0..1 (givre sur les brindilles), stems 1 à 3, seed, depth. 0,03 ms.
   fl_deadBranches(t, o)           Broussaille morte. o : x, y, h (40), n (4 tiges), kind 'standing' | 'fallen' (brindilles couchées), snow, seed. 0,01 ms.
   fl_log(x, y, w, h, o)           Tronc couché moussu (bout coupé avec cernes, sillons d'écorce). w longueur, h diamètre ; o : moss (0,6), snow, end 'left' | 'right' | 'none', tilt, seed, depth. 0,01 ms.
   fl_leafLitter(x0, y0, x1, y1, o) Patch de litière de feuilles brunes et rousses à bord irrégulier, avec ou sans neige. o : snow 0..1 (0), scale (taille des feuilles, 1 ; 3 à 4 pour un gros plan), seed, cam, depth. 0,01 ms.
   fl_moss(x, y, w, o)             Coussin de mousse (tiges de sporophytes orangées). o : h, seed, depth. 0,01 ms.
   fl_ferns(t, o)                  Touffe de fougères aux frondes en arc, crosses non déroulées. o : x, y, h (26), n (6), unfurl 0..1 (0,3), seed, depth. 0,01 ms.
   fl_flowers(x0, y0, x1, y1, o)   Champ de fleurs de printemps en bouquets : crocus, saxifrages (coussins fleuris), anémones. o : kind 'mix' | 'crocus' | 'saxifrage' | 'anemone', density (1),
                                   zmin, zmax (échelle selon la profondeur y : 0,6 à 1,5), seed, t, cam, depth. ≈ 1,5 ms pour 150 fleurs.
   fl_snowGround(y0, y1, o)        Sol de neige : dérives ombrées de bleu, ombres portées, empreintes, scintillement, bords de fonte qui reculent. o : melt 0..1 (0), under 'mud' | 'litter' | 'grass'
                                   (ce qui apparaît sous la neige), leafK (taille des feuilles sous la neige, 1 ; 3 à 4 en gros plan), shadows [{x, y, len, w}] (ombres d'arbres), tracks [{x0, y0, x1, y1, kind 'paw' | 'boot' | 'hop', step}], sparkle (1), hz, seed, t, cam, depth. 0,05 ms (melt change : 40 ms/palier).
   fl_mudGround(y0, y1, o)         Terre détrempée : boue, flaques qui reflètent le ciel et brillent, feuilles, herbe sèche. o : under 'litter' | 'mud' | 'grass', tracks, seed, t, cam. 0,02 ms.
   fl_grassSpring(y0, y1, o)       Herbe neuve : fond de terre qui verdit + touffes qui ploient, plus pâle et plus fine vers l'horizon. o : grow 0..1 (1 : hauteur de l'herbe), base (false = sans fond), density, h (15, touffes proches), seed, t, cam. ≈ 9 ms (premier appel 65 ms).

   ── MEXIQUE ─────────────────────────────────────────────────────────────────────────────────────────────────────
   fl_saguaro(t, o)                Grand cactus côtelé à bras en candélabre, épines claires, liseré de lumière du couchant. o : x, y, h (120), arms 0 à 3 (2), bloom 0..1 (fleurs blanches au sommet), seed, depth. 0,01 ms.
   fl_prickly(t, o)                Figuier de Barbarie : raquettes à aréoles, fruits rouges. o : x, y, h (50), fruit 0..1 (0,8), seed. 0,01 ms.
   fl_agave(t, o)                  Agave : rosette de feuilles bleu-vert à dents et pointe sombre. o : x, y, h (40), n (15), stalk 0..1 (hampe florale), seed. 0,02 ms.
   fl_ocotillo(t, o)               Ocotillo : tiges épineuses en gerbe, fleurs rouges en flamme, ploie au vent. o : x, y, h (80), n (11), bloom 0..1, seed. 0,02 ms.
   fl_cholla(t, o)                 Cholla : bras articulés dorés, halo d'épines claires. o : x, y, h (50), seed. 0,01 ms.
   fl_dryShrub(t, o)               Buisson sec : brindilles ramifiées et quelques feuilles mortes. o : x, y, h (26), seed. 0,01 ms.
   fl_tumbleweed(x, y, t, o)       Boule d'herbe sèche qui roule (la rotation suit x : il suffit de faire avancer x). o : r rayon (12), hop hauteur des rebonds, dir ±1, spin, depth, cam. Dessinée à chaque image : 0,9 ms.
   fl_sand(y0, y1, o)              Sable : rides asymétriques, dunes douces, cailloux, traces, grains qui brillent. o : tracks [{x0, y0, x1, y1, kind 'lizard' | 'paw' | 'boot' | 'hop', step}], pebbles (60), rip (finesse des rides, 1), hz, seed, t, cam. 0,01 ms (premier appel 40 ms).
   fl_desertRock(x, y, w, h, kind, seed, o)  Rocher rouge stratifié : kind 'mesa' (table à étages) | 'spire' (aiguille) | 'ledge' (banc) | 'boulder' ; face sombre / face éclairée, éboulis. 0,01 ms.
   fl_boulders(x, y, w, o)         Groupe de rochers (fl_rock). o : n (4), mat, seed. 0,03 ms.

   ── AFRIQUE ─────────────────────────────────────────────────────────────────────────────────────────────────────
   fl_acacia(t, o)                 Acacia en parasol : tronc qui se divise, canopée plate en bouquets (vert sombre GR[0..2], un peu de LM clair côté soleil), dessous deux tons plus sombre. o : x, y, h (90), cw largeur
                                   de canopée (2,3·h), kind 'tortilis' | 'lean' | 'twin' | 'round', sil true (silhouette à contre-jour, liseré chaud), seed, depth. La brume du feuillage est plafonnée à 0,45 : il reste vert
                                   jusqu'à depth ≈ 0,6 ; plus loin passer sil: true (silhouette violette fondue dans le ciel). 0,01 ms.
   fl_baobab(t, o)                 Baobab : tronc en bouteille, branches courtes, touffes de feuilles. o : x, y, h (100), sil, leaf 0..1, seed. 0,01 ms.
   fl_savannaGrass(y0, y1, o)      Hautes herbes dorées à épis, plusieurs plans qui ploient en vagues. o : bands (3), h (hauteur du plan proche, 46), sweep (amplitude, 4,6), green (herbe verte), depth (plan lointain, 0,7),
                                   depthNear, seed, t, cam. ≈ 1 ms pour 3 plans.
   fl_termiteMound(t, o)           Termitière cathédrale ocre. o : x, y, h (40), seed. 0,01 ms.
   fl_savannaSoil(y0, y1, o)       Terre rouge sèche craquelée, cailloux, brins d'herbe sèche. o : cracks (1), pebbles (40), tracks, hz, seed, cam. 0,01 ms (premier appel 60 ms).
   fl_bush(t, o)                   Buisson en bouquets : kind 'olive' (savane) | 'green' (printemps) | 'dry' | 'winter' (persistant sous la neige). o : x, y, w (34), h, snow, seed. 0,02 ms.

   ── PREMIER PLAN ────────────────────────────────────────────────────────────────────────────────────────────────
   fl_grassFg(t, o)                Grandes lames d'herbe qui encadrent le bas de l'image (deux rangs, côté soleil clair, ombre sombre, épis). o : kind 'green' | 'spring' | 'dry' | 'gold' (dry et gold : lames fines et
                                   recourbées, côté ombre brun, pas de contour marine), side 'bottom' | 'left' | 'right' | 'both', h (80), n (40), dip (0,6 : creux au centre), y (ligne de pied, LH+3), cam, par (1,3),
                                   wind, seed. Dessinée à chaque image : ≈ 15 à 30 ms. TENUE DES BORDS : des brins débordent des deux bords de l'écran, donc aucun trou au bord pour |cam·par| ≤ 110 px (au-delà,
                                   le bord opposé se dégarnit).
   fl_branchFg(t, o)               Branche de premier plan qui encadre un coin. o : corner 'tl' | 'tr' | 'bl' | 'br', kind 'leafy' | 'spruce' | 'dead' | 'acacia', len (130), snow, blossom (fleurs), seed, cam. 0,03 ms.
                                   TENUE DES BORDS : le gros bout du tronc continue de 26 px hors cadre (sprite plus large côté ancré) et le décalage de caméra est borné à ±10 px : la branche reste accrochée au
                                   bord quel que soit cam (contrôlé à cam = ±100 dans les quatre coins), jamais de branche flottante coupée en plein cadre.
   fl_rock(x, y, w, h, kind, seed, o)  Rocher à contour irrégulier et pans coupés, 5 tons, fissures, liseré de lumière : kind 'round' | 'flat' | 'tall' | 'slab' | 'pebble' ;
                                   o : mat 'stone' | 'dark' | 'red' | 'sand' | 'warm', snow, moss, grass ('green' | 'dry' : brins au pied), depth, cam. 0,01 ms.

   ── UTILITAIRES UTILES AUX SEGMENTS ─────────────────────────────────────────────────────────────────────────────
   fl_wind(t, x, o)                Vent partagé, environ −1 … 1 (× o.wind) : pour faire bouger un animal ou un accessoire dans le même souffle que l'herbe (ex. poils : fl_wind(t, x) * 1,5).
   fl_env(o)                       { name, light, mist, rim, … } de l'ambiance (utile pour aligner une ombre ou une lueur sur le côté du soleil : light = −1 gauche, +1 droite).
   Précalcul : tout sprite est construit à la première demande puis mis en cache. Pour qu'aucune image ne porte ce coût, appeler une fois les mêmes fonctions avec les mêmes options
   dans INITS.push(() => { … }) de son fichier (les graines et tailles identiques donnent le même cache) ; le résultat de ce premier dessin est simplement effacé. Recette (3 lignes, voir fd_warm
   dans flore_demo.js ; les sprites sont déterministes, le préchauffage ne change aucun pixel) :
       const mesPlans = { g1_alaska(u, t) { fl_spruce(t, { x: 50, y: 300, h: 100 }); } };      // draw(u, t) de chaque plan, au niveau du fichier
       INITS.push(() => { for (const id in mesPlans) mesPlans[id](0.85, 3); clearL(); });
       function buildMonSegment(S) { shot('g1_alaska', S.t0, { draw: mesPlans.g1_alaska }); }

   ── ORDRE DE DESSIN CONSEILLÉ ───────────────────────────────────────────────────────────────────────────────────
   ciel (kit) → reliefs lointains (kit) → forêts/silhouettes lointaines → sol (fl_snowGround, fl_sand…) → plantes du plan moyen du fond vers l'avant (y croissant) → plantes proches
   → fl_grassFg / fl_branchFg → particules et vignette (kit). Un même `cam` passé à tous les appels donne la parallaxe (le sol et le proche vont plus vite que le lointain).
   Pour les plans lointains passer depth ≥ 0,6 (brume) ; pour une silhouette à contre-jour sur l'aube : sil: true.
   ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════ */

// ═══════════════════════════════════════════════════════════════════════════════════════
// 1. OUTILS INTERNES : hasard, bruit, couleurs, tampon de pixels, sprites, vent, éclairage
// ═══════════════════════════════════════════════════════════════════════════════════════
function fl_h(i, s = 0) { let h = Math.imul(i | 0, 374761393) + Math.imul(s | 0, 668265263) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296; }
function fl_h2(x, y, s = 0) { return fl_h(Math.imul(x | 0, 73856093) ^ Math.imul(y | 0, 19349663), s); }
function fl_n1(x, s = 0) {                                          // bruit de valeur 1D lisse (0..1)
  const i = Math.floor(x), f = x - i, u = f * f * f * (f * (f * 6 - 15) + 10);
  return fl_h(i, s) * (1 - u) + fl_h(i + 1, s) * u;
}
function fl_n2(x, y, s = 0) {                                       // bruit de valeur 2D lisse (0..1)
  const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
  const ux = fx * fx * fx * (fx * (fx * 6 - 15) + 10), uy = fy * fy * fy * (fy * (fy * 6 - 15) + 10);
  const a = fl_h2(ix, iy, s), b = fl_h2(ix + 1, iy, s), c = fl_h2(ix, iy + 1, s), d = fl_h2(ix + 1, iy + 1, s);
  return (a * (1 - ux) + b * ux) * (1 - uy) + (c * (1 - ux) + d * ux) * uy;
}
function fl_fbm(x, y, s = 0, oct = 3) {
  let a = 0, amp = 0.5, f = 1, tot = 0;
  for (let i = 0; i < oct; i++) { a += amp * fl_n2(x * f, y * f, s + i * 17); tot += amp; amp *= 0.5; f *= 2.03; }
  return a / tot;
}
const fl_cl = (v, a = 0, b = 1) => v < a ? a : v > b ? b : v;
// QUANTIFICATION des paramètres animables (neige, givre, feuillage, fruits, fleurs, pousse…). Règle d'or de tout sprite en cache : la clé du cache et
// le constructeur reçoivent la MÊME valeur (déjà arrondie par la fonction publique) ; sinon le sprite d'une case dépend de la première valeur brute
// rencontrée dans le processus et render(f) n'est plus une fonction pure du temps (4 processus de rendu démarrent chacun à un quart du film).
const fl_q = v => Math.round(v * 10) / 10;                          // au dixième : 11 sprites au plus pour un paramètre qui va de 0 à 1
const fl_q2 = v => Math.round(v * 100) / 100;                       // au centième (réglages fixes : gap, spread)
const fl_qd = (v, d) => v == null ? d : fl_q(v);                    // valeur donnée arrondie, sinon le défaut tel quel (constante, même hors grille)
const fl_ss = (a, b, x) => { const t = fl_cl((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const fl_bay = (x, y) => BAYER[((y & 3) << 2) | (x & 3)];

// ───────────── couleurs ─────────────
const fl_rgbM = {};
function fl_rgb(c) { if (Array.isArray(c)) return c; return fl_rgbM[c] || (fl_rgbM[c] = [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)]); }
function fl_mix(a, b, f) { a = fl_rgb(a); b = fl_rgb(b); return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f]; }
const fl_u32M = {};
function fl_u(c) { const r = fl_rgb(c), k = (r[0] << 16 | r[1] << 8 | r[2]); return fl_u32M[k] ?? (fl_u32M[k] = (0xFF000000 | (Math.round(r[2]) << 16) | (Math.round(r[1]) << 8) | Math.round(r[0])) >>> 0); }
const fl_snapM = new Map();
// familles de couleurs : une teinte dégradée ne peut retomber que sur des couleurs de la même famille (pas de vert qui vire au violet)
const fl_FAMD = {
  conifer: () => [...GR.slice(0, 6), ...NI.slice(0, 4), CY[0], CY[1], ...ST.slice(0, 3), BL[0]],
  snow: () => [...NE, WH[1], WH[2], WH[3], ST[5], ST[6], ST[7], DU[7], DU[6], SK[4], CY[4], CY[3], BL[4], NI[8], NI[9], AM[9], AM[10]],
  leaf: () => [...GR.slice(1), ...LM, ...YE, ...NI.slice(0, 4), ...OC.slice(0, 3), CY[1], ST[1], ST[2], AM[8], AM[9]],
  wood: () => [...WO, ...OC, ...AM.slice(0, 9), ...SK, ...NI.slice(0, 4), ...DU.slice(0, 4), ...ST.slice(0, 4), RD[0], RD[1], WH[0], WH[1]],
  stone: () => [...ST, ...NI.slice(0, 6), WH[0], WH[1], ...NE, ...DU.slice(0, 5), ...BL.slice(0, 3), SK[2], SK[3], WO[3], WO[4], OC[2]],
  warm: () => [...OC, ...WO, ...AM, ...SK, ...RD, ...DU, ...NI.slice(0, 4), YE[0], YE[1], YE[2], WH[0], WH[1], WH[2], ST[0], ST[1], ST[2]],
  sil: () => [...NI.slice(0, 5), ...DU, ...ST.slice(0, 3), RD[0], RD[1], WO[0], WO[1]],
};
const fl_famC = {};
function fl_snap(r, fam) {                                          // couleur RVB quelconque → couleur la plus proche de la palette (même métrique que le moteur)
  const key = (fam || '') + '|' + (Math.round(r[0]) << 16 | Math.round(r[1]) << 8 | Math.round(r[2])); let v = fl_snapM.get(key); if (v) return v;
  const cands = fam && fl_FAMD[fam] ? (fl_famC[fam] || (fl_famC[fam] = [...new Set(fl_FAMD[fam]())].map(fl_rgb))) : PAL;
  let best = 0, bd = 1e9;
  for (let i = 0; i < cands.length; i++) { const p = cands[i], rm = (r[0] + p[0]) / 2, dr = r[0] - p[0], dg = r[1] - p[1], db = r[2] - p[2], d = (2 + rm / 256) * dr * dr + 4 * dg * dg + (2 + (255 - rm) / 256) * db * db; if (d < bd) { bd = d; best = i; } }
  v = cands[best]; fl_snapM.set(key, v); return v;
}
const fl_hexM = new Map();
function fl_hexU(u) { let v = fl_hexM.get(u); if (!v) { v = '#' + (u & 255).toString(16).padStart(2, '0') + ((u >>> 8) & 255).toString(16).padStart(2, '0') + ((u >>> 16) & 255).toString(16).padStart(2, '0'); fl_hexM.set(u, v); } return v; }
const fl_us = (r, fam) => fl_u(fl_snap(fl_rgb(r), fam));                        // couleur ramenée à la palette, en u32
const fl_darkM = new Map();
function fl_darker(u, k = 0.5) {                                    // version plus sombre d'une couleur (contours sélectifs)
  const key = u + ':' + k; let v = fl_darkM.get(key); if (v !== undefined) return v;
  v = fl_us(fl_mix([u & 255, (u >>> 8) & 255, (u >>> 16) & 255], [8, 6, 22], k)); fl_darkM.set(key, v); return v;
}
const fl_lighter = (u, c, k) => fl_us(fl_mix([u & 255, (u >>> 8) & 255, (u >>> 16) & 255], c, k));

// ───────────── tampon de pixels (Uint32 ABGR) ─────────────
class fl_Buf {
  constructor(w, h) {
    this.w = w; this.h = h; this.c = mkCanvas(w, h); this.x = this.c.getContext('2d', { willReadFrequently: true });
    this.id = this.x.createImageData(w, h); this.d = new Uint32Array(this.id.data.buffer);
  }
  set(x, y, c) { if (x < 0 || y < 0 || x >= this.w || y >= this.h) return; this.d[(y | 0) * this.w + (x | 0)] = c; }
  get(x, y) { if (x < 0 || y < 0 || x >= this.w || y >= this.h) return 0; return this.d[(y | 0) * this.w + (x | 0)]; }
  rect(x, y, w, h, c) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, c); }
  hl(x0, x1, y, c) { if (y < 0 || y >= this.h) return; x0 = Math.max(0, Math.round(x0)); x1 = Math.min(this.w - 1, Math.round(x1)); y = y | 0; for (let x = x0; x <= x1; x++) this.d[y * this.w + x] = c; }
  line(x0, y0, x1, y1, c, th = 1) {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1; let e = dx + dy; const o = Math.floor(th / 2);
    for (let k = 0; k < 3000; k++) {
      if (th === 1) this.set(x0, y0, c); else for (let j = 0; j < th; j++) for (let i = 0; i < th; i++) this.set(x0 - o + i, y0 - o + j, c);
      if (x0 === x1 && y0 === y1) break; const e2 = 2 * e; if (e2 >= dy) { e += dy; x0 += sx; } if (e2 <= dx) { e += dx; y0 += sy; }
    }
  }
  disc(cx, cy, r, c) { cx = Math.round(cx); cy = Math.round(cy); for (let dy = -r; dy <= r; dy++) { const hw = Math.floor(Math.sqrt(Math.max(0, r * r + r * 0.6 - dy * dy))); this.hl(cx - hw, cx + hw, cy + dy, c); } }
  ell(cx, cy, rx, ry, c) { cx = Math.round(cx); cy = Math.round(cy); for (let dy = -ry; dy <= ry; dy++) { const k = 1 - (dy * dy) / (ry * ry + 0.6), hw = Math.floor(rx * Math.sqrt(Math.max(0, k)) + 0.35); this.hl(cx - hw, cx + hw, cy + dy, c); } }
  poly(pts, c) {
    let ymin = Infinity, ymax = -Infinity; for (const p of pts) { ymin = Math.min(ymin, p[1]); ymax = Math.max(ymax, p[1]); }
    ymin = Math.max(0, Math.ceil(ymin - 0.5)); ymax = Math.min(this.h - 1, Math.floor(ymax - 0.5));
    for (let y = ymin; y <= ymax; y++) {
      const yc = y + 0.5, xs = [];
      for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; if ((a[1] <= yc && b[1] > yc) || (b[1] <= yc && a[1] > yc)) xs.push(a[0] + (yc - a[1]) / (b[1] - a[1]) * (b[0] - a[0])); }
      xs.sort((p, q) => p - q);
      for (let i = 0; i + 1 < xs.length; i += 2) this.hl(Math.ceil(xs[i] - 0.5), Math.floor(xs[i + 1] - 0.5), y, c);
    }
  }
  flush() { this.x.putImageData(this.id, 0, 0); return this.c; }
}

// ───────────── cache de sprites (dessinés une fois, recopiés par drawImage) ─────────────
const fl_cache = new Map();
function fl_memo(key, fn) { let v = fl_cache.get(key); if (v === undefined) { v = fn(); fl_cache.set(key, v); } return v; }
// sprite w × h, ancre (ox, oy) = point de contact avec le sol ; fn(b) dessine dans le tampon b
function fl_spr(key, w, h, ox, oy, fn) {
  return fl_memo(key, () => { const b = new fl_Buf(w, h); fn(b); b.flush(); return { c: b.c, w, h, ox, oy, b }; });
}
function fl_blit(s, x, y, alpha = 1) {
  const dx = Math.round(x - s.ox), dy = Math.round(y - s.oy);
  if (dx > LW || dy > LH || dx + s.w < 0 || dy + s.h < 0) return;
  L.setTransform(1, 0, 0, 1, 0, 0); if (alpha < 1) L.globalAlpha = alpha; L.drawImage(s.c, dx, dy); L.globalAlpha = 1;
}
// recopie avec cisaillement : chaque rangée est décalée en x d'autant plus qu'elle est haute (la plante plie, la base reste en place)
function fl_blitSway(s, x, y, amp, o = {}) {
  const dx = Math.round(x - s.ox), dy = Math.round(y - s.oy), pw = o.pow ?? 1.6, span = o.span ?? Math.max(8, s.oy), floor = o.floor ?? 0;
  if (dx > LW + 12 || dy > LH || dx + s.w < -12 || dy + s.h < 0) return;
  L.setTransform(1, 0, 0, 1, 0, 0);
  let r0 = 0, sh0 = null;
  for (let r = 0; r <= s.h; r++) {
    let sh = null;
    if (r < s.h) { let hh = s.oy - r; if (o.abs) hh = Math.abs(hh); sh = hh <= floor ? 0 : Math.round(amp * Math.pow(fl_cl((hh - floor) / span), pw)); }
    if (sh !== sh0) { if (sh0 !== null && r > r0) L.drawImage(s.c, 0, r0, s.w, r - r0, dx + sh0, dy + r0, s.w, r - r0); r0 = r; sh0 = sh; }
  }
}
// bande large (herbes) : cisaillement qui varie le long de la bande (onde de vent) ; phase par colonne de cw pixels
function fl_blitWave(s, x, y, t, o = {}) {
  const dx = Math.round(x - s.ox), dy = Math.round(y - s.oy), cw = o.cw ?? 16, amp = o.amp ?? 3, pw = o.pow ?? 1.5, span = o.span ?? s.oy, wind = o.wind ?? 1, k = o.k ?? 0.05;
  L.setTransform(1, 0, 0, 1, 0, 0);
  for (let cx = 0; cx < s.w; cx += cw) {
    const wx = dx + cx + (o.worldX || 0), sw = Math.min(cw + 1, s.w - cx);
    if (dx + cx > LW + 8 || dx + cx + sw < -8) continue;
    const g = fl_wind(t, wx, { wind }) + (o.lean ?? 0.3) * wind;
    let r0 = 0, sh0 = null;
    for (let r = 0; r <= s.h; r++) {
      let sh = null;
      if (r < s.h) { const hh = s.oy - r; sh = hh <= 0 ? 0 : Math.round(amp * g * Math.pow(fl_cl(hh / span), pw)); }
      if (sh !== sh0) { if (sh0 !== null && r > r0) L.drawImage(s.c, cx, r0, sw, r - r0, dx + cx + sh0, dy + r0, sw, r - r0); r0 = r; sh0 = sh; }
    }
  }
}

// ───────────── vent partagé : la même oscillation pour toutes les plantes (phase selon x) ─────────────
// renvoie environ −1 … 1 (multiplié par o.wind, 1 par défaut)
function fl_wind(t, x, o) {
  const w = (o && o.wind != null) ? o.wind : 1;
  return w * (0.62 * Math.sin(t * 1.3 + x * 0.05) + 0.22 * Math.sin(t * 2.3 + x * 0.11 + 1.3) + 0.1 * Math.sin(t * 4.1 + x * 0.21 + 0.4) + 0.5 * Math.pow(Math.max(0, Math.sin(t * 0.85 + x * 0.012 + 0.8)), 3));   // + rafale qui traverse l'écran
}

// ───────────── ambiances (mêmes noms que les préréglages de ciel de kit.js) ─────────────
const fl_ENV = {
  alaskaDusk: { light: -1, mist: '#9aa4d6', rim: '#ffd9d2', shadow: '#10102e', shK: 0.6, lit: '#f090a4', liK: 0.18, cast: '#3d55aa', castK: 0.4 },
  alaskaNight: { light: -1, mist: '#2c3c84', rim: '#8ae0c0', shadow: '#05040f', shK: 0.6, lit: '#3aa8c4', liK: 0.2, cast: '#202a62', castK: 0.5 },
  alaskaSpring: { light: 1, mist: '#e4eef8', rim: '#fff8e8', shadow: '#2c3c84', shK: 0.16, lit: '#ffe08a', liK: 0.14, cast: '#ffffff', castK: 0 },
  desertDusk: { light: 1, mist: '#9a4a98', rim: '#ffd890', shadow: '#2e1a56', shK: 0.42, lit: '#ffc84a', liK: 0.38, cast: '#8641a4', castK: 0.12 },
  savannaDawn: { light: 1, mist: '#b8607e', rim: '#ffe6a0', shadow: '#2e1a56', shK: 0.34, lit: '#ffe08a', liK: 0.32, cast: '#a9529f', castK: 0.1 },
};
function fl_env(o) {
  const name = (o && o.env) || 'alaskaSpring', E = fl_ENV[name] || fl_ENV.alaskaSpring;
  return { name, light: (o && o.light) || E.light, mist: (o && o.mist) || E.mist, rim: (o && o.rim) || E.rim, shadow: E.shadow, shK: E.shK, lit: E.lit, liK: E.liK, cast: E.cast, castK: E.castK, night: name === 'alaskaNight' };
}
// brume selon la profondeur : 0 = premier plan, 1 = lointain
const fl_fog = d => Math.pow(fl_cl((d - 0.1) / 0.9), 0.85) * 0.93;
const fl_par = o => (o && o.par != null) ? o.par : 1.1 - 0.85 * fl_cl(o && o.depth != null ? o.depth : 0.4);
const fl_sx = (x, o) => x - ((o && o.cam) || 0) * fl_par(o);
const fl_sy = (y, o) => y - ((o && o.camY) || 0) * fl_par(o);
// rampe de couleurs (du sombre au clair) → tons en u32 : teintée par la lumière de l'ambiance, fondue dans la brume selon la profondeur, ramenée à la palette
function fl_tones(ramp, o, fam) {
  const E = fl_env(o), d = Math.round((o && o.depth != null ? o.depth : 0.4) * 10) / 10, k = ramp.join('') + '|' + E.name + E.mist + '|' + d + '|' + (o && o.fogK || 1) + '|' + (fam || '') + (o && o.keepFam ? '|k' : '');
  return fl_memo('tn|' + k, () => {
    const fg = fl_fog(d) * ((o && o.fogK) ?? 1), n = ramp.length;
    return ramp.map((c, i) => {
      const f = n > 1 ? i / (n - 1) : 0.5; let r = fl_rgb(c);
      const sk = fam === 'snow' ? 0.5 : 1; r = fl_mix(r, E.cast, E.castK * sk); r = fl_mix(r, E.shadow, E.shK * sk * (1 - f) * (1 - f)); r = fl_mix(r, E.lit, E.liK * f * f);
      if (d < 0.15) r = fl_mix(r, [5, 4, 15], 0.14 * (1 - f));
      r = fl_mix(r, E.mist, fg * (0.55 + 0.45 * f * 0.4 + 0.2 * (1 - f)));
      return fl_us(r, fg > 0.5 && !(o && o.keepFam) ? null : fam);      // keepFam : même au loin, la couleur reste dans la famille (pas de rochers mi-bruns mi-violets)
    });
  });
}
// jeux de tons à brume croissante (pour les sols : du proche au lointain) et choix par bruit (zones nettes, pas de trame)
function fl_toneSets(ramp, o, fam, n = 4) { const out = []; for (let i = 0; i < n; i++) out.push(fl_tones(ramp, { ...o, depth: 0.06 + (0.6 - 0.06) * (i / (n - 1)), fogK: (o && o.fogK) ?? 1 }, fam)); return out; }
function fl_pickSet(sets, farn, x, y, seed = 0) { const n = sets.length, v = farn * (n - 1) + (fl_fbm(x / 9, y / 2.4, seed + 55, 2) - 0.5) * 1.1; return sets[Math.max(0, Math.min(n - 1, Math.round(v)))]; }
// ton dithéré : v de 0 (ombre) à 1 (lumière) → indice dans n tons ; dk règle la netteté de la transition (grand = bandes nettes)
function fl_tone(v, n, x, y, dk = 3) {
  if (n <= 1) return 0;
  const vi = fl_cl(v) * (n - 1), i = Math.min(n - 2, Math.floor(vi)), f = vi - i, f2 = fl_cl((f - 0.5) * dk + 0.5);
  return fl_bay(x, y) < f2 ? i + 1 : i;
}
// éclairage d'une normale (nx, ny, nz) par une lumière venant de `light` (−1 gauche, +1 droite) et d'en haut ; renvoie 0 … 1
function fl_lam(nx, ny, nz, light) { const d = nx * light * 0.72 - ny * 0.5 + nz * 0.5; return fl_cl((d + 0.35) / 1.45); }

// ───────────── courbes et tubes ─────────────
function fl_cr(pts, n = 8) {                                        // Catmull-Rom à travers pts (n-dimensionnels) : n sous-divisions par segment
  const out = [], m = pts.length, dim = pts[0].length;
  if (m < 3) { for (let i = 0; i <= n; i++) out.push(pts[0].map((v, k) => v + (pts[m - 1][k] - v) * i / n)); return out; }
  for (let i = 0; i < m - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(m - 1, i + 2)];
    for (let j = 0; j < n; j++) {
      const s = j / n, v = [];
      for (let k = 0; k < dim; k++) v.push(0.5 * ((2 * p1[k]) + (-p0[k] + p2[k]) * s + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * s * s + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * s * s * s));
      out.push(v);
    }
  }
  out.push(pts[m - 1].slice()); return out;
}
// tube : points [x, y, largeur] ; colFn(lat, nx, ny, s, x, y) → couleur u32 (ou 0 pour ne rien poser) ; lat de −1 à 1 en travers du tube
function fl_tube(b, pts, colFn, o = {}) {
  const S = fl_cr(pts, o.sub ?? 12), dense = [];
  for (let i = 0; i < S.length - 1; i++) {
    const a = S[i], c = S[i + 1], dist = Math.hypot(c[0] - a[0], c[1] - a[1]), k = Math.max(1, Math.ceil(dist / 0.5));
    for (let j = 0; j < k; j++) { const f = j / k; dense.push([a[0] + (c[0] - a[0]) * f, a[1] + (c[1] - a[1]) * f, a[2] + (c[2] - a[2]) * f]); }
  }
  dense.push(S[S.length - 1]);
  const N = dense.length;
  for (let i = 0; i < N; i++) {
    const a = dense[Math.max(0, i - 2)], c = dense[Math.min(N - 1, i + 2)];
    let tx = c[0] - a[0], ty = c[1] - a[1]; const l = Math.hypot(tx, ty) || 1; tx /= l; ty /= l;
    const nx = -ty, ny = tx, p = dense[i], w = Math.max(0.8, p[2]), hw = w / 2, steps = Math.max(1, Math.ceil(w * 2));
    for (let j = 0; j <= steps; j++) {
      const lat = steps === 0 ? 0 : (j / steps) * 2 - 1, d = lat * hw, x = p[0] + nx * d, y = p[1] + ny * d;
      const col = colFn(lat, nx, ny, i / (N - 1), x, y);
      if (col) b.set(Math.round(x), Math.round(y), col);
    }
  }
}
// ombrage de tube standard : tons du sombre au clair, lumière latérale
function fl_shader(T, light, o = {}) {
  const dk = o.dk ?? 3, bias = o.bias ?? 0, rough = o.rough ?? 0.0;
  return (lat, nx, ny, s, x, y) => {
    const nz = Math.sqrt(Math.max(0, 1 - lat * lat)), v = fl_lam(nx * lat, ny * lat, nz, light) + bias + (rough ? (fl_h2(Math.round(x), Math.round(y), 5) - 0.5) * rough : 0);
    return T[fl_tone(v, T.length, Math.round(x), Math.round(y), dk)];
  };
}
// contour sélectif : chaque pixel vide au contact d'un pixel plein devient une version sombre de ce pixel
function fl_selout(b, k = 0.55, only = null) {
  const w = b.w, h = b.h, d = b.d, add = [];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x; if (d[i]) continue;
    let n = 0;
    if (x > 0 && d[i - 1]) n = d[i - 1]; else if (x < w - 1 && d[i + 1]) n = d[i + 1]; else if (y > 0 && d[i - w]) n = d[i - w]; else if (y < h - 1 && d[i + w]) n = d[i + w];
    if (n && (!only || only(x, y, n))) add.push(i, fl_darker(n, k));
  }
  for (let j = 0; j < add.length; j += 2) d[add[j]] = add[j + 1];
}
// liseré de lumière : le pixel le plus extérieur du bord tourné vers le soleil (et un peu du haut) prend la couleur rim
function fl_rim(b, light, rimU, o = {}) {
  const w = b.w, h = b.h, d = b.d, upper = o.top ?? true, add = [], skip = o.skip || null;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x, c = d[i]; if (!c || (skip && skip(c))) continue;
    const xs = x + light, sideEmpty = xs < 0 || xs >= w || !d[i + light], topEmpty = y === 0 || !d[i - w];   // bord du côté du soleil (light = +1 : le voisin de droite est vide)
    if (sideEmpty || (upper && topEmpty && fl_h2(x, y, 3) < (o.topP ?? 0.7))) add.push(i);
  }
  for (const i of add) d[i] = rimU;
}
// ombre portée au sol (ovale tramé) dans un tampon
function fl_gshadow(b, cx, cy, rx, ry, u, dens = 0.7) {
  for (let y = -ry; y <= ry; y++) for (let x = -rx; x <= rx; x++) {
    const e = (x * x) / (rx * rx) + (y * y) / (ry * ry); if (e > 1) continue;
    if (fl_bay(cx + x, cy + y) < dens * (1 - e * 0.6)) b.set(cx + x, cy + y, u);
  }
}
// bouquet de feuillage : ovale ébouriffé, 3 à 4 tons, lumière du côté soleil (bosse de feuilles, buisson, parasol d'acacia)
function fl_clump(b, cx, cy, rx, ry, T, light, o = {}) {
  const rag = o.rag ?? 0.38, seed = o.seed ?? 1, dk = o.dk ?? 3, bias = o.bias ?? 0, hi = o.hi ?? 0.28;
  for (let dy = -ry - 1; dy <= ry + 1; dy++) for (let dx = -rx - 1; dx <= rx + 1; dx++) {
    const nx = dx / rx, ny = dy / ry, e = nx * nx + ny * ny, x = Math.round(cx + dx), y = Math.round(cy + dy), hh = fl_h2(x, y, seed);
    if (e + (hh - 0.5) * rag > 1) continue;
    const nz = Math.sqrt(Math.max(0, 1 - e)), v = fl_lam(nx, ny, nz, light) + bias + (fl_h2(x * 3, y * 3, seed + 9) - 0.5) * hi;
    b.set(x, y, T[fl_tone(v, T.length, x, y, dk)]);
  }
}
// parcours d'une table de graines : retourne un générateur seed-based
const fl_rng = seed => rng((seed | 0) * 7919 + 13);
// options communes lues par toutes les fonctions
function fl_o(o) {
  o = o || {};
  return { x: o.x ?? 0, y: o.y ?? 0, depth: o.depth ?? 0.4, cam: o.cam || 0, wind: o.wind ?? 1, seed: o.seed ?? 1, E: fl_env(o), o };
}

// ───────────── pousse récursive de branches (bouleau, branches mortes, acacia, ocotillo, arbustes secs…) ─────────────
// cfg : r (générateur), curve (courbure), wob (bruit d'angle), droop (0..1 : la branche retombe), split (enfants par branche), sa (écart d'angle des enfants),
//       lk (rapport de longueur des enfants), wk (rapport de largeur), maxLvl, draw(b, pts, w, lvl) → dessine la polyligne, tip(x, y, lvl, ang), minLen
function fl_grow(b, x, y, ang, len, w, cfg, lvl = 0) {
  const r = cfg.r, n = Math.max(3, Math.round(len / 2.2)), pts = [[x, y, w]], droop = cfg.droop ?? 0;
  let a = ang, cx = x, cy = y;
  const angs = [a];
  for (let i = 1; i <= n; i++) {
    a += (r() - 0.5) * (cfg.wob ?? 0.3) + (cfg.curve ?? 0) / n;
    if (droop) { let d = Math.PI / 2 - a; while (d > Math.PI) d -= TAU; while (d < -Math.PI) d += TAU; a += d * droop * 0.09 * (0.4 + i / n); }
    cx += Math.cos(a) * len / n; cy += Math.sin(a) * len / n; pts.push([cx, cy, Math.max(1, w * (1 - 0.6 * i / n))]); angs.push(a);
  }
  cfg.draw(b, pts, w, lvl);
  if (lvl < (cfg.maxLvl ?? 2) && len > (cfg.minLen ?? 5)) {
    const sp_ = typeof cfg.split === 'function' ? cfg.split(lvl) : (cfg.split ?? 2), ns = Math.max(0, Math.round(sp_ * (0.7 + 0.6 * r())));
    for (let k = 0; k < ns; k++) {
      const f = (cfg.f0 ?? 0.3) + (cfg.f1 ?? 0.6) * r(), i = Math.min(n, Math.round(f * n)), p = pts[i], ca = angs[i] + (r() < 0.5 ? -1 : 1) * (cfg.sa ?? 0.8) * (0.7 + 0.6 * r());
      fl_grow(b, p[0], p[1], ca, len * (cfg.lk ?? 0.55) * (0.7 + 0.6 * r()) * (1 - f * 0.5), Math.max(1, w * (cfg.wk ?? 0.6)), cfg, lvl + 1);
    }
  }
  if (cfg.tip) cfg.tip(cx, cy, lvl, a);
}
// courbe polylignée dense → pixels d'1 px
function fl_poly1(b, pts, c) { for (let i = 0; i < pts.length - 1; i++) b.line(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], typeof c === 'function' ? c(i / pts.length) : c); }

// ═══════════════════════════════════════════════════════════════════════════════════════
// 2. ÉPICÉAS ET FORÊTS BORÉALES
// ═══════════════════════════════════════════════════════════════════════════════════════
const fl_GRN = [GR[0], GR[1], GR[2], GR[3], GR[4]];
const fl_SNW = [NE[0], NE[1], NE[2], NE[3], NE[4]];

// copie les pixels non transparents d'un tampon dans un autre
function fl_paste(dst, src, x, y) {
  const w = src.w, h = src.h, sd = src.d;
  for (let j = 0; j < h; j++) { const yy = y + j; if (yy < 0 || yy >= dst.h) continue; for (let i = 0; i < w; i++) { const c = sd[j * w + i]; if (!c) continue; const xx = x + i; if (xx < 0 || xx >= dst.w) continue; dst.d[yy * dst.w + xx] = c; } }
}

// sprite d'épicéa : étages de branches retombantes ; neige en paquets arrondis sur chaque étage (lumière côté soleil, creux bleutés), ombre portée de l'étage du dessus
function fl_spruceSpr(h, seed, snow, o) {
  const E = fl_env(o), light = E.light, dep = Math.round((o.depth ?? 0.4) * 10) / 10, slim = o.slim ?? 0.17;
  const key = `spr2|${h}|${seed}|${snow}|${E.name}|${E.mist}|${light}|${dep}|${slim}|${o.green || ''}`;
  const hw = Math.max(5, Math.round(h * slim)), W = hw * 2 + 14, H = h + 5;
  return fl_spr(key, W, H, W >> 1, H - 3, b => {
    const g = fl_tones(o.green || fl_GRN, o, 'conifer'), s = fl_tones(fl_SNW, o, 'snow'), wd0 = fl_tones([WO[0], WO[1], WO[2], WO[3]], o, 'wood'), r = fl_rng(seed), wd = dep > 0.5 ? [g[0], g[0], g[1], g[1]] : wd0;
    const cx = W >> 1, trunkH = Math.max(3, Math.round(h * 0.045)), crownH = h - trunkH, leader = Math.max(3, Math.round(crownH * 0.07));
    const n = Math.max(4, Math.round((crownH - leader) / (h < 50 ? 6 : h < 90 ? 8 : h < 140 ? 10 : 11))), sp = (crownH - leader) / n;
    const near = dep < 0.3, small = h < 60;
    // tronc visible sous les branches
    for (let y = crownH - 4; y < H - 3; y++) { const wdt = y > H - 8 ? 4 : 3; for (let x = 0; x < wdt; x++) b.set(cx - 1 + x, y, wd[x === 0 ? (light > 0 ? 1 : 2) : x === wdt - 1 ? (light > 0 ? 2 : 1) : 2]); }
    let prevFr = null;
    for (let i = 0; i < n; i++) {
      const q = (i + 1) / n, yB = leader + sp * (i + 1) + 1 + (r() - 0.5) * sp * 0.4, tierH = Math.max(7, sp * (2.0 + r() * 0.5)), yA = yB - tierH;
      const hwL = Math.max(3, Math.round(hw * (0.1 + 0.9 * Math.pow(q, 1.0)) * (0.86 + r() * 0.28))), hwR = Math.max(3, Math.round(hw * (0.1 + 0.9 * Math.pow(q, 1.0)) * (0.86 + r() * 0.28))), tip = 2.2 + r() * 1.6;
      const fw = small ? 3 : 4, nf = Math.ceil((hwL + hwR) / fw) + 3, fl = []; for (let f = 0; f < nf; f++) fl.push(r() < 0.22 ? 1.0 + r() * 0.7 : 0.25 + r() * 0.55);
      // paquets de neige le long de la pente
      const lumps = []; { let xx = -hwL - 1; while (xx < hwR + 2) { const w = (small ? 2 : 2.6) + r() * (small ? 2 : 3.4); lumps.push({ xc: xx + w, w, T: snow * ((small ? 2.2 : 3.6) + r() * (small ? 3.0 : 6.0)) }); xx += w * 1.55; } }
      const fr = {}, cxT = cx + Math.round(Math.sin(i * 1.3 + seed) * 1.4 + (r() - 0.5) * 1.6), x0 = cxT - hwL;
      for (let x = cxT - hwL; x <= cxT + hwR; x++) {
        const rel = x - cxT, dxs = rel < 0 ? rel / hwL : rel / hwR, dx = Math.abs(dxs), litSide = dxs * light >= 0 ? 1 : 0;
        const yTop = yA + (yB - tip - yA) * (0.8 * dx + 0.2 * Math.pow(dx, 2.4)) + (fl_h2(x, i, seed) - 0.5) * 1.1;
        const fi = Math.floor((x - x0) / fw), tr = ((x - x0) % fw) / fw, tri = 1 - Math.abs(tr * 2 - 1);
        const uplift = tierH * 0.36 * Math.pow(1 - dx, 1.1), droop = tierH * 0.18 * fl[fi] * (0.3 + 0.7 * tri) * (0.45 + 0.55 * dx) * (1 - 0.7 * Math.pow(dx, 3));
        const yBot = yB - uplift + droop;
        fr[x] = yBot;
        // épaisseur de neige en cette colonne (et la lumpe qui la porte)
        let T = 0, lp = null;
        for (const L_ of lumps) { const u = (rel - L_.xc) / L_.w; if (u > -1 && u < 1) { const tt = L_.T * Math.pow(1 - u * u, 0.55) * (1 - 0.65 * dx * dx) * (0.7 + 0.3 * Math.sin(Math.PI * Math.min(1, (1 - dx) * 1.1 + 0.15))); if (tt > T) { T = tt; lp = L_; } } }
        const sTop = yTop - T * 0.38, sBot = yTop + T * 0.62;
        for (let y = Math.ceil(Math.min(sTop, yTop)); y <= Math.round(yBot); y++) {
          const tb = yBot - y; let c;
          if (T > 0.8 && y >= Math.round(sTop) && y <= Math.round(sBot)) {
            const yn = (y - sTop) / Math.max(1, sBot - sTop), un = lp ? (rel - lp.xc) / lp.w : 0;
            let v = 0.52 + 0.36 * un * light + 0.3 * (0.5 - yn) * (0.6 + 0.4 * (1 - Math.abs(un))) - (yn > 0.8 ? 0.28 : 0);
            if (prevFr && prevFr[x] !== undefined && y < prevFr[x] + 3.2 && y > prevFr[x] - 0.5) v -= 0.3;
            c = s[fl_tone(v, 5, x, y, 3.2)];
          } else if (y < yTop - 0.5) continue;
          else {
            const v = fl_cl(1 - tb / (tierH * 0.6));
            let t = litSide ? (v > 0.5 ? 3 : v > 0.2 ? 2 : 1) : (v > 0.55 ? 2 : 1);
            const hh = fl_h2(x, y, seed + i);
            if (litSide && hh < 0.16 && v > 0.3 && dep < 0.5) t = Math.min(E.light === -1 ? 2 : 4, t + 1);
            if (!litSide && hh < 0.06) t = Math.min(3, t + 1);
            if (tri < 0.2 && tb > 2 && tb < tierH * 0.45) t = Math.max(0, t - 1);
            if (tb < 1.4 && hh < 0.6) t = Math.max(0, t - 1);
            if (T > 0.8 && y <= Math.round(sBot) + 2 && y > Math.round(sBot)) t = Math.min(t, 1);
            c = g[t];
          }
          b.set(x, y, c);
        }
        if (tri > 0.75 && fl[fi] > 0.7 && dx > 0.2) { b.set(x, Math.round(yBot) + 1, g[0]); if (fl[fi] > 1.2) b.set(x, Math.round(yBot) + 2, g[0]); }
      }
      prevFr = fr;
      // branches isolées qui dépassent de la silhouette : fines, retombantes, poudrées de neige
      if (!small && r() < 0.55) { const sd = r() < 0.5 ? -1 : 1, bx = cxT + sd * (sd < 0 ? hwL : hwR), by = Math.round(yB - tierH * 0.15), ln = 4 + Math.floor(r() * 6); for (let k = 0; k < ln; k++) { const xx = bx + sd * k, yy = by + Math.round(k * 0.3 + k * k * 0.02); b.set(xx, yy, g[1]); if (k > 1) b.set(xx, yy + 1, g[0]); if (k % 3 === 1 && snow > 0.2) b.set(xx, yy - 1, s[sd * light > 0 ? 3 : 2]); } }
    }
    // flèche terminale
    for (let y = 0; y < leader + 3; y++) { b.set(cx, y + 1, g[1]); if (y > 3) { b.set(cx - 1, y + 1, g[light > 0 ? 0 : 1]); b.set(cx + 1, y + 1, g[light > 0 ? 1 : 0]); } }
    if (snow > 0.15) { b.set(cx, 0, s[3]); b.set(cx, 1, s[light > 0 ? 3 : 2]); b.set(cx - 1, 2, s[1]); b.set(cx + 1, 2, s[2]); }
    // neige tassée au pied
    if (snow > 0.15 && dep < 0.7) { for (let x = -4; x <= 4; x++) b.set(cx + x, H - 3 + (Math.abs(x) > 2 ? 0 : -1), x * light > 0 ? s[4] : s[2]); }
    if (dep < 0.55) fl_selout(b, near ? 0.62 : 0.5);
  });
}
// épicéa : x, y = pied, h = hauteur (px) ; snow 0..1 ; sway minuscule
function fl_spruce(t, o = {}) {
  const p = fl_o(o), h = Math.round(o.h ?? 100), snow = fl_qd(o.snow, 0.85), spr = fl_spruceSpr(h, (o.seed ?? 1) | 0, snow, { ...o, depth: p.depth });
  const x = fl_sx(p.x, o), y = fl_sy(p.y, o);
  fl_blitSway(spr, x, y, 1.2 * fl_wind(t, p.x, o) * Math.min(1.6, h / 90), { pow: 2 });
}

// ───────── bandes de forêt ─────────
// une bande = une frise d'épicéas lointains (précalculée, plus large que l'écran pour la parallaxe)
function fl_forestBand(key, o, hMean, depth, seed, y0) {
  const M = 120, W = LW + 2 * M, E = fl_env(o), H = Math.round(hMean * 1.5) + 8;
  return fl_spr(key, W, H, M, H - 2, b => {
    const r = fl_rng(seed), mistU = fl_us(E.mist), list = [];
    let x = -M + r() * 6, i = 0;
    while (x < W - M) {
      const hh = Math.round(hMean * (0.65 + 0.7 * r())), gap = (o.gap ?? 0.55) * hMean * (0.12 + 0.3 * r());
      list.push({ x, hh, i }); x += hh * 0.30 * 2 * (o.spread ?? 0.62) + gap * 0.4 + 2; i++;
    }
    list.sort((a, c) => a.hh - c.hh);
    for (const tr of list) {
      const spr = fl_spruceSpr(tr.hh, 100 + (tr.i % 7), o.snow ?? 0.8, { ...o, depth }), px = Math.round(M + tr.x - spr.ox), py = H - 2 - spr.oy + (tr.hh < hMean * 0.8 ? -1 : 0);
      fl_paste(b, spr.b, px, py);
    }
    // sous-bois : une masse sombre au pied des arbres, au sommet irrégulier (pas de trouées de ciel au ras du sol : le ciel d'horizon, rose au couchant,
    // apparaissait sinon en petits motifs en flamme au creux entre deux arbres)
    { const T0 = fl_tones(fl_GRN, { ...o, depth }, 'conifer'), th = Math.round(H * 0.42);
      for (let x = 0; x < W; x++) { const top = H - 2 - Math.round(th * (0.55 + 0.45 * fl_n1(x * 0.21, seed))); for (let y = top; y < H - 1; y++) if (!b.d[y * W + x]) b.d[y * W + x] = T0[fl_bay(x, y) < 0.35 ? 1 : 0]; } }
    // brume basse : les pieds des arbres se fondent dans le brouillard
    const fogK = o.fog ?? 0.55;                                   // (la trame de brume ne démarre qu'à 12 % : pas de pixels de brume isolés à l'amorce)
    if (fogK > 0) for (let y = 0; y < H; y++) { const f = (fl_ss(H * 0.35, H - 1, y) * fogK - 0.12) / 0.88; if (f <= 0) continue; for (let xx = 0; xx < W; xx++) { const c = b.d[y * W + xx]; if (c && fl_bay(xx, y) < f) b.d[y * W + xx] = mistU; } }
  });
}
// forêt à plusieurs plans : o.y = ligne de sol du plan le plus proche ; o.bands = nombre de plans (3) ; o.h = hauteur moyenne des arbres du plan proche
// o.depth = profondeur du plan le plus lointain (0,85) ; o.depthNear = celle du plan proche (0,4)
function fl_spruceForest(t, o = {}) {
  o = { ...o, snow: fl_qd(o.snow, 0.8), fog: fl_qd(o.fog, 0.55), gap: o.gap == null ? 0.55 : fl_q2(o.gap), spread: o.spread == null ? 0.62 : fl_q2(o.spread) };   // quantifiés : clés de cache = valeurs lues par le constructeur
  const n = o.bands ?? 3, hN = o.h ?? 70, dF = o.depth ?? 0.85, dN = o.depthNear ?? Math.max(0.25, dF - 0.5), step = o.step ?? 9, E = fl_env(o);
  for (let k = 0; k < n; k++) {                                     // du plus lointain au plus proche
    const f = n > 1 ? k / (n - 1) : 1, depth = dF + (dN - dF) * f, hk = hN * (0.5 + 0.5 * f), yk = (o.y ?? 300) - (n - 1 - k) * step;
    const par = o.par != null ? o.par * (0.4 + 0.6 * f) : 1.1 - 0.85 * depth, oo = { ...o, depth, par };
    const key = `fb|${k}|${n}|${Math.round(hN)}|${o.seed ?? 1}|${E.name}|${E.mist}|${E.light}|${o.snow ?? 0.8}|${o.fog ?? 0.55}|${o.gap ?? 0.55}|${o.spread ?? 0.62}|${dF}|${dN}`;
    const band = fl_forestBand(key, { ...o, depth }, hk, depth, (o.seed ?? 1) * 31 + k * 7, yk);
    const shift = fl_cl((o.cam || 0) * par, -110, 110);
    let x = -shift;
    if (o.x0 != null || o.x1 != null) { L.save(); L.beginPath(); L.rect(o.x0 ?? 0, 0, (o.x1 ?? LW) - (o.x0 ?? 0), LH); L.clip(); }
    fl_blitSway(band, x, yk + (o.sink ?? 0), fl_wind(t, k * 40, o) * 0.6 * f, { pow: 2 });
    if (o.x0 != null || o.x1 != null) L.restore();
    if (o.mist !== false && k < n - 1) fl_mistBand(yk - 3, 14 + 6 * (1 - f), t, { ...o, depth, seedK: k, a: 0.5 * (o.mistA ?? 1) });
  }
}
// bande de brume tramée qui dérive lentement (y = ligne centrale)
function fl_mistBand(y, hh, t, o = {}) {
  const E = fl_env(o), u = fl_us(E.mist), a = o.a ?? 0.5, k = o.seedK ?? 0, sp = o.drift ?? 4, cam = (o.cam || 0) * fl_par(o);
  const b = fl_memo('mb|' + LW + 'x' + (hh * 2 + 2), () => new fl_Buf(LW, hh * 2 + 2));
  b.d.fill(0);
  for (let j = 0; j < hh * 2 + 2; j++) {
    const v = 1 - Math.abs(j - hh) / hh; if (v <= 0) continue;
    for (let x = 0; x < LW; x++) {
      const n = fl_n2((x + cam + t * sp) / 34, j / 5 + k * 7, 21 + k) * 0.7 + fl_n2((x + cam * 1.1 - t * sp * 0.6) / 13, j / 3, 5) * 0.3;
      if (fl_bay(x, j) < a * v * (n * 1.5 - 0.15)) b.d[j * LW + x] = u;
    }
  }
  b.flush(); L.setTransform(1, 0, 0, 1, 0, 0); L.drawImage(b.c, 0, Math.round(y - hh));
}

// ═══════════════════════════════════════════════════════════════════════════════════════
// 3. SOLS : neige (avec fonte), terre détrempée, litière de feuilles, sable, terre rouge de savane
// ═══════════════════════════════════════════════════════════════════════════════════════
const fl_GM = 100;                                                   // marge horizontale des sols (px de chaque côté) pour la parallaxe
// perspective du sol : s vaut 1 en bas de la bande et diminue vers l'horizon (hz = ligne d'horizon fictive)
const fl_gs = (y, y1, hz) => Math.max(0.1, (y - hz) / (y1 - hz));

// champ de base d'un sol (précalculé) : relief, éclairage par la pente, champ de « neige » S pour la fonte
// coordonnées étirées en largeur, plus fines vers l'horizon (pas de rayons convergents)
function fl_gfield(y0, y1, seed, hz, light, o = {}) {
  const key = `gf2|${y0}|${y1}|${seed}|${hz}|${light}|${o.ku ?? 1}|${o.kv ?? 1}|${o.rip ?? 0}|${o.kx ?? 0}`;
  return fl_memo(key, () => {
    const M = fl_GM, w = LW + 2 * M, h = y1 - y0, S = new Float32Array(w * h), V = new Float32Array(w * h), Hh = new Float32Array(w * h), Pd = new Float32Array(h * 3), ku = o.ku ?? 1, kv = o.kv ?? 1;
    const prev = new Float32Array(w), cur = new Float32Array(w);
    for (let y = 0; y < h; y++) {
      const ay = y0 + y, s = fl_gs(ay, y1, hz), yn = y / h, sx = (0.32 + 0.68 * Math.pow(yn, 0.85)) * ku, sy = (0.4 + 0.6 * yn) * kv, wv = (1 / s - 1) * 38 * kv;
      Pd[y * 3] = s; Pd[y * 3 + 1] = wv; Pd[y * 3 + 2] = sx;
      for (let x = 0; x < w; x++) {
        const wx = (x - M) / sx;
        let H = fl_fbm(wx / 110, y / (11 * sy), seed, 2) * 1.0 + 0.16 * fl_fbm(wx / 38, y / (5 * sy), seed + 3, 2);
        if (o.rip) { const ph = wv / o.rip + 2.2 * fl_fbm(wx / 70, y / (6 * sy), seed + 5, 2); const f = ph - Math.floor(ph); H += 0.5 * (f < 0.7 ? f / 0.7 : (1 - f) / 0.3); }
        cur[x] = H; Hh[y * w + x] = H;
        S[y * w + x] = fl_clamp01((fl_fbm(wx / 40, y / (6.5 * sy), seed + 11, 3) * 0.8 + fl_fbm(wx / 12, y / (2.6 * sy), seed + 13, 2) * 0.2 - 0.3) / 0.4);
      }
      for (let x = 1; x < w - 1; x++) {
        const gx = cur[x + 1] - cur[x - 1], gy = y > 0 ? cur[x] - prev[x] : 0;
        V[y * w + x] = 0.66 - gx * light * (o.kx || 6) + gy * (o.ky ?? 4);
      }
      prev.set(cur);
    }
    return { w, h, S, V, H: Hh, Pd, M };
  });
}
const fl_clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;

// empreintes de pas dans la neige ou le sable : o.tracks = [{ x0, y0, x1, y1, kind: 'paw' | 'boot' | 'hop' | 'lizard', step }]
function fl_stampTracks(b, y0, y1, hz, tracks, tones, light, M) {
  const [dk, md, lt] = tones;
  tracks.forEach((tr, ti) => {
    const dx = tr.x1 - tr.x0, dy = tr.y1 - tr.y0, len = Math.hypot(dx, dy) || 1, step = tr.step ?? 8, kind = tr.kind || 'paw', ang = Math.atan2(dy, dx), nxp = -Math.sin(ang), nyp = Math.cos(ang);
    const sd = Math.round(tr.x0 * 7 + tr.y0 * 13 + ti * 101), ph = fl_h(sd, 1) * TAU;      // graine de la piste : son tracé ne dépend que de ses coordonnées
    // point du chemin à l'abscisse curviligne d (px) : la droite des deux extrémités + un déport latéral sinueux (réduit par la perspective)
    const at = (d, amp, per) => { const f = d / len, s = fl_gs(tr.y0 + dy * f, y1, hz), lat = Math.sin(d / per * TAU + ph) * amp * s; return [tr.x0 + dx * f + nxp * lat, tr.y0 + dy * f + nyp * lat, s]; };
    const P = (x, y) => [Math.round(x + M), Math.round(y - y0)];
    if (kind === 'lizard') {                                      // piste de lézard : queue qui serpente (1 px) et paires d'empreintes 2 x 1 px de chaque côté
      const per = step * 3, amp = tr.amp ?? 3.6;
      let prev = null;
      for (let d = 0; d <= len; d += 0.5) {
        const [x, y] = at(d, amp, per), [X, Y] = P(x, y);
        if (prev && (prev[0] !== X || prev[1] !== Y)) { b.line(prev[0], prev[1], X, Y, Math.floor(d / 1.5) % 3 ? md : dk); }
        else if (!prev) b.set(X, Y, md);
        prev = [X, Y];
      }
      const n = Math.max(1, Math.floor(len / step));
      for (let k = 0; k < n; k++) {
        const d = (k + 0.5) * step + (fl_h(k, sd + 2) - 0.5) * 1.6;
        for (const side of [-1, 1]) {                                // une patte avant et une patte arrière, décalées d'un demi-pas : démarche en diagonale
          const dd = d + side * step * 0.22, [x, y, s] = at(dd, amp, per), off = side * (2.2 * s + 1.1), [X, Y] = P(x + nxp * off, y + nyp * off);
          b.set(X, Y, dk); b.set(X + 1, Y, dk); b.set(X + (side > 0 ? 2 : -1), Y + (side > 0 ? 1 : -1), md);       // empreinte 2 x 1 et un doigt qui dépasse
          if (s > 0.55) b.set(X - light, Y - 1, lt);                  // lèvre éclairée du côté du soleil
        }
      }
      return;
    }
    const n = Math.max(1, Math.floor(len / step));
    for (let k = 0; k < n; k++) {
      const d = (k + 0.5) * step + (fl_h(k, sd + 3) - 0.5) * 2, side = k % 2 ? 1 : -1;     // pas irrégulier (± 1 px), pattes alternées
      const [px_, py_, s] = at(d, 2.6, step * 5), lat = side * (1.5 + (fl_h(k, sd + 4) - 0.5)) * (tr.spread ?? 1) * Math.max(0.5, s) * 1.4;
      const cx = Math.round(px_ + nxp * lat + M + (fl_h(k, sd + 5) - 0.5) * 1.6), cy = Math.round(py_ + nyp * lat - y0 + (fl_h(k, sd + 6) - 0.5) * 1.2), sz = (tr.size ?? 1) * s;
      if (kind === 'boot') { const rx = Math.max(1, Math.round(2.2 * sz)), ry = Math.max(1, Math.round(1.4 * sz)); b.ell(cx, cy, rx, ry, dk); b.ell(cx - light, cy - 1, Math.max(0, rx - 1), Math.max(0, ry - 1), md); b.set(cx + light * rx, cy, lt); b.set(cx + light * rx, cy + 1, lt); }
      else if (kind === 'hop') { b.set(cx, cy, dk); b.set(cx + 1, cy, md); b.set(cx - 1, cy + 1, dk); b.set(cx + light, cy - 1, lt); }
      else {                                                         // empreinte de patte : coussinet et quatre doigts
        const k2 = Math.max(2, Math.round(sz * 2.4));
        b.ell(cx, cy + 1, k2, Math.max(1, Math.round(k2 * 0.7)), dk); b.set(cx - light * k2, cy + 1, md);
        for (const dx_ of [-1.5, -0.5, 0.5, 1.5]) { const X = cx + Math.round(dx_ * k2 * 0.9), Y = cy - Math.round(k2 * (1.6 - Math.abs(dx_) * 0.3)); b.set(X, Y, dk); if (k2 > 1) b.set(X, Y - 1, md); }
        b.set(cx + light * (k2 + 1), cy + 1, lt); b.set(cx + light * k2, cy, lt);
      }
    }
  });
}

// ───────────── neige ─────────────
// o : cam, par, melt (0..1), env, seed, hz, shadows [{x, y, len, w}], tracks, under ('mud' | 'litter' | 'grass'), depth, sparkle (1)
function fl_snowGround(y0, y1, o = {}) {
  o = o || {}; const E = fl_env(o), light = E.light, seed = (o.seed ?? 1) | 0, hz = o.hz ?? (y0 - 70), melt = Math.round(fl_cl(o.melt ?? 0) * 40) / 40, under = o.under || 'mud';
  const par = fl_par({ ...o, depth: o.depth ?? 0.12 }), shift = fl_cl((o.cam || 0) * par, -fl_GM, fl_GM);
  const key = `sg|${y0}|${y1}|${seed}|${hz}|${E.name}|${E.mist}|${light}|${melt}|${under}|${JSON.stringify(o.shadows || '')}|${JSON.stringify(o.tracks || '')}|${o.depth ?? ''}|${o.blue ?? 1}|${o.leafK ?? 1}`;
  const spr = fl_memo(key, () => fl_snowBuild(y0, y1, seed, hz, E, melt, under, o));
  fl_blit(spr, -shift, y0, 1);
  // scintillement
  const spk = o.sparkle ?? 1, t = o.t ?? 0;
  if (spk > 0 && melt < 0.9) {
    const T = fl_tones(fl_SNW, { ...o, depth: 0.1 }, 'snow'), hot = T[4];
    const n = Math.round(70 * spk), w = spr.w, h = spr.h;
    for (let k = 0; k < n; k++) {
      const hx = fl_h(k, seed + 70), hy = fl_h(k, seed + 71), ph = fl_h(k, seed + 72), x = Math.floor(hx * w), yy = Math.floor(Math.pow(hy, 0.8) * h);
      const f = ((t * 0.8 + ph * 7) % 1 + 1) % 1; if (f > 0.14) continue;
      if (spr.b.get(x, yy) !== hot && spr.b.get(x, yy) !== T[3]) continue;
      const sy = y0 + yy, a = f < 0.07 ? f / 0.07 : (0.14 - f) / 0.07, big = a > 0.6 && fl_h(k, seed + 73) < 0.5, X0 = x - fl_GM - shift;
      if (X0 < 0 || X0 >= LW) continue;
      R(X0, sy, 1, 1, WH[3]);
      if (big) { R(X0 - 1, sy, 1, 1, NE[4]); R(X0 + 1, sy, 1, 1, NE[4]); R(X0, sy - 1, 1, 1, NE[4]); R(X0, sy + 1, 1, 1, NE[4]); }
    }
  }
}
function fl_waterTones(E, o) {
  return fl_tones(o.water || (E.name === 'alaskaSpring' ? [ST[5], NE[0], NE[1], NE[3]] : [NI[4], BL[2], BL[3], ST[5]]), { ...o, depth: 0.15 }, 'snow');
}
function fl_snowBuild(y0, y1, seed, hz, E, melt, under, o) {
  const F = fl_gfield(y0, y1, seed, hz, E.light, {}), { w, h, S, V, M, Pd } = F, light = E.light, b = new fl_Buf(w, h);
  const sN = fl_tones(fl_SNW, { ...o, depth: 0.08 }, 'snow'), sS = fl_toneSets(fl_SNW, o, 'snow', 4);
  const U = fl_underBuild(F, y0, y1, seed, hz, E, under, o), P = fl_pfield(F, seed);
  const tm = fl_meltThr(F, melt), mask = new Uint8Array(w * h), wT = fl_waterTones(E, o), blue = o.blue ?? 1;
  // ombres portées (arbres) : assombrit le champ d'éclairage
  const V2 = new Float32Array(V);
  if (o.shadows) for (const sh of o.shadows) {
    const cx = sh.x + M - E.light * (sh.len || 40) * 0.5, cy = sh.y - y0 + 1, rx = (sh.len || 40) * 0.5, ry = (sh.w || 4) * 0.5;
    for (let y = Math.max(0, Math.floor(cy - ry - 1)); y <= Math.min(h - 1, Math.ceil(cy + ry + 1)); y++) for (let x = Math.max(0, Math.floor(cx - rx - 1)); x <= Math.min(w - 1, Math.ceil(cx + rx + 1)); x++) {
      const e = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2; if (e < 1) V2[y * w + x] -= 0.34 * fl_cl((1 - e) * 3.5);
    }
  }
  for (let y = 0; y < h; y++) {
    const fy = y / h, bias = fy * 0.14 * melt, farn = Math.pow(1 - fy, 1.7) * 0.8;
    for (let x = 0; x < w; x++) { const i = y * w + x; mask[i] = (S[i] > tm + bias) ? 1 : 0; }
    for (let x = 0; x < w; x++) {
      const i = y * w + x, snow = mask[i], Sn = S[i];
      if (snow) {
        const T = fl_pickSet(sS, farn, x, y, seed);
        let v = V2[i] + (fl_h2(x, y, seed) < 0.035 ? -0.1 : 0) + (1 - fy) * 0.05 + 0.06;
        if (blue !== 1) v -= (blue - 1) * 0.1;
        let c = T[fl_tone(v, 5, x, y, 3.4)];
        if (melt > 0.01) {
          const up = y > 0 && !mask[i - w], dn = y < h - 1 && !mask[i + w], dn2 = y < h - 2 && !mask[i + 2 * w];
          if (up) c = T[4]; else if (dn) c = T[1]; else if (dn2 && fl_h2(x, y, 4) < 0.6) c = T[2];
          if (Sn - (tm + bias) < 0.02 && fl_bay(x, y) < 0.5) c = U.d[i] || c;
        }
        b.d[i] = c;
      } else {
        const d = (tm + bias) - Sn; let c = U.d[i];
        if (melt > 0.02) {
          if (P[i] > 0.66 && d < 0.5) { const k = (P[i] - 0.66) / 0.08; c = wT[fl_cl(Math.floor(0.2 + k * 1.5 + (fl_h2(x >> 1, y, seed) < 0.25 ? 1 : 0)), 0, 3)]; if (k < 0.2) c = fl_darker(U.d[i], 0.3); }
          else if (d < 0.07) c = fl_darker(c, 0.28);
        }
        b.d[i] = c;
      }
    }
  }
  if (o.tracks) fl_stampTracks(b, y0, y1, hz, o.tracks, [fl_darker(sN[0], 0.3), sN[0], sN[4]], light, M);
  b.flush(); return { c: b.c, w, h, ox: M, oy: 0, b };
}
// seuil de fonte : la couverture de neige diminue linéairement avec melt (quantiles du champ S)
function fl_meltThr(F, melt) {
  if (!F.q) { const { w, h, S } = F, v = []; for (let y = 0; y < h; y += 2) for (let x = fl_GM; x < w - fl_GM; x += 3) v.push(S[y * w + x]); v.sort((a, b) => a - b); F.q = []; for (let i = 0; i <= 100; i++) F.q.push(v[Math.min(v.length - 1, Math.round(i / 100 * (v.length - 1)))]); }
  if (melt <= 0.001) return -0.1; if (melt >= 0.999) return 1.1;
  return F.q[Math.round(melt * 100)] - 0.002;
}
// champ de flaques (zones basses où l'eau de fonte s'accumule)
function fl_pfield(F, seed) {
  return fl_memo(`pf|${F.w}|${F.h}|${seed}`, () => {
    const { w, h, Pd, M } = F, P = new Float32Array(w * h);
    for (let y = 0; y < h; y++) { const sx = Pd[y * 3 + 2], sy = (0.4 + 0.6 * y / h); for (let x = 0; x < w; x++) P[y * w + x] = fl_fbm((x - M) / sx / 46, y / (5 * sy), seed + 41, 2); }
    return P;
  });
}

// ───────────── terre détrempée : couche sous la neige ─────────────
function fl_underBuild(F, y0, y1, seed, hz, E, kind, o) {
  const { w, h, Pd, M } = F, b = new fl_Buf(w, h), r = fl_rng(seed + 5), P = fl_pfield(F, seed);
  const mudS = fl_toneSets([WO[0], WO[1], WO[2], WO[3]], o, 'wood', 4);
  const lf = fl_tones([OC[1], OC[2], OC[3], OC[4]], { ...o, depth: 0.12 }, 'wood'), dg = fl_tones([AM[2], AM[3], AM[4], AM[5]], { ...o, depth: 0.12 }, 'wood');
  const wT = fl_waterTones(E, o);
  for (let y = 0; y < h; y++) {
    const yn = y / h, farn = Math.pow(1 - yn, 1.5) * 0.8, sx = Pd[y * 3 + 2], sy = 0.4 + 0.6 * yn;
    for (let x = 0; x < w; x++) {
      const wx = (x - M) / sx, T = fl_pickSet(mudS, farn, x, y, seed);
      const v = 0.42 + (fl_fbm(wx / 46, y / (5 * sy), seed + 21, 3) - 0.5) * 0.85 + (fl_h2(x, y, seed + 2) < 0.03 ? 0.3 : 0);
      b.d[y * w + x] = T[fl_tone(v, 4, x, y, 3.6)];
    }
  }
  if (o.puddles) for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const pv = P[y * w + x]; if (pv > 0.66) { const k = (pv - 0.66) / 0.08; b.d[y * w + x] = k < 0.2 ? fl_darker(b.d[y * w + x], 0.3) : wT[fl_cl(Math.floor(0.3 + k * 1.5 + (fl_h2(x >> 1, y, seed) < 0.25 ? 1 : 0)), 0, 3)]; } }
  // feuilles mortes : en tas (amas de feuilles posées les unes sur les autres), plus grosses près du spectateur
  const lT = fl_tones([OC[1], WO[3], WO[4], OC[2], OC[3]], { ...o, depth: 0.1 }, 'warm'), lD = fl_tones([WO[1], WO[2], WO[3]], { ...o, depth: 0.1 }, 'wood');
  const lk = o.leafK ?? 1, nCl = Math.round((kind === 'litter' ? 150 : kind === 'grass' ? 36 : 64) / lk), per = (kind === 'litter' ? 12 : kind === 'grass' ? 5 : 7) / lk;
  for (let c = 0; c < nCl; c++) {
    const cy = Math.floor(Math.pow(r(), 0.8) * h), cx = r() * w, yc = cy / h, rad = (7 + r() * 20) * (0.45 + yc) * lk;
    for (let k = 0; k < per * (0.4 + yc); k++) {
      const a = r() * TAU, d = Math.sqrt(r()) * rad, x = Math.round(cx + Math.cos(a) * d * 1.8), y = Math.round(cy + Math.sin(a) * d * 0.55); if (x < 0 || x >= w || y < 0 || y >= h || P[y * w + x] > 0.66) continue;
      const yn = y / h, sz = Math.max(1, Math.round((1 + yn * 1.5 * (0.6 + r() * 0.8)) * lk)), cv = r(), ti = cv < 0.3 ? 1 : cv < 0.55 ? 2 : cv < 0.75 ? 3 : cv < 0.9 ? 4 : 0, tn = lT[ti], hi = lT[Math.min(4, ti + 1)];
      const rx = sz + 1, ry = Math.max(1, Math.round(sz * 0.55)), sh = r() < 0.5 ? 0 : 1;
      b.ell(x, y, rx, ry, tn); b.set(x - E.light * (rx - 1), y - ry, hi); if (rx > 1) b.set(x - E.light * (rx - 2) + sh, y - ry, hi);
      b.set(x + (sh ? 1 : -1) * rx, y + (ry > 0 ? 1 : 0), lD[0]); if (sz >= 2) b.set(x - E.light * rx, y + ry, lD[1]);
    }
  }
  if (kind === 'grass' || kind === 'litter') for (let k = 0; k < (kind === 'grass' ? 520 : 110); k++) {
    const y = Math.floor(Math.pow(r(), 0.8) * h), yn = y / h, x = Math.floor(r() * w), len = 2 + Math.round((2 + r() * 4) * (0.5 + yn)), lean = Math.round((r() - 0.5) * 3);
    const gc = r() < 0.5 ? dg[1] : dg[2]; for (let j = 0; j < len; j++) b.set(x + Math.round(lean * j / len), y - j, j > len * 0.6 ? dg[3] : gc);
  }
  return b;
}

// zone de feuilles mortes (patch ovale à bord irrégulier) ; o.snow : proportion couverte de neige (0 = aucune)
// o : env, seed, snow, cam, par, depth
function fl_leafLitter(x0, y0, x1, y1, o = {}) {
  o = o || {}; const E = fl_env(o), light = E.light, seed = (o.seed ?? 1) | 0, snow = Math.round(fl_cl(o.snow ?? 0) * 20) / 20, par = fl_par({ ...o, depth: o.depth ?? 0.12 }), shift = (o.cam || 0) * par;
  const lk = o.scale ?? 1, W = Math.round(x1 - x0) + 8, H = Math.round(y1 - y0) + 6, key = `ll|${W}|${H}|${seed}|${E.name}|${E.mist}|${light}|${snow}|${o.depth ?? ''}|${lk}`;
  const spr = fl_spr(key, W, H, 4, 3, b => {
    const r = fl_rng(seed + 9), mud = fl_tones([WO[0], WO[1], WO[2], WO[3]], { ...o, depth: o.depth ?? 0.12 }, 'wood'), lf = fl_tones([OC[1], OC[2], OC[3], OC[4], AM[5], AM[6]], { ...o, depth: o.depth ?? 0.12 }, 'wood');
    const sN = fl_tones(fl_SNW, { ...o, depth: o.depth ?? 0.1 }, 'snow'), cx = W / 2, cy = H / 2, rx = W / 2 - 3, ry = H / 2 - 2, inside = (x, y) => { const e = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 + (fl_n2(x / 6, y / 3, seed) - 0.5) * 0.5; return e; };
    const dens = {};
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const e = inside(x, y); if (e > 1) continue;
      const edge = fl_cl((1 - e) * 4); if (fl_bay(x, y) > edge + 0.2) continue;
      b.set(x, y, mud[fl_tone(0.35 + (fl_h2(x, y, seed) - 0.5) * 0.7 + (y / H - 0.5) * 0.2, 4, x, y, 3)]);
    }
    const nL = Math.round(W * H / (5.5 * lk * lk));
    for (let k = 0; k < nL; k++) {
      const x = Math.round(r() * W), y = Math.round(Math.pow(r(), 0.85) * H), e = inside(x, y); if (e > 0.95) continue;
      const sz = Math.max(1, Math.round((1 + (y / H) * 1.6 * (0.6 + r() * 0.7)) * lk)), cv = r(), tn = cv < 0.3 ? lf[1] : cv < 0.6 ? lf[2] : cv < 0.85 ? lf[3] : lf[0];
      b.ell(x, y, sz, Math.max(0, sz - 1 + (r() < 0.4 ? 1 : 0)), tn); b.set(x - light, y - 1, lf[Math.min(5, (cv < 0.3 ? 2 : cv < 0.6 ? 3 : 4))]); if (sz > 1 && r() < 0.5) b.set(x + sz, y, lf[0]);
    }
    if (snow > 0) {
      const thr = 1 - snow;                                          // plus il y a de neige, plus le seuil est bas
      const m = new Uint8Array(W * H);
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const e = inside(x, y); if (e > 0.98) continue; const sv = fl_fbm(x / 9, y / 4, seed + 4, 3) * 0.7 + fl_fbm(x / 3.5, y / 1.7, seed + 6, 2) * 0.3; m[y * W + x] = (sv > thr * 0.55 + 0.14 && b.get(x, y)) ? 1 : 0; }
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        if (!m[y * W + x]) continue;
        const up = y > 0 && !m[(y - 1) * W + x], dn = y < H - 1 && !m[(y + 1) * W + x];
        let v = 0.62 + (fl_h2(x, y, seed + 3) - 0.5) * 0.15 + (x - cx) / rx * light * 0.1;
        let c = sN[fl_tone(v, 5, x, y, 2.6)]; if (up) c = sN[4]; else if (dn) c = sN[1];
        if (fl_h2(x, y, seed + 8) < 0.06 && !up) c = b.get(x, y);    // des feuilles percent
        b.set(x, y, c);
      }
    }
  });
  fl_blit(spr, x0 - shift + 4, y0, 1);
}

// terre détrempée (fin de l'hiver) : boue, flaques qui reflètent le ciel, feuilles et herbe sèche ; o.puddle : intensité des flaques
function fl_mudGround(y0, y1, o = {}) {
  o = o || {}; const E = fl_env(o), seed = (o.seed ?? 1) | 0, hz = o.hz ?? (y0 - 70), par = fl_par({ ...o, depth: o.depth ?? 0.12 }), shift = fl_cl((o.cam || 0) * par, -fl_GM, fl_GM), t = o.t ?? 0;
  const key = `mg|${y0}|${y1}|${seed}|${hz}|${E.name}|${E.mist}|${E.light}|${o.under || 'litter'}|${o.depth ?? ''}|${o.leafK ?? 1}|${JSON.stringify(o.tracks || '')}`;
  const spr = fl_memo(key, () => {
    const F = fl_gfield(y0, y1, seed, hz, E.light, {}), U = fl_underBuild(F, y0, y1, seed, hz, E, o.under || 'litter', { ...o, puddles: o.puddle !== 0 });
    if (o.tracks) fl_stampTracks(U, y0, y1, hz, o.tracks, [fl_us(WO[0]), fl_us(WO[1]), fl_us(WO[4])], E.light, F.M);
    U.flush(); return { c: U.c, w: F.w, h: F.h, ox: F.M, oy: 0, b: U };
  });
  fl_blit(spr, -shift, y0, 1);
  // éclats de lumière sur l'eau
  const n = 26, skyT = fl_waterTones(E, o);
  for (let k = 0; k < n; k++) {
    const x = Math.floor(fl_h(k, seed + 80) * spr.w), y = Math.floor(fl_h(k, seed + 81) * spr.h), c = spr.b.get(x, y); if (skyT.indexOf(c) < 0) continue;
    const f = ((t * 0.7 + fl_h(k, seed + 82) * 5) % 1 + 1) % 1; if (f > 0.2) continue;
    const X0 = x - fl_GM - shift; R(X0, y0 + y, 1 + (f < 0.1 ? 1 : 0), 1, WH[3]);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════════════
// 3b. SOLS SECS : sable rippé du désert, terre rouge fissurée de la savane
// ═══════════════════════════════════════════════════════════════════════════════════════
const fl_SANDR = [OC[1], OC[2], OC[3], AM[5], AM[6], AM[7]];
const fl_SOILR = [OC[0], OC[1], OC[2], OC[3], OC[4]];

// cailloux semés dans un tampon de sol : positions en pixels du tampon, taille liée à la perspective
function fl_pebbles(b, F, seed, n, light, T, o = {}) {
  const r = fl_rng(seed + 77), { w, h, Pd } = F;
  for (let k = 0; k < n; k++) {
    const y = Math.floor(Math.pow(r(), 0.85) * (h - 3)) + 1, yn = y / h, x = Math.floor(r() * w), sz = Math.max(1, Math.round((0.8 + r() * 2.2) * (0.35 + yn * 1.1) * (o.size ?? 1)));
    const rx = sz + (r() < 0.5 ? 1 : 0), ry = Math.max(1, Math.round(sz * 0.62)), pick = r();
    b.ell(x - light, y + 1, rx, ry, T[0]);                                    // ombre portée du côté opposé au soleil
    b.ell(x, y, rx, ry, T[2 + (pick < 0.3 ? 1 : 0)]);
    if (rx > 1) { b.ell(x + light * 1, y - 1, Math.max(0, rx - 1), Math.max(0, ry - 1), T[3 + (pick > 0.7 ? 1 : 0)]); }
    b.set(x + light * (rx), y - 1, T[4]); b.set(x - light * rx, y, T[1]);
  }
}
// sable : rides asymétriques (dos doux éclairé, face abrupte à l'ombre), dunes douces, cailloux, traces
// o : cam, par, env, seed, hz, pebbles (60), tracks [{x0,y0,x1,y1,kind:'lizard'|'paw'|'boot'|'hop', step}], rip (finesse des rides), depth
function fl_sand(y0, y1, o = {}) {
  o = o || {}; const E = fl_env(o), light = E.light, seed = (o.seed ?? 1) | 0, hz = o.hz ?? (y0 - 70), par = fl_par({ ...o, depth: o.depth ?? 0.12 }), shift = fl_cl((o.cam || 0) * par, -fl_GM, fl_GM), t = o.t ?? 0;
  const key = `sd|${y0}|${y1}|${seed}|${hz}|${E.name}|${E.mist}|${light}|${JSON.stringify(o.tracks || '')}|${o.pebbles ?? 60}|${o.rip ?? 1}|${o.depth ?? ''}`;
  const spr = fl_memo(key, () => {
    const F = fl_gfield(y0, y1, seed, hz, light, { kx: 7 }), { w, h, V, M, Pd } = F, b = new fl_Buf(w, h);
    const sN = fl_tones(fl_SANDR, { ...o, depth: 0.05 }, 'warm'), sS = fl_toneSets(fl_SANDR, o, 'warm', 4), rip = o.rip ?? 1;
    for (let y = 0; y < h; y++) {
      const yn = y / h, sx = Pd[y * 3 + 2], per = (2.6 + 7 * yn) / rip, ph0 = (h / 7) * Math.log((2.6 + 7 * yn) / 2.6) * rip, amp = 0.08 + 0.26 * Math.pow(yn, 0.75), farn = Math.pow(1 - yn, 1.6) * 0.8;
      for (let x = 0; x < w; x++) {
        const i = y * w + x, wx = (x - M) / sx, ph = ph0 + 0.8 * fl_fbm(wx / 70, y / (6 * (0.4 + 0.6 * yn)), seed + 5, 2) + 0.25 * fl_n2(wx / 16, y / 6, seed + 6), f = ph - Math.floor(ph);
        const prof = f < 0.66 ? 0.25 + 0.5 * (f / 0.66) : -0.55 + (f - 0.66) * 0.5;
        let v = 0.52 + (V[i] - 0.66) * 0.7 + prof * amp + (fl_h2(x, y, seed) < 0.02 ? 0.1 : 0);
        const T = fl_pickSet(sS, farn, x, y, seed);
        b.d[i] = T[fl_tone(v, 6, x, y, 3.4)];
      }
    }
    fl_pebbles(b, F, seed, o.pebbles ?? 60, light, fl_tones([WO[1], ST[2], ST[3], ST[5], ST[6]], { ...o, depth: 0.1 }, 'stone'), o);
    if (o.tracks) fl_stampTracks(b, y0, y1, hz, o.tracks, [fl_darker(sN[1], 0.3), sN[1], sN[5]], light, M);
    b.flush(); return { c: b.c, w, h, ox: M, oy: 0, b };
  });
  fl_blit(spr, -shift, y0, 1);
  // grains qui brillent au soleil couchant
  const n = 22; for (let k = 0; k < n; k++) { const x = Math.floor(fl_h(k, seed + 60) * spr.w), y = Math.floor(fl_h(k, seed + 61) * spr.h), f = ((t * 0.6 + fl_h(k, seed + 62) * 6) % 1 + 1) % 1; if (f > 0.1) continue; const X0 = x - fl_GM - shift; if (X0 >= 0 && X0 < LW) R(X0, y0 + y, 1, 1, AM[10]); }
}

// terre rouge sèche de la savane : craquelures polygonales, cailloux, petits brins d'herbe sèche ; o comme fl_sand (+ o.cracks 0..1)
function fl_savannaSoil(y0, y1, o = {}) {
  o = o || {}; const E = fl_env(o), light = E.light, seed = (o.seed ?? 1) | 0, hz = o.hz ?? (y0 - 70), par = fl_par({ ...o, depth: o.depth ?? 0.12 }), shift = fl_cl((o.cam || 0) * par, -fl_GM, fl_GM);
  const key = `sl|${y0}|${y1}|${seed}|${hz}|${E.name}|${E.mist}|${light}|${o.cracks ?? 1}|${o.pebbles ?? 40}|${o.depth ?? ''}|${JSON.stringify(o.tracks || '')}`;
  const spr = fl_memo(key, () => {
    const F = fl_gfield(y0, y1, seed, hz, light, { kx: 6 }), { w, h, V, M, Pd } = F, b = new fl_Buf(w, h), r = fl_rng(seed + 3);
    const sN = fl_tones(fl_SOILR, { ...o, depth: 0.05 }, 'warm'), sS = fl_toneSets(fl_SOILR, o, 'warm', 4), grass = fl_tones([OC[1], OC[3], AM[4], AM[6], AM[8]], { ...o, depth: 0.1 }, 'warm'), ck = o.cracks ?? 1;
    for (let y = 0; y < h; y++) {
      const yn = y / h, sx = Pd[y * 3 + 2], sy = 0.4 + 0.6 * yn, farn = Math.pow(1 - yn, 1.6) * 0.8, cs = 20;
      for (let x = 0; x < w; x++) {
        const i = y * w + x, wx = (x - M) / sx, T = fl_pickSet(sS, farn, x, y, seed);
        let v = V[i] * 0.85 + 0.08 + (fl_fbm(wx / 38, y / (4.5 * sy), seed + 14, 2) - 0.5) * 0.45 + (fl_h2(x, y, seed) < 0.04 ? 0.14 : fl_h2(x, y, seed + 2) < 0.04 ? -0.14 : 0);
        let tone = fl_tone(v, 5, x, y, 3.4), c = T[tone];
        if (ck > 0) {                                                // craquelures : distance au 2e voisin le plus proche d'un semis de points (cellules de Voronoï)
          const u = wx / cs, vv = y / (3.2 * sy) / (cs / 8), iu = Math.floor(u), iv = Math.floor(vv); let d1 = 9, d2 = 9;
          for (let a = -1; a <= 1; a++) for (let q = -1; q <= 1; q++) { const px_ = iu + a + fl_h2(iu + a, iv + q, seed + 31), py_ = iv + q + fl_h2(iu + a, iv + q, seed + 32), d = Math.hypot((u - px_), (vv - py_) * 1.0); if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) d2 = d; }
          const e = d2 - d1; if (e < 0.07 * ck + 0.01 * yn) c = T[0]; else if (e < 0.12 * ck + 0.012 * yn && (light > 0 ? u - Math.floor(u) > 0.5 : u - Math.floor(u) < 0.5)) c = T[Math.min(4, tone + 1)];
        }
        b.d[i] = c;
      }
    }
    fl_pebbles(b, F, seed, o.pebbles ?? 40, light, fl_tones([WO[1], ST[2], ST[3], ST[4], ST[6]], { ...o, depth: 0.1 }, 'stone'), o);
    for (let k = 0; k < 160; k++) {                                  // brins d'herbe sèche
      const y = Math.floor(Math.pow(r(), 0.8) * (h - 4)) + 3, yn = y / h, x = Math.floor(r() * w), len = 2 + Math.round((2 + r() * 4) * (0.4 + yn)), lean = Math.round((r() - 0.5) * 4);
      for (let j = 0; j < len; j++) b.set(x + Math.round(lean * j / len), y - j, j > len * 0.55 ? grass[3 + (light * lean > 0 ? 1 : 0)] : grass[1 + (r() < 0.5 ? 1 : 0)]);
    }
    if (o.tracks) fl_stampTracks(b, y0, y1, hz, o.tracks, [fl_darker(sN[0], 0.3), sN[0], sN[4]], light, M);
    b.flush(); return { c: b.c, w, h, ox: M, oy: 0, b };
  });
  fl_blit(spr, -shift, y0, 1);
}

// ═══════════════════════════════════════════════════════════════════════════════════════
// 4. SOUS-BOIS ET PRINTEMPS : bouleaux, branches mortes, troncs moussus, mousse, fougères, fleurs, herbe neuve
// ═══════════════════════════════════════════════════════════════════════════════════════
const fl_BARK = [ST[5], ST[6], WH[0], WH[1], WH[2]];
const fl_LEAFR = [LM[0], LM[1], LM[2], LM[3], LM[4], LM[5]];

// ───────────── bouleau blanc ─────────────
function fl_birchSpr(h, seed, leaf, snow, stems, o) {
  const frost = o.frost ?? 0;
  const E = fl_env(o), light = E.light, dep = Math.round((o.depth ?? 0.4) * 10) / 10;
  const key = `bi3|${h}|${seed}|${leaf}|${snow}|${frost}|${stems}|${E.name}|${E.mist}|${light}|${dep}`;
  const W = Math.round(h * 0.8) + 24, H = h + 6;
  return fl_spr(key, W, H, W >> 1, H - 3, b => {
    const r = fl_rng(seed), T = fl_tones(fl_BARK, o, 'snow'), dark = fl_tones([NI[0], ST[0], ST[1], ST[2]], o, 'conifer'), twg = fl_tones([DU[0], DU[1], WO[1], WO[2], WO[3]], o, 'wood'), lv = fl_tones(fl_LEAFR, o, 'leaf'), sn = fl_tones(fl_SNW, o, 'snow');
    const cx = W >> 1, base = H - 4, w0 = Math.max(3, Math.min(9, Math.round(h * 0.046))), stemsP = [], tips = [];
    const barkSh = (lat, nx, ny, s, px_, py_) => { const nz = Math.sqrt(Math.max(0, 1 - lat * lat)); return T[fl_tone(fl_lam(nx * lat, ny * lat, nz, light) * 1.05 + 0.1 + (fl_h2(Math.round(px_), Math.round(py_), seed) - 0.5) * 0.1, 5, Math.round(px_), Math.round(py_), 3.2)]; };
    for (let st = 0; st < stems; st++) {
      const off = (st - (stems - 1) / 2), hh = h * (stems === 1 ? 0.97 : 0.78 + r() * 0.2), sw = stems === 1 ? w0 : Math.max(3, w0 - 1), lean = (stems === 1 ? (r() - 0.5) * 0.05 : off * 0.12 + (r() - 0.5) * 0.04), sx = cx + off * 5;
      const pts = [], nP = 8;
      for (let k = 0; k <= nP; k++) { const f = k / nP; pts.push([sx + lean * hh * f * f * 1.8 + Math.sin(f * 3.4 + seed + st) * 1.6 * f + off * 7 * f, base - hh * f, Math.max(1.4, sw * (1 - f * 0.8))]); }
      fl_tube(b, pts, barkSh);
      const Lp = fl_cr(pts, 14);
      for (let k = 0; k < Lp.length; k++) {                          // lenticelles : traits sombres horizontaux
        const s = k / Lp.length, p = Lp[k], prob = (s < 0.22 ? 0.5 : 0.16) * (1 - s * 0.5);
        if (fl_h(k, seed + st * 9) < prob) {
          const ww = p[2], len = 1 + Math.floor(fl_h(k, seed + 5) * Math.min(5, ww * 0.9)), off2 = Math.round((fl_h(k, seed + 7) - 0.5) * (ww - len));
          for (let q = 0; q < len; q++) b.set(Math.round(p[0] + off2 + q), Math.round(p[1]), dark[s < 0.2 ? 0 : 1 + (fl_h(k, 3) < 0.4 ? 1 : 0)]);
          if (s < 0.3 && fl_h(k, seed + 8) < 0.5) for (let q = 0; q < len; q++) b.set(Math.round(p[0] + off2 + q), Math.round(p[1]) + 1, dark[1]);
        }
      }
      for (let k = 0; k < Lp.length * 0.13; k++) { const p = Lp[k]; for (let dx = -Math.floor(p[2] / 2); dx <= Math.floor(p[2] / 2); dx++) if (fl_h2(Math.round(p[0]) + dx, Math.round(p[1]), seed + 4) < 0.6 - k / (Lp.length * 0.13) * 0.5) b.set(Math.round(p[0] + dx), Math.round(p[1]), dark[fl_h2(dx, k, 2) < 0.4 ? 0 : 1]); }
      stemsP.push({ pts, hh });
    }
    // branches : montent en s'éloignant du tronc, puis retombent ; brindilles fines et sombres qui pendent
    const nB = Math.round(h / 11) + stems * 2, list = [];
    for (let i = 0; i < nB; i++) list.push({ f: 0.3 + 0.64 * Math.pow(r(), 0.85), side: r() < 0.5 ? -1 : 1, st: Math.floor(r() * stems) });
    list.sort((a, c) => a.f - c.f);
    const cfg = {
      r, curve: 0, wob: 0.4, droop: 0.4, split: 1.9, sa: 0.55, lk: 0.55, wk: 0.6, maxLvl: 2, minLen: 6,
      draw: (bb, pts, w, lvl) => {
        if (lvl === 0 && w >= 2.6) { const cut = Math.floor(pts.length * 0.45); fl_tube(bb, pts.slice(0, cut + 1).map((p, i) => [p[0], p[1], Math.max(1.6, p[2] * 0.8)]), barkSh); fl_poly1(bb, pts.slice(cut), twg[2]); }
        else fl_poly1(bb, pts, lvl === 0 ? twg[2] : lvl === 1 ? twg[2] : twg[1]);
      },
      tip: (x, y, lvl, a) => { tips.push([x, y, lvl]); },
    };
    for (const br of list) {
      const sp = stemsP[br.st], pts = sp.pts, pf = br.f * (pts.length - 1), i = Math.min(pts.length - 2, Math.floor(pf)), fr = pf - i;
      const px_ = pts[i][0] + (pts[i + 1][0] - pts[i][0]) * fr, py_ = pts[i][1] + (pts[i + 1][1] - pts[i][1]) * fr;
      const len = h * (0.12 + 0.2 * (1 - br.f * 0.6)) * (0.7 + r() * 0.6), ang = -Math.PI / 2 + br.side * (0.5 + r() * 0.5);
      fl_grow(b, px_, py_, ang, len, Math.max(2, pts[i][2] * 0.4), cfg, 0);
    }
    // neige sur le dessus des branches claires et des fourches
    if (snow > 0.05 && leaf < 0.5) for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) { const c = b.d[y * W + x]; if (c && !b.d[(y - 1) * W + x] && fl_h2(x, y, seed + 2) < snow * (T.includes(c) ? 0.8 : 0.35)) b.d[(y - 1) * W + x] = sn[light > 0 ? 4 : 3]; }
    // givre : les brindilles fines se couvrent de cristaux blancs
    if (frost > 0.02) for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) { const c = b.d[y * W + x]; if (c && twg.includes(c) && fl_h2(x, y, seed + 6) < frost * 0.55) b.d[y * W + x] = sn[fl_h2(x, y, seed + 7) < 0.5 ? 2 : 3]; }
    // feuillage de printemps : petites feuilles claires en groupes aérés
    if (leaf > 0.05) for (const tp of tips) {
      const nL = Math.round(leaf * (tp[2] === 0 ? 2 : 3) * (1 + r() * 1.6));
      for (let q = 0; q < nL; q++) {
        const lx = tp[0] + (r() - 0.5) * (6 + leaf * 8), ly = tp[1] + (r() - 0.3) * (5 + leaf * 6), rx = 1 + (leaf > 0.55 ? 1 : 0) + (r() < 0.25 ? 1 : 0), ry = 1 + (r() < 0.25 ? 1 : 0);
        fl_clump(b, Math.round(lx), Math.round(ly), rx, ry, lv.slice(1), light, { rag: 0.2, seed: seed + q, hi: 0.4, bias: (lx - cx) / W * light * 0.5, dk: 3 });
      }
    }
    if (dep < 0.55) fl_selout(b, 0.62, (x, y, n) => T.includes(n));
    for (let x = -3; x <= 3; x++) b.set(cx + x, H - 3, dark[0]);
  });
}
// bouleau : x, y = pied, h hauteur, leaf 0 (nu) à 1 (feuillu), snow, stems 1 à 3
function fl_birch(t, o = {}) {
  const p = fl_o(o), h = Math.round(o.h ?? 120), spr = fl_birchSpr(h, (o.seed ?? 1) | 0, fl_q(o.leaf ?? 0.5), fl_q(o.snow ?? 0), o.stems ?? 1, { ...o, depth: p.depth, frost: fl_q(o.frost ?? 0) });
  fl_blitSway(spr, fl_sx(p.x, o), fl_sy(p.y, o), 2.2 * fl_wind(t, p.x, o) * Math.min(1.5, h / 100), { pow: 1.5 });
}

// ───────────── branches mortes ─────────────
// o.kind : 'standing' (broussaille morte dressée) ou 'fallen' (brindilles au sol) ; o.n : nombre de tiges ; o.h hauteur ; o.snow
function fl_deadSpr(h, n, seed, snow, kind, o) {
  const E = fl_env(o), light = E.light, dep = Math.round((o.depth ?? 0.3) * 10) / 10, key = `dd2|${h}|${n}|${seed}|${snow}|${kind}|${E.name}|${E.mist}|${light}|${dep}`;
  const W = Math.round(h * 1.0) + 14, H = h + 6;
  return fl_spr(key, W, H, W >> 1, H - 3, b => {
    const r = fl_rng(seed), T = fl_tones([WO[0], ST[1], ST[3], ST[4], ST[6]], o, 'stone'), sn = fl_tones(fl_SNW, o, 'snow'), cx = W >> 1, base = H - 3;
    const cfg = {
      r, curve: 0, wob: 0.55, droop: 0, split: 2.2, sa: 0.62, lk: 0.6, wk: 0.62, maxLvl: 3, minLen: 4,
      draw: (bb, pts, w, lvl) => {
        if (w >= 2.4) fl_tube(bb, pts, (lat, nx, ny, s, px_, py_) => { const nz = Math.sqrt(Math.max(0, 1 - lat * lat)); return T[fl_tone(fl_lam(nx * lat, ny * lat, nz, light) * 0.85 + 0.1 + (fl_h2(Math.round(px_), Math.round(py_), seed) - 0.5) * 0.25, 5, Math.round(px_), Math.round(py_), 3)]; });
        else fl_poly1(bb, pts, lvl > 1 ? T[0] : T[1]);
      },
    };
    if (kind === 'fallen') {
      for (let i = 0; i < n; i++) { const x = cx + (r() - 0.5) * W * 0.6, y = base - r() * 4, ang = (r() - 0.5) * 0.4 + (r() < 0.5 ? 0 : Math.PI); fl_grow(b, x, y, ang, h * (0.5 + r() * 0.7), 2.4, { ...cfg, maxLvl: 1, split: 1.2, sa: 0.5 }, 0); }
    } else {
      for (let i = 0; i < n; i++) { const x = cx + (i - (n - 1) / 2) * (W * 0.1) + (r() - 0.5) * 3, ang = -Math.PI / 2 + (i - (n - 1) / 2) * 0.2 + (r() - 0.5) * 0.25; fl_grow(b, x, base, ang, h * (0.55 + r() * 0.4), 3, cfg, 0); }
    }
    if (snow > 0.05) for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) { const c = b.d[y * W + x]; if (c && !b.d[(y - 1) * W + x] && fl_h2(x, y, seed + 2) < snow * 0.6) b.d[(y - 1) * W + x] = sn[light > 0 ? 4 : 3]; }
    if (dep < 0.45) fl_selout(b, 0.5, (x, y, n) => n === T[3] || n === T[4]);
  });
}
function fl_deadBranches(t, o = {}) {
  const p = fl_o(o), h = Math.round(o.h ?? 40), spr = fl_deadSpr(h, o.n ?? 4, (o.seed ?? 1) | 0, fl_q(o.snow ?? 0), o.kind || 'standing', { ...o, depth: o.depth ?? 0.3 });
  fl_blitSway(spr, fl_sx(p.x, o), fl_sy(p.y, o), 0.7 * fl_wind(t, p.x, o), { pow: 2 });
}

// ───────────── mousse ─────────────
function fl_mossSpr(w, h, seed, o) {
  const E = fl_env(o), light = E.light, dep = Math.round((o.depth ?? 0.3) * 10) / 10, key = `ms|${w}|${h}|${seed}|${E.name}|${E.mist}|${light}|${dep}|${o.spore ?? 1}`;
  return fl_spr(key, w + 6, h + 6, 3, h + 3, b => {
    const r = fl_rng(seed), T = fl_tones(fl_LEAFR, { ...o, depth: dep }, 'leaf');
    const nC = Math.max(2, Math.round(w / 5));
    const cl = []; for (let i = 0; i < nC; i++) { const f = (i + 0.5) / nC, hh = h * (0.55 + 0.45 * Math.sin(Math.PI * f) * (0.7 + r() * 0.5)); cl.push({ x: 3 + f * w, ry: Math.max(2, Math.round(hh * 0.6)), rx: Math.max(3, Math.round(w / nC * (0.85 + r() * 0.5))), y: h + 3 - hh * 0.45 }); }
    cl.sort((a, c) => a.y - c.y);
    for (const c of cl) fl_clump(b, Math.round(c.x), Math.round(c.y), c.rx, c.ry, T.slice(0, 6), light, { rag: 0.55, seed: seed + c.x, hi: 0.35, bias: 0.05, dk: 3.4 });
    // base sombre
    for (let x = 1; x < w + 5; x++) if (b.get(x, h + 2)) b.set(x, h + 2, T[0]);
    // petites tiges de sporophytes (printemps)
    if (o.spore !== 0) for (let k = 0; k < Math.floor(w / 6); k++) { const x = 4 + Math.floor(r() * (w - 2)); let y = 3; while (y < h + 2 && !b.get(x, y)) y++; if (y < h) { const l = 2 + Math.floor(r() * 3); for (let j = 1; j <= l; j++) b.set(x, y - j, fl_us(OC[3], 'wood')); b.set(x, y - l - 1, fl_us(AM[6], 'wood')); } }
    fl_selout(b, 0.6, (x, y, n) => dep < 0.5);
  });
}
// coussin de mousse : x, y = pied, w largeur, h hauteur
function fl_moss(x, y, w, o = {}) {
  const h = Math.round(o.h ?? Math.max(4, w * 0.3)), spr = fl_mossSpr(Math.round(w), h, (o.seed ?? 1) | 0, { ...o, depth: o.depth ?? 0.3 });
  fl_blit(spr, fl_sx(x, o), fl_sy(y, o), 1);
}

// ───────────── tronc moussu ─────────────
// tronc couché : x, y = bas du tronc, w longueur, h diamètre ; o.moss 0..1 ; o.snow 0..1 ; o.end 'left' | 'right' | 'none' ; o.tilt (px de dénivelé)
function fl_logSpr(w, h, seed, moss, snow, end, tilt, o) {
  const E = fl_env(o), light = E.light, dep = Math.round((o.depth ?? 0.25) * 10) / 10, key = `lg|${w}|${h}|${seed}|${moss}|${snow}|${end}|${tilt}|${E.name}|${E.mist}|${light}|${dep}`;
  const W = w + 16, H = h + 18 + Math.abs(tilt);
  return fl_spr(key, W, H, 8, H - 4, b => {
    const r = fl_rng(seed), T = fl_tones([WO[0], WO[1], WO[2], WO[3], WO[4], WO[5]], o, 'wood'), M_ = fl_tones(fl_LEAFR, o, 'leaf'), sn = fl_tones(fl_SNW, o, 'snow'), cut = fl_tones([WO[3], WO[4], WO[5], WO[6], SK[3]], o, 'wood');
    const yb = H - 4 - h / 2 - (tilt > 0 ? tilt : 0), x0 = 8 + (end === 'left' ? h * 0.2 : 0), x1 = 8 + w - (end === 'right' ? h * 0.2 : 0);
    const pts = []; for (let k = 0; k <= 6; k++) { const f = k / 6; pts.push([x0 + (x1 - x0) * f, yb + tilt * f + Math.sin(f * 3 + seed) * 0.8, h * (0.98 - 0.06 * f + (r() - 0.5) * 0.04)]); }
    const sh = fl_shader(T.slice(0, 6), light, { dk: 3.2, rough: 0.2 });
    fl_tube(b, pts, (lat, nx, ny, s, px_, py_) => {
      let c = sh(lat, nx, ny, s, px_, py_), X = Math.round(px_), Y = Math.round(py_);
      // sillons de l'écorce : lignes sombres dans le sens de la longueur
      const fur = Math.abs(((lat * 3.2 + 0.7 * Math.sin(s * 9 + seed)) % 1 + 1) % 1 - 0.5);
      if (fur > 0.43 && fl_h2(X, Y, seed) < 0.82) c = T[Math.max(0, T.indexOf(c) - 1)] || c;
      if (fl_h2(X >> 1, Y, seed + 5) < 0.06) c = T[Math.min(5, T.indexOf(c) + 1)] || c;
      return c;
    });
    // bouts : section coupée avec cernes
    const endDraw = (ex, ey, side) => {
      const rx = Math.max(2, Math.round(h * 0.26)), ry = Math.round(h / 2);
      b.ell(ex, ey, rx, ry, T[1]); b.ell(ex + side * 1, ey, rx - 1, ry - 1, cut[1]);
      for (let k = 1; k < 4; k++) { const ee = Math.round(rx * (1 - k * 0.27)), eh = Math.round(ry * (1 - k * 0.27)); if (ee > 0 && eh > 1) for (let a = 0; a < 40; a++) { const an = a / 40 * TAU; b.set(Math.round(ex + side + Math.cos(an) * ee), Math.round(ey + Math.sin(an) * eh), cut[k % 2 ? 0 : 2]); } }
      b.set(ex + side, ey, cut[3]); for (let k = 0; k < 6; k++) { const an = r() * TAU, l = r() * ry * 0.8; b.set(Math.round(ex + side + Math.cos(an) * l * 0.3), Math.round(ey + Math.sin(an) * l), T[1]); }
      for (let k = 0; k < ry; k++) b.set(ex - side * (rx - 1) + (light > 0 ? 0 : 0), ey - ry + k, cut[light * side > 0 ? 3 : 1]);
    };
    if (end === 'left') endDraw(Math.round(x0), Math.round(yb), -1);
    if (end === 'right') endDraw(Math.round(x1 + (end === 'right' ? 0 : 0)), Math.round(yb + tilt), 1);
    // mousse sur le dessus et le côté éclairé
    if (moss > 0.02) {
      const nM = Math.round(w / 7 * moss * 1.6);
      for (let k = 0; k < nM; k++) {
        const f = r(), x = x0 + (x1 - x0) * f, y = yb + tilt * f - h * (0.38 + r() * 0.12), rx = Math.round(3 + r() * 5 * moss + 2), ry = Math.round(2 + r() * 2.2 * (0.5 + moss));
        fl_clump(b, Math.round(x), Math.round(y), rx, ry, M_.slice(0, 6), light, { rag: 0.6, seed: seed + k, hi: 0.35, bias: 0.05, dk: 3.4 });
      }
      for (let k = 0; k < nM * 0.6; k++) { const f = r(), x = x0 + (x1 - x0) * f + (light > 0 ? 0 : 0), y = yb + tilt * f + h * (r() * 0.3), rx = 2 + Math.round(r() * 2), ry = 1 + Math.round(r() * 2); fl_clump(b, Math.round(x), Math.round(y), rx, ry, M_.slice(0, 5), light, { rag: 0.7, seed: seed + k + 50, hi: 0.3, bias: -0.05 }); }
    }
    // neige sur le dessus
    if (snow > 0.05) for (let x = 0; x < W; x++) { let y = 0; while (y < H && !b.d[y * W + x]) y++; if (y >= H - 1) continue; const th = Math.round(snow * (1.5 + 3 * fl_n1(x * 0.3, seed))); for (let j = -1; j < th; j++) b.set(x, y + j, j < 0 ? 0 : j === 0 ? sn[light > 0 ? 4 : 3] : j === th - 1 ? sn[1] : sn[3]); }
    if (dep < 0.55) fl_selout(b, 0.6);
    for (let x = 4; x < W - 4; x++) if (!b.d[(H - 4) * W + x] && b.d[(H - 5) * W + x]) b.set(x, H - 4, T[0]);
  });
}
function fl_log(x, y, w, h, o = {}) {
  const spr = fl_logSpr(Math.round(w), Math.round(h), (o.seed ?? 1) | 0, fl_q(o.moss ?? 0.6), fl_q(o.snow ?? 0), o.end ?? 'left', o.tilt ?? 0, { ...o, depth: o.depth ?? 0.25 });
  fl_blit(spr, fl_sx(x, o), fl_sy(y, o), 1);
}

// ───────────── fougères ─────────────
function fl_fernSpr(h, n, seed, unfurl, o) {
  const E = fl_env(o), light = E.light, dep = Math.round((o.depth ?? 0.3) * 10) / 10, key = `fe2|${h}|${n}|${seed}|${unfurl}|${E.name}|${E.mist}|${light}|${dep}`;
  const W = Math.round(h * 1.7) + 12, H = h + 10;
  return fl_spr(key, W, H, W >> 1, H - 3, b => {
    const r = fl_rng(seed), T = fl_tones([GR[0], GR[1], GR[2], LM[2], LM[3], LM[4], LM[5]], o, 'leaf'), cx = W >> 1, base = H - 4;
    const fronds = []; for (let i = 0; i < n; i++) { const f = n > 1 ? i / (n - 1) : 0.5, a = (f - 0.5) * 3.0 + (r() - 0.5) * 0.25; fronds.push({ a, L: h * (0.66 + 0.34 * Math.cos((f - 0.5) * 2.0) * (0.7 + r() * 0.3)), cu: 0.5 + r() * 0.5, fid: r() < unfurl * 0.5 && Math.abs(f - 0.5) > 0.2 }); }
    fronds.sort((p, q) => Math.abs(q.a) - Math.abs(p.a));
    for (const fr of fronds) {
      const steps = Math.round(fr.L / 1.4), pts = [], lit = (fr.a * light) > -0.35;
      for (let k = 0; k <= steps; k++) { const s = k / steps; pts.push([cx + Math.sin(fr.a * 0.75) * fr.L * s * 0.95 + fr.a * 0.55 * fr.L * s * s * fr.cu, base - Math.cos(fr.a * 0.45) * fr.L * s * (1 - 0.1 * s) + s * s * s * fr.L * 0.32 * (0.4 + Math.abs(fr.a) * 0.6)]); }
      for (let k = 0; k <= steps; k++) {
        const s = k / steps, p = pts[k], q = pts[Math.min(steps, k + 1)], pr = pts[Math.max(0, k - 1)];
        let tx = q[0] - pr[0], ty = q[1] - pr[1]; const l = Math.hypot(tx, ty) || 1; tx /= l; ty /= l;
        const nx = -ty, ny = tx, len = (fr.fid && s > 0.78 ? 0 : 1) * Math.max(0, Math.sin(Math.PI * Math.min(1, s * 1.02 + 0.03)) ** 0.7) * h * 0.2 * (1 - 0.2 * s);
        b.set(Math.round(p[0]), Math.round(p[1]), T[s < 0.15 ? 1 : 2]);
        if (len > 0.9 && s > 0.1 && k % 2 === 0) for (const sd of [-1, 1]) {
          const ex = p[0] + (nx * sd * 0.85 + tx * 0.55) * len, ey = p[1] + (ny * sd * 0.85 + ty * 0.55) * len + len * 0.22, side = sd * nx * light > 0;
          b.line(p[0], p[1], ex, ey, T[side ? (lit ? 5 : 4) : (lit ? 3 : 2)]);
          if (len > 2.6) { b.set(Math.round(ex), Math.round(ey), T[side ? 6 : 4]); b.set(Math.round((p[0] + ex) / 2), Math.round((p[1] + ey) / 2) - 1, T[side ? 5 : 3]); }
        }
      }
      if (fr.fid) { const e = pts[pts.length - 1]; for (let a = 0; a < 16; a++) { const an = a / 16 * 4.6 - 0.8, rr = 4 - a * 0.17; b.set(Math.round(e[0] + Math.sin(an + 1.2 * Math.sign(fr.a || 1)) * rr), Math.round(e[1] - Math.cos(an + 1.2 * Math.sign(fr.a || 1)) * rr), T[5]); } }
    }
    if (dep < 0.5) fl_selout(b, 0.55);
    fl_gshadow(b, cx, base + 2, Math.round(h * 0.3), 1, T[0], 0.7);
  });
}
// touffe de fougères : x, y = pied, h hauteur, n frondes, unfurl 0..1 (crosses non déroulées)
function fl_ferns(t, o = {}) {
  const p = fl_o(o), h = Math.round(o.h ?? 26), spr = fl_fernSpr(h, o.n ?? 6, (o.seed ?? 1) | 0, fl_q(o.unfurl ?? 0.3), { ...o, depth: o.depth ?? 0.3 });
  fl_blitSway(spr, fl_sx(p.x, o), fl_sy(p.y, o), 1.5 * fl_wind(t, p.x, o), { pow: 1.3 });
}

// ───────────── fleurs de printemps ─────────────
// kind : 'crocus' | 'saxifrage' | 'anemone' ; var 0 à 2 (couleurs) ; z : échelle
function fl_flowerSpr(kind, v, z, seed, o) {
  const E = fl_env(o), light = E.light, dep = Math.round((o.depth ?? 0.3) * 10) / 10, key = `fw|${kind}|${v}|${z}|${seed}|${E.name}|${E.mist}|${light}|${dep}`;
  const W = Math.round(14 * z) + 8, H = Math.round(18 * z) + 8;
  return fl_spr(key, W, H, W >> 1, H - 2, b => {
    const r = fl_rng(seed), gr = fl_tones([GR[1], GR[2], GR[3], LM[3], LM[4]], o, 'leaf'), cx = W >> 1, base = H - 3;
    const petal = { crocus: [[DU[3], DU[4], DU[5], DU[7]], [YE[0], YE[1], YE[2], YE[3]], [ST[6], WH[0], WH[2], WH[3]]][v % 3], saxifrage: [[RD[2], RD[3], RD[4], RD[5]], [DU[5], DU[6], DU[7], WH[1]], [WH[0], WH[1], WH[2], WH[3]]][v % 3], anemone: [WH[0], WH[1], WH[2], WH[3]] }[kind];
    const P = fl_tones(petal, { ...o, fogK: 0.8 }, 'warm'), ctr = fl_tones([AM[6], YE[1], YE[2], YE[3]], o, 'leaf');
    if (kind === 'crocus') {
      // crocus ouvert : tube pâle, corolle qui s'évase en trois pétales visibles, gorge claire et étamines orangées
      const hh = Math.round(7 * z), fw = Math.max(3, Math.round(3.4 * z)), top = base - Math.round(3 * z) - hh;
      for (const sd of [-1, 1]) { const l = Math.round(9 * z); for (let k = 0; k < l; k++) { const s = k / l; b.set(cx + Math.round(sd * (1.5 + s * 4.5 * z)), base - k, gr[2]); if (k % 2 === 0 && k > 1) b.set(cx + Math.round(sd * (1.5 + s * 4.5 * z)), base - k, gr[4]); } }
      for (let k = 0; k < Math.round(3 * z); k++) b.set(cx, base - k, gr[1]);
      for (let j = 0; j <= hh; j++) {
        const f = (hh - j) / hh, wd = Math.max(0, Math.round(f < 0.55 ? 0.6 + fw * 0.8 * Math.pow(f / 0.55, 1.1) * 0.62 : f < 0.88 ? 0.6 + fw * (0.5 + 0.5 * (f - 0.55) / 0.33) : fw * (1 - (f - 0.88) * 3.2))), y = top + j;
        for (let i = -wd; i <= wd; i++) {
          const ln = wd ? i / wd : 0, nz = Math.sqrt(Math.max(0, 1 - ln * ln)), v = fl_lam(ln * 0.9, -0.3 * (1 - f), nz, light) + (f < 0.35 ? 0.18 : 0) + ((Math.abs(i) === Math.round(wd * 0.5) && f > 0.4) ? -0.18 : 0) + (f > 0.88 ? 0.08 : 0);
          b.set(cx + i, y, P[fl_tone(v, 4, cx + i, y, 3)]);
        }
      }
      b.set(cx - fw, top, P[2]); b.set(cx + fw, top, P[3]); b.set(cx, top - 1, P[3]);
      b.set(cx - 1, top + 1, ctr[1]); b.set(cx, top + 1, ctr[2]); b.set(cx + 1, top + 1, ctr[1]); b.set(cx, top, ctr[3]);
      fl_selout(b, 0.5);
    } else if (kind === 'saxifrage') {
      const mw = Math.round(11 * z), mh = Math.round(4.5 * z), M_ = fl_tones(fl_LEAFR, o, 'leaf');
      fl_clump(b, cx, base - Math.round(mh * 0.5), Math.round(mw / 2), Math.round(mh * 0.7), M_.slice(0, 5), light, { rag: 0.5, seed, hi: 0.3 });
      const nf = Math.round(5 * z + 3);
      for (let k = 0; k < nf; k++) { const fx = cx + Math.round((r() - 0.5) * mw * 0.9), fy = base - Math.round(mh * (0.3 + r() * 0.7)), big = z > 1.2 && r() < 0.5; b.set(fx, fy, P[3]); b.set(fx - 1, fy, P[2]); b.set(fx + 1, fy, P[big ? 2 : 1]); b.set(fx, fy - 1, P[2]); if (big) { b.set(fx, fy + 1, P[1]); b.set(fx, fy, ctr[2]); } }
      fl_selout(b, 0.55);
    } else {
      const hh = Math.round(11 * z), top = base - hh;
      for (let k = 0; k < hh; k++) b.set(cx + Math.round(Math.sin(k * 0.3 + seed) * 0.6), base - k, gr[k < 3 ? 1 : 2]);
      // collerette de trois feuilles lobées
      const ly = base - Math.round(hh * 0.5);
      for (const sd of [-1, 0, 1]) { const lx = cx + sd * Math.round(3.5 * z), lyy = ly + (sd === 0 ? -2 : 0); b.ell(lx, lyy, Math.max(1, Math.round(2.4 * z)), Math.max(1, Math.round(1.2 * z)), gr[1]); b.set(lx - 1 * light, lyy - 1, gr[3]); b.set(lx + sd, lyy, gr[4]); }
      // fleur étoilée
      const rx = Math.max(2, Math.round(3.4 * z)), ry = Math.max(2, Math.round(2.1 * z));
      b.ell(cx, top, rx, ry, P[1]); b.ell(cx - light, top - 1, rx - 1, Math.max(1, ry - 1), P[2]);
      for (let a = 0; a < 6; a++) { const an = a / 6 * TAU + 0.3; b.set(Math.round(cx + Math.cos(an) * (rx + 0.5)), Math.round(top + Math.sin(an) * (ry + 0.3)), P[a % 2 ? 3 : 2]); }
      b.set(cx - light * (rx - 1), top, P[3]); b.set(cx + light * (rx - 1), top + 1, P[0]);
      b.set(cx, top, ctr[2]); b.set(cx + 1, top, ctr[1]); if (z > 1) b.set(cx - 1, top, ctr[0]);
      fl_selout(b, 0.55);
    }
  });
}
// champ de fleurs dans le rectangle (x0, y0, x1, y1) : o.kind 'mix' | 'crocus' | 'saxifrage' | 'anemone' ; o.density ; o.zmin, o.zmax (échelle selon la profondeur y)
function fl_flowers(x0, y0, x1, y1, o = {}) {
  const t = o.t ?? 0, dens = o.density ?? 1, area = (x1 - x0) * (y1 - y0), n = Math.max(1, Math.round(area / 150 * dens)), seed = (o.seed ?? 1) | 0, kind = o.kind || 'mix';
  const list = [];
  const nCl = Math.max(2, Math.round(Math.sqrt(area) / 18)), cls = []; for (let c = 0; c < nCl; c++) cls.push([x0 + fl_h(c, seed + 21) * (x1 - x0), y0 + fl_h(c, seed + 22) * (y1 - y0), 10 + fl_h(c, seed + 23) * 18]);
  for (let i = 0; i < n; i++) { const c = cls[Math.floor(fl_h(i, seed + 24) * nCl)], a = fl_h(i, seed + 25) * TAU, d = Math.pow(fl_h(i, seed + 26), 0.7) * c[2], x = Math.max(x0, Math.min(x1, c[0] + Math.cos(a) * d * 1.6)), y = Math.max(y0, Math.min(y1, c[1] + Math.sin(a) * d * 0.6)), f = (y - y0) / Math.max(1, y1 - y0); list.push({ x, y, i, f }); }
  list.sort((a, c) => a.y - c.y);
  const zmin = o.zmin ?? 0.6, zmax = o.zmax ?? 1.5, kinds = ['crocus', 'saxifrage', 'anemone'];
  for (const fl of list) {
    const zr = zmin + (zmax - zmin) * fl.f, z = Math.round(zr * 4) / 4, kd = kind === 'mix' ? kinds[Math.floor(fl_h(fl.i, seed + 3) * 3)] : kind, v = Math.floor(fl_h(fl.i, seed + 4) * 3);
    const spr = fl_flowerSpr(kd, v, z, 1 + Math.floor(fl_h(fl.i, seed + 5) * 4), { ...o, depth: o.depth ?? 0.3 });
    fl_blitSway(spr, fl_sx(fl.x, o), fl_sy(fl.y, o), 1.8 * z * fl_wind(t, fl.x, o), { pow: 1.2 });
  }
}

// ───────────── herbe neuve ─────────────
function fl_tuftSpr(h, nb, seed, o) {
  const E = fl_env(o), light = E.light, dep = Math.round((o.depth ?? 0.2) * 10) / 10, key = `tf3|${h}|${nb}|${seed}|${E.name}|${E.mist}|${light}|${dep}|${o.dry || 0}|${o.sh ?? 1}`;
  const W = Math.round(h * 0.8) + 8, H = h + 3;
  return fl_spr(key, W, H, W >> 1, H - 1, b => {
    const r = fl_rng(seed), T = fl_tones(o.dry ? [OC[0], WO[3], AM[4], AM[6], AM[8], AM[9]] : [LM[0], LM[1], LM[2], LM[3], LM[4], LM[5], LM[6]], o, 'leaf'), cx = W >> 1, base = H - 2;
    const bl = []; for (let i = 0; i < nb; i++) bl.push({ a: (i / Math.max(1, nb - 1) - 0.5) * 1.1 + (r() - 0.5) * 0.35, L: h * (0.5 + r() * 0.55), c: (r() - 0.5) * 0.8 });
    bl.sort((a, c) => c.L - a.L);
    for (const q of bl) {
      const steps = Math.max(3, Math.round(q.L * 1.2));
      let px_ = cx;
      for (let k = 0; k <= steps; k++) {
        const s = k / steps, x = cx + Math.sin(q.a) * q.L * s * 0.8 + q.c * s * s * q.L * 0.55, y = base - Math.cos(q.a * 0.5) * q.L * s;
        const ti = Math.max(0, Math.min(T.length - 1, Math.round(1 + s * 3.4 + (q.a * light > 0 ? 0.8 : 0)) + ((o.sh ?? 1) - 1))), X = Math.round(x), Y = Math.round(y);
        b.set(X, Y, T[ti]); if (s < 0.28) b.set(X - light, Y, T[Math.max(0, ti - 1)]); else if (Math.abs(X - px_) > 1) b.set(Math.round((X + px_) / 2), Y, T[ti]);
        if (s > 0.88) b.set(X, Y, T[T.length - 2]);
        px_ = X;
      }
    }
    if (dep < 0.4) fl_selout(b, 0.5);
  });
}
// pelouse de printemps dans les rangées y0 à y1 : o.grow 0..1 (hauteur de l'herbe), o.base (fond de terre verte), o.density, o.h hauteur des touffes proches
function fl_grassSpring(y0, y1, o = {}) {
  const t = o.t ?? 0, E = fl_env(o), seed = (o.seed ?? 1) | 0, grow = fl_cl(o.grow ?? 1), dens = o.density ?? 1, par = fl_par({ ...o, depth: o.depth ?? 0.12 }), cam = (o.cam || 0) * par, hN = o.h ?? 14;
  if (o.base !== false) {                                           // fond : terre qui verdit
    const baseSpr = fl_memo(`gsb2|${y0}|${y1}|${seed}|${E.name}|${E.mist}|${E.light}|${Math.round(grow * 10)}|${o.depth ?? ''}`, () => {
      const grow = Math.round(fl_cl(o.grow ?? 1) * 10) / 10;           // le fond ne lit que la valeur arrondie de sa clé (la hauteur des touffes garde grow brut)
      const w = LW + 2 * fl_GM, h = y1 - y0 + 4, b = new fl_Buf(w, h), gS = fl_toneSets([LM[0], LM[1], LM[2], LM[3]], o, 'leaf', 4), mS = fl_toneSets([WO[0], WO[1], WO[2], WO[3]], o, 'wood', 4);
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const yn = y / h, top = 2 + (fl_n1(x * 0.17, seed) - 0.5) * 3 + (fl_n1(x * 0.5, seed + 3) - 0.5) * 2; if (y < top) continue;
        const n = fl_fbm(x / 26, y / 5, seed + 9, 3), gv = fl_cl(grow * 1.1 - (1 - yn) * 0.25 + (n - 0.5) * 0.9);
        const useG = fl_bay(x, y) < gv; const v = 0.26 + yn * 0.3 + (n - 0.5) * 0.8, far = Math.pow(1 - yn, 1.3) * 0.95;
        b.d[y * w + x] = useG ? fl_pickSet(gS, far, x, y, seed)[fl_tone(v, 4, x, y, 3.2)] : fl_pickSet(mS, far, x, y, seed)[fl_tone(v, 4, x, y, 3.2)];
      }
      b.flush(); return { c: b.c, w, h, ox: fl_GM, oy: 0, b };
    });
    fl_blit(baseSpr, -fl_cl(cam, -fl_GM, fl_GM), y0 - 2, 1);
  }
  // touffes : chaque rangée a ses propres hachages (rr entre dans tous) et un espacement apériodique ; la hauteur est modulée par un bruit lent (pas de quadrillage)
  const rows = Math.max(2, Math.round((y1 - y0) / 5)), list = [];
  for (let rr = 0; rr < rows; rr++) {
    const yn = (rr + 0.5) / rows, y = y0 + yn * (y1 - y0), sc = 0.4 + 0.8 * yn, spacing = Math.max(5, 15 * sc / dens);
    for (let x = -30 - ((rr * 37) % spacing); x < LW + 60; x += spacing * (0.55 + 0.9 * fl_h(Math.floor(x) + rr * 211, seed + 9))) list.push({ x: x, y: y + (fl_h(Math.floor(x) + rr * 57, seed + rr) - 0.5) * 3.4, sc, yn, rr });
  }
  for (const tf of list) {
    const fx = Math.floor(tf.x), patch = fl_fbm(tf.x / 30, tf.y / 8, seed + 51, 2);
    if (grow < 0.95 && patch < (1 - grow) * 0.7) continue;                      // plages où rien n'a encore poussé (herbe neuve : par plaques)
    const hv = 0.75 + 0.5 * fl_h(fx * 7 + tf.rr * 131, seed + 2), hm = 0.62 + 0.76 * fl_fbm(tf.x / 20, tf.y / 6, seed + 31, 2);
    const h = Math.max(2, Math.round(hN * tf.sc * grow * hv * hm)); if (grow < 0.1 && h < 3) continue;
    const key = Math.floor(fl_h(fx * 3 + tf.rr * 77, seed + 4) * 8), pn = fl_fbm((tf.x + cam) / 55, tf.y / 14, seed + 77, 2), sh = pn < 0.42 ? 0 : pn > 0.58 ? 2 : 1, spr = fl_tuftSpr(h, 4 + Math.round(grow * 3), 10 + key, { ...o, depth: (o.depth ?? 0.12) + (0.55 - (o.depth ?? 0.12)) * Math.pow(1 - tf.yn, 1.5), dry: 0, sh });
    fl_blitSway(spr, tf.x - cam, tf.y, 1.6 * fl_wind(t, tf.x, o) * (h / 12), { pow: 1.3 });
  }
}

// ═══════════════════════════════════════════════════════════════════════════════════════
// 5. ROCHERS : rochers lisses (4 à 5 tons), rochers rouges du désert, blocs
// ═══════════════════════════════════════════════════════════════════════════════════════
const fl_ROCKM = {
  stone: [[ST[1], ST[2], ST[3], ST[5], ST[6]], 'stone'], dark: [[NI[0], NI[2], ST[1], ST[2], ST[4]], 'stone'],
  red: [[OC[0], OC[1], OC[2], OC[3], OC[4]], 'warm'], sand: [[WO[2], OC[2], OC[3], SK[2], SK[3]], 'warm'], warm: [[WO[1], WO[2], WO[3], WO[4], WO[5]], 'wood'],
};
// capuchon de neige (ou de mousse) sur le dessus d'une silhouette : épaisseur variable colonne par colonne, liseré clair côté soleil, bord inférieur ombré
function fl_capTop(b, T, light, amt, seed, o = {}) {
  const w = b.w, h = b.h, top = new Int16Array(w).fill(-1);
  for (let x = 0; x < w; x++) for (let y = 0; y < h; y++) if (b.d[y * w + x]) { top[x] = y; break; }
  const add = [];
  for (let x = 0; x < w; x++) {
    const y0 = top[x]; if (y0 < 0) continue;
    const sl = Math.abs((top[Math.min(w - 1, x + 1)] < 0 ? y0 : top[Math.min(w - 1, x + 1)]) - (top[Math.max(0, x - 1)] < 0 ? y0 : top[Math.max(0, x - 1)])) / 2;
    const th = Math.round(amt * (o.min ?? 1.2 + (o.k ?? 3.2) * fl_n1(x * (o.f ?? 0.28), seed)) * fl_cl(1.15 - sl * 0.35, 0, 1) + (amt > 0.3 ? 0.4 : 0));
    for (let j = -1; j < th; j++) {
      const lit = (x * 0.0 + light) >= 0;
      const k = j < 0 ? 0 : j === 0 ? (lit ? T.length - 1 : T.length - 2) : j === th - 1 && th > 2 ? 1 : (lit ? T.length - 2 : T.length - 3);
      add.push(x, y0 + j, T[Math.max(0, Math.min(T.length - 1, k))]);
    }
  }
  for (let i = 0; i < add.length; i += 3) { const x = add[i], y = add[i + 1]; if (y >= 0 && (b.d[y * w + x] || add[i + 1] === top[x] - 1)) b.set(x, y, add[i + 2]); }
}

// sprite de rocher : contour irrégulier (harmoniques), pans coupés (facettes) qui accrochent la lumière, 4 à 5 tons, fissures, mousse / neige / herbe au pied
function fl_rockSpr(w, h, kind, seed, o) {
  const E = fl_env(o), light = E.light, dep = Math.round((o.depth ?? 0.3) * 10) / 10, mat = o.mat || 'stone', snow = Math.round((o.snow ?? 0) * 10) / 10, moss = Math.round((o.moss ?? 0) * 10) / 10, gr = o.grass || '';
  const key = `rk2|${w}|${h}|${kind}|${seed}|${mat}|${snow}|${moss}|${gr}|${E.name}|${E.mist}|${light}|${dep}`;
  const W = w + 12, H = h + 14;
  return fl_spr(key, W, H, W >> 1, H - 8, b => {
    const [ramp, fam] = fl_ROCKM[mat] || fl_ROCKM.stone, T = fl_tones(ramp, o, fam), r = fl_rng(seed), cx = W / 2, yb = H - 8;
    const amp = kind === 'flat' ? [0.12, 0.08, 0.04] : kind === 'tall' ? [0.1, 0.1, 0.05] : kind === 'slab' ? [0.05, 0.05, 0.02] : [0.13, 0.09, 0.04];
    const rx = w / 2, ry = kind === 'flat' ? h * 1.0 : kind === 'tall' ? h * 0.9 : h * 0.78, cy = yb - ry * (kind === 'flat' ? 0.3 : 0.18), n = kind === 'slab' ? 4 : 2.4;
    const ph = [r() * 6.3, r() * 6.3, r() * 6.3], skew = (r() - 0.5) * 0.35, tp = (kind === 'tall' ? 0.28 : 0.1) * (r() < 0.5 ? -1 : 1);
    // pans coupés : plans (nx, ny, d) qui tronquent la forme ; la bande de 3 à 5 px le long du plan est une facette plane
    const cuts = []; const nCut = kind === 'slab' ? 3 : kind === 'pebble' ? 0 : 2;
    for (let i = 0; i < nCut; i++) { const a = -Math.PI / 2 + (r() - 0.5) * 3.2 + (i === 0 ? (light > 0 ? -0.9 : 0.9) : 0), d = 0.78 + r() * 0.14; cuts.push({ nx: Math.cos(a), ny: Math.sin(a), d, wd: 0.1 + r() * 0.08 }); }
    for (let y = 0; y <= yb + 2; y++) for (let x = 0; x < W; x++) {
      if (y > yb + Math.round((fl_n1(x * 0.22, seed) - 0.5) * 3.2) - 0) continue;
      let dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry; dx += skew * dy + tp * (dy + 0.5) * (kind === 'tall' ? 1 : 0);
      const ang = Math.atan2(dy, dx), rho = 1 + amp[0] * Math.sin(ang * 2 + ph[0]) + amp[1] * Math.sin(ang * 3 + ph[1]) + amp[2] * Math.sin(ang * 5 + ph[2]) + (fl_h2(x, y, seed) - 0.5) * 0.04;
      const e = Math.pow(Math.abs(dx), n) + Math.pow(Math.abs(dy), n); if (e > rho) continue;
      let facet = null;
      for (const c of cuts) { const pd = dx * c.nx + dy * c.ny; if (pd > c.d) { facet = 'cut'; break; } if (pd > c.d - c.wd) facet = c; }
      if (facet === 'cut') continue;
      const k2 = Math.max(0.0001, rho - e);
      let nx = Math.sign(dx) * Math.pow(Math.abs(dx), n - 1) * 0.95 + (fl_fbm(x / 5, y / 5, seed, 2) - 0.5) * 0.34, ny = Math.sign(dy) * Math.pow(Math.abs(dy), n - 1) * 0.95 + (fl_fbm(x / 5 + 9, y / 5, seed + 1, 2) - 0.5) * 0.34, nz = Math.max(0.15, 1 - Math.min(1, nx * nx + ny * ny)) ** 0.5 * 0.9 + 0.1 * Math.sqrt(k2);
      if (facet) { nx = facet.nx * 0.85; ny = facet.ny * 0.85; nz = 0.5; }
      const ln = Math.hypot(nx, ny, nz); nx /= ln; ny /= ln; nz /= ln;
      let v = fl_lam(nx, ny, nz, light) + (fl_h2(x, y, seed + 3) < 0.05 ? 0.12 : fl_h2(x, y, seed + 4) < 0.05 ? -0.12 : 0);
      if (dy > 0.5) v -= (dy - 0.5) * 0.55;
      v = (v - 0.5) * 1.12 + 0.52;
      b.set(x, y, T[fl_tone(v, 5, x, y, 3.4)]);
    }
    const nCr = Math.round(w / 22) + (kind === 'slab' ? 1 : 0);
    for (let k = 0; k < nCr; k++) {                                  // fissures sombres avec liseré clair côté soleil
      let x = cx + (r() - 0.5) * w * 0.7, y = yb - h * (0.25 + r() * 0.6); const a0 = (r() < 0.5 ? 0.9 : 2.2) + (r() - 0.5) * 0.6, len = 3 + r() * h * 0.45;
      for (let s_ = 0; s_ < len; s_++) { x += Math.cos(a0 + (r() - 0.5) * 0.8); y += Math.sin(a0 + (r() - 0.5) * 0.4) * 0.9; if (b.get(Math.round(x), Math.round(y))) { b.set(Math.round(x), Math.round(y), T[0]); if (b.get(Math.round(x + light), Math.round(y))) b.set(Math.round(x + light), Math.round(y), T[3]); } }
    }
    if (moss > 0) fl_capTop(b, fl_tones(fl_LEAFR, o, 'leaf').slice(0, 6), light, moss, seed + 7, { min: 1.5, k: 4 });
    if (snow > 0) fl_capTop(b, fl_tones(fl_SNW, o, 'snow'), light, snow, seed + 3);
    if (dep < 0.6) { fl_rim(b, light, fl_us(E.rim), { topP: 0.3, skip: c => false }); fl_selout(b, 0.62); }
    for (let x = 0; x < W; x++) if (b.d[yb * W + x] && !b.d[(yb + 1) * W + x]) b.d[(yb + 1) * W + x] = fl_darker(b.d[yb * W + x], 0.6);
    fl_gshadow(b, Math.round(cx - light * w * 0.1), yb + 3, Math.round(w * 0.58), 2, T[0], 0.85);
    if (gr) {                                                         // brins d'herbe au pied
      const G = fl_tones(gr === 'dry' ? [WO[1], OC[2], AM[5], AM[7]] : [GR[0], GR[1], LM[2], LM[3], LM[4]], o, gr === 'dry' ? 'warm' : 'leaf');
      for (let k = 0; k < w / 4; k++) { const x = Math.round(cx + (r() - 0.5) * w * 1.0), y = yb + 1, l = 3 + Math.round(r() * 5), lean = Math.round((r() - 0.5) * 4); for (let j = 0; j < l; j++) b.set(x + Math.round(lean * j / l), y - j, G[Math.min(G.length - 1, 1 + (j > l * 0.6 ? 2 : 0) + (r() < 0.2 ? 1 : 0))]); }
    }
  });
}
// rocher : x, y = pied, w largeur, h hauteur, kind 'round' | 'flat' | 'tall' | 'slab' | 'pebble', seed ; o.mat 'stone' | 'dark' | 'red' | 'sand' | 'warm' ; o.snow, o.moss 0..1
function fl_rock(x, y, w, h, kind = 'round', seed = 1, o = {}) {
  const spr = fl_rockSpr(Math.round(w), Math.round(h), kind === 'pebble' ? 'round' : kind, seed | 0, { ...o, depth: o.depth ?? 0.25 });
  fl_blit(spr, fl_sx(x, o), fl_sy(y, o), 1);
}
// groupe de rochers : x, y = centre du pied, w largeur totale, o.n (nombre), o.mat…
function fl_boulders(x, y, w, o = {}) {
  const n = o.n ?? 4, seed = (o.seed ?? 1) | 0, list = [];
  for (let i = 0; i < n; i++) {
    const f = n > 1 ? i / (n - 1) : 0.5, big = i === Math.floor(n / 2) ? 1 : 0.45 + fl_h(i, seed) * 0.4, kinds = ['round', 'flat', 'tall', 'round'];
    list.push({ x: x + (f - 0.5) * w * 0.8 + (fl_h(i, seed + 1) - 0.5) * w * 0.1, y: y - (i % 2 ? 3 : 0) + (fl_h(i, seed + 2) - 0.5) * 5, w: w * 0.34 * big, h: w * (0.2 + 0.1 * fl_h(i, seed + 3)) * big * (kinds[i % 4] === 'tall' ? 1.4 : 1), kind: kinds[(i + seed) % 4], s: seed + i * 5 });
  }
  list.sort((a, c) => a.y - c.y);
  for (const q of list) fl_rock(q.x, q.y, Math.max(6, q.w), Math.max(5, q.h), q.kind, q.s, o);
}

// ───────────── rochers rouges du désert : blocs stratifiés, face sombre / face éclairée, éboulis ─────────────
// kind : 'mesa' (table à étages) | 'spire' (aiguille) | 'ledge' (banc bas)
function fl_desertRockSpr(w, h, kind, seed, o) {
  const E = fl_env(o), light = E.light || 1, dep = Math.round((o.depth ?? 0.3) * 10) / 10, key = `dr|${w}|${h}|${kind}|${seed}|${E.name}|${E.mist}|${light}|${dep}`;
  const W = w + 14, H = h + 10;
  return fl_spr(key, W, H, W >> 1, H - 4, b => {
    const r = fl_rng(seed), T = fl_tones([OC[0], OC[1], OC[2], OC[3], OC[4], OC[5]], { ...o, keepFam: true }, 'warm'), cx = W / 2, yb = H - 4, rimU = fl_us(E.rim);
    if (dep >= 0.5) {                                                // perspective atmosphérique : tous les tons (face éclairée comme face sombre) se rapprochent du même ton moyen avec la distance
      const rg = u => [u & 255, (u >>> 8) & 255, (u >>> 16) & 255], mid = fl_mix(rg(T[2]), rg(T[3]), 0.5), kk = fl_cl((dep - 0.35) * 1.4, 0, 0.7);
      for (let i = 0; i < T.length; i++) T[i] = fl_us(fl_mix(rg(T[i]), mid, kk), 'warm');
    }
    const tiers = kind === 'spire' ? [{ w: w * 0.46, h: h * 0.5 }, { w: w * 0.3, h: h * 0.5 }] : kind === 'ledge' ? [{ w: w, h: h * 0.7 }, { w: w * 0.7, h: h * 0.3 }] : [{ w: w * 0.96, h: h * 0.42 }, { w: w * 0.76, h: h * 0.34 }, { w: w * 0.52, h: h * 0.24 }];
    let yTop = yb; const prof = [];
    for (let ti = 0; ti < tiers.length; ti++) { const t = tiers[ti], y1 = yTop, y0 = yTop - t.h, off = (r() - 0.5) * w * 0.08; prof.push({ y0, y1, w: t.w, off }); yTop = y0; }
    const band = 2 + Math.floor(r() * 2), bandsT = []; for (let i = 0; i < 80; i++) bandsT.push(r());
    for (let ti = 0; ti < prof.length; ti++) {
      const t = prof[ti];
      for (let y = Math.round(t.y0); y <= Math.round(t.y1); y++) {
        const f = (y - t.y0) / (t.y1 - t.y0), flare = (ti === 0 ? 0.1 * f : 0.05 * f) + (kind === 'spire' ? 0.18 * f : 0), half = t.w / 2 * (0.93 + flare) + (fl_n1(y * 0.3, seed + ti) - 0.5) * 4.2 + (fl_h2(y, ti, seed) - 0.5) * 1.2;
        const xl = Math.round(cx + t.off - half), xr = Math.round(cx + t.off + half), ridge = Math.round(cx + t.off + half * (0.12 + 0.2 * fl_n1(y * 0.05, seed + 8)) * (-light));
        const bi = Math.floor((y - yb) / band); const delta = bandsT[((bi % 80) + 80) % 80] < 0.3 ? -1 : bandsT[((bi % 80) + 80) % 80] > 0.8 ? 1 : 0;
        for (let x = xl; x <= xr; x++) {
          const lit = light > 0 ? x > ridge : x < ridge;
          let tone = lit ? 3 + delta : 1 + (delta > 0 ? 1 : 0);
          const stream = fl_n1(x * 0.55 + y * 0.015, seed + 3) > 0.76;
          if (stream && fl_h2(x, y, seed + 6) < 0.8) tone -= 1; if (!lit && x - xl < 2 || lit && xr - x < 1) tone += 0; if (lit && fl_h2(x, y, seed) < 0.05) tone += 1; if (!lit && fl_h2(x, y, seed + 1) < 0.07) tone -= 1;
          if (y - t.y0 < 1.5) tone = lit ? 5 : 3;                 // dessus éclairé de l'étage
          else if (y - t.y0 < 3 && lit) tone = Math.max(tone, 4);
          if (f > 0.85) tone -= lit ? 1 : 0;
          b.set(x, y, T[Math.max(0, Math.min(5, tone))]);
        }
        if (light > 0) b.set(xr, y, rimU); else b.set(xl, y, rimU);
        if (bandsT[((bi % 80) + 80) % 80] > 0.9 && (y % band) === 0) for (let x = xl + 1; x < xr; x++) if (fl_h2(x, y, seed) < 0.5) b.set(x, y, T[1]);
      }
      // fissures verticales
      for (let k = 0; k < 2; k++) { const xx = Math.round(cx + t.off + (r() - 0.5) * t.w * 0.7), y1c = t.y1 - 1 - r() * 6; for (let y = Math.round(t.y0) + 2 + Math.round(r() * 4); y < y1c; y++) if (fl_h2(xx, y, seed + 9) < 0.78 && b.get(xx + Math.round(Math.sin(y * 0.4) * 0.8), y)) b.set(xx + Math.round(Math.sin(y * 0.4) * 0.8), y, T[1]); }
    }
    // éboulis au pied : pente de pierres tramée
    const wb = prof[0].w / 2 * 1.18;
    for (let y = yb - 6; y <= yb; y++) for (let x = Math.round(cx - wb - 4); x <= Math.round(cx + wb + 4); x++) {
      const dx = Math.abs(x - cx) / (wb + 4), lim = (y - (yb - 6)) / 6; if (dx > 0.62 + lim * 0.38 + (fl_h2(x, y, seed) - 0.5) * 0.3 || b.get(x, y)) continue;      // talus collé au pied : étroit en haut, large en bas
      if (fl_bay(x, y) < 0.35 + lim * 0.7) b.set(x, y, T[(light > 0 ? x > cx : x < cx) ? 2 + (fl_h2(x, y, 5) < 0.3 ? 1 : 0) : 1]);
    }
    for (let k = 0; k < 8; k++) { const x = Math.round(cx + (r() - 0.5) * wb * 2.2), y = yb - Math.round(r() * 3); if (!b.get(x, y) && (b.get(x - 1, y) || b.get(x + 1, y) || b.get(x, y - 1))) { b.set(x, y, T[3]); b.set(x - 1, y, T[1]); b.set(x, y + 1, T[0]); } }    // cailloux seulement au contact du rocher ou du talus
    if (dep < 0.6) fl_selout(b, 0.6);
  });
}
// rocher rouge de désert : x, y = pied, w, h ; kind 'mesa' | 'spire' | 'ledge' | 'boulder'
function fl_desertRock(x, y, w, h, kind = 'mesa', seed = 1, o = {}) {
  if (kind === 'boulder') { fl_rock(x, y, w, h, 'round', seed, { ...o, mat: 'red' }); return; }
  const spr = fl_desertRockSpr(Math.round(w), Math.round(h), kind, seed | 0, { ...o, depth: o.depth ?? 0.3 });
  fl_blit(spr, fl_sx(x, o), fl_sy(y, o), 1);
}

// ═══════════════════════════════════════════════════════════════════════════════════════
// 6. DÉSERT : saguaros, figuiers de Barbarie, agaves, ocotillos, chollas, buissons secs, boule d'herbe, sable
// ═══════════════════════════════════════════════════════════════════════════════════════
const fl_CACT = [GR[0], GR[1], GR[2], GR[3], LM[3], LM[4]];

// tube de cactus côtelé : côtes verticales (sillons sombres), épines claires sur les côtes, lumière latérale
function fl_cactusShader(T, light, seed, ribs, spineU, o = {}) {
  const n = T.length;
  return (lat, nx, ny, s, px_, py_) => {
    const X = Math.round(px_), Y = Math.round(py_), nz = Math.sqrt(Math.max(0, 1 - lat * lat));
    let v = (fl_lam(nx * lat, ny * lat, nz, light) - 0.5) * 1.45 + 0.5 + (o.bias || 0);
    const ph = (lat * 0.5 + 0.5) * ribs, f = ph - Math.floor(ph), groove = Math.abs(f - 0.5) * 2;       // 1 au creux entre deux côtes
    v += (groove < 0.35 ? 0.0 : 0.0) - (groove > 0.82 ? 0.3 : 0) + (0.5 - groove) * 0.06;
    let c = T[fl_tone(v * 1.06 + 0.02, n, X, Y, 3.2)];
    if (groove < 0.18 && fl_h2(X, Y, seed) < 0.22) c = spineU;                     // épines au sommet des côtes
    return c;
  };
}

// calotte arrondie à l'extrémité haute d'un tube vertical (même ombrage que le tube)
function fl_capDome(b, x, y, w, T, light) {
  const hw = w / 2, nh = Math.max(2, Math.round(hw * 0.95));
  for (let dy = 0; dy < nh; dy++) { const f = dy / nh, half = Math.round(hw * Math.sqrt(Math.max(0, 1 - f * f))); for (let dx = -half; dx <= half; dx++) { const lat = dx / Math.max(1, hw), X = Math.round(x + dx), Y = Math.round(y - dy); b.set(X, Y, T[fl_tone(fl_lam(lat * 0.9, -f * 0.7, Math.sqrt(Math.max(0.05, 1 - lat * lat - f * f * 0.5)), light) * 1.05 + 0.02 + (f > 0.8 ? -0.1 : 0), T.length, X, Y, 3.2)]); } }
}
// ───────────── saguaro ─────────────
function fl_saguaroSpr(h, arms, seed, bloom, o) {
  const E = fl_env(o), light = E.light, dep = Math.round((o.depth ?? 0.3) * 10) / 10;
  const key = `sga|${h}|${arms}|${seed}|${bloom}|${E.name}|${E.mist}|${light}|${dep}|${o.flip || 0}`;
  const W = Math.round(h * 0.95) + 18, H = h + 10;
  return fl_spr(key, W, H, W >> 1, H - 4, b => {
    const r = fl_rng(seed), T = fl_tones(fl_CACT, o, 'leaf'), spine = fl_us(E.name === 'desertDusk' ? AM[9] : WH[1]), rimU = fl_us(E.rim);
    const cx = W >> 1, base = H - 5, tw = Math.max(5, Math.round(h * 0.125)), aw = Math.max(4, Math.round(tw * 0.74)), ribs = tw > 9 ? 7 : tw > 6 ? 5 : 4;
    const sh = fl_cactusShader(T, light, seed, ribs, spine);
    const tops = [];
    // bras : coude horizontal puis montée verticale
    const sides = arms === 1 ? [r() < 0.5 ? -1 : 1] : arms === 2 ? [-1, 1] : [-1, 1, r() < 0.5 ? -1 : 1];
    for (let i = 0; i < sides.length; i++) {
      const sd = sides[i], ya = base - h * (i === 2 ? 0.28 + r() * 0.08 : 0.34 + r() * 0.2 + (sd === light ? 0.04 : 0)), Lh = h * (0.17 + r() * 0.1) + tw * 0.4, Lv = h * (0.2 + r() * 0.16) * (i === 2 ? 0.7 : 1), ax = cx + sd * (tw * 0.25);
      const pts = [[ax, ya + 1, aw * 0.9], [ax + sd * Lh * 0.45, ya + 2.5, aw], [ax + sd * (Lh - aw * 0.55), ya - 0.5, aw], [ax + sd * Lh, ya - aw * 0.9, aw], [ax + sd * (Lh + sd * 0.8), ya - aw - Lv * 0.5, aw * 0.97], [ax + sd * (Lh + sd * 1.2), ya - aw - Lv, aw * 0.78]];
      fl_tube(b, pts, sh); tops.push([pts[5][0], pts[5][1], aw * 0.78]);
      fl_capDome(b, pts[5][0], pts[5][1], aw * 0.78, T, light);
    }
    // tronc, un peu renflé au milieu, calotte arrondie
    const tp = []; for (let k = 0; k <= 8; k++) { const f = k / 8; tp.push([cx + Math.sin(f * 2.5 + seed) * 0.6, base - h * f * 0.97 + (k === 8 ? 0 : 0), tw * (0.8 + 0.2 * Math.sin(Math.min(1, f * 1.6) * Math.PI * 0.5)) * (f > 0.92 ? 0.8 : 1)]); }
    fl_tube(b, tp, sh); tops.push([tp[8][0], tp[8][1], tw]);
    fl_capDome(b, tp[8][0], tp[8][1], tw, T, light);
    // fleurs blanches au sommet
    if (bloom > 0) for (const tpP of tops) for (let k = 0; k < Math.round(bloom * 3); k++) {
      const fx = Math.round(tpP[0] + (r() - 0.5) * tpP[2] * 0.8), fy = Math.round(tpP[1] - tpP[2] * 0.5 - r() * 2), W3 = fl_us(WH[3]), W2 = fl_us(WH[2]), W1 = fl_us(WH[1]);
      for (const [dx, dy, c] of [[-1, 0, W2], [1, 0, W1], [0, -1, W3], [0, 1, W1], [-2, 1, W1], [2, 1, W2], [-1, -1, W2], [1, -1, W3]]) b.set(fx + dx, fy + dy, c);
      b.set(fx, fy, fl_us(YE[1]));
    }
    // liseré de lumière du couchant sur le bord tourné vers le soleil
    fl_rim(b, light, rimU, { topP: 0.55, skip: c => c === spine });
    if (dep < 0.55) fl_selout(b, 0.62);
    // ombre de contact
    fl_gshadow(b, cx - light * 3, base + 3, Math.round(tw * 1.3), 2, T[0], 0.9);
  });
}
// saguaro : x, y = pied, h hauteur, arms 0 à 3, bloom 0..1 (fleurs blanches)
function fl_saguaro(t, o = {}) {
  const p = fl_o(o), spr = fl_saguaroSpr(Math.round(o.h ?? 120), o.arms ?? 2, (o.seed ?? 1) | 0, fl_q(o.bloom ?? 0), { ...o, depth: p.depth });
  fl_blit(spr, fl_sx(p.x, o), fl_sy(p.y, o));
}

// ───────────── figuier de Barbarie ─────────────
function fl_pad(b, cx, cy, rx, ry, ang, T, light, seed, fruit, spineU, fruitT, drawFruit) {
  const ca = Math.cos(ang), sa = Math.sin(ang), R_ = Math.ceil(Math.max(rx, ry)) + 2;
  for (let y = -R_; y <= R_; y++) for (let x = -R_; x <= R_; x++) {
    const u = (x * ca + y * sa) / rx, v = (-x * sa + y * ca) / ry, e = u * u + v * v; if (e > 1) continue;
    const nz = Math.sqrt(1 - e), nx = (u * ca - v * sa) * 0.9, ny = (u * sa + v * ca) * 0.9, X = Math.round(cx + x), Y = Math.round(cy + y);
    let tn = fl_tone(fl_lam(nx, ny, nz, light) * 1.05 + 0.02 + (fl_h2(X, Y, seed) - 0.5) * 0.1, T.length, X, Y, 3.2);
    if (e > 0.82) tn = Math.max(0, tn - 1);
    b.set(X, Y, T[tn]);
  }
  // aréoles : petits paquets d'épines en quinconce
  for (let gy = -R_; gy <= R_; gy += 3) for (let gx = -R_; gx <= R_; gx += 3) {
    const x = gx + ((gy / 3) & 1) * 1.5, y = gy, u = (x * ca + y * sa) / rx, v = (-x * sa + y * ca) / ry; if (u * u + v * v > 0.72) continue;
    const X = Math.round(cx + x), Y = Math.round(cy + y); b.set(X, Y, T[0]); b.set(X + light, Y - 1, spineU);
  }
}
function fl_prickleSpr(h, seed, fruit, o) {
  const E = fl_env(o), light = E.light, dep = Math.round((o.depth ?? 0.3) * 10) / 10, key = `pp|${h}|${seed}|${fruit}|${E.name}|${E.mist}|${light}|${dep}`;
  const W = Math.round(h * 1.5) + 14, H = h + 12;
  return fl_spr(key, W, H, W >> 1, H - 4, b => {
    const r = fl_rng(seed), T = fl_tones([GR[0], GR[1], GR[2], GR[3], GR[4]], o, 'leaf'), F = fl_tones([RD[0], RD[1], RD[2], RD[3], RD[4], RD[5]], { ...o, fogK: 0.5 }, 'warm'), spine = fl_us(E.name === 'desertDusk' ? AM[9] : WH[1]), cx = W >> 1, base = H - 5;
    const pads = []; const grow = (x, y, ang, s, lvl) => {
      pads.push({ x, y, ang, s, lvl });
      if (lvl >= 3) return; const nc = lvl === 0 ? 2 + (r() < 0.6 ? 1 : 0) : 1 + (r() < 0.55 ? 1 : 0);
      for (let k = 0; k < nc; k++) { const da = (nc === 1 ? (r() - 0.5) : (k / (nc - 1) - 0.5) * 1.5) * 1.0 + (r() - 0.5) * 0.4, a = ang + da, ns = s * (0.78 + r() * 0.15); const tx = x + Math.sin(a) * s * 0.95, ty = y - Math.cos(a) * s * 0.95; grow(tx, ty, a, ns, lvl + 1); }
    };
    const s0 = h * 0.28; grow(cx, base - s0 * 0.6, (r() - 0.5) * 0.3, s0, 0);
    pads.sort((a, c) => a.lvl - c.lvl);
    for (const pd of pads) fl_pad(b, pd.x, pd.y, pd.s * 0.56, pd.s * 0.72, pd.ang, T, light, seed + pd.lvl, 0, spine);
    // fruits rouges (figues de Barbarie) sur le bord supérieur des raquettes
    for (const pd of pads) if (pd.lvl >= 1) for (let k = 0; k < 4; k++) if (r() < fruit) {
      const a = pd.ang + (r() - 0.5) * 1.6, ex = pd.x + Math.sin(a) * pd.s * 0.72, ey = pd.y - Math.cos(a) * pd.s * 0.72, rr = Math.max(2, Math.round(h * 0.045));
      b.ell(Math.round(ex), Math.round(ey), rr - 1 + (rr > 2 ? 0 : 0), rr, F[2]); b.ell(Math.round(ex - light), Math.round(ey - 1), Math.max(0, rr - 2), Math.max(0, rr - 2), F[3]); b.set(Math.round(ex - light), Math.round(ey - 1), F[5]); b.set(Math.round(ex), Math.round(ey - rr), F[0]); if (rr > 2) b.set(Math.round(ex + light * 1), Math.round(ey + rr - 1), F[1]);
    }
    fl_rim(b, light, fl_us(E.rim), { topP: 0.4, skip: c => c === spine || F.includes(c) });
    if (dep < 0.55) fl_selout(b, 0.6);
    fl_gshadow(b, cx - light * 3, base + 3, Math.round(h * 0.3), 2, T[0], 0.9);
  });
}
// figuier de Barbarie : raquettes en bleu-vert, fruits rouges (fruit 0..1)
function fl_prickly(t, o = {}) {
  const p = fl_o(o), spr = fl_prickleSpr(Math.round(o.h ?? 50), (o.seed ?? 1) | 0, fl_q(o.fruit ?? 0.8), { ...o, depth: p.depth });
  fl_blit(spr, fl_sx(p.x, o), fl_sy(p.y, o));
}

// ───────────── agave ─────────────
function fl_agaveSpr(h, n, seed, stalk, o) {
  const E = fl_env(o), light = E.light, dep = Math.round((o.depth ?? 0.3) * 10) / 10, key = `ag|${h}|${n}|${seed}|${stalk}|${E.name}|${E.mist}|${light}|${dep}`;
  const W = Math.round(h * 1.9) + 14, H = h + Math.round(stalk * h * 1.4) + 12;
  return fl_spr(key, W, H, W >> 1, H - 5, b => {
    const r = fl_rng(seed), T = fl_tones([GR[0], GR[1], GR[2], GR[3], GR[4], CY[3]], o, 'leaf'), cx = W >> 1, base = H - 6, tipU = fl_us(WO[1]), rimU = fl_us(E.rim);
    const leaves = [];
    for (let i = 0; i < n; i++) { const f = n > 1 ? i / (n - 1) : 0.5, a = (f - 0.5) * 2.7 + (r() - 0.5) * 0.25, up = Math.cos(a * 0.9); leaves.push({ a, L: h * (0.62 + 0.4 * Math.max(0, up) * (0.85 + r() * 0.3)), w: Math.max(3, h * 0.13) * (0.8 + r() * 0.3) }); }
    leaves.sort((p, q) => Math.abs(q.a) - Math.abs(p.a));
    // hampe florale (optionnelle) derrière les feuilles
    if (stalk > 0) {
      const sh = h * (0.9 + stalk * 1.2), pts = [[cx, base - h * 0.3, 3], [cx + 0.5, base - sh * 0.5, 2.6], [cx + 1, base - sh, 2]];
      fl_tube(b, pts, (lat, nx, ny, s, x, y) => T[1 + (lat * light > 0.1 ? 1 : 0)]);
      for (let k = 0; k < 5; k++) { const yy = base - sh * (0.55 + k * 0.1), sd = k % 2 ? 1 : -1, ln = 4 + (4 - k) * 1.8; b.line(cx + 1, yy, cx + 1 + sd * ln, yy - 3, T[1]); for (let q = 0; q < 3; q++) { b.set(Math.round(cx + 1 + sd * (ln + q - 1)), Math.round(yy - 4 - q * 0.3), fl_us(YE[1])); b.set(Math.round(cx + 1 + sd * (ln + q - 1)), Math.round(yy - 5), fl_us(YE[2])); } }
    }
    for (const lf of leaves) {
      const pts = [], bend = lf.a * 0.55, steps = 7;
      for (let k = 0; k <= steps; k++) { const s = k / steps, ang = lf.a * 0.95 + bend * s * s; pts.push([cx + Math.sin(ang) * lf.L * s * 1.0 + lf.a * s * s * lf.L * 0.16, base - 2 - Math.cos(ang * 0.8) * lf.L * s + (s * s) * Math.abs(lf.a) * lf.L * 0.16, lf.w * (k === 0 ? 0.55 : Math.sin(Math.min(1, 0.25 + s * 0.9) * Math.PI * (s > 0.5 ? 0.62 : 0.5)) * (1 - s * 0.25)) + 0.6]); }
      pts[steps][2] = 1;
      fl_tube(b, pts, (lat, nx, ny, s, x, y) => {
        const nz = Math.sqrt(Math.max(0, 1 - lat * lat)); let v = fl_lam(nx * lat, ny * lat, nz, light) * 1.05 + 0.05;
        const mid = Math.abs(lat) < 0.14 ? 0.18 : 0;                                           // nervure centrale claire
        const X = Math.round(x), Y = Math.round(y); let c = T[fl_tone(v + mid, 6, X, Y, 3.2)];
        if (Math.abs(lat) > 0.86 && Math.floor(s * 26) % 2 === 0) c = T[0];                    // dents sur les bords
        return c;
      });
      const e = pts[steps], q = pts[steps - 1], dx = e[0] - q[0], dy = e[1] - q[1], l = Math.hypot(dx, dy) || 1;
      b.line(e[0], e[1], e[0] + dx / l * 3, e[1] + dy / l * 3, tipU);
    }
    fl_rim(b, light, rimU, { topP: 0.5, skip: c => c === tipU });
    if (dep < 0.55) fl_selout(b, 0.6);
    fl_gshadow(b, cx - light * 4, base + 3, Math.round(h * 0.55), 2, T[0], 0.9);
  });
}
function fl_agave(t, o = {}) {
  const p = fl_o(o), spr = fl_agaveSpr(Math.round(o.h ?? 40), o.n ?? 15, (o.seed ?? 1) | 0, fl_q(o.stalk ?? 0), { ...o, depth: p.depth });
  fl_blitSway(spr, fl_sx(p.x, o), fl_sy(p.y, o), 0.6 * fl_wind(t, p.x, o), { pow: 2, span: spr.h });
}

// ───────────── ocotillo ─────────────
function fl_ocotilloSpr(h, n, seed, bloom, o) {
  const E = fl_env(o), light = E.light, dep = Math.round((o.depth ?? 0.3) * 10) / 10, key = `oc|${h}|${n}|${seed}|${bloom}|${E.name}|${E.mist}|${light}|${dep}`;
  const W = Math.round(h * 0.9) + 20, H = h + 10;
  return fl_spr(key, W, H, W >> 1, H - 4, b => {
    const r = fl_rng(seed), T = fl_tones([WO[1], ST[2], GR[1], GR[2], LM[2], LM[3]], o, 'leaf'), F = fl_tones([RD[2], RD[3], RD[4], AM[6], AM[7]], { ...o, fogK: 0.4 }, 'warm'), cx = W >> 1, base = H - 5;
    const stems = []; for (let i = 0; i < n; i++) { const f = n > 1 ? i / (n - 1) : 0.5; stems.push({ a: (f - 0.5) * 1.1 + (r() - 0.5) * 0.18, L: h * (0.72 + 0.28 * r()), x0: cx + (f - 0.5) * 7 }); }
    stems.sort((p, q) => Math.abs(q.a) - Math.abs(p.a));
    for (const st of stems) {
      const steps = Math.round(st.L / 1.5), pts = [];
      for (let k = 0; k <= steps; k++) { const s = k / steps; pts.push([st.x0 + Math.sin(st.a) * st.L * s + st.a * 6 * s * s * (s > 0.5 ? 1 : 0.4) * 3 + Math.sin(s * 5 + st.a * 9) * 0.6, base - Math.cos(st.a * 0.5) * st.L * s]); }
      for (let k = 0; k <= steps; k++) {
        const p = pts[k], s = k / steps, wd = s < 0.25 ? 2 : 1;
        b.set(Math.round(p[0]), Math.round(p[1]), T[st.a * light > 0 ? 3 : 2]); if (wd === 2) b.set(Math.round(p[0]) - light, Math.round(p[1]), T[1]);
        if (k % 3 === 0 && s > 0.1) { b.set(Math.round(p[0] + (k % 6 === 0 ? 1 : -1)), Math.round(p[1]), T[5]); if (fl_h(k, seed) < 0.4) b.set(Math.round(p[0] + (k % 6 === 0 ? 2 : -2)), Math.round(p[1]) - 1, T[4]); }
      }
      // fleurs rouges en flamme au bout
      const e = pts[pts.length - 1], nb = Math.round(3 + bloom * 9);
      for (let k = 0; k < nb * bloom; k++) { const f = k / Math.max(1, nb * bloom), fy = e[1] + f * 9 - 1, fx = e[0] + (fl_h(k, seed + st.L) - 0.5) * 3; b.set(Math.round(fx), Math.round(fy), F[f < 0.35 ? 4 : f < 0.7 ? 2 : 1]); b.set(Math.round(fx + light), Math.round(fy - 1), F[3]); }
      if (bloom > 0) { b.set(Math.round(e[0]), Math.round(e[1]) - 1, F[3]); b.set(Math.round(e[0]), Math.round(e[1]) - 2, F[4]); }
    }
    if (dep < 0.5) fl_selout(b, 0.5, (x, y, n_) => F.includes(n_) || T.includes(n_));
    fl_gshadow(b, cx - light * 4, base + 3, 8, 2, T[0], 0.9);
  });
}
function fl_ocotillo(t, o = {}) {
  const p = fl_o(o), spr = fl_ocotilloSpr(Math.round(o.h ?? 80), o.n ?? 11, (o.seed ?? 1) | 0, fl_q(o.bloom ?? 0.8), { ...o, depth: p.depth });
  fl_blitSway(spr, fl_sx(p.x, o), fl_sy(p.y, o), 2.4 * fl_wind(t, p.x, o), { pow: 1.6 });
}

// ───────────── cholla (cactus « ours en peluche » : bras articulés, halo d'épines dorées) ─────────────
function fl_chollaSpr(h, seed, o) {
  const E = fl_env(o), light = E.light, dep = Math.round((o.depth ?? 0.3) * 10) / 10, key = `ch2|${h}|${seed}|${E.name}|${E.mist}|${light}|${dep}`;
  const W = Math.round(h * 1.0) + 22, H = h + 12;
  return fl_spr(key, W, H, W >> 1, H - 5, b => {
    const r = fl_rng(seed), T = fl_tones([WO[1], OC[1], OC[2], AM[4], AM[5], AM[7]], o, 'warm'), sp = fl_tones([AM[6], AM[7], AM[8], AM[9], AM[10]], { ...o, fogK: 0.5 }, 'warm'), cx = W >> 1, base = H - 6;
    const cfg = {
      r, curve: 0, wob: 0.45, droop: 0, split: 1.7, sa: 0.78, lk: 0.72, wk: 0.92, maxLvl: 3, minLen: 8,
      draw: (bb, pts, w, lvl) => {
        const ww = Math.max(5, Math.round(w)); fl_tube(bb, pts.map(p => [p[0], p[1], ww]), (lat, nx, ny, s, px_, py_) => {
          const X = Math.round(px_), Y = Math.round(py_), nz = Math.sqrt(Math.max(0, 1 - lat * lat)); let v = fl_lam(nx * lat, ny * lat, nz, light) * 1.05 + 0.05;
          const k = (s * pts.length * 1.3) % 3.2; if (k < 0.5) v -= 0.25;                       // articulations
          return T[fl_tone(v + (fl_h2(X, Y, seed) - 0.5) * 0.25, T.length, X, Y, 3)];
        });
        const e = pts[pts.length - 1]; fl_capDome(bb, e[0], e[1], ww, T, light);
      },
    };
    fl_grow(b, cx, base, -Math.PI / 2 + (r() - 0.5) * 0.15, h * 0.42, Math.max(6, h * 0.14), cfg, 0);
    fl_grow(b, cx - 3, base - h * 0.12, -Math.PI / 2 - 0.85, h * 0.4, Math.max(5, h * 0.11), { ...cfg, maxLvl: 2 }, 1);
    fl_grow(b, cx + 3, base - h * 0.1, -Math.PI / 2 + 0.85, h * 0.4, Math.max(5, h * 0.11), { ...cfg, maxLvl: 2 }, 1);
    // halo d'épines dorées : pixels autour de la silhouette, plus vifs côté soleil
    const add = [];
    for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
      if (b.d[y * W + x]) continue; let nb = 0, lit = 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (b.d[(y + dy) * W + x + dx] && T.includes(b.d[(y + dy) * W + x + dx])) { nb++; if (dx * light < 0 || dy > 0) lit++; }
      if (nb && fl_h2(x, y, seed + 6) < 0.5) add.push(x, y, sp[Math.min(4, 1 + lit + (fl_h2(x, y, 3) < 0.3 ? 1 : 0))]);
    }
    for (let i = 0; i < add.length; i += 3) b.set(add[i], add[i + 1], add[i + 2]);
    for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) if (!b.d[y * W + x] && sp.includes(b.d[y * W + x + 1]) && fl_h2(x, y, seed + 9) < 0.18) b.set(x, y, sp[1]);
    for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) if (T.includes(b.d[y * W + x]) && fl_h2(x, y, seed + 11) < 0.1) b.set(x, y, sp[2 + (fl_h2(x, y, 2) < 0.5 ? 1 : 0)]);
    fl_gshadow(b, cx - light * 3, base + 3, Math.round(h * 0.28), 2, T[0], 0.9);
  });
}
function fl_cholla(t, o = {}) {
  const p = fl_o(o), spr = fl_chollaSpr(Math.round(o.h ?? 50), (o.seed ?? 1) | 0, { ...o, depth: p.depth });
  fl_blit(spr, fl_sx(p.x, o), fl_sy(p.y, o));
}

// ───────────── buissons secs ─────────────
function fl_dryShrubSpr(h, seed, o) {
  const E = fl_env(o), light = E.light, dep = Math.round((o.depth ?? 0.3) * 10) / 10, key = `ds|${h}|${seed}|${E.name}|${E.mist}|${light}|${dep}|${o.leafy ?? 0}`;
  const W = Math.round(h * 1.7) + 14, H = h + 8;
  return fl_spr(key, W, H, W >> 1, H - 3, b => {
    const r = fl_rng(seed), T = fl_tones([WO[0], WO[1], WO[2], OC[2], OC[3], AM[6]], o, 'warm'), Lf = fl_tones([LM[0], LM[1], LM[2], OC[2], AM[4]], o, 'leaf'), cx = W >> 1, base = H - 4, tips = [];
    const cfg = {
      r, curve: 0, wob: 0.7, droop: 0.15, split: 2.6, sa: 0.65, lk: 0.62, wk: 0.7, maxLvl: 3, minLen: 4,
      draw: (bb, pts, w, lvl) => { const litS = light > 0 ? (pts[0][0] < pts[pts.length - 1][0]) : (pts[0][0] > pts[pts.length - 1][0]); fl_poly1(bb, pts, litS ? T[lvl > 1 ? 4 : 3] : T[lvl > 1 ? 2 : 1]); if (lvl === 0) fl_poly1(bb, pts.map(p => [p[0] - light, p[1]]), T[0]); },
      tip: (x, y, lvl) => { if (lvl >= 2) tips.push([x, y]); },
    };
    const n = 4 + Math.floor(h / 12);
    for (let i = 0; i < n; i++) fl_grow(b, cx + (r() - 0.5) * h * 0.4, base, -Math.PI / 2 + (r() - 0.5) * 1.7, h * (0.5 + r() * 0.5), 2, cfg, 0);
    for (const tp of tips) { if (fl_h(tp[0] * 3 + tp[1], seed) < 0.6) { const c = Lf[1 + Math.floor(fl_h(tp[0], tp[1]) * 3)]; b.set(Math.round(tp[0]), Math.round(tp[1]), c); b.set(Math.round(tp[0] + light), Math.round(tp[1]) - 1, Lf[Math.min(4, 2 + (fl_h(tp[1], 1) < 0.4 ? 2 : 0))]); } }
    if (dep < 0.5) fl_selout(b, 0.5, (x, y, n_) => false);
    for (let x = -4; x <= 4; x++) if (fl_bay(x + cx, 3) < 0.6 - Math.abs(x) * 0.07) b.set(cx + x - light, base + 2, T[0]);
  });
}
function fl_dryShrub(t, o = {}) {
  const p = fl_o(o), spr = fl_dryShrubSpr(Math.round(o.h ?? 26), (o.seed ?? 1) | 0, { ...o, depth: p.depth });
  fl_blitSway(spr, fl_sx(p.x, o), fl_sy(p.y, o), 1.4 * fl_wind(t, p.x, o), { pow: 1.4 });
}

// ───────────── boule d'herbe sèche (virevoltante) ─────────────
// x, y = centre au sol (pied) ; roule sans glisser : la rotation suit l'abscisse ; o.r rayon (9), o.hop hauteur des rebonds, o.dir sens de roulement
const fl_TW = (() => { const r = rng(4242), cs = []; for (let i = 0; i < 18; i++) { const u = [r() - 0.5, r() - 0.5, r() - 0.5], l = Math.hypot(...u) || 1; cs.push({ u: u.map(v => v / l), ph: r() * TAU, cut: r() < 0.3 ? 0.25 + r() * 0.4 : 0 }); } return cs; })();
function fl_tumbleweed(x, y, t, o = {}) {
  const E = fl_env(o), light = E.light, rad = o.r ?? 12, hop = o.hop ?? 0, dir = o.dir ?? 1, sx_ = fl_sx(x, o), sy_ = fl_sy(y, o);
  const bounce = hop * Math.abs(Math.sin(x * 0.09 + (o.ph || 0))), cy = sy_ - rad - bounce, cx = sx_, rot = dir * (x / rad) + (o.spin || 0);
  const T = fl_tones([WO[0], WO[2], OC[2], AM[5], AM[8], AM[10]], { ...o, depth: o.depth ?? 0.1 }, 'warm');
  // ombre au sol (ovale qui rétrécit quand la boule saute)
  const sk = 1 - Math.min(0.5, bounce / (rad * 3)); L.setTransform(1, 0, 0, 1, 0, 0); L.globalAlpha = 0.6; ell(cx - light * 2, sy_ + 1, Math.round(rad * 0.95 * sk), 2, '#2e1a56'); L.globalAlpha = 1;
  // masse intérieure sombre (l'arrière de la boule)
  L.globalAlpha = 0.35; disc(cx, cy, rad - 1, fl_hexU(T[0])); L.globalAlpha = 1;
  const ca = Math.cos(rot), sa = Math.sin(rot), segs = [];
  for (const c of fl_TW) {
    // grand cercle de normale u, tourné autour de l'axe z (roulement) puis projeté
    const ux = c.u[0], uy = c.u[1], uz = c.u[2], nx = ux * ca - uy * sa, ny = ux * sa + uy * ca, nz = uz;
    let ax = -ny, ay = nx, az = 0, al = Math.hypot(ax, ay, az); if (al < 1e-3) { ax = 1; ay = 0; al = 1; } ax /= al; ay /= al;
    const bx = ny * az - nz * ay, by = nz * ax - nx * az, bz = nx * ay - ny * ax, N = 30;
    for (let k = 0; k < N; k++) {
      const a = k / N * TAU + c.ph; if (c.cut && ((k / N) % 1) < c.cut) continue;
      const px_ = ax * Math.cos(a) + bx * Math.sin(a), py_ = ay * Math.cos(a) + by * Math.sin(a), pz = az * Math.cos(a) + bz * Math.sin(a);
      segs.push([pz, Math.round(cx + px_ * (rad - 0.5)), Math.round(cy + py_ * (rad - 0.5)), px_, py_]);
    }
  }
  segs.sort((p, q) => p[0] - q[0]);                                  // le fond d'abord, puis les brins de devant
  for (const sg of segs) {
    const lit = fl_cl(0.5 + 0.5 * (sg[3] * light * 0.85 - sg[4] * 0.5)), front = sg[0] > 0;
    L.fillStyle = fl_hexU(front ? T[2 + Math.round(lit * 3)] : T[1 + Math.round(lit * 1.5)]); L.fillRect(sg[1], sg[2], 1, 1);
    if (front && sg[0] > 0.55 && lit < 0.35) { L.fillStyle = fl_hexU(T[0]); L.fillRect(sg[1] - light, sg[2] + 1, 1, 1); }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════════════
// 7. SAVANE : acacias en parasol, baobab, hautes herbes, termitière, buissons
// ═══════════════════════════════════════════════════════════════════════════════════════
const fl_ACAF = [GR[0], GR[1], LM[1], LM[2], LM[3], LM[4]];            // feuillage de baobab
const fl_ACAD = [GR[0], GR[1], GR[2], LM[1], LM[2]];                   // canopée d'acacia à contre-jour : vert sombre, le vert clair LM seulement en bouquets côté soleil

// ───────────── acacia en parasol ─────────────
// kind : 'tortilis' (large table plate) | 'lean' (penché, canopée décalée) | 'twin' (deux troncs) | 'round' (couronne arrondie) ; o.sil : silhouette à contre-jour
function fl_acaciaSpr(h, cw, kind, seed, sil, o) {
  const E = fl_env(o), light = E.light, dep = Math.round((o.depth ?? 0.3) * 10) / 10, key = `ac|${h}|${cw}|${kind}|${seed}|${sil ? 1 : 0}|${E.name}|${E.mist}|${light}|${dep}`;
  const W = Math.round(cw + 30), H = Math.round(h + 14);
  return fl_spr(key, W, H, W >> 1, H - 5, b => {
    const r = fl_rng(seed), base = H - 6, cx = W >> 1;
    const oM = { ...o, fogK: (o.fogK ?? 1) * Math.min(1, 0.45 / Math.max(0.01, fl_fog(dep))) };      // brume plafonnée à 0,45 : le feuillage reste vert (plus loin : sil: true)
    const Tw = sil ? fl_tones([NI[0], NI[1], DU[0], NI[3]], { ...o, fogK: 0.4 }, 'sil') : fl_tones([NI[1], WO[0], WO[1], WO[2], WO[3]], oM, 'wood');
    const Tl = sil ? fl_tones([NI[0], NI[1], DU[0], DU[1], NI[3]], { ...o, fogK: 0.4 }, 'sil') : fl_tones(fl_ACAD, oM, 'leaf'), rimU = fl_us(E.rim);
    const ct = h * (kind === 'round' ? 0.42 : 0.26), ctop = base - h + Math.round(ct * 0.5), off = kind === 'lean' ? cw * 0.12 * (r() < 0.5 ? -1 : 1) : 0, ccx = cx + off;
    const trunk = (x0, wb, hf, lean) => {                            // tronc court qui se divise en branches maîtresses qui montent vers la canopée
      const fy = base - h * hf, pts = [[x0, base, wb], [x0 + lean * 0.3, base - h * hf * 0.5, wb * 0.88], [x0 + lean, fy, wb * 0.75]];
      fl_tube(b, pts, fl_shader(Tw, light, { dk: 3, rough: 0.2 }));
      const nL = kind === 'round' ? 3 : 2 + (r() < 0.5 ? 1 : 0), cap = ctop + ct * 0.85;
      for (let i = 0; i < nL; i++) {
        const f = nL === 1 ? 0.5 : i / (nL - 1), tx = ccx + (f - 0.5) * cw * (kind === 'round' ? 0.5 : 0.62) + (r() - 0.5) * 4, my = fy - (fy - cap) * 0.5;
        const lp = [[x0 + lean, fy, wb * 0.6], [x0 + lean + (tx - x0 - lean) * 0.3 + (r() - 0.5) * 3, my + 4, wb * 0.45], [tx, cap, Math.max(1.6, wb * 0.32)]];
        fl_tube(b, lp, fl_shader(Tw, light, { dk: 3 }));
        // brindilles qui montent dans la canopée
        for (let k = 0; k < 3; k++) { const bx = tx + (r() - 0.5) * 18, by = cap; fl_poly1(b, [[tx, cap + 1], [(tx + bx) / 2, cap - 2], [bx, by - 4]], Tw[sil ? 2 : 3]); }
      }
    };
    if (kind === 'twin') { trunk(cx - cw * 0.12, Math.max(4, cw * 0.034), 0.45, -3); trunk(cx + cw * 0.14, Math.max(4, cw * 0.03), 0.5, 3); }
    else trunk(cx + off * 0.2, Math.max(4, cw * 0.042), 0.4, off * 0.4);
    // canopée : bandes de bouquets (arc doux, dessous à plat), du fond vers le premier plan
    const under = (x) => ctop + ct * (0.92 + 0.06 * Math.sin(x * 0.7 + seed) + (fl_h2(Math.floor(x), seed, 3) - 0.5) * 0.12);
    const layers = kind === 'round' ? 4 : 3;
    for (let L_ = 0; L_ < layers; L_++) {
      const lf = L_ / (layers - 1), step = 5.5 - 0.5 * L_;
      for (let x = ccx - cw / 2 + 2; x < ccx + cw / 2 - 2; x += step * (0.85 + 0.3 * r())) {
        const u = (x - ccx) / (cw / 2), dome = (kind === 'round' ? 0.85 : 0.5) * ct * (1 - u * u * (kind === 'round' ? 1 : 0.9)), droop = Math.pow(Math.abs(u), 3) * ct * 0.35;
        const cy = ctop + ct * (0.5 + 0.3 * lf) - dome * (1 - 0.7 * lf) + droop - r() * ct * 0.16, rx = Math.round(5 + r() * 5 + (1 - Math.abs(u)) * 3), ry = Math.round(ct * (0.2 + 0.14 * r())) + 1;
        const lim = under(x) - cy; if (lim < 1.5) continue;
        fl_clump(b, Math.round(x), Math.round(Math.min(cy, under(x) - ry)), rx, Math.min(ry, Math.max(2, Math.floor(lim))), Tl, light, { rag: 0.55, seed: seed + L_ * 7, hi: 0.45, bias: 0.14 * lf - 0.2 + (r() - 0.5) * 0.2 + (u * light > 0.25 ? 0.14 : 0), dk: 3.4 });
      }
    }
    // trous de ciel dans le feuillage (tramés) et franges pendantes sous la canopée
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { if (!b.d[y * W + x] || y < ctop + 3) continue; if (fl_n2(x / 2.2, y / 1.6, seed + 4) > 0.8 && fl_bay(x, y) < 0.7 && y > ctop + ct * 0.35) b.d[y * W + x] = 0; }
    for (let x = Math.round(ccx - cw / 2); x < ccx + cw / 2; x++) { const yy = Math.round(under(x)); if (b.get(x, yy) && fl_h2(x, yy, seed) < 0.3) { b.set(x, yy + 1, Tl[sil ? 1 : 0]); if (fl_h2(x, yy, seed + 5) < 0.3) b.set(x, yy + 2, Tl[0]); } }
    // dessous de la canopée à l'ombre : bande sombre tramée
    if (!sil) for (let y = Math.round(ctop + ct * 0.5); y <= Math.round(ctop + ct + 2); y++) for (let x = 0; x < W; x++) {      // le dessous est à l'ombre : deux tons plus sombre, puis le plus sombre
      const c = b.d[y * W + x], k = (y - (ctop + ct * 0.5)) / (ct * 0.5), ix = c ? Tl.indexOf(c) : -1; if (ix < 0 || fl_bay(x, y) >= Math.min(1, k * 1.15)) continue;
      b.d[y * W + x] = Tl[k > 0.8 ? 0 : Math.max(0, ix - 2)];
    }
    else for (let y = Math.round(ctop + ct * 0.7); y <= Math.round(ctop + ct + 2); y++) for (let x = 0; x < W; x++) { const c = b.d[y * W + x]; if (c && Tl.includes(c) && fl_bay(x, y) < (y - (ctop + ct * 0.7)) / (ct * 0.34) * 0.8) b.d[y * W + x] = Tl[0]; }
    fl_rim(b, light, rimU, { topP: sil ? 0.9 : 0.55, skip: c => Tw.includes(c) && !sil });
    if (dep < 0.5 && !sil) fl_selout(b, 0.6);
    fl_gshadow(b, cx - light * 6, base + 3, Math.round(cw * 0.28), 2, Tw[0], 0.8);
  });
}
// acacia : x, y = pied, h hauteur totale, cw largeur de la canopée (2,4 h par défaut)
function fl_acacia(t, o = {}) {
  const p = fl_o(o), h = Math.round(o.h ?? 90), cw = Math.round(o.cw ?? h * 2.3), spr = fl_acaciaSpr(h, cw, o.kind || 'tortilis', (o.seed ?? 1) | 0, !!o.sil, { ...o, depth: p.depth });
  fl_blitSway(spr, fl_sx(p.x, o), fl_sy(p.y, o), 1.2 * fl_wind(t, p.x, o), { pow: 1.4 });
}

// ───────────── baobab ─────────────
function fl_baobabSpr(h, seed, sil, leaf, o) {
  const E = fl_env(o), light = E.light, dep = Math.round((o.depth ?? 0.3) * 10) / 10, key = `bb|${h}|${seed}|${sil ? 1 : 0}|${leaf}|${E.name}|${E.mist}|${light}|${dep}`;
  const tw = h * 0.46, W = Math.round(h * 1.1) + 24, H = h + 12;
  return fl_spr(key, W, H, W >> 1, H - 5, b => {
    const r = fl_rng(seed), base = H - 6, cx = W >> 1, T = sil ? fl_tones([NI[0], NI[1], DU[0], DU[1], NI[3]], { ...o, fogK: 0.4 }, 'sil') : fl_tones([NI[2], DU[1], WO[1], WO[2], WO[3], OC[2]], o, 'warm'), lv = sil ? T : fl_tones(fl_ACAF, o, 'leaf'), rimU = fl_us(E.rim);
    const topY = base - h * 0.74;
    // branches épaisses, courtes, qui s'écartent en haut
    const cfg = { r, curve: 0, wob: 0.35, droop: 0.1, split: 2.2, sa: 0.55, lk: 0.7, wk: 0.62, maxLvl: 2, minLen: 6, draw: (bb, pts, w, lvl) => { if (w >= 2.5) fl_tube(bb, pts, fl_shader(T, light, { dk: 3 })); else fl_poly1(bb, pts, T[1]); }, tip: (x, y, lvl) => { if (leaf > 0 && lvl >= 1) fl_clump(b, Math.round(x), Math.round(y - 2), 5 + Math.round(r() * 3), 2 + Math.round(r() * 2), lv.slice(sil ? 0 : 1), light, { rag: 0.55, seed: seed + Math.round(x), hi: 0.3, bias: 0.1 }); } };
    const nb = 6; for (let i = 0; i < nb; i++) { const f = (i + 0.5) / nb, a = -Math.PI / 2 + (f - 0.5) * 2.2 + (r() - 0.5) * 0.3; fl_grow(b, cx + (f - 0.5) * tw * 0.55, topY + 2, a, h * (0.2 + r() * 0.13), Math.max(3, tw * 0.12), cfg, 0); }
    // tronc en bouteille : renflé, bosselé
    const pts = [[cx, base, tw * 0.96], [cx + 1, base - h * 0.14, tw * 1.08], [cx - 1, base - h * 0.34, tw * 0.98], [cx + 1, base - h * 0.55, tw * 0.82], [cx, topY, tw * 0.66]];
    fl_tube(b, pts, (lat, nx, ny, s, px_, py_) => {
      const X = Math.round(px_), Y = Math.round(py_), nz = Math.sqrt(Math.max(0, 1 - lat * lat)); let v = fl_lam(nx * lat, ny * lat, nz, light) * 1.02 + 0.05;
      v += (fl_fbm(X / 3, Y / 9, seed, 2) - 0.5) * 0.5;                                  // plis verticaux de l'écorce
      if (fl_n1(Y * 0.42, seed + 2) > 0.8 && fl_h2(X, Y, 1) < 0.7) v -= 0.22;               // plis horizontaux
      return T[fl_tone(v, T.length, X, Y, 3.2)];
    });
    fl_rim(b, light, rimU, { topP: sil ? 0.9 : 0.5 });
    if (dep < 0.5 && !sil) fl_selout(b, 0.6);
    fl_gshadow(b, cx - light * 8, base + 3, Math.round(tw * 0.62), 2, T[0], 0.8);
  });
}
function fl_baobab(t, o = {}) {
  const p = fl_o(o), spr = fl_baobabSpr(Math.round(o.h ?? 100), (o.seed ?? 1) | 0, !!o.sil, fl_q(o.leaf ?? 0.5), { ...o, depth: p.depth });
  fl_blitSway(spr, fl_sx(p.x, o), fl_sy(p.y, o), 0.7 * fl_wind(t, p.x, o), { pow: 2.2 });
}

// ───────────── hautes herbes dorées ─────────────
function fl_grassStrip(h, seed, o, gold) {
  const E = fl_env(o), light = E.light, dep = Math.round((o.depth ?? 0.4) * 10) / 10, key = `gr|${h}|${seed}|${E.name}|${E.mist}|${light}|${dep}|${gold ? 1 : 0}|${o.dens ?? 1}|${o.green ?? 0}`;
  const M = 110, W = LW + 2 * M, H = Math.round(h * 1.25) + 8;
  return fl_spr(key, W, H, M, H - 2, b => {
    const r = fl_rng(seed), base = H - 3;
    const T = fl_tones(o.green ? [LM[0], LM[1], LM[2], LM[3], LM[4], LM[5]] : [OC[0], OC[1], AM[4], AM[6], AM[7], AM[9]], o, o.green ? 'leaf' : 'warm'), seedU = fl_tones([AM[8], AM[9], AM[10], WH[2]], { ...o, fogK: 0.5 }, 'warm');
    // sous-bois : masse basse et irrégulière, plus claire que les pieds (pas de barre sombre continue)
    for (let x = 0; x < W; x++) { const top = Math.round(h * (0.06 + 0.1 * fl_n1(x * 0.09, seed) + 0.1 * fl_h(x, seed + 3))); for (let y = base - top; y <= base; y++) b.set(x, y, T[y < base - top + 1 ? 2 : fl_bay(x, y) < 0.35 ? 1 : 2]); }
    const dens = o.dens ?? 1, n = Math.round(W * 0.5 * dens * (h < 25 ? 1.4 : 1));
    const bl = []; for (let i = 0; i < n; i++) { const x = r() * W, hn = fl_n1(x * 0.05, seed + 7); bl.push({ x, hh: h * (0.5 + 0.55 * hn) * (0.7 + 0.5 * r()), lean: (r() - 0.5) * 7 + 1.2, k: r(), b0: Math.round(r() * h * 0.16) }); }
    bl.sort((a, c) => a.hh - c.hh);
    for (const q of bl) {
      const steps = Math.max(4, Math.round(q.hh)), cur = (r() - 0.5) * 0.8 + 0.2;
      for (let k = 0; k <= steps; k++) {
        const s = k / steps, x = q.x + q.lean * s * s + cur * Math.sin(s * 3) * 2, y = base - q.b0 - q.hh * s, ti = Math.min(5, Math.round(1 + s * 4.2 + (q.k > 0.7 ? 0.8 : 0) - 0.5));
        b.set(Math.round(x), Math.round(y), T[ti]);
        if (h > 28 && s < 0.7) b.set(Math.round(x - light), Math.round(y), T[Math.max(0, ti - 1)]);
        else if (h > 28 && s >= 0.7 && s < 0.97) b.set(Math.round(x + light), Math.round(y), T[Math.min(5, ti + 1)]);
      }
      if (q.k < 0.28 && !o.green) {                                  // épis : plumet de graines éclairé par le soleil
        const x = q.x + q.lean, y = base - q.hh - q.b0; const k2 = Math.max(2, Math.round(h * 0.07));
        for (let j = 0; j < k2; j++) { b.set(Math.round(x + j * 0.3 * q.lean / 6), Math.round(y - j), seedU[j > k2 * 0.5 ? 2 : 1]); if (j > 0 && j < k2 - 1) { b.set(Math.round(x - 1 + j * 0.2), Math.round(y - j), seedU[0]); b.set(Math.round(x + 1 + j * 0.2), Math.round(y - j), seedU[1 + (light > 0 ? 1 : 0)]); } }
      }
    }
    for (let y = base - 3; y < H; y++) { const p = (y - (base - 3) + 1) / (H - base + 3); for (let x = 0; x < W; x++) if (b.d[y * W + x] && fl_bay(x, y) < p * 0.95) b.d[y * W + x] = 0; }
    if (dep < 0.3) fl_selout(b, 0.5, (x, y, n_) => T.indexOf(n_) <= 1);
  });
}
// bandes d'herbe de savane entre les lignes y0 (lointaine) et y1 (proche) : o.bands (3), o.h (hauteur des herbes de la bande proche), o.sweep (amplitude du vent), o.green
function fl_savannaGrass(y0, y1, o = {}) {
  o = o || {}; const n = o.bands ?? 3, hN = o.h ?? 46, seed = (o.seed ?? 1) | 0, t = o.t ?? 0, dF = o.depth ?? 0.7, dN = o.depthNear ?? Math.max(0.0, dF - 0.65);
  for (let k = 0; k < n; k++) {
    const f = n > 1 ? k / (n - 1) : 1, depth = dF + (dN - dF) * f, y = y0 + (y1 - y0) * Math.pow(f, 1.1), hk = Math.max(8, Math.round(hN * (0.38 + 0.62 * Math.pow(f, 1.2)))), par = o.par != null ? o.par * (0.4 + 0.6 * f) : fl_par({ depth }), cam = fl_cl((o.cam || 0) * par, -110, 110);
    const strip = fl_grassStrip(hk, seed * 13 + k * 5, { ...o, depth }, true);
    fl_blitWave(strip, -cam, y + 2, t, { amp: (o.sweep ?? 4.6) * (0.5 + 0.7 * f) * (hk / 30), cw: 14, pow: 1.5, wind: o.wind ?? 1, worldX: cam + k * 37, span: strip.h * 0.9 });
  }
}

// ───────────── termitière (cathédrale) ─────────────
function fl_termiteSpr(h, seed, o) {
  const E = fl_env(o), light = E.light, dep = Math.round((o.depth ?? 0.3) * 10) / 10, key = `tm|${h}|${seed}|${E.name}|${E.mist}|${light}|${dep}`;
  const W = Math.round(h * 1.0) + 22, H = h + 10;
  return fl_spr(key, W, H, W >> 1, H - 4, b => {
    const r = fl_rng(seed), T = fl_tones([OC[0], OC[1], OC[2], OC[3], OC[4], SK[3]], o, 'warm'), cx = W >> 1, base = H - 5, rimU = fl_us(E.rim);
    const spire = (x0, hh, w0) => {
      const pts = [[x0, base, w0], [x0 + (r() - 0.5) * 2, base - hh * 0.3, w0 * 0.82], [x0 + (r() - 0.5) * 3, base - hh * 0.66, w0 * 0.55], [x0 + (r() - 0.5) * 3, base - hh, w0 * 0.2]];
      fl_tube(b, pts, (lat, nx, ny, s, px_, py_) => {
        const X = Math.round(px_), Y = Math.round(py_), nz = Math.sqrt(Math.max(0, 1 - lat * lat)); let v = fl_lam(nx * lat, ny * lat, nz, light) * 1.05 + 0.04;
        if (Y % 5 === 0 && fl_h2(X, Y, seed) < 0.75) v -= 0.2; if (fl_n1(X * 0.7 + Y * 0.05, seed) > 0.78) v -= 0.18; v += (fl_h2(X, Y, seed + 2) - 0.5) * 0.12;
        return T[fl_tone(v, 6, X, Y, 3.2)];
      });
      b.disc(x0 + (r() - 0.5), base - hh, Math.max(1, Math.round(w0 * 0.1)), T[3]);
    };
    spire(cx - h * 0.26, h * 0.55, h * 0.26); spire(cx + h * 0.28, h * 0.5, h * 0.24); spire(cx - h * 0.04, h * 0.98, h * 0.34); spire(cx + h * 0.12, h * 0.72, h * 0.24);
    // base évasée
    for (let y = base - Math.round(h * 0.16); y <= base; y++) for (let x = 0; x < W; x++) { const dx = (x - cx) / (h * 0.52), f = (y - (base - h * 0.16)) / (h * 0.16); if (Math.abs(dx) > 0.35 + f * 0.7 || b.d[y * W + x] && f < 0.2) continue; const lit = dx * light > 0; b.set(x, y, T[fl_tone((lit ? 0.62 : 0.3) - f * 0.1 + (fl_h2(x, y, seed) - 0.5) * 0.2, 6, x, y, 3.2)]); }
    for (let k = 0; k < 6; k++) { const x = cx + Math.round((r() - 0.5) * h * 0.4), y = base - 3 - Math.round(r() * h * 0.5); if (b.get(x, y)) b.set(x, y, T[0]); if (b.get(x, y + 1)) b.set(x, y + 1, T[1]); }
    fl_rim(b, light, rimU, { topP: 0.5 });
    if (dep < 0.5) fl_selout(b, 0.6);
    fl_gshadow(b, cx - light * 6, base + 3, Math.round(h * 0.5), 2, T[0], 0.85);
  });
}
function fl_termiteMound(t, o = {}) {
  const p = fl_o(o), spr = fl_termiteSpr(Math.round(o.h ?? 40), (o.seed ?? 1) | 0, { ...o, depth: p.depth });
  fl_blit(spr, fl_sx(p.x, o), fl_sy(p.y, o));
}

// ───────────── buisson ─────────────
// kind : 'olive' (buisson épineux de savane) | 'green' (printemps) | 'dry' | 'winter' (persistant sous la neige) ; w largeur, h hauteur
function fl_bushSpr(w, h, kind, seed, snow, o) {
  const E = fl_env(o), light = E.light, dep = Math.round((o.depth ?? 0.3) * 10) / 10, key = `bu|${w}|${h}|${kind}|${seed}|${snow}|${E.name}|${E.mist}|${light}|${dep}`;
  const W = w + 14, H = h + 12;
  return fl_spr(key, W, H, W >> 1, H - 4, b => {
    const r = fl_rng(seed), ramp = { olive: [GR[0], GR[1], LM[1], LM[2], LM[3], LM[4]], green: [GR[1], GR[2], LM[2], LM[3], LM[4], LM[5]], dry: [WO[1], OC[1], OC[2], AM[4], AM[5], AM[6]], winter: [GR[0], GR[0], GR[1], GR[2], GR[3], GR[3]] }[kind] || [GR[0], GR[1], LM[1], LM[2], LM[3], LM[4]];
    const T = fl_tones(ramp, o, kind === 'dry' ? 'warm' : 'leaf'), Wd = fl_tones([WO[0], WO[1], WO[2], WO[3]], o, 'wood'), cx = W >> 1, base = H - 5;
    // quelques tiges visibles au pied
    for (let k = 0; k < 4; k++) fl_poly1(b, [[cx + (r() - 0.5) * w * 0.4, base], [cx + (r() - 0.5) * w * 0.6, base - h * 0.3]], Wd[2]);
    const nC = Math.max(4, Math.round(w / 5));
    const cl = []; for (let i = 0; i < nC * 2; i++) { const u = (r() - 0.5) * 2, hh = (1 - u * u * 0.8) * h; cl.push({ x: cx + u * w * 0.46, y: base - h * 0.28 - r() * hh * 0.7, rx: Math.round(w * (0.1 + r() * 0.1)) + 2, ry: Math.round(h * (0.14 + r() * 0.12)) + 1 }); }
    cl.sort((a, c) => a.y - c.y);
    for (const c of cl) fl_clump(b, Math.round(c.x), Math.round(c.y), c.rx, c.ry, T, light, { rag: kind === 'dry' ? 0.8 : 0.55, seed: seed + Math.round(c.x), hi: 0.38, bias: (base - c.y) / h * 0.14 - 0.08, dk: 3.2 });
    if (kind === 'olive' || kind === 'dry') for (let k = 0; k < w * 0.5; k++) { const x = cx + (r() - 0.5) * w * 0.9, y = base - h * (0.3 + r() * 0.7), a = -Math.PI / 2 + (r() - 0.5) * 2.2; b.line(x, y, x + Math.cos(a) * 3, y + Math.sin(a) * 3, Wd[1]); }
    if (snow > 0) fl_capTop(b, fl_tones(fl_SNW, o, 'snow'), light, snow, seed + 3, { f: 0.4 });
    if (dep < 0.5) fl_selout(b, 0.62);
    fl_gshadow(b, cx - light * 3, base + 3, Math.round(w * 0.45), 2, T[0], 0.85);
  });
}
function fl_bush(t, o = {}) {
  const p = fl_o(o), w = Math.round(o.w ?? 34), h = Math.round(o.h ?? w * 0.6), spr = fl_bushSpr(w, h, o.kind || 'olive', (o.seed ?? 1) | 0, fl_q(o.snow ?? 0), { ...o, depth: p.depth });
  fl_blitSway(spr, fl_sx(p.x, o), fl_sy(p.y, o), 0.9 * fl_wind(t, p.x, o), { pow: 1.6 });
}

// ═══════════════════════════════════════════════════════════════════════════════════════
// 8. PREMIER PLAN : herbes qui encadrent le bas de l'image, branche qui encadre un coin
// ═══════════════════════════════════════════════════════════════════════════════════════
const fl_FGR = {
  green: [[GR[0], GR[1], GR[2], LM[3], LM[4], LM[5]], 'leaf'],
  dry: [[WO[0], WO[2], WO[4], OC[3], AM[6], AM[8]], 'warm'],          // herbes sèches : le côté ombre reste brun (WO[2]), pas de contour marine ; seul le côté éclairé est clair
  gold: [[WO[0], WO[2], OC[2], AM[4], AM[7], AM[9]], 'warm'],
  spring: [[GR[1], GR[2], LM[2], LM[4], LM[5], LM[6]], 'leaf'],
};
// un brin : lame courbe qui s'effile, côté ombre sombre, côté soleil clair, pointe vive, pied dans l'ombre ; dessiné directement sur L
function fl_blade(x0, y0, h, lean, w0, T, light, sway, o = {}) {
  const steps = Math.max(5, Math.round(h * 1.1)), n = T.length;
  let px_ = x0;
  L.setTransform(1, 0, 0, 1, 0, 0);
  for (let k = 0; k <= steps; k++) {
    const s = k / steps, y = y0 - h * s * (1 - 0.18 * Math.min(1, Math.abs(lean) / h * 1.6)), x = x0 + lean * Math.pow(s, 1.8) + sway * Math.pow(s, 1.5) + (o.curl || 0) * Math.pow(s, 3);      // curl : la pointe se recourbe (puissance 3 du haut)
    const w = Math.max(1, Math.round(w0 * (1 - Math.pow(s, 2.1)) * (0.85 + 0.15 * Math.sin(s * 3.1)) + 0.3)), xl = Math.round(Math.min(px_, x) - w / 2), xr = Math.round(Math.max(px_, x) + w / 2);
    const foot = s < 0.22 ? 1 : 0, dark = T[Math.max(0, 1 - foot)], mid = T[Math.max(0, 2 - foot)], lit = T[Math.max(0, Math.min(n - 2, 4 - foot))];
    const yy = Math.round(y), wd = xr - xl + 1;
    if (wd <= 1) { L.fillStyle = fl_hexU(s > 0.9 ? T[n - 1] : lit); L.fillRect(xl, yy, 1, 1); }
    else {
      const ls = light > 0 ? xr : xl, ds = light > 0 ? xl : xr;
      L.fillStyle = fl_hexU(mid); L.fillRect(xl, yy, wd, 1);
      L.fillStyle = fl_hexU(dark); L.fillRect(ds, yy, 1, 1); if (wd > 3) L.fillRect(light > 0 ? xl + 1 : xr - 1, yy, 1, 1);
      L.fillStyle = fl_hexU(lit); L.fillRect(ls, yy, 1, 1); if (wd > 4 && s > 0.15) { L.fillStyle = fl_hexU(T[Math.min(n - 1, 3)]); L.fillRect(light > 0 ? xr - 1 : xl + 1, yy, 1, 1); }
    }
    px_ = x;
  }
  return [px_, y0 - h];
}
// herbes de premier plan, plusieurs plans de brins qui ploient au vent
// o : kind 'green' | 'dry' | 'gold' | 'spring' ; side 'bottom' | 'left' | 'right' | 'both' ; h hauteur max (80) ; n nombre de brins (40) ; y ligne de pied (LH + 3) ; dip creux au centre (0,6) ; cam, par (1,3) ; wind
function fl_grassFg(t, o = {}) {
  o = o || {}; const E = fl_env(o), light = E.light, [ramp, fam] = fl_FGR[o.kind || 'green'] || fl_FGR.green, seed = (o.seed ?? 1) | 0, hMax = o.h ?? 80, nb = Math.round((o.n ?? 40) * (o.density ?? 1)), side = o.side || 'bottom', dip = o.dip ?? 0.6, y0 = o.y ?? LH + 3;
  const par = o.par ?? 1.3, cam = (o.cam || 0) * par, wind = o.wind ?? 1;
  for (let layer = 0; layer < 2; layer++) {                           // fond plus clair et plus petit, puis premier plan sombre et grand
    const back = layer === 0, T = fl_tones(back ? ramp.map((c, i) => i) .map(i => ramp[Math.min(ramp.length - 1, i + 1)]) : ramp, { ...o, depth: back ? 0.1 : 0.0 }, fam), cnt = Math.round(nb * (back ? 0.7 : 1)), sc = back ? 0.62 : 1;
    const list = [], padN = Math.ceil(cnt * 0.55);                                        // brins au-delà des deux bords (u < 0 et u > 1) : aucun trou au bord quand la caméra glisse de ±100 px
    for (let i = -padN; i < cnt + padN; i++) {
      const u = (i + fl_h(i, seed + layer * 50) * 0.9) / cnt, uc = fl_cl(u);                // u de 0 à 1 le long de l'écran (hors de [0, 1] : débordement)
      let x, env;
      if (side === 'bottom') { x = u * (LW + 40) - 20; env = 0.28 + 0.72 * Math.pow(Math.abs(uc - 0.5) * 2, 1.4) * dip + (1 - dip) * 0.6; }
      else if (side === 'left') { if (u > 1) continue; x = u < 0 ? u * 150 - 16 : Math.pow(u, 1.5) * 150 - 16; env = 1 - uc * 0.75; }
      else if (side === 'right') { if (u > 1) continue; x = u < 0 ? LW + 16 - u * 150 : LW + 16 - Math.pow(u, 1.5) * 150; env = 1 - uc * 0.75; }
      else { const lf = u < 0.5; const v = lf ? u * 2 : (1 - u) * 2; x = lf ? (v < 0 ? v * 120 : Math.pow(v, 1.4) * 120) - 16 : LW + 16 - (v < 0 ? v * 120 : Math.pow(v, 1.4) * 120); env = 0.35 + 0.65 * (1 - Math.max(0, v) * 0.6) * dip + (1 - dip) * 0.5; }
      if (x - cam < -110 || x - cam > LW + 110) continue;                                  // trop loin hors cadre : inutile de dessiner
      list.push({ x, env, r: fl_h(i, seed + 7 + layer * 13), r2: fl_h(i, seed + 11 + layer * 17), r3: fl_h(i, seed + 19) });
    }
    list.sort((a, c) => a.env * a.r - c.env * c.r);
    for (const q of list) {
      const dryK = o.kind === 'gold' || o.kind === 'dry';                                  // herbes sèches : lames fines (≈ 60 % de moins à la base) qui se recourbent, pas des tipis
      const hh = hMax * sc * q.env * (0.55 + 0.6 * q.r), lean = (q.r2 - 0.5) * hh * 0.85 + (side === 'left' ? hh * 0.18 : side === 'right' ? -hh * 0.18 : 0), w0 = dryK ? (back ? 2.4 : 3.6) + q.r3 * 1.6 : (back ? 4 : 8) + q.r3 * 3;
      const wx = q.x - cam, sway = fl_wind(t, wx + layer * 31, { wind }) * hh * 0.15 + wind * hh * 0.03;
      const tip = fl_blade(wx, y0 + (back ? -3 : 0) + q.r3 * 3, hh, lean, w0, T, light, sway, { ...o, curl: dryK ? (lean >= 0 ? 1 : -1) * hh * (0.04 + 0.12 * q.r2) : 0 });
      // épi ou tige fleurie au bout de quelques brins (herbes sèches et dorées)
      if (!back && (o.kind === 'gold' || o.kind === 'dry') && q.r3 < 0.22) {
        const L_ = 7 + Math.round(q.r * 4); const sT = fl_tones([AM[8], AM[9], AM[10], WH[2]], { ...o, depth: 0, fogK: 0.5 }, 'warm');
        for (let j = 0; j < L_; j++) { R(tip[0] + j * 0.25 * Math.sign(lean || 1), tip[1] - j, 1, 1, fl_hexU(sT[j > L_ * 0.55 ? 2 : 1])); if (j > 1 && j < L_ - 1) { R(tip[0] - 1 + j * 0.2, tip[1] - j, 1, 1, fl_hexU(sT[0])); R(tip[0] + 1 + j * 0.2, tip[1] - j, 1, 1, fl_hexU(sT[light > 0 ? 2 : 1])); } }
      }
    }
  }
}

// ───────────── branche de premier plan ─────────────
// feuille pointue orientée : nervure centrale, bord éclairé
function fl_leaf(b, x, y, ang, len, T, light, k = 0) {
  const ca = Math.cos(ang), sa = Math.sin(ang), wd = Math.max(1.5, len * 0.36), R_ = Math.ceil(len) + 1;
  for (let j = -R_; j <= R_; j++) for (let i = -R_; i <= R_; i++) {
    const u = i * ca + j * sa, v = -i * sa + j * ca, f = u / len; if (f < 0 || f > 1) continue;
    const half = wd * Math.sin(Math.PI * Math.pow(f, 0.8)) * 0.5 + 0.2; if (Math.abs(v) > half) continue;
    const nx = -sa * Math.sign(v || 1), ny = ca * Math.sign(v || 1), lam = fl_lam(nx * Math.abs(v) / half, ny * Math.abs(v) / half, 0.7, light) + (f < 0.12 ? -0.2 : 0) + k;
    let tn = fl_tone(lam, T.length, Math.round(x + i), Math.round(y + j), 3); if (Math.abs(v) < 0.45 && f > 0.1 && f < 0.85) tn = Math.max(0, tn - 1);
    b.set(Math.round(x + i), Math.round(y + j), T[tn]);
  }
}
const fl_BM = 26;                                                   // marge hors cadre : le gros bout du tronc continue de 26 px au-delà du bord ancré (décalage de caméra ≤ 10 px + vent ≤ 6 px)
function fl_branchSpr(corner, kind, len, seed, snow, blossom, o) {
  const E = fl_env(o), light = E.light, sil = kind === 'acacia' ? (o.sil ?? true) : false, key = `bf3|${corner}|${kind}|${len}|${seed}|${snow}|${blossom ? 1 : 0}|${sil ? 1 : 0}|${E.name}|${E.mist}|${light}`;
  const W0 = Math.round(len * 1.05) + 8, W = W0 + fl_BM, H = Math.round(len * 0.85) + 8, left = corner[1] === 'l';
  return fl_spr(key, W, H, left ? fl_BM : W0, corner[0] === 't' ? 0 : H, b => {      // ancre = point du coin du cadre ; le sprite déborde de fl_BM px hors cadre côté ancré
    const r = fl_rng(seed), sx = left ? 1 : -1, sy = corner[0] === 't' ? 1 : -1, ox = left ? fl_BM : W0 - 1, oy = corner[0] === 't' ? 0 : H - 1;
    const mx = u => ox + sx * u, my = v => oy + sy * v, o0 = { ...o, depth: 0, fogK: 0 };
    const wood = sil ? fl_tones([NI[0], NI[1], DU[0], DU[1], ST[0]], o0, 'sil') : fl_tones(kind === 'dead' ? [NI[0], ST[0], ST[1], ST[3], ST[4]] : [NI[0], WO[0], WO[1], WO[2], WO[3]], o0, kind === 'dead' ? 'stone' : 'wood');
    const Tn = fl_tones([GR[0], GR[1], GR[2], GR[3], LM[3]], o0, 'conifer'), Lf = fl_tones([GR[0], GR[1], LM[2], LM[3], LM[4], LM[5]], o0, 'leaf'), sn = fl_tones(fl_SNW, o0, 'snow'), rimU = fl_us(E.rim);
    const pk = fl_tones([WH[1], WH[2], DU[7], WH[3]], { ...o0, fogK: 0.5 }, 'warm'), thorn = fl_us(WH[1]), leaves = [];
    const cfg = {
      r, curve: 0.06, wob: 0.24, droop: kind === 'acacia' ? 0.02 : 0.05, split: l => l === 0 ? (kind === 'acacia' ? 5 : 6.5) : l === 1 ? 3 : 2, f0: 0.12, f1: 0.8, sa: 0.62, lk: kind === 'acacia' ? 0.5 : 0.6, wk: 0.58, maxLvl: kind === 'spruce' ? 2 : 3, minLen: 8,
      draw: (bb, pts, w, lvl) => {
        const q = pts.map(p => [mx(p[0]), my(p[1]), p[2]]);
        if (w >= 2.4) fl_tube(bb, q, fl_shader(wood, light, { dk: 3, rough: 0.25 })); else fl_poly1(bb, q, wood[lvl > 1 ? 2 : 1]);
        for (let k = 1; k < q.length; k++) {
          const a = Math.atan2(q[k][1] - q[k - 1][1], q[k][0] - q[k - 1][0]);
          if (kind === 'spruce' && lvl >= 1 && k % 2 === 0) for (const sd of [-1, 1]) { const aa = a + sd * (1.0 + 0.3 * r()), l = 5 + r() * 4, lit = Math.sin(aa) < -0.2 || Math.cos(aa) * light > 0.3; bb.line(q[k][0], q[k][1], q[k][0] + Math.cos(aa) * l, q[k][1] + Math.sin(aa) * l, lit ? Tn[2 + (r() < 0.4 ? 1 : 0)] : Tn[r() < 0.5 ? 0 : 1]); }
          else if (kind === 'leafy' && lvl >= 1) leaves.push([q[k][0], q[k][1], a, lvl]);
          else if (kind === 'acacia' && lvl >= 1 && k % 2 === 0) {                              // petites feuilles composées : paires de folioles, épines blanches
            for (const sd of [-1, 1]) { const aa = a + sd * (1.15 + 0.2 * r()), l = 2.5 + r() * 2; bb.line(q[k][0], q[k][1], q[k][0] + Math.cos(aa) * l, q[k][1] + Math.sin(aa) * l, sil ? wood[1 + (r() < 0.4 ? 1 : 0)] : Lf[2 + (Math.cos(aa) * light > 0 ? 1 : 0)]); }
            if (r() < 0.25) { const aa = a - 1.6 * (r() < 0.5 ? 1 : -1); bb.set(Math.round(q[k][0] + Math.cos(aa) * 2), Math.round(q[k][1] + Math.sin(aa) * 2), thorn); }
          }
        }
      },
    };
    const gy = 12 + r() * 6, ga = 0.4 + (r() - 0.5) * 0.08, gw = Math.max(6, len * 0.07);        // (même ordre de tirages qu'avant : la branche garde sa forme)
    {                                                                // prolongement du tronc vers l'extérieur du cadre, dans l'axe de départ : il ne se détache jamais du bord
      const ex = fl_BM - 2, q = [[-6 - ex, gy - Math.sin(ga) * ex, gw * 1.08], [-6 - ex * 0.5, gy - Math.sin(ga) * ex * 0.5, gw * 1.04], [-6, gy, gw]].map(p => [mx(p[0]), my(p[1]), p[2]]);
      fl_tube(b, q, fl_shader(wood, light, { dk: 3, rough: 0.25 }));
    }
    fl_grow(b, -6, gy, ga, len, gw, cfg, 0);
    for (const lf of leaves) for (const sd of [-1, 1]) if (r() < 0.85) {
      const aa = lf[2] + sd * (0.6 + r() * 0.6), l = 5 + r() * 3;
      fl_leaf(b, lf[0], lf[1], aa, l, Lf.slice(1), light, (r() - 0.5) * 0.2);
      if (blossom && r() < 0.18) { const bx = Math.round(lf[0] + Math.cos(aa) * l), by = Math.round(lf[1] + Math.sin(aa) * l); b.set(bx, by, pk[3]); b.set(bx - 1, by, pk[1]); b.set(bx + 1, by, pk[2]); b.set(bx, by - 1, pk[2]); b.set(bx, by + 1, pk[0]); b.set(bx, by, fl_us(YE[2])); }
    }
    if (snow > 0.05) for (let y = 2; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {            // neige : seulement sur les parties épaisses
      const c = b.d[y * W + x]; if (!c || b.d[(y - 1) * W + x] || !wood.includes(c)) continue;
      if (fl_h2(x, y, seed) < snow * 0.8) { b.d[(y - 1) * W + x] = sn[light > 0 ? 4 : 3]; if (fl_h2(x, y, seed + 3) < snow * 0.7) b.d[(y - 2) * W + x] = sn[3]; }
    }
    if (snow > 0.05 && kind === 'spruce') for (let k = 0; k < 14 * snow; k++) { const x = Math.round(W * (0.1 + 0.7 * r())), y = Math.round(H * (0.1 + 0.6 * r())); for (let yy = y; yy < y + 12; yy++) if (b.d[yy * W + x] && Tn.includes(b.d[yy * W + x])) { fl_clump(b, x, yy - 1, 2 + Math.round(r() * 2), 1, sn, light, { rag: 0.3, seed: x + yy, bias: 0.1 }); break; } }
    fl_rim(b, light, rimU, { topP: 0.25, skip: c => Tn.includes(c) || (sil && false) });
    fl_selout(b, 0.7, sil ? (x, y, n_) => false : null);
  });
}
function fl_branchFg(t, o = {}) {
  o = o || {}; const corner = o.corner || 'tl', len = Math.round(o.len ?? 130), spr = fl_branchSpr(corner, o.kind || 'leafy', len, (o.seed ?? 1) | 0, fl_q(o.snow ?? 0), !!o.blossom, o);
  const par = o.par ?? 1.35, x = (corner[1] === 'l' ? 0 : LW) - fl_cl((o.cam || 0) * par * 0.4, -10, 10), y = corner[0] === 't' ? 0 : LH;
  const w = fl_wind(t, corner === 'tl' || corner === 'bl' ? 20 : 150, o);
  fl_blitSway(spr, x, y, 2.4 * w * (len / 120), { pow: 1.2, abs: true, span: spr.h });
}

