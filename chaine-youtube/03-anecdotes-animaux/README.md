# Vidéo 3 : « 3 anecdotes complètement folles sur les animaux »

Vidéo verticale (1080 × 1920, 30 i/s, 66 s, 16 Mo) de la chaîne Raisins : la grenouille des bois qui gèle en Alaska, le lézard à cornes qui projette du sang par les yeux au Mexique, les lycaons qui votent en éternuant en Afrique. Pixel art dessiné entièrement en code (270 × 480 agrandi ×4, palette fixe), ambiance nature, le scientifique de la chaîne (coiffure de l'auteur) en accroche et en finale, sortie « Raisins ». Voix de synthèse (Kyutai TTS, voix de référence CML-TTS français), musique, ambiances et bruitages synthétisés par code.

Fichier livré : `3-anecdotes-folles-animaux.mp4` (non versionné : `*.mp4` est ignoré ; se refait avec `VOIX=ia ./rendu.sh 3-anecdotes-folles-animaux.mp4`).

## Où est quoi

| | |
|---|---|
| `CONCEPT.md`, `STYLE.md`, `GUIDE.md` | le film plan par plan, le style (palettes, lumière, animaux), les conventions du moteur |
| `faits.md` | faits vérifiés avec sources, réserves d'exactitude à communiquer |
| `voix.py`, `voix-ia/` | texte (SCRIPT / GROUPES), synthèse Kyutai, choix des prises, alignement mot à mot ; `build/ext/cml928/` = les prises retenues |
| `engine.js`, `scientist.js`, `cadre.js`, `shots.js`, `piece.js`, `outro.js` | moteur, scientifique, cases du carnet, découpage en segments, plan de sortie |
| `kit.js`, `flore.js` | décors (ciels, reliefs, glace, particules) et végétation ; démos : `kit_demo.js`, `flore_demo.js` |
| `sc_*_sprites.js`, `sc_*.js`, `son_*.md` | animaux (grenouille, lézard + coyote, lycaon), plans de chaque segment, description sonore plan par plan |
| `score.mjs`, `son_notes.md` | musique, 17 ambiances, bruitages de chaque type d'événement ; `rendu.sh` mixe (ducking sous la voix), −14 LUFS, x264 deux passes |
| `check.mjs`, `bords.mjs`, `valide.mjs`, `sheet.mjs`, `strip.mjs`, `solo.mjs` | contrôles (erreurs de dessin, texte hors cadre, plans et événements), images, pages par segment |
| `production/` | workflow des agents (relançable par étape), vérification finale, outil d'aperçu |
| `REPRISE.md` | comment reprendre le travail sur une autre machine |

## Refaire la vidéo

```bash
npm install                                   # + Chrome, ffmpeg, Python (voir REPRISE.md)
FW_ROOT=... python voix.py build --moteur true --etiquette cml928      # voix.wav et timeline depuis les prises retenues
node check.mjs 6 && node bords.mjs && node valide.mjs                  # contrôles
VOIX=ia PY=<python> ./rendu.sh 3-anecdotes-folles-animaux.mp4          # événements → musique → rendu en 4 parties → mixage → encodage
FW_ROOT=... python production/verif_final.py 3-anecdotes-folles-animaux.mp4
```

## Mixage : ce qui a été réglé après mesure

La relecture du mixage par reconnaissance de parole (`production/verif_final.py`) a montré que les bruitages couvraient les derniers mots des phrases (« yeux », « nez »), souvent très doux : dans `score.mjs`, les bruitages « de bruit » sont retardés après le mot et baissés de 11 dB quand leur début tombe sur un mot, les notes de musique de la chute de la blague tombent après « nez », et la musique et les ambiances baissent de 8 dB sur ce mot. Je ne peux pas écouter : tout est vérifié par mesure (−13,9 LUFS, crête vraie −2,3 dBFS, 173 mots sur 179 retrouvés à la bonne place ; les écarts sont des homophones, plus « mètre » et « nez » en fin de phrase).

## Licences et mentions

- Voix : **voix de synthèse** (étiquette « contenu généré par IA » à activer) ; modèle Kyutai TTS 1.6B (CC-BY 4.0) avec la voix de référence **CML-TTS français, locuteur 928** (CC-BY 4.0 : mentionner « CML-TTS »).
- Musique, ambiances, bruitages : synthétisés par code, aucun fichier tiers.
- Faits : `faits.md` ; réserves d'exactitude dans `CONCEPT.md` (lycaons : « voter » est une métaphore des chercheurs ; grenouille : le cœur s'arrête progressivement ; lézard : « presque un mètre » est la valeur prudente).
