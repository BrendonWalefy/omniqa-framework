import { test } from '@playwright/test';
import { CartPage } from '../pages/CartPage';
import { CheckoutPage } from '../pages/CheckoutPage';
import { InventoryPage } from '../pages/InventoryPage';
import { LoginPage } from '../pages/LoginPage';
import { checkoutData } from '../support/checkoutData';
import { evidenceStep } from '../../../../core/helpers/webEvidence';
import { users } from '../support/users';

const productName = 'Sauce Labs Backpack';

test.describe('SauceDemo - Carrinho e checkout', () => {
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

  test('WEB-003 - deve adicionar produto ao carrinho', async ({ page }, testInfo) => {
    const inventoryPage = new InventoryPage(page);
    const cartPage = new CartPage(page);

    await evidenceStep(page, testInfo, 'WEB-003 - adicionar produto ao carrinho', async () => {
      await inventoryPage.addProductToCart(productName);
    });

    await evidenceStep(page, testInfo, 'WEB-003 - validar contador do carrinho', async () => {
      await inventoryPage.expectCartBadge('1');
    });

    await evidenceStep(page, testInfo, 'WEB-003 - abrir carrinho', async () => {
      await inventoryPage.openCart();
    });

    await evidenceStep(page, testInfo, 'WEB-003 - validar produto no carrinho', async () => {
      await cartPage.expectProductVisible(productName);
    });
  });

  test('WEB-004 - deve remover produto do carrinho', async ({ page }, testInfo) => {
    const inventoryPage = new InventoryPage(page);

    await evidenceStep(page, testInfo, 'WEB-004 - adicionar produto ao carrinho', async () => {
      await inventoryPage.addProductToCart(productName);
    });

    await evidenceStep(page, testInfo, 'WEB-004 - validar contador do carrinho', async () => {
      await inventoryPage.expectCartBadge('1');
    });

    await evidenceStep(page, testInfo, 'WEB-004 - remover produto do carrinho', async () => {
      await inventoryPage.removeProductFromCart(productName);
    });

    await evidenceStep(page, testInfo, 'WEB-004 - validar carrinho vazio', async () => {
      await inventoryPage.expectCartEmpty();
    });
  });

  test('WEB-005 - deve finalizar checkout com sucesso', async ({ page }, testInfo) => {
    const inventoryPage = new InventoryPage(page);
    const cartPage = new CartPage(page);
    const checkoutPage = new CheckoutPage(page);

    await evidenceStep(page, testInfo, 'WEB-005 - adicionar produto ao carrinho', async () => {
      await inventoryPage.addProductToCart(productName);
    });

    await evidenceStep(page, testInfo, 'WEB-005 - abrir carrinho', async () => {
      await inventoryPage.openCart();
    });

    await evidenceStep(page, testInfo, 'WEB-005 - iniciar checkout', async () => {
      await cartPage.checkout();
    });

    await evidenceStep(page, testInfo, 'WEB-005 - preencher dados do checkout', async () => {
      await checkoutPage.fillInformation(checkoutData);
    });

    await evidenceStep(page, testInfo, 'WEB-005 - finalizar pedido', async () => {
      await checkoutPage.finishOrder();
    });

    await evidenceStep(page, testInfo, 'WEB-005 - validar pedido finalizado', async () => {
      await checkoutPage.expectOrderCompleted();
    });
  });
});
