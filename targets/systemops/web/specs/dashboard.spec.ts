import { expect, test } from '@playwright/test';
import { adminSkipReason, loginAdmin } from '../support/auth';

test.describe('SystemOps Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    const skipReason = adminSkipReason();
    if (skipReason) test.skip(true, skipReason);

    await loginAdmin(page);
  });

  test('SYS-DASH-001 - dashboard renderiza métricas sem NaN ou undefined', async ({ page }) => {
    const jsErrors: string[] = [];
    page.on('pageerror', (error) => jsErrors.push(error.message));

    await page.goto('/app/dashboard');
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();

    await expect(page.getByText('Total de Leads')).toBeVisible();
    await expect(page.getByText('Agendamentos IA')).toBeVisible();
    await expect(page.getByText('Economia de Tempo')).toBeVisible();
    await expect(page.getByText('Leads Quentes')).toBeVisible();

    const body = page.locator('body');
    await expect(body).not.toContainText(/NaN|undefined/i);
    expect(jsErrors).toHaveLength(0);
  });

  test('SYS-DASH-002 - dashboard sai do estado de carregamento e entrega conteúdo principal', async ({ page }) => {
    await page.goto('/app/dashboard', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
    await expect(page.getByLabel('Indicadores principais')).toBeVisible();
    await expect(page.getByLabel('Carregando indicadores')).toHaveCount(0);
  });
});
