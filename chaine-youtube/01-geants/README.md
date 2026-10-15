# Vidéo 1 — « Le plus grand animal de l'histoire n'est pas un dinosaure »

Short vertical (1080 × 1920, 30 i/s, 65 s) en pixel art, dans le style de la vidéo TikTok de référence. Chaque image est dessinée en code (canvas) ; la voix off est une voix IA française et la musique est synthétisée.

- `CONCEPT.md` : idée, découpage plan par plan, faits vérifiés.
- `STYLE.md` : palette, rendu, typo, et ce qu'on n'a pas copié de la référence.
- `voix.py` : le texte de la voix (liste `SCRIPT`) et sa synthèse avec Kokoro (voix `ff_siwis`). Écrit `build/voix.wav` et le temps de chaque mot (`build/timeline.json`, `build/timeline.js`). Les sous-titres et l'animation se calent dessus.
- `piece.html` : l'animation. `render(f)` dessine l'image `f` à partir du temps seul. Ouvert dans un navigateur, la page joue en boucle.
- `render.mjs` : rend la vidéo avec Chrome ou Chromium (puppeteer-core) et ffmpeg.
- `score.mjs` : la musique et les bruitages, calés sur les mêmes temps (`build/events.json`).

## Refaire la vidéo

```bash
npm install                                   # puppeteer-core, police Nunito
pip install kokoro-onnx soundfile onnx
python kokoro_timed.py modeles                # une fois : modèle Kokoro avec durées
python voix.py modeles build                  # voix + temps des mots
node render.mjs piece.html --stills 0.6 21.5 47   # contrôle sur quelques images
node render.mjs piece.html build/video.mp4    # image (≈ 6 min ; on peut découper : … build/p0.mp4 0 16.3)
node render.mjs piece.html --events           # temps des bruitages
node score.mjs build/score.wav                # musique + bruitages (score_music / score_sfx)
```

Mixage final : la musique est baissée sous la voix (sidechain), les bruitages non. Le niveau visé est −14 LUFS.

```bash
cd build
ffmpeg -i voix.wav -i score_music.wav -i score_sfx.wav -filter_complex "[0:a]aresample=48000,highpass=f=75,equalizer=f=220:t=q:w=1:g=1.5,equalizer=f=3500:t=q:w=1.4:g=2,acompressor=threshold=0.1:ratio=2.5:attack=5:release=120:makeup=1.6,pan=stereo|c0=c0|c1=c0,asplit=2[vo][key];[1:a]volume=0.75[mu];[mu][key]sidechaincompress=threshold=0.03:ratio=2.2:attack=30:release=450[mud];[2:a]volume=0.6[fx];[vo][mud][fx]amix=inputs=3:normalize=0:duration=longest,volume=3.6dB,alimiter=limit=0.7:attack=3:release=60:level=false" -ar 48000 mix_lim.wav
ffmpeg -i mix_lim.wav -af loudnorm=I=-14:TP=-1.2:LRA=11:print_format=json -f null -     # relever les mesures
ffmpeg -i mix_lim.wav -af "loudnorm=I=-14:TP=-1.2:LRA=11:measured_I=…:measured_TP=…:measured_LRA=…:measured_thresh=…:linear=true" mix_final.wav
ffmpeg -i video.mp4 -i mix_final.wav -map 0:v -map 1:a -c:v libx264 -preset slow -crf 17 -tune animation -pix_fmt yuv420p -c:a aac -b:a 256k -shortest -movflags +faststart final.mp4
```

## Changer le texte

Modifie `SCRIPT` dans `voix.py`. `[affiché|prononcé]` affiche une chose et en fait dire une autre (« [68|soixante-huit] »). Un nom mal lu par la voix s'écrit en phonèmes entre chevrons (« [Quetzalcoatlus|<kɛtsalkɔatlˈys>] »). Relance ensuite `voix.py`. Les plans suivent les nouveaux temps, parce que `piece.html` lit les débuts de phrase et de mot dans `timeline.js`.
