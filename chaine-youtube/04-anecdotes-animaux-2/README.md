# Vidéo 4 : « 3 anecdotes complètement folles sur les animaux — Épisode 2 »

Vidéo verticale (1080 × 1920, 30 i/s, ≈ 61 s) de la chaîne Raisins : le scarabée bombardier qui crache un jet à ≈ 100 °C, le basilic qui court sur l'eau, l'anguille électrique d'Amazonie à 860 volts. Même moteur pixel art, même voix (CML-TTS 928) et même scientifique que l'épisode 1 (`../03-anecdotes-animaux/`).

Fichier livré : `3-anecdotes-folles-animaux-2.mp4` (non versionné : `*.mp4` est ignoré ; se refait avec `VOIX=ia ./rendu.sh 3-anecdotes-folles-animaux-2.mp4`).

## Où est quoi

| | |
|---|---|
| `CONCEPT.md`, `STYLE.md` (hérité de l'épisode 1), `GUIDE.md`, `BRIEF-EP2.md` | le film plan par plan, le style, les conventions du moteur, le brief donné aux artistes (faits et réserves compris) |
| `voix.py`, `voix-ia/` | texte (SCRIPT / GROUPES), synthèse Kyutai, choix des prises, alignement mot à mot ; `build/ext/cml928/` = les prises retenues ; `build/timeline.*` versionnés |
| `engine.js`, `scientist.js`, `cadre.js`, `shots.js`, `piece.js`, `outro.js` | moteur, scientifique, cases du carnet (`BETES`, `ICONES`), segments `intro, sca, bas, ang, fin`, plan de sortie |
| `sc_scarabee*.js`, `sc_basilic*.js`, `sc_anguille*.js` | sprites (`sb_`, `ba_`, `an_`) et plans de chaque segment ; `son_<nom>.md` décrit le son de chaque plan |
| `sc_intro.js`, `sc_fin.js` | accroche (cases à retourner, salle de cinéma, claquette) et finale (trois cartes, « 1 · 2 · 3 ? ») |
| `score.mjs`, `son_notes.md` | musique, ambiances (prairie, laboratoire, jungle, Amazonie), bruitages ; `rendu.sh` mixe, −14 LUFS, x264 deux passes |
| `check.mjs`, `bords.mjs`, `valide.mjs`, `sheet.mjs`, `strip.mjs`, `still.mjs`, `solo.mjs` | contrôles, images (`still.mjs` : une image pleine définition, recadrable), pages par segment (`node solo.mjs sca|bas|ang|intro|fin`) |
| `son_*.mjs` | outils d'essai de la partition (mesures, spectrogrammes) |

## Refaire la vidéo

```bash
npm install                                   # + Chrome, ffmpeg, Python (voir ../03-anecdotes-animaux/REPRISE.md)
FW_ROOT=... python voix.py build --moteur true --etiquette cml928      # voix.wav et timeline depuis les prises retenues
node check.mjs 6 && node bords.mjs && node valide.mjs                  # contrôles
VOIX=ia PY=<python> ./rendu.sh 3-anecdotes-folles-animaux-2.mp4       # événements → musique → rendu en 4 parties → mixage → encodage
FW_ROOT=... python production/verif_final.py 3-anecdotes-folles-animaux-2.mp4
```

## Licences et mentions

- Voix : **voix de synthèse** (étiquette « contenu généré par IA » à activer) ; modèle Kyutai TTS 1.6B (CC-BY 4.0) avec la voix de référence **CML-TTS français, locuteur 928** (CC-BY 4.0 : mentionner « CML-TTS »).
- Musique, ambiances, bruitages : synthétisés par code, aucun fichier tiers.
- Réserves d'exactitude : `CONCEPT.md` (« Faits et réserves ») : « petite explosion » est une image ; le basilic ne court que sur une courte distance ; 860 V = `Electrophorus voltai` (2019), ≈ 3,7 × 230 V.
