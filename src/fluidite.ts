import { useSyncExternalStore } from 'react';

// Fluidité : sur un téléphone lent, le jeu passe en mode léger (classe « lite » sur <html>). Les animations
// décoratives qui tournent en boucle (lucioles, reflets, respirations, flottements) s'arrêtent, les ombres floues et
// les flous d'arrière-plan disparaissent, les effets de révélation ont moins de particules. Les animations qui
// racontent quelque chose (ouverture d'un booster, pioche, duel) restent.
//
// Réglage du joueur (Profil) : « auto » (par défaut), « leger » ou « complet ». En automatique, le jeu mesure la
// fluidité réelle quelques secondes après le chargement, puis pendant la première ouverture de booster (la scène la
// plus chargée) : si les images arrivent trop lentement, il passe en mode léger et s'en souvient une semaine (puis il
// remesure, en mode complet).

export type Fluidite = 'auto' | 'leger' | 'complet';

const CHOICE_KEY = 'animalcards:fluidite';
const DETECT_KEY = 'animalcards:fluidite-mesure';
const RECHECK = 7 * 24 * 3600_000;

/** Animations en boucle à garder même en mode léger (indicateurs de chargement). */
const KEEP = /spin|loading|loader/;

let lite = false;
let detected: boolean | null = null;
const listeners = new Set<() => void>();
let pruneTimer: number | undefined;

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // stockage indisponible : le réglage vaut pour cette visite
  }
}

export function fluiditeChoice(): Fluidite {
  const value = read(CHOICE_KEY);
  return value === 'leger' || value === 'complet' ? value : 'auto';
}

/** Le mode léger est-il actif ? */
export function isLite(): boolean {
  return lite;
}

/** En automatique : le téléphone a-t-il été jugé lent ? (null : pas encore mesuré) */
export function detectedSlow(): boolean | null {
  return detected;
}

function apply(next: boolean): void {
  if (next === lite && typeof document !== 'undefined' && document.documentElement.classList.contains('lite') === next) return;
  lite = next;
  document.documentElement.classList.toggle('lite', lite);
  window.clearInterval(pruneTimer);
  if (lite) {
    prune();
    pruneTimer = window.setInterval(prune, 2000);
  } else {
    // les animations arrêtées repartent : leur nom est retiré le temps d'un calcul de style, puis rendu
    const root = document.documentElement;
    root.classList.add('lite-off');
    void getComputedStyle(root).animationName;
    requestAnimationFrame(() => root.classList.remove('lite-off'));
  }
  listeners.forEach((listener) => listener());
}

/** Arrête les animations décoratives en boucle (elles reprennent leur apparence de repos). */
function prune(): void {
  if (document.hidden || typeof document.getAnimations !== 'function') return;
  for (const animation of document.getAnimations()) {
    if (!(typeof CSSAnimation !== 'undefined' && animation instanceof CSSAnimation)) continue;
    if (animation.effect?.getTiming().iterations !== Infinity || KEEP.test(animation.animationName)) continue;
    animation.cancel();
  }
}

export function setFluidite(choice: Fluidite): void {
  write(CHOICE_KEY, choice);
  if (choice === 'auto') apply(detected ?? false);
  else apply(choice === 'leger');
  listeners.forEach((listener) => listener());
}

/** Écarts entre images : le médian, et la part de ceux qui dépassent une durée. */
function gapsOf(frames: number[]): { median: number; over: (ms: number) => number } | null {
  const gaps = frames.slice(1).map((value, i) => value - frames[i]).sort((a, b) => a - b);
  if (gaps.length < 10) return null;
  return { median: gaps[Math.floor(gaps.length / 2)], over: (ms) => gaps.filter((gap) => gap > ms).length / gaps.length };
}

function remember(slow: boolean): void {
  detected = slow;
  write(DETECT_KEY, JSON.stringify({ slow, at: Date.now() }));
}

/** Mesure la fluidité de l'accueil pendant 3 secondes : lente si la moitié des images mettent plus de 25 ms (moins de
 *  40 images/s), ou si plus d'une sur quatre met plus de 40 ms. */
function measure(): void {
  if (document.hidden) {
    document.addEventListener('visibilitychange', () => window.setTimeout(measure, 1500), { once: true });
    return;
  }
  const frames: number[] = [];
  const start = performance.now();
  const step = (t: number) => {
    frames.push(t);
    if (document.hidden) return;
    if (t - start < 3000) {
      requestAnimationFrame(step);
      return;
    }
    const gaps = gapsOf(frames);
    if (!gaps) return;
    // l'ouverture d'un booster a déjà pu juger le téléphone lent : l'accueil ne le contredit pas
    if (detected) return;
    remember(gaps.median > 25 || gaps.over(40) > 0.25);
    if (fluiditeChoice() === 'auto') apply(!!detected);
    listeners.forEach((listener) => listener());
  };
  requestAnimationFrame(step);
}

let sceneChecked = false;

/** Pendant la première ouverture de booster : mesure 2,5 secondes (après le temps d'installer la scène). Saccadée
 *  (moins de 25 images/s, ou une image sur deux à plus de 34 ms), le mode léger s'applique quand l'ouverture se
 *  ferme, pas au milieu, pour ne rien faire sauter à l'écran. Renvoie la fonction à appeler à la fermeture. */
export function watchScene(): () => void {
  if (typeof window === 'undefined' || sceneChecked || lite || fluiditeChoice() !== 'auto' || document.hidden) return () => {};
  const frames: number[] = [];
  let raf = 0;
  let start = 0;
  const step = (t: number) => {
    if (document.hidden) return;
    frames.push(t);
    if (t - start < 2500) raf = requestAnimationFrame(step);
    else raf = 0;
  };
  const delay = window.setTimeout(() => {
    start = performance.now();
    raf = requestAnimationFrame(step);
  }, 400);
  return () => {
    window.clearTimeout(delay);
    cancelAnimationFrame(raf);
    const gaps = gapsOf(frames);
    // ouverture fermée trop vite pour juger : on mesurera la suivante
    if (!gaps) return;
    sceneChecked = true;
    if (gaps.median <= 40 && gaps.over(34) <= 0.5) return;
    remember(true);
    if (fluiditeChoice() === 'auto') apply(true);
    listeners.forEach((listener) => listener());
  };
}

/** Au démarrage du jeu : applique le réglage, et mesure la fluidité si besoin. */
export function startFluidite(): void {
  if (typeof window === 'undefined') return;
  const choice = fluiditeChoice();
  try {
    const saved = JSON.parse(read(DETECT_KEY) ?? 'null') as { slow: boolean; at: number } | null;
    if (saved && Date.now() - saved.at < RECHECK) detected = saved.slow;
  } catch {
    detected = null;
  }
  // l'appareil demande moins d'animations : mode léger d'office
  const reduced = !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  if (choice === 'auto') apply(reduced || (detected ?? false));
  else apply(choice === 'leger');
  // mesure quelques secondes après le chargement, quand l'accueil est affiché
  if (choice === 'auto' && detected === null && !reduced) window.setTimeout(measure, 2500);
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Pour l'interface : le mode léger, le réglage et le résultat de la mesure. */
export function useFluidite(): { lite: boolean; choice: Fluidite; detected: boolean | null } {
  const snapshot = useSyncExternalStore(subscribe, () => `${lite}|${fluiditeChoice()}|${detected}`);
  const [l, c, d] = snapshot.split('|');
  return { lite: l === 'true', choice: c as Fluidite, detected: d === 'null' ? null : d === 'true' };
}
