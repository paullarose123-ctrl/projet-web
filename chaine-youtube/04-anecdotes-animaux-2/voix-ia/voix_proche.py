"""Trouve, parmi les voix de référence utilisables de kyutai/tts-voices, celle qui ressemble le plus à une voix donnée (par le timbre).

    python voix_proche.py ref.wav [--segments 0:3.2,5:9] [--sortie classement.json] [--licences unmute-prod-website,voice-donations,cml-tts]

La voix donnée n'est jamais copiée : on la MESURE (empreinte de locuteur ECAPA, speechbrain/spkrec-ecapa-voxceleb) et on classe les voix libres de droits
par similarité cosinus. Ensuite, pour les 5 à 8 premières, on fait lire une phrase du film par Kyutai (synth_kyutai.py --voice <chemin>) et on remesure la
similarité, la hauteur médiane, l'étendue de hauteur et le débit de la lecture synthétique (la voix donnée pour la vidéo 3 : hauteur médiane 123 Hz, étendue
p10 à p90 12 demi-tons, 3,4 mots/s). Licences : unmute-prod-website et voice-donations sont en CC0 ; cml-tts en CC-BY 4.0 (mentionner CML-TTS) ;
expresso, ears et vctk sont réservées à un usage non commercial (exclues par défaut).

Installation (dans l'environnement des mesures) : pip install speechbrain hyperpyyaml sentencepiece requests soundfile torchaudio huggingface_hub
"""
import argparse
import json
import warnings

warnings.filterwarnings("ignore")
import numpy as np
import soundfile as sf
import torch
import torchaudio
from huggingface_hub import HfApi, hf_hub_download
from speechbrain.inference.speaker import EncoderClassifier

ap = argparse.ArgumentParser()
ap.add_argument("ref", help="enregistrement de la voix à imiter (wav ; la musique de fond fausse la mesure)")
ap.add_argument("--segments", default="", help="plages de parole à utiliser, « début:fin » en secondes séparées par des virgules (par défaut tout le fichier, par morceaux de 6 s)")
ap.add_argument("--sortie", default="classement_voix.json")
ap.add_argument("--licences", default="unmute-prod-website,voice-donations,cml-tts")
ap.add_argument("--top", type=int, default=40)
a = ap.parse_args()
torch.set_num_threads(2)
enc = EncoderClassifier.from_hparams(source="speechbrain/spkrec-ecapa-voxceleb", savedir="ecapa", run_opts={"device": "cpu"})


def emb(x, sr):
    x = torch.from_numpy(np.asarray(x, np.float32))
    x = x.mean(-1) if x.ndim > 1 else x
    if sr != 16000:
        x = torchaudio.functional.resample(x, sr, 16000)
    with torch.inference_mode():
        e = enc.encode_batch(x.unsqueeze(0)).squeeze()
    return torch.nn.functional.normalize(e, dim=0).numpy()


x, sr = sf.read(a.ref)
plages = [tuple(map(float, s.split(":"))) for s in a.segments.split(",") if s] or [(t, min(t + 6, len(x) / sr)) for t in np.arange(0, len(x) / sr - 2, 6)]
ref = np.mean([emb(x[int(p * sr):int(q * sr)], sr) for p, q in plages if q - p > 2], 0)
ref /= np.linalg.norm(ref)
files = HfApi().list_repo_files("kyutai/tts-voices")
ok = tuple(a.licences.split(","))
cand = [f for f in files if f.endswith(".wav") and not f.endswith("_enhanced.wav") and f.split("/")[0] in ok]
res = {}
for f in cand:
    try:
        v, r = sf.read(hf_hub_download("kyutai/tts-voices", f))
        res[f] = float(emb(v[: r * 12], r) @ ref)
    except Exception as e:
        print("échec", f, repr(e)[:80])
json.dump(res, open(a.sortie, "w"), indent=1)
for f, s in sorted(res.items(), key=lambda kv: -kv[1])[: a.top]:
    print(f"{s:.3f}  {f}")
