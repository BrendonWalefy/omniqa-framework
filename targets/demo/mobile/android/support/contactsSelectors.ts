export const contactsSelectors = {
  initialPrompts: [
    androidText('Skip'),
    androidText('Not now'),
    androidText('Keep local'),
    androidText('Allow'),
    androidText('Continue'),
    androidText('CANCEL'),
    'id=com.android.contacts:id/left_button',
    'id=com.android.permissioncontroller:id/permission_allow_button',
    'id=com.google.android.permissioncontroller:id/permission_allow_button'
  ],
  addContact: [
    '~Create new contact',
    '~Create contact',
    '~Add contact',
    'id=com.google.android.contacts:id/floating_action_button',
    'id=com.android.contacts:id/floating_action_button',
    androidText('Create contact'),
    androidText('Add contact')
  ],
  firstNameInput: [
    'id=com.google.android.contacts:id/first_name',
    'id=com.android.contacts:id/first_name',
    androidText('First name'),
    androidTextContains('First name'),
    androidTextContains('Name')
  ],
  lastNameInput: [
    'id=com.google.android.contacts:id/last_name',
    'id=com.android.contacts:id/last_name',
    androidText('Last name'),
    androidTextContains('Last name'),
    androidTextContains('Surname')
  ],
  phoneInput: [
    'id=com.google.android.contacts:id/phone',
    'id=com.android.contacts:id/phone',
    androidText('Phone'),
    androidTextContains('Phone'),
    androidTextContains('Mobile')
  ],
  saveButton: [
    '~Save',
    'id=com.android.contacts:id/editor_menu_save_button',
    'id=com.google.android.contacts:id/menu_save',
    'id=com.android.contacts:id/menu_save',
    androidText('Save')
  ],
  moreOptions: [
    '~More options',
    'id=com.google.android.contacts:id/more_options',
    'id=com.android.contacts:id/more_options'
  ],
  deleteButton: [
    androidText('Delete'),
    androidText('Delete contact'),
    'id=com.google.android.contacts:id/delete',
    'id=com.android.contacts:id/delete'
  ],
  confirmDeleteButton: [
    'id=android:id/button1',
    androidText('DELETE'),
    androidText('Delete'),
    androidText('OK'),
    androidText('Move to trash')
  ],
  searchButton: [
    '~Search contacts',
    '~Search',
    'id=com.google.android.contacts:id/open_search_bar_text_view',
    'id=com.google.android.contacts:id/menu_search',
    'id=com.android.contacts:id/menu_search',
    androidDesc('Search'),
    androidText('Search contacts'),
    androidText('Search')
  ],
  searchInput: [
    'id=com.android.contacts:id/search_view',
    'id=com.google.android.contacts:id/search_view',
    'id=com.google.android.contacts:id/search_src_text',
    'id=com.android.contacts:id/search_src_text',
    androidClass('android.widget.EditText')
  ],
  contactList: [
    'id=com.google.android.contacts:id/recycler_view',
    'id=com.android.contacts:id/contact_list',
    androidClass('androidx.recyclerview.widget.RecyclerView'),
    androidClass('android.widget.ListView')
  ]
} as const;

export function contactNameSelector(contactName: string) {
  return androidText(contactName);
}

export function contactResultSelector(contactName: string) {
  return `android=new UiSelector().resourceId("com.android.contacts:id/cliv_name_textview").text("${contactName}")`;
}

function androidText(value: string) {
  return `android=new UiSelector().text("${value}")`;
}

function androidTextContains(value: string) {
  return `android=new UiSelector().textContains("${value}")`;
}

function androidDesc(value: string) {
  return `android=new UiSelector().description("${value}")`;
}

function androidClass(value: string) {
  return `android=new UiSelector().className("${value}")`;
}
