# Vidéo 1 — « L'animal le plus lourd de l'histoire n'est pas un dinosaure »

Short vertical (1080 × 1920, 30 i/s, 72 s) en pixel art, dans le style de la vidéo TikTok de référence. Chaque image est dessinée en code (canvas), la voix off est une voix IA d'homme en français et la musique est synthétisée.

- `CONCEPT.md` : idée, découpage plan par plan, faits vérifiés.
- `STYLE.md` : palette, rendu, typo, et ce qu'on n'a pas copié de la référence.
- `voix.py` : le texte de la voix (liste `SCRIPT`) et sa synthèse avec Piper (voix d'homme « pierre »). Écrit `build/voix.wav` et le temps de chaque mot (`build/timeline.json`, `build/timeline.js`). Les sous-titres et l'animation se calent dessus.
- `modeles.py` : télécharge la voix et ajoute au modèle une sortie « durée de chaque phonème » (c'est ce qui donne le temps de chaque mot).
- `piece.html` : l'animation. `render(f)` dessine l'image `f` à partir du temps seul. Ouvert dans un navigateur, la page joue en boucle.
- `render.mjs` : rend la vidéo avec Chrome ou Chromium (puppeteer-core) et ffmpeg.
- `score.mjs` : la musique et les bruitages, calés sur les mêmes temps (`build/events.json`).

## Crédit à mettre dans la description YouTube

> Voix : Piper TTS, voix « Pierre » (UPMC), licence CC BY-SA 4.0 — https://github.com/marytts/upmc-pierre-data

La voix « tom » (`modeles.py modeles tom`) est sous licence AGPLv3 et les voix « miro » et MMS interdisent l'usage commercial : on ne les utilise pas.

## Refaire la vidéo

```bash
npm install                                   # puppeteer-core, police Nunito
pip install onnx onnxruntime phonemizer espeakng-loader soundfile scipy numpy praat-parselmouth sherpa-onnx
python modeles.py modeles pierre              # une fois : voix + durées des phonèmes
python voix.py modeles build --whisper <dossier sherpa-onnx-whisper-small>   # voix + temps des mots
node render.mjs piece.html --stills 0.6 21.5 47   # contrôle sur quelques images
node render.mjs piece.html build/video.mp4    # ≈ 8 min ; on peut découper : … build/p0.mp4 0 18
node render.mjs piece.html --events           # temps des bruitages
node score.mjs build/score.wav                # musique + bruitages (score_music / score_sfx)
```

`--whisper` est facultatif : il sert à vérifier que chaque prise de voix est bien comprise (sans lui, seule la mélodie compte dans le choix).

### Une voix moins « machine »

Le modèle est aléatoire : `voix.py` synthétise chaque phrase 6 fois (jusqu'à 18 si aucune n'est comprise) et garde la prise la plus naturelle. Il rejette celles que Whisper comprend mal, celles qui ont des sauts de hauteur ou une mélodie trop plate, et celles dont la fin de phrase ne suit pas le français (l'affirmation redescend, la suite reste en l'air). Les prises retenues sont dans `build/prises/` : `--refaire id1,id2` ne refait que ces phrases, `--refaire tout` recommence. Le débit varie un peu d'une phrase à l'autre, comme chez un lecteur.

Mixage final : la musique est baissée sous la voix (sidechain), les bruitages non. Le niveau visé est −14 LUFS.

```bash
cd build
ffmpeg -i voix.wav -i score_music.wav -i score_sfx.wav -filter_complex "[0:a]aresample=48000,highpass=f=75,equalizer=f=220:t=q:w=1:g=1.5,equalizer=f=3500:t=q:w=1.4:g=2,acompressor=threshold=0.1:ratio=2.5:attack=5:release=120:makeup=1.6,pan=stereo|c0=c0|c1=c0,asplit=2[vo][key];[1:a]volume=0.75[mu];[mu][key]sidechaincompress=threshold=0.03:ratio=2.2:attack=30:release=450[mud];[2:a]volume=0.6[fx];[vo][mud][fx]amix=inputs=3:normalize=0:duration=longest,volume=3.6dB,alimiter=limit=0.7:attack=3:release=60:level=false" -ar 48000 mix_lim.wav
ffmpeg -i mix_lim.wav -af loudnorm=I=-14:TP=-1.2:LRA=11:print_format=json -f null -     # relever les mesures
ffmpeg -i mix_lim.wav -af "loudnorm=I=-14:TP=-1.2:LRA=11:measured_I=…:measured_TP=…:measured_LRA=…:measured_thresh=…:linear=true" mix_final.wav
ffmpeg -i video.mp4 -i mix_final.wav -map 0:v -map 1:a -c:v libx264 -preset slow -crf 17 -tune animation -pix_fmt yuv420p -c:a aac -b:a 256k -shortest -movflags +faststart final.mp4
```

## Changer le texte

Modifie `SCRIPT` dans `voix.py`. `[affiché|prononcé]` affiche une chose et en fait dire une autre (« [68|soixante-huit] »). Un nom mal lu par la voix s'écrit en phonèmes entre chevrons (« [Quetzalcoatlus|<kɛtsalkɔatlˈys>] »). Relance ensuite `voix.py` avec `--refaire` pour les phrases changées. Les plans suivent les nouveaux temps, parce que `piece.html` lit les débuts de phrase et de mot dans `timeline.js` ; les graphiques de longueur et de poids se calent sur les mots « trente », « Argentinosaurus », « cent quatre-vingt-dix » et « plus ».
