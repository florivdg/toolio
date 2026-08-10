# End-to-end tests

These drive the built app in a real browser. They never touch the development
`sqlite.db`: the server under test is pointed at a throwaway database, and both
the seed and the per-test reset refuse to run against anything whose path does
not contain `e2e`.

## Running them

```bash
# 1. A throwaway database, migrated and seeded with a test user and fixtures
export E2E_DB=/tmp/toolio-e2e.db
rm -f "$E2E_DB"
DB_FILE_NAME="$E2E_DB" bun run e2e/support/seed.ts

# 2. The built app against that database.
#    NOTI_API_KEY is deliberately empty so no notification can be sent.
bun run build
DB_FILE_NAME="$E2E_DB" BETTER_AUTH_SECRET=e2e-secret-not-a-real-key \
  NOTI_API_KEY= HOST=127.0.0.1 PORT=4321 bun ./dist/server/entry.mjs &

# 3. The tests
DB_FILE_NAME="$E2E_DB" bun run test:e2e
```

## Notes

- **Use `localhost`, not `127.0.0.1`, in the browser.** better-auth's `baseURL`
  in `src/lib/auth.ts` defaults to `http://localhost:4321` and answers any other
  origin with `INVALID_ORIGIN`.
- **Apple is never called.** The search and add endpoints are stubbed per test
  with `page.route`, so the suite is deterministic and offline.
- **`resetFixtures()` runs before each test**, restoring the wishlist and iTunes
  rows. It leaves the auth tables alone so the signed-in session survives.
- Item names are only headings in the mobile card. On desktop, locate an item by
  its actions button (`Aktionen für <name>`), which is unique and visible.
