import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { packById, useGame } from '../store/game';
import { ATHLETES_BY_ID } from '../data/athletes';
import {
  ENCLOS,
  ENCLOS_BY_ID,
  MAX_PLACES,
  BILLETTERIE_STEPS,
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
  enclosFor,
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
import type { PackDef } from '../engine/packs';
import { PackArt } from '../components/PackArt';
import { accountsEnabled, type PublicProfile } from '../account/supabase';
import { Avatar } from '../components/Avatar';
import { useUi } from '../store/ui';
import { claimGifts, giftVisitors, giftedToday } from '../account/reserve';
import { freshSession, useAccount } from '../store/account';
import type { OwnedCard } from '../engine/types';
import { SCENE_H, SCENE_W, ZONE_BOX, drawScene, type SceneModel } from '../art/reserve-scene';
import { blit, spriteForAthlete, type Sprite } from '../art/reserve-sprites';
import { TRAIL_H, TRAIL_W, drawTrail } from '../art/expedition-scene';
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
                {e.hours} h · des crédits
                {e.cardChance > 0 && `, ${Math.round(e.cardChance * 100)} % de chances de trouver une carte`}
                {`, ${Math.round(e.packChance * 100)} % de rapporter un pack (${Object.keys(e.packs)
                  .map((id) => packById(id)?.name.replace(/^Pack /, ''))
                  .join(', ')})`}
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

/** Le milieu où part un animal en expédition : celui de son enclos (la forêt s'il n'en a pas). */
const envOf = (athleteId: string): EnclosId => {
  const athlete = ATHLETES_BY_ID[athleteId];
  return (athlete && enclosFor(athlete)) || 'foret';
};

/**
 * Le chemin d'une expédition, animé, dans le paysage du milieu de l'animal : il avance vers l'arrivée, ou attend à
 * côté de son coffre.
 */
function Trail({ sprite, env, start, end, back, loop = false, className = '' }: { sprite: Sprite; env: EnclosId; start: number; end: number; back: boolean; loop?: boolean; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const latest = useRef({ sprite, env, start, end, back, loop });
  latest.current = { sprite, env, start, end, back, loop };
  useEffect(() => {
    const c = ref.current!.getContext('2d')!;
    let frame = 0;
    const t0 = performance.now();
    const loop = (now: number) => {
      const v = latest.current;
      const span = v.end - v.start;
      const done = Date.now() - v.start;
      drawTrail(c, (now - t0) / 1000, v.sprite, v.env, v.loop ? (done % span) / span : done / span, v.back);
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, []);
  return <canvas ref={ref} className={`rsv-trail ${className}`} width={TRAIL_W} height={TRAIL_H} aria-hidden="true" />;
}

/** Retour d'expédition : l'animal saute de joie, les crédits défilent, et la carte trouvée se retourne. */
function ExpeditionReturn({ card, kind, credits, found, pack, onClose }: { card: OwnedCard; kind: ExpeditionDef['id']; credits: number; found: OwnedCard | null; pack: string | null; onClose: () => void }) {
  const openGift = useGame((s) => s.reserveOpenGiftPack);
  const packDef = pack ? packById(pack) : undefined;
  const [shown, setShown] = useState(0);
  const [reveal, setReveal] = useState(false);
  const size = useWide() ? 'sm' : 'xs';
  useEffect(() => {
    const t0 = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / 1100);
      setShown(Math.round(credits * (1 - (1 - p) ** 3)));
      if (p < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    const flip = window.setTimeout(() => {
      if (!found) return;
      setReveal(true);
      sfx.welcome(ATHLETES_BY_ID[found.athleteId]?.sport);
    }, 1300);
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(flip);
    };
  }, [credits, found]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  const now = Date.now();
  return createPortal(
    <div className="rsv-sheet-backdrop rsv-return-backdrop" onClick={onClose}>
      <div className="rsv-return" role="dialog" aria-label="Retour d’expédition" onClick={(e) => e.stopPropagation()}>
        <p className="eyebrow">{EXPEDITIONS_BY_ID[kind].name}</p>
        <h2>{name(card)} est de retour !</h2>
        <Trail sprite={spriteForAthlete(ATHLETES_BY_ID[card.athleteId])} env={envOf(card.athleteId)} start={now} end={now + 1} back className="rsv-trail--big" />
        <p className="rsv-return__credits">
          <BallIcon /> +{shown.toLocaleString('fr-FR')} crédits
        </p>
        {found && (
          <div className={`rsv-return__found${reveal ? ' is-revealed' : ''}`}>
            <p className="small">Et il a trouvé une carte en chemin :</p>
            <div className="rsv-return__card">
              <div className="rsv-return__back" aria-hidden="true" />
              <div className="rsv-return__front">
                <Card card={found} size={size} />
              </div>
            </div>
          </div>
        )}
        {packDef && (
          <div className="rsv-return__pack">
            <p className="small">Il rapporte aussi un pack de la boutique :</p>
            <div className="rsv-return__pack-art">
              <PackArt tone={packDef.tone} name={packDef.name} sport={packDef.sport} size={packDef.size} />
            </div>
          </div>
        )}
        {packDef ? (
          <div className="rsv-return__actions">
            <button
              type="button"
              className="btn btn--gold"
              onClick={() => {
                onClose();
                openGift(packDef.id);
              }}
            >
              Ouvrir le {packDef.name}
            </button>
            <button type="button" className="btn btn--ghost btn--sm" onClick={onClose}>
              Plus tard
            </button>
          </div>
        ) : (
          <button type="button" className="btn btn--gold" onClick={onClose}>
            Super !
          </button>
        )}
      </div>
    </div>,
    document.body,
  );
}

const LOOT_ICONS = {
  // une carte, en biais
  card: 'M7 4.5 L15.5 3 L18 17.5 L9.5 19 Z M9.2 7.4 L14.6 6.5 M10.4 14.6 L15.8 13.7',
  // un sachet de pack, aux bords dentelés
  pack: 'M5 4 L7 5 L9 4 L11 5 L13 4 L15 5 L17 4 L19 5 V19 L17 20 L15 19 L13 20 L11 19 L9 20 L7 19 L5 20 Z M8 9.5 H16',
};

/** Le grand bouton pour envoyer un animal en expédition : un aperçu animé du voyage et ce qu'on peut y gagner. */
function ExpeditionCta({ free, onGo }: { free: number; onGo: () => void }) {
  const reserve = useGame((s) => s.reserve);
  const collection = useGame((s) => s.collection);
  const [step, setStep] = useState(0);
  // les meilleurs animaux disponibles, et le paysage, changent toutes les quelques secondes
  const ready = useMemo(() => {
    const busy = busyUids(reserve);
    const best = new Map<string, OwnedCard>();
    for (const card of collection) {
      if (busy.has(card.uid) || !canExplore(ATHLETES_BY_ID[card.athleteId])) continue;
      const current = best.get(card.athleteId);
      if (!current || cardVisitors(card) > cardVisitors(current)) best.set(card.athleteId, card);
    }
    return [...best.values()].sort((a, b) => cardVisitors(b) - cardVisitors(a)).slice(0, 4);
  }, [collection, reserve]);
  useEffect(() => {
    const id = window.setInterval(() => setStep((n) => n + 1), 4500);
    return () => window.clearInterval(id);
  }, []);
  const [t0] = useState(() => Date.now());
  const pick = ready[step % Math.max(1, ready.length)];
  const sprite = useMemo(() => (pick ? spriteForAthlete(ATHLETES_BY_ID[pick.athleteId]) : null), [pick]);
  const disabled = !pick || free <= 0;
  return (
    <button type="button" className="rsv-go" disabled={disabled} onClick={onGo}>
      {sprite && (
        <span className="rsv-go__scene">
          <Trail sprite={sprite} env={envOf(pick.athleteId)} start={t0} end={t0 + 4500} back={false} loop />
        </span>
      )}
      <span className="rsv-go__body">
        <span className="rsv-go__text">
          <b>Partir en expédition</b>
          <small>
            {disabled
              ? 'Tous tes animaux sont dans un enclos ou déjà en route.'
              : `${pick ? name(pick) : 'Un animal'} n’attend que toi · ${free} place${free > 1 ? 's' : ''} libre${free > 1 ? 's' : ''}`}
          </small>
        </span>
        <span className="rsv-go__loot">
          <span className="rsv-go__chip">
            <BallIcon /> Crédits
          </span>
          <span className="rsv-go__chip">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d={LOOT_ICONS.card} />
            </svg>
            Cartes
          </span>
          <span className="rsv-go__chip is-gold">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d={LOOT_ICONS.pack} />
            </svg>
            Packs
          </span>
        </span>
      </span>
      {!disabled && <span className="rsv-go__cta">C’est parti !</span>}
    </button>
  );
}

/** Les animaux partis en expédition, chacun sur son chemin animé, et les places libres. */
function ExpeditionsPanel({ now }: { now: number }) {
  const reserve = useGame((s) => s.reserve);
  const collection = useGame((s) => s.collection);
  const end = useGame((s) => s.reserveEndExpedition);
  const openGift = useGame((s) => s.reserveOpenGiftPack);
  const [picking, setPicking] = useState(false);
  const [result, setResult] = useState<{ card: OwnedCard; kind: ExpeditionDef['id']; credits: number; found: OwnedCard | null; pack: string | null } | null>(null);
  const gifts = (reserve.giftPacks ?? []).map(packById).filter((p): p is PackDef => !!p);
  const trips = reserve.expeditions ?? [];
  const byUid = useMemo(() => new Map(collection.map((c) => [c.uid, c])), [collection]);
  return (
    <section className="rsv-panel rsv-expeditions" aria-label="Expéditions">
      <h2>Expéditions</h2>
      {gifts.length > 0 && (
        <ul className="rsv-gifts">
          {gifts.map((p, i) => (
            <li key={`${p.id}-${i}`} className="rsv-giftpack">
              <span className="rsv-giftpack__art">
                <PackArt tone={p.tone} name={p.name} sport={p.sport} size={p.size} />
              </span>
              <span className="rsv-panel__name">
                <b>{p.name}</b>
                <small>Rapporté d’expédition</small>
              </span>
              <button
                type="button"
                className="btn btn--gold btn--sm"
                onClick={() => {
                  if (openGift(p.id)) sfx.register();
                }}
              >
                Ouvrir
              </button>
            </li>
          ))}
        </ul>
      )}
      <ul>
        {trips.map((trip) => {
          const card = byUid.get(trip.uid);
          const athlete = card && ATHLETES_BY_ID[card.athleteId];
          const finish = expeditionEnd(trip);
          const left = finish - now;
          const back = left <= 0;
          return (
            <li key={trip.uid} className={`rsv-expedition${back ? ' is-back' : ''}`}>
              {athlete && <Trail sprite={spriteForAthlete(athlete)} env={envOf(athlete.id)} start={trip.start} end={finish} back={back} />}
              <div className="rsv-expedition__info">
                <span className="rsv-panel__name">
                  <b>{card ? name(card) : 'Animal'}</b>
                  <small>
                    {EXPEDITIONS_BY_ID[trip.kind].name} · {back ? 'de retour !' : `retour dans ${remaining(left)}`}
                  </small>
                </span>
                {back ? (
                  <button
                    type="button"
                    className="btn btn--gold btn--sm"
                    onClick={() => {
                      const got = end(trip.uid);
                      if (got && card) {
                        sfx.register();
                        setResult({ card, kind: trip.kind, credits: got.credits, found: got.card, pack: got.pack });
                      }
                    }}
                  >
                    Récupérer
                  </button>
                ) : (
                  <button type="button" className="btn btn--ghost btn--sm" onClick={() => end(trip.uid)} title="Il revient tout de suite, sans rien rapporter">
                    Rappeler
                  </button>
                )}
              </div>
            </li>
          );
        })}
        {trips.length < MAX_EXPEDITIONS && (
          <li>
            <ExpeditionCta
              free={MAX_EXPEDITIONS - trips.length}
              onGo={() => {
                sfx.rustle();
                setPicking(true);
              }}
            />
          </li>
        )}
      </ul>
      <p className="muted small">Un animal revient avec des crédits, selon sa rareté et la durée, et parfois avec une nouvelle carte ou un pack de la boutique.</p>
      {picking && <ExpeditionSheet onClose={() => setPicking(false)} />}
      {result && <ExpeditionReturn {...result} onClose={() => setResult(null)} />}
    </section>
  );
}

/** Les réserves des amis : leur niveau, et un bouton pour aller les visiter (et leur envoyer des visiteurs). */
function FriendsPanel() {
  const session = useAccount((s) => s.session);
  const friendships = useAccount((s) => s.friendships);
  const profiles = useAccount((s) => s.friendProfiles);
  const refreshFriends = useAccount((s) => s.refreshFriends);
  const setTab = useUi((s) => s.setTab);
  const [visiting, setVisiting] = useState<PublicProfile | null>(null);
  useEffect(() => {
    if (session && accountsEnabled()) void refreshFriends();
  }, [session, refreshFriends]);
  if (!accountsEnabled()) return null;
  const me = session?.userId;
  const friends = friendships
    .filter((f) => f.status === 'accepted')
    .map((f) => profiles[f.fromId === me ? f.toId : f.fromId])
    .filter((p): p is PublicProfile => !!p)
    .sort((a, b) => (b.reserve?.level ?? 0) - (a.reserve?.level ?? 0) || a.pseudo.localeCompare(b.pseudo, 'fr'));
  return (
    <section className="rsv-panel rsv-friends" aria-label="Réserves de mes amis">
      <h2>Réserves de mes amis</h2>
      {!session ? (
        <p className="muted small">Crée un compte pour visiter les réserves de tes amis et leur envoyer des visiteurs.</p>
      ) : friends.length === 0 ? (
        <p className="muted small">
          Ajoute des amis pour visiter leur réserve et leur envoyer {GIFT_VISITORS} visiteurs par jour.{' '}
          <button type="button" className="link-btn" onClick={() => setTab('profil')}>
            Ajouter des amis
          </button>
        </p>
      ) : (
        <ul>
          {friends.map((p) => {
            const count = Object.values(p.reserve?.enclos ?? {}).reduce((n, ids) => n + (ids?.length ?? 0), 0);
            return (
              <li key={p.id} className="rsv-friend">
                <Avatar athleteId={p.avatar} pseudo={p.pseudo} className="avatar--player" />
                <span className="rsv-panel__name">
                  <b>{p.pseudo}</b>
                  <small>{p.reserve ? `Niveau ${p.reserve.level} · ${count} animau${count > 1 ? 'x' : ''} · ${p.reserve.rate} visiteurs/h` : 'Pas encore de réserve ouverte'}</small>
                </span>
                <button
                  type="button"
                  className="btn btn--primary btn--sm"
                  disabled={!p.reserve}
                  onClick={() => {
                    sfx.rustle();
                    setVisiting(p);
                  }}
                >
                  Visiter
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {visiting && <FriendReserveSheet profile={visiting} onClose={() => setVisiting(null)} />}
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
    return { open, animals, gains: {}, rate: view.rate };
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
    return { open, animals: sprites, gains, rate };
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
      <FriendsPanel />
      </div>
      {sheet && <EnclosSheet id={sheet} onClose={() => setSheet(null)} />}
    </div>
  );
}
