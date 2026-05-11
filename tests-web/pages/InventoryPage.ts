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

  async expectTechnicalTextNotPresent(text: string) {
    const technicalText = this.inventoryContainer.getByText(text);

    if (await technicalText.count() > 0) {
      await technicalText.first().scrollIntoViewIfNeeded();
      await technicalText.evaluateAll(elements => {
        for (const element of elements) {
          const highlightedElement = element as HTMLElement;
          highlightedElement.style.outline = '4px solid #dc2626';
          highlightedElement.style.backgroundColor = '#fee2e2';
          highlightedElement.style.color = '#7f1d1d';
          highlightedElement.style.boxShadow = '0 0 0 4px rgba(220, 38, 38, 0.22)';
          highlightedElement.setAttribute('data-omniqa-highlight', 'technical-copy-error');
        }
      });
    }

    await expect(technicalText).toHaveCount(0);
  }

  private productActionButton(action: 'add-to-cart' | 'remove', productName: string) {
    return this.page.locator(`#${action}-${this.productId(productName)}`);
  }

  private productId(productName: string) {
    return productName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }
}
