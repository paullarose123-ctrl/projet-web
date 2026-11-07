import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useGame } from '../store/game';
import { ATHLETES_BY_ID } from '../data/athletes';
import {
  ENCLOS,
  ENCLOS_BY_ID,
  MAX_PLACES,
  BILLETTERIE_STEPS,
  DECORS,
  EXPEDITIONS,
  GIFT_VISITORS,
  EXPEDITIONS_BY_ID,
  LEVEL_REWARDS,
  MAX_EXPEDITIONS,
  billetterie,
  billetterieFull,
  billetterieHours,
  busyUids,
  canExplore,
  canLiveIn,
  cardVisitors,
  decorBonus,
  enclosVisitors,
  expeditionCredits,
  expeditionEnd,
  levelOf,
  placePrice,
  requestProgress,
  requestText,
  reserveRate,
  reservedUids,
  type EnclosId,
  type ExpeditionDef,
} from '../engine/reserve';
import { dayKey } from '../engine/daily';
import type { PublicProfile } from '../account/supabase';
import { claimGifts, giftVisitors, giftedToday } from '../account/reserve';
import { freshSession, useAccount } from '../store/account';
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

/** Le plan de la réserve. Sans `onOpen` (réserve d'un ami), les enclos se regardent sans se toucher. */
function Scene({ model, onOpen }: { model: SceneModel; onOpen?: (id: EnclosId) => void }) {
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
            disabled={!onOpen}
            className={`rsv-zone${open ? '' : ' is-locked'}${x0 > SCENE_W / 2 ? ' is-right' : ''}${onOpen ? '' : ' is-view'}`}
            style={{ left: pct(x0, SCENE_W), top: pct(y0, SCENE_H), width: pct(x1 - x0 + 1, SCENE_W), height: pct(y1 - y0 + 1, SCENE_H) }}
            onClick={() => {
              if (!onOpen) return;
              sfx.rustle();
              onOpen(e.id);
            }}
            aria-label={open ? `Enclos ${e.name}` : `${e.name}, à débloquer`}
          >
            {open ? (
              <span className="rsv-zone__name">
                {e.name} <b>{(model.animals[e.id] ?? []).length}</b>
              </span>
            ) : onOpen ? (
              <span className="rsv-zone__lock">
                <b>{e.name}</b>
                <span>
                  <BallIcon /> {e.price.toLocaleString('fr-FR')}
                </span>
              </span>
            ) : null}
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
    const away = busyUids(reserve);
    const best = new Map<string, OwnedCard>();
    for (const card of collection) {
      const athlete = ATHLETES_BY_ID[card.athleteId];
      if (!athlete || inReserve.has(card.athleteId) || away.has(card.uid) || !canLiveIn(athlete, id)) continue;
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
                  sfx.gate();
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
                    if (buyPlace(id)) {
                      sfx.hammer();
                      toast('info', `${def.name} : une place de plus.`);
                    }
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
                    <button type="button" className="btn btn--ghost btn--sm" onClick={() => {
                        remove(card.uid);
                        sfx.goodbye();
                      }}
                    >
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
                    if (!full && install(id, card.uid)) sfx.welcome(ATHLETES_BY_ID[card.athleteId]?.sport);
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

/** Temps restant, en heures et minutes. */
function remaining(ms: number): string {
  const min = Math.max(0, Math.ceil(ms / 60_000));
  const h = Math.floor(min / 60);
  return h ? `${h} h ${String(min % 60).padStart(2, '0')}` : `${min} min`;
}

/** Les trois demandes des visiteurs du jour. */
function RequestsPanel({ now }: { now: number }) {
  const reserve = useGame((s) => s.reserve);
  const collection = useGame((s) => s.collection);
  const refresh = useGame((s) => s.reserveRefreshRequests);
  const claim = useGame((s) => s.reserveClaimRequest);
  const day = dayKey(now);
  useEffect(() => refresh(), [day, refresh]);
  const byUid = useMemo(() => new Map(collection.map((c) => [c.uid, c])), [collection]);
  const requests = reserve.requests?.day === day ? reserve.requests : null;
  return (
    <section className="rsv-panel rsv-requests" aria-label="Demandes des visiteurs">
      <h2>Demandes du jour</h2>
      {!requests || requests.list.length === 0 ? (
        <p className="muted small">Installe tes premiers animaux : les visiteurs auront bientôt des demandes.</p>
      ) : (
        <ul>
          {requests.list.map((r, i) => {
            const done = requests.done.includes(i);
            const { have, need } = requestProgress(r, reserve, (uid) => byUid.get(uid));
            const ok = have >= need;
            return (
              <li key={i} className={`rsv-request${done ? ' is-done' : ok ? ' is-ready' : ''}`}>
                <p>{requestText(r)}</p>
                <div className="rsv-request__foot">
                  <span className="rsv-request__bar" aria-label={`${Math.min(have, need)} sur ${need}`}>
                    <i style={{ width: `${Math.min(1, have / need) * 100}%` }} />
                  </span>
                  <small>
                    {Math.min(have, need)}/{need}
                  </small>
                  {done ? (
                    <span className="rsv-request__done">✓ Fait</span>
                  ) : (
                    <button
                      type="button"
                      className="btn btn--gold btn--sm"
                      disabled={!ok}
                      onClick={() => {
                        if (claim(i)) sfx.register();
                      }}
                    >
                      <BallIcon /> +{r.reward.toLocaleString('fr-FR')}
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <p className="muted small">De nouvelles demandes arrivent chaque jour à minuit.</p>
    </section>
  );
}

/** Fenêtre pour envoyer un animal en expédition : la destination, puis l'animal. */
function ExpeditionSheet({ onClose }: { onClose: () => void }) {
  const reserve = useGame((s) => s.reserve);
  const collection = useGame((s) => s.collection);
  const send = useGame((s) => s.reserveSendExpedition);
  const toast = useGame((s) => s.toast);
  const [kind, setKind] = useState<ExpeditionDef['id']>('exploration');
  const size = useWide() ? 'sm' : 'xs';
  const candidates = useMemo(() => {
    const busy = busyUids(reserve);
    const best = new Map<string, OwnedCard>();
    for (const card of collection) {
      if (busy.has(card.uid) || !canExplore(ATHLETES_BY_ID[card.athleteId])) continue;
      const current = best.get(card.athleteId);
      if (!current || cardVisitors(card) > cardVisitors(current)) best.set(card.athleteId, card);
    }
    return [...best.values()].sort((a, b) => cardVisitors(b) - cardVisitors(a) || name(a).localeCompare(name(b), 'fr'));
  }, [collection, reserve]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  const def = EXPEDITIONS_BY_ID[kind];
  return createPortal(
    <div className="rsv-sheet-backdrop" onClick={onClose}>
      <div className="rsv-sheet" role="dialog" aria-label="Partir en expédition" onClick={(e) => e.stopPropagation()}>
        <header className="rsv-sheet__head">
          <div>
            <p className="eyebrow">Expédition</p>
            <h2>Qui part explorer ?</h2>
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Fermer">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6,6 L18,18 M18,6 L6,18" />
            </svg>
          </button>
        </header>
        <div className="rsv-trips" role="radiogroup" aria-label="Durée">
          {EXPEDITIONS.map((e) => (
            <button key={e.id} type="button" role="radio" aria-checked={kind === e.id} className={`rsv-trip${kind === e.id ? ' is-on' : ''}`} onClick={() => setKind(e.id)}>
              <b>{e.name}</b>
              <small>
                {e.hours} h{e.cardChance ? ` · ${Math.round(e.cardChance * 100)} % de chances de trouver une carte` : ' · des crédits'}
              </small>
            </button>
          ))}
        </div>
        {candidates.length === 0 ? (
          <p className="muted small">Tous tes animaux sont déjà dans la réserve ou en expédition.</p>
        ) : (
          <div className="rsv-cards">
            {candidates.map((card) => {
              const go = () => {
                if (send(card.uid, kind)) {
                  sfx.gate();
                  toast('info', `${name(card)} part en ${def.name.toLowerCase()} : retour dans ${def.hours} h.`);
                  onClose();
                }
              };
              return (
                <div key={card.uid} className="rsv-card">
                  <Card card={card} size={size} onClick={go} />
                  <span className="rsv-card__gain">+{expeditionCredits(card, kind).toLocaleString('fr-FR')} crédits</span>
                  <button type="button" className="btn btn--primary btn--sm" onClick={go}>
                    Envoyer
                  </button>
                </div>
              );
            })}
          </div>
        )}
        <p className="muted small">Un animal installé dans un enclos ne peut pas partir. Pendant l’expédition, il ne peut être ni vendu, ni échangé.</p>
      </div>
    </div>,
    document.body,
  );
}

/** Les animaux partis en expédition, et les places libres. */
function ExpeditionsPanel({ now }: { now: number }) {
  const reserve = useGame((s) => s.reserve);
  const collection = useGame((s) => s.collection);
  const end = useGame((s) => s.reserveEndExpedition);
  const [picking, setPicking] = useState(false);
  const trips = reserve.expeditions ?? [];
  const byUid = useMemo(() => new Map(collection.map((c) => [c.uid, c])), [collection]);
  return (
    <section className="rsv-panel rsv-expeditions" aria-label="Expéditions">
      <h2>Expéditions</h2>
      <ul>
        {trips.map((trip) => {
          const card = byUid.get(trip.uid);
          const athlete = card && ATHLETES_BY_ID[card.athleteId];
          const left = expeditionEnd(trip) - now;
          const back = left <= 0;
          return (
            <li key={trip.uid} className={`rsv-expedition${back ? ' is-back' : ''}`}>
              {athlete && <Mini sprite={spriteForAthlete(athlete)} />}
              <span className="rsv-panel__name">
                <b>{card ? name(card) : 'Animal'}</b>
                <small>
                  {EXPEDITIONS_BY_ID[trip.kind].name} · {back ? 'de retour !' : `retour dans ${remaining(left)}`}
                </small>
              </span>
              {back ? (
                <button type="button" className="btn btn--gold btn--sm" onClick={() => {
                    end(trip.uid);
                    sfx.register();
                  }}
                >
                  Récupérer
                </button>
              ) : (
                <button type="button" className="btn btn--ghost btn--sm" onClick={() => end(trip.uid)} title="Il revient tout de suite, sans rien rapporter">
                  Rappeler
                </button>
              )}
            </li>
          );
        })}
        {trips.length < MAX_EXPEDITIONS && (
          <li>
            <button type="button" className="rsv-expedition__new" onClick={() => {
                sfx.rustle();
                setPicking(true);
              }}
            >
              + Envoyer un animal en expédition
            </button>
          </li>
        )}
      </ul>
      <p className="muted small">Un animal revient avec des crédits, selon sa rareté et la durée, et parfois avec une nouvelle carte.</p>
      {picking && <ExpeditionSheet onClose={() => setPicking(false)} />}
    </section>
  );
}

/** Les décors de l'esplanade : chacun attire plus de visiteurs dans toute la réserve. */
function DecorPanel() {
  const reserve = useGame((s) => s.reserve);
  const balles = useGame((s) => s.balles);
  const buy = useGame((s) => s.reserveBuyDecor);
  const toast = useGame((s) => s.toast);
  const level = levelOf(reserve.visitors).level;
  const owned = new Set(reserve.decor ?? []);
  return (
    <section className="rsv-panel rsv-decors" aria-label="Décors">
      <h2>Décors {decorBonus(reserve) > 0 && <small>· +{Math.round(decorBonus(reserve) * 100)} % de visiteurs</small>}</h2>
      <ul>
        {DECORS.map((d) => {
          const has = owned.has(d.id);
          const locked = level < d.level;
          return (
            <li key={d.id} className={`rsv-decor${has ? ' is-owned' : ''}`}>
              <span className="rsv-panel__name">
                <b>{d.name}</b>
                <small>+{Math.round(d.bonus * 100)} % de visiteurs</small>
              </span>
              {has ? (
                <span className="rsv-request__done">✓ Installé</span>
              ) : locked ? (
                <span className="muted small">Niveau {d.level}</span>
              ) : (
                <button
                  type="button"
                  className="btn btn--gold btn--sm"
                  disabled={balles < d.price}
                  onClick={() => {
                    if (buy(d.id)) {
                      sfx.hammer();
                      toast('success', `${d.name} : installé sur l’esplanade !`);
                    }
                  }}
                >
                  <BallIcon /> {d.price.toLocaleString('fr-FR')}
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** La réserve d'un ami, en lecture seule, avec le bouton pour lui envoyer des visiteurs. */
export function FriendReserveSheet({ profile, onClose }: { profile: PublicProfile; onClose: () => void }) {
  const session = useAccount((s) => s.session);
  const toast = useGame((s) => s.toast);
  const [sent, setSent] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const view = profile.reserve!;
  useEffect(() => {
    let live = true;
    void freshSession()
      .then((s) => (s ? giftedToday(s) : new Set<string>()))
      .then((ids) => live && setSent(ids.has(profile.id)))
      .catch(() => live && setSent(false));
    return () => {
      live = false;
    };
  }, [profile.id]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  const model = useMemo<SceneModel>(() => {
    const open = new Set(Object.keys(view.enclos).filter((id) => ENCLOS_BY_ID[id as EnclosId]) as EnclosId[]);
    const animals: SceneModel['animals'] = {};
    for (const id of open) animals[id] = (view.enclos[id] ?? []).filter((a) => ATHLETES_BY_ID[a]).map((a) => spriteForAthlete(ATHLETES_BY_ID[a]));
    return { open, animals, gains: {}, rate: view.rate, decor: new Set(view.decor) };
  }, [view]);
  const count = Object.values(view.enclos).reduce((n, ids) => n + (ids?.length ?? 0), 0);
  const gift = async () => {
    setBusy(true);
    try {
      const s = await freshSession();
      if (!s) return;
      const n = await giftVisitors(s, profile.id);
      setSent(true);
      sfx.register();
      toast('success', `Tu as envoyé ${n} visiteurs dans la réserve de ${profile.pseudo} !`);
    } catch (error) {
      toast('error', error instanceof Error ? error.message : 'Le cadeau n’est pas parti. Réessaie dans un moment.');
      if (error instanceof Error && /déjà/.test(error.message)) setSent(true);
    } finally {
      setBusy(false);
    }
  };
  return createPortal(
    <div className="rsv-sheet-backdrop" onClick={onClose}>
      <div className="rsv-sheet rsv-sheet--friend" role="dialog" aria-label={`Réserve de ${profile.pseudo}`} onClick={(e) => e.stopPropagation()}>
        <header className="rsv-sheet__head">
          <div>
            <p className="eyebrow">Niveau {view.level}</p>
            <h2>Réserve de {profile.pseudo}</h2>
            <p className="muted small">
              {count} animau{count > 1 ? 'x' : ''} · {view.rate} visiteurs par heure
            </p>
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Fermer">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6,6 L18,18 M18,6 L6,18" />
            </svg>
          </button>
        </header>
        <Scene model={model} />
        <div className="rsv-gift">
          <button type="button" className="btn btn--gold" disabled={!session || busy || sent !== false} onClick={() => void gift()}>
            {sent ? '✓ Visiteurs envoyés aujourd’hui' : `Lui envoyer ${GIFT_VISITORS} visiteurs`}
          </button>
          <p className="muted small">Une fois par jour et par ami : les visiteurs arrivent à sa billetterie.</p>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export function ReserveScreen() {
  const reserve = useGame((s) => s.reserve);
  const collection = useGame((s) => s.collection);
  const collect = useGame((s) => s.reserveCollect);
  const upgradeCaisse = useGame((s) => s.reserveUpgradeCaisse);
  const balles = useGame((s) => s.balles);
  const toast = useGame((s) => s.toast);
  const now = useNow(1000);
  const [sheet, setSheet] = useState<EnclosId | null>(null);
  const receive = useGame((s) => s.reserveReceiveVisitors);
  const session = useAccount((s) => s.session);

  // les visiteurs envoyés par les amis arrivent à la billetterie
  useEffect(() => {
    if (!session) return;
    let live = true;
    void freshSession()
      .then((s) => (s ? claimGifts(s) : []))
      .then((gifts) => {
        if (!live) return;
        for (const g of gifts) {
          receive(g.amount);
          toast('gold', `${g.giver} t’envoie ${g.amount} visiteurs : ils sont à ta billetterie !`);
        }
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [session, receive, toast]);

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
    return { open, animals: sprites, gains, rate, decor: new Set(reserve.decor ?? []) };
  }, [reserve, byUid, rate]);
  const hours = billetterieHours(reserve);
  const nextCaisse = BILLETTERIE_STEPS[(reserve.caisse ?? 0) + 1];
  const nextReward = level.to !== null ? LEVEL_REWARDS[level.level + 1] : undefined;

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
          {nextReward && (
            <p className="rsv-next small">
              Niveau {level.level + 1} : <BallIcon /> +{nextReward.credits.toLocaleString('fr-FR')}
              {nextReward.boosters > 0 && ` et ${nextReward.boosters} booster${nextReward.boosters > 1 ? 's' : ''}`}
            </p>
          )}
        </div>
        <div className="rsv-billetterie">
          <span className="rsv-billetterie__label">
            Billetterie · {hours} h{full ? ' · pleine' : ''}
          </span>
          <button
            type="button"
            className="btn btn--gold"
            disabled={amount <= 0}
            onClick={() => {
              const got = collect();
              if (got > 0) {
                sfx.register();
                toast('gold', `Billetterie : +${got.toLocaleString('fr-FR')} crédits`);
              }
            }}
          >
            Récolter <BallIcon /> +{amount.toLocaleString('fr-FR')}
          </button>
          {nextCaisse && (
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              disabled={balles < nextCaisse.price}
              title={`La billetterie compte jusqu’à ${nextCaisse.hours} h de visites pendant ton absence`}
              onClick={() => {
                if (upgradeCaisse()) {
                  sfx.hammer();
                  toast('success', `Billetterie agrandie : elle compte maintenant jusqu’à ${nextCaisse.hours} h de visites.`);
                }
              }}
            >
              Agrandir à {nextCaisse.hours} h · <BallIcon /> {nextCaisse.price.toLocaleString('fr-FR')}
            </button>
          )}
        </div>
      </header>
      {rate === 0 && <p className="rsv-hint">Touche un enclos pour y installer tes animaux. Chaque visiteur paie son ticket : 1 crédit, à récolter à la billetterie (jusqu’à {hours} h de visites).</p>}
      <Scene model={model} onOpen={setSheet} />
      <div className="rsv-side">
      <section className="rsv-panel rsv-panel--enclos" aria-label="Mes enclos">
        <h2>Mes enclos</h2>
        <ul>
          {ENCLOS.map((e) => {
            const st = reserve.enclos[e.id];
            const sprites = model.animals[e.id] ?? [];
            return (
              <li key={e.id}>
                <button type="button" className={st ? '' : 'is-locked'} onClick={() => {
                    sfx.rustle();
                    setSheet(e.id);
                  }}
                >
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
      <RequestsPanel now={now} />
      <ExpeditionsPanel now={now} />
      <DecorPanel />
      </div>
      {sheet && <EnclosSheet id={sheet} onClose={() => setSheet(null)} />}
    </div>
  );
}
