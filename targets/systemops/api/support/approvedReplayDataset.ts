import { createHash, createPublicKey, verify } from 'node:crypto';
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
  clock: {
    startedAt: string;
    timezone: string;
  };
  tags: string[];
  turns: ApprovedReplayTurn[];
};

export type ApprovedReplayDataset = {
  schemaVersion: 'replay-dataset.v2';
  datasetVersion: string;
  generatedAt: string;
  status: 'approved';
  sanitization: {
    automated: true;
    humanReviewRequired: true;
    humanReviewApprovedAt: string;
  };
  approval: {
    algorithm: 'ed25519';
    checklistVersion: 'replay-privacy-review.v1';
    approvedAt: string;
    approvedBy: string;
    keyId: string;
    sourceDigest: string;
    signature: string;
  };
  clinic: {
    clinicKey: string;
    timezone: string;
    configFingerprint: string;
    playbookFingerprint: string | null;
  };
  scenarioCount: number;
  scenarios: ApprovedReplayScenario[];
};

export async function loadApprovedReplayDataset(
  configuredPath: string | undefined,
  configuredPublicKeyPath: string | undefined,
): Promise<ApprovedReplayDataset> {
  if (!configuredPath) {
    throw new Error('SYSTEMOPS_REPLAY_DATASET_PATH is required for approved replay.');
  }
  if (!path.isAbsolute(configuredPath)) {
    throw new Error('SYSTEMOPS_REPLAY_DATASET_PATH must be absolute.');
  }
  if (!configuredPublicKeyPath) {
    throw new Error('SYSTEMOPS_REPLAY_APPROVAL_PUBLIC_KEY_PATH is required.');
  }
  if (!path.isAbsolute(configuredPublicKeyPath)) {
    throw new Error('SYSTEMOPS_REPLAY_APPROVAL_PUBLIC_KEY_PATH must be absolute.');
  }

  const [datasetPath, publicKeyPath] = await Promise.all([
    realpath(configuredPath),
    realpath(configuredPublicKeyPath),
  ]);
  await Promise.all([
    assertOutsideGitRepository(path.dirname(datasetPath)),
    assertOutsideGitRepository(path.dirname(publicKeyPath)),
  ]);
  const [datasetContents, publicKeyPem] = await Promise.all([
    readFile(datasetPath, 'utf8'),
    readFile(publicKeyPath),
  ]);
  const parsed = JSON.parse(datasetContents) as unknown;
  assertApprovedReplayDataset(parsed);
  verifyApprovalSignature(parsed, publicKeyPem);
  return parsed;
}

function assertApprovedReplayDataset(value: unknown): asserts value is ApprovedReplayDataset {
  if (!isRecord(value) || value.schemaVersion !== 'replay-dataset.v2') {
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
  if (
    !isRecord(value.approval) ||
    value.approval.algorithm !== 'ed25519' ||
    value.approval.checklistVersion !== 'replay-privacy-review.v1' ||
    typeof value.approval.approvedAt !== 'string' ||
    value.approval.approvedAt !== value.sanitization.humanReviewApprovedAt ||
    typeof value.approval.approvedBy !== 'string' ||
    !/^[a-z0-9][a-z0-9._-]{1,63}$/.test(value.approval.approvedBy) ||
    typeof value.approval.keyId !== 'string' ||
    typeof value.approval.sourceDigest !== 'string' ||
    !/^[a-f0-9]{64}$/.test(value.approval.sourceDigest) ||
    typeof value.approval.signature !== 'string' ||
    !value.approval.signature
  ) {
    throw new Error('Replay dataset has no valid cryptographic approval envelope.');
  }
  if (!Array.isArray(value.scenarios) || value.scenarios.length === 0) {
    throw new Error('Replay dataset must contain scenarios.');
  }
  if (value.scenarioCount !== value.scenarios.length) {
    throw new Error('Replay dataset scenarioCount does not match scenarios.');
  }
  if (
    !isRecord(value.clinic) ||
    typeof value.clinic.clinicKey !== 'string' ||
    typeof value.clinic.configFingerprint !== 'string' ||
    !(
      typeof value.clinic.playbookFingerprint === 'string' ||
      value.clinic.playbookFingerprint === null
    )
  ) {
    throw new Error('Replay dataset has invalid clinic fingerprints.');
  }

  for (const scenario of value.scenarios) {
    if (
      !isRecord(scenario) ||
      scenario.schemaVersion !== 'replay-scenario.v1' ||
      typeof scenario.id !== 'string' ||
      scenario.datasetVersion !== value.datasetVersion ||
      !isRecord(scenario.source) ||
      scenario.source.sanitized !== true ||
      !isRecord(scenario.clinic) ||
      scenario.clinic.clinicKey !== value.clinic.clinicKey ||
      scenario.clinic.configFingerprint !== value.clinic.configFingerprint ||
      scenario.clinic.playbookFingerprint !== value.clinic.playbookFingerprint ||
      !Array.isArray(scenario.compatibleModes) ||
      !scenario.compatibleModes.includes('closed_loop') ||
      scenario.compatibleModes.some((mode) =>
        !['historical_turn', 'closed_loop', 'counterfactual', 'concurrency']
          .includes(String(mode))),
      !Array.isArray(scenario.turns) ||
      scenario.turns.length === 0
    ) {
      throw new Error('Replay dataset contains an invalid scenario.');
    }
    const turnIds = new Set<string>();
    let previousOffset = -1;
    let leadTurnCount = 0;
    for (const turn of scenario.turns) {
      if (
        !isRecord(turn) ||
        typeof turn.id !== 'string' ||
        !turn.id ||
        turnIds.has(turn.id) ||
        !['lead', 'agent', 'operator', 'system'].includes(String(turn.author)) ||
        typeof turn.offsetMs !== 'number' ||
        !Number.isInteger(turn.offsetMs) ||
        turn.offsetMs < 0 ||
        turn.offsetMs < previousOffset ||
        !isRecord(turn.content) ||
        !['text', 'audio', 'image', 'video', 'document'].includes(String(turn.content.type)) ||
        typeof turn.content.text !== 'string'
      ) {
        throw new Error('Replay dataset contains an invalid turn.');
      }
      turnIds.add(turn.id);
      previousOffset = turn.offsetMs;
      if (turn.author === 'lead') leadTurnCount++;
    }
    if (leadTurnCount === 0) {
      throw new Error('Replay scenario must contain at least one lead turn.');
    }
  }
}

function verifyApprovalSignature(
  dataset: ApprovedReplayDataset,
  publicKeyPem: Buffer,
): void {
  const publicKey = createPublicKey(publicKeyPem);
  if (publicKey.asymmetricKeyType !== 'ed25519') {
    throw new Error('Replay approval public key must use Ed25519.');
  }
  const der = publicKey.export({ type: 'spki', format: 'der' });
  const keyId = createHash('sha256').update(der).digest('hex').slice(0, 24);
  if (dataset.approval.keyId !== keyId) {
    throw new Error('Replay dataset approval key is not trusted.');
  }
  const { signature, ...approval } = dataset.approval;
  const payload = stableSerialize({ ...dataset, approval });
  const valid = verify(
    null,
    Buffer.from(payload, 'utf8'),
    publicKey,
    Buffer.from(signature, 'base64'),
  );
  if (!valid) {
    throw new Error('Replay dataset signature is invalid; approved content was changed.');
  }
}

function stableSerialize(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableSerialize(entry)).join(',')}]`;
  }
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableSerialize(record[key])}`)
    .join(',')}}`;
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
