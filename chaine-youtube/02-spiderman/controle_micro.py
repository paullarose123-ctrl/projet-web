"""Contrôle d'un enregistrement de voix (téléphone, micro de casque…) avant le montage : niveau, bruit de fond, écho de pièce,
souffle, ronflement du secteur, écrêtage, et relecture du texte par un reconnaisseur de parole.

    python controle_micro.py test1.m4a [--texte "texte attendu"] [--silence silence.m4a] [--json sortie.json] [--sans-asr]

Sans fichier de silence, le bruit de fond est estimé sur les parties les plus calmes de l'enregistrement (début et fin de prise).
Chaque mesure est accompagnée d'un jugement en français (« bon », « acceptable », « à améliorer »). Rien de tout cela ne dit comment la
voix sonne à l'oreille : ce sont des mesures. Dépendances : numpy, scipy, soundfile, pyloudnorm, faster-whisper (sauf --sans-asr), ffmpeg."""
import argparse, difflib, json, math, os, re, subprocess, sys
import numpy as np
from scipy.signal import butter, sosfilt, resample_poly, welch

SR = 48000


def sonde(path):
    """Format du fichier (codec, débit, canaux…) lu par ffprobe."""
    p = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "stream=codec_name,sample_rate,channels,bit_rate:format=duration,bit_rate", "-of", "json", path], capture_output=True, text=True)
    j = json.loads(p.stdout or "{}")
    s = (j.get("streams") or [{}])[0]
    return {"codec": s.get("codec_name"), "echantillonnage": int(s.get("sample_rate") or 0), "canaux": s.get("channels"), "debit_kbps": round(int(s.get("bit_rate") or j.get("format", {}).get("bit_rate") or 0) / 1000), "duree_s": round(float(j.get("format", {}).get("duration") or 0), 2)}


def charge(path):
    """Mono, 48 kHz, flottants. Pour un fichier stéréo : la voie la plus forte (les deux sont mélangées si elles sont proches)."""
    p = subprocess.run(["ffmpeg", "-loglevel", "error", "-i", path, "-f", "f32le", "-ac", "2", "-ar", str(SR), "pipe:1"], capture_output=True, check=True)
    a = np.frombuffer(p.stdout, np.float32).reshape(-1, 2).astype(np.float64)
    l, r = a[:, 0], a[:, 1]
    if np.allclose(l, r, atol=1e-6):
        return l
    el, er = np.sqrt(np.mean(l ** 2)), np.sqrt(np.mean(r ** 2))
    return l if el > 4 * er else r if er > 4 * el else (l + r) / 2


def db(x):
    return 20 * np.log10(np.maximum(x, 1e-9))


def niveaux(x, fen=0.02, pas=0.01):
    """Niveau efficace en dBFS par fenêtre de 20 ms toutes les 10 ms."""
    n, h = int(fen * SR), int(pas * SR)
    c = np.concatenate([[0], np.cumsum(x ** 2)])
    idx = np.arange(0, len(x) - n, h)
    return db(np.sqrt((c[idx + n] - c[idx]) / n)), idx / SR


def bande(x, f0, f1, ordre=4):
    return sosfilt(butter(ordre, [f0, f1], btype="band", fs=SR, output="sos"), x)


def energie_trames(x, fen=0.02, pas=0.01):
    n, h = int(fen * SR), int(pas * SR)
    c = np.concatenate([[0], np.cumsum(x ** 2)])
    idx = np.arange(0, len(x) - n, h)
    return (c[idx + n] - c[idx]) / n


def bruit_et_parole(x, silence=None):
    """Niveau du bruit de fond (dBFS), niveau de la parole (dBFS) et masque des trames « voix »."""
    lv, t = niveaux(x)
    if silence is not None and len(silence) > SR:
        ls, _ = niveaux(silence)
        bruit = float(np.median(ls)); bruit_p90 = float(np.percentile(ls, 90)); source = "fichier de silence"
    else:
        bruit = float(np.percentile(lv, 10)); bruit_p90 = float(np.percentile(lv, 25)); source = "parties calmes de la prise"
    crete = float(np.percentile(lv, 98))
    seuil = max(bruit_p90 + 12, crete - 35)
    voix = lv > seuil
    # on lisse : un trou de moins de 150 ms dans la voix reste de la voix
    k = 15
    v2 = voix.copy()
    i = 0
    while i < len(v2):
        if not v2[i]:
            j = i
            while j < len(v2) and not v2[j]:
                j += 1
            if 0 < i and j < len(v2) and j - i < k:
                v2[i:j] = True
            i = j
        else:
            i += 1
    parole = float(10 * np.log10(np.mean(10 ** (lv[v2] / 10)))) if v2.any() else float("nan")
    return {"bruit_dbfs": bruit, "bruit_source": source, "parole_dbfs": parole, "seuil": float(seuil)}, lv, t, v2


def ronflement(x, silence, voix_mask):
    """Raies à 50, 100, 150, 200 Hz (secteur européen) dans le bruit de fond, en dB au-dessus du voisinage."""
    seg = silence if silence is not None and len(silence) > SR else None
    if seg is None:
        # bruit estimé : trames calmes (hors voix) mises bout à bout
        n, h = int(0.02 * SR), int(0.01 * SR)
        bouts = [x[i * h:i * h + n] for i in np.where(~voix_mask)[0][:3000]]
        seg = np.concatenate(bouts) if bouts else None
    if seg is None or len(seg) < SR // 2:
        return {}
    f, p = welch(seg, SR, nperseg=min(len(seg), 1 << 15))
    out = {}
    for f0 in (50, 100, 150, 200):
        m = (f > f0 - 1.5) & (f < f0 + 1.5)
        vois = ((f > f0 - 15) & (f < f0 - 4)) | ((f > f0 + 4) & (f < f0 + 15))
        if m.any() and vois.any():
            out[f0] = round(float(10 * np.log10(p[m].max() / np.median(p[vois]))), 1)
    # souffle : part du bruit au-dessus de 4 kHz, et grondement sous 60 Hz
    tot = p.sum()
    out["souffle_part_pc"] = round(float(100 * p[f > 4000].sum() / tot), 1)
    out["grondement_part_pc"] = round(float(100 * p[f < 60].sum() / tot), 1)
    return out


def echo(lv, t, bruit, parole):
    """Durée de réverbération estimée d'après la façon dont le niveau retombe à la fin des phrases : après chaque fin de voix
    suivie d'au moins 0,4 s sans voix, on ajuste une droite (dB par seconde) sur la chute, de 8 dB sous la parole jusqu'à 30 dB plus bas
    (ou jusqu'au bruit de fond), et on en tire le temps de chute de 60 dB. Mesure grossière, calibrée sur une voix sèche et sur la même voix
    convoluée avec des pièces simulées : une pièce sèche donne 0,2 à 0,5 s, 0,7 s de réverbération réelle donne 0,6 à 0,85 s, 1 s donne 0,8 à 1,0 s."""
    n, mesures = len(lv), []
    seuil = parole - 8
    for i in range(2, n - 42):
        if lv[i - 1] >= seuil and lv[i] < seuil and (lv[i:i + 40] < seuil).all():
            plancher = max(bruit + 8, float(lv[i - 1]) - 30)
            j = i
            while j < n - 1 and lv[j] > plancher:
                j += 1
            if j - i < 3:
                mesures.append(0.12)                                  # chute trop rapide pour être mesurée : pièce très sèche
                continue
            pente = np.polyfit(t[i - 1:j], lv[i - 1:j], 1)[0]
            mesures.append(60 / max(1e-6, -pente))
    if len(mesures) < 2:
        return None
    return {"rt60_s": round(float(np.median(mesures)), 2), "mesures": len(mesures)}


def bande_passante(x, v2):
    f, p = welch(x, SR, nperseg=8192)
    d = 10 * np.log10(np.maximum(p, 1e-20))
    return float(f[np.where(d > d.max() - 70)[0].max()])


def asr(x, texte):
    from faster_whisper import WhisperModel
    from scipy.signal import resample_poly as rp
    root = os.environ.get("FW_ROOT")
    mod = WhisperModel("large-v3-turbo", device="cpu", compute_type="int8", download_root=root, cpu_threads=4)
    a16 = rp(x, 1, 3).astype(np.float32)
    segs, _ = mod.transcribe(a16, language="fr", beam_size=5, temperature=0, condition_on_previous_text=False, word_timestamps=True,
                             initial_prompt="Vidéo de vulgarisation scientifique sur la toile de Spider-Man, la soie d'araignée, le Kevlar.")
    mots = [{"w": w.word.strip(), "t0": round(w.start, 2), "t1": round(w.end, 2)} for s in segs for w in (s.words or [])]
    res = {"transcription": " ".join(m["w"] for m in mots), "mots": mots}
    if texte:
        def norm(s):
            s = s.lower().replace("’", "'")
            s = re.sub(r"\s*([-'])\s*", r"\1", s).replace("spider-man", "spiderman")
            return re.findall(r"[\wéèêàâîôûçùïœ']+", s)
        a, b = norm(texte), norm(res["transcription"])
        sm = difflib.SequenceMatcher(None, a, b, autojunk=False)
        manquants, remplaces, en_plus = [], [], []
        for tg, i0, i1, j0, j1 in sm.get_opcodes():
            if tg == "delete":
                manquants.append(" ".join(a[i0:i1]))
            elif tg == "replace":
                remplaces.append((" ".join(a[i0:i1]), " ".join(b[j0:j1])))
            elif tg == "insert":
                en_plus.append(" ".join(b[j0:j1]))
        res["attendus_retrouves_pc"] = round(100 * sum(blk.size for blk in sm.get_matching_blocks()) / max(1, len(a)))
        res["manquants"], res["remplaces"], res["en_plus"] = manquants, remplaces, en_plus
    return res


def juge(nom, valeur, bornes, libelles):
    """bornes croissantes ; libelles : un de plus que les bornes."""
    for b, l in zip(bornes, libelles):
        if valeur < b:
            return l
    return libelles[len(bornes)]


def controle(path, texte=None, silence_path=None, avec_asr=True):
    import pyloudnorm as pyln
    r = {"fichier": os.path.basename(path), "format": sonde(path)}
    x = charge(path)
    sil = charge(silence_path) if silence_path else None
    r["duree_s"] = round(len(x) / SR, 2)
    crete = float(db(np.abs(x).max()))
    x4 = resample_poly(x, 4, 1)
    r["crete_dbfs"] = round(crete, 1)
    r["crete_vraie_dbfs"] = round(float(db(np.abs(x4).max())), 1)
    r["ecretage"] = int((np.abs(x) > 0.995).sum())
    r["continu_dc_pc"] = round(float(100 * abs(x.mean())), 3)
    info, lv, t, v2 = bruit_et_parole(x, sil)
    r["bruit_dbfs"], r["bruit_source"], r["parole_dbfs"] = round(info["bruit_dbfs"], 1), info["bruit_source"], round(info["parole_dbfs"], 1)
    r["rapport_signal_bruit_db"] = round(info["parole_dbfs"] - info["bruit_dbfs"], 1)
    try:
        r["sonie_lufs"] = round(float(pyln.Meter(SR).integrated_loudness(x[v2_to_samples(v2, len(x))] if v2.any() else x)), 1)
    except Exception:
        r["sonie_lufs"] = None
    vt = np.where(v2)[0]
    r["debut_voix_s"] = round(float(t[vt[0]]), 2) if len(vt) else None
    r["fin_voix_s"] = round(float(t[vt[-1]] + 0.02), 2) if len(vt) else None
    r["silence_fin_s"] = round(r["duree_s"] - r["fin_voix_s"], 2) if len(vt) else None
    r["ronflement_souffle"] = ronflement(x, sil, v2)
    r["echo"] = echo(lv, t, info["bruit_dbfs"], info["parole_dbfs"])
    r["bande_passante_hz"] = round(bande_passante(x, v2))
    if avec_asr:
        try:
            r["lecture"] = asr(x, texte)
        except Exception as e:  # reconnaisseur absent : on le dit
            r["lecture"] = {"erreur": repr(e)[:200]}
    # ───── jugements ─────
    j = []
    niveau = r["parole_dbfs"]
    j.append(("Niveau de la voix", f"{niveau} dBFS (crête {r['crete_dbfs']})", juge("n", niveau, [-34, -30, -16, -12], ["trop faible : rapproche-toi ou monte le gain", "un peu faible (je remonte au montage, sans problème)", "bon", "fort (je baisse au montage)", "très fort : risque de saturation"])))
    if r["ecretage"] > 0 or r["crete_dbfs"] > -0.5:
        j.append(("Saturation", f"{r['ecretage']} échantillons écrêtés", "à refaire plus loin ou plus bas : une voix saturée ne se répare pas"))
    b = r["bruit_dbfs"]
    j.append(("Bruit de fond", f"{b} dBFS ({r['bruit_source']})", juge("b", b, [-62, -52, -44], ["excellent", "bon", "acceptable (je le réduis au montage)", "gênant : change de pièce ou ferme ce qui ronfle (frigo, ventilation)"])))
    snr = r["rapport_signal_bruit_db"]
    j.append(("Voix par rapport au bruit", f"{snr} dB", juge("s", -snr, [-40, -30, -22], ["excellent", "bon", "acceptable", "faible"]).replace("faible", "faible : le nettoyage abîmerait la voix")))
    if r["echo"]:
        e = r["echo"]["rt60_s"]
        j.append(("Écho de la pièce", f"≈ {e} s ({r['echo']['mesures']} fins de phrase, mesure grossière)", juge("e", e, [0.55, 0.8], ["pas d'écho gênant", "écho de pièce notable (je peux l'atténuer un peu)", "écho marqué : la voix sonnera « salle de bain »"])))
    else:
        j.append(("Écho de la pièce", "non mesurable (pas assez de silence après les phrases)", "laisse 1 à 2 s de silence après chaque phrase pour que je puisse le mesurer"))
    rs = r["ronflement_souffle"]
    ron = [f for f in (50, 100, 150, 200) if rs.get(f, 0) > 10]
    if ron:
        j.append(("Ronflement du secteur", f"raies à {', '.join(map(str, ron))} Hz", "présent (je le filtre, mais éloigne le téléphone des câbles et des chargeurs)"))
    if r["silence_fin_s"] is not None:
        j.append(("Silences début / fin", f"{r['debut_voix_s']} s avant, {r['silence_fin_s']} s après", "ok" if r["debut_voix_s"] >= 0.3 and r["silence_fin_s"] >= 0.4 else "un peu court : laisse 1 s de silence avant de parler et 1 s après"))
    lec = r.get("lecture", {})
    if "attendus_retrouves_pc" in lec:
        pb = lec["manquants"] + [f"« {x} » lu « {y} »" for x, y in lec["remplaces"]]
        txt = "tous les mots attendus sont reconnus" if not pb else "à vérifier : " + "; ".join(pb[:6])
        if lec["en_plus"]:
            txt += " (en plus, je n'ai pas gardé : « " + " / ".join(lec["en_plus"]) + " » : je le coupe au montage)"
        j.append(("Texte lu", f"{lec['attendus_retrouves_pc']} % des mots attendus retrouvés", txt))
    r["jugements"] = j
    return r


def v2_to_samples(v2, n):
    """Masque d'échantillons (48 kHz) correspondant aux trames de voix (pas de 10 ms, fenêtres de 20 ms)."""
    m = np.zeros(n, bool)
    for i in np.where(v2)[0]:
        m[i * 480:i * 480 + 960] = True
    return m


def affiche(r):
    print(f"\n=== {r['fichier']} : {r['format']['codec']} {r['format']['echantillonnage']} Hz, {r['format']['canaux']} voie(s), {r['format']['debit_kbps']} kbit/s, {r['duree_s']} s")
    for nom, val, jug in r["jugements"]:
        print(f"- {nom} : {val} → {jug}")
    lec = r.get("lecture", {})
    if lec.get("transcription"):
        print(f"- Lu par le reconnaisseur : « {lec['transcription']} »")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("fichiers", nargs="+")
    ap.add_argument("--texte", default=None)
    ap.add_argument("--silence", default=None, help="10 s de silence dans la même pièce (sert à mesurer le bruit de fond)")
    ap.add_argument("--json", default=None)
    ap.add_argument("--sans-asr", action="store_true")
    a = ap.parse_args()
    out = []
    for f in a.fichiers:
        r = controle(f, a.texte, a.silence, not a.sans_asr)
        affiche(r)
        out.append(r)
    if a.json:
        json.dump(out, open(a.json, "w"), ensure_ascii=False, indent=1, default=str)


if __name__ == "__main__":
    main()
