# Vidéo 1 — « L'animal le plus lourd de l'histoire n'est pas un dinosaure »

Short vertical (1080 × 1920, 30 i/s, 72 s) en pixel art, dans le style de la vidéo TikTok de référence. Chaque image est dessinée en code (canvas), la voix off est une voix IA d'homme en français et la musique est synthétisée.

- `CONCEPT.md` : idée, découpage plan par plan, faits vérifiés.
- `STYLE.md` : palette, rendu, typo, et ce qu'on n'a pas copié de la référence.
- `voix.py` : le texte de la voix (liste `SCRIPT`) et sa synthèse avec une voix d'homme neuronale de Microsoft (Edge, via `edge-tts`). Le texte est lu par paragraphes, le service donne le temps de chaque mot. Écrit `build/voix.wav` et `build/timeline.json` / `build/timeline.js`. Les sous-titres et l'animation se calent dessus. Les paragraphes bruts sont gardés dans `build/edge/<voix>/`.
- `narration.txt` : le même texte, à lire tel quel avec une autre voix (ElevenLabs, enregistrement...).
- `piece.html` : l'animation. `render(f)` dessine l'image `f` à partir du temps seul. Ouvert dans un navigateur, la page joue en boucle.
- `render.mjs` : rend la vidéo avec Chrome ou Chromium (puppeteer-core) et ffmpeg.
- `score.mjs` : la musique et les bruitages, calés sur les mêmes temps (`build/events.json`).

## Licence de la voix

La voix vient du service de lecture à voix haute d'Edge, utilisé par `edge-tts` : l'accès est gratuit mais **non officiel**. Pour une chaîne monétisée, le même type de voix existe dans Azure Speech (licence commerciale, clé à créer, offre gratuite de 500 000 caractères par mois). Il suffit de remplacer `appelle()` dans `voix.py` ; le reste ne change pas.

## Refaire la vidéo

```bash
npm install                                   # puppeteer-core, police Nunito
pip install edge-tts soundfile scipy numpy
python voix.py build                          # voix + temps des mots (réseau nécessaire la première fois)
node render.mjs piece.html --stills 0.6 21.5 47   # contrôle sur quelques images
./rendu.sh                                    # tout le reste : bruitages, musique, rendu en 4 parties (≈ 8 min), mixage, −14 LUFS, encodage < 30 Mo
```

### Une voix moins « machine »

Les voix hors-ligne essayées avant (Kokoro, Piper) étaient trop plates ou trop hachées. Ici la voix est lue par **paragraphes** (`GROUPES` dans `voix.py`), pas phrase par phrase : la mélodie reste continue. Les pauses voulues par l'animation ne font qu'allonger un silence trop court. Le niveau est réglé **une seule fois** pour tout le texte (−19 LUFS), sans porte de bruit ni normalisation phrase par phrase, ce qui évitait les sauts de volume.

`--voix fr-FR-HenriNeural` change de voix, `--debit -8%` ralentit, `--refaire 3,9` refait certains paragraphes. Un nom mal prononcé se corrige dans `PRONONCE` (le sous-titre garde l'écriture normale).

Mixage (fait par `rendu.sh`) : la musique est baissée sous la voix (sidechain), les bruitages non, puis le niveau est amené à −14 LUFS en deux passes.

## Changer le texte

Modifie `SCRIPT` (et `GROUPES` si le découpage en paragraphes change) dans `voix.py`. `[affiché|prononcé]` affiche une chose et en fait dire une autre (« [68|soixante-huit] »). Relance ensuite `voix.py` : seuls les paragraphes dont le texte a changé sont refaits. Les plans suivent les nouveaux temps, parce que `piece.html` lit les débuts de phrase et de mot dans `timeline.js` ; les graphiques de longueur et de poids se calent sur les mots « trente », « Argentinosaurus », « cent quatre-vingt-dix » et « plus ».
