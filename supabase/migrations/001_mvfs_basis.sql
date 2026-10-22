-- =====================================================================
-- MV Funderingsscan – basisschema voor nieuwsbeheer en QuickScan Track & Trace
-- Uitvoeren in Supabase: SQL Editor → plak dit hele bestand → Run.
-- Veilig om opnieuw uit te voeren (if not exists / or replace).
--
-- Beveiligingsmodel:
--   * Alle tabellen hebben Row Level Security AAN en GEEN policies: de publieke
--     (anon/publishable) sleutel kan dus niets lezen of schrijven.
--   * Alleen de serverless functies op Vercel gebruiken de geheime service-sleutel.
--   * Functies zijn niet uitvoerbaar voor anon/authenticated.
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------- medewerkers
create table if not exists public.mvfs_users (
  id            uuid primary key default gen_random_uuid(),
  email         text not null unique check (email = lower(email) and position('@' in email) > 1),
  name          text not null check (length(name) between 1 and 120),
  role          text not null default 'medewerker' check (role in ('beheerder', 'medewerker')),
  password_hash text not null,
  active        boolean not null default true,
  created_at    timestamptz not null default now(),
  last_login_at timestamptz
);

create table if not exists public.mvfs_sessions (
  token_hash text primary key,                 -- sha256 van het sessietoken; het token zelf staat alleen in de cookie
  user_id    uuid not null references public.mvfs_users(id) on delete cascade,
  csrf       text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);
create index if not exists mvfs_sessions_user_idx on public.mvfs_sessions(user_id);

create table if not exists public.mvfs_login_attempts (
  id         bigint generated always as identity primary key,
  key_hash   text not null,                    -- gehasht e-mailadres of IP-adres, nooit leesbaar
  success    boolean not null,
  created_at timestamptz not null default now()
);
create index if not exists mvfs_login_attempts_key_idx on public.mvfs_login_attempts(key_hash, created_at);

-- ---------------------------------------------------------------- nieuws
create table if not exists public.mvfs_news (
  id                 uuid primary key default gen_random_uuid(),
  title              text not null check (length(title) between 3 and 140),
  slug               text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug) <= 90),
  excerpt            text not null default '' check (length(excerpt) <= 400),
  meta_description   text not null default '' check (length(meta_description) <= 170),
  content            text not null default '' check (length(content) <= 60000),  -- beperkte Markdown, geen HTML
  featured_image     text,                     -- pad in storage-bucket 'nieuws'
  featured_image_alt text not null default '' check (length(featured_image_alt) <= 200),
  status             text not null default 'concept' check (status in ('concept', 'gepubliceerd')),
  show_author        boolean not null default false,
  author_id          uuid references public.mvfs_users(id) on delete set null,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  published_at       timestamptz,
  check (status = 'concept' or published_at is not null)
);
create index if not exists mvfs_news_status_idx on public.mvfs_news(status, published_at desc);

-- ---------------------------------------------------------------- QuickScan-aanvragen
create sequence if not exists public.mvfs_dossier_seq;

create table if not exists public.mvfs_requests (
  id                 uuid primary key default gen_random_uuid(),
  dossier_nr         text not null unique,
  idempotency_key    text not null unique check (length(idempotency_key) between 16 and 80),
  source             text not null default 'aanvraag',
  request_type       text not null default 'fase0',
  naam               text not null check (length(naam) <= 200),
  email              text not null check (length(email) <= 254),
  telefoon           text not null default '',
  adres              text not null default '',
  postcode           text not null default '',
  huisnummer         text not null default '',
  plaats             text not null default '',
  details            jsonb not null default '{}'::jsonb,   -- overige formuliervelden (woningtype, bouwjaar, situatie, opmerking …)
  status             text not null default 'ontvangen'
                     check (status in ('ontvangen', 'in_behandeling', 'info_nodig', 'rapport_opstellen', 'afgerond')),
  status_updated_at  timestamptz not null default now(),
  token_hash         text unique,                          -- sha256 van het trackingtoken; null = geen geldige link
  token_created_at   timestamptz,
  token_revoked_at   timestamptz,
  report_path        text,                                 -- pad in privé-bucket 'rapporten'
  report_name        text,
  report_uploaded_at timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index if not exists mvfs_requests_created_idx on public.mvfs_requests(created_at desc);

create table if not exists public.mvfs_status_history (
  id               bigint generated always as identity primary key,
  request_id       uuid not null references public.mvfs_requests(id) on delete cascade,
  status           text not null,
  customer_message text not null default '' check (length(customer_message) <= 1000),  -- zichtbaar voor de klant
  changed_by       uuid references public.mvfs_users(id) on delete set null,
  changed_at       timestamptz not null default now()
);
create index if not exists mvfs_status_history_req_idx on public.mvfs_status_history(request_id, changed_at);

create table if not exists public.mvfs_notes (                -- ALLEEN intern, nooit naar de klant
  id         bigint generated always as identity primary key,
  request_id uuid not null references public.mvfs_requests(id) on delete cascade,
  note       text not null check (length(note) between 1 and 4000),
  author_id  uuid references public.mvfs_users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists mvfs_notes_req_idx on public.mvfs_notes(request_id, created_at);

create table if not exists public.mvfs_emails (
  id          bigint generated always as identity primary key,
  request_id  uuid references public.mvfs_requests(id) on delete cascade,
  kind        text not null,                                -- bevestiging, nieuwe_link, statuswijziging
  status      text not null default 'voorbereid' check (status in ('voorbereid', 'verzonden', 'mislukt')),
  provider_id text,                                         -- id van Resend; 'verzonden' = door Resend geaccepteerd, niet: afgeleverd
  error       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists mvfs_emails_req_idx on public.mvfs_emails(request_id, created_at);

-- ---------------------------------------------------------------- functies
-- Registreert een aanvraag precies één keer per idempotency_key (dubbele inzending → bestaande aanvraag).
create or replace function public.mvfs_register_request(p jsonb)
returns table (id uuid, dossier_nr text, created boolean)
language plpgsql
set search_path = public
as $$
#variable_conflict use_column
declare
  v_id uuid;
  v_nr text;
begin
  select r.id, r.dossier_nr into v_id, v_nr from mvfs_requests r where r.idempotency_key = p->>'idempotency_key';
  if found then
    return query select v_id, v_nr, false;
    return;
  end if;
  v_nr := 'MV-' || to_char(now() at time zone 'Europe/Amsterdam', 'YYYY') || '-' || lpad(nextval('mvfs_dossier_seq')::text, 4, '0');
  insert into mvfs_requests (dossier_nr, idempotency_key, source, request_type, naam, email, telefoon, adres, postcode, huisnummer, plaats, details, token_hash, token_created_at)
  values (v_nr, p->>'idempotency_key', coalesce(p->>'source', 'aanvraag'), coalesce(p->>'request_type', 'fase0'),
          p->>'naam', p->>'email', coalesce(p->>'telefoon', ''), coalesce(p->>'adres', ''), coalesce(p->>'postcode', ''),
          coalesce(p->>'huisnummer', ''), coalesce(p->>'plaats', ''), coalesce(p->'details', '{}'::jsonb),
          p->>'token_hash', case when p->>'token_hash' is null then null else now() end)
  on conflict (idempotency_key) do nothing
  returning mvfs_requests.id into v_id;
  if v_id is null then  -- gelijktijdige dubbele inzending
    select r.id, r.dossier_nr into v_id, v_nr from mvfs_requests r where r.idempotency_key = p->>'idempotency_key';
    return query select v_id, v_nr, false;
    return;
  end if;
  insert into mvfs_status_history (request_id, status) values (v_id, 'ontvangen');
  return query select v_id, v_nr, true;
end;
$$;

-- Wijzigt de status en legt de wijziging vast in de geschiedenis (in één transactie).
create or replace function public.mvfs_set_status(p_request uuid, p_status text, p_message text, p_user uuid)
returns timestamptz
language plpgsql
set search_path = public
as $$
declare
  v_now timestamptz := now();
begin
  update mvfs_requests set status = p_status, status_updated_at = v_now, updated_at = v_now where id = p_request;
  if not found then
    raise exception 'aanvraag niet gevonden' using errcode = 'P0002';
  end if;
  insert into mvfs_status_history (request_id, status, customer_message, changed_by, changed_at)
  values (p_request, p_status, coalesce(p_message, ''), p_user, v_now);
  return v_now;
end;
$$;

-- ---------------------------------------------------------------- toegangsrechten
alter table public.mvfs_users          enable row level security;
alter table public.mvfs_sessions       enable row level security;
alter table public.mvfs_login_attempts enable row level security;
alter table public.mvfs_news           enable row level security;
alter table public.mvfs_requests       enable row level security;
alter table public.mvfs_status_history enable row level security;
alter table public.mvfs_notes          enable row level security;
alter table public.mvfs_emails         enable row level security;

revoke all on public.mvfs_users, public.mvfs_sessions, public.mvfs_login_attempts, public.mvfs_news,
              public.mvfs_requests, public.mvfs_status_history, public.mvfs_notes, public.mvfs_emails
  from anon, authenticated;
revoke all on sequence public.mvfs_dossier_seq from anon, authenticated;
revoke execute on function public.mvfs_register_request(jsonb) from public, anon, authenticated;
revoke execute on function public.mvfs_set_status(uuid, text, text, uuid) from public, anon, authenticated;
grant execute on function public.mvfs_register_request(jsonb) to service_role;
grant execute on function public.mvfs_set_status(uuid, text, text, uuid) to service_role;

-- ---------------------------------------------------------------- opslag (Supabase Storage)
-- 'nieuws'    : openbaar leesbaar, alleen afbeeldingen, max. 3 MB (uploaden kan alleen via de server).
-- 'rapporten' : PRIVÉ, alleen PDF, max. 50 MB; downloaden alleen via kortlopende ondertekende links.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('nieuws', 'nieuws', true, 3145728, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('rapporten', 'rapporten', false, 52428800, array['application/pdf'])
on conflict (id) do nothing;
