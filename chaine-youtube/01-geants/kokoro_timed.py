"""Prépare la voix Kokoro (une fois) : télécharge le modèle depuis GitHub et lui
ajoute une sortie « duration » (durée de chaque phonème), pour que voix.py
connaisse le temps de chaque mot.

    python kokoro_timed.py modeles

Dépendances : pip install kokoro-onnx soundfile onnx
"""
import os
import sys
import urllib.request

import onnx
from onnx import TensorProto, helper

BASE = "https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/"


def main():
    out = sys.argv[1] if len(sys.argv) > 1 else "modeles"
    os.makedirs(out, exist_ok=True)
    for name in ("kokoro-v1.0.onnx", "voices-v1.0.bin"):
        path = os.path.join(out, name)
        if not os.path.exists(path):
            print("téléchargement", name)
            urllib.request.urlretrieve(BASE + name, path)
    m = onnx.load(os.path.join(out, "kokoro-v1.0.onnx"))
    g = m.graph
    # durées arrondies de chaque phonème (en trames), juste avant leur expansion
    g.node.append(helper.make_node("Identity", ["/encoder/Cast_output_0"], ["duration"]))
    g.output.append(helper.make_tensor_value_info("duration", TensorProto.INT64, None))
    onnx.save(m, os.path.join(out, "kokoro-timed.onnx"))
    print("prêt :", os.path.join(out, "kokoro-timed.onnx"))


if __name__ == "__main__":
    main()
