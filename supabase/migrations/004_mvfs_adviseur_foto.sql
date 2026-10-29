-- =====================================================================
-- MV Funderingsscan – portretfoto per adviseur (getoond op /over-ons/)
-- Uitvoeren in Supabase: SQL Editor → plak dit hele bestand → Run (na 001, 002 en 003).
-- Veilig om opnieuw uit te voeren.
-- De foto's staan in de bestaande openbare bucket 'nieuws' onder team/ (alleen afbeeldingen, max. 3 MB).
-- =====================================================================

alter table public.mvfs_advisors add column if not exists photo_path text;  -- pad in bucket 'nieuws', bijv. team/abc123.jpg
