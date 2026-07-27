import type { Finding } from './types';

// Persona: especialista em negócio. Diferente das outras 3 personas, não chama LLM —
// avalia coerência de dados de negócio de forma determinística sobre os insights já
// gerados pelo próprio produto (GET /api/clinic/operational-insights, Fase 1) e a
// matriz de entitlement por plano (docs/operations/e2e-test-plan.md §8 no
// sales-engine). É a persona mais barata de rodar (sem custo de LLM) e a mais direta:
// converte sinais que o produto já coleta em oportunidade de negócio, não só bug.

export type OperationalInsightLike = {
  key: string;
  type: string;
  category: 'operational' | 'ai_quality';
  title: string;
  affectedCount: number;
};

// Limiar a partir do qual um padrão recorrente vira finding de negócio — abaixo disso é
// ruído estatístico (poucos leads mencionando algo não indica padrão real).
const RECURRENCE_THRESHOLD = 3;

export function evaluateOperationalInsights(insights: OperationalInsightLike[]): Finding[] {
  const findings: Finding[] = [];

  const missingTreatments = insights.filter((i) => i.type === 'missing_treatment');
  for (const gap of missingTreatments) {
    if (gap.affectedCount < RECURRENCE_THRESHOLD) continue;
    findings.push({
      persona: 'business',
      severity: gap.affectedCount >= RECURRENCE_THRESHOLD * 2 ? 'high' : 'medium',
      category: 'catalog_gap',
      summary: `${gap.affectedCount} leads mencionaram um serviço fora do catálogo (${gap.title})`,
      evidence: `insight key=${gap.key}, affectedCount=${gap.affectedCount}`,
      suggestion: 'Avaliar se vale cadastrar o serviço — recorrência sugere demanda real perdida.',
    });
  }

  const priceNotSet = insights.filter((i) => i.type === 'price_not_set');
  if (priceNotSet.length > 0) {
    const totalAffected = priceNotSet.reduce((sum, i) => sum + i.affectedCount, 0);
    findings.push({
      persona: 'business',
      severity: totalAffected >= RECURRENCE_THRESHOLD ? 'high' : 'medium',
      category: 'pricing_gap',
      summary: `${priceNotSet.length} tratamento(s) sem preço configurado onde lead perguntou valor`,
      evidence: priceNotSet.map((i) => `${i.title} (${i.affectedCount}x)`).join('; '),
      suggestion: 'Cadastrar preço — pergunta de valor sem resposta é o ponto mais comum de perda de lead quente.',
    });
  }

  const aiQualityIssues = insights.filter((i) => i.category === 'ai_quality');
  const priceObjectionUnresolved = aiQualityIssues.filter((i) => i.type === 'price_objection_unresolved');
  if (priceObjectionUnresolved.reduce((sum, i) => sum + i.affectedCount, 0) >= RECURRENCE_THRESHOLD) {
    findings.push({
      persona: 'business',
      severity: 'high',
      category: 'conversion_risk',
      summary: 'Padrão recorrente de objeção de preço não contornada pela IA',
      evidence: priceObjectionUnresolved.map((i) => `${i.title} (${i.affectedCount}x)`).join('; '),
      suggestion: 'Adicionar objeção de preço explícita ao playbook com resposta de contorno — risco direto de conversão.',
    });
  }

  return findings;
}
