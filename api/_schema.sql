-- Building Taste schema. Applied idempotently on first query in each cold start.

create table if not exists buildings (
  id            text primary key,
  address       text not null,
  neighborhood  text not null default '',
  building_type text not null default '—',
  photo         text not null default '',
  rating        double precision not null default 1400,
  wins          integer not null default 0,
  losses        integer not null default 0,
  created_at    timestamptz not null default now()
);

-- One row per browser. user_id stays null until email accounts exist; when they
-- do, claiming a device is a single UPDATE rather than a migration.
create table if not exists voters (
  id           uuid primary key,
  user_id      uuid,
  neighborhood text,
  created_at   timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create table if not exists votes (
  id          bigserial primary key,
  voter_id    uuid not null references voters(id) on delete cascade,
  winner_id   text not null references buildings(id) on delete cascade,
  loser_id    text not null references buildings(id) on delete cascade,
  delta       integer not null,
  agreed_pct  integer not null,
  created_at  timestamptz not null default now()
);
create index if not exists votes_voter_idx on votes (voter_id);
create index if not exists votes_created_idx on votes (created_at desc);

create table if not exists survey_answers (
  id           bigserial primary key,
  voter_id     uuid not null references voters(id) on delete cascade,
  qid          text not null,
  category     text not null,
  prompt       text not null,
  qtype        text not null,
  answer       jsonb not null,
  -- For pairwise questions: the option that lost, so per-voter Elo can be
  -- replayed without the server needing a copy of the question bank.
  elo_loser    text,
  neighborhood text,
  created_at   timestamptz not null default now()
);
-- Enforces "never ask the same question twice" at the database, not just the UI.
create unique index if not exists survey_answers_once on survey_answers (voter_id, qid);
create index if not exists survey_answers_prompt_idx on survey_answers (prompt);

-- Community-wide Elo for pairwise survey options (materials, windows, etc).
create table if not exists option_ratings (
  category text not null,
  label    text not null,
  rating   double precision not null default 1400,
  wins     integer not null default 0,
  losses   integer not null default 0,
  primary key (category, label)
);
