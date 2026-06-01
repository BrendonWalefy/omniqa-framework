import { expect, test } from '@playwright/test';
import { createRunId } from '../../systemops.config';
import {
  agentMessageCount,
  latestAgentMessage,
  latestSlotOffer,
  SystemOpsE2eClient
} from '../support/e2eClient';

// Specs de experiência de chegada — cenários reais onde o paciente avisa pelo
// WhatsApp que chegou ou que vai se atrasar para uma consulta agendada.
//
// Ciclo TDD:
//   RED  — specs escritas antes da feature existir
//   GREEN — implementar patient_arrived intent + handler no ConversationOrchestrator

test.describe.configure({ mode: 'serial' });

const activeRunIds = new Set<string>();

/** Appointment de 1h a partir de agora (simula consulta "hoje") */
function todayAppointment(): { startsAt: Date; endsAt: Date } {
  const startsAt = new Date();
  startsAt.setMinutes(0, 0, 0);
  const endsAt = new Date(startsAt.getTime() + 60 * 60_000);
  return { startsAt, endsAt };
}

/** Hora local da clínica (UTC-3 / America/Sao_Paulo) para um Date UTC */
function brazilHour(utc: Date): number {
  return (utc.getUTCHours() - 3 + 24) % 24;
}

async function setup(client: SystemOpsE2eClient, runId: string) {
  activeRunIds.add(runId);
  await client.reset(runId);
  await client.seed();
}

async function cleanup(client: SystemOpsE2eClient, runId: string) {
  await client.reset(runId);
  activeRunIds.delete(runId);
}

test.describe('SystemOps Arrival Experience E2E', () => {
  test.afterEach(async ({ request }) => {
    if (activeRunIds.size === 0) return;
    const client = new SystemOpsE2eClient(request);
    for (const runId of [...activeRunIds]) {
      await client.reset(runId);
      activeRunIds.delete(runId);
    }
  });

  // ─────────────────────────────────────────────────────────────────────────
  // SYS-ARRIVAL-001
  // Paciente tem consulta hoje e avisa que chegou antes do horário.
  // Comportamento esperado:
  //   - IA reconhece a chegada com mensagem acolhedora ("equipe foi avisada")
  //   - NÃO exibe menu, NÃO oferece slots
  //   - needsAttention = true com attentionReason mencionando a chegada
  // ─────────────────────────────────────────────────────────────────────────
  test('SYS-ARRIVAL-001 - paciente com consulta hoje avisa chegada e IA aciona equipe', async ({ request }) => {
    const client = new SystemOpsE2eClient(request);
    const runId = createRunId('SYS-ARRIVAL-001');
    await setup(client, runId);

    const { startsAt, endsAt } = todayAppointment();
    await client.createAppointment({ runId, startsAt, endsAt });

    await client.sendLeadMessage(runId, 'Cheguei um pouco antes, estou esperando na recepção', 'arrival');
    const state = await client.waitForAgentMessage(runId, 1);

    const conv = state.conversations[0];
    expect(conv?.needsAttention).toBe(true);
    expect(conv?.attentionReason).toMatch(/chegad|paciente|recep|aguard/i);

    const reply = latestAgentMessage(state);
    expect(reply).toMatch(/equipe|avisad|aguard|momento|j[aá] (te |os )?esperamos/i);
    expect(reply).not.toMatch(/1\. Procedimentos|2\. Agendar|Como posso (te |lhe )?ajudar/i);
    expect(latestSlotOffer(state)).toHaveLength(0);

    await cleanup(client, runId);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // SYS-ARRIVAL-002
  // Paciente diz "cheguei" mas NÃO tem agendamento hoje (walk-in).
  // Comportamento esperado:
  //   - IA ainda reconhece a chegada e aciona equipe (walk-in também precisa de atenção)
  //   - needsAttention = true — alguém está fisicamente presente
  //   - attentionReason NÃO menciona horário específico (sem appointment no sistema)
  //   - Resposta acolhedora, sem menu, sem slots
  // ─────────────────────────────────────────────────────────────────────────
  test('SYS-ARRIVAL-002 - "cheguei" sem agendamento aciona equipe sem mencionar horário', async ({ request }) => {
    const client = new SystemOpsE2eClient(request);
    const runId = createRunId('SYS-ARRIVAL-002');
    await setup(client, runId);

    // Sem createAppointment — walk-in sem consulta registrada hoje
    await client.sendLeadMessage(runId, 'Cheguei', 'arrival-no-appointment');
    const state = await client.waitForAgentMessage(runId, 1);

    const conv = state.conversations[0];
    expect(conv?.needsAttention).toBe(true);
    // Sem appointment, o attentionReason não deve citar horário de consulta específico
    expect(conv?.attentionReason).not.toMatch(/\d{1,2}h\d{0,2}|\d{2}:\d{2}/);

    const reply = latestAgentMessage(state);
    expect(reply).toMatch(/equipe|avisad|aguard|momento|j[aá] (te |os )?esperamos/i);
    expect(latestSlotOffer(state)).toHaveLength(0);

    await cleanup(client, runId);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // SYS-ARRIVAL-003
  // Paciente tem consulta hoje e avisa que vai chegar atrasado.
  // Comportamento esperado:
  //   - IA confirma que recebeu o recado ("anotado", "obrigado por avisar")
  //   - needsAttention = true para o operador saber do atraso
  //   - NÃO cancela a consulta, NÃO oferece reagendamento automático
  //   - NÃO oferece slots (não é pedido de remarcação)
  // ─────────────────────────────────────────────────────────────────────────
  test('SYS-ARRIVAL-003 - paciente com consulta avisa atraso e IA notifica equipe', async ({ request }) => {
    const client = new SystemOpsE2eClient(request);
    const runId = createRunId('SYS-ARRIVAL-003');
    await setup(client, runId);

    const { startsAt, endsAt } = todayAppointment();
    await client.createAppointment({ runId, startsAt, endsAt });

    // Estabelece conversa antes (simula paciente com histórico)
    await client.sendLeadMessage(runId, 'oi', 'greeting');
    await client.waitForAgentMessage(runId, 1);

    await client.sendLeadMessage(runId, 'Vou me atrasar uns 20 minutos, chego por volta das 12h20', 'late-arrival');
    const state = await client.waitForAgentMessage(runId, 2);

    const conv = state.conversations[0];
    expect(conv?.needsAttention).toBe(true);

    const reply = latestAgentMessage(state);
    expect(reply).toMatch(/obrigado|anotad|avisa|certo|tranquil|sem problema/i);
    expect(latestSlotOffer(state)).toHaveLength(0);
    expect(state.appointments.filter(a => a.status === 'scheduled')).toHaveLength(1);

    await cleanup(client, runId);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // SYS-ARRIVAL-004
  // Paciente tem consulta hoje e cancela no dia.
  // Comportamento esperado:
  //   - IA cancela o agendamento
  //   - Resposta oferece reagendamento de forma acolhedora
  //   - Appointment muda para status 'cancelled'
  // ─────────────────────────────────────────────────────────────────────────
  test('SYS-ARRIVAL-004 - paciente cancela no dia e IA oferece reagendamento', async ({ request }) => {
    const client = new SystemOpsE2eClient(request);
    const runId = createRunId('SYS-ARRIVAL-004');
    await setup(client, runId);

    const { startsAt, endsAt } = todayAppointment();
    await client.createAppointment({ runId, startsAt, endsAt });

    // Estabelece conversa antes — o cancelamento vai como segundo turno
    await client.sendLeadMessage(runId, 'oi', 'greeting');
    await client.waitForAgentMessage(runId, 1);

    // Mensagem sem keywords de menu (evita "marcar"/"consulta") para ir direto ao LLM
    await client.sendLeadMessage(runId, 'Não vou conseguir ir hoje, preciso cancelar', 'cancel-day-of');
    const state = await client.waitForAgentMessage(runId, 2);

    const reply = latestAgentMessage(state);
    expect(reply).toMatch(/cancelad|reagend|hor[aá]rio|dispon|outro dia/i);

    const cancelled = state.appointments.filter(a => a.status === 'cancelled');
    expect(cancelled).toHaveLength(1);

    await cleanup(client, runId);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // SYS-ARRIVAL-005
  // Paciente confirma presença na véspera da consulta.
  // Comportamento esperado:
  //   - IA confirma o agendamento de forma acolhedora ("te esperamos!")
  //   - NÃO oferece slots (paciente não quer remarcar)
  //   - Appointment permanece 'scheduled'
  // ─────────────────────────────────────────────────────────────────────────
  test('SYS-ARRIVAL-005 - confirmação de presença mantém consulta e responde com acolhimento', async ({ request }) => {
    const client = new SystemOpsE2eClient(request);
    const runId = createRunId('SYS-ARRIVAL-005');
    await setup(client, runId);

    const { startsAt, endsAt } = todayAppointment();
    await client.createAppointment({ runId, startsAt, endsAt });

    await client.sendLeadMessage(runId, 'Só confirmando que estarei aí no horário combinado', 'confirm-presence');
    const state = await client.waitForAgentMessage(runId, 1);

    const reply = latestAgentMessage(state);
    // Confirmação de presença é tratada como patient_arrived — resposta acolhedora, sem menu/slots
    expect(reply).toMatch(/esperamos|aguard|confirm|[oó]timo|perfeito|at[eé] logo|equipe|avisam|atendido/i);
    expect(latestSlotOffer(state)).toHaveLength(0);
    expect(state.appointments.filter(a => a.status === 'scheduled')).toHaveLength(1);

    await cleanup(client, runId);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // SYS-ARRIVAL-006
  // Paciente tem dois appointments hoje (manhã e tarde) e avisa chegada.
  //
  // Bug: findTodayAppointment usa .limit(1) sem orderBy — com múltiplos
  // appointments retorna o que vier primeiro no banco (ordem de inserção),
  // podendo referenciar o horário errado na notificação ao operador.
  //
  // Comportamento esperado após correção:
  //   - attentionReason menciona o appointment mais próximo (menor startsAt)
  //   - NÃO menciona apenas o appointment mais distante
  // ─────────────────────────────────────────────────────────────────────────
  test('SYS-ARRIVAL-006 - múltiplos appointments hoje: attentionReason referencia o mais próximo', async ({ request }) => {
    const client = new SystemOpsE2eClient(request);
    const runId = createRunId('SYS-ARRIVAL-006');
    await setup(client, runId);

    // Appointment próximo: daqui a 1h
    const nearStart = new Date(Date.now() + 1 * 60 * 60_000);
    nearStart.setSeconds(0, 0);
    const nearEnd = new Date(nearStart.getTime() + 60 * 60_000);

    // Appointment distante: daqui a 4h (mesmo dia)
    const farStart = new Date(Date.now() + 4 * 60 * 60_000);
    farStart.setSeconds(0, 0);
    const farEnd = new Date(farStart.getTime() + 60 * 60_000);

    // Insere o distante primeiro para expor o bug (se não houver orderBy, retorna o distante)
    await client.createAppointment({ runId, startsAt: farStart, endsAt: farEnd });
    await client.createAppointment({ runId, startsAt: nearStart, endsAt: nearEnd });

    await client.sendLeadMessage(runId, 'Cheguei, estou na recepção', 'arrival-multi-appt');
    const state = await client.waitForAgentMessage(runId, 1);

    const conv = state.conversations[0];
    expect(conv?.needsAttention).toBe(true);

    // attentionReason deve mencionar a hora do appointment MAIS PRÓXIMO
    const nearHour = brazilHour(nearStart);
    const farHour = brazilHour(farStart);
    expect(conv?.attentionReason).toContain(`às ${nearHour}h`);
    // Não deve referenciar exclusivamente o horário mais distante
    expect(conv?.attentionReason).not.toMatch(new RegExp(`às ${farHour}h`));

    await cleanup(client, runId);
  });
});
