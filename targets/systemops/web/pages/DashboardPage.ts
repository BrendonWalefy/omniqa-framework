import { expect, Locator, Page } from '@playwright/test';

export class DashboardPage {
  private readonly heading: Locator;

  constructor(private readonly page: Page) {
    this.heading = page.locator('h1', { hasText: 'Dashboard' });
  }

  async goto() {
    await this.page.goto('/app/dashboard');
  }

  async expectLoaded() {
    await expect(this.page).toHaveURL(/\/app\/dashboard/);
    await expect(this.heading).toBeVisible();
  }
}
