# L'homme qui a vendu la tour Eiffel : brief des artistes

Même moteur, même style, même voix que l'épisode de référence (dossier voisin `../04-anecdotes-animaux-2/`, terminé : on peut y lire `sc_*.js` pour des exemples de plans et de sprites, et `son_*.md` pour des exemples de notes de son). **Lire d'abord `GUIDE.md` (moteur, conventions, outils, pièges) et `STYLE.md` de CE dossier**, puis ce brief, qui dit ce qui change. La vidéo est verticale (1080 × 1920, 30 i/s), pixel art 270 × 480 agrandi ×4, palette fixe, tout dessiné en JavaScript ; ambiance **nature**, couleurs vives, plans pleins, tout bouge. La timeline de la voix (temps de chaque mot) est dans `build/timeline.js` : **tout se cale sur `wt()` / `wt1()` / `P.<id>`, jamais sur des secondes écrites en dur** (la timeline peut être provisoire au début, puis recalée par la vraie voix : vos plans suivront).

## Qui fait quoi (deux vagues)

**Vague 1 : sprites seulement** (trois artistes en parallèle, chacun vérifie ses dessins en image, planches de poses et cycles en bande, et documente l'API dans l'en-tête de son fichier) :

| Artiste | Fichier de sprites (préfixe) | Contenu |
|---|---|---|
| **personnages** | `sc_lustig_sprites.js` (`lu_`) | Victor Lustig (élégant, 45 ans) et le marchand de ferraille (André Poisson : rond, moustache, chapeau melon) ; poses et gestes, mains qui tiennent des accessoires ; les cinq autres marchands en groupe autour d'une table ; `ICONES[3]` (la fuite : un train / un chapeau qui s'envole) |
| **extérieurs** | `sc_paris_sprites.js` (`pa_`) | Paris en 1925 : la tour Eiffel (pleine hauteur, gros plan de la ferronnerie, pied de la tour), toits et rues, terrasse de café, échafaudage de peinture, gare et train à vapeur, voiture d'époque, porte du commissariat ; ciels et lumières de la journée (soleil bas, crépuscule) ; `ICONES[0]` (le journal) |
| **intérieurs et accessoires** | `sc_hotel_sprites.js` (`ho_`) | l'hôtel de luxe (salon doré, lustre, colonnes, tentures, grande table), chambre de Lustig et miroir, bureau du faussaire, faux documents (papier à en-tête, sceaux, cire), le tampon rouge « VENDUE » (et ses variantes de texte), machine à écrire, enveloppes, mallette et liasses de billets, contrat, téléphone ; `ICONES[1]` (le document tamponné) et `ICONES[2]` (la mallette) |

**Vague 2 : plans** (les mêmes artistes, relancés par message quand les trois API de sprites existent) : `idee` (`sc_idee.js`), `faux` (`sc_faux.js`), `piege` (`sc_piege.js`), `honte` (`sc_honte.js`) sont répartis entre eux par le chef de projet ; l'accroche (`sc_intro.js`) et la fin (`sc_fin.js`) sont faites par le chef de projet avec les sprites des trois artistes.

Le fil conducteur : **le tampon rouge « VENDUE »** (il s'écrase sur l'écran dans l'accroche, tamponne le contrat et les faux documents, et revient barré à la fin) et **le dossier « AFFAIRE LUSTIG »** (quatre cases en haut à gauche : `hudTracker(k, fait, p)` ; `BETES[k]` : 0 L'IDÉE, 1 LES FAUX PAPIERS, 2 LE PIEGE, 3 LA HONTE ; icônes `ICONES[k]` 17 × 17 px : journal, document tamponné, mallette, train).

## Texte exact de la voix (à illustrer, mot pour mot)

- i1 : « En 1925, un homme a réussi à vendre la tour Eiffel… alors qu'elle ne lui appartenait même pas! »
- i2 : « Et voici comment il a fait. »
- a1 : « À Paris, Victor Lustig apprend que l'entretien de la tour Eiffel coûte extrêmement cher. »
- a2 : « Il décide alors de se faire passer pour un haut fonctionnaire du gouvernement français. »
- b1 : « Il fabrique de faux documents officiels et invite plusieurs marchands de ferraille dans un hôtel de luxe. »
- b2 : « Il leur annonce une information totalement secrète: la tour Eiffel va être détruite et vendue pour son métal! »
- c1 : « L'un des marchands tombe dans le piège. »
- c2 : « Convaincu de réaliser l'affaire du siècle, il remet une énorme somme d'argent à Lustig. »
- c3 : « Mais quelques jours plus tard, il découvre la vérité. »
- c4 : « Il vient de se faire arnaquer! »
- d1 : « Et le plus incroyable? »
- d2 : « Le marchand est tellement honteux qu'il ne porte même pas plainte! »
- d3 : « Victor Lustig disparaît avec l'argent… avant de revenir à Paris pour tenter exactement la même arnaque! »
- fin : « Mais cette fois, son plan échoue. »
- fin2 : « Cet homme a donc réussi à vendre l'un des monuments les plus célèbres du monde… sans jamais en être propriétaire! »

## Faits (à respecter ; ne rien afficher qui contredise la voix)

Voir `faits.md` pour les sources et les réserves. En bref :
- **Victor Lustig** (né en 1890 en Bohême, mort en 1947), escroc élégant et polyglotte. En 1925 à Paris : il lit (dans la presse) que l'entretien de la **tour Eiffel** coûte très cher (repeinte tous les sept ans ; construite pour l'Exposition universelle de 1889, elle ne devait pas rester) ; il se fait passer pour un **haut fonctionnaire** (sous-directeur général du ministère des Postes et Télégraphes) avec de **faux papiers à en-tête** ; il invite **cinq ou six marchands de ferraille** dans un **hôtel de luxe** (le Crillon, à Paris) et leur annonce, sous le sceau du secret, que la tour va être **démolie et vendue pour son fer**.
- Un des marchands (**André Poisson**, nouveau venu à Paris et désireux d'être reconnu) est choisi ; il paie (le prix et un pot-de-vin) ; Lustig et son complice partent avec l'argent (en train vers Vienne). Le marchand, **trop honteux, ne porte pas plainte**. Lustig **revient à Paris** (quelques semaines ou mois plus tard) et **recommence** avec de nouveaux marchands : **cette fois l'un d'eux alerte la police**, Lustig s'enfuit (vers les États-Unis).
- Ce que la vidéo ne montre **pas** : les sommes exactes (les sources diffèrent), le nom du complice, la suite (faux-monnayeur, prison d'Alcatraz). Pas de chiffres à l'écran sur l'argent. « Quelques jours plus tard » (dit par la voix) : ne rien montrer qui le contredise (ni une date précise ni un calendrier).
- Étiquettes permises : « PARIS 1925 », « HAUT FONCTIONNAIRE », « FAUX », « OFFICIEL » (sur les faux documents), « SECRET », « VENDUE », « ARNAQUE », « PAS DE PLAINTE », « LA TOUR EIFFEL : A DEMOLIR ? » (sur l'affiche ou le document), « AFFAIRE LUSTIG ». Texte pixel : majuscules, pas de guillemets.

## Plans suggérés (découpables autrement ; chaque coupe 0,05 à 0,15 s avant un début de mot ; 5 à 7 plans par segment, sauf l'accroche)

Ambiance : **Paris des Années folles**, lumière dorée rasante (matin de coupe), puis lumières chaudes d'intérieur (hôtel), puis crépuscule (fuite). Décors pleins, détaillés (façades haussmanniennes, toits de zinc, cheminées, lampadaires, affiches), tout vit (fumée de cheminée, pigeons, passants, rideaux, poussière dans les rayons).

- **intro** (chef de projet) : `i_tour` la tour Eiffel monte dans le cadre (travelling vers le haut), tampon rouge « VENDUE » qui s'écrase (événement `stamp`) sur « appartenait » ; `i_dossier` le dossier « AFFAIRE LUSTIG » se referme/s'ouvre sur la silhouette de Lustig, « Et voici comment il a fait ».
- **idee** (a1, a2) : `a1_journal` Lustig à une terrasse de café lit un journal ; l'article sur la tour (échafaudage, peintres, pièces de monnaie qui s'envolent de la tour) sur « coûte extrêmement cher » ; `a1_tour` gros plan sur la ferronnerie, ouvriers qui repeignent, l'argent qui s'échappe ; `a2_miroir` Lustig devant un miroir ajuste cravate, chapeau, décorations : « HAUT FONCTIONNAIRE » (étiquette) ; son sourire en coin ; case 1/4 cochée.
- **faux** (b1, b2) : `b1_faussaire` le bureau du faussaire : machine à écrire, en-tête, sceau, cire, tampon « OFFICIEL » (événements `typing`, `stamp`) ; `b1_invitations` les enveloppes s'envolent vers cinq ou six marchands ; `b1_hotel` façade et salon de l'hôtel de luxe ; `b2_secret` Lustig se penche sur la table, doigt sur les lèvres (« SECRET »), les marchands se rapprochent ; `b2_demolition` l'affiche / le document : la tour démolie, le fer vendu au poids (boulet de démolition, tas de poutres) ; case 2/4 cochée.
- **piege** (c1–c4) : `c1_marchand` le marchand (yeux brillants) convaincu : « L'AFFAIRE DU SIECLE » ; `c2_valise` la mallette de billets passe de main en main (`coins`), poignée de main, tampon « VENDUE » sur le contrat, sourire de Lustig ; `c3_decouverte` quelques jours plus tard, le marchand brandit son contrat au pied de la tour, un gardien secoue la tête (`knock` / `gasp`) ; `c4_arnaque` le marchand comprend : « ARNAQUE » écrasé en rouge ; case 3/4 cochée.
- **honte** (d1–d3) : `d1_question` « ? » géant, le marchand devant la porte du commissariat ; `d2_honte` il hésite, rougit, tourne les talons chapeau à la main : « PAS DE PLAINTE » ; `d3_train` Lustig dans un train à vapeur avec la mallette (`train`), disparaît dans la fumée ; `d3_retour` le train revient en gare de Paris, Lustig descend, rouvre le dossier : les mêmes enveloppes ; case 4/4 cochée.
- **fin** (fin, fin2) : `f1_echec` un marchand flaire la ruse, décroche le téléphone / court au commissariat, Lustig voit les policiers, son sourire s'efface, il s'enfuit (chapeau qui s'envole) ; `f2_tour` la tour Eiffel au crépuscule, le tampon « VENDUE » apparaît puis est barré par « JAMAIS A LUI » (mot à mot « sans jamais en être propriétaire ») ; carton final (2 s) : « 1925 · LA TOUR EIFFEL N'ÉTAIT PAS A VENDRE » (ou équivalent, au plus 2 lignes).

## Vocabulaire des événements de bruitage

Celui du GUIDE.md §4 (`valide.mjs` connaît la liste : `VOCAB`), plus ces types **nouveaux** pour cette vidéo : `stamp` (coup de tampon sec, v = force), `coins` (pièces / liasse de billets froissée, v = durée), `typing` (machine à écrire, v = durée), `train` (locomotive à vapeur qui démarre / passe, v = durée), `gasp` (inspiration de surprise), `knock` (coup à une porte). Un événement par chose visible, à l'instant exact de l'image. Un type nouveau doit être ajouté à `VOCAB` (valide.mjs) ET sonorisé dans `score.mjs`.

## Livrables et règles (comme dans le GUIDE.md)

Votre fichier de sprites (`sc_<clé>_sprites.js`) : l'animal et ses accessoires, dessinés **d'abord** et vérifiés en image (planche de poses, cycle de mouvement en bande), puis `sc_<clé>.js` avec les plans (`build<Clé>(S)`), puis `son_<clé>.md` (pour CHAQUE plan : ce qu'on voit, l'ambiance continue souhaitée, les événements avec leur instant, l'intention musicale). N'écrivez que vos fichiers (voir GUIDE.md §1) ; les besoins communs vont dans `demandes_<clé>.md`. Contrôles finaux : `node solo.mjs <clé>` ; `node valide.mjs <clé>` sans avertissement ; `PAGE=solo_<clé>.html OUT=build/<clé> node check.mjs 6` : erreurs : 0 ; `PAGE=solo_<clé>.html node bords.mjs` : aucun texte hors cadre ; images regardées (outil Read) au début, au milieu et à la fin de chaque plan et en bande pour les mouvements, **à taille réelle et à 1/4** (`node still.mjs` fait une image pleine définition, recadrable). Le sujet au-dessus de y = 355 (sous-titres à y ≈ 375, rien d'essentiel en bas), ≤ 2 étiquettes à l'écran, chaque plan ≤ 300 ms par image. **Ni commit ni push.** La machine a 4 cœurs partagés entre les agents : `node check.mjs` avec un pas de 8 ou plus, au plus 8 images par passe ; ne pas lancer de longues commandes en avant-plan. Rendre compte en français, précisément (ce qui est fait, ce qui reste imparfait).

**Qualité attendue** (celle des épisodes précédents) : silhouette lisible à la taille d'une vignette de téléphone, animaux dessinés d'après leurs formes réelles, aucune expression accidentelle, rien d'immobile plus de 0,5 s, lumière naturelle cohérente (contre-jour, ombre portée, liseré), coupes franches, jamais un petit sujet qui flotte.
