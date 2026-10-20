# Reprise du travail sur une autre machine

Vidéo 3 : « 3 anecdotes complètement folles sur les animaux ». Tout ce qu'il faut est dans la branche `claude/determined-turing-pi1zn3` (dossier `chaine-youtube/03-anecdotes-animaux/`). Lire dans l'ordre : `CONCEPT.md` (le film, plan par plan), `STYLE.md` (palettes, lumière, animaux), `GUIDE.md` (moteur, conventions, outils, vocabulaire d'événements), `faits.md` (faits vérifiés), `son_notes.md` (musique et bruitages), puis ce fichier.

## 1. Installer

```bash
git fetch origin && git checkout claude/determined-turing-pi1zn3 && cd chaine-youtube/03-anecdotes-animaux
npm install                       # puppeteer-core + police Nunito ; il faut aussi Chrome ou Chromium (variable CHROME=/chemin si introuvable) et ffmpeg
```

- **Système** : Linux, macOS ou Windows avec WSL / Git Bash (`rendu.sh` est un script bash). Node ≥ 20, Python ≥ 3.12.
- **Python (mesures, alignement, mixage)** : `torch torchaudio faster-whisper pyloudnorm scipy numpy soundfile praat-parselmouth speechbrain hyperpyyaml sentencepiece requests` ; variable `FW_ROOT` = dossier où mettre le modèle Whisper `large-v3-turbo` (téléchargé au premier lancement).
- **Voix (Kyutai TTS)** : environnement à part, voir l'en-tête de `voix-ia/synth_kyutai.py` (`moshi` installé sans ses dépendances). Sur une carte graphique NVIDIA, `--device auto` l'utilise (non testé ici : le travail a été fait sur 4 processeurs, ≈ 3 s de calcul par seconde de voix).
- **Machine puissante** : le nombre d'agents en parallèle d'un Workflow dépend du nombre de coeurs (au plus 16) ; les rendus (`rendu.sh`) se font en 4 parties en parallèle.

## 2. La voix (déjà faite)

Voix retenue : **CML-TTS, français, locuteur 928** (`cml-tts/fr/928_486_000075-0001_enhanced.wav` du dépôt `kyutai/tts-voices`, CC-BY 4.0 : mentionner « CML-TTS » dans la description, ainsi que « voix de synthèse » et l'étiquette « contenu généré par IA »). Choisie parce qu'elle ressemble le plus (timbre, hauteur 123 Hz, débit 3,3 mots/s) à la voix de la vidéo TikTok de référence (@hubert.raconte), mesurée avec `voix-ia/voix_proche.py` ; l'auteur a préféré la deuxième du classement (« la B ») à la première (locuteur 4482).

Les prises retenues sont dans `build/ext/cml928/` (versionnées) : pour refaire `build/voix.wav` et `build/timeline.js|json` sans resynthétiser :

```bash
FW_ROOT=... python voix.py build --moteur true --etiquette cml928
```

Resynthétiser (≈ 25 min sur 4 coeurs) : `python voix-ia/preparer.py build/groupes.json --base -0.8` ; `python voix-ia/synth_kyutai.py --groups build/groupes.json --outdir build/ext/cml928 --takes 4 --seed 1 --voice cml-tts/fr/928_486_000075-0001_enhanced.wav` (puis `--takes 8 --seed 2` pour les paragraphes g6, g8, g9, g11, g12 : plus de prises) ; `python voix-ia/choisir_prises.py --groups build/groupes.json --dir build/ext/cml928 --cible 3.2` ; `python voix.py build --moteur true --etiquette cml928`. La voix dure 59,9 s ; le film entier 66,1 s (carton final 2 s + sortie 4,2 s). **Si la voix est refaite, les temps changent un peu : tout est calé sur `wt()` / `P.<id>`, donc les plans suivent ; relancer `node valide.mjs <segment>`.**

## 3. Ce qui est fait

| Élément | État |
|---|---|
| Texte (script de l'auteur, mot pour mot), voix, timeline | fait |
| Faits vérifiés (`faits.md`, avec les réserves à signaler) | fait |
| `kit.js` (ciels, aurore, reliefs, glace, neige, eau, particules) | fait, relu, corrigé |
| `flore.js` (arbres, cactus, herbes, fleurs, sols, rochers) | fait, relu, corrigé |
| `score.mjs` (musique, 17 ambiances, bruitages de tous les types du GUIDE §4) | fait, mesuré (−14 LUFS en essai) |
| Sprites grenouille (`sc_grenouille_sprites.js`) | écrits ; relecture en cours |
| Sprites lézard / coyote / jet / règle (`sc_lezard_sprites.js`) | écrits ; le lézard ressemble trop à un hérisson (à corriger) ; relecture en cours |
| Sprites lycaon (`sc_lycaon_sprites.js`) | en cours d'écriture |
| Plans des segments (`sc_grenouille.js`, `sc_lezard.js`, `sc_lycaon.js`) | contiennent seulement des planches de contrôle provisoires |
| Accroche et finale (`sc_intro.js`, `sc_fin.js`) | à faire (attendent les sprites) |
| Plan de sortie Raisins (`outro.js`) | fait (identique à la vidéo 2) |

Pour savoir où en est un segment : un fichier `sc_<nom>_sprites.js` de plus de ≈ 50 Ko est écrit ; `build/rev_<nom>_*` contient les images des relecteurs ; `sc_<nom>.js` de plus de ≈ 30 Ko = vrais plans ; `son_<nom>.md` existe quand les plans sont finis.

## 4. Relancer la production (outil Workflow de Claude Code)

`production/workflow_animaux_et_plans.js` contient tout : sprites → deux relecteurs indépendants → corrections → plans → deux relecteurs → corrections, puis l'accroche et la finale (qui attendent les sprites). Il se relance avec l'étape de départ de chaque segment :

```js
Workflow({ scriptPath: "production/workflow_animaux_et_plans.js",
  args: { depart: { gre: "plans", lez: "sprites", lyc: "revsprites" }, introfin: true, relecteurs: 2 } })
// depart : sprites | revsprites | plans | revplans | fini ; relecteurs : 1 (économique) ou 2 ; effort_relecture : "low" | "medium" | "high"
```

Les artistes ne doivent écrire que leurs fichiers (voir `GUIDE.md` §1) et travailler sur `solo_<segment>.html` (`node solo.mjs gre|lez|lyc|intro|fin`).

**Ne pas interrompre un Workflow en cours** (un refus d'outil ou un message qui interrompt tue les agents ; il faut alors relancer l'étape). Les limites d'usage de la session l'arrêtent aussi : relancer avec `resumeFromRunId` ou avec les `args` ci-dessus.

## 5. Assembler, rendre, livrer

1. Ajouter dans `piece.html` les éventuels fichiers `sc_<nom>_*.js` supplémentaires des artistes (le chef de projet les déclare à la main), puis `node check.mjs 6` (erreurs : 0), `node bords.mjs`, `node valide.mjs` (sans argument : le film entier), `node sheet.mjs 0.55` et `node strip.mjs <plan>` pour regarder.
2. `VOIX=ia PY=<python des mesures> ./rendu.sh la-video.mp4` : événements → `score.mjs` → rendu en 4 parties → mixage (voix, musique, bruitages, ducking) → −14 LUFS → x264 en deux passes (≤ 29 Mo).
3. `FW_ROOT=... python production/verif_final.py la-video.mp4` : format, loudness (visé −14 LUFS, crête vraie < −1 dBTP), voix relue par reconnaissance de parole.
4. Livrer le .mp4 (≤ 30 Mo pour l'envoi), compléter `README.md`, `CONCEPT.md` (durée finale), `STYLE.md` ; commit et push sur la branche (avec les deux lignes de signature des commits). Pas de pull request sans demande.
5. À dire à l'auteur : je ne peux pas écouter l'audio (tout est mesuré) ; réserves d'exactitude (`CONCEPT.md`, « Faits et réserves ») ; voix de synthèse CML-TTS (CC-BY) à mentionner.

L'aperçu « décors + voix + musique » envoyé à l'auteur se refait avec `production/apercu/` (copier `apercu.html` et `anim.js` dans `build/apercu/`, créer le lien `node_modules` vers `../../node_modules`, puis suivre les étapes de `rendu.sh` avec `SKIP_RENDER=1`).

## 6. Décisions de l'auteur à respecter

- Même style que la vidéo 2 (pixel art 270 × 480 ×4, palette fixe) et même moteur ; **ambiance beaucoup plus nature** ; le scientifique (coiffure de l'auteur) revient (accroche, finale) ; sortie « Raisins » identique.
- Voix : la plus proche de celle du TikTok de référence ; voix B choisie à l'oreille par l'auteur.
- L'auteur veut aller vite et consommer moins de crédit : proposer le mode économique (`relecteurs: 1`, `effort_relecture: "low"`) ; éviter les actions longues qui peuvent être interrompues.
