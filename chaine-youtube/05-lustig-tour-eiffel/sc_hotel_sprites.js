'use strict';
/* ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════
   sc_hotel_sprites.js — intérieurs et accessoires de « L'homme qui a vendu la tour Eiffel » (préfixe ho_ ; aucun nom global sans ho_ / HO_, sauf ICONES[1] et ICONES[2])
   L'hôtel de luxe (façade, grand salon, table), la chambre de Lustig (miroir), le bureau du faussaire (machine à écrire), les faux documents, le tampon rouge « VENDUE » (fil conducteur), l'argent, le téléphone.

   CONVENTIONS
   · Tout se dessine sur L (270 × 480) AVANT le tramage, dans draw(u, t, S), texte pixel compris (il passe au tramage avec le reste : les couleurs sont des tons de la palette, le contraste est fort). Rien ne se dessine dans ui(), sauf ICONES[1] et ICONES[2].
   · Chaque fonction est PURE : mêmes arguments → mêmes pixels, aucun Math.random, aucun Date ; t = temps du FILM (secondes) ; le hasard est un hachage de graine (o.seed). Les décors lourds sont précalculés dans INITS (rien à payer au premier plan) ; un passage ≤ 25 ms (mesuré 5 à 20 ms).
   · Signatures : (x, y, …) = pied / milieu du bas pour un objet posé ; coin haut gauche (x, y, w, h) pour une feuille de papier ; centre (cx, cy) pour une enveloppe, une empreinte, un tampon ; s = échelle (1 = taille indiquée) ; t = temps ; o = options (toutes facultatives).
   · Décors plein cadre (ho_salon, ho_bureau, ho_chambre, ho_facade) : o.cam = abscisse de la caméra en px (parallaxe : mur / ciel au loin 0,05 à 0,5 ; sol et meubles 1 ; avant-plan 1,15 à 1,4 ; un objet posé dans le monde en x s'affiche à x − cam) ;
     o.layer 'all' (défaut) | 'back' (décor et meubles : À DESSINER AVANT les personnages) | 'front' (lueurs, rais, poussière, vignette, premier plan : APRÈS les personnages). Un plan fait donc : décor 'back' → personnages → décor 'front'.
   · La lumière : lueurs additives (cachées dans des sprites), tramage de Bayer, vignette sombre. Aucune couleur hors des rampes de engine.js. Les textes sont en MAJUSCULES, sans guillemets (police pixel du moteur ; accents É È Ê À Ô Î Ï Ù Û Ç permis).
   · Événements de bruitage à déclarer dans le plan : l'instant du contact du tampon est t0 passé à ho_tampon (événement 'stamp', v = force) ; ho_machine : événement 'typing' (durée de la frappe) ; l'argent qui s'envole : 'coins' ; le cachet : 'stamp' à t0 + press (1,0 s par défaut) ;
     la clochette de fin de ligne de la machine = instants t0 + k × (24 / rate + 0,24) (voir ho_typing). ho_hit(t, t0) donne l'intensité du choc 0..1 à appliquer à la secousse de l'image.

   ─────────────────────────── 1. LE TAMPON ROUGE (fil conducteur) ───────────────────────────
   ho_tampon(cx, cy, s, t, t0, o)   tampon à poignée de bois qui s'abat à l'instant t0 et laisse son empreinte rouge. (cx, cy) = centre de l'empreinte ; s = échelle (1 : « VENDUE » ≈ 130 × 47 px ; 1,5 pour le plein écran) ; t = temps du film ; t0 = instant du contact.
        o.texte 'VENDUE' (ou 'ARNAQUE', 'OFFICIEL', 'SECRET', 'PAS DE PLAINTE', 'JAMAIS A LUI' : les textes trop larges passent sur deux lignes ; '\n' force la coupure) · o.frame 'double' (défaut) | 'rect' | 'fill' (plaque pleine, lettres en creux) | 'none' · o.col 'red' | 'blue' | 'black'
        o.view 'pov' (défaut : vu DE DERRIÈRE LA MAIN : bloc de bois + bouton tourné + bague de laiton ; il grossit en s'approchant (recul d'anticipation, accélération), s'écrase à l'échelle 1 sur l'écran / le papier, se tasse, rebondit, reste appuyé puis repart vers la caméra en grossissant et en se fondant)
            | 'side' (de profil : tombe d'en haut sur un papier posé vu en perspective ; o.persp 0,46 écrase l'empreinte)
        o.fall 0,4 (durée de la descente avant t0) · o.wind 0,16 (recul d'anticipation avant la descente) · o.hold 0,16 (appuyé) · o.lift 0,28 (retrait) · o.stay true (ne repart pas) · o.imprint false (ne laisse pas d'empreinte)
        o.rot (rad ; inclinaison de l'empreinte, défaut ≈ −0,04 ± 0,1 selon o.seed) · o.seed · o.worn 0,5 (usure de l'encre) · o.splat 1 (éclaboussure d'encre qui part du bord à l'impact ; 0 = aucune) · o.barre 0..1 (trait rouge qui barre l'empreinte, tracé de gauche à droite) · o.persp
        À l'impact : éclair chaud, anneau d'encre qui déborde, 14 gouttes projetées qui restent ; l'empreinte reste « mouillée » (reflets) 0,7 s.
        renvoie { phase ('wait' | 'wind' | 'fall' | 'press' | 'lift' | 'gone'), h, hit (choc 0..1), printed (bool), tau, box: [x, y, w, h] }
   ho_empreinte(cx, cy, s, texte, o)   l'empreinte seule (plans où il est déjà tamponné). Mêmes options que ci-dessus (o.frame, o.col, o.seed, o.worn, o.rot, o.persp) + o.barre (true | 0..1 : barrée d'un trait rouge irrégulier) · o.wet 0..1 (reflets d'encre fraîche) · o.pop 0..1 (0 = vient d'être posée : 1,1 × puis 1) · o.alpha · o.splat 0 (sans gouttes) · o.drops (nombre).
        renvoie { w, h, box, rot }
   ho_hit(t, t0, dur = 0,45)   → 0..1 : choc qui décroît après t0 (pour la vibration de l'image).   ho_stampH(τ, o) → { h, vis, phase } (hauteur du tampon à τ = t − t0).
   ho_cachet(x, y, s, t, t0, o)   cachetage : le bâton de cire chauffé à la flamme coule, la flaque s'étale, le sceau de laiton s'écrase (à t0 + o.press, 1,0 s) et laisse l'empreinte (o.ribbon : ruban) ; o.stick false (sans bâton). renvoie { phase: 'wait' | 'drip' | 'press' | 'done', r }

   ─────────────────────────── 2. LES FAUX DOCUMENTS ───────────────────────────
   ho_document(x, y, w, h, t, o)   papier à en-tête officiel (bandeau bleu nuit « MINISTERE », filet d'or, liserés tricolores), lignes d'écriture, sceau de cire à ruban (bas gauche), signature (bas droite). (x, y) = coin haut gauche ; la rotation se fait autour du centre.
        o.head 'MINISTERE' (null : bandeau vide ; tronqué si le papier est étroit) · o.sub (ligne en petit) · o.title (titre en capitales) · o.lines (nombre de lignes, auto) · o.write 0..1 (le texte s'écrit ligne après ligne) · o.seal 0..1 (le sceau s'écrase : 0 absent) · o.sign 0..1 (la signature se trace) · o.signKind 0 | 1
        o.stamp 0..1 (TAMPON APPLIQUÉ : 0 absent ; dès > 0 l'empreinte est là, l'encre se pose et brille pendant ~0,25 / 0,6 s de valeur) · o.stampText 'OFFICIEL' · o.stampAt [fx, fy] (fractions, défaut [0,52 ; 0,66]) · o.stampW 0,66 · o.stampRot
        o.rot (rad) · o.wave (px) + o.waveT (le papier ondule / flotte) · o.alpha · o.s (échelle) · o.paper (couleur) · o.curl (coin plié) · o.shadow 0 · o.outline false · o.warm 0..1 (teinte lampe) · o.seed
        renvoie { x, y, w, h, cx, cy, seal: [x, y], sign: [x, y], stamp: [x, y], head: [x, y, w, h] }
   ho_contrat(x, y, w, h, t, o)   contrat : titre CONTRAT, six articles, plis en trois, deux lignes de signature (X), ruban et sceau. o.sign1, o.sign2 0..1 (signature élégante de Lustig / maladroite du marchand), o.seal 0..1, o.stamp 0..1 + o.stampText 'VENDUE' + o.stampBarre 0..1, o.write 0..1, o.folds, o.rot, o.wave, o.alpha.
        renvoie { x, y, w, h, cx, cy, sign1: [x, y], sign2: [x, y], seal: [x, y], stamp: [x, y] }
   ho_enveloppe(cx, cy, s, t, o)   enveloppe crème 44 × 30 px (centre cx, cy). o.face 'dos' (rabat) | 'face' (adresse, timbre, en-tête) · o.open 0..1 (le rabat s'ouvre ; repasser de 1 à 0 le referme) · o.seal 0..1 (cachet de cire sur la pointe du rabat fermé) · o.letter 0..1 (la lettre sort) · o.rot · o.shadow
        o.fly { p 0..1, from [x, y], to [x, y], arc (50), spin (0,6), s0, s1 } : l'enveloppe vole le long d'un arc en roulant (remplace cx, cy, rot, s).   ho_vol(p, from, to, o) → { x, y, rot, s } : la même trajectoire, pour tout autre papier. renvoie { x, y, w, h, tip, seal }
   ho_affiche(x, y, w, h, t, o)   affiche « LA TOUR EIFFEL / A DEMOLIR ? » : petite tour (brune, treillis, plateformes), grue à flèche, boulet de démolition en pendule. (x, y) = coin haut gauche ; w ≥ 90 pour lire les titres (w = 240 : plein écran).
        o.ball 0..1 (amplitude du pendule ; > 0,4 : il frappe la tour à chaque période de 2,4 s, étincelles) · o.ruin 0..1 (la tour se brise : sommet qui bascule, poutres, poussière) · o.titles [l1, l2] · o.stamp 0..1 + o.stampText 'SECRET' · o.kind 'dossier' (chemise cartonnée à étiquette ; o.out 0..1 : l'affiche en sort) · o.rot · o.wave · o.alpha
        renvoie { x, y, w, h, cx, cy, tower: [x, y, h], ball: [x, y], hit (0 | 1), art: [x, y, w, h] }
   ho_tourMini(cx, by, h, o)  silhouette de tour Eiffel de dessinateur (pied (cx, by), hauteur h ; o.col, o.dark, o.hi) · ho_wax(cx, cy, r, pop, o) sceau de cire (o.ribbon) · ho_sign(x, y, p, kind, col, sc) signature · ho_lines(x, y, w, n, step, col, seed, prog, o) faux texte.

   ─────────────────────────── 3. L'ARGENT, LE TÉLÉPHONE ───────────────────────────
   ho_mallette(x, y, s, t, o)   mallette de cuir brun (coins, serrures, poignée de laiton), vue 3/4 de dessus ; (x, y) = milieu du bas de la face avant ; 80 px de large à s = 1.
        o.open 0..1 (les serrures se soulèvent, le couvercle pivote sur sa charnière arrière jusqu'à ≈ 105° : doublure rouge, huit liasses, billets qui frémissent) · o.glow 0..1 (lueur dorée au-dessus) · o.bills 0..1 (remplissage) · o.latch · o.shake (px, tremblement) · o.shadow
        o.style 'mallette' | 'valise' · o.contents 'billets' | 'linge' | 'vide'.   renvoie { handle: [x, y], inside: [x, y, w, h], locks: [[x, y], [x, y]], top, w, h }
   ho_valise(x, y, s, t, o)   la valise de voyage (96 px, sangles, étiquettes sans texte, linge) = ho_mallette en style 'valise'.
   ho_billets(x, y, s, t, o)   o.kind 'liasse' (défaut ; o.n liasses ; o.layout 'pile' | 'pyramide' | 'rang') | 'tas' (pyramide de o.n = 10) | 'monnaie' (tas de pièces d'or posé, o.n) | 'vol' (billets qui voltigent) | 'pluie' (billets qui tombent sur la largeur) | 'pieces' (pièces d'or qui volent et tournent).
        Émetteur ('vol', 'pluie', 'pieces') : o.n 14 · o.area [x0, y0, x1, y1] (naissance ; défaut le point (x, y) ; 'pluie' : bande au-dessus de l'écran) · o.vx, o.vy (px/s, défaut 0 / −50) · o.spread 40 · o.g 55 · o.life 2,2 · o.t0 0 · o.loop true (false : une seule vague) · o.flip 5 (retournements/s) · o.sway 14 · o.size 1 · o.fade true. renvoie { top, box } (liasses) | { n }
   ho_bill(x, y, s, rot, phase, o) un billet (largeur |cos phase| : retournement) · ho_coin(x, y, s, phase) une pièce d'or qui tourne · ho_bundle(x, y, s) une liasse à bandeau.
   ho_telephone(x, y, s, t, o)   téléphone « chandelier » : socle noir, fût de laiton, cornet, combiné sur sa fourche, cordon. (x, y) = milieu du bas du socle ; ≈ 36 × 74 px. o.ring 0..1 (il sonne : tout l'appareil et le combiné tremblent, traits de sonnerie) · o.lift 0..1 (le combiné quitte la fourche vers o.liftTo [x, y] ; le cordon pend). renvoie { mouth, rcv: [x, y] (combiné, pour y poser une main), base }

   ─────────────────────────── 4. LE BUREAU DU FAUSSAIRE ───────────────────────────
   ho_machine(x, y, s, t, o)   machine à écrire d'époque (carrosserie noire à filets d'or, 4 rangées de touches rondes qui s'enfoncent, éventail de barres à caractères dont une frappe le rouleau, bobines de ruban, chariot, molettes, levier de retour, feuille). (x, y) = milieu du bas ; 112 px de large, 70 de haut sans la feuille (s = 1 ; s = 1,6 plein cadre).
        o.rate 9 (frappes/s ; 0 = au repos) · o.t0 (début de la frappe) · le chariot glisse vers la gauche pendant une ligne de 24 lettres, revient en 0,24 s (levier, clochette), la feuille et son en-tête montent d'une ligne (neuf lignes au plus) · o.paper 0..1 (hauteur de feuille : 0 → 1 = on engage la feuille) · o.head false (feuille sans en-tête) · o.light (lueur ambre)
        renvoie { platen: [x, y], paper: [x, y, w, h], mouth: [x, y], top, line, col, returning 0..1, bell (true pendant le retour), w, h }.   ho_typing(t, t0, rate) → { chars, line, col, returning, key } (l'état de frappe, pour caler les événements 'typing').
   ho_lampe(x, y, s, t, o)  lampe de bureau à abat-jour d'ambre (o.on 0..1, o.glow 0 = sans lueur, o.flicker) · ho_bougie(x, y, s, t, o) bougie sur bougeoir à anneau (o.h, o.melt, o.out : soufflée) · ho_encrier(x, y, s, t, o) encrier + plume (o.dip 0..1) · ho_tamponBois(x, y, s, o) tampon à main (o.kind 'rond' | 'rect') · ho_pile(x, y, s, t, o) pile de papiers (o.n, o.lift).
   ho_bureau(t, o)   le petit bureau sombre, plein cadre : papier peint vert rayé, lambris, étagère de registres, carte encadrée, pendule dont les aiguilles avancent, fenêtre à persienne (lames de lune bleues), plateau de bois à sous-main de cuir (y 290 → 352), tiroirs ; lampe d'ambre à gauche (lueur, flaque sur le plateau, poussière), machine à écrire au centre, pile de papiers, bougie, encrier, deux tampons de bois.
        o.cam · o.layer · o.items { lampe, machine, pile, bougie, encrier, tampons : false pour retirer } · o.machine { rate, t0, paper, s, head } (rate 0 : machine au repos) · o.lamp 0..1 · o.candle 0..1 · o.dip · o.pile { lift }
        renvoie { desk: [290, 352], lamp: { x, y }, machine (retour de ho_machine), candle: { flame }, ink, stamps: [[x, y], [x, y]], key }

   ─────────────────────────── 5. L'HÔTEL DE LUXE ───────────────────────────
   ho_facade(t, o)   façade d'un palace parisien vue de la rue : toit de zinc mansardé à lucarnes et cheminées qui fument, cinq travées de fenêtres à balcons de fer forgé et frontons, grande verrière d'entrée au-dessus d'un tapis rouge, trois drapeaux tricolores qui flottent sur des hampes inclinées, portier minuscule (il salue), berline d'époque devant, deux lampadaires, passants, pigeons ; rue de pavés de y 346 à 480 (le sujet reste au-dessus de y 355).
        o.light 0..1 : 0 = plein jour (ciel bleu, pierre claire, vitres bleues) → 1 = crépuscule (ciel violet-or, pierre dorée aux ombres violettes, fenêtres allumées, phares et lampadaires, reflets sur les pavés) ; entre les deux : mélange tramé · o.cam · o.layer · o.car { x (205), flip, lights } · o.doorman false · o.walkers 2 · o.flags true · o.birds 1
        renvoie { door: [x, y], doorman: [x, y], car: [x, y], ground: 346, curb: 362, flags: [[x, y], …] }
   ho_voiture(x, y, s, t, o) berline noire 1920 (96 px ; o.flip, o.lights 0..1, o.engine 0 | 1 : échappement) · ho_drapeau(x, y, w, h, t, o) drapeau tricolore qui flotte (o.dir ±1) · ho_lampadaire(x, y, s, t, o) (o.on) · ho_portier(x, y, s, t, o) (≈ 15 px) · ho_passant(x, y, s, t, o) (o.kind 0 | 1, o.dir ±1).
   ho_salon(t, o)   le grand salon doré, plein cadre. o.view 'wide' (plan moyen : plafond à rosace, corniche dorée à denticules, trois hautes fenêtres cintrées bleu nuit à rideaux de velours rouge qui bougent, lambrequins à franges, travées moulurées, lambris, parquet et grand tapis rouge en perspective, lustre de cristal, deux colonnes de marbre à chapiteaux dorés au premier plan, rais de lumière, poussière)
        | 'close' (gros plan sur la table : le même salon flou et sombre, bokeh d'or du lustre, tapis).  Perspective du sol : horizon y = 190, mur / sol y = 248 ; la table de six se pose en (135, 322) à s = 1 (ho_table), à s ≈ 2 en (135, 330) pour le gros plan.
        o.cam (parallaxe fenêtres 0,5 · lustre 0,7 · sol 1 · colonnes 1,4) · o.layer · o.light 0..1 (lueur du lustre) · o.lustre · o.columns · o.rays · o.dust 1 · o.vignette 0,55 · o.curtains.   renvoie { floorY: 248, vp: [135, 190], table: [135, 322], lustre: { x, y }, windows, k(y) }
   ho_lustre(x, y, s, t, o)  lustre de cristal (3 anneaux, ~60 pendeloques qui scintillent à tour de rôle en croix, 18 bougies à flammes qui vacillent, lueur ambre) ; (x, y) = attache au plafond (début de la chaîne) ; o.glow, o.sparkle, o.flame, o.sway, o.chain.
   ho_table(cx, cy, s, t, o)   grande table ovale (rx = 100 s, ry = 28 s) à nappe blanche tombante, plis festonnés, carafes (vin, eau), 6 verres, cendrier de cristal doré avec cigare qui fume, candélabre d'argent à trois flammes, trois papiers (dont un scellé). (cx, cy) = centre du plateau. o.items { carafes, verres, papiers : nombre ; cendrier, candelabre : 0 } · o.cloth · o.shadow.
        Ordre : décor 'back' → convives DERRIÈRE la table → ho_table → convives DEVANT → décor 'front'.   renvoie { top: { cx, cy, rx, ry }, hem, seats: [{ x, y, side: 'far' | 'near' }] ×6, items: { carafe, glass, ashtray, candle, papers } }
   ho_glass(x, y, h, o) verre à pied · ho_carafe(x, y, h, t, o) · ho_cendrier(x, y, s, t, o) · ho_candelabre(x, y, s, t, o) · ho_curtain(x, y, w, h, t, o) rideau de velours qui ondule (o.flip) · ho_motes(t, o) poussière dans la lumière.

   ─────────────────────────── 6. LA CHAMBRE DE LUSTIG ───────────────────────────
   ho_chambre(t, o)   chambre / cabinet, plein cadre : papier peint gris-bleu à motifs d'or, lambris, fenêtre sur la nuit à rideau, plancher, tapis ; miroir en pied (centre x = 84, pieds y = 348), guéridon + lampe de chevet (x = 158), valise (x = 214), portemanteau avec manteau, écharpe, chapeau (x = 248) ; lampe chaude à droite du miroir, lune bleue.
        o.reflect = function(info) : DESSIN DU REFLET dans le miroir (voir ho_miroir) · o.flip · o.mirror { x, w, h } · o.valise { open 0..1, s, y } · o.coat · o.hat ('melon' | 'haut' | false) · o.lamp 0..1 · o.moon · o.cam · o.layer · o.items { miroir, lampe, valise, portemanteau, tableau : false }
        renvoie { floorY: 346, mirror: { glass: [x, y, w, h], cx, cy, bottom, top, frame }, lamp, valise, rack }
   ho_miroir(x, y, w, h, t, o)  psyché (cadre arrondi de bois à filet d'or, montants, pieds, couronnement) ; (x, y) = milieu du bas des pieds ; w × h du cadre (88 × 176). o.reflect(info) est appelé DANS le verre (découpé en arche) avec info = { x, y, w, h (verre), cx, cy, bottom, top } : dessinez-y le personnage (R, disc, layerBegin / layerEnd, sprites) en coordonnées ÉCRAN, de face, un peu plus petit ;
        voile bleuté et reflets en diagonale qui glissent ensuite ; o.flip true retourne le reflet horizontalement autour de l'axe du verre ; o.reflectAlpha, o.room, o.sheen, o.shine.
   ho_portemanteau(x, y, s, t, o) (o.coat, o.hat, o.cane, o.scarf) · ho_chapeau(x, y, s, o) (o.kind 'melon' | 'haut' | 'canotier', o.rot) · ho_canne(x, y, s, o) · ho_lampeChevet(x, y, s, t, o) · ho_gueridon(x, y, w, h, o).

   ─────────────────────────── 7. ICÔNES ───────────────────────────
   ICONES[1] : un document à en-tête bleu avec un sceau de cire rouge (17 × 17 px, couleurs exactes, contour sombre).   ICONES[2] : la mallette de cuir brun à serrure de laiton, une liasse de billets qui dépasse.

   OUTILS (utilisables par les plans) : ho_R, ho_P, ho_disc, ho_ell, ho_line, ho_poly, ho_dith, ho_ellDith, ho_glow(cx, cy, r, 'r,g,b', a), ho_text / ho_textC (texte pixel sur le contexte courant) ; ho_blit(canvas, x, y, { rot, s, sx, sy, alpha }) ; ho_mix2(a, b, k) (mélange tramé de deux canevas) ; ho_cache(clé, w, h, fn) ; ho_h / ho_h2 (hachage 0..1).
   ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════ */

// ════════════════════════════════════════════════════════════════════════════════════════
// 0. OUTILS : primitives qui dessinent sur le contexte courant (L par défaut, ou un canevas hors écran), hasard déterministe, blit tourné
// ════════════════════════════════════════════════════════════════════════════════════════
const ho_K = '#05040f';
let ho_c = null;                                                    // contexte cible (null = L)
const ho_ctx = () => ho_c || L;
function ho_to(ctx, fn) { const p = ho_c; ho_c = ctx; try { fn(); } finally { ho_c = p; } }
function ho_h(i, s = 0) { let h = Math.imul(i | 0, 374761393) + Math.imul(s | 0, 668265263) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296; }
function ho_h2(x, y, s = 0) { return ho_h(Math.imul(x | 0, 73856093) ^ Math.imul(y | 0, 19349663), s); }
const ho_bay = (x, y) => BAYER[((y & 3) << 2) | (x & 3)];
const ho_ss = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const ho_fin = (v, d = 0) => Number.isFinite(v) ? v : d;
const ho_rgbM = {};
function ho_rgb(c) { if (Array.isArray(c)) return c; return ho_rgbM[c] || (ho_rgbM[c] = [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)]); }
const ho_mixc = (a, b, f) => { a = ho_rgb(a); b = ho_rgb(b); return '#' + [0, 1, 2].map(i => Math.round(a[i] + (b[i] - a[i]) * f).toString(16).padStart(2, '0')).join(''); };
function ho_n2(x, y, s = 0) {                                       // bruit de valeur lisse 2D (0..1)
  const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy, ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
  const a = ho_h2(ix, iy, s), b = ho_h2(ix + 1, iy, s), c = ho_h2(ix, iy + 1, s), d = ho_h2(ix + 1, iy + 1, s);
  return (a * (1 - ux) + b * ux) * (1 - uy) + (c * (1 - ux) + d * ux) * uy;
}
function ho_n1(x, s = 0) { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return ho_h(i, s) * (1 - u) + ho_h(i + 1, s) * u; }

function ho_R(x, y, w, h, c) { const g = ho_ctx(); const x0 = Math.round(x), y0 = Math.round(y), x1 = Math.round(x + w), y1 = Math.round(y + h); if (x1 <= x0 || y1 <= y0) return; g.fillStyle = c; g.fillRect(x0, y0, x1 - x0, y1 - y0); }
function ho_P(x, y, c) { const g = ho_ctx(); g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), 1, 1); }
function ho_disc(cx, cy, r, c) {
  const g = ho_ctx(); g.fillStyle = c; cx = Math.round(cx); cy = Math.round(cy);
  for (let dy = -r; dy <= r; dy++) { const hw = Math.floor(Math.sqrt(Math.max(0, r * r + r * 0.6 - dy * dy))); g.fillRect(cx - hw, cy + dy, hw * 2 + 1, 1); }
}
function ho_ell(cx, cy, rx, ry, c) {
  const g = ho_ctx(); g.fillStyle = c; cx = Math.round(cx); cy = Math.round(cy); rx = Math.max(0, rx); ry = Math.max(0, ry);
  const ri = Math.ceil(ry);
  for (let dy = -ri; dy <= ri; dy++) { const k = 1 - (dy * dy) / (ry * ry + 0.6), hw = Math.floor(rx * Math.sqrt(Math.max(0, k)) + 0.35); if (k >= 0) g.fillRect(cx - hw, cy + dy, hw * 2 + 1, 1); }
}
function ho_line(x0, y0, x1, y1, c, th = 1) {
  const g = ho_ctx(); x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
  const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1; let e = dx + dy; const o = Math.floor(th / 2);
  g.fillStyle = c;
  for (let k = 0; k < 4000; k++) { g.fillRect(x0 - o, y0 - o, th, th); if (x0 === x1 && y0 === y1) break; const e2 = 2 * e; if (e2 >= dy) { e += dy; x0 += sx; } if (e2 <= dx) { e += dx; y0 += sy; } }
}
function ho_poly(pts, c) {
  const g = ho_ctx(), cvh = g.canvas.height;
  let ymin = Infinity, ymax = -Infinity; for (const p of pts) { ymin = Math.min(ymin, p[1]); ymax = Math.max(ymax, p[1]); }
  ymin = Math.max(0, Math.ceil(ymin - 0.5)); ymax = Math.min(cvh - 1, Math.floor(ymax - 0.5));
  g.fillStyle = c;
  for (let y = ymin; y <= ymax; y++) {
    const yc = y + 0.5, xs = [];
    for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; if ((a[1] <= yc && b[1] > yc) || (b[1] <= yc && a[1] > yc)) xs.push(a[0] + (yc - a[1]) / (b[1] - a[1]) * (b[0] - a[0])); }
    xs.sort((p, q) => p - q);
    for (let i = 0; i + 1 < xs.length; i += 2) { const x0 = Math.ceil(xs[i] - 0.5), x1 = Math.floor(xs[i + 1] - 0.5); if (x1 >= x0) g.fillRect(x0, y, x1 - x0 + 1, 1); }
  }
}
function ho_dith(x, y, w, h, col, dens) {                              // tramage de Bayer d'une densité donnée
  const g = ho_ctx(); g.fillStyle = col; x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h);
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { const xx = x + i, yy = y + j; if (ho_bay(xx, yy) < dens) g.fillRect(xx, yy, 1, 1); }
}
function ho_ellDith(cx, cy, rx, ry, col, dens) {
  const g = ho_ctx(); g.fillStyle = col; cx = Math.round(cx); cy = Math.round(cy);
  for (let dy = -Math.ceil(ry); dy <= Math.ceil(ry); dy++) { const k = 1 - (dy * dy) / (ry * ry + 0.6); if (k < 0) continue; const hw = Math.floor(rx * Math.sqrt(k) + 0.35);
    for (let dx = -hw; dx <= hw; dx++) if (ho_bay(cx + dx, cy + dy) < dens) g.fillRect(cx + dx, cy + dy, 1, 1); }
}
// lueur additive (rgb = 'r,g,b') : le dégradé est mis en cache (coûteux à calculer), puis posé avec la transparence a
function ho_glow(cx, cy, r, rgb, a, mode = 'lighter') {
  r = Math.max(2, Math.round(r)); const sp = ho_cache('glow:' + r + ':' + rgb, r * 2, r * 2, () => {
    const g = ho_ctx(), gr = g.createRadialGradient(r, r, 1, r, r, r); gr.addColorStop(0, `rgba(${rgb},1)`); gr.addColorStop(0.45, `rgba(${rgb},0.42)`); gr.addColorStop(1, `rgba(${rgb},0)`); g.fillStyle = gr; g.fillRect(0, 0, r * 2, r * 2); });
  const g = ho_ctx(); g.save(); g.globalCompositeOperation = mode; g.globalAlpha = clamp(a); g.drawImage(sp, Math.round(cx - r), Math.round(cy - r)); g.restore();
}
// texte pixel sur le contexte courant (police du moteur, MAJUSCULES) ; renvoie la largeur
function ho_text(s, x, y, col, sc = 1, outline = null, n = Infinity) {
  const g = ho_ctx(); x = Math.round(x); y = Math.round(y);
  const draw = (ox, oy, c) => {
    let cx = x + ox, i = 0; g.fillStyle = c;
    for (const ch of s) {
      if (i++ >= n) break; const gg = gl(ch), top = gg.top || 0;
      for (let r = 0; r < gg.length; r++) for (let q = 0; q < gg[r].length; q++) if (gg[r][q] === '#') g.fillRect(cx + q * sc, y + oy + (r - top) * sc, sc, sc);
      cx += (gg[0].length + 1) * sc;
    }
  };
  if (outline) for (const [ox, oy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [1, 1], [-1, 1], [1, -1], [-1, -1]]) draw(ox, oy, outline);
  draw(0, 0, col);
  return textW(s, sc);
}
const ho_textC = (s, cx, y, col, sc = 1, outline = null, n = Infinity) => ho_text(s, cx - textW(s, sc) / 2, y, col, sc, outline, n);

// canevas hors écran ; ho_draw(w, h, fn) dessine fn() dans un canevas neuf (origine en haut à gauche) et le renvoie
function ho_draw(w, h, fn) {
  const c = mkCanvas(Math.max(1, Math.ceil(w)), Math.max(1, Math.ceil(h))), g = c.getContext('2d'); g.imageSmoothingEnabled = false;
  ho_to(g, fn); return c;
}
const ho_memo = new Map();
function ho_cache(key, w, h, fn) { let e = ho_memo.get(key); if (!e) { e = ho_draw(w, h, fn); ho_memo.set(key, e); } return e; }
// pose un canevas (rotation autour de pivot, échelle, transparence, découpe de la largeur source) sans lissage
function ho_blit(cv, x, y, o = {}) {
  const g = ho_ctx(), px = o.px ?? cv.width / 2, py = o.py ?? cv.height / 2, sw = o.sw ?? 1, sh = o.sh ?? 1;
  if (sw <= 0 || sh <= 0) return;
  g.save(); g.imageSmoothingEnabled = false; g.translate(Math.round(x), Math.round(y)); if (o.rot) g.rotate(o.rot);
  const sx = (o.sx ?? o.s ?? 1) * (o.flip ? -1 : 1), sy = o.sy ?? o.s ?? 1; g.scale(sx, sy); if (o.alpha != null) g.globalAlpha = o.alpha;
  g.drawImage(cv, 0, 0, Math.max(1, Math.round(cv.width * sw)), Math.max(1, Math.round(cv.height * sh)), -px, -py, Math.max(1, Math.round(cv.width * sw)), Math.max(1, Math.round(cv.height * sh)));
  g.restore();
}
// mélange tramé de deux canevas de même taille (k 0 → a, 1 → b) : b apparaît par points de Bayer (12 niveaux, masques mis en cache)
function ho_mix2(a, b, k, x = 0, y = 0) {
  const g = ho_ctx(); g.drawImage(a, x, y);
  if (k <= 0.02) return; if (k >= 0.98) { g.drawImage(b, x, y); return; }
  const lv = Math.max(1, Math.min(11, Math.round(k * 12))), store = b.hoMask || (b.hoMask = {});
  let m = store[lv];
  if (!m) m = store[lv] = ho_draw(b.width, b.height, () => { const c = ho_ctx(), w = b.width, h = b.height; c.drawImage(b, 0, 0); const id = c.getImageData(0, 0, w, h), d = id.data; for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) if (!(ho_bay(i, j) < lv / 12)) d[(j * w + i) * 4 + 3] = 0; c.putImageData(id, 0, 0); });
  g.drawImage(m, x, y);
}

// ════════════════════════════════════════════════════════════════════════════════════════
// 1. L'ENCRE : empreintes de tampon (texte pixel en capitales, cadre, bord irrégulier, grain, éclaboussures)
// ════════════════════════════════════════════════════════════════════════════════════════
const HO_INK = { body: RD[3], edge: RD[2], dark: RD[1], hi: RD[4], gloss: RD[5], blue: BL[2], bluedk: BL[1], black: NI[1] };
// texte → grille de 10 lignes (7 + marques des accents + cédille) : renvoie { w, rows[9][w] }
function ho_bits(s) {
  const rows = Array.from({ length: 10 }, () => []);
  for (const ch of s) {
    const g = gl(ch), top = g.top || 0, gw = g[0].length;
    for (let r = 0; r < 10; r++) { const gr = r - 2 + top; for (let q = 0; q < gw; q++) rows[r].push(gr >= 0 && gr < g.length && g[gr][q] === '#' ? 1 : 0); rows[r].push(0); }
  }
  return { w: rows[0].length - 1, rows };
}
// coupe en deux lignes si le texte dépasse maxW (à l'échelle sc)
function ho_wrap(text, sc, maxW) {
  if (text.indexOf('\n') >= 0) return text.split('\n');
  if (textW(text, sc) <= maxW || text.indexOf(' ') < 0) return [text];
  const words = text.split(' ');
  let best = null;
  for (let i = 1; i < words.length; i++) { const a = words.slice(0, i).join(' '), b = words.slice(i).join(' '), w = Math.max(textW(a, sc), textW(b, sc)); if (!best || w < best.w) best = { w, a, b }; }
  return [best.a, best.b];
}
// sprite d'une empreinte (mis en cache) : { cv, w, h, cx, cy, tilt }
function ho_ink(text, o = {}) {
  const sc = o.ts ?? 3, frame = o.frame ?? 'double', seed = o.seed ?? 3, maxW = o.maxW ?? 232, col = o.col ?? 'red', worn = o.worn ?? 0.5;
  const key = ['ink', text, sc, frame, seed, maxW, col, worn, o.fill ? 1 : 0].join('|');
  let e = ho_memo.get(key); if (e) return e;
  const lines = ho_wrap(text, sc, maxW), bs = lines.map(ho_bits), lh = 7 * sc, gap = Math.round(sc * 1.6);
  const tw = Math.max(...bs.map(b => b.w * sc)), th = lines.length * lh + (lines.length - 1) * gap;
  const pad = frame === 'none' ? 1 : Math.round(sc * 2.2), t1 = Math.max(2, Math.round(sc * 1.3)), gp = Math.max(1, Math.round(sc * 0.7)), t2 = Math.max(1, Math.round(sc * 0.55));
  const fw = frame === 'none' ? 0 : frame === 'double' ? t1 + gp + t2 : frame === 'fill' || o.fill ? 0 : t1;
  let bw = tw + 2 * (pad + fw), bh = th + 2 * (pad + fw); const M = 4, RR = frame === 'disc' ? Math.ceil(Math.hypot(tw, th) / 2) + pad + Math.round(sc * 2.2) : 0;
  if (frame === 'disc') { bw = bh = 2 * RR; }
  const W = bw + 2 * M, Hh = bh + 2 * M, grid = new Uint8Array(W * Hh), at = (x, y) => (x < 0 || y < 0 || x >= W || y >= Hh) ? 0 : grid[y * W + x];
  const set = (x, y, v = 1) => { if (x >= 0 && y >= 0 && x < W && y < Hh) grid[y * W + x] = v; };
  const fillRectG = (x, y, w, h, v = 1) => { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) set(x + i, y + j, v); };
  const ch = 2;                                                       // coins coupés
  const rectFrame = (x, y, w, h, th_) => { fillRectG(x, y, w, h, 1); fillRectG(x + th_, y + th_, w - 2 * th_, h - 2 * th_, 0); for (const [cx_, cy_] of [[x, y], [x + w - 1, y], [x, y + h - 1], [x + w - 1, y + h - 1]]) for (let j = 0; j < ch; j++) for (let i = 0; i < ch - j; i++) set(cx_ + (cx_ === x ? i : -i), cy_ + (cy_ === y ? j : -j), 0); };
  if (frame === 'fill' || o.fill) { fillRectG(M, M, bw, bh, 1); for (const [cx_, cy_] of [[M, M], [M + bw - 1, M], [M, M + bh - 1], [M + bw - 1, M + bh - 1]]) for (let j = 0; j < ch; j++) for (let i = 0; i < ch - j; i++) set(cx_ + (cx_ === M ? i : -i), cy_ + (cy_ === M ? j : -j), 0); }
  else if (frame === 'double') { rectFrame(M, M, bw, bh, t1); rectFrame(M + t1 + gp, M + t1 + gp, bw - 2 * (t1 + gp), bh - 2 * (t1 + gp), t2); }
  else if (frame === 'rect') rectFrame(M, M, bw, bh, t1);
  else if (frame === 'disc') { for (let j = 0; j < Hh; j++) for (let i = 0; i < W; i++) { const d = Math.hypot(i + 0.5 - W / 2, j + 0.5 - Hh / 2); if ((d <= RR && d > RR - t1) || (d <= RR - t1 - gp && d > RR - t1 - gp - t2)) set(i, j, 1); } }
  // texte (en creux si fill)
  const tv = (frame === 'fill' || o.fill) ? 0 : 1;
  lines.forEach((ln, i) => {
    const b = bs[i], x0 = M + Math.round((bw - tw) / 2) + Math.round((tw - b.w * sc) / 2), y0 = M + Math.round((bh - th) / 2) + i * (lh + gap) - 2 * sc;
    for (let r = 0; r < 10; r++) for (let q = 0; q < b.w; q++) if (b.rows[r][q]) fillRectG(x0 + q * sc, y0 + r * sc, sc, sc, tv);
  });
  // grain d'encre usée : zones claires lisses + bord rongé / bavé
  const ink = grid.slice(), wn = Math.max(0, worn);
  for (let y = 0; y < Hh; y++) for (let x = 0; x < W; x++) {
    if (!ink[y * W + x]) continue;
    const n1 = ho_n2(x / 5.5, y / 5.5, seed + 5), n2 = ho_n2(x / 2.2, y / 2.2, seed + 9);
    let d = 1 - wn * (0.7 * ho_ss(0.58, 0.86, n1) + 0.2 * ho_ss(0.6, 1, n2));
    if (ho_h2(x, y, seed) > d + 0.1) grid[y * W + x] = 0;
  }
  const g2 = grid.slice();
  for (let y = 1; y < Hh - 1; y++) for (let x = 1; x < W - 1; x++) {
    const v = g2[y * W + x], nb = g2[y * W + x - 1] + g2[y * W + x + 1] + g2[(y - 1) * W + x] + g2[(y + 1) * W + x];
    if (v && nb < 4 && ho_h2(x, y, seed + 21) < 0.14 * wn) grid[y * W + x] = 0;
    else if (!v && nb >= 1 && ink[y * W + x] === 0 && ho_h2(x, y, seed + 33) < 0.06 * wn && nb <= 2) grid[y * W + x] = 1;
  }
  const C = col === 'blue' ? { body: HO_INK.blue, edge: HO_INK.bluedk, hi: BL[3] } : col === 'black' ? { body: HO_INK.black, edge: NI[0], hi: NI[3] } : { body: HO_INK.body, edge: HO_INK.edge, hi: HO_INK.hi };
  const cv = ho_draw(W, Hh, () => {
    const g = ho_ctx();
    for (let y = 0; y < Hh; y++) for (let x = 0; x < W; x++) {
      if (!grid[y * W + x]) continue;
      const nb = at(x - 1, y) + at(x + 1, y) + at(x, y - 1) + at(x, y + 1), n3 = ho_n2(x / 3, y / 3, seed + 17);
      let c = C.body;
      if (nb < 4 && ho_h2(x, y, seed + 4) < 0.42) c = C.edge; else if (n3 > 0.72 && nb === 4) c = C.edge; else if (n3 < 0.2 && nb === 4 && ho_h2(x, y, seed + 6) < 0.5) c = C.hi;
      g.fillStyle = c; g.fillRect(x, y, 1, 1);
    }
  });
  const gloss = ho_draw(W, Hh, () => { const g = ho_ctx(); g.fillStyle = HO_INK.gloss; for (let y = 0; y < Hh; y++) for (let x = 0; x < W; x++) { if (!grid[y * W + x] || !(at(x, y - 1) && at(x - 1, y))) continue; const band = ((x + y * 0.6) % 13); if (band < 2.2 || ho_h2(x, y, seed + 40) < 0.05) g.fillRect(x, y, 1, 1); } });
  e = { cv, gloss, w: bw, h: bh, W, H: Hh, cx: W / 2, cy: Hh / 2, tilt: (ho_h(seed, 77) - 0.5) * 0.2 - 0.04, grid, M };
  ho_memo.set(key, e); return e;
}
// gouttelettes d'encre projetées autour d'une empreinte de boîte w × h : renvoie [{dx, dy, r, c}] (positions finales, repère de l'empreinte non tournée)
function ho_drops(w, h, n, seed) {
  const out = [];
  for (let k = 0; k < n; k++) {
    const a = ho_h(k, seed) * TAU, hw = w / 2, hh = h / 2, ex = Math.cos(a), ey = Math.sin(a), k0 = 1 / Math.max(Math.abs(ex) / hw, Math.abs(ey) / hh), d = k0 + 4 + ho_h(k, seed + 1) * (14 + ho_h(k, seed + 7) * 22);
    out.push({ dx: ex * d, dy: ey * d, r: ho_h(k, seed + 2) < 0.28 ? 2 : 1, c: ho_h(k, seed + 3) < 0.3 ? HO_INK.edge : HO_INK.body, a, d });
  }
  return out;
}
function ho_drawDrops(cx, cy, s, rot, drops, k, persp = 1) {                // k 0..1 : progression (les gouttes partent du bord et retombent)
  const cr = Math.cos(rot), sr = Math.sin(rot);
  for (const d of drops) {
    const f = eo(clamp(k)), dist = f, x = d.dx * dist * s, y = d.dy * dist * s * persp - Math.sin(f * Math.PI) * 5 * s * (1 - f * 0.2) * (k < 1 ? 1 : 0);
    const X_ = cx + x * cr - y * sr, Y_ = cy + x * sr + y * cr; if (k < 0.25 && d.r === 1 && ho_h(d.a * 100 | 0, 5) < 0.4) continue;
    if (d.r === 2) { ho_R(X_ - 1, Y_ - 1, 2, 2, d.c); if (k >= 1) ho_P(X_ - 1, Y_ + 1, d.c); } else ho_P(X_, Y_, d.c);
  }
}
// trait de barre (rouge) : sprite { cv, w, h }
function ho_strike(w, th, seed, col) {
  const key = ['strike', Math.round(w), th, seed, col || 'r'].join('|'); let e = ho_memo.get(key); if (e) return e;
  const W = Math.round(w) + 12, H = th + 8;
  const cv = ho_draw(W, H, () => {
    const g = ho_ctx();
    for (let x = 0; x < W; x++) {
      const k = x / (W - 1), wob = Math.sin(k * 5 + seed) * 1.3 + (ho_n1(x / 4, seed) - 0.5) * 2, taper = Math.min(1, x / 5, (W - 1 - x) / 5), hh = th * (0.55 + 0.45 * taper);
      for (let y = 0; y < H; y++) {
        const dy = y - H / 2 - wob; if (Math.abs(dy) > hh / 2) continue;
        const edge = Math.abs(dy) > hh / 2 - 1.1, rough = ho_h2(x, y, seed) < (edge ? 0.5 : 0.04), dry = ho_n2(x / 6, y / 3, seed + 3) > 0.74 && ho_h2(x, y, seed + 4) < 0.5;
        if (rough || dry) continue; g.fillStyle = edge || ho_h2(x, y, seed + 5) < 0.22 ? HO_INK.edge : HO_INK.body; g.fillRect(x, y, 1, 1);
      }
    }
  });
  e = { cv, w: W, h: H }; ho_memo.set(key, e); return e;
}

// ── l'empreinte seule : ho_empreinte(cx, cy, s, texte, o) ; (cx, cy) = centre ; s = échelle (1 : texte de 21 px de haut, « VENDUE » ≈ 130 × 47 px) ; renvoie { w, h, box }
function ho_empreinte(cx, cy, s, texte, o = {}) {
  o = o || {}; s = ho_fin(s, 1);
  const sp = ho_ink(texte, o), rot = o.rot ?? sp.tilt, persp = o.persp ?? 1, alpha = o.alpha ?? 1;
  if (alpha <= 0) return { w: sp.w * s, h: sp.h * s * persp, box: [cx, cy, 0, 0] };
  const pop = o.pop ?? 1;                                              // 0..1 : l'encre vient d'être posée (échelle 1,1 → 1)
  const k = s * (1 + 0.1 * (1 - eo(clamp(pop))));
  if (o.splat !== 0 && (o.splat ?? 1) > 0) ho_drawDrops(cx, cy, s, rot, ho_drops(sp.w, sp.h, o.drops ?? 12, (o.seed ?? 3) + 50), 1, persp);
  ho_blit(sp.cv, cx, cy, { rot, sx: k, sy: k * persp, alpha: alpha < 1 ? alpha : null });
  if ((o.wet ?? 0) > 0) ho_blit(sp.gloss, cx, cy, { rot, sx: k, sy: k * persp, alpha: clamp(o.wet) * 0.45 });
  if (o.barre) {
    const bp = o.barre === true ? 1 : clamp(o.barre), sw = sp.w * 1.18, th = Math.max(4, Math.round(5 * s)), st = ho_strike(sw / 1, th, o.seed ?? 3, o.col), ang = rot + (o.barreRot ?? 0.07);
    const e = eio(bp); ho_blit(st.cv, cx, cy + (o.barreDy ?? 2) * s, { rot: ang, sx: s, sy: s * persp, sw: Math.max(0.02, e) , px: st.w / 2 });
  }
  return { w: sp.w * s, h: sp.h * s * persp, box: [cx - sp.w * s / 2, cy - sp.h * s * persp / 2, sp.w * s, sp.h * s * persp], rot };
}

// ════════════════════════════════════════════════════════════════════════════════════════
// 2. LE TAMPON : poignée de bois, coup, écrasement, rebond, éclaboussure, empreinte ; deux points de vue
// ════════════════════════════════════════════════════════════════════════════════════════
// hauteur h(τ) du tampon au-dessus de la surface (0 = contact ; > 0 = loin ; < 0 = enfoncé) et visibilité
function ho_stampH(tau, o) {
  const F = o.fall ?? 0.4, W = o.wind ?? 0.16, H = o.hold ?? 0.16, Lf = o.lift ?? 0.28, stay = !!o.stay;
  let h, vis = 1, phase = 'in';
  if (tau < -(F + W)) return { h: 1.0, vis: 0, phase: 'wait' };
  if (tau < -F) { const p = (tau + F + W) / W; h = 1.0 + 0.3 * eo(p); vis = ho_ss(0, 0.5, p); phase = 'wind'; }
  else if (tau < 0) { const p = (tau + F) / F; h = 1.3 * (1 - ei(p)); phase = 'fall'; }
  else if (tau < H || stay) {
    phase = 'press';
    h = -0.1 * Math.exp(-11 * tau) * Math.cos(30 * tau - 0.6) - (tau < H ? 0.012 : 0);
  } else {
    const p = (tau - H) / Lf; phase = 'lift';
    if (p >= 1) return { h: 2.4, vis: 0, phase: 'gone' };
    h = -0.012 + 2.4 * ei(p) * (0.4 + 0.6 * p); vis = 1 - ho_ss(0.55, 1, p);
  }
  return { h, vis, phase };
}
// décroissance 0..1 du choc à partir de t0 (pour que le plan fasse trembler l'image) : ho_hit(t, t0) → 1 à l'impact, 0 après ~0,45 s
function ho_hit(t, t0, dur = 0.45) { const u = t - t0; return u < 0 || u > dur ? 0 : Math.pow(1 - u / dur, 2) * (0.6 + 0.4 * Math.cos(u * 70)); }

// corps du tampon vu DE DERRIÈRE (point de vue de la main) : bloc de bois, bague de laiton, bouton tourné ; W × H = taille de l'empreinte
function ho_bodyPov(cx, cy, W, H, sc, rot, hgt, o = {}) {
  const g = ho_ctx(), w = (W + 14) * sc, h = (H + 14) * sc, r = Math.max(3, 5 * sc), vis = o.vis ?? 1;
  if (o.base && hgt > 0.04) {                                                      // flancs du bloc : tronc de pyramide entre l'empreinte (sur la surface) et la face dessus (près de l'œil)
    for (let k = 1; k <= 5; k++) {
      const f = k / 6, bxk = lerp(o.base[0], cx, f), byk = lerp(o.base[1], cy, f), sck = lerp(o.bscale, sc, f), ww = (W + 14) * sck, hh2 = (H + 14) * sck;
      g.save(); g.translate(Math.round(bxk), Math.round(byk)); g.rotate(rot); g.fillStyle = k % 2 ? WO[0] : WO[1]; g.beginPath(); g.roundRect(-Math.round(ww / 2), -Math.round(hh2 / 2), Math.round(ww), Math.round(hh2), r); g.fill();
      if (k === 5) { g.strokeStyle = ho_K; g.lineWidth = 1; g.stroke(); } g.restore();
    }
  }
  g.save(); g.translate(Math.round(cx), Math.round(cy)); g.rotate(rot);
  // ombre portée sur la surface (se rapproche quand le tampon descend)
  const sh = clamp(1 - hgt * 0.5), off = (3 + 10 * clamp(hgt)) * sc;
  g.fillStyle = `rgba(5,4,15,${0.38 * sh})`; g.beginPath(); g.roundRect(-w / 2 + off, -h / 2 + off * 1.15, w, h, r); g.fill();
  const wd = (hh) => { // bloc : liseré clair en haut à gauche, sombre en bas à droite
    const x0 = Math.round(-w / 2), y0 = Math.round(-h / 2), ww = Math.round(w), hh2 = Math.round(h);
    g.fillStyle = ho_K; g.beginPath(); g.roundRect(x0 - 1, y0 - 1, ww + 2, hh2 + 2, r + 1); g.fill();
    g.fillStyle = WO[1]; g.beginPath(); g.roundRect(x0, y0, ww, hh2, r); g.fill();
    g.fillStyle = WO[3]; g.beginPath(); g.roundRect(x0 + 2, y0 + 2, ww - 4, hh2 - 4, Math.max(1, r - 2)); g.fill();
    g.fillStyle = WO[4]; g.beginPath(); g.roundRect(x0 + 2, y0 + 2, ww - 7, hh2 - 7, Math.max(1, r - 2)); g.fill();
    g.fillStyle = WO[5]; g.fillRect(x0 + r, y0 + 2, ww - 2 * r - 6, 1); g.fillRect(x0 + 2, y0 + r, 1, hh2 - 2 * r - 6);
    // fil du bois
    for (let i = 0; i < 9; i++) { const yy = y0 + 5 + Math.round(ho_h(i, 3) * (hh2 - 12)), xx = x0 + 5 + Math.round(ho_h(i, 4) * (ww * 0.4)), ll = 8 + Math.round(ho_h(i, 5) * ww * 0.35); g.fillStyle = i % 3 ? WO[3] : WO[5]; g.fillRect(xx, yy, ll, 1); }
  };
  wd();
  // bague de laiton + bouton (plus proche de l'œil : plus gros)
  const rk = Math.min(w, h) * 0.27 * (1 + 0.4 * clamp(hgt)), kc = [0, 0];
  { g.save(); g.beginPath(); g.roundRect(Math.round(-w / 2) + 2, Math.round(-h / 2) + 2, Math.round(w) - 4, Math.round(h) - 4, Math.max(1, r - 2)); g.clip(); g.fillStyle = 'rgba(5,4,15,0.38)'; g.beginPath(); g.ellipse(rk * 0.35, rk * 0.45, rk * 1.45, rk * 1.4, 0, 0, TAU); g.fill(); g.restore(); }
  g.fillStyle = ho_K; g.beginPath(); g.arc(kc[0], kc[1], rk * 1.28 + 1, 0, TAU); g.fill();
  g.fillStyle = YE[0]; g.beginPath(); g.arc(kc[0], kc[1], rk * 1.28, 0, TAU); g.fill();
  g.fillStyle = YE[1]; g.beginPath(); g.arc(kc[0] - 1, kc[1] - 1, rk * 1.2, 0, TAU); g.fill();
  g.fillStyle = YE[2]; g.beginPath(); g.arc(kc[0] - 1.5, kc[1] - 1.5, rk * 1.1, 0, TAU); g.fill();
  g.fillStyle = YE[0]; g.beginPath(); g.arc(kc[0], kc[1], rk * 1.02, 0, TAU); g.fill();
  const disc_ = (dx, dy, rr, c) => { g.fillStyle = c; g.beginPath(); g.arc(kc[0] + dx * rk, kc[1] + dy * rk, rr * rk, 0, TAU); g.fill(); };
  disc_(0, 0, 1, ho_K); disc_(0.02, 0.02, 0.96, WO[0]); disc_(0, 0, 0.9, WO[2]); disc_(-0.1, -0.1, 0.78, WO[3]); disc_(-0.2, -0.2, 0.58, WO[4]); disc_(-0.3, -0.3, 0.34, WO[5]); disc_(-0.4, -0.42, 0.14, WO[6]);
  g.strokeStyle = WO[1]; g.lineWidth = 1; g.beginPath(); g.arc(kc[0], kc[1], rk * 0.7, 0.2, 2.4); g.stroke();       // sillon du tour
  g.restore();
}
// corps du tampon vu DE PROFIL (3/4) : bouton de bois, col, bague de laiton, bloc ; (cx, yb) = milieu du bas du bloc ; sqx, sqy = écrasement
function ho_bodySide(cx, yb, W, sc, rot, sqx, sqy, o = {}) {
  const g = ho_ctx(), w = (W + 8) * sc, bh = 19 * sc, nh = 14 * sc, kd = 34 * sc;
  g.save(); g.translate(Math.round(cx), Math.round(yb)); g.rotate(rot); g.scale(sqx, sqy);
  const R_ = (x, y, ww, hh, c) => { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), Math.round(ww), Math.round(hh)); };
  // bloc
  R_(-w / 2 - 1, -bh - 1, w + 2, bh + 2, ho_K); R_(-w / 2, -bh, w, bh, WO[2]); R_(-w / 2, -bh, w, 2, WO[5]); R_(-w / 2, -bh + 2, w, 2, WO[4]); R_(-w / 2, -3, w, 3, WO[1]); R_(w / 2 - 3, -bh, 3, bh, WO[1]); R_(-w / 2, -bh, 2, bh, WO[4]);
  for (let i = 0; i < 6; i++) R_(-w / 2 + 4 + Math.round(ho_h(i, 8) * (w - 20)), -bh + 5 + Math.round(ho_h(i, 9) * (bh - 10)), 6 + Math.round(ho_h(i, 10) * 18), 1, i % 2 ? WO[3] : WO[5]);
  R_(-w / 2 + 2, -2, w - 4, 2, HO_INK.edge);                                                                        // encre sur la gomme
  R_(-w / 2 + 2, -1, w - 4, 1, HO_INK.body);
  // bague de laiton
  const rw = 30 * sc; R_(-rw / 2 - 1, -bh - 5 * sc - 1, rw + 2, 5 * sc + 2, ho_K); R_(-rw / 2, -bh - 5 * sc, rw, 5 * sc, YE[1]); R_(-rw / 2, -bh - 5 * sc, rw, 1, YE[3]); R_(-rw / 2, -bh - 1, rw, 1, YE[0]); R_(rw / 2 - 2, -bh - 5 * sc, 2, 5 * sc, YE[0]);
  // col tourné
  const y1 = -bh - 5 * sc, nw = 15 * sc; R_(-nw / 2 - 1, y1 - nh - 1, nw + 2, nh + 2, ho_K); R_(-nw / 2, y1 - nh, nw, nh, WO[3]); R_(-nw / 2, y1 - nh, 2, nh, WO[5]); R_(nw / 2 - 3, y1 - nh, 3, nh, WO[1]);
  R_(-nw / 2 - 2, y1 - nh * 0.55, nw + 4, 2 * sc, WO[2]); R_(-nw / 2 - 2, y1 - nh * 0.55, nw + 4, 1, WO[5]);
  // bouton
  const ky = y1 - nh - kd * 0.5 + 2; g.fillStyle = ho_K; g.beginPath(); g.ellipse(0, ky, kd / 2 + 1, kd * 0.5 + 1, 0, 0, TAU); g.fill();
  const el = (dx, dy, rx, ry, c) => { g.fillStyle = c; g.beginPath(); g.ellipse(dx, ky + dy, rx, ry, 0, 0, TAU); g.fill(); };
  el(0, 0, kd / 2, kd * 0.5, WO[1]); el(-1, -1, kd / 2 - 2, kd * 0.5 - 2, WO[2]); el(-2, -2, kd * 0.4, kd * 0.4, WO[3]); el(-3, -4, kd * 0.28, kd * 0.28, WO[4]); el(-5, -6, kd * 0.14, kd * 0.12, WO[5]); el(-6, -8, kd * 0.06, kd * 0.05, WO[6]);
  g.restore();
}
// tampon qui s'abat à l'instant t0 puis laisse son empreinte.
//   (cx, cy) = centre de l'empreinte ; s = échelle (1 : « VENDUE » ≈ 130 × 47 px) ; t = temps du film ; t0 = instant du contact ; o.texte (« VENDUE »)
//   o.view 'pov' (défaut : vu de derrière la main, il vient vers la surface depuis la caméra puis repart vers elle) | 'side' (de profil, tombe d'en haut sur un papier posé : o.persp 0,45 écrase l'empreinte)
//   o.fall 0,4 durée de la descente · o.wind 0,16 recul avant (anticipation) · o.hold 0,16 temps appuyé · o.lift 0,28 durée du retrait · o.stay (reste appuyé : ne repart pas) · o.imprint false (n'imprime pas)
//   o.rot inclinaison de l'empreinte (rad) · o.frame, o.col, o.seed, o.worn comme ho_empreinte · o.splat 1 (éclaboussure : 0 = aucune) · o.barre (0..1 : empreinte barrée d'un trait) · o.persp (écrasement vertical de l'empreinte)
//   renvoie { phase, h, hit (choc 0..1 pour faire trembler l'image), box, printed (bool) }
function ho_tampon(cx, cy, s, t, t0, o = {}) {
  o = o || {}; s = ho_fin(s, 1);
  const texte = o.texte ?? 'VENDUE', tau = t - t0, view = o.view ?? 'pov';
  const sp = ho_ink(texte, o), rot = o.rot ?? sp.tilt, persp = view === 'side' ? (o.persp ?? 0.46) : (o.persp ?? 1);
  const ph = ho_stampH(tau, o), printed = tau >= 0 && o.imprint !== false;
  if (printed) {
    const wet = clamp(1 - (tau - 0.02) / 0.7), pop = clamp(tau / 0.25);
    // l'éclaboussure part du bord à l'impact, puis les gouttes restent
    ho_empreinteDraw(cx, cy, s, sp, rot, persp, o, wet, pop, tau);
  }
  if (tau >= 0 && tau < 0.3 && o.imprint !== false) {                                   // éclair d'impact et anneau d'encre qui déborde du bloc
    const g = ho_ctx(), kk = 1 - tau / 0.3, ex = 3 + 12 * eo(clamp(tau / 0.14)), bw = sp.w * s + 14 * s + ex * 2, bh = sp.h * s * persp + 14 * s * persp + ex * 2;
    g.save(); g.translate(Math.round(cx), Math.round(cy)); g.rotate(rot); g.strokeStyle = HO_INK.body; g.globalAlpha = Math.min(1, kk * 1.4); g.lineWidth = Math.max(1, 3 * kk * s); g.beginPath(); g.roundRect(-bw / 2, -bh / 2, bw, bh, 6); g.stroke(); g.restore();
    if (tau < 0.07) ho_glow(cx, cy, Math.max(bw, bh) * 0.7 + 20, '255,214,160', 0.7 * (1 - tau / 0.07));
  }
  const hit = ho_hit(t, t0);
  if (ph.vis > 0 && ph.phase !== 'gone') {
    const lifting = ph.phase === 'lift';
    if (view === 'side') {
      const hh = Math.max(ph.h, -0.2), yb = cy + sp.h * s * persp * 0.5 - hh * 130 * s, sqx = 1 + (hh < 0 ? -hh * 0.6 : 0), sqy = 1 - (hh < 0 ? -hh * 2.2 : 0), tilt = rot * 0.4 * clamp(hh);
      const ghost = (ph.phase === 'fall' && tau > -0.12) ? 2 : 0;
      for (let i = ghost; i >= 1; i--) { ho_ctx().save(); ho_ctx().globalAlpha = 0.28 / i; ho_bodySide(cx, yb - i * 11 * s * clamp(hh), sp.w, s, tilt, sqx, sqy, o); ho_ctx().restore(); }
      if (ph.vis >= 1 || ho_bay(Math.round(cx), Math.round(cy)) < ph.vis) ho_bodySide(cx, yb, sp.w, s, tilt, sqx, sqy, o); else { ho_ctx().save(); ho_ctx().globalAlpha = ph.vis; ho_bodySide(cx, yb, sp.w, s, tilt, sqx, sqy, o); ho_ctx().restore(); }
    } else {
      const hh = ph.h, scl = (1 + 0.85 * hh) * s, dy = (lifting ? -105 : -24) * s * Math.max(0, hh), dx = (lifting ? 18 : 6) * s * Math.max(0, hh), tr = rot + (lifting ? -0.2 : 0.1) * Math.max(0, hh);
      const ghost = (ph.phase === 'fall' && tau > -0.14) ? 2 : 0;
      for (let i = ghost; i >= 1; i--) { ho_ctx().save(); ho_ctx().globalAlpha = 0.25 / i; ho_bodyPov(cx + dx, cy + dy - i * 8 * s, sp.w, sp.h, scl * (1 + 0.08 * i), tr, hh, o); ho_ctx().restore(); }
      ho_ctx().save(); if (ph.vis < 1) ho_ctx().globalAlpha = ph.vis; ho_bodyPov(cx + dx, cy + dy, sp.w, sp.h, scl, tr, hh, { ...o, base: [cx, cy], bscale: s }); ho_ctx().restore();
    }
  }
  return { phase: ph.phase, h: ph.h, hit, printed, tau, box: [cx - sp.w * s / 2, cy - sp.h * s * persp / 2, sp.w * s, sp.h * s * persp] };
}
function ho_empreinteDraw(cx, cy, s, sp, rot, persp, o, wet, pop, tau) {
  const seed = o.seed ?? 3;
  if ((o.splat ?? 1) > 0) ho_drawDrops(cx, cy, s * (o.splat ?? 1), rot, ho_drops(sp.w, sp.h, 14, seed + 50), clamp(tau / 0.13), persp);
  const k = s * (1 + 0.12 * (1 - eo(clamp(pop))));
  ho_blit(sp.cv, cx, cy, { rot, sx: k, sy: k * persp });
  if (wet > 0) ho_blit(sp.gloss, cx, cy, { rot, sx: k, sy: k * persp, alpha: wet * 0.45 });
  if (o.barre) { const bp = o.barre === true ? 1 : clamp(o.barre), st = ho_strike(sp.w * 1.18, Math.max(4, Math.round(5 * s)), seed, o.col); ho_blit(st.cv, cx, cy + 2 * s, { rot: rot + 0.07, sx: s, sy: s * persp, sw: Math.max(0.02, eio(bp)), px: st.w / 2 }); }
}

// ════════════════════════════════════════════════════════════════════════════════════════
// 3. PAPIERS : pose (rotation, ondulation), lignes de texte, sceau de cire, signature, document, contrat, enveloppe, affiche
// ════════════════════════════════════════════════════════════════════════════════════════
const ho_pool = [];
function ho_tmp(w, h) {                                             // canevas de travail réutilisable (vidé) ; à rendre avec ho_free
  w = Math.ceil(w); h = Math.ceil(h);
  for (const e of ho_pool) if (!e.used && e.c.width === w && e.c.height === h) { e.used = true; e.g.setTransform(1, 0, 0, 1, 0, 0); e.g.globalAlpha = 1; e.g.globalCompositeOperation = 'source-over'; e.g.clearRect(0, 0, w, h); return e; }
  const c = mkCanvas(w, h), g = c.getContext('2d'); g.imageSmoothingEnabled = false; const e = { c, g, used: true }; ho_pool.push(e); if (ho_pool.length > 40) ho_pool.shift(); return e;
}
const ho_free = e => { e.used = false; };
// dessine fn(ox, oy) avec le coin haut gauche (w × h) à (cx − w/2, cy − h/2) ; si o.rot / o.wave / o.alpha / o.s : passe par un canevas puis le pose tourné
function ho_placed(cx, cy, w, h, o, fn) {
  const rot = o.rot || 0, wave = o.wave || 0, al = o.alpha ?? 1, sc = o.s ?? 1;
  if (!rot && !wave && al >= 1 && sc === 1 && !o.vis) { fn(Math.round(cx - w / 2), Math.round(cy - h / 2)); return; }
  const pad = 12 + Math.ceil(Math.abs(wave) * 2), e = ho_tmp(w + 2 * pad, h + 2 * pad);
  ho_to(e.g, () => fn(pad, pad));
  if (wave) {                                                       // le papier ondule : colonnes décalées en hauteur, plus fort vers le bord libre
    const t = o.waveT ?? 0, g = ho_ctx(); g.save(); g.imageSmoothingEnabled = false; g.translate(Math.round(cx), Math.round(cy)); if (rot) g.rotate(rot); g.scale(sc, sc); if (al < 1) g.globalAlpha = al;
    for (let i = 0; i < w + 2 * pad; i++) { const f = (i - pad) / w, dy = Math.round(Math.sin(f * 7 - t * 9) * wave * clamp(0.25 + f)); g.drawImage(e.c, i, 0, 1, e.c.height, i - w / 2 - pad, -h / 2 - pad + dy, 1, e.c.height); }
    g.restore();
  } else ho_blit(e.c, cx, cy, { rot, s: sc, alpha: al < 1 ? al : null });
  ho_free(e);
}
// lignes de faux texte : n lignes à partir de (x, y), largeur w, interligne step ; prog 0..1 = part visible (écriture qui avance) ; la dernière ligne est plus courte
function ho_lines(x, y, w, n, step, col, seed, prog = 1, o = {}) {
  const tot = n; let shown = prog * tot;
  for (let i = 0; i < n; i++) {
    const lf = clamp(shown - i); if (lf <= 0) break;
    const lim = (i === n - 1 && !o.full ? w * (0.4 + 0.3 * ho_h(i, seed)) : w) * lf, ind = i === 0 && o.indent !== 0 ? (o.indent ?? 6) : 0;
    let cx_ = ind; const yy = y + i * step;
    while (cx_ < lim) { const wl = 3 + Math.floor(ho_h(i * 31 + Math.floor(cx_), seed) * 7), ww = Math.min(wl, lim - cx_); if (ww >= 1) ho_R(x + cx_, yy, ww, 1, col); cx_ += wl + 2; }
  }
}
// sceau de cire rouge (pop 0..1 : s'écrase puis se fige) ; (cx, cy) = centre ; r = rayon
function ho_wax(cx, cy, r, pop = 1, o = {}) {
  if (pop <= 0) return; const k = eob(clamp(pop)), rr = Math.max(2, Math.round(r * k)), seed = o.seed ?? 3;
  const col = o.col ?? [RD[0], RD[1], RD[2], RD[3], RD[4], RD[5]];
  if (o.ribbon) { ho_poly([[cx - 3, cy + 1], [cx - 6, cy + rr + 6], [cx - 4, cy + rr + 4], [cx - 1, cy + rr + 6], [cx + 1, cy + 1]], BL[2]); ho_poly([[cx + 3, cy + 1], [cx + 6, cy + rr + 6], [cx + 4, cy + rr + 4], [cx + 1, cy + rr + 6], [cx - 1, cy + 1]], RD[3]); }
  // flaque irrégulière : disque + bosses
  const pts = []; for (let i = 0; i < 14; i++) { const a = i / 14 * TAU, rad = rr * (1 + (ho_h(i, seed) - 0.5) * 0.28); pts.push([cx + Math.cos(a) * rad, cy + Math.sin(a) * rad]); }
  ho_poly(pts.map(p => [cx + (p[0] - cx) * 1.12, cy + (p[1] - cy) * 1.12]), ho_K);
  ho_poly(pts, col[1]); ho_poly(pts.map(p => [cx + (p[0] - cx) * 0.9 - 0.5, cy + (p[1] - cy) * 0.9 - 0.5]), col[2]);
  ho_disc(cx, cy, Math.max(1, Math.round(rr * 0.66)), col[1]); ho_disc(cx - 0.5, cy - 0.5, Math.max(1, Math.round(rr * 0.58)), col[3]);
  if (rr >= 4) { ho_disc(cx, cy, Math.max(1, Math.round(rr * 0.36)), col[2]); ho_P(cx, cy - 1, col[3]); ho_P(cx - 1, cy, col[3]); ho_P(cx + 1, cy, col[3]); ho_P(cx, cy + 1, col[3]); }
  ho_P(cx - Math.round(rr * 0.5), cy - Math.round(rr * 0.55), col[5]); ho_P(cx - Math.round(rr * 0.35), cy - Math.round(rr * 0.65), col[4]);
}
// signature (écriture qui avance) : (x, y) coin haut gauche d'une boîte de ≈ 26 × 12 ; p 0..1 ; kind 0 = élégante (Lustig), 1 = lourde (Poisson)
const HO_SIG = [
  [[0, 8], [2, 3], [4, 0], [5, 4], [4, 9], [7, 3], [9, 6], [10, 2], [12, 7], [15, 3], [16, 7], [19, 4], [21, 6], [25, 5], [30, 4]],
  [[0, 7], [1, 2], [3, 7], [5, 2], [6, 8], [9, 4], [10, 8], [12, 3], [14, 8], [17, 5], [19, 8], [22, 4], [23, 8], [26, 6]],
];
function ho_sign(x, y, p, kind = 0, col = NI[2], sc = 1) {
  const pts = HO_SIG[kind % 2]; if (p <= 0) return;
  let tot = 0; for (let i = 1; i < pts.length; i++) tot += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  let d = clamp(p) * tot;
  for (let i = 1; i < pts.length && d > 0; i++) {
    const a = pts[i - 1], b = pts[i], l = Math.hypot(b[0] - a[0], b[1] - a[1]), f = Math.min(1, d / l);
    ho_line(x + a[0] * sc, y + a[1] * sc, x + (a[0] + (b[0] - a[0]) * f) * sc, y + (a[1] + (b[1] - a[1]) * f) * sc, col, 1); d -= l;
  }
  if (p > 0.92) ho_line(x + 2 * sc, y + 11 * sc, x + 28 * sc, y + 9 * sc, col, 1);
}
// papier de base : rectangle crème biseauté, ombre, contour ; (x, y) coin haut gauche
function ho_paperBase(x, y, w, h, o = {}) {
  const pc = o.paper ?? WH[2], pl = o.paperHi ?? WH[3], pd = o.paperLo ?? WH[0];
  if (o.shadow !== 0) { ho_dith(x + 2, y + h, w, 3, ho_K, 0.55); ho_dith(x + w, y + 2, 3, h, ho_K, 0.55); ho_R(x + 2, y + h, w, 1, 'rgba(5,4,15,0.5)'); }
  if (o.outline !== false) ho_R(x - 1, y - 1, w + 2, h + 2, ho_K);
  ho_R(x, y, w, h, pc); ho_R(x, y, w, 1, pl); ho_R(x, y, 1, h, pl); ho_R(x + w - 1, y + 1, 1, h - 1, pd); ho_R(x + 1, y + h - 1, w - 1, 1, pd);
  if (o.stain) { const r = rng(o.seed ?? 5); for (let i = 0; i < 5; i++) ho_dith(x + 3 + r() * (w - 8), y + 3 + r() * (h - 8), 3 + r() * 5, 2 + r() * 4, WH[0], 0.35); }
}
// coin plié (dog-ear) en bas à droite
function ho_dogear(x, y, w, h, k = 6) { ho_poly([[x + w - k, y + h], [x + w, y + h - k], [x + w, y + h]], ho_K); ho_poly([[x + w - k + 1, y + h - 1], [x + w - 1, y + h - k + 1], [x + w - k + 1, y + h - k + 1]], WH[0]); ho_line(x + w - k, y + h - 1, x + w - 1, y + h - k, ho_K, 1); }

// ── ho_document(x, y, w, h, t, o) : papier à en-tête officiel. (x, y) = coin haut gauche (la rotation o.rot se fait autour du centre) ; t = temps (ondulation)
//    o.head 'MINISTERE' (texte du bandeau ; null : bandeau sans texte) · o.sub (sous-titre en petit, ex. 'DES POSTES ET TELEGRAPHES') · o.title (titre en capitales sous le bandeau) · o.lines (nombre de lignes de texte, auto)
//    o.write 0..1 (le texte s'écrit / se tape, ligne après ligne) · o.seal 0..1 (sceau de cire rouge à ruban, bas gauche : apparaît en s'écrasant) · o.sign 0..1 (signature qui se trace, bas droite ; o.signKind 0 | 1)
//    o.stamp 0..1 (tampon appliqué : 0 absent, > 0 présent, l'encre se pose pendant les 0,25 premiers) · o.stampText 'OFFICIEL' · o.stampAt [fx, fy] (fractions de la page, défaut [0.52, 0.66]) · o.stampW 0,66 (largeur en fraction)
//    o.rot (rad) · o.wave (px) + o.waveT (papier qui flotte) · o.alpha · o.paper (couleur) · o.curl (coin plié) · o.shadow 0 (sans ombre) · o.outline false · o.warm 0..1 (teinte ambre de lampe) · o.seed
//    renvoie { x, y, w, h, cx, cy, seal: [x, y], sign: [x, y], stamp: [x, y], head: [x, y, w, h] } (repères non tournés)
function ho_document(x, y, w, h, t, o = {}) {
  o = o || {}; w = Math.round(w); h = Math.round(h);
  const seed = o.seed ?? 4, cx = x + w / 2, cy = y + h / 2;
  const hd = o.head === undefined ? 'MINISTERE' : o.head;
  const out = { x, y, w, h, cx, cy, seal: [x + 13, y + h - 17], sign: [x + w - 36, y + h - 20], stamp: [x + w * (o.stampAt?.[0] ?? 0.52), y + h * (o.stampAt?.[1] ?? 0.66)], head: [x + 4, y + 4, w - 8, 11] };
  ho_placed(cx, cy, w, h, { rot: o.rot, wave: o.wave, waveT: o.waveT ?? t, alpha: o.alpha, s: o.s }, (ox, oy) => {
    ho_paperBase(ox, oy, w, h, o);
    // bandeau d'en-tête : bleu nuit, filet or, texte blanc
    const bw = w - 8;
    ho_R(ox + 4, oy + 4, bw, 11, NI[1]); ho_R(ox + 4, oy + 4, bw, 1, NI[5]); ho_R(ox + 4, oy + 14, bw, 1, NI[0]); ho_R(ox + 4, oy + 16, bw, 1, YE[1]); ho_R(ox + 4, oy + 17, bw, 1, YE[0]);
    if (hd && textW(hd) + 6 <= bw) ho_textC(hd, ox + w / 2, oy + 6, WH[3], 1); else if (hd && w > 40) ho_textC(hd.slice(0, Math.max(1, Math.floor((bw - 6) / 6))), ox + w / 2, oy + 6, WH[3], 1);
    for (const dx of [7, bw - 3]) { ho_R(ox + 4 + dx - 2, oy + 7, 1, 5, RD[3]); ho_R(ox + 4 + dx - 1, oy + 7, 1, 5, WH[3]); ho_R(ox + 4 + dx, oy + 7, 1, 5, BL[2]); }  // liserés tricolores
    let y0 = oy + 21;
    if (o.sub && textW(o.sub) <= bw) { ho_textC(o.sub, ox + w / 2, y0, ST[2], 1); y0 += 10; }
    if (o.title) { const sc = textW(o.title, 2) <= bw ? 2 : 1; ho_textC(o.title, ox + w / 2, y0 + 1, NI[2], sc); ho_R(ox + 8, y0 + 3 + 7 * sc, w - 16, 1, ST[4]); y0 += 7 * sc + 8; }
    // corps : lignes (ancre : bas = signature)
    const yEnd = oy + h - 26, step = 4, n = o.lines ?? Math.max(2, Math.floor((yEnd - y0) / step));
    ho_lines(ox + 7, y0, w - 14, n, step, NI[3], seed, o.write ?? 1);
    // zone basse : trait de signature, sceau, signature
    ho_R(ox + w - 38, oy + h - 9, 30, 1, ST[4]);
    ho_sign(ox + w - 36, oy + h - 20, o.sign ?? 1, o.signKind ?? 0, NI[2]);
    ho_wax(ox + 13, oy + h - 17, 5, o.seal ?? 0, { ribbon: true, seed });
    if (o.curl) ho_dogear(ox, oy, w, h, 7);
    if ((o.stamp ?? 0) > 0) {
      const sp = ho_ink(o.stampText ?? 'OFFICIEL', { seed: seed + 2 }), ss = (w * (o.stampW ?? 0.66)) / sp.w, pop = clamp((o.stamp) / 0.25);
      ho_empreinte(ox + w * (o.stampAt?.[0] ?? 0.52), oy + h * (o.stampAt?.[1] ?? 0.66), ss, o.stampText ?? 'OFFICIEL', { seed: seed + 2, pop, wet: 1 - clamp((o.stamp - 0.1) / 0.5), drops: 8, rot: o.stampRot });
    }
    if (o.warm) ho_dith(ox, oy, w, h, AM[8], 0.16 * clamp(o.warm));
  });
  return out;
}

// ── ho_contrat(x, y, w, h, t, o) : contrat (titre CONTRAT, articles, deux lignes de signature, ruban + sceau). (x, y) = coin haut gauche
//    o.sign1, o.sign2 0..1 (signatures qui se tracent : acheteur à gauche, vendeur à droite) · o.seal 0..1 · o.stamp 0..1 (+ o.stampText 'VENDUE', o.stampBarre 0..1 : barré) · o.write 0..1 · o.folds (plis de la lettre pliée en trois, défaut true) · o.rot · o.wave · o.alpha · o.seed
//    renvoie { x, y, w, h, cx, cy, sign1: [x, y], sign2: [x, y], seal: [x, y], stamp: [x, y] }
function ho_contrat(x, y, w, h, t, o = {}) {
  o = o || {}; w = Math.round(w); h = Math.round(h);
  const seed = o.seed ?? 6, cx = x + w / 2, cy = y + h / 2;
  const out = { x, y, w, h, cx, cy, sign1: [x + 6, y + h - 22], sign2: [x + w / 2 + 6, y + h - 22], seal: [x + w / 2, y + h - 16], stamp: [x + w * 0.5, y + h * 0.56] };
  ho_placed(cx, cy, w, h, { rot: o.rot, wave: o.wave, waveT: o.waveT ?? t, alpha: o.alpha, s: o.s }, (ox, oy) => {
    ho_paperBase(ox, oy, w, h, { ...o, paper: o.paper ?? WH[2] });
    const tsc = textW('CONTRAT', 2) <= w - 14 ? 2 : 1;
    ho_textC('CONTRAT', ox + w / 2, oy + 6, NI[1], tsc); ho_R(ox + 6, oy + 8 + 7 * tsc, w - 12, 1, NI[2]); ho_R(ox + 6, oy + 10 + 7 * tsc, w - 12, 1, ST[4]);
    let y0 = oy + 14 + 7 * tsc; const step = 4, yEnd = oy + h - 28, nArt = Math.max(1, Math.floor((yEnd - y0) / 17));
    for (let a = 0; a < nArt; a++) {
      const ay = y0 + a * 17, wf = clamp((o.write ?? 1) * nArt - a); if (wf <= 0) break;
      ho_text(String(a + 1) + '.', ox + 6, ay - 1, NI[2], 1); ho_lines(ox + 14, ay, w - 22, 3, step, NI[3], seed + a, wf, { full: false, indent: 0 });
    }
    if (o.folds !== false) for (const f of [0.33, 0.66]) { const fy = Math.round(oy + h * f); ho_R(ox + 1, fy, w - 2, 1, WH[0]); ho_R(ox + 1, fy + 1, w - 2, 1, WH[3]); }
    // lignes de signature
    ho_R(ox + 6, oy + h - 11, w / 2 - 10, 1, ST[4]); ho_R(ox + w / 2 + 4, oy + h - 11, w / 2 - 10, 1, ST[4]);
    ho_text('X', ox + 6, oy + h - 17, ST[3], 1); ho_text('X', ox + w / 2 + 4, oy + h - 17, ST[3], 1);
    ho_sign(ox + 9, oy + h - 22, o.sign1 ?? 0, 0, NI[2], 0.8); ho_sign(ox + w / 2 + 8, oy + h - 22, o.sign2 ?? 0, 1, NI[2], 0.8);
    ho_wax(ox + w / 2, oy + h - 16, 5, o.seal ?? 0, { ribbon: true, seed });
    if ((o.stamp ?? 0) > 0) {
      const txt = o.stampText ?? 'VENDUE', sp = ho_ink(txt, { seed: seed + 2 }), ss = (w * 0.8) / sp.w, pop = clamp(o.stamp / 0.25);
      ho_empreinte(ox + w * 0.5, oy + h * 0.56, ss, txt, { seed: seed + 2, pop, wet: 1 - clamp((o.stamp - 0.1) / 0.5), drops: 10, barre: o.stampBarre ?? 0 });
    }
  });
  return out;
}

// ── ho_vol(p, from, to, o) → { x, y, rot, s } : trajectoire d'un papier / d'une enveloppe qui vole de from [x, y] à to [x, y] ; p 0..1 ; o.arc (hauteur de l'arc, 50), o.spin (tours de roulis, 0,6), o.s0, o.s1 (échelles)
function ho_vol(p, from, to, o = {}) {
  p = clamp(p); const e = eio(p), arc = o.arc ?? 50, sp = o.spin ?? 0.6, ph = o.phase ?? 0;
  const x = lerp(from[0], to[0], e), y = lerp(from[1], to[1], e) - Math.sin(e * Math.PI) * arc;
  const rot = Math.sin(p * TAU * sp + ph) * 0.45 + (to[0] - from[0]) * 0.0006 * Math.sin(e * Math.PI) * 60 * 0.01;
  return { x, y, rot, s: lerp(o.s0 ?? 1, o.s1 ?? 1, e), e };
}

// ── ho_enveloppe(cx, cy, s, t, o) : enveloppe crème (44 × 30 px à s = 1), centre (cx, cy)
//    o.face 'dos' (rabat visible, défaut) | 'face' (adresse, timbre, en-tête) · o.open 0..1 (rabat : 0 fermé, 1 grand ouvert ; se referme en repassant de 1 à 0) · o.seal 0..1 (cachet de cire rouge sur la pointe du rabat, enveloppe fermée)
//    o.letter 0..1 (la lettre sort de l'enveloppe ouverte) · o.rot · o.fly { p, from, to, arc, spin, s0, s1 } (position / roulis le long d'une trajectoire : remplace cx, cy, rot, s) · o.shadow 1 · o.seed
//    renvoie { x, y, w, h, tip: [x, y] (pointe du rabat), seal: [x, y] }
function ho_enveloppe(cx, cy, s, t, o = {}) {
  o = o || {}; s = ho_fin(s, 1);
  let rot = o.rot || 0;
  if (o.fly) { const v = ho_vol(o.fly.p, o.fly.from, o.fly.to, o.fly); cx = v.x; cy = v.y; rot += v.rot; s *= v.s; }
  const W0 = 44, H0 = 30, seed = o.seed ?? 8, open = clamp(o.open ?? 0), face = o.face ?? 'dos';
  const pad = 22, e = ho_tmp(W0 + 2 * pad, H0 + 2 * pad + 20 + 18);
  const ox = pad, oy = pad + 20;                                     // la lettre peut dépasser en haut
  ho_to(e.g, () => {
    const g = ho_ctx();
    if (o.letter > 0 && open > 0.5) { const up = Math.round(clamp(o.letter) * 20); ho_paperBase(ox + 5, oy + 2 - up, W0 - 10, H0 - 4, { shadow: 0 }); ho_lines(ox + 8, oy + 5 - up, W0 - 16, 4, 3, NI[3], seed, 1); }
    // corps
    ho_R(ox - 1, oy - 1, W0 + 2, H0 + 2, ho_K); ho_R(ox, oy, W0, H0, WH[2]);
    ho_R(ox, oy, W0, 1, WH[3]); ho_R(ox, oy, 1, H0, WH[3]); ho_R(ox + W0 - 1, oy, 1, H0, WH[0]); ho_R(ox, oy + H0 - 1, W0, 1, WH[0]);
    if (face === 'dos') {
      // plis du devant : deux triangles latéraux et le bas
      ho_line(ox + 1, oy + H0 - 2, ox + W0 / 2, oy + H0 * 0.48, WH[0], 1); ho_line(ox + W0 - 2, oy + H0 - 2, ox + W0 / 2, oy + H0 * 0.48, WH[0], 1);
      ho_line(ox + 1, oy + 1, ox + W0 / 2, oy + H0 * 0.55, WH[0], 1); ho_line(ox + W0 - 2, oy + 1, ox + W0 / 2, oy + H0 * 0.55, WH[0], 1);
      if (open > 0.5) ho_poly([[ox + 1, oy + 1], [ox + W0 - 2, oy + 1], [ox + W0 / 2, oy + H0 * 0.52]], NI[2]);
    } else {
      ho_lines(ox + 10, oy + 14, W0 - 22, 3, 4, NI[3], seed, 1, { indent: 0, full: true });
      ho_R(ox + 3, oy + 3, 9, 6, NI[1]); ho_R(ox + 4, oy + 4, 7, 4, BL[2]);                 // en-tête (coin)
      ho_R(ox + W0 - 11, oy + 3, 8, 9, RD[3]); ho_R(ox + W0 - 10, oy + 4, 6, 7, WH[3]); ho_disc(ox + W0 - 7, oy + 7, 2, RD[2]);   // timbre
      for (let i = 0; i < 6; i++) ho_P(ox + W0 - 11 + i * 1.6, oy + 12, ST[3]);
    }
    // rabat : triangle dont la pointe va de (milieu, 0,55 H) fermé à (milieu, −0,5 H) ouvert
    if (face === 'dos') {
      const ky = Math.cos(Math.PI * open), tipY = oy + (ky >= 0 ? ky * H0 * 0.58 : ky * H0 * 0.5), inner = open > 0.5, col = inner ? BL[1] : WH[2], edge = inner ? BL[2] : WH[3];
      ho_poly([[ox - 1, oy - 1], [ox + W0, oy - 1], [ox + W0 / 2 + 0.5, tipY + 1]], ho_K);
      ho_poly([[ox, oy], [ox + W0 - 1, oy], [ox + W0 / 2, tipY]], col);
      if (!inner) { ho_line(ox + 1, oy + 1, ox + W0 / 2, tipY - 1, WH[3], 1); ho_line(ox + W0 - 3, oy + 1, ox + W0 / 2 + 1, tipY - 1, WH[0], 1); ho_dith(ox + 3, oy + 2, W0 - 6, Math.max(0, tipY - oy - 4), WH[0], 0.12); }
      else { ho_line(ox + 2, oy, ox + W0 / 2, tipY + 1, edge, 1); ho_line(ox + W0 - 3, oy, ox + W0 / 2 + 1, tipY + 1, BL[0], 1); for (let i = 0; i < 12; i++) { const xx = ox + 5 + i * 3, hh = (1 - Math.abs(xx - ox - W0 / 2) / (W0 / 2)) * (oy - tipY); if (hh > 3) ho_line(xx, oy - 1, xx - 2, oy - hh + 2, BL[2], 1); } }
      if (!inner && (o.seal ?? 0) > 0) ho_wax(ox + W0 / 2, tipY - 2, 4, o.seal, { seed });
    }
  });
  const bx = cx - W0 * s / 2, by = cy - H0 * s / 2;
  if ((o.shadow ?? 1) > 0 && !o.fly) { ho_ctx().save(); ho_ctx().fillStyle = 'rgba(5,4,15,0.32)'; ho_ctx().fillRect(Math.round(cx - W0 * s / 2 + 2), Math.round(cy + H0 * s / 2 - 1), Math.round(W0 * s), 3); ho_ctx().restore(); }
  ho_blit(e.c, cx, cy, { rot, s, px: ox + W0 / 2, py: oy + H0 / 2 });
  ho_free(e);
  return { x: bx, y: by, w: W0 * s, h: H0 * s, tip: [cx, cy], seal: [cx, cy - H0 * s * 0.1 + 0.58 * H0 * s * Math.cos(Math.PI * open) * 0.5] };
}
// ── petite tour Eiffel de dessinateur (affiche, icônes) : (cx, by) = milieu du pied ; h = hauteur ; o.col, o.dark, o.hi ; o.cut (0..1) : ne dessine que la partie sous la fraction cut (0 = tout) ; o.top : ne dessine que la partie au-dessus de cut
function ho_tourMini(cx, by, h, o = {}) {
  const col = o.col ?? OC[2], dk = o.dark ?? OC[0], hi = o.hi ?? OC[4], hw0 = h * 0.2, ya = h * 0.15, cut = o.cut ?? 1, onlyTop = !!o.top;
  const prof = f => hw0 * Math.pow(1 - f, 2.5) + 0.6 + 1.1 * (1 - f) * (f < 0.9 ? 1 : 0);
  const plat = [[0.16, 2, 2], [0.43, 1, 1.5], [0.78, 1, 1]];
  for (let y = 0; y <= h; y++) {
    const f = y / h; if (onlyTop ? f < cut : f > cut) continue;
    const hw = prof(f), xl = Math.round(cx - hw), xr = Math.round(cx + hw), yy = by - y;
    ho_R(xl, yy, xr - xl + 1, 1, col);
    if (y < ya) { const lw = Math.max(1, hw * 0.3), cw = (hw - lw) * Math.sqrt(Math.max(0, 1 - Math.pow(y / ya, 2.2))); if (cw >= 1) { ho_R(cx - cw, yy, cw * 2 + 1, 1, o.bg ?? dk); } }
    else if (hw > 2.2) for (let x = xl + 1; x < xr; x++) if (((x + y) & 3) === 0 || ((x - y) & 3) === 0) ho_P(x, yy, dk);
    ho_P(xl, yy, hi); if (hw > 2.5) ho_P(xl + 1, yy, hi); ho_P(xr, yy, dk);
  }
  for (const [pf, th, ex] of plat) { if (onlyTop ? pf < cut : pf > cut) continue; const hw = prof(pf) + ex, yy = by - pf * h; ho_R(cx - hw, yy - th + 1, hw * 2 + 1, th, dk); ho_R(cx - hw, yy - th, hw * 2 + 1, 1, hi); }
  if (!onlyTop || cut < 0.98) { /* pointe */ ho_R(cx, by - h - 3, 1, 3, dk); }
}
// ── ho_affiche(x, y, w, h, t, o) : affiche « LA TOUR EIFFEL / A DEMOLIR ? » (petite tour, grue et boulet de démolition qui se balance). (x, y) = coin haut gauche
//    o.ball 0..1 (amplitude du balancement du boulet ; à 1 il frappe la tour à chaque période de 2,4 s) · o.ruin 0..1 (la tour se brise : sommet qui bascule, débris, tas de poutres, poussière) · o.titles ['LA TOUR EIFFEL', 'A DEMOLIR ?'] · o.stamp 0..1 + o.stampText 'SECRET' (tampon en travers)
//    o.kind 'affiche' (défaut) | 'dossier' (chemise cartonnée à étiquette dont l'affiche sort : o.out 0..1 ; o.stampText 'SECRET') · o.rot · o.wave · o.alpha · o.shadow
//    renvoie { x, y, w, h, cx, cy, tower: [x, y, h] (pied et hauteur de la tour), ball: [x, y] (centre du boulet), hit (0..1 : le boulet touche), art: [x, y, w, h] (zone d'illustration) }
function ho_affiche(x, y, w, h, t, o = {}) {
  o = o || {}; w = Math.round(w); h = Math.round(h);
  const cx = x + w / 2, cy = y + h / 2, seed = o.seed ?? 9, dos = o.kind === 'dossier', ruin = clamp(o.ruin ?? 0), ballA = clamp(o.ball ?? 0.6);
  const res = { x, y, w, h, cx, cy, tower: [0, 0, 0], ball: [0, 0], hit: 0, art: [0, 0, 0, 0] };
  const poster = (ox, oy, ww, hh, clipB) => {
    ho_paperBase(ox, oy, ww, hh, { ...o, paper: o.paper ?? WH[1], paperHi: WH[2], paperLo: WH[0], stain: true, seed });
    ho_R(ox + 3, oy + 3, ww - 6, 1, NI[2]); ho_R(ox + 3, oy + 3, 1, hh - 6, NI[2]); ho_R(ox + ww - 4, oy + 3, 1, hh - 6, NI[2]); ho_R(ox + 3, oy + hh - 4, ww - 6, 1, NI[2]);
    const tt = o.titles ?? ['LA TOUR EIFFEL', 'A DEMOLIR ?'], aw = ww - 14;
    const s1 = clamp(Math.floor(aw / textW(tt[0], 1)), 1, 3), s2 = clamp(Math.floor(aw / textW(tt[1], 1)), 1, 4);
    let yy = oy + 7; ho_textC(tt[0], ox + ww / 2, yy, NI[2], s1); yy += 7 * s1 + 3; ho_R(ox + 8, yy - 1, ww - 16, 1, NI[2]);
    yy += 2; ho_textC(tt[1], ox + ww / 2 + 1, yy + 1, NI[1], s2); ho_textC(tt[1], ox + ww / 2, yy, RD[3], s2); yy += 7 * s2 + 4;
    ho_R(ox + 8, yy - 1, ww - 16, 1, NI[2]);
    // illustration
    const ax = ox + 6, ay = yy + 1, aw2 = ww - 12, ah = oy + hh - 8 - (ay) - 9, by_ = ay + ah - 3;
    res.art = [ax, ay, aw2, ah];
    ho_R(ax - 1, ay - 1, aw2 + 2, ah + 2, NI[2]);
    ho_cacheSkyPoster(ax, ay, aw2, ah);
    ho_R(ax, by_ + 1, aw2, ah - (by_ - ay) - 1, WO[4]);                                   // sol
    const th = Math.round(ah * 0.78), tx = ax + Math.round(aw2 * 0.36);
    res.tower = [tx, by_, th];
    // la tour (sommet qui bascule quand elle se brise)
    const brk = 0.52, rr = ho_ss(0.15, 0.7, ruin);
    ho_tourMini(tx, by_, th, { cut: brk, bg: SK[4] });
    if (rr <= 0) ho_tourMini(tx, by_, th, { cut: brk, top: true });
    else {
      const e = ho_tmp(th * 0.6, th * 0.8); ho_to(e.g, () => ho_tourMini(Math.round(th * 0.3), th * 0.8 - 1 + (-brk * th) + 0, th, { cut: brk, top: true }));
      ho_blit(e.c, tx + rr * 12, by_ - brk * th + rr * rr * th * 0.35, { rot: rr * 1.15, px: th * 0.3, py: th * 0.8 - 1, alpha: 1 - ho_ss(0.8, 1, ruin) * 0.3 });
      ho_free(e);
    }
    // grue : mât et flèche
    const mx = ax + Math.round(aw2 * 0.9), top_ = ay + 3, px_ = ax + Math.round(aw2 * 0.64);
    ho_R(mx - 2, top_, 1, by_ - top_, NI[2]); ho_R(mx + 2, top_, 1, by_ - top_, NI[2]); for (let yy2 = top_; yy2 < by_ - 3; yy2 += 5) { ho_line(mx - 2, yy2, mx + 2, yy2 + 4, NI[3], 1); ho_R(mx - 2, yy2, 5, 1, NI[2]); }
    ho_R(mx - 3, top_ - 3, 7, 4, NI[1]); ho_line(mx - 3, top_, px_, top_ + 1, NI[2], 1); ho_line(mx - 3, top_ + 4, px_, top_ + 2, NI[2], 1); for (let xx = px_; xx < mx - 4; xx += 6) ho_line(xx, top_ + 2, xx + 3, top_, NI[3], 1); ho_line(mx, top_ - 3, mx - 12, top_ + 1, NI[3], 1); ho_R(px_ - 1, top_ + 1, 3, 3, NI[1]);
    // boulet : pendule (amplitude ballA ; un coup toutes les 2,4 s)
    const Lc = Math.round(ah * 0.5), per = 2.4, ph = (t % per) / per, swing = Math.sin(ph * TAU), ang = ballA * (0.1 + 0.62 * Math.max(0, swing) * 1.1 - 0.35 * Math.max(0, -swing)) * 1.0;
    const bx = px_ - Math.sin(ang) * Lc, byy = top_ + 2 + Math.cos(ang) * Lc, br = Math.max(3, Math.round(ah * 0.06));
    ho_line(px_, top_ + 2, bx, byy, NI[3], 1); ho_disc(bx, byy + br, br + 1, ho_K); ho_disc(bx, byy + br, br, NI[3]); ho_disc(bx - 1, byy + br - 1, Math.max(1, br - 2), ST[2]); ho_P(bx - br * 0.4, byy + br - br * 0.5, ST[6]);
    res.ball = [bx, byy + br];
    const dx = Math.abs(bx - (tx + th * 0.07)), contact = ballA > 0.4 && dx < br + th * 0.09 && byy + br > by_ - th * 0.5;
    res.hit = contact ? 1 : 0;
    if (contact) { for (let i = 0; i < 7; i++) { const a = i / 7 * TAU + 0.3, r = br + 3 + (i % 2) * 3; ho_line(bx - br, byy + br, bx - br + Math.cos(a) * r, byy + br + Math.sin(a) * r, YE[3], 1); } }
    // poutres et poussière quand la tour s'effondre
    if (ruin > 0.25) {
      const nb = Math.round(ho_ss(0.25, 1, ruin) * 9);
      for (let i = 0; i < nb; i++) { const bx2 = tx - 16 + ho_h(i, seed) * 40, by2 = by_ - 1 - (i % 3) * 2, a = (ho_h(i, seed + 1) - 0.5) * 1.6, l = 7 + ho_h(i, seed + 2) * 9; ho_line(bx2 - Math.cos(a) * l / 2, by2 - Math.sin(a) * l / 2, bx2 + Math.cos(a) * l / 2, by2 + Math.sin(a) * l / 2, i % 2 ? OC[2] : OC[0], 2); }
      for (let i = 0; i < 6; i++) { const k = ((t * 0.5 + i / 6) % 1), dxp = tx - 14 + ho_h(i, seed + 5) * 38, r = 4 + k * 8; ho_ellDith(dxp, by_ - 4 - k * 14, r, r * 0.7, WH[0], (1 - k) * 0.5 * ho_ss(0.25, 0.6, ruin)); }
    }
    // pied de page : petites lignes
    ho_lines(ox + 8, oy + hh - 9, ww - 16, 1, 3, NI[3], seed, 1, { full: true, indent: 0 });
    if ((o.stamp ?? 0) > 0) { const txt = o.stampText ?? 'SECRET', sp = ho_ink(txt, { seed: seed + 3 }); ho_empreinte(ox + ww * 0.55, oy + hh * 0.58, ww * 0.62 / sp.w, txt, { seed: seed + 3, pop: clamp(o.stamp / 0.25), wet: 1 - clamp((o.stamp - 0.1) / 0.5), drops: 8 }); }
  };
  if (!dos) { ho_placed(cx, cy, w, h, { rot: o.rot, wave: o.wave, waveT: t, alpha: o.alpha, s: o.s }, (ox, oy) => poster(ox, oy, w, h)); res.x = x; return res; }
  // chemise cartonnée : l'affiche sort par le haut
  ho_placed(cx, cy, w, h, { rot: o.rot, wave: o.wave, waveT: t, alpha: o.alpha, s: o.s }, (ox, oy) => {
    const out = clamp(o.out ?? 0), pw = Math.round(w * 0.86), ph_ = Math.round(h * 0.9), px0 = ox + Math.round((w - pw) / 2), py0 = oy + 8 - Math.round(out * h * 0.55);
    // fond de chemise (dos), puis l'affiche, puis le devant
    ho_R(ox - 1, oy + 6, w + 2, h - 5, ho_K); ho_R(ox, oy + 7, w, h - 7, SK[2]);
    if (out > 0) poster(px0, py0, pw, ph_);
    ho_R(ox - 1, oy + 12, w + 2, h - 11, ho_K); ho_R(ox, oy + 13, w, h - 13, SK[3]); ho_R(ox, oy + 13, w, 2, SK[4]); ho_R(ox, oy + h - 3, w, 3, SK[2]); ho_R(ox + w - 3, oy + 13, 3, h - 13, SK[2]);
    ho_R(ox - 1, oy + 1, Math.round(w * 0.36) + 2, 13, ho_K); ho_R(ox, oy + 2, Math.round(w * 0.36), 12, SK[3]); ho_R(ox, oy + 2, Math.round(w * 0.36), 1, SK[4]);   // onglet
    ho_lines(ox + 4, oy + 5, w * 0.36 - 8, 2, 4, NI[3], seed, 1, { full: true, indent: 0 });
    const lw = Math.round(w * 0.74), lh = 31, lx = ox + Math.round((w - lw) / 2), ly = oy + 24;                                        // étiquette collée
    ho_paperBase(lx, ly, lw, lh, { shadow: 0 });
    ho_textC('LA TOUR', lx + lw / 2, ly + 3, NI[2], 1); ho_textC('EIFFEL', lx + lw / 2, ly + 12, NI[2], 1); ho_textC('A DEMOLIR ?', lx + lw / 2, ly + 21, RD[3], 1);
    if ((o.stamp ?? 0) > 0) { const txt = o.stampText ?? 'SECRET', sp = ho_ink(txt, { seed: seed + 3 }); ho_empreinte(ox + w * 0.5, oy + h * 0.66, w * 0.7 / sp.w, txt, { seed: seed + 3, pop: clamp(o.stamp / 0.25), wet: 1 - clamp((o.stamp - 0.1) / 0.5), drops: 8 }); }
    // lacet
    ho_line(ox + 3, oy + h * 0.5, ox + w - 3, oy + h * 0.5, SK[2], 1);
  });
  return res;
}
function ho_cacheSkyPoster(ax, ay, aw, ah) { const g = ho_ctx(); const gr = g.createLinearGradient(0, ay, 0, ay + ah); gr.addColorStop(0, WH[1]); gr.addColorStop(1, SK[4]); g.fillStyle = gr; g.fillRect(ax, ay, aw, ah); ho_dith(ax, ay + ah * 0.5, aw, ah * 0.5, AM[9], 0.2); }

// ════════════════════════════════════════════════════════════════════════════════════════
// 4. L'ARGENT : billets, liasses, pièces, mallette ouverte / fermée
// ════════════════════════════════════════════════════════════════════════════════════════
const HO_BILL = { paper: GR[6], paper2: LM[6], line: GR[4], deep: GR[3], dark: GR[2], ink: GR[1], edge: GR[0], gold: YE[2] };
// billet de banque (sprite 22 × 11, face ou dos) ; mis en cache
function ho_billSprite(back, seed = 1) {
  return ho_cache('bill:' + (back ? 1 : 0) + ':' + seed, 24, 13, () => {
    ho_R(0, 0, 24, 13, ho_K); ho_R(1, 1, 22, 11, back ? HO_BILL.paper2 : HO_BILL.paper);
    ho_R(1, 1, 22, 1, WH[3]); ho_R(1, 11, 22, 1, HO_BILL.line);
    ho_R(2, 2, 20, 9, HO_BILL.deep); ho_R(3, 3, 18, 7, back ? HO_BILL.paper : HO_BILL.paper2);       // double filet
    for (let x = 3; x < 21; x += 2) { ho_P(x, 3, HO_BILL.line); ho_P(x + 1, 9, HO_BILL.line); }
    ho_ell(12, 6, 3, 3, HO_BILL.deep); ho_ell(12, 6, 2, 2, HO_BILL.paper); ho_P(12, 5, HO_BILL.dark); ho_P(11, 6, HO_BILL.dark); ho_P(13, 6, HO_BILL.dark); ho_P(12, 7, HO_BILL.dark); ho_R(11, 8, 3, 1, HO_BILL.dark);   // médaillon
    ho_R(4, 4, 3, 2, HO_BILL.dark); ho_R(17, 7, 3, 2, HO_BILL.dark); ho_P(5, 7, HO_BILL.line); ho_P(6, 7, HO_BILL.line); ho_P(17, 4, HO_BILL.line); ho_P(18, 4, HO_BILL.line);       // chiffres
  });
}
// un billet : (x, y) centre, s échelle (1 : 22 × 11 px), rot (rad), ph phase de retournement (cos(ph) = largeur relative)
function ho_bill(x, y, s, rot = 0, ph = 0, o = {}) {
  const cph = Math.cos(ph), back = cph < 0, w = Math.max(0.12, Math.abs(cph));
  ho_blit(ho_billSprite(back, o.seed ?? 1), x, y, { rot, sx: s * w, sy: s * (1 + 0.05 * (1 - w)), alpha: o.alpha });
}
// pièce d'or : (x, y) centre ; s ; ph phase de rotation (largeur |cos|)
function ho_coin(x, y, s, ph = 0, o = {}) {
  const r = Math.max(2, Math.round(3.4 * s)), w = Math.abs(Math.cos(ph)), rx = Math.max(0.6, r * w), face = Math.cos(ph) > 0;
  ho_ell(x, y, rx + 1, r + 1, ho_K); ho_ell(x, y, rx, r, YE[1]);
  if (rx > 1.6) { ho_ell(x, y, rx - 1, r - 1, face ? YE[2] : YE[1]); if (r >= 3 && rx > 2.4) { ho_ell(x - 0.5, y - 0.5, rx - 2, r - 2, YE[2]); ho_P(x - 1, y - 1, YE[3]); } } else ho_R(x, y - r, 1, r * 2, YE[2]);
  const gl = (ph * 3 + ho_h(Math.round(x), 4) * 6) % TAU; if (gl < 0.5 && rx > 1.5) { ho_P(x + 1, y - 1, WH[3]); ho_P(x, y - 2, WH[3]); ho_P(x - 1, y, WH[3]); }
}
// liasse (bloc de billets vu de 3/4 avec bandeau de papier) : (x, y) milieu du bas ; 34 × 15 px à s = 1
function ho_bundle(x, y, s, o = {}) {
  const w = Math.round(34 * s), hf = Math.round(7 * s), dp = Math.round(7 * s), x0 = Math.round(x - w / 2), y0 = Math.round(y - hf);
  ho_R(x0 - 1, y0 - dp - 1, w + 2 + 0, dp + hf + 2, ho_K);
  ho_poly([[x0, y0], [x0 + w, y0], [x0 + w, y0 + hf], [x0, y0 + hf]], HO_BILL.paper);                  // face avant : tranche de billets
  for (let j = 0; j < hf; j += 2) ho_R(x0, y0 + j, w, 1, HO_BILL.line);
  ho_R(x0, y0 + hf - 1, w, 1, HO_BILL.dark);
  ho_poly([[x0 + 2, y0 - dp], [x0 + w + 0, y0 - dp], [x0 + w, y0], [x0, y0]], HO_BILL.paper2);             // dessus : le premier billet
  ho_R(x0 + 3, y0 - dp + 1, w - 5, 1, HO_BILL.deep); ho_ell(x0 + w / 2 + 1, y0 - dp / 2, Math.round(3 * s), Math.round(2 * s), HO_BILL.line); ho_R(x0 + w / 2, y0 - dp / 2 - 1, 2, 2, HO_BILL.dark);
  ho_R(x0 + w - 1, y0 - dp, 1, dp + hf, HO_BILL.dark);
  // bandeau papier
  const bw = Math.round(7 * s); ho_R(x0 + Math.round(w * 0.5 - bw / 2), y0 - dp - 1, bw, dp + hf + 2, SK[3]); ho_R(x0 + Math.round(w * 0.5 - bw / 2), y0 - dp - 1, 1, dp + hf + 2, SK[4]); ho_R(x0 + Math.round(w * 0.5 + bw / 2) - 1, y0 - dp - 1, 1, dp + hf + 2, SK[2]);
  ho_R(x0 + Math.round(w * 0.5 - bw / 2) + 1, y0 + 1, bw - 3, 1, RD[2]); ho_R(x0 + Math.round(w * 0.5 - bw / 2) + 1, y0 + 3, bw - 4, 1, NI[2]);
}
// ── ho_billets(x, y, s, t, o) : argent. o.kind :
//    'liasse' (défaut) : o.n liasses (1) posées en 'pile' (empilées, défaut) | 'pyramide' | 'rang' ; (x, y) = milieu du bas ; renvoie { top: [x, y], box }
//    'tas' : tas de liasses (pyramide de o.n = 10 liasses, en désordre) · 'vol' : billets qui voltigent (émetteur, voir ci-dessous) · 'pluie' : billets qui tombent sur la largeur de l'écran · 'pieces' : pièces d'or qui volent (même émetteur) · 'monnaie' : tas de pièces posé (o.n)
//    émetteur ('vol', 'pluie', 'pieces') : o.n 14 · o.area [x0, y0, x1, y1] (zone de naissance ; défaut : le point (x, y)) · o.vx, o.vy (vitesse moyenne px/s : défaut 0, −50) · o.spread 40 (dispersion de vitesse) · o.g 55 (gravité px/s²)
//      o.life 2,2 (durée de vie, s) · o.t0 0 (instant de départ ; 'loop' true : se répète ; false : une seule vague) · o.flip 5 (retournements / s) · o.sway 14 (ondulation latérale px) · o.size (échelle 1) · o.fade true (s'efface en fin de vie)
function ho_billets(x, y, s, t, o = {}) {
  o = o || {}; s = ho_fin(s, 1); const kind = o.kind ?? 'liasse', n = o.n ?? (kind === 'tas' ? 10 : kind === 'liasse' ? 1 : kind === 'monnaie' ? 18 : 14), seed = o.seed ?? 3;
  if (kind === 'liasse' || kind === 'tas') {
    const layout = kind === 'tas' ? 'pyramide' : (o.layout ?? 'pile'), bw = 34 * s, bh = 8.5 * s; let i = 0, top = [x, y], minx = x, maxx = x;
    if (layout === 'pile') for (; i < n; i++) { const yy = y - i * (bh - 1 * s), xx = x + (ho_h(i, seed) - 0.5) * 4 * s; ho_bundle(xx, yy, s); top = [xx, yy - 14 * s]; }
    else if (layout === 'rang') for (; i < n; i++) { const xx = x + (i - (n - 1) / 2) * (bw - 2 * s); ho_bundle(xx, y, s); top = [xx, y - 14 * s]; minx = Math.min(minx, xx - bw / 2); maxx = Math.max(maxx, xx + bw / 2); }
    else { let row = 0, left = n; while (left > 0) { const cnt = Math.min(left, Math.max(1, Math.round(Math.sqrt(n * 1.1)) - row)); for (let k = 0; k < cnt; k++) { const xx = x + (k - (cnt - 1) / 2) * (bw - 1 * s) + (ho_h(i, seed) - 0.5) * 3 * s, yy = y - row * (bh + 2 * s); ho_bundle(xx, yy, s); top = [xx, yy - 14 * s]; minx = Math.min(minx, xx - bw / 2); maxx = Math.max(maxx, xx + bw / 2); i++; } left -= cnt; row++; } }
    return { top, box: [minx, top[1], maxx - minx, y - top[1]] };
  }
  if (kind === 'monnaie') {
    for (let i = 0; i < n; i++) { const rr = ho_h(i, seed), a = rr * TAU, d = Math.sqrt(ho_h(i, seed + 1)) * 14 * s * Math.sqrt(n / 6), cx_ = x + Math.cos(a) * d, cy_ = y - Math.abs(Math.sin(a)) * d * 0.5 - (1 - d / (14 * s * Math.sqrt(n / 6))) * 4 * s; ho_coin(cx_, cy_, 0.8 * s, 0.35 + ho_h(i, seed + 2) * 0.5); }
    return { top: [x, y - 10 * s] };
  }
  // émetteur
  const area = o.area ?? [x, y, x, y], life = o.life ?? 2.2, vx = o.vx ?? 0, vy = o.vy ?? (kind === 'pluie' ? 40 : -50), spread = o.spread ?? 40, g = o.g ?? (kind === 'pluie' ? 6 : 55), loop = o.loop !== false, t0 = o.t0 ?? 0, fl = o.flip ?? 5, sway = o.sway ?? 14, sz = (o.size ?? 1) * s;
  const A = kind === 'pluie' ? [o.area?.[0] ?? 0, o.area?.[1] ?? -14, o.area?.[2] ?? LW, o.area?.[3] ?? -14] : area;
  const lst = [];
  for (let k = 0; k < n; k++) {
    let tau = t - t0 - (k / n) * life; if (loop) tau = ((tau % life) + life) % life; else if (tau < 0 || tau > life) continue;
    if (!loop && t - t0 < 0) continue;
    const cyc = loop ? Math.floor((t - t0 - (k / n) * life) / life) : 0, hk = ho_h(k + cyc * 131, seed);
    const px_ = lerp(A[0], A[2], ho_h(k + cyc * 131, seed + 1)), py_ = lerp(A[1], A[3], ho_h(k + cyc * 131, seed + 2));
    const ux = vx + (ho_h(k + cyc * 131, seed + 3) - 0.5) * spread * 2, uy = vy + (ho_h(k + cyc * 131, seed + 4) - 0.5) * spread;
    const X_ = px_ + ux * tau + Math.sin(tau * (2.5 + hk * 2) + hk * 9) * sway * Math.min(1, tau * 2), Y_ = py_ + uy * tau + 0.5 * g * tau * tau;
    const ph = tau * fl * (0.6 + hk * 0.8) + hk * 6, rot = Math.sin(tau * 3 + hk * 7) * 0.7 + (ux * 0.004);
    lst.push({ X_, Y_, ph, rot, tau, hk, z: hk });
  }
  lst.sort((a, b) => a.z - b.z);
  for (const b of lst) {
    const fade = o.fade === false ? 1 : 1 - ho_ss(0.8, 1, b.tau / life); if (fade <= 0.02) continue;
    if (fade < 1 && ho_bay(Math.round(b.X_), Math.round(b.Y_)) > fade) continue;
    if (kind === 'pieces') ho_coin(b.X_, b.Y_, sz * (0.8 + b.hk * 0.5), b.ph); else ho_bill(b.X_, b.Y_, sz * (0.75 + b.hk * 0.5), b.rot, b.ph);
  }
  return { n: lst.length };
}

// ── ho_mallette(x, y, s, t, o) : mallette de cuir brun (coins, serrures et poignée en laiton), vue 3/4 de dessus. (x, y) = milieu du bas de la face avant ; 80 px de large à s = 1
//    o.open 0..1 (le couvercle se relève en pivotant sur la charnière arrière : 1 = grand ouvert à ≈ 105°, doublure rouge visible) · o.bills 1 (remplissage de liasses de billets) · o.glow 0..1 (lueur dorée qui jaillit de la valise ouverte)
//    o.latch 0..1 (serrures ouvertes : par défaut suit open) · o.shake (px de tremblement) · o.shadow 1 (ombre au sol)
//    o.style 'mallette' (défaut) | 'valise' (plus grande, deux sangles, étiquettes de voyage ; voir ho_valise) · o.contents 'billets' (défaut) | 'linge' (chemises pliées, cravate, chaussette) | 'vide'
//    renvoie { handle: [x, y], inside: [x, y, w, h] (ouverture), locks: [[x, y], [x, y]], top: y du haut, w, h }
function ho_mallette(x, y, s, t, o = {}) {
  o = o || {}; s = ho_fin(s, 1); const val = o.style === 'valise', open = clamp(o.open ?? 0), W = (val ? 96 : 80) * s, Hb = (val ? 34 : 28) * s, Dp = (val ? 24 : 20) * s, a = 1.83 * (1 - Math.pow(1 - open, 1.7)), seed = o.seed ?? 5;
  x += (o.shake ? (ho_h(Math.round(t * 30), 3) - 0.5) * 2 * o.shake : 0); y += (o.shake ? (ho_h(Math.round(t * 30), 4) - 0.5) * 2 * o.shake : 0);
  const xl = x - W / 2, xr = x + W / 2, yb = y, yt = y - Hb, yh = yt - Dp, inset = 6 * s;
  if ((o.shadow ?? 1) > 0) { ho_ellDith(x + 2 * s, y + 1, W * 0.56, 5 * s, ho_K, 0.7); ho_ell(x, y + 1, W * 0.5, 3 * s, 'rgba(5,4,15,0.45)'); }
  const L_ = (o.light ?? -1);
  // face avant
  const front = () => {
    ho_R(xl - 1, yt - 1, W + 2, Hb + 2, ho_K); ho_R(xl, yt, W, Hb, WO[3]);
    ho_vg(xl, yt, W, Hb, WO[4], WO[2]);
    ho_R(xl, yt, W, 2, WO[5]); ho_R(xl, yt + 2, W, 1, WO[4]); ho_R(xl, yb - 3, W, 3, WO[1]); ho_R(xl + W - 3 * s, yt, 3 * s, Hb, WO[2]); ho_R(xl, yt, Math.max(1, 2 * s), Hb, WO[5]);
    // grain du cuir et coutures
    for (let i = 0; i < 46; i++) { const px_ = xl + 3 + ho_h(i, seed) * (W - 6), py_ = yt + 4 + ho_h(i, seed + 1) * (Hb - 8); ho_P(px_, py_, ho_h(i, seed + 2) < 0.5 ? WO[4] : WO[2]); }
    for (let xx = xl + 4 * s; xx < xr - 4 * s; xx += 3) { ho_P(xx, yt + 4 * s, WO[6]); ho_P(xx, yb - 5 * s, WO[2]); }
    for (let yy = yt + 4 * s; yy < yb - 4 * s; yy += 3) { ho_P(xl + 3 * s, yy, WO[6]); ho_P(xr - 4 * s, yy, WO[2]); }
    // coins de laiton (bas)
    for (const sx of [-1, 1]) { const cx_ = sx < 0 ? xl : xr - 7 * s; ho_R(cx_ - (sx < 0 ? 1 : 0), yb - 9 * s, 8 * s, 10 * s, ho_K); ho_R(cx_, yb - 8 * s, 7 * s, 8 * s, YE[1]); ho_R(cx_, yb - 8 * s, 7 * s, 1, YE[3]); ho_R(cx_, yb - 8 * s, 1, 8 * s, YE[2]); ho_R(cx_ + 6 * s, yb - 8 * s, 1, 8 * s, YE[0]); ho_P(cx_ + 3 * s, yb - 4 * s, YE[0]); }
  };
  front();
  // serrures
  const unl = clamp(o.latch ?? open * 4), locks = [];
  for (const sx of [-1, 1]) {
    const lx = x + sx * 24 * s, ly = yt + 2 * s; locks.push([lx, ly + 5 * s]);
    ho_R(lx - 6 * s - 1, ly - 1, 12 * s + 2, 13 * s + 2, ho_K); ho_R(lx - 6 * s, ly, 12 * s, 12 * s, YE[1]); ho_R(lx - 6 * s, ly, 12 * s, 1, YE[3]); ho_R(lx - 6 * s, ly, 1, 12 * s, YE[2]); ho_R(lx + 5 * s, ly, 1, 12 * s, YE[0]); ho_R(lx - 6 * s, ly + 12 * s - 1, 12 * s, 1, YE[0]);
    ho_disc(lx, ly + 6 * s, Math.max(2, Math.round(2.2 * s)), YE[0]); ho_P(lx, ly + 6 * s - 1, YE[3]); ho_R(lx, ly + 6 * s, 1, 2 * s, ho_K);
    if (unl > 0) ho_R(lx - 4 * s, ly - Math.round(unl * 4 * s), 8 * s, Math.max(1, 3 * s), YE[2]);     // la serrure se soulève
  }
  if (val) {
    for (const sx of [-1, 1]) { const bx = x + sx * 36 * s - 3 * s; ho_R(bx - 1, yt, 7 * s + 2, Hb, ho_K); ho_R(bx, yt, 7 * s, Hb, WO[1]); ho_R(bx, yt, 1, Hb, WO[3]); ho_R(bx + 3 * s, yt + 4 * s, 1, Hb - 8 * s, WO[0]); ho_R(bx + 1, yb - 9 * s, 5 * s, 3 * s, YE[1]); ho_R(bx + 1, yb - 9 * s, 5 * s, 1, YE[3]); }
    for (const [sx_, sy_, c, c2] of [[-16, 8, RD[3], WH[2]], [-4, 16, BL[3], YE[3]], [14, 11, GR[3], WH[2]], [26, 20, AM[7], RD[2]]]) { ho_ell(x + sx_ * s, yt + sy_ * s, 5 * s, 4 * s, ho_K); ho_ell(x + sx_ * s, yt + sy_ * s, 4.2 * s, 3.2 * s, c); ho_ell(x + sx_ * s, yt + sy_ * s, 2.4 * s, 1.8 * s, c2); }
  }
  // dessus / intérieur / couvercle
  const hw = W - 2 * inset, hx0 = x - hw / 2, hx1 = x + hw / 2;
  const lidFront = a <= 0.001 ? yt : yh + Dp / 0.45 * 0 + (Dp / 0.45) * Math.cos(a) * 0.45 - (Dp / 0.45) * Math.sin(a) * 0.92 * 1.0;
  const wf = hw + inset * 2 * Math.max(0, Math.cos(a)), fx0 = x - wf / 2, fx1 = x + wf / 2;
  const inside = [x - hw / 2 + 2 * s, yh + 2 * s, hw - 4 * s, Dp - 2 * s];
  const drawInterior = () => {
    ho_poly([[xl, yt], [xr, yt], [hx1, yh], [hx0, yh]], ho_K);
    ho_poly([[xl + 2, yt - 1], [xr - 2, yt - 1], [hx1 - 1, yh + 1], [hx0 + 1, yh + 1]], RD[1]);
    ho_poly([[xl + 4, yt - 2], [xr - 4, yt - 2], [hx1 - 2, yh + 2], [hx0 + 2, yh + 2]], NI[0]);
    // contenu : liasses (deux rangées de quatre) ou linge
    const fill = (o.contents ?? 'billets') === 'billets' ? (o.bills ?? 1) : 0;
    if (o.contents === 'linge') {
      for (let r = 0; r < 2; r++) for (let c = 0; c < 3; c++) { const k = r * 3 + c, rx = x - hw / 2 + 4 + c * (hw - 8) / 3, ry = yh + 3 + r * 9 * s, ww = (hw - 8) / 3 - 2; ho_R(rx, ry, ww, 7 * s, ho_K); ho_R(rx + 1, ry + 1, ww - 2, 5 * s, k % 3 === 1 ? ST[7] : WH[2]); ho_R(rx + 1, ry + 1, ww - 2, 1, WH[3]); ho_R(rx + 1, ry + 5 * s, ww - 2, 1, WH[0]); if (k === 1) { ho_R(rx + ww / 2 - 1, ry + 1, 3, 5 * s, RD[3]); } if (k === 4) { ho_line(rx + 2, ry + 1, rx + ww - 3, ry + 5 * s, BL[3], 2); } }
    }
    if (fill > 0) for (let r = 0; r < 2; r++) for (let c = 0; c < 4; c++) {
      const k = r * 4 + c; if (k >= Math.ceil(8 * fill)) continue;
      const ry = yh + (r === 0 ? 3 : 11) * s + 1, wr = (hw - 8 * s) / 4 + (r ? 1.5 * s : 0), rx = x - (wr * 4) / 2 + c * wr + (ho_h(k, seed + 6) - 0.5) * 1.2;
      ho_R(rx, ry, wr - 1, 6 * s, ho_K); ho_R(rx + 1, ry + 1, wr - 3, 4 * s, HO_BILL.paper2); ho_R(rx + 1, ry + 1, wr - 3, 1, WH[3]); ho_R(rx + 2, ry + 3 * s, wr - 5, 1, HO_BILL.line);
      ho_R(rx + wr / 2 - 2, ry, 3, 6 * s, SK[3]); ho_R(rx + wr / 2 - 2, ry + 1, 1, 6 * s - 1, SK[4]);
      ho_R(rx + 1, ry + 6 * s, wr - 3, 2 * s, HO_BILL.dark);
    }
    // quelques billets qui dépassent, qui frémissent
    if (open > 0.25 && (o.contents ?? 'billets') === 'billets') for (let k = 0; k < 3; k++) { const bx = x - 22 * s + k * 22 * s, by = yh + 4 * s - 3 - Math.round(Math.abs(Math.sin(t * 2 + k * 2.1)) * 1.2); ho_bill(bx, by, 0.9 * s, (k - 1) * 0.35 + Math.sin(t * 3 + k) * 0.05, 0.2); }
    if (o.glow) { ho_glow(x, yh + 6, 70 * s, '255,214,110', 0.65 * clamp(o.glow)); }
  };
  const lidOuter = a < 1.2, hh = Dp / 0.45;
  if (a <= 0.001) {                                                    // fermée : dessus de cuir
    ho_poly([[xl, yt], [xr, yt], [hx1, yh], [hx0, yh]], ho_K);
    ho_poly([[xl + 1, yt - 1], [xr - 1, yt - 1], [hx1 - 1, yh + 1], [hx0 + 1, yh + 1]], WO[4]);
    ho_poly([[xl + 3, yt - 3], [xr - 3, yt - 3], [hx1 - 2, yh + 3], [hx0 + 2, yh + 3]], WO[5]); ho_dith(hx0 + 4, yh + 4, hw - 8, 3, WO[6], 0.3);
    ho_line(xl + 1, yt - 1, hx0 + 1, yh + 1, WO[6], 1); ho_line(xr - 1, yt - 1, hx1 - 1, yh + 1, WO[3], 1);
  } else {
    drawInterior();
    // couvercle : quadrilatère de la charnière (arrière) à l'arête avant
    const q = [[hx0, yh], [hx1, yh], [fx1, lidFront], [fx0, lidFront]];
    if (lidOuter) {
      ho_poly(q.map(p => [p[0] + (p[0] < x ? -1 : 1), p[1] + (p[1] > yh ? 1 : -1)]), ho_K); ho_poly(q, WO[4]);
      ho_poly([[hx0 + 3, yh + 2], [hx1 - 3, yh + 2], [fx1 - 3, lidFront - 2], [fx0 + 3, lidFront - 2]], WO[5]);
      ho_line(fx0, lidFront, fx1, lidFront, YE[2], 1); ho_line(fx0, lidFront + 1, fx1, lidFront + 1, WO[1], 1);
    } else {
      ho_poly(q.map(p => [p[0] + (p[0] < x ? -1 : 1), p[1] + (p[1] > yh ? 1 : -1)]), ho_K); ho_poly(q, RD[2]);
      ho_poly([[hx0 + 3, yh - 2], [hx1 - 3, yh - 2], [fx1 - 3, lidFront + 3], [fx0 + 3, lidFront + 3]], RD[3]);
      for (let k = 1; k < 5; k++) { const fk = k / 5; ho_line(lerp(hx0 + 3, fx0 + 3, fk) , lerp(yh - 2, lidFront + 3, fk), lerp(hx1 - 3, fx1 - 3, fk), lerp(yh - 2, lidFront + 3, fk), RD[2], 1); }
      ho_line(hx0 + 4, yh - 3, hx1 - 4, yh - 3, YE[2], 1); ho_P(x, lerp(yh, lidFront, 0.5), YE[2]);                       // poche de doublure
      ho_R(x - 10 * s, lerp(yh, lidFront, 0.45), 20 * s, 7 * s, RD[1]); ho_R(x - 10 * s, lerp(yh, lidFront, 0.45), 20 * s, 1, RD[4]);
    }
    if (lidOuter && a > 0.05) { const ly_ = lerp(yh, lidFront, 0.5); }
    // le dessous de la charnière : trait de laiton
    ho_line(hx0, yh, hx1, yh, YE[1], 1);
  }
  // poignée de cuir (sur le dessus ; suit le couvercle)
  const hy = a <= 0.001 ? (yt + yh) / 2 : lerp(yh, lidFront, 0.5), hand = [x, hy - 7 * s];
  if (a <= 0.001 || lidOuter) {
    const hwid = 24 * s, hht = 8 * s + (a > 0 ? 4 * s * Math.sin(a) : 0);
    ho_R(x - hwid / 2 - 1, hy - hht - 1, 3 + 0, hht + 2 + 0, ho_K); ho_R(x + hwid / 2 - 2, hy - hht - 1, 3, hht + 2, ho_K); ho_R(x - hwid / 2 - 1, hy - hht - 1, hwid + 3, 4, ho_K);
    ho_R(x - hwid / 2, hy - hht, hwid + 1, 2, WO[2]); ho_R(x - hwid / 2, hy - hht, hwid + 1, 1, WO[5]); ho_R(x - hwid / 2, hy - hht, 2, hht, WO[3]); ho_R(x + hwid / 2 - 1, hy - hht, 2, hht, WO[1]);
    ho_R(x - hwid / 2 - 2, hy - 3, 6, 4, YE[1]); ho_R(x + hwid / 2 - 3, hy - 3, 6, 4, YE[1]); ho_R(x - hwid / 2 - 2, hy - 3, 6, 1, YE[3]); ho_R(x + hwid / 2 - 3, hy - 3, 6, 1, YE[3]);
    hand[1] = hy - hht;
  }
  return { handle: hand, inside, locks, top: Math.min(yh, lidFront - (a > 1.2 ? 0 : 0)), w: W, h: Hb + Dp };
}
function ho_vg(x, y, w, h, c0, c1) { const g = ho_ctx(), gr = g.createLinearGradient(0, y, 0, y + h); gr.addColorStop(0, c0); gr.addColorStop(1, c1); g.fillStyle = gr; g.globalAlpha = 0.65; g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); g.globalAlpha = 1; }

// ════════════════════════════════════════════════════════════════════════════════════════
// 5. LE TÉLÉPHONE À CHANDELIER
// ════════════════════════════════════════════════════════════════════════════════════════
// ── ho_telephone(x, y, s, t, o) : téléphone « chandelier » d'époque (socle noir, fût de laiton, cornet, combiné sur sa fourche). (x, y) = milieu du bas du socle ; ≈ 36 × 74 px à s = 1
//    o.ring 0..1 (sonnerie : le combiné et l'appareil tremblent, petits traits de sonnerie de chaque côté) · o.lift 0..1 (le combiné quitte la fourche vers o.liftTo [x, y] (défaut : 26 px à droite, 30 px plus haut) ; le cordon pend) 
//    renvoie { mouth: [x, y] (cornet), rcv: [x, y] (combiné), base: [x, y] }
function ho_telephone(x, y, s, t, o = {}) {
  o = o || {}; s = ho_fin(s, 1); const ring = clamp(o.ring ?? 0), lift = clamp(o.lift ?? 0), fr = Math.floor(t * 30);
  const jx = ring > 0 ? Math.round((ho_h(fr, 11) - 0.5) * 2 * ring * 1.2 * s) : 0, jy = ring > 0 && fr % 4 < 2 ? -Math.round(ring * 1.1 * s) : 0;
  x += jx; y += jy;
  const bw = 15 * s, bh = 5 * s;
  ho_ell(x + 2, y + 1, bw + 2, bh, 'rgba(5,4,15,0.45)');
  // socle : disque noir lustré à bague de laiton
  ho_ell(x, y - 1, bw + 1, bh + 1, ho_K); ho_ell(x, y - 1, bw, bh, NI[1]); ho_ell(x, y - 3 * s, bw - 1, bh - 1, NI[2]); ho_ell(x, y - 4 * s, bw - 3, bh - 2, ST[1]); ho_R(x - bw + 2, y - 2 * s, bw * 2 - 3, 1, YE[1]); ho_R(x - bw + 3, y - 2 * s, 6, 1, YE[3]);
  ho_ell(x - 4 * s, y - 4 * s, 4 * s, 1.5 * s, ST[3]); ho_P(x - 5 * s, y - 4 * s - 1, ST[6]);
  // fût
  const sy1 = y - 5 * s, sy0 = y - 58 * s, sw = Math.max(3, Math.round(4 * s));
  ho_R(x - sw / 2 - 1, sy0, sw + 2, sy1 - sy0, ho_K); ho_R(x - sw / 2, sy0, sw, sy1 - sy0, YE[1]); ho_R(x - sw / 2, sy0, 1, sy1 - sy0, YE[3]); ho_R(x - sw / 2 + 1, sy0, 1, sy1 - sy0, YE[2]); ho_R(x + sw / 2 - 1, sy0, 1, sy1 - sy0, YE[0]);
  for (const k of [0.12, 0.45, 0.78]) { const yy = sy1 - (sy1 - sy0) * k; ho_R(x - sw / 2 - 1, yy, sw + 2, 2, YE[2]); ho_R(x - sw / 2 - 1, yy, sw + 2, 1, YE[3]); ho_R(x - sw / 2 - 1, yy + 2, sw + 2, 1, ho_K); }
  // cornet (émetteur) en haut
  const mx = x, my = sy0 - 1;
  ho_poly([[mx - 8 * s - 1, my - 7 * s - 1], [mx + 8 * s + 1, my - 7 * s - 1], [mx + 3 * s + 1, my + 2], [mx - 3 * s - 1, my + 2]], ho_K);
  ho_poly([[mx - 8 * s, my - 7 * s], [mx + 8 * s, my - 7 * s], [mx + 3 * s, my + 1], [mx - 3 * s, my + 1]], NI[1]); ho_poly([[mx - 7 * s, my - 7 * s], [mx - 2 * s, my - 7 * s], [mx - 2 * s, my + 1], [mx - 3 * s, my + 1]], ST[2]);
  ho_ell(mx, my - 7 * s, 8 * s + 1, 2 * s + 1, ho_K); ho_ell(mx, my - 7 * s, 8 * s, 2 * s, YE[1]); ho_ell(mx, my - 7 * s, 6 * s, 1.4 * s, NI[0]); ho_ell(mx - 2 * s, my - 7 * s - 0.5, 2.5 * s, 0.8 * s, NI[3]); ho_R(mx - 8 * s, my - 7 * s, 3, 1, YE[3]);
  const mouth = [mx, my - 8 * s];
  // fourche (crochet commutateur) à gauche du fût, à 62 % de la hauteur
  const fy = y - 40 * s, fx = x - sw / 2;
  ho_line(fx, fy, fx - 7 * s, fy - 4 * s, ho_K, 3); ho_line(fx, fy, fx - 7 * s, fy - 4 * s, YE[2], 1); ho_P(fx - 7 * s, fy - 4 * s - 1, YE[3]);
  ho_line(fx, fy + 3 * s, fx - 7 * s, fy - 1 * s, ho_K, 3); ho_line(fx, fy + 3 * s, fx - 7 * s, fy - 1 * s, YE[1], 1);
  // combiné : sur la fourche ou en l'air
  const hookPos = [fx - 9 * s, fy + 2 * s], lt = o.liftTo ?? [x + 30 * s, y - 70 * s], e = eio(lift);
  const rx = lerp(hookPos[0], lt[0], e) + (ring > 0 && lift === 0 ? Math.round((ho_h(fr, 12) - 0.5) * 2 * ring * 1.5) : 0), ry = lerp(hookPos[1], lt[1], e) - Math.sin(e * Math.PI) * 6 * s + (ring > 0 && lift === 0 ? (fr % 3 === 0 ? -1 : 0) : 0), tilt = lerp(0.12, -0.6, e);
  // cordon : du bas du combiné au socle
  { const x0 = x + bw - 2 * s, y0 = y - 3 * s; let px_ = x0, py_ = y0; const sag = 14 * s * (1 - lift * 0.4);
    for (let i = 1; i <= 24; i++) { const f = i / 24, qx = lerp(x0, rx, f) + Math.sin(f * Math.PI) * 6 * s, qy = lerp(y0, ry + 9 * s, f) + Math.sin(f * Math.PI) * sag + Math.sin(f * 60) * 0.7; ho_line(px_, py_, qx, qy, ho_K, 2); px_ = qx; py_ = qy; }
    px_ = x0; py_ = y0; for (let i = 1; i <= 24; i++) { const f = i / 24, qx = lerp(x0, rx, f) + Math.sin(f * Math.PI) * 6 * s, qy = lerp(y0, ry + 9 * s, f) + Math.sin(f * Math.PI) * sag + Math.sin(f * 60) * 0.7; ho_line(px_, py_, qx, qy, i % 2 ? NI[3] : ST[2], 1); px_ = qx; py_ = qy; } }
  { const g = ho_ctx(); g.save(); g.translate(Math.round(rx), Math.round(ry)); g.rotate(tilt);
    const Rr = (xx, yy, ww, hh, c) => { g.fillStyle = c; g.fillRect(Math.round(xx), Math.round(yy), Math.round(ww), Math.round(hh)); };
    const w_ = 6 * s, h_ = 17 * s;
    Rr(-w_ / 2 - 1, -h_ / 2 - 1, w_ + 2, h_ + 2, ho_K); Rr(-w_ / 2, -h_ / 2, w_, h_, NI[1]); Rr(-w_ / 2, -h_ / 2, 2, h_, ST[3]); Rr(w_ / 2 - 1, -h_ / 2, 1, h_, NI[0]);
    Rr(-w_ / 2 - 3 * s - 1, h_ / 2 - 5 * s - 1, w_ + 6 * s + 2, 7 * s + 2, ho_K); Rr(-w_ / 2 - 3 * s, h_ / 2 - 5 * s, w_ + 6 * s, 6 * s, NI[2]); Rr(-w_ / 2 - 3 * s, h_ / 2 - 5 * s, w_ + 6 * s, 1, ST[4]); Rr(-w_ / 2 - 3 * s, h_ / 2 - 5 * s, 2, 6 * s, ST[3]);
    Rr(-w_ / 2 - 2 * s, -h_ / 2 - 3 * s, w_ + 4 * s, 4 * s, ho_K); Rr(-w_ / 2 - 2 * s + 1, -h_ / 2 - 3 * s + 1, w_ + 4 * s - 2, 3 * s, NI[2]); Rr(-w_ / 2 - 2 * s + 1, -h_ / 2 - 3 * s + 1, w_ + 4 * s - 2, 1, ST[4]);
    Rr(-w_ / 2, -1, w_, 2, YE[1]);
    g.restore(); }
  // traits de sonnerie
  if (ring > 0.05) for (const sx of [-1, 1]) for (let k = 0; k < 2; k++) { if ((fr + k * 2) % 4 < 2) { const ax = x + sx * (22 + k * 5) * s, ay = y - 34 * s - k * 6 * s; ho_line(ax, ay, ax + sx * 3 * s, ay - 3 * s, YE[3], 1); ho_line(ax, ay + 4 * s, ax + sx * 4 * s, ay + 4 * s, YE[3], 1); ho_line(ax, ay + 8 * s, ax + sx * 3 * s, ay + 11 * s, YE[3], 1); } }
  return { mouth, rcv: [rx, ry], base: [x, y] };
}

// ════════════════════════════════════════════════════════════════════════════════════════
// 6. LA MACHINE À ÉCRIRE
// ════════════════════════════════════════════════════════════════════════════════════════
// cadence de frappe : renvoie l'état de la machine à l'instant t pour une frappe démarrée en t0
//   { chars (lettres frappées depuis t0), line, col, returning (0..1 : retour de chariot en cours), key (index de la touche enfoncée ou −1), bell (true à l'instant d'une fin de ligne) }
const HO_TYPE = { N: 24, ret: 0.24 };
function ho_typing(t, t0, rate) {
  if (rate <= 0 || t < t0) return { chars: 0, line: 0, col: 0, returning: 0, key: -1, linesDone: 0 };
  const N = HO_TYPE.N, Tl = N / rate + HO_TYPE.ret, tr = t - t0, line = Math.floor(tr / Tl), u = tr - line * Tl;
  if (line > 0 && u < HO_TYPE.ret) return { chars: line * N, line, col: 0, returning: 1 - u / HO_TYPE.ret, key: -1, linesDone: line };
  const uu = line > 0 ? u - HO_TYPE.ret : u, ci = Math.floor(uu * rate), ph = uu * rate - ci;
  const prevLineGap = 0;
  void prevLineGap;
  return { chars: line * N + ci, line, col: ci, returning: 0, key: ph < 0.62 ? Math.floor(ho_h(line * 97 + ci, 5) * 38) : -1, linesDone: line, phase: ph };
}
// ── ho_machine(x, y, s, t, o) : machine à écrire d'époque (carrosserie noire à filets d'or, quatre rangées de touches rondes, rangée de barres à caractères, rouleau, chariot, feuille qui sort).
//    (x, y) = milieu du bas de la carrosserie ; 112 px de large, ≈ 70 px de haut sans la feuille, à s = 1 · o.rate frappes par seconde (défaut 9 ; 0 = au repos) · o.t0 instant du début de la frappe (défaut 0)
//    les touches s'enfoncent, la barre à caractères frappe le rouleau, le chariot glisse vers la gauche puis revient (clochette) à chaque ligne de 24 lettres, la feuille monte d'une ligne
//    o.paper 0..1 (hauteur de feuille visible au-dessus du rouleau : 0 aucune, 1 = 44 px à s = 1 ; passer de 0 à 1 = la feuille qu'on engage) · o.head true (en-tête MINISTERE imprimé en haut de la feuille) · o.light (lueur ambre de la lampe)
//    renvoie { platen: [x, y], paper: [x, y, w, h], mouth: [x, y] (point de frappe), top: y, line, col, returning, w, h }
function ho_machine(x, y, s, t, o = {}) {
  o = o || {}; s = ho_fin(s, 1); const rate = o.rate ?? 9, t0 = o.t0 ?? 0, ty = ho_typing(t, t0, rate), N = HO_TYPE.N, pap = clamp(o.paper ?? 0.8);
  const S = v => v * s, X_ = v => x + v * s, Y_ = v => y + v * s;
  const bw0 = 112, bw1 = 98;
  ho_ell(x + 3, y + 1, S(58), S(4), 'rgba(5,4,15,0.5)');
  // ── boîtier : trapèze noir lustré, filet d'or, plaque de laiton
  const body = [[X_(-bw0 / 2), Y_(0)], [X_(bw0 / 2), Y_(0)], [X_(bw1 / 2), Y_(-38)], [X_(-bw1 / 2), Y_(-38)]];
  ho_poly(body.map(p => [p[0] + (p[0] < x ? -1 : 1), p[1] + (p[1] < y - 10 ? -1 : 1)]), ho_K); ho_poly(body, NI[1]);
  ho_poly([[X_(-bw0 / 2 + 2), Y_(-1)], [X_(-bw0 / 2 + 8), Y_(-1)], [X_(-bw1 / 2 + 3), Y_(-37)], [X_(-bw1 / 2 + 1), Y_(-37)]], ST[2]);       // reflet gauche
  ho_R(X_(-bw0 / 2), Y_(-2), S(bw0), Math.max(1, S(2)), ST[1]);
  ho_R(X_(-bw0 / 2 + 3), Y_(-7), S(bw0 - 6), 1, YE[0]); ho_R(X_(-bw0 / 2 + 3), Y_(-6), S(bw0 - 6), 1, YE[1]);
  ho_R(X_(-18), Y_(-5), S(36), S(3), YE[1]); ho_R(X_(-18), Y_(-5), S(36), 1, YE[3]); ho_R(X_(-15), Y_(-4), S(30), 1, YE[0]);              // plaque de nom
  // ── plateau de touches : 4 rangées en arc, barre d'espacement
  const rows = [[11, -34, 4.4], [10, -28.5, 4.9], [9, -23, 5.4], [8, -17.5, 5.9]], pressed = ty.key;
  ho_R(X_(-47), Y_(-37), S(94), S(25), NI[0]);
  let ki = 0;
  for (const [n, yy, rad] of rows) for (let i = 0; i < n; i++, ki++) {
    const kx = x + (i - (n - 1) / 2) * 7.6 * s * (1 + (yy + 34) * 0.004), down = ki === pressed ? 1 : 0, ky = Y_(yy) + (down ? Math.max(1, S(1.2)) : 0);
    const r1 = Math.max(2, Math.round(rad * 0.5 * s)); ho_disc(kx, ky + 1, r1, ho_K); ho_disc(kx, ky, r1, ST[6]); ho_disc(kx, ky, r1 - 1, down ? ST[4] : WH[2]);
    ho_P(kx, ky, NI[1]); if (s >= 1.5) { ho_P(kx - 1, ky, NI[1]); ho_P(kx, ky - 1, NI[1]); } if (!down) ho_P(kx - 1, ky - 1, WH[3]);
  }
  const spDown = pressed === 36 || pressed === 37 ? 1 : 0;
  ho_R(X_(-23), Y_(-12) + (spDown ? 1 : 0), S(46), Math.max(2, S(3.4)), ST[6]); ho_R(X_(-23), Y_(-12) + (spDown ? 1 : 0), S(46), 1, WH[3]); ho_R(X_(-23), Y_(-10) + (spDown ? 1 : 0), S(46), 1, ST[3]);
  // ── éventail des barres à caractères (au-dessus du clavier) : arcs de tiges nickelées, la barre active frappe
  const bx0 = x, by0 = Y_(-38), pr = Y_(-60), pxx = x;                     // base de l'éventail et point de frappe
  ho_poly([[X_(-44), Y_(-38)], [X_(44), Y_(-38)], [X_(34), Y_(-52)], [X_(-34), Y_(-52)]], NI[0]);
  for (let i = 0; i < 29; i++) { const f = (i + 0.5) / 29 - 0.5, ax = x + f * 74 * s, ay = Y_(-40 - 11 * (1 - Math.abs(f) * 1.1)); ho_line(ax, Y_(-38), x + f * 36 * s, ay, i % 2 ? ST[4] : ST[5], 1); ho_P(x + f * 36 * s, ay - 1, ST[7]); }
  if (pressed >= 0) {                                                       // une barre se lève vers le rouleau
    const f = ((pressed % 29) + 0.5) / 29 - 0.5, up = ty.phase < 0.3 ? ty.phase / 0.3 : 1 - (ty.phase - 0.3) / 0.32; const k = clamp(up);
    ho_line(x + f * 74 * s, Y_(-38), lerp(x + f * 74 * s, pxx, k), lerp(Y_(-38), Y_(-58), k), ST[7], 1); ho_P(lerp(x + f * 74 * s, pxx, k), lerp(Y_(-38), Y_(-58), k) - 1, WH[3]);
  }
  ho_R(X_(-36), Y_(-53), S(72), Math.max(1, S(2)), ST[1]);
  // ── rubans : deux bobines de chaque côté, sur le dessus
  for (const sx of [-1, 1]) { const bxx = x + sx * 41 * s, byy = Y_(-62); ho_disc(bxx, byy, Math.round(6 * s), ho_K); ho_disc(bxx, byy, Math.round(5 * s), NI[2]); ho_disc(bxx, byy, Math.round(3 * s), NI[0]); ho_disc(bxx, byy, Math.max(1, Math.round(1.5 * s)), ST[6]); ho_P(bxx - 2 * s, byy - 2 * s, ST[5]); ho_R(bxx - 1, Y_(-56), 3, S(5), NI[0]); }
  // ── chariot : rails, rouleau, molettes, feuille. Décalage horizontal selon la frappe
  const cx_ = -(ty.returning > 0 ? (1 - eio(1 - ty.returning)) * N * 1.0 : ty.col * 1.0) * (0.9) * 1;
  const cOff = Math.round(S(cx_) * 1.0);
  const px0 = x - S(50) + cOff, plw = S(100), platY = Y_(-62), phh = Math.max(4, S(8));
  ho_R(x - S(52), Y_(-54), S(104), Math.max(2, S(3)), ST[3]); ho_R(x - S(52), Y_(-54), S(104), 1, ST[7]);                                   // rail
  // feuille derrière le rouleau : elle monte d'une ligne à chaque retour de chariot (la tête de la feuille suit)
  const lineStep = Math.max(3, S(4)), TL_ = Math.min(ty.line, 9), adv = TL_ * 4 - (ty.returning > 0 && ty.line <= 9 ? 4 * eio(ty.returning) : 0), up = S(adv);
  const paperW = S(60), paperH = S(44) * pap + up * (pap > 0.02 ? 1 : 0), pcx = x + cOff, ptop = platY - phh / 2 - paperH;
  const paper = [pcx - paperW / 2, ptop, paperW, paperH];
  if (pap > 0.02) {
    ho_R(paper[0] - 1, paper[1] - 1, paper[2] + 2, paper[3] + 2, ho_K); ho_R(paper[0], paper[1], paper[2], paper[3], WH[2]); ho_R(paper[0], paper[1], 1, paper[3], WH[3]); ho_R(paper[0] + paper[2] - 1, paper[1], 1, paper[3], WH[0]);
    const yBase = platY - phh / 2 - S(2);
    if (o.head !== false) { const hy = paper[1] + S(4); ho_R(paper[0] + S(5), hy, paper[2] - S(10), Math.max(2, S(4)), NI[1]); ho_R(paper[0] + S(5), hy + Math.max(2, S(4)), paper[2] - S(10), 1, YE[1]); ho_R(paper[0] + S(16), hy + S(1), S(28), 1, WH[3]); ho_lines(paper[0] + S(6), hy + S(9), paper[2] - S(12), 2, Math.max(3, S(3)), ST[3], 5, 1, { full: true, indent: 0 }); }
    const totalLines = TL_ + 1;
    for (let L_ = 0; L_ < totalLines; L_++) {
      const ly = yBase - (TL_ - L_) * lineStep + (ty.returning > 0 && ty.line <= 9 ? lineStep * eio(ty.returning) : 0);
      const cnt = L_ < TL_ ? N : ty.col;
      for (let c = 0; c < cnt; c++) { if (ho_h(L_ * 53 + c, 9) < 0.14 || (c % 6 === 5 && ho_h(L_ * 13 + c, 3) < 0.6)) continue; ho_R(paper[0] + S(6) + c * S(2), ly - Math.max(1, S(1)), Math.max(1, S(1)), Math.max(2, S(2)), NI[2]); }
    }
    ho_R(paper[0] - S(2), platY - phh / 2 - Math.max(1, S(1)), paper[2] + S(4), Math.max(1, S(2)), ST[5]);        // barre de maintien
  }
  // rouleau : cylindre noir lustré, molettes nickelées aux extrémités
  ho_R(px0 - 1, platY - phh / 2 - 1, plw + 2, phh + 2, ho_K); ho_R(px0, platY - phh / 2, plw, phh, NI[0]); ho_R(px0, platY - phh / 2 + 1, plw, Math.max(1, S(2)), NI[3]); ho_R(px0 + 4, platY - phh / 2 + 1, S(30), 1, ST[3]); ho_R(px0, platY + phh / 2 - 2, plw, 2, NI[2]);
  for (const sx of [0, 1]) { const kx = px0 + sx * plw + (sx ? S(4) : -S(4)); ho_R(kx - S(3), platY - S(5), S(6), S(10), ho_K); ho_R(kx - S(3) + 1, platY - S(5) + 1, S(6) - 2, S(10) - 2, ST[5]); ho_R(kx - S(3) + 1, platY - S(5) + 1, 1, S(10) - 2, ST[7]); for (let q = 0; q < 4; q++) ho_R(kx - S(2), platY - S(4) + q * S(2.2), S(4), 1, ST[2]); }
  // levier de retour de chariot (à gauche du chariot) : bascule lors du retour
  { const lx = px0 - S(7), ly = platY - S(2), sw = ty.returning > 0 ? Math.sin(ty.returning * Math.PI) : 0; ho_line(lx, ly, lx - S(9), ly - S(8) + sw * S(8), ho_K, 3); ho_line(lx, ly, lx - S(9), ly - S(8) + sw * S(8), ST[6], 1); ho_disc(lx - S(9), ly - S(8) + sw * S(8), Math.max(2, Math.round(2 * s)), NI[1]); ho_P(lx - S(9) - 1, ly - S(8) + sw * S(8) - 1, ST[5]); }
  // point d'impression : petite marque + éclat quand la barre frappe
  if (pressed >= 0 && ty.phase > 0.25 && ty.phase < 0.5) { ho_P(pxx + 0, platY + phh / 2 + 1, WH[3]); }
  if (o.light) ho_glow(x - S(30), Y_(-30), S(60), '255,170,60', 0.18 * o.light);
  return { platen: [x, platY], paper, mouth: [pxx, platY], top: ptop, line: ty.line, col: ty.col, returning: ty.returning, w: S(bw0), h: S(70 + 44 * pap), bell: ty.returning > 0.9 };
}

// ════════════════════════════════════════════════════════════════════════════════════════
// 7. LE LUSTRE DE CRISTAL, LES RIDEAUX, LES FENÊTRES, LES COLONNES (briques du grand salon)
// ════════════════════════════════════════════════════════════════════════════════════════
// ── ho_lustre(x, y, s, t, o) : lustre à pampilles. (x, y) = point d'attache au plafond (début de la chaîne) ; ≈ 108 px de large et 130 de haut à s = 1
//    o.glow 1 (intensité de la lueur chaude, additive) · o.sparkle 1 (scintillement des cristaux) · o.flame 1 (bougies allumées, 0 = éteintes) · o.sway (px d'oscillation lente, défaut 0,6) · o.chain (longueur de chaîne en px, défaut 22)
//    renvoie { x, y (centre de la lueur), bottom: y de la pointe, w, rings: [{y, rx}] }
const HO_LUS = { rings: [[34, 20, 4], [56, 34, 6], [80, 48, 8]], seed: 5 };
function ho_lustre(x, y, s, t, o = {}) {
  o = o || {}; s = ho_fin(s, 1); const spk = o.sparkle ?? 1, fl = o.flame ?? 1, sw = (o.sway ?? 0.6) * Math.sin(t * 0.9), ch = (o.chain ?? 22) * s, glow = o.glow ?? 1, fr = Math.floor(t * 30);
  x += sw * s;
  const top = y, hub = y + ch, cx = x;
  const glints = [];
  if (glow > 0) { ho_glow(cx, hub + 52 * s, 140 * s, '255,150,50', 0.46 * glow); ho_glow(cx, hub + 52 * s, 70 * s, '255,196,120', 0.4 * glow); }
  // chaîne + rosace
  for (let i = 0; i < ch; i += 3) { ho_R(cx - 1, top + i, 2, 2, YE[2]); ho_R(cx, top + i + 1, 1, 1, YE[0]); }
  ho_R(cx - 4 * s, top - 1, 8 * s, 2, YE[1]); ho_R(cx - 5 * s, top, 10 * s, 1, YE[2]);
  // colonne centrale (laiton tourné)
  const stemBot = hub + 92 * s;
  ho_R(cx - 1, hub, 3, stemBot - hub, YE[1]); ho_R(cx - 1, hub, 1, stemBot - hub, YE[3]); ho_R(cx + 1, hub, 1, stemBot - hub, YE[0]);
  ho_ell(cx, hub + 4 * s, 5 * s, 4 * s, ho_K); ho_ell(cx, hub + 4 * s, 4 * s, 3.2 * s, YE[1]); ho_ell(cx - 1, hub + 3 * s, 2 * s, 1.5 * s, YE[3]);
  const R_ = HO_LUS.rings;
  const crystal = (qx, qy, ln, k, big) => {
    // pendeloque : losange allongé ; les cristaux scintillent à tour de rôle
    const ph = ho_h(k, HO_LUS.seed + 40), per = 1.7 + ho_h(k, HO_LUS.seed + 41) * 2.2, g = Math.pow(Math.max(0, Math.sin(TAU * (t / per + ph))), 14) * spk;
    const w = big ? 2 : 1, c1 = g > 0.35 ? WH[3] : WH[2], c0 = g > 0.35 ? YE[3] : (k % 4 === 0 ? CY[4] : NE[3]);
    if (ln < 4) { ho_P(qx, qy, c1); if (g > 0.5) glints.push([qx, qy, g]); return; }
    const wm = (big ? 2.2 : 1.5) * Math.max(1, s * 0.8);
    ho_P(qx, qy, YE[2]);
    for (let j = 1; j < ln; j++) { const f = j / (ln - 1), hw = Math.max(j < ln - 1 ? 0 : 0, Math.round(wm * Math.sin(Math.PI * Math.pow(f, 0.62)))); if (hw === 0) { ho_P(qx, qy + j, f > 0.5 ? NE[1] : YE[1]); continue; }
      ho_R(qx - hw, qy + j, hw * 2 + 1, 1, c0); ho_P(qx - hw, qy + j, c1); if (hw > 1) ho_P(qx - hw + 1, qy + j, WH[3]); ho_P(qx + hw, qy + j, f > 0.6 ? CY[3] : NE[1]); }
    if (g > 0.4) glints.push([qx, qy + ln * 0.45, g]);
  };
  R_.forEach(([ry, rrx, nCandle], ri) => {
    const rx = rrx * s, ryy = hub + ry * s, ey = rx * 0.2, n = Math.round(rrx / 3.4) + 4;
    // anneau de laiton (ellipse : arrière puis avant)
    for (let a = Math.PI; a < TAU; a += 0.08) { ho_P(cx + Math.cos(a) * rx, ryy + Math.sin(a) * ey, YE[0]); }
    // les festons de perles entre les points de l'anneau
    const pts = []; for (let i = 0; i < n; i++) { const a = i / n * TAU + ri * 0.4; pts.push([cx + Math.cos(a) * rx, ryy + Math.sin(a) * ey, Math.sin(a)]); }
    // arrière d'abord (sin < 0), puis avant
    for (const front of [false, true]) {
      pts.forEach((p, i) => {
        if ((p[2] >= 0) !== front) return; const q = pts[(i + 1) % n];
        if ((q[2] >= 0) === front || !front) { const sag = (5 + ri) * s; for (let u = 0; u <= 1.001; u += 0.2) { const bx = lerp(p[0], q[0], u), by = lerp(p[1], q[1], u) + Math.sin(u * Math.PI) * sag; ho_P(bx, by, u * 5 % 2 < 1 ? NE[3] : CY[4]); } }
        const ln = Math.round((9 + ((i + ri) % 3) * 4 + ri * 1.5) * s); crystal(Math.round(p[0]), Math.round(p[1] + 1), ln, ri * 40 + i, ri === 2 && (i % 2 === 0));
      });
      if (front) { for (let a = 0; a < Math.PI; a += 0.08) { ho_P(cx + Math.cos(a) * rx, ryy + Math.sin(a) * ey, YE[2]); ho_P(cx + Math.cos(a) * rx, ryy + Math.sin(a) * ey + 1, YE[0]); } }
    }
    // bras et bougies
    for (let i = 0; i < nCandle; i++) {
      const a = (i + 0.5) / nCandle * TAU + ri * 0.6, bx = cx + Math.cos(a) * rx, by = ryy + Math.sin(a) * ey;
      ho_line(bx, by, bx + Math.cos(a) * 2 * s, by - 5 * s, YE[1], 1); ho_R(bx + Math.cos(a) * 2 * s - 1, by - 6 * s, 3, 2, YE[2]);
      const cxx = bx + Math.cos(a) * 2 * s, cyy = by - 6 * s; ho_R(cxx - 1, cyy - 5 * s, 2, 5 * s, WH[2]); ho_P(cxx - 1, cyy - 5 * s, WH[3]);
      if (fl > 0) {
        const fk = Math.floor(t * 9 + i * 1.7 + ri * 3), fh = ho_h(fk, 3 + i) , fh_ = 0.5 + 0.5 * Math.sin(t * 13 + i * 2.1 + ri), fy = cyy - 5 * s - 3 - Math.round(fh_);
        ho_P(cxx - 1, fy + 1, AM[7]); ho_R(cxx - 1, fy, 2, 2, YE[3]); ho_P(cxx - 1, fy - 1, fh > 0.5 ? AM[8] : YE[2]); ho_P(cxx - 1, fy, WH[3]); ho_P(cxx, fy + 1, WH[3]);
        if (glow > 0) ho_glow(cxx, fy, 12 * s, '255,170,70', 0.26 * fl * glow);
      }
    }
    // joug : disque de laiton sur la colonne
    ho_ell(cx, ryy, 4 * s, 2 * s, YE[1]);
  });
  // grande pampille centrale et boule de cristal
  const by0 = stemBot, bl = Math.round(15 * s);
  ho_poly([[cx - 4 * s, by0], [cx + 4 * s, by0], [cx + 1, by0 + bl], [cx - 1, by0 + bl]], ho_K); ho_poly([[cx - 3 * s, by0 + 1], [cx + 3 * s, by0 + 1], [cx + 0.5, by0 + bl - 1], [cx - 0.5, by0 + bl - 1]], CY[4]);
  ho_R(cx - 2 * s, by0 + 1, 1, Math.round(bl * 0.55), WH[3]); ho_R(cx + 1, by0 + 2, 1, Math.round(bl * 0.4), CY[3]); ho_ell(cx, by0 - 1, 3 * s, 2 * s, YE[2]);
  glints.push([cx - 1, by0 + bl * 0.4, Math.pow(Math.max(0, Math.sin(TAU * (t / 2.3 + 0.2))), 10) * spk]);
  // éclats en croix
  for (const [gx, gy, g] of glints) {
    if (g < 0.5) continue; const L_ = Math.round(1.5 + g * 3.5 * s);
    ho_P(gx, gy, WH[3]); ho_R(gx - L_, gy, L_ * 2 + 1, 1, g > 0.8 ? WH[3] : YE[3]); ho_R(gx, gy - L_, 1, L_ * 2 + 1, g > 0.8 ? WH[3] : YE[3]);
    if (g > 0.85) { ho_P(gx - 1, gy - 1, YE[3]); ho_P(gx + 1, gy + 1, YE[3]); ho_P(gx + 1, gy - 1, YE[3]); ho_P(gx - 1, gy + 1, YE[3]); }
  }
  return { x: cx, y: hub + 52 * s, bottom: by0 + bl, w: 104 * s, rings: R_.map(r => ({ y: hub + r[0] * s, rx: r[1] * s })) };
}

// ── rideau de velours rouge (sprite en cache) : w × h, accroché à GAUCHE (miroir pour la droite) ; plis, pincé par un embrasse dorée, frange d'or en bas
function ho_curtainSprite(w, h, seed = 1, flip = false) {
  return ho_cache(`curtain:${w}:${h}:${seed}:${flip ? 1 : 0}`, w + 4, h + 6, () => {
    const g = ho_ctx(), yc = h * 0.58, tones = [RD[0], RD[1], RD[2], RD[3], RD[4]];
    const rEdge = y => { const k = y < yc ? ho_ss(0, 1, 1 - y / yc) : ho_ss(0, 1, (y - yc) / (h - yc)); return w * (y < yc ? 0.74 + 0.26 * k : 0.7 + 0.35 * k); };
    for (let y = 0; y < h; y++) {
      const re = rEdge(y), fw = 4.2 + 2 * (y / h);
      for (let x = 0; x < re; x++) {
        const xx = flip ? w - 1 - x : x;
        const ph = (x + Math.sin(y * 0.045 + seed) * 2.2 + ho_n1(y / 12, seed) * 3) / fw, fr = ph - Math.floor(ph);
        let b = 0.2 + 0.8 * Math.pow(Math.sin(fr * Math.PI), 1.4);                // crête claire, creux sombre
        b *= 0.55 + 0.45 * (1 - Math.abs(x / re - (flip ? 0.7 : 0.3)) * 0.9);
        b += (ho_bay(xx, y) - 0.5) * 0.45; if (flip) b += 0; const idx = clamp(Math.floor(b * 4.9), 0, 4);
        g.fillStyle = tones[idx]; g.fillRect(xx, y + 3, 1, 1);
      }
      // bord libre sombre
      const ex = Math.round(re); g.fillStyle = ho_K; g.fillRect(flip ? w - 1 - ex : ex, y + 3, 1, 1);
    }
    // embrasse : cordon d'or + gland
    const ey = Math.round(yc), er = Math.round(rEdge(yc));
    for (let x = 0; x < er; x++) { const xx = flip ? w - 1 - x : x; g.fillStyle = YE[2]; g.fillRect(xx, ey + 3 + Math.round(Math.sin(x * 0.5) * 0.6), 1, 2); g.fillStyle = YE[3]; g.fillRect(xx, ey + 3, 1, 1); }
    const tx = flip ? w - er : er - 2; g.fillStyle = YE[1]; g.fillRect(tx, ey + 5, 3, 8); g.fillStyle = YE[3]; g.fillRect(tx, ey + 5, 1, 8); g.fillStyle = YE[0]; g.fillRect(tx + 2, ey + 8, 1, 5);
    // frange du bas
    for (let x = 0; x < rEdge(h - 1); x += 2) { const xx = flip ? w - 1 - x : x; g.fillStyle = YE[2]; g.fillRect(xx, h + 1, 1, 3); g.fillStyle = YE[0]; g.fillRect(xx, h + 4, 1, 1); }
    // contour du haut
    g.fillStyle = YE[1]; g.fillRect(0, 2, w, 1);
  });
}
// dessine un rideau en le cisaillant selon le vent / les courants d'air (sway px au bord inférieur)
function ho_curtain(x, y, w, h, t, o = {}) {
  const flip = !!o.flip, sp = ho_curtainSprite(w, h, o.seed ?? 1, flip), sway = o.sway ?? 1.6, g = ho_ctx();
  const x0 = flip ? x - w : x;
  g.save(); g.imageSmoothingEnabled = false;
  for (let j = 0; j < h + 6; j += 6) {
    const f = clamp((j + 3) / h), dx = Math.round(Math.sin(t * 0.8 + (o.phase ?? 0) + j * 0.03) * sway * f * f * (flip ? -1 : 1) + (o.lean ?? 0) * f), hh = Math.min(6, h + 6 - j);
    g.drawImage(sp, 0, j, sp.width, hh, x0 + dx, y + j - 3, sp.width, hh);
  }
  g.restore();
}
// fenêtre cintrée sur la nuit (sprite en cache) : cadre doré, croisillons, lumières lointaines de la ville
function ho_windowSprite(w, h, seed = 2, night = 1) {
  return ho_cache(`win:${w}:${h}:${seed}:${night}`, w + 8, h + 10, () => {
    const g = ho_ctx(), ox = 4, oy = 4, r = w / 2;
    const arch = (x0, y0, ww, hh, c) => { const rr = ww / 2; ho_R(x0, y0 + rr, ww, hh - rr, c); for (let dy = 0; dy < rr; dy++) { const hw = Math.sqrt(Math.max(0, rr * rr - (rr - dy - 0.5) * (rr - dy - 0.5))); ho_R(x0 + rr - hw, y0 + dy, hw * 2, 1, c); } };
    arch(ox - 3, oy - 3, w + 6, h + 4, ho_K); arch(ox - 2, oy - 2, w + 4, h + 3, YE[0]); arch(ox - 1, oy - 1, w + 2, h + 2, YE[2]); arch(ox, oy, w, h, YE[1]);
    const gx = ox + 3, gy = oy + 3, gw = w - 6, gh = h - 6, rr = gw / 2;
    // vitre : nuit bleue, plus claire vers le bas (lueur de la ville)
    for (let y = 0; y < gh; y++) {
      let hw = gw / 2; if (y < rr) hw = Math.sqrt(Math.max(0, rr * rr - (rr - y - 0.5) * (rr - y - 0.5)));
      const f = y / gh; for (let x = 0; x < gw; x++) { const dx = Math.abs(x + 0.5 - gw / 2); if (dx > hw) continue; const b = f * 0.8 + (ho_bay(x, y) - 0.5) * 0.3 + (night ? 0 : 0.5); const idx = Math.floor(clamp(b, 0, 0.99) * 6); g.fillStyle = [NI[2], NI[3], NI[4], NI[4], NI[5], BL[1]][idx]; g.fillRect(gx + x, gy + y, 1, 1); }
    }
    // lumières de la ville et étoiles
    const rg = rng(seed * 11 + 3);
    for (let i = 0; i < 14; i++) { const lx = gx + 2 + rg() * (gw - 4), ly = gy + gh * (0.55 + rg() * 0.42); g.fillStyle = rg() < 0.7 ? AM[8] : YE[3]; g.fillRect(Math.round(lx), Math.round(ly), 1, 1); if (rg() < 0.3) g.fillRect(Math.round(lx) + 1, Math.round(ly), 1, 1); }
    for (let i = 0; i < 6; i++) { const lx = gx + 3 + rg() * (gw - 6), ly = gy + rg() * gh * 0.4; if (Math.abs(lx - gx - gw / 2) < Math.max(0, Math.sqrt(Math.max(0, rr * rr - Math.pow(rr - (ly - gy), 2))) - 1)) { g.fillStyle = NI[7]; g.fillRect(Math.round(lx), Math.round(ly), 1, 1); } }
    // toits de la ville en silhouette (en bas)
    for (let x = 0; x < gw; x++) { const hgt = 3 + Math.floor(ho_n1(x / 5, seed) * 7); g.fillStyle = NI[1]; g.fillRect(gx + x, gy + gh - hgt, 1, hgt); if (rg() < 0.05) { g.fillStyle = AM[7]; g.fillRect(gx + x, gy + gh - hgt + 1 + Math.floor(rg() * 2), 1, 1); } }
    // croisillons dorés (deux montants, deux traverses) + reflet diagonal
    g.fillStyle = YE[1]; g.fillRect(gx + Math.round(gw / 2) - 1, gy, 2, gh); g.fillRect(gx, gy + Math.round(gh * 0.3), gw, 2); g.fillRect(gx, gy + Math.round(gh * 0.62), gw, 2);
    g.fillStyle = YE[3]; g.fillRect(gx + Math.round(gw / 2) - 1, gy, 1, gh); g.fillRect(gx, gy + Math.round(gh * 0.3), gw, 1); g.fillRect(gx, gy + Math.round(gh * 0.62), gw, 1);
    g.fillStyle = 'rgba(176,200,244,0.22)'; for (let k = 0; k < 3; k++) { g.beginPath(); g.moveTo(gx + 4 + k * 9, gy + gh); g.lineTo(gx + 7 + k * 9, gy + gh); g.lineTo(gx + 17 + k * 9, gy + gh * 0.45); g.lineTo(gx + 14 + k * 9, gy + gh * 0.45); g.fill(); }
    // appui de marbre
    g.fillStyle = ho_K; g.fillRect(ox - 4, oy + h - 1, w + 8, 5); g.fillStyle = WH[1]; g.fillRect(ox - 3, oy + h, w + 6, 3); g.fillStyle = WH[3]; g.fillRect(ox - 3, oy + h, w + 6, 1); g.fillStyle = WH[0]; g.fillRect(ox - 3, oy + h + 2, w + 6, 1);
  });
}
// colonne cannelée de marbre à chapiteau doré (sprite en cache) : w × h ; face éclairée à droite si lit = 1 (la lumière vient du centre de la salle)
function ho_columnSprite(w, h, lit = 1, seed = 3) {
  return ho_cache(`col:${w}:${h}:${lit}:${seed}`, w + 4, h + 2, () => {
    const g = ho_ctx(), capH = Math.round(h * 0.075), baseH = Math.round(h * 0.05), plH = Math.round(h * 0.03), sw = Math.round(w * 0.82), sx0 = Math.round((w - sw) / 2), fl = Math.max(3, Math.round(w / 8));
    // fût
    for (let y = capH + 4; y < h - baseH - plH; y++) for (let x = 0; x < sw; x++) {
      const u = x / (sw - 1), side = lit > 0 ? u : 1 - u, ph = (x / fl) % 1, flute = 0.5 + 0.5 * Math.cos(ph * TAU);
      const b = 0.3 + 0.55 * Math.pow(side, 1.2) + 0.18 * flute - 0.12 * (1 - Math.min(1, (y - capH) / 30)) * 0 + (ho_bay(x, y) - 0.5) * 0.28;
      g.fillStyle = [ST[2], ST[4], ST[5], ST[6], WH[0], WH[1], WH[2]][clamp(Math.floor(b * 6.4), 0, 6)]; g.fillRect(sx0 + x, y + 2, 1, 1);
    }
    g.fillStyle = ho_K; g.fillRect(sx0 - 1, capH + 4, 1, h - baseH - plH - capH - 4); g.fillRect(sx0 + sw, capH + 4, 1, h - baseH - plH - capH - 4);
    // chapiteau : tailloir, feuilles d'acanthe, volutes
    const cy0 = 2; g.fillStyle = ho_K; g.fillRect(0, cy0, w, capH + 3); g.fillStyle = YE[1]; g.fillRect(1, cy0 + 1, w - 2, 4); g.fillStyle = YE[3]; g.fillRect(1, cy0 + 1, w - 2, 1); g.fillStyle = YE[0]; g.fillRect(1, cy0 + 4, w - 2, 1);
    for (let x = 2; x < w - 2; x++) { const hh = capH - 3 - Math.round(Math.abs(Math.sin(x * 0.9)) * 2); g.fillStyle = (x + seed) % 3 === 0 ? YE[3] : (x % 3 === 1 ? YE[2] : YE[1]); g.fillRect(x, cy0 + 5, 1, Math.max(2, hh)); }
    for (const sx of [2, w - 5]) { g.fillStyle = YE[2]; g.fillRect(sx, cy0 + 3, 3, 3); g.fillStyle = YE[0]; g.fillRect(sx + 1, cy0 + 4, 1, 1); }
    // base : tores et plinthe
    const by0 = h - baseH - plH; g.fillStyle = ho_K; g.fillRect(1, by0 + 1, w - 2, baseH + plH + 1);
    g.fillStyle = YE[1]; g.fillRect(2, by0 + 2, w - 4, 2); g.fillStyle = YE[3]; g.fillRect(2, by0 + 2, w - 4, 1); g.fillStyle = YE[0]; g.fillRect(2, by0 + 3, w - 4, 1);
    g.fillStyle = WH[1]; g.fillRect(2, by0 + 4, w - 4, baseH + plH - 3); g.fillStyle = WH[3]; g.fillRect(2, by0 + 4, w - 4, 1); g.fillStyle = WH[0]; g.fillRect(2, h - 2, w - 4, 1);
  });
}

// ════════════════════════════════════════════════════════════════════════════════════════
// 8. LE GRAND SALON DORÉ : décor (mur, fenêtres, rideaux, parquet, tapis, lustre, colonnes, poussière) en plan moyen ou en fond flou
// ════════════════════════════════════════════════════════════════════════════════════════
const HO_SAL = { vp: [135, 190], hz: 58, wallY: 248, lx: 30, xs: [80, 165, 250], wy: 70, ww: 46, wh: 146, chand: [165, 108] };
// mur du fond + plafond (sprite 330 × 262, x local = x écran + 30) : lumière du lustre en dégradé tramé, cadres dorés, fenêtres, corniche, lambris
function ho_salonFar() {
  return ho_cache('salonFar', 330, 262, () => {
    const g = ho_ctx(), tones = [AM[1], AM[2], AM[3], AM[4], AM[5], AM[6], AM[7], AM[8], AM[9]], [cx, cy] = HO_SAL.chand;
    for (let y = 0; y < 262; y++) for (let x = 0; x < 330; x++) {
      const d = Math.hypot((x - cx) * 0.8, (y - cy) * 1.0) / 230, I = Math.pow(clamp(1 - d), 1.15);
      let f = 0.1 + I * 0.82 - (y < 44 ? 0.08 : 0) - (y > 226 ? 0.14 : 0); f += (ho_bay(x, y) - 0.5) * 0.12;
      g.fillStyle = tones[clamp(Math.floor(f * 8.6), 0, 8)]; g.fillRect(x, y, 1, 1);
    }
    const litAt = (x, y) => clamp(1 - Math.hypot((x - cx) * 0.8, (y - cy)) / 230);
    // plafond : poutres en perspective vers le centre, rosace
    for (let i = -3; i <= 3; i++) { const x0 = cx + i * 58, x1 = cx + i * 46; ho_line(x0, 0, x1, 40, AM[3], 1); ho_line(x0 + 1, 0, x1 + 1, 40, AM[7], 1); }
    ho_ell(cx, 0, 26, 12, AM[5]); ho_ell(cx, 0, 24, 10, AM[6]); ho_ell(cx, 0, 20, 8, AM[7]); ho_ell(cx, 0, 14, 5, AM[8]); ho_ell(cx, -1, 8, 3, AM[9]);
    for (let a = 0; a < 9; a++) ho_line(cx + (a - 4) * 5, 0, cx + (a - 4) * 6, 10, AM[5], 1);
    // corniche dorée à denticules (tons d'ambre : le jaune pur tire sur le vert une fois tramé)
    ho_R(0, 40, 330, 2, AM[9]); ho_R(0, 42, 330, 2, AM[8]); ho_R(0, 44, 330, 1, AM[7]);
    for (let x = 0; x < 330; x += 4) { ho_R(x, 45, 3, 3, AM[7]); ho_R(x, 45, 3, 1, AM[9]); ho_R(x, 48, 3, 1, AM[3]); }
    ho_R(0, 48, 330, 1, AM[3]); ho_R(0, 49, 330, 1, AM[8]); ho_R(0, 50, 330, 1, AM[2]);
    ho_dith(0, 51, 330, 6, AM[1], 0.5);
    // lambris du bas
    ho_R(0, 218, 330, 2, YE[1]); ho_R(0, 218, 330, 1, YE[3]); ho_R(0, 220, 330, 1, AM[2]);
    for (let x = 0; x < 330; x += 34) { ho_R(x + 3, 224, 28, 18, AM[3]); ho_R(x + 3, 224, 28, 1, AM[1]); ho_R(x + 3, 224, 1, 18, AM[1]); ho_R(x + 4, 225, 26, 16, AM[4]); ho_R(x + 4, 225, 26, 1, AM[5]); ho_R(x + 4, 241, 26, 1, AM[2]); ho_R(x + 29, 225, 1, 16, AM[3]); ho_dith(x + 4, 230, 26, 11, AM[2], 0.3 + 0.4 * (1 - litAt(x + 17, 235))); }
    ho_R(0, 244, 330, 4, WO[1]); ho_R(0, 244, 330, 1, WO[4]); ho_R(0, 248, 330, 1, ho_K);
    // travées entre les fenêtres : cadres dorés moulurés + rosace
    for (const bx of [122, 208, 36, 294]) {
      const x0 = bx - 17, y0 = 74, w_ = 34, h_ = 134;
      ho_R(x0 - 1, y0 - 1, w_ + 2, h_ + 2, AM[2]); ho_R(x0, y0, w_, h_, YE[1]); ho_R(x0, y0, w_, 1, YE[3]); ho_R(x0, y0, 1, h_, YE[3]); ho_R(x0 + w_ - 1, y0, 1, h_, YE[0]); ho_R(x0, y0 + h_ - 1, w_, 1, YE[0]);
      ho_R(x0 + 3, y0 + 3, w_ - 6, h_ - 6, AM[3]);
      for (let y = y0 + 4; y < y0 + h_ - 4; y++) for (let x = x0 + 4; x < x0 + w_ - 4; x++) { const f = 0.3 + litAt(bx, y) * 0.7 + (ho_bay(x, y) - 0.5) * 0.2, lz = ((x + y) % 8 < 1 || (x - y + 64) % 8 < 1) ? 0.1 : 0; g.fillStyle = [AM[3], AM[4], AM[5], AM[6], AM[7]][clamp(Math.floor((f + lz) * 4.2) - 1, 0, 4)]; g.fillRect(x, y, 1, 1); }
      ho_R(x0 + 3, y0 + 3, w_ - 6, 1, AM[2]); ho_R(x0 + 3, y0 + 3, 1, h_ - 6, AM[2]); ho_R(x0 + 3, y0 + h_ - 4, w_ - 6, 1, YE[2]); ho_R(x0 + w_ - 4, y0 + 4, 1, h_ - 7, YE[2]);
      ho_disc(bx, y0 + 28, 6, YE[0]); ho_disc(bx, y0 + 28, 5, YE[2]); ho_disc(bx, y0 + 28, 3, AM[6]); ho_P(bx - 1, y0 + 27, YE[3]); for (let a = 0; a < 8; a++) ho_P(bx + Math.cos(a * 0.785) * 8, y0 + 28 + Math.sin(a * 0.785) * 8, YE[3]);
      ho_line(bx, y0 + 38, bx, y0 + 100, YE[1], 1); ho_line(bx - 1, y0 + 38, bx - 1, y0 + 100, AM[6], 1);
    }
    // fenêtres sur la nuit
    for (const wx of HO_SAL.xs) ho_ctx().drawImage(ho_windowSprite(HO_SAL.ww, HO_SAL.wh), wx - HO_SAL.ww / 2 - 4, HO_SAL.wy - 4);
    // moulure basse + ombre sous la corniche
  });
}
// parquet en perspective + tapis (sprite 330 × 232 : y écran 248 → 480, x local = x écran + 30)
function ho_salonFloor() {
  return ho_cache('salonFloor', 330, 232, () => {
    const g = ho_ctx(), [vx, vy] = HO_SAL.vp, W = 330, H = 232, hz = HO_SAL.hz;
    const woods = [WO[1], WO[2], WO[3], WO[4], WO[5]], reds = [RD[0], RD[1], RD[2], RD[3], RD[4]];
    const cell = new Int32Array(W * H), info = new Array(W * H);
    for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
      const sx = i - 30, sy = 248 + j, k = (sy - vy) / hz, X = (sx - vx) / k, Z = 300 / k;
      const pi = Math.floor(X / 10), pj = Math.floor((Z + (pi & 1) * 30) / 60);
      cell[j * W + i] = pi * 7919 + pj * 104729;
      info[j * W + i] = [X, Z, k];
    }
    for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
      const [X, Z, k] = info[j * W + i], sx = i - 30, sy = 248 + j, id = cell[j * W + i];
      const seam = (i + 1 < W && cell[j * W + i + 1] !== id) || (j + 1 < H && cell[(j + 1) * W + i] !== id);
      const lx = (sx - 135) / 190, ly = (sy - 330) / 100, I = clamp(1 - Math.sqrt(lx * lx + ly * ly));
      let col;
      const inCarpet = Math.abs(X) < 104 && Z < 250 && Z > 36;
      if (inCarpet) {
        const ax = Math.abs(X), border = ax > 96 || Z > 240, gold = (ax > 91 && ax < 94.5) || (Z > 232 && Z < 235) || (ax > 99 && ax < 100.5), cx_ = ((X + 104) % 52) / 52, cz_ = (Z % 52) / 52, loz = Math.abs(cx_ - 0.5) + Math.abs(cz_ - 0.5), pat = loz < 0.3 ? (loz < 0.16 ? 3 : 1) : (loz < 0.38 ? 2 : 0);
        let f = 0.3 + I * 0.62 + (ho_bay(i, j) - 0.5) * 0.34;
        if (border && !gold) col = reds[clamp(Math.floor(f * 3.2) - 0, 0, 3)];
        else if (gold) col = [YE[0], YE[1], YE[2], YE[3]][clamp(Math.floor(f * 4.4), 0, 3)];
        else col = reds[clamp(Math.floor((f + (pat === 3 ? 0.18 : pat === 1 ? 0.1 : pat === 2 ? -0.14 : 0)) * 4.8) - 0, 0, 4)];
        if (pat === 3 && !border && Math.floor(f * 6) > 3) col = AM[5];
        if (Math.abs(Z - 244) < 0.9 / k * 4 && ax < 100 && (Math.floor(X / 3) & 1)) col = YE[2];    // frange
      } else {
        const tone = 1 + Math.floor(ho_h(id, 21) * 3);
        let f = 0.18 + I * 0.78 + (ho_bay(i, j) - 0.5) * 0.3 + (ho_h(id, 22) - 0.5) * 0.14;
        if (Math.abs(sx - 135) < 7 + (sy - 248) * 0.03) f += 0.12 * (1 - (sy - 248) / 232);           // reflet du lustre
        col = woods[clamp(Math.floor(f * 5.4) + (tone - 2), 0, 4)];
        if (seam) col = WO[0];
      }
      g.fillStyle = col; g.fillRect(i, j, 1, 1);
    }
    // plinthe : ombre du mur sur le sol
    ho_dith(0, 0, W, 5, ho_K, 0.4);
  });
}
// poussière en suspension dans la lumière du lustre (grains qui dérivent et s'allument près du lustre) ; (cx, cy) centre de la lueur
function ho_motes(t, o = {}) {
  const n = o.n ?? 40, x0 = o.x0 ?? 0, x1 = o.x1 ?? LW, y0 = o.y0 ?? 30, y1 = o.y1 ?? 330, cx = o.cx ?? 135, cy = o.cy ?? 120, cam = (o.cam || 0) * (o.par ?? 0.8), seed = o.seed ?? 4, W = x1 - x0, H = y1 - y0;
  for (let i = 0; i < n; i++) {
    const hx = ho_h(i, seed), hy = ho_h(i, seed + 1), sp = 0.5 + ho_h(i, seed + 2);
    const x = x0 + ((hx * W + t * (1.5 + sp * 2) * (o.vx ?? 1) + Math.sin(t * 0.6 * sp + i) * 8 - cam) % W + W) % W, y = y0 + ((hy * H - t * (2 + sp * 2.5) * (o.vy ?? 0.6) + Math.sin(t * 0.5 + i * 1.7) * 5) % H + H) % H;
    const d = Math.hypot(x - cx, (y - cy) * 0.9), I = clamp(1 - d / 200), tw = 0.5 + 0.5 * Math.sin(t * (2 + sp * 3) + i * 3.1);
    if (ho_bay(Math.round(x), Math.round(y)) < I * (0.55 + 0.45 * tw) * 1.15) { ho_P(x, y, I > 0.5 && tw > 0.6 ? WH[3] : YE[3]); if (I > 0.6 && sp > 1.1) ho_P(x + 1, y, AM[9]); }
  }
}
// ── ho_salon(t, o) : le grand salon doré, plein cadre 270 × 480.
//    Plan moyen (o.view 'wide', défaut) : plafond à rosace, corniche dorée, trois hautes fenêtres bleu nuit à rideaux de velours rouge qui bougent, travées moulurées, lambris, parquet et tapis rouge en perspective (ligne de sol y = 248, point de fuite [135, 190]),
//      lustre de cristal qui scintille, colonnes de marbre à chapiteaux dorés au premier plan, faisceaux de lumière et poussière. La table de six personnes se pose vers (135, 322) (ho_table).
//    Gros plan sur la table (o.view 'close') : le même salon, flou et plus sombre (bokeh doré du lustre, fenêtres bleutées, tapis), pour y placer une grande table (ho_table s ≈ 2) en y ≈ 300–340.
//    o.cam (px, parallaxe : fenêtres 0,5 · lustre 0,7 · sol 1 · colonnes 1,4) · o.light 0..1 (intensité de la lueur du lustre, 1) · o.layer 'all' (défaut) | 'back' (décor seul, à dessiner AVANT les personnages) | 'front' (colonnes, rais de lumière, poussière, vignette : APRÈS les personnages)
//    o.lustre true · o.columns true · o.rays true · o.dust 1 · o.vignette 0,55 · o.curtains true
//    renvoie { floorY: 248, vp: [135, 190], table: [135, 322], lustre: { x, y }, windows: [[x, y, w, h], …], k(y) échelle de perspective au sol }
function ho_salon(t, o = {}) {
  o = o || {}; const cam = o.cam || 0, view = o.view ?? 'wide', layer = o.layer ?? 'all', lit = o.light ?? 1, W_ = HO_SAL;
  const fx = Math.round(-30 - cam * 0.5), px_ = Math.round(-30 - cam * 1.0), lcx = 135 - cam * 0.7;
  const res = { floorY: 248, vp: W_.vp, table: [135, 322], lustre: { x: lcx, y: 108 }, windows: W_.xs.map(x => [x - 30 - cam * 0.5 - W_.ww / 2, W_.wy, W_.ww, W_.wh]), k: y => (y - W_.vp[1]) / W_.hz };
  if (layer !== 'front') {
    if (view === 'wide') {
      ho_ctx().drawImage(ho_salonFar(), fx, 0); ho_ctx().drawImage(ho_salonFloor(), px_, 248);
      if (o.curtains !== false) for (const wx of W_.xs) { const sx = wx - 30 - cam * 0.5, ph = wx * 0.05; ho_curtain(sx - W_.ww / 2 - 5, W_.wy - 6, 15, 150, t, { seed: wx, phase: ph }); ho_curtain(sx + W_.ww / 2 + 5, W_.wy - 6, 15, 150, t, { seed: wx + 5, flip: true, phase: ph + 1 }); }
      // pelmet : lambrequin au-dessus de chaque fenêtre
      for (const wx of W_.xs) { const sx = wx - 30 - cam * 0.5, x0 = sx - W_.ww / 2 - 4, w_ = W_.ww + 8; ho_R(x0 - 1, W_.wy - 11, w_ + 2, 9, ho_K); ho_R(x0, W_.wy - 10, w_, 7, RD[2]); ho_R(x0, W_.wy - 10, w_, 2, RD[4]); ho_R(x0, W_.wy - 5, w_, 2, RD[1]); for (let x = x0; x < x0 + w_; x += 3) { ho_R(x, W_.wy - 3, 1, 4, YE[2]); ho_P(x, W_.wy + 1, YE[0]); } ho_R(x0 - 1, W_.wy - 12, w_ + 2, 1, YE[3]); }
      if (o.lustre !== false) ho_lustre(lcx, -2, 1.05, t, { glow: lit, chain: 28 });
      if (lit > 0) { ho_glow(lcx, 120, 190, '255,150,50', 0.2 * lit); }
    } else {
      ho_salonClose(t, cam, lit);
    }
  }
  if (layer !== 'back') {
    if (o.columns !== false && view === 'wide') {
      const cs = ho_columnSprite(34, 430, 1), cs2 = ho_columnSprite(34, 430, -1), cx0 = Math.round(-16 - cam * 1.4), cx1 = Math.round(252 - cam * 1.4);
      ho_ctx().drawImage(cs, cx0, 6); ho_ctx().drawImage(cs2, cx1, 6);
    }
    if (o.rays !== false && lit > 0) k_rays(lcx, 40, t, { angle: Math.PI / 2, spread: 1.5, len: 330, n: 7, strength: 0.2 * lit, col: AM[9], seed: 6, par: 0.7, cam });
    if ((o.dust ?? 1) > 0) ho_motes(t, { n: Math.round(46 * (o.dust ?? 1)), cx: lcx, cy: 130, cam, y1: 350 });
    if ((o.vignette ?? 0.55) > 0) vignette(o.vignette ?? 0.55, 90, 300, 135, 200, '30,8,0');
  }
  return res;
}
// fond du gros plan : mur flou et sombre, bokeh du lustre, tapis
function ho_salonClose(t, cam, lit) {
  const bg = ho_cache('salonClose', 330, 480, () => {
    const g = ho_ctx(); g.fillStyle = AM[2]; g.fillRect(0, 0, 330, 480);
    g.filter = 'blur(2.2px)'; g.imageSmoothingEnabled = true; g.drawImage(ho_salonFar(), -70, -40, 470, 374); g.drawImage(ho_salonFloor(), -70, 330, 470, 330); g.filter = 'none'; g.imageSmoothingEnabled = false;
    g.fillStyle = 'rgba(28,8,0,0.42)'; g.fillRect(0, 0, 330, 480);
    const gr = g.createLinearGradient(0, 300, 0, 480); gr.addColorStop(0, 'rgba(20,4,0,0)'); gr.addColorStop(1, 'rgba(20,4,0,0.5)'); g.fillStyle = gr; g.fillRect(0, 300, 330, 180);
  });
  ho_ctx().drawImage(bg, Math.round(-30 - cam * 0.5), 0);
  // bokeh : disques d'or qui respirent (reflets des cristaux hors champ)
  for (let i = 0; i < 16; i++) {
    const bx = 20 + ho_h(i, 7) * 230 - cam * 0.5, by = 20 + ho_h(i, 8) * 150, r = 5 + ho_h(i, 9) * 9, br = 0.4 + 0.35 * Math.sin(t * (0.8 + ho_h(i, 10)) + i * 2);
    ho_ellDith(bx, by, r, r, i % 3 ? AM[8] : YE[3], 0.26 * br * lit); ho_ellDith(bx, by, r * 0.65, r * 0.65, YE[3], 0.2 * br * lit);
  }
  ho_lustre(135 - cam * 0.7, -48, 1.6, t, { glow: lit, chain: 20 });
  ho_glow(135 - cam * 0.7, 120, 200, '255,150,50', 0.2 * lit);
}

// ════════════════════════════════════════════════════════════════════════════════════════
// 9. LA TABLE : grande table ovale à nappe blanche, carafes, verres, cendrier fumant, candélabre, papiers
// ════════════════════════════════════════════════════════════════════════════════════════
// verre à pied : (x, y) = pied ; h hauteur ; wine 0..1 (niveau de vin) ; col couleur du vin ; glint 0..1 reflet scintillant
function ho_glass(x, y, h, o = {}) {
  const w = Math.max(3, Math.round(h * 0.36)), bh = Math.max(3, Math.round(h * 0.42)), sy = y - Math.round(h * 0.1), by = y - h, wine = o.wine ?? 0.55, col = o.col ?? RD[3], dk = o.dk ?? RD[1];
  ho_ell(x, y, Math.max(2, Math.round(h * 0.26)), Math.max(1, Math.round(h * 0.07)), 'rgba(5,4,15,0.4)');
  ho_ell(x, y - 1, Math.max(2, Math.round(h * 0.22)), Math.max(1, Math.round(h * 0.06)), ST[5]); ho_P(x - 1, y - 2, WH[3]);
  ho_R(x, by + bh, 1, sy - by - bh, NE[2]);                                 // pied et jambe
  // calice : tulipe
  for (let j = 0; j < bh; j++) { const f = j / (bh - 1), hw = Math.max(0, Math.round((w / 2) * (Math.sin(f * 2.1 + 0.4) * 0.55 + 0.5 * (1 - f) * 0.9 + 0.2))), yy = by + j; if (hw <= 0) continue; ho_R(x - hw, yy, hw * 2 + 1, 1, NE[3]); ho_P(x - hw, yy, ST[6]); ho_P(x + hw, yy, ST[5]);
    if (j >= bh * (1 - wine)) { ho_R(x - hw + 1, yy, hw * 2 - 1, 1, j > bh * 0.78 ? dk : col); } }
  ho_R(x - Math.round(w / 2), by, w + 1, 1, WH[3]);
  if (bh >= 5) { ho_R(x - 1, by + 1, 1, Math.max(1, bh - 3), WH[3]); }
  const g = o.glint ?? 0; if (g > 0.5) { ho_P(x - 2, by + 1, WH[3]); ho_P(x - 1, by, WH[3]); ho_P(x, by - 1, YE[3]); ho_P(x - 3, by + 1, YE[3]); }
}
// carafe de cristal : (x, y) = pied ; h hauteur ; col du liquide (RD pour le vin, CY pour l'eau)
function ho_carafe(x, y, h, t, o = {}) {
  const bw = Math.max(4, Math.round(h * 0.34)), bh = Math.round(h * 0.55), nw = Math.max(1, Math.round(h * 0.07)), col = o.col ?? RD[2], hi = o.hi ?? RD[4];
  ho_ell(x, y, bw + 1, Math.max(1, Math.round(h * 0.08)), 'rgba(5,4,15,0.4)');
  ho_ell(x, y - bh / 2, bw, bh / 2, ho_K); ho_ell(x, y - bh / 2, bw - 1, bh / 2 - 1, NE[3]);                                   // panse
  ho_R(x - nw - 1, y - h + Math.round(h * 0.08), nw * 2 + 3, y - bh - (y - h) - Math.round(h * 0.08) + 1, ho_K); ho_R(x - nw, y - h + Math.round(h * 0.08), nw * 2 + 1, y - bh - (y - h) - Math.round(h * 0.08), NE[3]);   // col
  ho_ell(x, y - bh / 2, bw - 1, bh / 2 - 1, NE[3]);
  const lvl = o.level ?? 0.75; for (let j = 0; j < bh - 2; j++) { if (j < bh * (1 - lvl) - 1) continue; const yy = y - bh + 1 + j, f = (j - bh / 2 + 1) / (bh / 2), hw = Math.floor((bw - 1) * Math.sqrt(Math.max(0, 1 - f * f)) + 0.3); ho_R(x - hw, yy, hw * 2 + 1, 1, j > bh * 0.7 ? RD[1] : col); }
  ho_R(x - bw + 2, y - bh + 3, 1, Math.round(bh * 0.55), WH[3]); ho_R(x - bw + 3, y - bh + 2, 1, 2, WH[3]); ho_P(x + bw - 2, y - bh * 0.35, hi);
  ho_R(x - nw, y - h + Math.round(h * 0.08), 1, y - bh - (y - h) - Math.round(h * 0.08), WH[3]);
  ho_ell(x, y - h + 2, Math.max(2, nw + 1), Math.max(2, nw + 1), ho_K); ho_ell(x, y - h + 2, Math.max(1, nw), Math.max(1, nw), NE[3]); ho_P(x - 1, y - h + 1, WH[3]);   // bouchon
  const gl = Math.pow(Math.max(0, Math.sin(TAU * (t / 2.6 + (o.ph ?? 0)))), 12); if (gl > 0.4) { ho_P(x - bw + 3, y - bh + 4, WH[3]); ho_P(x - bw + 2, y - bh + 3, YE[3]); ho_P(x - bw + 4, y - bh + 3, YE[3]); ho_P(x - bw + 3, y - bh + 2, YE[3]); ho_P(x - bw + 3, y - bh + 5, YE[3]); }
}
// cendrier de cristal doré avec cigare fumant : (x, y) = centre ; s ; la fumée monte (volutes tramées)
function ho_cendrier(x, y, s, t, o = {}) {
  const rx = Math.round(9 * s), ry = Math.max(2, Math.round(3.2 * s));
  ho_ell(x + 1, y + 2, rx + 1, ry, 'rgba(5,4,15,0.35)'); ho_ell(x, y, rx + 1, ry + 1, ho_K); ho_ell(x, y, rx, ry, YE[1]); ho_ell(x, y - 1, rx - 1, ry - 1, YE[2]); ho_ell(x, y - 1, rx - 3, Math.max(1, ry - 2), AM[3]); ho_R(x - rx + 1, y, rx * 2 - 1, 1, YE[0]); ho_P(x - rx + 2, y - 1, YE[3]);
  ho_R(x - 5 * s, y - 2 * s, Math.round(10 * s), Math.max(2, Math.round(2.2 * s)), SK[2]); ho_R(x - 5 * s, y - 2 * s, Math.round(10 * s), 1, SK[3]); ho_R(x - 2 * s, y - 2 * s, 1, Math.max(2, Math.round(2.2 * s)), YE[2]);     // cigare
  ho_R(x + 5 * s, y - 2 * s, 1, Math.max(2, Math.round(2.2 * s)), RD[3]); ho_P(x + 5 * s + 1, y - 2 * s, AM[8]);
  const ember = 0.6 + 0.4 * Math.sin(t * 7); if (ember > 0.7) ho_P(x + 5 * s, y - 2 * s, YE[3]);
  // fumée
  for (let i = 0; i < 9; i++) { const f = ((t * 0.28 + i / 9) % 1), px_ = x + 5 * s + Math.sin(f * 9 + i) * (2 + f * 6) * s + f * 3, py_ = y - 3 * s - f * 34 * s, r = (1.1 + f * 3.4) * s, a = (1 - f) * 0.7 * (o.smoke ?? 1); ho_ellDith(px_, py_, r, r * 0.8, f < 0.4 ? WH[2] : NE[3], a); }
}
// candélabre d'argent à trois bougies : (x, y) = pied ; s
function ho_candelabre(x, y, s, t, o = {}) {
  const h = Math.round(26 * s); ho_ell(x, y, 6 * s, 2 * s, 'rgba(5,4,15,0.4)'); ho_ell(x, y - 1, 5 * s, 1.8 * s, ST[5]); ho_ell(x, y - 2 * s, 4 * s, 1.5 * s, ST[7]); ho_R(x - 1, y - h, 2, h - 2, ST[6]); ho_R(x - 1, y - h, 1, h - 2, WH[3]); ho_R(x - 2, y - h * 0.4, 4, 2, ST[7]);
  for (const sx of [-1, 0, 1]) { const bx = x + sx * 8 * s, by = y - h + (sx === 0 ? 0 : 5 * s); if (sx) { ho_line(x, y - h * 0.55, bx, by + 2, ST[6], 1); ho_line(x, y - h * 0.55 - 1, bx, by + 1, WH[3], 1); }
    ho_R(bx - 2, by - 1, 5, 2, ST[6]); ho_R(bx - 1, by - 8 * s, 3, 8 * s, WH[2]); ho_R(bx - 1, by - 8 * s, 1, 8 * s, WH[3]); ho_R(bx + 1, by - 8 * s, 1, 8 * s, SK[4]);
    const fy = by - 8 * s - 4 - Math.round(0.5 + 0.5 * Math.sin(t * 11 + sx * 2)); ho_P(bx, fy + 1, AM[7]); ho_R(bx, fy, 1, 2, YE[3]); ho_P(bx, fy - 1, ho_h(Math.floor(t * 9) + sx, 3) > 0.5 ? AM[8] : YE[2]); ho_P(bx, fy + 1, WH[3]); ho_glow(bx, fy, 13 * s, '255,170,70', 0.3); }
}
// ── ho_table(cx, cy, s, t, o) : grande table ovale à nappe blanche qui tombe en plis festonnés, vue de dessus à ≈ 15° ; (cx, cy) = centre du plateau ; rx = 100 s, ry = 28 s ; la nappe retombe de 24 s
//    o.items { carafes (2), verres (6), papiers (3) : nombre ; cendrier, candelabre : 0 pour les retirer } · o.cloth couleur de nappe · o.shadow 1 (ombre au sol) ; les verres et carafes scintillent au rythme du lustre
//    Ordre de dessin conseillé : décor → personnages DE L'AUTRE CÔTÉ (y plus petit) → ho_table → personnages DEVANT.
//    renvoie { top: { cx, cy, rx, ry }, hem (y du bas de la nappe au centre), seats: [{ x, y, side: 'far' | 'near' }] ×6 (3 derrière puis 3 devant ; point du bord de la table devant chaque convive), items: { carafe: [[x, y], …], glass: […], ashtray: [x, y], candle: [x, y], papers: […] } }
function ho_table(cx, cy, s, t, o = {}) {
  o = o || {}; s = ho_fin(s, 1);
  const rx = 100 * s, ry = 28 * s, drop = 24 * s, items = o.items ?? {}, cloth = o.cloth ?? WH[1];
  if ((o.shadow ?? 1) > 0) { ho_ell(cx, cy + drop + 4 * s, rx * 1.08, ry * 1.12, 'rgba(5,4,15,0.5)'); ho_ellDith(cx, cy + drop + 6 * s, rx * 1.18, ry * 1.25, ho_K, 0.45); }
  // nappe et plateau (statiques : mis en cache par échelle)
  const bk = ho_cache(`tablebase:${Math.round(s * 20)}:${cloth}`, Math.ceil(2 * rx + 8), Math.ceil(2 * ry + drop + 12 * s + 10), () => {
    const cx = rx + 4, cy = ry + 4;
    const topY = x => { const u = (x - cx) / rx; return cy + ry * Math.sqrt(Math.max(0, 1 - u * u)); };
    const x0 = Math.round(cx - rx), x1 = Math.round(cx + rx), tones = [SK[2], SK[3], SK[4], WH[0], WH[1], WH[2], WH[3]];
    for (let x = x0; x <= x1; x++) {
      const u = (x - cx) / rx, yt = Math.round(topY(x)), fold = 0.5 + 0.5 * Math.cos(((x - cx) / (5.5 * s)) * TAU * 0.5 + Math.sin(u * 5) * 0.8), side = 1 - Math.pow(Math.abs(u), 2.4) * 0.5, hem = yt + Math.round(drop * (0.92 + 0.1 * Math.sin(x * 0.31 / s)) + Math.abs(Math.sin(x * 0.55 / s)) * 2.4 * s);
      for (let y = yt; y <= hem; y++) {
        const fy = (y - yt) / Math.max(1, hem - yt), b = (0.28 + 0.62 * fold) * side * (1 - 0.34 * fy) + (ho_bay(x, y) - 0.5) * 0.22 + 0.08;
        ho_P(x, y, tones[clamp(Math.floor(b * 7.4), 0, 6)]);
      }
      ho_P(x, hem + 1, SK[2]); ho_P(x, hem + 2, ho_K);
    }
    ho_ell(cx, cy, rx + 1, ry + 1, ho_K);
    const ring = [[1, SK[4]], [0.96, WH[0]], [0.9, WH[1]], [0.64, WH[2]], [0.32, WH[3]]];
    for (const [k, c] of ring) ho_ell(cx, cy, rx * k, ry * k, c);
    ho_ellDith(cx, cy + ry * 0.2, rx * 0.84, ry * 0.7, WH[0], 0.1); ho_ellDith(cx - rx * 0.1, cy - ry * 0.1, rx * 0.5, ry * 0.5, WH[3], 0.34);
    for (let x = Math.round(cx - rx * 0.7); x < cx + rx * 0.7; x += 2) ho_P(x, cy - ry * 0.55 + Math.round(Math.sin((x - cx) * 0.06) * 1.5), WH[0]);
  });
  ho_ctx().drawImage(bk, Math.round(cx - rx - 4), Math.round(cy - ry - 4));
  const P_ = (u, v) => [cx + u * rx * 0.72, cy + v * ry * 0.74];
  const seats = [{ ...ho_pt(P_(-0.55, -1.28)), side: 'far' }, { ...ho_pt(P_(0, -1.35)), side: 'far' }, { ...ho_pt(P_(0.55, -1.28)), side: 'far' }, { ...ho_pt(P_(-0.55, 1.4)), side: 'near' }, { ...ho_pt(P_(0, 1.45)), side: 'near' }, { ...ho_pt(P_(0.55, 1.4)), side: 'near' }];
  const out = { top: { cx, cy, rx, ry }, hem: cy + ry + drop, seats, items: { carafe: [], glass: [], papers: [] } };
  // papiers : d'abord (sous les verres)
  const np = items.papiers ?? 3;
  const pp = [[-0.42, 0.2, -0.12, 0], [0.36, 0.3, 0.1, 1], [0.6, -0.28, 0.16, 0], [-0.62, -0.32, -0.1, 1]];
  for (let i = 0; i < np; i++) { const q = P_(pp[i][0], pp[i][1]), pw = Math.round(24 * s), ph = Math.round(30 * s * 0.7); ho_document(q[0] - pw / 2, q[1] - ph / 2, pw, ph, t, { head: null, rot: pp[i][2], lines: 3, seal: i === 1 ? 1 : 0, sign: 1, shadow: 0, seed: 12 + i }); out.items.papers.push(q); }
  // cendrier fumant
  if (items.cendrier !== 0) { const q = P_(0.3, 0.62); ho_cendrier(q[0], q[1], s, t); out.items.ashtray = q; }
  // candélabre au centre
  if (items.candelabre !== 0) { const q = P_(0, -0.3); ho_candelabre(q[0], q[1], s, t); out.items.candle = q; }
  // carafes
  const nc = items.carafes ?? 2; const cc = [[-0.92, -0.02, RD[2], RD[4]], [0.94, -0.06, CY[2], CY[4]], [-0.18, -0.75, RD[2], RD[4]]];
  for (let i = 0; i < nc; i++) { const q = P_(cc[i][0], cc[i][1]); ho_carafe(q[0], q[1], Math.round(26 * s), t, { col: cc[i][2], hi: cc[i][3], ph: i * 0.37 }); out.items.carafe.push(q); }
  // verres : devant chaque convive
  const ng = items.verres ?? 6; const gp = [[-0.5, -0.66], [0.12, -0.82], [0.62, -0.62], [-0.58, 0.78], [-0.04, 0.88], [0.6, 0.76]];
  for (let i = 0; i < ng; i++) { const q = P_(gp[i][0], gp[i][1]), h_ = Math.round(14 * s); ho_glass(q[0], q[1], h_, { wine: 0.5 + 0.1 * (i % 3), glint: Math.pow(Math.max(0, Math.sin(TAU * (t / 2.2 + i * 0.31))), 12) }); out.items.glass.push(q); }
  return out;
}
const ho_pt = a => ({ x: a[0], y: a[1] });

// ════════════════════════════════════════════════════════════════════════════════════════
// 10. LE BUREAU DU FAUSSAIRE : objets (lampe d'ambre, encrier et plume, tampons de bois, bougie, cire, pile de papiers) et décor
// ════════════════════════════════════════════════════════════════════════════════════════
// ── ho_lampe(x, y, s, t, o) : lampe de bureau à abat-jour d'ambre (long demi-cylindre de verre sur pied de laiton) ; (x, y) = milieu du socle ; ≈ 44 px de large, 46 de haut à s = 1
//    o.on 1 (0..1 : allumée ; la lueur vacille légèrement) · o.glow 1 (lueur additive : 0 pour la supprimer et la poser soi-même) · o.flicker 1
//    renvoie { shade: [x, y] (centre du verre), bottom: [x, y] (d'où part la lumière), top }
function ho_lampe(x, y, s, t, o = {}) {
  o = o || {}; s = ho_fin(s, 1); const on = clamp(o.on ?? 1), fk = 1 + (o.flicker ?? 1) * (0.05 * Math.sin(t * 11) + 0.04 * Math.sin(t * 27 + 1)), W = Math.round(40 * s), H = Math.round(13 * s), sx = Math.round(x - W / 2), sy = Math.round(y - 40 * s);
  if (on > 0 && (o.glow ?? 1) > 0) { ho_glow(x, sy + H, 150 * s * fk, '255,140,30', 0.5 * on * (o.glow ?? 1)); ho_glow(x, sy + H, 70 * s * fk, '255,196,100', 0.35 * on); }
  ho_ell(x + 3, y + 1, 15 * s, 3.5 * s, 'rgba(5,4,15,0.5)');
  // socle de laiton : disque lourd
  ho_ell(x, y - 2 * s, 13 * s + 1, 4 * s + 1, ho_K); ho_ell(x, y - 2 * s, 13 * s, 4 * s, YE[0]); ho_ell(x, y - 3 * s, 12 * s, 3.4 * s, YE[1]); ho_ell(x, y - 4 * s, 9 * s, 2.5 * s, YE[2]); ho_ell(x - 3 * s, y - 4.5 * s, 4 * s, 1.1 * s, YE[3]);
  ho_R(x - 3 * s, y - 14 * s, 6 * s, 10 * s, ho_K); ho_R(x - 2 * s, y - 14 * s, 4 * s, 10 * s, YE[1]); ho_R(x - 2 * s, y - 14 * s, Math.max(1, 1.5 * s), 10 * s, YE[3]); ho_R(x + s, y - 14 * s, Math.max(1, s), 10 * s, YE[0]);
  ho_R(x - 2 * s, y - 24 * s, 4 * s, 11 * s, YE[1]); ho_R(x - 2 * s, y - 24 * s, Math.max(1, s), 11 * s, YE[3]); ho_R(x + s, y - 24 * s, Math.max(1, s), 11 * s, YE[0]); ho_R(x - 3 * s, y - 14 * s, 6 * s, 2, YE[2]);
  // abat-jour : demi-cylindre de verre ambré, arrondi aux deux bouts ; dégradé vertical (lumière au centre) + stries
  const sdr = (xx, yy, ww, hh, c) => ho_R(xx, yy, ww, hh, c);
  sdr(sx - 1, sy - 1, W + 2, H + 2, ho_K); sdr(sx, sy, W, H, AM[6]);
  for (let j = 0; j < H; j++) { const f = j / (H - 1), tone = f < 0.18 ? AM[6] : f < 0.4 ? AM[7] : f < 0.62 ? AM[8] : f < 0.8 ? AM[7] : AM[6]; sdr(sx + 1, sy + j, W - 2, 1, o.on === 0 ? AM[3] : tone); }
  if (on < 1) ho_dith(sx + 1, sy, W - 2, H, AM[2], 0.6 * (1 - on));
  for (let i = 1; i < 6; i++) sdr(sx + Math.round(i * W / 6), sy + 1, 1, H - 2, AM[5]);
  sdr(sx, sy, 3, H, AM[5]); sdr(sx + W - 3, sy, 3, H, AM[5]); sdr(sx, sy, 1, H, YE[1]); sdr(sx + W - 1, sy, 1, H, YE[0]);
  sdr(sx + 3, sy + 1, W - 6, 1, YE[3]); ho_P(sx + 5, sy + 3, AM[9]); ho_P(sx + 6, sy + 3, AM[9]); sdr(sx + 8, sy + 4, W - 16, 3, AM[9]);
  for (const bx of [sx, sx + W - 3]) { sdr(bx, sy - 1, 3, H + 2, YE[1]); sdr(bx, sy - 1, 3, 1, YE[3]); sdr(bx, sy + H, 3, 1, YE[0]); }
  sdr(sx - 1, sy + H, W + 2, 2, YE[1]); sdr(sx - 1, sy + H, W + 2, 1, YE[3]);
  // chaînette
  ho_line(sx + W - 2, sy + H + 2, sx + W + 2 * s, sy + H + 10 * s, YE[2], 1); ho_P(sx + W + 2 * s, sy + H + 11 * s, YE[3]);
  return { shade: [x, sy + H / 2], bottom: [x, sy + H + 2], top: sy };
}
// ── ho_bougie(x, y, s, t, o) : bougie dans un bougeoir de laiton à anneau (chandelier d'office), flamme qui vacille, cire qui coule ; (x, y) = milieu du socle ; ≈ 22 px de haut
//    o.h (hauteur de bougie, 1) · o.melt 0..1 (coulures de cire) · o.glow 1 · o.out (flamme soufflée, fumée)
//    renvoie { flame: [x, y], base: [x, y] }
function ho_bougie(x, y, s, t, o = {}) {
  o = o || {}; s = ho_fin(s, 1); const ch = Math.round(18 * (o.h ?? 1) * s), fr = Math.floor(t * 30), fy = y - 3 * s - ch;
  ho_ell(x + 2, y + 1, 9 * s, 2.2 * s, 'rgba(5,4,15,0.5)');
  ho_ell(x, y - 1, 8 * s + 1, 2.5 * s + 1, ho_K); ho_ell(x, y - 1, 8 * s, 2.5 * s, YE[1]); ho_ell(x, y - 1.8 * s, 6 * s, 1.5 * s, YE[2]); ho_P(x - 3 * s, y - 2 * s, YE[3]);
  ho_line(x + 7 * s, y - 2 * s, x + 12 * s, y - 5 * s, ho_K, 3); ho_line(x + 7 * s, y - 2 * s, x + 12 * s, y - 5 * s, YE[1], 1); ho_ell(x + 12 * s, y - 6 * s, 2.4 * s, 3 * s, YE[1]); ho_ell(x + 12 * s, y - 6 * s, 1.2 * s, 1.8 * s, NI[0]);
  ho_R(x - 1, y - 8 * s, 3, 6 * s, YE[1]); ho_R(x - 1, y - 8 * s, 1, 6 * s, YE[3]);
  const w = Math.max(5, Math.round(5 * s));
  ho_R(x - w / 2 - 1, fy + 3, w + 2, ch + 1, ho_K); ho_R(x - w / 2, fy + 3, w, ch, WH[2]); ho_R(x - w / 2, fy + 3, 1, ch, WH[3]); ho_R(x + w / 2 - 1, fy + 3, 1, ch, SK[4]); ho_R(x - w / 2, fy + 3, w, 1, SK[3]);
  const m = clamp(o.melt ?? 0.4); for (let k = 0; k < 3; k++) { const dx = -w / 2 + 1 + k * (w - 2) / 2, ln = Math.round((2 + m * 7 * ho_h(k, 4)) * s); ho_R(x + dx, fy + 3, 1, ln, WH[3]); ho_P(x + dx, fy + 3 + ln, WH[2]); }
  if (o.out) { for (let i = 0; i < 8; i++) { const f = ((t * 0.5 + i / 8) % 1); ho_ellDith(x + Math.sin(f * 7 + i) * (2 + f * 5), fy - f * 30 * s, 1 + f * 3, 1 + f * 2.5, NE[3], (1 - f) * 0.6); } return { flame: [x, fy], base: [x, y] }; }
  // flamme : trois états qui tournent, cœur bleuté, halo
  const k = (fr >> 1) % 3, lean = Math.round(Math.sin(t * 5.3 + 1) * 0.8 + Math.sin(t * 13) * 0.4), fh = Math.round((6 + (k === 1 ? 1 : 0)) * s);
  if ((o.glow ?? 1) > 0) { ho_glow(x, fy - 2, 40 * s, '255,150,40', 0.5 * (o.glow ?? 1) * (0.9 + 0.1 * k)); ho_glow(x, fy - 2, 16 * s, '255,210,130', 0.5); }
  ho_R(x, fy + 2, 1, 2, ho_K);
  for (let j = 0; j < fh; j++) { const f = j / (fh - 1), hw = Math.max(0, Math.round((1 - Math.abs(f - 0.3) * 1.4) * 1.9 * s * 0.8)), cx_ = x + Math.round(lean * f * f * 2);
    ho_R(cx_ - hw, fy + 1 - j, hw * 2 + 1, 1, j < 2 ? AM[8] : j < fh - 2 ? YE[3] : AM[7]); if (hw >= 1 && j < fh - 2) ho_R(cx_ - Math.max(0, hw - 1), fy + 1 - j, Math.max(1, hw * 2 - 1), 1, j < fh * 0.6 ? YE[3] : AM[9]); }
  ho_R(x, fy + 1, 1, Math.round(2.5 * s), WH[3]); ho_P(x, fy + 3, BL[4]);
  return { flame: [x, fy - Math.round(fh / 2)], base: [x, y] };
}
// ── ho_encrier(x, y, s, t, o) : encrier de verre à encre bleu-noir et plume d'oie penchée ; (x, y) = milieu du socle ; o.dip 0..1 (la plume plonge et se relève)
function ho_encrier(x, y, s, t, o = {}) {
  o = o || {}; s = ho_fin(s, 1); const w = Math.round(14 * s), h = Math.round(11 * s), dip = clamp(o.dip ?? 0);
  ho_ell(x + 2, y + 1, w / 2 + 3, 2.4 * s, 'rgba(5,4,15,0.5)');
  ho_R(x - w / 2 - 1, y - h - 1, w + 2, h + 2, ho_K); ho_R(x - w / 2, y - h, w, h, NE[3]); ho_R(x - w / 2 + 1, y - h + 4 * s, w - 2, h - 4 * s - 1, NI[3]); ho_R(x - w / 2 + 1, y - h + 4 * s, w - 2, 1, BL[2]);
  ho_R(x - w / 2, y - h, 2, h, WH[3]); ho_R(x + w / 2 - 2, y - h, 2, h, ST[6]); ho_R(x - w / 2, y - 1, w, 1, ST[4]);
  ho_R(x - w / 4 - 1, y - h - 4 * s - 1, w / 2 + 2, 4 * s + 2, ho_K); ho_R(x - w / 4, y - h - 4 * s, w / 2, 4 * s, NE[3]); ho_R(x - w / 4, y - h - 4 * s, 2, 4 * s, WH[3]); ho_R(x - w / 4, y - h - 4 * s, w / 2, 1, ST[5]);
  ho_R(x - w / 4 + 1, y - h - 1, w / 2 - 2, 3, NI[2]);
  // plume : tige claire, barbes en deux couleurs, penchée vers la droite ; plonge dans l'encrier si dip
  const bx = x + 1, by = y - h - 3 * s + dip * 4 * s, tx = x + 28 * s - dip * 22 * s, ty = y - h - 46 * s + dip * 30 * s, base = [bx, by];
  ho_line(bx, by, tx, ty, ho_K, 3); ho_line(bx, by, tx, ty, SK[4], 1);
  const n = 11; for (let i = 0; i < n; i++) { const f = 0.35 + i / n * 0.65, qx = lerp(bx, tx, f), qy = lerp(by, ty, f), l = (7 - Math.abs(i - 5) * 0.8) * s; ho_line(qx, qy, qx - l * 0.9, qy + l * 0.35, i % 2 ? WH[2] : WH[0], 1); ho_line(qx, qy, qx + l * 0.55, qy - l * 0.1, i % 2 ? WH[1] : WH[3], 1); }
  ho_P(bx, by, NI[1]); ho_P(bx, by + 1, NI[1]);
}
// ── ho_tamponBois(x, y, s, o) : petit tampon à main en bois (poignée tournée, bloc) posé sur son bloc ; o.kind 'rond' | 'rect' ; o.ink (couleur de l'encre sous le bloc visible) ; (x, y) = milieu du bas
function ho_tamponBois(x, y, s, o = {}) {
  o = o || {}; s = ho_fin(s, 1); const rond = (o.kind ?? 'rond') === 'rond', bw = Math.round((rond ? 16 : 24) * s), bh = Math.round(7 * s), kh = Math.round(14 * s), kd = Math.round(11 * s);
  ho_ell(x + 2, y + 1, bw / 2 + 2, 2.2 * s, 'rgba(5,4,15,0.5)');
  ho_R(x - bw / 2 - 1, y - bh - 1, bw + 2, bh + 2, ho_K); ho_R(x - bw / 2, y - bh, bw, bh, WO[3]); ho_R(x - bw / 2, y - bh, bw, 1, WO[5]); ho_R(x - bw / 2, y - bh, 2, bh, WO[4]); ho_R(x + bw / 2 - 2, y - bh, 2, bh, WO[1]); ho_R(x - bw / 2, y - 1, bw, 1, o.ink ?? HO_INK.edge);
  ho_R(x - 2 * s - 1, y - bh - kh, 4 * s + 2, kh + 1, ho_K); ho_R(x - 2 * s, y - bh - kh, 4 * s, kh, WO[3]); ho_R(x - 2 * s, y - bh - kh, 1, kh, WO[5]); ho_R(x + 2 * s - 1, y - bh - kh, 1, kh, WO[1]);
  ho_R(x - 3 * s, y - bh - 3 * s, 6 * s, 2, YE[1]); ho_R(x - 3 * s, y - bh - 3 * s, 6 * s, 1, YE[3]);
  ho_ell(x, y - bh - kh - 2 * s, kd / 2 + 1, kd * 0.38 + 1, ho_K); ho_ell(x, y - bh - kh - 2 * s, kd / 2, kd * 0.38, WO[3]); ho_ell(x - 1, y - bh - kh - 3 * s, kd / 2 - 2, kd * 0.38 - 2, WO[4]); ho_ell(x - 2 * s, y - bh - kh - 4 * s, kd * 0.2, kd * 0.14, WO[5]); ho_P(x - 2 * s, y - bh - kh - 4 * s - 1, WO[6]);
}
// ── ho_pile(x, y, s, t, o) : pile de feuilles à en-tête (une feuille du dessus avec bandeau) ; (x, y) = milieu du bas ; 34 × (8 + n) px à s = 1 ; o.n (nombre de feuilles, 8) · o.lift 0..1 (la feuille du dessus se soulève et ondule)
function ho_pile(x, y, s, t, o = {}) {
  o = o || {}; s = ho_fin(s, 1); const n = o.n ?? 8, w = Math.round(34 * s), d = Math.round(10 * s), lift = clamp(o.lift ?? 0);
  ho_ell(x + 3, y + 1, w / 2 + 3, 3 * s, 'rgba(5,4,15,0.5)');
  for (let i = 0; i < n; i++) { const yy = y - i * Math.max(1, Math.round(s)) , xx = x - w / 2 + Math.round((ho_h(i, 4) - 0.5) * 3 * s); ho_poly([[xx, yy - d], [xx + w, yy - d], [xx + w + 2, yy], [xx - 2, yy]], ho_K); ho_poly([[xx + 1, yy - d + 1], [xx + w - 1, yy - d + 1], [xx + w, yy - 1], [xx - 1, yy - 1]], i % 2 ? WH[1] : WH[2]); }
  const yt = y - n * Math.max(1, Math.round(s)) + 1, xt = x - w / 2;
  if (lift > 0) { const dy = Math.round(lift * 12 * s); ho_document(xt - 1, yt - d - dy, w + 2, d + 4, t, { head: null, lines: 1, sign: 0, shadow: 0, outline: true, rot: lift * 0.12, seal: 0, wave: lift * 1.5 }); }
  else { ho_poly([[xt, yt - d + 1], [xt + w, yt - d + 1], [xt + w + 2, yt], [xt - 2, yt]], WH[2]); ho_R(xt + 3, yt - d + 2, w - 6, 3, NI[1]); ho_R(xt + 3, yt - d + 5, w - 6, 1, YE[1]); ho_R(xt + 6, yt - d + 3, w - 12, 1, WH[3]); ho_lines(xt + 4, yt - 3, w - 8, 1, 2, ST[3], 4, 1, { full: true, indent: 0 }); }
}

// ── ho_cachet(x, y, s, t, t0, o) : cachetage à la cire rouge sur un papier : la cire coule du bâton chauffé à la flamme, forme une flaque, puis le sceau de laiton s'écrase et se relève en laissant l'empreinte.
//    (x, y) = centre du cachet ; s ; t0 = début ; durée ≈ 0,9 s de coulée + 0,35 s d'écrasement (o.press : instant de l'écrasement en s après t0, 1,0) ; o.stick false (sans bâton ni flamme) ; o.ribbon (ruban sous le cachet)
//    renvoie { phase: 'drip' | 'press' | 'done' | 'wait', r (rayon de la flaque) }
function ho_cachet(x, y, s, t, t0, o = {}) {
  o = o || {}; s = ho_fin(s, 1); const u = t - t0, press = o.press ?? 1.0, seed = o.seed ?? 5;
  if (u < 0) return { phase: 'wait', r: 0 };
  const R_ = 8 * s, grow = ho_ss(0.05, press - 0.05, u), r = Math.max(1, R_ * (0.35 + 0.65 * grow)) * (u < 0.05 ? 0 : 1);
  const done = u > press + 0.35;
  if (!done || true) {
    if (o.stick !== false && u < press + 0.05) {                                    // bâton de cire penché au-dessus, flamme dessous
      const bx = x + 30 * s, by = y - 38 * s, k = 0.5 + 0.5 * Math.sin(t * 9);
      ho_line(x + 3 * s, y - 14 * s, bx, by, ho_K, 6); ho_line(x + 3 * s, y - 14 * s, bx, by, RD[3], 4); ho_line(x + 3 * s, y - 14 * s, bx - 1, by - 1, RD[4], 1); ho_line(x + 4 * s, y - 13 * s, bx, by + 1, RD[1], 1);
      ho_R(x + 1, y - 17 * s, 5, 6, RD[2]);
      const fy = y - 9 * s; ho_glow(x + 2 * s, fy, 22 * s, '255,150,40', 0.5); ho_P(x + 2 * s, fy + 2, YE[3]); ho_R(x + 2 * s - 1, fy - 1, 3, 4, AM[8]); ho_R(x + 2 * s, fy - 3 - Math.round(k), 1, 4, YE[3]); ho_P(x + 2 * s, fy + 1, WH[3]);
      // gouttes
      for (let i = 0; i < 4; i++) { const ph = (u * 2.2 + i * 0.27) % 1; if (u > 0.05 && u < press) { const gy = y - 12 * s + ph * 12 * s; ho_R(x + 2 * s - 1, gy, 2, 3 - Math.round(ph), RD[3]); ho_P(x + 2 * s - 1, gy, RD[5]); } }
    }
    // flaque de cire : disque irrégulier qui s'étale ; le sceau l'aplatit ensuite
    if (r >= 1.5 || done) {
      const k = done ? 1 : 1, pop = done ? 1 : 0;
      ho_wax(x, y, done ? R_ * 1.12 : r, 1, { ribbon: !!o.ribbon && done, seed });
      if (done) { ho_disc(x, y, Math.round(R_ * 0.6), RD[1]); ho_disc(x - 0.5, y - 0.5, Math.round(R_ * 0.5), RD[3]); ho_P(x, y - 1, RD[4]); ho_R(x - 2 * s, y, 4 * s, 1, RD[1]); ho_R(x - 1, y - 2 * s, 1, 4 * s, RD[1]); ho_P(x - 2, y - 2, RD[5]); }
    }
  }
  if (u >= press - 0.28 && u < press + 0.3) {                                         // le sceau de laiton descend, écrase, repart
    const a = (u - (press - 0.28)) / 0.58, h = a < 0.48 ? 40 * (1 - ei(a / 0.48)) : (a < 0.62 ? -2.5 * Math.sin((a - 0.48) / 0.14 * Math.PI) : 38 * ei((a - 0.62) / 0.38));
    const cy_ = y - 9 * s - h * s, w = 17 * s, sq = a > 0.48 && a < 0.62 ? 1.12 : 1;
    ho_ell(x + 2, y + 2, w / 2 * sq, 3 * s, 'rgba(5,4,15,0.35)');
    ho_R(x - 2 * s - 1, cy_ - 20 * s, 4 * s + 2, 18 * s, ho_K); ho_R(x - 2 * s, cy_ - 20 * s, 4 * s, 18 * s, WO[3]); ho_R(x - 2 * s, cy_ - 20 * s, 1, 18 * s, WO[5]);
    ho_ell(x, cy_ - 22 * s, 6 * s, 4 * s, WO[2]); ho_ell(x - 1, cy_ - 23 * s, 4 * s, 3 * s, WO[4]); ho_P(x - 2, cy_ - 24 * s, WO[6]);
    ho_ell(x, cy_ - 1, w / 2 * sq, 3.5 * s, ho_K); ho_ell(x, cy_ - 2, w / 2 * sq - 1, 3 * s, YE[1]); ho_ell(x, cy_ - 3, w / 2 * sq - 2, 2.4 * s, YE[2]); ho_P(x - 3 * s, cy_ - 3, YE[3]); ho_R(x - w / 2 * sq, cy_ - 1, w * sq, 1, YE[0]);
  }
  return { phase: done ? 'done' : u < press - 0.28 ? 'drip' : 'press', r };
}

// ════════════════════════════════════════════════════════════════════════════════════════
// 11. LE BUREAU DU FAUSSAIRE : décor et composition
// ════════════════════════════════════════════════════════════════════════════════════════
// mur (papier peint vert sombre rayé, lambris, étagère de registres, cadre, pendule, fenêtre à persienne) : sprite 330 × 300 (x local = x écran + 30)
function ho_bureauWall() {
  return ho_cache('bureauWall', 330, 300, () => {
    const g = ho_ctx();
    for (let y = 0; y < 300; y++) for (let x = 0; x < 330; x++) { const stripe = ((x + 30) % 18) < 9, f = (y < 214 ? 0.4 : 0.3) + (stripe ? 0.12 : 0) + (ho_bay(x, y) - 0.5) * 0.2 + (ho_n2(x / 24, y / 24, 3) - 0.5) * 0.14; g.fillStyle = y < 214 ? [NI[0], GR[0], GR[0], NI[1], GR[1]][clamp(Math.floor(f * 6.2) - 1, 0, 4)] : [WO[0], WO[0], WO[1], WO[1], WO[2]][clamp(Math.floor(f * 6.2) - 1, 0, 4)]; g.fillRect(x, y, 1, 1); }
    ho_R(0, 212, 330, 3, YE[0]); ho_R(0, 212, 330, 1, YE[2]); ho_R(0, 215, 330, 1, ho_K);
    for (let x = 0; x < 330; x += 40) { ho_R(x + 4, 222, 32, 62, WO[0]); ho_R(x + 4, 222, 32, 1, WO[2]); ho_R(x + 4, 222, 1, 62, WO[2]); ho_R(x + 35, 222, 1, 62, ho_K); ho_R(x + 4, 283, 32, 1, ho_K); ho_R(x + 7, 226, 26, 54, WO[1]); ho_R(x + 7, 226, 26, 1, WO[0]); ho_R(x + 7, 226, 1, 54, WO[0]); ho_R(x + 32, 227, 1, 53, WO[2]); ho_R(x + 8, 279, 25, 1, WO[2]); }
    ho_R(0, 286, 330, 6, WO[0]); ho_R(0, 286, 330, 1, WO[3]);
    // étagère de registres (à gauche)
    const sx = 40, sy = 62, sw = 98, shh = 140;
    ho_R(sx - 2, sy - 2, sw + 4, shh + 4, ho_K); ho_R(sx, sy, sw, shh, WO[0]);
    for (let r = 0; r < 3; r++) {
      const ry = sy + 4 + r * 45; ho_R(sx + 1, ry + 38, sw - 2, 3, WO[2]); ho_R(sx + 1, ry + 38, sw - 2, 1, WO[4]);
      let bx = sx + 3; for (let i = 0; bx < sx + sw - 5; i++) { const bw = 4 + Math.floor(ho_h(i + r * 17, 6) * 5), bh = 24 + Math.floor(ho_h(i + r * 17, 7) * 13), col = [RD[1], GR[1], NI[3], WO[3], RD[2], GR[2], NI[4], AM[4]][Math.floor(ho_h(i + r * 17, 8) * 8)]; if (ho_h(i + r * 17, 9) < 0.12) { bx += 5; continue; }
        ho_R(bx, ry + 38 - bh, bw, bh, ho_K); ho_R(bx + 1, ry + 38 - bh + 1, bw - 1, bh - 1, col); ho_R(bx + 1, ry + 38 - bh + 1, 1, bh - 1, ho_mixc(col, '#ffffff', 0.25)); ho_R(bx + 1, ry + 38 - bh + 4, bw - 1, 1, YE[1]); ho_R(bx + 1, ry + 38 - 6, bw - 1, 1, YE[0]); bx += bw + 1; }
    }
    // cadre : carte de France encadrée (au centre)
    const fx = 156, fy = 70; ho_R(fx - 2, fy - 2, 54, 66, ho_K); ho_R(fx, fy, 50, 62, YE[0]); ho_R(fx, fy, 50, 1, YE[2]); ho_R(fx + 3, fy + 3, 44, 56, WH[1]); ho_R(fx + 3, fy + 3, 44, 1, WH[0]); ho_dith(fx + 3, fy + 3, 44, 56, SK[3], 0.18);
    ho_poly([[fx + 12, fy + 12], [fx + 28, fy + 8], [fx + 38, fy + 14], [fx + 40, fy + 28], [fx + 34, fy + 42], [fx + 24, fy + 52], [fx + 14, fy + 44], [fx + 10, fy + 28]], GR[4]); ho_poly([[fx + 14, fy + 14], [fx + 27, fy + 11], [fx + 35, fy + 16], [fx + 37, fy + 27], [fx + 32, fy + 40], [fx + 24, fy + 48], [fx + 16, fy + 41], [fx + 13, fy + 28]], GR[5]);
    ho_disc(fx + 25, fy + 24, 2, RD[3]); ho_line(fx + 25, fy + 24, fx + 38, fy + 40, RD[2], 1); for (let i = 0; i < 4; i++) ho_R(fx + 6 + i * 9, fy + 55, 5, 1, ST[3]);
    // pendule ronde
    const kx = 181, ky = 36; ho_disc(kx, ky, 14, ho_K); ho_disc(kx, ky, 13, YE[1]); ho_disc(kx, ky, 11, WH[2]); ho_disc(kx, ky, 10, WH[1]);
    for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; ho_R(kx + Math.cos(a) * 8.4, ky + Math.sin(a) * 8.4, i % 3 ? 1 : 2, i % 3 ? 1 : 2, NI[2]); }
    ho_P(kx - 6, ky - 7, WH[3]); ho_disc(kx, ky, 1, NI[1]);
    // fenêtre à persienne (à droite)
    const wx = 210, wy = 34, ww = 66, wh = 150; ho_R(wx - 3, wy - 3, ww + 6, wh + 6, ho_K); ho_R(wx - 2, wy - 2, ww + 4, wh + 4, WO[2]); ho_R(wx - 2, wy - 2, ww + 4, 1, WO[5]); ho_R(wx, wy, ww, wh, NI[2]);
    for (let y = 0; y < wh; y++) { const f = y / wh; ho_R(wx, wy + y, ww, 1, [NI[2], NI[3], NI[4], NI[5]][clamp(Math.floor((0.25 + f * 0.9 + (ho_bay(wx, y) - 0.5) * 0.4) * 4), 0, 3)]); }
    for (let i = 0; i < 9; i++) ho_P(wx + 4 + Math.floor(ho_h(i, 20) * (ww - 8)), wy + 90 + Math.floor(ho_h(i, 21) * 50), i % 2 ? AM[8] : YE[3]);
    ho_poly([[wx, wy + wh], [wx + 8, wy + wh - 22], [wx + 18, wy + wh - 12], [wx + 30, wy + wh - 28], [wx + 44, wy + wh - 14], [wx + 56, wy + wh - 24], [wx + ww, wy + wh - 10], [wx + ww, wy + wh]], NI[0]);
    for (let y = 0; y < 98; y += 6) { ho_R(wx - 1, wy + y, ww + 2, 4, NI[0]); ho_R(wx - 1, wy + y, ww + 2, 1, WO[2]); ho_R(wx - 1, wy + y + 3, ww + 2, 1, ho_K); }
    ho_R(wx - 1, wy + 98, ww + 2, 3, WO[1]); ho_R(wx + ww / 2 - 1, wy + 98, 2, 10, WO[3]); ho_R(wx + ww / 2 - 1, wy + 108, 2, 2, YE[1]);
    ho_R(wx - 5, wy + wh + 2, ww + 10, 5, WO[3]); ho_R(wx - 5, wy + wh + 2, ww + 10, 1, WO[5]);
  });
}
// plateau du bureau + face avant (sprite 330 × 190 posé en y = 290) : bois sombre veiné, sous-main de cuir, biseau, tiroirs à poignées de laiton
function ho_bureauDesk() {
  return ho_cache('bureauDesk', 330, 190, () => {
    const g = ho_ctx();
    for (let y = 0; y < 62; y++) { const f = y / 62, x0 = Math.round(34 - 36 * f * 1.2 - f * 0), x1 = Math.round(296 + 36 * f * 1.2);
      for (let x = Math.max(0, x0 - 4); x < Math.min(330, x1 + 4); x++) { const gr = ho_n2(x / 40, y / 2.2, 5), b = 0.34 + gr * 0.34 + (ho_bay(x, y) - 0.5) * 0.18 - (y < 5 ? 0.12 : 0); g.fillStyle = [WO[0], WO[1], WO[1], WO[2], WO[3]][clamp(Math.floor(b * 5.3) - 1, 0, 4)]; g.fillRect(x, y, 1, 1); } }
    // sous-main de cuir vert sombre à filet d'or
    ho_poly([[62, 12], [268, 12], [286, 56], [44, 56]], GR[0]); ho_poly([[64, 13], [266, 13], [283, 55], [47, 55]], GR[1]); ho_line(66, 15, 264, 15, YE[1], 1); ho_line(64, 15, 49, 54, YE[0], 1); ho_line(266, 15, 281, 54, YE[0], 1); ho_line(49, 54, 281, 54, YE[1], 1);
    ho_dith(70, 20, 190, 30, GR[2], 0.12);
    // tranche avant et tiroirs
    ho_R(0, 62, 330, 3, WO[4]); ho_R(0, 62, 330, 1, WO[6]); ho_R(0, 65, 330, 2, ho_K); ho_R(0, 67, 330, 123, WO[0]);
    for (let x = 6; x < 330; x += 108) { ho_R(x, 74, 96, 40, ho_K); ho_R(x + 1, 75, 94, 38, WO[1]); ho_R(x + 1, 75, 94, 1, WO[3]); ho_R(x + 1, 75, 1, 38, WO[3]); ho_R(x + 94, 76, 1, 37, WO[0]); ho_R(x + 2, 112, 93, 1, WO[0]);
      ho_R(x + 40, 91, 16, 4, ho_K); ho_R(x + 41, 91, 14, 3, YE[1]); ho_R(x + 41, 91, 14, 1, YE[3]); ho_disc(x + 48, 102, 2, YE[0]); ho_P(x + 47, 101, YE[3]); ho_R(x + 8, 80, 80, 1, WO[2]); }
    ho_dith(0, 67, 330, 123, ho_K, 0.35);
  });
}
// ── ho_bureau(t, o) : le petit bureau sombre du faussaire, plein cadre. Fond : papier peint vert rayé, lambris, étagère de registres, carte encadrée, pendule (aiguilles qui avancent), fenêtre à persienne (lames de lune sur le mur et le bureau) ;
//    plateau à y = 290 (dos) → 352 (devant) ; la lampe d'ambre à gauche éclaire en cône (lueur, flaque sur le plateau, poussière) ; objets : lampe, machine à écrire, pile de papiers, bougie, encrier et plume, tampons de bois.
//    o.cam (px : mur 0,5 ; bureau 1) · o.layer 'all' | 'back' (mur, bureau, objets : à dessiner AVANT un personnage assis derrière) | 'front' (lueurs, poussière, lames de lune, vignette : APRÈS les personnages)
//    o.items { lampe, machine, pile, bougie, encrier, tampons : false pour retirer chacun } · o.machine { rate, t0, paper, s, head } (voir ho_machine) · o.lamp 1 (0..1 intensité) · o.candle 1 (flamme) · o.pile { lift }
//    renvoie { desk: [y_dos, y_devant], lamp: { x, y }, machine: { …ho_machine }, candle: { flame }, ink: [x, y], stamps: [[x, y], …], pile: [x, y], key: { x, y } }
function ho_bureau(t, o = {}) {
  o = o || {}; const cam = o.cam || 0, layer = o.layer ?? 'all', it = o.items ?? {}, lamp = o.lamp ?? 1, fx = Math.round(-30 - cam * 0.5), dx = Math.round(-30 - cam);
  const res = { desk: [290, 352], lamp: { x: 46 - cam, y: 322 }, stamps: [], key: { x: 135 - cam, y: 340 } };
  if (layer !== 'front') {
    ho_ctx().drawImage(ho_bureauWall(), fx, 0);
    // pendule : aiguilles
    const mn = (t * 6) * Math.PI / 30, hr = (t * 0.5) * Math.PI / 30;
    const ccx = fx + 181, ccy = 36;
    ho_line(ccx, ccy, ccx + Math.sin(mn) * 8, ccy - Math.cos(mn) * 8, NI[1], 1); ho_line(ccx, ccy, ccx + Math.sin(hr) * 5, ccy - Math.cos(hr) * 5, NI[0], 2); ho_P(ccx, ccy, RD[3]);
    ho_ctx().drawImage(ho_bureauDesk(), dx, 290);
    const lx = 46 - cam, ly = 322, mx = 134 - cam, my = 338 + 0;
    if (it.pile !== false) ho_pile(222 - cam, 326, 1, t, { n: 9, lift: o.pile?.lift ?? 0 });
    if (it.bougie !== false) res.candle = ho_bougie(252 - cam, 318, 0.9, t, { melt: 0.5, glow: o.candle ?? 1 });
    if (it.lampe !== false) ho_lampe(lx, ly, 1, t, { on: lamp, glow: 0 });
    if (it.machine !== false) { const m = o.machine ?? {}; res.machine = ho_machine(mx, my, m.s ?? 0.92, t, { rate: m.rate ?? 0, t0: m.t0 ?? 0, paper: m.paper ?? 0.8, head: m.head, light: lamp }); }
    if (it.encrier !== false) { res.ink = [20 - cam, 346]; ho_encrier(res.ink[0], res.ink[1], 1, t, { dip: o.dip ?? 0 }); }
    if (it.tampons !== false) { res.stamps = [[200 - cam, 349], [232 - cam, 345]]; ho_tamponBois(res.stamps[0][0], res.stamps[0][1], 1, { kind: 'rond' }); ho_tamponBois(res.stamps[1][0], res.stamps[1][1], 1, { kind: 'rect' }); }
  }
  if (layer !== 'back') {
    // lames de lune sur le mur et sur le plateau (parallélogrammes bleutés, additifs)
    { const g = ho_ctx(); g.save(); g.globalCompositeOperation = 'lighter'; g.fillStyle = 'rgba(40,64,150,0.16)'; const wx = fx + 210;
      for (let k = 0; k < 4; k++) { const x0 = wx - 100 - k * 34, yy = 110 + k * 0; g.beginPath(); g.moveTo(x0 + 70, 0); g.lineTo(x0 + 86, 0); g.lineTo(x0 - 38 + 70 - 60, 300 + 40); g.lineTo(x0 - 54 + 70 - 60, 300 + 40); g.closePath(); g.fill(); void yy; }
      g.restore(); }
    if (lamp > 0) {
      const lx = 46 - cam; ho_glow(lx, 296, 190, '255,130,30', 0.34 * lamp); ho_ellDith(lx + 4, 338, 100, 15, AM[8], 0.22 * lamp); ho_ellDith(lx + 4, 338, 56, 9, AM[9], 0.18 * lamp);
      ho_motes(t, { n: 28, cx: lx + 20, cy: 270, x0: 0, x1: 150, y0: 180, y1: 340, cam, vx: 0.5, vy: 0.5 });
    }
    vignette(0.62, 80, 300, 135, 250, '3,2,8');
  }
  return res;
}

// ════════════════════════════════════════════════════════════════════════════════════════
// 12. LA CHAMBRE DE LUSTIG : miroir en pied, portemanteau, chapeaux, canne, valise, lampe de chevet
// ════════════════════════════════════════════════════════════════════════════════════════
// ── ho_chapeau(x, y, s, o) : chapeau posé ; (x, y) = milieu du bas ; o.kind 'melon' (défaut) | 'haut' (haut-de-forme) | 'canotier' ; o.rot (rad) ; o.col (tissu : '#…' ; défaut noir / paille)
function ho_chapeau(x, y, s, o = {}) {
  o = o || {}; s = ho_fin(s, 1); const kind = o.kind ?? 'melon', g = ho_ctx();
  g.save(); g.translate(Math.round(x), Math.round(y)); if (o.rot) g.rotate(o.rot);
  const Rr = (xx, yy, ww, hh, c) => { g.fillStyle = c; g.fillRect(Math.round(xx * s), Math.round(yy * s), Math.max(1, Math.round(ww * s)), Math.max(1, Math.round(hh * s))); };
  const E = (cx_, cy_, rx_, ry_, c) => { g.fillStyle = c; g.beginPath(); g.ellipse(cx_ * s, cy_ * s, rx_ * s, Math.max(0.5, ry_ * s), 0, 0, TAU); g.fill(); };
  if (kind === 'haut') {
    E(0, -1, 17, 4.6, ho_K); E(0, -1.4, 16, 3.8, NI[1]); Rr(-9.5, -27, 19, 25, ho_K); Rr(-8.5, -27, 17, 25, NI[1]); Rr(-8.5, -27, 3, 25, ST[2]); Rr(5.5, -27, 3, 25, NI[0]); E(0, -27, 8.5, 2.6, NI[2]); E(-1, -27.4, 6, 1.6, ST[1]); Rr(-8.5, -9, 17, 3.5, NI[0]); Rr(-8.5, -9, 17, 1, ST[3]);
    E(-10, -2.8, 3, 1, ST[3]);
  } else if (kind === 'canotier') {
    E(0, -1, 17, 4.6, ho_K); E(0, -1.4, 16, 3.8, SK[4]); E(0, -2, 13, 3, SK[3]); Rr(-8.5, -13, 17, 12, ho_K); Rr(-7.5, -13, 15, 11, SK[4]); Rr(-7.5, -13, 3, 11, WH[1]); Rr(5, -13, 3, 11, SK[2]); E(0, -13, 7.5, 2.4, SK[3]); Rr(-7.5, -7, 15, 3, RD[3]); Rr(-7.5, -5, 15, 1, BL[3]);
  } else {
    E(0, -1, 15, 4, ho_K); E(0, -1.2, 14, 3.2, NI[1]); E(-9, -2.2, 3.5, 1, ST[3]);
    g.fillStyle = ho_K; g.beginPath(); g.ellipse(0, -9 * s, 10.5 * s, 11 * s, 0, Math.PI, TAU); g.fillRect(-10.5 * s, -9 * s, 21 * s, 8 * s); g.fill();
    g.fillStyle = o.col ?? NI[1]; g.beginPath(); g.ellipse(0, -9 * s, 9.5 * s, 10 * s, 0, Math.PI, TAU); g.fill(); g.fillRect(-9.5 * s, -9 * s, 19 * s, 7.5 * s);
    g.fillStyle = ST[2]; g.beginPath(); g.ellipse(-3 * s, -11 * s, 5 * s, 7 * s, 0, Math.PI * 1.05, Math.PI * 1.6); g.fill();
    Rr(-9.5, -5, 19, 3, NI[0]); Rr(-9.5, -5, 19, 1, ST[2]);
  }
  g.restore();
}
// ── ho_canne(x, y, s, o) : canne à pommeau d'argent, posée debout contre quelque chose ; (x, y) = bout ; hauteur 70 s
function ho_canne(x, y, s, o = {}) {
  o = o || {}; s = ho_fin(s, 1); const h = 70 * s, lean = o.lean ?? 0.07, tx = x + Math.sin(lean) * h, ty = y - Math.cos(lean) * h;
  ho_line(x, y, tx, ty, ho_K, 4); ho_line(x, y, tx, ty, WO[1], 2); ho_line(x - 1, y, tx - 1, ty, WO[4], 1);
  ho_R(x - 1, y - 2, 3, 3, ST[4]); ho_ell(tx, ty - 2 * s, 4 * s, 3 * s, ho_K); ho_ell(tx, ty - 2 * s, 3 * s, 2.2 * s, ST[6]); ho_P(tx - 1, ty - 3 * s, WH[3]); ho_R(tx - 2 * s, ty + 1, 5 * s, 2, ST[5]);
}
// ── ho_miroir(x, y, w, h, t, o) : psyché (miroir en pied sur pieds, cadre de bois à filet d'or, couronnement). (x, y) = milieu du bas des pieds ; w, h = cadre (84 × 172 conseillé)
//    o.reflect = function(info) : rappel de dessin APPELÉ DANS LE VERRE (découpé, éventuellement retourné) pour y dessiner le reflet du personnage ; info = { x, y, w, h (verre), cx, cy, bottom (y du bas du verre), top, rot }.
//    Le rappel dessine avec les primitives du moteur (R, disc, layerBegin / layerEnd, sprites de personnages…) en coordonnées ÉCRAN, découpé par le verre : dessinez le personnage tel qu'on le voit dans la glace (de face, au même x que le vrai, en le rapetissant un peu pour la profondeur). o.flip true : retourne le reflet horizontalement autour de l'axe du verre (miroir de côté).
//    Après le rappel : voile bleuté et reflet en diagonale qui glisse (o.sheen : position 0..1, défaut automatique ; o.shine 1 : intensité). o.reflectAlpha 0..1 (transparence du reflet, défaut 1) · o.room false (sans reflet de la pièce dans le verre)
//    renvoie { glass: [x, y, w, h], cx, cy, bottom, top, frame: [x, y, w, h] }
function ho_miroir(x, y, w, h, t, o = {}) {
  o = o || {}; w = Math.round(w); h = Math.round(h); const post = 5, fx0 = Math.round(x - w / 2), fy1 = Math.round(y - 12), fy0 = fy1 - h + 12, gw = w - 16, gx = fx0 + 8, gy = fy0 + 8, gh = fy1 - fy0 - 16;
  ho_ell(x + 3, y + 1, w / 2 + 8, 4, 'rgba(5,4,15,0.5)');
  // pieds en volute et montants
  for (const sx of [-1, 1]) { const px_ = sx < 0 ? fx0 - 6 : fx0 + w + 1; ho_R(px_ - 1, fy0 + 8, post + 2, fy1 - fy0 + 6, ho_K); ho_R(px_, fy0 + 8, post, fy1 - fy0 + 5, WO[3]); ho_R(px_, fy0 + 8, 1, fy1 - fy0 + 5, WO[5]); ho_R(px_ + post - 1, fy0 + 8, 1, fy1 - fy0 + 5, WO[1]); ho_ell(px_ + post / 2, fy0 + 7, 4, 3, YE[1]); ho_P(px_ + 1, fy0 + 6, YE[3]);
    ho_line(px_ + post / 2, fy1 + 4, px_ + post / 2 + sx * 12, y, ho_K, 4); ho_line(px_ + post / 2, fy1 + 4, px_ + post / 2 + sx * 12, y, WO[3], 2); ho_R(px_ + post / 2 + sx * 12 - 3, y - 2, 7, 3, WO[2]); }
  // cadre arrondi en haut
  const arch = (x0, y0, ww, hh, c, rr) => { ho_R(x0, y0 + rr, ww, hh - rr, c); for (let dy = 0; dy < rr; dy++) { const hw = Math.sqrt(Math.max(0, rr * rr - (rr - dy - 0.5) * (rr - dy - 0.5))); ho_R(x0 + ww / 2 - hw, y0 + dy, hw * 2, 1, c); } };
  arch(fx0 - 1, fy0 - 1, w + 2, fy1 - fy0 + 2, ho_K, w / 2); arch(fx0, fy0, w, fy1 - fy0, WO[3], w / 2); arch(fx0 + 1, fy0 + 1, w - 2, fy1 - fy0 - 2, WO[4], w / 2 - 1);
  for (let i = 0; i < 12; i++) ho_R(fx0 + 2 + Math.round(ho_h(i, 3) * (w - 6)), fy0 + 14 + Math.round(ho_h(i, 4) * (fy1 - fy0 - 20)), 1, 6 + Math.round(ho_h(i, 5) * 10), WO[3]);
  arch(fx0 + 4, fy0 + 4, w - 8, fy1 - fy0 - 8, YE[0], w / 2 - 4); arch(fx0 + 5, fy0 + 5, w - 10, fy1 - fy0 - 10, YE[2], w / 2 - 5); arch(fx0 + 6, fy0 + 6, w - 12, fy1 - fy0 - 12, YE[1], w / 2 - 6);
  // verre
  const g = ho_ctx(), r_ = gw / 2; g.save(); g.beginPath(); g.moveTo(gx, gy + gh); g.lineTo(gx, gy + r_); g.arc(gx + r_, gy + r_, r_, Math.PI, 0); g.lineTo(gx + gw, gy + gh); g.closePath(); g.clip();
  const grd = g.createLinearGradient(gx, gy, gx + gw, gy + gh); grd.addColorStop(0, NI[5]); grd.addColorStop(0.5, NI[4]); grd.addColorStop(1, NI[3]); g.fillStyle = grd; g.fillRect(gx, gy, gw, gh);
  if (o.room !== false) { g.fillStyle = AM[4]; g.fillRect(gx + 2, gy + gh * 0.62, gw - 4, 1); for (let i = 0; i < 3; i++) { g.fillStyle = i % 2 ? AM[5] : AM[3]; g.fillRect(gx + 3 + i * (gw / 3), gy + gh * 0.63, gw / 3 - 3, gh * 0.37); } ho_glow(gx + gw * 0.78, gy + gh * 0.3, 26, '255,160,60', 0.35); }
  const info = { x: gx, y: gy, w: gw, h: gh, cx: gx + gw / 2, cy: gy + gh / 2, bottom: gy + gh, top: gy, rot: o.rot ?? 0 };
  if (typeof o.reflect === 'function') {
    const prev = ho_c; ho_c = null;
    const flip = !!o.flip, A = flip ? L.getImageData(gx, gy, gw, gh) : null;
    if (o.reflectAlpha != null) g.globalAlpha = o.reflectAlpha;
    o.reflect(info);
    g.globalAlpha = 1;
    if (flip) {                                                                   // retourne horizontalement ce que le rappel vient d'ajouter (comparaison avant / après)
      const B = L.getImageData(gx, gy, gw, gh), a = A.data, b = B.data, out = new Uint8ClampedArray(a);
      for (let j = 0; j < gh; j++) for (let i = 0; i < gw; i++) { const k = (j * gw + i) * 4; if (a[k] !== b[k] || a[k + 1] !== b[k + 1] || a[k + 2] !== b[k + 2]) { const m = (j * gw + (gw - 1 - i)) * 4; out[m] = b[k]; out[m + 1] = b[k + 1]; out[m + 2] = b[k + 2]; out[m + 3] = 255; } }
      L.putImageData(new ImageData(out, gw, gh), gx, gy);
    }
    ho_c = prev;
  }
  // voile du verre, reflet en diagonale qui glisse, bords sombres
  g.fillStyle = 'rgba(120,160,230,0.13)'; g.fillRect(gx, gy, gw, gh);
  const sh = ((o.sheen ?? (t * 0.07)) % 1 + 1) % 1, sx0 = gx - 30 + sh * (gw + 60);
  g.fillStyle = `rgba(255,255,255,${0.12 * (o.shine ?? 1)})`; g.beginPath(); g.moveTo(sx0, gy + gh); g.lineTo(sx0 + 10, gy + gh); g.lineTo(sx0 + 10 + gh * 0.5, gy); g.lineTo(sx0 + gh * 0.5, gy); g.closePath(); g.fill();
  g.fillStyle = `rgba(255,255,255,${0.07 * (o.shine ?? 1)})`; g.beginPath(); g.moveTo(sx0 + 14, gy + gh); g.lineTo(sx0 + 18, gy + gh); g.lineTo(sx0 + 18 + gh * 0.5, gy); g.lineTo(sx0 + 14 + gh * 0.5, gy); g.closePath(); g.fill();
  g.restore();
  ho_R(gx, gy + r_, 1, gh - r_, NI[0]); ho_R(gx + gw - 1, gy + r_, 1, gh - r_, NI[0]); ho_R(gx + 2, gy + gh - 1, gw - 4, 1, ST[4]);
  ho_ell(x, fy0 - 3, 6, 4, YE[0]); ho_ell(x, fy0 - 4, 5, 3, YE[1]); ho_P(x - 1, fy0 - 5, YE[3]); ho_R(x - 1, fy0 - 9, 3, 4, YE[1]);                         // couronnement
  return { glass: [gx, gy, gw, gh], cx: info.cx, cy: info.cy, bottom: gy + gh, top: gy, frame: [fx0, fy0, w, fy1 - fy0] };
}
// ── ho_portemanteau(x, y, s, t, o) : portemanteau de bois tourné à quatre crochets et pied en tripode ; (x, y) = milieu du pied ; hauteur ≈ 150 s
//    o.coat true (long manteau gris anthracite) · o.hat 'melon' | 'haut' | false (au sommet) · o.cane true (canne accrochée) · o.scarf (écharpe rouge) · le manteau se balance très légèrement
//    renvoie { top: [x, y], hooks: [[x, y], …] }
function ho_portemanteau(x, y, s, t, o = {}) {
  o = o || {}; s = ho_fin(s, 1); const H = 150 * s, ty = y - H, sw = Math.sin(t * 0.7) * 0.8;
  ho_ell(x + 3, y + 1, 18 * s, 3.5 * s, 'rgba(5,4,15,0.5)');
  // pied : trois jambes courbes
  for (const sx of [-1, 0, 1]) { const ex = x + sx * 15 * s; ho_line(x, y - 10 * s, ex, y - (sx ? 1 : 3) * s, ho_K, 4); ho_line(x, y - 10 * s, ex, y - (sx ? 1 : 3) * s, WO[2], 2); ho_P(ex, y - 1, WO[1]); if (sx) ho_ell(ex, y - 1, 2 * s, 1.4 * s, WO[1]); }
  ho_ell(x, y - 11 * s, 5 * s, 3 * s, ho_K); ho_ell(x, y - 11 * s, 4 * s, 2.3 * s, WO[3]);
  // fût tourné
  const pw = Math.max(3, Math.round(5 * s)); ho_R(x - pw / 2 - 1, ty + 8 * s, pw + 2, H - 18 * s, ho_K); ho_R(x - pw / 2, ty + 8 * s, pw, H - 18 * s, WO[3]); ho_R(x - pw / 2, ty + 8 * s, 1, H - 18 * s, WO[5]); ho_R(x + pw / 2 - 1, ty + 8 * s, 1, H - 18 * s, WO[1]);
  for (const f of [0.28, 0.6, 0.9]) { const yy = ty + H * f; ho_ell(x, yy, 4 * s, 1.8 * s, ho_K); ho_ell(x, yy, 3.2 * s, 1.2 * s, WO[4]); ho_P(x - 2, yy - 1, WO[6]); }
  // couronnement : boule + crochets
  ho_ell(x, ty + 3 * s, 4.5 * s, 4.5 * s, ho_K); ho_ell(x, ty + 3 * s, 3.8 * s, 3.8 * s, WO[3]); ho_ell(x - 1, ty + 2 * s, 2 * s, 2 * s, WO[5]); ho_P(x - 2, ty + 1, WO[6]);
  const hooks = []; for (const sx of [-1, 1]) for (const lv of [0, 1]) { const hx = x + sx * (7 + lv * 5) * s, hy = ty + (14 + lv * 20) * s; ho_line(x, hy - 3 * s, hx, hy - 6 * s, ho_K, 3); ho_line(x, hy - 3 * s, hx, hy - 6 * s, YE[1], 1); ho_line(hx, hy - 6 * s, hx + sx * 3 * s, hy - 1 * s, YE[1], 1); ho_P(hx + sx * 3 * s, hy, YE[3]); hooks.push([hx + sx * 2 * s, hy]); }
  if (o.coat) {                                                                    // manteau long sur le crochet gauche haut
    const cx0 = hooks[0][0] - 2 * s + sw, cy0 = hooks[0][1] + 3, w_ = 32 * s, hh = 78 * s, ps = [[cx0 - w_ / 2, cy0 + 6 * s], [cx0 - 5 * s, cy0], [cx0 + 5 * s, cy0], [cx0 + w_ / 2, cy0 + 6 * s], [cx0 + w_ / 2 + 3 * s + sw, cy0 + hh], [cx0 - w_ / 2 - 3 * s + sw, cy0 + hh]];
    ho_poly(ps.map(p => [p[0] + (p[0] < cx0 ? -1 : 1), p[1] + (p[1] > cy0 + 10 ? 1 : -1)]), ho_K); ho_poly(ps, ST[2]);
    for (let i = 0; i < 6; i++) { const f = i / 5, xx = lerp(cx0 - w_ / 2 + 2, cx0 + w_ / 2 - 2, f); ho_line(xx, cy0 + 8 * s, xx + sw * 0.8 + (f - 0.5) * 3, cy0 + hh - 1, i % 2 ? ST[1] : ST[3], 1); }
    ho_R(cx0 - w_ / 2, cy0 + 6 * s, 3 * s, hh - 6 * s, ST[4]); ho_poly([[cx0 - 5 * s, cy0], [cx0, cy0 + 16 * s], [cx0 + 5 * s, cy0]], ST[1]); ho_line(cx0 - 5 * s, cy0 + 1, cx0, cy0 + 16 * s, ST[5], 1);
    for (let i = 0; i < 3; i++) ho_P(cx0 + 1, cy0 + 20 * s + i * 9 * s, YE[2]);
    if (o.scarf) { ho_line(cx0 - 6 * s, cy0 + 2, cx0 - 6 * s + sw, cy0 + 26 * s, ho_K, 5); ho_line(cx0 - 6 * s, cy0 + 2, cx0 - 6 * s + sw, cy0 + 26 * s, RD[3], 3); ho_line(cx0 - 7 * s, cy0 + 2, cx0 - 7 * s + sw, cy0 + 24 * s, RD[5], 1); }
  }
  if (o.hat !== false && o.hat !== undefined) ho_chapeau(x, ty - 2 * s + 1, 0.9 * s, { kind: o.hat === true ? 'haut' : o.hat });
  if (o.cane) { const hk = hooks[3]; ho_canne(hk[0] + 2, hk[1] + 66 * s, s, { lean: -0.05 }); }
  return { top: [x, ty], hooks };
}
// ── ho_lampeChevet(x, y, s, t, o) : lampe de chevet à abat-jour plissé (cône de tissu crème qui diffuse la lumière), pied de céramique bleue ; (x, y) = milieu du socle ; ≈ 30 × 52 px à s = 1 ; o.on 1 · o.glow 1
function ho_lampeChevet(x, y, s, t, o = {}) {
  o = o || {}; s = ho_fin(s, 1); const on = clamp(o.on ?? 1), fk = 1 + 0.04 * Math.sin(t * 9);
  if (on > 0 && (o.glow ?? 1) > 0) { ho_glow(x, y - 36 * s, 130 * s * fk, '255,150,50', 0.42 * on * (o.glow ?? 1)); ho_glow(x, y - 36 * s, 60 * s, '255,210,130', 0.3 * on); }
  ho_ell(x + 2, y + 1, 11 * s, 2.6 * s, 'rgba(5,4,15,0.5)');
  ho_ell(x, y - 3 * s, 8 * s, 3 * s, ho_K); ho_ell(x, y - 3 * s, 7 * s, 2.4 * s, CY[1]);
  ho_poly([[x - 7 * s, y - 4 * s], [x + 7 * s, y - 4 * s], [x + 3 * s, y - 24 * s], [x - 3 * s, y - 24 * s]], ho_K);
  ho_ell(x, y - 15 * s, 8.5 * s, 11 * s, ho_K); ho_ell(x, y - 15 * s, 7.5 * s, 10 * s, CY[2]); ho_ell(x - 2 * s, y - 17 * s, 4 * s, 6 * s, CY[3]); ho_ell(x - 3 * s, y - 20 * s, 1.6 * s, 3 * s, CY[4]); ho_ell(x + 3 * s, y - 12 * s, 3 * s, 5 * s, CY[1]);
  ho_R(x - 3 * s, y - 26 * s, 6 * s, 3 * s, YE[1]); ho_R(x - 3 * s, y - 26 * s, 6 * s, 1, YE[3]);
  const sw0 = 12 * s, sw1 = 19 * s, sh = 22 * s, sy0 = y - 26 * s - sh + 2;
  ho_poly([[x - sw0 - 1, sy0 - 1], [x + sw0 + 1, sy0 - 1], [x + sw1 + 1, sy0 + sh + 1], [x - sw1 - 1, sy0 + sh + 1]], ho_K);
  for (let j = 0; j < sh; j++) { const f = j / (sh - 1), hw = lerp(sw0, sw1, f); for (let i = -Math.round(hw); i <= Math.round(hw); i++) { const pl = (Math.floor((i + 64) / Math.max(2, Math.round(2.4 * s))) & 1), b = 0.5 + 0.5 * (1 - Math.abs(i) / hw) * 0.8 + (pl ? -0.12 : 0.05) + (1 - f) * 0.08; ho_P(x + i, sy0 + j, on <= 0 ? [SK[2], SK[3]][pl] : [AM[7], AM[8], AM[9], YE[3], AM[10]][clamp(Math.floor(b * 4.6) - (on < 1 ? 1 : 0), 0, 4)]); } }
  ho_R(x - sw0, sy0, sw0 * 2, 1, YE[1]); ho_R(x - sw1, sy0 + sh - 1, sw1 * 2, 1, YE[1]);
}
// ── ho_gueridon(x, y, w, h, o) : petite table ronde de chevet (plateau de bois + pied + tiroir) ; (x, y) = pied ; w largeur du plateau
function ho_gueridon(x, y, w, h, o = {}) {
  const wd = Math.round(w), ty = y - h; ho_ell(x + 2, y + 1, wd / 2 + 2, 3, 'rgba(5,4,15,0.5)');
  ho_R(x - wd / 2 + 4, ty + 4, wd - 8, h - 4, ho_K); ho_R(x - wd / 2 + 5, ty + 5, wd - 10, h - 6, WO[2]); ho_R(x - wd / 2 + 5, ty + 5, 2, h - 6, WO[4]); ho_R(x + wd / 2 - 8, ty + 5, 3, h - 6, WO[0]);
  ho_R(x - wd / 2 + 9, ty + 10, wd - 18, 10, WO[1]); ho_R(x - wd / 2 + 9, ty + 10, wd - 18, 1, WO[3]); ho_R(x - 3, ty + 14, 6, 2, YE[2]);
  ho_ell(x, ty + 2, wd / 2 + 1, 4, ho_K); ho_ell(x, ty + 2, wd / 2, 3, WO[4]); ho_ell(x, ty + 1, wd / 2 - 2, 2, WO[5]); ho_R(x - wd / 2 + 2, ty + 3, wd - 4, 1, WO[1]);
  ho_R(x - wd / 2 + 2, y - 3, 4, 3, WO[1]); ho_R(x + wd / 2 - 6, y - 3, 4, 3, WO[1]);
}
// ── ho_valise(x, y, s, t, o) : valise de voyage (voir ho_mallette, style 'valise') : sangles, étiquettes, chemises et cravate à l'intérieur quand elle est ouverte
function ho_valise(x, y, s, t, o = {}) { return ho_mallette(x, y, s, t, { style: 'valise', contents: 'linge', ...o }); }

// ════════════════════════════════════════════════════════════════════════════════════════
// 13. LA CHAMBRE : décor et composition
// ════════════════════════════════════════════════════════════════════════════════════════
// mur (papier peint gris-bleu rayé à motif d'or, cimaise, lambris, plinthe) : sprite 330 × 350 (x local = x écran + 30)
function ho_chambreWall() {
  return ho_cache('chambreWall', 330, 350, () => {
    const g = ho_ctx();
    for (let y = 0; y < 350; y++) for (let x = 0; x < 330; x++) {
      const st = ((x + 30) % 16) < 8, f = 0.42 + (st ? 0.1 : 0) + (ho_bay(x, y) - 0.5) * 0.2 + (ho_n2(x / 30, y / 30, 8) - 0.5) * 0.12 - (y < 30 ? 0.08 : 0);
      g.fillStyle = y < 252 ? [NI[1], NI[2], NI[2], NI[3], NI[3]][clamp(Math.floor(f * 6.4) - 1, 0, 4)] : [WO[0], WO[1], WO[1], WO[2], WO[2]][clamp(Math.floor(f * 6.4) - 1, 0, 4)];
      g.fillRect(x, y, 1, 1);
    }
    for (let y = 56; y < 246; y += 22) for (let x = 6; x < 330; x += 16) { const o_ = (y / 22 & 1) * 8; ho_P(x + o_, y, AM[5]); ho_P(x + o_ - 1, y + 1, AM[4]); ho_P(x + o_ + 1, y + 1, AM[4]); ho_P(x + o_, y + 2, AM[5]); }
    ho_R(0, 34, 330, 3, YE[1]); ho_R(0, 34, 330, 1, YE[3]); ho_R(0, 37, 330, 1, ho_K); ho_dith(0, 38, 330, 5, ho_K, 0.4);
    ho_R(0, 250, 330, 3, YE[0]); ho_R(0, 250, 330, 1, YE[2]); ho_R(0, 253, 330, 1, ho_K);
    for (let x = 0; x < 330; x += 38) { ho_R(x + 4, 258, 30, 76, ho_K); ho_R(x + 5, 259, 28, 74, WO[1]); ho_R(x + 5, 259, 28, 1, WO[3]); ho_R(x + 5, 259, 1, 74, WO[3]); ho_R(x + 32, 260, 1, 73, WO[0]); ho_R(x + 6, 332, 27, 1, WO[0]); ho_R(x + 9, 263, 20, 66, WO[2]); ho_R(x + 9, 263, 20, 1, WO[1]); ho_R(x + 9, 263, 1, 66, WO[1]); ho_R(x + 28, 264, 1, 65, WO[3]); }
    ho_R(0, 336, 330, 10, WO[0]); ho_R(0, 336, 330, 1, WO[4]); ho_R(0, 337, 330, 1, WO[2]); ho_R(0, 346, 330, 1, ho_K);
  });
}
// plancher et tapis de la chambre (sprite 330 × 140 posé en y = 346)
function ho_chambreFloor() {
  return ho_cache('chambreFloor', 330, 140, () => {
    const g = ho_ctx();
    for (let y = 0; y < 140; y++) { const k = 1 + y / 40, pj = Math.floor(8 / 1 * Math.log(1 + y / 6)); for (let x = 0; x < 330; x++) { const pi = Math.floor((x - 135 - 30) / (14 * k)), id = pi * 31 + pj * 7, f = 0.3 + (y / 140) * 0.1 + (ho_h(id, 9) - 0.5) * 0.3 + (ho_bay(x, y) - 0.5) * 0.25; g.fillStyle = [WO[0], WO[1], WO[2], WO[3], WO[3]][clamp(Math.floor(f * 6.5) - 1, 0, 4)]; g.fillRect(x, y, 1, 1);
      if (x > 0 && Math.floor((x - 1 - 165) / (14 * k)) !== pi) { g.fillStyle = WO[0]; g.fillRect(x, y, 1, 1); } } }
    for (let j = 0; j < 7; j++) { const yy = Math.round(8 * (Math.exp(j / 8) - 1) * 6); ho_R(0, yy, 330, 1, WO[0]); }
    // tapis (grand rectangle en perspective à bordure d'or)
    const rug = (y0, y1, xa0, xa1, xb0, xb1, c) => { ho_poly([[xa0, y0], [xa1, y0], [xb1, y1], [xb0, y1]], c); };
    rug(16, 140, 40, 290, 0, 330, RD[0]); rug(19, 140, 46, 284, 6, 324, YE[0]); rug(21, 140, 50, 280, 12, 318, RD[1]); rug(26, 140, 62, 268, 24, 306, RD[2]);
    for (let i = 0; i < 6; i++) for (let j = 0; j < 4; j++) { const cx_ = 80 + i * 34 + (j & 1) * 17, cy_ = 40 + j * 24, wd = 8 + j * 2; ho_poly([[cx_, cy_ - 6], [cx_ + wd, cy_], [cx_, cy_ + 6], [cx_ - wd, cy_]], RD[3]); ho_poly([[cx_, cy_ - 3], [cx_ + wd * 0.5, cy_], [cx_, cy_ + 3], [cx_ - wd * 0.5, cy_]], AM[5]); }
    ho_dith(0, 0, 330, 14, ho_K, 0.4);
  });
}
// ── ho_chambre(t, o) : la chambre / le cabinet de Lustig, plein cadre : papier peint gris-bleu, lambris, fenêtre sur la nuit à rideau de velours, plancher et tapis ; miroir en pied (centre x = 84), guéridon et lampe de chevet (x = 158), valise (x = 214), portemanteau (x = 248)
//    o.cam (px : mur 0,5 ; reste 1) · o.layer 'all' | 'back' (décor et meubles, AVANT le personnage) | 'front' (lueur de la lampe, lune, vignette, APRÈS le personnage) · o.lamp 1 (intensité de la lampe) · o.moon 1
//    o.reflect = function(info) (dessin du reflet dans le miroir : voir ho_miroir) · o.mirror { x, w, h } (position / taille du miroir) · o.valise { open 0..1, s } · o.coat (true) · o.hat ('melon' | 'haut' | false)
//    o.items { miroir, lampe, valise, portemanteau, tableau : false pour retirer }
//    renvoie { floorY: 346, mirror: { …ho_miroir }, lamp: [x, y], valise: { …ho_mallette }, rack: { x, y } }
function ho_chambre(t, o = {}) {
  o = o || {}; const cam = o.cam || 0, layer = o.layer ?? 'all', it = o.items ?? {}, lamp = o.lamp ?? 1, fx = Math.round(-30 - cam * 0.5), dx = Math.round(-30 - cam);
  const res = { floorY: 346, lamp: [158 - cam, 313], rack: { x: 248 - cam, y: 352 } };
  if (layer !== 'front') {
    ho_ctx().drawImage(ho_chambreWall(), fx, 0);
    const wx = fx + 30 + 215;                                                       // fenêtre
    ho_ctx().drawImage(ho_windowSprite(50, 124, 4), wx - 25 - 4, 60 - 4);
    ho_curtain(wx - 26, 52, 16, 154, t, { seed: 21, sway: 1.1 }); 
    ho_R(wx - 30, 48, 62, 8, RD[2]); ho_R(wx - 30, 48, 62, 2, RD[4]); ho_R(wx - 30, 54, 62, 2, RD[1]); for (let x = wx - 30; x < wx + 32; x += 3) ho_R(x, 56, 1, 3, YE[2]);
    if (it.tableau !== false) { const px_ = fx + 30 + 150; ho_ell(px_, 122, 15, 20, ho_K); ho_ell(px_, 122, 14, 19, YE[1]); ho_ell(px_, 122, 12, 17, YE[0]); ho_ell(px_, 122, 11, 16, WH[1]); ho_disc(px_, 118, 5, ST[1]); ho_ell(px_, 133, 8, 6, ST[1]); ho_R(px_ - 2, 122, 5, 5, ST[1]); ho_P(px_ - 7, 110, WH[3]); ho_P(px_ - 6, 111, WH[2]); }
    ho_ctx().drawImage(ho_chambreFloor(), dx, 346);
    if (it.miroir !== false) { const m = o.mirror ?? {}; res.mirror = ho_miroir((m.x ?? 84) - cam, 348, m.w ?? 88, m.h ?? 176, t, { reflect: o.reflect, flip: o.flip, sheen: o.sheen }); }
    if (it.lampe !== false) { ho_gueridon(158 - cam, 346, 44, 30); ho_lampeChevet(158 - cam, 316, 1, t, { on: lamp, glow: 0 }); }
    if (it.valise !== false) { const v = o.valise ?? {}; res.valise = ho_valise(214 - cam, v.y ?? 354, v.s ?? 0.74, t, { open: v.open ?? 0, shadow: 1 }); }
    if (it.portemanteau !== false) ho_portemanteau(248 - cam, 352, 1, t, { coat: o.coat ?? true, hat: o.hat === undefined ? 'melon' : o.hat, cane: false, scarf: true });
  }
  if (layer !== 'back') {
    if (lamp > 0) { ho_glow(158 - cam, 285, 150, '255,130,30', 0.4 * lamp); ho_glow(158 - cam, 356, 70, '255,130,30', 0.2 * lamp); ho_motes(t, { n: 22, cx: 158 - cam, cy: 280, x0: 60, x1: 260, y0: 160, y1: 345, cam, vx: 0.4, vy: 0.5 }); }
    if ((o.moon ?? 1) > 0) ho_glow(215 - cam * 0.5, 120, 100, '60,90,190', 0.22 * (o.moon ?? 1));
    vignette(0.6, 90, 300, 135, 230, '3,2,10');
  }
  return res;
}

// ════════════════════════════════════════════════════════════════════════════════════════
// 14. LA FAÇADE DU PALACE (jour / crépuscule), la voiture, le portier, les drapeaux, le lampadaire
// ════════════════════════════════════════════════════════════════════════════════════════
const HO_FAC = [
  { name: 'jour', sky: [[0, BL[4]], [0.5, CY[3]], [1, NE[2]]], stone: [WH[2], SK[4], SK[3], SK[2], SK[1]], rim: WH[3], deep: SK[1], roof: [ST[6], ST[5], ST[4], ST[3], ST[2]], roofRim: WH[3], glass: [CY[2], BL[3], BL[2], BL[1]], lit: AM[8], haze: '255,244,214', sun: 0.0 },
  { name: 'soir', sky: [[0, DU[1]], [0.3, DU[3]], [0.6, DU[6]], [0.85, AM[6]], [1, AM[8]]], stone: [AM[9], SK[4], SK[2], DU[5], DU[3]], rim: AM[10], deep: DU[1], roof: [AM[7], DU[5], DU[3], DU[2], DU[1]], roofRim: AM[9], glass: [NI[3], NI[2], NI[1], NI[0]], lit: YE[3], haze: '255,150,80', sun: 1 },
];
const HO_FC = [35, 100, 165, 230, 295];                       // colonnes de fenêtres (x local = x écran + 30)
// dessine le fût d'un balcon en fer forgé : x0 → x1 à la hauteur y (rampe de 8 px), dalle de pierre dessous
function ho_balcon(x0, x1, y, E, deep = false) {
  const w = x1 - x0; ho_R(x0 - 2, y + 8, w + 4, 3, E.stone[1]); ho_R(x0 - 2, y + 8, w + 4, 1, E.rim); ho_R(x0 - 2, y + 11, w + 4, 1, E.stone[3]); ho_R(x0 - 2, y + 12, w + 4, 2, E.deep); ho_dith(x0, y + 14, w, 3, ho_K, 0.5);
  ho_R(x0, y, w, 1, NI[0]); ho_R(x0, y + 7, w, 1, NI[0]);
  for (let x = x0; x < x1; x += 3) { ho_R(x, y + 1, 1, 6, NI[0]); const k = ((x - x0) / 3) | 0; if (k % 2) { ho_P(x + 1, y + 3, NI[1]); ho_P(x - 1, y + 4, NI[1]); } else { ho_P(x + 1, y + 2, NI[1]); ho_P(x + 1, y + 5, NI[1]); } }
  for (let x = x0 + 9; x < x1; x += 18) { ho_disc(x, y + 4, 2, NI[0]); ho_disc(x, y + 4, 1, E.stone[3]); }
  ho_P(x0, y - 1, E.rim); ho_P(x1 - 1, y - 1, E.deep);
}
// fenêtre : encadrement de pierre, vitre (sprite en cache selon l'état), fronton facultatif
function ho_winGlass(w, h, state, mode) {
  return ho_cache(`facwin:${w}:${h}:${state}:${mode}`, w, h, () => {
    const E = HO_FAC[mode], g = ho_ctx();
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      let c;
      if (state === 0) { const f = y / h + (ho_bay(x, y) - 0.5) * 0.3 + (((x + y * 0.5) % 16) < 3 ? -0.18 : 0); c = E.glass[clamp(Math.floor(f * 4), 0, 3)]; if (mode === 0 && ((x - y * 0.6 + 30) % 14) < 1.5) c = CY[4]; if (mode === 1 && ((x - y * 0.6 + 30) % 14) < 1.5) c = DU[5]; }
      else { const f = 0.3 + 0.65 * (1 - Math.abs(x - w / 2) / (w / 2)) * (1 - 0.3 * y / h) + (ho_bay(x, y) - 0.5) * 0.3; c = [AM[4], AM[6], AM[7], AM[8], YE[3], AM[9]][clamp(Math.floor(f * 6), 0, 5)]; if (state === 2) c = [AM[3], AM[5], AM[6], AM[7], AM[8], YE[3]][clamp(Math.floor(f * 6), 0, 5)]; }
      g.fillStyle = c; g.fillRect(x, y, 1, 1);
    }
    g.fillStyle = state === 0 ? NI[1] : AM[3]; g.fillRect(Math.floor(w / 2), 0, 1, h); g.fillRect(0, Math.round(h * 0.34), w, 1); if (h > 30) g.fillRect(0, Math.round(h * 0.7), w, 1);
    if (state) { g.fillStyle = AM[2]; const cw = Math.max(2, Math.round(w * 0.22)); g.fillRect(0, 0, cw, h); g.fillRect(w - cw, 0, cw, h); g.fillStyle = AM[3]; g.fillRect(cw, 0, 1, h); g.fillRect(w - cw - 1, 0, 1, h);
      if (state === 2) { g.fillStyle = AM[1]; g.fillRect(Math.floor(w / 2) - 2, Math.round(h * 0.45), 4, 3); g.fillRect(Math.floor(w / 2) - 1, Math.round(h * 0.4), 2, 2); } }
  });
}
// bâtiment (sprite 330 × 350, sans les vitres : elles se posent à part pour pouvoir s'allumer) — mode 0 jour, 1 crépuscule
function ho_facadeBuild(mode) {
  return ho_cache('facade' + mode, 330, 350, () => {
    const E = HO_FAC[mode], g = ho_ctx();
    // ── mur : de 76 à 346, pierre de taille ; l'éclairage vient de la gauche (soleil bas) ; rez-de-chaussée à bossages
    for (let y = 76; y < 346; y++) for (let x = 0; x < 330; x++) {
      const side = mode ? 0.9 - 0.55 * (x / 330) : 0.7 - 0.12 * (x / 330), top = mode ? 0.12 * (1 - (y - 76) / 270) : 0, gr = (ho_n2(x / 18, y / 7, 5) - 0.5) * 0.12;
      let f = side + top + gr + (ho_bay(x, y) - 0.5) * 0.22; if (y >= 300) f -= 0.06 + ((((y - 300) >> 3) + (((x + (((y - 300) >> 3) & 1) * 14) / 28) | 0)) & 1) * 0.0;
      g.fillStyle = E.stone[clamp(4 - Math.floor(f * 4.8), 0, 4)]; g.fillRect(x, y, 1, 1);
    }
    for (const sy of [136, 188, 240]) { ho_R(0, sy, 330, 3, E.stone[1]); ho_R(0, sy, 330, 1, E.rim); ho_R(0, sy + 3, 330, 2, E.stone[3]); ho_dith(0, sy + 5, 330, 4, E.deep, 0.5); }   // bandeaux de plancher
    for (let y = 300; y < 346; y += 8) ho_R(0, y, 330, 1, E.stone[3]); for (let y = 300; y < 346; y += 8) for (let x = ((y - 300) >> 3 & 1) * 14; x < 330; x += 28) ho_R(x, y, 1, 8, E.stone[3]);
    // ── corniche et toit mansardé
    ho_R(0, 76, 330, 3, E.stone[0]); ho_R(0, 79, 330, 2, E.stone[1]); for (let x = 0; x < 330; x += 6) { ho_R(x, 81, 4, 3, E.stone[2]); ho_R(x, 81, 4, 1, E.rim); } ho_R(0, 84, 330, 2, E.deep); ho_dith(0, 86, 330, 5, E.deep, 0.55);
    // toit : ardoises/zinc en écailles, sur un trapèze qui débute à y = 14
    const roofPoly = [[28, 16], [302, 16], [330, 76], [0, 76]];
    ho_poly(roofPoly, E.roof[2]);
    for (let y = 16; y < 76; y += 4) { const k = (y - 16) / 60, xa = 28 - 28 * k, xb = 302 + 28 * k; for (let x = Math.floor(xa); x < xb; x += 5) { const xx = x + ((y >> 2) & 1) * 2.5; const tone = E.roof[clamp(1 + Math.floor((ho_h2(x, y, 4) * 0.5 + (mode ? 0.5 * k : 0.2) + (1 - xx / 330) * 0.2) * 3), 0, 4)]; ho_R(xx, y, 5, 4, tone); ho_R(xx, y + 3, 5, 1, E.roof[3]); ho_R(xx, y, 1, 4, E.roof[3]); ho_P(xx + 1, y, E.roof[0]); } }
    ho_R(28, 14, 274, 2, E.roofRim); ho_R(28, 16, 274, 1, E.roof[3]);
    for (let x = 28; x < 302; x += 8) { ho_R(x, 11, 1, 4, ho_K); ho_P(x, 10, YE[2]); ho_P(x - 1, 12, ho_K); ho_P(x + 1, 12, ho_K); }                        // crête de fer
    ho_R(28, 14, 274, 1, ho_K);
    // lucarnes (aux colonnes 1, 2, 3)
    for (const cx of [100, 165, 230]) {
      const dx = cx - 13; ho_R(dx - 1, 34, 28, 40, ho_K); ho_R(dx, 35, 26, 39, E.stone[1]); ho_R(dx, 35, 2, 39, E.stone[0]); ho_R(dx + 24, 35, 2, 39, E.stone[3]); ho_R(dx + 4, 41, 18, 28, ho_K);
      ho_poly([[dx - 3, 36], [dx + 29, 36], [dx + 13, 22]], ho_K); ho_poly([[dx - 2, 35], [dx + 28, 35], [dx + 13, 24]], E.roof[1]); ho_poly([[dx + 13, 24], [dx + 28, 35], [dx + 13, 35]], E.roof[3]); ho_line(dx - 2, 35, dx + 13, 24, E.roofRim, 1); ho_R(dx + 12, 20, 2, 5, YE[2]); ho_P(dx + 12, 19, YE[3]);
      ho_R(dx + 2, 68, 22, 3, E.stone[2]); ho_R(dx + 2, 68, 22, 1, E.rim);
    }
    // cheminées de pierre à mitres de terre cuite
    for (const cx of [62, 262]) { ho_R(cx - 10, -2, 20, 26, ho_K); ho_R(cx - 9, -2, 18, 26, E.stone[2]); ho_R(cx - 9, -2, 4, 26, E.stone[1]); ho_R(cx + 6, -2, 3, 26, E.stone[4]); ho_R(cx - 11, 20, 22, 4, E.stone[1]); ho_R(cx - 11, 20, 22, 1, E.rim); for (let y = 0; y < 20; y += 5) ho_R(cx - 9, y, 18, 1, E.stone[3]);
      for (const dx of [-5, 3]) { ho_R(cx + dx - 1, -4, 5, 8, OC[2]); ho_R(cx + dx - 1, -4, 1, 8, OC[4]); ho_R(cx + dx - 2, -5, 7, 2, OC[1]); ho_R(cx + dx - 2, -5, 7, 1, OC[3]); } }
    // ── colonnes d'encadrements de fenêtres
    const surround = (cx, y0, w, h, kind) => {
      const x0 = cx - w / 2;
      ho_R(x0 - 3, y0 - 3, w + 6, h + 3, ho_K); ho_R(x0 - 2, y0 - 2, w + 4, h + 2, E.stone[0]); ho_R(x0 - 2, y0 - 2, 1, h + 2, E.rim); ho_R(x0 + w + 1, y0 - 2, 1, h + 2, E.stone[3]); ho_R(x0, y0, w, h, ho_K);
      if (kind === 'frontonT') { ho_poly([[x0 - 5, y0 - 3], [x0 + w + 5, y0 - 3], [cx, y0 - 12]], ho_K); ho_poly([[x0 - 3, y0 - 3], [x0 + w + 3, y0 - 3], [cx, y0 - 10]], E.stone[1]); ho_poly([[cx, y0 - 10], [x0 + w + 3, y0 - 3], [cx, y0 - 3]], E.stone[3]); ho_line(x0 - 3, y0 - 3, cx, y0 - 10, E.rim, 1); }
      else if (kind === 'frontonC') { ho_R(x0 - 4, y0 - 7, w + 8, 4, ho_K); ho_R(x0 - 3, y0 - 6, w + 6, 3, E.stone[1]); ho_R(x0 - 3, y0 - 6, w + 6, 1, E.rim); ho_ell(cx, y0 - 5, w / 2 + 3, 4, E.stone[1]); ho_ell(cx, y0 - 3, w / 2, 2, E.stone[2]); ho_R(cx - 1, y0 - 11, 3, 3, E.stone[0]); }
      else if (kind === 'linteau') { ho_R(x0 - 3, y0 - 5, w + 6, 3, E.stone[1]); ho_R(x0 - 3, y0 - 5, w + 6, 1, E.rim); ho_R(cx - 2, y0 - 7, 4, 3, E.stone[0]); }
    };
    const rows = [[92, 18, 36, 'linteau'], [144, 18, 36, 'frontonT'], [196, 20, 40, 'linteau'], [250, 24, 48, 'frontonC']];
    for (const [y0, w, h, k] of rows) for (const cx of HO_FC) { if (y0 === 92 && [100, 165, 230].includes(cx)) continue; surround(cx, y0, w, h, k); }
    // balcons
    ho_balcon(0, 330, 228, E); ho_balcon(0, 330, 290, E);
    for (const cx of HO_FC) { ho_balcon(cx - 14, cx + 14, 172, E); }
    for (const cx of HO_FC) for (const [y0, w] of [[92, 18]]) if (![100, 165, 230].includes(cx)) ho_balcon(cx - 13, cx + 13, 120, E);
    // consoles sous le grand balcon
    for (let x = 18; x < 330; x += 34) { ho_poly([[x - 3, 300], [x + 3, 300], [x + 1, 308], [x - 1, 308]], E.stone[2]); ho_line(x - 3, 300, x - 1, 308, E.rim, 1); }
    // ── rez-de-chaussée : baies cintrées + entrée
    for (const cx of [100, 230]) { const w = 22, x0 = cx - w / 2; ho_R(x0 - 3, 310, w + 6, 36, ho_K); ho_R(x0 - 2, 311, w + 4, 35, E.stone[0]); ho_ell(cx, 316, w / 2 + 2, 7, E.stone[0]); ho_R(x0, 318, w, 28, ho_K); ho_ell(cx, 318, w / 2, 8, ho_K); ho_R(cx - 2, 307, 4, 4, E.stone[1]); }
    // marquise (verrière) au-dessus de l'entrée
    ho_R(120, 296, 90, 3, ho_K); ho_poly([[116, 318], [214, 318], [208, 302], [122, 302]], ho_K); ho_poly([[118, 316], [212, 316], [207, 303], [123, 303]], mode ? NI[3] : CY[1]);
    for (let x = 122; x < 212; x += 9) ho_line(x, 303, x - 2, 316, NI[0], 1); ho_R(116, 316, 98, 3, YE[0]); ho_R(116, 316, 98, 1, YE[2]); ho_R(118, 319, 94, 1, ho_K);
    for (const x of [124, 206]) { ho_R(x - 1, 316, 3, 30, YE[1]); ho_R(x - 1, 316, 1, 30, YE[3]); ho_R(x - 3, 334, 7, 12, E.stone[1]); ho_R(x - 3, 334, 7, 1, E.rim); }
    ho_R(131, 322, 68, 24, ho_K); ho_R(132, 323, 66, 23, YE[0]);
    // marches et tapis rouge
    ho_R(110, 346, 110, 3, E.stone[1]); ho_R(110, 346, 110, 1, E.rim); ho_R(104, 349, 122, 3, E.stone[2]); ho_R(104, 349, 122, 1, E.stone[0]);
  });
}
// sol de la rue : trottoir, bordure, pavés (sprite 330 × 140 posé en y = 346)
function ho_facadeStreet(mode) {
  return ho_cache('facstreet' + mode, 330, 140, () => {
    const E = HO_FAC[mode], g = ho_ctx();
    for (let y = 0; y < 140; y++) for (let x = 0; x < 330; x++) {
      let c;
      if (y < 16) { const f = 0.5 + (ho_h2((x / 22) | 0, (y / 8) | 0, 3) - 0.5) * 0.3 + (ho_bay(x, y) - 0.5) * 0.2 - (mode ? 0.12 : 0); c = [E.stone[1], E.stone[2], E.stone[2], E.stone[3], E.stone[4]][clamp(Math.floor((1 - f) * 5.4) - 1, 0, 4)]; if (y % 8 === 0 || x % 22 === 0) c = E.stone[3]; }
      else if (y < 21) c = y < 18 ? E.stone[0] : (y < 20 ? E.stone[2] : ho_K);
      else { const row = (y - 21) >> 2, off = (row & 1) * 3, cell = ((x + off) / 7) | 0, f = 0.35 + (ho_h2(cell, row, 6) - 0.5) * 0.35 + (ho_bay(x, y) - 0.5) * 0.28 - (y - 21) / 119 * 0.15; c = mode ? [DU[1], DU[2], DU[3], DU[3], DU[5]][clamp(Math.floor(f * 6), 0, 4)] : [ST[2], ST[3], ST[4], ST[4], ST[5]][clamp(Math.floor(f * 6), 0, 4)]; if (((x + off) % 7 === 0) || (y - 21) % 4 === 0) c = mode ? DU[0] : ST[1]; }
      g.fillStyle = c; g.fillRect(x, y, 1, 1);
    }
    if (mode) for (let k = 0; k < 24; k++) { const x = 20 + ho_h(k, 2) * 290, y = 30 + ho_h(k, 3) * 100; ho_R(x, y, 3 + ho_h(k, 4) * 5, 1, AM[8]); }
    // tapis rouge de l'entrée : de la porte jusqu'au trottoir
    ho_poly([[118, 0], [212, 0], [222, 20], [108, 20]], RD[0]); ho_poly([[120, 0], [210, 0], [220, 19], [110, 19]], RD[2]); ho_R(120, 0, 90, 1, RD[4]); ho_R(121, 3, 88, 1, YE[1]); ho_R(112, 17, 106, 1, RD[1]);
  });
}
// ── voiture d'époque (berline noire des années 20 à phares de laiton, roues à rayons) : (x, y) = milieu du bas des roues ; ≈ 96 × 44 px à s = 1 ; o.flip (regarde à gauche) ; o.lights 0..1 (phares allumés) ; o.engine 1 (fumée d'échappement, tremblement)
function ho_voiture(x, y, s, t, o = {}) {
  o = o || {}; s = ho_fin(s, 1); const fl = o.flip ? -1 : 1, lt = o.lights ?? 0, trem = (o.engine ?? 1) * (Math.floor(t * 20) % 2) * 0.5;
  const X_ = v => x + fl * v * s, Y_ = v => y - v * s - trem, Rr = (a, b, w, h, c) => { const x0 = X_(a), x1 = X_(a + w); ho_R(Math.min(x0, x1), Y_(b + h), Math.abs(x1 - x0), Math.max(1, h * s), c); };
  ho_ell(x + 4, y + 1, 52 * s, 4 * s, 'rgba(5,4,15,0.55)'); ho_ellDith(x + 4, y + 2, 58 * s, 6 * s, ho_K, 0.4);
  if (lt > 0) { const gx = X_(54), gy = Y_(17); ho_ctx().save(); ho_ctx().globalCompositeOperation = 'lighter'; ho_ctx().globalAlpha = 0.5 * lt; ho_ctx().fillStyle = 'rgba(255,200,110,1)'; ho_ctx().beginPath(); ho_ctx().moveTo(gx, gy); ho_ctx().lineTo(gx + fl * 90, gy + 4); ho_ctx().lineTo(gx + fl * 90, gy + 26); ho_ctx().closePath(); ho_ctx().fill(); ho_ctx().restore(); ho_glow(gx, gy, 20 * s, '255,190,90', 0.7 * lt); }
  // châssis, ailes, marchepied
  Rr(-44, 8, 98, 4, ho_K); Rr(-44, 8, 98, 2, NI[1]);
  Rr(-42, 9, 12, 11, ho_K); Rr(-41, 10, 10, 9, NI[1]); Rr(-41, 18, 10, 1, ST[3]);                                         // aile arrière
  Rr(30, 9, 24, 12, ho_K); Rr(31, 10, 22, 10, NI[1]); Rr(31, 19, 22, 1, ST[3]);                                           // aile avant
  Rr(-30, 6, 60, 3, ho_K); Rr(-29, 7, 58, 2, NI[0]); Rr(-29, 8, 58, 1, ST[2]);                                              // marchepied
  // caisse : capot long, habitacle haut, coffre
  const caisse = [[-44, 12], [-44, 22], [-40, 26], [-34, 28], [-34, 41], [-30, 43], [12, 43], [16, 40], [16, 27], [54, 27], [54, 14], [52, 12]];
  ho_poly(caisse.map(p => [X_(p[0]), Y_(p[1])]), ho_K);
  const c2 = [[-43, 13], [-43, 21], [-39, 25], [-33, 27], [-33, 40], [-29, 42], [11, 42], [15, 39], [15, 26], [53, 26], [53, 15], [51, 13]];
  ho_poly(c2.map(p => [X_(p[0]), Y_(p[1])]), NI[1]);
  ho_poly([[-43, 13], [-43, 21], [-39, 25], [15, 25], [53, 25], [53, 15], [51, 13]].map(p => [X_(p[0]), Y_(p[1])]), NI[2]);   // flanc éclairé
  Rr(-43, 24, 96, 1, ST[4]); Rr(16, 26, 37, 1, ST[5]); Rr(-33, 41, 62, 1, ST[4]);
  // vitres : deux glaces latérales
  for (const [a, w] of [[-30, 20], [-8, 20]]) { Rr(a, 29, w, 12, ho_K); Rr(a + 1, 30, w - 2, 10, ho_mode0(o) ? CY[2] : NI[3]); Rr(a + 1, 30, w - 2, 3, ho_mode0(o) ? CY[3] : NI[4]); Rr(a + 1, 30, 3, 10, ho_mode0(o) ? CY[4] : BL[1]); }
  Rr(-10, 29, 2, 12, NI[0]);
  // chauffeur : silhouette dans la glace avant
  ho_ell(X_(-14), Y_(36), 3 * s, 3 * s, ST[1]); Rr(-17, 28, 6, 6, ST[1]); Rr(-18, 38, 8, 2, ST[3]);
  // calandre, radiateur, phares de laiton, pare-chocs
  Rr(52, 14, 4, 12, ho_K); Rr(52, 15, 3, 10, ST[4]); Rr(52, 15, 1, 10, ST[7]);
  ho_ell(X_(55), Y_(24), 4 * s, 4 * s, ho_K); ho_ell(X_(55), Y_(24), 3 * s, 3 * s, YE[1]); ho_ell(X_(55), Y_(24), 2 * s, 2 * s, lt > 0.3 ? WH[3] : YE[3]); ho_P(X_(54), Y_(25), WH[3]);
  Rr(54, 9, 5, 2, ST[6]); Rr(54, 9, 5, 1, WH[3]); Rr(-47, 9, 4, 2, ST[6]);
  Rr(2, 42, 8, 3, YE[1]); Rr(2, 44, 8, 1, YE[3]);                                                                              // lampe de toit
  // roues à rayons : deux grandes, jantes crème
  for (const wx of [-26, 38]) {
    const cx = X_(wx), cy = Y_(0) - 9 * s, r = Math.round(9 * s); ho_disc(cx, cy, r + 1, ho_K); ho_disc(cx, cy, r, NI[0]); ho_disc(cx, cy, r - 2, SK[4]); ho_disc(cx, cy, r - 3, ho_K);
    const rot = o.engine === 0 ? 0 : (o.spin ?? 0) + t * 0; for (let k = 0; k < 6; k++) { const a = k / 6 * TAU + rot; ho_line(cx, cy, cx + Math.cos(a) * (r - 3), cy + Math.sin(a) * (r - 3), SK[4], 1); }
    ho_disc(cx, cy, 2, ST[5]); ho_P(cx - 1, cy - 1, WH[3]); ho_P(cx - r + 1, cy - 1, ST[3]);
  }
  // fumée d'échappement
  if ((o.engine ?? 1) > 0) for (let i = 0; i < 7; i++) { const f = ((t * 0.7 + i / 7) % 1), px_ = X_(-48) - fl * f * 26 * s, py_ = Y_(5) - f * 8 * s - Math.sin(f * 6 + i) * 1.5; ho_ellDith(px_, py_, (1.5 + f * 4) * s, (1.2 + f * 3) * s, f < 0.4 ? WH[1] : NE[3], (1 - f) * 0.7 * (o.engine ?? 1)); }
}
const ho_mode0 = o => (o.mode ?? 0) === 0;
// ── drapeau tricolore qui flotte : (x, y) = point d'attache en haut de la hampe, vers la droite ; w × h ; dir 1 (flotte vers la droite) | −1 ; t ; o.amp 1 (vent)
function ho_drapeau(x, y, w, h, t, o = {}) {
  o = o || {}; const dir = o.dir ?? 1, amp = (o.amp ?? 1) * (0.7 + 0.3 * k_wind(t, x, 1)), cols = [BL[3], WH[3], RD[3]], shade = [BL[2], WH[1], RD[2]];
  for (let i = 0; i < w; i++) {
    const f = i / (w - 1), dy = Math.sin(i * 0.55 - t * 6.5 + x * 0.1) * 2.2 * amp * f + (f * f) * 1.5, k = Math.floor(f * 3), X_ = x + dir * i, ph = Math.sin(i * 0.55 - t * 6.5 + x * 0.1);
    const c = ph > 0.35 ? cols[k] : shade[k]; ho_R(X_, y + dy, 1, h, c); ho_P(X_, y + dy - 1, ho_K); ho_P(X_, y + dy + h, ho_K);
  }
  ho_R(x - 1, y - 1, 1, h + 2, ho_K);
}
// ── ho_lampadaire(x, y, s, t, o) : réverbère de fonte à lanterne de verre : (x, y) = pied ; hauteur 118 s ; o.on 0..1 (allumé : lueur, halo au sol)
function ho_lampadaire(x, y, s, t, o = {}) {
  o = o || {}; s = ho_fin(s, 1); const on = clamp(o.on ?? 0), H = 118 * s, ty = y - H;
  ho_ell(x + 2, y + 1, 7 * s, 2 * s, 'rgba(5,4,15,0.5)');
  ho_R(x - 4 * s, y - 8 * s, 8 * s, 8 * s, ho_K); ho_R(x - 3 * s, y - 8 * s, 6 * s, 7 * s, NI[2]); ho_R(x - 3 * s, y - 8 * s, 1, 7 * s, ST[3]); ho_R(x - 5 * s, y - 2 * s, 10 * s, 2 * s, NI[1]);
  ho_R(x - 2 * s, ty + 16 * s, 4 * s, H - 24 * s, ho_K); ho_R(x - s, ty + 16 * s, 2 * s, H - 24 * s, NI[2]); ho_R(x - s, ty + 16 * s, 1, H - 24 * s, ST[3]);
  for (const f of [0.25, 0.55]) ho_R(x - 3 * s, y - H * f, 6 * s, 2, NI[1]);
  ho_line(x, ty + 16 * s, x + 4 * s, ty + 12 * s, NI[0], 2);
  const lx = x, ly = ty + 4 * s; ho_poly([[lx - 7 * s, ly - 8 * s], [lx + 7 * s, ly - 8 * s], [lx + 4 * s, ly - 12 * s], [lx - 4 * s, ly - 12 * s]], ho_K); ho_R(lx - 1, ly - 15 * s, 2, 3 * s, ho_K);
  ho_poly([[lx - 6 * s, ly + 10 * s], [lx + 6 * s, ly + 10 * s], [lx + 7 * s, ly - 8 * s], [lx - 7 * s, ly - 8 * s]], ho_K);
  const gl = on > 0.05 ? [AM[6], AM[8], YE[3], WH[3]] : [CY[1], CY[2], CY[3], CY[4]];
  ho_poly([[lx - 5 * s, ly + 9 * s], [lx + 5 * s, ly + 9 * s], [lx + 6 * s, ly - 7 * s], [lx - 6 * s, ly - 7 * s]], gl[1]); ho_R(lx - 3 * s, ly - 5 * s, 6 * s, 12 * s, gl[2]); ho_R(lx - 1, ly - 2 * s, 2, 6 * s, gl[3]); ho_R(lx - 5 * s, ly - 7 * s, 1, 16 * s, gl[0]);
  ho_R(lx - 4 * s, ly + 9 * s, 8 * s, 2, NI[1]);
  if (on > 0) { const fk = 1 + 0.05 * Math.sin(t * 13); ho_glow(lx, ly + 2, 52 * s * fk, '255,170,60', 0.55 * on); ho_glow(lx, ly + 2, 20 * s, '255,224,150', 0.5 * on); ho_glow(x, y - 2, 40 * s, '255,150,50', 0.2 * on); }
}
// ── portier de palace minuscule (≈ 15 px) : redingote bleu nuit, galons d'or, casquette ; (x, y) = pieds ; il respire, et salue d'un doigt à la casquette toutes les 4 s (o.salute 0..1 pour forcer)
function ho_portier(x, y, s, t, o = {}) {
  o = o || {}; s = ho_fin(s, 1); const br = Math.round(Math.sin(t * 2.1) * 0.5 + 0.5), sal = o.salute ?? (((t % 4.2) > 3.5) ? Math.sin(((t % 4.2) - 3.5) / 0.7 * Math.PI) : 0), S = v => Math.round(v * s);
  ho_ell(x + 1, y + 1, S(6), S(1.5), 'rgba(5,4,15,0.55)');
  ho_R(x - S(3), y - S(5), S(2), S(5), ho_K); ho_R(x + S(1), y - S(5), S(2), S(5), ho_K); ho_R(x - S(3), y - S(1), S(3), 1, NI[0]); ho_R(x + S(1), y - S(1), S(3), 1, NI[0]);
  ho_R(x - S(4), y - S(13) - br * 0, S(8), S(9), NI[3]); ho_R(x - S(4), y - S(13), S(8), 1, NI[5]); ho_R(x - S(4), y - S(13), 1, S(9), NI[4]); ho_R(x + S(3), y - S(13), 1, S(9), NI[1]);
  ho_R(x - S(1), y - S(13), 1, S(9), YE[2]); ho_P(x, y - S(10), YE[3]); ho_P(x, y - S(8), YE[3]); ho_P(x - S(2), y - S(12), YE[2]); ho_P(x + S(2), y - S(12), YE[2]);
  ho_R(x - S(4), y - S(5), S(8), 1, YE[1]);
  ho_R(x - S(1.5), y - S(17), S(3), S(4), SK[3]); ho_P(x - 1, y - S(15), ho_K); ho_P(x + 1, y - S(15), ho_K);
  ho_R(x - S(3), y - S(19), S(6), S(2.4), NI[2]); ho_R(x - S(3), y - S(18), S(6), 1, YE[2]); ho_R(x - S(3.5), y - S(17), S(7), 1, ho_K);
  ho_R(x - S(5.6), y - S(12), S(1.5), S(6), NI[3]);                                                                      // bras gauche
  if (sal > 0.1) { ho_R(x + S(3), y - S(15) - Math.round(sal * 2), S(1.6), S(5), NI[3]); ho_P(x + S(3), y - S(19) - Math.round(sal * 2), WH[3]); } else { ho_R(x + S(4), y - S(12), S(1.5), S(6), NI[3]); ho_P(x + S(4), y - S(6), WH[3]); }
}
// ── ho_facade(t, o) : façade d'un palace parisien vue de la rue (≈ 1920) : toit mansardé de zinc à lucarnes et cheminées qui fument, cinq travées de fenêtres à balcons de fer forgé, frontons, grande verrière d'entrée à tapis rouge,
//    trois drapeaux tricolores qui flottent, portier minuscule, berline d'époque, deux lampadaires, passants, pigeons ; la rue (trottoir, pavés) occupe y 346 → 480 (le sujet reste au-dessus de y 355).
//    o.light 0..1 : 0 plein jour (ciel bleu, pierre claire, vitres miroirs) → 1 crépuscule (ciel rose-or, pierre dorée à ombres violettes, fenêtres allumées, lampadaires et phares allumés) ; les valeurs intermédiaires mélangent par tramage
//    o.cam (px : ciel 0,05 · bâtiment 1 · rue, voiture, lampadaires 1,15) · o.layer 'all' | 'back' (ciel, bâtiment, rue) | 'front' (voiture, lampadaires, passants, lueurs : après les personnages)
//    o.car { x (écran, 205), flip, lights } · o.doorman false (sans portier) · o.walkers 2 · o.flags true · o.birds 1
//    renvoie { door: [x, y] (seuil de l'entrée), doorman: [x, y], car: [x, y], ground: 346, curb: 362, flags: [[x, y], …] }
function ho_facade(t, o = {}) {
  o = o || {}; const cam = o.cam || 0, L_ = clamp(o.light ?? 0), layer = o.layer ?? 'all', fx = Math.round(-30 - cam), sx = Math.round(-30 - cam * 1.15), skx = Math.round(-cam * 0.05);
  const res = { door: [135 - cam, 346], doorman: [118 - cam, 349], car: [(o.car?.x ?? 205) - cam * 1.15, 358], ground: 346, curb: 362, flags: [] };
  const mode = L_ >= 0.5 ? 1 : 0;
  if (layer !== 'front') {
    // ciel : dégradé selon la lumière, nuages qui dérivent
    const sky = ho_cache('facsky:' + mode, 270, 120, () => { const g = ho_ctx(), E = HO_FAC[mode], gr = g.createLinearGradient(0, 0, 0, 120); E.sky.forEach(([a, c]) => gr.addColorStop(a, c)); g.fillStyle = gr; g.fillRect(0, 0, 270, 120); });
    if (L_ > 0.04 && L_ < 0.96) { const other = ho_cache('facsky:' + (1 - mode), 270, 120, () => { const g = ho_ctx(), E = HO_FAC[1 - mode], gr = g.createLinearGradient(0, 0, 0, 120); E.sky.forEach(([a, c]) => gr.addColorStop(a, c)); g.fillStyle = gr; g.fillRect(0, 0, 270, 120); }); ho_mix2(HO_FAC && (mode ? other : sky), mode ? sky : other, L_, 0, 0); }
    else ho_ctx().drawImage(sky, 0, 0);
    ho_ctx().drawImage(sky, 0, 0, 270, 120, 0, 0, 270, 120);
    if (L_ > 0.04 && L_ < 0.96) { /* (le mélange est fait ci-dessus) */ }
    for (let i = 0; i < 5; i++) { const cxp = ((ho_h(i, 3) * 380 + t * (2 + i * 0.7) - skx) % 380 + 380) % 380 - 55, cyp = 6 + ho_h(i, 4) * 40, r = 14 + ho_h(i, 5) * 14; ho_ellDith(cxp, cyp, r * 1.6, r * 0.38, L_ > 0.5 ? DU[7] : WH[3], 0.55); ho_ellDith(cxp + 4, cyp - 3, r, r * 0.3, L_ > 0.5 ? AM[9] : WH[3], 0.6); }
    // bâtiment : deux caches mélangés selon la lumière
    const b0 = ho_facadeBuild(0), b1 = ho_facadeBuild(1);
    if (L_ <= 0.04) ho_ctx().drawImage(b0, fx, 0); else if (L_ >= 0.96) ho_ctx().drawImage(b1, fx, 0); else ho_mix2(b0, b1, L_, fx, 0);
    // vitres : fenêtres allumées selon l'heure et la lumière
    const drawWins = (y0, w, h, skip) => { for (const cx of HO_FC) { if (skip && skip.includes(cx)) continue; const id = cx + y0 * 7, lit = L_ > 0.5 && ho_h(id, 11) < 0.62 + (ho_h(id, 12) < 0.1 ? Math.sin(t * 0.3 + id) * 0.3 : 0), st = !lit ? 0 : (ho_h(id, 13) < 0.3 ? 2 : 1); ho_ctx().drawImage(ho_winGlass(w, h, st, mode), fx + cx - w / 2, y0); } };
    drawWins(92, 18, 36, [100, 165, 230]); drawWins(144, 18, 36); drawWins(196, 20, 40); drawWins(250, 24, 48);
    for (const cx of [100, 165, 230]) { const id = cx * 3, lit = L_ > 0.5 && ho_h(id, 11) < 0.7; ho_ctx().drawImage(ho_winGlass(18, 26, lit ? 1 : 0, mode), fx + cx - 9, 42); }
    // rez-de-chaussée : baies et portes vitrées de l'entrée
    for (const cx of [100, 230]) { const lit = L_ > 0.4; ho_ctx().drawImage(ho_winGlass(22, 28, lit ? 1 : 0, mode), fx + cx - 11, 318); ho_ell(fx + cx, 318, 11, 8, lit ? AM[8] : CY[2]); ho_ctx().drawImage(ho_winGlass(22, 22, lit ? 1 : 0, mode), fx + cx - 11, 324); }
    ho_ctx().drawImage(ho_winGlass(64, 22, L_ > 0.3 ? 1 : 0, mode), fx + 133, 324);
    ho_R(fx + 133, 346 - 24, 1, 22, YE[1]); ho_R(fx + 165, 346 - 24, 2, 22, YE[1]); ho_R(fx + 197, 346 - 24, 1, 22, YE[1]);
    // cheminées qui fument
    for (const cxp of [62, 262]) for (let i = 0; i < 8; i++) { const f = ((t * 0.18 + i / 8 + ho_h(cxp, 2)) % 1), px_ = fx + cxp + Math.sin(f * 6 + i) * 3 + f * 14 * (mode ? 1 : 0.6), py_ = -3 - f * 32, r = 2 + f * 6; if (py_ > -34) ho_ellDith(px_, Math.max(py_, -2 + py_ * 0.6), r, r * 0.7, mode ? AM[10] : WH[3], (1 - f) * 0.6); }
    // drapeaux aux hampes inclinées (travées 1, 2, 3 au niveau du 3e étage)
    if (o.flags !== false) for (const cx of [100, 165, 230]) { const hx = fx + cx + 12, hy = 160; ho_line(hx - 6, hy + 12, hx + 10, hy - 22, ho_K, 3); ho_line(hx - 6, hy + 12, hx + 10, hy - 22, YE[1], 1); ho_P(hx + 10, hy - 24, YE[3]); ho_R(hx - 8, hy + 10, 6, 3, ho_E(mode).stone[2]); ho_drapeau(hx + 8, hy - 22, 23, 15, t, { amp: 1, dir: 1 }); res.flags.push([hx + 8, hy - 22]); }
    // rue
    ho_ctx().drawImage(mode ? ho_facadeStreet(1) : ho_facadeStreet(0), sx, 346);
    if (L_ > 0.04 && L_ < 0.96) ho_mix2(ho_facadeStreet(0), ho_facadeStreet(1), L_, sx, 346);
    if (L_ > 0.3) { const a = clamp((L_ - 0.3) * 1.4); for (const [rx_, rw] of [[22, 6], [135, 40], [252, 6]]) { ho_ellDith(rx_ - cam * 1.15, 395, rw, 34, AM[8], 0.2 * a); ho_ellDith(rx_ - cam * 1.15, 380, rw * 0.5, 16, YE[3], 0.2 * a); } for (let k = 0; k < 9; k++) { const yy = 372 + k * 11, ww = 14 + ((k * 7) % 5) * 5 + Math.sin(t * 2 + k) * 3; ho_R(135 - cam * 1.15 - ww / 2, yy, ww, 1, AM[7]); } }
  }
  if (layer !== 'back') {
    const Eh = ho_E(mode);
    // lueurs des fenêtres et de l'entrée au crépuscule
    if (L_ > 0.3) { ho_glow(fx + 165, 330, 70, '255,170,60', 0.5 * L_); for (const cx of HO_FC) ho_glow(fx + cx, 218, 32, '255,170,60', 0.14 * L_); }
    // lampadaires
    for (const lx of [22, 252]) ho_lampadaire(lx - cam * 1.15, 354, 0.95, t, { on: L_ > 0.35 ? clamp((L_ - 0.3) * 2) : 0 });
    // portier et passants (sur le trottoir)
    if (o.doorman !== false) ho_portier(res.doorman[0], 349, 1, t);
    for (let k = 0; k < (o.walkers ?? 2); k++) { const dir = k % 2 ? -1 : 1, sp = 11 + k * 3, xx = ((ho_h(k, 9) * 330 + dir * t * sp) % 330 + 330) % 330 - 30 - cam * 1.15 + 0, bob = Math.abs(Math.sin(t * 6 + k)) * 1; ho_passant(xx, 354 - bob + 4 + k * 1, 1, t, { dir, kind: k }); }
    // voiture
    const car = o.car ?? {}; ho_voiture(res.car[0], 358, 0.95, t, { flip: car.flip, lights: car.lights ?? (L_ > 0.5 ? 1 : 0), engine: 1, mode });
    // pigeons sur la corniche
    if ((o.birds ?? 1) > 0) for (let i = 0; i < 3; i++) { const bx = fx + 40 + i * 83 + 6 * Math.sin(i), by = 75, pk = Math.floor(t * 0.6 + i * 1.7) % 4 === 0 ? Math.round(Math.sin(t * 7 + i) * 0.5 + 0.5) : 0; ho_ell(bx, by - 2, 3, 2, ST[3]); ho_P(bx - 3, by - 3 - pk, ST[5]); ho_P(bx - 4, by - 3 - pk, SK[3]); ho_R(bx + 2, by - 1, 2, 1, ST[2]); ho_P(bx - 1, by - 3, ST[6]); }
    if (L_ > 0.2) vignette(0.35 * L_, 100, 300, 135, 220, '40,10,40');
  }
  return res;
}
const ho_E = mode => HO_FAC[mode];
// ── passant (≈ 17 px) en silhouette : o.kind 0 chapeau melon + manteau, 1 canotier + journal sous le bras ; dir ±1
function ho_passant(x, y, s, t, o = {}) {
  const dir = o.dir ?? 1, k = o.kind ?? 0, st = Math.sin(t * 6 + k * 2), S = v => Math.round(v * s), col = k ? ST[2] : NI[2], hat = k ? SK[4] : NI[0];
  ho_ell(x, y + 1, S(5), 1, 'rgba(5,4,15,0.5)');
  ho_R(x - S(2) + Math.round(st), y - S(5), S(2), S(5), ho_K); ho_R(x + S(0) - Math.round(st), y - S(5), S(2), S(5), ho_K);
  ho_R(x - S(3), y - S(13), S(6), S(9), col); ho_R(x - S(3), y - S(13), 1, S(9), ST[3]); ho_R(x + S(2), y - S(13), 1, S(9), NI[0]);
  ho_R(x - S(1.5), y - S(17), S(3), S(4), SK[3]); ho_R(x - S(3), y - S(18), S(6), S(2), hat); ho_R(x - S(4), y - S(16.5), S(8), 1, hat);
  if (k) { ho_R(x + dir * S(3), y - S(11), S(3), S(5), WH[2]); ho_P(x + dir * S(3), y - S(10), NI[2]); }
}

// ════════════════════════════════════════════════════════════════════════════════════════
// 15. ICÔNES DU DOSSIER (17 × 17, couleurs exactes, contour sombre calculé)
// ════════════════════════════════════════════════════════════════════════════════════════
function ho_iconDraw(cx, cy, grid) {
  const N = 17, x0 = Math.round(cx) - 8, y0 = Math.round(cy) - 8;
  for (let y = -1; y <= N; y++) for (let x = -1; x <= N; x++) { const f = (a, b) => a >= 0 && b >= 0 && a < N && b < N && grid[b][a]; if (!f(x, y) && (f(x - 1, y) || f(x + 1, y) || f(x, y - 1) || f(x, y + 1))) R(x0 + x, y0 + y, 1, 1, '#05040f'); }
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (grid[y][x]) R(x0 + x, y0 + y, 1, 1, grid[y][x]);
}
function ho_iconGrid(fn) { const g = Array.from({ length: 17 }, () => Array(17).fill(null)); const set = (x, y, c) => { if (x >= 0 && y >= 0 && x < 17 && y < 17) g[y][x] = c; }; const rect = (x, y, w, h, c) => { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) set(x + i, y + j, c); }; const dsc = (cx_, cy_, r, c) => { for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) if (i * i + j * j <= r * r + 1) set(cx_ + i, cy_ + j, c); }; fn(set, rect, dsc); return g; }
// 1 : un document officiel à en-tête bleu et sceau de cire rouge à ruban
const HO_ICON1 = ho_iconGrid((set, rect, dsc) => {
  rect(2, 1, 10, 13, WH[2]); rect(2, 1, 1, 13, WH[3]); rect(11, 1, 1, 13, WH[0]); rect(2, 13, 10, 1, WH[0]);
  rect(3, 2, 8, 3, NI[3]); rect(3, 2, 8, 1, NI[5]); rect(3, 5, 8, 1, YE[2]);
  rect(3, 7, 6, 1, ST[3]); rect(3, 9, 7, 1, ST[3]); rect(3, 11, 4, 1, ST[3]);
  rect(9, 14, 2, 2, BL[3]); rect(12, 14, 2, 2, RD[4]);
  dsc(11, 11, 3, RD[2]); dsc(11, 11, 2, RD[3]); set(10, 10, RD[5]); set(11, 10, RD[4]); set(10, 11, RD[4]); set(11, 11, RD[2]); set(12, 12, RD[1]);
});
ICONES[1] = function (cx, cy) { ho_iconDraw(cx, cy, HO_ICON1); };
// 2 : la mallette de cuir brun, coins et serrure de laiton, une liasse de billets qui dépasse
const HO_ICON2 = ho_iconGrid((set, rect, dsc) => {
  rect(6, 2, 5, 1, WO[1]); rect(5, 3, 1, 3, WO[1]); rect(11, 3, 1, 3, WO[1]); rect(6, 3, 5, 1, WO[4]); rect(6, 3, 1, 1, WO[5]);     // poignée
  rect(1, 5, 15, 4, WO[3]); rect(1, 5, 15, 1, WO[5]); rect(1, 6, 1, 3, WO[4]);
  rect(2, 9, 13, 1, GR[5]); rect(3, 9, 5, 1, GR[6]); rect(11, 9, 3, 1, GR[4]);
  rect(1, 10, 15, 5, WO[3]); rect(1, 10, 15, 1, WO[4]); rect(1, 14, 15, 1, WO[1]); rect(15, 10, 1, 5, WO[2]);
  for (const [x, y] of [[1, 5], [15, 5], [1, 14], [15, 14]]) set(x, y, YE[2]);
  set(2, 14, YE[1]); set(14, 14, YE[1]); set(1, 13, YE[1]); set(15, 13, YE[1]);
  rect(7, 7, 3, 5, YE[2]); rect(7, 7, 3, 1, YE[3]); set(8, 10, NI[0]); set(9, 12, YE[1]);
});
ICONES[2] = function (cx, cy) { ho_iconDraw(cx, cy, HO_ICON2); };

// préchauffage : les décors lourds se construisent avant le premier plan (aucun pixel ne change, mais le premier plan ne paie rien)
INITS.push(() => {
  try {
    ho_salonFar(); ho_salonFloor(); ho_bureauWall(); ho_bureauDesk(); ho_chambreWall(); ho_chambreFloor(); ho_facadeBuild(0); ho_facadeBuild(1); ho_facadeStreet(0); ho_facadeStreet(1); ho_windowSprite(HO_SAL.ww, HO_SAL.wh);
    for (const [tx, sd] of [['VENDUE', 3], ['ARNAQUE', 3], ['OFFICIEL', 4], ['SECRET', 3], ['PAS DE PLAINTE', 3], ['JAMAIS A LUI', 3]]) ho_ink(tx, { seed: sd });
    ho_billSprite(false); ho_billSprite(true);
    // un passage à blanc de chaque grand décor : tous les petits caches (lueurs, rideaux, fenêtres, colonnes, nappe) sont construits ici et non pendant un plan
    ho_salon(0, {}); ho_salon(0, { view: 'close' }); ho_table(135, 322, 1, 0); ho_table(135, 330, 2, 0); ho_bureau(0, { machine: { rate: 9, t0: 0 } }); ho_chambre(0, {}); ho_facade(0, { light: 0 }); ho_facade(0, { light: 1 });
    ho_mallette(70, 200, 1, 0, { open: 1 }); ho_telephone(40, 200, 1, 0, { ring: 1 }); ho_document(10, 10, 80, 100, 0, { seal: 1, stamp: 1 }); ho_enveloppe(100, 100, 1, 0, {}); ho_tampon(135, 200, 1, 0, 0.1, {});
  } catch (e) { window.HO_INITERR = String(e && e.stack || e); }
  clearL();
});
