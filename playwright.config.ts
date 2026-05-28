import { defineConfig, devices } from '@playwright/test';

const systemopsBaseUrl = process.env.SYSTEMOPS_BASE_URL || 'http://localhost:3000';

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
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure'
  },
  projects: [
    {
      name: 'api',
      testMatch: /targets\/demo\/api\/specs\/.*\.spec\.ts/,
      use: {
        baseURL: 'https://jsonplaceholder.typicode.com',
        extraHTTPHeaders: {
          Accept: 'application/json'
        }
      }
    },
    {
      name: 'web-chromium',
      testMatch: /targets\/demo\/web\/specs\/.*\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        baseURL: 'https://www.saucedemo.com'
      }
    },
    {
      name: 'systemops-api',
      testMatch: /targets\/systemops\/api\/specs\/.*\.spec\.ts/,
      use: {
        baseURL: systemopsBaseUrl,
        extraHTTPHeaders: {
          Accept: 'application/json'
        }
      }
    },
    {
      name: 'systemops-web-chromium',
      testMatch: /targets\/systemops\/web\/specs\/.*\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        baseURL: systemopsBaseUrl
      }
    },
    {
      name: 'systemops-web-mobile',
      testMatch: /targets\/systemops\/web\/specs\/.*\.spec\.ts/,
      use: {
        ...devices['Pixel 5'],
        baseURL: systemopsBaseUrl
      }
    }
  ],
  outputDir: 'reports/test-results'
});
