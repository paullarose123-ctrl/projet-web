# Suite : une vraie voix naturelle pour la vidéo 1

À lire en premier si tu reprends ce travail dans une nouvelle session (tu n'as pas la conversation).

## Où on en est

- **Validé par l'utilisateur** : le texte (`narration.txt`, « le plus lourd »), l'animation, les graphiques longueur puis poids, la musique. Il a dit « sinon c'est parfait ». N'y touche pas.
- **Refusé** : la voix. D'abord Kokoro (femme : « les intonations font trop IA »), puis Piper « pierre » (homme : « trop saccadée, encore trop robotique »). Les voix hors-ligne ne suffiront pas, on ne retente pas.
- **Ce qu'il veut** : une voix d'homme française naturelle, fluide, expressive. Sa référence est la voix d'homme de la vidéo TikTok qu'il a envoyée (environ 120 Hz, mélodie très variée, lecture continue).
- **Décision** : il a choisi d'ouvrir le réseau du conteneur pour que tu génères la voix toi-même (et pour les prochaines vidéos). Il tutoie, répond en français ; réponds-lui en français, en tutoyant.
- La v2 (voix Piper) est dans `chaine-youtube/01-geants/` : `voix.py` (Piper), `build/timeline.js`, `build/prises/`. Elle sert de repère, pas de base.

## 1. Vérifier le réseau d'abord

```bash
for u in https://speech.platform.bing.com https://huggingface.co https://cas-bridge.xethub.hf.co https://api.elevenlabs.io; do printf "%s " $u; curl -s -o /dev/null -m 12 -w "%{http_code}\n" $u; done
```

`000` veut dire refusé par le proxy. Si les hôtes dont tu as besoin sont refusés, dis-le à l'utilisateur en nommant l'hôte (réglage : la petite flèche juste après le titre de la session, puis « Edit cloud environment », puis le champ « Network access » : None, Trusted, Full ou Custom avec Allowed domains et « Also include default list of common package managers » coché ; une session déjà ouverte suit le nouveau réglage en une minute environ, sans nouvelle session ; doc : https://code.claude.com/docs/en/cloud-environments#configure-your-environment). Ne contourne pas le blocage, ne passe pas par un miroir. Il a déjà été prévenu et a dit « on va faire la 2 ».

## 2. Mise en place (conteneur neuf)

```bash
cd chaine-youtube/01-geants
npm install                                   # puppeteer-core, police Nunito
python3 -m venv /tmp/v && /tmp/v/bin/pip install edge-tts soundfile numpy scipy praat-parselmouth
```

Chromium est dans `/opt/pw-browsers/` (`render.mjs` le trouve tout seul), ffmpeg est installé. Pas besoin de Piper ni de Kokoro.

## 3. La voix

**Ne livre pas de vidéo avant que l'utilisateur ait validé la voix** : il a déjà refusé deux voix et chaque rendu coûte une quinzaine de minutes. Fais d'abord de courts extraits (les trois premières lignes de `narration.txt`, environ 15 s), envoie-les avec `SendUserFile` (mp3) sous des noms clairs (voix A, B, C) et demande-lui de choisir. Tu ne peux pas écouter : dis-le.

Pistes, de la plus rapide à la plus sûre côté licence :

1. **Edge TTS** (`pip install edge-tts`, hôte `speech.platform.bing.com`) : `fr-FR-RemyMultilingualNeural`, `fr-FR-HenriNeural` (hommes), éventuellement `fr-BE-GerardNeural`, `fr-CH-FabriceNeural`. Essaie `rate="-4%"`. Gratuit mais l'accès n'est pas officiel : si la chaîne est monétisée, signale-lui que le service officiel est Azure Speech (mêmes voix, licence commerciale, clé à créer, voir `environment.secrets` pour la stocker).
2. **Modèles ouverts** (hôtes `huggingface.co`, `cas-bridge.xethub.hf.co`, `cdn-lfs.hf.co`) à licence propre : Kyutai TTS 1.6B en/fr (CC-BY 4.0, très naturel en français, lourd sur CPU), Chatterbox multilingue (MIT, voix clonée depuis un extrait de dix secondes). Pas XTTS-v2 (non commercial).
3. **ElevenLabs** seulement si l'utilisateur donne une clé (forfait payant pour un usage commercial).

Lecture : synthétise par **paragraphes** (groupes de phrases, voir `narration.txt`), pas phrase par phrase, pour garder une mélodie continue. Le défaut des voix précédentes était justement le côté haché : phrases isolées, volume et débit qui sautent. Après synthèse, uniformise le niveau de l'ensemble (une seule normalisation, pas une par phrase) et ne mets ni porte de bruit ni forte compression.

## 4. Temps de chaque mot

L'animation et les sous-titres lisent des temps de mots. Edge peut donner des `WordBoundary` (parfois seulement des `SentenceBoundary` pour les voix multilingues). Sinon aligne l'audio sur le texte :

- avec accès à Hugging Face : `faster-whisper` avec `word_timestamps=True` (modèle small ou medium, langue `fr`), puis rapproche les mots reconnus des mots attendus (distance d'édition) ;
- sans Hugging Face : Whisper small via `sherpa-onnx` (modèle `sherpa-onnx-whisper-small.tar.bz2` sur la page de versions de sherpa-onnx, sur GitHub) pour vérifier le texte, et alignement DTW (MFCC) sur une version Piper du même texte (`modeles.py` et `voix.py` donnent les temps des mots Piper) pour reporter les temps.

Vérifie que l'erreur reste sous 100 ms (compare l'apparition d'un mot au début d'énergie dans l'audio).

## 5. Format attendu

`build/voix.wav` (48 kHz, mono) et `build/timeline.json` + `build/timeline.js` (`window.TL = {...};`), de la forme :

```json
{ "duration": 70.1, "phrases": [ { "id": "hook", "t0": 0.2, "t1": 3.4, "text": "...", "words": [ { "w": "L'animal", "t0": 0.2, "t1": 0.7 } ] } ] }
```

Les `id` de phrases, dans l'ordre : `hook, dino, humain, quetzal, vol, argentino, elephants, megalodon, fillette, ichthyo, mais, jamais, baleine, chiffres, poids, chasse, 360, revient, fin, proteger`. Le découpage est celui de `SCRIPT` dans `voix.py` (chaque ligne = un id). Les mots `w` sont ceux **affichés** (« [affiché|prononcé] » dans `SCRIPT` : on affiche « 1,75 », « 68 », « XXe », la voix dit « un mètre soixante-quinze »...). `piece.html` cherche ces mots précis (comparaison en minuscules, sans `. , : ; ! ? …`), il doit donc les trouver :

- humain : `1,75` ; quetzal : `quetzalcoatlus`, `11` ; argentino : `argentinosaurus`, `35`, `70` ; elephants : `10`, `éléphants`
- megalodon : `mégalodon`, `dents`, `main` ; fillette : `2020`, `fossile` ; ichthyo : `d'ichthyotitan`, `25` ; jamais : `disparu`
- chiffres : `30`, `qu'argentinosaurus` ; poids : `190`, `plus`, `d'argentinosaurus` ; 360 : `360`

Un mot qui correspond à plusieurs mots prononcés (« 1,75 » = « un mètre soixante-quinze ») prend le début du premier et la fin du dernier.

Si la voix est plus lente ou plus rapide que la v2 (69 s), `buildCam()` dans `piece.html` jette une erreur si deux clés de caméra se croisent : ajuste alors les décalages (`T.xxx + 2.3`) au lieu de forcer. Les pauses voulues de la v2 : un silence avant « n'est pas un dinosaure » (0,7 s), avant « Mais le plus lourd de tous... » et avant « La baleine bleue » ; garde-les si l'audio le permet, l'animation s'appuie dessus.

## 6. Rendu, musique, mixage, livraison

Tout est décrit dans `README.md` (section « Refaire la vidéo » et mixage). En bref :

```bash
node render.mjs piece.html --events && node score.mjs build/score.wav     # avec la nouvelle timeline
node render.mjs piece.html --stills 0.6 21.5 47 53.5                        # contrôle visuel
# rendu en 4 parties en parallèle, puis concat, mix à −14 LUFS, encodage
```

Envoi à l'utilisateur : `SendUserFile` refuse plus de 30 Mo. Encode la version envoyée en deux passes (`-b:v 3000k`, voir la v2) et garde `chaine-youtube/01-geants/les-plus-grands-animaux.mp4` comme nom. Pousse les sources sur la branche `claude/determined-turing-pi1zn3` (pas de PR sans demande). Mets le crédit de la voix dans `README.md` (Piper n'est plus utilisé : remplace-le par la bonne licence).
