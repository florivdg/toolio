/**
 * Test preload. Registered via bunfig.toml so it runs before any test file
 * imports application code.
 *
 * `src/db/database.ts` opens `process.env.DB_FILE_NAME` at import time and Bun
 * loads .env automatically, where DB_FILE_NAME points at the real development
 * database. This assignment must happen before that module is first imported,
 * and must overwrite rather than default, otherwise the suite would read and
 * write the developer's own sqlite.db.
 */
process.env.DB_FILE_NAME = ':memory:'

/**
 * Pinned for the same reason: `sendNotification` bails out before doing anything
 * when this is unset, so whether a notification test passes would otherwise
 * depend on the developer having a real key in .env — which is exactly how a
 * green local run turned into a red CI one.
 *
 * Every test that reaches this path stubs `fetch`, so the value is never used
 * against the real endpoint.
 */
process.env.NOTI_API_KEY = 'test-key-never-sent'

/**
 * Better Auth reads its secret and `src/lib/auth.ts` its base URL when first
 * imported. Pinned so the auth integration tests sign cookies with a known,
 * test-only secret against a fixed origin instead of whatever is in .env.
 * The cron secret is cleared so only the tests that set it see one.
 */
process.env.BETTER_AUTH_SECRET = 'test-only-better-auth-secret-0123456789'
process.env.BETTER_AUTH_URL = 'http://localhost:4321'
process.env.PASSKEY_ORIGIN = 'http://localhost:4321'
delete process.env.PRICE_UPDATE_CRON_SECRET

const { db } = await import('@/db/database')
const { migrate } = await import('drizzle-orm/bun-sqlite/migrator')

// Fail loudly rather than silently operating on a file-backed database.
if (process.env.DB_FILE_NAME !== ':memory:') {
  throw new Error(
    `Refusing to run tests against ${process.env.DB_FILE_NAME}; expected :memory:`,
  )
}

migrate(db, { migrationsFolder: './drizzle' })

// This file has no static imports (the dynamic ones above are deliberate, so the
// env assignment lands first), which would otherwise make it a script rather than
// a module and disallow top-level await.
export {}
