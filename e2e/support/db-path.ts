/**
 * The database the e2e suite runs against.
 *
 * Deliberately read from `E2E_DB_FILE`, not `DB_FILE_NAME`: Bun auto-loads
 * `.env`, where `DB_FILE_NAME` points at the development database. Everything
 * that boots the app for a test sets `DB_FILE_NAME` to this value explicitly.
 *
 * The path must contain `e2e` — a last line of defence, so an override can
 * never aim the suite at real data.
 */
export const E2E_DB_FILE = process.env.E2E_DB_FILE ?? './.e2e/e2e.db'

if (!E2E_DB_FILE.includes('e2e')) {
  throw new Error(`E2E_DB_FILE must name an e2e database, got: ${E2E_DB_FILE}`)
}
