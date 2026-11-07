import { call, type Session } from './supabase';

// Ma Réserve entre amis (table reserve_gifts et fonctions reserve_gift* de supabase/schema.sql) : chaque joueur peut
// envoyer des visiteurs dans la réserve de chacun de ses amis, une fois par jour ; l'ami les reçoit à sa billetterie.

/** Le jour d'aujourd'hui à l'heure de Paris (celui du serveur), en AAAA-MM-JJ. */
export function parisDay(now: number = Date.now()): string {
  return new Date(now).toLocaleDateString('en-CA', { timeZone: 'Europe/Paris' });
}

/** Envoie des visiteurs à un ami ; renvoie leur nombre. */
export async function giftVisitors(session: Session, toId: string): Promise<number> {
  return call<number>('/rest/v1/rpc/reserve_gift', { method: 'POST', token: session.accessToken, body: { p_to: toId } });
}

/** Les amis à qui j'ai déjà envoyé des visiteurs aujourd'hui. */
export async function giftedToday(session: Session): Promise<Set<string>> {
  const rows = await call<{ to_id: string }[]>(`/rest/v1/reserve_gifts?select=to_id&from_id=eq.${session.userId}&day=eq.${parisDay()}`, {
    token: session.accessToken,
  });
  return new Set(rows.map((r) => r.to_id));
}

/** Reçoit les visiteurs envoyés par mes amis (chaque cadeau une seule fois). */
export async function claimGifts(session: Session): Promise<{ giver: string; amount: number }[]> {
  return call<{ giver: string; amount: number }[]>('/rest/v1/rpc/reserve_gifts_claim', { method: 'POST', token: session.accessToken, body: {} });
}
