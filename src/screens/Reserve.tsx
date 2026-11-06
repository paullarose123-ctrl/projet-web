import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useGame } from '../store/game';
import { ATHLETES_BY_ID } from '../data/athletes';
import {
  ENCLOS,
  ENCLOS_BY_ID,
  MAX_PLACES,
  BILLETTERIE_HOURS,
  billetterie,
  billetterieFull,
  canLiveIn,
  cardVisitors,
  enclosVisitors,
  levelOf,
  placePrice,
  reserveRate,
  reservedUids,
  type EnclosId,
} from '../engine/reserve';
import type { OwnedCard } from '../engine/types';
import { SCENE_H, SCENE_W, ZONE_BOX, drawScene, type SceneModel } from '../art/reserve-scene';
import { blit, spriteForAthlete, type Sprite } from '../art/reserve-sprites';
import { BallIcon } from '../components/Balles';
import { Card } from '../components/Card';
import { useNow } from '../hooks/useNow';
import { sfx } from '../audio/sfx';
import '../styles/reserve.css';

// Ma Réserve : le plan du parc en pixel art, la billetterie à récolter et, en touchant un enclos, la fenêtre pour y
// installer ses animaux, les retirer ou agrandir l'enclos. Les règles sont dans engine/reserve.ts.

const pct = (v: number, of: number) => `${(v / of) * 100}%`;

/** Écran d'ordinateur (ou de tablette à l'horizontale) ? */
function useWide(): boolean {
  const query = '(min-width: 900px)';
  const [wide, setWide] = useState(() => window.matchMedia?.(query).matches ?? false);
  useEffect(() => {
    const list = window.matchMedia?.(query);
    if (!list) return;
    const on = () => setWide(list.matches);
    list.addEventListener('change', on);
    return () => list.removeEventListener('change', on);
  }, []);
  return wide;
}

function Scene({ model, onOpen }: { model: SceneModel; onOpen: (id: EnclosId) => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const latest = useRef(model);
  latest.current = model;
  useEffect(() => {
    const c = ref.current!.getContext('2d')!;
    let frame = 0;
    const start = performance.now();
    const loop = (now: number) => {
      drawScene(c, (now - start) / 1000, latest.current);
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, []);
  return (
    <div className="rsv-scene" style={{ aspectRatio: `${SCENE_W} / ${SCENE_H}` }}>
      <canvas ref={ref} width={SCENE_W} height={SCENE_H} aria-hidden="true" />
      {ENCLOS.map((e) => {
        const [x0, y0, x1, y1] = ZONE_BOX[e.id];
        const open = model.open.has(e.id);
        return (
          <button
            key={e.id}
            type="button"
            className={`rsv-zone${open ? '' : ' is-locked'}${x0 > SCENE_W / 2 ? ' is-right' : ''}`}
            style={{ left: pct(x0, SCENE_W), top: pct(y0, SCENE_H), width: pct(x1 - x0 + 1, SCENE_W), height: pct(y1 - y0 + 1, SCENE_H) }}
            onClick={() => {
              sfx.click();
              onOpen(e.id);
            }}
            aria-label={open ? `Enclos ${e.name}` : `${e.name}, à débloquer`}
          >
            {open ? (
              <span className="rsv-zone__name">
                {e.name} <b>{(model.animals[e.id] ?? []).length}</b>
              </span>
            ) : (
              <span className="rsv-zone__lock">
                <b>{e.name}</b>
                <span>
                  <BallIcon /> {e.price.toLocaleString('fr-FR')}
                </span>
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/** Petit sprite d'un animal, pour les listes. */
function Mini({ sprite }: { sprite: Sprite }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const w = Math.max(...sprite.rows.map((r) => r.length)) + 2;
  const h = sprite.rows.length + 2;
  useEffect(() => {
    const c = ref.current!.getContext('2d')!;
    c.clearRect(0, 0, w, h);
    blit(c, sprite, 1, 1);
  }, [sprite, w, h]);
  return (
    <span className="rsv-mini">
      <canvas ref={ref} width={w} height={h} style={{ width: w * 2.5, height: h * 2.5 }} />
    </span>
  );
}

function name(card: OwnedCard): string {
  const a = ATHLETES_BY_ID[card.athleteId];
  return `${a.first} ${a.last}`.trim();
}

function EnclosSheet({ id, onClose }: { id: EnclosId; onClose: () => void }) {
  const def = ENCLOS_BY_ID[id];
  const reserve = useGame((s) => s.reserve);
  const collection = useGame((s) => s.collection);
  const balles = useGame((s) => s.balles);
  const install = useGame((s) => s.reserveInstall);
  const remove = useGame((s) => s.reserveRemove);
  const buyPlace = useGame((s) => s.reserveBuyPlace);
  const unlock = useGame((s) => s.reserveUnlock);
  const toast = useGame((s) => s.toast);
  const enclos = reserve.enclos[id];
  const byUid = useMemo(() => new Map(collection.map((c) => [c.uid, c])), [collection]);
  const installed = (enclos?.uids ?? []).map((uid) => byUid.get(uid)).filter((c): c is OwnedCard => !!c);
  const gains = enclosVisitors(installed);
  const total = gains.reduce((a, b) => a + b, 0);
  const full = !!enclos && installed.length >= enclos.places;
  const size = useWide() ? 'sm' : 'xs';

  // les espèces qui peuvent venir : la meilleure carte de chacune, celles déjà dans la réserve mises à part
  const candidates = useMemo(() => {
    const inReserve = new Set([...reservedUids(reserve)].map((uid) => byUid.get(uid)?.athleteId));
    const best = new Map<string, OwnedCard>();
    for (const card of collection) {
      const athlete = ATHLETES_BY_ID[card.athleteId];
      if (!athlete || inReserve.has(card.athleteId) || !canLiveIn(athlete, id)) continue;
      const current = best.get(card.athleteId);
      if (!current || cardVisitors(card) > cardVisitors(current)) best.set(card.athleteId, card);
    }
    return [...best.values()].sort((a, b) => cardVisitors(b) - cardVisitors(a) || name(a).localeCompare(name(b), 'fr'));
  }, [collection, reserve, byUid, id]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // rendue au niveau de la page : l'écran pivote en 3D, ce qui piégerait une fenêtre fixe sous le menu
  return createPortal(
    <div className="rsv-sheet-backdrop" onClick={onClose}>
      <div className="rsv-sheet" role="dialog" aria-label={`Enclos ${def.name}`} onClick={(e) => e.stopPropagation()}>
        <header className="rsv-sheet__head">
          <div>
            <p className="eyebrow">{def.milieux.join(' · ')}</p>
            <h2>{def.name}</h2>
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Fermer">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6,6 L18,18 M18,6 L6,18" />
            </svg>
          </button>
        </header>

        {!enclos ? (
          <div className="rsv-sheet__locked">
            <p className="muted">
              Ouvre cet enclos pour y accueillir les animaux de ces milieux. Tu as {candidates.length} espèce{candidates.length > 1 ? 's' : ''} qui pourrai{candidates.length > 1 ? 'ent' : 't'} y vivre.
            </p>
            <button
              type="button"
              className="btn btn--gold"
              disabled={balles < def.price}
              onClick={() => {
                if (unlock(id)) {
                  sfx.click();
                  toast('success', `${def.name} : l’enclos est ouvert !`);
                }
              }}
            >
              Débloquer · <BallIcon /> {def.price.toLocaleString('fr-FR')}
            </button>
          </div>
        ) : (
          <>
            <p className="rsv-sheet__stats">
              <span>
                <b>
                  {installed.length}/{enclos.places}
                </b>{' '}
                places
              </span>
              <span>
                <b>{total}</b> visiteurs/h
              </span>
              {enclos.places < MAX_PLACES && (
                <button
                  type="button"
                  className="btn btn--ghost btn--sm"
                  disabled={balles < placePrice(enclos.places)}
                  onClick={() => {
                    if (buyPlace(id)) toast('success', `${def.name} : une place de plus.`);
                  }}
                >
                  Agrandir · <BallIcon /> {placePrice(enclos.places).toLocaleString('fr-FR')}
                </button>
              )}
            </p>

            {installed.length > 0 && (
              <div className="rsv-cards">
                {installed.map((card, i) => (
                  <div key={card.uid} className="rsv-card">
                    <Card card={card} size={size} />
                    <span className="rsv-card__gain">+{gains[i]} visiteurs/h</span>
                    <button type="button" className="btn btn--ghost btn--sm" onClick={() => remove(card.uid)}>
                      Retirer
                    </button>
                  </div>
                ))}
              </div>
            )}

            <h3 className="rsv-sheet__title">{full ? 'Enclos complet : agrandis-le pour en accueillir d’autres' : 'Choisis une carte à installer'}</h3>
            {candidates.length === 0 ? (
              <p className="muted small">Aucune autre carte de ta collection ne peut vivre ici. Ouvre des boosters pour en trouver !</p>
            ) : (
              <div className="rsv-cards">
                {candidates.map((card) => {
                  const add = () => {
                    if (!full && install(id, card.uid)) sfx.click();
                  };
                  return (
                    <div key={card.uid} className={`rsv-card${full ? ' is-full' : ''}`}>
                      <Card card={card} size={size} onClick={full ? undefined : add} />
                      <span className="rsv-card__gain">+{cardVisitors(card)} visiteurs/h</span>
                      <button type="button" className="btn btn--primary btn--sm" disabled={full} onClick={add}>
                        Installer
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
            <p className="muted small">Une carte installée ne peut plus être vendue ni échangée tant qu’elle est dans la réserve. Trois animaux d’une même famille dans un enclos : +20 % de visiteurs.</p>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}

export function ReserveScreen() {
  const reserve = useGame((s) => s.reserve);
  const collection = useGame((s) => s.collection);
  const collect = useGame((s) => s.reserveCollect);
  const toast = useGame((s) => s.toast);
  const now = useNow(1000);
  const [sheet, setSheet] = useState<EnclosId | null>(null);

  const byUid = useMemo(() => new Map(collection.map((c) => [c.uid, c])), [collection]);
  const rate = reserveRate(reserve, (uid) => byUid.get(uid));
  const amount = billetterie(reserve, rate, now);
  const full = billetterieFull(reserve, rate, now);
  const level = levelOf(reserve.visitors);
  const animals = [...reservedUids(reserve)].filter((uid) => byUid.has(uid)).length;

  const model = useMemo<SceneModel>(() => {
    const open = new Set(Object.keys(reserve.enclos) as EnclosId[]);
    const sprites: SceneModel['animals'] = {};
    const gains: SceneModel['gains'] = {};
    for (const id of open) {
      const cards = (reserve.enclos[id]?.uids ?? []).map((uid) => byUid.get(uid)).filter((c): c is OwnedCard => !!c);
      sprites[id] = cards.map((c) => spriteForAthlete(ATHLETES_BY_ID[c.athleteId]));
      gains[id] = enclosVisitors(cards).reduce((a, b) => a + b, 0);
    }
    return { open, animals: sprites, gains, rate };
  }, [reserve, byUid, rate]);

  return (
    <div className="screen rsv-screen">
      <header className="rsv-head">
        <div>
          <p className="eyebrow">Niveau {level.level}</p>
          <h1>Ma Réserve</h1>
          <p className="muted small">
            {animals} animau{animals > 1 ? 'x' : ''} · {rate} visiteurs par heure
          </p>
          {level.to !== null && (
            <div className="rsv-level" title={`${reserve.visitors.toLocaleString('fr-FR')} / ${level.to.toLocaleString('fr-FR')} visiteurs`}>
              <i style={{ width: `${((reserve.visitors - level.from) / (level.to - level.from)) * 100}%` }} />
            </div>
          )}
        </div>
        <div className="rsv-billetterie">
          <span className="rsv-billetterie__label">Billetterie{full ? ' · pleine' : ''}</span>
          <button
            type="button"
            className="btn btn--gold"
            disabled={amount <= 0}
            onClick={() => {
              const got = collect();
              if (got > 0) {
                sfx.click();
                toast('gold', `Billetterie : +${got.toLocaleString('fr-FR')} crédits`);
              }
            }}
          >
            Récolter <BallIcon /> +{amount.toLocaleString('fr-FR')}
          </button>
        </div>
      </header>
      {rate === 0 && <p className="rsv-hint">Touche un enclos pour y installer tes animaux. Chaque visiteur paie son ticket : 1 crédit, à récolter à la billetterie (jusqu’à {BILLETTERIE_HOURS} h de visites).</p>}
      <Scene model={model} onOpen={setSheet} />
      <section className="rsv-panel" aria-label="Mes enclos">
        <h2>Mes enclos</h2>
        <ul>
          {ENCLOS.map((e) => {
            const st = reserve.enclos[e.id];
            const sprites = model.animals[e.id] ?? [];
            return (
              <li key={e.id}>
                <button type="button" className={st ? '' : 'is-locked'} onClick={() => setSheet(e.id)}>
                  <span className="rsv-panel__name">
                    <b>{e.name}</b>
                    <small>{e.milieux.join(' · ')}</small>
                  </span>
                  <span className="rsv-panel__animals">
                    {sprites.slice(0, 4).map((sprite, i) => (
                      <Mini key={i} sprite={sprite} />
                    ))}
                  </span>
                  <span className="rsv-panel__meta">
                    {st ? (
                      <>
                        <b>
                          {sprites.length}/{st.places}
                        </b>
                        <small>+{model.gains[e.id] ?? 0}/h</small>
                      </>
                    ) : (
                      <small className="rsv-panel__price">
                        <BallIcon /> {e.price.toLocaleString('fr-FR')}
                      </small>
                    )}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>
      {sheet && <EnclosSheet id={sheet} onClose={() => setSheet(null)} />}
    </div>
  );
}
