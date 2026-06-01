import { expect, test } from '@playwright/test';
import { createRunId } from '../../systemops.config';
import { agentMessageCount, SystemOpsE2eClient } from '../support/e2eClient';
import { e2ePhone } from '../support/zapiPayloadFactory';

test.describe.configure({ mode: 'serial' });

const activeRunIds = new Set<string>();

async function setup(client: SystemOpsE2eClient, runId: string) {
  activeRunIds.add(runId);
  await client.reset(runId);
  await client.seed();
}

async function cleanup(client: SystemOpsE2eClient, runId: string) {
  await client.reset(runId);
  activeRunIds.delete(runId);
}

test.describe('SystemOps Inbox - Fluxos de Takeover e Múltiplos Leads', () => {
  test.afterEach(async ({ request }) => {
    if (activeRunIds.size === 0) return;
    const client = new SystemOpsE2eClient(request);
    for (const runId of [...activeRunIds]) {
      await client.reset(runId);
      activeRunIds.delete(runId);
    }
  });

  test('SYS-INBOX-001 - múltiplas mensagens do lead após takeover não acionam a IA', async ({ request }) => {
    const client = new SystemOpsE2eClient(request);
    const runId = createRunId('SYS-INBOX-001');
    const phone = e2ePhone(runId);
    await setup(client, runId);

    // Lead inicia conversa — IA responde normalmente
    await client.sendLeadMessage(runId, 'oi', 'greeting', phone);
    const afterGreeting = await client.waitForAgentMessage(runId, 1);
    const agentCountBeforeTakeover = agentMessageCount(afterGreeting);

    // Operador assume o atendimento (fromMe=true → aiPaused permanente)
    await client.sendOperatorMessage(runId, 'Olá! Vou verificar e já te retorno.', 'takeover', phone);

    // Lead envia mais duas mensagens enquanto IA está pausada
    await client.sendLeadMessage(runId, 'ok, esperando', 'lead-waiting', phone);
    await client.sendLeadMessage(runId, 'tem alguém?', 'lead-insistent', phone);

    // Aguarda processamento (sem polling de IA — só verifica que não respondeu)
    await new Promise((r) => setTimeout(r, 3000));
    const state = await client.state(runId);

    // IA deve continuar pausada
    expect(state.conversations.some((c) => c.aiPaused)).toBe(true);
    // Contagem de mensagens do agente não deve ter aumentado
    expect(agentMessageCount(state)).toBe(agentCountBeforeTakeover);

    await cleanup(client, runId);
  });

  test('SYS-INBOX-002 - dois leads simultâneos têm conversas isoladas', async ({ request }) => {
    const client = new SystemOpsE2eClient(request);
    const runIdA = createRunId('SYS-INBOX-002A');
    const runIdB = createRunId('SYS-INBOX-002B');
    const phoneA = e2ePhone(runIdA);
    const phoneB = e2ePhone(runIdB);

    // Inicializa com o mesmo reset/seed — ambos usam a mesma clínica E2E
    activeRunIds.add(runIdA);
    activeRunIds.add(runIdB);
    await client.reset(runIdA); // limpa tudo da clínica
    await client.seed();

    // Lead A envia mensagem
    await client.sendLeadMessage(runIdA, 'quero informações sobre avaliação', 'lead-a', phoneA);
    // Lead B envia mensagem concorrente
    await client.sendLeadMessage(runIdB, 'quanto custa o clareamento?', 'lead-b', phoneB);

    // Aguarda IA responder aos dois leads
    await client.waitForAgentMessage(runIdA, 1);

    // Polling manual para segundo lead — state retorna todas as conversas
    const deadline = Date.now() + 20000;
    let state = await client.state(runIdA);
    while (Date.now() < deadline && agentMessageCount(state) < 2) {
      await new Promise((r) => setTimeout(r, 1500));
      state = await client.state(runIdA);
    }

    // Devem existir exatamente 2 conversas (uma por lead)
    expect(state.conversations.length).toBe(2);
    // Nenhuma deve estar pausada
    expect(state.conversations.every((c) => !c.aiPaused)).toBe(true);
    // Cada lead recebeu pelo menos uma resposta da IA
    expect(agentMessageCount(state)).toBeGreaterThanOrEqual(2);

    await client.reset(runIdA);
    activeRunIds.delete(runIdA);
    activeRunIds.delete(runIdB);
  });

  test('SYS-INBOX-003 - urgência sinaliza needsAttention na conversa', async ({ request }) => {
    const client = new SystemOpsE2eClient(request);
    const runId = createRunId('SYS-INBOX-003');
    await setup(client, runId);

    await client.sendLeadMessage(runId, 'estou com dor muito forte, é urgência', 'urgency');
    await client.waitForAgentMessage(runId, 1);
    const state = await client.state(runId);

    // Conversa de urgência deve estar marcada para atenção do operador
    expect(state.conversations.some((c) => c.needsAttention)).toBe(true);
    // Mas IA não deve ter criado agendamento
    expect(state.appointments.filter((a) => a.status === 'scheduled')).toHaveLength(0);

    await cleanup(client, runId);
  });
});
