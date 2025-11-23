import { drizzle } from 'drizzle-orm/bun-sqlite'
import { Database } from 'bun:sqlite'

const sqlite = new Database(process.env.DB_FILE_NAME!)

// Enable foreign key constraints
sqlite.prepare('PRAGMA foreign_keys = ON;').run()

const db = drizzle({ client: sqlite })

export { db }
