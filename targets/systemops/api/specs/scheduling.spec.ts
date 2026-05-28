import { expect, test } from '@playwright/test';
import { createRunId } from '../../systemops.config';
import { e2ePhone } from '../support/zapiPayloadFactory';
import { latestAgentMessage, latestSlotOffer, SystemOpsE2eClient } from '../support/e2eClient';
import {
  expectNoOverlappingEvents,
  expectNoSlotOverlaps,
  expectSlotDurations,
  expectSlotsInsideBusinessHours,
  expectSlotsOnWeekday,
  fromLocalParts,
  localParts,
  nextLocalWeekday
} from '../support/calendarAssertions';

test.describe.configure({ mode: 'serial' });

const activeRunIds = new Set<string>();

function dateText(day: ReturnType<typeof nextLocalWeekday>): string {
  return `${String(day.day).padStart(2, '0')}/${String(day.month + 1).padStart(2, '0')}`;
}

function friday() {
  return nextLocalWeekday(5);
}

function fridayAt(hour: number, minute = 0): Date {
  const day = friday();
  return fromLocalParts(day.year, day.month, day.day, hour, minute);
}

function saturday() {
  return nextLocalWeekday(6);
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

test.describe('SystemOps Scheduling E2E', () => {
  test.afterEach(async ({ request }) => {
    if (activeRunIds.size === 0) return;

    const client = new SystemOpsE2eClient(request);
    for (const runId of [...activeRunIds]) {
      await client.reset(runId);
      activeRunIds.delete(runId);
    }
  });

  test('SYS-AGENDA-001 - agenda vazia oferta slots dentro do expediente', async ({ request }) => {
    const client = new SystemOpsE2eClient(request);
    const runId = createRunId('SYS-AGENDA-001');
    await setup(client, runId);

    await client.sendLeadMessage(runId, `quero avaliação no dia ${dateText(friday())}`, 'ask');
    const state = await client.state(runId);
    const slots = latestSlotOffer(state);

    expectSlotsInsideBusinessHours(slots);
    expectSlotDurations(slots, 60);
    await cleanup(client, runId);
  });

  test('SYS-AGENDA-002 - bloqueio 12h-13h remove almoço das ofertas', async ({ request }) => {
    const client = new SystemOpsE2eClient(request);
    const runId = createRunId('SYS-AGENDA-002');
    await setup(client, runId);

    const blockStart = fridayAt(12);
    const blockEnd = fridayAt(13);
    await client.createCalendarEvent({ runId, startsAt: blockStart, endsAt: blockEnd, summary: 'Almoço QA', type: 'block' });

    await client.sendLeadMessage(runId, `quero avaliação no dia ${dateText(friday())}`, 'ask');
    const slots = latestSlotOffer(await client.state(runId));

    expectNoSlotOverlaps(slots, blockStart, blockEnd);
    await cleanup(client, runId);
  });

  test('SYS-AGENDA-003 - consulta 09h-10h remove conflito e buffer pós-consulta', async ({ request }) => {
    const client = new SystemOpsE2eClient(request);
    const runId = createRunId('SYS-AGENDA-003');
    await setup(client, runId);

    const busyStart = fridayAt(9);
    const busyEnd = fridayAt(11); // consulta 9-10 + buffer de 60min esperado
    await client.createCalendarEvent({
      runId,
      startsAt: busyStart,
      endsAt: fridayAt(10),
      summary: 'Consulta manual QA',
      type: 'appointment'
    });

    await client.sendLeadMessage(runId, `quero avaliação no dia ${dateText(friday())} de manhã`, 'ask');
    const slots = latestSlotOffer(await client.state(runId));

    expectNoSlotOverlaps(slots, busyStart, busyEnd);
    await cleanup(client, runId);
  });

  test('SYS-AGENDA-004 - lead pede manhã e recebe apenas manhã', async ({ request }) => {
    const client = new SystemOpsE2eClient(request);
    const runId = createRunId('SYS-AGENDA-004');
    await setup(client, runId);

    await client.sendLeadMessage(runId, `quero avaliação no dia ${dateText(friday())} de manhã`, 'ask');
    const slots = latestSlotOffer(await client.state(runId));

    expect(slots.length).toBeGreaterThan(0);
    for (const slot of slots) {
      expect(new Date(slot.startsAt).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', hour12: false }))
        .toMatch(/0[8-9]|1[0-1]/);
    }
    await cleanup(client, runId);
  });

  test('SYS-AGENDA-005 - lead pede tarde e recebe apenas tarde', async ({ request }) => {
    const client = new SystemOpsE2eClient(request);
    const runId = createRunId('SYS-AGENDA-005');
    await setup(client, runId);

    await client.sendLeadMessage(runId, `quero avaliação no dia ${dateText(friday())} à tarde`, 'ask');
    const slots = latestSlotOffer(await client.state(runId));

    expect(slots.length).toBeGreaterThan(0);
    for (const slot of slots) {
      const hour = Number(new Date(slot.startsAt).toLocaleString('pt-BR', {
        timeZone: 'America/Sao_Paulo',
        hour: '2-digit',
        hour12: false
      }));
      expect(hour).toBeGreaterThanOrEqual(12);
      expect(hour).toBeLessThan(18);
    }
    await cleanup(client, runId);
  });

  test('SYS-AGENDA-006 - lead pede noite e sistema não oferta fora do expediente', async ({ request }) => {
    const client = new SystemOpsE2eClient(request);
    const runId = createRunId('SYS-AGENDA-006');
    await setup(client, runId);

    await client.sendLeadMessage(runId, `quero avaliação no dia ${dateText(friday())} à noite`, 'ask');
    const state = await client.state(runId);

    expect(latestSlotOffer(state)).toHaveLength(0);
    expect(latestAgentMessage(state)).toContain('Não temos atendimento');
    await cleanup(client, runId);
  });

  test('SYS-AGENDA-007 - lead pede sexta e recebe somente sexta no timezone da clínica', async ({ request }) => {
    const client = new SystemOpsE2eClient(request);
    const runId = createRunId('SYS-AGENDA-007');
    await setup(client, runId);

    await client.sendLeadMessage(runId, 'quero avaliação sexta de manhã', 'ask');
    const slots = latestSlotOffer(await client.state(runId));

    expectSlotsOnWeekday(slots, 5);
    await cleanup(client, runId);
  });

  test('SYS-AGENDA-008 - procedimento longo não é ofertado quando não cabe', async ({ request }) => {
    const client = new SystemOpsE2eClient(request);
    const runId = createRunId('SYS-AGENDA-008');
    await setup(client, runId);

    await client.createCalendarEvent({
      runId,
      startsAt: fridayAt(8),
      endsAt: fridayAt(14),
      summary: 'Agenda ocupada QA',
      type: 'appointment'
    });

    await client.sendLeadMessage(runId, `quero 20 lentes no dia ${dateText(friday())}`, 'ask');
    const state = await client.state(runId);

    expect(latestSlotOffer(state)).toHaveLength(0);
    expect(latestAgentMessage(state)).toContain('Não há horários disponíveis');
    await cleanup(client, runId);
  });

  test('SYS-AGENDA-009 - confirmar opção 1 cria exatamente um evento no Calendar', async ({ request }) => {
    const client = new SystemOpsE2eClient(request);
    const runId = createRunId('SYS-AGENDA-009');
    await setup(client, runId);

    await client.sendLeadMessage(runId, `quero avaliação no dia ${dateText(friday())} de manhã`, 'ask');
    await client.sendLeadMessage(runId, 'quero a opção 1', 'confirm');

    const events = await client.listCalendarEvents(runId);
    const state = await client.state(runId);

    expect(events).toHaveLength(1);
    expect(state.appointments.filter((appointment) => appointment.status === 'scheduled')).toHaveLength(1);
    await cleanup(client, runId);
  });

  test('SYS-AGENDA-010 - duas confirmações concorrentes do mesmo slot criam só um evento', async ({ request }) => {
    const client = new SystemOpsE2eClient(request);
    const runId = createRunId('SYS-AGENDA-010');
    await setup(client, runId);

    const phoneA = `${e2ePhone(runId)}-a`;
    const phoneB = `${e2ePhone(runId)}-b`;
    await client.sendLeadMessage(runId, `quero avaliação no dia ${dateText(friday())} de manhã`, 'ask-a', phoneA);
    await client.sendLeadMessage(runId, `quero avaliação no dia ${dateText(friday())} de manhã`, 'ask-b', phoneB);

    await Promise.all([
      client.sendLeadMessage(runId, 'quero a opção 1', 'confirm-a', phoneA),
      client.sendLeadMessage(runId, 'quero a opção 1', 'confirm-b', phoneB)
    ]);

    const events = await client.listCalendarEvents(runId);
    const state = await client.state(runId);

    expect(events.filter((event) => event.summary.includes('Avaliação'))).toHaveLength(1);
    expect(state.appointments.filter((appointment) => appointment.status === 'scheduled')).toHaveLength(1);
    expectNoOverlappingEvents(events);
    await cleanup(client, runId);
  });

  test('SYS-AGENDA-011 - operador ocupa horário após oferta, confirmação falha e sistema reoferta', async ({ request }) => {
    const client = new SystemOpsE2eClient(request);
    const runId = createRunId('SYS-AGENDA-011');
    await setup(client, runId);

    await client.sendLeadMessage(runId, `quero avaliação no dia ${dateText(friday())} de manhã`, 'ask');
    const offered = latestSlotOffer(await client.state(runId));
    expect(offered.length).toBeGreaterThan(0);

    await client.createCalendarEvent({
      runId,
      startsAt: new Date(offered[0].startsAt),
      endsAt: new Date(offered[0].endsAt),
      summary: 'Operador ocupou QA',
      type: 'appointment'
    });

    await client.sendLeadMessage(runId, 'quero a opção 1', 'confirm');
    const state = await client.state(runId);

    expect(state.appointments.filter((appointment) => appointment.status === 'scheduled')).toHaveLength(0);
    expect(latestSlotOffer(state).find((slot) => slot.startsAt === offered[0].startsAt)).toBeUndefined();
    await cleanup(client, runId);
  });

  test('SYS-AGENDA-012 - cancelamento libera o slot', async ({ request }) => {
    const client = new SystemOpsE2eClient(request);
    const runId = createRunId('SYS-AGENDA-012');
    await setup(client, runId);

    await client.sendLeadMessage(runId, `quero avaliação no dia ${dateText(friday())} de manhã`, 'ask');
    await client.sendLeadMessage(runId, 'quero a opção 1', 'confirm');
    await client.sendLeadMessage(runId, 'quero cancelar', 'cancel');

    const state = await client.state(runId);
    expect(state.appointments.filter((appointment) => appointment.status === 'cancelled')).toHaveLength(1);
    expect(state.slotReservations.filter((reservation) => reservation.status === 'released')).toHaveLength(1);
    await cleanup(client, runId);
  });

  test('SYS-AGENDA-013 - remarcação cancela antigo e cria novo sem duplicar', async ({ request }) => {
    const client = new SystemOpsE2eClient(request);
    const runId = createRunId('SYS-AGENDA-013');
    await setup(client, runId);

    await client.sendLeadMessage(runId, `quero avaliação no dia ${dateText(friday())} de manhã`, 'ask');
    await client.sendLeadMessage(runId, 'quero a opção 1', 'confirm');
    await client.sendLeadMessage(runId, `quero remarcar avaliação para o dia ${dateText(friday())} à tarde`, 'reschedule');

    const beforeConfirmation = await client.state(runId);
    expect(beforeConfirmation.appointments.filter((appointment) => appointment.status === 'scheduled')).toHaveLength(1);
    expect(beforeConfirmation.appointments.filter((appointment) => appointment.status === 'cancelled')).toHaveLength(0);

    await client.sendLeadMessage(runId, 'quero a opção 1', 'confirm-reschedule');

    const state = await client.state(runId);
    expect(state.appointments.filter((appointment) => appointment.status === 'scheduled')).toHaveLength(1);
    expect(state.appointments.filter((appointment) => appointment.status === 'cancelled')).toHaveLength(1);
    expectNoOverlappingEvents(await client.listCalendarEvents(runId));
    await cleanup(client, runId);
  });

  test('SYS-AGENDA-014 - cleanup deixa agenda QA sem eventos do runId', async ({ request }) => {
    const client = new SystemOpsE2eClient(request);
    const runId = createRunId('SYS-AGENDA-014');
    await setup(client, runId);

    await client.createCalendarEvent({
      runId,
      startsAt: fridayAt(8),
      endsAt: fridayAt(9),
      summary: 'Evento para cleanup QA',
      type: 'appointment'
    });
    expect(await client.listCalendarEvents(runId)).toHaveLength(1);

    await cleanup(client, runId);
  });

  test('SYS-AGENDA-015 - pedido genérico pergunta procedimento antes de ofertar slot', async ({ request }) => {
    const client = new SystemOpsE2eClient(request);
    const runId = createRunId('SYS-AGENDA-015');
    await setup(client, runId);

    await client.sendLeadMessage(runId, `quero marcar uma consulta no dia ${dateText(friday())}`, 'ask');
    const state = await client.state(runId);

    expect(latestSlotOffer(state)).toHaveLength(0);
    expect(latestAgentMessage(state)).toContain('Qual procedimento');
    expect(await client.listCalendarEvents(runId)).toHaveLength(0);
    await cleanup(client, runId);
  });

  test('SYS-AGENDA-016 - 20 Lentes reserva slots de 240 minutos', async ({ request }) => {
    const client = new SystemOpsE2eClient(request);
    const runId = createRunId('SYS-AGENDA-016');
    await setup(client, runId);

    await client.sendLeadMessage(runId, `quero 20 lentes no dia ${dateText(friday())}`, 'ask');
    const slots = latestSlotOffer(await client.state(runId));

    expectSlotDurations(slots, 240);
    expectSlotsInsideBusinessHours(slots);
    await cleanup(client, runId);
  });

  test('SYS-AGENDA-017 - opção inexistente não confirma fallback silencioso', async ({ request }) => {
    const client = new SystemOpsE2eClient(request);
    const runId = createRunId('SYS-AGENDA-017');
    await setup(client, runId);

    await client.sendLeadMessage(runId, `quero avaliação no dia ${dateText(friday())} de manhã`, 'ask');
    const offered = latestSlotOffer(await client.state(runId));
    expect(offered.length).toBeGreaterThan(0);

    await client.sendLeadMessage(runId, 'quero a opção 9', 'invalid-option');
    const state = await client.state(runId);

    expect(latestAgentMessage(state)).toContain('opção');
    expect(state.appointments.filter((appointment) => appointment.status === 'scheduled')).toHaveLength(0);
    expect(await client.listCalendarEvents(runId)).toHaveLength(0);
    expect(latestSlotOffer(state).map((slot) => slot.startsAt)).toEqual(offered.map((slot) => slot.startsAt));
    await cleanup(client, runId);
  });

  test('SYS-AGENDA-018 - pergunta de preço não cria oferta nem evento', async ({ request }) => {
    const client = new SystemOpsE2eClient(request);
    const runId = createRunId('SYS-AGENDA-018');
    await setup(client, runId);

    await client.sendLeadMessage(runId, 'quanto custa 20 lentes?', 'price');
    const state = await client.state(runId);

    expect(latestSlotOffer(state)).toHaveLength(0);
    expect(latestAgentMessage(state)).toContain('valores');
    expect(await client.listCalendarEvents(runId)).toHaveLength(0);
    await cleanup(client, runId);
  });

  test('SYS-AGENDA-019 - urgência clínica aciona atenção humana sem agendar', async ({ request }) => {
    const client = new SystemOpsE2eClient(request);
    const runId = createRunId('SYS-AGENDA-019');
    await setup(client, runId);

    await client.sendLeadMessage(runId, 'estou com muita dor e sangramento', 'urgency');
    const state = await client.state(runId);

    expect(latestSlotOffer(state)).toHaveLength(0);
    expect(latestAgentMessage(state)).toContain('urgência');
    expect(state.conversations.some((conversation) => conversation.needsAttention)).toBe(true);
    expect(await client.listCalendarEvents(runId)).toHaveLength(0);
    await cleanup(client, runId);
  });

  test('SYS-AGENDA-020 - sábado da Ximendes termina às 13h', async ({ request }) => {
    const client = new SystemOpsE2eClient(request);
    const runId = createRunId('SYS-AGENDA-020');
    await setup(client, runId);

    await client.sendLeadMessage(runId, `quero avaliação no dia ${dateText(saturday())}`, 'ask');
    const slots = latestSlotOffer(await client.state(runId));

    expectSlotsOnWeekday(slots, 6);
    for (const slot of slots) {
      const end = localParts(new Date(slot.endsAt));
      expect(end.hour + end.minute / 60).toBeLessThanOrEqual(13);
    }
    await cleanup(client, runId);
  });

  test('SYS-AGENDA-021 - remarcação genérica pede procedimento e mantém agenda antiga', async ({ request }) => {
    const client = new SystemOpsE2eClient(request);
    const runId = createRunId('SYS-AGENDA-021');
    await setup(client, runId);

    await client.sendLeadMessage(runId, `quero avaliação no dia ${dateText(friday())} de manhã`, 'ask');
    await client.sendLeadMessage(runId, 'quero a opção 1', 'confirm');
    await client.sendLeadMessage(runId, `quero remarcar para o dia ${dateText(friday())} à tarde`, 'reschedule-generic');

    const state = await client.state(runId);

    expect(latestAgentMessage(state)).toContain('Qual procedimento');
    expect(latestSlotOffer(state)).toHaveLength(0);
    expect(state.appointments.filter((appointment) => appointment.status === 'scheduled')).toHaveLength(1);
    expect(state.appointments.filter((appointment) => appointment.status === 'cancelled')).toHaveLength(0);
    expect(await client.listCalendarEvents(runId)).toHaveLength(1);
    await cleanup(client, runId);
  });

  test('SYS-AGENDA-022 - remarcação de 20 Lentes mantém duração de 240 minutos', async ({ request }) => {
    const client = new SystemOpsE2eClient(request);
    const runId = createRunId('SYS-AGENDA-022');
    await setup(client, runId);

    await client.sendLeadMessage(runId, `quero 20 lentes no dia ${dateText(friday())}`, 'ask');
    await client.sendLeadMessage(runId, 'quero a opção 1', 'confirm');
    await client.sendLeadMessage(runId, `quero remarcar 20 lentes para o dia ${dateText(saturday())}`, 'reschedule-20-lentes');

    const slots = latestSlotOffer(await client.state(runId));

    expectSlotDurations(slots, 240);
    expectNoOverlappingEvents(await client.listCalendarEvents(runId));
    await cleanup(client, runId);
  });
});
