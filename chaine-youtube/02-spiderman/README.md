# Vidéo 2 — « La toile de Spider-Man est-elle possible ? »

Short vertical (1080 × 1920, 30 i/s, environ 2 min 14) en pixel art, chaîne **Raisins**. Chaque image est dessinée en code (canvas), la voix off est une voix de synthèse neuronale (Kyutai TTS, voir `voix-ia/`) ; la voix enregistrée de l'auteur reste possible (`montage.py`). La musique et les bruitages sont synthétisés.

- `CONCEPT.md` : idée, découpage plan par plan, faits vérifiés et sources, réserves d'exactitude.
- `STYLE.md` : palette, rendu, éléments récurrents, plan de sortie, et ce qu'on n'a pas copié des références.
- `narration.txt` : le texte à lire (une ligne par paragraphe enregistré). `voix-perso/script-voix.html` : la même chose en page de lecture pour téléphone, avec une consigne de ton par paragraphe.
- `voix.py` : le texte de la voix (liste `SCRIPT`), le découpage en 18 paragraphes (`GROUPES`), les pauses voulues et les outils communs (alignement du texte sur le son, volumes des paragraphes, limiteur). Fait lire le texte par un moteur de synthèse (`--moteur`, voir `voix-ia/`) ou par le service Edge (ancienne voix, jugée trop « IA »).
- `voix-ia/` : la voix IA. `preparer.py` (les paragraphes à lire), `synth_kyutai.py` (le moteur Kyutai TTS, plusieurs prises par paragraphe), `choisir_prises.py` (choix de la meilleure prise par des mesures), `LISEZ-MOI.md` (recette, comparaison des moteurs essayés, licences).
- `controle_micro.py` : contrôle d'un enregistrement avant le montage (niveau, bruit de fond, écho de pièce, écrêtage, relecture du texte).
- `montage.py` : le montage de la voix enregistrée par l'auteur (variante, voir plus bas). Écrit `build/voix.wav`, `build/timeline.json` / `timeline.js` et `build/montage_rapport.md`.
- `piece.html` + `engine.js`, `city.js`, `lab.js`, `nature.js`, `plates.js`, `props.js`, `props2.js`, `shots.js`, `shots1.js` … `shots4.js`, `outro.js`, `piece.js` : l'animation. `render(f)` dessine l'image `f` à partir du temps seul ; chaque plan lit ses temps dans la voix (`wt('phrase', 'mot')`). Ouvert dans un navigateur, la page joue en boucle. Les coupes sont franches.
- `../marque/` : le logo de la chaîne (grappe de raisin) et `logo_pixel.py`, qui le réduit à l'échelle des pixels du film (`logo.js`).
- `render.mjs` : rend la vidéo avec Chrome ou Chromium (puppeteer-core) et ffmpeg.
- `score.mjs` : musique et bruitages, calés sur les mêmes temps (`build/events.json`).
- `room.py` : ajoute à la voix un soupçon de pièce (réverbération courte) avant le mixage.
- `rendu.sh` : tout le reste, du texte à la vidéo finale (`VOIX=ia` pour la voix de synthèse Kyutai, `VOIX=perso` pour la voix enregistrée).
- `check.mjs`, `bords.mjs`, `sheet.mjs`, `strip.mjs` : outils de contrôle (erreurs de dessin sur tout le film, textes hors cadre, une image par plan, bande d'images d'un plan).

## Refaire la vidéo avec la voix IA (par défaut)

```bash
npm install                                   # puppeteer-core, police Nunito
pip install numpy scipy soundfile pyloudnorm faster-whisper torch torchaudio praat-parselmouth
# le moteur Kyutai a son propre environnement (paquet `moshi`, voir voix-ia/synth_kyutai.py) : « kyu/bin/python » ci-dessous
python voix-ia/preparer.py build/groupes.json                                                                  # les paragraphes à lire
kyu/bin/python voix-ia/synth_kyutai.py --groups build/groupes.json --outdir build/ext/kyutai --takes 3          # 3 prises par paragraphe (environ 12 min)
python voix-ia/choisir_prises.py --groups build/groupes.json --dir build/ext/kyutai --cible 2.8                 # la meilleure prise de chaque paragraphe
python voix.py build --moteur true --etiquette kyutai                                                          # calage mot à mot, pauses, volumes : voix.wav + timeline
node check.mjs                                # dessine tout le film sans rien écrire : doit afficher « erreurs : 0 »
node bords.mjs                                # doit afficher « aucun texte hors cadre »
VOIX=ia ./rendu.sh                            # bruitages, musique, rendu en 4 parties, mixage, −14 LUFS, encodage (< 30 Mo : le débit s'adapte à la durée)
```

Les paragraphes lus, les réglages et la comparaison avec les autres moteurs essayés (VoxCPM2, Edge, autres voix Kyutai) sont dans `voix-ia/LISEZ-MOI.md`. Pour changer de voix, `--voice` (une voix du dépôt `kyutai/tts-voices`).

## Variante : la voix enregistrée par l'auteur

```bash
npm install                                   # puppeteer-core, police Nunito
pip install numpy scipy soundfile pyloudnorm faster-whisper torch torchaudio
# prises : p01.m4a … p18.m4a (un fichier par paragraphe, p05b.m4a = 2e prise du paragraphe 5) et silence.wav (10 s de silence dans la même pièce)
python controle_micro.py prises/p01.m4a --silence prises/silence.wav --texte "…"     # facultatif : qualité d'une prise
python montage.py prises build --silence prises/silence.wav                          # voix + temps des mots + rapport (retouches : voix-perso/retouches.json)
node check.mjs                                # dessine tout le film sans rien écrire : doit afficher « erreurs : 0 »
node bords.mjs                                # doit afficher « aucun texte hors cadre »
VOIX=perso ./rendu.sh                         # bruitages, musique, rendu en 4 parties, mixage, −14 LUFS, encodage < 30 Mo
```

### Ce que fait le montage (`montage.py`)

1. Chaque prise est décodée (mono, 48 kHz) et passée dans un filtre coupe-bas à 75 Hz. Les sons que l'auteur ne veut pas garder (un « mhhh » avant une phrase) sont ensuite remplacés par l'ambiance de la pièce : `voix-perso/retouches.json` donne, par prise, le début et la fin du son en secondes dans la prise brute. On remplace au lieu de couper : le reste de la prise ne bouge pas, et le reconnaisseur ne voit plus qu'une pièce calme à cet endroit. L'ambiance est le passage le plus calme de la même prise (même micro, même niveau), fondu sur 10 ms aux deux bouts.
2. Un reconnaisseur de parole (faster-whisper large-v3-turbo) relit la prise ; on retrouve chaque phrase du texte dans ce qui a été dit. Ce qui n'est pas dans le texte (« paragraphe cinq », un faux départ) est écarté, et une phrase reprise est remplacée par sa dernière version qui convient.
3. Le texte connu est calé mot à mot sur le son (alignement forcé, images de 20 ms) : c'est ce qui donne les temps des sous-titres et des plans. L'alignement place le début d'un mot environ 80 ms trop tard par rapport aux temps du service Edge (mesuré sur 86 mots) : un décalage de 80 ms est corrigé (`BIAIS_DEBUT` dans `voix.py`). Contrôle sur le montage final : un second passage du reconnaisseur donne des débuts de mots à 0,03 s près (médiane), 0,11 s (90 % des mots).
4. Les coupes se font dans les silences, jamais d'après les bords de mots du reconnaisseur (qui se trompe parfois sur un mot mal articulé : une première version coupait ainsi la fin de « Madagascar » et le début de « Sa soie »). La prise est découpée en plages de voix (au moins 0,22 s de calme entre deux plages) ; chaque phrase du texte retrouvée garde la plage entière qui la contient, plus 0,10 s d'ambiance avant et 0,15 s après. Les plages qui ne contiennent aucune phrase (annonce, faux départ) sont écartées et listées dans le rapport. Les silences de plus de 0,7 s (0,9 s après une fin de phrase, 1,3 s après « … ») sont raccourcis au milieu du silence, en gardant 0,15 s après un mot et 0,25 s avant le suivant : on ne coupe pas les respirations.
5. Un gain par paragraphe corrige 70 % de l'écart de volume avec la médiane (pas plus de 6 dB) : une voix volontairement plus basse pour une blague reste plus basse.
6. Les silences entre paragraphes suivent les pauses voulues de `SCRIPT` et sont remplis avec le bruit de la pièce (le fichier de silence), pas avec du silence numérique qui sonnerait « mort ».
7. Un seul réglage de niveau pour tout le texte (−19 LUFS), puis un limiteur à −0,9 dBFS qui raboute quelques pointes (une voix parlée a des pointes bien au-dessus de son niveau moyen).

`VOIX=perso ./rendu.sh` mixe ensuite : coupe-bas, compression légère (2 : 1), pas d'égalisation corrective, ambiance de pièce discrète (−21 dB), musique et bruitages baissés quand la voix parle, niveau −14 LUFS.

Rien de tout cela ne dit comment la voix sonne à l'oreille : seul l'auteur peut juger une intonation. `build/montage_rapport.md` liste pour chaque paragraphe la prise retenue, la voix écartée, ce que le reconnaisseur a entendu (pour repérer un mot mal dit), le gain appliqué et les alertes (coupe en plein son, mot de durée anormale).

### Enregistrer

Voir `voix-perso/script-voix.html` : pièce qui ne résonne pas (placard avec des vêtements), téléphone à 15 ou 20 cm de la bouche, un fichier par paragraphe, 1 à 2 secondes de silence avant et après, un fichier de 10 secondes de silence dans la même pièce.

## Ancienne voix de synthèse (Edge)

Cette voix a été jugée « saccadée » et « trop IA » par l'auteur. `python voix.py build` lit le texte avec la voix Rémy du service de lecture à voix haute d'Edge (accès gratuit mais **non officiel** : pour une chaîne monétisée, le même type de voix existe dans Azure Speech, licence commerciale) ; `--moteur "PYTHON synth.py"` branche un autre moteur (c'est ce que fait la voix IA ci-dessus). Les temps des mots viennent alors du service ou de l'alignement forcé. `./rendu.sh` (sans `VOIX=perso`) applique l'égalisation corrective d'une voix de synthèse.

## Encodage

Le pixel art tramé est un cas difficile pour la vidéo : `-tune animation` active un filtre anti-blocs qui efface le tramage. Mesuré sur 20 s de ce film à 1,7 Mbit/s : réglages par défaut du vidéo 1 (`-tune animation`) SSIM 0,87 ; sans filtre anti-blocs (`no-deblock=1:aq-mode=2:psy-rd=0.6,0`, preset `veryslow`) SSIM 0,996. `rendu.sh` utilise ces derniers à 1 750 kbit/s au plus, réduit pour que le fichier tienne dans 29 Mo (l'envoi de fichiers est limité à 30 Mo) : environ 1 610 kbit/s pour 2 min 14 (et l'audio à 192 kbit/s : à 160, l'encodeur AAC dépassait 0 dBFS).

## Changer le texte

Modifie `SCRIPT` (et `GROUPES` si le découpage en paragraphes change) dans `voix.py`, puis ré-enregistre les paragraphes modifiés et relance `montage.py` : les plans suivent les nouveaux temps, car ils lisent les débuts de phrase et de mot dans `timeline.js`. Si un mot cité par un plan disparaît du texte, `node check.mjs` le signale (« mot … »).
