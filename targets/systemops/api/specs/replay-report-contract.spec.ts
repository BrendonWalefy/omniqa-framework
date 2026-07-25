import { expect, test } from '@playwright/test';
import type { ApprovedReplayDataset } from '../support/approvedReplayDataset';
import type { ReplayScenarioRun } from '../support/e2eClient';
import {
  buildReplayBaselineReport,
  renderReplayBaselineMarkdown,
  renderReplayConversationsMarkdown,
} from '../support/replayReport';

const dataset = {
  clinic: { clinicKey: 'ximendes' },
  datasetVersion: 'baseline-1',
} as ApprovedReplayDataset;

function run(overrides: Partial<ReplayScenarioRun> = {}): ReplayScenarioRun {
  return {
    schemaVersion: 'replay-scenario-run.v1',
    runId: 'run-1',
    scenarioId: 'scenario-1',
    mode: 'closed_loop',
    clockMode: 'shifted',
    transcript: [
      {
        author: 'lead',
        body: 'Olá',
        mediaType: null,
        intent: null,
        sentAt: '2026-07-24T12:00:00.000Z',
      },
      {
        author: 'agent',
        body: 'Olá, como posso ajudar?',
        mediaType: null,
        intent: 'greeting',
        sentAt: '2026-07-24T12:00:01.000Z',
      },
    ],
    trace: [
      {
        turnId: 'turn-1',
        stage: 'intent.classified',
        sequence: 1,
        metadata: { confidence: 0.8 },
      },
      {
        turnId: 'turn-1',
        stage: 'intent.resolved',
        sequence: 2,
        metadata: { finalIntent: 'greeting' },
      },
    ],
    effects: { outbound: [{}], calendar: [] },
    checks: [{ code: 'trace_complete', passed: true }],
    ...overrides,
  };
}

test('SYS-REPLAY-REPORT-001 - calcula confiança e renderiza conversas', () => {
  const report = buildReplayBaselineReport(
    dataset,
    [run()],
    new Date('2026-07-24T13:00:00.000Z'),
  );

  expect(report.metrics.operationalConfidence).toBe(1);
  expect(report.metrics.meanIntentConfidence).toBe(0.8);
  expect(report.findings).toEqual([]);
  expect(renderReplayBaselineMarkdown(report)).toContain(
    'Confiança operacional: 100.0%',
  );
  expect(renderReplayConversationsMarkdown(report)).toContain(
    'Olá, como posso ajudar?',
  );
});

test('SYS-REPLAY-REPORT-002 - aponta check, duplicação e referência cruzada', () => {
  const problematic = run({
    transcript: [
      ...run().transcript,
      {
        author: 'agent',
        body: 'Olá, como posso ajudar?',
        mediaType: null,
        intent: 'greeting',
        sentAt: '2026-07-24T12:00:02.000Z',
      },
      {
        author: 'agent',
        body: 'A Clínica Vitalli pode ajudar.',
        mediaType: null,
        intent: 'general_question',
        sentAt: '2026-07-24T12:00:03.000Z',
      },
    ],
    checks: [{ code: 'trace_complete', passed: false }],
  });
  const report = buildReplayBaselineReport(dataset, [problematic]);

  expect(report.findings.map((finding) => finding.code)).toEqual(
    expect.arrayContaining([
      'failed_check:trace_complete',
      'duplicate_agent_message',
      'cross_clinic_reference',
    ]),
  );
  expect(report.metrics.operationalConfidence).toBeLessThan(1);
});

test('SYS-REPLAY-REPORT-003 - detecta divergência de caminho com intenção igual', () => {
  const pipelineRun = run({
    runId: 'run-pipeline',
    trace: [
      {
        turnId: 'turn-1',
        stage: 'state.loaded',
        sequence: 1,
        metadata: { state: 'treatment_pipeline_active' },
      },
      {
        turnId: 'turn-1',
        stage: 'intent.classified',
        sequence: 2,
        metadata: { confidence: 0.9, intent: 'needs_human', source: 'human_review_media' },
      },
      {
        turnId: 'turn-1',
        stage: 'intent.resolved',
        sequence: 3,
        metadata: { finalIntent: 'needs_human' },
      },
      {
        turnId: 'turn-1',
        stage: 'state.before_delivery',
        sequence: 4,
        metadata: { state: 'treatment_pipeline_active', pendingPipelineAdvance: 'none' },
      },
      {
        turnId: 'turn-1',
        stage: 'outbound.planned',
        sequence: 5,
        metadata: { intent: 'needs_human', interleavedPartCount: 0, mediaPartCount: 0 },
      },
    ],
  });
  const genericRun = run({
    runId: 'run-generic',
    trace: pipelineRun.trace.map((event) => ({
      ...event,
      metadata: event.metadata
        ? {
            ...event.metadata,
            ...(event.stage === 'state.loaded' || event.stage === 'state.before_delivery'
              ? { state: 'none' }
              : {}),
            ...(event.stage === 'intent.classified'
              ? { source: 'media_received' }
              : {}),
          }
        : undefined,
    })),
  });

  const report = buildReplayBaselineReport(
    dataset,
    [pipelineRun, genericRun],
  );

  expect(report.metrics.repeatedScenarioIntentAgreement).toBe(1);
  expect(report.metrics.repeatedScenarioDecisionPathAgreement).toBe(0.5);
  expect(report.findings).toEqual(expect.arrayContaining([
    expect.objectContaining({
      severity: 'high',
      code: 'decision_path_divergence',
    }),
  ]));
  expect(renderReplayBaselineMarkdown(report)).toContain(
    'Concordância de caminho entre repetições: 50.0%',
  );
});
