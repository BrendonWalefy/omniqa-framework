import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  timeout: 30_000,
  expect: {
    timeout: 5_000
  },
  fullyParallel: true,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'reports/playwright-report', open: 'never' }],
    ['junit', { outputFile: 'reports/junit/results.xml' }]
  ],
  use: {
    baseURL: 'https://jsonplaceholder.typicode.com',
    extraHTTPHeaders: {
      Accept: 'application/json'
    },
    trace: 'retain-on-failure'
  },
  projects: [
    {
      name: 'api',
      testMatch: /tests-api\/.*\.spec\.ts/
    }
  ],
  outputDir: 'reports/test-results'
});
