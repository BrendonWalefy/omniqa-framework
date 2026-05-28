import { expect, Locator, Page } from '@playwright/test';

export class InboxPage {
  private readonly heading: Locator;

  constructor(private readonly page: Page) {
    this.heading = page.locator('h1', { hasText: 'Inbox' });
  }

  async goto() {
    await this.page.goto('/app/inbox');
  }

  async expectLoaded() {
    await expect(this.page).toHaveURL(/\/app\/inbox/);
    await expect(this.heading).toBeVisible();
  }
}
