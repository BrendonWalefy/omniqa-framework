import { expect, test } from '@playwright/test';
import type { ApprovedReplayScenario } from '../support/approvedReplayDataset';
import {
  executableModesForScenario,
  parseReplayModes,
} from '../support/replayModes';

const scenario = {
  compatibleModes: ['historical_turn', 'closed_loop', 'concurrency'],
  turns: [
    {
      id: 'lead-1',
      author: 'lead',
      offsetMs: 0,
      content: { type: 'text', text: 'Olá' },
    },
    {
      id: 'lead-2',
      author: 'lead',
      offsetMs: 1_000,
      content: { type: 'text', text: 'Quero saber mais' },
    },
  ],
} as ApprovedReplayScenario;

test('SYS-REPLAY-MODE-001 - executa closed loop e concorrência por padrão', () => {
  expect(parseReplayModes(undefined)).toEqual(['closed_loop', 'concurrency']);
  expect(
    executableModesForScenario(scenario, parseReplayModes(undefined)),
  ).toEqual(['closed_loop', 'concurrency']);
});

test('SYS-REPLAY-MODE-002 - respeita compatibilidade assinada do cenário', () => {
  expect(
    executableModesForScenario(
      { ...scenario, compatibleModes: ['closed_loop'] },
      ['closed_loop', 'concurrency'],
    ),
  ).toEqual(['closed_loop']);
});

test('SYS-REPLAY-MODE-003 - recusa modo desconhecido', () => {
  expect(() => parseReplayModes('closed_loop,synthetic_burst')).toThrow(
    'Unsupported SYSTEMOPS_REPLAY_MODES entry',
  );
});

test('SYS-REPLAY-MODE-004 - ignora compatibilidade concorrente falsa de corpus antigo', () => {
  expect(
    executableModesForScenario(
      {
        ...scenario,
        turns: [
          scenario.turns[0]!,
          {
            id: 'agent-1',
            author: 'agent',
            offsetMs: 500,
            content: { type: 'text', text: 'Olá' },
          },
          { ...scenario.turns[1]!, offsetMs: 1_000 },
        ],
      },
      ['closed_loop', 'concurrency'],
    ),
  ).toEqual(['closed_loop']);
});
