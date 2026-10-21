# Bande-son du segment MEXIQUE (lézard à cornes) — `sc_lezard.js`

Segment : 24.60 s → 40.80 s (16.2 s), 7 plans. Les temps ci-dessous sont les temps ABSOLUS du film avec la voix actuelle (CML-TTS 928) ; tous sont calés sur `wt()` / `P.<id>` : si la voix est refaite, relancer `node solo.mjs lez` puis relire `build/events.json` (les instants se déplacent avec les mots). Aucun bruit sur les coupes.

Principe sonore : on passe du froid de l'Alaska à la chaleur sèche du désert au coucher du soleil. Ambiance continue de tout le segment : vent chaud et faible (souffle bas, petites rafales), grillons du crépuscule qui s'installent (discrets au début, plus présents à partir de l'arrivée du coyote), très loin un vautour (cri rare, à l'arrière-plan dans l1_desert, l2 et l4_gout), petit bruissement de sable et de poussière. Pas de neige, pas de ruisseau, pas d'oiseaux de printemps. Arc musical : curiosité chaude (petite guitare pincée + shaker) → tension sèche (l2) → gag (l3, l4) → sourire à la fin. La musique doit laisser la place aux bruits d'action (jet, claquement mouillé, couinement).

## l1_desert — 24.60 → 25.89 s (1.29 s) : le désert de Sonora, large (« Au Mexique, certains lézards à »)

**Ce qu'on voit.** Désert au coucher du soleil : mesas violettes, soleil bas dans une brume dorée, saguaros (un grand au premier plan), ocotillo, agave, boule d'herbe qui roule, vautour qui plane en haut à droite, air qui tremble à l'horizon, poussière dorée. Au centre, très petit et camouflé sur le sable, le lézard à cornes, qui trottine par à-coups ; les quatre coins d'un viseur de naturaliste se referment sur lui à partir de « Mexique » et sont refermés à la coupe. Les cases du carnet (la case 2/3 allumée) et « 2/3 MEXIQUE » apparaissent. Caméra qui glisse lentement.

**Ambiance continue.** Vent chaud et faible, grillons au loin (juste commencés), vautour très lointain, roulement léger de la boule d'herbe.

**Intention musicale.** Entrée chaude après l'Alaska : première note de petite guitare pincée, shaker doux, pulsation lente ; curiosité.

**Événements** (temps absolu · type · valeur · ce que ça représente) :

- 24.70 s · `wind` · 3 · souffle de vent chaud (début)
- 24.74 s · `pop` · – · les cases du carnet apparaissent
- 25.05 s · `label` · – · « 2/3 MEXIQUE » se tape
- 25.00 s · `step` · – · premiers petits pas du lézard (à peine audibles : il est loin)
- 25.30 s · `bird` · 1 · un oiseau du désert / cri lointain du vautour
- 25.63 s · `blip` · – · le viseur se verrouille sur le lézard (juste avant « lézards »)
- 25.85 s · `step` · – · deuxième à-coup du lézard, juste avant la coupe

## l1_lezard — 25.89 → 28.63 s (2.74 s) : gros plan sur le lézard camouflé (« à cornes possèdent une arme complètement improbable. »)

**Ce qu'on voit.** Le lézard à cornes, de profil, plein cadre sur le gravier : corps plat à taches sable et rouille, couronne de cornes, frange d'épines, il marche par à-coups (trois départs brefs, arrêts figés, il respire et cligne). Étiquette « LÉZARD À CORNES » sur « cornes ». Sur « improbable », un éclat de lumière sur les cornes et un « !? » au-dessus de la tête. Le camouflage se dissipe peu à peu (il devient plus net). Caméra qui le suit.

**Ambiance continue.** Même désert, plus proche : vent chaud, grillons un peu plus présents, bruits fins de gravier sous les pattes.

**Intention musicale.** Gag discret : notes pincées en pizzicato sur chaque départ du lézard ; sur « improbable », petit accord brillant (révélation) qui s'ouvre.

**Événements** :

- 25.94 s · `label` · – · « LÉZARD À CORNES » se tape
- 26.34 s · `step` · – · premier départ (pas de lézard sur gravier, très léger)
- 26.67 s · `step` · – · fin du premier à-coup
- 27.32 s · `step` · – · deuxième départ
- 27.57 s · `step` · – · fin du deuxième à-coup
- 28.24 s · `step` · – · troisième départ
- 28.51 s · `step` · – · fin du troisième à-coup
- 27.74 s · `reveal` · – · l'éclat sur les cornes (« improbable »)
- 27.77 s · `blip` · – · le « !? » apparaît

## l2_menace — 28.63 → 30.42 s (1.79 s) : le coyote arrive (« Lorsqu'ils sont menacés, »)

**Ce qu'on voit.** Le coyote entre par la droite : il trotte, puis rôde (la tête baissée), puis s'arrête à quelques pas et flaire, la truffe au sol. À gauche, le lézard se fige, s'aplatit en galette (camouflage), puis se gonfle d'un coup ; le sinus de son œil commence à enfler. Poussière aux pattes du coyote. Étiquette rouge « DERNIER RECOURS » sur « menacés ». Caméra fixe.

**Ambiance continue.** Vent chaud, grillons, silence tendu qui s'installe à mesure que le coyote approche.

**Intention musicale.** Tension sèche : la guitare s'arrête, il reste un shaker très léger puis une note grave tenue qui monte (suspense) jusqu'au plan suivant.

**Événements** :

- 28.68 s · `wind` · 2 · rafale chaude (début)
- 28.83 s, 29.05 s, 29.28 s, 29.51 s · `step` · – · les quatre foulées du trot du coyote (sable)
- 29.63 s · `suspense` · 0.79 · la tension monte jusqu'à la coupe vers l2_jet
- 29.71 s · `label` · – · « DERNIER RECOURS » se tape
- 29.92 s · `sniff` · – · le coyote flaire (reniflement)

## l2_jet — 30.42 → 33.23 s (2.81 s) : ralenti, le jet de sang (« ils peuvent projeter du sang directement depuis leurs yeux ! »)

**Ce qu'on voit.** Même lieu, même sol, caméra fixe. Le lézard (galette large, couronne de cornes, épines sur les flancs) est face au coyote qui flaire. Depuis « ils », le sinus de son œil gonfle et bat (de plus en plus vite : bosse rouge, veines). À 32.08 s (sur « depuis ») le jet part du coin de l'œil, en ralenti, et frappe le museau du coyote SUR « yeux » (32.58 s) : éclaboussure, filets rouges qui glissent sur le museau, le coyote sursaute (oreilles en arrière, queue rentrée). Après l'impact le lézard se dégonfle un peu. Étiquette « SANG DES SINUS DE L'OEIL » sur « sang ».

**Ambiance continue.** Le vent et les grillons baissent d'un cran pendant la montée, puis reviennent ; vautour très lointain.

**Intention musicale.** Montée de tension sur toute la première partie (pulsation de plus en plus rapide, comme le battement du sinus), souffle retenu juste avant le jet, puis un coup sec (impact) et un silence d'un instant ; la musique ne reprend qu'avec le plan suivant.

**Événements** :

- 30.57 s · `suspense` · 1.32 · montée de tension qui accompagne le gonflement des yeux (jusqu'à 31.89 s)
- 31.32 s · `label` · – · « SANG DES SINUS DE L'OEIL » se tape
- 31.88 s · `whoosh` · 0.2 · petit souffle avant le jet (le lézard se ramasse)
- 32.08 s · `squirt` · 0.5 · le jet part (durée jusqu'à l'impact)
- 32.58 s · `splat` · – · impact mouillé sur le museau, SUR « yeux »
- 32.60 s · `yelp` · – · couinement du coyote
- 33.08 s · `shake` · – · le coyote secoue la tête

## l3_metre — 33.23 → 35.16 s (1.94 s) : la règle (« Ce jet peut atteindre presque un mètre ! »)

**Ce qu'on voit.** Très gros plan à hauteur du sable : un mètre ruban jaune se déroule vite vers la droite (1 m = 520 px, bien plus large que le cadre) ; le lézard (≈ 80 px) est au zéro. Il se gonfle puis lance : un gros jet rouge épais (4 px), en ralenti, longe la règle en arc, se brise en grosses gouttes rondes qui scintillent ; la caméra suit la tête du jet de gauche à droite jusqu'à « 1 M », où il retombe SUR « mètre » (34.55 s) : éclaboussure sur le sable, le chiffre « 1 M » s'allume en jaune. Graduations : 0, 25, 50 CM, 75, 1 M. Étiquette « JUSQU'À ≈ 1 M ».

**Ambiance continue.** Vent chaud faible, grillons, sable ; le plan est proche du sol : léger bruissement de grains.

**Intention musicale.** Comique, précis : le déroulement du ruban rythme un petit motif ascendant (une note par graduation) ; le jet est un glissando rapide ; une note brillante tenue sur l'impact à « 1 M ».

**Événements** :

- 33.33 s · `ruler` · 21 · la règle se déroule (21 graduations)
- 33.91 s · `squirt` · 0.64 · le jet part (ralenti ; il touche le sable à 34.55 s)
- 34.19 s · `label` · – · « JUSQU'À ≈ 1 M » se tape
- 34.55 s · `splat` · – · le jet touche le sable à presque 1 m, SUR « mètre »

## l4_gout — 35.16 → 38.80 s (3.63 s) : la grimace du coyote (« Et le plus fou ? Ce sang a un goût particulièrement désagréable »)

**Ce qu'on voit.** Gros plan sur le coyote (profil, museau à gauche, sang sur le museau). La grimace monte avec la voix : il se lèche le museau sur « fou ? » (langue qui passe), s'étonne sur « Ce sang » (yeux qui se plissent peu à peu), secoue vivement la tête sur « goût », sort la langue sur « particulièrement » (de la bave rougie goutte, deux gouttes visibles qui tombent et éclaboussent le sable), puis grimace à fond sur « désagréable » (yeux fermés, plis sur le museau, langue pendante). Mot « BEURK » en rouge au-dessus du museau, sur « désagréable » ; la tête reste secouée jusqu'à la fin. Le sang du museau s'estompe. Caméra fixe, soleil bas, vautour au loin.

**Ambiance continue.** Même désert ; le vent tombe presque pendant la grimace ; grillons.

**Intention musicale.** Comique : une note de trombone ou de cordes qui glisse vers le bas sur « désagréable » (« wah-wah »), suivie d'un silence amusé ; avant, quelques notes de guitare hésitantes.

**Événements** :

- 35.78 s · `sniff` · – · il se lèche et renifle (« fou ? »)
- 36.92 s · `drip` · 0.5 · première goutte de bave : elle touche le sable (elle se forme à 36.51 s et tombe ensuite)
- 37.09 s · `shake` · – · coup de tête sec sur « goût »
- 37.78 s · `drip` · 0.8 · deuxième goutte, plus grosse, qui touche le sable
- 37.98 s · `label` · – · « BEURK » apparaît
- 38.02 s · `yelp` · – · gémissement dégoûté du coyote, sur « désagréable »

## l4_repart — 38.80 → 40.80 s (2.01 s) : le coyote s'enfuit, le lézard repart (« pour certains de leurs prédateurs ! »)

**Ce qu'on voit.** Le coyote file en trottant vers la gauche, au loin et petit, en secouant encore la tête, avec de la poussière aux pattes ; une boule d'herbe roule derrière. Au premier plan, le lézard se dégonfle, puis repart tranquillement par à-coups. Étiquette rouge « CIBLE : COYOTES, RENARDS, CHIENS » sur « certains » ; la case 2/3 du carnet se coche (✓) sur la fin de « prédateurs ». Caméra fixe, dernier plan du segment : le dernier instant est une respiration avant l'Afrique.

**Ambiance continue.** Vent chaud qui retombe, grillons, un oiseau ; le désert se calme, la lumière rougit.

**Intention musicale.** Détente : la guitare reprend un petit motif joyeux (sourire), qui se résout en accord ouvert à la coche ✓ ; un temps de silence avant la prochaine zone (kalimba de la savane).

**Événements** :

- 38.85 s · `whoosh` · 0.8 · le coyote détale
- 38.88 s · `label` · – · « CIBLE : COYOTES, RENARDS, CHIENS » se tape
- 39.45 s · `step` · – · premier pas du lézard (départ)
- 40.00 s · `bird` · 2 · oiseau du désert
- 40.08 s · `ding` · – · la case 2/3 se coche (✓)
- 40.40 s · `step` · – · deuxième départ du lézard
