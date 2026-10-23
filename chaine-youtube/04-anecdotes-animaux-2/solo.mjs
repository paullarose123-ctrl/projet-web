// node solo.mjs sca|bas|ang|intro|fin  — écrit solo_<segment>.html : la page du film réduite au moteur, au kit commun et à CE segment
// (un fichier en cours d'écriture chez un autre artiste ne casse pas le rendu). Puis, par exemple :
//   PAGE=solo_gre.html OUT=build/gre node check.mjs 6      PAGE=solo_gre.html OUT=build/gre node sheet.mjs 0.5 build/gre/sheet
//   PAGE=solo_gre.html OUT=build/gre node strip.mjs g2_gel 8 0.25      PAGE=solo_gre.html OUT=build/gre node render.mjs solo_gre.html --stills 3 4.5
import fs from 'fs';
const FICHIER = { intro: 'sc_intro.js', sca: 'sc_scarabee.js', bas: 'sc_basilic.js', ang: 'sc_anguille.js', fin: 'sc_fin.js' };
const seg = process.argv[2];
if (!FICHIER[seg]) { console.error('segment inconnu : ' + seg + ' (intro, sca, bas, ang, fin)'); process.exit(1); }
const h = fs.readFileSync('piece.html', 'utf8');
const gardes = ['build/timeline.js', 'engine.js', 'scientist.js', 'cadre.js', 'kit.js', 'flore.js', FICHIER[seg], 'shots.js', 'piece.js'];
// (indices : 0 à 5 = timeline, moteur, scientifique, cadre, kit, flore ; 6 = fichier du segment ; 7 et 8 = shots.js, piece.js)
const extra = fs.readdirSync('.').filter(f => new RegExp('^' + FICHIER[seg].replace('.js', '') + '_.+\\.js$').test(f)).sort();   // sc_lezard_2.js…
// l'accroche et la finale utilisent les animaux des trois autres segments : leurs fichiers de sprites sont chargés aussi
const SPR = ['intro', 'fin'].includes(seg) ? ['sc_scarabee_sprites.js', 'sc_basilic_sprites.js', 'sc_anguille_sprites.js'].filter(f => fs.existsSync(f)) : [];
const tags = [...gardes.slice(0, 6), ...SPR, gardes[6], ...extra, ...gardes.slice(7)].map(f => `<script src="${f}"></script>`);
tags.splice(1, 0, `<script>window.SOLO='${seg}'</script>`);
const out = h.replace(/<script src[\s\S]*<\/body>/, tags.join('\n') + '\n</body>');
fs.writeFileSync(`solo_${seg}.html`, out);
console.log('solo_' + seg + '.html');
