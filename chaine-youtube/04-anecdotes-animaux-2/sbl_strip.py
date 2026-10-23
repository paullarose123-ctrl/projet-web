import sys
from PIL import Image
# usage: sbl_strip.py out.png scale crop(x0,y0,x1,y1) files...
out=sys.argv[1]; sc=float(sys.argv[2]); crop=tuple(int(v) for v in sys.argv[3].split(',')); fs=sys.argv[4:]
ims=[Image.open(f).convert('RGB').crop(crop) for f in fs]
w,h=ims[0].size
cols=int(sys.argv[0] and 2)
sheet=Image.new('RGB',(w,h*len(ims)))
for i,im in enumerate(ims): sheet.paste(im,(0,i*h))
sheet.save(out)
