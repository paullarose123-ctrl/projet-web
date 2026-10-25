# Procédure : produire « L'homme qui a vendu la tour Eiffel » (dossier `05-lustig-tour-eiffel`)

Ce dossier a été généré par `chaine-youtube/nouvel-episode.mjs` à partir de `04-anecdotes-animaux-2`. La qualité visée est celle des épisodes précédents : on ne raccourcit pas les contrôles, on supprime seulement ce qui se refait à chaque fois. Les durées entre parenthèses sont celles de l'épisode 2 (machine à 4 cœurs, sans carte graphique).

État du squelette : plans **provisoires** (fonds unis), `build/timeline.*` **provisoires** (temps estimés), `score.mjs` copié de l'épisode de référence (à adapter, voir §5), sprites vides.

## 0. Installer et tester le squelette (≈ 2 min)

```bash
cd chaine-youtube/05-lustig-tour-eiffel
npm install                       # seulement si node_modules n'est pas déjà lié (le générateur le lie vers l'épisode de référence)
node valide.mjs                   # tableau des plans provisoires (doit passer sans erreur)
node check.mjs 8                  # rendu de contrôle du film provisoire : erreurs : 0
```

Pour Chrome, ffmpeg, Python, Whisper, Kyutai : voir `../03-anecdotes-animaux/REPRISE.md` §1 (variable `FW_ROOT`, `CHROME`, `PY`).

## 1. Texte et faits (chef de projet)

1. Le texte de l'auteur reste **mot pour mot** (`voix.py`, `SCRIPT`). Le générateur l'a découpé en phrases (`i1…`, `a1…`, `b1…`, `fin`) et en paragraphes de lecture (`GROUPES`, deux phrases au plus, ≤ 165 caractères : à ajuster à la main si une phrase doit rester seule, par exemple une question vive).
2. Nombres : écrire `[860|huit cent soixante]` (affiché | dit) ; vérifier ensuite que la voix les dit bien (Whisper écrit les nombres en chiffres : de fausses erreurs apparaissent dans le choix des prises, ce n'est pas une erreur de voix).
3. **Vérifier chaque fait** (recherche web, sources) et écrire dans `faits.md` + `CONCEPT.md` (« Faits et réserves ») ce que le texte simplifie ou dépasse. Le texte n'est pas corrigé : les réserves sont signalées à la livraison.
4. Compléter `BRIEF.md` (§ Faits et § Plans suggérés) : c'est ce que lisent les artistes.

## 2. La voix (≈ 25 à 40 min de calcul, en tâche de fond)

Voix retenue : **CML-TTS français, locuteur 928** (CC-BY 4.0 : mentionner « CML-TTS » ; voix de synthèse à signaler, étiquette « contenu généré par IA »), via Kyutai TTS 1.6B. Depuis `05-lustig-tour-eiffel/` :

```bash
python voix-ia/preparer.py build/groupes.json --base -0.8
python voix-ia/synth_kyutai.py --groups build/groupes.json --outdir build/ext/cml928 --takes 4 --seed 1 --voice cml-tts/fr/928_486_000075-0001_enhanced.wav     # --device auto : GPU si présent
# paragraphes dont les prises sont mauvaises : relancer avec --takes 8 --seed 2 (même commande, seulement ces groupes)
python voix-ia/choisir_prises.py --groups build/groupes.json --dir build/ext/cml928 --cible 3.2
FW_ROOT=… python voix.py build --moteur true --etiquette cml928      # voix.wav, timeline.js/json (MMS_FA + Whisper), niveau −19 LUFS
```

Les prises retenues (`build/ext/cml928/`, hors `prises/`) et `build/timeline.*` sont versionnés (voir `.gitignore`). **Ne jamais relancer `provisoire.py` après la vraie voix** (il refuse s'il trouve `build/voix.wav`). Quand la vraie voix arrive, les plans calés sur `wt()` / `P.<id>` suivent d'eux-mêmes : relancer `node valide.mjs`.

Pour dessiner **avant** que la voix soit prête, la timeline provisoire suffit ; recaler ensuite.

## 3. Les plans (artistes, en parallèle, ≈ 30 à 60 min par animal)

Un artiste (sous-agent) par animal, avec `BRIEF.md` comme consigne et ses seuls fichiers (`sc_<clé>_sprites.js`, `sc_<clé>.js`, `son_<clé>.md`). Pendant ce temps, le chef de projet écrit l'**accroche** (`sc_intro.js`) et la **finale** (`sc_fin.js`) : modèles dans `../04-anecdotes-animaux-2/sc_intro.js` et `sc_fin.js` (scientifique `fn_sci`, cartes `fn_cardArt`, claquette/film `in_scene`). Chaque animal = 6 à 7 plans, une planche du carnet pour le mécanisme, la case cochée en fin d'anecdote.

Règles apprises à la dure :
- **Ne jamais interrompre** des agents en cours (un refus d'outil ou un message qui interrompt les tue) ; la limite d'usage de la session les arrête aussi : ils se relancent avec `SendMessage` (leurs fichiers sont conservés) ; consigner l'avancement par des commits réguliers.
- Les agents n'écrivent que leurs fichiers ; ils ne font **ni commit ni push** (le chef de projet commite).
- Machine à 4 cœurs : au plus 4 agents ; `check.mjs` avec un pas de 8 pendant leur travail.
- Disque : les profils Chrome orphelins de `/tmp` et les `build/<clé>/` volumineux se nettoient ; surveiller `df -h /`.
- Aucun préréglage de décor pour un nouveau monde : composer avec `kit.js` (`k_sky`, `k_rays`, `k_pond`, `k_haze`, `k_pollen`, `k_birds`…) et `flore.js`.
- Un événement de bruitage nouveau : l'ajouter à `VOCAB` (valide.mjs) **et** à `score.mjs`.

## 4. Assemblage et contrôles (≈ 10 min)

```bash
node solo.mjs intro|idee|faux|piege|honte|fin            # (une clé) page d'un seul segment ; PAGE=solo_<clé>.html OUT=build/<clé> node check.mjs 6 …
node valide.mjs                   # tous les plans : coupes, événements, types connus (seul avertissement admis : la coupe de la sortie)
node check.mjs 6                  # erreurs : 0 ; bords.mjs : aucun texte hors cadre
node sheet.mjs 0.55 build/sheet   # une image par plan → les regarder (planche contact) : silhouettes, cadrage, étiquettes
PAGE=… node still.mjs <t> x y w h build/x.png   # une image pleine définition pour juger un détail
```

## 5. Le son (agent dédié, ≈ 20 min)

`score.mjs` est la partition de l'épisode de référence : à **adapter** (ids de phrases, sections, une couleur de musique et une ambiance par monde, bruitages des nouveaux événements) en gardant les outils (trois bus musique / ambiances / bruitages, `duckFactor`, `shiftOffWord`) et en lisant les `son_<clé>.md` des artistes. Contrôles : `node score.mjs build/score.wav` sans erreur ; **les derniers mots de chaque phrase doivent rester dégagés** (musique et bruitages baissés dessus : la relecture par reconnaissance de parole en a révélé plusieurs fois les défauts, voir `son_notes.md`). On ne peut pas écouter : tout est mesuré (niveau, crête, écart voix / fond).

## 6. Rendu (≈ 5 min)

```bash
VOIX=ia PY=<python des mesures> ./rendu.sh <nom-du-fichier>.mp4     # événements → partition → rendu en 4 parties → mixage −14 LUFS → x264 deux passes (≤ 29 Mo)
```

Le fichier `.mp4` apparaît avant la fin de l'encodage : attendre la fin du script (`pgrep` sur le nom du script se trouve lui-même, ne pas l'utiliser).

## 7. Vérification (≈ 2 min)

```bash
FW_ROOT=… python production/verif_final.py <nom-du-fichier>.mp4
```

Visé : 1080 × 1920, 30 i/s ; ≈ −14 LUFS ; crête vraie < −1 dBTP ; **tous les mots relus à leur place** (un texte parasite en toute fin, pendant la musique, est une invention de Whisper). Regarder aussi une bande d'images du .mp4 (`ffmpeg … -vf "fps=1/2,scale=108:-1,tile=8x4"`).

## 8. Livraison

- Envoyer le `.mp4` (≤ 30 Mo) avec une légende courte (durée, taille, niveau).
- Dire : je ne peux pas écouter l'audio (tout est mesuré) ; les réserves d'exactitude du texte ; **voix de synthèse** (étiquette « contenu généré par IA », mention « CML-TTS » CC-BY dans la description) ; les défauts connus des artistes.
- Proposer le titre et la description TikTok (modèle : épisode 2 : accroche en une ligne, une ligne par animal, question « lequel… ? », appel à s'abonner, mention voix de synthèse + CML-TTS, hashtags).
- Compléter `README.md`, `CONCEPT.md` (durée finale, plan par segment), `STYLE.md` si le style change ; **commit et push sur la branche de travail** (pas de pull request sans demande).

## Ce qui ne change jamais (décisions de l'auteur)

Même style que les épisodes précédents (pixel art 270 × 480 ×4, palette fixe) ; **ambiance nature** ; le scientifique (coiffure de l'auteur) revient dans l'accroche et la finale ; sortie « Raisins » identique ; voix CML-TTS 928 (la « B ») ; coupes franches ; la vidéo finit sur une question au spectateur. L'auteur veut aller vite **sans baisser la qualité** : on gagne du temps avec le squelette, les outils et les relances par étape, pas en supprimant des plans ni des contrôles.
