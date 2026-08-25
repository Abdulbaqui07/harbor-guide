-- Harbor schema. Safe to re-run.

create table if not exists containers (
  id                  text primary key,
  iso_type            text not null,
  line                text not null,
  vessel              text not null,
  voyage              text not null,
  status              text not null,
  yard_position       text not null,
  discharged_at       date not null,
  free_days_remaining integer not null,
  gross_weight_kg     integer not null,
  holds               text[] not null default '{}',
  consignee           text not null
);

create table if not exists requests (
  id              text primary key,
  container_id    text not null references containers(id),
  user_key        text not null,
  kind            text not null,
  haulier         text not null,
  collection_date date not null,
  notes           text not null default '',
  status          text not null default 'Submitted',
  created_at      timestamptz not null default now()
);

create index if not exists requests_user_created_idx
  on requests (user_key, created_at desc);

-- Tutorial platform ---------------------------------------------------------

create table if not exists tutorials (
  id          text primary key,
  slug        text unique not null,
  title       text not null,
  description text not null,
  version     integer not null default 1,
  status      text not null default 'published',
  source      text not null default 'handwritten',
  created_at  timestamptz not null default now()
);

create table if not exists tutorial_steps (
  id             bigserial primary key,
  tutorial_id    text not null references tutorials(id) on delete cascade,
  sequence       integer not null,
  page           text not null,
  target_id      text not null,
  title          text not null,
  message        text not null,
  action         text not null default 'observe',
  expected_value text,
  unique (tutorial_id, sequence)
);

create index if not exists tutorial_steps_tutorial_idx
  on tutorial_steps (tutorial_id, sequence);

create table if not exists tutorial_progress (
  id           bigserial primary key,
  user_key     text not null,
  tutorial_id  text not null references tutorials(id) on delete cascade,
  current_step integer not null default 0,
  completed_at timestamptz,
  updated_at   timestamptz not null default now(),
  unique (user_key, tutorial_id)
);
