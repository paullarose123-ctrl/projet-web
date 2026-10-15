# Voix enregistrée (ta voix)

Dépose ici les fichiers audio (WAV, M4A ou MP3, peu importe) :

| Fichier | Contenu |
|---|---|
| `test1`, `test2`, `test3` | les trois phrases de test |
| `silence` | 10 secondes de silence dans la même pièce, à la même distance |
| `p01` … `p18` | les 18 paragraphes (`p05b` = deuxième prise du paragraphe 5) |

Le texte à lire est dans `script-voix.html` (même page que celle publiée dans la conversation) et dans `../narration.txt`.
`../montage.py` fait ensuite le montage (voir le README du projet).

`retouches.json` : les sons à retirer d'une prise (un « mhhh » avant une phrase, un bruit de bouche), avec leur début et leur fin en secondes dans la prise brute. Le montage les remplace par l'ambiance de la pièce.
