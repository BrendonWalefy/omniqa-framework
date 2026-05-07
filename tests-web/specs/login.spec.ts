import { test } from '@playwright/test';
import { InventoryPage } from '../pages/InventoryPage';
import { LoginPage } from '../pages/LoginPage';
import { users } from '../support/users';

test.describe('SauceDemo - Login', () => {
  test('WEB-001 - deve realizar login com usuario valido', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const inventoryPage = new InventoryPage(page);

    await loginPage.goto();
    await loginPage.login(users.standard);

    await inventoryPage.expectLoaded();
  });

  test('WEB-002 - deve exibir erro para credenciais invalidas', async ({ page }) => {
    const loginPage = new LoginPage(page);

    await loginPage.goto();
    await loginPage.login(users.invalid);

    await loginPage.expectLoginError('Username and password do not match');
  });
});
