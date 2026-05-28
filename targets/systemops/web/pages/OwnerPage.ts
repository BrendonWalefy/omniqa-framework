import { expect, Locator, Page } from '@playwright/test';

export class OwnerPage {
  private readonly ownerPanel: Locator;

  constructor(private readonly page: Page) {
    this.ownerPanel = page.locator('p.eyebrow', { hasText: 'Owner Panel' });
  }

  async goto() {
    await this.page.goto('/owner');
  }

  async expectLoaded() {
    await expect(this.page).toHaveURL(/\/owner/);
    await expect(this.ownerPanel).toBeVisible();
  }
}
