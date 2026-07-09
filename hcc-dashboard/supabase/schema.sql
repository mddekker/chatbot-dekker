-- HCC Maandcijfers Dashboard: tabellen + Row Level Security.
-- Uitvoeren in de SQL Editor van het Supabase-dashboard (zie SETUP.md).
--
-- BELANGRIJK: vervang hieronder eerst op ÉÉN plek het e-mailadres
-- 'JOUW-EMAIL@voorbeeld.nl' door het e-mailadres van jouw dashboard-account.
-- De toegang is beperkt tot precies dat account, zodat het dashboard ook
-- veilig in een gedeeld Supabase-project kan draaien waar andere
-- gebruikers bestaan.

create table if not exists public.snapshots (
  id uuid primary key default gen_random_uuid(),
  maand date not null,
  entiteit text not null,
  bron text not null check (bron in ('wenv', 'productiviteit', 'context')),
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

-- Row Level Security: alleen de eigenaar (op e-mailadres) mag lezen en schrijven.
alter table public.snapshots enable row level security;
alter table public.analyses enable row level security;

-- Eén centrale eigenaarscheck; het e-mailadres staat zo maar op één plek.
create or replace function public.is_dashboard_eigenaar()
returns boolean
language sql
stable
as $$
  select (auth.jwt() ->> 'email') = 'JOUW-EMAIL@voorbeeld.nl'
$$;

drop policy if exists "snapshots ingelogd alles" on public.snapshots;
drop policy if exists "snapshots alleen eigenaar" on public.snapshots;
create policy "snapshots alleen eigenaar"
  on public.snapshots for all
  to authenticated
  using (public.is_dashboard_eigenaar())
  with check (public.is_dashboard_eigenaar());

drop policy if exists "analyses ingelogd alles" on public.analyses;
drop policy if exists "analyses alleen eigenaar" on public.analyses;
create policy "analyses alleen eigenaar"
  on public.analyses for all
  to authenticated
  using (public.is_dashboard_eigenaar())
  with check (public.is_dashboard_eigenaar());
