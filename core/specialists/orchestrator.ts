import type { ConversationArtifact, Finding } from './types';
import { evaluateSalesPersuasion } from './sales-persuasion';
import { evaluateConversationUX } from './ux';
import { evaluateAiQuality } from './ai-quality';
import { evaluateOperationalInsights, type OperationalInsightLike } from './business';

export type SpecialistReport = {
  findings: Finding[];
  bySeverity: { high: number; medium: number; low: number };
  byPersona: Record<string, number>;
};

// Roda as 3 personas baseadas em LLM (sales-persuasion, ux, ai-quality) sobre um
// artefato de conversa. A integração com o replay aprovado será retomada quando
// o SystemOps fornecer histórico, configuração e trace pelo contrato versionado;
// avaliar uma resposta isolada com playbook hardcoded produz confiança falsa.
export async function runConversationSpecialists(artifact: ConversationArtifact): Promise<Finding[]> {
  const [sales, ux, aiQuality] = await Promise.all([
    evaluateSalesPersuasion(artifact),
    evaluateConversationUX(artifact),
    evaluateAiQuality(artifact),
  ]);
  return [...sales, ...ux, ...aiQuality];
}

// Persona de negócio é síncrona/determinística (sem custo de LLM) — roda separada,
// sobre os insights operacionais já coletados (não por conversa individual).
export function runBusinessSpecialist(insights: OperationalInsightLike[]): Finding[] {
  return evaluateOperationalInsights(insights);
}

export function summarize(findings: Finding[]): SpecialistReport {
  const bySeverity = { high: 0, medium: 0, low: 0 };
  const byPersona: Record<string, number> = {};

  for (const f of findings) {
    bySeverity[f.severity] += 1;
    byPersona[f.persona] = (byPersona[f.persona] ?? 0) + 1;
  }

  return { findings, bySeverity, byPersona };
}
