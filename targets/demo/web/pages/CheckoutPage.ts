import { expect, Locator, Page } from '@playwright/test';

type CheckoutData = {
  firstName: string;
  lastName: string;
  postalCode: string;
};

export class CheckoutPage {
  private readonly firstNameInput: Locator;
  private readonly lastNameInput: Locator;
  private readonly postalCodeInput: Locator;
  private readonly continueButton: Locator;
  private readonly finishButton: Locator;
  private readonly completeHeader: Locator;

  constructor(private readonly page: Page) {
    this.firstNameInput = this.page.locator('#first-name');
    this.lastNameInput = this.page.locator('#last-name');
    this.postalCodeInput = this.page.locator('#postal-code');
    this.continueButton = this.page.locator('#continue');
    this.finishButton = this.page.locator('#finish');
    this.completeHeader = this.page.locator('#checkout_complete_container .complete-header');
  }

  async fillInformation(data: CheckoutData) {
    await this.firstNameInput.fill(data.firstName);
    await this.lastNameInput.fill(data.lastName);
    await this.postalCodeInput.fill(data.postalCode);
    await this.continueButton.click();
  }

  async finishOrder() {
    await this.finishButton.click();
  }

  async expectOrderCompleted() {
    await expect(this.completeHeader).toHaveText('Thank you for your order!');
  }
}
