import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 45_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  reporter: [['list'], ['json', { outputFile: 'docs/VALIDACION_FASE6B/playwright-results.json' }]],
  use: {
    baseURL: process.env.SEH_WEB_URL || 'http://127.0.0.1:5173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'mobile-390x844', use: { ...devices['iPhone 13'], browserName: 'chromium', viewport: { width: 390, height: 844 }, isMobile: true } },
    { name: 'desktop-1440x900', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 }, isMobile: false } },
  ],
});
