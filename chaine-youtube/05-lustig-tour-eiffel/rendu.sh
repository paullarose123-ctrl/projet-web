#!/usr/bin/env bash
# Du texte à la vidéo finale, une fois build/voix.wav et build/timeline.* écrits par voix.py.
#   ./rendu.sh [sortie.mp4]        (par défaut : la-toile-de-spider-man.mp4, version < 30 Mo)
# Étapes : temps des bruitages, musique, rendu des images en 4 parties en parallèle, voix + pièce, mixage (musique baissée
# sous la voix), niveau −14 LUFS, encodage en deux passes.
set -euo pipefail
cd "$(dirname "$0")"
OUT="${1:-la-toile-de-spider-man.mp4}"
PY="${PY:-python}"
# VOIX=ia ./rendu.sh : voix de synthèse neuronale Kyutai (voix-ia/, voix.py --moteur) : peu de traitement (la voix est déjà propre et
#   régulière), un peu de corps vers 160 Hz, compression légère, une pièce discrète pour qu'elle ne sonne pas « à nu » devant la musique.
# VOIX=perso ./rendu.sh : voix enregistrée par l'auteur (montage.py). Pas d'égalisation corrective (elle compensait le côté brillant d'une voix
#   de synthèse), compression un peu plus franche pour lisser une voix parlée, ambiance de pièce plus discrète.
# sans VOIX : voix du service Edge (égalisation corrective, voir plus bas).
case "${VOIX:-edge}" in
  ia)
    VCHAIN="aresample=48000,highpass=f=70,equalizer=f=160:t=q:w=1:g=1.0,acompressor=threshold=0.14:ratio=1.6:attack=15:release=220:makeup=1.1"
    ROOM_ARGS="--humide -22" ;;
  perso)
    VCHAIN="aresample=48000,highpass=f=70,acompressor=threshold=0.12:ratio=2:attack=12:release=220:makeup=1.4"
    ROOM_ARGS="--humide -21" ;;
  *)
    VCHAIN="aresample=48000,highpass=f=70,bass=g=2:f=160:w=0.8,equalizer=f=2200:t=q:w=1:g=-2,equalizer=f=4800:t=q:w=1.2:g=-1.5,acompressor=threshold=0.16:ratio=1.5:attack=10:release=200:makeup=1.1"
    ROOM_ARGS="" ;;
esac
mkdir -p build/parts
if [ -z "${SKIP_RENDER:-}" ]; then rm -f build/parts/*.mp4 build/parts/log*.txt; fi

D=$(node -e "const e=require('./build/events.json');console.log(e.dur.toFixed(3))" 2>/dev/null || true)
if [ -z "${SKIP_RENDER:-}" ]; then      # SKIP_RENDER=1 ./rendu.sh : refait seulement le mixage et l'encodage
node render.mjs piece.html --events
node score.mjs build/score.wav
"$PY" room.py build/voix.wav build/voix_piece.wav $ROOM_ARGS

D=$(node -e "const e=require('./build/events.json');console.log(e.dur.toFixed(3))")
echo "durée de la vidéo : $D s"
for i in 0 1 2 3; do
  a=$(node -e "console.log(($D*$i/4).toFixed(3))"); b=$(node -e "console.log(($D*($i+1)/4+0.001).toFixed(3))")
  node render.mjs piece.html build/parts/p$i.mp4 "$a" "$b" > build/parts/log$i.txt 2>&1 &
done
wait
printf "file 'p0.mp4'\nfile 'p1.mp4'\nfile 'p2.mp4'\nfile 'p3.mp4'\n" > build/parts/list.txt
ffmpeg -y -loglevel error -f concat -safe 0 -i build/parts/list.txt -c copy build/video.mp4
fi

# mixage : voix un peu égalisée (un peu de corps vers 160 Hz, moins de « nasal » vers 2 kHz et de dureté vers 5 kHz : la voix de synthèse est plus brillante qu'une voix enregistrée), musique baissée sous la voix, bruitages ; puis niveau −14 LUFS (deux passes)
ffmpeg -y -loglevel error -i build/voix_piece.wav -i build/score_music.wav -i build/score_sfx.wav -filter_complex \
  "[0:a]${VCHAIN},apad=whole_dur=$D,pan=stereo|c0=c0|c1=c0,asplit=3[vo][key][key2];\
[1:a]volume=0.7[mu];[mu][key]sidechaincompress=threshold=0.03:ratio=2.2:attack=30:release=450[mud];[2:a]volume=0.6[fx0];[fx0][key2]sidechaincompress=threshold=0.04:ratio=2.5:attack=15:release=250[fx];\
[vo][mud][fx]amix=inputs=3:normalize=0:duration=longest,volume=3.6dB,alimiter=limit=0.7:attack=3:release=60:level=false[a]" \
  -map "[a]" -ar 48000 -c:a pcm_s16le build/mix_lim.wav
J=$(ffmpeg -hide_banner -nostats -i build/mix_lim.wav -af loudnorm=I=-14:TP=-1.2:LRA=11:print_format=json -f null - 2>&1 | sed -n '/{/,/}/p')
m() { echo "$J" | grep "\"$1\"" | sed 's/[^0-9.-]*\(-\?[0-9.]*\).*/\1/'; }
ffmpeg -y -loglevel error -i build/mix_lim.wav -af "loudnorm=I=-14:TP=-1.2:LRA=11:measured_I=$(m input_i):measured_TP=$(m input_tp):measured_LRA=$(m input_lra):measured_thresh=$(m input_thresh):offset=0:linear=true,aresample=48000" -c:a pcm_s16le build/mix_final.wav

# encodage en deux passes, environ 29 Mo (l'envoi de fichiers est limité à 30 Mo). Le pixel art tramé a besoin d'un réglage
# particulier : pas de filtre anti-blocs (no-deblock) et pas de « tune animation » (qui le lisse et efface le tramage) ; mesuré : SSIM 0,996
# contre 0,93 avec « -tune animation » à 3 Mbit/s.
X264="no-deblock=1:aq-mode=2:psy-rd=0.6,0"
# débit vidéo : au plus 1750 kbit/s, réduit pour que le fichier tienne dans CIBLE_MO Mo (2^20 octets ; l'envoi est limité à 30 Mo) : un film plus long a moins de débit
D=$(node -e "const e=require('./build/events.json');console.log(e.dur.toFixed(3))")
ABR=192     # pas moins : à 160 kbit/s l'encodeur AAC dépasse 0 dBFS (crête vraie +1,3 dBFS mesurée) sur un transitoire que le mixage garde à −2,9 dBFS
VBR=$(awk -v d="$D" -v c="${CIBLE_MO:-29}" -v a="$ABR" 'BEGIN { v = int(c * 1048576 * 8 / d / 1000 - a - 15); if (v > 1750) v = 1750; print v }')
echo "débit vidéo : ${VBR} kbit/s (audio ${ABR} kbit/s) pour ${D} s"
ffmpeg -y -loglevel error -i build/video.mp4 -t "$D" -c:v libx264 -preset veryslow -b:v ${VBR}k -maxrate $((VBR * 2))k -bufsize $((VBR * 4))k -x264-params "$X264" -pix_fmt yuv420p -pass 1 -passlogfile build/x264pass -an -f mp4 /dev/null
ffmpeg -y -loglevel error -i build/video.mp4 -i build/mix_final.wav -t "$D" -map 0:v -map 1:a -c:v libx264 -preset veryslow -b:v ${VBR}k -maxrate $((VBR * 2))k -bufsize $((VBR * 4))k -x264-params "$X264" -pix_fmt yuv420p -pass 2 -passlogfile build/x264pass -c:a aac -b:a ${ABR}k -shortest -movflags +faststart "$OUT"
ls -la "$OUT"
