import { test } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { DashboardPage } from '../pages/DashboardPage';
import { InboxPage } from '../pages/InboxPage';
import { hasAdminCredentials, systemopsConfig } from '../../systemops.config';

test.describe('SystemOps - Smoke read-only', () => {
  test.beforeEach(async ({}, testInfo) => {
    if (!hasAdminCredentials()) {
      testInfo.skip();
    }
  });

  test('SYS-WEB-006 - Dashboard renderiza sem erro após login admin', async ({ page }) => {
    if (!hasAdminCredentials()) {
      test.skip(true, 'SYSTEMOPS_ADMIN_EMAIL / SYSTEMOPS_ADMIN_PASSWORD não configuradas — teste ignorado.');
    }

    const loginPage = new LoginPage(page);
    const dashboardPage = new DashboardPage(page);

    await loginPage.goto();
    await loginPage.login(systemopsConfig.adminEmail!, systemopsConfig.adminPassword!);
    await dashboardPage.expectLoaded();
  });

  test('SYS-WEB-007 - Inbox renderiza após login admin (lista ou empty state)', async ({ page }) => {
    if (!hasAdminCredentials()) {
      test.skip(true, 'SYSTEMOPS_ADMIN_EMAIL / SYSTEMOPS_ADMIN_PASSWORD não configuradas — teste ignorado.');
    }

    const loginPage = new LoginPage(page);
    const inboxPage = new InboxPage(page);

    await loginPage.goto();
    await loginPage.login(systemopsConfig.adminEmail!, systemopsConfig.adminPassword!);
    await inboxPage.goto();
    await inboxPage.expectLoaded();
  });
});
