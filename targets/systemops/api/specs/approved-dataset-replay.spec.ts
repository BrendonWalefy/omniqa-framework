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
import {
  leadTurnCount,
  selectReplayScenarios,
} from '../support/selectReplayScenarios';
import {
  applyReplayBehaviorContract,
  loadReplayBehaviorContract,
} from '../support/replayBehaviorContract';
import {
  executableModesForScenario,
  parseReplayModes,
} from '../support/replayModes';

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
    const selection = selectReplayScenarios(
      dataset,
      process.env.SYSTEMOPS_REPLAY_SAMPLE_SIZE,
      process.env.SYSTEMOPS_REPLAY_MAX_LEAD_TURNS_PER_SCENARIO,
      process.env.SYSTEMOPS_REPLAY_SCENARIO_ID,
      process.env.SYSTEMOPS_REPLAY_LEAD_TURN_START,
      process.env.SYSTEMOPS_REPLAY_LEAD_TURN_LIMIT,
    );
    const repetitions = parseRepetitions(
      process.env.SYSTEMOPS_REPLAY_REPETITIONS,
    );
    const scenarios = selection.scenarios;
    const requestedModes = parseReplayModes(systemopsConfig.replayModes);
    const executions = scenarios.flatMap((scenario) =>
      executableModesForScenario(scenario, requestedModes).map((mode) => ({
        scenario,
        mode,
      })),
    );
    if (executions.length === 0) {
      throw new Error('No selected replay scenario supports the requested modes.');
    }
    const behaviorContract = loadReplayBehaviorContract(process.env);
    test.setTimeout(
      Math.max(
        300_000,
        executions.reduce(
          (total, execution) => total + leadTurnCount(execution.scenario),
          0,
        ) * repetitions * 45_000,
      ),
    );

    const client = new SystemOpsE2eClient(request);
    const runs: ReplayScenarioRun[] = [];
    for (const { scenario, mode } of executions) {
      for (let repetition = 1; repetition <= repetitions; repetition++) {
        const runId = createRunId(`${scenario.id}-${mode}-r${repetition}`);
        runs.push(applyReplayBehaviorContract(
          await client.runReplayScenario(runId, scenario, mode),
          behaviorContract,
        ));
      }
    }

    await test.info().attach('approved-replay-results.json', {
      body: Buffer.from(JSON.stringify({
        datasetVersion: dataset.datasetVersion,
        scenarioCount: scenarios.length,
        requestedModes,
        executionCount: executions.length,
        repetitions,
        selection: selection.summary,
        runs,
      }, null, 2)),
      contentType: 'application/json',
    });
    const report = buildReplayBaselineReport(
      dataset,
      runs,
      new Date(),
      selection.summary,
    );
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

function parseRepetitions(raw: string | undefined): number {
  const parsed = Number(raw ?? '3');
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 10) {
    throw new Error('SYSTEMOPS_REPLAY_REPETITIONS must be an integer from 1 to 10.');
  }
  return parsed;
}

function countLeadTurns(
  scenarios: Parameters<typeof leadTurnCount>[0][],
): number {
  return scenarios.reduce(
    (total, scenario) => total + leadTurnCount(scenario),
    0,
  );
}
