# End-to-end tests

These drive the built app in a real browser.

```bash
bun run test:e2e
```

That is the whole thing: it seeds a throwaway database, builds the app, starts
it against that database, and runs the suite. CI runs the same command.

To watch it happen, or to work on a single spec:

```bash
bunx playwright test --ui
bunx playwright test wishlists.spec.ts --project=chromium
bunx playwright test --project=mobile          # the responsive suite
```

## Your development database is never touched

The suite runs against `.e2e/e2e.db`, recreated from scratch on every run.

The path comes from `E2E_DB_FILE`, **not** `DB_FILE_NAME` — Bun auto-loads
`.env`, where `DB_FILE_NAME` points at the real `sqlite.db`, and reading it here
would aim the suite straight at your data. Everything that boots the app for a
test sets `DB_FILE_NAME` explicitly from that value, and both the seed and the
per-test reset refuse to run against a path without `e2e` in it.

`NOTI_API_KEY` is set empty, so `sendNotification` bails out before any network
call and no test can reach the real broadcast endpoint. Apple is stubbed per
test with `page.route`, so the suite is deterministic and works offline.

## Writing tests

- **Use `localhost`, not `127.0.0.1`.** better-auth's `baseURL` in
  `src/lib/auth.ts` defaults to `http://localhost:4321` and answers any other
  origin with `INVALID_ORIGIN`.
- **`resetFixtures()` before each test** restores the wishlist and iTunes rows.
  It leaves the auth tables alone so the signed-in session survives.
- **Locate an item by its actions button** (`Aktionen für <name>`). The name
  itself is a heading only in the mobile card, so on desktop it is not reachable
  by role; the actions button is unique and visible in both layouts.
- Status text (`Aktiv`, `Gekauft`) renders twice — once in the desktop row and
  once in the mobile card that CSS hides — so assert on the first match.
