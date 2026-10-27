-- =====================================================================
-- MV Funderingsscan – cache voor de vertaalknop (NL → EN via DeepL)
-- Uitvoeren in Supabase: SQL Editor → plak dit hele bestand → Run (na 001 en 002).
-- Veilig om opnieuw uit te voeren.
-- Bevat alleen teksten van de website zelf, geen persoonsgegevens.
-- Zelfde beveiligingsmodel als 001: RLS aan, geen policies, alleen de server (service-sleutel) heeft toegang.
-- =====================================================================

create table if not exists public.mvfs_translations (
  key         text primary key,                     -- sha256 van doeltaal + brontekst
  target      text not null default 'EN-GB',
  html        text not null,
  chars       integer not null default 0,
  created_at  timestamptz not null default now()
);

-- tekens per maand die naar DeepL zijn gestuurd (voor de maandlimiet)
create table if not exists public.mvfs_translation_usage (
  month  text primary key check (month ~ '^\d{4}-\d{2}$'),
  chars  bigint not null default 0
);

create or replace function public.mvfs_add_translation_usage(p_month text, p_chars integer)
returns bigint language sql security definer set search_path = public as $$
  insert into public.mvfs_translation_usage (month, chars) values (p_month, greatest(p_chars, 0))
  on conflict (month) do update set chars = public.mvfs_translation_usage.chars + excluded.chars
  returning chars;
$$;

alter table public.mvfs_translations enable row level security;
alter table public.mvfs_translation_usage enable row level security;
revoke all on public.mvfs_translations, public.mvfs_translation_usage from anon, authenticated;
revoke all on function public.mvfs_add_translation_usage(text, integer) from public, anon, authenticated;
grant execute on function public.mvfs_add_translation_usage(text, integer) to service_role;
