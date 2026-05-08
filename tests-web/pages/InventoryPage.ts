import { expect, Locator, Page } from '@playwright/test';

export class InventoryPage {
  private readonly inventoryContainer: Locator;
  private readonly productsTitle: Locator;
  private readonly cartLink: Locator;
  private readonly cartBadge: Locator;

  constructor(private readonly page: Page) {
    this.inventoryContainer = this.page.locator('#inventory_container.inventory_container');
    this.productsTitle = this.page.locator('.title');
    this.cartLink = this.page.locator('#shopping_cart_container a');
    this.cartBadge = this.page.locator('#shopping_cart_container .shopping_cart_badge');
  }

  async expectLoaded() {
    await expect(this.page).toHaveURL(/.*inventory.html/);
    await expect(this.inventoryContainer).toBeVisible();
    await expect(this.productsTitle).toHaveText('Products');
  }

  async addProductToCart(productName: string) {
    await this.productActionButton('add-to-cart', productName).click();
  }

  async removeProductFromCart(productName: string) {
    await this.productActionButton('remove', productName).click();
  }

  async openCart() {
    await this.cartLink.click();
  }

  async expectCartBadge(quantity: string) {
    await expect(this.cartBadge).toHaveText(quantity);
  }

  async expectCartEmpty() {
    await expect(this.cartBadge).toHaveCount(0);
  }

  private productActionButton(action: 'add-to-cart' | 'remove', productName: string) {
    return this.page.locator(`#${action}-${this.productId(productName)}`);
  }

  private productId(productName: string) {
    return productName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }
}
