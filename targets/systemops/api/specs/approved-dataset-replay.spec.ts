import { expect, test } from '@playwright/test';
import { createRunId, e2eSkipReason, systemopsConfig } from '../../systemops.config';
import {
  SystemOpsE2eClient,
  type ReplayScenarioRun,
} from '../support/e2eClient';
import { loadApprovedReplayDataset } from '../support/approvedReplayDataset';
import {
  buildReplayBaselineReport,
  persistReplayBaselineReport,
  renderReplayBaselineMarkdown,
  renderReplayConversationsMarkdown,
} from '../support/replayReport';

test.describe('SystemOps - replay fiel de dataset sanitizado e aprovado', () => {
  test.beforeEach(async () => {
    if (!systemopsConfig.runApprovedReplay) {
      test.skip(true, 'Replay aprovado não solicitado.');
    }
    const skipReason = e2eSkipReason();
    if (skipReason) test.skip(true, skipReason);
  });

  test('SYS-REPLAY-001 - cenários atravessam webhook, filas, motor e sender capturado', async ({ request }) => {
    const dataset = await loadApprovedReplayDataset(
      systemopsConfig.replayDatasetPath,
      systemopsConfig.replayApprovalPublicKeyPath,
    );
    const sampleSize = parseSampleSize(
      process.env.SYSTEMOPS_REPLAY_SAMPLE_SIZE,
      dataset.scenarios.length,
    );
    const repetitions = parseRepetitions(
      process.env.SYSTEMOPS_REPLAY_REPETITIONS,
    );
    const scenarios = dataset.scenarios.slice(0, sampleSize);
    test.setTimeout(
      Math.max(
        300_000,
        countLeadTurns(scenarios) * repetitions * 45_000,
      ),
    );

    const client = new SystemOpsE2eClient(request);
    const runs: ReplayScenarioRun[] = [];
    for (const scenario of scenarios) {
      for (let repetition = 1; repetition <= repetitions; repetition++) {
        const runId = createRunId(`${scenario.id}-r${repetition}`);
        runs.push(await client.runReplayScenario(runId, scenario));
      }
    }

    await test.info().attach('approved-replay-results.json', {
      body: Buffer.from(JSON.stringify({
        datasetVersion: dataset.datasetVersion,
        scenarioCount: scenarios.length,
        repetitions,
        runs,
      }, null, 2)),
      contentType: 'application/json',
    });
    const report = buildReplayBaselineReport(dataset, runs);
    await Promise.all([
      test.info().attach('approved-replay-report.md', {
        body: Buffer.from(renderReplayBaselineMarkdown(report)),
        contentType: 'text/markdown',
      }),
      test.info().attach('approved-replay-conversations.md', {
        body: Buffer.from(renderReplayConversationsMarkdown(report)),
        contentType: 'text/markdown',
      }),
    ]);
    if (systemopsConfig.replayResultsDirectory) {
      const persisted = await persistReplayBaselineReport(
        systemopsConfig.replayResultsDirectory,
        report,
      );
      await test.info().attach('approved-replay-artifact-paths.json', {
        body: Buffer.from(JSON.stringify(persisted, null, 2)),
        contentType: 'application/json',
      });
    }

    expect(runs.length, 'Nenhum cenário foi executado.').toBeGreaterThan(0);
    const failedChecks = runs.flatMap((run) =>
      run.checks
        .filter((check) => !check.passed)
        .map((check) => ({
          scenarioId: run.scenarioId,
          runId: run.runId,
          check: check.code,
        })),
    );
    expect(failedChecks, 'Checks determinísticos do replay falharam.')
      .toHaveLength(0);
    expect(
      runs.every((run) => run.trace.length > 0),
      'Todo cenário deve produzir Decision Trace.',
    ).toBe(true);
    expect(
      runs.every((run) => run.effects.outbound.length > 0),
      'Toda conversa respondida deve capturar a tentativa de entrega.',
    ).toBe(true);
  });
});

function parseSampleSize(raw: string | undefined, available: number): number {
  const parsed = Number(raw ?? '5');
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error('SYSTEMOPS_REPLAY_SAMPLE_SIZE must be a positive integer.');
  }
  return Math.min(parsed, available);
}

function parseRepetitions(raw: string | undefined): number {
  const parsed = Number(raw ?? '3');
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 10) {
    throw new Error('SYSTEMOPS_REPLAY_REPETITIONS must be an integer from 1 to 10.');
  }
  return parsed;
}

function countLeadTurns(
  scenarios: Array<{ turns: Array<{ author: string }> }>,
): number {
  return scenarios.reduce(
    (total, scenario) =>
      total + scenario.turns.filter((turn) => turn.author === 'lead').length,
    0,
  );
}
