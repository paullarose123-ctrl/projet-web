"""Kyutai TTS 1.6B (anglais / français) : lit les paragraphes du film avec une voix de référence, plusieurs prises par paragraphe.

    python synth_kyutai.py --groups g.json --outdir D [--seed 1] [--voice unmute-prod-website/fabieng-enhanced-v2.wav]
                           [--takes 3] [--pad 1] [--bonus -0.5] [--temp 0.6] [--cfg 2.0] [--ellipse 0.4] [--batch 6]

g.json : liste de {"id": "g1", "text": "...", "bonus": -0.5, "moteur": "..."} (le format de `voix.py --moteur`, plus deux champs facultatifs par paragraphe :
bonus = débit (positif = plus lent, négatif = plus rapide ; à défaut --bonus), moteur = une écriture que le modèle lit mieux que `text`).
Écrit D/prises/<id>_t<k>.wav (24 kHz, mono) pour chaque prise et D/<id>.wav (la première prise ; `choisir_prises.py` la remplace par la meilleure).
Le modèle tourne sur le processeur (bf16) : environ 3 s de calcul par seconde de voix, en lots de plusieurs paragraphes.

Installation (environnement à part : le paquet `moshi` fixe une ancienne version de torch, donc on l'installe sans ses dépendances) :
    uv venv kyu --python 3.12
    uv pip install --python kyu/bin/python torch torchaudio --index-url https://download.pytorch.org/whl/cpu --extra-index-url https://pypi.org/simple --index-strategy unsafe-best-match
    uv pip install --python kyu/bin/python --no-deps "moshi==0.2.11"
    uv pip install --python kyu/bin/python numpy safetensors huggingface_hub einops sentencepiece sphn soundfile pyyaml tqdm
Licences : poids du modèle CC-BY 4.0 ; les voix de référence viennent du dépôt kyutai/tts-voices (voir sa fiche : « unmute-prod-website » et
« voice-donations » sont en CC0, « cml-tts » en CC-BY 4.0 ; « expresso » et « ears » sont réservées à un usage non commercial)."""
import argparse
import json
import os
import re
import shutil
import time

import numpy as np
import soundfile as sf
import torch

ap = argparse.ArgumentParser()
ap.add_argument("--groups", required=True)
ap.add_argument("--outdir", required=True)
ap.add_argument("--seed", type=int, default=1)
ap.add_argument("--voice", default="unmute-prod-website/fabieng-enhanced-v2.wav", help="voix de référence, chemin dans le dépôt kyutai/tts-voices")
ap.add_argument("--takes", type=int, default=3, help="nombre de prises par paragraphe")
ap.add_argument("--pad", type=int, default=1, help="pause forcée entre mots (0 : parole plus serrée)")
ap.add_argument("--bonus", type=float, default=-0.5, help="positif : parole plus lente, négatif : plus rapide (0 : débit naturel du modèle, environ 2,4 mots/s ; -0,5 : environ 2,7)")
ap.add_argument("--temp", type=float, default=0.6, help="température d'échantillonnage (plus haut : plus de variété, plus de risque)")
ap.add_argument("--cfg", type=float, default=2.0)
ap.add_argument("--ellipse", type=float, default=0.4, help="pause (s) ajoutée après « ... » (« Un grand pouvoir implique... un très gros appétit »)")
ap.add_argument("--batch", type=int, default=6)
ap.add_argument("--device", default="auto", help="auto (carte graphique CUDA si présente, sinon processeur), cpu ou cuda : sur une carte graphique la synthèse est bien plus rapide que le temps réel")
a = ap.parse_args()

torch.set_num_threads(int(os.environ.get("TORCH_THREADS", "4")))
from moshi.models.loaders import CheckpointInfo
from moshi.models.tts import DEFAULT_DSM_TTS_REPO, TTSModel

groups = json.load(open(a.groups, encoding="utf-8"))
os.makedirs(os.path.join(a.outdir, "prises"), exist_ok=True)
ck = CheckpointInfo.from_hf_repo(DEFAULT_DSM_TTS_REPO)
dev = ("cuda" if torch.cuda.is_available() else "cpu") if a.device == "auto" else a.device
tts = TTSModel.from_checkpoint_info(ck, n_q=32, temp=a.temp, device=dev, dtype=torch.bfloat16)
vp = tts.get_voice_path(a.voice)


def texte_moteur(t):
    """Le texte tel que le lit le modèle : « : » devient une virgule (il l'ignorerait), « ... » est suivi d'une vraie pause (balise <break>)."""
    t = t.replace(":", ",")
    return re.sub(r"\.\.\.\s+", f'... <break time="{a.ellipse:.2f}s"/> ', t) if a.ellipse > 0 else t


# un lot = des paragraphes de même débit (le réglage de débit est celui du modèle entier)
todo = [(g, k) for g in groups for k in range(a.takes) if not os.path.exists(os.path.join(a.outdir, "prises", f"{g['id']}_t{k}.wav"))]
todo.sort(key=lambda gk: (gk[0].get("bonus", a.bonus), len(gk[0]["text"]), gk[0]["id"], gk[1]))      # même débit, puis longueurs voisines (un lot dure autant que son plus long paragraphe)
tot_a = tot_t = 0.0
lots, cur = [], []
for gk in todo:
    if cur and (len(cur) >= a.batch or cur[0][0].get("bonus", a.bonus) != gk[0].get("bonus", a.bonus)):
        lots.append(cur)
        cur = []
    cur.append(gk)
if cur:
    lots.append(cur)
for i, chunk in enumerate(lots):
    tts.padding_bonus = chunk[0][0].get("bonus", a.bonus)
    torch.manual_seed(a.seed * 100003 + i)
    entries = [tts.prepare_script([texte_moteur(g.get("moteur", g["text"]))], padding_between=a.pad) for g, _ in chunk]
    attrs = [tts.make_condition_attributes([vp], cfg_coef=a.cfg) for _ in chunk]
    t0 = time.time()
    res = tts.generate(entries, attrs)
    tot_t += time.time() - t0
    for b, (g, k) in enumerate(chunk):
        end = res.end_steps[b]
        frames = res.frames[tts.delay_steps: (end + tts.delay_steps + 3 if end is not None else None)]
        with tts.mimi.streaming(1), torch.no_grad():
            pcm = np.concatenate([np.clip(tts.mimi.decode(f[b:b + 1, 1:, :]).cpu().numpy()[0, 0], -1, 1) for f in frames])
        sf.write(os.path.join(a.outdir, "prises", f"{g['id']}_t{k}.wav"), pcm, int(tts.mimi.sample_rate))
        tot_a += len(pcm) / tts.mimi.sample_rate
    print(f"lot {i + 1}/{len(lots)} : {len(chunk)} prises (débit {tts.padding_bonus:+.1f}), {tot_a:.0f} s de voix en {tot_t:.0f} s", flush=True)
for g in groups:                                   # par défaut, la première prise ; choisir_prises.py garde la meilleure
    f = os.path.join(a.outdir, f"{g['id']}.wav")
    if not os.path.exists(f):
        shutil.copy(os.path.join(a.outdir, "prises", f"{g['id']}_t0.wav"), f)
