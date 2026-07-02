import { expect, test } from '@playwright/test';
import { adminSkipReason, loginAdmin } from '../support/auth';

test.describe('SystemOps Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    const skipReason = adminSkipReason();
    if (skipReason) test.skip(true, skipReason);

    await loginAdmin(page);
  });

  // Mobile (MobileDashboardTabs.tsx) usa uma UI diferente: saudação em <strong> (não
  // h1) e os indicadores ficam atrás de abas Hoje/Leads/Performance, não visíveis
  // direto na página. TODO: escrever SYS-DASH-MOBILE-001 dedicado navegando as abas.
  test('SYS-DASH-001 - dashboard renderiza métricas sem NaN ou undefined', async ({ page }, testInfo) => {
    if (testInfo.project.name === 'systemops-web-mobile') {
      testInfo.skip(true, 'Indicadores ficam atrás de abas na UI mobile — precisa de teste dedicado.');
    }

    const jsErrors: string[] = [];
    page.on('pageerror', (error) => jsErrors.push(error.message));

    await page.goto('/app/dashboard');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    await expect(page.getByText('Receita em Pipeline')).toBeVisible();
    await expect(page.getByText('ROI', { exact: true })).toBeVisible();
    await expect(page.getByText('Leads Ativos', { exact: true })).toBeVisible();
    await expect(page.getByText('Agendados no período')).toBeVisible();

    const body = page.locator('body');
    await expect(body).not.toContainText(/NaN|undefined/i);
    expect(jsErrors).toHaveLength(0);
  });

  test('SYS-DASH-002 - dashboard sai do estado de carregamento e entrega conteúdo principal', async ({ page }, testInfo) => {
    if (testInfo.project.name === 'systemops-web-mobile') {
      testInfo.skip(true, 'Indicadores ficam atrás de abas na UI mobile — precisa de teste dedicado.');
    }

    await page.goto('/app/dashboard', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByLabel('Indicadores principais')).toBeVisible();
    await expect(page.getByLabel('Carregando indicadores')).toHaveCount(0);
  });
});
