# Concept — « 3 anecdotes complètement folles sur les animaux — Épisode 2 »

**Logline** : trois bêtes, trois super-pouvoirs, un naturaliste qui note tout dans son carnet de terrain. Le scarabée bombardier mélange deux produits chimiques dans son abdomen et crache un jet pulsé à ≈ 100 °C ; le basilic (« lézard Jésus-Christ ») court debout sur l'eau pour échapper à ses prédateurs ; l'anguille électrique d'Amazonie décharge jusqu'à 860 volts, presque quatre fois une prise française. La vidéo finit sur une question au spectateur : « lequel possède le super-pouvoir le plus impressionnant ? »

**Texte** : le script de l'auteur, mot pour mot (`voix.py`, `SCRIPT`). Seuls changements : les pauses entre phrases et le découpage en paragraphes de lecture (`GROUPES`). Le texte n'est pas retouché pour la voix.

**Même film que l'épisode 1** (`../03-anecdotes-animaux/`) : même moteur pixel art (270 × 480 ×4, palette fixe), même voix (CML-TTS français, locuteur 928, voix « B »), même scientifique (coiffure de l'auteur), même fil conducteur (le carnet de terrain et ses trois cases en haut à gauche), même plan de sortie « RAISINS ». Ce qui change : trois autres bêtes, trois autres mondes, et un fil plus « film d'action » (accroche en salle de cinéma, finale « super-pouvoirs »).

**Ambiance** : toujours dehors, en lumière naturelle, avec des plans larges et des bêtes dessinées avec soin. Scarabée : sol et herbes de fin d'après-midi, vu au ras du sol, vapeur du jet. Basilic : rivière de forêt tropicale d'Amérique centrale, lumière dorée à travers la canopée, éclaboussures. Anguille : rivière amazonienne au crépuscule puis sous l'eau trouble, rayons de lumière, éclairs.

**Format** : 1080 × 1920, 30 i/s, voix 54,6 s + carton final 2 s + plan de sortie 4,2 s. Voix de synthèse (Kyutai TTS 1.6B avec la voix de référence CML-TTS, CC-BY 4.0 : mentionner « CML-TTS » dans la description, ainsi que « voix de synthèse » et l'étiquette « contenu généré par IA »).

## Plan par segment (temps de la voix : `build/timeline.js` ; les plans réels sont listés par `node valide.mjs`)

| Segment | Ce qu'on voit | Ce que dit la voix |
|---|---|---|
| **intro** (0 → 5,8 s) | `i_cases` : le scientifique en lisière de prairie, trois cases « ? » se retournent (scarabée, basilic, anguille) avec leur pouvoir (100 °C, SUR L'EAU, 860 V), titre « 3 SUPER-POUVOIRS », jumelles. `i_film` : salle de cinéma, un petit film défile (jet du scarabée sur un crapaud, basilic qui court, éclairs de l'anguille), la claquette claque sur « film ! » | « Voici trois animaux qui possèdent des capacités tellement incroyables qu'on pourrait croire qu'ils sortent d'un film ! » |
| **sca** (5,8 → 22,8 s) | thermomètre jusqu'à 100 °C, nom, planche du carnet (les deux réservoirs, la chambre de réaction), le jet pulsé frappe le prédateur qui recule | b1 à b4 |
| **bas** (22,8 → 37,5 s) | le basilic saute dans la rivière et court, gros plan du pied qui claque l'eau et de la poche d'air, fuite devant un prédateur | c1 à c3 |
| **ang** (37,5 → 50,6 s) | l'anguille dans l'eau trouble, décharges et compteur « 860 V », barres « PRISE 230 V » / « ANGUILLE 860 V », proie paralysée, prédateur qui recule | e1 à e3 |
| **fin** (50,6 → 56,5 s) | le scientifique hésite devant trois cartes (1 scarabée, 2 basilic, 3 anguille) plantées dans la prairie ; carton « 1 · 2 · 3 ? » pendant 2 s | « Alors, lequel de ces trois animaux possède le super-pouvoir le plus impressionnant ? » |
| **outro** | logo (grappe), « RAISINS », « ABONNEZ-VOUS » (identique aux vidéos précédentes) | (musique seule) |

## Faits et réserves

Le texte de l'auteur n'est pas corrigé : voici ce qu'il simplifie ou dépasse, à signaler dans la description si on veut être irréprochable.

- **Scarabée bombardier** : le liquide sort jusqu'à ≈ 100 °C par pulsations rapides (de l'ordre de 500 par seconde), mélange d'hydroquinones et d'eau oxygénée dans une chambre de réaction ; « petite explosion » est une image (une réaction chimique très rapide, pas une vraie explosion) ; le jet est brûlant et irritant, il fait renoncer grenouilles, crapauds, fourmis, oiseaux, souris. L'espèce dessinée est de type *Brachinus*.
- **Basilic** : le texte parle de « lézard » en Amérique centrale ; le basilic à plumet (*Basiliscus plumifrons*) est dessiné. Il court debout à ≈ 1,5 m/s sur une distance courte (jusqu'à ≈ 10 à 20 m pour un jeune ; un adulte plus lourd coule et finit par nager) ; chaque pas claque l'eau, une poche d'air se forme sous le pied.
- **Anguille électrique** : 860 V mesurés chez *Electrophorus voltai* (Nature Communications, 2019), un courant d'environ 1 ampère, par décharges très brèves ; 860 / 230 ≈ 3,7 (« presque quatre fois ») ; c'est un poisson-couteau, pas une vraie anguille ; ce n'est pas toute « anguille électrique » : le texte dit « une espèce ».

## Précautions

- Aucun personnage ni animal sous droits : les bêtes sont dessinées d'après leurs formes réelles.
- La voix est une **voix de synthèse** : à signaler dans la description (étiquette « contenu généré par IA »).
