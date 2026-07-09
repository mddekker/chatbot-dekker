-- HCC Maandcijfers Dashboard: tabellen + Row Level Security.
-- Uitvoeren in de SQL Editor van het Supabase-dashboard (zie SETUP.md).

create table if not exists public.snapshots (
  id uuid primary key default gen_random_uuid(),
  maand date not null,
  entiteit text not null,
  bron text not null check (bron in ('wenv', 'productiviteit')),
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (maand, entiteit, bron)
);

create table if not exists public.analyses (
  id uuid primary key default gen_random_uuid(),
  maand date not null,
  inhoud text not null,
  created_at timestamptz not null default now()
);

-- Row Level Security: alleen ingelogde gebruikers mogen lezen en schrijven.
alter table public.snapshots enable row level security;
alter table public.analyses enable row level security;

drop policy if exists "snapshots ingelogd alles" on public.snapshots;
create policy "snapshots ingelogd alles"
  on public.snapshots for all
  to authenticated
  using (true)
  with check (true);

drop policy if exists "analyses ingelogd alles" on public.analyses;
create policy "analyses ingelogd alles"
  on public.analyses for all
  to authenticated
  using (true)
  with check (true);
