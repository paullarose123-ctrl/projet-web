# Vidéo 2 — « La toile de Spider-Man est-elle possible ? »

Short vertical (1080 × 1920, 30 i/s, 2 min 00) en pixel art, même chaîne et même voix que la vidéo 1. Chaque image est dessinée en code (canvas), la voix off est une voix d'homme neuronale en français, la musique et les bruitages sont synthétisés.

- `CONCEPT.md` : idée, découpage plan par plan, faits vérifiés et sources, ordres de grandeur calculés.
- `STYLE.md` : palette, rendu, éléments récurrents (fil blanc, étiquettes, jauge, pastilles ✓ / ✗), et ce qu'on n'a pas copié des références.
- `narration.txt` : le texte à lire tel quel avec une autre voix.
- `voix.py` : le texte de la voix (liste `SCRIPT`), le réglage de chaque paragraphe (`GROUPES`) et la synthèse. Écrit `build/voix.wav` et `build/timeline.json` / `build/timeline.js`.
- `piece.html` + `engine.js`, `city.js`, `lab.js`, `nature.js`, `plates.js`, `props.js`, `props2.js`, `shots1.js` … `shots4.js`, `piece.js` : l'animation. `render(f)` dessine l'image `f` à partir du temps seul ; chaque plan lit ses temps dans la voix (`wt('phrase', 'mot')`). Ouvert dans un navigateur, la page joue en boucle.
- `render.mjs` : rend la vidéo avec Chrome ou Chromium (puppeteer-core) et ffmpeg.
- `score.mjs` : musique et bruitages, calés sur les mêmes temps (`build/events.json`).
- `room.py` : ajoute à la voix un soupçon de pièce (réverbération courte) avant le mixage.
- `rendu.sh` : tout le reste, du texte à la vidéo finale.
- `check.mjs`, `bords.mjs`, `sheet.mjs`, `strip.mjs` : outils de contrôle (erreurs de dessin sur tout le film, textes hors cadre, une image par plan, bande d'images d'un plan).

## Licence de la voix

La voix vient du service de lecture à voix haute d'Edge, utilisé par `edge-tts` : l'accès est gratuit mais **non officiel**. Pour une chaîne monétisée, le même type de voix existe dans Azure Speech (licence commerciale, clé à créer, offre gratuite de 500 000 caractères par mois). Il suffit de remplacer `appelle()` dans `voix.py` ; le reste ne change pas.

## Refaire la vidéo

```bash
npm install                                   # puppeteer-core, police Nunito
pip install edge-tts soundfile scipy numpy
python voix.py build                          # voix + temps des mots (réseau nécessaire la première fois)
node check.mjs                                # dessine tout le film sans rien écrire : doit afficher « erreurs : 0 »
node bords.mjs                                # doit afficher « aucun texte hors cadre »
node sheet.mjs                                # une image par plan dans build/sheet/
./rendu.sh                                    # bruitages, musique, rendu en 4 parties, mixage, −14 LUFS, encodage < 30 Mo
```

## Une voix plus humaine

Le service de voix n'accepte aucune balise de style (ni pause, ni accent, ni émotion : toute balise SSML autre que le débit, la hauteur et le volume d'un appel est refusée). Ce qui a été fait à la place :

1. **Texte écrit à l'oral** : phrases courtes et longues en alternance, questions, suspensions (« ... » donne une vraie petite pause), apartés, pas de listes à deux-points (elles donnent une mélodie plate).
2. **Un réglage par paragraphe** (`GROUPES`) : question vive et haute, réponse posée et grave, révélation, aparté pince-sans-rire plus lent et plus bas, conclusion grave, chute amusée. Mesuré sur les 17 paragraphes : l'écart-type de la hauteur moyenne par groupe de souffle passe de 1,08 demi-ton (vidéo 1) à 1,59 ; celui du débit de 0,58 à 0,83 syllabe par seconde.
3. **Meilleur fichier de départ** : le service ne donne que du mp3 48 kbit/s par défaut, dont le codec ajoute un voile métallique ; `voix.py` demande du 96 kbit/s.
4. **Pièce** : `room.py` ajoute une réverbération de 0,3 s à −18 dB, pour que la voix ne sonne pas « à nu » devant la musique.
5. **Mixage** : égalisation (un peu de corps vers 160 Hz, moins de « nasal » vers 2 kHz et de dureté vers 5 kHz : mesuré, la voix de synthèse a 5 à 8 dB de plus que le spectre moyen d'une voix d'homme entre 2 et 4 kHz), compression légère (rapport 1,5 contre 1,8 avant), musique et bruitages baissés quand la voix parle.

Vérification : la voix, seule puis dans le mixage final, est relue par un reconnaisseur de parole fort (faster-whisper large-v3-turbo) : tous les mots sont reconnus (seules différences : « Spider-Man/Spiderman », « soie/soi », « modifiés/modifiée »). Rien de tout cela ne dit comment la voix sonne à l'oreille : si un passage reste « robotique », dire lequel (minute et seconde) permet de réajuster le débit et la hauteur de ce paragraphe seul. `--decale -3%` ralentit tout, `--refaire 4,9` refait certains paragraphes. Un nom mal prononcé se corrige dans `PRONONCE`.

## Encodage

Le pixel art tramé est un cas difficile pour la vidéo : `-tune animation` active un filtre anti-blocs qui efface le tramage. Mesuré sur 20 s de ce film à 1,7 Mbit/s : réglages par défaut du vidéo 1 (`-tune animation`) SSIM 0,87 ; sans filtre anti-blocs (`no-deblock=1:aq-mode=2:psy-rd=0.6,0`, preset `veryslow`) SSIM 0,996. `rendu.sh` utilise ces derniers à 1 750 kbit/s, ce qui fait environ 29 Mo (l'envoi de fichiers est limité à 30 Mo).

## Changer le texte

Modifie `SCRIPT` (et `GROUPES` si le découpage en paragraphes change) dans `voix.py`, puis relance `python voix.py build` : seuls les paragraphes dont le texte ou le réglage a changé sont refaits. Les plans suivent les nouveaux temps, car ils lisent les débuts de phrase et de mot dans `timeline.js`. Si un mot cité par un plan disparaît du texte, `node check.mjs` le signale (« mot … »).
