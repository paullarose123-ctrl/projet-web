# Bande-son du segment ALASKA (grenouille des bois) — `sc_grenouille.js`

Segment : 6.71 s → 24.60 s (17.9 s), 10 plans. Les temps ci-dessous sont les temps ABSOLUS du film (voix actuelle) ; ils sont tous calés sur `wt()` / `P.<id>` : si la voix est refaite, relancer `node solo.mjs gre` puis relire `build/events.json` (les instants des événements se déplacent avec les mots, les durées des mouvements restent fixes).

Principe sonore du segment : on commence dehors dans l'air froid de l'automne (vent, grand silence), on s'enfonce dans l'hiver (neige, puis silence feutré), on plonge dans la planche du carnet (moniteur, bips, cellules : le dehors s'efface) puis on revient au printemps, qui doit sonner à l'opposé de l'hiver (eau qui goutte, oiseaux, insectes, vent tiède). Arc musical : curiosité cristalline → froid et suspension → arrêt (grave) → « mais » (relance) → soulagement → joie légère. Aucun bruit sur les coupes (les événements tombent sur des mots ou des images, jamais sur la coupe).

## g1_alaska — 6.71 → 8.86 s (2.15 s) : Alaska, heure bleue d'automne (« En Alaska, la grenouille des bois possède »)

**Ce qu'on voit.** Paysage large : montagnes enneigées, aurore pâle derrière les crêtes, forêt d'épicéas dans la brume, première neige sur la litière de feuilles. Au premier plan, la grenouille des bois (≈ 45 % de la largeur) sur un tronc moussu, qui respire (la gorge bat, une petite buée de souffle sort du museau toutes les 2,2 s) et cligne ; un vrai bouleau nu (tronc blanc à marques sombres, branches fines) à droite ; branche d'épicéa enneigée en haut à droite, herbes sèches en bas, quelques flocons, un vol d'oiseaux très lointain. Les trois cases du carnet et « 1/3 ALASKA » apparaissent (case de la grenouille allumée). Caméra qui glisse lentement vers la droite.

**Ambiance continue.** Soir d'hiver qui s'annonce, très calme : vent léger et froid dans les épicéas (souffle continu bas, avec de petites rafales), un oiseau lointain (pas de chant de printemps : une seule note de mésange, espacée), air immobile et grand. Pas de grillons. Aucun bruit sur la coupe.

**Intention musicale.** Calme, cristallin et froid : kalimba / célesta seul, quelques notes longues sur une nappe très douce ; sentiment d'espace et de curiosité. Aucune tension encore.

**Événements** (temps absolu · type · valeur · ce que ça représente) :

- 6.86 s · `wind` · 2 · rafale de vent froid dans les épicéas (début du plan)
- 7.11 s · `bird` · 0 · un oiseau lointain (type 0) s'envole ou chante, le vol en V tout en haut le suit
- 6.81 s · `pop` · 1 · les trois cases du carnet apparaissent
- 7.01 s · `label` · 1 · l'étiquette « 1/3 ALASKA » se tape

## g1_scan — 8.86 → 11.40 s (2.54 s) : Gros plan et balayage « scanner » (« un pouvoir digne d'un film de science-fiction ! »)

**Ce qu'on voit.** Même endroit, la grenouille plus grande (≈ 78 % de la largeur) sur le tronc. Sur « digne », une ligne cyan descend sur elle ; la partie déjà balayée se couvre d'une grille cyan (silhouette contourée, quadrillage) ; la ligne remonte pendant « science-fiction » en verrouillant la silhouette (bord blanc) ; coins de visée et petites graduations apparaissent. Étiquette « GRENOUILLE DES BOIS » (se tape au début du balayage). La neige, l'aurore et les oiseaux continuent.

**Ambiance continue.** Le vent baisse d'un cran (l'air « retient son souffle »), un léger bourdonnement électronique peut s'installer sous le balayage (c'est le sonorisateur qui décide) ; tout le reste de l'ambiance de g1_alaska continue sans coupure.

**Intention musicale.** Tension douce puis émerveillement : montée de suspense sur « pouvoir », le balayage porte un glissando électronique ou cristallin (flûte + harpe en glissando), résolu en accord ouvert à la fin de « science-fiction » ; ton un peu comique-sérieux, pas inquiétant.

**Événements** (temps absolu · type · valeur · ce que ça représente) :

- 8.86 s · `suspense` · 0.742 · montée de tension qui prépare le balayage (de la coupe à « digne »)
- 9.60 s · `scan` · 1.506 · balayage « scanner » : la ligne descend sur « digne », remonte pendant « science-fiction » (durée 1,5 s)
- 9.65 s · `label` · 1 · l'étiquette « GRENOUILLE DES BOIS » se tape

## g2_gel — 11.40 → 13.45 s (2.04 s) : L'hiver : le corps gèle (« Pendant l'hiver, son corps gèle, »)

**Ce qu'on voit.** Nuit bleue d'hiver, neige serrée, la grenouille tapie dans un creux de litière de feuilles à l'abri d'un rocher et d'épicéas. À partir de « l'hiver », le givre gagne son corps (pattes et dos d'abord, puis tout le corps, la tête en dernier) ; la gorge se fige, la posture se ramasse et la peau devient gris-bleu. Thermomètre à droite qui descend de 0 à -15 °C. Étiquette « ≈ 2/3 DE L'EAU EN GLACE » sur « corps ». Rafale de neige au début, branches enneigées au premier plan.

**Ambiance continue.** Hiver profond : vent d'hiver régulier avec une rafale au début, neige qui tombe (grain très fin, silence feutré), petits craquements très doux de glace sur la fin ; plus aucun oiseau. L'ambiance se refroidit et s'assourdit à mesure que le givre gagne.

**Intention musicale.** Froid et suspendu : la nappe cristalline descend, les notes du kalimba s'espacent ; sensation de figement progressif (pas d'alarme).

**Événements** (temps absolu · type · valeur · ce que ça représente) :

- 11.40 s · `snowfall` · 2.045 · début de la neige serrée (durée du plan)
- 11.50 s · `wind` · 2 · rafale au début
- 11.60 s · `frost` · 1.824 · le givre gagne le corps (de « Pendant » à la fin de « gèle »)
- 12.89 s · `label` · 1 · l'étiquette « ≈ 2/3 DE L'EAU EN GLACE » se tape
- 13.12 s · `crack` · 0.3 · léger craquement de la glace qui se forme (force 0,3)

## g2_coeur — 13.45 → 15.03 s (1.58 s) : Planche du carnet : le cœur s'arrête (« son coeur s'arrête de battre »)

**Ce qu'on voit.** Planche sombre à quadrillage. En haut, un électrocardiogramme dont les battements, très serrés dans le passé (à gauche), s'espacent de plus en plus ; au milieu le cœur de grenouille qui bat de plus en plus lentement ; une horloge « DEPUIS LE GEL » compte de 0 à 20 H pendant le plan (c'est un film accéléré : le vrai arrêt prend ≈ 20 h). Sur « battre » le cœur devient gris, givré, le tracé se met à plat (rouge) et « COEUR : 0 BATTEMENT » apparaît. En bas, coupe du sol : neige, litière, la grenouille gelée dans sa poche, avec un trait pointillé jusqu'au cœur.

**Ambiance continue.** Un plongeon feutré : on quitte le dehors (le vent s'efface presque complètement sous la planche, il peut rester un souffle très étouffé) ; silence de laboratoire avec le seul moniteur : bips et battements. À l'arrêt, le son du moniteur devient continu (ligne plate).

**Intention musicale.** Tension qui descend : le grave s'installe (nappe grave, cordes pincées espacées), une note tenue qui s'assombrit à l'arrêt. C'est le moment le plus dramatique du segment, sans pathos : sobre, presque scientifique.

**Événements** (temps absolu · type · valeur · ce que ça représente) :

- 13.45 s · `zoom` · 0.5 · plongeon dans la planche du carnet (début du plan)
- 13.76 s · `heartbeat` · 1 · un battement du cœur (« toum-doum »), fort puis un peu plus faible ; seulement les battements visibles à l'écran dans ce plan (2) ; les précédents ont eu lieu avant la coupe
- 13.76 s · `beep` · 1 · bip du moniteur sur chaque battement (le tracé a un pic R à ces instants)
- 14.22 s · `heartbeat` · 0.8 · un battement du cœur (« toum-doum »), fort puis un peu plus faible ; seulement les battements visibles à l'écran dans ce plan (2) ; les précédents ont eu lieu avant la coupe
- 14.22 s · `beep` · 1 · bip du moniteur sur chaque battement (le tracé a un pic R à ces instants)
- 14.51 s · `flatline` · 0.522 · le moniteur passe à plat (jusqu'à la coupe)
- 14.36 s · `label` · 1 · l'étiquette « COEUR : 0 BATTEMENT » se tape

## g2_souffle — 15.03 → 16.57 s (1.54 s) : La respiration s'arrête (« et elle cesse de respirer. »)

**Ce qu'on voit.** Retour dehors, même creux sous la neige : la grenouille gelée (givre bleuté, œil terne) bien visible, neige qui tombe, scintillements du givre, caméra qui recule légèrement. En haut à droite, une fenêtre « POUMONS » : les poumons se gonflent une fois puis se vident et grisonnent sur « cesse » ; l'étiquette « RESPIRATION : 0 » se tape sur « respirer ». Ensuite plus rien ne bouge sur la grenouille : seuls la neige, les scintillements et la caméra vivent.

**Ambiance continue.** Même hiver que g2_gel mais plus feutré encore : vent très doux, neige, quelques craquements de givre. Le silence qui s'installe est voulu.

**Intention musicale.** Suspendu, presque vide : la note grave de g2_coeur se prolonge ; une dernière respiration de la musique (nappe qui retombe) sur « cesse », puis un vide tendu sur « respirer ».

**Événements** (temps absolu · type · valeur · ce que ça représente) :

- 15.03 s · `wind` · 1.5 · souffle de vent très doux
- 15.41 s · `suspense` · 0.982 · tension sur « cesse de respirer » (de « cesse » à la fin de « respirer »)
- 15.74 s · `label` · 1 · l'étiquette « RESPIRATION : 0 » se tape

## g3_sucre — 16.57 → 19.02 s (2.45 s) : Planche du carnet : le sucre protège les cellules (« Mais grâce à un sucre qui protège ses cellules, »)

**Ce qu'on voit.** Planche sombre. Les cellules (membrane, noyau violet) se ratatinent sous les aiguilles de glace cyan pendant « Mais grâce à un » ; sur « sucre » une grosse molécule de glucose dorée (hexagone, atomes rouges) apparaît en haut avec un éclat et une lueur ; sur « protège » des molécules dorées viennent enrober les cellules (liseré doré), qui reprennent leur forme ; les cristaux de glace rebondissent sur l'enrobage (étincelles de contact). Étiquette « SUCRE : GLUCOSE ». En bas la coupe du sol avec la grenouille gelée.

**Ambiance continue.** On reste dans le silence de la planche mais l'ambiance revient légèrement : un souffle d'air très doux, un tintement de glace microscopique (cristaux) ; rien de vivant dehors.

**Intention musicale.** Relance et espoir : un « mais » musical — la nappe grave se lève, le kalimba reprend une mélodie simple qui monte ; son scintillant et chaud à l'arrivée du glucose, puis accord chaleureux à « cellules ».

**Événements** (temps absolu · type · valeur · ce que ça représente) :

- 16.57 s · `zoom` · 0.6 · plongeon dans les cellules (début du plan)
- 17.36 s · `label` · 1 · l'étiquette « SUCRE : GLUCOSE » se tape (sur « sucre »)
- 17.36 s · `glow` · 1.122 · lueur dorée du sucre qui enveloppe les cellules (de « sucre » à « cellules »)
- 18.08 s · `sparkle` · 1 · scintillement d'un cristal de glace qui rebondit sur l'enrobage (×2)
- 18.48 s · `sparkle` · 1 · scintillement d'un cristal de glace qui rebondit sur l'enrobage (×2)

## g3_survit — 19.02 → 20.02 s (1.00 s) : Elle survit (« elle survit ! »)

**Ce qu'on voit.** Retour dehors, nuit bleue : la grenouille gelée sous la neige, une lueur ambre pulse autour d'elle dès le début du plan (≈ 1,7 Hz, deux halos, plus forte sur « survit »), son givre scintille (points ambre), la caméra avance de ≈ 12 px sur la seconde ; sur « survit » une grande pastille verte ✓ apparaît en rebond et l'étiquette « 18 SUR 18 SURVIVENT » se tape. Neige qui tombe, scintillements, légère caméra.

**Ambiance continue.** Le calme de l'hiver mais plus chaleureux : le vent retombe, une note d'espoir dans l'air ; on peut laisser un son très doux de glace qui chante.

**Intention musicale.** Soulagement : accord majeur lumineux sur « survit » (reveal), ding de la pastille, petite montée de harpe ; l'émotion de l'anecdote.

**Événements** (temps absolu · type · valeur · ce que ça représente) :

- 19.34 s · `ding` · 1 · la pastille ✓ apparaît
- 19.34 s · `reveal` · 1 · accord de révélation (survie)
- 19.39 s · `label` · 1 · l'étiquette « 18 SUR 18 SURVIVENT » se tape

## g4_degel — 20.02 → 21.93 s (1.91 s) : Le printemps, le dégel (« Au printemps, elle dégèle »)

**Ce qu'on voit.** Même creux, matin clair de printemps (lumière à droite, rayons de soleil, ciel bleu, forêt verte). La neige recule, laissant la terre brune et des flaques ; des gouttes de fonte tombent de la pointe d'une branche d'épicéa (premier plan, en bas à droite) dans une mare dégagée en bas à gauche (anneaux clairs à chaque contact) ; des gouttes glissent sur la glace de la grenouille ; la glace se craquelle et fond, la peau brune reparaît (le dos d'abord, la tête en dernier), l'œil reste encore terne. Étiquette « GELÉE ≈ 6 MOIS » sur « printemps ». Oiseaux qui passent, pollen, scintillements de l'eau.

**Ambiance continue.** Le dégel : ruissellement d'eau de fonte, gouttes régulières qui claquent sur la flaque (une par goutte visible), craquements de glace, premiers chants d'oiseaux (ouverture douce), vent tiède. Très net contraste avec l'hiver.

**Intention musicale.** Le soleil se lève : la nappe devient chaude et monte, les cordes pincées et le kalimba reprennent un motif ; éveil, lumière, légèreté qui s'installe progressivement.

**Événements** (temps absolu · type · valeur · ce que ça représente) :

- 20.02 s · `bird` · 1 · un oiseau de printemps (type 1) au début
- 20.20 s · `label` · 1 · l'étiquette « GELÉE ≈ 6 MOIS » se tape
- 20.20 s · `thaw` · 1.607 · filet d'eau de la fonte (de « printemps » à la fin de « dégèle »)
- 20.48 s · `drip` · 0.6 · une goutte frappe la mare (×4, toutes les 0,4 s) : un renflement s'accroche à la pointe de la branche d'épicéa du premier plan bas droit, la goutte tombe 0,37 s (sombre à liseré, traînée claire) puis deux anneaux clairs s'ouvrent sur le reflet bleu de la mare et quelques gouttelettes jaillissent ; l'instant de l'événement est celui du contact
- 20.88 s · `drip` · 0.6 · une goutte frappe la mare (×4, toutes les 0,4 s) : un renflement s'accroche à la pointe de la branche d'épicéa du premier plan bas droit, la goutte tombe 0,37 s (sombre à liseré, traînée claire) puis deux anneaux clairs s'ouvrent sur le reflet bleu de la mare et quelques gouttelettes jaillissent ; l'instant de l'événement est celui du contact
- 21.28 s · `drip` · 0.6 · une goutte frappe la mare (×4, toutes les 0,4 s) : un renflement s'accroche à la pointe de la branche d'épicéa du premier plan bas droit, la goutte tombe 0,37 s (sombre à liseré, traînée claire) puis deux anneaux clairs s'ouvrent sur le reflet bleu de la mare et quelques gouttelettes jaillissent ; l'instant de l'événement est celui du contact
- 21.68 s · `drip` · 0.6 · une goutte frappe la mare (×4, toutes les 0,4 s) : un renflement s'accroche à la pointe de la branche d'épicéa du premier plan bas droit, la goutte tombe 0,37 s (sombre à liseré, traînée claire) puis deux anneaux clairs s'ouvrent sur le reflet bleu de la mare et quelques gouttelettes jaillissent ; l'instant de l'événement est celui du contact
- 21.38 s · `crack` · 0.6 · la glace de la grenouille se fissure (×2, force 0,6 puis 0,8)
- 21.68 s · `crack` · 0.8 · la glace de la grenouille se fissure (×2, force 0,6 puis 0,8)
- 21.81 s · `sparkle` · 1 · scintillement de la dernière glace qui fond

## g4_coeur — 21.93 → 22.73 s (0.80 s) : Planche du carnet : le cœur repart en premier (« et reprend sa vie »)

**Ce qu'on voit.** Retour à la planche : le cœur est encore gris et givré, le tracé plat (rouge). Sur « et » il repart : un anneau doré à chaque battement, le tracé vert reprend, le compteur BATTEMENTS passe de 0 à 1 puis 2 ; dans la coupe du bas, la grenouille du carnet reprend ses couleurs (le brun revient, l'œil se rallume). Étiquette « DÉGEL : LE COEUR REPART EN PREMIER ». La planche ne dure que 0,8 s : le redémarrage est montré en deux battements espacés de 0,4 s.

**Ambiance continue.** Un seul son compte : le moniteur qui repart, battement après battement ; le dehors est coupé. Un souffle chaud très discret peut revenir sur la fin.

**Intention musicale.** Relance, soulagement fort : la nappe grave se redresse en accord chaud, le premier battement ramène le motif du kalimba ; mouvement ascendant qui mène au saut.

**Événements** (temps absolu · type · valeur · ce que ça représente) :

- 21.95 s · `label` · 1 · l'étiquette « DÉGEL : LE COEUR REPART EN PREMIER » se tape
- 22.08 s · `heartbeat` · 1 · un battement du cœur qui repart (×2 : le premier fort, le second un peu plus faible)
- 22.08 s · `beep` · 1 · bip du moniteur sur chaque battement
- 22.48 s · `heartbeat` · 0.7 · un battement du cœur qui repart (×2 : le premier fort, le second un peu plus faible)
- 22.48 s · `beep` · 1 · bip du moniteur sur chaque battement
- 22.08 s · `glow` · 0.6 · lueur dorée du redémarrage (premier battement)

## g4_saut — 22.73 → 24.60 s (1.87 s) : La grenouille saute dans la prairie (« comme si de rien n'était ! »)

**Ce qu'on voit.** Prairie fleurie de printemps : herbe neuve, crocus et saxifrages, bouleaux en feuilles, papillons (jaune et blanc), rayons de soleil, pollen. La grenouille (brune, l'œil d'or qui s'est rallumé) finit de se réveiller (l'œil, la gorge qui repart), s'accroupit, saute sur « rien » (anticipation, impulsion, vol, réception avec écrasement) en avançant de ≈ 86 px, la caméra la suit en partie ; poussière d'herbe à la réception ; elle se pose, respire, cligne, puis gonfle deux fois la gorge (coassement). À la fin de « n'était » la case 1/3 se coche : pastille verte plus grande (rayon 7) qui rebondit, avec un halo vert qui s'étend sur 0,35 s autour de la case. Le dernier plan court jusqu'au début de l'anecdote suivante (0,5 s de calme : respiration, papillons, herbe).

**Ambiance continue.** Printemps plein : chants d'oiseaux variés (merle, mésange, fauvette), bourdonnement d'insectes, ruisseau de fonte au loin, vent tiède dans l'herbe et dans les feuilles des bouleaux. À l'opposé du début : l'air est plein de vie.

**Intention musicale.** Joie légère, comique tendre : le motif du kalimba en majeur, pizzicati rebondissants au saut, flûte sur le coassement ; petit accord de résolution sur la case cochée ; la musique se pose à la fin pour laisser la place à la transition vers le Mexique (changement de couleur : plus chaude).

**Événements** (temps absolu · type · valeur · ce que ça représente) :

- 22.79 s · `bird` · 2 · un oiseau (type 2) au début
- 23.25 s · `whoosh` · 0.35 · la grenouille s'élance (décollage du saut)
- 23.78 s · `hop` · 1 · réception sur l'herbe
- 24.08 s · `ribbit` · 1 · coassement : deux gonflements de la gorge (hauteurs 1,0 puis 1,1)
- 24.30 s · `ribbit` · 1.1 · coassement : deux gonflements de la gorge (hauteurs 1,0 puis 1,1)
- 24.02 s · `ding` · 1 · la case 1/3 du carnet est cochée
- 24.05 s · `pop` · 1 · la pastille ✓ apparaît dans la case

## Notes pour le sonorisateur

- Types utilisés (tous du vocabulaire du GUIDE) : pop, label, wind, bird, suspense, scan, snowfall, frost, crack, zoom, heartbeat, beep, flatline, glow, sparkle, ding, reveal, thaw, drip, whoosh, hop, ribbit. Aucun type ajouté.
- `heartbeat` : un par battement visible ; leur nombre et leurs instants collent à l'image (g2_coeur : 2 ; g4_coeur : 2). Le tracé de l'électrocardiogramme a son pic R exactement à ces instants. Les battements d'avant la coupe de g2_coeur (le tracé en montre une dizaine, de plus en plus serrés vers le passé) n'ont pas d'événement : la planche est un film accéléré (horloge 0 → 20 H).
- `drip` : 4 gouttes dans g4_degel (20.48, 20.88, 21.28, 21.68 s), chacune visible : renflement à la pointe de la branche, chute de 0,37 s, anneaux sur la mare à l'instant de l'événement (déplacé de +0,16 s par rapport à la première version pour que la première goutte se forme à l'écran).
- `flatline` démarre 0,1 s après « battre » et dure jusqu'à la coupe de g2_coeur (0,5 s) ; le silence qui suit dans g2_souffle est voulu.
- `suspense` de g1_scan (de la coupe à « digne ») prépare `scan` (durée 1,5 s) ; `reveal` de g3_survit tombe en même temps que `ding`.
- Les poumons de g2_souffle se gonflent une fois puis s'arrêtent sur « cesse » : rien n'est déclaré en événement (pas de type adapté), le `suspense` de ce plan l'accompagne.
