-- =====================================================================
-- MV Funderingsscan – medewerkers beheren in het portaal (getoond op /over-ons/)
-- Uitvoeren in Supabase: SQL Editor → plak dit hele bestand → Run (na 001 t/m 004).
-- Veilig om opnieuw uit te voeren.
-- De tabel mvfs_advisors is nu de medewerkerslijst: dezelfde personen kies je bij een rapport.
-- =====================================================================

alter table public.mvfs_advisors add column if not exists photo_path  text;                                         -- bucket 'nieuws', bijv. team/abc123.jpg
alter table public.mvfs_advisors add column if not exists functie     text    not null default 'Bouwkundig adviseur';
alter table public.mvfs_advisors add column if not exists introductie text;
alter table public.mvfs_advisors add column if not exists op_site     boolean not null default true;                  -- tonen op /over-ons/
alter table public.mvfs_advisors add column if not exists volgorde    integer not null default 0;

-- Certificaatnummer is niet meer verplicht bij het toevoegen (wel bij het afronden van een rapport).
alter table public.mvfs_advisors alter column certificate drop not null;
alter table public.mvfs_advisors drop constraint if exists mvfs_advisors_certificate_check;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'mvfs_advisors_certificate_lengte') then
    alter table public.mvfs_advisors add constraint mvfs_advisors_certificate_lengte
      check (certificate is null or length(certificate) between 3 and 60);
  end if;
end $$;
