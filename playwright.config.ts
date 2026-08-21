import { defineConfig, devices } from '@playwright/test'

// PLACEHOLDERS, NEVER SECRETS — the same set and the same reasoning as the
// `build` job in .github/workflows/ci.yml. None of these reaches a real service:
// the Supabase host does not resolve and the keys are not credentials.
//
// That constraint is deliberate and it defines what this suite can assert. With
// no reachable auth backend there is no session, so every test here is either a
// page that renders without one or a route that correctly refuses without one.
// See e2e/smoke.spec.ts for what that does and does not cover.
const PLACEHOLDER_ENV = {
  NEXT_TELEMETRY_DISABLED: '1',
  NEXT_PUBLIC_SUPABASE_URL: 'https://placeholder.supabase.co',
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'placeholder-publishable-key',
  SUPABASE_SECRET_KEY: 'placeholder-secret-key',
  NEXT_PUBLIC_APP_URL: 'http://localhost:3100',
  NEXT_PUBLIC_WOMPI_PUBLIC_KEY: 'pub_test_placeholder',
  ADMIN_EMAILS: 'admin@placeholder.invalid',
}

const PORT = 3100

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  // A .only left in a spec passes locally and silently narrows CI to one test.
  forbidOnly: Boolean(process.env.CI),
  // Zero retries on purpose. A smoke suite that passes on the second attempt is
  // reporting a flake as a success, and flakes here mean the app is slow to boot
  // or the assertion is racy — both worth seeing rather than papering over.
  retries: 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    // A production build, not `next dev`. Dev-mode compilation hides build-time
    // failures and makes every first navigation slow enough to look like a hang.
    command: 'npm run build && npm run start -- --port ' + PORT,
    url: `http://localhost:${PORT}/terminos`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    env: PLACEHOLDER_ENV,
  },
})
