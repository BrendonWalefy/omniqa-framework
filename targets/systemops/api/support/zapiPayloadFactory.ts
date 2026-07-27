export type ZApiPayloadInput = {
  runId: string;
  text: string;
  step: string;
  phone?: string;
  fromMe?: boolean;
};

export function e2ePhone(runId: string): string {
  return `e2e-${runId}`;
}

export function zapiTextPayload(input: ZApiPayloadInput) {
  return {
    fromMe: input.fromMe ?? false,
    isGroupMsg: false,
    isStatusReply: false,
    phone: input.phone ?? e2ePhone(input.runId),
    // instanceId não é usado para resolver a clínica quando o webhook recebe
    // ?clinicId= na URL (e2eClient sempre manda esse override), mas
    // normalizeZApiInboundPayload (process-message-job.ts) exige o campo presente e
    // não-vazio para aceitar o payload — sem isso o job era descartado com
    // reason:"unsupported_provider_payload" e a IA nunca respondia nos testes E2E.
    instanceId: 'e2e-fake-instance',
    senderName: `[E2E:${input.runId}] Lead QA`,
    messageId: `e2e-${input.runId}-${input.step}-${Date.now()}`,
    momment: Date.now(),
    text: {
      message: input.text
    }
  };
}
