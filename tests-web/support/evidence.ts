import fs from 'node:fs';
import path from 'node:path';
import { Page, TestInfo, test } from '@playwright/test';
import { formatEvidenceName } from '../../tests-support/evidence/evidenceName';

const webEvidenceDir = path.join(process.cwd(), 'reports', 'evidence', 'web');

export async function attachSuccessEvidence(page: Page, testInfo: TestInfo, name: string) {
  const screenshot = await page.screenshot({ fullPage: true });

  await testInfo.attach(name, {
    body: screenshot,
    contentType: 'image/png'
  });

  fs.mkdirSync(webEvidenceDir, { recursive: true });
  fs.writeFileSync(path.join(webEvidenceDir, `${formatEvidenceName(name, 'web', testInfo.title)}.png`), screenshot);
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
