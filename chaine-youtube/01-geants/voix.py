"""Voix off : synthèse Kokoro (voix française ff_siwis) phrase par phrase,
avec le temps de chaque mot pour les sous-titres mot à mot.

    python voix.py MODELES_DIR SORTIE_DIR

MODELES_DIR contient kokoro-timed.onnx (Kokoro v1.0 avec la sortie « duration »
ajoutée) et voices-v1.0.bin. Écrit voix.wav (24 kHz mono), timeline.json et
timeline.js (window.TL = ...) que lisent piece.html et score.mjs.

Chaque phrase est une liste de paires [affiché, prononcé] : l'affiché est le
mot du sous-titre, le prononcé est ce que lit la voix (plusieurs mots possibles,
ou des phonèmes entre crochets quand espeak se trompe sur un nom).
"""
import json
import re
import sys

import numpy as np
import soundfile as sf
from kokoro_onnx import Kokoro

VOIX = "ff_siwis"
VITESSE = 1.08
SR = 24000

# id, pause après (s), mots
SCRIPT = [
    ("hook", 0.30, "Le plus grand animal de toute l'histoire de la Terre..."),
    ("dino", 0.70, "n'est pas un dinosaure."),
    ("humain", 0.45, "Pour mesurer les géants, prenons un humain: [1,75|un mètre soixante-quinze]."),
    ("quetzal", 0.15, "Il y a [68|soixante-huit] millions d'années, [Quetzalcoatlus|<kɛtsalkɔatlˈys>] planait avec [11|onze] mètres d'ailes."),
    ("vol", 0.55, "Le plus grand animal qui ait jamais volé."),
    ("argentino", 0.15, "Sur terre, Argentinosaurus: [35|trente-cinq] mètres, [70|soixante-dix] tonnes."),
    ("elephants", 0.55, "Plus lourd que [10|dix] éléphants."),
    ("megalodon", 0.55, "Dans la mer, le mégalodon: près de [20|vingt] mètres, avec des dents grandes comme une main."),
    ("fillette", 0.15, "En [2020|deux mille vingt], sur une plage anglaise, une fillette de [11|onze] ans ramasse un fossile."),
    ("ichthyo", 0.80, "C'est la mâchoire d'[Ichthyotitan|<iktjotitˈɑ̃>]: un reptile marin de [25|vingt-cinq] mètres."),
    ("mais", 0.65, "Mais le plus grand de tous..."),
    ("jamais", 0.90, "n'a jamais disparu."),
    ("baleine", 0.35, "La baleine bleue."),
    ("chiffres", 0.20, "[30|Trente] mètres, jusqu'à [190|cent quatre-vingt-dix] tonnes."),
    ("double", 0.70, "Plus de deux fois Argentinosaurus."),
    ("chasse", 0.15, "Au [XXe|vingtième] siècle, la chasse l'a presque effacée:"),
    ("360", 0.55, "dans l'Antarctique, il en restait environ [360|trois cent soixante]."),
    ("revient", 0.70, "Depuis, elles reviennent, lentement."),
    ("fin", 0.15, "Le plus grand animal de tous les temps est notre contemporain."),
    ("proteger", 0.00, "À nous de le protéger."),
]
START = 0.12  # première syllabe


def parse(line):
    """Liste de (affiché, prononcé) ; « [a|b] » affiche a et prononce b."""
    out = []
    for m in re.finditer(r"\[([^|\]]+)\|([^\]]+)\]([^\s\[]*)|([^\s\[]+)", line):
        if m.group(4):
            out.append((m.group(4), m.group(4)))
        else:
            tail = m.group(3) or ""
            out.append((m.group(1) + tail, m.group(2) + tail))
    # « d'[Ichthyotitan|…] » : le préfixe collé au crochet
    merged = []
    for show, say in out:
        if merged and merged[-1][0].endswith("'") and merged[-1][0] == merged[-1][1]:
            p = merged.pop()[0]
            show, say = p + show, p + say
        merged.append((show, say))
    return merged


def phonemes_for(k, pairs):
    """Phonèmes de la phrase, mot prononcé par mot prononcé, en gardant le
    contexte (liaisons) des passages en texte ordinaire."""
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
            parts.append(k.tokenizer.phonemize(s, "fr-fr"))
        else:
            # « d'<iktjotitˈɑ̃>: » → préfixe en texte, phonèmes, ponctuation
            m = re.match(r"(.*)<([^>]+)>(.*)", s)
            # espeak lit « d' » comme la lettre « dé » : on garde la consonne seule
            pre = {"d'": "d", "l'": "l"}.get(m.group(1), "")
            parts.append(pre + m.group(2) + m.group(3))
    ph = " ".join(p.strip() for p in parts)
    if "(" in ph:
        raise ValueError(f"espeak a changé de langue : {ph}")
    return ph


def main():
    models, out = sys.argv[1], sys.argv[2]
    k = Kokoro(f"{models}/kokoro-timed.onnx", f"{models}/voices-v1.0.bin")
    pieces, phrases = [], []
    t = START
    pieces.append(np.zeros(int(START * SR), np.float32))
    for pid, pause, line in SCRIPT:
        pairs = parse(line)
        ph = phonemes_for(k, pairs)
        audio, sr, spoken = k.create_timed(ph, VOIX, VITESSE, "fr-fr", is_phonemes=True)
        assert sr == SR
        # Mots prononcés : groupes de phonèmes séparés par des espaces
        groups, cur = [], []
        for s in spoken:
            if s.phoneme == " ":
                if cur:
                    groups.append(cur)
                cur = []
            else:
                cur.append(s)
        if cur:
            groups.append(cur)
        groups = [g for g in groups if any(re.match(r"\w", x.phoneme) for x in g)]
        say_words = [w for _, say in pairs for w in say.split()]
        if len(groups) != len(say_words):
            raise ValueError(f"{pid}: {len(groups)} groupes de phonèmes pour {len(say_words)} mots\n{ph}\n{say_words}")
        words, gi = [], 0
        for show, say in pairs:
            n = len(say.split())
            g = groups[gi:gi + n]
            gi += n
            ws = min(x.start for gg in g for x in gg)
            we = max(x.end for gg in g for x in gg)
            words.append({"w": show, "t0": round(t + ws, 3), "t1": round(t + we, 3)})
        dur = len(audio) / SR
        phrases.append({"id": pid, "t0": round(t, 3), "t1": round(t + dur, 3), "words": words, "text": line})
        print(f"{pid:10s} {t:6.2f} → {t + dur:6.2f}  {ph}")
        pieces.append(audio.astype(np.float32))
        pieces.append(np.zeros(int(pause * SR), np.float32))
        t += dur + pause
    voice = np.concatenate(pieces)
    sf.write(f"{out}/voix.wav", voice, SR)
    tl = {"duration": round(len(voice) / SR, 3), "phrases": phrases}
    with open(f"{out}/timeline.json", "w") as f:
        json.dump(tl, f, ensure_ascii=False, indent=1)
    with open(f"{out}/timeline.js", "w") as f:
        f.write("window.TL = " + json.dumps(tl, ensure_ascii=False) + ";\n")
    print("durée de la voix :", round(len(voice) / SR, 2), "s")


if __name__ == "__main__":
    main()
