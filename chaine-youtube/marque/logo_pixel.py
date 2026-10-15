"""Réduit le logo (grappe de raisin, 1254 × 1254) en sprite à l'échelle des pixels du film (1 pixel de sprite = 1 pixel du canevas 270 × 480).

    python logo_pixel.py [largeur]     → logo.js (window.LOGO), logo-sprite.png (aperçu ×6)

Découpe la grappe (fond sombre retiré par remplissage depuis les coins), la réduit par moyenne de zone, ramène à une palette
de 12 couleurs fixes (k-means) et écrit les indices dans une chaîne : un caractère par pixel, « . » = transparent."""
import sys, json
import numpy as np
from PIL import Image
from scipy import ndimage

W = int(sys.argv[1]) if len(sys.argv) > 1 else 88
im = Image.open("logo-raisins.webp").convert("RGB")
a = np.array(im).astype(float)
bg = a[:40, :40].reshape(-1, 3).mean(0)
# fond = pixels sombres reliés aux bords : on garde ce qui est clairement coloré + le liseré sombre collé à la grappe
sombre = np.abs(a - bg).sum(2) < 70
lab, n = ndimage.label(sombre)
bords = set(lab[0, :]) | set(lab[-1, :]) | set(lab[:, 0]) | set(lab[:, -1])
fond = np.isin(lab, [b for b in bords if b])
corps = ~fond
corps = ndimage.binary_closing(corps, iterations=6)
corps = ndimage.binary_fill_holes(corps)
ys, xs = np.where(corps)
y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
pad = 6
crop = a[y0 - pad:y1 + pad, x0 - pad:x1 + pad]; mask = corps[y0 - pad:y1 + pad, x0 - pad:x1 + pad]
H = round(W * crop.shape[0] / crop.shape[1])
small = np.array(Image.fromarray(crop.astype(np.uint8)).resize((W, H), Image.BOX)).astype(float)
am = np.array(Image.fromarray((mask * 255).astype(np.uint8)).resize((W, H), Image.BOX)) > 140
# palette : k-means sur les pixels du corps
pts = small[am]
rng = np.random.default_rng(1)
K = 12
cent = pts[rng.choice(len(pts), K, replace=False)]
for _ in range(40):
    d = ((pts[:, None] - cent[None]) ** 2).sum(2); l = d.argmin(1)
    for k in range(K):
        if (l == k).any(): cent[k] = pts[l == k].mean(0)
cent = cent[np.argsort(cent.sum(1))]
idx = ((small[:, :, None] - cent[None, None]) ** 2).sum(3).argmin(2)
chars = "0123456789ab"
rows = ["".join(chars[idx[y, x]] if am[y, x] else "." for x in range(W)) for y in range(H)]
pal = ["#%02x%02x%02x" % tuple(int(round(v)) for v in c) for c in cent]
open("logo.js", "w").write("window.LOGO = " + json.dumps({"w": W, "h": H, "pal": pal, "rows": rows}) + ";\n")
prev = np.zeros((H, W, 4), np.uint8)
for y in range(H):
    for x in range(W):
        if am[y, x]:
            c = cent[idx[y, x]]; prev[y, x] = [*(int(v) for v in c), 255]
Image.fromarray(prev).resize((W * 6, H * 6), Image.NEAREST).save("logo-sprite.png")
print(W, H, pal)
