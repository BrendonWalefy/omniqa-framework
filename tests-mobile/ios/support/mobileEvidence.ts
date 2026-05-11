import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { browser } from '@wdio/globals';
import { formatEvidenceName } from '../../../tests-support/evidence/evidenceName';

const mobileEvidenceDir = path.join(process.cwd(), 'reports', 'mobile', 'ios');

export async function saveIosScreenshot(name: string) {
  mkdirSync(mobileEvidenceDir, { recursive: true });

  const filePath = path.join(mobileEvidenceDir, `${formatEvidenceName(name, 'ios')}.png`);
  await browser.saveScreenshot(filePath);

  return filePath;
}

export async function iosEvidenceStep<T>(name: string, action: () => Promise<T>) {
  try {
    return await action();
  } finally {
    await saveIosScreenshot(name);
  }
}
