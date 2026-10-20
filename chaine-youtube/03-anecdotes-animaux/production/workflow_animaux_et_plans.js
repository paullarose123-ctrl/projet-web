// Workflow (outil Workflow de Claude Code) de la vidéo 3 : sprites des animaux → relecture → corrections → plans → relecture → corrections, puis accroche et finale.
// Reprise après une interruption : passer en args l'étape de départ de chaque segment, d'après l'état des fichiers (voir REPRISE.md) :
//   { "depart": { "gre": "plans", "lez": "revsprites", "lyc": "sprites" }, "introfin": true, "relecteurs": 2, "effort_relecture": "low" }
//   étapes : sprites | revsprites | plans | revplans   (un segment absent de « depart » repart de « sprites » ; « depart »: {"gre":"fini"} saute le segment)
//   relecteurs : 1 ou 2 relecteurs par étape (1 = économique) ; effort_relecture : effort des relecteurs ('low' | 'medium' | 'high')
export const meta = {
  name: 'video3-animaux',
  description: 'Vidéo 3 : les trois anecdotes (sprites des animaux, puis plans), relues par des relecteurs indépendants',
  phases: [
    { title: 'Sprites', detail: 'animaux et accessoires de chaque anecdote' },
    { title: 'Relecture sprites', detail: 'deux relecteurs indépendants par anecdote' },
    { title: 'Corrections sprites', detail: 'corrections' },
    { title: 'Plans', detail: 'les plans de chaque anecdote' },
    { title: 'Relecture plans', detail: 'deux relecteurs indépendants par anecdote' },
    { title: 'Corrections plans', detail: 'corrections' },
  ],
}

const COMMUN = [
  "CONTEXTE. Dépôt /home/user/AnimalCards ; dossier du projet : /home/user/AnimalCards/chaine-youtube/03-anecdotes-animaux (répertoire courant de toutes les commandes : fais cd dedans).",
  "Vidéo verticale (1080x1920, 30 i/s) de la chaîne de médiation scientifique Raisins : pixel art 270x480 agrandi x4, palette fixe, dessinée en JavaScript sur un canevas et rendue avec Chromium, bande-son synthétisée. Vidéo 3 : « 3 anecdotes complètement folles sur les animaux » (grenouille des bois gelée en Alaska, lézard à cornes qui projette du sang par les yeux au Mexique, lycaons qui votent en éternuant en Afrique). L'auteur veut une ambiance beaucoup plus NATURE que la vidéo 2.",
  "LIS D'ABORD, en entier : CONCEPT.md (plan par segment), STYLE.md (palettes, lumière, composition, animaux), GUIDE.md (moteur, conventions, outils, contrôles, vocabulaire d'événements, pièges), faits.md (faits vérifiés et descriptions visuelles : à respecter ; ne rien afficher qui contredise la voix). Les bibliothèques partagées sont ÉCRITES : lis l'en-tête d'API de kit.js (ciels, lumière, reliefs, eau, glace, particules) et de flore.js (végétation, sols, rochers, premier plan) et regarde leurs démonstrations (node solo.mjs kit ; PAGE=solo_kit.html node sheet.mjs 0.6 build/<ton-nom>/kit_sheet). Le moteur : engine.js, scientist.js, cadre.js, shots.js, piece.js. Pour des exemples de dessin pixel art organique : ../02-spiderman/city.js (heroPose/heroDraw : layerBegin, shade, limb, layerEnd avec contour, liseré rim, détails nets), ../02-spiderman/lab.js (drawSpider), nature.js, props2.js, et de plans : shots1.js à shots4.js. La timeline de la voix est RÉELLE (build/timeline.js) : lire P.<id>.words pour la graphie exacte des mots. ATTENTION : la voix peut être REFAITE pendant ton travail (autre timbre, mêmes phrases) : les temps de mots changent alors de quelques dixièmes de seconde (± 10 % sur la durée des phrases) ; tout doit donc se caler sur wt() / wt1() / P.<id>.t0 / t1, jamais sur des secondes écrites en dur ; relance node valide.mjs en fin de travail pour contrôler sur la timeline du moment.",
  "RÈGLES. (1) Tu n'écris QUE les fichiers qui te sont attribués ; tu ne modifies jamais les fichiers communs (engine.js, scientist.js, cadre.js, shots.js, piece.js, kit.js, flore.js, outro.js, *.mjs, rendu.sh) ni ceux des autres (un besoin commun : une ligne dans demandes_<ton-nom>.md avec la raison). (2) Tous les noms globaux de tes fichiers commencent par ton préfixe : tout le projet partage une seule portée globale. (3) Aucun Math.random ni Date : hasard par rng(graine) ; render(f) est une fonction pure du temps. (4) La machine a 4 coeurs partagés entre plusieurs agents : pas de rendu vidéo complet ; node check.mjs avec un pas de 6 à 12 ; au plus 8 images par passe de contrôle ; sorties dans build/<ton-nom>/ (variable OUT et dossier de sheet.mjs). (5) Ni commit ni push. (6) Tu REGARDES tes images avec l'outil Read sur les PNG, à taille réelle et réduit à 1/4 (lisibilité au format téléphone) : rien n'est fini tant que tu ne l'as pas vu au début, au milieu et à la fin, et en bande de mouvement (strip.mjs) pour tout ce qui bouge. (7) Barre de qualité : illustrations de jeu pixel art finies (Eastward, Owlboy, Sea of Stars), pas des formes plates ; 3 à 5 tons par matière, lumière dirigée avec liseré clair côté soleil (rim), perspective atmosphérique, détails fins ; animaux dessinés d'après leurs formes réelles (faits.md) avec une silhouette qui se reconnaît en noir ; aucune expression accidentelle ; chaque mouvement a de l'anticipation, de l'élan et un temps d'arrêt ; rien d'immobile plus de 0,5 s. (8) Rends compte en français, précisément et sans enjolivement : ce qui est fait, ce que tu as vu en image, ce qui reste imparfait.",
].join('\n\n')

const SC_SPRITES = {
  type: 'object',
  properties: {
    files: { type: 'array', items: { type: 'string' } },
    api: { type: 'string', description: 'fonctions livrées : signature, options, états' },
    images: { type: 'array', items: { type: 'string' } },
    limites: { type: 'string' },
  },
  required: ['files', 'api', 'limites'],
}
const SC_REVIEW = {
  type: 'object',
  properties: {
    verdict: { type: 'string', enum: ['ok', 'corrections'] },
    issues: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          gravite: { type: 'string', enum: ['bloquant', 'important', 'mineur'] },
          ou: { type: 'string' },
          probleme: { type: 'string' },
          correction: { type: 'string' },
        },
        required: ['gravite', 'ou', 'probleme', 'correction'],
      },
    },
  },
  required: ['verdict', 'issues'],
}
const SC_FIX = {
  type: 'object',
  properties: { corrige: { type: 'array', items: { type: 'string' } }, restant: { type: 'array', items: { type: 'string' } }, images: { type: 'array', items: { type: 'string' } } },
  required: ['corrige', 'restant'],
}

const SEGMENTS = [
  {
    seg: 'gre', nom: 'grenouille', fichier: 'sc_grenouille.js', sprites: 'sc_grenouille_sprites.js', prefixe: 'gr_', fn: 'buildGrenouille', k: 0,
    sprites_brief: [
      "Tu dessines la GRENOUILLE DES BOIS et ses accessoires d'anatomie pour le segment Alaska : sc_grenouille_sprites.js (préfixe gr_) et un sc_grenouille.js PROVISOIRE (function buildGrenouille(S) avec 3 plans de contrôle : 'gr_planche' = planche de 12 poses en grille 3x4 sur fond neutre (c'est ce que le relecteur jugera en premier), 'gr_cycles' = cycle de saut et respiration en continu, 'gr_interne' = coeur, électrocardiogramme, cellules et sucre).",
      "gr_frog(cx, cy, s, t, o) : grenouille des bois (Lithobates sylvaticus) selon faits.md : brun clair à rougeâtre, MASQUE SOMBRE de l'oeil au tympan, lèvre supérieure claire, ventre crème, deux crêtes dorso-latérales, longues pattes arrière à barres sombres, peau lisse et humide (reflet), 5 cm. Dessin vectoriel lisse puis silhouette nette (recette layerBegin/limb/shade/layerEnd), donc utilisable de 40 px de large (dans un paysage) à 220 px (gros plan). Options : pose ('sit', 'alert', 'crouch', 'leap', 'land', 'frozen', 'thaw'), flip (regarde à gauche), ph (phase 0 à 1 d'un saut), breath (pulsation de la gorge 0 à 1), eye (0 oeil fermé à 1 ouvert), ice (0 à 1 : givre puis glace qui enrobe le corps, de plus en plus pâle et bleutée, cristaux brillants), blink, rim (couleur du liseré de contre-jour), shadow. États à réussir : respiration visible (gorge qui pulse), clignement, immobilité vivante, accroupissement avant le saut, saut complet (anticipation, extension, vol, réception avec écrasement), grenouille gelée (raide, pâle, yeux ternes, croûte de glace avec éclats), dégel (givre qui recule depuis la tête, oeil qui s'ouvre).",
      "Vues internes (planche du carnet) : gr_heart(cx, cy, s, t, o) (coeur qui bat : o.beat de 0 à 1 donne la contraction, o.state 'live' | 'slow' | 'stopped' | 'restart', reflets), gr_ecg(x, y, w, h, t, o) (électrocardiogramme défilant ; o.beats = tableau des instants absolus des battements pour piloter exactement le rythme, ligne plate quand il n'y en a plus), gr_cells(x, y, w, h, t, o) (amas de cellules à membrane et noyau ; o.shrink 0 à 1 = cellule qui se ratatine quand elle perd son eau ; o.glucose 0 à 1 = enrobage de sucre), gr_glucose(x, y, s, t, o) (molécule de glucose : hexagone avec pointes OH, dorée), gr_icecrystal(x, y, s, o) (cristal de glace en aiguilles, cyan), gr_lungs / gr_throat si utile (respiration).",
      "Icône de case du carnet : ICONES[0] = function (cx, cy) { ... } (17 x 17 px, contour sombre, la tête de la grenouille avec son masque sombre, couleurs exactes) dans ton fichier de sprites.",
      "Vérifie : node solo.mjs gre ; PAGE=solo_gre.html OUT=build/grenouille node check.mjs 6 (erreurs : 0) ; PAGE=solo_gre.html node sheet.mjs 0.5 build/grenouille/sheet ; PAGE=solo_gre.html OUT=build/grenouille node strip.mjs gr_cycles 10 0.2. Regarde la planche à 1/4 de taille : la grenouille doit se reconnaître en silhouette noire.",
    ].join('\n\n'),
    shots_brief: [
      "Tu écris sc_grenouille.js (à la place du provisoire) : function buildGrenouille(S) qui dessine le segment ALASKA, de S.t0 à S.t1 (voir CONCEPT.md et SEG dans shots.js), avec les sprites de sc_grenouille_sprites.js (déjà faits et relus : lis-les, utilise-les ; ne les réécris pas ; une correction mineure d'un sprite est permise dans CE fichier uniquement si tu surcharges la fonction sous un autre nom), kit.js et flore.js. Tu peux ajouter des fichiers sc_grenouille_<x>.js.",
      "Le texte à illustrer (voix, mot pour mot) : g1 « En Alaska, la grenouille des bois possède un pouvoir digne d'un film de science-fiction ! » ; g2 « Pendant l'hiver, son corps gèle, son coeur s'arrête de battre et elle cesse de respirer. » ; g3 « Mais grâce à un sucre qui protège ses cellules, elle survit ! » ; g4 « Au printemps, elle dégèle et reprend sa vie comme si de rien n'était ! ». Segment de ≈ 20 s : prévoir 6 à 9 plans.",
      "PLANS SUGGÉRÉS (tu peux les découper autrement si l'image y gagne ; chaque coupe 0,05 à 0,15 s avant un début de mot) : g1_alaska (paysage large d'Alaska à l'heure bleue, aurore pâle, montagnes, épicéas, la grenouille grande au premier plan sur une branche ou un tronc moussu, qui respire et cligne ; case 1/3 + « 1/3 ALASKA » ; sur « science-fiction » un balayage « scanner » cyan la parcourt, événement scan, étiquette « GRENOUILLE DES BOIS »), g2_gel (l'hiver : neige serrée, la grenouille tapie dans la litière de feuilles ; le givre gagne son corps pendant « son corps gèle », jauge de température qui descend jusqu'à -15 ; étiquette « ≈ 2/3 DE L'EAU EN GLACE »), g2_coeur (planche du carnet : coupe, coeur qui bat de plus en plus lentement puis s'arrête sur « battre », électrocardiogramme, compteur de battements : le faits.md dit que l'arrêt est progressif, montrer un ralentissement), g2_souffle (« et elle cesse de respirer » : la respiration s'arrête, jauges à 0, grenouille entière figée dans la glace ; étiquettes « COEUR : 0 », « RESPIRATION : 0 »), g3_sucre (cellules et glace : les cristaux cyan poussent entre les cellules, le glucose doré les enrobe et elles gardent leur forme ; étiquette « SUCRE : GLUCOSE » sur « sucre »), g3_survit (coche « ELLE SURVIT » sur « survit » ; étiquette « 18 SUR 18 SURVIVENT » ou « ≈ 6 MOIS GELÉE » si la place le permet), g4_degel (« Au printemps, elle dégèle » : lumière chaude, fonte, gouttes, la glace fond de la grenouille), g4_coeur (« et reprend sa vie » : le coeur repart en premier, électrocardiogramme qui reprend, l'oeil s'ouvre), g4_saut (« comme si de rien n'était » : saut dans l'herbe neuve parmi les fleurs, papillons, coassement ; case 1/3 cochée ; le dernier plan dure jusqu'à S.t1 : la grenouille se pose, cligne, respire).",
      "Étiquettes autorisées (faits.md partie 3, à ne pas contredire) ; place-les au-dessus de y = 355 ; pas plus de 2 étiquettes à l'écran. Événements (types du GUIDE uniquement) : snowfall, wind, frost, crack, drip, thaw, heartbeat (un par battement : leur nombre et leur instants doivent coller à l'image), beep (si moniteur), flatline, glow, sparkle, scan, zoom, ribbit, hop, bird, pop, label, counter, ding, reveal, suspense.",
    ].join('\n\n'),
    review_focus: "Segment Alaska : la grenouille est-elle une grenouille des bois (masque sombre, lèvre claire, crêtes, pattes) ? l'arrêt du coeur est-il progressif puis net sur « battre » ? le sucre se comprend-il en une image (cellules protégées contre la glace) ? la fonte et le saut sont-ils joyeux ? le froid de l'hiver et la douceur du printemps se ressentent-ils (palette, particules) ?",
  },
  {
    seg: 'lez', nom: 'lezard', fichier: 'sc_lezard.js', sprites: 'sc_lezard_sprites.js', prefixe: 'lz_', fn: 'buildLezard', k: 1,
    sprites_brief: [
      "Tu dessines le LÉZARD À CORNES, le COYOTE et les accessoires du jet de sang pour le segment Mexique : sc_lezard_sprites.js (préfixe lz_) et un sc_lezard.js PROVISOIRE (function buildLezard(S) avec 3 plans de contrôle : 'lz_planche' = planche de 12 poses (lézard et coyote) en grille 3x4, 'lz_cycles' = marche du lézard (par à-coups) et trot du coyote en continu, 'lz_jet' = le jet de sang et la règle).",
      "lz_lizard(cx, cy, s, t, o) : lézard à cornes d'après faits.md. Choix : le lézard ROYAL (Phrynosoma solare, désert de Sonora, avec les saguaros) : corps PLAT et ROND comme un petit crapaud, couronne de quatre grandes cornes plates en dague à l'arrière de la tête dont les bases se touchent, petites cornes temporales, une frange d'écailles pointues sur le flanc, queue courte, teintes sable, beige, rouille et jaune pâle, taches sombres sur les flancs et le dos, fine ligne claire dorsale. Vue de profil légèrement de dessus (trois quarts haut) pour que la couronne et le corps plat se voient ; il doit se lire en silhouette. Dessin vectoriel lisse puis silhouette nette (layerBegin/limb/shade/layerEnd), utilisable de 40 px de large (dans le désert) à 220 px (gros plan). Options : pose ('rest' camouflé, aplati, respire ; 'alert' tête relevée ; 'walk' marche par à-coups avec arrêts figés ; 'flat' encore plus aplati ; 'puff' gonflé, piquants dressés ; 'squirt' tête baissée, la région de l'oeil gonflée), flip, eye (fermé/ouvert), bulge (0 à 1 : gonflement du sinus autour de l'oeil, bord rougi), puff (0 à 1), rim, shadow (ombre au sol), camo (0 à 1 : se fond dans le sable).",
      "lz_coyote(cx, cy, s, t, o) : coyote d'après faits.md (fauve-gris givré, blanchâtre dessous, roux sur les pattes et derrière les oreilles, museau pointu, grandes oreilles dressées, queue touffue à bout noir pendante, élancé). Poses : 'trot' et 'stalk' (cycle de marche : 4 pattes en phase de trot, tête basse en approche), 'sniff', 'hit' (sursaut, recul quand le jet frappe), 'disgust' (nez plissé, langue sortie, bave, secouement de tête avec traînées de mouvement), 'trotOff' (s'éloigne). Options : flip, ph (phase de cycle), headDown, mouth, tongue, shake (0 à 1), rim, shadow. Le coyote est un prédateur NATUREL, pas un monstre : dessiné avec soin, jamais effrayant.",
      "lz_jet(x0, y0, vx, vy, t0, t, o) : jet de sang balistique (parabole, flux continu fin qui se brise en gouttelettes au bout, gouttes de tailles variées qui brillent) avec un temps ralenti possible (o.tau pour le ralenti), sa durée (o.dur), le point d'impact (o.hit) et lz_splat(x, y, t, o) (éclaboussure sur le museau : gouttes qui glissent) ; lz_ruler(x, y, w, t, o) (règle posée sur le sable avec graduations en pixels pour un mètre = w pixels, chiffres 0, 50 CM, 1 M ; o.reveal 0 à 1 pour la dérouler) ; lz_eyeFx si utile.",
      "Icône de case du carnet : ICONES[1] = function (cx, cy) { ... } (17 x 17 px, contour sombre, tête de lézard à cornes de face ou de profil avec la couronne reconnaissable, couleurs exactes) dans ton fichier de sprites.",
      "Vérifie : node solo.mjs lez ; PAGE=solo_lez.html OUT=build/lezard node check.mjs 6 (erreurs : 0) ; PAGE=solo_lez.html node sheet.mjs 0.5 build/lezard/sheet ; PAGE=solo_lez.html OUT=build/lezard node strip.mjs lz_cycles 10 0.2. Regarde la planche à 1/4 de taille : le lézard doit se reconnaître en silhouette noire (disque plat, couronne de cornes), le coyote aussi.",
    ].join('\n\n'),
    shots_brief: [
      "Tu écris sc_lezard.js (à la place du provisoire) : function buildLezard(S) qui dessine le segment MEXIQUE, de S.t0 à S.t1 (voir CONCEPT.md et SEG dans shots.js), avec les sprites de sc_lezard_sprites.js (déjà faits et relus : lis-les, utilise-les ; ne les réécris pas), kit.js et flore.js. Tu peux ajouter des fichiers sc_lezard_<x>.js.",
      "Le texte à illustrer : l1 « Au Mexique, certains lézards à cornes possèdent une arme complètement improbable. » ; l2 « Lorsqu'ils sont menacés, ils peuvent projeter du sang directement depuis leurs yeux ! » ; l3 « Ce jet peut atteindre presque un mètre ! » ; l4 « Et le plus fou ? Ce sang a un goût particulièrement désagréable pour certains de leurs prédateurs ! ». Segment de ≈ 17 s : prévoir 5 à 8 plans.",
      "PLANS SUGGÉRÉS : l1_mexique (désert de Sonora au coucher du soleil : saguaros, agaves, mesas lointaines, soleil énorme, chaleur qui tremble, poussière dorée en contre-jour, boule d'herbe sèche qui roule ; case 2/3 allumée + « 2/3 MEXIQUE »), l1_lezard (zoom : le lézard presque invisible sur le gravier qui cligne et bouge ; étiquette « LÉZARD À CORNES » ; sur « arme complètement improbable » un « ? » ou « !? »), l2_menace (« Lorsqu'ils sont menacés » : le coyote arrive, le lézard s'aplatit puis se gonfle, l'oeil gonfle ; étiquette « DERNIER RECOURS »), l2_jet (« ils peuvent projeter du sang directement depuis leurs yeux » : RALENTI : le jet part du coin de l'oeil, traverse le plan et frappe le museau du coyote ; étiquette « SANG DES SINUS DE L'OEIL » ; événement squirt puis splat), l3_metre (règle posée sur le sable : le jet se déroule le long de la règle jusqu'à presque 1 m ; étiquette « JUSQU'À ≈ 1 M », événements ruler), l4_gout (« Et le plus fou ? » : le coyote fait la grimace, langue sortie, secoue la tête ; « BEURK » ; étiquette « CIBLE : COYOTES, RENARDS, CHIENS » ; le lézard repart tranquillement à pas comptés ; case 2/3 cochée ; le dernier plan dure jusqu'à S.t1).",
      "Attention à l'exactitude (faits.md) : le jet part du coin de l'oeil (sinus), pas d'un oeil qui explose ; c'est un dernier recours ; la cible est le canidé ; décor de type Sonora (saguaros). Étiquettes autorisées : celles de la partie 3 du faits.md ; au-dessus de y = 355 ; pas plus de 2 à l'écran. Événements (types du GUIDE uniquement) : wind, step, sniff, squirt, splat, yelp, shake, whoosh, ruler, bird, pop, label, counter, ding, reveal, suspense, drip.",
    ].join('\n\n'),
    review_focus: "Segment Mexique : le lézard est-il un lézard à cornes reconnaissable (disque plat, couronne de cornes) et le coyote un coyote ? le jet de sang est-il lisible et drôle sans être gore ? la règle se lit-elle (presque un mètre) ? la grimace du coyote fait-elle rire ? le désert au coucher du soleil donne-t-il l'ambiance nature et chaleur ?",
  },
  {
    seg: 'lyc', nom: 'lycaon', fichier: 'sc_lycaon.js', sprites: 'sc_lycaon_sprites.js', prefixe: 'ly_', fn: 'buildLycaon', k: 2,
    sprites_brief: [
      "Tu dessines le LYCAON (chien sauvage d'Afrique, Lycaon pictus), la meute et les accessoires du vote pour le segment Afrique : sc_lycaon_sprites.js (préfixe ly_) et un sc_lycaon.js PROVISOIRE (function buildLycaon(S) avec 3 plans de contrôle : 'ly_planche' = planche de 12 poses en grille 3x4 (avec plusieurs motifs de pelage), 'ly_cycles' = marche, trot, course et éternuement en continu, 'ly_vote' = urne, bulletin, nez et jauge).",
      "ly_dog(cx, cy, s, t, o) : lycaon d'après faits.md : pelage court en TACHES irrégulières de noir, de fauve (jaune-brun) et de blanc (un motif différent par individu : o.seed pilote la disposition des taches de façon déterministe), museau noir, ligne noire verticale au front, TRÈS GRANDES OREILLES RONDES et dressées (sombres), longue queue touffue à bout BLANC, corps élancé, haut sur pattes, quatre doigts, 60 à 78 cm au garrot. Ce n'est ni un loup ni un chien de dessin animé : proportions réelles. Dessin vectoriel lisse puis silhouette nette (layerBegin/limb/shade/layerEnd), utilisable de 50 px de long (meute au loin) à 220 px (gros plan). Options : pose ('stand', 'lie' repos, 'sit', 'look', 'sneeze' = tête qui se rejette en avant, museau plissé, petit nuage de souffle, 'greet' = tête basse à hauteur d'épaule, oreilles rabattues, queue qui bat, 'walk', 'trot', 'run' = cycles de marche à 4 pattes avec phase), ph (phase 0 à 1 des cycles), seed, flip, rim (liseré de contre-jour de l'aube), shadow, ear (mouvement d'oreille), tail (battement), sneeze (0 à 1 pour la saccade et le souffle).",
      "ly_pack(...) : aide qui place N lycaons (profondeur, tailles, motifs, poses) de façon déterministe ; ly_ballot(cx, cy, s, t, o) (urne de vote avec fente, bulletin « OUI » qui tombe) ; ly_nose(cx, cy, s, t, o) (gros plan du nez : truffe noire humide avec reflets, narines qui se plissent, moustaches, un éternuement) ; ly_sneezeFx(x, y, t0, t, o) (petit nuage de gouttelettes dans la lumière rasante de l'aube, avec le texte « ATCHOUM » dessiné en ui par un helper ly_atchoum(x, y, p, o) en pixels nets).",
      "Icône de case du carnet : ICONES[2] = function (cx, cy) { ... } (17 x 17 px, contour sombre, tête de lycaon de face : grandes oreilles rondes, museau noir, taches ; couleurs exactes) dans ton fichier de sprites.",
      "Vérifie : node solo.mjs lyc ; PAGE=solo_lyc.html OUT=build/lycaon node check.mjs 6 (erreurs : 0) ; PAGE=solo_lyc.html node sheet.mjs 0.5 build/lycaon/sheet ; PAGE=solo_lyc.html OUT=build/lycaon node strip.mjs ly_cycles 10 0.2. Regarde la planche à 1/4 de taille : le lycaon doit se reconnaître en silhouette noire (oreilles rondes énormes, corps élancé, queue touffue).",
    ].join('\n\n'),
    shots_brief: [
      "Tu écris sc_lycaon.js (à la place du provisoire) : function buildLycaon(S) qui dessine le segment AFRIQUE, de S.t0 à S.t1 (voir CONCEPT.md et SEG dans shots.js), avec les sprites de sc_lycaon_sprites.js (déjà faits et relus : lis-les, utilise-les ; ne les réécris pas), kit.js et flore.js. Tu peux ajouter des fichiers sc_lycaon_<x>.js.",
      "Le texte à illustrer : y1 « En Afrique, les lycaons ont une façon très particulière de prendre des décisions : ils éternuent ! » ; y2 « Avant de partir chasser, les membres de la meute se rassemblent. » ; y3 « Plus il y a d'éternuements, plus le groupe a de chances de partir ! » ; y4 « Oui, chez les lycaons, on peut littéralement voter avec son nez ! ». Segment de ≈ 18 s : prévoir 5 à 8 plans.",
      "PLANS SUGGÉRÉS : y1_savane (savane de l'Okavango à l'aube : acacias en parasol, hautes herbes dorées qui ploient, brume basse, soleil bas, oiseaux qui s'envolent ; la meute au repos en contre-jour, un lycaon qui se lève ; case 3/3 allumée + « 3/3 AFRIQUE » ; sur « éternuent » un lycaon éternue : « ATCHOUM » et petit nuage de gouttelettes dans la lumière rasante ; étiquette « BOTSWANA (OKAVANGO) » en sous-titre si la place le permet), y2_rassemblement (« les membres de la meute se rassemblent » : les lycaons arrivent de toutes parts en trottant et se retrouvent en cercle, salutations tête basse, queues qui battent, poussière dorée ; piaillements), y3_vote (« Plus il y a d'éternuements, plus le groupe a de chances de partir » : chaque éternuement fait monter un compteur « ATCHOUM x1, x2, x3… » (de l'un à l'autre des lycaons) et une jauge « DÉPART » ; quand la jauge est pleine, sur « partir », la meute se met en route d'un seul bloc ; ne pas figer un seuil unique : faits.md dit ≈ 3 si le chef lance le rassemblement, ≈ 10 sinon : étiquette « DE 3 À 10 ÉTERNUEMENTS »), y4_nez (« voter avec son nez » : gag : urne de vote, un gros nez de lycaon y dépose un bulletin « OUI » ; événement vote ; puis la meute file vers le soleil levant ; case 3/3 cochée ; le dernier plan dure jusqu'à S.t1).",
      "Attention à l'exactitude (faits.md) : le « vote » est une métaphore des chercheurs (le seuil dépend de l'initiateur) ; l'étude a eu lieu dans le delta de l'Okavango (Botswana) : acacias, mopane, palmiers éventails plutôt qu'un baobab ; l'éternuement est une expiration nasale rapide sans voix. Étiquettes autorisées : celles de la partie 3 du faits.md ; au-dessus de y = 355 ; pas plus de 2 à l'écran. Événements (types du GUIDE uniquement) : wind, bird, sneeze (un par éternuement : leur nombre et leurs instants doivent coller à l'image et au compteur), yip, run, step, counter, pop, label, ding, vote, reveal, whoosh, suspense.",
    ].join('\n\n'),
    review_focus: "Segment Afrique : le lycaon est-il reconnaissable (taches, oreilles rondes énormes, queue à bout blanc) ? l'éternuement se voit-il et fait-il rire ? la progression éternuements → départ se comprend-elle (compteur et jauge) ? le gag de l'urne marche-t-il ? la savane à l'aube donne-t-elle l'ambiance nature (brume, lumière rasante, herbes) ?",
  },
]

const spritesPrompt = sg => [COMMUN, 'TON NOM : ' + sg.nom + ' (préfixe ' + sg.prefixe + '). Dossier de sortie : build/' + sg.nom + '/.', sg.sprites_brief, "Rends : " + sg.sprites + " et le sc_" + sg.nom + ".js provisoire, avec le rapport structuré."].join('\n\n')

const reviewSpritesPrompt = (sg, built, lens) => [
  "Tu es un relecteur indépendant et exigeant (direction artistique pixel art et exactitude naturaliste). Projet : /home/user/AnimalCards/chaine-youtube/03-anecdotes-animaux (fais cd dedans). Lis CONCEPT.md, STYLE.md, GUIDE.md et faits.md. Tu relis le travail de l'artiste « " + sg.nom + " » : " + sg.sprites + " et le fichier provisoire sc_" + sg.nom + ".js (planches de contrôle). Ne fais pas confiance au compte rendu de l'artiste : tu regardes toi-même.",
  "Compte rendu de l'artiste (à vérifier) : " + JSON.stringify(built),
  "MÉTHODE : node solo.mjs " + sg.seg + " ; PAGE=solo_" + sg.seg + ".html OUT=build/rev_" + sg.nom + "_" + lens.id + " node check.mjs 6 (erreurs : 0 ?) ; PAGE=solo_" + sg.seg + ".html node sheet.mjs 0.5 build/rev_" + sg.nom + "_" + lens.id + "/sheet puis avec 0.15 et 0.9 dans d'autres dossiers ; PAGE=solo_" + sg.seg + ".html OUT=build/rev_" + sg.nom + "_" + lens.id + " node strip.mjs <plan> 10 0.2 pour tout ce qui bouge. REGARDE chaque image avec l'outil Read (PNG), à taille réelle et réduite (Python PIL : resize à 1/4 en NEAREST) pour juger la silhouette. Lis le code des fonctions pour les conventions (préfixe, pureté de render, INITS, coût).",
  "TA LENTILLE : " + lens.text,
  "Sois concret : pour chaque défaut, la fonction ou la pose concernée et la correction précise. Ne signale que ce qui nuit à un film fini. Verdict 'ok' seulement s'il ne reste rien de bloquant ni d'important.",
].join('\n\n')

const SPRITE_LENSES = [
  { id: 'dessin', text: "qualité du dessin pixel art : silhouette lisible à 1/4 de taille, 3 à 5 tons par matière, lumière et liseré cohérents, absence de formes plates ou géométriques, de pixels parasites, de bords crénelés cassés, de membres mal articulés ; qualité des cycles (strip : poids, élan, anticipation, secondaires comme queue et oreilles) ; aucune expression accidentelle ; cohérence avec le style de ../02-spiderman et du scientifique." },
  { id: 'nature', text: "exactitude naturaliste et fidélité aux faits : compare le dessin point par point aux descriptions de faits.md (couleurs, masque, cornes, oreilles, queue, proportions, nombre de pattes et de doigts) et signale chaque écart ; vérifie que les états attendus (gelé, dégel, jet, éternuement, etc.) existent et se comprennent ; vérifie aussi la conformité au GUIDE (préfixe, ICONES, options documentées, noms globaux sans collision : grep dans tout le dossier)." },
]

const fixSpritesPrompt = (sg, built, issues) => [
  COMMUN, 'TON NOM : ' + sg.nom + ' (préfixe ' + sg.prefixe + '). Tu es l\'artiste qui corrige : deux relecteurs indépendants ont examiné ' + sg.sprites + ' (travail déjà fait : à reprendre en place, sans tout réécrire) et ont trouvé : ' + JSON.stringify(issues),
  "Compte rendu de la première version : " + JSON.stringify(built),
  "Applique chaque correction bloquante ou importante (et les mineures peu coûteuses) avec Edit, revérifie (check.mjs erreurs : 0 ; images regardées au début, au milieu, à la fin ; strip), garde l'API documentée à jour (signatures, options). Ce qui n'est pas corrigé va dans 'restant' avec la raison.",
].join('\n\n')

const shotsPrompt = (sg, sprites) => [COMMUN, 'TON NOM : ' + sg.nom + ' (préfixe ' + sg.prefixe + ' pour toute fonction ou constante nouvelle). Dossier de sortie : build/' + sg.nom + '/.',
  "SPRITES LIVRÉS (relus et corrigés) : " + JSON.stringify(sprites),
  sg.shots_brief,
  "FIN DE TRAVAIL : (1) node solo.mjs " + sg.seg + " ; node valide.mjs " + sg.seg + " doit ne donner aucun avertissement (début du segment, plans qui se suivent jusqu'à S.t1, coupes juste avant un mot, événements de types connus et dans leur plan) ; (2) PAGE=solo_" + sg.seg + ".html OUT=build/" + sg.nom + " node check.mjs 6 : erreurs : 0 ; node bords.mjs (avec PAGE=...) : aucun texte hors cadre ; (3) tu as regardé chaque plan à 15 %, 55 % et 90 % de sa durée et en bande de mouvement pour les plans qui bougent, et à 1/4 de taille : le sujet se lit, rien de flottant, sous-titres (y ≈ 375) sans recouvrir l'essentiel ; (4) tu écris son_" + sg.nom + ".md : pour CHAQUE plan : ce qu'on voit, l'ambiance continue souhaitée (vent, oiseaux, ruisseau, grillons...), la liste des événements avec leur instant et ce qu'ils représentent, et l'intention musicale (calme, tension, soulagement, comique) ; (5) rapport structuré.",
].join('\n\n')

const reviewShotsPrompt = (sg, built, lens) => [
  "Tu es un relecteur indépendant et exigeant. Projet : /home/user/AnimalCards/chaine-youtube/03-anecdotes-animaux (fais cd dedans). Lis CONCEPT.md, STYLE.md, GUIDE.md, faits.md, et le fichier son_" + sg.nom + ".md de l'artiste. Tu relis le segment « " + sg.nom + " » : " + sg.fichier + " (et ses fichiers sc_" + sg.nom + "_*.js, " + sg.sprites + "). Ne fais pas confiance au compte rendu de l'artiste : tu regardes toi-même.",
  "Compte rendu de l'artiste (à vérifier) : " + JSON.stringify(built),
  "MÉTHODE : node solo.mjs " + sg.seg + " ; node valide.mjs " + sg.seg + " ; PAGE=solo_" + sg.seg + ".html OUT=build/rev_" + sg.nom + "_" + lens.id + " node check.mjs 6 ; node bords.mjs (PAGE=...) ; PAGE=solo_" + sg.seg + ".html node sheet.mjs 0.15 build/rev_" + sg.nom + "_" + lens.id + "/a puis 0.55 (dossier b) et 0.9 (dossier c) ; strip.mjs sur chaque plan qui bouge (PAGE=... OUT=build/rev_" + sg.nom + "_" + lens.id + " node strip.mjs <plan> 10 0.2, et avec un décalage de début pour les plans longs). REGARDE chaque image avec l'outil Read (PNG), à taille réelle et réduite à 1/4.",
  "TA LENTILLE : " + lens.text,
  "Sois concret : plan, instant (en s depuis le début du plan ou temps absolu), correction précise. Ne signale que ce qui nuit à un film fini (pas les goûts). Verdict 'ok' seulement s'il ne reste rien de bloquant ni d'important.",
].join('\n\n')

const SHOT_LENSES = [
  { id: 'image', text: "qualité d'image et d'ambiance nature : chaque plan est-il une illustration pixel art finie et pleine, plutôt que des formes plates ? l'ambiance nature (lumière, paysage, particules, vent, profondeur, perspective atmosphérique) est-elle franche, et chaque monde (Alaska, Mexique, Afrique) a-t-il sa lumière ? le sujet se lit-il à 1/4 de taille ? rien ne flotte ; sous-titres (centre y ≈ 375, hauteur 25 px) et zone du bas (y > 418) respectés ; texte pixel lisible et dans le cadre ; palette respectée ; mouvements fluides avec élan et arrêt (strips) ; aucun bug visuel (bandes, scintillements, éléments coupés, sauts) ; aucune expression accidentelle ; coût de rendu < 300 ms par image (check.mjs)." },
  { id: 'recit', text: "récit, synchronisation et exactitude : pour chaque plan, vérifie avec valide.mjs et P.<id>.words que l'image montre bien ce que dit la voix AU BON MOMENT (la coche sur « survit », le jet sur « yeux », le compteur d'éternuements, etc.), que les coupes tombent sur les mots, que le rythme est bon (pas de plan mort > 2 s, pas de coupe trop nerveuse), que chaque étiquette d'écran est permise par faits.md (partie 3) et ne contredit pas la voix, que les chiffres ne sont pas inventés, que les cases du carnet (HUD) s'allument et se cochent au bon moment ; que les événements du plan (ev) correspondent exactement à l'image (un heartbeat par battement visible, un sneeze par éternuement, etc.) et n'utilisent que les types du GUIDE ; que son_" + 'NOM' + ".md décrit bien chaque plan ; et signale tout ce qui, dans l'image, simplifie ou dépasse le texte au point d'induire en erreur un spectateur." },
]

const fixShotsPrompt = (sg, built, issues) => [
  COMMUN, 'TON NOM : ' + sg.nom + ' (préfixe ' + sg.prefixe + '). Tu es l\'artiste qui corrige : deux relecteurs indépendants ont examiné le segment (travail déjà fait : à reprendre en place avec Edit, sans tout réécrire) et ont trouvé : ' + JSON.stringify(issues),
  "Compte rendu de la première version : " + JSON.stringify(built),
  "Applique chaque correction bloquante ou importante (et les mineures peu coûteuses), revérifie (valide.mjs sans avertissement, check.mjs erreurs : 0, bords.mjs, images regardées aux fractions utiles, strips), mets à jour son_" + sg.nom + ".md si des plans ou événements changent. Ce qui n'est pas corrigé va dans 'restant' avec la raison.",
].join('\n\n')


const FIN_SEGMENTS = [
  {
    seg: 'intro', nom: 'intro', fichier: 'sc_intro.js', sprites: 'sc_grenouille_sprites.js, sc_lezard_sprites.js, sc_lycaon_sprites.js', prefixe: 'in_', fn: 'buildIntro',
    brief: [
      "Tu écris sc_intro.js (préfixe in_ ; fichiers supplémentaires sc_intro_<x>.js possibles) : function buildIntro(S) qui dessine l'ACCROCHE, de S.t0 = 0 à S.t1 (≈ 7,4 s ; voir CONCEPT.md et SEG dans shots.js). La voix : « Tu savais que certains animaux peuvent revenir à la vie après avoir gelé ? » (q, ≈ 0,15 à 3,45 s) puis « Voici trois anecdotes incroyables sur les animaux ! » (trois, ≈ 3,9 à 6,8 s). Les sprites des trois animaux sont écrits, relus et corrigés (sc_grenouille_sprites.js : gr_frog avec pose 'frozen' et option ice, etc. ; sc_lezard_sprites.js ; sc_lycaon_sprites.js) : lis leurs en-têtes d'API et utilise-les. Utilise aussi kit.js (k_iceBlock, k_snow, k_aurora, k_sky...), flore.js, scientist.js (drawScientist, TOUJOURS avec hairStyle: 'curlyFade' : c'est l'auteur) et cadre.js (ICONES, hudTracker en version éteinte si utile).",
      "PLAN 1 : i_gel (de 0 à environ 3,8 s, jusqu'à 0,1 s avant « Voici ») = L'ACCROCHE, le plan qui doit retenir le spectateur dès la première image : forêt boréale d'Alaska à l'heure bleue (ciel, aurore pâle, épicéas enneigés), la neige tombe ; au premier plan, GROS PLAN d'un bloc de glace avec une grenouille des bois prise dedans (pose 'frozen' dessinée avant, voile de glace translucide par-dessus : reflets, bulles, fissures, givre sur les bords), qui scintille ; pendant « revenir à la vie » une fissure court dans la glace, une lueur chaude monte de l'intérieur et un battement fait vibrer la scène (événements crack, heartbeat, glow, sparkle). La première image doit être déjà belle et claire (pas de noir qui s'ouvre). Pas d'étiquette avant que le spectateur ait vu l'image ; pas de cases du carnet.",
      "PLAN 2 : i_trois (de 0,1 s avant « Voici » jusqu'à S.t1 = le début de l'anecdote 1) = LE SCIENTIFIQUE en lisière d'une prairie à l'aube (lumière douce, herbes, un acacia ou un épicéa selon ce qui est beau, rosée, oiseaux) avec sa tenue de terrain : la blouse reste, il porte des jumelles autour du cou et tient un carnet de terrain ouvert (accessoires à dessiner dans ton fichier : in_fieldKit) ; il se tourne vers le spectateur, sourit, lève le carnet : trois cases (icônes ICONES[0..2], bordées comme celles de hudTracker) se retournent l'une après l'autre sur « trois anecdotes » (grenouille, lézard, lycaon, en gros, avec leurs lieux ALASKA, MEXIQUE, AFRIQUE en étiquettes) ; titre « 3 ANECDOTES FOLLES » qui se tape en haut ; événements pop, pop, pop, scribble, label ; le dernier instant du plan (la pause de ≈ 0,6 s avant l'anecdote 1) est une respiration : le scientifique ouvre les jumelles, regarde vers la droite.",
      "Le scientifique doit être grand et net (échelle 1,6 à 2,3), le sujet au-dessus de y = 355, des sous-titres qui ne le recouvrent pas. Événements du GUIDE uniquement : snowfall, wind, crack, heartbeat, glow, sparkle, bird, pop, scribble, page, label, reveal, whoosh, counter. Écris son_intro.md (chaque plan : image, ambiance continue, événements avec leur instant, intention musicale).",
    ].join('\n\n'),
    review_focus: "Accroche : la première image arrête-t-elle le regard (grenouille dans la glace nette, lumière, mouvement dès 0,3 s) ? la fissure et la lueur sur « revenir à la vie » se voient-elles ? le scientifique est-il bien celui de la vidéo 2 (dégradé, boucles blond vénitien, lunettes, blouse) avec jumelles et carnet ? les trois cases se retournent-elles juste sur « trois anecdotes » ?",
  },
  {
    seg: 'fin', nom: 'fin', fichier: 'sc_fin.js', sprites: 'sc_grenouille_sprites.js, sc_lezard_sprites.js, sc_lycaon_sprites.js', prefixe: 'fn_', fn: 'buildFin',
    brief: [
      "Tu écris sc_fin.js (préfixe fn_ ; fichiers supplémentaires sc_fin_<x>.js possibles) : function buildFin(S) qui dessine la FINALE, de S.t0 (0,12 s avant « Alors ») à S.t1 = VOICE_END + CARD_T (voix ≈ 3,6 s, puis le carton qui reste 2 s après la dernière parole ; ensuite le plan de sortie outro.js prend le relais, déjà écrit). La voix : « Alors, laquelle de ces trois anecdotes t'a le plus surpris ? » (fin). Les sprites des trois animaux sont écrits, relus et corrigés (sc_grenouille_sprites.js, sc_lezard_sprites.js, sc_lycaon_sprites.js) : lis leurs en-têtes d'API et utilise-les (poses calmes : 'sit', 'rest', 'stand' ou 'sit'). Utilise aussi kit.js, flore.js, scientist.js (drawScientist, TOUJOURS avec hairStyle: 'curlyFade' : c'est l'auteur), cadre.js (ICONES).",
      "Un ou deux plans (fin_choix, éventuellement fin_carton) : le scientifique, dans la même tenue de terrain que dans l'accroche (blouse, jumelles au cou, carnet de terrain ; accessoires à redessiner dans ton fichier : fn_fieldKit, même allure que l'accroche : tu peux lire sc_intro.js s'il existe déjà, sans le modifier), est assis ou debout dans une prairie au lever du jour (lumière chaude, herbes, rosée, oiseaux, papillons) devant son carnet ouvert ; trois cartes numérotées 1, 2, 3 se dressent (la grenouille, le lézard, le lycaon dessinés grand, en poses calmes, avec leur nom en étiquette) ; il hésite, se gratte la tête, un point d'interrogation flotte ; sur « surpris » les trois cartes s'agitent ; puis, pour le carton qui reste après la dernière parole : un grand « 1 · 2 · 3 ? » centré (police pixel, échelle 4 à 5 avec contour, une teinte par carte), les cartes qui vibrent doucement, le scientifique qui sourit. Les sous-titres de la dernière phrase restent lisibles (y ≈ 375) : pas de texte pixel à cet endroit.",
      "Rien ne doit recouvrir le haut du plan de sortie ; le dernier plan dure jusqu'à S.t1 (le carton de 2 s est la fin de ton plan). Événements du GUIDE uniquement : wind, bird, pop, scribble, page, reveal, whoosh, ding, endCard, sparkle. Écris son_fin.md (chaque plan : image, ambiance continue, événements avec leur instant, intention musicale).",
    ].join('\n\n'),
    review_focus: "Finale : le scientifique est-il celui de la vidéo 2 avec la même tenue de terrain que l'accroche ? les trois cartes (grenouille, lézard, lycaon) se reconnaissent-elles tout de suite, numérotées 1, 2, 3 ? le carton « 1 · 2 · 3 ? » est-il net, centré, lisible, et reste-t-il 2 s après la voix ? la lumière du lever du jour et la prairie donnent-elles une ambiance chaleureuse et nature ?",
  },
]

const finPrompt = fs => [COMMUN, 'TON NOM : ' + fs.nom + ' (préfixe ' + fs.prefixe + '). Dossier de sortie : build/' + fs.nom + '/.', fs.brief,
  "FIN DE TRAVAIL : (1) node solo.mjs " + fs.seg + " ; node valide.mjs " + fs.seg + " sans avertissement ; (2) PAGE=solo_" + fs.seg + ".html OUT=build/" + fs.nom + " node check.mjs 6 : erreurs : 0 ; node bords.mjs (PAGE=...) : aucun texte hors cadre ; (3) tu as regardé chaque plan à 15 %, 55 % et 90 % de sa durée et en bande de mouvement, et à 1/4 de taille ; (4) son_" + fs.nom + ".md écrit ; (5) rapport structuré.",
].join('\n\n')

async function accrocheFinale() {
  await SPRITES_PRETS
  log('sprites prêts : accroche et finale')
  return await parallel(FIN_SEGMENTS.map(fs => async () => {
    const built = await agent(finPrompt(fs), { label: 'plans:' + fs.nom, phase: 'Plans', schema: SC_SPRITES })
    const lenses = SHOT_LENSES.map(l => ({ ...l, text: l.text.replace('NOM', fs.nom) + ' ' + fs.review_focus }))
    const rev = await parallel(lenses.slice(0, RELECTEURS).map(l => () => agent(reviewShotsPrompt(fs, built, l), optRev({ label: 'revplans:' + fs.nom + ':' + l.id, phase: 'Relecture plans', schema: SC_REVIEW }))))
    const iss = fusion(rev)
    let fix = null
    if (iss.some(i => i.gravite !== 'mineur')) fix = await agent(fixShotsPrompt(fs, built, iss), { label: 'fixplans:' + fs.nom, phase: 'Corrections plans', schema: SC_FIX })
    return { seg: fs.seg, built, rev, fix }
  }))
}

const graves = r => (r && r.issues || []).filter(i => i.gravite !== 'mineur')
const fusion = rs => rs.filter(Boolean).flatMap(r => r.issues || [])

// l'accroche et la finale ont besoin des animaux des trois segments : elles attendent la fin des sprites (relus et corrigés)
const SPRITES_DONE = {}
const SPRITES_PRETS = Promise.all(['gre', 'lez', 'lyc'].map(k => new Promise(res => { SPRITES_DONE[k] = res })))

async function segment(sg) {
  try { return await segmentInner(sg) } finally { SPRITES_DONE[sg.seg](null) }
}
const ARGS = (typeof args === 'object' && args) || {}
const DEP = ARGS.depart || {}
const ORDRE = ['sprites', 'revsprites', 'plans', 'revplans']
const RELECTEURS = ARGS.relecteurs || 2
const EFFORT = ARGS.effort_relecture
const optRev = o => EFFORT ? { ...o, effort: EFFORT } : o
async function segmentInner(sg) {
  const dep = DEP[sg.seg] || 'sprites'
  if (dep === 'fini') return { seg: sg.seg, saute: true }
  const depuis = i => ORDRE.indexOf(dep) <= i
  const NOTE = { note: 'travail déjà fait : lire les fichiers du segment (sc_' + sg.nom + '*.js, son_' + sg.nom + '.md) et build/' + sg.nom + '/' }
  const sprites = depuis(0) ? await agent(spritesPrompt(sg), { label: 'sprites:' + sg.nom, phase: 'Sprites', schema: SC_SPRITES }) : NOTE
  const revS = depuis(1) ? await parallel(SPRITE_LENSES.slice(0, RELECTEURS).map(l => () => agent(reviewSpritesPrompt(sg, sprites, l), optRev({ label: 'revsprites:' + sg.nom + ':' + l.id, phase: 'Relecture sprites', schema: SC_REVIEW })))) : []
  const issS = fusion(revS)
  let spritesFinal = sprites
  if (issS.some(i => i.gravite !== 'mineur')) {
    const fx = await agent(fixSpritesPrompt(sg, sprites, issS), { label: 'fixsprites:' + sg.nom, phase: 'Corrections sprites', schema: SC_FIX })
    spritesFinal = { premiere_version: sprites, corrections: fx }
  }
  SPRITES_DONE[sg.seg](spritesFinal)
  const shots = depuis(2) ? await agent(shotsPrompt(sg, spritesFinal), { label: 'plans:' + sg.nom, phase: 'Plans', schema: SC_SPRITES }) : NOTE
  const lensesShots = SHOT_LENSES.slice(0, RELECTEURS).map(l => ({ ...l, text: l.text.replace('NOM', sg.nom) + ' ' + sg.review_focus }))
  const revP = depuis(3) ? await parallel(lensesShots.map(l => () => agent(reviewShotsPrompt(sg, shots, l), optRev({ label: 'revplans:' + sg.nom + ':' + l.id, phase: 'Relecture plans', schema: SC_REVIEW })))) : []
  const issP = fusion(revP)
  let fixP = null
  if (issP.some(i => i.gravite !== 'mineur')) fixP = await agent(fixShotsPrompt(sg, shots, issP), { label: 'fixplans:' + sg.nom, phase: 'Corrections plans', schema: SC_FIX })
  return { seg: sg.seg, sprites, spritesFinal, revS, shots, revP, fixP }
}

for (const sg of SEGMENTS) if (ORDRE.indexOf(DEP[sg.seg] || 'sprites') >= 2 || DEP[sg.seg] === 'fini') SPRITES_DONE[sg.seg](null)     // sprites déjà prêts
const results = await parallel([
  ...SEGMENTS.map(sg => () => segment(sg)),
  ...(ARGS.introfin === false ? [] : [() => accrocheFinale()]),
])
log('segments terminés')
return results
