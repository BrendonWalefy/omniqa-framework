import { expect, test } from '@playwright/test';

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
