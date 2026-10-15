"""Voix off de la vidéo 2 : voix d'homme neuronale (Microsoft Edge, via edge-tts), lue par paragraphes, avec
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
chaque {id, text} de g.json. Les temps des mots sont alors relus par faster-whisper (large-v3-turbo, mots horodatés)
puis associés aux mots attendus (même alignement que pour les temps du service). Le débit et la hauteur de GROUPES
ne s'appliquent qu'au service Edge.

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
    ("q", 0.35, "Est-ce qu'un fil d'araignée pourrait vraiment retenir Spider-Man?"),
    ("oui", 0.25, "Oui, le fil tiendrait,"),
    ("trois", 0.65, "mais trois choses, elles, ne passeraient jamais."),
    # une toile, c'est quoi ?
    ("soie", 0.15, "Une toile, c'est de la soie, des protéines liquides comme un gel dans l'araignée."),
    ("etire", 0.45, "Elle les étire par de minuscules orifices, et ça devient un fil solide."),
    ("zoom", 0.15, "Au niveau des molécules, il y a des briques rigides, reliées par des chaînes souples."),
    ("briques", 0.55, "Les briques font la solidité, et les élastiques évitent que ça casse."),
    # plus solide que l'acier ?
    ("acier", 0.35, "Plus solide que l'acier? À épaisseur égale, à peu près pareil, mais six fois plus légère."),
    ("chocs", 0.35, "Et surtout, elle encaisse les chocs: une mouche fonce dedans, le fil s'étire et ne casse pas, c'est ce qu'on appelle la ténacité."),
    ("darwin", 0.65, "La championne vit à Madagascar, c'est l'araignée écorce de Darwin, et sa soie est jusqu'à dix fois plus tenace que le Kevlar."),
    # et Spider-Man ?
    ("bas", 0.15, "Le plus dur pour son fil, c'est le point le plus bas du balancement."),
    ("spaghetti", 0.45, "Un fil à peine plus fin qu'un spaghetti suffirait, et avec de la marge, un câble de chargeur."),
    ("metro", 0.40, "Et le métro qu'il arrête dans Spider-Man [2|deux]? En [2013|deux mille treize], des étudiants ont fait le calcul, et ça tiendrait."),
    ("bras", 0.75, "Côté fil, c'est crédible, ce sont plutôt les bras de Peter Parker qui m'inquiètent."),
    # là où ça coince
    ("probleme", 0.25, "Où est le piège? D'abord, la quantité."),
    ("proteine", 0.15, "Chaque grand balancement lui coûterait plus de protéines que ses besoins d'une journée entière."),
    ("appetit", 0.65, "Un grand pouvoir implique... un très gros appétit."),
    ("fabrication", 0.15, "Ensuite, la fabrication: une araignée n'éjecte pas sa soie, elle l'étire."),
    ("jet", 0.55, "Et c'est ça qui la rend solide, alors qu'un jet de liquide, non."),
    ("pluie", 0.15, "Et enfin, la pluie: mouillée, la soie peut rétrécir de moitié."),
    ("galere", 0.75, "Pour un super-héros en plein orage... la galère."),
    # verdict
    ("verdict", 0.25, "Verdict: la soie est assez solide pour faire du Spider-Man."),
    ("fiction", 0.70, "La fiction, c'est tout le reste."),
    ("labos", 0.20, "Dans les labos, on essaie d'en produire en masse, mais pas avec des araignées, elles se dévorent entre elles."),
    ("bacteries", 0.65, "On utilise plutôt des bactéries, ou des vers à soie modifiés."),
    ("cocon", 0.00, "Bon... je range l'échantillon, avant de finir moi-même en cocon."),
]
# paragraphes lus d'un seul souffle (un appel au service chacun) : ids, débit, hauteur
GROUPES = [
    {"ids": ["q"], "rate": "+3%", "pitch": "+9Hz"},                 # accroche : question vive, haute
    {"ids": ["oui", "trois"], "rate": "-5%", "pitch": "-7Hz"},      # réponse posée, grave
    {"ids": ["soie", "etire"], "rate": "+0%", "pitch": "+2Hz"},
    {"ids": ["zoom", "briques"], "rate": "-2%", "pitch": "+5Hz"},   # on s'émerveille
    {"ids": ["acier"], "rate": "+1%", "pitch": "+4Hz"},
    {"ids": ["chocs"], "rate": "+0%", "pitch": "+0Hz"},
    {"ids": ["darwin"], "rate": "-2%", "pitch": "+8Hz"},            # la révélation
    {"ids": ["bas", "spaghetti"], "rate": "+0%", "pitch": "-2Hz"},
    {"ids": ["metro"], "rate": "+1%", "pitch": "+5Hz"},
    {"ids": ["bras"], "rate": "-7%", "pitch": "-8Hz"},              # pince-sans-rire
    {"ids": ["probleme", "proteine"], "rate": "+0%", "pitch": "-3Hz"},
    {"ids": ["appetit"], "rate": "-9%", "pitch": "-6Hz"},           # temps comique
    {"ids": ["fabrication", "jet"], "rate": "+0%", "pitch": "+1Hz"},
    {"ids": ["pluie", "galere"], "rate": "-1%", "pitch": "-4Hz"},
    {"ids": ["verdict", "fiction"], "rate": "-6%", "pitch": "-8Hz"},   # conclusion
    {"ids": ["labos", "bacteries"], "rate": "+0%", "pitch": "+4Hz"},
    {"ids": ["cocon"], "rate": "+2%", "pitch": "+6Hz"},             # léger, amusé
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
ASR_AMORCE = "Vidéo de vulgarisation scientifique sur la toile de Spider-Man, la soie d'araignée, le Kevlar, l'araignée écorce de Darwin."
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
    a = ap.parse_args()
    cache = f"{a.sortie}/edge/{a.voix}" if not a.moteur else f"{a.sortie}/ext/{a.etiquette}"
    os.makedirs(cache, exist_ok=True)
    refaire = set(a.refaire.split(","))
    par_id = {pid: (pause * PAUSE_K, line) for pid, pause, line in SCRIPT}
    assert sorted(i for g in GROUPES for i in g["ids"]) == sorted(par_id), "chaque phrase doit être dans un paragraphe"
    sr = 24000
    pieces, phrases = [], []
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
        print(f"g{gi:<2d} {START + t:6.2f} → {START + t + len(audio2) / sr:6.2f}  {debit:>4s} {g['pitch']:>5s}  {texte[:84]}")
        pause = par_id[ids[-1]][0] + (ENTRE if gi < len(GROUPES) else 0.0)
        pieces += [audio2, np.zeros(int(pause * sr), np.float32)]
        t += len(audio2) / sr + pause
    voice = np.concatenate([np.zeros(int(START * sr), np.float32)] + pieces)
    gcd = math.gcd(OUT_SR, sr)
    v48 = resample_poly(voice, OUT_SR // gcd, sr // gcd).astype(np.float32)
    sf.write(f"{a.sortie}/voix_brut.wav", v48, OUT_SR)
    # un seul réglage de niveau pour tout le texte (pas de normalisation phrase par phrase) : −19 LUFS
    p = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", f"{a.sortie}/voix_brut.wav", "-af", "ebur128", "-f", "null", "-"], capture_output=True, text=True)
    lufs = float(re.findall(r"I:\s+(-?[\d.]+) LUFS", p.stderr)[-1])
    v48 = np.clip(v48 * 10 ** ((-19.0 - lufs) / 20), -0.97, 0.97)
    sf.write(f"{a.sortie}/voix.wav", v48, OUT_SR)
    tl = {"duration": round(len(v48) / OUT_SR, 3), "voix": a.voix if not a.moteur else a.etiquette, "phrases": phrases}
    json.dump(tl, open(f"{a.sortie}/timeline.json", "w"), ensure_ascii=False, indent=1)
    open(f"{a.sortie}/timeline.js", "w").write("window.TL = " + json.dumps(tl, ensure_ascii=False) + ";\n")
    print("durée de la voix :", round(len(v48) / OUT_SR, 2), "s ; niveau", round(lufs, 1), "→ −19 LUFS")


if __name__ == "__main__":
    main()
