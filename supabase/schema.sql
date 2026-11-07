-- AnimalCards : comptes des joueurs et sauvegardes. À coller dans Supabase → SQL Editor → New query → Run.

-- Profil public de chaque joueur : son pseudo et ses 5 cartes préférées.
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  pseudo text not null check (pseudo ~ '^[A-Za-z0-9_-]{3,20}$'),
  favorites jsonb not null default '[]'::jsonb,
  -- photo de profil : identifiant de l'espèce choisie
  avatar text,
  updated_at timestamptz not null default now()
);
create unique index if not exists profiles_pseudo_unique on public.profiles (lower(pseudo));

-- Sauvegarde privée de la partie : toute la progression du joueur.
create table if not exists public.saves (
  user_id uuid primary key references auth.users (id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.saves enable row level security;

drop policy if exists "Profils visibles par tous" on public.profiles;
create policy "Profils visibles par tous" on public.profiles for select using (true);
drop policy if exists "Chacun crée son profil" on public.profiles;
create policy "Chacun crée son profil" on public.profiles for insert with check ((select auth.uid()) = id);
drop policy if exists "Chacun modifie son profil" on public.profiles;
create policy "Chacun modifie son profil" on public.profiles for update using ((select auth.uid()) = id);

drop policy if exists "Chacun lit sa sauvegarde" on public.saves;
create policy "Chacun lit sa sauvegarde" on public.saves for select using ((select auth.uid()) = user_id);
drop policy if exists "Chacun crée sa sauvegarde" on public.saves;
create policy "Chacun crée sa sauvegarde" on public.saves for insert with check ((select auth.uid()) = user_id);
drop policy if exists "Chacun modifie sa sauvegarde" on public.saves;
create policy "Chacun modifie sa sauvegarde" on public.saves for update using ((select auth.uid()) = user_id);

grant select on public.profiles to anon, authenticated;
grant insert, update on public.profiles to authenticated;
grant select, insert, update on public.saves to authenticated;

-- Mise à jour pour une base créée avant la photo de profil :
alter table public.profiles add column if not exists avatar text;

-- Amis : une demande (pending) envoyée par from_id à to_id, qui devient une amitié (accepted) quand to_id l'accepte.
create table if not exists public.friendships (
  from_id uuid not null references auth.users (id) on delete cascade,
  to_id uuid not null references auth.users (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  primary key (from_id, to_id),
  check (from_id <> to_id)
);
alter table public.friendships enable row level security;
drop policy if exists "Voir ses demandes et ses amis" on public.friendships;
create policy "Voir ses demandes et ses amis" on public.friendships for select using ((select auth.uid()) in (from_id, to_id));
drop policy if exists "Envoyer une demande" on public.friendships;
create policy "Envoyer une demande" on public.friendships for insert with check ((select auth.uid()) = from_id and status = 'pending');
drop policy if exists "Accepter une demande reçue" on public.friendships;
create policy "Accepter une demande reçue" on public.friendships for update using ((select auth.uid()) = to_id) with check ((select auth.uid()) = to_id and status = 'accepted');
drop policy if exists "Retirer un ami ou une demande" on public.friendships;
create policy "Retirer un ami ou une demande" on public.friendships for delete using ((select auth.uid()) in (from_id, to_id));
grant select, insert, update, delete on public.friendships to authenticated;

-- ───────────── Marché en ligne entre joueurs ─────────────
-- Une annonce = une carte mise en vente à prix fixe par un joueur. Toutes les écritures passent par les fonctions
-- ci-dessous (security definer) : une carte ne peut être achetée qu'une seule fois, jamais par son vendeur,
-- et seul le vendeur peut la retirer. Les joueurs ne peuvent pas modifier les lignes directement.
create table if not exists public.market_listings (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references auth.users (id) on delete cascade,
  seller_pseudo text not null,
  card jsonb not null,
  price bigint not null check (price between 10 and 100000000),
  status text not null default 'active' check (status in ('active', 'sold', 'cancelled')),
  buyer_id uuid references auth.users (id) on delete set null,
  buyer_pseudo text,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  sold_at timestamptz,
  -- la carte a été livrée à l'acheteur / les graines versées au vendeur / la carte rendue au vendeur
  buyer_done boolean not null default false,
  seller_done boolean not null default false
);
create index if not exists market_active on public.market_listings (status, expires_at);
create index if not exists market_seller on public.market_listings (seller_id);
create index if not exists market_buyer on public.market_listings (buyer_id);

alter table public.market_listings enable row level security;
drop policy if exists "Annonces visibles" on public.market_listings;
create policy "Annonces visibles" on public.market_listings for select
  using (status = 'active' or (select auth.uid()) in (seller_id, buyer_id));
grant select on public.market_listings to anon, authenticated;

-- Mettre une carte en vente (15 annonces actives au plus par joueur).
create or replace function public.market_list(p_card jsonb, p_price bigint, p_hours int)
returns public.market_listings language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  v_name text;
  r public.market_listings;
begin
  if me is null then raise exception 'non connecté'; end if;
  if p_hours not in (1, 6, 24, 72) then raise exception 'durée invalide'; end if;
  if jsonb_typeof(p_card -> 'athleteId') <> 'string' or coalesce(p_card ->> 'variant', '') not in ('base', 'reverse', 'prime') then
    raise exception 'carte invalide';
  end if;
  select pseudo into v_name from profiles where id = me;
  if v_name is null then raise exception 'profil manquant'; end if;
  if (select count(*) from market_listings where seller_id = me and status = 'active') >= 15 then
    raise exception 'trop d''annonces';
  end if;
  insert into market_listings (seller_id, seller_pseudo, card, price, expires_at)
  values (me, v_name, jsonb_build_object('athleteId', p_card ->> 'athleteId', 'variant', p_card ->> 'variant'), p_price, now() + make_interval(hours => p_hours))
  returning * into r;
  return r;
end $$;

-- Acheter : réussit pour un seul acheteur, et jamais sa propre carte ni une annonce expirée.
create or replace function public.market_buy(p_id uuid)
returns public.market_listings language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  v_name text;
  r public.market_listings;
begin
  if me is null then raise exception 'non connecté'; end if;
  select pseudo into v_name from profiles where id = me;
  update market_listings
     set status = 'sold', buyer_id = me, buyer_pseudo = coalesce(v_name, 'Un joueur'), sold_at = now()
   where id = p_id and status = 'active' and expires_at > now() and seller_id <> me
  returning * into r;
  if r.id is null then raise exception 'indisponible'; end if;
  return r;
end $$;

-- Retirer son annonce (ou récupérer une annonce expirée).
create or replace function public.market_cancel(p_id uuid)
returns public.market_listings language plpgsql security definer set search_path = public as $$
declare
  r public.market_listings;
begin
  update market_listings set status = 'cancelled'
   where id = p_id and status = 'active' and seller_id = auth.uid()
  returning * into r;
  if r.id is null then raise exception 'indisponible'; end if;
  return r;
end $$;

-- Confirmer que la carte (acheteur) ou les graines / la carte rendue (vendeur) sont arrivées dans la partie.
create or replace function public.market_done(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update market_listings set buyer_done = true where id = p_id and buyer_id = auth.uid();
  update market_listings set seller_done = true where id = p_id and seller_id = auth.uid() and status <> 'active';
end $$;

revoke all on function public.market_list(jsonb, bigint, int) from public, anon;
revoke all on function public.market_buy(uuid) from public, anon;
revoke all on function public.market_cancel(uuid) from public, anon;
revoke all on function public.market_done(uuid) from public, anon;
grant execute on function public.market_list(jsonb, bigint, int) to authenticated;
grant execute on function public.market_buy(uuid) to authenticated;
grant execute on function public.market_cancel(uuid) to authenticated;
grant execute on function public.market_done(uuid) to authenticated;

-- l'API de Supabase relit la base pour voir la nouvelle table et les nouvelles fonctions
notify pgrst, 'reload schema';

-- ───────────── Échanges de cartes entre amis ─────────────
-- from_id propose sa carte « offer » à son ami to_id contre une espèce « want » (même rareté, vérifiée par le jeu).
-- to_id accepte en donnant un exemplaire (« given »), ou refuse ; from_id peut annuler tant que c'est en attente.
-- Chaque joueur règle l'échange dans sa partie puis le confirme (trade_done) pour ne jamais recevoir deux fois.
create table if not exists public.trades (
  id uuid primary key default gen_random_uuid(),
  from_id uuid not null references auth.users (id) on delete cascade,
  from_pseudo text not null,
  to_id uuid not null references auth.users (id) on delete cascade,
  to_pseudo text not null,
  offer jsonb not null,
  want jsonb not null,
  given jsonb,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  from_done boolean not null default false,
  to_done boolean not null default false,
  check (from_id <> to_id)
);
create index if not exists trades_from on public.trades (from_id);
create index if not exists trades_to on public.trades (to_id);

alter table public.trades enable row level security;
drop policy if exists "Voir ses échanges" on public.trades;
create policy "Voir ses échanges" on public.trades for select using ((select auth.uid()) in (from_id, to_id));
grant select on public.trades to authenticated;

create or replace function public.valid_card(c jsonb) returns boolean language sql immutable as $$
  select jsonb_typeof(c -> 'athleteId') = 'string' and coalesce(c ->> 'variant', '') in ('base', 'reverse', 'prime')
$$;

-- Proposer un échange à un ami (10 propositions en attente au plus).
create or replace function public.trade_propose(p_to uuid, p_offer jsonb, p_want jsonb)
returns public.trades language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  my_name text;
  their_name text;
  r public.trades;
begin
  if me is null then raise exception 'non connecté'; end if;
  if not valid_card(p_offer) or jsonb_typeof(p_want -> 'athleteId') <> 'string' then raise exception 'carte invalide'; end if;
  if not exists (
    select 1 from friendships
     where status = 'accepted' and ((from_id = me and to_id = p_to) or (from_id = p_to and to_id = me))
  ) then raise exception 'pas ami'; end if;
  if (select count(*) from trades where from_id = me and status = 'pending') >= 10 then raise exception 'trop d''échanges'; end if;
  select pseudo into my_name from profiles where id = me;
  select pseudo into their_name from profiles where id = p_to;
  insert into trades (from_id, from_pseudo, to_id, to_pseudo, offer, want)
  values (
    me, coalesce(my_name, 'Un joueur'), p_to, coalesce(their_name, 'Un joueur'),
    jsonb_build_object('athleteId', p_offer ->> 'athleteId', 'variant', p_offer ->> 'variant'),
    jsonb_build_object('athleteId', p_want ->> 'athleteId')
  )
  returning * into r;
  return r;
end $$;

-- Accepter (en donnant un exemplaire de l'espèce demandée), refuser ou annuler.
create or replace function public.trade_accept(p_id uuid, p_given jsonb)
returns public.trades language plpgsql security definer set search_path = public as $$
declare
  r public.trades;
begin
  if not valid_card(p_given) then raise exception 'carte invalide'; end if;
  update trades set status = 'accepted', given = jsonb_build_object('athleteId', p_given ->> 'athleteId', 'variant', p_given ->> 'variant'), updated_at = now()
   where id = p_id and to_id = auth.uid() and status = 'pending' and want ->> 'athleteId' = p_given ->> 'athleteId'
  returning * into r;
  if r.id is null then raise exception 'indisponible'; end if;
  return r;
end $$;

create or replace function public.trade_decline(p_id uuid)
returns public.trades language plpgsql security definer set search_path = public as $$
declare
  r public.trades;
begin
  update trades set status = 'declined', updated_at = now(), to_done = true
   where id = p_id and to_id = auth.uid() and status = 'pending'
  returning * into r;
  if r.id is null then raise exception 'indisponible'; end if;
  return r;
end $$;

create or replace function public.trade_cancel(p_id uuid)
returns public.trades language plpgsql security definer set search_path = public as $$
declare
  r public.trades;
begin
  update trades set status = 'cancelled', updated_at = now(), to_done = true
   where id = p_id and from_id = auth.uid() and status = 'pending'
  returning * into r;
  if r.id is null then raise exception 'indisponible'; end if;
  return r;
end $$;

create or replace function public.trade_done(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update trades set from_done = true where id = p_id and from_id = auth.uid() and status <> 'pending';
  update trades set to_done = true where id = p_id and to_id = auth.uid() and status = 'accepted';
end $$;

revoke all on function public.trade_propose(uuid, jsonb, jsonb) from public, anon;
revoke all on function public.trade_accept(uuid, jsonb) from public, anon;
revoke all on function public.trade_decline(uuid) from public, anon;
revoke all on function public.trade_cancel(uuid) from public, anon;
revoke all on function public.trade_done(uuid) from public, anon;
grant execute on function public.trade_propose(uuid, jsonb, jsonb) to authenticated;
grant execute on function public.trade_accept(uuid, jsonb) to authenticated;
grant execute on function public.trade_decline(uuid) to authenticated;
grant execute on function public.trade_cancel(uuid) to authenticated;
grant execute on function public.trade_done(uuid) to authenticated;

-- ───────────── Duels en direct entre amis ─────────────
-- a_id défie son ami b_id avec son équipe de 5 et les 5 questions du duel (tirées par le jeu). b_id accepte avec
-- son équipe (dans les 5 minutes), ou refuse ; a_id peut annuler tant que c'est en attente. Puis, à chaque manche,
-- chacun choisit un de ses animaux : les choix sont gardés à part (live_duel_picks, illisible directement) et ne sont
-- dévoilés qu'une fois les deux joués. Chaque joueur lit le duel avec live_duel_view, qui note aussi qu'il est là :
-- un joueur absent depuis plus d'une minute peut être déclaré forfait par l'autre.
create table if not exists public.live_duels (
  id uuid primary key default gen_random_uuid(),
  a_id uuid not null references auth.users (id) on delete cascade,
  a_pseudo text not null,
  b_id uuid not null references auth.users (id) on delete cascade,
  b_pseudo text not null,
  status text not null default 'pending' check (status in ('pending', 'active', 'done', 'declined', 'cancelled')),
  records jsonb not null,
  a_team jsonb not null,
  b_team jsonb,
  round int not null default 0,
  forfeit uuid,
  a_seen timestamptz not null default now(),
  b_seen timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (a_id <> b_id)
);
create index if not exists live_duels_a on public.live_duels (a_id, status);
create index if not exists live_duels_b on public.live_duels (b_id, status);
alter table public.live_duels enable row level security;
drop policy if exists "Voir ses duels en direct" on public.live_duels;
create policy "Voir ses duels en direct" on public.live_duels for select using ((select auth.uid()) in (a_id, b_id));
grant select on public.live_duels to authenticated;

create table if not exists public.live_duel_picks (
  duel_id uuid not null references public.live_duels (id) on delete cascade,
  round int not null,
  player uuid not null,
  card int not null check (card between 0 and 4),
  primary key (duel_id, round, player)
);
alter table public.live_duel_picks enable row level security;
revoke all on public.live_duel_picks from anon, authenticated;

create or replace function public.valid_team(t jsonb) returns boolean language sql immutable as $$
  select jsonb_typeof(t) = 'array' and jsonb_array_length(t) = 5 and not exists (select 1 from jsonb_array_elements(t) c where not valid_card(c))
$$;

-- Le duel vu par un joueur : la ligne, les manches jouées (les deux choix) et son propre choix de la manche en cours.
create or replace function public.live_duel_view(p_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  d public.live_duels;
begin
  update live_duels set a_seen = case when a_id = me then now() else a_seen end,
                        b_seen = case when b_id = me and status <> 'pending' then now() else b_seen end
   where id = p_id and me in (a_id, b_id)
  returning * into d;
  if d.id is null then raise exception 'indisponible'; end if;
  return to_jsonb(d) || jsonb_build_object(
    'picks', coalesce((
      select jsonb_agg(jsonb_build_object('round', pa.round, 'a', pa.card, 'b', pb.card) order by pa.round)
        from live_duel_picks pa join live_duel_picks pb on pb.duel_id = pa.duel_id and pb.round = pa.round and pb.player = d.b_id
       where pa.duel_id = d.id and pa.player = d.a_id and pa.round < d.round
    ), '[]'::jsonb),
    'mine', (select card from live_duel_picks where duel_id = d.id and round = d.round and player = me)
  );
end $$;

-- Défier un ami (un seul défi en attente à la fois : le précédent est annulé).
create or replace function public.live_duel_challenge(p_to uuid, p_team jsonb, p_records jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  my_name text;
  their_name text;
  new_id uuid;
begin
  if me is null then raise exception 'non connecté'; end if;
  if not valid_team(p_team) then raise exception 'équipe invalide'; end if;
  if jsonb_typeof(p_records) <> 'array' or jsonb_array_length(p_records) <> 5 then raise exception 'questions invalides'; end if;
  if not exists (
    select 1 from friendships
     where status = 'accepted' and ((from_id = me and to_id = p_to) or (from_id = p_to and to_id = me))
  ) then raise exception 'pas ami'; end if;
  update live_duels set status = 'cancelled', updated_at = now() where a_id = me and status = 'pending';
  select pseudo into my_name from profiles where id = me;
  select pseudo into their_name from profiles where id = p_to;
  insert into live_duels (a_id, a_pseudo, b_id, b_pseudo, records, a_team)
  values (me, coalesce(my_name, 'Un joueur'), p_to, coalesce(their_name, 'Un joueur'), p_records,
          (select jsonb_agg(jsonb_build_object('athleteId', c ->> 'athleteId', 'variant', c ->> 'variant')) from jsonb_array_elements(p_team) c))
  returning id into new_id;
  return live_duel_view(new_id);
end $$;

create or replace function public.live_duel_accept(p_id uuid, p_team jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  found uuid;
begin
  if not valid_team(p_team) then raise exception 'équipe invalide'; end if;
  update live_duels
     set status = 'active', updated_at = now(), b_seen = now(),
         b_team = (select jsonb_agg(jsonb_build_object('athleteId', c ->> 'athleteId', 'variant', c ->> 'variant')) from jsonb_array_elements(p_team) c)
   where id = p_id and b_id = auth.uid() and status = 'pending' and created_at > now() - interval '5 minutes'
  returning id into found;
  if found is null then raise exception 'indisponible'; end if;
  return live_duel_view(found);
end $$;

-- Refuser (l'ami défié) ou annuler (celui qui défie), tant que c'est en attente.
create or replace function public.live_duel_decline(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update live_duels set status = case when a_id = auth.uid() then 'cancelled' else 'declined' end, updated_at = now()
   where id = p_id and auth.uid() in (a_id, b_id) and status = 'pending';
end $$;

-- Jouer un animal pour la manche en cours ; quand les deux ont joué, on passe à la manche suivante.
create or replace function public.live_duel_pick(p_id uuid, p_round int, p_card int)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  d public.live_duels;
begin
  select * into d from live_duels where id = p_id and me in (a_id, b_id) for update;
  if d.id is null or d.status <> 'active' then raise exception 'indisponible'; end if;
  if p_round <> d.round then raise exception 'manche terminée'; end if;
  if p_card < 0 or p_card > 4 or exists (select 1 from live_duel_picks where duel_id = d.id and player = me and card = p_card) then
    raise exception 'carte déjà jouée';
  end if;
  insert into live_duel_picks (duel_id, round, player, card) values (d.id, d.round, me, p_card) on conflict do nothing;
  if (select count(*) from live_duel_picks where duel_id = d.id and round = d.round) = 2 then
    update live_duels set round = round + 1, status = case when round + 1 >= 5 then 'done' else status end, updated_at = now()
     where id = d.id;
  end if;
  return live_duel_view(d.id);
end $$;

-- Quitter un duel en cours : on perd par forfait, sauf si l'autre ne répond plus depuis plus d'une minute (c'est lui
-- qui est forfait).
create or replace function public.live_duel_forfeit(p_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  d public.live_duels;
  other_seen timestamptz;
begin
  select * into d from live_duels where id = p_id and me in (a_id, b_id) for update;
  if d.id is null then raise exception 'indisponible'; end if;
  if d.status = 'active' then
    other_seen := case when d.a_id = me then d.b_seen else d.a_seen end;
    update live_duels
       set status = 'done', updated_at = now(),
           forfeit = case when other_seen < now() - interval '60 seconds' then (case when d.a_id = me then d.b_id else d.a_id end) else me end
     where id = d.id;
  end if;
  return live_duel_view(d.id);
end $$;

revoke all on function public.live_duel_view(uuid) from public, anon;
revoke all on function public.live_duel_challenge(uuid, jsonb, jsonb) from public, anon;
revoke all on function public.live_duel_accept(uuid, jsonb) from public, anon;
revoke all on function public.live_duel_decline(uuid) from public, anon;
revoke all on function public.live_duel_pick(uuid, int, int) from public, anon;
revoke all on function public.live_duel_forfeit(uuid) from public, anon;
grant execute on function public.live_duel_view(uuid) to authenticated;
grant execute on function public.live_duel_challenge(uuid, jsonb, jsonb) to authenticated;
grant execute on function public.live_duel_accept(uuid, jsonb) to authenticated;
grant execute on function public.live_duel_decline(uuid) to authenticated;
grant execute on function public.live_duel_pick(uuid, int, int) to authenticated;
grant execute on function public.live_duel_forfeit(uuid) to authenticated;

-- Joueurs en ligne : chaque navigateur ouvert sur le jeu (avec ou sans compte) envoie un signal toutes les minutes
-- avec un identifiant anonyme tiré au hasard, et un dernier signal quand il se ferme ou passe en arrière-plan.
-- On n'en garde que l'heure du dernier signal : ni pseudo, ni adresse, rien qui permette de savoir qui c'est.
create table if not exists public.presence (
  visitor uuid primary key,
  last_seen timestamptz not null default now(),
  online boolean not null default true
);
create index if not exists presence_last_seen on public.presence (last_seen);
alter table public.presence enable row level security;
-- aucune règle d'accès : la table ne se lit et ne s'écrit qu'à travers presence_ping
revoke all on public.presence from anon, authenticated;

-- Comptes administrateurs : les seuls à qui presence_ping renvoie les compteurs (personne d'autre ne les voit).
-- Pour s'y ajouter, dans l'éditeur SQL de Supabase (remplacer TON_PSEUDO par le pseudo du compte) :
--   insert into public.admins (user_id)
--   select id from auth.users where raw_user_meta_data->>'pseudo' = 'TON_PSEUDO'
--   on conflict do nothing;
create table if not exists public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade
);
alter table public.admins enable row level security;
-- aucune règle d'accès : la table ne se lit qu'à travers presence_ping
revoke all on public.admins from anon, authenticated;

-- Enregistre le signal d'un visiteur (en ligne, ou qui s'en va). Aux administrateurs seulement (connectés), renvoie
-- les compteurs (joueurs en ligne, du jour, et comptes créés) ; aux autres, des compteurs vides (null) :
-- « online » : les visiteurs dont le jeu est ouvert (signal reçu il y a moins de 2 min 30, sans départ depuis) ;
-- « today » : les visiteurs passés au moins une fois depuis minuit (heure de Paris).
create or replace function public.presence_ping(p_visitor uuid, p_online boolean default true)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  midnight timestamptz := date_trunc('day', now() at time zone 'Europe/Paris') at time zone 'Europe/Paris';
begin
  if p_visitor is not null then
    insert into presence (visitor, last_seen, online) values (p_visitor, now(), coalesce(p_online, true))
    on conflict (visitor) do update set last_seen = now(), online = excluded.online;
  end if;
  -- ménage : on oublie les visiteurs qui ne sont pas revenus depuis deux jours
  delete from presence where last_seen < now() - interval '2 days';
  if not exists (select 1 from admins where user_id = auth.uid()) then
    return jsonb_build_object('online', null, 'today', null);
  end if;
  return jsonb_build_object(
    'online', (select count(*) from presence where online and last_seen > now() - interval '150 seconds'),
    'today', (select count(*) from presence where last_seen >= midnight),
    -- comptes créés : en tout, depuis minuit (heure de Paris) et sur les 7 derniers jours
    'accounts', (select count(*) from auth.users),
    'accountsToday', (select count(*) from auth.users where created_at >= midnight),
    'accountsWeek', (select count(*) from auth.users where created_at >= now() - interval '7 days')
  );
end $$;

revoke all on function public.presence_ping(uuid, boolean) from public;
grant execute on function public.presence_ping(uuid, boolean) to anon, authenticated;

-- Ma Réserve entre amis : ce que les autres joueurs voient de la réserve d'un joueur (niveau, enclos ouverts, espèces
-- installées, décors), et les visiteurs que des amis s'envoient en cadeau, une fois par jour et par ami.
alter table public.profiles add column if not exists reserve jsonb;

create table if not exists public.reserve_gifts (
  from_id uuid not null references auth.users (id) on delete cascade,
  to_id uuid not null references auth.users (id) on delete cascade,
  -- jour du cadeau, à l'heure de Paris
  day date not null default ((now() at time zone 'Europe/Paris')::date),
  visitors int not null check (visitors between 1 and 1000),
  claimed boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (from_id, to_id, day)
);
alter table public.reserve_gifts enable row level security;
drop policy if exists "Voir ses cadeaux de visiteurs" on public.reserve_gifts;
create policy "Voir ses cadeaux de visiteurs" on public.reserve_gifts for select using ((select auth.uid()) in (from_id, to_id));
-- on ne les écrit qu'à travers reserve_gift et reserve_gifts_claim
revoke all on public.reserve_gifts from anon, authenticated;
grant select on public.reserve_gifts to authenticated;

-- Envoie des visiteurs dans la réserve d'un ami (une fois par jour et par ami) ; renvoie leur nombre.
create or replace function public.reserve_gift(p_to uuid)
returns int language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  n int := 150;
begin
  if me is null or p_to is null or p_to = me then raise exception 'Cadeau impossible.'; end if;
  if not exists (
    select 1 from friendships
    where status = 'accepted' and ((from_id = me and to_id = p_to) or (from_id = p_to and to_id = me))
  ) then
    raise exception 'Vous n''êtes pas amis.';
  end if;
  insert into reserve_gifts (from_id, to_id, visitors) values (me, p_to, n) on conflict do nothing;
  if not found then raise exception 'Tu lui as déjà envoyé des visiteurs aujourd''hui.'; end if;
  return n;
end $$;

-- Reçoit les visiteurs envoyés par les amis : chaque cadeau n'est reçu qu'une fois.
create or replace function public.reserve_gifts_claim()
returns table (giver text, amount int) language plpgsql security definer set search_path = public as $$
begin
  return query
  with got as (
    update reserve_gifts g set claimed = true
    where g.to_id = auth.uid() and not g.claimed
    returning g.from_id, g.visitors
  )
  select coalesce(p.pseudo, '?'), got.visitors from got left join profiles p on p.id = got.from_id;
end $$;

revoke all on function public.reserve_gift(uuid) from public;
revoke all on function public.reserve_gifts_claim() from public;
grant execute on function public.reserve_gift(uuid) to authenticated;
grant execute on function public.reserve_gifts_claim() to authenticated;

notify pgrst, 'reload schema';
