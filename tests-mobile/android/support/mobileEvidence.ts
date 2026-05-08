import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { browser } from '@wdio/globals';

const mobileEvidenceDir = path.join(process.cwd(), 'reports', 'mobile', 'android');

export async function saveMobileScreenshot(name: string) {
  mkdirSync(mobileEvidenceDir, { recursive: true });

  const filePath = path.join(mobileEvidenceDir, `${slugify(name)}.png`);
  await browser.saveScreenshot(filePath);

  return filePath;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}
