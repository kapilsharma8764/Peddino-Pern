import { defineConfig, devices } from '@playwright/test'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

/**
 * End-to-end configuration.
 *
 * Two servers are started for the run: the API, pointed at a throwaway data
 * directory, and a static server for the built client. Nothing here touches
 * the repository's own `server/data`, so a run can never read or overwrite
 * real sites, accounts or enquiries.
 *
 * The client is served from `dist` rather than from the dev server, so what is
 * tested is the artefact the build produces. That means `VITE_API_URL` has to
 * be baked in at build time — `scripts/verify.mjs` does that, and the E2E_*
 * variables below keep the two in step.
 */

const API_PORT = Number(process.env.E2E_API_PORT ?? 8123)
const WEB_PORT = Number(process.env.E2E_WEB_PORT ?? 5299)

// A fresh directory per run. Deterministic fixtures come from the tests
// creating exactly the accounts and sites they need, on an empty database.
const dataDir = process.env.E2E_DATA_DIR ?? mkdtempSync(join(tmpdir(), 'sitebuilder-e2e-'))

export const E2E = {
  apiUrl: `http://127.0.0.1:${API_PORT}`,
  webUrl: `http://127.0.0.1:${WEB_PORT}`,
  dataDir,
}

export default defineConfig({
  testDir: './e2e',
  // Every expectation is against a running app, so give the slow ones room
  // without ever reaching for a bare sleep in a test.
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  // A flaky test is a bug in the test or the app; retrying hides which.
  retries: 0,
  workers: 1,
  forbidOnly: !!process.env.CI,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['json', { outputFile: 'playwright-report/results.json' }],
  ],
  outputDir: 'test-results',

  use: {
    baseURL: E2E.webUrl,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: process.env.E2E_CHROME_PATH ? 'off' : 'retain-on-failure',
    launchOptions: process.env.E2E_CHROME_PATH ? { executablePath: process.env.E2E_CHROME_PATH } : {},
  },

  projects: [
    {
      name: 'desktop-chromium',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
    {
      name: 'tablet-chromium',
      use: { ...devices['Desktop Chrome'], viewport: { width: 820, height: 1180 } },
      testMatch: /responsive\.spec\.ts/,
    },
    {
      name: 'mobile-chromium',
      use: { ...devices['Pixel 7'] },
      testMatch: /responsive\.spec\.ts/,
    },
  ],

  webServer: [
    {
      command: 'node src/index.js',
      cwd: '../server',
      // Readiness is the health endpoint answering, not a timer.
      url: `http://127.0.0.1:${API_PORT}/api/health`,
      env: {
        PORT: String(API_PORT),
        SITEBUILDER_DATA: dataDir,
        // Fixed so tokens issued in one spec still verify in the next.
        SITEBUILDER_SECRET: 'e2e-secret-not-for-production',
        // The suite signs up a fresh account per test from one address.
        RATE_LIMIT_AUTH: '100000',
        RATE_LIMIT_GENERAL: '100000',
      },
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
      stdout: 'pipe',
      stderr: 'pipe',
    },
    {
      command: `npx vite preview --host 127.0.0.1 --port ${WEB_PORT} --strictPort`,
      url: `http://127.0.0.1:${WEB_PORT}`,
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
      stdout: 'pipe',
      stderr: 'pipe',
    },
  ],
})
