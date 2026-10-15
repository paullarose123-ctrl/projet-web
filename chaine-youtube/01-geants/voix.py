"""Voix off : voix d'homme neuronale (Microsoft Edge, via edge-tts), lue par paragraphes, avec
l'instant de chaque mot pour les sous-titres mot à mot.

    python voix.py SORTIE_DIR [--voix fr-FR-RemyMultilingualNeural] [--debit -4%] [--refaire 1,2|tout]

Écrit SORTIE_DIR/voix.wav (48 kHz, mono), timeline.json et timeline.js (window.TL = ...), que lisent
piece.html et score.mjs. Les paragraphes bruts (mp3 + temps des mots donnés par le service) sont gardés
dans SORTIE_DIR/edge/<voix>/ : relancer sans --refaire ne rappelle pas le service.

Chaque phrase est une liste de paires [affiché, prononcé] : l'affiché est le mot du sous-titre, le prononcé
est ce que lit la voix (plusieurs mots possibles : « 1,75 » est dit « un mètre soixante-quinze »).

Le texte est lu par paragraphes (GROUPES), pas phrase par phrase : la mélodie reste continue d'une phrase à
l'autre, c'est ce qui évite l'effet haché. Les pauses voulues par l'animation (deuxième champ de SCRIPT) ne
font qu'allonger les silences trop courts, jamais raccourcir ceux de la voix.

Accès réseau : le service est un accès gratuit non officiel à la voix de lecture d'Edge. Pour une chaîne
monétisée, la même voix existe dans Azure Speech (licence commerciale, clé à créer).
"""
import argparse
import asyncio
import difflib
import json
import math
import os
import re
import ssl
import subprocess

import edge_tts
import edge_tts.communicate as _ec
import numpy as np
import soundfile as sf
from scipy.signal import resample_poly

# id, pause voulue après la phrase (s), texte
SCRIPT = [
    ("hook", 0.30, "L'animal le plus lourd de toute l'histoire de la Terre..."),
    ("dino", 0.70, "n'est pas un dinosaure."),
    ("humain", 0.45, "Pour mesurer les géants, prenons un humain: [1,75|un mètre soixante-quinze]."),
    ("quetzal", 0.15, "Il y a [68|soixante-huit] millions d'années, Quetzalcoatlus planait avec [11|onze] mètres d'ailes."),
    ("vol", 0.55, "Le plus grand animal qui ait jamais volé."),
    ("argentino", 0.15, "Sur terre, Argentinosaurus: environ [35|trente-cinq] mètres, [70|soixante-dix] tonnes."),
    ("elephants", 0.55, "Plus lourd que [10|dix] éléphants."),
    ("megalodon", 0.55, "Dans la mer, le mégalodon: près de [20|vingt] mètres, avec des dents grandes comme une main."),
    ("fillette", 0.15, "En [2020|deux mille vingt], sur une plage anglaise, une fillette de [11|onze] ans ramasse un fossile."),
    ("ichthyo", 0.80, "C'est la mâchoire d'Ichthyotitan: un reptile marin d'environ [25|vingt-cinq] mètres."),
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
# phrases lues d'un seul souffle (même paragraphe)
GROUPES = [
    ["hook", "dino"], ["humain"], ["quetzal", "vol"], ["argentino", "elephants"], ["megalodon"],
    ["fillette", "ichthyo"], ["mais", "jamais"], ["baleine"], ["chiffres", "poids"], ["chasse", "360"],
    ["revient"], ["fin", "proteger"],
]
# écriture lue par la voix quand un mot est mal prononcé (le sous-titre garde l'écriture normale).
# « bleue » est écrit « bleu » (même son) : avec « bleue » la voix durcit mal le « b » de « baleine » (on entend « valaine »).
PRONONCE = {"bleue": "bleu"}
START = 0.20      # début de la première syllabe
ENTRE = 0.10      # respiration ajoutée à la pause voulue entre deux paragraphes
OUT_SR = 48000
PONCT = ".,:;!?…"


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


def norm(w):
    return w.lower().replace("’", "'").strip(PONCT + " ")


def lu(say):
    """Ce que reçoit la voix pour un mot prononcé (réécriture éventuelle des noms)."""
    core = say.rstrip(PONCT)
    return PRONONCE.get(core.lower(), core) + say[len(core):]


# ───────── service de voix ─────────
async def appelle(texte, voix, debit, tonalite, essais=4):
    cafile = os.environ.get("SSL_CERT_FILE")
    if cafile:      # derrière un proxy qui ré-émet le TLS (conteneurs) : on lui fait confiance via son certificat
        _ec._SSL_CTX = ssl.create_default_context(cafile=cafile)
    proxy = os.environ.get("HTTPS_PROXY") or os.environ.get("https_proxy")
    for k in range(essais):
        try:
            c = edge_tts.Communicate(texte, voix, rate=debit, pitch=tonalite, boundary="WordBoundary", proxy=proxy)
            audio, events = bytearray(), []
            async for ch in c.stream():
                if ch["type"] == "audio":
                    audio += ch["data"]
                elif ch["type"] == "WordBoundary":
                    events.append({"text": ch["text"], "t0": ch["offset"] / 1e7, "t1": (ch["offset"] + ch["duration"]) / 1e7})
            if audio and events:
                return bytes(audio), events
        except Exception as e:  # réseau capricieux : on réessaie
            print("   essai", k + 1, "raté :", repr(e)[:120])
        await asyncio.sleep(2 * (k + 1))
    raise RuntimeError("le service de voix ne répond pas")


def decode(mp3, sr=24000):
    p = subprocess.run(["ffmpeg", "-loglevel", "error", "-i", "pipe:0", "-f", "f32le", "-ac", "1", "-ar", str(sr), "pipe:1"], input=mp3, capture_output=True, check=True)
    return np.frombuffer(p.stdout, np.float32).copy(), sr


def aligne(attendus, events):
    """Associe chaque mot attendu au mot reconnu par le service (même ordre). Renvoie une liste de (t0, t1)."""
    a = [norm(w) for w in attendus]
    b = [norm(e["text"]) for e in events]
    sm = difflib.SequenceMatcher(None, a, b, autojunk=False)
    res = [None] * len(a)
    for tag, i0, i1, j0, j1 in sm.get_opcodes():
        if tag == "equal" or (tag == "replace" and i1 - i0 == j1 - j0):
            for k in range(i1 - i0):
                res[i0 + k] = (events[j0 + k]["t0"], events[j0 + k]["t1"])
        elif tag in ("replace", "delete") and j1 > j0:
            # nombre de mots différent : on répartit la plage de temps sur les mots attendus
            t0, t1 = events[j0]["t0"], events[j1 - 1]["t1"]
            n = i1 - i0
            for k in range(n):
                res[i0 + k] = (t0 + (t1 - t0) * k / n, t0 + (t1 - t0) * (k + 1) / n)
    # trous restants : on interpole entre voisins
    for i, r in enumerate(res):
        if r is None:
            prev = next((res[j] for j in range(i - 1, -1, -1) if res[j]), None)
            nxt = next((res[j] for j in range(i + 1, len(res)) if res[j]), None)
            t = (prev[1] if prev else 0.0, nxt[0] if nxt else (prev[1] + 0.2 if prev else 0.2))
            res[i] = (t[0], max(t[0] + 0.05, t[1]))
            print("   mot sans correspondance :", attendus[i])
    return res


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("sortie")
    ap.add_argument("--voix", default="fr-FR-RemyMultilingualNeural")
    ap.add_argument("--debit", default="-4%")
    ap.add_argument("--tonalite", default="+0Hz")
    ap.add_argument("--refaire", default="", help="paragraphes à refaire (numéros 1 à 12 séparés par des virgules, ou « tout »)")
    a = ap.parse_args()
    cache = f"{a.sortie}/edge/{a.voix}"
    os.makedirs(cache, exist_ok=True)
    refaire = set(a.refaire.split(","))
    par_id = {pid: (pause, line) for pid, pause, line in SCRIPT}
    sr = 24000
    pieces, phrases = [], []
    t = 0.0                                    # début, sur la ligne de temps finale (avant START), du paragraphe en cours
    for gi, ids in enumerate(GROUPES, 1):
        pairs_par_id = {pid: parse(par_id[pid][1]) for pid in ids}
        attendus = [lu(w) for pid in ids for _, say in pairs_par_id[pid] for w in say.split()]
        texte = " ".join(attendus)
        f_mp3, f_json = f"{cache}/g{gi}.mp3", f"{cache}/g{gi}.json"
        if os.path.exists(f_mp3) and os.path.exists(f_json) and str(gi) not in refaire and "tout" not in refaire \
                and json.load(open(f_json)).get("texte") == texte:
            mp3 = open(f_mp3, "rb").read()
            events = json.load(open(f_json))["events"]
        else:
            mp3, events = asyncio.run(appelle(texte, a.voix, a.debit, a.tonalite))
            open(f_mp3, "wb").write(mp3)
            json.dump({"texte": texte, "voix": a.voix, "events": events}, open(f_json, "w"), ensure_ascii=False)
        audio, _ = decode(mp3, sr)
        tm = aligne(attendus, events)
        # silence de début et de fin du paragraphe
        env = np.abs(audio)
        loud = np.where(env > 0.01 * env.max())[0]
        lead = max(0, loud[0] - int(0.04 * sr))
        end = min(len(audio), loud[-1] + int(0.12 * sr))
        audio = audio[lead:end].copy()
        fade = int(0.01 * sr)
        audio[:fade] *= np.linspace(0, 1, fade)
        audio[-fade:] *= np.linspace(1, 0, fade)
        tm = [(x0 - lead / sr, x1 - lead / sr) for x0, x1 in tm]
        # mots de chaque phrase du paragraphe
        k, recs = 0, []
        for pid in ids:
            words = []
            for show, say in pairs_par_id[pid]:
                n = len(say.split())
                words.append((show, tm[k][0], tm[k + n - 1][1]))
                k += n
            recs.append((pid, words))
        # pauses voulues à l'intérieur du paragraphe : on n'allonge que les silences trop courts
        shifts = []                            # (temps d'origine, silence inséré)
        for (pid_a, w_a), (pid_b, w_b) in zip(recs, recs[1:]):
            voulu = par_id[pid_a][0]
            naturel = max(0.0, w_b[0][1] - w_a[-1][2])
            if naturel < voulu:
                shifts.append(((w_a[-1][2] + w_b[0][1]) / 2, voulu - naturel))
        morceaux, prec = [], 0
        for pos, dur in shifts:
            morceaux += [audio[prec:int(pos * sr)], np.zeros(int(dur * sr), np.float32)]
            prec = int(pos * sr)
        morceaux.append(audio[prec:])
        audio2 = np.concatenate(morceaux)
        dec = lambda x: x + sum(d for p, d in shifts if x >= p)
        for pid, words in recs:
            ws = [{"w": w, "t0": round(START + t + dec(x0), 3), "t1": round(START + t + dec(x1), 3)} for w, x0, x1 in words]
            phrases.append({"id": pid, "t0": ws[0]["t0"], "t1": ws[-1]["t1"], "words": ws, "text": par_id[pid][1]})
        print(f"g{gi:<2d} {START + t:6.2f} → {START + t + len(audio2) / sr:6.2f}  {texte[:90]}")
        pause = par_id[ids[-1]][0] + (ENTRE if gi < len(GROUPES) else 0.0)
        pieces += [audio2, np.zeros(int(pause * sr), np.float32)]
        t += len(audio2) / sr + pause
    voice = np.concatenate([np.zeros(int(START * sr), np.float32)] + pieces)
    g = math.gcd(OUT_SR, sr)
    v48 = resample_poly(voice, OUT_SR // g, sr // g).astype(np.float32)
    sf.write(f"{a.sortie}/voix_brut.wav", v48, OUT_SR)
    # un seul réglage de niveau pour tout le texte (pas de normalisation phrase par phrase) : −19 LUFS
    p = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", f"{a.sortie}/voix_brut.wav", "-af", "ebur128", "-f", "null", "-"], capture_output=True, text=True)
    lufs = float(re.findall(r"I:\s+(-?[\d.]+) LUFS", p.stderr)[-1])
    v48 = np.clip(v48 * 10 ** ((-19.0 - lufs) / 20), -0.97, 0.97)
    sf.write(f"{a.sortie}/voix.wav", v48, OUT_SR)
    tl = {"duration": round(len(v48) / OUT_SR, 3), "voix": a.voix, "phrases": phrases}
    json.dump(tl, open(f"{a.sortie}/timeline.json", "w"), ensure_ascii=False, indent=1)
    open(f"{a.sortie}/timeline.js", "w").write("window.TL = " + json.dumps(tl, ensure_ascii=False) + ";\n")
    print("durée de la voix :", round(len(v48) / OUT_SR, 2), "s ; niveau", round(lufs, 1), "→ −19 LUFS")


if __name__ == "__main__":
    main()
