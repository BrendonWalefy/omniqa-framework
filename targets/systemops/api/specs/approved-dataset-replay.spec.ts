import { expect, test } from '@playwright/test';
import { createRunId, e2eSkipReason, systemopsConfig } from '../../systemops.config';
import { agentMessageCount, latestAgentMessage, SystemOpsE2eClient } from '../support/e2eClient';
import {
  loadApprovedReplayDataset,
  type ApprovedReplayScenario,
} from '../support/approvedReplayDataset';

type ReplayTurnResult = {
  scenarioId: string;
  turnId: string;
  inputType: string;
  agentReplied: boolean;
  reply: string;
};

test.describe('SystemOps - replay de dataset sanitizado e aprovado', () => {
  test.beforeEach(async () => {
    if (!systemopsConfig.runApprovedReplay) {
      test.skip(true, 'Replay aprovado não solicitado.');
    }
    const skipReason = e2eSkipReason();
    if (skipReason) test.skip(true, skipReason);
  });

  test('SYS-REPLAY-001 - turnos de texto recebem resposta sem travar o pipeline', async ({ request }) => {
    const dataset = await loadApprovedReplayDataset(
      systemopsConfig.replayDatasetPath,
      systemopsConfig.replayApprovalPublicKeyPath,
    );
    const sampleSize = parseSampleSize(process.env.SYSTEMOPS_REPLAY_SAMPLE_SIZE, dataset.scenarios.length);
    const scenarios = dataset.scenarios.slice(0, sampleSize);
    test.setTimeout(Math.max(180_000, countLeadTextTurns(scenarios) * 35_000));

    const client = new SystemOpsE2eClient(request);
    await client.seed();
    const results: ReplayTurnResult[] = [];

    for (const scenario of scenarios) {
      const runId = createRunId(`replay-${scenario.id}`);
      let expectedAgentCount = 0;
      await client.reset(runId);

      try {
        for (const turn of scenario.turns) {
          if (turn.author !== 'lead' || turn.content.type !== 'text') continue;
          expectedAgentCount++;
          await client.sendLeadMessage(runId, turn.content.text, turn.id);
          try {
            const state = await client.waitForAgentMessage(
              runId,
              expectedAgentCount,
              30_000,
            );
            results.push({
              scenarioId: scenario.id,
              turnId: turn.id,
              inputType: turn.content.type,
              agentReplied: agentMessageCount(state) >= expectedAgentCount,
              reply: latestAgentMessage(state),
            });
          } catch {
            results.push({
              scenarioId: scenario.id,
              turnId: turn.id,
              inputType: turn.content.type,
              agentReplied: false,
              reply: '',
            });
          }
        }
      } finally {
        await client.reset(runId);
      }
    }

    await test.info().attach('approved-replay-results.json', {
      body: Buffer.from(JSON.stringify({
        datasetVersion: dataset.datasetVersion,
        scenarioCount: scenarios.length,
        results,
      }, null, 2)),
      contentType: 'application/json',
    });

    const unanswered = results.filter((result) => !result.agentReplied);
    expect(results.length, 'O dataset aprovado não contém turnos lead/text executáveis.')
      .toBeGreaterThan(0);
    expect(
      unanswered.map(({ scenarioId, turnId }) => ({ scenarioId, turnId })),
      'Turnos aprovados sem resposta da IA.',
    ).toHaveLength(0);
  });
});

function parseSampleSize(raw: string | undefined, available: number): number {
  const parsed = Number(raw ?? '5');
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error('SYSTEMOPS_REPLAY_SAMPLE_SIZE must be a positive integer.');
  }
  return Math.min(parsed, available);
}

function countLeadTextTurns(scenarios: ApprovedReplayScenario[]): number {
  return scenarios.reduce(
    (total, scenario) =>
      total + scenario.turns.filter(
        (turn) => turn.author === 'lead' && turn.content.type === 'text',
      ).length,
    0,
  );
}
