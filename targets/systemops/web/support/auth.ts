import { expect, Page } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { DashboardPage } from '../pages/DashboardPage';
import { hasAdminCredentials, isProductionLikeUrl, systemopsConfig } from '../../systemops.config';

export function adminSkipReason(): string | null {
  if (!hasAdminCredentials()) {
    return 'SYSTEMOPS_ADMIN_EMAIL / SYSTEMOPS_ADMIN_PASSWORD não configuradas — teste ignorado.';
  }

  return null;
}

export function destructiveWebSkipReason(): string | null {
  const adminReason = adminSkipReason();
  if (adminReason) return adminReason;

  if (!systemopsConfig.runDestructive) {
    return 'SYSTEMOPS_RUN_DESTRUCTIVE=true é necessário para testes que alteram dados.';
  }

  return null;
}

export function ensureNotProductionLike() {
  if (systemopsConfig.baseUrl && isProductionLikeUrl(systemopsConfig.baseUrl)) {
    throw new Error(`Refusing to run destructive web tests against production-like URL: ${systemopsConfig.baseUrl}`);
  }
}

export async function loginAdmin(page: Page) {
  const loginPage = new LoginPage(page);
  const dashboardPage = new DashboardPage(page);

  await loginPage.goto();
  await loginPage.login(systemopsConfig.adminEmail!, systemopsConfig.adminPassword!);
  await dashboardPage.expectLoaded();
  await expect(page.locator('body')).not.toContainText(/E-mail ou senha incorretos/i);
}
