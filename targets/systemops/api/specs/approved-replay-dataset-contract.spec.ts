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

test('SYS-REPLAY-CONTRACT-001 - aceita somente dataset aprovado fora de Git', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'omniqa-replay-'));
  temporaryDirectories.push(directory);
  const datasetPath = path.join(directory, 'approved.json');
  await writeFile(datasetPath, JSON.stringify(datasetFixture('approved')));

  const dataset = await loadApprovedReplayDataset(datasetPath);

  expect(dataset.schemaVersion).toBe('replay-dataset.v1');
  expect(dataset.status).toBe('approved');
  expect(dataset.scenarios).toHaveLength(1);
});

test('SYS-REPLAY-CONTRACT-002 - recusa dataset ainda needs_review', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'omniqa-replay-'));
  temporaryDirectories.push(directory);
  const datasetPath = path.join(directory, 'needs-review.json');
  await writeFile(datasetPath, JSON.stringify(datasetFixture('needs_review')));

  await expect(loadApprovedReplayDataset(datasetPath))
    .rejects.toThrow('status=approved');
});

test('SYS-REPLAY-CONTRACT-003 - recusa caminho relativo', async () => {
  await expect(loadApprovedReplayDataset('dataset.approved.json'))
    .rejects.toThrow('must be absolute');
});

test('SYS-REPLAY-CONTRACT-004 - reconhece o domínio canônico de produção', () => {
  expect(isProductionLikeUrl('https://app.systemops.com.br')).toBe(true);
  expect(isProductionLikeUrl('https://app.systemops.com.br/app/inbox')).toBe(true);
  expect(isProductionLikeUrl('http://localhost:3000')).toBe(false);
});

function datasetFixture(status: 'approved' | 'needs_review') {
  return {
    schemaVersion: 'replay-dataset.v1',
    datasetVersion: 'fixture-1',
    generatedAt: '2026-07-24T12:00:00.000Z',
    status,
    sanitization: {
      automated: true,
      humanReviewRequired: true,
      humanReviewApprovedAt:
        status === 'approved' ? '2026-07-24T13:00:00.000Z' : null,
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
