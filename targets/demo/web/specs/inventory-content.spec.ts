import { test } from '@playwright/test';
import { InventoryPage } from '../pages/InventoryPage';
import { LoginPage } from '../pages/LoginPage';
import { evidenceStep } from '../../../../core/helpers/webEvidence';
import { users } from '../support/users';

const bypassKnownCopyBugs = process.env.BYPASS_SAUCE_COPY_BUGS === 'true';

test.describe('SauceDemo - Validação visual de descrições do inventario', () => {
  test.skip(
    bypassKnownCopyBugs,
    'Bypass habilitado por BYPASS_SAUCE_COPY_BUGS=true para demonstrar esteira verde sem as validações visuais/de copy.'
  );

  test.beforeEach(async ({ page }, testInfo) => {
    const loginPage = new LoginPage(page);
    const inventoryPage = new InventoryPage(page);

    await evidenceStep(page, testInfo, 'Setup - acessar tela de login', async () => {
      await loginPage.goto();
    });

    await evidenceStep(page, testInfo, 'Setup - autenticar usuario padrao', async () => {
      await loginPage.login(users.standard);
    });

    await evidenceStep(page, testInfo, 'Setup - validar inventario carregado', async () => {
      await inventoryPage.expectLoaded();
    });
  });

  test('WEB-006 - deve validar descricao sem erro tecnico no inventario', async ({ page }, testInfo) => {
    const inventoryPage = new InventoryPage(page);

    await evidenceStep(page, testInfo, 'WEB-006 - verificar descricao sem carry.allTheThings', async () => {
      await inventoryPage.expectTechnicalTextNotPresent('carry.allTheThings()');
    });
  });

  test('WEB-007 - deve validar titulo sem erro tecnico no inventario', async ({ page }, testInfo) => {
    const inventoryPage = new InventoryPage(page);

    await evidenceStep(page, testInfo, 'WEB-007 - verificar titulo sem Test.allTheThings', async () => {
      await inventoryPage.expectTechnicalTextNotPresent('Test.allTheThings()');
    });
  });
});
