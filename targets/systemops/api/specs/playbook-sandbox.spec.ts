import { APIRequestContext, expect, test } from '@playwright/test';
import { isProductionLikeUrl, systemopsConfig } from '../../systemops.config';

type SandboxPlaybook = {
  specialty: string;
  procedureDescription: string;
  toneOfVoice: string;
  differentials: string[];
  commercialPolicy: string;
  objections?: Array<{ objection: string; response: string }>;
  greetingMessage: string;
};

const BASE_PLAYBOOK: SandboxPlaybook = {
  specialty: 'Odontologia Estética',
  procedureDescription: 'Avaliação odontológica gratuita para entender objetivo, histórico e próximos passos.',
  toneOfVoice: 'acolhedor',
  differentials: ['Atendimento humanizado', 'Planejamento personalizado'],
  commercialPolicy: 'Avaliação inicial gratuita. Tratamentos podem ser parcelados conforme análise da equipe.',
  greetingMessage: ''
};

async function simulate(
  request: APIRequestContext,
  input: {
    message: string;
    history?: Array<{ role: 'user' | 'assistant'; text: string; intent?: string }>;
    playbook?: Partial<SandboxPlaybook>;
  }
) {
  const headers: Record<string, string> = {};
  if (systemopsConfig.simulateApiKey) {
    headers['x-simulate-key'] = systemopsConfig.simulateApiKey;
  }

  const response = await request.post('/api/playbook/simulate', {
    headers,
    data: {
      message: input.message,
      history: input.history ?? [],
      playbook: {
        ...BASE_PLAYBOOK,
        ...input.playbook
      }
    }
  });
  expect(response.status()).toBe(200);
  return response.json() as Promise<{ text: string; intent: string }>;
}

test.describe('SystemOps Playbook Sandbox - Objeções', () => {
  test.beforeEach(async ({}, testInfo) => {
    if (!systemopsConfig.runLlmSandbox) {
      testInfo.skip();
    }

    if (systemopsConfig.baseUrl && isProductionLikeUrl(systemopsConfig.baseUrl)) {
      throw new Error(`Refusing to run LLM sandbox tests against production-like URL: ${systemopsConfig.baseUrl}`);
    }
  });

  test('SYS-PLAYBOOK-001 - objeção cadastrada influencia a resposta simulada', async ({ request }) => {
    const result = await simulate(request, {
      message: 'Tá caro',
      playbook: {
        objections: [
          {
            objection: 'Tá caro',
            response: 'Temos parcelamento em até 12x e a avaliação gratuita ajuda a entender o plano ideal.'
          }
        ]
      }
    });

    expect(result.text).toMatch(/parcel|12x|avalia/i);
    expect(result.text).not.toMatch(/undefined|NaN|Resposta:\s*$/i);
  });

  test('SYS-PLAYBOOK-002 - sandbox sem objeções simula normalmente sem erro', async ({ request }) => {
    const result = await simulate(request, {
      message: 'Quero agendar um horário',
      playbook: { objections: [] }
    });

    expect(result.text.trim().length).toBeGreaterThan(0);
    expect(result.intent).toMatch(/book_appointment|check_availability|unclear/);
    expect(result.text).not.toMatch(/undefined|NaN/i);
  });

  test('SYS-PLAYBOOK-003 - objeção com resposta vazia não vaza linha "Resposta:"', async ({ request }) => {
    const result = await simulate(request, {
      message: 'Tá caro',
      playbook: {
        objections: [{ objection: 'Tá caro', response: '' }]
      }
    });

    expect(result.text.trim().length).toBeGreaterThan(0);
    expect(result.text).not.toContain('Resposta:');
    expect(result.text).not.toMatch(/undefined|NaN/i);
  });

  test('SYS-PLAYBOOK-004 - saudação customizada no primeiro contato retorna sem depender do menu', async ({ request }) => {
    const greetingMessage = 'Olá! Aqui é a assistente QA. Posso te ajudar com avaliação, agendamento ou pagamento.';
    const result = await simulate(request, {
      message: 'oi',
      playbook: { greetingMessage }
    });

    expect(result.intent).toBe('greeting');
    expect(result.text).toBe(greetingMessage);
  });

  test('SYS-PLAYBOOK-005 - pergunta de preço usa política comercial sem inventar valor fechado', async ({ request }) => {
    const result = await simulate(request, {
      message: 'Quanto custa fazer lentes?',
      playbook: {
        commercialPolicy: 'Avaliação gratuita. Valores dependem do caso e podem ser parcelados em até 12x.'
      }
    });

    expect(result.intent).toBe('price_inquiry');
    expect(result.text).toMatch(/avalia|caso|parcel/i);
    expect(result.text).not.toMatch(/\bR\$\s?\d{3,}|\b\d{4,}\b/);
    expect(result.text).not.toMatch(/undefined|NaN/i);
  });

  test('SYS-PLAYBOOK-006 - lead querendo agendar recebe opções numeradas no sandbox', async ({ request }) => {
    const result = await simulate(request, {
      message: 'Quero agendar uma avaliação amanhã de manhã'
    });

    expect(result.intent).toMatch(/book_appointment|check_availability/);
    expect(result.text).toMatch(/1\..*\n.*2\./s);
    expect(result.text).toMatch(/responda|n[uú]mero|op[cç][aã]o|prefere|qual hor/i);
    expect(result.text).not.toMatch(/undefined|NaN/i);
  });

  test('SYS-PLAYBOOK-007 - confirmação de opção pendente confirma o horário simulado', async ({ request }) => {
    const result = await simulate(request, {
      message: '1',
      history: [
        { role: 'user', text: 'Quero agendar uma avaliação' },
        { role: 'assistant', text: 'Tenho estes horários:\n1. Seg 01/Jun às 09h00\n2. Ter 02/Jun às 10h30\nQual opção prefere?', intent: 'book_appointment' }
      ]
    });

    expect(result.intent).toBe('confirm_slot');
    expect(result.text).toMatch(/confirm|agend|esperando/i);
    expect(result.text).not.toMatch(/undefined|NaN/i);
  });

  test('SYS-PLAYBOOK-008 - urgência clínica aciona tom de handoff imediato', async ({ request }) => {
    const result = await simulate(request, {
      message: 'Estou com muita dor e sangramento'
    });

    expect(result.intent).toBe('clinical_urgency');
    expect(result.text).toMatch(/urg[eê]ncia|equipe|contato|acion/i);
    expect(result.text).not.toMatch(/undefined|NaN/i);
  });

  test('SYS-PLAYBOOK-009 - pedido para falar com humano não tenta resolver sozinho', async ({ request }) => {
    const result = await simulate(request, {
      message: 'Quero falar com o dentista antes de marcar'
    });

    expect(result.intent).toBe('needs_human');
    expect(result.text).toMatch(/equipe|avisad|responder|humano|dentista/i);
    expect(result.text).not.toMatch(/agenda|op[cç][aã]o 1|1\./i);
  });
});

// Playbook com procedimentos detalhados para validar respostas específicas.
// Mock retorna texto genérico — esses três testes exigem LLM real (SYSTEMOPS_RUN_LLM_SANDBOX=true).
const PROCEDURES_PLAYBOOK: Partial<SandboxPlaybook> = {
  procedureDescription:
    'Tratamentos oferecidos: ' +
    'Lentes de contato dental (porcelana ou resina, sem desgaste do dente, 6 a 10 por arcada, resultado imediato). ' +
    'Clareamento dental (em consultório: 2 a 3 sessões de 45 min; caseiro: 14 a 21 dias de uso noturno). ' +
    'Implante dentário (cirurgia de implantação + osseointegração de 3 a 6 meses + coroa protética final).'
};

test.describe('SystemOps Playbook Sandbox - Procedimentos [LLM-only]', () => {
  test.beforeEach(async ({}, testInfo) => {
    if (!systemopsConfig.runLlmSandbox) {
      testInfo.skip();
    }

    if (systemopsConfig.baseUrl && isProductionLikeUrl(systemopsConfig.baseUrl)) {
      throw new Error(`Refusing to run LLM sandbox tests against production-like URL: ${systemopsConfig.baseUrl}`);
    }
  });

  test('SYS-PLAYBOOK-010 - pergunta sobre clareamento usa detalhes do playbook sem inventar', async ({ request }) => {
    const result = await simulate(request, {
      message: 'Como funciona o clareamento dental aí?',
      playbook: PROCEDURES_PLAYBOOK
    });

    expect(result.text).toMatch(/sess[oõ][ea]|consultor[oi]|caseiro|dias|minutos/i);
    expect(result.text).not.toMatch(/undefined|NaN/i);
    // Não deve inventar marcas, produtos ou valores não presentes no playbook
    expect(result.text).not.toMatch(/R\$\s?\d{3,}|\bPeroxide\b|\bZoom\b/i);
  });

  test('SYS-PLAYBOOK-011 - pergunta sobre duração do implante retorna prazo do playbook', async ({ request }) => {
    const result = await simulate(request, {
      message: 'Quanto tempo demora o tratamento de implante?',
      playbook: PROCEDURES_PLAYBOOK
    });

    expect(result.text).toMatch(/m[eê]s|osseointegra|cirurgia|coroa|etapa/i);
    expect(result.text).not.toMatch(/undefined|NaN/i);
  });

  test('SYS-PLAYBOOK-012 - comparação entre lentes e clareamento distingue os dois sem confundir', async ({ request }) => {
    const result = await simulate(request, {
      message: 'Qual a diferença entre lentes de contato e clareamento?',
      playbook: PROCEDURES_PLAYBOOK
    });

    // Deve mencionar os dois procedimentos de forma distinguível
    expect(result.text).toMatch(/lente/i);
    expect(result.text).toMatch(/clareamento/i);
    expect(result.text).not.toMatch(/undefined|NaN/i);
    // Não deve tratar como mesma coisa
    expect(result.text).not.toMatch(/s[aã]o a mesma coisa|mesmo procedimento/i);
  });
});
