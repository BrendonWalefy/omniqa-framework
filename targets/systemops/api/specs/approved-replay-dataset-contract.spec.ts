import { createHash, generateKeyPairSync, sign } from 'node:crypto';
import { expect, test } from '@playwright/test';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { loadApprovedReplayDataset } from '../support/approvedReplayDataset';
import { isProductionLikeUrl } from '../../systemops.config';

const temporaryDirectories: string[] = [];

test.afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) =>
      rm(directory, { recursive: true, force: true }),
    ),
  );
});

test('SYS-REPLAY-CONTRACT-001 - aceita v2 assinado fora de Git', async () => {
  const fixture = await writeSignedFixture();
  const dataset = await loadApprovedReplayDataset(
    fixture.datasetPath,
    fixture.publicKeyPath,
  );

  expect(dataset.schemaVersion).toBe('replay-dataset.v2');
  expect(dataset.status).toBe('approved');
  expect(dataset.scenarios).toHaveLength(1);
});

test('SYS-REPLAY-CONTRACT-002 - recusa conteúdo alterado após aprovação', async () => {
  const fixture = await writeSignedFixture();
  const parsed = JSON.parse(await import('node:fs/promises').then((fs) =>
    fs.readFile(fixture.datasetPath, 'utf8'),
  ));
  parsed.scenarios[0].turns[0].content.text = 'conteúdo adulterado';
  await writeFile(fixture.datasetPath, JSON.stringify(parsed));

  await expect(loadApprovedReplayDataset(
    fixture.datasetPath,
    fixture.publicKeyPath,
  )).rejects.toThrow('signature is invalid');
});

test('SYS-REPLAY-CONTRACT-003 - recusa chave pública diferente', async () => {
  const fixture = await writeSignedFixture();
  const other = generateKeyPairSync('ed25519');
  await writeFile(
    fixture.publicKeyPath,
    other.publicKey.export({ type: 'spki', format: 'pem' }),
  );

  await expect(loadApprovedReplayDataset(
    fixture.datasetPath,
    fixture.publicKeyPath,
  )).rejects.toThrow('not trusted');
});

test('SYS-REPLAY-CONTRACT-004 - recusa schema v1 editável', async () => {
  const fixture = await writeSignedFixture();
  const parsed = JSON.parse(await import('node:fs/promises').then((fs) =>
    fs.readFile(fixture.datasetPath, 'utf8'),
  ));
  parsed.schemaVersion = 'replay-dataset.v1';
  await writeFile(fixture.datasetPath, JSON.stringify(parsed));

  await expect(loadApprovedReplayDataset(
    fixture.datasetPath,
    fixture.publicKeyPath,
  )).rejects.toThrow('Unsupported');
});

test('SYS-REPLAY-CONTRACT-005 - recusa caminho relativo', async () => {
  await expect(loadApprovedReplayDataset(
    'dataset.approved.json',
    '/tmp/public.pem',
  )).rejects.toThrow('must be absolute');
});

test('SYS-REPLAY-CONTRACT-006 - reconhece o domínio canônico de produção', () => {
  expect(isProductionLikeUrl('https://app.systemops.com.br')).toBe(true);
  expect(isProductionLikeUrl('https://app.systemops.com.br/app/inbox')).toBe(true);
  expect(isProductionLikeUrl('http://localhost:3000')).toBe(false);
});

async function writeSignedFixture() {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'omniqa-replay-'));
  temporaryDirectories.push(directory);
  const datasetPath = path.join(directory, 'approved.json');
  const publicKeyPath = path.join(directory, 'public.pem');
  const { privateKey, publicKey } = generateKeyPairSync('ed25519');
  const der = publicKey.export({ type: 'spki', format: 'der' });
  const approvedAt = '2026-07-24T13:00:00.000Z';
  const approval = {
    algorithm: 'ed25519',
    checklistVersion: 'replay-privacy-review.v1',
    approvedAt,
    approvedBy: 'qa-owner',
    keyId: createHash('sha256').update(der).digest('hex').slice(0, 24),
    sourceDigest: createHash('sha256').update('source').digest('hex'),
  };
  const unsigned = {
    ...datasetFixture(),
    approval,
  };
  const signature = sign(
    null,
    Buffer.from(stableSerialize(unsigned), 'utf8'),
    privateKey,
  ).toString('base64');
  await Promise.all([
    writeFile(datasetPath, JSON.stringify({
      ...unsigned,
      approval: { ...approval, signature },
    })),
    writeFile(
      publicKeyPath,
      publicKey.export({ type: 'spki', format: 'pem' }),
    ),
  ]);
  return { datasetPath, publicKeyPath };
}

function datasetFixture() {
  return {
    schemaVersion: 'replay-dataset.v2',
    datasetVersion: 'fixture-1',
    generatedAt: '2026-07-24T12:00:00.000Z',
    status: 'approved',
    sanitization: {
      automated: true,
      humanReviewRequired: true,
      humanReviewApprovedAt: '2026-07-24T13:00:00.000Z',
    },
    clinic: {
      clinicKey: 'clinic-a',
      timezone: 'America/Sao_Paulo',
      configFingerprint: 'config-fingerprint',
      playbookFingerprint: null,
    },
    scenarioCount: 1,
    scenarios: [{
      schemaVersion: 'replay-scenario.v1',
      id: 'historical-safe-ref',
      datasetVersion: 'fixture-1',
      source: {
        kind: 'historical',
        sourceRef: 'safe-ref',
        sanitized: true,
      },
      clinic: {
        clinicKey: 'clinic-a',
        configFingerprint: 'config-fingerprint',
        playbookFingerprint: null,
      },
      compatibleModes: ['historical_turn'],
      turns: [{
        id: 'turn-safe-ref',
        author: 'lead',
        offsetMs: 0,
        content: { type: 'text', text: 'Olá' },
      }],
    }],
  };
}

function stableSerialize(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableSerialize(entry)).join(',')}]`;
  }
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableSerialize(record[key])}`)
    .join(',')}}`;
}
