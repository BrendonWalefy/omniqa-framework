import { callModelForJson, parseJsonResponse } from '../llm-judge/callModel';
import type { ConversationArtifact, Finding } from './types';

const MODEL = process.env.SPECIALIST_MODEL ?? process.env.JUDGE_MODEL ?? 'gpt-4o-mini';

// Persona: especialista em vendas/persuasão (ex-SDR). Avalia se a resposta da IA
// contorna objeção, cria urgência sem ser agressiva, e aproveita oportunidades de
// upsell/qualificação — não avalia correção factual (isso é ai-quality.ts).
function buildPrompt(input: ConversationArtifact): string {
  return `Você é um especialista em vendas consultivas (ex-SDR) revisando o atendimento de uma
clínica no WhatsApp. Avalie SÓ a técnica de vendas da resposta da IA, não a correção factual.

## Mensagem do lead
"${input.leadMessage}"

## Resposta da IA
"${input.aiReply}"

## Política comercial
${input.commercialPolicy}

Responda APENAS um JSON válido:
{
  "missedObjectionHandling": <boolean, o lead insinuou uma objeção (preço, tempo, dúvida) que a IA ignorou>,
  "missedUpsellOrQualification": <boolean, havia oportunidade óbvia de qualificar melhor ou mencionar diferencial e a IA não aproveitou>,
  "createsUrgencyAppropriately": <boolean, se aplicável, a resposta cria algum senso de próximo passo sem ser agressiva>,
  "closingTechniqueScore": <número 0-100, quão bem a resposta conduz para o próximo passo da venda (agendar, qualificar)>,
  "reasoning": "<1-2 frases>"
}`;
}

export async function evaluateSalesPersuasion(input: ConversationArtifact): Promise<Finding[]> {
  const raw = await callModelForJson(buildPrompt(input), MODEL, 500);
  const parsed = parseJsonResponse<{
    missedObjectionHandling?: boolean;
    missedUpsellOrQualification?: boolean;
    closingTechniqueScore?: number;
    reasoning?: string;
  }>(raw, 'specialist:sales-persuasion');

  const findings: Finding[] = [];

  if (parsed.missedObjectionHandling) {
    findings.push({
      persona: 'sales-persuasion',
      severity: 'medium',
      category: 'objection_handling',
      summary: 'IA não contornou objeção insinuada pelo lead',
      evidence: `lead: "${input.leadMessage}" → IA: "${input.aiReply}"`,
      suggestion: 'Adicionar ao playbook uma resposta padrão para essa objeção, com contorno explícito.',
    });
  }

  if (parsed.missedUpsellOrQualification) {
    findings.push({
      persona: 'sales-persuasion',
      severity: 'low',
      category: 'missed_opportunity',
      summary: 'Oportunidade de qualificação/diferencial não aproveitada',
      evidence: `lead: "${input.leadMessage}" → IA: "${input.aiReply}" — ${parsed.reasoning ?? ''}`,
      suggestion: 'Revisar se o playbook orienta a IA a mencionar diferenciais/qualificar nesse tipo de mensagem.',
    });
  }

  if (typeof parsed.closingTechniqueScore === 'number' && parsed.closingTechniqueScore < 50) {
    findings.push({
      persona: 'sales-persuasion',
      severity: 'medium',
      category: 'closing_technique',
      summary: `Técnica de condução ao próximo passo fraca (score ${parsed.closingTechniqueScore})`,
      evidence: `lead: "${input.leadMessage}" → IA: "${input.aiReply}"`,
      suggestion: parsed.reasoning ?? 'Revisar se a resposta conduz claramente para agendamento/qualificação.',
    });
  }

  return findings;
}
