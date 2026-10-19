# Voix IA du film

La voix off est lue par **Kyutai TTS 1.6B** (modèle neuronal anglais / français, poids en CC-BY 4.0), sur le processeur (pas de carte graphique : environ 3 s de calcul par seconde de voix), avec la voix de référence `unmute-prod-website/fabieng-enhanced-v2.wav` du dépôt `kyutai/tts-voices` (enregistrement d'une personne de l'équipe Kyutai, publié en CC0).

Personne ne peut écouter ici : le choix du moteur et des prises repose sur des mesures, comparées à des narrations humaines (cinq lectures de romans du domaine public, LibriVox). La page `CONCEPT.md` dit ce qui reste à relire à l'oreille.

## Refaire la voix

```bash
# 1. les paragraphes à lire (texte prononcé + débit relatif de chaque paragraphe, repris de GROUPES dans voix.py)
python voix-ia/preparer.py build/groupes.json

# 2. trois prises par paragraphe (environnement à part, voir synth_kyutai.py ; environ 12 min pour 2 min de voix)
kyu/bin/python voix-ia/synth_kyutai.py --groups build/groupes.json --outdir build/ext/kyutai --takes 3

# 3. la meilleure prise de chaque paragraphe (écrit build/ext/kyutai/g<n>.wav et prises_rapport.md)
python voix-ia/choisir_prises.py --groups build/groupes.json --dir build/ext/kyutai --cible 2.8

# 4. calage mot à mot, pauses, volumes, voix.wav et timeline (le moteur est déjà passé : « true » ne fait rien)
python voix.py build --moteur true --etiquette kyutai

node check.mjs && node bords.mjs
VOIX=ia ./rendu.sh
```

Pour refaire un seul paragraphe : supprimer `build/ext/kyutai/prises/g<n>_t*.wav` (et la ligne correspondante de `prises_mesures.json` si on veut tout remesurer), puis relancer les étapes 2 à 4. Pour d'autres prises du même paragraphe, `--seed 2` et `--takes 6` ajoutent les prises 3 à 5 sans toucher aux premières.

## Ce qui rend la lecture plus humaine

- **Une voix de référence réelle**, pas une voix conçue au hasard : chaque paragraphe garde le même timbre (hauteur médiane 118 à 152 Hz d'un paragraphe à l'autre ; avec une voix « décrite par un texte », elle variait de 95 à 248 Hz).
- **Débit relatif par paragraphe** (`GROUPES` dans `voix.py`) : plus lent pour l'aparté et la blague, plus vif pour la question d'accroche. Le réglage est un bonus de pause du modèle (`--bonus`, négatif = plus rapide).
- **Vraies pauses** : « ... » est suivi d'une pause de 0,4 s (balise `<break>` du modèle), « : » devient une virgule.
- **Plusieurs prises** par paragraphe et choix automatique : relecture par Whisper (mots sautés ou mal dits), confiance de l'alignement forcé (syllabe avalée), sauts de hauteur anormaux, trous dans la phrase, débit, hauteur proche des autres paragraphes, naturalité prédite UTMOS22.
- **Volumes rapprochés** de la médiane (70 % de l'écart, au plus 6 dB) : une voix de synthèse a des paragraphes tantôt plus forts, tantôt plus doux sans raison.
- **Mixage** (`VOIX=ia ./rendu.sh`) : peu de traitement, un peu de corps vers 160 Hz, compression légère, une pièce discrète.

## Ce qui a été comparé (mêmes paragraphes, 94 mots)

Mesures sur les paragraphes d'essai ; pour les narrations humaines : étendue de hauteur (p10 à p90) 6 à 11 demi-tons, pente moyenne 30 à 35 demi-tons par seconde, UTMOS 2,7 à 3,6 (une voix humaine moins « propre » a un UTMOS plus bas qu'une voix de synthèse : ce n'est pas un repère d'humanité).

| Moteur et voix | Débit (mots/s) | Pente (dt/s) | UTMOS | Remarque |
|---|---|---|---|---|
| Edge, voix Rémy (essai des vidéos précédentes) | 2,9 | 50 | 3,78 | jugée « saccadée » et « trop IA » par l'auteur |
| VoxCPM2 (Apache-2.0), voix décrite par un texte | 3,6 | 31 à 78 | 2,7 à 3,1 | timbre différent à chaque paragraphe, trop rapide |
| VoxCPM2, clone de la voix fabieng | 2,9 | 38 à 44 | 3,0 | pauses de 1 s au milieu des phrases, hauteur qui dérive |
| **Kyutai TTS, voix fabieng** | 2,4 (2,7 avec le bonus −0,5) | 29 à 38 | 3,5 | retenue : voix stable, pente et étendue dans la plage humaine |
| Kyutai TTS, voix CML-TTS 1406 | 2,4 | 32 à 43 | 3,55 | voix plus grave, d'un lecteur de livre audio |
| Kyutai TTS, autres voix testées | 2,3 à 2,5 | 18 à 40 | 3,2 à 3,5 | |

Non essayés, faute de licence commerciale ou de place : Fish Audio S2 / Drama 3, Higgs TTS 3, Breeze TTS 2 (licences de recherche ou non commerciales), Voxtral TTS de Mistral (CC BY-NC 4.0 : très bon en français, mais pas pour une chaîne monétisée), KugelAudio (7 milliards de paramètres, trop gros pour 15 Go de mémoire).

## Licences

- Poids **Kyutai TTS 1.6B** : CC-BY 4.0.
- Voix de référence : `unmute-prod-website/*` et `voice-donations/*` du dépôt `kyutai/tts-voices` sont en **CC0**, `cml-tts/*` en CC-BY 4.0 (mentionner CML-TTS), `expresso/*` et `ears/*` sont **réservées à un usage non commercial** : ne pas les utiliser pour une chaîne monétisée.
- Mentionner dans la description que la voix est une voix de synthèse, et activer l'étiquette « contenu généré par IA » de la plateforme.
