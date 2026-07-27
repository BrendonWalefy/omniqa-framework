import { callModelForJson, parseJsonResponse } from '../llm-judge/callModel';
import type { ConversationArtifact, Finding } from './types';

const MODEL = process.env.SPECIALIST_MODEL ?? process.env.JUDGE_MODEL ?? 'gpt-4o-mini';

// Persona: especialista em UX. Hoje avalia clareza/fricção na experiência de conversa
// (copy confuso, próximo passo pouco claro, carga cognitiva). Extensão prevista para a
// Fase 4 (validação visual): quando houver screenshots do dashboard, adicionar
// `evaluateScreenshotUX(description: string, pageName: string)` seguindo o mesmo padrão
// de prompt+Finding[] — não implementado ainda porque a Fase 4 ainda não gera as
// descrições/screenshots que essa função consumiria.
function buildConversationPrompt(input: ConversationArtifact): string {
  return `Você é um especialista em UX de conversas (chat/WhatsApp). Avalie SÓ a experiência
de leitura/clareza da resposta da IA — não avalie técnica de vendas nem correção factual.

## Mensagem do lead
"${input.leadMessage}"

## Resposta da IA
"${input.aiReply}"

Responda APENAS um JSON válido:
{
  "confusingCopy": <boolean, o texto é confuso, prolixo ou difícil de entender rapidamente no WhatsApp>,
  "unclearNextStep": <boolean, depois de ler a resposta, não fica claro o que o lead deve fazer/responder em seguida>,
  "highCognitiveLoad": <boolean, a resposta pede várias decisões/informações de uma vez, sobrecarregando o lead>,
  "reasoning": "<1-2 frases>"
}`;
}

export async function evaluateConversationUX(input: ConversationArtifact): Promise<Finding[]> {
  const raw = await callModelForJson(buildConversationPrompt(input), MODEL, 400);
  const parsed = parseJsonResponse<{
    confusingCopy?: boolean;
    unclearNextStep?: boolean;
    highCognitiveLoad?: boolean;
    reasoning?: string;
  }>(raw, 'specialist:ux');

  const findings: Finding[] = [];

  if (parsed.unclearNextStep) {
    findings.push({
      persona: 'ux',
      severity: 'medium',
      category: 'unclear_next_step',
      summary: 'Não fica claro o próximo passo para o lead após a resposta',
      evidence: `IA: "${input.aiReply}" — ${parsed.reasoning ?? ''}`,
      suggestion: 'Terminar a resposta com uma pergunta/ação única e explícita.',
    });
  }

  if (parsed.confusingCopy) {
    findings.push({
      persona: 'ux',
      severity: 'low',
      category: 'confusing_copy',
      summary: 'Texto confuso ou prolixo para o contexto de WhatsApp',
      evidence: `IA: "${input.aiReply}"`,
      suggestion: 'Simplificar/encurtar o template de resposta.',
    });
  }

  if (parsed.highCognitiveLoad) {
    findings.push({
      persona: 'ux',
      severity: 'low',
      category: 'cognitive_load',
      summary: 'Resposta pede múltiplas decisões de uma vez',
      evidence: `IA: "${input.aiReply}" — ${parsed.reasoning ?? ''}`,
      suggestion: 'Quebrar em perguntas sequenciais em vez de uma única mensagem com várias opções.',
    });
  }

  return findings;
}
