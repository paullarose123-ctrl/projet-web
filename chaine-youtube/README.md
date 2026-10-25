# Chaîne Raisins : vidéos verticales de vulgarisation en pixel art

Chaque dossier `NN-nom/` est une vidéo complète (1080 × 1920, 30 i/s) dessinée en code, avec voix de synthèse, musique et bruitages synthétisés.

| Dossier | Vidéo |
|---|---|
| `01-geants` | première vidéo (géants) |
| `02-spiderman` | la toile de Spider-Man |
| `03-anecdotes-animaux` | « 3 anecdotes complètement folles sur les animaux » (grenouille, lézard à cornes, lycaons) |
| `04-anecdotes-animaux-2` | épisode 2 (scarabée bombardier, basilic, anguille électrique) |
| `marque/` | la grappe et la sortie « RAISINS », communes à toutes les vidéos |
| `_modele/` | modèles du générateur (exemple de script, brief, procédure) |

## Nouvel épisode

```bash
cd chaine-youtube
node nouvel-episode.mjs 05-mon-episode mon-script.md          # format du script : _modele/script-exemple.md
cd 05-mon-episode && cat PROCEDURE.md                          # les étapes (voix, plans, son, rendu, vérification, livraison)
```

Le générateur copie le moteur, les outils et la chaîne de voix du dernier épisode terminé (`--depuis <dossier>` pour en choisir un autre), écrit le texte exact (`voix.py`), les segments (`shots.js`), les cases du carnet (`cadre.js`), un plan provisoire par segment (le film se rend déjà de bout en bout), `BRIEF.md` pour les artistes et `PROCEDURE.md`. Il refuse d'écraser un dossier existant.
