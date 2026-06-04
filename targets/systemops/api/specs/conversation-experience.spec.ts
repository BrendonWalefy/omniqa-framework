import { expect, test } from '@playwright/test';
import { createRunId, e2eSkipReason } from '../../systemops.config';
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

function currencyMentions(text: string): string[] {
  return text.match(/R\$\s?\d[\d.,]*/g) ?? [];
}

function procedureTopicLines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => /^([-*•]|\d+[.)])\s+/.test(line) || /^(lentes?|clareamento|implante|limpeza|manuten)/i.test(line));
}

function expectConciseProcedureTopics(reply: string) {
  const topics = procedureTopicLines(reply);
  const topicText = topics.join('\n');

  expect(topics.length).toBeGreaterThanOrEqual(3);
  expect(topicText).toMatch(/lente/i);
  expect(topicText).toMatch(/clareamento|implante|limpeza|manuten/i);
  for (const topic of topics) {
    expect(topic.length).toBeLessThanOrEqual(180);
  }
  expect(reply.length).toBeLessThanOrEqual(1400);
  expect(reply).toMatch(/detalh|mais informa|explic|quer saber|posso te contar|digite|escolh/i);
}

test.describe('SystemOps Conversation Experience E2E', () => {
  test.beforeEach(async () => {
    const skipReason = e2eSkipReason();
    if (skipReason) test.skip(true, skipReason);
  });

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

    expect(latestAgentMessage(state)).toMatch(/[Oo]l[aáà]|[Bb]om [Dd]ia|[Bb]oa [Tt]arde|[Bb]oa [Nn]oite|[Ss]eja bem-vindo|[Bb]em-vindo/i);
    await cleanup(client, runId);
  });

  test('SYS-CONV-002 - fora de escopo mantém limite da clínica', async ({ request }) => {
    const client = new SystemOpsE2eClient(request);
    const runId = createRunId('SYS-CONV-002');
    await setup(client, runId);

    // Primeiro contato sempre recebe saudação; pergunta fora de escopo vem no segundo turno.
    await client.sendLeadMessage(runId, 'oi', 'greeting');
    await client.waitForAgentMessage(runId, 1);
    await client.sendLeadMessage(runId, 'vocês fazem site e tráfego pago?', 'out-of-scope');
    const state = await client.waitForAgentMessage(runId, 2);

    expect(latestSlotOffer(state)).toHaveLength(0);
    expect(state.appointments.filter((a) => a.status === 'scheduled')).toHaveLength(0);
    expect(await client.listCalendarEvents(runId)).toHaveLength(0);
    expect(latestAgentMessage(state)).toMatch(/cl[ií]nica|especialidade|odontolog|foco|n[aã]o (atend|trabalh|oferec)/i);
    await cleanup(client, runId);
  });

  test('SYS-CONV-003 - pergunta de preço não inventa valor', async ({ request }) => {
    const client = new SystemOpsE2eClient(request);
    const runId = createRunId('SYS-CONV-003');
    await setup(client, runId);

    await client.sendLeadMessage(runId, 'oi', 'greeting');
    await client.waitForAgentMessage(runId, 1);
    await client.sendLeadMessage(runId, 'quanto custa 20 lentes?', 'price');
    const state = await client.waitForAgentMessage(runId, 2);
    const reply = latestAgentMessage(state);

    expect(latestSlotOffer(state)).toHaveLength(0);
    expect(state.appointments.filter((a) => a.status === 'scheduled')).toHaveLength(0);
    expect(await client.listCalendarEvents(runId)).toHaveLength(0);
    expect(reply).toMatch(/valor|or[çc]amento|avalia[çc][aã]o|personalizado|caso a caso|consulta/i);
    // Não deve inventar preço específico para o tratamento (≥R$1000 indica valor fixo inventado para lentes).
    // R$100 de avaliação é legítimo se estiver no playbook da clínica — não bloqueamos esse valor.
    expect(reply).not.toMatch(/R\$\s?\d{4,}|\b\d{5,}\b/);
    await cleanup(client, runId);
  });

  test('SYS-CONV-004 - depois de preço o lead ainda consegue agendar', async ({ request }) => {
    const client = new SystemOpsE2eClient(request);
    const runId = createRunId('SYS-CONV-004');
    await setup(client, runId);

    await client.sendLeadMessage(runId, 'oi', 'greeting');
    await client.waitForAgentMessage(runId, 1);
    await client.sendLeadMessage(runId, 'quanto custa avaliação?', 'price');
    await client.waitForAgentMessage(runId, 2);
    await client.sendLeadMessage(runId, `quero avaliação no dia ${dateText(friday())} de manhã`, 'ask');
    const state = await client.waitForAgentMessage(runId, 3);

    expect(latestSlotOffer(state).length).toBeGreaterThan(0);
    expect(await client.listCalendarEvents(runId)).toHaveLength(0);
    await cleanup(client, runId);
  });

  test('SYS-CONV-005 - ok após oferta não confirma horário sozinho', async ({ request }) => {
    const client = new SystemOpsE2eClient(request);
    const runId = createRunId('SYS-CONV-005');
    await setup(client, runId);

    await client.sendLeadMessage(runId, 'oi', 'greeting');
    await client.waitForAgentMessage(runId, 1);
    await client.sendLeadMessage(runId, `quero avaliação no dia ${dateText(friday())} de manhã`, 'ask');
    const stateWithOffer = await client.waitForAgentMessage(runId, 2);
    expect(latestSlotOffer(stateWithOffer).length).toBeGreaterThan(0);

    // "vou pensar" é inequivocamente não-confirmação — não deve criar agendamento
    await client.sendLeadMessage(runId, 'vou pensar um pouco', 'non-commit');
    const state = await client.waitForAgentMessage(runId, 3);

    expect(state.appointments.filter((appointment) => appointment.status === 'scheduled')).toHaveLength(0);
    expect(await client.listCalendarEvents(runId)).toHaveLength(0);
    await cleanup(client, runId);
  });

  test('SYS-CONV-006 - pode ser sem oferta pendente não agenda nada', async ({ request }) => {
    const client = new SystemOpsE2eClient(request);
    const runId = createRunId('SYS-CONV-006');
    await setup(client, runId);

    await client.sendLeadMessage(runId, 'oi', 'greeting');
    await client.waitForAgentMessage(runId, 1);
    // "pode ser" sem oferta ativa — IA deve pedir clareza ou redirecionar
    await client.sendLeadMessage(runId, 'pode ser', 'loose-confirmation');
    const state = await client.waitForAgentMessage(runId, 2);

    expect(latestSlotOffer(state)).toHaveLength(0);
    expect(state.appointments.filter((a) => a.status === 'scheduled')).toHaveLength(0);
    expect(await client.listCalendarEvents(runId)).toHaveLength(0);
    expect(latestAgentMessage(state)).toMatch(/cl[ií]nica|ajudar|como posso|o que deseja|hor[aá]rio|agend|procedimento/i);
    await cleanup(client, runId);
  });

  test('SYS-CONV-007 - encerramento não tenta reabrir venda', async ({ request }) => {
    const client = new SystemOpsE2eClient(request);
    const runId = createRunId('SYS-CONV-007');
    await setup(client, runId);

    await client.sendLeadMessage(runId, 'oi', 'greeting');
    await client.waitForAgentMessage(runId, 1);
    await client.sendLeadMessage(runId, 'obrigado tchau', 'farewell');
    const state = await client.waitForAgentMessage(runId, 2);

    expect(latestSlotOffer(state)).toHaveLength(0);
    expect(state.appointments.filter((a) => a.status === 'scheduled')).toHaveLength(0);
    expect(await client.listCalendarEvents(runId)).toHaveLength(0);
    expect(latestAgentMessage(state)).toMatch(/[Aa]t[eé] logo|[Aa]t[eé] mais|[Aa]t[eé] breve|[Tt]chau|[Ff]oi um prazer|[Bb]oa sorte|[Cc]onto com/i);
    await cleanup(client, runId);
  });

  test('SYS-CONV-008 - operador assume e IA não responde por cima', async ({ request }) => {
    const client = new SystemOpsE2eClient(request);
    const runId = createRunId('SYS-CONV-008');
    const phone = e2ePhone(runId);
    await setup(client, runId);

    await client.sendLeadMessage(runId, 'oi', 'greeting', phone);
    // Aguarda resposta + buffer para o estado estabilizar antes de capturar baseline
    await client.waitForAgentMessage(runId, 1);
    await new Promise((r) => setTimeout(r, 2500));
    const beforeTakeover = await client.state(runId);
    const initialAgentMessages = agentMessageCount(beforeTakeover);

    await client.sendOperatorMessage(runId, 'Vou verificar com a equipe e já retorno.', 'operator', phone);

    // Polling até aiPaused estar commitado na DB antes de enviar mensagem do lead.
    // Evita race condition onde o inbound do lead chega antes do write do operador.
    const takeoverDeadline = Date.now() + 10000;
    while (Date.now() < takeoverDeadline) {
      const s = await client.state(runId);
      if (s.conversations.some((c) => c.aiPaused)) break;
      await new Promise((r) => setTimeout(r, 600));
    }

    await client.sendLeadMessage(runId, `quero avaliação no dia ${dateText(friday())}`, 'lead-after-operator', phone);
    // Aguarda tempo suficiente para que a IA teria respondido (se não estivesse pausada)
    await new Promise((r) => setTimeout(r, 4000));
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

  test('SYS-CONV-012 - opção 1 do menu descreve procedimentos sem re-exibir o menu', async ({ request }) => {
    const client = new SystemOpsE2eClient(request);
    const runId = createRunId('SYS-CONV-012');
    await setup(client, runId);

    await client.sendLeadMessage(runId, 'oi', 'greeting');
    await client.waitForAgentMessage(runId, 1);
    await client.sendLeadMessage(runId, '1', 'menu-procedures');
    const state = await client.waitForAgentMessage(runId, 2);
    const reply = latestAgentMessage(state);

    expect(reply).toMatch(/procedimento|tratamento|avalia|lente|clareamento|implante|ortodon/i);
    expect(reply).not.toMatch(/1\. Procedimentos oferecidos.*2\. Agendar/is);
    await cleanup(client, runId);
  });

  test('SYS-CONV-013 - opção 2 do menu oferece horários para agendamento', async ({ request }) => {
    const client = new SystemOpsE2eClient(request);
    const runId = createRunId('SYS-CONV-013');
    await setup(client, runId);

    await client.sendLeadMessage(runId, 'oi', 'greeting');
    await client.waitForAgentMessage(runId, 1);
    await client.sendLeadMessage(runId, '2', 'menu-schedule');
    const state = await client.waitForAgentMessage(runId, 2);
    const reply = latestAgentMessage(state);

    expect(reply).toMatch(/hor[aá]rio|agend|dispon|data|op[çc][ãa]o/i);
    expect(reply).not.toMatch(/1\. Procedimentos oferecidos/i);
    await cleanup(client, runId);
  });

  test('SYS-CONV-014 - número "2" sem menu ativo não aciona agendamento direto', async ({ request }) => {
    const client = new SystemOpsE2eClient(request);
    const runId = createRunId('SYS-CONV-014');
    await setup(client, runId);

    // Envia "2" sem ter visto o menu — deve receber a saudação+menu, não slots
    await client.sendLeadMessage(runId, '2', 'number-without-menu');
    const state = await expectNoBookingSideEffects(client, runId);
    const reply = latestAgentMessage(state);

    expect(reply).toMatch(/ol[aá]|bom dia|boa tarde|boa noite/i);
    expect(latestSlotOffer(state)).toHaveLength(0);
    await cleanup(client, runId);
  });

  test('SYS-CONV-015 - reagendamento interpreta pedido de mudança de horário', async ({ request }) => {
    const client = new SystemOpsE2eClient(request);
    const runId = createRunId('SYS-CONV-015');
    await setup(client, runId);

    // Faz o agendamento primeiro
    await client.sendLeadMessage(runId, 'oi', 'greeting');
    await client.waitForAgentMessage(runId, 1);
    await client.sendLeadMessage(runId, '2', 'menu-schedule');
    await client.waitForAgentMessage(runId, 2);
    await client.sendLeadMessage(runId, '1', 'confirm-slot');
    await client.waitForAgentMessage(runId, 3);

    // Agora pede para mudar
    await client.sendLeadMessage(runId, 'preciso mudar o horário que marquei', 'reschedule');
    const state = await client.waitForAgentMessage(runId, 4);
    const reply = latestAgentMessage(state);

    expect(reply).toMatch(/remarcar|reagend|horário|dispon|mudar|novos/i);
    await cleanup(client, runId);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // SYS-CONV-016
  // Paciente responde ao menu com "remarcar" — bug latente de substring.
  //
  // Bug: resolveMenuSelection usa n.includes("marcar"), que captura "re[marcar]"
  // e "des[marcar]", classificando como book_appointment antes de o LLM ver a msg.
  //
  // Comportamento esperado após correção:
  //   - "remarcar" cai fora do resolver (retorna null) → LLM classifica como
  //     reschedule_appointment
  //   - Resposta reconhece o contexto de remarcação, não inicia fluxo de novo agendamento
  //   - Nenhum novo appointment criado
  // ─────────────────────────────────────────────────────────────────────────
  test('SYS-CONV-016 - "remarcar" no menu não aciona book_appointment por substring', async ({ request }) => {
    const client = new SystemOpsE2eClient(request);
    const runId = createRunId('SYS-CONV-016');
    await setup(client, runId);

    // Primeiro contato: IA exibe menu (isMenuActive=true para a próxima mensagem)
    await client.sendLeadMessage(runId, 'oi', 'greeting');
    await client.waitForAgentMessage(runId, 1);

    // "remarcar" contém "marcar" — bug dispara book_appointment via substring
    await client.sendLeadMessage(runId, 'quero remarcar minha consulta', 'reschedule-mid-menu');
    const state = await client.waitForAgentMessage(runId, 2);
    const reply = latestAgentMessage(state);

    // Reschedule path: oferece "novos horários" (replacement slots) — não pede procedimento como booking novo
    // "novos horários" é produzido pelo handler de reschedule_appointment, não pelo de book_appointment
    expect(reply).toMatch(/novos hor[aá]rios|remarc|reagend|mudar|trocar|alterar/i);
    // Não deve tratar como agendamento novo (pedir procedimento do zero)
    expect(reply).not.toMatch(/qual procedimento.*agendar|primeira.*avalia|implante|clareamento/i);
    // Remarcação sem consulta prévia não deve criar appointment novo
    expect(state.appointments.filter(a => a.status === 'scheduled')).toHaveLength(0);
    await cleanup(client, runId);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // SYS-CONV-017
  // Paciente responde ao menu com "desmarcar" — mesmo bug de substring.
  //
  // Comportamento esperado após correção:
  //   - "desmarcar" cai fora do resolver → LLM classifica como cancel_appointment
  //   - Resposta reconhece o cancelamento, não inicia fluxo de agendamento
  //   - Nenhum slot oferecido
  // ─────────────────────────────────────────────────────────────────────────
  test('SYS-CONV-017 - "desmarcar" no menu não aciona book_appointment por substring', async ({ request }) => {
    const client = new SystemOpsE2eClient(request);
    const runId = createRunId('SYS-CONV-017');
    await setup(client, runId);

    await client.sendLeadMessage(runId, 'oi', 'greeting');
    await client.waitForAgentMessage(runId, 1);

    await client.sendLeadMessage(runId, 'preciso desmarcar minha consulta', 'cancel-mid-menu');
    const state = await client.waitForAgentMessage(runId, 2);
    const reply = latestAgentMessage(state);

    // Cancel path: sem appointment no sistema → "não possui consultas agendadas" (não oferece slots de novo booking)
    expect(reply).toMatch(/cancel|desmarc|remov|n[aã]o possui|sem consulta|n[aã]o (tem|possui).*(agendament|consulta)|agendamentos? ativos|consultas agendadas/i);
    // Não deve tratar como agendamento novo
    expect(reply).not.toMatch(/qual procedimento.*agendar/i);
    expect(latestSlotOffer(state)).toHaveLength(0);
    await cleanup(client, runId);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // SYS-CONV-018 — sanity check
  // "quero marcar uma consulta" (sem prefixo) DEVE continuar acionando
  // book_appointment — garante que a correção do bug não quebrou o caminho feliz.
  // ─────────────────────────────────────────────────────────────────────────
  test('SYS-CONV-018 - "marcar" sem prefixo no menu aciona book_appointment normalmente', async ({ request }) => {
    const client = new SystemOpsE2eClient(request);
    const runId = createRunId('SYS-CONV-018');
    await setup(client, runId);

    await client.sendLeadMessage(runId, 'oi', 'greeting');
    await client.waitForAgentMessage(runId, 1);

    await client.sendLeadMessage(runId, 'quero marcar uma consulta', 'book-mid-menu');
    const state = await client.waitForAgentMessage(runId, 2);
    const reply = latestAgentMessage(state);

    // Deve iniciar fluxo de agendamento
    expect(reply).toMatch(/procedimento|hor[aá]rio|dispon[ií]vel|agendar|avalia/i);
    await cleanup(client, runId);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // SYS-CONV-019
  // Urgência clara no meio do fluxo de menu (sem keywords de booking).
  // Paciente recebeu o menu e responde com emergência explícita.
  //
  // "dor", "sangramento", "emergência" não batem nenhum keyword do resolver →
  // mensagem cai no LLM → classificada como clinical_urgency → handler correto.
  //
  // Comportamento esperado:
  //   - needsAttention = true com attentionReason de urgência
  //   - Resposta empática/urgente, sem menu re-exibido, sem slots
  // ─────────────────────────────────────────────────────────────────────────
  test('SYS-CONV-019 - urgência clara mid-menu escala sem oferecer slots', async ({ request }) => {
    const client = new SystemOpsE2eClient(request);
    const runId = createRunId('SYS-CONV-019');
    await setup(client, runId);

    await client.sendLeadMessage(runId, 'oi', 'greeting');
    await client.waitForAgentMessage(runId, 1);

    await client.sendLeadMessage(runId, 'estou com dor intensa e sangramento, é uma emergência', 'urgency-mid-menu');
    const state = await client.waitForAgentMessage(runId, 2);

    const conv = state.conversations[0];
    expect(conv?.needsAttention).toBe(true);
    expect(conv?.attentionReason).toMatch(/urg[eê]ncia|emerg[eê]ncia/i);

    const reply = latestAgentMessage(state);
    expect(reply).toMatch(/equipe|profissional|atendimento|socorro|imediato|ligo|contato|urg[eê]ncia/i);
    expect(latestSlotOffer(state)).toHaveLength(0);
    await cleanup(client, runId);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // SYS-CONV-020
  // Urgência com keyword de booking ("consulta") mid-menu.
  //
  // Bug: resolveMenuSelection captura "consulta" → book_appointment, antes do
  // LLM classificar como clinical_urgency. Sistema oferece slots de agendamento
  // para um paciente que está relatando dor insuportável.
  //
  // Comportamento esperado após correção:
  //   - needsAttention = true (urgência reconhecida)
  //   - Nenhum slot oferecido (não é um agendamento comum)
  //   - Resposta prioriza segurança do paciente
  // ─────────────────────────────────────────────────────────────────────────
  test('SYS-CONV-020 - urgência com "consulta" mid-menu não aciona booking flow', async ({ request }) => {
    const client = new SystemOpsE2eClient(request);
    const runId = createRunId('SYS-CONV-020');
    await setup(client, runId);

    await client.sendLeadMessage(runId, 'oi', 'greeting');
    await client.waitForAgentMessage(runId, 1);

    // "consulta" no resolver → book_appointment; mas a intenção real é urgência
    await client.sendLeadMessage(runId, 'preciso de uma consulta urgente, estou com dor insuportável', 'urgency-with-consulta');
    const state = await client.waitForAgentMessage(runId, 2);

    const conv = state.conversations[0];
    // Urgência deve escalar — não tratar como agendamento comum
    expect(conv?.needsAttention).toBe(true);
    expect(latestSlotOffer(state)).toHaveLength(0);

    const reply = latestAgentMessage(state);
    expect(reply).toMatch(/equipe|profissional|atendimento|urgente|dor|socorro|imediato|ligo/i);
    await cleanup(client, runId);
  });

  test('SYS-CONV-021 - primeiro contato evidencia especialidade em lentes sem abrir agenda', async ({ request }) => {
    const client = new SystemOpsE2eClient(request);
    const runId = createRunId('SYS-CONV-021');
    await setup(client, runId);

    await client.sendLeadMessage(runId, 'oi, quero conhecer a clínica', 'first-contact-lenses');
    const state = await expectNoBookingSideEffects(client, runId);
    const reply = latestAgentMessage(state);

    expect(reply).toMatch(/lente|resina|porcelana|sorriso/i);
    expect(reply).toMatch(/especiali|foco|principal|refer[eê]ncia|transforma/i);
    expect(reply).toMatch(/1\..*2\..*3\..*4\..*5\./s);
    await cleanup(client, runId);
  });

  test('SYS-CONV-022 - opção de procedimentos prioriza lentes e mantém outros serviços disponíveis', async ({ request }) => {
    const client = new SystemOpsE2eClient(request);
    const runId = createRunId('SYS-CONV-022');
    await setup(client, runId);

    await client.sendLeadMessage(runId, 'oi', 'greeting');
    await client.waitForAgentMessage(runId, 1);
    await client.sendLeadMessage(runId, '1', 'menu-procedures-lenses');
    const state = await client.waitForAgentMessage(runId, 2);
    const reply = latestAgentMessage(state);

    expect(reply).toMatch(/lente|resina|porcelana/i);
    expect(reply).toMatch(/clareamento|implante|limpeza|manuten/i);
    expectConciseProcedureTopics(reply);
    expect(reply).not.toMatch(/1\. Procedimentos.*2\. Agendar/is);
    expect(latestSlotOffer(state)).toHaveLength(0);
    expect(await client.listCalendarEvents(runId)).toHaveLength(0);
    await cleanup(client, runId);
  });

  test('SYS-CONV-023 - pergunta de valores de resina e porcelana usa preços do playbook', async ({ request }) => {
    const client = new SystemOpsE2eClient(request);
    const runId = createRunId('SYS-CONV-023');
    await setup(client, runId);

    await client.sendLeadMessage(runId, 'oi', 'greeting');
    await client.waitForAgentMessage(runId, 1);
    await client.sendLeadMessage(runId, 'qual o valor das lentes de resina e das lentes de porcelana?', 'lenses-prices');
    const state = await client.waitForAgentMessage(runId, 2);
    const reply = latestAgentMessage(state);

    expect(reply).toMatch(/resina/i);
    expect(reply).toMatch(/porcelana/i);
    expect(currencyMentions(reply).length).toBeGreaterThanOrEqual(2);
    expect(reply).not.toMatch(/caso a caso.*caso a caso|undefined|NaN/i);
    expect(latestSlotOffer(state)).toHaveLength(0);
    expect(await client.listCalendarEvents(runId)).toHaveLength(0);
    await cleanup(client, runId);
  });

  test('SYS-CONV-024 - pergunta sobre outros serviços responde sem perder foco em lentes', async ({ request }) => {
    const client = new SystemOpsE2eClient(request);
    const runId = createRunId('SYS-CONV-024');
    await setup(client, runId);

    await client.sendLeadMessage(runId, 'oi', 'greeting');
    await client.waitForAgentMessage(runId, 1);
    await client.sendLeadMessage(runId, 'vocês também fazem clareamento e implante ou só lentes?', 'other-services');
    const state = await client.waitForAgentMessage(runId, 2);
    const reply = latestAgentMessage(state);

    expect(reply).toMatch(/clareamento|implante/i);
    expect(reply).toMatch(/lente|especiali|principal|foco/i);
    expect(latestSlotOffer(state)).toHaveLength(0);
    expect(await client.listCalendarEvents(runId)).toHaveLength(0);
    await cleanup(client, runId);
  });
});
