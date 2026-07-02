import { APIRequestContext, expect } from '@playwright/test';
import { systemopsConfig } from '../../systemops.config';

export type RealConversationSample = {
  conversationId: string;
  leadId: string;
  treatmentInterest: string | null;
  hasAgentReply: boolean;
  leadMessages: string[];
};

// Busca mensagens reais de leads de uma clínica de produção (isTest=false), via
// GET /api/e2e/production-conversations (src/app/api/e2e/production-conversations/route.ts
// no systemops-sales-engine) — usado pelo replay de melhoria contínua (production-replay.spec.ts)
// para validar o pipeline de IA com frases reais de clientes, não só payloads sintéticos.
export async function fetchRealConversations(
  request: APIRequestContext,
  input: { clinicId: string; limit?: number; messagesPerConversation?: number },
): Promise<RealConversationSample[]> {
  if (!systemopsConfig.e2eSecret) {
    throw new Error('SYSTEMOPS_E2E_SECRET é obrigatório para buscar conversas reais.');
  }

  const params = new URLSearchParams({
    clinicId: input.clinicId,
    limit: String(input.limit ?? 5),
    messagesPerConversation: String(input.messagesPerConversation ?? 3),
  });

  const response = await request.get(`/api/e2e/production-conversations?${params.toString()}`, {
    headers: { 'x-e2e-secret': systemopsConfig.e2eSecret, Accept: 'application/json' },
  });
  expect(response.ok()).toBeTruthy();

  const body = await response.json() as { conversations: RealConversationSample[] };
  return body.conversations;
}
