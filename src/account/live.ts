import type { CardFace } from '../engine/types';
import { RECORDS, type RecordId } from '../engine/duel';
import { currentFace } from '../engine/cards';
import { call, type Session } from './supabase';

// Duels en direct entre amis (tables live_duels et live_duel_picks, fonctions live_duel_* de supabase/schema.sql).
// Celui qui défie (a) envoie son équipe et les 5 questions ; son ami (b) accepte avec son équipe. À chaque manche,
// chacun choisit un animal : le serveur ne montre le choix de l'autre qu'une fois les deux joués.

export type LiveStatus = 'pending' | 'active' | 'done' | 'declined' | 'cancelled';

export interface LivePick {
  round: number;
  /** carte jouée par a, par b (index dans leur équipe) */
  a: number;
  b: number;
}

export interface LiveDuel {
  id: string;
  aId: string;
  a: string;
  bId: string;
  b: string;
  status: LiveStatus;
  records: RecordId[];
  aTeam: CardFace[];
  bTeam: CardFace[] | null;
  /** manche en cours (0 à 4 ; 5 quand le duel est fini) */
  round: number;
  /** joueur déclaré forfait */
  forfeit: string | null;
  aSeen: number;
  bSeen: number | null;
  createdAt: number;
  updatedAt: number;
  /** manches jouées */
  picks: LivePick[];
  /** mon choix pour la manche en cours, en attendant celui de l'autre */
  mine: number | null;
}

/** Une invitation n'attend que 5 minutes (le serveur refuse ensuite de l'accepter). */
export const INVITE_TTL = 5 * 60_000;

interface Row {
  id: string;
  a_id: string;
  a_pseudo: string;
  b_id: string;
  b_pseudo: string;
  status: LiveStatus;
  records: string[];
  a_team: CardFace[];
  b_team: CardFace[] | null;
  round: number;
  forfeit: string | null;
  a_seen: string;
  b_seen: string | null;
  created_at: string;
  updated_at: string;
  picks?: LivePick[];
  mine?: number | null;
}

const face = (c: CardFace): CardFace => currentFace({ athleteId: c.athleteId, variant: c.variant });
// une question retirée du jeu depuis le défi est remplacée par le poids (toujours connu)
const record = (id: string): RecordId => (id in RECORDS ? (id as RecordId) : 'lourd');

const toLive = (r: Row): LiveDuel => ({
  id: r.id,
  aId: r.a_id,
  a: r.a_pseudo,
  bId: r.b_id,
  b: r.b_pseudo,
  status: r.status,
  records: (r.records ?? []).map(record),
  aTeam: (r.a_team ?? []).map(face),
  bTeam: r.b_team ? r.b_team.map(face) : null,
  round: r.round,
  forfeit: r.forfeit,
  aSeen: Date.parse(r.a_seen),
  bSeen: r.b_seen ? Date.parse(r.b_seen) : null,
  createdAt: Date.parse(r.created_at),
  updatedAt: Date.parse(r.updated_at),
  picks: r.picks ?? [],
  mine: r.mine ?? null,
});

/** Mes duels en direct en attente ou en cours (sans les choix des manches : voir viewLive). */
export async function fetchLiveDuels(session: Session): Promise<LiveDuel[]> {
  const me = session.userId;
  const rows = await call<Row[]>(
    `/rest/v1/live_duels?select=*&status=in.(pending,active)&or=(a_id.eq.${me},b_id.eq.${me})&order=created_at.desc&limit=10`,
    { token: session.accessToken },
  );
  return rows.map(toLive);
}

const rpc = async (session: Session, name: string, body: Record<string, unknown>) =>
  call<Row | null>(`/rest/v1/rpc/${name}`, { method: 'POST', token: session.accessToken, body });

const team = (cards: CardFace[]) => cards.map((c) => ({ athleteId: c.athleteId, variant: c.variant }));

export async function viewLive(session: Session, id: string): Promise<LiveDuel> {
  return toLive((await rpc(session, 'live_duel_view', { p_id: id }))!);
}

export async function challengeLive(session: Session, toId: string, cards: CardFace[], records: RecordId[]): Promise<LiveDuel> {
  return toLive((await rpc(session, 'live_duel_challenge', { p_to: toId, p_team: team(cards), p_records: records }))!);
}

export async function acceptLive(session: Session, id: string, cards: CardFace[]): Promise<LiveDuel> {
  return toLive((await rpc(session, 'live_duel_accept', { p_id: id, p_team: team(cards) }))!);
}

/** Refuser une invitation, ou annuler son propre défi. */
export async function declineLive(session: Session, id: string): Promise<void> {
  await rpc(session, 'live_duel_decline', { p_id: id });
}

export async function pickLive(session: Session, id: string, round: number, card: number): Promise<LiveDuel> {
  return toLive((await rpc(session, 'live_duel_pick', { p_id: id, p_round: round, p_card: card }))!);
}

export async function forfeitLive(session: Session, id: string): Promise<LiveDuel> {
  return toLive((await rpc(session, 'live_duel_forfeit', { p_id: id }))!);
}
