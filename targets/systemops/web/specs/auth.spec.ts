import { test } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { DashboardPage } from '../pages/DashboardPage';
import { OwnerPage } from '../pages/OwnerPage';
import { hasAdminCredentials, hasOwnerCredentials, systemopsConfig } from '../../systemops.config';

test.describe('SystemOps - Autenticação', () => {
  test('SYS-WEB-001 - Login admin válido', async ({ page }) => {
    if (!hasAdminCredentials()) {
      test.skip(true, 'SYSTEMOPS_ADMIN_EMAIL / SYSTEMOPS_ADMIN_PASSWORD não configuradas — teste ignorado.');
    }

    const loginPage = new LoginPage(page);
    const dashboardPage = new DashboardPage(page);

    await loginPage.goto();
    await loginPage.loginAndWaitFor(systemopsConfig.adminEmail!, systemopsConfig.adminPassword!, /\/app\//);
    await dashboardPage.expectLoaded();
  });

  test('SYS-WEB-002 - Login owner válido', async ({ page }) => {
    if (!hasOwnerCredentials()) {
      test.skip(true, 'SYSTEMOPS_OWNER_EMAIL / SYSTEMOPS_OWNER_PASSWORD não configuradas — teste ignorado.');
    }

    const loginPage = new LoginPage(page);
    const ownerPage = new OwnerPage(page);

    await loginPage.goto();
    await loginPage.loginAndWaitFor(systemopsConfig.ownerEmail!, systemopsConfig.ownerPassword!, /\/owner/);
    await ownerPage.expectLoaded();
  });

  test('SYS-WEB-003 - Login inválido exibe erro', async ({ page }) => {
    const loginPage = new LoginPage(page);

    await loginPage.goto();
    await loginPage.login('usuario@invalido.com', 'senha-errada-123');
    await loginPage.expectErrorVisible();
    await loginPage.expectStillOnLogin();
  });
});
