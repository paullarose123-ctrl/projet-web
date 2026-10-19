# Guide de travail (artistes, sonorisation, relecteurs)

Projet : `chaine-youtube/03-anecdotes-animaux/`. Lire d'abord `CONCEPT.md` (quoi montrer, quand) et `STYLE.md` (palettes, lumière, animaux). Ce guide donne le « comment ». Le moteur est celui de la vidéo 2 (`../02-spiderman/`, à consulter pour des exemples de plans : `shots1.js` à `shots4.js`, `city.js` pour le dessin organique, `nature.js`, `props2.js`).

## 1. Fichiers et propriétaires

| Fichier | Rôle | Qui l'écrit |
|---|---|---|
| `engine.js`, `scientist.js`, `cadre.js`, `shots.js`, `piece.js`, `outro.js`, `*.mjs`, `rendu.sh`, `voix*.py` | moteur, scientifique, cases du carnet, découpage en segments, outils | **personne d'autre que le chef de projet** (si un besoin apparaît : l'écrire dans `demandes_<segment>.md`) |
| `kit.js` (+ `kit_demo.js`) | ciel, lumière, reliefs, eau, glace, particules, atmosphère | artiste « kit » |
| `flore.js` (+ `flore_demo.js`) | arbres, cactus, herbes, fleurs, sol, rochers, accessoires | artiste « flore » |
| `sc_intro.js`, `sc_fin.js` | accroche, carnet, finale | artiste « intro / fin » |
| `sc_grenouille.js` | segment Alaska | artiste « grenouille » |
| `sc_lezard.js` | segment Mexique | artiste « lézard » |
| `sc_lycaon.js` | segment Afrique | artiste « lycaon » |
| `score.mjs` | musique, ambiances, bruitages | sonorisateur |
| `faits.md` | faits vérifiés, sources, réserves | vérificateur de faits |

Un artiste peut ajouter des fichiers `sc_<segment>_<quelquechose>.js` (chargés automatiquement par `node solo.mjs <segment>` puis par `piece.html` s'ils sont déclarés : voir §6) ; **tout nom de fonction ou de constante globale d'un fichier commence par le préfixe du fichier** (`gr_` grenouille, `lz_` lézard, `ly_` lycaon, `in_` intro, `fn_` fin, `k_` kit, `fl_` flore) : tous les fichiers partagent la même portée globale, un doublon fait échouer la page entière.

## 2. Le moteur en bref (`engine.js`)

- Le film est dessiné en **270 × 480** sur le contexte `L` (variable globale), puis quantifié sur la palette et agrandi ×4. `LW = 270`, `LH = 480`.
- `draw(u, t, S)` dessine **avant** le tramage (dégradés, flous, alpha autorisés : tout est ramené à la palette) ; `ui(u, t, S)` dessine **après** (couleurs exactes, texte pixel, étiquettes, icônes). `u` = secondes depuis le début du plan, `t` = secondes depuis le début du film.
- **`render(f)` est une fonction pure du temps** : aucun `Math.random`, aucun `Date`, aucun état qui survit d'une image à l'autre. Hasard : `const r = rng(graine); r()` créé dans `draw` (ou précalculé dans `INITS`). Même image = mêmes pixels, car 4 processus rendent chacun un quart du film.
- Précalculer ce qui ne change pas (textures de sol, silhouettes de forêt, sprites, dégradés complexes) dans une fonction ajoutée à **`INITS.push(() => { … })`** (appelées une fois avant le premier plan), l'enregistrer dans un canevas (`mkCanvas(w, h)`) et le recopier par `L.drawImage(c, x, y)` à chaque image. Budget : un plan doit se dessiner en **moins de 300 ms** par image (`node check.mjs` affiche les plus lents).
- Couleurs : rampes `NI DU AM WO ST GR RD BL CY SK WH YE LM NE OC` (tableaux de `#rrggbb`, du sombre au clair), par exemple `GR[3]`. Les chaînes `rgba(...)` servent aux dégradés et aux voiles.
- Primitives en pixels entiers : `R(x,y,w,h,c)`, `px(x,y,c)`, `disc(cx,cy,r,c)`, `ell(cx,cy,rx,ry,c)`, `lineP(x0,y0,x1,y1,c,épaisseur)`, `poly(pts,c)`, `ditherRect(x,y,w,h,c,densité)` (tramage de Bayer), `vgrad(x,y,w,h,[[0,c],[1,c]])`, `rgrad(cx,cy,r0,r1,stops,alpha,mode)` (lueur ; `mode 'lighter'`), `vignette(a, r0, r1, cx, cy, 'r,g,b')`.
- **Formes organiques lisses → silhouette nette** (corps d'animaux) : `layerBegin()` ; dessiner sur le contexte `Y` avec des `Path2D` (`polyPath(pts)`, `limb(points, largeurs)` pour une patte ou une queue, `bez(c0,c1,c2,s)`), `shade(Y, path, clair, sombre, [lx, ly], décalage, flou)` pour le croissant de lumière ; `layerEnd({ outline: '#05040f' })` seuille et pose sur `L` avec un contour. Exemples : `heroPose/heroDraw` dans `../02-spiderman/city.js`, `drawSpider` dans `../02-spiderman/lab.js`. Après `layerEnd`, ajouter les détails nets en pixels (œil, liseré de contre-jour `rim`, taches).
- Texte pixel (police 5 × 7, **majuscules seulement**, lettres accentuées `É È Ê Ë À Â Ô Î Ï Ù Û Ç` ; pas de `Œ` (écrire `OE`), pas de guillemets ; signes disponibles : `. , : - ' / ~ · ↑ → ↓ ! ? % ( ) + = ° ≈ × < > ★`) : `ptext(s,x,y,couleur,échelle,contour,nbCaractères)`, `ptextC` (centré), `ptextR` (aligné à droite), `textW(s, échelle)`. Dans `ui()` seulement.
- Éléments d'interface : `tagBox(x,y,texte,'blue|red|amber|green|white',nCaractères,centré)` (renvoie la largeur ; `nCaractères` fait « taper » le texte), `gauge`, `mark(cx,cy,'yes|no|ask',p,r)`, `counter(cx,y,texte,échelle,couleur)`, `barH`, `arrow`.
- Temps et mouvement : `clamp, lerp, sm` (smoothstep), `eio, ei, eo, eob` (easings ; `eob` dépasse), `prog(t,a,b)` (0→1 entre a et b), `bump(t,a,b,c,d)`, `spring(u,k,d)`, `tab(table,u)` (interpolation Catmull-Rom dans `[[u, v], …]`), `TAU`.
- Parole : `P.<id>` (phrase : `t0`, `t1`, `words: [{w, t0, t1}]`), `wt(id, mot, k)` = début du k-ième mot (comparaison sans casse ni ponctuation `.,:;!?…`, **l'apostrophe reste** : `wt('g2', "s'arrête")`), `wt1` = fin du mot, `VOICE_END`, `DUR`, `TL.phrases`. Un mot absent lève une erreur : lire `P.g2.words` pour la graphie exacte.
- Sous-titres : dessinés par `drawCaption` au centre vertical `CAPY` (1500 px de l'image finale = **y ≈ 375 du canevas**). Un plan peut les déplacer avec `capY` (en pixels de l'image finale, par exemple 1250), à n'utiliser que si le sujet l'exige.

## 3. Plans (`piece.js`, `shots.js`)

```js
function buildGrenouille(S) {                 // S = SEG.gre = { t0, t1, ids }
  shot('g1_alaska', S.t0, {                   // le PREMIER plan commence exactement à S.t0
    draw(u, t, sh) { /* dessin avant tramage */ },
    ui(u, t, sh) { hudTracker(0, 0, prog(u, 0.1, 0.6)); hudLieu(0, Math.floor(prog(u, 0.3, 0.8) * 12)); },   // après tramage
    ev: [[wt('g1', 'Alaska'), 'wind', 1]],    // événements de bruitage : [temps ABSOLU, type, valeur]
    // capY: 1400,                             // facultatif : sous-titres plus haut
  });
  shot('g2_gel', wt('g2', 'Pendant') - 0.1, { … });
}
```

- Les identifiants de plans commencent par le préfixe du segment (`i_`, `g1_`… `g4_`, `l1_`… `l4_`, `y1_`… `y4_`, `fin_`) et sont uniques.
- **Chaque coupe tombe 0,05 à 0,15 s avant un début de mot** (l'image arrive avec la parole), jamais au milieu d'un mot. Un plan dure **au moins 0,8 s** (3 à 4 s en moyenne ; plus de 5 s seulement s'il bouge beaucoup). Le dernier plan d'un segment court jusqu'à `S.t1` : la pause de fin d'anecdote (≈ 0,7 s) s'y passe en respiration (le personnage réagit, la caméra se pose).
- **Coupes franches** : ni fondu, ni volet, ni transition dessinée. Un mouvement de caméra reste à l'intérieur d'un plan.
- Le plan peut lire les temps de parole pour synchroniser l'image sur un mot (la coche au moment de « survit », le gel qui gagne quand la voix dit « gèle »).
- Les **cases du carnet** (`hudTracker(k, fait, p)`, `hudLieu(k, nChars)`) apparaissent au premier plan de chaque anecdote (case allumée + lieu) et restent jusqu'à la fin du segment ; à la fin de l'anecdote la case se coche (`fait = k + 1`). Pas de cases dans l'accroche, dans la planche en coupe si elles gênent, ni dans le carton final.
- Chaque artiste définit **l'icône de sa bête** : `ICONES[k] = function (cx, cy) { … }` (≈ 17 × 17 px, centrée, couleurs exactes, contour sombre) dans son fichier (k = 0 grenouille, 1 lézard, 2 lycaon) : elle remplace l'icône provisoire de `cadre.js` dans les cases et le carton final.

## 4. Vocabulaire des événements de bruitage

Chaque plan déclare dans `ev` les instants où quelque chose se passe (temps absolu, valeur facultative `v`). Le sonorisateur fait un son par type ; **n'utiliser que ces types** (en ajouter un seul si rien ne convient : le décrire dans `son_<segment>.md`).

| Type | Quand | `v` |
|---|---|---|
| `ding` / `no` | pastille ✓ / ✗ | – |
| `label` | une étiquette se tape | – |
| `blip` | petit bip d'interface | – |
| `counter` | un compteur avance d'un cran | numéro du cran |
| `pop` | une icône / une case apparaît | – |
| `scribble` | crayon sur le carnet | durée (s) |
| `page` | page du carnet tournée | – |
| `scan` | balayage « scanner » de science-fiction | durée |
| `zoom` | gros plan qui plonge (cellules) | durée |
| `whoosh` | mouvement rapide (animal, caméra) | durée |
| `reveal` | révélation (accord lumineux) | – |
| `suspense` | montée de tension | durée |
| `wind` | rafale de vent | durée |
| `snowfall` | début d'une chute de neige serrée | durée |
| `frost` | le givre / la glace gagne le corps | durée |
| `crack` | la glace se fissure | force 0 à 1 |
| `drip` | goutte d'eau | taille 0 à 1 |
| `thaw` | fonte : filet d'eau qui s'écoule | durée |
| `heartbeat` | un battement (« toum-doum ») | 1 fort, 0,5 faible |
| `beep` | bip du moniteur cardiaque | – |
| `flatline` | le moniteur passe à plat (son continu) | durée |
| `glow` | lueur magique qui enveloppe (sucre protecteur) | durée |
| `sparkle` | scintillement de cristaux | – |
| `ribbit` | coassement | hauteur 0,8 à 1,3 |
| `hop` | saut / réception sur les feuilles | – |
| `step` | pas (neige, sable, herbe) | – |
| `sniff` | reniflement | – |
| `squirt` | jet de sang | durée |
| `splat` | impact mouillé | – |
| `yelp` | couinement du coyote | – |
| `shake` | l'animal secoue la tête | – |
| `sneeze` | éternuement de lycaon (« atchoum ») | hauteur 0,8 à 1,3 |
| `yip` | piaillement excité de la meute | – |
| `run` | course de la meute | durée |
| `ruler` | la règle se déroule (graduations) | nombre de graduations |
| `bird` | un oiseau s'envole ou chante | type 0 à 3 |
| `vote` | bulletin déposé dans l'urne | – |
| `endCard` | le carton final | – |

Les ambiances continues (vent, oiseaux, grillons, ruisseau) ne sont **pas** des événements : le sonorisateur les cale sur les noms et les temps des plans (`build/events.json` contient aussi la liste des plans). Chaque artiste décrit dans `son_<segment>.md` ce qu'on voit et ce qu'on devrait entendre en continu, plan par plan.

## 5. Contrôles (à faire avant de rendre le travail)

Chaque artiste travaille sur **sa page** `solo_<segment>.html` (écrite par `node solo.mjs <segment>`) et dans **son dossier** `build/<segment>/` : jamais dans `build/` directement (les autres y travaillent aussi). La page solo ne charge que le moteur, `scientist.js`, `cadre.js`, `kit.js`, `flore.js` et le fichier du segment.

```bash
node solo.mjs gre                                                         # (re)écrit solo_gre.html (à refaire si on ajoute un fichier sc_gre_*.js)
PAGE=solo_gre.html OUT=build/gre node check.mjs 6                         # doit afficher « erreurs : 0 » ; liste les plans les plus lents
PAGE=solo_gre.html OUT=build/gre node bords.mjs                           # « aucun texte hors cadre »
PAGE=solo_gre.html node sheet.mjs 0.55 build/gre/sheet                    # une image par plan (à 55 % de sa durée) : build/gre/sheet/NN_<plan>.png
PAGE=solo_gre.html node sheet.mjs 0.15 build/gre/sheet_debut              # idem au début des plans (pour juger l'arrivée de l'image)
PAGE=solo_gre.html OUT=build/gre node strip.mjs g2_gel 8 0.25             # 8 images d'un plan, une toutes les 0,25 s : build/gre/strip_g2_gel.png (mouvement)
node render.mjs solo_gre.html --stills 12.5 14                            # images précises (build/stills/ ou $OUT/stills/)
```

- **Regarder les images** (outil de lecture d'images) : un plan n'est pas fini tant qu'on ne l'a pas vu en image **au début, au milieu et à la fin**, et en bande de mouvement pour tout ce qui bouge. Comparer à la vignette réduite (le sujet se lit-il à 1/4 de taille ?).
- Vérifier : le sujet est au-dessus de y = 355 et les sous-titres (y ≈ 375, hauteur 25 px) ne cachent rien d'essentiel ; rien ne flotte dans le vide ; la palette est respectée ; aucune expression involontaire ; les mouvements s'amorcent et s'arrêtent avec de l'élan ; le plan n'est jamais immobile ; le texte pixel est lisible et dans le cadre.
- Machine : 4 cœurs partagés entre plusieurs artistes. Pas de rendu complet de vidéo ; `check.mjs` avec un pas de 6 à 12 images ; au plus 8 images par passe de contrôle.
- **Ne jamais modifier** les fichiers des autres ni les fichiers communs. Besoin d'un changement commun : `demandes_<segment>.md` (une ligne par demande, avec la raison).

## 6. Rendu complet (chef de projet)

`piece.html` charge tous les fichiers (liste dans le fichier). Un fichier supplémentaire d'un artiste est déclaré en l'écrivant à la main dans `piece.html` par le chef de projet (le signaler dans le compte rendu). Le rendu final : `VOIX=ia ./rendu.sh` (événements → `score.mjs` → 4 rendus en parallèle → mixage → −14 LUFS → encodage ≤ 29 Mo).

## 7. Pièges déjà rencontrés (vidéo 2)

- Un nom global en double (`const SN`…) ou une erreur de syntaxe dans un fichier fait échouer **toute** la page : lancer `check.mjs` après chaque gros ajout.
- Les dégradés `vgrad`/`rgrad` sont tramés par la palette : bien pour un ciel, mais une lueur sur fond clair peut virer à un aplat ; vérifier en image.
- Une lettre qui manque à la police (`œ`, `Œ`, guillemets, tiret long) ne s'affiche pas : s'en tenir aux signes listés.
- `ptext` hors du cadre n'est pas signalé par le moteur : `bords.mjs` le fait.
- Ne pas dessiner dans `ui()` ce qui doit être tramé avec le décor (le texte et les icônes y sont nets, le reste va dans `draw`).
- Un plan trop court (< 0,2 s) fait échouer `finishShots` ; les segments doivent se suivre sans trou ni chevauchement (le dernier plan d'un segment court jusqu'à `S.t1`).
- Les temps de parole du **fichier provisoire** (`provisoire.py`) sont estimés : seul `wt(id, mot)` est fiable, jamais une durée écrite en dur ; quand la vraie voix arrive tout se recale, donc les mouvements qui doivent « finir avant le mot suivant » se calculent à partir de `wt`/`wt1`, pas de `u`.
