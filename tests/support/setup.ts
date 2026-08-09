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
