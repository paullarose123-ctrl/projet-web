#!/bin/sh
# Génère la vidéo du générique qui défile, à fond transparent (ProRes 4444).
# Prérequis : generique_fin.png (créé par gen_credits.js + render_png.js) et ffmpeg + python3/Pillow.
python3 - <<'PY'
from PIL import Image
im=Image.open('generique_fin.png').convert('RGBA'); W,H=im.size
x0=(W-1500)//2; im=im.crop((x0,0,x0+1500,H))
c=Image.new('RGBA',(1500,H+2*1080),(0,0,0,0)); c.paste(im,(0,1080)); c.save('padded.png')
PY
# D = distance de défilement (2676 px), T = 20 s de défilement, puis 3 s d'arrêt et 1 s de fondu
Y="2676*if(lt(min(t/20,1),0.8),1.1111*min(t/20,1),1-2.7778*pow(1-min(t/20,1),2))"
ffmpeg -y -loop 1 -framerate 30 -i padded.png -t 24 \
  -vf "crop=1500:1080:0:'$Y',fade=t=out:st=23:d=1:alpha=1,format=yuva444p10le" \
  -c:v prores_ks -profile:v 4444 -qscale:v 28 -vendor apl0 -alpha_bits 8 \
  generique_fin_defilement_transparent.mov
