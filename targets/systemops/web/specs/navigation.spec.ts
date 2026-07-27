import { expect, test } from '@playwright/test';
import { adminSkipReason, loginAdmin } from '../support/auth';

test.describe('SystemOps - Auth guards', () => {
  test('SYS-WEB-004 - Sem sessão, /app/dashboard redireciona para /login', async ({ page }) => {
    await page.goto('/app/dashboard');
    await expect(page).toHaveURL(/\/login/);
  });

  test('SYS-WEB-005 - Sem sessão, /owner redireciona para /login', async ({ page }) => {
    await page.goto('/owner');
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe('SystemOps - Navegação autenticada', () => {
  test.beforeEach(async ({ page }) => {
    const skipReason = adminSkipReason();
    if (skipReason) test.skip(true, skipReason);

    await loginAdmin(page);
  });

  test('SYS-NAV-001 - menu lateral começa por Início, depois Inbox, e links principais funcionam', async ({ page }, testInfo) => {
    // Mobile usa nav bottom bar com item set diferente (Início/Inbox/Novo/Agenda, sem
    // Configurações/Profissionais/Recuperação/Pipeline) — TODO: escrever
    // SYS-NAV-MOBILE-001 dedicado em vez de reaproveitar este teste.
    if (testInfo.project.name === 'systemops-web-mobile') {
      testInfo.skip(true, 'Nav mobile tem estrutura/itens diferentes do menu lateral desktop — precisa de teste dedicado.');
    }

    await page.goto('/app/dashboard');

    const links = page.locator('nav.side-nav a.side-nav-item');
    await expect(links.nth(0)).toContainText('Início');
    await expect(links.nth(1)).toContainText('Inbox');

    const destinations = [
      { name: 'Início', url: /\/app\/dashboard/, readyText: 'Receita em Pipeline' },
      { name: 'Inbox', url: /\/app\/inbox/, readyText: /Inbox|Nenhuma conversa ainda/i },
      { name: 'Agenda', url: /\/app\/agenda/, readyText: 'Agenda da clínica' },
      { name: 'Configurações', url: /\/app\/settings\/playbook/, readyText: 'Configurações da IA' },
      { name: 'Profissionais', url: /\/app\/settings\/profissionais/, readyText: 'Profissionais' }
    ];

    for (const destination of destinations) {
      // Não usar exact:true — "Inbox" tem contador anexado (ex.: "Inbox 1").
      await page.locator('nav.side-nav').getByRole('link', { name: destination.name }).first().click();
      await expect(page).toHaveURL(destination.url);
      await expect(page.getByText(destination.readyText).first()).toBeVisible();
    }
  });
});
