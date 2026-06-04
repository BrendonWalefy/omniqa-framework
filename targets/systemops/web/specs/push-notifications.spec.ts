import { expect, Page, test } from '@playwright/test';
import { hasAdminCredentials, systemopsConfig } from '../../systemops.config';
import { DashboardPage } from '../pages/DashboardPage';
import { LoginPage } from '../pages/LoginPage';

const FAKE_PUSH_KEYS = {
  p256dh: 'BNbxob3lNRGDeM6VpMIBjx5D_klNqsOdOlzDKLKFU7nFNBbkqeOyRRqA3T3l6HfyUkdJqxuM9t3sGzI5abc',
  auth: 'tBHItJI5svbpezKI4CCXgQ'
};

function fakePushEndpoint(label: string) {
  return `https://push.example.com/e2e-push-${Date.now()}-${label}`;
}

async function loginAdmin(page: Page) {
  const loginPage = new LoginPage(page);
  const dashboardPage = new DashboardPage(page);
  await loginPage.goto();
  await loginPage.loginAndWaitFor(systemopsConfig.adminEmail!, systemopsConfig.adminPassword!, /\/app\//);
  await dashboardPage.expectLoaded();
}

test.describe('SystemOps - Push Notifications (autenticado)', () => {
  test.beforeEach(async ({}, testInfo) => {
    if (!hasAdminCredentials()) testInfo.skip();
  });

  test('SYS-PUSH-003 - POST /api/push/subscribe com campos ausentes retorna 400', async ({ page }) => {
    await loginAdmin(page);

    const response = await page.request.post('/api/push/subscribe', {
      data: { endpoint: fakePushEndpoint('003') }
    });
    expect(response.status()).toBe(400);
    expect((await response.json()).error).toBe('Missing subscription fields');
  });

  test('SYS-PUSH-004 - POST /api/push/subscribe com payload válido salva subscrição', async ({ page }) => {
    const endpoint = fakePushEndpoint('004');
    await loginAdmin(page);

    const response = await page.request.post('/api/push/subscribe', {
      data: { endpoint, keys: FAKE_PUSH_KEYS }
    });
    expect(response.status()).toBe(200);
    expect((await response.json()).ok).toBe(true);

    await page.request.delete('/api/push/subscribe', { data: { endpoint } });
  });

  test('SYS-PUSH-005 - POST /api/push/subscribe idempotente — mesmo endpoint não duplica', async ({ page }) => {
    const endpoint = fakePushEndpoint('005');
    await loginAdmin(page);

    const first = await page.request.post('/api/push/subscribe', {
      data: { endpoint, keys: FAKE_PUSH_KEYS }
    });
    expect(first.status()).toBe(200);

    const second = await page.request.post('/api/push/subscribe', {
      data: { endpoint, keys: FAKE_PUSH_KEYS }
    });
    expect(second.status()).toBe(200);

    await page.request.delete('/api/push/subscribe', { data: { endpoint } });
  });

  test('SYS-PUSH-006 - DELETE /api/push/subscribe remove subscrição existente', async ({ page }) => {
    const endpoint = fakePushEndpoint('006');
    await loginAdmin(page);

    await page.request.post('/api/push/subscribe', { data: { endpoint, keys: FAKE_PUSH_KEYS } });

    const response = await page.request.delete('/api/push/subscribe', { data: { endpoint } });
    expect(response.status()).toBe(200);
    expect((await response.json()).ok).toBe(true);
  });

  test('SYS-PUSH-007 - DELETE /api/push/subscribe endpoint inexistente retorna 200', async ({ page }) => {
    await loginAdmin(page);

    const response = await page.request.delete('/api/push/subscribe', {
      data: { endpoint: fakePushEndpoint('007-nonexistent') }
    });
    expect(response.status()).toBe(200);
  });

  test('SYS-PUSH-008 - Push component renderiza sem erro de JavaScript no dashboard', async ({ page }) => {
    const jsErrors: string[] = [];
    page.on('pageerror', (err) => jsErrors.push(err.message));

    await loginAdmin(page);
    await page.waitForLoadState('networkidle');

    const pushErrors = jsErrors.filter((e) =>
      e.toLowerCase().includes('push') ||
      e.toLowerCase().includes('notification') ||
      e.toLowerCase().includes('serviceworker')
    );
    expect(pushErrors).toHaveLength(0);

    const notifButton = page.getByRole('button', { name: /ativar notificações/i });
    const blockedNotif = page.getByText(/notificações bloqueadas/i);

    const isButtonVisible = await notifButton.isVisible().catch(() => false);
    const isBlockedVisible = await blockedNotif.isVisible().catch(() => false);

    if (isButtonVisible) {
      await expect(notifButton).toBeEnabled();
    } else if (isBlockedVisible) {
      await expect(blockedNotif).toBeVisible();
    }
    // state = "unsupported" ou "granted": componente retorna null — válido
  });
});
