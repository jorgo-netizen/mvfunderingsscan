-- =====================================================================
-- MV Funderingsscan – QuickScan-rapporten (Fase 0 Funderingsrisico-onderzoek)
-- Uitvoeren in Supabase: SQL Editor → plak dit hele bestand → Run (na 001_mvfs_basis.sql).
-- Veilig om opnieuw uit te voeren.
-- Zelfde beveiligingsmodel als 001: RLS aan, geen policies, alleen de server (service-sleutel) heeft toegang.
-- =====================================================================

-- ---------------------------------------------------------------- adviseurs (met certificaatnummer)
create table if not exists public.mvfs_advisors (
  id            uuid primary key default gen_random_uuid(),
  name          text not null unique check (length(name) between 2 and 120),
  certificate   text not null check (length(certificate) between 3 and 60),
  user_id       uuid references public.mvfs_users(id) on delete set null,  -- account dat namens deze adviseur mag afronden/versturen
  active        boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
insert into public.mvfs_advisors (name, certificate) values
  ('Melvin Krikke', 'CE240260817-02'),
  ('Rutger Fopma',  'CE240260817-03')
on conflict (name) do nothing;

-- ---------------------------------------------------------------- rapporten
create sequence if not exists public.mvfs_report_seq;

create table if not exists public.mvfs_reports (
  id            uuid primary key default gen_random_uuid(),
  report_nr     text not null unique,
  request_id    uuid references public.mvfs_requests(id) on delete set null,  -- gekoppelde QuickScan-aanvraag (optioneel)
  advisor_id    uuid references public.mvfs_advisors(id) on delete restrict,
  status        text not null default 'concept'
                check (status in ('concept', 'in_uitvoering', 'wacht_op_info', 'gereed_voor_controle', 'definitief', 'verzonden')),
  risk          text check (risk in ('laag', 'midden', 'hoog')),             -- alleen gezet bij definitief maken, door de adviseur bevestigd
  version       integer not null default 1 check (version >= 1),            -- versie waaraan nu wordt gewerkt / die definitief is
  data          jsonb not null default '{}'::jsonb,                        -- alle invulvelden van het rapport
  created_by    uuid references public.mvfs_users(id) on delete set null,
  updated_by    uuid references public.mvfs_users(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists mvfs_reports_updated_idx on public.mvfs_reports(updated_at desc);
create index if not exists mvfs_reports_request_idx on public.mvfs_reports(request_id);

create table if not exists public.mvfs_report_images (
  id          uuid primary key default gen_random_uuid(),
  report_id   uuid not null references public.mvfs_reports(id) on delete cascade,
  slot        text not null check (slot in ('voorblad', 'conclusie', 'bouwtekening', 'bodemdaling', 'omgeving', 'lintvoeg', 'schietlood')),
  position    integer not null check (position between 1 and 4),
  path        text not null,                     -- privé-bucket 'rapport-bestanden'
  mime        text not null check (mime in ('image/jpeg', 'image/png')),
  width       integer not null check (width > 0),
  height      integer not null check (height > 0),
  caption     text not null default '' check (length(caption) <= 200),
  created_at  timestamptz not null default now(),
  unique (report_id, slot, position)
);

-- Definitieve versies: momentopname van de gegevens + gebruikte sjabloonversie + bestanden. Nooit overschreven.
create table if not exists public.mvfs_report_versions (
  id               uuid primary key default gen_random_uuid(),
  report_id        uuid not null references public.mvfs_reports(id) on delete cascade,
  version          integer not null,
  data             jsonb not null,
  images           jsonb not null default '[]'::jsonb,
  risk             text not null check (risk in ('laag', 'midden', 'hoog')),
  template_version text not null,
  docx_path        text not null,
  pdf_path         text,
  pdf_uploaded_at  timestamptz,
  finalized_by     uuid references public.mvfs_users(id) on delete set null,
  finalized_at     timestamptz not null default now(),
  sent_at          timestamptz,
  sent_by          uuid references public.mvfs_users(id) on delete set null,
  sent_to          text,
  unique (report_id, version)
);

-- E-maillog ook voor rapporten
alter table public.mvfs_emails add column if not exists report_id uuid references public.mvfs_reports(id) on delete cascade;

-- Rapportnummer: QS-<jaar>-<volgnummer>, uniek en zonder gaten door gelijktijdig aanmaken.
create or replace function public.mvfs_next_report_nr()
returns text
language sql
set search_path = public
as $$
  select 'QS-' || to_char(now() at time zone 'Europe/Amsterdam', 'YYYY') || '-' || lpad(nextval('mvfs_report_seq')::text, 4, '0');
$$;

-- ---------------------------------------------------------------- toegangsrechten
alter table public.mvfs_advisors        enable row level security;
alter table public.mvfs_reports         enable row level security;
alter table public.mvfs_report_images   enable row level security;
alter table public.mvfs_report_versions enable row level security;
revoke all on public.mvfs_advisors, public.mvfs_reports, public.mvfs_report_images, public.mvfs_report_versions from anon, authenticated;
revoke all on sequence public.mvfs_report_seq from anon, authenticated;
revoke execute on function public.mvfs_next_report_nr() from public, anon, authenticated;
grant execute on function public.mvfs_next_report_nr() to service_role;

-- ---------------------------------------------------------------- opslag
-- 'rapport-bestanden': PRIVÉ. Foto's, gegenereerde Word-bestanden en de geüploade PDF's.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('rapport-bestanden', 'rapport-bestanden', false, 52428800,
        array['image/jpeg', 'image/png', 'application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'])
on conflict (id) do nothing;
