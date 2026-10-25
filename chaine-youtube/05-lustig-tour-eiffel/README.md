# Vidéo 5 : « L'homme qui a vendu la tour Eiffel »

Vidéo verticale (1080 × 1920, 30 i/s, ≈ 65 s) de la chaîne Raisins : Victor Lustig, Paris 1925. Même moteur pixel art, même voix (CML-TTS 928) que les épisodes précédents. Dossier généré par `../nouvel-episode.mjs` (voir `PROCEDURE.md`).

Fichier livré : `lustig-tour-eiffel.mp4` (non versionné : `*.mp4` est ignoré ; se refait avec `VOIX=ia PY=<python> ./rendu.sh lustig-tour-eiffel.mp4`).

| | |
|---|---|
| `script.md`, `CONCEPT.md`, `STYLE.md`, `faits.md`, `BRIEF.md`, `GUIDE.md` | le texte de l'auteur, le film plan par plan, le style, les faits vérifiés, le brief des artistes, les conventions du moteur |
| `voix.py`, `voix-ia/`, `build/ext/cml928/`, `build/timeline.*` | texte, synthèse, prises retenues, timeline réelle (versionnées) ; `build/voix_lustig.sh` refait la voix |
| `sc_lustig_sprites.js` (`lu_`), `sc_paris_sprites.js` (`pa_`), `sc_hotel_sprites.js` (`ho_`) | personnages (Lustig, Poisson, cinq marchands), Paris 1925 (tour, café, rue, gare, train, commissariat), hôtel de luxe et accessoires (tampon, documents, mallette) |
| `sc_intro.js`, `sc_idee.js`, `sc_faux.js`, `sc_piege.js`, `sc_honte.js`, `sc_fin.js` | les plans de chaque segment ; `son_<segment>.md` décrit le son de chaque plan |
| `score.mjs`, `son_notes.md` | musique (jazz-manouche / musette), ambiances, bruitages ; `rendu.sh` mixe, −14 LUFS |
| `ETAT.md` | état d'avancement et reprise |

Licences et mentions : voix de synthèse (étiquette « contenu généré par IA ») ; modèle Kyutai TTS 1.6B (CC-BY 4.0) avec la voix de référence CML-TTS (CC-BY 4.0 : mentionner « CML-TTS ») ; musique, ambiances, bruitages synthétisés par code.
