# Bande-son du segment AMAZONIE (anguille électrique) — `sc_anguille.js`

Segment : 37,50 s → 50,61 s (13,1 s), 7 plans. Les temps ci-dessous sont les temps ABSOLUS du film avec la voix actuelle (`build/timeline.js`) ; ils sont tous calés sur `wt()` / `wt1()`. Si la voix est refaite, relancer `node solo.mjs ang` puis `node valide.mjs ang` et relire la liste des événements (`events.json` est régénéré par `rendu.sh`).

Principe sonore : une rivière amazonienne au crépuscule, très calme au-dessus de l'eau (insectes, oiseaux qui rentrent), puis le monde étouffé et trouble de dessous, où l'électricité arrive par à-coups très brefs. Une décharge d'anguille = un claquement sec et aigu (« tchk-tchk-tchk », quelques millisecondes), suivi d'un grésillement et d'un bourdonnement qui s'éteint, avec de l'eau qui amortit tout : jamais un orage ni un éclair d'orage, plutôt une série de petits arcs électriques. L'événement `zap` porte l'intensité dans `v` (0,5 à 2) : plus `v` est grand, plus la décharge est longue et brillante (v = 2 : la décharge maximale, 0,6 s environ, avec le halo qui éclaire toute l'eau). Pas de bruit sur les coupes.

Deux gestes sonores à retenir pour le montage : (1) le compteur « 860 V » du plan 3 monte par crans de plus en plus aigus, chaque cran suivi d'un `zap` ; (2) la planche du plan 4 est un décor d'interface (blips, pops) sans ambiance d'eau.

## e1_surface — 37,50 → 38,86 s (1,36 s) : la rivière au crépuscule vue en coupe (« En Amazonie, une espèce »)

**Ce qu'on voit.** Une coupe de la rivière : au-dessus de la ligne d'eau, un ciel de crépuscule violet, rose et orange, trois nuages qui s'étirent, le soleil bas qui se couche derrière la lisière de forêt (houppiers arrondis, deux palmiers en silhouette) ; la surface scintille (filet de lumière chaude, nénuphars posés, une fleur rouge) ; sous la surface, l'eau trouble vert-bleu où descendent des rayons de lumière dorée, des racines de jacinthes d'eau qui pendent, de grands troncs de forêt inondée qui se fondent dans l'eau, des herbes aquatiques au fond, des bulles, de fines particules. Un banc de petits poissons argentés, et une longue ombre sombre (l'anguille, vue de loin) qui traverse lentement la moitié basse du cadre de gauche à droite. Les trois cases du carnet apparaissent en haut à gauche (la troisième s'allume, les deux premières sont cochées), puis l'étiquette « 3/3 AMAZONIE » se tape. Un vol d'oiseaux lointains traverse le ciel. Caméra : lente dérive vers la droite.

**Ambiance continue.** Deux couches sans coupure : au-dessus, un soir tropical calme (insectes aigus, grenouilles lointaines, petits cris d'oiseaux qui rentrent, léger clapotis de la surface) ; sous l'eau, un fond sourd et feutré (remous lent, bulles qui montent). Les deux couches se mélangent, comme une oreille au ras de l'eau.

**Intention musicale.** Calme, un peu mystérieux et lumineux : une nappe douce et chaude, quelques notes de kalimba espacées qui donnent le paysage. Rien de menaçant encore : on découvre un lieu.

**Événements** (temps absolu · type · valeur · ce que ça représente) :

- 37,58 s · `pop` · 1 · les trois cases du carnet apparaissent
- 37,59 s · `bubbles` · 1,2 · bulles qui montent sous l'eau (durée 1,2 s)
- 37,62 s · `bird` · 1 · un oiseau dans le ciel (le vol lointain)
- 37,80 s · `label` · 1 · l'étiquette « 3/3 AMAZONIE » se tape
- 38,40 s · `bird` · 2 · un second oiseau (autre type)
- 38,51 s · `bubbles` · 0,8 · un chapelet de bulles juste avant la coupe

## e1_anguille — 38,86 → 41,07 s (2,21 s) : l'anguille nage (« d'anguille électrique peut produire des décharges allant »)

**Ce qu'on voit.** Gros plan sous l'eau, sur l'anguille électrique : corps long et cylindrique brun-olive sombre, gorge et ventre jaune-orangé, tête aplatie à petit œil, longue nageoire anale à rayons orange qui ondule le long du ventre. Elle traverse le cadre en diagonale (de bas en haut, vers la droite) en ondulant d'un bout à l'autre, le décor défile derrière elle (troncs inondés, rayons, bulles) ; un banc de petits tétras se disperse au fond en haut à gauche. Sur « électrique », « décharges » et « allant » : de petits arcs bleu clair crépitent sur le corps et dans l'eau autour (un à trois arcs ramifiés, une forme nouvelle à chaque image), un halo cyan éclaire un instant l'eau.

**Ambiance continue.** Le monde sous-marin, étouffé : remous doux de la nage (un glissement continu et lent, pas un grand « whoosh »), bulles, petits clapotis lointains. Plus de sons de surface.

**Intention musicale.** Curiosité et tension qui s'installe : la nappe se resserre, une note grave tenue sous l'eau ; chaque crépitement ajoute une petite étincelle sonore (pizzicato cristallin) en écho. Montée douce vers le plan suivant.

**Événements :**

- 38,86 s · `whoosh` · 0,8 · l'anguille entre dans le cadre (glissement lent)
- 38,96 s · `bubbles` · 1 · bulles autour de la tête
- 39,41 s · `zap` · 0,6 · premier crépitement, sur « électrique » (petits arcs)
- 40,57 s · `zap` · 1,1 · décharge nette, sur « décharges » (arcs ramifiés et halo)
- 40,99 s · `zap` · 0,8 · crépitement sur « allant »

## e1_volts — 41,07 → 42,89 s (1,83 s) : jusqu'à 860 volts (« jusqu'à 860 volts ! »)

**Ce qu'on voit.** L'anguille se tend en arc au centre du cadre, la tête vers la droite, et décharge en continu : des arcs électriques ramifiés (cyan, blanc, avec des étincelles jaunes) jaillissent de tout son corps, leur forme change à chaque image, l'eau entière s'illumine en cyan à chaque pulsation (le halo grandit avec la tension). En haut, le compteur numérique « 0 V » démarre sur « jusqu'à » et monte très vite, avec des chiffres qui vibrent, jusqu'à « 860 V » exactement au mot « volts » ; à cet instant : flash blanc du panneau, les chiffres passent au jaune, étincelles qui jaillissent autour du compteur, plus grosse décharge du plan. Ensuite la tension retombe en crépitements. Légère avancée de la caméra (zoom lent sur l'anguille).

**Ambiance continue.** Même monde sous-marin, mais électrisé : un bourdonnement électrique qui monte avec le compteur (50 Hz grave qui prend de la hauteur), grésillement permanent sous les arcs ; il retombe après le point culminant.

**Intention musicale.** Le sommet de l'anecdote : montée en tension sur une gamme ascendante (chaque cran du compteur monte d'une note), le tout culmine sur « volts » par un accord cristallin éclatant (révélation), puis résonance qui s'éteint. Un moment de pur émerveillement, pas de peur.

**Événements :**

- 41,07 s · `suspense` · 1,2 · montée de tension qui accompagne le compteur (1,2 s)
- 41,18 · 41,36 · 41,51 · 41,65 · 41,78 · 41,91 · 42,03 s · `zap` · 0,7 → 1,3 · sept décharges de plus en plus fortes et rapprochées (une par pulsation visible)
- 41,25 · 41,37 · 41,49 · 41,61 · 41,73 · 41,85 · 41,97 · 42,09 · 42,21 s · `counter` · 1 à 9 · les crans du compteur (de plus en plus aigus), le neuvième tombe sur « volts »
- 42,21 s · `zap` · 2 · la décharge maximale, exactement sur « volts » (halo qui éclaire tout le cadre)
- 42,21 s · `ding` · 1 · le compteur se verrouille sur 860 V
- 42,25 s · `reveal` · 1 · accord lumineux de révélation
- 42,41 s · `sparkle` · 1 · étincelles qui retombent autour du compteur

## e2_prise — 42,89 → 46,36 s (3,47 s) : une planche, la comparaison (« C'est presque quatre fois la tension d'une prise électrique française ! »)

**Ce qu'on voit.** Coupe franche sur une planche du carnet : fond bleu nuit quadrillé avec des repères d'angle. À droite, une grande barre électrique cyan (« ANGUILLE : 860 V », des décharges blanches y courent en continu, des étincelles jaillissent à son sommet, avec « 860 V » écrit au-dessus) monte d'un coup au mot « C'est ». À gauche, une barre bleue plus petite (une prise : 230 V) pousse sur « presque » ; sur « quatre » trois blocs fantômes (pointillés bleus) s'empilent un à un au-dessus d'elle, numérotés « ×2 », « ×3 », « ≈ ×4 » (le quatrième est volontairement plus court), et leur sommet rejoint exactement le haut de la barre de l'anguille (un trait en pointillé jaune les relie sur « tension »). L'étiquette « ≈ 4 × UNE PRISE » se tape sur « fois ». Sur « prise », une prise de courant française (plaque blanche, alvéole ronde, deux trous, ergot de terre) se dessine en rebond sur la barre bleue et l'étiquette « PRISE : 230 V » se tape sous elle ; sur « électrique » de petits arcs sortent des trous de la prise ; sur « française » un petit drapeau tricolore se déploie à côté.

**Ambiance continue.** Pas d'eau : le bruit de l'interface du carnet (bruissement de papier, léger souffle électrique sous la grande barre, très discret), un « glissement » de crayon à chaque élément qui se dessine. Les sons de fond du plan précédent s'arrêtent net à la coupe.

**Intention musicale.** Légère et pédagogique : un motif de kalimba en quatre notes qui monte (une par bloc de la pile : « un, deux, trois, quatre »), puis une note plus claire quand la prise apparaît ; la comparaison doit sonner claire et un peu ludique.

**Événements :**

- 42,91 s · `whoosh` · 0,5 · la grande barre jaillit
- 42,94 s · `pop` · 1 · la barre de l'anguille s'installe
- 42,99 s · `label` · 1 · « ANGUILLE : 860 V » se tape
- 43,13 s · `pop` · 1 et `counter` · 1 · la barre bleue (une prise, ×1) apparaît, sur « presque »
- 43,48 s · `pop` + `counter` · 2 · bloc ×2, sur « quatre »
- 43,64 s · `pop` + `counter` · 3 · bloc ×3
- 43,81 s · `pop` + `counter` · 4 · bloc ≈ ×4 (le dernier, plus court), sur « fois »
- 43,85 s · `label` · 1 · « ≈ 4 × UNE PRISE » se tape
- 44,10 s · `blip` · 1 · le trait de comparaison relie les deux sommets, sur « tension »
- 44,61 s · `pop` · 1 · la prise dessinée apparaît en rebond, sur « prise »
- 44,63 s · `label` · 1 · « PRISE : 230 V » se tape
- 44,98 s · `zap` · 0,7 et 45,20 s · `zap` · 0,5 · petits arcs qui sortent des trous de la prise, sur « électrique »
- 45,38 s · `pop` · 1 · le drapeau tricolore se déploie, sur « française »
- 45,68 s · `blip` · 1 · le drapeau est déployé

## e3_chasse — 46,36 → 47,95 s (1,59 s) : l'anguille s'approche d'un banc de tétras (« Elle utilise cette capacité pour »)

**Ce qu'on voit.** Retour sous l'eau (même forêt inondée, rayons de lumière). L'anguille, en diagonale (la tête en haut à droite), avance lentement en rampant vers un petit banc de quatre tétras argentés et rouges qui broutent, de profil, vers le haut à droite du cadre ; elle ne les presse pas, son corps ondule peu. Dans les dernières 0,6 s elle se tend (le corps se redresse, un léger frémissement électrique le long du dos) : l'attaque va venir. Au fond en bas, un autre petit banc lointain. Les cases du carnet restent en haut à gauche.

**Ambiance continue.** Retour du monde sous-marin étouffé : remous très doux, bulles, silence tendu ; aucune musique agressive.

**Intention musicale.** Attente : la nappe grave revient, un seul son tenu qui monte lentement pendant la traque, suspense léger (le sonorisateur place un `suspense` sur la dernière demi-seconde).

**Événements :**

- 46,36 s · `whoosh` · 0,6 · retour sous l'eau, l'anguille glisse dans le cadre
- 46,41 s · `bubbles` · 1 · bulles
- 47,45 s · `suspense` · 0,5 · l'anguille se tend, juste avant « paralyser »

## e3_proie — 47,95 → 49,03 s (1,08 s) : la décharge frappe les tétras (« paralyser ses proies »)

**Ce qu'on voit.** Plan serré : à gauche, l'anguille de trois quarts (la tête vers les poissons) ; à droite, trois tétras en gros plan (jusqu'à 90 px de long). Sur « paralyser » une grande décharge part de l'anguille : l'eau s'illumine, des arcs cyan et blancs rejoignent chacun des trois poissons, qui se raidissent une fraction de seconde (frémissement), puis se retournent ventre en l'air et flottent, figés, en montant doucement sur « ses proies ». Un petit second claquement retardé les fait encore trembler. À la fin du plan, une grande silhouette sombre à l'œil jaune (un caïman) glisse en bas à droite du cadre, annonçant le plan suivant.

**Ambiance continue.** Le monde sous-marin ; après la décharge, un silence qui retombe, bruit d'eau très doux ; les petits bruits de poisson (frétillements) cessent peu à peu.

**Intention musicale.** Une note cristalline sèche au moment du coup, puis un court silence de la musique (le temps de la paralysie), qui reprend en grave sur la silhouette du caïman.

**Événements :**

- 48,09 s · `zap` · 1,6 · la grande décharge, juste après le début de « paralyser »
- 48,24 s · `flop` · 0,6 · le premier tétra se débat (spasme)
- 48,37 s · `flop` · 0,4 · le deuxième
- 48,64 s · `zap` · 0,7 · deuxième claquement plus faible
- 48,79 s · `flop` · 0,3 · le troisième, dernier frémissement avant de se figer

## e3_defense — 49,03 → 50,61 s (1,58 s) : le caïman recule en tremblant, case 3/3 cochée (« et se défendre ! »)

**Ce qu'on voit.** À gauche en bas, l'anguille tendue en diagonale ; en haut à gauche, trois tétras paralysés flottent ventre en l'air. Un gros caïman fonce de la droite, gueule ouverte (dents, gorge rouge) vers l'anguille. Sur « défendre » : décharge maximale, des arcs lient l'anguille au caïman, l'eau s'illumine ; le caïman se fige, tremble de tout le corps (secousses rapides), gueule grande ouverte, puis recule vers la droite et sort du cadre en 1 s environ. Sur la fin du mot (49,96 s) la troisième case du carnet se coche (pastille verte avec ✓). Dernier plan du segment : la respiration de 0,7 s qui suit (l'anguille se détend, les bulles montent, le calme revient) tient jusqu'à la coupe vers la question finale.

**Ambiance continue.** Le monde sous-marin ; l'arrivée du caïman est un grand remous sourd (un animal lourd qui fonce), la décharge un fracas électrique bref, puis le retour au calme étouffé avec quelques bulles.

**Intention musicale.** L'arrivée du caïman fait monter la tension d'un cran (note grave menaçante), la décharge la coupe net, puis la musique se pose en douceur sur la pastille cochée : un accord apaisé qui s'ouvre (« anecdote terminée », respiration avant la finale).

**Événements :**

- 49,03 s · `whoosh` · 1 · le caïman fonce (grand remous)
- 49,08 s · `bubbles` · 1 · bulles dans son sillage
- 49,29 s · `zap` · 2 · la décharge maximale, sur « défendre » (halo qui éclaire tout)
- 49,32 s · `shake` · 1 · le caïman se fige et tremble
- 49,39 s · `whoosh` · 0,7 · il recule d'un coup (remous)
- 49,44 s · `zap` · 1,2 · deuxième décharge
- 49,74 s · `zap` · 0,8 · dernier claquement
- 49,96 s · `ding` · 1 et `pop` · 1 · la case 3/3 se coche (pastille verte)
- 50,01 s · `reveal` · 1 · accord apaisé de fin d'anecdote
- 50,06 s · `bubbles` · 0,6 · quelques bulles dans le calme revenu

## Type d'événement utilisé et rappel

Seuls les types du vocabulaire du brief sont utilisés : `pop`, `bubbles`, `bird`, `label`, `whoosh`, `zap`, `suspense`, `counter`, `ding`, `reveal`, `sparkle`, `blip`, `flop`, `shake`. Aucun type nouveau.
