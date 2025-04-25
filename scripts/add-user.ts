#!/usr/bin/env bun
import { Database } from 'bun:sqlite'

// Use SQLite file from env
const dbFile = process.env.DB_FILE_NAME || 'sqlite.db'
const db = new Database(dbFile)

async function main() {
  const [, , email, password, name] = process.argv

  if (!email || !password) {
    console.error('Usage: bun add-user.ts <email> <password> [name]')
    process.exit(1)
  }

  const passwordHash = await Bun.password.hash(password)
  const userId = crypto.randomUUID()
  const accountId = crypto.randomUUID()
  const now = Date.now()

  db.query(
    `
    INSERT INTO "user" 
      (id, email, name, email_verified, image, created_at, updated_at)
    VALUES 
      (?, ?, ?, ?, ?, ?, ?);
  `,
  ).run(userId, email, name ?? email.split('@')[0], 1, null, now, now)

  db.query(
    `
    INSERT INTO account 
      (id, account_id, provider_id, user_id, password, created_at, updated_at)
    VALUES 
      (?, ?, ?, ?, ?, ?, ?);
  `,
  ).run(accountId, accountId, 'credentials', userId, passwordHash, now, now)

  console.log('Seed completed for user:', email)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
