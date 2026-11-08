import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import {
  AccountError,
  acceptFriendRequest,
  accountsEnabled,
  deleteFriendship,
  findProfile,
  listFriendships,
  profilesByIds,
  sendFriendRequest,
  loadSave,
  loadSaveStamp,
  refresh,
  signIn,
  signOut,
  signUp,
  storeProfile,
  storeSave,
  type Friendship,
  type PublicProfile,
  type Session,
} from '../account/supabase';
import type { CardFace } from '../engine/types';
import { reserveSnapshot } from '../engine/reserve';
import { readSave, useGame, writeSave } from './game';

// Compte du joueur : la session Supabase (gardée dans le navigateur) et la sauvegarde automatique.
// En invité, la partie reste dans ce navigateur. Une fois connecté, elle est envoyée au compte SAVE_EVERY
// millisecondes après chaque changement, et dès que l'onglet est caché ou fermé.
// Plusieurs appareils sur le même compte : chacun retient la date de la dernière sauvegarde qu'il a envoyée ou
// reprise (syncedAt). Avant d'envoyer, à l'ouverture du jeu et quand il revient au premier plan, il regarde la date
// de la sauvegarde du compte : si un autre appareil l'a changée entre-temps, il reprend cette partie au lieu de
// l'écraser avec la sienne, restée en arrière. Seul cas où il garde la sienne : il a des changements pas encore
// envoyés ET plus de progression que celle du compte.

const SAVE_EVERY = 6_000;

export type SyncStatus = 'idle' | 'saving' | 'saved' | 'error';

interface AccountState {
  session: Session | null;
  status: SyncStatus;
  lastSavedAt: number | null;
  /** date (côté serveur) de la dernière sauvegarde du compte envoyée ou reprise par cet appareil */
  syncedAt: string | null;
  /** empreinte de cette partie-là : si la partie du navigateur a changé depuis, elle a des changements pas envoyés */
  sentHash: string | null;
  error: string | null;
  /** inscription ou connexion en cours */
  busy: boolean;
  register: (pseudo: string, password: string) => Promise<boolean>;
  login: (pseudo: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  saveNow: () => Promise<boolean>;
  /** demandes d'ami et amitiés du joueur, avec le profil public de chaque autre joueur */
  friendships: Friendship[];
  friendProfiles: Record<string, PublicProfile>;
  friendsError: string | null;
  refreshFriends: () => Promise<void>;
  /** envoie une demande (ou accepte celle que ce joueur nous a déjà envoyée) ; renvoie un message à afficher */
  requestFriend: (pseudo: string) => Promise<{ ok: boolean; text: string }>;
  acceptFriend: (fromId: string) => Promise<void>;
  removeFriend: (fromId: string, toId: string) => Promise<void>;
}

/** dernière sauvegarde envoyée ou reprise (pour ne pas renvoyer la même) */
let lastSent: string | null = null;

/** Empreinte courte d'une sauvegarde (FNV-1a), gardée d'une session à l'autre. */
function hashOf(raw: string | null): string | null {
  if (raw === null) return null;
  let h = 0x811c9dc5;
  for (let i = 0; i < raw.length; i++) {
    h ^= raw.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return `${raw.length}:${(h >>> 0).toString(36)}`;
}

/** Nombre d'actions du joueur enregistré dans une sauvegarde (voir `actions` dans store/game.ts). */
function actionsOf(raw: string | null): number {
  try {
    return (JSON.parse(raw ?? 'null') as { state?: { actions?: number } } | null)?.state?.actions ?? 0;
  } catch {
    return 0;
  }
}

/** actions du joueur dans la dernière partie envoyée ou reprise, et heure du dernier envoi */
let sentActions: number | null = null;
let sentAt = 0;
/**
 * Sans action du joueur, seul le temps a changé la partie (marché, boosters qui se rechargent) : on ne l'envoie qu'au
 * plus toutes les PASSIVE_EVERY. Un appareil resté ouvert dans un coin n'écrase plus sans cesse la sauvegarde de celui
 * sur lequel on joue.
 */
const PASSIVE_EVERY = 120_000;

/** Retient la partie envoyée ou reprise : en mémoire, et son empreinte dans le navigateur. */
function markSent(raw: string | null): void {
  lastSent = raw;
  sentActions = raw === null ? null : actionsOf(raw);
  useAccount.setState({ sentHash: hashOf(raw) });
}
let timer: number | undefined;
/** une seule synchronisation à la fois (vérification, reprise ou envoi) */
let syncing: Promise<unknown> = Promise.resolve();
const serial = <T>(task: () => Promise<T>): Promise<T> => {
  const run = syncing.then(task, task);
  syncing = run.catch(() => undefined);
  return run;
};

const sameStamp = (a: string, b: string) => Date.parse(a) === Date.parse(b);

/**
 * Progression d'une sauvegarde : actions du joueur (toutes celles qui changent la partie : expédition, récolte,
 * vente…), boosters ouverts, duels joués, cartes vendues ou achetées, cartes possédées, objectifs récupérés, et la
 * réserve (enclos ouverts, places, animaux installés, visiteurs récoltés).
 */
function progressOf(raw: string | null): number {
  try {
    const saved = JSON.parse(raw ?? 'null') as {
      state?: {
        actions?: number;
        stats?: Record<string, number>;
        collection?: unknown[];
        claimed?: unknown[];
        reserve?: { enclos?: Record<string, { places?: number; uids?: unknown[] } | undefined>; visitors?: number };
      };
    } | null;
    const state = saved?.state;
    const stats = state?.stats ?? {};
    const enclos = Object.values(state?.reserve?.enclos ?? {});
    const reserve = enclos.reduce((sum, e) => sum + 1 + (e?.places ?? 0) + (e?.uids?.length ?? 0), 0) + Math.floor((state?.reserve?.visitors ?? 0) / 100);
    return (
      (state?.actions ?? 0) +
      (stats.packsOpened ?? 0) + (stats.matchesPlayed ?? 0) + (stats.cardsSold ?? 0) + (stats.cardsBought ?? 0) + (state?.collection?.length ?? 0) + (state?.claimed?.length ?? 0) + reserve
    );
  } catch {
    return 0;
  }
}

/**
 * Regarde si un autre appareil a changé la sauvegarde du compte depuis notre dernière synchronisation ; si oui,
 * reprend sa partie, sauf si la nôtre a plus de progression (elle sera alors envoyée). Renvoie 'adopted' si la partie
 * a été reprise du compte, 'kept' si on garde la nôtre, 'busy' si le joueur a agi pendant la vérification (rien n'est
 * décidé : la prochaine sauvegarde refera la comparaison).
 */
async function reconcile(session: Session): Promise<'adopted' | 'kept' | 'busy'> {
  const stamp = await loadSaveStamp(session);
  if (!stamp) return 'kept';
  const synced = useAccount.getState().syncedAt;
  if (synced && sameStamp(stamp, synced)) return 'kept';
  const actionsBefore = useGame.getState().actions;
  const remote = await loadSave(session);
  if (!remote) return 'kept';
  // le joueur a agi pendant qu'on interrogeait le serveur (retour dans l'appli, puis une action tout de suite) : on ne
  // touche pas à sa partie, son action serait perdue
  if (useGame.getState().actions !== actionsBefore) return 'busy';
  const localRaw = readSave();
  const remoteRaw = JSON.stringify(remote.data);
  // la nôtre n'a rien de neuf depuis le dernier envoi : celle du compte est la plus récente, on la reprend ;
  // sinon (changements pas envoyés, ou on ne sait pas) on garde la nôtre seulement si elle a plus de progression
  const sentHash = useAccount.getState().sentHash;
  const unsent = localRaw !== null && (sentHash === null || hashOf(localRaw) !== sentHash);
  if (unsent && progressOf(localRaw) > progressOf(remoteRaw)) return 'kept';
  // on ne prévient le joueur que si l'autre appareil a vraiment joué (pas seulement laissé passer le temps)
  const played = actionsOf(remoteRaw) !== actionsOf(localRaw);
  await writeSave(remoteRaw);
  markSent(readSave());
  useAccount.setState({ syncedAt: remote.updatedAt, status: 'saved', lastSavedAt: Date.now(), error: null });
  if (played) useGame.getState().toast('info', 'Progression mise à jour : ta partie de ton autre appareil est reprise.');
  return 'adopted';
}

/** À l'ouverture du jeu et quand il revient au premier plan : reprend la partie d'un autre appareil s'il y en a une. */
function checkOtherDevices(): void {
  if (!useAccount.getState().session) return;
  void serial(async () => {
    const session = await freshSession();
    if (session) await reconcile(session);
  }).catch(() => undefined);
}

/** La session, avec un jeton encore valable au moins une minute (rafraîchi au besoin). */
export async function freshSession(): Promise<Session | null> {
  const session = useAccount.getState().session;
  if (!session) return null;
  if (session.expiresAt - Date.now() > 60_000) return session;
  try {
    const next = await refresh(session);
    useAccount.setState({ session: next });
    return next;
  } catch (error) {
    // jeton de rafraîchissement refusé (et pas une simple coupure réseau) : il faut se reconnecter,
    // la partie reste dans le navigateur
    if (error instanceof AccountError && !/joindre/.test(error.message)) useAccount.setState({ session: null, status: 'idle' });
    throw error;
  }
}

/** La réserve, telle que les amis la verront. */
function reserveView() {
  const { reserve, collection } = useGame.getState();
  const byUid = new Map(collection.map((c) => [c.uid, c]));
  return reserveSnapshot(reserve, (uid) => byUid.get(uid));
}

/** Les cartes de la vitrine, telles que les autres joueurs les verront. */
function favoriteFaces(): CardFace[] {
  const { favorites, collection } = useGame.getState();
  return favorites
    .map((uid) => collection.find((card) => card.uid === uid))
    .filter((card): card is NonNullable<typeof card> => !!card)
    .map(({ athleteId, variant }) => ({ athleteId, variant }));
}

function upload(keepalive = false): Promise<boolean> {
  // onglet caché ou fermé : envoi « keepalive », sans nouvelle vérification (elle n'aurait pas le temps de finir),
  // mais après celle qui serait en cours
  return serial(() => send(keepalive));
}

async function send(keepalive: boolean): Promise<boolean> {
  if (!readSave() || readSave() === lastSent) return true;
  // rien de neuf de la part du joueur : seulement le temps qui passe, envoyé de loin en loin
  if (!keepalive && sentActions !== null && actionsOf(readSave()) === sentActions && Date.now() - sentAt < PASSIVE_EVERY) return true;
  useAccount.setState({ status: 'saving' });
  try {
    const session = await freshSession();
    if (!session) {
      useAccount.setState({ status: 'idle' });
      return false;
    }
    // un autre appareil a sauvegardé entre-temps : on reprend sa partie au lieu de l'écraser
    if (!keepalive && (await reconcile(session)) !== 'kept') return true;
    const raw = readSave();
    if (!raw) return true;
    // keepalive (envoi qui survit à la fermeture de l'onglet) est limité à 64 Ko par le navigateur
    const stamp = await storeSave(session, JSON.parse(raw), keepalive && raw.length < 60_000);
    markSent(raw);
    sentAt = Date.now();
    useAccount.setState({ status: 'saved', lastSavedAt: Date.now(), syncedAt: stamp, error: null });
    return true;
  } catch (error) {
    useAccount.setState({ status: 'error', error: error instanceof Error ? error.message : 'Sauvegarde impossible.' });
    return false;
  }
}

/** Après la connexion : reprend la partie du compte, ou y envoie celle du navigateur si le compte est neuf. */
async function adopt(session: Session, fresh: boolean): Promise<void> {
  useAccount.setState({ session, error: null });
  if (!fresh) {
    const remote = await loadSave(session);
    if (remote) {
      await writeSave(JSON.stringify(remote.data));
      markSent(readSave());
      useAccount.setState({ status: 'saved', lastSavedAt: Date.parse(remote.updatedAt) || Date.now(), syncedAt: remote.updatedAt });
      useGame.getState().toast('success', `Bon retour ${session.pseudo} ! Ta progression est rechargée.`);
      await storeProfile(session, favoriteFaces(), useGame.getState().avatar, reserveView()).catch(() => undefined);
      void useAccount.getState().refreshFriends();
      return;
    }
  }
  markSent(null);
  useAccount.setState({ syncedAt: null });
  await upload();
  await storeProfile(session, favoriteFaces(), useGame.getState().avatar, reserveView()).catch(() => undefined);
  void useAccount.getState().refreshFriends();
  useGame.getState().toast('gold', fresh ? `Compte créé : bienvenue ${session.pseudo} ! Ta progression est sauvegardée.` : `Connecté : ta progression est sauvegardée dans ton compte.`);
}

export const useAccount = create<AccountState>()(
  persist(
    (set, get) => ({
      session: null,
      status: 'idle',
      lastSavedAt: null,
      syncedAt: null,
      sentHash: null,
      error: null,
      busy: false,

      register: async (pseudo, password) => {
        set({ busy: true, error: null });
        try {
          const session = await signUp(pseudo, password);
          await adopt(session, true);
          return true;
        } catch (error) {
          set({ error: error instanceof Error ? error.message : 'Création du compte impossible.' });
          return false;
        } finally {
          set({ busy: false });
        }
      },

      login: async (pseudo, password) => {
        set({ busy: true, error: null });
        try {
          const session = await signIn(pseudo, password);
          await adopt(session, false);
          return true;
        } catch (error) {
          set({ error: error instanceof Error ? error.message : 'Connexion impossible.' });
          return false;
        } finally {
          set({ busy: false });
        }
      },

      logout: async () => {
        const session = get().session;
        if (!session) return;
        set({ busy: true });
        // dernière sauvegarde avant de partir : si elle échoue, la partie reste dans ce navigateur
        const saved = await upload();
        await signOut(session);
        markSent(null);
        set({ session: null, status: 'idle', lastSavedAt: null, syncedAt: null, error: null, busy: false, friendships: [], friendProfiles: {}, friendsError: null });
        if (saved) {
          // la progression part avec le compte : le navigateur repart d'une partie neuve
          useGame.getState().resetGame();
          useGame.getState().toast('info', 'Déconnecté. Ta progression t’attend dans ton compte.');
        } else {
          useGame.getState().toast('warn', 'Déconnecté, mais la dernière sauvegarde n’a pas pu partir : ta partie reste dans ce navigateur.');
        }
      },

      friendships: [],
      friendProfiles: {},
      friendsError: null,

      refreshFriends: async () => {
        try {
          const session = await freshSession();
          if (!session) return;
          const friendships = await listFriendships(session);
          const others = [...new Set(friendships.map((f) => (f.fromId === session.userId ? f.toId : f.fromId)))];
          const profiles = await profilesByIds(others);
          set({ friendships, friendProfiles: Object.fromEntries(profiles.map((p) => [p.id, p])), friendsError: null });
        } catch (error) {
          set({ friendsError: error instanceof Error ? error.message : 'Amis indisponibles pour le moment.' });
        }
      },

      requestFriend: async (pseudo) => {
        try {
          const session = await freshSession();
          if (!session) return { ok: false, text: 'Connecte-toi pour ajouter des amis.' };
          const profile = await findProfile(pseudo);
          if (!profile) return { ok: false, text: 'Aucun joueur ne porte ce pseudo.' };
          if (profile.id === session.userId) return { ok: false, text: 'C’est ton propre pseudo !' };
          const existing = get().friendships.find((f) => (f.fromId === profile.id && f.toId === session.userId) || (f.toId === profile.id && f.fromId === session.userId));
          if (existing?.status === 'accepted') return { ok: false, text: `${profile.pseudo} est déjà ton ami.` };
          if (existing && existing.fromId === session.userId) return { ok: false, text: `Ta demande à ${profile.pseudo} attend sa réponse.` };
          if (existing) {
            // il nous avait déjà demandé : on accepte
            await acceptFriendRequest(session, profile.id);
            await get().refreshFriends();
            return { ok: true, text: `${profile.pseudo} et toi êtes maintenant amis !` };
          }
          await sendFriendRequest(session, profile.id);
          await get().refreshFriends();
          return { ok: true, text: `Demande envoyée à ${profile.pseudo}. Vous serez amis dès que ta demande sera acceptée.` };
        } catch (error) {
          return { ok: false, text: error instanceof Error ? error.message : 'Demande impossible.' };
        }
      },

      acceptFriend: async (fromId) => {
        const session = await freshSession().catch(() => null);
        if (!session) return;
        await acceptFriendRequest(session, fromId).catch((e) => set({ friendsError: e instanceof Error ? e.message : 'Impossible d’accepter.' }));
        await get().refreshFriends();
      },

      removeFriend: async (fromId, toId) => {
        const session = await freshSession().catch(() => null);
        if (!session) return;
        await deleteFriendship(session, fromId, toId).catch((e) => set({ friendsError: e instanceof Error ? e.message : 'Impossible de retirer.' }));
        await get().refreshFriends();
      },

      saveNow: async () => {
        const ok = await upload();
        const session = get().session;
        if (ok && session) await storeProfile(session, favoriteFaces(), useGame.getState().avatar, reserveView()).catch(() => undefined);
        return ok;
      },
    }),
    {
      name: 'animalcards-compte',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ session: state.session, lastSavedAt: state.lastSavedAt, syncedAt: state.syncedAt, sentHash: state.sentHash }),
    },
  ),
);

/** Lance la sauvegarde automatique (une fois, au démarrage du jeu). */
export function startAutoSave(): void {
  if (!accountsEnabled() || typeof window === 'undefined') return;
  // au démarrage, la partie du navigateur est celle de la dernière session. Si elle a été envoyée (même empreinte),
  // rien à renvoyer ; sinon (fermée avant l'envoi) elle part dès que possible. Un autre appareil a peut-être joué depuis.
  const local = readSave();
  const sent = useAccount.getState().sentHash !== null && hashOf(local) === useAccount.getState().sentHash;
  lastSent = sent ? local : null;
  sentActions = sent ? actionsOf(local) : null;
  checkOtherDevices();
  if (!sent && useAccount.getState().session) void upload();
  useGame.subscribe(() => {
    if (!useAccount.getState().session || timer !== undefined) return;
    timer = window.setTimeout(() => {
      timer = undefined;
      void upload();
    }, SAVE_EVERY);
  });
  // la vitrine, la photo de profil et la réserve sont publiques : elles sont envoyées dès qu'elles changent (la
  // réserve, quelques secondes après le dernier changement, et seulement si ce que voient les amis a changé)
  let favorites = useGame.getState().favorites;
  let avatar = useGame.getState().avatar;
  let reserve = useGame.getState().reserve;
  let reserveSent = JSON.stringify(reserveView());
  let reserveTimer: number | undefined;
  const sendProfile = () => {
    const session = useAccount.getState().session;
    if (session) void freshSession().then((s) => s && storeProfile(s, favoriteFaces(), useGame.getState().avatar, reserveView())).catch(() => undefined);
  };
  useGame.subscribe((state) => {
    if (state.reserve !== reserve) {
      reserve = state.reserve;
      window.clearTimeout(reserveTimer);
      reserveTimer = window.setTimeout(() => {
        const view = JSON.stringify(reserveView());
        if (view === reserveSent) return;
        reserveSent = view;
        sendProfile();
      }, SAVE_EVERY);
    }
    if (state.favorites === favorites && state.avatar === avatar) return;
    favorites = state.favorites;
    avatar = state.avatar;
    sendProfile();
  });
  const flush = () => {
    if (!useAccount.getState().session) return;
    window.clearTimeout(timer);
    timer = undefined;
    void upload(true);
  };
  // fermeture de l'appli ou de l'onglet (plus fiable que visibilitychange sur iPhone)
  window.addEventListener('pagehide', flush);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flush();
    else if (useAccount.getState().session) {
      checkOtherDevices();
      void useAccount.getState().refreshFriends();
    }
  });
  // les demandes d'ami reçues arrivent toutes seules (pastille sur le bouton Profil)
  const pollFriends = () => {
    if (useAccount.getState().session && document.visibilityState === 'visible') void useAccount.getState().refreshFriends();
  };
  pollFriends();
  window.setInterval(pollFriends, 90_000);
  window.addEventListener('pagehide', flush);
}
