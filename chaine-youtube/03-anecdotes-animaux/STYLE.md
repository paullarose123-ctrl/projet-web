# Style — « 3 anecdotes complètement folles sur les animaux »

Même chaîne, même moteur que les vidéos 1 et 2 : pixel art 270 × 480 agrandi ×4 sans lissage, palette fixe (rampes de `engine.js`, `RAMP`), tramage de Bayer 4×4, sous-titres mot à mot en Nunito Black 96 px, étiquettes et jauges en pixel 5 × 7. Ce qui change : **tout se passe dehors, en lumière naturelle**.

## Trois mondes, trois lumières

| Segment | Lieu | Heure | Ciel (du haut vers l'horizon) | Sol | Végétation | Ambiance vivante |
|---|---|---|---|---|---|---|
| Alaska (intro, gre) | forêt boréale, montagnes | heure bleue (hiver) puis matin clair (printemps) | `NI[2]` → `BL[2..3]` → `CY[2]` → rose `DU[7]` à l'horizon ; aurore verte/cyan (`GR`, `CY`) ; printemps : `CY[3]` → `NE[3]` | neige `NE[2..4]` ombrée de `BL[1..2]`, litière de feuilles `WO`, mousse `LM`, fonte : eau `CY` | épicéas sombres `GR[0..2]` chargés de neige, bouleaux blancs `WH`/`ST`, mousse `LM[2..4]`, fleurs, fougères, herbe `LM[4..5]` au printemps | neige qui tombe (3 plans), givre qui scintille, souffle en buée, gouttes de fonte, papillons et pollen au printemps |
| Mexique (lez) | désert de Sonora / Chihuahua | coucher du soleil | `NI[3]` → `DU[3..5]` → `RD[3]` → `AM[6..8]` → `YE[2]` | sable `SK[3..4]`, `AM[4..6]`, terre cuite `OC[2..4]`, cailloux `ST`, `WO` | saguaros `GR[1..3]` à liseré `LM[5]`, raquettes, agaves `GR`/`CY`, ocotillo `RD`, buissons secs `OC` | chaleur qui tremble, poussière dorée en contre-jour, boule d'herbe qui roule, grillons, vautour au loin |
| Afrique (lyc) | savane | lever du soleil, brume | `NI[4]` → `DU[4]` → `RD[3..4]` → `AM[7..9]` → `YE[3]` | herbe haute `LM`/`AM[5..7]`, terre rouge `OC[3..4]` | acacias en parasol `GR[0..1]`, herbes qui ploient, baobab lointain, termitière `OC` | brume basse, poussière soulevée par la meute, oiseaux qui s'envolent, insectes dans la lumière rasante |
| Carnet (planches) | pages du carnet de terrain | – | fond papier `WH[0..1]` teinté `SK[4]`, ou nuit `NI[0..1]` pour les coupes (électrocardiogramme, cellules) | – | dessin à l'encre `ST[1]`, accents `AM`, `CY`, `RD` | – |

Les rampes **`LM`** (vert-jaune, herbe et mousse), **`NE`** (neige bleutée) et **`OC`** (terre cuite) ont été ajoutées à la palette pour cette vidéo ; les autres rampes sont celles des vidéos précédentes. Ne pas ajouter d'autre couleur : tout ce qui est dessiné avant `quantize()` est ramené à la palette.

## Règles de composition (cadre vertical 270 × 480)

- **Ciel en haut (≈ 25 %), bande sujet au milieu (y ≈ 130 à 340), sol et premier plan en bas.** Les sous-titres sont à y ≈ 375 (pixel du canevas) : le sujet important et le texte pixel restent **au-dessus de y = 355** ; les 60 derniers pixels (y > 418) ne portent aucune information (zone des boutons de la plateforme) mais ont du premier plan.
- **Plein cadre, jamais un petit sujet qui flotte** : un animal de profil occupe ≈ 60 à 90 % de la largeur ; un paysage a un premier plan (herbes, branches, rochers), un plan moyen (le sujet), des plans lointains (collines, brume).
- **Profondeur par la lumière et le tramage** : chaque plan lointain se fond vers la couleur du ciel (brume tramée) ; contre-jour : liseré clair sur le dos des animaux (`rim`) du côté du soleil ; ombre portée ovale sous les animaux.
- **Silhouettes lisibles à la taille d'une vignette de téléphone** : une bête doit se reconnaître en noir. Corps organiques dessinés en lisse (`layerBegin` / `limb` / `shade` / `layerEnd` avec contour), détails nets ajoutés en pixels (yeux, rim, taches).
- **Tout vit** : rien n'est immobile plus de 0,5 s (respiration, herbe qui ploie, particules, caméra qui avance lentement avec parallaxe). Les mouvements d'animaux ont de l'anticipation, du dépassement et un temps d'arrêt.
- **Pas d'expression accidentelle** : œil, bouche et posture se dessinent exprès (la grenouille ne sourit pas, le lézard n'est pas méchant, le lycaon n'est pas un chien de dessin animé).
- **Coupes franches** (pas de fondu ni de volet) ; chaque coupe tombe sur un début de mot ou d'événement.

## Animaux (d'après leurs formes réelles ; détails dans `faits.md`)

- **Grenouille des bois** (*Lithobates sylvaticus*, ≈ 5 cm) : brun clair à rougeâtre, **masque sombre** de l'œil à l'oreille, lèvre supérieure claire, ventre pâle, longues pattes arrière repliées, peau lisse et humide (reflet).
- **Lézard à cornes** (*Phrynosoma*, ≈ 8 à 12 cm) : corps **plat, rond comme un petit crapaud**, couronne de cornes à l'arrière de la tête, épines sur les flancs, queue courte, camouflé sable et brun taché, ligne claire sur le dos.
- **Coyote** (le prédateur) : gris-roux, museau pointu, grandes oreilles dressées, queue touffue pendante.
- **Lycaon** (*Lycaon pictus*, « loup peint ») : pelage **taché noir, fauve et blanc** (chaque individu a son motif), très **grandes oreilles rondes**, museau noir, queue touffue à bout blanc, pattes longues et fines.
- **Le scientifique** : celui de la vidéo 2 (`scientist.js` : `drawScientist(cx, cy, s, t, { hairStyle: 'curlyFade', … })`), toujours la coiffure de l'auteur (dégradé, boucles blond vénitien). Tenue de terrain autorisée (jumelles, carnet) mais blouse blanche, lunettes et coiffure restent.

## Éléments récurrents (« la langue » de la chaîne)

- **Étiquette** (`tagBox`) : lieu « 1/3 ALASKA » (ambre), mesures (« ≈ 1 M », bleu), alertes (rouge), réussite (vert).
- **Cases du carnet** (`hudTracker`, `cadre.js`) : trois cases en haut à gauche, la bête en cours allumée, les précédentes cochées.
- **Pastilles ✓ / ✗, compteurs, jauges** : mêmes éléments que la vidéo 2, en couleurs nature.
- **Planche du carnet** : pour tout ce qui se montre en coupe ou en gros plan (électrocardiogramme, cellules) : fond papier ou nuit, trait encré, étiquettes pixel.
- **Sous-titres** : mot à mot, blanc, Nunito Black 96 px, contour sombre (inchangé).

## Son

Voix off : Kyutai TTS (voix « fabieng »), la même que la vidéo 2. Musique douce aux timbres acoustiques synthétisés (kalimba, cordes pincées, flûte, nappe), une couleur par monde : cristalline et froide (Alaska, qui tire vers le grave quand le cœur s'arrête puis s'ouvre au dégel), chaude avec une petite guitare et un shaker (Mexique), kalimba et tambours doux sur une pulsation de marche (Afrique), curieuse pour la question finale. Ambiances en continu : vent et neige, oiseaux de printemps, ruisseau, grillons au crépuscule, savane au lever du jour. Un bruit pour chaque action visible (voir le vocabulaire d'événements dans `GUIDE.md`), aucun bruit sur les coupes.

## Plan de sortie (marque de la chaîne)

Identique à la vidéo 2 (`outro.js`, sprite de `../marque/`) : coupe franche du dernier plan vers la nuit violette, grappe qui tombe et rebondit, « RAISINS », « ABONNEZ-VOUS » en jaune.
