import { createHash } from 'node:crypto';
import { mkdir, realpath, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { ApprovedReplayDataset } from './approvedReplayDataset';
import type { ReplayScenarioRun } from './e2eClient';

export type ReplayFinding = {
  severity: 'high' | 'medium' | 'low';
  code: string;
  scenarioId: string;
  runId: string;
  description: string;
};

export type ReplayBaselineReport = {
  schemaVersion: 'systemops-replay-baseline-report.v1';
  generatedAt: string;
  clinicKey: string;
  datasetVersion: string;
  scenarioCount: number;
  runCount: number;
  metrics: {
    deterministicChecksPassed: number;
    deterministicChecksTotal: number;
    deterministicPassRate: number;
    runsWithTrace: number;
    runsWithDelivery: number;
    meanIntentConfidence: number | null;
    repeatedScenarioIntentAgreement: number | null;
    operationalConfidence: number;
  };
  findings: ReplayFinding[];
  runs: ReplayScenarioRun[];
};

const CLINIC_TERMS: Record<string, string[]> = {
  ximendes: ['vitalli', 'nc beauty', 'maycon bordados'],
  'clinica-vitalli': ['ximendes', 'nc beauty', 'maycon bordados'],
  'nc-beauty-clinic': ['ximendes', 'vitalli', 'maycon bordados'],
  'maycon-bordados': ['ximendes', 'vitalli', 'nc beauty'],
};

export function buildReplayBaselineReport(
  dataset: ApprovedReplayDataset,
  runs: ReplayScenarioRun[],
  generatedAt = new Date(),
): ReplayBaselineReport {
  const findings = runs.flatMap((run) => findRunIssues(dataset.clinic.clinicKey, run));
  const checks = runs.flatMap((run) => run.checks);
  const checksPassed = checks.filter((check) => check.passed).length;
  const runsWithTrace = runs.filter((run) => run.trace.length > 0).length;
  const runsWithDelivery = runs.filter((run) => run.effects.outbound.length > 0).length;
  const confidences = runs.flatMap(intentConfidences);
  const passRate = ratio(checksPassed, checks.length);
  const traceRate = ratio(runsWithTrace, runs.length);
  const deliveryRate = ratio(runsWithDelivery, runs.length);
  const meanIntentConfidence = confidences.length
    ? round(confidences.reduce((sum, value) => sum + value, 0) / confidences.length)
    : null;
  const repeatedScenarioIntentAgreement = intentAgreement(runs);
  const highSeverityPenalty =
    findings.filter((finding) => finding.severity === 'high').length * 0.1;
  const operationalConfidence = round(Math.max(
    0,
    Math.min(
      1,
      passRate * 0.5 +
        traceRate * 0.2 +
        deliveryRate * 0.2 +
        (repeatedScenarioIntentAgreement ?? 1) * 0.1 -
        highSeverityPenalty,
    ),
  ));

  return {
    schemaVersion: 'systemops-replay-baseline-report.v1',
    generatedAt: generatedAt.toISOString(),
    clinicKey: dataset.clinic.clinicKey,
    datasetVersion: dataset.datasetVersion,
    scenarioCount: new Set(runs.map((run) => run.scenarioId)).size,
    runCount: runs.length,
    metrics: {
      deterministicChecksPassed: checksPassed,
      deterministicChecksTotal: checks.length,
      deterministicPassRate: passRate,
      runsWithTrace,
      runsWithDelivery,
      meanIntentConfidence,
      repeatedScenarioIntentAgreement,
      operationalConfidence,
    },
    findings,
    runs,
  };
}

export function renderReplayBaselineMarkdown(report: ReplayBaselineReport): string {
  const lines = [
    `# Baseline conversacional — ${escapeInline(report.clinicKey)}`,
    '',
    `- Dataset: \`${escapeInline(report.datasetVersion)}\``,
    `- Cenários executados: ${report.scenarioCount}`,
    `- Execuções: ${report.runCount}`,
    `- Confiança operacional: ${formatPercent(report.metrics.operationalConfidence)}`,
    `- Checks determinísticos: ${report.metrics.deterministicChecksPassed}/${report.metrics.deterministicChecksTotal} (${formatPercent(report.metrics.deterministicPassRate)})`,
    `- Runs com Decision Trace: ${report.metrics.runsWithTrace}/${report.runCount}`,
    `- Runs com entrega capturada: ${report.metrics.runsWithDelivery}/${report.runCount}`,
    `- Confiança média de intenção: ${report.metrics.meanIntentConfidence === null ? 'indisponível' : formatPercent(report.metrics.meanIntentConfidence)}`,
    `- Concordância de intenção entre repetições: ${report.metrics.repeatedScenarioIntentAgreement === null ? 'sem repetições comparáveis' : formatPercent(report.metrics.repeatedScenarioIntentAgreement)}`,
    '',
    'A confiança acima mede integridade operacional e repetibilidade. Ela não',
    'substitui a avaliação humana de correção comercial, tom ou qualidade clínica.',
    '',
    '## Achados',
    '',
  ];

  if (report.findings.length === 0) {
    lines.push('Nenhum achado automático.', '');
  } else {
    for (const finding of report.findings) {
      lines.push(
        `- **${finding.severity.toUpperCase()} · ${finding.code}** — ${escapeInline(finding.scenarioId)} / ${escapeInline(finding.runId)}: ${escapeInline(finding.description)}`,
      );
    }
    lines.push('');
  }

  return `${lines.join('\n')}\n`;
}

export function renderReplayConversationsMarkdown(report: ReplayBaselineReport): string {
  const lines = [
    `# Conversas do baseline — ${escapeInline(report.clinicKey)}`,
    '',
    '> Conteúdo privado de QA. Não compartilhar fora do ambiente autorizado.',
    '',
  ];
  for (const run of report.runs) {
    lines.push(
      `## ${escapeInline(run.scenarioId)} · ${escapeInline(run.runId)}`,
      '',
    );
    for (const message of run.transcript) {
      lines.push(
        `### ${roleLabel(message.author)}${message.intent ? ` · ${escapeInline(message.intent)}` : ''}`,
        '',
        ...escapeBlockquote(message.body),
        '',
      );
    }
  }
  return `${lines.join('\n')}\n`;
}

export async function persistReplayBaselineReport(
  configuredDirectory: string,
  report: ReplayBaselineReport,
): Promise<{
  jsonPath: string;
  markdownPath: string;
  conversationsPath: string;
}> {
  if (!path.isAbsolute(configuredDirectory)) {
    throw new Error('SYSTEMOPS_REPLAY_RESULTS_DIR must be absolute.');
  }
  await mkdir(configuredDirectory, { recursive: true, mode: 0o700 });
  const directory = await realpath(configuredDirectory);
  await assertOutsideGitRepository(directory);
  const stamp = report.generatedAt.replace(/[:.]/g, '-');
  const safeClinic = report.clinicKey.replace(/[^a-zA-Z0-9._-]/g, '_');
  const digest = createHash('sha256')
    .update(report.runs.map((run) => run.runId).join('\u001f'))
    .digest('hex')
    .slice(0, 10);
  const base = path.join(directory, `${safeClinic}.${stamp}.${digest}`);
  const jsonPath = `${base}.results.json`;
  const markdownPath = `${base}.report.md`;
  const conversationsPath = `${base}.conversations.md`;
  await Promise.all([
    writePrivate(jsonPath, `${JSON.stringify(report, null, 2)}\n`),
    writePrivate(markdownPath, renderReplayBaselineMarkdown(report)),
    writePrivate(conversationsPath, renderReplayConversationsMarkdown(report)),
  ]);
  return { jsonPath, markdownPath, conversationsPath };
}

function findRunIssues(clinicKey: string, run: ReplayScenarioRun): ReplayFinding[] {
  const findings: ReplayFinding[] = [];
  for (const check of run.checks.filter((entry) => !entry.passed)) {
    findings.push({
      severity: 'high',
      code: `failed_check:${check.code}`,
      scenarioId: run.scenarioId,
      runId: run.runId,
      description: `O check determinístico "${check.code}" falhou.`,
    });
  }
  const agentMessages = run.transcript.filter((message) => message.author === 'agent');
  for (let index = 1; index < agentMessages.length; index++) {
    if (
      normalize(agentMessages[index - 1]!.body) &&
      normalize(agentMessages[index - 1]!.body) === normalize(agentMessages[index]!.body)
    ) {
      findings.push({
        severity: 'medium',
        code: 'duplicate_agent_message',
        scenarioId: run.scenarioId,
        runId: run.runId,
        description: 'Duas mensagens consecutivas da IA são idênticas.',
      });
    }
  }
  const agentTranscript = agentMessages
    .map((message) => message.body)
    .join('\n')
    .toLocaleLowerCase('pt-BR');
  for (const term of CLINIC_TERMS[clinicKey] ?? []) {
    if (agentTranscript.includes(term)) {
      findings.push({
        severity: 'high',
        code: 'cross_clinic_reference',
        scenarioId: run.scenarioId,
        runId: run.runId,
        description: `A resposta menciona termo associado a outro tenant: "${term}".`,
      });
    }
  }
  for (const message of agentMessages.filter((entry) => entry.body.length > 1_500)) {
    findings.push({
      severity: 'low',
      code: 'very_long_agent_message',
      scenarioId: run.scenarioId,
      runId: run.runId,
      description: `Resposta da IA com ${message.body.length} caracteres.`,
    });
  }
  return findings;
}

function intentConfidences(run: ReplayScenarioRun): number[] {
  return run.trace.flatMap((event) => {
    if (event.stage !== 'intent.classified') return [];
    const value = event.metadata?.confidence;
    return typeof value === 'number' && Number.isFinite(value) ? [value] : [];
  });
}

function intentAgreement(runs: ReplayScenarioRun[]): number | null {
  const byScenario = new Map<string, ReplayScenarioRun[]>();
  for (const run of runs) {
    const entries = byScenario.get(run.scenarioId) ?? [];
    entries.push(run);
    byScenario.set(run.scenarioId, entries);
  }
  const comparable = [...byScenario.values()].filter((entries) => entries.length > 1);
  if (comparable.length === 0) return null;
  const agreements = comparable.map((entries) => {
    const signatures = entries.map(intentSignature);
    const counts = new Map<string, number>();
    signatures.forEach((signature) =>
      counts.set(signature, (counts.get(signature) ?? 0) + 1),
    );
    return Math.max(...counts.values()) / entries.length;
  });
  return round(
    agreements.reduce((sum, value) => sum + value, 0) / agreements.length,
  );
}

function intentSignature(run: ReplayScenarioRun): string {
  return run.trace
    .filter((event) => event.stage === 'intent.resolved')
    .map((event) => String(
      event.metadata?.finalIntent ??
      event.metadata?.intent ??
      event.metadata?.resolvedIntent ??
      'unknown',
    ))
    .join('|');
}

async function writePrivate(filePath: string, content: string): Promise<void> {
  await writeFile(filePath, content, {
    encoding: 'utf8',
    mode: 0o600,
    flag: 'wx',
  });
}

async function assertOutsideGitRepository(directory: string): Promise<void> {
  let current = directory;
  while (true) {
    if (await exists(path.join(current, '.git'))) {
      throw new Error('Replay result directory must be outside every Git repository.');
    }
    const parent = path.dirname(current);
    if (parent === current) return;
    current = parent;
  }
}

async function exists(target: string): Promise<boolean> {
  try {
    await stat(target);
    return true;
  } catch {
    return false;
  }
}

function ratio(numerator: number, denominator: number): number {
  return denominator === 0 ? 0 : round(numerator / denominator);
}

function round(value: number): number {
  return Math.round(value * 10_000) / 10_000;
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function normalize(value: string): string {
  return value.normalize('NFKC').toLocaleLowerCase('pt-BR').replace(/\s+/g, ' ').trim();
}

function roleLabel(author: string): string {
  if (author === 'lead') return 'LEAD';
  if (author === 'agent') return 'IA';
  if (author === 'clinic_user') return 'EQUIPE';
  return 'SISTEMA';
}

function escapeInline(value: string): string {
  return value.replace(/[`\\]/g, '\\$&');
}

function escapeBlockquote(value: string): string[] {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .split(/\r?\n/)
    .map((line) => `> ${line}`);
}
