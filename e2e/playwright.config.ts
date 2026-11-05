import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 30000,
  fullyParallel: false,
  workers: 1,
  reporter: [['list'],
             ['html', { outputFolder: 'playwright-report', open: 'never' }],
             ['selfheal-playwright/dist/reporter',
              { report: '../.selfheal/report.json' }]],

  webServer: {
    command: 'npm run dev',
    cwd: '../web',
    url: 'http://127.0.0.1:3000',
    reuseExistingServer: true,
    timeout: 120000,
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],

  use: {
    baseURL: 'http://127.0.0.1:3000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    headless: process.env.HEADLESS === '1',
    launchOptions: {
      slowMo: Number(process.env.SELFHEAL_SLOWMO ?? 150),
      ...(process.env.CHROMIUM_PATH
        ? { executablePath: process.env.CHROMIUM_PATH }
        : {}),
    },
  },
});
