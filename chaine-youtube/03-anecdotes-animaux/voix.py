"""Voix off de la vidéo 3 (trois anecdotes d'animaux) : voix IA Kyutai (voir voix-ia/) ; le service Edge (edge-tts) reste possible. Lue par paragraphes, avec
l'instant de chaque mot pour les sous-titres mot à mot.

    python voix.py SORTIE_DIR [--voix fr-FR-RemyMultilingualNeural] [--refaire 1,2|tout]
    python voix.py SORTIE_DIR --moteur "PYTHON synth.py" [--graine 1]     # un autre moteur de voix (voir plus bas)

Écrit SORTIE_DIR/voix.wav (48 kHz, mono), timeline.json et timeline.js (window.TL = ...), que lisent
piece.html et score.mjs. Les paragraphes bruts (mp3 + temps des mots donnés par le service) sont gardés
dans SORTIE_DIR/edge/<voix>/ : relancer sans --refaire ne rappelle pas le service.

Ce qui rend la lecture plus humaine (le service n'accepte aucune balise SSML fine : ni pause, ni accent,
ni style ; seuls le débit, la hauteur et le volume d'un appel se règlent) :
  - le texte est écrit à l'oral : phrases courtes et longues en alternance, questions, suspensions (« ... »
    = petite pause en l'air), mots de liaison, adresses au spectateur ;
  - chaque paragraphe a son propre débit et sa propre hauteur (GROUPES) selon son rôle : question vive,
    affirmation posée, aparté pince-sans-rire, conclusion ;
  - sortie en mp3 96 kbit/s (le service ne donne que 48 kbit/s par défaut : le codec ajoutait un voile métallique) ;
  - les silences entre paragraphes suivent le sens (pause courte dans une phrase qui continue, plus longue
    avant une chute) et ne font qu'allonger un silence trop court, jamais le raccourcir.

Chaque phrase est une liste de paires [affiché, prononcé] : l'affiché est le mot du sous-titre, le prononcé
est ce que lit la voix (« [2013|deux mille treize] »).

Autre moteur (--moteur) : n'importe quel programme `synth.py --groups g.json --outdir D [--seed N]` qui écrit D/<id>.wav pour
chaque {id, text} de g.json (voir voix-ia/ : la voix IA du film est lue par Kyutai TTS, plusieurs prises par paragraphe, la meilleure
retenue par des mesures ; `--moteur true` reprend des prises déjà faites). Les temps des mots sont l'alignement forcé du texte sur le son
(MMS_FA), les paragraphes sont ramenés vers le même volume (--nivelle) et un limiteur rabote les pointes. Le débit et la hauteur de GROUPES
ne s'appliquent qu'au service Edge (voix-ia/preparer.py en tire un débit relatif par paragraphe pour Kyutai).

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
import types

import numpy as np
import soundfile as sf
from scipy.signal import resample_poly

FORMAT = "audio-24khz-96kbitrate-mono-mp3"

# id, pause voulue après la phrase (s), texte
SCRIPT = [
    # accroche
    ("q", 0.30, "Tu savais que certains animaux peuvent revenir à la vie après avoir gelé?"),
    ("trois", 0.60, "Voici trois anecdotes incroyables sur les animaux!"),
    # 1. la grenouille qui survit congelée
    ("g1", 0.35, "En Alaska, la grenouille des bois possède un pouvoir digne d'un film de science-fiction!"),
    ("g2", 0.30, "Pendant l'hiver, son corps gèle, son cœur s'arrête de battre et elle cesse de respirer."),
    ("g3", 0.30, "Mais grâce à un sucre qui protège ses cellules, elle survit!"),
    ("g4", 0.75, "Au printemps, elle dégèle et reprend sa vie comme si de rien n'était!"),
    # 2. le lézard qui tire du sang avec ses yeux
    ("l1", 0.35, "Au Mexique, certains lézards à cornes possèdent une arme complètement improbable."),
    ("l2", 0.30, "Lorsqu'ils sont menacés, ils peuvent projeter du sang directement depuis leurs yeux!"),
    ("l3", 0.35, "Ce jet peut atteindre presque un mètre!"),
    ("l4", 0.75, "Et le plus fou? Ce sang a un goût particulièrement désagréable pour certains de leurs prédateurs!"),
    # 3. les lycaons qui votent en éternuant
    ("y1", 0.40, "En Afrique, les lycaons ont une façon très particulière de prendre des décisions: ils éternuent!"),
    ("y2", 0.30, "Avant de partir chasser, les membres de la meute se rassemblent."),
    ("y3", 0.35, "Plus il y a d'éternuements, plus le groupe a de chances de partir!"),
    ("y4", 0.80, "Oui, chez les lycaons, on peut littéralement voter avec son nez!"),
    # question finale
    ("fin", 0.00, "Alors, laquelle de ces trois anecdotes t'a le plus surpris?"),
]
# paragraphes lus d'un seul souffle : ids, débit relatif (voix-ia/preparer.py en tire le bonus de pause de Kyutai : « -7% » = plus lent), hauteur
# (la hauteur ne compte que pour le service Edge)
GROUPES = [
    {"ids": ["q"], "rate": "+3%", "pitch": "+5Hz"},                       # accroche : question vive
    {"ids": ["trois"], "rate": "+0%", "pitch": "+2Hz"},
    {"ids": ["g1"], "rate": "+0%", "pitch": "+1Hz"},
    {"ids": ["g2", "g3"], "rate": "+0%", "pitch": "-1Hz"},
    {"ids": ["g4"], "rate": "-4%", "pitch": "-3Hz"},                      # le dégel : soulagement
    {"ids": ["l1"], "rate": "+0%", "pitch": "+1Hz"},
    {"ids": ["l2", "l3"], "rate": "+0%", "pitch": "+1Hz"},
    {"ids": ["l4"], "rate": "-2%", "pitch": "-2Hz"},                      # la chute de l'anecdote
    {"ids": ["y1"], "rate": "+0%", "pitch": "+1Hz"},
    {"ids": ["y2", "y3"], "rate": "+0%", "pitch": "-1Hz"},
    {"ids": ["y4"], "rate": "-5%", "pitch": "-4Hz"},                      # la blague finale
    {"ids": ["fin"], "rate": "-2%", "pitch": "+2Hz"},                     # la question au spectateur
]
# écriture lue par la voix quand un mot est mal prononcé (le sous-titre garde l'écriture normale)
PRONONCE = {}
START = 0.20      # début de la première syllabe
ENTRE = 0.06      # respiration ajoutée à la pause voulue entre deux paragraphes
PAUSE_K = 0.78    # facteur sur toutes les pauses voulues de SCRIPT
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
def module_service():
    """Le module edge_tts.communicate, avec la sortie en mp3 96 kbit/s au lieu de 48 (si la version installée le permet)."""
    import edge_tts.communicate as _ec
    src = open(_ec.__file__, encoding="utf-8").read()
    ancien = '"outputFormat":"audio-24khz-48kbitrate-mono-mp3"'
    if ancien not in src:
        return _ec, "audio-24khz-48kbitrate-mono-mp3"
    mod = types.ModuleType("edge_tts._communicate_hq")
    mod.__package__ = "edge_tts"
    mod.__file__ = _ec.__file__
    exec(compile(src.replace(ancien, f'"outputFormat":"{FORMAT}"'), _ec.__file__, "exec"), mod.__dict__)
    return mod, FORMAT


async def appelle(texte, voix, debit, tonalite, essais=4):
    mod, fmt = module_service()
    cafile = os.environ.get("SSL_CERT_FILE")
    if cafile:      # derrière un proxy qui ré-émet le TLS (conteneurs) : on lui fait confiance via son certificat
        mod._SSL_CTX = ssl.create_default_context(cafile=cafile)
    proxy = os.environ.get("HTTPS_PROXY") or os.environ.get("https_proxy")
    for k in range(essais):
        try:
            c = mod.Communicate(texte, voix, rate=debit, pitch=tonalite, boundary="WordBoundary", proxy=proxy)
            audio, events = bytearray(), []
            async for ch in c.stream():
                if ch["type"] == "audio":
                    audio += ch["data"]
                elif ch["type"] == "WordBoundary":
                    events.append({"text": ch["text"], "t0": ch["offset"] / 1e7, "t1": (ch["offset"] + ch["duration"]) / 1e7})
            if audio and events:
                return bytes(audio), events, fmt
        except Exception as e:  # réseau capricieux : on réessaie
            print("   essai", k + 1, "raté :", repr(e)[:120])
        await asyncio.sleep(2 * (k + 1))
    raise RuntimeError("le service de voix ne répond pas")


def decode(mp3, sr=24000):
    p = subprocess.run(["ffmpeg", "-loglevel", "error", "-i", "pipe:0", "-f", "f32le", "-ac", "1", "-ar", str(sr), "pipe:1"], input=mp3, capture_output=True, check=True)
    return np.frombuffer(p.stdout, np.float32).copy(), sr


# ───────── autre moteur de voix + horodatage des mots par reconnaissance ─────────
ASR_AMORCE = "Vidéo de vulgarisation sur trois anecdotes d'animaux : la grenouille des bois gelée en Alaska, le lézard à cornes qui projette du sang par les yeux, les lycaons qui votent en éternuant."
_FW = None


def mots_whisper(audio, sr):
    """Mots reconnus avec leur début et leur fin (faster-whisper large-v3-turbo) : [{text, t0, t1}]."""
    global _FW
    from faster_whisper import WhisperModel
    if _FW is None:
        _FW = WhisperModel("large-v3-turbo", device="cpu", compute_type="int8", download_root=os.environ.get("FW_ROOT"), cpu_threads=4)
    g = math.gcd(16000, sr)
    a16 = resample_poly(audio, 16000 // g, sr // g).astype(np.float32)
    segs, _ = _FW.transcribe(a16, language="fr", beam_size=5, temperature=0, condition_on_previous_text=False, word_timestamps=True, initial_prompt=ASR_AMORCE)
    return [{"text": w.word.strip(), "t0": round(w.start, 3), "t1": round(w.end, 3)} for sg in segs for w in (sg.words or [])]


_FA = None
BIAIS_DEBUT = 0.08    # le CTC place le début d'un mot ~80 ms après celui du service Edge (mesuré sur 86 mots : écart-type 30 ms, maximum 0,2 s)


def romanise(mot):
    """Écriture minuscule a-z et apostrophe, comme l'attend l'aligneur : « l'araignée » → « l'araignee »."""
    import unicodedata
    m = mot.lower().replace("œ", "oe").replace("æ", "ae").replace("’", "'")
    m = unicodedata.normalize("NFKD", m).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z']", "", m)


def mots_forces(audio, sr, attendus):
    """Alignement forcé du texte connu sur le son (CTC multilingue MMS_FA de torchaudio, images de 20 ms) :
    [{text, t0, t1}] pour chaque mot attendu. Plus précis que les temps relus par une reconnaissance."""
    global _FA
    import torch
    import torchaudio
    import torchaudio.functional as AF
    if _FA is None:
        torch.set_num_threads(4)
        b = torchaudio.pipelines.MMS_FA
        _FA = (b.get_model(with_star=False).eval(), b.get_dict(star=None), b.sample_rate)
    model, dico, fsr = _FA
    g = math.gcd(fsr, sr)
    x = torch.from_numpy(resample_poly(audio, fsr // g, sr // g).astype(np.float32)).unsqueeze(0)
    with torch.inference_mode():
        emission, _ = model(x)
    rom = [romanise(w) for w in attendus]
    garde = [i for i, r in enumerate(rom) if r]
    cibles = torch.tensor([[dico[c] for i in garde for c in rom[i]]], dtype=torch.int32)
    al, sc = AF.forced_align(emission, cibles, blank=0)
    spans = AF.merge_tokens(al[0], sc[0].exp())
    img = x.size(1) / emission.size(1) / fsr
    out, k = [None] * len(attendus), 0
    for i in garde:
        sp = spans[k:k + len(rom[i])]
        k += len(rom[i])
        out[i] = {"text": attendus[i], "t0": round(max(0.0, sp[0].start * img - BIAIS_DEBUT), 3), "t1": round(sp[-1].end * img, 3)}
    for i, o in enumerate(out):                      # mot sans lettre (ponctuation seule) : collé au voisin
        if o is None:
            prev = next((out[j] for j in range(i - 1, -1, -1) if out[j]), None)
            t = prev["t1"] if prev else 0.0
            out[i] = {"text": attendus[i], "t0": t, "t1": t}
    return out


def charge_wav(path, sr=24000):
    a, r = sf.read(path, dtype="float32")
    a = a.mean(1) if a.ndim > 1 else a
    if r != sr:
        g = math.gcd(r, sr)
        a = resample_poly(a, sr // g, r // g).astype(np.float32)
    return a


def externe(commande, cache, textes, graine, refaire):
    """Fait lire par le moteur externe les paragraphes absents du cache. textes : {gi: texte}. Renvoie {gi: (audio 24 kHz, mots reconnus)}."""
    manque = {}
    for gi, texte in textes.items():
        f_wav, f_json = f"{cache}/g{gi}.wav", f"{cache}/g{gi}.json"
        ok = os.path.exists(f_wav) and os.path.exists(f_json) and str(gi) not in refaire and "tout" not in refaire
        ok = ok and json.load(open(f_json)).get("texte") == texte and json.load(open(f_json)).get("graine") == graine
        if not ok:
            manque[gi] = texte
    if manque:
        os.makedirs(cache, exist_ok=True)
        gj = f"{cache}/groupes.json"
        json.dump([{"id": f"g{gi}", "text": t} for gi, t in manque.items()], open(gj, "w"), ensure_ascii=False)
        subprocess.run(commande.split() + ["--groups", gj, "--outdir", cache, "--seed", str(graine)], check=True)
        for gi, t in manque.items():
            audio = charge_wav(f"{cache}/g{gi}.wav")
            json.dump({"texte": t, "graine": graine, "events": mots_forces(audio, 24000, t.split()), "reconnus": mots_whisper(audio, 24000)}, open(f"{cache}/g{gi}.json", "w"), ensure_ascii=False)
    out = {}
    for gi in textes:
        out[gi] = (charge_wav(f"{cache}/g{gi}.wav"), json.load(open(f"{cache}/g{gi}.json"))["events"])
    return out


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
    ap.add_argument("--refaire", default="", help="paragraphes à refaire (numéros séparés par des virgules, ou « tout »)")
    ap.add_argument("--moteur", default="", help="commande d'un autre moteur de voix (ex. « /chemin/python /chemin/synth.py ») ; par défaut le service Edge")
    ap.add_argument("--graine", type=int, default=1, help="graine du moteur externe")
    ap.add_argument("--etiquette", default="ext", help="nom du dossier de cache du moteur externe")
    ap.add_argument("--decale", default="+4%", help="ajoute ce débit à celui de chaque paragraphe (par ex. -5% pour ralentir tout)")
    ap.add_argument("--fin", type=float, default=0.01, help="moteur externe : le paragraphe est coupé là où le volume passe sous cette part de son maximum (0,01 = −40 dB) ; plus haut, on coupe aussi la queue de souffle ou le « e » final lu « euh », mais on avale des syllabes finales douces (à 0,03 : « appétit » devenait « apé »)")
    ap.add_argument("--nivelle", type=float, default=0.7, help="moteur externe : part de l'écart de volume d'un paragraphe à la médiane qu'on corrige (0 : aucune, 1 : tous au même volume), au plus 6 dB ; une voix de synthèse a des paragraphes tantôt plus forts, tantôt plus doux sans raison")
    a = ap.parse_args()
    cache = f"{a.sortie}/edge/{a.voix}" if not a.moteur else f"{a.sortie}/ext/{a.etiquette}"
    os.makedirs(cache, exist_ok=True)
    refaire = set(a.refaire.split(","))
    par_id = {pid: (pause * PAUSE_K, line) for pid, pause, line in SCRIPT}
    assert sorted(i for g in GROUPES for i in g["ids"]) == sorted(par_id), "chaque phrase doit être dans un paragraphe"
    sr = 24000
    pieces, phrases, idx_par, lufs_par = [], [], [], []
    if a.moteur:
        textes = {}
        for gi, g in enumerate(GROUPES, 1):
            textes[gi] = " ".join(lu(w) for pid in g["ids"] for _, say in parse(par_id[pid][1]) for w in say.split())
        deja = externe(a.moteur, cache, textes, a.graine, refaire)
    t = 0.0                                    # début, sur la ligne de temps finale (avant START), du paragraphe en cours
    for gi, g in enumerate(GROUPES, 1):
        ids = g["ids"]
        debit = f"{int(g['rate'].rstrip('%')) + int(a.decale.rstrip('%')):+d}%"
        pairs_par_id = {pid: parse(par_id[pid][1]) for pid in ids}
        attendus = [lu(w) for pid in ids for _, say in pairs_par_id[pid] for w in say.split()]
        texte = " ".join(attendus)
        if a.moteur:
            audio, events = deja[gi]
            debit = "ext"
        else:
            cle = {"texte": texte, "voix": a.voix, "rate": debit, "pitch": g["pitch"], "fmt": FORMAT}
            f_mp3, f_json = f"{cache}/g{gi}.mp3", f"{cache}/g{gi}.json"
            if os.path.exists(f_mp3) and os.path.exists(f_json) and str(gi) not in refaire and "tout" not in refaire \
                    and all(json.load(open(f_json)).get(k) == v for k, v in cle.items()):
                mp3 = open(f_mp3, "rb").read()
                events = json.load(open(f_json))["events"]
            else:
                mp3, events, fmt = asyncio.run(appelle(texte, a.voix, debit, g["pitch"]))
                open(f_mp3, "wb").write(mp3)
                json.dump({**cle, "fmt": fmt, "events": events}, open(f_json, "w"), ensure_ascii=False)
            audio, _ = decode(mp3, sr)
        tm = aligne(attendus, events)
        # silence de début et de fin du paragraphe
        if a.moteur:         # enveloppe lissée (10 ms) : début à 1 % (on garde le souffle d'attaque), fin à --fin du maximum
            w10 = int(0.01 * sr)
            env = np.sqrt(np.convolve(audio ** 2, np.ones(w10) / w10, mode="same"))
            loud = np.where(env > 0.01 * env.max())[0]
            fin = np.where(env > a.fin * env.max())[0]
            lead = max(0, loud[0] - int(0.04 * sr))
            end = min(len(audio), fin[-1] + int(0.08 * sr))
            fade_fin = int(0.03 * sr)
        else:
            env = np.abs(audio)
            loud = np.where(env > 0.01 * env.max())[0]
            lead = max(0, loud[0] - int(0.04 * sr))
            end = min(len(audio), loud[-1] + int(0.12 * sr))
            fade_fin = int(0.01 * sr)
        audio = audio[lead:end].copy()
        fade = int(0.01 * sr)
        audio[:fade] *= np.linspace(0, 1, fade)
        audio[-fade_fin:] *= np.linspace(1, 0, fade_fin)
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
        print(f"g{gi:<2d} {START + t:6.2f} → {START + t + len(audio2) / sr:6.2f}  {debit:>4s} {g['pitch']:>5s}  {texte[:84]}")
        pause = par_id[ids[-1]][0] + (ENTRE if gi < len(GROUPES) else 0.0) + (0.04 if a.moteur else 0.0)      # moteur externe : la queue gardée après le dernier mot est de 0,08 s au lieu de 0,12 s : même pause perçue
        idx_par.append(len(pieces))
        pieces += [audio2, np.zeros(int(pause * sr), np.float32)]
        t += len(audio2) / sr + pause
        if a.moteur and a.nivelle > 0:
            import pyloudnorm as pyln
            try:
                lufs_par.append(float(pyln.Meter(sr).integrated_loudness(audio2.astype(np.float64))))
            except Exception:
                lufs_par.append(None)
    if a.moteur and a.nivelle > 0:                 # volumes des paragraphes rapprochés de leur médiane (les durées ne changent pas)
        valides = [l for l in lufs_par if l is not None and math.isfinite(l)]
        med = float(np.median(valides))
        for i, l in zip(idx_par, lufs_par):
            if l is not None and math.isfinite(l):
                pieces[i] = (pieces[i] * 10 ** (float(np.clip(a.nivelle * (med - l), -6, 6)) / 20)).astype(np.float32)
        print(f"volumes des paragraphes : {min(valides):.1f} à {max(valides):.1f} LUFS, médiane {med:.1f} (correction {a.nivelle:.0%})")
    voice = np.concatenate([np.zeros(int(START * sr), np.float32)] + pieces)
    gcd = math.gcd(OUT_SR, sr)
    v48 = resample_poly(voice, OUT_SR // gcd, sr // gcd).astype(np.float32)
    sf.write(f"{a.sortie}/voix_brut.wav", v48, OUT_SR)
    # un seul réglage de niveau pour tout le texte (pas de normalisation phrase par phrase) : −19 LUFS
    p = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", f"{a.sortie}/voix_brut.wav", "-af", "ebur128", "-f", "null", "-"], capture_output=True, text=True)
    lufs = float(re.findall(r"I:\s+(-?[\d.]+) LUFS", p.stderr)[-1])
    v48 = v48 * 10 ** ((-19.0 - lufs) / 20)
    if a.moteur:        # limiteur à −0,9 dBFS avec anticipation : rabote les rares pointes sans écrêter
        sf.write(f"{a.sortie}/voix_niveau.wav", v48.astype(np.float32), OUT_SR, subtype="FLOAT")
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", f"{a.sortie}/voix_niveau.wav", "-af", "alimiter=limit=0.9:attack=3:release=40:level=false", "-c:a", "pcm_f32le", f"{a.sortie}/voix_limitee.wav"], check=True)
        v48, _ = sf.read(f"{a.sortie}/voix_limitee.wav", dtype="float32")
        os.remove(f"{a.sortie}/voix_niveau.wav")
        os.remove(f"{a.sortie}/voix_limitee.wav")
    else:
        v48 = np.clip(v48, -0.97, 0.97)
    sf.write(f"{a.sortie}/voix.wav", v48, OUT_SR)
    tl = {"duration": round(len(v48) / OUT_SR, 3), "voix": a.voix if not a.moteur else a.etiquette, "phrases": phrases}
    json.dump(tl, open(f"{a.sortie}/timeline.json", "w"), ensure_ascii=False, indent=1)
    open(f"{a.sortie}/timeline.js", "w").write("window.TL = " + json.dumps(tl, ensure_ascii=False) + ";\n")
    print("durée de la voix :", round(len(v48) / OUT_SR, 2), "s ; niveau", round(lufs, 1), "→ −19 LUFS")


if __name__ == "__main__":
    main()
