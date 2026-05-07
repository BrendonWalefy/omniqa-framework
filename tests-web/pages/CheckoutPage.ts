import { expect, Page } from '@playwright/test';

type CheckoutData = {
  firstName: string;
  lastName: string;
  postalCode: string;
};

export class CheckoutPage {
  constructor(private readonly page: Page) {}

  async fillInformation(data: CheckoutData) {
    await this.page.getByPlaceholder('First Name').fill(data.firstName);
    await this.page.getByPlaceholder('Last Name').fill(data.lastName);
    await this.page.getByPlaceholder('Zip/Postal Code').fill(data.postalCode);
    await this.page.getByRole('button', { name: 'Continue' }).click();
  }

  async finishOrder() {
    await this.page.getByRole('button', { name: 'Finish' }).click();
  }

  async expectOrderCompleted() {
    await expect(this.page.locator('.complete-header')).toHaveText('Thank you for your order!');
  }
}
