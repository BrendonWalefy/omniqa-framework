import { expect, test } from '@playwright/test';
import { createRunId, e2eSkipReason } from '../../systemops.config';
import { latestAgentMessage, latestSlotOffer, SystemOpsE2eClient } from '../support/e2eClient';

// Specs de no-show — paciente não comparece à consulta agendada.
//
// Ciclo TDD:
//   RED  — specs escritas antes da feature existir
//   GREEN — implementar PATCH /api/e2e/appointments + scheduleFollowUp
//
// Comportamentos esperados:
//   - Operador marca no-show → appointment.status = 'no_show'
//   - Sistema agenda follow-up automático (+7 dias) para reengajamento
//   - IA não oferece novo agendamento de forma proativa (paciente que faltou
//     deve receber follow-up personalizado, não mensagem genérica de menu)

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

test.describe('SystemOps No-Show Experience E2E', () => {
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

  // ─────────────────────────────────────────────────────────────────────────
  // SYS-NOSHOW-001
  // Operador marca paciente como não compareceu.
  //
  // Comportamento esperado:
  //   - appointment.status muda para 'no_show'
  //   - Follow-up pendente agendado para +7 dias (reengajamento automático)
  //   - Follow-up tem reason "Lead não compareceu à consulta"
  // ─────────────────────────────────────────────────────────────────────────
  test('SYS-NOSHOW-001 - operador marca no-show → appointment atualizado e follow-up agendado', async ({ request }) => {
    const client = new SystemOpsE2eClient(request);
    const runId = createRunId('SYS-NOSHOW-001');
    await setup(client, runId);

    // Paciente tem consulta hoje
    const startsAt = new Date();
    startsAt.setMinutes(0, 0, 0);
    const endsAt = new Date(startsAt.getTime() + 60 * 60_000);
    const appointment = await client.createAppointment({ runId, startsAt, endsAt });

    // Appointment começa como scheduled
    const stateBefore = await client.state(runId);
    expect(stateBefore.appointments.filter(a => a.status === 'scheduled')).toHaveLength(1);

    // Operador marca como não compareceu
    await client.markAppointmentStatus(appointment.id, 'no_show');

    // Appointment deve estar como no_show
    const stateAfter = await client.state(runId);
    expect(stateAfter.appointments.filter(a => a.status === 'no_show')).toHaveLength(1);
    expect(stateAfter.appointments.filter(a => a.status === 'scheduled')).toHaveLength(0);

    // Follow-up de reengajamento deve ter sido agendado
    const pendingFollowUps = (stateAfter.followUps ?? []).filter(f => f.status === 'pending');
    expect(pendingFollowUps).toHaveLength(1);
    expect(pendingFollowUps[0].reason).toMatch(/não compareceu|no.show/i);

    // Follow-up deve ser para ~7 dias depois da consulta
    const followUpDueAt = new Date(pendingFollowUps[0].dueAt);
    const expectedDueAt = new Date(startsAt.getTime() + 7 * 24 * 60 * 60_000);
    const diffMs = Math.abs(followUpDueAt.getTime() - expectedDueAt.getTime());
    expect(diffMs).toBeLessThan(60_000); // tolerância de 1 minuto

    await cleanup(client, runId);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // SYS-NOSHOW-002
  // Paciente que faltou entra em contato depois — IA trata normalmente.
  //
  // Comportamento esperado:
  //   - Mesmo com appointment no_show, se o paciente mandar mensagem a IA responde
  //   - NÃO deve mencionar o no-show de forma negativa
  //   - NÃO deve bloquear o paciente de reagendar
  // ─────────────────────────────────────────────────────────────────────────
  test('SYS-NOSHOW-002 - paciente que faltou volta a contatar e IA responde normalmente', async ({ request }) => {
    const client = new SystemOpsE2eClient(request);
    const runId = createRunId('SYS-NOSHOW-002');
    await setup(client, runId);

    // Appointment criado e marcado como no_show
    const startsAt = new Date(Date.now() - 2 * 60 * 60_000); // 2h atrás (consulta que passou)
    startsAt.setSeconds(0, 0);
    const endsAt = new Date(startsAt.getTime() + 60 * 60_000);
    const appointment = await client.createAppointment({ runId, startsAt, endsAt });
    await client.markAppointmentStatus(appointment.id, 'no_show');

    // Paciente entra em contato depois
    await client.sendLeadMessage(runId, 'oi, precisei sair antes mas quero agendar de novo', 'return-after-noshow');
    const state = await client.waitForAgentMessage(runId, 1);
    const reply = latestAgentMessage(state);

    // IA deve receber bem — sem punição ou menção ao no-show
    expect(reply).toMatch(/ol[aá]|bom dia|boa tarde|claro|ajud|agendar|horário/i);
    expect(reply).not.toMatch(/não compareceu|faltou|ausente|última vez/i);

    await cleanup(client, runId);
  });
});
