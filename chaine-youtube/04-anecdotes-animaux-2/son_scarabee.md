# Bande-son du segment SCARABÉE BOMBARDIER — `sc_scarabee.js`

Segment : 5,77 s → 22,77 s (17,0 s), 7 plans. Les temps ci-dessous sont les temps ABSOLUS du film (voix réelle `cml928`) ; ils sont tous calés sur `wt()` / `P.<id>` : si la voix est refaite, relancer `node solo.mjs sca` puis relire `build/events.json` (les instants des événements se déplacent avec les mots, les durées des mouvements restent fixes). Aucun bruit sur les coupes.

Principe sonore du segment : on commence **dehors, tout petit**, dans une prairie dorée de fin de journée vue au ras du sol (le monde des insectes : herbes qui frottent, bourdonnements, grillons au loin) ; la planche du carnet **coupe le monde** (le dehors s'efface : tic-tac de laboratoire, liquides, chimie, tension qui monte jusqu'à la détonation) ; on **revient** au réel pour la décharge (jet pulsé qui crépite, vapeur qui siffle, crapaud qui recule) puis le calme revient, un peu plus doux qu'au début (le scarabée repart tranquillement). Arc musical : curiosité chaude et espiègle → fierté → menace → tension scientifique → explosion → soulagement comique.

Nouveaux types utilisés (ils sont dans le vocabulaire de `valide.mjs`) : `heat` (montée de chaleur), `steam` (vapeur qui siffle), `bang` (petite détonation sèche), `bubbles` (bulles d'ébullition). Aucun type inventé.

## b1_chaud — 5,77 → 9,83 s (4,06 s) : le scarabée marche, le thermomètre monte à 100 °C (« Tu savais qu'un petit scarabée pouvait projeter du liquide à 100 degrés ? »)

**Ce qu'on voit.** Prairie dorée au ras du sol, soleil bas à droite (halo, bokeh, pollen et poussière qui flottent dans la lumière), grandes lames d'herbe floues qui encadrent l'image. Le scarabée bombardier (élytres bleu-noir brillants, tête et pattes orange, antennes qui balaient) marche vers la droite d'un pas régulier de six pattes en tripodes, la caméra le suit (le sol défile, le fond lointain presque pas). Les trois cases du carnet apparaissent en haut à gauche puis « 1/3 BOMBARDIER ». Sur « liquide » un thermomètre dans un bécher d'eau entre par la droite ; sur « à 100 » le niveau monte vite de 20 à 100 °C, le compteur rouge « 20°C … 100°C » grimpe, l'eau du bécher se met à bouillir (bulles) et la vapeur monte ; l'étiquette rouge « JUSQU'À ≈ 100 °C » se tape sur « 100 ».

**Ambiance continue.** Soir doré et tiède : brise légère dans les herbes hautes (souffle doux, frottement d'herbes), grillons / sauterelles lointains en nappe discrète, un ou deux bourdonnements de mouches qui passent dans la lumière (très bas, très petits : on est à l'échelle d'un insecte), pas d'oiseau marqué. Quand le thermomètre monte, un léger sifflement de bouilloire peut s'installer sous la vapeur, sans couvrir la voix.

**Intention musicale.** Pizzicato / kalimba légers et sautillants (pulsation de petites pattes, ≈ 2 pas par seconde), ton malicieux et curieux ; sur « 100 » une petite montée rapide (glissando de flûte ou de cordes pincées) qui éclate en accord clair avec le « ding » du thermomètre.

**Événements** (temps absolu · type · valeur · ce que ça représente) :

- 5,85 · `step` · 0,5 — un pas du scarabée (un pas par cycle de marche, toutes les 0,52 s : 5,85 ; 6,37 ; 6,89 ; 7,41 ; 7,93 ; 8,45 ; 8,97 ; 9,49) : tout petits « tic » d'herbe sèche, pas des pas de géant
- 8,12 · `pop` · 1 — le thermomètre et son bécher apparaissent (« liquide »)
- 8,43 · `heat` · 0,80 — montée de chaleur : le niveau grimpe de 20 à 100 °C pendant « à 100 »
- 8,51 · 8,59 · 8,68 · 8,76 · 8,84 · `counter` · 1 à 5 — le compteur rouge avance d'un cran (≈ tous les 0,08 s)
- 8,65 · `label` · 1 — l'étiquette « JUSQU'À ≈ 100 °C » se tape (sur « 100 »)
- 8,93 · `steam` · 1,1 — le niveau atteint 100 °C : la vapeur siffle au-dessus du bécher
- 8,93 · `bubbles` · 1,2 — l'eau du bécher bout (bulles qui éclatent)
- 8,93 · `ding` · 1 — le niveau touche 100 (nombre jaune)

## b2_nom — 9,83 → 11,84 s (2,02 s) : il se redresse fièrement (« C'est le cas du scarabée bombardier ! »)

**Ce qu'on voit.** Même prairie, le scarabée immobile au centre, plus grand (≈ 65 % de la largeur). Sur « scarabée » il se redresse sur ses pattes tendues (nez relevé, corps haut, antennes écartées, avec un petit dépassement), les antennes se balancent ; sur « bombardier » la pointe de son abdomen se relève d'un coup (« flick ») puis retombe, un éclat en croix brille sur le dos et un reflet balaie les élytres. L'étiquette ambre « SCARABÉE BOMBARDIER » se tape dans le ciel. Les cases du carnet et « 1/3 BOMBARDIER » restent.

**Ambiance continue.** Celle de b1_chaud (herbes, grillons lointains, brise), un peu plus présente : le monde « écoute » le héros. Les mouches du plan précédent s'éloignent. Plus de vapeur de thermomètre.

**Intention musicale.** Fierté espiègle : petite fanfare de cuivres doux / flûte et pizzicato sur « scarabée », courte pause, accord clair et brillant sur « bombardier » (l'éclat), puis suspension (un temps de silence musical avant l'arrivée du danger).

**Événements :**

- 10,65 · `whoosh` · 0,3 — le corps se hisse sur les pattes (début du redressement, sur « scarabée »)
- 10,70 · `step` · 0,6 — les pattes se posent (petit « tic » sec)
- 10,75 · `label` · 1 — l'étiquette de nom se tape
- 11,16 · `blip` · 1 — la pointe de l'abdomen se relève d'un coup (« flick »)
- 11,23 · `sparkle` · 1 — éclat sur les élytres (sur « bombardier »)

## b3_proie — 11,84 → 13,31 s (1,46 s) : le prédateur arrive (« Lorsqu'un prédateur l'attaque, »)

**Ce qu'on voit.** Même prairie, le scarabée plus petit à gauche (s'immobilise en cours de plan : il marche, ralentit, se fige, antennes dressées). Un crapaud commun (brun, verruqueux, grand œil doré à pupille horizontale) saute dans le cadre par la droite sur « Lorsqu'un », atterrit sur « prédateur » (le corps s'écrase, la gorge bat), fixe sa proie, puis sur « l'attaque » se projette en avant : gueule grande ouverte (intérieur rouge), langue rose qui part vers le scarabée. Le scarabée se met en garde : l'arrière se relève, la pointe de l'abdomen commence à se recourber. Les cases du carnet restent.

**Ambiance continue.** Les insectes se taisent d'un coup à l'arrivée du crapaud : l'ambiance de prairie baisse d'un cran (grillons coupés), un silence tendu, juste le souffle de l'herbe. Une basse sourde pourrait accompagner l'arrivée du crapaud.

**Intention musicale.** Danger : motif grave et lent (contrebasse pincée / timbale très douce), tension qui monte sur « prédateur », frappe brève sur « l'attaque » ; le ton reste ludique, pas horrifique.

**Événements :**

- 12,04 · `whoosh` · 0,3 — le crapaud est en l'air (saut vers le cadre)
- 12,46 · `hop` · 1 — réception du crapaud sur le sol (écrasement du corps)
- 12,50 · `ribbit` · 0,8 — coassement bas et court du crapaud (hauteur 0,8 : gros animal)
- 12,77 · `whoosh` · 0,2 — le crapaud se projette en avant
- 12,81 · `suspense` · 0,8 — montée de tension jusqu'à la coupe vers la planche
- 12,93 · `splat` · 1 — la langue colle au but (impact mouillé)

## b3_coupe — 13,31 → 15,77 s (2,47 s) : planche du carnet, la coupe de l'abdomen (« il mélange deux substances chimiques dans son abdomen »)

**Ce qu'on voit.** Coupe en fond nuit quadrillé (planche du carnet, pas de cases du carnet) : l'abdomen du scarabée, calotte bleue des élytres en haut, paroi de cuticule orange, tissus violets. Deux réservoirs de verre : à gauche un liquide ambre (étiquette ambre « HYDROQUINONE »), à droite un liquide cyan (étiquette bleue « EAU OXYGENEE »), liquides qui ondulent, bulles qui montent. Sur « mélange » les deux vannes s'ouvrent : les liquides coulent dans leurs conduits de verre (gouttes qui avancent) vers la **chambre de réaction** (ellipse à paroi épaisse, enzymes vertes en forme de « pacmans » le long de la paroi). Sur « chimiques » les deux réservoirs sont en valeur (cercle blanc), sur « abdomen » la caméra se rapproche doucement ; au fond de la chambre le mélange commence à tourbillonner (ambre et cyan).

**Ambiance continue.** Le dehors a disparu : espace feutré de laboratoire (tic-tac discret, léger bourdon électrique), liquides qui coulent (glouglou très doux), bulles ; tout est contenu et propre, on « entend » la précision. Aucun son d'herbe ni d'insecte.

**Intention musicale.** Curiosité scientifique : célesta / kalimba en arpèges réguliers (« mécanisme »), une nappe aiguë qui s'installe ; une note par réservoir (une ambre chaude, une cyan claire) sur leurs étiquettes, qui se rejoignent sur « chimiques ».

**Événements :**

- 13,57 · `blip` · 1 — les vannes s'ouvrent (« mélange »)
- 13,62 · 13,97 · 14,37 · `drip` · 0,8 / 0,5 / 0,6 — gouttes de liquide qui tombent dans les conduits
- 13,97 · `label` · 1 — l'étiquette « HYDROQUINONE » se tape (« deux »)
- 14,15 · `label` · 1 — l'étiquette « EAU OXYGENEE » se tape (« substances »)
- 14,71 · `whoosh` · 0,4 — les deux liquides se rejoignent dans la chambre
- 15,27 · `pop` · 1 — « abdomen » : on est bien dans l'abdomen, le zoom continue vers la chambre (petit « pop »)

## b3_boum — 15,77 → 18,35 s (2,57 s) : la réaction, l'explosion (« et provoque une véritable petite explosion ! »)

**Ce qu'on voit.** Gros plan sur la chambre de réaction (fond nuit, la paroi orange de l'abdomen autour). Sur « provoque » les enzymes s'activent (elles bâillent et pulsent), un **éclair** cyan-blanc zèbre la chambre, la lueur chauffe : le mélange vire du jaune au blanc, des bulles de plus en plus nombreuses. À gauche, un thermomètre vertical monte (compteur rouge « 36°C … 100°C »), un tremblement de plus en plus fort secoue la planche, l'étiquette verte « ENZYMES » se tape et pointe l'une d'elles. Un second éclair sur « petite ». Sur « explosion » : éblouissement blanc de deux images, **étoile d'explosion** rouge-orange-jaune-blanche qui gonfle, anneau de choc et étincelles ; la buse crache les premières bouffées ; l'étoile s'efface en fin de plan.

**Ambiance continue.** La tension monte en continu : bourdonnement électrique qui grimpe en hauteur, bulles qui se multiplient, « craquements » de chaleur ; tout se tend jusqu'à la détonation, puis une chute sèche (queue de réverbération courte, vapeur qui siffle).

**Intention musicale.** Montée dramatique courte (cordes / synthé aigu en crescendo, battement qui s'accélère) sur « provoque … véritable petite », silence d'une fraction de seconde, puis l'impact sur « explosion » (accord plein + percussion sèche) ; la queue reste brillante et un peu comique (« petite » explosion : on ne veut pas de film catastrophe).

**Événements :**

- 15,95 · `suspense` · 1,40 — montée de tension (de « et » à « explosion »)
- 15,97 · `heat` · 1,50 — la réaction chauffe (jusqu'à l'explosion)
- 15,99 · `sparkle` · 1 — l'éclair et le réveil des enzymes (sur « provoque »)
- 16,50 · `counter` · 1 — le compteur franchit un palier (sur « véritable »)
- 16,98 · `counter` · 2 — idem (sur « petite », 2e éclair)
- 17,28 · `bang` · 1,5 — détonation sèche (début de « explosion ») : éblouissement blanc, étoile
- 17,33 · `reveal` · 1 — l'étoile éclate (accord lumineux)
- 17,46 · `steam` · 1 — la vapeur siffle par la buse

## b4_jet — 18,35 → 20,74 s (2,39 s) : le jet brûlant frappe le prédateur (« Il projette alors un jet brûlant et irritant »)

**Ce qu'on voit.** Retour au réel, au ras du sol : le scarabée (à gauche) en posture de tir (nez baissé, arrière relevé, pattes arc-boutées) ; la pointe de son abdomen se recourbe par-dessus le dos, buse vers l'avant, et rougeoie. Le crapaud (à droite, grand, gueule encore entrouverte) est face à lui. Sur « projette » la buse jette un **jet pulsé** (capsules de liquide blanc-jaune qui filent en bouffées rapides, gouttelettes, nuage de vapeur) vers la tête du crapaud. À l'impact (18,81 + 0,24 s) : éclaboussure de gouttes brûlantes et vapeur sur sa face, le crapaud se **cabre**, l'œil se plisse, la gueule se ferme en grimaçant, puis il **secoue la tête** de plus en plus faiblement tandis qu'un voile de vapeur monte de sa peau. Légère secousse de caméra à l'impact. Cases du carnet visibles.

**Ambiance continue.** Retour de la prairie, mais traversée par le crépitement du jet (plusieurs dizaines de petits « tic-tic-tic » par seconde fondus en grésillement, comme du beurre qui frit) et le sifflement de la vapeur ; le crapaud respire fort. Pas de vent.

**Intention musicale.** Action espiègle : batterie légère / percussions sèches très rapides sur le jet (le « crépitement » rythmique de la pulsation), cordes sur l'impact, petit « aïe » musical (trombone glissé ou cor) quand le crapaud se cabre ; la fin du plan retombe sur un motif comique descendant (le crapaud secoue la tête).

**Événements :**

- 18,59 · `suspense` · 0,3 — le scarabée vise (« projette »)
- 18,81 · `bang` · 0,7 — départ du jet (petit claquement sec à la buse)
- 18,81 · `steam` · 1,6 — vapeur du jet, pendant 1,6 s
- 18,93 · `whoosh` · 0,5 — le jet file vers le crapaud
- 19,05 · `splat` · 1 — le jet frappe la face du crapaud (impact mouillé et brûlant)
- 19,10 · `steam` · 1 — la peau fume
- 19,23 · `ribbit` · 1,3 — le crapaud, surpris, pousse un croassement aigu et bref (hauteur 1,3)
- 19,55 · 19,80 · 20,05 · `shake` · 1 — le crapaud secoue la tête (trois secousses, de plus en plus faibles)

## b4_fuite — 20,74 → 22,77 s (2,03 s) : l'ennemi s'enfuit, le scarabée repart tranquillement (« pour faire fuir son ennemi ! »)

**Ce qu'on voit.** Même prairie ; le crapaud, vu de dos plus loin à droite, file à grands sauts (deux bonds de plus en plus longs, il sort du cadre) en secouant encore la tête, l'œil plissé ; un reste de vapeur flotte là où il a reçu le jet. Le scarabée au premier plan relâche sa pointe (elle redescend et se range, la braise s'éteint), (déjà retourné après la coupe) s'éloigne vers la gauche d'un pas calme, antennes souples. Sur « ennemi » la **case 1/3 se coche** en haut à gauche (pastille verte avec coche) ; le dernier plan court jusqu'à la fin du segment : le scarabée continue de marcher, la prairie se rassérène (pause de fin d'anecdote).

**Ambiance continue.** Les insectes reviennent un à un (grillons, un bourdon qui passe), la brise reprend, le soir doré est de nouveau paisible ; sifflement de vapeur résiduel qui s'éteint dans la première seconde.

**Intention musicale.** Résolution détendue : le thème pizzicato du début revient, un peu plus rond, avec un petit « ouf » comique (flûte descendante) quand le crapaud bondit ; une note claire et cristalline sur la coche (le « ding » de réussite), puis la musique s'ouvre sur un accord posé qui prépare l'anecdote suivante.

**Événements :**

- 20,74 · 21,09 · `shake` · 1 — le crapaud secoue encore la tête en s'éloignant (deux fois)
- 21,04 · `hop` · 1 — premier bond du crapaud
- 21,29 · `step` · 1 — réception (le sol tremble à peine)
- 21,74 · `hop` · 1 — deuxième bond (« ennemi »)
- 21,99 · `step` · 1 — réception, hors champ
- 22,14 · `ding` · 1 — la case 1/3 se coche
- 22,14 · `pop` · 1 — la pastille apparaît sur la case
