'use strict';
// ───────────────────────── les plans, dans l'ordre du film ─────────────────────────
// Le film est découpé en segments qui se suivent sans trou ; chaque segment est dessiné dans son propre fichier par sa propre fonction
// (buildIntro, buildGrenouille, buildLezard, buildLycaon, buildFin) et ne dessine que des plans dans [SEG.x.t0, SEG.x.t1[.
// Le premier plan d'un segment commence EXACTEMENT à SEG.x.t0 (l'image arrive 0,12 s avant la première parole) ; le dernier court jusqu'à SEG.x.t1
// (le début du segment suivant : la pause de la fin d'anecdote fait partie du dernier plan).
const LEAD = 0.12;
const SEG = {
  intro: { t0: 0, t1: P.b1.t0 - LEAD, ids: ['i1'] },
  sca: { t0: P.b1.t0 - LEAD, t1: P.c1.t0 - LEAD, ids: ['b1', 'b2', 'b3', 'b4'] },
  bas: { t0: P.c1.t0 - LEAD, t1: P.e1.t0 - LEAD, ids: ['c1', 'c2', 'c3'] },
  ang: { t0: P.e1.t0 - LEAD, t1: P.fin.t0 - LEAD, ids: ['e1', 'e2', 'e3'] },
  fin: { t0: P.fin.t0 - LEAD, t1: VOICE_END + CARD_T, ids: ['fin'] },        // la question, puis le carton qui reste après la dernière parole
};
const BUILDERS = { intro: 'buildIntro', sca: 'buildScarabee', bas: 'buildBasilic', ang: 'buildAnguille', fin: 'buildFin' };
// pages de démonstration des bibliothèques (kit.js, flore.js) : jamais dans le film
const DEMOS = { kit: 'buildKitDemo', flore: 'buildFloreDemo' };
SEG.kit = SEG.flore = { t0: 0, t1: 14, ids: [] };

// solo_gre.html (window.SOLO = 'gre') : ne construit que ce segment (plus des plans vides avant et après) : chaque artiste dessine et contrôle son segment seul
function buildShots() {
  const only = window.SOLO || null;
  for (const [name, fn] of Object.entries(BUILDERS)) {
    if (only && only !== name) continue;
    if (typeof window[fn] === 'function') window[fn](SEG[name]);
  }
  if (only && DEMOS[only] && typeof window[DEMOS[only]] === 'function') window[DEMOS[only]](SEG[only]);
  if (only) {
    if (SEG[only].t0 > 0.25) shot('_avant', 0, { draw() { } });
    shot('_apres', SEG[only].t1, { draw() { } });
  } else if (typeof buildOutro === 'function') buildOutro();
}
