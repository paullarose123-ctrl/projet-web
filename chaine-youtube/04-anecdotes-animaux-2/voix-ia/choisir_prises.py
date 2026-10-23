"""Choisit la meilleure prise de chaque paragraphe (on ne peut pas écouter : on mesure ce qui se mesure).

    python choisir_prises.py --groups g.json --dir D [--cible 2.9] [--sans-utmos]

Lit D/prises/<id>_t<k>.wav, écrit D/<id>.wav (la meilleure prise) et D/prises_rapport.md.
Pour chaque prise :
  - relecture par faster-whisper (large-v3-turbo) : mots sautés, répétés ou mal dits (écart avec le texte attendu ; les homophones — « sa soie » / « ça soit » —
    comptent comme des écarts pour toutes les prises du paragraphe : ils ne départagent donc rien) ;
  - confiance de l'alignement forcé du texte attendu sur le son (CTC multilingue MMS_FA de torchaudio) : probabilité moyenne des lettres et du mot le moins sûr ;
    c'est la mesure qui voit une syllabe avalée ou mal articulée, que la relecture, qui devine d'après le sens, ne voit pas ;
  - débit en mots par seconde (cible : celui qui garde le film à la durée voulue, 2,9 par défaut) ;
  - hauteur de la voix (parselmouth) : sauts de plus de 7 demi-tons entre deux images voisées (défaut typique d'une voix de synthèse),
    étendue p10–p90 et pente moyenne, à comparer à des narrations humaines (étendue 6 à 11 demi-tons, pente 30 à 35 demi-tons par seconde),
    et écart de la hauteur médiane à celle des autres paragraphes (la voix ne doit pas changer d'un paragraphe à l'autre) ;
  - queue très faible après le dernier mot (un « e » final prononcé « euh », un souffle) ;
  - plus long silence à l'intérieur de la prise (une voix « hachée » a des trous) ;
  - naturalité prédite UTMOS22 (si le modèle est téléchargeable : torch.hub tarepan/SpeechMOS) : sert à départager des prises proches.
Le score pénalise surtout les mots mal dits, ensuite les sauts de hauteur, les trous et l'écart de débit. Ce n'est pas une oreille : le rapport
liste les mesures de chaque prise pour qu'on puisse relire le choix."""
import argparse
import difflib
import json
import math
import os
import re
import shutil
import sys

import numpy as np
import soundfile as sf
from scipy.signal import resample_poly

NUM = {"2": "deux", "2013": "deux mille treize", "6": "six", "10": "dix", "1": "un", "3": "trois"}


def mots(s):
    out = []
    s = re.sub(r"\s+'", "'", s.lower().replace("’", "'")).replace("spider man", "spiderman").replace("spider-man", "spiderman")
    for x in re.findall(r"[\wéèêàâîôûçùïœ']+", s):
        out += NUM.get(x, x).split()
    return out


def charge(path, sr_out):
    a, sr = sf.read(path, dtype="float32")
    a = a.mean(1) if a.ndim > 1 else a
    if sr != sr_out:
        g = math.gcd(sr, sr_out)
        a = resample_poly(a, sr_out // g, sr // g).astype(np.float32)
    return a


def hauteur(a, sr):
    import parselmouth
    p = parselmouth.Sound(a, sampling_frequency=sr).to_pitch_ac(time_step=0.01, pitch_floor=65, pitch_ceiling=300, very_accurate=True)
    f = p.selected_array["frequency"]
    v = f > 0
    if v.sum() < 20:
        return {"f0": 0, "etendue": 0.0, "pente": 0.0, "sauts": 99}
    med = float(np.median(f[v]))
    st = 12 * np.log2(f[v] / med)
    d = np.abs(np.diff(12 * np.log2(np.where(f > 0, f, np.nan) / med)))
    d = d[~np.isnan(d)]
    return {"f0": round(med), "etendue": round(float(np.percentile(st, 90) - np.percentile(st, 10)), 1), "pente": round(float(np.mean(d) / 0.01), 1), "sauts": int((d > 7).sum())}


def trous(a, sr):
    """Plus long silence entre le premier et le dernier son (s)."""
    w = int(0.02 * sr)
    env = np.convolve(np.abs(a), np.ones(w) / w, mode="same")
    loud = np.where(env > 0.03 * env.max())[0]
    if len(loud) < 2:
        return 0.0
    q = env[loud[0]:loud[-1]] < 0.02 * env.max()
    best = run = 0
    for s in q:
        run = run + 1 if s else 0
        best = max(best, run)
    return best / sr


_FA = None


def confiance(x24, mots_attendus):
    """Confiance de l'alignement forcé (MMS_FA) : probabilité moyenne des lettres, et moyenne du mot le moins sûr (0 à 1)."""
    global _FA
    import torch
    import torchaudio
    import torchaudio.functional as AF
    if _FA is None:
        b = torchaudio.pipelines.MMS_FA
        _FA = (b.get_model(with_star=False).eval(), b.get_dict(star=None), b.sample_rate)
    model, dico, fsr = _FA
    g = math.gcd(fsr, 24000)
    x = torch.from_numpy(resample_poly(x24, fsr // g, 24000 // g).astype(np.float32)).unsqueeze(0)
    with torch.inference_mode():
        em, _ = model(x)
    def rom(m):
        import unicodedata
        m = unicodedata.normalize("NFKD", m.lower().replace("œ", "oe").replace("’", "'")).encode("ascii", "ignore").decode()
        return re.sub(r"[^a-z']", "", m)
    r = [rom(w) for w in mots_attendus]
    r = [w for w in r if w]
    cibles = torch.tensor([[dico[c] for w in r for c in w]], dtype=torch.int32)
    al, sc = AF.forced_align(em, cibles, blank=0)
    spans = AF.merge_tokens(al[0], sc[0].exp())
    k, par_mot = 0, []
    for w in r:
        sp = spans[k:k + len(w)]
        k += len(w)
        par_mot.append(float(np.mean([t.score for t in sp])))
    toutes = [t.score for t in spans]
    return {"conf_moy": round(float(np.mean(toutes)), 3), "conf_min_mot": round(float(min(par_mot)), 3)}


def queue_fin(a, sr):
    """Durée (s) entre le dernier instant à plus de 3 % et le dernier à plus de 1 % du maximum (enveloppe de 10 ms) : une longue queue très faible
    est souvent un « e » final prononcé « euh » (« galère-euh ») ou un souffle."""
    w = int(0.01 * sr)
    env = np.sqrt(np.convolve(a ** 2, np.ones(w) / w, mode="same"))
    d1, d3 = np.where(env > 0.01 * env.max())[0], np.where(env > 0.03 * env.max())[0]
    return float((d1[-1] - d3[-1]) / sr) if len(d1) and len(d3) else 0.0


def charge_utmos():
    """UTMOS22 (SpeechMOS) : soit les fichiers locaux (SPEECHMOS_SRC = dossier du paquet speechmos, UTMOS_PT = poids .pt), soit torch.hub."""
    try:
        import torch
        torch.set_num_threads(2)
        src, pt = os.environ.get("SPEECHMOS_SRC"), os.environ.get("UTMOS_PT")
        if src and pt:
            sys.path.insert(0, src)
            from speechmos.utmos22.strong.model import UTMOS22Strong
            m = UTMOS22Strong()
            m.load_state_dict(torch.load(pt, map_location="cpu"))
            return m.eval()
        return torch.hub.load("tarepan/SpeechMOS:v1.2.0", "utmos22_strong", trust_repo=True).eval()
    except Exception as e:
        print("UTMOS indisponible :", repr(e)[:100], file=sys.stderr)
        return None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--groups", required=True)
    ap.add_argument("--dir", required=True)
    ap.add_argument("--cible", type=float, default=2.9, help="débit visé, en mots par seconde")
    ap.add_argument("--f0", default="auto", help="hauteur médiane visée (Hz) : la voix ne doit pas changer d'un paragraphe à l'autre ; « auto » = médiane de toutes les prises")
    ap.add_argument("--sans-utmos", action="store_true")
    a = ap.parse_args()
    groups = json.load(open(a.groups, encoding="utf-8"))
    from faster_whisper import WhisperModel
    fw = WhisperModel("large-v3-turbo", device="cpu", compute_type="int8", download_root=os.environ.get("FW_ROOT"), cpu_threads=4)
    mos = None if a.sans_utmos else charge_utmos()
    lignes = ["# Choix des prises", "", "| Paragraphe | Prise | Écart texte | Débit (mots/s) | Sauts de hauteur | Étendue (dt) | Pente (dt/s) | Hauteur (Hz) | Plus long silence (s) | Queue faible en fin (s) | Confiance alignement (moy / mot le moins sûr) | UTMOS | Score | Retenue |", "|---|---|---|---|---|---|---|---|---|---|---|---|---|---|"]
    cache_f = os.path.join(a.dir, "prises_mesures.json")
    cache = json.load(open(cache_f, encoding="utf-8")) if os.path.exists(cache_f) else {}
    tous = {}
    for g in groups:                                                 # 1. mesures de toutes les prises (gardées dans prises_mesures.json)
        attendu = mots(g["text"])
        tous[g["id"]] = []
        for k in range(99):
            f = os.path.join(a.dir, "prises", f"{g['id']}_t{k}.wav")
            if not os.path.exists(f):
                break
            cle = f"{g['id']}_t{k}:{os.path.getsize(f)}"
            if cle not in cache:
                x = charge(f, 24000)
                x16 = charge(f, 16000)
                segs, _ = fw.transcribe(x16, language="fr", beam_size=5, temperature=0, condition_on_previous_text=False)
                texte = " ".join(s_.text.strip() for s_ in segs)
                lu = mots(texte)
                sm = difflib.SequenceMatcher(None, attendu, lu, autojunk=False)
                ecart = int(sum(max(i2 - i1, j2 - j1) for t, i1, i2, j1, j2 in sm.get_opcodes() if t != "equal"))
                loud = np.where(np.abs(x) > 0.02 * np.abs(x).max())[0]
                dur = (loud[-1] - loud[0]) / 24000 if len(loud) else len(x) / 24000
                u = None
                if mos is not None:
                    import torch
                    with torch.no_grad():
                        u = float(mos(torch.from_numpy(x16).unsqueeze(0), 16000)[0])
                cache[cle] = {"ecart": ecart, "lu": texte, "debit": round(len(attendu) / max(dur, 0.1), 2), **hauteur(x, 24000), "trou": round(trous(x, 24000), 2),
                              "utmos": None if u is None else round(u, 2), **confiance(x, g["text"].split())}
                json.dump(cache, open(cache_f, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
            tous[g["id"]].append((k, f, cache[cle]))
    f0ref = float(np.median([m["f0"] for v in tous.values() for _, _, m in v])) if a.f0 == "auto" else float(a.f0)
    for g in groups:                                                 # 2. score et choix
        cands = []
        attendu = mots(g["text"])
        for k, f, m in tous[g["id"]]:
            u = m["utmos"]
            queue = queue_fin(charge(f, 24000), 24000)
            lu_m = mots(m["lu"])
            fin_ok = bool(lu_m) and difflib.SequenceMatcher(None, attendu[-1], lu_m[-1]).ratio() >= 0.75        # le dernier mot est souvent avalé (« pare-balles » → « paréval »)
            score = (u if u is not None else 3.5) - 1.0 * m["ecart"] - 0.4 * m["sauts"] - 1.5 * max(0.0, m["trou"] - 0.9) - 3.6 * abs(m["debit"] - a.cible) / a.cible \
                - 0.05 * max(0.0, 6 - m["etendue"]) - 0.03 * max(0.0, m["pente"] - 45) + 6.0 * (m["conf_moy"] - 0.9) + 4.0 * (m["conf_min_mot"] - 0.5) \
                - 0.04 * max(0.0, abs(m["f0"] - f0ref) - 8) - (0.0 if fin_ok else 1.5) - 1.5 * max(0.0, queue - 0.08) / 0.1
            cands.append({"k": k, "f": f, **m, "queue": round(queue, 2), "score": round(score, 2)})
        if not cands:
            print("aucune prise pour", g["id"])
            continue
        best = max(cands, key=lambda c: c["score"])
        shutil.copy(best["f"], os.path.join(a.dir, f"{g['id']}.wav"))
        for c in cands:
            lignes.append(f"| {g['id']} | t{c['k']} | {c['ecart']} | {c['debit']} | {c['sauts']} | {c['etendue']} | {c['pente']} | {c['f0']} | {c['trou']} | {c['queue']} | {c['conf_moy']} / {c['conf_min_mot']} | {c['utmos']} | {c['score']} | {'✔' if c is best else ''} |")
        print(g["id"], "→ prise", best["k"], "score", best["score"], "écart", best["ecart"], "débit", best["debit"], "hauteur", best["f0"], "confiance", best["conf_moy"], best["conf_min_mot"], flush=True)
    open(os.path.join(a.dir, "prises_rapport.md"), "w", encoding="utf-8").write("\n".join(lignes) + "\n")


if __name__ == "__main__":
    main()
