import { test } from '@playwright/test';
import { InventoryPage } from '../pages/InventoryPage';
import { LoginPage } from '../pages/LoginPage';
import { evidenceStep } from '../support/evidence';
import { users } from '../support/users';

test.describe('SauceDemo - Login', () => {
  test('WEB-001 - deve realizar login com usuario valido', async ({ page }, testInfo) => {
    const loginPage = new LoginPage(page);
    const inventoryPage = new InventoryPage(page);

    await evidenceStep(page, testInfo, 'WEB-001 - acessar tela de login', async () => {
      await loginPage.goto();
    });

    await evidenceStep(page, testInfo, 'WEB-001 - realizar login com usuario valido', async () => {
      await loginPage.login(users.standard);
    });

    await evidenceStep(page, testInfo, 'WEB-001 - validar inventario carregado', async () => {
      await inventoryPage.expectLoaded();
    });
  });

  test('WEB-002 - deve exibir erro para credenciais invalidas', async ({ page }, testInfo) => {
    const loginPage = new LoginPage(page);

    await evidenceStep(page, testInfo, 'WEB-002 - acessar tela de login', async () => {
      await loginPage.goto();
    });

    await evidenceStep(page, testInfo, 'WEB-002 - tentar login com credenciais invalidas', async () => {
      await loginPage.login(users.invalid);
    });

    await evidenceStep(page, testInfo, 'WEB-002 - validar erro de login exibido', async () => {
      await loginPage.expectLoginError('Username and password do not match');
    });
  });
});
