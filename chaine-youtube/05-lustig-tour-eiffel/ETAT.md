# État d'avancement (à mettre à jour à chaque étape ; sert de reprise si la session est coupée par la limite d'usage)

Vidéo : « L'homme qui a vendu la tour Eiffel » (Victor Lustig, Paris 1925), script de l'auteur dans `script.md`, même moteur, même voix (CML-TTS 928) que l'épisode 2.

## Fait
- Squelette généré (`../nouvel-episode.mjs`), `BRIEF.md`, `STYLE.md`, `faits.md` écrits.
- Voix : `build/voix_lustig.sh` (journal `build/voix_log.txt`) : préparation, synthèse 4 prises/paragraphe (≈ 25 à 40 min), choix des prises, alignement ; à la fin `build/timeline.*` est la vraie timeline (vérifier : `grep -c cml928 build/timeline.js`). Si des paragraphes sont mauvais : relancer la synthèse pour ceux-là (`--takes 8 --seed 2`).
- Vague 1 d'artistes (sprites) lancée : `sc_lustig_sprites.js` (`lu_`), `sc_paris_sprites.js` (`pa_`), `sc_hotel_sprites.js` (`ho_`).

## Reste à faire (dans l'ordre)
1. Vague 2 : plans par segment (`sc_idee.js`, `sc_faux.js`, `sc_piege.js`, `sc_honte.js`) écrits par les mêmes artistes (message) quand leurs trois API existent ; accroche `sc_intro.js` et fin `sc_fin.js` par le chef de projet.
2. Son : adapter `score.mjs` (agent), notes `son_<segment>.md`.
3. Assemblage : `node valide.mjs`, `node check.mjs 6`, `node bords.mjs`, `node sheet.mjs`.
4. Rendu : `VOIX=ia PY=<python> ./rendu.sh lustig-tour-eiffel.mp4`, puis `production/verif_final.py`.
5. Livraison (mp4 ≤ 30 Mo), titre et description TikTok, README/CONCEPT.
Voir `PROCEDURE.md` pour les commandes. Économie d'usage : ne pas lancer plus de 3 agents à la fois, committer souvent, ne pas relire les gros fichiers.
