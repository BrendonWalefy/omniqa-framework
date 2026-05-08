import { Page, TestInfo } from '@playwright/test';

export async function attachSuccessEvidence(page: Page, testInfo: TestInfo, name: string) {
  await testInfo.attach(name, {
    body: await page.screenshot({ fullPage: true }),
    contentType: 'image/png'
  });
}
