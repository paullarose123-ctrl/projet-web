# Concept : « L'homme qui a vendu la tour Eiffel »

**Logline** : en 1925, Victor Lustig, escroc élégant, apprend que la tour Eiffel coûte une fortune à entretenir. Il se fait passer pour un haut fonctionnaire, fabrique de faux papiers et convoque des marchands de ferraille dans un hôtel de luxe pour leur annoncer, sous le sceau du secret, que la tour va être démolie et vendue pour son fer. L'un d'eux achète, découvre la vérité, et n'ose même pas porter plainte. Lustig revient tenter le même coup : cette fois, ça échoue. Il a vendu la tour Eiffel sans jamais en être propriétaire.

**Texte** : le script de l'auteur, mot pour mot (`script.md`, `voix.py`). Les repères de temps du script ([0:00 – 0:06]…) ne sont que des indications : les plans se calent sur la voix réelle (`build/timeline.js`).

**Fil conducteur** : le **tampon rouge « VENDUE »** (il s'écrase sur la tour dans l'accroche, sur les faux documents, sur le contrat, puis revient barré à la fin par « JAMAIS A LUI ») et le **dossier « AFFAIRE LUSTIG »** (quatre cases en haut à gauche : l'idée, les faux papiers, le piège, la honte ; une case est cochée à la fin de chaque étape).

**Différences avec les épisodes animaux** : une histoire de personnages (Lustig, le marchand André Poisson, cinq autres marchands), Paris des Années folles (lumière dorée, hôtel de luxe aux lustres, gare à vapeur) au lieu de nature ; pas de scientifique ; la fin est une chute (« sans jamais en être propriétaire ! ») suivie d'un carton « ELLE EST TOUJOURS A PARIS » ; musique jazz-manouche / musette synthétisée.

**Format** : 1080 × 1920, 30 i/s, voix 59,4 s + carton 2 s + sortie « RAISINS » 4,2 s (≈ 65,5 s). Même voix (CML-TTS français, locuteur 928, voix de synthèse : à signaler, CC-BY 4.0 : mentionner « CML-TTS »).

## Plans (34 plans ; `node valide.mjs` les liste avec leurs événements)

| Segment | Temps | Plans |
|---|---|---|
| intro | 0 → 8,1 s | i_paris (« 1925 »), i_tour (le tampon « VENDUE » s'écrase), i_pas (« PAS A LUI »), i_dossier (« AFFAIRE LUSTIG ») |
| idee | 8,1 → 17,7 s | a1_journal (café), a1_titre (le journal), a1_tour (peintres, pièces qui s'envolent), a2_miroir, a2_sourire (« HAUT FONCTIONNAIRE ») |
| faux | 17,7 → 28,9 s | b1_machine, b1_tampon (« OFFICIEL »), b1_invitations (six enveloppes), b1_hotel, b2_secret, b2_dossier, b2_demolition |
| piege | 28,9 → 40,9 s | c1_groupe, c1_marchand, c2_affaire, c2_valise, c2_vendue, c3_decouverte, c4_arnaque |
| honte | 40,9 → 51,3 s | d1_question, d2_honte, d2_talons (« PAS DE PLAINTE »), d3_train, d3_argent, d3_gare, d3_retour |
| fin | 51,3 → 61,3 s | f_police, f_fuite, f_tour (carton « ELLE EST TOUJOURS A PARIS ») |
| outro | 4,2 s | « RAISINS », « ABONNEZ-VOUS » (identique aux vidéos précédentes) |

## Faits et réserves

Voir `faits.md` (sources, tableau fait par fait). Réserves à signaler : récit en partie issu des propres récits de Lustig et de la presse populaire ; « quelques jours plus tard » (dit par la voix) est une simplification (quelques semaines selon les sources) ; aucun montant ni date affichés ; l'hôtel (Crillon) n'est pas nommé à l'écran ; la suite de la vie de Lustig (fausse monnaie, Alcatraz) n'est pas montrée.
