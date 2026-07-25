import type {
  ApprovedReplayDataset,
  ApprovedReplayScenario,
} from './approvedReplayDataset';

export type ReplaySelectionSummary = {
  datasetScenarios: number;
  closedLoopCompatible: number;
  eligibleWithinTurnBudget: number;
  excludedOverTurnBudget: number;
  selected: number;
  maxLeadTurnsPerScenario: number;
  targetedScenarioId: string | null;
};

export function selectReplayScenarios(
  dataset: ApprovedReplayDataset,
  rawSampleSize: string | undefined,
  rawMaxLeadTurns: string | undefined,
  rawScenarioId?: string,
): {
  scenarios: ApprovedReplayScenario[];
  summary: ReplaySelectionSummary;
} {
  const sampleSize = parsePositiveInteger(
    rawSampleSize ?? '5',
    'SYSTEMOPS_REPLAY_SAMPLE_SIZE',
  );
  const maxLeadTurnsPerScenario = parsePositiveInteger(
    rawMaxLeadTurns ?? '12',
    'SYSTEMOPS_REPLAY_MAX_LEAD_TURNS_PER_SCENARIO',
  );
  const compatible = dataset.scenarios.filter(
    (scenario) =>
      scenario.compatibleModes.includes('closed_loop') &&
      leadTurnCount(scenario) > 0,
  );
  const eligible = compatible.filter(
    (scenario) => leadTurnCount(scenario) <= maxLeadTurnsPerScenario,
  );
  if (eligible.length === 0) {
    throw new Error(
      `No closed-loop scenario fits the ${maxLeadTurnsPerScenario}-lead-turn budget.`,
    );
  }
  const targetedScenarioId = rawScenarioId?.trim() || null;
  const targetedScenario = targetedScenarioId
    ? eligible.find((scenario) => scenario.id === targetedScenarioId)
    : null;
  if (targetedScenarioId && !targetedScenario) {
    const datasetScenario = dataset.scenarios.find(
      (scenario) => scenario.id === targetedScenarioId,
    );
    const reason = !datasetScenario
      ? 'does not exist in the approved dataset'
      : !datasetScenario.compatibleModes.includes('closed_loop')
        ? 'is not compatible with closed_loop'
        : `${leadTurnCount(datasetScenario)} lead turns exceed the ${maxLeadTurnsPerScenario}-turn budget`;
    throw new Error(
      `SYSTEMOPS_REPLAY_SCENARIO_ID "${targetedScenarioId}" ${reason}.`,
    );
  }
  const selectedCount = Math.min(sampleSize, eligible.length);
  const scenarios = targetedScenario
    ? [targetedScenario]
    : evenlyDistributedSample(eligible, selectedCount);
  return {
    scenarios,
    summary: {
      datasetScenarios: dataset.scenarios.length,
      closedLoopCompatible: compatible.length,
      eligibleWithinTurnBudget: eligible.length,
      excludedOverTurnBudget: compatible.length - eligible.length,
      selected: scenarios.length,
      maxLeadTurnsPerScenario,
      targetedScenarioId,
    },
  };
}

export function leadTurnCount(scenario: ApprovedReplayScenario): number {
  return scenario.turns.filter((turn) => turn.author === 'lead').length;
}

function evenlyDistributedSample<T>(values: T[], size: number): T[] {
  if (size >= values.length) return [...values];
  return Array.from({ length: size }, (_, index) => {
    const position = Math.floor(index * values.length / size);
    return values[position]!;
  });
}

function parsePositiveInteger(raw: string, name: string): number {
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 500) {
    throw new Error(`${name} must be an integer from 1 to 500.`);
  }
  return parsed;
}
