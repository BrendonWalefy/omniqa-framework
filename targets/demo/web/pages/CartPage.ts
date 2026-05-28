import { expect, Locator, Page } from '@playwright/test';

export class CartPage {
  private readonly checkoutButton: Locator;
  private readonly cartItems: Locator;

  constructor(private readonly page: Page) {
    this.checkoutButton = this.page.locator('#checkout');
    this.cartItems = this.page.locator('#cart_contents_container .inventory_item_name');
  }

  async expectProductVisible(productName: string) {
    await expect(this.cartItems).toContainText(productName);
  }

  async checkout() {
    await this.checkoutButton.click();
  }
}
