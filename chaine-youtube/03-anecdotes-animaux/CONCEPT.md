# Concept — « 3 anecdotes complètement folles sur les animaux »

**Logline** : trois bêtes, trois continents, un naturaliste qui note tout dans son carnet de terrain. En Alaska, la grenouille des bois gèle tout l'hiver (le cœur s'arrête, elle ne respire plus) et revient à la vie au printemps grâce à un sucre qui protège ses cellules. Au Mexique, le lézard à cornes projette du sang par les yeux, jusqu'à presque un mètre, et ce sang a mauvais goût pour certains de ses prédateurs. En Afrique, les lycaons votent pour partir chasser en éternuant : plus il y a d'éternuements, plus la meute a de chances de partir. La vidéo finit sur une question au spectateur : « laquelle t'a le plus surpris ? »

**Texte** : le script de l'auteur, mot pour mot (`voix.py`, `SCRIPT`). Seuls changements : les pauses entre phrases et le découpage en paragraphes de lecture (`GROUPES`) ; l'accroche garde la question « Tu savais que… ? ». Le texte n'est pas retouché pour la voix.

**Pourquoi ça marche** : chaque anecdote a un « mais comment ? » (comment survivre à la glace, comment tirer du sang des yeux, comment voter sans parler) et une image que personne n'a vue. La grenouille donne l'émotion (mort apparente puis retour à la vie), le lézard le dégoût drôle, le lycaon la chute comique. Ordre croissant de légèreté : on finit sur un sourire.

**Ambiance (demande de l'auteur : « beaucoup plus nature »)** : contrairement à la vidéo 2 (laboratoire, ville la nuit, planches ambre sur noir), tout se passe dehors, en pleine lumière naturelle, avec des plans larges de paysages et des animaux dessinés avec soin : forêt boréale sous la neige puis fonte du printemps (Alaska), désert au coucher du soleil (Mexique), savane à l'aube (Afrique). Les décors vivent en continu : neige qui tombe, herbe qui ploie, pollen, poussière, oiseaux, papillons, goutte à goutte de la fonte, chaleur qui tremble. La bande-son suit : vent, oiseaux, grillons, ruisseau, pas, et une musique douce aux timbres acoustiques (kalimba, cordes pincées, flûte).

**Fil conducteur** : le **carnet de terrain**. En haut à gauche, trois cases (grenouille, lézard, lycaon) : celle de l'anecdote en cours est allumée avec le lieu (« 1/3 ALASKA »), les précédentes sont cochées. Le scientifique de la chaîne (le même qu'en vidéo 2 : dégradé et boucles blond vénitien) ouvre le film (il présente les trois cases) et le ferme (il hésite entre les trois cartes). Coupes franches partout, comme dans les vidéos précédentes.

**Format** : 1080 × 1920, 30 i/s, 66 s (voix 59,9 s, carton final 2 s, plan de sortie « RAISINS » 4,2 s ; 16 Mo). Voix : Kyutai TTS avec la voix de référence **CML-TTS français, locuteur 928** (CC-BY 4.0 : mentionner « CML-TTS »), choisie pour sa ressemblance (timbre, hauteur 123 Hz, débit 3,3 mots/s) avec la voix de la vidéo TikTok de référence ; voix de synthèse à signaler dans la description (étiquette « contenu généré par IA »).

## Plan par segment (les temps sont ceux de la voix, `build/timeline.js` ; les plans réels, au nombre de 29, sont listés par `node valide.mjs` et décrits dans `son_<segment>.md` : ils suivent ce tableau avec quelques découpages en plus, par exemple g1_scan, y1_atchoum, y4_urne)

Chaque segment est dessiné dans son fichier (voir `GUIDE.md`) ; le premier plan d'un segment commence 0,12 s avant sa première parole, le dernier dure jusqu'au segment suivant (la pause de fin d'anecdote est une respiration, pas un trou).

| Segment | Plan | Ce qu'on voit | Ce que dit la voix |
|---|---|---|---|
| **intro** | i_gel | ACCROCHE. Forêt boréale à l'heure bleue, la neige tombe ; au premier plan un bloc de glace avec une grenouille prise dedans (gros plan), givre qui scintille, une fissure qui court ; sur « revenir à la vie », un reflet chaud et un battement | « Tu savais que certains animaux peuvent revenir à la vie après avoir gelé ? » |
| | i_trois | Le scientifique en lisière de prairie à l'aube, carnet de terrain et jumelles ; trois cases « ? » qui se retournent : grenouille, lézard, lycaon ; titre « 3 ANECDOTES FOLLES » | « Voici trois anecdotes incroyables sur les animaux ! » |
| **gre** | g1_alaska | ALASKA : paysage large (montagnes, épicéas, aurore pâle), la grenouille des bois sur une branche moussue au premier plan ; un balayage « scanner » cyan passe sur elle (le « pouvoir de science-fiction ») ; case 1/3 allumée | « En Alaska, la grenouille des bois possède un pouvoir digne d'un film de science-fiction ! » |
| | g2_gel | L'hiver : la neige recouvre la litière de feuilles, la grenouille est tapie dessous, le givre gagne son corps patte après patte | « Pendant l'hiver, son corps gèle, » |
| | g2_coeur | Vue en coupe (planche du carnet) : le cœur bat puis s'arrête, électrocardiogramme qui se met à plat, compteur de battements à 0 ; la respiration s'arrête aussi (jauge) | « son cœur s'arrête de battre et elle cesse de respirer. » |
| | g3_sucre | Zoom sur les cellules : des molécules de sucre dorées les enrobent, les cristaux de glace (cyan) rebondissent, les cellules restent intactes ; coche « ELLE SURVIT » | « Mais grâce à un sucre qui protège ses cellules, elle survit ! » |
| | g4_printemps | Le dégel : soleil, la neige fond, gouttes, la glace se fissure, l'œil s'ouvre, le cœur repart (électrocardiogramme et compteur), la grenouille saute dans l'herbe fraîche, fleurs et papillons ; case 1/3 cochée | « Au printemps, elle dégèle et reprend sa vie comme si de rien n'était ! » |
| **lez** | l1_desert | MEXIQUE : désert au crépuscule (mesas, saguaros, agaves), le lézard à cornes presque invisible sur le sable (on l'aperçoit) ; case 2/3 | « Au Mexique, certains lézards à cornes possèdent une arme complètement improbable. » |
| | l2_menace | Un coyote s'approche, truffe au sol ; le lézard s'aplatit, se gonfle, les yeux gonflent | « Lorsqu'ils sont menacés, » |
| | l2_jet | Ralenti : un jet de sang part de l'œil et frappe le museau du coyote, gouttelettes | « ils peuvent projeter du sang directement depuis leurs yeux ! » |
| | l3_metre | Règle posée sur le sable : le jet se déroule le long de la règle jusqu'à presque 1 m | « Ce jet peut atteindre presque un mètre ! » |
| | l4_gout | Le coyote fait la grimace (langue sortie, bave, « BEURK »), secoue la tête ; le lézard repart tranquillement ; case 2/3 cochée | « Et le plus fou ? Ce sang a un goût particulièrement désagréable pour certains de leurs prédateurs ! » |
| **lyc** | y1_savane | AFRIQUE : savane à l'aube (acacias, herbes dorées, brume), la meute au repos en contre-jour ; l'un éternue (« ATCHOUM ») ; case 3/3 | « En Afrique, les lycaons ont une façon très particulière de prendre des décisions : ils éternuent ! » |
| | y2_rassemblement | Les lycaons se rassemblent en cercle, queues qui battent, poussière | « Avant de partir chasser, les membres de la meute se rassemblent. » |
| | y3_vote | Compteur d'éternuements « ATCHOUM ×1, ×2, ×3… » et jauge « DÉPART » qui monte ; quand elle est pleine, la meute se met en route | « Plus il y a d'éternuements, plus le groupe a de chances de partir ! » |
| | y4_nez | Gag : urne de vote, un gros nez de lycaon y dépose un bulletin « OUI » ; la meute file vers le soleil levant ; case 3/3 cochée | « Oui, chez les lycaons, on peut littéralement voter avec son nez ! » |
| **fin** | fin_choix | Le scientifique, le carnet ouvert sur trois cartes (grenouille, lézard, lycaon) numérotées 1, 2, 3 ; point d'interrogation ; carton « 1 · 2 · 3 ? » qui reste 2 s après la dernière parole | « Alors, laquelle de ces trois anecdotes t'a le plus surpris ? » |
| outro | outro | Logo (grappe), « RAISINS », « ABONNEZ-VOUS » en jaune (identique à la vidéo 2) | (musique seule) |

## Faits et réserves

Détail, chiffres et sources : `faits.md` (recherche web, résumés d'articles ; aucun texte intégral lu : les chiffres lus dans la presse ou un résumé sont marqués « moyen »). Le texte de l'auteur n'est pas corrigé : voici ce qu'il simplifie ou dépasse, à signaler dans la description si on veut être irréprochable.

- **Lycaons** : « voter » est la métaphore des chercheurs (Walker et al. 2017, delta de l'Okavango au Botswana, 5 meutes, 68 rassemblements) ; le seuil d'éternuements dépend de qui lance le rassemblement (≈ 3 si c'est un dominant, ≈ 10 sinon), donc le « vote » est inégal ; « littéralement » dépasse ce que l'étude établit, et rien ne prouve que toutes les populations d'Afrique le font. Le film ne fixe donc pas de seuil unique à l'écran (« DE 3 À 10 ÉTERNUEMENTS »).
- **Grenouille des bois** : ≈ 65 à 70 % de l'eau du corps devient de la glace, hors des cellules (pas « gelée à cœur ») ; le cœur ne s'arrête pas d'un coup mais ralentit pendant des heures (arrêt ≈ 20 h après le début du gel en laboratoire), d'où un compteur qui descend progressivement ; le glucose est le principal antigel mais pas le seul (urée, glycolipides) ; en Alaska elle reste gelée ≈ 6 mois (193 ± 11 jours, minimum moyen −14,6 °C, 18 grenouilles sur 18 ont survécu) ; au dégel le cœur repart en premier, mais nage et saut sont diminués pendant un à deux jours.
- **Lézard à cornes** : le sang vient des sinus autour des yeux (coin de l'œil), pas du globe oculaire ; c'est un dernier recours, déclenché surtout par un canidé qui touche le lézard (≈ 5 % seulement face aux humains) ; la portée citée va de ≈ 0,9 à 1,5 m sans mesure primaire (« presque un mètre » est la valeur prudente) ; les prédateurs gênés sont les canidés (coyotes, renards, chiens), pas prouvé pour les oiseaux ; le composé n'est pas identifié ; les expériences viennent du lézard du Texas aux États-Unis (le film dessine le lézard royal de Sonora, avec ses saguaros).

## Précautions

- Le texte reste celui de l'auteur ; les réserves d'exactitude sont signalées dans la réponse de livraison, pas corrigées dans la voix.
- La voix est une **voix de synthèse** : Kyutai TTS 1.6B (poids CC-BY 4.0), voix de référence « fabieng » (CC0). Mentionner « voix de synthèse » dans la description et activer l'étiquette « contenu généré par IA ».
- Aucun personnage ni animal sous droits : les bêtes sont dessinées d'après leurs formes réelles.
