"""Contrôle de la vidéo finale : format, niveau (LUFS, crête vraie), lisibilité de la voix dans le mixage (relecture par reconnaissance de parole, comparée à build/timeline.json).

    FW_ROOT=<dossier du modèle whisper> python production/verif_final.py la-video.mp4"""
import sys, os, re, json, subprocess, difflib
import numpy as np
import os
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, ".."))                    # voix.py de la vidéo
sys.path.insert(0, os.path.join(HERE, "..", "..", "02-spiderman"))   # montage.py, controle_micro.py (outils de la vidéo 2)
import voix, montage, controle_micro as cm
mp4 = sys.argv[1]
p = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "stream=codec_name,width,height,r_frame_rate,duration,bit_rate:format=duration,size", "-of", "json", mp4], capture_output=True, text=True)
j = json.loads(p.stdout); print(json.dumps(j["streams"], ensure_ascii=False)); print("format", j["format"])
e = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", mp4, "-af", "ebur128=peak=true", "-f", "null", "-"], capture_output=True, text=True).stderr
print("sonie :", re.findall(r"I:\s+(-?[\d.]+) LUFS", e)[-1], "LUFS ; crête vraie :", re.findall(r"Peak:\s+(-?[\d.]+) dBFS", e)[-1], "dBFS ; LRA", re.findall(r"LRA:\s+([\d.]+) LU", e)[-1])
x = cm.charge(mp4)
ws = montage.fusionne(voix.mots_whisper(x, 48000))
tl = json.load(open(os.path.join(HERE, "..", "build", "timeline.json")))
exp = [(w["w"], w["t0"], w["t1"]) for ph in tl["phrases"] for w in ph["words"]]
a = [montage.cle(w) for w, _, _ in exp]; b = [montage.cle(w["text"]) for w in ws]
sm = difflib.SequenceMatcher(None, a, b, autojunk=False)
d0 = []; diff = []
for tag, i0, i1, j0, j1 in sm.get_opcodes():
    if tag == "equal":
        for k in range(i1 - i0): d0.append(exp[i0 + k][1] - ws[j0 + k]["t0"])
    else:
        diff.append((tag, " ".join(w for w, _, _ in exp[i0:i1]), " ".join(w["text"] for w in ws[j0:j1]), round(exp[i0][1], 1) if i0 < len(exp) else None))
d0 = np.array(d0)
print(f"mixage relu : {len(d0)}/{len(exp)} mots retrouvés à la même place ; écart de début médian {np.median(np.abs(d0)):.3f} s, p90 {np.percentile(np.abs(d0), 90):.3f} s")
print("écarts :", diff[:14])
