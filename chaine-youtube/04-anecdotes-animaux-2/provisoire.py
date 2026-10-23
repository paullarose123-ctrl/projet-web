"""Timeline PROVISOIRE (temps estimés d'après la longueur des mots) pour dessiner les plans avant que la voix soit prête.

    python provisoire.py [build]

Écrit build/timeline.json et build/timeline.js au même format que voix.py (mêmes phrases, mêmes mots affichés) : les plans qui
s'appuient sur wt(id, mot) fonctionnent déjà ; quand la vraie voix est faite, voix.py réécrit ces deux fichiers et tout se recale.
Attention : ne jamais lancer ce script après la vraie voix (il écraserait la vraie timeline).
"""
import json
import os
import sys

import voix

sortie = sys.argv[1] if len(sys.argv) > 1 else "build"
os.makedirs(sortie, exist_ok=True)
if os.path.exists(f"{sortie}/voix.wav"):
    sys.exit("build/voix.wav existe : la vraie voix est déjà là, on ne la remplace pas par une estimation")
t = voix.START
phrases = []
for pid, pause, line in voix.SCRIPT:
    words = []
    t0 = t
    for show, say in voix.parse(line):
        n = sum(c.isalpha() for c in say)
        d = 0.07 + 0.046 * n
        words.append({"w": show, "t0": round(t, 3), "t1": round(t + d, 3)})
        t += d + (0.16 if show.endswith((",", ":")) else 0.02)
    t1 = words[-1]["t1"]
    phrases.append({"id": pid, "t0": words[0]["t0"], "t1": t1, "words": words, "text": line})
    t = t1 + pause * voix.PAUSE_K + voix.ENTRE
tl = {"duration": round(t, 3), "voix": "provisoire", "phrases": phrases}
json.dump(tl, open(f"{sortie}/timeline.json", "w"), ensure_ascii=False, indent=1)
open(f"{sortie}/timeline.js", "w").write("window.TL = " + json.dumps(tl, ensure_ascii=False) + ";\n")
print("durée estimée :", tl["duration"], "s")
for p in phrases:
    print(f"  {p['id']:6s} {p['t0']:6.2f} → {p['t1']:6.2f}  {p['text'][:70]}")
