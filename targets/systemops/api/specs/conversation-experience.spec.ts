import { expect, test } from '@playwright/test';
import { createRunId } from '../../systemops.config';
import { nextLocalWeekday } from '../support/calendarAssertions';
import {
  agentMessageCount,
  latestAgentMessage,
  latestSlotOffer,
  SystemOpsE2eClient
} from '../support/e2eClient';
import { e2ePhone } from '../support/zapiPayloadFactory';

test.describe.configure({ mode: 'serial' });

const activeRunIds = new Set<string>();

function dateText(day: ReturnType<typeof nextLocalWeekday>): string {
  return `${String(day.day).padStart(2, '0')}/${String(day.month + 1).padStart(2, '0')}`;
}

function friday() {
  return nextLocalWeekday(5);
}

async function setup(client: SystemOpsE2eClient, runId: string) {
  activeRunIds.add(runId);
  await client.reset(runId);
  await client.seed();
}

async function cleanup(client: SystemOpsE2eClient, runId: string) {
  await client.reset(runId);
  const events = await client.listCalendarEvents(runId);
  expect(events).toHaveLength(0);
  activeRunIds.delete(runId);
}

async function expectNoBookingSideEffects(client: SystemOpsE2eClient, runId: string) {
  const state = await client.state(runId);
  expect(latestSlotOffer(state)).toHaveLength(0);
  expect(state.appointments.filter((appointment) => appointment.status === 'scheduled')).toHaveLength(0);
  expect(await client.listCalendarEvents(runId)).toHaveLength(0);
  return state;
}

test.describe('SystemOps Conversation Experience E2E', () => {
  test.afterEach(async ({ request }) => {
    if (activeRunIds.size === 0) return;

    const client = new SystemOpsE2eClient(request);
    for (const runId of [...activeRunIds]) {
      await client.reset(runId);
      activeRunIds.delete(runId);
    }
  });

  test('SYS-CONV-001 - saudação responde de forma acolhedora sem abrir agenda', async ({ request }) => {
    const client = new SystemOpsE2eClient(request);
    const runId = createRunId('SYS-CONV-001');
    await setup(client, runId);

    await client.sendLeadMessage(runId, 'oi, bom dia', 'greeting');
    const state = await expectNoBookingSideEffects(client, runId);

    expect(latestAgentMessage(state)).toContain('Olá');
    await cleanup(client, runId);
  });

  test('SYS-CONV-002 - fora de escopo mantém limite da clínica', async ({ request }) => {
    const client = new SystemOpsE2eClient(request);
    const runId = createRunId('SYS-CONV-002');
    await setup(client, runId);

    await client.sendLeadMessage(runId, 'vocês fazem site e tráfego pago?', 'out-of-scope');
    const state = await expectNoBookingSideEffects(client, runId);

    expect(latestAgentMessage(state)).toContain('clínica');
    await cleanup(client, runId);
  });

  test('SYS-CONV-003 - pergunta de preço não inventa valor', async ({ request }) => {
    const client = new SystemOpsE2eClient(request);
    const runId = createRunId('SYS-CONV-003');
    await setup(client, runId);

    await client.sendLeadMessage(runId, 'quanto custa 20 lentes?', 'price');
    const state = await expectNoBookingSideEffects(client, runId);
    const reply = latestAgentMessage(state);

    expect(reply).toContain('valores');
    expect(reply).not.toMatch(/R\$|\b\d{3,}\b/);
    await cleanup(client, runId);
  });

  test('SYS-CONV-004 - depois de preço o lead ainda consegue agendar', async ({ request }) => {
    const client = new SystemOpsE2eClient(request);
    const runId = createRunId('SYS-CONV-004');
    await setup(client, runId);

    await client.sendLeadMessage(runId, 'quanto custa avaliação?', 'price');
    await client.sendLeadMessage(runId, `quero avaliação no dia ${dateText(friday())} de manhã`, 'ask');
    const state = await client.state(runId);

    expect(latestSlotOffer(state).length).toBeGreaterThan(0);
    expect(await client.listCalendarEvents(runId)).toHaveLength(0);
    await cleanup(client, runId);
  });

  test('SYS-CONV-005 - ok após oferta não confirma horário sozinho', async ({ request }) => {
    const client = new SystemOpsE2eClient(request);
    const runId = createRunId('SYS-CONV-005');
    await setup(client, runId);

    await client.sendLeadMessage(runId, `quero avaliação no dia ${dateText(friday())} de manhã`, 'ask');
    const offered = latestSlotOffer(await client.state(runId));
    expect(offered.length).toBeGreaterThan(0);

    await client.sendLeadMessage(runId, 'ok', 'ack');
    const state = await client.state(runId);

    expect(state.appointments.filter((appointment) => appointment.status === 'scheduled')).toHaveLength(0);
    expect(await client.listCalendarEvents(runId)).toHaveLength(0);
    expect(latestAgentMessage(state)).toContain('Combinado');
    await cleanup(client, runId);
  });

  test('SYS-CONV-006 - pode ser sem oferta pendente não agenda nada', async ({ request }) => {
    const client = new SystemOpsE2eClient(request);
    const runId = createRunId('SYS-CONV-006');
    await setup(client, runId);

    await client.sendLeadMessage(runId, 'pode ser', 'loose-confirmation');
    const state = await expectNoBookingSideEffects(client, runId);

    expect(latestAgentMessage(state)).toContain('clínica');
    await cleanup(client, runId);
  });

  test('SYS-CONV-007 - encerramento não tenta reabrir venda', async ({ request }) => {
    const client = new SystemOpsE2eClient(request);
    const runId = createRunId('SYS-CONV-007');
    await setup(client, runId);

    await client.sendLeadMessage(runId, 'obrigado tchau', 'farewell');
    const state = await expectNoBookingSideEffects(client, runId);

    expect(latestAgentMessage(state)).toContain('Até logo');
    await cleanup(client, runId);
  });

  test('SYS-CONV-008 - operador assume e IA não responde por cima', async ({ request }) => {
    const client = new SystemOpsE2eClient(request);
    const runId = createRunId('SYS-CONV-008');
    const phone = e2ePhone(runId);
    await setup(client, runId);

    await client.sendLeadMessage(runId, 'oi', 'greeting', phone);
    const beforeTakeover = await client.state(runId);
    const initialAgentMessages = agentMessageCount(beforeTakeover);

    await client.sendOperatorMessage(runId, 'Vou verificar com a equipe e já retorno.', 'operator', phone);
    await client.sendLeadMessage(runId, `quero avaliação no dia ${dateText(friday())}`, 'lead-after-operator', phone);
    const state = await client.state(runId);

    expect(state.conversations.some((conversation) => conversation.aiPaused)).toBe(true);
    expect(agentMessageCount(state)).toBe(initialAgentMessages);
    expect(await client.listCalendarEvents(runId)).toHaveLength(0);
    await cleanup(client, runId);
  });

  test('SYS-CONV-009 - urgência no primeiro contato bypassa o menu e aciona equipe', async ({ request }) => {
    const client = new SystemOpsE2eClient(request);
    const runId = createRunId('SYS-CONV-009');
    await setup(client, runId);

    await client.sendLeadMessage(runId, 'Estou com dor de dente muito forte, não aguento mais', 'urgency-first-contact');
    const state = await expectNoBookingSideEffects(client, runId);
    const reply = latestAgentMessage(state);

    expect(reply).toMatch(/urg[eê]ncia|equipe|contato|acion|imediato/i);
    expect(reply).not.toMatch(/como posso te ajudar hoje|1\. Procedimentos|2\. Agendar/i);
    await cleanup(client, runId);
  });

  test('SYS-CONV-010 - urgência mista no primeiro contato prioriza segurança sobre agendamento', async ({ request }) => {
    const client = new SystemOpsE2eClient(request);
    const runId = createRunId('SYS-CONV-010');
    await setup(client, runId);

    await client.sendLeadMessage(runId, 'tô com sangramento mas quero marcar uma consulta', 'urgency-mixed-first-contact');
    const state = await expectNoBookingSideEffects(client, runId);
    const reply = latestAgentMessage(state);

    expect(reply).toMatch(/urg[eê]ncia|equipe|contato|acion/i);
    expect(reply).not.toMatch(/1\. Procedimentos|2\. Agendar/i);
    await cleanup(client, runId);
  });

  test('SYS-CONV-011 - handoff explícito no primeiro contato não exibe menu', async ({ request }) => {
    const client = new SystemOpsE2eClient(request);
    const runId = createRunId('SYS-CONV-011');
    await setup(client, runId);

    await client.sendLeadMessage(runId, 'quero falar com o dentista antes de agendar', 'needs-human-first-contact');
    const state = await expectNoBookingSideEffects(client, runId);
    const reply = latestAgentMessage(state);

    expect(reply).toMatch(/equipe|avisad|responder|aten[çc][aã]o/i);
    expect(reply).not.toMatch(/1\. Procedimentos|2\. Agendar/i);
    await cleanup(client, runId);
  });
});
