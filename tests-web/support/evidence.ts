import { Page, TestInfo, test } from '@playwright/test';

export async function attachSuccessEvidence(page: Page, testInfo: TestInfo, name: string) {
  await testInfo.attach(name, {
    body: await page.screenshot({ fullPage: true }),
    contentType: 'image/png'
  });
}

export async function evidenceStep<T>(
  page: Page,
  testInfo: TestInfo,
  name: string,
  action: () => Promise<T>
) {
  return test.step(name, async () => {
    try {
      return await action();
    } finally {
      await attachSuccessEvidence(page, testInfo, name);
    }
  });
}
