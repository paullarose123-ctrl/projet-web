# Bande-son du segment AFRIQUE (lycaons) — `sc_lycaon.js`

Segment : 40,80 s → 56,79 s (16,0 s), 8 plans. Les temps ci-dessous sont les temps ABSOLUS du film avec la voix actuelle ; ils sont tous calés sur `wt()` / `wt1()` / `P.<id>`. Si la voix est refaite, relancer `node solo.mjs lyc` puis `node valide.mjs lyc` et relire la liste des événements (`events.json` est régénéré par `rendu.sh`).

Principe sonore : une savane à l'aube, très calme, qui devient peu à peu une assemblée vivante (piaillements, éternuements en cascade), puis un départ d'un seul bloc, puis un gag (l'urne) qui finit sur un sourire. Pas de bruit sur les coupes. Un éternuement de lycaon = une expiration nasale rapide, sans voix : un « tch » sec et bref, pas un « atchoum » humain (les ATCHOUM écrits sont une onomatopée visuelle). Les 8 éternuements du cercle sont comptés à l'écran (compteur « ATCHOUM ×N ») : le nombre et les instants des événements `sneeze` collent à l'image (un `counter` suit chaque `sneeze` de 0,04 s).

## y1_savane — 40,80 → 44,32 s (3,51 s) : savane de l'Okavango à l'aube (« En Afrique, les lycaons ont une façon très particulière de prendre des »)

**Ce qu'on voit.** Plan large : soleil bas à l'horizon dans un ciel violet et or, brume basse, acacias en parasol (acacia central au tronc épais, pas de baobab : décor du delta de l'Okavango), brume basse tramée à l'horizon et entre les plans, herbe dorée au premier plan qui ploie dans le vent, oiseaux qui traversent. La meute est au repos en contre-jour (pelage fauve, noir et blanc encore lisible, liseré clair du soleil) : couchés, assis, un lycaon debout. Vers 2 s après le début, le lycaon assis se lève (petit nuage de poussière), puis regarde au loin. Les cases du carnet apparaissent (3/3 allumée, « 3/3 AFRIQUE »), puis l'étiquette « BOTSWANA (OKAVANGO) ». Caméra : lent travelling latéral.

**Ambiance continue.** Aube sèche et calme : vent léger dans les herbes hautes (souffle doux, un peu de sifflement), brume sonore (air large), quelques oiseaux d'aube (chants clairs et lointains, pas de vol bruyant), insectes très discrets. Aucun grillon (c'est le matin).

**Intention musicale.** Calme et large : kalimba doux sur une nappe chaude, pulsation de marche très lente qui s'installe ; on est dehors, tranquille, un peu solennel. Le sourire arrive plus tard.

**Événements** (temps absolu · type · valeur · ce que ça représente) :

- 40,88 s · `pop` · 1 · les trois cases du carnet apparaissent
- 40,90 s · `wind` · 3,5 · rafale douce dans les herbes (début du plan, 3,5 s)
- 41,18 s · `label` · 1 · l'étiquette « 3/3 AFRIQUE » se tape
- 41,35 s · `bird` · 1 · un oiseau s'envole à gauche
- 41,64 s · `bird` · 2 · un second oiseau (type différent, juste après « Afrique »)
- 41,90 s · `label` · 1 · l'étiquette « BOTSWANA (OKAVANGO) » se tape

## y1_atchoum — 44,32 → 46,07 s (1,76 s) : un lycaon éternue (« décisions : ils éternuent ! »)

**Ce qu'on voit.** Plan moyen : un lycaon de profil, très grand dans le cadre (≈ 80 % de la largeur), pelage fauve tacheté de noir et de blanc, oreilles rondes, queue à bout blanc ; il regarde au loin, tourne légèrement la tête, puis inspire (tête qui se relève, paupières qui se plissent) et ÉTERNUE (saccade de la tête vers le bas, nuage de gouttelettes dans la lumière rasante, « ATCHOUM » en grosses lettres jaunes, placé au-dessus de la tête avec une marge de 8 px au bord ; le nuage de gouttelettes part devant le museau). Au fond, un second lycaon en contre-jour, oreilles pointées vers lui.

**Ambiance continue.** Même savane qu'au plan précédent ; le vent baisse d'un cran pour laisser entendre l'éternuement ; le chant d'oiseau de fond continue.

**Intention musicale.** Légère tension comique : la musique se retient (note tenue, silence sur l'inspiration), puis rebondit après l'éternuement avec une petite note pizzicato (clin d'oeil).

**Événements :**

- 44,32 s · `wind` · 1,7 · un souffle de vent d'ouverture
- 44,94 s · `suspense` · 0,4 · la tension de l'inspiration (le lycaon prend son souffle)
- 45,34 s · `sneeze` · 1,0 · l'éternuement (saccade visible à l'image, nuage de gouttelettes, ATCHOUM) : un « tch » nasal sec, sur le mot « éternuent »

## y2_reveil — 46,07 → 47,36 s (1,28 s) : la meute se dresse (« Avant de partir chasser, »)

**Ce qu'on voit.** Trois lycaons en pied, de profil, bien éclairés par le soleil bas : tête haute, oreilles pointées vers l'horizon (le sol, la poussière dorée, les rayons de lumière). L'un tourne la tête, un autre lève les oreilles. L'herbe ploie au premier plan.

**Ambiance continue.** Savane qui se réveille : un peu plus d'oiseaux, vent léger, un bruissement d'herbes ; on sent la meute se mettre en alerte.

**Intention musicale.** Attente et élan : la pulsation de marche se précise (peau de tambour très douce), crescendo léger vers le plan suivant.

**Événements :**

- 46,12 s · `bird` · 0 · un oiseau lointain
- 46,47 s · `yip` · 1 · un premier piaillement (un lycaon appelle les autres), sur « partir »

## y2_rassemble — 47,36 → 49,36 s (2,00 s) : ils se rassemblent (« les membres de la meute se rassemblent. »)

**Ce qu'on voit.** Six lycaons arrivent de toutes parts en trottant (de gauche et de droite, déjà dans l'image à la coupe), la poussière dorée soulevée à chaque foulée, et se retrouvent en trois paires étagées en profondeur (fond, milieu, devant), 20 à 30 px d'air entre les corps : têtes basses à hauteur d'épaule, oreilles rabattues, gueule entrouverte, queues qui battent, museaux qui se touchent au centre (les salutations du « rassemblement »), les deux lycaons des flancs penchés vers le centre. Soleil bas à l'arrière, travelling lent.

**Ambiance continue.** Trottinement de plusieurs animaux sur sol sec (pas feutrés), poussière, piaillements aigus et sifflants de la meute (cris d'oiseau et couinements), qui montent en intensité vers la fin du plan. Le vent retombe.

**Intention musicale.** Joyeux et vivant : kalimba et petits tambours sur la pulsation de marche, accélération douce ; une couleur « on se retrouve » (légère, enjouée).

**Événements :**

- 47,36 s · `run` · 1,4 · l'arrivée des lycaons en trot (les derniers se posent vers 48,5 s)
- 47,61 · 47,95 · 48,29 · 48,63 s · `step` · 1 · les foulées du trot, une toutes les 0,34 s (une par nuage de poussière)
- 48,26 · 48,86 · 49,16 s · `yip` · 1 · piaillements de salutation (les lycaons se retrouvent, de plus en plus serrés)

## y3_vote — 49,36 → 51,70 s (2,35 s) : le cercle éternue, le compteur monte (« Plus il y a d'éternuements, plus le groupe a de »)

**Ce qu'on voit.** Les six lycaons du cercle (trois paires en profondeur), têtes basses, queues qui battent doucement ; les autres sont presque immobiles. À chaque éternuement, UN lycaon se redresse (il inspire, tête haute), puis plonge de la tête (nuage de gouttelettes devant son museau, « ATCHOUM » à l'échelle 2 au-dessus de lui, lettres qui se dissolvent proprement) ; en même temps le compteur « ATCHOUM ×N » monte d'un cran (×1 à ×6 dans ce plan) et l'aiguille du cadran « DÉPART » avance. Un éternuement toutes les 0,30 s environ. L'étiquette de compteur et la jauge sont en haut à droite, au-dessus du sujet.

**Ambiance continue.** La même ambiance de meute (piaillements plus rares, souffle, pas piétinés sur place), un fond de vent très léger. Le rythme des éternuements devient le rythme de la scène.

**Intention musicale.** Comique et progressif : une pulsation de percussion légère qui souligne chaque éternuement, en montée de hauteur (un cran par éternuement : kalimba qui monte d'une note à chaque `counter`) ; la tension monte sans devenir inquiétante, comme une jauge qui se remplit.

**Événements :**

- 49,41 s · `pop` · 1 · le compteur et la jauge apparaissent
- 49,96 · 50,26 · 50,56 · 50,86 · 51,16 · 51,46 s · `sneeze` · 0,90 / 1,02 / 1,13 / 1,25 / 0,90 / 1,02 · les éternuements n°1 à n°6 (le `v` varie : chaque lycaon a sa hauteur)
- 50,00 · 50,30 · 50,60 · 50,90 · 51,20 · 51,50 s · `counter` · 1 à 6 · le compteur « ATCHOUM ×N » avance d'un cran, 0,04 s après chaque `sneeze`

## y3_depart — 51,70 → 53,02 s (1,32 s) : la jauge est pleine, la meute part (« chances de partir ! »)

**Ce qu'on voit.** Même cercle : deux derniers éternuements (×7 et ×8), la jauge « DÉPART » (qui reste affichée) se remplit à fond jusqu'au « ding » ; dès « chances » (51,80 s) l'étiquette « DE 3 À 10 ÉTERNUEMENTS » se tape vite en haut et reste pleine jusqu'à la fin du plan, puis encore 0,95 s au début du plan suivant (y4_urne) pour être lisible (le nombre d'éternuements nécessaires dépend de qui lance le rassemblement : environ 3 si c'est un chef, environ 10 sinon). Sur « partir » (52,26 s) la meute se tourne d'un seul bloc vers le soleil (nuage de poussière à chaque demi-tour) et part au galop vers la droite, accélération marquée ; en fin de plan la plupart des lycaons ont quitté le cadre, les derniers sortent à droite dans la poussière.

**Ambiance continue.** Montée en puissance : les piaillements s'arrêtent net au départ, remplacés par le grondement doux de pattes qui martèlent le sol sec et un souffle de poussière ; un peu de vent qui accompagne la course.

**Intention musicale.** Libération : après la tension du compteur, la musique éclate (kalimba et tambours doux sur pulsation de marche rapide), un accord lumineux sur le « ding » de la jauge pleine, puis l'élan du galop ; soulagement joyeux.

**Événements :**

- 51,76 · 52,06 s · `sneeze` · 1,13 / 1,25 · les éternuements n°7 et n°8
- 51,80 · 52,10 s · `counter` · 7 et 8 · le compteur passe à ×7 puis ×8
- 52,30 s · `ding` · 1 · la jauge est pleine (« ding » de réussite, juste avant le départ)
- 52,26 s · `run` · 1,2 · le départ au galop de toute la meute (1,2 s)
- 52,31 s · `whoosh` · 0,6 · le déplacement rapide de la meute (poussière)
- 52,36 s · `yip` · 1 · un cri de départ de la meute
- 51,80 s · `label` · 1 · l'étiquette « DE 3 À 10 ÉTERNUEMENTS » se tape (sur « chances »)

## y4_urne — 53,02 → 54,41 s (1,39 s) : l'urne dans la savane (« Oui, chez les lycaons, on peut »)

**Ce qu'on voit.** Gag : une grosse urne de vote en bois cerclée de fer, posée au premier plan dans la savane (étiquette « VOTE », fente sur le dessus), avec la meute qui court en silhouette au loin, derrière (elle vient de quitter le plan précédent). L'étiquette « DE 3 À 10 ÉTERNUEMENTS » reste affichée les 0,95 premières secondes du plan. Légère caméra qui avance, poussière dans la lumière.

**Ambiance continue.** Retour au calme et au grand air : vent léger, oiseaux d'aube, galop lointain de la meute qui s'éloigne (à peine audible).

**Intention musicale.** Suspension comique : la musique se met en retrait, un petit motif curieux (flûte ou pizzicato) comme avant une chute de gag.

**Événements :**

- 53,02 s · `wind` · 1,3 · petit souffle de vent d'ouverture
- 53,07 s · `run` · 1,3 · la meute qui s'éloigne en courant au loin, derrière l'urne (galop très lointain, filtré)

## y4_nez — 54,41 → 56,79 s (2,38 s) : voter avec son nez (« littéralement voter avec son nez ! »)

**Ce qu'on voit.** Gag : un lycaon se tient DERRIÈRE l'urne (torse tacheté, plastron blanc, épaules, deux pattes avant à chaussettes blanches posées sur le plateau de chaque côté de la fente) et arrive par la gauche, tête de face (oreilles rondes, masque noir en T, truffe humide, moustaches). Il porte un bulletin « OUI » sous la truffe, l'air déterminé (un seul sourcil haussé, paupières mi-closes), plonge vers la fente, dépose le bulletin (l'urne encaisse un petit choc, les pattes appuient, le bulletin tombe), remonte avec un rictus content, puis ÉTERNUE : la tête recule en haut (inspiration), plonge de 10 px, museau très plissé, yeux fermés, oreilles écartées, gouttelettes, « ATCHOUM » (échelle 3) centré sous la tête. Aussitôt la case du carnet 3/3 se coche (pastille verte). Le plan dure jusqu'à la fin du segment (la pause de fin d'anecdote se passe sur la tête qui reste là, la case cochée).

**Ambiance continue.** Même savane calme, plus intime : vent très léger, un oiseau, plus de meute ; le grand air de la fin d'anecdote.

**Intention musicale.** Comique puis soulagé : suspense bref quand le bulletin est près de la fente, « plop » de gag au `vote`, silence d'une demi-seconde avant l'éternuement, puis un accord lumineux et chaleureux à la coche (la 3ᵉ anecdote est finie), une résolution sourire (kalimba + cordes pincées) qui laisse la place à la question finale.

**Événements :**

- 54,51 s · `whoosh` · 0,5 · le lycaon arrive dans le cadre par la gauche
- 55,37 s · `vote` · 1 · le bulletin « OUI » passe la fente de l'urne (calé sur « voter »)
- 55,59 s · `suspense` · 0,4 · petite tension avant l'éternuement (la tête se relève, le nez se fronce)
- 55,94 s · `sneeze` · 1,2 · le gros nez éternue (juste après « nez »), nuage de gouttelettes et ATCHOUM
- 56,22 s · `ding` · 1 · la case du carnet 3/3 se coche
- 56,22 s · `pop` · 1 · la pastille verte apparaît sur la case
- 56,27 s · `reveal` · 1 · accord de révélation : fin de la 3ᵉ anecdote

## Récapitulatif

- Types utilisés : `pop, wind, label, bird, suspense, sneeze, yip, run, step, counter, ding, whoosh, vote, reveal` (tous du vocabulaire du GUIDE ; aucun type ajouté).
- Nombre d'éternuements : 1 (y1_atchoum) + 8 en cercle (y3_vote ×6, y3_depart ×2, comptés à l'écran de ×1 à ×8) + 1 du gros nez (y4_nez) = 10 `sneeze` dans le segment. Les 8 éternuements du cercle sont à 49,96 ; 50,26 ; 50,56 ; 50,86 ; 51,16 ; 51,46 ; 51,76 ; 52,06 s (chacun suivi d'un `counter` à +0,04 s).
- Rien d'immobile et de silencieux plus de 0,5 s : chaque plan a une ambiance continue (vent, herbes, oiseaux) et au moins un mouvement visible.
