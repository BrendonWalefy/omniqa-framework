export const iosContactData = {
  testContact: {
    firstName: 'Brendon',
    lastName: `QA iOS ${Date.now()}`,
    phone: '11999990002'
  }
};

export type IosContactData = typeof iosContactData.testContact;
