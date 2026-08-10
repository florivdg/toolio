import { defineConfig, devices } from '@playwright/test'

/**
 * End-to-end configuration.
 *
 * The server is started separately against an isolated database (see
 * `e2e/README.md`); these tests never point at the development sqlite.db.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  timeout: 30_000,
  expect: { timeout: 7_000 },
  use: {
    // Must be localhost, not 127.0.0.1: better-auth's baseURL in src/lib/auth.ts
    // defaults to http://localhost:4321 and rejects any other origin.
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:4321',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
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
