import { describe, it } from 'mocha';
import { iosContactsScreen } from '../screens/ContactsScreen';
import { iosContactData } from '../support/contactsData';
import { iosEvidenceStep } from '../support/mobileEvidence';

describe('iOS Contacts', () => {
  it('IOS-001 - deve adicionar contato', async () => {
    await iosEvidenceStep('IOS-001 - criar contato', async () => {
      await iosContactsScreen.createContact(iosContactData.testContact);
    });

    await iosEvidenceStep('IOS-001 - validar contato visivel', async () => {
      await iosContactsScreen.expectContactVisible(iosContactsScreen.fullName(iosContactData.testContact));
    });
  });

  it('IOS-002 - deve remover contato', async () => {
    await iosEvidenceStep('IOS-002 - remover contato', async () => {
      await iosContactsScreen.deleteContact(iosContactsScreen.fullName(iosContactData.testContact));
    });

    await iosEvidenceStep('IOS-002 - validar contato removido', async () => {
      await iosContactsScreen.expectContactNotVisible(iosContactsScreen.fullName(iosContactData.testContact));
    });
  });
});
