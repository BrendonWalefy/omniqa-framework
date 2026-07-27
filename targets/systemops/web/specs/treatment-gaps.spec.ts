import { expect, test } from '@playwright/test';
import { adminSkipReason, destructiveWebSkipReason, loginAdmin } from '../support/auth';

// Contrato de src/app/api/clinic/treatment-gaps/route.ts — tratamentos mencionados por
// leads mas não cadastrados no catálogo, alimenta o TreatmentGapBanner no inbox.
test.describe('SystemOps API - Treatment gaps (autenticado)', () => {
  test.beforeEach(async ({}, testInfo) => {
    if (adminSkipReason()) testInfo.skip();
  });

  test('SYS-GAPS-001 - GET /api/clinic/treatment-gaps sem sessão retorna 401', async ({ request }) => {
    const response = await request.get('/api/clinic/treatment-gaps');
    expect(response.status()).toBe(401);
  });

  test('SYS-GAPS-002 - GET /api/clinic/treatment-gaps autenticado retorna contrato esperado', async ({ page }) => {
    await loginAdmin(page);

    const response = await page.request.get('/api/clinic/treatment-gaps');
    expect(response.status()).toBe(200);

    const body = await response.json() as { gaps: unknown[] };
    expect(Array.isArray(body.gaps)).toBe(true);
    expect(body.gaps.length).toBeLessThanOrEqual(5);

    for (const gap of body.gaps as Record<string, unknown>[]) {
      expect(typeof gap.mentionedText).toBe('string');
      expect(typeof gap.count).toBe('number');
    }
  });

  test('SYS-GAPS-003 - PATCH sem mentionedText retorna 400', async ({ page }) => {
    await loginAdmin(page);

    const response = await page.request.patch('/api/clinic/treatment-gaps', {
      data: {}
    });
    expect(response.status()).toBe(400);
  });

  test('SYS-GAPS-004 - PATCH com mentionedText inexistente é idempotente', async ({ page }) => {
    const skipReason = destructiveWebSkipReason();
    if (skipReason) test.skip(true, skipReason);
    await loginAdmin(page);

    const response = await page.request.patch('/api/clinic/treatment-gaps', {
      data: { mentionedText: `e2e-gap-inexistente-${Date.now()}` }
    });
    expect(response.status()).toBe(200);
    expect((await response.json()).ok).toBe(true);
  });
});
