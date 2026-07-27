import { createHash } from 'node:crypto';
import { mkdir, realpath, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { ApprovedReplayDataset } from './approvedReplayDataset';
import type { ReplayScenarioRun } from './e2eClient';
import type { ReplaySelectionSummary } from './selectReplayScenarios';

export type ReplayFinding = {
  severity: 'high' | 'medium' | 'low';
  code: string;
  scenarioId: string;
  runId: string;
  description: string;
};

export type ReplayBaselineReport = {
  schemaVersion: 'systemops-replay-baseline-report.v2';
  generatedAt: string;
  clinicKey: string;
  datasetVersion: string;
  scenarioCount: number;
  runCount: number;
  selection: ReplaySelectionSummary | null;
  metrics: {
    deterministicChecksPassed: number;
    deterministicChecksTotal: number;
    deterministicPassRate: number;
    runsWithTrace: number;
    runsWithDelivery: number;
    auxiliaryEffectsCaptured: number;
    ignoredTurnsByReason: Record<string, number>;
    meanIntentConfidence: number | null;
    repeatedScenarioIntentAgreement: number | null;
    repeatedScenarioDecisionPathAgreement: number | null;
    operationalConfidence: number;
    runsByMode: Record<string, number>;
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
  selection: ReplaySelectionSummary | null = null,
): ReplayBaselineReport {
  const findings = [
    ...runs.flatMap((run) => findRunIssues(dataset.clinic.clinicKey, run)),
    ...findRepeatedRunIssues(runs),
  ];
  const checks = runs.flatMap((run) => run.checks);
  const checksPassed = checks.filter((check) => check.passed).length;
  const runsWithTrace = runs.filter((run) => run.trace.length > 0).length;
  const runsWithDelivery = runs.filter((run) => run.effects.outbound.length > 0).length;
  const auxiliaryEffectsCaptured = runs.reduce(
    (total, run) => total + (run.effects.auxiliary?.length ?? 0),
    0,
  );
  const ignoredTurnsByReason = countIgnoredTurnReasons(runs);
  const confidences = runs.flatMap(intentConfidences);
  const passRate = ratio(checksPassed, checks.length);
  const traceRate = ratio(runsWithTrace, runs.length);
  const deliveryRate = ratio(runsWithDelivery, runs.length);
  const meanIntentConfidence = confidences.length
    ? round(confidences.reduce((sum, value) => sum + value, 0) / confidences.length)
    : null;
  const repeatedScenarioIntentAgreement = intentAgreement(runs);
  const repeatedScenarioDecisionPathAgreement = decisionPathAgreement(runs);
  const highSeverityPenalty =
    findings.filter((finding) => finding.severity === 'high').length * 0.1;
  const operationalConfidence = round(Math.max(
    0,
    Math.min(
      1,
      passRate * 0.45 +
        traceRate * 0.15 +
        deliveryRate * 0.15 +
        (repeatedScenarioIntentAgreement ?? 1) * 0.1 +
        (repeatedScenarioDecisionPathAgreement ?? 1) * 0.15 -
        highSeverityPenalty,
    ),
  ));

  return {
    schemaVersion: 'systemops-replay-baseline-report.v2',
    generatedAt: generatedAt.toISOString(),
    clinicKey: dataset.clinic.clinicKey,
    datasetVersion: dataset.datasetVersion,
    scenarioCount: new Set(runs.map((run) => run.scenarioId)).size,
    runCount: runs.length,
    selection,
    metrics: {
      deterministicChecksPassed: checksPassed,
      deterministicChecksTotal: checks.length,
      deterministicPassRate: passRate,
      runsWithTrace,
      runsWithDelivery,
      auxiliaryEffectsCaptured,
      ignoredTurnsByReason,
      meanIntentConfidence,
      repeatedScenarioIntentAgreement,
      repeatedScenarioDecisionPathAgreement,
      operationalConfidence,
      runsByMode: countRunsByMode(runs),
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
    `- Modos executados: ${formatReasonCounts(report.metrics.runsByMode)}`,
    ...(report.selection
      ? [
          `- Cenários no dataset: ${report.selection.datasetScenarios}`,
          `- Elegíveis no orçamento: ${report.selection.eligibleWithinTurnBudget}`,
          `- Excluídos por excesso de turnos: ${report.selection.excludedOverTurnBudget}`,
          `- Limite de mensagens do lead por cenário: ${report.selection.maxLeadTurnsPerScenario}`,
          ...(report.selection.targetedScenarioId
            ? [`- Cenário direcionado: \`${escapeInline(report.selection.targetedScenarioId)}\``]
            : []),
        ]
      : []),
    `- Confiança operacional: ${formatPercent(report.metrics.operationalConfidence)}`,
    `- Checks determinísticos: ${report.metrics.deterministicChecksPassed}/${report.metrics.deterministicChecksTotal} (${formatPercent(report.metrics.deterministicPassRate)})`,
    `- Runs com Decision Trace: ${report.metrics.runsWithTrace}/${report.runCount}`,
    `- Runs com entrega capturada: ${report.metrics.runsWithDelivery}/${report.runCount}`,
    `- Efeitos auxiliares capturados: ${report.metrics.auxiliaryEffectsCaptured}`,
    `- Turnos sem resposta: ${formatReasonCounts(report.metrics.ignoredTurnsByReason)}`,
    `- Confiança média de intenção: ${report.metrics.meanIntentConfidence === null ? 'indisponível' : formatPercent(report.metrics.meanIntentConfidence)}`,
    `- Concordância de intenção entre repetições: ${report.metrics.repeatedScenarioIntentAgreement === null ? 'sem repetições comparáveis' : formatPercent(report.metrics.repeatedScenarioIntentAgreement)}`,
    `- Concordância de caminho entre repetições: ${report.metrics.repeatedScenarioDecisionPathAgreement === null ? 'sem repetições comparáveis' : formatPercent(report.metrics.repeatedScenarioDecisionPathAgreement)}`,
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
  const ignoredReasons = new Set(run.trace.flatMap((event) =>
    event.stage === 'turn.ignored' && typeof event.metadata?.reason === 'string'
      ? [event.metadata.reason]
      : [],
  ));
  if (ignoredReasons.has('automation_reply_disabled')) {
    findings.push({
      severity: 'high',
      code: 'automation_disabled',
      scenarioId: run.scenarioId,
      runId: run.runId,
      description:
        'A política da clínica desativou toda resposta automática neste cenário.',
    });
  }
  if (ignoredReasons.has('orchestrator_no_reply')) {
    findings.push({
      severity: 'high',
      code: 'unexplained_silence',
      scenarioId: run.scenarioId,
      runId: run.runId,
      description:
        'O orquestrador encerrou ao menos um turno sem resposta e sem motivo específico.',
    });
  }
  return findings;
}

function findRepeatedRunIssues(runs: ReplayScenarioRun[]): ReplayFinding[] {
  const findings: ReplayFinding[] = [];
  for (const entries of groupRunsByScenarioAndMode(runs).values()) {
    if (entries.length < 2) continue;
    const scenarioId = entries[0]!.scenarioId;
    const mode = entries[0]!.mode;
    const signatures = new Set(entries.map(decisionPathSignature));
    if (signatures.size > 1) {
      findings.push({
        severity: 'high',
        code: 'decision_path_divergence',
        scenarioId,
        runId: 'cross-run',
        description:
          `O mesmo cenário em ${mode} percorreu ${signatures.size} caminhos de estado/decisão em ${entries.length} repetições.`,
      });
    }
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
  const comparable = [...groupRunsByScenarioAndMode(runs).values()]
    .filter((entries) => entries.length > 1);
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

function decisionPathAgreement(runs: ReplayScenarioRun[]): number | null {
  const comparable = [...groupRunsByScenarioAndMode(runs).values()]
    .filter((entries) => entries.length > 1);
  if (comparable.length === 0) return null;
  const agreements = comparable.map((entries) => {
    const counts = new Map<string, number>();
    entries.map(decisionPathSignature).forEach((signature) =>
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

function decisionPathSignature(run: ReplayScenarioRun): string {
  const turnIds = [...new Set(run.trace.map((event) => event.turnId))];
  return JSON.stringify(turnIds.map((turnId) => {
    const events = run.trace.filter((event) => event.turnId === turnId);
    const metadata = (stage: string) =>
      events.find((event) => event.stage === stage)?.metadata;
    const loaded = metadata('state.loaded');
    const classified = metadata('intent.classified');
    const resolved = metadata('intent.resolved');
    const beforeDelivery = metadata('state.before_delivery');
    const outbound = metadata('outbound.planned');
    const ignored = metadata('turn.ignored');
    return {
      loadedState: loaded?.state ?? 'missing',
      classifierSource: classified?.source ?? 'missing',
      classifiedIntent: classified?.intent ?? 'missing',
      finalIntent:
        resolved?.finalIntent ??
        resolved?.resolvedIntent ??
        resolved?.intent ??
        'missing',
      deliveryState: beforeDelivery?.state ?? 'missing',
      outboundIntent: outbound?.intent ?? 'missing',
      pipelineAdvance: beforeDelivery?.pendingPipelineAdvance ?? 'missing',
      interleavedPartCount: outbound?.interleavedPartCount ?? 'missing',
      mediaPartCount: outbound?.mediaPartCount ?? 'missing',
      ignoredReason: ignored?.reason ?? 'none',
    };
  }));
}

function countIgnoredTurnReasons(
  runs: ReplayScenarioRun[],
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const event of runs.flatMap((run) => run.trace)) {
    if (event.stage !== 'turn.ignored') continue;
    const reason = typeof event.metadata?.reason === 'string'
      ? event.metadata.reason
      : 'unknown';
    counts[reason] = (counts[reason] ?? 0) + 1;
  }
  return counts;
}

function formatReasonCounts(counts: Record<string, number>): string {
  const entries = Object.entries(counts).sort(([left], [right]) =>
    left.localeCompare(right),
  );
  return entries.length
    ? entries.map(([reason, count]) => `${reason}=${count}`).join(', ')
    : '0';
}

function groupRunsByScenarioAndMode(
  runs: ReplayScenarioRun[],
): Map<string, ReplayScenarioRun[]> {
  const grouped = new Map<string, ReplayScenarioRun[]>();
  for (const run of runs) {
    const key = `${run.scenarioId}\u0000${run.mode}`;
    const entries = grouped.get(key) ?? [];
    entries.push(run);
    grouped.set(key, entries);
  }
  return grouped;
}

function countRunsByMode(runs: ReplayScenarioRun[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const run of runs) {
    counts[run.mode] = (counts[run.mode] ?? 0) + 1;
  }
  return counts;
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
