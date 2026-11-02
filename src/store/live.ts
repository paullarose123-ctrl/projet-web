import { create } from 'zustand';
import { AccountError } from '../account/supabase';
import { INVITE_TTL, acceptLive, challengeLive, declineLive, fetchLiveDuels, forfeitLive, pickLive, viewLive, type LiveDuel } from '../account/live';
import { sfx } from '../audio/sfx';
import { ATHLETES_BY_ID } from '../data/athletes';
import { TEAM_SIZE, canDuel, compare, drawRecords, recordValue, type DuelCard, type DuelRound, type DuelState } from '../engine/duel';
import type { CardFace, OwnedCard } from '../engine/types';
import { freshSession } from './account';
import { useGame } from './game';
import { useUi } from './ui';

// Duels en direct entre amis : on défie un ami avec son équipe, il reçoit une notification et accepte avec la sienne,
// puis les deux jouent chaque manche en même temps. Pendant un duel, le jeu relit l'état toutes les 1,5 s ; le reste
// du temps, il regarde toutes les 8 s s'il y a une invitation (30 s quand l'onglet est caché).

/** Un joueur qui n'a pas donné signe de vie depuis une minute peut être déclaré forfait. */
export const ABSENT_AFTER = 60_000;

const message = (error: unknown) => {
  const text = error instanceof AccountError ? error.message : '';
  if (/pas encore activé/.test(text)) return 'Les duels en direct ne sont pas encore activés sur le serveur du jeu.';
  return text || 'Le duel en direct ne répond pas. Réessaie dans un moment.';
};

/** Les 5 animaux de mon équipe de duel (null si elle n'est pas complète). */
function myTeam(): OwnedCard[] | null {
  const game = useGame.getState();
  const cards = game.team
    .map((uid) => game.collection.find((c) => c.uid === uid))
    .filter((c): c is OwnedCard => !!c && canDuel(ATHLETES_BY_ID[c.athleteId]));
  return cards.length >= TEAM_SIZE ? cards.slice(0, TEAM_SIZE) : null;
}

const faces = (cards: OwnedCard[]): CardFace[] => cards.map((c) => ({ athleteId: c.athleteId, variant: c.variant }));

/** Le duel vu de mon côté, au format d'un duel ordinaire (pour réutiliser son affichage). */
export function liveAsDuel(live: LiveDuel, me: string): DuelState {
  const iAmA = live.aId === me;
  const withUid = (team: CardFace[] | null, side: string): DuelCard[] => (team ?? []).map((c, i) => ({ ...c, uid: `${live.id}-${side}${i}` }));
  const mine = withUid(iAmA ? live.aTeam : live.bTeam, 'm');
  const theirs = withUid(iAmA ? live.bTeam : live.aTeam, 'o');
  const log: DuelRound[] = live.picks
    .filter((p) => mine[iAmA ? p.a : p.b] && theirs[iAmA ? p.b : p.a])
    .map((p) => {
      const myIndex = iAmA ? p.a : p.b;
      const oppIndex = iAmA ? p.b : p.a;
      const record = live.records[p.round];
      const myValue = recordValue(mine[myIndex], record);
      const oppValue = recordValue(theirs[oppIndex], record);
      return { round: p.round, record, me: myIndex, opp: oppIndex, myValue, oppValue, winner: compare(record, myValue, oppValue) };
    });
  return {
    id: live.id,
    kind: 'duel',
    friend: iAmA ? live.b : live.a,
    division: 1,
    records: live.records,
    round: Math.min(live.round, live.records.length),
    me: { name: iAmA ? live.a : live.b, cards: mine, used: log.map((l) => l.me), score: log.filter((l) => l.winner === 'me').length },
    opp: { name: iAmA ? live.b : live.a, cards: theirs, used: log.map((l) => l.opp), score: log.filter((l) => l.winner === 'opp').length },
    log,
    finished: live.status === 'done',
  };
}

/** Résultat d'un duel fini, de mon côté (un forfait l'emporte sur le score). */
export function liveResult(live: LiveDuel, me: string): 'win' | 'draw' | 'loss' {
  if (live.forfeit) return live.forfeit === me ? 'loss' : 'win';
  const duel = liveAsDuel(live, me);
  return duel.me.score > duel.opp.score ? 'win' : duel.me.score < duel.opp.score ? 'loss' : 'draw';
}

/** Notification du système quand le jeu est en arrière-plan (si le joueur l'a autorisée). */
function notify(text: string) {
  try {
    if (document.visibilityState !== 'visible' && 'Notification' in window && Notification.permission === 'granted') {
      new Notification('AnimalCards', { body: text, tag: 'animalcards-duel' });
    }
  } catch {
    // notifications indisponibles : la notification du jeu suffit
  }
}

/** Demande la permission d'afficher des notifications (après un geste du joueur). */
export function askNotifications() {
  try {
    if ('Notification' in window && Notification.permission === 'default') void Notification.requestPermission();
  } catch {
    // navigateur sans notifications
  }
}

interface LiveState {
  /** défis reçus, en attente de réponse */
  invites: LiveDuel[];
  /** mon duel : mon défi en attente, ou le duel en cours ou tout juste fini */
  current: LiveDuel | null;
  /** identifiant du compte connecté */
  me: string | null;
  busy: boolean;
  poll: () => Promise<void>;
  challenge: (friend: { id: string; pseudo: string }) => Promise<boolean>;
  accept: (invite: LiveDuel) => Promise<boolean>;
  decline: (invite: LiveDuel) => Promise<void>;
  cancel: () => Promise<void>;
  pick: (card: number) => Promise<void>;
  forfeit: () => Promise<void>;
  close: () => void;
}

const notified = new Set<string>();
let polling: Promise<void> | null = null;

const fresh = (d: LiveDuel) => Date.now() - Math.max(d.aSeen, d.bSeen ?? 0, d.updatedAt) < 3 * 60_000;

export const useLive = create<LiveState>()((set, get) => {
  /** Enregistre un nouvel état du duel en cours, avec les annonces qui vont avec. */
  const update = (next: LiveDuel, me: string) => {
    const before = get().current;
    if (before && before.id === next.id) {
      if (before.status === 'pending' && next.status === 'active') {
        sfx.fanfare();
        useGame.getState().toast('gold', `${next.b} a accepté ton défi : que le duel commence !`);
        notify(`${next.b} a accepté ton défi !`);
      }
      if (before.status === 'pending' && (next.status === 'declined' || next.status === 'cancelled')) {
        if (next.aId === me && next.status === 'declined') useGame.getState().toast('info', `${next.b} a refusé le duel.`);
        set({ current: null });
        return;
      }
    }
    if (next.status === 'done') {
      const opponent = next.aId === me ? next.b : next.a;
      useGame.getState().finishLiveDuel(next.id, liveResult(next, me), opponent);
    }
    set({ current: next });
  };

  return {
    invites: [],
    current: null,
    me: null,
    busy: false,

    poll: () => {
      polling ??= (async () => {
        try {
          const session = await freshSession().catch(() => null);
          if (!session) {
            set({ invites: [], current: null, me: null });
            return;
          }
          const me = session.userId;
          set({ me });
          const current = get().current;
          if (current && current.status === 'pending' && current.aId === me && Date.now() - current.createdAt > INVITE_TTL) {
            // personne n'a répondu : le défi tombe
            await declineLive(session, current.id).catch(() => undefined);
            useGame.getState().toast('info', `${current.b} n’a pas répondu au défi.`);
            set({ current: null });
            return;
          }
          if (current && (current.status === 'pending' || current.status === 'active')) {
            update(await viewLive(session, current.id), me);
            return;
          }
          if (current) return; // duel fini, affiché jusqu'à ce que le joueur le ferme
          const rows = await fetchLiveDuels(session);
          const invites = rows.filter((d) => d.bId === me && d.status === 'pending' && Date.now() - d.createdAt < INVITE_TTL);
          for (const invite of invites) {
            if (notified.has(invite.id)) continue;
            notified.add(invite.id);
            // la carte d'invitation (LiveDuel.tsx) sert de notification dans le jeu
            sfx.fanfare();
            notify(`${invite.a} te défie en duel en direct !`);
          }
          set({ invites });
          // un duel en cours (après un rechargement de la page) ou mon défi en attente : on le reprend
          const mine = rows.find((d) => (d.status === 'active' && fresh(d)) || (d.status === 'pending' && d.aId === me && Date.now() - d.createdAt < INVITE_TTL));
          if (mine) update(await viewLive(session, mine.id), me);
        } catch {
          // réessayé au prochain tour
        } finally {
          polling = null;
        }
      })();
      return polling;
    },

    challenge: async (friend) => {
      const game = useGame.getState();
      if (get().current && get().current!.status !== 'done') {
        game.toast('error', 'Tu as déjà un duel en direct en cours.');
        return false;
      }
      const team = myTeam();
      if (!team) {
        game.toast('error', `Compose d’abord ton équipe de ${TEAM_SIZE} animaux dans l’onglet Duel.`);
        useUi.getState().setTab('matchs');
        return false;
      }
      const session = await freshSession().catch(() => null);
      if (!session) return false;
      askNotifications();
      set({ busy: true });
      try {
        const duel = await challengeLive(session, friend.id, faces(team), drawRecords(Math.random));
        notified.add(duel.id);
        set({ current: duel, me: session.userId });
        kick();
        return true;
      } catch (error) {
        game.toast('error', message(error));
        return false;
      } finally {
        set({ busy: false });
      }
    },

    accept: async (invite) => {
      const game = useGame.getState();
      const team = myTeam();
      if (!team) {
        game.toast('error', `Compose d’abord ton équipe de ${TEAM_SIZE} animaux dans l’onglet Duel, puis accepte le défi.`);
        useUi.getState().setTab('matchs');
        return false;
      }
      const session = await freshSession().catch(() => null);
      if (!session) return false;
      askNotifications();
      set({ busy: true });
      try {
        const duel = await acceptLive(session, invite.id, faces(team));
        set((s) => ({ current: duel, me: session.userId, invites: s.invites.filter((i) => i.id !== invite.id) }));
        sfx.fanfare();
        kick();
        return true;
      } catch (error) {
        game.toast('error', /indisponible/.test(message(error)) ? 'Ce défi n’est plus valable.' : message(error));
        set((s) => ({ invites: s.invites.filter((i) => i.id !== invite.id) }));
        return false;
      } finally {
        set({ busy: false });
      }
    },

    decline: async (invite) => {
      set((s) => ({ invites: s.invites.filter((i) => i.id !== invite.id) }));
      const session = await freshSession().catch(() => null);
      if (session) await declineLive(session, invite.id).catch(() => undefined);
    },

    cancel: async () => {
      const current = get().current;
      set({ current: null });
      const session = await freshSession().catch(() => null);
      if (session && current) await declineLive(session, current.id).catch(() => undefined);
    },

    pick: async (card) => {
      const current = get().current;
      const session = await freshSession().catch(() => null);
      if (!current || !session || current.status !== 'active') return;
      // affiché tout de suite : « en attente de l'autre »
      set({ current: { ...current, mine: card }, busy: true });
      try {
        update(await pickLive(session, current.id, current.round, card), session.userId);
      } catch (error) {
        set((s) => ({ current: s.current && { ...s.current, mine: null } }));
        useGame.getState().toast('error', message(error));
        void get().poll();
      } finally {
        set({ busy: false });
      }
    },

    forfeit: async () => {
      const current = get().current;
      const session = await freshSession().catch(() => null);
      if (!current || !session) return;
      try {
        update(await forfeitLive(session, current.id), session.userId);
      } catch (error) {
        useGame.getState().toast('error', message(error));
      }
    },

    close: () => set({ current: null }),
  };
});

/** Relance tout de suite la surveillance (après un défi ou une acceptation, pour suivre le duel sans attendre). */
let kick: () => void = () => undefined;

/** Lance la surveillance des duels en direct ; renvoie de quoi l'arrêter. */
export function startLive(): () => void {
  let stopped = false;
  let timer: number | undefined;
  // chaque relance invalide la boucle précédente (jamais deux boucles en même temps)
  let generation = 0;
  const loop = async (g: number) => {
    if (stopped || g !== generation) return;
    await useLive.getState().poll();
    if (stopped || g !== generation) return;
    const current = useLive.getState().current;
    const playing = !!current && (current.status === 'active' || current.status === 'pending');
    timer = window.setTimeout(() => void loop(g), playing ? 1500 : document.visibilityState === 'visible' ? 8000 : 30_000);
  };
  const restart = () => {
    generation += 1;
    window.clearTimeout(timer);
    void loop(generation);
  };
  kick = restart;
  restart();
  const onVisible = () => {
    if (document.visibilityState === 'visible') restart();
  };
  document.addEventListener('visibilitychange', onVisible);
  return () => {
    stopped = true;
    kick = () => undefined;
    window.clearTimeout(timer);
    document.removeEventListener('visibilitychange', onVisible);
  };
}
