import { defineConfig, devices } from '@playwright/test'
import { E2E_DB_FILE } from './e2e/support/db-path'

/**
 * End-to-end configuration.
 *
 * `bun run test:e2e` is self-contained: it seeds a throwaway database, builds
 * and starts the app against it, and runs the suite. The development sqlite.db
 * is never involved — see e2e/README.md.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  forbidOnly: !!process.env.CI,
  reporter: process.env.CI ? [['github'], ['list']] : [['list']],
  timeout: 30_000,
  expect: { timeout: 7_000 },

  use: {
    // Must be localhost, not 127.0.0.1: better-auth's baseURL in
    // src/lib/auth.ts defaults to http://localhost:4321 and rejects any other
    // origin with INVALID_ORIGIN.
    baseURL: 'http://localhost:4321',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },

  webServer: {
    // Rebuilt each run so the suite always exercises the current source.
    command: 'bun run build && bun ./dist/server/entry.mjs',
    url: 'http://localhost:4321/sign-in',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    stdout: 'ignore',
    stderr: 'pipe',
    env: {
      DB_FILE_NAME: E2E_DB_FILE,
      BETTER_AUTH_SECRET: 'e2e-secret-not-a-real-key',
      // Empty on purpose: sendNotification bails out before any network call,
      // so a test can never reach the real broadcast endpoint.
      NOTI_API_KEY: '',
      HOST: '127.0.0.1',
      PORT: '4321',
    },
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      // The responsive suite asserts the mobile layout, so it only makes sense
      // under the phone project below.
      testIgnore: /responsive\.spec\.ts/,
    },
    {
      name: 'mobile',
      use: { ...devices['Pixel 7'] },
      testMatch: /responsive\.spec\.ts/,
    },
  ],
})
