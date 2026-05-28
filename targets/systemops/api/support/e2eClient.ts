import { APIRequestContext, expect } from '@playwright/test';
import { requireE2eConfig } from '../../systemops.config';
import { zapiTextPayload } from './zapiPayloadFactory';

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
  messages: Array<{ id: string; conversationId: string; author: string; body: string; externalId: string | null }>;
  conversationStates: Array<{ id: string; state: string; payload: unknown; createdAt: string }>;
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
};

export type E2eCalendarEvent = {
  calendarEventId: string;
  summary: string;
  startsAt: string;
  endsAt: string;
};

type SlotsPayload = {
  slots?: E2eSlot[];
  treatmentName?: string;
  durationMinutes?: number;
};

export class SystemOpsE2eClient {
  private readonly secret: string;

  constructor(private readonly request: APIRequestContext) {
    this.secret = requireE2eConfig().secret;
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

  async sendLeadMessage(runId: string, text: string, step: string, phone?: string) {
    const response = await this.request.post('/api/whatsapp/zapi', {
      data: zapiTextPayload({ runId, text, step, phone })
    });
    expect(response.status()).toBe(200);
  }

  async sendOperatorMessage(runId: string, text: string, step: string, phone?: string) {
    const response = await this.request.post('/api/whatsapp/zapi', {
      data: zapiTextPayload({ runId, text, step, phone, fromMe: true })
    });
    expect(response.status()).toBe(200);
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
}

export function latestAgentMessage(state: E2eState): string {
  const agentMessages = state.messages.filter((message) => message.author === 'agent');
  return agentMessages.at(-1)?.body ?? '';
}

export function agentMessageCount(state: E2eState): number {
  return state.messages.filter((message) => message.author === 'agent').length;
}

export function latestSlotOffer(state: E2eState): E2eSlot[] {
  const stateRow = [...state.conversationStates]
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    .at(-1);

  if (stateRow?.state !== 'slots_offered') return [];

  return ((stateRow?.payload as SlotsPayload | null)?.slots ?? []) as E2eSlot[];
}
