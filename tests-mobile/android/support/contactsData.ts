export const contactData = {
  testContact: {
    firstName: 'Brendon',
    lastName: `QA ${Date.now()}`,
    phone: '11999990001'
  }
};

export type ContactData = typeof contactData.testContact;
