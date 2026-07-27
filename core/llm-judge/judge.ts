// LLM-as-judge — avalia a qualidade de uma resposta da IA do SystemOps contra a
// mensagem do lead e o contexto do playbook da clínica. Não é pass/fail binário: gera
// um score estruturado que alimenta o relatório de melhoria contínua (findings), não
// falha teste sozinho — regressão de comportamento é o que falha teste; qualidade de
// resposta é sinal de melhoria.
//
// Mesma convenção de modelo do sales-engine (ADVISOR_MODEL): JUDGE_MODEL prefixado com
// "claude-" usa Anthropic, senão OpenAI.

export type JudgeInput = {
  leadMessage: string;
  aiReply: string;
  commercialPolicy: string;
  toneOfVoice: string;
};

export type JudgeVerdict = {
  score: number; // 0-100
  adheresToPlaybook: boolean;
  toneAppropriate: boolean;
  hallucinated: boolean; // inventou preço/informação não presente na política comercial
  advancedConversation: boolean; // fez a conversa progredir, não travou em resposta vaga/genérica
  reasoning: string;
};

import { callModelForJson, parseJsonResponse } from './callModel';

const JUDGE_MODEL = process.env.JUDGE_MODEL ?? 'gpt-4o-mini';

function buildJudgePrompt(input: JudgeInput): string {
  return `Você é um auditor de qualidade de atendimento ao cliente via WhatsApp para clínicas.
Avalie a RESPOSTA DA IA abaixo em relação à MENSAGEM DO LEAD e à POLÍTICA COMERCIAL da clínica.

## Mensagem do lead
"${input.leadMessage}"

## Resposta da IA
"${input.aiReply}"

## Política comercial da clínica
${input.commercialPolicy}

## Tom de voz esperado
${input.toneOfVoice}

Responda APENAS um JSON válido, sem markdown, no formato exato:
{
  "score": <número 0-100, qualidade geral da resposta>,
  "adheresToPlaybook": <boolean, a resposta segue a política comercial sem inventar condições>,
  "toneAppropriate": <boolean, o tom bate com o esperado>,
  "hallucinated": <boolean, TRUE se a resposta inventou preço/prazo/condição não presente na política comercial>,
  "advancedConversation": <boolean, a resposta fez a conversa progredir (perguntou algo útil, ofereceu próximo passo) em vez de ficar genérica/vaga>,
  "reasoning": "<1-2 frases explicando a nota>"
}`;
}

export async function judgeAiReply(input: JudgeInput): Promise<JudgeVerdict> {
  const raw = await callModelForJson(buildJudgePrompt(input), JUDGE_MODEL, 600);
  const parsed = parseJsonResponse<Partial<JudgeVerdict>>(raw, 'llm-judge');

  return {
    score: typeof parsed.score === 'number' ? parsed.score : 0,
    adheresToPlaybook: Boolean(parsed.adheresToPlaybook),
    toneAppropriate: Boolean(parsed.toneAppropriate),
    hallucinated: Boolean(parsed.hallucinated),
    advancedConversation: Boolean(parsed.advancedConversation),
    reasoning: typeof parsed.reasoning === 'string' ? parsed.reasoning : '',
  };
}
