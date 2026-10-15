#!/usr/bin/env bash
# Du texte à la vidéo finale, une fois build/voix.wav et build/timeline.* écrits par voix.py.
#   ./rendu.sh [sortie.mp4]        (par défaut : les-plus-grands-animaux.mp4, version < 30 Mo)
# Étapes : temps des bruitages, musique, rendu des images en 4 parties en parallèle, mixage (musique baissée
# sous la voix), niveau −14 LUFS, encodage en deux passes.
set -euo pipefail
cd "$(dirname "$0")"
OUT="${1:-les-plus-grands-animaux.mp4}"
mkdir -p build/parts
rm -f build/parts/*.mp4 build/parts/log*.txt

node render.mjs piece.html --events
node score.mjs build/score.wav

D=$(node -e "const t=require('./build/timeline.json');console.log((t.duration+2.6).toFixed(3))")
echo "durée de la vidéo : $D s"
for i in 0 1 2 3; do
  a=$(node -e "console.log(($D*$i/4).toFixed(3))"); b=$(node -e "console.log(($D*($i+1)/4+0.001).toFixed(3))")
  node render.mjs piece.html build/parts/p$i.mp4 "$a" "$b" > build/parts/log$i.txt 2>&1 &
done
wait
printf "file 'p0.mp4'\nfile 'p1.mp4'\nfile 'p2.mp4'\nfile 'p3.mp4'\n" > build/parts/list.txt
ffmpeg -y -loglevel error -f concat -safe 0 -i build/parts/list.txt -c copy build/video.mp4

# mixage : voix un peu égalisée, musique baissée sous la voix, bruitages ; puis niveau −14 LUFS (deux passes)
ffmpeg -y -loglevel error -i build/voix.wav -i build/score_music.wav -i build/score_sfx.wav -filter_complex \
  "[0:a]aresample=48000,highpass=f=70,equalizer=f=200:t=q:w=1:g=1,equalizer=f=3500:t=q:w=1.4:g=1.5,acompressor=threshold=0.14:ratio=1.8:attack=8:release=160:makeup=1.2,pan=stereo|c0=c0|c1=c0,asplit=2[vo][key];\
[1:a]volume=0.75[mu];[mu][key]sidechaincompress=threshold=0.03:ratio=2.2:attack=30:release=450[mud];[2:a]volume=0.6[fx];\
[vo][mud][fx]amix=inputs=3:normalize=0:duration=longest,volume=3.6dB,alimiter=limit=0.7:attack=3:release=60:level=false[a]" \
  -map "[a]" -ar 48000 -c:a pcm_s16le build/mix_lim.wav
J=$(ffmpeg -hide_banner -nostats -i build/mix_lim.wav -af loudnorm=I=-14:TP=-1.2:LRA=11:print_format=json -f null - 2>&1 | sed -n '/{/,/}/p')
m() { echo "$J" | grep "\"$1\"" | sed 's/[^0-9.-]*\(-\?[0-9.]*\).*/\1/'; }
ffmpeg -y -loglevel error -i build/mix_lim.wav -af "loudnorm=I=-14:TP=-1.2:LRA=11:measured_I=$(m input_i):measured_TP=$(m input_tp):measured_LRA=$(m input_lra):measured_thresh=$(m input_thresh):offset=0:linear=true,aresample=48000" -c:a pcm_s16le build/mix_final.wav

# encodage en deux passes, environ 29 Mo (l'envoi de fichiers est limité à 30 Mo)
ffmpeg -y -loglevel error -i build/video.mp4 -c:v libx264 -preset slow -tune animation -b:v 3000k -maxrate 4800k -bufsize 9600k -pix_fmt yuv420p -pass 1 -passlogfile build/x264pass -an -f mp4 /dev/null
ffmpeg -y -loglevel error -i build/video.mp4 -i build/mix_final.wav -map 0:v -map 1:a -c:v libx264 -preset slow -tune animation -b:v 3000k -maxrate 4800k -bufsize 9600k -pix_fmt yuv420p -pass 2 -passlogfile build/x264pass -c:a aac -b:a 192k -shortest -movflags +faststart "$OUT"
ls -la "$OUT"
