export const iosContactsSelectors = {
  addContact: [
    '~Add',
    '~Adicionar',
    '~+',
    iosName('Add'),
    iosName('Adicionar'),
    iosName('+'),
    iosLabel('Add'),
    iosLabel('Adicionar'),
    iosLabel('+')
  ],
  firstNameInput: [
    '~First name',
    '~Nome',
    iosName('First name'),
    iosName('Nome'),
    iosValue('First name'),
    iosValue('Nome')
  ],
  lastNameInput: [
    '~Last name',
    '~Sobrenome',
    iosName('Last name'),
    iosName('Sobrenome'),
    iosValue('Last name'),
    iosValue('Sobrenome')
  ],
  addPhoneButton: [
    '~add phone',
    '~adicionar telefone',
    iosName('add phone'),
    iosName('adicionar telefone'),
    iosLabel('add phone'),
    iosLabel('adicionar telefone')
  ],
  phoneInput: [
    '~Phone',
    '~Telefone',
    iosName('Phone'),
    iosName('Telefone'),
    iosValue('Phone'),
    iosValue('Telefone'),
    '-ios class chain:**/XCUIElementTypeTextField[`value == "Phone"`]'
  ],
  doneButton: [
    '~Done',
    '~OK',
    '~Concluido',
    '~Concluído',
    iosName('Done'),
    iosName('OK'),
    iosName('Concluido'),
    iosName('Concluído'),
    iosLabel('Done'),
    iosLabel('OK'),
    iosLabel('Concluido'),
    iosLabel('Concluído')
  ],
  searchInput: [
    '~Search',
    '~Buscar',
    iosName('Search'),
    iosName('Buscar'),
    iosValue('Search'),
    iosValue('Buscar')
  ],
  editButton: [
    '~Edit',
    '~Editar',
    iosName('Edit'),
    iosName('Editar'),
    iosNameContains('Edit'),
    iosNameContains('Editar'),
    iosLabel('Edit'),
    iosLabel('Editar'),
    iosLabelContains('Edit'),
    iosLabelContains('Editar')
  ],
  deleteButton: [
    '~Delete Contact',
    '~Apagar Contato',
    '~Apagar contato',
    iosName('Delete Contact'),
    iosName('Apagar Contato'),
    iosName('Apagar contato'),
    iosLabel('Delete Contact'),
    iosLabel('Apagar Contato'),
    iosLabel('Apagar contato')
  ],
  confirmDeleteButton: [
    '~Delete Contact',
    '~Apagar Contato',
    '~Apagar contato',
    iosName('Delete Contact'),
    iosName('Apagar Contato'),
    iosName('Apagar contato'),
    iosLabel('Delete Contact'),
    iosLabel('Apagar Contato'),
    iosLabel('Apagar contato')
  ]
} as const;

export function contactNameSelector(contactName: string) {
  const [firstName] = contactName.split(' ');
  return `-ios predicate string:name CONTAINS "${firstName}" OR label CONTAINS "${firstName}"`;
}

export function contactCellSelector(contactName: string) {
  return `-ios class chain:**/XCUIElementTypeStaticText[\`name == "${contactName}"\`]`;
}

function iosName(value: string) {
  return `-ios predicate string:name == "${value}"`;
}

function iosLabel(value: string) {
  return `-ios predicate string:label == "${value}"`;
}

function iosNameContains(value: string) {
  return `-ios predicate string:name CONTAINS "${value}"`;
}

function iosLabelContains(value: string) {
  return `-ios predicate string:label CONTAINS "${value}"`;
}

function iosValue(value: string) {
  return `-ios predicate string:value == "${value}"`;
}
