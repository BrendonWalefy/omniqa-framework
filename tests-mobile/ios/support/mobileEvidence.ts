import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { browser } from '@wdio/globals';

const mobileEvidenceDir = path.join(process.cwd(), 'reports', 'mobile', 'ios');

export async function saveIosScreenshot(name: string) {
  mkdirSync(mobileEvidenceDir, { recursive: true });

  const filePath = path.join(mobileEvidenceDir, `${formatEvidenceName(name)}.png`);
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

function formatEvidenceName(name: string) {
  return `${extractScenarioPrefix(name)}-${slugify(name)}-${formatTimestamp()}`;
}

function extractScenarioPrefix(name: string) {
  const match = name.match(/[A-Z]+-\d+/);
  return match ? match[0].toLowerCase() : 'ios';
}

function formatTimestamp() {
  return new Date()
    .toLocaleString('sv-SE', {
      timeZone: 'America/Sao_Paulo',
      hour12: false
    })
    .replace(' ', '-')
    .replace(/:/g, '') + `-${String(new Date().getMilliseconds()).padStart(3, '0')}`;
}

function slugify(name: string) {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}
