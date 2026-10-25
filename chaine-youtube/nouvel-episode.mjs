// node chaine-youtube/nouvel-episode.mjs <NN-nom-du-dossier> <script.md> [--depuis <dossier d'un épisode terminé>]
//
// Crée le squelette d'un nouvel épisode « 3 anecdotes folles » à partir du texte de l'auteur (format : _modele/script-exemple.md).
//   - copie le moteur, le scientifique, le kit de décors, la flore, les outils, la chaîne de voix et le script de rendu de l'épisode de référence
//     (par défaut le dernier : 04-anecdotes-animaux-2) ;
//   - écrit voix.py (SCRIPT, GROUPES, ASR_AMORCE), shots.js (segments), cadre.js (cases du carnet), solo.mjs, piece.html, package.json ;
//   - écrit un plan PROVISOIRE par segment (sc_intro.js, sc_<clé>.js, sc_fin.js) : le film se rend déjà de bout en bout (fonds unis + noms), les artistes
//     remplacent ces plans un par un ;
//   - écrit BRIEF.md (brief des artistes avec le texte exact) et PROCEDURE.md (les étapes, les commandes, les pièges) ;
//   - écrit build/timeline.* PROVISOIRES (temps estimés) pour que les plans puissent déjà se caler sur wt() ; la vraie voix les remplace.
// Aucune dépendance : Node ≥ 20 (et Python pour provisoire.py).
import fs from 'fs'; import path from 'path'; import { fileURLToPath } from 'url'; import { spawnSync } from 'child_process';

const ICI = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const iDep = args.indexOf('--depuis');
let depuis = iDep >= 0 ? args.splice(iDep, 2)[1] : '04-anecdotes-animaux-2';
const [nomDossier, scriptFile] = args;
if (!nomDossier || !scriptFile) { console.error('usage : node chaine-youtube/nouvel-episode.mjs <NN-nom-du-dossier> <script.md> [--depuis <épisode de référence>]'); process.exit(1); }
if (!/^\d\d-[a-z0-9-]+$/.test(nomDossier)) { console.error('nom de dossier attendu : NN-mots-sans-accent (ex. 05-anecdotes-animaux-3)'); process.exit(1); }
const SRC = path.resolve(ICI, depuis), DST = path.join(ICI, nomDossier);
if (!fs.existsSync(path.join(SRC, 'engine.js'))) { console.error('épisode de référence introuvable ou incomplet : ' + SRC); process.exit(1); }
if (fs.existsSync(DST)) { console.error('le dossier existe déjà : ' + DST + ' (rien n\'est écrasé)'); process.exit(1); }

// ───────────────────────── 1. lecture du script ─────────────────────────
const brut = fs.readFileSync(scriptFile, 'utf8').replace(/<!--[\s\S]*?-->/g, '');
const lignes = brut.split('\n');
let titre = '';
const blocs = [];                                                      // { type: 'intro' | 'item' | 'fin', cle, nom, lieu, texte }
for (const l of lignes) {
  let m;
  if ((m = l.match(/^#\s+(.+)$/)) && !titre) titre = m[1].trim();
  else if ((m = l.match(/^##\s+(.+)$/))) {
    const p = m[1].split('|').map(s => s.trim());
    const k = p[0].toLowerCase();
    if (k === 'intro') blocs.push({ type: 'intro', texte: '' });
    else if (k === 'fin') blocs.push({ type: 'fin', texte: '' });
    else {
      if (p.length < 3) { console.error('en-tête d\'animal attendu : « ## clé | NOM | LIEU » (reçu : ' + m[1] + ')'); process.exit(1); }
      if (!/^[a-z][a-z0-9]*$/.test(k)) { console.error('clé d\'animal : lettres minuscules et chiffres seulement, sans accent (reçu : ' + p[0] + ')'); process.exit(1); }
      blocs.push({ type: 'item', cle: k, nom: p[1].toUpperCase(), lieu: p[2].toUpperCase(), texte: '' });
    }
  } else if (blocs.length && l.trim()) blocs[blocs.length - 1].texte += (blocs[blocs.length - 1].texte ? ' ' : '') + l.trim();
}
const intro = blocs.find(b => b.type === 'intro'), fin = blocs.find(b => b.type === 'fin'), items = blocs.filter(b => b.type === 'item');
if (!intro || !fin || items.length < 1) { console.error('le script doit contenir « ## intro », au moins un animal et « ## fin »'); process.exit(1); }
if (new Set(items.map(i => i.cle)).size !== items.length) { console.error('deux animaux ont la même clé'); process.exit(1); }
if (!titre) titre = 'Épisode';

const phrases = t => t.replace(/\s+([!?:;»])/g, '$1').replace(/«\s+/g, '«').split(/(?<=[.!?])\s+|(?<=…)\s+(?=[A-ZÀ-ÝÉ])/).map(s => s.trim()).filter(Boolean);
const PREF = 'abcdefghjklmnop';                                         // préfixes des phrases d'un animal (i = accroche, fin = question)
const SCRIPT = [], GROUPES = [], seg = [];
const ajoute = (id, pause, txt) => SCRIPT.push({ id, pause, txt });
const attention = [];
function groupe(ids, textes, rate, pitch) {                           // regroupe les phrases courtes d'un même segment : un paragraphe lu d'un souffle
  let g = null;
  ids.forEach((id, i) => {
    if (g && g.ids.length < 2 && g.len + textes[i].length <= 165) { g.ids.push(id); g.len += textes[i].length; }
    else { g = { ids: [id], len: textes[i].length }; GROUPES.push(g); }
  });
}
const sIntro = phrases(intro.texte), ids = sIntro.map((_, i) => 'i' + (i + 1));
sIntro.forEach((t, i) => ajoute(ids[i], i === sIntro.length - 1 ? 0.55 : 0.33, t));
groupe(ids, sIntro); seg.push({ cle: 'intro', ids });
items.forEach((it, k) => {
  const ph = phrases(it.texte), id = ph.map((_, i) => PREF[k] + (i + 1));
  ph.forEach((t, i) => ajoute(id[i], i === ph.length - 1 ? 0.78 : 0.33, t));
  groupe(id, ph); seg.push({ cle: it.cle, ids: id, nom: it.nom, lieu: it.lieu });
});
const sFin = phrases(fin.texte), idF = sFin.map((_, i) => i ? 'fin' + (i + 1) : 'fin');
sFin.forEach((t, i) => ajoute(idF[i], i === sFin.length - 1 ? 0 : 0.3, t));
groupe(idF, sFin); seg.push({ cle: 'fin', ids: idF });
for (const s of SCRIPT) if (/\d/.test(s.txt.replace(/\[[^\]]*\]/g, ''))) attention.push(`${s.id} : un nombre écrit en chiffres sera lu tel quel par la voix ; écrire [860|huit cent soixante] pour imposer la lecture`);
for (const s of SCRIPT) if (/[«»]/.test(s.txt)) attention.push(`${s.id} : guillemets français : à éviter dans le texte dit`);
const motsTot = SCRIPT.reduce((n, s) => n + s.txt.split(/\s+/).length, 0);
const dureeEstimee = motsTot / 3.3 + SCRIPT.reduce((n, s) => n + s.pause, 0) * 0.78;
if (dureeEstimee > 75) attention.push(`durée estimée de la voix ≈ ${dureeEstimee.toFixed(0)} s : au-delà de ≈ 75 s le film devient long pour un format court`);

// ───────────────────────── 2. copie des fichiers génériques ─────────────────────────
fs.mkdirSync(DST, { recursive: true });
const GENERIQUES = ['engine.js', 'scientist.js', 'outro.js', 'kit.js', 'flore.js', 'kit_demo.js', 'flore_demo.js', 'piece.js', 'render.mjs', 'check.mjs', 'bords.mjs', 'valide.mjs', 'sheet.mjs', 'strip.mjs', 'still.mjs', 'chrome.mjs',
  'rendu.sh', 'room.py', 'provisoire.py', 'score.mjs', 'GUIDE.md', 'STYLE.md', '.gitignore'];
for (const f of GENERIQUES) { const s = path.join(SRC, f); if (fs.existsSync(s)) fs.copyFileSync(s, path.join(DST, f)); else console.warn('absent chez la référence, ignoré : ' + f); }
fs.cpSync(path.join(SRC, 'voix-ia'), path.join(DST, 'voix-ia'), { recursive: true, filter: s => !s.includes('__pycache__') });
fs.mkdirSync(path.join(DST, 'production'), { recursive: true });
fs.copyFileSync(path.join(SRC, 'production', 'verif_final.py'), path.join(DST, 'production', 'verif_final.py'));
fs.chmodSync(path.join(DST, 'rendu.sh'), 0o755);
// la pièce de la voix prise en réserve : les prises retenues d'un épisode ne servent pas à un autre texte, mais la voix de référence reste la même (voir PROCEDURE.md §2)
fs.mkdirSync(path.join(DST, 'build'), { recursive: true });
if (fs.existsSync(path.join(SRC, 'node_modules')) && !fs.existsSync(path.join(DST, 'node_modules'))) fs.symlinkSync(path.relative(DST, path.join(SRC, 'node_modules')), path.join(DST, 'node_modules'), 'dir');

// ───────────────────────── 3. fichiers propres à l'épisode ─────────────────────────
const cap = s => s[0].toUpperCase() + s.slice(1);
const py = s => JSON.stringify(s);                                     // une chaîne JSON est une chaîne Python valide
const lire = f => fs.readFileSync(path.join(SRC, f), 'utf8');
const ecrire = (f, t) => fs.writeFileSync(path.join(DST, f), t);
const remplace = (txt, re, par, quoi) => { if (!re.test(txt)) { console.error('motif introuvable chez la référence (' + quoi + ') : le générateur doit être mis à jour'); process.exit(1); } return txt.replace(re, () => par); };

// voix.py
{
  let v = lire('voix.py');
  const sc = 'SCRIPT = [\n' + SCRIPT.map(s => `    (${py(s.id)}, ${s.pause.toFixed(2)}, ${py(s.txt)}),`).join('\n') + '\n]\n';
  const gr = 'GROUPES = [\n' + GROUPES.map((g, i) => `    {"ids": [${g.ids.map(py).join(', ')}], "rate": "${g.ids.includes('fin') ? '-2%' : '+0%'}", "pitch": "${g.ids.includes('fin') ? '+2Hz' : '+0Hz'}"},`).join('\n') + '\n]\n';
  v = remplace(v, /SCRIPT = \[[\s\S]*?\n\]\n/, sc, 'SCRIPT');
  v = remplace(v, /GROUPES = \[[\s\S]*?\n\]\n/, gr, 'GROUPES');
  v = remplace(v, /ASR_AMORCE = ".*"/, 'ASR_AMORCE = ' + py(`Vidéo de vulgarisation sur ${items.length === 3 ? 'trois' : items.length} animaux : ${items.map(i => i.nom.toLowerCase()).join(', ')}.`), 'ASR_AMORCE');
  ecrire('voix.py', v);
}
// shots.js : segments
{
  let s = lire('shots.js');
  const premier = k => seg[k].ids[0];
  const lignesSeg = seg.map((g, k) => {
    const t0 = k === 0 ? '0' : `P.${premier(k)}.t0 - LEAD`;
    const t1 = k === seg.length - 1 ? 'VOICE_END + CARD_T' : `P.${premier(k + 1)}.t0 - LEAD`;
    return `  ${g.cle}: { t0: ${t0}, t1: ${t1}, ids: [${g.ids.map(i => `'${i}'`).join(', ')}] },`;
  });
  const bu = seg.map(g => `${g.cle}: 'build${g.cle === 'intro' || g.cle === 'fin' ? cap(g.cle) : cap(g.cle)}'`).join(', ');
  s = remplace(s, /const SEG = \{[\s\S]*?\n\};\nconst BUILDERS = \{[^\n]*\};/, `const SEG = {\n${lignesSeg.join('\n')}\n};\nconst BUILDERS = { ${bu} };`, 'SEG/BUILDERS');
  ecrire('shots.js', s);
}
// cadre.js : cases du carnet
{
  let c = lire('cadre.js');
  const FONDS = [['#3a2a10', '#ffc84a'], ['#0e2a22', '#62ae72'], ['#124a66', '#70d0e4'], ['#3a1a2a', '#e47aa4'], ['#2a1a4a', '#a98aec'], ['#4a2a10', '#f0904a']];
  const be = 'const BETES = [\n' + items.map((it, k) => `  { id: '${it.cle}', nom: ${py(it.nom)}, lieu: ${py(it.lieu)}, fond: '${FONDS[k % FONDS.length][0]}', clair: '${FONDS[k % FONDS.length][1]}' },`).join('\n') + '\n];';
  c = remplace(c, /const BETES = \[[\s\S]*?\n\];/, be, 'BETES');
  c = remplace(c, /const ICONES = \[[^\n]*\];/, `const ICONES = [${items.map((_, k) => `iconeProvisoire(${k})`).join(', ')}];`, 'ICONES');
  c = c.replace('for (let i = 0; i < 3; i++) {\n    const bx', 'for (let i = 0; i < BETES.length; i++) {\n    const bx').replace('`${k + 1}/3 ${BETES[k].lieu}`', '`${k + 1}/${BETES.length} ${BETES[k].lieu}`').replace('x = 8 + 3 * 26 + 2', 'x = 8 + BETES.length * 26 + 2');
  ecrire('cadre.js', c);
}
// solo.mjs et piece.html
const clefs = seg.map(g => g.cle);
const fichier = g => `sc_${g === 'intro' ? 'intro' : g === 'fin' ? 'fin' : g}.js`;
const sprites = items.map(i => `sc_${i.cle}_sprites.js`);
{
  let s = lire('solo.mjs');
  s = remplace(s, /const FICHIER = \{[^\n]*\};/, `const FICHIER = { ${clefs.map(g => `${g}: '${fichier(g)}'`).join(', ')} };`, 'FICHIER');
  s = s.replace(/\(intro, sca, bas, ang, fin\)/, `(${clefs.join(', ')})`);
  s = remplace(s, /const SPR = \['intro', 'fin'\]\.includes\(seg\) \? \[[^\n]*?\]\.filter/, `const SPR = ['intro', 'fin'].includes(seg) ? [${sprites.map(f => `'${f}'`).join(', ')}].filter`, 'SPR');
  s = s.replace(/node solo\.mjs sca\|bas\|ang\|intro\|fin/, `node solo.mjs ${clefs.join('|')}`);
  ecrire('solo.mjs', s);
  let h = lire('piece.html');
  const tags = ['build/timeline.js', 'engine.js', 'scientist.js', 'cadre.js', 'kit.js', 'flore.js', ...sprites, 'sc_intro.js', ...items.map(i => `sc_${i.cle}.js`), 'sc_fin.js', 'shots.js', '../marque/logo.js', 'outro.js', 'piece.js'];
  h = remplace(h, /<script src[\s\S]*<\/body>/, tags.map(f => `<script src="${f}"></script>`).join('\n') + '\n</body>', 'scripts de piece.html');
  h = h.replace(/<title>[^<]*<\/title>/, `<title>${titre.replace(/[<>&]/g, '')}</title>`);
  ecrire('piece.html', h);
}
// package.json
{
  const p = JSON.parse(lire('package.json'));
  p.name = 'chaine-' + nomDossier; p.description = `${titre} (pixel art dessiné en code, voix de synthèse).`;
  ecrire('package.json', JSON.stringify(p, null, 2) + '\n');
}
// plans provisoires : le film se rend de bout en bout dès le départ
const stub = (cle, nom, ids) => `'use strict';
// ${fichier(cle)} : segment « ${cle} » (${ids.join(', ')}). PLAN PROVISOIRE : fond uni et nom, pour que le film se rende déjà de bout en bout.
// À REMPLACER par les vrais plans (voir BRIEF.md) : un plan = shot('id', S.t0, { draw, ui, ev }), calé sur wt() / P.<id>.
function build${cap(cle)}(S) {
  shot('${cle}_provisoire', S.t0, {
    draw(u, t) { vgrad(0, 0, LW, LH, [[0, NI[2]], [1, NI[0]]]); },
    ui(u, t) { ptextC(${py(nom)}, 135, 200, WH[3], 3, '#05040f'); },
    ev: [],
  });
}
`;
ecrire('sc_intro.js', stub('intro', 'ACCROCHE', seg[0].ids));
items.forEach((it, k) => ecrire(`sc_${it.cle}.js`, stub(it.cle, it.nom, seg[k + 1].ids)));
ecrire('sc_fin.js', stub('fin', 'QUESTION', seg[seg.length - 1].ids));
for (const it of items) ecrire(`sc_${it.cle}_sprites.js`, `'use strict';\n// sc_${it.cle}_sprites.js : sprites de « ${it.nom} » (préfixe ${it.cle.slice(0, 2)}_ à choisir sans collision, voir GUIDE.md §1). Définir aussi ICONES[${items.indexOf(it)}] (17 × 17 px, couleurs exactes).\n`);

// BRIEF.md et PROCEDURE.md
{
  const tpl = fs.readFileSync(path.join(ICI, '_modele', 'BRIEF.md.tpl'), 'utf8');
  const texteExact = SCRIPT.map(s => `- ${s.id} : « ${s.txt.replace(/\[([^|\]]*)\|[^\]]*\]/g, '$1')} »`).join('\n');
  const tableau = '| Segment | Fichier | Phrases | Préfixe de sprites |\n|---|---|---|---|\n' + seg.map((g, k) => `| \`${g.cle}\` | \`${fichier(g.cle)}\` | ${g.ids.join(', ')} | ${g.cle === 'intro' || g.cle === 'fin' ? '`in_` / `fn_`' : '`' + g.cle.slice(0, 2) + '_`'} |`).join('\n');
  const b = tpl.replace(/\{\{TITRE\}\}/g, titre).replace(/\{\{DOSSIER\}\}/g, nomDossier).replace(/\{\{REFERENCE\}\}/g, depuis).replace(/\{\{SEGMENTS\}\}/g, tableau).replace(/\{\{TEXTE\}\}/g, texteExact)
    .replace(/\{\{ANIMAUX\}\}/g, items.map((it, k) => `- **${it.nom}** (case ${k + 1}/${items.length}, « ${k + 1}/${items.length} ${it.lieu} ») : segment \`${it.cle}\`, fichiers \`sc_${it.cle}_sprites.js\`, \`sc_${it.cle}.js\`, \`son_${it.cle}.md\`.`).join('\n'));
  ecrire('BRIEF.md', b);
  let p = fs.readFileSync(path.join(ICI, '_modele', 'PROCEDURE.md'), 'utf8');
  p = p.replace(/\{\{DOSSIER\}\}/g, nomDossier).replace(/\{\{TITRE\}\}/g, titre).replace(/\{\{CLES\}\}/g, clefs.join('|')).replace(/\{\{REFERENCE\}\}/g, depuis);
  ecrire('PROCEDURE.md', p);
  ecrire('README.md', `# ${titre}\n\nÉpisode généré par \`chaine-youtube/nouvel-episode.mjs\` à partir de \`${depuis}\`. Voir \`PROCEDURE.md\` (les étapes), \`BRIEF.md\` (brief des artistes, texte exact), \`GUIDE.md\` (moteur et conventions).\n\nÉtat : squelette (plans provisoires, voix et timeline estimées). Compléter ce fichier à la livraison (modèle : \`../${depuis}/README.md\`).\n`);
}

// timeline provisoire (temps estimés) : les plans peuvent déjà se caler sur wt()
const r = spawnSync(process.env.PYTHON || 'python3', ['provisoire.py'], { cwd: DST, encoding: 'utf8' });
if (r.status !== 0) console.warn('timeline provisoire non écrite : lancer `python provisoire.py` dans le dossier avec un Python qui a numpy, soundfile et scipy (variable PYTHON=… pour ce script). Détail : ' + (r.stderr || r.stdout).split('\n').slice(-3).join(' '));

console.log(`\nÉpisode « ${titre} » créé dans chaine-youtube/${nomDossier}/ (référence : ${depuis})`);
console.log(`  segments : ${seg.map(g => `${g.cle} (${g.ids.length} ph.)`).join(', ')} ; ${SCRIPT.length} phrases, ${GROUPES.length} paragraphes, ≈ ${motsTot} mots, voix ≈ ${dureeEstimee.toFixed(0)} s`);
if (attention.length) { console.log('  À vérifier :'); attention.forEach(a => console.log('   - ' + a)); }
console.log(`\nSuite : cd chaine-youtube/${nomDossier} && cat PROCEDURE.md   (test du squelette : node valide.mjs && node check.mjs 8)`);
