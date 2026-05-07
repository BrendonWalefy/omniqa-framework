import { test } from '@playwright/test';
import { CartPage } from '../pages/CartPage';
import { CheckoutPage } from '../pages/CheckoutPage';
import { InventoryPage } from '../pages/InventoryPage';
import { LoginPage } from '../pages/LoginPage';
import { checkoutData } from '../support/checkoutData';
import { users } from '../support/users';

const productName = 'Sauce Labs Backpack';

test.describe('SauceDemo - Carrinho e checkout', () => {
  test.beforeEach(async ({ page }) => {
    const loginPage = new LoginPage(page);
    const inventoryPage = new InventoryPage(page);

    await loginPage.goto();
    await loginPage.login(users.standard);
    await inventoryPage.expectLoaded();
  });

  test('WEB-003 - deve adicionar produto ao carrinho', async ({ page }) => {
    const inventoryPage = new InventoryPage(page);
    const cartPage = new CartPage(page);

    await inventoryPage.addProductToCart(productName);
    await inventoryPage.expectCartBadge('1');
    await inventoryPage.openCart();

    await cartPage.expectProductVisible(productName);
  });

  test('WEB-004 - deve remover produto do carrinho', async ({ page }) => {
    const inventoryPage = new InventoryPage(page);

    await inventoryPage.addProductToCart(productName);
    await inventoryPage.expectCartBadge('1');
    await inventoryPage.removeProductFromCart(productName);

    await inventoryPage.expectCartEmpty();
  });

  test('WEB-005 - deve finalizar checkout com sucesso', async ({ page }) => {
    const inventoryPage = new InventoryPage(page);
    const cartPage = new CartPage(page);
    const checkoutPage = new CheckoutPage(page);

    await inventoryPage.addProductToCart(productName);
    await inventoryPage.openCart();
    await cartPage.checkout();
    await checkoutPage.fillInformation(checkoutData);
    await checkoutPage.finishOrder();

    await checkoutPage.expectOrderCompleted();
  });
});
