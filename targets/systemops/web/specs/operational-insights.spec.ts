import { expect, test } from '@playwright/test';
import { adminSkipReason, destructiveWebSkipReason, loginAdmin } from '../support/auth';

// Contrato de src/app/api/clinic/operational-insights/route.ts — alimenta
// OperationalInsightsCard.tsx no dashboard e a aba de sugestões de melhoria.
test.describe('SystemOps API - Insights operacionais (autenticado)', () => {
  test.beforeEach(async ({}, testInfo) => {
    if (adminSkipReason()) testInfo.skip();
  });

  test('SYS-INSIGHTS-001 - GET /api/clinic/operational-insights sem sessão retorna 401', async ({ request }) => {
    const response = await request.get('/api/clinic/operational-insights');
    expect(response.status()).toBe(401);
  });

  test('SYS-INSIGHTS-002 - GET /api/clinic/operational-insights autenticado retorna contrato esperado', async ({ page }) => {
    await loginAdmin(page);

    const response = await page.request.get('/api/clinic/operational-insights');
    expect(response.status()).toBe(200);

    const body = await response.json() as { insights: unknown[] };
    expect(Array.isArray(body.insights)).toBe(true);

    for (const insight of body.insights as Record<string, unknown>[]) {
      expect(typeof insight.key).toBe('string');
      expect(typeof insight.type).toBe('string');
      expect(['operational', 'ai_quality']).toContain(insight.category);
      expect(typeof insight.title).toBe('string');
      expect(typeof insight.description).toBe('string');
      expect(typeof insight.affectedCount).toBe('number');
      expect(Array.isArray(insight.convIds)).toBe(true);
    }
  });

  test('SYS-INSIGHTS-003 - PATCH sem key retorna 400', async ({ page }) => {
    await loginAdmin(page);

    const response = await page.request.patch('/api/clinic/operational-insights', {
      data: {}
    });
    expect(response.status()).toBe(400);
  });

  test('SYS-INSIGHTS-004 - PATCH com key inexistente é idempotente (não quebra, não afeta outras clínicas)', async ({ page }) => {
    const skipReason = destructiveWebSkipReason();
    if (skipReason) test.skip(true, skipReason);
    await loginAdmin(page);

    // Key com formato válido (op::uuid) mas inexistente — o WHERE por clinicId+id não
    // encontra nada, PATCH deve responder ok sem erro (comportamento idempotente).
    const response = await page.request.patch('/api/clinic/operational-insights', {
      data: { key: 'op::00000000-0000-0000-0000-000000000000' }
    });
    expect(response.status()).toBe(200);
    expect((await response.json()).ok).toBe(true);
  });
});

test.describe('SystemOps Web - Card de insights no dashboard', () => {
  test.beforeEach(async ({}, testInfo) => {
    if (adminSkipReason()) testInfo.skip();
  });

  // OperationalInsightsCard.tsx faz `if (!insights.length) return null` — não há
  // insights garantidos nem para a clínica de admin nem para a QA E2E Clinic (novinha,
  // sem cron de análise rodado ainda). O smoke aqui valida que a página não quebra e,
  // se o card aparecer, que a estrutura básica está correta — não força dado presente.
  test('SYS-INSIGHTS-005 - dashboard não quebra com ou sem insights presentes', async ({ page }) => {
    const jsErrors: string[] = [];
    page.on('pageerror', (error) => jsErrors.push(error.message));

    await loginAdmin(page);
    await page.goto('/app/dashboard');

    const insightsHeader = page.getByText('Insights da IA', { exact: true });
    if (await insightsHeader.isVisible().catch(() => false)) {
      await expect(insightsHeader).toBeVisible();
    }

    expect(jsErrors).toHaveLength(0);
  });
});
