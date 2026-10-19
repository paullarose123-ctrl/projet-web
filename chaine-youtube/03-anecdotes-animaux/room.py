"""Ajoute à la voix un soupçon de pièce (réverbération courte, environ 0,3 s) pour qu'elle ne sonne pas « à nu » devant la musique.
    python room.py voix.wav voix_piece.wav [--humide -18] [--rt60 0.30]
La résonance est une réponse impulsionnelle synthétique (bruit filtré qui décroît + quelques réflexions précoces), sans fichier extérieur."""
import argparse
import numpy as np
import soundfile as sf
from scipy.signal import butter, sosfilt, fftconvolve

ap = argparse.ArgumentParser()
ap.add_argument("entree"); ap.add_argument("sortie")
ap.add_argument("--humide", type=float, default=-18.0, help="niveau de la réverbération par rapport à la voix (dB)")
ap.add_argument("--rt60", type=float, default=0.30)
a = ap.parse_args()
x, sr = sf.read(a.entree, dtype="float32")
rng = np.random.default_rng(7)
n = int(sr * (a.rt60 * 1.4 + 0.05))
t = np.arange(n) / sr
ir = rng.standard_normal(n) * np.exp(-6.9 * t / a.rt60)
ir = sosfilt(butter(2, [180, 5500], btype="band", fs=sr, output="sos"), ir)
pre = int(0.006 * sr)
ir = np.concatenate([np.zeros(pre), ir])[:n]
for ms, g in [(7, 0.5), (11, -0.4), (17, 0.32), (23, -0.24), (31, 0.16)]:     # réflexions précoces
    k = int(ms * sr / 1000)
    if k < n: ir[k] += g * 0.35
ir /= np.sqrt(np.sum(ir ** 2))
wet = fftconvolve(x, ir)[: len(x)].astype(np.float32)
y = x + wet * 10 ** (a.humide / 20)
sf.write(a.sortie, y, sr)
print(f"pièce : rt60 {a.rt60:.2f} s, humide {a.humide:.0f} dB → {a.sortie}")
