// BW Odontologia — Qualidade conversacional modo concierge.
// Usa o endpoint /api/playbook/simulate com o playbook real da Ximendes Odontologia
// (clinicId). "BW" era o nome de teste usado quando esta suíte foi escrita — o
// clinicId hardcoded original (5a2ce07d-cfa1-4108-9a3c-3d1fae017067) não existe mais
// na base (achado da Fase 0f do plano de melhoria contínua). Os preços verificados
// pelos testes (Lentes: R$2.500 técnica simplificada / R$5.000 estratificada) batem
// exatamente com o playbook ativo da Ximendes — mesma clínica, id desatualizado.
// Não tem side effects: sem agendamentos, sem escrita no banco.
// Pode rodar em produção com SYSTEMOPS_RUN_LLM_SANDBOX=true.

import { APIRequestContext, expect, test } from '@playwright/test';
import { systemopsConfig } from '../../systemops.config';

const BW_CLINIC_ID = systemopsConfig.productionClinicId ?? '5a2ce07d-cfa1-4108-9a3c-3d1fae017067';

type SimulateResponse = { text: string; intent: string; error?: string };
type HistoryEntry = { role: 'user' | 'assistant'; text: string; intent?: string };

async function simulate(
  request: APIRequestContext,
  message: string,
  history: HistoryEntry[] = [],
): Promise<SimulateResponse> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (systemopsConfig.simulateApiKey) {
    headers['x-simulate-key'] = systemopsConfig.simulateApiKey;
  }
  const res = await request.post('/api/playbook/simulate', {
    headers,
    data: { clinicId: BW_CLINIC_ID, source: 'production', message, history },
  });
  expect(res.status()).toBe(200);
  return res.json() as Promise<SimulateResponse>;
}

async function conversation(
  request: APIRequestContext,
  messages: string[],
): Promise<SimulateResponse[]> {
  const history: HistoryEntry[] = [];
  const results: SimulateResponse[] = [];
  for (const msg of messages) {
    const r = await simulate(request, msg, history);
    history.push({ role: 'user', text: msg });
    history.push({ role: 'assistant', text: r.text, intent: r.intent });
    results.push(r);
  }
  return results;
}

test.describe('BW Odontologia — Concierge Conversation Quality', () => {
  test.beforeEach(async ({}, testInfo) => {
    if (!systemopsConfig.runLlmSandbox) {
      testInfo.skip(true, 'SYSTEMOPS_RUN_LLM_SANDBOX=true é necessário para testes de qualidade conversacional.');
    }
    if (!systemopsConfig.productionClinicId) {
      testInfo.skip(true, 'SYSTEMOPS_PRODUCTION_CLINIC_ID não configurado — clinicId hardcoded original não existe mais na base.');
    }
  });

  // ─── Saudação ────────────────────────────────────────────────────────────────

  test('BW-CONV-001 — saudação concierge não força menu numerado', async ({ request }) => {
    const r = await simulate(request, 'Oi');

    expect(r.intent).toMatch(/greeting|acknowledgment/);
    expect(r.text).not.toMatch(/\b[1-5]\.\s/); // sem lista numerada 1-5
    expect(r.text).not.toContain('digitar');    // sem instrução de menu
    expect(r.text.length).toBeGreaterThan(20);
  });

  test('BW-CONV-002 — saudação guia lead para entender o interesse', async ({ request }) => {
    const r = await simulate(request, 'Boa tarde');

    expect(r.text).toMatch(/avaliaç|lentes|procediment|como posso|como posso|o que gostaria|tratament/i);
  });

  // ─── Lentes — apresentação das duas opções ────────────────────────────────────

  test('BW-CONV-010 — "Lentes" sozinha apresenta as duas técnicas', async ({ request }) => {
    // BUG corrigido em 2026-06-05: antes ia direto para agenda sem explicar opções
    const history: HistoryEntry[] = [];
    const greeting = await simulate(request, 'Oi', history);
    history.push({ role: 'user', text: 'Oi' }, { role: 'assistant', text: greeting.text, intent: greeting.intent });

    const r = await simulate(request, 'Lentes', history);

    expect(r.text).toMatch(/simplificad/i);
    expect(r.text).toMatch(/estratificad/i);
  });

  test('BW-CONV-011 — "Lentes" apresenta preço a partir de', async ({ request }) => {
    // BUG corrigido em 2026-06-05: antes deflectava "depende da avaliação"
    const history: HistoryEntry[] = [];
    const g = await simulate(request, 'Oi', history);
    history.push({ role: 'user', text: 'Oi' }, { role: 'assistant', text: g.text, intent: g.intent });

    const r = await simulate(request, 'Lentes', history);

    expect(r.text).toMatch(/2[\.\s]*500|R\$\s*2/i);
  });

  test('BW-CONV-012 — "Tem quais opções de lentes?" NÃO é unclear', async ({ request }) => {
    // BUG corrigido em 2026-06-05: era classificado como unclear
    const [, , r] = await conversation(request, [
      'Oi',
      'Lentes',
      'Tem quais opções de lentes?',
    ]);

    expect(r.intent).not.toBe('unclear');
  });

  test('BW-CONV-013 — "lente de resina ou premium" explica ambas sem unclear', async ({ request }) => {
    const [, r] = await conversation(request, [
      'Oi',
      'quero entender sobre lente de resina ou premium',
    ]);

    expect(r.intent).not.toBe('unclear');
    expect(r.text).toMatch(/simplificad|estratificad|2[\.\s]*500|5[\.\s]*000/i);
  });

  // ─── Preços explícitos ─────────────────────────────────────────────────────

  test('BW-CONV-020 — price inquiry retorna R$ 2.500 e R$ 5.000', async ({ request }) => {
    // BUG corrigido em 2026-06-05: antes só dizia "depende da avaliação"
    const [, r] = await conversation(request, [
      'Oi',
      'qual o valor das lentes simplificadas e estratificadas?',
    ]);

    expect(r.intent).toBe('price_inquiry');
    expect(r.text).toMatch(/2[\.\s]*500/);
    expect(r.text).toMatch(/5[\.\s]*000/);
  });

  test('BW-CONV-021 — price inquiry NÃO inventa valores fora do autorizado', async ({ request }) => {
    const [, r] = await conversation(request, [
      'Oi',
      'qual o valor das lentes?',
    ]);

    const inventedPrices = (r.text.match(/R\$\s*\d[\d.,]+/g) ?? []).filter(
      v => !v.match(/2[.,]500/) && !v.match(/5[.,]000/) && !v.match(/100/)
    );
    expect(inventedPrices).toHaveLength(0);
  });

  test('BW-CONV-022 — confirmar "a partir de 2.500?" gera resposta afirmativa', async ({ request }) => {
    const [, prev, r] = await conversation(request, [
      'Oi',
      'qual o valor das lentes simplificadas?',
      'e a partir de 2.500?',
    ]);

    expect(r.text).toMatch(/2[\.\s]*500|sim|correto|isso mesmo/i);
    expect(r.text).not.toMatch(/não sei|não tenho|não posso confirmar/i);
  });

  // ─── Agendamento ──────────────────────────────────────────────────────────

  test('BW-CONV-030 — pedido de agendamento oferece slots (calendário interno)', async ({ request }) => {
    const [, r] = await conversation(request, [
      'Oi',
      'quero agendar uma avaliação odontológica',
    ]);

    expect(r.intent).toMatch(/book_appointment|slots_found/);
    // Deve conter horários numerados OU pergunta de preferência
    expect(r.text).toMatch(/\d\.|manhã|tarde|período|horário/i);
  });

  test('BW-CONV-031 — confirmar slot 1 retorna intent confirm_slot', async ({ request }) => {
    const history: HistoryEntry[] = [];
    const g = await simulate(request, 'Oi', history);
    history.push({ role: 'user', text: 'Oi' }, { role: 'assistant', text: g.text, intent: g.intent });

    const book = await simulate(request, 'quero agendar uma avaliação odontológica', history);
    history.push({ role: 'user', text: 'quero agendar uma avaliação odontológica' }, { role: 'assistant', text: book.text, intent: book.intent });

    const confirm = await simulate(request, '1', history);

    expect(confirm.intent).toBe('confirm_slot');
    expect(confirm.text).toMatch(/confirmad|agendad|reservad/i);
  });

  // ─── Needs Human ──────────────────────────────────────────────────────────

  test('BW-CONV-040 — "falar com o dentista" → needs_human', async ({ request }) => {
    const [, r] = await conversation(request, [
      'Oi',
      'quero falar diretamente com o dentista',
    ]);

    expect(r.intent).toBe('needs_human');
    expect(r.text).toMatch(/equipe|avisarei|responder/i);
  });

  test('BW-CONV-041 — condição especial de pagamento → needs_human', async ({ request }) => {
    const [, r] = await conversation(request, [
      'Oi',
      'preciso de uma condição especial de pagamento',
    ]);

    expect(r.intent).toBe('needs_human');
  });

  test('BW-CONV-042 — proposta de troca (barter) → needs_human', async ({ request }) => {
    // Caso real: lead propõe trocar serviço por tratamento
    const [, r] = await conversation(request, [
      'Oi',
      'caso queira vir fazer sua tattoo, depois marcamos as lentes',
    ]);

    expect(r.intent).toBe('needs_human');
  });

  test('BW-CONV-043 — "pode me ligar" → needs_human', async ({ request }) => {
    const [, r] = await conversation(request, [
      'Oi',
      'pode me ligar?',
    ]);

    expect(r.intent).toBe('needs_human');
  });

  // ─── Urgência Clínica ─────────────────────────────────────────────────────

  test('BW-CONV-050 — dor de dente → clinical_urgency', async ({ request }) => {
    const [, r] = await conversation(request, [
      'Oi',
      'estou com muita dor de dente, e agora?',
    ]);

    expect(r.intent).toBe('clinical_urgency');
    expect(r.text).toMatch(/equipe|contato|acionarei|ajudar/i);
  });

  // ─── Cancelamento / Reagendamento ────────────────────────────────────────

  test('BW-CONV-060 — "quero cancelar" → cancel_appointment', async ({ request }) => {
    const [, r] = await conversation(request, [
      'Oi',
      'quero cancelar minha consulta',
    ]);

    expect(r.intent).toBe('cancel_appointment');
  });

  test('BW-CONV-061 — "quero remarcar" → reschedule_appointment', async ({ request }) => {
    const [, r] = await conversation(request, [
      'Oi',
      'quero remarcar minha consulta',
    ]);

    expect(r.intent).toBe('reschedule_appointment');
  });

  // ─── Qualidade geral ──────────────────────────────────────────────────────

  test('BW-CONV-070 — farewell fecha conversa sem CTA desnecessário', async ({ request }) => {
    const msgs = ['Oi', 'quero saber sobre lentes', 'obrigado, tchauzão'];
    const [, , r] = await conversation(request, msgs);

    expect(r.intent).toBe('farewell');
    expect(r.text).not.toMatch(/agendar|clique|link|menu/i);
  });

  test('BW-CONV-071 — respostas não inventam procedimentos não cadastrados', async ({ request }) => {
    const [, r] = await conversation(request, [
      'Oi',
      'vocês fazem ortodontia?',
    ]);

    // Não deve afirmar que faz ortodontia (não está cadastrado na BW)
    expect(r.text).not.toMatch(/sim.{0,20}ortodonti/i);
  });
});
