"""Voix off : voix d'homme française (Piper, voix « pierre » ou « tom ») phrase par phrase,
avec l'instant de chaque mot pour les sous-titres mot à mot.

    python voix.py MODELES_DIR SORTIE_DIR [--voix pierre|tom] [--prises 6] [--whisper DOSSIER] [--refaire id1,id2]

MODELES_DIR contient <voix>-duree.onnx et <voix>.onnx.json (voir modeles.py).
Écrit SORTIE_DIR/voix.wav (48 kHz, mono), timeline.json et timeline.js (window.TL = ...),
que lisent piece.html et score.mjs.

Chaque phrase est une liste de paires [affiché, prononcé] : l'affiché est le mot du
sous-titre, le prononcé est ce que lit la voix (plusieurs mots possibles, ou des phonèmes
entre chevrons quand espeak se trompe sur un nom).

Pour que l'intonation sonne moins « machine », chaque phrase est synthétisée plusieurs fois
(le modèle est aléatoire) et on garde la prise la plus naturelle : on rejette celles que le
vérificateur (Whisper) comprend mal, qui ont des sauts de hauteur ou une mélodie trop plate,
ou un rythme anormal. La prise retenue de chaque phrase est gardée dans SORTIE_DIR/prises/ :
relancer ne refait que les phrases demandées avec --refaire (ou toutes avec --refaire tout).
"""
import argparse
import json
import math
import os
import re
import subprocess
import unicodedata

import numpy as np
import onnxruntime as ort
import phonemizer
import soundfile as sf
import espeakng_loader
from phonemizer.backend.espeak.wrapper import EspeakWrapper
from scipy.signal import resample_poly

# id, pause après (s), texte
SCRIPT = [
    ("hook", 0.30, "L'animal le plus lourd de toute l'histoire de la Terre..."),
    ("dino", 0.70, "n'est pas un dinosaure."),
    ("humain", 0.45, "Pour mesurer les géants, prenons un humain: [1,75|un mètre soixante-quinze]."),
    ("quetzal", 0.15, "Il y a [68|soixante-huit] millions d'années, [Quetzalcoatlus|<kɛtsalkɔatlˈys>] planait avec [11|onze] mètres d'ailes."),
    ("vol", 0.55, "Le plus grand animal qui ait jamais volé."),
    ("argentino", 0.15, "Sur terre, Argentinosaurus: environ [35|trente-cinq] mètres, [70|soixante-dix] tonnes."),
    ("elephants", 0.55, "Plus lourd que [10|dix] éléphants."),
    ("megalodon", 0.55, "Dans la mer, le mégalodon: près de [20|vingt] mètres, avec des dents grandes comme une main."),
    ("fillette", 0.15, "En [2020|deux mille vingt], sur une plage anglaise, une fillette de [11|onze] ans ramasse un fossile."),
    ("ichthyo", 0.80, "C'est la mâchoire d'[Ichthyotitan|<iktjotitˈɑ̃>]: un reptile marin d'environ [25|vingt-cinq] mètres."),
    ("mais", 0.65, "Mais le plus lourd de tous..."),
    ("jamais", 0.90, "n'a jamais disparu."),
    ("baleine", 0.35, "La baleine bleue."),
    ("chiffres", 0.55, "Jusqu'à [30|trente] mètres: un peu moins qu'Argentinosaurus."),
    ("poids", 0.70, "Mais elle pèse jusqu'à [190|cent quatre-vingt-dix] tonnes: plus de deux fois le poids d'Argentinosaurus."),
    ("chasse", 0.15, "Au [XXe|vingtième] siècle, la chasse l'a presque effacée:"),
    ("360", 0.55, "dans l'Antarctique, il en restait environ [360|trois cent soixante]."),
    ("revient", 0.70, "Depuis, elles reviennent, lentement."),
    ("fin", 0.15, "L'animal le plus lourd de tous les temps est notre contemporain."),
    ("proteger", 0.00, "À nous de le protéger."),
]
START = 0.12      # première syllabe
SOUFFLE = 0.08    # respiration naturelle entre deux phrases, en plus de la pause
OUT_SR = 48000
NOMS = ("quetzalcoatlus", "argentinosaurus", "ichthyotitan", "d'ichthyotitan", "qu'argentinosaurus", "d'argentinosaurus")
NOMBRES = set("un une deux trois quatre cinq six sept huit neuf dix onze douze treize quatorze quinze seize vingt trente quarante cinquante soixante cent cents mille millions million quatre-vingt quatre-vingts vingtième".split())


def parse(line):
    """Liste de (affiché, prononcé) ; « [a|b] » affiche a et prononce b."""
    out = []
    for m in re.finditer(r"\[([^|\]]+)\|([^\]]+)\]([^\s\[]*)|([^\s\[]+)", line):
        if m.group(4):
            out.append((m.group(4), m.group(4)))
        else:
            tail = m.group(3) or ""
            out.append((m.group(1) + tail, m.group(2) + tail))
    merged = []
    for show, say in out:
        if merged and merged[-1][0].endswith("'") and merged[-1][0] == merged[-1][1]:
            p = merged.pop()[0]
            show, say = p + show, p + say
        merged.append((show, say))
    return merged


class Voix:
    def __init__(self, dossier, nom):
        EspeakWrapper.set_library(espeakng_loader.get_library_path())
        EspeakWrapper.set_data_path(espeakng_loader.get_data_path())
        self.cfg = json.load(open(f"{dossier}/{nom}.onnx.json"))
        self.idmap = self.cfg["phoneme_id_map"]
        so = ort.SessionOptions()
        so.intra_op_num_threads = 4
        self.sess = ort.InferenceSession(f"{dossier}/{nom}-duree.onnx", so, providers=["CPUExecutionProvider"])
        self.has_sid = "sid" in [i.name for i in self.sess.get_inputs()]
        self.sid = 1 if nom == "pierre" else 0
        self.sr = self.cfg["audio"]["sample_rate"]

    def phonemes(self, pairs):
        """Phonèmes de la phrase, avec le contexte (liaisons) des passages en texte ordinaire."""
        chunks, buf = [], []
        for _, say in pairs:
            if "<" in say:
                if buf:
                    chunks.append(("t", " ".join(buf)))
                    buf = []
                chunks.append(("p", say))
            else:
                buf.append(say)
        if buf:
            chunks.append(("t", " ".join(buf)))
        parts = []
        for kind, s in chunks:
            if kind == "t":
                parts.append(phonemizer.phonemize(s, language="fr-fr", backend="espeak", preserve_punctuation=True, with_stress=True).strip())
            else:
                m = re.match(r"(.*)<([^>]+)>(.*)", s)
                pre = {"d'": "d", "l'": "l"}.get(m.group(1), "")   # espeak lit « d' » comme la lettre : on garde la consonne
                parts.append(pre + m.group(2) + m.group(3))
        ph = unicodedata.normalize("NFD", " ".join(p.strip() for p in parts))
        ph = ph.replace("-", "")      # espeak colle un « - » après les mots grammaticaux (lə-, də-)
        if "(" in ph:
            raise ValueError(f"espeak a changé de langue : {ph}")
        return ph

    def ids(self, ph):
        ids, owner = [1], [-1]                # BOS
        for i, ch in enumerate(ph):
            if ch in self.idmap:
                ids += self.idmap[ch] + [0]
                owner += [i, i]
        return ids + [2], owner + [-1]        # EOS

    def prise(self, ids, longueur, bruit, bruit_w):
        feeds = {"input": np.array([ids], np.int64), "input_lengths": np.array([len(ids)], np.int64),
                 "scales": np.array([bruit, longueur, bruit_w], np.float32)}
        if self.has_sid:
            feeds["sid"] = np.array([self.sid], np.int64)
        a, w = self.sess.run(["output", "duree"], feeds)
        a, w = a.reshape(-1), w.reshape(-1)
        return a, w, len(a) / max(1.0, w.sum())          # échantillons par trame


# ───────── vérification et choix de la meilleure prise ─────────
def mots(s):
    return re.findall(r"[\wéèêàâîôûçùïœ']+", s.lower().replace("’", "'"))


def sans_bruit(ws):
    out = []
    for w in ws:
        if w.isdigit() or w in NOMBRES or w.startswith(NOMS):
            continue
        out += [p for p in w.split("-") if p and p not in NOMBRES]
    return out


def couverture(ref, hyp):
    r, h = sans_bruit(mots(ref)), sans_bruit(mots(hyp))
    if not r:
        return 1.0
    d = np.zeros((len(r) + 1, len(h) + 1), int)
    for i in range(1, len(r) + 1):
        for j in range(1, len(h) + 1):
            d[i, j] = d[i - 1, j - 1] + 1 if r[i - 1] == h[j - 1] else max(d[i - 1, j], d[i, j - 1])
    return d[-1, -1] / len(r)


def melodie(audio, sr):
    """(étendue P10-P90 en demi-tons, sauts > 6 demi-tons par seconde, mélodie de fin) ; None si pas de voix."""
    import parselmouth
    p = parselmouth.Sound(audio, sampling_frequency=sr).to_pitch_ac(time_step=0.01, pitch_floor=60, pitch_ceiling=300)
    f = p.selected_array["frequency"]
    v = f > 0
    if v.sum() < 20:
        return None
    st = 12 * np.log2(f[v] / np.median(f[v]))
    idx = np.where(v)[0]
    d = np.abs(np.diff(12 * np.log2(f[idx] / np.median(f[v])))[np.diff(idx) == 1])
    # mélodie de fin : les 60 dernières ms voisées contre les 0,3 s d'avant (en demi-tons)
    prev = idx[(idx > idx[-1] - 45) & (idx < idx[-1] - 15)]
    fin = float(12 * np.log2(np.median(f[idx[-6:]]) / np.median(f[prev]))) if len(prev) >= 5 else 0.0
    return float(np.percentile(st, 90) - np.percentile(st, 10)), float((d > 6).sum() / (len(audio) / sr)), fin


def choisir(voix, ids, ref, fin_phrase, prises, rec, verbeux=False):
    """Plusieurs prises (le modèle est aléatoire), on garde la plus naturelle. Si aucune n'est bien comprise,
    on en refait jusqu'à deux fois autant."""
    cands = []
    for tour in range(3):
        for k in range(prises):
            kk = tour * prises + k
            longueur = 1.0 + 0.05 * math.sin(kk * 2.1)            # le débit d'un lecteur varie un peu d'une phrase à l'autre
            a, w, spt = voix.prise(ids, longueur, 0.667 + 0.04 * (kk % 3), 0.8)
            a = a / max(1e-6, np.abs(a).max()) * 0.9
            c = dict(a=a, w=w, spt=spt, dur=len(a) / voix.sr, err=0.0)
            if rec is not None:
                s = rec.create_stream()
                s.accept_waveform(voix.sr, np.concatenate([a, np.zeros(int(0.5 * voix.sr), np.float32)]))
                rec.decode_stream(s)
                s2 = rec.create_stream()
                b = resample_poly(a, 16000 // math.gcd(16000, voix.sr), voix.sr // math.gcd(16000, voix.sr)).astype(np.float32)
                s2.accept_waveform(16000, np.concatenate([np.zeros(4800, np.float32), b * 0.7, np.zeros(4800, np.float32)]))
                rec.decode_stream(s2)
                c["txt"] = s.result.text.strip() + "  |  " + s2.result.text.strip()
                c["err"] = (2 - couverture(ref, s.result.text) - couverture(ref, s2.result.text)) / 2
            m = melodie(a, voix.sr)
            c["rng"], c["jumps"], c["fin"] = m if m else (0.0, 9.0, 0.0)
            cands.append(c)
        if rec is None or min(c["err"] for c in cands) <= 0.15:
            break
    med = float(np.median([c["dur"] for c in cands]))
    for c in cands:
        # en français une affirmation redescend à la fin, une suite (deux-points, points de suspension) reste en l'air
        fin_pen = 0.3 * max(0.0, c["fin"] + 1.5) if fin_phrase == "." else 0.3 * max(0.0, -0.8 - c["fin"])
        c["score"] = (-4 * c["err"] - 0.25 * max(0, 7 - c["rng"]) - 0.15 * max(0, c["rng"] - 12) + 0.12 * min(c["rng"], 10.5)
                      - 0.5 * c["jumps"] - 2.0 * abs(math.log(c["dur"] / med)) - fin_pen)
    best = max(cands, key=lambda c: c["score"])
    if verbeux:
        print(f"      {len(cands)} prises ; retenue : erreurs {best['err']:.2f}, étendue {best['rng']:.1f} dt, fin {best['fin']:+.1f} dt, {best['dur']:.2f} s ; {best.get('txt', '')}")
    return best


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("modeles")
    ap.add_argument("sortie")
    ap.add_argument("--voix", default="pierre")
    ap.add_argument("--prises", type=int, default=6)
    ap.add_argument("--whisper", help="dossier sherpa-onnx-whisper-small (facultatif : vérifie que chaque prise est bien comprise)")
    ap.add_argument("--refaire", default="", help="phrases à refaire (ids séparés par des virgules, ou « tout »)")
    a = ap.parse_args()
    voix = Voix(a.modeles, a.voix)
    rec = None
    if a.whisper:
        import sherpa_onnx as so
        rec = so.OfflineRecognizer.from_whisper(encoder=f"{a.whisper}/small-encoder.int8.onnx", decoder=f"{a.whisper}/small-decoder.int8.onnx",
                                                tokens=f"{a.whisper}/small-tokens.txt", language="fr", task="transcribe", num_threads=4)
    sr = voix.sr
    refaire = set(a.refaire.split(","))
    os.makedirs(f"{a.sortie}/prises", exist_ok=True)
    pieces, phrases = [np.zeros(int(START * sr), np.float32)], []
    t = START
    for pid, pause, line in SCRIPT:
        pairs = parse(line)
        ph = voix.phonemes(pairs)
        ids, owner = voix.ids(ph)
        ref = " ".join(say for _, say in pairs)
        cache = f"{a.sortie}/prises/{pid}.npz"
        best = None
        if os.path.exists(cache) and pid not in refaire and "tout" not in refaire:
            z = np.load(cache)
            if str(z["ph"]) == ph and str(z["voix"]) == a.voix:
                best = dict(a=z["a"], w=z["w"], spt=float(z["spt"]))
        if best is None:
            fin_phrase = "." if line.rstrip().endswith(".") and not line.rstrip().endswith("...") else ":"
            best = choisir(voix, ids, ref, fin_phrase, a.prises, rec, verbeux=True)
            np.savez(cache, a=best["a"], w=best["w"], spt=best["spt"], ph=ph, voix=a.voix)
        audio, w, spt = best["a"], best["w"], best["spt"]
        # groupes de phonèmes séparés par des espaces = mots prononcés
        edges = np.concatenate([[0], np.cumsum(w)]) * spt / sr          # fin de chaque jeton, en secondes
        groups, cur = [], []
        for ti, o in enumerate(owner):
            if o < 0:
                continue
            ch = ph[o]
            if ch == " ":
                if cur:
                    groups.append(cur)
                cur = []
            else:
                cur.append(ti)
        if cur:
            groups.append(cur)
        groups = [g for g in groups if any(re.match(r"\w", ph[owner[ti]]) for ti in g)]
        say_words = [x for _, say in pairs for x in say.split()]
        if len(groups) != len(say_words):
            raise ValueError(f"{pid}: {len(groups)} groupes de phonèmes pour {len(say_words)} mots\n{ph}\n{say_words}")
        # on retire le silence de début et de fin de la prise
        env = np.abs(audio)
        loud = np.where(env > 0.02)[0]
        lead = max(0, loud[0] - int(0.06 * sr))
        end = min(len(audio), loud[-1] + int(0.09 * sr))
        audio = audio[lead:end].copy()
        fade = int(0.012 * sr)
        audio[:fade] *= np.linspace(0, 1, fade)
        audio[-fade:] *= np.linspace(1, 0, fade)
        words, gi = [], 0
        for show, say in pairs:
            n = len(say.split())
            g = groups[gi:gi + n]
            gi += n
            t0 = edges[g[0][0]] - lead / sr
            t1 = edges[g[-1][-1] + 1] - lead / sr
            words.append({"w": show, "t0": round(t + max(0.0, t0), 3), "t1": round(t + min(len(audio) / sr, t1), 3)})
        dur = len(audio) / sr
        phrases.append({"id": pid, "t0": round(t, 3), "t1": round(t + dur, 3), "words": words, "text": line})
        print(f"{pid:10s} {t:6.2f} → {t + dur:6.2f}  {ph}")
        pieces.append(audio.astype(np.float32))
        gap = pause + (SOUFFLE if pid != SCRIPT[-1][0] else 0.0)
        pieces.append(np.zeros(int(gap * sr), np.float32))
        t += dur + gap
    voice = np.concatenate(pieces)
    g = math.gcd(OUT_SR, sr)
    voice48 = resample_poly(voice, OUT_SR // g, sr // g)
    voice48 = (voice48 / np.abs(voice48).max() * 0.89).astype(np.float32)
    sf.write(f"{a.sortie}/voix_brut.wav", voice48, OUT_SR)
    # porte douce : réduit le souffle du modèle entre les mots (sans toucher à la parole)
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", f"{a.sortie}/voix_brut.wav", "-af",
                    "agate=threshold=0.014:ratio=3:attack=8:release=140:range=0.2:knee=3", f"{a.sortie}/voix.wav"], check=True)
    tl = {"duration": round(len(voice48) / OUT_SR, 3), "voix": a.voix, "phrases": phrases}
    with open(f"{a.sortie}/timeline.json", "w") as f:
        json.dump(tl, f, ensure_ascii=False, indent=1)
    with open(f"{a.sortie}/timeline.js", "w") as f:
        f.write("window.TL = " + json.dumps(tl, ensure_ascii=False) + ";\n")
    print("durée de la voix :", round(len(voice48) / OUT_SR, 2), "s")


if __name__ == "__main__":
    main()
