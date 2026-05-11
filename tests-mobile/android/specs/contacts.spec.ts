import { describe, it } from 'mocha';
import { contactsScreen } from '../screens/ContactsScreen';
import { contactData } from '../support/contactsData';
import { mobileEvidenceStep } from '../support/mobileEvidence';

describe('Android Contacts', () => {
  it('MOB-001 - deve adicionar contato', async () => {
    await mobileEvidenceStep('MOB-001 - criar contato', async () => {
      await contactsScreen.createContact(contactData.testContact);
    });

    await mobileEvidenceStep('MOB-001 - validar contato visivel', async () => {
      await contactsScreen.expectContactVisible(contactsScreen.fullName(contactData.testContact));
    });
  });

  it('MOB-002 - deve remover contato', async () => {
    await mobileEvidenceStep('MOB-002 - remover contato', async () => {
      await contactsScreen.deleteContact(contactsScreen.fullName(contactData.testContact));
    });

    await mobileEvidenceStep('MOB-002 - validar contato removido', async () => {
      await contactsScreen.expectContactNotVisible(contactsScreen.fullName(contactData.testContact));
    });
  });
});
