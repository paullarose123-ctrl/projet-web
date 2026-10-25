# Bande-son du segment PIEGE (« la vente ») — `sc_piege.js`

Segment : 28,88 → 40,88 s (12,0 s), 7 plans. Les temps ci-dessous sont les temps ABSOLUS du film avec la voix actuelle (`build/timeline.js`) ; tout est calé sur `wt()` / `P.<id>` : si la voix est refaite, relancer `node solo.mjs piege` puis relire les événements (les instants suivent les mots). Aucun bruit sur les coupes.

**Principe sonore.** On reste dans le grand salon doré de l'hôtel (plans 1 à 5) : le piège se referme dans la chaleur et le murmure, la musique est de plus en plus complice (jazz-manouche feutré : guitare pincée « pompe », contrebasse, balais sur la caisse claire) et le suspense monte avec le contrat. Le plan 6 sort de l'hôtel : jour qui tombe au pied de la tour Eiffel, la musique se vide (il ne reste qu'une note de clarinette tenue, un peu fausse) ; le plan 7 la fige sur le coup de tampon rouge, puis silence sec avant le segment suivant.

**Ambiance continue de tout le segment** (à poser sur les noms de plans) :
- `c1_groupe` à `c2_vendue` : salon feutré : murmures de conversation (plusieurs voix, aucune intelligible), tintement de verres et de cristal de loin, tic-tac d'une pendule, crépitement très léger du lustre ; pas de vent. Le murmure baisse (filtré, étouffé) dans les gros plans `c1_marchand` et `c2_affaire` et revient large dans `c2_valise` ;
- `c3_decouverte` à `c4_arnaque` : extérieur, fin d'après-midi au Champ-de-Mars : brise douce dans le fer de la tour (sifflement très grave), pigeons qui s'envolent de loin, foule lointaine, trottoir sablonneux ; la nappe se resserre dans `c4_arnaque` (le monde se tait autour de lui) puis se coupe net à `arnaquer`.

---

## c1_groupe — 28,88 → 29,87 s (0,99 s) : le salon, Lustig chuchote, les marchands se penchent (« L'un des marchands »)

**Ce qu'on voit.** Plan large du salon : lustre, rideaux rouges, grande table ronde ; Lustig debout à gauche, penché, doigt aux lèvres ; cinq marchands autour de la table se penchent vers lui et murmurent ; Poisson à droite se frotte les mains. Les cases du carnet apparaissent (2 cochées, la 3e allumée), l'étiquette « 3/4 LA VENTE » se tape.
**Événements.** 28,96 `pop` (la case s'allume) ; 29,22 `label` (le lieu se tape).
**Musique.** Reprise de la musique de `faux`, un cran plus complice : la guitare enchaîne sur un accord de 6e, balais sur la caisse claire.

## c1_marchand — 29,87 → 31,33 s (1,46 s) : gros plan de Poisson, les yeux brillants (« tombe dans le piège. »)

**Ce qu'on voit.** Poisson très gros plan, sourire gourmand, il se frotte les mains ; l'image avance lentement vers lui. Sur « piège » deux étoiles de lumière passent dans ses yeux.
**Événements.** 30,65 `sparkle` (éclat dans les yeux, un tintement cristallin court sur « piège »).
**Musique.** Un « glissando » de clarinette qui tombe d'une quarte (il tombe dans le piège), puis une note tenue chaude.

## c2_affaire — 31,33 → 33,20 s (1,87 s) : l'affaire du siècle (« Convaincu de réaliser l'affaire du siècle, »)

**Ce qu'on voit.** Gros plan à deux : Lustig (à gauche, de profil, doigt aux lèvres) souffle son secret, Poisson (à droite) hoche la tête avec énergie, il se frotte les mains. L'étiquette « L'AFFAIRE DU SIECLE » se tape en haut sur « l'affaire ».
**Événements.** 32,39 `label` (la phrase s'écrit).
**Musique.** Le thème prend de l'ampleur (accordéon musette qui rejoint la guitare), pulsation joyeuse, un peu trop joyeuse.

## c2_valise — 33,20 → 34,66 s (1,46 s) : la mallette passe de main en main (« il remet une énorme somme d'argent »)

**Ce qu'on voit.** Plan large du salon : Poisson (à droite) tend la mallette, Lustig (à gauche) avance la main ; sur « somme » le couvercle se soulève, les liasses brillent, des pièces d'or jaillissent et retombent.
**Événements.** 34,04 `glow` (0,6 s : lueur dorée de la mallette) ; 34,14 `coins` (1,0 s : froissement de liasses et tintement de pièces).
**Musique.** Un roulement léger de caisse claire monte et s'arrête net sur le « chling » des pièces ; l'accordéon tient un accord.

## c2_vendue — 34,66 → 35,77 s (1,11 s) : le contrat est tamponné (« à Lustig. »)

**Ce qu'on voit.** Sur la table : le contrat signé ; derrière, Lustig sourit en coin. Un tampon de bois vu de derrière la main descend sur l'écran et s'écrase : « VENDUE » en rouge (l'image tremble au choc), puis le tampon se retire et l'empreinte reste, encore luisante.
**Événements.** 34,88 `stamp` (coup de tampon sec, force 1, calé sur « Lustig »).
**Musique.** Coup sec de caisse claire avec le tampon, puis un accord plein et chaleureux : le point haut de la musique (le piège est refermé).

## c3_decouverte — 35,77 → 38,78 s (3,01 s) : quelques jours plus tard, au pied de la tour (« Mais quelques jours plus tard, il découvre la vérité. »)

**Ce qu'on voit.** Contre-plongée sur le pied de la tour au soleil bas, un guichet de gardien au premier plan ; Poisson entre en marchant d'un bon pas, s'arrête, brandit son contrat tamponné « VENDUE » vers le gardien ; le gardien (casquette, uniforme bleu nuit) secoue lentement la tête.
**Événements.** 36,27 et 36,76 `step` (deux pas de Poisson sur le sable, calés sur son cycle de marche) ; 37,44 `gasp` (inspiration de Poisson : il comprend sur « découvre »).
**Musique.** Coupure nette de la musique du salon : un temps de silence, puis la clarinette seule, une note longue et un peu fausse ; la guitare n'ose pas revenir.

## c4_arnaque — 38,78 → 40,88 s (2,09 s) : stupeur, ARNAQUE (« Il vient de se faire arnaquer ! »)

**Ce qu'on voit.** Gros plan de Poisson au pied de la tour : bras ouverts, yeux écarquillés, bouche ouverte, son chapeau se soulève de la tête ; le contrat lui échappe et tombe en tournoyant. Sur « arnaquer » le tampon rouge s'écrase en plein cadre : « ARNAQUE » (l'image tremble) puis se retire et l'empreinte reste. Un peu après, la 3e case du carnet se coche.
**Événements.** 39,02 `gasp` (Poisson, au début de « vient ») ; 39,65 `stamp` (force 1,2 : coup de tampon plus lourd, sur « arnaquer ») ; 40,20 `ding` (la case 3/4 se coche).
**Musique.** Un seul accord grave tenu sous le tampon, puis silence ; le `ding` clair résonne dans le vide. (La musique de `honte` reprend sur le segment suivant.)
