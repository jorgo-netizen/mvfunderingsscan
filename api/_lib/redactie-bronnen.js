/**
 * Startbronnen van de AI-redactie. Dezelfde lijst staat in supabase/migrations/006_mvfs_redactie.sql;
 * deze kopie gebruikt alleen de geheugen-database (lokaal en in tests).
 */
export const START_BRONNEN = [
  ['KCAF (Kenniscentrum Aanpak Funderingsproblematiek)', 'https://www.kcaf.nl/feed/', 'vakbron', 5, '', true],
  ['STOWA (kennisinstituut waterbeheer)', 'https://www.stowa.nl/rss.xml', 'onderzoek', 4, '', true],
  ['NOS Binnenland', 'https://feeds.nos.nl/nosnieuwsbinnenland', 'landelijk', 4, '', false],
  ['RTV Noord', 'https://www.rtvnoord.nl/rss/index.xml', 'regionaal', 3, 'Groningen', false],
  ['RTV Drenthe', 'https://www.rtvdrenthe.nl/rss/index.xml', 'regionaal', 3, 'Drenthe', false],
  ['Leeuwarder Courant', 'https://www.lc.nl/rss', 'regionaal', 3, 'Friesland', false],
  ['Dagblad van het Noorden', 'https://www.dvhn.nl/rss', 'regionaal', 3, 'Groningen', false],
  ['Google Nieuws: funderingsproblemen', 'https://news.google.com/rss/search?q=funderingsproblemen&hl=nl&gl=NL&ceid=NL:nl', 'zoekfeed', 2, '', false],
  ['Google Nieuws: funderingsherstel', 'https://news.google.com/rss/search?q=funderingsherstel&hl=nl&gl=NL&ceid=NL:nl', 'zoekfeed', 2, '', false],
  ['Google Nieuws: bodemdaling', 'https://news.google.com/rss/search?q=bodemdaling&hl=nl&gl=NL&ceid=NL:nl', 'zoekfeed', 2, '', false],
  ['Google Nieuws: funderingsrisico en funderingslabel', 'https://news.google.com/rss/search?q=funderingsrisico+OR+funderingslabel&hl=nl&gl=NL&ceid=NL:nl', 'zoekfeed', 2, '', false],
  ['Google Nieuws: fundering in het Noorden', 'https://news.google.com/rss/search?q=fundering+Friesland+OR+Groningen+OR+Drenthe&hl=nl&gl=NL&ceid=NL:nl', 'zoekfeed', 2, '', false],
].map(([naam, url, categorie, betrouwbaarheid, regio, pagina_ophalen]) => ({ naam, url, categorie, betrouwbaarheid, regio, pagina_ophalen, actief: true }));
