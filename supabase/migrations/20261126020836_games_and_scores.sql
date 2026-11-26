-- SPEC 06: games catalog and leaderboard scores.
-- Public roles can only read. Scores are inserted with the secret key (service_role).

create table public.games (
  id                text primary key,
  title             text not null,
  short_description text not null,
  long_description  text not null,
  category          text not null
    constraint games_category_check check (category in ('ARCADE', 'PUZZLE', 'SHOOTER', 'VERSUS')),
  cover             text not null,
  color             text not null
    constraint games_color_check check (color in ('cyan', 'magenta', 'yellow', 'green')),
  engine            text
    constraint games_engine_check check (engine in ('asteroids')),
  controls          text,
  sort_order        integer not null unique,
  created_at        timestamptz not null default now()
);

create table public.scores (
  id          bigint generated always as identity primary key,
  game_id     text not null references public.games (id) on delete cascade,
  player_name text not null
    constraint scores_player_name_check check (
      player_name = btrim(player_name) and char_length(player_name) between 1 and 10
    ),
  score       integer not null
    constraint scores_score_check check (score between 0 and 10000000),
  is_seed     boolean not null default false,
  created_at  timestamptz not null default now()
);

-- Leaderboard order.
create index scores_ranking_idx
  on public.scores (game_id, score desc, created_at asc, id asc);

-- Personal best of a player in a game.
create index scores_player_idx
  on public.scores (game_id, player_name, score desc);

-- security_invoker makes the view apply the caller's grants and RLS.
create view public.game_stats
  with (security_invoker = true) as
select
  g.id                        as game_id,
  coalesce(max(s.score), 0)   as best,
  count(s.id)::integer        as plays
from public.games g
left join public.scores s on s.game_id = g.id
group by g.id;

-- Row level security: read-only policies. No write policy exists.
alter table public.games enable row level security;
alter table public.scores enable row level security;

create policy "Games are publicly readable"
  on public.games for select
  to anon, authenticated
  using (true);

create policy "Scores are publicly readable"
  on public.scores for select
  to anon, authenticated
  using (true);

-- Grants: drop the default privileges, then grant only what each role needs.
revoke all on table public.games, public.scores, public.game_stats
  from anon, authenticated;
revoke all on sequence public.scores_id_seq from anon, authenticated;

grant select on table public.games, public.scores, public.game_stats
  to anon, authenticated;

grant select, insert, update, delete on table public.games, public.scores
  to service_role;
grant select on table public.game_stats to service_role;
