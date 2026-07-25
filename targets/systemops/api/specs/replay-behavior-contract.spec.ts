import { expect, test } from '@playwright/test';
import type { ReplayScenarioRun } from '../support/e2eClient';
import {
  applyReplayBehaviorContract,
  loadReplayBehaviorContract,
} from '../support/replayBehaviorContract';

function run(overrides: Partial<ReplayScenarioRun> = {}): ReplayScenarioRun {
  return {
    schemaVersion: 'replay-scenario-run.v1',
    runId: 'run-1',
    scenarioId: 'scenario-1',
    mode: 'closed_loop',
    clockMode: 'shifted',
    transcript: [],
    trace: [
      {
        turnId: 'turn-1',
        stage: 'state.before_delivery',
        sequence: 1,
        metadata: {
          pipelineTreatmentId: 'canonical',
          selectedTreatmentId: 'variant',
        },
      },
    ],
    effects: {
      outbound: [
        { kind: 'text', content: 'Olá', sequence: 1 },
        {
          kind: 'media',
          mediaType: 'video',
          mediaRef: 'video-a',
          caption: 'Técnica Simplificada',
          sequence: 2,
        },
        {
          kind: 'media',
          mediaType: 'video',
          mediaRef: 'video-b',
          caption: 'Técnica Estratificada',
          sequence: 3,
        },
      ],
      calendar: [],
    },
    checks: [],
    ...overrides,
  };
}

test('SYS-REPLAY-BEHAVIOR-001 - valida par imediato, ordem e variante', () => {
  const contract = loadReplayBehaviorContract({
    SYSTEMOPS_REPLAY_EXPECT_MEDIA_SEQUENCE:
      'video:simplificada,video:estratificada',
    SYSTEMOPS_REPLAY_EXPECT_IMMEDIATE_MEDIA_PAIR: 'true',
    SYSTEMOPS_REPLAY_EXPECT_VARIANT_SELECTION: 'true',
  });
  const evaluated = applyReplayBehaviorContract(run(), contract);

  expect(evaluated.checks).toEqual([
    { code: 'expected_media_sequence_exactly_once', passed: true },
    { code: 'expected_media_unique_and_ordered', passed: true },
    { code: 'expected_immediate_media_pair', passed: true },
    { code: 'expected_variant_selection_trace', passed: true },
  ]);
});

test('SYS-REPLAY-BEHAVIOR-002 - falha com duplicação ou ordem incorreta', () => {
  const contract = loadReplayBehaviorContract({
    SYSTEMOPS_REPLAY_EXPECT_MEDIA_SEQUENCE:
      'video:simplificada,video:estratificada',
    SYSTEMOPS_REPLAY_EXPECT_IMMEDIATE_MEDIA_PAIR: 'true',
  });
  const evaluated = applyReplayBehaviorContract(run({
    effects: {
      outbound: [
        { kind: 'text', sequence: 1 },
        {
          kind: 'media',
          mediaType: 'video',
          mediaRef: 'same-video',
          caption: 'Técnica Estratificada',
          sequence: 3,
        },
        {
          kind: 'media',
          mediaType: 'video',
          mediaRef: 'same-video',
          caption: 'Técnica Simplificada',
          sequence: 2,
        },
      ],
      calendar: [],
    },
  }), contract);

  expect(evaluated.checks).toEqual(expect.arrayContaining([
    { code: 'expected_media_sequence_exactly_once', passed: false },
    { code: 'expected_media_unique_and_ordered', passed: false },
  ]));
});

test('SYS-REPLAY-BEHAVIOR-003 - permanece inativo sem opt-in', () => {
  expect(loadReplayBehaviorContract({})).toBeNull();
  expect(applyReplayBehaviorContract(run(), null)).toEqual(run());
});
