-- =============================================
-- INFINITY LOOP — Supabase SQL Setup
-- Виконай в SQL Editor на supabase.com
-- =============================================

-- 1. Таблиця записів (фільми, серіали тощо)
create table if not exists entries (
  id          bigserial primary key,
  user_id     text not null,          -- логін користувача
  name        text not null,
  type        text not null default 'film',
  status      text not null default 'plan',
  year        text,
  date_start  date,
  date_end    date,
  dur         text,
  seasons     integer,
  episodes    integer,
  rating      integer,
  fire        boolean default false,
  imdb        numeric(3,1),
  genres      text[],                 -- масив жанрів
  notes       text,
  emoji       text,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- 2. Таблиця жанрів
create table if not exists genres (
  id      bigserial primary key,
  name    text not null unique
);

-- 3. Таблиця налаштувань (по одному рядку на акаунт)
create table if not exists settings (
  user_id     text primary key,
  omdb_key    text default '',
  vibe_year   text default '2026',
  vibe_title  text default 'Японія крізь призму футуризму',
  vibe_tags   text default 'Аніме · Кіберпанк · Фантастика'
);

-- 4. Таблиця користувачів (гості)
create table if not exists users (
  login     text primary key,
  pass      text not null,
  role      text not null default 'guest'
);

-- 5. RLS (Row Level Security) — вимкнемо для простоти (використовуємо логін як user_id)
alter table entries  disable row level security;
alter table genres   disable row level security;
alter table settings disable row level security;
alter table users    disable row level security;

-- 6. Початкові жанри
insert into genres (name) values
  ('Екшн'),('Фентезі'),('Наукова фантастика'),('Пригоди'),
  ('Темне фентезі'),('Трилер'),('Жахи'),('Детектив'),
  ('Драма'),('Комедія'),('Сімейний'),('Кіберпанк'),
  ('Психологічний трилер'),('Сьонен'),('Сейнен'),
  ('Надприродне'),('Катастрофа'),('Аніме'),('Фантастика'),
  ('Меха'),('Пародія')
on conflict do nothing;

-- 7. Адмін користувач (зміни пароль якщо хочеш)
insert into users (login, pass, role) values
  ('DeathPainter', 'Reckless2015', 'admin')
on conflict do nothing;

-- Done!
select 'Setup complete!' as status;
