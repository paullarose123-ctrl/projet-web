from PIL import Image
import sys
NI=['#05040f','#0a0a1f','#10102e','#171a45','#202a62','#2c3c84','#3d55aa','#5878cc','#82a2e4','#b0c8f4']
BL=['#0e1850','#18288a','#2540c0','#3f66e4','#6e96f6']; OC=['#3a1810','#68301a','#964a26','#c06a34','#e08c4a','#f2b274']
AM=['#140a05','#25120a','#3c1d0e','#5a2c12','#7f4016','#a85a1a','#d07a1e','#f2a02a','#ffc84a','#ffe08a','#fff2c4']; WH=['#cfc6b4','#e8e0cc','#fff8e8','#ffffff']; SK=['#5a3226','#84543a','#b27a54','#dba67c','#f4cfa6']
pal={'o':'#05040f','a':OC[3],'O':OC[4],'L':OC[5],'D':OC[2],'A':AM[7],'b':NI[5],'B':BL[2],'h':BL[4],'H':BL[3],'n':NI[4],'d':NI[2],'w':WH[3],'s':SK[4],'e':AM[8]}
rows=[
"...a.........a...",
"....a.......a....",
".....aoooooa.....",
"......oOOLo......",
".....ooooooo.....",
".....oOOLLLo.....",
"....oOOOLLLLo....",
"....oDOOOLLLo....",
"...ooooooooooo...",
]
wo=[5,6,6,6,5,4]
for k,w in enumerate(wo):
    r=['.']*17
    r[8-w]='o'; r[8+w]='o'
    for dx in range(-w+1,w):
        if dx==0: ch='d'
        elif dx<0: ch='n' if dx<=-4 else 'b'
        else: ch='B' if dx==1 else 'H' if dx==2 else 'h' if dx==3 else 'H'
        if k>=4 and dx>0: ch={'h':'H','H':'B','B':'b'}.get(ch,ch)
        if k>=4 and dx<0: ch='n' if dx<=-2 else 'b'
        r[8+dx]=ch
    rows.append(''.join(r))
rows.append(".....ooooooooo.....".replace('.....ooooooooo.....','....ooooooooo....'))   # r15 bottom outline
rows.append("......oAAAo......")
assert len(rows)==17, len(rows)
g=[list(r) for r in rows]
for i,r in enumerate(g): assert len(r)==17,(i,len(r),''.join(r))
# legs (orange, no outline): left and right
def leg(pts, c='O'):
    for (x,y) in pts:
        for xx in (x,16-x):
            if g[y][xx]=='.': g[y][xx]=c
leg([(3,6),(2,5),(1,4),(1,3)])          # avant : vers l'avant
leg([(2,9),(1,9),(0,10)])               # milieu : de côté
leg([(2,12),(1,13),(0,14)])             # milieu arrière
leg([(3,14),(2,15),(2,16)])             # arrière : vers l'arrière
# fix: elytra outline pixel col conflicts ok
rows2=[''.join(r) for r in g]
if len(sys.argv)>1:
    sc=int(sys.argv[1]); bg='#3a2a10'
    im=Image.new('RGB',(17*sc,17*sc),bg)
    for y,r in enumerate(rows2):
        for x,ch in enumerate(r):
            if ch!='.':
                for j in range(sc):
                    for i in range(sc): im.putpixel((x*sc+i,y*sc+j),tuple(int(pal[ch][k:k+2],16) for k in (1,3,5)))
    im.save('build/sca/icon.png')
print('\n'.join(rows2))
