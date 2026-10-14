create extension if not exists pgcrypto;

create table if not exists public.interviews (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  role text not null,
  score numeric(3,1) not null check (score >= 1 and score <= 10),
  report jsonb not null,
  turns jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.interviews enable row level security;

drop policy if exists "anon can save completed interviews" on public.interviews;
create policy "anon can save completed interviews"
  on public.interviews for insert to anon
  with check (true);
