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
  leadTurnWindowStart: number | null;
  leadTurnWindowLimit: number | null;
};

export function selectReplayScenarios(
  dataset: ApprovedReplayDataset,
  rawSampleSize: string | undefined,
  rawMaxLeadTurns: string | undefined,
  rawScenarioId?: string,
  rawLeadTurnWindowStart?: string,
  rawLeadTurnWindowLimit?: string,
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
  const selectedScenarios = targetedScenario
    ? [targetedScenario]
    : evenlyDistributedSample(eligible, selectedCount);
  const leadTurnWindowStart = rawLeadTurnWindowStart
    ? parsePositiveInteger(
        rawLeadTurnWindowStart,
        'SYSTEMOPS_REPLAY_LEAD_TURN_START',
      )
    : null;
  const leadTurnWindowLimit = rawLeadTurnWindowLimit
    ? parsePositiveInteger(
        rawLeadTurnWindowLimit,
        'SYSTEMOPS_REPLAY_LEAD_TURN_LIMIT',
      )
    : null;
  if (leadTurnWindowLimit !== null && leadTurnWindowStart === null) {
    throw new Error(
      'SYSTEMOPS_REPLAY_LEAD_TURN_START is required when SYSTEMOPS_REPLAY_LEAD_TURN_LIMIT is set.',
    );
  }
  const scenarios = leadTurnWindowStart === null
    ? selectedScenarios
    : selectedScenarios.map((scenario) =>
        selectLeadTurnWindow(
          scenario,
          leadTurnWindowStart,
          leadTurnWindowLimit ?? 1,
        ),
      );
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
      leadTurnWindowStart,
      leadTurnWindowLimit,
    },
  };
}

export function selectLeadTurnWindow(
  scenario: ApprovedReplayScenario,
  oneBasedStart: number,
  limit: number,
): ApprovedReplayScenario {
  const leadTurns = scenario.turns.filter((turn) => turn.author === 'lead');
  const selected = leadTurns.slice(oneBasedStart - 1, oneBasedStart - 1 + limit);
  if (selected.length === 0) {
    throw new Error(
      `Scenario "${scenario.id}" has no lead turn at position ${oneBasedStart}.`,
    );
  }
  const firstOffset = selected[0]!.offsetMs;
  return {
    ...scenario,
    tags: [
      ...scenario.tags,
      `runtime-lead-window:${oneBasedStart}-${oneBasedStart + selected.length - 1}`,
    ],
    turns: selected.map((turn) => ({
      ...turn,
      offsetMs: turn.offsetMs - firstOffset,
    })),
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
