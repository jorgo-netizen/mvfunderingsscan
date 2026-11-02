-- =====================================================================
-- MV Funderingsscan – AI-redactie (concepten voor de nieuwspagina)
-- Uitvoeren in Supabase: SQL Editor → plak dit hele bestand → Run (na 001 t/m 005).
-- Veilig om opnieuw uit te voeren.
--
-- Beveiligingsmodel (zelfde als 001): RLS aan, geen policies; alleen de server (service-sleutel) heeft toegang.
-- De redactiebot op de pc heeft GEEN databasesleutel: hij praat alleen met /api/redactie via een eigen token
-- en kan daar uitsluitend bronnen lezen, nieuwsitems opslaan en concepten aanleveren.
-- Een concept komt pas in mvfs_news na "Goedkeuren" door een ingelogde medewerker, en dan nog als concept.
-- Publiceren blijft een aparte handeling in het portaal (Nieuws → Publiceren).
-- =====================================================================

-- ---------------------------------------------------------------- bronnen (RSS/Atom)
create table if not exists public.mvfs_redactie_bronnen (
  id               uuid primary key default gen_random_uuid(),
  naam             text not null check (length(naam) between 2 and 120),
  url              text not null unique check (url ~ '^https://' and length(url) <= 500),
  categorie        text not null default 'algemeen' check (categorie in ('vakbron', 'overheid', 'onderzoek', 'regionaal', 'landelijk', 'zoekfeed', 'algemeen')),
  betrouwbaarheid  smallint not null default 3 check (betrouwbaarheid between 1 and 5),
  regio            text not null default '' check (length(regio) <= 60),
  pagina_ophalen   boolean not null default false,           -- mag de bot de volledige pagina lezen (alleen open bronnen)
  actief           boolean not null default true,
  laatste_check    timestamptz,
  laatste_fout     text,
  created_at       timestamptz not null default now()
);

-- ---------------------------------------------------------------- verzamelde nieuwsitems (alleen titel, link en korte samenvatting)
create table if not exists public.mvfs_redactie_items (
  id               uuid primary key default gen_random_uuid(),
  bron_id          uuid references public.mvfs_redactie_bronnen(id) on delete set null,
  bron_naam        text not null default '',
  titel            text not null check (length(titel) between 3 and 300),
  url              text not null unique check (length(url) <= 1000),
  samenvatting     text not null default '' check (length(samenvatting) <= 1000),
  gepubliceerd_op  timestamptz,
  verzameld_op     timestamptz not null default now(),
  onderwerp        text not null default '' check (length(onderwerp) <= 80),
  regio            text not null default '' check (length(regio) <= 60),
  relevantie       smallint not null default 0 check (relevantie between 0 and 100),
  betrouwbaarheid  smallint not null default 3 check (betrouwbaarheid between 1 and 5),
  status           text not null default 'nieuw' check (status in ('nieuw', 'gebruikt', 'genegeerd'))
);
create index if not exists mvfs_redactie_items_idx on public.mvfs_redactie_items(status, relevantie desc, verzameld_op desc);

-- ---------------------------------------------------------------- concepten (de bot schrijft, een mens keurt goed)
create table if not exists public.mvfs_redactie_concepten (
  id                uuid primary key default gen_random_uuid(),
  type              text not null check (type in ('nieuws', 'weetje', 'kennis', 'zelftest', 'regionaal', 'praktijk')),
  status            text not null default 'concept' check (status in ('concept', 'afgekeurd', 'goedgekeurd', 'overgezet')),
  titel             text not null check (length(titel) between 3 and 140),
  slug              text not null default '' check (length(slug) <= 90),
  seo_titel         text not null default '' check (length(seo_titel) <= 80),
  meta_description  text not null default '' check (length(meta_description) <= 170),
  hoofdzoekwoord    text not null default '' check (length(hoofdzoekwoord) <= 80),
  zoekwoorden       jsonb not null default '[]',
  intro             text not null default '' check (length(intro) <= 600),
  inhoud            text not null default '' check (length(inhoud) <= 60000),   -- beperkte Markdown, zoals nieuwsberichten
  faqs              jsonb not null default '[]',
  bronnen           jsonb not null default '[]',
  interne_links     jsonb not null default '[]',
  afbeelding        text not null default '' check (length(afbeelding) <= 80),   -- naam uit de beeldbank van de site
  afbeelding_alt    text not null default '' check (length(afbeelding_alt) <= 200),
  zelftest          jsonb,
  controle          jsonb not null default '{}',
  onderwerp         text not null default '' check (length(onderwerp) <= 160),
  item_ids          jsonb not null default '[]',
  model             text not null default '' check (length(model) <= 80),
  regenereren       boolean not null default false,
  regenereer_notitie text not null default '' check (length(regenereer_notitie) <= 500),
  nieuws_id         uuid references public.mvfs_news(id) on delete set null,
  beoordeeld_door   uuid references public.mvfs_users(id) on delete set null,
  beoordeeld_op     timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index if not exists mvfs_redactie_concepten_idx on public.mvfs_redactie_concepten(status, type, created_at desc);

-- ---------------------------------------------------------------- logboek van de bot
create table if not exists public.mvfs_redactie_runs (
  id          uuid primary key default gen_random_uuid(),
  taak        text not null check (length(taak) <= 60),
  status      text not null check (status in ('ok', 'waarschuwing', 'fout')),
  melding     text not null default '' check (length(melding) <= 2000),
  aantallen   jsonb not null default '{}',
  gestart_op  timestamptz not null default now(),
  klaar_op    timestamptz
);
create index if not exists mvfs_redactie_runs_idx on public.mvfs_redactie_runs(gestart_op desc);

-- ---------------------------------------------------------------- instellingen (frequenties, model, onderwerpen)
create table if not exists public.mvfs_redactie_instellingen (
  sleutel     text primary key check (sleutel ~ '^[a-z_]{2,40}$'),
  waarde      jsonb not null,
  updated_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------- beveiliging
alter table public.mvfs_redactie_bronnen enable row level security;
alter table public.mvfs_redactie_items enable row level security;
alter table public.mvfs_redactie_concepten enable row level security;
alter table public.mvfs_redactie_runs enable row level security;
alter table public.mvfs_redactie_instellingen enable row level security;
revoke all on public.mvfs_redactie_bronnen, public.mvfs_redactie_items, public.mvfs_redactie_concepten,
  public.mvfs_redactie_runs, public.mvfs_redactie_instellingen from anon, authenticated;

-- ---------------------------------------------------------------- startbronnen (gecontroleerd op een werkende feed, november 2026)
insert into public.mvfs_redactie_bronnen (naam, url, categorie, betrouwbaarheid, regio, pagina_ophalen) values
  ('KCAF (Kenniscentrum Aanpak Funderingsproblematiek)', 'https://www.kcaf.nl/feed/', 'vakbron', 5, '', true),
  ('STOWA (kennisinstituut waterbeheer)', 'https://www.stowa.nl/rss.xml', 'onderzoek', 4, '', true),
  ('NOS Binnenland', 'https://feeds.nos.nl/nosnieuwsbinnenland', 'landelijk', 4, '', false),
  ('RTV Noord', 'https://www.rtvnoord.nl/rss/index.xml', 'regionaal', 3, 'Groningen', false),
  ('RTV Drenthe', 'https://www.rtvdrenthe.nl/rss/index.xml', 'regionaal', 3, 'Drenthe', false),
  ('Leeuwarder Courant', 'https://www.lc.nl/rss', 'regionaal', 3, 'Friesland', false),
  ('Dagblad van het Noorden', 'https://www.dvhn.nl/rss', 'regionaal', 3, 'Groningen', false),
  ('Google Nieuws: funderingsproblemen', 'https://news.google.com/rss/search?q=funderingsproblemen&hl=nl&gl=NL&ceid=NL:nl', 'zoekfeed', 2, '', false),
  ('Google Nieuws: funderingsherstel', 'https://news.google.com/rss/search?q=funderingsherstel&hl=nl&gl=NL&ceid=NL:nl', 'zoekfeed', 2, '', false),
  ('Google Nieuws: bodemdaling', 'https://news.google.com/rss/search?q=bodemdaling&hl=nl&gl=NL&ceid=NL:nl', 'zoekfeed', 2, '', false),
  ('Google Nieuws: funderingsrisico en funderingslabel', 'https://news.google.com/rss/search?q=funderingsrisico+OR+funderingslabel&hl=nl&gl=NL&ceid=NL:nl', 'zoekfeed', 2, '', false),
  ('Google Nieuws: fundering in het Noorden', 'https://news.google.com/rss/search?q=fundering+Friesland+OR+Groningen+OR+Drenthe&hl=nl&gl=NL&ceid=NL:nl', 'zoekfeed', 2, '', false)
on conflict (url) do nothing;
