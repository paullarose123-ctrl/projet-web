# Bande-son du segment HONTE (« la fuite ») — `sc_honte.js`

Segment : 40,88 → 51,34 s (10,46 s), 7 plans. Les temps ci-dessous sont les temps ABSOLUS du film avec la voix actuelle (`build/timeline.js`) ; tout est calé sur `wt()` / `P.<id>` : si la voix est refaite, relancer `node solo.mjs honte` puis relire les événements. Aucun bruit sur les coupes. Les pas (`step`) sont calculés par la même formule que l'image (phase du cycle de marche, un pas à chaque demi-cycle) : ils tombent à l'image où le talon touche le sol.

**Principe sonore.** Tout le segment est au crépuscule, lumières allumées : la honte (commissariat, nuit qui vient, bleu froid) puis la fuite (gare, vapeur, lampes). Musique : après le silence du tampon, un thème de honte (clarinette basse seule, piano bastringue très lent, quelques notes), qui se réveille en jazz-manouche sur le départ du train (contrebasse qui marche, balais, guitare vive), plus malicieux pour le retour de Lustig ; elle reste ouverte sur « arnaque ! » pour enchaîner sur la fin.

**Ambiance continue de tout le segment** (à poser sur les noms de plans) :
- `d1_question` à `d2_talons` : rue de Paris le soir devant le commissariat : voitures lointaines, un klaxon rare, pas de passants sur les pavés, bourdonnement du lampadaire, vent très léger, bruit étouffé de bureau derrière la porte (machine à écrire, voix) ;
- `d3_train` : compartiment : roulement de roues sur les rails (rythme qui s'accélère), grincement de bois, vapeur qui souffle, le quai qui s'éloigne ; dans `d3_argent` le roulement baisse, froissement de papier-monnaie ;
- `d3_gare` et `d3_retour` : halle de gare au crépuscule : réverbération de verrière, vapeur qui s'échappe, annonce lointaine sans paroles, foule, sifflets, chariots, pas de voyageurs.

---

## d1_question — 40,88 → 43,04 s (2,16 s) : devant le commissariat (« Et le plus incroyable ? Le marchand est »)

**Ce qu'on voit.** Façade du commissariat au crépuscule (plaque bleue, lanterne, fenêtres allumées, agent minuscule) : Poisson arrive le long du trottoir, s'arrête devant la porte. Un « ? » géant jaune éclate au-dessus de lui (il tremble) sur « incroyable », puis s'efface ; Poisson lève la main vers la porte… et hésite. Les cases du carnet apparaissent (3 cochées, la 4e allumée), l'étiquette « 4/4 LA FUITE » se tape.
**Événements.** 40,95 `pop` (la case s'allume) ; 41,22 `label` ; 41,38 `step` (le dernier pas avant l'arrêt) ; 41,48 `pop` (le « ? » éclate) et `suspense` (1,1 s : montée de tension qui s'étire jusqu'à l'hésitation).
**Musique.** Silence relatif après le tampon ; le « ? » est ponctué par une note de clarinette basse, la suspension reste ouverte (pas de résolution).

## d2_honte — 43,04 → 44,46 s (1,43 s) : gros plan, tête basse (« tellement honteux qu'il ne porte même pas »)

**Ce qu'on voit.** Gros plan sombre de Poisson, tête baissée, son chapeau serré à deux mains devant lui, la honte lui monte aux joues (elles rougissent progressivement) ; le commissariat flou derrière lui.
**Événements.** 43,19 `heartbeat` (1) ; 43,64 `heartbeat` (0,6) ; 44,09 `heartbeat` (0,6) : trois battements sourds qui ralentissent.
**Musique.** Rien d'autre que les battements et une tenue très grave ; la clarinette basse fait un petit motif descendant sur « honteux ».

## d2_talons — 44,46 → 45,38 s (0,92 s) : il tourne les talons (« plainte ! »)

**Ce qu'on voit.** Poisson s'éloigne de la porte vers la gauche, courbé, chapeau à la main, joues rouges ; en haut de la façade un grand tampon rouge s'écrase : « PAS DE PLAINTE » (l'image tremble), se retire et l'empreinte reste.
**Événements.** 44,63 `stamp` (coup de tampon, calé sur « plainte ») ; pas de Poisson calculés (aucun `step` n'est déclaré dans ce plan : le pas est couvert par l'ambiance de rue).
**Musique.** Un coup de caisse claire avec le tampon, puis la musique repart à vide : une phrase de clarinette qui retombe.

## d3_train — 45,38 → 46,78 s (1,41 s) : la fenêtre du compartiment (« Victor Lustig disparaît »)

**Ce qu'on voit.** Gros plan de la fenêtre d'un wagon éclairé : Lustig, son demi-sourire en coin, regarde défiler le quai ; le train démarre, le décor glisse de plus en plus vite ; coup de sifflet et jet de vapeur au début du plan.
**Événements.** 45,38 `train` (2,6 s : la locomotive qui démarre et prend de la vitesse, sur tout le plan et les deux suivants) ; 45,48 `steam` (1,2 s : jet de vapeur du sifflet).
**Musique.** La contrebasse se met à marcher, le tempo se réveille (balais, guitare) : la fuite.

## d3_argent — 46,78 → 47,65 s (0,86 s) : la mallette ouverte (« avec l'argent… »)

**Ce qu'on voit.** La mallette ouverte sur la banquette, les liasses à la lueur dorée, des pièces d'or qui jaillissent ; les lumières des lampadaires défilent à la fenêtre. 
**Événements.** 47,08 `coins` (0,9 s : froissement de liasses et pièces, sur « l'argent »).
**Musique.** Un « chling » de caisse claire sur l'argent, la contrebasse continue.

## d3_gare — 47,65 → 48,73 s (1,08 s) : le train revient (« avant de revenir à Paris »)

**Ce qu'on voit.** Halle de la gare de Paris au crépuscule ; le train de la fuite revient sur la voie en soufflant ; l'étiquette « PARIS 1925 » se tape.
**Événements.** 47,65 `train` (1,2 s : arrivée, freins) ; 47,70 `steam` (1,0 s : échappement de vapeur) ; 47,95 `label` (l'étiquette se tape).
**Musique.** Le tempo ralentit comme le train ; la guitare relance un motif espiègle.

## d3_retour — 48,73 → 51,34 s (2,61 s) : le dossier se rouvre (« pour tenter exactement la même arnaque ! »)

**Ce qu'on voit.** Quai de la gare : Lustig descend d'un bon pas, s'arrête, son demi-sourire revient ; il rouvre le dossier (étiquette « AFFAIRE LUSTIG » sur « exactement ») et trois enveloppes à cachet de cire s'envolent l'une après l'autre en arc vers le haut. À la fin la 4e case du carnet se coche (4/4).
**Événements.** 49,28 `step` (un pas de Lustig avant l'arrêt) ; 49,29 `label` ; 50,08 / 50,28 / 50,48 `whoosh` (0,7 s chacun : une enveloppe qui s'envole) ; 51,01 `ding` (la case 4/4 se coche).
**Musique.** Reprise malicieuse du thème (accordéon + guitare), qui s'arrête sur une note en suspens à la dernière enveloppe ; le `ding` clair, puis un temps de silence avant `fin` (Lustig s'enfuit au segment suivant).
