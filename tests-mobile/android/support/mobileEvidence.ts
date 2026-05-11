import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { browser } from '@wdio/globals';
import { formatEvidenceName } from '../../../tests-support/evidence/evidenceName';

const mobileEvidenceDir = path.join(process.cwd(), 'reports', 'mobile', 'android');

export async function saveMobileScreenshot(name: string) {
  mkdirSync(mobileEvidenceDir, { recursive: true });

  const filePath = path.join(mobileEvidenceDir, `${formatEvidenceName(name, 'android')}.png`);
  await browser.saveScreenshot(filePath);

  return filePath;
}

export async function mobileEvidenceStep<T>(name: string, action: () => Promise<T>) {
  try {
    return await action();
  } finally {
    await saveMobileScreenshot(name);
  }
}
