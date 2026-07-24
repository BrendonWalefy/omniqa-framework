import { readFile, realpath, stat } from 'node:fs/promises';
import path from 'node:path';

export type ApprovedReplayTurn = {
  id: string;
  author: 'lead' | 'agent' | 'operator' | 'system';
  offsetMs: number;
  content: {
    type: 'text' | 'audio' | 'image' | 'video' | 'document';
    text: string;
  };
};

export type ApprovedReplayScenario = {
  schemaVersion: 'replay-scenario.v1';
  id: string;
  datasetVersion: string;
  source: {
    kind: 'historical' | 'curated' | 'synthetic';
    sourceRef: string;
    sanitized: true;
  };
  clinic: {
    clinicKey: string;
    configFingerprint: string;
    playbookFingerprint: string | null;
  };
  compatibleModes: Array<'historical_turn' | 'closed_loop' | 'counterfactual' | 'concurrency'>;
  turns: ApprovedReplayTurn[];
};

export type ApprovedReplayDataset = {
  schemaVersion: 'replay-dataset.v1';
  datasetVersion: string;
  generatedAt: string;
  status: 'approved';
  sanitization: {
    automated: true;
    humanReviewRequired: true;
    humanReviewApprovedAt: string;
  };
  scenarioCount: number;
  scenarios: ApprovedReplayScenario[];
};

export async function loadApprovedReplayDataset(
  configuredPath: string | undefined,
): Promise<ApprovedReplayDataset> {
  if (!configuredPath) {
    throw new Error('SYSTEMOPS_REPLAY_DATASET_PATH is required for approved replay.');
  }
  if (!path.isAbsolute(configuredPath)) {
    throw new Error('SYSTEMOPS_REPLAY_DATASET_PATH must be absolute.');
  }

  const datasetPath = await realpath(configuredPath);
  await assertOutsideGitRepository(path.dirname(datasetPath));
  const parsed = JSON.parse(await readFile(datasetPath, 'utf8')) as unknown;
  assertApprovedReplayDataset(parsed);
  return parsed;
}

function assertApprovedReplayDataset(value: unknown): asserts value is ApprovedReplayDataset {
  if (!isRecord(value) || value.schemaVersion !== 'replay-dataset.v1') {
    throw new Error('Unsupported replay dataset schema.');
  }
  if (value.status !== 'approved') {
    throw new Error('Replay dataset must have status=approved.');
  }
  if (
    !isRecord(value.sanitization) ||
    value.sanitization.automated !== true ||
    value.sanitization.humanReviewRequired !== true ||
    typeof value.sanitization.humanReviewApprovedAt !== 'string' ||
    !value.sanitization.humanReviewApprovedAt
  ) {
    throw new Error('Replay dataset has no valid human approval.');
  }
  if (!Array.isArray(value.scenarios) || value.scenarios.length === 0) {
    throw new Error('Replay dataset must contain scenarios.');
  }
  if (value.scenarioCount !== value.scenarios.length) {
    throw new Error('Replay dataset scenarioCount does not match scenarios.');
  }

  for (const scenario of value.scenarios) {
    if (
      !isRecord(scenario) ||
      scenario.schemaVersion !== 'replay-scenario.v1' ||
      typeof scenario.id !== 'string' ||
      !isRecord(scenario.source) ||
      scenario.source.sanitized !== true ||
      !Array.isArray(scenario.turns) ||
      scenario.turns.length === 0
    ) {
      throw new Error('Replay dataset contains an invalid scenario.');
    }
    for (const turn of scenario.turns) {
      if (
        !isRecord(turn) ||
        typeof turn.id !== 'string' ||
        !['lead', 'agent', 'operator', 'system'].includes(String(turn.author)) ||
        !isRecord(turn.content) ||
        !['text', 'audio', 'image', 'video', 'document'].includes(String(turn.content.type)) ||
        typeof turn.content.text !== 'string'
      ) {
        throw new Error('Replay dataset contains an invalid turn.');
      }
    }
  }
}

async function assertOutsideGitRepository(directory: string): Promise<void> {
  let current = directory;
  while (true) {
    if (await pathExists(path.join(current, '.git'))) {
      throw new Error('Approved replay dataset must be stored outside a Git repository.');
    }
    const parent = path.dirname(current);
    if (parent === current) return;
    current = parent;
  }
}

async function pathExists(target: string): Promise<boolean> {
  try {
    await stat(target);
    return true;
  } catch {
    return false;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}
