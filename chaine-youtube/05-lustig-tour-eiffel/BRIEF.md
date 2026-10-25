# L'homme qui a vendu la tour Eiffel : brief des artistes

Même moteur, même style, même voix que l'épisode de référence (dossier voisin `../04-anecdotes-animaux-2/`, terminé : on peut y lire `sc_*.js` pour des exemples de plans et de sprites, et `son_*.md` pour des exemples de notes de son). **Lire d'abord `GUIDE.md` (moteur, conventions, outils, pièges) et `STYLE.md` de CE dossier**, puis ce brief, qui dit ce qui change. La vidéo est verticale (1080 × 1920, 30 i/s), pixel art 270 × 480 agrandi ×4, palette fixe, tout dessiné en JavaScript ; ambiance **nature**, couleurs vives, plans pleins, tout bouge. La timeline de la voix (temps de chaque mot) est dans `build/timeline.js` : **tout se cale sur `wt()` / `wt1()` / `P.<id>`, jamais sur des secondes écrites en dur** (la timeline peut être provisoire au début, puis recalée par la vraie voix : vos plans suivront).

## Qui fait quoi

| Segment | Fichier | Phrases | Préfixe de sprites |
|---|---|---|---|
| `intro` | `sc_intro.js` | i1, i2 | `in_` / `fn_` |
| `idee` | `sc_idee.js` | a1, a2 | `id_` |
| `faux` | `sc_faux.js` | b1, b2 | `fa_` |
| `piege` | `sc_piege.js` | c1, c2, c3, c4 | `pi_` |
| `honte` | `sc_honte.js` | d1, d2, d3 | `ho_` |
| `fin` | `sc_fin.js` | fin, fin2 | `in_` / `fn_` |

- **L'IDÉE** (case 1/4, « 1/4 PARIS 1925 ») : segment `idee`, fichiers `sc_idee_sprites.js`, `sc_idee.js`, `son_idee.md`.
- **LES FAUX PAPIERS** (case 2/4, « 2/4 HOTEL DE LUXE ») : segment `faux`, fichiers `sc_faux_sprites.js`, `sc_faux.js`, `son_faux.md`.
- **LE PIEGE** (case 3/4, « 3/4 LA VENTE ») : segment `piege`, fichiers `sc_piege_sprites.js`, `sc_piege.js`, `son_piege.md`.
- **LA HONTE** (case 4/4, « 4/4 LA FUITE ») : segment `honte`, fichiers `sc_honte_sprites.js`, `sc_honte.js`, `son_honte.md`.

Le HUD (cases du carnet en haut à gauche) est dans `cadre.js` : `hudTracker(k, fait, p)` et `hudLieu(k, nChars)`, `ICONES[k]` à définir par chaque artiste. Le scientifique (`drawScientist(cx, cy, s, t, { hairStyle: 'curlyFade', … })`, `scientist.js`) garde la coiffure de l'auteur ; l'accroche, la finale et la sortie (`outro.js`) sont faites par le chef de projet.

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

*(à compléter par le chef de projet avant de lancer les artistes : pour chaque animal, les faits vérifiés, les étiquettes permises, ce que le texte simplifie. Modèle : section « Faits » de `../04-anecdotes-animaux-2/BRIEF-EP2.md` et `faits.md`.)*

## Plans suggérés (découpables autrement ; chaque coupe 0,05 à 0,15 s avant un début de mot)

*(à compléter : pour chaque segment, 6 à 7 plans, un événement visuel par idée de la voix ; modèle : section « Plans suggérés » de `../04-anecdotes-animaux-2/BRIEF-EP2.md`. Chaque anecdote a un « mais comment ? » et une image que personne n'a vue ; un plan de planche du carnet (coupe, schéma) pour le mécanisme ; la case du carnet cochée à la fin de l'anecdote.)*

## Vocabulaire des événements de bruitage

Celui du GUIDE.md §4 (`valide.mjs` connaît la liste : `VOCAB`). Un événement par chose visible, à l'instant exact de l'image. Un type nouveau doit être ajouté à `VOCAB` (valide.mjs) ET sonorisé dans `score.mjs`.

## Livrables et règles (comme dans le GUIDE.md)

Votre fichier de sprites (`sc_<clé>_sprites.js`) : l'animal et ses accessoires, dessinés **d'abord** et vérifiés en image (planche de poses, cycle de mouvement en bande), puis `sc_<clé>.js` avec les plans (`build<Clé>(S)`), puis `son_<clé>.md` (pour CHAQUE plan : ce qu'on voit, l'ambiance continue souhaitée, les événements avec leur instant, l'intention musicale). N'écrivez que vos fichiers (voir GUIDE.md §1) ; les besoins communs vont dans `demandes_<clé>.md`. Contrôles finaux : `node solo.mjs <clé>` ; `node valide.mjs <clé>` sans avertissement ; `PAGE=solo_<clé>.html OUT=build/<clé> node check.mjs 6` : erreurs : 0 ; `PAGE=solo_<clé>.html node bords.mjs` : aucun texte hors cadre ; images regardées (outil Read) au début, au milieu et à la fin de chaque plan et en bande pour les mouvements, **à taille réelle et à 1/4** (`node still.mjs` fait une image pleine définition, recadrable). Le sujet au-dessus de y = 355 (sous-titres à y ≈ 375, rien d'essentiel en bas), ≤ 2 étiquettes à l'écran, chaque plan ≤ 300 ms par image. **Ni commit ni push.** La machine a 4 cœurs partagés entre les agents : `node check.mjs` avec un pas de 8 ou plus, au plus 8 images par passe ; ne pas lancer de longues commandes en avant-plan. Rendre compte en français, précisément (ce qui est fait, ce qui reste imparfait).

**Qualité attendue** (celle des épisodes précédents) : silhouette lisible à la taille d'une vignette de téléphone, animaux dessinés d'après leurs formes réelles, aucune expression accidentelle, rien d'immobile plus de 0,5 s, lumière naturelle cohérente (contre-jour, ombre portée, liseré), coupes franches, jamais un petit sujet qui flotte.
