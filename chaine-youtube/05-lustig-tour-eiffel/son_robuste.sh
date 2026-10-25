#!/usr/bin/env bash
# Essais de robustesse : variantes de timeline / d'événements (son_variante.mjs), rendu complet de chacune, contrôles (attaques de musique sur les mots finaux, NaN, premier / dernier échantillon),
# et, pour la voix ×0,85 et ×1,15, simulation du mixage de rendu.sh avec la voix étirée (atempo). Écrit le compte rendu dans build/test/robuste.txt
cd "$(dirname "$0")"; mkdir -p build/test; node son_variante.mjs > /dev/null
ffmpeg -y -loglevel error -i build/voix.wav -af atempo=1.176471 build/test/voix_court.wav; ffmpeg -y -loglevel error -i build/voix.wav -af atempo=0.869565 build/test/voix_long.wav
for v in court long mots sansc3 noev noshots vide sale; do
  echo "== $v"
  node score.mjs build/test/var_$v.wav --events build/test/var_${v}_events.json --timeline build/test/var_${v}_timeline.json --check 2>&1 | grep -v "^   \|mots finaux\|lieux\|groove"
  node son_trous.mjs build/test/var_$v | head -1
done
for v in court long; do echo "== mixage voix $v"; TLF=build/test/var_${v}_timeline.json MIXDIR=build/test node son_mix.mjs build/test/var_$v build/test/voix_$v.wav build/test/var_${v}_events.json 2>&1 | sed -n '1,3p;5,21p'; done
