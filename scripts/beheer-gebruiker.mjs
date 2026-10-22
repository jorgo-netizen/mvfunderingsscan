/**
 * Medewerkersaccount aanmaken of een wachtwoord opnieuw instellen (er is bewust geen publieke registratie).
 *
 *   node scripts/beheer-gebruiker.mjs --email naam@mideavastgoed.nl --naam "Voornaam Achternaam" --rol beheerder
 *   node scripts/beheer-gebruiker.mjs --email naam@mideavastgoed.nl --nieuw-wachtwoord
 *   node scripts/beheer-gebruiker.mjs --email naam@mideavastgoed.nl --uitschakelen
 *
 * Het wachtwoord wordt gevraagd in de terminal (minimaal 12 tekens) of gelezen uit MVFS_NIEUW_WACHTWOORD
 * (handig in scripts; zet die variabele daarna weer leeg). Opgeslagen wordt alleen een scrypt-hash.
 * Werkt tegen de database uit de omgevingsvariabelen: SUPABASE_URL + SUPABASE_SERVICE_KEY (productie)
 * of MVFS_DB=memory met MVFS_DB_FILE (lokaal).
 */
import { createInterface } from 'node:readline';
import { getDb } from '../api/_lib/db.js';
import { hashPassword, MIN_PASSWORD } from '../api/_lib/auth.js';

const args = process.argv.slice(2);
const arg = (name) => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : undefined; };
const flag = (name) => args.includes(`--${name}`);

async function askPassword() {
  if (process.env.MVFS_NIEUW_WACHTWOORD) return process.env.MVFS_NIEUW_WACHTWOORD;
  const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
  const ask = (q) => new Promise((ok) => {
    rl.output.write(q);
    rl._writeToOutput = () => {}; // invoer niet tonen
    rl.question('', (a) => { rl._writeToOutput = (s) => rl.output.write(s); rl.output.write('\n'); ok(a); });
  });
  const a = await ask(`Wachtwoord (min. ${MIN_PASSWORD} tekens): `);
  const b = await ask('Herhaal wachtwoord: ');
  rl.close();
  if (a !== b) throw new Error('De wachtwoorden zijn niet gelijk.');
  return a;
}

async function main() {
  const db = getDb();
  if (!db) throw new Error('Geen database ingesteld. Zet SUPABASE_URL en SUPABASE_SERVICE_KEY (of lokaal MVFS_DB=memory en MVFS_DB_FILE).');
  const email = String(arg('email') || '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) throw new Error('Geef een geldig e-mailadres op met --email.');
  const existing = await db.userByEmail(email);

  if (flag('uitschakelen')) {
    if (!existing) throw new Error('Onbekend account.');
    await db.updateUser(existing.id, { active: false });
    await db.deleteUserSessions(existing.id);
    console.log(`Account ${email} is uitgeschakeld en alle sessies zijn beëindigd.`);
    return;
  }
  if (flag('nieuw-wachtwoord')) {
    if (!existing) throw new Error('Onbekend account.');
    await db.updateUser(existing.id, { password_hash: await hashPassword(await askPassword()), active: true });
    await db.deleteUserSessions(existing.id);
    console.log(`Nieuw wachtwoord ingesteld voor ${email}; bestaande sessies zijn beëindigd.`);
    return;
  }
  if (existing) throw new Error('Dit account bestaat al. Gebruik --nieuw-wachtwoord of --uitschakelen.');
  const naam = String(arg('naam') || '').trim();
  const rol = arg('rol') || 'medewerker';
  if (!naam) throw new Error('Geef een naam op met --naam.');
  if (!['beheerder', 'medewerker'].includes(rol)) throw new Error('Rol moet beheerder of medewerker zijn.');
  await db.createUser({ email, name: naam, role: rol, password_hash: await hashPassword(await askPassword()) });
  console.log(`Account aangemaakt: ${email} (${rol}).`);
}

main().catch((err) => { console.error(`✖ ${err.message}`); process.exit(1); });
