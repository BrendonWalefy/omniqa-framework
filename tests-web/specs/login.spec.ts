import { test } from '@playwright/test';
import { InventoryPage } from '../pages/InventoryPage';
import { LoginPage } from '../pages/LoginPage';
import { attachSuccessEvidence } from '../support/evidence';
import { users } from '../support/users';

test.describe('SauceDemo - Login', () => {
  test('WEB-001 - deve realizar login com usuario valido', async ({ page }, testInfo) => {
    const loginPage = new LoginPage(page);
    const inventoryPage = new InventoryPage(page);

    await loginPage.goto();
    await loginPage.login(users.standard);

    await inventoryPage.expectLoaded();
    await attachSuccessEvidence(page, testInfo, 'WEB-001 - inventario carregado');
  });

  test('WEB-002 - deve exibir erro para credenciais invalidas', async ({ page }, testInfo) => {
    const loginPage = new LoginPage(page);

    await loginPage.goto();
    await loginPage.login(users.invalid);

    await loginPage.expectLoginError('Username and password do not match');
    await attachSuccessEvidence(page, testInfo, 'WEB-002 - erro de login exibido');
  });
});
