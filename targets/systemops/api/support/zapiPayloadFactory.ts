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
    senderName: `[E2E:${input.runId}] Lead QA`,
    messageId: `e2e-${input.runId}-${input.step}-${Date.now()}`,
    momment: Date.now(),
    text: {
      message: input.text
    }
  };
}
