#!/usr/bin/env bun
import { createUser } from '@/lib/create-user'

async function main() {
  const [, , email, password, name] = process.argv

  if (!email || !password) {
    console.error('Usage: bun add-user.ts <email> <password> [name]')
    process.exit(1)
  }

  try {
    await createUser({ email, password, name })
    console.log('User created successfully:', email)
  } catch (error) {
    console.error('Error creating user:', error)
    process.exit(1)
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
