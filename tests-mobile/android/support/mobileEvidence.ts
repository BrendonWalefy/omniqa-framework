import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { browser } from '@wdio/globals';

const mobileEvidenceDir = path.join(process.cwd(), 'reports', 'mobile', 'android');

export async function saveMobileScreenshot(name: string) {
  mkdirSync(mobileEvidenceDir, { recursive: true });

  const filePath = path.join(mobileEvidenceDir, `${formatEvidenceName(name)}.png`);
  await browser.saveScreenshot(filePath);

  return filePath;
}

function formatEvidenceName(name: string) {
  return `${extractScenarioPrefix(name)}-${formatTimestamp()}`;
}

function extractScenarioPrefix(name: string) {
  const match = name.match(/[A-Z]+-\d+/);
  return match ? match[0].toLowerCase() : 'mobile';
}

function formatTimestamp() {
  return new Date()
    .toLocaleString('sv-SE', {
      timeZone: 'America/Sao_Paulo',
      hour12: false
    })
    .replace(' ', '-')
    .replace(/:/g, '');
}
