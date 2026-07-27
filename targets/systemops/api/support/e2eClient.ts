import { APIRequestContext, expect } from '@playwright/test';
import { requireE2eConfig } from '../../systemops.config';
import { zapiTextPayload } from './zapiPayloadFactory';
import type { ApprovedReplayScenario } from './approvedReplayDataset';
import type { ExecutableReplayMode } from './replayModes';

export type E2eSlot = {
  index: number;
  startsAt: string;
  endsAt: string;
  label: string;
};

export type E2eState = {
  runId: string;
  leads: Array<{ id: string; name: string | null; phone: string | null; status: string }>;
  conversations: Array<{ id: string; leadId: string; aiPaused: boolean; needsAttention: boolean; attentionReason: string | null }>;
  messages: Array<{ id?: string; conversationId?: string; author?: string; role?: string; body?: string; text?: string; externalId?: string | null; sentAt?: string }>;
  conversationStates?: Array<{ id: string; state: string; payload: unknown; createdAt: string }>;
  slotOffers?: E2eSlot[];
  appointments: Array<{
    id: string;
    leadId: string;
    calendarEventId: string | null;
    startsAt: string;
    endsAt: string;
    status: string;
  }>;
  slotReservations: Array<{
    id: string;
    leadId: string;
    startsAt: string;
    endsAt: string;
    status: string;
  }>;
  followUps?: Array<{
    id: string;
    leadId: string;
    dueAt: string;
    status: string;
    reason: string;
  }>;
};

export type E2eCalendarEvent = {
  calendarEventId: string;
  summary: string;
  startsAt: string;
  endsAt: string;
};

export type E2eAppointment = {
  id: string;
  leadId: string;
  startsAt: string;
  endsAt: string;
  status: string;
};

export type E2eMenuItem = {
  number: number;
  label: string;
  intent: 'procedures' | 'book_appointment' | 'price_inquiry' | 'location' | 'needs_human';
  enabled: boolean;
};

export type E2eClinicSettings = {
  greetingMessage?: string | null;
  menuItems?: E2eMenuItem[] | null;
  businessHours?: string | null;
  takeoverTtlHours?: number;
  postAppointmentBufferMinutes?: number;
};

type SlotsPayload = {
  slots?: E2eSlot[];
  treatmentName?: string;
  durationMinutes?: number;
};

export class SystemOpsE2eClient {
  private readonly secret: string;
  private readonly clinicId: string;

  constructor(private readonly request: APIRequestContext) {
    const config = requireE2eConfig();
    this.secret = config.secret;
    this.clinicId = config.clinicId;
  }

  private headers() {
    return {
      'x-e2e-secret': this.secret,
      Accept: 'application/json'
    };
  }

  async seed() {
    const response = await this.request.post('/api/e2e/seed', { headers: this.headers() });
    expect(response.ok()).toBeTruthy();
    return response.json();
  }

  async reset(runId: string) {
    const response = await this.request.post('/api/e2e/reset', {
      headers: this.headers(),
      data: { runId }
    });
    expect(response.ok()).toBeTruthy();
    return response.json();
  }

  async updateClinicSettings(runId: string, settings: E2eClinicSettings) {
    const response = await this.request.patch('/api/e2e/clinic/settings', {
      headers: this.headers(),
      data: { runId, ...settings }
    });
    expect(response.ok()).toBeTruthy();
    return response.json();
  }

  async clinicSettings(runId: string): Promise<E2eClinicSettings> {
    const response = await this.request.get(`/api/e2e/clinic/settings?runId=${encodeURIComponent(runId)}`, {
      headers: this.headers()
    });
    expect(response.ok()).toBeTruthy();
    return response.json() as Promise<E2eClinicSettings>;
  }

  async sendLeadMessage(runId: string, text: string, step: string, phone?: string) {
    const response = await this.request.post(`/api/whatsapp/zapi?clinicId=${encodeURIComponent(this.clinicId)}`, {
      headers: this.headers(),
      data: zapiTextPayload({ runId, text, step, phone })
    });
    // 200 = processado e enviado; 400 pode ocorrer quando Z-API send falha mas mensagem foi salva
    expect([200, 400]).toContain(response.status());
  }

  async sendOperatorMessage(runId: string, text: string, step: string, phone?: string) {
    const response = await this.request.post(`/api/whatsapp/zapi?clinicId=${encodeURIComponent(this.clinicId)}`, {
      headers: this.headers(),
      data: zapiTextPayload({ runId, text, step, phone, fromMe: true })
    });
    expect([200, 400]).toContain(response.status());
  }

  async runReplayScenario(
    runId: string,
    scenario: ApprovedReplayScenario,
    mode: ExecutableReplayMode = 'closed_loop',
  ): Promise<ReplayScenarioRun> {
    const response = await this.request.post('/api/e2e/replay/scenario', {
      headers: this.headers(),
      data: {
        runId,
        mode,
        scenario,
      },
    });
    const body = await response.json() as ReplayScenarioRun | {
      error: string;
      message?: string;
    };
    if (![200, 422].includes(response.status())) {
      throw new Error(
        `Replay endpoint failed (${response.status()}): ${JSON.stringify(body)}`,
      );
    }
    return body as ReplayScenarioRun;
  }

  async markAppointmentStatus(appointmentId: string, status: 'scheduled' | 'confirmed' | 'cancelled' | 'completed' | 'no_show'): Promise<void> {
    const response = await this.request.patch('/api/e2e/appointments', {
      headers: this.headers(),
      data: { appointmentId, status }
    });
    expect(response.ok()).toBeTruthy();
  }

  async createAppointment(input: {
    runId: string;
    startsAt: Date;
    endsAt: Date;
  }): Promise<E2eAppointment> {
    const response = await this.request.post('/api/e2e/appointments', {
      headers: this.headers(),
      data: {
        runId: input.runId,
        startsAt: input.startsAt.toISOString(),
        endsAt: input.endsAt.toISOString(),
      }
    });
    expect(response.ok()).toBeTruthy();
    const body = await response.json() as { appointment: E2eAppointment };
    return body.appointment;
  }

  async createCalendarEvent(input: {
    runId: string;
    startsAt: Date;
    endsAt: Date;
    summary: string;
    type?: 'appointment' | 'block';
  }): Promise<E2eCalendarEvent> {
    const response = await this.request.post('/api/e2e/calendar/events', {
      headers: this.headers(),
      data: {
        runId: input.runId,
        startsAt: input.startsAt.toISOString(),
        endsAt: input.endsAt.toISOString(),
        summary: input.summary,
        type: input.type ?? 'appointment'
      }
    });
    expect(response.ok()).toBeTruthy();
    const body = await response.json() as { event: E2eCalendarEvent };
    return body.event;
  }

  async listCalendarEvents(runId: string): Promise<E2eCalendarEvent[]> {
    const response = await this.request.get(`/api/e2e/calendar/events?runId=${encodeURIComponent(runId)}`, {
      headers: this.headers()
    });
    expect(response.ok()).toBeTruthy();
    const body = await response.json() as { events: E2eCalendarEvent[] };
    return body.events;
  }

  async state(runId: string): Promise<E2eState> {
    const response = await this.request.get(`/api/e2e/state?runId=${encodeURIComponent(runId)}`, {
      headers: this.headers()
    });
    expect(response.ok()).toBeTruthy();
    return response.json() as Promise<E2eState>;
  }

  async waitForAgentMessage(runId: string, minCount = 1, timeoutMs = 20000): Promise<E2eState> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const s = await this.state(runId);
      if (agentMessageCount(s) >= minCount) return s;
      await new Promise(r => setTimeout(r, 1500));
    }
    throw new Error(`Timeout: esperado ${minCount} mensagem(ns) do agente após ${timeoutMs}ms`);
  }
}

export type ReplayScenarioRun = {
  schemaVersion: 'replay-scenario-run.v1';
  runId: string;
  scenarioId: string;
  mode: ExecutableReplayMode;
  clockMode: string;
  transcript: Array<{
    author: string;
    body: string;
    mediaType: string | null;
    intent: string | null;
    sentAt: string;
  }>;
  trace: Array<{
    turnId: string;
    stage: string;
    sequence: number;
    metadata?: Record<string, string | number | boolean | null>;
  }>;
  effects: {
    outbound: unknown[];
    calendar: unknown[];
  };
  checks: Array<{
    code: string;
    passed: boolean;
  }>;
  executionRuns?: Array<{
    scenarioTurnIds: string[];
    turnIds: string[];
    process: {
      claimed: number;
      processed: number;
      ignored: number;
      retried: number;
      dead: number;
      recovered: number;
    };
    send: {
      claimed: number;
      sent: number;
      ignored: number;
      deferred: number;
      retried: number;
      dead: number;
      recovered: number;
    };
  }>;
};

function isAgentMessage(m: E2eState['messages'][number]): boolean {
  return m.author === 'agent' || m.role === 'agent';
}

function messageText(m: E2eState['messages'][number]): string {
  return m.body ?? m.text ?? '';
}

export function latestAgentMessage(state: E2eState): string {
  return messageText(state.messages.filter(isAgentMessage).at(-1) ?? {});
}

export function agentMessageCount(state: E2eState): number {
  return state.messages.filter(isAgentMessage).length;
}

export function agentMessages(state: E2eState): string[] {
  return state.messages.filter(isAgentMessage).map(messageText);
}

export function latestSlotOffer(state: E2eState): E2eSlot[] {
  // API nova retorna slotOffers diretamente
  if (state.slotOffers !== undefined) return state.slotOffers;

  // fallback para formato legado via conversationStates
  const stateRow = [...(state.conversationStates ?? [])]
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    .at(-1);

  if (stateRow?.state !== 'slots_offered') return [];

  return ((stateRow?.payload as SlotsPayload | null)?.slots ?? []) as E2eSlot[];
}
