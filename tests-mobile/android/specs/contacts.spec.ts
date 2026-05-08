import { describe, it } from 'mocha';
import { contactsScreen } from '../screens/ContactsScreen';
import { contactData } from '../support/contactsData';
import { saveMobileScreenshot } from '../support/mobileEvidence';

describe('Android Contacts', () => {
  it('MOB-001 - deve adicionar contato', async () => {
    await contactsScreen.createContact(contactData.testContact);
    await contactsScreen.expectContactVisible(contactsScreen.fullName(contactData.testContact));
    await saveMobileScreenshot('MOB-001 - contato adicionado com sucesso');
  });

  it('MOB-002 - deve remover contato', async () => {
    await contactsScreen.deleteContact(contactsScreen.fullName(contactData.testContact));
    await contactsScreen.expectContactNotVisible(contactsScreen.fullName(contactData.testContact));
    await saveMobileScreenshot('MOB-002 - contato removido com sucesso');
  });
});
