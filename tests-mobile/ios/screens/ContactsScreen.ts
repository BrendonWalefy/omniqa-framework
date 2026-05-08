import { $, browser, expect } from '@wdio/globals';
import { IosContactData } from '../support/contactsData';
import { contactCellSelector, contactNameSelector, iosContactsSelectors } from '../support/contactsSelectors';

export class IosContactsScreen {
  async createContact(contact: IosContactData) {
    await this.openContactsApp();
    await this.tapFirstAvailable(iosContactsSelectors.addContact);
    await this.fillContactForm(contact);
    await this.tapFirstAvailable(iosContactsSelectors.doneButton);
  }

  async deleteContact(fullName: string) {
    await this.openContact(fullName);
    await this.tapEditButton();
    await this.scrollToDeleteButton();
    await this.tapFirstAvailable(iosContactsSelectors.deleteButton);
    await this.tapFirstAvailable(iosContactsSelectors.confirmDeleteButton);
  }

  async expectContactVisible(fullName: string) {
    const contact = await $(contactNameSelector(fullName));
    await expect(contact).toBeDisplayed();
  }

  async expectContactNotVisible(fullName: string) {
    await this.searchContact(fullName);
    const contact = await $(contactCellSelector(fullName));
    await expect(contact).not.toBeDisplayed();
  }

  fullName(contact: IosContactData) {
    return `${contact.firstName} ${contact.lastName}`;
  }

  private async openContactsApp() {
    await browser.execute('mobile: terminateApp', {
      bundleId: 'com.apple.MobileAddressBook'
    });
    await browser.execute('mobile: launchApp', {
      bundleId: 'com.apple.MobileAddressBook'
    });
  }

  private async fillContactForm(contact: IosContactData) {
    await this.replaceValue(iosContactsSelectors.firstNameInput, contact.firstName);
    await this.replaceValue(iosContactsSelectors.lastNameInput, contact.lastName);
    await this.tapFirstAvailable(iosContactsSelectors.addPhoneButton);
    await this.replaceValue(iosContactsSelectors.phoneInput, contact.phone);
  }

  private async openContact(fullName: string) {
    await this.searchContact(fullName);
    await browser.execute('mobile: tap', {
      x: 170,
      y: 140
    });
  }

  private async searchContact(fullName: string) {
    await this.openContactsApp();
    const searchInput = await this.findFirstAvailable(iosContactsSelectors.searchInput);
    await searchInput!.click();
    await searchInput!.setValue(fullName);
  }

  private async scrollToDeleteButton() {
    await browser.execute('mobile: scroll', {
      direction: 'down'
    });
  }

  private async tapEditButton() {
    const editButton = await this.findFirstAvailable(iosContactsSelectors.editButton, false);

    if (editButton) {
      await editButton.click();
      return;
    }

    await browser.execute('mobile: tap', {
      x: 360,
      y: 90
    });
  }

  private async replaceValue(selectors: readonly string[], value: string) {
    const input = await this.findFirstAvailable(selectors);
    await input!.click();
    await input!.clearValue();
    await input!.setValue(value);
  }

  private async tapFirstAvailable(selectors: readonly string[]) {
    const element = await this.findFirstAvailable(selectors);
    await element!.click();
  }

  private async findFirstAvailable(selectors: readonly string[], failWhenMissing = true) {
    for (const selector of selectors) {
      const element = await $(selector);

      if (await element.isExisting()) {
        return element;
      }
    }

    if (failWhenMissing) {
      throw new Error('No iOS contacts element found for selectors: ' + selectors.join(', '));
    }

    return undefined;
  }
}

export const iosContactsScreen = new IosContactsScreen();
