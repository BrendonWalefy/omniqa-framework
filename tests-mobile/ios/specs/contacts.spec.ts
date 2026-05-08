import { describe, it } from 'mocha';
import { iosContactsScreen } from '../screens/ContactsScreen';
import { iosContactData } from '../support/contactsData';
import { saveIosScreenshot } from '../support/mobileEvidence';

describe('iOS Contacts', () => {
  it('IOS-001 - deve adicionar contato', async () => {
    await iosContactsScreen.createContact(iosContactData.testContact);
    await iosContactsScreen.expectContactVisible(iosContactsScreen.fullName(iosContactData.testContact));
    await saveIosScreenshot('IOS-001 - contato adicionado com sucesso');
  });

  it('IOS-002 - deve remover contato', async () => {
    await iosContactsScreen.deleteContact(iosContactsScreen.fullName(iosContactData.testContact));
    await iosContactsScreen.expectContactNotVisible(iosContactsScreen.fullName(iosContactData.testContact));
    await saveIosScreenshot('IOS-002 - contato removido com sucesso');
  });
});
