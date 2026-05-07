import { expect, Page } from '@playwright/test';

export class InventoryPage {
  constructor(private readonly page: Page) {}

  async expectLoaded() {
    await expect(this.page).toHaveURL(/.*inventory.html/);
    await expect(this.page.getByText('Products', { exact: true })).toBeVisible();
  }

  async addProductToCart(productName: string) {
    await this.productCard(productName).getByRole('button', { name: 'Add to cart' }).click();
  }

  async removeProductFromCart(productName: string) {
    await this.productCard(productName).getByRole('button', { name: 'Remove' }).click();
  }

  async openCart() {
    await this.page.locator('.shopping_cart_link').click();
  }

  async expectCartBadge(quantity: string) {
    await expect(this.page.locator('.shopping_cart_badge')).toHaveText(quantity);
  }

  async expectCartEmpty() {
    await expect(this.page.locator('.shopping_cart_badge')).toHaveCount(0);
  }

  private productCard(productName: string) {
    return this.page.locator('.inventory_item').filter({ hasText: productName });
  }
}
