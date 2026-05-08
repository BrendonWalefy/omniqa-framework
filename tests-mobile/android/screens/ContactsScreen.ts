import { $, browser, expect } from '@wdio/globals';
import { ContactData } from '../support/contactsData';
import { contactsSelectors, contactNameSelector, contactResultSelector } from '../support/contactsSelectors';

export class ContactsScreen {
  async createContact(contact: ContactData) {
    await this.openContactsApp();
    await this.dismissInitialPrompts();
    await this.tapFirstAvailable(contactsSelectors.addContact);
    await this.dismissInitialPrompts();
    await this.fillContactForm(contact);
    await this.tapFirstAvailable(contactsSelectors.saveButton);
  }

  async deleteContact(fullName: string) {
    await this.openContact(fullName);
    await this.tapFirstAvailable(contactsSelectors.moreOptions);
    await this.tapFirstAvailable(contactsSelectors.deleteButton);
    await this.tapFirstAvailable(contactsSelectors.confirmDeleteButton);
  }

  async expectContactVisible(fullName: string) {
    const contact = await $(contactNameSelector(fullName));
    await expect(contact).toBeDisplayed();
  }

  async expectContactNotVisible(fullName: string) {
    await this.searchContact(fullName);
    const contact = await $(contactResultSelector(fullName));
    await expect(contact).not.toBeDisplayed();
  }

  fullName(contact: ContactData) {
    return `${contact.firstName} ${contact.lastName}`;
  }

  private async openContactsApp() {
    await browser.execute('mobile: shell', {
      command: 'am',
      args: ['force-stop', 'com.android.contacts']
    });
    await browser.execute('mobile: shell', {
      command: 'am',
      args: ['start', '-n', 'com.android.contacts/.activities.PeopleActivity']
    });
  }

  private async fillContactForm(contact: ContactData) {
    await this.replaceValue(contactsSelectors.firstNameInput, contact.firstName);
    await this.replaceValue(contactsSelectors.lastNameInput, contact.lastName);
    await this.replaceValue(contactsSelectors.phoneInput, contact.phone);
  }

  private async dismissInitialPrompts() {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const prompt = await this.findFirstAvailable(contactsSelectors.initialPrompts, false);

      if (!prompt) {
        return;
      }

      await prompt.click();
    }
  }

  private async openContact(fullName: string) {
    await this.searchContact(fullName);
    const contact = await $(contactResultSelector(fullName));
    await contact.click();
  }

  private async searchContact(fullName: string) {
    await browser.back();
    const searchButton = await this.findFirstAvailable(contactsSelectors.searchButton, false);

    if (searchButton) {
      await searchButton.click();
      const searchInput = await this.findFirstAvailable(contactsSelectors.searchInput);
      await searchInput!.setValue(fullName);
      return;
    }

    const contactList = await this.findFirstAvailable(contactsSelectors.contactList, false);
    if (!contactList) {
      throw new Error('No Android contacts search or contact list element found.');
    }
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
      throw new Error('No Android contacts element found for selectors: ' + selectors.join(', '));
    }

    return undefined;
  }
}

export const contactsScreen = new ContactsScreen();
