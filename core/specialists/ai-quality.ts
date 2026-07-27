import { callModelForJson, parseJsonResponse } from '../llm-judge/callModel';
import type { ConversationArtifact, Finding } from './types';

const MODEL = process.env.SPECIALIST_MODEL ?? process.env.JUDGE_MODEL ?? 'gpt-4o-mini';

// Persona: engenheiro de IA/NLP. Avalia qualidade linguística em PT-BR (variações
// regionais, naturalidade), robustez a erros de digitação/gírias do lead, e sinais de
// alucinação técnica — lente mais linguística/técnica que o LLM-judge geral
// (core/llm-judge/judge.ts), que foca em aderência ao playbook e progresso da conversa.
function buildPrompt(input: ConversationArtifact): string {
  return `Você é um engenheiro de IA/NLP especializado em português brasileiro, revisando a
qualidade linguística de uma resposta de atendimento automatizado via WhatsApp.

## Mensagem do lead (pode ter erros de digitação, gírias, abreviações — típico de WhatsApp real)
"${input.leadMessage}"

## Resposta da IA
"${input.aiReply}"

Responda APENAS um JSON válido:
{
  "soundsRobotic": <boolean, a resposta soa robótica/genérica demais, não natural em PT-BR>,
  "misunderstoodLeadMessage": <boolean, a resposta indica que a IA não entendeu a mensagem do lead (erro de digitação, gíria, ambiguidade não tratada)>,
  "grammarOrToneIssue": <boolean, erro gramatical ou tom inadequado para PT-BR coloquial de atendimento>,
  "reasoning": "<1-2 frases>"
}`;
}

export async function evaluateAiQuality(input: ConversationArtifact): Promise<Finding[]> {
  const raw = await callModelForJson(buildPrompt(input), MODEL, 400);
  const parsed = parseJsonResponse<{
    soundsRobotic?: boolean;
    misunderstoodLeadMessage?: boolean;
    grammarOrToneIssue?: boolean;
    reasoning?: string;
  }>(raw, 'specialist:ai-quality');

  const findings: Finding[] = [];

  if (parsed.misunderstoodLeadMessage) {
    findings.push({
      persona: 'ai-quality',
      severity: 'high',
      category: 'nlu_miss',
      summary: 'IA parece não ter entendido a mensagem do lead',
      evidence: `lead: "${input.leadMessage}" → IA: "${input.aiReply}" — ${parsed.reasoning ?? ''}`,
      suggestion: 'Revisar classificação de intent para esse padrão de mensagem (IntentClassifier).',
    });
  }

  if (parsed.soundsRobotic) {
    findings.push({
      persona: 'ai-quality',
      severity: 'low',
      category: 'unnatural_language',
      summary: 'Resposta soa robótica/genérica em PT-BR',
      evidence: `IA: "${input.aiReply}"`,
      suggestion: 'Ajustar o tom de voz do playbook ou variar templates de resposta.',
    });
  }

  if (parsed.grammarOrToneIssue) {
    findings.push({
      persona: 'ai-quality',
      severity: 'low',
      category: 'language_quality',
      summary: 'Problema gramatical ou de tom em PT-BR',
      evidence: `IA: "${input.aiReply}" — ${parsed.reasoning ?? ''}`,
      suggestion: 'Revisar template/prompt de composição de resposta.',
    });
  }

  return findings;
}
