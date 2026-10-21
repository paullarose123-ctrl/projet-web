# Sonorisation de l'accroche (segment intro, 0 à 6,71 s)

Fichier de plans : `sc_intro.js` (un seul fichier, préfixe `in_`). Deux plans : `i_gel` (0 → 3,77 s) et `i_trois` (3,77 → 6,71 s). Tous les instants ci-dessous sont ceux de la voix actuelle (`cml928`) ; ils sont calés sur `wt()` dans le code et suivent donc une voix refaite. Aucun bruit sur la coupe entre les deux plans (la coupe tombe 0,10 s avant « Voici »). Types d'événements : uniquement ceux du GUIDE.

## Plan 1 : `i_gel` (0 → 3,77 s) « Tu savais que certains animaux peuvent revenir à la vie après avoir gelé ? »

**Image.** Heure bleue en Alaska : ciel étoilé, aurore pâle verte et cyan qui ondule, montagnes et épicéas enneigés dans la brume, une branche d'épicéa chargée de neige en haut à droite. Au premier plan, un gros bloc de glace (il occupe presque toute la largeur) avec la grenouille des bois gelée dedans, posée sur de la litière de feuilles. Givre épais sur les arêtes, deux reflets en biais. La neige tombe en continu. La première image est déjà complète (rien ne s'ouvre depuis le noir). Un reflet blanc balaie la glace de gauche à droite (0,3 → 1,3 s) et des étoiles de lumière naissent sur les arêtes. Une étiquette « -15 °C » en gros caractères, avec « MINIMUM MOYEN » dessous (température minimale moyenne mesurée en Alaska, −14,6 °C arrondi), se tape à 0,8 s. La grenouille (brune, contour sombre épais, œil doré brillant, masque et lèvre nets) reste plus sombre que la glace ; son œil cligne une fois à « vie ». Une première fissure fine apparaît vers 1,44 s, avant « revenir ». Pas de cases du carnet.

**Ambiance continue.** Vent froid et bas, léger, par rafales (neige fine poussée, souffle dans les épicéas). Froissement très doux de flocons. Silence de nuit polaire sous le vent (pas d'oiseaux, pas d'insectes). Un fond de glace : grésillement cristallin à peine audible quand le givre scintille.

**Événements.**

| Instant (s) | Type | Valeur | Ce qu'on voit |
|---|---|---|---|
| 0,04 | `snowfall` | 3,77 | neige serrée sur tout le plan |
| 0,10 | `wind` | 2,5 | souffle qui traverse l'image (les flocons penchent) |
| 0,22 · 0,62 · 0,98 · 1,42 · 1,80 | `sparkle` | 1 | une étoile de lumière sur une arête de la glace (0,4 s chacune) ; le balayage de reflet passe entre 0,3 et 1,3 s |
| 0,80 | `label` | 1 | l'étiquette « -15 °C / MINIMUM MOYEN » se tape (0,6 s) |
| 1,44 (0,45 s avant « revenir ») | `crack` | 0,1 | une première fissure très fine apparaît en haut du bloc : un craquement léger, presque un souffle |
| 1,89 (« revenir ») | `crack` | 0,3 | une première fissure apparaît en haut à droite du bloc |
| 1,94 | `glow` | 1,14 | une lueur chaude, ronde, naît derrière la grenouille (centrée sur son cœur) et monte (jusqu'à « vie ») |
| 2,41 (juste avant « vie ») | `heartbeat` | 1 | premier battement : toute l'image vibre de 2 px (toum, puis un doum plus faible 0,2 s après), la lueur flashe |
| 2,43 | `crack` | 0,6 | la fissure se ramifie, d'autres partent des bords |
| 3,11 (juste avant « gelé ») | `crack` | 1 | le réseau de fissures atteint toutes les arêtes |
| 3,28 (« gelé ») | `heartbeat` | 1 | deuxième battement, même vibration ; la lueur est à son maximum |
| 3,30 | `sparkle` | 1 | gerbe de quatre étoiles autour de la grenouille (un éclat sec, juste avant la coupe) |

**Intention musicale.** Ouverture froide et cristalline : une note de célesta ou de kalimba très haute, tenue, avec une nappe de cordes sourdes dans le grave (heure bleue, étonnement). Quelques gouttes de notes éparses sur les étoiles de lumière, sans rythme. Sur « revenir à la vie » : la nappe s'ouvre (une quinte puis une tierce majeure qui monte), la pulsation naît avec les battements (deux coups de caisse grave étouffée sur les `heartbeat`, pas de basse continue). Sur « gelé ? » : la montée reste en suspens (accord ouvert, non résolu) pour appeler la suite ; elle se résout sur le plan suivant.

## Plan 2 : `i_trois` (3,77 → 6,71 s) « Voici trois anecdotes incroyables sur les animaux ! »

**Image.** Le scientifique de la chaîne (blouse, lunettes, coiffure de l'auteur) en lisière d'une prairie à l'aube : ciel violet et rose, soleil bas doré derrière des collines, un acacia à droite, herbes et petites fleurs mouillées de rosée qui brillent, oiseaux. Tenue de terrain : jumelles au cou, carnet de terrain ouvert. Il se tourne vers le spectateur, sourit, lève le carnet. Trois cartes (grenouille, lézard, lycaon, bordées comme les cases du carnet) arrivent face cachée (« ? »), puis se retournent l'une après l'autre sur « trois anecdotes » ; leur lieu se tape dessous (ALASKA, MEXIQUE, AFRIQUE). Le titre « 3 ANECDOTES FOLLES » se tape en haut sur « Voici » (le curseur disparaît dès que le texte est entièrement tapé). À la fin de la phrase, il baisse le carnet (le bras reste à l'extérieur du corps), lève les jumelles (deux lentilles bleues avec un éclat) et se penche vers la droite pour regarder au loin : c'est la respiration de 0,6 s avant l'anecdote 1.

**Ambiance continue.** Aube : brise légère, chorale d'oiseaux (merle, fauvette, quelques cris plus aigus au loin), frémissement d'herbe, insectes très discrets. Plus chaude et plus ouverte que le plan 1 : le contraste doit se sentir tout de suite (on passe du froid immobile à la vie). Rien de sec : le sol est humide, pas de bruit de pas (le scientifique ne bouge pas les pieds).

**Événements.**

| Instant (s) | Type | Valeur | Ce qu'on voit |
|---|---|---|---|
| 3,77 | `wind` | 2,94 | brise d'aube sur tout le plan |
| 3,79 | `whoosh` | 0,3 | le scientifique se tourne vers nous (de profil étroit à face) |
| 3,92 (« Voici » + 0,05) | `label` | 1 | le titre « 3 ANECDOTES FOLLES » commence à se taper (0,5 s) |
| 4,07 | `page` | 1 | le carnet s'ouvre et se lève |
| 4,17 | `bird` | 1 | un petit oiseau traverse de gauche à droite |
| 4,17 | `scribble` | 2,11 | les lignes de notes s'écrivent sur les pages (jusqu'à « animaux ») |
| 4,31 (« trois » + 0,16) | `pop` | 1 | la carte grenouille se retourne |
| 4,32 (t1 + 0,55) | `bird` | 2 | un second oiseau traverse de droite à gauche, au-dessus de sa tête, et sort du cadre avant les jumelles |
| 4,45 | `label` | 1 | « ALASKA » se tape |
| 4,56 (« anecdotes » + 0,16) | `pop` | 1 | la carte lézard se retourne |
| 4,70 | `label` | 1 | « MEXIQUE » se tape |
| 4,79 | `pop` | 1 | la carte lycaon se retourne |
| 4,83 | `reveal` | 1 | les trois cartes sont face visible (accord lumineux discret, pas plus fort que les `pop`) |
| 4,93 | `label` | 1 | « AFRIQUE » se tape |
| 5,78 (« animaux » + 0,10) | `whoosh` | 0,45 | il lève les jumelles à ses yeux, le carnet descend |
| 6,30 | `sparkle` | 1 | un éclat sur la lentille droite des jumelles |

Aucun événement entre 6,30 et 6,71 s : la respiration finale est portée par l'ambiance (brise, oiseaux), pour que la musique puisse préparer l'anecdote 1.

**Intention musicale.** Le thème s'ouvre franchement : la tonalité se résout (majeure, claire) sur « Voici », kalimba et cordes pincées sur une pulsation de marche légère (curieuse, joyeuse, pas dramatique) ; une petite note par carte retournée (montante : grave pour la grenouille, médium pour le lézard, haute pour le lycaon), calée sur les `pop`. Sur « incroyables » le motif s'élargit d'un cran (flûte douce). À partir de 5,78 s (jumelles) la musique s'amincit presque à rien (une seule note tenue, suspendue) pour laisser la voix finir « animaux ! » puis la respiration de 0,6 s, et relancer d'un seul coup sur l'anecdote 1 (Alaska : retour de la couleur froide et cristalline).
