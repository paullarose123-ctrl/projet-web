"""Écrit le fichier de paragraphes que lisent les moteurs de voix (synth_*.py, choisir_prises.py) à partir de voix.py :

    python preparer.py groupes.json [--base -0.5]

Un paragraphe = {"id": "g<n>", "text": le texte tel que le lit la voix (écritures prononcées : « deux mille treize »), "bonus": débit,
"moteur": (facultatif) une écriture que le moteur lit mieux, par exemple « pare balles » pour « pare-balles » : le moteur avalait la fin du mot}.
Le débit relatif de chaque paragraphe reprend celui de GROUPES (voix.py) : un paragraphe écrit « -7 % » (la blague de l'appétit) est plus lent,
un paragraphe « +3 % » (la question d'accroche) plus rapide. Le moteur Kyutai règle le débit par un bonus de pause : positif = plus lent.
La hauteur de GROUPES ne sert qu'au service Edge."""
import argparse
import json
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
import voix

# écritures que le moteur lit mieux que celles du sous-titre (champ « moteur » du paragraphe ; le texte de contrôle reste l'original)
MOTEUR = {"pare-balles": "pare balles"}

ap = argparse.ArgumentParser()
ap.add_argument("sortie")
ap.add_argument("--base", type=float, default=-0.5, help="bonus de débit de base (0 : débit naturel du modèle)")
a = ap.parse_args()
par_id = {pid: (pause * voix.PAUSE_K, line) for pid, pause, line in voix.SCRIPT}
out = []
for gi, g in enumerate(voix.GROUPES, 1):
    texte = " ".join(voix.lu(w) for pid in g["ids"] for _, say in voix.parse(par_id[pid][1]) for w in say.split())
    rate = int(g["rate"].rstrip("%"))
    o = {"id": f"g{gi}", "text": texte, "bonus": round(a.base - rate / 10, 1)}
    lu = texte
    for k, v in MOTEUR.items():
        lu = lu.replace(k, v)
    if lu != texte:
        o["moteur"] = lu
    out.append(o)
json.dump(out, open(a.sortie, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print(len(out), "paragraphes →", a.sortie)
for o in out:
    print(f"  {o['id']:4s} débit {o['bonus']:+.1f}  {o['text'][:80]}")
