-- Migratie: sta contextdocumenten (Word/PowerPoint/vrije Excel) toe als bron.
-- Alleen nodig als de tabel al bestond vóór deze functie werd toegevoegd.
-- Uitvoeren in de SQL Editor; bestaande data blijft onaangetast.

alter table public.snapshots drop constraint if exists snapshots_bron_check;
alter table public.snapshots
  add constraint snapshots_bron_check check (bron in ('wenv', 'productiviteit', 'context'));
