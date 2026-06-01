import { expect, test } from '@playwright/test';
import { createRunId, e2eSkipReason } from '../../systemops.config';
import {
  latestAgentMessage,
  latestSlotOffer,
  SystemOpsE2eClient,
  type E2eMenuItem
} from '../support/e2eClient';
import { e2ePhone } from '../support/zapiPayloadFactory';

test.describe.configure({ mode: 'serial' });

const activeRunIds = new Set<string>();

const DEFAULT_MENU_ITEMS: E2eMenuItem[] = [
  { number: 1, label: 'Procedimentos', intent: 'procedures', enabled: true },
  { number: 2, label: 'Agendar horário', intent: 'book_appointment', enabled: true },
  { number: 3, label: 'Formas de pagamento', intent: 'price_inquiry', enabled: true },
  { number: 4, label: 'Localização', intent: 'location', enabled: true },
  { number: 5, label: 'Falar com um especialista', intent: 'needs_human', enabled: true }
];

const CUSTOM_MENU_ITEMS: E2eMenuItem[] = [
  { number: 1, label: 'Avaliação Gratuita', intent: 'procedures', enabled: true },
  { number: 2, label: 'Quero agendar', intent: 'book_appointment', enabled: true },
  { number: 3, label: 'Planos e pagamento', intent: 'price_inquiry', enabled: true },
  { number: 4, label: 'Endereço da clínica', intent: 'location', enabled: true },
  { number: 5, label: 'Falar com especialista', intent: 'needs_human', enabled: true }
];

const PARAMETRIZED_MENU_ITEMS: E2eMenuItem[] = [
  { number: 1, label: 'Sorriso Prime', intent: 'procedures', enabled: true },
  { number: 2, label: 'Reservar visita', intent: 'book_appointment', enabled: true },
  { number: 3, label: 'Planos flexíveis', intent: 'price_inquiry', enabled: true },
  { number: 4, label: 'Como chegar', intent: 'location', enabled: true },
  { number: 5, label: 'Chamar concierge', intent: 'needs_human', enabled: true }
];

function disabledPaymentMenu(): E2eMenuItem[] {
  return CUSTOM_MENU_ITEMS.map((item) => (item.number === 3 ? { ...item, enabled: false } : item));
}

function disabledParametrizedPaymentMenu(): E2eMenuItem[] {
  return PARAMETRIZED_MENU_ITEMS.map((item) => (item.number === 3 ? { ...item, enabled: false } : item));
}

function expectMenuItems(reply: string, items: E2eMenuItem[]) {
  for (const item of items.filter((menuItem) => menuItem.enabled)) {
    expect(reply).toContain(`${item.number}. ${item.label}`);
  }

  for (const item of items.filter((menuItem) => !menuItem.enabled)) {
    expect(reply).not.toContain(`${item.number}. ${item.label}`);
  }
}

function expectNoDefaultMenuLeak(reply: string) {
  for (const item of DEFAULT_MENU_ITEMS) {
    expect(reply).not.toContain(`${item.number}. ${item.label}`);
  }
}

async function setup(client: SystemOpsE2eClient, runId: string) {
  await client.reset(runId);
  activeRunIds.add(runId);
  await client.seed();
}

async function restoreDefaults(client: SystemOpsE2eClient, runId: string) {
  await client.updateClinicSettings(runId, {
    greetingMessage: null,
    menuItems: DEFAULT_MENU_ITEMS
  });
}

async function cleanup(client: SystemOpsE2eClient, runId: string) {
  await restoreDefaults(client, runId);
  await client.reset(runId);
  activeRunIds.delete(runId);
}

test.describe('SystemOps Menu Parametrizável E2E', () => {
  test.beforeEach(async () => {
    const skipReason = e2eSkipReason();
    if (skipReason) test.skip(true, skipReason);
  });

  test.afterEach(async ({ request }) => {
    if (activeRunIds.size === 0) return;

    const client = new SystemOpsE2eClient(request);
    for (const runId of [...activeRunIds]) {
      await restoreDefaults(client, runId);
      await client.reset(runId);
      activeRunIds.delete(runId);
    }
  });

  test('SYS-MENU-001 - primeiro contato envia saudação, boas-vindas customizada e menu configurado', async ({ request }) => {
    const client = new SystemOpsE2eClient(request);
    const runId = createRunId('SYS-MENU-001');
    const greetingMessage = 'Bem-vindo ao atendimento QA. Escolha uma das opções abaixo:';
    await setup(client, runId);
    await client.updateClinicSettings(runId, { greetingMessage, menuItems: CUSTOM_MENU_ITEMS });

    await client.sendLeadMessage(runId, 'oi', 'first-contact');
    const reply = latestAgentMessage(await client.waitForAgentMessage(runId, 1));

    expect(reply).toMatch(/ol[aá]|bom dia|boa tarde|boa noite/i);
    expect(reply).toContain(greetingMessage);
    expectMenuItems(reply, CUSTOM_MENU_ITEMS);
    expect(latestSlotOffer(await client.state(runId))).toHaveLength(0);
    await cleanup(client, runId);
  });

  test('SYS-MENU-002 - saudação no meio da conversa e pedido explícito reenviam o menu', async ({ request }) => {
    const client = new SystemOpsE2eClient(request);
    const runId = createRunId('SYS-MENU-002');
    await setup(client, runId);
    await client.updateClinicSettings(runId, {
      greetingMessage: 'Menu QA disponível:',
      menuItems: CUSTOM_MENU_ITEMS
    });

    await client.sendLeadMessage(runId, 'oi', 'first-contact');
    await client.sendLeadMessage(runId, 'bom dia', 'mid-greeting');
    expectMenuItems(latestAgentMessage(await client.waitForAgentMessage(runId, 2)), CUSTOM_MENU_ITEMS);

    await client.sendLeadMessage(runId, 'quero ver o menu', 'explicit-menu');
    expectMenuItems(latestAgentMessage(await client.waitForAgentMessage(runId, 3)), CUSTOM_MENU_ITEMS);

    await client.sendLeadMessage(runId, 'voltar ao menu', 'back-to-menu');
    expectMenuItems(latestAgentMessage(await client.waitForAgentMessage(runId, 4)), CUSTOM_MENU_ITEMS);
    await cleanup(client, runId);
  });

  test('SYS-MENU-003 - seleção por número aciona a intenção mapeada ao slot', async ({ request }) => {
    const client = new SystemOpsE2eClient(request);
    const runId = createRunId('SYS-MENU-003');
    await setup(client, runId);
    await client.updateClinicSettings(runId, {
      greetingMessage: 'Escolha seu caminho no menu QA:',
      menuItems: CUSTOM_MENU_ITEMS
    });

    const phoneProcedures = `${e2ePhone(runId)}-procedures`;
    await client.sendLeadMessage(runId, 'oi', 'menu-procedures', phoneProcedures);
    await client.sendLeadMessage(runId, '1', 'choose-procedures', phoneProcedures);
    const proceduresReply = latestAgentMessage(await client.waitForAgentMessage(runId, 2));
    expect(proceduresReply).toMatch(/avalia|procedimento|tratamento/i);
    expect(proceduresReply).not.toContain('1. Avaliação Gratuita');

    const phoneScheduling = `${e2ePhone(runId)}-scheduling`;
    await client.sendLeadMessage(runId, 'oi', 'menu-scheduling', phoneScheduling);
    await client.sendLeadMessage(runId, '2', 'choose-scheduling', phoneScheduling);
    // state retorna conversa mais recente (scheduling), que tem 2 mensagens do agente
    const schedulingReply = latestAgentMessage(await client.waitForAgentMessage(runId, 2));
    expect(schedulingReply).toMatch(/agend|hor[aá]rio|procedimento|avalia/i);
    expect(schedulingReply).not.toContain('2. Quero agendar');
    await cleanup(client, runId);
  });

  test('SYS-MENU-004 - item desativado some do menu e número cai no fluxo normal', async ({ request }) => {
    const client = new SystemOpsE2eClient(request);
    const runId = createRunId('SYS-MENU-004');
    await setup(client, runId);
    await client.updateClinicSettings(runId, {
      greetingMessage: 'Olá! Como posso ajudar?',
      menuItems: disabledPaymentMenu()
    });

    await client.sendLeadMessage(runId, 'oi', 'first-contact');
    expectMenuItems(latestAgentMessage(await client.waitForAgentMessage(runId, 1)), disabledPaymentMenu());

    await client.sendLeadMessage(runId, '3', 'disabled-choice');
    const state = await client.waitForAgentMessage(runId, 2);
    const reply = latestAgentMessage(state);

    expect(reply).not.toMatch(/pagamento|parcel|pre[cç]o|valor/i);
    expect(latestSlotOffer(state)).toHaveLength(0);
    expect(state.appointments.filter((appointment) => appointment.status === 'scheduled')).toHaveLength(0);
    await cleanup(client, runId);
  });

  test('SYS-MENU-005 - menu_items nulo mantém compatibilidade com menu padrão de cinco itens', async ({ request }) => {
    const client = new SystemOpsE2eClient(request);
    const runId = createRunId('SYS-MENU-005');
    await setup(client, runId);
    await client.updateClinicSettings(runId, { greetingMessage: null, menuItems: null });

    await client.sendLeadMessage(runId, 'oi', 'first-contact');
    const reply = latestAgentMessage(await client.waitForAgentMessage(runId, 1));

    expect(reply).toMatch(/seja bem-vindo|ol[aá]|bom dia|boa tarde|boa noite/i);
    expectMenuItems(reply, DEFAULT_MENU_ITEMS);
    await cleanup(client, runId);
  });

  test('SYS-MENU-006 - lead ambíguo no primeiro contato recebe menu parametrizado sem acionar agenda', async ({ request }) => {
    const client = new SystemOpsE2eClient(request);
    const runId = createRunId('SYS-MENU-006');
    await setup(client, runId);
    await client.updateClinicSettings(runId, {
      greetingMessage: 'Escolha o melhor caminho para continuar:',
      menuItems: PARAMETRIZED_MENU_ITEMS
    });

    await client.sendLeadMessage(runId, 'quero entender melhor antes de decidir', 'ambiguous-first-contact');
    const state = await client.waitForAgentMessage(runId, 1);
    const reply = latestAgentMessage(state);

    expect(reply).toContain('Escolha o melhor caminho para continuar:');
    expectMenuItems(reply, PARAMETRIZED_MENU_ITEMS);
    expectNoDefaultMenuLeak(reply);
    expect(latestSlotOffer(state)).toHaveLength(0);
    expect(state.appointments.filter((appointment) => appointment.status === 'scheduled')).toHaveLength(0);
    await cleanup(client, runId);
  });

  test('SYS-MENU-007 - lead indeciso depois do menu recebe o menu novamente, não uma resposta genérica', async ({ request }) => {
    const client = new SystemOpsE2eClient(request);
    const runId = createRunId('SYS-MENU-007');
    await setup(client, runId);
    await client.updateClinicSettings(runId, {
      greetingMessage: 'Escolha o melhor caminho para continuar:',
      menuItems: PARAMETRIZED_MENU_ITEMS
    });

    await client.sendLeadMessage(runId, 'oi', 'first-contact');
    await client.waitForAgentMessage(runId, 1);
    await client.sendLeadMessage(runId, 'não sei qual opção escolher', 'unclear-after-menu');
    const state = await client.waitForAgentMessage(runId, 2);
    const reply = latestAgentMessage(state);

    expectMenuItems(reply, PARAMETRIZED_MENU_ITEMS);
    expectNoDefaultMenuLeak(reply);
    expect(reply).toMatch(/escolh|op[cç][aã]o|menu|posso ajudar/i);
    expect(latestSlotOffer(state)).toHaveLength(0);
    expect(state.appointments.filter((appointment) => appointment.status === 'scheduled')).toHaveLength(0);
    await cleanup(client, runId);
  });

  test('SYS-MENU-008 - número inválido dentro do menu reoferece opções sem cair no LLM nem criar ação', async ({ request }) => {
    const client = new SystemOpsE2eClient(request);
    const runId = createRunId('SYS-MENU-008');
    await setup(client, runId);
    await client.updateClinicSettings(runId, {
      greetingMessage: 'Escolha uma opção válida:',
      menuItems: PARAMETRIZED_MENU_ITEMS
    });

    await client.sendLeadMessage(runId, 'oi', 'first-contact');
    await client.waitForAgentMessage(runId, 1);
    await client.sendLeadMessage(runId, '9', 'invalid-menu-number');
    const state = await client.waitForAgentMessage(runId, 2);
    const reply = latestAgentMessage(state);

    expectMenuItems(reply, PARAMETRIZED_MENU_ITEMS);
    expectNoDefaultMenuLeak(reply);
    expect(latestSlotOffer(state)).toHaveLength(0);
    expect(state.appointments.filter((appointment) => appointment.status === 'scheduled')).toHaveLength(0);
    await cleanup(client, runId);
  });

  test('SYS-MENU-009 - lead digitando rótulo customizado usa o intent configurado pela clínica', async ({ request }) => {
    const client = new SystemOpsE2eClient(request);
    const runId = createRunId('SYS-MENU-009');
    await setup(client, runId);
    await client.updateClinicSettings(runId, {
      greetingMessage: 'Escolha uma experiência:',
      menuItems: PARAMETRIZED_MENU_ITEMS
    });

    await client.sendLeadMessage(runId, 'oi', 'first-contact');
    await client.waitForAgentMessage(runId, 1);
    await client.sendLeadMessage(runId, 'Sorriso Prime', 'custom-label-procedures');
    const state = await client.waitForAgentMessage(runId, 2);
    const reply = latestAgentMessage(state);

    expect(reply).toMatch(/procedimento|tratamento|sorriso|avalia/i);
    expect(reply).not.toContain('1. Sorriso Prime');
    expect(latestSlotOffer(state)).toHaveLength(0);
    await cleanup(client, runId);
  });

  test('SYS-MENU-010 - rótulo de item desativado não aciona intent antigo nem hardcoded', async ({ request }) => {
    const client = new SystemOpsE2eClient(request);
    const runId = createRunId('SYS-MENU-010');
    await setup(client, runId);
    await client.updateClinicSettings(runId, {
      greetingMessage: 'Escolha uma opção disponível:',
      menuItems: disabledParametrizedPaymentMenu()
    });

    await client.sendLeadMessage(runId, 'oi', 'first-contact');
    await client.waitForAgentMessage(runId, 1);
    await client.sendLeadMessage(runId, 'Planos flexíveis', 'disabled-custom-label');
    const state = await client.waitForAgentMessage(runId, 2);
    const reply = latestAgentMessage(state);

    expect(reply).not.toMatch(/pagamento|parcel|pre[cç]o|valor/i);
    expect(reply).not.toContain('3. Planos flexíveis');
    expect(latestSlotOffer(state)).toHaveLength(0);
    expect(state.appointments.filter((appointment) => appointment.status === 'scheduled')).toHaveLength(0);
    await cleanup(client, runId);
  });
});
