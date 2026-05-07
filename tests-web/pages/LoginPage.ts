import { expect, Page } from '@playwright/test';

type Credentials = {
  username: string;
  password: string;
};

export class LoginPage {
  constructor(private readonly page: Page) {}

  async goto() {
    await this.page.goto('/');
  }

  async login(credentials: Credentials) {
    await this.page.getByPlaceholder('Username').fill(credentials.username);
    await this.page.getByPlaceholder('Password').fill(credentials.password);
    await this.page.getByRole('button', { name: 'Login' }).click();
  }

  async expectLoginError(message: string) {
    await expect(this.page.locator('.error-message-container')).toContainText(message);
  }
}
