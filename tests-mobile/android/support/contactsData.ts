export const contactData = {
  testContact: {
    firstName: 'Omni',
    lastName: `QA ${Date.now()}`,
    phone: '11999990001'
  }
};

export type ContactData = typeof contactData.testContact;
