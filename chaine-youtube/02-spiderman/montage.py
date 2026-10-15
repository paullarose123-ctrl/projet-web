"""Montage de la voix enregistrée : des prises p01 … p18 (m4a, wav, mp3…) à build/voix.wav et build/timeline.json / timeline.js.

    python montage.py DOSSIER_PRISES SORTIE_DIR [--silence silence.wav] [--gmax 0.75] [--choix choix.json] [--retouches retouches.json]

Ce que fait le montage, paragraphe par paragraphe (les paragraphes sont ceux de GROUPES dans voix.py) :
  1. chaque prise est décodée (mono, 48 kHz) et passée dans un filtre coupe-bas (75 Hz : grondements, souffle des « p ») ;
  1 bis. les sons que l'auteur ne veut pas garder (un « mhhh » avant une phrase) sont listés dans voix-perso/retouches.json, avec leur intervalle
     dans la prise brute : ils sont remplacés par l'ambiance de la pièce (le passage le plus calme de la même prise), sans rien décaler ;
  2. un reconnaisseur de parole (faster-whisper large-v3-turbo) relit la prise ; on retrouve chaque phrase du texte dans ce qui a été dit.
     Ce qui n'est pas dans le texte (« paragraphe cinq », un faux départ, une phrase reprise) est écarté ; si une phrase a été dite deux fois,
     on garde la dernière version qui convient. S'il y a plusieurs prises d'un paragraphe (p05, p05b…), on garde celle qui couvre le mieux le texte ;
  3. le texte connu est calé mot à mot sur le son (alignement forcé, images de 20 ms) : c'est ce qui donne les temps des sous-titres et des plans ;
  4. la prise est coupée juste avant le premier mot et juste après le dernier (avec un fondu de 12 ms), les silences trop longs au milieu sont
     raccourcis (jamais les respirations : on coupe au milieu du silence, en gardant 0,15 s après un mot et 0,25 s avant le suivant) ;
  5. un gain par paragraphe rapproche les volumes (on ne corrige que 70 % de l'écart : une voix un peu plus basse pour une blague reste plus basse) ;
  6. les silences entre paragraphes suivent le sens (pauses voulues de SCRIPT) et sont remplis avec le bruit de la pièce (fichier de silence), pas
     avec du silence numérique, qui sonnerait « mort » ;
  7. un seul réglage de niveau pour tout le texte (−19 LUFS), comme pour la voix de synthèse.
Écrit aussi SORTIE_DIR/montage_rapport.md (prise retenue, mots reconnus, silences raccourcis, gain) : c'est là qu'on voit un mot mal dit.
Rien de tout cela ne dit comment la voix sonne à l'oreille : c'est à l'auteur de relire le montage."""
import argparse
import difflib
import glob
import hashlib
import json
import math
import os
import re
import subprocess
import sys

import numpy as np
import soundfile as sf
from scipy.signal import butter, sosfiltfilt

import controle_micro as cm
import voix

SR = 48000
LEAD, TAIL = 0.10, 0.15            # ambiance gardée avant la première plage de voix et après la dernière (secondes)
GUARD_APRES, GUARD_AVANT = 0.15, 0.25   # zone protégée autour des mots quand on raccourcit un silence
FADE = 0.012
NUM = {"1": "un", "2": "deux", "3": "trois", "6": "six", "10": "dix", "2013": "deux mille treize"}


# ───────── texte attendu ─────────
def attendus_groupe(g, par_id):
    """Mots à dire dans ce paragraphe : liste de dicts {w (dit), id, pair (index de la paire affichée), fin (fin de phrase)} et les paires affichées."""
    mots, paires = [], []
    for pid in g["ids"]:
        for show, say in voix.parse(par_id[pid][1]):
            ws = [voix.lu(w) for w in say.split()]
            paires.append({"id": pid, "show": show, "n": len(ws), "debut": len(mots)})
            fin = bool(re.search(r"[.?!]$", show)) and not show.endswith("...")
            for k, w in enumerate(ws):
                mots.append({"w": w, "id": pid, "pair": len(paires) - 1, "fin": fin and k == len(ws) - 1})
    return mots, paires


def cle(w):
    w = w.lower().replace("’", "'")
    w = re.sub(r"[^\wéèêàâîôûçùïœ'-]", "", w)
    return re.sub(r"[-']", "", w)


def unites(mots):
    """Phrases : listes d'indices de mots."""
    out, cur = [], []
    for i, m in enumerate(mots):
        cur.append(i)
        if m["fin"]:
            out.append(cur)
            cur = []
    if cur:
        out.append(cur)
    return out


# ───────── ce qui a été dit ─────────
def fusionne(ws):
    """Recolle « qu » + « 'un », « Spider » + « -Man » ; remplace les chiffres par les mots."""
    out = []
    for w in ws:
        t = w["text"]
        if out and (t[:1] in ("'", "’", "-") or out[-1]["text"][-1:] in ("'", "’", "-")):
            out[-1] = {"text": out[-1]["text"] + t, "t0": out[-1]["t0"], "t1": w["t1"]}
        else:
            out.append(dict(w))
    res = []
    for w in out:
        core = re.sub(r"[^\d]", "", w["text"])
        if core and core == re.sub(r"[\s.,!?;:]", "", w["text"]) and core in NUM:
            parts = NUM[core].split()
            d = (w["t1"] - w["t0"]) / len(parts)
            for k, p in enumerate(parts):
                res.append({"text": p, "t0": w["t0"] + k * d, "t1": w["t0"] + (k + 1) * d})
        else:
            res.append(w)
    return res


def prise_cache(path, x, cache_dir):
    """Mots reconnus (avec temps) d'une prise (après retouches) ; gardés dans SORTIE/prises_cache pour ne pas relancer le reconnaisseur."""
    os.makedirs(cache_dir, exist_ok=True)
    h = hashlib.sha1(open(path, "rb").read() + json.dumps(RET.get(os.path.basename(path), []), sort_keys=True).encode()).hexdigest()[:12]
    f = f"{cache_dir}/{os.path.basename(path)}.{h}.json"
    if os.path.exists(f):
        return json.load(open(f))
    ws = voix.mots_whisper(x, SR)
    json.dump(ws, open(f, "w"), ensure_ascii=False)
    return ws


# ───────── retrouver les phrases dans ce qui a été dit ─────────
def fenetres(e, H, tmin=0.6):
    """Toutes les fenêtres de H qui ressemblent à la phrase e (liste de clés), en gardant la meilleure par endroit."""
    n, cands = len(e), []
    for s in range(len(H)):
        for L in range(max(1, n - 3), n + 5):
            if s + L > len(H):
                break
            r = difflib.SequenceMatcher(None, e, H[s:s + L], autojunk=False).ratio()
            if r >= tmin:
                cands.append((s, s + L, r))
    cands.sort(key=lambda c: -c[2])
    gardes = []
    for c in cands:
        if all(min(c[1], k[1]) - max(c[0], k[0]) < 0.5 * min(c[1] - c[0], k[1] - k[0]) for k in gardes):
            gardes.append(c)
    return sorted(gardes)


def affecte(unit_keys, H, saut=0.6):
    """Affectation monotone d'une fenêtre de H à chaque phrase (programmation dynamique). Une phrase peut être sautée (pénalité) ; une reprise
    ultérieure d'une phrase est préférée quand elle est presque aussi bonne. Renvoie ([(s, e, ressemblance) ou None par phrase], score)."""
    K = len(unit_keys)
    C = [fenetres(e, H) for e in unit_keys]
    g = {}                                              # (k, i) -> (score, précédent)
    for k in range(K):
        for i, (s, e, r) in enumerate(C[k]):
            bonus = 0.04 * min(i, 3)
            meilleur, prec = 0.0 - saut * k, None         # rien avant : les k phrases précédentes sautées
            for k2 in range(k):
                for i2, (s2, e2, r2) in enumerate(C[k2]):
                    if e2 <= s and (k2, i2) in g:
                        v = g[(k2, i2)][0] - saut * (k - k2 - 1)
                        if v > meilleur:
                            meilleur, prec = v, (k2, i2)
            g[(k, i)] = (r + bonus + meilleur, prec)
    res = [None] * K
    if not g:
        return res, 0.0
    fin = max(g, key=lambda ki: g[ki][0] - saut * (K - 1 - ki[0]))
    score = g[fin][0] - saut * (K - 1 - fin[0])
    ki = fin
    while ki is not None:
        res[ki[0]] = C[ki[0]][ki[1]]
        ki = g[ki][1]
    return res, score


# ───────── son ─────────
def decode(path):
    x = cm.charge(path)
    return sosfiltfilt(butter(2, 75, btype="highpass", fs=SR, output="sos"), x).astype(np.float32)


RETOUCHES = os.path.join(os.path.dirname(os.path.abspath(__file__)), "voix-perso", "retouches.json")
RET = {}        # {"p09.m4a": [{"de": s, "a": s, "note": "…"}]} : rempli par main()


def retouche(x, liste):
    """Remplace par l'ambiance de la prise les sons à ne pas garder (liste de {"de", "a", "note"}, en secondes de la prise brute).
    On remplace au lieu de couper : les temps du reste de la prise ne bougent pas, et le reconnaisseur comme la détection de voix ne voient
    plus qu'une pièce calme à cet endroit. L'ambiance est le passage le plus calme de la même prise (même micro, même pièce, même niveau),
    fondu sur 10 ms aux deux bouts."""
    if not liste:
        return x
    x = x.copy()
    lv, t = cm.niveaux(x.astype(np.float64))
    bruit = float(np.percentile(lv, 10))
    for r in liste:
        a, b = int(round(r["de"] * SR)), int(round(r["a"] * SR))
        n, f = b - a, int(0.010 * SR)
        k = max(2, int(round(n / SR / 0.01)))                      # durée en trames de 10 ms
        best, bt = None, None
        for i in range(int(0.2 / 0.01), len(lv) - k):              # pas avant 0,2 s : l'encodeur y met parfois du silence numérique
            s0 = t[i]
            if s0 + n / SR > r["de"] - 0.05 and s0 < r["a"] + 0.05:
                continue                                           # pas dans la zone retirée
            seg = lv[i:i + k]
            if seg.mean() < bruit - 8:
                continue                                           # silence numérique
            v = float(np.percentile(seg, 95))
            if best is None or v < best:
                best, bt = v, s0
        if bt is None:
            amb = np.random.default_rng(3).normal(0, 10 ** (bruit / 20), n)
        else:
            amb = x[int(bt * SR):int(bt * SR) + n].astype(np.float64)
        w = np.ones(n)
        w[:f] = np.linspace(0, 1, f)
        w[-f:] = np.linspace(1, 0, f)
        x[a:b] = (x[a:b] * (1 - w) + amb * w).astype(np.float32)
    return x


class Salle:
    """Bruit de la pièce (fichier de silence), servi en morceaux de la durée voulue."""
    def __init__(self, path):
        self.rng = np.random.default_rng(7)
        if path and os.path.exists(path):
            s = decode(path)
            s = s[int(0.2 * SR):-int(0.2 * SR)] if len(s) > 2 * SR else s
            self.s = s
        else:
            self.s = (self.rng.normal(0, 10 ** (-75 / 20), 4 * SR)).astype(np.float32)

    def prend(self, sec):
        n = int(round(sec * SR))
        if n <= 0:
            return np.zeros(0, np.float32)
        out = np.zeros(n, np.float32)
        pos, f = 0, int(0.025 * SR)
        while pos < n:
            L = min(n - pos, len(self.s) - 1)
            a = int(self.rng.integers(0, max(1, len(self.s) - L)))
            seg = self.s[a:a + L].copy()
            if pos > 0:
                m = min(f, len(seg), pos)
                w = np.linspace(0, 1, m, dtype=np.float32)
                out[pos - m:pos] = out[pos - m:pos] * (1 - w) + seg[:m] * w
                seg = seg[m:] if m < len(seg) else seg[:0]
            out[pos:pos + len(seg)] = seg[:n - pos]
            pos += len(seg)
            if len(seg) == 0:
                break
        return out


def fondu(a):
    f = min(int(FADE * SR), len(a) // 2)
    if f > 0:
        a[:f] *= np.linspace(0, 1, f, dtype=np.float32)
        a[-f:] *= np.linspace(1, 0, f, dtype=np.float32)
    return a


# ───────── un paragraphe ─────────
ECART = 0.22          # silence (s) qui sépare deux plages de voix
ANNONCE = {"paragraphe", "numero", "numéro", "test", "silence", "un", "deux", "trois", "quatre", "cinq", "six", "sept", "huit", "neuf", "dix", "onze", "douze",
           "treize", "quatorze", "quinze", "seize", "dixsept", "dixhuit", "p", "pe"}
FIN_PARASITE = {"voila", "voilà", "termine", "terminé", "fin", "stop", "merci", "ok"}


def plages_voix(x):
    """Plages de voix de la prise (début, fin) : trames à plus de 10 dB au-dessus du bruit de la pièce, séparées par au moins 0,22 s de calme.
    C'est ce qui borne les coupes : on ne coupe jamais au milieu d'un mot, même si le reconnaisseur s'est trompé sur ses bords."""
    lv, t = cm.niveaux(x.astype(np.float64))
    bruit = float(np.percentile(lv, 10))
    idx = np.where(lv > bruit + 10)[0]
    runs = []
    if len(idx):
        s0 = p = idx[0]
        for i in idx[1:]:
            if (i - p) * 0.01 > ECART:
                runs.append((float(t[s0]), float(t[p] + 0.02)))
                s0 = i
            p = i
        runs.append((float(t[s0]), float(t[p] + 0.02)))
    return [r for r in runs if r[1] - r[0] >= 0.12], bruit


def plages_de(runs, ta, tb):
    """Indices (premier, dernier) des plages de voix qui recouvrent [ta, tb] à 0,1 s près ; à défaut, la plus proche."""
    r = [i for i, (a, b) in enumerate(runs) if b >= ta - 0.1 and a <= tb + 0.1]
    if r:
        return min(r), max(r)
    c = (ta + tb) / 2
    i = min(range(len(runs)), key=lambda k: abs((runs[k][0] + runs[k][1]) / 2 - c))
    return i, i


def region(x, A, B, mots_idx, gmax_fn, bruit):
    """Une région de la prise : [A, B] s, bornée par des silences. Alignement forcé du texte attendu sur la fenêtre, raccourcissement des
    silences trop longs. Renvoie (audio, temps des mots [(t0, t1)] dans l'audio, silences raccourcis [(t, durée)], alertes)."""
    mots_txt = [m["w"] for m in mots_idx]
    clip = x[int(A * SR):int(B * SR)].copy()
    tm = voix.mots_forces(clip, SR, mots_txt)
    t0s = [m["t0"] for m in tm]
    t1s = [m["t1"] for m in tm]
    alerte = []
    # une coupe en plein son se verrait : le niveau aux deux bouts de la fenêtre doit être celui de la pièce
    n30 = int(0.03 * SR)
    for nom, seg in (("début", clip[:n30]), ("fin", clip[-n30:])):
        if len(seg) and 20 * np.log10(np.sqrt(np.mean(seg.astype(np.float64) ** 2)) + 1e-9) > bruit + 14:
            alerte.append(f"coupe en plein son au {nom} de la région ({A:.2f}–{B:.2f} s)")
    # silences longs : on retire le surplus au milieu de la zone protégée
    cuts = []
    for i in range(len(mots_idx) - 1):
        g = t0s[i + 1] - t1s[i]
        gm = gmax_fn(mots_idx[i])
        if g > gm:
            r0, r1 = t1s[i] + GUARD_APRES, t0s[i + 1] - GUARD_AVANT
            retirer = min(r1 - r0, g - gm)
            if retirer > 0.03:
                mid = (r0 + r1) / 2
                cuts.append((mid - retirer / 2, mid + retirer / 2))
    morceaux, prec = [], 0.0
    for a, b in cuts:
        morceaux.append(fondu(clip[int(prec * SR):int(a * SR)].copy()))
        prec = b
    morceaux.append(fondu(clip[int(prec * SR):].copy()))
    audio = np.concatenate(morceaux)

    def dec(t):
        return t - sum(max(0.0, min(t, b) - a) for a, b in cuts)

    tw = [(dec(a), dec(b)) for a, b in zip(t0s, t1s)]
    for i, (a, b) in enumerate(tw):          # un mot de durée anormale : signe d'un mauvais alignement
        if b - a > 1.4 or b - a < 0.03:
            alerte.append(f"« {mots_idx[i]['w']} » dure {b - a:.2f} s")
    return audio, tw, [(a, b - a) for a, b in cuts], alerte


def paragraphe(gi, g, par_id, prises, cache, gmax):
    mots, paires = attendus_groupe(g, par_id)
    uni = unites(mots)
    ukeys = [[cle(mots[i]["w"]) for i in u] for u in uni]
    rap = {"gi": gi, "prises": []}
    meilleur = None
    for path in prises:
        x = retouche(decode(path), RET.get(os.path.basename(path)))
        H = fusionne(prise_cache(path, x, cache))
        Hk = [cle(w["text"]) for w in H]
        aff, score = affecte(ukeys, Hk)
        trouvees = sum(1 for a in aff if a)
        moy = float(np.mean([a[2] for a in aff if a])) if trouvees else 0.0
        couv = sum(len(u) for u, a in zip(uni, aff) if a) / len(mots)
        rap["prises"].append({"fichier": os.path.basename(path), "phrases_trouvees": f"{trouvees}/{len(uni)}", "ressemblance": round(moy, 2), "dit": " ".join(w["text"] for w in H)})
        cand = (couv, moy, path, x, H, aff, rap["prises"][-1])
        if meilleur is None or (round(cand[0], 3), round(cand[1], 3)) >= (round(meilleur[0], 3), round(meilleur[1], 3)):      # à égalité, la prise la plus tardive
            meilleur = cand
    couv, moy, path, x, H, aff, info = meilleur
    rap["retenue_info"] = info
    rap["retenue"] = os.path.basename(path)
    rap["retouches"] = [f"{r['de']:.2f}–{r['a']:.2f} s{' : ' + r['note'] if r.get('note') else ''}" for r in RET.get(os.path.basename(path), [])]
    rap["alertes"] = []
    runs, bruit = plages_voix(x)
    if not runs:
        rap["erreur"] = "aucune voix dans la prise"
        return None, rap
    manquantes = [k for k, a in enumerate(aff) if a is None]
    # régions : groupes de phrases qui tiennent dans des plages de voix voisines ; les plages sans phrase (annonce, faux départ) sont écartées
    regs = []                                           # (phrases, première plage, dernière plage)
    if manquantes:
        # une phrase n'a pas été reconnue : on prend toute la voix de la prise (sans les annonces) comme une seule lecture du texte
        rap["alertes"].append("phrases non reconnues (" + " / ".join(" ".join(mots[i]["w"] for i in uni[k]) for k in manquantes) + ") : toute la voix de la prise est utilisée telle quelle")
        r0, r1 = 0, len(runs) - 1
        def mots_de(r):
            return [cle(w["text"]) for w in H if w["t0"] >= runs[r][0] - 0.05 and w["t1"] <= runs[r][1] + 0.1]
        while r0 < r1 and mots_de(r0) and all(k in ANNONCE for k in mots_de(r0)):
            r0 += 1
        while r1 > r0 and mots_de(r1) and all(k in FIN_PARASITE for k in mots_de(r1)):
            r1 -= 1
        regs.append((list(range(len(uni))), r0, r1))
    else:
        for k, a in enumerate(aff):
            r0, r1 = plages_de(runs, H[a[0]]["t0"], H[a[1] - 1]["t1"])
            if regs and r0 <= regs[-1][2] + 1 and r1 >= regs[-1][1]:
                regs[-1] = (regs[-1][0] + [k], min(regs[-1][1], r0), max(regs[-1][2], r1))
            else:
                regs.append(([k], r0, r1))
    pieces, tw_all, coupes = [], [None] * len(mots), []
    for n_reg, (ks, r0, r1) in enumerate(regs):
        idx = [i for k in ks for i in uni[k]]
        A = max(0.0, runs[r0][0] - LEAD)
        if r0 > 0:
            A = max(A, runs[r0 - 1][1] + 0.05)
        B = min(len(x) / SR, runs[r1][1] + TAIL)
        if r1 + 1 < len(runs):
            B = min(B, runs[r1 + 1][0] - 0.05)
        if n_reg == 0 and aff[ks[0]] is not None:
            # annonce dite d'un trait avec le début du texte (« paragraphe cinq, … » sans pause) : on ne la garde pas
            s_first = aff[ks[0]][0]
            exclus = [w for w in H[:s_first] if w["t0"] >= runs[r0][0] - 0.05]
            if exclus and all(cle(w["text"]) in ANNONCE or w["text"].isdigit() for w in exclus):
                A = max(A, exclus[-1]["t1"] + 0.03)
        mi = []
        for i in idx:
            m = dict(mots[i])
            m["show"] = paires[m["pair"]]["show"]
            mi.append(m)

        def gm(m, _g=gmax):
            if m["show"].endswith("..."):
                return _g[2]
            return _g[1] if m["fin"] else _g[0]
        audio, tw, cuts, al = region(x, A, B, mi, gm, bruit)
        if pieces:
            pieces.append(("pause", max(0.0, 0.35 - (LEAD + TAIL))))
        off = sum(p[1] if p[0] == "pause" else len(p[1]) / SR for p in pieces)
        for i, (a, b) in zip(idx, tw):
            tw_all[i] = (off + a, off + b)
        pieces.append(("audio", audio))
        coupes += [(round(off + a, 2), round(d, 2)) for a, d in cuts]
        rap["alertes"] += al
    for i, t in enumerate(tw_all):
        if t is None:
            prev = next((tw_all[j] for j in range(i - 1, -1, -1) if tw_all[j]), (0.0, 0.0))
            tw_all[i] = (prev[1], prev[1] + 0.2)
    rap["silences_raccourcis"] = coupes
    rap["regions"] = [(ks, round(runs[r0][0], 2), round(runs[r1][1], 2)) for ks, r0, r1 in regs]
    # plages de voix de la prise qui n'entrent pas dans le montage (annonce, faux départ, reprise) et ce qu'on y entend : à relire
    gardees = {r for _, r0, r1 in regs for r in range(r0, r1 + 1)}
    rap["ecartees"] = []
    for r, (ra, rb) in enumerate(runs):
        if r not in gardees:
            dit = " ".join(w["text"] for w in H if w["t0"] >= ra - 0.05 and w["t1"] <= rb + 0.1)
            rap["ecartees"].append(f"{ra:.1f}–{rb:.1f} s « {dit or '…'} »")
    return {"pieces": pieces, "tw": tw_all, "mots": mots, "paires": paires}, rap


# ───────── tout le film ─────────
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("prises")
    ap.add_argument("sortie")
    ap.add_argument("--silence", default=None, help="fichier de silence (bruit de la pièce) ; par défaut PRISES/silence.*")
    ap.add_argument("--gmax", default="0.7,0.9,1.3", help="silence maximal (s) après un mot, après une fin de phrase, après « ... »")
    ap.add_argument("--seulement", default="", help="numéros de paragraphes à traiter (essai : « 1,2,3 »), tous par défaut")
    ap.add_argument("--choix", default=None, help="json {\"p05\": \"p05b.m4a\"} pour forcer une prise")
    ap.add_argument("--retouches", default=RETOUCHES, help="json {\"p09.m4a\": [{\"de\": 1.6, \"a\": 2.08, \"note\": \"mhhh\"}]} : sons de la prise brute à remplacer par l'ambiance (par défaut voix-perso/retouches.json s'il existe ; \"\" pour aucune retouche)")
    a = ap.parse_args()
    gmax = [float(v) for v in a.gmax.split(",")]
    cache = f"{a.sortie}/prises_cache"
    sil = a.silence or next(iter(glob.glob(f"{a.prises}/silence.*")), None)
    salle = Salle(sil)
    choix = json.load(open(a.choix)) if a.choix else {}
    RET.update(json.load(open(a.retouches, encoding="utf-8")) if a.retouches and os.path.exists(a.retouches) else {})
    par_id = {pid: (pause * voix.PAUSE_K, line) for pid, pause, line in voix.SCRIPT}
    fichiers = {}
    for f in sorted(glob.glob(f"{a.prises}/*")):
        m = re.match(r"^p(\d\d)([a-z]?)\.(m4a|wav|mp3|aac|flac|ogg|mp4)$", os.path.basename(f), re.I)
        if m:
            fichiers.setdefault(int(m.group(1)), []).append(f)
    liste = [(gi, g) for gi, g in enumerate(voix.GROUPES, 1) if not a.seulement or gi in {int(v) for v in a.seulement.split(",")}]
    manque = [gi for gi, _ in liste if gi not in fichiers]
    if manque:
        print("prises manquantes :", manque)
        sys.exit(1)
    morceaux, rapports, gains_lufs = [], [], []
    import pyloudnorm as pyln
    meter = pyln.Meter(SR)
    for gi, g in liste:
        prises = fichiers[gi]
        if f"p{gi:02d}" in choix:
            prises = [p for p in prises if os.path.basename(p) == choix[f"p{gi:02d}"]] or prises
        res, rap = paragraphe(gi, g, par_id, prises, cache, gmax)
        rapports.append(rap)
        if res is None:
            print(f"p{gi:02d} : {rap.get('erreur')}")
            sys.exit(2)
        # audio du paragraphe
        parts = []
        for kind, v in res["pieces"]:
            parts.append(v if kind == "audio" else salle.prend(v))
        par_audio = np.concatenate(parts) if parts else np.zeros(0, np.float32)
        try:
            lufs = float(meter.integrated_loudness(par_audio.astype(np.float64)))
        except Exception:
            lufs = -30.0
        rap["lufs"] = round(lufs, 1)
        gains_lufs.append(lufs)
        morceaux.append((res, par_audio))
        print(f"p{gi:02d} {rap['retenue']:12s} phrases {rap['retenue_info']['phrases_trouvees']:>4s} ressemblance {rap['retenue_info']['ressemblance']:.2f} durée {len(par_audio) / SR:5.2f}s niveau {lufs:6.1f} LUFS"
              + (f"  ALERTES {rap['alertes']}" if rap["alertes"] else ""))
    # niveaux : on corrige 70 % de l'écart à la médiane, au plus ±6 dB
    med = float(np.median(gains_lufs))
    gdb = [float(np.clip(0.7 * (med - l), -6, 6)) for l in gains_lufs]
    # assemblage
    voice = [salle.prend(voix.START)]
    t = voix.START
    phrases = []
    for n, ((res, par_audio), gd, (gi, g)) in enumerate(zip(morceaux, gdb, liste)):
        rapports[n]["gain_db"] = round(gd, 1)
        au = (par_audio * 10 ** (gd / 20)).astype(np.float32)
        tw, mots, paires = res["tw"], res["mots"], res["paires"]
        for pid in g["ids"]:
            words = []
            for pr in [p for p in paires if p["id"] == pid]:
                d0, d1 = tw[pr["debut"]][0], tw[pr["debut"] + pr["n"] - 1][1]
                words.append({"w": pr["show"], "t0": round(t + d0, 3), "t1": round(t + d1, 3)})
            phrases.append({"id": pid, "t0": words[0]["t0"], "t1": words[-1]["t1"], "words": words, "text": par_id[pid][1]})
        voice.append(au)
        t += len(au) / SR
        # pause voulue après le paragraphe, moins l'ambiance déjà gardée autour des mots
        if n < len(liste) - 1:
            voulu = par_id[g["ids"][-1]][0] + voix.ENTRE
            fill = max(0.0, voulu - (TAIL + LEAD))
            voice.append(salle.prend(fill))
            t += fill
    v48 = np.concatenate(voice).astype(np.float32)
    os.makedirs(a.sortie, exist_ok=True)
    sf.write(f"{a.sortie}/voix_brut.wav", v48, SR, subtype="PCM_24")
    p = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", f"{a.sortie}/voix_brut.wav", "-af", "ebur128", "-f", "null", "-"], capture_output=True, text=True)
    lufs = float(re.findall(r"I:\s+(-?[\d.]+) LUFS", p.stderr)[-1])
    k = 10 ** ((-19.0 - lufs) / 20)
    crete_avant = float(np.abs(v48).max() * k)
    v48 = (v48 * k).astype(np.float32)
    # une voix parlée a des pointes (« p », « t ») bien au-dessus de son niveau moyen : un limiteur à −0,9 dBFS, avec anticipation, les rabote
    # sans écrêter (quelques dixièmes de dB sur de très rares pointes)
    sf.write(f"{a.sortie}/voix_niveau.wav", v48, SR, subtype="FLOAT")
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", f"{a.sortie}/voix_niveau.wav", "-af", "alimiter=limit=0.9:attack=3:release=40:level=false", "-c:a", "pcm_f32le", f"{a.sortie}/voix_limitee.wav"], check=True)
    v48, _ = sf.read(f"{a.sortie}/voix_limitee.wav", dtype="float32")
    os.remove(f"{a.sortie}/voix_niveau.wav"); os.remove(f"{a.sortie}/voix_limitee.wav")
    crete = float(np.abs(v48).max())
    sf.write(f"{a.sortie}/voix.wav", v48, SR, subtype="PCM_24")
    tl = {"duration": round(len(v48) / SR, 3), "voix": "enregistrée", "phrases": phrases}
    json.dump(tl, open(f"{a.sortie}/timeline.json", "w"), ensure_ascii=False, indent=1)
    open(f"{a.sortie}/timeline.js", "w").write("window.TL = " + json.dumps(tl, ensure_ascii=False) + ";\n")
    # rapport
    L = ["# Rapport de montage de la voix", "", f"Durée de la voix : {len(v48) / SR:.1f} s · niveau {lufs:.1f} → −19 LUFS (crête {20 * math.log10(max(crete_avant, 1e-9)):.1f} dBFS avant limiteur, {20 * math.log10(max(crete, 1e-9)):.1f} après)", "",
         "| Paragraphe | Prise | Phrases retrouvées | Ressemblance texte/prise | Niveau (LUFS) | Gain (dB) | Silences raccourcis | Voix écartée | Retouches | Alertes |", "|---|---|---|---|---|---|---|---|---|---|"]
    for r in rapports:
        L.append(f"| p{r['gi']:02d} | {r['retenue']} | {r['retenue_info']['phrases_trouvees']} | {r['retenue_info']['ressemblance']:.2f} | {r['lufs']} | {r['gain_db']} | {len(r['silences_raccourcis'])} | {'; '.join(r['ecartees']) or '-'} | {'; '.join(r['retouches']) or '-'} | {'; '.join(r['alertes']) or '-'} |")
    L += ["", "## Ce que le reconnaisseur a entendu", ""]
    for r in rapports:
        for pr in r["prises"]:
            L.append(f"- **p{r['gi']:02d}** ({pr['fichier']}) : {pr['dit']}")
    open(f"{a.sortie}/montage_rapport.md", "w", encoding="utf-8").write("\n".join(L) + "\n")
    print("durée de la voix :", round(len(v48) / SR, 2), "s ; niveau", round(lufs, 1), "→ −19 LUFS ; rapport :", f"{a.sortie}/montage_rapport.md")


if __name__ == "__main__":
    main()
