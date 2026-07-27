import type { ApprovedReplayScenario } from './approvedReplayDataset';

export type ExecutableReplayMode = 'closed_loop' | 'concurrency';

const EXECUTABLE_MODES = new Set<ExecutableReplayMode>([
  'closed_loop',
  'concurrency',
]);

export function parseReplayModes(
  raw: string | undefined,
): ExecutableReplayMode[] {
  const requested = (raw ?? 'closed_loop,concurrency')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
  if (requested.length === 0) {
    throw new Error('SYSTEMOPS_REPLAY_MODES must select at least one mode.');
  }

  const unique = [...new Set(requested)];
  for (const mode of unique) {
    if (!EXECUTABLE_MODES.has(mode as ExecutableReplayMode)) {
      throw new Error(
        `Unsupported SYSTEMOPS_REPLAY_MODES entry: ${mode}.`,
      );
    }
  }
  return unique as ExecutableReplayMode[];
}

export function executableModesForScenario(
  scenario: ApprovedReplayScenario,
  requestedModes: ExecutableReplayMode[],
): ExecutableReplayMode[] {
  return requestedModes.filter((mode) => {
    if (!scenario.compatibleModes.includes(mode)) return false;
    return mode !== 'concurrency' || hasConsecutiveLeadBurst(scenario);
  });
}

export function hasConsecutiveLeadBurst(
  scenario: ApprovedReplayScenario,
): boolean {
  return scenario.turns.some((turn, index) => {
    const previous = scenario.turns[index - 1];
    return Boolean(
      previous &&
      previous.author === 'lead' &&
      turn.author === 'lead' &&
      turn.offsetMs - previous.offsetMs <= 5_000,
    );
  });
}
