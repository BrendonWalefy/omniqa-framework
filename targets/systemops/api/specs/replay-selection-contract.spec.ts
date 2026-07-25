import { expect, test } from '@playwright/test';
import type {
  ApprovedReplayDataset,
  ApprovedReplayScenario,
} from '../support/approvedReplayDataset';
import { selectReplayScenarios } from '../support/selectReplayScenarios';

function scenario(id: string, leadTurns: number): ApprovedReplayScenario {
  return {
    schemaVersion: 'replay-scenario.v1',
    id,
    datasetVersion: 'baseline-1',
    source: { kind: 'historical', sourceRef: id, sanitized: true },
    clinic: {
      clinicKey: 'clinic-a',
      configFingerprint: 'config',
      playbookFingerprint: null,
    },
    compatibleModes: ['closed_loop'],
    clock: {
      startedAt: '2026-07-24T12:00:00.000Z',
      timezone: 'America/Sao_Paulo',
    },
    tags: [],
    turns: Array.from({ length: leadTurns }, (_, index) => ({
      id: `${id}-${index}`,
      author: 'lead' as const,
      offsetMs: index * 1_000,
      content: { type: 'text' as const, text: `turno ${index}` },
    })),
  };
}

const dataset = {
  scenarios: [
    scenario('a', 1),
    scenario('oversized', 80),
    scenario('b', 2),
    scenario('c', 3),
    scenario('d', 4),
  ],
} as ApprovedReplayDataset;

test('SYS-REPLAY-SELECTION-001 - exclui cenários acima do orçamento', () => {
  const selection = selectReplayScenarios(dataset, '5', '12');

  expect(selection.scenarios.map((entry) => entry.id)).not.toContain('oversized');
  expect(selection.summary.excludedOverTurnBudget).toBe(1);
  expect(selection.summary.selected).toBe(4);
});

test('SYS-REPLAY-SELECTION-002 - amostra se distribui pelo corpus elegível', () => {
  const selection = selectReplayScenarios(dataset, '2', '12');

  expect(selection.scenarios.map((entry) => entry.id)).toEqual(['a', 'c']);
});

test('SYS-REPLAY-SELECTION-003 - seleciona um cenário aprovado pelo id exato', () => {
  const selection = selectReplayScenarios(dataset, '5', '12', 'b');

  expect(selection.scenarios.map((entry) => entry.id)).toEqual(['b']);
  expect(selection.summary.targetedScenarioId).toBe('b');
  expect(selection.summary.selected).toBe(1);
});

test('SYS-REPLAY-SELECTION-004 - recusa id ausente ou fora do orçamento', () => {
  expect(() =>
    selectReplayScenarios(dataset, '5', '12', 'missing'),
  ).toThrow('does not exist in the approved dataset');
  expect(() =>
    selectReplayScenarios(dataset, '5', '12', 'oversized'),
  ).toThrow('80 lead turns exceed the 12-turn budget');
});
