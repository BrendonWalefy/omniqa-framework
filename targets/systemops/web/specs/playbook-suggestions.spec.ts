import { expect, test } from '@playwright/test';
import { adminSkipReason, loginAdmin } from '../support/auth';
import { systemopsConfig } from '../../systemops.config';

// src/app/(clinic)/app/settings/playbook/suggestions — PlaybookAdvisor.ts analisa
// métricas de conversa e sugere ajustes de playbook (objeção faltando, tom errado etc).
test.describe('SystemOps Web - Sugestões de Playbook', () => {
  test.beforeEach(async ({}, testInfo) => {
    if (adminSkipReason()) testInfo.skip();
  });

  test('SYS-PLAYBOOK-ADVISOR-001 - tela carrega métricas resumo sem erro', async ({ page }) => {
    const jsErrors: string[] = [];
    page.on('pageerror', (error) => jsErrors.push(error.message));

    await loginAdmin(page);
    await page.goto('/app/settings/playbook/suggestions');

    await expect(page.getByRole('heading', { name: 'Sugestões de Playbook' })).toBeVisible();
    await expect(page.getByText('Conversas', { exact: true })).toBeVisible();
    await expect(page.getByText('Unclear', { exact: true })).toBeVisible();
    await expect(page.getByText('Abandono pós-slots', { exact: true })).toBeVisible();
    await expect(page.getByText('Conversão', { exact: true })).toBeVisible();

    const body = page.locator('body');
    await expect(body).not.toContainText(/NaN|undefined/i);
    expect(jsErrors).toHaveLength(0);
  });

  // Chama /api/playbook/advisor/analyze (LLM real) — só roda com
  // SYSTEMOPS_RUN_LLM_SANDBOX=true, mesmo gate usado em playbook-sandbox.spec.ts.
  test('SYS-PLAYBOOK-ADVISOR-002 - "Analisar e gerar sugestões" retorna gaps estruturados', async ({ page }) => {
    test.setTimeout(60_000); // chamada real de LLM observada em ~30s
    if (!systemopsConfig.runLlmSandbox) {
      test.skip(true, 'SYSTEMOPS_RUN_LLM_SANDBOX=true necessário — chama LLM real.');
    }

    await loginAdmin(page);
    await page.goto('/app/settings/playbook/suggestions');

    await page.getByRole('button', { name: 'Analisar e gerar sugestões' }).click();

    await expect(page.getByText('Análise', { exact: true })).toBeVisible({ timeout: 45_000 });
    await expect(page.getByText(/% confiança/)).toBeVisible();

    // Ou não há gaps (mensagem explícita) ou há N gaps identificados — os dois são
    // resultados válidos, o teste só garante que a UI resolveu pra um dos dois estados.
    const noGaps = page.getByText('Nenhum gap significativo identificado com as métricas atuais.');
    const gapsCount = page.getByText(/gaps? identificado/);
    await expect(noGaps.or(gapsCount)).toBeVisible({ timeout: 5_000 });
  });
});
