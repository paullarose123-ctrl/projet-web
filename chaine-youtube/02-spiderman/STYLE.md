# Style — « La toile de Spider-Man »

Même chaîne, même moteur que la vidéo 1 (pixel art 270 × 480 agrandi ×4, palette fixe, tramage ordonné Bayer 4×4, sous-titres mot à mot en Nunito Black). On y ajoute ce que montrent les deux nouvelles références : des vignettes plus détaillées (Univers Pixel) et des planches « ambre sur noir » avec instruments de mesure (Alfred Explique).

## Deux registres, un seul monde

| Registre | Quand | Comment |
|---|---|---|
| **Vignette** (couleur) | la ville la nuit, le labo, le laboratoire d'aujourd'hui | un plan plein cadre très travaillé : dégradés tramés, source de lumière nette, détails de décor (fenêtres éclairées, boiseries, verrerie), personnage au centre |
| **Planche** (ambre sur noir) | tout ce qui se mesure ou se montre en coupe : l'abdomen de l'araignée, l'acier contre la soie, le spaghetti, la jauge de ténacité, le verdict | fond presque noir avec vignette, dessin dans une seule rampe or/ambre, quelques accents (cyan pour la soie, rouge et vert pour non/oui), étiquettes pixel, jauge de tension en haut à gauche |

## Palette (rôles)

| Rôle | Hex |
|---|---|
| Nuit | `#05040f` `#0a0a1f` `#10102e` `#171a45` `#202a62` `#2c3c84` `#3d55aa` `#5878cc` |
| Ciel de ville (violet → rose) | `#1c1034` `#2e1a56` `#46267a` `#653296` `#8641a4` `#a9529f` `#cf6b9a` |
| Or et ambre (planches, lampes, fenêtres) | `#140a05` `#25120a` `#3c1d0e` `#5a2c12` `#7f4016` `#a85a1a` `#d07a1e` `#f2a02a` `#ffc84a` `#ffe08a` `#fff2c4` |
| Bois | `#1d120c` `#301d12` `#48291a` `#643a24` `#85502e` `#a96d3c` `#c78f52` |
| Acier | `#12161f` `#1e2531` `#2e3748` `#434f66` `#5f6f8a` `#8294b0` `#a8b8ce` `#d0dae8` |
| Vert labo | `#0e2a22` `#1a4636` `#2a6648` `#3f8a5a` `#62ae72` `#94d098` |
| Rouge / bleu du héros | `#38091a` `#6e1226` `#a81c2e` `#d73442` `#f2625a` · `#0e1850` `#18288a` `#2540c0` `#3f66e4` |
| Soie (cyan clair) | `#124a66` `#1f7a96` `#3aa8c4` `#70d0e4` `#b0f0f8` + blancs `#cfc6b4` `#e8e0cc` `#fff8e8` `#ffffff` |
| Peau | `#5a3226` `#84543a` `#b27a54` `#dba67c` `#f4cfa6` |

## Lumière

- Ville : lune en haut à droite, horizon violet et orange, fenêtres allumées en jaune chaud. Les corps ont un liseré clair côté lune.
- Labo : lampe chaude à gauche, lumière du jour froide par la fenêtre, tâche de lumière ovale au sol (comme la moquette de la référence Univers Pixel).
- Planches : une lueur ambre au centre qui s'éteint sur les bords.

## Éléments récurrents (la « langue » de la chaîne)

- **Fil blanc** : le fil de soie est toujours le même, blanc-cyan, avec un point brillant. Il n'apparaît que quand il fait partie de la scène (le héros qui se balance, la soie de l'araignée, la toile) : **les coupes sont franches**, sans fil ni ouverture tramée entre deux plans (retiré à la demande de l'auteur).
- **Étiquette** (tag) : boîte bleu nuit, liseré bleu, texte cyan en pixel 5×7 (« LABO », « MADAGASCAR · 2010 »). Variante rouge pour les alertes.
- **Jauge de tension** : cadran en demi-cercle, aiguille blanche, zone rouge, mini-étiquette rouge. Elle revient à chaque épreuve du fil.
- **Pastilles ✓ / ✗** : cercle vert avec coche, cercle rouge avec croix. Elles s'alignent en haut à droite et forment le tableau du verdict.
- **Compteur** : boîte sombre, chiffres rouges (comme « 299 948 » de la référence).
- **Sous-titres** : mot à mot, blanc, Nunito Black 96 px, contour sombre (identiques à la vidéo 1).
- **Le scientifique du plan final, c'est l'auteur** (« avant de finir moi-même en cocon ») : il porte sa coiffure, un dégradé (côtés ras qui fondent dans la peau, vers les oreilles) avec des boucles blond vénitien sur le dessus (`hairStyle: 'curlyFade'` dans `lab.js`, rampes de la palette : ambre et bois pour les ombres cuivrées, peau pour les parties claires). Les autres personnages (élèves, technicien des cuves) gardent la coiffure par défaut.

## Mouvement

Coupes toutes les 2 à 4 s (rythme des références), chaque plan bouge en continu : balancier, respiration du décor, caméra qui avance ou recule lentement. Les ressorts (fil, bras tremblants, toile qui encaisse la mouche) ont du rebond.

## Son

Voix off d'homme (même voix que la vidéo 1), nappe douce avec petite mélodie en cloches et pizzicato, un bruit pour chaque action (aucun bruit sur les coupes) : vent entre les gratte-ciel, bourdonnement de mouche et « boing » élastique, crissement de freins de métro, pluie et tonnerre, bips d'étiquettes, « ding » pour ✓ et buzz grave pour ✗.

## Plan de sortie (marque de la chaîne)

Logo : la grappe de raisin en pixel art de l'auteur (`../marque/logo-raisins.webp`), réduite à l'échelle des pixels du film par `../marque/logo_pixel.py` (88 × 121 pixels, 12 couleurs, couleurs exactes : dessiné après le tramage). Nom : « RAISINS » en police pixel 5×7 à l'échelle 6, lilas clair à ombre violette. Appel : « ABONNEZ-VOUS » en jaune, échelle 3, tapé lettre à lettre. Fond : nuit violette et étoiles. Pas de bouton, de curseur ni de cloche (demande de l'auteur).

## À ne pas copier (sujets des références)

Fusée et budget spatial, bureau de la NASA, ouragan vu du ciel, Zambie, religieuse, microscopes de 1600, Terre et Lune, tour de Pise et son chantier, Mussolini, toute l'histoire des fondations. Pas de gabarit repris tel quel : on prend le rendu (détail, lumière, tramage, boîtes d'étiquette, jauge, vignette de couleur contre planche ambre), pas les décors.
