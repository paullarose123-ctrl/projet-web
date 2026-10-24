# Bande-son du segment BASILIC (Amérique centrale, « lézard Jésus-Christ ») — `sc_basilic.js`

Segment : 22.77 s → 37.50 s (14,7 s), 7 plans. Les temps ci-dessous sont les temps ABSOLUS du film avec la voix actuelle (`build/timeline.js`) ; tout est calé sur `wt()` / `P.<id>` : si la voix est refaite, relancer `node solo.mjs bas` puis relire `build/events.json` (les instants se déplacent avec les mots). Aucun bruit sur les coupes. Les claquements de pied (`slap`) sont calculés par la même formule que l'image (phase du cycle de course, 3,3 à 3,5 cycles/s, deux pas par cycle) : ils tombent à l'image exacte où le pied touche l'eau.

**Principe sonore.** On quitte la prairie du scarabée pour la forêt tropicale humide, chaude et verte, au bord d'une rivière brune. Musique : timbres de bois (marimba / kalimba grave), pulsation de marche qui s'accélère avec la course, un peu de flûte de bois sur la découverte ; elle bascule en tension (cordes en trémolo, grave) à l'arrivée des prédateurs et se résout en accord ouvert sur la case cochée.

**Ambiance continue de tout le segment** (à poser sur les noms de plans) : 
- canopée : oiseaux tropicaux (perruches, un toucan lointain, appels longs et rares), cigales et insectes de la forêt en nappe douce, vent très faible dans les feuilles larges ;
- rivière : eau qui coule doucement (clapotis, léger glouglou contre la branche), un peu plus présente à partir de `c1_saut` ;
- aucun son de ville ; l'ambiance se resserre et baisse (filtrée, sourde) dans la planche en coupe `c2_pas`, puis revient large au plan suivant.

---

## c1_branche — 22.77 → 26.90 s (4,13 s) : la forêt, le basilic sur sa branche (« En Amérique centrale, un lézard possède une capacité complètement folle : »)

**Ce qu'on voit.** Forêt tropicale au bord d'une rivière : canopée sombre, faisceaux de lumière dorée, lianes, grands troncs, brume verte ; l'eau brune-verte reflète la forêt. La caméra descend lentement de la voûte de feuilles vers une grosse branche moussue qui avance au-dessus de l'eau ; le basilic à plumet (vert vif, plumet sur la tête, voile dorsal, queue très longue, œil doré) est assis dessus, alerte : il respire, cligne, la tête dodeline, la langue sort deux fois (sur « lézard » et un peu après « capacité »), le plumet et le voile se dressent sur « complètement ». Papillons (bleu et orange), poussière dorée dans les rayons, feuilles qui tombent. Les cases du carnet apparaissent (la 1/3 est cochée), « 2/3 AMERIQUE CENTRALE » se tape.

**Ambiance continue.** La forêt au complet (oiseaux, insectes, eau), très présente : c'est l'entrée dans un nouveau monde.

**Intention musicale.** Entrée douce et lumineuse : première note de marimba sur l'apparition des cases, nappe aérée, pas de rythme encore ; curiosité.

**Événements :**
- 22.97 s · `pop` · – · les cases du carnet apparaissent
- 23.17 s · `label` · – · « 2/3 AMERIQUE CENTRALE » se tape
- 24.29 s · `sniff` · 0,6 · coup de langue du basilic (juste après « lézard »)
- 25.39 s · `sniff` · 0,5 · second coup de langue, plus bref
- 25.78 s · `whoosh` · 0,4 · le plumet et le voile se dressent d'un coup (« complètement »)

## c1_saut — 26.90 → 28.38 s (1,47 s) : il se ramasse, bondit et part sur l'eau (« il peut courir sur l'eau ! »)

**Ce qu'on voit.** Gros plan du basilic qui se ramasse (anticipation de 0,3 s), puis bondit de la branche en arc au-dessus de la rivière, étiré, jambes derrière ; la caméra part avec lui. Il retombe sur « l'eau » : claquement du pied, gerbe d'eau, anneaux qui s'élargissent, puis il se redresse debout sur ses pattes arrière et file, les pas suivants claquent l'eau (anneaux et gouttes derrière lui), la forêt défile (travelling).

**Ambiance continue.** Rivière plus présente ; oiseaux qui s'envolent (le départ du lézard les dérange) ; un souffle d'air dans le bond.

**Intention musicale.** Le tempo démarre à l'instant du bond : marimba / bois en croches sur la pulsation de la course (≈ 3,3 pas par cycle, donc deux claquements par cycle), basses douces ; énergie qui monte. Sur « l'eau ! » un accent (accord) qui lance la course.

**Événements :**
- 27.27 s · `hop` · 1 · il s'élance de la branche (après le temps de ramassement)
- 27.30 s · `whoosh` · 0,5 · le bond (souffle, durée ≈ 0,5 s)
- 27.79 s · `slap` · 1 · le pied touche l'eau (« l'eau »)
- 27.79 s · `splash` · 1,3 · grosse gerbe d'atterrissage
- 27.94 s, 28.09 s, 28.24 s · `slap` · 1 · les pas suivants (tous les 0,15 s)

## c2_course — 28.38 → 30.80 s (2,43 s) : le lézard Jésus-Christ, en entier, à pleine vitesse (« Surnommé le lézard Jésus-Christ, le basilic »)

**Ce qu'on voit.** Le basilic en profil, debout sur ses pattes arrière, court à la surface de la rivière : corps penché, bras en arrière, queue très longue qui ondule en balancier, voile dorsal couché par la vitesse, orteils à franges ouverts à chaque claquement ; à chaque pas, anneaux concentriques, gerbe et gouttes derrière le pied, reflet ondulé du basilic dans l'eau. Travelling : le décor défile (lointain lent, eau et berge proche vite, grandes feuilles du premier plan qui passent). Étiquette « LE LÉZARD JÉSUS-CHRIST » se tape sur « Jésus-Christ » (29.60 s).

**Ambiance continue.** Rivière qui défile, souffle de la vitesse, forêt en arrière-plan, battements d'eau réguliers des pas (ce sont les `slap`).

**Intention musicale.** La pulsation est installée : bois / marimba en croches qui roulent, basses, un petit motif de flûte qui chante un air « sacré » sur « Jésus-Christ » (clin d'œil léger, pas solennel).

**Événements :**
- 28.40 s · `whoosh` · 1,2 · le travelling démarre
- 28.48 s → 30.75 s · `slap` · 1 · 16 claquements, un pas tous les ≈ 0,15 s (28.48, 28.63, 28.79, 28.94, 29.09, 29.24, 29.39, 29.54, 29.69, 29.85, 30.00, 30.15, 30.30, 30.45, 30.60, 30.75)
- 28.64 s … 30.76 s · `splash` · 0,6 · une petite gerbe sur un pas sur deux (28.64, 28.95, 29.25, 29.55, 29.86, 30.16, 30.46, 30.76)
- 29.60 s · `label` · – · « LE LÉZARD JÉSUS-CHRIST » se tape

## c2_pattes — 30.80 → 32.27 s (1,46 s) : gros plan sur les longues pattes arrière (« utilise ses longues pattes arrière »)

**Ce qu'on voit.** Même course, beaucoup plus près : le basilic occupe le cadre, ses longues pattes arrière aux orteils frangés (qui s'ouvrent à chaque claquement) travaillent à la surface ; les anneaux sont plus larges. Étiquette « 20 PAS PAR SECONDE » (ordre de grandeur de la cadence réelle ; ici le cycle est simplifié pour rester lisible) sur « pattes » (31.70 s).

**Ambiance continue.** Même rivière, claquements un peu plus gros et plus proches.

**Intention musicale.** Même pulsation, un peu plus serrée ; un petit roulement de percussion de bois sur « pattes arrière ».

**Événements :**
- 30.91 s → 32.12 s · `slap` · 1 · 9 claquements (30.91, 31.06, 31.21, 31.36, 31.51, 31.66, 31.82, 31.97, 32.12)
- 31.07 s, 31.37 s, 31.67 s, 31.98 s · `splash` · 0,7 · gerbe sur un pas sur deux
- 31.70 s · `label` · – · « 20 PAS PAR SECONDE » se tape

## c2_pas — 32.27 → 34.43 s (2,16 s) : planche en coupe, au ralenti : la poche d'air (« pour courir à la surface des rivières ! »)

**Ce qu'on voit.** Planche de science (pas de cases du carnet) : le basilic grand, de profil, en coupe à la surface de l'eau, fond de forêt flou ; sous la ligne de l'eau, l'eau bleu-vert en coupe. Au ralenti : le pied (orteils à franges déployés) claque l'eau, s'enfonce, et une **poche d'air** (bulle claire à bord brillant) se creuse autour de lui ; le pied est retiré **avant** que la poche ne se referme ; la poche se pince, se détache en bulle qui monte, un petit jet jaillit à la surface, des rides partent ; l'autre pied commence déjà à frapper. Étiquettes « RALENTI » (dès l'entrée) et « PAS D'AIR SOUS LE PIED » (à partir de ≈ 32.7 s).

**Ambiance continue.** Le monde passe en sourdine (filtre passe-bas, comme sous l'eau / ralenti) : on garde l'eau en grave et un très léger bourdonnement de forêt lointaine ; le bruit des pas devient un « plouf » grave, étiré.

**Intention musicale.** Moment de science : nappe qui se suspend, notes de kalimba espacées et reverbérées ; une note tenue qui monte pendant que la poche se creuse, et se relâche quand la bulle se détache.

**Événements :**
- 32.37 s · `label` · – · « RALENTI » se tape
- 32.57 s · `slap` · 1 · le pied claque l'eau (ralenti : joué plus grave et plus long)
- 32.58 s · `splash` · 0,9 · la couronne d'eau autour du pied
- 32.72 s · `label` · – · « PAS D'AIR SOUS LE PIED » se tape
- 33.36 s · `bubbles` · 0,9 · la poche d'air se referme derrière le pied qui sort : bulles
- 33.44 s · `slap` · 1 · l'autre pied frappe
- 33.45 s · `splash` · 0,6 · sa petite gerbe
- 33.54 s · `drip` · 0,7 · le petit jet de l'effondrement retombe

## c3_ombre — 34.43 → 35.41 s (0,98 s) : l'ombre d'un oiseau de proie (« Et tout ça pour »)

**Ce qu'on voit.** Retour au plan réel : le basilic court, un peu plus vite. En haut, dans la trouée de lumière de la canopée, la silhouette noire d'un rapace qui plane ; son ombre glisse sur la rivière et rattrape le basilic par la gauche (il passe dans l'ombre, plus sombre). Derrière lui, à ras de l'eau, deux yeux jaunes et un museau de caïman qui suivent son sillage. Étiquette « ≈ 1,5 M/S » (vitesse du basilic) à gauche.

**Ambiance continue.** Les oiseaux de la canopée se taisent d'un coup (silence soudain), les insectes baissent ; seul reste le clapotis des pas.

**Intention musicale.** Inquiétude : cordes graves en trémolo qui entrent, la pulsation continue mais se tend ; un coup de timbale sourd sur l'ombre.

**Événements :**
- 34.48 s · `whoosh` · 1 · le travelling reprend
- 34.53 s · `label` · – · « ≈ 1,5 M/S » se tape
- 34.78 s · `bird` · 2 · cri aigu d'un rapace au-dessus de la canopée
- 34.56 s → 35.27 s · `slap` · 1 · 6 claquements (34.56, 34.70, 34.84, 34.99, 35.13, 35.27)
- 34.71 s, 35.00 s, 35.28 s · `splash` · 0,6 · petites gerbes

## c3_fuite — 35.41 → 37.50 s (2,08 s) : le caïman jaillit, le basilic grimpe (« échapper à ses prédateurs ! »)

**Ce qu'on voit.** Le basilic file vers l'autre rive, le caïman le suit à ras de l'eau (yeux et museau, sillage en V). Sur « prédateurs » (36.15 s) le caïman JAILLIT de l'eau derrière lui, gueule grande ouverte, rangées de dents, gerbe énorme ; au même instant le basilic bondit hors de l'eau sur un tronc incliné de l'autre rive. Les mâchoires claquent dans le vide (36.53 s) ; le basilic grimpe sur le tronc en petits bonds, pendant que le caïman retombe dans l'eau en soulevant de grosses rides. Il se dresse en haut du tronc, plumet et voile levés, souffle. La case 2/3 se COCHE (37.05 s). Le dernier plan court jusqu'à la fin du segment : respiration, l'eau se calme.

**Ambiance continue.** Silence tendu puis explosion d'eau ; ensuite la forêt revient peu à peu (un oiseau, un insecte), l'eau se calme.

**Intention musicale.** Montée de suspense pendant l'approche, gros coup de percussion sur l'éruption du caïman, course effrénée des bois, puis la tension retombe : accord ouvert, soulagé, sur la coche.

**Événements :**
- 35.46 s · `suspense` · 0,9 · la montée de tension (le caïman approche)
- 35.42 s → 35.99 s · `slap` · 1 · les derniers pas sur l'eau (35.42, 35.56, 35.70, 35.84, 35.99), `splash` 0,6 à 35.57 s et 35.85 s
- 36.01 s · `hop` · 1 · le basilic bondit hors de l'eau
- 36.03 s · `splash` · 1,2 · sa dernière poussée sur l'eau
- 36.10 s · `splash` · 1,6 · le caïman jaillit (juste avant « prédateurs »)
- 36.35 s · `hop` · 1 · le basilic atterrit sur le tronc
- 36.53 s · `bang` · 1 · les mâchoires du caïman claquent dans le vide
- 36.55 s · `splash` · 1,4 · le caïman retombe dans l'eau
- 37.05 s · `ding` · – · la case 2/3 est cochée

---

## Besoins / remarques pour la sonorisation
- Types d'événements utilisés (tous dans le vocabulaire) : `pop`, `label`, `sniff` (coup de langue), `whoosh`, `hop`, `slap`, `splash`, `bubbles`, `drip`, `bird`, `suspense`, `bang`, `ding`.
- Pas de nouveau type demandé. `slap` = pied qui claque sur l'eau (très fréquent : 4 à 16 par plan de course, à ne pas rendre mitraillette : alterner deux timbres, pied droit / pied gauche, et baisser légèrement l'intensité du `slap` quand un `splash` tombe au même instant).
- Dans `c2_pas` (ralenti) les mêmes événements doivent sonner plus lents et plus graves.
