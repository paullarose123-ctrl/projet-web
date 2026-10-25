# Style : « L'homme qui a vendu la tour Eiffel »

Même chaîne, même moteur que les vidéos précédentes : pixel art 270 × 480 agrandi ×4 sans lissage, palette fixe (rampes de `engine.js`, `RAMP` : `NI DU AM WO ST GR RD BL CY SK WH YE LM NE OC`), tramage de Bayer 4×4, sous-titres mot à mot en Nunito Black 96 px, étiquettes et jauges en pixel 5 × 7. Ne pas ajouter de couleur : tout ce qui est dessiné avant `quantize()` est ramené à la palette. Ce qui change : **c'est une histoire de personnages (Paris, 1925), pas un documentaire animalier** : décors d'architecture, lumières d'époque, deux personnages principaux qui jouent, des objets (tampon, documents, mallette) qui racontent.

## Lumières et lieux

| Lieu | Moment | Ciel / lumière | Matières et couleurs |
|---|---|---|---|
| Paris, extérieur (tour, café, rues) | matin clair puis soleil bas | `BL[3]` → `CY[3]` → `NE[3]` → rose `DU[7]` / `AM[8]` à l'horizon ; soleil doré rasant, ombres longues bleu-violet `DU[2..3]` | fer de la tour `OC[2..4]` / `WO[2..4]` (le « brun Eiffel »), façades pierre claire `SK[3..5]`, toits de zinc `ST[4..6]` + `BL[2]`, ardoise `ST[2]`, rideaux de store `RD`, `GR` |
| Hôtel de luxe (intérieur) | soirée, lustres | lumière chaude de lustre `YE[3]` / `AM[8]`, fenêtres bleu nuit `NI[3]` | dorures `YE[2..4]`, velours `RD[1..3]`, marbre `WH` / `ST[6]`, bois `WO[1..3]`, tapis `RD`, nappe `WH[2]` |
| Bureau du faussaire, chambre de Lustig | lampe de bureau | lumière d'ambre `AM[7]` sur fond sombre `NI[1..2]` / `WO[0..1]` | papier `WH[1..3]`, encre `NI[0]`, cire rouge `RD[3]`, laiton `YE[1..2]` |
| Gare, train | crépuscule, fumée | ciel `DU[4]` → `RD[3]` → `AM[8]` ; fumée blanche tramée | fer noir `NI[0..1]`, laiton, bois `WO` |
| Planches (tampon, titres) | – | fond papier `WH[0..1]` teinté `SK[4]` ou nuit `NI[0..1]` | encre `NI[0]`, rouge tampon `RD[3..5]` |

## Personnages (silhouette lisible à la taille d'une vignette de téléphone)

- **Victor Lustig** : grand, mince, 45 ans, élégant ; cheveux plaqués en arrière, petite moustache fine, costume trois pièces gris anthracite `ST[1..3]`, gilet clair, nœud papillon ou cravate, mouchoir de poche, souliers vernis, canne ou gants ; le regard calme, un demi-sourire (jamais un sourire de dessin animé) ; il ne court que quand il s'enfuit.
- **Le marchand de ferraille (André Poisson)** : rond, la cinquantaine, moustache épaisse, chapeau melon, costume brun `WO[2..3]` un peu trop serré, chaîne de montre ; expressif (yeux qui s'écarquillent, joues qui rougissent).
- **Les autres marchands** : silhouettes plus simples (chapeaux et moustaches différents) autour de la table.
- Corps organiques dessinés en lisse (`layerBegin` / `limb` / `shade` / `layerEnd` avec contour), détails nets en pixels (yeux, boutons, rim) ; liseré de contre-jour du côté du soleil ; ombre portée ovale. Pas d'expression accidentelle : œil, bouche et posture se dessinent exprès.

## Objets qui racontent

Le **tampon rouge « VENDUE »** (grand, texte pixel en capitales sur un disque ou un rectangle rouge `RD[3..5]`, légèrement penché, bord irrégulier d'encre) est le fil conducteur : il s'écrase dans l'accroche, tamponne le contrat, revient barré à la fin. La **mallette** de cuir `WO[2..4]` aux coins en laiton, les **liasses de billets** (vert pâle `LM[3..5]` / `GR`, bandeau papier), les **enveloppes à en-tête**, la **machine à écrire** à rouleau, le **journal** (gros titre pixel).

## Règles de composition (cadre vertical 270 × 480)

Comme dans `../04-anecdotes-animaux-2/STYLE.md` : ciel / sujet / sol ; le sujet important et le texte pixel au-dessus de y = 355 (sous-titres à y ≈ 375, les 60 derniers pixels sans information) ; plein cadre, jamais un petit sujet qui flotte (un personnage plan taille ou gros plan, un décor avec premier plan, plan moyen, lointain) ; profondeur par la lumière et le tramage ; **tout vit** (rien d'immobile plus de 0,5 s : respiration, rideaux, fumée, passants, pigeons, poussière dans les rayons) ; mouvements avec anticipation, dépassement et temps d'arrêt ; **coupes franches** (pas de fondu ni de volet), chaque coupe sur un début de mot ou d'événement ; au plus 2 étiquettes à l'écran.

## Éléments récurrents

- **Dossier « AFFAIRE LUSTIG »** : quatre cases en haut à gauche (`hudTracker`, `cadre.js`) : l'étape en cours allumée, les précédentes cochées ; étiquette de lieu (`hudLieu`) : « 1/4 PARIS 1925 ».
- **Étiquettes** (`tagBox`) : lieu / mesure en ambre, alerte en rouge, réussite en vert.
- **Sous-titres** : mot à mot, blanc, Nunito Black 96 px, contour sombre (inchangé).

## Son

Voix off : Kyutai TTS avec la voix de référence CML-TTS français (locuteur 928), comme les épisodes précédents. Musique : **jazz-manouche / musette des Années folles synthétisé** (cordes pincées, accordéon, clarinette, piano bastringue, balais sur caisse claire) : légère et complice pour l'idée et les faux papiers, qui tend vers le suspense à la découverte de l'arnaque, puis reprend avec malice pour le retour de Lustig, et se fige sur la fin. Ambiances : rue de Paris (passants, klaxons, pigeons, vent), salon feutré (murmures, couverts, tic-tac), gare (vapeur, sifflet, foule). Un bruit pour chaque action visible, aucun bruit sur les coupes. Voir `son_<segment>.md`.

## Plan de sortie (marque de la chaîne)

Identique aux vidéos précédentes (`outro.js`, sprite de `../marque/`) : coupe franche du dernier plan vers la nuit violette, grappe qui tombe et rebondit, « RAISINS », « ABONNEZ-VOUS » en jaune.
