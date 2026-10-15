"""Prépare une voix Piper (une fois) : télécharge la voix depuis la page de versions de
sherpa-onnx sur GitHub et ajoute au modèle une sortie « duree » (durée de chaque
phonème). voix.py s'en sert pour savoir à quel instant chaque mot est dit.

    python modeles.py modeles pierre        # voix d'homme « Pierre » (UPMC, CC BY-SA 4.0)
    python modeles.py modeles tom           # voix d'homme « Tom » (44,1 kHz)

Écrit modeles/<voix>.onnx, modeles/<voix>.onnx.json et modeles/<voix>-duree.onnx.
Dépendances : pip install onnx
"""
import os
import sys
import tarfile
import urllib.request

import onnx
from onnx import TensorProto, helper

BASE = "https://github.com/k2-fsa/sherpa-onnx/releases/download/tts-models/"
VOIX = {
    "pierre": "vits-piper-fr_FR-upmc-medium",
    "tom": "vits-piper-fr_FR-tom-medium",
}


def main():
    out = sys.argv[1] if len(sys.argv) > 1 else "modeles"
    nom = sys.argv[2] if len(sys.argv) > 2 else "pierre"
    arch = VOIX[nom]
    os.makedirs(out, exist_ok=True)
    tar_path = os.path.join(out, arch + ".tar.bz2")
    if not os.path.exists(tar_path):
        print("téléchargement", arch)
        urllib.request.urlretrieve(BASE + arch + ".tar.bz2", tar_path)
    # on ne lit que le modèle et sa configuration, écrits sous des noms choisis ici
    with tarfile.open(tar_path, "r:bz2") as tar:
        for m in tar.getmembers():
            base = os.path.basename(m.name)
            if not m.isfile():
                continue
            if base.endswith(".onnx.json"):
                dest = os.path.join(out, nom + ".onnx.json")
            elif base.endswith(".onnx"):
                dest = os.path.join(out, nom + ".onnx")
            else:
                continue
            with open(dest, "wb") as f:
                f.write(tar.extractfile(m).read())
    m = onnx.load(os.path.join(out, nom + ".onnx"))
    g = m.graph
    ceil = [n for n in g.node if n.op_type == "Ceil"]
    assert len(ceil) == 1, "le graphe n'a pas le nœud attendu (durées arrondies)"
    g.node.append(helper.make_node("Identity", [ceil[0].output[0]], ["duree"]))
    g.output.append(helper.make_tensor_value_info("duree", TensorProto.FLOAT, None))
    onnx.save(m, os.path.join(out, nom + "-duree.onnx"))
    print("prêt :", os.path.join(out, nom + "-duree.onnx"))


if __name__ == "__main__":
    main()
