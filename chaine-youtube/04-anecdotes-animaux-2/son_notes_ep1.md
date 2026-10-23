# Notes du sonorisateur — « 3 anecdotes complètement folles sur les animaux »

Fichier : `score.mjs` (seul fichier commun modifié). Outils de contrôle à moi : `son_essai.mjs`, `son_analyse.mjs`, `son_clics.mjs`, `son_sections.mjs`, `son_demo.mjs`, `son_verif.mjs` (tous préfixés `son_`, rien d'autre n'est touché). **Je n'ai pas pu écouter** : tout est validé par des mesures (crête, RMS, spectre moyen, hauteur par FFT, enveloppes) et par des spectrogrammes que j'ai regardés (`build/test/*.png`).

## 1. Utilisation

```
node score.mjs build/score.wav                       # production (rendu.sh) : lit build/events.json + build/timeline.json
node score.mjs build/test/score.wav --events build/test/events_test.json     # mode d'essai : un exemplaire de chaque type, espacés de 1,5 s
node son_essai.mjs                                   # (re)écrit events_test.json, events_reel.json (jeu plausible calé sur la vraie timeline), solo_<type>.json
options : --timeline f.json  --stems (écrit _musiconly, _amb, _sfx)  --only music|amb|sfx|demo  --layer <nom de couche d'ambiance>
```

Sorties : `score.wav` (somme), `score_music.wav` = **musique + ambiances**, `score_sfx.wav` = **bruitages seuls**. Les ambiances partent avec la musique : elles subissent la même compression à sidechain (seuil 0,03, libération 450 ms) donc ne « pompent » pas au rythme des mots ; les bruitages gardent la leur (libération 250 ms). `rendu.sh` est inchangé.

Robustesse : un type d'événement inconnu est ignoré avec un avertissement (une ligne par type) ; un type absent ne change rien ; `t` non numérique ignoré ; `v` absent ou nul = 1 ; un mot manquant dans une phrase (`wt`) se replie sur le début de la phrase (avertissement), une phrase manquante sur le rang ; un bruitage qui lève une erreur est ignoré (avertissement). **Seul `'logo'` est obligatoire** (le plan de sortie en dépend, comme `at('logo')` de l'original). Les pistes sont testées contre NaN et silence ; chaque bruitage reçoit son propre hasard (graine) : ajouter ou retirer un événement ne change pas les autres.

## 2. Niveaux et mastering

- Chaque **bruitage** est rendu seul, puis normalisé à une crête cible (table `LV` du fichier, en dBFS finaux, corrigée de l'écart de réverbération mesuré) : le niveau d'un type ne dépend ni de la valeur `v` (sauf `heartbeat`, `crack`, `drip` dont `v` règle la force) ni des autres événements.
- Chaque **couche d'ambiance** est normalisée à un RMS (avant mastering) puis fondue (entrée / sortie douces) ; le RMS final est ≈ 3 dB plus haut (réverbération + tanh).
- La **musique** a ses gains d'instruments (pas de normalisation).
- Réverbération Freeverb séparée par bus (musique, ambiances, bruitages) ; adoucisseur `tanh(1,4 x)` par bus ; **gain final unique ≤ 1** : `g = min(1, 0,89 / crête de la somme)` (l'original ramenait aussi vers le haut ; ici on ne monte jamais, les niveaux de `LV` restent donc stables d'un rendu à l'autre ; si la somme dépasse 0,89 tout baisse d'un même gain). Sur le jeu réel : crête de somme −1,8 dBFS, g = 1.
- Essai de mixage avec la vraie voix (`build/voix.wav`) et le graphe de `rendu.sh` (chaîne `ia`, sans `room.py`) : mix à −14,0 LUFS avant `loudnorm` (le limiteur ne travaille presque pas), crête −3,0 dBTP : aucun écrêtage.

## 3. Sections (mêmes bornes que `SEG` de shots.js ; temps de la voix actuelle, `kyutai`, 66,8 s)

| Section | Intervalle | Couleur musicale | Tonalité |
|---|---|---|---|
| intro | 0 → 7,36 | curieuse, cristalline, mystérieuse : nappe la mineur, cloches de verre en gouttes de givre calées sur les mots (savais / certains / animaux ; petite montée sur « revenir » ; grande cloche chaude sur « vie » avec harpe), cœur doux (thump grave 82→46 Hz toutes les 1,1 s jusqu'à « revenir »), puis kalimba pentatonique + flûte pour « Voici trois anecdotes… » | la mineur |
| gre (Alaska) | 7,36 → 27,35 | **g1** cloches de verre lentes + 2 cordes de harpe, nappe ré mineur, montée de 4 cloches sur « science-fiction » ; **g2** cloches descendantes (corps, gèle, son), puis sur « cœur » / « s'arrête » **tout s'efface** : bourdon qui glisse de ré3 à ré1 (D3→D1, harmoniques conservées pour rester audible), un dernier tintement suspendu, silence pendant « respirer » ; **g3** (sucre) nappe ré sus2 (ouverte), arpège de harpe qui monte (pentatonique) de « sucre » à « cellules », accord de la majeur + trois cloches sur « survit » (dominante) ; **g4** (« Au printemps ») **lumière majeure** : nappe ré majeur, double cloche sur « Au », kalimba (pentatonique de ré, avec silences), arpège de harpe, cascade de 4 cloches sur « dégèle », flûte (une note par mot : dégèle, reprend, vie, rien, n'était) | ré mineur → ré majeur |
| lez (Mexique) | 27,35 → 44,63 | chaude : **guitare nylon** (Karplus-Strong + caisse) en arpèges de croches élastiques sur la cadence andalouse la–sol–fa–mi (4 accords calés sur lézards / arme / improbable), **shaker**, conga grave toutes les 2 temps, flûte grave sur « improbable » (mystère) ; **l2** menace (basse la/si♭ + nappe la–si♭), puis montée de « peuvent » au jet (arpège qui monte de la2 à mi6, shaker en crescendo, petits tambours qui accélèrent), **accord plaqué + conga + cloches sur le premier `squirt`** (repli : « yeux ») ; **l3** gamme pentatonique de marimba qui monte de « jet » à « mètre » ; **l4** pizzicati malicieux (contrebasse, woodblock), puis **coup comique** à la grimace (premier `yelp`/`shake`/`splat` de la phrase, repli « désagréable ») : basson « bouap-bouap-bouap-bwoooo » (si♭3 → la3 → la♭3 → sol3 → mi3), woodblock, tambour ; descente de marimba ; accord de la majeur sur « prédateurs » | la phrygien |
| lyc (Afrique) | 44,63 → 62,96 | kalimba et marimba (pentatonique de sol), flûte lointaine à l'aube ; **y1** très clairsemé (un appel de flûte, kalimba sur les mots, arpège de marimba + tambour sur « éternuent ») ; **y2** pulsation de marche 84 bpm (tambours grave / médium, shaker, claves, marimba en 3 + 3 + 2) ; **y3** accélération douce 84 → 112 bpm, appels de kalimba de plus en plus aigus (éternuements, plus, groupe, chances, partir), **une claque de petit tambour à chaque `sneeze`** (hauteur selon `v`) ; **y4** kalimba sur Oui / lycaons / voter / nez, puis au `run` (repli « nez ») le tempo saute à 128 → 142 bpm, marimba à l'octave, flûte joyeuse, accord de sol final | sol pentatonique |
| fin (question) | 62,96 → 68,70 | légère, curieuse, **suspendue** : nappe la sus2 (la–si–mi) qui finit juste avant le logo, kalimba épars (Alors, laquelle, trois, anecdotes, plus), montée la5 → si5 sur « surpris ? » (le si reste en l'air), flûte longue, une cloche | dominante de ré |
| sortie | 68,70 → 72,90 | **accord de ré majeur de la marque** (D2 A2 D3 F#3 A3 D4, même nappe qu'en vidéo 2) qui résout la suspension, avec les sons de marque (`endCard`, `logo`, `letters`) **identiques à la vidéo 2** (même code ; hauteur et timbre inchangés ; niveau recalé sur celui mesuré en vidéo 2 : logo −5,6 / endCard −8,4 / letters −8,1 dBFS) | ré majeur |

Instruments (tous synthétisés) : kalimba (fondamentale pure, plink inharmonique, caisse), marimba (1 : 4 : 10, maillet), cloche de verre (partiels 1 / 2,32 / 4,25 / 6,63, battement lent), corde nylon et harpe (Karplus-Strong accordé à ≤ 2 cents, filtre qui s'assombrit en s'éteignant, caisse de guitare), contrebasse pincée, flûte soufflée (vibrato tardif, souffle, « chiff »), basson comique, nappe, bourdon, shaker, djembé grave / conga / claque / woodblock. Pas de basse électronique. Fondamentales mesurées : kalimba, marimba, verre, flûte à 0 à 2 cents (cf. `son_demo.mjs`).

## 4. Ambiances continues (couches de `ambiances()`, niveaux = RMS avant mastering, mesures sur le stem `_amb`)

| Couche | Où | Synthèse | Niveau (avant → mesuré final sur la couche seule) |
|---|---|---|---|
| `wind_hiver` | 0 → 22,8 s (intro, g1, g2, g3) | bruit en bande étroite (≈ 330 Hz × 0,6–1,6, Q 2,2) dont niveau et fréquence suivent de grandes rafales (0,27 Hz et 0,7 Hz, ≈ 15 dB de creux à crête), sifflement étroit vers 1,5 kHz dans les rafales, grondement < 150 Hz, canaux décorrélés ; le vent **retombe de 15 dB environ quand le cœur s'arrête** (« cœur » → « respirer »), se relève un peu pour « survit », s'éteint au dégel | −33,5 → −31,8 RMS ; 76 % de l'énergie < 1 kHz |
| `hush_hiver` | idem | souffle de neige : bruit 5 à 9,5 kHz très doux à variation lente | −47 → −44,8 |
| `sparkle_hiver` | idem | cristaux : tintements de 3 ms entre 3,5 et 9 kHz, ≈ 2 / s, atténués pendant l'arrêt du cœur | −55 |
| `birds_trois` | plan « trois » (4,4 s →) | trois ou quatre oiseaux très lointains (reverb 0,9) par-dessus le vent froid | −54 |
| `stream` | « survit » − 0,8 s → fin de g4 | ruisseau de fonte : bruit filtré (2,4 kHz et 0,9 kHz) à modulation rapide (17 et 6 Hz), ~70 bulles / s (sinus qui montent de 1,4 à 2,2 × en 14–45 ms), gouttes ploc | −38 → −34,4 ; 2 à 6 kHz ; monte avec la fonte |
| `birds_print` | g4 | oiseaux de printemps (tsit à glissando descendant 5,4→4,3 kHz, sifflet à 2 notes, trille AM à 31 Hz, mésange « fi-bi », gazouillis FM), de 0,5 à 1,2 appel/s, près et loin | −44 → −40,8 ; pic 3,6 kHz |
| `wind_print` | g4 | brise douce (520 Hz) | −47 |
| `crickets_d` | désert (27,2 → 44,9) | 6 grillons, porteuse 4,15–4,85 kHz, impulsions de 14 ms à ≈ 40 Hz en groupes de 3 à 5 (≈ 2–3 « trrr » / s), chacun avec sa hauteur et sa place ; **ils se taisent (−11 dB) de « menacés » à 1,2 s après le jet** puis reviennent | −41 → −38,4 ; vérifié : porteuse 4 808 Hz, impulsions 40–42 Hz, groupes 2,2–2,9 Hz |
| `cicada_d` | désert | 4 vagues de 3 à 3,6 s : bruit étroit à 6,2 kHz haché à ≈ 100 Hz, lointain | −48 → −39,4 |
| `wind_d` | désert | vent chaud : bande 280 Hz, rafales plus douces, peu de sifflement | −35,5 → −32,7 ; pic 293 Hz |
| `hush_d`, `hoots_d` | désert | sable soufflé (3,2 kHz) ; deux hululements de hibou lointains (350 Hz) | −47 ; −54 |
| `crickets_s` | savane (44,5 → 68) | 5 insectes plus bas et plus lents (3,2–3,8 kHz, impulsions à ≈ 34 Hz en groupes de 4 à 7), qui s'éteignent avec le lever du jour | −41 → −38,9 ; vérifié 3 163 Hz, 33–35 Hz |
| `cicada_s` | savane | 3 vagues à 5,6 kHz, qui s'éteignent | −48 |
| `birds_s` | savane | tourterelle (coo, 500 Hz), huppe (oop-oop-oop), francolin (rasp, 6 × 95 Hz de modulation), sifflets, trilles, tsit ; de plus en plus nombreux (0,5 → 0,9 / s), loin (70 %) | −42,5 → −37,2 |
| `wind_s` | savane | vent dans les herbes (760 Hz, Q 0,9, + souffle 4 kHz) ; **+2 dB quand la meute court** (`run`, repli « nez ») | −37,5 → −34,2 |
| `hush_s` | savane | air / herbe (2,6 kHz) | −48 |

La savane continue pendant la question (−5 dB sur 0,6 s au début de la phrase « fin ») et s'éteint dans la seconde qui suit la dernière parole (entre 67,0 et 67,9 s avec la voix actuelle) : **le plan de sortie est propre** (comme en vidéo 2). Les bascules de monde se font en ≈ 0,5 s de fondu enchaîné autour des coupes. Niveau RMS du stem d'ambiances (mesure en 1 s, jeu réel) : intro −35,4 ; Alaska −31,5 (g2 −29,4, g3 −36,2) ; Mexique −30,6 ; Afrique −31,4 ; question −34,1 dBFS (cible −38 à −30).

## 5. Bruitages : tous les types gérés (crête finale isolée mesurée, dBFS ; aucun clic détecté, tous éteints avant 8,6 s)

Interface : `ding` −9,9 (cloche la5 + mi6 d'origine) · `no` −10,0 (bip grave d'origine) · `label` −10,0 (bip + tic-tic d'origine ; −13 si dans le plan de sortie) · `blip` −12,0 (petit bip, exception volontaire) · `counter` −10,0 (note de marimba de la gamme de sol selon le numéro du cran + tic) · `pop` −10,0 (bulle qui monte) · `vote` −8,0 (glissement de papier, « toc » creux d'urne, deux notes de marimba sol–ré).
Carnet : `scribble` −13,0 (traits de crayon : bruit 2,8–4,2 kHz haché, durée `v`) · `page` −10,0 (froissement 1,8→3,6 kHz + claque) · `scan` −9,9 (deux sinus qui montent de 0,5 à 2,6 kHz, trémolo, panoramique gauche → droite sur `v` s, cristaux, cloche mi6 à la fin) · `zoom` −7,7 (plongée : bruit 2,8 kHz → 220 Hz, sinus 700→140 Hz, bulles, « bwomp » final) · `whoosh` −8,9 (bruit 300→1 500 Hz, panoramique, durée `v`) · `reveal` −8,0 (accord de cloches de verre sans tierce, harpe, gerbe montante) · `suspense` −8,9 (bourdon 55→87 Hz en tremolo croissant + bruit qui monte + cordes aiguës).
Saisons : `wind` −10,0 (rafale : bruit 250→650 Hz + sifflement, durée `v`) · `snowfall` −13,0 (souffle haut + 10 cristaux / s, durée `v`) · `frost` −10,0 (givre : souffle haut qui monte + cristaux de plus en plus denses + deux cloches aiguës) · `crack` −7,0 (sec : claquement 8 ms + « ping » de glace 2,4 / 3,9 kHz + 2 à 6 glissandos descendants + tintements de verre ; force `v` > 0,55 : boum grave en plus ; `v` règle aussi le niveau) · `drip` −9,1 (goutte : sinus qui monte vite, amorti ; plus grave quand `v` grand + petite seconde goutte) · `thaw` −13,0 (filet d'eau : la couche ruisseau pendant `v` s).
Cœur : `heartbeat` −8,0 (« toum-doum » : deux thumps 95→46 et 80→42 Hz + harmoniques + tap grave ; `v` 0,5 = ≈ −4 dB ; pic mesuré à 70 Hz) · `beep` −10,0 (sinus pur 1 000 Hz, 140 ms, attaque 4 ms) · `flatline` −11,0 (même sinus continu, durée `v`) · `glow` −9,0 (lueur : accord la–ré–mi–la à longue montée / descente avec vibrato lent, souffle haut, scintillements de verre) · `sparkle` −10,0 (4 notes de verre aiguës, montantes ou descendantes).
Grenouille / déplacements : `ribbit` −7,0 (impulsions graves à ≈ 58–92 Hz qui font sonner deux résonances de la gorge (≈ 380–470 Hz et 1,3–1,6 kHz) : deux coassements « rrib-bit » ; `v` 0,8–1,3 règle la hauteur ; mesuré pic 305 / 375 / 645 Hz pour 0,8 / 1,0 / 1,3) · `hop` −10,0 (réception : thump + froissement de feuilles, ou neige étouffée) · `step` −10,0 (selon le lieu : **neige** qui crisse (intro, Alaska d'hiver), **eau/boue** (g4), **sable** (Mexique), **herbe sèche** (Afrique, question, plan « trois »)) · `sniff` −10,0 (trois inspirations nasales décroissantes).
Lézard / coyote : `squirt` −7,0 (jet : « pfft » + sifflement sous pression 4→6,5 kHz + filet sifflé 3,3→2,7 kHz + une dizaine de gouttelettes ; durée `v`) · `splat` −6,0 (impact mouillé : bruit grave 1,4 kHz → 220 Hz, « bloop », gouttes) · `yelp` −7,0 (voix de coyote : source glottale + formants 700 / 1 700 / 3 000 Hz, glissando 600→1 100→560 Hz, vibrato, deux couinements) · `shake` −9,0 (secouement : bruit haché à 16 Hz, claquements de babines).
Lycaons : `sneeze` −6,2 (« atchoum » : souffle « tch » bref, souffle nasal à deux formants (≈ 0,9 et 2,4 kHz × hauteur), petit couinement montant 1,5→2,3 kHz ; **hauteur selon `v`** : pic mesuré 738 / 891 / 1 137 Hz pour 0,8 / 1,0 / 1,3) · `yip` −8,0 (5 à 7 piaillements aigus qui montent, + 3 plus graves, répartis en stéréo) · `run` −10,0 (5 coureurs, pas ≈ 5,9 / s : thump 100→58 Hz + frôlement d'herbe, crescendo / decrescendo, durée `v`) · `ruler` −10,0 (`v` crans de 45 ms : tic net, plus grave tous les 5 ; `v` < 3 → 12 crans) · `bird` −9,9 / −12,2 (type 0 tsit, 1 sifflet, 2 trille, 3 envol : battement d'ailes + cri ; plus grave en Mexique / Afrique).
Marque (identiques à la vidéo 2) : `endCard` −8,4 · `logo` −5,6 · `letters` −8,1.
Anciens types de la vidéo 2 acceptés par prudence : `swoosh` (= `whoosh`), `thud`, `stamp`. Tout autre type : avertissement, aucun son.

Hypothèses sur `v` quand elle manque : durées 0,5 s (`whoosh`, `squirt`), 0,8 s (`scribble`), 1,2 s (`scan`), 1 s (`zoom`), 1,5 à 2,5 s (`frost`, `glow`, `thaw`, `suspense`, `wind`, `flatline`, `run`), `v` = 1 donne une durée d'1 s : **les artistes doivent donner la durée réelle** pour ces types.

## 6. Mesures de niveau (jeu réel `build/test/events_reel.json`, 92 événements, 72,9 s ; jeu d'essai `events_test.json`)

| Piste | crête | RMS | vidéo 2 (rappel) |
|---|---|---|---|
| somme `score.wav` | −1,8 dBFS | −19,8 | −1,0 / −20,6 |
| `score_music.wav` (musique + ambiances) | −8,3 | −23,4 | −4,8 / −21,4 |
| `musiconly` | −9,0 | −24,1 | |
| `amb` | −12,4 | −32,0 | |
| `score_sfx.wav` | −4,1 | −22,3 | −5,2 / −28,3 |

Musique par section (crête, RMS) : intro −9,0 / −22,5 ; Alaska −9,1 / −22,7 ; Mexique −10,1 / −28,2 ; Afrique −9,2 / −24,5 ; question −10,5 / −23,5 ; sortie −10,1 / −22,8. Silences et vides : après le jet de sang (≈ 0,7 s sans note), pendant « respirer » (bourdon grave seul, plus de cloches), mesures de Mexique nettement plus creuses (RMS −28 contre −22 en Alaska). Part de l'énergie sous 100 Hz : −13 dB (intro), −15 (Mexique, Afrique), −23 (question) par rapport au total ; −6 à −10 en Alaska à cause du bourdon (volontaire, harmoniques audibles à 73–150 Hz).

Bruitages : voir §5 (tous entre −6 et −10 dBFS sauf les petites textures et tics : `blip` −12, `scribble` −13, `snowfall` −13, `thaw` −13, `bird` type 3 −12, `flatline` −11 ; ce sont des choix, pas des défauts). Pas de clic : début et fin enveloppés partout (attaque ≥ 0,5 ms, fin ≥ 5–12 ms) ; plus grand saut d'échantillon sur le film : musique 0,07, ambiances 0,12 (les sauts du stem de bruitages, jusqu'à 0,66, sont les attaques de bruit clair voulues : `sneeze`, `squirt`, `crack`) ; premier et dernier échantillons à 0 ; pas de NaN.

## 7. Contrôles faits (images regardées dans `build/test/`)

`amb_hiver*.png`, `amb_printemps.png`, `amb_desert.png`, `amb_savane.png` (ambiances : rafales de vent < 1 kHz qui montent en fréquence, chirps à glissando de 2,5 à 6 kHz, grillons pulsés à 4,2–4,8 kHz, coos à 500 Hz, insectes de savane à 3,2–3,8 kHz) · `mus_a.png`, `mus_b.png` (musique : bourdon qui descend vers 70 Hz à « s'arrête », silences après le jet, glissandos du basson) · `sfx_a.png` … `sfx_f.png` (les 54 événements du jeu d'essai) · `z_montage1.png` (ribbit, sneeze, squirt, crack, drip, heartbeat, yelp, shake en gros plan : impulsions du coassement, formants du couinement, gouttelettes du jet, glissandos de la glace, « toum-doum » à 70 Hz).

## 8. Limites

- Rien n'a été écouté : le caractère (réalisme du coassement, du couinement, de l'éternuement, justesse du « goût » musical) reste à valider à l'oreille ; les mesures disent que les hauteurs, durées, niveaux et spectres sont conformes à l'intention.
- `build/events.json` n'existait pas encore (aucun plan) : les essais utilisent `events_test.json` et `events_reel.json` (jeu plausible écrit d'après CONCEPT.md). Les temps de bruitage et de musique suivent les mots (`wt`), pas des durées fixes : la voix finale redéplacera tout seul ; les signaux `squirt`, `yelp` / `shake` / `splat`, `run`, `sneeze` des vrais plans recaleront les accents de musique (repli sur les mots sinon).
- Choix à vérifier avec les plans : les ambiances ne regardent pas la liste des plans (seulement les phrases) ; le vent d'hiver continue pendant le plan « trois » (aube en lisière de prairie, quelques oiseaux lointains en plus).
- Les ambiances sont mixées avec la musique (stem `_music`). Si l'on préfère les mettre avec les bruitages, changer `dest` dans `layer()` (une ligne).
